from paths import tpath
import json, math, os, sys, time
import numpy as np, mujoco, mujoco.viewer
sys.path.insert(0, tpath('sim'))
import status as S
m = mujoco.MjModel.from_xml_path(tpath('sim/tetrobot_scene.xml')); d = mujoco.MjData(m)
JN = [m.actuator(i).name[2:] for i in range(m.nu)]
idx = {n: i for i, n in enumerate(JN)}
SHOW = tpath('showcase.json')
def load_poses():
    try: return json.load(open(SHOW))
    except Exception: return [{'label': 'Standing straight', 'joints': {}}]
def target(p):
    t = np.zeros(m.nu)
    for kk, v in p.items(): t[idx[kk.replace('J_', '', 1)]] = math.radians(v)
    return t
OUT = tpath('live.json')
bodies = [m.body(i).name for i in range(m.nbody)]
def dump(label, tgt_pt):
    o = {'t': time.strftime('%H:%M:%S'), 'sim_time': round(d.time, 2), 'pose': label, 'target': tgt_pt,
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
    v.cam.distance = 1.5; v.cam.elevation = -20; v.cam.azimuth = 120; v.cam.lookat[:] = [0.2, 0, 0.3]
    cur = np.zeros(m.nu); k = 0; last = 0
    while v.is_running():
        P = load_poses(); e = P[k % len(P)]; label = e['label']; tgt = target(e['joints']); tp = e.get('target')
        v.user_scn.ngeom = 0
        if tp:
            mujoco.mjv_initGeom(v.user_scn.geoms[0], mujoco.mjtGeom.mjGEOM_CYLINDER, np.array([0.038, 0.038, 0.01]), np.array([tp[0], tp[1], 0.01]), np.eye(3).flatten(), np.array([0.2, 0.9, 1.0, 0.85], dtype=np.float32))
            v.user_scn.ngeom = 1
        start = cur.copy(); t0 = time.time(); hold = e.get('hold', 4.0); move = e.get('move', 3.5)
        while v.is_running() and time.time() - t0 < move + hold:
            u = min(1.0, (time.time() - t0) / move); u = u * u * (3 - 2 * u)
            d.ctrl[:] = start + (tgt - start) * u
            pz = e.get('push'); el = time.time() - t0
            d.xfrc_applied[:] = 0
            if pz and move + 0.5 < el < move + 2.0:
                d.xfrc_applied[m.body('L2_LockRotor_B').id, :3] = pz
                v.user_scn.ngeom = 1
                tp3 = d.body('L2_LockRotor_B').xpos
                mujoco.mjv_initGeom(v.user_scn.geoms[0], mujoco.mjtGeom.mjGEOM_ARROW, np.array([0.006, 0.006, 0.12]), np.zeros(3), np.eye(3).flatten(), np.array([1.0, 0.3, 0.3, 1], dtype=np.float32))
                mujoco.mjv_connector(v.user_scn.geoms[0], mujoco.mjtGeom.mjGEOM_ARROW, 0.006, tp3 - 0.12 * np.array(pz) / np.linalg.norm(pz), tp3)
            elif pz:
                v.user_scn.ngeom = 0
            ts = time.time()
            for _ in range(8): mujoco.mj_step(m, d)
            v.sync()
            if time.time() - last > 0.2: dump(label, tp); last = time.time()
            time.sleep(max(0.0, 1 / 60 - (time.time() - ts)))
        cur = tgt; k += 1
