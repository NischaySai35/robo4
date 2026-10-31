from paths import tpath
import sys, json, math, numpy as np
from scipy.optimize import minimize
sys.path.insert(0, tpath('sim'))
src = open(tpath('sim/torque_map.py'), encoding='utf-8').read()
head = src.split("res = {'floor'")[0].replace("S.stage('convert'", "#").replace("S.stage('torque'", "#").replace("S.set_log", "#")
exec(head)
REC_TOP = 0.020; FACE = 0.004   # receiver top height; rotor centre sits 4 mm above contact
nt = np.array([0, 0, -1.0])
def refine(pt, x0):
    def f(x):
        p, n, tau, zmin = fk(x)
        return 6000 * np.sum((p - pt) ** 2) + 50 * (1 - np.dot(n, nt)) + 0.02 * np.sum(tau ** 4) + 0.5 * np.sum((x - x0) ** 2)
    r = minimize(f, x0, method='L-BFGS-B', bounds=list(zip(lo, hi)), options={'maxiter': 600}); return r.x
show = [{'label': 'Finger push test: bend plane (2 N), then released', 'joints': {}, 'push': [0, 2.0, 0], 'move': 0.5, 'hold': 5.5},
        {'label': 'Finger push test: sideways (2 N), then released', 'joints': {}, 'push': [2.0, 0, 0], 'move': 0.5, 'hold': 5.5}]
for dist in [0.30, 0.40]:
    tgt = [dist, 0, REC_TOP]
    hov = solve(np.array([dist, 0, REC_TOP + FACE + 0.020]), nt, starts=30, seed=5)
    xh = hov[1]
    path = [(0.020, xh)]
    for gap in [0.012, 0.006, 0.0]:
        path.append((gap, refine(np.array([dist, 0, REC_TOP + FACE + gap]), path[-1][1])))
    errs = []
    for gap, x in path:
        p, n, tau, _ = fk(x); errs.append((gap, np.hypot(p[0] - dist, p[1]) * 1000, math.degrees(math.acos(min(1, np.dot(n, nt)))), tau.max()))
    J = lambda x: {ACT[i]: round(math.degrees(x[i]), 2) for i in range(len(ACT))}
    show.append({'label': '%d cm: 1) swing over and ALIGN 2 cm above the receiver, normals matched' % (dist * 100), 'joints': J(xh), 'target': tgt, 'move': 4.0, 'hold': 2.0})
    for gap, x in path[1:]:
        lockv = {}
        show.append({'label': '%d cm: 2) move straight down the normal, gap %.0f mm' % (dist * 100, gap * 1000), 'joints': J(x), 'target': tgt, 'move': 1.2, 'hold': 0.5 if gap > 0 else 1.0})
    jl = J(path[-1][1]); jl['J_L2_lock'] = 45.0
    show.append({'label': '%d cm: 3) seated: rotate lock 45 deg to latch' % (dist * 100), 'joints': jl, 'target': tgt, 'move': 1.5, 'hold': 2.0})
    show.append({'label': '%d cm: unlock, lift straight back out, return' % (dist * 100), 'joints': J(xh), 'target': tgt, 'move': 2.0, 'hold': 0.5})
    show.append({'label': 'Back to standing', 'joints': {}, 'move': 3.5, 'hold': 1.5})
    for g, pe, ae, t in errs: S.log('  approach %d cm, gap %4.1f mm: sideways drift %.2f mm, normal error %.2f deg, worst load %.0f%%' % (dist * 100, g * 1000, pe, ae, 100 * t))
json.dump(show, open(tpath('showcase.json'), 'w'), indent=1)
S.log('Showcase updated: align 2 cm above -> straight down the normal -> lock 45 deg')
