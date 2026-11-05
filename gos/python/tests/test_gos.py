"""GOS with no window: run with py -3.12 -m pytest gos/python/tests from the repo root.

Run through the real physics and the real Rust core, nothing mocked. test_real_module uses your real CAD meshes.
"""
import json, math, os, subprocess, sys, textwrap
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


def test_the_real_module_weighs_what_the_cad_says_and_its_servos_hold_and_move():
    with open(MODULE, encoding='utf-8') as f: raw = json.load(f)
    doc = raw.get('model', raw)
    cad = sum(b['inertial']['mass'] for b in doc['bodies'].values())
    with gos.App() as app:
        app.load_document(doc)
        assert float(app.model.body_mass.sum()) == pytest.approx(cad, rel=1e-4), 'every part carries its CAD mass'
        rotor = [i for i in range(app.model.nbody) if app.model.body(i).name == 'L1_LockRotor_A'][0]
        assert float(app.model.body_mass[rotor]) == pytest.approx(0.00953, rel=1e-3)
        assert len(app.servos()) == 9 and float(app.model.actuator_forcerange[0, 1]) == pytest.approx(2.7)
        app.set_joints(J_B3_bend=0.2)
        app.run(seconds=0.5)
        assert app.robot.joints()['J_L2_lock'] == pytest.approx(0, abs=0.02), 'a light lock rotor stays put (motor inertia)'
        app.set_targets(J_T2_twist=0.5)
        app.run(seconds=1.0)
        assert app.robot.joints()['J_T2_twist'] == pytest.approx(0.5, abs=0.035), 'the servo turns the joint to its target'
        with pytest.raises(gos.GosError, match='no servo'): app.set_targets(nothing=1)
    with gos.App() as app:
        app.load_document(CHAIN); assert app.servos() == [], 'joints without a motor profile stay free'


def test_ik_reports_both_errors_and_holds_a_ring():
    pytest.importorskip('mink')
    with gos.App() as app:
        app.load_document(SQUARE)
        p = app.robot.body_position('C')
        r = app.robot.ik('C', [p[0] - .02, p[1] + .01, p[2]])
        assert r.closure_error_m < 0.005
        assert r.goal_error_m is not None and isinstance(r.ok, bool)


def test_path_entry_adds_removes_and_keeps_the_rest():
    from gos.__main__ import path_entry
    sep, x, y, g = os.pathsep, 'first', 'second', os.path.join('apps', 'gos')
    start = sep.join([x, y])
    added = path_entry(start, g, True)
    assert added == sep.join([x, y, g]) and path_entry(added, g, True) == added, 'adding twice changes nothing'
    assert path_entry(added, g, False) == start, 'removing restores what was there'
    assert path_entry('', g, True) == g


def test_engine_plug_in_point_and_rewind():
    from gos import physics
    with pytest.raises(gos.GosError, match='Engines: mujoco'):
        with gos.App(engine='nope') as app: app.load_document(CHAIN)

    class Fake(physics.Engine):
        name, timestep, time = 'fake', 0.01, 0.0
        def open(self, path): self.q = {'j': 0.0}
        def step(self): self.time += self.timestep; self.q['j'] += 1
        def joint_names(self): return list(self.q)
        def joint_values(self): return dict(self.q)
        def set_joint(self, name, value):
            if name not in self.q: raise self._no_joint(name)
            self.q[name] = value
        def body_position(self, name): return [self.q['j'], 0, 0]
        def snapshot(self): return dict(t=self.time, q=dict(self.q))
        def restore(self, s): self.time, self.q = s['t'], dict(s['q'])
    physics.register('fake', Fake)
    with gos.App(engine='fake') as app:
        app.load_document(CHAIN)
        assert app.run(steps=20, cache=True).steps == 20 and app.robot.joints()['j'] == 20
        assert app.seek(0.1).t == pytest.approx(0.1) and app.robot.joints()['j'] == 10
        with pytest.raises(gos.GosError, match='needs the MuJoCo engine'): app.lock('A', 'B')
        with pytest.raises(gos.GosError, match='Joints: j'): app.set_joints(x=1)
        app.set_joints(j=5)
        with pytest.raises(gos.GosError, match='Nothing cached'): app.seek(0)
    with gos.App() as app:
        app.load_document(CHAIN)
        name = list(app.robot.joints())[0]
        app.set_joints(**{name: 0.4})
        app.run(seconds=0.2, cache=True); first = app.robot.joints()[name]
        app.seek(0.1)
        app.run(seconds=0.1); assert app.robot.joints()[name] == pytest.approx(first, abs=1e-9), 'running on from a rewind replays the same physics'


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


def test_same_code_in_one_program_and_across_programs(tmp_path):
    from gos.testing import collect, wait_until, GosTimeout
    pytest.importorskip('zenoh')
    def part(app):  # a user's part: answers every /in with /out
        app.topic('/in').subscribe(lambda m: app.topic('/out').publish({'n': m['n'] * 2}))
    for options in ({'transport': 'local'}, {'transport': 'zenoh', 'listen': ['tcp/127.0.0.1:17493']}):
        with gos.App(**options) as app:
            part(app); got = collect(app, '/out')
            import time; time.sleep(0.3)
            app.topic('/in').publish({'n': 4})
            wait_until(lambda: got == [{'n': 8}], f'/out over {options["transport"]}')
    # and the same part answering another program
    other = tmp_path / 'other.py'
    other.write_text(textwrap.dedent('''
        import time, gos
        with gos.App(transport='zenoh', connect=['tcp/127.0.0.1:17494']) as app:
            app.topic('/in').subscribe(lambda m: app.topic('/out').publish({'n': m['n'] * 2}))
            print('READY', flush=True); time.sleep(8)
    '''))
    with gos.App(transport='zenoh', listen=['tcp/127.0.0.1:17494']) as app:
        p = subprocess.Popen([sys.executable, str(other)], env=dict(os.environ, PYTHONPATH=PY), stdout=subprocess.PIPE, text=True)
        try:
            assert p.stdout.readline().strip() == 'READY'
            got = collect(app, '/out'); import time; time.sleep(0.5)
            app.topic('/in').publish({'n': 5})
            wait_until(lambda: {'n': 10} in got, '/out from the other program')
        finally:
            p.kill()
        with pytest.raises(GosTimeout, match='Waited 0.1 s for nothing'):
            wait_until(lambda: False, 'nothing', timeout=0.1)


def test_message_types_are_checked_and_generated(tmp_path):
    from gos import interfaces
    t = interfaces.load()
    assert {'JointState', 'Header', 'Lock_Request', 'Lock_Response', 'FollowPoses_Goal', 'FollowPoses_Feedback'} <= set(t.types)
    good = {'header': {'stamp': 1.5, 'frame_id': 'base'}, 'name': ['a'], 'position': [0.1], 'velocity': [0.0], 'effort': [0.0]}
    assert t.problems('JointState', good) == []
    bad = dict(good, position=['x'], extra=1); del bad['effort']
    p = ' '.join(t.problems('JointState', bad))
    assert 'position[0] must be a number' in p and 'extra is not a field' in p and 'effort is missing' in p
    assert 'header.frame_id must be text' in ' '.join(t.problems('JointState', dict(good, header={'stamp': 0, 'frame_id': 3})))
    with gos.App() as app:
        topic = app.topic('/joint_states', type='JointState')
        topic.publish(good)
        with pytest.raises(gos.GosError, match='Not a valid JointState: position'): topic.publish(dict(good, position=None))
        with pytest.raises(gos.GosError, match='Types: FollowPoses'): app.topic('/x', type='Nope')
    # a user's ROS-style folder, with a package prefix and a constant
    (tmp_path / 'Battery.msg').write_text('uint8 FULL=100\nstd_msgs/Header header\nfloat32 volts\nuint8[3] cells\n')
    t2 = interfaces.load(str(tmp_path))
    assert t2.problems('Battery', {'header': good['header'], 'volts': 7.4, 'cells': [1, 2]}) == ['cells must have 3 items, not 2.']
    (tmp_path / 'Broken.msg').write_text('Missing thing\n')
    with pytest.raises(gos.GosError, match='not loaded'): interfaces.load(str(tmp_path))
    # the Studio's copy is generated from these files and must be current
    studio_ts = os.path.join(REPO, 'studio', 'src', 'runtime', 'gosTypes.generated.ts')
    assert open(studio_ts, encoding='utf-8').read() == t.to_ts(), 'run: python -m gos interfaces ts studio/src/runtime/gosTypes.generated.ts'


def test_studio_install_picks_the_right_installer_for_each_computer():
    from gos.studio import pick_installer
    assets = [{'name': n} for n in ['latest.yml', 'T-1.0.4-arm64.dmg', 'T-1.0.4-arm64.dmg.blockmap', 'T-1.0.4-x64.dmg', 'T-1.0.4-amd64.deb',
                                    'T-1.0.4-x86_64.AppImage', 'T-Setup-1.0.4.exe', 'T-Setup-1.0.4.exe.blockmap']]
    assert pick_installer(assets, 'Windows', 'AMD64')['name'] == 'T-Setup-1.0.4.exe'
    assert pick_installer(assets, 'Darwin', 'arm64')['name'] == 'T-1.0.4-arm64.dmg'
    assert pick_installer(assets, 'Darwin', 'x86_64')['name'] == 'T-1.0.4-x64.dmg'
    assert pick_installer(assets, 'Linux', 'x86_64')['name'] == 'T-1.0.4-x86_64.AppImage'
    with pytest.raises(gos.GosError, match='no installer for Windows'): pick_installer(assets[:2], 'Windows', 'AMD64')
    with pytest.raises(gos.GosError, match='No TETROBOT app for Plan9'): pick_installer(assets, 'Plan9', 'x')


TWO_LINK_XACRO = """<?xml version="1.0"?>
<robot name="twolink" xmlns:xacro="http://www.ros.org/wiki/xacro">
  <xacro:property name="reach" value="0.3"/>
  <xacro:macro name="bar" params="name">
    <link name="${name}"><inertial><mass value="0.1"/><inertia ixx="1e-4" iyy="1e-4" izz="1e-4" ixy="0" ixz="0" iyz="0"/></inertial>
      <collision><geometry><box size="${reach} 0.02 0.02"/></geometry></collision></link>
  </xacro:macro>
  <link name="base"/><xacro:bar name="l1"/><xacro:bar name="l2"/>
  <joint name="j1" type="revolute"><parent link="base"/><child link="l1"/><axis xyz="0 0 1"/><limit lower="-2" upper="2" effort="1" velocity="1"/></joint>
  <joint name="j2" type="revolute"><parent link="l1"/><child link="l2"/><origin xyz="${reach} 0 0"/><axis xyz="0 0 1"/><limit lower="-2" upper="2" effort="1" velocity="1"/></joint>
</robot>"""


def test_ros_robot_descriptions_load(tmp_path):
    pytest.importorskip('xacro')
    src = tmp_path / 'arm.urdf.xacro'; src.write_text(TWO_LINK_XACRO)
    with gos.App() as app:
        app.load(str(src))
        assert set(app.robot.joints()) == {'j1', 'j2'}
        app.set_joints(j1=0.5, j2=-0.5)
        assert app.robot.body_position('l2')[0] == pytest.approx(0.3 * math.cos(0.5), abs=1e-6), 'the macro and property expanded'
    import xacro
    (tmp_path / 'arm.urdf').write_text(xacro.process_file(str(src)).toxml())
    with gos.App() as app:
        app.load(str(tmp_path / 'arm.urdf')); assert set(app.robot.joints()) == {'j1', 'j2'}
    with pytest.raises(gos.GosError, match='.urdf or .xacro'):
        bad = tmp_path / 'x.sdf'; bad.write_text('<sdf/>'); gos.App().load(str(bad))


def test_doctor_and_workspace_build_and_test(tmp_path):
    env = dict(os.environ, PYTHONPATH=PY)
    r = subprocess.run([sys.executable, '-m', 'gos', 'doctor'], env=env, capture_output=True, text=True, timeout=60)
    assert r.returncode == 0 and 'the Rust core loads' in r.stdout and 'port 7447' in r.stdout, r.stdout + r.stderr
    src = tmp_path / 'ws' / 'src'; src.mkdir(parents=True)
    for name in ('arm-driver', 'camera-part'):
        assert subprocess.run([sys.executable, '-m', 'gos', 'pkg', 'new', name], cwd=src, env=env, capture_output=True, text=True, timeout=60).returncode == 0
    r = subprocess.run([sys.executable, '-m', 'gos', 'ws', 'test', str(tmp_path / 'ws')], env=env, capture_output=True, text=True, timeout=120)
    assert r.returncode == 0 and '2 of 2 packages passed' in r.stdout, r.stdout + r.stderr
    (src / 'arm-driver' / 'test_arm_driver.py').write_text('def test_fails():\n    assert False\n')
    r = subprocess.run([sys.executable, '-m', 'gos', 'ws', 'test', str(tmp_path / 'ws')], env=env, capture_output=True, text=True, timeout=120)
    assert r.returncode == 1 and 'Failed: arm-driver' in r.stdout, r.stdout
    r = subprocess.run([sys.executable, '-m', 'gos', 'ws', 'test', str(tmp_path)], env=env, capture_output=True, text=True, timeout=60)
    assert r.returncode == 1 and 'gos pkg new' in r.stderr


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


@pytest.mark.parametrize('wires', [('rust', 'rust', 'rust'), ('python', 'python', 'python'), ('python', 'rust', 'rust'), ('rust', 'python', 'rust')],
                         ids=['rust', 'python', 'python-hub', 'mixed'])
def test_bytes_and_arrays_travel_raw_over_tcp_on_either_wire(wires, monkeypatch):
    """G10 step 3: bytes and numpy arrays go as binary frames (no base64, no JSON numbers), through the hub to a third
    program, latched for one that starts late, and in order with ordinary messages."""
    import numpy as np
    from gos.testing import wait_until
    addr, apps = '127.0.0.1:17562', []
    try:
        for i, name in enumerate(('hub', 'a', 'b')):
            monkeypatch.setenv('GOS_TCP_WIRE', wires[i])
            apps.append(gos.App(transport='tcp', address=addr, name=name))
        hub, a, b = apps
        assert [x.bus.raw.wire for x in apps] == list(wires)
        got_b, got_hub = [], []
        b.topic('/data').subscribe(got_b.append); hub.topic('/data').subscribe(got_hub.append)
        import time; time.sleep(0.2)
        blob = bytes(range(256)) * 4000                       # 1 MB with every byte value, newlines included
        arr = np.arange(30000, dtype=np.float32).reshape(100, 300)
        for m in ({'n': 1}, blob, arr, {'n': 2}): a.topic('/data').publish(m)
        for got in (got_b, got_hub):
            wait_until(lambda: len(got) == 4, 'all four messages', 5)
            assert got[0] == {'n': 1} and got[3] == {'n': 2}, 'in order with the ordinary messages'
            assert got[1] == blob
            assert got[2].dtype == np.float32 and got[2].shape == (100, 300) and np.array_equal(got[2], arr)
        a.topic('/shape', latched=True).publish(np.eye(3))
        wait_until(lambda: '/d0/shape' in hub.bus.raw._latched, 'the hub to keep the latched array', 3)
        late = []
        b.topic('/shape').subscribe(late.append)
        wait_until(lambda: len(late) == 1, 'the latched array for a late subscriber', 3)
        assert np.array_equal(late[0], np.eye(3))
    finally:
        for x in apps: x.close()


def test_arrays_travel_over_zenoh_too():
    import numpy as np
    from gos.testing import wait_until
    with gos.App(transport='zenoh', listen=['tcp/127.0.0.1:17563']) as a, gos.App(transport='zenoh', connect=['tcp/127.0.0.1:17563']) as b:
        got = []
        b.topic('/arr').subscribe(got.append)
        import time; time.sleep(0.5)
        a.topic('/arr').publish(np.arange(12, dtype=np.int16).reshape(3, 4))
        a.topic('/arr').publish(b'raw')
        a.topic('/arr').publish({'still': 'json'})
        wait_until(lambda: len(got) == 3, 'three messages', 5)
        assert got[0].dtype == np.int16 and got[0].tolist() == [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11]]
        assert got[1] == b'raw' and got[2] == {'still': 'json'}


@pytest.mark.parametrize('wires', [('rust',) * 3, ('python',) * 3, ('python', 'rust', 'rust'), ('rust', 'python', 'python')],
                         ids=['rust', 'python', 'python-hub', 'rust-hub'])
def test_three_programs_talk_over_plain_tcp_with_no_add_ons(tmp_path, wires, monkeypatch):
    """Hub, a second program and this one: topics both ways and program to program, a latched value for a late
    subscriber, bytes, services in every direction, and discovery that forgets a program when it stops.
    Each program uses the Rust or the Python wire (wires = hub, other, this one); mixed, they still talk."""
    import time
    from gos.testing import wait_until
    addr = '127.0.0.1:17460'
    hub = tmp_path / 'hub.py'; hub.write_text(textwrap.dedent(f'''
        import sys, time, gos
        with gos.App(transport='tcp', address='{addr}', name='hub') as app:
            assert app.bus.raw.hub
            got = []
            app.topic('/to/hub').subscribe(lambda m: got.append(m))
            app.services.advertise('/hub/add', lambda r: r['a'] + r['b'])
            print('READY', flush=True)
            for line in sys.stdin:
                if line.startswith('call'): print('CALLED', app.services.call('/me/shout', 'hi'), flush=True)
                if line.startswith('got'): print('GOT', [m['n'] for m in got], flush=True)
                if line.startswith('pub'): app.topic('/from/hub').publish({{'n': 5}}); print('PUBBED', flush=True)
                if line.startswith('zenoh'): print('ZENOH', 'zenoh' in sys.modules, flush=True)
    '''))
    other = tmp_path / 'other.py'; other.write_text(textwrap.dedent(f'''
        import sys, time, gos
        with gos.App(transport='tcp', address='{addr}', name='other') as app:
            app.bus.publish('/state', {{'mode': 'walk'}}, latched=True)
            app.bus.announce('node', '/other')
            app.services.advertise('/other/double', lambda r: r * 2)
            seen = []
            app.topic('/to/other').subscribe(seen.append)
            print('READY', flush=True)
            for line in sys.stdin:
                if line.startswith('seen'): print('SEEN', seen, flush=True)
    '''))
    env = lambda i: dict(os.environ, PYTHONPATH=PY, GOS_TCP_WIRE=wires[i])
    procs = [subprocess.Popen([sys.executable, str(f)], env=env(0), stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True) for f in (hub,)]
    try:
        assert procs[0].stdout.readline().strip() == 'READY'
        procs.append(subprocess.Popen([sys.executable, str(other)], env=env(1), stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True))
        assert procs[1].stdout.readline().strip() == 'READY'
        ask = lambda i, cmd: (procs[i].stdin.write(cmd + '\n'), procs[i].stdin.flush(), procs[i].stdout.readline())[2]
        monkeypatch.setenv('GOS_TCP_WIRE', wires[2])
        with gos.App(transport='tcp', address=addr, name='me') as app:
            assert not app.bus.raw.hub and app.bus.raw.wire == wires[2]
            late = []
            app.topic('/state').subscribe(late.append)
            wait_until(lambda: late == [{'mode': 'walk'}], 'the latched value', 3)
            app.services.advertise('/me/shout', lambda r: r.upper())
            heard, raw = [], []
            app.topic('/from/hub').subscribe(heard.append)
            app.bus.raw.subscribe('/d0/blob', raw.append)
            time.sleep(0.2)
            for n in range(3): app.topic('/to/hub').publish({'n': n})
            app.topic('/to/other').publish({'x': 1})
            app.bus.raw.publish('/d0/blob', b'\x00\xffraw')
            ask(0, 'pub')
            wait_until(lambda: heard == [{'n': 5}], 'the hub message', 3)
            wait_until(lambda: raw == [b'\x00\xffraw'], 'the bytes', 3)
            assert ask(0, 'got').strip() == 'GOT [0, 1, 2]'
            assert ask(1, 'seen').strip() == "SEEN [{'x': 1}]", 'program to program through the hub'
            assert app.services.call('/hub/add', {'a': 2, 'b': 40}) == 42
            assert app.services.call('/other/double', 21) == 42
            assert ask(0, 'call').strip() == 'CALLED HI', 'the hub calls a service this program offers'
            with pytest.raises(LookupError, match='answered'): app.services.call('/nobody', {}, timeout=1)
            assert '/other' in app.bus.discover('node')
            procs[1].kill(); procs[1].wait()
            wait_until(lambda: '/other' not in app.bus.discover('node'), 'a stopped program to be forgotten', 3)
            assert ask(0, 'zenoh').strip() == 'ZENOH False', 'nothing beyond the core install is used'
    finally:
        for p in procs: p.kill()


def test_tf_over_time_interpolates_streams_and_reports_gaps():
    from gos import tf
    from gos.testing import wait_until
    import math
    with gos.App() as app:
        buf = tf.Buffer(app, seconds=1.0)
        tf.Broadcaster(app, static=True).send('base', 'camera', [0, 0, 0.3], [0, 0, 0, 1])
        b = tf.Broadcaster(app)
        s = math.sin(math.pi / 4)
        b.send('base', 'tip', [0, 0, 0], [0, 0, 0, 1], t=1.0)
        b.send('base', 'tip', [0.2, 0, 0], [0, 0, s, s], t=2.0)  # moved 20 cm and turned 90 degrees
        wait_until(lambda: len(buf.edges.get(('base', 'tip'), [])) == 2, 'two samples of the tip')
        mid = buf.lookup('camera', 'tip', t=1.5)
        assert mid['p'] == pytest.approx([0.1, 0, -0.3], abs=1e-9), 'halfway, seen from the camera 30 cm up'
        assert mid['q'] == pytest.approx([0, 0, math.sin(math.pi / 8), math.cos(math.pi / 8)], abs=1e-9), 'halfway through the turn'
        assert buf.lookup('camera', 'tip')['p'] == pytest.approx([0.2, 0, -0.3]), 'no time = newest'
        with pytest.raises(gos.GosError, match='known from 1.000 s to 2.000 s'): buf.lookup('camera', 'tip', t=3.0)
        with pytest.raises(gos.GosError, match='Frames: base, camera, tip'): buf.lookup('camera', 'hand')
        b.send('base', 'tip', [0.3, 0, 0], [0, 0, 0, 1], t=3.5)
        wait_until(lambda: buf.edges[('base', 'tip')][0]['t'] > 1.0, 'old samples to expire')
        # a camera also sees the tip: the two paths disagree by 1 cm, and that is reported
        tf.Broadcaster(app, static=True).send('camera', 'tip', [0.31, 0, -0.3], [0, 0, 0, 1])
        wait_until(lambda: ('camera', 'tip') in buf.static, 'the camera edge')
        assert buf.lookup('base', 'tip', t=3.5)['worst_position_m'] == pytest.approx(0.01, abs=1e-9)
    with gos.App() as app:  # the robot broadcasts its own bodies; a lookup matches the simulation
        app.load_document(CHAIN); app.set_joints(AB=0.3, BC=-0.2)
        buf = tf.Buffer(app); stop = tf.robot_state_publisher(app, rate=100)
        wait_until(lambda: ('C', 'D') in buf.edges, 'the robot on /tf')
        stop()
        got, want = buf.lookup('A', 'D'), app.loop_check('A', 'D')
        assert got['p'] == pytest.approx(want['p'], abs=1e-9)


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
    def __init__(self, n=9, live=False):
        import http.server, threading
        self.angles = {i + 1: 180.0 for i in range(n)}
        self.homes = {i + 1: 180.0 + i for i in range(n)}
        self.angles.update(self.homes)
        self.calls = []
        self.ms = 100000  # the board's clock: ms since power-on
        self.locked = False  # like the firmware after power-on: refuses /api/batch until the operator acts
        board = self
        class H(http.server.BaseHTTPRequestHandler):
            def log_message(self, *a): pass
            def do_GET(self):
                from urllib.parse import urlparse, parse_qs
                u = urlparse(self.path); q = {k: v[0] for k, v in parse_qs(u.query).items()}
                board.calls.append((u.path, q))
                if u.path == '/api/health':
                    body = {'ok': True, 'device': 'ROBO4-ESP32', 'ip': '127.0.0.1', **({'live': board.live_port} if live else {})}
                elif u.path == '/api/telemetry':
                    board.ms += 50
                    body = {'ms': board.ms, 'servos': [{'id': i, 'label': f'J{i}', 'min': 80, 'max': 280, 'currentAngle': board.angles[i], 'home': board.homes[i]} for i in board.angles]}
                else:
                    if u.path == '/api/batch' and board.locked:
                        data = json.dumps({'ok': False, 'error': 'locked after power-on: nothing moves until you press Turn torque ON'}).encode()
                        self.send_response(423); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data); return
                    if u.path == '/api/batch':
                        for k, v in q.items():
                            if k.isdigit(): board.angles[int(k)] = float(v)
                    body = {'ok': True}
                data = json.dumps(body).encode()
                self.send_response(200); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)
        self.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
        self.url = f'http://127.0.0.1:{self.server.server_address[1]}'
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        if live:  # like the firmware's live mode: while asked (R4LV), push angles every 60 ms
            import socket, time
            u = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); u.bind(('127.0.0.1', 0)); self.live_port = u.getsockname()[1]; u.settimeout(0.06)
            def push():
                to, until = None, 0
                while True:
                    try:
                        b, a = u.recvfrom(16)
                        if b == b'R4LV': to, until = a, time.time() + 1.5
                    except OSError: pass
                    if to and time.time() < until: u.sendto(json.dumps({'a': [[i, v] for i, v in board.angles.items()]}).encode(), to)
            threading.Thread(target=push, daemon=True).start()

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


def test_a_module_served_on_the_network_is_safe_and_follows_commands():
    import math, time
    from gos.hardware import Esp32Robot, serve_robot
    board = FakeBoard()
    robot = Esp32Robot.from_board(board.url)
    assert robot.joints[:2] == ['J1', 'J2'] and robot.ids['J3'] == 3, 'names and IDs come from the board'
    assert robot.limits['J3'] == pytest.approx((math.radians(80 - 182), math.radians(280 - 182))), 'limits around its home'
    with gos.App(name='driver') as app:
        stop = serve_robot(app, robot, 'mod1', rate=50)
        states, status = [], []
        app.topic('/mod1/joint_states').subscribe(states.append)
        app.topic('/mod1/status').subscribe(status.append)
        time.sleep(0.15)
        assert states and states[-1]['name'][0] == 'J1' and states[-1]['position'][0] == pytest.approx(0), 'angles from the encoders'
        app.topic('/mod1/joint_commands').publish({'name': ['J3'], 'position': [0.2]})
        assert not board.batches() and 'not armed' in status[-1]['error'].lower(), 'nothing moves before arm'
        assert app.services.call('/mod1/arm', None)['ok']
        app.topic('/mod1/joint_commands').publish({'name': ['J3'], 'position': [0.2]})
        assert float(board.batches()[-1]['3']) == pytest.approx(182 + math.degrees(0.2), abs=0.01)
        time.sleep(0.1)
        assert states[-1]['position'][2] == pytest.approx(0.2, abs=1e-3), 'the state follows the robot'
        app.topic('/mod1/joint_commands').publish({'name': ['J3', 'J4'], 'position': [0.1]})
        assert 'one position per name' in status[-1]['error']
        assert app.services.call('/mod1/stop', None)['ok'] and ('/api/command', {'servo': 'all', 'cmd': 'estop'}) in board.calls
        assert not robot.armed, 'stop disarms'
        stop()


def test_live_mode_streams_angles_instead_of_asking_every_time():
    import math, time
    from gos.hardware import Esp32Robot
    old = Esp32Robot.from_board(FakeBoard().url)
    assert not old.live(), 'a board without live mode keeps working the old way'
    board = FakeBoard(live=True)
    robot = Esp32Robot.from_board(board.url)
    assert robot.live()
    time.sleep(0.3)
    n = len(board.calls)
    for _ in range(20): q = robot.read()
    assert len(board.calls) - n <= 1, 'reads come from the stream, not one web request each'
    board.angles[3] = board.homes[3] + 10
    time.sleep(0.2)
    assert robot.read()['J3'] == pytest.approx(math.radians(10)), 'the stream follows the robot'
    robot.close(); time.sleep(0.7)
    n = len(board.calls); robot.read()
    assert len(board.calls) - n == 1, 'after close, reads go back to the web request'


def test_downloads_show_a_progress_bar_in_a_terminal_and_lines_in_a_log():
    import io
    from gos.progress import Progress
    class Tty(io.StringIO):
        encoding = 'cp1252'  # an old Windows console: plain characters
        def isatty(self): return True
    t = Tty(); p = Progress('Downloading', 1000, stream=t)
    for _ in range(10): p.update(100)
    p.finish()
    out = t.getvalue()
    assert '\r' in out and '100%' in out and '[####################]' in out and 'done' in out, 'one line redrawn in place'
    log = io.StringIO(); p = Progress('Downloading', 1000, stream=log)
    for _ in range(100): p.update(10)
    p.finish()
    lines = log.getvalue().splitlines()
    assert '\r' not in log.getvalue() and 10 <= len(lines) <= 12, 'a log gets about one line per 10%, no redrawing'


def test_a_restarted_or_silent_module_is_disarmed():
    import time
    from gos.hardware import Esp32Robot
    board = FakeBoard()
    robot = Esp32Robot.from_board(board.url)
    assert robot.arm().ok and robot.move({'J3': 0.1}).ok
    board.ms = 3000; robot.read()                  # its clock went back: it powered off and on
    assert not robot.armed
    r = robot.move({'J3': 0.2})
    assert not r.ok and 'restarted' in r.message, r.message
    assert robot.arm().ok and robot.move({'J3': 0.1}).ok, 'arming again works'
    robot._contact_at -= 3                         # as if nothing came back for 3 s
    r = robot.move({'J3': 0.2})
    assert not r.ok and 'no reply' in r.message and not robot.armed, r.message


def test_a_board_locked_after_power_on_refuses_moves_with_its_reason():
    from gos.hardware import Esp32Robot
    board = FakeBoard(); board.locked = True
    robot = Esp32Robot.from_board(board.url)
    assert robot.arm().ok
    with pytest.raises(gos.GosError, match='locked after power-on'):
        robot.move({'J3': 0.2})


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
        r = cli('topic', 'stats', '/arm/state', '--seconds', '1'); assert 10 < json.loads(r.stdout)['per_second'] < 30, r.stdout + r.stderr
        r = cli('topic', 'stats', '/arm/none', '--seconds', '0.2'); assert r.returncode == 1 and 'gos topic list' in r.stderr
        msgs = tmp_path / 'msgs.json'; msgs.write_text('[{"n": 1}, {"n": 2}]')
        with gos.App(transport='zenoh', connect=['tcp/127.0.0.1:17451']) as app:
            got = []; app.topic('/from/file').subscribe(lambda m: got.append(m['n'])); time.sleep(0.5)
            r = cli('topic', 'pub', '/from/file', '--file', str(msgs)); assert r.returncode == 0, r.stderr
            time.sleep(0.3); assert got == [1, 2]
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


def test_position_controller_and_joint_state_broadcaster():
    from gos.control import forward_command_controller, joint_state_broadcaster
    from gos.testing import collect, wait_until
    with gos.App() as app:
        app.load_document(CHAIN)
        states, diag = collect(app, '/joint_states'), collect(app, '/diagnostics')
        stop = joint_state_broadcaster(app, rate=100)
        forward_command_controller(app, ['AB', 'BC'])
        app.topic('/position_commands').publish({'data': [0.3, -0.1]})
        wait_until(lambda: app.robot.joints()['AB'] == pytest.approx(0.3), 'AB at 0.3')
        wait_until(lambda: any(s['position'][s['name'].index('AB')] == pytest.approx(0.3) for s in states), 'a JointState showing AB at 0.3')
        app.topic('/position_commands').publish({'data': [1.0]})
        wait_until(lambda: diag and 'Expected' in diag[-1]['message'], 'a diagnostic about the short command')
        assert app.robot.joints()['AB'] == pytest.approx(0.3), 'a wrong command is not half-applied'
        stop(); import time; time.sleep(0.05); n = len(states); time.sleep(0.1)
        assert len(states) == n, 'stop() stops the broadcaster'
        with pytest.raises(ValueError, match='No joints XY'): forward_command_controller(app, ['XY'])


def test_controller_manager_switches_and_refuses_two_on_one_joint():
    from gos.control import ControllerManager
    from gos.testing import collect, wait_until
    with gos.App() as app:
        app.load_document(CHAIN)
        cm = ControllerManager(app)
        cm.add('arm', 'position', ['AB', 'BC']); cm.add('wrist', 'position', ['BC', 'CD']); cm.add('traj', 'trajectory', ['AB', 'BC']); cm.add('states', 'broadcaster')
        app.topic('/arm/commands').publish({'data': [0.4, 0.1]}); import time; time.sleep(0.1)
        assert app.robot.joints()['AB'] == pytest.approx(0.0), 'switched off: commands are ignored'
        cm.switch(on=['arm', 'states'])
        app.topic('/arm/commands').publish({'data': [0.4, 0.1]})
        wait_until(lambda: app.robot.joints()['AB'] == pytest.approx(0.4), 'arm to move AB')
        with pytest.raises(ValueError, match='wrist and arm would both drive BC|arm and wrist would both drive BC'): cm.switch(on=['wrist'])
        assert [e['name'] for e in cm.list() if e['active']] == ['arm', 'states'], 'a refused switch changes nothing'
        h = app.actions.send_goal('/traj/follow_joint_trajectory', {'names': ['AB'], 'points': [{'q': [0.0], 't': 0.1}]}).wait(5)
        assert h.status == 'aborted' and 'switched off' in h.error
        r = app.services.call('/controller_manager/switch', {'off': ['arm'], 'on': ['traj']})
        assert {e['name'] for e in r if e['active']} == {'traj', 'states'}
        h = app.actions.send_goal('/traj/follow_joint_trajectory', {'names': ['AB'], 'points': [{'q': [0.0], 't': 0.1}]}).wait(5)
        assert h.status == 'succeeded' and app.robot.joints()['AB'] == pytest.approx(0.0)
        states = collect(app, '/joint_states'); wait_until(lambda: states, 'the broadcaster to publish')
        with pytest.raises(ValueError, match='No controller nope'): cm.switch(on=['nope'])
        cm.switch(off=['states'])


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


def test_encrypted_links_refuse_programs_without_a_certificate(tmp_path):
    pytest.importorskip('zenoh'); pytest.importorskip('cryptography')
    import time
    from gos import certs
    keys = str(tmp_path / 'keys'); certs.new(keys, ['robot', 'laptop'])
    strange = str(tmp_path / 'other'); certs.new(strange, ['laptop'])  # signed by a different authority
    tls = lambda name, folder=keys: dict(transport='zenoh', certs=folder, cert_name=name)
    with gos.App(listen=['tls/127.0.0.1:17497'], **tls('robot')) as robot:
        robot.services.advertise('/arm/ping', lambda r: 'pong')
        with gos.App(connect=['tls/127.0.0.1:17497'], **tls('laptop')) as friend:
            time.sleep(0.5)
            assert friend.services.call('/arm/ping', None, timeout=3) == 'pong'
        with gos.App(connect=['tls/127.0.0.1:17497'], **tls('laptop', strange)) as stranger:
            time.sleep(0.5)
            with pytest.raises(LookupError): stranger.services.call('/arm/ping', None, timeout=1)
    with pytest.raises(gos.GosError, match='gos certs new'): gos.App(transport='zenoh', certs=keys, cert_name='nobody')


def test_permissions_let_each_user_do_only_what_is_listed(tmp_path):
    pytest.importorskip('zenoh')
    import time
    users = tmp_path / 'users.txt'; users.write_text('viewer:v1\noperator:o1\n')
    perms = {'viewer': {'subscribe': ['/arm/state']}, 'operator': {'subscribe': ['/arm/state'], 'publish': ['/arm/cmd'], 'call': ['/arm/home']}}
    with gos.App(transport='zenoh', listen=['tcp/127.0.0.1:17498'], users_file=str(users), user='robot', password='r', permissions=perms) as robot:
        cmds = []; robot.topic('/arm/cmd').subscribe(cmds.append)
        robot.services.advertise('/arm/home', lambda r: 'homed')
        link = dict(transport='zenoh', connect=['tcp/127.0.0.1:17498'])
        with gos.App(**link, user='viewer', password='v1') as viewer, gos.App(**link, user='operator', password='o1') as op:
            seen = []; viewer.topic('/arm/state').subscribe(seen.append)
            time.sleep(0.8)
            for _ in range(5):
                viewer.topic('/arm/cmd').publish('from viewer'); op.topic('/arm/cmd').publish('from operator'); robot.topic('/arm/state').publish('state'); time.sleep(0.1)
            time.sleep(0.5)
            assert set(cmds) == {'from operator'}, cmds
            assert seen, 'the viewer still sees the state it may read'
            assert op.services.call('/arm/home', None, timeout=3) == 'homed'
            with pytest.raises(LookupError): viewer.services.call('/arm/home', None, timeout=1)
    with pytest.raises(ValueError, match='Kinds: publish'): gos.App(transport='zenoh', permissions={'x': {'write': ['/a']}})


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


def test_rate_stays_on_time_beside_a_busy_python_thread():
    """G10 step 4: with Python's default 5 ms lock turn a busy thread made a 100 Hz loop 7.9 ms late; Rate shortens it."""
    import sys, threading
    old = sys.getswitchinterval()
    stop = threading.Event()
    def burn():
        x = 0
        while not stop.is_set(): x += 1
    t = threading.Thread(target=burn, daemon=True)
    try:
        sys.setswitchinterval(0.005)
        r = gos.Rate(100)
        assert sys.getswitchinterval() <= 0.0005
        t.start()
        for _ in range(100): r.sleep()
        j = r.jitter()
        print('100 Hz beside a busy thread:', {k: round(v, 3) for k, v in j.items()})
        assert j['median_ms'] < 1.0 and j['p99_ms'] < 3.0
    finally:
        stop.set(); t.join(); sys.setswitchinterval(old)


def test_realtime_asks_the_system_and_says_what_it_got():
    # in its own process, so the test run itself keeps its normal priority
    code = 'import gos, json; print(json.dumps(gos.realtime()))'
    r = subprocess.run([sys.executable, '-c', code], env=dict(os.environ, PYTHONPATH=PY), capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stderr
    got = json.loads(r.stdout)
    assert got['gc'] == 'frozen' and got['system'] in ('Windows', 'Linux', 'Darwin') and 'priority' in got
    if got['system'] == 'Windows': assert got['priority'] == 'high', 'a normal user may raise its own priority on Windows'
    if got['system'] == 'Linux': assert 'kernel' in got


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
    r = subprocess.run([sys.executable, '-m', 'gos', 'doc', '--html', str(tmp_path / 'site')], env=env, capture_output=True, text=True, timeout=60)
    assert r.returncode == 0 and 'gos.physics.html' in (tmp_path / 'site' / 'index.html').read_text(), r.stderr
    assert 'register' in (tmp_path / 'site' / 'gos.physics.html').read_text(errors='replace')
    # a gos-NAME program on PATH becomes a gos command, as with git
    bin_dir = tmp_path / 'bin'; bin_dir.mkdir()
    (bin_dir / 'hello.py').write_text('import sys; print("HELLO", *sys.argv[1:])')
    if os.name == 'nt': (bin_dir / 'gos-hello.cmd').write_text(f'@"{sys.executable}" "%~dp0hello.py" %*\r\n')
    else:
        (bin_dir / 'gos-hello').write_text(f'#!/bin/sh\nexec "{sys.executable}" "$(dirname "$0")/hello.py" "$@"\n'); (bin_dir / 'gos-hello').chmod(0o755)
    path_env = dict(env, PATH=str(bin_dir) + os.pathsep + os.environ['PATH'])
    r = subprocess.run([sys.executable, '-m', 'gos', 'hello', 'world'], env=path_env, capture_output=True, text=True, timeout=60)
    assert 'HELLO world' in r.stdout, r.stdout + r.stderr
    r = subprocess.run([sys.executable, '-m', 'gos', 'nosuch'], env=env, capture_output=True, text=True, timeout=60)
    assert r.returncode == 2 and 'invalid choice' in r.stderr


ARM_WITH_POST = '''<mujoco><compiler angle="radian"/><option timestep="0.002"/><worldbody>
<geom name="post" type="sphere" pos="0.45 0 0" size="0.05"/>
<body name="l1"><joint name="J1" type="hinge" axis="0 0 1" range="-2 2" limited="true"/><geom type="capsule" fromto="0 0 0 0.3 0 0" size="0.02" mass="0.1"/>
<body name="l2" pos="0.3 0 0"><joint name="J2" type="hinge" axis="0 0 1" range="-2.5 2.5" limited="true"/><geom type="capsule" fromto="0 0 0 0.3 0 0" size="0.02" mass="0.1"/></body></body>
</worldbody></mujoco>'''


def test_planner_goes_around_an_obstacle_and_the_controller_follows(tmp_path):
    from gos import plan
    from gos.control import joint_trajectory_controller
    xml = tmp_path / 'arm.xml'; xml.write_text(ARM_WITH_POST)
    with gos.App() as app:
        app.load(str(xml)); app.set_joints(J1=-1.2, J2=0.0)
        r = plan.joint_path(app, {'J1': 1.2, 'J2': 0.0})
        assert r.ok and len(r.path) >= 3, r.message  # the straight swing hits the post, so the path must bend the elbow
        mid = r.path[len(r.path) // 2]
        assert abs(mid['J2']) > 0.3, r.path
        goal = plan.trajectory(r.path, speed=4.0)
        act = joint_trajectory_controller(app)
        h = app.actions.send_goal(act, goal).wait(20)
        assert h.status == 'succeeded' and app.robot.joints()['J1'] == pytest.approx(1.2, abs=1e-6)
        assert not plan.joint_path(app, {'J1': 3.0, 'J2': 0}).ok, 'outside the limits is refused'
        bad = plan.joint_path(app, {'J1': 0.0, 'J2': 0.0})
        assert not bad.ok and 'goal pose collides' in bad.message


ARM_WITH_HAND = ARM_WITH_POST.replace('size="0.02" mass="0.1"/></body></body>', 'size="0.02" mass="0.1"/><body name="hand" pos="0.3 0 0"><geom type="sphere" size="0.005" mass="0.01"/></body></body></body>')
PENTAGON_AT = {'A': (0, 0), 'B': (.2, 0), 'C': (.26, .19), 'D': (.1, .31), 'E': (-.06, .19)}
PENTAGON = {'name': 'pentagon', 'bodies': by([body(n, *xy) for n, xy in PENTAGON_AT.items()]),
            'joints': by([joint(a + b, 'revolute', a, b, PENTAGON_AT[b][0] - PENTAGON_AT[a][0], PENTAGON_AT[b][1] - PENTAGON_AT[a][1]) for a, b in ('AB', 'BC', 'CD', 'DE', 'EA')])}


def off_line(p, a, b):
    ux, uy = b[0] - a[0], b[1] - a[1]
    return abs((p[0] - a[0]) * uy - (p[1] - a[1]) * ux) / math.hypot(ux, uy)


def test_hand_moves_in_a_straight_line_and_stops_where_it_must(tmp_path):
    from gos import plan
    xml = tmp_path / 'arm.xml'; xml.write_text(ARM_WITH_HAND)
    with gos.App() as app:
        app.load(str(xml)); app.set_joints(J1=0.9, J2=-0.9)
        start = app.robot.body_position('hand')
        end = [start[0] - 0.1, start[1] + 0.05, start[2]]
        r = plan.cartesian_path(app, 'hand', end)
        assert r.ok and r.reached == 1.0, r.message
        for q in r.path:  # every waypoint really is on the line
            app.set_joints(**q); assert off_line(app.robot.body_position('hand'), start, end) < 0.0015
        assert math.dist(app.robot.body_position('hand'), end) < 0.0015
        app.set_joints(J1=0.9, J2=-0.9)
        far = plan.cartesian_path(app, 'hand', [start[0] + 5, start[1], start[2]])
        assert not far.ok and 0 < far.reached < 1 and 'cannot follow' in far.message and len(far.path) > 1, far.message
        app.set_joints(J1=0.9, J2=-0.9)
        hit = plan.cartesian_path(app, 'hand', [start[0], -start[1], start[2]])
        assert not hit.ok and 'hit something' in hit.message and 0 < hit.reached < 1, hit.message
        with pytest.raises(gos.GosError, match='No body named'): plan.cartesian_path(app, 'nope', end)


def test_the_hand_keeps_its_angle_along_the_line_when_asked(tmp_path):
    import mujoco
    import numpy as np
    from gos import plan
    three = ARM_WITH_HAND.replace('<body name="hand" pos="0.3 0 0">', '<body name="hand" pos="0.3 0 0"><joint name="J3" type="hinge" axis="0 0 1" range="-3 3" limited="true"/>').replace('<geom type="sphere" size="0.005" mass="0.01"/>', '<geom type="capsule" fromto="0 0 0 0.05 0 0" size="0.005" mass="0.01"/>')
    xml = tmp_path / 'arm.xml'; xml.write_text(three)
    with gos.App() as app:
        app.load(str(xml)); app.set_joints(J1=0.9, J2=-0.9, J3=0.3)
        start = app.robot.body_position('hand'); end = [start[0] - 0.1, start[1] + 0.05, start[2]]
        hand = mujoco.mj_name2id(app.model, mujoco.mjtObj.mjOBJ_BODY, 'hand')
        q0 = app.data.xquat[hand].copy()
        r = plan.cartesian_path(app, 'hand', end, keep_angle=True)
        assert r.ok, r.message
        for q in r.path:
            app.set_joints(**q); turn = np.zeros(3); mujoco.mju_subQuat(turn, q0, app.data.xquat[hand])
            assert np.linalg.norm(turn) < 0.01 and off_line(app.robot.body_position('hand'), start, end) < 0.0015
        moved = plan.cartesian_path(app, 'hand', start)
        assert moved.ok
    two = tmp_path / 'two.xml'; two.write_text(ARM_WITH_HAND)
    with gos.App() as app:  # two joints cannot move the hand and also hold its angle
        app.load(str(two)); app.set_joints(J1=0.9, J2=-0.9)
        s = app.robot.body_position('hand')
        r = plan.cartesian_path(app, 'hand', [s[0] - 0.1, s[1] + 0.05, s[2]], keep_angle=True)
        assert not r.ok and ('hold its angle' in r.message or 'cannot follow' in r.message), r.message


def test_planners_work_on_the_real_module_whose_parts_overlap_at_rest():
    from gos import plan
    with open(MODULE, encoding='utf-8') as f: raw = json.load(f)
    with gos.App() as app:
        app.load_document(raw.get('model', raw))
        r = plan.joint_path(app, {'J_B1_bend': 0.3, 'J_B3_bend': -0.3})
        assert r.ok, r.message
        tip = 'L2_LockRotor_B'; p = app.robot.body_position(tip); end = [p[0] - 0.02, p[1], p[2] + 0.03]
        line = plan.cartesian_path(app, tip, end)
        assert line.ok, line.message
        app.set_joints(**line.path[-1])
        assert math.dist(app.robot.body_position(tip), end) < 0.0015


def two_real_modules(gap):
    """Two copies of the real module side by side, each anchored at one end, as two modules lying on the floor."""
    import copy
    with open(MODULE, encoding='utf-8') as f: raw = json.load(f)
    doc = copy.deepcopy(raw.get('model', raw)); second = copy.deepcopy(raw.get('model', raw))
    for b in second['bodies'].values():
        b['id'], b['name'] = 'M2_' + b['id'], 'M2_' + b['name']; b['transform']['position'][1] += gap
    for j in second['joints'].values():
        j['id'], j['name'] = 'M2_' + j['id'], 'M2_' + j['name']; j['parentBodyId'] = 'M2_' + j['parentBodyId']; j['childBodyId'] = 'M2_' + j['childBodyId']
    doc['bodies'].update({b['id']: b for b in second['bodies'].values()}); doc['joints'].update({j['id']: j for j in second['joints'].values()})
    for k in ('components', 'connectors'):
        if isinstance(doc.get(k), dict) and k in second: doc[k].update({'M2_' + i: v for i, v in second[k].items()})
    return doc


def test_a_joint_to_a_missing_body_is_refused():
    import copy
    bad = copy.deepcopy(CHAIN); bad['joints']['BC']['parentBodyId'] = 'nobody'
    with gos.App() as app:
        with pytest.raises(gos.GosError, match='Joint "BC" connects to body "nobody"'): app.load_document(bad)


def test_an_arch_of_two_real_modules_moves_in_a_line_with_its_lock_shut():
    from gos import plan
    with gos.App() as app:
        app.load_document(two_real_modules(0.15))
        assert app.lock('EndB_LockModule', 'M2_EndB_LockModule').ok
        body = 'Spine2_B3B4'; p = app.robot.body_position(body); end = [p[0] - 0.02, p[1], p[2]]
        r = plan.cartesian_path(app, body, end, keep_angle=True)
        assert r.ok, r.message
        for q in r.path:
            app.set_joints(**q); assert app.closure_error() < 0.0005, 'the lock opened'
        assert math.dist(app.robot.body_position(body), end) < 0.001


def test_a_ring_stays_closed_on_a_straight_line_or_says_it_cannot():
    from gos import plan
    with gos.App() as app:
        app.load_document(PENTAGON)
        c = app.robot.body_position('D'); end = [c[0] + 0.02, c[1] - 0.01, c[2]]  # the corner away from the fixed pivots: it can move two ways
        r = plan.cartesian_path(app, 'D', end)
        assert r.ok, r.message
        for q in r.path:
            app.set_joints(**q)
            assert app.closure_error() < 0.002, 'the ring opened'
            assert off_line(app.robot.body_position('D'), c, end) < 0.0015
        assert math.dist(app.robot.body_position('D'), end) < 0.0015
    with gos.App() as app:  # four sides move only one way: its corner follows a curve, so a straight line is refused
        app.load_document(SQUARE)
        c = app.robot.body_position('C')
        r = plan.cartesian_path(app, 'C', [c[0] - 0.03, c[1] + 0.01, c[2]])
        assert not r.ok and 'cannot follow' in r.message, r.message


def test_mobile_robot_drives_from_cmd_vel_and_reports_odom():
    from gos.examples_mobile import MobileRobot
    from gos.testing import collect
    import math
    with gos.App() as app:
        bot = MobileRobot(app)
        odom = collect(app, '/odom')
        app.topic('/cmd_vel').publish({'linear': {'x': 0.2, 'y': 0, 'z': 0}, 'angular': {'x': 0, 'y': 0, 'z': 0}})
        bot.run(2.0)
        x, y, yaw = bot.pose()
        assert 0.3 < x < 0.45 and abs(y) < 0.03, (x, y)  # about 0.2 m/s for 2 s, straight
        assert odom and abs(odom[-1]['pose']['pose']['position']['x'] - x) < 0.02
        app.topic('/cmd_vel').publish({'linear': {'x': 0, 'y': 0, 'z': 0}, 'angular': {'x': 0, 'y': 0, 'z': 1.0}})
        bot.run(1.5)
        assert 0.9 < abs(bot.pose()[2] - yaw) < 1.9, bot.pose()  # turned about 1.5 rad on the spot
