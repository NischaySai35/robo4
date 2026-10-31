from paths import tpath
import json, numpy as np, mujoco
mujoco.set_mju_user_warning(lambda m: None)
m = mujoco.MjModel.from_xml_path(tpath('sim/walk_train.xml')); d = mujoco.MjData(m); mujoco.mj_resetData(m, d); mujoco.mj_forward(m, d)
off = json.load(open(tpath('dashboard/meshes/offsets.json')))
np.set_printoptions(precision=5, suppress=True)
names = ['EndA_LockModule', 'L1_LockRotor_A', 'T1_Housing_B1Fork', 'Spine1_B1B2', 'T2_Housing_B2Fork_GROUND', 'T2_Ring_B3Fork', 'Spine2_B3B4', 'T3_Housing_B4Fork', 'EndB_LockModule', 'L2_LockRotor_B']
o0 = np.array(off[names[0]]); print('root qpos0', d.qpos[:7])
for n in names:
    b = m.body(n).id; x = d.xpos[b] - d.xpos[m.body(names[0]).id]; R = d.xmat[b].reshape(3, 3)
    print(n, 'mjcf rel pos', x.round(5), 'fusion rel', (np.array(off[n]) - o0).round(5), 'Rdiag', np.round(np.diag(R), 2), 'mass %.4f' % m.body_mass[b], 'com', m.body_ipos[b].round(4))
for j in range(m.njnt):
    jn = m.joint(j)
    if jn.name in ('root',) or '_flex' in jn.name or jn.name.endswith('_bl'): continue
    b = m.jnt_bodyid[j]; ax = d.xmat[b].reshape(3, 3) @ m.jnt_axis[j]; an = d.xanchor[j] - d.xpos[m.body('EndA_LockModule').id]
    print(jn.name, 'body', m.body(b).name, 'axis', ax.round(3), 'anchor rel EndA', an.round(5), 'range deg', np.degrees(m.jnt_range[j]).round(1), 'type', m.jnt_type[j])
