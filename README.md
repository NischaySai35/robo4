# TETROBOT — GUI-first Robotics Modeling, Simulation & Training Platform

Design any robot **without writing code**, simulate it (kinematics + physics),
analyze it (mass, torque, stress), animate it, train intelligent control policies
(ES / CMA-ES / Behavioral Cloning), and run a full **native autonomy stack**
(navigation, motion planning, perception, behaviour trees) — all in one app.
No ROS, no middleware, no servers. Optionally drive real hardware
(ESP32-C3 + ST3215 smart servos) over WiFi.

> One rich model, many backends: a single JSON-serializable robot **document** is
> the source of truth; the 3D viewport, physics, analysis, training, exporters,
> hardware and autonomy are all *views* of it.

By **Nischay Sai D R** · Proprietary & confidential.

---

## Highlights

- **Code-free robot builder** — compose rigid **bodies** (box / cylinder / capsule /
  sphere / cone / torus / imported STL/OBJ mesh) and **joints** (revolute, continuous,
  prismatic, fixed, …) into any kinematic graph. Constant-size move/rotate/scale gizmos,
  snapping, measure tool, face-mate assembly, and a Blender-style mesh **Edit Mode**.
- **Modular connector mating** — attach **keyed connectors** to any body (position +
  outward normal + a roll/key tangent + rotational symmetry). Auto-Snap finds facing
  connector pairs and mates them with a real detachable joint: it aligns opposing
  normals, **rotates the module to the nearest keyed seat** (e.g. every 90°), then plays
  an *approach → align → insert → latch* motion (backs off, slides straight down the
  normal, locks) with an **obstacle collision guard** that aborts if the path is blocked.
  Works on the live FK pose, so a posed or rotated module mates where it actually is.
- **Kinematics** — generic forward kinematics over the graph + **inverse kinematics**
  (damped-least-squares and FABRIK). **Drag-from-tip IK**: grab any link and the chain
  solves to follow.
- **Physics** — live gravity simulation on Rapier with anchored roots, joint limits,
  servo-style holding motors, and a per-pair **self-collision** model (parts that are
  jointed or nest at rest pass through; everything else collides solidly).
- **Engineering analysis** — total mass, center of mass, per-joint gravity-holding
  **torque & estimated servo current**, and a Fusion-style **surface stress heatmap**
  painted across the meshes, plus a live multi-metric telemetry chart.
- **Animation** — keyframe joint poses on a timeline; scrub, play, and pose live with IK.
- **Multi-algorithm training** — train any robot directly in the browser with three
  algorithms: **Evolution Strategies** (robust, any task), **CMA-ES** (adaptive covariance,
  ~2× faster for manipulation), and **Behavioral Cloning** (supervised learning from
  recorded demonstrations). Training enhancers: **observation normalization** (Welford's
  online algorithm), **curriculum learning** (auto-advances difficulty), and a
  **topology encoding** that lets one policy control any configuration of a
  shape-changing robot (+60-dim joint-graph obs).
- **AI goal parsing (VLM)** — type a natural-language instruction ("reach the top left")
  and any of OpenAI, Anthropic, Google Gemini, or HuggingFace models parse it into a 3D
  reach target. Dynamic model lists fetched live from provider APIs.
- **Cloud training export** — export your robot + task as a Google Colab notebook
  (NumPy sep-CMA-ES, free CPU, ~2–5 min). Import the trained policy JSON back to run
  locally. Identical `PolicySpec` interface — cloud and browser policies are interchangeable.
- **Native autonomy stack (no ROS)** — occupancy/costmap + **A\*** navigation,
  joint-space **RRT** motion planning with real collision checking, simulated **LiDAR** +
  occupancy **mapping**, and a **Behaviour-Tree** mission engine.
- **Built-in robots** — generate a complete **6-DOF robot arm** or a **~20-DOF humanoid**
  in one click, with walk / jump / wave / home actions for the humanoid.
- **AI Copilot** — in-app assistant (Transformers.js) that can build/edit the model.
- **Projects** — save/load self-contained, encrypted **`.nischay`** files (geometry +
  embedded meshes + animation, all in one file). Export to OBJ / STL / GLB / URDF / IDL.
- **Desktop + web** — runs as an Electron desktop app or in the browser.
- **Hardware control** — a Servo Control page drives ST3215 servos via an ESP32-C3.

---

## Architecture

```
                      ┌──────────────────────────────────────────┐
                      │   Model document  (core/model, commands)  │   ← single source of truth
                      │   bodies · joints · materials · assets     │     (undoable, serializable)
                      └──────────────────────────────────────────┘
         ┌──────────────┬──────────────┬───────────────┬───────────────┬──────────────┬─────────────┐
         ▼              ▼              ▼               ▼               ▼              ▼             ▼
    Viewport        Physics        Kinematics       Analysis        Training       Autonomy      Exporters
(Three.js render,  (Rapier sim,   (FK / IK /       (mass, CoM,    (ES/CMA-ES/BC  (nav, RRT,    (.nischay,
 gizmos, overlays)  collisions)    FABRIK)          torque, stress)  + VLM cloud)  lidar, BT)   OBJ/STL/GLB/URDF)
                                                                                                      │
                                                                                   Hardware ── ESP32-C3 ── ST3215 bus
```

See [`frontend/ARCHITECTURE.md`](frontend/ARCHITECTURE.md) and
[`ROADMAP.md`](ROADMAP.md) / [`ROADMAP_ROBOTICS.md`](ROADMAP_ROBOTICS.md) for details.

---

## Project structure

```
robo4/
├── frontend/                       # The app (100% TypeScript, strict)
│   ├── electron/                   # Desktop shell (main.cjs, launch.cjs)
│   └── src/
│       ├── core/
│       │   ├── model/              # entities + Document graph model (the "DDL")
│       │   ├── commands/           # undoable command bus
│       │   ├── factory/            # robotArm.ts, humanoid.ts generators
│       │   └── serialization/      # .nischay codec, project I/O, exporters
│       ├── kinematics/             # modelFK, modelIK (DLS), fabrik, analysis (mass/torque/stress)
│       ├── viewport/               # SceneManager, ModelEditor, PhysicsSim (Rapier), renderers
│       ├── robotics/               # NATIVE autonomy + training stack
│       │   ├── nav/                # occupancyGrid, astar, pathFollower, worldModel
│       │   ├── planning/           # rrt.ts (joint-space motion planning)
│       │   ├── collision.ts        # self/world collision model
│       │   ├── sensors/            # lidar.ts (scene raycast)
│       │   ├── rl/                 # ES, CMA-ES, BC trainers · policy · tasks ·
│       │   │                       #   obsNormalizer · curriculum · topologyEncoder
│       │   └── behavior/           # behaviorTree.ts engine
│       ├── features/               # UI: dock panels, menus, autonomy, training, servo, AI, ...
│       └── state/                  # Zustand stores (model, selection, dock, training, ...)
├── backend/                        # Optional FastAPI stub (proxy to ESP32)
├── esp32/                          # ESP32-C3 firmware (WiFi API + ST3215 driver)
├── tools/                          # Blender import add-on, helpers
├── ROADMAP.md                      # Platform roadmap
└── ROADMAP_ROBOTICS.md             # Native autonomy-stack roadmap
```

---

## Tech stack

| Area | Stack |
|---|---|
| App | React 18 + TypeScript (strict), Vite 5, Zustand |
| 3D | Three.js, postprocessing |
| Physics | Rapier3D (`@dimforge/rapier3d-compat`, WASM) |
| Training | Custom ES / sep-CMA-ES / BC (Adam) — pure TypeScript, no GPU needed |
| Charts | uPlot |
| AI | `@huggingface/transformers` (Transformers.js) · OpenAI / Anthropic / Gemini APIs |
| Desktop | Electron 33 + electron-builder |
| Hardware | ESP32-C3 (Arduino) + SCServo / ST3215 RS-485 bus |
| Backend (optional) | FastAPI + Uvicorn |

---

## Getting started

### Web (dev)

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
npm run typecheck    # tsc --noEmit
npm run build        # production build
```

### Desktop (Electron)

```bash
cd frontend
npm run electron:dev   # Vite + Electron together
npm run electron:build # packaged installer (Windows NSIS)
```

### Backend (optional stub)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## Using it

1. **Build or load a robot.** Drop in primitives/meshes and connect joints, or use
   **File ▸ New 6-DOF Robot Arm** / **New Humanoid Robot** for a complete sample.
2. **Pose & simulate.** Toggle the top-view **IK** button and drag a link; enable
   **Gravity** to run physics. Open **Analysis ▸ Overlay** for the stress heatmap.
3. **Animate.** Keyframe poses on the **Animation** timeline; scrub and play.
4. **Train a policy.** Open the **Training** panel → **Setup** (pick task: Reach /
   Navigate / Walk / Pose) → **Train** (choose ES, CMA-ES, or BC; enable ObsNorm +
   Curriculum for faster convergence; enable **TopoObs** for shape-changing robots) →
   watch the live reward curve → **Save** the skill → **Watch** it run on your robot.
   Use the **Cloud** tab to parse goals with a VLM or export a Colab notebook for
   GPU-accelerated training.
5. **Autonomy.** Open the **Autonomy** panel: add obstacles, build a LiDAR map, set a
   goal and **Navigate**; plan a collision-checked arm trajectory (**RRT**); or run a
   **Behaviour-Tree** patrol mission.
6. **Save / export.** **File ▸ Save Project As** writes a self-contained `.nischay`
   (geometry + embedded meshes + animation, encrypted). Export OBJ / STL / GLB / URDF.

### Training algorithms

| Algorithm | Best for | Speed |
|---|---|---|
| **ES** (Evolution Strategies) | Any task, getting started | Moderate |
| **CMA-ES** (Separable) | Manipulation, many-joint arms | ~2× faster than ES |
| **BC** (Behavioral Cloning) | Tasks with easy-to-record demos | Fastest (supervised) |

Enable **ObsNorm** (on by default) for stable training across all tasks.
Enable **Curriculum** to automatically progress from easy → hard difficulty.
Enable **TopoObs** if your robot can change shape — one policy generalizes across all configurations.

### The `.nischay` project file

A `.nischay` file is the model document + animation, serialized to JSON and wrapped in
an encrypted binary container (SHA-256 keystream XOR with a per-file salt). It is
**self-contained** — imported meshes are embedded as base64 — so a single file carries
the whole robot. It opens in any copy of TETROBOT. (This is app-format obfuscation, not
secure DRM, since the key ships in the client.)

---

## Hardware (optional)

```
ESP32-C3  ──► RS-485 transceiver ──► ST3215 smart-servo bus (half-duplex, 1 Mbaud)
Power: 7.4 V LiPo / regulated supply, sized to the servo count
```

The **Servo Control** page polls live telemetry (angle, current, temperature, load,
voltage), drives each servo (GO / CW / CCW / WAVE / STOP / torque), supports group
control, sequence recording, presets, and thermal/overcurrent alerts. One ST3215 maps
to each movable joint in the model.

### ESP32 firmware endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/api/telemetry` | Per-servo angle, current, temp, load, voltage |
| `GET` | `/api/command` | Single servo: `?servo=N&cmd=pos&angle=Y&speed=Z&acc=W` |
| `GET` | `/api/batch` | Multi-servo positions in one request |

Flash `esp32/firmware.ino` (Arduino, ESP32-C3 board + SCServo library), set WiFi
credentials, and point the Servo Control page at the device.

---

## License

© Nischay Sai D R. All rights reserved. Proprietary & confidential — unauthorized use,
copying, or distribution is prohibited.
