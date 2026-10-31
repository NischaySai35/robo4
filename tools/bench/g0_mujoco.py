"""GOS G0 baseline: MuJoCo, loops, topology change, mink IK and local transport (RESTRUCTURING 10.8).

usage: py -3.12 tools/bench/g0_mujoco.py       (zenoh and mink rows are skipped if they are not installed)
The robot is an abstract 3-chain of 7-joint modules made of capsules, not the CAD model: it measures
the cost of the graph operations, not of the real meshes, which comes later with the new module.
"""
import json, multiprocessing as mp, socket, statistics as st, sys, threading, time
import numpy as np
import mujoco


def report(label, samples, unit='us'):
    s = sorted(samples); f = {'us': 1e6, 'ms': 1e3}[unit]
    print(f'{label:<50} median {s[len(s) // 2] * f:10.2f} {unit}   p99 {s[int(len(s) * .99)] * f:10.2f} {unit}   n={len(s)}', flush=True)


def timed(fn, n):
    out = []
    for _ in range(n):
        a = time.perf_counter(); fn(); out.append(time.perf_counter() - a)
    return out


def chain_xml(modules, close_loop=False, joints=7, link=0.06):
    n = modules * joints
    body, tail = '', ''
    for i in range(n):
        axis = '0 0 1' if i % 7 in (0, 3, 6) else '0 1 0'
        body += f'<body name="b{i}" pos="{link if i else 0} 0 0"><joint name="j{i}" axis="{axis}" range="-1.57 1.57"/><geom type="capsule" size="0.015" fromto="0 0 0 {link} 0 0" mass="0.1"/>'
        tail += '</body>'
    eq = ''
    if close_loop:
        eq = f'<equality><connect name="close" body1="b{n - 1}" body2="world" anchor="{link} 0 0" solref="0.02 1"/></equality>'
    return f'<mujoco><option timestep="0.002"/><worldbody>{body}{tail}</worldbody>{eq}</mujoco>'


def bench_mujoco():
    for m in (1, 3, 6):
        xml = chain_xml(m)
        report(f'compile {m} module(s) from XML', timed(lambda: mujoco.MjModel.from_xml_string(xml), 20), 'ms')
        model = mujoco.MjModel.from_xml_string(xml); data = mujoco.MjData(model)
        report(f'mj_kinematics {m} module(s), {model.nv} dof', timed(lambda: mujoco.mj_kinematics(model, data), 5000))
        report(f'mj_step {m} module(s)', timed(lambda: mujoco.mj_step(model, data), 3000))
        report(f'mj_jacBody {m} module(s)', timed(lambda: mujoco.mj_jacBody(model, data, np.zeros((3, model.nv)), np.zeros((3, model.nv)), model.nbody - 1), 3000))

    # A lock as an equality constraint that is already compiled: flip it on and off, no recompile.
    model = mujoco.MjModel.from_xml_string(chain_xml(3, close_loop=True)); data = mujoco.MjData(model)
    def flip():
        data.eq_active[0] = 1 - data.eq_active[0]; mujoco.mj_forward(model, data)
    report('lock toggle: eq_active + mj_forward, 3 modules', timed(flip, 500))

    # A lock that was not in the model: edit the spec and recompile, keeping the simulation state.
    spec = mujoco.MjSpec.from_string(chain_xml(3)); model = spec.compile(); data = mujoco.MjData(model)
    data.qpos[:] = 0.1; mujoco.mj_forward(model, data); before = data.qpos.copy()
    out = []
    for i in range(30):
        a = time.perf_counter()
        eq = spec.add_equality(); eq.type = mujoco.mjtEq.mjEQ_CONNECT; eq.objtype = mujoco.mjtObj.mjOBJ_BODY
        eq.name1 = 'b20'; eq.name2 = 'world'; eq.data[:3] = [0.06, 0, 0]
        model, data = spec.recompile(model, data); out.append(time.perf_counter() - a)
    report('lock added: MjSpec.recompile, 3 modules', out, 'ms')
    print(f'   recompile kept qpos: {bool(np.allclose(before, data.qpos))}, nv={model.nv}, neq={model.neq}')


def ring_xml(n=21, link=0.06, close=True):
    """A real closed ring: each link turns 360/n degrees, so the last link ends exactly at the first joint."""
    turn = 360 / n
    body, tail = '', ''
    for i in range(n):
        axis = '0 0 1' if i % 2 == 0 else '0 1 0'
        body += f'<body name="b{i}" pos="{link if i else 0} 0 0" euler="0 0 {turn if i else 0}"><joint axis="{axis}" range="-1.57 1.57"/><geom type="capsule" size="0.01" fromto="0 0 0 {link} 0 0" mass="0.1"/>'
        tail += '</body>'
    eq = f'<equality><connect body1="b{n - 1}" body2="world" anchor="{link} 0 0" solref="0.02 1"/></equality>' if close else ''
    return f'<mujoco><compiler angle="degree"/><worldbody>{body}{tail}</worldbody>{eq}</mujoco>'


def bench_mink():
    try:
        import mink
    except ImportError:
        return print('mink not installed: skipped')
    n, link = 21, 0.06
    solver = 'daqp' if have_daqp() else 'osqp'
    for loop in (False, True):
        model = mujoco.MjModel.from_xml_string(ring_xml(n, link, loop)); data = mujoco.MjData(model)
        cfg = mink.Configuration(model)
        def end_gap():
            # Plain geometry, not a solver number: world distance from the last link's far end to the first joint.
            data.qpos[:] = cfg.q; mujoco.mj_kinematics(model, data)
            return float(np.linalg.norm(data.xpos[model.nbody - 1] + data.xmat[model.nbody - 1].reshape(3, 3) @ np.array([link, 0, 0])))
        tip = 'b10'
        start = cfg.get_transform_frame_to_world(tip, 'body').translation().copy()
        centre = np.mean([cfg.get_transform_frame_to_world(f'b{i}', 'body').translation() for i in range(n)], axis=0)
        goal = start + 0.05 * (centre - start) / np.linalg.norm(centre - start) + np.array([0, 0, 0.03])
        task = mink.FrameTask(frame_name=tip, frame_type='body', position_cost=1.0, orientation_cost=0.0)
        task.set_target(mink.SE3.from_translation(goal))
        tasks = [task] + ([mink.EqualityConstraintTask(model=model, cost=100.0)] if loop else [])
        limits = [mink.ConfigurationLimit(model)]
        g0, c0 = np.linalg.norm(start - goal), end_gap()
        def step():
            v = mink.solve_ik(cfg, tasks, 0.01, solver, limits=limits, damping=1e-3)
            cfg.integrate_inplace(v, 0.01)
        report(f'mink step ({solver}), ring {n} joints, loop={loop}', timed(step, 800), 'ms')
        g1 = np.linalg.norm(cfg.get_transform_frame_to_world(tip, 'body').translation() - goal)
        print(f'   800 steps: goal error {g0 * 1000:.1f} -> {g1 * 1000:.2f} mm, end gap {c0 * 1000:.3f} -> {end_gap() * 1000:.3f} mm')


def have_daqp():
    try:
        import daqp  # noqa: F401
        return True
    except ImportError:
        return False


def tcp_echo(port):
    srv = socket.create_server(('127.0.0.1', port)); c, _ = srv.accept(); c.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    while (d := c.recv(4096)):
        c.sendall(d)


def bench_transport():
    # Round trips, so one-way is about half. Python on both ends: this is the Python cost, not a native one.
    payload = json.dumps({'q': [0.123456] * 21}).encode()
    p = mp.Process(target=tcp_echo, args=(18771,), daemon=True); p.start(); time.sleep(.5)
    s = socket.create_connection(('127.0.0.1', 18771)); s.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    def rt():
        s.sendall(payload); s.recv(4096)
    report(f'TCP localhost round trip, 2 processes, {len(payload)} B', timed(rt, 5000)); s.close(); p.terminate()
    try:
        import zenoh
    except ImportError:
        return print('zenoh not installed: skipped')
    z = zenoh.open(zenoh.Config()); ev = threading.Event()
    pub = z.declare_publisher('gos/ping'); sub = z.declare_subscriber('gos/pong', lambda _: ev.set())
    p = mp.Process(target=zenoh_echo, daemon=True); p.start(); time.sleep(2)
    def zrt():
        ev.clear(); pub.put(payload)
        if not ev.wait(2): raise TimeoutError('zenoh echo did not answer')
    report(f'Zenoh round trip, 2 Python processes, {len(payload)} B', timed(zrt, 3000)); p.terminate(); z.close()


def zenoh_echo():
    import zenoh
    z = zenoh.open(zenoh.Config()); pub = z.declare_publisher('gos/pong')
    z.declare_subscriber('gos/ping', lambda s: pub.put(s.payload)); time.sleep(120)


if __name__ == '__main__':
    print('mujoco', mujoco.__version__, 'python', sys.version.split()[0], flush=True)
    {'mujoco': bench_mujoco, 'mink': bench_mink, 'transport': bench_transport}[sys.argv[1]]() if len(sys.argv) > 1 else (bench_mujoco(), bench_mink(), bench_transport())
