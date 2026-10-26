# Transformation Planner v2: overnight progress log

This log follows `docs/TRANSFORM_PLANNER_V2_PROMPT.md` (the brief). I update it at every milestone.

## Assumptions made while you slept (section 7 questions: please correct any of these)

| # | Question | What I assumed | Why |
|---|---|---|---|
| 1 | Bare floor, or floor connectors only? | **Floor connectors only.** A module moves by docking floor receiver to floor receiver (the brain's walk). | That is the only floor motion that is measured (97.5%). |
| 2 | Can the pogo signal pin report a neighbour's ID? | **No.** L0 uses lock servo state plus the planner's own record of what it docked. It is stubbed. | Nothing in the firmware reports neighbour IDs yet. |
| 3 | How many modules? | Plan and test for **2 to 4**. | Your brief says Dijkstra for N ≤ 4. |
| 4 | Wheel tool tips for a car? | **Modules only.** | Safer default. |
| 5 | Floor anchors and tilt | Anchors at x = 0, 250, 500, 750 mm on a line, yaw 0, tilt 0 (the brain's defaults). | These are the brain's defaults; you can edit them in the UI. |

## Milestones

- [x] **M0 audit**: see below.
- [x] M1 data model, connector rules (side↔side fixed), static checker, Check button
- [x] M2 topology enumerator, pose optimiser, 2-module gallery
- [x] M3 seed library with measured tags (static, and now MuJoCo too)
- [x] M4 verbs + roadmap planner (N ≤ 3): 3 demos plan; 2 pass MuJoCo, and MuJoCo rejects the tripod plan (see below)
- [x] M5 Python VERIFY service + rehearsal (CPU workers, not GPU — see below)
- [x] M6 intent (text → tags → ranking → plan), with an offline fallback
- [x] M7 executor in DRY_RUN with induced failures and replanning

## M0: audit

**Reused from v1:**
- module kinematics (`robotics/msrr/modulink.ts`), which matches the Studio module doc;
- the real-mesh drawing (`features/msrr/moduleMeshes.ts`, `moduleGeometry.moduleBodies`);
- the hand-placed module code path (`manualBuild.ts`), so any pose can be drawn;
- the animation player and the tests.

**Dropped for v2 (kept in the Legacy tab):**
- voxel fitting (`fitModules`, `skeleton`, `serpentine`);
- the cube-coverage beam search (`transform.ts`);
- the cube target shapes.

**Where the side↔side bug lives:** `modulink.weldTypeIsLegal` returns `true` for every pair. I changed it to "any pair is legal" during the try8 port. `connections.test.ts` and `modulink.test.ts` pin that wrong rule. `manualBuild` (the "By hand" tab) lets you choose any own connector, so it can build side↔side.

**Topology counts.** I measured these with a brute-force enumerator: connected graphs, end↔end or end↔side only, at most one lock per port, with duplicates removed under module relabelling and the module's own 180° symmetries.

| Modules | 1 lock | 2 locks | 3 locks | 4 locks | 5 locks | 6 locks |
|---|---|---|---|---|---|---|
| N = 2 | 2 | 9 | 9 | 9 | | |
| N = 3 | | 10 (trees) | 72 | 255 | 367 | 217 |
| N = 4 | | | 51 (trees) | 726 | (not run) | |

Trees (N − 1 locks) are what matter in practice. Extra locks close loops, which need the joint angles to close up exactly.

**The `C:\TETROBOT` sim:**
- `sim/multi_env.py` is a multi-module MuJoCo environment with spine receivers, magnets, servo sag and randomisation;
- `sim/gpu_multi_dock.py` runs docking on the GPU;
- `deploy/laptop_controller.py` and `walk_real.py` are the real controllers (DRY_RUN by default).

---

## Plain-language update (morning)

**What works now, and how I checked it.** Every number here came from a run or a test.

### M1: rules and the static checker
- Side↔side locks are refused everywhere (v1 too); tests pin it.
- The **Check** button in *MSRR Experiments → Planner v2 → Robot* gives pass/fail plus margins (torque %, CoG margin, joint margin), and draws the CoG, support polygon and contacts.
- Hand check: a straight module held horizontal at one end needs 2.46 N·m at B1 = 91% of stall, so it FAILs. The curled stand on a floor receiver PASSes at 24%.

### M2/M3: enumerator, optimiser, library
- Topology counts (N=2: 2 trees; N=3: 10; N=4: 51) are tested.
- Ten seed shapes, each pose found by the optimiser, with tags measured on that pose.
- **New: every shape is also held for 2 s in MuJoCo** (real contacts, ST3215 limits, PLA flex, backlash). The card shows "MuJoCo holds/fails".

| Shape | Static check | MuJoCo hold | MuJoCo detail |
|---|---|---|---|
| curled stand (1) | PASS | **holds** | sag 4 mm |
| inchworm (1, both ends in receivers) | PASS | **holds** | sag 0.3 mm |
| straight on floor (1) | PASS | **holds** | sag 5 mm |
| snake (2) | PASS | **holds** | sag 5 mm |
| T-stand (2) | PASS | **holds** | sag 15 mm |
| tripod seat (2) | PASS | **holds** | sag 25 mm, torque 27.5% |
| arch (1) | PASS | fails | settles 70 mm away from the planned pose |
| T on a standing module (2, anchored) | PASS | fails | sways about 60 mm: PLA flex at the standing module's base |
| loop (2) | PASS | fails | collapses 229 mm (re-optimised after the slot fix; still collapses) |
| L-stand (2) | PASS | fails | falls over |

**What MuJoCo taught the static checker (fixed):** a part touching the floor only on an edge was treated as a 40 mm square footprint, so curled shapes "stood" in TS but tipped in physics. Now the footprint spreads only along body axes that lie flat on the floor. The bridge tag now also needs 40 mm clearance underneath, so "straight on the floor" no longer counts as a bridge.

**Not fixed yet (honest):** the static checker treats modules as rigid. MuJoCo shows the PLA flex joints bending 3–5° under off-axis loads that the servos never see, for example a module hanging off a standing one. Shapes that rely on that are flagged by the MuJoCo verdict, and the Ask ranking puts them below shapes that held.

### M4: plans, played and rehearsed
| Demo | Plan (TS planner) | MuJoCo, 128 randomized robots |
|---|---|---|
| two modules standing in F0/F1 → T on a standing module | 4 steps: bend → dock end→side (82%) → peel out of receiver → pose. **79.6%**, 29 s robot time, worst torque 38% | **128/128** completed; dock end arrives 29.5 mm off on average (inside the controller's approach range); peak torque 63.9%; × measured dock/peel rates = **80.4%** |
| one module standing in F0 → curled stand | 2 steps: peel out → pose. **97.5%** | **128/128** completed; peak torque 23.9%. Standing free on its pad, it leans ~6° (top 69 mm off), but holds |
| two standing modules → tripod seat | 6 steps: bend → dock → peel F1 → **take the tripod shape while still anchored in F0** → peel F0 → settle. **77.6%**, 42 s. The anchored shaping move is at 69% torque, at the edge of the budget | **0/128**: in that anchored move a servo saturates (100% of stall); after the peel the robot falls (a spine ends ~273 mm from the plan). **MuJoCo rejects this plan**, so don't run it on hardware |

**How the tripod got a plan:** a free-standing robot can't roll onto other feet (no verb does that). So when peeling the last receiver would leave exactly the target's locks, the planner now takes the target shape *while still anchored*, and the peel lands it on the target's feet. The plan exists, but the shaping move is too close to the torque limit for real servos with PLA flex: that is item 2 below.

**A real planner bug MuJoCo found:** a lock that closes a loop was allowed to match its key in any of the 4 slots. So in the T plan, the module standing in F1 was silently turned 90° inside the receiver it never left. The animation would snap, and in MuJoCo the docking end was 360 mm / 90° off on every robot. Now a closure must match the lock's own slot (with a test). The same T plan went from 7 steps / 63.6% to 4 steps / 79.6%, and planning time from 35 to 7 min.

**Checked on the page:**
- Plan tab: Load → Play animates the 4 steps to the T. **Rehearse in MuJoCo** shows 128/128.
- Run tab: with "fail step 2" the dock shows FAILED (the true state has the lock open). The executor retries once, because the robot is exactly where the plan expected; if that fails too, it replans from the true state in the background.

### M5: VERIFY service (`C:\TETROBOT\simerify_service.py`)
- Start it with `py -3.12 C:\TETROBOT\simerify_service.py`. It serves http://127.0.0.1:8771.
- Endpoints:
  - `/check_static`: the **Check in MuJoCo** button on the Robot tab;
  - `/rehearse`: the **Rehearse in MuJoCo** button on the Plan tab;
  - `/measure_tags`.
- Frame match between Studio and MuJoCo: fitted over 9 poses × 12 points. All joint signs are +1; the worst error is 0.004 mm (`v2_calibrate.py`).
- Cross-check: curled stand on a receiver. TS static torque is 24% and MuJoCo is 25.8%.
- Locks are MuJoCo weld constraints. They switch on at dock (pulled in gently, then stiff) and off at peel. No hardcoded couplings.
- Randomized per robot:
  - mass ±8%;
  - servo gain ±20% and stall 85–100%;
  - friction ×0.7–1.4;
  - flex stiffness ×0.6–1.5 and backlash ×0–2;
  - floor tilt ≤ 1.5°.
- **128 robots in 11 s** on CPU worker processes (measured). That is fast enough, so I did not move it to the GPU.
- Bugs found and fixed while testing it:
  1. The module's base-mount play joints (from the anchored training rig) let a free module's root float.
  2. Lock welds were too soft, so a standing module leaned 6°.
  3. Module↔module welds had their two bodies swapped, which made the T shapes explode.
  4. Python's process pool crashes on Windows without a console.
- **Estimates (not measured), so treat them as such:**
  - a dock "reaches the controller" if the end arrives within 60 mm / 25° of the receiver;
  - a step "fails" if a part ends more than 60 mm from the plan.
  - The docking controller itself is not re-run in rehearsal; its measured success rates multiply in.

### M6: Ask tab
- Type what you want. The language model writes **only** a JSON tag list. Ollama is tried first, then Anthropic if a key is set in the desktop shell.
- The JSON is validated: unknown tags are dropped and reported.
- With no model, an offline keyword reader writes the same JSON. That is what ran in my test.
- The top 3 shapes are ranked by measured tags, margins and the MuJoCo verdict. **Plan to this** opens the Plan tab with that target.
- Checked in the browser: "make a bridge over a 25 cm gap" → `spans_gap_mm ≥ 250` → Arch.

### M7: Run tab (DRY_RUN)
- Each step is compiled to the module ESPs' `/api/batch` calls with **nominal** angles (180 = straight), matching your rule that each ESP adds its own offsets. Servo IDs: LOCK1=1, T1..T3=2..8, LOCK2=9.
- **You need to set:** the lock-rotor open/closed angles (180/225) are placeholders. I have not measured them.
- You choose which step numbers fail (or random failures at the measured rates). After a failure the executor takes the robot's TRUE state (the dock did not latch) and replans from there.
- Tests:
  - a failed dock is retried first;
  - if the retry fails too, it replans from the true state and reaches the goal;
  - it gives up after N replans.

### Also fixed on the page
- The MSRR panel used theme colours that don't exist, so in light theme text was dark on dark. It now uses the app's real theme tokens.
- The v1 "click the ground…" hint is hidden in v2.

### Tests
- v2: 20 tests (assembly slots, statics, topology, intent, executor).
- **Whole suite (`npm test`): 359/359 pass**, and the typecheck is clean (final run, nothing else using the CPU).

### What I'd do next (needs you or more time)
1. **Measure the lock rotor angles** (open/closed). The Run tab's commands use placeholders.
2. **Give the static checker the PLA flex, and a tighter torque budget for long anchored lifts.** MuJoCo shows 3–5° off-axis bending that the servos never feel; that is why the anchored T, the loop and the tripod plan fail in physics but pass in TS. Until then, rehearse every plan in MuJoCo before hardware.
3. **A "roll over" verb.** Without it a free-standing robot can never change which feet it stands on.
4. **Rebuild the 2-module gallery** under the new footprint rule (about 1 h of CPU). The current gallery was optimised before the fix and mostly fails both checks now.
5. **Measure the docking controller's approach range** (I assumed 60 mm / 25°).
