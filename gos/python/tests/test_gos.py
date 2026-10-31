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


def test_services_say_what_exists():
    with gos.App() as app:
        app.services.advertise('/add', lambda r: r['a'] + r['b'])
        assert app.services.call('/add', {'a': 2, 'b': 3}) == 5
        with pytest.raises(LookupError, match='/add'): app.services.call('/nope')
        with pytest.raises(ValueError): app.services.advertise('/add', print)


def test_parameters_check_types_and_announce_changes():
    with gos.App() as app:
        seen = []
        app.topic('/parameter_events').subscribe(seen.append)
        app.params.declare('gain', 1.0)
        app.params.set('gain', 2)
        assert app.params.get('gain') == 2 and seen == [{'name': 'gain', 'value': 2}]
        with pytest.raises(TypeError): app.params.set('gain', 'high')
        with pytest.raises(KeyError, match='Declare'): app.params.get('other')


def test_lifecycle_follows_the_ros_states():
    with gos.App() as app:
        n = app.node('driver')
        assert n.state == 'unconfigured'
        with pytest.raises(ValueError, match='configure'): n.transition('activate')
        assert n.transition('configure') == 'inactive' and n.transition('activate') == 'active'
        assert n.transition('deactivate') == 'inactive' and n.transition('shutdown') == 'finalized'
        with pytest.raises(ValueError): n.transition('configure')


def test_record_then_play_gives_the_same_messages(tmp_path):
    pytest.importorskip('mcap')
    path = str(tmp_path / 'run.mcap')
    with gos.App() as app:
        app.load_document(CHAIN)
        first = []
        app.topic('/joints').subscribe(first.append)
        rec = app.record(path, topics=('/joints',))
        app.run(seconds=0.1)
        assert rec.close() == 5
    with gos.App() as app:
        again = []
        app.topic('/joints').subscribe(again.append)
        assert app.play(path) == 5
        assert again == first


def test_actions_give_feedback_and_can_be_cancelled():
    import time
    with gos.App() as app:
        def count(goal, feedback, cancelled):
            for i in range(goal['n']):
                if cancelled(): return i
                feedback({'done': i}); time.sleep(0.01)
            return goal['n']
        app.actions.advertise('/count', count)
        seen = []
        h = app.actions.send_goal('/count', {'n': 5}, seen.append).wait(5)
        assert h.status == 'succeeded' and h.result == 5 and len(seen) == 5
        h = app.actions.send_goal('/count', {'n': 1000})
        time.sleep(0.05); h.cancel(); h.wait(5)
        assert h.status == 'canceled' and h.result < 1000
        def broken(goal, feedback, cancelled): raise ValueError('no robot')
        app.actions.advertise('/broken', broken)
        h = app.actions.send_goal('/broken', {}).wait(5)
        assert h.status == 'aborted' and 'no robot' in h.error
        with pytest.raises(LookupError, match='/count'): app.actions.send_goal('/nope', {})


def test_a_service_is_called_from_another_process(tmp_path):
    pytest.importorskip('zenoh')
    server = tmp_path / 's.py'
    server.write_text(textwrap.dedent('''
        import time, gos
        with gos.App(transport='zenoh', listen=['tcp/127.0.0.1:17448']) as app:
            app.services.advertise('/robot/add', lambda r: r['a'] + r['b'])
            def fail(r): raise ValueError('joint J9 is past its limit')
            app.services.advertise('/robot/fail', fail)
            print('READY', flush=True)
            time.sleep(15)
    '''))
    env = dict(os.environ, PYTHONPATH=PY)
    p = subprocess.Popen([sys.executable, str(server)], env=env, stdout=subprocess.PIPE, text=True)
    try:
        assert p.stdout.readline().strip() == 'READY'
        import time
        with gos.App(transport='zenoh', connect=['tcp/127.0.0.1:17448']) as app:
            time.sleep(0.5)
            assert app.services.call('/robot/add', {'a': 2, 'b': 40}) == 42
            with pytest.raises(RuntimeError, match='past its limit'): app.services.call('/robot/fail', {})
            with pytest.raises(LookupError, match='answered'): app.services.call('/robot/none', {}, timeout=1)
    finally:
        p.kill()


def test_transform_graph_reports_a_loop_that_does_not_close():
    with gos.App() as app:
        app.load_document(CHAIN)
        app.set_joints(AB=0.2, BC=0.3, CD=-0.1)
        a, dpos = app.robot.body_position('A'), app.robot.body_position('D')
        exact = app.loop_check('A', 'D')
        assert exact['path'][0] == 'A' and exact['path'][-1] == 'D' and exact['loops'] == []
        # A camera says D sits 5 mm further along than the joint angles say: the gap is reported, not hidden.
        rel = exact['p']
        r = app.loop_check('A', 'D', measured=[('A', 'D', [rel[0] + 0.005, rel[1], rel[2]], exact['q'])])
        assert abs(r['worst_position_m'] - 0.005) < 1e-9


def test_rust_graph_ik_holds_a_ring_and_reaches_on_the_real_module():
    import math
    r = gos.solve_ik(SQUARE, 'C', [0.2 - 0.2 * math.sin(0.3), 0.2 * math.cos(0.3), 0], tolerance=1e-4)
    assert r['reached'] and r['closure_error_m'] < 1e-4, r['message']
    with open(MODULE, encoding='utf-8') as f: raw = json.load(f)
    doc = raw.get('model', raw)
    tip = next(i for i, b in doc['bodies'].items() if b['name'].startswith('EndB'))
    with gos.App() as app:
        app.load_document(doc)
        app.set_joints(**{n: 0.3 * (-1) ** k for k, n in enumerate(app.robot.joints())})
        goal = app.robot.body_position(app.robot.body_names[tip])
    r = gos.solve_ik(doc, tip, goal)
    assert r['reached'] and r['goal_error_m'] < 1e-3, r['message']
    far = gos.solve_ik(doc, tip, [5, 5, 5], iterations=40)
    assert not far['reached'] and 'reach' in far['message']
