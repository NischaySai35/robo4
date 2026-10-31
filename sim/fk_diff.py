from paths import tpath

import sys, numpy as np, inspect
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv
N=TetroDockEnv(seed=0, randomize=False); E=TetroDockEnv(seed=321, floor_frac=0.9, max_dist=0.30)
src=inspect.getsource(TetroDockEnv._fk); print(src[:2500])
for ep in range(6):
    E.reset(); q=E.qhist[-1][0]
    pn,nn,xn=N._fk(q); pe,ne,xe=E._fk(q)
    true=E.d.xpos[E.eb].copy() if hasattr(E,'eb') else None
    print('ep',ep,'base_xy env',np.round(E.base_xy,4),'nom',np.round(N.base_xy,4),'| nominal-vs-env FK tip diff %.1f mm' % (1000*np.linalg.norm(pn-pe)), '| bias_p %.1f mm' % (1000*np.linalg.norm(E.bias_p)))
