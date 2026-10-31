from paths import tpath

import sys, time, numpy as np, mujoco
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv
env = TetroDockEnv(seed=1); m, d = env.m, env.d
env.reset(seed=3)
def selfcon():
    out=[]
    for i in range(d.ncon):
        c=d.contact[i]; b1=m.body(m.geom_bodyid[c.geom1]).name; b2=m.body(m.geom_bodyid[c.geom2]).name
        if b1!='world' and b2!='world' and 'target' not in b1+b2: out.append((b1,b2,round(c.dist*1000,1)))
    return out
print('at rest:', selfcon())
r=np.random.default_rng(0); hits=0; pairs={}
for k in range(300):
    d.qpos[:]=0; d.qpos[env.qa]=r.uniform(env.lo, env.hi); mujoco.mj_forward(m,d); sc=selfcon()
    if sc: hits+=1
    for a,b,_ in sc: pairs[(a,b)]=pairs.get((a,b),0)+1
print('random poses with self-contact: %d/300' % hits, sorted(pairs.items(), key=lambda x:-x[1])[:8])
env.reset(seed=4); t0=time.time()
for i in range(100):
    o,rw,te,tr,info=env.step(env.action_space.sample()*0.3)
    if te or tr: env.reset()
print('obs', o.shape, 'steps/s %.0f' % (100/(time.time()-t0)), 'current %.1f A' % info['current_A'])
