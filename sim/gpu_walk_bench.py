"""Feasibility check: can MuJoCo Warp step the WALKING model (free module, 2 locks, 8 receivers) for many robots at once, fast?"""
from paths import tpath
import sys, time, math, numpy as np, mujoco, warp as wp, mujoco_warp as mjw
sys.path.insert(0, tpath('sim'))
import walk_env as W
N = int(sys.argv[1]) if len(sys.argv) > 1 else 256
e = W.WalkEnv(seed=0, randomize=False, xml=tpath('sim/walk_long.xml')); e.reset(base='A', base_rx=0)
m = e.m; m.opt.integrator = mujoco.mjtIntegrator.mjINT_IMPLICITFAST
print('noslip iterations in the CPU model:', m.opt.noslip_iterations, '-> 0 for the GPU (not supported there)'); m.opt.noslip_iterations = 0
print('model: nq %d nv %d ngeom %d nbody %d, CPU contacts now %d' % (m.nq, m.nv, m.ngeom, m.nbody, e.d.ncon))
wp.init()
mm = mjw.put_model(m)
d = mjw.put_data(m, e.d, nworld=N, nconmax=200, njmax=800, naccdmax=N * 64)   # per world (same style as tetro_gpu)
with wp.ScopedCapture() as c: mjw.step(mm, d)
g = c.graph
for _ in range(10): wp.capture_launch(g)
wp.synchronize(); t0 = time.time(); S = 600
for _ in range(S): wp.capture_launch(g)
wp.synchronize(); dt = time.time() - t0
qp = wp.to_torch(d.qpos); nc = wp.to_torch(d.nacon) if hasattr(d, 'nacon') else None
print('N=%d: %d steps (1 ms each) in %.2f s -> %.0f robot-sim-seconds per wall second (CPU single robot ~0.9)' % (N, S, dt, N * S * 0.001 / dt))
print('finite:', bool(qp.isfinite().all()), ' contacts total:', int(nc[0]) if nc is not None else '?', ' base z spread mm: %.2f' % float((qp[:, 2].max() - qp[:, 2].min()) * 1000))
