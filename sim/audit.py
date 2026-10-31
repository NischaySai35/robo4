from paths import tpath

import mujoco, numpy as np
m=mujoco.MjModel.from_xml_path(tpath('sim/train_v2.xml'))
from collections import Counter
print('timestep', m.opt.timestep, 'ngeom', m.ngeom)
c=Counter((m.body(m.geom_bodyid[i]).name, int(m.geom_contype[i]), int(m.geom_conaffinity[i])) for i in range(m.ngeom))
for k,v in sorted(c.items()): print(k, v)
print('exclude pairs', m.nexclude, 'disableflags', m.opt.disableflags, 'filterparent', not (m.opt.disableflags & mujoco.mjtDisableBit.mjDSBL_FILTERPARENT))
