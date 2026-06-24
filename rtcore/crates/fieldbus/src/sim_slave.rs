//! A simulated CiA 402 servo drive (slave), for running the bring-up + cyclic exchange
//! with no hardware. Models **CST** (Cyclic Synchronous Torque) mode: the master writes a
//! target torque each cycle; the drive applies it to a first-order model — but ONLY while
//! in Operation Enabled, exactly like a real drive (no torque until enabled).
//!
//! This lets the full stack (controller → safety → EtherCatHardware → drive) run and be
//! tested HIL-style against a mock that obeys the CiA 402 state machine.

use crate::cia402::{Cia402, DriveState};

/// Process-data the master sends to the drive each cycle (RxPDO).
#[derive(Clone, Copy, Debug, Default)]
pub struct RxPdo {
    pub controlword: u16,    // 0x6040
    pub target_torque: f64,  // 0x6071 (CST mode)
}

/// Process-data the drive returns each cycle (TxPDO).
#[derive(Clone, Copy, Debug, Default)]
pub struct TxPdo {
    pub statusword: u16,     // 0x6041
    pub position: f64,       // 0x6064
    pub velocity: f64,       // 0x606C
}

/// One simulated servo drive: CiA 402 state machine + a first-order torque→motion model.
pub struct SimSlave {
    drive: Cia402,
    pos: f64,
    vel: f64,
    damping: f64,
}

impl SimSlave {
    pub fn new(initial_pos: f64) -> Self {
        SimSlave { drive: Cia402::new(), pos: initial_pos, vel: 0.0, damping: 2.0 }
    }

    pub fn state(&self) -> DriveState {
        self.drive.state()
    }

    pub fn position(&self) -> f64 {
        self.pos
    }

    pub fn velocity(&self) -> f64 {
        self.vel
    }

    /// Report a drive fault (overcurrent, etc.) — torque is cut until reset.
    pub fn raise_fault(&mut self) {
        self.drive.raise_fault();
    }

    /// One cyclic PDO exchange: apply the controlword, integrate motion if enabled,
    /// and return the drive's feedback.
    pub fn exchange(&mut self, rx: RxPdo, dt: f64) -> TxPdo {
        self.drive.apply_controlword(rx.controlword);
        if self.drive.is_operational() {
            let accel = rx.target_torque - self.damping * self.vel;
            self.vel += accel * dt;
            self.pos += self.vel * dt;
        }
        // (not enabled → no torque applied, just like real hardware)
        TxPdo { statusword: self.drive.statusword(), position: self.pos, velocity: self.vel }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::next_enable_controlword;

    #[test]
    fn no_motion_until_operation_enabled() {
        let mut s = SimSlave::new(0.0);
        // big torque while NOT enabled → nothing moves
        for _ in 0..100 {
            s.exchange(RxPdo { controlword: 0x00, target_torque: 100.0 }, 0.001);
        }
        assert_eq!(s.position(), 0.0, "disabled drive must not move");
    }

    #[test]
    fn moves_under_torque_once_enabled() {
        let mut s = SimSlave::new(0.0);
        // walk through the enable sequence
        for _ in 0..5 {
            let cw = next_enable_controlword(s.state()).unwrap_or(0x0F);
            s.exchange(RxPdo { controlword: cw, target_torque: 0.0 }, 0.001);
        }
        assert_eq!(s.state(), DriveState::OperationEnabled);
        // now torque produces motion
        for _ in 0..1000 {
            s.exchange(RxPdo { controlword: 0x0F, target_torque: 5.0 }, 0.001);
        }
        assert!(s.position() > 0.1, "enabled drive should move under torque: {}", s.position());
    }
}
