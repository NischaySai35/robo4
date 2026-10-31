"""sag_data.py — data for a LEARNED correction of the docking brain's position estimate.
A random robot (phys_world, disturbances on) stands with End A locked in a floor receiver and holds random poses
(bends <= 75 deg, the dock rule). For each pose: what the BRAIN thinks its free end is (laptop_controller NOM._fk with
its sag model, in controller coords) vs where it REALLY is (physics). Output: one .npz per worker.
   py -3.12 sag_data.py SEED N_POSES OUT.npz"""
from paths import tpath
import sys, io, math, time, contextlib, numpy as np, mujoco
sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
from phys_world import PhysWorld
from phys_dock import PhysDockEnv, _base_slot
from build_walk import R2q
with contextlib.redirect_stdout(io.StringIO()):
    import walk as WK
L = WK.L
seed, n, out = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
rng = np.random.default_rng(seed + 777)
w = PhysWorld(['M1'], [dict(id='F0', x=0.0, z=0.0, yawDeg=45.0)], randomize=True, seed=seed,
              locks=[{'a': {'floor': 'F0'}, 'b': {'module': 'M1', 'port': 'A'}}])
m, d = w.m, w.d; mujoco.mj_resetData(m, d); mujoco.mj_forward(m, d); w._refresh_rx()
RX = next(x for x in w.rx if x['name'] == 'F:F0'); R = d.xmat[RX['bid']].reshape(3, 3)
yaw = math.radians(45 + 90 * int(rng.integers(4)));   # a REAL slot (pads in gaps), as shape_build seats modules - a random angle is not physically possible
x = R @ np.array([math.cos(yaw), math.sin(yaw), 0]); y = RX['z']; z = np.cross(x, y); Rt = np.stack([x, y, z], 1)
pA = m.body('M1_EndA_LockModule').pos; pa = m.site('M1_A_padtip').pos; a = w.mod['M1']['root']
d.qpos[a:a + 3] = RX['seat'] - Rt @ (pA + pa); d.qpos[a + 3:a + 7] = R2q(Rt); mujoco.mj_forward(m, d)
lk = {'a': {'floor': 'F0'}, 'b': {'module': 'M1', 'port': 'A'}}
w.set_locks([lk], snap=True); w.sp[:] = w.tgt; d.ctrl[w.all_act] = w.sp; mujoco.mj_forward(m, d); w.engage(lk)
w.run(0.5)
env = PhysDockEnv(w, 'M1', seed=seed, randomize=False); j = env.index('F:F0')
X, Y, E0 = [], [], []
t0 = time.time()
for k in range(n):
    if k == 0 and len(sys.argv) > 4: q = np.zeros(7)
    if not (k == 0 and len(sys.argv) > 4): q = np.radians(np.r_[rng.uniform(-150, 150), rng.uniform(-75, 75, 2), rng.uniform(-150, 150), rng.uniform(-75, 75, 2), rng.uniform(-150, 150)])
    w.tgt[0:7] = q; w.run(1.2)
    if not np.isfinite(d.qpos).all(): break
    if min(d.xpos[b][2] for b in env.links) < 0.03: continue          # lying on the floor: not a pose a dock uses
    if np.degrees(np.abs(d.qpos[env.qa] - q)).max() > 5: continue     # servos could not hold it there: not a pose a dock uses
    if d.site_xpos[env.end['B']['tip']][2] < 0.05: continue           # free end resting on the floor (seen in sag_view.png): the floor carries it
    W = WK.Walker(env, 'A', j, 0, m.opt.gravity.copy(), log=lambda *a: None); W.k = _base_slot(env, 'A', j, W)
    M = W.M(); g_c = M[:3, :3] @ m.opt.gravity; L.NOM.m.opt.gravity[:] = g_c
    qm = d.qpos[env.qa].copy(); pn, nn, xn = L.NOM._fk(W.nq(qm))
    true = (M @ np.r_[d.site_xpos[env.end['B']['tip']], 1.0])[:3]
    X.append(np.r_[np.sin(qm), np.cos(qm), g_c / 9.81]); Y.append(true - pn)
    if len(X) % 10 == 0: np.savez(out, X=np.array(X), Y=np.array(Y))          # save as we go (a cut-off run keeps its data)
np.savez(out, X=np.array(X), Y=np.array(Y))
print(f'seed {seed}: {len(X)} poses in {time.time() - t0:.0f} s, brain estimate error mean {np.linalg.norm(np.array(Y), axis=1).mean() * 1000:.1f} mm')
