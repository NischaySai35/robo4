from paths import tpath

import sys, time, numpy as np, torch, math
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//gpu_diag.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
try:
    from tetro_gpu import GPUDock
    env=GPUDock(n=256, floor_frac=0.9); o=env.reset()
    for k in range(60):
        o,r,d,inf=env.step(np.zeros((256,7),np.float32))
        if k in (0,1,2,5,10,20,40,59):
            q=env.qpos; P('step',k,'nan worlds',int((~torch.isfinite(q).all(-1)).sum()),'| crash low',int(env.cr[0]),'nan',int(env.cr[1]),'through-rx',int(env.cr[2]),'| tip z mean %.3f' % float(env.site_xpos[:,env.s_tip,2].nan_to_num().mean()), '| max|qvel| %.1f' % float(env.qvel.nan_to_num().abs().max()))
except Exception as e:
    import traceback; P('ERROR', traceback.format_exc()[-2500:])
P('DONE')
