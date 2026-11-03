"""A19: how on time a gos.Rate loop is, with and without gos.realtime(), while other programs keep every core busy.

usage: py -3.12 tools/bench/rate_jitter.py [HZ] [SECONDS]      (defaults 1000 Hz, 4 s; runs on Windows, Linux, macOS)
Each case runs in its own process, so the priority one case asks for never leaks into the other.
"""
# REUSE-CHECKED: jitter|Rate bench -> test_rate_keeps_time_and_reports_jitter checks one quiet 200 Hz loop; this measures
# under load and compares realtime() on and off, which a unit test should not spend seconds on.
import multiprocessing as mp, os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'gos', 'python'))
import gos


def busy(stop):
    x = 0
    while not stop.is_set(): x += 1


def loop(hz, seconds, rt, out):
    got = gos.realtime() if rt else {}
    r = gos.Rate(hz)
    for _ in range(int(hz * seconds)): r.sleep()
    out.put((got, r.jitter()))


if __name__ == '__main__':
    hz = int(sys.argv[1]) if len(sys.argv) > 1 else 1000
    seconds = float(sys.argv[2]) if len(sys.argv) > 2 else 4
    stop = mp.Event()
    load = [mp.Process(target=busy, args=(stop,), daemon=True) for _ in range(os.cpu_count() or 2)]
    for p in load: p.start()
    try:
        for rt in (False, True):
            q = mp.Queue(); p = mp.Process(target=loop, args=(hz, seconds, rt, q)); p.start()
            got, j = q.get(); p.join()
            print(f'{"realtime()" if rt else "plain     "}: {hz} Hz, late by median {j["median_ms"]:.3f} ms, 99% under {j["p99_ms"]:.3f} ms, worst {j["worst_ms"]:.3f} ms'
                  + (f'   got {got}' if rt else ''), flush=True)
    finally:
        stop.set()
        for p in load: p.join(2)
