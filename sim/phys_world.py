"""phys_world.py — a REAL-PHYSICS world built from a Studio v2 scene (Planner v2 "Gravity" button).

Nothing here decides whether the robot stands, sags or falls: gravity, contact, the servos and the
randomized errors do. The only rules are the robot's own mechanics:
  - every module = the multi-module MuJoCo module the GPU runs use (multi_train.xml: real pads, gaps,
    pockets, lips, lock-rotor fins, 4 spine receivers, PLA flex + backlash joints);
  - end<->end contact ON (handoff 11: ends used to pass through each other);
  - floor receivers = the real receiver bodies, at the Studio's floor anchors;
  - MAGNETS = forces between the real magnet sites, N/S polarity, ~4.6 N per pair at contact (multi_env.py);
  - a LOCK = the end's lock rotor turned 45 deg (End A -1, End B +1, like the robot) with its fins under the
    receiver's lips. No welds: a lock holds only by contact + magnets;
  - servos = the ST3215 model (speed, acceleration, torque-speed droop, battery sag) from multi_env.py;
  - randomization (optional) = the same ranges as the GPU runs.
Port conventions (measured, v2_connector_check.py): Studio END port = pad tip, x at a PAD; SPINE port and
floor anchor = gap floor (seat), x at a GAP. Studio -> MuJoCo frame via v2_calib_fit.json."""
import os, json, math, numpy as np, mujoco
from tetro_env2 import ACT, ACC_RAD, W0_12V, KT, MAG_F0, MAG_D0, MAG_CUT, RX_GAP, RX_TOP
import disturb as DIST
HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, 'multi_train.xml')
CAL = json.load(open(os.path.join(HERE, 'v2_calib_fit.json')))
R_BM = np.array(CAL['R']); T_BM = np.array(CAL['t']); SIGNS = np.array(CAL['signs'], float)
C = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], float)          # Studio v2 (Y up) -> MuJoCo (Z up)
IMU_ON = os.environ.get('IMU', '1') == '1'
IMU_POS = (-0.024, 0.080, -0.019)      # Spine2 body frame (m): centre of the S2B-side frame bar (x -24), mid-spine (y 80), on its outer face (z -17.5) + half the board
IMU_HALF = (0.008, 0.0105, 0.0015)     # GY-521 board 16 x 21 x 3 mm (long side along the module)
SPINE_RX = {'S1A': 'srx0', 'S1B': 'srx1', 'S2A': 'srx2', 'S2B': 'srx3'}   # measured: v2_connector_check.py
LOCK_SIGN = {'A': -1.0, 'B': 1.0}
END_PAD = RX_TOP - RX_GAP
STALL = 2.7
VIEW_BODIES = ['EndA_LockModule', 'L1_LockRotor_A', 'T1_Housing_B1Fork', 'Spine1_B1B2', 'T2_Housing_B2Fork_GROUND',
               'T2_Ring_B3Fork', 'Spine2_B3B4', 'T3_Housing_B4Fork', 'EndB_LockModule', 'L2_LockRotor_B']


MESH_DIR = os.path.join('D:' + os.sep, 'robo4', 'assets', 'tetrobot-module', 'meshes')


def _add_visual_meshes(spec, ids):
    """Attach the real CAD part meshes (Nischay's STLs) to every module body, at the same offsets the original CAD scene
    (tetrobot_scene.xml) used. VISUAL ONLY: group 2, no collision (contype/conaffinity 0), no mass (inertiafromgeom is off),
    so the physics is unchanged; pictures show the real parts instead of the convex collision pieces."""
    old = mujoco.MjSpec.from_file(os.path.join(HERE, 'tetrobot_scene.xml')); off = {}
    for g in old.geoms:
        if g.type == mujoco.mjtGeom.mjGEOM_MESH and g.meshname in VIEW_BODIES: off[g.meshname] = (list(g.pos), list(g.quat))
    for b in VIEW_BODIES:
        if b not in off: continue
        me = spec.add_mesh(); me.name = 'vis_' + b; me.file = os.path.join(MESH_DIR, b + '.stl'); me.scale = [0.001, 0.001, 0.001]
        for mid in ids:
            body = spec.body(f'{mid}_{b}')
            if body is None: continue
            g = body.add_geom(); g.type = mujoco.mjtGeom.mjGEOM_MESH; g.meshname = 'vis_' + b; g.pos, g.quat = off[b]
            g.contype = 0; g.conaffinity = 0; g.group = 2; g.mass = 0; g.rgba = [0.9, 0.9, 0.88, 1]; g.name = f'{mid}_vis_{b}'


def _place_visual_meshes(m):
    """MuJoCo re-centres each mesh on its centre of mass when compiling and moves the geom to compensate: copy the COMPILED
    placement from the original CAD scene (its body frames are identical to these, checked 28 Oct: 0.0 mm / 0.0 deg)"""
    o = mujoco.MjModel.from_xml_path(os.path.join(HERE, 'tetrobot_scene.xml'))
    ref = {o.mesh(o.geom_dataid[g]).name: (o.geom_pos[g].copy(), o.geom_quat[g].copy()) for g in range(o.ngeom) if o.geom_type[g] == mujoco.mjtGeom.mjGEOM_MESH}
    for g in range(m.ngeom):
        n = m.geom(g).name
        if '_vis_' in n and n.split('_vis_')[1] in ref: m.geom_pos[g], m.geom_quat[g] = ref[n.split('_vis_')[1]]


def lock_key(lk):
    a, b = lk['a'], lk['b']
    return (('F:' + a['floor']) if 'floor' in a else f"{a['module']}.{a['port']}") + f"|{b['module']}.{b['port']}"


def docking_of(lk):
    """which END docks (turns its rotor) and the body it locks into. b docks into a; on end<->spine the end docks."""
    a, b = lk['a'], lk['b']
    if b['port'] in ('A', 'B'):
        dock = (b['module'], b['port'])
        if 'floor' in a: recv = f"F_{a['floor']}_rx0"
        elif a['port'] in ('A', 'B'): recv = f"{a['module']}_End{a['port']}_LockModule"
        else: recv = f"{a['module']}_{SPINE_RX[a['port']]}"
    else:
        dock = (a['module'], a['port']); recv = f"{b['module']}_{SPINE_RX[b['port']]}"
    return dock, recv


def quat_xyzw_to_mat(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def mat2q(R):
    q = np.zeros(4); mujoco.mju_mat2Quat(q, np.ascontiguousarray(R, float).flatten()); return q


class PhysWorld:
    def __init__(self, module_ids, anchors, randomize=False, seed=1, locks=()):
        self._args = dict(module_ids=list(module_ids), anchors=[dict(a) for a in anchors], randomize=randomize, seed=seed, locks=[dict(l) for l in locks])
        self.ids = list(module_ids); self.rng = np.random.default_rng(seed)
        spec = mujoco.MjSpec.from_file(TEMPLATE)
        tpl = mujoco.MjSpec.from_file(TEMPLATE)
        # empty the template world: keep floor/lights/options, drop its modules, receivers and their actuators
        for a in list(spec.actuators): spec.delete(a)
        for b in list(spec.worldbody.bodies):
            spec.delete(b)
        for e in list(spec.excludes): spec.delete(e)
        for mid in self.ids:
            fr = spec.worldbody.add_frame()
            fr.attach_body(mujoco.MjSpec.from_file(TEMPLATE).body('module_frame'), f'{mid}_', '')
        # (attaching a body brings its joints' actuators along)
        # floor receivers at the Studio anchors: anchor x = a GAP, so the receiver's pads are 45 deg from it
        self.anchor_ids = []; anchor_frames = {}
        for an in anchors:
            yaw = math.radians(an['yawDeg']) - math.pi / 4
            gx = np.array([math.cos(yaw), 0.0, -math.sin(yaw)])      # pad direction in Studio coords
            x = C @ gx; z = np.array([0, 0, 1.0]); y = np.cross(z, x)
            pos = C @ np.array([an['x'], 0.0, an['z']])
            fr = spec.worldbody.add_frame(); fr.pos = pos; fr.quat = mat2q(np.stack([x, y, z], 1)); anchor_frames[an['id']] = (np.array(pos, float), np.stack([x, y, z], 1))
            fr.attach_body(mujoco.MjSpec.from_file(TEMPLATE).body('rx0'), f"F_{an['id']}_", '')
            self.anchor_ids.append(an['id'])
            if DIST.ON:
                # the receiver sits in cardboard: tilt play +-1.5 deg (175 N.m/rad) and 0.5 mm lift, as train_v2.xml's base joints
                b = spec.body(f"F_{an['id']}_rx0"); b.mass = 0.03; b.inertia = [4e-6, 4e-6, 7e-6]; b.explicitinertial = True
                for nm, ax in (('tiltx', [1, 0, 0]), ('tilty', [0, 1, 0])):
                    j = b.add_joint(); j.name = f"F_{an['id']}_{nm}"; j.type = mujoco.mjtJoint.mjJNT_HINGE; j.axis = ax
                    j.stiffness = [DIST.RX_TILT_K, 0, 0]; j.damping = [0.6, 0, 0]; j.armature = 0.002; j.range = [-DIST.RX_TILT_RANGE, DIST.RX_TILT_RANGE]; j.limited = mujoco.mjtLimited.mjLIMITED_TRUE
                j = b.add_joint(); j.name = f"F_{an['id']}_lift"; j.type = mujoco.mjtJoint.mjJNT_SLIDE; j.axis = [0, 0, 1]
                j.stiffness = [DIST.RX_LIFT_K, 0, 0]; j.springref = -0.0003; j.damping = [60, 0, 0]; j.armature = 0.01; j.range = [0, DIST.RX_LIFT_RANGE]; j.limited = mujoco.mjtLimited.mjLIMITED_TRUE
        # A CLOSED lock = rotor turned, fins under the lips: mechanically one piece. It is held by a weld at the pose
        # where it really seated (switched on only after physics seated it), and the faces inside it stop colliding
        # (700+ mesh contacts that cannot move anyway). Approach, seating, latching and peeling stay full contact + magnets.
        self.lock_defs = {}
        for lk in locks:
            k = lock_key(lk)
            if k in self.lock_defs: continue
            (dm, de), recv = docking_of(lk)
            eq = spec.add_equality(type=mujoco.mjtEq.mjEQ_WELD, objtype=mujoco.mjtObj.mjOBJ_BODY, name1=f'{dm}_End{de}_LockModule', name2=recv)
            eq.name = k; eq.active = False; eq.solref = [0.004, 1.0]
            self.lock_defs[k] = dict(lk=lk, dock=(dm, de), recv=recv)
        self.markers = {}
        if os.environ.get('MARKERS') == '1':                                       # ArUco tags for the image-based camera (camera.py)
            import camera as CAM
            tips = {(mid, e): list(spec.site(f'{mid}_{e}_padtip').pos) for mid in self.ids for e in 'AB'}
            self.markers = CAM.add_markers(spec, self.ids, anchors, tips, anchor_frames)
        if IMU_ON:                                                                 # the MPU-6050 Nischay mounts on Spine2's frame bar (29 Oct)
            for mid in self.ids:
                sb = spec.body(f'{mid}_Spine2_B3B4')
                g = sb.add_geom(); g.name = f'{mid}_imu_board'; g.type = mujoco.mjtGeom.mjGEOM_BOX; g.size = list(IMU_HALF); g.pos = list(IMU_POS)
                g.contype = 0; g.conaffinity = 0; g.group = 2; g.mass = 0; g.rgba = [0.1, 0.3, 0.85, 1]   # visual (2 g: inside the CAD body mass)
                st = sb.add_site(); st.name = f'{mid}_imu'; st.pos = list(IMU_POS)            # sensor axes = Spine2 body axes (mounting error: imu.py)
                for typ, nm in ((mujoco.mjtSensor.mjSENS_ACCELEROMETER, 'acc'), (mujoco.mjtSensor.mjSENS_GYRO, 'gyro')):
                    sn = spec.add_sensor(); sn.type = typ; sn.objtype = mujoco.mjtObj.mjOBJ_SITE; sn.objname = st.name; sn.name = f'{mid}_imu_{nm}'
        vis = os.environ.get('VISUAL_MESH') == '1'
        if vis: _add_visual_meshes(spec, self.ids)                                  # your real part meshes, for pictures only
        self.m = spec.compile(); self.d = mujoco.MjData(self.m); m = self.m
        if not anchors: m.geom_size[m.geom('floor').id][:2] = 3.0          # bare floor (floor chains, 2 m long): draw it big; a plane collides everywhere anyway
        if vis:
            _place_visual_meshes(m)
            for g in range(m.ngeom):                     # floor receivers have no separate mesh: draw their real-geometry pieces (group 3)
                if m.body(m.geom_bodyid[g]).name.startswith('F_') or m.geom_bodyid[g] == 0: m.geom_group[g] = 3   # + the floor
        # the same model tuning multi_env.py applies
        for j in range(m.njnt):
            n_ = m.joint(j).name
            if '_flex' in n_ or n_.endswith('_bl'): m.dof_damping[m.jnt_dofadr[j]] *= 25
        m.actuator_biasprm[:, 2] *= 4
        for i in range(m.ngeom):
            if m.geom_contype[i] == 1 and m.geom_conaffinity[i] == 2: m.geom_conaffinity[i] = 3
            if m.geom_contype[i] == 4 and m.geom_conaffinity[i] == 2: m.geom_contype[i] = 4; m.geom_conaffinity[i] = 6   # END_END_CONTACT (4/6: ends hit ends + receivers, never module bodies)
        # the broad phase filters on per-BODY bits (OR of its geoms): keep them in step with the geom changes above
        if hasattr(m, 'body_contype'):
            m.body_contype[:] = 0; m.body_conaffinity[:] = 0
            for i in range(m.ngeom):
                b = m.geom_bodyid[i]; m.body_contype[b] |= m.geom_contype[i]; m.body_conaffinity[b] |= m.geom_conaffinity[i]
        self.mod = {}
        for mid in self.ids:
            p = f'{mid}_'
            r = dict(act=[m.actuator(p + 'm_' + n[2:]).id for n in ACT], lock={'A': m.actuator(p + 'm_L1_lock').id, 'B': m.actuator(p + 'm_L2_lock').id},
                     qa=[m.joint(p + n).qposadr[0] for n in ACT], dofs=[m.joint(p + n).dofadr[0] for n in ACT],
                     lockq={'A': m.joint(p + 'J_L1_lock').qposadr[0], 'B': m.joint(p + 'J_L2_lock').qposadr[0]},
                     root=m.joint(p + 'root').qposadr[0], frame=m.body(p + 'module_frame').id,
                     end={e: dict(body=m.body(p + f'End{e}_LockModule').id, tip=m.site(p + f'{e}_padtip').id,
                                  mags=[m.site(p + f'{e}_mag{k}').id for k in range(8)]) for e in 'AB'})
            self.mod[mid] = r
        self.all_act = np.array([a for mid in self.ids for a in self.mod[mid]['act'] + [self.mod[mid]['lock']['A'], self.mod[mid]['lock']['B']]])
        self.all_dof = np.array([m.actuator_trnid[a, 0] for a in self.all_act]); self.all_dof = np.array([m.jnt_dofadr[j] for j in self.all_dof])
        # receivers the ends can dock into: floor receivers, every spine receiver, every end (receiver-equivalent)
        self.rx = []
        for aid in self.anchor_ids:
            self.rx.append(dict(kind='floor', name=f'F:{aid}', bid=m.body(f'F_{aid}_rx0').id, mags=[m.site(f'F_{aid}_r0_r0_rx_mag{k}').id for k in range(8)], mod=None))
        for mid in self.ids:
            for port, sn in SPINE_RX.items():
                self.rx.append(dict(kind='side', name=f'{mid}.{port}', bid=m.body(f'{mid}_{sn}').id, mags=[m.site(f'{mid}_{sn}_r0_rx_mag{k}').id for k in range(8)], mod=mid))
            for e in 'AB':
                E = self.mod[mid]['end'][e]
                self.rx.append(dict(kind='end', name=f'{mid}.{e}', bid=E['body'], tip=E['tip'], endt=e, mags=list(E['mags']), mod=mid))
        # each end's connector geoms (pads, lips, pockets, fins: the 6/7 ones) - switched off while its lock is closed
        self.conn_geoms = {}
        for mid in self.ids:
            for e, rot in (('A', 'L1_LockRotor_A'), ('B', 'L2_LockRotor_B')):
                bs = {m.body(f'{mid}_End{e}_LockModule').id, m.body(f'{mid}_{rot}').id}
                self.conn_geoms[(mid, e)] = [i for i in range(m.ngeom) if m.geom_bodyid[i] in bs and m.geom_contype[i] == 4 and m.geom_conaffinity[i] == 6]
        self.eq = {m.eq(i).name: i for i in range(m.neq)}
        self.engaged = set()
        self.view_names = [(mid, b) for mid in self.ids for b in VIEW_BODIES]
        self.view_bodies = [m.body(f'{mid}_{b}').id for mid, b in self.view_names]
        self.nom = dict(stiff=m.jnt_stiffness.copy(), damp=m.dof_damping.copy(), fl=m.dof_frictionloss.copy(), gain=m.actuator_gainprm.copy(),
                        bias=m.actuator_biasprm.copy(), fr=m.actuator_forcerange.copy(), mass=m.body_mass.copy(), inert=m.body_inertia.copy(),
                        rng=m.jnt_range.copy(), fric=m.geom_friction.copy())
        nA = len(self.all_act)
        self.amax = np.full(nA, ACC_RAD); self.volt = np.full(len(self.ids), 11.1); self.w0 = np.full(nA, W0_12V * 11.1 / 12)
        self.magk, self.mag_gap = 1.0, 0.0
        if randomize: self._randomize()
        self.disturb = DIST.Disturb(self, self.rng, randomize) if DIST.ON else None
        self.fr0 = m.actuator_forcerange[self.all_act, 1].copy()
        self.sp = np.zeros(nA); self.spv = np.zeros(nA); self.tgt = np.zeros(nA)
        self.rec = None

    def _randomize(self):
        """the GPU runs' ranges (gpu_multi_dock.py / multi_env.py)"""
        m, n, r = self.m, self.nom, self.rng
        for j in range(m.njnt):
            nm = m.joint(j).name
            if '_flex' in nm: m.jnt_stiffness[j] *= r.uniform(0.6, 1.5); m.dof_damping[m.jnt_dofadr[j]] *= r.uniform(0.6, 1.8)
            if nm.endswith('_bl'): m.jnt_range[j] = n['rng'][j] * max(r.uniform(0, 2.0), 0.05)
        for mid in self.ids:
            for dof in self.mod[mid]['dofs']: m.dof_frictionloss[dof] *= r.uniform(0.6, 1.5)
        for j in range(m.njnt):                                    # cardboard under each floor receiver: softer / stiffer
            if m.joint(j).name.startswith('F_') and m.jnt_stiffness[j] > 0: m.jnt_stiffness[j] *= r.uniform(0.5, 1.5)
        for a in range(m.nu):
            k = r.uniform(0.75, 1.25); m.actuator_gainprm[a, 0] *= k; m.actuator_biasprm[a, 1] *= k; m.actuator_forcerange[a] = n['fr'][a] * r.uniform(0.75, 1.0)
        for b in range(1, m.nbody):
            if '_rx0' in m.body(b).name or 'srx' in m.body(b).name: continue
            s = r.uniform(0.92, 1.08); m.body_mass[b] = n['mass'][b] * s; m.body_inertia[b] = n['inert'][b] * s
        m.geom_friction[:, 0] = n['fric'][:, 0] * r.uniform(0.7, 1.4)
        tl = math.radians(r.uniform(0, 1.5)); ph = r.uniform(0, 2 * math.pi)
        m.opt.gravity[:] = 9.81 * np.array([math.sin(tl) * math.cos(ph), math.sin(tl) * math.sin(ph), -math.cos(tl)])
        self.magk = r.uniform(0.6, 1.4); self.mag_gap = r.uniform(0.0, 0.0006)
        nA = len(self.all_act); self.amax = ACC_RAD * r.uniform(0.85, 1.15, nA)
        self.volt = r.uniform(10.5, 12.6, len(self.ids)); self.w0 = W0_12V * np.repeat(self.volt, 9) / 12 * r.uniform(0.9, 1.05, nA)

    # ── placing a Studio scene ──
    def place(self, scene):
        """Put every module where the Studio draws it (base frame + joint angles), locks closed = rotors at 45 deg."""
        m, d = self.m, self.d
        mujoco.mj_resetData(m, d)
        for mod in scene['modules']:
            r = self.mod[mod['id']]
            Rb = C @ quat_xyzw_to_mat(mod['base']['q']); pb = C @ np.array(mod['base']['p'], float)
            R = Rb @ R_BM.T; p = pb - R @ T_BM
            a = r['root']; d.qpos[a:a + 3] = p; d.qpos[a + 3:a + 7] = mat2q(R)
            for k, adr in enumerate(r['qa']): d.qpos[adr] = SIGNS[k] * mod['rad'][k]
        mujoco.mj_forward(m, d)
        for i, mid in enumerate(self.ids):
            q = np.array([d.qpos[a] for a in self.mod[mid]['qa']])
            self.tgt[i * 9:i * 9 + 7] = q
        self.set_locks(scene['locks'], snap=True)
        self.sp[:] = self.tgt; self.spv[:] = 0
        d.ctrl[self.all_act] = self.sp
        mujoco.mj_forward(m, d)
        self.nominal_poses = self.body_poses()             # exactly the Studio's drawn pose (before any settling)
        if not any('floor' in lk['a'] for lk in scene['locks']):
            self.lift_clear()
        for lk in scene['locks']: self.engage(lk)

    def engage(self, lk):
        """the lock is closed: weld at the pose it is in NOW, stop its faces colliding"""
        k = lock_key(lk); L = self.lock_defs.get(k)
        if L is None or k in self.engaged: return
        m, d = self.m, self.d; i = self.eq[k]
        b1, b2 = m.eq_obj1id[i], m.eq_obj2id[i]
        R1 = d.xmat[b1].reshape(3, 3); R2 = d.xmat[b2].reshape(3, 3)
        data = np.zeros(m.eq_data.shape[1]); data[3:6] = R1.T @ (d.xpos[b2] - d.xpos[b1]); data[6:10] = mat2q(R1.T @ R2); data[10] = 1.0
        m.eq_data[i] = data; d.eq_active[i] = 1
        for g in self.conn_geoms[L['dock']]: m.geom_contype[g] = 0; m.geom_conaffinity[g] = 0
        self.engaged.add(k)

    # ── checkpoints: run a long pipeline in PIECES (save after a stage, start the next test from there) ──
    def save(self, path, extra=None):
        import pickle
        m, d = self.m, self.d
        st = dict(args=self._args, qpos=d.qpos.copy(), qvel=d.qvel.copy(), act=d.act.copy(), ctrl=d.ctrl.copy(), time=float(d.time),
                  warm=d.qacc_warmstart.copy(), tgt=self.tgt.copy(), sp=self.sp.copy(), spv=self.spv.copy(), closed=sorted(getattr(self, 'closed', set())),
                  engaged={k: m.eq_data[self.eq[k]].copy() for k in self.engaged}, rng=self.rng.bit_generator.state,
                  disturb=None if self.disturb is None else dict(a=self.disturb.a.copy(), u=self.disturb.u.copy(), bump=self.disturb.bump.copy(), bl=self.disturb.bump_left, log=list(self.disturb.log)),
                  nominal=getattr(self, 'nominal_poses', None), extra=extra)
        pickle.dump(st, open(path, 'wb'))

    @classmethod
    def load(cls, path):
        """the same random robot, exactly where save() left it (returns world, extra)"""
        import pickle
        st = pickle.load(open(path, 'rb')); w = cls(**st['args']); m, d = w.m, w.d
        d.qpos[:] = st['qpos']; d.qvel[:] = st['qvel']; d.act[:] = st['act']; d.ctrl[:] = st['ctrl']; d.time = st['time']; d.qacc_warmstart[:] = st['warm']
        w.tgt[:] = st['tgt']; w.sp[:] = st['sp']; w.spv[:] = st['spv']; w.closed = set(map(tuple, st['closed']))
        for k, data in st['engaged'].items():
            i = w.eq[k]; m.eq_data[i] = data; d.eq_active[i] = 1
            for g in w.conn_geoms[w.lock_defs[k]['dock']]: m.geom_contype[g] = 0; m.geom_conaffinity[g] = 0
            w.engaged.add(k)
        w.rng.bit_generator.state = st['rng']
        if st['disturb'] and w.disturb is not None:
            D = st['disturb']; w.disturb.a[:] = D['a']; w.disturb.u[:] = D['u']; w.disturb.bump[:] = D['bump']; w.disturb.bump_left = D['bl']; w.disturb.log = D['log']
        w.nominal_poses = st['nominal']; mujoco.mj_forward(m, d)
        return w, st['extra']

    def release(self, lk):
        """rotor turned back: no weld, the faces collide again, magnets act"""
        k = lock_key(lk); L = self.lock_defs.get(k)
        if L is None or k not in self.engaged: return
        self.d.eq_active[self.eq[k]] = 0
        for g in self.conn_geoms[L['dock']]: self.m.geom_contype[g] = 4; self.m.geom_conaffinity[g] = 6
        self.engaged.discard(k)

    def lift_clear(self):
        """A robot standing on its own: the Studio's simple shapes sit a little into the floor compared with the real
        part hulls, so raise it until nothing is inside the floor or a receiver; gravity then sets it down."""
        m, d = self.m, self.d
        for _ in range(6):
            low = 0.0
            for i in range(d.ncon):
                c = d.contact[i]; b1, b2 = m.geom_bodyid[c.geom1], m.geom_bodyid[c.geom2]
                stat = lambda b: b == 0 or m.body(b).name.startswith('F_')
                if stat(b1) != stat(b2): low = min(low, c.dist)
            if low >= -0.0005: return
            for mid in self.ids: d.qpos[self.mod[mid]['root'] + 2] += -low + 0.0005
            mujoco.mj_forward(m, d)

    def set_targets(self, scene):
        for mod in scene['modules']:
            i = self.ids.index(mod['id'])
            self.tgt[i * 9:i * 9 + 7] = SIGNS * np.array(mod['rad'])

    def set_locks(self, locks, snap=False):
        """locked ends turn their rotor 45 deg (A one way, B the other); open ends turn back to 0"""
        closed = set()
        for lk in locks:
            # every END in the lock turns its rotor 45 deg (End A one way, End B the other); end<->end: both at once
            for pr in (lk['a'], lk['b']):
                if 'module' in pr and pr['port'] in ('A', 'B'): closed.add((pr['module'], pr['port']))
        for i, mid in enumerate(self.ids):
            for e, off in (('A', 7), ('B', 8)):
                ang = math.radians(45) * LOCK_SIGN[e] if (mid, e) in closed else 0.0
                self.tgt[i * 9 + off] = ang
                if snap: self.d.qpos[self.mod[mid]['lockq'][e]] = ang
        self.closed = closed

    # ── physics ──
    def rx_frame(self, R, Rb, pb):
        """seat (gap floor), outward normal z and frame (x = a PAD) of receiver R when its body sits at (Rb, pb):
        the truth passes the physics pose, the camera judge (cam_judge.py) its own estimate"""
        if R['kind'] == 'end':
            n = Rb[:, 1] * (1.0 if R['endt'] == 'B' else -1.0); tip = pb + Rb @ self.m.site_pos[R['tip']]
            return tip - END_PAD * n, n, np.stack([Rb[:, 0], np.cross(n, Rb[:, 0]), n], 1)
        z = Rb[:, 2].copy(); return pb + RX_GAP * z, z, Rb.copy()

    def _refresh_rx(self):
        d = self.d
        for R in self.rx:
            R['seat'], R['z'], R['R'] = self.rx_frame(R, d.xmat[R['bid']].reshape(3, 3), d.xpos[R['bid']])
            R['mag_p'] = d.site_xpos[R['mags']].copy()

    def _magnets(self):
        """8 magnets per connector, N/S alternating; each end magnet pairs with the nearest receiver magnet (multi_env.py)"""
        d = self.d; pol = np.where(np.arange(8) % 2 == 0, 1.0, -1.0)
        for mid in self.ids:
            for e in 'AB':
                E = self.mod[mid]['end'][e]; tip = d.site_xpos[E['tip']]
                for R in self.rx:
                    if R['mod'] == mid: continue
                    if R['kind'] == 'end' and self.ids.index(R['mod']) < self.ids.index(mid): continue   # end pair counted once
                    if np.linalg.norm(tip - R['seat']) > MAG_CUT + 0.03: continue
                    z = R['z']; Bm = d.site_xpos[E['mags']]
                    D = R['mag_p'][None, :, :] - Bm[:, None, :]; L = np.linalg.norm(D, axis=2); j = L.argmin(1); v = D[np.arange(8), j]
                    ax = v @ z; lat = v - ax[:, None] * z[None, :]; ln = np.linalg.norm(lat, axis=1); sep = np.maximum(-ax, 0.0) + self.mag_gap
                    fm = self.magk * MAG_F0 / (1 + sep / MAG_D0) ** 3 * np.exp(-(ln / 0.006) ** 2)
                    fm = np.where((sep < MAG_CUT) & (ln < 0.012), fm, 0.0) * np.where(pol * pol[j] < 0, 1.0, -1.0)
                    if self.disturb is not None: fm = fm * self.disturb.site_k[E['mags']] * self.disturb.site_k[np.asarray(R['mags'])[j]]   # every magnet differs
                    # attraction pulls the docking end INTO the connector (along -z). multi_env.py uses z*sign(ax): when the
                    # faces touch and the contact solver lets them overlap by ~0.02 mm, ax turns positive and the full pull
                    # (8 x 4.6 N) pushes the end OUT - measured here: interleaved ends flew apart at 160 mm/s in zero g.
                    Fv = -z[None, :] * fm[:, None] + lat / 0.004 * 0.5 * fm[:, None]
                    b = E['body']; c = d.xipos[b]
                    d.xfrc_applied[b, :3] += Fv.sum(0); d.xfrc_applied[b, 3:] += np.cross(Bm - c, Fv).sum(0)
                    if R['kind'] != 'floor':
                        rb = R['bid']; rc = d.xipos[rb]; Pm = R['mag_p'][j]
                        d.xfrc_applied[rb, :3] -= Fv.sum(0); d.xfrc_applied[rb, 3:] -= np.cross(Pm - rc, Fv).sum(0)

    def _servo(self, dt=0.005):
        """ST3215: setpoint slews at <= speed / accel, torque limit drops with speed and battery sag (multi_env.py)"""
        m, d = self.m, self.d; nM = len(self.ids)
        F = d.actuator_force[self.all_act].reshape(nM, 9)
        I = 1.8 + np.abs(F).sum(1) / KT; sag = np.maximum(self.volt - 0.08 * I, 9.0) / self.volt; sag9 = np.repeat(sag, 9)
        w0 = self.w0 * sag9; e = self.tgt - self.sp
        if self.disturb is not None: e = np.where(np.abs(e) < DIST.DEADBAND, 0.0, e)     # servo deadband
        vdes = np.sign(e) * np.minimum(w0, np.sqrt(2 * self.amax * np.abs(e)))
        self.spv += np.clip(vdes - self.spv, -self.amax * dt, self.amax * dt); self.sp += self.spv * dt
        d.ctrl[self.all_act] = self.sp
        w = d.qvel[self.all_dof]; tau = d.actuator_force[self.all_act]
        lim = sag9 * np.where(tau * w > 0, self.fr0 * np.clip(1 - np.abs(w) / w0, 0.08, 1.0), self.fr0)
        m.actuator_forcerange[self.all_act, 0] = -lim; m.actuator_forcerange[self.all_act, 1] = lim

    def run(self, seconds, extra=None):
        """advance with gravity, contacts, magnets and servos; extra = (body, force3) applied meanwhile"""
        m, d = self.m, self.d
        n = max(1, int(round(seconds / m.opt.timestep)))
        peak = 0.0
        for k in range(n):
            d.xfrc_applied[:] = 0
            if k % 10 == 0: self._refresh_rx()
            self._magnets()
            if self.disturb is not None: self.disturb.apply(m.opt.timestep)          # floor shake, bumps, air
            if extra is not None: d.xfrc_applied[extra[0], :3] += extra[1]
            if k % 5 == 0:
                self._servo()
                peak = max(peak, float(np.abs(d.actuator_force[self.all_act]).max() / STALL * 100))
            mujoco.mj_step(m, d)
            if self.rec is not None and d.time - self.rec['last'] >= self.rec['dt'] - 1e-9:
                self.rec['last'] = d.time; self.rec['frames'].append({'t': round(float(d.time), 3), 'p': self.body_poses()})
            if not np.isfinite(d.qpos).all(): return peak, False
            if k % 100 == 0 and getattr(self, 'on_tick', None): self.on_tick()     # e.g. snap.Snapper.tick: pictures during the run
        return peak, True

    def body_poses(self):
        d = self.d; out = []
        for b in self.view_bodies:
            pos = C.T @ d.xpos[b]; R = C.T @ d.xmat[b].reshape(3, 3); q = mat2q(R)
            out += [round(float(v), 5) for v in (*pos, q[1], q[2], q[3], q[0])]
        return out

    def end_vs(self, mid, e, rx_name):
        """how an end sits on a receiver: axial gap, sideways offset, lock angle (multi_env.end_vs_rx)"""
        self._refresh_rx(); d = self.d
        R = next(x for x in self.rx if x['name'] == rx_name); E = self.mod[mid]['end'][e]
        rel = d.site_xpos[E['tip']] - R['seat']; ax = float(rel @ R['z'])
        return dict(axial_mm=ax * 1000, radial_mm=float(np.linalg.norm(rel - ax * R['z'])) * 1000,
                    lock_deg=math.degrees(abs(d.qpos[self.mod[mid]['lockq'][e]])))

    def contacts_between(self):
        """cross-module and module-receiver contacts (penetration check)"""
        m, d = self.m, self.d; out = []
        for i in range(d.ncon):
            c = d.contact[i]; b1 = m.body(m.geom_bodyid[c.geom1]).name; b2 = m.body(m.geom_bodyid[c.geom2]).name
            if b1.split('_')[0] != b2.split('_')[0]: out.append((b1, b2, float(c.dist)))
        return out


# ── a plan, executed like the robot does it ──────────────────────────────────────────────────────────────
SPEEDUP = 0.5      # pose moves at 2x the planned (gentle) time
SEAT_AXIAL_MM, SEAT_RADIAL_MM = 0.8, 1.5   # seated = what walk.py / gpu runs count as a good dock (fins need < ~0.6 mm)


def run_plan(scene, plan=None, seconds=6.0, randomize=True, seed=1, fps=25, ckpt_before=None):
    """GRAVITY ON. Nothing is judged: gravity, contact, magnets, servos and the randomized errors decide.
    pose_move = servo targets; dock = turn the rotor with the magnets pulling, it LOCKS only if it physically
    seated; peel = rotor back, magnets and contact act again."""
    # ckpt_before=(k, path): run steps 0..k-1, save the world there (with the locks so far) and stop: a short piece for step k
    import time
    t0 = time.time()
    steps = (plan or {}).get('steps', [])
    locks = list(scene['locks']) + [lk for st in steps for lk in st['scene']['locks']]
    w = PhysWorld([m['id'] for m in scene['modules']], scene.get('anchors', []), randomize=randomize, seed=seed, locks=locks)
    w.place(scene)
    frame0 = w.nominal_poses
    w.rec = {'dt': 1.0 / fps, 'last': -1.0, 'frames': []}
    cur = list(scene['locks']); events = []
    w.run(0.5)
    for k, st in enumerate(steps):
        if ckpt_before and k == ckpt_before[0]:
            w.save(ckpt_before[1], extra=dict(cur=cur, step=k, seed=seed)); return {'ckpt': ckpt_before[1], 'events': events}
        verb, sc = st['verb'], st['scene']
        ev = {'step': k, 'verb': verb, 'label': st.get('label', ''), 't': round(float(w.d.time), 2)}
        if verb == 'pose_move':
            legs = [*st.get('via', []), sc]
            for leg in legs:
                w.set_targets(leg); w.run(max(0.4, st['durationS'] * SPEEDUP / len(legs)))
            w.run(0.3)
        elif verb in ('dock', 'walk_step'):
            # the REAL docking brain (walk.py Walker + laptop_controller) docks the end, from wherever it is now
            from phys_dock import PhysDockEnv, dock
            new = [lk for lk in sc['locks'] if lock_key(lk) not in {lock_key(x) for x in cur}]
            res = []
            for lk in new:
                (dm, de), _ = docking_of(lk)
                a = lk['a']; tgt = ('F:' + a['floor']) if 'floor' in a else f"{a['module']}.{a['port']}"
                if lk['b']['port'] not in ('A', 'B'): tgt = f"{lk['b']['module']}.{lk['b']['port']}"
                base_end = 'B' if de == 'A' else 'A'
                base = None
                for x in cur:                                            # where the docking module's other end sits
                    for me, other in ((x['b'], x['a']), (x['a'], x['b'])):
                        if me.get('module') == dm and me.get('port') == base_end:
                            base = ('F:' + other['floor']) if 'floor' in other else f"{other['module']}.{other['port']}"
                if base is None:
                    res.append(dict(lock=lock_key(lk), seated=False, why=f'{dm}.{base_end} is not in a receiver: the docking brain needs a base'))
                    continue
                env = PhysDockEnv(w, dm, seed=seed * 7919 + k, randomize=randomize)
                ok, info = dock(env, base_end, base, tgt)
                res.append(dict(lock=lock_key(lk), seated=ok, gap_mm=info['axial_mm'], side_mm=info['radial_mm'], lock_deg=info['lock_deg'], seconds=info['seconds']))
                if ok: w.engage(lk); cur.append(lk)
                else: w.set_locks(cur)                                   # its rotor turns back: no lock
            ev['docks'] = res; ev['latched'] = all(x['seated'] for x in res)
            if not ev['latched']: ev['note'] = 'the docking brain could not seat it: no lock'
            w.run(0.5)
        elif verb == 'undock':
            # the robot's own undock (walk.py peel + pull-out, phys_dock.peel_after_dock): rotor open, peel about the rim, STRAIGHT
            # out 25 mm along the receiver axis, and only then the next move. (Before 28 Oct the lock was just released and the
            # next pose move dragged the end out sideways - Nischay saw the same fault in the Plan sketch.)
            from phys_dock import PhysDockEnv, peel_after_dock
            keep = {lock_key(x) for x in sc['locks']}; res = []
            for lk in [x for x in cur if lock_key(x) not in keep]:
                (dm, de), _ = docking_of(lk)
                a = lk['a']; old = ('F:' + a['floor']) if 'floor' in a else f"{a['module']}.{a['port']}"
                if lk['b']['port'] not in ('A', 'B'): old = f"{lk['b']['module']}.{lk['b']['port']}"
                base_end = 'B' if de == 'A' else 'A'; base = None
                for x in cur:
                    if lock_key(x) == lock_key(lk): continue
                    for me, other in ((x['b'], x['a']), (x['a'], x['b'])):
                        if me.get('module') == dm and me.get('port') == base_end:
                            base = ('F:' + other['floor']) if 'floor' in other else f"{other['module']}.{other['port']}"
                w.release(lk); cur = [x for x in cur if lock_key(x) != lock_key(lk)]; w.set_locks(cur)
                if base is None: w.run(1.0); res.append(dict(lock=lock_key(lk), out=None, why='no base end: just released')); continue
                out, lg = peel_after_dock(PhysDockEnv(w, dm, seed=seed * 7919 + 500 + k, randomize=randomize), base_end, base, old)
                res.append(dict(lock=lock_key(lk), out=bool(out), detail=(lg[-1][:120] if lg else '')))
            ev['undocks'] = res
            w.run(0.5)
        events.append(ev)
    w.run(2.0 if steps else max(1.5, float(seconds)))
    fr = w.rec['frames']; w.rec = None
    return {'bodies': w.view_names, 'frame0': frame0, 'frames': fr, 'events': events, 'fps': fps, 'randomized': bool(randomize), 'receivers': receivers_of(w, scene),
            'seed': seed, 'finite': bool(np.isfinite(w.d.qpos).all()), 'seconds': round(time.time() - t0, 1),
            'engine': 'phys_world: real pads/fins/receivers, magnets, ST3215 servos, locks = rotor + weld once seated'}


# ── a LIVE gravity session (Studio "Gravity" runs until switched off; no fixed clip) ─────────────────────
SESSIONS = {}


def session_start(scene, randomize=True, seed=1, fps=25):
    import uuid
    w = PhysWorld([m['id'] for m in scene['modules']], scene.get('anchors', []), randomize=randomize, seed=seed, locks=list(scene['locks']))
    w.place(scene)
    sid = uuid.uuid4().hex[:12]
    SESSIONS[sid] = dict(w=w, fps=fps)
    while len(SESSIONS) > 4: SESSIONS.pop(next(iter(SESSIONS)))       # keep a few, drop the oldest
    return {'id': sid, 'bodies': w.view_names, 'frame0': w.nominal_poses, 'fps': fps, 'receivers': receivers_of(w, scene)}


def session_step(sid, seconds=1.0):
    S = SESSIONS.get(sid)
    if S is None: return {'error': 'no such session (restarted?)'}
    w = S['w']; w.rec = {'dt': 1.0 / S['fps'], 'last': w.d.time, 'frames': []}
    _, ok = w.run(max(0.05, min(3.0, float(seconds))))
    fr = w.rec['frames']; w.rec = None
    return {'frames': fr, 'finite': ok, 't': round(float(w.d.time), 3)}


def receivers_of(w, scene):
    """every floor receiver in the world (Studio v2 coords, metres): where, and which module end is LOCKED in it"""
    locked = {lk['a']['floor']: f"{lk['b']['module']}.{lk['b']['port']}" for lk in scene.get('locks', []) if 'floor' in lk['a']}
    return [dict(id=a['id'], x=a['x'], z=a['z'], locked=locked.get(a['id'])) for a in scene.get('anchors', [])]
