from paths import tpath

import sys, numpy as np, torch, math, warp as wp
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//gpu_diag7.log'),'w')
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
    env=GPUDock(n=512, floor_frac=0.9); env.htol=(0.015, math.radians(6)); o=env.reset(); hits=0
    for k in range(200):
        o,r,d,inf=env.step(act(o))
        if len(env.nan_idx):
            i=int(env.nan_idx[0]); hits+=1
            bad=[]
            for kk,v in env.P.items():
                if not torch.isfinite(v[i]).all(): bad.append('P.'+kk)
            for kk,v in vars(env).items():
                if torch.is_tensor(v) and v.dim()>=1 and v.shape[0]==env.N and v.is_floating_point() and not torch.isfinite(v[i]).all(): bad.append('S.'+kk)
            for kk in dir(env.d):
                a=getattr(env.d,kk,None)
                if isinstance(a, wp.array) and a.shape and a.shape[0]==env.N:
                    try:
                        t=wp.to_torch(a)
                        if t.is_floating_point() and not torch.isfinite(t[i]).all(): bad.append('D.'+kk)
                    except Exception: pass
            P('step', k, 'world', i, 'non-finite after reset:', bad, '| floor' if bool(env.floor[i]) else '| air', 'target', env.mpos[i, env.cpu.mocap].tolist(), 'quat', env.mquat[i, env.cpu.mocap].tolist())
            if hits>=3: break
except Exception as e:
    import traceback; P('ERROR', traceback.format_exc()[-2500:])
P('DONE')
