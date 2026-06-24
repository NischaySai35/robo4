# Phase 2 Execution Plan — RT Core to Real Hardware

The sim-side RT Core is complete and tested (controllers, ROS bridge, software safety +
e-stop, live WebSocket telemetry; 30 tests across 6 crates). Everything that remains is
**hardware/dependency/certification-bound** and slots in behind existing trait seams
without changing the control logic. This plan sequences that work.

## The four workstreams

### WS-1 · Fieldbus / EtherCAT (`EtherCatHardware: HardwareInterface`)
**Goal:** drive real servo drives at 1 kHz over EtherCAT (CoE / CANopen-over-EtherCAT).
- **Decision — master stack (build vs. license):**
  - *License* a mature master (e.g. an established commercial EtherCAT master) → fastest,
    lowest risk, licensing cost + integration.
  - *Open* (SOEM via a Rust binding) → no license cost, more integration/validation effort.
  - **Recommendation:** prototype on SOEM to validate the architecture cheaply; license a
    certified master for the shipping product if timing/diagnostics demand it.
- **Pure-logic pieces buildable NOW (no hardware):** the **CiA 402 drive state machine**
  (this commit), PDO mapping structs, CoE SDO request model. These de-risk the binding.
- **Hardware-bound:** the master binding itself, distributed-clock sync, real drive bring-up.
- **Effort:** prototype 4–8 wks (with drives in hand); production-hardening + DC sync 2–3 mo.
- **Depends on:** servo drives + an EtherCAT NIC; a Linux test bench.

### WS-2 · ROS 2 interop (`RclrsTransport: RosTransport`)
**Goal:** real DDS so existing ROS 2 drivers/tools interoperate during migration.
- Implement `RclrsTransport` against `rclrs`; map our `RosMsg` to `sensor_msgs/JointState`,
  `trajectory_msgs/JointTrajectory`, FollowJointTrajectory feedback, `std_msgs/Bool`.
- The bridge logic is done; this is purely the transport impl behind the trait.
- **Note:** the *telemetry* link to the Studio is already live over WebSocket — this is
  specifically for ROS topic interoperability, an on-ramp for ROS-native customers.
- **Effort:** 3–5 wks. **Depends on:** a ROS 2 (Jazzy/Rolling) environment; `rclrs` maturity.

### WS-3 · Functional safety (certified channel at the `SafetyMonitor` seam)
**Goal:** ship near humans → ISO 10218-1/-2:2025, ISO 13849-1 (PLd/e), IEC 62061, IEC 61508.
- Independent, **dual-channel, diagnosed** safety controller (separate from the software
  guard already built); safe torque off (STO), monitored stop, speed & separation, PFL.
- Process evidence: requirements traceability, V-model, MISRA-style coding standard for the
  safety path, documented test evidence; IEC 62443 cybersecurity.
- **This is the long pole (12–24 mo) and real money** (notified-body audits). Engage a
  functional-safety contractor + notified body **early**, in parallel with WS-1/WS-2.
- **Depends on:** safety-rated hardware (STO drives, safety PLC/relays), a contractor.

### WS-4 · Real-time deployment (PREEMPT_RT)
**Goal:** prove the 1 kHz loop holds with bounded jitter on real-time Linux.
- PREEMPT_RT kernel, CPU isolation (`isolcpus`/`nohz_full`), SCHED_FIFO, locked memory.
- Validate with `cyclictest` and the loop's own `JitterStats` (target: worst-case < 100 µs).
- **Effort:** 1–2 wks of tuning. **Depends on:** an industrial PC / RT-capable target.

## Sequencing

```
Month:        0────3────6────9────12───15───18───21───24
WS-1 EtherCAT  [prototype SOEM][----production + DC sync----]
WS-2 ROS2      [rclrs transport]
WS-3 Safety       [contractor + gap assessment][----design + audits (long pole)----]
WS-4 PREEMPT_RT      [tuning + cyclictest]
Pilot                          [paid manufacturing design-partner pilot ----------->]
```

Run a **paid pilot with one manufacturing design-partner from ~month 3**: their
requirements de-risk priorities and help fund WS-1/WS-3.

## Procurement / hiring checklist (the real blockers — decisions, not code)
- [ ] EtherCAT master decision (SOEM prototype now; license call before shipping)
- [ ] Servo drives with **STO** + an EtherCAT bench
- [ ] Industrial PC + PREEMPT_RT target
- [ ] ROS 2 environment (Jazzy/Rolling)
- [ ] Functional-safety contractor + notified body engaged
- [ ] First manufacturing design-partner

## What we keep building in the meantime (hardware-independent, de-risks the above)
- ✅/▶ CiA 402 drive state machine (this commit) — the brain of `EtherCatHardware`.
- PDO/SDO data models + a simulated EtherCAT slave for HIL-style tests.
- Trajectory status/diagnostics enrichment; Studio operator dashboard.
- Determinism/replay harness for regression against recorded drive data.
