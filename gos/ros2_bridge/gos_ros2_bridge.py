"""GOS <-> ROS 2 bridge (GOS G8). Runs inside a ROS 2 environment (ros2/ in this repo, via pixi).

- GOS /joints          -> ROS /joint_states (sensor_msgs/JointState), so RViz, MoveIt and any ROS tool see the robot.
- ROS /joint_command   -> GOS /joint_command (sensor_msgs/JointState in, the same names and radians out).
- Any other GOS topic named with --topic /x is mirrored to ROS /gos/x as std_msgs/String holding the JSON.

usage (from the repo):  cd ros2; pixi run python ../gos/ros2_bridge/gos_ros2_bridge.py --connect tcp/127.0.0.1:7447
The GOS side must listen there:  gos.App(transport='zenoh', listen=['tcp/127.0.0.1:7447'])
A tree-only ROS tool sees joints, not loops: loop constraints stay in GOS (see docs/GOS_PARITY.md).
"""
import argparse, json, os, sys, threading

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import JointState
from std_msgs.msg import String

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python'))
from gos.transport import ZenohTransport  # one transport implementation, shared with gos.App


class Bridge(Node):
    def __init__(self, gos, extra_topics):
        super().__init__('gos_bridge')
        self.gos = gos
        self.pub = self.create_publisher(JointState, '/joint_states', 10)
        self.create_subscription(JointState, '/joint_command', self.to_gos, 10)
        self.mirrors = {t: self.create_publisher(String, '/gos' + t, 10) for t in extra_topics}
        self.lock = threading.Lock()
        gos.subscribe('/joints', self.from_gos)
        for t in extra_topics:
            gos.subscribe(t, lambda m, t=t: self.mirrors[t].publish(String(data=json.dumps(m))))
        self.count = {'to_ros': 0, 'to_gos': 0}

    def from_gos(self, m):
        msg = JointState()
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.name = list(m['names'])
        msg.position = [float(x) for x in m['q']]
        with self.lock:
            self.pub.publish(msg)
            self.count['to_ros'] += 1

    def to_gos(self, msg):
        self.gos.publish('/joint_command', {'names': list(msg.name), 'q': list(msg.position)})
        self.count['to_gos'] += 1


def main():
    a = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    a.add_argument('--connect', default='tcp/127.0.0.1:7447')
    a.add_argument('--topic', action='append', default=[])
    args = a.parse_args()
    rclpy.init()
    node = Bridge(ZenohTransport(connect=[args.connect]), args.topic)
    print(f'GOS-ROS 2 bridge running: GOS at {args.connect} <-> ROS /joint_states, /joint_command', flush=True)
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.gos.close(); node.destroy_node(); rclpy.try_shutdown()


if __name__ == '__main__':
    main()
