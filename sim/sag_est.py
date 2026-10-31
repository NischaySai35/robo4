from paths import tpath

import sys, numpy as np, mujoco, math
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv
env=TetroDockEnv(seed=5, randomize=False); env.reset(seed=1); m=env.m; dr=env.dr; d=env.d
flex=[j for j in range(m.njnt) if '_flex' in m.joint(j).name]; bl=[j for j in range(m.njnt) if m.joint(j).name.endswith('_bl')]; base=[j for j in range(m.njnt) if m.joint(j).name.startswith('base_tilt')]
K=env.nom['stiff']
def sag_fk(q, sign=1.0, iters=3):
    dr.qpos[:]=0; dr.qpos[env.qa]=q; dr.qvel[:]=0
    for _ in range(iters):
        mujoco.mj_kinematics(m,dr); mujoco.mj_comPos(m,dr); f=np.zeros(m.nv); mujoco.mj_rne(m,dr,0,f)
        for j in flex+base:
            dr.qpos[m.jnt_qposadr[j]] = -sign*f[m.jnt_dofadr[j]]/K[j]
        for j in bl:
            dr.qpos[m.jnt_qposadr[j]] = -np.sign(f[m.jnt_dofadr[j]])*m.jnt_range[j][1]*sign
    mujoco.mj_kinematics(m,dr)
    return dr.site_xpos[env.s_tip].copy()
rng=np.random.default_rng(0)
for k in range(8):
    q=rng.uniform(env.lo*0.7, env.hi*0.7)
    mujoco.mj_resetData(m,d); d.qpos[env.qa]=q; d.ctrl[:]=0; d.ctrl[env.act_id]=q
    for _ in range(3000): mujoco.mj_step(m,d)
    qm=d.qpos[env.qa].copy(); true=d.site_xpos[env.s_tip].copy()
    rig=env._fk(qm)[0]; s1=sag_fk(qm,1.0); s2=sag_fk(qm,-1.0)
    if true[2] < 0.03: continue
    print('rigid err %5.1f mm | sag-est(+) err %5.1f mm | sag-est(-) err %5.1f mm' % (np.linalg.norm(rig-true)*1000, np.linalg.norm(s1-true)*1000, np.linalg.norm(s2-true)*1000))
