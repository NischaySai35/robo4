from paths import tpath
import sys, numpy as np
sys.path.insert(0, tpath('sim'))
import importlib.util
src = open(tpath('sim/torque_map.py'), encoding='utf-8').read()
head = src.split("res = {'floor'")[0].replace("S.stage('convert'", "#").replace("S.stage('torque'", "#").replace("S.set_log", "#")
exec(head)
last_ok = None
for dist in np.arange(0.400, 0.461, 0.005):
    b = solve(np.array([dist, 0, 0.034]), np.array([0, 0, -1.0]), starts=40, seed=3)
    (_, x, pe, ae, tau, zmin, ok) = b
    print('%.3f m ok=%s err=%.1fmm load=%.0f%%' % (dist, ok, pe, 100 * tau.max()))
    if ok: last_ok = (dist, tau.max())
S.log('Max floor docking reach (straight-down approach, standing on End A): %.1f cm at %.0f%% load on bend 1' % (last_ok[0] * 100, last_ok[1] * 100))
