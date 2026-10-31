from paths import tpath

import sys, numpy as np, mujoco, math
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv
env = TetroDockEnv(seed=1, randomize=False); env.reset(seed=1); m, d = env.m, env.d
flex=[m.jnt_dofadr[j] for j in range(m.njnt) if '_flex' in m.joint(j).name or m.joint(j).name.endswith('_bl') or m.joint(j).name.startswith('base_')]
d0=m.dof_damping.copy()
q=np.array([0,0.5,0.5,0,0.4,0.2,0])
b0=m.actuator_biasprm.copy()
print('servo kv', b0[:,2])
r0=m.jnt_range.copy(); st0=m.jnt_stiffness.copy()
bl=[j for j in range(m.njnt) if m.joint(j).name.endswith('_bl')]; bt=[j for j in range(m.njnt) if m.joint(j).name.startswith('base_')]
for k,kv,case in [(15,4,'real'),(25,4,'real'),(30,3,'real'),(40,4,'real')]:
    m.dof_damping[:]=d0; m.dof_damping[flex]=d0[flex]*k; m.actuator_biasprm[:]=b0; m.actuator_biasprm[:,2]=b0[:,2]*kv; m.jnt_range[:]=r0; m.jnt_stiffness[:]=st0
    if case in ('backlash off','both'): m.jnt_range[bl]=r0[bl]*0.01
    if case in ('base stiff','both'): m.jnt_stiffness[bt]=st0[bt]*20
    print(case, end=' | ')
    mujoco.mj_resetData(m,d); d.qpos[env.qa]=q; d.ctrl[:]=0; d.ctrl[env.act_id]=q
    for _ in range(4000): mujoco.mj_step(m,d)
    p0=d.site_xpos[env.s_tip].copy()
    # 2 N push on End B for 0.2 s, then release: how long until it is still?
    for i in range(200): d.xfrc_applied[env.eb,:3]=[2,0,0]; mujoco.mj_step(m,d)
    defl=np.linalg.norm(d.site_xpos[env.s_tip]-p0)*1000; d.xfrc_applied[:]=0
    t_set=None; last=None; P=[]
    for i in range(6000):
        mujoco.mj_step(m,d); P.append(d.site_xpos[env.s_tip].copy())
    P=np.array(P); sp=np.linalg.norm(np.diff(P,axis=0),axis=1)*1000*1000   # mm/s
    moving=np.where(sp>2.0)[0]; t_set=(moving[-1]+1)/1000 if len(moving) else 0
    off=np.linalg.norm(P[-1]-p0)*1000
    amp=[np.linalg.norm(P[int(t*1000)]-P[-1])*1000 for t in (0.25,0.5,1.0,2.0)]
    print('flex damping x%d servo kv x%d: push %.1f mm | still (<2 mm/s) after %.2f s | wobble left at 0.25/0.5/1/2 s: %s mm | stays off by %.1f mm (backlash/friction)' % (k, kv, defl, t_set, np.round(amp,1), off))
