from paths import tpath

import sys, numpy as np, torch, math, types
sys.path.insert(0, tpath('sim'))
log=open(tpath('logs//gpu_diag3.log'),'w')
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
    env=GPUDock(n=256); P('integrator in GPU model:', env.m.opt.integrator)
    orig_servo, orig_mag = env._servo, env._magnets
    def servo_nodroop(self=env):
        e=self.tgt-self.sp; vdes=torch.sign(e)*torch.minimum(self.w0, torch.sqrt(2*self.amax*e.abs())); self.spv+=(vdes-self.spv).clamp(-self.amax*0.005,self.amax*0.005); self.sp+=self.spv*0.005; self.ctrl[:, self.all_act]=self.sp
    for name, sv, mg, pp in [('full',orig_servo,orig_mag,True),('no magnets',orig_servo,lambda: None,True),('no torque droop',servo_nodroop,orig_mag,True),('no pushes',orig_servo,orig_mag,False),('ctrl direct (no servo model)',lambda: env.ctrl.__setitem__((slice(None), env.all_act), env.tgt),orig_mag,True)]:
        env._servo, env._magnets = sv, mg; env.push_p_scale = pp
        o=env.reset()
        if not pp: env.push_p.zero_()
        nan=0; first=None
        for k in range(40):
            o,r,d,inf=env.step(act(o)); c=int(env.cr[1]); nan+=c
            if c and first is None: first=k
        P('%-30s NaN blow-ups in 40 steps x 256 robots: %d (first at step %s)' % (name, nan, first))
except Exception as e:
    import traceback; P('ERROR', traceback.format_exc()[-2500:])
P('DONE')
