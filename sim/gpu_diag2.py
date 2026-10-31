from paths import tpath

import sys, numpy as np, torch, math
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//gpu_diag.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
try:
    from tetro_gpu import GPUDock
    from tetro_env2 import TetroDockEnv
    z=np.load(tpath('runs//dock_v3//brain.npz')); mu,var=z['mean'],z['var']; sd=np.sqrt(var+1e-8)
    names=['sinq']*7+['cosq']*7+['qd']*7+['prev_a']*7+['cmd-q']*7+['goal-p']*3+['nB']*3+['z']*3+['sin4s','cos4s']+['goal']*3+['ph']*3+['t','standoff']
    # CPU obs at reset
    c=TetroDockEnv(seed=3); C=np.array([c.reset()[0] for _ in range(40)])
    g=GPUDock(n=256); G=g.reset()
    zc=((C-mu)/sd).mean(0); zg=((G-mu)/sd).mean(0)
    for i in range(54):
        if abs(zg[i]-zc[i])>1.0: P('dim %2d %-8s CPU mean %+.3f  GPU mean %+.3f  (z cpu %+.1f gpu %+.1f)' % (i, names[i], C[:,i].mean(), G[:,i].mean(), zc[i], zg[i]))
    P('checked')
except Exception as e:
    import traceback; P('ERROR', traceback.format_exc()[-2500:])
P('DONE')
