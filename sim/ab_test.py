from paths import tpath

import sys, os, numpy as np, time
sys.path.insert(0, tpath('deploy')); sys.path.insert(0, tpath('sim'))
import laptop_controller as L
from cpu_check import IKController
from tetro_env2 import TetroDockEnv
V=os.environ['VAR']; log=open(tpath('logs//ab_%s.log')%V,'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
NOM0=L.NOM; ok=0
for i in range(20):
    env=TetroDockEnv(seed=1000+i, floor_frac=0.9, max_dist=0.30); env.reset(); env.htol=(-1,-1)
    if V=='A':
        C=IKController(env); C.reset()
    else:
        L.NOM = env if V=='C' else NOM0
        C=L.DockController(env.hover+env.bias_p, env.seat+env.bias_p, env.Rrx_obs[:,2], env.Rrx_obs, env.standoff, env.cmd.copy(), gravity=(env.m.opt.gravity.copy() if V=='E' else None))
    info={}; khov=-1
    for t in range(env.ep_len):
        if V=='A': cmd=C.step()
        else:
            qm=env.qhist[max(0,len(env.qhist)-1-env.obs_lag)][0]
            if V=='D': C.qbuf=[]
            cmd,_=C.step(qm)
        env.cmd=cmd
        if C.phase>=1 and env.phase==0: env.phase=1; env.prev_E=env._err()[0]
        if C.phase>=1 and khov<0: khov=t
        o,r,te,tr,info=env.step(np.zeros(7))
        if te or tr: break
    pt,_,_=env._fk(env.qhist[-1][0]); true_tip=env.d.site_xpos[env.s_tip].copy()
    ok+=bool(info.get('success'))
    P('robot %2d %-5s docked %-5s hover_at_step %4d  axial %6.2f mm  noise %.1f mrad  est-vs-true tip %.1f mm' % (i, env.kind, info.get('success'), khov, info.get('axial_mm',0), env.noise*1000, 1000*np.linalg.norm(pt-true_tip)))
P('VARIANT %s docked %d/20' % (V, ok)); P('DONE')
