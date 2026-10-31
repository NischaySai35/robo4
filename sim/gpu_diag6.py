from paths import tpath

import sys, numpy as np, torch, math, os
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//gpu_diag6.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
try:
    import tetro_gpu
    from tetro_gpu import GPUDock
    z=np.load(tpath('runs//dock_v3//brain.npz')); n=len([k for k in z.files if k.startswith('W')]); W=[(z['W%d'%i],z['b%d'%i]) for i in range(n)]; mu,var=z['mean'],z['var']
    def act(o):
        h=np.clip((o-mu)/np.sqrt(var+1e-8),-10,10)
        for i,(A,b) in enumerate(W):
            h=h@A.T+b
            if i<n-1: h=np.where(h>0,h,np.exp(np.minimum(h,0))-1)
        return np.clip(h,-1,1).astype(np.float32)
    for case in [os.environ.get('CASE','selfcol on')]:
        env=GPUDock(n=512, floor_frac=0.9); env.htol=(0.015, math.radians(6)); o=env.reset(); nan=0; worlds=set()
        for k in range(200):
            o,r,d,inf=env.step(act(o)); nan+=int(env.cr[1]); worlds|=set(env.nan_idx.tolist())
        P('%-14s NaN events %d in 200 steps x 512 robots, distinct worlds %d' % (case, nan, len(worlds)))
except Exception as e:
    import traceback; P('ERROR', traceback.format_exc()[-2500:])
P('DONE')
