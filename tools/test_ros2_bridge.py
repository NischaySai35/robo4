"""GOS G8 check: a stock ROS 2 program and GOS talk through the bridge, both ways: joints, any message type, a service, tf.

usage: py -3.12 tools/test_ros2_bridge.py      (needs ros2/ installed with pixi, plus eclipse-zenoh in it)
Three processes: a GOS simulation, the bridge (inside ROS 2), and a plain rclpy program.
"""
import json, os, subprocess, sys, textwrap, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(ROOT, 'gos', 'python'))
import gos
from gos import tf

PIXI = os.path.expanduser(os.path.join('~', 'AppData', 'Local', 'pixi', 'bin', 'pixi.exe')) if os.name == 'nt' else 'pixi'
ROS = os.path.join(ROOT, 'ros2')
PORT = 'tcp/127.0.0.1:17449'


def mobile():
    """--mobile (A18): a stock ROS 2 program drives the GOS mobile robot with Twist on /cmd_vel and reads Odometry on /odom,
    like ROS's TurtleBot demo. Separate from the main run, which is near the two-minute limit on its own."""
    from gos.examples_mobile import MobileRobot
    driver = textwrap.dedent('''
        import rclpy, time
        from rclpy.node import Node
        from geometry_msgs.msg import Twist
        from nav_msgs.msg import Odometry
        rclpy.init(); n = Node('ros_driver'); odom = []
        n.create_subscription(Odometry, '/odom', odom.append, 10)
        pub = n.create_publisher(Twist, '/cmd_vel', 10)
        t = time.time()
        while not odom and time.time() - t < 40: rclpy.spin_once(n, timeout_sec=0.1)
        x0 = odom[-1].pose.pose.position.x if odom else None
        t = time.time()
        while time.time() - t < 6:
            m = Twist(); m.linear.x = 0.2; pub.publish(m); rclpy.spin_once(n, timeout_sec=0.05)
        print('ODOM', x0, odom[-1].pose.pose.position.x if odom else None, len(odom), flush=True)
        rclpy.shutdown()
    ''')
    with gos.App(transport='zenoh', listen=[PORT]) as app:
        bot = MobileRobot(app)
        bridge = subprocess.Popen([PIXI, 'run', 'python', os.path.join(ROOT, 'gos', 'ros2_bridge', 'gos_ros2_bridge.py'), '--connect', PORT,
                                   '--from-ros', '/cmd_vel=/cmd_vel:geometry_msgs/msg/Twist', '--to-ros', '/odom=/odom:nav_msgs/msg/Odometry'],
                                  cwd=ROS, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        ros = subprocess.Popen([PIXI, 'run', 'python', '-c', driver], cwd=ROS, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        t = time.time()
        while ros.poll() is None and time.time() - t < 100:
            bot.run(0.05); time.sleep(0.03)  # roughly real time
        out = ros.communicate(timeout=10)[0] if ros.poll() is not None else 'the ROS program was still running'
        bridge.kill()
    line = next((l for l in out.splitlines() if l.startswith('ODOM')), '')
    parts = line.split()
    ok = len(parts) == 4 and parts[1] != 'None' and float(parts[2]) - float(parts[1]) > 0.3
    print(('ok   ' if ok else 'FAIL ') + 'a ROS 2 program drives the GOS mobile robot and reads its odometry: ' + (line or out[-300:]))
    sys.exit(0 if ok else 1)


if '--mobile' in sys.argv: mobile()
ros_node = textwrap.dedent('''
    import rclpy, time
    from rclpy.node import Node
    from sensor_msgs.msg import JointState
    from geometry_msgs.msg import Twist
    from tf2_msgs.msg import TFMessage
    from std_srvs.srv import SetBool
    from rclpy.action import ActionClient
    from example_interfaces.action import Fibonacci
    rclpy.init(); n = Node('stock_ros_program'); got, twist, tfs = [], [], []
    n.create_subscription(JointState, '/joint_states', got.append, 10)
    n.create_subscription(Twist, '/cmd_vel', twist.append, 10)
    n.create_subscription(TFMessage, '/tf', tfs.append, 100)
    cmd = n.create_publisher(JointState, '/joint_command', 10)
    speed = n.create_publisher(Twist, '/ros_speed', 10)
    cli = n.create_client(SetBool, '/set_lock')
    t = time.time()
    while not (got and twist and tfs) and time.time() - t < 40: rclpy.spin_once(n, timeout_sec=0.1)
    print('ROS GOT', len(got[-1].name) if got else 0, got[-1].name[2] if got else '', flush=True)
    print('TWIST', twist[-1].linear.x if twist else None, flush=True)
    print('TF', [(x.header.frame_id, x.child_frame_id, round(x.transform.translation.z, 3)) for m in tfs[-1:] for x in m.transforms], flush=True)
    for _ in range(30):
        m = JointState(); m.name = ['J_B1_bend']; m.position = [0.33]; cmd.publish(m)
        s = Twist(); s.angular.z = 0.7; speed.publish(s); rclpy.spin_once(n, timeout_sec=0.1)
    if cli.wait_for_service(timeout_sec=10):
        f = cli.call_async(SetBool.Request(data=True)); rclpy.spin_until_future_complete(n, f, timeout_sec=10)
        r = f.result(); print('SERVICE', r.success if r else None, r.message if r else '', flush=True)
    else: print('SERVICE none', flush=True)
    ac = ActionClient(n, Fibonacci, '/fib'); fbs = []
    if ac.wait_for_server(timeout_sec=10):
        f = ac.send_goal_async(Fibonacci.Goal(order=6), feedback_callback=lambda m: fbs.append(list(m.feedback.sequence)))
        rclpy.spin_until_future_complete(n, f, timeout_sec=10); h = f.result()
        r = h.get_result_async(); rclpy.spin_until_future_complete(n, r, timeout_sec=15)
        print('ACTION', list(r.result().result.sequence), len(fbs), r.result().status, flush=True)
        f = ac.send_goal_async(Fibonacci.Goal(order=200)); rclpy.spin_until_future_complete(n, f, timeout_sec=10); h = f.result()
        time.sleep(0.3); c = h.cancel_goal_async(); rclpy.spin_until_future_complete(n, c, timeout_sec=10)
        r = h.get_result_async(); rclpy.spin_until_future_complete(n, r, timeout_sec=15)
        print('CANCELED', r.result().status, flush=True)
    else: print('ACTION none', flush=True)
    rclpy.shutdown()
''')
bad = []


def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + (f': {detail}' if detail else ''), flush=True)
    if not ok: bad.append(name)


module = json.load(open(os.path.join(ROOT, 'studio', 'src', 'core', 'factory', 'single-module-demo.json'), encoding='utf-8'))
with gos.App(transport='zenoh', listen=[PORT]) as app:
    app.load_document(module)
    commands, speeds = [], []
    app.topic('/joint_command').subscribe(commands.append)
    app.topic('/gos_speed').subscribe(speeds.append)
    def fib(goal, feedback, cancelled):
        s = [0, 1]
        for _ in range(goal['order'] - 1):
            if cancelled(): return {'sequence': s}
            s.append(s[-1] + s[-2]); feedback({'sequence': s}); time.sleep(0.05)
        return {'sequence': s}
    app.actions.advertise('/robot/fib', fib)
    app.services.advertise('/arm/set_lock', lambda r: {'success': bool(r['data']), 'message': 'locked' if r['data'] else 'open'})
    cam = tf.Broadcaster(app)
    bridge = subprocess.Popen([PIXI, 'run', 'python', os.path.join(ROOT, 'gos', 'ros2_bridge', 'gos_ros2_bridge.py'), '--connect', PORT,
                               '--to-ros', '/cmd=/cmd_vel:geometry_msgs/msg/Twist', '--from-ros', '/ros_speed=/gos_speed:geometry_msgs/msg/Twist',
                               '--service', '/set_lock=/arm/set_lock:std_srvs/srv/SetBool', '--action', '/fib=/robot/fib:example_interfaces/action/Fibonacci'],
                              cwd=ROS, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    listener = subprocess.Popen([PIXI, 'run', 'python', '-c', ros_node], cwd=ROS, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    t = time.time()
    while listener.poll() is None and time.time() - t < 100:
        app.run(seconds=0.05)  # publishes /joints every 10 steps
        app.topic('/cmd').publish({'linear': {'x': 1.5, 'y': 0.0, 'z': 0.0}, 'angular': {'x': 0.0, 'y': 0.0, 'z': 0.0}})
        cam.send('base', 'camera', [0, 0, 0.3], [0, 0, 0, 1], t=app.now())
        time.sleep(0.02)
    out = listener.communicate(timeout=10)[0] if listener.poll() is not None else 'the ROS program was still running'
    bridge.kill()
    line = lambda k: next((l for l in out.splitlines() if l.startswith(k)), '')
    got = line('ROS GOT')
    check('a stock ROS 2 node receives the GOS robot joints', bool(got) and got.split()[2] == '9', got or out[-300:])
    check('a ROS 2 command reaches GOS', any(c['names'] == ['J_B1_bend'] and abs(c['q'][0] - 0.33) < 1e-9 for c in commands), f'{len(commands)} commands')
    check('a GOS topic arrives in ROS 2 as a Twist', line('TWIST') == 'TWIST 1.5', line('TWIST'))
    check('a ROS 2 Twist arrives in GOS as the same fields', any(abs(s['angular']['z'] - 0.7) < 1e-9 for s in speeds), f'{len(speeds)} messages')
    check('GOS transforms arrive on ROS /tf', "('base', 'camera', 0.3)" in line('TF'), line('TF'))
    check('a ROS 2 client calls a GOS service', line('SERVICE') == 'SERVICE True locked', line('SERVICE'))
    a = line('ACTION').split(' ', 1)[-1]
    check('a ROS 2 action goal runs in GOS with feedback and a result', a.startswith('[0, 1, 1, 2, 3, 5, 8]') and a.endswith(' 4') and int(a.split()[-2]) >= 3, line('ACTION'))
    check('cancelling from ROS 2 cancels the GOS action', line('CANCELED') == 'CANCELED 5', line('CANCELED'))
print('FAILED: ' + ', '.join(bad) if bad else 'ROS 2 and GOS talk both ways through the bridge: joints, any type, a service, an action, tf')
sys.exit(1 if bad else 0)
