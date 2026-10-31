from paths import tpath

import sys, numpy as np, torch, math, warp as wp, mujoco_warp as mjw
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//gpu_diag8.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
def nested_bad(obj, i, N, prefix=''):
    out=[]
    for kk in dir(obj):
        if kk.startswith('_'): continue
        a=getattr(obj,kk,None)
        if isinstance(a, wp.array):
            try:
                t=wp.to_torch(a)
                if t.is_floating_point():
                    if t.shape and t.shape[0]==N:
                        if not torch.isfinite(t[i]).all(): out.append(prefix+kk+'[world]')
                    elif not torch.isfinite(t).all(): out.append(prefix+kk+'[shared %s]' % (tuple(t.shape),))
            except Exception: pass
        elif hasattr(a, '__dataclass_fields__') and prefix.count('.')<1:
            out+=nested_bad(a, i, N, prefix+kk+'.')
    return out
try:
    from tetro_gpu import GPUDock
    z=np.load(tpath('runs//dock_v3//brain.npz')); n=len([k for k in z.files if k.startswith('W')]); W=[(z['W%d'%i],z['b%d'%i]) for i in range(n)]; mu,var=z['mean'],z['var']
    def act(o):
        h=np.clip((o-mu)/np.sqrt(var+1e-8),-10,10)
        for i,(A,b) in enumerate(W):
            h=h@A.T+b
            if i<n-1: h=np.where(h>0,h,np.exp(np.minimum(h,0))-1)
        return np.clip(h,-1,1).astype(np.float32)
    env=GPUDock(n=512, floor_frac=0.9); env.htol=(0.015, math.radians(6)); o=env.reset()
    for k in range(40):
        a=act(o)
        if not np.isfinite(o).all() or not np.isfinite(a).all(): P('step',k,'NON-FINITE obs rows', np.nonzero(~np.isfinite(o).all(1))[0][:5].tolist(), 'action rows', np.nonzero(~np.isfinite(a).all(1))[0][:5].tolist(), 'obs dims', np.nonzero(~np.isfinite(o[137]))[0].tolist() if 137 < len(o) else '')
        o,r,d,inf=env.step(a)
        if len(env.nan_idx):
            i=int(env.nan_idx[0]); P('first NaN step', k, 'world', i)
            P('model non-finite:', nested_bad(env.mm, i, env.N, 'm.'))
            P('data non-finite :', [x for x in nested_bad(env.d, i, env.N, 'd.') if 'shared' in x or 'efc' in x or 'contact' in x][:30])
            break
    a=act(o); P('obs137 finite', bool(np.isfinite(o[137]).all()), 'bad dims', np.nonzero(~np.isfinite(o[137]))[0].tolist(), 'act137', a[137].tolist())
    o,r,d,inf=env.step(a); P('next step NaN worlds', env.nan_idx.tolist())
    with wp.ScopedStream(env.stream): mjw.reset_data(env.mm, env.d)
    o=env.reset(); o,r,d,inf=env.step(act(o)); P('after FULL reset_data: NaN worlds', env.nan_idx.tolist())
except Exception as e:
    import traceback; P('ERROR', traceback.format_exc()[-2500:])
P('DONE')
