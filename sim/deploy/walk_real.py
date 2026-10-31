"""TETROBOT real-robot WALKING runner (DRAFT - review before use). Same logic that was verified in the real-physics sim.
Cycle per step: dock free end -> lock 45 -> unlock old base -> peel + pull out -> curl up -> swing over -> dock next -> swap roles.
The laptop runs everything and sends servo targets to the ESP32 every 60 ms. Feedback = servo encoders (+ the JUDGE).

JUDGE = YOU (until the camera exists). The laptop pauses (servos hold) and asks:
  above a connector : "centred and straight?"  -> Enter = yes, or corrections, e.g.  x+3 y-2 r+2
                       x/y = where the End IS relative to the connector centre, mm, along the board's X/Y arrows
                       r   = End is twisted this many degrees counter-clockwise (seen from above) from the right slot
  before the lock    : "seated flat, no gap?"  -> y / n      (n = no lock, it backs off and retries)
  after pull-out     : "End out of the connector?" -> y / n
Usage:
  python walk_real.py            DRY_RUN (prints commands, sends nothing, judge auto-answers yes)
  python walk_real.py --simtest  run THIS runner against the simulator, judge answered by a simulated camera (code-path test)
Fill in: SERVO_ID / SIGN / HOME (in laptop_controller.py), LOCK_DIR, RECEIVERS (measured), FLOOR_TILT (phone level).
"""
from paths import tpath
import sys, os, time, math, json, urllib.request, numpy as np
sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
import io, contextlib
with contextlib.redirect_stdout(io.StringIO()):
    import laptop_controller as L
from walk import Walker
from tetro_env2 import RX_GAP

DRY_RUN = True
# receivers on the board, in metres/degrees, measured from connector 0 (where End A starts locked). X/Y = arrows you draw on the board.
RECEIVERS = [(0.00, 0.0, 0.0), (0.25, 0.0, 0.0), (0.50, 0.0, 0.0), (0.75, 0.0, 0.0)]       # TODO measure
LOCK_DIR = L.LOCK_DIR_CAL or {'A': -1.0, 'B': +1.0}   # from calibrate.py if done; else guess (A is the mirror of B)
START_YAW_DEG = 45.0                    # End A pads sit at 45 deg to the board X axis in connector 0 (pads in the gaps)

def Rz(deg):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg)); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1.0]])

class RealEnv:
    """Same interface the Walker uses in the sim, but talks to the ESP32. No 'truth' here - only encoders + judge."""
    def __init__(self, dry=True):
        self.dry = dry; self.t = 0; self.cmd = np.zeros(7); self.mag_force = {'A': 0.0, 'B': 0.0}
        self.rx = []
        for (x, y, yaw) in RECEIVERS:
            R = Rz(yaw); o = np.array([x, y, 0.0]); z = R[:, 2]
            self.rx.append(dict(o=o, R=R, z=z, seat=o + RX_GAP * z))
        self.rx_bias = [np.zeros(3) for _ in self.rx]
        self.last_tick = time.time()
    def measured(self):
        if self.dry: return self.cmd.copy()
        J = L.get('/api/telemetry'); a = {s['id']: s['currentAngle'] for s in J['servos'] if s['currentAngle'] is not None}
        return np.array([math.radians(L.SIGN[k] * (a[L.SERVO_ID[k]] - L.HOME[k])) for k in L.JOINTS])
    def step(self, cmd, lockA_deg, lockB_deg):
        self.cmd = np.asarray(cmd, float).copy()
        parts = ['speed=10', 'acc=40'] + ['%d=%.2f' % (L.SERVO_ID[k], L.HOME[k] + L.SIGN[k] * math.degrees(v)) for k, v in zip(L.JOINTS, self.cmd)]
        parts.append('%d=%.2f' % (L.SERVO_ID['L1'], L.HOME['L1'] + L.SIGN['L1'] * LOCK_DIR['A'] * lockA_deg))
        parts.append('%d=%.2f' % (L.SERVO_ID['L2'], L.HOME['L2'] + L.SIGN['L2'] * LOCK_DIR['B'] * lockB_deg))
        url = '/api/batch?' + '&'.join(parts)
        if self.dry:
            if self.t % 20 == 0: print('DRY', url)
        else: L.get(url)
        time.sleep(max(0, L.DT - (time.time() - self.last_tick))); self.last_tick = time.time()
        self.t += 1
        return {'ok': True, 'lowest_link_mm': 999.0, 't': self.t}

def parse_corr(s):
    d = np.zeros(3); r = 0.0
    for tok in s.replace(',', ' ').split():
        try:
            v = float(tok[1:])
            if tok[0] in 'xX': d[0] = v / 1000
            elif tok[0] in 'yY': d[1] = v / 1000
            elif tok[0] in 'rR': r = math.radians(v)
        except ValueError: pass
    return d, r

def make_human_judge(walker, dry):
    def judge(stage, C):
        if dry: return (np.zeros(3), 0.0, np.zeros(3)) if stage == 'hover' else (True if stage == 'out' else (True, np.zeros(3)))
        if stage == 'hover':
            s = input('\nJUDGE: End %s is above connector %d. Centred and straight? [Enter]=yes, or e.g. "x+3 y-2 r+2": ' % (walker.moving, C._rx)).strip()
            d_w, r = parse_corr(s)
            return C._M[:3, :3] @ d_w, r, np.zeros(3)          # world (board) offset -> controller coords
        if stage == 'seat':
            s = input('\nJUDGE: End %s seated FLAT in connector %d (no gap)? [y/n]: ' % (walker.moving, C._rx)).strip().lower()
            return s.startswith('y'), np.zeros(3)
        if stage == 'out':
            s = input('\nJUDGE: End %s fully OUT of its connector? [y/n]: ' % C).strip().lower()
            return s.startswith('y')
    return judge

def walk(env, judge_factory, steps, log=print):
    W = Walker(env, 'A', 0, 0, L.gravity_from_tilt(L.FLOOR_TILT_DEG, L.FLOOR_TILT_DIR_DEG), log=log)
    W.judge_fn = judge_factory(W)
    for j in steps:
        log('=== step to connector %d (moving End %s) ===' % (j, W.moving))
        if not W.step_to(j):
            log('STOPPED at connector %d - servos hold their last target. Fix by hand, then restart.' % j); return False
    log('WALK COMPLETE'); return True

if __name__ == '__main__':
    if '--simtest' in sys.argv:
        # code-path test: this runner's real-robot branch (no truth access), driven by the simulator through a narrow wrapper
        from walk_env import WalkEnv
        class SimAsReal:
            def __init__(self, seed):
                self._e = WalkEnv(seed=seed, randomize=True); self._e.reset(base='A', base_rx=0, yaw_deg=START_YAW_DEG)
                self.rx, self.rx_bias, self.mag_force = self._e.rx, self._e.rx_bias, {'A': 0.0, 'B': 0.0}
            @property
            def t(self): return self._e.t
            @property
            def cmd(self): return self._e.cmd
            def measured(self): return self._e.measured()
            def step(self, cmd, la, lb): return self._e.step(cmd, la, lb)
        seed = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 7
        env = SimAsReal(seed)
        g = env._e.m.opt.gravity                                    # like measuring the floor with the phone level
        L.FLOOR_TILT_DEG = math.degrees(math.acos(-g[2] / 9.81)); L.FLOOR_TILT_DIR_DEG = math.degrees(math.atan2(g[1], g[0]))
        print('floor tilt (phone level): %.2f deg toward %.0f deg' % (L.FLOOR_TILT_DEG, L.FLOOR_TILT_DIR_DEG))
        def factory(W):
            cam = W.sim_camera
            def judge(stage, C):          # same answers a human/camera would give, from the simulator
                if stage == 'out':
                    return env._e.end_vs_rx(C, W.left_rx if hasattr(W, 'left_rx') else 0)['axial_mm'] > 12
                W.e = env._e; r = cam(stage, C); W.e = env
                if stage == 'hover': print('   [sim-judge] above connector: off %.1f mm, twist %.1f deg' % (np.linalg.norm(r[0]) * 1000, math.degrees(r[1])))
                else: print('   [sim-judge] seated?', r[0])
                return r
            return judge
        ok = walk(env, factory, range(1, len(env.rx)))
        print('SIMTEST RESULT:', 'OK' if ok else 'FAILED')
    else:
        env = RealEnv(dry=DRY_RUN)
        walk(env, lambda W: make_human_judge(W, DRY_RUN), range(1, len(env.rx)))
