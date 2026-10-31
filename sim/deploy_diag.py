from paths import tpath

import sys, numpy as np, time
sys.path.insert(0, tpath('deploy')); sys.path.insert(0, tpath('sim'))
import laptop_controller as L
from tetro_env2 import TetroDockEnv
log=open(tpath('logs//deploy_diag.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
for name, use_env_fk, true_speed in [('nominal FK + encoder speed', False, False), ('env FK + encoder speed', True, False), ('nominal FK + true speed', False, True)]:
    env = TetroDockEnv(seed=321, floor_frac=0.9, max_dist=0.30); ok=0; sp=[]; n=10
    for ep in range(n):
        env.reset(); env.htol=(-1,-1)
        L.NOM_saved = L.NOM
        if use_env_fk: L.NOM = env
        C = L.DockController(env.hover+env.bias_p, env.seat+env.bias_p, env.Rrx_obs[:,2], env.Rrx_obs, env.standoff, env.cmd.copy())
        info={}
        for t in range(env.ep_len):
            qm = env.qhist[max(0,len(env.qhist)-1-env.obs_lag)][0]
            if true_speed: C.prev_pm = None
            cmd,_ = C.step(qm)
            if true_speed and C.k>18: pass
            if C.prev_pm is not None and t>30 and C.phase==0: pass
            env.cmd=cmd
            if C.phase>=1 and env.phase==0: env.phase=1; env.prev_E=env._err()[0]
            o,r,te,tr,info=env.step(np.zeros(7))
            if t>40 and C.phase==0: sp.append(np.linalg.norm(env.d.cvel[env.eb][3:]))
            if te or tr: break
        L.NOM = L.NOM_saved
        ok += bool(info.get('success'))
    P('%-30s docked %d/%d   (true tip speed while hovering: median %.3f m/s)' % (name, ok, n, np.median(sp) if sp else -1))
P('DONE')
