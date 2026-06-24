//! Controllers + a controller manager — the `ros2_control` role, native.
//!
//! A `Controller` turns the current joint state into a command each control cycle. The
//! `ControllerManager` holds named controllers and runs the active one, so the system can
//! switch behaviors (trajectory follow, hold, teach) without restarting the loop.
//!
//! `JointTrajectoryController` executes a Studio-planned `JointTrajectory`: it samples the
//! trajectory by elapsed time and uses a PID to track that setpoint on the hardware.

use crate::trajectory::JointTrajectory;
use crate::{JointCommand, JointState, Pid};

/// Feedback published each cycle — the equivalent of a ROS FollowJointTrajectory
/// action's feedback. Lets the Studio show live progress and tracking error.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct ControllerStatus {
    pub name: String,
    pub elapsed: f64,
    pub duration: f64,
    /// Progress through the trajectory in `[0, 1]` (1.0 for a hold controller).
    pub fraction: f64,
    pub finished: bool,
    /// Per-joint tracking error (setpoint − measured) from the last cycle.
    pub error: Vec<f64>,
}

/// A real-time controller: stateful, ticked once per control cycle.
pub trait Controller {
    fn name(&self) -> &str;
    /// Produce a command for this cycle given the measured state and timestep.
    fn update(&mut self, state: &JointState, dt: f64) -> JointCommand;
    /// True once the controller has nothing more to do (e.g. trajectory complete).
    fn is_finished(&self) -> bool;
    /// Restart from the beginning.
    fn reset(&mut self);
    /// Live feedback (progress + tracking error) for the current cycle.
    fn status(&self) -> ControllerStatus;
}

/// Executes a timed `JointTrajectory` by sampling it over time and tracking with a PID.
pub struct JointTrajectoryController {
    name: String,
    traj: JointTrajectory,
    pid: Pid,
    elapsed: f64,
    finished: bool,
    last_error: Vec<f64>,
}

impl JointTrajectoryController {
    pub fn new(name: impl Into<String>, traj: JointTrajectory, pid: Pid) -> Self {
        JointTrajectoryController { name: name.into(), traj, pid, elapsed: 0.0, finished: false, last_error: Vec::new() }
    }

    /// Load a new trajectory and restart execution.
    pub fn set_trajectory(&mut self, traj: JointTrajectory) {
        self.traj = traj;
        self.reset();
    }

    pub fn elapsed(&self) -> f64 {
        self.elapsed
    }
}

impl Controller for JointTrajectoryController {
    fn name(&self) -> &str {
        &self.name
    }

    fn update(&mut self, state: &JointState, dt: f64) -> JointCommand {
        if self.traj.is_empty() {
            self.finished = true;
            return JointCommand { effort: vec![0.0; state.position.len()] };
        }
        self.elapsed += dt;
        let setpoint = self.traj.sample(self.elapsed);
        // velocity feed-forward = trajectory slope (finite difference), so the controller
        // anticipates the motion instead of chasing it (ros2_control-style).
        let ahead = self.traj.sample(self.elapsed + dt);
        let vel_ff: Vec<f64> = setpoint
            .iter()
            .enumerate()
            .map(|(i, sp)| if dt > 0.0 { (ahead.get(i).copied().unwrap_or(*sp) - sp) / dt } else { 0.0 })
            .collect();
        self.last_error = setpoint
            .iter()
            .enumerate()
            .map(|(i, sp)| sp - state.position.get(i).copied().unwrap_or(0.0))
            .collect();
        let cmd = self.pid.update_tracking(&setpoint, &vel_ff, state, dt);
        if self.elapsed >= self.traj.duration() {
            self.finished = true;
        }
        cmd
    }

    fn is_finished(&self) -> bool {
        self.finished
    }

    fn reset(&mut self) {
        self.elapsed = 0.0;
        self.finished = false;
        self.last_error.clear();
        self.pid.reset();
    }

    fn status(&self) -> ControllerStatus {
        let duration = self.traj.duration();
        let fraction = if duration > 0.0 { (self.elapsed / duration).clamp(0.0, 1.0) } else { 1.0 };
        ControllerStatus {
            name: self.name.clone(),
            elapsed: self.elapsed,
            duration,
            fraction,
            finished: self.finished,
            error: self.last_error.clone(),
        }
    }
}

/// Holds a fixed joint configuration with PID — the safe default behavior (e.g. after a
/// trajectory completes, on fault recovery, or "stop & hold"). Never reports finished.
pub struct HoldController {
    name: String,
    target: Vec<f64>,
    pid: Pid,
    last_error: Vec<f64>,
}

impl HoldController {
    pub fn new(name: impl Into<String>, target: Vec<f64>, pid: Pid) -> Self {
        HoldController { name: name.into(), target, pid, last_error: Vec::new() }
    }

    /// Change the held setpoint (e.g. capture the current pose to hold here).
    pub fn set_target(&mut self, target: Vec<f64>) {
        self.target = target;
    }
}

impl Controller for HoldController {
    fn name(&self) -> &str {
        &self.name
    }

    fn update(&mut self, state: &JointState, dt: f64) -> JointCommand {
        self.last_error = self
            .target
            .iter()
            .enumerate()
            .map(|(i, sp)| sp - state.position.get(i).copied().unwrap_or(0.0))
            .collect();
        self.pid.update(&self.target, state, dt)
    }

    fn is_finished(&self) -> bool {
        false // holding is open-ended
    }

    fn reset(&mut self) {
        self.last_error.clear();
        self.pid.reset();
    }

    fn status(&self) -> ControllerStatus {
        ControllerStatus {
            name: self.name.clone(),
            elapsed: 0.0,
            duration: 0.0,
            fraction: 1.0,
            finished: false,
            error: self.last_error.clone(),
        }
    }
}

/// Holds named controllers and runs the active one each cycle.
pub struct ControllerManager {
    controllers: Vec<Box<dyn Controller>>,
    active: Option<usize>,
}

impl Default for ControllerManager {
    fn default() -> Self {
        ControllerManager { controllers: Vec::new(), active: None }
    }
}

impl ControllerManager {
    pub fn new() -> Self {
        Self::default()
    }

    /// Register a controller (inactive until `activate`d).
    pub fn load(&mut self, c: Box<dyn Controller>) {
        self.controllers.push(c);
    }

    /// Load a controller, replacing any existing one with the same name, and activate it.
    /// Use for live goal updates (re-sending "arm_traj" swaps in the new trajectory rather
    /// than stacking duplicates).
    pub fn load_and_activate(&mut self, c: Box<dyn Controller>) {
        let name = c.name().to_string();
        self.controllers.retain(|x| x.name() != name);
        self.controllers.push(c);
        self.active = None;
        self.activate(&name);
    }

    /// Make the named controller the active one; returns false if not found.
    pub fn activate(&mut self, name: &str) -> bool {
        if let Some(i) = self.controllers.iter().position(|c| c.name() == name) {
            self.controllers[i].reset();
            self.active = Some(i);
            true
        } else {
            false
        }
    }

    pub fn deactivate(&mut self) {
        self.active = None;
    }

    pub fn controller_count(&self) -> usize {
        self.controllers.len()
    }

    pub fn active_name(&self) -> Option<&str> {
        self.active.map(|i| self.controllers[i].name())
    }

    /// True if there is an active controller and it has finished.
    pub fn active_finished(&self) -> bool {
        self.active.map(|i| self.controllers[i].is_finished()).unwrap_or(false)
    }

    /// Run the active controller for one cycle (None if nothing is active).
    pub fn update(&mut self, state: &JointState, dt: f64) -> Option<JointCommand> {
        let i = self.active?;
        Some(self.controllers[i].update(state, dt))
    }

    /// Live feedback for the active controller (None if nothing is active).
    pub fn active_status(&self) -> Option<ControllerStatus> {
        self.active.map(|i| self.controllers[i].status())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::trajectory::TrajPoint;
    use crate::{CyclicExecutor, HardwareInterface, SimHardware};

    fn ramp_traj() -> JointTrajectory {
        JointTrajectory::new(vec![
            TrajPoint { t: 0.0, positions: vec![0.0, 0.0] },
            TrajPoint { t: 1.0, positions: vec![0.5, -0.3] },
        ])
    }

    #[test]
    fn trajectory_controller_tracks_and_finishes() {
        let mut hw = SimHardware::new(2);
        let pid = Pid::new(2, 90.0, 6.0, 14.0, 60.0);
        let mut ctrl = JointTrajectoryController::new("arm_traj", ramp_traj(), pid);
        let exec = CyclicExecutor::new(1000.0);

        // run for 1.5 s (trajectory is 1 s) so it settles at the final point
        exec.step_n(1500, |_k, dt| {
            let st = hw.read();
            let cmd = ctrl.update(&st, dt);
            hw.write(&cmd, dt);
        });

        assert!(ctrl.is_finished(), "trajectory should be complete");
        let s = hw.read();
        assert!((s.position[0] - 0.5).abs() < 1e-2, "j0 {}", s.position[0]);
        assert!((s.position[1] + 0.3).abs() < 1e-2, "j1 {}", s.position[1]);
    }

    #[test]
    fn trajectory_status_reports_progress_and_error() {
        let mut ctrl = JointTrajectoryController::new("t", ramp_traj(), Pid::new(2, 50.0, 0.0, 5.0, 40.0));
        let s0 = JointState { position: vec![0.0, 0.0], velocity: vec![0.0, 0.0] };

        // before any update: no progress
        assert_eq!(ctrl.status().fraction, 0.0);

        ctrl.update(&s0, 0.5); // halfway through the 1 s trajectory
        let st = ctrl.status();
        assert!((st.fraction - 0.5).abs() < 1e-9, "fraction {}", st.fraction);
        assert!(!st.finished);
        assert_eq!(st.error.len(), 2, "per-joint error reported");

        ctrl.update(&s0, 0.6); // past the end
        assert!(ctrl.status().finished);
        assert!((ctrl.status().fraction - 1.0).abs() < 1e-9);
    }

    #[test]
    fn hold_controller_holds_target_and_never_finishes() {
        let mut hw = SimHardware::with_positions(vec![0.4, -0.1]);
        let mut hold = HoldController::new("hold", vec![0.0, 0.0], Pid::new(2, 80.0, 4.0, 12.0, 50.0));
        CyclicExecutor::new(1000.0).step_n(3000, |_k, dt| {
            let st = hw.read();
            let c = hold.update(&st, dt);
            hw.write(&c, dt);
        });
        let p = hw.read().position;
        assert!(p[0].abs() < 1e-2 && p[1].abs() < 1e-2, "held near target: {p:?}");
        assert!(!hold.is_finished(), "hold is open-ended");
        assert_eq!(hold.status().fraction, 1.0);
    }

    #[test]
    fn manager_runs_only_the_active_controller() {
        let mut mgr = ControllerManager::new();
        let pid = Pid::new(2, 50.0, 0.0, 5.0, 40.0);
        mgr.load(Box::new(JointTrajectoryController::new("traj", ramp_traj(), pid)));

        let state = JointState { position: vec![0.0, 0.0], velocity: vec![0.0, 0.0] };
        // nothing active yet
        assert!(mgr.update(&state, 0.001).is_none());
        assert!(!mgr.activate("missing"));
        assert!(mgr.activate("traj"));
        assert_eq!(mgr.active_name(), Some("traj"));
        assert!(mgr.update(&state, 0.001).is_some());

        mgr.deactivate();
        assert!(mgr.update(&state, 0.001).is_none());
    }

    #[test]
    fn load_and_activate_replaces_same_name() {
        let mut mgr = ControllerManager::new();
        let pid = || Pid::new(2, 50.0, 0.0, 5.0, 40.0);
        mgr.load_and_activate(Box::new(JointTrajectoryController::new("arm", ramp_traj(), pid())));
        mgr.load_and_activate(Box::new(JointTrajectoryController::new("arm", ramp_traj(), pid())));
        // only one "arm" controller exists and it is active
        assert_eq!(mgr.active_name(), Some("arm"));
        let state = JointState { position: vec![0.0, 0.0], velocity: vec![0.0, 0.0] };
        assert!(mgr.update(&state, 0.001).is_some());
        assert_eq!(mgr.controller_count(), 1, "replaced, not stacked");
    }
}
