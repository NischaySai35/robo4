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
    """Long jobs with progress and cancel, like ROS actions. The server function gets the goal,
    a feedback function and a cancelled() check, and returns the result."""

    def __init__(self, bus): self._bus, self._servers, self._n = bus, {}, 0

    def advertise(self, name, fn):
        if name in self._servers: raise ValueError(f'Action {name} already exists.')
        self._servers[name] = fn

    def send_goal(self, name, goal, on_feedback=None):
        if name not in self._servers:
            raise LookupError(f'No action named {name}. Actions: {", ".join(sorted(self._servers)) or "none"}.')
        self._n += 1
        return GoalHandle(self._bus, name, self._n, self._servers[name], goal, on_feedback)


class GoalHandle:
    def __init__(self, bus, name, gid, fn, goal, on_feedback):
        import threading
        self.status, self.result, self.error, self._cancel = 'running', None, None, threading.Event()
        topic = f'{name}/feedback'
        def feedback(msg):
            bus.publish(topic, {'goal': gid, **msg})
            if on_feedback: on_feedback(msg)
        def work():
            try:
                self.result = fn(goal, feedback, self._cancel.is_set)
                self.status = 'canceled' if self._cancel.is_set() else 'succeeded'
            except Exception as e:
                self.status, self.error = 'aborted', f'{type(e).__name__}: {e}'
        self._t = threading.Thread(target=work, daemon=True)
        self._t.start()

    def cancel(self): self._cancel.set()

    def wait(self, timeout=None):
        self._t.join(timeout)
        if self._t.is_alive(): raise TimeoutError('The action is still running.')
        return self


class Parameters:
    """Named values with a type check, and a /parameter_events topic like ROS."""

    def __init__(self, bus): self._v, self._bus = {}, bus

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
