"""END<->END onto a LYING partner (kinematics + collision): walker stands on rx0 (End A), partner lies on the floor.
For partner End-A position (x,y) x heading x target end (A/B): IK for stand-off / hover / seat, twists < TWMAX, no collision.
Output C:/TETROBOT/logs/reach_lying.csv"""
from paths import tpath
import sys, os, io, math, time, contextlib, numpy as np
sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
import mujoco
from multi_env import MultiEnv
from walk import Walker
from lying import place_lying
import laptop_controller as L
STAND = float(os.environ.get('STAND', '0.05')); TWMAX = float(os.environ.get('TWMAX', '150')); BUDGET = float(os.environ.get('BUDGET', '900'))
e = MultiEnv(seed=0, randomize=False, xml=tpath('sim/multi_reach2.xml')); m, d = e.m, e.d
b0 = set(b for b in range(m.nbody) if m.body(b).name and not m.body(b).name.startswith(('rx', 'm1_')) and m.body(b).name != 'world')
b1 = set(b for b in range(m.nbody) if m.body(b).name.startswith('m1_'))
def hit():
    n = 0
    for k in range(d.ncon):
        c = d.contact[k]; x, y = int(m.geom_bodyid[c.geom1]), int(m.geom_bodyid[c.geom2])
        if (x in b0 and y in b1) or (y in b0 and x in b1): n += 1
    return n
names = [r['name'] for r in e.rx]
OUT = tpath('logs/reach_lying.csv'); f = open(OUT, 'w'); t0 = time.time(); n_ok = n_all = 0
print('END<->END onto a lying partner: sweep', flush=True)
for dist in (0.15, 0.25, 0.35, 0.45):
    for ang in range(0, 360, 45):
        for head in range(0, 360, 45):
            if time.time() - t0 > BUDGET: print('budget reached'); sys.exit(0)
            x, y = dist * math.cos(math.radians(ang)), dist * math.sin(math.radians(ang))
            e.reset(base_rx=0, yaw_deg=45.0, partners=[], settle=0)
            place_lying(e, 1, x, y, head, settle=300)
            if not np.isfinite(d.qpos).all(): continue
            low = min(d.xpos[b][2] for b in b0)
            for tgt in ('endA', 'endB'):
                J = names.index('m1_' + tgt); RX = e.rx[J]
                g = m.opt.gravity.copy(); W = Walker(e, 'A', 0, 0, g, log=lambda *a: None); qa = e.mods[0]['qa']; qsave = d.qpos[qa].copy()
                with contextlib.redirect_stdout(io.StringIO()): C = W._ctrl(J)
                q = np.zeros(7); ok = True; tw = 0; col = 0
                for s in ('stand', 'hover', 'in'):
                    goal = C.hover + STAND * C.z if s == 'stand' else (C.hover if s == 'hover' else C.seat + 0.002 * C.z)
                    q = L.NOM._ik(goal, C.z, C.Ro, q if s != 'stand' else np.zeros(7), seeds=8)
                    pp, nB, xB = L.NOM._fk(q); pe = np.linalg.norm(pp - goal) * 1000; an = math.degrees(math.acos(max(-1, min(1, float(-nB @ C.z)))))
                    tw = max(tw, np.degrees(np.abs(q[[0, 3, 6]])).max())
                    if pe > 1.5 or an > 1.5: ok = False; break
                    if s != 'in': d.qpos[qa] = q; mujoco.mj_forward(m, d); col += hit()
                d.qpos[qa] = qsave; mujoco.mj_forward(m, d)
                good = ok and tw < TWMAX and col == 0; n_all += 1; n_ok += good
                f.write('%.2f,%d,%d,%s,%.3f,%.2f,%.3f,%.3f,%d,%.0f,%d,%d\n' % (dist, ang, head, tgt, RX['seat'][2], RX['z'][2], x, y, int(ok), tw, col, int(good))); f.flush()
                if good: print('  GOOD  partner End A at %.2f m / %3d deg, lying heading %3d -> its %s | end height %.0f mm, twist max %.0f' % (dist, ang, head, tgt, RX['seat'][2] * 1000, tw), flush=True)
        print('dist %.2f ang %d done | %d checked %d good | %.0f s' % (dist, ang, n_all, n_ok, time.time() - t0), flush=True)
print('DONE', n_all, n_ok)
