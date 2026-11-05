"""How messages travel, behind one small interface like ROS's rmw: the same calls work inside one process or across processes."""
import base64, fnmatch, json, os, time


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


def access_rules(permissions):
    """Zenoh access control from {user: {'publish': keys, 'subscribe': keys, 'call': keys}}: everything not listed is refused."""
    rules, subjects, policies = [], [], []
    for i, (user, p) in enumerate(permissions.items()):
        unknown = set(p) - {'publish', 'subscribe', 'call'}
        if unknown: raise ValueError(f'Permissions for {user}: unknown kind {", ".join(sorted(unknown))}. Kinds: publish, subscribe, call.')
        mine = []
        for kind, messages, flows in (('publish', ['put', 'delete', 'declare_subscriber'], ['ingress', 'egress']),  # egress: the listener's interest must reach the publisher
                                      ('subscribe', ['put', 'delete', 'declare_subscriber'], ['egress', 'ingress']),
                                      ('call', ['query', 'reply', 'declare_queryable'], ['ingress', 'egress'])):
            keys = [k.strip('/') for k in p.get(kind, [])]
            if keys:
                rules.append({'id': f'r{i}{kind}', 'messages': messages, 'flows': flows, 'permission': 'allow', 'key_exprs': keys}); mine.append(f'r{i}{kind}')
        subjects.append({'id': f's{i}', 'usernames': [user]})
        if mine: policies.append({'rules': mine, 'subjects': [f's{i}']})
    return {'enabled': True, 'default_permission': 'deny', 'rules': rules, 'subjects': subjects, 'policies': policies}


class ZenohTransport:
    """Across processes and machines. Localhost-only by default, because this can move real motors."""
    name = 'zenoh'

    def __init__(self, listen=None, connect=None, network=False, user=None, password=None, users_file=None, certs=None, cert_name=None, permissions=None):
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
        # Encryption: certs is a folder from `gos certs new`; endpoints then start with tls/ (see gos/certs.py)
        # Per-user permissions (like SROS2's): {user: {'publish': [...], 'subscribe': [...], 'call': [...]}} as wired keys; the rest is refused
        if permissions: cfg.insert_json5('access_control', json.dumps(access_rules(permissions)))
        if certs:
            from .certs import zenoh_tls
            for k, v in zenoh_tls(certs, cert_name or 'gos').items(): cfg.insert_json5(k, json.dumps(v))
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


BROADCAST = 0xFFFFFFFF  # wire peer id meaning "every peer"


class _PyWire:
    """Sockets in Python's standard library: the fallback when the Rust core is missing. One reader thread per
    connection; every line is written with its own system call. Peer ids as in gos/core/src/net.rs: the hub is 0."""
    forwards = False  # the hub's message rules pass pub lines on themselves

    def __init__(self, address, on_line, on_join, on_leave):
        import socket, threading
        host, port = address.rsplit(':', 1)
        self._on_line, self._on_join, self._on_leave = on_line, on_join, on_leave
        self._socks, self._lock, self._next, self._closed = {}, threading.Lock(), 1, False
        self._srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        # Linux and macOS keep a closed hub's port for a minute, so a restarted hub could not take it back. On Windows
        # this option would let another program share the port, so it stays off there.
        if os.name != 'nt': self._srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            self._srv.bind((host, int(port))); self._srv.listen(); self.hub = True
            threading.Thread(target=self._accept, daemon=True).start()
        except OSError:  # someone already holds the address: they are the hub
            self._srv.close(); self._srv, self.hub = None, False
            s = socket.create_connection((host, int(port)), timeout=5); s.settimeout(None)
            self._add(0, s)

    def _add(self, pid, sock):
        import threading
        with self._lock: self._socks[pid] = (sock, threading.Lock())
        self._on_join(pid)
        threading.Thread(target=self._read, args=(pid, sock), daemon=True).start()

    def _accept(self):
        while not self._closed:
            try: s, _ = self._srv.accept()
            except OSError: return
            with self._lock: pid, self._next = self._next, self._next + 1
            self._add(pid, s)

    def _read(self, pid, sock):
        try:
            for line in sock.makefile('rb'):
                if line.strip(): self._on_line(pid, line)
        except OSError: pass  # a killed program resets the connection instead of closing it
        with self._lock: self._socks.pop(pid, None)
        self._on_leave(pid)

    def send(self, to, data):
        with self._lock: targets = list(self._socks.values()) if to == BROADCAST else [self._socks[to]] if to in self._socks else []
        for sock, lock in targets:
            try:
                with lock: sock.sendall(data + b'\n')
            except OSError: pass

    def wait(self, ev, timeout): return ev.wait(timeout)

    def close(self):
        self._closed = True
        with self._lock: socks = [s for s, _ in self._socks.values()]
        for s in [self._srv] + socks:
            try:
                if s: s.close()
            except OSError: pass


class _RustWire:
    """The same wire in the Rust core (gos/core/src/net.rs, G10 step 2): one writer thread per connection that
    sends everything queued in one go, and the hub passes pub lines on without Python. One Python thread hands the
    lines that arrive to the message rules, a batch at a time."""
    forwards = True

    def __init__(self, address, on_line, on_join, on_leave):
        import threading
        from . import _core
        self._core = _core
        self._h, self.hub = _core.net_open(address)
        self._on = {0: on_line, 1: lambda pid, _: on_join(pid), 2: lambda pid, _: on_leave(pid)}
        self._thread = threading.Thread(target=self._pump, daemon=True); self._thread.start()

    def _dispatch(self, timeout):
        items = self._core.net_recv(self._h, timeout)
        if items is None: return False
        for pid, kind, data in items:
            try: self._on[kind](pid, data)
            except Exception: pass
        return True

    def _pump(self):
        while self._dispatch(0.2): pass

    def send(self, to, data): self._core.net_send(self._h, to, data)

    def wait(self, ev, timeout):
        """A handler running on the dispatch thread that waits for a reply keeps dispatching, or it would wait forever."""
        import threading
        if threading.current_thread() is not self._thread: return ev.wait(timeout)
        end = time.monotonic() + timeout
        while not ev.is_set():
            left = end - time.monotonic()
            if left <= 0 or not self._dispatch(min(left, 0.05)): break
        return ev.is_set()

    def forwarded(self): return self._core.net_forwarded(self._h)

    def close(self): self._core.net_close(self._h)


def _pick_wire():
    """GOS_TCP_WIRE=python or rust chooses; by default the Rust wire when the core has it."""
    want = os.environ.get('GOS_TCP_WIRE', '').lower()
    if want == 'python': return _PyWire
    from . import _core
    if want == 'rust' or _core.has_net(): return _RustWire
    return _PyWire


class TcpTransport:
    """Across processes or machines with nothing to install: JSON lines over TCP.
    The first program to open the address becomes the hub (like ROS 1's master); the others connect to it. The hub
    passes messages on, keeps latched values, routes service calls and knows who is alive. If the hub program stops,
    the others lose each other: start the hub first, or use Zenoh where no single program may be the centre.
    The sockets are in the Rust core when it is there (`wire == 'rust'`), else in Python; the two talk to each other."""
    name = 'tcp'

    def __init__(self, address='127.0.0.1:7450'):
        import threading
        self._lock, self._local, self._latched = threading.RLock(), LocalTransport(), {}
        self._services, self._waiting, self._seen, self._peers, self._late, self._closed = {}, {}, {}, {}, {}, False
        Wire = _pick_wire()
        self.wire = 'rust' if Wire is _RustWire else 'python'
        self._wire = Wire(address, self._line, self._joined, self._left)
        self.hub = self._wire.hub

    # ── wire events ──
    def _joined(self, pid):
        with self._lock: self._peers[pid] = {'seen': {}, 'serves': set()}

    def _left(self, pid):
        with self._lock:  # gone: like a liveliness token, what it offered disappears with it
            p = self._peers.pop(pid, None)
            if p is None: return
            for key, c in p['seen'].items(): self._seen[key] = self._seen.get(key, c) - c
            for name in p['serves']:
                if self._services.get(name) == pid: self._services.pop(name, None)

    def _line(self, pid, raw):
        try: self._on(pid, json.loads(raw))
        except Exception: pass

    def _send(self, pid, frame):
        if pid is None: self._on(None, frame)  # to this program itself (the hub asking its own rules)
        else: self._wire.send(pid, json.dumps(frame).encode())

    @staticmethod
    def _pack(msg): return {'b': base64.b64encode(bytes(msg)).decode()} if isinstance(msg, (bytes, bytearray)) else {'j': msg}

    @staticmethod
    def _unpack(m): return base64.b64decode(m['b']) if 'b' in m else m['j']

    def _on(self, p, f):
        op = f['op']
        if op == 'pub':
            if self.hub:
                if f.get('l'): self._latched[f['t']] = f['m']
                if not self._wire.forwards:
                    data = json.dumps(f).encode()
                    for q in list(self._peers):
                        if q != p: self._wire.send(q, data)
            self._local.publish(f['t'], self._unpack(f['m']))
        elif op == 'sub':  # the hub replays latched values to a late subscriber, to it alone
            for t, m in list(self._latched.items()):
                if fnmatch.fnmatch(t, f['t']): self._send(p, {'op': 'latched', 'id': f['id'], 'm': m})
        elif op == 'latched':
            fn = self._late.get(f['id'])
            if fn: fn(self._unpack(f['m']))
        elif op == 'serve':
            with self._lock:
                self._services[f['n']] = p
                if p in self._peers: self._peers[p]['serves'].add(f['n'])
        elif op == 'req':
            owner = self._services.get(f['n'])
            if self.hub and owner is not None and owner != 'me' and owner != p:
                with self._lock: self._waiting[f['id']] = p if p is not None else 'me'
                self._send(owner, f)
            elif owner == 'me' or (not self.hub and f['n'] in self._mine()):
                self._send(p, self._answer(f))
            else:
                self._send(p, {'op': 'rep', 'id': f['id'], 'ok': False, 'missing': True})
        elif op == 'rep':
            back = self._waiting.pop(f['id'], None)
            if back is not None and back != 'me': self._send(back, f)
            elif back == 'me' or not self.hub:
                ev = self._waiting.get(('event', f['id']))
                if ev: self._waiting[('reply', f['id'])] = f; ev.set()
        elif op == 'ann':
            with self._lock:
                key = (f['k'], f['n'])
                self._seen[key] = self._seen.get(key, 0) + (1 if f['on'] else -1)
                if p in self._peers:
                    seen = self._peers[p]['seen']; seen[key] = seen.get(key, 0) + (1 if f['on'] else -1)
        elif op == 'disc':
            self._send(p, {'op': 'rep', 'id': f['id'], 'ok': True, 'v': self._known(f['k'])})

    def _mine(self): return getattr(self, '_own', {})

    def _answer(self, f):
        try: return {'op': 'rep', 'id': f['id'], 'ok': True, 'v': self._mine()[f['n']](f['p'])}
        except Exception as e: return {'op': 'rep', 'id': f['id'], 'ok': False, 'e': f'{type(e).__name__}: {e}'}

    def _known(self, kind): return sorted({n for (k, n), c in self._seen.items() if k == kind and c > 0})

    def _ask(self, frame, timeout):
        import threading, uuid
        frame['id'] = uuid.uuid4().hex; ev = threading.Event()
        self._waiting[('event', frame['id'])] = ev
        if self.hub: self._waiting[frame['id']] = 'me'
        try:
            if self.hub: self._on(None, frame)
            else: self._send(0, frame)
            if not self._wire.wait(ev, timeout): return None
            return self._waiting.pop(('reply', frame['id']))
        finally:
            self._waiting.pop(('event', frame['id']), None)
            if self.hub: self._waiting.pop(frame['id'], None)

    def _out(self, frame): self._wire.send(BROADCAST if self.hub else 0, json.dumps(frame).encode())

    # ── the transport interface ──
    def publish(self, topic, msg, latched=False, reliable=True):  # TCP is always reliable
        m = self._pack(msg)
        if self.hub and latched: self._latched[topic] = m
        self._out({'op': 'pub', 't': topic, 'm': m, 'l': latched})
        self._local.publish(topic, msg)

    def subscribe(self, topic, fn):
        off = self._local.subscribe(topic, fn)
        if self.hub:
            for t, m in list(self._latched.items()):
                if fnmatch.fnmatch(t, topic): fn(self._unpack(m))
        else:
            import uuid
            token = uuid.uuid4().hex; self._late[token] = fn
            self._send(0, {'op': 'sub', 't': topic, 'id': token})
        return off

    def topics(self): return sorted(set(self._local.topics()) | set(self._latched))

    def serve(self, name, fn):
        self._own = self._mine(); self._own[name] = fn
        if self.hub: self._services[name] = 'me'
        else: self._send(0, {'op': 'serve', 'n': name})
        return lambda: self._own.pop(name, None)

    def request(self, name, payload, timeout=5.0):
        if name in self._mine():
            return self._mine()[name](payload)
        r = self._ask({'op': 'req', 'n': name, 'p': payload}, timeout)
        if r is None or r.get('missing'):
            raise LookupError(f'No service named {name} answered within {timeout} s. Is the process that offers it running and connected?')
        if r['ok']: return r['v']
        raise RuntimeError(f'Service {name} failed: {r["e"]}')

    def announce(self, kind, name):
        key = (kind, name)
        if self.hub:
            with self._lock: self._seen[key] = self._seen.get(key, 0) + 1
            def off():
                with self._lock: self._seen[key] = self._seen.get(key, 1) - 1
            return off
        self._send(0, {'op': 'ann', 'k': kind, 'n': name, 'on': True})
        return lambda: self._send(0, {'op': 'ann', 'k': kind, 'n': name, 'on': False})

    def discover(self, kind, timeout=1.0):
        if self.hub: return self._known(kind)
        r = self._ask({'op': 'disc', 'k': kind}, timeout)
        return r['v'] if r else []

    def close(self):
        self._closed = True
        self._wire.close()


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
    if kind == 'tcp': return TcpTransport(**options)
    raise ValueError(f'Unknown transport "{kind}". Use "local", "tcp" or "zenoh".')
