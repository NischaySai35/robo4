from paths import tpath
import json, math, sys, time
import numpy as np, mujoco
from scipy.optimize import minimize
sys.path.insert(0, tpath('sim'))
import status as S
S.stage('convert', 'done', 'MuJoCo model ready (1.1347 kg, 698 mm tall). Isaac USD is built at training setup.')
S.stage('torque', 'running', 'Searching lowest-effort pose for each target')
S.set_log('logs/sim.log')
m = mujoco.MjModel.from_xml_path(tpath('sim/tetrobot_scene.xml')); d = mujoco.MjData(m)
TAU = 2.7
ACT = ['J_T1_twist', 'J_B1_bend', 'J_B2_bend', 'J_T2_twist', 'J_B3_bend', 'J_B4_bend', 'J_T3_twist']
qa = [m.joint(n).qposadr[0] for n in ACT]; da = [m.joint(n).dofadr[0] for n in ACT]
lo = np.array([m.jnt_range[m.joint(n).id][0] for n in ACT]); hi = np.array([m.jnt_range[m.joint(n).id][1] for n in ACT])
tip = m.body('L2_LockRotor_B').id
chk = [m.body(n).id for n in ['T1_Housing_B1Fork', 'Spine1_B1B2', 'T2_Housing_B2Fork_GROUND', 'T2_Ring_B3Fork', 'Spine2_B3B4', 'T3_Housing_B4Fork', 'EndB_LockModule']]
def fk(x):
    d.qpos[:] = 0; d.qpos[qa] = x; d.qvel[:] = 0
    mujoco.mj_forward(m, d)
    p = d.xpos[tip].copy(); n = d.xmat[tip].reshape(3, 3)[:, 1].copy()
    tau = np.abs(d.qfrc_bias[da]) / TAU
    zmin = min(d.xpos[b][2] for b in chk)
    return p, n, tau, zmin
def solve(pt, nt, starts=24, seed=0):
    rng = np.random.default_rng(seed); best = None
    def f(x):
        p, n, tau, zmin = fk(x)
        e = 4000 * np.sum((p - pt) ** 2) + 30 * (1 - np.dot(n, nt)) + 0.02 * np.sum(tau ** 4) + 200 * max(0, 0.035 - zmin) ** 2
        return e
    for s in range(starts):
        x0 = rng.uniform(lo * 0.8, hi * 0.8)
        r = minimize(f, x0, method='L-BFGS-B', bounds=list(zip(lo, hi)), options={'maxiter': 400})
        p, n, tau, zmin = fk(r.x)
        pe = np.linalg.norm(p - pt) * 1000; ae = math.degrees(math.acos(max(-1, min(1, np.dot(n, nt)))))
        ok = pe < 2 and ae < 1.5 and zmin > 0.025
        score = (0 if ok else 1, tau.max())
        if best is None or score < best[0]: best = (score, r.x.copy(), pe, ae, tau.copy(), zmin, ok)
    return best
res = {'floor': [], 'air': []}
S.log('=== Strength test 1: dock End B onto a floor receiver, hover 10 mm above it ===')
for dist in [0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60]:
    t0 = time.time()
    pt = np.array([dist, 0.0, 0.020 + 0.010 + 0.004]); nt = np.array([0, 0, -1.0])
    b = solve(pt, nt)
    (_, x, pe, ae, tau, zmin, ok) = b
    worst = ACT[int(np.argmax(tau))]
    row = {'dist_cm': round(dist * 100), 'reached': bool(ok), 'pos_err_mm': round(pe, 2), 'ang_err_deg': round(ae, 2), 'max_load_pct': round(100 * tau.max(), 1), 'worst_joint': worst, 'pose_deg': {ACT[i]: round(math.degrees(x[i]), 1) for i in range(len(ACT))}}
    res['floor'].append(row)
    verdict = 'REACHED' if ok else 'cannot reach'
    risk = 'safe' if tau.max() < 0.6 else ('busy' if tau.max() < 0.85 else 'WILL STRUGGLE')
    S.log('  %2d cm: %s | worst motor %s at %.0f%% (%s) | err %.1f mm %.1f deg | %.0fs' % (dist * 100, verdict, worst, 100 * tau.max(), risk, pe, ae, time.time() - t0))
    json.dump(res, open(tpath('results_torque.json'), 'w'), indent=1)
S.log('=== Strength test 2: point End B straight out sideways at points in the air ===')
for r_ in [0.15, 0.25, 0.35, 0.45, 0.55]:
    for z in [0.10, 0.25, 0.40, 0.55, 0.70, 0.85]:
        pt = np.array([r_, 0.0, z]); nt = np.array([1.0, 0, 0])
        b = solve(pt, nt, starts=12, seed=1)
        (_, x, pe, ae, tau, zmin, ok) = b
        res['air'].append({'r_cm': round(r_ * 100), 'z_cm': round(z * 100), 'reached': bool(ok), 'max_load_pct': round(100 * tau.max(), 1), 'worst_joint': ACT[int(np.argmax(tau))], 'pose_deg': {ACT[i]: round(math.degrees(x[i]), 1) for i in range(len(ACT))}})
        S.log('  air r=%2d cm z=%2d cm: %s, worst load %.0f%%' % (r_ * 100, z * 100, 'reached' if ok else 'unreachable', 100 * tau.max()))
        json.dump(res, open(tpath('results_torque.json'), 'w'), indent=1)
fl = res['floor']; good = [r['dist_cm'] for r in fl if r['reached'] and r['max_load_pct'] < 85]
S.stage('torque', 'done', 'Floor docking feasible with margin at: %s cm' % (', '.join(map(str, good)) or 'none'))
S.note('Strength test done. Docking OK (<85%% load) at %s cm. Results in C:\\TETROBOT\\results_torque.json' % (', '.join(map(str, good)) or 'no'))
S.log('DONE strength test')
