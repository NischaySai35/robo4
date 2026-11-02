"""A complete small mobile robot, like ROS's TurtleBot demos: a two-wheel robot in MuJoCo that drives from /cmd_vel
(geometry_msgs/Twist fields: linear.x m/s, angular.z rad/s) and reports /odom (nav_msgs/Odometry fields) and /tf.
Through the ROS 2 bridge, ROS tools drive and see it:  --from-ros /cmd_vel=/cmd_vel:geometry_msgs/msg/Twist
--to-ros /odom=/odom:nav_msgs/msg/Odometry.

    with gos.App() as app:
        bot = gos.examples_mobile.MobileRobot(app)
        app.topic('/cmd_vel').publish({'linear': {'x': 0.2, 'y': 0, 'z': 0}, 'angular': {'x': 0, 'y': 0, 'z': 0}})
        bot.run(2.0)
"""
# REUSE-CHECKED: cmd_vel|differential|diff.?drive|odometry|wheel -> only the Studio's in-browser Jolt wheel contact
# (features/gravity/wheelContact.ts) and TS SLAM (robotics/nav); nothing in Python/MuJoCo or GOS drives a wheeled base.
import math, os, tempfile

from . import tf

WHEEL_R, HALF_TRACK = 0.033, 0.08
ROBOT = f'''<mujoco model="mobile"><compiler angle="radian"/><option timestep="0.002" integrator="implicitfast"/>
<worldbody><geom name="floor" type="plane" size="5 5 0.1" friction="1 0.01 0.001"/>
<body name="base" pos="0 0 {WHEEL_R + 0.005}"><freejoint name="base"/>
 <geom type="box" size="0.09 0.07 0.02" mass="1.0" pos="0 0 0.01"/>
 <geom name="caster" type="sphere" size="0.012" pos="-0.07 0 {-(WHEEL_R - 0.012) + 0.005}" friction="0.05 0.001 0.001" mass="0.02"/>
 <body name="wheel_l" pos="0.02 {HALF_TRACK} 0"><joint name="wheel_l" type="hinge" axis="0 1 0" damping="0.001"/>
  <geom type="cylinder" size="{WHEEL_R} 0.008" quat="0.7071068 0.7071068 0 0" mass="0.05" friction="1.5 0.01 0.001"/></body>
 <body name="wheel_r" pos="0.02 {-HALF_TRACK} 0"><joint name="wheel_r" type="hinge" axis="0 1 0" damping="0.001"/>
  <geom type="cylinder" size="{WHEEL_R} 0.008" quat="0.7071068 0.7071068 0 0" mass="0.05" friction="1.5 0.01 0.001"/></body>
</body></worldbody>
<actuator><velocity name="wheel_l" joint="wheel_l" kv="0.4" ctrlrange="-30 30"/><velocity name="wheel_r" joint="wheel_r" kv="0.4" ctrlrange="-30 30"/></actuator>
</mujoco>'''


class MobileRobot:
    def __init__(self, app, cmd_topic='/cmd_vel', odom_topic='/odom'):
        path = os.path.join(tempfile.mkdtemp(prefix='gos_mobile_'), 'mobile.xml')
        with open(path, 'w') as f: f.write(ROBOT)
        app.load(path)
        self.app, self.cmd = app, (0.0, 0.0)
        self.odom = app.topic(odom_topic)
        self.tf = tf.Broadcaster(app)
        app.topic(cmd_topic).subscribe(self._on_cmd)

    def _on_cmd(self, m):
        self.cmd = (float(m.get('linear', {}).get('x', 0.0)), float(m.get('angular', {}).get('z', 0.0)))

    def pose(self):
        """x, y (m) and heading (rad) of the base."""
        q = self.app.data.qpos
        return float(q[0]), float(q[1]), 2 * math.atan2(q[6], q[3])

    def run(self, seconds, publish_every=0.05):
        """Drive for this long of simulated time, wheels following the last /cmd_vel, publishing /odom and /tf."""
        app, m = self.app, self.app.model
        steps, every = max(1, round(seconds / m.opt.timestep)), max(1, round(publish_every / m.opt.timestep))
        for k in range(steps):
            v, w = self.cmd  # differential drive: each wheel's speed from the body's forward and turning speed
            app.data.ctrl[0] = (v - w * HALF_TRACK) / WHEEL_R
            app.data.ctrl[1] = (v + w * HALF_TRACK) / WHEEL_R
            app.run(steps=1, publish_every=0)
            if k % every == 0: self._publish()

    def _publish(self):
        d = self.app.data
        x, y, _ = self.pose()
        q = [float(d.qpos[4]), float(d.qpos[5]), float(d.qpos[6]), float(d.qpos[3])]
        t = float(d.time)
        self.odom.publish({'header': {'stamp': {'sec': int(t), 'nanosec': int((t % 1) * 1e9)}, 'frame_id': 'odom'}, 'child_frame_id': 'base',
                           'pose': {'pose': {'position': {'x': x, 'y': y, 'z': float(d.qpos[2])}, 'orientation': dict(zip('xyzw', q))}},
                           'twist': {'twist': {'linear': {'x': float(d.qvel[0]), 'y': float(d.qvel[1]), 'z': 0.0}, 'angular': {'x': 0.0, 'y': 0.0, 'z': float(d.qvel[5])}}}})
        self.tf.send('odom', 'base', [x, y, float(d.qpos[2])], q, t)
