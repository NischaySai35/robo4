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
    PAGE = ('<html>board page ' + 'é' * 4000 + ' end</html>').encode()   # multi-byte characters across piece borders

    def _board(self, whole):
        """The board's page pieces and radio upload (esp32_multi handlePage / handleOtaBegin / Part / Finish)."""
        import base64, urllib.parse
        target, _, body = whole.partition(b'\n')
        url = urllib.parse.urlsplit(target.decode()); q = dict(urllib.parse.parse_qsl(url.query))
        if url.path == '/api/page':
            if 'info' in q: return b'200\n' + json.dumps({'ok': True, 'size': len(self.PAGE), 'sum': f'{espnow.fnv1a(self.PAGE):x}'}).encode()
            off, n = int(q['off']), int(q['len']); return b'200\n' + self.PAGE[off:off + n]
        if url.path == '/api/ota/begin':
            self.ota = {'size': int(q['size']), 'sum': int(q['sum'], 16), 'data': b''}; return b'200\n{"ok":true,"got":0}'
        if url.path == '/api/ota/part':
            off, d = int(q['off']), self.ota['data']
            if off > len(d): return b'409\n' + json.dumps({'ok': False, 'got': len(d)}).encode()
            if off == len(d): self.ota['data'] = d + base64.b64decode(body)
            return b'200\n' + json.dumps({'ok': True, 'got': len(self.ota['data'])}).encode()
        if url.path == '/api/ota/finish':
            ok = len(self.ota['data']) == self.ota['size'] and espnow.fnv1a(self.ota['data']) == self.ota['sum']
            self.flashed = self.ota['data'] if ok else None
            return b'200\n{"ok":true}' if ok else b'500\n{"ok":false}'
        return None

    def __init__(self, give_up_after=0.3, old_firmware=False, new_firmware=True, stop_cmd=True):
        self.new_firmware, self.ota, self.flashed, self.stop_cmd = new_firmware, None, None, stop_cmd
        self.stops, self.raw = [], []        # 'H' / 'E' from the laptop; 'S' frames it asked to send (mac, frame)
        self.hello_extra = ' bat=11.6 held=0 anim=0'
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

    def note(self, text, seq=1):
        """The module tells the master something (r4now NOTE), which hands it to the laptop as heard ('R')."""
        self._usb('R', MAC + struct.pack('b', -60) + espnow.frames(espnow.NOTE, seq, text.encode())[0])

    def _hellos(self):
        while self._run:
            if not self.gone:
                h = espnow.frames(espnow.HELLO, 0, f'name=mod1 ip={FAKE_IP} fw=0.1.0 ch=13 awake=1{self.hello_extra}'.encode())[0]
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
                if kind == 'I': self._usb('I', b'mac=00:11:22:33:44:55 ch=13 auto=1' + (b'' if self.old else b' courier=1') + (b' stop=1' if self.stop_cmd else b''))
                elif kind == 'P': self.here += 1
                elif kind in 'HE' and self.stop_cmd: self.stops.append(kind); self._usb('L', b'laptop: every module stops')
                elif kind == 'S': self.raw.append((body[:6], body[6:]))
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
            self.runs.append(whole.decode(errors='replace')[:200])
            special = self._board(whole) if self.new_firmware else None
            if special is not None: self.done[seq] = special
            else:
                body = json.dumps({'ok': True, 'ip': FAKE_IP, 'live': 4211, 'ran': whole.decode(errors='replace'),
                                   'pad': 'x' * (3000 if 'telemetry' in whole.decode(errors='replace') else 0)})
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


def test_page_and_firmware_upload_over_the_radio():
    master = FakeMaster()
    link = _link(master)
    srv = espnow.serve_gateway(link, port=0, module_port=8796, names=('mod1',))
    try:
        with urllib.request.urlopen(srv.address('mod1') + '/', timeout=10) as r:
            assert r.read() == FakeMaster.PAGE and 'text/html' in r.headers['Content-Type']   # pieces, bytes intact
        fw = bytes(range(256)) * 40 + b'tail'                                     # 10 KB: 5 radio pieces
        boundary = 'XyZ'
        form = (f'--{boundary}\r\nContent-Disposition: form-data; name="f"; filename="fw.bin"\r\n'
                'Content-Type: application/octet-stream\r\n\r\n').encode() + fw + f'\r\n--{boundary}--\r\n'.encode()
        up = urllib.request.Request(srv.address('mod1') + f'/api/ota?size={len(fw)}', data=form, method='POST',
                                    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'})
        with urllib.request.urlopen(up, timeout=20) as r: assert r.read().startswith(b'OK')
        assert master.flashed == fw                                               # every byte, checksum matched
    finally:
        srv.shutdown(); link.close()


def test_upload_to_older_firmware_falls_back_to_wifi():
    board = _WifiBoard()
    master = FakeMaster(new_firmware=False)                                       # no radio upload on the board yet
    link = _link(master)
    srv = espnow.serve_gateway(link, port=0, module_port=8795, names=('mod1',))
    try:
        link.find('mod1').ip = board.ip
        master._board = lambda whole: b'404\n{"ok":false}' if whole.startswith(b'/api/ota/begin') else None
        master.new_firmware = True
        up = urllib.request.Request(srv.address('mod1') + '/api/ota?size=5', data=b'12345', method='POST')
        with urllib.request.urlopen(up, timeout=10) as r: assert r.read() == b'OK'
        assert ('POST', '/api/ota?size=5', 5) in board.got                         # it went over Wi-Fi
    finally:
        srv.shutdown(); link.close(); board.srv.shutdown()


def test_message_types_and_sizes_match_the_firmware():
    """espnow.py and r4now.h must agree on every message type and size: a type only one side knows is silently ignored."""
    import pathlib, re
    h = (pathlib.Path(__file__).resolve().parents[3] / 'firmware/libraries/R4Now/src/r4now.h').read_text()
    enum = dict((k, int(v)) for k, v in re.findall(r'(\w+)\s*=\s*(\d+)', re.search(r'enum Type[^{]*\{([^}]*)\}', h).group(1)))
    assert enum == {k: getattr(espnow, k) for k in enum}, enum
    assert len(enum) >= 8 and len(set(enum.values())) == len(enum)
    for name in ('VERSION', 'FRAME_MAX', 'HEAD', 'MSG_MAX'):
        assert int(re.search(rf'constexpr\s+\w+\s+{name}\s*=\s*(\d+)', h).group(1)) == getattr(espnow, name), name


def test_status_notes_and_stop_all_through_the_master():
    master = FakeMaster()
    link = _link(master)
    srv = espnow.serve_gateway(link, port=0, module_port=8794, names=('mod1',))
    base = f'http://127.0.0.1:{srv.server_address[1]}'
    try:
        link.dongle.ask_info(1.0)
        m = link.find('mod1')
        assert m.battery == 11.6 and not m.held and not m.playing
        master.hello_extra = ' bat=11.5 held=1 anim=0'; time.sleep(0.45)
        assert m.held and m.battery == 11.5
        master.note('anim finished (4 frames) - highest current: TWIST1 900 mA (load 40 %), BEND2 700 mA (load 30 %)', seq=5)
        master.note('anim finished (4 frames) - highest current: TWIST1 900 mA (load 40 %), BEND2 700 mA (load 30 %)', seq=5)  # a repeat
        time.sleep(0.2)
        with urllib.request.urlopen(base + '/_events', timeout=3) as r: ev = json.loads(r.read())
        texts = [(e['source'], e['text']) for e in ev['events']]
        assert sum('highest current' in t for _, t in texts) == 1 and ('mod1', texts[-1][1]) == texts[-1]
        with urllib.request.urlopen(base + '/_stop', timeout=3) as r: out = json.loads(r.read())
        assert out == {'ok': True, 'via': 'radio', 'modules': ['mod1'], 'failed': []}
        with urllib.request.urlopen(base + '/_stop?limp=1', timeout=3) as r: json.loads(r.read())
        time.sleep(0.2)
        assert master.stops == ['H', 'E']                                         # the master's own command, like its button
        with urllib.request.urlopen(base + f'/_events?after={ev["last"]}', timeout=3) as r: later = json.loads(r.read())['events']
        assert any(e['source'] == 'master' for e in later) and any('E-STOP' in e['text'] for e in later)
        assert master.runs == []                                                  # no web request was needed for any of it
    finally:
        srv.shutdown(); link.close()


def test_stop_all_with_a_master_from_before_the_stop_command():
    master = FakeMaster(stop_cmd=False)
    link = _link(master)
    try:
        link.dongle.ask_info(1.0)
        assert link.stop_all() == ['mod1']
        time.sleep(0.2)
        sent = [(mac, espnow.parse(f)[0]) for mac, f in master.raw]
        assert (MAC, espnow.HOLD) in sent and (espnow.EVERYONE, espnow.HOLD) in sent  # to the module and to everyone
    finally: link.close()


def test_stop_all_over_wifi_without_the_master():
    board = _WifiBoard()
    srv = espnow.serve_gateway(None, port=0, module_port=8793, names=('mod1',))
    try:
        srv.wifi['mod1'] = board.ip
        out = srv.stop_all()
        assert out['ok'] and out['via'] == 'wifi' and out['modules'] == ['mod1'] and ('GET', '/api/hold') in board.got
        srv.stop_all(limp=True)
        assert ('GET', '/api/command?servo=all&cmd=estop') in board.got
        srv.wifi['mod2'] = FAKE_IP                                                # unreachable: said, never hidden
        out = srv.stop_all()
        assert not out['ok'] and out['failed'][0].startswith('mod2')
    finally:
        srv.shutdown(); board.srv.shutdown()


class _AnimBoard:
    """A pretend module for group play (esp32_multi handleAnimLoad / Play / Status / Stop): records the upload, plays
    when asked; `peers` hear its GO like the radio would (unless deaf)."""
    def __init__(self, deaf=False):
        from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
        import urllib.parse
        me = self
        self.loaded = self.query = None; self.playing = False; self.group = None; self.peers = []; self.deaf = deaf; self.plays = 0
        class H(BaseHTTPRequestHandler):
            def log_message(self, *a): pass
            def _json(self, d):
                data = json.dumps(d).encode(); self.send_response(200); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)
            def do_POST(self):
                n = int(self.headers.get('Content-Length') or 0); body = self.rfile.read(n).decode()
                u = urllib.parse.urlsplit(self.path); q = dict(urllib.parse.parse_qsl(u.query))
                head, _, payload = body.partition('\n')
                _, count, total = head.split()
                assert espnow_hw.ModuleGroup.checksum(payload) == int(total) and payload.count('\n') == int(count)
                me.loaded, me.query, me.group = payload, q, int(q['group']) if 'group' in q else 0
                self._json({'ok': True, 'frames': int(count)})
            def do_GET(self):
                u = urllib.parse.urlsplit(self.path)
                if u.path == '/api/anim/play':
                    me.playing = True; me.plays += 1
                    for p in me.peers:
                        if not p.deaf and p.group == me.group: p.playing = True     # GO over the radio
                elif u.path == '/api/anim/stop': me.playing = False
                self._json({'ok': True, 'playing': me.playing, 'group': me.group})
        self.srv = ThreadingHTTPServer(('127.0.0.1', 0), H)
        self.url = f'http://127.0.0.1:{self.srv.server_address[1]}'
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()


from gos import hardware as espnow_hw


def test_module_group_loads_each_its_own_joints_and_starts_together():
    b1, b2, b3 = _AnimBoard(), _AnimBoard(), _AnimBoard(deaf=True)
    b1.peers = [b2, b3]
    boards = {1: b1, 2: b2, 3: b3}
    g = espnow_hw.ModuleGroup([2, 1, 3], address=lambda n: boards[n].url, timeout=3)
    try:
        frames = [{'pose': {1: {3: 170, 4: 190}, 2: {3: 175}}, 'time_ms': 1500, 'speed': 7},
                  {'pose': {1: {3: 180}}, 'hold_ms': 200}]                              # module 2 and 3 not in frame 2
        assert g.load(frames).ok
        assert b1.loaded == '1500 7 0 3:170.0 4:190.0\n0 5 200 3:180.0 4:190.0\n'           # same lines the Studio sends
        assert b2.loaded == '1500 7 0 3:175.0\n0 5 200 3:175.0\n'                          # keeps its last angles
        assert b3.loaded == '1500 7 0 \n0 5 200 \n'
        assert b1.group == b2.group == b3.group and b1.group > 0
        r = g.play()
        assert r.ok and b1.plays == 1 and b2.plays == 0 and b2.playing                    # 2 heard GO: no second start
        assert r.data['late'] == [3] and b3.plays == 1 and 'did not hear GO' in r.message  # deaf one started directly
        g.stop()
        assert not (b1.playing or b2.playing or b3.playing)
        single = espnow_hw.ModuleGroup([1], address=lambda n: boards[n].url, timeout=3)
        single.load(frames); assert 'group' not in b1.query                               # one module: no group number
    finally:
        for b in boards.values(): b.srv.shutdown()


def test_the_fleet_on_the_gos_network():
    import gos
    master = FakeMaster()
    link = _link(master)
    srv = espnow.serve_gateway(link, port=0, module_port=8792, names=('mod1',))
    bridge = f'http://127.0.0.1:{srv.server_address[1]}'
    try:
        link.dongle.ask_info(1.0)
        master.note('old news', seq=1); time.sleep(0.2)
        with gos.App() as app:
            fleet, happened = [], []
            app.topic('/modules').subscribe(fleet.append)
            app.topic('/modules/events').subscribe(happened.append)
            stop = espnow_hw.serve_modules(app, bridge, rate=10)
            time.sleep(0.4)
            master.note('battery low: 10.2 V - the module switches itself off in 5 s unless it recovers', seq=2)
            time.sleep(0.5)
            assert fleet and fleet[-1][0]['name'] == 'mod1' and fleet[-1][0]['battery'] == 11.6
            assert [e['text'][:11] for e in happened] == ['battery low']                    # only news, not history
            r = app.services.call('/modules/stop', {'limp': False})
            assert r['ok'] and 'radio' in r['message']
            stop()
        time.sleep(0.2)
        assert master.stops == ['H']
    finally:
        srv.shutdown(); link.close()


def test_stop_all_without_a_bridge_says_so():
    r = espnow_hw.stop_all(bridge='http://127.0.0.1:9')                            # nothing listens there
    assert not r.ok and 'could NOT' in r.message and 'Cut the power' in r.message
    board = _WifiBoard()
    try:
        espnow.Gateway.REMEMBER.write_text(json.dumps({'mod1': board.ip}))       # an address remembered earlier
        r = espnow_hw.stop_all(bridge='http://127.0.0.1:9')
        assert r.ok and 'wifi' in r.message and ('GET', '/api/hold') in board.got
    finally: board.srv.shutdown()
