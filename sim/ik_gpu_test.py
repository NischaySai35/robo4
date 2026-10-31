from paths import tpath

import sys, time, numpy as np, torch, math
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//ik_gpu.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
try:
    from tetro_gpu import GPUDock
    N=512; env=GPUDock(n=N, floor_frac=1.0, max_dist=0.30); env.ik_mode='ik'; env.htol=(0.008, math.radians(4))
    o=env.reset(); R=[]; t=time.time(); best=torch.full((N,),1e9,device='cuda')
    for k in range(300):
        o,r,d,inf=env.step(np.zeros((N,7),np.float32))
        for i in np.nonzero(d)[0]: R.append(inf[i])
        if k in (10,20,40,80,150,299): P('step %d: phase>=1 %.1f%% | phase2 %.1f%% | %.0f steps/s' % (k, 100*float((env.phase>=1).float().mean()), 100*float((env.phase>=2).float().mean()), (k+1)*N/(time.time()-t)))
    P('episodes finished', len(R))
    if R:
        P('IK floor targets: docked %.1f%% | reached 8mm hover %.1f%% | seated %.1f%% | crash %.1f%% | lock jams %d | pull fails %d' % (100*np.mean([r['success'] for r in R]), 100*np.mean([r['phase']>=1 for r in R]), 100*np.mean([r['phase']>=2 for r in R]), 100*np.mean([r['crash'] for r in R]), 0, 0))
        P('median final error %.1f mm, median axial %.2f mm' % (np.nanmedian([r['err_mm'] for r in R]), np.nanmedian([r['axial_mm'] for r in R])))
except Exception as e:
    import traceback; P('ERROR', traceback.format_exc()[-2500:])
P('DONE')
