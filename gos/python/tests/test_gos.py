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



class FakeBoard:
    """Answers like firmware/esp32_multi's web API, records every command, moves nothing."""
    def __init__(self, n=9):
        import http.server, threading
        self.angles = {i + 1: 180.0 for i in range(n)}
        self.homes = {i + 1: 180.0 + i for i in range(n)}
        self.angles.update(self.homes)
        self.calls = []
        board = self
        class H(http.server.BaseHTTPRequestHandler):
            def log_message(self, *a): pass
            def do_GET(self):
                from urllib.parse import urlparse, parse_qs
                u = urlparse(self.path); q = {k: v[0] for k, v in parse_qs(u.query).items()}
                board.calls.append((u.path, q))
                if u.path == '/api/telemetry':
                    body = {'servos': [{'id': i, 'currentAngle': board.angles[i], 'home': board.homes[i]} for i in board.angles]}
                else:
                    if u.path == '/api/batch':
                        for k, v in q.items():
                            if k.isdigit(): board.angles[int(k)] = float(v)
                    body = {'ok': True}
                data = json.dumps(body).encode()
                self.send_response(200); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)
        self.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
        self.url = f'http://127.0.0.1:{self.server.server_address[1]}'
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def batches(self): return [q for p, q in self.calls if p == '/api/batch']


def test_real_robot_is_safe_by_default_and_follows_the_same_script():
    import math
    board = FakeBoard()
    with open(MODULE, encoding='utf-8') as f: raw = json.load(f)
    with gos.App() as app:
        app.load_document(raw.get('model', raw))
        robot = app.attach_robot(board.url)
        names = robot.joints
        assert len(names) == 9
        r = app.move(**{names[2]: 0.2})
        assert r.ok and 'not armed' in r.message and not board.batches(), 'nothing may move before arm()'
        assert not robot.move({names[2]: 0.2}).ok
        assert robot.arm().ok
        r = app.move(**{names[2]: 0.2})
        assert r.ok, r.message
        sent = board.batches()[-1]
        assert float(sent['3']) == pytest.approx(board.homes[3] + math.degrees(0.2), abs=0.01), 'servo 3 = third joint, from its home'
        assert app.robot.joints()[names[2]] == pytest.approx(0.2), 'the simulation follows the same command'
        n = len(board.batches())
        r = robot.move({names[2]: 1.2})
        assert len(board.batches()) - n == r.steps > 1, 'a big jump goes in small steps'
        r = robot.move({names[2]: 99.0})
        assert names[2] in r.data['clamped'], 'commands are clamped to the joint limits'
        read = robot.read()
        assert read[names[2]] == pytest.approx(app.model.jnt_range[2][1], abs=1e-3)
        assert robot.move({'nope': 1}).message.startswith('Unknown joints')
        assert app.stop().ok and not robot.armed
        assert board.calls[-1] == ('/api/command', {'servo': 'all', 'cmd': 'estop'})
        assert not robot.move({names[2]: 0}).ok, 'stop disarms'


def test_an_unreachable_robot_says_what_to_check():
    from gos.hardware import Esp32Robot
    r = Esp32Robot('http://127.0.0.1:9', joints=['a'], timeout=0.2)
    with pytest.raises(gos.GosError, match='powered'): r.arm()
    s = r.stop()
    assert not s.ok and 'Cut the power' in s.message


def test_namespaces_and_remapping_keep_robots_apart():
    with gos.App(namespace='/robot1') as app:
        got, other = [], []
        app.topic('joints').subscribe(got.append)
        app.topic('/robot2/joints').subscribe(other.append)
        app.topic('/robot1/joints').publish({'q': 1})
        assert got == [{'q': 1}] and other == [], 'relative names live in the namespace'
    with gos.App(remap={'/joints': '/arm/joints'}) as app:
        got = []
        app.topic('/arm/joints').subscribe(got.append)
        app.topic('/joints').publish({'q': 2})
        assert got == [{'q': 2}], 'remapping renames a channel without changing code'


def test_content_filter_and_logging():
    with gos.App(name='driver') as app:
        hot = []
        app.topic('/temp').subscribe(hot.append, where=lambda m: m['c'] > 60)
        for c in (40, 70, 55, 80): app.topic('/temp').publish({'c': c})
        assert [m['c'] for m in hot] == [70, 80]
        logs = []
        app.topic('/rosout').subscribe(logs.append)
        log = app.logger(level='warn')
        log.info('started'); log.error('servo 3 hot')
        assert [(l['level'], l['name']) for l in logs] == [('info', 'driver'), ('error', 'driver')]
        with pytest.raises(ValueError, match='Level'): log.log('loud', 'x')


def test_params_actions_and_cli_across_processes(tmp_path):
    pytest.importorskip('zenoh')
    server = tmp_path / 'server.py'
    server.write_text(textwrap.dedent('''
        import time, gos
        with gos.App(transport='zenoh', listen=['tcp/127.0.0.1:17451'], name='arm') as app:
            app.params.declare('speed', 10)
            app.services.advertise('/arm/add', lambda r: r['a'] + r['b'])
            def count(goal, feedback, cancelled):
                for i in range(goal['n']):
                    if cancelled(): return i
                    feedback({'done': i}); time.sleep(0.02)
                return goal['n']
            app.actions.advertise('/arm/count', count)
            pub = app.topic('/arm/state')
            print('READY', flush=True)
            for _ in range(600): pub.publish({'ok': True}); time.sleep(0.05)
    '''))
    env = dict(os.environ, PYTHONPATH=PY)
    p = subprocess.Popen([sys.executable, str(server)], env=env, stdout=subprocess.PIPE, text=True)
    try:
        assert p.stdout.readline().strip() == 'READY'
        import time
        with gos.App(transport='zenoh', connect=['tcp/127.0.0.1:17451']) as app:
            time.sleep(0.5)
            rp = app.remote_params('arm')
            assert rp.get('speed') == 10
            rp.set('speed', 20)
            assert rp.list() == {'speed': 20}
            with pytest.raises(RuntimeError, match='int'): rp.set('speed', 'fast')
            seen = []
            h = app.actions.send_goal('/arm/count', {'n': 5}, seen.append).wait(10)
            assert h.status == 'succeeded' and h.result == 5 and len(seen) == 5
            h = app.actions.send_goal('/arm/count', {'n': 1000}); time.sleep(0.1); h.cancel(); h.wait(10)
            assert h.status == 'canceled'
        cli = lambda *args: subprocess.run([sys.executable, '-m', 'gos', '--connect', 'tcp/127.0.0.1:17451', *args], env=env, capture_output=True, text=True, timeout=60)
        r = cli('topic', 'list'); assert '/arm/state' in r.stdout, r.stdout + r.stderr
        r = cli('service', 'list'); assert '/arm/add' in r.stdout and '_params' not in r.stdout, r.stdout
        r = cli('service', 'call', '/arm/add', '{"a": 2, "b": 3}'); assert r.stdout.strip() == '5', r.stdout + r.stderr
        r = cli('node', 'list'); assert '/arm' in r.stdout, r.stdout
        r = cli('action', 'list'); assert '/arm/count' in r.stdout, r.stdout
        r = cli('param', 'get', 'arm', 'speed'); assert r.stdout.strip() == '20', r.stdout + r.stderr
        r = cli('topic', 'echo', '/arm/state', '--count', '1'); assert '"ok": true' in r.stdout
        r = cli('service', 'call', '/arm/none'); assert r.returncode == 1 and 'gos:' in r.stderr
    finally:
        p.kill()


def test_domains_keep_groups_apart(tmp_path):
    pytest.importorskip('zenoh')
    import time
    with gos.App(transport='zenoh', listen=['tcp/127.0.0.1:17452'], domain=1) as a, \
         gos.App(transport='zenoh', connect=['tcp/127.0.0.1:17452'], domain=2) as b, \
         gos.App(transport='zenoh', connect=['tcp/127.0.0.1:17452'], domain=1) as c:
        got_b, got_c = [], []
        b.topic('/x').subscribe(got_b.append); c.topic('/x').subscribe(got_c.append)
        time.sleep(0.5)
        for _ in range(10): a.topic('/x').publish({'n': 1}); time.sleep(0.03)
        time.sleep(0.3)
        assert got_c and not got_b


def test_launch_starts_and_stops_programs_together(tmp_path):
    (tmp_path / 'a.py').write_text('print("A up", flush=True)\nimport time; time.sleep(30)\n')
    (tmp_path / 'b.py').write_text('print("B done", flush=True)\n')
    (tmp_path / 'launch.json').write_text(json.dumps({'processes': [{'name': 'arm', 'run': 'a.py'}, {'name': 'planner', 'run': 'b.py'}]}))
    env = dict(os.environ, PYTHONPATH=PY)
    import time
    t = time.time()
    r = subprocess.run([sys.executable, '-m', 'gos', 'launch', str(tmp_path / 'launch.json')], env=env, capture_output=True, text=True, timeout=60)
    assert r.returncode == 0 and '[arm] A up' in r.stdout and '[planner] B done' in r.stdout, r.stdout + r.stderr
    assert time.time() - t < 20, 'when one program ends, the others are stopped'


def test_qos_latched_keep_last_and_best_effort():
    pytest.importorskip('zenoh')
    import time
    with gos.App(transport='zenoh', listen=['tcp/127.0.0.1:17453']) as a:
        a.topic('/robot/description', latched=True).publish({'name': 'mod1'})
        fast = a.topic('/robot/imu', reliable=False)
        time.sleep(0.3)
        with gos.App(transport='zenoh', connect=['tcp/127.0.0.1:17453']) as late:
            got = []
            late.topic('/robot/description').subscribe(got.append)
            time.sleep(0.3)
            assert got == [{'name': 'mod1'}], 'a late joiner gets the latched value'
            last3 = late.topic('/robot/imu').history(keep_last=3)
            time.sleep(0.3)
            for i in range(10): fast.publish({'i': i}); time.sleep(0.01)
            time.sleep(0.3)
            assert [m['i'] for m in last3] == [7, 8, 9], 'keep_last keeps only the newest'


def test_sim_clock_is_published_and_followed():
    with gos.App() as app:
        app.load_document(CHAIN)
        follower = []
        app.topic('/clock').subscribe(follower.append)
        app.run(seconds=0.1)
        assert app.now() == pytest.approx(0.1)
        ts = [m['t'] for m in follower]
        assert len(ts) == 5 and ts == sorted(ts) and ts[-1] < app.now(), 'one tick every 10 steps, always moving forward'


def test_service_calls_can_be_watched():
    with gos.App(introspect=True) as app:
        seen = []
        app.topic('/_events/add').subscribe(seen.append)
        app.services.advertise('/add', lambda r: r['a'] + r['b'])
        app.services.call('/add', {'a': 1, 'b': 2})
        assert seen and seen[0]['request'] == {'a': 1, 'b': 2} and seen[0]['response'] == 3


def test_single_executor_runs_callbacks_only_when_spun():
    with gos.App(executor='single') as app:
        got = []
        app.topic('/x').subscribe(got.append)
        app.topic('/x').publish({'n': 1}); app.topic('/x').publish({'n': 2})
        assert got == [], 'nothing runs until spin'
        app.spin(0.1)
        assert [m['n'] for m in got] == [1, 2]


def test_exclusive_group_never_overlaps():
    import threading, time
    with gos.App(executor='multi') as app:
        g = app.executor.group('arm')
        busy, overlaps, done = [0], [0], threading.Event()
        @g
        def slow(m):
            busy[0] += 1
            if busy[0] > 1: overlaps[0] += 1
            time.sleep(0.02); busy[0] -= 1
            if m['n'] == 5: done.set()
        app.topic('/y').subscribe(slow)
        for n in range(6): app.topic('/y').publish({'n': n})
        done.wait(5); time.sleep(0.05)
        assert overlaps[0] == 0


def test_big_arrays_pass_through_shared_memory_and_traces_are_written(tmp_path):
    import numpy as np
    path = str(tmp_path / 'trace.json')
    with gos.App(trace=path) as app:
        got = []
        app.arrays.subscribe('/camera', lambda a: got.append(a.copy()))
        img = np.arange(480 * 640 * 3, dtype=np.uint8).reshape(480, 640, 3)
        app.arrays.publish('/camera', img)
        assert got and np.array_equal(got[0], img)
    events = json.load(open(path))['traceEvents']
    assert any(e['name'].startswith('sub /camera') for e in events)


def test_trajectory_controller_follows_poses_and_can_be_cancelled():
    from gos.control import joint_trajectory_controller
    with gos.App() as app:
        app.load_document(CHAIN)
        act = joint_trajectory_controller(app)
        prog = []
        h = app.actions.send_goal(act, {'names': ['AB', 'BC'], 'points': [{'q': [0.4, -0.2], 't': 0.2}, {'q': [0.0, 0.3], 't': 0.4}]}, lambda f: prog.append(f['progress'])).wait(5)
        assert h.status == 'succeeded', h.error
        j = app.robot.joints()
        assert j['AB'] == pytest.approx(0.0, abs=1e-6) and j['BC'] == pytest.approx(0.3, abs=1e-6)
        assert prog and prog == sorted(prog) and prog[-1] == 1.0
        h = app.actions.send_goal(act, {'names': ['AB'], 'points': [{'q': [1.0], 't': 5}]})
        import time; time.sleep(0.2); h.cancel(); h.wait(5)
        assert h.status == 'canceled' and 0 < app.robot.joints()['AB'] < 0.5
        h = app.actions.send_goal(act, {'names': ['AB'], 'points': [{'q': [1.0], 't': 0.5}, {'q': [0.0], 't': 0.2}]}).wait(5)
        assert h.status == 'aborted' and 'rise' in h.error


def test_composition_runs_parts_in_one_program(tmp_path):
    (tmp_path / 'talker.py').write_text("def start(app):\n    app.topic('/chat').publish({'hi': 1})\n")
    (tmp_path / 'listener.py').write_text("got = []\ndef start(app):\n    app.topic('/chat').subscribe(got.append)\n    return got\n")
    from gos.compose import load_parts
    with gos.App() as app:
        got = load_parts(app, [str(tmp_path / 'listener.py'), str(tmp_path / 'talker.py')])[0]
        assert got == [{'hi': 1}]
        (tmp_path / 'bad.py').write_text('x = 1\n')
        with pytest.raises(AttributeError, match='start'): load_parts(app, [str(tmp_path / 'bad.py')])


def test_password_protected_programs_refuse_strangers(tmp_path):
    pytest.importorskip('zenoh')
    import time
    users = tmp_path / 'users.txt'; users.write_text('robot:s3cret\n')
    with gos.App(transport='zenoh', listen=['tcp/127.0.0.1:17454'], users_file=str(users), user='robot', password='s3cret') as a:
        a.services.advertise('/arm/ping', lambda r: 'pong')
        with gos.App(transport='zenoh', connect=['tcp/127.0.0.1:17454'], user='robot', password='s3cret') as friend:
            time.sleep(0.3)
            assert friend.services.call('/arm/ping', None, timeout=2) == 'pong'
        with gos.App(transport='zenoh', connect=['tcp/127.0.0.1:17454'], user='robot', password='wrong') as stranger:
            time.sleep(0.3)
            with pytest.raises(LookupError): stranger.services.call('/arm/ping', None, timeout=1)


def test_programs_find_each_other_on_the_network_without_addresses():
    pytest.importorskip('zenoh')
    import time
    with gos.App(transport='zenoh', network=True, domain=7) as a, gos.App(transport='zenoh', network=True, domain=7) as b:
        got = []
        b.topic('/hello').subscribe(got.append)
        t = time.time()
        while not got and time.time() - t < 8:
            a.topic('/hello').publish({'from': 'a'}); time.sleep(0.2)
        assert got, 'multicast discovery found the other program'


def test_rate_keeps_time_and_reports_jitter():
    import time
    r = gos.Rate(200)
    t = time.perf_counter()
    for _ in range(100): r.sleep()
    took = time.perf_counter() - t
    j = r.jitter()
    print('200 Hz loop jitter on this machine:', {k: round(v, 3) for k, v in j.items()})
    assert 0.45 < took < 0.6 and j['median_ms'] < 1.0


def test_new_package_runs_and_passes_its_own_test(tmp_path):
    env = dict(os.environ, PYTHONPATH=PY)
    r = subprocess.run([sys.executable, '-m', 'gos', 'pkg', 'new', 'arm-driver'], cwd=tmp_path, env=env, capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stderr
    pkg = tmp_path / 'arm-driver'
    r = subprocess.run([sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', str(pkg)], cwd=pkg, env=env, capture_output=True, text=True, timeout=60)
    assert '1 passed' in r.stdout, r.stdout + r.stderr
    r = subprocess.run([sys.executable, '-m', 'gos', 'pkg', 'new', 'arm-driver'], cwd=tmp_path, env=env, capture_output=True, text=True, timeout=60)
    assert r.returncode == 1 and 'already exists' in r.stderr
    r = subprocess.run([sys.executable, '-m', 'gos', 'doc', 'gos.App'], env=env, capture_output=True, text=True, timeout=60)
    assert 'attach_robot' in r.stdout and 'lock' in r.stdout
