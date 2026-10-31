# TETROBOT Studio — Restructuring Plan

Status: **in progress** (started 30 Oct 2026, work began 31 Oct on branch `restructure`). Owner: Nischay. See "Where it stands" just below.

**Why this exists (Nischay):** this restructuring turns TETROBOT from AI-prompted software into efficient, optimised, properly engineered software. It is one part of the project. Anyone can use this software for their own projects that need graphs, but the final goal comes after it: making my robots into shape-changing Transformers and Big Hero 6-style microbots.

This is the single plan for rebuilding the Studio: the new look, the Blender-style architecture, and (to be added) the
physics and robot-model changes. Background documents it builds on:

- `docs/BLENDER_STUDY.md` — how Blender works, from its source (main loop, operators/undo, viewports, depsgraph, rendering, physics).
- `docs/STUDIO_ARCHITECTURE_PLAN.md` — where the Studio is today and the 12 refactor steps (0–11) with checks.
- `docs/ARCHITECTURE.md` — current layer rules (core → viewport/state → features).
- UI chooser artifact: https://claude.ai/artifact/1eWmjYiaRLh1myrBhC4LGE

---

## Where it stands (31 Oct 2026, branch `restructure`, nothing pushed)

| Phase | State |
|---|---|
| P0 Safety net, P1 Foundation, P2 Viewport, P3 Frame scheduler, P4 Dockview, P5 One undo | **Done** |
| P6 Operators and keymap | **Done for shortcuts, palette, help and main menu items.** Panel buttons still dispatch directly |
| P7 Components | **Started:** direction A tokens everywhere, dark by default. Controls not yet moved to shadcn and Tweakpane |
| P8 Original vs evaluated, P9 Render engines | Not started |
| P10 Physics interface | **Waiting for §7** |
| P11 Registries and versioning | **File versioning done.** Entity registry and property descriptors not started |
| GOS G0 Contract | **Done** |
| GOS G1 Graph core | **Done:** Rust core shared by Python and Studio; MJCF export moved into it |
| GOS G2 Transport | **Started:** interface, local, Zenoh across processes. Budget checked only for Python to Python |
| GOS G3 Basics | **Started:** `gos.App`, topics, locks, services, parameters, lifecycle, MCAP record and play, `gos run`, `graph`, `sim`, `topic echo`. Services and parameters work in one process only. Actions and the transform graph not done |
| GOS G4 GraphIK | **Started:** `robot.ik` on mink holds rings. Comparison table and reaching hard goals not done |
| GOS G5 Studio as client | **Started:** `gos.studio.StudioLink`, GOS panel, commands by name, live joints. Animation-only window and `gos view` not done |
| GOS G6 Real robot | Not started; needs the robot and your approval to move motors |
| GOS G7 Packaging | Not started; bundling physics waits for §7 |
| GOS G8 ROS 2 bridge, G9 Full parity | Not started; G8 needs a ROS 2 install |

Decided 31 Oct by Nischay: Rust for the core; `C:\TETROBOT\sim` brought into the repo as `sim/`.

## 1. Decisions made

| Area | Decision | Why |
|---|---|---|
| Visual direction | **A · Pro dark, Blender-like** | Dense, docked, keyboard-first, neutral greys with one selection blue; End A dark blue / End B orange kept as robot colours. Closest to Blender. |
| App shell (layout) | **Dockview** (React, MIT core, zero deps) | Tabs, groups, splits, floating and pop-out windows, saved layouts: Blender areas / VS Code style docking. |
| Components | **shadcn/ui + Tailwind v4** | Components copied into our repo (we own and theme them), accessible primitives underneath (Base UI or Radix), design tokens in CSS. |
| Property / tweak panels | **Tweakpane** (dependency-free, MIT) | Compact parameter panes with folders, tabs and graph plugins for joint, servo, physics and render parameters. |

## 2. Decisions still open

| Area | Options | Default if no choice |
|---|---|---|
| Icons | Lucide · Phosphor | **Lucide, installed in P1** |
| Charts / live telemetry | uPlot · Apache ECharts | uPlot (fast time series for servo load, IMU, current) |
| Motion | Motion · none (CSS only) | CSS only; Motion only if a panel transition needs it |
| shadcn primitive layer | Base UI · Radix | **Base UI** (`base-nova`, the default in shadcn 4.23), installed in P1 |
| React version | stay 18.3 · upgrade to 19 | **Already 19.3** (done in the single-stack upgrade) |
| **Physics** | to be added by Nischay | (current recommendation in §7) |
| **New module model** (mechanical locks, new CAD) | to be added by Nischay | — |
| Other changes | to be added by Nischay | — |
| **GOS** (engine, communication, IK, external control) | See §10.10 | Proposal in §10 |

## 3. Target picture (one sentence each)

- **One data model, many views:** the document (bodies, joints, locks, modules) is the single source; Editor, Analysis, Animation, MSRR are views/editors on it, like Blender areas.
- **Every action is an operator:** buttons, menus, shortcuts, command palette and scripts all run registered operators, so undo/redo, keymaps and search work everywhere.
- **Viewports own their camera:** a per-viewport handle (camera, controls, render engine, overlays) replaces the global `bridge`; context = the viewport under the mouse.
- **Redraw only what changed:** one frame scheduler draws only tagged, visible viewports; hidden pages draw nothing.
- **User data vs evaluated data:** physics, animation and the planner write an evaluated copy, never the user's document.
- **Pluggable engines:** render engines (EEVEE-like raster, path tracer) and physics engines behind small interfaces.
- **Look:** direction A everywhere, built from one token set and one component kit; no per-feature hand-written CSS for common controls.

## 4. UI system (direction A)

### 4.1 Design tokens (Tailwind v4, CSS-first `@theme`)
- Neutrals: Blender-like greys (app background ~#1d1d1d, panels ~#262626, headers ~#2b2b2b, borders ~#111), text ~#cfcfcf / muted ~#8a8a8a.
- One accent for selection and active state (blue ~#4772b3); semantic colours separate (ok green, warning amber, error red).
- Robot colours as tokens: End A dark blue, End B orange, per-module colours (M1…), locked = green.
- Type: compact UI size (11–12 px panels, 13 px menus), monospace for numbers and telemetry.
- Density: small paddings, 2–4 px radii, thin 1 px borders; light theme kept as a second token set (exact values to be tuned on screen, these are starting points).

### 4.2 Shell with Dockview
- One Dockview layout per **workspace** (Editor, Analysis, Training, Animation, MSRR, ESP-TTL, Motor), like Blender workspaces; layouts saved and restorable, "reset layout" command.
- Panels become Dockview panels: 3D viewport(s), Outliner (project explorer), Properties, Timeline, Telemetry, Log, MSRR Planner (Robot / Shapes / Plan / Ask / Run / Manual), Connection, Servo controller.
- More than one 3D viewport possible (e.g. top + perspective), each with its own camera through the per-viewport handle (architecture step 1–2). This also replaces the Analysis page's second renderer.
- Header bar: app menu, workspace tabs, global status (ESP32 connection, servo count, theme).

### 4.3 Components
- P1 setup: `src/styles/tokens.css`, with no Tailwind reset, a `tw:` class prefix, and tokens only under `data-ui="a"`, so nothing changes until a piece is migrated. `shadcn add` under these settings wrote a broken `from "cn"` import, added an unrelated npm package named `cn`, and skipped `@base-ui/react`: check each added component.
- shadcn/ui for buttons, menus, context menus, dialogs, tabs, tooltips, selects, toggles, sliders, toasts, command palette (`cmdk`).
- Tweakpane for property panes (joint angles and limits, servo parameters, render settings, physics and disturbance settings, IK options): one helper that binds a Tweakpane pane to document properties through operators (so every tweak is undoable).
- Existing shared pieces are migrated, not duplicated: `features/common` (ContextMenu, ResizablePanel, LoadingBar, Icon), `features/viewport-ui` (NavigationGizmo, ViewControls, HomeButton), `ViewportStats`, `SpreadHud` (VSEPR score, keep), MSRR `SessionBar` / `ShapeButtons` / `ManualPortMenu`.

### 4.4 UI rules
- Every feature ships with its companions: status/feedback, undo/back, reset, errors that say what to do, menus that close on outside click / Esc.
- No component is written twice: grep `features/common`, `features/viewport-ui`, `components/ui` (shadcn) first.

## 5. Phases (architecture + UI together)

Each phase: design note in `docs/design/` (for the marked ones) → small changes → typecheck + tests → **tab checklist** (§6) → commit. The step numbers refer to `STUDIO_ARCHITECTURE_PLAN.md`.

| Phase | What | Arch step | Done when |
|---|---|---|---|
| **P0 Safety net** *(done)* | Tab checklist + baseline screenshots of all 7 pages and an MSRR open/close round trip (`tools/ui_shot.py`); record what already fails | 0 | Baseline saved; failures listed |
| **P1 Foundation** *(done)* | Tailwind v4 (Vite plugin) + direction-A tokens + shadcn/ui init + fonts; no screen changes yet | — | Builds, nothing looks different, tests green |
| **P2 Viewport context** *(design note, done: `docs/design/p2-viewport-context.md`; reader migration moved to P4)* | `viewportRegistry`, a handle per `SceneManager`; `bridge` becomes a forwarder to the active viewport; remove MsrrCanvas' save/restore workaround | 1–2 | Every tab passes the checklist; MSRR round trip leaves the editor camera untouched |
| **P3 Frame scheduler** *(done: `runtime/frameScheduler.ts`, a test fails if anything else calls `requestAnimationFrame`)* | One `requestAnimationFrame`, `tagRedraw()`; hidden pages and idle viewports draw nothing | 3 | Idle = 0 renders/s (`?profile`), playback still smooth |
| **P4 Dockview shell** | App layout moved into Dockview workspaces; panels wrapped one by one; layouts saved | — | All panels reachable; layouts persist; checklist green |
| **P5 One undo stack** *(design note)* | Undo of immutable document references; remove SimCanvas JSON-snapshot history; route Ctrl+Z | 4 | Single undo path; undo/redo works on every page |
| **P6 Operators + keymap** *(design note)* | Operator registry (poll / exec / invoke / modal); buttons, menus, palette, shortcuts call operators; keymap table | 5–6 | "Run every operator" test; shortcuts listed in one place |
| **P7 Component migration** | Restyle and replace controls page by page with shadcn/ui + Tweakpane on the token set | — | No per-feature CSS for common controls; screenshots match direction A |
| **P8 Original vs evaluated** *(design note)* | Physics / animation / planner write an evaluated copy only; notifiers instead of whole-store subscriptions | 7–8 | No simulation result written into the document |
| **P9 Render engines** *(design note)* | Render-engine interface; one GPU context for many viewports (fixes Analysis' second renderer) | 9 | Each viewport picks an engine; one upload per mesh |
| **P10 Physics interface + jobs** *(design note)* | Physics-engine interface, simulation cache (state per frame), background jobs with progress/cancel | 10 | See §7 once decided |
| **P11 Registries + file versioning** | Entity type registry, property descriptors, `.nischay` file version upgrades | 11 | Old project files load through versioning |

Order note: P2/P3 come before Dockview because docking multiple viewports needs per-viewport context first; P7 can run in parallel with P5–P6 once P4 is in.

## 6. How every step is checked
1. `npm run typecheck` and `npm test` green.
2. Layer rules (dependency-cruiser): core imports no viewport/features/state; no new imports of the global bridge after P2; only the frame scheduler calls `requestAnimationFrame` after P3.
3. Tab checklist: Editor, Analysis (top and bottom view), Training, Animation, MSRR (Robot, Shapes, Plan, Ask, Run, Manual, open/close round trip), ESP-TTL, Motor Control; FIT / Home / gizmo / undo on each.
4. Screenshots compared with the P0 baseline.
5. Physics checks through the short service endpoints only (≤ 120 s per run).

## 7. Physics and robot model — to be filled in by Nischay

Current recommendation (for discussion, not decided):
- Robot physics stays **MuJoCo**: CPU for the live Studio and single runs, **MuJoCo Warp** (later possibly **Newton**) on the GPU for many robots.
- One robot description: the Studio model exported through its MJCF exporter feeds the simulator (today the Python sim builds its own).
- Browser: either the Studio stays a viewer of the server physics (as MSRR now) or MuJoCo's WebAssembly build runs in the Studio; Jolt and the unused Rapier dependency retired for robot work.
- Drake only as an optional specialist (contact check of the connector, trajectory optimisation), via WSL2.
- The new module (mechanical locks, no electromagnets) needs a new sim model with real collision shapes from the CAD.

Nischay's additions:
- _(to be added)_

## 8. Other changes — to be filled in by Nischay
- _(to be added)_

## 9. Engineering process (applies to every phase)
- Read the architecture docs before each change; build on existing code, never a parallel copy.
- Design note first for the marked phases: problem, chosen approach, rejected alternatives, how to verify.
- Small changes, one concern each; keep the old path until the new one is proven.
- Module owners and the checks to run per module in `docs/MODULES.md` (to be written in P0).
- Comments say why, with the date or bug they come from.
- Progress logged in `docs/G6_PROGRESS.md`; this file holds the plan and the decisions.

---

## 10. GOS, the Graph Operating System (proposal, not started)

**One sentence:** GOS is the engine and communication system under TETROBOT, usable with the Studio open, with only the animation view, or with no window at all from a terminal or Python, and built on a graph, so loops and robots that change shape are normal cases.

### 10.1 What the reference systems teach

ROS 2 and Isaac Sim are the main references. Copy the idea, not the whole system.

| System | How it works | What GOS takes |
|---|---|---|
| **ROS 2** | Layers: user code → client library → `rmw` (a C interface) → DDS or Zenoh. Generated message types. Topics, services, actions, parameters, node lifecycle. | Swappable transport behind a small C interface; generated types; the same concepts and vocabulary |
| **Isaac Sim** | A script creates `SimulationApp`, calls `update()`, then `close()`. `"headless": True` removes the window. Extensions are enabled from config or Python. USD holds authoring, Fabric holds runtime data, tensors hold batch data. | The script-owns-the-app pattern; the three separate data paths |
| **MoveIt 2** | IK is a plugin (KDL by default, TRAC-IK, pick_ik). Collision uses FCL. Community answers say closed chains are not supported, because the model comes from URDF. | IK and collision as plugins. Closed chains are where GOS must beat it. |
| **MuJoCo** | Constant `mjModel`, changing `mjData`, no memory allocation after startup. Loops are equality constraints over a tree. `mj_recompile` edits a model while keeping the simulation state. | Model/state split, no allocation in hot loops, recompile on lock or unlock |
| **mink** | Python differential IK on MuJoCo: configuration and task-space goals, joint limits, collision between geoms, loops through equality constraints. Apache-2.0. | Fastest route to the first closed-loop IK |
| **Pinocchio** | C++ dynamics with closed-loop support and analytical derivatives. BSD-2. `pip install pin` is Linux-only; conda for other systems. | Fast derivatives if mink is too slow |
| **Gazebo** | Server and GUI are separate processes. Entity-component store, systems as plugins. The GUI reads state and sends changes back as commands. | Server/GUI split: the Studio becomes a client |
| **Blender** | Operators, RNA and depsgraph (`docs/BLENDER_STUDY.md`). | Every action callable from a script, same as from a button |
| **Dora** | Rust dataflow with YAML graphs, Apache Arrow data, shared memory above 4 KB, a CLI, nodes added while running. Own claim, no method shown: 10–17x faster than ROS 2 Python. Windows is best effort. | Live graph editing, Arrow, the CLI shape |
| **Zenoh** | Pub/sub, query/reply, liveliness, shared memory, Python wheels including Windows. EPL-2.0 or Apache-2.0. Also a ROS 2 transport through `rmw_zenoh`. | First candidate for the GOS transport |
| **iceoryx2** | Rust core with C, C++ and Python bindings. Pub/sub, request/response, blackboard. Windows, Linux and macOS at tier 2. Apache-2.0 or MIT. | Only if measurements show Zenoh is too slow on one machine |
| **LCM, YARP** | LCM: no daemon, UDP multicast, generated types. YARP: named ports with swappable connection types. | Keep it simple: no central process required for basic use |
| **Rerun, Foxglove, MCAP** | Rerun: `spawn` starts or reuses a viewer and streams to it; `connect_grpc` joins one. MCAP: an open log container that doesn't depend on the message encoding. | The "animation view only" mode; MCAP for recordings |
| **Newton, Drake, Webots** | Newton: GPU physics on Warp, MuJoCo Warp as main backend, Apache-2.0. Drake: systems wired into diagrams, each declaring its state and parameters. Webots: not verified, its docs page did not load. | Newton as a later GPU backend; Drake's explicit state discipline |

### 10.2 Correction: "kernel level" is not where these systems get their speed

From the sources read, ROS 2, Isaac Sim, MuJoCo, Zenoh and iceoryx2 work in normal user-space code, and none was shown to ship its own kernel driver. GOS should not write one either: it is a large risk and makes every install harder (this is judgement, not a sourced fact). The speed comes from:

1. **No copying:** shared memory, with fixed binary layouts instead of JSON.
2. **No allocation in hot loops:** MuJoCo's model.
3. **Right data store for each job:** Isaac's USD / Fabric / tensor split.
4. **GPU for batches:** Warp, tensors.
5. **Native code in the inner loops,** with Python and TypeScript only for orchestration.
6. **Only computing what changed:** Blender's tagging and depsgraph.

The operating system and driver level still matter in three places:

- **USB serial:** FTDI adapters default to a 16 ms latency timer, and that delay alone can limit a control loop. Whether our ESP32's USB chip behaves like this is not confirmed, so measure it.
- **Real time:** Linux with PREEMPT_RT is the known route. Windows and macOS stay soft real time. Keep the hard loop on the ESP32 or real-time Linux.
- **GPU:** Warp and Newton use CUDA on NVIDIA GPUs with driver requirements. macOS is CPU only.

### 10.3 What already exists (verified in this repo, 31 Oct 2026)

| Piece | Today | Gap |
|---|---|---|
| Graph model | `core/model/graph.ts`, loops allowed | Good base. Keep it as the source of truth. |
| ROS-like runtime | `runtime/`: bus, services, actions, params, TF, clock, recorder (967 lines with tests) | Runs **inside the Studio window**, so nothing outside can reach it. `tf.ts` is a tree. Few features use it. |
| IK | `modelIK.ts`: damped least squares and Levenberg-Marquardt with a numerical Jacobian, along **one path** between two bodies. Also `fabrik.ts`, `msrr/chainSolve.ts`, and SciPy `least_squares` in `manual.py`. | **No general closed-loop IK.** FK only tolerates loops. `loopClosure.ts` is cited in a comment but isn't in the source or its git history. |
| Exporters | URDF writes loop joints as comments, with a warning. | **Confirmed 31 Oct: `mjcf.ts` loses loops.** A ring exports an empty world, a diamond loses its closing joint silently, and the default module does not load in MuJoCo (no `<asset>`). See `docs/design/gos-g0-baseline.md`. |
| External control | None. `main.cjs` reads no script arguments. Dev services run only under `npm run dev`. | Everything in §10.5 is new. |
| Physics service | `verify_service.py` on `:8771`, from `C:\TETROBOT\sim` | **Not in git and not in the installed app.** Must move into the repo first. |
| Native core | `docs/STATUS.md` describes a Rust core, then a C++ port in `native/`. | **`native/` is gone: it was never committed.** The Rust core (8 crates, 45 tests) can be recovered from `f566107^`. The reason for the move is not recorded. |

### 10.4 Architecture

```
 Python · terminal · VS Code · ML training · ROS 2 bridge · Studio window
                              │  all are clients, same API
                 ┌────────────┴─────────────┐
                 │   libgos (stable C API)  │  bindings: Python, Node, C++
                 └────────────┬─────────────┘
   graph store · topology compiler · GraphIK · collision · planners
   clock · recorder · lifecycle · operators · parameters · transforms
                              │  transport interface (like ROS rmw)
        in-process · shared memory · Zenoh network · WebSocket (browser)
                              │  backend interfaces
   MuJoCo · MuJoCo Warp/Newton · real robot (ESP32 + ST3215) · camera · IMU
```

- **`gosd`** is the headless engine process, shipped inside the installer. It can also run with no daemon at all, in-process in a script.
- **The Studio stops being the engine.** It connects to GOS like any other client, and the rule "buttons call operators" (P6) makes every button scriptable automatically.
- **Three data paths:** Document (edits and undo), Evaluated store (fixed binary state each frame), Batch (GPU tensors for thousands of robots).

**Two ways to use it**

```python
import gos

# 1. No window: opens, runs, closes by itself
with gos.App(headless=True) as app:
    robot = app.load("three_modules.nischay")
    app.lock("M1.B", "M2.A")                 # topology changes while running
    result = robot.ik(goal="M3.B", pose=target)
    app.run(seconds=5)
```

```text
gos run my_script.py                  # run a script against GOS
gos sim start scene.nischay --headless
gos topic list | gos topic echo /joints | gos node list
gos graph show | gos graph lock M1.B M2.A
gos ik M3.B --pose ...
gos record out.mcap | gos play out.mcap
gos studio --attach                   # open the window on a running session
gos view                              # animation view only, for outside ML projects
```

(Illustrative: the names get fixed in the G0 contract.)

**Modes for someone who only installed the exe:** full Studio; animation view fed from their own Python; GOS with no window. The Python package comes from `pip install gos` and finds the installed app. The name `gos` on PyPI is not checked yet.

**Safety by default:** localhost only, with an access token; the network is opt-in, because this can move real motors. Real-robot motion needs an explicit arm step and has a stop that always works.

### 10.5 ROS feature checklist

| ROS 2 feature | GOS | Basics (G1–G3) |
|---|---|---|
| Nodes + lifecycle (unconfigured, inactive, active, finalized) | Same states | Yes |
| Topics, QoS (reliable/best effort, keep last, latched) | Grow from `messageBus.ts` | Yes |
| Services, actions, parameters | Grow from `services.ts`, `actions.ts`, `params.ts` | Yes |
| Message definitions + generation | One schema, generated for TS, Python, C++ | Yes |
| tf2 | Transform **graph** | Yes |
| Launch files | Graph file: nodes, wiring, scene | Yes |
| `ros2` CLI | `gos` CLI | Yes |
| rosbag | MCAP recording; existing `.nischaybag` kept or converted | Yes |
| URDF/SDF | Native graph; import URDF; export with loop warnings | Partly exists |
| Sim time | `clock.ts` | Exists |
| Network discovery | Zenoh | Yes |
| RViz | Studio animation view | Exists, needs the client mode |
| Security (SROS2) | Token first, encryption later | Later |
| `ros2_control` | Hardware interface over the real robot | G6 |
| MoveIt-style planning | GraphIK + collision + planner | G4–G5 |
| Nav2, perception packages | Reachable through the bridge from G8; native versions tracked in the parity register | Bridge first |
| Composition, executors, callback groups, remapping, namespaces, domain isolation | Same abilities | G3 core, rest G9 |
| Logging, diagnostics, introspection tools (`rqt`-style) | CLI first, Studio panels after | G3, G9 |
| Packages, dependencies, build tool (`colcon`, `rosdep`-style) | GOS packages | G9 |
| Embedded nodes (micro-ROS-style, ESP32) | GOS client on the microcontroller | G6, G9 |
| Fleet and multi-machine | Through the network transport | G2, G9 |
| Encryption, permissions | Full security model | G9 |

**Hard requirement (Nischay, 31 Oct 2026): there must be no situation where ROS 2 can do something and GOS cannot.** Three levels satisfy it:

1. **Core:** every ROS 2 core feature exists natively in GOS.
2. **Ecosystem:** thousands of community ROS packages can't all be rewritten, so the G8 bridge must let any ROS 2 node or package work with GOS from day one, with native versions added by priority.
3. **Proof:** `docs/GOS_PARITY.md` lists every ROS 2 feature with native / bridge / missing status and a test for each. Done means no feature is left "missing". Start it in G0 from the official ROS 2 docs, not from memory; the table above is only a starting list.

**ROS 2 is a bridge, not a dependency.** A bridge node maps topics, services and actions to ROS 2, and tree-only tools receive a tree view plus a warning listing what was cut. That matches what the URDF exporter already does.

### 10.6 Beyond ROS: what only a graph system can offer

1. **Topology as live data:** `lock` and `unlock` are first-class operations with events and undo, and the solver, collision and physics update without a restart.
2. **Dynamic IK on any graph:** chains, branches and loops. Any body or floor contact can act as the base, and this can change during motion.
3. **Transform graph:** several paths can connect two frames, and GOS reports the mismatch between them. That mismatch directly measures loop-closure error and flex. tf2 cannot express this because it is a tree.
4. **Rigid-group awareness:** locked modules merge into one body for the solver, and split again on unlock.
5. **Self-describing robots:** modules report ID, connectors and locks, so the graph builds itself from the hardware.
6. **Shape-changing as a service:** planner and VSEPR `spreadScore` available as a normal API.
7. **Reproducible runs:** one clock, seed and recording replay the same run in sim, then compare it with the real robot.
8. **Same code for sim and real,** with camera optional and blind as a normal mode, matching how TETROBOT already works.

### 10.7 GraphIK: the IK plan

**Question: what do we use today?** See §10.3: path-based damped least squares and LM. It works for one chain, but not for a robot that closes a loop.

**Method (differential IK as an optimisation at each step):**

1. **Compile the graph:** merge locked rigid groups, find connected parts, pick a spanning tree, and turn every remaining joint into a loop constraint. This is how MuJoCo represents loops too.
2. **Each step, solve for joint velocities:** minimise goal errors, subject to loop closure, joint limits, speed limits, collision distance and floor contact.
3. **On lock or unlock:** recompile (`mj_recompile` keeps simulation state), and keep the solution so motion doesn't jump.
4. **Add a global layer:** differential IK gets stuck, so use restarts or sampling for hard targets. TRAC-IK and pick_ik both add a second search for this reason.

**Stages:**

| Stage | What | Test |
|---|---|---|
| A | mink on the MuJoCo model of 2–3 modules | Ring and cobra hold closure while tracking a goal |
| B | Compare with existing `modelIK` and SciPy: speed, success, closure error | Published table |
| C | Native solver only if B shows it is needed (Pinocchio or own) | Target set from B |

This doesn't remove the real-world limit found in G6: joint flex of 0.8–1.4° gives 23–46 mm of end error, so IK alone won't close a ring blind. It still needs touch or camera feedback.

### 10.8 Measure first: performance budget

Numbers below are **starting targets to test, not promises**. Today's measured values are in `docs/design/gos-g0-baseline.md`.

| Path | Target |
|---|---|
| Topic latency, same machine, small message | under 100 µs from native code; measure Python separately |
| Large data (camera frame), same machine | no copy |
| Studio view of joint state | every frame at 60 Hz, no JSON |
| GraphIK step, 3 modules | under 1 ms native, under 5 ms in Python |
| Topology change (lock) | under 50 ms |
| Laptop to servo round trip | measure first, then set the target |
| Idle with no window | close to 0% CPU |
| Installer and app size | **Explained:** 320 MB `app.asar` + 307 MB unpacked, about 540 MB of it packages already bundled in `dist` (estimate until a build confirms) |

Vendor numbers aren't trusted: iceoryx2's README snapshots disagree with each other, and Dora gives no method. We run our own benchmark on Windows and Ubuntu 24.04.

### 10.9 Phases (run alongside P0–P11)

| Phase | What | Needs | Done when |
|---|---|---|---|
| **G0 Contract + baseline** | API and message design note; benchmark today; move `sim` into the repo; recover or drop `native/` | — | Numbers published; sim versioned |
| **G1 Graph core** | Pull graph + topology compiler out of the Studio; fix loop export | P0 | Same results from Node and Python; loops survive export to MJCF |
| **G2 Transport** | Interface + in-process + Zenoh; benchmark, add shared memory if needed | G0 | Budget met; Python and Studio exchange topics |
| **G3 Basics + CLI** | Nodes, lifecycle, services, actions, params, transform graph, recording, `gos` CLI, Python package | G2 | `gos run` opens, runs and closes a sim with no window |
| **G4 GraphIK** | Stages A–C | G1 | Loops hold closure; table published |
| **G5 Studio as client** | Studio connects to GOS; animation-only mode; operators callable remotely | P2, P6, G3 | The same script drives window and no-window modes |
| **G6 Real robot** | Hardware interface, ESP32 link, serial latency work, safety | G3 | The same script moves sim and real |
| **G7 Packaging** | `gosd` inside installers for Windows, Mac, Linux; PATH; `pip install` | G3, §7 | Clean machine: install, then `gos run` works |
| **G8 ROS 2 bridge** | Topics, services, actions, tree view | G3 | A stock ROS 2 node talks to GOS |
| **G9 Full parity** | Close every remaining row of `docs/GOS_PARITY.md`, native or through the bridge | G8 | No row says "missing" |

Naming: **"GOS G0–G9"** are these phases. **"goal G6"** in `G6_PROGRESS.md` is the separate words → shape → real robot goal. Always say which one. Finishing these phases does not finish goal G6: see §10.13.

Most of G1–G3 can start before the UI work, so the restructure and GOS don't block each other. Exception: anything that reshapes `state/` or operators follows P6.

### 10.10 Decisions still open

| Decision | Recommendation | Why |
|---|---|---|
| Core language | **Rust** for a small core, **decided by Nischay 31 Oct** | One source reaches Python and the browser (WASM). Speed is not the reason: nothing measured needs native code yet. Evidence in `docs/design/gos-g0-contract.md`. |
| Transport | Zenoh first, iceoryx2 only if measured need | One dependency covers both local and network |
| Message format | Fixed binary layout for hot data, schema with generation for the rest; Arrow for batches | Decide after G0 |
| IK | mink first | Fastest to test |
| Licence | **Yours to decide.** You said open source is part of why these tools win. | Affects everything public |
| Install location | Bundle Python + MuJoCo, or depend on the user's Python | Decide with §7 |
| Name | `GOS` as the name, check `gos` for PyPI and CLI conflicts | Not checked yet |

### 10.11 Not verified yet

Rechecked 31 Oct 2026.

- **Modular-robot software: nothing found that replaces GOS.** VisibleSim (C++, AGPLv3) is a behaviour simulator for lattice robots. USSR (BSD, Java) and ReMod3D (C++) are older simulators. `psrr` is geometric ROS planning for planar robots. RoFI (Masaryk University) is the closest: real modules with shared docks, what looks like a Gazebo-based simulator, and Rust in the repo. Its licence and planner are not confirmed, so read it properly before G1. Only summaries were read for most of these. SMORES-EP has a listed repository, not opened. Nothing found for Roombots or M-TRAN control software.
- **Webots:** an external controller connects by local IPC or TCP with `webots-controller`; a good model for `gos run`. Source: `docs/guide/running-extern-robot-controllers.md` in their repo.
- **Drake:** `Context` holds time, inputs, state and parameters, separate from the `System`. Matches our model/state split.
- **ROS 2 docs:** `docs.ros.org` blocks automated fetches, so `GOS_PARITY.md` reads the same source from GitHub. QoS page bodies are still unread.
- **MoveIt closed chains:** `robot_model.hpp` describes a kinematic tree with one root and mentions no loops. No official statement of support found, and forum answers say no. Still not proof that no plugin exists.
- **Zenoh on Windows, measured here:** 89 µs round trip, Python to Python, no shared memory. Shared memory on Windows is **still untested**; PyPI builds need a source build for it.
- **CH340/CP2102 latency:** one project's release notes report batching at the read timeout on Windows, with a 59 ms median loopback after its fix (not vendor data, not our chip). Nothing found for ESP32-C3 native USB. Measure on the robot.

### 10.13 What this finishes, and what it doesn't

Finishing P0–P11 and GOS G0–G9 gives the **platform**: the new Studio, the GOS engine, external control, ROS parity. It does **not** finish shape-changing. That stays a separate track (goal G6, then Big Hero 6 / Transformers-style behaviour) and will run on the new platform. Its open problems include the new module model, reliable blind docking given joint flex, collision-free paths, loop locks, 3-chain shapes, planner learning and chat → shape. GraphIK and the transform graph help directly, but they don't solve the real-robot work alone.

### 10.12 Sources
- Isaac Sim: [Python environment](https://docs.isaacsim.omniverse.nvidia.com/latest/python_scripting/manual_standalone_python.html), [physics data flow](https://docs.isaacsim.omniverse.nvidia.com/latest/physics/new_physics_engine.html), [Isaac Lab PhysX](https://docs.nvidia.com/isaaclab/concepts/isaac-sim-phys-x), [repo](https://github.com/isaac-sim/IsaacSim)
- ROS 2: [middleware interface](https://design.ros2.org/articles/ros_middleware_interface.html), [zero copy](https://design.ros2.org/articles/zero_copy.html), [lifecycle](https://design.ros2.org/articles/node_lifecycle.html), [rmw_zenoh](https://github.com/ros2/rmw_zenoh)
- MoveIt: [pick_ik](https://moveit.picknik.ai/main/doc/how_to_guides/pick_ik/pick_ik_tutorial.html), [TRAC-IK](https://moveit.picknik.ai/main/doc/how_to_guides/trac_ik/trac_ik_tutorial.html), [closed chain answer](https://answers.ros.org/question/414298/dual-arm-closed-kinematic-chain-planning-in-moveit/), [OMPL constrained planning](https://discourse.openrobotics.org/t/integrating-ompls-constrained-planning-capabilities-into-moveit/16453)
- Kinematics: [MuJoCo overview](https://mujoco.readthedocs.io/en/stable/overview.html), [model editing](https://mujoco.readthedocs.io/en/stable/programming/modeledit.html), [mink](https://github.com/kevinzakka/mink), [Pinocchio](https://github.com/stack-of-tasks/pinocchio), [URDF+](https://arxiv.org/html/2411.19753v1)
- Communication: [Zenoh](https://github.com/eclipse-zenoh/zenoh), [zenoh-python](https://github.com/eclipse-zenoh/zenoh-python), [iceoryx2](https://github.com/eclipse-iceoryx/iceoryx2), [Dora](https://github.com/dora-rs/dora), [LCM](https://lcm-proj.github.io/lcm/), [YARP](https://github.com/robotology/yarp)
- Other: [Gazebo architecture](https://gazebosim.org/docs/latest/architecture/), [Drake systems](https://drake.mit.edu/doxygen_cxx/group__systems.html), [Newton](https://github.com/newton-physics/newton), [Rerun modes](https://rerun.io/docs/reference/sdk/operating-modes), [MCAP via Foxglove](https://docs.foxglove.dev), [FTDI latency](https://granitedevices.com/wiki/FTDI_Linux_USB_latency), [Zaber FTDI guide](https://software.zaber.com/motion-library/docs/guides/communication/ftdi_latency)
