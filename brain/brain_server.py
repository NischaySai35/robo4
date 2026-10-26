"""TETROBOT brain server - the verified walking brain, served to the Studio (ESP-TTL > Walk tab).

The Studio stays the ONLY client of the ESP32 (the board serves one client at a time). Every 60 ms the Walk tab
reads /api/telemetry from the board, POSTs the servo angles here, and forwards our answer to the board's /api/batch.
All the thinking (sag-aware docking IK, judge corrections, peel + pull-out, curl-up swing, role swap) runs here,
in the SAME code that was verified in the MuJoCo sim (walk.py + laptop_controller.py).

Modes
  real : drives the real robot. Feedback = servo encoders + YOU as the judge (questions appear in the Walk tab).
  sim  : the same loop against the MuJoCo robot (random servo/PLA/magnet errors) so you can rehearse the UI.
         Judge = simulated camera (auto) or you (judge='human').

API (JSON, CORS open, http://127.0.0.1:8770)
  GET  /api/health                       -> {ok, version, running}
  GET  /api/config                       -> servo map in use (ids / signs / homes / lock dirs) + defaults
  POST /api/start  {mode, receivers:[[x_mm, y_mm, yaw_deg], ...], steps?, floor_tilt_deg?, floor_tilt_dir_deg?, judge?, seed?, peel_deg?}
                   receivers are measured from connector 0 (where End A starts locked); x/y = arrows drawn on the board
  POST /api/tick   {servos: {id: deg, ...}}  (real mode: the board's currentAngle values; sim mode: ignored)
                   -> {cmd: {id: deg} | null, speed, acc, question, logs, done, ok, frame, joints_deg, stage}
  POST /api/answer {text}                 answer the judge question ('' = yes/centred, 'x+3 y-2 r+2', 'y', 'n')
  POST /api/stop                          stop; servos simply hold their last target
Run:  python brain_server.py   (Python 3.12 with mujoco, numpy, scipy, greenlet)"""
import sys, os, math, json, time, io, contextlib, traceback
from http.server import HTTPServer, BaseHTTPRequestHandler
import numpy as np, greenlet
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
with contextlib.redirect_stdout(io.StringIO()):
    import laptop_controller as L
    import walk as WK
    import walk_real as WR
    import build_walk as BW
    from walk_env import WalkEnv
from tetro_env2 import RX_GAP
VERSION = '1.0.0'
PORT = int(os.environ.get('BRAIN_PORT', '8770'))
LOCK_DIR = L.LOCK_DIR_CAL or {'A': -1.0, 'B': +1.0}
SPEED, ACC = 10, 40                     # the brain does its own gentle limiting (34 deg/s, 1.5 rad/s^2); the servo cap must not slow it further

def servo_cmd(q, lockA, lockB):
    """7 joint angles (rad, sim convention) + lock angles (deg) -> {servo id: servo deg} for /api/batch."""
    out = {int(L.SERVO_ID[k]): round(L.HOME[k] + L.SIGN[k] * math.degrees(v), 2) for k, v in zip(L.JOINTS, q)}
    out[int(L.SERVO_ID['L1'])] = round(L.HOME['L1'] + L.SIGN['L1'] * LOCK_DIR['A'] * lockA, 2)
    out[int(L.SERVO_ID['L2'])] = round(L.HOME['L2'] + L.SIGN['L2'] * LOCK_DIR['B'] * lockB, 2)
    return out

def joints_from_servos(sv):
    """{servo id: deg} -> 7 joint angles (rad). Missing servo -> None."""
    try: return np.array([math.radians(L.SIGN[k] * (float(sv[str(L.SERVO_ID[k])] if str(L.SERVO_ID[k]) in sv else sv[L.SERVO_ID[k]]) - L.HOME[k])) for k in L.JOINTS])
    except (KeyError, TypeError, ValueError): return None

class Paused(Exception): pass

class RealBrainEnv:
    """Looks like walk_env.WalkEnv to the Walker, but each step() hands the command back to the Studio and waits for the next tick."""
    def __init__(self, sess, receivers_m):
        self.s = sess; self.t = 0; self.mag_force = {'A': 0.0, 'B': 0.0}
        self.rx = []
        for (x, y, yaw) in receivers_m:
            R = WR.Rz(yaw); o = np.array([x, y, 0.0]); z = R[:, 2]
            self.rx.append(dict(o=o, R=R, z=z, seat=o + RX_GAP * z))
        self.rx_bias = [np.zeros(3) for _ in self.rx]
        self.cmd = sess.q_meas.copy()
    def measured(self): return self.s.q_meas.copy()
    def step(self, cmd, lockA_deg, lockB_deg, extra_force=None):
        self.cmd = np.asarray(cmd, float).copy(); self.s.out = (self.cmd.copy(), lockA_deg, lockB_deg)
        self.s.main.switch('cmd'); self.t += 1
        return {'ok': True, 'lowest_link_mm': 999.0, 't': self.t}

class Session:
    def __init__(self, cfg, main):
        self.cfg = cfg; self.main = main; self.mode = cfg.get('mode', 'sim'); self.frame = 0
        self.logs = []; self.sent = 0; self.question = None; self.answer = None; self.done = False; self.ok = None; self.stage = 'starting'
        self.out = None; self.q_meas = None; self.g = None; self.env = None; self.started = time.time()
        rx = cfg.get('receivers') or [[0, 0, 0], [250, 0, 0], [500, 0, 0], [750, 0, 0]]
        self.rx_m = [(float(r[0]) / 1000, float(r[1]) / 1000, float(r[2]) if len(r) > 2 else 0.0) for r in rx]
        self.steps = cfg.get('steps') or list(range(1, len(self.rx_m)))
        if cfg.get('peel_deg') is not None: os.environ['PEEL_DEG'] = str(float(cfg['peel_deg']))
        self.tilt = (float(cfg.get('floor_tilt_deg', L.FLOOR_TILT_DEG)), float(cfg.get('floor_tilt_dir_deg', L.FLOOR_TILT_DIR_DEG)))
        self.log('session: %s mode, %d connectors, steps %s, floor tilt %.2f deg toward %.0f deg, peel %s deg' % (
            self.mode, len(self.rx_m), self.steps, self.tilt[0], self.tilt[1], os.environ.get('PEEL_DEG', '6')))
        if self.mode == 'sim': self._make_sim()
    def log(self, s): self.logs.append('%6.1f s  %s' % (time.time() - self.started, s))
    # ---------- sim: build a MuJoCo world with THESE connectors, random robot
    def _make_sim(self):
        xml = os.path.join(HERE, 'logs', 'session_walk.xml'); os.makedirs(os.path.dirname(xml), exist_ok=True)
        with contextlib.redirect_stdout(io.StringIO()):
            BW.build(os.path.join(HERE, 'train_v2.xml'), xml, [(x, y, math.radians(yaw)) for (x, y, yaw) in self.rx_m], False)
        e = WalkEnv(seed=int(self.cfg.get('seed', int(time.time()) % 100000)), randomize=True, xml=xml); e.reset(base='A', base_rx=0, yaw_deg=WR.START_YAW_DEG)
        g = e.m.opt.gravity; self.tilt = (math.degrees(math.acos(-g[2] / 9.81)), math.degrees(math.atan2(g[1], g[0])))
        self.log('sim robot ready (random servo/PLA/magnet errors); floor tilt in this sim %.2f deg' % self.tilt[0])
        orig = e.step
        def step(*a, **k):
            r = orig(*a, **k); self.out = (e.cmd.copy(), a[1], a[2]); self.main.switch('cmd'); return r
        e.step = step; self.env = e; self.q_meas = e.measured()
    # ---------- the walk itself (runs inside a greenlet; pauses at every 60 ms command and every judge question)
    def _ask(self, stage, text):
        self.question = {'stage': stage, 'text': text}; self.answer = None
        while self.answer is None: self.main.switch('question')
        a = self.answer; self.question = None; self.answer = None; self.log('judge (%s): "%s"' % (stage, a)); return a
    def _judge_factory(self, W):
        human = self.mode == 'real' or self.cfg.get('judge') == 'human'
        if not human:
            cam = W.sim_camera
            def auto(stage, C):
                if stage == 'out': return True
                return cam(stage, C)
            return auto
        def hint(stage, C):                      # practice in sim: show what a perfect eye would see
            if self.mode != 'sim': return ''
            r = W.sim_camera(stage, C, sigma=0.0)
            if stage == 'hover':
                dw = C._M[:3, :3].T @ r[0]; return '   [sim truth: x%+.1f y%+.1f mm, twist %+.1f deg]' % (dw[0] * 1000, dw[1] * 1000, math.degrees(r[1]))
            return '   [sim truth: %s]' % ('seated' if r[0] else 'NOT seated')
        def judge(stage, C):
            if stage == 'hover':
                a = self._ask('hover', 'End %s is hovering above connector %d. Centred and straight? Yes = empty, or corrections like "x+3 y-2 r+2" (mm along the board X/Y arrows, r = deg counter-clockwise seen from above).%s' % (W.moving, C._rx, hint('hover', C)))
                d_w, r = WR.parse_corr(a); return C._M[:3, :3] @ d_w, r, np.zeros(3)
            if stage == 'seat':
                a = self._ask('seat', 'End %s went into connector %d. Seated FLAT, no gap? (y / n - n = no lock, it backs off and retries)%s' % (W.moving, C._rx, hint('seat', C)))
                return (not a.strip().lower().startswith('n')), np.zeros(3)
            if stage == 'out':
                a = self._ask('out', 'Is the old base End fully OUT of its connector? (y / n)')
                return not a.strip().lower().startswith('n')
        return judge
    def _run(self):
        try:
            e = self.env
            g = L.gravity_from_tilt(*self.tilt)
            W = WK.Walker(e, 'A', 0, 0, g, log=self.log); W.judge_fn = self._judge_factory(W); W.curl = True; self.W = W
            for j in self.steps:
                self.stage = 'step to connector %d (moving End %s)' % (j, W.moving); self.log('=== ' + self.stage + ' ===')
                with contextlib.redirect_stdout(io.StringIO()):
                    ok = W.step_to(j)
                if not ok:
                    self.ok = False; self.log('STOPPED at connector %d - servos hold their last target. Fix by hand, then start again.' % j); return
            self.ok = True; self.log('WALK COMPLETE')
        except Exception as ex:
            self.ok = False; self.log('ERROR: %r' % ex); self.log(traceback.format_exc()[-800:])
        finally:
            self.done = True; self.stage = 'done' if self.ok else 'stopped'
    # ---------- one 60 ms tick from the Studio
    def tick(self, servos):
        self.frame += 1
        if self.mode == 'real':
            q = joints_from_servos(servos or {})
            if q is None: return self._reply(None, error='telemetry is missing one of the servo ids %s' % sorted(L.SERVO_ID.values()))
            self.q_meas = q
            if self.env is None: self.env = RealBrainEnv(self, self.rx_m)
        if self.done: return self._reply(None)
        if self.question and self.answer is None: return self._reply(self._hold())
        if self.g is None: self.g = greenlet.greenlet(self._run)
        L.NOM.m.opt.gravity[:] = getattr(self, '_grav', L.NOM.m.opt.gravity)
        self.g.switch(); self._grav = L.NOM.m.opt.gravity.copy()
        if self.mode == 'sim': self.q_meas = self.env.measured()
        return self._reply(self._hold())
    def _hold(self):
        if self.out is None: return None
        q, la, lb = self.out; return servo_cmd(q, la, lb)
    def _reply(self, cmd, error=None):
        new = self.logs[self.sent:]; self.sent = len(self.logs)
        jd = [round(math.degrees(v), 1) for v in self.out[0]] if self.out else None
        r = dict(ok=error is None, error=error, frame=self.frame, cmd=cmd, speed=SPEED, acc=ACC, question=self.question, logs=new, done=self.done,
                 result=self.ok, stage=self.stage, joints_deg=jd, locks_deg=[self.out[1], self.out[2]] if self.out else None, mode=self.mode)
        if self.mode == 'sim' and self.env is not None and hasattr(self.env, 'd'):
            e = self.env; r['sim'] = dict(t=round(e.t * 0.06, 2), tipA=[round(float(v), 4) for v in e.d.site_xpos[e.end['A']['tip']]], tipB=[round(float(v), 4) for v in e.d.site_xpos[e.end['B']['tip']]],
                                          servos=servo_cmd(e.d.qpos[e.qa], math.degrees(abs(e.d.qpos[e.end['A']['lockq']])), math.degrees(abs(e.d.qpos[e.end['B']['lockq']]))))
        return r

SESSION = None
MAIN = greenlet.getcurrent()

class H(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json'); self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_OPTIONS(self):
        self.send_response(204); self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type'); self.end_headers()
    def log_message(self, *a): pass
    def _body(self):
        n = int(self.headers.get('Content-Length') or 0)
        try: return json.loads(self.rfile.read(n) or b'{}')
        except Exception: return {}
    def do_GET(self):
        if self.path.startswith('/api/health'): return self._send(200, dict(ok=True, version=VERSION, running=bool(SESSION and not SESSION.done)))
        if self.path.startswith('/api/config'):
            return self._send(200, dict(ok=True, joints=L.JOINTS, servo_id=L.SERVO_ID, sign=L.SIGN, home=L.HOME, lock_dir=LOCK_DIR,
                                        calibrated=os.path.exists(os.path.join(HERE, 'robot_config.json')), floor_tilt=[L.FLOOR_TILT_DEG, L.FLOOR_TILT_DIR_DEG],
                                        peel_deg=float(os.environ.get('PEEL_DEG', '6')), dt_ms=int(L.DT * 1000)))
        return self._send(404, dict(ok=False, error='unknown path'))
    def do_POST(self):
        global SESSION
        b = self._body()
        try:
            if self.path.startswith('/api/start'):
                SESSION = Session(b, MAIN); SESSION.sent = len(SESSION.logs); return self._send(200, dict(ok=True, logs=SESSION.logs, mode=SESSION.mode))
            if SESSION is None: return self._send(409, dict(ok=False, error='no session - POST /api/start first'))
            if self.path.startswith('/api/tick'): return self._send(200, SESSION.tick(b.get('servos')))
            if self.path.startswith('/api/answer'):
                if not SESSION.question: return self._send(409, dict(ok=False, error='no question pending'))
                SESSION.answer = str(b.get('text', '')); return self._send(200, dict(ok=True))
            if self.path.startswith('/api/stop'):
                SESSION.done = True; SESSION.ok = False; SESSION.stage = 'stopped'; SESSION.log('stopped by the user'); return self._send(200, dict(ok=True))
        except Exception as ex:
            return self._send(500, dict(ok=False, error=repr(ex), trace=traceback.format_exc()[-600:]))
        return self._send(404, dict(ok=False, error='unknown path'))

if __name__ == '__main__':
    print('TETROBOT brain server %s on http://127.0.0.1:%d  (servo map: %s, calibrated: %s)' % (VERSION, PORT, L.SERVO_ID, os.path.exists(os.path.join(HERE, 'robot_config.json'))), flush=True)
    HTTPServer(('127.0.0.1', PORT), H).serve_forever()
