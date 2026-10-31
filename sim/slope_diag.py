"""Why does step 1 time out on a slope? Log every judge event + the controller's estimate vs truth."""
from paths import tpath
import sys, math, io, contextlib, numpy as np
sys.path.insert(0, tpath('sim'))
from walk import Walker, L
from walk_env import WalkEnv
ang = float(sys.argv[1]); e = WalkEnv(seed=5000, randomize=True); e.reset(base='A', base_rx=0, yaw_deg=45)
a = math.radians(ang); g = 9.81 * np.array([-math.sin(a), 0, -math.cos(a)]); e.m.opt.gravity[:] = g
for _ in range(15): e.step(np.zeros(7), 45, 0)
W = Walker(e, 'A', 0, 0, g.copy(), log=print); W.judge_fn = W.sim_camera
C = W._ctrl(1); real = C.step; msgs = []
def step(qm):
    b = io.StringIO()
    with contextlib.redirect_stdout(b): r = real(qm)
    if b.getvalue().strip(): msgs.append('t=%d ph%d %s' % (e.t, C.phase, b.getvalue().strip()))
    if e.t % 100 == 0:
        Minv = np.linalg.inv(C._M); pn, _, _ = L.NOM._fk(W.nq(e.measured())); pw = (Minv @ np.r_[pn, 1])[:3]
        pt = e.d.site_xpos[e.end['B']['tip']]; hw = (Minv @ np.r_[C.hover, 1])[:3]
        msgs.append('t=%d ph%d est-vs-true %.1f mm | true-to-hover %.1f mm | est-to-aim %.1f mm | shift %.1f mm | off-integral max %.3f rad (clip 0.08)' % (
            e.t, C.phase, 1000 * np.linalg.norm(pw - pt), 1000 * np.linalg.norm(pt - hw), 1000 * np.linalg.norm(pn - (C.hover + C.shift)), 1000 * np.linalg.norm(C.shift), np.max(np.abs(C.off))))
    return r
C.step = step; hold = [0]
def done(C_, lk):
    if C_.phase == 3: return True
    if C_.phase == 2 and lk >= 45: hold[0] += 1
    return hold[0] >= 10
W._run(C, lambda lk: (45.0, lk), done, 900, 'dock')
for m in msgs[:60]: print(m)
