"""When callbacks run (ROS executors) and how long they take (tracing).

Without an executor a callback runs as soon as its message arrives, on the transport's thread.
With Executor('single') nothing runs until the script calls app.spin(), and then one at a time, in order:
simple and safe, like ROS's SingleThreadedExecutor. Executor('multi', threads=N) runs up to N at once; callbacks in
the same exclusive group never overlap, like ROS's mutually exclusive callback groups.
"""
import json, queue, threading, time


class Executor:
    def __init__(self, kind='single', threads=4):
        if kind not in ('single', 'multi'): raise ValueError('Executor kind is "single" or "multi".')
        self.kind, self.q = kind, queue.Queue()
        self._groups: dict[str, threading.Lock] = {}
        self._pool = None
        if kind == 'multi':
            self._pool = [threading.Thread(target=self._worker, daemon=True) for _ in range(threads)]
            for t in self._pool: t.start()

    def group(self, name):
        """A mutually exclusive group: wrap callbacks with it so no two of them run at the same time."""
        lock = self._groups.setdefault(name, threading.Lock())
        def wrap(fn):
            def guarded(*a):
                with lock: return fn(*a)
            return guarded
        return wrap

    def put(self, fn, args): self.q.put((fn, args))

    def _worker(self):
        while True:
            fn, args = self.q.get()
            try: fn(*args)
            except Exception as e: print(f'callback failed: {e}', flush=True)

    def spin_once(self, timeout=0.0):
        """Run the next waiting callback, if any. Single executor only."""
        if self.kind != 'single': raise RuntimeError('A multi executor runs callbacks by itself; spin_once is for "single".')
        try: fn, args = self.q.get(timeout=timeout) if timeout else self.q.get_nowait()
        except queue.Empty: return False
        fn(*args); return True

    def spin(self, seconds):
        end = time.time() + seconds
        while time.time() < end: self.spin_once(timeout=min(0.05, max(0.0, end - time.time())))


class Rate:
    """A loop at a fixed rate, like ROS's Rate, that measures how late each tick was. On Windows and macOS this
    is soft real time; hard real time belongs on the ESP32 or real-time Linux (RESTRUCTURING 10.2)."""
    def __init__(self, hz):
        self.period, self.next, self.late = 1.0 / hz, time.perf_counter(), []

    def sleep(self):
        self.next += self.period
        while True:
            left = self.next - time.perf_counter()
            if left <= 0: break
            time.sleep(left if left > 0.002 else 0)   # sleep coarsely, then spin the last 2 ms for accuracy
        self.late.append(time.perf_counter() - self.next)

    def jitter(self):
        """Lateness of the ticks in milliseconds: median, 99th percentile and worst."""
        s = sorted(self.late)
        if not s: return {}
        return {'median_ms': s[len(s) // 2] * 1000, 'p99_ms': s[int(len(s) * 0.99)] * 1000, 'worst_ms': s[-1] * 1000}


class Tracer:
    """Records how long every callback took, in Chrome's trace format: open it at ui.perfetto.dev."""
    def __init__(self, path): self.path, self.events, self._lock = path, [], threading.Lock()

    def record(self, name, t0_ns, t1_ns):
        with self._lock:
            self.events.append({'name': name, 'ph': 'X', 'ts': t0_ns / 1000, 'dur': (t1_ns - t0_ns) / 1000, 'pid': 1, 'tid': threading.get_ident() % 100000})

    def save(self):
        with open(self.path, 'w', encoding='utf-8') as f: json.dump({'traceEvents': self.events}, f)
        return len(self.events)
