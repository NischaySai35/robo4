"""GOS <-> ROS 2 bridge (GOS G8). Runs inside a ROS 2 environment (ros2/ in this repo, via pixi).

Always:
- GOS /joints          -> ROS /joint_states (sensor_msgs/JointState), so RViz, MoveIt and any ROS tool see the robot.
- ROS /joint_command   -> GOS /joint_command (sensor_msgs/JointState in, the same names and radians out).
- GOS /tf, /tf_static  -> ROS /tf, /tf_static (tf2_msgs/TFMessage), from gos.tf.

On request, any ROS 2 type, converted field by field (GOS messages are the same fields as plain dicts):
  --to-ros   /gos_topic=/ros_topic:geometry_msgs/msg/Twist
  --from-ros /ros_topic=/gos_topic:nav_msgs/msg/Odometry
  --service  /ros_service=/gos_service:std_srvs/srv/SetBool    (a ROS 2 client calls a GOS service)
  --action   /ros_action=/gos_action:control_msgs/action/FollowJointTrajectory   (goal, feedback, result and cancel)
  --topic /x  mirrors GOS /x to ROS /gos/x as std_msgs/String holding the JSON

usage (from the repo):  cd ros2; pixi run python ../gos/ros2_bridge/gos_ros2_bridge.py --connect tcp/127.0.0.1:7447
The GOS side must listen there:  gos.App(transport='zenoh', listen=['tcp/127.0.0.1:7447']). Use --domain to match its domain.
A tree-only ROS tool sees joints, not loops: loop constraints stay in GOS (see docs/GOS_PARITY.md).
"""
import argparse, json, os, sys, threading, time

import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, DurabilityPolicy
from rclpy.action import ActionServer, CancelResponse, GoalResponse
from rclpy.callback_groups import ReentrantCallbackGroup
from rclpy.executors import MultiThreadedExecutor
from rosidl_runtime_py import message_to_ordereddict, set_message_fields
from rosidl_runtime_py.utilities import get_action, get_message, get_service
from sensor_msgs.msg import JointState
from std_msgs.msg import String
from tf2_msgs.msg import TFMessage
from geometry_msgs.msg import TransformStamped

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python'))
from gos.transport import NamedBus, ZenohTransport  # the same names, namespaces and domains as gos.App
from gos.runtime import Actions


def spec(text, kind):
    """'/a=/b:pkg/kind/Type' -> ('/a', '/b', 'pkg/kind/Type'), with an error that shows the form."""
    try:
        names, type_ = text.rsplit(':', 1); a, b = names.split('=', 1)
        if f'/{kind}/' not in type_: raise ValueError
        return a, b, type_
    except ValueError:
        raise SystemExit(f'"{text}" should look like /from=/to:package/{kind}/Type, e.g. /cmd=/cmd_vel:geometry_msgs/{kind}/Twist')


def to_dict(msg):
    return json.loads(json.dumps(message_to_ordereddict(msg)))


class Bridge(Node):
    def __init__(self, gos, a):
        super().__init__('gos_bridge')
        self.gos, self.lock = gos, threading.Lock()
        self.count = {'to_ros': 0, 'to_gos': 0}
        self.pub = self.create_publisher(JointState, '/joint_states', 10)
        self.create_subscription(JointState, '/joint_command', self.to_gos, 10)
        gos.subscribe('/joints', self.from_gos)
        latched = QoSProfile(depth=100, durability=DurabilityPolicy.TRANSIENT_LOCAL)
        self.tf = {'/tf': self.create_publisher(TFMessage, '/tf', 100), '/tf_static': self.create_publisher(TFMessage, '/tf_static', latched)}
        for t, p in self.tf.items(): gos.subscribe(t, lambda m, p=p: self.send(p, self.tf_msg(m)))
        for t in a.topic:
            p = self.create_publisher(String, '/gos' + t, 10)
            gos.subscribe(t, lambda m, p=p: self.send(p, String(data=json.dumps(m))))
        for s in a.to_ros:
            src, dst, type_ = spec(s, 'msg'); M = get_message(type_); p = self.create_publisher(M, dst, 10)
            gos.subscribe(src, lambda m, M=M, p=p, src=src: self.send(p, self.fill(M(), m, src)))
        for s in a.from_ros:
            src, dst, type_ = spec(s, 'msg')
            self.create_subscription(get_message(type_), src, lambda msg, dst=dst: self.gos.publish(dst, to_dict(msg)), 10)
        for s in a.service:
            ros_name, gos_name, type_ = spec(s, 'srv')
            self.create_service(get_service(type_), ros_name, lambda req, resp, g=gos_name: self.call(g, req, resp))
        self.actions, group = Actions(gos), ReentrantCallbackGroup()
        for s in a.action:
            ros_name, gos_name, type_ = spec(s, 'action'); A = get_action(type_)
            ActionServer(self, A, ros_name, execute_callback=lambda h, A=A, g=gos_name: self.run_action(A, g, h),
                         goal_callback=lambda goal: GoalResponse.ACCEPT, cancel_callback=lambda h: CancelResponse.ACCEPT, callback_group=group)

    def run_action(self, A, gos_name, handle):
        """A ROS 2 goal runs as the GOS action: feedback flows back, a ROS cancel cancels it in GOS, the result is converted."""
        def feedback(m):
            fb = self.fill(A.Feedback(), m, f'{gos_name} feedback')
            if fb is not None: handle.publish_feedback(fb)
        try:
            g = self.actions.send_goal(gos_name, to_dict(handle.request), feedback)
        except Exception as e:
            self.get_logger().error(f'GOS action {gos_name}: {e}'); handle.abort(); return A.Result()
        while g.poll() == 'running':
            if handle.is_cancel_requested: g.cancel()
            time.sleep(0.02)
        g.close()
        result = self.fill(A.Result(), g.result or {}, f'{gos_name} result') if g.status != 'aborted' else None
        if g.status == 'succeeded': handle.succeed()
        elif g.status == 'canceled': handle.canceled()
        else: self.get_logger().error(f'GOS action {gos_name} {g.status}: {g.error}'); handle.abort()
        return result or A.Result()

    def send(self, pub, msg):
        if msg is None: return
        with self.lock:
            pub.publish(msg); self.count['to_ros'] += 1

    def fill(self, msg, data, where):
        try:
            set_message_fields(msg, data); return msg
        except Exception as e:
            self.get_logger().error(f'{where}: {e}. Fields of {type(msg).__name__}: {", ".join(msg.get_fields_and_field_types())}')
            return None

    def call(self, gos_name, req, resp):
        try:
            set_message_fields(resp, self.gos.request(gos_name, to_dict(req), 5.0) or {})
        except Exception as e:
            self.get_logger().error(f'GOS service {gos_name}: {e}')
            if 'message' in resp.get_fields_and_field_types(): resp.message = f'GOS service {gos_name} failed: {e}'
        return resp

    def tf_msg(self, m):
        t = TransformStamped()
        sec = float(m.get('t', 0.0)); t.header.stamp.sec, t.header.stamp.nanosec = int(sec), int((sec % 1) * 1e9)
        t.header.frame_id, t.child_frame_id = m['parent'], m['child']
        t.transform.translation.x, t.transform.translation.y, t.transform.translation.z = (float(v) for v in m['p'])
        t.transform.rotation.x, t.transform.rotation.y, t.transform.rotation.z, t.transform.rotation.w = (float(v) for v in m['q'])
        return TFMessage(transforms=[t])

    def from_gos(self, m):
        msg = JointState()
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.name = list(m['names'])
        msg.position = [float(x) for x in m['q']]
        self.send(self.pub, msg)

    def to_gos(self, msg):
        self.gos.publish('/joint_command', {'names': list(msg.name), 'q': list(msg.position)})
        self.count['to_gos'] += 1


def main():
    a = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    a.add_argument('--connect', default='tcp/127.0.0.1:7447')
    a.add_argument('--domain', type=int, default=0)
    a.add_argument('--topic', action='append', default=[])
    a.add_argument('--to-ros', action='append', default=[])
    a.add_argument('--from-ros', action='append', default=[])
    a.add_argument('--service', action='append', default=[])
    a.add_argument('--action', action='append', default=[])
    args = a.parse_args()
    rclpy.init()
    node = Bridge(NamedBus(ZenohTransport(connect=[args.connect]), domain=args.domain), args)
    print(f'GOS-ROS 2 bridge running: GOS at {args.connect} <-> ROS /joint_states, /joint_command, /tf', flush=True)
    try:
        rclpy.spin(node, executor=MultiThreadedExecutor())  # an action keeps running while feedback and cancels arrive
    except KeyboardInterrupt:
        pass
    finally:
        node.gos.close(); node.destroy_node(); rclpy.try_shutdown()


if __name__ == '__main__':
    main()
