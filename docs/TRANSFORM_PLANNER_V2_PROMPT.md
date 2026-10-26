# TETROBOT Transformation Planner v2 — Brief for Claude Code (robo4)

You are working in my TETROBOT Studio repo (`D:\robo4`, React/TS front end, page "MSRR Experiments").
My physics sim and docking/walking controllers live separately in `C:\TETROBOT` (Python, MuJoCo + MuJoCo Warp on an RTX 5050).

I direct; you build. I don't read code line by line, so after every milestone give me a plain-language update:
- what you built, why, and how it works;
- what you tested and the numbers;
- what's next.

Show results visually on the Studio page (I verify with my eyes), not only in the terminal.

---

## 0. Read this first: why v1 (the cube approach) failed

v1 = "define a shape as voxel cubes → fit modules into the cubes → walk modules hand over hand until the cubes are covered".

Result: transforms cover only 45–70% of the target (cross → bridge = 11/25 cubes), and moving one module at a time can't finish shapes.

Root causes (don't repeat them):

1. **Wrong target.** A cube silhouette is a *picture*, not a *robot*.
   - Voxels ignore joint angles, torque, centre of gravity, and what the shape must DO.
   - "Car" isn't a silhouette; it's "moves across the floor, low CoG, ≥3 ground contacts".
2. **Wrong unit.** A TETROBOT module is a 7-DOF chain with continuous joint angles, not 8 rigid voxels.
   - The same connection graph can be a chair or lie flat on the floor, depending on its joint angles.
3. **Wrong success metric.** "% cubes covered" rewards filling space, not reaching a stable, working robot.
4. **No physics in the planner.**
   - No torque limit, no stability check of intermediate states, no reliability of each dock.
   - Real docks take ~20 s and succeed 82–97% of the time, so a 10-dock plan at 95% each succeeds only ~60% of the time.
5. **No behaviour.** Even a perfect "car" shape can't drive unless a gait/controller comes with it.
6. **Bug to fix:** the current page lets any connector weld to any other, including **side↔side**.
   - In reality **side↔side is impossible**: only ENDS have lock rotors.
   - Valid pairs are **end↔end** and **end↔side** only.

**Keep v1 as a "Legacy (cubes)" tab.** Don't delete it. Reuse its working parts:
- the module kinematics (matches the Studio module doc);
- the STL drawing;
- the welding/graph code (after fixing the side↔side bug);
- the animation player;
- the 339 tests;
- the hardware convention (180 = straight; the ESP adds the per-module horn offsets).

---

## 1. The new idea in one paragraph

A shape is **topology + pose + behaviour**, chosen for **what it must do**, not for how it looks.

The pipeline:
1. An LLM turns my words into **required capability tags** from a closed list.
2. A **shape library** returns candidate shapes whose tags were **measured by checks/sim**, never claimed.
3. A **planner** searches for the most *reliable* sequence of physical **verbs** (dock, undock, peel, walk-step, lock…) from the TRUE current state to the target. Every intermediate state must be physically stable.
4. The **Python sim rehearses** the final plan on many randomized robots.
5. The **executor** runs it with my existing controllers and replans from the true state on any failure.

If no library shape fits, a **generator** invents candidates, tests them, and adds the passing ones to the library. The library is a cache, not a limit.

---

## 2. Architecture

```
L0 STATE      true config graph = connector neighbour reports + encoders + (later) camera
L1 VERBS      dock / undock / peel / walk-step / lock / unlock / pose-move,
              each with preconditions, effects, MEASURED success %, duration
L2 SHAPES     library entry = topology + pose + behaviour + MEASURED tags
              generator: enumerate topologies → optimise pose → check → (sim) → save
L3 PLANNER    roadmap + Dijkstra (N ≤ 4 modules), A* (N > 4)
              cost = −log(success) + λ·time; reject unstable intermediate states
L4 INTENT     LLM: text + scene + chat history → JSON {required_tags, constraints, prefs}
L5 EXECUTE    compile plan → my C:\TETROBOT controllers → judge → replan on failure
VERIFY        Python service (MuJoCo / MuJoCo Warp) rehearses plans; Studio calls it locally
```

Split of work:
- **Studio (TypeScript):** the data model, L0–L4, the cheap physics checks, and the UI.
- **Python (`C:\TETROBOT\sim`):** heavy verification. A small local HTTP/WebSocket service that Studio calls with a config graph + pose, or with a plan, and gets back pass/fail plus numbers.
- Install everything on the **system Python, no venvs**, and always use the **latest** package versions (never downgrade).

---

## 3. Data model (the shared language: every layer speaks ONLY this)

```ts
type PortId = "A" | "B" | "S1A" | "S1B" | "S2A" | "S2B";   // A/B = ends (have lock rotors), S* = spine receivers
type ModuleId = string;                                      // "M1", "M2", ...
type FloorAnchorId = string;                                 // fixed floor connectors (receivers), known coordinates

interface Edge {                     // one physical lock
  a: { module: ModuleId; port: PortId } | { floor: FloorAnchorId };
  b: { module: ModuleId; port: PortId };
  slot: 0 | 1 | 2 | 3;               // which of the 4 lock orientations (pads at 0/90/180/270, docked at the 45° offset)
  locked: boolean;
}
// RULE: at least one side of every edge is an END port (A/B). side↔side is invalid. end↔floor is valid.

interface Pose { [m: ModuleId]: { T1; B1; B2; T2; B3; B4; T3: number /*deg, 180 = straight*/ } }

interface Config {                    // the full robot state
  modules: ModuleId[];
  unused: ModuleId[];                  // allowed! modules parked and left out of the shape
  edges: Edge[];
  pose: Pose;
  baseFrame?: { floorAnchor?: FloorAnchorId; worldPose?: number[] };
}

interface ShapeEntry {
  id: string; name: string;            // "low_rolling_loop_2m", "tripod_chair_3m"
  nModules: number;
  topology: Edge[];                    // canonical form (deduped by graph isomorphism + module symmetry)
  pose: Pose;
  behaviour?: string;                  // id of a gait/controller that makes it DO the thing
  tags: Record<CapabilityTag, {value: number|boolean, measuredBy: "static"|"sim", runs?: number}>;
  margins: { maxTorquePct: number; cogMarginMm: number; minJointMarginDeg: number };
}

interface Verb {
  kind: "dock" | "undock" | "peel" | "walk_step" | "lock" | "unlock" | "pose_move";
  pre: (c: Config) => boolean;
  apply: (c: Config) => Config;
  successP: number;                   // from measured stats (config file, updatable from sim logs)
  durationS: number;
}
```

**Closed capability tag list (v2 start; extend only on purpose):**
`moves_on_floor`, `max_speed_mm_s`, `ground_contacts`, `cog_height_mm`, `stands_upright`, `holds_load_kg`, `flat_top_area_cm2` (seat/table), `reach_mm` (arm), `has_free_end` (arm/tool), `stable_on_tilt_deg`, `encloses` (ring), `spans_gap_mm` (bridge), `height_mm`.

Function specs map to tags. For example, "chair" → `stands_upright`, `flat_top_area_cm2 ≥ X`, `holds_load_kg ≥ Y`, `ground_contacts ≥ 3`.

---

## 4. Hard physical rules (the planner, the checks and the generator must all enforce these)

Real module: try8, Fusion. Chain: Lock1 → T1 → B1 → B2 → T2 → B3 → B4 → T3 → Lock2.

**Joints:**
- Bends ±90°. Planning keeps a 2% margin from the stops (use ±88.2°).
- Twists ±180°, no wrap-around. Lock rotors turn 45°.
- Home = 180 for every joint.

**Mass and torque:**
- Mass 1134 g per module. Battery sits in Spine1, electronics in Spine2.
- ST3215 limit ≈ 2.7 N·m. The planner budget is **≤ 70% of stall torque continuous**; anything above it is rejected.
- **A module can't lift itself when held horizontal.** No long cantilevers. Prefer folded/curled, ground-supported motions with a low CoG.
- On slopes and walls a module is never fully straight.

**Connectors:**
- End↔end and end↔side only. Each connector has 8 magnets (~37 N at contact).
- An end **can't be pulled straight out**: undocking must use **peel** (tilt ~12° about the rim, then lift ≥ 20 mm).
- Lock play is 0.5 mm, which rocks the base about 0.5° (~2.5 mm error at a 55 cm tip). Don't plan anything that needs better than ±2 mm without a camera correction step.

**Stability:**
- **Every intermediate Config** must be statically stable under hold torque with margin: CoG inside the support polygon by ≥ 15 mm (configurable) and all joint torques within budget.
- A plan must be safely pausable at any step (battery sag, failure).

**Motion:**
- Gentle motion only: fastest joint ≤ 35°/s, go-in 25 mm/s.

**Measured verb reliability** (put these in a config file and update them from `C:\TETROBOT\logs` when new sweeps finish):

| Verb | Success | Time |
|---|---|---|
| Walk-step dock floor→floor (judge on) | ~97.5% | ~21 s |
| End→side dock (2 modules) | ~82% (provisional) | 10–20 s |
| End↔end dock | unknown yet: use 0.75 until measured | |
| Air docking (target held up by another module) | ~30–39% | |

The planner must strongly avoid air docking unless the receiver faces up/down and is within ~25 cm.

---

## 5. Layers in detail

### L0 — true state
- `currentConfig()` builds the Config from:
  - which connector reports which neighbour (stub for now; see the questions in section 7),
  - the encoder angles (ESP-TTL page),
  - later, the camera.
- The planner ALWAYS plans from this, never from what it assumes happened.

### L1 — verb library
- Implement the verbs as pure functions on Config, with preconditions:
  - reach: IK with the existing kinematics;
  - torque/stability: the static checker in L2;
  - connector rules.
- Keep the code that *executes* a verb separate (L5).

### L2 — shape library + generator
1. **Static checker** (fast, in TS): forward kinematics → per-joint gravity torque (masses per link from the module doc) → CoG vs support polygon → self-collision (capsules are fine) → joint limits. It returns margins and a pass/fail.
2. **Topology enumerator** for N = 1…4:
   - generate all valid edge sets: connected, end-rule obeyed, ≤ 1 lock per port;
   - dedupe by graph isomorphism + module end symmetry (A/B mirror) + spine symmetry;
   - report the count to me.
3. **Pose optimiser:** for each topology + target tag set, search joint angles (CMA-ES or random restarts + local optimisation) that maximise the tag fit and the margins.
4. **Tag measurement:** the static checker measures static tags. Dynamic tags (`moves_on_floor`, `max_speed`) are measured by the Python sim with the shape's behaviour. Tags carry `measuredBy`.
5. **Seed library** (built and verified, not just drawn), in this order:
   - 1 module: straight-on-floor, curled stand, arch, inchworm;
   - 2 modules: end↔end long snake, end→side T, "L" stand, low rolling loop/crawler, tripod.
6. Library storage: one JSON file per entry under `brain/shapes/` (or wherever fits the repo), plus a UI list with a 3D preview and tag badges.

### L3 — planner
- **N ≤ 4: shape roadmap.** Nodes = library shapes + the current Config. Edges = single verbs (or a short verb macro) checked feasible by L1 + L2. Run Dijkstra with cost `−log(successP) + λ·durationS` (λ configurable).
- **Target choice:** score = tagFit × marginScore − planCost. Return the top 3 targets with their plans and the reasons for the ranking.
- **N > 4:** A* over Config-space with the same cost and an admissible heuristic (lower bound = number of edges to add/remove × min cost). Leave a hook for a learned heuristic later.
- **Module assignment** (which physical module plays which role in the target): solve as matching to minimise plan cost (try all permutations for N ≤ 4).
- Extra modules may be marked `unused` and parked in a stable pose on a floor anchor or flat on the floor.
- Plan output: an ordered list of `{verb, args, expectedConfig, successP, durationS, stabilityMargins}` plus the total success probability. Show it in the UI as an animated timeline and highlight risky steps.

### L4 — intent (LLM)
- Use the existing "Text / AI" tab.
- The LLM receives:
  - my text,
  - the tag vocabulary,
  - the current Config summary,
  - a scene summary (floor anchors, tilt, obstacles),
  - the chat history.
- It returns ONLY JSON: `{required_tags, constraints, preferences, clarifying_question?}`, validated against a schema.
- **The LLM never outputs joint angles, edges or plans.**
- If no library shape satisfies the tags, the LLM may propose candidate topologies in the Edge format for the generator to test. Proposals that fail checks are discarded and logged.

### L5 — execute
- Compile the plan steps into calls to my existing controllers:
  - `C:\TETROBOT\deploy\laptop_controller.py`, `walk_real.py` (DRY_RUN by default);
  - the sim versions for testing.
- After each step: re-read the true state (L0). If it differs from `expectedConfig` → replan from the true state.
- Use the judge hooks (human y/n now, camera later).

### VERIFY — Python service
- Endpoints:
  - `check_static(config)`
  - `rehearse(plan, n_robots, seed)` → per-step success %, crashes, torque peaks
  - `measure_tags(shape)`
- Reuse the `C:\TETROBOT\sim` envs (`multi_env.py`, `gpu_multi_dock.py`, the walk envs) and their domain randomisation (PLA flex, backlash, lock play, noise, tilt).
- Rehearse only the final 2–3 candidate plans; the search itself uses the cheap TS checks.

---

## 6. Milestones (in this order; each ends with a visual demo + a plain-language update)

**M0 — Audit (no new code).**
- Read the MSRR page code and `C:\TETROBOT\sim` + `deploy`.
- Tell me, in plain words:
  - what we reuse,
  - what we drop,
  - where the side↔side bug lives,
  - how many valid topologies exist for N = 2, 3, 4 (estimate first, then the real count in M2).
- Ask me the questions in section 7.

**M1 — Data model + rules + static checker.**
- Fix side↔side.
- Unit tests:
  - connector rules;
  - torque against a hand-calculated case: one straight module held horizontal must FAIL the torque budget; a curled stand must PASS.
- UI: a "Check" button showing margins.

**M2 — Topology enumerator + pose optimiser.**
- Show me all distinct 2-module topologies with optimised poses, in a gallery.

**M3 — Seed library with measured tags** (static first, then the sim service for the dynamic tags).

**M4 — Verbs + roadmap planner for N ≤ 3.**
- Demo: "from 2-module snake → T-stand → tripod" with an animated plan, per-step success % and the total.

**M5 — Python VERIFY service + rehearsal of plans** on ≥ 128 randomized robots on the GPU.

**M6 — LLM intent:** type "become a chair" → tags → target ranking → plan → rehearsal → animation.

**M7 — Executor in DRY_RUN** against the sim with induced failures, proving replanning works.

**Later (don't build now):** A* + learned heuristic for N > 4; a GNN behaviour policy for new shapes; distributed control; camera L0.

---

## 7. Questions to ask me before M1 (don't guess these)

1. Can a single module move on a **bare floor**, or only between **floor connectors**? This decides whether "transform anywhere" needs other modules as anchors.
2. Can the pogo **signal pin** report a **neighbour's ID** (for L0), or do we rely on the lock servo state + camera?
3. How many modules realistically in the next 6 months (2? 4? more)?
4. May a "car" use **wheel tool tips**, or modules only?
5. Which floor anchors exist on my board now (coordinates), and what is the floor tilt?

---

## 8. Rules for you

- Don't touch the firmware or my Fusion files.
- Don't delete v1; move it to a Legacy tab.
- Every number you report must come from a run or a test, never from a guess. If you estimate, say "estimate".
- Physics in sim must be real contact/force: no hardcoded joint couplings.
- Before claiming a milestone is done: run the tests, open the page, take a screenshot, and check it yourself.
- Keep the plain-language progress updates: what's running now, why, how long it takes, how it works, what's next.
- No venvs, latest versions only, system Python.
