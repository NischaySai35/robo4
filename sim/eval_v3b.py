from paths import tpath

import sys, numpy as np, math
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv
z=np.load(tpath('runs//dock_v3//brain.npz')); n=len([k for k in z.files if k.startswith('W')]); W=[(z['W%d'%i],z['b%d'%i]) for i in range(n)]; mu,var=z['mean'],z['var']
def act(o):
    h=np.clip((o-mu)/np.sqrt(var+1e-8),-10,10)
    for i,(A,b) in enumerate(W):
        h=A@h+b
        if i<n-1: h=np.where(h>0,h,np.exp(np.minimum(h,0))-1)
    return np.clip(h,-1,1)
env=TetroDockEnv(seed=78); env.floor_frac=1.0; env.htol=(0.015, math.radians(6)); R=[]
for ep in range(8):
    o,_=env.reset(); best=(1e9,0,0,0)
    for t in range(260):
        o,r,te,tr,info=env.step(act(o))
        if info['err_mm']<best[0]: best=(info['err_mm'],info['ang_deg'],info['slot_deg'],float(np.linalg.norm(env.d.cvel[env.eb][3:])))
        if t==259 or te or tr: last=(round(info['err_mm'],1), round(info['ang_deg'],1), round(info['slot_deg'],1))
        if te or tr: break
    R.append((last, env.kind, round(best[0],1), round(best[1],1), round(best[2],1), round(best[3],3), info['phase'], info.get('crash')))
print('brain', int(z['steps']), '(kind, closest mm, tilt deg, slot deg, speed m/s, phase, crash):'); [print(x) for x in R]
