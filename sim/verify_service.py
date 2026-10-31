"""verify_service.py — the v2 planner's VERIFY service (robo4 docs/TRANSFORM_PLANNER_V2_PROMPT.md §5).

Real contact/force physics (MuJoCo, the train_v2.xml module: ST3215 position servos limited
to 2.7 N.m, PLA flex + backlash joints, mesh contact hulls). Locks are weld constraints that
switch on when a dock closes and off when a lock is peeled; floor receivers weld an end to
the world. No hardcoded joint couplings.

Endpoints (JSON over HTTP, CORS open, http://127.0.0.1:8771):
  GET  /health
  POST /check_static {scene}                      -> hold the pose 2 s: torque peaks, drift, pass/fail
  POST /rehearse     {scene, plan, n_robots, seed} -> run the plan on n randomized robots: per-step success
  POST /measure_tags {scene}                      -> sim-measured static tags (contacts, height, holds)

`scene` is what the Studio's assembly already knows: every module's base frame (v2 world:
metres, Y up; connector A at the origin, +Z = A's outward normal) + 7 joint angles (rad,
0 = straight), and the locks. The frame/sign match to MuJoCo comes from v2_calib_fit.json
(fitted by v2_calibrate.py: 0.00 mm on every body).

Run:  py -3.12 C:\\TETROBOT\\sim\\verify_service.py
"""
from paths import tpath
import json, math, os, sys, time, traceback, tempfile
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from concurrent.futures import ProcessPoolExecutor
import numpy as np
import mujoco

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, 'train_v2.xml')
CAL = json.load(open(os.path.join(HERE, 'v2_calib_fit.json')))
R_BM = np.array(CAL['R']); T_BM = np.array(CAL['t']); SIGNS = np.array(CAL['signs'], float)
JOINTS = ['T1_twist', 'B1_bend', 'B2_bend', 'T2_twist', 'B3_bend', 'B4_bend', 'T3_twist']
PORT_BODY = {'A': 'EndA_LockModule', 'B': 'EndB_LockModule', 'S1A': 'Spine1_B1B2', 'S1B': 'Spine1_B1B2', 'S2A': 'Spine2_B3B4', 'S2B': 'Spine2_B3B4'}
STALL = 2.7
PORT = int(os.environ.get('VERIFY_PORT', '8771'))
VIEW_BODIES = ['EndA_LockModule', 'L1_LockRotor_A', 'T1_Housing_B1Fork', 'Spine1_B1B2', 'T2_Housing_B2Fork_GROUND',
               'T2_Ring_B3Fork', 'Spine2_B3B4', 'T3_Housing_B4Fork', 'EndB_LockModule', 'L2_LockRotor_B']
HOLD_DRIFT_MM = 10.0   # still moving this much after settling = not holding
SAG_MM = 60.0          # settled this far from the planned pose = the plan's geometry is wrong (estimate)
TOUCH_N = 2.0          # a light touch at the top (estimate; the Studio's static check uses the same minimum tip push)
TOUCH_FALL_MM = 30.0   # 3 s after the touch it should be back; still this far away = it fell or slipped (estimate)

# v2 world (Y up) -> MuJoCo world (Z up): rotate +90 deg about X
C = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], float)


def quat_to_mat(q):  # x, y, z, w (v2 convention)
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def mat_to_quat_wxyz(R):
    q = np.zeros(4); mujoco.mju_mat2Quat(q, np.asarray(R, float).flatten()); return q


def module_frame_world(base):
    """MuJoCo world pose of a module's `module_frame` body from its v2 base frame."""
    Rb = C @ quat_to_mat(base['q'])
    pb = C @ np.array(base['p'], float)
    R = Rb @ R_BM.T
    p = pb - R @ T_BM
    return p, R


def lock_key(lk):
    a = lk['a']; b = lk['b']
    sa = ('F:' + a['floor']) if 'floor' in a else f"{a['module']}.{a['port']}"
    return f"{sa}|{b['module']}.{b['port']}"


BASE_PLAY = ('base_tilt_a', 'base_tilt_b', 'base_twist_play', 'base_lift')


def a_anchored(all_locks):
    """modules whose End A sits in a floor receiver at some point"""
    return {lk['b']['module'] for lk in all_locks if 'floor' in lk['a'] and lk['b']['port'] == 'A'}


def lock_bodies(lk, play_mods):
    """(body1, body2) of a lock's weld. A floor lock on End A of a module with receiver play welds
    its ROOT, so the measured play (tilt +-1.5 deg at 175 N.m/rad, twist, 0.5 mm lift) sits in the joint chain."""
    a, b = lk['a'], lk['b']
    if 'floor' in a:
        body = 'module_frame' if (b['port'] == 'A' and b['module'] in play_mods) else PORT_BODY[b['port']]
        return f"{b['module']}_{body}", 'world'
    return f"{a['module']}_{PORT_BODY[a['port']]}", f"{b['module']}_{PORT_BODY[b['port']]}"


def build_model(module_ids, all_locks):
    """One MuJoCo model: every module free (freejoint on module_frame), every lock that can
    ever exist a weld equality (toggled at run time), contacts between locked bodies off."""
    play_mods = a_anchored(all_locks)
    scene = mujoco.MjSpec.from_file(TEMPLATE)
    scene.delete(scene.body('module_frame'))
    try:
        scene.delete(scene.body('target_rx'))
    except Exception:
        pass
    for mid in module_ids:
        child = mujoco.MjSpec.from_file(TEMPLATE)
        # the template's End A sits on the floor receiver's play joints (the anchored training rig).
        # Keep them for a module that is anchored by End A at some point (they are locked shut while it is free);
        # a module never anchored by A gets End A rigid to its root.
        if mid not in play_mods:
            for jn in BASE_PLAY:
                child.delete(child.joint(jn))
        fr = scene.worldbody.add_frame()
        fr.attach_body(child.body('module_frame'), f'{mid}_', '')
        scene.body(f'{mid}_module_frame').add_freejoint()
    for lk in all_locks:
        n1, n2 = lock_bodies(lk, play_mods)
        eq = scene.add_equality(type=mujoco.mjtEq.mjEQ_WELD, objtype=mujoco.mjtObj.mjOBJ_BODY, name1=n1, name2=n2)
        if n2 != 'world':
            scene.add_exclude(bodyname1=n1, bodyname2=n2)
        eq.name = lock_key(lk)
        eq.active = False
        # a closed lock is stiff: the default soft weld let a standing module lean ~6 deg
        eq.solref = [2 * scene.option.timestep, 1.0]
        eq.solimp = [0.99, 0.999, 0.0005, 0.5, 2]
    m = scene.compile()
    return m, scene


class Robot:
    """One model + data with helpers to put a v2 Config into it."""

    def __init__(self, module_ids, all_locks):
        self.ids = module_ids
        self.m, _ = build_model(module_ids, all_locks)
        self.d = mujoco.MjData(self.m)
        m = self.m
        self.qadr = {mid: [m.joint(f'{mid}_J_{j}').qposadr[0] for j in JOINTS] for mid in module_ids}
        self.act = {mid: [m.actuator(f'{mid}_m_{j}').id for j in JOINTS] for mid in module_ids}
        self.free = {mid: m.joint(m.body(f'{mid}_module_frame').jntadr[0]).qposadr[0] for mid in module_ids}
        self.frame = {mid: m.body(f'{mid}_module_frame').id for mid in module_ids}
        self.eq = {m.eq(i).name: i for i in range(m.neq)}
        self.play = {}
        for mid in module_ids:
            js = [m.joint(f'{mid}_{jn}').id for jn in BASE_PLAY if any(m.joint(j).name == f'{mid}_{jn}' for j in range(m.njnt))]
            if js: self.play[mid] = (js, m.jnt_range[js].copy())
        self.play_mods = set(self.play)
        self.view_names = [(mid, b) for mid in module_ids for b in VIEW_BODIES]
        self.view_bodies = [m.body(f'{mid}_{b}').id for mid, b in self.view_names]
        self.all_act = np.array([a for mid in module_ids for a in self.act[mid]])

    def set_config(self, cfg):
        """Teleport to a scene (module bases + joint angles), velocities zero."""
        m, d = self.m, self.d
        for mod in cfg['modules']:
            mid = mod['id']
            p, R = module_frame_world(mod['base'])
            a = self.free[mid]
            d.qpos[a:a + 3] = p; d.qpos[a + 3:a + 7] = mat_to_quat_wxyz(R)
            for k, adr in enumerate(self.qadr[mid]):
                d.qpos[adr] = SIGNS[k] * mod['rad'][k]
                d.ctrl[self.act[mid][k]] = SIGNS[k] * mod['rad'][k]
        for mid, (js, _) in self.play.items():
            d.qpos[[m.jnt_qposadr[j] for j in js]] = 0.0
        d.qvel[:] = 0
        mujoco.mj_forward(m, d)
        if not any('floor' in lk['a'] for lk in cfg.get('locks', [])):
            self.lift_out_of_floor()

    def lift_out_of_floor(self):
        """The Studio model seats the end pads on the floor; the MuJoCo hulls are a little
        bigger. Raise a free-standing robot until no hull is inside the floor (it then settles)."""
        m, d = self.m, self.d
        floor = m.geom('floor').id
        for _ in range(4):
            pen = [d.contact[i].dist for i in range(d.ncon) if floor in (d.contact[i].geom1, d.contact[i].geom2)]
            low = min(pen) if pen else 0.0
            if low >= -0.0005: return -low
            for mid in self.ids:
                d.qpos[self.free[mid] + 2] += -low + 0.0005
            mujoco.mj_forward(m, d)

    def targets(self, cfg):
        out = np.zeros(self.m.nu)
        out[:] = self.d.ctrl
        for mod in cfg['modules']:
            for k, a in enumerate(self.act[mod['id']]):
                out[a] = SIGNS[k] * mod['rad'][k]
        return out

    def relpose_now(self, lk):
        """Weld data so that the lock holds the two bodies exactly where they are now."""
        m, d = self.m, self.d
        i = self.eq[lock_key(lk)]
        b1, b2 = m.eq_obj1id[i], m.eq_obj2id[i]
        # MuJoCo weld eq_data: [anchor(3), relpos(3), relquat(4), torquescale]; relpose of body2 in body1's frame
        R1 = d.xmat[b1].reshape(3, 3); R2 = d.xmat[b2].reshape(3, 3)
        relpos = R1.T @ (d.xpos[b2] - d.xpos[b1])
        relq = mat_to_quat_wxyz(R1.T @ R2)
        out = np.zeros(self.m.eq_data.shape[1]); out[3:6] = relpos; out[6:10] = relq; out[10] = 1.0
        return out

    def lock_error(self, lk):
        """How far the two bodies are from the pose the lock will hold (mm, deg)."""
        i = self.eq[lock_key(lk)]
        m, d = self.m, self.d
        data = m.eq_data[i]
        b1, b2 = m.eq_obj1id[i], m.eq_obj2id[i]
        R1 = d.xmat[b1].reshape(3, 3); R2 = d.xmat[b2].reshape(3, 3)
        relpos = R1.T @ (d.xpos[b2] - d.xpos[b1])
        Rt = np.zeros(9); mujoco.mju_quat2Mat(Rt, data[6:10]); Rt = Rt.reshape(3, 3)
        dR = Rt.T @ (R1.T @ R2)
        ang = math.degrees(math.acos(max(-1.0, min(1.0, (np.trace(dR) - 1) / 2))))
        return float(np.linalg.norm(relpos - data[3:6]) * 1000), ang

    def randomize(self, rng):
        m = self.m
        m.body_mass[1:] *= rng.uniform(0.92, 1.08, m.nbody - 1)
        k = rng.uniform(0.8, 1.2, m.nu)
        m.actuator_gainprm[:, 0] *= k; m.actuator_biasprm[:, 1] *= k
        m.actuator_forcerange[:, 1] = STALL * rng.uniform(0.85, 1.0, m.nu); m.actuator_forcerange[:, 0] = -m.actuator_forcerange[:, 1]
        m.geom_friction[:, 0] *= rng.uniform(0.7, 1.4)
        for j in range(m.njnt):
            n = m.joint(j).name
            if '_flex' in n: m.jnt_stiffness[j] *= rng.uniform(0.6, 1.5)
            if n.endswith('_bl'): m.jnt_range[j] *= rng.uniform(0.0, 2.0)
        t = math.radians(rng.uniform(0, 1.5)); ph = rng.uniform(0, 2 * math.pi)
        m.opt.gravity[:] = 9.81 * np.array([math.sin(t) * math.cos(ph), math.sin(t) * math.sin(ph), -math.cos(t)])

    def run(self, seconds, ctrl_from=None, ctrl_to=None):
        """Advance; ctrl ramps linearly from ctrl_from to ctrl_to. Returns (peak torque %, ok)."""
        m, d = self.m, self.d
        n = max(1, int(seconds / m.opt.timestep))
        peak = 0.0
        for i in range(n):
            if ctrl_from is not None:
                d.ctrl[:] = ctrl_from + (ctrl_to - ctrl_from) * min(1.0, (i + 1) / n)
            mujoco.mj_step(m, d)
            if i % 10 == 0:
                f = np.abs(d.actuator_force[self.all_act]).max() / STALL * 100
                peak = max(peak, float(f))
            rec = getattr(self, 'rec', None)
            if rec is not None and d.time - rec['last'] >= rec['dt'] - 1e-9:
                rec['last'] = d.time; rec['frames'].append({'t': round(float(d.time), 3), 'p': self.body_poses()})
        ok = bool(np.isfinite(d.qpos).all())
        return peak, ok

    def body_positions(self):
        return {mid: self.d.xpos[self.frame[mid]].copy() for mid in self.ids}

    def body_poses(self):
        """Every part of every module, in the Studio's v2 world (metres, Y up): flat [x,y,z,qx,qy,qz,qw] per body."""
        m, d = self.m, self.d
        out = []
        for b in self.view_bodies:
            pos = C.T @ d.xpos[b]; R = C.T @ d.xmat[b].reshape(3, 3)
            q = np.zeros(4); mujoco.mju_mat2Quat(q, R.flatten())
            out += [round(float(v), 5) for v in (*pos, q[1], q[2], q[3], q[0])]
        return out

    def port_positions(self):
        """World position of every module's ends and spines (what docking and support care about)."""
        out = {}
        for mid in self.ids:
            for b in ('EndA_LockModule', 'Spine1_B1B2', 'Spine2_B3B4', 'EndB_LockModule'):
                out[f'{mid}.{b}'] = self.d.xpos[self.m.body(f'{mid}_{b}').id].copy()
        return out


def expected_positions(rb, cfg):
    """Where each module_frame should be in a scene (MuJoCo world)."""
    return {mod['id']: module_frame_world(mod['base'])[0] for mod in cfg['modules']}


def activate_locks(rb, cfg_locks):
    want = {lock_key(lk) for lk in cfg_locks}
    for name, i in rb.eq.items():
        rb.d.eq_active[i] = name in want
    # receiver play only exists while End A is in a receiver; a free module's End A is rigid to its root
    in_rx = {lk['b']['module'] for lk in cfg_locks if 'floor' in lk['a'] and lk['b']['port'] == 'A'}
    for mid, (js, rng) in rb.play.items():
        if mid in in_rx: rb.m.jnt_range[js] = rng
        else: rb.m.jnt_range[js] = np.array([[0.0, 1e-7]] * len(js))


def check_static(scene):
    t0 = time.time()
    mods = [m['id'] for m in scene['modules']]
    rb = Robot(mods, scene['locks'])
    rb.set_config(scene)
    for lk in scene['locks']:
        rb.m.eq_data[rb.eq[lock_key(lk)]] = rb.relpose_now(lk)
    activate_locks(rb, scene['locks'])
    mujoco.mj_forward(rb.m, rb.d)
    eq_rows = rb.d.efc_type[:rb.d.nefc] == mujoco.mjtConstraint.mjCNSTR_EQUALITY
    weld_resid = float(np.abs(rb.d.efc_pos[:rb.d.nefc][eq_rows]).max()) if eq_rows.any() else 0.0
    planned = rb.port_positions()
    rb.run(0.5)                       # settle: backlash takes up, PLA flexes, a free robot sits down
    # then two 1 s windows: the PLA structure is underdamped and sways, so compare the
    # windows' AVERAGE positions (a fall moves the average, a sway does not)
    def window():
        pk, okw, samples = 0.0, True, []
        for _ in range(25):
            p, o = rb.run(0.04); pk = max(pk, p); okw = okw and o
            samples.append(rb.port_positions())
        return pk, okw, {k: np.mean([s[k] for s in samples], 0) for k in samples[0]}, samples
    p1, ok1, A, sa = window()
    p2, ok2, B, sb = window()
    peak, ok = max(p1, p2), ok1 and ok2
    mean = {k: (A[k] + B[k]) / 2 for k in A}
    sag_k = max(planned, key=lambda k: float(np.linalg.norm(mean[k] - planned[k])))
    sag = float(np.linalg.norm(mean[sag_k] - planned[sag_k])) * 1000
    drift = max(float(np.linalg.norm(B[k] - A[k])) for k in A) * 1000
    sway = max(float(np.linalg.norm(s[k] - mean[k])) for s in sa + sb for k in mean) * 1000
    # TOUCH: a light push at the top (estimate: TOUCH_N) for 0.5 s in 4 directions, then let go; it must come back
    links = [b for b in range(1, rb.m.nbody) if rb.m.body_mass[b] > 0.005]
    touch, give = [], []
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        topb = max(links, key=lambda b: rb.d.xpos[b][2])
        n = int(0.5 / rb.m.opt.timestep)
        for _ in range(n):
            rb.d.xfrc_applied[:] = 0; rb.d.xfrc_applied[topb, :3] = [TOUCH_N * dx, TOUCH_N * dy, 0]
            mujoco.mj_step(rb.m, rb.d)
        pushed = rb.port_positions()
        give.append(max(float(np.linalg.norm(pushed[k] - mean[k])) for k in mean) * 1000)
        rb.d.xfrc_applied[:] = 0
        rb.run(2.5)                                   # the PLA structure sways back slowly (measured: ~3 s)
        w = []
        for _ in range(10):
            rb.run(0.05); w.append(rb.port_positions())
        now = {k: np.mean([x[k] for x in w], 0) for k in w[0]}
        touch.append(max(float(np.linalg.norm(now[k] - mean[k])) for k in mean) * 1000)
    touch_mm = max(touch); give_mm = max(give)
    torque = {}
    for mid in mods:
        torque[mid] = {JOINTS[k]: round(float(abs(rb.d.actuator_force[a]) / STALL * 100), 1) for k, a in enumerate(rb.act[mid])}
    worst = max(v for t in torque.values() for v in t.values())
    ok = ok and bool(np.isfinite(rb.d.qpos).all())
    passed = ok and worst <= 70 and drift < HOLD_DRIFT_MM and sag < SAG_MM
    fragile = touch_mm >= TOUCH_FALL_MM   # it stands, but a light touch knocks it over (a straight module on its pad: really like that)
    return {'ok': passed, 'finite': ok, 'max_torque_pct': round(worst, 1), 'peak_torque_pct': round(peak, 1),
            'sag_mm': round(sag, 1), 'sag_where': sag_k, 'sway_mm': round(sway, 1), 'touch_mm': round(touch_mm, 1), 'touch_give_mm': round(give_mm, 1), 'touch_n': TOUCH_N, 'fragile': bool(fragile),
            'warnings': [f'fragile: a {TOUCH_N:.0f} N touch at the top knocks it {touch_mm:.0f} mm out of place'] if fragile else [], 'drift_mm': round(drift, 1), 'weld_residual': round(weld_resid, 5),
            'torque_pct': torque, 'seconds': round(time.time() - t0, 2),
            'reasons': ([] if passed else [r for r in [
                None if ok else 'simulation became unstable',
                f'a joint holds {worst:.0f}% of stall (budget 70%)' if worst > 70 else None,
                f'it keeps moving while holding: {drift:.0f} mm/s (falling or sliding)' if drift >= HOLD_DRIFT_MM else None,
                f'{sag_k} sags {sag:.0f} mm from the planned pose (backlash + flex; limit {SAG_MM:.0f} mm, estimate)' if sag >= SAG_MM else None] if r])}


# ── plan rehearsal ──────────────────────────────────────────────────────────

# ESTIMATES (not measured): the closed-loop docking controller (walk.py Walker: approach,
# camera judge, hover, seat) starts its approach from a pose near the receiver, so the plan
# only has to bring the end within its approach range. dock_side.py runs started further out.
CAPTURE_MM, CAPTURE_DEG = 60.0, 25.0
TRACK_MM = 150.0                      # an end/spine this far from the plan = it ended up somewhere else (fell, tipped over) (estimate)
# smaller offsets (lean on a pad, PLA flex, backlash) are reported as track_mm; they matter at the NEXT dock, which checks its own approach range
SPEEDUP = 0.5                         # run pose moves at 2x real speed (still quasi-static: <= 70 deg/s)


def rehearse_one(args):
    scene, plan, seed = args
    rng = np.random.default_rng(seed)
    mods = [m['id'] for m in scene['modules']]
    all_locks = {}
    for lk in scene['locks']: all_locks[lock_key(lk)] = lk
    for st in plan['steps']:
        for lk in st['scene']['locks']: all_locks[lock_key(lk)] = lk
    rb = Robot(mods, list(all_locks.values()))
    ref = Robot(mods, list(all_locks.values()))  # un-randomized: where the plan says the parts are
    # weld targets: for every lock, the relative pose in the FIRST scene where it is locked
    for name, lk in all_locks.items():
        src = scene if any(lock_key(x) == name for x in scene['locks']) else next(st['scene'] for st in plan['steps'] if any(lock_key(x) == name for x in st['scene']['locks']))
        rb.set_config(src)
        rb.m.eq_data[rb.eq[name]] = rb.relpose_now(lk)
    rb.randomize(rng)
    rb.set_config(scene)
    activate_locks(rb, scene['locks'])
    rb.run(0.4)
    res = []
    cur_locks = list(scene['locks'])
    for st in plan['steps']:
        verb = st['verb']; s_scene = st['scene']
        r = {'ok': True, 'torque_pct': 0.0, 'track_mm': 0.0}
        try:
            if verb == 'pose_move':
                legs = [*st.get('via', []), s_scene]
                each = max(0.3, st['durationS'] * SPEEDUP / len(legs))
                for leg in legs:
                    tgt = rb.targets(leg)
                    peak, ok = rb.run(each, rb.d.ctrl.copy(), tgt)
                    r['torque_pct'] = max(r['torque_pct'], peak)
                    if not ok: r['ok'] = False; r['why'] = 'simulation unstable'; break
                rb.run(0.3)
            elif verb in ('dock', 'walk_step'):
                new = [lk for lk in s_scene['locks'] if lock_key(lk) not in {lock_key(x) for x in cur_locks}]
                for lk in new:
                    emm, edeg = rb.lock_error(lk)
                    r['dock_err_mm'] = round(emm, 1); r['dock_err_deg'] = round(edeg, 1)
                    if emm > CAPTURE_MM or edeg > CAPTURE_DEG:
                        r['ok'] = False; r['why'] = f'end arrives {emm:.0f} mm / {edeg:.0f} deg off (approach range {CAPTURE_MM:.0f} mm / {CAPTURE_DEG:.0f} deg, estimate)'
                if r['ok']:
                    # the docking controller seats the end gently: pull it in on a soft weld, then lock stiff
                    ids = [rb.eq[lock_key(lk)] for lk in new]
                    stiff = rb.m.eq_solref[ids].copy()
                    rb.m.eq_solref[ids] = [0.08, 1.0]
                    activate_locks(rb, s_scene['locks']); cur_locks = list(s_scene['locks'])
                    peak1, _ = rb.run(1.0)
                    rb.m.eq_solref[ids] = stiff
                    peak, ok = rb.run(0.5); r['torque_pct'] = max(peak, peak1)
            elif verb == 'undock':
                activate_locks(rb, s_scene['locks']); cur_locks = list(s_scene['locks'])
                peak, ok = rb.run(1.0); r['torque_pct'] = peak
            # does the robot really sit where the plan says?
            ref.set_config(s_scene); exp = ref.port_positions(); now = rb.port_positions()
            worst = max(exp, key=lambda k: float(np.linalg.norm(now[k] - exp[k])))
            r['track_mm'] = round(float(np.linalg.norm(now[worst] - exp[worst])) * 1000, 1)
            if r['ok'] and r['track_mm'] > TRACK_MM: r['ok'] = False; r['why'] = f"{worst.replace('_LockModule', '').replace('_B1B2', '').replace('_B3B4', '')} ended {r['track_mm']:.0f} mm from where the plan expects it"
            if r['ok'] and r['torque_pct'] > 100: r['ok'] = False; r['why'] = 'a servo saturated'
        except Exception as ex:
            r['ok'] = False; r['why'] = repr(ex)
        r['torque_pct'] = round(r['torque_pct'], 1)
        res.append(r)
        if not r['ok']: break
    return res


def _run_workers(jobs):
    """Rehearse robots in parallel worker processes. (A ProcessPoolExecutor breaks on Windows
    when this service runs without a console: WinError 6 on its semaphore handles.)"""
    import subprocess
    nw = max(1, min(len(jobs), (os.cpu_count() or 4) - 1))
    tmp = tempfile.mkdtemp(prefix='verify_')
    procs = []
    for w in range(nw):
        mine = jobs[w::nw]
        fin, fout = os.path.join(tmp, f'in{w}.json'), os.path.join(tmp, f'out{w}.json')
        json.dump(mine, open(fin, 'w'))
        procs.append((w, fout, subprocess.Popen([sys.executable, os.path.abspath(__file__), '--worker', fin, fout],
                                                stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)))
    out = [None] * len(jobs)
    for w, fout, p in procs:
        p.wait()
        res = json.load(open(fout)) if os.path.exists(fout) else [[{'ok': False, 'why': 'worker crashed', 'torque_pct': 0, 'track_mm': 0}]] * len(jobs[w::nw])
        for k, r in enumerate(res): out[w + k * nw] = r
    return out


def rehearse(scene, plan, n_robots=32, seed=1):
    t0 = time.time()
    n = int(max(1, min(256, n_robots)))
    runs = _run_workers([(scene, plan, seed + i) for i in range(n)])
    steps = []
    for k, st in enumerate(plan['steps']):
        reached = [r for r in runs if len(r) > k]
        ok = [r for r in reached if r[k]['ok']]
        whys = {}
        for r in reached:
            if not r[k]['ok']: whys[r[k].get('why', '?')] = whys.get(r[k].get('why', '?'), 0) + 1
        steps.append({
            'verb': st['verb'], 'label': st.get('label', ''),
            'robots': len(reached), 'passed': len(ok),
            'physics_success': round(len(ok) / max(1, len(reached)), 3),
            'measured_successP': st.get('successP'),
            'torque_peak_pct': round(max([r[k]['torque_pct'] for r in reached] or [0]), 1),
            'track_mm_max': round(max([r[k]['track_mm'] for r in reached] or [0]), 1),
            'dock_err_mm_mean': round(float(np.mean([r[k]['dock_err_mm'] for r in reached if 'dock_err_mm' in r[k]])) if any('dock_err_mm' in r[k] for r in reached) else 0, 1),
            'failures': whys,
        })
    complete = sum(1 for r in runs if len(r) == len(plan['steps']) and all(x['ok'] for x in r))
    expected = (complete / n) * float(np.prod([st.get('successP', 1.0) for st in plan['steps'] if st['verb'] in ('dock', 'walk_step', 'undock')] or [1.0]))
    return {'n_robots': n, 'complete': complete, 'physics_success': round(complete / n, 3),
            'expected_success': round(expected, 3), 'steps': steps, 'seconds': round(time.time() - t0, 1),
            'note': 'physics_success = robots whose every step held up in MuJoCo (servo limits, PLA flex, backlash, randomized); '
                    'expected_success also multiplies the measured dock and peel success rates (the docking controller itself is not re-run here).'}


def simulate(scene, plan=None, seconds=6.0, randomize=True, seed=1, fps=25):
    """GRAVITY ON: run ONE robot in MuJoCo and record every part, for the Studio to play back.
    Nothing is judged here - gravity, contacts, servos, PLA flex and the randomized errors decide what happens.
    With a plan, its steps are executed in order: pose moves = servo targets; a dock latches only if the end
    really is at the receiver (pulled in gently like the magnets); a peel releases the lock."""
    t0 = time.time()
    rng = np.random.default_rng(seed)
    mods = [m['id'] for m in scene['modules']]
    all_locks = {lock_key(lk): lk for lk in scene['locks']}
    for st in (plan or {}).get('steps', []):
        for lk in st['scene']['locks']: all_locks[lock_key(lk)] = lk
    rb = Robot(mods, list(all_locks.values()))
    for name, lk in all_locks.items():
        src = scene if any(lock_key(x) == name for x in scene['locks']) else next(st['scene'] for st in plan['steps'] if any(lock_key(x) == name for x in st['scene']['locks']))
        rb.set_config(src)
        rb.m.eq_data[rb.eq[name]] = rb.relpose_now(lk)
    if randomize: rb.randomize(rng)
    rb.set_config(scene)
    frame0 = rb.body_poses()                               # the drawn (nominal) pose: the Studio aligns its meshes on this
    activate_locks(rb, scene['locks'])
    rb.rec = {'dt': 1.0 / fps, 'last': -1.0, 'frames': []}
    events = []
    cur = list(scene['locks'])
    rb.run(0.5)
    for k, st in enumerate((plan or {}).get('steps', [])):
        verb, sc = st['verb'], st['scene']
        ev = {'step': k, 'verb': verb, 'label': st.get('label', ''), 't': round(float(rb.d.time), 2)}
        if verb == 'pose_move':
            for leg in [*st.get('via', []), sc]:
                rb.run(max(0.3, st['durationS'] * SPEEDUP / (len(st.get('via', [])) + 1)), rb.d.ctrl.copy(), rb.targets(leg))
            rb.run(0.3)
        elif verb in ('dock', 'walk_step'):
            new = [lk for lk in sc['locks'] if lock_key(lk) not in {lock_key(x) for x in cur}]
            errs = [rb.lock_error(lk) for lk in new]
            reach = [lk for lk, (emm, edeg) in zip(new, errs) if emm <= CAPTURE_MM and edeg <= CAPTURE_DEG]
            ev['end_off_mm'] = [round(e[0], 1) for e in errs]
            if reach:
                ids = [rb.eq[lock_key(lk)] for lk in reach]; stiff = rb.m.eq_solref[ids].copy()
                rb.m.eq_solref[ids] = [0.08, 1.0]
                cur = cur + reach; activate_locks(rb, cur); rb.run(1.0)
                rb.m.eq_solref[ids] = stiff
            ev['latched'] = len(reach) == len(new)
            if not ev['latched']: ev['note'] = 'the end is not at the receiver: no lock'
            rb.run(0.5)
        elif verb == 'undock':
            gone = {lock_key(x) for x in cur} - {lock_key(x) for x in sc['locks']}
            cur = [x for x in cur if lock_key(x) not in gone]
            activate_locks(rb, cur); rb.run(1.0)
        events.append(ev)
    rb.run(max(1.5, float(seconds)) if not plan else 2.0)
    fr = rb.rec['frames']; rb.rec = None
    return {'bodies': rb.view_names, 'frame0': frame0, 'frames': fr, 'events': events, 'fps': fps,
            'randomized': bool(randomize), 'seed': seed, 'finite': bool(np.isfinite(rb.d.qpos).all()), 'seconds': round(time.time() - t0, 1)}


def measure_tags(scene):
    out = check_static(scene)
    mods = [m['id'] for m in scene['modules']]
    rb = Robot(mods, scene['locks']); rb.set_config(scene)
    for lk in scene['locks']: rb.m.eq_data[rb.eq[lock_key(lk)]] = rb.relpose_now(lk)
    activate_locks(rb, scene['locks']); rb.run(1.0)
    floor = rb.m.geom('floor').id
    contacts = set()
    for i in range(rb.d.ncon):
        c = rb.d.contact[i]
        if floor in (c.geom1, c.geom2):
            other = c.geom2 if c.geom1 == floor else c.geom1
            contacts.add(rb.m.body(rb.m.geom_bodyid[other]).name)
    zmax = float(max(rb.d.xpos[1:, 2]))
    return {'tags': {'ground_contacts': {'value': len(contacts), 'measuredBy': 'sim'},
                     'stands_upright': {'value': out['ok'] and zmax > 0.2, 'measuredBy': 'sim'}},
            'contact_bodies': sorted(contacts), 'static': out}


class H(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code)
        for k, v in (('Content-Type', 'application/json'), ('Access-Control-Allow-Origin', '*'), ('Access-Control-Allow-Headers', 'Content-Type'), ('Content-Length', str(len(b)))):
            self.send_header(k, v)
        self.end_headers(); self.wfile.write(b)

    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in (('Access-Control-Allow-Origin', '*'), ('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'), ('Access-Control-Allow-Headers', 'Content-Type')):
            self.send_header(k, v)
        self.end_headers()

    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path.startswith('/shapes'):
            from shape_search import SPOTS
            shapes = json.load(open(tpath('logs/shapes.json')))
            okp = tpath('logs/shapes_ok.json'); clear = {x['index'] for x in json.load(open(okp))} if os.path.exists(okp) else None
            gp = tpath('logs/grown_shapes.json'); grown = json.load(open(gp)) if os.path.exists(gp) else []
            return self._send(200, {'spots': SPOTS, 'grown': grown, 'shapes': [dict(x, index=i, clear=(None if clear is None else i in clear)) for i, x in enumerate(shapes)]})
        if self.path.startswith('/transform'):
            # G6: the first SHAPE CHANGE (transform.py), recorded in real physics: shape A -> shape B, with stage events
            from urllib.parse import urlparse, parse_qs
            qs = parse_qs(urlparse(self.path).query); seed = int(qs.get('seed', ['1'])[0]); name = qs.get('name', [''])[0]
            # name = a planned change recorded by tf_run.py (e.g. chain_ABC); none = the first one (transform.py)
            p = os.path.join(tpath('logs'), f'tf_{name}_{seed}.json' if name else f'transform_run_{seed}.json')
            if not os.path.exists(p): return self._send(404, {'ok': False, 'error': f'no recording for robot {seed}: run  py -3.12 transform.py {seed} 25'})
            r = json.load(open(p))
            gp = tpath('logs/gpu_transform_summary.json')
            if os.path.exists(gp): r['measured'] = json.load(open(gp))
            return self._send(200, r)
        if self.path.startswith('/health'):
            return self._send(200, {'ok': True, 'mujoco': mujoco.__version__, 'calibration_mm': CAL['worst_mm']})
        self._send(404, {'ok': False})

    def do_POST(self):
        try:
            n = int(self.headers.get('Content-Length') or 0)
            body = json.loads(self.rfile.read(n) or b'{}')
            if self.path.startswith('/check_static'): return self._send(200, check_static(body['scene']))
            if self.path.startswith('/rehearse'): return self._send(200, rehearse(body['scene'], body['plan'], body.get('n_robots', 32), body.get('seed', 1)))
            if self.path.startswith('/measure_tags'): return self._send(200, measure_tags(body['scene']))
            if self.path.startswith('/build_shape'):
                # G6: build a searched shape in REAL physics with the robot's docking brain, recorded for the Studio
                import shape_build
                shapes = json.load(open(tpath('logs/shapes.json')))
                if 'shape' in body:                                    # a full (e.g. grown) shape description
                    r = shape_build.build(body['shape'], int(body.get('seed', 1)), bool(body.get('randomize', True)), record=20, log=lambda *a: None)
                    return self._send(200, r)
                sh = shapes[int(body['index'])]
                okp = os.path.join(tpath('logs'), 'shapes_ok.json')
                if os.path.exists(okp):
                    hit = next((x for x in json.load(open(okp)) if x['index'] == int(body['index'])), None)
                    if hit: sh = hit                                   # with its collision-free dock order
                r = shape_build.build(sh, int(body.get('seed', 1)), bool(body.get('randomize', True)), record=20, log=lambda *a: None)
                return self._send(200, r)
            if self.path.startswith('/manual/'):
                # the Studio's MANUAL tab: a live session driven by hand (manual.py): start / step (frames + state) / cmd
                import manual
                if self.path.startswith('/manual/start'):
                    return self._send(200, manual.start(body['scene'], seed=int(body.get('seed', 1)), randomize=bool(body.get('randomize', True)),
                                                        disturb=bool(body.get('disturb', True)), judge=body.get('judge', 'off')))
                if self.path.startswith('/manual/step'): return self._send(200, manual.step(body['id'], body.get('wait', 0.4)))
                if self.path.startswith('/manual/cmd'): return self._send(200, manual.command(body['id'], body['cmd']))
            if self.path.startswith('/session/start'):
                from phys_world import session_start
                return self._send(200, session_start(body['scene'], body.get('randomize', True), body.get('seed', 1)))
            if self.path.startswith('/session/step'):
                from phys_world import session_step
                return self._send(200, session_step(body['id'], body.get('seconds', 1.0)))
            if self.path.startswith('/simulate'):
                from phys_world import run_plan
                return self._send(200, run_plan(body['scene'], body.get('plan'), body.get('seconds', 6), body.get('randomize', True), body.get('seed', 1)))
            self._send(404, {'ok': False, 'error': 'unknown path'})
        except Exception as ex:
            self._send(500, {'ok': False, 'error': repr(ex), 'trace': traceback.format_exc()[-1200:]})


if __name__ == '__main__' and len(sys.argv) == 4 and sys.argv[1] == '--worker':
    jobs = json.load(open(sys.argv[2]))
    json.dump([rehearse_one(tuple(j)) for j in jobs], open(sys.argv[3], 'w'))
elif __name__ == '__main__':
    print(f'TETROBOT verify service on http://127.0.0.1:{PORT}  (mujoco {mujoco.__version__}, calibration {CAL["worst_mm"]:.2f} mm)', flush=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
