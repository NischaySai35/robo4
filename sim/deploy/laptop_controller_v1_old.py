"""TETROBOT laptop controller (DRAFT - review before use).
Runs the SAME sag-aware IK (+ optional RL corrections) that docked in simulation, on the real module:
  every 60 ms: read 9 servo angles from the ESP32 (/api/telemetry, firmware already sync-reads them every 60 ms)
               -> estimate End B pose incl. PLA sag -> one IK step (+ brain correction) -> /api/batch (SyncWritePosEx, acc 40)
Safety: DRY_RUN=True by default (prints, sends nothing). Ctrl-C = stop sending (servos hold last target).
YOU MUST FILL: SERVO_ID / SIGN / HOME for each joint, and the receiver pose (measured).
"""
from paths import tpath
import sys, time, math, json, urllib.request, numpy as np
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv, RX_GAP, RX_TOP, VMAX

ESP = 'http://mod1.local'          # or the board IP shown on its web page
DRY_RUN = True
USE_BRAIN = False                  # True = add the trained RL corrections (runs/dock_ikrl/brain.npz)
# joint order used by the sim: T1, B1, B2, T2, B3, B4, T3 (+ locks L1, L2)
JOINTS = ['T1', 'B1', 'B2', 'T2', 'B3', 'B4', 'T3']
SERVO_ID = {'L1': 1, 'T1': 2, 'B1': 3, 'B2': 4, 'T2': 5, 'B3': 6, 'B4': 7, 'T3': 8, 'L2': 9}   # TODO: check on your module
SIGN     = {k: +1 for k in SERVO_ID}                                                          # TODO: +1/-1 so sim +angle == servo +angle
HOME     = {k: 180.0 for k in SERVO_ID}                                                       # servo degrees at sim zero (straight)
# receiver to dock with, measured in the module base frame (metres, End A on the floor lock)
RX_POS = np.array([0.30, 0.0, 0.0]); RX_YAW_DEG = 0.0; STANDOFF = 0.022

def get(path):
    with urllib.request.urlopen(ESP + path, timeout=0.2) as r: return json.loads(r.read())
def read_q():
    J = get('/api/telemetry'); a = {s['id']: s['currentAngle'] for s in J['servos'] if s['currentAngle'] is not None}
    return np.array([math.radians(SIGN[k] * (a[SERVO_ID[k]] - HOME[k])) for k in JOINTS])
def send(q_cmd, lock_deg=0.0):
    parts = ['speed=10', 'acc=40'] + ['%d=%.2f' % (SERVO_ID[k], HOME[k] + SIGN[k] * math.degrees(v)) for k, v in zip(JOINTS, q_cmd)]
    parts.append('%d=%.2f' % (SERVO_ID['L2'], HOME['L2'] + SIGN['L2'] * lock_deg))
    url = '/api/batch?' + '&'.join(parts)
    if DRY_RUN: print('DRY', url); return
    get(url)

sim = TetroDockEnv(seed=0, randomize=False)      # nominal model: used ONLY for the sag estimate + IK maths
z = np.array([0, 0, 1.0]); Ro = np.array([[math.cos(math.radians(RX_YAW_DEG)), -math.sin(math.radians(RX_YAW_DEG)), 0], [math.sin(math.radians(RX_YAW_DEG)), math.cos(math.radians(RX_YAW_DEG)), 0], [0, 0, 1]])
o = RX_POS + np.r_[sim.base_xy, 0]; hover = o + (RX_TOP + STANDOFF) * z; seat = o + RX_GAP * z

def ik_step(q, goal, gentle):
    def pose(qq):
        p, n, x = sim._fk(qq); return p, np.stack([x, n, np.cross(x, n)], -1)
    p0, R0 = pose(q); J = np.zeros((6, 7)); h = 1e-3
    for j in range(7):
        qq = q.copy(); qq[j] += h; p1, R1 = pose(qq)
        J[:3, j] = (p1 - p0) / h; J[3:, j] = 0.5 * sum(np.cross(R0[:, i], R1[:, i]) for i in range(3)) / h
    nB, xB = R0[:, 1], R0[:, 0]
    a = math.atan2(xB @ Ro[:, 1], xB @ Ro[:, 0]) - math.pi / 4; s = (a + math.pi / 4) % (math.pi / 2) - math.pi / 4
    e = np.r_[(goal - p0) * 1000, (np.cross(nB, -z) - s * z) * 60]
    Js = J.copy(); Js[:3] *= 1000; Js[3:] *= 60
    dq = Js.T @ np.linalg.solve(Js @ Js.T + 4 * np.eye(6), e)
    lim = 0.03 if gentle else VMAX * 0.6
    return np.clip(q + np.clip(dq, -lim, lim), sim.lo, sim.hi), np.linalg.norm(goal - p0)

if __name__ == '__main__':
    q = read_q() if not DRY_RUN else np.zeros(7); cmd = q.copy(); phase = 0; appr = RX_TOP - RX_GAP + STANDOFF; steady = 0; lock = 0.0
    seed = sim._ik(hover, z, Ro, q, seeds=8); t0 = time.time(); k = 0
    print('seed pose (deg):', np.round(np.degrees(seed), 1))
    try:
        while True:
            tick = time.time()
            q = read_q() if not DRY_RUN else cmd
            if k < 18: cmd = cmd + np.clip(seed - cmd, -VMAX * 0.5, VMAX * 0.5)                  # swing toward the seed pose
            else:
                if phase >= 1: appr = max(appr - 0.003, -0.0004)
                goal = hover if phase == 0 else seat + appr * z
                cmd, err = ik_step(cmd, goal, phase >= 1)
                if phase == 0 and err < 0.006: steady += 1
                if phase == 0 and steady >= 4: phase = 1; print('aligned at standoff -> going straight in')
                if phase == 1 and appr <= -0.0004: phase = 2; print('at seat -> turning lock 45 deg')
                if phase == 2: lock = min(45.0, lock + 5.0)
            send(cmd, lock); k += 1
            if phase == 2 and lock >= 45.0 and k > 0: print('lock command complete - verify by hand / pull test'); break
            time.sleep(max(0, 0.06 - (time.time() - tick)))
    except KeyboardInterrupt:
        print('stopped - servos hold their last target')
