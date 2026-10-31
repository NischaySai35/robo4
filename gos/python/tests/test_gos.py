"""GOS with no window: run with py -3.12 -m pytest gos/python/tests from the repo root.

Run through the real physics and the real Rust core, nothing mocked. test_real_module uses your real CAD meshes.
"""
import json, os, subprocess, sys, textwrap
import pytest
import gos

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
PY = os.path.join(REPO, 'gos', 'python')
MODULE = os.path.join(REPO, 'studio', 'src', 'core', 'factory', 'single-module-demo.json')


def body(i, x, y=0): return {'kind': 'body', 'id': i, 'name': i, 'transform': {'position': [x, y, 0]}, 'visual': {'geometry': {'type': 'box', 'size': [.1, .1, .1]}}}
def joint(i, kind, p, c, ox, oy=0): return {'kind': 'joint', 'id': i, 'name': i, 'type': kind, 'parentBodyId': p, 'childBodyId': c, 'axis': [0, 0, 1], 'origin': {'position': [ox, oy, 0]}, 'childRest': {'position': [0, 0, 0]}, 'limit': {'lower': -1, 'upper': 1}, 'state': {'value': 0}}
def by(items): return {e['id']: e for e in items}

SQUARE = {'name': 'square', 'bodies': by([body('A', 0), body('B', .2), body('C', .2, .2), body('D', 0, .2)]),
          'joints': by([joint('AB', 'revolute', 'A', 'B', .2), joint('BC', 'revolute', 'B', 'C', 0, .2), joint('CD', 'revolute', 'C', 'D', -.2), joint('DA', 'revolute', 'D', 'A', 0, -.2)])}
CHAIN = {'name': 'chain', 'bodies': by([body(b, i * .2) for i, b in enumerate('ABCD')]),
         'joints': by([joint(a + b, 'revolute', a, b, .2) for a, b in ('AB', 'BC', 'CD')])}


def test_core_finds_the_loop_in_a_ring():
    with gos.App() as app:
        app.load_document(SQUARE)
        g = app.graph()
    assert g['parts'] and len(g['parts']) == 1


def test_export_keeps_loop_as_constraints():
    out = gos.export_mjcf(SQUARE, 'square')
    assert '<equality>' in out['xml'] and out['xml'].count('<connect') == 2


def test_opens_runs_closes_with_no_window():
    with gos.App(headless=True) as app:
        robot = app.load_document(CHAIN)
        seen = []
        app.topic('/joints').subscribe(seen.append)
        r = app.run(seconds=0.1)
        assert r.ok and r.steps == 50 and len(seen) == 5
        assert seen[-1]['names'] == list(robot.joints())
    assert app.model is None, 'close must release the simulation'


def test_lock_and_unlock_while_running_keep_the_pose_and_hold():
    with gos.App() as app:
        app.load_document(CHAIN)
        app.set_joints(AB=0.3, BC=-0.4, CD=0.2)
        before = dict(app.robot.joints())
        r = app.lock('D', 'A')
        assert r.ok and r.ms < 50, 'the 10.8 budget for a topology change'
        assert app.robot.joints() == pytest.approx(before), 'a lock must not jump the joints'
        app.data.qvel[:] = 1.0
        app.run(seconds=1)
        assert app.closure_error() < 0.002, 'the lock must hold under motion'
        assert not app.lock('D', 'A').ok, 'locking twice is reported'
        assert app.unlock('D', 'A').ok
        assert not app.unlock('D', 'A').ok, 'unlocking twice is reported'
        app.data.qvel[:] = 1.0
        q0 = app.robot.joints()['CD']
        app.run(seconds=0.2)
        assert app.robot.joints()['CD'] != pytest.approx(q0), 'free again after unlock'


def test_graph_events_are_published():
    with gos.App() as app:
        app.load_document(CHAIN)
        events = []
        app.topic('/graph/events').subscribe(lambda m: events.append(m['event']))
        app.lock('D', 'A'); app.unlock('D', 'A')
    assert events == ['loaded', 'lock', 'unlock']


def test_errors_say_what_to_do():
    with gos.App() as app:
        with pytest.raises(gos.GosError, match='app.load'): app.run(seconds=1)
        with pytest.raises(gos.GosError, match='No file'): app.load('nope.json')
        app.load_document(CHAIN)
        with pytest.raises(gos.GosError, match='Bodies:'): app.lock('A', 'nothing')
        with pytest.raises(gos.GosError, match='Joints:'): app.set_joints(nope=1)
    with pytest.raises(gos.GosError, match='headless'): gos.App(headless=False)
    with pytest.raises(ValueError): gos.compile_graph({'bodies': 1})


def test_real_module_from_your_cad():
    with open(MODULE, encoding='utf-8') as f: raw = json.load(f)
    with gos.App() as app:
        robot = app.load_document(raw.get('model', raw))
        assert app.model.nbody - 1 == 10 and app.model.nv == 9
        assert app.run(seconds=0.1).ok
        assert app.closure_error() == 0


def test_ik_reports_both_errors_and_holds_a_ring():
    pytest.importorskip('mink')
    with gos.App() as app:
        app.load_document(SQUARE)
        p = app.robot.body_position('C')
        r = app.robot.ik('C', [p[0] - .02, p[1] + .01, p[2]])
        assert r.closure_error_m < 0.005
        assert r.goal_error_m is not None and isinstance(r.ok, bool)


def test_cli_runs_a_script_with_no_window(tmp_path):
    script = tmp_path / 'demo.py'
    doc = tmp_path / 'robot.json'
    doc.write_text(json.dumps(CHAIN))
    script.write_text(textwrap.dedent(f'''
        import gos
        with gos.App(headless=True) as app:
            app.load({str(doc)!r})
            print('RAN', app.run(seconds=0.05).steps)
    '''))
    env = dict(os.environ, PYTHONPATH=PY)
    r = subprocess.run([sys.executable, '-m', 'gos', 'run', str(script)], env=env, capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stderr
    assert 'RAN 25' in r.stdout
    r = subprocess.run([sys.executable, '-m', 'gos', 'graph', 'show', str(doc)], env=env, capture_output=True, text=True, timeout=60)
    assert r.returncode == 0 and json.loads(r.stdout)['tree']
    r = subprocess.run([sys.executable, '-m', 'gos', 'sim', 'missing.json'], env=env, capture_output=True, text=True, timeout=60)
    assert r.returncode == 1 and 'No file' in r.stderr, 'errors reach the terminal without a traceback'


def test_two_processes_exchange_a_topic_over_zenoh(tmp_path):
    pytest.importorskip('zenoh')
    listener = tmp_path / 'l.py'
    listener.write_text(textwrap.dedent('''
        import time, gos
        with gos.App(transport='zenoh', listen=['tcp/127.0.0.1:17447']) as app:
            got = []
            app.topic('/robot/ping').subscribe(got.append)
            print('READY', flush=True)
            t = time.time()
            while not got and time.time() - t < 15: time.sleep(.02)
            print('GOT', got[0]['n'] if got else None, flush=True)
    '''))
    env = dict(os.environ, PYTHONPATH=PY)
    p = subprocess.Popen([sys.executable, str(listener)], env=env, stdout=subprocess.PIPE, text=True)
    assert p.stdout.readline().strip() == 'READY'
    import time
    with gos.App(transport='zenoh', connect=['tcp/127.0.0.1:17447']) as app:
        time.sleep(0.5)
        for _ in range(20):
            app.topic('/robot/ping').publish({'n': 7}); time.sleep(.05)
    out = p.communicate(timeout=20)[0]
    assert 'GOT 7' in out
