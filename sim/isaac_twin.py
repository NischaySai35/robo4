"""isaac_twin.py — the REAL robot as Isaac Sim + Newton on Nischay's printed shapes, driven EXACTLY like the real modules.

  brain   = manual.Manual, ideal (the same planner / DIK / VSEPR / skills that drive the real robot), in MuJoCo
  sender  = real_sync.RealSync: every 60 ms the ideal joints + the flex correction (+ the push home) -> board angles
  robot   = Isaac: exact-mesh contact, ST3215 servos (speed, sag, deadband), gear play, PLA flex, the connector magnets, the floor
            receivers; its virtual boards follow the sent angles (real_sync.step_sent, the board's speed setting) and report their
            encoders (shaft angle: no play, no flex) and the Spine2 IMU back to RealSync, as a real board would
Lockstep on the SIMULATED clock (Isaac is slower than real time): every brain tick waits until Isaac has caught up to its time.

SEVERAL TEST CASES AT ONCE, in ONE Isaac world (one sim instance, one GPU read/write per step for everything): each case has its own
brain (own thread), its own floor + receivers + modules, placed apart and TURNED for its surface (manual SURFACE_DEG turns gravity;
one Isaac world has one gravity, so the case is turned the other way instead - relative to its own floor the physics is the same).
   py -3.12 sim/isaac_twin.py PLAN.json [--gui]            PLAN = [{"name", "scene", "surface_deg", "task": ["connect", A, B] | ["skill", NAME]}]
   py -3.12 sim/isaac_twin.py SCENES.json SCENE A B [--gui] (one case, as before)
   env VOXEL_MM (0.5) EVERY (2 s between pictures) REAL (1) IMU (1) SYNC_FB (robot | truth = a perfect camera) TAG
"""
# REUSE-CHECKED: brain = manual.Manual, sender = real_sync.RealSync (+ step_sent / sim_deg_from_board / speed_scale / mpu_reading),
# modules = isaac_module.add_module, world/servos/magnets = isaac_newton. real_sync.Twin is the same idea on MuJoCo (no exact
# shapes); this is the Isaac one. No other Isaac link to the brain exists.
import os, sys, math, time, json, threading
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from paths import tpath
args = [a for a in sys.argv[1:] if not a.startswith('--')]; GUI = '--gui' in sys.argv
SCENES_DEFAULT = tpath('teacher/scenes.json')
if len(args) >= 4: PLAN = [dict(name=f'{args[1]}_{args[2]}_{args[3]}'.replace('.', ''), scenes=args[0], scene=args[1], task=['connect', args[2], args[3]])]
else: PLAN = json.load(open(args[0]))
VOXEL = float(os.environ.get('VOXEL_MM', '0.5')) / 1000; HZ = float(os.environ.get('HZ', '500'));   # 12 Nov: 500 Hz = the same results (flat, slope, ceiling, S2B, wall), half the steps
REAL = os.environ.get('REAL', '1') == '1'
EVERY = float(os.environ.get('EVERY', '2')); SETTLE = float(os.environ.get('SETTLE_S', '0.5')); REC_HZ = 50.0; GAP = float(os.environ.get('GAP_M', '3.0'))
TAG = os.environ.get('TAG', 'twin_' + (PLAN[0]['name'] if len(PLAN) == 1 else os.path.splitext(os.path.basename(args[0]))[0]))
SHOTS = os.environ.get('SHOTS', tpath('logs/isaac_twin')); os.makedirs(SHOTS, exist_ok=True)   # tpath('logs/..') = data/logs
logf = open(os.path.join(SHOTS, f'{TAG}.log'), 'w', encoding='utf-8'); _lk = threading.Lock()
def say(*x):
    with _lk: print(*x, flush=True); print(*x, file=logf, flush=True)

import manual as MAN
import real_sync as RS
from isaac_module import read_module, add_module, PARTS
from isaac_newton import q_mul, q_rot
spec = read_module()
JNAME = {'J_T1_twist': 'T1', 'J_B1_bend': 'B1', 'J_B2_bend': 'B2', 'J_T2_twist': 'T2', 'J_B3_bend': 'B3', 'J_B4_bend': 'B4', 'J_T3_twist': 'T3',
         'J_L1_lock': 'L1', 'J_L2_lock': 'L2'}


def quat_R(q):
    w_, x, y, z = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - w_ * z), 2 * (x * z + w_ * y)], [2 * (x * y + w_ * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w_ * x)],
                     [2 * (x * z - w_ * y), 2 * (y * z + w_ * x), 1 - 2 * (x * x + y * y)]])


class Case:
    """one test: its brain (ideal MuJoCo + RealSync), its place in the Isaac world (Isaac = R * brain + o), its modules / boards"""
    def __init__(self, k, cfg):
        self.k, self.cfg, self.name = k, cfg, cfg['name']; self.log = lambda *x: say(f'[{self.name}]', *x)
        sc = dict(json.load(open(cfg.get('scenes', SCENES_DEFAULT)))[cfg['scene']]); sc['surface_deg'] = float(cfg.get('surface_deg', 0.0))
        if not any('floor' in L['a'] for L in sc['locks']): sc['anchors'] = []      # as manual.py __main__ (NO_ANCHORS): no floor locks, no receivers
        if 'start_deg' in cfg:                                                     # every module's start angles (T1..T3), e.g. hanging on a wall
            for M in sc['modules']: M['rad'] = [math.radians(v) for v in cfg['start_deg']]   # (10 Nov: straight out of a wall needs 2.46 N.m)
        self.sc = sc
        self.S = MAN.Manual(sc, seed=int(cfg.get('seed', 1)), pace=False, judge='off', log=self.log, ideal=True, randomize=False, disturb=False)
        self.S.w.run(2.0); self.bw = self.S.w; self.mids = list(self.bw.ids)
        sd = math.radians(sc['surface_deg']); self.q = np.array([math.cos(-sd / 2), math.sin(-sd / 2), 0, 0]); self.R = quat_R(self.q)   # gravity turned back
        self.o = np.array([GAP * k, 0.0, 0.0 if sc['surface_deg'] < 135 else 1.2])   # a ceiling case hangs 1.2 m up
        self.req = None; self.result = {}; self.cv = threading.Condition(); self.track = []; self.finished = False

    def to_isaac(self, p, q): return self.R @ np.asarray(p) + self.o, q_mul(self.q, q)
    def to_brain_p(self, p): return self.R.T @ (np.asarray(p) - self.o)
    def bpose(self, name):
        b = self.bw.m.body(name).id; return self.bw.d.xpos[b].copy(), self.bw.d.xquat[b].copy()
    def brain_angles(self, mid):
        bd, bw = self.bw.d, self.bw; q = bd.qpos[np.array(bw.mod[mid]['qa'])]
        out = {f'J_{RS.JN[k]}_{"twist" if RS.JN[k][0] == "T" else "bend"}': float(q[k]) for k in range(7)}
        out['J_L1_lock'] = float(bd.qpos[bw.mod[mid]['lockq']['A']]); out['J_L2_lock'] = float(bd.qpos[bw.mod[mid]['lockq']['B']])
        return out


# ---- the brains (main thread, one after the other: Manual's set-up is not thread-safe)
cases = []
for k, cfg in enumerate(PLAN):
    c = Case(k, cfg); cases.append(c); c.log(f'brain ready: {c.mids}, surface {c.sc["surface_deg"]:.0f} deg, floor receivers {[a["id"] for a in c.sc.get("anchors", [])]}, locks {[MAN.lock_key(L) for L in c.S.cur]}')

# ---- the robot: one Isaac world
from isaac_newton import World, Servos, Magnets
# 11 Nov, Nischay: "my values are almost accurate, not perfect" - RAND_SEED > 0 gives the Isaac robot its OWN physical values around
# the nominal ones (the brain keeps the nominal model): bracket springiness / series stiffness x(1 +- 0.3 RAND), gear play
# x(1 +- 0.5 RAND), masses x(1 +- 0.05 RAND), servo strength x(0.85 .. 1.10). Docking must work across such robots, not one.
import copy
RAND_SEED = int(os.environ.get('RAND_SEED', '0')); RAND = float(os.environ.get('RAND', '1.0')) if RAND_SEED else 0.0
RNG = np.random.default_rng(RAND_SEED)


def rand_spec(spec_, label):
    if RAND <= 0: return spec_
    sp = copy.deepcopy(spec_); lines = []
    for n, B in sp['BODY'].items():
        B['mass'] = float(B['mass']) * RNG.uniform(1 - 0.05 * RAND, 1 + 0.05 * RAND)
        J = B.get('joint')
        if not J: continue
        J['bl'] = float(J['bl']) * RNG.uniform(1 - 0.5 * RAND, 1 + 0.5 * RAND)
        if J.get('kser'): J['kser'] = float(J['kser']) * RNG.uniform(1 - 0.3 * RAND, 1 + 0.3 * RAND)
        for fx in J['flex']: fx['k'] = float(fx['k']) * RNG.uniform(1 - 0.3 * RAND, 1 + 0.3 * RAND)
        lines.append(f"{J['name'][2:]} play {math.degrees(J['bl']):.2f} deg, flex k {[round(fx['k'], 1) for fx in J['flex']]}")
    say(f'RANDOM ROBOT {label}: ' + '; '.join(lines[:4]) + ' ...')
    return sp
SUBDIV_PARTS = ['L1_LockRotor_A', 'L2_LockRotor_B']   # vertex-dense lock fins (their vertices meet the socket's SDF); dense End parts were 4.5 M vertices each (10 Nov)
WORLDS = os.environ.get('WORLDS', '0') == '1'   # one Newton world per case: 11 Nov, Newton 1.6 then makes NO mesh-mesh (SDF) contacts at all - off
W = World(gui=GUI, hz=HZ, solver='mujoco', ncon=int(os.environ.get('NCON', '6000' if WORLDS else str(6000 + 2000 * len(cases)))), gravity=9.81,
          voxel=VOXEL, subdiv_parts=SUBDIV_PARTS, worlds=len(cases) if WORLDS else 0)
# 11 Nov: a BOX floor = ~400k mesh-triangle pairs per step per case (most of the 15 ms) and 3+ cases overflowed Newton's 1M buffer ->
# contacts dropped, bases sank 6.3 mm (the old '3+ cases interfere'). Flat cases share ONE plane at z = 0 (cheap, per vertex); turned
# surfaces keep their own box (a plane is infinite: it would cut through the other cases)
PLANE = os.environ.get('PLANE_FLOOR', '1') == '1'
ONE = len(cases) == 1                                                             # one case per run (twin_suite): ANY surface can be a plane
if PLANE and not ONE and any(abs(c.sc['surface_deg']) < 1e-6 for c in cases):
    W.plane_floor = True; W.floor(name='Ground', size=3.0 * len(cases) + 4); W.plane_floor = False
from tetro_env2 import RX_GAP
RX_MESH = (np.array([math.sqrt(0.5), -math.sqrt(0.5), 0, 0]), np.array([0.27644, 0.00594, -0.00065]))   # receiver STL -> its frame (build_v2 / make_pad_hulls)
conns, allpaths, com, joints, params, groups, mid_order, views = [], [], [], [], {}, [], [], []
for c in cases:
    if PLANE and ONE: W.plane_floor = True; W.floor(name=f'c{c.k}/Floor', pos=c.o, quat=c.q, size=2.0); W.plane_floor = False   # slope / wall / ceiling too
    elif not (PLANE and abs(c.sc['surface_deg']) < 1e-6): W.floor(name=f'c{c.k}/Floor', pos=c.o, quat=c.q, size=2.0)
    used = {L['a'].get('floor') for L in c.sc['locks']}
    for an in c.sc.get('anchors', []):
        if os.environ.get('USED_RX', '1') == '1' and an['id'] not in used: continue   # 11 Nov: only receivers in use (each is an SDF shape)
        fid = an['id']; p, q = c.to_isaac(*c.bpose(f'F_{fid}_rx0'))
        rxp = f'/World/c{c.k}/FloorRx_{fid}'; W.part(rxp, 'floor_receiver', p, q, (0.35, 0.35, 0.4), mesh_frame=RX_MESH)
        if WORLDS:   # 11 Nov: with several Newton worlds a STATIC mesh got no contact pairs (End A sank 6.3 mm): a body bolted to the ground
            W.mass(rxp, 0.05); W.fixed(f'/World/c{c.k}/FloorRx_{fid}_bolt', rxp, p, q)
        bm = c.bw.m
        conns.append(dict(name=f'c{c.k}.F:{fid}', module=None, kind='floor', body=None, P=p, Q=q, z=np.array([0, 0, 1.0]), seat=RX_GAP * np.array([0, 0, 1.0]),
                          mags=np.array([bm.site_pos[bm.site(f'F_{fid}_r0_r0_rx_mag{j}').id] for j in range(8)])))
    c.mods = {}
    for mid in c.mids:
        start = {n: c.to_isaac(*c.bpose(f'{mid}_{n}')) for n in PARTS}
        m = add_module(W, rand_spec(spec, f'{c.name}/{mid}'), f'c{c.k}/{mid}', start, REAL); m['off'] = len(allpaths); c.mods[mid] = m
        allpaths += m['paths']; com += m['com']; mid_order.append(f'c{c.k}/{mid}')   # = add_module's module name (magnets group by it)
        conns += [dict(cn, body=cn['body'] + m['off'], name=f'c{c.k}.{mid}.{cn["name"].split(".")[-1]}') for cn in m['conns']]
        for jn, ip, ic, ax, r0 in m['joints']:
            joints.append((f'c{c.k}{mid}:{jn}', ip + m['off'], ic + m['off'], ax, r0)); groups.append(len(mid_order) - 1)
            if m['params']: params[f'c{c.k}{mid}:{jn}'] = m['params'][jn]
    if c.cfg['task'][0] == 'connect':
        c.A = next(x for x in conns if x['name'] == f'c{c.k}.{c.cfg["task"][1]}'); c.B = next(x for x in conns if x['name'] == f'c{c.k}.{c.cfg["task"][2]}')
    c.centre = c.to_isaac(np.mean([c.bpose(f'{m_}_{n}')[0] for m_ in c.mids for n in PARTS], 0), [1, 0, 0, 0])[0]
    up = c.R @ np.array([0, 0, 1.0]); c.view_i = len(views)
    views.append((c.centre + c.R @ np.array([0.15, -1.1, 0.25]), c.centre, up))
    views.append((c.centre + c.R @ np.array([0.5, -0.5, 0.4]), c.centre, up))           # (re-aimed at the socket while docking)
MAG = Magnets(conns, com, mid_order)
# ---- the HANDHELD camera (CAMERA=1, 11 Nov): ArUco tags on the docking end and around the target socket (camera.py's tag images,
# sizes and mount spots, marker_mounts.py), one extra camera at an arbitrary hand-held pose. At CAM_AT s one picture is taken and
# the end's pose RELATIVE to the socket is measured from the tags alone (the camera's own pose cancels) and logged next to the truth
CAMERA = os.environ.get('CAMERA', '0') == '1'; TAGS = {}
if CAMERA:
    import camera as CAM, phys_world as PW
    from isaac_newton import q_rot as _qr
    MOUNTS = json.load(open(os.path.join(CAM.MARK_DIR, 'mounts8_rx.json'))); PLATE = CAM.MARKER_M * (1 + 2 * CAM.BORDER)
    def _frame(n, up):
        z = np.asarray(n, float) / np.linalg.norm(n); y = np.asarray(up, float) - (np.asarray(up, float) @ z) * z; y /= np.linalg.norm(y)
        return np.stack([np.cross(y, z), y, z], 1)
    c = cases[0]; tid = 0
    if c.cfg['task'][0] == 'connect':
        for cn, owner in ((c.A, 'end'), (c.B, 'socket')):
            part = allpaths[cn['body']]; mid_ = cn['name'].split('.')[1]; port = cn['name'].split('.')[-1]
            if port in ('A', 'B'):                                                     # end housing tags: End body frame, up = module axis
                spots = [(k, MOUNTS[k]['pos'], MOUNTS[k]['normal'], [0, 1.0, 0]) for k in MOUNTS if k[0] == port and k[1:].isdigit()]
            else:                                                                      # socket ring tags: srx frame -> its part (Spine) frame
                sb = c.bw.m.body(f'{mid_}_{PW.SPINE_RX[port]}'); sp, sq = np.array(sb.pos), np.array(sb.quat)
                # 11 Nov: marker_mounts' ring spots for side sockets lie INSIDE the spine frame (seen from nowhere); the spine's flat
                # faces ~80 mm above / below the ring, facing the same way as the socket, are in view of the docking end (mounts_rxface.json)
                FACE = json.load(open(os.path.join(CAM.MARK_DIR, 'mounts_rxface.json'))); sn = PW.SPINE_RX[port]
                sb = c.bw.m.body(f'{mid_}_{sn}'); sp, sq = np.array(sb.pos), np.array(sb.quat)
                lift = float(os.environ.get('RXTAG_LIFT_MM', '12')) / 1000            # on a small bracket, level with the ring face (the face spot was inside the shell)
                spots = [(k, sp + _qr(sq, np.asarray(FACE[k]['pos']) + lift * np.asarray(FACE[k]['normal'])), _qr(sq, FACE[k]['normal']), _qr(sq, FACE[k]['up']), f'{mid_}_{sn}') for k in FACE if k.startswith(port)]
            for sp_ in spots:
                k, p_, n_, up_ = sp_[:4]
                R_ = _frame(n_, up_); W.tag(part, f'aruco_{k}', CAM._marker_png(tid), p_, R_, PLATE)
                h = CAM.MARKER_M / 2; TAGS[tid] = dict(owner=owner, body=cn['body'], mk=k, srx=sp_[4] if len(sp_) > 4 else None, corners=np.array([np.asarray(p_) + R_ @ v for v in ([-h, h, 0], [h, h, 0], [h, -h, 0], [-h, -h, 0])]))
                tid += 1
    c.hand_i = len(views); views.append((c.centre + c.R @ np.array([0.4, -0.6, 0.5]), c.centre, c.R @ np.array([0, 0, 1.0])))
    say(f'CAMERA: {len(TAGS)} tags ({sum(t["owner"] == "end" for t in TAGS.values())} on the end, {sum(t["owner"] == "socket" for t in TAGS.values())} round the socket)')
W.view(cases[0].centre + [0.25, -0.85, 0.35], cases[0].centre)
W.snapshots(views, focal=30, size=tuple(int(v) for v in os.environ.get('CAM_RES', '1920x1440').split('x')) if CAMERA else (640, 480))   # tags need pixels (a phone: 12 MP)
HAND_FOCAL = float(os.environ.get('CAM_FOCAL_MM', '18'))                          # the hand-held camera: a phone-like wide lens (~60 deg)
if CAMERA:
    from pxr import UsdGeom as _UG
    _UG.Camera(W.st.GetPrimAtPath(f'/World/Cam{cases[0].hand_i}')).GetFocalLengthAttr().Set(HAND_FOCAL)
t0 = time.time(); W.play()
allrb = W.rigid(allpaths)
FAST = W.fast_poses(allpaths) if os.environ.get('SLOW_READ', '0') != '1' else None   # Newton's state arrays (16 ms -> ~0.1 ms per step)
SERVO = Servos(allrb, joints, kp=spec['KP'], kv=spec['KV'], cap=spec['CAP'], real=REAL, hz=HZ, params=params if REAL else None, groups=groups)
if RAND > 0:                                                                       # each real servo a little weaker / stronger than its rating
    SERVO.fr0 = SERVO.fr0 * RNG.uniform(1 - 0.15 * RAND, 1 + 0.10 * RAND, len(SERVO.fr0))
    say(f'RANDOM ROBOT (RAND_SEED {RAND_SEED}, scale {RAND}): servo strength {np.round(SERVO.fr0.min(), 2)}-{np.round(SERVO.fr0.max(), 2)} N.m')
for c in cases:
    for mid in c.mids:
        for jn, v in c.brain_angles(mid).items(): SERVO.target[f'c{c.k}{mid}:{jn}'] = v     # hold the brain's start pose (End A's lock closed in its receiver)
say(f'Isaac ready in {time.time() - t0:.0f} s: {len(cases)} cases, {len(allpaths)} parts, {len(conns)} connectors, voxel {VOXEL * 1000:.1f} mm')
STATE = {}                                                                         # this step's poses (ONE read for everything)


class Board:
    """a module's virtual board, shaped like real_sync.ModuleLink for RealSync (online / read / load / trim / name / imu / parts)"""
    def __init__(self, c, mid):
        self.c, self.mid, self.name, self.online, self.trim = c, mid, mid, True, np.zeros(7)
        self.read, self.load, self.sent, self.bc = {}, {}, {}, RS.board_cfg(RS.config()); self.key = f'c{c.k}{mid}:'

    def encode(self):
        enc = SERVO.encoders(); self.read = {}
        for full, rad in enc.items():
            if not full.startswith(self.key): continue
            j = JNAME[full[len(self.key):]]; deg = math.degrees(rad)
            self.read[j] = RS.lock_board_deg(self.bc, j, deg) if j in ('L1', 'L2') else 180.0 + self.bc['sign'][j] * deg
        self.load = {JNAME[f[len(self.key):]]: int(abs(t) / spec['CAP'] * 1000) for f, t in SERVO.tau.items() if f.startswith(self.key)}

    def send(self, want, dt):
        if not want: return
        fastest = RS.step_sent(self.sent, self.read, want, dt); spd = RS.speed_scale(fastest)
        for full in SERVO.target:
            if not full.startswith(self.key): continue
            j = JNAME[full[len(self.key):]]
            if j in self.sent: SERVO.target[full] = math.radians(RS.sim_deg_from_board(self.bc, j, self.sent[j]))
        for i, jt in enumerate(SERVO.j):
            if jt[0].startswith(self.key): SERVO.vmax[i] = math.radians(29.9 * spd)

    def _R(self, n):
        Q = STATE['Q'] if STATE else allrb.get_world_poses()[1].numpy(); return self.c.R.T @ quat_R(Q[self.c.mods[self.mid]['off'] + PARTS.index(n)])

    def imu(self, mid):
        """the module's MPU on Spine2 (in the brain's frame: the case is turned): true orientation + sensor noise; REAL_IMU=0 = the
        robot has none (10 Nov: was 'IMU', which ALSO took the brain world's simulated IMU away -> floor skills crashed)"""
        if os.environ.get('REAL_IMU', '1') != '1': return None
        return RS.mpu_reading(self._R('Spine2_B3B4'))

    def parts(self, mid):
        """SYNC_FB=truth: the parts EXACTLY (a perfect camera), in RealSync.PARTS order, brain frame"""
        P = STATE['P'] if STATE else allrb.get_world_poses()[0].numpy(); o = self.c.mods[mid]['off']
        return np.array([self.c.to_brain_p(P[o + PARTS.index(n)]) for n in RS.PARTS]), np.array([self._R(n) for n in RS.PARTS])


for c in cases:
    c.boards = {mid: Board(c, mid) for mid in c.mids}
    c.sync = RS.RealSync(c.bw); c.sync.links = c.boards; c.sync.on = True; c.S.sync = c.sync   # RealSync sends to these boards as to real ones
steps = 0; last_send = -1.0; next_shot = 0.0
JAM_AT = sorted(float(x) for x in os.environ.get('JAM_AT', '').split(',') if x.strip())   # contact dumps (jam_dump)
CAM_TIMES = sorted(float(x) for x in os.environ.get('CAM_AT', '').split(',') if x.strip()); CAM_SHOT = [0]   # hand-held camera shots (CAMERA=1)
CAM_EVERY = float(os.environ.get('CAM_EVERY', '0')); CAM_NEAR = float(os.environ.get('CAM_NEAR', '0.15')); CAM_NEXT = [0.0]   # automatic shots (no CAM_AT)
def isaac_time(): return steps / HZ


PROF = dict(read=0.0, mag=0.0, servo=0.0, step=0.0, rec=0.0, n=0)               # where a step's time goes (PROFILE=1 prints it)


def isaac_step():
    global steps
    t0 = time.perf_counter()
    if FAST is not None: P, Q, Wv = FAST()
    else: P, Q = allrb.get_world_poses(); _, Wv = allrb.get_velocities(); P = P.numpy(); Q = Q.numpy(); Wv = Wv.numpy()
    if os.environ.get('FAST_CHECK') and PROF['n'] in (5, 300, 900):                 # the fast read against Isaac's own (once, verified)
        P2, Q2 = allrb.get_world_poses(); _, W2 = allrb.get_velocities(); P2, Q2, W2 = P2.numpy(), Q2.numpy(), W2.numpy()
        qd_ = np.minimum(np.abs(Q - Q2).max(1), np.abs(Q + Q2).max(1)).max()
        say(f'FAST_CHECK step {PROF["n"]}: pos {np.abs(P - P2).max():.2e} m, quat {qd_:.2e}, ang vel {np.abs(Wv - W2).max():.2e} rad/s (|w| up to {np.abs(W2).max():.2e})')
    STATE.update(P=P, Q=Q); t1 = time.perf_counter()
    F, T = MAG.forces(P, Q); t2 = time.perf_counter()
    SERVO.apply(forces=F, torques=T, QW=(Q, Wv)); t3 = time.perf_counter()
    W.step(1); steps += 1; t4 = time.perf_counter()
    if steps % int(HZ / REC_HZ) == 0: W.record(allrb, 'twin')
    t5 = time.perf_counter()
    for k_, v_ in zip(('read', 'mag', 'servo', 'step', 'rec'), (t1 - t0, t2 - t1, t3 - t2, t4 - t3, t5 - t4)): PROF[k_] += v_
    PROF['n'] += 1
    if os.environ.get('PROFILE') and PROF['n'] % 1000 == 0:
        say('PROFILE ms/step ' + ' '.join(f'{k_} {PROF[k_] / PROF["n"] * 1000:.2f}' for k_ in ('read', 'mag', 'servo', 'step', 'rec')))


def dock_rel(c):
    """the docking end's tip vs the socket's seat, TRUE (Isaac): (axial m, sideways m, socket axis z)"""
    P, Q = STATE['P'], STATE['Q']; A, B = c.A, c.B
    def wpos(cn, v): return (cn['P'] + q_rot(cn['Q'], v)) if cn['body'] is None else P[cn['body']] + q_rot(Q[cn['body']], v)
    tip = wpos(A, A['tip']); st = wpos(B, B['seat']); z = q_rot(B['Q'], B['z']) if B['body'] is None else q_rot(Q[B['body']], B['z'])
    rel = tip - st; ax = float(rel @ z); return ax, float(np.linalg.norm(rel - ax * z)), z


def status(c, label=''):
    P, Q = STATE['P'], STATE['Q']; out = dict(t=round(isaac_time(), 2), label=label)
    adj = {tuple(sorted((f'/World/c{c.k}/{m_}/{a_}', f'/World/c{c.k}/{m_}/{b_}'))) for m_ in c.mids for a_, b_ in c.mods[m_]['adj']}
    pre = f'/World/c{c.k}/'
    out['touching'] = {f'{k[0][7:]} + {k[1][7:]}': v for k, v in W.contacts({allpaths[i]: (P[i], Q[i]) for i in range(len(allpaths))}, full=True).items()
                       if all(x.startswith(pre) for x in k) and 'Floor' not in ''.join(k) and tuple(sorted(k)) not in adj}
    out['loads_over_1p5'] = {f'{f.split(":")[0][len(f"c{c.k}"):]}.{JNAME[f.split(":")[1]]}': round(v, 2) for f, v in SERVO.tau.items() if f.startswith(f'c{c.k}M') and abs(v) > 1.5}
    vs = {}
    for m_ in c.mids:
        o = c.mods[m_]['off']; row = {}
        for n in ('EndA_LockModule', 'Spine1_B1B2', 'Spine2_B3B4', 'EndB_LockModule'):
            row[n.split('_')[0]] = round(float(np.linalg.norm(c.to_brain_p(P[o + PARTS.index(n)]) - c.bpose(f'{m_}_{n}')[0])) * 1000, 1)
        Rb_ = c.R.T @ quat_R(Q[o]); Rt = quat_R(c.bpose(f'{m_}_EndA_LockModule')[1])
        row['baseDeg'] = round(math.degrees(math.acos(float(np.clip((np.trace(Rb_ @ Rt.T) - 1) / 2, -1, 1)))), 2); vs[m_] = row
    out['isaac_vs_brain_mm'] = vs; out['worst_mm'] = max(max(v for kk, v in r.items() if kk != 'baseDeg') for r in vs.values())
    # 12 Nov (gaits): how far each module's Spine1 REALLY moved on the floor since the first status, vs the brain's own move
    s1 = {m_: (c.to_brain_p(P[c.mods[m_]['off'] + PARTS.index('Spine1_B1B2')]), c.bpose(f'{m_}_Spine1_B1B2')[0]) for m_ in c.mids}
    c.__dict__.setdefault('s1_0', {m_: (a.copy(), b.copy()) for m_, (a, b) in s1.items()})
    out['moved_mm'] = {m_: dict(isaac=round(float(np.linalg.norm((a - c.s1_0[m_][0])[:2])) * 1000, 1), brain=round(float(np.linalg.norm((b - c.s1_0[m_][1])[:2])) * 1000, 1)) for m_, (a, b) in s1.items()}
    # ... and how far each one TURNED since then (deg; Spine1 frame), real vs brain - a roll that did not happen shows here
    ang = lambda Ra, Rb: round(math.degrees(math.acos(float(np.clip((np.trace(Ra @ Rb.T) - 1) / 2, -1, 1)))), 1)
    r1 = {m_: (c.R.T @ quat_R(Q[c.mods[m_]['off'] + PARTS.index('Spine1_B1B2')]), quat_R(c.bpose(f'{m_}_Spine1_B1B2')[1])) for m_ in c.mids}
    c.__dict__.setdefault('r1_0', {m_: (a.copy(), b.copy()) for m_, (a, b) in r1.items()})
    for m_, (a, b) in r1.items(): out['moved_mm'][m_].update(isaac_deg=ang(a, c.r1_0[m_][0]), brain_deg=ang(b, c.r1_0[m_][1]))
    # 12 Nov (roll mismatch): the joints the brain SENT vs what Isaac's servos REALLY reached (board degrees), only those >2 deg apart
    out['lag_deg'] = {m_: {j: [round(b.sent[j], 1), round(b.read[j], 1), b.load.get(j, 0)] for j in b.sent if j in b.read and abs(b.sent[j] - b.read[j]) > 2.0}
                      for m_, b in getattr(c, 'boards', {}).items()}
    if c.cfg['task'][0] == 'connect':
        A = c.A; ax, rad, z = dock_rel(c); ea = q_rot(Q[A['body']], A['z'])
        out.update(axial_mm=round(ax * 1000, 2), radial_mm=round(rad * 1000, 2), tilt_deg=round(math.degrees(math.acos(float(np.clip(-ea @ z, -1, 1)))), 2))
        mid_a = A['name'].split('.')[1]; lk = f'c{c.k}{mid_a}:' + ('J_L2_lock' if A['name'].endswith('.B') else 'J_L1_lock')
        out['lock_deg'] = round(math.degrees(SERVO.angles(Q)[lk]), 1)
    return out


def snap_all(label):
    """one render, one picture per case (its overview + its close-up; the close-up follows the socket being docked into)"""
    P, Q = STATE['P'], STATE['Q']
    for c in cases:
        if c.cfg['task'][0] == 'connect' and c.B['body'] is not None:
            st_ = P[c.B['body']] + q_rot(Q[c.B['body']], c.B['seat']); z_ = q_rot(Q[c.B['body']], c.B['z']); upc = c.R @ np.array([0, 0, 1.0])
            sd_ = np.cross(z_, upc); sd_ = sd_ / np.linalg.norm(sd_) if np.linalg.norm(sd_) > 1e-6 else c.R @ np.array([1.0, 0, 0])
            W.aim(c.view_i + 1, st_ + 0.20 * z_ + 0.12 * sd_ + 0.06 * upc, st_, upc)
    for i, c in enumerate(cases):
        W.snap(os.path.join(SHOTS, f'{TAG}_{c.name}_{label}.png'.replace(' ', '_').replace(':', '')), f'{c.name} {label}', cams=[c.view_i, c.view_i + 1], render=(i == 0))


def jam_dump(c):
    """every contact of the docking end (and its rotor) with the target's part RIGHT NOW, in the SOCKET frame: depth along its axis
    (+ = still out), radius from its axis, angle round it - what holds the end back (11 Nov, ceiling: centred, 1 deg, stuck 7 mm)"""
    from isaacsim.physics.newton import acquire_stage
    ns = acquire_stage(); ct = ns.contacts; n = int(ct.rigid_contact_count.numpy()[0]); lab = list(ns.model.shape_label); sb = ns.model.shape_body.numpy()
    bl = list(ns.model.body_label); P, Q = STATE['P'], STATE['Q']; B = c.B; pB = allpaths[B['body']]
    s0, s1 = ct.rigid_contact_shape0.numpy()[:n], ct.rigid_contact_shape1.numpy()[:n]; p0 = ct.rigid_contact_point0.numpy()[:n]; p1 = ct.rigid_contact_point1.numpy()[:n]
    endp = allpaths[c.A['body']]; rotp = endp.rsplit('/', 1)[0] + ('/L2_LockRotor_B' if endp.endswith('EndB_LockModule') else '/L1_LockRotor_A')
    Rs = quat_R(Q[B['body']]); ps = P[B['body']]; seat = ps + Rs @ np.asarray(B['seat']); z = Rs @ np.asarray(B['z'])
    ref = min((Rs[:, 0], Rs[:, 1], Rs[:, 2]), key=lambda v: abs(float(v @ z)))      # a part axis ACROSS the socket axis (not along it)
    x_ = ref - (ref @ z) * z; x_ /= np.linalg.norm(x_); y_ = np.cross(z, x_)
    nrm = ct.rigid_contact_normal.numpy()[:n]; th = ct.rigid_contact_margin0.numpy()[:n] + ct.rigid_contact_margin1.numpy()[:n]
    rows = []
    for k in range(n):
        a_, b_ = s0[k], s1[k]; ba = bl[sb[a_]] if sb[a_] >= 0 else '-'; bb = bl[sb[b_]] if sb[b_] >= 0 else '-'
        if ba not in allpaths or bb not in allpaths: continue
        ia, ib = allpaths.index(ba), allpaths.index(bb)
        gap = float(np.dot(P[ib] + quat_R(Q[ib]) @ p1[k] - (P[ia] + quat_R(Q[ia]) @ p0[k]), nrm[k])) - float(th[k])
        if gap > 0.0002: continue                                                  # Newton also lists NEAR pairs: real touches only
        for mine, other, pt in ((ba, bb, p0[k]), (bb, ba, p1[k])):
            if mine in (endp, rotp) and other == pB:
                i_ = allpaths.index(mine); w_ = P[i_] + quat_R(Q[i_]) @ pt; r = w_ - seat
                rows.append((mine.split('/')[-1][:8], round(float(r @ z) * 1000, 1), round(float(np.linalg.norm(r - (r @ z) * z)) * 1000, 1), round(math.degrees(math.atan2(float(r @ y_), float(r @ x_))))))
    import collections
    agg = collections.defaultdict(list)
    for nm_, d_, r_, a_ in rows: agg[(nm_, int(a_ // 30) * 30)].append((d_, r_))
    c.log(f'JAM at {isaac_time():.2f} s: {len(rows)} contacts of the end with {pB.split("/")[-1]} (socket frame: depth mm, radius mm, by 30 deg sector): ' +
          '; '.join(f'{k[0]} {k[1]:+4d}deg: n {len(v)} depth {min(x[0] for x in v):+.1f}..{max(x[0] for x in v):+.1f} r {min(x[1] for x in v):.1f}..{max(x[1] for x in v):.1f}' for k, v in sorted(agg.items())))


def cam_measure(c, shot):
    """one hand-held picture -> the docking end relative to the socket, from the tags alone; logged with the truth (status)"""
    import cv2
    P, Q = STATE['P'], STATE['Q']; B = c.B
    st_ = P[B['body']] + q_rot(Q[B['body']], B['seat']); z_ = q_rot(Q[B['body']], B['z']); upc = c.R @ np.array([0, 0, 1.0])
    # 12 Nov: a person tilts the phone until the app sees the tags - a shot that misses the end or the socket is retaken from another
    # random angle, up to CAM_TRIES times (stand_lying: close in, the end hid its own tags and the last 11 mm were never steered)
    for try_ in range(int(os.environ.get('CAM_TRIES', '4'))):
        rng = np.random.default_rng(int(os.environ.get('CAM_SEED', '1')) * 100 + shot + 7919 * try_)                    # a moving hand: another angle each shot
        sd_ = np.cross(z_, upc); sd_ /= max(np.linalg.norm(sd_), 1e-9); a_, b_ = math.radians(rng.uniform(20, 55)), rng.uniform(0, 2 * math.pi)
        pp = math.cos(b_) * sd_ + math.sin(b_) * np.cross(z_, sd_)
        if pp @ upc < 0.3: pp = pp - 2 * min(0.0, float(pp @ upc)) * upc; pp = pp + 0.3 * upc; pp /= np.linalg.norm(pp)   # a hand holds it ABOVE (11 Nov: shot from under the floor)
        dir_ = math.cos(a_) * z_ + math.sin(a_) * pp
        eye = st_ + float(os.environ.get('CAM_DIST', '0.30')) * dir_
        W.aim(c.hand_i, eye, st_, upc)
        W.snap(os.path.join(SHOTS, f'{TAG}_{c.name}_hand{shot}.png'), f'{c.name} hand camera {shot}', cams=[c.hand_i])
        img = np.asarray(W.cams[c.hand_i].get_data())[:, :, :3].copy(); Wd, Hd = W.cam_size
        f = HAND_FOCAL / 20.955 * Wd; K = np.array([[f, 0, Wd / 2], [0, f, Hd / 2], [0, 0, 1.0]])    # USD camera: HAND_FOCAL lens, 20.955 mm aperture
        det = cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(CAM.DICT), cv2.aruco.DetectorParameters())
        det.getDetectorParameters().cornerRefinementMethod = cv2.aruco.CORNER_REFINE_SUBPIX
        corners, ids, _ = det.detectMarkers(cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)); seen = {} if ids is None else {int(i): cc.reshape(4, 2) for cc, i in zip(corners, ids.flatten())}
        pose = {}
        for owner in ('end', 'socket'):
            ks = [k for k in seen if k in TAGS and TAGS[k]['owner'] == owner]
            if not ks: continue
            obj = np.concatenate([TAGS[k]['corners'] for k in ks]).astype(np.float64); im = np.concatenate([seen[k] for k in ks]).astype(np.float64)
            ok, rv, tv = cv2.solvePnP(obj, im, K, None, flags=cv2.SOLVEPNP_SQPNP if len(ks) > 1 else cv2.SOLVEPNP_IPPE)
            if ok: pose[owner] = (cv2.Rodrigues(rv)[0], tv.flatten(), len(ks))
        if len(pose) == 2: break
    if os.environ.get('CAM_DEBUG'):                                      # where each tag SHOULD be in the picture, and does it face the camera
        fwd = (st_ - eye) / np.linalg.norm(st_ - eye); rgt = np.cross(fwd, upc); rgt /= np.linalg.norm(rgt); dn = np.cross(fwd, rgt)
        for k, T_ in TAGS.items():
            ctr = P[T_['body']] + q_rot(Q[T_['body']], T_['corners'].mean(0)); nrm = q_rot(Q[T_['body']], np.cross(T_['corners'][1] - T_['corners'][0], T_['corners'][3] - T_['corners'][0]))
            v = ctr - eye; dz = float(v @ fwd); u_ = Wd / 2 + f * float(v @ rgt) / dz; w_ = Hd / 2 + f * float(v @ dn) / dz
            c.log(f'  tag {k} ({T_["owner"]}): pixel ({u_:.0f}, {w_:.0f}), {dz:.2f} m away, faces camera {float(-nrm @ v) / (np.linalg.norm(nrm) * np.linalg.norm(v)):+.2f}')
        for k, T_ in TAGS.items():                                         # Isaac's tag centre vs the brain's srx frame x the mount
            if T_['owner'] != 'socket' or 'mk' not in T_: continue
            ctr = P[T_['body']] + q_rot(Q[T_['body']], T_['corners'].mean(0)); bb = c.bw.m.body(T_['srx']).id
            bw_ = c.bw.d.xpos[bb] + c.bw.d.xmat[bb].reshape(3, 3) @ np.asarray(json.load(open(os.path.join(CAM.MARK_DIR, 'mounts_rxface.json')))[T_['mk']]['pos'])
            c.log(f'  socket tag {k} {T_["mk"]}: Isaac {np.round(ctr, 4)} brain->isaac {np.round(c.to_isaac(bw_, [1, 0, 0, 0])[0], 4)}')
        ks_ = [k for k, T_ in TAGS.items() if T_['owner'] == 'socket']
        if ks_:                                                            # look straight at the first socket tag: is it there at all?
            T_ = TAGS[ks_[0]]; ctr = P[T_['body']] + q_rot(Q[T_['body']], T_['corners'].mean(0))
            nz = q_rot(Q[T_['body']], np.cross(T_['corners'][0] - T_['corners'][3], T_['corners'][2] - T_['corners'][3])); nz /= np.linalg.norm(nz)
            for sgn in (1, -1):
                W.aim(c.hand_i, ctr + sgn * 0.15 * nz, ctr, upc); W.snap(os.path.join(SHOTS, f'{TAG}_{c.name}_tagcheck{sgn:+d}.png'), f'socket tag {ks_[0]} from {sgn:+d} normal', cams=[c.hand_i])
            for nm_, d_ in (('side', sd_), ('front', z_), ('above', upc)):         # the socket ring from 3 sides: where are its tags?
                W.aim(c.hand_i, st_ + 0.25 * d_ + 0.02 * upc, st_, upc if nm_ != 'above' else sd_)
                W.snap(os.path.join(SHOTS, f'{TAG}_{c.name}_ring_{nm_}.png'), f'socket ring from {nm_}', cams=[c.hand_i])
            W.aim(c.hand_i, eye, st_, upc)
    tr = status(c); line = f'CAMERA shot {shot} at {isaac_time():.2f} s: tags seen {sorted(seen)} | TRUE axial {tr["axial_mm"]:+.2f} side {tr["radial_mm"]:.2f} tilt {tr["tilt_deg"]:.1f}'
    try:                                                                  # the end's CLOCKING about the socket axis vs the brain (truth)
        A0 = c.A; mid_e = A0['name'].split('.')[1]; pe = allpaths[A0['body']].split('/')[-1]; mid_s = B['name'].split('.')[1]; ps = allpaths[B['body']].split('/')[-1]
        Rrel_i = quat_R(Q[B['body']]).T @ quat_R(Q[A0['body']]); be_ = c.bw.m.body(f'{mid_e}_{pe}').id; bs_ = c.bw.m.body(f'{mid_s}_{ps}').id
        Rrel_b = c.bw.d.xmat[bs_].reshape(3, 3).T @ c.bw.d.xmat[be_].reshape(3, 3); D = Rrel_b.T @ Rrel_i
        ang = math.acos(float(np.clip((np.trace(D) - 1) / 2, -1, 1))); ax_ = np.array([D[2, 1] - D[1, 2], D[0, 2] - D[2, 0], D[1, 0] - D[0, 1]])
        rv_ = ax_ / (np.linalg.norm(ax_) + 1e-12) * ang; spin = math.degrees(float((Rrel_b @ rv_) @ np.asarray(B['z'])))
        line += f' clock {spin:+.1f}'
    except Exception as e_: line += f' clock ? {e_!r}'[:40]
    if len(pose) == 2:
        (Re, te, ne), (Rs, ts, ns) = pose['end'], pose['socket']; A_ = c.A
        tip_s = Rs.T @ (Re @ np.asarray(A_['tip']) + te - ts); rel = tip_s - np.asarray(B['seat']); zb = np.asarray(B['z'])
        ax = float(rel @ zb); rad = float(np.linalg.norm(rel - ax * zb)); ze = Rs.T @ Re @ np.asarray(A_['z'])
        line += f' | CAMERA axial {ax * 1000:+.2f} side {rad * 1000:.2f} tilt {math.degrees(math.acos(float(np.clip(-ze @ zb, -1, 1)))):.1f} ({ne} end + {ns} socket tags)'
        # hand it to the sender (RealSync.cam) in the BRAIN frame: the socket part's ideal orientation turns the socket-frame numbers
        # the error is REAL minus where the brain has the end NOW (approaching, the ideal end is meant to be away from the socket):
        # the same tip / seat / axes on the brain's own bodies, in the socket part's frame
        mid_s = B['name'].split('.')[1]; part_s = allpaths[B['body']].split('/')[-1]; bs = c.bw.m.body(f'{mid_s}_{part_s}').id
        mid_e = A_['name'].split('.')[1]; part_e = allpaths[A_['body']].split('/')[-1]; be = c.bw.m.body(f'{mid_e}_{part_e}').id
        Rb = c.bw.d.xmat[bs].reshape(3, 3); pb = c.bw.d.xpos[bs]; Re_b = c.bw.d.xmat[be].reshape(3, 3); pe_b = c.bw.d.xpos[be]
        rel_i = Rb.T @ (pe_b + Re_b @ np.asarray(A_['tip']) - pb) - np.asarray(B['seat']); ze_i = Rb.T @ Re_b @ np.asarray(A_['z'])
        # the FULL turn error, tilt AND clocking about the socket axis (11 Nov, ceiling: centred, 1 deg tilt, still stuck 7.5 mm out -
        # End B's 4 pads sat ON the socket's lips at 4 spots 90 deg apart; clocking ~1.2 deg had never been corrected): the measured
        # end-in-socket turn against the brain's, as a rotation vector in the socket frame (CAM_CLOCK=0: tilt only, as before)
        if os.environ.get('CAM_CLOCK', '1') == '1':
            Rm = Rs.T @ Re; Rbr = Rb.T @ Re_b; Dm = Rm @ Rbr.T                          # measured vs brain end-in-socket turn (socket frame)
            ang_ = math.acos(float(np.clip((np.trace(Dm) - 1) / 2, -1, 1))); ax2 = np.array([Dm[2, 1] - Dm[1, 2], Dm[0, 2] - Dm[2, 0], Dm[1, 0] - Dm[0, 1]])
            rot_s = -ax2 / (np.linalg.norm(ax2) + 1e-12) * ang_                          # the turn that undoes it
        else: rot_s = np.cross(ze, ze_i)
        c.sync.cam = dict(t=float(c.bw.d.time), rel=Rb @ (rel - rel_i), rot=Rb @ rot_s, z=Rb @ zb, n=ne + ns,
                          # 12 Nov: the measured END PART in the SOCKET PART's frame (+ which brain bodies) - Manual._cam_belief moves a free
                          # target's copy there when it is far off (the camera's own pose cancels: both parts in one picture)
                          seen=dict(R_es=Rs.T @ Re, t_es=Rs.T @ (te - ts), end_body=int(be), sock_body=int(bs)))
        line += f' | vs brain: {np.round((rel - rel_i) * 1000, 1)} mm, {math.degrees(float(np.linalg.norm(np.cross(ze, ze_i)))):.1f} deg'
    else: line += f' | CAMERA: not enough tags ({ {o: p[2] for o, p in pose.items()} })'
    c.log(line)


if os.environ.get('PLACE_DEBUG'):                                                  # where each base / receiver was put, and where it is after a few steps
    P0 = allrb.get_world_poses()[0].numpy()
    for c in cases:
        for mid in c.mids:
            o = c.mods[mid]['off']; say(f'PLACE [{c.name}] {mid} EndA placed {np.round(P0[o], 4)} brain->isaac {np.round(c.to_isaac(*c.bpose(f"{mid}_EndA_LockModule"))[0], 4)}')
    isaac_step()
    def _where(tag_):
        P_ = allrb.get_world_poses()[0].numpy()
        for c in cases: say(f'PLACE {tag_} [{c.name}] M1 EndA brain frame {np.round(c.to_brain_p(P_[c.mods[c.mids[0]]["off"]]), 4)}')
    _where('before warm-up')
    from isaacsim.physics.newton import acquire_stage
    _c = acquire_stage().contacts; say(f'PLACE contacts after 1 step: {int(_c.rigid_contact_count.numpy()[0])} of {_c.rigid_contact_max} slots')
    _ns = acquire_stage(); _m = _ns.model; _lab = list(_m.shape_label); _sw = _m.shape_world.numpy(); _sb = _m.shape_body.numpy()
    _n = int(_c.rigid_contact_count.numpy()[0]); _s0 = _c.rigid_contact_shape0.numpy()[:_n]; _s1 = _c.rigid_contact_shape1.numpy()[:_n]
    import collections as _co
    _per = _co.Counter(); [(_per.update([_lab[a].split('/')[3] + ' ~ ' + _lab[b].split('/')[3] if _lab[a].count('/') > 3 and _lab[b].count('/') > 3 else _lab[a] + ' ~ ' + _lab[b]])) for a, b in zip(_s0, _s1)]
    say(f'PLACE shapes {len(_lab)}, worlds {int(_m.world_count)}; receiver/floor shapes: ' + '; '.join(f'{l} w{_sw[i]} b{_sb[i]}' for i, l in enumerate(_lab) if 'rx_' in l or 'Floor' in l))
    say(f'PLACE contact pairs by top prim: {dict(_per)}')
    _sv = getattr(_ns, 'solver', None); _mj = getattr(_sv, 'mj_model', None) or getattr(_sv, 'mjw_model', None)
    say(f'PLACE mujoco geoms {getattr(_mj, "ngeom", "?")}, nworld {getattr(getattr(_sv, "mjw_data", None), "nworld", "?")}')
    _cp = next((getattr(_ns, a_) for a_ in ('collision_pipeline', 'collide_pipeline', '_collision_pipeline') if getattr(_ns, a_, None) is not None), None)
    _pf = getattr(_cp, 'shape_pairs_filtered', None); _st = _m.shape_type.numpy()
    if _pf is not None:
        _pp = _pf.numpy().reshape(-1, 2); _mm = [(a, b) for a, b in _pp if _st[a] == _st[b] == int(_st[[i for i, l in enumerate(_lab) if l.endswith('/mesh')][0]])]
        say(f'PLACE pipeline {type(_cp).__name__}: broad phase {getattr(_cp, "broad_phase_mode", "?")}, {len(_pp)} pairs, mesh-mesh {len(_mm)}, '
            f'with a receiver {sum(1 for a, b in _mm if "FloorRx" in _lab[a] + _lab[b])}, shape_pairs_max {getattr(_cp, "shape_pairs_max", "?")}')
    else: say(f'PLACE pipeline {type(_cp).__name__} attrs {[a_ for a_ in dir(_cp) if "pair" in a_][:20]}')
    _np = getattr(_cp, 'narrow_phase', None); _si = _m._shape_sdf_index.numpy() if getattr(_m, '_shape_sdf_index', None) is not None else None
    _ct = getattr(_m, '_texture_sdf_coarse_textures', None)
    say(f'PLACE narrow: ' + ', '.join(f'{a_} {getattr(_np, a_, "?")}' for a_ in ('mesh_sdf_texture_only', 'mesh_sdf_identity_scale_only', 'max_mesh_mesh_pairs',
        'max_triangle_pairs', 'max_candidate_pairs', 'split_gjk_mpr', 'sparse_gjk_pairs')) +
        (f' | sdf shapes {int((_si >= 0).sum())}, textures {len(_ct) if _ct is not None else None}, missing {sum(1 for t in (_ct or []) if t is None)}' if _si is not None else ''))
    for _ in range(20): W.app.update()
    _where('after 20 app.update')
    snap_all('dbg'); _where('after a picture')
    for k_ in range(600):
        isaac_step()
        if k_ in (0, 49, 99, 199, 299, 599):
            for c in cases:
                o = c.mods[c.mids[0]]['off']; say(f'PLACE step {k_ + 1} [{c.name}] M1 EndA {np.round(STATE["P"][o], 4)} (brain frame {np.round(c.to_brain_p(STATE["P"][o]), 4)}), floor magnets {[round(v, 2) for kk, v in MAG.last.items() if kk[0].startswith(f"c{c.k}.")]} lock torque L1 {SERVO.tau[f"c{c.k}{c.mids[0]}:J_L1_lock"]:+.2f}, L1 angle {math.degrees(SERVO.angles(STATE["Q"])[f"c{c.k}{c.mids[0]}:J_L1_lock"]):+.1f} target {math.degrees(SERVO.target[f"c{c.k}{c.mids[0]}:J_L1_lock"]):+.1f}')
    for c in cases:
        st_ = status(c, 'dbg'); say(f'PLACE status [{c.name}] {st_["isaac_vs_brain_mm"]} | brain EndA now {np.round(c.bpose(c.mids[0] + "_EndA_LockModule")[0], 4)} brain t {c.bw.d.time:.2f}')
    W.close(); sys.exit(0)
# settle Isaac in the brains' start poses, then hand each case to its sender
for _ in range(20): W.app.update()
isaac_step(); snap_all('00start')
for _ in range(int(SETTLE * HZ)): isaac_step()
for c in cases:
    for b in c.boards.values(): b.encode()
    c.t_link = float(c.bw.d.time) - isaac_time(); c.log(f'ISAAC settled: {status(c, "settled")}')
snap_all('01settled')


BRAIN = threading.Lock()   # the brains take turns (10 Nov: two brains thinking at once - manual / phys_world / real_sync share module state
                           # - sent one case's robot wild and it blew up, its parts hitting the next case); lockstep anyway, nothing is lost


def run_case(c):
    """the brain's job, on its own thread; every tick waits until Isaac has caught up to the brain's clock"""
    orig = type(c.S)._tick
    def tick():
        orig(c.S)
        with c.cv:
            c.req = float(c.bw.d.time) - c.t_link
            BRAIN.release()                                                       # waiting: another brain may think now
            try:
                while isaac_time() < c.req - 1e-9: c.cv.wait(0.5)
            finally:
                c.cv.release(); BRAIN.acquire(); c.cv.acquire()                    # (never hold c.cv while waiting for BRAIN)
            c.req = None
    c.S._tick = tick; c.bw.on_tick = tick
    BRAIN.acquire()
    try:
        task = c.cfg['task']; c.log(f'TASK {task}: the brain plans and moves, RealSync sends, Isaac does it')
        if task[0] == 'connect': c.result['brain'] = 'LOCKED' if c.S.connect(task[1], task[2]) else 'NOT locked'
        elif task[0] == 'skill':
            c.S.skill(task[1]); c.result['brain'] = next((str(l)[:120] for l in reversed(c.S.lines) if task[1] in str(l) and ('DONE' in str(l) or 'NOT' in str(l))), 'see log')
        c.bw.run(3.0)
    except Exception as e:
        import traceback; c.log('BRAIN ERROR', repr(e), traceback.format_exc()[-800:]); c.result['brain'] = f'error {e!r}'
    finally:
        c.end_t = float(c.bw.d.time) - c.t_link; c.finished = True; BRAIN.release()


for c in cases: c.th = threading.Thread(target=run_case, args=(c,), daemon=True); c.th.start()
STOP_AT = float(os.environ.get('STOP_AT', '1e9'))                                 # debug: end the run at this Isaac time
EARLY = dict(t=-1.0, h=[]) if os.environ.get('EARLY_END', '1') == '1' else None     # the referee's early end (see the main loop)
while not all(c.finished for c in cases) and isaac_time() < STOP_AT:
    live = [c for c in cases if not c.finished]
    waits = [c.req for c in live if c.req is not None]
    if len(waits) < len(live): time.sleep(0.001); continue                         # some brain is still thinking: Isaac waits for it
    target = min(waits)
    while isaac_time() < target - 1e-9:
        if isaac_time() - last_send >= RS.SEND_DT - 1e-9:                             # every board cycle: read encoders, take the sent angles
            last_send = isaac_time()
            for c in cases:
                with c.sync.lock: want = {m_: dict(w_) for m_, w_ in c.sync.want_deg.items()}
                for mid, b in c.boards.items(): b.encode(); b.send(want.get(mid), RS.SEND_DT)
                # SOFT WRIST while pushing in (PUSH_SOFT = share of the servo's strength, 0 = off; 11 Nov, ceiling: End B wedged across
                # the socket at 4 deg, touching two opposite sides): the 3 joints next to the docking end go weak so the socket's
                # chamfer straightens the end by itself (a compliant wrist; the real ST3215 has a settable torque limit)
                sf = float(os.environ.get('PUSH_SOFT', '0')); pu_ = getattr(c.sync, 'push', None)
                if sf > 0:
                    if not hasattr(c, 'soft_idx'):
                        pm = c.cfg['task'][1].split('.'); jn_ = ('J_B3_bend', 'J_B4_bend', 'J_T3_twist') if pm[1] == 'B' else ('J_T1_twist', 'J_B1_bend', 'J_B2_bend')
                        c.soft_idx = [SERVO.names.index(f'c{c.k}{pm[0]}:{j}') for j in jn_]; c.soft_fr0 = SERVO.fr0[c.soft_idx].copy()
                    on = bool(pu_ and pu_.get('t0') is not None and pu_.get('t_end') is None)
                    SERVO.fr0[c.soft_idx] = c.soft_fr0 * (sf if on else 1.0)
                pu = getattr(c.sync, 'push', None)                         # pushing in: the blind depth (encoders) next to the truth
                if pu and c.cfg['task'][0] == 'connect' and isaac_time() - getattr(c, 'last_depth', -1) >= 0.24:
                    c.last_depth = isaac_time(); est = c.sync.seat_depth(pu['mid'], pu['end'], pu['rx']); st_ = status(c)
                    c.log(f'DEPTH t {isaac_time():6.2f} | true axial {st_["axial_mm"]:+7.2f} side {st_["radial_mm"]:5.2f} tilt {st_["tilt_deg"]:4.1f} | '
                          f'encoders say axial {est[0] if est else float("nan"):+7.2f} side {est[1] if est else float("nan"):5.2f} tilt {est[2] if est else float("nan"):4.1f}')
        isaac_step()
        # EARLY END (12 Nov, Nischay: "if it docks it is done in 2 min; if it takes long something is wrong - why let it run?"):
        # the referee (truth) ends the run at once when the dock is DONE (seated < 1 mm, rotor > 40 deg for 1 s) or clearly STUCK
        # (pushing 6 s, no 1 mm progress in 5 s, > 2 mm out) or the rotor turned UNSEATED (> 20 deg while > 2 mm out). EARLY_END=0: off
        if EARLY and isaac_time() - EARLY['t'] >= 0.5 and len(cases) == 1 and cases[0].cfg['task'][0] == 'connect':
            EARLY['t'] = isaac_time(); c = cases[0]; st_ = status(c); ax_, lk_ = abs(st_['axial_mm']), abs(st_['lock_deg'])
            EARLY['h'].append((isaac_time(), st_['axial_mm'])); pu = getattr(c.sync, 'push', None)
            if pu and pu.get('t0') is not None and EARLY.get('push_t') is None: EARLY['push_t'] = isaac_time()
            why = None
            if ax_ < 1.0 and st_['radial_mm'] < 1.5 and lk_ > 40: EARLY['ok'] = EARLY.get('ok', 0) + 1; why = 'DOCKED + LOCKED' if EARLY['ok'] >= 2 else None
            elif lk_ > 20 and ax_ > 2.0: why = f'rotor turned at {lk_:.0f} deg while the end was {st_["axial_mm"]:+.1f} mm out (not seated)'
            elif EARLY.get('push_t') and isaac_time() - EARLY['push_t'] > 6.0 and ax_ > 2.0:
                old = [a for t_, a in EARLY['h'] if t_ <= isaac_time() - 5.0]
                if old and abs(old[-1]) - ax_ < 1.0: why = f'stuck {st_["axial_mm"]:+.1f} mm out, {st_["radial_mm"]:.1f} aside, tilt {st_["tilt_deg"]:.1f} deg (no 1 mm progress in 5 s)'
            if why:
                c.log(f'EARLY END at {isaac_time():.1f} s: {why}'); STOP_AT = isaac_time(); break
        if JAM_AT and isaac_time() >= JAM_AT[0]:                              # where exactly does the end touch its socket (debug)
            JAM_AT.pop(0)
            try: jam_dump(cases[0])
            except Exception as e_: say(f'JAM error {e_!r}')
        # 12 Nov: CAM_EVERY = automatic shots (a person films the last part of a dock): every CAM_EVERY s once the end is within
        # CAM_NEAR m of the socket. Truth only says WHEN to film, never what the camera measures
        if CAMERA and CAM_EVERY and not CAM_TIMES and cases[0].cfg['task'][0] == 'connect' and isaac_time() >= CAM_NEXT[0]:
            ax_c, rad_c, _ = dock_rel(cases[0])
            if math.hypot(ax_c, rad_c) < CAM_NEAR: CAM_TIMES.append(isaac_time()); CAM_NEXT[0] = isaac_time() + CAM_EVERY
        if CAMERA and CAM_TIMES and isaac_time() >= CAM_TIMES[0]:
            CAM_TIMES.pop(0); CAM_SHOT[0] += 1
            try: cam_measure(cases[0], CAM_SHOT[0])
            except Exception as e_: say(f'CAMERA error {e_!r}')
        if isaac_time() >= next_shot:
            next_shot = isaac_time() + EVERY
            for c in cases:
                st_ = status(c, str(c.S.lines[-1])[:60] if c.S.lines else ''); c.track.append(st_); c.log(f'ISAAC {st_}')
            snap_all(f't{isaac_time():05.1f}')
    for c in live:
        with c.cv: c.cv.notify_all()
end_T = max(getattr(c, 'end_t', isaac_time()) for c in cases) if isaac_time() < STOP_AT else isaac_time()                       # every case gets its own last seconds
while isaac_time() < end_T: isaac_step()
snap_all('99end')
say('=' * 30 + ' RESULTS ' + '=' * 30)
for c in cases:
    e = status(c, 'end'); c.log(f'ISAAC end: {e}')
    lag = max((s['worst_mm'] for s in c.track), default=0.0)
    if c.cfg['task'][0] == 'connect':
        ok = abs(e['axial_mm']) < 1.0 and e['radial_mm'] < 1.5 and abs(abs(e['lock_deg']) - 45) < 5
        verdict = (f'seated {e["axial_mm"]:+.2f} mm, {e["radial_mm"]:.2f} mm off, tilt {e["tilt_deg"]:.1f} deg, rotor {e["lock_deg"]:+.1f} deg -> '
                   f'{"DOCKED + LOCKED" if ok else "NOT docked"}')
    else:
        ok = e['worst_mm'] < 15 and all(r['baseDeg'] < 5 for r in e['isaac_vs_brain_mm'].values())
        verdict = f'shape vs the brain: worst part {e["worst_mm"]:.1f} mm, bases {[r["baseDeg"] for r in e["isaac_vs_brain_mm"].values()]} deg -> {"SAME SHAPE" if ok else "DIFFERENT"}'
    say(f'RESULT {c.name} (surface {c.sc["surface_deg"]:.0f}, task {c.cfg["task"]}): brain {c.result.get("brain")} | Isaac: {verdict} | '
        f'parts touching {e["touching"] or "none"} | most off during the run {lag:.0f} mm | servos over 1.5 N.m {e["loads_over_1p5"] or "none"}')
say(f'sim {isaac_time():.1f} s, wall {time.time() - t0:.0f} s')
W.replay(allpaths, REC_HZ, float(os.environ.get('REPLAY_SPEED', '1.0')), shot=os.path.join(SHOTS, f'{TAG}_window_replay_start.png'))
W.close()
