//! fieldbus — CANopen/EtherCAT protocol logic, hardware-independent.
//!
//! Today: the CiA 402 drive state machine (`cia402`), the brain every servo drive
//! implements. The future EtherCAT master binding (`EtherCatHardware`) drives each axis
//! through this to bring it up, then exchanges position/velocity PDOs each cycle.

pub mod cia402;
pub mod sim_slave;

pub use cia402::{next_enable_controlword, Cia402, DriveState};
pub use sim_slave::{RxPdo, SimSlave, TxPdo};
