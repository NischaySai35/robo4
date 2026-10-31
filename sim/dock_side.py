"""Walker (module 0, End A locked on floor rx0) docks its free End B into a side receiver on a partner module (module 1, standing on floor rx1).
env: SEED, RAND(0/1), TARGET (srx1|srx3), QP (partner pose name: straight|lean), JUDGE(0/1), MAXF"""
from paths import tpath
import sys, os, io, math, time, contextlib, numpy as np
sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
from multi_env import MultiEnv
from walk import Walker
import laptop_controller as L
def P(*a): print(' '.join(str(x) for x in a), flush=True)
seed = int(os.environ.get('SEED', '1')); rand = os.environ.get('RAND', '0') == '1'
QP = {'straight': np.zeros(7), 'lean': np.array([0, math.radians(25), 0, 0, 0, 0, 0])}[os.environ.get('QP', 'straight')] if not os.environ.get('QDEG') else np.radians([float(v) for v in os.environ['QDEG'].split(',')])
XML = os.environ.get('XML'); e = MultiEnv(seed=seed, randomize=rand, xml=XML) if XML else MultiEnv(seed=seed, randomize=rand)
e.reset(base_rx=0, yaw_deg=45.0, partners=[(1, int(os.environ.get('SPOT', '1')), float(os.environ.get('PYAW', '45')), QP)])
for _ in range(20): e.step(np.zeros(7), 45.0, 0.0)
j = [i for i, r in enumerate(e.rx) if r['name'] == 'm1_' + os.environ.get('TARGET', 'srx1')][0]
RXj = e.rx[j]; P('target', RXj['name'], 'seat', RXj['seat'].round(3), 'normal', RXj['z'].round(2), 'partner tip drift mm', np.round(1000 * (e.d.site_xpos[e.mods[1]['end']['B']['tip']] - 0), 0))
g = e.m.opt.gravity.copy(); W = Walker(e, 'A', 0, 0, g, log=P)
if os.environ.get('JUDGE', '1') == '1': W.judge_fn = W.sim_camera
W.debug = os.environ.get('DBG', '0') == '1'
t0 = time.time(); mv = W.moving; C = W._ctrl(j); hold = [0]
def locks(lk): return (45.0, lk)
def done(C_, lk):
    if C_.phase == 3: return True
    if C_.phase == 2 and lk >= 45 and e.end_vs_rx(mv, j)['lock_deg'] > 40: hold[0] += 1
    return hold[0] >= 10
ok = W._run(C, locks, done, int(os.environ.get('MAXF', '700')), 'dock End B -> %s' % RXj['name'])
r = e.end_vs_rx(mv, j)
P('RESULT', 'OK' if (ok and abs(r['axial_mm']) < 0.8 and r['radial_mm'] < 1.5 and r['lock_deg'] > 40) else 'FAILED', '| gap %.2f mm side %.2f mm lock %.0f deg | %.1f s sim, %.0f s wall' % (r['axial_mm'], r['radial_mm'], r['lock_deg'], e.t * 0.06, time.time() - t0))
P('partner A seat gap mm', round(e.end_vs_rx('A', 1, mod=1)['axial_mm'], 2), '| twist max deg', np.round(getattr(W, 'twmax', np.zeros(3))).astype(int))

import mujoco, collections
cc = collections.Counter()
for k in range(e.d.ncon):
    c = e.d.contact[k]; b1 = e.m.body(e.m.geom_bodyid[c.geom1]).name; b2 = e.m.body(e.m.geom_bodyid[c.geom2]).name
    if b1.startswith('m1_') != b2.startswith('m1_'): cc[(b1, b2)] += 1
P('cross-module contacts', dict(cc.most_common(8)))

P('detail', {k: (np.round(v, 2).tolist() if hasattr(v, 'tolist') else v) for k, v in r.items()})


