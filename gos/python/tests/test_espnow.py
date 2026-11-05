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


class FakeAir:
    """A pyserial-like port: what the laptop writes reaches a pretend module on `channel`; it can lose frames."""
    def __init__(self, channel=6, loss=0.0, seed=1):
        self.channel, self.tuned, self.loss, self.rng = channel, 1, loss, random.Random(seed)
        self.out, self.buf = queue.Queue(), bytearray()
        self.runs = []                       # requests the module actually ran
        self.done = {}                       # seq -> saved answer (the module keeps only the last)
        self.last_seq, self.last_answer = None, b''
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
            if seq == self.last_seq:                                  # a resend of the request just answered:
                if idx == cnt - 1:                                    # send the saved answer again, never run it twice
                    for f in espnow.frames(espnow.RESP, seq, self.last_answer): self._to_laptop(f)
                return
            whole = self.asm.add(seq, idx, cnt, payload)
            if whole is None: return
            self.runs.append(whole.decode())
            self.counter += 1
            body = json.dumps({'ok': True, 'ran': whole.decode(), 'n': self.counter, 'pad': 'x' * (3000 if 'telemetry' in whole.decode() else 0)})
            answer = b'200\n' + body.encode()
            self.last_seq, self.last_answer = seq, answer
            for f in espnow.frames(espnow.RESP, seq, answer): self._to_laptop(f)

    def _hello(self):
        self.hello_at = time.time()
        self._to_laptop(espnow.frames(espnow.HELLO, 0, f'name=mod1 ip=192.168.137.112 fw=0.1.0 ch={self.channel}'.encode())[0])


def _link(air, **kw):
    link = espnow.EspNowLink(air, **kw)
    end = time.time() + 8
    while not link.alive() and time.time() < end: time.sleep(0.02)
    return link


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
        assert link.channel == 6 and link.find('mod1').ip == '192.168.137.112'
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
    srv = espnow.serve_gateway(link, port=0)
    base = f'http://127.0.0.1:{srv.server_address[1]}'
    try:
        with urllib.request.urlopen(base + '/mod1/api/batch?3=170&speed=5', timeout=3) as r:
            assert r.headers['Access-Control-Allow-Origin'] == '*'
            assert json.loads(r.read())['ran'] == '/api/batch?3=170&speed=5'
        with urllib.request.urlopen(base + '/', timeout=3) as r:
            assert json.loads(r.read())['modules'][0]['name'] == 'mod1'
        with pytest.raises(urllib.error.HTTPError) as e: urllib.request.urlopen(base + '/mod1/api/ota?size=1', timeout=3)
        assert e.value.code == 501
    finally:
        srv.shutdown(); link.close()
