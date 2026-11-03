"""G10 step 1, measure first: how fast GOS moves messages today, so every Rust step shows its gain.

usage: py -3.12 tools/bench/gos_messaging.py [local|tcp|zenoh ...]    (default: all three; about 30 s)
For each carrier: messages per second one way (a burst of small messages, and of 9-joint states) and the
there-and-back time (median and 99th percentile) through a second program that echoes. Prints one line per result
and a JSON line at the end to paste into docs/design/g10-fast-core.md.
"""
# REUSE-CHECKED: messaging bench -> tools/test_two_machines.py times 50 round trips across machines (not throughput,
# not in-process); tools/bench/rate_jitter.py times loops. This measures the message path itself on one computer.
import json, os, statistics, subprocess, sys, threading, time
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'gos', 'python'))
import gos

OPTS = {'tcp': {'address': '127.0.0.1:17460'}, 'zenoh': {'listen': ['tcp/127.0.0.1:17461']}}
FAR = {'tcp': {'address': '127.0.0.1:17460'}, 'zenoh': {'connect': ['tcp/127.0.0.1:17461']}}
SMALL = {'i': 0}
STATE = {'header': {'stamp': 0.0, 'frame_id': 'mod1'}, 'name': [f'J{i}' for i in range(9)], 'position': [0.1 * i for i in range(9)], 'velocity': [], 'effort': []}


def echo(kind):
    with gos.App(transport=kind, name='echo', **FAR[kind]) as app:
        back = app.topic('/bench/back')
        app.topic('/bench/out').subscribe(back.publish)
        print('READY', flush=True)
        time.sleep(60)


def burst(app, msg, n):
    got, done = [0], threading.Event()
    def on(m):
        got[0] += 1
        if got[0] == n: done.set()
    app.topic('/bench/burst').subscribe(on)
    time.sleep(0.3)
    t0 = time.perf_counter()
    pub = app.topic('/bench/burst')
    for _ in range(n): pub.publish(msg)
    done.wait(30)
    return got[0] / (time.perf_counter() - t0)


def roundtrips(app, msg, n):
    ev, times = threading.Event(), []
    app.topic('/bench/back').subscribe(lambda m: ev.set())
    out = app.topic('/bench/out')
    time.sleep(0.5 if app else 0)
    for _ in range(n):
        ev.clear(); t0 = time.perf_counter(); out.publish(msg)
        if ev.wait(2): times.append((time.perf_counter() - t0) * 1e6)
    times.sort()
    return statistics.median(times), times[int(len(times) * 0.99) - 1], len(times)


def run(kind):
    res = {}
    if kind == 'local':
        with gos.App(name='bench') as app:
            res['small_per_s'] = burst(app, SMALL, 50000)
            app.topic('/bench/out').subscribe(app.topic('/bench/back').publish)  # echo in the same program
            res['rtt_us'] = roundtrips(app, SMALL, 2000)[:2]
            res['state_per_s'] = burst(app, STATE, 20000)
        return res
    with gos.App(transport=kind, name='bench', **OPTS[kind]) as app:
        far = subprocess.Popen([sys.executable, __file__, 'echo', kind], stdout=subprocess.PIPE, text=True)
        try:
            for line in far.stdout:
                if line.strip() == 'READY': break
            res['small_per_s'] = burst(app, SMALL, 20000)
            res['state_per_s'] = burst(app, STATE, 10000)
            med, p99, n = roundtrips(app, SMALL, 1000)
            res['rtt_us'] = (med, p99)
        finally:
            far.kill()
    return res


if __name__ == '__main__':
    if sys.argv[1:2] == ['echo']: echo(sys.argv[2]); sys.exit(0)
    kinds = sys.argv[1:] or ['local', 'tcp', 'zenoh']
    allres = {}
    for k in kinds:
        r = allres[k] = run(k)
        print(f'{k:6s}: {r["small_per_s"]:9.0f} small msgs/s   {r["state_per_s"]:9.0f} joint states/s   there-and-back median {r["rtt_us"][0]:7.0f} us, 99% under {r["rtt_us"][1]:7.0f} us', flush=True)
    print(json.dumps({k: {a: (round(b) if isinstance(b, float) else [round(x) for x in b]) for a, b in v.items()} for k, v in allres.items()}))
