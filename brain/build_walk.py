
"""Walking model: free-standing module (freejoint), REAL lock connectors on BOTH ends (End A = exact mirror of End B,
verified symmetric), N static floor receivers. Holding happens only through fin/pad contact + magnets (no glue joints)."""
import sys, math, copy, json, xml.etree.ElementTree as ET
import numpy as np, mujoco
mujoco.set_mju_user_warning(lambda m: None)
RX_GAP = 0.0063
F = np.diag([-1.0, -1.0, 1.0])                       # B-tip frame -> A-tip frame (proved: 0.000 mm over 30 poses)
PA = np.array([0, -0.00935, 0]); TB = np.array([0, 0.06697, 0])
ROTB = np.array([0, 0.058675, 0]); ROTA = np.array([0, -0.001051, 0])
def f(*v): return ' '.join('%.7f' % x for x in v)
def q2R(q): R = np.zeros(9); mujoco.mju_quat2Mat(R, np.asarray(q, float)); return R.reshape(3, 3)
def R2q(R): q = np.zeros(4); mujoco.mju_mat2Quat(q, np.ascontiguousarray(R).reshape(9)); return q
def b2a(p): return F @ (np.asarray(p) - TB) + PA
def build(src, dst, receivers, visual):
    m = mujoco.MjModel.from_xml_path(src)
    T = ET.parse(src); R = T.getroot(); wb = R.find('worldbody'); asset = R.find('asset')
    bodies = {b.get('name'): b for b in R.iter('body')}
    # 1) free-standing module, no springy base
    mf = bodies['module_frame']; mf.insert(0, ET.Element('freejoint', name='root'))
    A = bodies['EndA_LockModule']
    for j in list(A.findall('joint')):
        if j.get('name', '').startswith('base_'): A.remove(j)
    # 2) End A connector = mirror of End B connector colliders
    vis = '0 0 0 0' if visual else '0.95 0.95 0.92 1'
    for src_body, dst_el, kind in [('EndB_LockModule', A, 'end'), ('L2_LockRotor_B', bodies['L1_LockRotor_A'], 'rotor')]:
        bid = m.body(src_body).id
        for g in range(m.ngeom):
            if m.geom_bodyid[g] != bid or m.geom_contype[g] == 0: continue
            nm = 'A_' + (m.geom(g).name or 'g%d' % g)
            off = ROTB if kind == 'rotor' else np.zeros(3); offA = ROTA if kind == 'rotor' else np.zeros(3)
            Rg = q2R(m.geom_quat[g]); pg = m.geom_pos[g]
            col = vis if kind == 'end' else ('0 0 0 0' if visual else '0.25 0.5 0.95 1')
            common = dict(contype=str(m.geom_contype[g]), conaffinity=str(m.geom_conaffinity[g]), friction=f(*m.geom_friction[g]), solref=f(*m.geom_solref[g]), solimp=f(*m.geom_solimp[g]), rgba=col)
            if m.geom_type[g] == mujoco.mjtGeom.mjGEOM_MESH:
                mid = m.geom_dataid[g]; V = m.mesh_vert[m.mesh_vertadr[mid]: m.mesh_vertadr[mid] + m.mesh_vertnum[mid]]
                VA = np.array([b2a(pg + Rg @ v + off) - offA for v in V])
                ET.SubElement(asset, 'mesh', name='mA_' + nm, vertex=' '.join('%.7f' % x for x in VA.ravel()))
                ET.SubElement(dst_el, 'geom', name=nm, type='mesh', mesh='mA_' + nm, **common)
            else:
                tname = {mujoco.mjtGeom.mjGEOM_BOX: 'box', mujoco.mjtGeom.mjGEOM_CYLINDER: 'cylinder'}[int(m.geom_type[g])]
                sz = m.geom_size[g][:3] if tname == 'box' else m.geom_size[g][:2]
                ET.SubElement(dst_el, 'geom', name=nm, type=tname, size=f(*sz), pos=f(*(b2a(pg + off) - offA)), quat=f(*R2q(F @ Rg)), **common)
    for k in range(8):
        ET.SubElement(A, 'site', name='A_mag%d' % k, pos=f(*b2a(m.site('B_mag%d' % k).pos)), size='0.004', rgba='0.7 0.1 0.9 1')
    # 3) receivers: copies of target_rx as static bodies
    tr = bodies['target_rx']; wb.remove(tr)
    for g in list(wb.findall('geom')):
        if g.get('name') == 'floor_receiver': wb.remove(g)
    for i, (x, y, yaw) in enumerate(receivers):
        rb = ET.SubElement(wb, 'body', name='rx%d' % i, pos=f(x, y, 0), quat=f(*R2q(np.array([[math.cos(yaw), -math.sin(yaw), 0], [math.sin(yaw), math.cos(yaw), 0], [0, 0, 1]]))))
        for c in tr:
            c2 = copy.deepcopy(c)
            if c2.get('name'): c2.set('name', 'r%d_' % i + c2.get('name'))
            rb.append(c2)
    opt = R.find('option'); opt.set('cone', 'elliptic'); opt.set('noslip_iterations', '3')
    T.write(dst, encoding='unicode')
RX = [(0.0, 0.0, 0.0), (0.25, 0.0, 0.0), (0.50, 0.0, 0.0), (0.75, 0.0, 0.0)]
if __name__ == '__main__':
    build(r'D:\\robo4\\brain\\train_v2.xml', r'D:\\robo4\\brain\\walk_train.xml', RX, False)
    build(r'D:\\robo4\\brain\\scene_v2.xml', r'D:\\robo4\\brain\\walk_scene.xml', RX, True)
    for fn in ['walk_train.xml', 'walk_scene.xml']:
        mm = mujoco.MjModel.from_xml_path(r'D:\\robo4\\brain\\' + fn); print(fn, 'bodies', mm.nbody, 'geoms', mm.ngeom, 'nq', mm.nq, 'mass %.3f kg' % mm.body_subtreemass[mm.body('module_frame').id])
    json.dump(RX, open(r'D:\\robo4\\brain\\walk_rx.json', 'w'))
