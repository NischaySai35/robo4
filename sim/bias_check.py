from paths import tpath

import sys, os, numpy as np, math
sys.path.insert(0, tpath('deploy')); sys.path.insert(0, tpath('sim'))
import laptop_controller as L
from tetro_env2 import TetroDockEnv
sd=int(os.environ['SEED']); log=open(tpath('logs//bias_%d.log')%sd,'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
N=L.NOM; m=N.m
P('nominal base_tilt stiffness:', [ (m.joint(j).name, float(m.jnt_stiffness[j])) for j in range(m.njnt) if m.joint(j).name.startswith('base_tilt')])
P('nominal flex stiffness:', [ (m.joint(j).name, round(float(m.jnt_stiffness[j]),1)) for j in range(m.njnt) if '_flex' in m.joint(j).name][:6])
env=TetroDockEnv(seed=sd, floor_frac=0.0, max_dist=0.30); rng=np.random.default_rng(7); rows=[]
for ep in range(int(os.environ.get('NEP','25'))):
    env.reset(); env.htol=(-1,-1)
    C=L.DockController(env.hover+env.bias_p, env.seat+env.bias_p, env.Rrx_obs[:,2], env.Rrx_obs, env.standoff, env.cmd.copy(), gravity=env.m.opt.gravity.copy())
    for t in range(env.ep_len):
        qm=env.qhist[max(0,len(env.qhist)-1-env.obs_lag)][0]
        cmd,_=C.step(qm); env.cmd=cmd
        if C.phase>=1:
            q=env.qhist[-1][0]; est=C.pose(q)[0]; true=env.d.site_xpos[env.s_tip].copy(); R=env.Rrx
            e=R.T@(true-est); zup=R[2,2]
            bt=[float(env.m.jnt_stiffness[j]) for j in env.base_tilt]
            rows.append(np.r_[e*1000, zup]); P('ep %2d zup %+.2f  true-est in receiver frame (x,y,axial) mm: %+.1f %+.1f %+.1f | base_tilt k %s' % (ep, zup, *(e*1000), bt)); break
        o,r,te,tr,info=env.step(np.zeros(7))
        if te or tr: break
A=np.array(rows)
if len(A):
    P('MEAN error mm (x,y,axial): %s  | STD: %s | lateral |mean| vs std' % (np.round(A[:,:3].mean(0),2), np.round(A[:,:3].std(0),2)))
    S=A[np.abs(A[:,3])<0.7]
    if len(S): P('sideways receivers n=%d MEAN %s STD %s' % (len(S), np.round(S[:,:3].mean(0),2), np.round(S[:,:3].std(0),2)))
P('DONE')
