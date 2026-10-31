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
from paths import tpath
import sys, os, time, math, json, urllib.request, numpy as np
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv, RX_GAP, RX_TOP, VMAX

ESP = 'http://mod1.local'
DRY_RUN = True
JOINTS = ['T1', 'B1', 'B2', 'T2', 'B3', 'B4', 'T3']
SERVO_ID = {'L1': 1, 'T1': 2, 'B1': 3, 'B2': 4, 'T2': 5, 'B3': 6, 'B4': 7, 'T3': 8, 'L2': 9}   # TODO check
SIGN     = {k: +1 for k in SERVO_ID}                                                          # TODO check
HOME     = {k: 180.0 for k in SERVO_ID}                                                       # servo deg at sim zero
RX_POS = np.array([0.30, 0.0, 0.0]); RX_YAW_DEG = 0.0; STANDOFF = 0.022                       # TODO measure
DT = 0.06
APPR_STEP = 0.0015      # go-in speed 1.5 mm per 60 ms frame (GPU test: 91.0% vs 88.6% at 3 mm, fewer crashes)
GENTLE_LIM = 0.015     # max joint change per frame while going in (rad)
HALL = os.environ.get('HALL', '0') == '1'   # IDEA TEST: hall sensors in End B see the receiver magnets' sideways offset in the last 15 mm
# FLOOR TILT - measure once with a phone level app on the floor next to the module (matters: 0.8 deg ~ 3 mm at the tip)
FLOOR_TILT_DEG = 0.0        # how much the floor slopes
FLOOR_TILT_DIR_DEG = 0.0    # downhill direction, measured from the module +x axis (counter-clockwise, seen from above)
def gravity_from_tilt(t_deg, dir_deg):
    t, ph = math.radians(t_deg), math.radians(dir_deg)
    return 9.81 * np.array([math.sin(t) * math.cos(ph), math.sin(t) * math.sin(ph), -math.cos(t)])

NOM = TetroDockEnv(seed=0, randomize=False)        # nominal model: sag estimate + IK maths only

def slot(xB, Ro):
    a = math.atan2(xB @ Ro[:, 1], xB @ Ro[:, 0]) - math.pi / 4; return (a + math.pi / 4) % (math.pi / 2) - math.pi / 4

class DockController:
    def __init__(self, hover, seat, z, Ro, standoff, q0, gravity=None):
        NOM.m.opt.gravity[:] = gravity if gravity is not None else gravity_from_tilt(FLOOR_TILT_DEG, FLOOR_TILT_DIR_DEG)
        self.hover, self.seat, self.z, self.Ro = hover, seat, z, Ro
        self.qik = q0.copy(); self.off = np.zeros(7); self.appr = RX_TOP - RX_GAP + standoff
        self.phase = 0; self.steady = 0; self.k = 0; self.qbuf = []; self.lock = 0.0; self.shift = np.zeros(3); self.hold = 0
        self.seed = NOM._ik(hover, z, Ro, q0, seeds=6)
    def pose(self, q):
        p, n, x = NOM._fk(q); return p, np.stack([x, n, np.cross(x, n)], -1)
    def err(self, p, R, goal):
        return np.r_[(goal - p) * 1000, (np.cross(R[:, 1], -self.z) - slot(R[:, 0], self.Ro) * self.z) * 60]
    def step(self, qm, hall=None):
        """qm = measured encoder angles (rad, sim joint order). Returns (joint command, lock deg)."""
        z = self.z; pm, Rm = self.pose(qm)
        # steadiness from RAW encoder changes (smoothed), ~0.3 m lever -> tip m/s; no sag/backlash term (that one jumps)
        # encoder noise is 0.5-3 mrad: compare with the reading 4 frames (240 ms) back so noise doesn't look like motion
        self.qbuf.append(qm.copy()); self.qbuf = self.qbuf[-5:]
        speed = np.max(np.abs(self.qbuf[-1] - self.qbuf[0])) / (DT * (len(self.qbuf) - 1)) * 0.3 if len(self.qbuf) > 1 else 0.0
        if self.k < 18:
            self.qik = self.qik + np.clip(self.seed - self.qik, -VMAX * 0.5, VMAX * 0.5)
        else:
            if self.phase >= 1:
                if HALL and hall is not None:                       # hall = measured sideways offset tip-vs-receiver (m, 3D, in receiver plane)
                    self.shift = self.shift - 0.5 * hall
                    if self.appr <= 0.013 and np.linalg.norm(hall) > 0.001 and self.hold < 10: self.hold += 1   # pause above the pads until centred
                    else: self.appr = max(self.appr - APPR_STEP, -0.0004)
                else: self.appr = max(self.appr - APPR_STEP, -0.0004)
            goal = self.hover if self.phase == 0 else self.seat + self.shift + self.appr * z
            p0, R0 = self.pose(self.qik); J = np.zeros((6, 7)); h = 1e-3
            for j in range(7):
                qq = self.qik.copy(); qq[j] += h; p1, R1 = self.pose(qq)
                J[:3, j] = (p1 - p0) / h; J[3:, j] = 0.5 * sum(np.cross(R0[:, i], R1[:, i]) for i in range(3)) / h
            Js = J.copy(); Js[:3] *= 1000; Js[3:] *= 60; A = Js @ Js.T + 4 * np.eye(6)
            solve = lambda ev: Js.T @ np.linalg.solve(A, ev)
            lim = GENTLE_LIM if self.phase >= 1 else VMAX * 0.6
            self.qik = np.clip(self.qik + np.clip(solve(self.err(p0, R0, goal)), -lim, lim), NOM.lo, NOM.hi)
            if speed < 0.05: self.off = np.clip(self.off + 0.1 * np.clip(solve(self.err(pm, Rm, goal)), -0.004, 0.004), -0.08, 0.08)
            if self.phase == 0:
                ee = np.linalg.norm(goal - pm); ang = math.acos(max(-1, min(1, -(Rm[:, 1] @ z)))); sl = abs(slot(Rm[:, 0], self.Ro))
                ok = ee < 0.006 and ang < math.radians(3) and sl < math.radians(3) and speed < 0.03
                self.steady = self.steady + 1 if ok else 0
                if self.steady >= 4: self.phase = 1; print('  aligned at standoff -> going straight in')
            elif self.phase == 1 and self.appr <= -0.0004:
                self.phase = 2; print('  at seat -> turning lock fins 45 deg')
            if self.phase == 2: self.lock = min(45.0, self.lock + 5.0)
        self.k += 1
        return np.clip(self.qik + self.off, NOM.lo, NOM.hi), self.lock

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
    import os; env = TetroDockEnv(seed=int(os.environ.get('SEED', '321')), floor_frac=float(os.environ.get('FLOOR_FRAC', '0.9')), max_dist=0.30); res = []; t0 = time.time(); rng = np.random.default_rng(7)
    for ep in range(n):
        env.reset(); env.htol = (-1, -1)
        g = env.m.opt.gravity.copy(); t = math.degrees(math.acos(-g[2] / 9.81)); ph = math.degrees(math.atan2(g[1], g[0]))
        g_meas = gravity_from_tilt(max(0, t + rng.normal(0, 0.1)), ph + rng.normal(0, 10))      # phone level: +-0.1 deg, +-10 deg direction
        C = DockController(env.hover + env.bias_p, env.seat + env.bias_p, env.Rrx_obs[:, 2], env.Rrx_obs, env.standoff, env.cmd.copy(), gravity=g_meas)
        info = {}
        for t in range(env.ep_len):
            qm = env.qhist[max(0, len(env.qhist) - 1 - env.obs_lag)][0]      # lagged encoders, like the real bus
            hall = None
            if HALL:
                zr = env.Rrx[:, 2]; rel = env.d.site_xpos[env.s_tip] - env.seat; ax = rel @ zr
                if ax < 0.015: lat = rel - ax * zr; hall = lat + (np.eye(3) - np.outer(zr, zr)) @ rng.normal(0, 0.0005, 3)
            cmd, _ = C.step(qm, hall); env.cmd = cmd
            if C.phase >= 1 and env.phase == 0: env.phase = 1; env.prev_E = env._err()[0]
            o, r, te, tr, info = env.step(np.zeros(7))
            if te or tr: break
        res.append(info); print('ep %2d %-5s docked %-5s axial %.2f mm lock %.0f deg crash %s' % (ep, env.kind, info.get('success'), info.get('axial_mm', 0), info.get('lock_deg', 0), info.get('crash')), flush=True)
    ok = [bool(r.get('success')) for r in res]
    print('DEPLOY-CODE SELF-TEST: docked %d/%d = %.0f%% | crashes %d | %.0f s' % (sum(ok), n, 100 * np.mean(ok), sum(bool(r.get('crash')) for r in res), time.time() - t0)); print('DONE')

if __name__ == '__main__':
    if '--sim' in sys.argv: run_sim(int(sys.argv[-1]) if sys.argv[-1].isdigit() else 20)
    else: run_real()
