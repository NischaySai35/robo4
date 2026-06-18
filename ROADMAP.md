# TETROBOT — Platform Roadmap

> **Vision:** the most advanced *GUI-first* robotics platform — design, simulate,
> analyze, and drive real modular robots with **no code required**, where every
> URDF/SDF tag, every joint limit, axis, material, and measurement is a direct
> UI control. Scripting comes later as an *advanced* layer (like Blender's Python),
> but the default path for everything is the GUI.

This is a living document. Phases are ordered by dependency; each one ships
something usable. We restructure **incrementally** — the app stays runnable at
every step (no big-bang rewrite).

---

## 1. North-star architecture: "one rich model, many backends"

A single in-memory **graph model** is the source of truth. Every viewport, panel,
exporter, simulator, and the real hardware are *views* of that one model. This is
how we escape URDF's tree-only limit (your modular any-face-to-any-face robots
form **loops**) and how we avoid rewrites: add a new backend, the editor doesn't
change.

```
                 ┌──────────────────────────────────────────────┐
                 │  CORE MODEL (graph)  — the "DDL"               │
                 │  Assets · Bodies · Joints · Constraints ·      │
                 │  Materials · Frames · Sensors · AnimationClips │
                 │  + Command bus (every change = undoable command)│
                 └──────────────────────────────────────────────┘
        ┌───────────┬───────────┬──────────┬──────────┬──────────┬─────────┐
     Viewport &   Geometry/   Kinematics  Physics &  Animation  Interop   Hardware
     Editor       CAD layer   (FK/IK)     Analysis   & Timeline (exporters) & AI
     (Three.js)   (WASM:OCCT, (generic)   (Rapier/   (keyframes (URDF/SDF/  (WebSerial,
                  Manifold)               MuJoCo)    /traj)     USD/MJCF)   ROS, LLM)
```

### Terms you used, mapped
- **DDL** (your own description language) → the **native scene/robot format**
  (`.nischay`, the serialized graph). Our answer to URDF/USD; richer (loops,
  materials, animation, analysis metadata) and lossless. URDF/SDF/USD/MJCF are
  *lossy exports* of it.
- **IDL** (interface definitions) → message/topic/service definitions for
  **communication** (app ↔ hardware ↔ ROS ↔ AI). Like ROS `.msg`/`.srv` or DDS
  IDL. Built in the Interop/Comms phase.
- **Ports** → serial / network / ROS / DDS endpoints in the Hardware & Comms phase.
- **SLM / VLM / ALM / AI** → Small-, Vision-, and Action/Language-Models in the AI
  phase: natural-language robot control, vision perception/teleop, motion synthesis.

### Tech stack (honest)
- **UI + viewport:** React + Three.js (keep). Workers + instancing/LOD for scale.
- **Heavy compute in the browser:** WebAssembly modules — **Rapier** (physics),
  **OpenCascade/OCCT** (STEP/IGES, BREP, precise CAD), **Manifold** (mesh booleans),
  Draco (compression). Run in **Web Workers** so the UI never freezes.
- **Optional local compute sidecar** (the Electron advantage): a **Python (FastAPI)
  process** we spawn via `child_process` for the heavy/native stuff WASM can't do
  well — **MuJoCo/PyBullet** high-fidelity sim, `trimesh`/`numpy` analysis, the
  **ROS 2 bridge**, serial/CAN, and serving/relaying **AI models**.
- **AI:** cloud LLM/VLM APIs (e.g. Claude) for the copilot + vision; optional local
  small models via the sidecar (ONNX / llama.cpp).
- **Scripting:** a safe **JS console** first (native), then **Python** via the
  sidecar (Blender-style), both driving the same command bus the GUI uses.

### Honest scope (what we will and won't build)
We are **not** rebuilding all of Blender (30 yrs) or Fusion's parametric CAD kernel.
We build a **robotics-focused subset that feels as fluid**:
- ✅ Import/arrange/transform meshes, primitives, booleans, decimate, mirror/array,
  per-object PBR materials, basic edit-mode (vert/edge/face select, move/extrude).
- ✅ Precise measurement, dimensioning, numeric transforms, snapping, units, mates.
- ✅ Full joint/URDF authoring, FK/IK, physics, torque/load analysis, animation.
- ⚠️ **Out (or later/offline):** full sculpting/retopology, a full parametric CAD
  history tree, true FEA stress (von Mises/deformation — we do joint-load heatmaps
  now; real FEA via CalculiX is a later offline feature).

---

## 2. Phased roadmap

### STAGE A — Foundation & restructure
**Phase 0 — Core model + project restructure (the keystone).**
- Feature-based architecture (`src/core`, `src/features/*`, `src/viewport`, ...).
- Graph model entities + factories + validation; **command bus** (every edit is a
  reversible command → unifies undo/redo).
- Native format (DDL) v2 with lossless round-trip; migrate current 6-servo modules
  to be *one generator* that emits Bodies+Joints into the model (nothing breaks).

**Phase 1 — Viewport & editor core.**
- Generic `BodyRenderer` (renders arbitrary model bodies, not just the fixed arm).
- **Selection system** (click, box-select, **hierarchy/outliner panel**),
  **transform gizmos** (move/rotate/scale, world/local), object vs edit mode shell.
- **Data-driven Inspector/Properties panel** (auto-builds controls from the model).

### STAGE B — Geometry / CAD (Fusion-like precision)
**Phase 2 — Mesh & CAD import.** STL/OBJ/glTF + **STEP/IGES via OCCT WASM**; asset
manager; place imported parts as Bodies. *(Your Fusion 360 parts load in here.)*

**Phase 3 — Precision tooling.** Units; numeric transform entry; **measurement &
dimensioning** (distance/angle/radius); **snapping** (vertex/edge/face/grid);
origin/pivot editing; alignment; reference frames/datums.

**Phase 4 — Geometry editing (Blender-like, scoped).** Primitives; **modifiers**
(boolean via Manifold, decimate, mirror, array); basic **edit mode**; per-object
**materials/PBR**; auto collision-shape generation (convex hull / primitives).

### STAGE C — Robot definition (URDF-as-GUI)
**Phase 5 — Joint authoring + every URDF tag as a control.** Pick 2 bodies → joint;
all types; **axis gizmo**; **origin with separate per-body offsets**; limits/effort/
velocity; dynamics (damping/friction); mimic; calibration; safety; transmission;
gazebo tags. Relations/graph editor (parent/child, loops).

**Phase 6 — Kinematics.** Generic FK over the graph; generalized **IK** (DLS/Jacobian,
reuse existing solver); reachability; manual joint control (sliders + drag gizmos).

### STAGE D — Simulation & analysis
**Phase 7 — Physics.** Rapier (WASM, worker): gravity, rigid body, collision,
contacts; **inertia auto-computed** from mesh + density; mass properties. Optional
high-fidelity MuJoCo/PyBullet via the sidecar.

**Phase 8 — Analysis & visualization.** Joint **torque/load** (inverse dynamics);
**power/current** estimate (ties to your ST3215 telemetry); center-of-mass &
stability; **load heatmaps**; live data plots. *(True FEA flagged for later.)*

### STAGE E — Motion & interop
**Phase 9 — Animation & timeline (Blender-like).** Keyframes on joints/poses;
trajectory record/playback; easing; pose library; motion clips; export trajectories.

**Phase 10 — Interop & the IDL.** Export **URDF/SDF/USD/MJCF/glTF**; native DDL
polish; **IDL** message/topic/service/action definitions + generated bindings.

### STAGE F — Hardware, AI, extensibility
**Phase 11 — Hardware & ROS (ports/comms).** WebSerial → ESP32; Python sidecar agent;
**ROS 2 bridge** (rosbridge/roslibjs); sensor ingest (cameras, IMU);
**webcam → joints** (MediaPipe) "wave hands" demo; hardware-in-the-loop with live
telemetry; DDS/IDL comms.

**Phase 12 — AI layer (SLM/VLM/ALM).** Natural-language command → actions (LLM
copilot grounded in the model + IDL); **VLM** vision perception/teleop; motion
synthesis / RL hooks; "describe a robot → it builds it"; vision-guided pick demos.

**Phase 13 — Scripting & extensibility.** Safe **JS scripting console** over the
command bus; then **Python** via the sidecar; **plugin/addon system** (Blender-style);
macros & batch ops.

**Phase 14 — Platform polish.** Shortcuts everywhere + **command palette**; theming;
performance (instancing/LOD/workers); versioning/collaboration; docs; auto-update.

---

## 3. Cross-cutting principles
- **GUI-first, always.** Every capability has a direct control before any script API.
- **Everything undoable.** All edits go through the command bus (uniform undo/redo).
- **Keyboard + shortcuts** for power users; command palette to discover them.
- **The model is sacred.** Backends never mutate it directly; they read it and emit
  commands. This keeps the platform extensible without rewrites.
- **Ship every phase.** The app is always runnable and demoable.
