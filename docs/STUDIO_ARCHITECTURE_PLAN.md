# Studio architecture plan — Blender ideas, mapped onto the Studio

Companion to [BLENDER_STUDY.md](BLENDER_STUDY.md) (what Blender does and why).
This file says **what to change in `studio/src`, in which order, and how to check that no
tab breaks** after each step. Nothing here has been implemented yet; this is the plan.

---

## 1. Where the Studio is today (read from the code, 30 Oct)

| Area | What exists | Blender equivalent | Gap |
|---|---|---|---|
| Model | `core/model` — immutable `Document` (bodies, joints, assets), `putEntity` returns a new doc | Main + IDs (DNA) | good base; no per-type registry, no file subversion scheme |
| Commands | `core/commands/commandBus.ts` — `{label, redo(doc), undo(doc)}`, `dispatch/undo/redo/applyTransient`, stabilizer runs after every dispatch | operators + undo | commands are hand-written inverses; no poll, no properties, no registry |
| Undo | **two systems**: CommandBus stacks *and* `SimCanvas.tsx` JSON-snapshot history (`history.undo`, 700 ms autosave debounce, 30 steps, `JSON.stringify` of the whole project) wired to `bridge.undo/redo` | one undo stack, several UndoTypes | two stacks disagree; snapshots are whole-project strings |
| Viewport | `viewport/SceneManager.ts` (renderer, camera, OrbitControls, lights, path tracer, `requestRender(n)` frame counter) | ARegion + RegionView3D + GPUViewport | one SceneManager per React canvas, OK |
| Viewport API | `bridge/cameraBridge.ts` — **one global object**; SceneManager and SimCanvas assign ~45 function fields; 27 files read it | `bContext` (resolved per region) | global; `MsrrCanvas.tsx` saves `{...bridge}` and restores on close ("not restoring broke the other tabs") |
| Second view | `features/analysis/AnalysisBottomView.tsx` makes its **own** `WebGLRenderer` and draws `bridge.scene` with its own camera | second RegionView3D on the same scene | right idea, but a second WebGL context duplicates every GPU buffer |
| Redraw | SimCanvas subscribes to 7 stores and calls `sceneMgr.requestRender(2..3)`; RAF loop per canvas | notifiers + `ED_region_tag_redraw` + one draw phase | every store change redraws everything; MSRR draws every frame |
| Evaluation | `bus._stabilize` (loop closure) after every dispatch, cheaper one for transient; physics/animation/IK **write into the doc** with `applyTransient` | depsgraph + copy-on-eval | no original/evaluated split: `ModelEditor._tickGravityTumble` comment describes "two write paths would fight every frame" |
| Physics | Jolt WASM in browser (`viewport/PhysicsSim.ts`, `physics/`), MuJoCo in Python on :8771 (`state/msrrV2Store.ts` `fetch(VERIFY_URL/...)`) | Bullet via `RBI_api.h`, point cache | no common engine interface; no per-frame cache/scrub; HTTP calls not cancellable jobs |
| Render engines | raster (three.js) and `three-gpu-pathtracer` ("cycles") switched inside SceneManager | RenderEngineType + DrawEngine | engine switch is if/else inside SceneManager |
| Shortcuts | `keydown` listeners in 8 files (App, MenuBar, ContextMenu, KeyboardHelp, ManualTab, AnimLeftPanel, MeasureTool, PivotPickTool) | keymaps -> operators | no single table; conflicts possible |
| Command palette | `CommandPalette.tsx` own list of `{id,title,keys,run}` calling `bridge.*` | F3 operator search | duplicate of menus, no poll |
| Layer rules | `.dependency-cruiser.cjs` + known-violations file | module boundaries | exists, good — use it to enforce the new layers |
| Tests | 52 `*.test.ts` run with `npm test` (tsx --test), `npm run typecheck` | gtests + python tests + render tests | no per-tab smoke test, no screenshot diffs |

Two strong things already in place: the **immutable document** (it makes cheap Blender-style
snapshot undo almost free, see Step 4) and the **on-demand rendering counter** (the seed of
redraw tagging).

---

## 2. Target picture (Blender concepts, Studio names)

```
 input (pointer/key) ── keymap table ──► operator(id, props)          ◄── menus, palette, AI, scripts, buttons
                                            │ poll(ctx) / exec / invoke / modal
                                            ▼
                           ORIGINAL document (core/model)   ── one undo step per finished operator
                                            │ tag(entityId, 'transform'|'geometry'|'shading'|'topology')
                                            ▼
                           EVALUATOR (per scene): loop-closure, FK, constraints, animation, physics
                           writes EVALUATED state (poses, world matrices) — never the document
                                            │ notify({category, detail, ref})
                                            ▼
                           listeners per view/panel ──► view.tagRedraw()
                                            ▼
                           ONE frame scheduler (rAF): draw only tagged views
                              view = { camera, controls, engine instance, overlay, canvas region }
                              engine = raster | pathtracer | (remote MuJoCo viewer)
```

Concept map:

| Blender | Studio name (proposed) | Lives in |
|---|---|---|
| Main / ID | `Document` / entity (Body, Joint, Asset, Module) | `core/model` (keep) |
| IDTypeInfo | `entityTypes` registry: `copy`, `forEachRef`, `serialize`, `version` | `core/model/types.ts` |
| RNA | property descriptors per entity type (label, unit, range, `tags`) | `core/props` |
| wmOperatorType | `OperatorType {id, label, poll, exec, invoke?, modal?, flags}` | `core/ops` (pure) + `features/*/ops.ts` |
| bContext | `Ctx {doc, selection, view?, page}` passed to every operator | `runtime/context.ts` |
| ARegion + RegionView3D | `ViewportHandle` (one per canvas/split) | `viewport/ViewportHandle.ts` |
| CTX_wm_region | `viewports.active()` = view under pointer / last focused | `viewport/viewportRegistry.ts` |
| notifier / listener | `notify(note)` + `view.listen(fn)` / panel `useNote()` | `runtime/notify.ts` |
| ED_region_tag_redraw | `view.tagRedraw()` | ViewportHandle |
| depsgraph + copy-on-eval | `Evaluator` producing `EvaluatedScene` (poses, world matrices) | `runtime/evaluator.ts` |
| RenderEngineType / DrawEngine | `RenderEngine {sync(changes), draw(view), dispose}` | `viewport/engines/` |
| point cache | `SimCache` frame -> state (Jolt or MuJoCo result) | `physics/simCache.ts` |
| RBI_api.h | `PhysicsEngine {build(doc), step(dt), read()}`; Jolt local, MuJoCo remote | `physics/engine.ts` |
| wmJobs | `jobs.start({owner, type, run(signal, progress)})` with cancel + progress bar | `runtime/jobs.ts` |
| keymap | `keymap.ts`: `{key, mods, context, op, props}` | `runtime/keymap.ts` |

---

## 3. Refactor steps — smallest and safest first

Each step: **what**, **why (Blender reason)**, **how**, **verify**. Every step is one small PR
(or one commit series), keeps the app working, and can be reverted alone.

### Step 0 — The safety net (do before touching anything)
**What:** a written "every tab" check plus small automated tests.
* `docs/TAB_SMOKE_CHECKLIST.md`: for each page (`editor, analysis, training, animation, msrr,
  motor, esptt`): open it, orbit, pan, zoom, Home, F (fit), axis gizmo click, stats overlay,
  wireframe toggle, render-engine switch, undo/redo one edit, switch away and back. Plus MSRR
  open -> close -> Editor gizmo still drives the Editor camera.
* Unit tests for the pieces that will be rewritten (`commandBus`, `bridge` behaviour).
* Keep `npm run typecheck`, `npm test` and dependency-cruiser green on every step.

**Verify:** run the checklist once now and write down what already fails, so later
breakage is not confused with old bugs. (Later: a Playwright script that does the checklist
and saves one screenshot per tab, compared with a threshold like Blender's render tests.)

### Step 1 — Per-viewport handle behind the existing bridge (fixes the global-bridge fight)
**Why:** in Blender the camera belongs to a region and the context comes from the region under
the mouse (`ctx_data_get`: region -> area -> screen). Today SceneManager and SimCanvas write
into one global object, MsrrCanvas overwrites it and has to restore it.

**How (no caller changes in this step):**
1. New `viewport/viewportRegistry.ts`:
   ```ts
   export interface ViewportHandle extends CameraBridge { id: string; kind: 'editor'|'msrr'|'analysis'; }
   register(h): () => void   // returns unregister
   setActive(id) / active(): ViewportHandle | null
   ```
2. `SceneManager` builds **its own** handle object (move the `bridge.x = ...` assignments to
   `this.handle.x = ...`). SimCanvas/MsrrCanvas add their extra functions to *their* handle and
   call `register(handle)` on mount, unregister on unmount.
3. `cameraBridge.ts` keeps exporting `bridge`, but as a `Proxy` that forwards every read to
   `active()` (falls back to the editor handle). All 27 readers keep working unchanged.
4. Active viewport = set on `pointerenter`/`pointerdown` of a canvas and when a page mounts
   its viewport (like `CTX_wm_region_set(region_event_inside(...))`).
5. Delete MsrrCanvas' `savedBridge` / restore block (lines ~66 and ~234).

**Verify:** checklist for all tabs; specifically: open MSRR, use gizmo/Home/stats there, close,
confirm Editor gizmo/Home/F/stats/render-engine still act on the Editor; open Analysis and check
the bottom view still follows the main camera (it reads `bridge.scene/camera` = active editor
handle). Unit test: two fake handles, activate each, check the proxy forwards to the right one.

### Step 2 — Readers ask for "their" viewport, not the active one
**How:** a React context `ViewportContext` provided by each canvas wrapper; overlay components
(NavigationGizmo, ViewControls, HomeButton, stats) use `useViewport()` instead of `bridge`. Menu
and palette actions keep using `viewports.active()`. Migrate file by file (27 files, grep
`cameraBridge`), each a tiny PR; the Proxy keeps unmigrated files working.
**Why:** Blender editors get their region from context, so two 3D views can show two gizmos that
each control their own camera. This also allows MSRR + Editor side by side later.
**Verify:** per migrated component, test it in every tab where it appears. When grep shows zero
direct `bridge.` users outside menus/palette, mark `bridge` deprecated in the file header.

### Step 3 — Redraw tagging + one frame scheduler
**Why:** Blender's draw phase draws only regions with `do_draw` set; tagging is cheap; one loop.
Today each canvas has its own rAF loop and 7 broad store subscriptions; MSRR draws every frame.
**How:**
1. `ViewportHandle.tagRedraw(frames = 1)` (rename of `requestRender`), plus
   `tagRedrawOverlay()` later.
2. `runtime/frameScheduler.ts`: the **only** `requestAnimationFrame`. Each frame:
   `tick evaluators/physics -> for each registered visible view with a tag: render()`. Hidden
   pages (`visibility:hidden`/`display:none`) are skipped (Blender: invisible = not evaluated, not drawn).
3. MSRR: tag redraw only while physics plays or the camera moves, not unconditionally.
**Verify:** `frameProfiler` (`?profile`) shows 0 renders/s when idle on every tab; orbit is still
smooth; MSRR playback still animates; path tracer still accumulates (it must keep tagging until
`samples >= max`, exactly like EEVEE's `!sampling.finished_viewport() -> request redraw`).

### Step 4 — One undo system: snapshot undo using the immutable document
**Why:** Blender's memfile undo stores the whole state but **shares unchanged chunks**
(`MemFileChunk.is_identical`). Our `Document` is immutable: unchanged bodies are already the same
JS objects between versions. So an undo step can store the **document reference** (structural
sharing does the dedupe for free) — no `JSON.stringify` of the whole project, no inverse functions.
Today there are two stacks (CommandBus + SimCanvas JSON history) which can disagree.
**How:**
1. `UndoStack` in core: `push(label, docRef, extra?)`, `undo() -> docRef`, `redo()`. Steps hold
   `{doc, animation, selection}` references. Memory = only what changed.
2. CommandBus keeps `dispatch` but its undo uses `UndoStack` (inverse functions become optional;
   keep them only where data is huge, like Blender's sculpt/edit-mode undo types).
3. Remove the SimCanvas JSON history; autosave stays separate (it is a file write, not undo).
4. `bridge.undo/redo` -> `ops.run('ed.undo')`.
**Verify:** unit tests: 100 edits on a 300-body doc, check memory roughly O(changed bodies);
undo/redo restores exact docs (`projectFingerprint` equality). Manual: undo in Editor, Animation,
Analysis; MSRR keeps its own state (out of scope until Step 9).

### Step 5 — Operator registry (every action is an operator)
**Why:** in Blender every button, menu, shortcut, search entry and Python call ends in
`wm_operator_invoke`; poll greys things out; undo is pushed in one place (`wm_operator_finished`);
the redo panel is "undo + exec with new props".
**How:**
```ts
defineOperator({
  id: 'body.duplicate', label: 'Duplicate', description: '...',
  flags: { undo: true, register: true },
  props: { offset: { type: 'vec3', default: [0,0,0], unit: 'm' } },
  poll: (ctx) => ctx.selection.bodies.length > 0,
  exec: (ctx, props) => ctx.dispatch(addBodies(...)),
  invoke?: (ctx, props, event) => 'modal' | 'finished' | 'cancelled',
  modal?: (ctx, op, event) => ...,
});
ops.run(id, props?, ctx?)   // one entry point: undo push on 'finished' if flags.undo
```
Migrate in this order: Command Palette (generate its list from the registry, filtered by poll),
MenuBar, `features/ops/bodyOps.ts` callers, AI actions (`features/ai/aiActions.ts`), scripting.
Then a "last operation" panel: change props -> undo -> exec (no tool-specific code).
**Verify:** each migrated entry point: same behaviour, one undo step, greyed out when poll fails.
Test: run every registered operator with default props on the demo doc and on an empty doc —
must not throw (our version of Blender's `bl_run_operators.py`).

### Step 6 — Keymap table
All shortcuts in `runtime/keymap.ts`: `{key, mods, context: 'viewport'|'outliner'|'global'|page,
op, props}`. One `keydown` handler resolves (focused/hovered area first, then global — Blender's
region -> area -> window order) and calls `ops.run`. Modal tools (MeasureTool, PivotPickTool,
axis modal X/Y/Z) register as **modal handlers** that get events first while running.
Keyboard help is generated from the table.
**Verify:** every shortcut in KeyboardHelp still works in each tab; no shortcut fires while
typing in an input; Esc cancels modal tools.

### Step 7 — Original vs evaluated (stop writing simulation results into the document)
**Why:** Blender's physics, animation and modifiers write only the evaluated copy; the user's
data changes only through operators. Today `applyTransient` writes physics/animation/spin/IK
poses into the doc, and the code already documents the fight ("dispatch sets the dragged pose,
this then stomps it with the stale physics pose").
**How:**
1. `runtime/evaluator.ts` holds `EvaluatedScene { jointValues, worldMatrices, bodyPoses }` per scene.
2. Inputs: the document + time + active sim. Producers (animation playback, Jolt gravity, spin
   motors, MuJoCo session, MSRR mirror) write **evaluated** values with a priority (sim > anim > doc).
3. Renderers and analysis read evaluated values (fallback to doc).
4. "Apply pose" (Blender: Apply Visual Transform) is an explicit operator that copies evaluated
   -> document as one undo step.
5. Loop-closure stabilizer becomes an evaluation step tagged by `topology/transform` changes,
   instead of running inside every dispatch.
Migrate one producer at a time, starting with spin (`core/motor/spinState.ts`,
`features/motor/spinEngine.ts`), then animation, then gravity.
**Verify:** with gravity on, drag IK: no fight; undo history no longer changes during playback;
autosave not triggered by physics; MuJoCo/Jolt results identical to before (existing
`physicsDeterminism.test.ts`, `physicsSimJolt.test.ts`).

### Step 8 — Notifiers instead of "subscribe to the whole store"
`runtime/notify.ts`: `notify({cat: 'model'|'selection'|'view'|'theme'|'anim'|'sim', detail, ref})`,
deduplicated per frame. Operators and the evaluator send notes; each view/panel has a listener
that decides to `tagRedraw()` (like `view3d_main_region_listener`). Replace SimCanvas's 7
`subscribe(() => requestRender())` lines.
**Verify:** selection change redraws views + outliner but not the timeline; theme change
redraws all; profiler shows fewer renders per interaction.

### Step 9 — Render-engine interface and one GPU context for many views
**Why:** Blender's `RenderEngineType` (`view_update`, `view_draw`, `render`) + draw-engine phases;
one engine instance per viewport; overlays are a separate engine; updates are per changed ID and
per kind (transform / geometry / shading), so a move only re-uploads a matrix.
**How:**
1. `viewport/engines/RenderEngine.ts`: `{ id, init(view), sync(changes), draw(view), dispose }`.
   Wrap today's raster path and `three-gpu-pathtracer` as two engines; SceneManager stops
   containing `if (_engineMode === 'cycles')`.
2. `sync(changes)` receives tags from Step 8: transform-only change = update matrices; geometry
   = rebuild that body's BufferGeometry; shading = material only (path tracer: `updateMaterials`
   vs full `setScene`).
3. Overlay engine (grid, gizmos, connectors, pivot dot, measure) drawn after any engine, so
   gizmos also work in path-traced mode.
4. Multiple views of one scene with **one** `WebGLRenderer` using `setViewport/setScissor`
   (Analysis bottom view first), so geometries/textures are uploaded once, as in Blender where
   all regions share one GPU context.
5. Path tracer: start at low resolution and raise it (Cycles' resolution divider), stop
   requesting redraws at max samples.
**Verify:** each engine in each tab: switching engines leaks no GPU memory (`renderer.info`
geometries/textures counts stable after 10 switches); Analysis split shows the same scene;
path tracer converges then idles at 0 renders/s.

### Step 10 — Physics engine interface + simulation cache + jobs
**Why:** Blender wraps Bullet behind `RBI_api.h`, ties the step to the timeline frame, caches every
frame (`BKE_ptcache_read/write`), only the active depsgraph writes caches, and long work runs as
cancellable wmJobs with `do_update/stop/progress`.
**How:**
1. `physics/engine.ts`: `PhysicsEngine { build(doc), step(dt), state(), dispose }`. Implement
   `JoltEngine` (local, wraps `PhysicsSim`) and `MujocoRemoteEngine` (HTTP/WebSocket to :8771 —
   C:\TETROBOT\sim stays the physics judge, per "physics decides, not rules").
2. `physics/simCache.ts`: `frame -> state`; scrubbing the timeline reads the cache; stepping
   forward one frame simulates; editing the doc marks the cache outdated; "Bake" fills it in a job.
3. `runtime/jobs.ts`: `jobs.start({owner, type, run(signal, report)})`, `AbortController` for
   cancel, progress in the status bar, starting the same `type+owner` cancels the previous one.
   Move OCCT import worker, MuJoCo `/simulate`, `/build_shape`, `/transform`, AI calls onto it.
**Verify:** MSRR v2 plan/run produce the same results as today; cancel stops an in-flight
`/simulate` without UI errors; timeline scrub replays a cached MuJoCo run without new requests.

### Step 11 — Entity type registry, property descriptors, file versioning
* `entityTypes`: per type `copy`, `forEachRef` (for delete/remap/"who uses this asset"),
  `serialize/deserialize`, `version(fromVersion)`. Removes type `switch`es in exporters
  (`core/serialization/exporters/*`) and fixes things like orphan-asset stripping generically.
* Property descriptors (an "RNA-lite"): `{path, label, unit, range, step, tags: ['transform']}`.
  The Inspector draws from them; animation and scripting use the same paths; setting a property
  goes through one function that dispatches, tags and notifies.
* `.nischay` files: `version` + `subversion`, and a list of small `doVersions` steps each guarded
  by `atLeast(v, sub)` (Blender's `MAIN_VERSION_FILE_ATLEAST`), plus a test that loads one saved
  file per old version (`bl_blendfile_versioning.py` style).

---

## 4. How to check "no other tab breaks" (every step)

1. `npm run typecheck` and `npm test` green.
2. dependency-cruiser green; add rules as layers appear:
   `core/** must not import viewport|features|state`, `features/** must not import other features' internals`,
   `only runtime/frameScheduler.ts may call requestAnimationFrame` (grep check),
   `no new imports of bridge/cameraBridge` after Step 2.
3. Tab smoke checklist (Step 0) — all seven pages, plus MSRR open/close round trip.
4. `?profile`: idle = 0 renders/s; note frame time before/after on the demo model.
5. Short runs only (≤ 120 s per command); MuJoCo checks via existing short endpoints.

## 5. Engineering process (borrowed from Blender)

* **Design note first** for steps 1, 4, 5, 7, 9, 10: half a page in `docs/design/` — problem,
  chosen approach, rejected alternatives and why, how to verify. (Blender: design task before code.)
* **Small PRs**, one concern each; title style `Viewport: per-viewport handle behind bridge proxy`.
* **Module owners** in a `docs/MODULES.md`: core model, operators/undo, viewport/engines, physics,
  MSRR, hardware — each lists the files and the checks to run when they change.
* **Comments say why and link the bug/date** (the code already does this well, e.g. the MsrrCanvas
  "30 Oct" note) — keep it.
* **Tests next to code**; a "run every operator" test; later screenshot tests per tab with a
  pixel-diff threshold.
* **Keep the old path until the new one is proven** (Proxy bridge, CommandBus kept while UndoStack
  lands) — Blender keeps notifiers while moving to the message bus for the same reason.

## 6. First three steps, concretely

1. **Step 0 + Step 1:** checklist, then `viewportRegistry` + per-SceneManager handle + `bridge`
   becomes a Proxy to the active viewport; delete MsrrCanvas' save/restore.
2. **Step 3:** one frame scheduler and `tagRedraw()`; hidden pages do not draw; MSRR stops
   drawing every frame when idle.
3. **Step 4:** one undo stack of immutable document references; remove the JSON-snapshot history
   in SimCanvas; `bridge.undo/redo` route to it.

These three touch few files, fix known pain (bridge fights, wasted GPU, two undo stacks), and
prepare the ground for operators (Step 5) and original-vs-evaluated (Step 7), which are the two
biggest long-term wins.
