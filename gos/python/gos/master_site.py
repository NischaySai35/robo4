"""master.local - one page for the master (the ESP-NOW dongle on the laptop), the laptop side and every module (Nischay 12 Nov
2026): what is connected, how often it dropped and why, warnings / errors, voltages, currents, temperatures, signal strengths,
a live connection map (a mesh: laptop - master - modules - router, and module <-> module where they hear each other), and the
logs of everything kept in rotating files so bulk logs never fill the disk.

The master chip itself never joins a Wi-Fi network (it sits on the modules' radio channel), so this page is served by the
bridge program on the laptop, like mod1.local: http://master.local (hosts file, tools/espnow/install.ps1) = http://127.0.5.1.
REUSE-CHECKED: master|dashboard|status page|log rotation -> espnow.Gateway (status() JSON, Events list of 200, /_events),
the Studio's ESP-TTL Log tab (kept in the browser only), the modules' own pages (one module each). None shows the master,
counts drops or keeps logs on disk; this reads Gateway/EspNowLink state and module replies, it does not re-implement them.
"""
import json, pathlib, re, threading, time, urllib.parse
from http.server import BaseHTTPRequestHandler

PAGE = pathlib.Path(__file__).with_name('master_page.html')
LOG_FILE_MAX = 1_000_000          # bytes per log file before it rotates
LOG_FILES_KEPT = 5                # per source: current + 4 old  -> at most ~5 MB per source
TEL_EVERY_S = 5.0                 # a module's full status this often WHILE the page is open (12 Nov heat: else TEL_IDLE_S)
TEL_IDLE_S = 60.0
LOG_EVERY_S = 60.0                # a module's own log this often
INFO_EVERY_S = 5.0                # the master's own info line this often
UP = re.compile(r'^\[\s*(\d+)\]')


def level_of(text):
    t = text.lower()
    if any(k in t for k in ('error', 'failed', 'e-stop', 'stuck', 'refused', 'link cut', 'overload', 'too hot')): return 'error'
    if any(k in t for k in ('red light', 'not heard', 'offline', 'quiet', 'restarted', 'battery low', 'lost', 'hold', 'no answer by radio', 'disconnected', 'stopped talking', 'switched off')): return 'warn'
    return 'info'


class LogStore:
    """one rotating file per source (master, laptop, mod1, ...): ~/.gos/logs/<src>.log, .1 .. .4 older"""
    def __init__(self, root):
        self.root = pathlib.Path(root); self.root.mkdir(parents=True, exist_ok=True); self.lock = threading.Lock()

    def _path(self, src, k=0):
        return self.root / (f'{src}.log' if k == 0 else f'{src}.log.{k}')

    def add(self, src, text, t=None):
        src = re.sub(r'[^a-z0-9_-]', '_', (src or 'laptop').lower())[:24]
        line = f"{time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(t or time.time()))}\t{level_of(text)}\t{text}\n"
        with self.lock:
            p = self._path(src)
            try:
                if p.exists() and p.stat().st_size > LOG_FILE_MAX:
                    for k in range(LOG_FILES_KEPT - 1, 0, -1):
                        a, b = self._path(src, k - 1), self._path(src, k)
                        if a.exists(): a.replace(b)
                with p.open('a', encoding='utf-8') as f: f.write(line)
            except OSError: pass

    def sources(self):
        return sorted({f.name.split('.log')[0] for f in self.root.glob('*.log*')})

    def read(self, src='all', q='', level='', limit=300, skip=0):
        """newest last; `skip` = how many matching lines (from the newest) to skip, for paging back"""
        srcs = self.sources() if src in ('', 'all') else [src]
        out = []
        for s in srcs:
            for k in range(LOG_FILES_KEPT):
                p = self._path(s, k)
                if not p.exists(): continue
                try: lines = p.read_text(encoding='utf-8', errors='replace').splitlines()
                except OSError: continue
                for ln in lines:
                    parts = ln.split('\t', 2)
                    if len(parts) < 3: continue
                    if level and parts[1] != level: continue
                    if q and q.lower() not in parts[2].lower(): continue
                    out.append({'t': parts[0], 'src': s, 'level': parts[1], 'text': parts[2]})
        out.sort(key=lambda r: r['t'])
        total = len(out)
        end = max(0, total - skip)
        return {'total': total, 'lines': out[max(0, end - limit):end]}

    def clear(self, src='all'):
        with self.lock:
            for s in (self.sources() if src in ('', 'all') else [src]):
                for k in range(LOG_FILES_KEPT):
                    try: self._path(s, k).unlink()
                    except OSError: pass

    def download(self, src='all'):
        return '\n'.join(f"{r['t']}\t{r['src']}\t{r['level']}\t{r['text']}" for r in self.read(src, limit=10**7)['lines'])


class MasterSite:
    def dongle(self):
        link = self.gw.link
        return link.dongle if link and not link.dongle.dead else None

    def cam_status(self):
        d = self.dongle(); now = time.time()
        if not d: return {'ok': False, 'on': False, 'fps': 0}
        times = [t for t in d.cam_times if now - t < 2.0]
        fps = (len(times) - 1) / (times[-1] - times[0]) if len(times) > 2 and times[-1] > times[0] else 0
        return {'ok': True, 'on': bool(d.cam_frame and now - d.cam_at < 2), 'fps': round(fps, 1), 'flash': self.flash,
                'ageS': round(now - d.cam_at, 1) if d.cam_at else None, 'bytes': len(d.cam_frame or b'')}

    def _cam_watch(self):
        """Nobody watching the camera for 15 s (window closed, tab gone): switch it off - it must never run unseen."""
        while True:
            time.sleep(3)
            d = self.dongle()
            if d and d.cam_frame and time.time() - self.cam_viewer > 15:
                d.camera(False); self.logs.add('laptop', 'master camera turned OFF (nobody watching for 15 s)')

    def __init__(self, gw, root=None):
        self.cam_viewer = 0.0
        self.flash = {'mode': 0, 'bright': 30}       # what the page last asked the master's flash LED for
        threading.Thread(target=self._cam_watch, name='master-cam-watch', daemon=True).start()
        self.gw = gw
        self.logs = LogStore(root or (gw.REMEMBER.parent / 'logs'))
        self.tel = {}                 # name -> (time, telemetry dict)
        self.count = {}               # name -> {'connects', 'drops', 'restarts', 'radioErrors', 'last', 'lastAt'}
        self.seen_up = {}             # name -> uptime ms of the newest module log line kept
        self.events_n = 0
        self.info_at = 0.0
        self.started = time.time()
        self.last_client = 0.0
        self.logs.add('laptop', 'bridge started: master.local page up')
        threading.Thread(target=self._loop, name='master-site', daemon=True).start()

    # ── collecting ───────────────────────────────────────────────────────────────────────────────────────────────────────
    def _cnt(self, name):
        return self.count.setdefault(name, {'connects': 0, 'drops': 0, 'restarts': 0, 'radioErrors': 0, 'last': '', 'lastAt': 0})

    def _event(self, e):
        src, text = e.get('source') or 'master', e.get('text') or ''
        is_mod = bool(re.match(r'^mod\d+$', src))
        self.logs.add(src if is_mod else ('master' if src in ('dongle', 'master') else 'laptop' if src == 'laptop' else src), text, e.get('t'))
        if not is_mod: return
        c = self._cnt(src)
        t = text.lower()
        if t.startswith('connected') or 'answers by radio again' in t: c['connects'] += 1; c['last'] = text; c['lastAt'] = e.get('t')
        elif t.startswith('lost the master'): c['drops'] += 1; c['last'] = text; c['lastAt'] = e.get('t')
        elif 'restarted' in t: c['restarts'] += 1; c['last'] = text; c['lastAt'] = e.get('t')
        elif 'no answer by radio' in t: c['radioErrors'] += 1; c['last'] = text; c['lastAt'] = e.get('t')

    def _module_names(self):
        link = self.gw.link
        names = set(self.gw.wifi)
        if link: names |= {m.name for m in list(link.modules.values()) if m.name}
        return sorted(names, key=lambda n: int(re.sub(r'\D', '', n) or 0))

    def _ask(self, name, path, timeout_ok=True):
        try:
            code, data, _ = self.gw.ask(name, path, path, None)
            return data if code == 200 else None
        except Exception: return None

    def _loop(self):
        tel_at, log_at = {}, {}
        while True:
            try:
                for e in self.gw.log.after(self.events_n):
                    self.events_n = max(self.events_n, e['n']); self._event(e)
                link = self.gw.link
                now = time.time()
                if link and not link.dongle.dead and now - self.info_at > INFO_EVERY_S:
                    self.info_at = now
                    try: link.dongle._write('I')       # the reply lands in dongle.info by itself
                    except Exception: pass
                for name in self._module_names():
                    every = TEL_EVERY_S if now - self.last_client < 15 else TEL_IDLE_S     # nobody looking: once a minute
                    if now - tel_at.get(name, self.started) >= every and now - self.tel.get(name, (0, None))[0] >= every:
                        tel_at[name] = now
                        raw = self._ask(name, '/api/telemetry')
                        if raw:
                            try: self.tel[name] = (time.time(), json.loads(raw))
                            except ValueError: pass
                    if now - log_at.get(name, self.started) >= LOG_EVERY_S:      # not at start: only after a minute
                        log_at[name] = now
                        raw = self._ask(name, '/api/log')
                        if raw: self._module_log(name, raw.decode(errors='replace'))
            except Exception as ex:
                self.logs.add('laptop', f'master page collector error: {ex}')
            time.sleep(1.0)

    def _module_log(self, name, text):
        lines = [l for l in text.splitlines() if l.strip()]
        ups = [int(m.group(1)) if (m := UP.match(l)) else -1 for l in lines]
        top = max(ups, default=-1)
        seen = self.seen_up.get(name)
        if seen is not None and top >= 0 and top < seen:
            self.logs.add(name, '──── module restarted (its own log began again) ────'); seen = -1
        seen = -1 if seen is None else seen
        for l, u in zip(lines, ups):
            if u > seen: self.logs.add(name, l)
        if top >= 0: self.seen_up[name] = max(seen, top)

    # ── the page's data ──────────────────────────────────────────────────────────────────────────────────────────────────
    def status(self):
        gw, link, now = self.gw, self.gw.link, time.time()
        info = link.dongle.info if link and not link.dongle.dead else ''
        kv = dict(x.split('=', 1) for x in info.split() if '=' in x)
        mods = {m.name: m for m in list(link.modules.values())} if link else {}
        down = set(gw.__dict__.get('_radio_bad', {}))
        out = []
        for name in self._module_names():
            m = mods.get(name); tt, tel = self.tel.get(name, (0, None))
            heard = m is not None and now - m.seen < 3
            fresh = tel is not None and now - tt < 3 * TEL_EVERY_S
            servos = (tel or {}).get('servos') or []
            amps = [s.get('currentmA') for s in servos if isinstance(s.get('currentmA'), (int, float))]
            volts = [s.get('voltageV') for s in servos if isinstance(s.get('voltageV'), (int, float))]
            temps = [s.get('tempC') for s in servos if isinstance(s.get('tempC'), (int, float))]
            w = (tel or {}).get('wifi') or {}
            out.append({
                'name': name, 'online': heard or fresh, 'heard': heard, 'radioDown': name in down, 'via': gw.via.get(name),
                'radioRssi': m.rssi if m else None, 'radioReq': m.sent if m else 0, 'radioFailed': m.failed if m else 0,
                'radioMs': round(m.last_ms) if m and getattr(m, 'last_ms', None) else None,
                'wifiRssi': w.get('rssi'), 'wifiSsid': w.get('ssid'), 'wifiOn': w.get('connected'), 'ip': (m.ip if m and m.ip not in ('', '-') else gw.wifi.get(name)),
                'volts': max(volts) if volts else (m.battery if m else None), 'mA': sum(amps) if amps else None,
                'servoTempMax': max(temps) if temps else None, 'servos': len(servos), 'servosOn': sum(1 for s in servos if s.get('connected')),
                'chipC': (tel or {}).get('chipC'), 'heap': (tel or {}).get('heap'), 'fw': (tel or {}).get('fw') or (m.fw if m else None),
                'upMs': (tel or {}).get('ms') or (m.up if m else None), 'resetWhy': (tel or {}).get('resetWhy'),
                'espnow': (tel or {}).get('espnow'), 'peers': (tel or {}).get('peers') or [],
                'held': m.held if m else False, 'playing': m.playing if m else False,
                'telAgeS': round(now - tt, 1) if tel else None, **self._cnt(name),
            })
        self.last_client = now
        return {
            't': now,
            'master': {'plugged': bool(link and not link.dongle.dead), 'info': kv, 'raw': info, 'channel': gw.link.channel if link else None,
                       'usbErrors': link.dongle.bad if link else None},
            'laptop': {'bridgeUpS': round(now - self.started), 'logDir': str(self.logs.root), 'logSources': self.logs.sources()},
            'modules': out,
            'events': [dict(e, level=level_of(e.get('text', ''))) for e in gw.log.after(0)][-120:],
        }


def handler(site):
    class H(BaseHTTPRequestHandler):
        def log_message(self, *a): pass

        def _send(self, code, body, ctype='application/json'):
            data = body if isinstance(body, bytes) else body.encode()
            self.send_response(code); self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store'); self.send_header('Access-Control-Allow-Origin', '*'); self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            u = urllib.parse.urlsplit(self.path); q = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}
            try:
                if u.path in ('/', '/index.html'): return self._send(200, PAGE.read_bytes(), 'text/html; charset=utf-8')
                if u.path == '/api/status': return self._send(200, json.dumps(site.status()))
                if u.path == '/api/cam/status': return self._send(200, json.dumps(site.cam_status()))
                if u.path == '/api/cam.jpg':
                    d = site.dongle(); site.cam_viewer = time.time()
                    if not d or not d.cam_frame: return self._send(404, json.dumps({'ok': False, 'error': 'no picture (camera off?)'}))
                    return self._send(200, d.cam_frame, 'image/jpeg')
                if u.path == '/api/cam/stream':              # MJPEG: an <img> shows it live; ends when the camera goes off
                    self.send_response(200); self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=frame')
                    self.send_header('Cache-Control', 'no-store'); self.send_header('Access-Control-Allow-Origin', '*'); self.end_headers()
                    last, idle = 0.0, time.time()
                    while True:
                        d = site.dongle(); site.cam_viewer = time.time()
                        if d and d.cam_frame and d.cam_at != last:
                            last, idle, jpg = d.cam_at, time.time(), d.cam_frame
                            self.wfile.write(b'--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ' + str(len(jpg)).encode()
                                             + b'\r\n\r\n' + jpg + b'\r\n')
                            self.wfile.flush()
                        elif time.time() - idle > 5: return                  # nothing new for 5 s: camera off
                        time.sleep(0.03)
                if u.path == '/api/logs':
                    return self._send(200, json.dumps(site.logs.read(q.get('src', 'all'), q.get('q', ''), q.get('level', ''),
                                                                     min(int(q.get('limit', 300)), 5000), int(q.get('skip', 0)))))
                if u.path == '/api/logs/download':
                    src = q.get('src', 'all')
                    self.send_response(200); body = site.logs.download(src).encode()
                    self.send_header('Content-Type', 'text/plain; charset=utf-8')
                    self.send_header('Content-Disposition', f'attachment; filename="robo4-{src}-logs.txt"')
                    self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body); return
                return self._send(404, json.dumps({'ok': False, 'error': 'not found'}))
            except Exception as e:
                return self._send(500, json.dumps({'ok': False, 'error': str(e)}))

        def do_OPTIONS(self):
            self.send_response(204); self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST'); self.end_headers()

        def do_POST(self):
            u = urllib.parse.urlsplit(self.path); q = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}
            if u.path == '/api/cam':                         # ?on=1|0 - the master's camera (default off)
                d = site.dongle()
                if not d: return self._send(503, json.dumps({'ok': False, 'error': 'master not plugged in'}))
                on = q.get('on') == '1'; d.camera(on); site.cam_viewer = time.time()
                site.logs.add('laptop', f"master camera turned {'ON' if on else 'OFF'}")
                return self._send(200, json.dumps({'ok': True, 'on': on}))
            if u.path == '/api/flash':                       # ?mode=0|1|2 (off, on, blink) &bright=0-100
                d = site.dongle()
                if not d: return self._send(503, json.dumps({'ok': False, 'error': 'master not plugged in'}))
                site.flash = {'mode': int(q.get('mode', 0)), 'bright': int(q.get('bright', site.flash['bright']))}
                d.flash(site.flash['mode'], site.flash['bright'])
                return self._send(200, json.dumps({'ok': True, **site.flash}))
            if u.path == '/api/radio/lr':                    # ?rate=0|1|2 - the master's ESP-NOW speed (test)
                d = site.dongle()
                if not d: return self._send(503, json.dumps({'ok': False, 'error': 'master not plugged in'}))
                d.radio_rate(int(q.get('rate', 0))); return self._send(200, json.dumps({'ok': True}))
            if u.path == '/api/logs/clear':
                site.logs.clear(q.get('src', 'all')); site.logs.add('laptop', f"logs cleared ({q.get('src', 'all')}) from master.local")
                return self._send(200, json.dumps({'ok': True}))
            if u.path == '/api/stop':
                return self._send(200, json.dumps(site.gw.stop_all(q.get('limp') == '1')))
            return self._send(404, json.dumps({'ok': False, 'error': 'not found'}))
    return H
