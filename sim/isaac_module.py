"""isaac_module.py — TETROBOT modules on Nischay's real printed shapes in Isaac Sim 6.2 + Newton (MuJoCo solver): exact-mesh contact,
gravity, a floor, the real robot's give, the connector magnets. Bodies, masses, inertias, joints, gearbox inertia, damping, friction,
servo gains, PLA flex, gear play and magnet positions all come from the MuJoCo model (multi_train.xml, module 1), so the two sims
start identical; only the shapes differ (MuJoCo: boxes, here: the STLs).

Library (used by the docking runs):
  spec = read_module()                       the module as the MuJoCo model has it (plain mujoco: before Isaac starts)
  pose = module_poses(spec, pos, quat)       every part's world pose for a module frame at pos/quat (wxyz)
  m = add_module(W, spec, 'M1', pose, real)  bodies + joints (+ flex) into an isaac_newton.World; returns paths, servo joints, connectors
Test (python isaac_module.py [--gui]): one module lying flat, servos hold -> settle; bend LIFT_JOINT to LIFT_DEG; hold.
Checks per phase: servo load vs the 2.7 N.m cap, joint error, floor contact, part-on-part contact that is not a joint.
   env LIFT_JOINT (J_B4_bend) LIFT_DEG (60) VOXEL_MM (1.0) SOLVER (mujoco) REAL (1) TAG
"""
# REUSE-CHECKED: isaac|newton|module|exact shape -> isaac_newton.py (shared world/servos/magnets, used here), isaac_lock_test.py (lock
# rig only); tools/bench/newton_module.py runs the module in Newton WITHOUT Isaac on the MuJoCo boxes. Port names = phys_world.SPINE_RX.
import os, sys, math, time, json
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
SERVO_JOINTS = ['J_L1_lock', 'J_T1_twist', 'J_B1_bend', 'J_B2_bend', 'J_T2_twist', 'J_B3_bend', 'J_B4_bend', 'J_T3_twist', 'J_L2_lock']
PARTS = ['EndA_LockModule', 'L1_LockRotor_A', 'T1_Housing_B1Fork', 'Spine1_B1B2', 'T2_Housing_B2Fork_GROUND', 'T2_Ring_B3Fork',
         'Spine2_B3B4', 'T3_Housing_B4Fork', 'EndB_LockModule', 'L2_LockRotor_B']
ROOT = 'EndA_LockModule'
COLORS = {'Spine': (0.25, 0.65, 0.3), 'LockRotor': (1.0, 0.55, 0.05), 'LockModule': (0.85, 0.2, 0.2), 'Housing': (0.85, 0.85, 0.82), 'Ring': (0.6, 0.62, 0.7)}


def _q_mul(a, b):
    w1, x1, y1, z1 = a; w2, x2, y2, z2 = b
    return np.array([w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2, w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
                     w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2, w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2])


def _q_rot(q, v):
    return _q_mul(_q_mul(q, [0, *v]), [q[0], -q[1], -q[2], -q[3]])[1:]


def read_module(xml=os.path.join(HERE, 'multi_train.xml')):
    """the module from the MuJoCo model: parts (pose in parent, mass, inertia), servo joints with the real give, connectors' magnets"""
    import mujoco
    from phys_world import SPINE_RX, END_PAD
    from tetro_env2 import RX_GAP
    M = mujoco.MjModel.from_xml_path(xml); O = mujoco.mjtObj
    BODY = {}
    for n in PARTS:
        b = M.body(n).id; pn = mujoco.mj_id2name(M, O.mjOBJ_BODY, M.body_parentid[b])
        js = [j for j in range(M.njnt) if M.jnt_bodyid[j] == b and mujoco.mj_id2name(M, O.mjOBJ_JOINT, j) in SERVO_JOINTS]
        BODY[n] = dict(parent=pn if pn in PARTS else None, pos=M.body_pos[b].copy(), quat=M.body_quat[b].copy(), mass=float(M.body_mass[b]),
                       com=M.body_ipos[b].copy(), inertia=M.body_inertia[b].copy(), principal=M.body_iquat[b].copy(), joint=None)
        if not js: continue
        j = js[0]; d = M.jnt_dofadr[j]
        J = BODY[n]['joint'] = dict(name=mujoco.mj_id2name(M, O.mjOBJ_JOINT, j), axis=M.jnt_axis[j].copy(), range=M.jnt_range[j].copy(),
                                    armature=float(M.dof_armature[d]), damping=float(M.dof_damping[d]), friction=float(M.dof_frictionloss[d]),
                                    bl=0.0, kser=0.0, flex=[])
        # the real robot's give, exactly as the MuJoCo sim stacks it on this body: gear play (*_bl) and PLA flex (*_flex*). About the
        # servo's own axis they become servo parameters (Newton cannot stack two hinges about one axis); about other axes, real joints
        for jj in range(M.njnt):
            nm = mujoco.mj_id2name(M, O.mjOBJ_JOINT, jj)
            if M.jnt_bodyid[jj] != b or jj == j or not (nm.endswith('_bl') or '_flex' in nm): continue
            if nm.endswith('_bl'): J['bl'] = float(M.jnt_range[jj][1])
            elif np.allclose(np.abs(M.jnt_axis[jj]), np.abs(M.jnt_axis[j])): J['kser'] = float(M.jnt_stiffness[jj])
            else:
                dd = M.jnt_dofadr[jj]
                J['flex'].append(dict(name=nm, axis=M.jnt_axis[jj].copy(), range=M.jnt_range[jj].copy(), k=float(M.jnt_stiffness[jj]),
                                      damping=float(M.dof_damping[dd]), armature=float(M.dof_armature[dd]), solref=M.jnt_solref[jj].copy()))
    # connectors: the two ends (magnets + pad tip on the End parts; face = the part's +y for B, -y for A) and the four side sockets
    # (fixed sub-bodies srx0..3 of the spines: magnets and face turned into the spine's frame)
    CONN = []
    site = lambda nm: M.site_pos[M.site(nm).id].copy()
    for e in 'AB':
        n = f'End{e}_LockModule'; zl = np.array([0, 1.0 if e == 'B' else -1.0, 0]); tip = site(f'{e}_padtip')
        CONN.append(dict(name=e, part=n, kind='end', mags=np.array([site(f'{e}_mag{k}') for k in range(8)]), z=zl, tip=tip, seat=tip - END_PAD * zl))
    for port, sn in SPINE_RX.items():
        b = M.body(sn).id; part = mujoco.mj_id2name(M, O.mjOBJ_BODY, M.body_parentid[b]); p0, q0 = M.body_pos[b].copy(), M.body_quat[b].copy()
        z = _q_rot(q0, [0, 0, 1.0])
        CONN.append(dict(name=port, part=part, kind='side', mags=np.array([p0 + _q_rot(q0, site(f'{sn}_r0_rx_mag{k}')) for k in range(8)]),
                         z=z, seat=p0 + RX_GAP * z))
    a0 = next(a for a in range(M.nu) if mujoco.mj_id2name(M, O.mjOBJ_ACTUATOR, a) == 'm_T1_twist')
    frame = M.body('module_frame').id
    return dict(BODY=BODY, CONN=CONN, KP=float(M.actuator_gainprm[a0][0]), KV=float(-M.actuator_biasprm[a0][2]), CAP=float(M.actuator_forcerange[a0][1]),
                root_in_frame=(M.body_pos[M.body(ROOT).id].copy(), M.body_quat[M.body(ROOT).id].copy()))


def module_poses(spec, pos, quat, angles=None):
    """world pose of every part when the module frame (MuJoCo's module_frame) sits at pos/quat (wxyz); angles = {joint: rad} (else 0)"""
    B = spec['BODY']; rp, rq = spec['root_in_frame']; pose = {ROOT: (np.asarray(pos, float) + _q_rot(quat, rp), _q_mul(quat, rq))}
    for n in PARTS[1:]:
        pp, pq = pose[B[n]['parent']]; J = B[n]['joint']; a = (angles or {}).get(J['name'], 0.0)
        qj = np.array([math.cos(a / 2), *(math.sin(a / 2) * J['axis'])])
        pose[n] = (pp + _q_rot(pq, B[n]['pos']), _q_mul(_q_mul(pq, B[n]['quat']), qj))
    return pose


def lowest_z(pose, step=7):
    """the lowest point of the module's real meshes at these poses (m)"""
    import trimesh
    from isaac_newton import MESHES, OFFSETS
    z = 1e9
    for n in PARTS:
        tm = trimesh.load(os.path.join(MESHES, n + '.stl'), force='mesh'); v = np.asarray(tm.vertices)[::step] * 0.001 - np.array(OFFSETS[n])
        z = min(z, float(min(_q_rot(pose[n][1], p)[2] for p in v) + pose[n][0][2]))
    return z


def add_module(W, spec, mid, pose, real=True):
    """one module into the World under /World/<mid>. Returns dict(paths [per PARTS], joints [(name, parent idx, child idx, axis, rest
    quat)] with LOCAL part indices, params {joint: dict(bl, kser)}, conns [CONN + local body index], adj {(part, parent)})"""
    from pxr import UsdGeom, UsdPhysics
    B = spec['BODY']; root = f'/World/{mid}'
    UsdGeom.Xform.Define(W.st, root); UsdPhysics.ArticulationRootAPI.Apply(W.st.GetPrimAtPath(root))
    path = [f'{root}/{n}' for n in PARTS]
    for i, n in enumerate(PARTS):
        W.part(path[i], n, pose[n][0], pose[n][1], next((c for k, c in COLORS.items() if k in n), (0.9, 0.9, 0.9)))
        W.mass(path[i], B[n]['mass'], B[n]['com'], B[n]['inertia'], B[n]['principal'])
    joints, params = [], {}
    for i, n in enumerate(PARTS[1:], 1):
        J = B[n]['joint']; ip = PARTS.index(B[n]['parent']); ax = 'XYZ'[int(np.argmax(np.abs(J['axis'])))]
        W.revolute(f'{root}/{J["name"]}', path[ip], path[i], B[n]['pos'], B[n]['quat'], ax, *np.degrees(J['range']),
                   armature=J['armature'], damping=J['damping'], friction=J['friction'])
        if real:
            for f in J['flex']:                                                   # the bracket's sideways give: springs, +-3 deg
                W.revolute(f'{root}/{f["name"]}', path[ip], path[i], B[n]['pos'], B[n]['quat'], 'XYZ'[int(np.argmax(np.abs(f['axis'])))],
                           *np.degrees(f['range']), armature=f['armature'], damping=f['damping'], stiffness=f['k'], solreflimit=f['solref'])
            params[J['name']] = dict(bl=J['bl'], kser=J['kser'])
        W.no_collide(path[i], path[ip])                                           # a joint's two parts touch by design (fork around housing, rotor in its end)
        joints.append((J['name'], ip, i, J['axis'], B[n]['quat']))
    conns = [dict(c, module=mid, body=PARTS.index(c['part']), name=f'{mid}.{c["name"]}') for c in spec['CONN']]
    adj = {tuple(sorted((n, B[n]['parent']))) for n in PARTS[1:]}
    return dict(paths=path, joints=joints, params=params if real else None, conns=conns, adj=adj, com=[B[n]['com'] for n in PARTS])


if __name__ == '__main__':
    GUI = '--gui' in sys.argv
    LIFT_JOINT = os.environ.get('LIFT_JOINT', 'J_B4_bend'); LIFT_DEG = float(os.environ.get('LIFT_DEG', '60'))
    VOXEL = float(os.environ.get('VOXEL_MM', '1.0')) / 1000; SOLVER = os.environ.get('SOLVER', 'mujoco'); HZ = float(os.environ.get('HZ', '1000'))
    REAL = os.environ.get('REAL', '1') == '1'      # 1 = the real robot's give (flex, gear play, servo speed / sag / deadband); 0 = ideal rigid
    TAG = os.environ.get('TAG', f'module_{LIFT_JOINT}_{LIFT_DEG:g}' + ('' if REAL else '_ideal'))
    SHOTS = os.environ.get('SHOTS', os.path.join(HERE, '..', 'data', 'logs', 'isaac_module'))
    REC_HZ = float(os.environ.get('REC_HZ', '125'))
    spec = read_module()
    from isaac_newton import World, Servos
    W = World(gui=GUI, hz=HZ, solver=SOLVER, voxel=VOXEL, gravity=9.81)
    pose = module_poses(spec, [0, 0, 0], [1.0, 0, 0, 0])                          # lying flat: module frame = world axes (body z up)
    dz = 0.0005 - lowest_z(pose); pose = {n: (p + [0, 0, dz], q) for n, (p, q) in pose.items()}   # resting 0.5 mm above the floor
    W.floor()
    mod = add_module(W, spec, 'M1', pose, REAL); path = mod['paths']
    print('servo model: kp %.0f kv %.1f cap %.2f N.m | give per joint (play deg / in-line flex N.m/rad / sideways flex joints): ' % (spec['KP'], spec['KV'], spec['CAP'])
          + ', '.join(f"{J['name'][2:]} {math.degrees(J['bl']):.1f}/{J['kser']:.0f}/{len(J['flex'])}" for J in (spec['BODY'][n]['joint'] for n in PARTS[1:])), flush=True)
    mid = np.mean([pose[n][0] for n in PARTS], axis=0)
    W.view(mid + [0.80, -0.35, 0.40], mid + [0, 0.03, 0.04])                      # the whole ~0.6 m module + the lifted end
    W.snapshots([(mid + [0.0, -0.02, 1.3], mid, [0, 1, 0]), (mid + [1.2, 0.0, 0.25], mid + [0, 0, 0.05], [0, 0, 1])], focal=30)
    t0 = time.time(); W.play()
    rb = W.rigid(path)
    S = Servos(rb, mod['joints'], kp=spec['KP'], kv=spec['KV'], cap=spec['CAP'], real=REAL, hz=HZ, params=mod['params'])
    print(f'started in {time.time() - t0:.1f} s', flush=True)
    if os.environ.get('JOINT_DEBUG'): print('NEWTON JOINTS', json.dumps(W.model_joints()), flush=True)
    for _ in range(20): W.app.update()                                            # renderer warm-up (physics steps too)
    os.makedirs(SHOTS, exist_ok=True); W.snap(os.path.join(SHOTS, f'{TAG}_start.png'), f'{TAG} start')

    def report(phase, z0):
        P, Q = rb.get_world_poses(); P = P.numpy(); Q = Q.numpy(); V = rb.get_velocities()[0].numpy()
        q = S.angles(Q); err = {k: math.degrees(S.target[k] - v) for k, v in q.items()}
        c = W.contacts({path[i]: (P[i], Q[i]) for i in range(len(PARTS))})
        self_c = {k: v for k, v in c.items() if 'Floor' not in k and tuple(sorted(k)) not in mod['adj']}
        floor_parts = sorted({b for k in c for b in k if 'Floor' in k and b != 'Floor'})
        worst = max(err, key=lambda k: abs(err[k]))
        print(f'PHASE {phase:10s} t {W.time():5.2f} s | worst joint error {worst} {err[worst]:+.2f} deg | peak torque '
              + ', '.join(f'{k[2:]} {v:.2f}' for k, v in S.peak.items() if v > 0.05) + f' N.m (cap {spec["CAP"]})', flush=True)
        print(f'   angles ' + ', '.join(f'{k[2:]} {math.degrees(v):+.1f}' for k, v in q.items()) + f' | max speed {np.abs(V).max() * 1000:.1f} mm/s'
              f' | lowest body origin z {P[:, 2].min() * 1000:.1f} mm (start {z0 * 1000:.1f})', flush=True)
        print(f'   on the floor: {floor_parts} | part-on-part (not joints): {self_c if self_c else "none"}', flush=True)
        W.snap(os.path.join(SHOTS, f'{TAG}_{phase}.png'), f'{TAG} {phase}')
        return dict(err=err, peak=dict(S.peak), self_contacts=self_c, floor=floor_parts, angles={k: math.degrees(v) for k, v in q.items()})

    z0 = rb.get_world_poses()[0].numpy()[:, 2].min(); n_ = 0; res = {}; start_deg = 0.0
    for name, dur, tgt in [('settle', 1.0, None), ('lift', 1.5, LIFT_DEG), ('hold', 1.0, LIFT_DEG)]:
        S.peak = {k: 0.0 for k in S.peak}; N = int(dur * HZ); tail = {k: [] for k in S.tau}   # last 0.5 s: mean = load, spread = jitter
        for i in range(N):
            if tgt is not None: S.target[LIFT_JOINT] = math.radians(start_deg + (tgt - start_deg) * min(1.0, (i + 1) / N) if name == 'lift' else tgt)
            S.apply(); W.step(1); n_ += 1
            if i >= N - int(0.5 * HZ):
                for k, v in S.tau.items(): tail[k].append(v)
            if n_ % max(1, int(HZ / REC_HZ)) == 0: W.record(rb, name)
        print(f'LOAD {name:8s} last 0.5 s mean (std) N.m: ' + ', '.join(f'{k[2:]} {np.mean(v):+.3f} ({np.std(v):.3f})' for k, v in tail.items() if np.abs(v).max() > 0.02), flush=True)
        res[name] = report(name, z0)
        if name == 'lift': start_deg = LIFT_DEG
    ok_hold = all(abs(e) < 3.0 for e in res['settle']['err'].values()) and abs(res['hold']['err'][LIFT_JOINT]) < 3.0
    ok_torque = all(v < spec['CAP'] - 1e-3 for v in res['hold']['peak'].values())
    ok_parts = not res['hold']['self_contacts'] and not res['settle']['self_contacts']
    print(f'RESULT {TAG}: holds pose {"YES" if ok_hold else "NO"} | {LIFT_JOINT} reached {res["hold"]["angles"][LIFT_JOINT]:+.1f} of {LIFT_DEG:+.0f} deg'
          f' | servos under the cap {"YES" if ok_torque else "NO (saturated)"} | no part-on-part contact {"YES" if ok_parts else "NO"} | wall {time.time() - t0:.0f} s', flush=True)
    W.replay(path, REC_HZ, float(os.environ.get('REPLAY_SPEED', '0.5')), shot=os.path.join(SHOTS, f'{TAG}_window_replay_start.png'))
    W.close()
