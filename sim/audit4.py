from paths import tpath

import sys, numpy as np, mujoco, math
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv
env = TetroDockEnv(seed=1); m, d = env.m, env.d
G=[i for i in range(m.ngeom) if m.geom_contype[i]==1]
print('body parents', [(m.body(b).name[:10], m.body(m.body_parentid[b]).name[:10], int(m.body_weldid[b])) for b in range(m.nbody)])
for pose in [[0,1.66,1.66,0,1.66,1.66,0],[0,1.66,1.66,0,0,0,0]]:
    d.qpos[:]=0; d.qpos[env.qa]=pose; mujoco.mj_forward(m,d)
    best=[]
    for a in range(len(G)):
        for b in range(a+2,len(G)):
            ft=np.zeros(6); dist=mujoco.mj_geomDistance(m,d,G[a],G[b],0.2,ft)
            best.append((round(dist*1000,1), m.body(m.geom_bodyid[G[a]]).name[:10], m.body(m.geom_bodyid[G[b]]).name[:10]))
    print(pose, sorted(best)[:5], 'ncon', d.ncon)
