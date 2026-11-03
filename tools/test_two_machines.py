"""B21 check: GOS programs on two machines talk over the network, on the TCP and on the Zenoh transport.

usage: py -3.12 tools/test_two_machines.py                  far side in WSL's Ubuntu (a separate Linux machine with its own address)
       py -3.12 tools/test_two_machines.py serve            on the far machine (any OS); then on this one:
       py -3.12 tools/test_two_machines.py connect HOST     HOST = the far machine's address
The far side answers a topic and a service and says what system it runs on; this side checks both and times round trips.
"""
# REUSE-CHECKED: two machines|network|wsl -> test_gos.py covers several processes on one computer (tcp and zenoh); nothing
# crosses a network. Uses the same gos.App calls.
import os, platform, statistics, subprocess, sys, threading, time
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(ROOT, 'gos', 'python'))
import gos

PORTS = {'tcp': 17470, 'zenoh': 17471}


def options(transport, host, serving):
    port = PORTS[transport]
    if transport == 'tcp': return {'address': f'{"0.0.0.0" if serving else host}:{port}'}
    return {'listen': [f'tcp/0.0.0.0:{port}']} if serving else {'connect': [f'tcp/{host}:{port}']}


def serve():
    apps = []
    for t in PORTS:
        app = gos.App(transport=t, name='far', **options(t, None, True)); apps.append(app)
        me = f'{platform.system()} {platform.release()} on {platform.node()}'
        app.services.advertise('/far/where', lambda r, me=me: me)
        pong = app.topic('/far/pong')
        app.topic('/near/ping').subscribe(lambda m, pong=pong: pong.publish(m))
    print('READY', flush=True)
    try:
        while True: time.sleep(1)
    except KeyboardInterrupt: pass
    finally:
        for a in apps: a.close()


def connect(host):
    bad = []
    for t in PORTS:
        with gos.App(transport=t, **options(t, host, False)) as app:
            got, rtt = {}, []
            ev = threading.Event()
            app.topic('/far/pong').subscribe(lambda m: (got.setdefault(m['i'], time.perf_counter()), ev.set()))
            time.sleep(1.0 if t == 'zenoh' else 0.2)
            where = app.services.call('/far/where', None, timeout=5)
            for i in range(50):
                ev.clear(); t0 = time.perf_counter(); app.topic('/near/ping').publish({'i': i})
                if ev.wait(2): rtt.append((got[i] - t0) * 1000)
            here = f'{platform.system()} {platform.release()} on {platform.node()}'
            ok = len(rtt) >= 48 and where != here  # WSL shares the computer's name, so compare the whole system
            print(f'{"ok  " if ok else "FAIL"} {t:5s}: far side is {where}; {len(rtt)}/50 round trips, median {statistics.median(rtt):.2f} ms, worst {max(rtt):.2f} ms' if rtt else f'FAIL {t}: no replies', flush=True)
            if not ok: bad.append(t)
    return bad


if __name__ == '__main__':
    if sys.argv[1:2] == ['serve']: serve(); sys.exit(0)
    if sys.argv[1:2] == ['connect']: sys.exit(1 if connect(sys.argv[2]) else 0)
    # far side in WSL: its own Linux kernel, network stack and address
    wsl_path = '/mnt/' + ROOT[0].lower() + ROOT[2:].replace('\\', '/')
    py = os.environ.get('WSL_PYTHON', '~/gosenv/bin/python')
    host = subprocess.run(['wsl.exe', '-d', 'Ubuntu', '--', 'hostname', '-I'], capture_output=True, text=True).stdout.replace('\0', '').split()[0]
    subprocess.run(['wsl.exe', '-d', 'Ubuntu', '--', 'pkill', '-f', 'test_two_machines.py serve'], capture_output=True)  # one left from a run just before
    time.sleep(0.5)
    far = subprocess.Popen(['wsl.exe', '-d', 'Ubuntu', '--', 'bash', '-lc', f'cd {wsl_path} && {py} tools/test_two_machines.py serve'], stdout=subprocess.PIPE, text=True)
    try:
        line = far.stdout.readline().replace('\0', '').strip()
        if line != 'READY': sys.exit(f'the far side did not start: {line!r}')
        bad = connect(host)
    finally:
        far.kill(); subprocess.run(['wsl.exe', '-d', 'Ubuntu', '--', 'pkill', '-f', 'test_two_machines.py serve'], capture_output=True)
    print('FAILED: ' + ', '.join(bad) if bad else f'two machines talk: this {platform.system()} and Linux at {host}, on TCP and Zenoh')
    sys.exit(1 if bad else 0)
