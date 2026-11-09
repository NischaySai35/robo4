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
from engine import world_engine
HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, 'multi_train.xml')
CAL = json.load(open(os.path.join(HERE, 'v2_calib_fit.json')))
R_BM = np.array(CAL['R']); T_BM = np.array(CAL['t']); SIGNS = np.array(CAL['signs'], float)
C = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], float)          # Studio v2 (Y up) -> MuJoCo (Z up)
IMU_ON = os.environ.get('IMU', '1') == '1'
# the MPU-6050 (GY-521), as Nischay mounted it on the real robot (3 Nov, try5 picture): flat on the spine's face, in the middle of a
# side receiver's ring, long side along the module. WHICH receiver: YET TO BE TOLD by Nischay (4 Nov) - S2B below is only a
# placeholder (Spine2's -x side, where the 29 Oct frame-bar board was); set IMU_RX when he says.
# Board frame = the sensor's frame: z out of the spine (chip side out), y along the module (Spine +y), x = y cross z.
# The real chip's printed X/Y may differ by a turn/flip: imu.mount_from_gravity() measures that once it is wired (2 still poses)
IMU_RX = os.environ.get('IMU_RX', 'S2B')   # PLACEHOLDER - side yet to be told
IMU_STANDOFF = 0.0005                   # m: board back off the spine face (tape / glue)
IMU_HALF = (0.008, 0.0105, 0.0015)     # GY-521 board 16 x 21 x 3 mm (long side along the module)
SPINE_RX = {'S1A': 'srx0', 'S1B': 'srx1', 'S2A': 'srx2', 'S2B': 'srx3'}   # measured: v2_connector_check.py
LOCK_SIGN = {'A': -1.0, 'B': 1.0}
END_PAD = RX_TOP - RX_GAP
STALL = 2.7
COMFORT_WN = float(os.environ.get("SMOOTH_WN", "8"))   # 1/s: how quickly the smooth path closes on a command (phys_world._comfort)
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


COARSE_ADD = ('_srx', 'LockRotor', 'EndA_LockModule', 'EndB_LockModule')   # parts with no DIK collision box of their own (connector zones), 3 Nov: given one sized to the part
CAD_COLLIDE = os.environ.get('CAD_COLLIDE', '1') == '1'   # default on since 31 Oct (cobra 8/8, A->B 2/2); 0 = the old coarse boxes


def _add_cad_colliders(spec, ids):
    """31 Oct: replace each module body's 2 coarse collision boxes with boxes filling the real CAD part
    (build_cad_colliders.py -> cad_collision.json), and let them collide with connectors too (bit 4), so an end can no
    longer pass through another module's housing. Connector zones are left out of the boxes: the exact pads, pockets,
    lips and receivers there are unchanged."""
    cad = json.load(open(os.path.join(HERE, 'cad_collision.json')))['parts']
    bodies = [(b, p) for b in spec.bodies for p in cad if b.name == p or b.name.endswith('_' + p)]   # any prefix: M1_, m1_, none
    for body, part in bodies:
            boxes = cad[part]; mid = body.name[:-len(part)].rstrip('_') or 'mod'
            for g in body.geoms:
                if g.contype == 1: g.contype = 0; g.conaffinity = 0; g.group = 4   # old coarse box: kept for its look only
            for k, (cx, cy, cz, hx, hy, hz) in enumerate(boxes):
                g = body.add_geom(); g.name = f'{mid}_cad_{part}_{k}'; g.type = mujoco.mjtGeom.mjGEOM_BOX
                g.pos = [cx, cy, cz]; g.size = [hx, hy, hz]; g.mass = 0
                g.friction = [0.35, 0.005, 0.0001]                                # same PLA as the connector geoms (the default 1.0 gripped the floor 2.5x too hard)
                g.contype = 1; g.conaffinity = 7; g.group = 3; g.rgba = [0.6, 0.6, 0.6, 0.35]


LOCK_WELD = os.environ.get('LOCK_WELD', '0') == '1'   # 1 = closed locks as a weld (old shortcut); 0 = held by the fins' contact
PAD_CLEAR_DEG = float(os.environ.get('PAD_CLEAR_DEG', '0.5'))


FIN_TAPER = [float(x) for x in os.environ.get('FIN_TAPER', '0.5,0.8').split(',')]   # fin end slice, next slice: share of full thickness


def _fin_chamfer(spec):
    """9 Nov, Nischay: the lock rotor fins are CHAMFERED - both ends of every fin taper in thickness (CAD rendered edge-on). The
    collision fins were flat 2.8 mm slabs to the very end: an end tilted by the 2.5 deg PLA lock play met a pad's side wall
    square-on and the rotor stopped at 4 deg (45 deg seed 1; LOCK_PLAY_DEG=0 locked). Each fin is 5 slices along its arc
    (build_v2.sector_boxes): the end slices are thinned about the fin's mid-plane, a stepped wedge like the printed part."""
    import re
    if not FIN_TAPER or FIN_TAPER[0] >= 1.0: return
    for g in spec.geoms:
        mt = re.search(r'B_arm\d_(\d)_\d$', g.name)
        if not mt: continue
        j = int(mt.group(1)); k = min(j, 4 - j)                     # 0 = an end slice, 1 = next to it, 2 = the middle
        if k < len(FIN_TAPER): g.size = [g.size[0], g.size[1] * FIN_TAPER[k], g.size[2]]


def _pad_clearance(spec, deg=None):
    """1 Nov: the CAD pads are 45.1 deg wide and their gaps 44.9 deg (sliced from the STL), so two ends interfere and an
    end in a receiver has ~0.08 mm per side; in the sim end<->end always jammed ~7 mm out. Nischay pushed two real ends
    together by hand: they go in fully and smoothly (printed pads come out narrower, PLA gives). So every pad slice is
    narrowed by `deg` per side about its pad's centre (end A, end B and receiver pads alike): 0.5 deg ~ 0.25 mm at r 30 mm."""
    deg = PAD_CLEAR_DEG if deg is None else deg
    if deg <= 0: return
    import re
    pads = {}
    for me in spec.meshes:
        mt = re.search(r'(h_B|mA_A_B|h_rx)_pad(\d)_(lo|po|lip)_s\d$', me.name)   # all 3 pad layers: their sides slide past each other (pockets alone: still jammed 22 mm out)
        if mt and len(me.uservert): pads.setdefault((me.name[:mt.start()] + mt.group(1), mt.group(2)), []).append(me)
    for (fam, k), mes in pads.items():
        V = np.concatenate([np.asarray(me.uservert).reshape(-1, 3) for me in mes])
        ax = 2 if fam.endswith('h_rx') else 1
        i, j = [c for c in range(3) if c != ax]
        t = np.arctan2(V[:, j], V[:, i]); c0 = np.angle(np.exp(1j * t).mean()); dt = np.angle(np.exp(1j * (t - c0))); c = c0 + (dt.min() + dt.max()) / 2   # midpoint of the pad's span
        kf = (22.55 - deg) / 22.55                                                     # pad half-width 22.55 deg (STL)
        for me in mes:
            v = np.asarray(me.uservert, float).reshape(-1, 3).copy(); r = np.hypot(v[:, i], v[:, j]); th = np.arctan2(v[:, j], v[:, i])
            th = c + np.angle(np.exp(1j * (th - c))) * kf; v[:, i], v[:, j] = r * np.cos(th), r * np.sin(th); me.uservert = v.flatten()


def _end_pockets(spec):
    """1 Nov, a model bug: the end connectors' pad pocket layer (h_B / mA_A_B ..._po_) spanned r 25-35 mm, solid, while the
    real STL (brain/meshes/EndB_LockModule.stl, sliced 3.5-5.5 mm below the pad tips) has pad material only from r 29 mm,
    like the receiver pads (h_rx po: r 29-35). So another end's lock fins had nowhere to go: end<->end could never lock,
    even exactly seated (rotor stopped at 3-5 deg). Cut the pocket: inner vertices of those slices out to r 29 mm."""
    import re
    for me in spec.meshes:
        if not re.search(r'(h_B|mA_A_B)_pad\d_po_s\d$', me.name) or not len(me.uservert): continue
        v = np.asarray(me.uservert, float).reshape(-1, 3).copy(); r = np.hypot(v[:, 0], v[:, 2])        # end axis = body y
        k = r < 0.029; v[k, 0] *= 0.029 / r[k]; v[k, 2] *= 0.029 / r[k]; me.uservert = v.flatten()


def load_model(xml):
    """An XML scene compiled with the same collision as PhysWorld (CAD_COLLIDE): multi_env / walk_env and so the GPU runners
    (gpu_walk, gpu_multi_dock) use it, so every sim path collides the same way (31 Oct)."""
    spec = mujoco.MjSpec.from_file(xml)
    if CAD_COLLIDE: _add_cad_colliders(spec, None)
    _end_pockets(spec); _pad_clearance(spec); _fin_chamfer(spec); return spec.compile()


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
    def __init__(self, module_ids, anchors, randomize=False, seed=1, locks=(), rigid=False):
        self._args = dict(module_ids=list(module_ids), anchors=[dict(a) for a in anchors], randomize=randomize, seed=seed, locks=[dict(l) for l in locks], rigid=rigid)
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
        if IMU_ON:                                                                 # the MPU-6050 in a side receiver's ring (3 Nov; was Spine2's frame bar, 29 Oct)
            for mid in self.ids:
                rx = spec.body(f'{mid}_{SPINE_RX[IMU_RX]}'); sb = rx.parent                       # the receiver and the spine it sits on
                Rr = np.zeros(9); mujoco.mju_quat2Mat(Rr, np.array(rx.quat, float)); n = Rr.reshape(3, 3)[:, 2]   # receiver's outward normal, spine frame
                # srx origin is 1 mm off the spine face (spine +-24 mm, srx at +-25): board back on the face + standoff, centred on the ring
                pos = np.array(rx.pos, float) + n * (IMU_STANDOFF + IMU_HALF[2] - 0.001)
                yb = np.array([0.0, 1.0, 0.0]); Rb = np.stack([np.cross(yb, n), yb, n], 1); qb = np.zeros(4); mujoco.mju_mat2Quat(qb, Rb.ravel())
                self.imu_spec = dict(rx=IMU_RX, body=sb.name, pos=pos, R=Rb)                          # board -> spine (imu.py)
                g = sb.add_geom(); g.name = f'{mid}_imu_board'; g.type = mujoco.mjtGeom.mjGEOM_BOX; g.size = list(IMU_HALF); g.pos = list(pos); g.quat = list(qb)
                g.contype = 0; g.conaffinity = 0; g.group = 2; g.mass = 0; g.rgba = [0.1, 0.3, 0.85, 1]   # visual (2 g: inside the CAD body mass)
                st = sb.add_site(); st.name = f'{mid}_imu'; st.pos = list(pos); st.quat = list(qb)   # sensor axes = board axes (mounting error: imu.py)
                for typ, nm in ((mujoco.mjtSensor.mjSENS_ACCELEROMETER, 'acc'), (mujoco.mjtSensor.mjSENS_GYRO, 'gyro')):
                    sn = spec.add_sensor(); sn.type = typ; sn.objtype = mujoco.mjtObj.mjOBJ_SITE; sn.objname = st.name; sn.name = f'{mid}_imu_{nm}'
        if CAD_COLLIDE: _add_cad_colliders(spec, self.ids)
        _end_pockets(spec); _pad_clearance(spec); _fin_chamfer(spec)                                   # end pad pockets as the STL; real printed fit (1 Nov)
        for b in [b for b in spec.bodies if any(k_ in b.name for k_ in COARSE_ADD)]:                    # a coarse box for each spine receiver housing too: DIK's
            g = b.add_geom(); g.name = f'{b.name}_coarse'; g.type = mujoco.mjtGeom.mjGEOM_BOX   # no-collision limit could not see them and steered
            g.size = [0.001] * 3; g.mass = 0; g.contype = 0; g.conaffinity = 0; g.group = 4   # an end into M2's housing (3 Nov); sized after compile
        vis = os.environ.get('VISUAL_MESH') == '1'
        if vis: _add_visual_meshes(spec, self.ids)                                  # your real part meshes, for pictures only
        # LOCK-AREA PLAY (Nischay 5 Nov): the PLA around each end's lock stays loose even when locked tight - standing locked in a
        # floor connector and pushed at the top tip it wobbles ~2.5 deg, and more when it lifts or lies horizontal (gravity pushes it
        # to the end of the play). Two bend axes (x, z: across the module's long axis y) at both lock areas: End A <-> T1 housing,
        # T3 housing <-> End B. A weak centring spring, light damping (it shakes), range = half the play each way. Named '_flex' so
        # the ideal robot drops it and real_sync.Correction predicts it like the other flex. Each random robot's play differs +-30 %.
        PHYS_ = json.load(open(os.path.join(HERE, 'physics_params.json'))); lp = float(os.environ.get('LOCK_PLAY_DEG', PHYS_.get('lock_play_deg', 2.5))) / 2; prng = np.random.default_rng(seed + 7771)
        for mid in (self.ids if lp > 0 else []):
            for bname, jn in (('T1_Housing_B1Fork', 'J_LA_lockplay'), ('EndB_LockModule', 'J_LB_lockplay')):
                b = spec.body(f'{mid}_{bname}')
                for ax, nm in (([1, 0, 0], 'flexx'), ([0, 0, 1], 'flexz')):
                    r_ = lp * (prng.uniform(0.7, 1.3) if randomize else 1.0)
                    j = b.add_joint(); j.name = f'{mid}_{jn}_{nm}'; j.type = mujoco.mjtJoint.mjJNT_HINGE; j.axis = ax
                    j.range = [-r_, r_]; j.limited = mujoco.mjtLimited.mjLIMITED_TRUE
                    j.stiffness = [PHYS_.get('lock_play_k', 5.0), 0, 0]; j.damping = [0.01, 0, 0]; j.armature = 0.002
                    j.solref_limit = [0.004, 1.0]
        # what the real robot's plastic and gears do, kept even when the ideal robot leaves them out: real_sync.py corrects for them
        self.sag_spec = [dict(name=j.name, body=j.parent.name, axis=np.array(j.axis, float), k=float(j.stiffness[0]), rng=float(j.range[1])) for j in spec.joints if '_flex' in j.name or j.name.endswith('_bl')]
        if rigid:
            # the ideal robot (2 Nov): NO PLA flex and NO gear play - the joints are gone, not just stiff. Even at the stiffest stable
            # limit each gave ~0.02 deg under load, and 81 of them put a 3-ring's tip 8 mm off a perfect plan
            for j in list(spec.joints):
                if '_flex' in j.name or j.name.endswith('_bl'): spec.delete(j)
        # MuJoCo's scratch pad per data copy (contacts, constraints): multi_train.xml asks 200 MB, and Windows reserves all of it for EVERY
        # copy (DIK, one per module for the planner, ...) - 4 teacher workers ran out of RAM / paging file (3 Nov). A docking run uses ~4 MB
        # (2 modules), the pile-up at time 0 before place() ~24 MB; 64 MB = 15x headroom. 'Insufficient arena' at Time = 0 is that pile-up
        # grows with the robot (7 Nov: 3 modules curling into Two heads made ~900 contacts and overflowed 64 MB - a crash, not a result)
        spec.memory = int(float(os.environ.get('ARENA_MB', max(64, 48 * len(module_ids)))) * 2 ** 20)
        self.engine = world_engine(spec); self.m, self.d = self.engine.model, self.engine.data; m = self.m
        for g in [g for g in range(m.ngeom) if m.geom(g).name.endswith('_coarse') and any(k_ in m.geom(g).name for k_ in COARSE_ADD)]:
            # the part's PHYSICS shapes only (9 Nov: with VISUAL_MESH=1 the picture meshes, group 2, were measured too - the boxes changed
            # size and the 'pictures only' switch changed DIK's path: ideal 45 deg ended 54 mm off instead of 1 mm)
            o = [h for h in range(m.ngeom) if m.geom_bodyid[h] == m.geom_bodyid[g] and h != g and m.geom_group[h] != 2]
            box = []
            for h in o:
                R = np.zeros(9); mujoco.mju_quat2Mat(R, m.geom_quat[h]); R = R.reshape(3, 3); c = m.geom_pos[h] + R @ m.geom_aabb[h, :3]; e = np.abs(R) @ m.geom_aabb[h, 3:]
                box.append((c - e, c + e))
            lo = np.min([b_[0] for b_ in box], 0); hi = np.max([b_[1] for b_ in box], 0)
            m.geom_pos[g] = (lo + hi) / 2; m.geom_size[g] = (hi - lo) / 2; m.geom_quat[g] = [1, 0, 0, 0]
            # compiled at the body's origin, MuJoCo flagged it 'same frame as the body' and kept drawing it there, not where it now is
            # (3 Nov: stand_tested, the boxes sat 26 mm off their parts, DIK saw 9 mm of room while the pads already touched)
            m.geom_sameframe[g] = 0; m.geom_rbound[g] = float(np.linalg.norm(m.geom_size[g])); m.geom_aabb[g] = np.r_[0, 0, 0, m.geom_size[g]]
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
        self.engaged = set(); self.lock_t0 = {}
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
        self.sp[:] = self.tgt; self.spv[:] = 0; self.cs = None
        d.ctrl[self.all_act] = self.sp
        mujoco.mj_forward(m, d)
        self.nominal_poses = self.body_poses()             # exactly the Studio's drawn pose (before any settling)
        if not any('floor' in lk['a'] for lk in scene['locks']):
            self.lift_clear()
        for lk in scene['locks']: self.engage(lk)

    def engage(self, lk):
        """the lock is closed: the rotors are turned and the fins sit under the lips - it HOLDS BY CONTACT (Nischay 2 Nov: 'held by
        the mechanical collision of the turned fins', no glue). The relative pose NOW is stored for the planners (DIK, GroupFK use
        it as a constraint); the physics weld is used only with LOCK_WELD=1 (the old shortcut: weld + connector faces off, faster)"""
        k = lock_key(lk); L = self.lock_defs.get(k)
        if L is None or k in self.engaged: return
        m, d = self.m, self.d; i = self.eq[k]
        b1, b2 = m.eq_obj1id[i], m.eq_obj2id[i]
        R1 = d.xmat[b1].reshape(3, 3); R2 = d.xmat[b2].reshape(3, 3)
        data = np.zeros(m.eq_data.shape[1]); data[3:6] = R1.T @ (d.xpos[b2] - d.xpos[b1]); data[6:10] = mat2q(R1.T @ R2); data[10] = 1.0
        m.eq_data[i] = data; self.lock_t0[k] = float(d.time)                         # its pose is taken again once settled (run)
        # ideal (Nischay 2 Nov, option B): real fins while the rotors turn, then the closed lock is rigid - held by fin contact it rattled
        # ~1 mm / 1 deg per control tick, which swung a ring's far end ~15 mm
        if LOCK_WELD or self._args.get('rigid'):
            d.eq_active[i] = 1
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

    def _store_lock_pose(self, k):
        """a closed lock's pose, kept from now on: the planners hold it there and pull back any drift (2 Nov: re-reading it every
        tick accepted every drift - the idle VSEPR walked a lock open in ~15 s)"""
        m, d = self.m, self.d; i = self.eq[k]; b1, b2 = m.eq_obj1id[i], m.eq_obj2id[i]; R1 = d.xmat[b1].reshape(3, 3)
        if d.eq_active[i]: return                                                       # a rigid lock has no slack: its pose stays the one it closed at
        m.eq_data[i, 3:6] = R1.T @ (d.xpos[b2] - d.xpos[b1]); m.eq_data[i, 6:10] = mat2q(R1.T @ d.xmat[b2].reshape(3, 3))

    def lock_drift(self):
        """{lock: (mm, deg)} how far each closed lock has moved from its kept pose"""
        m, d = self.m, self.d; out = {}
        for k in self.engaged:
            if k in self.lock_t0: continue                                             # not settled yet
            i = self.eq[k]; b1, b2 = m.eq_obj1id[i], m.eq_obj2id[i]; R1 = d.xmat[b1].reshape(3, 3)
            dp = R1.T @ (d.xpos[b2] - d.xpos[b1]) - m.eq_data[i, 3:6]
            Rk = np.zeros(9); mujoco.mju_quat2Mat(Rk, m.eq_data[i, 6:10]); Rr = Rk.reshape(3, 3).T @ R1.T @ d.xmat[b2].reshape(3, 3)
            out[k] = (float(np.linalg.norm(dp)) * 1000, math.degrees(math.acos(max(-1.0, min(1.0, (np.trace(Rr) - 1) / 2)))))
        return out

    def release(self, lk):
        """rotor turned back: no weld, the faces collide again, magnets act"""
        k = lock_key(lk); L = self.lock_defs.get(k)
        if L is None or k not in self.engaged: return
        self.d.eq_active[self.eq[k]] = 0
        self.lock_t0.pop(k, None)
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
        closed = set(); flip = set()
        for lk in locks:
            # every END in the lock turns its rotor 45 deg (End A one way, End B the other); end<->end: both at once
            for pr in (lk['a'], lk['b']):
                if 'module' in pr and pr['port'] in ('A', 'B'): closed.add((pr['module'], pr['port']))
            # 1 Nov: end<->end, two facing rotors must turn the same way in the world, so the RECEIVING end (a) turns against
            # its usual sign (seated B<->B: opposite signs reach 44.9 deg, the same sign stops at 3 deg; A<->B the same rule)
            if 'module' in lk['a'] and lk['a']['port'] in ('A', 'B') and lk['b']['port'] in ('A', 'B'): flip.add((lk['a']['module'], lk['a']['port']))
        for i, mid in enumerate(self.ids):
            for e, off in (('A', 7), ('B', 8)):
                ang = math.radians(45) * LOCK_SIGN[e] * (-1 if (mid, e) in flip else 1) if (mid, e) in closed else 0.0
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
        self._seats = np.array([R['seat'] for R in self.rx])

    def _magnets(self):
        """8 magnets per connector, N/S alternating; each end magnet pairs with the nearest receiver magnet (multi_env.py)"""
        d = self.d; pol = np.where(np.arange(8) % 2 == 0, 1.0, -1.0)
        for mid in self.ids:
            for e in 'AB':
                E = self.mod[mid]['end'][e]; tip = d.site_xpos[E['tip']]
                near = np.flatnonzero(((self._seats - tip) ** 2).sum(1) <= (MAG_CUT + 0.03) ** 2)   # one test for all receivers (was 40 % of the sim's time)
                for R in (self.rx[i] for i in near):
                    if R['mod'] == mid: continue
                    if R['kind'] == 'end' and self.ids.index(R['mod']) < self.ids.index(mid): continue   # end pair counted once
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
        w0 = self.w0 * sag9; glide = getattr(self, 'tgt_eff', None) is not None
        tg = self.tgt_eff if glide else self.tgt
        if getattr(self, 'comfort', None): tg = self._comfort(tg, dt)
        e = tg - self.sp
        if self.disturb is not None: e = np.where(np.abs(e) < DIST.DEADBAND, 0.0, e)     # servo deadband
        if glide and getattr(self, 'exact', False):
            # ideal + gliding command: the joint follows the moving command exactly, at most at its top speed
            step = np.clip(e, -w0 * dt, w0 * dt); self.sp += step; self.spv = step / dt
        else:
            vdes = np.sign(e) * np.minimum(w0, np.sqrt(2 * self.amax * np.abs(e)))
            if glide: vdes = np.clip(vdes + self.tgt_rate, -w0, w0)                  # + the command's own speed: no stop at each tick
            self.spv += np.clip(vdes - self.spv, -self.amax * dt, self.amax * dt); self.sp += self.spv * dt
            if getattr(self, 'exact', False):                                          # ideal: the last step lands EXACTLY on the command
                hit = np.abs(self.tgt - self.sp) <= np.maximum(np.abs(self.spv) * dt, 1e-3)
                self.sp[hit] = self.tgt[hit]; self.spv[hit] = 0.0
        d.ctrl[self.all_act] = self.sp
        w = d.qvel[self.all_dof]; tau = d.actuator_force[self.all_act]
        lim = sag9 * np.where(tau * w > 0, self.fr0 * np.clip(1 - np.abs(w) / w0, 0.08, 1.0), self.fr0)
        m.actuator_forcerange[self.all_act, 0] = -lim; m.actuator_forcerange[self.all_act, 1] = lim

    def _comfort(self, tg, dt):
        """SMOOTH motion (Nischay 5 Nov: 'smooth, not jerk to that position' - sliders, Straighten, every button): a command is
        not jumped to at the servo's full 270 deg/s; a gentle path to it starts softly, cruises at most COMFORT_V and slows
        down before it arrives (at most COMFORT_A). The servo then follows that path, so the real robot (real_sync.py sends the
        sim's joints) moves the same way. Studio sessions only (manual.start); teacher / GPU runs keep the bare servo."""
        v, a = self.comfort
        if getattr(self, 'cs', None) is None or len(self.cs) != len(tg): self.cs = self.sp.copy(); self.cv = np.zeros_like(self.sp)
        # a critically damped spring to the command (follows a dragged slider without stopping at each update), its push
        # capped at COMFORT_A and its speed at COMFORT_V (a big jump: soft start, cruise, soft landing)
        e = tg - self.cs; wn = COMFORT_WN
        acc = np.clip(wn * wn * e - 2 * wn * self.cv, -a, a)
        self.cv = np.clip(self.cv + acc * dt, -v, v); self.cs += self.cv * dt
        near = (np.abs(e) < 2e-4) & (np.abs(self.cv) < 2e-3)
        self.cs[near] = tg[near]; self.cv[near] = 0.0
        lock = np.arange(len(tg)) % 9 >= 7; self.cs[lock] = tg[lock]; self.cv[lock] = 0.0   # the lock rotors keep their own timing
        return self.cs

    def _exact(self):
        """IDEAL robot (Nischay 2 Nov: 'just real rotation, math'): after every physics step each arm joint IS its command - set
        exactly, not pulled by a spring (a MuJoCo servo is one: it sagged 0.0x deg under gravity, mm at a ring's tip). The locks
        hold by their fins' contact (engage); the modules' own poses are never overridden (that fought the contact solver: the far
        module sank 10 mm into the floor, 2 Nov)"""
        m, d = self.m, self.d
        k_ = np.flatnonzero(np.arange(len(self.all_act)) % 9 < 7)                     # arm servos (the lock rotors stay physical)
        # the torque each servo really carries (gravity, contacts, locks: what holds the joint still), reported as its force - the
        # motor model is off here, so DIK's 'servo at its limit' rule and the load % read this against the ideal 50 kg.cm
        dv = self.all_dof[k_]; qa = m.jnt_qposadr[m.actuator_trnid[self.all_act[k_], 0]]
        tau = d.qfrc_bias[dv] - d.qfrc_passive[dv] - d.qfrc_constraint[dv]; d.actuator_force[self.all_act[k_]] = tau
        # ...exact only up to its 50 kg.cm (Nischay 2 Nov): a joint that would need more is BLOCKED (fins, floor, another part) and
        # stalls like a real servo - it pushes with its full torque and no more, and its command restarts from where it is. An
        # unlimited exact joint forced the fins through the lips and a lock came open
        # (the torque is averaged over ~20 ms: single-step spikes from contacts read as 'blocked' and let joints go; a stalled servo
        # HOLDS still - released with its speed, a joint coasted past its target, 2 Nov)
        self.tau_f = tau if getattr(self, 'tau_f', None) is None else 0.95 * self.tau_f + 0.05 * tau
        lim = self.fr0[k_]; stall = np.abs(self.tau_f) > lim
        d.qfrc_applied[dv] = np.where(stall, np.clip(tau, -lim, lim), 0.0)
        ok = ~stall; d.qpos[qa[ok]] = self.sp[k_[ok]]; d.qvel[dv[ok]] = self.spv[k_[ok]]
        self.sp[k_[stall]] = d.qpos[qa[stall]]; self.spv[k_[stall]] = 0.0; d.qvel[dv[stall]] = 0.0

    def run(self, seconds, extra=None):
        """advance with gravity, contacts, magnets and servos; extra = (body, force3) applied meanwhile"""
        m, d = self.m, self.d
        n = max(1, int(round(seconds / m.opt.timestep)))
        peak = 0.0
        # glide (Nischay 2 Nov: 'stepwise, I want it smooth like a robot arm'): a new command is not jumped to and stopped at - it
        # moves evenly over this run, so the joints keep a steady speed from one control tick to the next
        if getattr(self, 'glide', False): frm = self.sp.copy(); self.tgt_rate = (self.tgt - frm) / (n * m.opt.timestep)
        for k in range(n):
            if getattr(self, 'glide', False) and k % 5 == 0: self.tgt_eff = frm + (self.tgt - frm) * min(1.0, (k + 5) / n)
            d.xfrc_applied[:] = 0
            if k % 10 == 0: self._refresh_rx()
            self._magnets()
            if self.disturb is not None: self.disturb.apply(m.opt.timestep)          # floor shake, bumps, air
            if extra is not None: d.xfrc_applied[extra[0], :3] += extra[1]
            if k % 5 == 0:
                self._servo()
                peak = max(peak, float(np.abs(d.actuator_force[self.all_act]).max() / STALL * 100))
            self.engine.step()
            if getattr(self, 'exact', False): self._exact()
            if self.rec is not None and d.time - self.rec['last'] >= self.rec['dt'] - 1e-9:
                self.rec['last'] = d.time; fr_ = {'t': round(float(d.time), 3), 'p': self.body_poses()}
                if getattr(self, 'rec_extra', None): fr_['x'] = self.rec_extra()                  # e.g. the connector dots of THIS moment (manual.py)
                self.rec['frames'].append(fr_)
            if not np.isfinite(d.qpos).all(): self.tgt_eff = None; return peak, False
            if k % 100 == 0:
                for lk_ in [x for x, t in self.lock_t0.items() if d.time - t >= 0.3]: self._store_lock_pose(lk_); del self.lock_t0[lk_]   # settled in its slack
            if k % 100 == 0 and getattr(self, 'on_tick', None): self.on_tick()     # e.g. snap.Snapper.tick: pictures during the run
        self.tgt_eff = None
        return peak, True

    def body_poses(self, d=None):
        """every drawn part's pose (Studio frame); d = another MjData of this model (e.g. real_sync's telemetry rebuild)"""
        d = self.d if d is None else d; out = []
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
