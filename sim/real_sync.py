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
import json, math, os, socket, sys, threading, time, urllib.parse, numpy as np, mujoco
from paths import tpath
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'gos', 'python'))
from gos.app import GosError
from gos.hardware import Esp32Robot

PHYS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'physics_params.json')))
JN = ['T1', 'B1', 'B2', 'T2', 'B3', 'B4', 'T3']
SERVO_ID = {'L1': 1, 'T1': 2, 'B1': 3, 'B2': 4, 'T2': 5, 'B3': 6, 'B4': 7, 'T3': 8, 'L2': 9}   # physical order on every module
PARTS = ('Spine1_B1B2', 'T2_Ring_B3Fork', 'Spine2_B3B4', 'EndB_LockModule', 'EndA_LockModule')   # the links whose pose is matched
SEND_DT = 0.06                 # s: the board's own read / write cycle
ENC_HOLD = 0.3                 # deg: encoder changes smaller than this are flicker (ST3215 reads in 0.09 deg steps), the picture holds
LAG = float(os.environ.get('SYNC_LAG', '0.12'))   # s: command delay (60-180 ms in the servo model): moving joints are led by this
FOLLOW_RATE, CATCH_RATE = 60.0, 15.0   # deg/s: following the sim / closing a big gap after Sync
CATCH_GAP = 3.0                # deg: further from the wanted angle than this = still catching up
BOARD_TIMEOUT = 1.5            # s: one read / write; modem sleep (radio asleep while still) adds a beacon or two
RESEND_S = 0.5                 # s: unchanged angles are still re-sent this often
OFFLINE_AFTER_S = 3.0          # s: no good reply this long = offline. SAME rule as Studio's top bar (studio/src/features/servo/espPoll.ts OFFLINE_AFTER_MS)
RESUME_GAP_S = 3.0             # s: offline longer than this (or restarted) = hold until Sync is pressed again
BEHIND_DEG, LOAD_STOP, HOLD_S = 25.0, 900, 0.5   # holds when a servo stays this far behind, or this loaded (0.1 %), this long
TRIM_MAX, TRIM_RATE, TRIM_DEAD = 3.0, 0.5, 0.1   # deg, deg/s, deg: the slow encoder trim
SMOOTH_S = 0.3                 # s: the correction is low-passed, contact spikes must not shake the robot
CORR_MAX = math.radians(8.0)   # no correction beyond this: beyond it the prediction is wrong, not the robot
DAMP = 1e-5                    # keeps the module solve calm near straight
CONFIG = 'real_robot.json'     # data/: {"hosts": {"M1": "mod1.local"}, "sign": {"T1": -1, ...}, "lock_sign": {"L1": 1, "L2": 1}, "lock_home": {"L1": 45, "L2": 0}, "signs_checked": true, "locks_checked": false}
# Joint directions are the SAME on every module, also new ones (Nischay 5 Nov: every module is built the same way).


def config():
    """defaults overlaid with the saved file"""
    c = dict(hosts={}, sign={j: 1 for j in JN}, lock_sign={'L1': 1, 'L2': 1}, signs_checked=False, locks_checked=False)
    try: c.update(json.load(open(tpath(CONFIG))))
    except (OSError, ValueError): pass
    return c


def board_cfg(cfg, name=None):
    """the joint directions: one set for every module, whatever its name"""
    return dict(sign={j: 1 for j in JN} | cfg.get('sign', {}), lock_sign={'L1': 1, 'L2': 1} | cfg.get('lock_sign', {}),
                lock_home={'L1': 0.0, 'L2': 0.0} | cfg.get('lock_home', {}), signs_checked=bool(cfg.get('signs_checked')), locks_checked=bool(cfg.get('locks_checked')), known=True)


def lock_board_deg(bc, j, deg):
    """the board angle for lock rotor j (L1/L2) at sim angle deg (0 = open): 180 + its open-position offset + its direction x deg.
    Nischay 5 Nov: L1 turned the right way but 0 was not open (fins repeat every 90 deg, so open is 45 off) -> lock_home L1 45;
    L2 opened right but turned the wrong way -> lock_sign L2 -1. One place, both senders (RealSync, PoseSync)."""
    return 180.0 + float(bc['lock_home'][j]) + bc['lock_sign'][j] * float(deg)


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
        self.grav = m.opt.gravity.copy(); self.kp = PHYS['kp']
        self.lp = {mid: np.zeros(7) for mid in w.ids}; self.droop = {mid: np.zeros(7) for mid in w.ids}; self.t = None; self.smooth_s = SMOOTH_S

    @staticmethod
    def _under(m, x, b):
        while x:
            if x == b: return True
            x = m.body_parentid[x]
        return False

    def load(self, J):
        """torque the rest of the world puts on everything past this joint, about its anchor (world axes)"""
        m, d = self.w.m, self.w.d; a = d.xanchor[J['j']]; S = J['sub']
        M = np.cross(d.xipos[S] - a, m.body_mass[S, None] * self.grav).sum(0)
        ext = d.cfrc_ext[S]; com = d.subtree_com[m.body_rootid[S]]
        return M + (ext[:, :3] + np.cross(com - a, ext[:, 3:])).sum(0)

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
        dq = -np.linalg.solve(A.T @ A + DAMP * np.eye(7), A.T @ r)
        return np.clip(dq, -CORR_MAX, CORR_MAX), droop

    def tick(self):
        """called from the physics thread (the only one allowed to touch d)"""
        w = self.w; now = float(w.d.time); dt = 0.06 if self.t is None else max(now - self.t, 1e-3); self.t = now
        mujoco.mj_rnePostConstraint(w.m, w.d)
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
        imu = getattr(src, 'imu', None)
        if not truth and imu is not None:
            Rm = imu(mid)
            if Rm is not None:                                        # the IMU's tilt replaces Spine2's estimated tilt (yaw unseen)
                # an accelerometer cannot see a turn ABOUT gravity: drop that part (gravity's real direction, not world z - walls, 7 Nov)
                tv = self._rotvec(Rm @ Rid[IMU_PART].T); gh = w.m.opt.gravity / np.linalg.norm(w.m.opt.gravity); tv = tv - (tv @ gh) * gh
                e[6 * IMU_PART + 3:6 * IMU_PART + 6] = tv * L_ROT; used += ' + IMU tilt'
        self.err_mm[mid] = round(float(np.max(np.linalg.norm(e.reshape(n, 6)[:, :3], axis=1))) * 1000, 1); self.used[mid] = used
        # 5 Nov, real board: under ~0.8 mm the error is the encoder's own 0.09 deg steps - correcting it made the loop hunt
        dead = FB_DEAD_MM if hasattr(src, 'parts') else FB_DEAD_REAL_MM
        if moving > FB_STILL or self.err_mm[mid] < dead: return np.degrees(self.fb[mid])   # hold: lag, or nothing to fix
        dq = -np.linalg.solve(A.T @ A + DAMP * np.eye(7), A.T @ e)
        self.fb[mid] = np.clip(self.fb[mid] + FB_GAIN * dq, -FB_MAX, FB_MAX)
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
                self._poll()
                want = self.want(self.mid)
                if self.sending and not self.held:
                    self.held = self._guard(want)
                    if self.held: self.board.stop()
                if self.sending and not self.held and want:
                    dt = min(t0 - last, 0.3); fastest = 0.0; before = dict(self.sent)
                    for j, v in want.items():
                        cur = self.sent.get(j, self.read.get(j, v))
                        rate = CATCH_RATE if abs(v - cur) > CATCH_GAP else FOLLOW_RATE
                        self.sent[j] = cur + float(np.clip(v - cur, -rate * dt, rate * dt)); fastest = max(fastest, abs(self.sent[j] - cur) / max(dt, 0.03))
                    # 5 Nov: the same angles again every 60 ms only kept the small board busy (its replies grew past the timeout and
                    # the Sync box said offline while the top bar said online): resend only what changed, or every RESEND_S
                    same = before.keys() == self.sent.keys() and all(abs(self.sent[j] - before[j]) < 0.05 for j in before)
                    if not same or t0 - getattr(self, 'sent_at', 0.0) > RESEND_S:
                        q = {'speed': speed_scale(fastest), 'acc': 40}; q.update({str(SERVO_ID[j]): round(v, 2) for j, v in self.sent.items()})
                        self.board._get('/api/batch?' + urllib.parse.urlencode(q)); self.sent_at = t0
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
            fbd = self.fbk.step(mid, src, sign, float(np.abs(vel).max())) if fbon else np.zeros(7)
            trim = np.zeros(7) if fbon else (src.trim if src else np.zeros(7))
            # where the encoder should read = ideal + the module's correction; the servo must be told more: its droop shows on the encoder
            enc = q + fix; cmd = enc - droop + trim + fbd + vel * LAG
            cmd = np.array([float(np.clip(c, *self.limits[mid][k])) for k, c in enumerate(cmd)])
            real = {j: 180.0 + sign[k] * c for k, (j, c) in enumerate(zip(JN, cmd))}
            lock = w.tgt[i * 9 + 7:i * 9 + 9]
            real['L1'] = lock_board_deg(bc, 'L1', math.degrees(float(lock[0]))); real['L2'] = lock_board_deg(bc, 'L2', math.degrees(float(lock[1])))
            want[mid] = real
            rows[mid] = dict(ideal=q, fix=fix, droop=droop, cmd=cmd, enc=180.0 + sign * enc)
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
            w = self.tw.w; R = w.d.xmat[w.m.body(f'{mid}_Spine2_B3B4').id].reshape(3, 3)
            a = np.random.normal(0, math.radians(0.3), 3); K = np.array([[0, -a[2], a[1]], [a[2], 0, -a[0]], [-a[1], a[0], 0]])
            return (np.eye(3) + K) @ R

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
        bc = board_cfg(self.cfg); want = {}
        for host, js in (boards or {}).items():
            w = {}
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
