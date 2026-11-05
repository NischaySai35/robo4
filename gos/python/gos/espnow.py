"""ESP-NOW link to the modules through a USB dongle (firmware/espnow_dongle), with a local web gateway.

REUSE-CHECKED: no ESP-NOW code existed (6 Nov 2026). The frame layout mirrors firmware/libraries/R4Now/src/r4now.h;
change both together. The modules run every request through the same handlers as their web API, so the gateway
answers exactly like the board's own http://<board>/api/... does.

    gos robot bridge COM7                 # then: http://127.0.0.1:8790/mod1/api/telemetry
    link = EspNowLink.open('COM7'); link.request('mod1', '/api/health')

The laptop is the brain, the dongle only the radio:
- a heartbeat goes out every 100 ms; a module that misses it for 0.5 s holds its pose (and the laptop's moves stop);
- every request is numbered and resent until its answer arrives; the module never runs one number twice;
- the Wi-Fi channel is found by itself (the modules stay on ROBO4-NET's channel for uploads and their web page).
"""
import json, os, pathlib, struct, threading, time, urllib.parse
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
    """Reads and writes the dongle's USB frames. `port` is a pyserial port (or anything with read/write)."""
    def __init__(self, port, on_frame):
        self.port, self.on_frame = port, on_frame
        self.info, self.bad, self._wlock = '', 0, threading.Lock()
        self._info_event = threading.Event()
        self._run = True
        self._thread = threading.Thread(target=self._reader, name='espnow-usb', daemon=True)
        self._thread.start()

    def send(self, mac, frame):
        with self._wlock: self.port.write(_usb('S', mac + frame))

    def channel(self, ch):
        with self._wlock: self.port.write(_usb('C', bytes([ch])))

    def ask_info(self, wait=1.0):
        self._info_event.clear()
        with self._wlock: self.port.write(_usb('I'))
        self._info_event.wait(wait)
        return self.info

    def close(self):
        self._run = False
        try: self.port.close()
        except Exception: pass

    def _reader(self):
        buf = bytearray()
        while self._run:
            try: chunk = self.port.read(4096)
            except Exception: break
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
        elif kind == 'I': self.info = body.decode(errors='replace'); self._info_event.set()
        # 'T' (the radio's own delivery report) is not needed: the answer to each request is the real acknowledgement


# ── the link ───────────────────────────────────────────────────────────────────
class Module:
    def __init__(self, mac):
        self.mac, self.name, self.ip, self.fw, self.rssi, self.seen, self.ch = mac, '', '', '', 0, 0.0, 0
        self.lock = threading.Lock()   # one request at a time per module: it keeps only its last answer
        self.answer, self.waiting, self.got = Assembly(), None, threading.Condition()
        self.sent = self.resent = self.failed = 0
        self.last_ms = 0.0

    def as_dict(self):
        return {'name': self.name, 'mac': self.mac.hex(':'), 'ip': self.ip, 'fw': self.fw, 'rssi': self.rssi, 'channel': self.ch,
                'seenAgoS': round(time.time() - self.seen, 2), 'requests': self.sent, 'resent': self.resent, 'failed': self.failed,
                'lastMs': round(self.last_ms, 1)}


class EspNowLink:
    HB_EVERY = 0.1        # s; the module holds its pose after 0.5 s without one
    RESEND_AFTER = 0.12   # s with no new fragment of the answer -> send the request again
    STALE = 3.0           # s without a HELLO or an answer -> the module is gone
    SWEEP_DWELL = 1.1     # s per channel while looking: a resting module says hello once a second
    REMEMBER = pathlib.Path(os.environ.get('GOS_HOME') or pathlib.Path.home() / '.gos') / 'espnow_channel'

    @classmethod
    def open(cls, port=None, baud=921600, channel=None):
        try: import serial, serial.tools.list_ports
        except ImportError: raise GosError('The ESP-NOW dongle needs pyserial: py -3.12 -m pip install pyserial') from None
        names = [port] if port else [p.device for p in serial.tools.list_ports.comports()
                                     if (p.vid, p.pid) in ((0x1a86, 0x7523), (0x10c4, 0xea60), (0x1a86, 0x55d4), (0x303a, 0x1001))]
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
            if link.dongle.ask_info(1.5).startswith('mac='): return link
            link.close()
        raise GosError(f'No ESP-NOW dongle answered on {", ".join(names)}. Upload firmware/espnow_dongle to it.')

    def __init__(self, port, channel=None):
        self.modules = {}                  # mac -> Module
        self._mods_lock = threading.Lock()
        self._seq, self._seq_lock = 0, threading.Lock()
        self.channel, self._fixed = channel or self._remembered() or 1, bool(channel)
        self.dongle = Dongle(port, self._heard)
        self._run = True
        self.dongle.channel(self.channel)
        self._thread = threading.Thread(target=self._beat, name='espnow-heartbeat', daemon=True)
        self._thread.start()

    # heartbeat + finding the channel
    def _beat(self):
        hb_seq, ch_since = 0, time.time()
        while self._run:
            hb_seq = (hb_seq + 1) & 0xffff
            try: self.dongle.send(EVERYONE, frames(HB, hb_seq)[0])
            except Exception: pass
            now = time.time()
            if not self._fixed and not self.alive() and now - ch_since > self.SWEEP_DWELL:
                self.channel = self.channel % 13 + 1
                self.dongle.channel(self.channel)
                ch_since = now
            time.sleep(self.HB_EVERY)

    def _remembered(self):
        try: return int(self.REMEMBER.read_text().strip())
        except (OSError, ValueError): return 0

    def _remember(self, ch):
        try: self.REMEMBER.parent.mkdir(parents=True, exist_ok=True); self.REMEMBER.write_text(str(ch))
        except OSError: pass

    def alive(self):
        now = time.time()
        return [m for m in self.modules.values() if now - m.seen < self.STALE]

    def _heard(self, mac, rssi, frame):
        p = parse(frame)
        if not p: return
        kind, seq, idx, cnt, payload = p
        with self._mods_lock:
            m = self.modules.get(mac) or self.modules.setdefault(mac, Module(mac))
        m.rssi = rssi
        if kind == HELLO:
            m.seen = time.time()
            kv = dict(x.split('=', 1) for x in payload.decode(errors='replace').split() if '=' in x)
            m.name, m.ip, m.fw = kv.get('name', m.name), kv.get('ip', m.ip), kv.get('fw', m.fw)
            m.ch = int(kv.get('ch', 0) or 0)
            if m.ch and m.ch != self._remembered(): self._remember(m.ch)
        elif kind == RESP:
            m.seen = time.time()
            with m.got:
                if m.waiting != seq: return             # an answer we stopped waiting for
                whole = m.answer.add(seq, idx, cnt, payload)
                if whole is not None: m.waiting = ('done', whole)
                m.got.notify_all()

    def find(self, name):
        for m in self.alive():
            if m.name == name or m.mac.hex(':') == name.lower(): return m
        raise GosError(f'Module {name} is not heard over ESP-NOW. Heard: {", ".join(m.name for m in self.alive()) or "none"} '
                       f'(channel {self.channel}). Check it is powered and runs the firmware with ESP-NOW.')

    def request(self, name, path, body=None, timeout=2.0):
        """Run one web-API request on a module over the radio: (http code, reply text)."""
        m = self.find(name) if isinstance(name, str) else name
        msg = path.encode() + (b'\n' + (body if isinstance(body, bytes) else body.encode()) if body is not None else b'')
        with self._seq_lock:
            self._seq = self._seq % 0xffff + 1
            seq = self._seq
        out = frames(REQ, seq, msg)
        with m.lock:
            t0 = time.perf_counter()
            with m.got:
                m.waiting, m.answer = seq, Assembly()
            m.sent += 1
            end, tries = t0 + timeout, 0
            while True:
                for f in out: self.dongle.send(m.mac, f)
                tries += 1
                last_progress, last_count = time.perf_counter(), 0
                with m.got:
                    while not isinstance(m.waiting, tuple):
                        now = time.perf_counter()
                        if now >= end: break
                        if m.answer.progress() != last_count: last_count, last_progress = m.answer.progress(), now
                        if now - last_progress >= self.RESEND_AFTER: break
                        m.got.wait(min(0.01, end - now))
                    done = m.waiting if isinstance(m.waiting, tuple) else None
                if done: break
                if time.perf_counter() >= end:
                    with m.got: m.waiting = None
                    m.failed += 1
                    raise GosError(f'{m.name or m.mac.hex(":")} did not answer {path.split("?")[0]} over ESP-NOW in {timeout} s ({tries} tries).')
                m.resent += 1
            m.last_ms = (time.perf_counter() - t0) * 1000
            with m.got: m.waiting = None
        text = done[1].decode(errors='replace')
        code, _, reply = text.partition('\n')
        return int(code or 0), reply

    def status(self):
        return {'channel': self.channel, 'dongle': self.dongle.info, 'usbErrors': self.dongle.bad,
                'modules': [m.as_dict() for m in self.alive()]}

    def close(self):
        self._run = False
        self.dongle.close()


# ── the web gateway: the board's own API, reached over the radio ───────────────
def serve_gateway(link, port=8790, host='127.0.0.1'):
    """http://127.0.0.1:8790/<module>/api/... answers like http://<module>/api/... . / lists the modules."""
    class H(BaseHTTPRequestHandler):
        protocol_version = 'HTTP/1.1'
        def log_message(self, *a): pass

        def _send(self, code, text, ctype=None):
            data = text.encode()
            self.send_response(code)
            self.send_header('Content-Type', ctype or ('application/json' if text[:1] in '{[' else 'text/plain'))
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(data)

        def do_OPTIONS(self): self._send(204, '')

        def _forward(self, body=None):
            url = urllib.parse.urlsplit(self.path)
            parts = url.path.strip('/').split('/', 1)
            if not parts[0]: return self._send(200, json.dumps(link.status()))
            name, rest = parts[0], '/' + (parts[1] if len(parts) > 1 else '')
            if rest.startswith('/api/ota'):
                return self._send(501, json.dumps({'ok': False, 'error': 'firmware uploads go over Wi-Fi: use the board address'}))
            if rest == '/':
                return self._send(501, json.dumps({'ok': False, 'error': "the board's web page is on Wi-Fi only"}))
            try: code, text = link.request(name, rest + ('?' + url.query if url.query else ''), body)
            except GosError as e: return self._send(504, json.dumps({'ok': False, 'error': str(e)}))
            self._send(code or 502, text)

        def do_GET(self): self._forward()

        def do_POST(self):
            n = int(self.headers.get('Content-Length') or 0)
            self._forward(self.rfile.read(n) if n else None)

    srv = ThreadingHTTPServer((host, port), H)
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, name='espnow-gateway', daemon=True).start()
    return srv
