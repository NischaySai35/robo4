from paths import tpath

import sys, time, math, numpy as np, mujoco
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv
env = TetroDockEnv(seed=3)
t0 = time.time(); n = 0; kinds = []
for ep in range(0):
    o, _ = env.reset(); kinds.append(env.kind)
    for i in range(60):
        o, r, te, tr, info = env.step(env.action_space.sample() * 0.3); n += 1
        if te or tr: break
if 0: print('obs', o.shape, 'steps/s single env %.0f' % (n / (time.time() - t0)), kinds, 'last', {k: (round(v, 2) if isinstance(v, float) else v) for k, v in info.items()})
# magnet capture test: freeze robot at a pose, place receiver so pad tips are X mm short of seated
for gap_mm in [10, 5, 3, 2, 1, 0.5]:
    env.randomize = False; env.reset(seed=1)
    m, d = env.m, env.d; env.phase = 1
    q = np.array([0, 0.6, 0.6, 0, 0.3, 0.2, 0]); d.qpos[env.qa] = q; d.ctrl[env.act_id] = q; env.cmd = q.copy(); env.queue.clear(); [env.queue.append(q.copy()) for _ in range(2)]
    mujoco.mj_forward(m, d)
    for _ in range(4000): mujoco.mj_step(m, d)
    R = d.xmat[env.eb].reshape(3, 3); p = d.site_xpos[env.s_tip].copy(); nB = R[:, 1]; z = -nB
    o0 = p + (0.0063 + gap_mm / 1000) * nB; env._set_rx(o0, z, rot(z, math.radians(45)) @ R[:, 0]) if False else None
    from tetro_env2 import rot
    env._set_rx(o0, z, rot(z, math.radians(45)) @ R[:, 0]); env.seat = o0 + 0.0063 * z; env.hover = env.seat + 0.02 * z
    for k in range(30): o, r, te, tr, info = env.step(np.zeros(7))
    print('start gap %4.1f mm -> axial %.2f mm radial %.2f mm slot %.2f deg tilt %.2f deg magnet force %.1f N  phase %d  success %s' % (gap_mm, info['axial_mm'], info['radial_mm'], info['slot_deg'], info['ang_deg'], info['mag_N'], info['phase'], info['success']))
