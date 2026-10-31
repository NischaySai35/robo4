"""Why do two module ends stop ~3 mm short? List every collision geom of End B + its rotor along the end axis (mm, relative to End B's gap floor),
then place two ends in the mated pose and list which geoms touch."""
from paths import tpath
import sys, numpy as np, mujoco
sys.path.insert(0, tpath('sim'))
m = mujoco.MjModel.from_xml_path(tpath('sim/multi_reach2.xml')); d = mujoco.MjData(m); mujoco.mj_forward(m, d)
eb = m.body('EndB_LockModule').id; rb = m.body('L2_LockRotor_B').id
R = d.xmat[eb].reshape(3, 3); n = R[:, 1]; gf = d.site('B_gapfloor').xpos; pt = d.site('B_padtip').xpos
print('pad tip above gap floor: %.2f mm' % ((pt - gf) @ n * 1000))
rows = []
for g in range(m.ngeom):
    b = m.geom_bodyid[g]
    if b not in (eb, rb) or m.geom_contype[g] == 0 and m.geom_conaffinity[g] == 0: continue
    # extent of the geom along the end axis: use its AABB corners in world
    c = d.geom_xpos[g]; Rg = d.geom_xmat[g].reshape(3, 3); s = m.geom_size[g]
    if m.geom_type[g] == mujoco.mjtGeom.mjGEOM_BOX:
        corners = np.array([[x, y, z] for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]) * s
        h = ((c + corners @ Rg.T) - gf) @ n * 1000; r = np.linalg.norm(((c - gf) - ((c - gf) @ n) * n)) * 1000
        rows.append((h.max(), h.min(), r, m.geom(g).name or '(unnamed)', m.body(b).name, int(m.geom_contype[g]), int(m.geom_conaffinity[g])))
    else:
        h = (c - gf) @ n * 1000; rows.append((h + m.geom_rbound[g] * 1000, h - m.geom_rbound[g] * 1000, np.linalg.norm(((c - gf) - ((c - gf) @ n) * n)) * 1000, (m.geom(g).name or '(unnamed)') + ' [type %d, rbound]' % m.geom_type[g], m.body(b).name, int(m.geom_contype[g]), int(m.geom_conaffinity[g])))
rows.sort(key=lambda r: -r[0])
print('geoms reaching highest above End B gap floor (mm): top, bottom, radial, name, body, contype, conaffinity')
print('rx pad geoms:', [(m.geom(g).name, int(m.geom_contype[g]), int(m.geom_conaffinity[g])) for g in range(m.ngeom) if m.geom(g).name.startswith('r0_r0_rx_pad')][:3])
for r in [x for x in rows if x[5] in (1, 2) or 'col' in x[3]][:12]: print('  %6.2f %7.2f  r=%5.1f  %-28s %-18s %d/%d' % r)
print('A mated partner end puts ITS geoms down to (9.0 - their top) mm above OUR gap floor; anything of ours above 4.5 mm on the axis region can clash.')

