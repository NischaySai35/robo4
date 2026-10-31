"""How messages travel, behind one small interface like ROS's rmw: the same calls work inside one process or across processes."""
import fnmatch, json, time


class LocalTransport:
    """Inside one process. Delivers directly, with no copying and no setup."""
    name = 'local'

    def __init__(self):
        self._subs: dict[str, list] = {}
        self._latched: dict[str, object] = {}

    def publish(self, topic, msg, latched=False, reliable=True):
        if latched: self._latched[topic] = msg
        for pattern, fns in list(self._subs.items()):
            if fnmatch.fnmatch(topic, pattern):
                for fn in list(fns): fn(msg)

    def subscribe(self, topic, fn):
        self._subs.setdefault(topic, []).append(fn)
        if topic in self._latched: fn(self._latched[topic])
        return lambda: self._subs[topic].remove(fn)

    def topics(self):
        return sorted(set(self._subs) | set(self._latched))

    def serve(self, name, fn):
        self._services = getattr(self, '_services', {})
        self._services[name] = fn
        return lambda: self._services.pop(name, None)

    def request(self, name, payload, timeout=5.0):
        fn = getattr(self, '_services', {}).get(name)
        if fn is None: raise LookupError(f'No service named {name} in this process.')
        return fn(payload)

    def announce(self, kind, name):
        self._seen = getattr(self, '_seen', set()); self._seen.add((kind, name))
        return lambda: self._seen.discard((kind, name))

    def discover(self, kind, timeout=1.0):
        return sorted({n for k, n in getattr(self, '_seen', set()) if k == kind})

    def close(self):
        self._subs.clear()


class ZenohTransport:
    """Across processes and machines. Localhost-only by default, because this can move real motors."""
    name = 'zenoh'

    def __init__(self, listen=None, connect=None, network=False, user=None, password=None, users_file=None):
        try:
            import zenoh
        except ImportError as e:
            raise ImportError('The Zenoh transport needs: py -3.12 -m pip install eclipse-zenoh') from e
        cfg = zenoh.Config()
        if not network:
            cfg.insert_json5('scouting/multicast/enabled', 'false')
        # network=True: programs on the local network find each other by themselves (multicast scouting)
        if listen: cfg.insert_json5('listen/endpoints', json.dumps(listen))
        if connect: cfg.insert_json5('connect/endpoints', json.dumps(connect))
        # Passwords: a program offering users_file (lines "user:password") accepts only those users;
        # a connecting program gives user and password. Without them, nothing connects to a protected program.
        if user: cfg.insert_json5('transport/auth/usrpwd/user', json.dumps(user))
        if password: cfg.insert_json5('transport/auth/usrpwd/password', json.dumps(password))
        if users_file: cfg.insert_json5('transport/auth/usrpwd/dictionary_file', json.dumps(users_file))
        self._z = zenoh.open(cfg)
        self._pubs, self._subs = {}, []

    @staticmethod
    def _key(topic): return topic.strip('/').replace('*', '**') or '**'

    def publish(self, topic, msg, latched=False, reliable=True):
        import zenoh
        key = self._key(topic)
        if key not in self._pubs:
            # reliable=False is ROS's best effort: under load, old samples are dropped instead of slowing the sender
            self._pubs[key] = self._z.declare_publisher(key, reliability=zenoh.Reliability.RELIABLE if reliable else zenoh.Reliability.BEST_EFFORT,
                                                         congestion_control=zenoh.CongestionControl.BLOCK if reliable else zenoh.CongestionControl.DROP)
        data = json.dumps(msg) if not isinstance(msg, (bytes, bytearray)) else bytes(msg)
        if latched:
            if not hasattr(self, '_latched'): self._latched = {}
            if key not in self._latched:
                self._subs.append(self._z.declare_queryable(f'goslatch/{key}', lambda q, key=key: q.reply(q.key_expr, self._latched[key])))
            self._latched[key] = data
        self._pubs[key].put(data)

    def subscribe(self, topic, fn):
        def on(sample):
            raw = sample.payload.to_bytes()
            try: fn(json.loads(raw))
            except ValueError: fn(raw)
        key = self._key(topic)
        s = self._z.declare_subscriber(key, on)
        self._subs.append(s)
        # Like ROS's transient local: a subscriber that starts late still gets the last latched value.
        for r in self._z.get(f'goslatch/{key}', timeout=0.3):
            if r.ok is not None: on(r.ok)
        return s.undeclare

    def topics(self):
        return sorted('/' + k for k in self._pubs)

    def serve(self, name, fn):
        """Answer requests from any process: a Zenoh queryable. Errors go back to the caller as text."""
        def on(query):
            try:
                req = json.loads(query.payload.to_bytes()) if query.payload is not None else None
                reply = {'ok': True, 'value': fn(req)}
            except Exception as e:
                reply = {'ok': False, 'error': f'{type(e).__name__}: {e}'}
            query.reply(query.key_expr, json.dumps(reply))
        q = self._z.declare_queryable(self._key(name), on)
        self._subs.append(q)
        return q.undeclare

    def request(self, name, payload, timeout=5.0):
        replies = list(self._z.get(self._key(name), payload=json.dumps(payload), timeout=timeout))
        for r in replies:
            if r.ok is not None:
                out = json.loads(r.ok.payload.to_bytes())
                if out['ok']: return out['value']
                raise RuntimeError(f'Service {name} failed: {out["error"]}')
        raise LookupError(f'No service named {name} answered within {timeout} s. Is the process that offers it running and connected?')

    def announce(self, kind, name):
        """A liveliness token: other processes see it while this one runs, and it vanishes if this one dies."""
        t = self._z.liveliness().declare_token(f'gosls/{kind}/{self._key(name)}')
        self._subs.append(t)
        return t.undeclare

    def discover(self, kind, timeout=1.0):
        out = set()
        for r in self._z.liveliness().get(f'gosls/{kind}/**', timeout=timeout):
            if r.ok is not None: out.add('/' + str(r.ok.key_expr).split('/', 2)[2])
        return sorted(out)

    def close(self):
        self._z.close()


class NamedBus:
    """Names, like ROS: namespaces, remapping and domains, applied in one place so every part obeys them.

    - "joints" (relative) becomes /<namespace>/joints; "/joints" (absolute) stays as is.
    - remap={'/joints': '/arm/joints'} renames a channel without touching code.
    - domain=N keeps whole groups apart: two domains never hear each other.
    """

    def __init__(self, raw, namespace='/', remap=None, domain=0):
        self.raw, self.remap, self.domain = raw, dict(remap or {}), int(domain)
        self.introspect = False   # when True, every service call is also published on /_events<service>
        self.executor = None      # when set, callbacks are queued and run by the executor instead of at once
        self.tracer = None
        self.namespace = '/' + namespace.strip('/') if namespace.strip('/') else ''
        self.name = getattr(raw, 'name', 'local')

    def resolve(self, name):
        name = self.remap.get(name, name)
        if not name.startswith('/'): name = f'{self.namespace}/{name}'
        return '/' + '/'.join(p for p in name.split('/') if p)

    def _wire(self, name): return f'/d{self.domain}{self.resolve(name)}'
    def _unwire(self, wired): return wired[len(f'/d{self.domain}'):] if wired.startswith(f'/d{self.domain}/') else None

    def publish(self, topic, msg, latched=False, reliable=True):
        if not hasattr(self, '_pub_seen'): self._pub_seen = set()
        if topic not in self._pub_seen: self._pub_seen.add(topic); self.raw.announce('topic', self._wire(topic))
        self.raw.publish(self._wire(topic), msg, latched, reliable)

    def subscribe(self, topic, fn, where=None):
        """where: a test on each message; only messages that pass reach fn (ROS content filtering)."""
        handler = fn if where is None else (lambda m: fn(m) if where(m) else None)
        handler = self._wrap(f'sub {topic}', handler)
        undo = self.raw.subscribe(self._wire(topic), handler)
        self.raw.announce('topic', self._wire(topic))
        return undo

    def serve(self, name, fn):
        def answered(req, fn=fn):
            t = time.time()
            try:
                rep = fn(req)
            except Exception as e:
                if self.introspect: self.raw.publish(self._wire(f'/_events{self.resolve(name)}'), {'t': t, 'request': req, 'error': str(e)})
                raise
            if self.introspect: self.raw.publish(self._wire(f'/_events{self.resolve(name)}'), {'t': t, 'request': req, 'response': rep})
            return rep
        undo = self.raw.serve(self._wire(name), self._wrap(f'srv {name}', answered, queue=False))
        token = self.raw.announce('service', self._wire(name))
        return lambda: (undo(), token())

    def request(self, name, payload, timeout=5.0):
        return self.raw.request(self._wire(name), payload, timeout)

    def announce(self, kind, name): return self.raw.announce(kind, self._wire(name))

    def _wrap(self, label, fn, queue=True):
        """Timing for traces, and the executor queue. Service handlers answer at once, since the caller is waiting."""
        def run(*a):
            if self.tracer is None: return fn(*a)
            t0 = time.perf_counter_ns()
            try: return fn(*a)
            finally: self.tracer.record(label, t0, time.perf_counter_ns())
        if not queue: return run
        return lambda *a: self.executor.put(run, a) if self.executor is not None else run(*a)

    def discover(self, kind, timeout=1.0):
        return sorted(n for n in (self._unwire(w) for w in self.raw.discover(kind, timeout)) if n)

    def topics(self): return self.discover('topic')

    def close(self): self.raw.close()


def open_transport(kind='local', **options):
    if kind == 'local': return LocalTransport()
    if kind == 'zenoh': return ZenohTransport(**options)
    raise ValueError(f'Unknown transport "{kind}". Use "local" or "zenoh".')
