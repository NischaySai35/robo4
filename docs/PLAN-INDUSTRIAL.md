# TETROBOT — Industrial-Grade Plan (the "upgraded ROS 2, all-in-one")

> Goal: turn the existing GUI-first platform (Phases 0–14 + native autonomy stack)
> from **single-shot feature demos** into a **robust, observable, industrial robotics
> platform** that matches or exceeds the ROS 2 ecosystem (RViz2, Gazebo, MoveIt2,
> Nav2, Foxglove, ros2_control, Isaac) — natively, no ROS, no middleware install.

This plan is grounded in a live walkthrough of the running app + a source review
(2026-06-22). It complements [ROADMAP.md](ROADMAP.md): the roadmap got us *breadth*
(every capability exists once); this plan adds the *depth, runtime, and robustness*
that make it industrial.

The four tracks are independent enough to ship in any order, but **Track 1 is the
keystone** — it's the live message/observability substrate the others publish into.
Selected build order: **1 → 2 → 3 → 4**, each shippable, app runnable every step.

---

## Cross-cutting engineering bar (applies to every track)
- **Everything flows through the runtime bus** (Track 1) once it exists — panels and
  hardware become publishers/subscribers, not bespoke wiring.
- **Everything undoable** stays true: model edits still go through the command bus.
- **Pure-core, testable.** New compute (`runtime/`, planners, controllers) has NO
  React/Three imports and ships with `node:test` specs runnable via `tsx`.
- **Worker-ready.** Heavy loops (physics, planning, SLAM) move to Web Workers.
- **Typed.** Full strict TS; message/param schemas are typed.

---

## TRACK 1 — Live runtime & observability (THE KEYSTONE) ← building now
The ROS 2 *core* + Foxglove, native. A single in-process **runtime** that every
panel, simulator, planner, and hardware link talks through.

### T1.0 — Runtime core (`src/runtime/`)
- **`messageBus.ts`** — typed **topics**: `advertise/publish/subscribe`, queue depth,
  *latching* (last value replays to new subscribers), per-topic message-rate (Hz)
  and bandwidth stats. Wildcard subscribe for tooling.
- **`clock.ts`** — a runtime clock with `wall` vs `sim` source, `now()`, pause, and a
  rate multiplier; record/playback drives this so the whole app can scrub time.
- **`params.ts`** — hierarchical **parameter server** (`/ns/name`), typed, change
  events, declared with constraints (min/max/enum) so a generic param editor builds.
- **`services.ts`** — request/response **services** (async, typed, timeout).
- **`actions.ts`** — long-running **goals** with feedback + cancel + result; planning
  and navigation become actions with live progress.
- **`nodes.ts` / introspection** — a registry of logical "nodes" (publishers, subs,
  services, actions) so we can render an **rqt_graph / Foxglove**-style topology.

### T1.1 — TF transform tree (`runtime/tf.ts`)
- A live tree of named frames + time-stamped transforms; `lookupTransform(a,b,t)`
  with interpolation. The model FK **publishes** body frames into TF each tick.
- **TF tree viewer** panel (frame graph + per-frame pose), axis overlays in viewport.

### T1.2 — Record / playback (`runtime/recorder.ts`, `player.ts`)
- Record every published message (selectable topics) into a **`.nischaybag`** (the
  rosbag analog): compact, indexed by time. Player streams it back through the bus,
  driving the sim clock → **scrub, step, loop, speed** the whole session, panels
  light up exactly as live. Export/import bags as files.

### T1.3 — Observability UI (new **Runtime** dock panel + dashboard)
- **Topics inspector**: live topic list with Hz/bandwidth, expandable last message
  (JSON tree), publish-from-UI for testing.
- **Node graph**: nodes ↔ topics topology view.
- **Plot dashboard**: multi-series time plots (reuse uPlot already in deps) of any
  numeric field on any topic; drag fields in, layouts persist.
- **Diagnostics**: a `/diagnostics` topic + a health panel (OK/WARN/ERROR per
  subsystem: hardware link, servo overcurrent, physics, planner).
- **Record/playback bar**: arm/record/stop, open bag, transport scrubber.

### T1.4 — Wire real publishers (retire bespoke wiring incrementally)
- `/joint_states` (from FK), `/tf`, `/hardware/telemetry` (HardwareBridge),
  `/analysis/joint_loads`, `/servo/*`, `/clock`. Existing panels subscribe.

**Verification:** node tests for bus (pub/sub/latch/rate), clock, params, services,
actions, TF interpolation, recorder round-trip; typecheck; build; live screenshot of
the Runtime panel showing real topics + a plot + a recorded-then-scrubbed session.

---

## TRACK 2 — Motion: planning + control (MoveIt2 + ros2_control depth)
### Planning
- **Planners**: add **RRT\*** (asymptotically optimal) + **PRM** (multi-query) beside
  current RRT; pluggable planner interface; shortcut + **spline** smoothing.
- **Time parameterization**: **TOTG** (time-optimal trajectory generation) honoring
  per-joint velocity/accel/jerk limits → executable timed trajectories.
- **Planning scene + collision matrix (SRDF)**: named planning groups, allowed-
  collision matrix UI, attached objects (grasped payloads), self + world collision
  with **convex** shapes (from Track 4 decomposition).
- **Cartesian** path planning (interpolate tip pose, IK each waypoint) + **dual-arm**
  / multi-group coordination. Planning runs as a Track-1 **action** with feedback.

### Control (`src/control/`) — ros2_control analog
- **Hardware interfaces**: position / velocity / effort command + state interfaces.
- **Controller manager**: load/activate controllers against joints.
- **Controllers**: joint-trajectory controller (follows timed trajectories), PID
  position/velocity, gravity-compensation, admittance (later).
- **Physics integration**: real joint **motors + limits** in Rapier; controllers
  close the loop in sim, and the same controllers drive hardware (sim↔real switch).

**Verification:** node tests (RRT\* converges below RRT cost; TOTG respects limits;
PID step response; collision-matrix gating); execute a planned timed trajectory in
physics and on the joint-state stream.

---

## TRACK 3 — Navigation + perception (Nav2 + Isaac depth)
### Navigation (`robotics/nav/` deepened)
- **Layered costmap**: static + obstacle + **inflation** layers, configurable
  inflation radius/cost; global + local costmaps.
- **Local planner**: **DWB** (dynamic-window) or **TEB** local trajectory rollout +
  scoring; **pure-pursuit** stays as a simple option.
- **Recovery behaviors** (clear costmap, spin, back-up) + a **BT navigator** (reuse
  the behavior-tree engine) orchestrating global→local→recovery.
- **Localization**: **AMCL**-style particle filter on the map; **graph SLAM**
  (pose-graph) fusing multi-scan LiDAR (upgrade the current single-scan mapping).

### Perception (`robotics/sensors/` + `perception/`)
- **Depth camera** (raycast depth image) → **point cloud**; point-cloud viewport
  layer (instanced points).
- **Fiducials** (AprilTag-style markers) for pose estimation; basic **segmentation**
  / clustering of the cloud into obstacles.
- **Map fusion** across scans/sensors into one occupancy/voxel map.

**Verification:** costmap inflation test, DWB picks collision-free rollout, AMCL
converges on a known map, SLAM closes a loop; depth→cloud sanity; live screenshots.

---

## TRACK 4 — Robot definition + CAD (authoring depth)
- **Parametric macros (xacro analog)**: reusable parameterized sub-assemblies
  (e.g. "leg(length, servo)") expanded into bodies+joints via the command bus; a
  GUI macro editor, not text.
- **SRDF authoring UI**: define planning groups, default poses, disable-collision
  pairs (feeds Track 2).
- **Collision generation**: **convex hull** + **convex decomposition** (V-HACD-style)
  and primitive fitting → real collision shapes (replace bbox approximations);
  collision-shape **visualization** toggle.
- **CAD import/edit**: **STEP/IGES** via **occt-import-js** (OCCT WASM); mesh
  **booleans/decimate** via **Manifold** WASM; unit scaling for mm CAD.
- **Exporters**: **SDF**, **USD**, **MJCF**, glTF beside the existing URDF/IDL; bundle
  referenced mesh files alongside URDF.

**Verification:** macro expand/undo round-trip, convex decomposition produces valid
hulls, STEP tessellation loads, SDF/MJCF validate, exporter round-trips.

---

## Sequencing & "definition of done" per track
Each track ships in **small, runnable increments** (like the roadmap phases). A track
is "done" when: its core is node-tested, it's wired through the Track-1 bus, it has a
GUI control + an observability surface, and a live screenshot proves it working.
