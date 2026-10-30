# TETROBOT Studio — Restructuring Plan

Status: **draft, decisions being collected** (started 30 Oct 2026). Owner: Nischay. Nothing in here is implemented yet.

This is the single plan for rebuilding the Studio: the new look, the Blender-style architecture, and (to be added) the
physics and robot-model changes. Background documents it builds on:

- `docs/BLENDER_STUDY.md` — how Blender works, from its source (main loop, operators/undo, viewports, depsgraph, rendering, physics).
- `docs/STUDIO_ARCHITECTURE_PLAN.md` — where the Studio is today and the 12 refactor steps (0–11) with checks.
- `docs/ARCHITECTURE.md` — current layer rules (core → viewport/state → features).
- UI chooser artifact: https://claude.ai/artifact/1eWmjYiaRLh1myrBhC4LGE

---

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
| Icons | Lucide · Phosphor | Lucide (pairs with shadcn/ui) |
| Charts / live telemetry | uPlot · Apache ECharts | uPlot (fast time series for servo load, IMU, current) |
| Motion | Motion · none (CSS only) | CSS only; Motion only if a panel transition needs it |
| shadcn primitive layer | Base UI · Radix | Whatever `shadcn init` defaults to at install time; verify then |
| React version | stay 18.3 · upgrade to 19 | Check shadcn/ui + Dockview requirements at install time, decide then |
| **Physics** | to be added by Nischay | (current recommendation in §7) |
| **New module model** (mechanical locks, new CAD) | to be added by Nischay | — |
| Other changes | to be added by Nischay | — |

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
| **P0 Safety net** | Tab checklist + baseline screenshots of all 7 pages and an MSRR open/close round trip (`tools/ui_shot.py`); record what already fails | 0 | Baseline saved; failures listed |
| **P1 Foundation** | Tailwind v4 (Vite plugin) + direction-A tokens + shadcn/ui init + fonts; no screen changes yet | — | Builds, nothing looks different, tests green |
| **P2 Viewport context** *(design note)* | `viewportRegistry`, a handle per `SceneManager`; `bridge` becomes a forwarder to the active viewport; remove MsrrCanvas' save/restore workaround | 1–2 | Every tab passes the checklist; MSRR round trip leaves the editor camera untouched |
| **P3 Frame scheduler** | One `requestAnimationFrame`, `tagRedraw()`; hidden pages and idle viewports draw nothing | 3 | Idle = 0 renders/s (`?profile`), playback still smooth |
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
