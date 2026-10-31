from paths import tpath

import sys, time, numpy as np
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv
for rand in [False, True]:
    env = TetroDockEnv(seed=3, randomize=rand, ik_assist=True); t0=time.time(); n=0; res=[]
    for ep in range(5):
        o,_ = env.reset(); best=1e9
        for k in range(70):
            o,r,te,tr,info = env.step(np.zeros(7)); n+=1; best=min(best, info['err_mm'])
            if te or tr: break
        res.append((env.kind, round(best,1), round(info['ang_deg'],1), round(info['slot_deg'],1)))
    print('randomized' if rand else 'nominal', o.shape, 'IK alone, closest to hover (mm, tilt deg, slot deg):', res, '%.0f steps/s incl IK' % (n/(time.time()-t0)))
