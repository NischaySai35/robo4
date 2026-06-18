# TETROBOT — Frontend Architecture

Layered, feature-based structure. Dependencies point **downward**: `features` (UI)
→ `viewport`/`kinematics`/`state` → `core`. The **core model** never imports React
or Three.js — it's the backend-agnostic source of truth (see [ROADMAP](../ROADMAP.md)).

Imports use the **`@/` alias** (= `frontend/src`). Example: `import { bridge } from
'@/viewport/cameraBridge.js'`. Only same-directory imports (`./Foo.css`) stay relative.

```
src/
  main.jsx                 # entry (mounts app/App)
  app/
    App.jsx  App.css       # app shell: header, nav, providers, layout
  core/                    # ⬇ NO React, NO Three — pure model & data
    model/                 # graph entities (Body, Joint, Constraint, Material…)  [Phase 0]
    commands/              # command bus + undo/redo                              [Phase 0]
    serialization/         # native DDL (.nischay) + importers/exporters
        project.js  codec.js  fileIO.js  projectActions.js  storage.js
  state/                   # zustand UI/runtime stores (not the core model)
    armStore  multiStore  themeStore  docStore  historyStore  integrationStore
  viewport/                # Three.js engine layer
    SceneManager.js  RenderLoop.js  cameraBridge.js  Interaction.js  assembly.js
    renderers/             # how model entities become meshes
        RobotFK.js  ArmRenderer.js  ArmGeometry.js
  kinematics/              # FK/IK math (generic, no React/Three)
    kinematics.js  fabrik.js  jacobianIK.js
  shared/                  # cross-cutting helpers
    telemetry.js
  features/                # self-contained UI features (jsx + co-located css)
    canvas/        SimCanvas
    menu/          MenuBar
    panels/        LeftPanel  HUD  StatusBar
    connection/    ConnectionWindow  SimTransmitPanel
    servo/         ServoController
    viewport-ui/   NavigationGizmo  ViewControls  JointCard
    intro/         IntroOverlay
  styles/
    index.css              # global resets + CSS variables (themes)
```

## Rules
- **Core is sacred.** Backends (viewport, physics, exporters, hardware) *read* the
  model and emit **commands**; they never mutate it directly. Uniform undo/redo.
- **GUI-first.** Every capability is a control before any script API.
- `@/` alias everywhere for cross-directory imports; co-located `./` only.
