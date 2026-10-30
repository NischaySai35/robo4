# What Blender's source code teaches us (study notes)

Read from the real Blender source (github.com/blender/blender, `main`, commit `745ab9a`,
sparse clone at `D:/study/blender`) plus the developer handbook at developer.blender.org.
Every file path below is relative to that clone. Code excerpts are short and copied
from the files, not from memory.

The goal is not to copy Blender line by line. It is to understand **why** it is built
the way it is, so the Studio (`D:\robo4\studio`) can borrow the ideas that fit a
browser app for robot design and simulation.

---

## 0. The whole thing on one page

Blender's main loop is four lines long (`source/blender/windowmanager/intern/wm.cc`, `WM_main`):

```c
while (true) {
  wm_window_events_process(C);   /* OS events -> per-window queues            */
  wm_event_do_handlers(C);       /* events -> keymaps -> operators (CHANGE data) */
  wm_event_do_notifiers(C);      /* "what changed" -> listeners tag regions; depsgraph evaluates */
  wm_draw_update(C);             /* draw ONLY tagged regions, blit the rest     */
}
```

What happens when you press **G, move the mouse, click** on a cube:

```
 OS key/mouse event
   │ wm_window_events_process          (GHOST = OS abstraction layer)
   ▼
 wm_event_do_handlers  ── window modal handlers first (a running operator gets every event)
   │                     then area/region keymaps -> "G" maps to TRANSFORM_OT_translate
   ▼
 Operator  (wmOperatorType: poll -> invoke -> modal ... -> exec/finish)
   │  writes ORIGINAL data: ob->loc  (DNA struct field)
   │  via RNA (UI buttons, Python, animation) or directly (C tools)
   ├─► DEG_id_tag_update(&ob->id, ID_RECALC_TRANSFORM)   "this ID's transform changed"
   ├─► WM_event_add_notifier(C, NC_OBJECT|ND_TRANSFORM)  "tell the editors"
   └─► on finish: ED_undo_push_op  (only if OPTYPE_UNDO; one undo step per operator)
   ▼
 wm_event_do_notifiers
   │  1. each notifier is offered to every window / screen / area / region listener;
   │     a listener that cares calls ED_region_tag_redraw(region)  (sets a flag, draws nothing)
   │  2. depsgraph of every VISIBLE view layer: flush tags along relations,
   │     copy original -> evaluated (copy-on-eval), evaluate only tagged operations,
   │     multithreaded (TaskPool), then tell render engines what changed (view_update)
   ▼
 wm_draw_update
   │  for each window: for each region with do_draw set -> draw into ITS OWN offscreen buffer
   │  regions not tagged: their old buffer is just blitted again (cheap)
   ▼
 3D region draw = DRW_draw_view
   │  draw manager: engines (EEVEE / Workbench / external like Cycles) + Overlay engine
   │  init -> begin_sync -> object_sync(each visible object) -> end_sync -> draw
   │  GPU batches come from a per-mesh cache, rebuilt only when the mesh is tagged dirty
   ▼
 GPU module  (one API; backends: OpenGL, Vulkan, Metal, Dummy) -> swap buffers
   │
   └─ progressive engines (EEVEE TAA, Cycles) ask for another redraw until converged,
      so the loop keeps drawing ONLY while there is something to improve.
```

Everything else in these notes is a zoom-in on one box of that diagram.

---

## 1. Data model: DNA, RNA, ID, Main

### 1.1 DNA — the structs ARE the file format
* `source/blender/makesdna/DNA_*.h` — plain C structs (`Object`, `Mesh`, `Scene`,
  `bScreen`, `RegionView3D`, ...). These are the in-memory data **and** what is written to a `.blend`.
* `makesdna/intern/makesdna.cc` is a program run at build time. It parses those headers
  and produces "SDNA": a table of every struct name, field name, type and size.
  `DNA_documentation.h`: *"From this information, it builds a file with numbers that encode
  the format, the names of variables, and the place to look for them."*
* The SDNA table is saved **inside every .blend file**. When an old file is read, its
  SDNA is compared to the running Blender's (`DNA_struct_get_compareflags`, results
  `SDNA_CMP_EQUAL / NOT_EQUAL / REMOVED`), and `DNA_struct_reconstruct` (`DNA_genfile.h`)
  rebuilds each struct field by field by NAME. Fields that were added are zero, removed ones are dropped.
* **Why:** saving = dumping memory blocks (very fast, no serializer code per type),
  yet any Blender can read files from any other version, because the file describes itself.
* Real behavioural changes go into versioning code: `blenloader/intern/versioning_400.cc` ...
  `versioning_504.cc`. The template (`versioning_xxx_template.cc`) says:
  > *Always bump subversion in BKE_blender_version.h when adding versioning code here, and
  > wrap it inside a MAIN_VERSION_FILE_ATLEAST check.*

  `BKE_blender_version.h` has `BLENDER_FILE_SUBVERSION 4` and `BLENDER_FILE_MIN_VERSION 405`
  (the oldest Blender that can still open new files). Two layers: **automatic** (struct layout)
  and **explicit** (`do_versions`, one small block per change, guarded by version number).

### 1.2 ID — the "datablock" header every big thing starts with
`makesdna/DNA_ID.h`, `struct ID`. Every Object, Mesh, Material, Scene, Screen... begins with it:

| field | why it exists |
|---|---|
| `name[258]` | first 2 chars = type code (`OB`, `ME`...), unique per type and library |
| `lib` | non-null = linked from another .blend (library linking) |
| `us` | user count (refcount). 0 users -> not saved ("orphan data") |
| `tag` / `flag` | runtime-only tags vs saved flags — kept apart on purpose |
| `recalc` | what changed (filled by depsgraph tagging) |
| `recalc_after_undo_push` | *"changes between the last undo push and the current state"* — lets undo know what to re-evaluate |
| `session_uid` | stable id *"across potential re-allocations (e.g. due to undo/redo steps)"* |
| `orig_id` | on an evaluated copy: points back to the original |
| `py_instance` | cached Python wrapper so Python can be invalidated when the ID is freed |
| `runtime` | *"never written on disk or in undo steps"* |

**Aha:** the ID header knows about undo, the depsgraph, Python and libraries. It is
the one shared "handle" every subsystem agrees on. Everything that can be referenced,
linked, saved, undone or evaluated is an ID; small things (a modifier, a vertex) live
inside an ID.

Each ID type registers an `IDTypeInfo` (`blenkernel/BKE_idtype.hh`) with callbacks:
`init_data`, `copy_data`, `free_data`, `make_local`, **`foreach_id`** (visit every ID
pointer inside), `foreach_cache`, `foreach_path`, `blend_write`, `blend_read_data`...
So generic code (delete, remap, copy, save, "find all users of this material") never
needs a `switch` over types — it calls the type's table. **Why not one big class
hierarchy?** C, and it lets totally unrelated systems (file IO, undo, outliner, library
overrides) each use only the callbacks they need.

### 1.3 Main — the database
`blenkernel/BKE_main.hh`, `struct Main`: one list per ID type (objects, meshes,
materials, screens, window managers...). The "current file" = one `Main` (`G_MAIN`).
UI layout (`bScreen`, `wmWindowManager`) is **also stored as IDs in Main** — that is
why a .blend reopens with your exact workspace layout. `MainIDRelations` is an optional
cached reverse index ("who uses me").

### 1.4 RNA — one reflection layer for everything
`source/blender/makesrna/intern/rna_*.cc` describes every DNA field as a property with
metadata. Example (`rna_object.cc`):

```c
prop = RNA_def_property(srna, "location", PROP_FLOAT, PROP_TRANSLATION);
RNA_def_property_float_sdna(prop, nullptr, "loc");            /* maps to Object.loc   */
RNA_def_property_editable_array_func(prop, "rna_Object_location_editable"); /* locks */
RNA_def_property_ui_text(prop, "Location", "Location of the object");
RNA_def_property_ui_range(prop, -FLT_MAX, FLT_MAX, 1, RNA_TRANSLATION_PREC_DEFAULT);
RNA_def_property_update(prop, NC_OBJECT | ND_TRANSFORM, "rna_Object_internal_update");

static void rna_Object_internal_update(Main *, Scene *, PointerRNA *ptr) {
  DEG_id_tag_update(ptr->owner_id, ID_RECALC_TRANSFORM);
}
```

One definition gives: the UI label and tooltip, the slider range and unit, the
Python name (`obj.location`), the animation path (`"location"` for an F-Curve), the
driver target, the notifier to send, and the depsgraph tag. When anything sets it,
`rna_property_update` (`rna_access.cc`) runs **four** things:

1. `prop->update(bmain, scene, ptr)` — the per-property callback (here: depsgraph tag)
2. `WM_main_add_notifier(prop->noteflag, ptr->owner_id)` — redraw editors
3. `WM_msg_publish_rna(mbus, ptr, prop)` — message bus for precise subscribers
4. `DEG_id_tag_update(owner, ID_RECALC_SYNC_TO_EVAL | ID_RECALC_PARAMETERS)` — copy to evaluated data

and, interesting detail: *"if C is nullptr, we're updating from animation. avoid slow-down
from f-curves by not publishing"* — animation playback skips the message bus.

**Why this matters:** UI buttons, Python, animation, drivers, the outliner, the
spreadsheet, library overrides and keyframe insertion ALL go through RNA. Add a property
once in RNA and it is automatically drawable, scriptable, animatable, undoable. No feature
can "forget" to redraw or re-evaluate, because the property itself declares it.

### 1.5 Copy-on-evaluation (original vs evaluated data)
Editors and operators only touch **original** data in `Main`. The depsgraph keeps its
own **evaluated copy** of each ID (`depsgraph/intern/eval/deg_eval_copy_on_write.cc`),
and modifiers, constraints, drivers, animation and physics write their results only
into that copy. Draw engines and render engines read only the evaluated copy
(`DEG_get_evaluated(depsgraph, id)`, back-link with `DEG_get_original_id`).

Why:
* Evaluation runs in many threads while the UI may still read the original — no locks needed.
* Animation can set `loc` on the evaluated object every frame without dirtying the
  file or the undo history.
* Two view layers can evaluate the same object differently (one depsgraph per view layer,
  `scene->depsgraph_hash` keyed by `ViewLayer` in `blenkernel/intern/scene.cc`).
* Runtime state is not lost when the copy is refreshed: `deg_eval_runtime_backup_*.cc`
  backs up modifier/physics/pose/sound runtime data and restores it after the re-copy.

The comment in the edit-mode branch of `deg_update_eval_copy_datablock` shows the cost
they fight: *"don't request copy-on-eval update since this will duplicate all object data
which is unnecessary"* — copying is only done when needed, and big arrays use
implicit sharing (copy-on-write reference counting) so a "copy" of a mesh is usually cheap.

---

## 2. Operators and undo

### 2.1 The operator type
`windowmanager/WM_types.hh`, `struct wmOperatorType`:

```c
const char *name, *idname, *description, *undo_group;
wmOperatorStatus (*exec)(bContext *C, wmOperator *op);              /* do it, no UI   */
wmOperatorStatus (*invoke)(bContext *C, wmOperator *op, const wmEvent *event); /* start from an event */
wmOperatorStatus (*modal)(bContext *C, wmOperator *op, const wmEvent *event);  /* interactive loop */
void (*cancel)(bContext *C, wmOperator *op);
bool (*poll)(bContext *C);           /* can it run here, now?  greys out buttons/menus */
void (*ui)(bContext *C, wmOperator *op);   /* custom redo-panel layout */
StructRNA *srna;                     /* the operator's PROPERTIES are RNA too */
int flag;  /* OPTYPE_REGISTER | OPTYPE_UNDO | OPTYPE_BLOCKING | OPTYPE_GRAB_CURSOR_XY ... */
```

* `poll` is asked constantly (every menu draw) so it must be cheap. The same poll greys out
  the button, hides the menu item, and makes a shortcut do nothing.
* `invoke` reads the mouse/event and may open a popup or start modal; `exec` must work with
  only properties (that is what Python, redo and macros call).
* Properties are RNA, so the operator can be replayed: `WM_operator_pystring` turns a finished
  operator into a Python line (`bpy.ops.transform.translate(value=(1,0,0))`) — that is the Info
  editor log and the "copy as Python" feature.

**Every entry point ends in the same place.** A button with an operator, a menu item, a
keymap item, F3 search, a pie menu, a Python `bpy.ops.x.y()`, a gizmo — all call
`WM_operator_name_call_ptr` / `wm_operator_invoke`. So undo, redo panel, poll, reports and
"repeat last" behave identically whatever the user clicked.

### 2.2 Undo push happens in ONE place
`wm_event_system.cc`, `wm_operator_finished`:

```c
/* We don't want to do undo pushes for operators that are being
 * called from operators that already do an undo push. Usually
 * this will happen for python operators that call C operators. */
if (wm->op_undo_depth == 0) {
  if (op->type->flag & OPTYPE_UNDO) {
    ED_undo_push_op(C, op);
```

Operators never call undo themselves; they declare `OPTYPE_UNDO` and the window manager
pushes one step when they finish. Nested operators do not create extra steps (`op_undo_depth`).
Property edits from UI buttons (not operators) get their own push in
`ui_apply_but_funcs_after` (`editors/interface/interface_handlers.cc`, `ED_undo_push(C, after.undostr, ...)`).

### 2.3 The redo panel ("Adjust Last Operation") is undo + re-exec
`editors/undo/ed_undo.cc`, `ED_undo_operator_repeat`:

```c
WM_operator_free_all_after(wm, op);
ED_undo_pop_op(C, op);                 /* go back to the state before the operator */
...
const wmOperatorStatus retval = WM_operator_repeat(C, op);   /* exec again with new props */
if ((retval & OPERATOR_FINISHED) == 0) { ED_undo_redo(C); }   /* failed -> restore */
```

Note the guard: redo is refused while background jobs are running
(`!WM_jobs_has_running(...)`), because a job may be reading the data.
**Aha:** the redo panel needs no special code per tool. It works for every operator that
has `exec` + `OPTYPE_REGISTER|OPTYPE_UNDO`, because operators are pure functions of
(context, properties).

### 2.4 Several undo systems behind one stack
`blenkernel/BKE_undo_system.hh`, `struct UndoType` with `poll / step_encode / step_decode /
step_free`. Types: `BKE_UNDOSYS_TYPE_MEMFILE` (global), `..._SCULPT`, `..._IMAGE`,
`..._PARTICLE`, `..._TEXT`, plus edit-mesh/edit-curve types in editors. The user sees one
Ctrl+Z stack, but each step is encoded by whichever system fits:

* **Memfile undo (object mode)**: the whole file is "saved" into memory
  (`blenloader/intern/undofile.cc`). `BLO_undofile.hh`: each `MemFileChunk` has
  `is_identical` — *"this chunk doesn't own the memory, it's shared with a previous
  MemFileChunk"*. Unchanged datablocks cost almost nothing per step. On undo, `readfile.cc`
  (`read_undo_reuse_noundo_local_ids`, `use_old_bmain_data`) **reuses** the IDs that did not
  change, so the depsgraph and GPU caches survive and only changed IDs are reloaded
  (`recalc_up_to_undo_push` says which).
* **Edit-mode undo**: storing a whole file per vertex drag would be too slow, so edit mesh
  stores a compact copy of just that mesh.
* **Sculpt undo**: stores only the changed nodes (BVH leaves) of a multi-million-vertex mesh.

**Why not "every command has an inverse"?** Writing an exact inverse for hundreds of tools
is bug-prone; snapshotting with sharing is generic and always correct. Blender uses inverse-free
snapshots + structural sharing, and specialises only where data is huge.

---

## 3. Window manager and UI

### 3.1 The hierarchy
```
wmWindowManager (an ID)
 └ wmWindow            one OS window; owns modal handlers, event queue
    └ WorkSpace + bScreen (layout)
       └ ScrArea       a rectangle with ONE editor type (3D View, Properties, Timeline...)
          ├ SpaceLink  the editor's data: SpaceView3D = View3D (shading, overlays, camera, local view)
          └ ARegion[]  header, toolbar, sidebar, main WINDOW region, HUD...
               └ regiondata: RegionView3D (viewmat, winmat, persmat, viewquat, dist, clip...)
```
(`makesdna/DNA_screen_types.h`, `DNA_view3d_types.h`). Important: **the camera of a 3D
viewport lives in its `RegionView3D`**, one per region. A quad view = four regions, four
`RegionView3D`, one `View3D`. Two 3D editors = two independent views of the same scene.
There is no global "the camera".

Each region type is a table of callbacks (`blenkernel/BKE_screen.hh`, `ARegionType`):
`init, exit, draw, draw_overlay, layout, listener, message_subscribe, cursor, ...`.
The same pattern again: no switch statements, each editor plugs in.

### 3.2 Context instead of globals
`blenkernel/intern/context.cc`, `ctx_data_get`: asking for `CTX_data_active_object(C)`
first checks a temporary store (set by a button or Python override), then **the region's**
`context` callback, then **the area's**, then **the screen's**, then the scene. So "the
active object" or "the selected bones" can mean different things in different editors.
The event loop sets `CTX_wm_window/area/region` to the region under the mouse before
running handlers (`CTX_wm_region_set(C, region_event_inside(C, event->xy))`).

**Aha for us:** Blender never asks "which viewport owns the global camera?". The context
is built per event from *where the mouse is*. Tools receive the context as an argument.

### 3.3 Event handling order
`wm_event_do_handlers`: window **modal handlers first** (`win.runtime->modalhandlers` —
a running G/R/S or a popup gets every event), then the area/region handler lists (keymaps of
the editor under the mouse), then window handlers. There is a quote worth remembering:

```c
/* MVC demands to not draw in event handlers...
 * but we need to leave it for GPU selecting etc. */
```
Handlers change data and tag; drawing happens later in its own phase.

Keymaps (`windowmanager/intern/wm_keymap.cc`) are data: (key, modifiers) -> operator idname
+ properties, organised per editor/mode. Users can rebind anything, the add-on can add maps,
and the tooltip can show the shortcut, because it is a lookup table, not `if (key==...)` code.

### 3.4 Notifiers + listeners = "who must redraw?"
Code that changes data sends a notifier: `WM_event_add_notifier(C, NC_OBJECT|ND_TRANSFORM, ob)`
(category + detail + reference). Later, `wm_event_do_notifiers` offers each notifier to
every listener (`ED_workspace_do_listen`, `ED_screen_do_listen`, `ED_area_do_listen`,
`ED_region_do_listen` for every region in every window). Filtering: an `NC_SCENE` note for
another scene is skipped, an `NC_SPACE` note only reaches its own area.

The 3D view's listener (`editors/space_view3d/space_view3d.cc`, `view3d_main_region_listener`)
is a big switch: `case NC_ANIMATION: case ND_KEYFRAME: ED_region_tag_redraw(region)`.
Each editor decides for itself what it cares about. The sender does not need to know
which editors exist (the outliner, properties editor and a second 3D view all react to
the same note). Notifiers are also deduplicated (`notifier_queue_set`) so 1000 identical
notes cost one redraw.

The newer **message bus** (`wm_message_bus`) is more precise: a region subscribes to RNA
types/properties (`view3d_main_region_message_subscribe` subscribes to `RNA_Object`,
`RNA_View3DShading`, `RNA_View3DOverlay`, ...), and any RNA set publishes. The source
comment in `rna_property_update` says the notifier path *"should eventually be replaced
entirely by message bus"* — Blender is migrating, carefully, keeping both meanwhile.

### 3.5 Redraw tagging and per-region buffers
`editors/screen/area.cc`:
```c
void ED_region_tag_redraw(ARegion *region) {
  if (region && !(region->runtime->do_draw & RGN_DRAWING)) {
    region->runtime->do_draw |= RGN_DRAW;  ...
```
It only sets a flag. Variants: `ED_region_tag_redraw_partial` (a rectangle),
`ED_region_tag_redraw_no_rebuild` (draw again but keep UI blocks), `..._editor_overlays`
(only overlays changed).

`wm_draw.cc`: each region draws into **its own offscreen buffer**
(`wm_draw_region_buffer_create` -> `GPU_offscreen_create` or a `GPUViewport` for 3D views).
Then the window is composed by blitting all region buffers (`wm_draw_region_blit`).
A region whose `do_draw` is clear is not drawn at all — its old picture is reused. Moving the
mouse over the toolbar redraws only the toolbar.

### 3.6 Panels and buttons (also from Python)
`scripts/startup/bl_ui/properties_object.py`:
```python
class OBJECT_PT_transform(ObjectButtonsPanel, Panel):
    bl_label = "Transform"
    def draw(self, context):
        layout = self.layout
        ob = context.object
        row = layout.column().row(align=True)
        row.prop(ob, "location")
```
The UI is **immediate-mode**: `draw()` runs every time the region redraws and simply lists
what to show. `row.prop(ob, "location")` creates a button bound to (RNA pointer, property);
the label, range, unit, tooltip, animated colour (yellow/green keyframe state) and right-click
menu all come from RNA. A Python panel is a normal `PanelType` whose C draw callback calls into
Python through RNA (`makesrna/intern/rna_ui.cc`, `panel_draw` -> `panel->type->rna_ext.call`).
Nearly all of Blender's menus and panels are Python files in `scripts/startup/bl_ui/`.
**Why immediate mode?** No widget state to keep in sync with data: the data is the state.
It is cheap because only tagged regions redraw.

### 3.7 Staying responsive: wmJobs
`windowmanager/intern/wm_jobs.cc` — threaded jobs (render, bake, preview icons, file
browser thumbnails, compositor, shader compile). A job has `startjob` (runs in a worker
thread) and main-thread callbacks `initjob, update, timer_step, endjob, completed, canceled, free`
plus an `owner` (so starting the same job for the same owner stops the old one first).
Communication goes through `wmJobWorkerStatus` (`WM_types.hh`):

```c
bool do_update;   /* OUTPUT - worker asks the main thread to show progress */
bool stop;        /* INPUT  - main thread asks the worker to stop           */
float progress;   /* OUTPUT - 0..1, drawn in the status bar                  */
ReportList *reports;
```
A main-thread timer (`wm_jobs_timer`) checks `do_update`, calls `update`, sends the job's
notifier (so the image editor redraws the new render tiles) and updates the progress bar.
The worker never touches UI. **Rule:** heavy work = job; the main loop never waits.

---

## 4. Dependency graph

`source/blender/depsgraph/`. Purpose (`DEG_depsgraph.hh`): *"determine the set of operations
need to ensure that all data has been correctly evaluated in response to changes, based on
dependencies and visibility of affected data."*

### 4.1 Build
`intern/builder/deg_builder_nodes.cc` creates nodes: **ID node** -> **component nodes**
(`TRANSFORM`, `GEOMETRY`, `ANIMATION`, `SHADING`, `COPY_ON_EVAL`, `POSE`...) -> **operation
nodes** (e.g. `TRANSFORM_LOCAL`, `TRANSFORM_PARENT`, `TRANSFORM_CONSTRAINTS`, `GEOMETRY_EVAL`,
`RIGIDBODY_SIM`). `deg_builder_relations.cc` adds edges. Plug-ins declare their own edges:
the Array modifier says (`modifiers/intern/MOD_array.cc`, `update_depsgraph`)

```c
DEG_add_object_relation(ctx->node, amd->start_cap, DEG_OB_COMP_GEOMETRY, "Array Modifier Start Cap");
```
so the depsgraph core knows nothing about arrays. The graph is built only when relations
change (adding an object, a new modifier target), not per edit.

The granularity is the key design decision: relations connect **components**, not whole
objects. Moving a bone's parent does not recompute the mesh of an unrelated object; changing
a material does not re-run modifiers. (The old pre-2.8 depsgraph was per-object, which caused
the famous "dependency cycle" problems with rigs.)

### 4.2 Tagging
`DEG_id_tag_update(id, ID_RECALC_TRANSFORM)` maps the flag to a component
(`depsgraph_tag.cc`: `case ID_RECALC_TRANSFORM: *component_type = NodeType::TRANSFORM;`)
and marks it as an entry. Nothing is computed yet — tagging is cheap and can happen
thousands of times per event.

### 4.3 Flush
`intern/eval/deg_eval_flush.cc`, `deg_graph_flush_updates`: starting from tagged entry
nodes, walk outward along relations, set `DEPSOP_FLAG_NEEDS_UPDATE` on every downstream
operation, then `flush_editors_id_update` informs editors and render engines which IDs changed.

### 4.4 Evaluate (multithreaded, only what is needed)
`intern/eval/deg_eval.cc`, `deg_evaluate_on_refresh`:
```c
if (graph->entry_tags.is_empty()) { return; }       /* nothing changed -> zero cost */
...
/* - Start with the copy-on-evaluation operations which never form dependency cycles.
 * - If there is potentially dynamically changing visibility in the graph update the
 *   actual nodes visibilities, so that heavy data evaluation can benefit from knowledge
 *   that something heavy is not currently visible.
 * - Multi-threaded evaluation of all possible nodes. ...
 * - Single-threaded pass of all remaining operations. */
```
Scheduling is a classic counter-based topological run: each operation counts its
pending, tagged, visible parents (`num_links_pending`); when a task finishes, it decrements
its children atomically and pushes the ones that reach zero into the TaskPool
(`deg_task_run_func` -> `schedule_children`). Untagged nodes are skipped (*"they are
considered to be up to date"*), invisible IDs are skipped (`check_operation_node_visible`).
The Python GIL is released during evaluation (`BPy_BEGIN_ALLOW_THREADS`) so Python drivers can run.

**Why only changed things recompute:** three filters stacked: (1) only tagged entry nodes,
(2) only their downstream nodes, (3) only visible ones. Plus the evaluated copy keeps
results between evaluations.

### 4.5 Where it is called
`wm_event_do_notifiers` -> `wm_event_do_depsgraph` updates the depsgraph of every visible
view layer in every window, once per loop iteration, after all events were handled
(so 50 mouse events between two frames = one evaluation). Comment there: *"The whole idea of
locked interface is to prevent viewport and whatever thread from modifying the same data.
Because of this, we can not perform dependency graph update."*

---

## 5. Drawing and rendering (the most important part for us)

### 5.1 GPU module: one API, several backends
`source/blender/gpu/` has `opengl/`, `vulkan/`, `metal/`, and `dummy/`.
`gpu/intern/gpu_backend.hh`, `class GPUBackend` is a factory:

```c
virtual Context *context_alloc(GHOST_IWindow *, GHOST_IContext *) = 0;
virtual Batch *batch_alloc() = 0;       virtual Shader *shader_alloc(const char *name) = 0;
virtual Texture *texture_alloc(const char *name) = 0;  virtual VertBuf *vertbuf_alloc() = 0;
virtual StorageBuf *storagebuf_alloc(...) = 0;          virtual void compute_dispatch(...) = 0;
```
All drawing code uses `GPU_batch_*`, `GPU_texture_*`, `GPU_shader_*`, `GPU_framebuffer_*`
and never calls OpenGL directly. Shaders are declared with **create-info** descriptors
(`gpu_shader_create_info.hh`: inputs, outputs, push constants, resources) and Blender
generates GLSL/SPIR-V/MSL per backend. The **dummy backend** lets tests and background
renders run without a GPU.
Basic objects: `VertBuf` (vertex attributes) + `IndexBuf` + primitive type = `gpu::Batch`
(one drawable); `GPUViewport` = per-3D-region set of colour/depth/overlay textures.

### 5.2 Draw manager: engines plug in
`source/blender/draw/`. `DRW_draw_view(C)` (`draw/intern/draw_context.cc`) is called by the
3D region's draw callback. It takes the **evaluated** depsgraph and the region's GPUViewport,
picks engines (`enable_engines`: EEVEE or Workbench or "external" for Cycles, plus
Overlay, Grease Pencil, Select...) and runs them in fixed phases
(`DRWContext::engines_init_and_sync`):

```c
foreach_enabled_engine(... instance.init(); );
manager->begin_sync(obact);
foreach_enabled_engine(... instance.begin_sync(); );
sync(iter_callback);           /* for each VISIBLE object: every engine.object_sync(ob) */
foreach_enabled_engine(... instance.end_sync(); );
manager->end_sync();
```
then `engines_draw_scene()` calls `instance.draw(manager)` per engine (overlays last, on top).
The engine interface (`draw/intern/DRW_render.hh`, `struct DrawEngine`) is tiny:
`init, begin_sync, object_sync, end_sync, draw`.

* **Engine instances are per viewport.** They live in `DRWViewData`, owned by the region's
  GPUViewport. Two 3D views = two EEVEE instances with their own sample accumulation.
* **Overlay is a separate engine** (`draw/engines/overlay/`: grid, outline, wireframe,
  mesh edit, extras...). Selection outlines, gizmo-ish extras and edit-mode drawing are the
  same no matter which render engine draws the surfaces — even when Cycles renders the image.
* **Passes** (`draw/intern/draw_pass.hh`) record commands and *"can be recorded once and
  resubmitted any number of time"*. `PassMain` batches many draw calls and does GPU culling;
  `PassSimple` keeps order; `PassSortable` for transparency.
* **GPU-side culling and instancing:** `draw::Manager` stores per-object matrices/bounds in
  GPU buffers indexed by `ResourceHandle`; `Manager::compute_visibility` runs a compute shader
  for culling; `generate_commands` builds indirect draw commands. Fingerprints skip all of it
  when *"Resources and view did not changed"*.

### 5.3 GPU batch cache: never rebuild what did not change
Mesh GPU buffers live in the mesh's runtime (`MeshBatchCache`, `draw/intern/draw_cache_extract.hh`).
Engines **request** batches during `object_sync` (`DRW_batch_request`), and after all
engines synced, `DRW_mesh_batch_cache_create_requested` builds every requested buffer in one
parallel pass (a `TaskGraph`, extractors in `draw/intern/mesh_extractors/`). When the mesh
changes, `DRW_mesh_batch_cache_dirty_tag(mesh, mode)` drops only the affected parts
(`BKE_MESH_BATCH_DIRTY_SELECT` only rebuilds selection flags; `_SHADING` only shading data).
Moving an object = new matrix only; its vertex buffers are untouched.

### 5.4 The three engines
* **Workbench** (`draw/engines/workbench`) — solid/flat/matcap, fast, used while modelling.
  Anti-aliasing by temporal accumulation: jitter the camera a little each frame and average
  when the view is still.
* **EEVEE** (`draw/engines/eevee`) — real-time PBR rasteriser (deferred + forward pipelines,
  virtual shadow maps, ray-traced reflections, light probes). Viewport accumulates samples
  progressively. `eevee_sampling.cc`:
  ```c
  if (reset_) { viewport_sample_ = 0; ... }               /* something changed: start over */
  interactive_mode_ = viewport_sample_ < interactive_mode_threshold;  /* first 3 samples */
  ```
  and `eevee_instance.cc`: `if (!sampling.finished_viewport() && !is_playback) DRW_viewport_request_redraw();`
  — **keep redrawing only until the sample count is reached; then the GPU rests.** During
  playback it does not request extra redraws, to lock to the animation rate.
* **Overlay** — always on top of whichever engine.

### 5.5 Cycles: a render engine outside Blender
`intern/cycles/` is a separate library (it is also used by other apps). Blender talks to it
through `RenderEngineType` (`source/blender/render/RE_engine.h`):

```c
void (*update)(RenderEngine *, Main *, Depsgraph *);
void (*render)(RenderEngine *, Depsgraph *);        /* F12 final render */
void (*view_update)(RenderEngine *, const bContext *, Depsgraph *);  /* viewport: data changed */
void (*view_draw)(RenderEngine *, const bContext *, Depsgraph *);    /* viewport: draw current pixels */
void (*bake)(...);
```
Add-ons can register engines through the same struct from Python (`bpy.types.RenderEngine`).

**Viewport rendering, step by step:**
1. The engine instance lives in the region: `rv3d->runtime->view_render`.
2. After depsgraph evaluation, `ED_render_view3d_update` (`editors/render/render_update.cc`)
   calls `engine->type->view_update(...)` for each 3D region with a running engine.
3. Cycles' `BlenderSync::sync_recalc` (`intern/cycles/blender/sync.cpp`) iterates
   **only updated IDs** (`deg_iter_data.only_updated = true`) and checks
   `ID_RECALC_GEOMETRY` / `ID_RECALC_TRANSFORM` / `ID_RECALC_SHADING` separately:
   moving an object only re-uploads a transform; changing a material only recompiles a shader.
4. Then `session->reset(...)`: samples restart from zero.
5. Cycles renders in its **own thread** (`session/session.cpp`, `session_thread_ = make_unique<thread>(...)`;
   `run_main_render_loop`). Blender's UI never waits for it.
6. When new pixels exist, the engine sets `RE_ENGINE_DO_DRAW`; `wm_region_test_render_do_draw`
   (`wm_draw.cc`) sees it and tags the region (`ED_region_tag_redraw_partial` with a render border,
   else `_no_rebuild`). Then `view_draw` blits Cycles' display buffer (GPU interop where possible).

**Why the viewport stays smooth while Cycles renders:** `RenderScheduler`
(`integrator/render_scheduler.cpp`):
* starts at **low resolution** (`default_start_resolution_divider_ = pixel_size_ * 8`), then
  halves the divider until full resolution — you see a blurry image instantly, sharp soon after;
* adapts **samples per update** to measured speed:
  `num_samples_in_second * update_interval_in_seconds`;
* adapts **display update interval** to elapsed time:
  `< 1 s -> 0.1 s, < 2 s -> 0.25 s, < 4 s -> 0.5 s, then 1-2 s` (fast feedback first, then
  fewer, more efficient updates; headless renders update every 30 s);
* `buffers_mutex_` is *"released/reacquired on each iteration to allow reset and draw in between"*.

### 5.6 CPU vs GPU vs mixed — where and how
| part | runs on | how |
|---|---|---|
| UI, event loop, operators, notifiers | CPU, main thread | single-threaded by design (no locks in UI code) |
| Depsgraph evaluation (modifiers, constraints, geometry nodes, rigid body step) | CPU, many threads | TaskPool + TBB (`blenlib` `BLI_task`), parallel per operation and inside modifiers |
| Mesh -> GPU buffer extraction | CPU threads, some on GPU | `mesh_extractors/`, some compute shaders (`extract_mesh_compress_gpu.cc`, subdivision on GPU) |
| Culling, command generation | GPU compute | `draw::Manager::compute_visibility` |
| Workbench / EEVEE / Overlay | GPU | GPU module over OpenGL/Vulkan/Metal |
| Cycles | CPU **or** GPU **or both** | `intern/cycles/device/`: `cpu`, `cuda`, `optix`, `hip`, `hiprt`, `metal`, `oneapi`, `multi` |
| Denoising | CPU or GPU | `denoiser_oidn.cpp` (CPU), `denoiser_oidn_gpu.cpp`, `denoiser_optix.cpp`, `denoiser_dlss.cpp` |

**Mixed CPU+GPU in Cycles** (`device/multi/device.cpp`, `class MultiDevice`): a "multi device"
wraps several real devices. `PathTrace` creates one `PathTraceWork` per device
(`device_->foreach_device(...)`) and splits the image between them. `integrator/work_balancer.cpp`:
starts with equal weights (`weight = 1.0 / num_infos`), then **rebalances by measured time**:
*"if one of the devices is 10% faster than another, then one device needs to do 5% less of the
current work, and another needs to do 5% more."* Same kernel source is compiled for each device
(`intern/cycles/kernel`), so features match on CPU and GPU.

### 5.7 Viewport vs final render
Same engines, different entry point: viewport = `view_update/view_draw` (interactive, resets,
low-res start, per-region instance); final = `render()` inside a wmJob with tiles, writes into
`RenderResult`, shown in the Image editor, cancellable (`stop` flag / `G.is_break`). Final render
uses its own depsgraph (`pipeline_render.cc`) evaluated with render settings (e.g. render-level
subdivision), so it never disturbs the viewport's depsgraph.

---

## 6. Physics and simulation

### 6.1 Rigid body = Bullet behind a thin C API
`intern/rigidbody/RBI_api.h` (*"Rigid Body API for interfacing with external Physics Engines"*)
wraps Bullet (`rb_bullet_api.cpp`). Blender code never includes Bullet headers.
Physics is wired into the depsgraph as operations on the Scene
(`deg_builder_relations.cc`, `build_rigidbody`):

```c
OperationKey rb_init_key(&scene->id, NodeType::TRANSFORM, OperationCode::RIGIDBODY_REBUILD);
OperationKey rb_simulate_key(&scene->id, NodeType::TRANSFORM, OperationCode::RIGIDBODY_SIM);
add_relation(time_src_key, rb_init_key, "TimeSrc -> Rigidbody Init");   /* depends on time */
...
add_relation(rb_simulate_key, rb_transform_copy_key, "Rigidbody Sim Eval -> RBO Sync");
```
Each object: its user transform (after parenting/constraints) feeds the simulation init; the
solver's result becomes the object's **final evaluated** transform. The original `ob->loc`
is not overwritten by physics — exactly the copy-on-eval rule.

### 6.2 Time + cache: you can scrub
`blenkernel/intern/rigidbody.cc`, `BKE_rigidbody_do_simulation(depsgraph, scene, ctime)`:
```c
/* try to read from cache */
bool can_simulate = (ctime == rbw->ltime + 1) && !(cache->flag & PTCACHE_BAKED);
if (BKE_ptcache_read(&pid, ctime, can_simulate) == PTCACHE_READ_EXACT) { ... return; }
/* advance simulation, we can only step one frame forward */
...  RB_dworld_step_simulation(world, substep, 0, substep);
BKE_ptcache_write(&pid, uint(ctime));
```
Each frame's state is written into a **point cache** (`pointcache.cc`). Going back in the
timeline reads the cache; going forward one frame steps the solver; jumping far ahead without
cache cannot simulate (rewind to start). Editing a parameter marks the cache `OUTDATED`.
"Bake" = fill the cache for the whole range in a job, then `PTCACHE_BAKED` protects it.

### 6.3 Simulation nodes: the same idea, generalised
`modifiers/intern/MOD_nodes.cc` decides per frame, per simulation zone, what the zone does:
`sim_input::PassThrough / UseCache`, `sim_output::StoreNewState / ReadSingle / ReadInterpolated / PassThrough`.
Comments: *"Do a simulation step."*, *"Just read from the previous state if the frame has not
changed."*, *"Reset the simulation when the scene time moved backwards."* And only the
**active** depsgraph may write caches (`depsgraph_is_active_`), so a background or render
depsgraph cannot corrupt the user's simulation. Bakes can be stored on disk or packed in the
.blend (`blenkernel/intern/bake_*`).

Cloth/soft body/hair use `source/blender/simulation/` (`SIM_mass_spring.cc`, a constrained
conjugate-gradient implicit solver) with the same point-cache + timeline pattern.

**Lesson:** a simulation is "state(frame) = step(state(frame-1))". Make the timeline frame the
input, cache every state, and the UI can scrub, loop and compare for free.

---

## 7. Python vs C/C++

* **C/C++**: data (DNA), RNA, depsgraph, all modifiers, geometry nodes, drawing, Cycles,
  physics, file IO, undo, event loop, transform tool, snapping.
* **Python** (`scripts/startup/bl_ui/*.py`, `scripts/startup/bl_operators/`, add-ons):
  menus, panels, headers, many simple operators, importers/exporters, add-ons.
* `bpy` is a **generic RNA wrapper**, not hand-written bindings (`python/intern/bpy_rna.cc`,
  `pyrna_struct_getattro` looks the name up in RNA at runtime). Every RNA property is
  automatically available in Python, with the same checks, updates and notifiers as the UI.
* `bpy.ops.*` calls operators through `bpy_operator.cc` -> the same `WM_operator_call_py`.
* Python classes register through RNA (`bpy.utils.register_class` -> `rna_Panel_register`,
  `rna_Operator_register`, `RenderEngine`...).

**Why it is fast:** Python only describes UI or calls into C for whole operations. Inner loops
(per vertex, per pixel, per object per frame) are in C++, multi-threaded. Python draw functions
run only for tagged regions. Drivers can be "simple expressions" compiled to bytecode without the
interpreter (`bpy_driver_bytecode.cc`), because a Python call per frame per driver adds up.

---

## 8. Special features worth copying

### 8.1 Transform system (G/R/S)
`editors/transform/`. The genius is a **matrix of two independent tables**:
* **modes** (`transform_mode_*.cc`, `TransModeInfo`: `init_fn, transform_fn, transform_matrix_fn,
  handle_event_fn, snap_apply_fn, draw_fn`) — translate, rotate, resize, shear, edge slide...
* **converters** (`transform_convert_*.cc`, `TransConvertTypeInfo`: `create_trans_data,
  recalc_data, special_aftertrans_update`) — objects, mesh verts, bones, curves, nodes, keyframes,
  sequencer strips, UVs...

A converter turns "whatever is selected" into a flat array of `TransData`
(`transform.hh`: `float *loc; float iloc[3]; float center[3]; ...` = pointer to the real value +
its initial value). A mode only edits `TransData`. So "rotate keyframes" and "rotate vertices"
share one rotate implementation: M modes + N data types, not M×N.

Modal loop (`transform_ops.cc`, `transform_modal` -> `transformEvent`): every mouse move
recomputes from the **initial** values (no drift), typing a number gives exact input, X/Y/Z
adds a constraint (`transform_constraints.cc`, press twice for local axis), Ctrl toggles snapping.
Esc: `restoreTransObjects` copies `iloc` back (cancel is free — no undo step needed). Confirm:
`special_aftertrans_update` + one undo push. During the drag the converter's `recalc_data`
only calls `DEG_id_tag_update(&ob->id, ID_RECALC_TRANSFORM)` — the normal pipeline does the rest.

### 8.2 Snapping
`transform_snap_object.cc`: a `SnapObjectContext` caches BVH trees per object/edit-mesh
(`Map<const ID *, std::unique_ptr<SnapCache>> editmesh_caches`) for the duration of the
tool, with the view's `persmat` and clip planes so it tests only what is on screen. Snap targets
(vertex, edge, edge midpoint, face, perpendicular, volume, grid) are flags; "snap with"
(closest/center/median/active) chooses the source point.

### 8.3 Modifier stack and constraints
`BKE_modifier.hh`, `ModifierTypeInfo`: `deform_verts`, `modify_mesh`, `modify_geometry_set`,
`required_data_mask`, **`update_depsgraph`**, `depends_on_time`, `foreach_ID_link`,
`is_disabled`. The stack is non-destructive: the original mesh stays, the evaluated mesh is
the result. Each modifier tells the depsgraph what it depends on.
Constraints (`BKE_constraint.h`, `bConstraintTypeInfo`: `get_constraint_targets`,
`get_target_matrix`, `evaluate_constraint`) work the same way, evaluated in the
`TRANSFORM_CONSTRAINTS` operation; armature IK is a pose operation (IK solver / iTaSC in `intern/`).
For a robot studio: joint limits, mates, "keep connector A on connector B" are constraints;
mirroring/arraying modules are modifiers.

### 8.4 Node systems
Geometry/shader/compositor nodes are IDs (`bNodeTree`) with typed sockets, evaluated lazily
(only outputs that are used), multi-threaded, with field-based attributes. The node tree is just
data; evaluators interpret it. Simulation zones (section 6.3) add time.

### 8.5 Many editors, one scene; workspaces
Because editors only read the scene and listen to notifiers, you can open the same scene in
four 3D views, an outliner, a spreadsheet and a graph editor, and they all stay correct with no
special code. A workspace is just a saved screen layout + mode + active tools.

### 8.6 Preferences, add-ons
Preferences = one `UserDef` struct (`U`), saved separately in `userpref.blend`, versioned like
files (`versioning_userdef.cc`). Add-ons are Python packages with `register()/unregister()`
that add operators, panels, keymaps, RNA properties and even render engines through the
public RNA API only — they cannot reach internals, which keeps them from breaking on updates.

### 8.7 File format and versioning (recap)
Self-describing SDNA + explicit `do_versions` blocks guarded by version/subversion; a minimum
version that may open new files; forward-compat data kept when possible.

---

## 9. Engineering practice visible in the repo and handbook

* **Modules with owners** (developer.blender.org/docs/handbook/organization/modules): each area
  (Core, Viewport & EEVEE, Cycles, Animation & Rigging, Modeling, Python API, UI...) has owners
  who *"decide implementation and design issues and approve or reject patches"*, fix bugs every
  release, organise reviews. Cross-module changes need approval from the other module.
* **Design first**: big changes start as a design task with discussion; code comes in small PRs on
  projects.blender.org (GitHub is only a mirror — `.github/pull_request_template.md` says so).
* **Code style is automated**: `.clang-format`, `.clang-tidy`, `.editorconfig` at the root;
  `.git-blame-ignore-revs` so mass reformatting does not pollute history. Commit titles like
  `Refactor: Avoid allocating TransDataExtension for shrink/fatten` (type prefix + module + what).
* **Tests at three levels**: ~200 C++ unit tests next to the code (`*_test.cc`, e.g.
  `depsgraph/intern/builder/deg_builder_rna_test.cc`, `blenkernel/intern/armature_deform_test.cc`);
  Python integration tests in `tests/python/` (`bl_global_undo.py`, `bl_blendfile_versioning.py`,
  `bl_constraints.py`, `bl_operator_wrap_py_api.py`...); **render tests** that render .blend files
  and diff images against references with a threshold (`tests/python/modules/render_report.py`,
  `fail_threshold = 0.016`; `cycles_render_tests.py`, `eevee_render_tests.py`).
  `tests/utils/bl_run_operators.py` runs **every operator in every context** to find crashes.
  `tests/performance/` benchmarks. `make test`, `make test_gpu_draw`.
* **CI**: buildbot builds every platform; versions pinned in `build_files/config/pipeline_config.yaml`.
* **Release cycle** (handbook, release_cycle): new version every ~4 months — Alpha 17 weeks on
  `main` (risky changes early), Beta 5 weeks bug-fix only on a release branch with frozen Python API,
  RC 1 week, Release 1-2 days, one release per year is LTS for 2 years.
* **Comments explain why, with bug numbers** (`see #101743`, `#29579`): every surprising
  guard in the code points to the bug that caused it.

---

## 10. The "aha" list (surprising things found in the code)

1. **The main loop is 4 lines** and strictly separates *change* (handlers) -> *propagate*
   (notifiers + depsgraph) -> *draw*. No drawing inside handlers ("MVC demands...").
2. **A property declares its own consequences** (notifier + depsgraph tag + update callback) in
   RNA. Callers cannot forget to redraw or re-evaluate.
3. **Undo is pushed by the window manager, not by tools** (`wm_operator_finished`), and the redo
   panel is just "undo, change properties, exec again".
4. **Memfile undo = save the file to RAM with deduplicated chunks**, and on undo reuse unchanged
   IDs so GPU caches and depsgraph survive.
5. **The camera belongs to a region** (`RegionView3D`), and the "context" is resolved from the
   region under the mouse. There is no global viewport.
6. **Original and evaluated data are different copies.** Physics, animation and modifiers never
   write the user's data. That removes a whole class of "two writers fight" bugs.
7. **Tagging is cheap, evaluation is batched**: thousands of tags per event, one evaluation per loop.
8. **Each region has its own offscreen buffer**; untagged regions are re-blitted, not redrawn.
9. **Progressive engines keep requesting redraws only until converged**, then the GPU idles.
   Cycles adapts resolution, samples-per-update and update interval to measured speed.
10. **Mixed CPU+GPU rendering balances by measured time**, not by guessing device speed.
11. **Plug-in tables everywhere** (IDTypeInfo, ARegionType, wmOperatorType, ModifierTypeInfo,
    bConstraintTypeInfo, DrawEngine, RenderEngineType, UndoType, TransModeInfo, TransConvertTypeInfo):
    adding a feature means adding a table, not editing a switch in ten files.
12. **Plug-ins declare their own dependencies** (`update_depsgraph`), so the depsgraph core stays generic.
13. **Simulation = cache per frame + time as an input**, so scrubbing and baking come free; only
    the active depsgraph may write the cache.
14. **Transform = modes × converters**, and cancel is free because initial values are kept in `TransData`.
15. **Background jobs talk through three fields** (`do_update`, `stop`, `progress`) and a
    main-thread timer; workers never touch UI.
16. **The UI layout is data too** (screens are IDs saved in the file), and Python draws panels
    in immediate mode through RNA.
