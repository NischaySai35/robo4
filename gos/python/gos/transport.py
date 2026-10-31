"""How messages travel, behind one small interface like ROS's rmw: the same calls work inside one process or across processes."""
import fnmatch, json


class LocalTransport:
    """Inside one process. Delivers directly, with no copying and no setup."""
    name = 'local'

    def __init__(self):
        self._subs: dict[str, list] = {}
        self._latched: dict[str, object] = {}

    def publish(self, topic, msg, latched=False):
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

    def close(self):
        self._subs.clear()


class ZenohTransport:
    """Across processes and machines. Localhost-only by default, because this can move real motors."""
    name = 'zenoh'

    def __init__(self, listen=None, connect=None, network=False):
        try:
            import zenoh
        except ImportError as e:
            raise ImportError('The Zenoh transport needs: py -3.12 -m pip install eclipse-zenoh') from e
        cfg = zenoh.Config()
        if not network:
            cfg.insert_json5('scouting/multicast/enabled', 'false')
            cfg.insert_json5('listen/endpoints', json.dumps(listen or []))
            cfg.insert_json5('connect/endpoints', json.dumps(connect or []))
        self._z = zenoh.open(cfg)
        self._pubs, self._subs = {}, []

    @staticmethod
    def _key(topic): return topic.strip('/').replace('*', '**') or '**'

    def publish(self, topic, msg, latched=False):
        key = self._key(topic)
        if key not in self._pubs: self._pubs[key] = self._z.declare_publisher(key)
        self._pubs[key].put(json.dumps(msg) if not isinstance(msg, (bytes, bytearray)) else bytes(msg))

    def subscribe(self, topic, fn):
        def on(sample):
            raw = sample.payload.to_bytes()
            try: fn(json.loads(raw))
            except ValueError: fn(raw)
        s = self._z.declare_subscriber(self._key(topic), on)
        self._subs.append(s)
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

    def close(self):
        self._z.close()


def open_transport(kind='local', **options):
    if kind == 'local': return LocalTransport()
    if kind == 'zenoh': return ZenohTransport(**options)
    raise ValueError(f'Unknown transport "{kind}". Use "local" or "zenoh".')
