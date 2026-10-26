"""TETROBOT laptop controller v2 (DRAFT - review before using on hardware).
Final docking controller = the one that scored 88-93% in GPU sim and 90% in the independent CPU check.
Every 60 ms:
  read 9 servo angles (/api/telemetry; firmware already sync-reads them every 60 ms)
  -> estimate End B pose INCLUDING PLA sag + backlash (nominal sim model, encoders only)
  -> one damped-least-squares IK step on an internal pose 'qik'
  -> slow integral offset from the MEASURED pose error (cancels servo droop / sag mismatch)
  -> /api/batch (SyncWritePosEx, acc 40)
Phases: 0 swing to seed + align at standoff (45 deg pad/gap offset) -> 1 straight in 1.5 mm/step -> 2 lock fins 45 deg.
The hover->go-in decision uses ONLY the robot's own estimate (6 mm / 3 deg, steady 4 frames), as in sim.

Modes:
  python laptop_controller.py --sim [N]   run THIS code against N randomized simulated robots (self-test)
  python laptop_controller.py             real robot; DRY_RUN=True prints commands, sends nothing
YOU MUST FILL: SERVO_ID / SIGN / HOME and the measured receiver pose RX_POS / RX_YAW_DEG.
No firmware change needed.
"""
import sys, os, time, math, json, urllib.request, numpy as np
sys.path.insert(0, r'D:\\robo4\\brain')
from tetro_env2 import TetroDockEnv, RX_GAP, RX_TOP, VMAX

ESP = 'http://mod1.local'
DRY_RUN = True
JOINTS = ['T1', 'B1', 'B2', 'T2', 'B3', 'B4', 'T3']
SERVO_ID = {'L1': 1, 'T1': 2, 'B1': 3, 'B2': 4, 'T2': 5, 'B3': 6, 'B4': 7, 'T3': 8, 'L2': 9}   # TODO check
SIGN     = {k: +1 for k in SERVO_ID}                                                          # TODO check
HOME     = {k: 180.0 for k in SERVO_ID}                                                       # servo deg at sim zero
RX_POS = np.array([0.30, 0.0, 0.0]); RX_YAW_DEG = 0.0; STANDOFF = 0.022                       # TODO measure
try:                                     # values from the guided calibration (deploy/calibrate.py) override the defaults above
    _c = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'robot_config.json')))
    SERVO_ID.update(_c.get('SERVO_ID', {})); SIGN.update(_c.get('SIGN', {})); HOME.update(_c.get('HOME', {}))
    LOCK_DIR_CAL = _c.get('LOCK_DIR', None)
except Exception:
    LOCK_DIR_CAL = None
DT = 0.06
APPR_STEP = 0.0015      # go-in 1.5 mm per 60 ms frame = 25 mm/s (verified; slower go-in jammed the lock fins)
APPR_SLOW = 0.0005      # last 4 mm before the pads touch: 0.5 mm/frame = 8 mm/s (soft touch)
# GENTLE MOTION LIMITS (protect PLA + horn screws). Old version moved up to ~150 deg/s.
JMAX = float(os.environ.get('JMAX', '0.6'))   # max joint speed, rad/s (0.6 = ~34 deg/s)
JUDGE_TOL = 0.002      # judge correction threshold above the connector (m)
LIMIT_GUARD = os.environ.get('LIMIT_GUARD', '1') == '1'  # IK leans less on joints near their stops (uses the 7th, spare joint)
TWIST_PREF = os.environ.get('TWIST_PREF', '0') == '1'   # OFF: tested 25 Oct - made T2 hit its stop mid-swing (2/6 long walks). Without it: no twist build-up over 7 steps.
# camera-judge pacing: GPU test 25 Oct - first docks spent 7-15 s per camera check waiting for the arm to settle within 1.5 mm of its own aim
# (jitter rarely allows it, so every check fell through to the 120-frame = 7 s timeout). The camera measures the REAL error anyway; it only
# needs the arm still. -> settle tolerance 3 mm and a 60-frame (3.6 s) fallback. Old values: JUDGE_SETTLE=0.0015 JUDGE_WAIT=120.
JUDGE_SETTLE = float(os.environ.get('JUDGE_SETTLE', '0.003')); JUDGE_WAIT = int(os.environ.get('JUDGE_WAIT', '60'))
LAG_TOL = float(os.environ.get('LAG_TOL', '0.003'))   # rad: hover gate 'arm has caught up' (stretched poses jitter ~0.01 rad, use 0.015 there)
HOVER_FAR = float(os.environ.get('HOVER_FAR', '0'))   # m: first go to hover + HOVER_FAR*normal, then in (collision-free approach to side receivers)
HOVER_TOL = float(os.environ.get('HOVER_TOL', '0.006'))   # line-up tolerance on the robot's own estimate (m)
JACC = 1.5              # max joint acceleration, rad/s^2 (smooth start/stop)
FAST = os.environ.get('SPEED_OLD', '0') == '1'   # test only: old fast behaviour
GENTLE_LIM = 0.015     # max joint change per frame while going in (rad)
# FLOOR TILT - measure once with a phone level app on the floor next to the module (matters: 0.8 deg ~ 3 mm at the tip)
FLOOR_TILT_DEG = 0.0        # how much the floor slopes
FLOOR_TILT_DIR_DEG = 0.0    # downhill direction, measured from the module +x axis (counter-clockwise, seen from above)
def gravity_from_tilt(t_deg, dir_deg):
    t, ph = math.radians(t_deg), math.radians(dir_deg)
    return 9.81 * np.array([math.sin(t) * math.cos(ph), math.sin(t) * math.sin(ph), -math.cos(t)])

NOM = TetroDockEnv(seed=0, randomize=False)        # nominal model: sag estimate + IK maths only

def vclip(v, lim):
    # scale the WHOLE joint vector so the fastest joint is <= lim: all joints arrive together, path shape kept
    mx = np.max(np.abs(v)); return v if mx <= lim else v * (lim / mx)

def slot(xB, Ro):
    a = math.atan2(xB @ Ro[:, 1], xB @ Ro[:, 0]) - math.pi / 4; return (a + math.pi / 4) % (math.pi / 2) - math.pi / 4

class DockController:
    def __init__(self, hover, seat, z, Ro, standoff, q0, gravity=None):
        NOM.m.opt.gravity[:] = gravity if gravity is not None else gravity_from_tilt(FLOOR_TILT_DEG, FLOOR_TILT_DIR_DEG)
        self.hover, self.seat, self.z, self.Ro = hover, seat, z, Ro
        self.qik = q0.copy(); self.off = np.zeros(7); self.appr = RX_TOP - RX_GAP + standoff; self.standoff = standoff
        # JUDGE (camera / human / sim-camera): judge(stage, C) -> ('hover': offset of the REAL tip from where we aim, 3-vector in controller coords)
        #                                                         ('seat' : (seated?, offset)).  None = no judge -> trust the maths.
        self.judge = None; self.shift = np.zeros(3); self.hchecks = 0; self.retries = 0; self.wait = 0
        self.phase = 0; self.steady = 0; self.k = 0; self.qbuf = []; self.lock = 0.0; self.out = None; self.vout = np.zeros(7); self.lag = 0.0; self.swung = False
        self.vlim0 = VMAX * 0.5 if FAST else JMAX * DT; self.vlim1 = VMAX * 0.6 if FAST else JMAX * DT
        self.seed = self._pick_seed(hover, z, Ro, q0) if TWIST_PREF else NOM._ik(hover, z, Ro, q0, seeds=6)
    def _pick_seed(self, hover, z, Ro, q0):
        """IK start pose that keeps the twist joints (T1, T2, T3: +-176 deg, no wrap-around) near the middle of their range.
        The connector is 4-fold symmetric, so several solutions reach it - pick the one with the smallest twists."""
        cands = [NOM._ik(hover, z, Ro, q0, seeds=6)]
        for t1 in (-0.8, 0.8):
            for t3 in (-0.8, 0.8):
                s0 = q0.copy(); s0[0], s0[3], s0[6] = t1, 0.0, t3
                cands.append(NOM._ik(hover, z, Ro, s0, seeds=0))
        def resid(q):
            p, n, x = NOM._fk(q); return np.linalg.norm(p - hover) * 1000 + np.linalg.norm(np.cross(n, -z)) * 60 + abs(slot(x, Ro)) * 60
        good = [c for c in cands if resid(c) < 3.0] or [min(cands, key=resid)]
        return min(good, key=lambda q: np.max(np.abs(q[[0, 3, 6]])) + 0.2 * np.linalg.norm(q - q0))
    def pose(self, q):
        p, n, x = NOM._fk(q); return p, np.stack([x, n, np.cross(x, n)], -1)
    def err(self, p, R, goal):
        zt = getattr(self, 'zt', self.z)          # alignment target normal (judge can correct tilt); approach direction stays self.z
        return np.r_[(goal - p) * 1000, (np.cross(R[:, 1], -zt) - slot(R[:, 0], self.Ro) * self.z) * 60]
    def step(self, qm):
        """qm = measured encoder angles (rad, sim joint order). Returns (joint command, lock deg)."""
        z = self.z; pm, Rm = self.pose(qm)
        # steadiness from RAW encoder changes (smoothed), ~0.3 m lever -> tip m/s; no sag/backlash term (that one jumps)
        # encoder noise is 0.5-3 mrad: compare with the reading 4 frames (240 ms) back so noise doesn't look like motion
        self.qbuf.append(qm.copy()); self.qbuf = self.qbuf[-5:]
        speed = np.max(np.abs(self.qbuf[-1] - self.qbuf[0])) / (DT * (len(self.qbuf) - 1)) * 0.3 if len(self.qbuf) > 1 else 0.0
        if not self.swung and (self.k >= 18 if FAST else (np.max(np.abs(self.seed - self.qik)) <= 0.02 or self.k >= 200)):
            self.swung = True                                      # swing to the start pose happens ONCE, never again
        if not self.swung:
            self.qik = self.qik + (np.clip(self.seed - self.qik, -self.vlim0, self.vlim0) if FAST else vclip(self.seed - self.qik, self.vlim0))
        else:
            if self.phase >= 1 and getattr(self, 'lifting', False): self.appr = min(self.appr + APPR_STEP, self.lift_to)   # undock: straight out
            elif self.phase >= 1: self.appr = max(self.appr - APPR_STEP, -0.0004 - getattr(self, 'push_extra', 0.0))   # push_extra: lock-stall retry pushes deeper
            far = HOVER_FAR * z if (self.phase == 0 and HOVER_FAR > 0 and not getattr(self, 'far_done', False)) else 0.0
            goal = (self.hover if self.phase == 0 else self.seat + self.appr * z) + self.shift + far
            if isinstance(far, np.ndarray) and np.linalg.norm(goal - pm) < 0.012: self.far_done = True   # reached the stand-off point, now go to the hover point
            p0, R0 = self.pose(self.qik); J = np.zeros((6, 7)); h = 1e-3
            for j in range(7):
                qq = self.qik.copy(); qq[j] += h; p1, R1 = self.pose(qq)
                J[:3, j] = (p1 - p0) / h; J[3:, j] = 0.5 * sum(np.cross(R0[:, i], R1[:, i]) for i in range(3)) / h
            Js = J.copy(); Js[:3] *= 1000; Js[3:] *= 60
            if LIMIT_GUARD:                       # joint-limit guard: a joint within ~15 deg of its stop is used less (7 joints, 6 needed)
                room = np.minimum(self.qik - NOM.lo, NOM.hi - self.qik)
                wj = np.clip((room - 0.03) / 0.25, 0.05, 1.0); wj[[1, 2, 4, 5]] = 1.0   # twists only (T1,T2,T3): bends sit at their stop when straight
                Js = Js * wj[None, :]
            else: wj = np.ones(7)
            A = Js @ Js.T + 4 * np.eye(6)
            solve = lambda ev: wj * (Js.T @ np.linalg.solve(A, ev))
            lim = GENTLE_LIM if self.phase >= 1 else self.vlim1
            dq = solve(self.err(p0, R0, goal)); self.qik = np.clip(self.qik + (np.clip(dq, -lim, lim) if (FAST or self.phase >= 1) else vclip(dq, lim)), NOM.lo, NOM.hi)   # go-in: verified per-joint step
            if speed < 0.05 and self.lag < 0.003: self.off = np.clip(self.off + 0.1 * np.clip(solve(self.err(pm, Rm, goal)), -0.004, 0.004), -0.08, 0.08)
            if self.phase == 0:
                ee = np.linalg.norm(goal - pm); ang = math.acos(max(-1, min(1, -(Rm[:, 1] @ getattr(self, 'zt', z))))); sl = abs(slot(Rm[:, 0], self.Ro))
                tol = JUDGE_SETTLE if self.judge else HOVER_TOL      # with a judge: settle first, so it measures the real error, not motion
                ok = ee < tol and ang < math.radians(3 if not self.judge else 1) and sl < math.radians(3 if not self.judge else 1) and speed < 0.03 and self.lag < LAG_TOL
                if getattr(self, 'via', False): ok = ee < 0.015 and speed < 0.06   # waypoint (lift / swing-over): only roughly there; GPU test: 4 of 128 robots froze at a waypoint on the strict gate
                if os.environ.get('DBG_GATE') == '1' and self.k % 20 == 0:
                    sys.stderr.write('    gate: ee %.1f mm (<%.1f) tilt %.2f deg slot %.2f deg speed %.3f lag %.4f -> %s\n' % (ee * 1000, tol * 1000, math.degrees(ang), math.degrees(sl), speed, self.lag, ok))
                if self.judge and not ok and self.steady == 0: self.unsettled = getattr(self, 'unsettled', 0) + 1
                if self.judge and getattr(self, 'unsettled', 0) > JUDGE_WAIT: ok = ee < HOVER_TOL and speed < 0.03   # don't wait forever
                self.steady = self.steady + 1 if ok else 0
                if self.steady >= (4 if FAST else 6):
                    res = self.judge('hover', self) if self.judge else None
                    if not isinstance(res, tuple): res = (res, 0.0, np.zeros(3))
                    if len(res) == 2: res = (res[0], res[1], np.zeros(3))
                    d, sl_err, tau = res
                    tilt = np.linalg.norm(tau)
                    if d is not None and (np.linalg.norm(d) > JUDGE_TOL or abs(sl_err) > math.radians(1.5) or tilt > math.radians(0.5)) and self.hchecks < 6:
                        self.shift = self.shift - d; self.steady = 0; self.hchecks += 1; self.unsettled = 0   # d = REAL tip minus REAL hover point -> aim shifts by -d
                        if tilt > math.radians(0.3):                                          # judge sees End tilted: rotate the alignment target by the same
                            k = tau / tilt; c, s = math.cos(tilt), math.sin(tilt)
                            Rt = c * np.eye(3) + s * np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]]) + (1 - c) * np.outer(k, k)
                            self.zt = Rt @ getattr(self, 'zt', z)
                        if abs(sl_err) > math.radians(1.0):                                   # judge sees the pads twisted: re-aim the 45 deg slot
                            k = z / np.linalg.norm(z); c, s = math.cos(-sl_err), math.sin(-sl_err)
                            Rz = c * np.eye(3) + s * np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]]) + (1 - c) * np.outer(k, k)
                            self.Ro = Rz @ self.Ro
                        print('  judge: really %.1f mm off, twist %.1f deg, tilt %.1f deg above the connector -> correcting' % (np.linalg.norm(d) * 1000, math.degrees(sl_err), math.degrees(tilt)))
                    else:
                        self.phase = 1; print('  aligned at standoff -> going straight in')
            elif self.phase == 1 and self.appr <= -0.0004 and not getattr(self, 'lifting', False):
                self.wait += 1
                if self.judge is None:
                    self.phase = 2; print('  at seat -> turning lock fins 45 deg')
                elif self.wait >= 8:                                                        # let magnets/chamfers settle it first
                    seated, d = self.judge('seat', self)
                    if not seated and self.wait < 20: pass                                  # keep watching up to 1.2 s: magnets may still pull it in
                    elif seated or self.retries >= 3:
                        self.phase = 2; print('  judge: seated -> turning lock fins 45 deg' if seated else '  judge: NOT seated after 3 retries -> giving up (no lock)')
                        if not seated: self.phase = 3
                    else:                                                                   # NOT seated: do not lock, back off and retry
                        lat = d - (d @ z) * z; self.shift = self.shift - lat; self.retries += 1
                        self.phase = 0; self.steady = 0; self.wait = 0; self.appr = RX_TOP - RX_GAP + self.standoff; self.hchecks = 0; self.unsettled = 0
                        print('  judge: NOT seated (%.1f mm sideways) -> no lock, back off, retry %d' % (np.linalg.norm(lat) * 1000, self.retries))
            if self.phase == 2:
                if getattr(self, 'lock_wait', 0) > 0: self.lock_wait -= 1          # let the deeper push land before turning again
                else: self.lock = min(45.0, self.lock + 5.0)
        self.k += 1
        target = np.clip(self.qik + self.off, NOM.lo, NOM.hi)
        if FAST: return target, self.lock
        if self.phase >= 1:                    # go-in: verified straight-in motion (25 mm/s, joint steps <= 0.25 rad/s); limiter only for the big swing
            self.out = target.copy(); self.vout[:] = 0; self.lag = 0.0; return target, self.lock
        # smooth rate limiter on what we SEND: speed <= JMAX, acceleration <= JACC, brakes in time (no overshoot)
        if self.out is None: self.out = qm.copy()
        e = target - self.out; em = np.max(np.abs(e))
        vdes = vclip(e / DT, min(JMAX, math.sqrt(2 * JACC * em))) if em > 1e-9 else np.zeros(7)   # coordinated: one speed scale for all joints
        self.vout = self.vout + vclip(vdes - self.vout, JACC * DT)
        self.out = np.clip(self.out + self.vout * DT, NOM.lo, NOM.hi)
        self.lag = np.max(np.abs(target - self.out))     # learn the slow correction only once the arm has caught up
        return self.out.copy(), self.lock

# ---------------- real robot I/O ----------------
def get(path):
    with urllib.request.urlopen(ESP + path, timeout=0.2) as r: return json.loads(r.read())
def read_q():
    J = get('/api/telemetry'); a = {s['id']: s['currentAngle'] for s in J['servos'] if s['currentAngle'] is not None}
    return np.array([math.radians(SIGN[k] * (a[SERVO_ID[k]] - HOME[k])) for k in JOINTS])
def send(q_cmd, lock_deg):
    parts = ['speed=10', 'acc=40'] + ['%d=%.2f' % (SERVO_ID[k], HOME[k] + SIGN[k] * math.degrees(v)) for k, v in zip(JOINTS, q_cmd)]
    parts.append('%d=%.2f' % (SERVO_ID['L2'], HOME['L2'] + SIGN['L2'] * lock_deg))
    url = '/api/batch?' + '&'.join(parts)
    if DRY_RUN: print('DRY', url); return
    get(url)

def run_real():
    z = np.array([0, 0, 1.0]); c, s = math.cos(math.radians(RX_YAW_DEG)), math.sin(math.radians(RX_YAW_DEG))
    Ro = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]]); o = RX_POS + np.r_[NOM.base_xy, 0]
    q = np.zeros(7) if DRY_RUN else read_q()
    C = DockController(o + (RX_TOP + STANDOFF) * z, o + RX_GAP * z, z, Ro, STANDOFF, q)
    print('seed pose (deg):', np.round(np.degrees(C.seed), 1)); cmd = q
    try:
        while True:
            tick = time.time(); q = cmd if DRY_RUN else read_q()
            cmd, lock = C.step(q); send(cmd, lock)
            if C.phase == 2 and lock >= 45.0: print('lock command complete - check by hand / pull test'); break
            time.sleep(max(0, DT - (time.time() - tick)))
    except KeyboardInterrupt:
        print('stopped - servos hold their last target')

# ---------------- self-test on simulated robots ----------------
def run_sim(n=20):
    import os; env = TetroDockEnv(seed=int(os.environ.get('SEED', '321')), floor_frac=float(os.environ.get('FLOOR_FRAC', '0.9')), max_dist=0.30, ep_len=450); res = []; t0 = time.time(); rng = np.random.default_rng(7)
    for ep in range(n):
        env.reset(); env.htol = (-1, -1)
        g = env.m.opt.gravity.copy(); t = math.degrees(math.acos(-g[2] / 9.81)); ph = math.degrees(math.atan2(g[1], g[0]))
        g_meas = gravity_from_tilt(max(0, t + rng.normal(0, 0.1)), ph + rng.normal(0, 10))      # phone level: +-0.1 deg, +-10 deg direction
        C = DockController(env.hover + env.bias_p, env.seat + env.bias_p, env.Rrx_obs[:, 2], env.Rrx_obs, env.standoff, env.cmd.copy(), gravity=g_meas)
        info = {}
        for t in range(env.ep_len):
            qm = env.qhist[max(0, len(env.qhist) - 1 - env.obs_lag)][0]      # lagged encoders, like the real bus
            cmd, _ = C.step(qm); env.cmd = cmd
            if C.phase >= 1 and env.phase == 0: env.phase = 1; env.prev_E = env._err()[0]
            o, r, te, tr, info = env.step(np.zeros(7))
            if te or tr: break
        res.append(info); print('ep %2d %-5s docked %-5s axial %.2f mm lock %.0f deg crash %s' % (ep, env.kind, info.get('success'), info.get('axial_mm', 0), info.get('lock_deg', 0), info.get('crash')), flush=True)
    ok = [bool(r.get('success')) for r in res]
    print('DEPLOY-CODE SELF-TEST: docked %d/%d = %.0f%% | crashes %d | %.0f s' % (sum(ok), n, 100 * np.mean(ok), sum(bool(r.get('crash')) for r in res), time.time() - t0)); print('DONE')

if __name__ == '__main__':
    if '--sim' in sys.argv: run_sim(int(sys.argv[-1]) if sys.argv[-1].isdigit() else 20)
    else: run_real()
