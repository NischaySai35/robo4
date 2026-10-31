"""Sanity check of the end-as-connector frames: axis direction, pad/magnet angles vs a floor receiver."""
from paths import tpath
import sys, math, numpy as np
sys.path.insert(0, tpath('sim'))
from multi_env import MultiEnv
e = MultiEnv(seed=0, randomize=False, xml=tpath('sim/multi_reach2.xml'))
e.reset(base_rx=0, yaw_deg=45.0, partners=[(1, 26, 315.0, np.zeros(7))], settle=40)
d = e.d
def ang(RX):
    v = RX['mags'] - RX['seat']; v = v - np.outer(v @ RX['z'], RX['z'])
    return np.round(np.degrees(np.arctan2(v @ RX['R'][:, 1], v @ RX['R'][:, 0])) % 360).astype(int), np.round(np.linalg.norm(v, axis=1) * 1000, 1), np.round((RX['mags'] - RX['seat']) @ RX['z'] * 1000, 1)
for nm in ('rx0', 'srx1', 'endA', 'endB', 'm1_endA', 'm1_endB'):
    RX = [r for r in e.rx if r['name'] == nm][0]
    a, r, h = ang(RX)
    print('%-8s z %s seat %s | mag angles %s | r mm %s | height above seat mm %s' % (nm, np.round(RX['z'], 2), np.round(RX['seat'], 3), a, r, h))
# walker End A sits in rx0 (yaw 45): its own end-frame vs rx0 frame
A = [r for r in e.rx if r['name'] == 'endA'][0]; R0 = [r for r in e.rx if r['name'] == 'rx0'][0]
print('endA z . rx0 z =', round(float(A['z'] @ R0['z']), 3), '(should be -1: ends face each other)')
print('endA seat - rx0 tip-gap-floor distance mm', np.round((A['seat'] - R0['seat']) * 1000, 2), '(seat of end A frame is 9 mm inside End A; rx0 seat is where End A pad tips sit)')
xa = A['R'][:, 0]; print('endA pad x vs rx0 x angle deg', round(math.degrees(math.atan2(xa @ R0['R'][:, 1], xa @ R0['R'][:, 0])), 1), '(45 = interleaved, as docked)')
print('rx0 receiver: walker end_vs_rx', {k: round(v, 2) for k, v in e.end_vs_rx('A', 0).items()})
