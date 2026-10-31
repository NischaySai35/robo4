from paths import tpath

import sys, math, numpy as np, io, contextlib
sys.path.insert(0, tpath('sim'))
import walk as Wm
from walk import Walker, slot_frame, H, F, T_NOMA, L
from walk_env import WalkEnv
e=WalkEnv(seed=100, randomize=False); e.reset(base='A', base_rx=0, yaw_deg=45)
W=Walker(e,'A',0,0,e.m.opt.gravity.copy(), log=lambda *a: None)
# dock B at rx1 only
C=W._ctrl(1); hold=[0]
def locks(lk): return (45.0, lk)
def done(C,lk):
    if C.phase==2 and lk>=45: hold[0]+=1
    return hold[0]>=10
W._run(C, locks, done, 700, 'dock')
print('dock B:', e.end_vs_rx('B',1))
# estimates of each end, from each base assumption
qm=e.measured()
for base in ['A','B']:
    W.base=base; W.base_rx = 0 if base=='A' else 1
    if base=='B':
        # k from estimate as in step_to (using A-base model)
        W.base='A'; W.base_rx=0; cn=W.nq(qm); p,n,x=L.NOM._fk(cn); Minv=np.linalg.inv(W.M()); xw=Minv[:3,:3]@x
        Rr=e.rx[1]['R']; ang=math.degrees(math.atan2(xw@Rr[:,1], xw@Rr[:,0])); W.k=int(round((ang-45)/90))%4; print('k for B base', W.k, 'raw angle', round(ang,2))
        W.base='B'; W.base_rx=1
    Minv=np.linalg.inv(W.M()); pn,nn,xn=L.NOM._fk(W.nq(qm)); pw=(Minv@np.r_[pn,1])[:3]
    mv='B' if base=='A' else 'A'; pt=e.d.site_xpos[e.end[mv]['tip']]
    # true base frame vs assumed
    bb=e.end[base]['body']; Rt=e.d.xmat[bb].reshape(3,3); Ra=slot_frame(e.rx[W.base_rx]['R'], W.k, base)
    ang=math.degrees(math.acos(max(-1,min(1,(np.trace(Ra.T@Rt)-1)/2)))); perr=1000*np.linalg.norm(e.d.site_xpos[e.end[base]['tip']]-e.rx[W.base_rx]['seat'])
    print('base %s: est-vs-true moving tip %.1f mm | assumed vs true base orientation %.2f deg, base tip pos err %.2f mm' % (base, 1000*np.linalg.norm(pw-pt), ang, perr))
    # rigid (no sag) FK check: use qpos exact, no sag
    d=L.NOM.dr; import mujoco
    d.qpos[:]=0; d.qpos[L.NOM.qa]=W.nq(e.d.qpos[e.qa]); mujoco.mj_kinematics(L.NOM.m,d); pr=(Minv@np.r_[d.site_xpos[L.NOM.s_tip],1])[:3]
    print('    rigid FK with TRUE joint angles (no sag model): err %.1f mm' % (1000*np.linalg.norm(pr-pt)))
