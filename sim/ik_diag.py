from paths import tpath

import sys, numpy as np, torch, math
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//ik_diag.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
try:
    from tetro_gpu import GPUDock
    N=512; env=GPUDock(n=N, floor_frac=1.0); env.ik_mode='ik'; env.htol=(0.006, math.radians(3)); o=env.reset()
    for k in range(60): o,r,d,inf=env.step(np.zeros((N,7),np.float32))
    m=(env.phase==0)
    q=lambda x: np.round(np.percentile(x[m].cpu().numpy(),[10,50,90]),3).tolist()
    P('worlds still aligning at step 60: %d/%d' % (int(m.sum()), N))
    P('estimated pos error mm p10/50/90', q(env.est_e*1000)); P('estimated tilt deg', q(torch.rad2deg(env.est_ang))); P('estimated slot deg', q(torch.rad2deg(env.est_sl)))
    atlim=((env.cmd-env.lo).abs()<0.02)|((env.hi-env.cmd).abs()<0.02); P('worlds with a joint at its limit', int((atlim.any(-1)&m).sum()))
    v=env.cvel[:,env.eb,3:].norm(dim=-1); P('tip speed m/s p10/50/90', q(v))
    dist=(env.mpos[:,env.cpu.mocap,:2]-env.base_xy).norm(dim=-1); P('target dist (aligning) p10/50/90', q(dist), '| (done) ', np.round(np.percentile(dist[~m].cpu().numpy(),[10,50,90]),3).tolist() if (~m).any() else '')
except Exception as e:
    import traceback; P('ERROR', traceback.format_exc()[-2500:])
P('DONE')
