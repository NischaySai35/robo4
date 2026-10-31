"""Replay one failing step-1 dock (seed 1000) and list what touches what when it gets stuck ~6.5 mm above the seat."""
from paths import tpath
import sys, math, io, contextlib, collections, numpy as np, mujoco
sys.path.insert(0, tpath('sim'))
import walk as Wm
from walk import Walker
from walk_env import WalkEnv
e = WalkEnv(seed=1000, randomize=True); e.reset(base='A', base_rx=0, yaw_deg=45)
W = Walker(e, 'A', 0, 0, e.m.opt.gravity.copy(), log=print); W.judge_fn = W.sim_camera
C = W._ctrl(1)
msgs = []
real_step = C.step
def step(qm):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf): r = real_step(qm)
    s = buf.getvalue().strip()
    if s: msgs.append('t=%d %s' % (e.t, s))
    return r
C.step = step
hold = [0]
def locks(lk): return (45.0, lk)
def done(C_, lk):
    if C_.phase == 3: return True
    if C_.phase == 2 and lk >= 45: hold[0] += 1
    return hold[0] >= 10
W._run(C, locks, done, 700, 'dock')
for m_ in msgs: print('  ', m_)
r = e.end_vs_rx('B', 1); print('END STATE:', {k: round(v, 2) for k, v in r.items()})
m, d = e.m, e.d
RB = d.xmat[e.end['B']['body']].reshape(3, 3); z = e.rx[1]['z']
print('End B tilt vs receiver axis: %.2f deg | magnet net force on B: %.1f N' % (math.degrees(math.acos(min(1, -(RB[:, 1] @ z)))), e.mag_force['B']))
bodyB = {e.end['B']['body'], m.body('L2_LockRotor_B').id}; rxb = m.body('rx1').id
cnt = collections.Counter(); deep = {}
for i in range(d.ncon):
    c = d.contact[i]; b1, b2 = m.geom_bodyid[c.geom1], m.geom_bodyid[c.geom2]
    if (b1 in bodyB and b2 == rxb) or (b2 in bodyB and b1 == rxb):
        g1, g2 = (c.geom1, c.geom2) if b1 in bodyB else (c.geom2, c.geom1)
        key = (m.geom(g1).name.split('_')[0] + '_' + m.geom(g1).name.split('_')[1], m.geom(g2).name.split('_')[1] + '_' + (m.geom(g2).name.split('_')[2] if len(m.geom(g2).name.split('_')) > 2 else ''))
        cnt[key] += 1; deep[key] = min(deep.get(key, 0), c.dist)
for k, v in cnt.most_common(12): print('  contact  %-22s <-> receiver %-18s x%d  deepest %.2f mm' % (k[0], k[1], v, deep[k] * 1000))
print('lock rotor angle (deg): %.1f' % math.degrees(d.qpos[e.end['B']['lockq']]))
