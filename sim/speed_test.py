from paths import tpath

import sys, os, numpy as np, math, io, contextlib, time
try:
    import mujoco; mujoco.set_mju_user_warning(lambda m: None)
except Exception: pass
sys.path.insert(0, tpath('deploy')); sys.path.insert(0, tpath('sim'))
with contextlib.redirect_stdout(io.StringIO()):
    import laptop_controller as L
from tetro_env2 import TetroDockEnv, DT_CTRL
V=os.environ['TAG']; log=open(tpath('logs//speed_%s.log')%V,'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
rng=np.random.default_rng(7); R=[]
for i in range(int(os.environ.get('NEP','20'))):
    env=TetroDockEnv(seed=2000+i, floor_frac=1.0, max_dist=0.30, ep_len=450); m,d=env.m,env.d; env.reset(); env.htol=(-1,-1)
    sub=set(); 
    for b in range(m.nbody):
        x=b
        while x>0:
            if x==env.eb: sub.add(b); break
            x=m.body_parentid[x]
    g=m.opt.gravity.copy(); tilt=math.degrees(math.acos(-g[2]/9.81)); ph=math.degrees(math.atan2(g[1],g[0]))
    gm=L.gravity_from_tilt(max(0,tilt+rng.normal(0,0.1)), ph+rng.normal(0,10))
    with contextlib.redirect_stdout(io.StringIO()):
        C=L.DockController(env.hover+env.bias_p, env.seat+env.bias_p, env.Rrx_obs[:,2], env.Rrx_obs, env.standoff, env.cmd.copy(), gravity=gm)
    pj=pv=pf=pt=0; vtouch=None; info={}; tdock=None; f6=np.zeros(6)
    for t in range(env.ep_len):
        qm=env.qhist[max(0,len(env.qhist)-1-env.obs_lag)][0]
        with contextlib.redirect_stdout(io.StringIO()):
            cmd,_=C.step(qm)
        env.cmd=cmd
        if C.phase>=1 and env.phase==0: env.phase=1; env.prev_E=env._err()[0]
        o,r,te,tr,info=env.step(np.zeros(7))
        pj=max(pj, np.max(np.abs(d.qvel[env.da]))); v=np.linalg.norm(d.cvel[env.eb][3:]); pv=max(pv,v)
        pt=max(pt, np.max(np.abs(d.actuator_force[env.all_act[:7]])))
        F=0.0
        for k in range(d.ncon):
            c=d.contact[k]; b1,b2=m.geom_bodyid[c.geom1],m.geom_bodyid[c.geom2]
            if (b1 in sub) != (b2 in sub):
                mujoco.mj_contactForce(m,d,k,f6); F+=abs(f6[0])
        if F>0.05 and vtouch is None: vtouch=v
        if info.get('lock_deg',0) < 1: pf=max(pf,F)        # impact only: before the lock turns / pull test
        if info.get('success') and tdock is None: tdock=t*DT_CTRL
        if te or tr: break
    R.append((bool(info.get('success')), pj, pv, vtouch or 0, pf, pt, t*DT_CTRL))
    P('robot %2d docked %-5s | peak joint %5.0f deg/s | peak End B %4.0f mm/s | End B speed at touch %4.0f mm/s | peak contact %5.1f N | peak servo torque %.2f N.m | time %.1f s' % (i, R[-1][0], math.degrees(pj), pv*1000, (vtouch or 0)*1000, pf, pt, t*DT_CTRL))
A=np.array(R,dtype=float)
P('SUMMARY %s: docked %d/%d | median peak joint %.0f deg/s (max %.0f) | median End B touch speed %.0f mm/s | median peak contact %.1f N (max %.1f) | median peak torque %.2f N.m | median time %.1f s' % (V, A[:,0].sum(), len(A), np.degrees(np.median(A[:,1])), np.degrees(A[:,1].max()), 1000*np.median(A[:,3]), np.median(A[:,4]), A[:,4].max(), np.median(A[:,5]), np.median(A[:,6])))
P('DONE')
