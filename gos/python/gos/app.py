"""gos.App: a script owns the engine. It opens, runs and closes by itself, with no window and no daemon."""
import base64, json, math, os, random, shutil, tempfile, time
from dataclasses import dataclass, field

from . import _core
from .transport import NamedBus, open_transport
from .runtime import Actions, Logger, Node, Parameters, Recorder, Services, play
from .physics import Cache, GosError, open_engine


@dataclass
class Result:
    ok: bool
    message: str = ''
    data: dict = field(default_factory=dict)

    def __bool__(self): return self.ok
    def __getattr__(self, k):
        try: return self.__dict__['data'][k]
        except KeyError: raise AttributeError(k)


def _physics():
    try:
        import mujoco
        return mujoco
    except ImportError as e:
        raise GosError('Simulation needs MuJoCo: py -3.12 -m pip install "gos-robotics[sim]"') from e


class Robot:
    """A loaded robot: its graph, its names, and what solvers need."""

    def __init__(self, app, doc, export):
        self.app, self.doc, self.export = app, doc, export
        self.joint_names = export['jointNames'] if export else {}
        self.body_names = export['bodyNames'] if export else {}

    @property
    def graph(self): return self.app.graph()

    def joints(self):
        return self.app.engine.joint_values()

    def body_position(self, name):
        return self.app.engine.body_position(name)

    def ik(self, body, position, steps=800, keep_closed=True, tolerance=0.002):
        """Move a body toward a position, holding any closed loops shut. The result always reports both errors."""
        return self.app._ik(body, position, steps, keep_closed, tolerance)


# The ST3215 as the simulator models it (sim/physics_params.json, calibrated): it holds within about 2 degrees up to stall,
# 2.7 N*m / 0.035 rad = 80 N*m/rad. The rotor's inertia through the 345:1 gearbox (armature) is part of it: without it a
# stiff servo on a light part, like a lock rotor, shakes itself apart between steps. The torque limit comes from each joint's motor profile.
SERVO_KP, SERVO_KV, SERVO_ARMATURE = 80.0, 1.0, 0.012


def _with_servos(xml, doc):
    """A position servo for every joint whose motor profile names a motor, limited to the profile's torque."""
    profiles = doc.get('jointProfiles') or {}
    import re
    lines = []
    for j in (doc.get('joints') or {}).values():
        prof = profiles.get(j.get('profileId') or '') or {}
        if not prof.get('motorType') or j.get('type') not in ('revolute', 'continuous', 'prismatic'): continue
        tau = float(prof.get('torqueLimit') or (j.get('limit') or {}).get('effort') or 1.0)
        lines.append(f'  <position name="servo_{j["name"]}" joint="{j["name"]}" kp="{SERVO_KP}" kv="{SERVO_KV}" forcerange="-{tau} {tau}"/>')
        xml = re.sub(r'(<joint\b[^>]*\bname="' + re.escape(j['name']) + r'")(?![^>]*armature=)', r'\g<1> armature="' + str(SERVO_ARMATURE) + '"', xml, count=1)
    if not lines: return xml
    return xml.replace('</mujoco>', '<actuator>\n' + '\n'.join(lines) + '\n</actuator>\n</mujoco>', 1)


class App:
    def __init__(self, headless=True, seed=0, transport='local', name='gos', namespace='/', remap=None, domain=0, executor=None, trace=None, introspect=False, engine='mujoco', **transport_options):
        if not headless:
            raise GosError('Only headless=True works so far. A window comes with GOS G5 (gos studio --attach).')
        self.seed = seed
        random.seed(seed)
        self.name = name
        if transport_options.get('permissions'):
            # topic names as the programs use them, turned into the wire names (domain, namespace) the transport sees
            names = NamedBus(None, namespace, remap, domain)
            transport_options['permissions'] = {u: {k: [names._wire(n) for n in v] for k, v in p.items()} for u, p in transport_options['permissions'].items()}
        self.bus = NamedBus(open_transport(transport, **transport_options), namespace, remap, domain)
        from .execution import Executor, Tracer
        from .bigdata import SharedArrays
        self.executor = Executor(executor) if isinstance(executor, str) else executor
        self.bus.executor, self.bus.introspect = self.executor, introspect
        self.tracer = self.bus.tracer = Tracer(trace) if trace else None
        self.arrays = SharedArrays(self.bus)
        self.sim_time = 0.0
        self._engine_name, self.engine, self.robot, self.cache = engine, None, None, Cache()
        self._locks, self._dir, self._doc = {}, None, None
        self.params, self.services, self.nodes, self._recorders = Parameters(self.bus, name), Services(self.bus), {}, []
        self.actions = Actions(self.bus)
        self.time_steps = 0

    def __enter__(self): return self
    def __exit__(self, *_): self.close()

    def close(self):
        if getattr(self, 'real', None) is not None and self.real.armed: self.real.stop()
        if self.tracer: self.tracer.save()
        self.arrays.close()
        for r in self._recorders: r.close()
        self._recorders = []
        self.bus.close()
        if self._dir: shutil.rmtree(self._dir, ignore_errors=True); self._dir = None
        if self.engine: self.engine.close()
        self.engine = None; self.cache.clear()

    # MuJoCo's own objects, for locks, IK and scripts that want them. None when nothing is loaded.
    def _mujoco(self, what):
        if self.engine is None: return None
        if self.engine.name != 'mujoco': raise GosError(f'{what} needs the MuJoCo engine; this app runs on {self.engine.name}. Open it with gos.App(engine="mujoco").')
        return getattr(self.engine, what)
    model = property(lambda self: self._mujoco('model'))
    data = property(lambda self: self._mujoco('data'))
    spec = property(lambda self: self._mujoco('spec'))

    # ── loading ──────────────────────────────────────────────────────────────
    def load(self, path):
        """Load a robot: a Studio document (.json), MuJoCo (.xml), or a ROS description (.urdf, .xacro)."""
        if not os.path.exists(path):
            raise GosError(f'No file at {path}.')
        ext = os.path.splitext(path)[1].lower()
        if ext in ('.xml', '.urdf'):
            return self._open_xml(path, None, None)  # MuJoCo reads URDF itself; package:// mesh paths need the meshes beside the file
        if ext == '.xacro':
            try:
                import xacro
            except ImportError as e:
                raise GosError('Reading .xacro needs: py -3.12 -m pip install "gos-robotics[ros]"') from e
            self._dir = self._dir or tempfile.mkdtemp(prefix='gos_')
            urdf = os.path.join(self._dir, os.path.basename(path)[:-len('.xacro')].removesuffix('.urdf') + '.urdf')
            with open(urdf, 'w', encoding='utf-8') as f: f.write(xacro.process_file(path).toxml())
            return self._open_xml(urdf, None, None)
        if ext == '.json':
            with open(path, encoding='utf-8') as f: raw = json.load(f)
            return self.load_document(raw.get('model') if 'model' in raw and 'bodies' not in raw else raw)
        if ext == '.nischay':
            raise GosError('.nischay files are encrypted. In the Studio use File > Export > JSON model, then load that, or give GOS an .xml.')
        raise GosError(f'GOS can load .json, .xml, .urdf or .xacro, not {ext}.')

    def load_document(self, doc):
        """Load a Studio document (dict). The Rust core writes the MJCF, the same code as the Studio's export."""
        if not doc or not doc.get('bodies'):
            raise GosError('This document has no bodies, so there is no robot to load.')
        # The export leaves out a joint whose body is missing; a robot loaded that way would quietly lack the joint.
        for j in (doc.get('joints') or {}).values():
            for side in ('parentBodyId', 'childBodyId'):
                if j.get(side) and j[side] not in doc['bodies']:
                    raise GosError(f'Joint "{j.get("name", j.get("id"))}" connects to body "{j[side]}", which is not in this document.')
        name = doc.get('name') or 'robot'
        export = _core.export_mjcf(doc, name)
        self._dir = self._dir or tempfile.mkdtemp(prefix='gos_')
        os.makedirs(os.path.join(self._dir, 'meshes'), exist_ok=True)
        for m in export['meshes']:
            asset = (doc.get('assets') or {}).get(m['assetId']) or {}
            if not asset.get('data'):
                raise GosError(f'Mesh {m["assetId"]} has no embedded data in this document.')
            with open(os.path.join(self._dir, m['file']), 'wb') as f: f.write(base64.b64decode(asset['data']))
        scene = os.path.join(self._dir, 'scene.xml')
        with open(scene, 'w', encoding='utf-8') as f: f.write(_with_servos(export['xml'], doc))
        self._doc = doc
        return self._open_xml(scene, doc, export)

    def _open_xml(self, path, doc, export):
        engine = open_engine(self._engine_name)
        engine.open(path)
        self.engine = engine; self.cache.clear()
        self.robot = Robot(self, doc, export)
        self.publish_graph('loaded')
        return self.robot

    def _need_robot(self):
        if self.engine is None: raise GosError('No robot loaded. Call app.load(path) first.')

    def _body_id(self, name):
        mj = _physics()
        i = mj.mj_name2id(self.model, mj.mjtObj.mjOBJ_BODY, name)
        if i < 0:
            names = [mj.mj_id2name(self.model, mj.mjtObj.mjOBJ_BODY, b) for b in range(1, self.model.nbody)]
            raise GosError(f'No body named "{name}". Bodies: {", ".join(names[:12])}{" ..." if len(names) > 12 else ""}')
        return i

    # ── the graph, which can change while running ─────────────────────────────
    def graph(self):
        """Tree, loops and parts of the robot as it is now, locks included."""
        self._need_robot()
        mj = _physics()
        m = self.model
        bodies = [mj.mj_id2name(m, mj.mjtObj.mjOBJ_BODY, b) for b in range(1, m.nbody)]
        joints = []
        for b in range(1, m.nbody):
            parent = m.body_parentid[b]
            if parent == 0: continue
            moving = m.body_jntnum[b] > 0
            joints.append({'id': f'tree_{bodies[b - 1]}', 'type': 'revolute' if moving else 'fixed', 'parent': bodies[parent - 1], 'child': bodies[b - 1]})
        joints += [{'id': k, 'type': 'fixed', 'parent': a, 'child': b} for k, (a, b) in self._locks.items()]
        return _core.compile_graph({'bodies': [{'id': b} for b in bodies], 'joints': joints, 'roots': []})

    def publish_graph(self, why):
        self.bus.publish('/graph/events', {'event': why, 'locks': sorted(self._locks)}, latched=True)

    def lock(self, body_a, body_b):
        """Lock two bodies at their current relative pose, while running. Joint positions are kept."""
        self._need_robot()
        mj = _physics()
        self._body_id(body_a); self._body_id(body_b)
        key = f'lock_{body_a}__{body_b}'
        if key in self._locks: return Result(False, f'{body_a} and {body_b} are already locked.')
        t0 = time.perf_counter()
        ia, ib = self._body_id(body_a), self._body_id(body_b)
        pa, qa = self.data.xpos[ia], self.data.xquat[ia]
        pb, qb = self.data.xpos[ib], self.data.xquat[ib]
        rel_p, neg, rel_q, tmp = [0.0] * 3, [0.0] * 4, [0.0] * 4, [0.0] * 3
        import numpy as np
        rel_p, neg, rel_q, tmp = np.zeros(3), np.zeros(4), np.zeros(4), pb - pa
        mj.mju_negQuat(neg, qa); mj.mju_rotVecQuat(rel_p, tmp, neg); mj.mju_mulQuat(rel_q, neg, qb)
        eq = self.spec.add_equality()
        eq.name, eq.type, eq.objtype, eq.name1, eq.name2 = key, mj.mjtEq.mjEQ_WELD, mj.mjtObj.mjOBJ_BODY, body_a, body_b
        # MuJoCo weld data: anchor (3), relative position (3), relative quaternion (4), torque scale.
        eq.data[:11] = [0, 0, 0, *rel_p, *rel_q, 1.0]
        # A mechanical lock is hard: MuJoCo's default weld is soft enough to open 2.4 mm under a 1 rad/s shake.
        eq.solref[:2] = [2 * self.model.opt.timestep, 1.0]
        self._recompile()
        self._locks[key] = (body_a, body_b)
        self.publish_graph('lock')
        ms = (time.perf_counter() - t0) * 1000
        return Result(True, f'Locked {body_a} to {body_b}.', {'ms': ms, 'key': key})

    def unlock(self, body_a, body_b):
        key = f'lock_{body_a}__{body_b}'
        if key not in self._locks: return Result(False, f'{body_a} and {body_b} are not locked.')
        self.spec.delete(self.spec.equality(key))
        self._recompile()
        del self._locks[key]
        self.publish_graph('unlock')
        return Result(True, f'Unlocked {body_a} from {body_b}.')

    def _recompile(self):
        self.engine.recompile(); self.cache.clear()

    # ── running ──────────────────────────────────────────────────────────────
    def set_joints(self, **values):
        """Set joint positions by name, then settle the kinematics. A joint with a servo is also told to hold there."""
        self._need_robot()
        servos = set(self.engine.motors())
        for name, v in values.items():
            self.engine.set_joint(name, v)
            if name in servos: self.engine.set_target(name, v)
        self.engine.forward(); self.cache.clear()

    def set_targets(self, **values):
        """Tell servos where to go, by joint name. The robot moves there as the simulation runs, as fast as the servos can."""
        self._need_robot()
        for name, v in values.items(): self.engine.set_target(name, v)

    def servos(self):
        """Joints that have a servo (from a motor profile in the document)."""
        self._need_robot()
        return self.engine.motors()

    def run(self, seconds=None, steps=None, publish_every=10, cache=False, cache_every=10):
        """Step the physics, publishing /joints. Stops by itself. cache=True keeps frames for app.seek."""
        self._need_robot()
        e = self.engine
        n = steps if steps is not None else max(1, round((seconds or 0) / e.timestep))
        names = list(self.robot.joints())
        if cache and not self.cache.frames: self.cache.add(e.snapshot())
        for k in range(n):
            e.step()
            self.time_steps += 1
            self.sim_time = e.time
            if cache and (k + 1) % cache_every == 0: self.cache.add(e.snapshot())
            if publish_every and k % publish_every == 0: self.bus.publish('/clock', {'t': self.sim_time})
            if publish_every and k % publish_every == 0:
                self.bus.publish('/joints', {'t': e.time, 'names': names, 'q': list(e.joint_values().values())})
        return Result(True, f'Ran {n} steps.', {'steps': n, 't': e.time})

    def seek(self, seconds):
        """Go back to the cached frame nearest this time. Running on from there replays the same physics."""
        self._need_robot()
        f = self.cache.nearest(seconds)
        self.cache.frames = [c for c in self.cache.frames if c['t'] <= f['t']]
        self.engine.restore(f); self.sim_time = self.engine.time
        return Result(True, f'At {self.engine.time:.3f} s.', {'t': self.engine.time, 'frames': len(self.cache.frames)})

    def closure_error(self):
        """Worst gap across every loop constraint, in metres. 0 when there are none."""
        self._need_robot()
        mj = _physics()
        mj.mj_forward(self.model, self.data)
        d = self.data
        rows = d.efc_type[:d.nefc] == mj.mjtConstraint.mjCNSTR_EQUALITY
        return float(abs(d.efc_pos[:d.nefc][rows]).max()) if rows.any() else 0.0

    def topic(self, name, latched=False, reliable=True, type=None):
        """A topic. With type='JointState' (or any loaded .msg) a wrong message is refused on publish, saying what is wrong."""
        t = _Topic(self.bus, name, latched, reliable)
        if type is not None:
            if getattr(self, 'types', None) is None:
                from . import interfaces
                self.types = interfaces.load()
            if type not in self.types.types: raise GosError(f'No message type "{type}". Types: {", ".join(sorted(self.types.types))}. Add yours with app.types = gos.interfaces.load("folder").')
            t.check = lambda m: self.types.check(type, m)
        return t

    def logger(self, name=None, level='info'): return Logger(self.bus, name or self.name, level)

    def spin(self, seconds): self.executor.spin(seconds)
    def spin_once(self, timeout=0.0): return self.executor.spin_once(timeout)

    def now(self):
        """Simulation time in seconds, as published on /clock (ROS's use_sim_time)."""
        return self.sim_time

    def follow_clock(self):
        """For a program that doesn't run the simulation: take the time from the /clock topic."""
        self.bus.subscribe('/clock', lambda m: setattr(self, 'sim_time', m['t']))

    def remote_params(self, node, timeout=5.0):
        """Read and change another program's parameters, by its name."""
        return Parameters.remote(self.bus, node, timeout)

    # ── the same script for simulation and the real robot ───────────────────────
    def attach_robot(self, url='http://mod1.local', **options):
        """Connect the real module board. Joint names and limits come from the loaded robot, so sim and real match."""
        self._need_robot()
        from .hardware import Esp32Robot
        mj = _physics()
        m = self.model
        names = [mj.mj_id2name(m, mj.mjtObj.mjOBJ_JOINT, i) for i in range(m.njnt)]
        limits = {n: (float(m.jnt_range[i][0]), float(m.jnt_range[i][1])) for i, n in enumerate(names) if m.jnt_limited[i]}
        self.real = Esp32Robot(url, joints=names, limits=limits, **options)
        return self.real

    def move(self, **values):
        """Pose the robot: always in the simulation, and on the real robot too when one is attached and armed."""
        self.set_joints(**values)
        real = getattr(self, 'real', None)
        if real is None: return Result(True, 'Moved in simulation.')
        if not real.armed: return Result(True, 'Moved in simulation only: the real robot is attached but not armed.')
        r = real.move(values)
        return Result(r.ok, f'Simulation and real robot: {r.message}', r.data)

    def stop(self):
        """Stop everything now. Safe to call any time."""
        real = getattr(self, 'real', None)
        return real.stop() if real else Result(True, 'No real robot attached; nothing to stop.')

    def body_edges(self):
        """Every body seen from its parent body as simulated now: {'parent', 'child', 'p', 'q' (xyzw)}. What gos.tf broadcasts."""
        self._need_robot()
        import numpy as np
        mj = _physics()
        m, d = self.model, self.data
        name = lambda b: mj.mj_id2name(m, mj.mjtObj.mjOBJ_BODY, b)
        edges = []
        for b in range(1, m.nbody):
            par = m.body_parentid[b]
            neg, rel_p, rel_q = np.zeros(4), np.zeros(3), np.zeros(4)
            mj.mju_negQuat(neg, d.xquat[par]); mj.mju_rotVecQuat(rel_p, d.xpos[b] - d.xpos[par], neg); mj.mju_mulQuat(rel_q, neg, d.xquat[b])
            edges.append({'parent': name(par) or 'world', 'child': name(b), 'p': list(rel_p), 'q': [rel_q[1], rel_q[2], rel_q[3], rel_q[0]]})
        return edges

    def loop_check(self, frm, to, measured=()):
        """Transform graph of the robot as simulated now, plus any measured links (camera, touch) as
        (parent, child, position, quaternion xyzw). Reports how far each extra path disagrees: the loop gap."""
        edges = self.body_edges()
        for parent, child, p, q in measured:
            edges.append({'parent': parent, 'child': child, 'p': list(p), 'q': list(q)})
        return _core.tf_query(edges, frm, to)

    def node(self, name):
        return self.nodes.setdefault(name, Node(self.bus, name))

    def record(self, path, topics=('/joints', '/graph/events')):
        """Record to an MCAP file until .close() or the end of the app."""
        r = Recorder(self.bus, path, topics)
        self._recorders.append(r)
        return r

    def play(self, path): return play(path, self.bus)

    # ── inverse kinematics, as a plugin ──────────────────────────────────────
    def _ik(self, body, position, steps, keep_closed, tolerance):
        self._need_robot()
        try:
            import mink
        except ImportError:
            return Result(False, 'IK needs mink: py -3.12 -m pip install mink daqp')
        import numpy as np
        mj = _physics()
        self._body_id(body)
        cfg = mink.Configuration(self.model, q=self.data.qpos.copy())
        goal = np.array(position, float)
        task = mink.FrameTask(frame_name=body, frame_type='body', position_cost=1.0, orientation_cost=0.0)
        task.set_target(mink.SE3.from_translation(goal))
        tasks = [task]
        if keep_closed and self.model.neq: tasks.append(mink.EqualityConstraintTask(model=self.model, cost=100.0))
        limits = [mink.ConfigurationLimit(self.model)]
        err = None
        for k in range(steps):
            v = mink.solve_ik(cfg, tasks, 0.01, 'daqp', limits=limits, damping=1e-3)
            cfg.integrate_inplace(v, 0.01)
            err = float(np.linalg.norm(cfg.get_transform_frame_to_world(body, 'body').translation() - goal))
            if err < tolerance: break
        self.data.qpos[:] = cfg.q
        mj.mj_forward(self.model, self.data)
        gap = self.closure_error()
        ok = err < tolerance
        return Result(ok, 'Reached the goal.' if ok else f'Stopped {err * 1000:.1f} mm from the goal: it may be out of reach or blocked by a joint limit.', {'goal_error_m': err, 'closure_error_m': gap, 'steps': k + 1})


class _Topic:
    """A named channel. QoS like ROS: latched (late joiners get the last value), reliable or best effort,
    and keep_last=N on the receiving side (only the N newest messages are kept in .history)."""
    check = None
    def __init__(self, bus, name, latched=False, reliable=True): self.bus, self.name, self.latched, self.reliable = bus, name, latched, reliable
    def publish(self, msg):
        if self.check: self.check(msg)
        self.bus.publish(self.name, msg, self.latched, self.reliable)
    def history(self, keep_last=10, where=None):
        from collections import deque
        q = deque(maxlen=keep_last)
        self.bus.subscribe(self.name, q.append, where)
        return q
    def subscribe(self, fn, where=None): return self.bus.subscribe(self.name, fn, where)
