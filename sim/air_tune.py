from paths import tpath

import sys, numpy as np, torch, math, os
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//air_tune.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
try:
    from tetro_gpu import GPUDock
    N=512; env=GPUDock(n=N, floor_frac=0.0); env.ik_mode='ik'; env.htol=(0.006, math.radians(3))
    for step_mm, lim, settle in [(3,0.03,0),(1.5,0.015,0),(1.5,0.015,8),(1.0,0.01,8)]:
        env.appr_step=step_mm/1000; env.gentle_lim=lim; env.hover_settle=settle
        o=env.reset(); R=[]
        for k in range(300):
            o,r,d,inf=env.step(np.zeros((N,7),np.float32))
            for i in np.nonzero(d)[0]: R.append(inf[i])
        P('air | approach %.1f mm/step, gentle %.3f rad, settle %d steps -> docked %.1f%% | hover %.1f%% | seated %.1f%% | crash %.1f%% | n=%d' % (step_mm, lim, settle, 100*np.mean([x['success'] for x in R]), 100*np.mean([x['phase']>=1 for x in R]), 100*np.mean([x['phase']>=2 for x in R]), 100*np.mean([x['crash'] for x in R]), len(R)))
except Exception as e:
    import traceback; P('ERROR', traceback.format_exc()[-2500:])
P('DONE')
