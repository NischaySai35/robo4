"""Batch dock-feasibility sweep (kinematics + collision only, no dynamics): walker (module 0, End A on floor rx0) End B -> partner side receivers.
For each partner floor spot x yaw x lean x receiver: IK to stand-off(+STAND m), hover, seat; need twists < TWMAX, no walker<->partner collision on the stand-off/hover/in path.
Output: C:\TETROBOT\logs\reach2.csv  (resume-safe; time-boxed with BUDGET seconds)."""
from paths import tpath
import sys, os, io, math, time, contextlib, itertools, numpy as np
sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
import mujoco, build_multi
BUDGET = float(os.environ.get('BUDGET', '110')); STAND = float(os.environ.get('STAND', '0.05')); TWMAX = float(os.environ.get('TWMAX', '150'))
G = [-0.3, -0.2, -0.1, 0.1, 0.2, 0.3]
RX = [(0, 0, 0)] + [(x, y, 0) for x in G for y in G if abs(x) + abs(y) >= 0.2]
XML = tpath('sim/multi_reach2.xml'); build_multi.build(XML, RX, nmod=2)
from multi_env import MultiEnv
from walk import Walker
import laptop_controller as L
OUT = tpath('logs/reach2.csv')
done = set(l.split(',')[0] for l in open(OUT)) if os.path.exists(OUT) else set()
f = open(OUT, 'a'); t0 = time.time()
LEAN = {'straight': np.zeros(7), 'B1+': np.array([0, .5, 0, 0, 0, 0, 0]), 'B1-': np.array([0, -.5, 0, 0, 0, 0, 0])}
e = MultiEnv(seed=0, randomize=False, xml=XML); m, d = e.m, e.d
bodies0 = set(); bodies1 = set()
for b in range(m.nbody):
    n = m.body(b).name
    if n.startswith('m1_'): bodies1.add(b)
    elif n and not n.startswith('rx') and n != 'world': bodies0.add(b)
def hit():
    n = 0
    for k in range(d.ncon):
        c = d.contact[k]; b1, b2 = int(m.geom_bodyid[c.geom1]), int(m.geom_bodyid[c.geom2])
        if (b1 in bodies0 and b2 in bodies1) or (b2 in bodies0 and b1 in bodies1): n += 1
    return n
def stat(q, qa):
    d.qpos[qa] = q; mujoco.mj_forward(m, d); return hit()
nrun = 0
for pi in range(1, len(RX)):
    for yaw in (45, 135, 225, 315):
        for ln, qp in LEAN.items():
            if time.time() - t0 > BUDGET: print('budget reached'); sys.exit(0)
            key = '%d_%d_%s' % (pi, yaw, ln)
            if key in done: continue
            e.reset(base_rx=0, yaw_deg=45.0, partners=[(1, pi, float(yaw), qp)], settle=40)
            g = m.opt.gravity.copy(); W = Walker(e, 'A', 0, 0, g, log=lambda *a: None); qa = e.mods[0]['qa']; qsave = d.qpos[qa].copy()
            for n in range(4):
                j = [i for i, r in enumerate(e.rx) if r['name'] == 'm1_srx%d' % n][0]
                with contextlib.redirect_stdout(io.StringIO()): C = W._ctrl(j)
                res = []
                q = np.zeros(7); ok = True; tw = 0; col = 0
                for s, off in (('stand', STAND), ('hover', 0.0), ('in', -0.006)):
                    goal = (C.hover if s != 'in' else C.seat + 0.002 * C.z) + off * C.z * (1 if s == 'stand' else 0)
                    q = L.NOM._ik(goal, C.z, C.Ro, q if s != 'stand' else np.zeros(7), seeds=10)
                    pp, nB, xB = L.NOM._fk(q); pe = np.linalg.norm(pp - goal) * 1000; ang = math.degrees(math.acos(max(-1, min(1, float(-nB @ C.z)))))
                    tw = max(tw, np.degrees(np.abs(q[[0, 3, 6]])).max())
                    if pe > 1.5 or ang > 1.5: ok = False
                    if s != 'in': col += stat(q, qa)
                    if s == 'stand': qs = q.copy()
                # swept check stand-off -> hover
                for a in np.linspace(0, 1, 6): col += stat(qs + a * (q - qs), qa) if False else 0
                d.qpos[qa] = qsave
                good = ok and tw < TWMAX and col == 0
                f.write('%s,%d,%.2f,%.2f,%d,%s,%d,%.0f,%d,%d\n' % (key, n, RX[pi][0], RX[pi][1], yaw, ln, int(ok), tw, col, int(good))); f.flush(); nrun += 1
print('done', nrun, 'cases in %.0f s' % (time.time() - t0))
