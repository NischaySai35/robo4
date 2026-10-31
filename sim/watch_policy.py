from paths import tpath
import os, sys, json, time, math
import numpy as np, mujoco, mujoco.viewer
sys.path.insert(0, tpath('sim'))
from tetro_env import TetroDockEnv, ACT
RUN = tpath('runs/dock_v1'); OUT = tpath('live.json')
env = TetroDockEnv(seed=777, max_dist=0.42, xml=tpath('sim/tetrobot_scene.xml')); m, d = env.m, env.d
model = None; vn = None; loaded_at = 0; ver = 0
def load():
    global model, vn, loaded_at, ver
    p = os.path.join(RUN, 'brain.npz')
    if not os.path.exists(p): return False
    if os.path.getmtime(p) <= loaded_at: return True
    try:
        z = np.load(p); n = len([k for k in z.files if k.startswith('W')])
        model = [(z['W%d' % i], z['b%d' % i]) for i in range(n)]; vn = (z['mean'], z['var'], int(z['steps'])); loaded_at = os.path.getmtime(p); ver += 1
    except Exception as e: print('load fail', e)
    return True
def act(obs):
    h = np.clip((obs - vn[0]) / np.sqrt(vn[1] + 1e-8), -10, 10)
    for i, (W, b) in enumerate(model):
        h = W @ h + b
        if i < len(model) - 1: h = np.where(h > 0, h, np.exp(np.minimum(h, 0)) - 1)
    return np.clip(h, -1, 1)
bodies = [m.body(i).name for i in range(m.nbody)]
JN = [m.actuator(i).name[2:] for i in range(m.nu)]
def dump(label):
    o = {'t': time.strftime('%H:%M:%S'), 'sim_time': round(d.time, 2), 'pose': label, 'target': [float(x) for x in env.contact],
         'joints': {JN[i]: round(math.degrees(d.qpos[m.jnt_qposadr[m.actuator_trnid[i][0]]]), 2) for i in range(m.nu)},
         'torque': {JN[i]: round(float(d.actuator_force[i]), 3) for i in range(m.nu)}, 'tau_max': 2.7,
         'bodies': {bodies[b]: {'p': [round(x, 4) for x in d.xpos[b]], 'q': [round(x, 5) for x in d.xquat[b]]} for b in range(2, m.nbody)},
         'tip': [round(x, 4) for x in d.body('L2_LockRotor_B').xpos]}
    tmp = OUT + '.tmp'
    with open(tmp, 'w') as fh: json.dump(o, fh)
    for _ in range(5):
        try: os.replace(tmp, OUT); break
        except PermissionError: time.sleep(0.02)
with mujoco.viewer.launch_passive(m, d) as v:
    v.cam.distance = 1.5; v.cam.elevation = -22; v.cam.azimuth = 130; v.cam.lookat[:] = [0.15, 0, 0.3]
    while v.is_running():
        if not load():
            time.sleep(2); v.sync(); continue
        obs, _ = env.reset(); done = False; t0 = time.time(); last = 0; result = 'running'
        while v.is_running() and not done:
            a = act(obs)
            ts = time.time()
            obs, r, te, tr, info = env.step(a); done = te or tr
            v.user_scn.ngeom = 2
            c = env.contact; nrm = env.normal
            mujoco.mjv_initGeom(v.user_scn.geoms[0], mujoco.mjtGeom.mjGEOM_SPHERE, np.array([0.008, 0, 0]), env.hover, np.eye(3).flatten(), np.array([1, 0.85, 0.2, 0.8], dtype=np.float32))
            mujoco.mjv_initGeom(v.user_scn.geoms[1], mujoco.mjtGeom.mjGEOM_ARROW, np.array([0.01, 0.01, 0.01]), np.zeros(3), np.eye(3).flatten(), np.array([0.2, 0.9, 1.0, 0.9], dtype=np.float32))
            mujoco.mjv_connector(v.user_scn.geoms[1], mujoco.mjtGeom.mjGEOM_ARROW, 0.006, c - nrm * 0.06, c)
            v.sync()
            if info.get('success'): result = 'DOCKED'
            elif info.get('crash'): result = 'crashed'
            label = 'Brain after %.1fM practice steps | %s target | %s | err %.1f mm, %.1f deg | %s' % (vn[2] / 1e6, env.kind, 'ALIGNING at hover' if env.phase == 0 else 'GOING STRAIGHT IN', info['err_mm'], info['ang_deg'], result)
            if time.time() - last > 0.2: dump(label); last = time.time()
            time.sleep(max(0, 0.05 - (time.time() - ts)))
        dump(label); time.sleep(1.5)
