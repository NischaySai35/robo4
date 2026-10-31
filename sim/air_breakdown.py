from paths import tpath

import sys, numpy as np, math
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//air_breakdown.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
from tetro_gpu import GPUDock
N=512; env=GPUDock(n=N, floor_frac=0.0); env.ik_mode='ik'; env.htol=(0.006, math.radians(3))
o=env.reset(); R=[]
for k in range(400):
    zz=env.Rrx[:,:,2].clone().cpu().numpy(); oo=env.seat.clone().cpu().numpy()
    o,r,d,inf=env.step(np.zeros((N,7),np.float32))
    for i in np.nonzero(d)[0]: x=dict(inf[i]); x['zup']=zz[i][2]; x['reach']=np.linalg.norm(oo[i][:2]); x['h']=oo[i][2]; R.append(x)
P('air episodes', len(R))
for name, f in [('receiver faces UP (we come from above)', lambda x: x['zup']>0.7), ('faces SIDEWAYS', lambda x: -0.3<=x['zup']<=0.7), ('faces DOWN (come from below)', lambda x: x['zup']<-0.3)]:
    S=[x for x in R if f(x)]
    if not S: P(name,'none'); continue
    P('%-40s n=%4d docked %5.1f%% hover %5.1f%% crash %4.1f%%' % (name, len(S), 100*np.mean([x['success'] for x in S]), 100*np.mean([x['phase']>=1 for x in S]), 100*np.mean([x['crash'] for x in S])))
F=[x for x in R if x['phase']>=1 and not x['success']]
ax=np.array([x['axial_mm'] for x in F]); sl=np.array([x['slot_deg'] for x in F]); er=np.array([x['err_mm'] for x in F])
P('hovered-but-failed n=%d | axial mm: <1 %d, 1-5 %d, 5-12 %d, >12 %d | slot deg median %.1f | err mm median %.1f' % (len(F), (ax<1).sum(), ((ax>=1)&(ax<5)).sum(), ((ax>=5)&(ax<12)).sum(), (ax>=12).sum(), np.median(sl) if len(sl) else -1, np.median(er) if len(er) else -1))
for lo,hi in [(0,0.2),(0.2,0.3),(0.3,0.5)]:
    S=[x for x in R if lo<=x['reach']<hi]
    if S: P('reach %.1f-%.1f m n=%d docked %.1f%%' % (lo,hi,len(S),100*np.mean([x['success'] for x in S])))
P('DONE')
