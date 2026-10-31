from paths import tpath

import time, numpy as np, mujoco, warp as wp, mujoco_warp as mjw, traceback
log=open(tpath('logs/gpu_bench2.log'),'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
try:
    m = mujoco.MjModel.from_xml_path(tpath('sim/train_v2.xml'))
    off=0
    for i in range(m.ngeom):
        n=m.geom(i).name
        if m.geom_contype[i]==1 and m.geom_conaffinity[i]==2: m.geom_conaffinity[i]=3
        if n.startswith('B_pad') or n.startswith('rx_pad') or n.startswith('B_arm'):   # simplified connectors for the speed test
            m.geom_contype[i]=0; m.geom_conaffinity[i]=0; off+=1
    m.opt.cone = mujoco.mjtCone.mjCONE_PYRAMIDAL
    m.opt.ccd_iterations = 12
    d = mujoco.MjData(m); mujoco.mj_forward(m, d)
    P('connector pieces switched off for speed test:', off, '| nv', m.nv)
    wp.init(); mm = mjw.put_model(m)
    for nworld in [1024, 2048, 4096]:
        t0=time.time()
        dd = mjw.put_data(m, d, nworld=nworld, nconmax=16, njmax=120, naccdmax=nworld*4)
        mjw.step(mm, dd); wp.synchronize()
        with wp.ScopedCapture() as cap:
            mjw.step(mm, dd)
        g=cap.graph; wp.capture_launch(g); wp.synchronize()
        t=time.time(); N=300
        for _ in range(N): wp.capture_launch(g)
        wp.synchronize(); dt=time.time()-t
        P('   max contacts in a world', int(dd.nacon.numpy()[0]) if hasattr(dd,'nacon') else '?')
        P('nworld %5d: %8.0f physics steps/s -> %6.0f practice steps/s (setup %.0f s)' % (nworld, nworld*N/dt, nworld*N/dt/60, t-t0))
        del dd
except Exception as e:
    P('ERROR', repr(e)[:400]); P(traceback.format_exc()[-1200:])
P('DONE')
