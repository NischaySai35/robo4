"""G7 check: gos/runtime_dist on its own, as an installed app uses it. No system Python on PATH, data in a temp folder, its own port.

usage: py -3.12 tools/test_runtime.py        (first: py -3.12 gos/build_runtime.py)
"""
import json, os, shutil, subprocess, sys, tempfile, time, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RT = os.path.join(ROOT, 'gos', 'runtime_dist')
PY = os.path.join(RT, 'python.exe') if os.name == 'nt' else os.path.join(RT, 'bin', 'python3')
PORT = '8797'  # not 8771: another copy may be running
work = tempfile.mkdtemp(prefix='gos_rt_')
env = {k: v for k, v in os.environ.items() if k not in ('PYTHONPATH', 'VIRTUAL_ENV')}
env['PATH'] = os.environ.get('SystemRoot', r'C:\Windows') + r'\System32' if os.name == 'nt' else '/usr/bin:/bin'
bad = []


def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + (f': {detail}' if detail else ''), flush=True)
    if not ok: bad.append(name)


data = os.path.join(work, 'data')
shutil.copytree(os.path.join(RT, 'seed_data'), data)
os.makedirs(os.path.join(data, 'logs'), exist_ok=True)
shutil.copy(os.path.join(ROOT, 'studio', 'src', 'core', 'factory', 'single-module-demo.json'), os.path.join(work, 'robot.json'))
launcher = [os.environ.get('ComSpec', 'cmd'), '/c', os.path.join(RT, 'gos.cmd')] if os.name == 'nt' else [os.path.join(RT, 'gos')]
r = subprocess.run([*launcher, 'sim', 'robot.json', '--seconds', '0.1'], cwd=work, env=env, capture_output=True, text=True, timeout=60)
check('the gos command runs a robot with no system Python', r.returncode == 0 and 'Ran 50 steps' in r.stdout, (r.stdout + r.stderr)[-200:])

log = open(os.path.join(work, 'service.log'), 'w')
svc = subprocess.Popen([PY, os.path.join(RT, 'sim', 'verify_service.py')], cwd=os.path.join(RT, 'sim'), stdout=log, stderr=log, env={**env, 'VERIFY_PORT': PORT, 'TETROBOT_DATA': data})
try:
    health = None
    for _ in range(120):
        try:
            health = json.load(urllib.request.urlopen(f'http://127.0.0.1:{PORT}/health', timeout=1)); break
        except OSError:
            if svc.poll() is not None: break
            time.sleep(0.5)
    check('the physics service starts from the runtime', health is not None, str(health)[:160])
    check('it runs from the runtime, not this project', bool(health) and os.path.abspath(health.get('sim', '')).lower().startswith(RT.lower()), str((health or {}).get('sim')))
finally:
    svc.kill(); svc.wait(); log.close()
tail = open(os.path.join(work, 'service.log'), errors='replace').read()[-500:]
check('the service reported no import errors', 'Error' not in tail, tail[-250:] if 'Error' in tail else '')
total = sum(os.path.getsize(os.path.join(d, x)) for d, _, fs in os.walk(RT) for x in fs)
print(f'runtime size {total / 1e6:.0f} MB')
shutil.rmtree(work, ignore_errors=True)
print('FAILED: ' + ', '.join(bad) if bad else 'the runtime works on its own')
sys.exit(1 if bad else 0)
