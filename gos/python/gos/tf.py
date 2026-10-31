"""Transforms over time, like ROS's tf2: programs broadcast where frames are, a buffer keeps a few seconds of them,
and lookup answers "where is B seen from A at time t", interpolating between samples. The graph search and loop gap
come from the Rust core, so a frame seen by two paths (joints and a camera) reports how far they disagree.

    tf.Broadcaster(app).send('base', 'camera', [0, 0, .3], [0, 0, 0, 1], t=app.now())
    buf = tf.Buffer(app)
    buf.lookup('camera', 'tip', t=1.2)   # {'p', 'q' (xyzw), 'path', 'loops', ...}
"""
import bisect, math, threading

from . import _core
from .physics import GosError

TOPIC = '/tf'


class Broadcaster:
    def __init__(self, app, static=False):
        self.pub = app.topic('/tf_static' if static else TOPIC, latched=static)

    def send(self, parent, child, p, q, t=0.0):
        """Frame child, seen from parent: position p (m) and quaternion q (x, y, z, w), at time t (s)."""
        self.pub.publish({'parent': parent, 'child': child, 'p': [float(x) for x in p], 'q': [float(x) for x in q], 't': float(t)})


def _slerp(a, b, u):
    d = sum(x * y for x, y in zip(a, b))
    if d < 0: b, d = [-x for x in b], -d
    if d > 0.9995:
        r = [x + (y - x) * u for x, y in zip(a, b)]
    else:
        th = math.acos(d); s = math.sin(th)
        r = [(math.sin((1 - u) * th) * x + math.sin(u * th) * y) / s for x, y in zip(a, b)]
    n = math.sqrt(sum(x * x for x in r))
    return [x / n for x in r]


def robot_state_publisher(app, rate=30):
    """Broadcast every body of the loaded robot, seen from its parent, at the app's time, until the returned stop() is called."""
    b, stop = Broadcaster(app), threading.Event()

    def loop():
        while not stop.is_set():
            t = app.now()
            for e in app.body_edges(): b.send(e['parent'], e['child'], e['p'], e['q'], t)
            stop.wait(1 / rate)
    threading.Thread(target=loop, daemon=True).start()
    return stop.set


class Buffer:
    """Keeps `seconds` of every broadcast edge. Static edges never expire."""

    def __init__(self, app, seconds=10.0):
        self.seconds, self.edges, self.static, self._lock = seconds, {}, {}, threading.Lock()
        app.topic(TOPIC).subscribe(self.add)
        app.topic('/tf_static').subscribe(lambda m: self.add(m, static=True))

    def add(self, m, static=False):
        key = (m['parent'], m['child'])
        with self._lock:
            if static: self.static[key] = m; return
            hist = self.edges.setdefault(key, [])
            i = bisect.bisect([h['t'] for h in hist], m['t']); hist.insert(i, m)
            while hist and hist[-1]['t'] - hist[0]['t'] > self.seconds: hist.pop(0)

    def _at(self, key, hist, t):
        ts = [h['t'] for h in hist]
        if t is None: return hist[-1]
        if t < ts[0] - 1e-9 or t > ts[-1] + 1e-9:
            raise GosError(f'{key[0]} to {key[1]} is known from {ts[0]:.3f} s to {ts[-1]:.3f} s, not at {t:.3f} s.')
        i = bisect.bisect_left(ts, t)
        if ts[i] == t or i == 0: return hist[i]
        a, b = hist[i - 1], hist[i]; u = (t - a['t']) / (b['t'] - a['t'])
        return {'parent': key[0], 'child': key[1], 'p': [x + (y - x) * u for x, y in zip(a['p'], b['p'])], 'q': _slerp(a['q'], b['q'], u), 't': t}

    def lookup(self, frm, to, t=None):
        """to seen from frm at time t (newest when None). Says which frames are known when it cannot answer."""
        with self._lock:
            edges = list(self.static.values()) + [self._at(k, h, t) for k, h in self.edges.items() if h]
        frames = sorted({e['parent'] for e in edges} | {e['child'] for e in edges})
        for f in (frm, to):
            if f not in frames: raise GosError(f'No frame "{f}". Frames: {", ".join(frames) or "none yet (is anything broadcasting on /tf?)"}.')
        try:
            return _core.tf_query([{'parent': e['parent'], 'child': e['child'], 'p': e['p'], 'q': e['q']} for e in edges], frm, to)
        except ValueError as e:
            raise GosError(f'{e} Frames known: {", ".join(frames)}.') from None
