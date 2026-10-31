from paths import tpath

import sys, time, math, numpy as np, mujoco
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv
env = TetroDockEnv(seed=5); env.randomize = False; o,_ = env.reset(seed=2)
# fast move then hard stop on bend 1 (B1 = action index 1), watch velocity ramp, overshoot and ring
log=[]; t0=time.time()
for k in range(60):
    a = np.zeros(7); a[1] = 1.0 if k < 8 else 0.0
    o, r, te, tr, info = env.step(a)
    w = env.d.qvel[env.da[1]]; log.append((k*0.05, round(math.degrees(env.d.qpos[env.qa[1]]),2), round(w,2), round(float(env.d.actuator_force[env.act_id[1]]),2), round(info['current_A'],2)))
print('steps/s single env %.0f' % (60/(time.time()-t0)))
for row in log[:20:1]+log[20::5]: print('t %.2f  B1 %.2f deg  w %.2f rad/s  tau %.2f N.m  total current %.2f A' % row)
tip=[]
