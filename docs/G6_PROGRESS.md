# TETROBOT: progress to G6

This log continues `docs/TETROBOT_HANDOFF.md` (the handoff). The steps are the handoff's §16.1 list. Every number in it comes from a run, with its log named. If a number is a guess, it is marked "estimate".

Simulation and brain: `C:\TETROBOT` (sim\, deploy\, logs\). Planner and UI: `D:\robo4\studio` (msrr2 = the planner from `TRANSFORM_PLANNER_V2_PROGRESS.md`).

## THE 10-POINT LIST: G1 → G6 (the one I follow; statuses only from runs)

| # | Goal | What | Pass test | Status (26 Oct) |
|---|---|---|---|---|
| 1 | G1 | Walking: measure the judge-pacing change (handoff 16.1 #1) | first dock 90% < 40 s, docks ≥ 97% | **partly**: 90% within 30.6 s ✔; docks 96.6% ✘ (280/290, `gpu_walk_walk_judgepace`) |
| 2 | G1 | Walking: stand-ups < 3%, fix first-dock pad landings (16.1 #2) | stand-ups < 3%, first-dock fails < 2% | open: stand-ups 9.6%, first-dock fails 7% |
| 3 | G2 | Real-connector physics world (pads, fins, receivers, magnets, rotors; correct end↔end mating) | locks hold under gravity | **done**: `phys_world.py`; end↔end, end→spine and floor all hold, seated within 0.2–0.3 mm |
| 4 | G2 | Magnet-sign bug: confirm in `multi_env.py` / `gpu_multi_dock.py`, fix behind an env switch, re-measure walking + end→spine on the GPU | same or better than before on 128 robots | **done**: confirmed (seated gap 0.11 mm avg / 0.49 max → 0.00 / 0.01 on 8 CPU robots); GPU A/B 256 robots × 2.5 min: old 81/82 first docks, fixed **103/103**; `MAG_PULL_IN=1` is the default in all 6 files (backups in `simackup_magsign`) |
| 5 | G2 | The real docking controller does every dock (end→spine, end↔end with both rotors, spine→end), GPU-measured → `verbs.json` (16.1 #3, #4, #5) | ≥ 80% per connection type | **mostly**: `verbs.json` measured (floor 103/103, end→spine 19/19 after 2 fixed sim bugs); `phys_dock.py` runs the brain in the physics world (validated 3/4 on a GPU-proven task). **Open: end↔end** (0/3, soft target) |
| 6 | G3 | Robustness sweeps: payload, floor shake, tilt, magnet strength (16.1 #6) | success vs each factor | open |
| 7 | G4 | Batched (vectorised) docking brain on the GPU (16.1 #8) | ≥ 40 robot-s/s with brains | open (about 6–18 now) |
| 8 | G5 | Slopes and walls per angle (16.1 #7) | success per angle | open |
| 9 | G6 | Multi-module shapes built in real physics, then found by search (16.1 #9–11) | ≥ 70% full-shape success | **mostly**: 3-module **8/8** robots; grown 4-module 2/2; **6-module 3/4** (19/20 docks); growing search (`grow.py`) + physics trials find them by themselves. **First SHAPE CHANGE done**: shape A → shape B (`transform.py`) **14/16 randomized robots end-to-end** (14/15 where shape A built). Open: bigger/other shapes, end↔end (snake), more transformations |
| 10 | G6 | "Become a snake / chair / car": intent → shape → plan → physics → Studio; Cosmos camera judge; car/chair with 4–6 modules (16.1 #12–14) | end-to-end in sim | **partly**: words → qwen3.5 → tags → the physics-built shapes ranked by their sim-measured tags (height 725 mm, footprint 800–2000 cm², modules 4–6) → Build & watch in the Studio (works in the browser). Open: more shape types (tables/chairs need flat tops), snake (end↔end), Cosmos camera judge |

**Where we are: G6, point 9 mostly done (shapes up to 6 modules built in real physics); next point 10.** G2 is mostly done (end↔end open). G1 is mostly done.

## Old status board (handoff 16.1 numbering)


| # | Step (handoff §16.1) | Goal | Pass test | Status |
|---|---|---|---|---|
| 1 | Measure the judge-pacing change | G1 | first-dock p90 < 40 s, success ≥ 97% | **speed ✔ (p90 30.6 s), success 96.6% ✘ by 0.4 points** (same as before within noise) |
| 2 | Remove remaining stand-ups | G1 | stand-ups < 3% of walking steps | |
| 3 | End↔end with a stiff target | G2 | ≥ 80% on GPU, 96 worlds | sweep running: anchored partner folded so End B faces up (`target_stiffness.py`) |
| 4 | Side→end (partner docks into the walker's spine) | G2 | ≥ 80% | |
| 5 | Verb library file (verbs.json) | G2/G6 | the planner can ask "can M1.B reach M2.S3 from here?" | |
| 6 | Robustness sweeps (payload, shake, tilt, magnets) | G3 | curves per factor | |
| 7 | Slopes/walls | G5 | success per angle | |
| 8 | Batched controller on GPU | G4 | ≥ 40 robot-s/s with brains | |
| 9 | 3-module scene | G6 | two docks in a row ≥ 70% | |
| 10 | First shapes (scripted plans: snake, L, triangle) | G6 | ≥ 70% full-shape success | |
| 11 | Reconfiguration planner finds step 10's plans | G6 | finds them by itself | the planner exists (msrr2); it needs the verb library and a link to the GPU runs |
| 12 | Intent + shape library ("become a snake") | G6 | end-to-end in sim | the Ask tab exists (msrr2) |
| 13 | Car, chair | G6 | the shape holds its own weight in sim | |
| 14 | Studio integration | all | plan in Studio → runs in sim → runs on the robot | the MSRR page is on try8 (v2 tabs); brain\ synced to the newest code (26 Oct) |

## Log

### 26 Oct: takeover
- Read the handoff.
- Planner fix: end↔end success was 0.75 (an unmeasured placeholder from the v2 brief). The handoff measured **0/96** in all 3 setups, so it is now 0 and the planner skips any dock with no measured success.
- Step 1 launched: `gpu_walk.py 128 12`, TAG `walk_judgepace`, in a visible window.

### Step 1 result (`C:\TETROBOT\logs\gpu_walk_walk_judgepace.log`, 128 random robots, 12.2 min, time cap hit)
| | before (rotate2) | now | pass |
|---|---|---|---|
| first dock median / 90% | 20 s / 59 s | **13.4 s / 30.6 s** | ✔ (< 40 s) |
| docks OK | 215/221 = 97.3% | **280/290 = 96.6%** | ✘ (≥ 97%); the difference is within run-to-run noise |
| walking steps: stand-ups > 600 mm | 11% | 16/166 = 9.6% | step 2: < 3% |
| walking step median / 90% | — | 19.6 s / 31.0 s | |

**The failures.**
- 9 of the 10 are first docks from the straight standing start (9/124 = 7%; walking steps fail 1/166).
- Pattern: it goes in and stops 6.4–6.9 mm high, centred within 1 mm. The camera says "not seated, ~2 mm sideways" three times, then the robot gives up **without locking**. That is the safe outcome.
- Next: log the twist/tilt at the moment of the failed seat, to see whether pads land on pads because of slot or tilt error. This joins step 2.

**Brain sync.** `_to_robo4.py` copied the newest walk.py, laptop_controller.py, envs and models into `D:\robo4\brain` (with paths rewritten), so the Studio Walk tab gets the rotate swing, the lock-stall recovery and the judge pacing.

### 26 Oct: making the planner obey physics (your feedback: "transformations are good but not physics based")
You saw:
- a vertical module free on its pad falls with a touch;
- the T on a standing module falls.

The static checker treated modules as rigid, receivers as infinitely strong, and "standing" as "CoG inside the feet". Now, with numbers from the MuJoCo module (`physics_params.json`, `train_v2.xml`):

**Sag.** Every joint gives under its full 3-D moment:
- servo droop: 80 N·m/rad;
- gear slop: 0.2° bend, 0.5° twist;
- PLA flex across the joint: 39.4 (bend) / 59.2 (twist) N·m/rad, at most ±3°;
- the floor receiver tilts: 175 N·m/rad, ±1.5° play.

The checker computes the real pose, the real CoG, and how hard each bracket is used. A shape fails if a bracket would need more than its 3° or the receiver more than its play.

**Touch.**
- Free-standing: the push at the top that tips it over must be ≥ 2 N (estimate).
- Any shape: a 3 N push at the top must not make a servo slip (estimate).

**Shown on the page:**
- arrows with the newtons on every floor contact;
- the real CoG (orange);
- sag, "tips at", and bracket use in the report;
- a table of how far each joint can move from here before the robot stops being OK.

**Your two cases now fail, for the right reason:**
- vertical module free on its pad: tips at **0.3 N**;
- T plan, after the peel: M1's B1 bracket would need **3.7°** (limit 3°), and the hanging module sits 66 mm lower than drawn.

**Cross-check with MuJoCo** (T on a standing module): static sag **58 mm**, MuJoCo sag **70–85 mm**. The static check is still a bit optimistic, so MuJoCo stays the final judge.

**MuJoCo is more real too:**
- a module anchored by End A keeps the model's measured receiver play (it was a rigid weld);
- a 2 N touch test at the top in 4 directions: it must be back within 30 mm after 3 s.

| shape | MuJoCo with the touch |
|---|---|
| in a receiver | holds; gives 20 mm under the push |
| curled stand | falls |
| T on a standing module | collapses (100% servo) |
| T-stand, snake | hold |

**End↔end sweep (step 3).** An anchored partner folded into an S so its End B faces up is **not** a stiff target: in physics its end droops 40–49° from upright, with servos at 94% of stall. The next options to try are in handoff §14.1 (cooperative partner, compliant go-in, via a floor connector).

### 26 Oct: "just use physics" (your rule): the Gravity button, real connectors
- **My rules are gone as verdicts.** Sag, bracket bend, receiver play and tip push are now *estimates shown as warnings*. What stays:
  - your brief's limits: 70% servo torque budget, ±88.2° bends;
  - the connection rules: end↔end and end↔side yes, side↔side never, one lock per port.

  Physics decides the rest.
- **Gravity button** (MSRR → Planner v2, above the tabs): the robot on screen runs in MuJoCo.
  - Choose a *random robot* (the GPU runs' error ranges, any seed) or the nominal one.
  - *Gravity + plan* executes a plan the way the robot would.
- **`C:\TETROBOT\sim\phys_world.py`**: a physics world built from any Studio scene.
  - The module the GPU runs use: real pads, gaps, pockets, lips, rotor fins, the 4 spine receivers, PLA flex and backlash.
  - Floor receivers are real bodies at the anchors.
  - Magnets: 8 per connector, N/S.
  - The ST3215 servo model.
  - A lock = the docking end's rotor turned 45° (A one way, B the other). It is welded only after it physically seated (≤ 0.8 mm deep, ≤ 1.5 mm sideways, the GPU runs' test).
- **Connector geometry**, measured against the CAD (`v2_connector_check.py`):
  - Studio end port = pad tip with x at a pad; spine port = gap floor with x at a gap.
  - **End↔end was wrong**: tip on tip, pads on pads. Now each end's pad tips sit on the other's gap floor, 45° interleaved.
  - In physics, end↔end now **holds** under gravity: 0.19 mm, rotor at 45°.
- **Bugs found on the way:**
  1. **Magnet sign.** `multi_env.py` and `gpu_multi_dock.py` push along `sign(axial)`. When the faces touch and overlap 0.02 mm, that flips and shoves the end **out** with the full ~37 N. With it fixed, receivers seat at 0.00–0.27 mm instead of 0.16–0.46 mm. This may also explain the handoff's ~0.5 mm-high ends, lock-fin jams, and end↔end 0/96. **To verify in the GPU code next.**
  2. Collision filtering is also per body, not only per geom. After switching on end↔end contact, the body bits must follow, or the ends pass through each other.
- **T plan in real physics:** the bend move brings M1's end only to 10.8 mm high and 27.5 mm sideways of the spine receiver, so **the lock does not close**. A dock cannot be an open-loop joint target. **Next:** run the real docking controller (`laptop_controller.py` + `walk.py`, the 82% end→side brain) inside `phys_world` for every dock step.

### 26 Oct: G2 findings (GPU, short runs)
- **Magnet sign bug confirmed and fixed** (point 4). Seated ends sat up to 0.49 mm high (the handoff's "0.5 mm high, fins hit the lip"); now 0.00–0.01 mm. Walking first docks A/B: old 81/82, fixed **103/103**.
- **Second bug: the handoff's end↔end contact fix broke spine docks.**
  - Same 4 end→spine tasks as the handoff's 27/33: now **0 OK** (all stuck ~10 mm high), with the old magnets too.
  - With `END_END_CONTACT=0`: **9/9 OK**.
  - Cause: bits 6/7 made end connectors collide with module BODY collision boxes, so the docking pads hit the partner's coarse spine box around the receiver.
  - Fix: bits **4/6** (ends hit ends, receivers and floor; never module bodies), in `multi_env.py` and `phys_world.py`. Backup: `sim\backup_magsign\multi_env_before_ee46.py`.
- **Speed limit (relevant to "2-minute runs").** Two-module worlds run the docking brain on the CPU at ~6 robot-s/s in total. 128 worlds × 2.5 min finished **zero** docks; 16 worlds × 3 min finish most. Thousands of robots in 2 minutes needs the batched GPU brain (point 7).

### 26 Oct: verbs measured, first shapes built in real physics (points 5 + 9)
- **Verb library** (`C:\TETROBOT\sim\verbs.json` via `build_verbs.py`, synced to the planner config; GPU, random robots, fixed sim):
  - floor dock: **103/103** finished OK;
  - end→spine: **19/19** finished OK (2 runs; 13 of 32 started hit the time cap);
  - end↔end: **0/3**.
  - Planning values (ok+1)/(n+2): 0.99 / 0.952 / 0 (never seen to work → never planned).
- **End↔end is still 0.** The docking end stops 5.9–6.7 mm high on a lying partner whose End A is bent up. Pre-turning the receiving rotor (`END_PREROTATE=1`) did not help. Cause per the handoff: a soft target. Open (cooperative partner next).
- **My physics world is validated against the GPU environment:** the GPU-proven end→spine task (spot 26, yaw 315, srx1) rebuilt in `phys_world` + the real brain locked on **3/4** robots (0.00 mm).
- **Why the planner's T failed:** its geometry (partner bending "cooperatively" in the air) is not a feasible placement (handoff 14.4). Shapes must be built from feasible placements.
- **Shape search** (`shape_search.py`): trees of upright modules on the 33-receiver board. Each walker docks its End B into the root's spine at a reach2-good placement (4-fold board symmetry), with line of sight.
- **First multi-module shape built in REAL physics** (`shape_build.py`, best "star2": root at spot 15 + 2 walkers):
  - robot #1: **2/2 locked** (0.00 mm); under 3 s of gravity the ends moved 0.3 mm, servos ≤ 37%;
  - robot #2: 1/2 (one ran out of time 81 mm away).
- The first 4-walker star (before the line-of-sight rule) built 0/4: walkers reaching over each other. Hence the rule.

### 26 Oct: FIRST G6 SHAPE BUILT RELIABLY IN REAL PHYSICS
- **3-module shape** (shapes_v1 #2): an upright centre module in floor receiver spot 15; two walkers (spots 29 and 8) walk up and lock their End B into its spine receivers from opposite sides.
- Built by the robot's own docking brain in `phys_world` (magnets, rotors, ST3215 servos, PLA flex) on **8 random robots in parallel: 8/8 full shapes, 16/16 docks locked**. Each held under 3 s of gravity: ends moved 0.2–0.4 mm, servos 49–57%. ~2 min per robot, all 8 at once.
- The same idea with one walker only 14 cm from the centre: 4/8 robots (12/16 docks). That walker folds too tight and lands pads-on-pads; a retry does not help. **Rule learned from physics:** walkers stand ≥ 20 cm from the module they dock into (now in `shape_search.py`).
- 4–5-module shapes on this small board (receivers within ±30 cm) crowd: walkers hit each other (1/3, 1/4, 2/4). The static pre-filter (`shape_check.py`) proved unreliable in both directions, so **physics is the judge** (`_build_par.py SHAPE N` = build on N random robots at once).
- Watch any of them in the Studio: Shapes → Built in physics → Build & watch.

### 26 Oct: GROWING shapes (the G6 assembly algorithm)
- Crowding many walkers around one centre does not work on this board: 4-module star 16/24 docks even in the best order, 1/8 robots complete.
- **Grow instead** (`grow.py` + `_grow_test.py`): start from the reliable 3-module shape, then add one module at a time.
  1. Candidates = (free floor spot, yaw) × (a free spine receiver of ANY module already built).
  2. Filtered by the docking brain's own IK (hover reachable < 2 mm, twists < 150°) and static clearance.
  3. Then **physics decides**: rebuild + dock on random robots, in parallel.
- **Result, 4th module** (2 random robots each): 3 of 8 candidates built the whole **4-module shape 2/2**. Two of those dock into a *walker's* spine (a bent, locked module is a good receiver). The rest failed in physics.
- Running: 5- and 6-module shapes made by combining the good 4th-module docks (4 random robots each).
- **Combined grown shapes** (4 random robots each):
  - **6 modules: whole shape 3/4 robots, docks 19/20**, held under gravity (0.2–0.3 mm);
  - 5 modules: 2/4, docks 14/16.

  Saved in `C:\TETROBOT\logs\grown_shapes.json`. Watchable in the Studio: Shapes → Built in physics → *Grown shapes* → Build & watch (the 4-module one played on the page: 3/3 locked).

### 26 Oct: point 10 started: words → physics-built shapes
- Grown shapes now carry tags **measured in their physics run** (`_measure_grown.py`): height 725 mm; footprint 800 / 1600 / 2000 cm² for 4 / 5 / 6 modules; locked 3/3, 3/4, 5/5.
- Ask tab: qwen3.5:9b turns the request into tags; the **"Real shapes (built in physics)"** list ranks the grown shapes (closest first), each with Build & watch.
- Fixed a wrong fact in the language model's prompt: the module is ~0.68 m standing (handoff 4.1), not 0.45 m. The prompt now also gives the measured scale of what has been built (≤ 725 mm, ≤ 6 modules). Before: the model asked for 2.7 m; after: 730 mm.

### 26 Oct: Cosmos-Reason2 (local Ollama) as the camera judge
`cosmos_judge.py` renders a virtual camera in MuJoCo while the real docking brain docks End B into a floor receiver, and labels each picture with physics truth (seated = gap < 0.8 mm and side < 1.5 mm). `cosmos_fewshot.py` adds a labelled reference sheet (one image: A seated, B 7 mm up, C far above, D = query).

| setup | correct | says "seated" when NOT (would lock wrongly) |
|---|---|---|
| high oblique camera, zero-shot | 5/9 | 4 |
| low side-on camera, zero-shot | 2/9 | 5 |
| **low side-on camera + reference sheet** | **5/6** | **1** |
| high camera + reference sheet | 2/6 | 4 |

**Lesson for the real camera:** mount it low and side-on at the receiver, and give the model labelled reference photos. Even so it is **not safe alone** (a 7 mm gap was once called seated). Use it as a second opinion together with the lock servo's own feedback (lock-stall recovery), never as the only check before turning the lock. Small samples: more robots needed before quoting a rate.

### 26 Oct: bridge step 1 (needed for flat tops: tables/chairs)
- Test: in the reliable 3-module shape, walker W1 (End B locked into the root's spine) releases its floor lock and runs **walk.py's own peel + pull-out** (`phys_dock.peel_after_dock`, taken from `Walker.step_to`'s source so it stays identical).
- Result (2 robots): magnets released (0.0 N), but End A rose only **0.3–0.9 mm** of the 25 mm. Hanging is stable: servos 41–43%, nothing moves over 3 s.
- Suspect: the peel/lift frame assumes the base sits in an UP-facing floor receiver; here the base is the root's SIDEWAYS spine receiver. **Next:** debug that frame, then the second dock (End A into another upright's spine) for a bridge.

### 26 Oct: UNDOCK from a module's side (needed to change one shape into another)
- Test (`_undock_test.py`): in the built 3-module shape, W2 unlocks and runs walk.py's own peel + 25 mm pull-out, based on its floor end.
- **With flush magnets (as designed): it cannot get out**, only 1–2 mm (3/3 robots).
  - Not the brain: its estimate is right (1–2 mm), the servos are relaxed (≤ 27%), and the lock reads open (added a "lock must read open < 3° before pulling" check, the mirror of lock-stall recovery).
  - The cause is physical: ~37 N of magnets hold the end to the partner's spine receiver harder than the partner's servos + PLA hold that spine in place. The receiver is dragged along (~5 mm) and never separates.
  - A floor receiver can't move, so floor peels work (checked in my world: 21.9 mm out).
- **With +0.5 mm or +1.0 mm total extra magnet gap: the undock works**, 27 mm out. (Total gap between the pair; per connector it is half.)
- **Design question for you** (not changed in your CAD): deeper magnet pockets (see the table below for the exact amount). Checking now whether docking and holding still work with the recess (GPU end→spine running; walking next).
- **Magnet recess, measured** (all short runs, random robots):

| magnets | walking docks | end→spine docks | undock from a module's side |
|---|---|---|---|
| flush (current CAD) | 103/103 | 19/19 | **0/3** |
| +0.5 mm total gap (≈0.25 mm deeper per connector) | 101/101 | 11/11 | 5/8 |
| **+1.0 mm total gap (= 0.5 mm deeper per connector)** | **101/101** | **13/13** | **8/8** |

  **Recommendation (your decision, not changed in CAD): magnet pockets 0.5 mm deeper on EVERY connector** (two mating connectors → 1.0 mm total extra gap, which is what the sim's `MAG_RECESS_MM=1.0` adds once per magnet pair). Docking and walking stay as good, and a module can then leave another module's side, which shape *changing* needs. The sim tests it with `MAG_RECESS_MM=1.0` (now read by the GPU scripts too).

### 26 Oct: CORRECTION. The magnet strength was a guess; the recess recommendation is WITHDRAWN
- The sim's magnets were `MAG_F0 = 4.6 N` per pair (a catalogue figure, "0.47 kgf"), so **~37 N per connector**. **Never measured.**
- **Nischay, pulling two real connectors apart by hand: ~700–800 g ≈ 7.5 N total.** The sim was ~5× too strong.
- `tetro_env2.py` now has `MAG_SCALE` (one place, used by every env, GPU runner and phys_world). 0.204 = your measurement. Backup: `sim\backup_magsign\tetro_env2_before_magscale.py`.
- **With the real strength and FLUSH magnets (your current design): undock from a module's side 8/8.** The "stuck" result above was an artifact of the too-strong guessed magnets. **No pocket change needed.**
- Re-checking walking and end→spine docking with the real strength (GPU, running); the default becomes 0.204 if they pass.
- Lesson recorded: numbers that came from the earlier chat's guesses get checked against your measurements before I use them for design advice.

### 26 Oct: "why is it standing?" (your screenshot). What was wrong and what was fixed
- **The physics was right; the display was wrong.** The curled preset has End A **locked in floor receiver F0**, but the Studio never drew receivers or locks, so it looked like a bent module balancing on nothing. Proof run, same curled pose, 6 s of gravity:
  - locked: top 425 → 408 mm, stays up;
  - **free on its pad: 446 → 237 mm, falls over** (parts moved 611 mm).
- **Fixed:**
  1. floor receivers are always drawn, and a locked one gets a green ring + "F0 · LOCKED M1.A";
  2. built shapes and plan runs report their receivers too;
  3. **Gravity is live** (a physics session stepped one second ahead until "Gravity off"; no fixed clip);
  4. preset names say what holds the robot ("End A LOCKED in floor receiver F0").
- **Why I missed it:** I checked from the program's side (I knew the config had a lock), not from what is visible on screen. **Cosmos** was never connected to the Gravity view, and a picture cannot show a hidden lock anyway: physics + showing the locks is the fix.

### Where every simulation constant comes from (so none is presented as a fact again)
| constant | value | source | status |
|---|---|---|---|
| magnet pull | 0.94 N per pair, ~7.5 N per connector | **your hand measurement** (700–800 g) | measured (rough) |
| servo torque | 2.7 N·m usable (ST3215 at 11.1 V) | datasheet (handoff 4.1) | datasheet |
| servo stiffness kp | 80 N·m/rad | `physics_params.json`: "holds within ~2° up to stall" | assumption |
| PLA flex | 39–68 N·m/rad, ±3° | "tuned so tip error is 2–4° like the real module" (your observation) | tuned to your observation |
| gear backlash | 0.2° bend / 0.5° twist | `physics_params.json` says "guess, refine from video" | **guess** |
| receiver play | tilt 175 N·m/rad ±1.5°, lift 0.5 mm | `train_v2.xml` | **unmeasured** |
| friction | 0.4 (×0.7–1.4 random) | model default | **unmeasured** |
| module mass | 1.134 kg | your scale | measured |
| connector geometry | pads 9 mm, fins, lips | your CAD (Fusion boolean checks) | measured (CAD) |

Results that depend on the unmeasured rows (sag amounts, the exact servo %) are estimates until those are checked on the real robot.

### 26 Oct: FIRST SHAPE CHANGE (transformation) IN REAL PHYSICS: `C:\TETROBOT\sim	ransform.py`
Shape A = `shapes_v1[2]` (root R at spot 15 yaw 225; W1 spot 29 → R.S1B; W2 spot 8 → R.S2A). Shape B: W2 moves to spot 1 and docks into R.S1A.
Steps, all done by the robot's own brain against contact + magnets (MAG_SCALE 0.204):
1. W2 unlocks R.S2A, peels out (`peel_after_dock`) → **stands up straight** (all 7 joints 0, 3 s)
2. W2 End B docks into floor S1 (0.14 m step), End A peels out of S8 → stands up straight again
3. W2 End A docks into R.S1A with stand-off **2.5 cm** (`dock(..., hover_far=0.025)`; brain default 5 cm)
4. gravity 3 s: shape B must hold (ends move < 5 mm)
Two fixes found by physics on the way (not rules):
- the peel leaves T1/B3 (or B2/B3) **on their end stops**; the docking IK can't leave that branch → stuck 6 mm / 1.5° off the hover point forever (DIAG: joints 100 %). Standing up straight after each peel fixed it (robot 1: fail → OK).
- the 5 cm stand-off in front of R.S1A needs B2/B3 past their stops on weaker random robots (4/8 failed, gaps 1.1–9 mm). 2.5 cm: 7/7.
Also measured: a lone module walks floor→floor 0.14 / 0.28 / 0.30 m steps **10/10** (`_steplen_par.py`), so short steps are fine.
**Result (`_transform_par.py`):** seeds 1–8: 7/8 (robot 5 failed BUILDING shape A: W2's dock from 0.14 m, known-fragile placement); seeds 9–16: 7/8 (robot 12: final dock 8.6 mm off after 2 attempts). **Total 14/16 end-to-end; transformation stage 14/15.** Typical wall time 150–230 s per robot (CPU).
Recording for the Studio: `C:\TETROBOT\logs	ransform_run_1.json` (25 fps, receivers + stage events). **Not yet wired into the Studio.**
Note: floor-receiver bodies consume random draws in `PhysWorld._randomize`, so adding a receiver changes which random robot a seed gives.
