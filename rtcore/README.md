# RT Core

The native, real-time control + middleware daemon for TETROBOT's **industrial path** —
the part that genuinely *replaces ROS* for deterministic robot control.

The TypeScript **Studio** (`../frontend`) designs, simulates, plans, and visualizes.
**RT Core** is the separate native process that runs the hard-real-time control loop on
the actual robot and talks the fieldbus. A browser/Electron/GC'd runtime fundamentally
cannot hold a 1 kHz loop with sub-millisecond jitter or speak EtherCAT — hence this is
native Rust, not part of the frontend.

## Workspace

| Crate | Role | ROS 2 analogue |
|---|---|---|
| `rt-bus` | Deterministic in-process typed pub/sub (bounded keep-last-N queues) | topics, **without** DDS/middleware |
| `rt-control` | Fixed-rate cyclic executor + PID + `HardwareInterface` + **trajectory controller & controller manager** | `ros2_control` controller manager + HW interface |
| `ros-bridge` | **Bidirectional bridge** between the internal bus and ROS 2 topics, transport-abstracted | `ros1_bridge` / a custom DDS bridge |
| `rt-telemetry` | **Bidirectional** WebSocket server (off the RT thread): streams status OUT, receives commands IN | Foxglove/rosbridge websocket |
| `fieldbus` | CANopen **CiA 402** drive state machine + a CST sim drive (`SimSlave`) | CANopen DS402 |
| `rt-ethercat` | `SimEtherCatHardware: HardwareInterface` — composes CiA 402 sim drives, brings them up, drives them | the EtherCAT `HardwareInterface` |
| `traj-io` | Studio↔RT Core JSON contract: parses the Studio's trajectory (`rtExport.ts`) and serializes controller status (`status_to_json` → Studio's `rtStatus.ts`) | (de)serialization boundary |
| `rtcored` | Daemon: Studio JSON → bridge → controller → hardware → state → ROS, all at the loop rate | a control node |

## Build & run

```bash
cd rtcore
cargo test                          # all crates (bus, control, bridge, telemetry, io)
cargo run -p rtcored --release      # finite 1 kHz demo (exits after ~1.5 s)
cargo run -p rtcored --release -- --serve   # keep serving telemetry on ws://127.0.0.1:8088
cargo run -p rtcored --release -- --ethercat   # drive sim EtherCAT CiA 402 axes (bring-up + run)
```

With `--serve` running, open the Studio's **Runtime ▸ RT Core** tab and click **Connect**:
watch live progress + per-joint tracking error, and use **Send sample move** / **E-STOP** /
**Reset** to command the daemon over the same socket — a full operator console.

## What is real today vs. roadmap

**Real & tested now:**
- Typed pub/sub bus with bounded keep-last-N QoS (the messaging core).
- Fixed-rate cyclic executor: deterministic `step_n` (tests/replay) + `run_realtime` with
  jitter measurement.
- Clamped PID with anti-windup; first-order `SimHardware` so the full stack runs without
  hardware; determinism test (identical runs → identical state).
- `HardwareInterface` trait: the control loop is written only against it, so swapping
  sim ↔ real hardware changes nothing above the trait.
- **`JointTrajectoryController` + `HoldController` + `ControllerManager`**: execute a
  Studio-planned (blended, jerk-limited) `JointTrajectory` by sampling it over time and
  tracking with PID; hold a fixed pose as the safe default; switch active controllers
  without restarting the loop. Each controller emits live `ControllerStatus` feedback
  (progress fraction, finished, per-joint tracking error).
- **`ros-bridge`**: bidirectional bus ↔ ROS bridge over a `RosTransport` trait, with an
  in-memory `SimRosTransport` for tests. `rtcored` demonstrates the full path: a ROS
  `/joint_trajectory` goal in → executed → `/joint_states` + `/controller_status`
  (FollowJointTrajectory-style feedback) streamed back out.
- **`SafetyMonitor`** (software pre-safety): every command is clamped against per-joint
  effort/velocity/position limits and a monitored-stop (e-stop) latch before reaching the
  drives; violations are counted for telemetry. A ROS `/estop` (Bool) command is bridged
  in and trips/resets the monitor mid-loop (demonstrated in `rtcored`). ⚠️ This is a
  software guard, NOT a safety-rated function — it's the seam the certified dual-channel
  attaches to (below).

**Roadmap (Phase 2, behind the existing abstractions — see PHASE2-PLAN.md):**
- `EtherCatHardware: HardwareInterface` over a real EtherCAT master (CoE/CANopen). The
  loop and controllers do not change when it lands. Its CiA 402 bring-up/fault brain is
  already built & tested in the `fieldbus` crate (hardware-independent).
- `RclrsTransport: RosTransport` (real `rclrs`/DDS) — drop-in for `SimRosTransport`; the
  bridge logic does not change.
- Cross-process / cross-host transport under the same `Topic` API (shared memory on-host,
  RTPS-compatible wire between hosts).
- A *certified* safety channel (independent dual-channel, diagnosed) toward ISO 10218 /
  ISO 13849 / IEC 62061, attaching at the `SafetyMonitor` seam (the software layer above
  is defense-in-depth, not the rated function).

## Real-time note (be honest)

True sub-100 µs jitter requires a **real-time OS** (Linux **PREEMPT_RT**, or Xenomai) with
CPU isolation and a tuned kernel. On a stock desktop OS (e.g. Windows) the scheduler will
show much larger, bursty jitter — that's the OS, not the loop. The architecture targets
PREEMPT_RT for deployment; `run_realtime`'s jitter stats are exactly the metric to verify
once on RT hardware (`cyclictest`-style).
