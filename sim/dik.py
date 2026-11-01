"""dik.py — DIK, dynamic inverse kinematics for robots with NO fixed ground (1 Nov, Nischay's idea).

Normal IK bolts the base to the ground and moves joints so the tip reaches a target. Here nothing is bolted down: when a
joint bends, the rest of the body is pushed the other way (it slides or rolls on the floor). So DIK solves for the joints
AND the whole group's pose at once, with Nischay's rule: the tip must reach its goal, and the further a part is from the
tip, the less it should move (the group's own pose is the most expensive "joint", like a base that may give a little).

One small QP each control tick (mink, on the MuJoCo model of the world):
  - goal: the docking end's pad tip at the target's stand-off point, its axis into the target, pads over gaps (RelativeFrameTask)
  - the locks stay closed (EqualityConstraintTask on the active welds)
  - everything that is not a real servo stays still: PLA flex, gear slop, lock rotors, other modules (DofFreezingTask)
  - moving costs more the further a joint / module is from the tip; the free base costs most (PostureTask, per-dof cost)
  - joint limits and servo speeds (ConfigurationLimit, VelocityLimit)
Inputs: the world (PhysWorld) state = physics truth in the sim (on the real robot: encoders + IMU + optional camera).
Output: joint velocities for every module of the group (rad/s) -> the caller turns them into servo targets.
"""
import math, numpy as np, mujoco, mink

JN = ['T1', 'B1', 'B2', 'T2', 'B3', 'B4', 'T3']


class DIK:
    def __init__(self, w, mods, dock, target, hops, offset=0.03, vmax=0.6):
        """w = PhysWorld; mods = modules allowed to move; dock = (module, 'A'|'B'); target = receiver name (w.rx);
        hops = {module: lock-graph distance from the docking module} (far = expensive)"""
        self.w, self.m, self.mods, self.dock, self.tname, self.offset = w, w.m, list(mods), dock, target, offset
        m = self.m; dm, de = dock
        self.E = w.mod[dm]['end'][de]; self.site = m.site(self.E['tip']).name
        self.RX = next(x for x in w.rx if x['name'] == target); tb = self.RX['bid']; self.tbody = m.body(tb).name
        self.cfg = mink.Configuration(m)
        self.act_dofs = [dof for mid in self.mods for dof in w.mod[mid]['dofs']]
        roots = []
        for mid in self.mods:
            j = m.joint(f'{mid}_root').id; a = m.jnt_dofadr[j]; roots += list(range(a, a + 6))
        free = set(self.act_dofs) | set(roots)
        self.freeze = mink.DofFreezingTask(m, dof_indices=[i for i in range(m.nv) if i not in free])
        cost = np.full(m.nv, 1e-3)
        for mid in self.mods:
            for dof in w.mod[mid]['dofs']: cost[dof] = 0.02 * (1 + 2 * hops.get(mid, 0))     # far from the tip = expensive
        for a in roots: cost[a] = 2.0                                                         # the group's own pose: most expensive
        self.posture = mink.PostureTask(m, cost=cost)
        self.goal = mink.RelativeFrameTask(self.site, 'site', self.tbody, 'body', position_cost=1.0, orientation_cost=0.3, lm_damping=1e-3)
        eqs = [i for i in range(m.neq) if w.d.eq_active[i]]
        self.locks = mink.EqualityConstraintTask(m, cost=50.0, equalities=eqs) if eqs else None
        self.limits = [mink.ConfigurationLimit(m), mink.VelocityLimit(m, {m.joint(m.dof_jntid[dof]).name: vmax for dof in self.act_dofs})]
        self.k = None

    def _target(self, d):
        """the docking end's pad tip pose wanted, relative to the target body: at the stand-off point on the target's axis,
        axis pointing in, pads over the target's gaps (the 45-deg slot nearest to where it is now)"""
        w = self.w; m = self.m; dm, de = self.dock
        tb = self.RX['bid']; Rt, pt = d.xmat[tb].reshape(3, 3), d.xpos[tb]
        seat, z, R = w.rx_frame(self.RX, Rt, pt)
        Rb = d.xmat[self.E['body']].reshape(3, 3); Rs = d.site_xmat[self.E['tip']].reshape(3, 3); Rsl = Rb.T @ Rs
        y = -z if de == 'B' else z                                   # end body y = its outward normal (B) / inward (A)
        if self.k is None:                                           # keep one slot for the whole approach
            a = math.atan2(Rb[:, 0] @ R[:, 1], Rb[:, 0] @ R[:, 0]); self.k = round((a - math.pi / 4) / (math.pi / 2))
        th = math.pi / 4 + self.k * math.pi / 2; x = math.cos(th) * R[:, 0] + math.sin(th) * R[:, 1]
        Rbd = np.stack([x, y, np.cross(x, y)], 1); Rsd = Rbd @ Rsl
        pd = seat + self.offset * z
        return mink.SE3.from_rotation_and_translation(mink.SO3.from_matrix(Rt.T @ Rsd), Rt.T @ (pd - pt))

    def step(self, dt=0.06):
        """one tick: read the world, solve, return {module: joint velocities (7,)} and the goal error (mm, deg)"""
        d = self.w.d
        self.cfg.update(d.qpos.copy())
        self.goal.set_target(self._target(d)); self.posture.set_target(d.qpos.copy())
        tasks = [self.goal, self.posture, self.freeze] + ([self.locks] if self.locks else [])
        v = mink.solve_ik(self.cfg, tasks, dt, solver='daqp', damping=1e-3, limits=self.limits)
        out = {mid: np.array([v[dof] for dof in self.w.mod[mid]['dofs']]) for mid in self.mods}
        e = self.goal.compute_error(self.cfg)
        return out, float(np.linalg.norm(e[:3])) * 1000, math.degrees(float(np.linalg.norm(e[3:])))
