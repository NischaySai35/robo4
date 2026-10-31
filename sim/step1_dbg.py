from paths import tpath

import sys, math, numpy as np, os
sys.path.insert(0, tpath('sim'))
from walk import Walker
from walk_env import WalkEnv
log=open(tpath('logs//step1_dbg.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); log.write(s+'\n'); log.flush()
for seed in [300, 202, 400]:
    for nobias in [False, True]:
        e=WalkEnv(seed=seed, randomize=True); e.reset(base='A', base_rx=0, yaw_deg=45)
        if nobias: e.rx_bias=[np.zeros(3) for _ in e.rx]
        g=e.m.opt.gravity.copy()
        P('seed %d %s | delay %d noise %.1f mrad lag %d tilt %.2f deg push_p %.3f magk %.2f bias base %.1f mm target %.1f mm' % (seed, 'NO map error' if nobias else 'with map error', e.delay, e.noise*1000, e.obs_lag, math.degrees(math.acos(-g[2]/9.81)), e.push_p, e.magk, 1000*np.linalg.norm(e.rx_bias[0]), 1000*np.linalg.norm(e.rx_bias[1])))
        W=Walker(e,'A',0,0,g,log=P); W.debug=True
        W.step_to(1)
