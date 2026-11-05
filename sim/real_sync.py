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
import json, math, os, sys, threading, time, urllib.parse, numpy as np, mujoco
from paths import tpath
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'gos', 'python'))
from gos.app import GosError
from gos.hardware import Esp32Robot

PHYS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'physics_params.json')))
JN = ['T1', 'B1', 'B2', 'T2', 'B3', 'B4', 'T3']
SERVO_ID = {'L1': 1, 'T1': 2, 'B1': 3, 'B2': 4, 'T2': 5, 'B3': 6, 'B4': 7, 'T3': 8, 'L2': 9}   # physical order on every module
PARTS = ('Spine1_B1B2', 'T2_Ring_B3Fork', 'Spine2_B3B4', 'EndB_LockModule', 'EndA_LockModule')   # the links whose pose is matched
SEND_DT = 0.06                 # s: the board's own read / write cycle
LAG = float(os.environ.get('SYNC_LAG', '0.12'))   # s: command delay (60-180 ms in the servo model): moving joints are led by this
FOLLOW_RATE, CATCH_RATE = 60.0, 15.0   # deg/s: following the sim / closing a big gap after Sync
CATCH_GAP = 3.0                # deg: further from the wanted angle than this = still catching up
RESUME_GAP_S = 2.0             # s: offline longer than this (or restarted) = hold until Sync is pressed again
BEHIND_DEG, LOAD_STOP, HOLD_S = 25.0, 900, 0.5   # holds when a servo stays this far behind, or this loaded (0.1 %), this long
TRIM_MAX, TRIM_RATE, TRIM_DEAD = 3.0, 0.5, 0.1   # deg, deg/s, deg: the slow encoder trim
SMOOTH_S = 0.3                 # s: the correction is low-passed, contact spikes must not shake the robot
CORR_MAX = math.radians(8.0)   # no correction beyond this: beyond it the prediction is wrong, not the robot
DAMP = 1e-5                    # keeps the module solve calm near straight
CONFIG = 'real_robot.json'     # data/: {"hosts": {"M1": "mod1.local"}, "sign": {"T1": 1, ...}, "lock_sign": {"L1": 1, "L2": 1}, "signs_checked": false}


def config():
    """defaults overlaid with the saved file"""
    c = dict(hosts={}, sign={j: 1 for j in JN}, lock_sign={'L1': 1, 'L2': 1}, signs_checked=False)
    try: c.update(json.load(open(tpath(CONFIG))))
    except (OSError, ValueError): pass
    return c


class Correction:
    """what the real parts do under the ideal robot's loads, and the joint angles that undo it"""
    def __init__(self, w):
        m = w.m; self.w, self.mods = w, {}
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
        self.lp = {mid: np.zeros(7) for mid in w.ids}; self.droop = {mid: np.zeros(7) for mid in w.ids}; self.t = None

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
        dq = -np.linalg.solve(A.T @ A + DAMP * np.eye(7), A.T @ r)
        return np.clip(dq, -CORR_MAX, CORR_MAX), droop

    def tick(self):
        """called from the physics thread (the only one allowed to touch d)"""
        w = self.w; now = float(w.d.time); dt = 0.06 if self.t is None else max(now - self.t, 1e-3); self.t = now
        mujoco.mj_rnePostConstraint(w.m, w.d)
        k = min(1.0, dt / SMOOTH_S)
        for mid in w.ids:
            dq, droop = self.solve(mid)
            self.lp[mid] += k * (dq - self.lp[mid]); self.droop[mid] += k * (droop - self.droop[mid])


class ModuleLink:
    """one board: keeps talking on its own thread, so an offline module never holds up the others"""
    def __init__(self, mid, host, want):
        self.mid, self.want, self.host = mid, want, host; self.board = Esp32Robot('http://' + host, timeout=0.4)
        self.online = False; self.read = {}; self.load = {}; self.error = ''; self.alive = True; self.sending = False
        self.sent = {}; self.trim = np.zeros(7); self.held = ''; self.far_t = None; self.lost_at = None; self.board_ms = None
        self.th = threading.Thread(target=self._run, daemon=True); self.th.start()

    def _poll(self):
        t = self.board.telemetry(); ids = {s['id']: s for s in t.get('servos', [])}
        # back after a long gap or a restart (power cut: the board now boots limp): never resume by itself (Nischay, 4 Nov)
        restarted = self.board_ms is not None and t.get('ms') is not None and t['ms'] + 1000 < self.board_ms
        self.board_ms = t.get('ms', self.board_ms)
        gap = time.time() - self.lost_at if self.lost_at else 0.0
        self.lost_at = None
        if self.sending and not self.held and (restarted or gap > RESUME_GAP_S):
            self.held = 'module restarted (power cut?): check it, then press Sync' if restarted else f'no contact for {gap:.0f} s: check it, then press Sync'
        self.read = {j: ids[i]['currentAngle'] for j, i in SERVO_ID.items() if i in ids and ids[i].get('currentAngle') is not None}
        self.load = {j: ids[i].get('loadAbs', 0) for j, i in SERVO_ID.items() if i in ids}
        self.online = True; self.error = ''

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
                    dt = min(t0 - last, 0.3)
                    for j, v in want.items():
                        cur = self.sent.get(j, self.read.get(j, v))
                        rate = CATCH_RATE if abs(v - cur) > CATCH_GAP else FOLLOW_RATE
                        self.sent[j] = cur + float(np.clip(v - cur, -rate * dt, rate * dt))
                    q = {'speed': 10, 'acc': 40}; q.update({str(SERVO_ID[j]): round(v, 2) for j, v in self.sent.items()})
                    self.board._get('/api/batch?' + urllib.parse.urlencode(q))
                last = t0
            except GosError as e:
                self.lost_at = self.lost_at or time.time()
                self.online = False; self.error = str(e).split('.')[0]; self.sent = {}; time.sleep(0.5)   # back online: starts again from the robot's real pose
            except Exception as e:
                self.lost_at = self.lost_at or time.time()
                self.online = False; self.error = f'{type(e).__name__}: {e}'; self.sent = {}; time.sleep(0.5)
            time.sleep(max(0.0, SEND_DT - (time.time() - t0)))


class RealSync:
    def __init__(self, w):
        self.w = w; self.cor = Correction(w); self.cfg = config(); self.links = {}; self.on = False; self.want_deg = {}
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
            trim = L.trim if L else np.zeros(7)
            # where the encoder should read = ideal + the module's correction; the servo must be told more: its droop shows on the encoder
            enc = q + fix; cmd = enc - droop + trim + vel * LAG
            sign = np.array([self.cfg['sign'].get(j, 1) for j in JN], float)
            cmd = np.array([float(np.clip(c, *self.limits[mid][k])) for k, c in enumerate(cmd)])
            real = {j: 180.0 + sign[k] * c for k, (j, c) in enumerate(zip(JN, cmd))}
            lock = w.tgt[i * 9 + 7:i * 9 + 9]
            real['L1'] = 180.0 + self.cfg['lock_sign'].get('L1', 1) * math.degrees(float(lock[0])); real['L2'] = 180.0 + self.cfg['lock_sign'].get('L2', 1) * math.degrees(float(lock[1]))
            want[mid] = real
            rows[mid] = dict(ideal=q, fix=fix, droop=droop, cmd=cmd, enc=180.0 + sign * enc)
            if L and L.online and L.read and np.abs(vel).max() < 2.0:            # standing still: the encoder says what the servo really did
                for k, j in enumerate(JN):
                    if j in L.read:
                        e = sign[k] * (rows[mid]['enc'][k] - L.read[j])
                        if abs(e) > TRIM_DEAD: L.trim[k] = float(np.clip(L.trim[k] + np.clip(e, -1, 1) * TRIM_RATE * SEND_DT, -TRIM_MAX, TRIM_MAX))
        with self.lock: self.want_deg, self.rows = want, rows

    def _want(self, mid):
        with self.lock: return dict(self.want_deg.get(mid, {}))

    def _link(self, mid):
        if mid not in self.links: self.links[mid] = ModuleLink(mid, self.cfg['hosts'][mid], self._want)
        return self.links[mid]

    def command(self, cmd):
        op = cmd.get('op')
        if op == 'hosts':
            for mid, h in (cmd.get('hosts') or {}).items():
                if mid in self.cfg['hosts'] and h != self.cfg['hosts'][mid]:
                    self.cfg['hosts'][mid] = h
                    if mid in self.links: self.links.pop(mid).alive = False
            with open(tpath(CONFIG), 'w') as f: json.dump(self.cfg, f, indent=1)
        elif op == 'on':
            self.on = True
            for mid in self.w.ids: L = self._link(mid); L.held = ''; L.far_t = None; L.sent = {}; L.sending = True
        elif op == 'off':
            self.on = False
            for L in self.links.values(): L.sending = False
        elif op == 'stop':                                                        # the board's emergency stop on every module
            self.on = False
            for L in self.links.values(): L.sending = False
            bad = [mid for mid in self.w.ids if not self._link(mid).board.stop().ok]
            return dict(ok=not bad, error=f'emergency stop NOT confirmed on {", ".join(bad)}: cut the power if it moves' if bad else '')
        elif op != 'view': return dict(ok=False, error=f'unknown sync op {op}')
        return dict(ok=True)

    def close(self):
        for L in self.links.values(): L.sending = False; L.alive = False

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
            mods[mid] = dict(host=self.cfg['hosts'][mid], online=bool(L and L.online), error=L.error if L else '', held=L.held if L else '', joints=joints)
        return dict(on=self.on, signs_checked=bool(self.cfg.get('signs_checked')), modules=mods)
