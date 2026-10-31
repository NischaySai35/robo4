from paths import tpath

import math, numpy as np, mujoco
mujoco.set_mju_user_warning(lambda m: None)
from build_walk import R2q, q2R, RX_GAP
m=mujoco.MjModel.from_xml_path(tpath('sim//walk_train.xml')); d=mujoco.MjData(m)
for j in range(m.njnt):
    n=m.joint(j).name
    if '_flex' in n or n.endswith('_bl'): m.dof_damping[m.jnt_dofadr[j]]*=25
m.actuator_biasprm[:,2]*=4
def place(lock_deg, yaw_deg=45.0):
    mujoco.mj_resetData(m,d)
    xA=np.array([math.cos(math.radians(yaw_deg)), math.sin(math.radians(yaw_deg)), 0]); yA=np.array([0,0,1.0]); zA=np.cross(xA,yA)
    RA=np.stack([xA,yA,zA],1)
    pA_mf=m.body('EndA_LockModule').pos; pa=m.site('A_padtip').pos
    seat=np.array([0,0,RX_GAP])
    d.qpos[0:3]=seat-RA@(pA_mf+pa); d.qpos[3:7]=R2q(RA)
    qa=m.joint('J_L1_lock').qposadr[0]; d.qpos[qa]=math.radians(lock_deg); d.ctrl[m.actuator('m_L1_lock').id]=math.radians(lock_deg)
    mujoco.mj_forward(m,d)
    return d.site('A_padtip').xpos.copy()
for lock in [-45.0, 0.0]:
    p0=place(lock); pen=min([d.contact[i].dist for i in range(d.ncon)] or [0])
    tb=m.body('EndB_LockModule').id
    for k in range(3000): mujoco.mj_step(m,d)
    p1=d.site('A_padtip').xpos; zA=d.xmat[m.body('EndA_LockModule').id].reshape(3,3)[:,1]
    print('lock %5.1f deg | initial deepest penetration %.2f mm, contacts %d | after 3 s: A tip moved %.2f mm, A axis tilt %.2f deg, End B height %.1f mm, finite %s' % (lock, pen*1000, d.ncon, 1000*np.linalg.norm(p1-p0), math.degrees(math.acos(min(1,zA[2]))), d.xpos[tb][2]*1000, np.isfinite(d.qpos).all()))
# pull test on the locked base: 20 N upward on End A while locked
place(-45.0)
for k in range(1000): mujoco.mj_step(m,d)
p0=d.site('A_padtip').xpos.copy()
for k in range(1500):
    d.xfrc_applied[:]=0; d.xfrc_applied[m.body('EndA_LockModule').id,:3]=[0,0,30.0]; mujoco.mj_step(m,d)
print('locked base, 30 N pull up on End A for 1.5 s: moved %.2f mm' % (1000*np.linalg.norm(d.site('A_padtip').xpos-p0)))
place(0.0)
for k in range(1000): mujoco.mj_step(m,d)
p0=d.site('A_padtip').xpos.copy()
for k in range(1500):
    d.xfrc_applied[:]=0; d.xfrc_applied[m.body('EndA_LockModule').id,:3]=[0,0,30.0]; mujoco.mj_step(m,d)
print('UNlocked base, same 30 N pull: moved %.2f mm (should lift out freely)' % (1000*np.linalg.norm(d.site('A_padtip').xpos-p0)))
