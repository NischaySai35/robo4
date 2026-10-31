"""Build v2 models: real connector colliders (from measured CAD), receiver targets, springy base lock, magnet sites."""
from paths import tpath
import math, xml.etree.ElementTree as ET
import numpy as np
LIFT_K = 30000
LIFT_PRE = 0.0003
TILT_K = 175
CX, CZ = -69.81, -261.46
def f(*v): return ' '.join('%.6f' % x for x in v)
def sector_boxes(parent, prefix, ang_deg, r0, r1, half_span_deg, a0, a1, axis, ct, ca, rgba, split=2, nang=1):
    """Annular sector (r0..r1, +-half_span, axial a0..a1) as radial x angular slices of boxes; box corners stay within r1 (mm in)."""
    rs = np.linspace(r0, r1, split + 1); angs = np.linspace(-half_span_deg, half_span_deg, nang + 1)
    for j in range(nang):
        ac_deg = ang_deg + (angs[j] + angs[j + 1]) / 2; hs = (angs[j + 1] - angs[j]) / 2
        for i in range(split):
            ri, ro = rs[i], rs[i + 1]; ht = ri * math.sin(math.radians(hs)) if nang > 1 else ((ri + ro) / 2) * math.sin(math.radians(hs))
            ro_eff = math.sqrt(max(ro ** 2 - ht ** 2, ri ** 2 + 1e-6)) if nang > 1 else ro   # keep the outer corners on the true arc
            rc = (ri + ro_eff) / 2; hr = (ro_eff - ri) / 2; ha = (a1 - a0) / 2; axc = (a0 + a1) / 2; a = math.radians(ac_deg)
            if axis == 'y':
                pos = (rc * math.cos(a), axc, rc * math.sin(a)); size = (hr, ha, ht); eul = '0 %.4f 0' % (-ac_deg)
            else:
                pos = (rc * math.cos(a), rc * math.sin(a), axc); size = (hr, ht, ha); eul = '0 0 %.4f' % ac_deg
            ET.SubElement(parent, 'geom', name='%s_%d_%d' % (prefix, j, i), type='box', size=f(*[s / 1000 for s in size]), pos=f(*[p / 1000 for p in pos]), euler=eul, contype=str(ct), conaffinity=str(ca), rgba=rgba, friction='0.35 0.005 0.0001', solref='0.004 1', solimp='0.95 0.99 0.0005')
import json as _json
HULLS = _json.load(open(tpath('sim/pad_hulls.json')))
def hull_geoms(parent, asset, prefix, rgba, ct, ca):
    for name, V in HULLS.items():
        if not name.startswith(prefix): continue
        ET.SubElement(asset, 'mesh', name='h_' + name, vertex=' '.join('%.6f' % v for p in V for v in p))
        ET.SubElement(parent, 'geom', name=name, type='mesh', mesh='h_' + name, contype=str(ct), conaffinity=str(ca), rgba=rgba, friction='0.35 0.005 0.0001', solref='0.004 1', solimp='0.95 0.99 0.0005')
def build(src, dst, visual):
    T = ET.parse(src); R = T.getroot(); wb = R.find('worldbody')
    comp = R.find('compiler'); comp.set('angle', 'degree')
    if R.find('size') is None: ET.SubElement(R, 'size', memory='40M')
    bodies = {b.get('name'): b for b in R.iter('body')}
    # ---- base receiver: visual only; End A sits in it through a springy lock mount
    for g in wb.findall('geom'):
        if g.get('name') == 'floor_receiver':
            if visual: g.set('contype', '0'); g.set('conaffinity', '0')
            else: wb.remove(g)
    A = bodies['EndA_LockModule']
    for g in A.findall('geom'): g.set('contype', '0'); g.set('conaffinity', '0')
    for g in bodies['L1_LockRotor_A'].findall('geom'): g.set('contype', '0'); g.set('conaffinity', '0')
    pa = f(0, -0.00935, 0)   # pad-tip plane centre, End A local
    js = [dict(name='base_tilt_a', type='hinge', axis='1 0 0', pos=pa, stiffness=str(TILT_K), damping='0.6', range='-1.5 1.5', armature='0.002'),
          dict(name='base_tilt_b', type='hinge', axis='0 0 1', pos=pa, stiffness=str(TILT_K), damping='0.6', range='-1.5 1.5', armature='0.002'),
          dict(name='base_twist_play', type='hinge', axis='0 1 0', pos=pa, stiffness='300', damping='0.3', range='-0.4 0.4', armature='0.002'),
          dict(name='base_lift', type='slide', axis='0 1 0', pos=pa, stiffness=str(LIFT_K), springref=str(-LIFT_PRE), damping='60', range='0 0.0005', limited='true', solreflimit='0.002 1', armature='0.01')]
    for i, j in enumerate(js): A.insert(i, ET.Element('joint', **j))
    # ---- End B: coarse body box trimmed to stop before the connector, then exact connector parts
    EB = bodies['EndB_LockModule']; by = 420.6
    for g in list(EB.findall('geom')):
        if visual: g.set('contype', '0'); g.set('conaffinity', '0')
        else: EB.remove(g)
    ET.SubElement(EB, 'geom', name='EndB_body_col', type='box', size=f(0.038, 0.030, 0.038), pos=f(0, (439 - by) / 1000, 0), contype='1', conaffinity='2', rgba='0 0 0 0' if visual else '0.92 0.92 0.9 1')
    vis = '0 0 0 0' if visual else '0.95 0.95 0.92 1'
    for k, ang in enumerate([0, 90, 180, 270]):
        pass   # End B pads: convex slices of the real CAD surface (incl. chamfers/draft), added below
    ET.SubElement(EB, 'geom', name='B_gapfloor_disc', type='cylinder', size=f(0.035, 0.002), pos=f(0, (476.58 - by) / 1000, 0), euler='-90 0 0', contype='4', conaffinity='2', rgba=vis)
    for k, ang in enumerate(range(0, 360, 45)):
        a = math.radians(ang); yy = 487.58 if ang % 90 == 0 else 478.58
        ET.SubElement(EB, 'site', name='B_mag%d' % k, pos=f(0.030 * math.cos(a), (yy - by) / 1000, 0.030 * math.sin(a)), size='0.004', rgba='0.7 0.1 0.9 1')
    RB = bodies['L2_LockRotor_B']; ry = 479.3
    for g in list(RB.findall('geom')):
        if visual: g.set('contype', '0'); g.set('conaffinity', '0')
        else: RB.remove(g)
    for k, ang in enumerate([0, 90, 180, 270]):
        sector_boxes(RB, 'B_arm%d' % k, ang, 21.0, 28.5, 20.5, 481.78 - ry, 484.58 - ry, 'y', 4, 2, '0 0 0 0' if visual else '0.25 0.5 0.95 1', split=2, nang=5)   # corrected fins (try8, 24 Oct 19:47): 0.30 mm floor clearance, 0.50 mm lock play
    # ---- target receiver (moved per episode): same part as the floor lock, exact heights
    tb = ET.SubElement(wb, 'body', name='target_rx', mocap='true', pos='0.3 0 0')
    rv = '0 0 0 0' if visual else '0.2 0.85 1 0.9'
    ET.SubElement(tb, 'geom', name='rx_base', type='cylinder', size=f(0.035, 0.00315), pos=f(0, 0, 0.00315), contype='2', conaffinity='5', rgba=rv)
    for k, ang in enumerate([0, 90, 180, 270]):
        pass   # receiver pads: convex slices of the real CAD surface, added below
        sector_boxes(tb, 'rx_lug%d' % k, ang, 35.0, 45.4, 9.9, 5.0, 10.0, 'z', 2, 5, rv, split=1)
    for k, ang in enumerate(range(0, 360, 45)):
        a = math.radians(ang); zz = 15.3 if ang % 90 == 0 else 6.3
        ET.SubElement(tb, 'site', name='rx_mag%d' % k, pos=f(0.030 * math.cos(a), 0.030 * math.sin(a), zz / 1000), size='0.004', rgba='0.7 0.1 0.9 1')
    ET.SubElement(tb, 'site', name='rx_gapfloor', pos=f(0, 0, 0.0063), size='0.003', rgba='0 1 0 1')
    ET.SubElement(tb, 'site', name='rx_padtop', pos=f(0, 0, 0.0153), size='0.003', rgba='0 1 0 1')
    if visual:
        ET.SubElement(tb, 'geom', name='rx_visual', type='mesh', mesh='floor_receiver', pos=f(0.27644, 0.00594, -0.00065), quat='0.7071068 -0.7071068 0 0', contype='0', conaffinity='0', rgba='0.2 0.85 1 1')
    else:
        asset = R.find('asset')
    asset = R.find('asset') if R.find('asset') is not None else ET.SubElement(R, 'asset')
    hull_geoms(EB, asset, 'B_pad', vis, 4, 2); hull_geoms(tb, asset, 'rx_pad', rv, 2, 5)
    cont = R.find('contact') if R.find('contact') is not None else ET.SubElement(R, 'contact')
    ET.SubElement(cont, 'exclude', body1='T2_Housing_B2Fork_GROUND', body2='Spine2_B3B4')   # box approximation only; real B3 fork clears +-95 deg
    T.write(dst, encoding='unicode')
build(tpath('sim/tetrobot_train.xml'), tpath('sim/train_v2.xml'), False)
build(tpath('sim/tetrobot_scene.xml'), tpath('sim/scene_v2.xml'), True)
import mujoco
for fn in ['train_v2.xml', 'scene_v2.xml']:
    m = mujoco.MjModel.from_xml_path(tpath('sim//') + fn); d = mujoco.MjData(m); mujoco.mj_forward(m, d)
    for _ in range(2000): mujoco.mj_step(m, d)
    print(fn, 'bodies', m.nbody, 'joints', m.njnt, 'geoms', m.ngeom, 'mocap', m.nmocap, '| after 2 s standing: base tilt %.3f/%.3f deg, base lift %.3f mm, B_padtip z %.2f mm, contacts %d' % (
        math.degrees(d.joint('base_tilt_a').qpos[0]), math.degrees(d.joint('base_tilt_b').qpos[0]), d.joint('base_lift').qpos[0] * 1000, d.site('B_padtip').xpos[2] * 1000, d.ncon))
