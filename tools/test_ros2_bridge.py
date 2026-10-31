"""GOS G8 check: a stock ROS 2 program and GOS talk through the bridge, both ways.

usage: py -3.12 tools/test_ros2_bridge.py      (needs ros2/ installed with pixi, plus eclipse-zenoh in it)
Three processes: a GOS simulation, the bridge (inside ROS 2), and a plain rclpy listener/commander.
"""
import json, os, subprocess, sys, textwrap, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(ROOT, 'gos', 'python'))
import gos

PIXI = os.path.expanduser(os.path.join('~', 'AppData', 'Local', 'pixi', 'bin', 'pixi.exe')) if os.name == 'nt' else 'pixi'
ROS = os.path.join(ROOT, 'ros2')
PORT = 'tcp/127.0.0.1:17449'
ros_node = textwrap.dedent('''
    import rclpy, time
    from rclpy.node import Node
    from sensor_msgs.msg import JointState
    rclpy.init(); n = Node('stock_listener'); got = []
    n.create_subscription(JointState, '/joint_states', got.append, 10)
    cmd = n.create_publisher(JointState, '/joint_command', 10)
    t = time.time()
    while not got and time.time() - t < 40: rclpy.spin_once(n, timeout_sec=0.1)
    print('ROS GOT', len(got[-1].name) if got else 0, got[-1].name[2] if got else '', flush=True)
    for _ in range(30):
        m = JointState(); m.name = ['J_B1_bend']; m.position = [0.33]; cmd.publish(m); rclpy.spin_once(n, timeout_sec=0.1)
    rclpy.shutdown()
''')
bad = []
module = json.load(open(os.path.join(ROOT, 'studio', 'src', 'core', 'factory', 'single-module-demo.json'), encoding='utf-8'))
with gos.App(transport='zenoh', listen=[PORT]) as app:
    app.load_document(module)
    commands = []
    app.topic('/joint_command').subscribe(commands.append)
    bridge = subprocess.Popen([PIXI, 'run', 'python', os.path.join(ROOT, 'gos', 'ros2_bridge', 'gos_ros2_bridge.py'), '--connect', PORT],
                              cwd=ROS, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    listener = subprocess.Popen([PIXI, 'run', 'python', '-c', ros_node], cwd=ROS, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    t = time.time()
    while listener.poll() is None and time.time() - t < 90:
        app.run(seconds=0.05)  # publishes /joints every 10 steps
        time.sleep(0.02)
    out = listener.communicate(timeout=10)[0] if listener.poll() is not None else 'listener still running'
    bridge.kill()
    got = [l for l in out.splitlines() if l.startswith('ROS GOT')]
    ok = got and got[0].split()[2] == '9'
    print(('ok   ' if ok else 'FAIL ') + 'a stock ROS 2 node receives the GOS robot joints', got[0] if got else out[-300:])
    ok or bad.append('to ROS')
    ok = any(c['names'] == ['J_B1_bend'] and abs(c['q'][0] - 0.33) < 1e-9 for c in commands)
    print(('ok   ' if ok else 'FAIL ') + 'a ROS 2 command reaches GOS', f'{len(commands)} commands')
    ok or bad.append('to GOS')
print('FAILED: ' + ', '.join(bad) if bad else 'ROS 2 and GOS talk both ways through the bridge')
sys.exit(1 if bad else 0)
