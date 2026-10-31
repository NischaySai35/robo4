from paths import tpath
import os, sys, json, time, math
import numpy as np, mujoco, mujoco.viewer
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv, ACT, DT_CTRL
RUN = tpath('runs/dock_v4'); OUT = tpath('live.json')
env = TetroDockEnv(seed=777, max_dist=0.42, xml=tpath('sim/scene_v2.xml'), ik_assist=True); m, d = env.m, env.d
RXG = [m.geom('floor_receiver').id, m.geom('rx_visual').id]
# receiver mesh (as MuJoCo stores it, metres, geom frame) for the dashboard
mid = m.geom_dataid[RXG[0]]; va, vn_, fa, fn = m.mesh_vertadr[mid], m.mesh_vertnum[mid], m.mesh_faceadr[mid], m.mesh_facenum[mid]
json.dump({'v': np.round(m.mesh_vert[va:va + vn_], 6).ravel().tolist(), 'f': m.mesh_face[fa:fa + fn].ravel().tolist()}, open(tpath('dashboard/meshes/rx_mesh.json'), 'w'))
model = None; vn = None; loaded_at = 0
def load():
    global model, vn, loaded_at
    p = os.path.join(RUN, 'brain.npz')
    if not os.path.exists(p): return False
    if os.path.getmtime(p) <= loaded_at: return True
    try:
        z = np.load(p); n = len([k for k in z.files if k.startswith('W')])
        model = [(z['W%d' % i], z['b%d' % i]) for i in range(n)]; vn = (z['mean'], z['var'], int(z['steps'])); loaded_at = os.path.getmtime(p)
    except Exception as e: print('load fail', e)
    return True
def act(obs):
    h = np.clip((obs - vn[0]) / np.sqrt(vn[1] + 1e-8), -10, 10)
    for i, (W_, b) in enumerate(model):
        h = W_ @ h + b
        if i < len(model) - 1: h = np.where(h > 0, h, np.exp(np.minimum(h, 0)) - 1)
    return np.clip(h, -1, 1)
bodies = [m.body(i).name for i in range(m.nbody)]
JN = [m.actuator(i).name[2:] for i in range(m.nu)]
PH = ['ALIGN at standoff', 'STRAIGHT IN', 'SEATED - holding']
def gq(g):
    q = np.zeros(4); mujoco.mju_mat2Quat(q, d.geom_xmat[g]); return {'p': [round(float(x), 5) for x in d.geom_xpos[g]], 'q': [round(float(x), 6) for x in q]}
def dump(label, info):
    o = {'t': time.strftime('%H:%M:%S'), 'sim_time': round(d.time, 2), 'pose': label, 'target': [float(x) for x in env.seat], 'hover': [float(x) for x in env.hover],
         'rxg': [gq(g) for g in RXG], 'phase': env.phase, 'info': {k: (round(v, 2) if isinstance(v, float) else v) for k, v in info.items()},
         'joints': {JN[i]: round(math.degrees(d.qpos[m.jnt_qposadr[m.actuator_trnid[i][0]]]), 2) for i in range(m.nu)},
         'torque': {JN[i]: round(float(d.actuator_force[i]), 3) for i in range(m.nu)}, 'tau_max': 2.7,
         'bodies': {bodies[b]: {'p': [round(x, 4) for x in d.xpos[b]], 'q': [round(x, 5) for x in d.xquat[b]]} for b in range(2, m.nbody) if bodies[b] != 'target_rx'},
         'tip': [round(float(x), 4) for x in d.site('B_padtip').xpos]}
    tmp = OUT + '.tmp'
    with open(tmp, 'w') as fh: json.dump(o, fh)
    for _ in range(5):
        try: os.replace(tmp, OUT); break
        except PermissionError: time.sleep(0.02)
with mujoco.viewer.launch_passive(m, d) as v:
    v.cam.distance = 1.5; v.cam.elevation = -22; v.cam.azimuth = 130; v.cam.lookat[:] = [0.15, 0, 0.3]
    while v.is_running():
        if not load(): time.sleep(2); v.sync(); continue
        obs, _ = env.reset(); done = False; info = {}
        while v.is_running() and not done:
            ts = time.time(); obs, r, te, tr, info = env.step(act(obs)); done = te or tr
            v.user_scn.ngeom = 1
            mujoco.mjv_initGeom(v.user_scn.geoms[0], mujoco.mjtGeom.mjGEOM_SPHERE, np.array([0.005, 0, 0]), env.hover, np.eye(3).flatten(), np.array([1, 0.85, 0.2, 0.8], dtype=np.float32))
            v.sync()
            res = 'DOCKED' if info.get('success') else ('crash' if info.get('crash') else PH[min(env.phase, 2)])
            dump('brain @ %.1fM steps: %s target, %s | slot %.1f deg, gap %.1f mm, magnets %.0f N' % (vn[2] / 1e6, env.kind, res, info['slot_deg'], info['axial_mm'], info['mag_N']), info)
            time.sleep(max(0, DT_CTRL - (time.time() - ts)))   # real time
        t1 = time.time()
        while v.is_running() and time.time() - t1 < 1.0: v.sync(); time.sleep(0.05)
