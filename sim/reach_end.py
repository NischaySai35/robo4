"""END<->END feasibility sweep (kinematics + collision only): walker (module 0, End A in floor rx0) docks its End B into the PARTNER'S End B.
Partner stands on a floor spot with its End A and holds a bent pose so its End B points sideways/down at a reachable height.
For each spot x yaw x partner pose: IK to stand-off(+STAND), hover, seat; need twists < TWMAX and no walker<->partner collision.
Output: C:/TETROBOT/logs/reach_end.csv (resume-safe, time-boxed by BUDGET seconds)."""
from paths import tpath
import sys, os, io, math, time, contextlib, numpy as np
sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
import mujoco
BUDGET = float(os.environ.get('BUDGET', '1200')); STAND = float(os.environ.get('STAND', '0.05')); TWMAX = float(os.environ.get('TWMAX', '150'))
XML = tpath('sim/multi_reach2.xml')          # built by reach2.py: rx0 + 32 floor spots
from multi_env import MultiEnv
from walk import Walker
import laptop_controller as L
D = math.radians
# partner poses [T1, B1, B2, T2, B3, B4, T3] (deg) - End B brought down / sideways
POSES = {'B4_90': (0, 0, 0, 0, 0, 90, 0), 'B3_90': (0, 0, 0, 0, 90, 0, 0), 'B3B4_45': (0, 0, 0, 0, 45, 45, 0), 'B3B4_90': (0, 0, 0, 0, 90, 90, 0),
         'B2_45B4_45': (0, 0, 45, 0, 0, 45, 0), 'B2B3_45': (0, 0, 45, 0, 45, 0, 0), 'B1_30B4_90': (0, 30, 0, 0, 0, 90, 0), 'B2_90B4_-90': (0, 0, 90, 0, 0, -90, 0),
         'B3_60B4_60': (0, 0, 0, 0, 60, 60, 0), 'B2_30B3_30B4_30': (0, 0, 30, 0, 30, 30, 0)}
POSES.update({k + '_m': tuple(-v for v in vals) for k, vals in list(POSES.items())})
e = MultiEnv(seed=0, randomize=False, xml=XML); m, d = e.m, e.d
spots = [i for i in range(1, e.nfloor)]
OUT = tpath('logs/reach_end.csv')
done = set(l.split(',')[0] for l in open(OUT)) if os.path.exists(OUT) else set()
f = open(OUT, 'a'); t0 = time.time()
b0 = set(b for b in range(m.nbody) if m.body(b).name and not m.body(b).name.startswith(('rx', 'm1_')) and m.body(b).name != 'world')
b1 = set(b for b in range(m.nbody) if m.body(b).name.startswith('m1_'))
def hit():
    n = 0
    for k in range(d.ncon):
        c = d.contact[k]; x, y = int(m.geom_bodyid[c.geom1]), int(m.geom_bodyid[c.geom2])
        if (x in b0 and y in b1) or (y in b0 and x in b1): n += 1
    return n
J = [r['name'] for r in e.rx].index('m1_endB'); n_ok = n_all = 0
print('END<->END sweep: %d spots x 4 yaws x %d partner poses, budget %.0f s' % (len(spots), len(POSES), BUDGET), flush=True)
for pi in spots:
    for yaw in (45, 135, 225, 315):
        for pn, qd in POSES.items():
            if time.time() - t0 > BUDGET: print('budget reached', flush=True); sys.exit(0)
            key = '%d_%d_%s' % (pi, yaw, pn)
            if key in done: continue
            qp = np.radians(qd)
            e.reset(base_rx=0, yaw_deg=45.0, partners=[(1, pi, float(yaw), qp)], settle=0)
            mujoco.mj_forward(m, d); e._refresh_rx(force=True)
            RX = e.rx[J]; h = RX['seat'][2]; nz = RX['z'][2]
            low = min(d.xpos[b][2] for b in b1 if not m.body(b).name.startswith('m1_End'))
            if h < 0.06 or h > 0.62 or low < 0.01: f.write('%s,%d,%.2f,%.2f,%d,%s,%.3f,%.2f,0,0,-1,0\n' % (key, pi, 0, 0, yaw, pn, h, nz)); continue   # end off the floor / partner in the floor
            g = m.opt.gravity.copy(); W = Walker(e, 'A', 0, 0, g, log=lambda *a: None); qa = e.mods[0]['qa']; qsave = d.qpos[qa].copy()
            with contextlib.redirect_stdout(io.StringIO()): C = W._ctrl(J)
            q = np.zeros(7); ok = True; tw = 0; col = 0
            for s in ('stand', 'hover', 'in'):
                goal = C.hover + STAND * C.z if s == 'stand' else (C.hover if s == 'hover' else C.seat + 0.002 * C.z)
                q = L.NOM._ik(goal, C.z, C.Ro, q if s != 'stand' else np.zeros(7), seeds=8)
                pp, nB, xB = L.NOM._fk(q); pe = np.linalg.norm(pp - goal) * 1000; ang = math.degrees(math.acos(max(-1, min(1, float(-nB @ C.z)))))
                tw = max(tw, np.degrees(np.abs(q[[0, 3, 6]])).max())
                if pe > 1.5 or ang > 1.5: ok = False; break
                if s != 'in':
                    d.qpos[qa] = q; mujoco.mj_forward(m, d); col += hit()
            d.qpos[qa] = qsave
            good = ok and tw < TWMAX and col == 0; n_all += 1; n_ok += good
            f.write('%s,%d,%.2f,%.2f,%d,%s,%.3f,%.2f,%d,%.0f,%d,%d\n' % (key, pi, m.body_pos[e.rx[pi]['bid']][0], m.body_pos[e.rx[pi]['bid']][1], yaw, pn, h, nz, int(ok), tw, col, int(good))); f.flush()
            if good: print('  GOOD  spot %2d yaw %3d pose %-18s end height %.2f m, end axis z %.2f, twist max %.0f' % (pi, yaw, pn, h, nz, tw), flush=True)
    print('spot %d done | %d checked, %d good | %.0f s' % (pi, n_all, n_ok, time.time() - t0), flush=True)
print('DONE', n_all, 'checked', n_ok, 'good in %.0f s' % (time.time() - t0), flush=True)
