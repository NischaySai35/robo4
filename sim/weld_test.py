from paths import tpath

import sys, math, os, numpy as np, mujoco, xml.etree.ElementTree as ET
sys.path.insert(0, tpath('sim'))
from walk import Walker
from walk_env import WalkEnv
from build_walk import R2q
src=tpath('sim//walk_train.xml'); dst=tpath('sim//walk_weld.xml')
R=ET.parse(src).getroot(); eq=R.find('equality') or ET.SubElement(R,'equality'); ET.SubElement(eq,'weld',name='basefix',body1='rx0',body2='EndA_LockModule')
ET.ElementTree(R).write(dst)
V=os.environ['VAR']; log=open(tpath('logs//weld_%s.log')%V,'w')
def P(*a):
    s=' '.join(str(x) for x in a); log.write(s+'\n'); log.flush()
ok=0; n=0
for seed in range(700,712):
    e=WalkEnv(seed=seed, randomize=True, xml=dst if V=='rigid' else src); e.reset(base='A', base_rx=0, yaw_deg=45)
    if V=='rigid':
        m,d=e.m,e.d; b1=m.body('rx0').id; b2=m.body('EndA_LockModule').id
        R1=d.xmat[b1].reshape(3,3); R2=d.xmat[b2].reshape(3,3)
        relp=R1.T@(d.xpos[b2]-d.xpos[b1]); relR=R1.T@R2
        eid=m.equality('basefix').id; m.eq_data[eid,0:3]=0; m.eq_data[eid,3:6]=relp; m.eq_data[eid,6:10]=R2q(relR); m.eq_data[eid,10]=1
        m.eq_solref[eid]=[0.002,1]
    W=Walker(e,'A',0,0,e.m.opt.gravity.copy(),log=lambda *a:None)
    C=W._ctrl(1); hold=[0]
    def locks(lk): return (45.0, lk)
    def done(C,lk):
        if C.phase==2 and lk>=45: hold[0]+=1
        return hold[0]>=10
    W._run(C, locks, done, 700, 'dock')
    r=e.end_vs_rx('B',1); good=abs(r['axial_mm'])<0.8 and r['radial_mm']<1.5 and r['lock_deg']>40; ok+=good; n+=1
    P('seed %d %s: %s gap %.2f side %.2f' % (seed, V, 'OK' if good else 'FAIL', r['axial_mm'], r['radial_mm']))
P('RESULT %s: docked %d/%d' % (V, ok, n))
