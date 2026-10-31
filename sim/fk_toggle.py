from paths import tpath

import sys, numpy as np
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv
N=TetroDockEnv(seed=0, randomize=False)
g0=N.m.opt.gravity.copy(); m0=N.m.body_mass.copy(); i0=N.m.body_inertia.copy()
for i in [1,3,10,17,6,14]:
    E=TetroDockEnv(seed=1000+i, floor_frac=0.9, max_dist=0.30); E.reset(); q=E.qhist[-1][0]
    pe=E._fk(q)[0]
    def d():
        return 1000*np.linalg.norm(N._fk(q)[0]-pe)
    a=d()
    N.m.opt.gravity[:]=E.m.opt.gravity; b=d(); N.m.opt.gravity[:]=g0
    N.m.body_mass[:]=E.m.body_mass; N.m.body_inertia[:]=E.m.body_inertia; c=d(); N.m.body_mass[:]=m0; N.m.body_inertia[:]=i0
    diff=[k for k in ['jnt_stiffness','jnt_range','body_pos','body_quat','geom_pos','jnt_pos','qpos0','qpos_spring','body_ipos'] if not np.allclose(getattr(N.m,k),getattr(E.m,k))]
    tilt=np.degrees(np.arccos(-E.m.opt.gravity[2]/9.81))
    print('robot %2d: nominal-vs-own %.1f mm | fix gravity -> %.1f | fix masses -> %.1f | tilt %.2f deg | other model diffs %s' % (i,a,b,c,tilt,diff))
