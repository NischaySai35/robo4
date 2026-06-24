//! rt-control — the deterministic, fixed-rate control core.
//!
//! Pieces:
//!   * `HardwareInterface` — the abstraction a real fieldbus (EtherCAT/CANopen) or a
//!     simulator implements: read joint states, write joint commands. The control loop
//!     is written ONLY against this trait, so swapping sim ↔ real hardware changes nothing
//!     above it (this is the `ros2_control` HardwareInterface idea, native).
//!   * `SimHardware` — a first-order joint model standing in for real drives, so the whole
//!     stack runs and is testable with no hardware.
//!   * `Pid` — a per-joint PID with output/integrator clamping.
//!   * `CyclicExecutor` — runs a control callback at a FIXED timestep. `step_n` advances a
//!     deterministic number of cycles (for tests/replay); `run_realtime` paces to wall time
//!     and records jitter, the metric an industrial buyer asks about first.
//!
//! TODO (Phase 2 hardware): `EtherCatHardware: HardwareInterface` over a real master.
//! Nothing above the trait changes when it lands.

use std::time::{Duration, Instant};

pub mod trajectory;
pub mod controller;
pub mod safety;

pub use controller::{
    Controller, ControllerManager, ControllerStatus, HoldController, JointTrajectoryController,
};
pub use safety::{SafetyLimits, SafetyMonitor, SafetyStatus};
pub use trajectory::{JointTrajectory, TrajPoint};

/// Snapshot of every joint's measured state.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct JointState {
    pub position: Vec<f64>,
    pub velocity: Vec<f64>,
}

/// Command written to the drives each cycle (position or effort, per controller).
#[derive(Clone, Debug, Default, PartialEq)]
pub struct JointCommand {
    pub effort: Vec<f64>,
}

/// Anything the control loop can drive: a simulator today, an EtherCAT master tomorrow.
pub trait HardwareInterface {
    fn dof(&self) -> usize;
    /// Latch the latest measured state (called once at the top of each cycle).
    fn read(&self) -> JointState;
    /// Apply a command for the next `dt` seconds (called once at the bottom of each cycle).
    fn write(&mut self, cmd: &JointCommand, dt: f64);
}

/// First-order simulated drives: effort acts as acceleration with light viscous damping.
/// Deterministic given the same commands — good enough to exercise & test the loop.
pub struct SimHardware {
    pos: Vec<f64>,
    vel: Vec<f64>,
    damping: f64,
}

impl SimHardware {
    pub fn new(dof: usize) -> Self {
        SimHardware { pos: vec![0.0; dof], vel: vec![0.0; dof], damping: 2.0 }
    }
    pub fn with_positions(pos: Vec<f64>) -> Self {
        let dof = pos.len();
        SimHardware { pos, vel: vec![0.0; dof], damping: 2.0 }
    }
}

impl HardwareInterface for SimHardware {
    fn dof(&self) -> usize {
        self.pos.len()
    }
    fn read(&self) -> JointState {
        JointState { position: self.pos.clone(), velocity: self.vel.clone() }
    }
    fn write(&mut self, cmd: &JointCommand, dt: f64) {
        for i in 0..self.pos.len() {
            let a = cmd.effort.get(i).copied().unwrap_or(0.0) - self.damping * self.vel[i];
            self.vel[i] += a * dt;
            self.pos[i] += self.vel[i] * dt;
        }
    }
}

/// A clamped PID controller (one gain set applied per joint).
#[derive(Clone, Debug)]
pub struct Pid {
    pub kp: f64,
    pub ki: f64,
    pub kd: f64,
    /// Velocity feed-forward gain (ros2_control-style). Adds `kv · desired_velocity` to the
    /// command so the controller anticipates motion instead of only reacting to error —
    /// dramatically reduces lag while tracking a moving trajectory. Default 0 (pure PID).
    pub kv: f64,
    pub out_limit: f64,
    integ: Vec<f64>,
    prev_err: Vec<f64>,
}

impl Pid {
    pub fn new(dof: usize, kp: f64, ki: f64, kd: f64, out_limit: f64) -> Self {
        Pid { kp, ki, kd, kv: 0.0, out_limit, integ: vec![0.0; dof], prev_err: vec![0.0; dof] }
    }

    /// Set the velocity feed-forward gain (builder style).
    pub fn with_kv(mut self, kv: f64) -> Self {
        self.kv = kv;
        self
    }

    /// Clear integral + derivative history (e.g. when a new trajectory starts).
    pub fn reset(&mut self) {
        for v in self.integ.iter_mut() {
            *v = 0.0;
        }
        for v in self.prev_err.iter_mut() {
            *v = 0.0;
        }
    }

    /// Compute effort to drive `state.position` toward `setpoint` over `dt` (pure PID).
    pub fn update(&mut self, setpoint: &[f64], state: &JointState, dt: f64) -> JointCommand {
        self.update_tracking(setpoint, &[], state, dt)
    }

    /// PID + velocity feed-forward: `vel_ff[i]` is the desired joint velocity (e.g. the
    /// trajectory's slope). Pass an empty slice for plain PID.
    pub fn update_tracking(&mut self, setpoint: &[f64], vel_ff: &[f64], state: &JointState, dt: f64) -> JointCommand {
        let mut effort = vec![0.0; setpoint.len()];
        for i in 0..setpoint.len() {
            let err = setpoint[i] - state.position.get(i).copied().unwrap_or(0.0);
            self.integ[i] += err * dt;
            // anti-windup: clamp the integral term's contribution
            let i_max = if self.ki > 0.0 { self.out_limit / self.ki } else { 0.0 };
            if i_max > 0.0 {
                self.integ[i] = self.integ[i].clamp(-i_max, i_max);
            }
            let deriv = if dt > 0.0 { (err - self.prev_err[i]) / dt } else { 0.0 };
            self.prev_err[i] = err;
            let ff = self.kv * vel_ff.get(i).copied().unwrap_or(0.0);
            let u = self.kp * err + self.ki * self.integ[i] + self.kd * deriv + ff;
            effort[i] = u.clamp(-self.out_limit, self.out_limit);
        }
        JointCommand { effort }
    }
}

/// Jitter statistics for a real-time run (microseconds).
#[derive(Clone, Debug, Default)]
pub struct JitterStats {
    pub cycles: u64,
    pub max_us: f64,
    pub mean_us: f64,
}

/// Fixed-rate control loop. The callback receives the cycle index and dt and returns
/// nothing; it reads/writes hardware and publishes via captured handles.
pub struct CyclicExecutor {
    pub dt: f64,
}

impl CyclicExecutor {
    /// `hz` is the control rate (e.g. 1000.0 for a 1 kHz loop).
    pub fn new(hz: f64) -> Self {
        CyclicExecutor { dt: 1.0 / hz }
    }

    /// Run exactly `n` cycles with no real-time pacing — deterministic, for tests/replay.
    pub fn step_n<F: FnMut(u64, f64)>(&self, n: u64, mut tick: F) {
        for k in 0..n {
            tick(k, self.dt);
        }
    }

    /// Run `n` cycles paced to wall-clock time, recording jitter (deviation of the actual
    /// cycle period from `dt`). Uses sleep + a short spin to tighten the tail.
    pub fn run_realtime<F: FnMut(u64, f64)>(&self, n: u64, mut tick: F) -> JitterStats {
        let period = Duration::from_secs_f64(self.dt);
        let mut next = Instant::now() + period;
        let mut max_us = 0.0_f64;
        let mut sum_us = 0.0_f64;
        let mut last = Instant::now();
        for k in 0..n {
            tick(k, self.dt);
            // pace to the next deadline
            let now = Instant::now();
            if next > now {
                let remaining = next - now;
                if remaining > Duration::from_micros(200) {
                    std::thread::sleep(remaining - Duration::from_micros(150));
                }
                while Instant::now() < next {
                    std::hint::spin_loop();
                }
            }
            let actual = last.elapsed().as_secs_f64();
            last = Instant::now();
            if k > 0 {
                let jitter_us = (actual - self.dt).abs() * 1e6;
                max_us = max_us.max(jitter_us);
                sum_us += jitter_us;
            }
            next += period;
        }
        JitterStats {
            cycles: n,
            max_us,
            mean_us: if n > 1 { sum_us / (n - 1) as f64 } else { 0.0 },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pid_drives_sim_hardware_to_setpoint() {
        let dof = 2;
        let mut hw = SimHardware::new(dof);
        let mut pid = Pid::new(dof, 80.0, 5.0, 12.0, 50.0);
        let exec = CyclicExecutor::new(1000.0); // 1 kHz
        let setpoint = [0.5, -0.3];

        exec.step_n(4000, |_k, dt| {
            let state = hw.read();
            let cmd = pid.update(&setpoint, &state, dt);
            hw.write(&cmd, dt);
        });

        let s = hw.read();
        assert!((s.position[0] - setpoint[0]).abs() < 1e-2, "j0 {}", s.position[0]);
        assert!((s.position[1] - setpoint[1]).abs() < 1e-2, "j1 {}", s.position[1]);
        // settled (near zero velocity)
        assert!(s.velocity.iter().all(|v| v.abs() < 1e-2));
    }

    #[test]
    fn velocity_feedforward_reduces_tracking_lag() {
        // a constantly-moving target; measure steady-state lag with vs without feed-forward.
        let run = |kv: f64| {
            let mut hw = SimHardware::new(1);
            let mut pid = Pid::new(1, 40.0, 0.0, 6.0, 100.0);
            pid.kv = kv;
            let exec = CyclicExecutor::new(1000.0);
            let speed = 0.5; // rad/s ramp
            let mut t = 0.0;
            let mut lag = 0.0;
            exec.step_n(3000, |_k, dt| {
                t += dt;
                let target = speed * t;
                let st = hw.read();
                let cmd = pid.update_tracking(&[target], &[speed], &st, dt);
                hw.write(&cmd, dt);
                lag = (target - hw.read().position[0]).abs();
            });
            lag
        };
        let no_ff = run(0.0);
        let with_ff = run(2.0); // SimHardware damping ≈ 2.0 → kv≈damping cancels the velocity lag
        assert!(with_ff < no_ff * 0.5, "feed-forward should cut lag: {with_ff} vs {no_ff}");
    }

    #[test]
    fn pid_output_respects_the_clamp() {
        let mut pid = Pid::new(1, 1000.0, 0.0, 0.0, 7.5);
        let state = JointState { position: vec![0.0], velocity: vec![0.0] };
        let cmd = pid.update(&[100.0], &state, 0.001); // huge error
        assert!((cmd.effort[0] - 7.5).abs() < 1e-9, "clamped to out_limit");
    }

    #[test]
    fn step_n_is_deterministic() {
        let run = || {
            let mut hw = SimHardware::with_positions(vec![0.0]);
            let mut pid = Pid::new(1, 60.0, 2.0, 8.0, 40.0);
            CyclicExecutor::new(1000.0).step_n(500, |_k, dt| {
                let st = hw.read();
                let c = pid.update(&[0.4], &st, dt);
                hw.write(&c, dt);
            });
            hw.read().position[0]
        };
        assert_eq!(run(), run(), "identical runs must produce identical state");
    }

    #[test]
    fn cyclic_executor_dt_matches_rate() {
        assert!((CyclicExecutor::new(1000.0).dt - 0.001).abs() < 1e-12);
        assert!((CyclicExecutor::new(500.0).dt - 0.002).abs() < 1e-12);
    }
}
