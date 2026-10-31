from paths import tpath

import sys, numpy as np, torch, math
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//gpu_diag5.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
try:
    from tetro_gpu import GPUDock
    z=np.load(tpath('runs//dock_v3//brain.npz')); n=len([k for k in z.files if k.startswith('W')]); W=[(z['W%d'%i],z['b%d'%i]) for i in range(n)]; mu,var=z['mean'],z['var']
    def act(o):
        h=np.clip((o-mu)/np.sqrt(var+1e-8),-10,10)
        for i,(A,b) in enumerate(W):
            h=h@A.T+b
            if i<n-1: h=np.where(h>0,h,np.exp(np.minimum(h,0))-1)
        return np.clip(h,-1,1).astype(np.float32)
    env=GPUDock(n=512, floor_frac=0.9); env.htol=(0.015, math.radians(6)); o=env.reset(); cnt=0
    for k in range(250):
        st=dict(ph=env.phase.clone(), qpos=env.qpos.clone(), qvel=env.qvel.clone(), tip=env.site_xpos[:,env.s_tip].clone(), seat=env.seat.clone(), floor=env.floor.clone(), push=env.push_left.clone(), mag=env.mag_force.clone(), xp=env.xpos.clone())
        o,r,d,inf=env.step(act(o))
        bad=env.nan_idx
        for i in bad.tolist()[:3]:
            cnt+=1
            q=st['qpos'][i]; qa=q[env.qa]; dist=float((st['tip'][i]-st['seat'][i]).norm())
            lowz=float(st['xp'][i][env.links,2].min())
            fj=st['qpos'][i][env.jq[env.flexj]].abs().max(); bl=st['qpos'][i][env.jq[env.blj]].abs().max()
            P('phase %d | step %d world %d %s |' % (int(env.phase[i]) if False else int(st.get('ph', env.phase)[i]), 0, 0, '') + ' step %d world %d %s | dist to seat %.3f m | lowest link z %.3f | max|qvel| %.1f | main q(deg) %s | max flex %.2f deg | max backlash %.2f deg | push %d | magnet %.1f N' % (k, i, 'floor' if bool(st['floor'][i]) else 'air', dist, lowz, float(st['qvel'][i].abs().max()), np.round(np.degrees(qa.cpu().numpy())).tolist(), math.degrees(float(fj)), math.degrees(float(bl)), int(st['push'][i]), float(st['mag'][i])))
        if cnt>=8: break
except Exception as e:
    import traceback; P('ERROR', traceback.format_exc()[-2500:])
P('DONE')
