"""ESP-NOW link to the modules through a USB dongle (firmware/espnow_dongle), with a local web gateway.

REUSE-CHECKED: no ESP-NOW code existed (6 Nov 2026). The frame layout mirrors firmware/libraries/R4Now/src/r4now.h;
change both together. The modules run every request through the same handlers as their web API, so the gateway
answers exactly like the board's own http://<board>/api/... does.

    gos robot bridge                      # then: http://mod1.local (tools/espnow/install.ps1) or http://127.0.4.1
    link = EspNowLink.open('COM7'); link.request('mod1', '/api/health')

Who does what (6 Nov 2026, Nischay: "the comm control of the C3s is with the master, the laptop talks only to it"):
- the laptop decides what to do; it talks only to the master (the ESP32-CAM on USB, which does not drop);
- the master owns the radio: heartbeat to each module, resends until each answer is back (r4now::Courier), the
  channel, the module list, and the hold when the laptop program vanishes while driving;
- the module never runs one request number twice; Wi-Fi is the fallback, and carries the web page and uploads.
"""
import json, os, pathlib, re, socketserver, struct, threading, time, urllib.error, urllib.parse, urllib.request, zlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .app import GosError

# ── frame layout (r4now.h) ─────────────────────────────────────────────────────
HB, REQ, RESP, HELLO = 1, 2, 3, 4
VERSION, FRAME_MAX, HEAD = 1, 250, 8
PAYLOAD_MAX = FRAME_MAX - HEAD
MSG_MAX = 7744
FRAG_MAX = MSG_MAX // PAYLOAD_MAX
EVERYONE = b'\xff' * 6


def frames(kind, seq, msg=b''):
    """The air frames for one message."""
    cnt = max(1, -(-len(msg) // PAYLOAD_MAX))
    if cnt > FRAG_MAX: raise GosError(f'Message too long for the radio link: {len(msg)} bytes (at most {MSG_MAX}).')
    return [b'R4' + struct.pack('<BBHBB', kind, VERSION, seq & 0xffff, i, cnt) + msg[i * PAYLOAD_MAX:(i + 1) * PAYLOAD_MAX]
            for i in range(cnt)]


def parse(f):
    """(kind, seq, index, count, payload), or None for anything that is not ours."""
    if len(f) < HEAD or len(f) > FRAME_MAX or f[:2] != b'R4' or f[3] != VERSION: return None
    kind, _, seq, idx, cnt = struct.unpack_from('<BBHBB', f, 2)
    if not cnt or cnt > FRAG_MAX or idx >= cnt or (idx + 1 < cnt and len(f) != FRAME_MAX): return None
    return kind, seq, idx, cnt, f[HEAD:]


class Assembly:
    """One message from its fragments: any order, repeats ignored, a new seq starts over."""
    def __init__(self): self.seq, self.cnt, self.parts = None, 0, {}

    def add(self, seq, idx, cnt, payload):
        if seq != self.seq or cnt != self.cnt: self.seq, self.cnt, self.parts = seq, cnt, {}
        if idx in self.parts: return None
        self.parts[idx] = payload
        return b''.join(self.parts[i] for i in range(cnt)) if len(self.parts) == cnt else None

    def progress(self): return len(self.parts)


# ── USB side: the dongle ───────────────────────────────────────────────────────
def _usb(kind, payload=b''):
    body = bytes([ord(kind)]) + struct.pack('<H', len(payload)) + payload
    return b'\xa5\x5a' + body + bytes([sum(body) & 0xff])


class Dongle:
    """The master's USB side (firmware/espnow_dongle). `port` is a pyserial port (or anything with read/write).
    The laptop only talks to the master: it hands over requests ('Q'), says it is here ('P'), and hears answers ('R'),
    give-ups ('F') and what the master did by itself ('L')."""
    def __init__(self, port, on_frame, on_fail=None):
        self.port, self.on_frame, self.on_fail = port, on_frame, on_fail
        self.info, self.bad, self._wlock = '', 0, threading.Lock()
        self.said = []                         # the master's own notes ('L'), newest last
        self._info_event = threading.Event()
        self._run, self.dead = True, False     # dead: unplugged (the reader hit a USB error)
        self._thread = threading.Thread(target=self._reader, name='espnow-usb', daemon=True)
        self._thread.start()

    def _write(self, kind, payload=b''):
        with self._wlock: self.port.write(_usb(kind, payload))

    def deliver(self, mac, frames):
        """All fragments of one request in ONE USB write: each separate write waited ~20 ms for its USB round trip,
        so a 12-fragment firmware piece took 245 ms (measured 7 Nov; the radio itself resent only 8 of 90)."""
        data = b''.join(_usb('Q', mac + f) for f in frames)
        with self._wlock: self.port.write(data)
    def here(self): self._write('P')
    def send(self, mac, frame): self._write('S', mac + frame)
    def channel(self, ch): self._write('C', bytes([ch]))

    def ask_info(self, wait=1.0):
        self._info_event.clear()
        self._write('I')
        self._info_event.wait(wait)
        return self.info

    def close(self):
        self._run = False
        try: self.port.close()
        except Exception: pass

    def _reader(self):
        buf = bytearray()
        while self._run:
            # read what is there (at least 1 byte): read(4096) waits for 4096 bytes or the 50 ms timeout, which added
            # ~50 ms to every answer (health took 77 ms, measured on mod1 6 Nov)
            try: chunk = self.port.read(max(1, getattr(self.port, 'in_waiting', 0) or 0))
            except Exception: self.dead = True; break
            if not chunk: continue
            buf += chunk
            while True:
                at = buf.find(b'\xa5\x5a')
                if at < 0: del buf[:-1]; break
                del buf[:at]
                if len(buf) < 5: break
                n = buf[3] | buf[4] << 8
                if n > 7 + FRAME_MAX: self.bad += 1; del buf[:2]; continue
                if len(buf) < 6 + n: break
                kind, body, ok = chr(buf[2]), bytes(buf[5:5 + n]), (sum(buf[2:5 + n]) & 0xff) == buf[5 + n]
                if not ok: self.bad += 1; del buf[:2]; continue
                del buf[:6 + n]
                try: self._got(kind, body)
                except Exception: self.bad += 1

    def _got(self, kind, body):
        if kind == 'R' and len(body) >= 7: self.on_frame(body[:6], struct.unpack('b', body[6:7])[0], body[7:])
        elif kind == 'F' and len(body) >= 8 and self.on_fail:
            self.on_fail(body[:6], body[6] | body[7] << 8, body[8:].decode(errors='replace'))
        elif kind == 'I': self.info = body.decode(errors='replace'); self._info_event.set()
        elif kind == 'L': self.said = (self.said + [f'{time.strftime("%H:%M:%S")} {body.decode(errors="replace")}'])[-20:]
        # 'T' (the radio's own delivery report) is the master's business


# ── the link ───────────────────────────────────────────────────────────────────
# Reads several programs ask for at once (the Studio, its Debug Log, the sim's Sync): one trip over the radio serves
# them all. Everything else (moves, torque, play) always goes on its own.
SHARED_READS = ('/api/telemetry', '/api/health', '/api/log', '/api/anim/status', '/api/guard')
SHARE_FOR = 0.08      # s: a read answered this recently is handed out again


class Module:
    def __init__(self, mac):
        self.mac, self.name, self.ip, self.fw, self.rssi, self.seen, self.ch = mac, '', '', '', 0, 0.0, 0
        self.awake = True               # its hello says awake=0 while its radio naps (heat)
        self.got = threading.Condition()
        self.pending = {}               # seq -> Assembly; finished answers land in self.done[seq], give-ups in failed_why
        self.done, self.failed_why = {}, {}
        self.slots = threading.Semaphore(3)   # the module keeps its last 8 answers; the master carries 8 requests
        self.shared = {}                # read path -> (time, result), or a threading.Event while it travels
        self.shared_lock = threading.Lock()
        self.sent = self.failed = 0
        self.last_ms = 0.0

    def as_dict(self):
        return {'name': self.name, 'mac': self.mac.hex(':'), 'ip': self.ip, 'fw': self.fw, 'rssi': self.rssi, 'channel': self.ch,
                'seenAgoS': round(time.time() - self.seen, 2), 'awake': self.awake, 'requests': self.sent, 'failed': self.failed,
                'lastMs': round(self.last_ms, 1)}


class EspNowLink:
    """The laptop's side: hands requests to the master and waits for the answer. The master (firmware/espnow_dongle)
    owns the radio: heartbeat, resends, channel, the module list, the hold when this program vanishes."""
    HERE_EVERY = 0.1      # s: "the laptop program is here"; the master holds a driven robot after 0.4 s of silence
    STALE = 3.0           # s without a hello or an answer -> the module is gone
    BACKSTOP = 1.5        # s past the master's own 2.5 s give-up, in case even its "failed" got lost

    @classmethod
    def open(cls, port=None, baud=921600, channel=None):
        try: import serial, serial.tools.list_ports
        except ImportError: raise GosError('The ESP-NOW dongle needs pyserial: py -3.12 -m pip install pyserial') from None
        names = [port] if port else [p.device for p in serial.tools.list_ports.comports()
                                     # USB-serial chips of the master's carrier board (CH340, CP210x, CH343) only. Never
                                     # 303A:1001 (an ESP32-C3's own USB): that is a module plugged in for flashing, and
                                     # opening it every 3 s blocked the upload (7 Nov 2026).
                                     if (p.vid, p.pid) in ((0x1a86, 0x7523), (0x10c4, 0xea60), (0x1a86, 0x55d4), (0x1a86, 0x55d3))]
        if not names: raise GosError('No ESP-NOW dongle found on USB. Plug it in, or give its port, e.g. gos robot bridge COM7.')
        for name in names:
            s = serial.Serial()
            s.port, s.baudrate, s.timeout = name, baud, 0.05
            s.dtr = s.rts = False          # on the ESP32-CAM-MB these are reset and IO0: never pull them
            try: s.open()
            except serial.SerialException as e:
                if port: raise GosError(f'Cannot open {name}: {e}. Close the Arduino serial monitor or other programs using it.') from None
                continue
            link = cls(s, channel)
            info = link.dongle.ask_info(1.5)
            if not info.startswith('mac='):
                # Silent: opening the port can flick DTR/RTS, which on the ESP32-CAM-MB are IO0 and EN, and leave the chip
                # waiting in its upload mode (seen twice on 7 Nov). One clean restart: EN pulsed, IO0 left high.
                try:
                    s.dtr = False; s.rts = True; time.sleep(0.12); s.rts = False
                    time.sleep(1.2)
                    info = link.dongle.ask_info(1.5)
                except Exception: pass
            if info.startswith('mac=') and 'courier=1' in info: return link
            link.close()
            if info.startswith('mac='): raise GosError(f'The dongle on {name} runs old firmware: upload firmware/espnow_dongle to it.')
        raise GosError(f'No ESP-NOW dongle answered on {", ".join(names)}. Upload firmware/espnow_dongle to it.')

    def __init__(self, port, channel=None):
        self.modules = {}                  # mac -> Module
        self._mods_lock = threading.Lock()
        # a random start: a restarted program must not reuse the numbers a module still remembers (it answers those
        # "already done" for 10 s without running them)
        self._seq, self._seq_lock = int.from_bytes(os.urandom(2), 'little'), threading.Lock()
        self.channel = channel or 0        # the master follows the modules by itself; this only reports it
        self.dongle = Dongle(port, self._heard, self._gave_up)
        self._run = True
        if channel: self.dongle.channel(channel)
        self._thread = threading.Thread(target=self._here, name='espnow-here', daemon=True)
        self._thread.start()

    def _here(self):
        while self._run:
            try: self.dongle.here()
            except Exception: pass
            time.sleep(self.HERE_EVERY)

    def alive(self):
        now = time.time()
        return [m for m in self.modules.values() if now - m.seen < self.STALE]

    def _module(self, mac):
        with self._mods_lock:
            return self.modules.get(mac) or self.modules.setdefault(mac, Module(mac))

    def _heard(self, mac, rssi, frame):
        p = parse(frame)
        if not p: return
        kind, seq, idx, cnt, payload = p
        m = self._module(mac)
        m.rssi = rssi
        if kind == HELLO:
            m.seen = time.time()
            kv = dict(x.split('=', 1) for x in payload.decode(errors='replace').split() if '=' in x)
            m.name, m.ip, m.fw = kv.get('name', m.name), kv.get('ip', m.ip), kv.get('fw', m.fw)
            m.ch = int(kv.get('ch', 0) or 0)
            m.awake = kv.get('awake', '1') != '0'
            if m.ch: self.channel = m.ch
            if kv.get('dying'): m.seen = 0                   # its battery guard switched it off: gone
        elif kind == RESP:
            m.seen = time.time()
            with m.got:
                a = m.pending.get(seq)
                if a is None: return                    # an answer we stopped waiting for
                whole = a.add(seq, idx, cnt, payload)
                if whole is not None: m.done[seq] = whole
                m.got.notify_all()

    def _gave_up(self, mac, seq, why):
        m = self._module(mac)
        with m.got:
            if seq in m.pending: m.failed_why[seq] = why
            m.got.notify_all()

    def find(self, name):
        for m in self.alive():
            if m.name == name or m.mac.hex(':') == name.lower(): return m
        raise GosError(f'Module {name} is not heard over ESP-NOW. Heard: {", ".join(m.name for m in self.alive()) or "none"} '
                       f'(channel {self.channel or "searching"}). Check it is powered and runs the firmware with ESP-NOW.')

    def request(self, name, path, body=None, timeout=None, raw=False):
        """Run one web-API request on a module through the master: (http code, reply text); raw=True: reply bytes."""
        m = self.find(name) if isinstance(name, str) else name
        if body is None and not raw and path.split('?')[0] in SHARED_READS: return self._shared(m, path)
        return self._request(m, path, body, raw)

    def _shared(self, m, path):
        while True:
            with m.shared_lock:
                got = m.shared.get(path)
                if isinstance(got, tuple) and time.time() - got[0] < SHARE_FOR: return got[1]
                if isinstance(got, threading.Event): ev, mine = got, False
                else: ev, mine = threading.Event(), True; m.shared[path] = ev
            if not mine:                                 # someone is asking already: wait for that answer
                ev.wait(4.5)
                with m.shared_lock: got = m.shared.get(path)
                if isinstance(got, tuple): return got[1]
                continue                                 # that one failed: ask ourselves
            try:
                out = self._request(m, path, None)
                with m.shared_lock: m.shared[path] = (time.time(), out)
                return out
            except BaseException:
                with m.shared_lock: m.shared.pop(path, None)
                raise
            finally: ev.set()

    def _request(self, m, path, body, raw=False):
        msg = path.encode() + (b'\n' + (body if isinstance(body, bytes) else body.encode()) if body is not None else b'')
        with self._seq_lock:
            self._seq = self._seq % 0xffff + 1
            seq = self._seq
        out = frames(REQ, seq, msg)
        if len(out) > 16: raise GosError(f'Request too long for the radio ({len(msg)} bytes, at most {16 * PAYLOAD_MAX}).')
        t0 = time.perf_counter()
        if not m.slots.acquire(timeout=5): raise GosError(f'{m.name} is busy: too many requests waiting.')
        try:
            with m.got: m.pending[seq] = Assembly()
            m.sent += 1
            try:
                self.dongle.deliver(m.mac, out)                   # once, one USB write: the master resends over the air
            except Exception as e:
                self.dongle.dead = True
                raise GosError(f'The ESP-NOW dongle stopped answering ({e}). Was it unplugged?') from None
            end = t0 + 2.5 + self.BACKSTOP
            with m.got:
                while seq not in m.done and seq not in m.failed_why and time.perf_counter() < end:
                    m.got.wait(min(0.05, max(0.001, end - time.perf_counter())))
                done, why = m.done.pop(seq, None), m.failed_why.pop(seq, None)
            if done is None:
                m.failed += 1
                raise GosError(f'{m.name or m.mac.hex(":")} did not answer {path.split("?")[0]} over ESP-NOW: {why or "the master went quiet"}.')
            m.last_ms = (time.perf_counter() - t0) * 1000
        finally:
            with m.got: m.pending.pop(seq, None); m.done.pop(seq, None); m.failed_why.pop(seq, None)
            m.slots.release()
        code, _, reply = done.partition(b'\n')
        return int(code or 0), (reply if raw else reply.decode(errors='replace'))

    def status(self):
        return {'channel': self.channel, 'dongle': self.dongle.info, 'usbErrors': self.dongle.bad, 'masterSaid': self.dongle.said,
                'modules': [m.as_dict() for m in self.alive()]}

    def close(self):
        self._run = False
        self.dongle.close()


# ── the web gateway: one address per module, radio first, Wi-Fi as the fallback ──────────────────────────────────────
# tools/espnow/install.ps1 maps mod1.local .. mod9.local to 127.0.4.1 .. 9 in the Windows hosts file, so every program
# that says http://mod1.local (browser, Studio, sim, build.sh) lands here and never waits for a name lookup.
# - The module is heard over ESP-NOW: the request goes over the radio (no access point, no kicks).
# - Not heard, no dongle, or the radio did not answer: the same request goes to the module's Wi-Fi address.
# - The board's own web page comes over the radio in pieces (cached); firmware uploads go over the radio in 2 KB pieces
#   (the board checks size and checksum before switching). Only the board pulling an update from a URL needs Wi-Fi.
# Its Wi-Fi address: from its hello, else remembered (~/.gos/modules.json), else found on the network (find_modules).
NAMES = tuple(f'mod{i}' for i in range(1, 10))
WIFI_ONLY = ('/api/ota/url',)
OTA_PIECE = 2048        # bytes per radio piece: base64 ~2.7 KB = 12 radio frames (the master carries up to 16)


def fnv1a(data):
    h = 2166136261
    for b in data: h = ((h ^ b) * 16777619) & 0xffffffff
    return h


def _upload_file(body, ctype):
    """The firmware file from an upload: a multipart form (the board's page, curl -F) or the raw bytes."""
    if ctype and ctype.startswith('multipart/'):
        import email
        msg = email.message_from_bytes(b'Content-Type: ' + ctype.encode() + b'\r\n\r\n' + body)
        for part in msg.walk():
            if part.get_filename() or part.get_content_type() == 'application/octet-stream':
                return part.get_payload(decode=True)
        return None
    return body


def module_address(name):
    """The laptop-local address a module answers on through the gateway: mod1 -> 127.0.4.1, mod12 -> 127.0.4.12; other
    names get a fixed spot in 127.0.5.x. Every client that talks to http://<board>/api/... works with it unchanged."""
    m = re.fullmatch(r'mod(\d{1,3})', name or '')
    if m and 1 <= int(m.group(1)) <= 254: return f'127.0.4.{int(m.group(1))}'
    return f'127.0.5.{zlib.crc32((name or "").encode()) % 254 + 1}'


def _handler(gw, fixed=None):
    """fixed: the module this server stands for (its own address); else the first path part names it (/mod1/api/...)."""
    class H(BaseHTTPRequestHandler):
        protocol_version = 'HTTP/1.1'
        def log_message(self, *a): pass

        def _send(self, code, data, ctype=None):
            if isinstance(data, str): data = data.encode()
            self.send_response(code)
            self.send_header('Content-Type', ctype or ('application/json' if data[:1] in (b'{', b'[') else 'text/plain'))
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept')
            self.send_header('Cache-Control', 'no-store')
            try:
                self.end_headers()
                self.wfile.write(data)
            except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
                pass   # the asker gave up (its own timeout) before the answer came: nothing to tell it

        def do_OPTIONS(self): self._send(204, b'')

        def _forward(self, body=None):
            url = urllib.parse.urlsplit(self.path)
            if fixed: name, rest = fixed, url.path or '/'
            else:
                parts = url.path.strip('/').split('/', 1)
                if not parts[0]: return self._send(200, json.dumps(gw.status()))
                name, rest = parts[0], '/' + (parts[1] if len(parts) > 1 else '')
            target = rest + ('?' + url.query if url.query else '')
            code, data, ctype = gw.ask(name, rest, target, body, self.command, self.headers.get('Content-Type'))
            self._send(code, data, ctype)

        def do_GET(self): self._forward()

        def do_POST(self):
            n = int(self.headers.get('Content-Length') or 0)
            self._forward(self.rfile.read(n) if n else b'')
    return H


class _Server(ThreadingHTTPServer):
    allow_reuse_address = False      # on Windows reuse would let a second bridge share the port
    def server_bind(self):
        # HTTPServer.server_bind asks Windows for its own address's name (getfqdn): for 127.0.4.1 that hung for seconds
        socketserver.TCPServer.server_bind(self)
        self.server_name, self.server_port = self.server_address[:2]


def _start(handler, host, port, name):
    srv = _Server((host, port), handler)
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, name=name, daemon=True).start()
    return srv


class Gateway:
    """http://mod1.local (= http://127.0.4.1 with install.ps1) and http://127.0.0.1:8790/mod1/... answer like the board
    itself: over the radio when it hears the module, over Wi-Fi otherwise. / on 8790 lists the modules."""
    REMEMBER = pathlib.Path(os.environ.get('GOS_HOME') or pathlib.Path.home() / '.gos') / 'modules.json'
    FIND_EVERY = 20.0     # s between Wi-Fi searches for a module whose address is unknown

    def __init__(self, link=None, port=8790, host='127.0.0.1', module_port=80, names=NAMES):
        self.link, self.module_port, self.servers, self.errors = link, module_port, {}, {}
        self.own = lambda name: module_address(name) + ('' if module_port == 80 else f':{module_port}')
        self.wifi = self._load()
        self._found_at, self._finding = 0.0, False
        self.via = {}                    # name -> 'radio' | 'wifi' (how the last answer came)
        self.main = _start(_handler(self), host, port, 'espnow-gateway')
        self.server_address = self.main.server_address
        for n in names: self._open(n)
        self._run = True
        threading.Thread(target=self._watch, name='espnow-gateway-modules', daemon=True).start()

    def _open(self, name):
        if name in self.servers or name in self.errors: return
        try: self.servers[name] = _start(_handler(self, name), module_address(name), self.module_port, f'espnow-{name}')
        except OSError as e: self.errors[name] = str(e)

    def _load(self):
        try: return dict(json.loads(self.REMEMBER.read_text()))
        except (OSError, ValueError): return {}

    def _remember(self, name, ip):
        if not ip or ip == '-' or ip.startswith('127.') or self.wifi.get(name) == ip: return
        self.wifi[name] = ip
        try: self.REMEMBER.parent.mkdir(parents=True, exist_ok=True); self.REMEMBER.write_text(json.dumps(self.wifi, indent=1))
        except OSError: pass

    def _watch(self):
        while self._run:
            try:
                link = self.link
                for m in (link.alive() if link and not link.dongle.dead else []):
                    if m.name: self._open(m.name); self._remember(m.name, m.ip)
            except Exception as e: self.errors['_watch'] = repr(e)   # never let one bad pass end the watcher
            time.sleep(0.2)

    def _find(self):
        """Look for the modules on the Wi-Fi networks (in the background, at most every FIND_EVERY s)."""
        if self._finding or time.time() - self._found_at < self.FIND_EVERY: return
        self._finding, self._found_at = True, time.time()
        def go():
            try:
                from .hardware import find_modules
                for f in find_modules(): self._remember(f['name'], f['ip'])
            except Exception: pass
            finally: self._finding = False
        threading.Thread(target=go, name='espnow-find', daemon=True).start()

    def radio(self, name):
        link = self.link
        if not link or link.dongle.dead: return None
        try: return link.find(name)
        except GosError: return None

    def ask(self, name, path, target, body, method='GET', ctype=None):
        """(http code, bytes, content type) for one request to module `name`."""
        m = self.radio(name) if path not in WIFI_ONLY else None
        if m and path == '/':
            try: return 200, self._page(m), 'text/html; charset=utf-8'
            except GosError: pass                        # Wi-Fi below
        if m and path == '/api/ota' and method == 'POST':
            data = _upload_file(body or b'', ctype)
            if not data: return 400, b'no firmware file in the upload', 'text/plain'
            try: done = self._radio_ota(m, data)
            except GosError as e:
                return 500, f'upload over ESP-NOW failed: {e}. Nothing was activated - just retry.'.encode(), 'text/plain'
            if done: return done
            m = None                                     # older firmware on the board: this upload goes over Wi-Fi
        if m:
            try:
                code, text = self.link.request(m, target, body if body else None)
                self.via[name] = 'radio'
                return code or 502, self._own(name, path, text, m.ip).encode(), None
            except GosError: pass                        # the radio did not make it: Wi-Fi below
        known = self.radio(name)
        ip = (known.ip if known and known.ip != '-' else None) or self.wifi.get(name)
        if not ip:
            self._find()
            return 504, json.dumps({'ok': False, 'error': f'{name} is not heard over ESP-NOW and its Wi-Fi address is not known yet (looking for it). Is it powered?'}).encode(), None
        try:
            req = urllib.request.Request(f'http://{ip}{target}', data=body if method == 'POST' else None, method=method)
            if ctype: req.add_header('Content-Type', ctype)
            with urllib.request.urlopen(req, timeout=180 if path == '/api/ota' else 4) as r:
                code, data, rtype = r.status, r.read(), r.headers.get('Content-Type')
        except urllib.error.HTTPError as e:
            code, data, rtype = e.code, e.read(), e.headers.get('Content-Type')
        except OSError as e:
            self._find()
            return 504, json.dumps({'ok': False, 'error': f'{name} answers neither over ESP-NOW nor on Wi-Fi at {ip} ({e}).'}).encode(), None
        self.via[name] = 'wifi'
        if rtype and ('json' in rtype or 'text/plain' in rtype):
            data = self._own(name, path, data.decode(errors='replace'), ip).encode()
        return code, data, rtype

    def _page(self, m):
        """The board's web page over the radio: asked in pieces once per firmware (size + checksum), then cached."""
        code, text = self.link.request(m, '/api/page?info=1')
        if code != 200: raise GosError(f'no page over the radio ({code}): older firmware')   # -> Wi-Fi
        info = json.loads(text)
        key = (m.mac, info['size'], info['sum'])
        cache = self.__dict__.setdefault('_pages', {})
        if key not in cache:
            page = b''
            while len(page) < info['size']:
                code, piece = self.link.request(m, f'/api/page?off={len(page)}&len=6000', raw=True)
                if code != 200 or not piece: raise GosError(f'page piece at {len(page)} failed ({code})')
                page += piece                            # bytes: a piece may end inside a multi-byte character
            if fnv1a(page) != int(info['sum'], 16): raise GosError('the page arrived damaged')
            cache[key] = page
        return cache[key]

    def _radio_ota(self, m, data):
        """Firmware upload over the radio: begin -> 2 KB pieces in order -> finish. The board activates it only if the size
        and FNV-1a checksum match; anything cut off leaves the old firmware running."""
        import base64
        t0, name = time.time(), m.name
        code, text = self.link.request(m, f'/api/ota/begin?size={len(data)}&sum={fnv1a(data):08x}')
        if code == 404: return None                      # older firmware: no radio upload yet -> Wi-Fi
        if code != 200: raise GosError(f'the board refused the update: {text}')
        off = 0
        while off < len(data):
            piece = data[off:off + OTA_PIECE]
            for attempt in range(4):
                try:
                    code, text = self.link.request(m, f'/api/ota/part?off={off}', base64.b64encode(piece))
                except GosError:
                    if attempt == 3: raise
                    continue
                if code == 200: off = json.loads(text)['got']; break
                if code == 409 and '"got"' in text: off = json.loads(text)['got']; break   # back in step
                raise GosError(f'piece at {off}: {text}')
        code, text = self.link.request(m, '/api/ota/finish')
        if code != 200: raise GosError(f'finish: {text}')
        self.via[name] = 'radio'
        return 200, f'OK ({len(data)} bytes over ESP-NOW in {time.time() - t0:.0f} s)'.encode(), 'text/plain'

    def _own(self, name, path, text, ip):
        # report this gateway as the board's address, so clients that switch to the reported address stay here
        if ip and ip != '-': text = text.replace(f'"{ip}"', f'"{self.own(name)}"')
        if path == '/api/health': text = re.sub(r'"live":\s*\d+', '"live":0', text)   # the UDP stream is Wi-Fi only
        return text

    def address(self, name):
        return f'http://{self.own(name)}' if name in self.servers else None

    def status(self):
        link = self.link
        out = link.status() if link and not link.dongle.dead else {'dongle': 'not plugged in', 'modules': []}
        out['wifi'] = self.wifi
        out['via'] = self.via
        return out

    def shutdown(self):
        self._run = False
        for s_ in [self.main, *self.servers.values()]: s_.shutdown(); s_.server_close()


def serve_gateway(link, port=8790, host='127.0.0.1', module_port=80, names=NAMES):
    return Gateway(link, port, host, module_port, names)


def run_bridge(port=None, http_port=8790, channel=None, parent_pid=0, say=print):
    """gos robot bridge: the gateway runs at once (Wi-Fi works without a dongle); the dongle is picked up whenever it
    is plugged in and dropped when unplugged. Ends when the parent program ends (parent_pid) or on Ctrl+C."""
    try: hold_port(http_port).close()
    except OSError: say(f'An ESP-NOW bridge already runs (port {http_port} is taken).'); return BUSY
    gw = serve_gateway(None, http_port)
    if gw.errors: say(f'Some module addresses could not open: {gw.errors}')
    say('Gateway up: http://mod1.local (after tools/espnow/install.ps1) or http://127.0.4.1 ... 127.0.4.9. Waiting for the ESP-NOW dongle.')
    seen, told, next_try = set(), False, 0.0
    try:
        while parent_pid <= 0 or parent_alive(parent_pid):
            link = gw.link
            if link and link.dongle.dead:
                say('ESP-NOW dongle unplugged - modules go over Wi-Fi until it is back')
                link.close(); gw.link = link = None; seen = set()
            if not link and time.time() >= next_try:
                try:
                    gw.link = link = EspNowLink.open(port, channel=channel)
                    say(f'ESP-NOW dongle ready ({link.dongle.info})'); told = False
                except GosError as e:
                    if not told: say(f'{e} Trying again every 3 s; Wi-Fi works meanwhile.'); told = True
                    next_try = time.time() + 3
            now = {m.name for m in link.alive()} if link else set()
            for n in sorted(now - seen): say(f'+ {n} heard over ESP-NOW on channel {link.channel}: {gw.address(n) or "?"} goes over the radio')
            for n in sorted(seen - now): say(f'- {n} not heard over ESP-NOW for {EspNowLink.STALE:.0f} s: over Wi-Fi meanwhile')
            seen = now
            if link:                                     # what the master did by itself (hold, E-STOP, battery, channel)
                notes, link.dongle.said = link.dongle.said, []
                for note in notes: say(f'master: {note}')
            time.sleep(0.5)
    except KeyboardInterrupt: pass
    finally:
        gw.shutdown()
        if gw.link: gw.link.close()     # the heartbeat stops: a module the laptop was driving holds its pose
    return 0


# ── for whoever starts the bridge (the Studio: studio/tools/robo4Net.cjs) ──────
BUSY, NO_DONGLE = 3, 4      # exit codes of `gos robot bridge`: another copy runs / no dongle plugged in


def hold_port(port, host='127.0.0.1'):
    """Take the gateway port (OSError if another bridge has it); close it right before serving."""
    import socket
    s = socket.socket()
    s.bind((host, port))
    return s


def parent_alive(pid):
    """True while process `pid` runs. (os.kill(pid, 0) is no test on Windows: signal 0 there is Ctrl+C.)"""
    if os.name == 'nt':
        import ctypes
        k = ctypes.windll.kernel32
        h = k.OpenProcess(0x00100000, False, pid)            # SYNCHRONIZE
        if not h: return False
        try: return k.WaitForSingleObject(h, 0) == 0x102     # WAIT_TIMEOUT = still running
        finally: k.CloseHandle(h)
    try: os.kill(pid, 0); return True
    except OSError: return False
