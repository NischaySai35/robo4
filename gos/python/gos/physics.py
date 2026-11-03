"""Physics engines behind one plug-in point (P10, docs/design/p10-physics-interface.md).

An engine reads the robot file, steps it, and answers about joints and bodies. gos.App talks only to this for running;
locks, IK and the graph still need MuJoCo's own objects and say so on any other engine. Add one with register('name', Class).
"""


class GosError(RuntimeError):
    """Something could not be done. The message says what to do about it."""


class Engine:
    name = '?'
    timestep = 0.0
    time = 0.0

    def open(self, path): raise NotImplementedError
    def forward(self): pass
    def step(self): raise NotImplementedError
    def joint_names(self): raise NotImplementedError
    def joint_values(self): raise NotImplementedError
    def set_joint(self, name, value): raise NotImplementedError
    def body_position(self, name): raise NotImplementedError
    def motors(self): return []  # joint names that have a servo
    def set_target(self, name, value): raise GosError(f'The {self.name} engine has no servos.')
    def snapshot(self): raise NotImplementedError
    def restore(self, state): raise NotImplementedError
    def close(self): pass

    def _no_joint(self, name):
        return GosError(f'No joint named "{name}". Joints: {", ".join(self.joint_names())}')

    def _no_body(self, name, names):
        return GosError(f'No body named "{name}". Bodies: {", ".join(names[:12])}{" ..." if len(names) > 12 else ""}')


class MujocoEngine(Engine):
    name = 'mujoco'

    def __init__(self):
        try:
            import mujoco
        except ImportError as e:
            raise GosError('Simulation needs MuJoCo: py -3.12 -m pip install "gos-robotics[sim]"') from e
        self.mj = mujoco
        self.spec = self.model = self.data = None

    def open(self, path):
        self.spec = self.mj.MjSpec.from_file(path)
        self.model = self.spec.compile()
        self.data = self.mj.MjData(self.model)
        self.mj.mj_forward(self.model, self.data)

    def adopt(self, spec, model=None):
        """Run a robot assembled in code (an MjSpec) instead of one read from a file; `model` if it is compiled already."""
        self.spec = spec
        self.model = model if model is not None else spec.compile()
        self.data = self.mj.MjData(self.model)
        self.mj.mj_forward(self.model, self.data)

    def recompile(self):
        self.model, self.data = self.spec.recompile(self.model, self.data)
        self.mj.mj_forward(self.model, self.data)

    def motors(self): return list(_servos(self.mj, self.model))

    def set_target(self, name, value):
        servos = _servos(self.mj, self.model)
        if name not in servos: raise GosError(f'Joint "{name}" has no servo. Servos: {", ".join(servos) or "none"}.')
        self.data.ctrl[servos[name]] = value

    @property
    def timestep(self): return float(self.model.opt.timestep)
    @property
    def time(self): return float(self.data.time)

    def forward(self): self.mj.mj_forward(self.model, self.data)
    def step(self): self.mj.mj_step(self.model, self.data)

    def joint_names(self):
        m = self.model
        return [self.mj.mj_id2name(m, self.mj.mjtObj.mjOBJ_JOINT, i) for i in range(m.njnt)]

    def joint_values(self):
        m, d = self.model, self.data
        return {n: float(d.qpos[m.jnt_qposadr[i]]) for i, n in enumerate(self.joint_names())}

    def set_joint(self, name, value):
        j = self.mj.mj_name2id(self.model, self.mj.mjtObj.mjOBJ_JOINT, name)
        if j < 0: raise self._no_joint(name)
        self.data.qpos[self.model.jnt_qposadr[j]] = value

    def body_position(self, name):
        i = self.mj.mj_name2id(self.model, self.mj.mjtObj.mjOBJ_BODY, name)
        if i < 0:
            raise self._no_body(name, [self.mj.mj_id2name(self.model, self.mj.mjtObj.mjOBJ_BODY, b) for b in range(1, self.model.nbody)])
        return [float(v) for v in self.data.xpos[i]]

    def snapshot(self):
        d = self.data
        return dict(t=float(d.time), qpos=d.qpos.copy(), qvel=d.qvel.copy(), act=d.act.copy(), warm=d.qacc_warmstart.copy(), ctrl=d.ctrl.copy())

    def restore(self, s):
        d = self.data
        d.time = s['t']; d.qpos[:] = s['qpos']; d.qvel[:] = s['qvel']; d.act[:] = s['act']; d.qacc_warmstart[:] = s['warm']; d.ctrl[:] = s['ctrl']
        self.forward()


class NewtonEngine(Engine):
    """Newton running its MuJoCo solver on the GPU. It keeps the file's coordinate order, with xyzw quaternions on free joints."""
    name = 'newton'

    def __init__(self):
        try:
            import warp, newton, mujoco
        except ImportError as e:
            raise GosError('This engine needs Newton in its own environment, because it pins its own MuJoCo: py -3.12 -m venv nwt, then nwt\\Scripts\\python -m pip install "newton[sim]" scipy') from e
        self.wp, self.newton, self.mj = warp, newton, mujoco

    def open(self, path):
        from newton.solvers import SolverMuJoCo as S
        self.wp.init()
        b = self.newton.ModelBuilder(); S.register_custom_attributes(b)
        b.default_shape_cfg.gap = 0.0  # as in a MuJoCo file; Newton's default looks for contacts 100 mm away
        b.add_mjcf(path, mesh_maxhullvert=1024)  # the default cuts every shape to 64 corners
        self.model = b.finalize()
        self.solver = S(self.model)
        self.timestep = float(self.solver.mj_model.opt.timestep); self.time = 0.0
        # Newton renames joints, so names come from the file. Its coordinates keep the file's order, which is checked here.
        ref = self.mj.MjModel.from_xml_path(path)
        if self.model.joint_coord_count < ref.nq: raise GosError(f'Newton read {self.model.joint_coord_count} joint coordinates where the file has {ref.nq}, so joint names would not line up.')  # more is fine: ring-closing joints come last
        self._joints = {self.mj.mj_id2name(ref, self.mj.mjtObj.mjOBJ_JOINT, i): int(ref.jnt_qposadr[i]) for i in range(ref.njnt)}
        self._bodies = {str(n).split('/')[-1]: i for i, n in enumerate(self.model.body_label)}
        self._servos = _servos(self.mj, ref)
        self.s0, self.s1, self.ctl = self.model.state(), self.model.state(), self.model.control()
        self.newton.eval_fk(self.model, self.s0.joint_q, self.s0.joint_qd, self.s0)

    def forward(self):
        self.newton.eval_fk(self.model, self.s0.joint_q, self.s0.joint_qd, self.s0)

    def step(self):
        self.solver.step(self.s0, self.s1, self.ctl, None, self.timestep)
        self.s0, self.s1 = self.s1, self.s0
        self.time += self.timestep

    def joint_names(self): return list(self._joints)

    def joint_values(self):
        q = self.s0.joint_q.numpy()
        return {n: float(q[a]) for n, a in self._joints.items()}

    def set_joint(self, name, value):
        if name not in self._joints: raise self._no_joint(name)
        q = self.s0.joint_q.numpy(); q[self._joints[name]] = value; self.s0.joint_q.assign(q)

    def motors(self): return list(self._servos)

    def set_target(self, name, value):
        if name not in self._servos: raise GosError(f'Joint "{name}" has no servo. Servos: {", ".join(self._servos) or "none"}.')
        # Newton's MuJoCo solver reads both: the actuator input, and joint_target_q (which starts at 0)
        c = self.ctl.mujoco.ctrl.numpy(); c[self._servos[name]] = value; self.ctl.mujoco.ctrl.assign(c)
        t = self.ctl.joint_target_q.numpy(); t[self._joints[name]] = value; self.ctl.joint_target_q.assign(t)

    def body_position(self, name):
        if name not in self._bodies: raise self._no_body(name, list(self._bodies))
        return [float(v) for v in self.s0.body_q.numpy()[self._bodies[name]][:3]]

    def snapshot(self):
        s = self.s0
        return dict(t=self.time, joint_q=s.joint_q.numpy().copy(), joint_qd=s.joint_qd.numpy().copy(), body_q=s.body_q.numpy().copy(), body_qd=s.body_qd.numpy().copy())

    def restore(self, st):
        s = self.s0; self.time = st['t']
        s.joint_q.assign(st['joint_q']); s.joint_qd.assign(st['joint_qd']); s.body_q.assign(st['body_q']); s.body_qd.assign(st['body_qd'])


def _servos(mj, m):
    """{joint name: actuator index} for each actuator that drives one joint."""
    return {mj.mj_id2name(m, mj.mjtObj.mjOBJ_JOINT, int(m.actuator_trnid[a, 0])): a
            for a in range(m.nu) if m.actuator_trntype[a] == mj.mjtTrn.mjTRN_JOINT}


class Cache:
    """The simulation, frame by frame, so a run can be rewound and continued. Changing the robot empties it."""

    def __init__(self): self.frames = []

    def add(self, state): self.frames.append(state)
    def clear(self): self.frames = []

    def nearest(self, t):
        if not self.frames: raise GosError('Nothing cached yet. Run with app.run(seconds=1, cache=True) first.')
        return min(self.frames, key=lambda f: abs(f['t'] - t))


ENGINES = {'mujoco': MujocoEngine, 'newton': NewtonEngine}


def register(name, cls):
    """Make an engine available as App(engine=name)."""
    ENGINES[name] = cls


def open_engine(name):
    if name not in ENGINES:
        raise GosError(f'No physics engine "{name}". Engines: {", ".join(ENGINES)}.')
    return ENGINES[name]()
