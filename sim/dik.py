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
  - lifting a module's heavy middle costs (height only): servo torque is limited, a lying chain should curl along the floor
  - joint limits and servo speeds (ConfigurationLimit, VelocityLimit)
Inputs: the world (PhysWorld) state = physics truth in the sim (on the real robot: encoders + IMU + optional camera).
Output: joint velocities for every module of the group (rad/s) -> the caller turns them into servo targets.
"""
import math, numpy as np, mujoco, mink
import vsepr as V

import os, sys
BASE_HOLD = os.environ.get('DIK_BASE_HOLD', '1') == '1'   # going in, the bodies are held (BaseHold); 0 = the old free bases
BASE_HOLD_COST = float(os.environ.get('DIK_BASE_HOLD_COST', '2'))   # 3 Nov, chain3 M3.B -> M1.S1A from 3 nudged starts: 20 held them too stiffly (1/3), 2 -> 3/3, 0.3 -> 2/3
BASE_COST = float(os.environ.get('DIK_BASE', '20'))   # cost of moving a module's whole body (was 2: planned the chain sliding, real friction made it stick-slip) - NOTE 3 Nov: mink's PostureTask skips free joints, so this never reached the bodies; BaseHold does
STRAIN = float(os.environ.get('DIK_STRAIN', '0.9'))  # servo load above which a joint may not move further the way it strains
LIFT_COST = float(os.environ.get('DIK_LIFT', '2.0'))    # how firmly the connectors are held up off the floor while lining up
LOW_COST = float(os.environ.get('DIK_LOW', '0.3'))     # cost of lifting a module's middle (per m, vs 1.0 for the tip goal)
FUNNEL = float(os.environ.get('DIK_FUNNEL', '0'))  # stand-off grows by this x the sideways error while lining up
GOAL_W = float(os.environ.get('DIK_GOALW', '1'))      # weight of 'the ends meet' vs everything else (Nischay: goal first, then least VSEPR score)
VFADE = float(os.environ.get('DIK_VFADE', '0.10'))   # VSEPR fades over this last distance (m) so the final mm are pure precision
VMODE = os.environ.get('DIK_VMODE', 'null')          # 'null': VSEPR strictly after the goal (null space), 'soft': a weighted wish
VFADE_NULL = float(os.environ.get('DIK_VFADE_NULL', '0'))   # m: the VSEPR shaping fades over this last distance; 0 = full strength to the seat
#   (Nischay 2 Nov: 'integrate IK and VSEPR as one' - it only moves what keeps the end on its way, so it never spoils the docking)
RESERVE = math.radians(float(os.environ.get('DIK_RESERVE', '20')))   # joints are pushed back within this much of their margin
HOP_COST = float(os.environ.get('DIK_HOP_COST', '0'))   # extra cost per lock-hop from the docking module (was 2: it folded the joints next to the ends)
VIDLE = float(os.environ.get('VSEPR_IDLE_RATE', '0.1'))   # rad/s of the always-on VSEPR relaxation of a locked group
DOWN_STAND = float(os.environ.get('DIK_DOWN_STAND', '0.75'))   # how strongly a standing group's spare motion lowers it when loaded
LOAD_EASY, LOAD_FULL = 0.15, 0.4   # servo load: below the first VSEPR may lift freely, at the second it only spreads along the floor and the spare motion lowers the body (3 Nov, 4-ring: lifted into a saddle, servos at 350 %, stalled 7 mm short; always flat instead left M1.A wedged behind M2.S2B)
VFULL = os.environ.get('DIK_VFULL', '1') == '1'   # VSEPR at full strength while lining up (3 Nov); 0 = eased near the target as before
VNULL = float(os.environ.get('DIK_VNULL', '0.3'))    # rad/s of the VSEPR motion in the null space
LOCK_COST = float(os.environ.get('DIK_LOCK', '1e4'))   # closed locks: near-hard (2 Nov: at 50, near the seat the QP 'bent' a lock instead of
#   moving the end - the real lock does not bend, so the end never moved and it stalled 0.6 mm off)
AROUND_MAX = float(os.environ.get('DIK_AROUND', '0.25'))   # m: furthest the aim moves out in front while the end comes around
AROUND_AX = float(os.environ.get('DIK_AROUND_AX', '0.02'))   # m: closer than this in front of the receiver's face counts as beside it
AROUND_RAMP = float(os.environ.get('DIK_AROUND_RAMP', '0'))   # m: the 'come around' push fades in over this depth; 0 = switched (9 Nov: the 2 cm ramp
#   was for the dropped 'target faces the docker' step and it broke ideal chain3 M3.B -> M1.S1A, 89 mm off)
CLEAR_R = float(os.environ.get('DIK_CLEAR', '0.14'))   # m: how far off the receiver's axis the tip must be to pass the body behind it
COLL_MIN = float(os.environ.get('DIK_COLL_MIN', '-0.003'))   # m: closest two modules' coarse boxes may come; negative: each box sticks out 2-4 mm past its part (measured 2 Nov: lying boxes 2-4 mm into the floor), at +2 mm they blocked a clean line-up at M1.S2B
FLOOR_IN = float(os.environ.get('DIK_FLOOR_IN', '0.006'))   # m: deepest a coarse box may sit in the floor (they overstate the parts)
VSEPR = float(os.environ.get('DIK_VSEPR', '0.002'))   # Nischay's VSEPR spread: every big part repels every other (1/d), cost per pair
PARTS = ('EndA_LockModule', 'Spine1_B1B2', 'T2_Ring_B3Fork', 'Spine2_B3B4', 'EndB_LockModule')
JN = ['T1', 'B1', 'B2', 'T2', 'B3', 'B4', 'T3']


def locks_as_now(m, d, eqs):
    """docking (DIK): each closed lock is kept as it sits NOW - its printed slack is physics, not an error to fight (2 Nov: held at
    a fixed pose, the QP spent itself 'fixing' 0.3 mm of slack and stopped 3.3 mm from the stand-off). The idle VSEPR instead
    keeps fixed zero points (phys_world._store_lock_pose) so it can never creep a lock open"""
    for i in eqs:
        b1, b2 = m.eq_obj1id[i], m.eq_obj2id[i]; R1 = d.xmat[b1].reshape(3, 3); q = np.zeros(4)
        mujoco.mju_mat2Quat(q, (R1.T @ d.xmat[b2].reshape(3, 3)).ravel()); m.eq_data[i, 3:6] = R1.T @ (d.xpos[b2] - d.xpos[b1]); m.eq_data[i, 6:10] = q


RELIEF_FROM = float(os.environ.get('DIK_RELIEF_FROM', '0.4'))   # servo load share above which the relief works
RX_HOLD = float(os.environ.get('DIK_RX_HOLD', '1'))   # going in: the receiver's joints cost this many times more (1 = off; 9 Nov: 30 stalled the
                                                        # IDEAL robot at 45 deg 21 mm out - the receiver's help is needed going in)
RELIEF_YIELD =os.environ.get('DIK_RELIEF_YIELD', '1') == '1'   # the relief steps aside while the goal is stuck
RELIEF = os.environ.get('DIK_RELIEF', 'torque')   # loaded servos: 'torque' = move to lower their load, 'down' = let the bodies down (old)
TORQUE = float(os.environ.get('DIK_TORQUE', '0.6'))   # no move may need more than this share of a servo's real strength (0 = off); the firmware caps at 70 %, the rest is for the motion itself (8 Nov ceiling: 0.8 let M2 tilt until it gave way)


class TorqueLimit(mink.Limit):
    """servo strength as a QP limit, PREDICTED (8 Nov, ceiling: the ideal robot docks by holding M2's top half out sideways;
    the real servos cannot, M2.B1 hit 100 % and M2 fell back into M1's path - the old 'stop at 90 %' bound reacts only after).
    Torque after the move = the servo's MEASURED torque now + how gravity's pull on that joint changes with the move,
    d(gravity torque)/dq from the model under the REAL gravity vector (floor, wall, ceiling alike). Each servo stays under
    TORQUE x its strength; one already over may only be relieved. Always feasible (no move satisfies it)."""
    def __init__(self, dik):
        self.k, m = dik, dik.m; w = dik.w
        self.dd = mujoco.MjData(m); self.J = []
        for mid in dik.mods:
            # the side each joint HOLDS UP: past it (toward B) - unless the module is anchored by its B end, then the A side
            # (the same moment as real_sync.Correction.load; the module's tree starts at its A end)
            footB = any(k_.startswith('F:') and k_.endswith(f'{mid}.B') or f'|{mid}.B' in k_ and 'F:' in k_ for k_ in w.engaged)
            root = m.body_rootid[m.body(f'{mid}_EndA_LockModule').id]
            mb = np.array([b for b in range(m.nbody) if m.body_rootid[b] == root])
            for a in w.mod[mid]['act']:
                j = m.actuator_trnid[a, 0]; jb = m.jnt_bodyid[j]
                sub = np.array([b for b in mb if self._under(m, b, jb)])
                self.J.append((j, (np.setdiff1d(mb, sub), 1.0) if footB else (sub, -1.0)))

    @staticmethod
    def _under(m, x, b):
        while x:
            if x == b: return True
            x = m.body_parentid[x]
        return False

    def _grav(self, q):
        """the static torque each servo needs to hold its load side against the real gravity"""
        m, dd = self.k.m, self.dd; dd.qpos[:] = q; mujoco.mj_kinematics(m, dd); g = m.opt.gravity
        return np.array([sg * float(dd.xaxis[j] @ np.cross(dd.xipos[S] - dd.xanchor[j], m.body_mass[S, None] * g).sum(0)) for j, (S, sg) in self.J])

    def compute_qp_inequalities(self, configuration, dt):
        m = self.k.m; q0 = configuration.q.copy(); g0 = self._grav(q0); h_ = 1e-3
        K = np.zeros((len(self.J), m.nv)); dv = np.zeros(m.nv)
        for j in self.k.F_all:                                          # every joint + free body DIK moves
            dv[:] = 0.0; dv[j] = h_; q1 = q0.copy(); mujoco.mj_integratePos(m, q1, dv, 1.0); K[:, j] = (self._grav(q1) - g0) / h_
        f = self.k.w.d.actuator_force[self.k.acts]; cap = TORQUE * self.k.fmax
        if os.environ.get('DIK_TQ_DEBUG') and int(self.k.w.d.time * 10) % 20 == 0:
            print('TQ model ', ' '.join(f'{x:5.2f}' for x in g0), '\nTQ servo ', ' '.join(f'{x:5.2f}' for x in f), flush=True)
        self.K, self.f = K, f.copy()                                     # kept for the load relief (DIK._vsepr_null)
        return mink.Constraint(G=np.vstack([K, -K]), h=np.r_[np.maximum(cap - f, 0.0), np.maximum(cap + f, 0.0)])


def up(m):
    """'up' = against the REAL gravity (walls, ceilings, slopes rotate it), unit vector; +z when there is none"""
    g = np.asarray(m.opt.gravity, float); n = float(np.linalg.norm(g))
    return -g / n if n > 1e-9 else np.array([0.0, 0.0, 1.0])


def vsepr_null_step(m, data, act_dofs, roots, rows, bodies, pairs, q, lower, upper, flat=0.0):
    """Nischay's VSEPR as part of the physics: the joint motion that lowers the VSEPR energy most among those that keep the
    rows (the goal and/or every closed lock) unchanged = the energy gradient projected into their null space, over the joints
    AND the free bodies (a lock carries the other module along); flat 0..1: 1 = spread along the floor only (no lifting for looks).
    Returns the joint direction (len(act_dofs)), not into a stop, or None"""
    F = list(act_dofs) + list(roots); nA = len(act_dofs)
    N = np.eye(len(F))
    if rows:
        J = np.vstack([r[:, F] for r in rows]); N = N - np.linalg.pinv(J, rcond=1e-4) @ J
    Jb = V.body_jacobians(m, data, bodies, F)
    u = up(m); Jb -= float(flat) * u[None, :, None] * np.einsum('k,bkf->bf', u, Jb)[:, None, :]   # no lifting AGAINST GRAVITY (8 Nov: world z was floor thinking; on a ceiling 'up' is -z)
    vs = (-N @ V.gradient(data.xpos[bodies], Jb, pairs))[:nA]
    vs[(q <= lower + 1e-6) & (vs < 0)] = 0; vs[(q >= upper - 1e-6) & (vs > 0)] = 0
    return vs if np.abs(vs).max() > 1e-9 else None


def vsepr_pairs(m, mods, eqs, skip=()):
    """the VSEPR parts (PARTS of every module) and their pairs: not neighbours inside a module, not two ends already locked
    together, not the `skip` (body, root) pairs (a docking end vs the module it is docking into)"""
    names = [(mid, k, f'{mid}_{p}') for mid in mods for k, p in enumerate(PARTS)]
    bodies = [m.body(n).id for _, _, n in names]; locked = set()
    for i in eqs: locked |= {(m.eq_obj1id[i], m.eq_obj2id[i]), (m.eq_obj2id[i], m.eq_obj1id[i])}
    pairs = []
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            if names[i][0] == names[j][0] and abs(names[i][1] - names[j][1]) < 2: continue
            bi, bj = bodies[i], bodies[j]
            if (bi, bj) in locked: continue
            if any(eb in (bi, bj) and m.body_rootid[bj if bi == eb else bi] == rt for eb, rt in skip): continue
            pairs.append((i, j))
    return bodies, pairs


class VseprIdle:
    """VSEPR keeps working when no job runs (Nischay 1 Nov: 'always try for less score, like part of the physics'): a locked
    group slowly relaxes toward a lower VSEPR energy with every lock kept closed; along the floor only, slow (VIDLE rad/s)"""
    def __init__(self, w, mods):
        import copy
        m = copy.deepcopy(w.m); eqs = [w.eq[k] for k in sorted(w.engaged)]; m.eq_active0[:] = 0; m.eq_active0[eqs] = 1   # the closed locks (held by their fins in the sim, a constraint here)
        self.w, self.m, self.mods, self.eqs = w, m, list(mods), eqs; self.cfg = mink.Configuration(m)
        self.act = [dof for mid in self.mods for dof in w.mod[mid]['dofs']]
        self.roots = []
        for mid in self.mods:
            a = m.jnt_dofadr[m.joint(f'{mid}_root').id]; self.roots += list(range(a, a + 6))
        self.locks = mink.EqualityConstraintTask(m, cost=1.0, equalities=eqs) if eqs else None
        self.bodies, self.pairs = vsepr_pairs(m, self.mods, eqs)
        self.qa = np.array([qa for mid in self.mods for qa in w.mod[mid]['qa']]); mg = math.radians(8)
        jr = np.array([m.jnt_range[m.actuator_trnid[a, 0]] for mid in self.mods for a in w.mod[mid]['act']])
        self.lo, self.hi = jr[:, 0] + mg, jr[:, 1] - mg
    def step(self):
        """{module: joint velocity (rad/s)} or None"""
        d = self.w.d; self.m.eq_data[self.eqs] = self.w.m.eq_data[self.eqs]; self.cfg.update(d.qpos.copy()); q = d.qpos[self.qa]
        rows = [self.locks.compute_jacobian(self.cfg)] if self.locks is not None else []
        vs = vsepr_null_step(self.m, self.cfg.data, self.act, self.roots, rows, self.bodies, self.pairs, q, np.minimum(self.lo, q), np.maximum(self.hi, q), flat=True)
        vs = np.zeros(len(self.act)) if vs is None else vs * (VIDLE / np.abs(vs).max())
        # ...and every lock pulled back to its kept pose: the null-space step is only right to first order, and its tiny errors
        # added up until a lock came open (2 Nov, M3.B in M2.S1B). Joints + bodies, as the step itself
        if rows:
            F = list(self.act) + list(self.roots); e = self.locks.compute_error(self.cfg)
            vs = vs - (np.linalg.pinv(rows[0][:, F], rcond=1e-4) @ e)[:len(self.act)] / 0.06 * 0.5
        if np.abs(vs).max() < 1e-6: return None
        return {mid: vs[k * 7:k * 7 + 7] for k, mid in enumerate(self.mods)}


class Spread(mink.Task):
    """Nischay's VSEPR spread (vsepr.py, = the Studio's spreadFromPoints) as a QP task: sum of squared errors = the energy
    sum 1/(d + 1 mm) over the pairs, so the solver pushes every part away from every other -> round, uncrowded shapes"""
    def __init__(self, m, bodies, pairs, cost):
        super().__init__(cost=np.full(len(pairs), cost), gain=1.0, lm_damping=0.0)
        self.m, self.b, self.pairs = m, list(bodies), np.array(pairs)
    def _ej(self, cfg):
        return V.pair_residual(cfg.data.xpos[self.b], V.body_jacobians(self.m, cfg.data, self.b), self.pairs)
    def compute_error(self, cfg): return self._ej(cfg)[0]
    def compute_jacobian(self, cfg): return self._ej(cfg)[1]
    def set_scale(self, f): self.cost = np.full(len(self.pairs), VSEPR * f)


class BaseHold(mink.Task):
    """the modules' own bodies stay where they are (no servo moves a body directly). mink's PostureTask leaves free joints out, so
    BASE_COST never reached them (3 Nov): in the last mm the QP slid a whole module 0.3 mm sideways - free in its model, impossible
    for the robot - and the tip never moved (chain3 M3.B -> M1.S1A, held 0.5 mm off the side at 18 mm for 7 s)"""
    def __init__(self, m, roots, cost):
        super().__init__(cost=np.full(len(roots), cost), gain=1.0, lm_damping=0.0)
        self.J = np.zeros((len(roots), m.nv)); self.J[np.arange(len(roots)), roots] = 1.0
    def compute_error(self, cfg): return np.zeros(len(self.J))
    def compute_jacobian(self, cfg): return self.J


class DIK:
    def __init__(self, w, mods, dock, target, hops, offset=0.03, vmax=0.6, share=None, anchor=None):
        """w = PhysWorld; mods = modules allowed to move; dock = (module, 'A'|'B'); target = receiver name (w.rx);
        hops = {module: lock-graph distance from the docking module} (far = expensive)
        share = per-joint weight in [0, 1] (len 7 * len(mods)): low = that joint is expensive to move"""
        import copy
        self.inside = False     # going straight in (going_in): the tip drag never goes in, it crashed reading this (5 Nov)
        # its own copy of the model: mink keeps only locks that are on in the model's start state, ours switch on at run time
        m = copy.deepcopy(w.m); eqs = [w.eq[k] for k in sorted(w.engaged)]; m.eq_active0[:] = 0; m.eq_active0[eqs] = 1   # the closed locks (held by their fins in the sim, a constraint here)
        self.w, self.m, self.mods, self.dock, self.tname, self.offset, self.eqs = w, m, list(mods), dock, target, offset, eqs
        dm, de = dock
        self.E = w.mod[dm]['end'][de]; self.site = m.site(self.E['tip']).name
        # target None = a free point in the world (drag tip to move, set with .point): no receiver, the tip's angle is free
        self.RX = next(x for x in w.rx if x['name'] == target) if target else None; self.point = None
        self.tbody = m.body(self.RX['bid']).name if self.RX else (anchor or 'world')   # free point: held in this body's frame
        self.cfg = mink.Configuration(m)
        self.act_dofs = [dof for mid in self.mods for dof in w.mod[mid]['dofs']]
        roots = []
        for mid in self.mods:
            j = m.joint(f'{mid}_root').id; a = m.jnt_dofadr[j]; roots += list(range(a, a + 6))
        free = set(self.act_dofs) | set(roots); self.roots = roots
        self.freeze = mink.DofFreezingTask(m, dof_indices=[i for i in range(m.nv) if i not in free])
        cost = np.full(m.nv, 1e-3)
        for mid in self.mods:
            for dof in w.mod[mid]['dofs']: cost[dof] = 0.02 * (1 + HOP_COST * hops.get(mid, 0))   # every joint the same (HOP_COST 0): VSEPR decides the shape
        if share is not None:            # the caller's per-joint share: a separate standing target mostly only turns its base twist
            for c, dof in enumerate(dof for mid in self.mods for dof in w.mod[mid]['dofs']): cost[dof] /= max(share[c], 1e-3) ** 2
        for a in roots: cost[a] = BASE_COST                                                   # the group's own pose: most expensive (friction holds a lying module until it slips)
        self.posture = mink.PostureTask(m, cost=cost); self.cost0 = cost.copy()
        rxm = m.body(self.tbody).name.split('_')[0] if self.tbody is not None else None   # the module holding the target socket
        self.rx_dofs = list(w.mod[rxm]['dofs']) if rxm in self.mods and rxm != self.dock[0] else []
        self.base_hold = BaseHold(m, roots, BASE_HOLD_COST)                                       # only while going in (step)
        # 'less bent' preferred, gently: spreads a curl over every joint instead of a few at their stops (1 Nov: the 3-ring plan put
        # 4 bends at +-88 deg although each module needs only ~120 deg in all)
        c0 = np.zeros(m.nv)
        for dof in self.act_dofs: c0[dof] = float(os.environ.get('DIK_RELAX', '0.003'))
        self.c0 = c0; self.relax = mink.PostureTask(m, cost=c0); q0 = m.qpos0.copy(); self.q_relax = q0
        self.goal = mink.RelativeFrameTask(self.site, 'site', self.tbody, 'body', position_cost=GOAL_W, orientation_cost=0.3 * GOAL_W, lm_damping=1e-3)
        # weight: lifting a heavy middle costs servo torque the robot may not have (1 Nov: the 3-ring lifted the chain, servos at
        # 100 %, collapsed). Hold the HEIGHT of every module's middle parts, sideways free -> a lying chain curls flat on the floor
        self.low = []
        for mid in self.mods:
            for part in ('Spine1_B1B2', 'T2_Ring_B3Fork', 'Spine2_B3B4'):
                self.low.append(mink.FrameTask(f'{mid}_{part}', 'body', position_cost=np.array([0.0, 0.0, LOW_COST]), orientation_cost=0.0))
        # VSEPR spread over every module's big parts; not the docking end <-> its target (they must meet), not neighbours in a
        # module, not two ends already locked together
        bodies, pairs = vsepr_pairs(m, self.mods, eqs, skip=[(self.E['body'], m.body_rootid[self.RX['bid']])] if self.RX else [])
        self.spread = Spread(m, bodies, pairs, VSEPR) if pairs and VSEPR > 0 else None
        self.locks = mink.EqualityConstraintTask(m, cost=LOCK_COST, equalities=eqs) if eqs else None
        vl = mink.VelocityLimit(m, {m.joint(m.dof_jntid[dof]).name: vmax for dof in self.act_dofs})
        # servo joints keep 8 deg from their stops; one already closer may not get closer (always solvable). Only the servos:
        # an 8-deg margin on the +-3 deg PLA-flex / +-0.2 deg backlash joints made every tick unsolvable (1 Nov), and the no-margin
        # fallback then drove M2.T2 into its 180-deg stop (servo 100 %, the 3-ring stuck 15 mm short)
        self.cl = mink.ConfigurationLimit(m); self.lo0, self.hi0 = self.cl.lower.copy(), self.cl.upper.copy()
        self.qa_all = np.array([qa for mid in self.mods for qa in w.mod[mid]['qa']])
        # twists turn a full +-180: their stop IS the half turn. Facing a receiver that points straight away needs ~180, and the
        # 8-deg margin left every twist 8 deg short (9 Nov sweep: M2.T1 parked at its stop in all 8 failed walls/ceilings) -> 3 deg
        self.margin = np.array([math.radians(float(os.environ.get('DIK_TWIST_MARGIN', '3')) if k in (0, 3, 6) else float(os.environ.get('DIK_MARGIN', '8')))
                                for mid in self.mods for k in range(len(w.mod[mid]['qa']))])
        self.limits = [self.cl, vl] + self._collision_limits(m, w, eqs)
        self.acts = np.array([a for mid in self.mods for a in w.mod[mid]['act']]); self.fmax = np.maximum(np.abs(w.m.actuator_forcerange[self.acts, 1]), 1e-6)
        self.F_all = sorted(set(self.act_dofs) | set(self.roots))
        if TORQUE > 0 and not getattr(w, 'exact', False): self.limits.append(TorqueLimit(self))   # the ideal robot sets its angles exactly: no strength to run out of
        self.k = None; self.relax_on = True; self.funnel = FUNNEL; self.lift = []

    def _collision_limits(self, m, w, eqs):
        """no collisions (Nischay 2 Nov), as hard QP limits on every tick - the path is found live, never planned: each module
        body's coarse box may not get closer than COLL_MIN to another module's, nor sink deeper than FLOOR_IN into the floor
        (lying boxes already sit 2-4 mm in: they are a bit bigger than the parts). Not checked: inside one module (its joint
        limits), two ends already locked; the docking end vs the target module only while lining up (going straight in they meet)"""
        box = {mid: [g for g in range(m.ngeom) if m.geom_group[g] == 4 and m.geom_type[g] == mujoco.mjtGeom.mjGEOM_BOX
                     and m.body(m.geom_bodyid[g]).name.startswith(mid + '_')] for mid in w.ids}
        fl = m.geom('floor').id
        for g in [g for v in box.values() for g in v] + [fl]:            # mink skips geoms that cannot collide: these are only for DIK
            m.geom_contype[g] |= 8; m.geom_conaffinity[g] |= 8
        eb = self.E['body']
        # going in, the docking end (and the part next to it) may come close to ANY part of the target module: near a side receiver
        # the neighbouring boxes held it 6 mm short (2 Nov, M3.B -> M2.S1A); the real contacts handle the real shapes there
        tmod = m.body(self.RX['bid']).name.split('_')[0] if self.RX else None
        meet = ({eb, m.body_parentid[eb]} | {b_ for b_ in range(m.nbody) if m.body_parentid[b_] == eb},   # + its lock rotor (3 Nov: it has a box now)
                {g_b for g_b in range(m.nbody) if m.body(g_b).name.startswith(tmod + '_')} if tmod else set())
        mp = {frozenset((a, b)) for a in meet[0] for b in meet[1]}
        # two ends locked together touch everywhere (fins inside each other): every part of one (end + its rotor) vs every part of the other
        kids = lambda b_: {b_} | {c_ for c_ in range(m.nbody) if m.body_parentid[c_] == b_}
        skip = {frozenset((x, y)) for i in eqs for x in kids(m.eq_obj1id[i]) for y in kids(m.eq_obj2id[i])}
        pairs, mpairs = [], []
        for mid in self.mods:
            for g in box[mid]:
                for o in w.ids:
                    if o == mid: continue
                    ok = [h for h in box[o] if frozenset((m.geom_bodyid[g], m.geom_bodyid[h])) not in skip]
                    pairs += [([g], [h]) for h in ok if frozenset((m.geom_bodyid[g], m.geom_bodyid[h])) not in mp]
                    mpairs += [([g], [h]) for h in ok if frozenset((m.geom_bodyid[g], m.geom_bodyid[h])) in mp]
        # the floor: the parts' own coarse boxes only - the connector-zone boxes (phys_world COARSE_ADD) are for part vs part; sized
        # to a whole end they reach into the floor and blocked the last mm going in (3 Nov, M3.B -> M1.S1A)
        out = [mink.CollisionAvoidanceLimit(m, [([g for mid in self.mods for g in box[mid] if not m.geom(g).name.endswith('_coarse')], [fl])], minimum_distance_from_collisions=-FLOOR_IN, collision_detection_distance=0.03)]
        if pairs: out.append(mink.CollisionAvoidanceLimit(m, pairs, minimum_distance_from_collisions=COLL_MIN, collision_detection_distance=0.03))
        # the two meeting connectors (and the parts next to them) are checked too while lining up - only going straight in may
        # they touch (2 Nov, 4-ring: never checked, the end cut across the target's side and drove 9 mm into it)
        self.meet = mink.CollisionAvoidanceLimit(m, mpairs, minimum_distance_from_collisions=COLL_MIN, collision_detection_distance=0.03) if mpairs else None
        if self.meet is not None: out.append(self.meet)
        return out

    def going_in(self, on):
        """going straight in: the meeting connectors may now touch (their collision limit off); backing out: on again"""
        self.inside = on
        if self.meet is None: return
        if on and self.meet in self.limits: self.limits.remove(self.meet)
        elif not on and self.meet not in self.limits: self.limits.append(self.meet)

    def _target(self, d):
        """the docking end's pad tip pose wanted, relative to the target body: at the stand-off point on the target's axis,
        axis pointing in, pads over the target's gaps (the 45-deg slot nearest to where it is now)"""
        w = self.w; m = self.m; dm, de = self.dock
        if self.RX is None:                                          # a free point: the tip goes there, keeping the angle it has now
            # held in the anchor body's frame (3 Nov: in world terms a lying chain on a slippery floor slid away from it as its joints
            # moved, 600 mm); point_local is set by the caller from the mouse in world terms
            b = m.body(self.tbody).id; Ra, pa = d.xmat[b].reshape(3, 3), d.xpos[b]
            # point_world: the mouse stays where it is in the room (5 Nov: held in the anchor's frame, the anchor - a lying end - rolled
            # as the robot moved and the target swung from 75 mm up to 6 mm up; slid along with the anchor, a sliding robot chased its
            # own target 1.4 m away)
            tr = Ra.T @ (np.asarray(self.point_world, float) - pa) if getattr(self, 'point_world', None) is not None else np.asarray(self.point, float)
            return mink.SE3.from_rotation_and_translation(mink.SO3.from_matrix(Ra.T @ d.site_xmat[self.E['tip']].reshape(3, 3)), tr)
        tb = self.RX['bid']; Rt, pt = d.xmat[tb].reshape(3, 3), d.xpos[tb]
        seat, z, R = w.rx_frame(self.RX, Rt, pt)
        Rb = d.xmat[self.E['body']].reshape(3, 3); Rs = d.site_xmat[self.E['tip']].reshape(3, 3); Rsl = Rb.T @ Rs
        y = -z if de == 'B' else z                                   # end body y = its outward normal (B) / inward (A)
        if self.k is None:                                           # keep one slot for the whole approach
            a = math.atan2(Rb[:, 0] @ R[:, 1], Rb[:, 0] @ R[:, 0]); self.k = round((a - math.pi / 4) / (math.pi / 2))
        th = math.pi / 4 + self.k * math.pi / 2; x = math.cos(th) * R[:, 0] + math.sin(th) * R[:, 1]
        Rbd = np.stack([x, y, np.cross(x, y)], 1); Rsd = Rbd @ Rsl
        # funnel: the further the tip is off the target's axis, the further back the line-up point (stand-off + sideways error),
        # so the end comes around in front instead of cutting the corner across the target's housing (1 Nov, 4-ring: the two
        # ends touched 15 mm short of lining up). Only while lining up; going in (offset < 3 cm) is straight
        tip = d.site_xpos[self.E['tip']]; v = tip - seat; lat = np.linalg.norm(v - (v @ z) * z)
        pd = seat + (self.offset + (min(self.funnel * lat, 0.02) if self.offset >= 0.03 else 0.0)) * z   # capped: a big sideways error must not open the whole ring (1 Nov)
        # come around to the FRONT (2 Nov, M3.B -> M1.S2A: the end sat behind the receiver against M1's body - the straight pull
        # to the stand-off held it there): while the tip is behind the receiver's face, the aim moves further out in front by
        # how far round it still has to go; it shrinks back to the stand-off as the tip comes in front. Live, from where it is now
        ax = float(v @ z)
        if self.offset >= 0.03 and ax < self.offset:
            # faded in over AROUND_RAMP, not switched on (8 Nov: with the target turned to face the docker, the tip arrives AT the
            # stand-off depth 40 mm off the axis; the aim jumped 40 mm out and back every few ticks - no progress for 7 s, walls)
            pd = pd + min(max(0.0, -ax) + lat, AROUND_MAX) * (min(1.0, (self.offset - ax) / AROUND_RAMP) if AROUND_RAMP > 0 else 1.0) * z
            # behind the receiver's face the way forward runs through the module that holds it: first out sideways, past its body, on
            # the side the tip already is (2 Nov, M1.A -> M2.S2B: wedged 13 mm behind it, 73 mm off the axis)
            if ax < AROUND_AX and lat > 1e-6: pd = pd + max(CLEAR_R - lat, 0.0) * (v - ax * z) / lat   # beside it too (3 Nov: 3 mm in front, 80 mm off, against M2's housing)
        return mink.SE3.from_rotation_and_translation(mink.SO3.from_matrix(Rt.T @ Rsd), Rt.T @ (pd - pt))

    def step(self, dt=0.06):
        """one tick: read the world, solve, return {module: joint velocities (7,)} and the goal error (mm, deg)"""
        d = self.w.d
        locks_as_now(self.m, d, self.eqs); self.cfg.update(d.qpos.copy())   # docking: each lock as it sits now (its slack is not 'corrected')
        self.goal.set_target(self._target(d)); self.posture.set_target(d.qpos.copy())
        # the last 5 cm: the connector's ANGLE matters as much as its position (pads jam at 2-3 deg of tilt, Nischay 1 Nov)
        e_ = float(np.linalg.norm(self.goal.compute_error(self.cfg)[:3]))
        self.goal.set_orientation_cost(0.3 * GOAL_W * (1.0 + 4.0 * max(0.0, 1.0 - e_ / 0.05)) if self.RX else 0.0)
        qr = d.qpos.copy()
        for mid in self.mods: qr[np.array(self.w.mod[mid]['qa'])] = 0.0           # straight = the middle of every bend's range
        self.relax.set_target(qr)
        for t in self.low: t.set_target(self.cfg.get_transform_frame_to_world(t.frame_name, 'body'))
        # shape wishes first, precision last (as the VSEPR spread): 'less bent' and 'stay low' fade over the last 10 cm, else
        # they balance the tip's pull a few cm short (1 Nov, 3-ring: stopped at 14-17 mm, gate is 6 mm)
        q = d.qpos[self.qa_all]; ia = self.qa_all
        f = min(1.0, float(np.linalg.norm(self.goal.compute_error(self.cfg)[:3])) / 0.10)
        self.relax.set_cost(self.c0 * f * self.relax_on)
        for t in self.low: t.set_position_cost(np.array([0.0, 0.0, LOW_COST * f]))
        if self.spread is not None: self.spread.set_scale(min(1.0, float(np.linalg.norm(self.goal.compute_error(self.cfg)[:3])) / VFADE) if VFADE > 0 else 1.0)
        soft = self.spread is not None and VMODE == 'soft'
        tasks = [self.goal, self.posture, self.relax, self.freeze] + self.low + self.lift + ([self.spread] if soft else []) + ([self.locks] if self.locks else [])
        if self.inside and BASE_HOLD: tasks.append(self.base_hold)        # going in: the last mm by the joints alone (lining up, the bodies may move with them)
        q = d.qpos[self.qa_all]; ia = self.qa_all
        self.cl.lower[ia] = np.minimum(self.lo0[ia] + self.margin, q); self.cl.upper[ia] = np.maximum(self.hi0[ia] - self.margin, q)
        # servo strength (3.3): a servo at its torque limit cannot move further the way it strains (1 Nov: DIK asked M3 to lift
        # itself onto M2's side, 3 servos at 100 %, stuck 170 mm short). Its joint gets a 'not further this way' bound, so the QP
        # must find another way: other joints, the body moving, a lower path
        f = d.actuator_force[self.acts]; load = np.abs(f) / self.fmax
        sat = load > STRAIN
        self.cl.upper[ia[sat & (f > 0)]] = np.minimum(self.cl.upper[ia[sat & (f > 0)]], q[sat & (f > 0)])
        self.cl.lower[ia[sat & (f < 0)]] = np.maximum(self.cl.lower[ia[sat & (f < 0)]], q[sat & (f < 0)])
        c_ = self.posture.cost.copy()
        if self.inside and RX_HOLD > 1 and self.rx_dofs:             # going in: the docker's joints do the last mm, the receiver mostly holds
            ch = c_.copy(); ch[self.rx_dofs] *= RX_HOLD; self.posture.set_cost(ch)
        try: v = mink.solve_ik(self.cfg, tasks, dt, solver='daqp', damping=1e-3, limits=self.limits)
        except mink.exceptions.NoSolutionFound:
            # no move satisfies every limit at once (3 Nov, standing chain): drop only the speed limit this tick - never the collision
            # limits (dropping them drove an end into a housing at 81 N) - and if even that fails, stand still this tick
            try: v = mink.solve_ik(self.cfg, tasks, dt, solver='daqp', damping=1e-3, limits=[l_ for l_ in self.limits if not isinstance(l_, mink.VelocityLimit)])
            except mink.exceptions.NoSolutionFound: v = np.zeros(self.m.nv)
        self.posture.set_cost(c_)
        if self.spread is not None and VMODE == 'null':
            vn = self._vsepr_null(q, ia)
            # the receiver holds still while the plug goes in (9 Nov, 45 deg seed 1: going in, the spread/relief turned M2's T2 from 50
            # to 122 deg - 'moving together' is exact only for perfect servos; real ones lag, the socket slid 7 mm away)
            if self.inside and RX_HOLD > 1 and self.rx_dofs: vn[self.rx_dofs] = 0.0
            v = v + vn
        if os.environ.get('DIK_PARTS') and int(round(float(d.time) / 0.06)) % 5 == 0:   # which rule moves each joint (deg/s), M1 | M2
            P = dict(reach=v - vn if self.spread is not None and VMODE == 'null' else v, **getattr(self, 'parts', {}))
            print(f'PARTS t {float(d.time):5.1f} ' + ' '.join(f'{k_}: ' + ' '.join(f'{math.degrees(x):4.0f}' for x in [P[k_][dof] for mid in self.mods for dof in self.w.mod[mid]["dofs"]]) for k_ in P), file=sys.stderr, flush=True)
        out = {mid: np.array([v[dof] for dof in self.w.mod[mid]['dofs']]) for mid in self.mods}
        e = self.goal.compute_error(self.cfg)
        return out, float(np.linalg.norm(e[:3])) * 1000, math.degrees(float(np.linalg.norm(e[3:])))

    def lift_ends(self, bodies, dz=0.015):
        """lift these bodies dz above where they are now (height only) and hold them there: the two connectors line up in the
        AIR, off the floor (1 Nov: the last cm could not be corrected while the ends dragged on the floor)"""
        self.lift = []
        for b in bodies:
            name = self.m.body(b).name; T = self.cfg.get_transform_frame_to_world(name, 'body')
            t = mink.FrameTask(name, 'body', position_cost=np.array([0.0, 0.0, LIFT_COST]), orientation_cost=0.0)
            t.set_target(mink.SE3.from_rotation_and_translation(T.rotation(), T.translation() + up(self.m) * dz))
            self.lift.append(t)

    def end_joints_only(self, ends, k=3, factor=100.0):
        """the final correction with the LIGHT joints only: the k joints nearest each given connector [(module, 'A'|'B'), ...];
        every other joint costs `factor` x more (1 Nov: a lying 3-/4-ring cannot drag its whole body sideways over the floor -
        ~10 N of friction at up to 30 cm is more than an ST3215 has - so the last mm must come from the ends' own joints)"""
        c = self.cost0.copy(); keep = set()
        for mid, e in ends:
            if mid in self.mods:
                dofs = self.w.mod[mid]['dofs']
                if e == 'A': keep |= set(dofs[:k])
                elif e == 'B': keep |= set(dofs[-k:])
                elif e == 'S1': keep |= set(dofs[0:4])                       # T1 B1 B2 T2 around Spine1
                elif e == 'S2': keep |= set(dofs[3:7])                       # T2 B3 B4 T3 around Spine2
        for dof in self.act_dofs:
            if dof not in keep: c[dof] *= factor
        self.posture.set_cost(c)

    def _vsepr_null(self, q, ia):
        """Nischay's rule, strict: the ends' approach comes first; among all joint motions that leave the docking end where the
        goal step puts it (and keep every lock closed) take the one that lowers the VSEPR energy most. = the energy gradient
        projected into the null space of the goal + lock Jacobians (joints only; the bodies are not slid for looks)"""
        # the bodies move WITH the joints (a lock carries the other module along): the null space is over joints + the free
        # bodies, else the lock rows freeze 6 joint directions and VSEPR is left ~2 of 14 (1 Nov: rings barely rounder)
        cfg, A = self.cfg, self.act_dofs
        heavy = float(np.clip((np.abs(self.w.d.actuator_force[self.acts] / self.fmax).max() - LOAD_EASY) / (LOAD_FULL - LOAD_EASY), 0, 1)) 
        rows = [self.goal.compute_jacobian(cfg)] + ([self.locks.compute_jacobian(cfg)] if self.locks is not None else [])
        vs = vsepr_null_step(self.m, cfg.data, A, self.roots, rows, self.spread.b, self.spread.pairs, q, self.cl.lower[ia], self.cl.upper[ia], flat=heavy)
        # joints keep their reserve, in the same free motions (2 Nov, 3-ring: VSEPR at full strength rounded the shape until 3 joints
        # sat at their stops, and the end, 75 mm out, had nothing left to reach with: 5.8 mm per tick instead of 40). Acts only in
        # the last RESERVE before a joint's margin: a limit, not a preferred shape
        lo, hi = self.lo0[ia] + self.margin, self.hi0[ia] - self.margin
        push = np.clip((lo + RESERVE - q) / RESERVE, 0, 1) ** 2 - np.clip((q - hi + RESERVE) / RESERVE, 0, 1) ** 2
        F = list(A) + list(self.roots); J = np.vstack([r[:, F] for r in rows])
        back = (push_full := np.r_[push, np.zeros(len(self.roots))]) - np.linalg.pinv(J, rcond=1e-4) @ (J @ push_full)
        err = float(np.linalg.norm(self.goal.compute_error(self.cfg)[:3]))
        fade = min(1.0, max(0.0, (err - 0.01) / VFADE_NULL)) if VFADE_NULL > 0 else 1.0
        out = np.zeros(self.m.nv); out[A] = back[:len(A)] * VNULL
        self.parts = {'reserve': out.copy()}                            # each rule's share, for DIK_PARTS=1 (debug)
        # yields while the goal is stuck, like VSEPR below (9 Nov, 45/90 deg seed 1: the relief kept folding M2 down while M1 sat
        # 9-16 mm aside, 'no progress'); the TorqueLimit still guards the servos, the relief is only a preference
        if RELIEF_YIELD and getattr(self, 'vs_yield', False): heavy = 0.0
        if heavy > 0:                                                   # too heavy to hold up: the spare motion lets the body down, like gravity -
            # gentler for a standing group (DOWN_STAND): full strength held a standing M1 off M2.S2B, none let M1 arch out and stall (3 Nov)
            tl = next((l_ for l_ in self.limits if isinstance(l_, TorqueLimit) and hasattr(l_, 'K')), None)
            if tl is not None and RELIEF == 'torque':
                # the spare motion that LOWERS the servos' load (9 Nov, 135 deg: 'let the body down' swung M2's top half out sideways,
                # its lowest bend went to 70 % and could not tilt the socket to M1): - d/dq of sum (torque / strength)^2, the
                # TorqueLimit's own gravity model, so it works the same on floor, wall and ceiling
                # only the share OVER RELIEF_FROM counts (9 Nov, floor: relieving every servo a little made both modules lie down in a
                # heap - lying is the least load of all, but docking needs them up)
                ex = np.sign(tl.f) * np.maximum(np.abs(tl.f) / self.fmax - RELIEF_FROM, 0.0)
                down = -(tl.K[:, F].T @ (ex / self.fmax))
            else: down = -np.einsum('k,bkf->f', up(self.m), V.body_jacobians(self.m, cfg.data, self.spread.b, F))
            down = (down - np.linalg.pinv(J, rcond=1e-4) @ (J @ down))[:len(A)]
            down[(q <= self.cl.lower[ia] + 1e-6) & (down < 0)] = 0; down[(q >= self.cl.upper[ia] - 1e-6) & (down > 0)] = 0
            if np.abs(down).max() > 1e-9:
                o0 = out.copy(); out[A] += down / np.abs(down).max() * VNULL * heavy * max(0.1, min(1.0, err / 0.10)) * (1.0 if getattr(self, 'lying', True) else DOWN_STAND); self.parts['relief'] = out - o0
        if vs is not None and not getattr(self, 'vs_yield', False):   # yields while the goal is stuck (coop_connect sets it)
            # like a ball in a bowl: as fast as the push is strong compared with its strongest so far, so it eases into the best shape
            # instead of running at full speed for ever; 10 % near the target (never off): its steps keep the end still only to first
            # order, ~0.5 mm per joint per tick on a 1.5 m ring at full speed (2 Nov: 6 mm sideways while going in)
            n = np.abs(vs).max(); self.vs_peak = max(getattr(self, 'vs_peak', 0.0), n)
            # (3 Nov, Nischay: 'DIK puts the tip, VSEPR arranges everything behind it at the same time'): full strength while lining up,
            # slowed only going straight in
            o0 = out.copy(); out[A] += vs / n * VNULL * fade * min(1.0, 4.0 * n / self.vs_peak) * (max(0.1, min(1.0, err / 0.10)) if getattr(self, 'inside', False) or not VFULL else 1.0); self.parts['vsepr'] = out - o0
        return out

    def why(self, dt=0.06):
        """debug: which task / limit holds the tip back? Solve once per variant (one part left out) and report how far the tip
        would move toward its goal in this tick (mm)"""
        base = [self.goal, self.posture, self.relax, self.freeze] + self.low + ([self.locks] if self.locks else []) + ([self.base_hold] if self.inside and BASE_HOLD else [])
        J = self.goal.compute_jacobian(self.cfg); e = self.goal.compute_error(self.cfg)
        def gain(tasks, limits):
            try: v = mink.solve_ik(self.cfg, tasks, dt, solver='daqp', damping=1e-3, limits=limits)
            except mink.exceptions.NoSolutionFound: return float('nan')
            return float(np.linalg.norm(e[:3]) - np.linalg.norm(e[:3] + (J @ v * dt)[:3])) * 1000
        out = {'all': gain(base, self.limits)}
        for nm, t in (('posture', self.posture), ('relax', self.relax), ('locks', self.locks)):
            if t is not None: out['-' + nm] = gain([x for x in base if x is not t], self.limits)
        out['-low'] = gain([x for x in base if x not in self.low], self.limits)
        out['-vlimit'] = gain(base, [self.cl])
        try:   # joints only: what the tip gains if the bases (unpowered) do not move as the QP assumed
            v = mink.solve_ik(self.cfg, base, dt, solver='daqp', damping=1e-3, limits=self.limits); vj = v.copy(); vj[self.roots] = 0.0
            out['joints_only'] = float(np.linalg.norm(e[:3]) - np.linalg.norm(e[:3] + (J @ vj * dt)[:3])) * 1000
        except mink.exceptions.NoSolutionFound: pass
        return {k: round(v, 2) for k, v in out.items()}
