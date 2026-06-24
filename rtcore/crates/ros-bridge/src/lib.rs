//! ros-bridge — bidirectional bridge between RT Core's internal bus and ROS 2 topics.
//!
//! This is the migration on-ramp: a customer keeps their existing ROS 2 drivers/tools and
//! talks to RT Core over standard topics, while we run the deterministic loop natively.
//! "Replace ROS" is the destination; "interoperate with ROS" is what gets us in the door.
//!
//! The actual DDS/`rclrs` wire is abstracted behind `RosTransport`, so the bridge logic is
//! testable with no ROS install. The real implementation (`RclrsTransport: RosTransport`)
//! is a drop-in later; the bridge code below does not change.
//!
//! Bridged today:
//!   * OUT: internal `JointState` → ROS `/joint_states`
//!   * IN : ROS `/joint_trajectory` (a goal) → internal `JointTrajectory` topic
//!          (which a `JointTrajectoryController` consumes)

use std::collections::{HashMap, VecDeque};

use rt_bus::{Subscription, Topic};
use rt_control::trajectory::JointTrajectory;
use rt_control::{ControllerStatus, JointState};

/// The payloads we bridge. Maps 1:1 to ROS `sensor_msgs/JointState`,
/// `trajectory_msgs/JointTrajectory`, and a FollowJointTrajectory feedback message.
#[derive(Clone, Debug, PartialEq)]
pub enum RosMsg {
    JointState(JointState),
    JointTrajectory(JointTrajectory),
    ControllerStatus(ControllerStatus),
    /// Monitored-stop command: `true` = trip e-stop, `false` = reset (ROS `std_msgs/Bool`).
    EStop(bool),
}

/// The pluggable ROS 2 transport. Real impl wraps `rclrs`; the sim impl is in-memory.
pub trait RosTransport {
    /// Publish a message on a ROS topic (outgoing, RT Core → ROS).
    fn publish(&mut self, topic: &str, msg: RosMsg);
    /// Take all messages received on a ROS topic since last call (incoming, ROS → RT Core).
    fn take_incoming(&mut self, topic: &str) -> Vec<RosMsg>;
}

/// In-memory transport for tests/demos: records outgoing publications and lets a test
/// inject incoming messages as if a ROS node had sent them.
#[derive(Default)]
pub struct SimRosTransport {
    outgoing: HashMap<String, Vec<RosMsg>>,
    incoming: HashMap<String, VecDeque<RosMsg>>,
}

impl SimRosTransport {
    pub fn new() -> Self {
        Self::default()
    }

    /// Simulate a ROS node publishing `msg` on `topic` (for the bridge to pick up).
    pub fn inject_incoming(&mut self, topic: &str, msg: RosMsg) {
        self.incoming.entry(topic.to_string()).or_default().push_back(msg);
    }

    /// Everything the bridge has published on `topic` so far.
    pub fn published(&self, topic: &str) -> &[RosMsg] {
        self.outgoing.get(topic).map(|v| v.as_slice()).unwrap_or(&[])
    }
}

impl RosTransport for SimRosTransport {
    fn publish(&mut self, topic: &str, msg: RosMsg) {
        self.outgoing.entry(topic.to_string()).or_default().push(msg);
    }
    fn take_incoming(&mut self, topic: &str) -> Vec<RosMsg> {
        self.incoming.get_mut(topic).map(|q| q.drain(..).collect()).unwrap_or_default()
    }
}

/// Topic name configuration (defaults match ROS conventions).
#[derive(Clone, Debug)]
pub struct BridgeTopics {
    pub joint_states: String,
    pub joint_trajectory: String,
    pub controller_status: String,
    pub estop: String,
}

impl Default for BridgeTopics {
    fn default() -> Self {
        BridgeTopics {
            joint_states: "/joint_states".to_string(),
            joint_trajectory: "/joint_trajectory".to_string(),
            controller_status: "/controller_status".to_string(),
            estop: "/estop".to_string(),
        }
    }
}

/// Pumps messages both ways between the internal bus and a `RosTransport`.
pub struct Bridge<T: RosTransport> {
    transport: T,
    topics: BridgeTopics,
    state_sub: Subscription<JointState>,
    traj_pub: Topic<JointTrajectory>,
    status_sub: Option<Subscription<ControllerStatus>>,
    estop_pub: Option<Topic<bool>>,
}

impl<T: RosTransport> Bridge<T> {
    /// `state_topic`: internal topic the control loop publishes measured state on.
    /// `traj_topic`: internal topic the bridge republishes incoming ROS goals onto
    /// (the `JointTrajectoryController` subscribes to it).
    pub fn new(
        transport: T,
        state_topic: &Topic<JointState>,
        traj_topic: Topic<JointTrajectory>,
        topics: BridgeTopics,
    ) -> Self {
        Bridge {
            transport,
            topics,
            state_sub: state_topic.subscribe(),
            traj_pub: traj_topic,
            status_sub: None,
            estop_pub: None,
        }
    }

    /// Also bridge controller status/feedback out to ROS (`controller_status` topic).
    /// Call once after construction with the internal status topic the loop publishes on.
    pub fn bridge_status(&mut self, status_topic: &Topic<ControllerStatus>) {
        self.status_sub = Some(status_topic.subscribe());
    }

    /// Route incoming ROS `/estop` (Bool) commands onto an internal topic the control
    /// loop reads to trip/reset its `SafetyMonitor`.
    pub fn bridge_estop(&mut self, estop_topic: &Topic<bool>) {
        self.estop_pub = Some(estop_topic.clone());
    }

    /// Borrow the transport (e.g. to inspect/inject in tests).
    pub fn transport_mut(&mut self) -> &mut T {
        &mut self.transport
    }

    /// Pump both directions once. Returns (messages_out, trajectories_in), where
    /// messages_out counts joint states plus any bridged controller-status messages.
    pub fn spin(&mut self) -> (usize, usize) {
        // OUT: internal joint states → ROS /joint_states
        let states = self.state_sub.drain();
        let mut out = states.len();
        for s in states {
            self.transport.publish(&self.topics.joint_states, RosMsg::JointState(s));
        }
        // OUT: controller status/feedback → ROS /controller_status (if configured)
        if let Some(sub) = &self.status_sub {
            let statuses = sub.drain();
            out += statuses.len();
            for st in statuses {
                self.transport.publish(&self.topics.controller_status, RosMsg::ControllerStatus(st));
            }
        }
        // IN: ROS /joint_trajectory goals → internal trajectory topic
        let incoming = self.transport.take_incoming(&self.topics.joint_trajectory);
        let mut inn = 0;
        for m in incoming {
            if let RosMsg::JointTrajectory(t) = m {
                self.traj_pub.publish(t);
                inn += 1;
            }
        }
        // IN: ROS /estop (Bool) → internal e-stop topic (safety-critical: always routed)
        if let Some(estop) = &self.estop_pub {
            for m in self.transport.take_incoming(&self.topics.estop) {
                if let RosMsg::EStop(b) = m {
                    estop.publish(b);
                    inn += 1;
                }
            }
        }
        (out, inn)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rt_control::trajectory::TrajPoint;

    #[test]
    fn bridges_internal_state_out_to_ros() {
        let state_topic: Topic<JointState> = Topic::new(16);
        let traj_topic: Topic<JointTrajectory> = Topic::new(4);
        let mut bridge = Bridge::new(
            SimRosTransport::new(),
            &state_topic,
            traj_topic,
            BridgeTopics::default(),
        );

        state_topic.publish(JointState { position: vec![1.0, 2.0], velocity: vec![0.0, 0.0] });
        state_topic.publish(JointState { position: vec![1.1, 2.1], velocity: vec![0.1, 0.1] });

        let (out, inn) = bridge.spin();
        assert_eq!((out, inn), (2, 0));
        assert_eq!(bridge.transport_mut().published("/joint_states").len(), 2);
    }

    #[test]
    fn bridges_controller_status_out_when_configured() {
        let state_topic: Topic<JointState> = Topic::new(16);
        let traj_topic: Topic<JointTrajectory> = Topic::new(4);
        let status_topic: Topic<ControllerStatus> = Topic::new(16);
        let mut bridge = Bridge::new(SimRosTransport::new(), &state_topic, traj_topic, BridgeTopics::default());
        bridge.bridge_status(&status_topic);

        status_topic.publish(ControllerStatus {
            name: "arm_traj".into(), elapsed: 0.5, duration: 1.0, fraction: 0.5,
            finished: false, error: vec![0.01, -0.02],
        });
        let (out, _inn) = bridge.spin();
        assert_eq!(out, 1, "one status bridged out");
        assert_eq!(bridge.transport_mut().published("/controller_status").len(), 1);
    }

    #[test]
    fn routes_ros_estop_command_to_internal_topic() {
        let state_topic: Topic<JointState> = Topic::new(16);
        let traj_topic: Topic<JointTrajectory> = Topic::new(4);
        let estop_topic: Topic<bool> = Topic::new(8);
        let estop_sub = estop_topic.subscribe();
        let mut bridge = Bridge::new(SimRosTransport::new(), &state_topic, traj_topic, BridgeTopics::default());
        bridge.bridge_estop(&estop_topic);

        bridge.transport_mut().inject_incoming("/estop", RosMsg::EStop(true));
        bridge.transport_mut().inject_incoming("/estop", RosMsg::EStop(false));
        bridge.spin();
        assert_eq!(estop_sub.drain(), vec![true, false], "e-stop trip then reset routed");
    }

    #[test]
    fn bridges_ros_trajectory_goal_in_to_internal_topic() {
        let state_topic: Topic<JointState> = Topic::new(16);
        let traj_topic: Topic<JointTrajectory> = Topic::new(4);
        let internal_sub = traj_topic.subscribe();
        let mut bridge = Bridge::new(
            SimRosTransport::new(),
            &state_topic,
            traj_topic,
            BridgeTopics::default(),
        );

        // a ROS node sends a trajectory goal
        let goal = JointTrajectory::new(vec![
            TrajPoint { t: 0.0, positions: vec![0.0] },
            TrajPoint { t: 1.0, positions: vec![1.0] },
        ]);
        bridge
            .transport_mut()
            .inject_incoming("/joint_trajectory", RosMsg::JointTrajectory(goal.clone()));

        let (_out, inn) = bridge.spin();
        assert_eq!(inn, 1);
        // it appeared on the internal topic for the controller to consume
        assert_eq!(internal_sub.drain(), vec![goal]);
    }
}
