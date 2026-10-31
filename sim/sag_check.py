from paths import tpath

import sys, numpy as np, mujoco
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv
env=TetroDockEnv(seed=9); 
for k in range(3):
    o,_=env.reset(); 
    for t in range(30): o,r,te,tr,info=env.step(np.zeros(7))
    p,_,_=env._fk(env.d.qpos[env.qa]); print('randomized robot: estimate error %.1f mm' % (np.linalg.norm(p-env.d.site_xpos[env.s_tip])*1000), o.shape)
