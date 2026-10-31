from paths import tpath

import sys, math, numpy as np, mujoco
sys.path.insert(0, tpath('sim'))
from walk import Walker, slot_frame, H, F, L
from walk_env import WalkEnv
from build_walk import R2q
rng=np.random.default_rng(5); res={'A':[], 'B':[]}
for trial in range(24):
    base='A' if trial%2==0 else 'B'
    e=WalkEnv(seed=500+trial, randomize=True); e.reset(base='A', base_rx=0, yaw_deg=45)
    if base=='B':
        # re-place: End B locked in rx1 (same trick as reset but for B: its +y points INTO the receiver)
        m,d=e.m,e.d; RX=e.rx[1]; Rb=slot_frame(RX['R'],0,'B')
        # pose of module_frame so that B tip frame = (Rb, seat) at q=0: compute via kinematics with root at identity
        d.qpos[:]=0; d.qpos[3]=1; mujoco.mj_kinematics(m,d)
        Rb0=d.xmat[e.end['B']['body']].reshape(3,3); pb0=d.site_xpos[e.end['B']['tip']]
        Rroot=Rb@Rb0.T; d.qpos[0:3]=RX['seat']-Rroot@pb0; d.qpos[3:7]=R2q(Rroot)
        d.qpos[e.end['B']['lockq']]=math.radians(45); d.ctrl[e.lock_act['B']]=math.radians(45); d.qpos[e.end['A']['lockq']]=0; d.ctrl[e.lock_act['A']]=0
        d.qvel[:]=0; mujoco.mj_forward(m,d)
        for _ in range(300): mujoco.mj_step(m,d)
        e.tgt=d.ctrl[e.all_act].copy(); e.sp=e.tgt.copy(); e.spv[:]=0
        W=Walker(e,'B',1,0,e.m.opt.gravity.copy(), log=lambda *a: None)
    else:
        W=Walker(e,'A',0,0,e.m.opt.gravity.copy(), log=lambda *a: None)
    mv='B' if base=='A' else 'A'
    for pose in range(3):
        qn=np.array([rng.uniform(-1,1), rng.uniform(0.2,0.9), rng.uniform(0.2,0.9), rng.uniform(-0.5,0.5), rng.uniform(0.2,0.9), rng.uniform(0.0,0.6), rng.uniform(-1,1)])   # arched, end in the air
        q=qn if base=='A' else qn[::-1]
        for _ in range(60): st=e.step(q, 45 if base=='A' else 0, 45 if base=='B' else 0)
        if e.d.site_xpos[e.end[mv]['tip']][2] < 0.03 or not st['ok']: continue
        Minv=np.linalg.inv(W.M()); pn,nn,xn=L.NOM._fk(W.nq(e.measured())); pw=(Minv@np.r_[pn,1])[:3]
        err=1000*np.linalg.norm(pw-e.d.site_xpos[e.end[mv]['tip']]); res[base].append(err)
for b in 'AB': print('base %s: estimate error of the free end, n=%d: median %.1f mm, 90%%: %.1f mm, max %.1f mm' % (b, len(res[b]), np.median(res[b]), np.percentile(res[b],90), max(res[b])))
