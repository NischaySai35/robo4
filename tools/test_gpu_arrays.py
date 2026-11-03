"""A24 check: a Warp array on the NVIDIA card passes between two GOS programs without leaving the card.

usage (native Linux with an NVIDIA card):  python tools/test_gpu_arrays.py
Not on WSL: there CUDA says it can share but the other program reads zeros (checked 3 Nov 2026), and GOS refuses.
The sender puts 4 million floats on the card and publishes them; the receiver, another process, reads them, checks
them, writes into the same memory, and the sender sees that write: one buffer, never copied to main memory.
"""
# REUSE-CHECKED: gpu arrays|cuda ipc -> gos/bigdata.py SharedArrays carries the handle (extended there, not copied);
# test_gos.py covers the shared-memory path in one process; CUDA handles only open in another process, so this runs two.
import os, subprocess, sys, threading, time
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(ROOT, 'gos', 'python'))
import gos
import numpy as np
import warp as wp

ADDR = {'address': '127.0.0.1:17480'}
N = 4_000_000


def receiver():
    wp.init()
    with gos.App(transport='tcp', name='receiver', **ADDR) as app:
        done = threading.Event(); reply = app.topic('/gpu/checked')
        def on(a):
            t0 = time.perf_counter()
            ok = a.device.is_cuda and a.shape == (N,) and float(a.numpy()[-1]) == N - 1
            a.fill_(7.0); wp.synchronize_device(a.device)  # write into the sender's memory
            reply.publish({'ok': bool(ok), 'device': str(a.device), 'open_ms': (time.perf_counter() - t0) * 1000}); done.set()
        app.arrays.subscribe('/gpu/points', on)
        print('READY', flush=True)
        done.wait(30); time.sleep(0.3)


if __name__ == '__main__':
    if sys.argv[1:2] == ['receiver']: receiver(); sys.exit(0)
    wp.init()
    dev = wp.get_device('cuda:0')
    if not dev.is_ipc_supported: sys.exit(f'{dev} cannot share memory between programs on this system')
    with gos.App(transport='tcp', name='sender', **ADDR) as app:  # first program: the hub
        got = []; ev = threading.Event()
        app.topic('/gpu/checked').subscribe(lambda m: (got.append(m), ev.set()))
        rx = subprocess.Popen([sys.executable, __file__, 'receiver'], stdout=subprocess.PIPE, text=True)
        try:
            for line in rx.stdout:  # Warp prints its own start-up lines first
                if line.strip() == 'READY': break
            time.sleep(0.3)
            a = wp.array(np.arange(N, dtype=np.float32), device=dev)
            t0 = time.perf_counter(); app.arrays.publish('/gpu/points', a); sent = (time.perf_counter() - t0) * 1000
            assert ev.wait(30), 'no reply from the receiver'
            buf = app.arrays._gpu['/gpu/points']
            seen = float(buf.numpy()[0])
        finally:
            try: rx.wait(10)
            except subprocess.TimeoutExpired: rx.kill()
    m = got[0]
    ok = m['ok'] and seen == 7.0
    print(f'{"ok" if ok else "FAIL"}: {N * 4 / 1e6:.0f} MB on {m["device"]}; publish {sent:.1f} ms, receiver opened and checked it in {m["open_ms"]:.1f} ms; '
          f'the receiver\'s write {"is" if seen == 7.0 else "is NOT"} seen by the sender (same graphics memory)')
    sys.exit(0 if ok else 1)
