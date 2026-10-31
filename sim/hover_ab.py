from paths import tpath

import sys, os, numpy as np, math, io, contextlib
try:
    import mujoco; mujoco.set_mju_user_warning(lambda m: None)
except Exception: pass
sys.path.insert(0, tpath('deploy')); sys.path.insert(0, tpath('sim'))
with contextlib.redirect_stdout(io.StringIO()):
    import laptop_controller as L
from tetro_env2 import TetroDockEnv, DT_CTRL
V=os.environ['TAG']; log=open(tpath('logs//hov_%s.log')%V,'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
rng=np.random.default_rng(7); R=[]
for i in range(16):
    env=TetroDockEnv(seed=3000+i, floor_frac=1.0, max_dist=0.30, ep_len=450); m,d=env.m,env.d; env.reset(); env.htol=(-1,-1)
    g=m.opt.gravity.copy(); tilt=math.degrees(math.acos(-g[2]/9.81)); ph=math.degrees(math.atan2(g[1],g[0]))
    gm=L.gravity_from_tilt(max(0,tilt+rng.normal(0,0.1)), ph+rng.normal(0,10))
    with contextlib.redirect_stdout(io.StringIO()):
        C=L.DockController(env.hover+env.bias_p, env.seat+env.bias_p, env.Rrx_obs[:,2], env.Rrx_obs, env.standoff, env.cmd.copy(), gravity=gm)
    lat=None; th=None; info={}; latend=None
    for t in range(env.ep_len):
        qm=env.qhist[max(0,len(env.qhist)-1-env.obs_lag)][0]
        with contextlib.redirect_stdout(io.StringIO()):
            cmd,_=C.step(qm)
        env.cmd=cmd
        if C.phase>=1 and env.phase==0:
            env.phase=1; env.prev_E=env._err()[0]; z=env.Rrx[:,2]; rel=d.site_xpos[env.s_tip]-env.hover; lat=np.linalg.norm(rel-(rel@z)*z)*1000; th=t*DT_CTRL
        o,r,te,tr,info=env.step(np.zeros(7))
        if te or tr: break
    P('robot %2d docked %-5s | went in at %5s s | true sideways error when going in %5s mm | end gap %.1f mm lock %.0f' % (i, info.get('success'), '%.1f'%th if th else '-', '%.1f'%lat if lat is not None else '-', info.get('axial_mm',0), info.get('lock_deg',0)))
    R.append((bool(info.get('success')), lat if lat is not None else np.nan))
A=np.array(R); P('SUMMARY %s docked %d/16 | median sideways error at go-in %.1f mm' % (V, A[:,0].sum(), np.nanmedian(A[:,1])))
