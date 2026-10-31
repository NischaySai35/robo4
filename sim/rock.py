from paths import tpath

import sys, math, numpy as np
sys.path.insert(0, tpath('sim'))
from walk import Walker, L
from walk_env import WalkEnv
log=open(tpath('logs//rock.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); log.write(s+'\n'); log.flush()
poses={'straight up':np.zeros(7), 'reach 25cm (hover pose)':np.radians([44,20,57,0,63,35,-45]), 'reach other side':np.radians([-136,20,57,0,63,35,-45])}
for seed in range(600,608):
    e=WalkEnv(seed=seed, randomize=True); e.reset(base='A', base_rx=0, yaw_deg=45); e.rx_bias=[np.zeros(3) for _ in e.rx]
    W=Walker(e,'A',0,0,e.m.opt.gravity.copy(),log=lambda *a:None)
    for name,q in poses.items():
        for _ in range(70): e.step(q,45,0)
        RA=e.d.xmat[e.end['A']['body']].reshape(3,3); tilt=math.degrees(math.acos(min(1,RA[2,1])))
        lean=RA[:,1].copy(); lean[2]=0
        Minv=np.linalg.inv(W.M()); pn,nn,xn=L.NOM._fk(W.nq(e.measured())); pw=(Minv@np.r_[pn,1])[:3]; pt=e.d.site_xpos[e.end['B']['tip']]
        # direction of the weight moment about the base (horizontal COM offset)
        com=e.d.subtree_com[e.m.body('module_frame').id]; base=e.d.site_xpos[e.end['A']['tip']]; arm=com-base; arm[2]=0
        cosang=float(lean@arm/(np.linalg.norm(lean)*np.linalg.norm(arm)+1e-12))
        P('seed %d %-24s | base rock %.2f deg | leans toward the weight: cos=%+.2f | tip est-vs-true %.1f mm' % (seed,name,tilt,cosang,1000*np.linalg.norm(pw-pt)))
P('DONE')
