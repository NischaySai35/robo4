from paths import tpath

import sys, numpy as np, math
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//gentle_mixed.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
from tetro_gpu import GPUDock
N=512; env=GPUDock(n=N, floor_frac=0.9); env.ik_mode='ik'; env.htol=(0.006, math.radians(3))
for step_mm, lim in [(3,0.03),(1.5,0.015)]:
    env.appr_step=step_mm/1000; env.gentle_lim=lim; env.hover_settle=0
    o=env.reset(); R=[]
    for k in range(300):
        o,r,d,inf=env.step(np.zeros((N,7),np.float32))
        for i in np.nonzero(d)[0]: R.append(inf[i])
    P('mixed 90%% floor | approach %.1f mm/step, gentle %.3f -> docked %.1f%% | crash %.1f%% | n=%d' % (step_mm, lim, 100*np.mean([x['success'] for x in R]), 100*np.mean([x['crash'] for x in R]), len(R)))
P('DONE')
