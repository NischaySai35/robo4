# TETROBOT — Platform Status & Demo Guide

A one-page, honest snapshot of where the platform is: what's built and tested, what's
pending, and how to demo it. Audience: a technical reviewer (software engineer).

## The pitch (one sentence)
A GUI-first robotics platform — design, simulate, analyze, plan, and run autonomy with no
code — paired with a **native real-time control core (Rust)** that executes Studio-planned
motion on real hardware over a fieldbus: the unified, deterministic stack "ROS, upgraded",
with ROS interop as the migration on-ramp.

## Two halves, one contract

```
┌─────────────────────────── STUDIO (TypeScript, strict) ───────────────────────────┐
│ model document → 6-DOF IK → motion planning → corner blending → jerk-limited        │
│ trajectory → exportRtTrajectory(JSON)         operator console (Runtime ▸ RT Core)  │
└───────────────┬──────────────────────────────────────────────▲────────────────────┘
   trajectory / e-stop (WebSocket)                  live status (progress + error)
┌───────────────▼──────────────────────────────────────────────┴────────────────────┐
│ RT CORE (Rust, 9 crates)                                                            │
│ traj-io (JSON contract) → ros-bridge → ControllerManager (trajectory / hold)         │
│   → SafetyMonitor (limits + e-stop) → EtherCatHardware (CiA 402 drives) @ 1 kHz       │
│   → JointState + ControllerStatus → rt-telemetry (bidirectional WebSocket) → Studio  │
└────────────────────────────────────────────────────────────────────────────────────┘
```

The Studio↔RT Core JSON contract is **drift-protected**: the same example is asserted on
both sides (TS `rtExport.ts`/`rtStatus.ts` ↔ Rust `traj-io`), so a schema change fails a test.

## Proven & tested (today, in simulation)

| Capability | Where | Evidence |
|---|---|---|
| Deterministic, reproducible physics | `frontend` physicsConfig/PhysicsSim | determinism tests |
| Real collision geometry (cyl/capsule/cone, mesh convex hull) | `frontend` colliderFactory | shape + hull tests |
| 6-DOF IK (position + orientation) | `frontend` modelIK | 6-DOF convergence test |
| Jerk-limited (S-curve) + corner-blended trajectories | `frontend` trajectory | cap/blend tests |
| URDF round-trip fidelity | `frontend` exporters/importers | round-trip tests |
| Reproducible RL training | `frontend` policy (seeded) | training test |
| 1 kHz control loop + PID + controller manager | `rt-control` | PID/traj/hold tests |
| Software safety: limits, soft end-stops, e-stop | `rt-control` safety | clamp/block/estop tests |
| CiA 402 drive state machine + sim EtherCAT drives | `fieldbus`, `rt-ethercat` | bring-up + drive tests |
| Bidirectional live link (telemetry out, commands in) | `rt-telemetry` | real-socket integration tests |
| Operator console (send move / e-stop, live readout) | `frontend` RtCoreReadout | verified live end-to-end |

**Quality:** Studio 75 tests (TypeScript strict, typecheck clean, production build OK);
RT Core 44 tests across 9 crates (clean build, no warnings). Contract drift-protected both sides.

## Pending (hardware / dependency / certification-bound) — see `rtcore/PHASE2-PLAN.md`

| Item | Why it's not done in sim | Slots in at |
|---|---|---|
| Real EtherCAT master | needs drives + NIC + a Linux bench | swap `SimSlave` → bus binding (logic unchanged) |
| `RclrsTransport` (real ROS 2 DDS) | needs a ROS 2 install | behind `RosTransport` trait |
| Certified safety channel | needs a safety contractor + notified body (long pole, 12–24 mo) | at the `SafetyMonitor` seam |
| PREEMPT_RT deployment | needs RT Linux hardware | run the same loop; validate with `cyclictest` |

Honest note on jitter: on a desktop OS the loop shows ~250 µs jitter — that's the scheduler,
not the loop. Sub-100 µs requires PREEMPT_RT (the architecture targets it).

## Demo (≈5 minutes)

1. **Studio** — `cd frontend && npm run dev`. Build/load a robot; toggle **IK** and drag the
   tip; enable **Gravity**; open **Analysis** for the stress heatmap.
2. **RT Core** — `cd rtcore && cargo run -p rtcored --release -- --ethercat`. Watch 3 CiA 402
   axes brought up → Operation Enabled, then a trajectory executed to target.
3. **Live operator console** — run `cargo run -p rtcored --release -- --serve`, then in the
   Studio open **Runtime ▸ RT Core**, click **Connect**, and use **Send sample move** /
   **E-STOP** / **Reset**. The progress bar + per-joint tracking error update live.
4. **Tests** — `cd frontend && npm run typecheck && npx tsx --test "src/**/*.test.ts"` and
   `cd rtcore && cargo test`.

## Talking points (honest)
- **Strength:** one source-of-truth model with many views; a tested native RT core with the
  hard parts (CiA 402 bring-up, software safety, bidirectional operator link) already built.
- **Strength:** clean trait seams — real EtherCAT / ROS DDS / certified safety drop in
  without touching control logic.
- **Honest gap:** not yet on real hardware or certified; that's a funded, sequenced program
  (PHASE2-PLAN.md), not a code gap. Interop-first (ROS bridge) is the migration on-ramp.
- **Positioning:** not "beat ROS at everything" — be the unified, deterministic, GUI-first
  stack that interoperates with ROS and graduates teams off the painful first mile.
