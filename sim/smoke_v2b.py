from paths import tpath

import sys, math, numpy as np, mujoco
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv, rot
env = TetroDockEnv(seed=3); env.randomize = False
for q in [np.array([0, 0.6, 0.6, 0, 0.3, 0.2, 0]), np.array([0, 1.2, 0.9, 0, 0.6, 0.3, 0.3])]:
  for gap_mm in [0.0, 0.3, 1.0]:
    env.reset(seed=1); m, d = env.m, env.d
    d.qpos[env.qa] = q; d.ctrl[env.act_id] = q; env.cmd = q.copy(); [env.queue.append(q.copy()) for _ in range(2)]
    mujoco.mj_forward(m, d)
    for _ in range(5000): mujoco.mj_step(m, d)
    R = d.xmat[env.eb].reshape(3, 3); p = d.site_xpos[env.s_tip].copy(); nB = R[:, 1]; z = -nB
    o0 = p + (0.0063 + gap_mm / 1000) * nB; env._set_rx(o0, z, rot(z, math.radians(45)) @ R[:, 0]); env.seat = o0 + 0.0063 * z; env.hover = env.seat + 0.02 * z; env.phase = 1
    hist = []
    for k in range(20):
        o, r, te, tr, info = env.step(np.zeros(7)); hist.append(info['axial_mm'])
    nc = sum(1 for i in range(d.ncon) if (d.contact[i].geom1 in env.rx_geoms) or (d.contact[i].geom2 in env.rx_geoms))
    pen = min([d.contact[i].dist for i in range(d.ncon)] + [0]) * 1000
    print('pose', q[1:3], 'gap %.1f mm: axial path' % gap_mm, np.round(hist[::4], 2), 'radial %.2f slot %.2f tilt %.2f mag %.1f N rx contacts %d deepest %.2f mm phase %d' % (info['radial_mm'], info['slot_deg'], info['ang_deg'], info['mag_N'], nc, pen, info['phase']))
