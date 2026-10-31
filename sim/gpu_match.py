from paths import tpath

import sys, time, numpy as np, torch
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//gpu_match.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
try:
    from tetro_gpu import GPUDock
    z=np.load(tpath('runs//dock_v3//brain.npz')); n=len([k for k in z.files if k.startswith('W')]); W=[(z['W%d'%i],z['b%d'%i]) for i in range(n)]; mu,var=z['mean'],z['var']
    def act(o):
        h=np.clip((o-mu)/np.sqrt(var+1e-8),-10,10)
        for i,(A,b) in enumerate(W):
            h=h@A.T+b
            if i<n-1: h=np.where(h>0,h,np.exp(np.minimum(h,0))-1)
        return np.clip(h,-1,1).astype(np.float32)
    import math
    env=GPUDock(n=512, floor_frac=0.9); env.htol=(0.015, math.radians(6)); o=env.reset(); R=[]; t=time.time()
    CR=np.zeros(3); first=None
    for k in range(300):
        o,r,d,inf=env.step(act(o)); CR+=env.cr
        if first is None and env.cr.sum()>0: first=(k, env.cr.tolist(), float(env.qvel.nan_to_num().abs().max()))
        for i in np.nonzero(d)[0]: R.append(inf[i])
    P('crash breakdown low/nan/through-receiver', CR.tolist(), 'first crash at step', first)
    P('brain steps', int(z['steps']), '| GPU episodes finished', len(R), '| %.0f steps/s' % (300*512/(time.time()-t)))
    E=np.array([r['err_mm'] for r in R]); P('GPU: median err %.1f mm | hover %.1f%% | crash %.1f%% | docked %.2f%%' % (np.median(E), 100*np.mean([r['phase']>=1 for r in R]), 100*np.mean([r['crash'] for r in R]), 100*np.mean([r['success'] for r in R])))
except Exception as e:
    import traceback; P('ERROR', traceback.format_exc()[-2500:])
P('DONE')
