"""The ESP-NOW link (gos/espnow.py) against a pretend master (the USB dongle) and module: no radio, no motors.

REUSE-CHECKED: test_gos.py's FakeBoard pretends to be the board's web API; this pretends to be the master below it.
The radio itself (losses, resends, napping modules) is the master's job and is tested in C++ against the real code:
firmware/esp32_multi/test_now.cpp (r4now::Courier).
"""
import json, queue, struct, threading, time, urllib.request
import pytest
from gos import espnow
from gos.app import GosError

MAC = bytes.fromhex('a1b2c3d4e5f6')
FAKE_IP = '192.0.2.1'   # TEST-NET-1 (RFC 5737): never a real device; tests must never reach the real robot


@pytest.fixture(autouse=True)
def _private(tmp_path, monkeypatch):
    monkeypatch.setattr(espnow.Gateway, 'REMEMBER', tmp_path / 'modules.json')         # never the real ~/.gos
    monkeypatch.setattr(espnow.Gateway, 'FIND_EVERY', 1e9)                           # no network search from a test


class FakeMaster:
    """A pyserial-like port that behaves like firmware/espnow_dongle with one module (mod1) behind it: carries each
    request ('Q') to the module and brings the answer back, says the module's hello, and says 'F' when the module is
    gone. The module runs each request number once (it keeps answers), like esp32_multi."""
    def __init__(self, give_up_after=0.3, old_firmware=False):
        self.out, self.buf = queue.Queue(), bytearray()
        self.gone, self.give_up_after, self.old = False, give_up_after, old_firmware
        self.runs, self.done, self.asm = [], {}, {}
        self.here = 0                        # 'P' frames seen
        self.lock = threading.Lock()
        self._run = True
        threading.Thread(target=self._hellos, daemon=True).start()

    def read(self, n):
        try: return self.out.get(timeout=0.02)
        except queue.Empty: return b''

    def close(self): self._run = False

    def _usb(self, kind, payload): self.out.put(espnow._usb(kind, payload))

    def _hellos(self):
        while self._run:
            if not self.gone:
                h = espnow.frames(espnow.HELLO, 0, f'name=mod1 ip={FAKE_IP} fw=0.1.0 ch=13 awake=1'.encode())[0]
                self._usb('R', MAC + struct.pack('b', -60) + h)
            time.sleep(0.2)

    def write(self, data):
        with self.lock:
            self.buf += data
            while len(self.buf) >= 6:
                n = self.buf[3] | self.buf[4] << 8
                if len(self.buf) < 6 + n: break
                kind, body = chr(self.buf[2]), bytes(self.buf[5:5 + n])
                del self.buf[:6 + n]
                if kind == 'I': self._usb('I', b'mac=00:11:22:33:44:55 ch=13 auto=1' + (b'' if self.old else b' courier=1'))
                elif kind == 'P': self.here += 1
                elif kind == 'Q': self._carry(body[:6], body[6:])

    def _carry(self, mac, frame):
        kind, seq, idx, cnt, payload = espnow.parse(frame)
        if mac != MAC or kind != espnow.REQ: return
        if self.gone:
            if idx == cnt - 1:
                threading.Timer(self.give_up_after, self._usb, ('F', mac + struct.pack('<H', seq) + b'no answer from the module')).start()
            return
        whole = payload if cnt == 1 else self.asm.setdefault(seq, espnow.Assembly()).add(seq, idx, cnt, payload)
        if whole is None: return
        if seq not in self.done:
            self.runs.append(whole.decode())
            body = json.dumps({'ok': True, 'ip': FAKE_IP, 'live': 4211, 'ran': whole.decode(),
                               'pad': 'x' * (3000 if 'telemetry' in whole.decode() else 0)})
            self.done[seq] = b'200\n' + body.encode()
        for f in espnow.frames(espnow.RESP, seq, self.done[seq]): self._usb('R', MAC + struct.pack('b', -60) + f)


def _link(master):
    link = espnow.EspNowLink(master)
    end = time.time() + 3
    while not link.alive() and time.time() < end: time.sleep(0.02)
    return link


def test_module_addresses():
    assert espnow.module_address('mod1') == '127.0.4.1' and espnow.module_address('mod12') == '127.0.4.12'
    assert espnow.module_address('arm').startswith('127.0.5.') and espnow.module_address('arm') == espnow.module_address('arm')


def test_frames_match_the_firmware_layout():
    f = espnow.frames(espnow.REQ, 7, b'/api/batch?3=170.5&4=180&speed=5')
    assert len(f) == 1 and f[0][:8] == b'R4\x02\x01\x07\x00\x00\x01'      # same bytes r4now.h builds (test_now.cpp case 1)
    big = bytes(range(256)) * 13
    parts = espnow.frames(espnow.RESP, 8, big)
    assert len(parts) == 14
    a = espnow.Assembly(); got = None
    for p in reversed(parts + parts[:2]):
        r = a.add(*espnow.parse(p)[1:])
        got = r if r is not None else got
    assert got == big
    assert espnow.parse(b'X4' + f[0][2:]) is None


def test_hears_the_modules_and_runs_requests_through_the_master():
    master = FakeMaster()
    link = _link(master)
    try:
        assert link.find('mod1').ip == FAKE_IP and link.channel == 13
        code, text = link.request('mod1', '/api/health')
        assert code == 200 and json.loads(text)['ran'] == '/api/health'
        code, text = link.request('mod1', '/api/telemetry')                  # 18 fragments back
        assert len(json.loads(text)['pad']) == 3000
        code, text = link.request('mod1', '/api/anim/load', body='{"frames":[]}')
        assert json.loads(text)['ran'] == '/api/anim/load\n{"frames":[]}'
        time.sleep(0.25)
        assert master.here >= 2                                               # "the laptop is here", every 100 ms
    finally: link.close()


def test_the_masters_give_up_is_an_error_that_says_why():
    master = FakeMaster()
    link = _link(master)
    try:
        master.gone = True
        with pytest.raises(GosError, match='no answer from the module'): link.request('mod1', '/api/health')
        with pytest.raises(GosError, match='not heard over ESP-NOW'): link.request('mod9', '/api/health')
    finally: link.close()


def test_old_dongle_firmware_is_refused(monkeypatch):
    master = FakeMaster(old_firmware=True)
    import serial
    class Port:                                                               # what EspNowLink.open opens
        def __init__(self): self.port = self.baudrate = self.timeout = None; self.dtr = self.rts = False
        def open(self): pass
        read, write, close = master.read, master.write, master.close
    monkeypatch.setattr(serial, 'Serial', Port)
    with pytest.raises(GosError, match='old firmware'): espnow.EspNowLink.open('COM99')


def test_gateway_answers_like_the_board():
    master = FakeMaster()
    link = _link(master)
    srv = espnow.serve_gateway(link, port=0, module_port=8799, names=('mod1',))
    base = f'http://127.0.0.1:{srv.server_address[1]}'
    try:
        assert srv.address('mod1') == 'http://127.0.4.1:8799'                    # mod1's own laptop address
        with urllib.request.urlopen(srv.address('mod1') + '/api/health', timeout=3) as r:
            h = json.loads(r.read())
        assert h['ran'] == '/api/health' and h['ip'] == '127.0.4.1:8799' and h['live'] == 0   # clients stay here
        with urllib.request.urlopen(base + '/mod1/api/batch?3=170&speed=5', timeout=3) as r:
            assert r.headers['Access-Control-Allow-Origin'] == '*'
            assert json.loads(r.read())['ran'] == '/api/batch?3=170&speed=5'
        with urllib.request.urlopen(base + '/', timeout=3) as r:
            assert json.loads(r.read())['modules'][0]['name'] == 'mod1'
        assert 'ota' not in ''.join(master.runs)                                 # uploads never go over the radio
    finally:
        srv.shutdown(); link.close()


def test_several_programs_at_once():
    """The Studio, its Debug Log and the sim all ask at the same time: nothing queues behind one slow answer,
    shared reads take one trip, and every command runs exactly once."""
    master = FakeMaster()
    link = _link(master)
    errors, cmds = [], []
    def reader():
        try:
            for _ in range(15): link.request('mod1', '/api/telemetry')
        except Exception as e: errors.append(e)
    def commander(k):
        try:
            for i in range(10):
                tag = f'c{k}-{i}'; cmds.append(tag)
                code, text = link.request('mod1', f'/api/batch?3=170&tag={tag}')
                assert json.loads(text)['ran'].endswith(tag)
        except Exception as e: errors.append(e)
    ts = [threading.Thread(target=reader) for _ in range(3)] + [threading.Thread(target=commander, args=(k,)) for k in range(2)]
    try:
        for t in ts: t.start()
        for t in ts: t.join(30)
        assert not errors, errors
        ran = [r for r in master.runs if 'tag=' in r]
        assert sorted(r.split('tag=')[1] for r in ran) == sorted(cmds)              # each command once
        assert sum('telemetry' in r for r in master.runs) < 45                        # 45 reads, fewer trips
    finally: link.close()


class _WifiBoard:
    """A pretend board on Wi-Fi (a local web server): answers /api/health and the page, records what it got."""
    def __init__(self):
        from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
        got = self.got = []
        class H(BaseHTTPRequestHandler):
            def log_message(self, *a): pass
            def _reply(self, body, ctype):
                data = body.encode(); self.send_response(200); self.send_header('Content-Type', ctype)
                self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)
            def do_GET(self):
                got.append(('GET', self.path))
                if self.path == '/': self._reply('<html>board page</html>', 'text/html')
                else: self._reply(json.dumps({'ok': True, 'ip': self.server.me, 'live': 4211, 'via': 'wifi'}), 'application/json')
            def do_POST(self):
                n = int(self.headers.get('Content-Length') or 0); got.append(('POST', self.path, len(self.rfile.read(n))))
                self._reply('OK', 'text/plain')
        self.srv = ThreadingHTTPServer(('127.0.0.1', 0), H)
        self.ip = self.srv.me = f'127.0.0.1:{self.srv.server_address[1]}'
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()


def test_no_dongle_goes_over_wifi_and_page_and_upload_always_do():
    board = _WifiBoard()
    srv = espnow.serve_gateway(None, port=0, module_port=8798, names=('mod1',))   # no dongle at all
    try:
        srv.wifi['mod1'] = board.ip                                               # as remembered from an earlier hello
        with urllib.request.urlopen(srv.address('mod1') + '/api/health', timeout=3) as r: h = json.loads(r.read())
        assert h['via'] == 'wifi' and h['ip'] == '127.0.4.1:8798' and h['live'] == 0   # still reports the gateway
        with urllib.request.urlopen(srv.address('mod1') + '/', timeout=3) as r: assert b'board page' in r.read()
        up = urllib.request.Request(srv.address('mod1') + '/api/ota?size=5', data=b'12345', method='POST')
        with urllib.request.urlopen(up, timeout=3) as r: assert r.read() == b'OK'
        assert ('POST', '/api/ota?size=5', 5) in board.got
        assert srv.via['mod1'] == 'wifi'
        srv.wifi.clear()
        with pytest.raises(urllib.error.HTTPError) as e: urllib.request.urlopen(srv.address('mod1') + '/api/health', timeout=3)
        assert e.value.code == 504 and b'not known yet' in e.value.read()
    finally:
        srv.shutdown(); board.srv.shutdown()


def test_radio_first_then_wifi_when_the_master_gives_up():
    board = _WifiBoard()
    master = FakeMaster()
    link = _link(master)
    srv = espnow.serve_gateway(link, port=0, module_port=8797, names=('mod1',))
    try:
        srv.wifi['mod1'] = board.ip
        with urllib.request.urlopen(srv.address('mod1') + '/api/health', timeout=5) as r: assert json.loads(r.read())['ran'] == '/api/health'
        assert srv.via['mod1'] == 'radio' and not board.got
        master.gone = True                                                        # the module stops answering the radio
        link.find('mod1').ip = board.ip                                           # (its hello said this address)
        time.sleep(espnow.SHARE_FOR + 0.05)                                       # past the shared-read moment
        with urllib.request.urlopen(srv.address('mod1') + '/api/health', timeout=8) as r: assert json.loads(r.read())['via'] == 'wifi'
        assert srv.via['mod1'] == 'wifi'
    finally:
        srv.shutdown(); link.close(); board.srv.shutdown()
