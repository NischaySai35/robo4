"""Slopes / walls: tilt the connector board (= tilt gravity in the board frame). Usage: python slope_test.py ANGLE_DEG DIR SEED
DIR = up (walking uphill along +x) or across (slope sideways to the walking direction). 90 = wall."""
from paths import tpath
import sys, math, numpy as np
sys.path.insert(0, tpath('sim'))
from walk import Walker
from walk_env import WalkEnv
ang, dirn, seed = float(sys.argv[1]), sys.argv[2], int(sys.argv[3])
log = open(tpath('logs/slope_%d_%s_%d.log') % (ang, dirn, seed), 'w')
def P(*a):
    s = ' '.join(str(x) for x in a); print(s, flush=True); log.write(s + '\n'); log.flush()
e = WalkEnv(seed=seed, randomize=True); e.reset(base='A', base_rx=0, yaw_deg=45)
a = math.radians(ang)
g = 9.81 * (np.array([-math.sin(a), 0, -math.cos(a)]) if dirn == 'up' else np.array([0, -math.sin(a), -math.cos(a)]))   # downhill = -x (up) or -y (across)
e.m.opt.gravity[:] = g
peak = {'v': 0.0, 'joint': ''}
raw = e.step
names = ['T1', 'B1', 'B2', 'T2', 'B3', 'B4', 'T3', 'L1', 'L2']
def step(*x, **k):
    r = raw(*x, **k)
    ratio = np.abs(e.d.actuator_force[e.all_act]) / np.maximum(e.fr0, 1e-9)
    i = int(np.argmax(ratio))
    if ratio[i] > peak['v']: peak['v'] = float(ratio[i]); peak['joint'] = names[i]
    return r
e.step = step
for _ in range(15): e.step(np.zeros(7), 45, 0)            # settle on the slope (straight pose)
P('slope %.0f deg %s: straight pose settled, peak torque so far %.0f%% (%s)' % (ang, dirn, 100 * peak['v'], peak['joint']))
W = Walker(e, 'A', 0, 0, g.copy(), log=P); W.judge_fn = W.sim_camera
ok = True; done = 0
for j in [1, 2, 3]:
    peak['v'] = 0.0
    r = W.step_to(j)
    P('  step %d: %s | peak servo torque %.0f%% of its limit (%s)' % (j, 'OK' if r else 'FAILED', 100 * peak['v'], peak['joint']))
    if not r: ok = False; break
    done += 1
P('RESULT slope %.0f %s seed %d: %d/3 steps%s' % (ang, dirn, seed, done, ' ALL OK' if ok else ''))
