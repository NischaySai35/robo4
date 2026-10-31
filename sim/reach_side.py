"""Which partner placements / receivers can the walker's free End B actually reach (IK only, no physics)?"""
from paths import tpath
import sys, os, io, math, contextlib, itertools, numpy as np
sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
import build_multi
RX = [(0, 0, 0)] + [(x, y, 0) for x, y in [(0.15, 0), (0.25, 0), (0.35, 0), (0.15, 0.15), (0.25, 0.25), (0, 0.25), (-0.25, 0), (0.25, -0.25), (0, -0.25)]]
XML = tpath('sim/multi_reach.xml'); build_multi.build(XML, RX, nmod=2)
from multi_env import MultiEnv
from walk import Walker
import laptop_controller as L
rows = []
for pi in range(1, len(RX)):
    for yaw in (45, 135, 225, 315):
        e = MultiEnv(seed=0, randomize=False, xml=XML); e.reset(base_rx=0, yaw_deg=45.0, partners=[(1, pi, float(yaw), np.zeros(7))], settle=60)
        g = e.m.opt.gravity.copy(); W = Walker(e, 'A', 0, 0, g, log=lambda *a: None)
        for n in range(4):
            j = [i for i, r in enumerate(e.rx) if r['name'] == 'm1_srx%d' % n][0]
            with contextlib.redirect_stdout(io.StringIO()):
                C = W._ctrl(j); q = L.NOM._ik(C.hover, C.z, C.Ro, np.zeros(7), seeds=10)
            pp, nB, xB = L.NOM._fk(q); pe = np.linalg.norm(pp - C.hover) * 1000; ang = math.degrees(math.acos(max(-1, min(1, float(-nB @ C.z)))))
            a_ = math.atan2(xB @ C.Ro[:, 1], xB @ C.Ro[:, 0]) - math.pi / 4; sl = abs(math.degrees((a_ + math.pi / 4) % (math.pi / 2) - math.pi / 4))
            tw = np.degrees(np.abs(q[[0, 3, 6]])).max(); z = e.rx[j]['seat'][2]
            ok = pe < 1.0 and ang < 1.0 and sl < 1.0 and tw < 150
            rows.append((pi, yaw, n, z, pe, ang, sl, tw, ok)); print('partner rx%d (%.2f,%.2f) yaw %3d srx%d h=%.2f m | pos %.1f mm tilt %.1f slot %.1f twist %.0f | %s' % (pi, RX[pi][0], RX[pi][1], yaw, n, z, pe, ang, sl, tw, 'REACHABLE' if ok else '-'), flush=True)
print('reachable', sum(r[-1] for r in rows), 'of', len(rows))
