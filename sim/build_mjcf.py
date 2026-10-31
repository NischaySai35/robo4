from paths import tpath
import json, os, sys, math
import numpy as np, mujoco
sys.path.insert(0, tpath('sim'))
import status as S
SRC = os.path.join(os.path.expanduser('~'), 'Downloads', 'TETROBOT_Module_try8')
OUT = tpath('sim/tetrobot_scene.xml')
P = json.load(open(os.path.join(SRC, 'mass_properties.json')))
L, J = P['links'], P['joints']
CX, CZ = -69.8, -261.5
TREE = [
 ('EndA_LockModule', 'L1_LockRotor_A', 'J_L1_lock', 'y'),
 ('EndA_LockModule', 'T1_Housing_B1Fork', 'J_T1_twist', 'y'),
 ('T1_Housing_B1Fork', 'Spine1_B1B2', 'J_B1_bend', 'x'),
 ('Spine1_B1B2', 'T2_Housing_B2Fork_GROUND', 'J_B2_bend', 'x'),
 ('T2_Housing_B2Fork_GROUND', 'T2_Ring_B3Fork', 'J_T2_twist', 'y'),
 ('T2_Ring_B3Fork', 'Spine2_B3B4', 'J_B3_bend', 'x'),
 ('Spine2_B3B4', 'T3_Housing_B4Fork', 'J_B4_bend', 'x'),
 ('T3_Housing_B4Fork', 'EndB_LockModule', 'J_T3_twist', 'y'),
 ('EndB_LockModule', 'L2_LockRotor_B', 'J_L2_lock', 'y'),
]
TAU = 2.7   # ST3215 stall at 11.1 V (2.94 N*m at 12 V scaled)
PHYS = json.load(open(tpath('sim/physics_params.json')))
pos = {'EndA_LockModule': np.array([CX, -190.0, CZ])}
for p, c, j, a in TREE:
    pos[c] = np.array([CX, J[j]['origin_mm'][1], CZ])
kids = {}
for p, c, j, a in TREE: kids.setdefault(p, []).append((c, j, a))
m = lambda v: ' '.join('%.6f' % (x / 1000.0) for x in v)
COL = {'Spine': '0.85 0.85 0.82 1', 'End': '0.92 0.92 0.90 1', 'Lock': '0.30 0.55 0.95 1'}
def rgba(n):
    for k, v in COL.items():
        if k in n: return v
    return '0.80 0.80 0.78 1'
def body(name, parent_pos, ind, joint=None):
    v = L[name]; bp = pos[name]; I = v['I_gcm2']; k = 1e-7
    com = np.array(v['com_mm']) - bp
    s = ' ' * ind
    out = [s + '<body name="%s" pos="%s">' % (name, m(bp - parent_pos))]
    if joint:
        jn, ax = joint
        lo, hi = J[jn]['lim_deg']
        A = {'x': '1 0 0', 'y': '0 1 0', 'z': '0 0 1'}
        out.append(s + ' <joint name="%s" axis="%s" range="%.3f %.3f" armature="%.4f" damping="%.3f" frictionloss="%.3f"/>' % (jn, A[ax], lo, hi, PHYS['armature'], PHYS['servo_damping'], PHYS['friction_twist'] if 'twist' in jn else PHYS['friction']))
        # gear backlash: free play about the same axis, stopped by the gear teeth
        out.append(s + ' <joint name="%s_bl" axis="%s" range="-%.3f %.3f" armature="0.004" damping="0.02" solreflimit="0.004 1"/>' % (jn, A[ax], PHYS.get('backlash_twist_deg', 0.5) if 'twist' in jn else PHYS['backlash_deg'], PHYS.get('backlash_twist_deg', 0.5) if 'twist' in jn else PHYS['backlash_deg']))
        if 'lock' not in jn:
            # PLA flex: springy wobble at right angles to the joint (passive physics, no motor)
            perp = ['z', 'y', 'x'] if ax == 'x' else ['x', 'z']
            for pa in perp:
                kk = PHYS['flex_k_in'] if (ax == 'x' and pa == 'x') else (PHYS['flex_k_bend'] if ax == 'x' else PHYS['flex_k_twist'])
                out.append(s + ' <joint name="%s_flex%s" axis="%s" range="-%.2f %.2f" stiffness="%.1f" damping="%.3f" armature="0.003"/>' % (jn, pa, A[pa], PHYS['flex_range_deg'], PHYS['flex_range_deg'], kk, PHYS['flex_c']))
    out.append(s + ' <inertial pos="%s" mass="%.5f" fullinertia="%.4e %.4e %.4e %.4e %.4e %.4e"/>' % (m(com), v['mass_g'] / 1000.0, I[0][0]*k, I[1][1]*k, I[2][2]*k, I[0][1]*k, I[0][2]*k, I[1][2]*k))
    out.append(s + ' <geom type="mesh" mesh="%s" pos="%s" rgba="%s" contype="1" conaffinity="2"/>' % (name, m(-bp), rgba(name)))
    SITES = {'EndA_LockModule': [('A_padtip', -199.35), ('A_gapfloor', -190.35)], 'EndB_LockModule': [('B_padtip', 487.58), ('B_gapfloor', 478.58)], 'L1_LockRotor_A': [('A_rotorface', -195.85)], 'L2_LockRotor_B': [('B_rotorface', 484.08)]}
    for sn, yy in SITES.get(name, []):
        out.append(s + ' <site name="%s" pos="%s" size="0.003" rgba="1 0.2 0.2 1"/>' % (sn, m(np.array([CX, yy, CZ]) - bp)))
    for c, j, a in kids.get(name, []):
        out += body(c, bp, ind + 1, (j, a))
    out.append(s + '</body>')
    return out
assets = ['  <mesh name="%s" file="%s" scale="0.001 0.001 0.001"/>' % (n, os.path.join(SRC, 'urdf', 'meshes', n + '.stl')) for n in L]
act = ['  <position name="m_%s" joint="%s" kp="%.1f" kv="%.2f" forcerange="-%.2f %.2f" ctrlrange="%.4f %.4f"/>' % (j[2:], j, PHYS['kp'], PHYS['kv'], TAU, TAU, math.radians(J[j]['lim_deg'][0]), math.radians(J[j]['lim_deg'][1])) for _, _, j, _ in TREE]
xml = ['<mujoco model="tetrobot_module">',
 ' <compiler angle="degree" inertiafromgeom="false" boundmass="0.001" boundinertia="1e-8"/>',
 ' <option timestep="0.001" integrator="implicitfast" gravity="0 0 -9.81"/>',
 ' <visual><global offwidth="1280" offheight="720"/><headlight ambient="0.4 0.4 0.4"/></visual>',
 ' <asset>', '  <mesh name="floor_receiver" file="floor_receiver.stl" scale="0.001 0.001 0.001"/>', '  <texture name="grid" type="2d" builtin="checker" rgb1="0.62 0.52 0.40" rgb2="0.56 0.46 0.35" width="512" height="512"/>',
 '  <material name="cardboard" texture="grid" texrepeat="8 8"/>'] + assets + [' </asset>',
 ' <worldbody>',
 '  <light pos="0.5 -0.5 1.5" dir="-0.3 0.3 -1" diffuse="0.8 0.8 0.8"/>',
 '  <geom name="floor" type="plane" size="1.2 1.2 0.01" material="cardboard" contype="2" conaffinity="1" friction="0.4 0.005 0.0001"/>',
 '  <geom name="floor_receiver" type="mesh" mesh="floor_receiver" pos="0.191272 0.199673 -0.000650" quat="0.6532815 -0.6532815 -0.2705981 0.2705981" rgba="0.95 0.55 0.15 1" contype="2" conaffinity="1"/>',
 '  <body name="module_frame" pos="0.06981 -0.26146 0.20565" quat="0.7071068 0.7071068 0 0">']
xml += body('EndA_LockModule', np.zeros(3), 3)
xml += ['  </body>', ' </worldbody>', ' <actuator>'] + act + [' </actuator>', '</mujoco>']
open(OUT, 'w', encoding='utf-8').write('\n'.join(xml))
# ---- checks
mod = mujoco.MjModel.from_xml_path(OUT); d = mujoco.MjData(mod)
mujoco.mj_forward(mod, d)
tot = sum(mod.body_mass)
lo = min(d.geom_xpos[i][2] for i in range(mod.ngeom))
S.log('MJCF built: %d bodies, %d joints, %d actuators, mass %.4f kg' % (mod.nbody, mod.njnt, mod.nu, tot))
tipB = d.body('L2_LockRotor_B').xpos.copy(); S.log('End B rotor at home (m): %s' % np.round(tipB, 4))
# hold home 3 s
for _ in range(3000): mujoco.mj_step(mod, d)
drift = np.degrees(np.abs(d.qpos)).max(); S.log('Hold straight 3 s: max joint drift %.3f deg, max motor torque %.3f N*m' % (drift, np.abs(d.actuator_force).max()))
# quick static torque probe: bend B1 to 90 deg, everything else straight
def static_tau(q):
    d2 = mujoco.MjData(mod); d2.qpos[:] = q; mujoco.mj_forward(mod, d2)
    return {mod.joint(i).name: d2.qfrc_bias[mod.jnt_dofadr[i]] for i in range(mod.njnt)}
q = np.zeros(mod.nq); q[mod.joint('J_B1_bend').qposadr[0]] = math.radians(90)
t = static_tau(q); worst = max(t, key=lambda k: abs(t[k]))
S.log('Static probe, B1 = 90 deg (arm horizontal): worst %s needs %.2f N*m of %.2f available' % (worst, abs(t[worst]), TAU))
for k, v in t.items():
    if not k.endswith(('_bl','_flexx','_flexy','_flexz')): S.log('   %-12s %.3f N*m' % (k, v))
print('OK')
