"""The ROS-style basics on any transport: services, parameters, node lifecycle and recording.

These work in one process today. Over the network, topics work, and services and parameters are still to come (GOS_PARITY.md).
"""
import json, time

LIFECYCLE = {'unconfigured': {'configure': 'inactive'}, 'inactive': {'activate': 'active', 'cleanup': 'unconfigured'},
             'active': {'deactivate': 'inactive'}}


class Services:
    """Request and reply. Over Zenoh another process can call them; in one process they are a direct call."""

    def __init__(self, bus): self._s, self._bus = {}, bus

    def advertise(self, name, fn):
        if name in self._s: raise ValueError(f'Service {name} already exists.')
        self._s[name] = self._bus.serve(name, fn)
        return lambda: self._s.pop(name, lambda: None)()

    def call(self, name, request=None, timeout=5.0):
        try:
            return self._bus.request(name, request, timeout)
        except LookupError as e:
            raise LookupError(f'{e} Services here: {", ".join(sorted(self._s)) or "none"}.') from None

    def list(self): return sorted(self._s)


class Actions:
    """Long jobs with progress and cancel, like ROS actions, in one process or across processes.

    A server function gets the goal, a feedback function and a cancelled() check, and returns the result.
    Under the hood: services <name>/_goal, /_cancel, /_result and the topic <name>/_feedback.
    """

    def __init__(self, bus): self._bus, self._servers = bus, {}

    def advertise(self, name, fn):
        if name in self._servers: raise ValueError(f'Action {name} already exists.')
        import threading, uuid
        goals = {}
        def start(req):
            gid, goal = req['id'], req['goal']  # the caller picks the id, so it can listen for feedback before the job starts
            g = goals[gid] = {'status': 'running', 'result': None, 'error': None, 'cancel': threading.Event()}
            def feedback(msg): self._bus.publish(f'{name}/_feedback', {'goal': gid, **msg})
            def work():
                try:
                    g['result'] = fn(goal, feedback, g['cancel'].is_set)
                    g['status'] = 'canceled' if g['cancel'].is_set() else 'succeeded'
                except Exception as e:
                    g['status'], g['error'] = 'aborted', f'{type(e).__name__}: {e}'
            threading.Thread(target=work, daemon=True).start()
            return gid
        def cancel(req): goals[req['goal']]['cancel'].set(); return True
        def result(req):
            g = goals.get(req['goal'])
            if g is None: raise LookupError(f'No goal {req["goal"]} on action {name}.')
            return {k: g[k] for k in ('status', 'result', 'error')}
        self._servers[name] = [self._bus.serve(f'{name}/_goal', start), self._bus.serve(f'{name}/_cancel', cancel), self._bus.serve(f'{name}/_result', result)]
        self._bus.announce('action', name)

    def send_goal(self, name, goal, on_feedback=None, timeout=5.0):
        import uuid
        h = GoalHandle(self._bus, name, uuid.uuid4().hex[:12], on_feedback)
        try:
            self._bus.request(f'{name}/_goal', {'id': h.goal, 'goal': goal}, timeout)
        except LookupError:
            h.close()
            raise LookupError(f'No action named {name}. Actions: {", ".join(self._bus.discover("action")) or "none"}.') from None
        return h


class GoalHandle:
    def __init__(self, bus, name, gid, on_feedback):
        self._bus, self.name, self.goal = bus, name, gid
        self.status, self.result, self.error = 'running', None, None
        self._unsub = bus.subscribe(f'{name}/_feedback', lambda m: on_feedback({k: v for k, v in m.items() if k != 'goal'}), where=lambda m: m.get('goal') == gid) if on_feedback else None

    def cancel(self): self._bus.request(f'{self.name}/_cancel', {'goal': self.goal})

    def poll(self):
        r = self._bus.request(f'{self.name}/_result', {'goal': self.goal})
        self.status, self.result, self.error = r['status'], r['result'], r['error']
        return self.status

    def wait(self, timeout=None):
        end = None if timeout is None else time.time() + timeout
        while self.poll() == 'running':
            if end and time.time() > end: raise TimeoutError(f'Action {self.name} is still running after {timeout} s.')
            time.sleep(0.02)
        self.close()
        return self

    def close(self):
        if self._unsub: self._unsub(); self._unsub = None


class Parameters:
    """Named values with a type check, and a /parameter_events topic like ROS. Other processes reach them
    through the services <node>/_params/get, /set and /list (see remote())."""

    def __init__(self, bus, node='gos'):
        self._v, self._bus, self.node = {}, bus, node
        bus.serve(f'/{node}/_params/get', lambda r: self.get(r['name']))
        bus.serve(f'/{node}/_params/set', lambda r: self.set(r['name'], r['value']) or True)
        bus.serve(f'/{node}/_params/list', lambda r: self.list())
        bus.announce('node', f'/{node}')

    @staticmethod
    def remote(bus, node, timeout=5.0):
        """Another process's parameters, by its node name."""
        call = lambda op, req: bus.request(f'/{node.strip("/")}/_params/{op}', req, timeout)
        class Remote:
            def get(self, name): return call('get', {'name': name})
            def set(self, name, value): return call('set', {'name': name, 'value': value})
            def list(self): return call('list', {})
        return Remote()

    def declare(self, name, default):
        self._v.setdefault(name, default)
        return self._v[name]

    def get(self, name):
        if name not in self._v: raise KeyError(f'No parameter named {name}. Declare it first.')
        return self._v[name]

    def set(self, name, value):
        old = self.get(name)
        if old is not None and type(value) is not type(old) and not (isinstance(old, float) and isinstance(value, int)):
            raise TypeError(f'Parameter {name} is {type(old).__name__}, not {type(value).__name__}.')
        self._v[name] = value
        self._bus.publish('/parameter_events', {'name': name, 'value': value})

    def list(self): return dict(self._v)


LEVELS = {'debug': 10, 'info': 20, 'warn': 30, 'error': 40}


class Logger:
    """Messages from every program in one stream (/rosout, like ROS), and printed here from a chosen level up."""

    def __init__(self, bus, name, level='info'):
        self._bus, self.name, self.level = bus, name, level

    def log(self, level, msg):
        if level not in LEVELS: raise ValueError(f'Level {level}: use one of {", ".join(LEVELS)}.')
        self._bus.publish('/rosout', {'t': time.time(), 'level': level, 'name': self.name, 'msg': str(msg)})
        if LEVELS[level] >= LEVELS[self.level]:
            import sys
            print(f'[{level.upper()}] [{self.name}] {msg}', file=sys.stderr, flush=True)

    def debug(self, m): self.log('debug', m)
    def info(self, m): self.log('info', m)
    def warn(self, m): self.log('warn', m)
    def error(self, m): self.log('error', m)


class Node:
    """A named part with ROS's lifecycle. A transition that isn't allowed says which ones are."""

    def __init__(self, bus, name): self.name, self.state, self._bus = name, 'unconfigured', bus

    def transition(self, how):
        allowed = LIFECYCLE.get(self.state, {})
        if how == 'shutdown': self.state = 'finalized'
        elif how in allowed: self.state = allowed[how]
        else: raise ValueError(f'Node {self.name} is {self.state}: it can {", ".join([*allowed, "shutdown"]) if self.state != "finalized" else "do nothing more"}, not {how}.')
        self._bus.publish(f'/{self.name}/transition_event', {'state': self.state})
        return self.state


class Recorder:
    """Writes every message on chosen topics to an MCAP file, an open format other robot tools can read."""

    def __init__(self, bus, path, topics):
        try:
            from mcap.writer import Writer
        except ImportError as e:
            raise ImportError('Recording needs: py -3.12 -m pip install mcap') from e
        self._f = open(path, 'wb')
        self._w = Writer(self._f)
        self._w.start(profile='', library='gos')
        schema = self._w.register_schema(name='json', encoding='jsonschema', data=b'{}')
        self._unsub, self._ch, self.count, self.path = [], {}, 0, path
        for t in topics:
            self._ch[t] = self._w.register_channel(topic=t, message_encoding='json', schema_id=schema)
            self._unsub.append(bus.subscribe(t, self._write(t)))

    def _write(self, t):
        def on(msg):
            now = time.time_ns()
            self._w.add_message(channel_id=self._ch[t], log_time=now, publish_time=now, data=json.dumps(msg).encode())
            self.count += 1
        return on

    def close(self):
        if self._f.closed: return self.count  # the app closes what a script left open, and closing twice is fine
        for u in self._unsub: u()
        self._w.finish()
        self._f.close()
        return self.count


def play(path, bus):
    """Publish a recording again on a transport, in order. Returns how many messages were sent."""
    try:
        from mcap.reader import make_reader
    except ImportError as e:
        raise ImportError('Playback needs: py -3.12 -m pip install mcap') from e
    n = 0
    with open(path, 'rb') as f:
        for _, channel, message in make_reader(f).iter_messages():
            bus.publish(channel.topic, json.loads(message.data))
            n += 1
    return n
