from paths import tpath

import sys, math, numpy as np, mujoco
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv, rot
env = TetroDockEnv(seed=3); env.randomize = False
for q in [np.array([0, 1.2, 0.9, 0, 0.6, 0.3, 0.3]), np.array([0, 0.9, 1.0, 0, 0.8, 0.4, 0.0])]:
  for gap_mm, slot in [(0.3, 45), (0.3, 47.5), (0.8, 44), (2.0, 45)]:
    env.reset(seed=1); m, d = env.m, env.d
    d.qpos[env.qa] = q; d.ctrl[env.act_id] = q; env.cmd = q.copy(); [env.queue.append(q.copy()) for _ in range(2)]
    mujoco.mj_forward(m, d)
    for _ in range(5000): mujoco.mj_step(m, d)
    R = d.xmat[env.eb].reshape(3, 3); p = d.site_xpos[env.s_tip].copy(); nB = R[:, 1]; z = -nB
    o0 = p + (0.0063 + gap_mm / 1000) * nB; env._set_rx(o0, z, rot(z, math.radians(slot)) @ R[:, 0]); env.seat = o0 + 0.0063 * z; env.hover = env.seat + 0.02 * z; env.phase = 1
    log = []
    for k in range(45):
        o, r, te, tr, info = env.step(np.zeros(7)); log.append('%d:%.2f/%.0f%s' % (info['phase'], info['axial_mm'], info['lock_deg'], 'P' if env.pull else ''))
        if te: break
    print('gap %.1f slot %d ->' % (gap_mm, slot), ' '.join(log[::3]), '| end:', {k: info[k] for k in info if k in ('success', 'pull_fail', 'lock_jam')}, 'mag %.0f N' % info['mag_N'])
