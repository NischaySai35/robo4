"""real_sync.py — the real robot follows the ideal sim (Nischay 3 Nov: 'the sim shows ideal, the robot gets corrected values').

The ideal robot's joints are the goal. Each tick the load on every joint is worked out from the ideal world (gravity, floor,
closed locks), and from it what the real parts will do under that load: PLA flex, gear play, servo droop. The bend and twist
angles are then re-solved for each whole module, so its links land where the ideal links are. Flex bends at right angles to the
servos, so one joint cannot cancel its own flex: the module's joints share the correction as well as they can.
The encoders come back from the board: the slow trim removes the servo error they can see. Flex and gear play do not show on an
encoder, so those stay predicted. Random per-robot differences and room effects cannot be predicted from here.

Always computes what would be sent, online or not; only pressing Sync sends. Absolute commands every tick, so a lost packet heals
itself. Rate limited, clamped to the joints' limits, and it holds (stops sending) when a servo overloads or falls far behind.
REUSE-CHECKED: board calls = gos.hardware.Esp32Robot; loads = MuJoCo's own cfrc_ext; flex / play values = phys_world.sag_spec (from
build_mjcf + physics_params.json); no other live real-robot link exists (deploy/laptop_controller.py is the old single-module docker).
"""
import re
import json, math, os, socket, sys, threading, time, urllib.parse, numpy as np, mujoco
from paths import tpath
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'gos', 'python'))
from gos.app import GosError
from gos.hardware import Esp32Robot

PHYS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'physics_params.json')))
JN = ['T1', 'B1', 'B2', 'T2', 'B3', 'B4', 'T3']
SERVO_ID = {'L1': 1, 'T1': 2, 'B1': 3, 'B2': 4, 'T2': 5, 'B3': 6, 'B4': 7, 'T3': 8, 'L2': 9}   # physical order on every module
PARTS = ('Spine1_B1B2', 'T2_Ring_B3Fork', 'Spine2_B3B4', 'EndB_LockModule', 'EndA_LockModule')   # the links whose pose is matched
SEND_DT = 0.05                 # s: one step to the board this often (12 Nov: no longer waits for a status read each step)
POLL_S = 0.25                  # s: the board's status (angles, load) is read this often while sending; every step when not sending
ENC_HOLD = 0.3                 # deg: encoder changes smaller than this are flicker (ST3215 reads in 0.09 deg steps), the picture holds
LAG = float(os.environ.get('SYNC_LAG', '0.12'))   # s: command delay (60-180 ms in the servo model): moving joints are led by this
FOLLOW_RATE, CATCH_RATE = 120.0, 15.0   # deg/s: following the sim / closing a big gap after Sync
CATCH_GAP = 3.0                # deg: further from the wanted angle than this = still catching up
BOARD_TIMEOUT = 1.5            # s: one read / write; modem sleep (radio asleep while still) adds a beacon or two
RESEND_S = 0.5                 # s: unchanged angles are still re-sent this often
OFFLINE_AFTER_S = 3.0          # s: no good reply this long = offline. SAME rule as Studio's top bar (studio/src/features/servo/espPoll.ts OFFLINE_AFTER_MS)
RESUME_GAP_S = 3.0             # s: offline longer than this (or restarted) = hold until Sync is pressed again
BEHIND_DEG, LOAD_STOP, HOLD_S = 25.0, 900, 0.5   # holds when a servo stays this far behind, or this loaded (0.1 %), this long
TRIM_MAX, TRIM_RATE, TRIM_DEAD = 3.0, 0.5, 0.1   # deg, deg/s, deg: the slow encoder trim
SMOOTH_S = 0.3                 # s: the correction is low-passed, contact spikes must not shake the robot
CORR_MAX = math.radians(8.0)   # no correction beyond this: beyond it the prediction is wrong, not the robot
DAMP = float(os.environ.get('SYNC_DAMP', '1e-5'))                   # keeps the module solve calm near straight
CONFIG = 'real_robot.json'     # data/: {"hosts": {"M1": "mod1.local"}, "sign": {"T1": -1, ...}, "lock_sign": {"L1": 1, "L2": 1}, "lock_home": {"L1": 45, "L2": 0}, "signs_checked": true, "locks_checked": false}
# Joint directions are the SAME on every module, also new ones (Nischay 5 Nov: every module is built the same way).


def config():
    """defaults overlaid with the saved file"""
    c = dict(hosts={}, sign={j: 1 for j in JN}, lock_sign={'L1': 1, 'L2': 1}, signs_checked=False, locks_checked=False)
    try: c.update(json.load(open(tpath(CONFIG))))
    except (OSError, ValueError): pass
    return c


def module_key(name):
    """'mod2', 'mod2.local', '127.0.4.2' (the ESP-NOW bridge) -> 'mod2'; anything else -> None"""
    m = re.search(r'mod(\d+)', str(name or ''), re.I) or re.search(r'^127\.0\.4\.(\d+)', str(name or ''))
    return f'mod{int(m.group(1))}' if m else None


def board_cfg(cfg, name=None):
    """the joint directions: one set for every module, plus that module's own exceptions (data/real_robot.json "module_sign":
    {"mod2": {"B2": 1}} - Nischay 12 Nov: on mod2 motor 4 (B2) turned the wrong way with the shared set, the rest were right)"""
    own = cfg.get('module_sign', {}).get(module_key(name) or '', {})
    return dict(sign={j: 1 for j in JN} | cfg.get('sign', {}) | {j: v for j, v in own.items() if j in JN},
                lock_sign={'L1': 1, 'L2': 1} | cfg.get('lock_sign', {}) | {j: v for j, v in own.items() if j in ('L1', 'L2')},
                lock_home={'L1': 0.0, 'L2': 0.0} | cfg.get('lock_home', {}), signs_checked=bool(cfg.get('signs_checked')), locks_checked=bool(cfg.get('locks_checked')), known=True)


def lock_board_deg(bc, j, deg):
    """the board angle for lock rotor j (L1/L2) at sim angle deg (0 = open): 180 + its open-position offset + its direction x deg.
    Nischay 5 Nov: L1 turned the right way but 0 was not open (fins repeat every 90 deg, so open is 45 off) -> lock_home L1 45;
    L2 opened right but turned the wrong way -> lock_sign L2 -1. One place, both senders (RealSync, PoseSync)."""
    return 180.0 + float(bc['lock_home'][j]) + bc['lock_sign'][j] * float(deg)


def sim_deg_from_board(bc, j, a):
    """the exact reverse of the board angles RealSync sends: board degrees a of servo j (T1..T3, B1..B4, L1, L2) -> sim degrees
    (signs are +-1). For a board that is not real: isaac_twin.py's virtual boards."""
    if j in ('L1', 'L2'): return (float(a) - 180.0 - float(bc['lock_home'][j])) * bc['lock_sign'][j]
    return (float(a) - 180.0) * bc['sign'][j]


def mpu_reading(R):
    """what the MPU-6050 on Spine2 reports for its true orientation R (3x3): R with ~0.3 deg of sensor noise (only the tilt is used).
    One place: the MuJoCo copy's board (Twin.Board) and isaac_twin.py's virtual boards."""
    a = np.random.normal(0, math.radians(0.3), 3); K = np.array([[0, -a[2], a[1]], [a[2], 0, -a[0]], [-a[1], a[0], 0]])
    return (np.eye(3) + K) @ R


def step_sent(sent, read, want, dt):
    """what a board is told next (board degrees, updated IN PLACE): each servo follows the wanted angle at FOLLOW_RATE, or closes a gap
    over CATCH_GAP at CATCH_RATE (starting from where it reads). Returns the fastest move (deg/s) for the board's speed setting.
    One place: ModuleLink (real boards) and isaac_twin.py (virtual boards)."""
    fastest = 0.0
    for j, v in want.items():
        cur = sent.get(j, read.get(j, v))
        rate = CATCH_RATE if abs(v - cur) > CATCH_GAP else FOLLOW_RATE
        sent[j] = cur + float(np.clip(v - cur, -rate * dt, rate * dt)); fastest = max(fastest, abs(sent[j] - cur) / max(dt, 0.03))
    return fastest


def boards_now():
    """every board the service talks to: its latest telemetry, untouched, and how old it is. The Studio's top bar reads this
    instead of asking the board itself (5 Nov: two askers overloaded the ESP and each saw it drop at different moments)"""
    out = {}
    for host, L in list(LINKS.items()):
        if not L.alive or getattr(L, 'tel_raw', None) is None: continue
        out[host] = dict(online=L.online, age_s=round(time.time() - L.tel_at, 2), ms=L.tel_ms, ip=getattr(L, 'good_ip', None), tel=L.tel_raw)
    return out


LINKS = {}                     # host -> ModuleLink: ONE link per board, shared by every tab's Sync (two senders never fight)


def get_link(mid, host, want, owner):
    """the board's link; whoever presses Sync last owns it (its angles are the ones sent)"""
    L = LINKS.get(host)
    if L is None or not L.alive: L = LINKS[host] = ModuleLink(mid, host, want)
    if owner is not None: L.want, L.mid, L.owner = want, mid, owner
    return L


class Correction:
    """what the real parts do under the ideal robot's loads, and the joint angles that undo it"""
    def __init__(self, w):
        m = w.m; self.w, self.mods, self.Ar = w, {}, {}
        by_body = {}
        for s in w.sag_spec: by_body.setdefault(s['body'], []).append(s)
        for mid in w.ids:
            J = []
            for act in w.mod[mid]['act']:
                j = m.actuator_trnid[act, 0]; b = m.jnt_bodyid[j]; spec = by_body.get(m.body(b).name, [])
                sub = np.array([x for x in range(m.nbody) if self._under(m, x, b)])
                J.append(dict(j=j, b=b, sub=sub, flex=[(s['axis'], s['k'], math.radians(s['rng'])) for s in spec if '_flex' in s['name']],
                              bl=next((math.radians(s['rng']) for s in spec if s['name'].endswith('_bl')), 0.0)))
            self.mods[mid] = dict(J=J, pts=np.array([m.body(f'{mid}_{p}').id for p in PARTS]))
        self.grav = m.opt.gravity.copy(); self.kp = PHYS['kp']; self.unfelt = []
        self.body_mod = {x: next((mid for mid in w.ids if m.body(x).name.startswith(f'{mid}_')), None) for x in range(m.nbody)}
        self.lp = {mid: np.zeros(7) for mid in w.ids}; self.droop = {mid: np.zeros(7) for mid in w.ids}; self.t = None; self.smooth_s = SMOOTH_S

    @staticmethod
    def _under(m, x, b):
        while x:
            if x == b: return True
            x = m.body_parentid[x]
        return False

    def load(self, J):
        """torque the rest of the world puts on everything past this joint, about its anchor (world axes) - as the REAL robot feels it:
        pushes and magnet pulls from ANOTHER module count only once the two are locked together (_unfelt)"""
        m, d = self.w.m, self.w.d; a = d.xanchor[J['j']]; S = J['sub']
        M = np.cross(d.xipos[S] - a, m.body_mass[S, None] * self.grav).sum(0)
        ext = d.cfrc_ext[S]; com = d.subtree_com[m.body_rootid[S]]
        M = M + (ext[:, :3] + np.cross(com - a, ext[:, 3:])).sum(0)
        for b, p, f in self.unfelt:
            if b in S: M = M - np.cross(p - a, f)
        return M

    def _unfelt(self):
        """the ideal world's forces between two modules that are NOT locked together yet: (body, point, force on that body).
        10 Nov, Isaac twin (isaac_twin.py): the ideal End B touched its socket and was magnet-held, so the predicted flex of the docking
        module dropped and its compensation with it - while the REAL end was still free, 23 mm short: it sagged, tipped 6.6 deg and hung
        there. The real robot cannot feel the other module before it touches, and has no sensor that says it does: until the lock is
        closed, its parts hang free. UNFELT=0 = the old behaviour."""
        w = self.w; m, d = w.m, w.d; out = []
        if os.environ.get('UNFELT', '1') != '1': return out
        joined = set()
        for k in getattr(w, 'engaged', ()):
            mods = {x.split('.')[0] for x in k.split('|') if not x.startswith('F:')}
            if len(mods) == 2: joined.add(frozenset(mods))
        free = lambda m1, m2: m1 and m2 and m1 != m2 and frozenset((m1, m2)) not in joined
        f6 = np.zeros(6)
        for i in range(d.ncon):
            c = d.contact[i]; b1, b2 = m.geom_bodyid[c.geom1], m.geom_bodyid[c.geom2]
            if not free(self.body_mod.get(b1), self.body_mod.get(b2)): continue
            mujoco.mj_contactForce(m, d, i, f6); f = c.frame.reshape(3, 3).T @ f6[:3]       # the push on geom2 (normal: geom1 -> geom2)
            out += [(b2, c.pos.copy(), f), (b1, c.pos.copy(), -f)]
        for m1, m2, b, Bm, Fv, rb, Pm in getattr(w, 'xmag', ()):
            if not free(m1, m2): continue
            out += [(b, p_, f_) for p_, f_ in zip(Bm, Fv)] + [(rb, p_, -f_) for p_, f_ in zip(Pm, Fv)]
        return out

    def solve(self, mid):
        """(joint correction, servo droop) in rad for one module"""
        d = self.w.d; M_ = self.mods[mid]; pts = M_['pts']; n = len(pts)
        A = np.zeros((6 * n, 7)); r = np.zeros(6 * n); droop = np.zeros(7); L = 0.1             # L: 0.1 rad of a link's tilt counts as much as 10 mm
        for i, J in enumerate(M_['J']):
            a = d.xanchor[J['j']]; u = d.xaxis[J['j']]; Mw = self.load(J); R = d.xmat[J['b']].reshape(3, 3); t = Mw @ u
            droop[i] = t / self.kp
            rot = u * (J['bl'] * math.tanh(t / 0.05))                                           # gear play taken up the way the load pushes
            for ax, k, rng in J['flex']:
                e = R @ ax; rot = rot + e * float(np.clip(Mw @ e / k, -rng, rng))
            for c, p in enumerate(pts):
                if p not in J['sub']: continue
                v = d.xpos[p] - a; A[6 * c:6 * c + 3, i] = np.cross(u, v); A[6 * c + 3:6 * c + 6, i] = u * L
                r[6 * c:6 * c + 3] += np.cross(rot, v); r[6 * c + 3:6 * c + 6] += rot * L
        self.Ar[mid] = (A, r)                                         # the live feedback reuses both (Feedback.step)
        # 11 Nov: ROLE weights while docking (RealSync.begin_follow sets self.focus): all parts equal let the target's socket part turn
        # 12 deg (a T1/T2 counter-twist that suits its other parts); the socket's part (target) / the end (docker) counts ROLE_W x
        Wv = np.ones(6 * n); fc = getattr(self, 'focus', {}).get(mid)
        if fc is not None: Wv[6 * fc[0]:6 * fc[0] + 6] = fc[1]
        dq = -np.linalg.solve(A.T @ (Wv[:, None] * A) + DAMP * np.eye(7), A.T @ (Wv * r))
        return np.clip(dq, -CORR_MAX, CORR_MAX), droop

    def tick(self):
        """called from the physics thread (the only one allowed to touch d)"""
        w = self.w; now = float(w.d.time); dt = 0.06 if self.t is None else max(now - self.t, 1e-3); self.t = now
        mujoco.mj_rnePostConstraint(w.m, w.d); self.unfelt = self._unfelt()
        k = min(1.0, dt / self.smooth_s)
        for mid in w.ids:
            dq, droop = self.solve(mid)
            self.lp[mid] += k * (dq - self.lp[mid]); self.droop[mid] += k * (droop - self.droop[mid])


FB_MODE = os.environ.get('SYNC_FB', 'robot')   # robot = encoders + IMU tilt + predicted flex (what a real robot knows); truth = exact parts (a perfect camera); off
FB_GAIN = float(os.environ.get('SYNC_FB_GAIN', '0.12'))   # share of the remaining error corrected each 60 ms tick (0.35 rang: the servos lag ~0.1 s)
FB_STILL = float(os.environ.get('SYNC_FB_STILL', '8'))    # deg/s: only while the ideal joints move slower than this (moving, the error is mostly servo lag)
FB_DEAD_MM = 0.3                                # smaller errors are left alone (sensor noise, deadband)
FB_DEAD_REAL_MM = float(os.environ.get('SYNC_FB_DEAD_REAL_MM', '0.8'))   # mm: the same for a real board (its encoder steps)
FB_MAX = math.radians(float(os.environ.get('SYNC_FB_MAX_DEG', '10')))
IMU_PART = PARTS.index('Spine2_B3B4')          # the MPU-6050 sits on Spine2 (phys_world IMU_POS)
L_ROT = 0.1                                     # same weighting as Correction.solve: 0.1 rad of tilt counts as much as 10 mm


class Feedback:
    """Nischay 5 Nov: 'check the live error of the real robot against ideal and adjust so real matches ideal'. Each tick, per
    module: where are its parts REALLY (estimated), where should they be (the ideal world), and which joint changes close the
    gap - the same part-motion matrix Correction uses. Integrated, so it keeps pushing until the error is gone.
    What is measured and what is predicted (Nischay: real telemetry has the motor errors in it, plastic flex is never seen):
      - servo angles: MEASURED (encoders) - droop, deadband, servo play are all in them, nothing predicted
      - Spine2 tilt: MEASURED (IMU accelerometer: tilt only, the yaw is not seen) - catches flex/sag upstream of it
      - plastic flex + gear play after the encoder: PREDICTED from the load (Correction's model)
    'truth' uses the copy's exact part poses instead (a perfect camera): the best this loop could ever do, for comparison.
    The source is anything shaped like a ModuleLink (online, read) - the real board, or the split view's copy (Twin.Board),
    which may also offer imu() and parts()."""
    def __init__(self, w, cor):
        self.w, self.cor = w, cor; self.dS = mujoco.MjData(w.m)
        self.fb = {mid: np.zeros(7) for mid in w.ids}; self.err_mm = {mid: 0.0 for mid in w.ids}; self.used = {mid: '' for mid in w.ids}

    @staticmethod
    def _rotvec(R):
        a = math.acos(float(np.clip((np.trace(R) - 1) / 2, -1, 1)))
        if a < 1e-9: return np.zeros(3)
        return a / (2 * math.sin(a)) * np.array([R[2, 1] - R[1, 2], R[0, 2] - R[2, 0], R[1, 0] - R[0, 1]])

    def step(self, mid, src, sign, moving=0.0):
        """this module's feedback correction (deg, sim frame), updated with the source's latest reading"""
        if FB_MODE == 'off' or mid not in self.cor.Ar or src is None or not getattr(src, 'online', False): return np.degrees(self.fb[mid])
        w, d = self.w, self.w.d; A, r = self.cor.Ar[mid]; pts = self.cor.mods[mid]['pts']; n = len(pts)
        Pid = d.xpos[pts]; Rid = d.xmat[pts].reshape(n, 3, 3)
        truth = FB_MODE == 'truth' and hasattr(src, 'parts')
        if truth:
            Pest, Rest = src.parts(mid); flex = np.zeros(6 * n); used = 'truth (exact parts)'
        else:
            rd = src.read
            if not rd or any(j not in rd for j in JN): return np.degrees(self.fb[mid])
            q = np.radians([sign[k] * (rd[j] - 180.0) for k, j in enumerate(JN)])
            S = self.dS; S.qpos[:] = d.qpos; S.qpos[np.array(w.mod[mid]['qa'])] = q; mujoco.mj_kinematics(w.m, S)
            Pest, Rest = S.xpos[pts].copy(), S.xmat[pts].reshape(n, 3, 3).copy(); flex = r; used = 'encoders + predicted flex'
        e = np.zeros(6 * n)
        for c in range(n):
            e[6 * c:6 * c + 3] = Pest[c] - Pid[c]
            e[6 * c + 3:6 * c + 6] = self._rotvec(Rest[c] @ Rid[c].T) * L_ROT
        e = e + flex                                                  # what the encoders cannot see, predicted
        # 11 Nov: the extra move the sender adds ON PURPOSE (push into the socket, follow the real socket) is not an error: without
        # this the feedback pulled the end back to the ideal pose within ~0.5 s (every blind push stalled 6-12 mm out)
        g_ = getattr(self, 'goal', {}).get(mid)
        if g_ is not None and os.environ.get('FB_GOAL', '0') == '1': e = e - g_   # (opt-in: on, the flat dock broke 11 Nov)
        imu = getattr(src, 'imu', None)
        if not truth and imu is not None:
            Rm = imu(mid)
            if Rm is not None:                                        # the IMU's tilt replaces Spine2's estimated tilt (yaw unseen)
                # an accelerometer cannot see a turn ABOUT gravity: drop that part (gravity's real direction, not world z - walls, 7 Nov)
                tv = self._rotvec(Rm @ Rid[IMU_PART].T); gh = w.m.opt.gravity / np.linalg.norm(w.m.opt.gravity); tv = tv - (tv @ gh) * gh
                e[6 * IMU_PART + 3:6 * IMU_PART + 6] = tv * L_ROT; used += ' + IMU tilt'
        self.err_mm[mid] = round(float(np.max(np.linalg.norm(e.reshape(n, 6)[:, :3], axis=1))) * 1000, 1); self.used[mid] = used
        self.__dict__.setdefault('e', {})[mid] = e.copy()                # each part's estimated pose error (RealSync.seat_depth)
        # 5 Nov, real board: under ~0.8 mm the error is the encoder's own 0.09 deg steps - correcting it made the loop hunt
        dead = FB_DEAD_MM if hasattr(src, 'parts') else FB_DEAD_REAL_MM
        if moving > FB_STILL or self.err_mm[mid] < dead: return np.degrees(self.fb[mid])   # hold: lag, or nothing to fix
        Wv = np.ones(6 * n); fc = getattr(self.cor, 'focus', {}).get(mid)                 # the same ROLE weights as Correction.solve
        if fc is not None: Wv[6 * fc[0]:6 * fc[0] + 6] = fc[1]
        dq = -np.linalg.solve(A.T @ (Wv[:, None] * A) + DAMP * np.eye(7), A.T @ (Wv * e))
        self.fb[mid] = np.clip(self.fb[mid] + FB_GAIN * dq, -FB_MAX, FB_MAX)
        if os.environ.get('FB_DEBUG') and int(w.d.time * 1000) % 1000 < 60:   # ~once a second: error, correction, at the cap?
            pe = np.linalg.norm(e.reshape(n, 6)[:, :3], axis=1) * 1000; pr = np.degrees(np.linalg.norm(e.reshape(n, 6)[:, 3:], axis=1) / L_ROT)
            print(f'FB {w.d.time:6.2f} {mid}: err {self.err_mm[mid]:5.1f} mm | per part mm {dict(zip([p.split("_")[0] for p in PARTS], np.round(pe, 1)))} '
                  f'deg {np.round(pr, 1)} | fb deg {np.round(np.degrees(self.fb[mid]), 1)}', flush=True)
            if not truth:
                qi = np.degrees(d.qpos[np.array(w.mod[mid]['qa'])]); qe = np.array([sign[k] * (src.read[j] - 180.0) for k, j in enumerate(JN)])
                print(f'FB {w.d.time:6.2f} {mid}: joints ideal {np.round(qi, 1)} | encoders {np.round(qe, 1)} | sent {np.round([sign[k] * (getattr(src, "sent", {}).get(j, 180.0) - 180.0) for k, j in enumerate(JN)], 1)}', flush=True)
            if hasattr(src, 'parts') and not truth:                           # the twin knows the truth: what the estimate SHOULD say
                Pt, Rt = src.parts(mid)
                print(f'FB {w.d.time:6.2f} {mid}: TRUE per part mm {np.round(np.linalg.norm(Pt - Pid, axis=1) * 1000, 1)} '
                      f'deg {np.round([math.degrees(np.linalg.norm(self._rotvec(Rt[c] @ Rid[c].T))) for c in range(n)], 1)}', flush=True)
        return np.degrees(self.fb[mid])


def speed_scale(deg_s):
    """the board's speed 1..10 (30..300 deg/s, firmware speedScaleToRaw) just above how fast the sim moves now: the servo then
    arrives as the next command comes and keeps moving, instead of dashing at 300 deg/s and stopping each tick (5 Nov: 'jerky')"""
    raw = deg_s * 1.3 / 0.0879                                       # encoder units / s, 30 % margin
    return int(np.clip(math.ceil(1 + (raw - 340) / 340), 1, 10))


class ModuleLink:
    """one board: keeps talking on its own thread, so an offline module never holds up the others"""
    def __init__(self, mid, host, want):
        self.mid, self.want, self.host = mid, want, host; self.ip = None; self.fails = 0; self.name = None; self.owner = None   # name: the board's own; owner: the Sync sending through it
        self.board = Esp32Robot('http://' + host, timeout=BOARD_TIMEOUT)
        self.heard = 0.0; self.read = {}; self.load = {}; self.error = ''; self.alive = True; self.sending = False
        self.sent = {}; self.trim = np.zeros(7); self.held = ''; self.far_t = None; self.lost_at = None; self.board_ms = None
        self.th = threading.Thread(target=self._run, daemon=True); self.th.start()

    def _resolve(self):
        """look 'mod1.local' up ONCE: on Windows Python's lookup takes 2-8 s, far over the 0.4 s a read may take (4 Nov)"""
        if self.ip and self.fails < 6: return
        # 5 Nov: Windows kept 'mod1.local' = the board's house-Wi-Fi address for minutes after it came back to ROBO4-NET; so
        # every 6 misses alternate between the name's answer and the last address the board itself reported (telemetry wifi.ip)
        good = getattr(self, 'good_ip', None)
        if good and self.ip != good: ip = good
        else:
            try: ip = socket.gethostbyname(self.host)
            except OSError: ip = None
        if ip and ip != self.ip: self.ip = ip; self.board.url = 'http://' + ip
        self.fails = 0

    def _poll(self):
        self._resolve()
        t0 = time.time(); t = self.board.telemetry(); ids = {s['id']: s for s in t.get('servos', [])}
        self.tel_raw, self.tel_at, self.tel_ms = t, time.time(), round((time.time() - t0) * 1000)   # shared with the Studio's top bar (boards_now)
        # back after a long gap or a restart (power cut: the board now boots limp): never resume by itself (Nischay, 4 Nov)
        restarted = self.board_ms is not None and t.get('ms') is not None and t['ms'] + 1000 < self.board_ms
        self.board_ms = t.get('ms', self.board_ms); self.name = (t.get('wifi') or {}).get('hostname') or self.name
        self.good_ip = (t.get('wifi') or {}).get('ip') or getattr(self, 'good_ip', None)
        gap = time.time() - self.lost_at if self.lost_at else 0.0
        self.lost_at = None
        if self.sending and not self.held and (restarted or gap > RESUME_GAP_S):
            self.held = 'module restarted (power cut?): check it, then press Sync' if restarted else f'no contact for {gap:.0f} s: check it, then press Sync'
        self.read = {j: ids[i]['currentAngle'] for j, i in SERVO_ID.items() if i in ids and ids[i].get('currentAngle') is not None}
        self.load = {j: ids[i].get('loadAbs', 0) for j, i in SERVO_ID.items() if i in ids}
        self.heard = time.time(); self.error = ''

    @property
    def online(self):
        """one missed reply is not 'offline' (the radio naps while the robot stands still): only OFFLINE_AFTER_S of silence is"""
        return time.time() - self.heard < OFFLINE_AFTER_S

    def _guard(self, want):
        """overloaded, or stuck far behind: stop pushing"""
        over = [j for j, v in self.load.items() if v > LOAD_STOP]
        behind = [j for j in want if j in self.read and j in self.sent and abs(self.read[j] - self.sent[j]) > BEHIND_DEG]
        if not over and not behind: self.far_t = None; return ''
        self.far_t = self.far_t or time.time()
        if time.time() - self.far_t < HOLD_S: return ''
        return f"servo overloaded: {', '.join(over)}" if over else f"servo stuck behind: {', '.join(behind)}"

    def _run(self):
        last = time.time()
        while self.alive:
            t0 = time.time()
            try:
                # 12 Nov (Nischay: Sync 'laggy, moves like frames'): the full status read (9 servos, 60-200 ms) ran before EVERY
                # step, so steps left ~5/s. Now a read only every POLL_S while sending; the step itself counts as contact.
                if not (self.sending and not self.held and self.read and t0 - getattr(self, 'poll_at', 0.0) < POLL_S):
                    self._poll(); self.poll_at = t0
                want = self.want(self.mid)
                if self.sending and not self.held:
                    self.held = self._guard(want)
                    if self.held: self.board.stop()
                if self.sending and not self.held and want:
                    dt = min(t0 - last, 0.3); before = dict(self.sent)
                    fastest = step_sent(self.sent, self.read, want, dt)
                    # 5 Nov: the same angles again every 60 ms only kept the small board busy (its replies grew past the timeout and
                    # the Sync box said offline while the top bar said online): resend only what changed, or every RESEND_S
                    same = before.keys() == self.sent.keys() and all(abs(self.sent[j] - before[j]) < 0.05 for j in before)
                    if not same or t0 - getattr(self, 'sent_at', 0.0) > RESEND_S:
                        # dt = the step interval: newer firmware gives every joint its own fine speed so it is still moving
                        # when the next step arrives (no dash-and-stop); older firmware ignores dt and uses speed 1..10
                        q = {'speed': speed_scale(fastest), 'acc': 40, 'dt': int(SEND_DT * 1000)}; q.update({str(SERVO_ID[j]): round(v, 2) for j, v in self.sent.items()})
                        self.board._get('/api/batch?' + urllib.parse.urlencode(q)); self.sent_at = t0; self.heard = time.time()
                last = t0; self.fails = 0
            except GosError as e:
                if 'refused' in str(e):                                           # it answered: locked after power-on etc. Online, but not moving
                    self.heard = time.time(); self.error = str(e).split(': ', 1)[-1]; self.sent = {}
                    if self.sending: self.held = 'the module refuses moves: ' + self.error
                    time.sleep(0.5); continue
                self.fails += 1; self.lost_at = self.lost_at or time.time()
                self.error = str(e).split('.')[0]; self.sent = {}; time.sleep(0.5)   # back online: starts again from the robot's real pose
            except Exception as e:
                self.fails += 1; self.lost_at = self.lost_at or time.time()
                self.error = f'{type(e).__name__}: {e}'; self.sent = {}; time.sleep(0.5)
            time.sleep(max(0.0, SEND_DT - (time.time() - t0)))


class RealSync:
    def __init__(self, w):
        self.w = w; self.cor = Correction(w); self.fbk = Feedback(w, self.cor); self.cfg = config(); self.links = {}; self.on = False; self.want_deg = {}
        self.rows = {}; self.prev = {}; self.prev_t = None; self.lock = threading.Lock(); self.stamp = -1.0
        for i, mid in enumerate(w.ids): self.cfg['hosts'].setdefault(mid, f'mod{i + 1}.local')
        self.limits = {mid: [tuple(math.degrees(v) for v in w.m.jnt_range[w.m.actuator_trnid[a, 0]]) for a in w.mod[mid]['act']] for mid in w.ids}

    def tick(self):
        """physics thread: the ideal joints + the correction -> the wanted angles of every servo"""
        w = self.w; now = float(w.d.time)
        if now - self.stamp < SEND_DT: return
        self.stamp = now; self.cor.tick(); dt = now - self.prev_t if self.prev_t is not None else None; self.prev_t = now
        rows, want = {}, {}
        for i, mid in enumerate(w.ids):
            q = np.degrees(w.d.qpos[np.array(w.mod[mid]['qa'])])
            vel = (q - self.prev[mid]) / dt if dt and mid in self.prev else np.zeros(7); self.prev[mid] = q
            fix = np.degrees(self.cor.lp[mid]); droop = np.degrees(self.cor.droop[mid]); L = self.links.get(mid)
            # whose encoders trim the command: the real board when it answers, else the split view's real copy (its encoders, read
            # the same way), so the copy shows what the real robot does WITH the trim (5 Nov: without it the copy stopped ~1 deg short)
            tw_ = getattr(self, 'twin', None)
            # 5 Nov: while Sync is ON only the real board counts - the copy (a guess) never stands in for it, even for a missed reply
            src = L if (L and L.online) or self.on else (tw_.board(mid, self.cfg) if tw_ is not None and tw_.alive else L)
            bc = board_cfg(self.cfg, L.name if L else None)
            sign = np.array([bc['sign'][j] for j in JN], float)
            # live feedback (Feedback): with a source that answers it replaces the slow encoder trim (it sees the same encoders, and more)
            fbon = FB_MODE != 'off' and src is not None and getattr(src, 'online', False)
            # 11 Nov (Isaac twin, slope): the brain finished M2's T1 turn to -98 while the servo was still at -68; 'not moving' went by
            # the BRAIN only, so the feedback took the servo's lag for an error, wound up to its 10 deg cap, and the servo overshot to
            # -113 (Spine1 14 deg off, the socket with it). Moving = the ideal joints OR the real encoders (deg/s, either one)
            rd_ = getattr(src, 'read', None) if fbon and os.environ.get('FB_REAL_MOVING', '0') == '1' else None; rv = 0.0   # (opt-in)
            if rd_ and all(j in rd_ for j in JN):
                qe_ = np.array([sign[k] * (rd_[j] - 180.0) for k, j in enumerate(JN)]); pe_ = self.__dict__.setdefault('prev_enc', {}).get(mid)
                if pe_ is not None and dt: rv = float(np.abs(qe_ - pe_).max() / dt)
                self.prev_enc[mid] = qe_
            xd = self._push_deg(mid, now) + self._follow_deg(mid) + self._cam_deg(mid, now)   # deg: the extra move on purpose (push, follow, camera)
            if mid in self.cor.Ar: self.fbk.__dict__.setdefault('goal', {})[mid] = self.cor.Ar[mid][0] @ np.radians(xd)
            fbd = self.fbk.step(mid, src, sign, max(float(np.abs(vel).max()), rv)) if fbon else np.zeros(7)
            cs_ = getattr(self, 'cam_state', None)                                    # the camera steers this end: the feedback holds its value
            if fbon and cs_ and cs_.get('mid') == mid and cs_.get('fresh_t') is not None:
                fbd = np.degrees(cs_.setdefault('fb0', self.fbk.fb[mid].copy()))
            # 11 Nov: while this module PUSHES into a socket the feedback (12 %/60 ms back to the ideal pose) undid the push and the
            # untilt within ~0.5 s - every blind push stalled 6-12 mm out. Pushing: keep the feedback's last correction, frozen
            pu_ = getattr(self, 'push', None)
            if fbon and pu_ and pu_['mid'] == mid and os.environ.get('PUSH_FREEZE_FB', '0') == '1':
                fbd = np.degrees(pu_.setdefault('fb0', self.fbk.fb[mid].copy()))
            trim = np.zeros(7) if fbon else (src.trim if src else np.zeros(7))
            # where the encoder should read = ideal + the module's correction; the servo must be told more: its droop shows on the encoder
            enc = q + fix; cmd = enc - droop + trim + fbd + vel * LAG + xd
            cmd = np.array([float(np.clip(c, *self.limits[mid][k])) for k, c in enumerate(cmd)])
            real = {j: 180.0 + sign[k] * c for k, (j, c) in enumerate(zip(JN, cmd))}
            lock = w.tgt[i * 9 + 7:i * 9 + 9]
            real['L1'] = lock_board_deg(bc, 'L1', math.degrees(float(lock[0]))); real['L2'] = lock_board_deg(bc, 'L2', math.degrees(float(lock[1])))
            want[mid] = real
            rows[mid] = dict(ideal=q, fix=fix, droop=droop, cmd=cmd, enc=180.0 + sign * enc)
            if os.environ.get('FB_DEBUG') and int(now * 1000) % 1000 < 60:
                print(f'CMD {now:6.2f} {mid}: ideal {np.round(q, 1)} | fix {np.round(fix, 1)} | droop {np.round(droop, 1)} | fb {np.round(fbd, 1)} | lag {np.round(vel * LAG, 1)}', flush=True)
            rd = src.read if src is not None and getattr(src, 'online', False) and not fbon else None
            if rd and np.abs(vel).max() < 2.0:                                   # standing still: the encoder says what the servo really did
                for k, j in enumerate(JN):
                    if j in rd:
                        e = sign[k] * (rows[mid]['enc'][k] - rd[j])
                        if abs(e) > TRIM_DEAD: src.trim[k] = float(np.clip(src.trim[k] + np.clip(e, -1, 1) * TRIM_RATE * SEND_DT, -TRIM_MAX, TRIM_MAX))
        with self.lock: self.want_deg, self.rows = want, rows
        live = self.real_live()
        tl = getattr(self, 'telw', None)
        if live and tl is not None and tl.alive: self._feed_real(now, live, rows)
        tw = getattr(self, 'twin', None)
        if tw is not None and tw.alive and not self.on:                   # the sim copy runs only while Sync is off
            tw.push(now, {mid: np.radians(r['cmd']) for mid, r in rows.items()}, w.tgt.copy(), set(w.engaged))

    def begin_follow(self, mid, end, rx_name):
        """11 Nov (Isaac twin, slope 45): the TARGET module's socket part sagged/tilted ~6-12 deg (its base bracket's sideways give,
        which no joint below it can undo) and the docker aimed at the IDEAL socket - centred by the spiral it still jammed 7 mm out at
        11 deg. The live feedback's estimate of that socket part was good (11.8 vs 11.4 deg true). So the docking end is shifted and
        turned by the socket's ESTIMATED error: it docks where the socket really is. FOLLOW=0 = off"""
        self.follow = dict(mid=mid, end=end, rx=rx_name) if os.environ.get('FOLLOW', '0') == '1' else None
        self.cam_state = dict(mid=mid, end=end, rx=rx_name, cc=np.zeros(3), cr=np.zeros(3), t=None, fresh_t=None)   # the camera's steering, per dock
        # ... and the flex compensation's ROLE weights (Correction.solve): the docker's end, the target's socket part
        w = self.w; R = next((x for x in w.rx if x['name'] == rx_name), None); self.cor.focus = {mid: (PARTS.index(f'End{end}_LockModule'), float(os.environ.get('ROLE_W_DOCK', '1')))}   # the docker's end (11 Nov: x10 broke flat)
        if R is not None and R.get('mod') and float(os.environ.get('ROLE_W', '1')) != 1.0:
            pts = list(self.cor.mods[R['mod']]['pts']); b = R['bid']
            while b and b not in pts: b = w.m.body_parentid[b]
            if b: self.cor.focus[R['mod']] = (pts.index(b), float(os.environ.get('ROLE_W', '1')))   # the TARGET's socket part

    def end_follow(self):
        self.follow = None; self.cor.focus = {}; self.cam_state = None

    def _follow_deg(self, mid):
        F_ = getattr(self, 'follow', None)
        if not F_ or F_['mid'] != mid or mid not in self.cor.Ar: return np.zeros(7)
        w, d = self.w, self.w.d; R = next((x for x in w.rx if x['name'] == F_['rx']), None); E = getattr(self.fbk, 'e', {})
        tm = R.get('mod') if R else None
        if tm is None or tm not in E: return np.zeros(7)
        pts = list(self.cor.mods[tm]['pts']); b = R['bid']
        while b and b not in pts: b = w.m.body_parentid[b]
        if not b: return np.zeros(7)
        e = E[tm][6 * pts.index(b):6 * pts.index(b) + 6] + getattr(self.fbk, 'goal', {}).get(tm, np.zeros(6 * len(pts)))[6 * pts.index(b):6 * pts.index(b) + 6]
        seat, _, _ = w.rx_frame(R, d.xmat[R['bid']].reshape(3, 3), d.xpos[R['bid']]); rot = e[3:] / L_ROT
        want = np.concatenate([e[:3] + np.cross(rot, seat - d.xpos[b]), rot * L_ROT])        # move the end as the socket really sits
        A, _ = self.cor.Ar[mid]; c = PARTS.index(f"End{F_['end']}_LockModule"); Ae = A[6 * c:6 * c + 6]
        dq = np.linalg.solve(Ae.T @ Ae + 1e-4 * np.eye(7), Ae.T @ want)
        lim = math.radians(float(os.environ.get('FOLLOW_MAX_DEG', '15'))); return np.degrees(np.clip(dq, -lim, lim))

    def _cam_deg(self, mid, now):
        """the CAMERA (optional add-on, 11 Nov): a fresh hand-held measurement of the docking end against its socket (self.cam, brain
        frame: rel = tip - seat, rot = the turn that lines it up, z = the socket axis) steers the docking end for the WHOLE approach
        (wall: the real end hung 70-80 mm aside for 10 s before the push; the camera saw it, 72 vs 71 mm). Each shot is used once:
        CAM_GAIN of its side offset + tilt is removed, integrated (caps CAM_MAX_MM / 15 deg). Implausible shots (tilt > 25 deg: a
        single tag's flipped pose) are ignored. No camera / no dock: zeros (nothing changes)"""
        cs = getattr(self, 'cam_state', None); cm = getattr(self, 'cam', None)
        if not cs or cs.get('mid') != mid or mid not in self.cor.Ar: return np.zeros(7)
        lk_ = self.w.tgt[self.w.ids.index(mid) * 9 + (8 if cs['end'] == 'B' else 7)]
        if abs(float(lk_)) > 0.05: cs['seated'] = True; cs['lock_turning'] = True   # the lock is turning: hold still
        if not cs.get('lock_turning') and cm is not None and cm['t'] != cs.get('t') and now - cm['t'] < float(os.environ.get('CAM_FRESH_S', '1.5'))                 and np.linalg.norm(cm['rot']) <= math.sin(math.radians(25)):
            cs['t'] = cm['t']; cs['fresh_t'] = now; gc = float(os.environ.get('CAM_GAIN', '0.4'))
            side = cm['rel'] - (cm['rel'] @ cm['z']) * cm['z']
            cs['depth_ok'] = float(np.clip((0.008 - np.linalg.norm(side)) / 0.005, 0.0, 1.0))   # push full depth only under ~3 mm aside
            # STUCK at the mouth (11 Nov, ceiling: centred but 2-3 deg tilted, 6.5 mm out for 12 s - in contact, friction stopped the
            # untilt): the camera's depth did not shrink over the last 3 shots while pushing -> back off 5 mm for 1.5 s, the
            # corrections finish while free, then in again (a hand re-trying a key)
            ax_ = float(cm['rel'] @ cm['z']); hs = cs.setdefault('axh', []); hs.append(ax_)
            pu_ = getattr(self, 'push', None); pushing = bool(pu_ and pu_.get('t0') is not None and now - pu_['t0'] > float(os.environ.get('PUSH_RAMP_S', '1.0')) + 1.0 and pu_.get('t_end') is None)
            if not pushing: cs['axh'] = []                                              # (only WHILE pushing - 11 Nov: it fired at the stand-off, slope regressed)
            # SEATED -> hands off (11 Nov, slope: in at 19 s, then single-tag readings jittering +-4 mm 'steered' it back out to 12 mm):
            # a reading within 2 mm of the seat, or the lock rotor turning, freezes the camera's steering where it is
            # (11 Nov, random robot 4 on the ceiling: ONE reading said 1.4 mm while the truth was 7.8 -> froze 7 mm out. Two readings
            # in a row under 2.5 mm to hold; three in a row over 4 mm release the hold again - unless the lock is turning)
            if pushing and len(hs) >= 2 and max(abs(hs[-1]), abs(hs[-2])) < 0.0025: cs['seated'] = True
            # (11 Nov, random robot 5 on the ceiling: centred, 7 mm out for 14 s, the camera's depth jittering 0..13 mm - 'the last 3 all
            # > 4 mm' never held. The MEDIAN of the last 4 readings decides: > 4 mm out and not 1 mm better than the 4 before)
            md = float(np.median(hs[-4:])) if len(hs) >= 4 else 0.0; md0 = float(np.median(hs[-8:-4])) if len(hs) >= 8 else -1e9   # (too few: count as not improving)
            if cs.get('seated') and not cs.get('lock_turning') and len(hs) >= 4 and md > 0.004: cs['seated'] = False
            if pushing and len(hs) >= 4 and cs['depth_ok'] > 0.5 and md > 0.004 and md > md0 - 0.001 and now > cs.get('back_until', -1) + 2.0:
                cs['back_until'] = now + float(os.environ.get('CAM_BACKOFF_S', '1.5')); cs['axh'] = []; cs['stuck'] = cs.get('stuck', 0) + 1
            if cs.get('seated'): gc = 0.0                                                   # held: readings still counted, no steering
            cl = float(os.environ.get('CAM_MAX_MM', '50')) / 1000
            cc = cs['cc'] - gc * side; n_ = np.linalg.norm(cc); cs['cc'] = cc * (cl / n_ if n_ > cl else 1.0)
            cr = cs['cr'] + gc * cm['rot']; n_ = np.linalg.norm(cr); cap = math.radians(15); cs['cr'] = cr * (cap / n_ if n_ > cap else 1.0)
        if not np.any(cs['cc']) and not np.any(cs['cr']): return np.zeros(7)
        A, _ = self.cor.Ar[mid]; c = PARTS.index(f"End{cs['end']}_LockModule"); Ae = A[6 * c:6 * c + 6]
        want = np.concatenate([cs['cc'], cs['cr'] * L_ROT])
        # STUCK again after a back-off -> ROCK the tilt (11 Nov, random robot 4 on the ceiling: End B's body on the socket lip 7 mm out,
        # centred but 3.5 deg tilted while the camera read 1.4-2.7 - one end tag measures tilt worst; a plain retry jammed the same
        # way). A slow +-CAM_ROCK_DEG circle of the end's tilt: at some phase the unseen tilt cancels and it slips in
        if cs.get('stuck', 0) >= 1 and not cs.get('seated') and cm is not None and float(os.environ.get('CAM_ROCK_DEG', '0')) > 0:
            zz = cm['z']; e1 = np.cross(zz, [1.0, 0, 0] if abs(zz[0]) < 0.9 else [0, 1.0, 0]); e1 /= np.linalg.norm(e1); e2 = np.cross(zz, e1)
            ph = 2 * math.pi * 0.4 * now; amp = math.radians(float(os.environ.get('CAM_ROCK_DEG', '0')))
            want[3:] += amp * (math.cos(ph) * e1 + math.sin(ph) * e2) * L_ROT
        return np.degrees(np.linalg.solve(Ae.T @ Ae + 1e-4 * np.eye(7), Ae.T @ want))

    def begin_push(self, mid, end, rx_name):
        """blind peg-in-hole (10 Nov, Isaac twin): the ideal end is seated, the real one may hang a few mm short or aside - flex and gear
        play the encoders cannot see (8 mm short, 2 mm aside in the twin, nothing pushing it further). So the REAL end is told to go
        PUSH_MM further INTO the socket along its axis, ramped over PUSH_RAMP_S: the socket's chamfers and the magnets centre it,
        contact takes the rest. Bounded: the servos' torque cap and the PLA give limit the force. end_push() ramps it back out."""
        self.push = dict(mid=mid, end=end, rx=rx_name, t0=None, t_end=None, mm=float(os.environ.get('PUSH_MM', '12')))

    def end_push(self):
        if getattr(self, 'push', None): self.push['t_end'] = None if self.push.get('t_end') else -1.0   # ramp out from the next tick

    def _push_deg(self, mid, now):
        P_ = getattr(self, 'push', None)
        if not P_ or P_['mid'] != mid or mid not in self.cor.Ar: return np.zeros(7)
        if P_['t0'] is None: P_['t0'] = now
        if P_.get('t_end') == -1.0: P_['t_end'] = now
        ramp = float(os.environ.get('PUSH_RAMP_S', '1.0'))
        k = min(1.0, (now - P_['t0']) / ramp)
        if P_.get('t_end') is not None:
            k = k * max(0.0, 1.0 - (now - P_['t_end']) / ramp)
            if k <= 0.0:
                if 'fb0' in P_: self.fbk.fb[mid] = P_['fb0'].copy()          # the feedback resumes from where it was frozen
                self.push = None; return np.zeros(7)
        w = self.w; R = next(x for x in w.rx if x['name'] == P_['rx'])
        _, z, Fr = w.rx_frame(R, w.d.xmat[R['bid']].reshape(3, 3), w.d.xpos[R['bid']])  # the socket's outward axis, ideal world
        A, _ = self.cor.Ar[mid]; c = PARTS.index(f"End{P_['end']}_LockModule"); Ae = A[6 * c:6 * c + 6]
        want = np.concatenate([-z * P_['mm'] / 1000 * k * P_.get('depth_ok', 1.0), np.zeros(3)])   # straight IN, the end's tilt unchanged
        # ... and SPIRAL across the socket face while pushing (PUSH_SPIRAL_MM, default 7, 0 = off): 10 Nov, Isaac twin pictures - the blind end
        # sat on the ring's RIM ~6 mm aside (the feedback cannot see that), pushed 8-10 mm short. The classic blind peg-in-hole
        # search: a slowly growing circle (0.6 Hz, full size after PUSH_SPIRAL_S) until it lines up and the push + magnets take it in
        sp = float(os.environ.get('PUSH_SPIRAL_MM', '7')) / 1000
        cm_ = getattr(self, 'cam', None)
        if cm_ is not None and now - cm_['t'] < float(os.environ.get('CAM_FRESH_S', '1.5')): sp = 0.0   # the camera centres: no blind search
        if sp > 0 and k >= 1.0 and P_.get('t_end') is None:
            ts = now - P_['t0'] - ramp; r_ = sp * min(1.0, ts / float(os.environ.get('PUSH_SPIRAL_S', '5'))); ph = 2 * math.pi * 0.6 * ts
            want[:3] += r_ * (math.cos(ph) * Fr[:, 0] + math.sin(ph) * Fr[:, 1])
        # ... and UNTILT (PUSH_TILT_GAIN /s, 0 = off): 11 Nov, slope 45 - centred by the spiral but 8-11 deg tilted (sag), it jammed 6 mm
        # out. The blind estimate (seat_depth: encoders + IMU + predicted flex) read 10.3 deg vs 8-9 true - so turn the end against its
        # ESTIMATED tilt, integrated (closed loop on the estimate), capped at 15 deg
        gt = float(os.environ.get('PUSH_TILT_GAIN', '0'))
        if gt > 0 and P_.get('t_end') is None:
            est = self.seat_depth(mid, P_['end'], P_['rx'])
            if est is not None:
                rc = P_.get('rc', np.zeros(3)) - gt * est[3] * SEND_DT; n_ = np.linalg.norm(rc); cap = math.radians(15)
                P_['rc'] = rc * (cap / n_ if n_ > cap else 1.0)
                # ... and CENTRE on the estimate too (PUSH_SIDE_GAIN /s): untilted, the tip swung 12-23 mm aside (the estimate saw it,
                # 12.8 vs 12.8 true) - more than the spiral covers. Integrated, capped 20 mm; the spiral then searches what is left
                gs = float(os.environ.get('PUSH_SIDE_GAIN', '0'))
                if gs > 0:
                    pc = P_.get('pc', np.zeros(3)) - gs * est[4] * SEND_DT; n_ = np.linalg.norm(pc)
                    P_['pc'] = pc * (0.02 / n_ if n_ > 0.02 else 1.0)
            want[3:] += P_.get('rc', np.zeros(3)) * L_ROT * k
            want[:3] += P_.get('pc', np.zeros(3)) * k
        # ... the CAMERA steers the end itself (_cam_deg, the whole approach); here it only GATES the depth: centre first, then in
        # (11 Nov, S2B: pushed while 7.5 mm aside, the end slid 40 mm along the spine face)
        cs = getattr(self, 'cam_state', None)
        if cs and cs.get('mid') == mid and cs.get('fresh_t') is not None and now - cs['fresh_t'] < float(os.environ.get('CAM_FRESH_S', '1.5')):
            want[:3] = want[:3] * cs.get('depth_ok', 1.0)
            if now < cs.get('back_until', -1) and not cs.get('seated'): want[:3] = z * float(os.environ.get('CAM_BACKOFF_MM', '5')) / 1000   # backing off (stuck)
        dq = np.linalg.solve(Ae.T @ Ae + 1e-4 * np.eye(7), Ae.T @ want)                      # (a turned end jams in the socket)
        # ... and WIGGLE while pushing (PUSH_WIGGLE_DEG, 0 = off): 10 Nov, Isaac twin - pushed straight, the end jammed 8.5 mm short at
        # 2.3 deg tilt; an earlier success had been helped by accidental shaking. The 3 joints next to the end circle out of phase
        # (as Manual.lock's LOCK_WIGGLE, 1.5 Hz): the end sweeps round the socket's axis and slips in - a hand jiggling a key
        wg = math.radians(float(os.environ.get('PUSH_WIGGLE_DEG', '0')))
        if wg > 0 and k >= 1.0 and P_.get('t_end') is None:
            ph = (now - P_['t0'] - ramp) * 2 * math.pi * 1.5; ks = (4, 5, 6) if P_['end'] == 'B' else (0, 1, 2)
            for n_, kk in enumerate(ks): dq[kk] += wg * math.sin(ph + 2.1 * n_)
        return np.degrees(dq)

    def seat_depth(self, mid, end, rx_name):
        """BLIND 'am I in?' (10 Nov): where the docking end's tip is in the socket, from the ENCODERS alone - every answering module
        posed at its read angles in a scratch copy of the ideal world, measured as phys_world measures 'seated' (along the socket
        axis, + = still out; sideways). Uses the live feedback's own estimate of every part (encoders + IMU tilt + PREDICTED flex,
        Feedback.step): the ideal tip / seat moved by their part's estimated error (shift + turn about the part). 10 Nov twin: encoders
        alone said 2.5 mm PAST the seat while the end hung 10.5 mm short on the lip (the servos reach their angles, the PLA bends).
        None until the feedback has run for both modules."""
        w, d = self.w, self.w.d; E = getattr(self.fbk, 'e', {})
        R = next(x for x in w.rx if x['name'] == rx_name); seat, z, _ = w.rx_frame(R, d.xmat[R['bid']].reshape(3, 3), d.xpos[R['bid']])
        tip = d.site_xpos[w.mod[mid]['end'][end]['tip']].copy()

        def moved(m_, body, p):                                           # p carried by the estimated error of the part holding `body`
            if m_ not in E: return None
            pts = list(self.cor.mods[m_]['pts']); b = body
            while b and b not in pts: b = w.m.body_parentid[b]
            if not b: return p
            c = pts.index(b); e = E[m_][6 * c:6 * c + 6]
            return p + e[:3] + np.cross(e[3:] / L_ROT, p - d.xpos[b])
        def turn(m_, body):                                               # the estimated turn (rad vector) of the part holding `body`
            if m_ not in E: return np.zeros(3)
            pts = list(self.cor.mods[m_]['pts']); b = body
            while b and b not in pts: b = w.m.body_parentid[b]
            return E[m_][6 * pts.index(b) + 3:6 * pts.index(b) + 6] / L_ROT if b else np.zeros(3)
        tb = w.m.site_bodyid[w.mod[mid]['end'][end]['tip']]
        tip = moved(mid, tb, tip)
        seat = moved(R['mod'], R['bid'], seat) if R.get('mod') else seat
        if tip is None or seat is None: return None
        rel = tip - seat; ax = float(rel @ z)
        # 11 Nov: + the end's TILT against the socket axis (the slope run jammed 6 mm out at 8-11 deg tilt, centred): the two parts'
        # estimated turns, minus the part about the socket axis (a spin about it does not tilt), relative to the ideal (seated = 0)
        dr = turn(mid, tb) - (turn(R['mod'], R['bid']) if R.get('mod') else np.zeros(3)); dr = dr - (dr @ z) * z
        return ax * 1000, float(np.linalg.norm(rel - ax * z)) * 1000, math.degrees(float(np.linalg.norm(dr))), dr, rel - ax * z

    def real_live(self):
        """the real modules that answer while Sync is on: {module: link}"""
        return {mid: L for mid, L in self.links.items() if self.on and L.online and L.read and all(j in L.read for j in JN)} if self.on else {}

    def _feed_real(self, now, live, rows):
        """Nischay 5 Nov: with the real robot on Sync the right half is the REAL robot, from its telemetry only. Its encoder angles
        (they carry every real motor error, friction, push and air, so no simulated room, randomness or motor model is added)
        go to a clean physics world (Twin mode 'telemetry'), which subtracts what no sensor sees - plastic flex, gear play, lock
        play, PREDICTED by Correction from the load of THAT world's pose, i.e. the real pose, not the ideal one (a rigid module
        posed at encoders - correction lands where the flexed real one is):
        exact joints, gravity, floor, no randomness. Physics puts it on the floor, so WHERE it lies comes from the real angles,
        not from the ideal robot (5 Nov: the old rebuild took the ideal robot's base - it 'went there' before the real one did).
        Encoder flicker under ENC_HOLD deg is held (it shook the picture). Lock rotors: their real angle. No IMU / camera needed.
        Modules that do not answer keep their last real pose."""
        w = self.w; cmd = {}; tgt = self.telw.w.tgt.copy(); hold = self.__dict__.setdefault('enc_hold', {})
        for i, mid in enumerate(w.ids):
            L = live.get(mid)
            if L is None: continue
            bc = board_cfg(self.cfg, L.name); sign = np.array([bc['sign'][j] for j in JN], float)
            q = np.array([sign[k] * (L.read[j] - 180.0) for k, j in enumerate(JN)])
            h = hold.get(mid)
            if h is not None: q = np.where(np.abs(q - h) < ENC_HOLD, h, q)
            hold[mid] = q
            cmd[mid] = np.radians(q)                                      # the flex is predicted in that world, from ITS (real) pose
            for e, (j, off) in (('A', ('L1', 7)), ('B', ('L2', 8))):
                if j in L.read: tgt[i * 9 + off] = math.radians(bc['lock_sign'][j] * (L.read[j] - 180.0 - float(bc['lock_home'][j])))
        self.telw.push(now, cmd, tgt, set(w.engaged))

    def real_frames(self):
        tl = getattr(self, 'telw', None); return tl.frames() if tl is not None else []


    def _want(self, mid):
        with self.lock: return dict(self.want_deg.get(mid, {}))

    def _sources(self):
        tw = getattr(self, 'twin', None); out = {}
        for mid in self.w.ids:
            L = self.links.get(mid)
            if self.on:
                if L and L.online: out[mid] = L
            elif tw is not None and tw.alive: out[mid] = tw.board(mid, self.cfg)
        return out

    def has_feedback(self):
        """a real robot (Sync on) or the split view's copy is answering, and the live feedback is on"""
        return FB_MODE != 'off' and bool(self._sources())

    def settled(self, tol_mm):
        """every answering module's parts within tol_mm of the ideal ones (the feedback's last estimate)"""
        return all(self.fbk.err_mm.get(mid, 1e9) <= tol_mm for mid in self._sources())

    def _link(self, mid, own=False):
        L = self.links.get(mid)
        if L is None or not L.alive or own: L = self.links[mid] = get_link(mid, self.cfg['hosts'][mid], self._want, self if own else None)
        return L

    def command(self, cmd):
        op = cmd.get('op')
        if op == 'hosts':
            for mid, h in (cmd.get('hosts') or {}).items():
                if mid in self.cfg['hosts'] and h != self.cfg['hosts'][mid]:
                    self.cfg['hosts'][mid] = h
                    if mid in self.links: L = self.links.pop(mid); L.alive = False; LINKS.pop(L.host, None)
            with open(tpath(CONFIG), 'w') as f: json.dump(self.cfg, f, indent=1)
        elif op == 'on':
            self.on = True
            for other in {L.owner for L in LINKS.values()} - {self, None}: other.on = False   # another tab's Sync lets go
            for mid in self.w.ids: L = self._link(mid, own=True); L.held = ''; L.far_t = None; L.sent = {}; L.sending = True
        elif op == 'off':
            self.on = False
            for L in self.links.values():
                if L.owner is self: L.sending = False
        elif op == 'stop':                                                        # the board's emergency stop on every module
            self.on = False
            for L in self.links.values(): L.sending = False
            bad = [mid for mid in self.w.ids if not self._link(mid).board.stop().ok]
            return dict(ok=not bad, error=f'emergency stop NOT confirmed on {", ".join(bad)}: cut the power if it moves' if bad else '')
        elif op != 'view': return dict(ok=False, error=f'unknown sync op {op}')
        return dict(ok=True)

    def close(self):
        for L in self.links.values():
            if L.owner is self: L.sending = False; L.owner = None

    def state(self):
        """what the box shows; computed whether or not a robot answers"""
        with self.lock: want, rows = self.want_deg, self.rows
        mods = {}
        for mid in self.w.ids:
            L = self.links.get(mid); w_ = want.get(mid, {}); r = rows.get(mid); joints = []
            for j in ['L1'] + JN + ['L2']:
                k = JN.index(j) if j in JN else None
                joints.append(dict(j=j, id=SERVO_ID[j], ideal=None if k is None or r is None else round(float(r['ideal'][k]), 1),
                                   fix=None if k is None or r is None else round(float(r['fix'][k] - r['droop'][k]), 2),
                                   send=round(w_[j], 1) if j in w_ else None, real=round(L.read[j], 1) if L and j in L.read else None))
            bc = board_cfg(self.cfg, L.name if L else None)
            mods[mid] = dict(host=self.cfg['hosts'][mid], board=L.name if L else None, signs_checked=bc['signs_checked'], locks_checked=bc['locks_checked'], signs_known=bc['known'], online=bool(L and L.online), error=L.error if L else '', held=L.held if L else '', joints=joints)
        return dict(on=self.on, signs_checked=all(m['signs_checked'] for m in mods.values()), locks_checked=all(m['locks_checked'] for m in mods.values()), modules=mods)


class Twin:
    """the REAL robot as the sim expects it (Nischay 5 Nov: 'split the view, left ideal, right real'): a realistic world (PLA flex,
    gear play, servo droop and deadband, per-robot randomness, room disturbances) that gets EXACTLY what Sync sends a board -
    RealSync's corrected angles every 60 ms, open loop - so you see what the real modules would do. It runs on its own thread
    (~3x slower than real time on this laptop) and reports how far behind it is. A lock the ideal side closes is checked here:
    seated or not, as Manual.lock checks it.
    REUSE-CHECKED: world = manual.Manual (realistic, not paced), angles = RealSync.tick rows, test harness = sim/sync_twin.py."""
    def __init__(self, scene, cur, now, seed, log, mode='copy'):
        import manual as M
        self.M, self.log, self.mode = M, log, mode
        sc = dict(scene, locks=[dict(a=L['a'], b=L['b']) for L in cur])
        tel = mode == 'telemetry'                                         # the REAL robot's world (RealSync._feed_real): no guessed errors
        self.who = 'REAL robot' if tel else 'REAL copy'
        self.s = M.Manual(sc, seed=seed, pace=False, randomize=not tel, disturb=not tel, judge='off', ideal=tel, log=None)
        w = self.w = self.s.w; w.on_tick = None
        self.cor = Correction(w) if tel else None                         # the flex of the REAL pose (RealSync._feed_real)
        if self.cor: self.cor.smooth_s = 2.0                              # a lying robot's floor contacts flicker; real plastic does not
        t_now, tgt = now(); w.tgt[:] = tgt; w.run(0.5)                         # start where the ideal robot is NOW (it moved on while this was built); 0.5 s: Manual already settled it
        w.d.time = float(now()[0])                                                # ...on the same clock
        w.rec = {'dt': 1.0 / self.s.fps, 'last': -1.0, 'frames': []}
        self.q, self.alive, self.pending, self.failed, self.seed, self.boards = [], True, {}, set(), seed, {}
        self.cv = threading.Condition(); self.last = ''; self.rate = (time.time(), float(w.d.time), 0.0)
        self.th = threading.Thread(target=self._run, daemon=True); self.th.start()

    class Board:
        """the copy's encoders, shaped like a ModuleLink (online / read in board degrees / trim), so RealSync trims it the same way"""
        def __init__(self, tw, mid, cfg): self.tw, self.mid, self.cfg, self.trim, self.online = tw, mid, cfg, np.zeros(7), True
        def parts(self, mid):
            w = self.tw.w; ids = [w.m.body(f'{mid}_{p}').id for p in PARTS]
            return w.d.xpos[ids].copy(), w.d.xmat[ids].reshape(len(ids), 3, 3).copy()

        def imu(self, mid):
            """Spine2's real orientation (accelerometer: only its tilt is used), with ~0.3 deg of sensor noise"""
            w = self.tw.w; return mpu_reading(w.d.xmat[w.m.body(f'{mid}_Spine2_B3B4').id].reshape(3, 3))

        @property
        def read(self):
            w = self.tw.w; q = np.degrees(w.d.qpos[np.array(w.mod[self.mid]['qa'])]); bc = board_cfg(self.cfg)
            return {j: 180.0 + bc['sign'][j] * float(q[k]) for k, j in enumerate(JN)}

    def board(self, mid, cfg):
        b = self.boards.get(mid)
        if b is None: b = self.boards[mid] = Twin.Board(self, mid, cfg)
        return b

    def push(self, t, cmd, tgt, engaged):
        with self.cv: self.q.append((t, cmd, tgt, engaged)); self.cv.notify()

    def behind(self):
        with self.cv: return round(self.q[-1][0] - float(self.w.d.time), 1) if self.q else 0.0

    def frames(self):
        rec = self.w.rec; fr = rec['frames']; rec['frames'] = []; return fr

    def _seat(self, k):
        a, b = k.split('|'); L = self.M.canon(a, b); (dm, de), _ = self.M.docking_of(L)
        return L, self.w.end_vs(dm, de, self.M.ref_name(L['a']))

    def _run(self):
        w = self.w
        while self.alive:
            with self.cv:
                while self.alive and not self.q: self.cv.wait(0.3)
                if not self.alive: return
                if self.mode == 'telemetry': t, cmd, tgt, engaged = self.q[-1]; self.q.clear()   # only the newest reading matters
                else: t, cmd, tgt, engaged = self.q.pop(0)
            try:
                for i, mid in enumerate(w.ids):
                    if mid not in cmd: continue
                    if self.cor is None: w.tgt[i * 9:i * 9 + 7] = cmd[mid]; continue
                    # the real pose's flex feeds back into that pose (its floor contacts): a change under ENC_HOLD is held,
                    # else the lying module crept a few mm while the real one lay still (5 Nov test: 5-7 mm)
                    new = cmd[mid] - self.cor.lp[mid]; old = w.tgt[i * 9:i * 9 + 7]
                    w.tgt[i * 9:i * 9 + 7] = np.where(np.abs(new - old) < math.radians(ENC_HOLD), old, new)
                    w.tgt[i * 9 + 7:i * 9 + 9] = tgt[i * 9 + 7:i * 9 + 9]           # the lock rotors: the same command the board gets
                dt = t - float(w.d.time)
                if self.mode == 'telemetry':                                    # keep up with the real robot: at most 0.25 s of physics per
                    if dt > 0: w.run(min(dt, 0.25))                              # reading, then the clock jumps to the reading's time
                    if t > float(w.d.time): w.d.time = t
                    self.cor.tick()
                elif dt > 0: w.run(min(dt, 1.0))
                for k in engaged - set(w.engaged) - set(self.pending) - self.failed: self.pending[k] = t + 2.5
                for k in set(w.engaged) - engaged:
                    L, _ = self._seat(k); w.release(L); self.failed.discard(k)
                for k in self.failed - engaged: self.failed.discard(k)
                for k, until in list(self.pending.items()):
                    L, r = self._seat(k)
                    if abs(r['axial_mm']) < 0.8 and r['radial_mm'] < 1.5 and r['lock_deg'] > 40:
                        w.engage(L); del self.pending[k]
                        self.last = f'{self.who}: LOCKED {k} (gap {r["axial_mm"]:.2f} mm, side {r["radial_mm"]:.2f} mm)'; self.log(self.last)
                    elif t > until:
                        del self.pending[k]; self.failed.add(k)
                        self.last = f'{self.who}: NOT locked {k} - not seated (gap {r["axial_mm"]:.1f} mm, side {r["radial_mm"]:.1f} mm, rotor {r["lock_deg"]:.0f} deg): the real robot would miss this lock'; self.log(self.last)
            except Exception as e:
                self.last = f'{self.who} stopped: {type(e).__name__}: {e}'; self.log(self.last); self.alive = False

    def speed(self):
        """sim seconds per wall second over the last few seconds: the split view plays at this pace (slow motion)"""
        t0, s0, v = self.rate; now, sim = time.time(), float(self.w.d.time)
        if now - t0 > 3.0: v = (sim - s0) / (now - t0); self.rate = (now, sim, v)
        return round(v, 2)

    def state(self):
        fb = getattr(self, 'fbk', None)
        return dict(on=self.alive, t=round(float(self.w.d.time), 2), behind=self.behind(), speed=self.speed(),
                    feedback=dict(mode=FB_MODE, uses=sorted(set(fb.used.values()) - {''}), err_mm=fb.err_mm) if fb else None, seed=self.seed, last=self.last,
                    locks=sorted(self.w.engaged), finite=bool(np.isfinite(self.w.d.qpos).all()))

    def close(self):
        self.alive = False
        with self.cv: self.cv.notify()


class PoseSync:
    """Sync for EVERY other tab (Nischay 5 Nov): the page sends its model's joint angles (0 = straight, the same convention as
    the MSRR sim: kin.ts uses the same single-module model, v2_calib_fit signs are all +1) and the robot follows them through
    the SAME link as MSRR: the same directions, smooth speed, Wi-Fi tolerance, hold and E-STOP. No physics here: no sag
    correction, no random robot, no room (those are MSRR only)."""
    def __init__(self):
        self.cfg = config(); self.on = False; self.links = {}; self.want_deg = {}; self.pose = {}; self.lock = threading.Lock()

    def set_pose(self, boards):
        """boards: {host: {'T1': deg, ..., 'L1': deg}} -> the angles each board should go to"""
        want = {}
        for host, js in (boards or {}).items():
            bc = board_cfg(self.cfg, host); w = {}
            for j, v in js.items():
                if j in JN: w[j] = 180.0 + bc['sign'][j] * float(v)
                elif j in ('L1', 'L2'): w[j] = lock_board_deg(bc, j, v)
            want[host] = w
        with self.lock: self.want_deg, self.pose = want, boards or {}
        for host in want:
            if host not in self.links or not self.links[host].alive: self.links[host] = get_link(host, host, self._want, None)

    def _want(self, host):
        with self.lock: return dict(self.want_deg.get(host, {}))

    def command(self, cmd):
        op = cmd.get('op')
        if op == 'on':
            self.on = True
            for other in {L.owner for L in LINKS.values()} - {self, None}: other.on = False
            for host in list(self.want_deg):
                L = self.links[host] = get_link(host, host, self._want, self); L.held = ''; L.far_t = None; L.sent = {}; L.sending = True
        elif op == 'off':
            self.on = False
            for L in self.links.values():
                if L.owner is self: L.sending = False
        elif op == 'stop':
            self.on = False
            for L in self.links.values(): L.sending = False
            bad = [h for h, L in self.links.items() if not L.board.stop().ok]
            return dict(ok=not bad, error=f'emergency stop NOT confirmed on {", ".join(bad)}: cut the power if it moves' if bad else '')
        elif op != 'view': return dict(ok=False, error=f'unknown sync op {op}')
        return dict(ok=True)

    def state(self):
        """the same box as MSRR's (RealSync.state), one row per board"""
        with self.lock: want, pose = self.want_deg, self.pose
        bc = board_cfg(self.cfg); mods = {}
        for host, w_ in want.items():
            L = self.links.get(host); joints = []
            for j in ['L1'] + JN + ['L2']:
                joints.append(dict(j=j, id=SERVO_ID[j], ideal=round(float(pose[host][j]), 1) if j in pose.get(host, {}) else None, fix=None,
                                   send=round(w_[j], 1) if j in w_ else None, real=round(L.read[j], 1) if L and j in L.read else None))
            mods[host] = dict(host=host, board=L.name if L else None, online=bool(L and L.online), error=L.error if L else '',
                              held=L.held if L and L.owner is self else '', signs_checked=bc['signs_checked'],
                              locks_checked=bc['locks_checked'], signs_known=True, joints=joints)
        return dict(on=self.on, signs_checked=bc['signs_checked'], locks_checked=bc['locks_checked'], modules=mods)


POSE = None


def pose_sync(body):
    """the service's /sync/pose: {pose: {host: {joint: deg}}, op?: 'on'|'off'|'stop'} -> the box's state"""
    global POSE
    if POSE is None: POSE = PoseSync()
    if body.get('pose') is not None: POSE.set_pose(body['pose'])
    r = POSE.command({'op': body['op']}) if body.get('op') else dict(ok=True)
    return dict(r, sync=POSE.state())
