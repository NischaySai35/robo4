from paths import tpath

import sys, time, numpy as np, torch, os
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//graph_test.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
try:
    from tetro_gpu import GPUDock
    N=1024; t0=time.time(); env=GPUDock(n=N); P('build+capture %.0f s, graph active: %s' % (time.time()-t0, env.cg is not None))
    o=env.reset(); t=time.time(); D=0
    for k in range(300):
        o,r,d,inf=env.step(np.random.uniform(-1,1,(N,7)).astype(np.float32)); D+=d.sum()
    torch.cuda.synchronize(); dt=time.time()-t
    P('graph: %.0f practice steps/s at %d robots | obs finite %s | ended %d | nan worlds now %d' % (300*N/dt, N, np.isfinite(o).all(), D, len(env.nan_idx)))
except Exception as e:
    import traceback; P('ERROR', traceback.format_exc()[-2000:])
P('DONE')
