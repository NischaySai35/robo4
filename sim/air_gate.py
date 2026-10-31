from paths import tpath

import sys, numpy as np, math
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//air_gate.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
from tetro_gpu import GPUDock
N=512; env=GPUDock(n=N, floor_frac=0.0); env.ik_mode='ik'
for mm, deg in [(6,3),(4,2),(3,1.5)]:
    env.htol=(mm/1000, math.radians(deg)); o=env.reset(); R=[]
    for k in range(300):
        o,r,d,inf=env.step(np.zeros((N,7),np.float32))
        for i in np.nonzero(d)[0]: R.append(inf[i])
    P('air | hover gate %g mm / %g deg -> docked %.1f%% | hover %.1f%% | seated %.1f%% | crash %.1f%% | n=%d' % (mm, deg, 100*np.mean([x['success'] for x in R]), 100*np.mean([x['phase']>=1 for x in R]), 100*np.mean([x['phase']>=2 for x in R]), 100*np.mean([x['crash'] for x in R]), len(R)))
P('DONE')
