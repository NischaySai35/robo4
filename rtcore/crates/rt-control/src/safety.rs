//! safety — a software pre-safety layer between the controllers and the hardware.
//!
//! Every command passes through `SafetyMonitor::enforce` before it reaches the drives:
//! it clamps effort, refuses to accelerate a joint past its velocity limit, applies soft
//! end-stops at position limits, and supports a monitored stop (e-stop). Violations are
//! counted for telemetry.
//!
//! ⚠️ HONEST SCOPE: this is a *software* guard that catches obvious, common faults. It is
//! NOT a safety-rated function. A certified system (ISO 10218 / ISO 13849 / IEC 62061)
//! needs an independent, dual-channel, diagnosed safety controller. This layer is exactly
//! the seam that the certified channel attaches to — the control side of defense-in-depth.

use crate::{JointCommand, JointState};

/// Per-joint limits the software layer enforces.
#[derive(Clone, Debug, Default)]
pub struct SafetyLimits {
    pub pos_min: Vec<f64>,
    pub pos_max: Vec<f64>,
    pub vel_max: Vec<f64>,
    pub effort_max: Vec<f64>,
}

impl SafetyLimits {
    pub fn dof(&self) -> usize {
        self.effort_max.len()
    }
}

/// Running counts of what the safety layer had to correct (for telemetry/diagnostics).
#[derive(Clone, Debug, Default, PartialEq)]
pub struct SafetyStatus {
    pub estop: bool,
    pub effort_clamps: u64,
    pub velocity_blocks: u64,
    pub position_blocks: u64,
}

/// Filters controller commands against `SafetyLimits` and an e-stop latch.
pub struct SafetyMonitor {
    limits: SafetyLimits,
    status: SafetyStatus,
}

impl SafetyMonitor {
    pub fn new(limits: SafetyLimits) -> Self {
        SafetyMonitor { limits, status: SafetyStatus::default() }
    }

    /// Latch a monitored stop: all subsequent commands are zeroed until `reset_estop`.
    pub fn trip_estop(&mut self) {
        self.status.estop = true;
    }

    pub fn reset_estop(&mut self) {
        self.status.estop = false;
    }

    pub fn is_tripped(&self) -> bool {
        self.status.estop
    }

    pub fn status(&self) -> &SafetyStatus {
        &self.status
    }

    /// Clamp/guard `cmd` against the limits given the measured `state`.
    /// Returns a command that is safe to send to the drives this cycle.
    pub fn enforce(&mut self, state: &JointState, cmd: JointCommand) -> JointCommand {
        let n = cmd.effort.len();

        // Monitored stop: command zero effort (drives hold/coast per their config).
        if self.status.estop {
            return JointCommand { effort: vec![0.0; n] };
        }

        let mut effort = cmd.effort;
        for i in 0..n {
            let pos = state.position.get(i).copied().unwrap_or(0.0);
            let vel = state.velocity.get(i).copied().unwrap_or(0.0);

            // 1) Effort magnitude clamp.
            if let Some(&emax) = self.limits.effort_max.get(i) {
                if effort[i] > emax {
                    effort[i] = emax;
                    self.status.effort_clamps += 1;
                } else if effort[i] < -emax {
                    effort[i] = -emax;
                    self.status.effort_clamps += 1;
                }
            }

            // 2) Velocity limit: don't let effort push a joint faster past its cap.
            if let Some(&vmax) = self.limits.vel_max.get(i) {
                if vel > vmax && effort[i] > 0.0 {
                    effort[i] = 0.0;
                    self.status.velocity_blocks += 1;
                } else if vel < -vmax && effort[i] < 0.0 {
                    effort[i] = 0.0;
                    self.status.velocity_blocks += 1;
                }
            }

            // 3) Soft end-stops: at/over a position limit, block effort that pushes further.
            let hi = self.limits.pos_max.get(i).copied();
            let lo = self.limits.pos_min.get(i).copied();
            if let Some(hi) = hi {
                if pos >= hi && effort[i] > 0.0 {
                    effort[i] = 0.0;
                    self.status.position_blocks += 1;
                }
            }
            if let Some(lo) = lo {
                if pos <= lo && effort[i] < 0.0 {
                    effort[i] = 0.0;
                    self.status.position_blocks += 1;
                }
            }
        }
        JointCommand { effort }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn limits() -> SafetyLimits {
        SafetyLimits {
            pos_min: vec![-1.0, -1.0],
            pos_max: vec![1.0, 1.0],
            vel_max: vec![2.0, 2.0],
            effort_max: vec![10.0, 10.0],
        }
    }

    #[test]
    fn clamps_effort_magnitude() {
        let mut m = SafetyMonitor::new(limits());
        let st = JointState { position: vec![0.0, 0.0], velocity: vec![0.0, 0.0] };
        let out = m.enforce(&st, JointCommand { effort: vec![50.0, -99.0] });
        assert_eq!(out.effort, vec![10.0, -10.0]);
        assert_eq!(m.status().effort_clamps, 2);
    }

    #[test]
    fn estop_zeros_all_effort() {
        let mut m = SafetyMonitor::new(limits());
        m.trip_estop();
        let st = JointState { position: vec![0.0, 0.0], velocity: vec![0.0, 0.0] };
        let out = m.enforce(&st, JointCommand { effort: vec![5.0, 5.0] });
        assert_eq!(out.effort, vec![0.0, 0.0]);
        assert!(m.is_tripped());
        m.reset_estop();
        assert!(!m.is_tripped());
    }

    #[test]
    fn blocks_acceleration_past_velocity_limit() {
        let mut m = SafetyMonitor::new(limits());
        // joint 0 already over +vmax and command pushes further positive → blocked
        let st = JointState { position: vec![0.0, 0.0], velocity: vec![3.0, 0.0] };
        let out = m.enforce(&st, JointCommand { effort: vec![8.0, 8.0] });
        assert_eq!(out.effort[0], 0.0, "over-speed joint blocked");
        assert_eq!(out.effort[1], 8.0, "in-limit joint untouched");
        assert_eq!(m.status().velocity_blocks, 1);
    }

    #[test]
    fn soft_endstop_blocks_pushing_past_position_limit() {
        let mut m = SafetyMonitor::new(limits());
        // joint 0 at upper limit, positive effort blocked; negative effort (retreat) allowed
        let st = JointState { position: vec![1.0, -1.0], velocity: vec![0.0, 0.0] };
        let out = m.enforce(&st, JointCommand { effort: vec![5.0, -5.0] });
        assert_eq!(out.effort[0], 0.0, "blocked at upper limit");
        assert_eq!(out.effort[1], 0.0, "blocked at lower limit");
        // retreating from the limits is permitted
        let out2 = m.enforce(&st, JointCommand { effort: vec![-5.0, 5.0] });
        assert_eq!(out2.effort, vec![-5.0, 5.0]);
        assert_eq!(m.status().position_blocks, 2);
    }
}
