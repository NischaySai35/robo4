<div align="center">

# ✴ TETROBOT

### GUI-first Robotics Modeling, Simulation & Training Platform

*Design, simulate, analyze, animate, train and drive any robot — including modular,*
*shape-changing ones — **without writing a line of code.***

![License: Proprietary](https://img.shields.io/badge/license-Proprietary-red)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Three.js](https://img.shields.io/badge/Three.js-3D-000000?logo=three.js&logoColor=white)
![Rapier](https://img.shields.io/badge/Rapier3D-physics-8B5CF6)
![Electron](https://img.shields.io/badge/Electron-desktop-47848F?logo=electron&logoColor=white)
![Platform](https://img.shields.io/badge/platform-desktop%20%7C%20web-informational)

</div>

Design any robot **without writing code** — including **modular robots** you
assemble by snapping keyed connectors together. Simulate it (kinematics + physics),
analyze it (mass, motor load, material stress, current), animate it, train intelligent
control policies (ES / CMA-ES / Behavioral Cloning), and run a full **native autonomy
stack** (navigation, motion planning, perception, behaviour trees) — all in one app.
No ROS, no middleware, no servers. Optionally drive real hardware
(ESP32-C3 + ST3215 smart servos) over WiFi, in real time.

> **One rich model, many backends.** A single JSON-serializable robot **document** is
> the source of truth; the 3D viewport, physics, analysis, animation, training,
> exporters, hardware and autonomy are all *views* of it. The app is organized into
> pages — **Editor · Analysis · Training · Animation · Motor Control** — that share
> one live 3D scene.

By **Nischay Sai D R** · Proprietary & confidential.

---

## Contents

[Highlights](#highlights) · [Architecture](#architecture) · [Tech stack](#tech-stack) ·
[Getting started](#getting-started) · [Using it](#using-it) ·
[Hardware](#hardware-optional) · [License](#license)

---

## Highlights

- **Code-free robot builder** — compose rigid **bodies** (box / cylinder / capsule /
  sphere / cone / torus / imported STL/OBJ mesh) and **joints** (revolute, continuous,
  prismatic, fixed, …) into any kinematic graph. Constant-size move/rotate/scale gizmos,
  snapping, measure tool, face-mate assembly, and a Blender-style mesh **Edit Mode**.
- **Modular connector mating** — attach **keyed connectors** to any body (position +
  outward normal + a roll/key tangent + rotational symmetry). Auto-Snap (or the manual
  Assembly Mate) finds facing connectors and mates them with a real detachable joint: it
  aligns opposing normals, **rotates the module to the nearest keyed seat** (e.g. every
  90°), then plays an *approach → align → insert → latch* motion (backs off, slides
  straight down the normal, locks) with an **obstacle collision guard**. Right-click a
  locked joint to **Unlock** — it slides the module back out and detaches. All of it runs
  in live **FK space**, so a posed/rotated/grounded module mates where it actually appears.
- **Reusable modules** — a **default module** ships with the app and can be dropped into
  *any* project with **Add Module** (or **Edit Default** to customize and save your own).
- **Kinematics & grounding** — generic **forward kinematics over the graph** (honors
  loops / cross-module snap joints) + **inverse kinematics** (damped-least-squares and
  FABRIK). **Drag-from-tip IK**: grab any link and the chain solves to follow. A shared
  **Free / Rigid grounding** (with optional **Auto-ground to CoM**) picks the fixed base;
  the choice is consistent across Editor, Analysis and Animation.
- **Closed-loop mechanisms (parallel linkages)** — lock connectors into a **loop** and it
  behaves like a real parallel mechanism, not a tree that falls apart. A real-time
  **cut-joint constraint projection** re-closes every loop after *any* edit (drag, gizmo,
  animation) so locks never tear; **type-aware** closure keeps a revolute's hinge axis
  aligned while its angle stays free. Levenberg–Marquardt IK with task-priority
  **nullspace** resolution spreads the bend by least effort, and a **VSEPR-style spread
  score** (a live on-screen number) opens the assembly out instead of letting it crumple.
- **Physics** — live gravity simulation on Rapier with anchored roots, joint limits,
  servo-style holding motors, and a per-pair **self-collision** model (parts that are
  jointed or nest at rest pass through; everything else collides solidly).
- **Joint types (actuators)** — group joints into named **profiles** (e.g. "Twist",
  "Bend") that share a motor + torque limit; edit one and every joint of that type
  updates. The actuator lives on the joint; mass/material on the body.
- **Engineering analysis** — total mass + center of mass, per-joint gravity-holding
  **torque** (N·m and kg·cm), **estimated current**, and a live surface heatmap with three
  switchable modes: **Motor load** (% of torque limit), **Material stress** (relative
  structural stress + Min FoS), and **Current** (% of stall). Over-limit joints raise
  **pulsing alert cards**; type/scrub joint **angles** right in the table; an interactive
  color-bar shows the live peak with **overstrain past 100%**. Plus a multi-metric,
  CVD-safe live **telemetry chart**.
- **Animation** — build **clips** of keyframed joint poses on a timeline (type/scrub the
  duration & fps, drag to reorder), then chain clips into **groups** (sequences with
  delays) to choreograph shape-changing demos. Pose live with IK; everything round-trips
  in the `.nischay` file.
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
  embedded meshes + animation, all in one file). Export geometry to **OBJ / STL / GLB**
  and robot descriptions to **URDF / SDF / MJCF / IDL**.
- **Desktop + web** — runs as an Electron desktop app or in the browser.
- **Hardware control + real-time Sync** — a **Motor Control** page drives ST3215 servos
  via an ESP32-C3 (live telemetry, group control, sequences). A **Sync** toggle streams
  the live model joint values straight to the connected motors (~20 Hz) while telemetry
  flows back — so playing an animation or dragging a joint moves the real robot.

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
(Three.js render,  (Rapier sim,   (FK / IK /       (mass, motor    (ES/CMA-ES/BC  (nav, RRT,    (.nischay,
 gizmos, mating)    collisions)    FABRIK, gr'd)    load, stress)    + VLM cloud)  lidar, BT)   OBJ/STL/GLB,
                                                                                                URDF/SDF/MJCF/IDL)
                                                                                                      │
                                                                                   Hardware ── ESP32-C3 ── ST3215 bus
```

For the code-level layout and design details, see
[`frontend/ARCHITECTURE.md`](frontend/ARCHITECTURE.md); roadmaps live in
[`ROADMAP.md`](ROADMAP.md) / [`ROADMAP_ROBOTICS.md`](ROADMAP_ROBOTICS.md) /
[`PLAN-INDUSTRIAL.md`](PLAN-INDUSTRIAL.md).

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

1. **Build or load a robot.** On the **Editor** page drop in primitives/meshes and
   connect joints, or use **File ▸ New 6-DOF Robot Arm** / **New Humanoid Robot** for a
   complete sample. **Add Module** drops in the default modular unit; edit its geometry,
   connectors and joints as you like.
2. **Assemble modules.** Give bodies **connectors**, drag two modules close, and
   **Auto-Snap** (or pick the pair in Assembly Mate) — they align to the keyed seat and
   slide together into a real joint. Right-click a snap joint to **Unlock**.
3. **Pose & simulate.** Turn on **Drag tip to move** and drag a link (IK); pick **Rigid**
   grounding and set a base (or **Auto-ground**); enable **Gravity** to run physics.
4. **Analyze.** On the **Analysis** page toggle **Stress overlay** and switch modes
   (**Motor limit / Material stress / Current**). Type or drag joint **angles** in the
   table, watch overload alert cards, and read the live telemetry chart.
5. **Animate.** On the **Animation** page pose the joints, move the playhead and hit
   **◆ Key** to record into the selected **clip**; make more clips and drag them into a
   **group** to sequence a demo. **Sync** streams it to real motors if hardware is connected.
6. **Train a policy.** Open the **Training** panel → **Setup** (Reach / Navigate / Walk /
   Pose) → **Train** (ES, CMA-ES, or BC; enable ObsNorm + Curriculum; **TopoObs** for
   shape-changing robots) → watch the reward curve → **Save** the skill → **Watch** it run.
   Use **Cloud** to parse goals with a VLM or export a Colab notebook.
7. **Autonomy.** Add obstacles, build a LiDAR map, set a goal and **Navigate**; plan a
   collision-checked arm trajectory (**RRT**); or run a **Behaviour-Tree** mission.
8. **Save / export.** **File ▸ Save Project As** writes a self-contained `.nischay`
   (geometry + embedded meshes + all animation clips/groups, encrypted). Export geometry
   (OBJ / STL / GLB) or a robot description (URDF / SDF / MJCF / IDL).

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

A `.nischay` file is the model document (bodies, joints, joint profiles, connectors,
materials, assets) + all animation clips/groups + workspace, serialized to JSON and
wrapped in an encrypted binary container (SHA-256 keystream XOR with a per-file salt).
It is **self-contained** — imported meshes are embedded as base64 — so a single file
carries the whole robot. It opens in any copy of TETROBOT. (This is app-format
obfuscation, not secure DRM, since the key ships in the client.)

---

## Hardware (optional)

```
ESP32-C3  ──► RS-485 transceiver ──► ST3215 smart-servo bus (half-duplex, 1 Mbaud)
Power: 7.4 V LiPo / regulated supply, sized to the servo count
```

The **Motor Control** page polls live telemetry (angle, current, temperature, load,
voltage), drives each servo (GO / CW / CCW / WAVE / STOP / torque), supports group
control, sequence recording, presets, and thermal/overcurrent alerts. One ST3215 maps
to each movable joint in the model. The viewport **Sync** toggle (next to the axis
gizmo) streams live model joint values to the connected board so the physical robot
follows your poses/animation in real time, with telemetry fed back into the app.

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
