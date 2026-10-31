from paths import tpath

import sys, time, numpy as np, torch, math, os
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//ik_limits.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
try:
    from tetro_gpu import GPUDock
    N=512
    for name, ff, md in [('floor 30-42 cm', 1.0, 0.42), ('air targets only', 0.0, 0.30), ('floor 18-30 cm', 1.0, 0.30)]:
        env=GPUDock(n=N, floor_frac=ff, max_dist=md); env.ik_mode='ik'; env.htol=(0.006, math.radians(3))
        if name.startswith('floor 30'):
            orig=env._reset_idx
        o=env.reset(); R=[]
        for k in range(300):
            o,r,d,inf=env.step(np.zeros((N,7),np.float32))
            for i in np.nonzero(d)[0]: R.append((inf[i], float((env.mpos[i,env.cpu.mocap,:2]-env.base_xy).norm())))
        X=[x for x,_ in R]; D=np.array([dd for _,dd in R])
        P('%-18s episodes %4d | docked %.1f%% | hover %.1f%% | seated %.1f%% | crash %.1f%%' % (name, len(X), 100*np.mean([x['success'] for x in X]), 100*np.mean([x['phase']>=1 for x in X]), 100*np.mean([x['phase']>=2 for x in X]), 100*np.mean([x['crash'] for x in X])))
        if ff==1.0:
            for lo,hi in [(0.18,0.24),(0.24,0.30),(0.30,0.36),(0.36,0.42)]:
                sel=[x for x,dd in R if lo<=dd<hi]
                if sel: P('    %2d-%2d cm: docked %.1f%% (n=%d)' % (lo*100, hi*100, 100*np.mean([x['success'] for x in sel]), len(sel)))
        del env; torch.cuda.empty_cache()
except Exception as e:
    import traceback; P('ERROR', traceback.format_exc()[-2500:])
P('DONE')
