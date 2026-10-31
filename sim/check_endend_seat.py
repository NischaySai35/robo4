"""Static seat test of END<->END with the fixed contact bits: put the walker's End B exactly into the partner's End B (pads interleaved 45 deg),
then list penetrations between the two ends (any penetration > 0.3 mm = the geometry does not fit; none = seats flush) - and repeat after turning
the walker's rotor 45 deg (does the lock hit the partner's own rotor fins?)."""
from paths import tpath
import sys, math, numpy as np, mujoco
sys.path.insert(0, tpath('sim'))
from multi_env import MultiEnv
e = MultiEnv(seed=0, randomize=False, xml=tpath('sim/multi_reach2.xml')); m, d = e.m, e.d
# partner anywhere upright; walker free body (root) placed so its End B seats into partner End B
e.reset(base_rx=0, yaw_deg=45.0, partners=[(1, 26, 315.0, np.zeros(7))], settle=0); mujoco.mj_forward(m, d); e._refresh_rx(force=True)
T = [r for r in e.rx if r['name'] == 'm1_endB'][0]
R_wB = d.xmat[e.end['B']['body']].reshape(3, 3); p_wB = d.site_xpos[e.end['B']['tip']]
# desired walker End B frame: its +y points INTO the target (= -z of target), x rotated 45 deg from the target pad axis
a = math.radians(45); x = T['R'] @ np.array([math.cos(a), math.sin(a), 0]); y = -T['z']; Rdes = np.stack([x, y, np.cross(x, y)], 1)
Rrel = Rdes @ R_wB.T                                   # rotate the whole walker rigidly
root = e.mods[0]['root']; from build_walk import R2q
q = d.qpos[root + 3:root + 7]; Rroot = np.zeros(9); mujoco.mju_quat2Mat(Rroot, q); Rroot = Rroot.reshape(3, 3)
p_root = d.qpos[root:root + 3].copy()
newR = Rrel @ Rroot; d.qpos[root + 3:root + 7] = R2q(newR)
d.qpos[root:root + 3] = T['seat'] + Rrel @ (p_root - p_wB)
def report(tag):
    mujoco.mj_forward(m, d); worst = {}
    for k in range(d.ncon):
        c = d.contact[k]; b1, b2 = m.body(m.geom_bodyid[c.geom1]).name, m.body(m.geom_bodyid[c.geom2]).name
        if (b1.startswith('m1_') != b2.startswith('m1_')) and ('End' in b1 + b2 or 'Lock' in b1 + b2):
            key = tuple(sorted([m.geom(c.geom1).name, m.geom(c.geom2).name])); worst[key] = min(worst.get(key, 9), c.dist)
    pen = sorted(worst.items(), key=lambda kv: kv[1])[:8]
    print('%s: walker End B tip vs partner seat: %s | deepest overlaps (mm):' % (tag, {k: round(v, 2) for k, v in e.end_vs_rx('B', [r['name'] for r in e.rx].index('m1_endB')).items()}))
    for kk, v in pen: print('    %7.2f  %s' % (v * 1000, kk))
    if not pen: print('    none - the two ends fit together flush')
report('SEATED, lock open')
d.qpos[e.end['B']['lockq']] = math.radians(45); report('SEATED, walker lock turned +45')
d.qpos[e.end['B']['lockq']] = -math.radians(45); report('SEATED, walker lock turned -45')
