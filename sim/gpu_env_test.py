from paths import tpath

import sys, time, numpy as np, torch
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//gpu_env_test.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
try:
    from tetro_gpu import GPUDock
    for N in [256, 1024]:
        t0=time.time(); env=GPUDock(n=N); P('N', N, 'build %.0f s' % (time.time()-t0))
        o=env.reset(); P('obs', o.shape, 'finite', np.isfinite(o).all())
        t=time.time(); R=0; D=0
        for k in range(20):
            o,r,d,inf=env.step(np.random.uniform(-0.3,0.3,(N,7)).astype(np.float32)); R+=r.mean(); D+=d.sum()
        torch.cuda.synchronize(); dt=time.time()-t
        P('  %d steps x %d robots in %.1f s -> %.0f practice steps/s | mean reward %.2f | episodes ended %d | obs finite %s | max magnet %.1f N' % (20, N, dt, 20*N/dt, R/20, D, np.isfinite(o).all(), float(env.mag_force.max())))
        del env; torch.cuda.empty_cache()
except Exception as e:
    import traceback; P('ERROR', traceback.format_exc()[-2500:])
P('DONE')
