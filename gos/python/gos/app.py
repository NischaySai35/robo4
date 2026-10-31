"""gos.App: a script owns the engine. It opens, runs and closes by itself, with no window and no daemon."""
import base64, json, math, os, random, shutil, tempfile, time
from dataclasses import dataclass, field

from . import _core
from .transport import open_transport


class GosError(RuntimeError):
    """Something could not be done. The message says what to do about it."""


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
        raise GosError('Simulation needs MuJoCo: py -3.12 -m pip install mujoco') from e


class Robot:
    """A loaded robot: its graph, its names, and what solvers need."""

    def __init__(self, app, doc, export):
        self.app, self.doc, self.export = app, doc, export
        self.joint_names = export['jointNames'] if export else {}
        self.body_names = export['bodyNames'] if export else {}

    @property
    def graph(self): return self.app.graph()

    def joints(self):
        m, d = self.app.model, self.app.data
        mj = _physics()
        return {mj.mj_id2name(m, mj.mjtObj.mjOBJ_JOINT, i): float(d.qpos[m.jnt_qposadr[i]]) for i in range(m.njnt)}

    def body_position(self, name):
        i = self.app._body_id(name)
        return [float(v) for v in self.app.data.xpos[i]]

    def ik(self, body, position, steps=800, keep_closed=True, tolerance=0.002):
        """Move a body toward a position, holding any closed loops shut. The result always reports both errors."""
        return self.app._ik(body, position, steps, keep_closed, tolerance)


class App:
    def __init__(self, headless=True, seed=0, transport='local', **transport_options):
        if not headless:
            raise GosError('Only headless=True works so far. A window comes with GOS G5 (gos studio --attach).')
        self.seed = seed
        random.seed(seed)
        self.bus = open_transport(transport, **transport_options)
        self.model = self.data = self.robot = self.spec = None
        self.params, self._locks, self._dir, self._doc = {}, {}, None, None
        self.time_steps = 0

    def __enter__(self): return self
    def __exit__(self, *_): self.close()

    def close(self):
        self.bus.close()
        if self._dir: shutil.rmtree(self._dir, ignore_errors=True); self._dir = None
        self.model = self.data = self.spec = None

    # ── loading ──────────────────────────────────────────────────────────────
    def load(self, path):
        """Load a robot: a document as .json, or plain MuJoCo .xml."""
        if not os.path.exists(path):
            raise GosError(f'No file at {path}.')
        ext = os.path.splitext(path)[1].lower()
        if ext == '.xml':
            return self._open_xml(path, None, None)
        if ext == '.json':
            with open(path, encoding='utf-8') as f: raw = json.load(f)
            return self.load_document(raw.get('model') if 'model' in raw and 'bodies' not in raw else raw)
        if ext == '.nischay':
            raise GosError('.nischay files are encrypted. In the Studio use File > Export > JSON model, then load that, or give GOS an .xml.')
        raise GosError(f'GOS can load .json or .xml, not {ext}.')

    def load_document(self, doc):
        """Load a Studio document (dict). The Rust core writes the MJCF, the same code as the Studio's export."""
        if not doc or not doc.get('bodies'):
            raise GosError('This document has no bodies, so there is no robot to load.')
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
        with open(scene, 'w', encoding='utf-8') as f: f.write(export['xml'])
        self._doc = doc
        return self._open_xml(scene, doc, export)

    def _open_xml(self, path, doc, export):
        mj = _physics()
        self.spec = mj.MjSpec.from_file(path)
        self.model = self.spec.compile()
        self.data = mj.MjData(self.model)
        mj.mj_forward(self.model, self.data)
        self.robot = Robot(self, doc, export)
        self.publish_graph('loaded')
        return self.robot

    def _need_robot(self):
        if self.model is None: raise GosError('No robot loaded. Call app.load(path) first.')

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
        self.model, self.data = self.spec.recompile(self.model, self.data)
        _physics().mj_forward(self.model, self.data)

    # ── running ──────────────────────────────────────────────────────────────
    def set_joints(self, **values):
        """Set joint positions by name, then settle the kinematics. Works without any motor."""
        self._need_robot()
        mj = _physics()
        for name, v in values.items():
            j = mj.mj_name2id(self.model, mj.mjtObj.mjOBJ_JOINT, name)
            if j < 0: raise GosError(f'No joint named "{name}". Joints: {", ".join(self.robot.joints())}')
            self.data.qpos[self.model.jnt_qposadr[j]] = v
        mj.mj_forward(self.model, self.data)

    def run(self, seconds=None, steps=None, publish_every=10):
        """Step the physics, publishing /joints. Stops by itself."""
        self._need_robot()
        mj = _physics()
        n = steps if steps is not None else max(1, round((seconds or 0) / self.model.opt.timestep))
        names = list(self.robot.joints())
        for k in range(n):
            mj.mj_step(self.model, self.data)
            self.time_steps += 1
            if publish_every and k % publish_every == 0:
                m = self.model
                self.bus.publish('/joints', {'t': float(self.data.time), 'names': names, 'q': [float(self.data.qpos[m.jnt_qposadr[i]]) for i in range(m.njnt)]})
        return Result(True, f'Ran {n} steps.', {'steps': n, 't': float(self.data.time)})

    def closure_error(self):
        """Worst gap across every loop constraint, in metres. 0 when there are none."""
        self._need_robot()
        mj = _physics()
        mj.mj_forward(self.model, self.data)
        d = self.data
        rows = d.efc_type[:d.nefc] == mj.mjtConstraint.mjCNSTR_EQUALITY
        return float(abs(d.efc_pos[:d.nefc][rows]).max()) if rows.any() else 0.0

    def topic(self, name): return _Topic(self.bus, name)

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
    def __init__(self, bus, name): self.bus, self.name = bus, name
    def publish(self, msg): self.bus.publish(self.name, msg)
    def subscribe(self, fn): return self.bus.subscribe(self.name, fn)
