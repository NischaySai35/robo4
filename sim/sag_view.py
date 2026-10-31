"""sag_view.py — LOOK at the brain's estimate: green ball = where End B really is (physics), red = where the brain thinks
it is (its own model, mapped back to the world). Same robot and poses as sag_data.py.   py -3.12 sag_view.py SEED N"""
from paths import tpath
import sys, io, math, contextlib, numpy as np, mujoco
sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
from PIL import Image, ImageDraw
exec(open(tpath('sim/sag_data.py')).read().split('X, Y, E0 = [], [], []')[0].replace("seed, n, out = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]", "seed, n, out = int(sys.argv[1]), int(sys.argv[2]), None"))
for g in range(m.ngeom):
    if m.geom_group[g] == 2: m.geom_rgba[g] = [0.75, 0.75, 0.72, 1]
R_ = mujoco.Renderer(m, 360, 360); opt = mujoco.MjvOption(); opt.geomgroup[:] = 0; opt.geomgroup[2] = 1; opt.geomgroup[3] = 1
def ball(scn, p, rgba):
    g = scn.geoms[scn.ngeom]; mujoco.mjv_initGeom(g, mujoco.mjtGeom.mjGEOM_SPHERE, np.array([0.012, 0, 0]), p, np.eye(3).flatten(), np.array(rgba, np.float32)); scn.ngeom += 1
tiles = []
for k in range(n):
    q = np.radians(np.r_[rng.uniform(-150, 150), rng.uniform(-75, 75, 2), rng.uniform(-150, 150), rng.uniform(-75, 75, 2), rng.uniform(-150, 150)])
    w.tgt[0:7] = q; w.run(1.2)
    held = np.degrees(np.abs(d.qpos[env.qa] - q)).max()
    if held > 5 or d.site_xpos[env.end['B']['tip']][2] < 0.05 or min(d.xpos[b][2] for b in env.links) < 0.03: continue   # the same filters as sag_data.py
    W = WK.Walker(env, 'A', j, 0, m.opt.gravity.copy(), log=lambda *a: None); W.k = _base_slot(env, 'A', j, W)
    M = W.M(); L.NOM.m.opt.gravity[:] = M[:3, :3] @ m.opt.gravity
    qm = d.qpos[env.qa].copy(); pn, nn, xn = L.NOM._fk(W.nq(qm)); est_w = (np.linalg.inv(M) @ np.r_[pn, 1.0])[:3]
    tru_w = d.site_xpos[env.end['B']['tip']].copy(); err = np.linalg.norm(est_w - tru_w) * 1000
    for az in (45, 135):
        c = mujoco.MjvCamera(); c.type = mujoco.mjtCamera.mjCAMERA_FREE; c.lookat[:] = [0, 0, 0.3]; c.azimuth, c.elevation, c.distance = az, -20, 1.4
        R_.update_scene(d, c, opt); ball(R_.scene, tru_w, [0.1, 0.9, 0.2, 1]); ball(R_.scene, est_w, [0.95, 0.1, 0.1, 1])
        tiles.append((Image.fromarray(R_.render()), f'pose {k}: brain off by {err:.0f} mm, joints held within {held:.1f} deg'))
    print(f'pose {k}: joints deg {np.round(np.degrees(qm)).astype(int)} | held {held:.1f} | error {err:.0f} mm')
im = Image.new('RGB', (720, 386 * max(1, len(tiles) // 2)), 'white')
for i, (t, lab) in enumerate(tiles): im.paste(t, ((i % 2) * 360, (i // 2) * 386 + 26)); ImageDraw.Draw(im).text(((i % 2) * 360 + 6, (i // 2) * 386 + 6), lab, fill='black')
im.save(tpath('logs/snaps/sag_view.png')); print('saved')
