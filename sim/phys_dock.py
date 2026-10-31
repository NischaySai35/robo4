"""phys_dock.py — the REAL docking brain (walk.py Walker + laptop_controller.DockController, the code the robot
runs) driving one module inside phys_world.PhysWorld. Same interface as gpu_multi_dock.Proxy / MultiEnv, so the
Walker runs unchanged: sag-aware IK, hover, simulated camera judge, straight-in, lock-stall recovery.

Use:  env = PhysDockEnv(world, 'M1');  ok, info = dock(env, base_end='A', base_rx='F:F0', target_rx='M2.S1A')"""
import io, os, math, contextlib, collections, numpy as np
from phys_world import PhysWorld, LOCK_SIGN
import disturb as DIST
from tetro_env2 import RX_GAP
import mujoco
BELIEF = os.environ.get('BELIEF', 'truth')      # 'model': the brain sees other receivers the way a real robot can without a camera (ModelBelief)
ENC_NOISE, ENC_STEP = 0.0015, 0.001534         # ST3215 encoder: ~1.5 mrad noise, 4096 steps/turn


class ModelBelief:
    """what the robot can KNOW without a camera (29 Oct: the brain read the true pose of its base receiver, cardboard tilt
    included, and of a target receiver on another module, every frame):
      a floor receiver = where the board map puts it (its cardboard play unknown)
      a body of another module = that module's end locked in a floor receiver, on the map, + the module's NOMINAL kinematics
      (no sag, no backlash) at its encoder readings. None if the module has no floor anchor."""

    def __init__(self, world, rng):
        self.w, self.rng = world, rng; m = world.m
        self.d0 = mujoco.MjData(m); mujoco.mj_kinematics(m, self.d0)       # the board map (qpos0: no cardboard play)
        self.dk, self._at = {}, {}
        self.ends = {mid: {e: m.body(f'{mid}_End{e}_LockModule').id for e in 'AB'} for mid in world.ids}

    def kin(self, mid):
        """module mid's nominal kinematics at ONE encoder reading per sim instant"""
        w = self.w; m = w.m; dk = self.dk.setdefault(mid, mujoco.MjData(m)); t = float(w.d.time)
        if self._at.get(mid) != t:
            qa = np.array(w.mod[mid]['qa']); dk.qpos[:] = m.qpos0
            dk.qpos[qa] = np.round((w.d.qpos[qa] + self.rng.normal(0, ENC_NOISE, len(qa))) / ENC_STEP) * ENC_STEP   # its encoders, not the truth
            mujoco.mj_kinematics(m, dk); self._at[mid] = t
        return dk

    @staticmethod
    def rel(dd, b_from, b_to):
        Rf, pf = dd.xmat[b_from].reshape(3, 3), dd.xpos[b_from]; return Rf.T @ dd.xmat[b_to].reshape(3, 3), Rf.T @ (dd.xpos[b_to] - pf)

    def body_pose(self, bid):
        w = self.w; m, d = w.m, w.d; mid = m.body(bid).name.split('_')[0]
        if mid not in w.ids: return self.d0.xmat[bid].reshape(3, 3).copy(), self.d0.xpos[bid].copy()    # a floor receiver: the map
        for k in w.engaged:
            (dm, de), recv = w.lock_defs[k]['dock'], w.lock_defs[k]['recv']
            if dm != mid or not recv.startswith('F_'): continue
            rb, eb = m.body(recv).id, self.ends[mid][de]
            R_re, p_re = self.rel(d, rb, eb)                          # locked: the end's pose in its receiver is fixed by the design
            Rm, pm = self.d0.xmat[rb].reshape(3, 3), self.d0.xpos[rb]; R_e, p_e = Rm @ R_re, pm + Rm @ p_re
            R_eb, p_eb = self.rel(self.kin(mid), eb, bid)
            return R_e @ R_eb, p_e + R_e @ p_eb
        return None


class PhysDockEnv:
    """the moving module of a PhysWorld, seen the way the Walker sees a robot"""

    def __init__(self, world: PhysWorld, mid: str, seed: int = 1, randomize: bool = True):
        w = self.world = world; m = w.m; self.mid = mid; self.i = w.ids.index(mid)
        self.rng = r = np.random.default_rng(seed)
        R = w.mod[mid]
        self.qa = np.array(R['qa'])
        self.end = {e: dict(tip=R['end'][e]['tip'], body=R['end'][e]['body'], mags=R['end'][e]['mags'], lockq=R['lockq'][e]) for e in 'AB'}
        jn = [m.actuator_trnid[a, 0] for a in R['act']]
        self.lo = np.array([m.jnt_range[j][0] for j in jn]) * 0.98; self.hi = -self.lo
        self.links = [m.body(f'{mid}_{n}').id for n in ['T1_Housing_B1Fork', 'Spine1_B1B2', 'T2_Housing_B2Fork_GROUND', 'T2_Ring_B3Fork', 'Spine2_B3B4', 'T3_Housing_B4Fork']]
        self.d = w.d; self.m = m
        # sensor and command imperfections, the GPU runs' ranges
        self.delay = int(r.integers(1, 4)) if randomize else 1
        self.noise = r.uniform(0.0005, 0.003) if randomize else 0.0015
        self.obs_lag = int(r.integers(0, 3)) if randomize else 1
        self.rx = [dict(name=x['name']) for x in w.rx]
        self.belief = ModelBelief(w, np.random.default_rng(seed + 31)) if BELIEF == 'model' else None
        self.rx_bias = []
        for _ in w.rx:
            b = r.normal(0, 0.0007, 3) if randomize else np.zeros(3); nb = np.linalg.norm(b)
            if nb > 0.0015: b *= 0.0015 / nb
            self.rx_bias.append(b)
        self._sync_rx()
        q0 = self.d.qpos[self.qa].copy()
        self.cmd = q0.copy(); self.queue = collections.deque([q0.copy()] * self.delay, maxlen=self.delay + 1)
        self.qhist = collections.deque(maxlen=4); self.qhist.append(self._meas())
        self.t = 0; self.mag_force = {'A': 0.0, 'B': 0.0}

    def _sync_rx(self):
        """receiver frames the controller needs: seat (gap floor), z (outward), R (x = a PAD), o (back face)"""
        w = self.world; w._refresh_rx(); d = w.d
        for k, x in enumerate(w.rx):
            seat, z, R = x['seat'], x['z'], x['R']
            if self.belief is not None and x['mod'] != self.mid:                 # what it can know, not the truth (BELIEF=model)
                bp = self.belief.body_pose(x['bid'])
                if bp is not None: seat, z, R = w.rx_frame(x, *bp)
            self.rx[k].update(seat=seat.copy(), z=z.copy(), R=R.copy(), o=seat - RX_GAP * z)

    def index(self, name): return [x['name'] for x in self.rx].index(name)
    def lock_sign(self, e): return LOCK_SIGN[e]
    def _meas(self):
        q = self.d.qpos[self.qa] + self.rng.normal(0, self.noise, 7); return np.round(q / 0.001534) * 0.001534
    def measured(self): return self.qhist[max(0, len(self.qhist) - 1 - self.obs_lag)].copy()

    def step(self, cmd, lockA_deg, lockB_deg, extra_force=None):
        """one 60 ms controller frame: command this module's 7 joints + its 2 lock rotors; the world runs on"""
        w = self.world
        self.cmd = np.clip(cmd, self.lo, self.hi); self.queue.append(self.cmd.copy())
        o = 9 * self.i
        if not (w.disturb is not None and self.rng.random() < DIST.PACKET_LOSS):     # a lost packet: the servos keep the old command
            w.tgt[o:o + 7] = self.queue[0]
            w.tgt[o + 7] = math.radians(lockA_deg) * LOCK_SIGN['A']; w.tgt[o + 8] = math.radians(lockB_deg) * LOCK_SIGN['B']
        ok = w.run(0.06, extra=extra_force)[1]
        self.t += 1; self.qhist.append(self._meas()); self._sync_rx()
        return self.status(ok)

    def status(self, ok=True):
        d = self.d; zl = min(d.xpos[b][2] for b in self.links)
        return dict(ok=bool(ok and np.isfinite(d.qpos).all()), lowest_link_mm=zl * 1000, t=self.t)

    def end_vs_rx(self, e, i):
        d = self.d; RX = self.world.rx[i]            # the physics truth (scoring), not what the brain believes
        r = end_rel(d.site_xpos[self.end[e]['tip']], d.xmat[self.end[e]['body']].reshape(3, 3), RX['seat'], RX['z'], RX['R'])
        return dict(**r, lock_deg=math.degrees(abs(d.qpos[self.end[e]['lockq']])))


def end_rel(p, Re, seat, z, Rrx):
    """an end's pad tip p / body frame Re against a receiver (seat, outward z, frame Rrx): along the axis, off the axis, pad twist.
    Used by the truth (end_vs_rx) and by the camera judge (cam_judge.py) on its own estimates."""
    rel = p - seat; ax = float(rel @ z); rad = float(np.linalg.norm(rel - ax * z))
    a = math.atan2(Re[:, 0] @ Rrx[:, 1], Re[:, 0] @ Rrx[:, 0]) - math.pi / 4; sl = (a + math.pi / 4) % (math.pi / 2) - math.pi / 4
    return dict(axial_mm=ax * 1000, radial_mm=rad * 1000, slot_deg=math.degrees(sl))


def dock(env: PhysDockEnv, base_end: str, base_rx: str, target_rx: str, max_frames=None, judge=True, log=None, hover_far=None, sag=True):
    """The Walker docks the module's free end into target_rx, its base end sitting in base_rx. Returns (ok, info)."""
    with contextlib.redirect_stdout(io.StringIO()):
        import walk as WK
    logs = []
    max_frames = max_frames or (1800 if judge == 'touch' else 900)   # searching by feel takes longer
    lg = log or logs.append
    bj, tj = env.index(base_rx), env.index(target_rx)
    # receivers on another module (spine side / an end): the handoff's settings for those docks (11, 17):
    # stand off 5 cm along the normal first (don't hit the partner's spine), looser 'arm caught up' gate for stretched poses
    L = WK.L; saved = (L.HOVER_FAR, L.LAG_TOL)
    if not target_rx.startswith('F:'): L.HOVER_FAR, L.LAG_TOL = (0.05 if hover_far is None else hover_far), 0.015
    # sag=False: the module LIES on the floor, which carries it - the brain's hanging-arm sag estimate would be wrong (30 Oct: 17 mm)
    W = WK.Walker(env, base_end, bj, 0, env.world.m.opt.gravity.copy() * (1.0 if sag else 1e-6), log=lg)
    W.k = _base_slot(env, base_end, bj, W)
    W.debug = os.environ.get('DOCK_DEBUG') == '1'                     # trace: brain estimate vs truth every 40 frames
    if env.world.rx[bj]['kind'] == 'end':
        # base = an END<->END lock (30 Oct, closing a lying chain into a loop): slot_frame's receiver convention does not fit an end mate
        # (the brain started 156 mm / 34 deg off). The base end is rigidly locked: take its frame from that end itself.
        def M_end(W=W, e=base_end):
            d = env.d; Tb = WK.H(d.xmat[env.end[e]['body']].reshape(3, 3).copy(), d.site_xpos[env.end[e]['tip']].copy())
            Tv = Tb if e == 'A' else Tb @ WK.H(WK.F, np.zeros(3))
            return WK.T_NOMA @ np.linalg.inv(Tv)
        W.M = M_end
    if judge is True: W.judge_fn = W.sim_camera                     # the old judge: physics truth + 1 mm noise
    elif judge == 'touch': W.judge_fn = TouchJudge(env, W).judge     # blind: feel the hole with the encoders, spiral search
    elif judge:                                                      # a real (image-based) camera: cam_judge.CameraJudge, optional, switchable
        W.judge_fn = lambda stage, C: judge.judge(env, W, stage, C); W.judge_on = judge.on
    mv = W.moving
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        C = W._ctrl(tj); locks, done = W.dock_fns(mv)
        if not sag and os.environ.get("LYING_JMASK", "0") == "1": C.jmask = np.array([0.0, 0.2, 1.0, 0.6, 1.0, 1.0, 1.0])   # lying: fine moves with the joints near the docking end (short, light), not the whole module across the floor
        if not sag: C.seed = C.qik.copy(); C.swung = True                          # no swing to a fresh IK start: the pre-shape already put it at the stand-off
        if judge == 'touch': C.max_retries = len(TouchJudge.SPIRAL)
        C.follow_base = not base_rx.startswith('F:')        # base in another module's receiver: it moves, targets must follow (walk.py BASE_FOLLOW)
        C.follow_target = not target_rx.startswith('F:')    # target on another module: it moves too (walk.py TARGET_FOLLOW)
        ran = W._run(C, locks, done, max_frames, f'dock End {mv} -> {target_rx}')
    L.HOVER_FAR, L.LAG_TOL = saved
    # what did the docking module run into? (other modules' bodies; its target receiver excluded)
    m, d = env.m, env.d; mine = {i for i in range(m.nbody) if m.body(i).name.startswith(env.mid + '_')}
    hits = {}
    for c in d.contact[:d.ncon]:
        b1, b2 = int(m.geom_bodyid[c.geom1]), int(m.geom_bodyid[c.geom2])
        if (b1 in mine) != (b2 in mine):
            other = m.body(b2 if b1 in mine else b1).name
            if other != 'world' and not other.startswith('F_'): hits[other] = min(hits.get(other, 0.0), float(c.dist))
    r = env.end_vs_rx(mv, tj)
    ok = bool(ran and abs(r['axial_mm']) < 0.8 and r['radial_mm'] < 1.5 and r['lock_deg'] > 40)
    info = dict(ok=ok, end=mv, touching={k: round(v * 1000, 1) for k, v in hits.items()}, **{k: round(float(v), 2) for k, v in r.items()}, seconds=round(env.t * 0.06, 1),
                log=(logs + [s for s in buf.getvalue().splitlines() if 'judge' in s or 'aligned' in s or 'seat' in s])[-25:])
    return ok, info


class TouchJudge:
    """BLIND judge by feel, like finding a keyhole in the dark (real robot: ST3215 position feedback, no camera).
    hover / mid: no information (None). seat: the controller believes the end is at the seat; if the joints could not
    reach their commanded pose the end is resting on the rim, not in the hole (encoder shortfall along the axis, through
    the nominal model). Not in -> try the next point of a spiral around the believed axis (the controller backs off,
    shifts by -d and goes in again)."""
    PROBE = 0.005
    SPIRAL = [(0.004, 0), (0, 0.004), (-0.004, 0), (0, -0.004), (0.006, 0.006), (-0.006, 0.006), (-0.006, -0.006), (0.006, -0.006), (0.010, 0), (-0.010, 0)]

    def __init__(self, env, W):
        self.env, self.W, self.k, self.at = env, W, 0, np.zeros(3); self.probing = False; self.missed_d = None

    def judge(self, stage, C):
        if stage != 'seat': return None
        e, W = self.env, self.W
        p_cmd, _ = C.pose(W.nq(e.cmd)); p_meas, _ = C.pose(W.nq(e.measured()))
        short = float((p_meas - p_cmd) @ C.z)                       # > 0: stopped short of where it was told to go
        if self.missed_d is not None:                                 # a miss found by the probe: hand the search step over at the retry
            if C.wait < 20: return False, np.zeros(3)
            d, self.missed_d = self.missed_d, None; return False, d
        if self.probing:                                              # probed 5 mm deeper: in the hole it stops at the floor
            self.probing = False
            if short > 0.003: W.log(f'  touch: probe stopped {short * 1000:.1f} mm short = on the receiver floor -> seated'); return True, np.zeros(3)
            C.push_extra = getattr(C, 'push_extra', 0.0) - self.PROBE
            W.log(f'  touch: probe went in freely ({short * 1000:.1f} mm short) = free air, it missed -> search on')
            self.missed_d = self._spiral(C, W); return False, np.zeros(3)
        if short < 0.0015:                                            # reached the seat depth: in the hole, or past the rim in the air?
            self.probing = True; C.deeper = 0
            W.log('  touch: reached the seat depth -> probe 5 mm deeper (in the hole it hits the floor)')
            return False, self.PROBE * C.z                            # the controller's push-deeper goes in by this
        if C.wait < 20 or self.k >= len(self.SPIRAL): return False, np.zeros(3)   # still settling (asked every frame) / spiral used up
        dev = p_meas - p_cmd; lat = dev - (dev @ C.z) * C.z
        if np.linalg.norm(lat) > 0.001:                               # the chamfer pushed the end sideways: the hole is that way
            d = -2.0 * lat; self.at = self.at - d
            W.log(f'  touch: {short * 1000:.1f} mm short (on the rim), pushed {np.linalg.norm(lat) * 1000:.1f} mm sideways -> follow the push')
            return False, d
        W.log(f'  touch: {short * 1000:.1f} mm short of the seat (on the rim)')
        return False, self._spiral(C, W)

    def _spiral(self, C, W):
        if self.k >= len(self.SPIRAL): return np.zeros(3)
        u = C.Ro[:, 0]; v = np.cross(C.z, u); a, b = self.SPIRAL[self.k]; nxt = a * u + b * v; self.k += 1
        d = -(nxt - self.at); self.at = nxt                           # the controller shifts its aim by -d
        W.log(f'  touch: spiral try {self.k}: {a * 1000:+.0f}/{b * 1000:+.0f} mm around the first aim'); return d


def _base_slot(env, base_end, bj, W):
    """which of the 4 slots the base end sits in (snap the measured angle, as walk.py does after a dock)"""
    d = env.d; Rb = d.xmat[env.end[base_end]['body']].reshape(3, 3); Rr = env.rx[bj]['R']
    xw = Rb[:, 0] if base_end == 'A' else Rb[:, 0]
    ang = math.degrees(math.atan2(xw @ Rr[:, 1], xw @ Rr[:, 0]))
    return int(round((ang - 45) / 90)) % 4


_STEP_TO_SRC = {}


def peel_after_dock(env: PhysDockEnv, docked_end: str, new_rx: str, old_rx: str, log=None, debug=False):
    """The robot's own walk.py sequence after a dock: the end that just locked becomes the base, the OLD base end unlocks,
    peels about its rim and pulls 25 mm out of its receiver. Uses walk.py's code itself (taken from Walker.step_to), so it
    stays identical to what the robot runs. Returns (pulled_out, log lines)."""
    import inspect, textwrap
    with contextlib.redirect_stdout(io.StringIO()):
        import walk as WK
    if 'src' not in _STEP_TO_SRC: _STEP_TO_SRC['src'] = inspect.getsource(WK.Walker.step_to)   # read ONCE per process: an edit to walk.py during a run must not leak into running robots
    src = _STEP_TO_SRC['src']
    tail = textwrap.dedent(src[src.index('        # which of the 4 pad orientations'):])
    hold = int(os.environ.get('PULL_HOLD_FRAMES', '20'))
    if hold != 20: tail = tail.replace('return hold2[0] >= 20', f'return hold2[0] >= {hold}').replace("'pull End %s out of rx%d' % (old_base, old_rx)): return False", "'pull End %s out of rx%d' % (old_base, old_rx)): pass")
    ns = dict(WK.__dict__)
    exec('def _tail(self, e, mv, rx_j, t0):\n' + textwrap.indent(tail, '    '), ns)
    logs = []
    base = 'A' if docked_end == 'B' else 'B'
    W = WK.Walker(env, base, env.index(old_rx), 0, env.world.m.opt.gravity.copy(), log=(log or logs.append))
    W.k = _base_slot(env, base, env.index(old_rx), W)
    W.debug = bool(debug)
    W.last_cmd = env.d.qpos[env.qa].copy() if base == 'A' else env.d.qpos[env.qa][::-1].copy()
    if base == 'B': W.last_cmd = env.d.qpos[env.qa].copy()
    # UNLOCK FIRST, CHECKED: turn the old end's rotor open and wait until the lock servo READS open (< 3 deg, up to 3 s)
    # before pulling. walk.py gives it 12 frames; in a structure the end is pressed into its receiver and the rotor turns
    # slower (measured: still 12 deg after 0.5 s -> fins under the lips -> the pull-out jammed at 1-2 mm).
    old_end = base; hold = env.d.qpos[env.qa].copy()
    for _ in range(50):
        la, lb = (0.0, 45.0) if old_end == 'A' else (45.0, 0.0)
        env.step(hold, la, lb)
        if abs(math.degrees(env.d.qpos[env.end[old_end]['lockq']])) < 3: break
    (log or logs.append)(f'  End {old_end} lock reads {abs(math.degrees(env.d.qpos[env.end[old_end]["lockq"]])):.1f} deg after {env.t} frames (open < 3)')
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        out = ns['_tail'](W, env, docked_end, env.index(new_rx), env.t)
    return bool(out), logs
