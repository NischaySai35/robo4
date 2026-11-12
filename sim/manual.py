"""manual.py — the Studio's MANUAL tab: a live physics session you drive by hand (Nischay 30 Oct).

Real physics, always: gravity, contact, friction, magnets, ST3215 servos, random robot, room disturbances (shake, bumps, air,
cardboard play), the MPU-6050s. Nothing is moved by hand-written couplings.
  joints   set servo targets; the servos move at their own speed/acceleration
  lock     the rotor(s) turn (end<->end: BOTH centre rotors, A one way and B the other; end<->side / floor: only the end's rotor)
           and it becomes a lock only if the end is really seated (gap < 0.8 mm, side < 1.5 mm, rotor > 40 deg); else rotors back
  unlock   rotor(s) back, the weld goes, the faces collide again, magnets still pull
  connect  pick two connectors: the modules involved bend so the docking end stands off in front of the other connector
           (pre-shape: least squares over every joint of the locked group, staying on the floor), then the robot's own
           docking brain lines up and goes straight in (phys_dock.dock: blind = encoders only, or with a judge)
The physics runs on its own thread, paced to real time; the Studio pulls the frames (/manual/step).

  py -3.12 manual.py SCENES.json NAME A B     test a connect without the Studio (no pacing), e.g. chain2 M1.A M2.B"""
from paths import tpath
import sys, os, io, math, time, json, queue, threading, contextlib, numpy as np, mujoco
sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
from scipy.optimize import least_squares
import disturb as DIST
import vsepr
from phys_world import PhysWorld, lock_key, docking_of, SPINE_RX, C, VIEW_BODIES
from tetro_env2 import RX_TOP, RX_GAP

JN = ['T1', 'B1', 'B2', 'T2', 'B3', 'B4', 'T3']
SESS = {}
LIE_Z = 0.045                                        # a lying module's parts sit up to here: the nominal model drifts ~4 cm over a long chain (sag), so 'now' is at least this
HOVER_FAR = 0.022                                    # pre-shape stand-off = the brain's own hover (laptop_controller.STANDOFF): it starts right there


class Abort(Exception):
    pass


# ---------- connectors and locks ----------
def port_ref(name):
    """'M1.A' / 'M2.S1A' / 'F:F0' -> lock-side dict"""
    if name.startswith('F:'): return {'floor': name[2:]}
    m, p = name.split('.'); return {'module': m, 'port': p}


def ref_name(r):
    return ('F:' + r['floor']) if 'floor' in r else f"{r['module']}.{r['port']}"


def canon(a, b):
    """the one lock dict this pair is declared as: b = the docking END; end<->end sorted (both rotors turn anyway)"""
    a, b = (port_ref(a) if isinstance(a, str) else a), (port_ref(b) if isinstance(b, str) else b)
    end = lambda r: 'module' in r and r['port'] in ('A', 'B')
    if not end(b): a, b = b, a
    if not end(b): raise ValueError('a lock needs at least one END connector (never side<->side)')
    if end(a) and (a['module'], a['port']) > (b['module'], b['port']): a, b = b, a
    if 'module' in a and a['module'] == b['module']: raise ValueError("a module cannot lock to itself")
    return {'a': a, 'b': b}


def all_locks(ids, anchors):
    """every lock this world may ever close (a world must know them when it is built)"""
    ends = [f'{m}.{e}' for m in ids for e in 'AB']; out = {}
    for e in ends:
        for an in anchors: L = canon('F:' + an['id'], e); out[lock_key(L)] = L
        for m in ids:
            if m == e.split('.')[0]: continue
            for s in SPINE_RX: L = canon(f'{m}.{s}', e); out[lock_key(L)] = L
            for e2 in 'AB':
                try: L = canon(f'{m}.{e2}', e); out[lock_key(L)] = L
                except ValueError: pass
    return list(out.values())


# ---------- the locked group's kinematics (nominal model, any joint values) ----------
class GroupFK:
    """world poses of every body of a group of locked modules for candidate joint values: each module's own nominal kinematics,
    glued by the locks (the relative pose of two locked bodies is fixed by the design: taken once from the world)"""

    def __init__(self, w, mods, root, locks):
        self.w, self.mods, self.root = w, mods, root; m = w.m
        self.dk = {mid: mujoco.MjData(m) for mid in mods}; self.edges = []
        d = w.d; T = lambda b: (d.xmat[b].reshape(3, 3).copy(), d.xpos[b].copy())
        for lk in locks:
            (dm, de), recv = docking_of(lk)
            rm = recv.split('_')[0]
            if dm in mods and rm in mods:
                b1, b2 = m.body(recv).id, m.body(f'{dm}_End{de}_LockModule').id; (R1, p1), (R2, p2) = T(b1), T(b2)
                self.edges.append((rm, b1, dm, b2, R1.T @ R2, R1.T @ (p2 - p1)))
        # the root's FREE-JOINT frame (what local() sets to identity), not its module_frame body: they differ by the body's
        # offset, which shifted every module chained after it (1 Nov: M2 planned 26 cm 'below the floor')
        r = w.mod[root]['root']; Rq = np.zeros(9); mujoco.mju_quat2Mat(Rq, d.qpos[r + 3:r + 7]); self.T_root = (Rq.reshape(3, 3), d.qpos[r:r + 3].copy())

    def local(self, mid, q):
        # the module's non-servo joints (PLA flex, gear play, lock rotors) at their TRUE current values, not 0 (2 Nov: assuming 0 put
        # the planner 5 mm off inside one module and 31 mm three modules down, even in ideal mode); only the servos take q
        m = self.w.m; dk = self.dk[mid]; dk.qpos[:] = self.w.d.qpos; a = self.w.mod[mid]['root']
        dk.qpos[a:a + 7] = [0, 0, 0, 1, 0, 0, 0]; dk.qpos[np.array(self.w.mod[mid]['qa'])] = q; mujoco.mj_kinematics(m, dk); return dk

    def poses(self, qs):
        """{mid: (R_frame, p_frame, dk)}: each module frame in the world + its local kinematics"""
        out = {self.root: (*self.T_root, self.local(self.root, qs[self.root]))}; todo = True
        while todo:
            todo = False
            for (rm, b1, dm, b2, Rr, pr) in self.edges:
                for (k, kb, n, nb, R12, p12) in ((rm, b1, dm, b2, Rr, pr), (dm, b2, rm, b1, Rr.T, -Rr.T @ pr)):
                    if k in out and n not in out:
                        Rk, pk, dkk = out[k]; Rb1 = Rk @ dkk.xmat[kb].reshape(3, 3); pb1 = pk + Rk @ dkk.xpos[kb]
                        Rb2 = Rb1 @ R12; pb2 = pb1 + Rb1 @ p12; dkn = self.local(n, qs[n])
                        Rl, pl = dkn.xmat[nb].reshape(3, 3), dkn.xpos[nb]; Rf = Rb2 @ Rl.T; out[n] = (Rf, pb2 - Rf @ pl, dkn); todo = True
        return out

    @staticmethod
    def body(P, mid, b):
        Rf, pf, dk = P[mid]; return Rf @ dk.xmat[b].reshape(3, 3), pf + Rf @ dk.xpos[b]


def group_of(w, locks, mid):
    g = {mid}; grew = True
    while grew:
        grew = False
        for lk in locks:
            (dm, _), recv = docking_of(lk); rm = recv.split('_')[0]
            if rm in w.ids and dm in w.ids and (dm in g) != (rm in g): g |= {dm, rm}; grew = True
    return g


def preshape(w, locks, dock_mid, dock_end, target_name, log=print, standoff=None, q_init=None):
    """joint targets for every module of the docking module's group so its end stands HOVER_FAR in front of the target,
    pads over gaps, everything kept on/above the floor and near where it is (least squares on the nominal model).
    standoff = pad tip to seat distance (m; None = the brain's hover); q_init = {module: q} to start from (default: now)"""
    m, d = w.m, w.d; w._refresh_rx(); RX = next(x for x in w.rx if x['name'] == target_name)
    grp = sorted(group_of(w, locks, dock_mid)); floor_locked = [L['b']['module'] for L in locks if 'floor' in L['a'] and L['b']['module'] in grp]
    tgt_mod = RX.get('mod'); same = tgt_mod in grp
    root = floor_locked[0] if floor_locked else (tgt_mod if same else dock_mid)
    G = GroupFK(w, grp, root, locks)
    dt_ = mujoco.MjData(m); tau = np.zeros(m.nv)
    def torque_pct(mid, q):
        """static servo load (% of its limit) of a STANDING module in pose q: gravity through the model (inverse dynamics, at rest)"""
        a = w.mod[mid]['root']; dt_.qpos[:] = m.qpos0; dt_.qpos[a:a + 3] = d.qpos[a:a + 3]; dt_.qpos[a + 3:a + 7] = d.qpos[a + 3:a + 7]
        dt_.qpos[np.array(w.mod[mid]['qa'])] = q; dt_.qvel[:] = 0; mujoco.mj_kinematics(m, dt_); mujoco.mj_comPos(m, dt_); mujoco.mj_rne(m, dt_, 0, tau)
        acts = w.mod[mid]['act']; dofs = [m.jnt_dofadr[m.actuator_trnid[x, 0]] for x in acts]
        return np.abs(tau[dofs]) / np.abs(m.actuator_forcerange[acts, 1])
    q0 = {mid: (np.asarray(q_init[mid], float) if q_init and mid in q_init else d.qpos[np.array(w.mod[mid]['qa'])].copy()) for mid in grp}
    movable = [mid for mid in grp if mid not in floor_locked or mid == dock_mid]
    lo = np.concatenate([m.jnt_range[[m.actuator_trnid[a, 0] for a in w.mod[mid]['act']], 0] * PLAN_RANGE for mid in movable]); hi = -lo   # a reserve for the last corrections (1 Nov: 5 joints at +-87 deg could not fix a 4 deg tilt)
    x0 = np.concatenate([q0[mid] for mid in movable])
    eb = m.body(f'{dock_mid}_End{dock_end}_LockModule').id; tip_loc = m.site_pos[w.mod[dock_mid]['end'][dock_end]['tip']]
    bodies = {mid: [b for b in range(m.nbody) if m.body(b).name.startswith(mid + '_') and m.body_mass[b] > 0.01] for mid in grp}
    P0 = G.poses(q0); z0 = {(mid, b): G.body(P0, mid, b)[1][2] for mid in grp for b in bodies[mid]}
    core = {mid: [b for b in bodies[mid] if 'End' not in m.body(b).name and 'LockRotor' not in m.body(b).name] for mid in grp}   # ends meet by design
    def unpack(x):
        qs = dict(q0); k = 0
        for mid in movable: qs[mid] = x[k:k + 7]; k += 7
        return qs
    def res(x):
        qs = unpack(x); P = G.poses(qs); Re, pe = G.body(P, dock_mid, eb); tip = pe + Re @ tip_loc; n = Re[:, 1] if dock_end == 'B' else -Re[:, 1]
        if same:
            Rt, pt = G.body(P, tgt_mod, RX['bid']); seat, z, Rr = w.rx_frame(RX, Rt, pt)
        else: seat, z, Rr = RX['seat'], RX['z'], RX['R']
        goal = seat + (RX_TOP - RX_GAP + HOVER_FAR if standoff is None else standoff) * z
        a = math.atan2(Re[:, 0] @ Rr[:, 1], Re[:, 0] @ Rr[:, 0]) - math.pi / 4; sl = (a + math.pi / 4) % (math.pi / 2) - math.pi / 4
        r = [(tip - goal) * 1000, (n + z) * 60, [sl * 40]]
        fl = []
        for mid in grp:
            for b in bodies[mid]:
                zb = G.body(P, mid, b)[1][2]; z_ref = z0[(mid, b)]
                fl.append(max(0.0, min(z_ref, 0.035) - zb) * 3000)                   # never into the floor
                if not floor_locked: fl.append(max(0.0, zb - max(z_ref, LIE_Z) - 0.02) * 300)   # a lying group stays on the floor (lifting costs torque)
        for mid in movable:                                                         # a standing module: servos must be able to HOLD the pose (< 60 %)
            if mid in floor_locked: r.append(np.maximum(0.0, torque_pct(mid, qs[mid]) - 0.6) * 400)
        for i_, ma in enumerate(grp):                                                # different modules keep apart (30 Oct: ring from the cobra drove M2 into M1)
            for mb in grp[i_ + 1:]:
                for ba in core[ma]:
                    pa = G.body(P, ma, ba)[1]
                    for bb in core[mb]: fl.append(max(0.0, 0.08 - float(np.linalg.norm(pa - G.body(P, mb, bb)[1]))) * 2000)
        r.append(fl); r.append((x - x0) * 2.0)                                      # stay near the current pose
        return np.concatenate([np.ravel(v) for v in r])
    now = float(np.linalg.norm(res(x0)[:3]))                                         # where it is now (encoders, nominal model)
    best = None
    seeds = [x0]
    for sg in (1, -1):                                                               # out-of-the-box starts: bent both ways
        s_ = x0.copy()
        for i, mid in enumerate(movable):
            for k in (1, 2, 4, 5): s_[i * 7 + k] = np.clip(s_[i * 7 + k] + sg * 0.6, lo[i * 7 + k], hi[i * 7 + k])
        seeds.append(s_)
    for s_ in seeds:
        sol = least_squares(res, np.clip(s_, lo + 1e-6, hi - 1e-6), bounds=(lo, hi), method='trf', max_nfev=120, diff_step=1e-3)
        r = sol.fun; err = float(np.linalg.norm(r[:3])); ang = float(np.linalg.norm(r[3:6]) / 60)
        if best is None or err + 300 * ang < best[0]: best = (err + 300 * ang, sol.x, err, ang)
    qs = unpack(best[1])
    log(f'  pre-shape: {"+".join(movable)} ({len(movable) * 7} joints): now {now:.0f} mm from the stand-off, plan {best[2]:.1f} mm, axis {math.degrees(best[3]):.1f} deg (nominal model)')
    return {mid: qs[mid] for mid in movable}, best[2], now


GLIDE_FAR = float(os.environ.get('GLIDE_FAR', '0.10'))   # m: smooth motion only while the end is further than this from its stand-off
LIFT_ENDS = float(os.environ.get('LIFT_ENDS', '0'))   # m: lying connectors rise this much at the stand-off (0 = off)
LOOKAHEAD = os.environ.get('LOOKAHEAD', '0') == '1'     # the real-physics look-ahead on the GPU at the stand-off
IDEAL_LEAD = math.radians(float(os.environ.get('IDEAL_LEAD_DEG', '3')))   # ideal: how far a command may run ahead of its loaded joint
ANTI_ERROR = os.environ.get('ANTI_ERROR', '0') == '1'   # pre-compensate this robot's known servo droop + deadband in every move
# VSEPR keeps relaxing locked groups when no job runs. OFF (Nischay 7 Nov): VSEPR moves the robot only in AUTOMATIC jobs (docking,
# connector snap, shape skills) - never after or during your own moves. VSEPR_IDLE=1 brings it back for experiments.
VSEPR_IDLE = os.environ.get('VSEPR_IDLE', '0') == '1'
MOVE_STEP = float(os.environ.get('MOVE_STEP', '0.035'))      # rad per 60 ms tick into the planned shape (~0.6 rad/s)
LINE_UP_DEG = float(os.environ.get('LINE_UP_DEG', '2.5'))   # max connector tilt before going in (Nischay 2 Nov: 2.5 deg)
INTEG_MAX = float(os.environ.get('INTEG_MAX', '0.08'))   # rad: cap of the catch-up push (was 0.12 and never faded)
LINE_UP_SIDE = float(os.environ.get('LINE_UP_SIDE', '0.0025'))   # m: max sideways offset before going in
LINE_UP_TURN = float(os.environ.get('LINE_UP_TURN', '3'))  # max pad rotation off the gaps before going in (Nischay 2 Nov: 3 deg)
GO_IN_MAX = float(os.environ.get('GO_IN_MAX', '0.003'))   # m per 60 ms tick: fastest going in (far from the seat)
GO_IN_STEP = float(os.environ.get('GO_IN_STEP', '0.0005'))     # m per 60 ms tick straight in (Nischay: slowly; was 1.5 mm)
LOCK_SLACK = (0.1, 0.1)   # mm, deg: a closed lock may sit anywhere in its printed slack; beyond = being forced (VSEPR stops)
SETTLE_S = float(os.environ.get('SETTLE_S', '1.0'))   # s of physics run unseen at the start (the drop onto the floor)
PLAN_RANGE = float(os.environ.get('PLAN_RANGE', '0.9'))   # plans use at most this share of each joint's range
SERVO_IDEAL_NM = 50 * 0.0980665   # 50 kg.cm: the ideal robot's servos (Nischay 2 Nov)
LOCK_WIGGLE = float(os.environ.get('LOCK_WIGGLE', '0.6'))   # deg: jiggle the end's 3 joints while a blocked lock rotor turns (0 = off)
RESEAT_BACK = float(os.environ.get('RESEAT_BACK', '0.002'))   # m: a blocked lock rotor backs the end out this far to re-centre (0 = off)
RESEAT_SIDE = float(os.environ.get('RESEAT_SIDE', '0.4'))   # mm: centred this well before pressing in again
STANDOFF_NEAR = float(os.environ.get('STANDOFF_NEAR', '0.02'))   # m: the closer stand-off when the docker cannot reach the normal one (coop_connect)
STANDOFF_M = 0.04          # = studio/src/robotics/msrr2/approach.ts STANDOFF_M: 40 mm leaves 31 mm of clear air between pad tops


class GpuPeer:
    """the session's GPU copy of the world (gpu_world.GPUWorld, randomize=False = THIS robot), built in the background and
    rebuilt when the locks change; all GPU work runs on this helper's own thread (one CUDA context user)"""
    N = 17                                     # 8 joints x (+,-) + the unchanged command

    def __init__(self, w, log):
        self.w, self.log, self.G, self.key, self.want = w, log, None, None, None
        self.q = queue.Queue(); threading.Thread(target=self._run, daemon=True).start()

    def ensure(self, key):
        if key != self.want: self.want = key; self.q.put(('build', key))

    def ready(self, key): return self.G is not None and self.key == key

    def job(self, fn, timeout=20.0):
        box = queue.Queue(maxsize=1); self.q.put(('job', (fn, box)))
        try: return box.get(timeout=timeout)
        except queue.Empty: return None

    def _run(self):
        while True:
            kind, arg = self.q.get()
            try:
                if kind == 'build':
                    if arg != self.want: continue                     # a newer lock state is already wanted
                    from gpu_world import GPUWorld
                    t0 = time.time(); self.G = None
                    # copies WITHOUT room noise (else '+nudge' minus '-nudge' is half shaking) and with the CPU world's friction
                    # solver (noslip 3, as phys_world): friction is exactly what the look-ahead must predict (1 Nov: it diverged)
                    import disturb as DIST_; on0, ns0 = DIST_.ON, os.environ.get('NOSLIP'); DIST_.ON = False; os.environ['NOSLIP'] = os.environ.get('LA_NOSLIP', '0')   # 0: 5x faster, predicted as well (measured 1 Nov)
                    try:
                        with contextlib.redirect_stdout(io.StringIO()): G = GPUWorld(self.w, self.N, randomize=False)
                    finally:
                        DIST_.ON = on0
                        if ns0 is None: os.environ.pop('NOSLIP', None)
                        else: os.environ['NOSLIP'] = ns0
                    self.G, self.key = G, arg; self.log(f'  (look-ahead ready: GPU copy of this robot built in {time.time() - t0:.0f} s)')
                else:
                    fn, box = arg; box.put(fn(self.G) if self.G is not None else None)
            except Exception as e:
                self.log(f'  (look-ahead error: {type(e).__name__}: {e})')
                if kind == 'job': arg[1].put(None)

# ---------- the live session ----------
class Manual:
    def __init__(self, scene, seed=1, randomize=True, disturb=True, fps=25, judge='off', pace=True, log=None, ideal=False):
        self.scene = scene; self.anchors = list(scene.get('anchors', [])); ids = [mm['id'] for mm in scene['modules']]
        init = [canon(l['a'], l['b']) for l in scene.get('locks', [])]
        old = DIST.ON; DIST.ON = bool(disturb)
        try:
            # ideal (Nischay 2 Nov: 'forget all errors'): the flex / gear-play joints are left out of the model (rigid=True)
            self.w = w = PhysWorld(ids, self.anchors, randomize=randomize, seed=seed, locks=all_locks(ids, self.anchors) + init, rigid=bool(ideal))
        finally: DIST.ON = old
        # the surface the floor connectors are on (Nischay 7 Nov: walls, ceilings, slopes): 0 = floor, 90 = wall, 180 = ceiling. Only
        # gravity turns - sag, magnets, servo loads, falling, the real-robot correction and the IMU all follow from the physics. The
        # split copy is built from the same scene, so it gets the same gravity. ('Stay close to the floor' rules mean the surface.)
        sd = math.radians(float(scene.get('surface_deg', os.environ.get('SURFACE_DEG', 0.0))))
        if sd:
            g = w.m.opt.gravity.copy(); c, s_ = math.cos(sd), math.sin(sd)
            w.m.opt.gravity[:] = [g[0], c * g[1] - s_ * g[2], s_ * g[1] + c * g[2]]   # turned about the floor's x axis
        self.surface_deg = math.degrees(sd)
        self.ideal = bool(ideal)
        if self.ideal:          # with randomize/disturb off
            m_ = w.m
            # 2 Nov: no contact friction (floor, parts sliding). The servos' own gearbox friction stays: it is part of the motor and
            # damps each joint - without it every servo rang like a spring and the frictionless chain swung like a pendulum
            m_.eq_solref[:] = [0.002, 1.0]                                    # rigid lock welds (soft ones stretched under load)
            # ...and HARD for the contact solver: it must see a locked group as one body, or a floor push on the far module is sized
            # for that module alone and it sank 10 mm (2 Nov, M1.A -> M2.S2B). (the exact pass then removes what is left)
            m_.eq_solimp[:] = [0.99, 0.999, 0.001, 0.5, 2.0]
            # (contacts keep MuJoCo's normal stiffness: 'as hard as possible' + ~190 fin contacts per lock + exact joints blew the
            # solver up at the first move, 2 Nov)
            # REAL friction (8 Nov, Nischay: real physics, no shortcuts). It was 20 %: with real friction the no-slip pass fought the exact
            # joints (slow, then the sim blew up) - so the no-slip pass is off instead. At 20 % the base slid and Cobra leaned 49 deg
            # (NOT reached); real friction + no no-slip: Cobra DONE, 15 deg. (Also what the GPU look-ahead has: no no-slip solver there.)
            m_.geom_friction[:, 0] *= float(os.environ.get('IDEAL_FRIC', '1.0'))
            m_.opt.noslip_iterations = int(os.environ.get('IDEAL_NOSLIP', '0'))
            # ideal servos: 50 kg.cm (Nischay 2 Nov; the real ST3215 is 2.7 N.m) - the load % is reported against this. Their angle is
            # set exactly every step (phys_world._exact); the 5x stiffer motor only keeps the physics step close to it
            A0_ = w.all_act[np.arange(len(w.all_act)) % 9 < 7]; D0_ = m_.jnt_dofadr[m_.actuator_trnid[A0_, 0]]
            w._phys_servo = dict(act=A0_.copy(), dof=D0_.copy(), gain=m_.actuator_gainprm[A0_, 0].copy(), bias=m_.actuator_biasprm[A0_, 1:3].copy(), arm=m_.dof_armature[D0_].copy())   # 12 Nov: free modules keep these (PhysWorld._floor_held)
            A_ = w.all_act; m_.actuator_gainprm[A_, 0] *= 5; m_.actuator_biasprm[A_, 1] *= 5; m_.actuator_biasprm[A_, 2] *= 2.2
            arm_ = A_[np.arange(len(A_)) % 9 < 7]; m_.actuator_forcerange[arm_] = [-SERVO_IDEAL_NM, SERVO_IDEAL_NM]; w.fr0 = m_.actuator_forcerange[A_, 1].copy()
            # the solver must SEE these joints as locked, or a floor push turns the joint (then undone) instead of lifting the robot,
            # and the links sank through the floor (2 Nov): a huge rotor inertia sends every push to the whole rigid shape
            m_.dof_armature[m_.jnt_dofadr[m_.actuator_trnid[arm_, 0]]] = 100.0
        w.place(dict(scene, locks=init)); self.cur = list(init); self.seed, self.judge, self.pace, self.disturb = seed, judge, pace, disturb
        if self.ideal:
            w.exact = True                                                    # joints = commands, locks rigid, exactly (phys_world._exact)
            # ...so the motor model is OFF: its damping fought the speed set on the joint every step and its reaction spun the bodies
            # up (2 Nov: +3 %/ms until the sim blew up). The joint still carries every load: the solver sees it rigid (inertia above)
            arm_ = w.all_act[np.arange(len(w.all_act)) % 9 < 7]; m_ = w.m
            m_.actuator_gainprm[arm_, 0] = 0.0; m_.actuator_biasprm[arm_, 1:3] = 0.0
        self.traj, self.marks, self.paused, self.replaying, self._last_j = [], [], False, False, 0.0   # what the robot did: for step back / home
        # settle BEFORE anything is shown (2 Nov, Nischay: at start the robot and its connector dots fell / jumped): placed from the
        # Studio's pose it drops the last cm onto the floor and its locks sit into their slack - done here, unseen
        # (frame0 stays the NOMINAL pose: the Studio lines each mesh up with its body on it; the clock restarts at 0 after the settle:
        # the Studio finds frames by time x fps)
        w.rec = None; w.run(SETTLE_S); w.d.time = 0.0
        for k_ in list(w.lock_t0): w._store_lock_pose(k_)
        w.lock_t0.clear()
        self.fps = fps; self.frame0 = w.nominal_poses; w.rec = {'dt': 1.0 / fps, 'last': -1.0, 'frames': []}
        w.glide = bool(ideal) and os.environ.get('GLIDE', '1') == '1'                         # smooth joint motion between control ticks (phys_world.run); off until DIK models the body's push-back (2 Nov: on, the 3-ring hovered 75-120 mm out)
        w.rec_extra = self._port_points                                       # every frame carries its connector dots: drawn in step with the robot
        self.q = queue.Queue(); self.job = None; self.lines = []; self.alive = True; self.abort = False; self._log = log
        self.sync = None; self.drag = None; self.recorder = None        # recorder(dict) each docking tick: teacher data (teacher_dik.py)
        self.policy = None                                              # policy(dict) -> joint step: a trained model drives instead of DIK (teacher_bc.py try)
        self.wall0, self.sim0 = time.time(), float(w.d.time); w.on_tick = self._tick
        self._rec()
        self.gpu = GpuPeer(self.w, self.log) if LOOKAHEAD else None
        if self.gpu: self.gpu.ensure(frozenset(lock_key(L) for L in self.cur))
        self.th = threading.Thread(target=self._loop, daemon=True)
        if pace: self.th.start()

    def log(self, s):
        self.lines.append(f'{self.w.d.time:6.1f}s {s}'); del self.lines[:-200]
        if self._log: self._log(s)

    def _rec(self):
        """remember the servo commands + locks whenever they change (every 0.1 s of physics): played backwards for step back / home"""
        if self.replaying: return
        tg = self.w.tgt.copy(); lk = frozenset(lock_key(L) for L in self.cur)
        if self.traj and lk == self.traj[-1][2] and float(np.max(np.abs(tg - self.traj[-1][1]))) < math.radians(0.3): return
        self.traj.append((float(self.w.d.time), tg, lk)); del self.traj[:-20000]

    def mark(self, label):
        self._rec(); self.marks.append((len(self.traj) - 1, label))

    def _tick(self):
        if self.abort: self.abort = False; raise Abort()
        if self.sync: self.sync.tick()
        tw = getattr(self.sync, 'twin', None)
        # split view: the ideal robot waits for the real copy (slower than real time), so both halves show the same moment
        while tw is not None and tw.alive and self.alive and not self.abort and tw.behind() > 0.3 and not self.sync.on: time.sleep(0.01)
        self._rec()
        while self.paused and not self.abort and self.alive: time.sleep(0.05); self.wall0 = time.time() - (float(self.w.d.time) - self.sim0)
        if self.pace:
            ahead = (float(self.w.d.time) - self.sim0) - (time.time() - self.wall0)
            if ahead > 0: time.sleep(min(ahead, 0.2))
            elif ahead < -1.0: self.wall0 = time.time() - (float(self.w.d.time) - self.sim0)   # fell behind (slow PC): don't race to catch up

    def _loop(self):
        while self.alive:
            try: cmd = self.q.get_nowait()
            except queue.Empty: cmd = None
            if not cmd and self.paused: time.sleep(0.05); continue
            try:
                if cmd: self.job = cmd['kind']; self.do(cmd)
                else:
                    if self.drag: self._drag_tick(); continue
                    if VSEPR_IDLE and time.time() - self._last_j > 5.0: self._vsepr_idle()
                    if self.gpu: self.gpu.ensure(frozenset(lock_key(L) for L in self.cur))
                    self.w.run(0.06)
            except Abort: self.log('job stopped')
            except Exception as e: self.log(f'ERROR {type(e).__name__}: {e}')
            finally:
                if cmd: self.job = None

    # ---- commands ----
    def joints(self, mid, js):
        if time.time() - self._last_j > 1.5: self.mark(f'joints {mid}')       # a burst of slider moves = one step
        self._last_j = time.time(); i = self.w.ids.index(mid)
        for j, deg in js.items():                                     # L1 / L2 = the lock rotors (Nischay 5 Nov: sliders to check their direction on the real robot)
            k = 7 if j == 'L1' else 8 if j == 'L2' else JN.index(j)
            self.w.tgt[i * 9 + k] = math.radians(float(np.clip(deg, -45, 45)) if k >= 7 else float(deg))

    def do(self, cmd):
        k = cmd['kind']
        if k in ('lock', 'unlock', 'connect', 'skill'): self.mark(f"{k} {cmd.get('name') or cmd.get('a', '') + ' ' + cmd.get('b', '')}")
        if k == 'back': return self.replay(self.marks[-1][0] if self.marks else 0, 'step back')
        if k == 'home': return self.go_home()
        if k == 'save': return self.save_slot()
        if k == 'restore': return self.restore_slot()
        if k == 'lock': self.lock(cmd['a'], cmd['b'])
        elif k == 'unlock': self.unlock(cmd['a'], cmd['b'])
        elif k == 'connect': self.connect(cmd['a'], cmd['b'])
        elif k == 'skill': self.skill(cmd['name'])

    def replay(self, to, label):
        """play what the robot did BACKWARDS down to traj[to], at the speed it was done: locks closed on the way open again,
        locks opened are closed again (lock if seated, else the docking brain connects them). Real physics all the way."""
        w = self.w
        if to >= len(self.traj) - 1: return self.log(f'{label}: nothing to undo')
        self.log(f'{label}: playing {len(self.traj) - 1 - to} recorded commands backwards'); self.replaying = True
        try:
            for i in range(len(self.traj) - 1, to - 1, -1):
                t_i, tg, lk = self.traj[i]; now = {lock_key(L) for L in self.cur}
                for k in now - lk: a, b = k.split('|'); self.unlock(a, b)
                for k in lk - now:
                    a, b = k.split('|')
                    if not self.lock(a, b): self.connect(a, b)
                for m_ in range(len(w.ids)): w.tgt[m_ * 9:m_ * 9 + 7] = tg[m_ * 9:m_ * 9 + 7]
                w.run(min(0.6, max(0.06, (t_i - self.traj[i - 1][0]) if i > to else 0.3)))
            w.run(1.0)
        finally:
            self.replaying = False
        self.traj = self.traj[:to + 1]; self.marks = [m for m in self.marks if m[0] < to]
        self.log(f'{label}: done, locks {[lock_key(L) for L in self.cur]}')

    def save_slot(self):
        self.slot = os.path.join(tpath('logs/ckpt'), f'manual_slot_{id(self)}.pkl'); self.w.save(self.slot, extra=dict(cur=self.cur))
        self.log(f'state saved (t {self.w.d.time:.1f} s, locks {[lock_key(L) for L in self.cur]})')

    def restore_slot(self):
        if not getattr(self, 'slot', None): return self.log('nothing saved yet')
        old = DIST.ON; DIST.ON = bool(self.disturb)
        try: w, ex = PhysWorld.load(self.slot)
        finally: DIST.ON = old
        w.rec = {'dt': 1.0 / self.fps, 'last': -1.0, 'frames': []}; w.on_tick = self._tick
        w.comfort = getattr(self.w, "comfort", None)                        # a restored world moves as smoothly as before
        self.w = w; self.cur = list(ex["cur"]); self.traj, self.marks = [], []; self._rec()
        self.wall0, self.sim0 = time.time(), float(w.d.time)
        self.log(f'state restored (t {w.d.time:.1f} s, locks {[lock_key(L) for L in self.cur]})')

    def skill(self, name):
        """become a shape with the robot's OWN skills, live in real physics (floor_skills.py: the blind brain - encoders + IMU)"""
        import floor_skills as FS
        w = self.w; n = len(w.ids)
        if name == 'straight':
            # Nischay 1 Nov: it snapped straight at full servo speed out of a just-unlocked ring. Now as a real undock: any end
            # still sitting in a connector slides straight out first, then every joint goes to 0 smoothly, together
            # a closed loop of module-to-module locks (a ring) cannot go straight: say which lock to open instead of fighting it (5 Nov)
            par = {m_: m_ for m_ in w.ids}
            def root(x):
                while par[x] != x: x = par[x]
                return x
            for L_ in self.cur:
                if 'module' not in L_['a'] or 'module' not in L_['b']: continue
                ra, rb = root(L_['a']['module']), root(L_['b']['module'])
                if ra == rb: return self.log(f'straighten: NOT possible - lock {lock_key(L_)} closes a ring; unlock it first (click it in the locked list)')
                par[ra] = rb
            for (mid_, e_, rx_) in self.plugged()[:4]: self.unplug(mid_, e_, rx_)
            worst = self.drive_to({mid: np.zeros(7) for mid in w.ids})
            self.log(f'straighten: every joint to 0, smoothly (worst {worst:.0f} deg off)'); return
        if name == 'ring':                                            # the ring is made from a chain lying flat: go home first if it isn't
            bent = max(float(np.max(np.abs(w.d.qpos[np.array(w.mod[mid]['qa'])]))) for mid in w.ids) > math.radians(15)
            if bent and len(self.traj) > 1: self.log('ring starts from lying flat: home first'); self.go_home()
            elif bent: self.log('ring: the chain is not lying flat and there is nothing to play back - Reset first'); return
            return self.connect('M1.A', f'M{n}.B')
        B = FS.Brain(w, self.seed, log=self.log)
        if name == 'crawl_test':
            # 12 Nov: the brain crawled ~21 mm/s, the Isaac module ~3 mm/s on the same commands. A gait test on its own: CRAWL_MOD does
            # CRAWL_WAVES waves (FS.wave, along or CRAWL_SIDE=1); WAVE_AMP / WAVE_PERIOD / WAVE_SIDE override the gait. Logs the
            # brain's move per wave; Isaac's 'isaac_vs_brain' then says how much of it the real shapes do
            mid = os.environ.get('CRAWL_MOD', w.ids[-1]); side = os.environ.get('CRAWL_SIDE', '0') == '1'
            for k_, v_ in (('WAVE_PERIOD', 'WAVE_PERIOD_S'), ('WAVE_SIDE', 'WAVE_SIDE_DEG')):
                if os.environ.get(k_): setattr(FS, v_, float(os.environ[k_]))
            amp = float(os.environ.get('WAVE_AMP', FS.WAVE_AMP_DEG)); sgn = int(os.environ.get('CRAWL_SIGN', '1'))
            if os.environ.get('CRAWL_ALIGN', '1') == '1': B.align(mid, 'T2', 'horizontal')
            base = B.cmd[mid].copy(); p0 = w.d.xpos[w.m.body(f'{mid}_Spine1_B1B2').id][:2].copy(); p = p0
            for k_ in range(int(os.environ.get('CRAWL_WAVES', '6'))):
                FS.wave(B, mid, sgn, side, base, amp=amp); p = w.d.xpos[w.m.body(f'{mid}_Spine1_B1B2').id][:2]
                self.log(f'  crawl_test wave {k_ + 1}: brain moved {np.linalg.norm(p - p0) * 1000:.0f} mm, bends lifting {1 - B.bend_vertical(mid):.2f}')
            return self.log(f'crawl_test: DONE {mid} {np.linalg.norm(p - p0) * 1000:.0f} mm in the brain (amp {amp:.0f}, period {FS.WAVE_PERIOD_S:.1f} s)')
        r = FS.cobra_auto(B, 'M1', 'M2', log=self.log) if name == 'cobra' else FS.twohead(B, log=self.log)
        self.log(f"{name}: {'DONE' if r.get('ok') else 'NOT reached'} (scored by physics truth) {json.dumps({k: v for k, v in r.items() if k not in ('servo',)})[:220]}")

    def _true_align(self, dm, de, tname, offset, rounds=6, frames=3):
        """at the stand-off: line the connectors up with the REAL physics as the model (Nischay 1 Nov: 'the sim knows everything,
        ask it'). Each round: the 8 joints nearest the two connectors are nudged +/- in GPU copies of this exact world, 0.3 s
        ahead; the connector's real response (friction, sag, play, magnets, contacts included) gives the true Jacobian; the
        correction is applied for real; repeat until lined up. Returns True if lined up."""
        w = self.w; key = frozenset(lock_key(L) for L in self.cur)
        if not (self.gpu and self.gpu.ready(key)): self.log('  (look-ahead not ready yet - still building the GPU copy)'); return False
        G = self.gpu.G; ends = G.ends; ie = next(i for i, (_, mid, e) in enumerate(ends) if mid == dm and e == de); ir = G.rnames.index(tname)
        joints = [(dm, k) for k in (range(3, 7) if de == 'B' else range(0, 4))]
        tm, te = tname.split('.')[0], tname.split('.')[1]
        if te in ('A', 'B'): joints += [(tm, k) for k in (range(3, 7) if te == 'B' else range(0, 4))]
        tix = np.array([w.ids.index(mid) * 9 + k for mid, k in joints]); delta = math.radians(1.5); lay = G.layout(); sgn = -1.0 if de == 'A' else 1.0
        def resid(S):
            tip = S[:, lay['tip']].reshape(len(S), -1, 3)[:, ie]; Re = S[:, lay['emat']].reshape(len(S), -1, 3, 3)[:, ie]
            seat = S[:, lay['seat']].reshape(len(S), -1, 3)[:, ir]; z = S[:, lay['z']].reshape(len(S), -1, 3)[:, ir]
            n = sgn * Re[:, :, 1]; goal = seat + offset * z
            return np.concatenate([(tip - goal) * 1000, np.degrees(np.cross(n, -z))], 1)          # mm and deg, equal weight
        def real():                                                   # the CPU world's own error right now (truth)
            R_ = next(x for x in w.rx if x['name'] == tname); E_ = w.mod[dm]['end'][de]; w._refresh_rx(); R_ = next(x for x in w.rx if x['name'] == tname)
            tip = w.d.site_xpos[E_['tip']]; n = sgn * w.d.xmat[E_['body']].reshape(3, 3)[:, 1]
            return np.r_[(tip - (R_['seat'] + offset * R_['z'])) * 1000, np.degrees(np.cross(n, -R_['z']))]
        step_max = math.radians(1.5)
        for k in range(rounds):
            e_now = real()
            if np.linalg.norm(e_now[:3]) < 3 and np.linalg.norm(e_now[3:]) < LINE_UP_DEG:
                self.log(f'  lined up with the real-physics look-ahead ({k} corrections)'); return True
            base = w.tgt.copy(); C = np.repeat(base[None], G.N, 0)
            for j in range(len(tix)): C[1 + 2 * j, tix[j]] += delta; C[2 + 2 * j, tix[j]] -= delta
            t0 = time.time()
            S = self.gpu.job(lambda G_: (G_.load_from(w), G_.try_targets(C, frames))[1])
            if S is None: self.log('  (look-ahead failed - continuing without it)'); return False
            r = resid(S); r0 = r[0]; J = (r[1::2] - r[2::2]).T / (2 * delta)                  # (6, joints): the TRUE response
            dq = -J.T @ np.linalg.solve(J @ J.T + 5.0 * np.eye(6), r0); dq *= min(1.0, step_max / max(np.abs(dq).max(), 1e-9))
            # the step size is chosen on the GPU too: the correction x 0 .. 2 in parallel copies, the best PREDICTED wins
            # (replaces trying it for real on the slow CPU and undoing it: that was most of the 5-11 s per round)
            sc = np.array([0.0, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0]); C2 = np.repeat(base[None], G.N, 0)
            for i, f in enumerate(sc): C2[i, tix] = base[tix] + f * dq
            S2 = self.gpu.job(lambda G_: (G_.load_from(w), G_.try_targets(C2, frames))[1])
            if S2 is None: return False
            r2 = resid(S2)[:len(sc)]; score = np.linalg.norm(r2[:, :3], axis=1) + np.linalg.norm(r2[:, 3:], axis=1); b = int(np.argmin(score))
            self.log(f'  look-ahead round {k + 1}: real {np.linalg.norm(e_now[:3]):.1f} mm / {np.linalg.norm(e_now[3:]):.1f} deg; best step x{sc[b]:g} -> predicted {np.linalg.norm(r2[b, :3]):.1f} mm / {np.linalg.norm(r2[b, 3:]):.1f} deg ({(time.time() - t0) * 1000:.0f} ms on the GPU)')
            if b == 0: return False                                    # no step helps: stop, the normal steering continues
            w.tgt[tix] = base[tix] + sc[b] * dq; w.run(frames * 0.06)
        return False

    def set_drag(self, end, p):
        """drag tip to move (the Studio's shared Drag tip switch): end = 'M1.A', p = where the mouse is (Studio metres) or None = let go"""
        self._last_j = time.time()
        if p is None or not end: self.drag = None; return
        mid, e = end.split('.'); pt = C @ np.asarray(p, float); w = self.w
        if not (self.drag and self.drag['end'] == end):
            from dik import DIK
            mods = sorted(group_of(w, self.cur, mid))
            # the anchor = the part of the robot furthest from the dragged end: it is meant to stay, the mouse is read relative to it
            tip = w.d.site_xpos[w.mod[mid]['end'][e]['tip']]
            parts = [f'{m_}_{b_}' for m_ in mods for b_ in ('EndA_LockModule', 'T2_Ring_B3Fork', 'EndB_LockModule') if not (m_ == mid and b_.startswith('End' + e))]
            anchor = max(parts, key=lambda n_: float(np.linalg.norm(w.d.xpos[w.m.body(n_).id] - tip)))
            dik = DIK(w, mods, (mid, e), None, {m_: 0 for m_ in mods}, anchor=anchor); dik.relax_on = False
            dik.spread = None                       # your hand moves it: no VSEPR spreading the other joints (Nischay 7 Nov: VSEPR = auto only)
            # your hand decides the dragged module's height (5 Nov: 'keep the middle parts low' held it down - an upward drag only slid
            # the chain along the floor); the other modules still stay low
            dik.low = [t for t in dik.low if not t.frame_name.startswith(mid + '_')]
            self.mark(f'drag {end}'); self.drag = dict(end=end, dik=dik, mods=mods)
        dik = self.drag['dik']; b = w.m.body(dik.tbody).id
        dik.point = w.d.xmat[b].reshape(3, 3).T @ (pt - w.d.xpos[b])               # the mouse, in the anchor's frame
        dik.point_world = np.asarray(pt, float).copy()                            # ...used as a fixed point in the room (DIK._target)

    def _drag_tick(self):
        """one 60 ms step of the drag: DIK moves the tip toward the mouse, VSEPR shapes the rest (its null space), physics decides"""
        w = self.w; D = self.drag; dik = D['dik']
        self._drag_twist(D)
        vel, _, _ = dik.step(0.06); dq = np.concatenate([vel[m_] for m_ in D['mods']]) * 0.06
        mx = np.abs(dq).max(); dq = dq * (0.035 / mx) if mx > 0.035 else dq
        tix = np.array([w.ids.index(m_) * 9 + k for m_ in D['mods'] for k in range(7)]); qadr = np.array([qa for m_ in D['mods'] for qa in w.mod[m_]['qa']])
        dofs = [dof for m_ in D['mods'] for dof in w.mod[m_]['dofs']]; lo, hi = w.m.jnt_range[[w.m.dof_jntid[x] for x in dofs]].T * 0.97
        q = w.d.qpos[qadr]; w.tgt[tix] = np.clip(q + (dq if self.ideal else dq * 2.0), lo, hi)
        w.run(0.06)

    def _drag_twist(self, D):
        """twist first (5 Nov: a lying module bends only flat along the floor; pulled up, its tip has no way up the step-by-step
        solver can see - straight out, a twist does not move the tip at all - so it slid sideways and lifted 18 mm of 120): when the
        mouse pulls out of the module's bend plane, turn the twist at the far end (T1 for End B, T3 for End A) so the bend plane
        faces the mouse, 3 deg per tick at most. Then DIK bends it there."""
        w = self.w; d = w.d; m = w.m; mid, e = D['end'].split('.'); dik = D['dik']
        if dik.point is None: return
        target = np.asarray(dik.point_world, float)
        tip = d.site_xpos[w.mod[mid]['end'][e]['tip']]; dv = target - tip; n = float(np.linalg.norm(dv))
        if n < 0.02: return
        dh = dv / n; acts = w.mod[mid]['act']; k = 0 if e == 'B' else 6
        u = d.xaxis[m.actuator_trnid[acts[k], 0]]; a = d.xaxis[m.actuator_trnid[acts[2], 0]]   # the twist's axis, a bend's axis (B2)
        if abs(float(a @ dh)) < 0.5: return                           # the mouse is (mostly) in the bend plane: bending reaches it
        phi = math.atan2(-float(a @ dh), float(np.cross(u, a) @ dh))   # turn that puts the bend axis across the pull
        if abs(phi) > math.pi / 2: phi -= math.copysign(math.pi, phi)  # the bend plane is the same either way round: the short turn
        i = w.ids.index(mid); lo, hi = m.jnt_range[m.actuator_trnid[acts[k], 0]] * 0.97
        w.tgt[i * 9 + k] = float(np.clip(w.tgt[i * 9 + k] + np.clip(phi, -0.05, 0.05), lo, hi))

    def _vsepr_idle(self):
        """VSEPR as part of the physics (dik.VseprIdle): every locked group keeps relaxing toward a lower VSEPR score, locks kept
        closed, along the floor, slowly; paused 5 s after a hand move so it never fights the user"""
        from dik import VseprIdle
        # 7 Nov (Nischay: "the ideal robot is swinging"): it rolled a just-started lying chain at up to 200 mm/s for a <=4 deg gain,
        # then again every ~7 s. Now: nothing before your first action, and after a try with no real gain it rests until you act again
        if not self.marks: return
        w = self.w; key = frozenset(lock_key(L) for L in self.cur)
        if getattr(self, '_idle_key', None) != key:
            self._idle_key, self._idle, seen = key, [], set()
            for k_ in list(w.engaged): w._store_lock_pose(k_)               # zero points for the idle VSEPR (never re-taken: it cannot creep a lock open)
            for mid in w.ids:
                if mid in seen: continue
                g = sorted(group_of(w, self.cur, mid)); seen |= set(g)
                if len(g) > 1: self._idle.append(VseprIdle(w, g))
        for R in self._idle:
            # rest when there is nothing worth improving (2 Nov: a straight chain is already spread; endless tiny nudges shook it):
            # if the score fell < 0.2 % over the last 2 s, send nothing until the next action of yours (a new mark; was: 5 s)
            now = float(w.d.time); E_ = vsepr.energy(w.d.xpos[R.bodies]); hist = getattr(R, 'hist', [])
            if getattr(R, 'rest_mark', -1) == len(self.marks): continue
            hist = [h for h in hist if now - h[0] <= 2.0] + [(now, E_)]; R.hist = hist
            if now - hist[0][0] >= 1.9 and hist[0][1] - E_ < 0.002 * hist[0][1]: R.rest_mark = len(self.marks); R.hist = []; continue
            # VSEPR is like gravity (Nischay 2 Nov): it pushes toward the rounder shape, but a lock - like a floor - stops it, it
            # never forces through. A step that moved any closed lock beyond its slack is taken back, and it rests
            dr = w.lock_drift()
            if getattr(R, 'last', None) and any(mm > LOCK_SLACK[0] or deg > LOCK_SLACK[1] for mm, deg in dr.values()):
                for i, dq in R.last: w.tgt[i:i + 7] -= dq
                R.last = None; R.rest_mark = len(self.marks); R.hist = []; continue
            v = R.step()
            if not v: continue
            R.last = []
            for mid, vel in v.items():
                i = w.ids.index(mid) * 9; w.tgt[i:i + 7] += vel * 0.06; R.last.append((i, vel * 0.06))   # the target creeps, so a held load never sags it

    def _droop(self, acts):
        """how far each servo will sit short of its command under its STATIC load: gravity on that joint (the model's bias force,
        this robot's own masses) / this robot's own servo stiffness, capped at 3 deg. NOT the measured servo torque: that is the
        servo's present error, and adding it back made the commands creep away without limit (1 Nov: the 3-ring flew open)"""
        w = self.w; m, d = w.m, w.d
        dof = np.array([m.jnt_dofadr[m.actuator_trnid[a, 0]] for a in acts])
        return np.clip(d.qfrc_bias[dof] / np.maximum(m.actuator_gainprm[acts, 0], 1e-6), -math.radians(3), math.radians(3))

    def drive_to(self, goal, max_s=12.0):
        """every joint of `goal` ({module: q}) moves together, smoothly (MOVE_STEP per tick, the biggest move sets the pace),
        pushing through floor friction (command a little ahead); until within 3 deg or max_s. Returns the worst error (deg)"""
        w, d = self.w, self.w.d
        pix = np.array([w.ids.index(mid) * 9 + k for mid in goal for k in range(7)]); pq = np.array([qa for mid in goal for qa in w.mod[mid]['qa']])
        goalq = np.concatenate([np.asarray(goal[mid], float) for mid in goal])
        acts = np.array([a for mid in goal for a in w.mod[mid]['act']]); m = w.m; best, since = 1e9, 0
        for _ in range(int(max_s / 0.06)):
            qn = d.qpos[pq]; dd = goalq - qn; worst = float(np.abs(dd).max())
            if worst < math.radians(3): break
            # stuck = no progress for 1 s: stop and say which joint (1 Nov: it pushed one joint 15 deg short for 12 s, nothing visible)
            if worst < best - math.radians(0.5): best, since = worst, 0
            else:
                since += 1
                if since > 16: break
            step = dd * min(1.0, MOVE_STEP / worst)
            if ANTI_ERROR:                                           # the same pre-compensation as the approach: servo droop + deadband
                w.tgt[pix] = qn + step + self._droop(acts)
            else: w.tgt[pix] = qn + step * 2.0
            w.run(0.06)
        w.tgt[pix] = goalq + (self._droop(acts) if ANTI_ERROR else 0.0)
        err = np.abs(goalq - d.qpos[pq]); k = int(np.argmax(err)); mids = [mid for mid in goal for _ in range(7)]
        if err[k] > math.radians(3):
            load = abs(d.actuator_force[acts[k]]) / max(abs(m.actuator_forcerange[acts[k], 1]), 1e-6)
            self.log(f'  {mids[k]}.{JN[k % 7]} stopped {math.degrees(err[k]):.0f} deg short of the plan (servo at {load * 100:.0f} % of its torque: ' + ('too heavy / dragging on the floor)' if load > 0.85 else 'blocked by contact or friction)'))
        return math.degrees(float(err.max()))

    def unplug(self, mid, e, rx_name, out=0.05):
        """the reverse of a dock (approach.ts: straight out first, then the bend): the end slides out along the connector's
        axis to `out` (m), slowly, its group's joints keeping it on the axis (DIK)"""
        from dik import DIK
        w = self.w; grp = sorted(group_of(w, self.cur, mid)); r = w.end_vs(mid, e, rx_name)
        dk = DIK(w, grp, (mid, e), rx_name, {mid: 0}, offset=max(r['axial_mm'] / 1000, 0.0)); dk.spread = None; dk.relax_on = False
        qadr = np.array([qa for x in grp for qa in w.mod[x]['qa']]); tix = np.array([w.ids.index(x) * 9 + k for x in grp for k in range(7)])
        while dk.offset < out:
            dk.offset = min(dk.offset + GO_IN_STEP * 2, out); vel, _, _ = dk.step(0.06)
            dq = np.concatenate([vel[x] for x in grp]) * 0.06; mx = np.abs(dq).max(); dq = dq * (0.035 / mx) if mx > 0.035 else dq
            w.tgt[tix] = w.d.qpos[qadr] + dq * 2.0; w.run(0.06)
        self.log(f'  {mid}.{e} slid straight out of {rx_name} ({out * 1000:.0f} mm)')

    def plugged(self):
        """end connectors sitting in another connector (< 15 mm in, centred) that are NOT locked: [(module, end, receiver)]"""
        w = self.w; out = []; w._refresh_rx(); locked = {lock_key(L) for L in self.cur}
        for mid in w.ids:
            for e in ('A', 'B'):
                for R in w.rx:
                    if R.get('mod') == mid or R['name'].startswith('F:'): continue
                    try: r = w.end_vs(mid, e, R['name']); k = lock_key(canon(f'{mid}.{e}', R['name']))
                    except Exception: continue
                    if -2 < r['axial_mm'] < 15 and r['radial_mm'] < 8 and k not in locked: out.append((mid, e, R['name']))
        return out

    def lock(self, a, b, settle=2.5, L=None):
        w = self.w; L = L or canon(a, b); key = lock_key(L)
        if key in w.engaged: return self.log(f'{key} is already locked')
        (dm, de), _ = docking_of(L); rx = ref_name(L['a'])
        w.set_locks(self.cur + [L])                                   # the rotor(s) turn (end<->end: both)
        r = None
        # a blocked rotor -> WIGGLE the end (9 Nov, 45 deg seed 1: seated 0.7 mm off centre, the fin caught a pad's side wall; the
        # servos' backlash + deadband cannot centre finer than ~0.7 mm): the 3 joints next to the end circle +-LOCK_WIGGLE deg, out of
        # phase, so the end sweeps across the centre and the turning rotor slips in - peg-in-hole 'spiral search', as a hand jiggles a key
        kw = [w.ids.index(dm) * 9 + k for k in ((4, 5, 6) if de == 'B' else (0, 1, 2))]; t0w = None; base = w.tgt[kw].copy()
        for i_ in range(int(settle / 0.06)):
            w.run(0.06); r = w.end_vs(dm, de, rx)
            if abs(r['axial_mm']) < 0.8 and r['radial_mm'] < 1.5 and r['lock_deg'] > 40: break
            if LOCK_WIGGLE > 0 and not self.ideal and i_ >= 6 and r['lock_deg'] < 20:
                t0w = i_ if t0w is None else t0w; ph = (i_ - t0w) * 0.06 * 2 * math.pi * 1.5
                w.tgt[kw] = base + math.radians(LOCK_WIGGLE) * np.array([math.sin(ph), math.sin(ph + 2.1), math.sin(ph + 4.2)])
        if t0w is not None: w.tgt[kw] = base; self.log(f'  wiggled the end for {(i_ - t0w) * 0.06:.1f} s while the rotor turned')
        if r and abs(r['axial_mm']) < 0.8 and r['radial_mm'] < 1.5 and r['lock_deg'] > 40:
            L = {k_: v_ for k_, v_ in L.items() if not k_.startswith('_')}; w.engage(L); self.cur.append(L); self.log(f'LOCKED {key} (gap {r["axial_mm"]:.2f} mm, side {r["radial_mm"]:.2f} mm, rotor {r["lock_deg"]:.0f} deg)'); return True
        if os.environ.get('LOCK_DEBUG'):                               # what holds the rotor back: its contacts right now
            m_, d_ = w.m, w.d; rb = m_.body(f'{dm}_L{1 if de == "A" else 2}_LockRotor_{de}').id
            for c in d_.contact[:d_.ncon]:
                b1, b2 = m_.geom_bodyid[c.geom1], m_.geom_bodyid[c.geom2]
                if rb in (b1, b2):
                    o = c.geom2 if b1 == rb else c.geom1
                    self.log(f'    rotor touches {m_.geom(o).name or o} on {m_.body(m_.geom_bodyid[o]).name}: depth {-c.dist * 1000:.2f} mm')
        # 11 Nov, Nischay: the turn direction is chosen per dock (the partner connector decides). Seated but the rotor blocked -> physics
        # decides: try the docking end's OTHER direction once (lock_dir), before giving up
        if r and abs(r['axial_mm']) < 0.8 and r['radial_mm'] < 1.5 and r['lock_deg'] < 20 and not L.get('_tried_other'):
            ds = w.lock_dir(L); side = 'b' if (L['b'].get('module'), L['b'].get('port')) == (dm, de) else 'a'
            if side in ds:
                w.set_locks(self.cur); w.run(0.5)
                L2 = dict(L, dir=dict(ds, **{side: -ds[side]}), _tried_other=True)
                self.log(f'  rotor blocked at {r["lock_deg"]:.0f} deg turning {"+" if ds[side] > 0 else "-"} - trying the other way')
                return self.lock(L2['a'], L2['b'], settle, L2)
        w.set_locks(self.cur); self.log(f'NOT locked {key}: not seated (gap {r["axial_mm"]:.1f} mm, side {r["radial_mm"]:.1f} mm, rotor {r["lock_deg"]:.0f} deg) - rotors back'); return False

    def unlock(self, a, b):
        w = self.w; L = canon(a, b); key = lock_key(L)
        if key not in w.engaged: return self.log(f'{key} is not locked')
        w.release(L); self.cur = [x for x in self.cur if lock_key(x) != key]; w.set_locks(self.cur); self.log(f'unlocked {key} (rotors back)')

    def _turn_target(self, dm, base_end, base_rx, target, avoid_now=False):
        """1 Nov, dock from any placement: the TARGET module is a robot too. If it stands in a floor receiver, its base twist
        (T1 above End A, T3 above End B) turns everything above its foot, so the receiver can face the docker instead of the
        docker walking. Search that twist (brain's own reach check, no physics), turn it there slowly, return the angle (deg)."""
        from phys_dock import PhysDockEnv, dock_check
        w = self.w; d = w.d; tm = target.split('.')[0]
        foot = next((x['b']['port'] for x in self.cur if 'floor' in x['a'] and x['b']['module'] == tm), None)
        if foot is None or tm == dm: return None
        k = 0 if foot == 'A' else 6; adr = w.mod[tm]['qa'][k]; q0 = float(d.qpos[adr]); qpos0 = d.qpos.copy(); best = None
        oks = []
        for deg in range(-150, 151, 10):
            d.qpos[adr] = math.radians(deg); mujoco.mj_forward(w.m, d); w._refresh_rx()
            with contextlib.redirect_stdout(io.StringIO()): c = dock_check(PhysDockEnv(w, dm, randomize=False), base_end, base_rx, target)
            if c['ok']: oks.append(deg)
        d.qpos[:] = qpos0; mujoco.mj_forward(w.m, d); w._refresh_rx()
        # the middle of the widest run of passing angles: the real module sags, an angle at the edge of a run failed (1 Nov, S1A)
        runs, cur_ = [], []
        for deg in oks:
            if cur_ and deg - cur_[-1] > 10: runs.append(cur_); cur_ = []
            cur_.append(deg)
        if cur_: runs.append(cur_)
        runs.sort(key=lambda r: (-len(r), abs(math.radians((r[0] + r[-1]) / 2) - q0)))
        if avoid_now: runs = [r for r in runs if not (r[0] - 10 <= math.degrees(q0) <= r[-1] + 10)]   # a dock from here failed: another angle
        i = w.ids.index(tm)
        for top in runs[:3]:                                         # turn, check again on the real (sagging) module, else the next run
            best = int(round((top[0] + top[-1]) / 2 / 5) * 5)
            self.log(f"  {tm} turns its base twist {'T1' if k == 0 else 'T3'} {math.degrees(float(d.qpos[adr])):.0f} -> {best} deg so {target} faces {dm}.{'B' if base_end == 'A' else 'A'}")
            t0 = w.tgt[i * 9 + k]; n = max(1, int(abs(math.radians(best) - t0) / 0.05))
            for s_ in range(1, n + 1): w.tgt[i * 9 + k] = t0 + (math.radians(best) - t0) * s_ / n; w.run(0.1)
            for _ in range(30):
                if abs(d.qpos[adr] - math.radians(best)) < math.radians(2): break
                w.run(0.1)
            w.run(1.0)
            with contextlib.redirect_stdout(io.StringIO()): c = dock_check(PhysDockEnv(w, dm, randomize=False), base_end, base_rx, target)
            if c['ok']: return best
            self.log(f"    after turning: {c['why']} - next")
        return None

    def _crawl_near(self, dm, de, tname, gd, gt, anchored):
        """8 Nov (Nischay: two lying modules into a snake / T): with real friction a lying module cannot slide over to its partner,
        and bending alone reaches ~25 cm. If the target is further, a single FREE lying module (the docker's, else the target's)
        crawls (floor_skills.crawl_to) until the docking end is CRAWL_NEAR from a point CRAWL_OUT in front of the target connector."""
        import floor_skills as FS
        w = self.w; d = w.d; out = float(os.environ.get('CRAWL_OUT', '0.12')); E = w.mod[dm]['end'][de]
        def rx():
            w._refresh_rx(); return next(x for x in w.rx if x['name'] == tname)
        tip = lambda: d.site_xpos[E['tip']].copy()
        front = lambda: (lambda R: R['seat'] + out * R['z'])(rx())
        far = float(np.linalg.norm((front() - tip())[:2]))
        free = lambda g: len(g) == 1 and not anchored(g)
        # 10 Nov: a STANDING docker reaches by bending over, from its foot: ~STAND_REACH around it on the floor. The old 20 cm-from-
        # the-tip rule made a lying target 0.45 m away crawl for nothing - it rolled away to 0.6 m (docking from where it lay works)
        stand = anchored(gd) and free(gt)
        if stand:
            reach = float(os.environ.get('STAND_REACH', '0.45')); foot = d.xpos[w.m.body(f'{dm}_EndA_LockModule').id].copy()
            seat = lambda: rx()['seat'].copy()                             # the socket itself (it may face away: the docker reaches round)
            # 12 Nov: a lying module's END socket points along its body. Facing AWAY from the standing docker (end_end: -0.96), the
            # docker cannot reach round the lying body (187 mm off after crawling in). Then the socket's goal is END_REACH in front
            # of the foot, facing it: the lying module crawls past and stops with that end pointing at the foot
            zf = lambda: (lambda z: z / max(float(np.linalg.norm(z)), 1e-9))(rx()['z'][:2].copy())
            faces = lambda: (lambda v: float(zf() @ v) / max(float(np.linalg.norm(v)), 1e-9))((foot - seat())[:2])   # +1 = socket points at the foot
            end_sock = tname.split('.')[1] in ('A', 'B') and abs(float(rx()['z'][2])) < 0.5
            if end_sock and faces() < float(os.environ.get('END_FACE_MIN', '0.5')):
                r_end = float(os.environ.get('END_REACH', '0.25')); mt = next(iter(gt))   # 12 Nov: END_REACH 0.30 left M2.A 392 mm out with 4 s waves
                self.log(f'  {tname} points away from {dm} (faces {faces():+.2f}) - {mt} crawls round to face it, {r_end * 1000:.0f} mm off')
                # ALONG its own length only: sideways waves roll it, which swings zf and the goal with it (12 Nov: 293 -> 357 mm).
                # A sideways offset is fine - the docker reaches round it (faces ~0.8 at 0.2 m aside)
                goal = lambda: seat() + np.r_[zf() * (float(zf() @ (foot - seat())[:2]) - r_end), 0.0]
                FS.crawl_to(FS.Brain(w, log=self.log), mt, seat, goal, log=self.log, near=0.03)
                # 12 Nov (real-shape floor hulls): crawling along it veers, M2.A ended 432 mm out (faces +0.54). Still too far -> to a
                # FIXED point END_REACH in front of the foot, sideways waves allowed (rolling never turns an END socket away)
                if float(np.linalg.norm((seat() - foot)[:2])) > float(os.environ.get('END_R_MAX', '0.36')):
                    g_ = foot - np.r_[zf(), 0.0] * r_end
                    FS.crawl_to(FS.Brain(w, log=self.log), mt, seat, lambda: g_, log=self.log, near=0.05)
                return self.log(f'  {tname} now faces {dm} {faces():+.2f}, {float(np.linalg.norm((seat() - foot)[:2])) * 1000:.0f} mm from its foot')
            if float(np.linalg.norm((seat() - foot)[:2])) < reach: return
        elif far < float(os.environ.get('CRAWL_REACH', '0.20')): return
        B = FS.Brain(w, log=self.log)
        if free(gd):
            self.log(f'  {tname} is {far * 1000:.0f} mm away - {dm} crawls over first'); FS.crawl_to(B, dm, tip, front, log=self.log)
        elif free(gt):
            mt = next(iter(gt)); self.log(f'  {tname} is {far * 1000:.0f} mm away - {mt} crawls over first')
            # the target moves: its connector's front point goes to the docking end (same distance, other way round) - or, for a
            # standing docker, into its reach around its foot
            # 12 Nov: not INTO the foot - crawling the socket at the foot jammed the lying body against it (S2A stalled at 311 mm) and
            # then it sat too close for the docker to bend down into: the goal is a point SIDE_R from the foot, toward the socket
            if stand:
                r_side = float(os.environ.get('SIDE_R', '0.30'))
                FS.crawl_to(B, mt, seat, lambda: foot + (lambda v: np.r_[v / max(float(np.linalg.norm(v)), 1e-9) * r_side, 0.0])((seat() - foot)[:2]),
                            log=self.log, near=float(os.environ.get('SIDE_NEAR', '0.06')))
            else: FS.crawl_to(B, mt, front, tip, log=self.log)
        elif not (anchored(gd) or anchored(gt)):                           # a standing side reaches by standing: nothing to say then
            self.log(f'  {tname} is {far * 1000:.0f} mm away and neither side is a single free module - no crawl (yet)')

    def _lift_end(self, dm, tname, gd, gt, anchored):
        """12 Nov (end_end): a lying module's END socket sits ~37 mm up; a standing docker reaching it horizontally rests its own
        end housing on the floor and stays 3.2 mm too high (stuck at the stand-off). The lying module lifts that end a little by
        bending a joint near it. Which joint and which way is not assumed: each candidate is tried in the brain's physics and the
        one raising the socket most is kept (as _face_up)."""
        w = self.w; mt, port = tname.split('.')
        if not (anchored(gd) and len(gt) == 1 and not anchored(gt)) or port not in ('A', 'B'): return
        def seat_h():
            w._refresh_rx(); return float(next(x for x in w.rx if x['name'] == tname)['seat'][2])
        h0 = seat_h(); want = float(os.environ.get('LIFT_END_H', '0.060'))
        if h0 >= want: return
        deg = float(os.environ.get('LIFT_END_DEG', '20')); i = w.ids.index(mt); base = w.tgt[i * 9:i * 9 + 7].copy(); best = (h0, None)
        for jn in (('B1', 'B2') if port == 'A' else ('B4', 'B3')):
            for sgn in (1, -1):
                k = JN.index(jn); w.tgt[i * 9:i * 9 + 7] = base; w.tgt[i * 9 + k] = base[k] + sgn * math.radians(deg); w.run(2.0); h = seat_h()
                if h > best[0] + 0.003: best = (h, (k, sgn))
        w.tgt[i * 9:i * 9 + 7] = base
        if best[1] is None: w.run(2.0); return self.log(f'  {tname} sits {h0 * 1000:.0f} mm up and no bend lifts it')
        k, sgn = best[1]; w.tgt[i * 9 + k] = base[k] + sgn * math.radians(deg); w.run(2.0)
        self.log(f'  {tname} sat {h0 * 1000:.0f} mm up: {mt}.{JN[k]} {sgn * deg:+.0f} deg lifts it to {seat_h() * 1000:.0f} mm (the docker clears the floor)')

    def _face_up(self, dm, tname, gt, anchored):
        """11 Nov ('help your partner'): a LYING module's side rings stand on edge, so every side socket faces sideways ~37 mm above
        the floor - a standing module cannot plug in that low (reach map: 1 of 32 docked). 12 Nov probes (stand_lying): ONE sideways
        crawl wave ROLLS the module a quarter turn (S1A: up +1.00, 72 mm high - like a floor receiver); for S2B the roll goes
        face-down and stays there, but T2 +90 turns it up. Nothing is assumed: every helper is IMAGINED (PhysWorld.snapshot, try it,
        measure, restore - the replay is exact) and the best is then done for real. Score: faces up, and the socket inside the
        standing docker's comfortable reach around its foot (FACE_R_MIN..FACE_R_MAX: too close it cannot bend down into it)."""
        import floor_skills as FS
        w = self.w; mt = tname.split('.')[0]
        if not (len(gt) == 1 and not anchored(gt)) or tname.split('.')[1] in ('A', 'B'): return
        foot = w.d.xpos[w.m.body(f'{dm}_EndA_LockModule').id].copy()
        rmin, rmax = float(os.environ.get('FACE_R_MIN', '0.24')), float(os.environ.get('FACE_R_MAX', '0.34'))   # 12 Nov: locked at 283-318; 388 never seated, 416 out of reach
        def now():
            w._refresh_rx(); R = next(x for x in w.rx if x['name'] == tname); return float(R['z'][2]), float(np.linalg.norm((R['seat'] - foot)[:2]))
        u0, r0 = now()
        if u0 > 0.7: return
        i = w.ids.index(mt); dbg = os.environ.get('FACE_DEBUG')
        def twist(jn, deg):
            def go():
                k = JN.index(jn); w.tgt[i * 9 + k] += math.radians(deg); w.run(2.5); return f'{mt}.{jn} {deg:+d} deg'
            return go
        def roll(sgn):
            def go():
                B = FS.Brain(w, log=lambda *a_: None); base = B.cmd[mt].copy(); n = same = 0; u = now()[0]; sg = sgn
                while u < 0.7 and n < int(os.environ.get('FACE_ROLL_MAX', '8')):
                    # face-down it rests on that ring: 1.5x waves roll it off (S2B probe: up after 2; normal size: up on the 3rd, back on the 4th)
                    amp = FS.WAVE_AMP_DEG * (float(os.environ.get('FACE_ROLL_DOWN_AMP', '1.5')) if u < -0.7 else 1.0)
                    FS.wave(B, mt, sg, True, base, amp=amp); n += 1; u1 = now()[0]
                    # turned it down, or three waves this way did nothing -> the other way (one way rolls in one wave, the other needs up
                    # to three in a row: S1B face-down -> up; flipping after every idle wave undid each roll)
                    same = 0 if u1 > u + 0.2 else same + 1
                    if u1 < u - 0.2 or same >= int(os.environ.get('FACE_ROLL_IDLE', '3')): sg = -sg; same = 0
                    u = u1
                return f'{n} roll wave(s), first {sgn:+d}'
            return go
        cands = [twist('T2', 90), twist('T2', -90), twist('T1', 90), twist('T1', -90), roll(1), roll(-1)]
        r_good = float(os.environ.get('FACE_R', '0.30'))
        def seat_xy():
            w._refresh_rx(); return next(x for x in w.rx if x['name'] == tname)['seat'][:2].copy()
        def imagine():
            s0 = w.snapshot(); best = None; w.imagining = True              # no sending / lockstep / recording meanwhile (PhysWorld.run)
            try:
                for c in cands:
                    what = c(); u, r = now(); sc = u - 2.0 * (max(0.0, rmin - r) + max(0.0, r - rmax)); p = seat_xy()
                    if dbg: self.log(f'    imagine {what}: up {u:+.2f}, {r * 1000:.0f} mm from the foot, score {sc:+.2f}')
                    if u > 0.7 and (best is None or sc > best[0]): best = (sc, c, p)
                    w.restore(s0)
            finally:
                w.imagining = False
            return best
        best = imagine()
        if best is None: return self.log(f'  {tname} faces sideways ({u0:+.2f} up) and no twist or roll turns it up')
        if best[0] < 0.95:
            # 12 Nov: S2B turned up 416 mm out (out of reach), S1B 388 (reaches, never seats); what works is ~280-320. Moving a lying
            # module SIDEWAYS rolls it (and turns the socket), but ALONG its length is free: slide it so that, after the helper,
            # the socket lands ~FACE_R from the foot - then imagine again from there
            ax, _ = FS._floor_axes(w, mt); v = best[2] - foot[:2]; al = float(v @ ax); lat = float(np.linalg.norm(v - al * ax))
            want = math.copysign(math.sqrt(max(r_good ** 2 - lat ** 2, 0.0)), al if abs(al) > 1e-3 else 1.0); shift = want - al
            if abs(shift) > 0.03:
                g = np.r_[seat_xy() + shift * ax, 0.0]
                self.log(f'  {tname} would face up out of comfortable reach (score {best[0]:+.2f}): {mt} slides {shift * 1000:+.0f} mm along first')
                FS.crawl_to(FS.Brain(w, log=self.log), mt, lambda: np.r_[seat_xy(), 0.0], lambda: g, log=self.log, near=0.03)
                b2 = imagine()
                if b2 is not None: best = b2
        what = best[1](); u, r = now()
        self.log(f'  {tname} faced sideways ({u0:+.2f} up): {what} turns it up ({u:+.2f}, {r * 1000:.0f} mm from the foot of {dm})')

    class Replan(Exception):
        """the camera moved the brain's belief of a free module: plan this dock again from the new state"""

    def _cam_belief(self, tname, gt, anchored):
        """12 Nov (Isaac stand_lying + camera): after ONE roll wave the real lying module sat 108 deg turned vs the brain's copy;
        the camera measured it right (100 mm / 57 deg off) but steering only fixes small errors. Encoders + IMU give a FREE module's
        shape, never where it lies - so when the camera (end + socket in one picture) disagrees by > CAM_BELIEF_MM / _DEG, the brain
        moves its copy of that module rigidly to where the camera saw it (the docker's end = its own encoders, trusted) and the dock
        is planned again. Anchored targets keep the small steering."""
        sy = self.sync; cam = getattr(sy, 'cam', None) if sy is not None else None
        if not cam or 'seen' not in cam or cam['t'] <= getattr(self, '_belief_t', -1.0): return False
        if not (len(gt) == 1 and not anchored(gt)): return False
        self._belief_t = cam['t']; w = self.w; m, d = w.m, w.d; sn = cam['seen']; mt = next(iter(gt))
        Re_b = d.xmat[sn['end_body']].reshape(3, 3); pe_b = d.xpos[sn['end_body']].copy()
        Rs_n = Re_b @ sn['R_es'].T; ps_n = pe_b - Rs_n @ sn['t_es']                       # where the socket part REALLY is (brain frame)
        Rs_b = d.xmat[sn['sock_body']].reshape(3, 3); ps_b = d.xpos[sn['sock_body']].copy()
        Dr = Rs_n @ Rs_b.T; ang = math.degrees(math.acos(float(np.clip((np.trace(Dr) - 1) / 2, -1, 1)))); off = float(np.linalg.norm(ps_n - ps_b))
        if off < float(os.environ.get('CAM_BELIEF_MM', '20')) / 1000 and ang < float(os.environ.get('CAM_BELIEF_DEG', '10')): return False
        if getattr(self, '_belief_n', 0) >= int(os.environ.get('CAM_BELIEF_MAX', '4')): return False
        self._belief_n = getattr(self, '_belief_n', 0) + 1
        j = m.joint(f'{mt}_root').id; qa = m.jnt_qposadr[j]; va = m.jnt_dofadr[j]
        p0 = d.qpos[qa:qa + 3].copy(); q0 = d.qpos[qa + 3:qa + 7].copy(); R0 = np.zeros(9); mujoco.mju_quat2Mat(R0, q0)
        R1 = Dr @ R0.reshape(3, 3); q1 = np.zeros(4); mujoco.mju_mat2Quat(q1, R1.ravel())
        d.qpos[qa:qa + 3] = ps_n + Dr @ (p0 - ps_b); d.qpos[qa + 3:qa + 7] = q1; d.qvel[va:va + 6] = 0.0
        mujoco.mj_forward(m, d); sy.cam = None                              # that shot was against the OLD belief: never steer by it
        w.run(float(os.environ.get('CAM_BELIEF_SETTLE', '0.5')))
        self.log(f'  CAMERA: {mt} is really {off * 1000:.0f} mm / {ang:.0f} deg from where the brain had it - its copy moves there, '
                 f'the dock is planned again ({self._belief_n})')
        return True

    def coop_connect(self, a, b):
        """1 Nov, Nischay: "both should bend", "use my VSEPR theory", "it's a sim, use the truth". Every 60 ms: read where
        the two connectors REALLY are, solve one damped least-squares step over EVERY joint of both groups (they meet in the
        middle, as Studio connectorSnap.computeMateBend does), and in the leftover freedom push the bodies apart (the VSEPR
        spread, sum 1/d, so the shape opens out instead of crumpling). Line up at a 30 mm stand-off, go straight in, lock.
        Uses physics truth: fine in the sim; the real robot gets telemetry and the optional camera."""
        from phys_dock import end_rel
        w = self.w; m, d = w.m, w.d; L = canon(a, b); key = lock_key(L); conn_a, conn_b = a, b
        if key in w.engaged: return self.log(f'{key} is already locked')
        for k_ in list(w.engaged): w._store_lock_pose(k_)                   # each closed lock's zero point for this job: drift from it is pulled back
        (dm, de), _ = docking_of(L); tname = ref_name(L['a'] if (L['b']['module'], L['b']['port']) == (dm, de) else L['b'])
        other = L['a'] if (L['b']['module'], L['b']['port']) == (dm, de) else L['b']
        if 'module' in other and other['port'] in ('A', 'B'):
            # end<->end: either end can dock. The one whose module stands in a floor receiver reaches; a lying one cannot lift to a
            # standing module's top end (1 Nov: 550 mm off with the lying end docking)
            anch = lambda mid_: any('floor' in Lk['a'] and Lk['b']['module'] in group_of(w, self.cur, mid_) for Lk in self.cur)
            if anch(other['module']) and not anch(dm): tname = f'{dm}.{de}'; dm, de = other['module'], other['port']
        gd = set(group_of(w, self.cur, dm)); gt = set(group_of(w, self.cur, tname.split('.')[0])) if not tname.startswith('F:') else set()
        anchored = lambda g: any('floor' in Lk['a'] and Lk['b']['module'] in g for Lk in self.cur)
        if gt and gd != gt:
            self._crawl_near(dm, de, tname, gd, gt, anchored)
            if anchored(gd) and os.environ.get('FACE_UP', '1') == '1': self._face_up(dm, tname, gt, anchored)   # standing docker: a side socket faces up first
            if os.environ.get('LIFT_END', '1') == '1': self._lift_end(dm, tname, gd, gt, anchored)
        # steering: DIK (dik.py) for a lying docker (rings, lying chains: the old steering cannot close a 3-ring), the old
        # DLS when the docker stands on a floor connector (DIK still misses the standing side dock, 1 Nov). COOP_STEER=dik|old forces one
        steer = os.environ.get('COOP_STEER', 'dik'); use_dik = steer != 'old'   # 3 Nov (Nischay: nothing preplanned): every docker, standing too, steers live; 'old' = the planned stand-up
        # a separate target group helps only if it is anchored: a free-lying one just rolls when its joints move (1 Nov: 222 mm off)
        mods = sorted(gd | (gt if (gt & gd or anchored(gt)) else set()))
        dofs = np.array([dof for mid in mods for dof in w.mod[mid]['dofs']]); tix = np.array([w.ids.index(mid) * 9 + k for mid in mods for k in range(7)])
        qadr = np.array([qa for mid in mods for qa in w.mod[mid]['qa']])
        lo, hi = m.jnt_range[[m.dof_jntid[x] for x in dofs]].T * 0.97
        tw_ = np.array([k in (0, 3, 6) for mid in mods for k in range(7)]); tp_ = float(os.environ.get('TWIST_PAD', '2')); lo[tw_] -= math.radians(180 * 0.03 - tp_); hi[tw_] += math.radians(180 * 0.03 - tp_)   # twists: TWIST_PAD deg from the half turn (dik.py margin)
        bodies =[m.body(f'{mid}_{b}').id for mid in mods for b in VIEW_BODIES if 'Rotor' not in b]
        E = w.mod[dm]['end'][de]; nv = m.nv; jp, jr = np.zeros((3, nv)), np.zeros((3, nv))
        def jac(point, body):
            mujoco.mj_jac(m, d, jp, jr, point, body); return jp[:, dofs].copy(), jr[:, dofs].copy()
        self.log(f'connect {dm}.{de} -> {tname}: both sides bend ({", ".join(mods)}: {len(dofs)} joints), VSEPR spread, physics truth')
        offset, phase, t0, best, stall = 0.03, 'line up', float(d.time), 1e9, 0
        integ = np.zeros(7 * len(mods))
        dik = None
        if use_dik:
            from dik import DIK
            hops, frontier = {dm: 0}, [dm]                            # lock-graph distance from the docking module: far = expensive
            while frontier:
                nxt = []
                for x in frontier:
                    for Lk in self.cur:
                        if 'floor' in Lk['a']: continue
                        (pm, _), rv = docking_of(Lk); rm = rv.split('_')[0]
                        for u, v_ in ((pm, rm), (rm, pm)):
                            if u == x and v_ not in hops: hops[v_] = hops[x] + 1; nxt.append(v_)
                frontier = nxt
            dik_args = (w, mods, (dm, de), tname, hops)
        if self.sync is not None and hasattr(self.sync, 'begin_follow'): self.sync.begin_follow(dm, de, tname)   # the REAL end aims at the REAL socket
        acts = np.array([a for mid in mods for a in w.mod[mid]['act']])
        backoff = 0.0; lock_tries = 0; tbid = next(x for x in w.rx if x['name'] == tname)['bid']
        # a separate standing target turns to face the docker with its base twist; its bends barely help: bending it under its
        # own weight overloaded its servos and it sagged far over (1 Nov, M2.B -> M1.S1A)
        share = np.ones(7 * len(mods))
        for c, mid in enumerate(mods):
            if mid not in gd:
                foot = next((Lk['b']['port'] for Lk in self.cur if 'floor' in Lk['a'] and Lk['b']['module'] == mid), None)
                # the target bends freely too; how far its servos can hold it is now physics' call (dik.TorqueLimit: the torque each
                # move needs, from the real gravity), no longer a fixed 8 % (8 Nov, ceiling: at 8 % M2 only twisted, into its stop)
                import dik as dikmod
                share[c * 7:c * 7 + 7] = 1.0 if (self.ideal or dikmod.TORQUE > 0) else 0.08; share[c * 7 + (0 if foot == 'A' else 6)] = 1.0
        if dik is None and use_dik: dik = DIK(*dik_args, offset=0.03, share=share)
        if dik is not None: dik.lying = not any(anchored({x}) for x in mods)
        # seat: the real robot presses 0.6 mm past it and checks loosely; the ideal one aims at exactly 0 and must be within 20 um -
        # what is left there is the contact itself: the magnets press the pads on the receiver (~18 N) and MuJoCo's contacts give a
        # few um under it (2 Nov, M1.A -> M2.S2B: 9 um, 128 contact points). The steering is exact; the true numbers are logged
        # (2 Nov, fin-held locks: the printed parts carry ~0.1 mm tolerance, so fully pushed in = touching within 0.1 mm of the
        # nominal seat; the fins turning the full 45 deg (lock()) is the real test)
        press, seat_mm = (0.0, (float(os.environ.get('SEAT_IDEAL_MM', '0.02')),) * 2) if self.ideal else (None, (0.8, 1.5))
        if os.environ.get('DOCK_PUSH') == 'dynamic': press = None          # test switch: the ideal robot pushes the dynamic way too
        # press None = the robot with errors pushes DYNAMICALLY (Nischay 7 Nov: on a wall or ceiling gravity does not help, a fixed
        # 0.6 mm past the seat is floor thinking): the aim leads the end and keeps going in while the end goes deeper; blocked, the lead
        # grows until a servo is at its real strength (85 %, the anti-windup's limit) - gravity, magnets and contacts decide how much
        # push that is. When the end stops going deeper past the seat, the lock is tried: the fins turning home are the real test.
        lead, deep_best, deep_stall = 0.0, 1e9, 0
        # going in, the sideways allowance (mm) = a + b * gap: the real robot leans on chamfers + magnets (2 mm at the seat); the ideal
        # one must be centred BEFORE the pads touch (2 Nov: touching 0.4 mm off, friction held it there): 0.01 mm at the seat
        # (a + b * (gap - c)): ideal is centred to 0.15 mm (the pads' clearance is ~0.25 mm per side) from 15 mm out, in free air, before the pads enter the slot at ~9 mm: in the slot
        # 0.4 mm off, the pads wedged at 130 N and no joint move could recentre it (2 Nov)
        funnel = (0.15, 0.05, 15.0) if self.ideal else (2.0, 0.06, 0.0)
        # 12 Nov: a FREE lying target wobbles 0.3-1 mm as the docker nears (stand_lying S1B crept in at half speed: 11 mm short at
        # 45 s while 0.3 mm aside) - its own chamfers and magnets centre that; a little wider at the seat for it
        if self.ideal and gt and not anchored(gt): funnel = (float(os.environ.get('FREE_FUNNEL_MM', '0.6')), funnel[1], funnel[2])
        best_phase = 'line up'
        glide0 = getattr(w, 'glide', False) and os.environ.get('GLIDE_CONNECT', '0') == '1'   # 3 Nov: gliding joints lag DIK's commands, the final line-up crawled (2-ring 30 s vs 12 s); the Studio's playback is smooth on its own now
        planned = False; end_fix = None; hold = 0; la_done = False; redo = 0
        groups = {}
        for mid in mods:
            if any(mid in g.mods for g in groups.values()): continue
            g = sorted(group_of(w, self.cur, mid)); fl = [Lk['b']['module'] for Lk in self.cur if 'floor' in Lk['a'] and Lk['b']['module'] in g]
            groups[mid] = GroupFK(w, g, fl[0] if fl else g[0], self.cur)
        gE = next(g for g in groups.values() if dm in g.mods); tmod = tname.split('.')[0] if not tname.startswith('F:') else None
        gT = next((g for g in groups.values() if tmod in g.mods), None)
        tip_local = m.site_pos[E['tip']].copy(); RXd = next(x for x in w.rx if x['name'] == tname)
        def rel(qs):
            """end tip / axis / pad twist in the target's frame, from the groups' kinematics (nominal, no sag)"""
            PE = gE.poses({mid: qs[mid] for mid in gE.mods}); Rb, pb = GroupFK.body(PE, dm, E['body']); tp = pb + Rb @ tip_local
            n_ = Rb[:, 1] if de == 'B' else -Rb[:, 1]
            if gT is None: Rr, pr = d.xmat[RXd['bid']].reshape(3, 3), d.xpos[RXd['bid']]
            else:
                PT = PE if gT is gE else gT.poses({mid: qs[mid] for mid in gT.mods}); Rr, pr = GroupFK.body(PT, tmod, RXd['bid'])
            seat, zz, RR = w.rx_frame(RXd, Rr, pr)
            sl_ = math.radians(end_rel(tp, Rb, seat, zz, RR)['slot_deg'])
            return np.r_[RR.T @ (tp - seat - offset * zz), RR.T @ n_ * 0.06, [sl_ * 0.06]]
        # 1) the whole closed shape first (as the Studio solver does): from a straight chain small steps get stuck (1080 mm, 1 Nov)
        try:
            if use_dik:
                # Nischay 2 Nov: NOTHING preplanned - no planned shape, no planned path. DIK steers from the first tick toward the
                # stand-off in front of the target (where the target is NOW), Nischay's VSEPR shapes everything else in its null
                # space, then straight in. Only the shape rule is VSEPR (the hard-coded 'prefer straight' wish is off)
                offset = STANDOFF_M
                if dik is not None: dik.relax_on = False; dik.funnel = float(os.environ.get('DIK_FUNNEL', '0'))
                te_ = tname.split('.')[1] if tname.split('.')[1] in ('A', 'B') else None
                # the final fine corrections (END_JOINTS=1): 4 joints at each connector; a SIDE receiver's module helps with the
                # joints on both sides of it (S1A/S1B on Spine1 between B1 and B2, S2A/S2B on Spine2 between B3 and B4)
                end_fix = [(dm, de)] + ([(tname.split('.')[0], te_)] if te_ else [(tname.split('.')[0], 'S1' if tname.split('.')[1].startswith('S1') else 'S2')] if not tname.startswith('F:') else [])
                self.log('  live: DIK + VSEPR steer from here (no planned shape or path)')
                # COOP_PLAN=file.json {module: 7 joint angles, rad}: drive into that shape first (e.g. the IDEAL robot's lined-up pose,
                # saved with COOP_SAVE_POSE), then live DIK finishes - the ideal sim plans, the real robot follows (9 Nov test)
                plan = {k_: np.asarray(v_, float) for k_, v_ in json.load(open(os.environ['COOP_PLAN'])).items()} if os.environ.get('COOP_PLAN') else {}
                raise StopIteration
            if anchored(gd):
                # a standing docker: the brain's own start pose (IK to its stand-off, best of 6 seeds), as walking does
                from phys_dock import PhysDockEnv
                with contextlib.redirect_stdout(io.StringIO()):
                    import walk as WK
                    base_end = 'A' if de == 'B' else 'B'; base_rx = next(ref_name(Lk['a']) for Lk in self.cur if Lk['b'] == {'module': dm, 'port': base_end})
                    env_ = PhysDockEnv(w, dm, randomize=False); Wk = WK.Walker(env_, base_end, env_.index(base_rx), 0, m.opt.gravity.copy(), log=lambda *x_: None)
                    C_ = Wk._ctrl(env_.index(tname)); plan = {dm: Wk.nq(C_.seed)}
                raise StopIteration
            with contextlib.redirect_stdout(io.StringIO()): plan, _, now = preshape(w, self.cur, dm, de, tname, log=lambda *x_: None)
        except StopIteration: pass
        except Exception as ex:
            plan = {}; self.log(f'  (no whole-shape plan: {ex})')
        if plan:
            self.log(f'  whole shape planned ({len(plan)} modules); all of them move into it together')
            worst = self.drive_to(plan)
            self.log(f'  in the planned shape ({float(d.time) - t0:.1f} s): worst joint {worst:.0f} deg off')
        while float(d.time) - t0 < float(os.environ.get('COOP_SECONDS', '45')):
            if os.environ.get('CAM_BELIEF', '1') == '1' and gt and self._cam_belief(tname, gt, anchored): raise Manual.Replan()
            w._refresh_rx(); R = next(x for x in w.rx if x['name'] == tname); z = R['z']
            Re = d.xmat[E['body']].reshape(3, 3); nE = Re[:, 1] if de == 'B' else -Re[:, 1]; tip = d.site_xpos[E['tip']].copy()
            goal = R['seat'] + offset * z; ep = goal - tip
            sl = math.radians(end_rel(tip, Re, R['seat'], z, R['R'])['slot_deg'])
            er = np.cross(nE, -z) - sl * z
            # residual in the TARGET's frame (independent of where the floating group sits): end tip vs goal, end axis vs -z,
            # pad twist. Its Jacobian comes from the group's own kinematics THROUGH the locks (GroupFK), so every module's
            # joints count - mj_jac only sees the module that holds each connector (each module is its own tree, locks are welds)
            if dik is not None and end_fix and np.linalg.norm(ep) < 0.06 and os.environ.get('END_JOINTS', '0') == '1':
                dik.end_joints_only(k=4, ends=end_fix); end_fix = None        # at the stand-off: the last mm with the light end joints only
                # (VSEPR stays ON here too - Nischay 2 Nov: always; it only uses motions that leave the connectors where they are)
                if LIFT_ENDS and not anchored(gd):                         # a lying group: both connectors up off the floor, align in the air
                    dik.lift_ends([E['body'], next(x for x in w.rx if x['name'] == tname)['bid']], LIFT_ENDS); self.log(f'  connectors lifted {LIFT_ENDS * 1000:.0f} mm off the floor to line up in the air')
            if dik is not None:                                       # DIK: the QP over joints AND the free base (dik.py)
                # touched the target before lining up (the ends bump side by side, 1 Nov: 2-ring robot 3, 4-ring): back off along the
                # target's axis, as a person would, then come in again; no contact = no detour (an always-on funnel slowed good docks)
                if phase == 'line up':
                    b1, b2 = m.geom_bodyid[d.contact.geom1[:d.ncon]], m.geom_bodyid[d.contact.geom2[:d.ncon]]
                    touch = bool(np.any(((b1 == E['body']) & (b2 == tbid)) | ((b2 == E['body']) & (b1 == tbid))))   # the target connector itself
                    backoff = min(backoff + 0.004, 0.06) if os.environ.get('COOP_BACKOFF') == '1' and touch and 0.006 < np.linalg.norm(ep) < 0.08 else max(backoff - 0.002, 0.0)
                dik.going_in(phase == 'go in'); dik.offset = offset + backoff; vel, dik_e, dik_a = dik.step(0.06); dq = np.concatenate([vel[mid] for mid in mods]) * 0.06
            else:
                RT = R['R']; res = np.r_[RT.T @ (tip - goal), (RT.T @ nE + np.array([0, 0, 1.0])) * 0.06, [sl * 0.06]]
                qcur = {mid: d.qpos[np.array(w.mod[mid]['qa'])].copy() for mid in mods}
                f0 = rel(qcur); Jn = np.zeros((7, len(dofs))); h = 1e-3
                for c, (mid, k) in enumerate([(mid, k) for mid in mods for k in range(7)]):
                    qq = {x: v.copy() for x, v in qcur.items()}; qq[mid][k] += h; Jn[:, c] = (rel(qq) - f0) / h
                qn = d.qpos[qadr]; room = np.minimum(qn - lo, hi - qn); wj = np.clip((room - 0.02) / 0.2, 0.02, 1.0) * share   # joints near a stop are used less (the brain's LIMIT_GUARD)
                J = Jn; Jw = J * wj; Jp = wj[:, None] * (Jw.T @ np.linalg.inv(Jw @ Jw.T + 1e-4 * np.eye(7)))
                dq = -(Jp @ res)
                # VSEPR: every body a charge repelling the others (Studio spreadFromPoints), only in the null space of the mate
                g = vsepr.gradient(d.xpos[bodies], vsepr.body_jacobians(m, d, bodies, dofs), [(i, k) for i in range(len(bodies)) for k in range(i + 2, len(bodies))])
                dq += (np.eye(len(dofs)) - Jp @ J) @ (-0.002 * g * min(1.0, np.linalg.norm(ep) / 0.10))   # shape first, precision last: the spread fades over the last 10 cm
            cap_ = 0.035 * min(1.0, max(0.25, np.linalg.norm(ep) / 0.03))   # small, calm corrections near the target, no overshoot (2 Nov)
            q = d.qpos[qadr]; mx = np.abs(dq).max(); dq = dq * (cap_ / mx) if mx > cap_ else dq   # scale the whole step (direction kept), like the brain's vclip
            if os.environ.get('COOP_DEBUG') and (os.environ.get('COOP_DEBUG') == '2' or int((float(d.time) - t0) / 0.06) % 10 == 0): print(f'COOP t {float(d.time) - t0:5.1f} {phase} aim {offset * 1000:5.1f} pos {np.linalg.norm(ep) * 1000:6.1f} mm ang {math.degrees(np.linalg.norm(np.cross(nE, -z))):5.1f} slot {math.degrees(sl):5.1f} |dq| {mx:.3f} q-tgt {np.abs(w.tgt[tix] - q).max():.3f} load ' + ' '.join(f'{x:.2f}' for x in np.abs(d.actuator_force[acts]) / np.maximum(np.abs(m.actuator_forcerange[acts, 1]), 1e-6)) + (f' | DIK sees {dik_e:.1f} mm {dik_a:.1f} deg' if dik is not None else '') + (f' WHY {dik.why()}' if dik is not None and dik_e < float(os.environ.get('COOP_WHY_MM', '25')) and os.environ.get('COOP_WHY') else ''), file=sys.stderr, flush=True)
            if os.environ.get('COOP_DEBUG') in ('3', '4') and (os.environ.get('COOP_DEBUG') == '4' or int((float(d.time) - t0) / 0.06) % 10 == 0): print(f'COOPQ t {float(d.time) - t0:5.1f} seat ' + ' '.join(f'{x * 1000:6.1f}' for x in R['seat']) + ' tip ' + ' '.join(f'{x * 1000:6.1f}' for x in tip) + ' q ' + ' '.join(f'{x:5.0f}' for x in np.degrees(q)) + ' | dq ' + ' '.join(f'{x:6.3f}' for x in dq), file=sys.stderr, flush=True)
            # the catch-up push: grows while a joint stays short (friction), but now LEAKS (5 %/tick) and is capped at ~2 deg - it used to
            # build up to 7 deg over a long line-up and then slide the end sideways while going in (2 Nov)
            if phase == 'line up': integ = np.clip(integ + 0.15 * dq, -0.12, 0.12)   # line-up: the full push (it moves the end sideways through friction)
            else: integ = np.clip(integ * 0.97 + 0.15 * dq, -INTEG_MAX, INTEG_MAX)   # going in: starts at 0, fades, capped
            if dik is not None:                                        # anti-windup: a servo already at > 85 % cannot push harder; letting the
                load = np.abs(d.actuator_force[acts]) / np.maximum(np.abs(m.actuator_forcerange[acts, 1]), 1e-6)   # push grow made it stick, then slip and fling the curl (1 Nov, 3-ring)
                integ = np.where(load > 0.85, integ * 0.8, integ)
            tick = dict(t=float(d.time) - t0, phase=phase, mods=mods, q=q.copy(), dq=dq.copy(), tip=tip.copy(), seat=R['seat'].copy(), z=z.copy(), Rt=R['R'].copy(), nE=nE.copy(), slot=sl)
            if self.policy:                                                # the model's step replaces DIK's (DIK still ran: its view is what the model learned from)
                dq = np.asarray(self.policy(tick), float); mx = np.abs(dq).max()
                dq = dq * (cap_ / mx) if mx > cap_ else dq                 # the same step limit as DIK's (3 Nov: uncapped, 10 % model ticks broke 4 of 6 docks)
            if self.recorder: self.recorder(tick)
            # ideal: the joints go exactly where DIK says (no push-ahead, no catch-up). Each step adds to the last COMMAND, not to where the joint
            # sits: a loaded joint sits a hair under its command, and once DIK's step was that small it never moved again (3 Nov, chain3
            # M3.B -> M1.S1A: held 0.25 mm off the side at 15 mm for 7 s). Kept within 3 deg of the joint, so nothing winds up
            if self.ideal: w.tgt[tix] = np.clip(np.clip(w.tgt[tix], q - IDEAL_LEAD, q + IDEAL_LEAD) + dq, lo, hi)
            elif ANTI_ERROR:
                # anti-error DIK (Nischay 1 Nov): the sim knows THIS robot's errors, so each move is pre-compensated instead of
                # discovered afterwards. Servo droop: a loaded servo sits short of its command by torque / its own stiffness ->
                # command that much further. Deadband: a correction under 0.1 deg is ignored by the servo -> send it just above.
                # Gear play + PLA flex: DIK reads their true values every tick, so a flip of the play is corrected next tick
                droop = self._droop(acts)
                small = (np.abs(dq) > 1e-5) & (np.abs(dq) < 1.5 * DIST.DEADBAND)
                dq_s = np.where(small, np.sign(dq) * 1.5 * DIST.DEADBAND, dq)
                w.tgt[tix] = np.clip(q + dq_s + droop + integ, lo, hi)
            else:
                w.tgt[tix] = np.clip(q + dq * 2.0 + integ, lo, hi)   # ahead of where the joints are, so the servos push through friction
            w.glide = glide0 and phase == 'line up' and stall < 25 and float((d.site_xpos[E['tip']] - R['seat']) @ z) > 0 and np.linalg.norm(ep) > GLIDE_FAR              # smooth for the big moves in open air; exact steps for the last GLIDE_FAR, behind the target, going in, or stuck (3 Nov: gliding there it never settled; the 2-ring's final line-up took 25 s instead of 10)
            w.run(0.06)
            perr, aerr = np.linalg.norm(ep) * 1000, math.degrees(np.linalg.norm(np.cross(nE, -z)))
            if phase == 'line up':
                # end and receiver read at the SAME moment, after the step (2 Nov: tip from before vs receiver from after: the gliding ring
                # showed 3.5 mm 'sideways' while perfectly lined up, and it waited 3.4 s)
                w._refresh_rx(); zz_ = R['z']; v_ = d.site_xpos[E['tip']] - R['seat']; ax_ = float(v_ @ zz_); lat_ = float(np.linalg.norm(v_ - ax_ * zz_)); perr = float(np.linalg.norm(v_ - offset * zz_)) * 1000
                if perr < 6 and lat_ < LINE_UP_SIDE and aerr < LINE_UP_DEG and abs(math.degrees(sl)) < LINE_UP_TURN: phase = 'go in'; integ[:] = 0.0   # sideways checked on its own (2 Nov: 6 mm of 'position' could all be sideways -> it went in off-centre and 'drifted')   # tilt: Nischay saw 2-3 deg jam the pads (1 Nov)
                # already lined up but closer than the stand-off - IN FRONT of the target (2 Nov: a straight chain is 'lined up' 1.35 m
                # BEHIND it, and this sent it straight to 'go in') (1 Nov, round 2-ring: ends face to face, 2 deg, touching, 14 mm
                # 'short' of a stand-off point behind them): the stand-off is only a waypoint -> go in from here
                elif os.environ.get('COOP_GATE2', '1') == '1' and aerr < LINE_UP_DEG and abs(math.degrees(sl)) < LINE_UP_TURN and lat_ < 0.003 and -0.001 < ax_ < offset + 0.006: phase = 'go in'; integ[:] = 0.0; offset = max(min(offset, ax_), press if press is not None else -1.0)   # as the brain's blind hover gate (6 mm): magnets and chamfers finish it; self.log(f'  lined up at the stand-off ({float(d.time) - t0:.1f} s): {perr:.1f} mm, {aerr:.1f} deg -> going in')
                if phase == 'line up' and planned and not la_done and perr < 60 and self.gpu is not None:
                    la_done = True
                    if self._true_align(dm, de, tname, offset): phase = 'go in'
                if phase == 'go in': self._wait_real('stand-off', 2.0, 8.0)
                if phase == 'go in' and os.environ.get('COOP_SAVE_POSE') and not os.path.exists(os.environ['COOP_SAVE_POSE']):   # the lined-up shape, for COOP_PLAN
                    json.dump({mid: [float(d.qpos[qa]) for qa in w.mod[mid]['qa']] for mid in mods}, open(os.environ['COOP_SAVE_POSE'], 'w'))
            else:
                r = w.end_vs(dm, de, tname)
                # peg-in-hole: advance only while centred; drifted sideways (1 Nov: 9.6 mm, the rims landed on each other) -> back
                # out a little until the sideways correction catches up, then go on
                # going in by hand: only while centred; drifted sideways -> hold the depth and let the sideways fix work; resting on
                # the rim (no closer for a while) -> lift off just 3 mm to free it (1 Nov: pushing on drifted 4-7 mm, the rims met;
                # a full back-out to 30 mm never came back)
                centred = r['radial_mm'] < funnel[0] + funnel[1] * max(r['axial_mm'] - funnel[2], 0.0)              # a funnel: 2 mm at the seat, ~4.4 mm at 40 mm (chamfers + magnets centre the rest)
                hold = 0 if centred else hold + 1
                # never wait for long (Nischay 1 Nov: 'what is it waiting for?'): held 1.5 s -> every joint may help again;
                # held 4 s -> go in anyway, slowly: the pads' chamfers and the magnets guide the last mm
                if hold == 25 and dik is not None: dik.posture.set_cost(dik.cost0)
                tol = funnel[0] + funnel[1] * max(r['axial_mm'] - funnel[2], 0.0)
                if (r['radial_mm'] > max(6.0, 2 * tol) or hold > 50) and redo < 2:   # far off, or held 3 s without getting centred: redo the line-up
                    # drifted well off the side while going in (2 Nov: forced on at 11.5 mm off, it slid along the other face): back
                    # out to the stand-off, line up again, go in again - as a hand would
                    redo += 1; phase = 'line up'; offset = STANDOFF_M; hold = 0; stall = 0; best = 1e9
                    if dik is not None: dik.posture.set_cost(dik.cost0)
                    self.log(f'  drifted {r["radial_mm"]:.1f} mm off the side going in -> back to the stand-off, lining up again ({redo}/2)')
                elif centred or (hold > 25 and r['radial_mm'] < 1.5 * tol):
                    # in through the air fast, slowly only near the seat (2 Nov: a flat 0.5 mm/tick took ~5 s for 40 mm): 15 % of the gap per tick
                    step_ = min(GO_IN_MAX, max(GO_IN_STEP, 0.15 * max(r['axial_mm'], 0.0) / 1000))
                    if press is not None: offset = max(offset - (step_ if centred else step_ / 2), press)   # just over the allowance for 1.5 s: on, slowly
                    else:
                        # first to the nominal seat exactly as before (pushing earlier wedged the pads on the rim, 7 Nov test: 26 s
                        # instead of 12); only there, if the end stopped short, aim a little deeper each blocked tick while every servo
                        # still has strength left - how much push that becomes is up to gravity, magnets and contacts
                        offset = max(offset - (step_ if centred else step_ / 2), -lead)
                        if offset <= 0.0:
                            gap = r['axial_mm'] / 1000
                            if gap < deep_best - 0.0001: deep_best, deep_stall = gap, 0      # still going deeper (0.1 mm)
                            else: deep_stall += 1
                            strong = float(np.max(np.abs(d.actuator_force[acts]) / np.maximum(np.abs(m.actuator_forcerange[acts, 1]), 1e-6)))
                            if deep_stall and strong < 0.85: lead += GO_IN_STEP / 5             # blocked: push a little harder
                if 0 < hold <= 25: stall = 0                                   # the 1.5 s of waiting on purpose is not 'no progress'
                # (removed 2 Nov: 'resting on the rim -> lift 3 mm' kept pulling the aim back while it should go in)
                # pushed as far as physics lets it: past the nominal seat aim, no deeper for 0.5 s (8 ticks)
                pushed = press is None and offset <= 0.0 and deep_stall >= 8
                if r['radial_mm'] < seat_mm[1] and (pushed or (offset <= (press or 0.0) and abs(r['axial_mm']) < seat_mm[0])):
                    sp = vsepr.spread_from_points([d.xpos[m.body(f'{x}_{p_}').id] for x in mods for p_ in ('EndA_LockModule', 'Spine1_B1B2', 'T2_Ring_B3Fork', 'Spine2_B3B4', 'EndB_LockModule')])
                    self.log(f'  VSEPR spread: energy {sp["energy"]}, closest parts {sp["minGapMM"]} mm, mean {sp["meanGapMM"]} mm')
                    self.log(f'  seated ({float(d.time) - t0:.1f} s): gap {r["axial_mm"]:.6f} mm, side {r["radial_mm"]:.6f} mm -> lock')
                    if self.sync is not None and hasattr(self.sync, 'begin_push'):   # the REAL end: push it home (real_sync.begin_push)
                        (dm_, de_), _ = docking_of(canon(conn_a, conn_b)); self.sync.begin_push(dm_, de_, ref_name(canon(conn_a, conn_b)['a']))
                        self.w.run(float(os.environ.get('PUSH_RAMP_S', '1.0')) + 0.5)
                    # (10 Nov twin: the blind spiral search found the socket at 8.5 s of the 6+1.5 s - the lock turned 0.3 s later: luck)
                    self._wait_real('seat', 1.0, float(os.environ.get('SEAT_WAIT_S', '12')))
                    locked_ = self.lock(conn_a, conn_b)
                    if self.sync is not None and hasattr(self.sync, 'end_push'): self.sync.end_push()
                    if locked_: return True
                    # seated but the rotors did not turn home (1 Nov, robot 4: rotor 5 of 45 deg, gap grew to 0.8 mm): keep pressing
                    # in and try again, as a person would; give up after 3 tries
                    lock_tries += 1
                    if lock_tries >= 3: return False
                    stall = 0; deep_stall = 0                                  # give the next push its own 0.5 s
                    if RESEAT_BACK > 0 and r['radial_mm'] > RESEAT_SIDE:
                        # the rotor's fins caught a pad's side wall (9 Nov, 45 deg seed 1: seated 0.73 mm off centre, fin 0.16 mm into
                        # M2_srx0 pad1, rotor 4 of 45 deg - pressed in, the end cannot slide sideways): back out RESEAT_BACK, centre
                        # in free air to RESEAT_SIDE, press in again; 'seated' now also means centred that well
                        offset = RESEAT_BACK; lead = 0.0; deep_best = 1e9; seat_mm = (seat_mm[0], min(seat_mm[1], RESEAT_SIDE))
                        funnel = (min(funnel[0], RESEAT_SIDE), funnel[1], funnel[2])
                        self.log(f'  rotor blocked {r["radial_mm"]:.2f} mm off centre: backing out {RESEAT_BACK * 1000:.0f} mm, centring to {RESEAT_SIDE} mm, in again')
            # progress: lining up = closer to the stand-off; going in = the gap shrinking (2 Nov: measured to the MOVING aim it stayed
            # at 0.5 mm while going in steadily, and the 7-s 'no progress' stop fired 6 mm before the seat)
            if phase == 'line up': prog = perr
            else: r_ = w.end_vs(dm, de, tname); prog = abs(r_['axial_mm']) + r_['radial_mm']
            if phase != best_phase: best, best_phase = 1e9, phase
            if prog < best - 0.5: best, stall = prog, 0
            else: stall += 1
            # line-up stuck 1.5 s with only the end joints: every joint may help (2 Nov, end-to-side: 14 mm sideways out of the
            # end joints' bend plane, it sat 7 s and gave up)
            if phase == 'line up' and stall == 25 and dik is not None: dik.posture.set_cost(dik.cost0)
            # stuck BESIDE the receiver, closer than the stand-off: the docker cannot reach out in front (9 Nov, 135 deg: M1 folded to its
            # stops, 28 mm out and 22 mm aside, the 40-mm aim + 'come round' asked for more reach than it has) -> wait closer, at 20 mm
            # (pads stand ~9 mm: 11 mm of clear air left), once
            if phase == 'line up' and stall == 25 and offset > STANDOFF_NEAR and 0.0 < ax_ < offset and lat_ < STANDOFF_M:
                offset = STANDOFF_NEAR; best = 1e9; self.log(f'  cannot reach out to the {STANDOFF_M * 1000:.0f}-mm stand-off ({ax_ * 1000:.0f} mm out, {lat_ * 1000:.0f} mm aside): lining up at {offset * 1000:.0f} mm')
            # (removed 9 Nov: the 8 Nov 'unwind a twist wound against its stop' - same yaw +-23 deg, but the straighten-and-turn threw
            # the whole line-up away: ceiling robot 2 locked without it, failed with it. The fix was the twists' own margin, dik.py)
            # VSEPR is a wish, like gravity it gives way to what blocks it (3 Nov: its push held a standing M1 96 mm off M2.S2B; off, it
            # locked in 3.8 s): 1.5 s without progress -> it pauses until the end moves on again
            if dik is not None: dik.vs_yield = stall >= 25
            if stall > 50 and dik is not None and dik.relax_on:       # restart (3.4): 'less bent' spreads a ring's curl but blocks deep folds
                dik.relax_on = False; stall = 0; best = perr; self.log(f'  stuck at {perr:.0f} mm with the even curl: letting joints bend deeper'); continue
            if stall > 120: self.log(f'  NOT connected: no progress for 7 s ({perr:.0f} mm, {aerr:.0f} deg off; the joints cannot get closer from here) [{phase}: ' + (f'sideways {lat_ * 1000:.1f} mm, along axis {ax_ * 1000:.1f} mm' if phase == 'line up' else f'gap {r["axial_mm"]:.4f} mm, sideways {r["radial_mm"]:.4f} mm, aim {offset * 1000:.1f} mm') + f', turn {math.degrees(sl):.1f} deg]'); return False
        self.log(f'  NOT connected in {float(d.time) - t0:.0f} s ({perr:.0f} mm, {aerr:.0f} deg off)'); return False

    def go_home(self):
        """1 Nov, Nischay: Home replayed 546 commands backwards ("idiotic"). Now: open the locks made since the start, move
        every joint straight to its start angle in one smooth move, close the start locks again."""
        if not self.traj: return self.log('home: nothing to undo')
        w = self.w; t0_, tg0, lk0 = self.traj[0]
        for k in {lock_key(L) for L in self.cur} - lk0: a_, b_ = k.split('|'); self.unlock(a_, b_)
        start = w.tgt.copy(); n = 40
        for s_ in range(1, n + 1):
            for m_ in range(len(w.ids)): w.tgt[m_ * 9:m_ * 9 + 7] = start[m_ * 9:m_ * 9 + 7] + (tg0[m_ * 9:m_ * 9 + 7] - start[m_ * 9:m_ * 9 + 7]) * s_ / n
            w.run(0.08)
        w.run(1.0)
        for k in lk0 - {lock_key(L) for L in self.cur}: a_, b_ = k.split('|'); self.lock(a_, b_)
        self.traj = self.traj[:1]; self.marks = []; self.log(f'home: back at the start, locks {[lock_key(L) for L in self.cur]}')

    def _wait_real(self, where, tol_mm, max_s):
        """Nischay 5 Nov: the real robot must match the ideal one before it goes in / locks. With a real robot or the split view's
        real copy on Sync, the ideal robot holds still here until the live feedback (real_sync.Feedback) says every part is within
        tol_mm of where it should be - the real one keeps correcting meanwhile. Nothing connected: no wait."""
        sy = self.sync
        if sy is None or not sy.has_feedback(): return True
        d = self.w.d; t0 = float(d.time)
        while float(d.time) - t0 < max_s:
            if sy.settled(tol_mm):
                if float(d.time) - t0 > 0.1: self.log(f'  waited {float(d.time) - t0:.1f} s at the {where} for the real robot to match (within {tol_mm} mm)')
                return True
            self.w.run(0.06)
        self.log(f'  real robot still off at the {where} after {max_s:.0f} s (feedback says {sy.fbk.err_mm} mm) - going on anyway')
        return False

    def _retwist_retry(self, a, b, first=False):
        """11 Nov ('help your partner'): docking into a LYING free module's side socket mostly fails (its rings stand on edge: the
        socket faces sideways 37 mm above the floor - reach map 1 of 32). Brain test: pre-twisting the target (T1 +90 or T2 +90)
        let the docking reach it and LOCK; -90 did not. The twist alone does not point the socket up - the coop docking then can.
        The target lies FREE, so a failed attempt pushes / rolls it (joints can be reset, its body cannot): the twist comes FIRST,
        before any attempt; the other twists are the fallbacks. Physics decides which one docks."""
        L = canon(a, b); tname = ref_name(L['a']) if 'module' in L['a'] else None
        if not tname or tname.split('.')[1] in ('A', 'B'): return False
        mt = tname.split('.')[0]; w = self.w
        if any(mt in lock_key(Lk) for Lk in self.cur): return False                 # not a lone free module
        i = w.ids.index(mt); start = getattr(self, '_connect_start_tgt', w.tgt.copy())   # back to how both stood when the dock began
        for jn, deg in (('T1', 90), ('T2', 90), ('T1', -90), ('T2', -90)):
            k = JN.index(jn); w.tgt[:] = start; w.tgt[i * 9 + k] = start[i * 9 + k] + math.radians(deg); w.run(3.0)
            self.log(f'  {mt} lies free with {tname} facing sideways: it twists {jn} {deg:+d} deg first (help the partner)')
            if self._connect(a, b): return True
        return False

    def connect(self, a, b):
        """docking runs on the bare servos: it steers by tiny corrections every 60 ms and must see them happen at once (5 Nov:
        with the smooth path on, 0 of 14 locked). The smooth path is for the user's own moves; it comes back afterwards."""
        comfort, self.w.comfort = getattr(self.w, 'comfort', None), None
        self._connect_start_tgt = self.w.tgt.copy()
        self._belief_n = 0
        try:
            while True:
                try: return (os.environ.get('RETWIST', '0') == '1' and self._retwist_retry(a, b, first=True)) or self._connect(a, b)
                except Manual.Replan: continue                              # the camera moved a free module's copy (_cam_belief)
        finally:
            self.w.comfort = comfort; self.w.cs = None                     # the smooth path starts again from where the servos are
            if self.sync is not None and hasattr(self.sync, 'end_follow'): self.sync.end_follow()

    def _connect(self, a, b):
        if os.environ.get('MANUAL_CONNECT', 'coop') == 'coop': return self.coop_connect(a, b)
        """pick who docks, pre-shape the group, then the docking brain does the last part and the lock"""
        from phys_dock import PhysDockEnv, dock
        w = self.w; L = canon(a, b); key = lock_key(L)
        cands = [L['b']] + ([L['a']] if 'module' in L['a'] and L['a']['port'] in ('A', 'B') else [])
        from phys_dock import dock_check
        bases = []
        for e in cands:                                               # the docking end's module must hold on with its OTHER end
            other = 'A' if e['port'] == 'B' else 'B'
            for x in self.cur:
                hit = [ref_name(oth) for me, oth in ((x['b'], x['a']), (x['a'], x['b'])) if me.get('module') == e['module'] and me.get('port') == other]
                if hit: bases.append((e, other, hit[0])); break
        # end<->end: either end can dock. 31 Oct: a placement where only M1 reaches was tried with M2 docking (155 mm short).
        # Take the first end whose dock the brain's check passes from where its module stands.
        ok_b = [x for x in bases if x[2].startswith('F:') and dock_check(PhysDockEnv(w, x[0]['module'], randomize=False), x[1], x[2],
                ref_name(L['a'] if x[0] is L['b'] else L['b']))['ok']]
        base = (ok_b or bases or [None])[0]
        if not base: return self.log(f'connect {a} + {b}: neither end can dock - its module must hold on with its other end (floor receiver or another module)')
        e, base_end, base_rx = base; target = ref_name(L['a'] if e is L['b'] else L['b'])
        dm, de = e['module'], e['port']; self.log(f'connect: {dm}.{de} docks into {target} (its base: End {base_end} in {base_rx})')
        standing = base_rx.startswith('F:')                           # its base is a floor receiver: the docking brain's own case
        if standing:
            # 31 Oct: the same dock locked 6/6 from a proven placement (brain only), 1/4 from here. The brain's maths says first
            # whether this dock can work from where the module stands; the pre-shape is skipped: on M1.B -> M2.S1B it bent B3 to
            # its 88 deg stop and swung End B into M2's other receiver (5.4 s), shoving M2 over. The brain swings by itself.
            chk = dock_check(PhysDockEnv(w, dm, randomize=False), base_end, base_rx, target)
            if not chk['ok']:
                turned = self._turn_target(dm, base_end, base_rx, target)
                if turned is not None: chk = dock_check(PhysDockEnv(w, dm, randomize=False), base_end, base_rx, target)
            if not chk['ok']:
                alt = [f"{target.split('.')[0]}.{p}" for p in ('S1A', 'S1B', 'S2A', 'S2B') if not target.endswith(p)
                       and dock_check(PhysDockEnv(w, dm, randomize=False), base_end, base_rx, f"{target.split('.')[0]}.{p}")['ok']]
                return self.log(f"connect {dm}.{de} -> {target}: NOT possible from here: {chk['why']}" + (f" - try {', '.join(alt)}" if alt else ' - no other receiver of that module works from here either'))
            self.log(f"  check: reachable from here (twist {chk['twist_deg']} deg) -> the docking brain swings and docks")
        for attempt in range(0 if standing else 7):                   # lying: move, measure (encoders), re-plan from where friction left it, move again
            qs, err, now = preshape(w, self.cur, dm, de, target, log=self.log)
            if now < 12 or attempt == 6: break
            t0 = {mid: w.tgt[w.ids.index(mid) * 9:w.ids.index(mid) * 9 + 7].copy() for mid in qs}
            standing = any('floor' in x['a'] for x in self.cur if x['b']['module'] in qs)
            if attempt == 0 and standing:                             # standing: straighten up and twist to face the target up in the air, THEN bend
                for s in range(1, 16):                                # (30 Oct: bending + twisting together put the end on the floor, T1 dragged it, stuck 26 deg)
                    for mid, q in qs.items():
                        i = w.ids.index(mid); mid_q = q.copy(); mid_q[[1, 2, 4, 5]] = 0.0
                        w.tgt[i * 9:i * 9 + 7] = t0[mid] + (mid_q - t0[mid]) * s / 15
                    w.run(0.16)
                t0 = {mid: w.tgt[w.ids.index(mid) * 9:w.ids.index(mid) * 9 + 7].copy() for mid in qs}
            n = 25 if attempt == 0 else 12
            for s in range(1, n + 1):                                 # coordinated, slow: the servos and the floor friction decide
                for mid, q in qs.items(): i = w.ids.index(mid); w.tgt[i * 9:i * 9 + 7] = t0[mid] + (q - t0[mid]) * s / n
                w.run(0.16)
            w.run(1.0)
            for r in range(4):                                        # the servos stop a little short under load: push each command past by its shortfall
                for mid, q in qs.items():
                    i = w.ids.index(mid); e_ = q - w.d.qpos[np.array(w.mod[mid]['qa'])]
                    w.tgt[i * 9:i * 9 + 7] = np.clip(w.tgt[i * 9:i * 9 + 7] + 0.8 * e_, q - 0.17, q + 0.17)
                w.run(0.8)
            lag = max(float(np.max(np.abs(w.d.qpos[np.array(w.mod[mid]['qa'])] - q))) for mid, q in qs.items())
            self.log(f'  pre-shape move {attempt + 1}: joints within {math.degrees(lag):.1f} deg of the plan' + (' (friction / a stop holds them back)' if lag > math.radians(10) else ''))
            for mid, q in qs.items():
                qm = w.d.qpos[np.array(w.mod[mid]['qa'])]; bad = [f'{JN[k]} plan {math.degrees(q[k]):.0f} is {math.degrees(qm[k]):.0f}' for k in range(7) if abs(q[k] - qm[k]) > math.radians(8)]
                if bad: self.log(f'    {mid} short: ' + ', '.join(bad))
        env = PhysDockEnv(w, dm, seed=self.seed * 7919 + len(self.lines), randomize=True)
        judge = {'off': 'touch', 'truth': True}.get(self.judge, 'touch')   # blind = feel the hole + spiral search
        lying = not any('floor' in x['a'] for x in self.cur if x['b']['module'] in group_of(w, self.cur, dm))   # nothing of its group stands in a floor receiver
        if lying: self.log('  the docking module lies on the floor: brain estimate without hanging-arm sag')
        bl = []; ok, info = dock(env, base_end, base_rx, target, judge=judge, log=bl.append, max_frames=int(os.environ.get('MANUAL_DOCK_FRAMES', '1800')), sag=not lying, hover_far=0.0 if lying else None)
        if not ok and standing:
            # 1 Nov: from the 'all standing' start M1.B -> M2.S1B passed the reach check but the arm got stuck 85 mm short (2/2).
            # The target turns to another angle that passes, the docker straightens, one more try.
            w.set_locks(self.cur); i_ = w.ids.index(dm); w.tgt[i_ * 9:i_ * 9 + 7] = 0.0; w.run(3.0)
            if self._turn_target(dm, base_end, base_rx, target, avoid_now=True) is not None:
                self.log('  dock failed from here: the target turned, trying again')
                env = PhysDockEnv(w, dm, seed=self.seed * 7919 + len(self.lines) + 1, randomize=True)
                bl += ['--- 2nd try ---']; ok, info = dock(env, base_end, base_rx, target, judge=judge, log=bl.append, max_frames=int(os.environ.get('MANUAL_DOCK_FRAMES', '1800')), sag=not lying, hover_far=0.0 if lying else None)
        info['log'] = bl + list(info.get('log', []))
        Lk = canon(f'{dm}.{de}', target)
        if ok: w.engage(Lk); self.cur.append(Lk); w.set_locks(self.cur)
        else: w.set_locks(self.cur)
        for l in info.get('log', [])[-6:]: self.log('    brain: ' + l.strip()[:140])
        self.log(f"  {'LOCKED' if ok else 'NOT locked'} {lock_key(Lk)}: gap {info['axial_mm']} mm, side {info['radial_mm']} mm, {info['seconds']} s" + (f", touching {info['touching']}" if info.get('touching') else ''))
        return ok

    # ---- what the Studio shows ----
    def ports(self):
        """every connector in Studio coordinates (metres): where, which way it faces, locked to what"""
        w = self.w; w._refresh_rx(); held = {}
        for L in self.cur: held.setdefault(ref_name(L['a']), ref_name(L['b'])); held.setdefault(ref_name(L['b']), ref_name(L['a']))
        out = []
        for x in w.rx:
            p = C.T @ (x['seat'] + (RX_TOP - RX_GAP) * x['z']); n = C.T @ x['z']
            out.append(dict(id=x['name'], kind=x['kind'], p=[round(float(v), 4) for v in p], n=[round(float(v), 3) for v in n], locked=held.get(x['name'])))
        return out

    def _port_points(self):
        """the connector dots of this moment, in ports() order (Studio coordinates): sent with every frame, so the Studio draws
        them in step with the robot (2 Nov: they came from 'now' while the robot was drawn ~0.6 s behind, so they ran ahead)"""
        w = self.w; w._refresh_rx()
        return [[round(float(v), 4) for v in C.T @ (x['seat'] + (RX_TOP - RX_GAP) * x['z'])] for x in w.rx]

    def state(self):
        w = self.w; d, m = w.d, w.m; mods = {}
        for mid in w.ids:
            qa = np.array(w.mod[mid]['qa']); a = w.mod[mid]['act']; i = w.ids.index(mid)
            mods[mid] = dict(q=[round(math.degrees(v), 1) for v in d.qpos[qa]], target=[round(math.degrees(v), 1) for v in w.tgt[i * 9:i * 9 + 7]],
                             load=[round(float(abs(d.actuator_force[x]) / abs(m.actuator_forcerange[x, 1])) * 100) for x in a],
                             lock=dict(target=[round(math.degrees(v), 1) for v in w.tgt[i * 9 + 7:i * 9 + 9]],
                                       q=[round(math.degrees(d.qpos[w.mod[mid]['lockq'][e]]), 1) for e in ('A', 'B')]))
        return dict(t=round(float(d.time), 2), job=self.job, queued=self.q.qsize(), paused=self.paused, steps=len(self.marks), saved=bool(getattr(self, 'slot', None)), locks=[lock_key(L) for L in self.cur], modules=mods, log=self.lines[-12:], sync=self.sync.state() if self.sync else None)

    def frames(self):
        rec = self.w.rec; fr = rec['frames']; rec['frames'] = []; return fr


def _close(S):
    S.alive = False
    if S.sync: S.sync.close()                                         # its boards stop being talked to as well
    if getattr(S.sync, 'twin', None): S.sync.twin.close()
    if getattr(S.sync, 'telw', None): S.sync.telw.close()


def start(scene, **kw):
    import uuid
    from real_sync import RealSync
    # close only ABANDONED sessions (no tab polled them for 30 s): evicting a watched one made two open Studio tabs restart each
    # other's setup in a loop (1 Nov: 3 modules chosen, the other tab's 2 kept coming back)
    for k_ in [k_ for k_, S_ in SESS.items() if time.time() - getattr(S_, 'seen', 0) > 30]:
        _close(SESS.pop(k_))
    while len(SESS) >= 6:
        _close(SESS.pop(next(iter(SESS))))
    S = Manual(scene, **kw)
    # Studio sessions move smoothly (Nischay 5 Nov): at most 60 deg/s, soft start and stop (phys_world._comfort)
    S.w.comfort = (math.radians(float(os.environ.get('SMOOTH_DEG_S', '60'))), math.radians(float(os.environ.get('SMOOTH_DEG_S2', '150'))))
    S.sync = RealSync(S.w); S.seen = time.time(); sid = uuid.uuid4().hex[:12]; SESS[sid] = S
    from phys_world import receivers_of
    return dict(id=sid, bodies=S.w.view_names, frame0=S.frame0, fps=S.fps, receivers=receivers_of(S.w, scene), ports=S.ports(), state=S.state())


def _quiet_s(S):
    """seconds since the slowest Sync'd board last answered"""
    hs = [L.heard for L in S.sync.links.values() if getattr(L, 'heard', 0)]
    return round(time.time() - min(hs), 1) if hs else None


def _start_real_world(S):
    """build the REAL robot's world (real_sync.Twin mode 'telemetry') in the background, like the copy"""
    job = S.telw_job = dict(t0=time.time(), error='')
    def build():
        from real_sync import Twin
        try: tl = Twin(S.scene, S.cur, lambda: (float(S.w.d.time), S.w.tgt.copy()), 1, S.log, mode='telemetry')
        except Exception as e: job['error'] = f'real robot world could not start: {type(e).__name__}: {e}'; return
        if S.telw_job is not job or not S.alive: tl.close(); return
        S.sync.telw = tl; S.log(f"REAL robot world on after {time.time() - job['t0']:.0f} s: your encoders + predicted plastic flex, physics puts it on the floor")
    threading.Thread(target=build, daemon=True).start()


def step(sid, wait=0.5):
    S = SESS.get(sid)
    if S is None: return dict(error='no such manual session (service restarted?)')
    S.seen = time.time()                                              # the Studio is watching it: the service is not replaced meanwhile
    time.sleep(max(0.0, min(2.0, float(wait))))
    tw = getattr(S.sync, 'twin', None); right = {}; job = getattr(S, 'twin_job', None)
    if job and not tw:                                                # still building (or failed)
        right = dict(twin=dict(starting=not job['error'], error=job['error'], elapsed=round(time.time() - job['t0'], 1)))
    if tw and job and job.get('init'): right['twin_init'] = job['init']   # the Studio prepares its drawing from these (sent until it has them)
    if tw and S.sync.on:
        # the split view's right half with Sync ON: the REAL robot, from its telemetry only (real_sync.RealSync._feed_real). It is
        # never swapped for the copy, not even for a missed reply (5 Nov: that swap was the 90 deg jump and the flicker): no
        # contact = its last real pose stays, and the box says so.
        tw.frames(); tl = getattr(S.sync, 'telw', None); live = S.sync.real_live()
        if tl is None or not tl.alive:
            if not getattr(S, 'telw_job', None) or S.telw_job.get('error'): _start_real_world(S)
            j = S.telw_job; right.update(twin=dict(starting=not j['error'], error=j['error'], elapsed=round(time.time() - j['t0'], 1), source='telemetry'))
        else:
            tst = tl.state(); tst['feedback'] = tw.state().get('feedback')
            right.update(twin_frames=S.sync.real_frames(), twin=dict(tst, source='telemetry', modules=sorted(live),
                         contact=bool(live), quiet_s=_quiet_s(S)))
    elif tw:
        S.sync.real_frames()
        right.update(twin_frames=tw.frames(), twin=dict(tw.state(), source='copy'))
    return dict(frames=S.frames(), t=round(float(S.w.d.time), 3), ports=S.ports(), state=S.state(), finite=bool(np.isfinite(S.w.d.qpos).all()), **right)


def command(sid, cmd):
    S = SESS.get(sid)
    if S is None: return dict(error='no such manual session')
    k = cmd.get('kind')
    if k == 'joints': S.joints(cmd['module'], cmd['joints']); return dict(ok=True)
    if k == 'sync':                                                   # the real-robot box: never queued, it must answer while a job runs
        return S.sync.command(cmd)
    if k == 'drag':                                                   # streams while the mouse moves: never queued
        if S.job: return dict(ok=False, error=f'busy: {S.job}')
        S.set_drag(cmd.get('end'), cmd.get('p')); return dict(ok=True)
    if k == 'stop': S.abort = True; return dict(ok=True)
    if k == 'twin':                                                   # the split view's right half: the real robot as Sync would drive it
        old = getattr(S.sync, 'twin', None)
        if old: old.close(); S.sync.twin = None
        tl = getattr(S.sync, 'telw', None)
        if tl: tl.close(); S.sync.telw = None
        S.telw_job = None
        S.twin_job = None
        if not cmd.get('on', True): return dict(ok=True, twin=None)
        # built in the BACKGROUND (5 Nov: 20-90 s on a busy laptop, and the Studio sat frozen with no sign of life): this answers at
        # once, the session keeps running, /manual/step reports 'starting' with the seconds so far, then twin_init + frames
        seed = int(cmd.get('seed', 1)); job = S.twin_job = dict(t0=time.time(), seed=seed, error='', init=None)
        def build():
            from real_sync import Twin, FB_MODE
            try: tw = Twin(S.scene, S.cur, lambda: (float(S.w.d.time), S.w.tgt.copy()), seed, S.log)
            except Exception as e: job['error'] = f'real copy could not start: {type(e).__name__}: {e}'; return
            if S.twin_job is not job or not S.alive: tw.close(); return    # switched off / closed meanwhile
            tw.fbk = S.sync.fbk; S.sync.twin = tw                         # the copy shows the live feedback's numbers
            job['init'] = dict(bodies=tw.w.view_names, frame0=tw.w.nominal_poses)
            S.log(f"REAL copy on after {time.time() - job['t0']:.0f} s: random robot #{seed}, sag + gear play + lock play + room, driven by Sync's angles + live feedback ({FB_MODE})")
        threading.Thread(target=build, daemon=True).start()
        return dict(ok=True, starting=True)
    if k == 'close': _close(SESS.pop(sid)); return dict(ok=True)
    if k in ('skill', 'back', 'home', 'save', 'restore'): S.q.put(cmd); return dict(ok=True, queued=S.q.qsize())
    if k == 'pause': S.paused = bool(cmd.get('on', True)); return dict(ok=True, paused=S.paused)
    if k in ('lock', 'unlock', 'connect'):
        try: canon(cmd['a'], cmd['b'])
        except ValueError as e: return dict(ok=False, error=str(e))
        S.q.put(cmd); return dict(ok=True, queued=S.q.qsize())
    return dict(ok=False, error=f'unknown command {k}')


if __name__ == '__main__':
    scenes = json.load(open(sys.argv[1])); sc = dict(scenes[sys.argv[2]]); a, b = sys.argv[3], sys.argv[4]
    if os.environ.get('NO_ANCHORS', '1') == '1' and not any('floor' in l['a'] for l in sc['locks']): sc['anchors'] = []
    from snap import Snapper
    # one name per run (8 Nov: three surfaces overwrote each other's pictures) and the log kept in a file next to them
    tag = (f'manual_{sys.argv[2]}_{a}_{b}_surf{int(float(os.environ.get("SURFACE_DEG", 0)))}_' + ('ideal' if os.environ.get('IDEAL') == '1' else f'seed{os.environ.get("SEED", "1")}')).replace('.', '').replace(':', '')
    logf = open(tpath(f'logs/{tag}.log'), 'w', encoding='utf-8')
    def say(*x): print(*x, flush=True); print(*x, file=logf, flush=True)
    t0 = time.time(); ID_ = os.environ.get('IDEAL') == '1'; S = Manual(sc, seed=int(os.environ.get('SEED', '1')), pace=False, judge=os.environ.get('JUDGE', 'off'), log=say, ideal=ID_, randomize=not ID_, disturb=not ID_)   # IDEAL=1: the perfect robot, same setup
    Sn = Snapper(S.w, os.environ.get('SHOTS', tpath('logs/snaps')), tag, every=float(os.environ.get('EVERY', '10')),
                 focus=[S.w.m.body(n).id for n in os.environ.get('FOCUS', '').split(',') if n])   # FOCUS=M1_EndB_LockModule,M2_srx0: close-ups of the dock
    if os.environ.get('EVERY'):                                        # pictures while it works (EVERY=1 -> one per sim second), the last log line as caption
        _ot = S.w.on_tick; S.w.on_tick = lambda: (_ot() if _ot else None, Sn.tick(str(S.lines[-1])[7:107] if S.lines else ''))
    S.w.run(2.0); print('picture', Sn.shot('start'))
    ok = S.connect(a, b); S.w.run(3.0)
    say('picture', Sn.shot(f'connect {a} + {b}: locks {[lock_key(L) for L in S.cur]}'))
    say(f'RESULT {tag}: {"LOCKED" if ok else "NOT locked"} | wall {time.time() - t0:.0f} s | log data/logs/{tag}.log')
