"""Partner lying on the floor with its END A bent UP (like a floor receiver pointing up): which roll / B1 sign gives End A pointing up,
how high is it, and does it stay there under gravity (servo holds)? Then: is the walker able to reach it from above (IK)?"""
from paths import tpath
import sys, io, math, contextlib, numpy as np, mujoco
sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
from multi_env import MultiEnv
from lying import place_lying
from walk import Walker
import laptop_controller as L
e = MultiEnv(seed=0, randomize=False, xml=tpath('sim/multi_reach2.xml')); m, d = e.m, e.d
names = [r['name'] for r in e.rx]; J = names.index('m1_endA')
for roll in (90, -90):
    for b1 in (90, -90):
        for dist, ang in ((0.30, 0), (0.35, 0), (0.40, 0), (0.30, 45), (0.35, 90)):
            x, y = dist * math.cos(math.radians(ang)), dist * math.sin(math.radians(ang))
            q = np.radians([0, b1, 0, 0, 0, 0, 0])
            e.reset(base_rx=0, yaw_deg=45.0, partners=[], settle=0)
            # partner lies pointing AWAY from the walker (heading = ang), End A nearest
            place_lying(e, 1, x, y, ang, q, roll_deg=roll, settle=600)
            RX = e.rx[J]
            W = Walker(e, 'A', 0, 0, m.opt.gravity.copy(), log=lambda *a: None)
            with contextlib.redirect_stdout(io.StringIO()): C = W._ctrl(J)
            qs = L.NOM._ik(C.hover, C.z, C.Ro, np.zeros(7), seeds=8); pp, nB, _ = L.NOM._fk(qs)
            pe = np.linalg.norm(pp - C.hover) * 1000; tw = np.degrees(np.abs(qs[[0, 3, 6]])).max()
            print('roll %4d B1 %4d | End A at %.2f m / %3d deg | end axis z %+.2f, seat height %3.0f mm, at %s | walker IK err %.1f mm twist %.0f | %s' % (
                roll, b1, dist, ang, RX['z'][2], RX['seat'][2] * 1000, np.round(RX['seat'][:2], 3), pe, tw, 'REACHABLE' if (RX['z'][2] > 0.95 and pe < 1.5 and tw < 150) else '-'), flush=True)
