from paths import tpath
import sys, time, numpy as np
sys.path.insert(0, tpath('sim'))
from tetro_env import TetroDockEnv
from gymnasium.utils.env_checker import check_env
e = TetroDockEnv(seed=1)

o, _ = e.reset(seed=2); print('obs', o.shape, np.round(o[:6], 3))
t = time.time(); n = 0; R = 0; ends = {}
for i in range(600):
    o, r, te, tr, info = e.step(e.action_space.sample()); n += 1; R += r
    if te or tr:
        k = 'success' if info['success'] else ('crash' if info.get('crash') else 'timeout'); ends[k] = ends.get(k, 0) + 1; e.reset()
dt = time.time() - t
print('steps/s one core: %.0f  random-policy reward/step %.2f  endings %s' % (n / dt, R / n, ends))
print('last info', {k: (round(v, 2) if isinstance(v, float) else v) for k, v in info.items()})
