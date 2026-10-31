from paths import tpath

import sys, numpy as np, torch, math, warp as wp, mujoco_warp as mjw
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//gpu_diag9.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
try:
    from tetro_gpu import GPUDock
    env=GPUDock(n=512); o=env.reset(); i=137
    for k,v in env.P.items():
        x=v[i].float(); o_=v.float()
        P('%-20s w137 min %.4g max %.4g | all min %.4g max %.4g' % (k, float(x.min()), float(x.max()), float(o_.min()), float(o_.max())))
    for k in ['delay','obs_lag','amax','w0','volt','magk','mag_gap','noise','push_p','standoff']:
        v=getattr(env,k); P(k, v[i].tolist() if v.dim() else v)
    # step with zero actions and watch
    for k in range(3):
        o,r,d,inf=env.step(np.zeros((512,7),np.float32)); P('zero-action step', k, 'NaN worlds', env.nan_idx.tolist())
except Exception as e:
    import traceback; P('ERROR', traceback.format_exc()[-2500:])
P('DONE')
