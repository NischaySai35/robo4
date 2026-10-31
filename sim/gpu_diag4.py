from paths import tpath

import sys, numpy as np, torch, math, inspect, mujoco
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//gpu_diag4.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
try:
    import mujoco_warp as mjw
    P('reset_data sig', inspect.signature(mjw.reset_data))
    import tetro_gpu
    from tetro_gpu import GPUDock
    z=np.load(tpath('runs//dock_v3//brain.npz')); n=len([k for k in z.files if k.startswith('W')]); W=[(z['W%d'%i],z['b%d'%i]) for i in range(n)]; mu,var=z['mean'],z['var']
    def act(o):
        h=np.clip((o-mu)/np.sqrt(var+1e-8),-10,10)
        for i,(A,b) in enumerate(W):
            h=h@A.T+b
            if i<n-1: h=np.where(h>0,h,np.exp(np.minimum(h,0))-1)
        return np.clip(h,-1,1).astype(np.float32)
    for case in ['hulls off', 'ccd default']:
        orig=mujoco.MjModel.from_xml_path
        def patched(path, case=case):
            m=orig(path)
            if case=='hulls off':
                for i in range(m.ngeom):
                    if m.geom_type[i]==mujoco.mjtGeom.mjGEOM_MESH: m.geom_contype[i]=0; m.geom_conaffinity[i]=0
            return m
        mujoco.MjModel.from_xml_path=patched
        env=GPUDock(n=256)
        if case=='ccd default': env.m.opt.ccd_iterations=35
        mujoco.MjModel.from_xml_path=orig
        o=env.reset(); first=None; nan=0
        for k in range(40):
            qv=env.qvel.clone(); o,r,d,inf=env.step(act(o)); bad=~torch.isfinite(env.qpos).all(-1)
            if bad.any() and first is None:
                i=int(torch.nonzero(bad)[0]); first=(k, i, 'floor' if bool(env.floor[i]) else 'air', int(env.phase[i]), round(float(qv[i].abs().max()),2), round(float((env.site_xpos[i,env.s_tip]-env.seat[i]).norm()) if torch.isfinite(env.site_xpos[i]).all() else -1,3))
            nan+=int(bad.sum()); 
            if bad.any(): break
        P('%-12s first NaN: %s' % (case, first))
        del env; torch.cuda.empty_cache()
except Exception as e:
    import traceback; P('ERROR', traceback.format_exc()[-2500:])
P('DONE')
