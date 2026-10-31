from paths import tpath

import time, numpy as np, mujoco, warp as wp, mujoco_warp as mjw, traceback
log=open(tpath('logs/gpu_bench.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
try:
    m = mujoco.MjModel.from_xml_path(tpath('sim/train_v2.xml'))
    for i in range(m.ngeom):
        if m.geom_contype[i]==1 and m.geom_conaffinity[i]==2: m.geom_conaffinity[i]=3
    d = mujoco.MjData(m); mujoco.mj_forward(m, d)
    P('model', m.nq, 'qpos', m.ngeom, 'geoms', m.nmesh, 'meshes')
    wp.init()
    mm = mjw.put_model(m)
    for nworld in [64, 256, 1024]:
        wp.synchronize(); P('trying', nworld)
        dd = mjw.put_data(m, d, nworld=nworld, nconmax=nworld*24, njmax=nworld*120)
        mjw.step(mm, dd); wp.synchronize()
        t=time.time(); N=200
        for _ in range(N): mjw.step(mm, dd)
        wp.synchronize(); dt=time.time()-t
        P('nworld %5d: %.0f physics steps/s total -> %.0f policy steps/s (60 substeps)' % (nworld, nworld*N/dt, nworld*N/dt/60))
except Exception as e:
    P('ERROR', repr(e)); P(traceback.format_exc()[-1500:])
