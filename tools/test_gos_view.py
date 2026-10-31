"""GOS G5 check: gos.view() opens the packaged app as a 3D view only, and Python drives it.

usage: py -3.12 tools/test_gos_view.py [APP.exe]   (default: studio/release2 build)
"""
import json, os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'gos', 'python'))
import gos
from gos.studio import view

ROOT = os.path.join(os.path.dirname(__file__), '..')
exe = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'studio', 'release2', 'win-unpacked', 'TETROBOT-Demo-NischaySai.exe')
doc = json.load(open(os.path.join(ROOT, 'studio', 'src', 'core', 'factory', 'single-module-demo.json'), encoding='utf-8'))
bad = []
t = time.perf_counter()
link = view(port=18773, app=exe, timeout=60)
print(f'ok   app opened as a view and connected in {time.perf_counter() - t:.1f} s')
try:
    r = link.show(doc); print(('ok   ' if r.ok else 'FAIL ') + 'robot shown', r.message); r.ok or bad.append('show')
    names = None
    with gos.App() as app:
        app.load_document(doc); names = list(app.robot.joints())
    for k in range(40):
        link.joints(names, [0.4] * len(names)); time.sleep(1 / 30)
    time.sleep(1)
    r = link.read()
    moved = all(abs(v - 0.4) < 1e-6 for _, v in r.data['joints'])
    print(('ok   ' if moved else 'FAIL ') + 'the view follows Python', f"VSEPR {r.data['vsepr']}"); moved or bad.append('joints')
    r = link.run('page.msrr')
    print(('ok   ' if r.ok else 'FAIL ') + 'commands still run in view mode', r.message); r.ok or bad.append('run')
finally:
    link.close()
time.sleep(2)
gone = link.process.poll() is not None
print(('ok   ' if gone else 'FAIL ') + 'closing the link closes the app'); gone or bad.append('close')
print('FAILED: ' + ', '.join(bad) if bad else 'a script opens, drives and closes the app as a view')
sys.exit(1 if bad else 0)
