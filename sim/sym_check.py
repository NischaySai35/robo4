from paths import tpath

import sys, numpy as np, itertools, mujoco, math
mujoco.set_mju_user_warning(lambda m: None)
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv, ACT
E=TetroDockEnv(seed=0, randomize=False); m=E.m; d=mujoco.MjData(m)
A=m.body('EndA_LockModule').id; B=m.body('EndB_LockModule').id
print('joints', ACT)
print('joint axes (body frame):', [tuple(np.round(m.jnt_axis[m.joint(n).id],3)) for n in ACT])
siteB=m.site('B_padtip').id
print('B_padtip local', np.round(m.site_pos[siteB],5), 'B body', m.body(B).name)
def T(q, pa_local):
    d.qpos[:]=0; d.qpos[E.qa]=q; mujoco.mj_kinematics(m,d)
    RA=d.xmat[A].reshape(3,3); pA=d.xpos[A]+RA@pa_local
    RB=d.xmat[B].reshape(3,3); pB=d.site_xpos[siteB]
    return pA,RA,pB,RB
def inv_feats(q, pa):
    pA,RA,pB,RB=T(q,pa); Rrel=RA.T@RB; ang=math.acos(max(-1,min(1,(np.trace(Rrel)-1)/2))); return np.linalg.norm(pB-pA), ang
rng=np.random.default_rng(0); Q=rng.uniform(-1.0,1.0,(30,7))*0.8
Q=np.clip(Q, E.lo, E.hi)
# B_padtip analogue on A: try the build pad-tip plane centre
pa=np.array([0,-0.00935,0])
print('straight pose: tip distance %.4f m' % inv_feats(np.zeros(7),pa)[0])
best=[]
for s in itertools.product([1,-1],repeat=7):
    s=np.array(s); err=0
    for q in Q[:8]:
        q2=s*q[::-1]; q2=np.clip(q2,E.lo,E.hi)
        a=inv_feats(q,pa); b=inv_feats(q2,pa); err+=abs(a[0]-b[0])*1000+abs(a[1]-b[1])*57.3
    best.append((err,tuple(s)))
best.sort(); print('best sign maps (err mm+deg over 8 poses):', best[:3])
s=np.array(best[0][1]); errs=[]
for q in Q:
    q2=np.clip(s*q[::-1],E.lo,E.hi); a=inv_feats(q,pa); b=inv_feats(q2,pa); errs.append((abs(a[0]-b[0])*1000, abs(a[1]-b[1])*57.3))
print('check 30 poses: max dist err %.3f mm, max angle err %.3f deg' % (max(e[0] for e in errs), max(e[1] for e in errs)))
print('joint limits lo', np.round(E.lo,3), 'hi', np.round(E.hi,3))
