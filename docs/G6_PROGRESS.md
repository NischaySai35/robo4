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

### 26 Oct: FIRST SHAPE CHANGE (transformation) IN REAL PHYSICS: `C:\TETROBOT\sim\transform.py`
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
Recording for the Studio: `C:\TETROBOT\logs\transform_run_1.json` (25 fps, receivers + stage events). Shown in the Studio since 27 Oct (see below).
Note: floor-receiver bodies consume random draws in `PhysWorld._randomize`, so adding a receiver changes which random robot a seed gives.

### 27 Oct: GPU shape-change runner, planner, Studio (stopped mid-run by Nischay; resume here)
- **`gpu_world.py`**: phys_world's rules batched in MuJoCo Warp (welds only once seated, per robot via `eq_data`; welded connector contacts off via per-robot `geom_margin`; magnets, ST3215 servos, randomization). One 60 ms frame = one CUDA graph.
- **Measured speed (RTX 5050 laptop, full-detail 3-module world: 1,941 geoms, 126 DOF):** idle ~20 robot-s/s at 512 robots; mid-dock with noslip 3 = **1.3 robot-s/s**, noslip 0 = **13.2** (all earlier GPU runs used noslip 0, so it is the GPU default). Whole run average **15.6 robot-s/s**. That is about the same as the 16-thread CPU. **"Thousands of robots in 2 minutes" is not possible with this model on this GPU** (a shape change is ~100–150 s of robot time per robot).
- **`gpu_transform.py`** (brains in CPU workers, greenlets) + **`tf_plan.py`** (planner: shape A → B as undock / floor steps / dock with 5 → 2.5 cm stand-off fallback / 3 s gravity hold; `chain()` for A→B→C; one `execute()` for CPU and GPU) + `tf_run.py` (CPU, one robot, recording).
- **GPU result, W2 S8→S1 (`gpu_transform_g128.log`, 128 robots, 18 min cap):** 25 finished, **20/25 end-to-end**; 99 were still on the last dock at the cap, so this sample is biased toward fast robots. Stages: build A 23/25, unlock 22/23, floor step 20/22, final dock 20/20, hold 20/20. **An unbiased rerun (64 robots, 22 min, `TAG=g64`) was stopped before finishing: rerun it.**
- Floor step now gets 2 attempts, like every other dock (after a 1-attempt miss on robot 1, 8.7 mm).
- **CPU, planner:** W2_S8toS1 robot 1 OK; **chain A→B→C robot 1 OK** (W2 S8→S1 into R.S1A, then W1 S29→S22 back into R.S1B; each shape held, 0.1 mm). Recorded: `logs\tf_chain_ABC_1.json`.
- **Studio:** Shapes → Built in physics → **Transform: watch** (checked in the browser, screenshots: plays all 5 stages, captions "now: …", floor-receiver locks change when the foot steps). **Chain A→B→C: watch** button added; its endpoint (`/transform?name=chain_ABC&seed=1`) and screenshot are **not yet checked**. Receiver labels: sized to the text, placed on the floor outside each module (readable now). Studio tests 364/364.
- Next: rerun g64 for an unbiased number; GPU chain_ABC; check the chain in the browser; then items 4–6.

### 28 Oct: shape change 61/64 on the GPU; first BRIDGE in real physics
**New rule (Nischay):** nothing I run may take more than 120 s. Longer runs = commands for Nischay to run and watch.
- **GPU shape change W2 S8→S1, fair sample (`gpu_transform_g64b.log`, 64 random robots, all 64 finished): 61/64 end to end (95.3%).**
  - Stages: build A 62/64, unlock 62/62, floor step 61/62, final dock **61/61**, hold 61/61.
  - The fix that got there: spine stand-off **2.5 cm on both tries**. My "5 cm first, then 2.5 cm" plan gave a final dock of only **20/58** (`g64`): at 5 cm the arm stops ~78 mm short, and the retry lands pads on pads at ~9 mm. That matches the 26 Oct CPU finding.
  - Physics differences: GPU noslip 0 vs CPU noslip 3; CPU on transform.py was 14/16.
- **Chain A→B→C checked in the browser** (Studio: Chain A→B→C: watch): captions and floor-receiver locks follow the run.
- **Bridge lift fixed (item 4).** Two brain bugs, both in walk.py's peel/pull, that only show when the base sits in another module's SIDEWAYS spine receiver:
  1. **Frozen frame.** The pull fixed its targets in the base's frame once. The root bends when the hanging module's weight comes onto it, so the brain aimed 24 mm off: it estimated 25 mm out while the truth was 1.2 mm (`_bridge_trace.py`, `DEBUG_PULL=1`). Fix: `BASE_FOLLOW` re-expresses the targets from the base's current pose every frame (in the peel/pull, and in docks whose base is not a floor receiver). For floor bases nothing changes (the transform is the identity).
  2. **Timed pull.** The pull stopped after a fixed time even when the arm hadn't arrived. Fix: `PULL_CONVERGE` counts the hold only once the brain's own estimate is within 3 mm of the target.
  - Result: lift out 1.2 mm → 18.6 / 23 / 26 mm (robots 1–3); W1 then hangs from the root, still for 3 s, servos 57–60%.
  - **Walking must be re-checked with these on (GPU, run by Nischay; command in the chat).** Switch both off with `PULL_CONVERGE=0 BASE_FOLLOW=0`.
- **FIRST BRIDGE (`bridge_search.py`, `bridge_test.py`).** R upright at S15; W1 docks into R.S1B, lifts its foot, hangs from R and docks its End A into the spine receiver S1B of a second upright module U at S31.
  - **5/7 random robots** built and held the bridge (robots 1, 3, 4, 6, 7). Robots 2 and 5 failed the bridge dock and ended 300–400 mm away. Holds: 0.1–0.4 mm; servo peak 67–76% (**over the 70% budget on 3 of 5**).
  - The other 5 candidate placements failed: W1 runs into U's body (the brain has no obstacle avoidance).
  - Watched in the Studio (Bridge: watch, robot 3). **Honest look:** W1 ends up curled at mid-height between the two columns. It is a closed loop, not yet a flat top. Next: aim for the top receivers with a straighter W1.
- Process fix: `peel_after_dock` reads walk.py's source once per process (an edit during a run had leaked into running robots: 1 exception in g64).

### 28 Oct (later): LOOKING at runs; realistic room disturbances; high bridge = root buckles
- **`snap.py`**: renders the physics world from 3 cameras (oblique, low side, top) into one PNG, one colour per module (R red, W1 green, W2 yellow, X1 blue). Taken every 10 s of sim time, at every stage, and 150 ms after every bump. GPU runs too: `SNAP=dir` in `gpu_transform.py` copies robots 0 and 1 into a CPU world every 200 frames and renders them (`GPUWorld.to_cpu`).
- **High bridge (W1 from R's UPPER receiver S2A, 478 mm) → the root bends over.** The log only said "bridge dock failed"; the pictures show R (red) bending at its own joints (an inverted L by t=32 s, flat by t=60 s), dragging W1 down. Estimated load ~11 N × 0.3–0.4 m ≈ 3.5–4.5 N·m vs ~2.7 N·m usable servo torque. **A module cannot be hung from a single upright's upper receiver.** The low bridge (S1B) held, at 57–76% servo. Flat tops need two supports during the transfer (idea: U bends over and docks its top End B into W1's spine while W1 still stands on the floor, then W1 lifts its foot).
- **`bridge_search.py`** now compiles one world and moves U around: 95 s instead of > 2 min.
- **`disturb.py`: the real room (ALL ESTIMATES; `DISTURB=0` = off), in phys_world (CPU) and gpu_world (GPU, inside the CUDA graph):**
  - floor shake: Ornstein-Uhlenbeck, ~8 Hz, RMS 0.15 m/s² sideways / 0.10 m/s² vertical, ×0.3–2 per robot;
  - bumps: ~1 per 30 s, 1.5 m/s² ×0.5–2, 40 ms;
  - air drafts: wind σ 0.4 m/s, τ 3 s, quadratic drag on every link;
  - every magnet different: ±10% per side;
  - servo deadband: 0.1°; lost command packets: 1%;
  - **floor receivers now have their cardboard play** (tilt ±1.5° at 175 N·m/rad ×0.5–1.5, lift 0.5 mm; from train_v2.xml). Before this, phys_world's receivers were perfectly rigid.
- **Shape A with disturbances on (CPU): 7/7 random robots built (14/14 docks).** Hold movement 0.5–2.3 mm (0.2–0.4 mm without), servo peaks 46–52%, 0–3 bumps of up to 2.9 m/s² per run.
- **GPU with disturbances on:** first dock **31/32** (1 still going at the 1.4-min cap, 0 failed); 32 idle robot-s/s at 256 robots. Pictures of GPU robots match the CPU.
- All earlier numbers were measured WITHOUT these disturbances; the 95% shape change etc. must be re-measured with them (long run → command for Nischay).

### 28 Oct (evening): run in PIECES, a watchdog, and what the pictures caught
**Rule now: max 150 s per run, as short as possible.**
- **Checkpoints** (`PhysWorld.save/load`, exact state incl. welds, servo setpoints, disturbance + RNG state). `ckpt_build.py PAIR SEED OUT.pkl` builds shape A once (62 s wall), with every lock the plan will need. `tf_piece.py CKPT FIRST LAST OUT` runs only moves FIRST..LAST: load 1 s; a move 20–50 s.
- **`watchdog.py`** (on during every piece; pictures each time):
  - JAMMED: told to turn, doesn't turn, nothing travels → stop;
  - IDLE: nothing commanded, nothing moving for 8 s in an active stage → stop;
  - STUCK: joint > 10° off target, not moving, servo at its force limit → reported.
  - First version raised a false JAMMED on a lock rotor turning in place (fixed: real joint angles count).
- **chain A→B→C, robot 1, disturbances ON, in pieces:** build A ✔ → W2 undock ✔ → W2 step S8→S1 ✔ → W2 dock R.S1A (2.5 cm) ✔ → hold ✔ (shape B, 0.2 mm) → W1 undock ✔ → **W1 step S29→S22: stopped by the watchdog (IDLE)**.
- **What the pictures showed (the logs said "OK"):**
  1. "Stand up straight" after a peel does NOT always happen. After its floor step, W2 stayed folded (B2 −79°, B3 −68°, both servos at their force limit 88/92%). The next dock still worked from there.
  2. After unlocking from R's lower receiver, W1 stays sticking out **sideways** from its foot (B2 77° off, servo at its limit). It cannot lift itself, so in the floor step the brain waits forever for an arm that can't follow (watchdog IDLE after 8 s; without it: a 90 s timeout).
- **Lesson:** a module left lying sideways is too heavy for its own foot servos (estimate: 1.13 kg × 9.81 × ~0.2 m ≈ 2.2 N·m vs 2.0–2.7 N·m usable). Without the floor play and disturbances the same chain passed on 27 Oct, so the realism exposed it. **Next:** after a peel, lower the free end first (gravity helps) and stay compact inchworm-style; never "stand up" from sideways. And the brain must notice it cannot follow (lag persists with servos saturated) and choose another path instead of waiting.
- **Follow-up (checkpoint `chainABC_1_after4.pkl`, every try ≤ 50 s):** after the undock, W1 is an upside-down L (B2 86°). Its End B rests on the bottom edge of R's receiver S1B (contact −0.03 mm), servos at 70–89%.
  - "Lower the end first" → JAMMED (pushes down into the receiver edge).
  - "Slide 6 cm out along the receiver axis first" → IDLE: the brain waits for an arm that can't move.
  - **Conclusion:** a module whose foot is 0.42 m from the module it was docked into is too heavy for its own servos once it lets go (this robot: force limits 76–92% of nominal; cardboard play adds sag).
  - Ideas to test next:
    (a) the planner avoids undocking a module that will be left sideways: estimate the foot-servo torque from the pose and ask physics;
    (b) swing off sideways with the base twist T1, which costs no torque against gravity, then let it settle low;
    (c) the brain must notice "servos saturated + arm not following" and change plan instead of waiting (the watchdog shows where).

### 28 Oct (night): real meshes in pictures; magnets & connector angles checked; Transformations gallery
- **"Only 4 magnets on the side connector?" (Nischay's screenshot).** The physics has all 8 (4 on pad tops at 15.3 mm, 4 on gap floors at 6.3 mm, alternating N/S, as in the handoff/CAD). The snapshot drew the module bodies as the coarse collision boxes, and the 4 pad-top magnets sat inside the box. Fixed: pictures now use **the real CAD meshes** (`VISUAL_MESH=1`, visual only: no mass, no collision).
  - Placement is copied from the original CAD scene's compiled model; body frames identical, 0.0 mm / 0.0°.
  - Close-up `logs\snaps\closeup_R_S1B.png`: all 8 magnets visible on the real receiver ring; the docked end seated flush.
- **Connector geometry** (`v2_connector_check.py`, re-run): every end and side port 0.00 mm from its pad tip / gap floor, normals exact, side port x 45° from a pad (= at a gap), end port x at a pad. This is the try8 CAD export; if the Fusion design changed since, re-export.
- **Fidelity note:** the module-body collision boxes are much fatter than the real open-frame parts, so module-to-module bumps are detected early (conservative; possibly why some bridge placements "hit" U). Upgrade candidate: convex pieces of the real parts.
- **Pieces, recorded + stitched** (`ckpt_build.py`/`tf_piece.py` with `REC=25`, `stitch.py`): one continuous 98 s run of shape A → B, robot 2, **room disturbances ON**, all 5 stages OK (pieces of 50 / 84 / 25 s wall).
- **Brain:** `FOLLOW_CHECK` (walk.py) stops a move after 2 s of "arm > 6° from command and not moving" (the stuck step now fails in 16 s instead of 2 × 90 s). Normal steps/docks unaffected (re-run OK). A failed stand-up now RELAXES (holds where it is) instead of straining at the force limit.
- **Studio → Shapes → Transformations (watch):**
  - 2 modules: standing → T/brace (room on, robot 1);
  - 3 modules: A → B (room on, robot 2);
  - 3 modules: standing → T → gate (room off, robot 3; with the room on, robot 3's gate dock did not finish within the 140 s cap: W1 droops, R leans);
  - 3 modules: A → B → C (room off, 27 Oct; with the room on the second change fails: W1 left sideways).
  - Plus a "not possible yet, and why" line (snake, cube, flat top, sideways module).

### 28 Oct (late): out-of-the-box ideas; COOPERATIVE support works
Ideas written down before testing:
- **Flat top:** (1) share the load BEFORE letting go: a second column docks its top end into the bridging module's spine while that module still stands on its foot; (2) build the bridge low, then lift it with both columns together; (3) tripod: keep the bridging module's foot as a third leg.
- **Snake:** (4) a chain of end→side docks (the dock type that works, 19/19) instead of end↔end; (5) a stiff end↔end target (receiving end resting on the floor, or both ends moving toward each other).
- **Sideways module:** (6) a helper module holds it before it lets go; (7) unlock into a pose where gravity helps.

**Idea 1 tested (`coop.py`, robot 1, room ON, real meshes, pieces 75 s + 33 s):**
- build R + W1 (into R.S1B, foot on the floor) + X1 bending over and docking its End B into W1's spine S2B: **2/2 locked** (0.01 mm), hold 0.7 mm;
- W1 releases its floor foot and peels: foot up **11.8 mm** (the brain's own "clear" test wants > 12 mm, so it reports not-out);
- **the structure holds with W1's foot off the floor** (2.8 mm in 3 s). Max servo: R 30%, X1 58%, W1 81%.

So two columns carry the module that one column alone could not (R bent over under a single-column cantilever).

**Next:** (a) lift the foot higher (PEEL / LIFT for a closed loop: only the joints between W1's spine and its End A are free); (b) idea 4, a chain where each module's top end docks into the next module's spine (snake-like / caterpillar); (c) the GPU rate for the cooperative build.

### 28 Oct (night 2): Plan-tab preview fixed from Nischay's video
Nischay watched the Plan tab (kinematic preview, not physics) and found:
1. **Too fast:** pose moves played at 4× (`durationS / 4`) even at "Speed 1.0x". Now real time.
2. **Docks/undocks jumped** (`t < 0.5 ? before : expected`), and the bend before a dock went straight into the connector. Now `approach.ts` solves the docking module's joints so its end sits on the connector axis at 40/30/20/10/5/0 mm (Studio kinematics, damped least squares).
   - Dock: stand off 4 cm (31 mm of air above the 9 mm pads) turned 45° → turn in place → pause → straight in → lock.
   - Undock: unlock + pause → straight out 4 cm, and the next bend starts from there.
   - Bug found by the new test: the docking module is the one whose port is an END (`a` may be the end).
   - Test `approach.test.ts`: every demo-plan dock stands off 40 mm on the axis and stays < 3 mm from it all the way in.
3. **Constant speed:** each phase now uses a minimum-jerk S-curve (speed and acceleration start/end at 0); the straight-in is spread by distance. (Physics runs already had the ST3215 trapezoid, 6.1 rad/s², 45 rpm, plus inertia and gravity.)
4. "Where is real physics?" → buttons renamed "▶ Real physics (gravity)" / "▶ Real physics: run this plan"; the garbled `C:TETROBOTsim□erify_service.py` message fixed (`\v` was a control character).
5. **Real floor receivers** in the Studio: `floor_receiver.stl` (90 mm, pads 15.3 mm, gaps 6.3 mm at 45°, checked), yaw per receiver (pads at yaw ± 45°).
Checked in the browser (screenshots 4–25 s): stand-off with a gap at 7 s, going straight in at 14 s, foot straight up out of F0 at 25 s.

### 28 Oct (night 3): "it's all hardcoded?" — the Plan tab was a sketch; real-physics plan runs debugged with pictures
- **Honest correction:** the Plan tab's Play was always a kinematic SKETCH (no gravity, no magnets, rotor not drawn turning). Now labelled in red, the button reads "Play sketch (no physics)". Real physics: "▶ Real physics: run this plan" (MuJoCo + the docking brain), "▶ Real physics (gravity)", and Shapes → Transformations → Watch. Proof picture from a physics state: lock rotor at 45.0° (locked) vs 0° (`logs\snaps\rotor_proof.png`).
- **Plan undocks in physics** now use the robot's own peel + straight pull-out (`run_plan` called release + bend before).
- **The T demo plan in REAL physics, robot 1: the dock FAILS.** Debugged in ≤ 115 s pieces with pictures and measurements:
  1. Brain stuck after a retry (phase 0, no camera check, 42 s idle) → NEW: no progress for 21 s → give up the attempt (walk.py).
  2. Target receiver motion measured: only 2.8 mm (not a soft target). Magnets OFF: same drift (not the magnets).
  3. Off-axis error while going in: 1.2 mm at the stand-off → 4.6 mm at 15 mm → 6.3 mm at 10 mm → the pads hit the rim at 10 mm out and the end slides to 11 mm.
  4. NEW camera checks DURING the go-in (laptop_controller `MID_CHECK`, at 21 and 14 mm out) measure 2.2 / 5.3 mm off and correct, **but the arm does not respond**.
  5. **Root cause:** M1's B2 and B3 at 88°, 2° from their stops (servos only 2–31% loaded): no joint travel left to correct. The planner chose a dock pose at the joint limits (its own "joint margin 1.8°" chip).
  - **Fix in the planner:** pre-dock poses keep ≥ 15° of room (`DOCK_BEND_DEG` = 75°, `optimisePose bendLimitDeg`). The re-plan explores other docks (e.g. M2.S2B) but takes > 110 s → run "Plan" in the Studio (web worker), then "▶ Real physics: run this plan".
  - Also: TARGET_FOLLOW (re-aim at a target receiver on another module every frame) keeps the camera's twist correction.
- All brain changes are behind switches: `TARGET_FOLLOW`, `FOLLOW_CHECK` (also stops "no progress"), `MID_CHECK`, `PULL_CONVERGE`, `BASE_FOLLOW`. **Not yet re-measured on the GPU for walking** (long run → command for Nischay).

### 29 Oct: cooperative dock fix, chat in the Ask tab, the third-person camera (state at end of day)
- **T demo plan in real physics**: the failure was joints at their stops (M1 B2/B3 88°); with bends ≤ 75° (`DOCK_BEND_DEG`) docking into M2.S2B worked for robot 1 (0.23 mm, lock 44.96°, 27 s); 5 robots: **2/5**. Still too slow (>20 s) and the go-in error regrows to 3–5 mm after the mid checks.
- **Nischay's "good dock" rule:** locked + no bump + ~≤ 20 s robot time. Report every dock against it.
- **Watchdog COLLISION check** (module-to-module contact > 3 N, estimate): Nischay saw W2 hit R while lifting in the A→B recording. A replay with today's brain behaved differently (W2 jammed in its step); not yet located.
- **Ask tab is a chat**: full history to qwen3.5:9b, a plain-words `reply`, robot context, Send/Stop/Retry/New conversation; history in localStorage. **Not yet checked in the browser** (my test script clicked a disabled button).
- **End A = dark blue, End B = orange** in the Studio and in sim pictures.
- **Learned estimate correction ("glasses")**: data collector `sag_data.py` fixed after pictures showed (a) poses resting on the floor and (b) impossible receiver angles. Clean data: brain estimate error median 11.8 mm, 90% 25 mm. Too few poses (20) → not trained. Better: sample poses near real dock poses.
- **Camera (`camera.py`)**: third-person, fixed in the room. ArUco DICT_4X4_100, 18 mm tags ON the CAD housing (`marker_mounts.py`: ray-cast to the outer ring, squared to the module axis), 2 beside each floor receiver.
  - One camera: sideways < 1 px, but depth 40–180 mm wrong (single small tag).
  - **Two cameras** (`StereoRig`, 1920×1440, ~0.9 m apart): **0.84 mm median, 0.92 mm worst**; only ~4 tags seen by both.
  - 12 mm tags: unreadable at 1.5 m.
  - OpenCV upgraded to **5.0.0**.
  - **Camera = optional add-on** (Nischay): transformations must work without it; it can be switched on mid-transformation; the camera may shake.

### 29 Oct (session 2): the camera wired into the brain as an OPTIONAL add-on (TODO 1)
**`cam_judge.py` (CameraJudge)**: the brain's judge from the two PICTURES only. Physics truth renders the images and grades the answers; the judge never uses it.
- **Optional, switchable.** Off, or too little in view → `None`, and the brain runs exactly its encoders-only path (`walk.py` sets `C.judge` every frame from `judge_on()`). `on_at`/`off_at`/`.enabled` switch it at any moment; it takes effect at the next check.
- **How it measures.** Every corner of an end's tags, in both cameras, goes into one rigid-body fit (least squares on pixels). A tag that doesn't fit the others is dropped and the rest refitted.
- **Spine receiver as target.** It has no tags of its own: its module's nearest seen end (≤ 3 links) + that module's encoders on the nominal model.
- **Shaking/knocked camera.** Before each look each camera re-measures its own pose from the board tags (`ThirdPersonCamera.relocalize`). Board tags now sit on the BOARD (world), not on the receiver bodies, which tilt with the cardboard play and spoiled it.
- Pictures from the camera view at every look: `logs\snaps\camdock_*_NN_stage.png` (both cameras + a zoom on the connector; orange = end tip, blue = seat + axis).

What the measurements forced (all measured at the S2B hover/seat, robot 1):
1. **Pixel centre bug:** `K` had cx = W/2 (pixel edges); OpenCV uses pixel centres → a steady 0.5 px offset. Fixed (W/2 − 0.5). Triangulated tag centres are now 0.17–0.25 mm.
2. **One small tag gives position, not tilt.** 0.2 mm in position, but its tilt only to 3–6°. Times the ~46 mm lever to the pad tip, that is 4–7 mm at the tip (tip off 6.8 mm, twist off 5.4°).
3. **The model cannot supply the tilt either.** The real module sags: flex/backlash joints of up to 3° each. M1's top end is 12° / 72 mm off its nominal kinematics in this pose, so a model "prior" made it worse. Kept only as a weak 10° prior.
4. **Not enough tags visible.** 4 tags per end, and at 1920×1440 / 1.4 m tags facing more than ~50° away are not detected. Hardware options added: `TAGS_PER_END=8` (6 fit on the real CAD housing, at 0/45/90/180/270/315°) and `FLOOR_TAG_MM=35` (bigger paper tags on the board).

End tip vs receiver error (S2B checkpoint, 6 tags/end, 35 mm board tags):

| camera | 1920×1440 | 3840×2880 |
|---|---|---|
| still | 4.6 mm | **0.83 mm** (twist 0.09°) |
| shaking 2 mm | 8.5 mm | 2.1 mm |
| knocked, re-measured | 4.3 mm | 1.9 mm |
| knocked, NOT re-measured | 18 mm | 19.5 mm |

- **Decision: 4K-class cameras** (used `CAM_RES=3840x2160`, a real 16:9 4K webcam) at **1.0 m** (`CAM_DIST`). At 1.4 m the docking end was in one camera only; at 0.8 m the target end left the picture.
- **Found a cheat in the brain** (all earlier numbers had it). Without any camera it read the TRUE pose of its base receiver (cardboard tilt included) and of a target receiver on another module, every frame. New `phys_dock.ModelBelief`, switched by `BELIEF=model`: floor receivers from the board map; another module's receiver from that module's floor-locked end + its encoders on the nominal model. The camera judge uses the same code. The default is still the old behaviour.
- **`PUSH_DEEPER`** (controller, default on, only with a judge): the camera sees the end lined up (< 1.5 mm sideways) but short of the seat → go in deeper by the measured shortfall instead of backing off to the same depth. A looser version (accept 4.5 mm sideways when < 8 mm out) made robot 5 fail; reverted.

**S2B dock (`roomy_dock_S2B.json`, M1.B → M2.S2B), robots 1–5, pieces from `plan_ckpt.py` checkpoints, `cam_dock.py`:**
| brain sees… | encoders only | old truth judge (cheat) | camera |
|---|---|---|---|
| truth belief (old) | 0/5 locked (4–12 mm sideways, twist always +5…+8°) | 2/5 (35.7, 45.2 s) | 1/5 (16.3 s) |
| `BELIEF=model` (honest) | **0/5** | 1/5 (42.7 s) | **1/5 (robot 5: 23.7 s, no bump)** |
- Good docks (locked + no bump + ≤ 20 s): **0/5 in every mode.** Robot 5 with the camera is the closest (23.7 s, clean).
- **Robot 3, camera tests:** switched on mid-way (at 8 s): takes over at the next check, no lock. Knocked at 5 s: re-measured itself (median error 1.1 mm) → **locked** (33.6 s). Shaking: error median 1.6 mm, no lock.
- **Failures are mostly NOT the camera:**
  - (a) bumps during the swing: M1's lower spine scrapes M2 (3.3 N), robots 1, 3, 4 in every mode;
  - (b) after a correction the arm never settles at the new hover point (robots 2, 5 with the truth judge: "no progress 21 s");
  - (c) the end stops 7–9 mm short, lined up within 0.3 mm. With the honest belief the camera reads 2–4 mm sideways there (its target pose via M2's top end + 3 links of model is biased by that module's sag), so `PUSH_DEEPER` does not fire;
  - (d) robot 4 crashed in its bend move (4 s, before the dock).
- Tried: 2 tags on each spine-receiver ring (`RX_TAGS=1`, ray-cast to the real CAD, at 135°/315°). The one facing the cameras is ~57° off and partly behind the docking end: not detected. Off by default.
- **Run-to-run:** with the same code a run repeats exactly (robot 5: 23.7 s twice); any change to the code or noise stream changes individual robots. 5 robots is a weak sample → `cam_dock_batch.py` (command for Nischay).
- Also: W2's End A hits R's T1 housing (4.6 N) in the A→B dock R.S1A (`tf_piece.py AB_p1_2.pkl 2 2`): probably the W2→R bump Nischay saw (TODO 3).
- Refactors (one source each): `PhysWorld.rx_frame`, `phys_dock.end_rel` (also used by gpu_transform / gpu_multi_dock instead of their copies), `ModelBelief`; `run_plan(ckpt_before=…)` + `plan_ckpt.py`. A→B dock piece re-run after the refactor: OK.

## FLOOR CHAINS (new direction, 29 Oct, Nischay): no floor connectors, mostly blind
**Setup:** 2 modules end to end (1.36 m, 2.26 kg) or 3 (2.03 m, 3.39 kg), lying on the bare floor; no floor receivers. Make amazing shapes from there with floor pushing, skidding, retries, whole-body force/position and balance. **At most ONE external camera, at an unknown angle, often absent → master blind first, then blind + 1 camera.** The stereo/4K camera work and the S2B TODO below are parked for later.

**First measurements (`floor_chain.py`, `floor_moves.py`, robot 1, room disturbances on, ~5–10 s wall per piece):**
- **At rest:** the chain rests on its bulky end housings and a few ring parts, not along its length. Servos at 8–16% just lying.
- **Lying straight, every bend axis is vertical:** B4 ±60° swings the end sideways, it lifts nothing (End B stays at 37–39 mm), and the whole chain slides ~5 cm.
- **A twist joint on the floor rolls whichever side is easier.** M2 T2 = 90° rolled M1 instead, and the chain rolled back to the "bends sideways" lie by itself.
- **First a wide C on the floor (sideways bends), then twist + bend → it lifts:** M2's End B up to 216 mm. By accident (the body rolled under the move) M1's End A rose like a cobra head to 344 mm. Pictures: `logs\snaps\moves_fm_probe3_004.png` / `_008.png`.
- **Torque (estimate):** lifting a whole module as a stiff rod needs ~3.8 N·m vs ~2.7 usable. Lifting only an end segment is fine (servo 20–50% seen).

**The physics this exposes:**
1. The chain's ROLL about its own long axis is a free, cheap motion. It decides whether a bend lifts or swings, and it changes by itself under load.
2. Footprint first: a curved/planar footprint stops the roll; then twists choose which part lifts.
3. Weight limits: only short levers can be lifted; whole modules must be stood up by folding, levering on the floor, or rolling, never by brute force.

**Plan (each step = short pieces with pictures, physics decides, many random robots once it works):**
- **F1 Know the body:** a map of which pose families are statically stable and what each costs in servo torque. Which roll states are stable for a straight / C / S / L chain; how friction (0.3–0.8 randomized) changes slipping.
- **F2 Primitive skills (each its own piece, measured on many robots):**
  - roll by a chosen angle (twist waves along the chain);
  - lock the footprint (C/S on the floor);
  - cobra: raise one end vertical;
  - fold: bring two parts together;
  - lever: push off the floor to tip a part up;
  - inch / crawl: move on the floor (inchworm, rolling, lateral undulation).
  Each skill reports success, time and slip.
- **F3 First shapes from the 2-chain:**
  - cobra / periscope (one module upright on the other as a base);
  - arch / bridge standing on its two ends;
  - LOOP (End A docks into End B, no receivers: the floor and the body itself are the support; `loop_2m` in the Studio library);
  - L-stand (`l_stand_2m`);
  - tripod (`tripod_2m`: unlock, then the end goes into the spine).
- **F4 3-chain:** triangle (close the loop) → stand it up as a wheel and ROLL; tall column; 3-legged stand; split into pieces and re-join as a T / Y.
- **F5 Blind brain:** know the body's pose without a floor map. Joint encoders + servo load (ST3215 reports load) + "which parts touch the floor" from statics → floating-base estimate; roll from gravity torques on the servos. Retry when a skill slips. Planner = sequence of skills, each proven in physics on many random robots.
- **F6 + one camera:** a single camera at an unknown angle locates itself from the tags on the modules (no floor tags) and corrects the blind estimate. Optional: the shape must work without it.
- **F7 Studio:** watch every shape change (gallery), plan from the chat ("become a bridge").

**IMU (Nischay, 29 Oct: an MPU-6050 on each module).** Mounted on Spine2 (B3–B4), on the S2B-side frame bar beside the window (his blue plate).
- **Sim:** `phys_world` `IMU_POS` (−24, 80, −19) mm in Spine2's frame; a 16 × 21 × 3 mm board; MuJoCo accelerometer + gyro; switch `IMU=1` (default on).
- **Studio:** `moduleMeshes.ts` `IMU_BOARD`, merged into the Spine2 mesh. Studio tests 360/360. Close-up: `logs\snaps\imu_board_closeup.png`.
- **`imu.py`:** the MPU-6050 as the brain gets it. All of these are datasheet ESTIMATES:
  - ±2 g / ±250 °/s, 16 bit;
  - noise 2.7 mg / 0.033 °/s;
  - leftover offsets after calibration 5 mg / 0.3 °/s;
  - mounting error 1.5°.
  A complementary filter gives "up"; with the encoders on the nominal model, "up" in every body.
- **What it knows (`imu_check.py`, measured on lying, curled and raised poses):**
  - every end correctly called up / lying / down, "up" within 0.9–4.9° of the truth;
  - each module's roll within 1–2° (e.g. truth 144.6° vs brain 142.7°);
  - heading: NO (gyro drift 2.4–5° per 10 s, no magnetometer); position on the floor: NO.

**Cobra, the first shape from a lying chain (2 modules, blind).** In `floor_skills.py`, the Brain uses only encoders + IMU + the nominal model; truth is used only to score. What physics taught on the way:
1. A straight lying chain's bends all swing sideways or all lift, depending on its roll, and the roll changes by itself. The end-to-end lock leaves the two modules ~45° apart in roll.
2. Brute force can't lift a module (3.8 N·m needed vs ~2.7). **Tip first:** stand the tip up, then roll the pivot back joint by joint in 10 coordinated steps. The upright part stays vertical and its lever stays ≤ one spine (servos 20–66%).
3. **The base rolls over under the rising module** (a lying module is a line support). Fix: turn the base's junction twist until its bends are vertical, then curl it into a **C** on the floor. Ten variants compared in physics: C with a 15° lean back is best (base roll change ~2°); the Z I tried first fell.
- **Brain decisions from sensing:**
  - lift sign per joint = (axis × lever)·up from the IMU, 0 if the axis is vertical;
  - twist angle to make the base's bends vertical;
  - encoder check that the footprint really formed (else curl the other way);
  - the rise stops and holds the last good step if the pivot can't follow (encoder lag > 15°) or the base tips (IMU roll > 12°).
- **Result, robots 2–9 (room on):** **7/8 stood fully** (tip 572–582 mm, 7–17° from vertical, ~28 s robot time). Robot 7: its M1 B4 servo is too weak at the last pivot; the brain noticed and held a partial pose (294 mm).
- **Studio:** Shapes → Transformations → "lying chain → cobra" (`tf_cobra2_2.json`, robot 2). Checked in the browser: it plays, with the brain's decisions as captions.

**3 modules, "two heads" (M2 curls into a C, M1 and M3 both stand): NOT yet.**
- Robot 1: M3 stands (585 mm), M1 does not.
- The C never forms: curling the middle module drags the two 0.68 m arms sideways against floor friction, and M2's B4 / B1 stall at the force limit (watchdog STUCK/JAMMED, picture `skill_sk_2h_nb1_1_-60_003.png`).
- Tried: footprint first; a gentler ±45° C; a big C with M3 curling along; no B1. All blocked.
- **Next ideas:** the arms make their own feet first, or move along with the curl so nothing slides far; or a different base (M1 + M2 as the base, then M3 rises on it).

### 30 Oct: MANUAL tab in the Studio (Planner v2 → Manual): drive it by hand in live real physics
- **Backend `C:\TETROBOT\sim\manual.py`** (verify_service `/manual/start|step|cmd`):
  - a live session on its own thread, paced to real time;
  - it declares every possible lock up front; random robot and room disturbances on by default.
- **Commands:**
  - joints (servo targets);
  - lock: the rotors turn (end↔end both, end↔side only the end's); it becomes a weld only if really seated (gap < 0.8 mm, side < 1.5 mm, rotor > 40°), else the rotors go back;
  - unlock;
  - connect A+B: choose who docks (the end whose module holds on with its other end); pre-shape the whole locked group (least squares on the nominal model); then the robot's own docking brain.
- **Studio:**
  - `ManualTab.tsx`: module count 1–4; starts = lying chain / all lying / all standing / standing + lying free / standing + chain / library shapes;
  - joint sliders with command, actual and load;
  - lock list; Move / Lock / Connect modes; log;
  - `manualScenes.ts` (the setups, from the normal assembler); connector balls in the viewport (`MsrrCanvas.syncPorts`); hover menu `ManualPortMenu` (Lock with…, Unlock, Connect from here).
  - Camera and real-robot sync switches are shown but not active yet.
  - Checked in the browser (2-chain live), HTTP-tested: joints move at servo speed; a lock refused when not seated.
- **Connect, what physics showed:**
  - **Loop (2-chain, click both outer ends):**
    - The open-loop pre-shape is held back up to 20° by floor friction. Fixed with feedback: re-plan from the encoders + push each command past its shortfall (servo droop). Result: 1 mm from the stand-off (model).
    - The lying docker's hanging-arm sag estimate is wrong on the floor → `dock(sag=False)`. No swing to a fresh IK start.
    - A base that is an END↔END lock now takes its frame from the locked end itself.
    - **Still NOT locking:** blind it thinks it's seated while really 52 mm short. With the truth judge the estimate is 37 mm off, and the floppy lying ring slides when pushed.
    - Next: the IMU on Spine2 (2 joints from the docking end) to correct the estimate; push slower; both ends meet halfway.
  - **Standing M1 + lying M2, click M1.B + an M2 spine receiver:** NOT locking. The planned end pose is fine but the path goes through the floor (M1 stuck 27° short, bent away). Next: a collision-free bend path (real shapes), not just the end pose.
- **The physics service now starts with the Studio:** `studio/tools/vite-plugin-physics.cjs` (DEV only).
  - Starts `verify_service.py` with `npm run dev`; restarts it if it crashes; stops it with the dev server.
  - `PHYSICS_SERVICE=0` = off; leaves a service that was started by hand alone.
  - Checked: Vite restarted on the config change and the service came up (port 8771).
- **"Become a shape" buttons (Manual tab):** the robot's OWN skills, live in real physics (`manual.py` `skill` → `floor_skills.py`, blind brain).
  - Buttons: Cobra, Two heads, Ring (= connect M1.A + last B), Straighten.
  - Each is enabled only when the setup fits, otherwise it says what it needs.
  - Checked via HTTP (cobra DONE, robot 2: 582 mm, 7.3°, 28 s live) and in the browser (M1 rising live).
- **Session controls, ONE shared component in both tabs** (`ManualTab.tsx` `SessionBar` + `ShapeButtons`, shown in Manual and in Shapes → Transformations):
  - ⟲ Step back: the session records servo commands + locks; it plays the last action BACKWARDS in real physics, opening/closing locks again.
  - ⌂ Home: the whole session backwards. ⟳ Reset: the same start, instantly. Also ❚❚ Pause / ▶ Resume and Save / Restore state.
  - Gallery entries the robot can do live get "▶ Live": the same setup in a live session + the same skill.
  - Checked: cobra then Step back → all joints back within 1° of straight (16 s, physics); Live cobra from the Shapes tab in the browser.
- **Ring clicked while in the cobra → M2's end went INTO M1's End A (Nischay's screenshot).** Three causes:
  1. **Sim model gap:** connector geoms (contype 4 / conaffinity 6) collide only with connectors; housing boxes (1/3) only with boxes. So a connector passes through another module's housing. The proper fix is collision shapes from the real CAD (changes every earlier result): its own step.
  2. The ring pre-shape assumed a flat chain and planned through the standing module.
  3. The blind brain was ~100 mm off and has no obstacle avoidance.
  - Fixed now: Ring goes Home first (session played backwards) when the chain isn't flat; the pre-shape keeps different modules' bodies ≥ 8 cm apart.
  - Re-test (same robot): home → pre-shape 7 mm from the stand-off → a clean ring, no overlap. The blind dock still ends 13.5 mm short / 13.4 mm sideways: NOT locked yet.
- **UI:**
  - Every result and step of a live session now also goes into the bottom log.
  - The shared SessionBar shows "⏳ working: … — last step", in red on NOT / ERROR / failed.
  - The live view shows the newest physics frame (no buffer, so no "picture behind").
- **Ring, blind final dock (30 Oct): why it cannot lock yet, measured.**
  - **Touch judge** (`phys_dock.TouchJudge`, the Manual tab's blind default): feel the hole with the encoders (commanded vs measured depth).
    - On the rim → follow the chamfer's sideways push, else a spiral search (up to 10 tries, 108 s).
    - Reached the depth → probe 5 mm deeper: stops = on the floor = seated; free = it missed.
    - Robot 1: follow-the-push brought the shortfall from 10.7 to 5.5 mm. But the probe was stopped by the SIDE of M1's End A housing (truth 40 mm off) → false "seated", no lock (the weld correctly refused).
  - **Root cause (DOCK_DEBUG trace):** the blind estimate of the tip is **23–46 mm off** during the whole dock. The sag estimate on/off makes no difference.
  - The lying docker's PLA flex / gear-play joints are deflected **0.8–1.4°** by floor friction (M2: T1 twist flex −1.4°, B1 flex −0.9°, T3 play −0.8°) → 15–25 mm at a 0.6 m reach. Invisible to encoders, and in the floor plane, so the IMU's gravity can't see it either.
  - Conclusion: closing a lying ring blind needs the one-camera judge (the truth judge did correct it), or "touch calibration": deliberately touch the target housing from two sides to locate it. Next.
- **Connect, standing → lying side receiver:**
  - Bending + twisting at once put the end on the floor (T1 stuck 26°). Fixed: straighten + twist in the air first, then bend.
  - B2 then saturates holding the arm out: added a holding-torque cost (static inverse dynamics, < 60%) to the pre-shape.
  - Still 52–66 mm short and T1 stalls in the final dock: NOT locking yet.
- **Cosmos-reason2 as a live judge (measured):** 37 s to load, then **~2.3 s per new picture** (8 GB GPU), so not 1 Hz; every 2–3 s is possible. It called a fallen (flat) cobra "all modules standing upright": a slow second opinion only, never the judge.

**Not done yet (honest):** loop / closing the chain, arch, crawl / locomotion, 3-chain shapes, one-camera add-on, chat → shape. G6 is still far from done (roughly 35–40% now: the floor-chain work is new and real, but it is one shape on 2 modules).

## TODO (next session, in order)
0. **Floor chains plan above (F1 → F7) comes first.** The list below is parked.
1. ~~Camera as an optional add-on~~ **done as a measuring judge** (above). Open:
   - the target pose near the seat (2–4 mm bias via the module chain); idea: measure the docking end RELATIVE to the target module's end over many looks and learn the chain offset at the hover;
   - a third camera for coverage (fewer looks with only one camera seeing the end);
   - bigger sample (`cam_dock_batch.py`);
   - decide whether `BELIEF=model` becomes the default (it is the honest one).
2. Make docks fast (≤ 20 s): settle faster at the stand-off (2b above); fewer corrections; faster go-in where it is safe. Plus: the swing bump (M1 spine vs M2) needs an approach path that keeps the arm clear.
3. Find the W2→R collision in A→B with the collision watchdog; fix that motion (first lead: W2 End A vs R's T1 housing, 4.6 N, in the R.S1A dock).
4. Check the Ask chat in the browser (2-turn conversation with qwen).
5. Designer v1 (blocks + module count) + connect it to the chat.
6. Long runs for Nischay (GPU): walking re-check with the new brain switches (PULL_CONVERGE, BASE_FOLLOW, TARGET_FOLLOW, FOLLOW_CHECK, MID_CHECK) on vs off; shape change on 64 robots with disturbances. CPU, ~10 min: the S2B dock on 16 robots, encoders / camera / truth, honest belief:
   `cd C:\TETROBOT\sim` then `set MARKERS=1& set TAGS_PER_END=8& set FLOOR_TAG_MM=35& set CAM_RES=3840x2160& set BELIEF=model& py -3.12 cam_dock_batch.py C:\TETROBOT\logs\roomy_dock_S2B.json 1 M1.B F:F0 M2.S2B 16 off,cam,truth 8`
7. Later: "glasses" network (data around real dock poses), residual RL docking skill, a third camera if coverage is poor.
