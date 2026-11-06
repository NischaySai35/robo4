"""The ESP-NOW link (gos/espnow.py) against a pretend dongle and module, no radio or motors.

REUSE-CHECKED: test_gos.py's FakeBoard pretends to be the board's web API; this pretends to be the radio below it.
"""
import json, queue, random, struct, threading, time, urllib.request
import pytest
from gos import espnow
from gos.app import GosError

MAC = bytes.fromhex('a1b2c3d4e5f6')


@pytest.fixture(autouse=True)
def _quick_and_private(tmp_path, monkeypatch):
    monkeypatch.setattr(espnow.EspNowLink, 'REMEMBER', tmp_path / 'espnow_channel')   # never the real ~/.gos
    monkeypatch.setattr(espnow.EspNowLink, 'SWEEP_DWELL', 0.25)                      # the fake answers a heartbeat at once
    monkeypatch.setattr(espnow.Gateway, 'REMEMBER', tmp_path / 'modules.json')         # never the real ~/.gos
    monkeypatch.setattr(espnow.Gateway, 'FIND_EVERY', 1e9)                           # no network search from a test


class FakeAir:
    """A pyserial-like port: what the laptop writes reaches a pretend module on `channel`; it can lose frames."""
    def __init__(self, channel=6, loss=0.0, seed=1):
        self.channel, self.tuned, self.loss, self.rng = channel, 1, loss, random.Random(seed)
        self.out, self.buf = queue.Queue(), bytearray()
        self.runs = []                       # requests the module actually ran
        self.done = {}                       # seq -> saved answer: the module keeps its last 4 (firmware NOW_CACHE)
        self.ran = []                        # the last 32 request numbers (firmware NOW_RAN)
        self.asm = espnow.Assembly()
        self.hb_seen = self.hello_at = 0.0
        self.counter = 0

    # pyserial surface
    def read(self, n):
        try: return self.out.get(timeout=0.02)
        except queue.Empty: return b''

    def close(self): pass

    def write(self, data):
        self.buf += data
        while len(self.buf) >= 6:
            n = self.buf[3] | self.buf[4] << 8
            if len(self.buf) < 6 + n: break
            kind, body = chr(self.buf[2]), bytes(self.buf[5:5 + n])
            del self.buf[:6 + n]
            if kind == 'I': self._usb('I', f'mac=00:11:22:33:44:55 ch={self.tuned}'.encode())
            elif kind == 'C': self.tuned = body[0]
            elif kind == 'S': self._air_to_module(body[:6], body[6:])

    def _usb(self, kind, payload):
        self.out.put(espnow._usb(kind, payload))

    def _lost(self): return self.rng.random() < self.loss

    def _hears(self):           # a neighbouring channel lets only hellos through (seen on mod1: 13 heard from 12)
        return self.tuned == self.channel or abs(self.tuned - self.channel) == 1

    def _to_laptop(self, frame):
        exact = self.tuned == self.channel
        if (exact or (self._hears() and frame[2] == espnow.HELLO)) and not self._lost():
            self._usb('R', MAC + struct.pack('b', -50) + frame)

    def _air_to_module(self, mac, frame):
        if not self._hears() or self._lost(): return
        kind, seq, idx, cnt, payload = espnow.parse(frame)
        if kind == espnow.HB:
            if time.time() - self.hb_seen > 0.5 or time.time() - self.hello_at > 1.0: self._hello()   # at once after silence, then every second
            self.hb_seen = time.time()
        elif kind == espnow.REQ and mac == MAC:
            if seq in self.done or seq in self.ran:                   # a resend of a request already answered:
                if idx == cnt - 1:                                    # the saved answer again (or 'already done'), never run twice
                    again = self.done.get(seq, b'208\n{"ok": true, "ran": "already done"}')
                    for f in espnow.frames(espnow.RESP, seq, again): self._to_laptop(f)
                return
            whole = payload if cnt == 1 else self.asm.add(seq, idx, cnt, payload)
            if whole is None: return
            self.runs.append(whole.decode())
            self.counter += 1
            body = json.dumps({'ok': True, 'ip': '192.0.2.1', 'live': 4211, 'ran': whole.decode(), 'n': self.counter, 'pad': 'x' * (3000 if 'telemetry' in whole.decode() else 0)})
            answer = b'200\n' + body.encode()
            self.done[seq] = answer
            self.ran.append(seq); del self.ran[:-32]
            while len(self.done) > 4: self.done.pop(next(iter(self.done)))
            for f in espnow.frames(espnow.RESP, seq, answer): self._to_laptop(f)

    def _hello(self):
        self.hello_at = time.time()
        self._to_laptop(espnow.frames(espnow.HELLO, 0, f'name=mod1 ip=192.0.2.1 fw=0.1.0 ch={self.channel}'.encode())[0])


def _link(air, **kw):
    link = espnow.EspNowLink(air, **kw)
    end = time.time() + 8
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


def test_finds_the_channel_and_runs_requests():
    air = FakeAir(channel=6)
    link = _link(air)
    try:
        assert link.channel == 6 and link.find('mod1').ip == '192.0.2.1'
        assert espnow.EspNowLink.REMEMBER.read_text() == '6'                     # next start tries channel 6 first
        code, text = link.request('mod1', '/api/health')
        assert code == 200 and json.loads(text)['ran'] == '/api/health'
        code, text = link.request('mod1', '/api/telemetry')                  # 13 fragments back
        assert len(json.loads(text)['pad']) == 3000
        code, text = link.request('mod1', '/api/anim/load', body='{"frames":[]}')
        assert json.loads(text)['ran'] == '/api/anim/load\n{"frames":[]}'
    finally: link.close()


def test_a_lossy_radio_still_runs_each_request_exactly_once():
    air = FakeAir(channel=3, loss=0.2, seed=4)                               # 1 frame in 5 lost, both ways
    link = _link(air, channel=3)
    try:
        for i in range(30):
            code, text = link.request('mod1', f'/api/command?servo=3&cmd=torquetoggle&i={i}', timeout=3)
            assert code == 200 and json.loads(text)['ran'].endswith(f'i={i}')
        assert len(air.runs) == 30                                         # resends happened, nothing ran twice
        assert link.find('mod1').resent > 0
    finally: link.close()


def test_silence_is_an_error_that_says_what_to_do():
    air = FakeAir(channel=5)
    link = _link(air, channel=5)
    try:
        air.loss = 1.0
        with pytest.raises(GosError, match='did not answer'): link.request('mod1', '/api/health', timeout=0.4)
        with pytest.raises(GosError, match='not heard over ESP-NOW'): link.request('mod9', '/api/health')
    finally: link.close()


def test_gateway_answers_like_the_board():
    air = FakeAir(channel=11)
    link = _link(air)
    srv = espnow.serve_gateway(link, port=0, module_port=8799, names=('mod1',))
    base = f'http://127.0.0.1:{srv.server_address[1]}'
    try:
        end = time.time() + 3
        while not srv.address('mod1') and time.time() < end: time.sleep(0.05)
        assert srv.address('mod1') == 'http://127.0.4.1:8799'                    # mod1's own laptop address
        with urllib.request.urlopen(srv.address('mod1') + '/api/health', timeout=3) as r:
            h = json.loads(r.read())
        assert h['ran'] == '/api/health' and h['ip'] == '127.0.4.1:8799' and h['live'] == 0   # clients stay on the radio
        with urllib.request.urlopen(base + '/mod1/api/batch?3=170&speed=5', timeout=3) as r:
            assert r.headers['Access-Control-Allow-Origin'] == '*'
            assert json.loads(r.read())['ran'] == '/api/batch?3=170&speed=5'
        with urllib.request.urlopen(base + '/', timeout=3) as r:
            assert json.loads(r.read())['modules'][0]['name'] == 'mod1'
        assert 'ota' not in ''.join(air.runs)                                    # uploads never go over the radio
    finally:
        srv.shutdown(); link.close()


def test_several_programs_at_once_on_a_lossy_radio():
    """The Studio, its Debug Log and the sim all ask at the same time: nothing queues behind one slow answer,
    shared reads take one trip, and every command still runs exactly once."""
    air = FakeAir(channel=2, loss=0.15, seed=7)
    link = _link(air, channel=2)
    errors, cmds = [], []
    def reader():
        try:
            for _ in range(15): link.request('mod1', '/api/telemetry', timeout=3)
        except Exception as e: errors.append(e)
    def commander(k):
        try:
            for i in range(10):
                tag = f'c{k}-{i}'; cmds.append(tag)
                code, text = link.request('mod1', f'/api/batch?3=170&tag={tag}', timeout=3)
                ran = json.loads(text)['ran']
                assert ran.endswith(tag) or ran == 'already done'
        except Exception as e: errors.append(e)
    ts = [threading.Thread(target=reader) for _ in range(3)] + [threading.Thread(target=commander, args=(k,)) for k in range(2)]
    try:
        t0 = time.time()
        for t in ts: t.start()
        for t in ts: t.join(30)
        assert not errors, errors
        ran = [r for r in air.runs if 'tag=' in r]
        assert sorted(r.split('tag=')[1] for r in ran) == sorted(cmds)              # each command once
        assert sum('telemetry' in r for r in air.runs) < 45                           # 45 reads, fewer trips
        assert time.time() - t0 < 20
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


def test_radio_first_then_wifi_when_the_radio_fails():
    board = _WifiBoard()
    air = FakeAir(channel=4)
    link = _link(air, channel=4)
    srv = espnow.serve_gateway(link, port=0, module_port=8797, names=('mod1',))
    try:
        srv.wifi['mod1'] = board.ip
        with urllib.request.urlopen(srv.address('mod1') + '/api/health', timeout=5) as r: assert json.loads(r.read())['ran'] == '/api/health'
        assert srv.via['mod1'] == 'radio' and not board.got
        air.loss = 1.0                                                            # the radio goes quiet
        link.find('mod1').ip = board.ip                                           # (its hello said this address)
        time.sleep(espnow.SHARE_FOR + 0.05)                                       # past the shared-read moment
        with urllib.request.urlopen(srv.address('mod1') + '/api/health', timeout=8) as r: assert json.loads(r.read())['via'] == 'wifi'
        assert srv.via['mod1'] == 'wifi'
    finally:
        srv.shutdown(); link.close(); board.srv.shutdown()
