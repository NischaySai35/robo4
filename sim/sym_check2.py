from paths import tpath

import sys, numpy as np, itertools, mujoco, math
mujoco.set_mju_user_warning(lambda m: None)
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv
E=TetroDockEnv(seed=0, randomize=False); m=E.m; d=mujoco.MjData(m)
A=m.body('EndA_LockModule').id; B=m.body('EndB_LockModule').id; sB=m.site('B_padtip').id
pa=np.array([0,-0.00935,0])
def H(R,p):
    M=np.eye(4); M[:3,:3]=R; M[:3,3]=p; return M
def G(q):
    d.qpos[:]=0; d.qpos[E.qa]=q; mujoco.mj_kinematics(m,d)
    RA=d.xmat[A].reshape(3,3); RB=d.xmat[B].reshape(3,3)
    return np.linalg.inv(H(RA, d.xpos[A]+RA@pa)) @ H(RB, d.site_xpos[sB])
# 24 axis-aligned rotations
rots=[]
for perm in itertools.permutations(range(3)):
    for sg in itertools.product([1,-1],repeat=3):
        R=np.zeros((3,3))
        for i in range(3): R[i,perm[i]]=sg[i]
        if np.linalg.det(R)>0: rots.append(R)
rng=np.random.default_rng(1); Q=np.clip(rng.uniform(-1,1,(10,7))*0.8,E.lo,E.hi)
Gs=[G(q) for q in Q]
res=[]
for s in itertools.product([1,-1],repeat=7):
    s=np.array(s); G2=[G(np.clip(s*q[::-1],E.lo,E.hi)) for q in Q]
    for R in rots:
        F=H(R,np.zeros(3)); Fi=np.linalg.inv(F); e=0
        for g,g2 in zip(Gs,G2):
            D=Fi@np.linalg.inv(g)@F - g2; e+=np.abs(D[:3,3]).sum()*1000+np.abs(D[:3,:3]).sum()
        res.append((e,tuple(s),R.round().astype(int).tolist()))
res.sort(key=lambda x:x[0]); print('best:'); [print(round(r[0],5), r[1], r[2]) for r in res[:4]]
