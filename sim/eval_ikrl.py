from paths import tpath

import sys, time, numpy as np, torch, math, os
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//eval_ikrl.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
try:
    from tetro_gpu import GPUDock
    z=np.load(tpath('runs//dock_ikrl//brain.npz')); n=len([k for k in z.files if k.startswith('W')]); W=[(z['W%d'%i],z['b%d'%i]) for i in range(n)]; mu,var=z['mean'],z['var']
    def act(o):
        h=np.clip((o-mu)/np.sqrt(var+1e-8),-10,10)
        for i,(A,b) in enumerate(W):
            h=h@A.T+b
            if i<n-1: h=np.where(h>0,h,np.exp(np.minimum(h,0))-1)
        return np.clip(h,-1,1).astype(np.float32)
    N=512
    for mode in ['IK only']:
        env=GPUDock(n=N, floor_frac=float(os.environ.get('FF','1.0'))); env.ik_mode='ik'; env.htol=(0.006, math.radians(3)); o=env.reset(); R=[]
        for k in range(300):
            a=np.zeros((N,7),np.float32) if mode=='IK only' else act(o)
            o,r,d,inf=env.step(a)
            for i in np.nonzero(d)[0]: R.append(inf[i])
        P('%-11s brain %.2fM | episodes %d | docked %.1f%% | hover %.1f%% | seated %.1f%% | crash %.1f%%' % (mode, int(z['steps'])/1e6, len(R), 100*np.mean([x['success'] for x in R]), 100*np.mean([x['phase']>=1 for x in R]), 100*np.mean([x['phase']>=2 for x in R]), 100*np.mean([x['crash'] for x in R])))
        del env; torch.cuda.empty_cache()
except Exception as e:
    import traceback; P('ERROR', traceback.format_exc()[-2500:])
P('DONE')
