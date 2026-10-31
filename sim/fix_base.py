from paths import tpath
import numpy as np, math, subprocess, sys
from scipy.spatial.transform import Rotation as Rot
Q = chr(34)
F = tpath('sim/build_mjcf.py'); s = open(F, encoding='utf-8').read()
R = Rot.from_euler('z', 45, degrees=True) * Rot.from_euler('x', -90, degrees=True)
c = np.array([-0.27644, -0.00065, -0.00594]); p = -R.apply(c); q = R.as_quat()
qs = '%.7f %.7f %.7f %.7f' % (q[3], q[0], q[1], q[2])
lines = s.split(chr(10)); hit = 0
for i, l in enumerate(lines):
    if 'base_receiver_placeholder' in l:
        lines[i] = " '  <geom name=" + Q + 'floor_receiver' + Q + ' type=' + Q + 'mesh' + Q + ' mesh=' + Q + 'floor_receiver' + Q + ' pos=' + Q + '%.6f %.6f %.6f' % tuple(p) + Q + ' quat=' + Q + qs + Q + ' rgba=' + Q + '0.95 0.55 0.15 1' + Q + ' contype=' + Q + '2' + Q + ' conaffinity=' + Q + '1' + Q + "/>',"; hit += 1
s = chr(10).join(lines); assert hit == 1, hit
assert '0.0698 -0.2615 0.219' in s
s = s.replace('0.0698 -0.2615 0.219', '0.06981 -0.26146 0.20565')
asset = "' <asset>', "
assert asset in s
s = s.replace(asset, asset + "'  <mesh name=" + Q + 'floor_receiver' + Q + ' file=' + Q + tpath('sim/floor_receiver.stl') + Q + ' scale=' + Q + '0.001 0.001 0.001' + Q + "/>', ", 1)
old_b = '    for c, j, a in kids.get(name, []):'
assert s.count(old_b) == 1
site_line = "        out.append(s + ' <site name=" + Q + "%s" + Q + ' pos=' + Q + '%s' + Q + ' size=' + Q + '0.003' + Q + ' rgba=' + Q + '1 0.2 0.2 1' + Q + "/>' % (sn, m(np.array([CX, yy, CZ]) - bp)))"
new_b = ("    SITES = {'EndA_LockModule': [('A_padtip', -199.35), ('A_gapfloor', -190.35)], 'EndB_LockModule': [('B_padtip', 487.58), ('B_gapfloor', 478.58)], 'L1_LockRotor_A': [('A_rotorface', -195.85)], 'L2_LockRotor_B': [('B_rotorface', 484.08)]}" + chr(10)
         + '    for sn, yy in SITES.get(name, []):' + chr(10) + site_line + chr(10) + old_b)
s = s.replace(old_b, new_b)
open(F, 'w', encoding='utf-8').write(s)
r = subprocess.run([sys.executable, F], capture_output=True, text=True); print(r.stdout[-200:], r.stderr[-800:])
import mujoco
m = mujoco.MjModel.from_xml_path(tpath('sim/tetrobot_scene.xml')); d = mujoco.MjData(m); mujoco.mj_forward(m, d)
for sn in ['A_padtip', 'A_gapfloor', 'A_rotorface', 'B_padtip']: print('%-12s world z = %.2f mm  xy = (%.2f, %.2f) mm' % (sn, d.site(sn).xpos[2] * 1000, d.site(sn).xpos[0] * 1000, d.site(sn).xpos[1] * 1000))
g = m.geom('floor_receiver').id; mid = m.geom_dataid[g]
v = m.mesh_vert[m.mesh_vertadr[mid]: m.mesh_vertadr[mid] + m.mesh_vertnum[mid]]
Rw = d.geom_xmat[g].reshape(3, 3); wv = v @ Rw.T + d.geom_xpos[g]
print('receiver world: z %.2f..%.2f mm, x %.1f..%.1f, y %.1f..%.1f mm' % (wv[:, 2].min() * 1000, wv[:, 2].max() * 1000, wv[:, 0].min() * 1000, wv[:, 0].max() * 1000, wv[:, 1].min() * 1000, wv[:, 1].max() * 1000))
top = wv[wv[:, 2] > 0.0150]; a = np.degrees(np.arctan2(top[:, 1], top[:, 0])) % 360
print('receiver pad-top vertex angles, 15 deg bins from 0:', np.histogram(a, bins=24, range=(0, 360))[0].tolist())
E = d.xmat[m.body('EndA_LockModule').id].reshape(3, 3)
print('End A pad directions in world (deg):', [round(math.degrees(math.atan2(*(E @ np.array([math.cos(math.radians(t)), 0, math.sin(math.radians(t))]))[[1, 0]])) % 360) for t in (0, 90, 180, 270)])
subprocess.run([sys.executable, tpath('sim/make_lean.py')], capture_output=True); print('lean model rebuilt')
