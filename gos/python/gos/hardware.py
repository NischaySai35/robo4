"""The real robot: one ESP32 module board (firmware/esp32_multi), driven over its web API.

Safety first, because this moves motors:
- Nothing moves until arm(). stop() is the board's emergency stop and works armed or not.
- Every command is clamped to the joint limits, and a large jump is split into small steps.
- Servo IDs 1-9 are the module's joints in physical order (LOCK1 ... LOCK2); the board reports each servo's
  home. Directions (SIGN) are still unconfirmed defaults of +1, so check them on the robot before trusting a pose.
"""
import json, math, os, time, urllib.error, urllib.parse, urllib.request

from .app import GosError, Result


class Esp32Robot:
    @classmethod
    def from_board(cls, url='http://mod1.local', **options):
        """Joint names, IDs and limits as the board itself reports them (its servo labels and min/max), so no robot file
        is needed. Limits become radians around each servo's home."""
        servos = cls(url, **{k: v for k, v in options.items() if k == 'timeout'}).telemetry().get('servos', [])
        if not servos: raise GosError(f'The board at {url} reports no servos. Run a scan in the ESP-TTL tab.')
        names = [s.get('label') or f'servo{s["id"]}' for s in servos]
        limits = {n: (math.radians(s['min'] - s['home']), math.radians(s['max'] - s['home']))
                  for n, s in zip(names, servos) if s.get('min') is not None and s.get('max') is not None and s.get('home') is not None}
        return cls(url, joints=names, servo_ids={n: s['id'] for n, s in zip(names, servos)}, limits=limits, **options)

    def __init__(self, url='http://mod1.local', joints=None, servo_ids=None, signs=None, limits=None,
                 speed=10, acc=40, max_step_deg=15.0, timeout=1.5):  # Wi-Fi replies take 0.25-0.6 s; 0.5 s gave false "does not answer"
        self.url = url.rstrip('/')
        self.joints = list(joints or [])
        self.ids = dict(servo_ids or {j: i + 1 for i, j in enumerate(self.joints)})
        self.signs = dict(signs or {j: 1 for j in self.joints})
        self.limits = dict(limits or {})
        self.speed, self.acc, self.max_step, self.timeout = speed, acc, max_step_deg, timeout
        self.armed = False
        self._homes = None
        self._last = None
        self._board_ms, self._contact_at, self.why_disarmed = None, 0.0, ''

    # ── talking to the board ──────────────────────────────────────────────────
    def _get(self, path):
        try:
            with urllib.request.urlopen(self.url + path, timeout=self.timeout) as r:
                out = json.loads(r.read() or b'{}')
            self._heard(out.get('ms'))
            return out
        except urllib.error.HTTPError as e:  # the board answered, and said no (e.g. 423: locked after power-on)
            try: why = json.loads(e.read() or b'{}').get('error')
            except ValueError: why = None
            self._contact_at = time.time()
            raise GosError(f'The robot at {self.url} refused: {why or e.reason}.') from None
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            raise GosError(f'The robot at {self.url} does not answer ({e}). Check it is powered, on the same Wi-Fi, and the address is right.') from None

    def telemetry(self):
        return self._get('/api/telemetry')

    def _read_homes(self):
        servos = {s['id']: s for s in self.telemetry().get('servos', [])}
        missing = [j for j in self.joints if self.ids[j] not in servos or servos[self.ids[j]].get('home') is None]
        if missing:
            raise GosError(f'The board does not report servos for {", ".join(missing)}. Run a scan in the ESP-TTL tab.')
        self._homes = {j: float(servos[self.ids[j]]['home']) for j in self.joints}
        return servos

    def live(self):
        """Ask the board for live mode, if its firmware has it: while this program keeps asking (twice a second), the
        board keeps its radio awake and pushes its angles here about 16 times a second over UDP, instead of each read
        waiting 0.3-2 s for a web reply. When the asking stops, it goes back to its cool power saving. Returns True if on."""
        import socket, threading
        if getattr(self, '_udp', None): return True
        h = self._get('/api/health')
        if not h.get('live'): return False
        board = (h.get('ip') or urllib.parse.urlparse(self.url).hostname, int(h['live']))
        self._udp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); self._udp.bind(('', 0)); self._udp.settimeout(0.25)
        self._live_at, self._live_deg = 0.0, {}

        def ask():
            while self._udp:
                try: self._udp.sendto(b'R4LV', board)
                except OSError: pass
                time.sleep(0.5)

        def hear():
            while self._udp:
                try: m = json.loads(self._udp.recv(2048))
                except (OSError, ValueError): continue
                self._live_deg = {i: a for i, a in m.get('a', [])}; self._live_at = time.time(); self._heard(m.get('t'))
        threading.Thread(target=ask, daemon=True).start(); threading.Thread(target=hear, daemon=True).start()
        return True

    def close(self):
        """Stop live mode (the board returns to power saving within 1.5 s)."""
        u, self._udp = getattr(self, '_udp', None), None
        if u: u.close()

    def read(self):
        """Joint angles in radians, from the servo encoders: the live stream when it is fresh, else one web request."""
        if getattr(self, '_udp', None) and time.time() - self._live_at < 1.0:  # ~4 a second while the robot stands still
            if self._homes is None: self._read_homes()
            deg = self._live_deg
        else:
            deg = {s['id']: s.get('currentAngle') for s in self._read_homes().values()}
        out = {}
        for j in self.joints:
            a = deg.get(self.ids[j])
            if a is None: raise GosError(f'Servo {self.ids[j]} ({j}) gives no angle. It may be unpowered or disconnected.')
            out[j] = math.radians(self.signs[j] * (a - self._homes[j]))
        return out

    # ── safety ───────────────────────────────────────────────────────────────
    def _heard(self, board_ms):
        """Every reply carries the board's clock (ms since it powered on). If it jumps back, the board restarted (a power
        cut): what we think the joints are doing is no longer true, so disarm until someone arms again."""
        self._contact_at = time.time()
        if board_ms is None: return
        prev, self._board_ms = self._board_ms, int(board_ms)
        if prev is not None and self._board_ms + 1000 < prev and self.armed:
            self.armed = False
            self.why_disarmed = 'the module restarted (power cut?) and is now in its own start-up pose. Check it, then arm again.'

    def arm(self):
        """Allow motion. Reads the current pose first, so the first move starts from where the robot really is."""
        self._last = self.read()
        self.armed, self.why_disarmed = True, ''
        return Result(True, 'Armed: commands will move the motors. Call stop() to halt everything.')

    def disarm(self):
        self.armed = False
        return Result(True, 'Disarmed: commands are refused until arm().')

    def stop(self):
        """Emergency stop on every servo. Always allowed, and disarms."""
        self.armed = False
        try:
            self._get('/api/command?servo=all&cmd=estop')
            return Result(True, 'Emergency stop sent to every servo.')
        except GosError as e:
            return Result(False, f'Emergency stop could NOT be sent: {e} Cut the power if the robot is moving.')

    def _clamp(self, j, v):
        lo, hi = self.limits.get(j, (-math.pi, math.pi))
        return min(max(v, lo), hi)

    def move(self, values):
        """Command joint angles (radians, by joint name). Clamped to limits; a large jump goes in steps."""
        if self.armed and time.time() - self._contact_at > 2.0:
            self.armed = False
            self.why_disarmed = f'no reply from the module for {time.time() - self._contact_at:.0f} s (Wi-Fi drop or power cut). When it answers again, check it and arm again.'
        if not self.armed:
            return Result(False, f'Not armed: {self.why_disarmed or "call arm() first."} Nothing moved.')
        unknown = [j for j in values if j not in self.ids]
        if unknown:
            return Result(False, f'Unknown joints {", ".join(unknown)}. Joints: {", ".join(self.joints)}.')
        target = {j: self._clamp(j, v) for j, v in values.items()}
        clamped = [j for j in values if abs(target[j] - values[j]) > 1e-9]
        start = {j: self._last.get(j, 0.0) for j in target}
        biggest = max([abs(math.degrees(target[j] - start[j])) for j in target] + [0])
        steps = max(1, math.ceil(biggest / self.max_step))
        for k in range(1, steps + 1):
            q = {j: start[j] + (target[j] - start[j]) * k / steps for j in target}
            parts = {'speed': self.speed, 'acc': self.acc}
            parts.update({str(self.ids[j]): round(self._homes[j] + self.signs[j] * math.degrees(v), 2) for j, v in q.items()})
            sent = self._get('/api/batch?' + urllib.parse.urlencode(parts))
            if sent.get('refused'):  # the board's overload guard: a joint hit something, or is too hot
                return Result(False, f'The module refused {sent["refused"]} joint(s): {sent.get("why") or "overload guard"}. Move it the other way, or clear the block.')
            if not self.armed: return Result(False, 'Stopped during the move.')
            if k < steps: time.sleep(0.05)
        self._last.update(target)
        msg = f'Moved {len(target)} joints in {steps} step(s).' + (f' Clamped to limits: {", ".join(clamped)}.' if clamped else '')
        return Result(True, msg, {'steps': steps, 'clamped': clamped})


def serve_robot(app, robot, name='mod1', rate=20):
    """Put one module on the GOS network, like a ROS hardware driver, so any program on any computer can use it:
    /NAME/joint_states   JointState, rate times a second, read from the servo encoders (radians)
    /NAME/joint_commands {"name": [...], "position": [...]} in radians; refused until armed, clamped and stepped as move()
    /NAME/arm, /NAME/disarm, /NAME/stop   services; stop is the emergency stop and always works
    /NAME/status          {"online", "armed", "error"} whenever it changes
    The board keeps its own web API; nothing on the module changes. Returns a function that stops serving."""
    import threading
    states, status = app.topic(f'/{name}/joint_states', type='JointState'), app.topic(f'/{name}/status')
    done, last = threading.Event(), {}

    def say(online, error=''):
        s = {'online': online, 'armed': robot.armed, 'error': error}
        if s != last: last.clear(); last.update(s); status.publish(s)

    def loop():
        while not done.is_set():
            t0 = time.time()
            try:
                q = robot.read()
                states.publish({'header': {'stamp': time.time(), 'frame_id': name}, 'name': list(q), 'position': list(q.values()), 'velocity': [], 'effort': []})
                say(True)
            except GosError as e:
                say(False, str(e))
            done.wait(max(0.0, 1 / rate - (time.time() - t0)))  # a slow board (0.4 s a reading over Wi-Fi) is not slowed further

    def on_command(m):
        if len(m.get('name', [])) != len(m.get('position', [])):
            return say(last.get('online', False), 'A command needs one position per name. Nothing moved.')
        try: r = robot.move(dict(zip(m['name'], m['position'])))
        except GosError as e: return say(True, str(e))   # e.g. the board is locked after power-on
        say(True, '' if r.ok else r.message)

    def result(r):
        say(last.get('online', False)); return {'ok': r.ok, 'message': r.message}

    app.topic(f'/{name}/joint_commands').subscribe(on_command)
    app.services.advertise(f'/{name}/arm', lambda _: result(robot.arm()))
    app.services.advertise(f'/{name}/disarm', lambda _: result(robot.disarm()))
    app.services.advertise(f'/{name}/stop', lambda _: result(robot.stop()))
    try: on = robot.live()
    except GosError: on = False
    status.publish({'online': True, 'armed': robot.armed, 'error': '', 'live': on})
    threading.Thread(target=loop, daemon=True).start()

    def stop():
        done.set(); robot.close()
    return stop


def _arp_table_windows():
    """IPv4 addresses in Windows' ARP table, read with GetIpNetTable (iphlpapi) - no `arp` process, so no console window"""
    import ctypes, socket, struct
    api = ctypes.windll.iphlpapi; size = ctypes.c_ulong(0)
    api.GetIpNetTable(None, ctypes.byref(size), False)                     # asks how big the table is
    buf = ctypes.create_string_buffer(size.value + 1024); size = ctypes.c_ulong(len(buf))
    if api.GetIpNetTable(buf, ctypes.byref(size), False) != 0: raise OSError('GetIpNetTable failed')
    raw = buf.raw; n = struct.unpack_from('<I', raw, 0)[0]
    # MIB_IPNETROW: index, mac length (DWORD each), mac (8 bytes), address (DWORD, network order), type (DWORD) = 24 bytes
    out = set()
    for k in range(n):
        o = 4 + k * 24; maclen, typ = struct.unpack_from('<I', raw, o + 4)[0], struct.unpack_from('<I', raw, o + 20)[0]
        if maclen and typ in (3, 4): out.add(socket.inet_ntoa(raw[o + 16:o + 20]))   # dynamic / static, as `arp -a` lists (2 = invalid)
    return out


def find_modules(timeout=4.0):
    """Every TETROBOT module on this computer's local networks: [{"name", "ip", "fw"}], sorted by name.
    Works where mod1.local does not: first a quick knock on port 80 of every address of each local /24 network,
    then /api/health only where something answered (a busy board can take seconds to reply)."""
    import ipaddress, socket
    from concurrent.futures import ThreadPoolExecutor
    mine = {a[4][0] for a in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET)}
    nets = {ipaddress.ip_network(f'{ip}/24', strict=False) for ip in mine if ipaddress.ip_address(ip).is_private and not ip.startswith('127.')}
    hosts = [str(h) for n in nets for h in n.hosts() if str(h) not in mine]

    def knock(ip):
        try:
            with socket.create_connection((ip, 80), timeout=0.8): return ip
        except OSError:
            return None

    def ask(ip, tries=2):
        for _ in range(tries - 1):
            m = ask(ip, 1)
            if m: return m
        try:
            with urllib.request.urlopen(f'http://{ip}/api/health', timeout=timeout) as r:
                h = json.loads(r.read() or b'{}')
            return {'name': h.get('hostname') or ip, 'ip': ip, 'fw': h.get('fw')} if h.get('device') == 'ROBO4-ESP32' else None
        except Exception:
            return None
    def neighbours():
        # devices this computer talked to lately (the ARP table): a slow board is in it
        import re, subprocess
        # Windows: read the table IN this process (iphlpapi), no program started. The bridge ran `arp -a` every 20 s and, being
        # windowless (pyw), Windows opened a console for each one - it flashed on screen (Nischay, 7 Nov)
        if os.name == 'nt':
            try: return {ip for ip in _arp_table_windows() if ip in set(hosts)}
            except OSError: pass
        hide = {'creationflags': subprocess.CREATE_NO_WINDOW} if hasattr(subprocess, 'CREATE_NO_WINDOW') else {}
        for cmd in (['arp', '-a'], ['ip', 'neigh']):
            try: out = subprocess.run(cmd, capture_output=True, text=True, timeout=5, **hide).stdout
            except (OSError, subprocess.SubprocessError): continue
            return {ip for ip in re.findall(r'\d+\.\d+\.\d+\.\d+', out) if ip in set(hosts)}
        return set()
    with ThreadPoolExecutor(256) as pool:
        near = neighbours()
        open_ = {ip for ip in pool.map(knock, [h for h in hosts if h not in near]) if ip}
        return sorted((m for m in pool.map(ask, sorted(near | open_)) if m), key=lambda m: m['name'])
