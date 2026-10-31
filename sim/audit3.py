from paths import tpath

import sys, numpy as np, mujoco, math
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv, ACT
env = TetroDockEnv(seed=1); m, d = env.m, env.d
print('robot geoms', [(m.body(m.geom_bodyid[i]).name, int(m.geom_contype[i]), int(m.geom_conaffinity[i]), np.round(m.geom_size[i]*1000,1).tolist()) for i in range(m.ngeom) if m.geom_contype[i]==1])
for pose in [[0,1.66,1.66,0,0,0,0],[0,1.66,1.66,0,1.66,1.66,0],[0,1.66,-1.66,0,1.66,0,0]]:
    d.qpos[:]=0; d.qpos[env.qa]=pose; mujoco.mj_forward(m,d)
    pts=[(m.body(m.geom_bodyid[d.contact[i].geom1]).name, m.body(m.geom_bodyid[d.contact[i].geom2]).name, round(d.contact[i].dist*1000,1)) for i in range(d.ncon)]
    print(pose, 'contacts', pts[:8])
    print('   link z mm', {m.body(b).name[:8]: round(d.xpos[b][2]*1000) for b in env.links})
