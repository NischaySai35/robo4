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


LOCK_TURN_S = 0.0005  # Python's lock passes between busy threads this often (Python's own default: every 5 ms)


class Rate:
    """A loop at a fixed rate, like ROS's Rate, that measures how late each tick was. On Windows and macOS this
    is soft real time; hard real time belongs on the ESP32 or real-time Linux (RESTRUCTURING 10.2).

    spin: the last part of each wait, in seconds, is spent checking the clock instead of sleeping. Measured on
    Windows at 1000 Hz (6 Nov 2026): 0.0005 (default) ticks 0.12 ms late at the 99th percentile for half a core;
    0 sleeps all the way, 0.3-0.8 ms late, for 1 % of a core (enough for 16-100 Hz robot loops); 0.002 is 0.01 ms
    late but takes a whole core.

    A Rate also makes Python's lock change hands every 0.5 ms instead of 5: measured, a busy Python thread in the
    same program made the loop 7.9 ms late (16 ms at the 99th percentile); with the shorter turn, 0.1 ms. This is
    Python's lock, not the timer, so moving the wait into Rust would not help (G10 step 4)."""
    def __init__(self, hz, spin=0.0005):
        import collections, sys
        self.period, self.spin, self.next = 1.0 / hz, spin, time.perf_counter()
        self.late = collections.deque(maxlen=100_000)  # the latest ticks, so a long loop does not grow without end
        if sys.getswitchinterval() > LOCK_TURN_S: sys.setswitchinterval(LOCK_TURN_S)

    def sleep(self):
        self.next += self.period
        while True:
            left = self.next - time.perf_counter()
            if left <= 0: break
            time.sleep(left - self.spin if left > self.spin else 0)   # sleep, then spin the last bit for accuracy
        self.late.append(time.perf_counter() - self.next)

    def jitter(self):
        """Lateness of the ticks in milliseconds: median, 99th percentile and worst."""
        s = sorted(self.late)
        if not s: return {}
        return {'median_ms': s[len(s) // 2] * 1000, 'p99_ms': s[int(len(s) * 0.99)] * 1000, 'worst_ms': s[-1] * 1000}


def realtime(priority=80, cpu=None, lock_memory=True, freeze_gc=True):
    """Ask the system to treat this program as real time, as far as it allows, before a Rate loop. Returns what it got.

    Linux: the SCHED_FIFO scheduler at `priority` (needs root or CAP_SYS_NICE; otherwise the highest nice level it may
    take), memory locked so it is never swapped out, and whether the kernel has the real-time patch (PREEMPT_RT).
    Windows: 1 ms timer resolution and the high priority class. macOS: none, it says so.
    Everywhere: pin to `cpu` if given, and move Python's existing objects out of the garbage collector's way.
    """
    import gc, os, platform, ctypes
    got = {'system': platform.system()}
    if cpu is not None:
        if hasattr(os, 'sched_setaffinity'): os.sched_setaffinity(0, {cpu}); got['cpu'] = cpu
        else: got['cpu'] = 'not offered here'
    if got['system'] == 'Linux':
        try:
            os.sched_setscheduler(0, os.SCHED_FIFO, os.sched_param(priority)); got['priority'] = f'SCHED_FIFO {priority}'
        except PermissionError:
            try: os.nice(-20); got['priority'] = 'nice -20 (SCHED_FIFO needs root or CAP_SYS_NICE)'
            except PermissionError: got['priority'] = 'normal (SCHED_FIFO needs root or CAP_SYS_NICE)'
        if lock_memory:
            got['memory_locked'] = ctypes.CDLL(None, use_errno=True).mlockall(3) == 0  # MCL_CURRENT | MCL_FUTURE; needs a high enough `ulimit -l`
        rt = 'PREEMPT_RT' in platform.uname().version or os.path.exists('/sys/kernel/realtime')
        got['kernel'] = 'PREEMPT_RT' if rt else 'not real time (no PREEMPT_RT)'
    elif got['system'] == 'Windows':
        k = ctypes.windll.kernel32
        k.GetCurrentProcess.restype = ctypes.c_void_p; k.SetPriorityClass.argtypes = (ctypes.c_void_p, ctypes.c_uint32)  # a handle is 64-bit
        ctypes.windll.winmm.timeBeginPeriod(1)
        got['priority'] = 'high' if k.SetPriorityClass(k.GetCurrentProcess(), 0x80) else 'normal'  # HIGH_PRIORITY_CLASS
    else:
        got['priority'] = 'normal (not offered on this system)'
    if freeze_gc:
        gc.collect(); gc.freeze(); got['gc'] = 'frozen'
    import sys
    if sys.getswitchinterval() > LOCK_TURN_S: sys.setswitchinterval(LOCK_TURN_S)
    got['lock_turn_ms'] = sys.getswitchinterval() * 1000
    return got


class Tracer:
    """Records how long every callback took, in Chrome's trace format: open it at ui.perfetto.dev."""
    def __init__(self, path): self.path, self.events, self._lock = path, [], threading.Lock()

    def record(self, name, t0_ns, t1_ns):
        with self._lock:
            self.events.append({'name': name, 'ph': 'X', 'ts': t0_ns / 1000, 'dur': (t1_ns - t0_ns) / 1000, 'pid': 1, 'tid': threading.get_ident() % 100000})

    def save(self):
        with open(self.path, 'w', encoding='utf-8') as f: json.dump({'traceEvents': self.events}, f)
        return len(self.events)
