
"""TETROBOT inchworm walking over floor connectors (sim test harness + the logic the real robot will run).
Cycle: dock free end -> lock 45 -> unlock old base -> pull it straight out 25 mm -> swing over -> dock next -> swap roles.
End B as base uses the SAME verified docking controller with the joints in reverse order (module proved symmetric)."""
from paths import tpath
import sys, math, io, contextlib, numpy as np, mujoco
mujoco.set_mju_user_warning(lambda m: None)
sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
with contextlib.redirect_stdout(io.StringIO()):
    import laptop_controller as L
from tetro_env2 import RX_TOP, RX_GAP
F = np.diag([-1.0, -1.0, 1.0]); LIFT = 0.025
SWING_ROTATE = __import__('os').environ.get('SWING_ROTATE', '1') == '1'   # swing by turning the base twist, keep the curled shape (no standing up)
LOCK_RETRIES = int(__import__('os').environ.get('LOCK_RETRIES', '3'))   # lock-stall recovery attempts (0 = off, old behaviour)
PULL_CONVERGE = __import__('os').environ.get('PULL_CONVERGE', '1') == '1'   # pull-out holds only once the estimate reached the target (0 = old, timed)
BASE_FOLLOW = __import__('os').environ.get('BASE_FOLLOW', '1') == '1'       # peel/pull targets follow a MOVING base (spine receiver); floor bases: no change
TARGET_FOLLOW = __import__('os').environ.get('TARGET_FOLLOW', '1') == '1'   # docks into ANOTHER module's receiver re-aim at it every frame (0 = old: frozen)
FOLLOW_CHECK = __import__('os').environ.get('FOLLOW_CHECK', '1') == '1'     # stop a move when the arm cannot follow its commands for 2 s (0 = old: wait for the frame limit)
def H(R, p): M = np.eye(4); M[:3, :3] = R; M[:3, 3] = p; return M
_d = mujoco.MjData(L.NOM.m); mujoco.mj_kinematics(L.NOM.m, _d)
T_NOMA = H(_d.xmat[L.NOM.m.body('EndA_LockModule').id].reshape(3, 3).copy(), _d.site('A_padtip').xpos.copy())   # ideal A tip frame in controller coords
def slot_frame(Rrx, k, end):
    # end body frame when seated: End A's +y points OUT of the receiver, End B's +y points INTO it (its pads are on +y)
    a = math.radians(45 + 90 * k); x = Rrx @ np.array([math.cos(a), math.sin(a), 0]); y = Rrx[:, 2] * (1.0 if end == 'A' else -1.0)
    return np.stack([x, y, np.cross(x, y)], 1)
class Walker:
    def __init__(self, env, base, base_rx, k, g_meas, log=print):
        self.e, self.base, self.base_rx, self.k, self.g, self.log = env, base, base_rx, k, g_meas, log
        self.last_cmd = env.cmd.copy()
    @property
    def moving(self): return 'B' if self.base == 'A' else 'A'
    def nq(self, q): return q.copy() if self.base == 'A' else q[::-1].copy()
    def M(self):
        e = self.e; Rb = slot_frame(e.rx[self.base_rx]['R'], self.k, self.base)
        Tb = H(Rb, e.rx[self.base_rx]['seat'] + e.rx_bias[self.base_rx])          # what the robot believes (hand-measured map)
        Tv = Tb if self.base == 'A' else Tb @ H(F, np.zeros(3))
        return T_NOMA @ np.linalg.inv(Tv)
    def _ctrl(self, rx_j):
        e = self.e; M = self.M(); RM = M[:3, :3]; tf = lambda p: (M @ np.r_[p, 1.0])[:3]
        RX = e.rx[rx_j]; seat_w = RX['seat'] + e.rx_bias[rx_j]
        hover = tf(seat_w + (RX_TOP - RX_GAP + L.STANDOFF) * RX['z']); seat = tf(seat_w)
        q0 = self.nq(self.last_cmd)
        with contextlib.redirect_stdout(io.StringIO()):
            C = L.DockController(hover, seat, RM @ RX['z'], RM @ RX['R'], L.STANDOFF, q0, gravity=RM @ self.g)
        C.out = q0.copy(); C._M = M; C._rx = rx_j
        if getattr(self, 'judge_fn', None): C.judge = lambda stage, C_: self.judge_fn(stage, C_)
        return C
    def sim_camera(self, stage, C, sigma=0.001):
        """Simulated camera judge: real tip position (+1 mm noise) vs where the controller is aiming, in controller coords."""
        e = self.e; mv = self.moving; pt = e.d.site_xpos[e.end[mv]['tip']]
        ptn = (C._M @ np.r_[pt, 1.0])[:3] + e.rng.normal(0, sigma, 3)
        # like a real camera: measured against the REAL connector, not against our corrected aim point
        if stage == 'hover':
            Rw = e.d.xmat[e.end[mv]['body']].reshape(3, 3); n_w = Rw[:, 1] if mv == 'B' else -Rw[:, 1]     # end normal pointing into the receiver
            n = C._M[:3, :3] @ n_w; tau = np.cross(n, -C.z) + e.rng.normal(0, math.radians(0.3), 3)          # rotation that brings it onto the axis (+-0.3 deg)
            tau -= (tau @ C.z) * C.z
            return ptn - C.hover, math.radians(e.end_vs_rx(mv, C._rx)['slot_deg'] + e.rng.normal(0, 0.5)), tau   # camera: position, twist, tilt
        if stage == 'mid':                                                         # going in: where is the real end vs the line it should be on
            return ptn - (C.seat + C.appr * C.z)
        r = e.end_vs_rx(mv, C._rx); seated = abs(r['axial_mm'] + e.rng.normal(0, 0.15)) < 0.6 and r['radial_mm'] < 1.5   # fins need < ~0.6 mm (0.3 mm clearance)
        return seated, ptn - C.seat
    def _run(self, C, lock_fn, done_fn, max_frames, tag):
        e = self.e
        for t in range(max_frames):
            jo = getattr(self, 'judge_on', None)
            if jo is not None and not getattr(C, 'via', False):
                # an OPTIONAL camera (cam_judge.py) can be switched on/off at any moment: without it the controller runs exactly
                # its encoders-only path (its gates differ with a judge), with it the next check uses the camera
                C.judge = (lambda stage, C_: self.judge_fn(stage, C_)) if jo() else None
            if getattr(C, 'follow_base', False) and BASE_FOLLOW:
                # the base sits in ANOTHER MODULE's receiver, which moves as loads shift: keep the target fixed in the world
                # (controller coords ride on the base). Set only by docks whose base is not a floor receiver; walking: never.
                Mn = self.M(); D = Mn @ np.linalg.inv(C._M); R_, t_ = D[:3, :3], D[:3, 3]
                C.hover = R_ @ C.hover + t_; C.seat = R_ @ C.seat + t_; C.z = R_ @ C.z; C.Ro = R_ @ C.Ro; C.shift = R_ @ C.shift
                if hasattr(C, 'zt'): C.zt = R_ @ C.zt
                C._M = Mn; L.NOM.m.opt.gravity[:] = Mn[:3, :3] @ self.g
            if getattr(C, 'follow_target', False) and TARGET_FOLLOW and getattr(C, '_rx', None) is not None:
                # the TARGET receiver sits on another module (bent, springy, pushed by our own docking): aim at where it is NOW,
                # not where it was when the dock started (28 Oct, Studio T plan in physics: went in 13.3 mm sideways and missed).
                # Real robot: the target module's encoders + sag model give its receiver pose (the camera judge checks it).
                RX = e.rx[C._rx]; sw = RX['seat'] + e.rx_bias[C._rx]; Mc = C._M; tf = lambda p: (Mc @ np.r_[p, 1.0])[:3]
                C.hover = tf(sw + (RX_TOP - RX_GAP + L.STANDOFF) * RX['z']); C.seat = tf(sw); C.z = Mc[:3, :3] @ RX['z']   # NOT C.Ro: it carries the camera's twist correction
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                cn, lk = C.step(self.nq(e.measured()))
            for s in buf.getvalue().splitlines():                         # keep the controller's decisions (judge, seat, lock) in the log
                if s.strip(): self.log('    t=%d %s' % (t, s.strip()))
            cmd = cn if self.base == 'A' else cn[::-1]
            if not hasattr(self, 'q_step0'): self.q_step0 = cmd.copy(); self.jtrav = 0.0
            self.jtrav += float(np.abs(cmd - getattr(self, 'last_cmd', cmd)).sum()); self.last_cmd = cmd.copy()   # joint travel (detour / weird-shape check)
            tw = np.degrees(np.abs(cmd[[0, 3, 6]])); self.twmax = np.maximum(getattr(self, 'twmax', np.zeros(3)), tw)   # twist joints T1, T2, T3
            la, lb = lock_fn(lk)
            st = e.step(cmd, la, lb)
            self.hmax = max(getattr(self, 'hmax', 0.0), float(e.d.site_xpos[e.end[self.moving]['tip']][2]))   # free-end height (standing-up check)
            if not st['ok'] or st['lowest_link_mm'] < 12: self.log('  %s: CRASH (link hit the floor or physics blew up) at frame %d' % (tag, t)); return False
            if FOLLOW_CHECK and not getattr(C, 'via', False):
                # NO PROGRESS while lining up: same phase, no new camera check, no retry for 21 s -> this attempt is stuck
                # (28 Oct: after a miss on a moving target the shifted hover point was never settled at; the brain waited 42 s)
                sig_ = (id(C), C.phase, getattr(C, 'hchecks', 0), getattr(C, 'retries', 0))
                if sig_ != getattr(self, '_prog_sig', None): self._prog_sig, self._prog_t = sig_, t
                elif C.phase == 0 and t - self._prog_t >= 350:
                    self.log('  %s: NO PROGRESS lining up for 21 s at frame %d (phase 0, %d camera checks, %d retries) -> give up this attempt' % (tag, t, sig_[2], sig_[3]))
                    self._prog_sig = None; return False
            if FOLLOW_CHECK:
                # ARM CANNOT FOLLOW (servo position feedback, the real robot has it): a joint stays > 6 deg from its command and the
                # joints are not moving, for 2 s -> too weak or blocked. Give up this move now instead of waiting for the frame limit
                # (28 Oct, disturbed world: a module left sideways waited 90 s for an arm that could not lift itself).
                qm = e.measured(); hist = self.__dict__.setdefault('_qm_hist', [])
                hist.append(qm); del hist[:-11]
                lagging = float(np.abs(cmd - qm).max()) > math.radians(6)
                still = len(hist) == 11 and float(np.abs(hist[-1] - hist[0]).max()) < math.radians(0.5)
                self._nofollow = getattr(self, '_nofollow', 0) + 1 if (lagging and still) else 0
                if self._nofollow >= 33:
                    k = int(np.argmax(np.abs(cmd - qm)))
                    self.log('  %s: ARM CANNOT FOLLOW at frame %d: joint %d is %.0f deg from its command and not moving for 2 s (too weak or blocked)' % (tag, t, k, math.degrees(abs(cmd[k] - qm[k]))))
                    self._nofollow = 0; self._qm_hist = []; self.cannot_follow = True; return False
            if getattr(self, 'debug', False) and t % 40 == 0:
                Minv = np.linalg.inv(self.M()); pn, nn, xn = L.NOM._fk(self.nq(e.measured())); pw = (Minv @ np.r_[pn, 1.0])[:3]
                mv = self.moving; pt = e.d.site_xpos[e.end[mv]['tip']]; hw = (Minv @ np.r_[C.hover, 1.0])[:3]
                self.log('    [%s t=%3d] phase %d swung %s | est-vs-true tip %.1f mm | true tip to hover %.1f mm | est tip to hover %.1f mm | true tip z %.0f mm | cmd %s' % (tag, t, C.phase, getattr(C, 'swung', '?'), 1000*np.linalg.norm(pw-pt), 1000*np.linalg.norm(pt-hw), 1000*np.linalg.norm(pn-C.hover), pt[2]*1000, np.round(np.degrees(cmd)).astype(int)))
            if done_fn(C, lk): return True
            if t in (400, 800, 1200):
                pt = e.d.site_xpos[e.end[self.moving]['tip']]
                self.log('    t=%d still at it (%s): phase %d, hover checks %d, retries %d, lock cmd %.0f, measured lock %.0f deg, tip z %.0f mm' % (
                    t, tag, C.phase, getattr(C, 'hchecks', -1), getattr(C, 'retries', -1), lk, abs(math.degrees(e.d.qpos[e.end[self.moving]['lockq']])), pt[2] * 1000))
        self.log('  %s: timed out after %d frames' % (tag, max_frames)); return False
    def _via(self, point_w, rx_j, tag, swing):
        """Move the free end to a waypoint (world) pointing down, gentle limits. swing=True: joint-space swing to its IK pose first."""
        e = self.e; C = self._ctrl(rx_j); M = C._M; C.judge = None; C.via = True
        C.hover = (M @ np.r_[point_w, 1.0])[:3]
        if swing:
            with contextlib.redirect_stdout(io.StringIO()):
                C.seed = None
                if SWING_ROTATE:
                    # ROTATE, DON'T STAND UP (Nischay: 'it should simply rotate and connect'). GPU test 25 Oct: 67 of 114 walking steps
                    # went up to ~690 mm (fully straight) because the swing target pose was any IK branch and the joint-space move passed
                    # through upright. Now: keep the current curled shape, turn the base twist T1 towards the next connector, then a small
                    # IK correction from THAT seed only (stays on the same branch -> the free end sweeps round at a low height).
                    q0 = C.qik.copy(); best = None
                    for dl in np.radians(np.arange(-180, 181, 10)):
                        qq = q0.copy(); qq[0] = float(np.clip(q0[0] + dl, L.NOM.lo[0], L.NOM.hi[0])); p_, _, _ = L.NOM._fk(qq)
                        dd = np.linalg.norm(p_ - C.hover)
                        if best is None or dd < best[0]: best = (dd, qq)
                    qs = L.NOM._ik(C.hover, C.z, C.Ro, best[1], seeds=0); p_, n_, _ = L.NOM._fk(qs)
                    if np.linalg.norm(p_ - C.hover) < 0.004 and np.degrees(np.abs(qs[[0, 3, 6]])).max() < 160: C.seed = qs
                if C.seed is None:
                    C.seed = C._pick_seed(C.hover, C.z, C.Ro, C.qik) if L.TWIST_PREF else L.NOM._ik(C.hover, C.z, C.Ro, C.qik, seeds=6)
        else: C.swung = True
        lowest = [9.9]; mv = self.moving
        def locks(lk): return (45.0, 0.0) if self.base == 'A' else (0.0, 45.0)
        def done(C_, lk):
            if hasattr(e, 'd'): lowest[0] = min(lowest[0], e.d.site_xpos[e.end[mv]['tip']][2])
            return C_.phase >= 1
        ok = self._run(C, locks, done, 600, tag)
        self.via_low = min(getattr(self, 'via_low', 9.9), lowest[0])
        return ok
    def dock_fns(self, mv):
        """Lock command + 'finished?' test for one dock of end mv (shared by walking, multi-module docks and the GPU runs)."""
        e = self.e; hold = [0]; stall = [0]; tries = [0]; sgn = [1.0]
        def locks(lk): return (45.0, sgn[0] * lk) if self.base == 'A' else (sgn[0] * lk, 45.0)
        def done(C, lk):
            if C.phase == 3: return True                       # judge: gave up (not seated after retries)
            if C.phase == 2 and lk >= 45:
                # LOCK STALL RECOVERY (real robot: lock servo position feedback). GPU test 25 Oct: 1 of 97 docks seated at 0.55 mm
                # but the fins jammed under the lip at 4 deg. -> back the lock off, push 0.6 mm deeper, retry; 2nd retry turns the other way.
                lm = abs(math.degrees(self.e.d.qpos[self.e.end[mv]['lockq']]))
                if lm >= 40: hold[0] += 1; stall[0] = 0
                else:
                    stall[0] += 1
                    if stall[0] >= 12 and tries[0] < LOCK_RETRIES:
                        tries[0] += 1; stall[0] = 0; C.lock = 0.0; C.lock_wait = 10; C.push_extra = getattr(C, 'push_extra', 0.0) + 0.0006
                        if tries[0] >= 2: sgn[0] = -sgn[0]
                        self.log('  lock stalled at %.0f deg -> lock back, push %.1f mm deeper, turn %s (retry %d)' % (lm, C.push_extra * 1000, 'the other way' if sgn[0] < 0 else 'again', tries[0]))
            return hold[0] >= 10
        return locks, done
    def step_to(self, rx_j):
        e = self.e; mv = self.moving; t0 = e.t
        if getattr(self, 'curl', True) and getattr(self, 'freed', False):
            # CURL-UP SWING: lift the free end 8 cm straight up, then go high over the next connector, then descend to dock
            up = e.rx[self.left_rx]['z']                                  # away from the surface it just left (works for slopes/walls too)
            Minv = np.linalg.inv(self.M()); pn, _, _ = L.NOM._fk(self.nq(e.measured())); tip_est = (Minv @ np.r_[pn, 1.0])[:3]
            if not self._via(tip_est + 0.08 * up, rx_j, 'lift End %s' % mv, swing=False): return False
            high = e.rx[rx_j]['seat'] + e.rx_bias[rx_j] + (RX_TOP - RX_GAP + L.STANDOFF + 0.08) * e.rx[rx_j]['z']
            if not self._via(high, rx_j, 'swing End %s over to rx%d' % (mv, rx_j), swing=True): return False
            self.log('  End %s curled up and swung over%s' % (mv, (': lowest point of the free end during the move %.0f mm' % (self.via_low * 1000)) if self.via_low < 9 else '')); self.via_low = 9.9
        C = self._ctrl(rx_j); locks, done = self.dock_fns(mv)
        if not self._run(C, locks, done, 1500, 'dock End %s -> rx%d' % (mv, rx_j)): return False
        if hasattr(e, 'end_vs_rx'):                                   # simulator: check against the truth
            r = e.end_vs_rx(mv, rx_j)
            ok = abs(r['axial_mm']) < 0.8 and r['radial_mm'] < 1.5 and r['lock_deg'] > 40
            self.log('  End %s docked at rx%d: %s | gap %.2f mm, side %.2f mm, lock %.0f deg, %.1f s, free end max height %.0f mm, joint travel %.0f deg vs direct %.0f deg' % (mv, rx_j, 'OK' if ok else 'FAILED', r['axial_mm'], r['radial_mm'], r['lock_deg'], (e.t - t0) * 0.06, getattr(self, 'hmax', 0) * 1000, math.degrees(getattr(self, 'jtrav', 0.0)), math.degrees(float(np.abs(self.last_cmd - getattr(self, 'q_step0', self.last_cmd)).sum())))); self.hmax = 0.0; self.jtrav = 0.0; self.q_step0 = self.last_cmd.copy()
        else:                                                         # real robot: the judge (camera / human) confirmed seating before the lock
            ok = C.phase == 2
            self.log('  End %s docked at rx%d: %s, %.1f s' % (mv, rx_j, 'OK (judge-confirmed seated, lock turned 45)' if ok else 'FAILED (judge said not seated after 3 retries, lock NOT turned)', (e.t - t0) * 0.06))
        if not ok: return False
        # which of the 4 pad orientations did we land in? (from the robot's own estimate, snapped to 90 deg)
        cn = self.nq(e.measured()); p, n, x = L.NOM._fk(cn)
        Minv = np.linalg.inv(self.M()); xw = Minv[:3, :3] @ x
        if mv == 'A': xw = -xw                                   # virtual frame = physical A frame * F (F flips x)
        Rr = e.rx[rx_j]['R']; ang = math.degrees(math.atan2(xw @ Rr[:, 1], xw @ Rr[:, 0]))
        knew = int(round((ang - 45) / 90)) % 4
        old_base, old_rx = self.base, self.base_rx
        self.base, self.base_rx, self.k = mv, rx_j, knew      # swap roles: the end we just locked is the new base
        # unlock the old base, then pull it straight out 25 mm
        # PEEL then lift: magnets (~37 N at contact) are too strong to pull straight out with a 25 cm lever (needs ~9 N.m, servos ~2.7).
        # Tilt the end ~12 deg about the connector rim on the side facing the new base, magnets release one side at a time.
        C = self._ctrl(old_rx); C.swung = True; C.phase = 1; C.appr = -0.0004; C.lifting = True; C.lift_to = -0.0004
        C.qik = self.nq(self.last_cmd); C.out = C.qik.copy()
        seat0, z0, Ro0 = C.seat.copy(), C.z.copy(), C.Ro.copy()
        M = self.M(); bw = e.rx[self.base_rx]['seat']; ow = e.rx[old_rx]['seat']; dirw = bw - ow; dirw -= (dirw @ e.rx[old_rx]['z']) * e.rx[old_rx]['z']
        dirn = M[:3, :3] @ (dirw / max(np.linalg.norm(dirw), 1e-9))
        pivot = seat0 + 0.030 * dirn                           # rim point toward the new base stays down
        axis = np.cross(z0, dirn); axis /= np.linalg.norm(axis)
        def rotv(v, ang):
            k = axis; return v * math.cos(ang) + np.cross(k, v) * math.sin(ang) + k * (k @ v) * (1 - math.cos(ang))
        # BASE_FOLLOW: the peel/pull targets are fixed in the WORLD (the old receiver), but controller coords ride on the base.
        # A floor base never moves (D = identity, nothing changes). A base in another module's SPINE receiver moves when this
        # module's weight comes onto it (the root bends): with a frozen frame the pull aimed 24 mm off and the end stayed in
        # (bridge test 28 Oct: estimate 25 mm out, truth 1.2 mm). Re-express the targets from the base's current pose each frame.
        M0inv = np.linalg.inv(M)
        def follow(C):
            if not BASE_FOLLOW: return
            D = self.M() @ M0inv; R_, t_ = D[:3, :3], D[:3, 3]
            C.seat = R_ @ C.seat + t_; C.z = R_ @ C.z; C.Ro = R_ @ C.Ro
        peel = [0.0]; PEEL_MAX = math.radians(float(__import__('os').environ.get('PEEL_DEG', '6')))   # tested 25 Oct, flush magnets: 2 deg 0/3, 3 deg 1/3, 4 deg 3/3, 6 deg 2/2, 12 deg ok -> 6 (margin). 0 = straight (needs magnets 1 mm deeper)
        def locks2p(lk):
            unl[0] = max(0.0, unl[0] - 5.0)
            return (45.0, unl[0]) if self.base == 'A' else (unl[0], 45.0)
        cnt = [0]
        def done_peel(C, lk):
            peel[0] = min(PEEL_MAX, peel[0] + math.radians(1.0))   # 1 deg per frame; +angle lifts the centre (rim toward base stays down)
            C.seat = pivot + rotv(seat0 - pivot, peel[0]); C.z = rotv(z0, peel[0]); C.Ro = np.stack([rotv(Ro0[:, i], peel[0]) for i in range(3)], 1)
            follow(C)
            if peel[0] >= PEEL_MAX: cnt[0] += 1
            return cnt[0] > 8
        unl = [45.0]
        for _ in range(12):
            la, lb = locks2p(0); e.step(self.last_cmd, la, lb)
        if not self._run(C, locks2p, done_peel, 60, 'peel End %s off rx%d' % (old_base, old_rx)): return False
        if hasattr(e, 'end_vs_rx'):
            r = e.end_vs_rx(old_base, old_rx)
            self.log('  End %s peeled: centre %.1f mm above seat, magnet pull %.1f N' % (old_base, r['axial_mm'], e.mag_force[old_base]))
        # lift STRAIGHT along the receiver axis (not the tilted one, that jams the pads), level out once clear of the pads
        locks2 = locks2p; hold2 = [0]; up = [0.0]
        def done2(C, lk):
            up[0] = min(LIFT, up[0] + L.APPR_STEP)
            hold = float(__import__('os').environ.get('PEEL_HOLD_MM', '12')) / 1000     # keep the tilt until this high (magnets fully released), then level out
            tilt = PEEL_MAX * min(1.0, max(0.0, (LIFT - up[0]) / (LIFT - hold)))
            C.seat = pivot + rotv(seat0 - pivot, tilt) + up[0] * z0; C.z = rotv(z0, tilt); C.Ro = np.stack([rotv(Ro0[:, i], tilt) for i in range(3)], 1)
            follow(C)
            # PULL_CONVERGE: count the hold only once the robot's OWN estimate of the end has reached the lifted target (3 mm),
            # not after a fixed time (bridge test 28 Oct: with a sideways base the arm was still on its way when time ran out).
            near = True
            if PULL_CONVERGE:
                pm, _ = C.pose(self.nq(e.measured())); near = np.linalg.norm(C.seat + C.appr * C.z + C.shift - pm) < 0.003
                if __import__('os').environ.get('DEBUG_PULL'):
                    Minv = np.linalg.inv(C._M); gw_ = (Minv @ np.r_[C.seat + C.appr * C.z + C.shift, 1.0])[:3]; pw_ = (Minv @ np.r_[pm, 1.0])[:3]
                    o = e.rx[old_rx]; print('PULL up %.1f | est->goal %.1f mm | goal above old seat %.1f mm, est above %.1f mm | shift %s off %s' % (
                        up[0] * 1000, 1000 * np.linalg.norm(C.seat + C.appr * C.z + C.shift - pm), (gw_ - o['seat']) @ o['z'] * 1000, (pw_ - o['seat']) @ o['z'] * 1000,
                        np.round(C.shift * 1000, 1), np.round(np.degrees(C.off), 1)), file=__import__('sys').stderr)
            if up[0] >= LIFT and near: hold2[0] += 1
            return hold2[0] >= 20
        if not self._run(C, locks2, done2, 200, 'pull End %s out of rx%d' % (old_base, old_rx)): return False
        self.freed = True; self.left_rx = old_rx
        if hasattr(e, 'end_vs_rx'):
            r = e.end_vs_rx(old_base, old_rx)
            self.log('  End %s pulled out of rx%d: now %.1f mm above its seat (target %.0f), its lock %.0f deg, magnet pull %.1f N' % (old_base, old_rx, r['axial_mm'], LIFT * 1000, r['lock_deg'], e.mag_force[old_base]))
            return r['axial_mm'] > 12          # pads are 9 mm tall: > 12 mm = clear (the curl-up then lifts another 8 cm)
        out = self.judge_fn('out', old_base) if getattr(self, 'judge_fn', None) else True   # real robot: ask the judge
        self.log('  End %s pulled out of rx%d: %s' % (old_base, old_rx, 'judge confirms it is out' if out else 'judge says STILL STUCK'))
        return bool(out)
