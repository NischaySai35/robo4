"""Step-1 docking on 12 random robots: base end with normal magnets (can rock 0.52 deg in the lock play)
vs base end with 20x magnets (effectively no rocking). Same robots, same controller."""
from paths import tpath
import sys, os, math, numpy as np
sys.path.insert(0, tpath('sim'))
from walk import Walker
from walk_env import WalkEnv
V = sys.argv[1]
ok = 0
for seed in range(700, 712):
    e = WalkEnv(seed=seed, randomize=True); e.reset(base='A', base_rx=0, yaw_deg=45)
    if V == 'stiff': e.mag_boost = {'A': 20.0}
    W = Walker(e, 'A', 0, 0, e.m.opt.gravity.copy(), log=lambda *a: None)
    C = W._ctrl(1); hold = [0]
    def locks(lk): return (45.0, lk)
    def done(C, lk):
        if C.phase == 2 and lk >= 45: hold[0] += 1
        return hold[0] >= 10
    W._run(C, locks, done, 700, 'dock')
    r = e.end_vs_rx('B', 1); good = abs(r['axial_mm']) < 0.8 and r['radial_mm'] < 1.5 and r['lock_deg'] > 40; ok += good
    RA = e.d.xmat[e.end['A']['body']].reshape(3, 3)
    print('seed %d %-6s %-4s gap %5.2f side %5.2f | base rock %.2f deg' % (seed, V, 'OK' if good else 'FAIL', r['axial_mm'], r['radial_mm'], math.degrees(math.acos(min(1, RA[2, 1])))), flush=True)
print('RESULT %s: %d/12' % (V, ok), flush=True)
