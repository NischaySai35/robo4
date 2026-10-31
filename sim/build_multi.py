"""Multi-module scene: N free-standing TETROBOT modules + floor receivers + REAL side receivers on every spine.
Side receiver = the same receiver as the floor ones, recessed in the spine face (registered against the spine CAD, 0.24 mm):
  rx origin (+-25.0, 80.4, 0) mm in the spine frame, rx +z = outward spine +-x, rx lugs 45 deg off the spine axes.
Everything holds by contact + magnets only. Module i>0 is a prefixed copy ('m<i>_')."""
from paths import tpath
import sys, math, copy, os, numpy as np, mujoco, xml.etree.ElementTree as ET
mujoco.set_mju_user_warning(lambda m: None)
SRC = tpath('sim/walk_train.xml')
SRC_VIS = tpath('sim/walk_scene.xml')
SPINES = ['Spine1_B1B2', 'Spine2_B3B4']
def f(*v): return ' '.join('%.7f' % x for x in v)
def R2q(R): q = np.zeros(4); mujoco.mju_mat2Quat(q, np.ascontiguousarray(R).reshape(9)); return q
def side_pose(sign):
    t = math.radians(45); R = np.array([[0, 0, 1], [math.cos(t), -math.sin(t), 0], [math.sin(t), math.cos(t), 0]])
    if sign < 0: R = np.diag([-1, 1, -1]) @ R
    return R, np.array([sign * 0.025, 0.0804, 0.0])
def rename(el, p):
    for e in el.iter():
        if e.get('name'): e.set('name', p + e.get('name'))
def build(dst, floor_rx, nmod=2, src=SRC, side=True):
    T = ET.parse(src); R = T.getroot(); wb = R.find('worldbody'); act = R.find('actuator'); con = R.find('contact')
    bodies = {b.get('name'): b for b in R.iter('body')}
    mf0 = bodies['module_frame']; rx_tpl = bodies['rx0']
    tpl_children = [copy.deepcopy(c) for c in rx_tpl]
    for b in list(wb.findall('body')):
        if b.get('name', '').startswith('rx'): wb.remove(b)
    act0 = [copy.deepcopy(a) for a in act]; con0 = [copy.deepcopy(c) for c in con]
    mods = [mf0]
    for i in range(1, nmod):
        p = 'm%d_' % i; mc = copy.deepcopy(mf0); rename(mc, p); wb.append(mc); mods.append(mc)
        for a in act0:
            a2 = copy.deepcopy(a); a2.set('name', p + a2.get('name')); a2.set('joint', p + a2.get('joint')); act.append(a2)
        for c in con0:
            c2 = copy.deepcopy(c); c2.set('body1', p + c2.get('body1')); c2.set('body2', p + c2.get('body2')); con.append(c2)
    if side:
        for i, mc in enumerate(mods):
            p = '' if i == 0 else 'm%d_' % i
            for si, sn in enumerate(SPINES):
                sb = [b for b in mc.iter('body') if b.get('name') == p + sn][0]
                for sgn in (1, -1):
                    n = 2 * si + (0 if sgn > 0 else 1); Rm, o = side_pose(sgn)
                    rb = ET.SubElement(sb, 'body', name='%ssrx%d' % (p, n), pos=f(*o), quat=f(*R2q(Rm)))
                    for c in tpl_children:
                        c2 = copy.deepcopy(c)
                        if c2.get('name'): c2.set('name', '%ssrx%d_' % (p, n) + c2.get('name'))
                        rb.append(c2)
    for i, (x, y, yaw) in enumerate(floor_rx):
        rb = ET.SubElement(wb, 'body', name='rx%d' % i, pos=f(x, y, 0), quat=f(*R2q(np.array([[math.cos(yaw), -math.sin(yaw), 0], [math.sin(yaw), math.cos(yaw), 0], [0, 0, 1]]))))
        for c in tpl_children:
            c2 = copy.deepcopy(c)
            if c2.get('name'): c2.set('name', 'r%d_' % i + c2.get('name'))
            rb.append(c2)
    # module 0 -> keep original names; fix the freejoint name collision (module copies were renamed above)
    R.find('size').set('memory', '200M') if R.find('size') is not None else ET.SubElement(R, 'size', memory='200M')
    T.write(dst, encoding='unicode')
    return dst
if __name__ == '__main__':
    out = tpath('sim/multi_train.xml')
    build(out, [(0.0, 0.0, 0.0), (0.25, 0.0, 0.0), (0.5, 0.0, 0.0), (0.25, 0.25, 0.0)], nmod=2)
    m = mujoco.MjModel.from_xml_path(out); print('bodies', m.nbody, 'geoms', m.ngeom, 'nq', m.nq, 'nu', m.nu, 'mass0 %.3f mass1 %.3f' % (m.body_subtreemass[m.body('module_frame').id], m.body_subtreemass[m.body('m1_module_frame').id]))
    print([m.body(i).name for i in range(m.nbody) if 'rx' in m.body(i).name])
