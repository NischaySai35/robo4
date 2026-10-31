from paths import tpath

import sys, os, numpy as np, math
sys.path.insert(0, tpath('deploy')); sys.path.insert(0, tpath('sim'))
os.environ['SEARCH']='0'
import laptop_controller as L
from tetro_env2 import TetroDockEnv
sd=int(os.environ['SEED']); log=open(tpath('logs//load_sig_%d.log')%sd,'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
env=TetroDockEnv(seed=sd, floor_frac=float(os.environ.get('FF','0.0')), max_dist=0.30); rng=np.random.default_rng(7)
act=env.all_act[:7]
for ep in range(int(os.environ.get('NEP','30'))):
    env.reset(); env.htol=(-1,-1)
    C=L.DockController(env.hover+env.bias_p, env.seat+env.bias_p, env.Rrx_obs[:,2], env.Rrx_obs, env.standoff, env.cmd.copy(), gravity=env.m.opt.gravity.copy())
    info={}; th=None; kb=None; sig=[]
    for t in range(env.ep_len):
        qm=env.qhist[max(0,len(env.qhist)-1-env.obs_lag)][0]
        cmd,_=C.step(qm); env.cmd=cmd
        if C.phase>=1 and env.phase==0: env.phase=1; env.prev_E=env._err()[0]
        o,r,te,tr,info=env.step(np.zeros(7))
        tau=env.d.actuator_force[act].copy()
        if C.phase>=1 and th is None: th=tau
        if C.phase>=1 and C.appr<=-0.0004 and kb is None: kb=t
        if kb is not None and t-kb in (0,3,6): sig.append(np.max(np.abs(tau-th)))
        if te or tr: break
    if th is None: P('ep %2d no hover' % ep); continue
    rel=env.d.site_xpos[env.s_tip]-env.seat; ax=(rel@env.Rrx[:,2])*1000
    P('ep %2d %-5s docked %-5s true axial %6.2f mm | load change at bottom (+0,+3,+6 frames) N.m: %s' % (ep, env.kind, info.get('success'), ax, ' '.join('%.3f'%x for x in sig)))
P('DONE')
