from paths import tpath
import sys, numpy as np, time
sys.path.insert(0, tpath('sim'))
t0 = time.time()
from multi_env import MultiEnv
print('import', round(time.time() - t0, 1), flush=True)
e = MultiEnv(seed=1, randomize=False); print('model loaded', round(time.time() - t0, 1), 'ngeom', e.m.ngeom, 'noslip', e.m.opt.noslip_iterations, flush=True)
e.reset(base_rx=0, yaw_deg=45.0, partners=[(1, 1, 45.0, np.zeros(7))], settle=20); print('reset', round(time.time() - t0, 1), flush=True)
np.set_printoptions(precision=3, suppress=True)
for RX in e.rx:
    if RX['dyn'] and RX['mod'] == 1: print(RX['name'], 'seat', RX['seat'].round(3), 'normal', RX['z'].round(2), flush=True)
for k in range(10):
    t1 = time.time(); e.step(np.zeros(7), 45.0, 0.0); print('frame', k, round(time.time() - t1, 2), 's ncon', e.d.ncon, flush=True)
print(e.status(), flush=True)
