from paths import tpath

import sys, time, numpy as np, torch, math
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//ik_dbg.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
try:
    from tetro_gpu import GPUDock
    import tetro_gpu as TG
    N=16; env=GPUDock(n=N, floor_frac=1.0); env.ik_mode='ik'; o=env.reset()
    orig=env._ik_cmd
    def dbg():
        q=env.cmd.clone(); out=orig(); 
        p,n,x=env._fk_sag(q); goal=env.hover+env.bias_p
        P('  est-err %.1f mm | true-err %.1f mm | |dq| %.4f rad | cmd %s' % (float((goal-p)[0].norm()*1000), float((env.site_xpos[0,env.s_tip]-env.hover[0]).norm()*1000), float((out-q)[0].norm()), np.round(np.degrees(out[0].cpu().numpy()),1).tolist()))
        return out
    env._ik_cmd=dbg
    for k in range(25):
        o,r,d,inf=env.step(np.zeros((N,7),np.float32))
except Exception as e:
    import traceback; P('ERROR', traceback.format_exc()[-2500:])
P('DONE')
