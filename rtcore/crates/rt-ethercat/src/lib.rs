//! rt-ethercat — an EtherCAT `HardwareInterface` for the control loop.
//!
//! `SimEtherCatHardware` composes one CiA 402 sim drive per joint (fieldbus crate) and
//! presents them to the controllers through the same `HardwareInterface` trait as the plain
//! simulator. Each cycle it sends the right controlword (walking idle drives through the
//! enable sequence, then commanding torque once Operation Enabled) and reads back feedback.
//!
//! The ONLY thing that changes for real hardware is swapping the `SimSlave`s for a real
//! EtherCAT master binding that shuttles the same RxPDO/TxPDO over the bus — the control
//! loop, controllers, safety layer, and bring-up logic are unchanged.

use fieldbus::{next_enable_controlword, DriveState, RxPdo, SimSlave, TxPdo};
use rt_control::{HardwareInterface, JointCommand, JointState};

const CW_OPERATION: u16 = 0x0F;

pub struct SimEtherCatHardware {
    slaves: Vec<SimSlave>,
    tx: Vec<TxPdo>,
}

impl SimEtherCatHardware {
    pub fn new(dof: usize) -> Self {
        Self::with_positions(vec![0.0; dof])
    }

    pub fn with_positions(pos: Vec<f64>) -> Self {
        let slaves = pos.iter().map(|&p| SimSlave::new(p)).collect();
        let tx = pos.iter().map(|&p| TxPdo { statusword: 0, position: p, velocity: 0.0 }).collect();
        SimEtherCatHardware { slaves, tx }
    }

    /// True once every drive has reached Operation Enabled.
    pub fn all_operational(&self) -> bool {
        self.slaves.iter().all(|s| s.state() == DriveState::OperationEnabled)
    }

    /// Cycle the bus with zero torque until all drives are enabled (or `max_cycles`).
    /// Call once before starting motion. Returns true if all drives came up.
    pub fn bring_up(&mut self, max_cycles: usize, dt: f64) -> bool {
        let zero = JointCommand { effort: vec![0.0; self.slaves.len()] };
        for _ in 0..max_cycles {
            self.write(&zero, dt);
            if self.all_operational() {
                return true;
            }
        }
        self.all_operational()
    }

    /// Inject a fault on one drive (for testing fault handling).
    pub fn raise_fault(&mut self, axis: usize) {
        if let Some(s) = self.slaves.get_mut(axis) {
            s.raise_fault();
        }
    }

    /// Explicit operator fault-reset: send a low→high edge of the reset bit to any faulted
    /// drive. After this, `bring_up` can enable them again. (Faults are never auto-cleared.)
    pub fn reset_faults(&mut self, dt: f64) {
        for i in 0..self.slaves.len() {
            if matches!(self.slaves[i].state(), DriveState::Fault | DriveState::FaultReactionActive) {
                self.slaves[i].exchange(RxPdo { controlword: 0x00, target_torque: 0.0 }, dt); // ensure low
                self.tx[i] = self.slaves[i].exchange(
                    RxPdo { controlword: fieldbus::cia402::fault_reset_controlword(), target_torque: 0.0 },
                    dt,
                );
            }
        }
    }
}

impl HardwareInterface for SimEtherCatHardware {
    fn dof(&self) -> usize {
        self.slaves.len()
    }

    fn read(&self) -> JointState {
        JointState {
            position: self.tx.iter().map(|t| t.position).collect(),
            velocity: self.tx.iter().map(|t| t.velocity).collect(),
        }
    }

    fn write(&mut self, cmd: &JointCommand, dt: f64) {
        for i in 0..self.slaves.len() {
            let st = self.slaves[i].state();
            let (controlword, target_torque) = if st == DriveState::OperationEnabled {
                (CW_OPERATION, cmd.effort.get(i).copied().unwrap_or(0.0))
            } else {
                // not yet enabled: send the next enable step, hold torque at zero
                (next_enable_controlword(st).unwrap_or(CW_OPERATION), 0.0)
            };
            self.tx[i] = self.slaves[i].exchange(RxPdo { controlword, target_torque }, dt);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rt_control::{
        Controller, CyclicExecutor, JointTrajectoryController, Pid,
        trajectory::{JointTrajectory, TrajPoint},
    };

    #[test]
    fn drives_start_disabled_and_brought_up() {
        let mut hw = SimEtherCatHardware::new(3);
        assert!(!hw.all_operational(), "drives start in Switch On Disabled");
        let ok = hw.bring_up(50, 0.001);
        assert!(ok && hw.all_operational(), "bring_up walks all drives to Operation Enabled");
    }

    #[test]
    fn full_stack_executes_a_trajectory_through_ethercat_drives() {
        let mut hw = SimEtherCatHardware::new(2);
        assert!(hw.bring_up(50, 0.001));

        let traj = JointTrajectory::new(vec![
            TrajPoint { t: 0.0, positions: vec![0.0, 0.0] },
            TrajPoint { t: 1.0, positions: vec![0.5, -0.3] },
        ]);
        let mut ctrl = JointTrajectoryController::new("arm", traj, Pid::new(2, 90.0, 6.0, 14.0, 60.0));

        CyclicExecutor::new(1000.0).step_n(1500, |_k, dt| {
            let st = hw.read();
            let cmd = ctrl.update(&st, dt);
            hw.write(&cmd, dt);
        });

        assert!(ctrl.is_finished());
        let p = hw.read().position;
        assert!((p[0] - 0.5).abs() < 1e-2, "j0 {}", p[0]);
        assert!((p[1] + 0.3).abs() < 1e-2, "j1 {}", p[1]);
    }

    #[test]
    fn faulted_drive_blocks_bringup_until_explicit_reset() {
        let mut hw = SimEtherCatHardware::new(2);
        hw.raise_fault(1);
        // faults are NOT auto-cleared → bring-up cannot complete
        assert!(!hw.bring_up(50, 0.001), "a faulted drive blocks bring-up");

        // explicit operator reset, then bring-up succeeds
        hw.reset_faults(0.001);
        assert!(hw.bring_up(50, 0.001), "after fault reset the drives come up");
        assert!(hw.all_operational());
    }
}
