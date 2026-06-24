//! CiA 402 — the CANopen device profile for drives, implemented as a pure state machine.
//!
//! Every EtherCAT/CANopen servo drive exposes this: the master writes a 16-bit
//! **controlword** (object 0x6040) to command transitions, and reads a 16-bit
//! **statusword** (object 0x6041) to observe the drive's state. A drive will not produce
//! torque until it is walked through the standard enable sequence:
//!
//!   Switch On Disabled → Ready To Switch On → Switched On → Operation Enabled
//!
//! This module is the hardware-independent brain of the future `EtherCatHardware`: it lets
//! us implement, test, and replay the bring-up/fault logic with no drives in hand, then
//! drop in a real master that just shuttles these two words over the bus.

/// CiA 402 drive states (from the statusword).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DriveState {
    NotReadyToSwitchOn,
    SwitchOnDisabled,
    ReadyToSwitchOn,
    SwitchedOn,
    OperationEnabled,
    QuickStopActive,
    FaultReactionActive,
    Fault,
}

// ── Controlword command bits (object 0x6040) ─────────────────────────────────────
const CW_SWITCH_ON: u16 = 1 << 0;
const CW_ENABLE_VOLTAGE: u16 = 1 << 1;
const CW_QUICK_STOP: u16 = 1 << 2; // active-low in the spec: 0 = quick stop requested
const CW_ENABLE_OP: u16 = 1 << 3;
const CW_FAULT_RESET: u16 = 1 << 7;
const CW_CMD_MASK: u16 = CW_SWITCH_ON | CW_ENABLE_VOLTAGE | CW_QUICK_STOP | CW_ENABLE_OP | CW_FAULT_RESET;

/// The command encoded by a controlword (per the CiA 402 command table).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Command {
    Shutdown,         // 0x06: EV+QS
    SwitchOn,         // 0x07: EV+QS+SO  (also "disable operation" from OperationEnabled)
    EnableOperation,  // 0x0F: EV+QS+SO+EO
    DisableVoltage,   // EV = 0
    QuickStop,        // EV=1, QS=0
    FaultReset,       // bit 7 rising edge
    None,
}

fn decode(cw: u16) -> Command {
    if cw & CW_FAULT_RESET != 0 {
        return Command::FaultReset;
    }
    if cw & CW_ENABLE_VOLTAGE == 0 {
        return Command::DisableVoltage;
    }
    if cw & CW_QUICK_STOP == 0 {
        return Command::QuickStop;
    }
    // here EV=1, QS=1
    match cw & (CW_SWITCH_ON | CW_ENABLE_OP) {
        v if v == CW_SWITCH_ON | CW_ENABLE_OP => Command::EnableOperation, // 0x0F
        v if v == CW_SWITCH_ON => Command::SwitchOn,                       // 0x07
        0 => Command::Shutdown,                                            // 0x06
        _ => Command::None,
    }
}

/// A CiA 402 drive state machine. Feed it controlwords; read its statusword/state.
#[derive(Clone, Debug)]
pub struct Cia402 {
    state: DriveState,
    prev_cw: u16,
}

impl Default for Cia402 {
    fn default() -> Self {
        // Drives power up in Switch On Disabled after the internal self-test.
        Cia402 { state: DriveState::SwitchOnDisabled, prev_cw: 0 }
    }
}

impl Cia402 {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn state(&self) -> DriveState {
        self.state
    }

    pub fn is_operational(&self) -> bool {
        self.state == DriveState::OperationEnabled
    }

    /// Inject a drive fault (e.g. overcurrent reported by hardware).
    pub fn raise_fault(&mut self) {
        self.state = DriveState::Fault;
    }

    /// Apply a controlword from the master; advance the state machine and return the new state.
    pub fn apply_controlword(&mut self, cw: u16) -> DriveState {
        let masked = cw & CW_CMD_MASK;
        // fault reset only acts on a RISING edge of bit 7
        let rising_reset = (cw & CW_FAULT_RESET != 0) && (self.prev_cw & CW_FAULT_RESET == 0);
        self.prev_cw = cw;
        let cmd = decode(masked);
        use DriveState::*;

        self.state = match self.state {
            NotReadyToSwitchOn => SwitchOnDisabled, // auto after init
            Fault | FaultReactionActive => {
                if matches!(cmd, Command::FaultReset) && rising_reset {
                    SwitchOnDisabled
                } else {
                    self.state
                }
            }
            SwitchOnDisabled => match cmd {
                Command::Shutdown => ReadyToSwitchOn,
                _ => SwitchOnDisabled,
            },
            ReadyToSwitchOn => match cmd {
                Command::SwitchOn => SwitchedOn,
                Command::EnableOperation => OperationEnabled, // allowed shortcut
                Command::DisableVoltage => SwitchOnDisabled,
                Command::QuickStop => SwitchOnDisabled,
                _ => ReadyToSwitchOn,
            },
            SwitchedOn => match cmd {
                Command::EnableOperation => OperationEnabled,
                Command::Shutdown => ReadyToSwitchOn,
                Command::DisableVoltage => SwitchOnDisabled,
                Command::QuickStop => SwitchOnDisabled,
                _ => SwitchedOn,
            },
            OperationEnabled => match cmd {
                Command::SwitchOn => SwitchedOn, // "disable operation"
                Command::Shutdown => ReadyToSwitchOn,
                Command::DisableVoltage => SwitchOnDisabled,
                Command::QuickStop => QuickStopActive,
                _ => OperationEnabled,
            },
            QuickStopActive => match cmd {
                Command::DisableVoltage => SwitchOnDisabled,
                Command::EnableOperation => OperationEnabled, // if quick-stop-then-resume enabled
                _ => QuickStopActive,
            },
        };
        self.state
    }

    /// The statusword (object 0x6041) the drive would report for its current state.
    pub fn statusword(&self) -> u16 {
        match self.state {
            DriveState::NotReadyToSwitchOn => 0x0000,
            DriveState::SwitchOnDisabled => 0x0040,
            DriveState::ReadyToSwitchOn => 0x0021,
            DriveState::SwitchedOn => 0x0023,
            DriveState::OperationEnabled => 0x0027,
            DriveState::QuickStopActive => 0x0007,
            DriveState::FaultReactionActive => 0x000F,
            DriveState::Fault => 0x0008,
        }
    }
}

/// The controlword for the next step of the standard enable sequence toward
/// `OperationEnabled`. Returns `None` when operational OR when faulted — a fault is NOT
/// auto-cleared here; it requires an explicit operator fault-reset (see `fault_reset_controlword`),
/// which is the safe industrial behavior.
pub fn next_enable_controlword(state: DriveState) -> Option<u16> {
    match state {
        DriveState::SwitchOnDisabled => Some(0x06),   // shutdown → Ready To Switch On
        DriveState::ReadyToSwitchOn => Some(0x07),     // switch on → Switched On
        DriveState::SwitchedOn => Some(0x0F),          // enable operation → Operation Enabled
        DriveState::OperationEnabled => None,          // done
        DriveState::Fault | DriveState::FaultReactionActive => None, // explicit reset required
        DriveState::QuickStopActive => Some(0x0F),     // resume (if quick-stop-then-resume enabled)
        DriveState::NotReadyToSwitchOn => Some(0x06),
    }
}

/// The fault-reset controlword (bit 7). Apply after a 0-edge to clear a fault.
pub fn fault_reset_controlword() -> u16 {
    0x80
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn powers_up_in_switch_on_disabled() {
        assert_eq!(Cia402::new().state(), DriveState::SwitchOnDisabled);
        assert_eq!(Cia402::new().statusword(), 0x0040);
    }

    #[test]
    fn standard_enable_sequence_reaches_operation_enabled() {
        let mut d = Cia402::new();
        assert_eq!(d.apply_controlword(0x06), DriveState::ReadyToSwitchOn);
        assert_eq!(d.statusword(), 0x0021);
        assert_eq!(d.apply_controlword(0x07), DriveState::SwitchedOn);
        assert_eq!(d.statusword(), 0x0023);
        assert_eq!(d.apply_controlword(0x0F), DriveState::OperationEnabled);
        assert_eq!(d.statusword(), 0x0027);
        assert!(d.is_operational());
    }

    #[test]
    fn enable_helper_walks_to_operational() {
        let mut d = Cia402::new();
        // simulate the master loop using the helper until operational
        for _ in 0..10 {
            match next_enable_controlword(d.state()) {
                Some(cw) => { d.apply_controlword(cw); }
                None => break,
            }
        }
        assert!(d.is_operational(), "helper should reach Operation Enabled");
    }

    #[test]
    fn quick_stop_from_operation_enabled() {
        let mut d = Cia402::new();
        d.apply_controlword(0x06);
        d.apply_controlword(0x07);
        d.apply_controlword(0x0F);
        // quick stop: EV=1, QS=0  → 0x02
        assert_eq!(d.apply_controlword(0x02), DriveState::QuickStopActive);
        assert_eq!(d.statusword(), 0x0007);
    }

    #[test]
    fn fault_requires_rising_edge_reset() {
        let mut d = Cia402::new();
        d.raise_fault();
        assert_eq!(d.state(), DriveState::Fault);
        // holding bit7 high without a prior low edge: still must rise from 0 → handled by prev_cw=0
        // first apply with bit7 set IS a rising edge (prev_cw started at 0)
        assert_eq!(d.apply_controlword(0x80), DriveState::SwitchOnDisabled);

        // re-fault, then a held-high controlword (no edge) must NOT reset
        d.raise_fault();
        d.apply_controlword(0x80); // edge 0→1 ... resets. set prev high first:
        // demonstrate the no-edge case explicitly:
        d.raise_fault();
        d.prev_high_for_test();
        assert_eq!(d.apply_controlword(0x80), DriveState::Fault, "no rising edge → no reset");
    }

    #[test]
    fn disable_voltage_drops_to_switch_on_disabled() {
        let mut d = Cia402::new();
        d.apply_controlword(0x06);
        d.apply_controlword(0x07);
        d.apply_controlword(0x0F);
        assert!(d.is_operational());
        assert_eq!(d.apply_controlword(0x00), DriveState::SwitchOnDisabled); // EV=0
    }

    impl Cia402 {
        // test helper: pretend bit7 was already high so the next 0x80 is NOT a rising edge
        fn prev_high_for_test(&mut self) {
            self.prev_cw = CW_FAULT_RESET;
        }
    }
}
