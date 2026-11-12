# TETROBOT — where we are (5 Nov 2026)

Handoff for the next chat. Read this first, then `docs/ARCHITECTURE.md`.
Work happens in `D:\robo4-restructure` (folders `sim\`, `data\`, `studio\`, `firmware\`, `gos\`). Nischay's terminal is PowerShell.

> **9 Nov 2026 (evening) — MuJoCo PINNED to 3.12.0, the exact set Isaac Sim 6.2 asks for (Nischay's call).** The same day's 4.0 upgrade
> broke Newton's MuJoCo solver inside Isaac (Newton 1.6.1 is built for mujoco-warp 3.12; Newton 1.7 wants 3.15, so no Newton fits 4.0).
> - System Python now: mujoco 3.12.0, mujoco-warp 3.12.0, warp-lang 1.17.0, numpy 2.3.1, newton 1.6.1, newton-usd-schemas 0.5.0;
>   mujoco-core / mujoco-studio (4.0-only add-ons) removed. Drifted packages also put back on Isaac's pins: usd-exchange 2.3.0,
>   usd-optimize 1.1.0, fsspec 2026.2.0, packaging 26.0, urllib3 2.7.0. `pip check` leaves only Isaac Lab 3.0 vs Isaac Sim 6.2
>   (urllib3, usd-exchange: NVIDIA's two packages disagree; nothing here imports isaaclab, Isaac Sim wins).
> - Checked on 3.12: GOS tests 83 pass, no warnings; 256 walking robots on GPU = 29 robot-s/s (4.0 gave 25); Newton engine runs in the
>   SYSTEM Python now (`tools/test_newton_engine.py` 0.00 mrad, `tools/bench/newton_module.py` same as 3 Nov) - no separate env needed.
> - `gos/python/pyproject.toml` pins `mujoco==3.12.0`, so reinstalling GOS cannot bring 4.0 back. Upgrade only together with a new Isaac Sim.
> - `nconmax` / `njmax` in `mjw.put_data` are per robot (world); `naconmax` is the total for all. `sim/gpu_bench.py` passes totals and runs out of GPU memory; use `gpu_walk_bench.py` instead.
> - The GPU has no noslip solver: every GPU script sets `noslip_iterations = 0` (as before).
> - Studio is unaffected (it uses Jolt, not MuJoCo).

> **9 Nov 2026 — ESP-TTL page is Studio's, for ALL modules; boards play in step (group play).** Not yet tried on the real robot or flashed.
> - Module bar on the page: modules the radio gateway (127.0.0.1:8790) names are added by `espPoll` (`addModules`); "+ Board" = typed IP / modN.local. The page shows the lowest online module unless one is clicked. One shared strip: `studio/src/features/servo/ModuleStrip.tsx` (also the Servos page).
> - The page no longer asks boards itself: telemetry comes from `espPoll` (one reader per board). Frames store `"module:servo"` keys (`jointKey`); old bare ids load as module 1.
> - Record / sliders / play / go / stop / torque / home on the Animation tab = every online module. Firmware tab: tick modules, updated one after another. "Stream from laptop" removed.
> - Group play: `sender.ts` uploads to every module with one `group=` number, asks the LOWEST module to play; it broadcasts GO (r4now type GRP=7) and all start together. Each board broadcasts its place 20/s; one ahead of the slowest slows its Sync clock (`sync.h peerS`), nobody starts the next frame before all finished (`firmware/esp32_multi/groupsync.h`). No deadlock: the slowest never waits, silent peer dropped after 400 ms, frame-end wait max 3 s. `test_group.cpp` (6 cases, fails without the sync) + test_sync/test_now/test_guard pass.
> - A module that did not hear GO is started over Wi-Fi after 400 ms and the message says so (modules must be on the same radio channel for GO).
> - The board's own web page (http://mod1.local, `webui.h`) STAYS in full — Nischay needs it (9 Nov). FW_VERSION stays 0.1.0.

---

## 1. The big goal

TETROBOT is a shape-changing modular robot. Each module has 7 joints (T1 B1 B2 T2 B3 B4 T3) and a lock at each end (L1, L2).
Modules dock to each other and to the floor to make shapes.

**Ultimate goal:** an AI model that docks and reshapes the real robot by itself.

The plan has 4 steps:
1. **Every connection works in the sim's ideal mode.** DIK + VSEPR docking does this. *(mostly done)*
2. **GPU teacher data.** The sim's docking brain, the "teacher", records thousands of dockings. *(started)*
3. **AI model.** First it copies the teacher (imitation, then DAgger), then it improves by itself with RL on the GPU / H100. *(started)*
4. **Real robot.** The ideal sim drives the real modules, using one optional camera, the encoders and the IMU. *(started: live Sync works)*

---

## 2. Done ✅

### Sim (step 1)
- [x] Ideal mode: joints follow commands exactly, locks are rigid, and the physics decides whether the robot stands or falls.
- [x] Cooperative docking (DIK + VSEPR spread): both groups bend to meet.
- [x] Fixed: coarse collision boxes were drawn in the wrong place (stand_tested ended up 224 mm sideways).
- [x] Fixed: chain3 docking froze 0.25 mm before locking (`IDEAL_LEAD` in manual.py).
- [x] Fixed: the docking maths relied on the robot's base floating free. `BaseHold` in dik.py, cost 2.
- [x] Bench: **58/60 locked** (it was 53/60) over the shorter tasks.
- [x] MPU-6050 placed in the sim from the try5 picture: position only, try8 unchanged. `IMU_RX` is a PLACEHOLDER, see section 3.
- [x] `imu.mount_from_gravity()` will find the chip's real turn from 2 still poses once it's wired.

### Teacher + AI (steps 2–3)
- [x] `teacher_dik.py` records teacher episodes on all CPU workers. Memory fixes: MuJoCo arena 64 MB (`ARENA_MB`), BLAS threads 1, numpy policy in the workers.
- [x] `teacher_bc.py` trains the model on CUDA (MLP 256-256-128) and exports `bc.npz` for the workers.
- [x] DAgger with mixing: the teacher drives half the time (`TEACHER_BETA` 0.5) and always does the last 3 cm. The model's step is capped.
- [x] Run `t1` finished (4 Nov 22:12):
  - the teacher alone locked **270/316 (85%)**;
  - DAgger rounds locked 149/419, but that total includes the early broken rounds;
  - a new model is saved at `data/teacher/t1/bc.npz`.

### Real robot (step 4)
- [x] **Live Sync** (`sim/real_sync.py`): the sim drives the real module. Fixes made 4–5 Nov:
  - `mod1.local` is looked up once and the address remembered (Windows Python took 2–8 s per lookup);
  - one rule for "offline": no good reply for 3 s, the same in the top bar and the Sync box;
  - "locked after power-on" is shown as such, not as "offline";
  - a new session always starts with Sync **OFF**;
  - a **Resume** button appears when it holds;
  - Sync ON only opens the SIM → ESP window, never closes it.
- [x] **Joint directions tested on mod1, and the same for EVERY module** (`data/real_robot.json`): T1, B2, T2, B4 and T3 are reversed; B1 and B3 are not.
- [x] Firmware homes: the board treats nominal 180 as each joint's saved manual home (`offsetFor` = home − 180). The sim's 0 means straight, which means home.
- [x] **Smooth motion.** Sliders, Straighten, Home and the shape buttons move at most 60°/s with a soft start and stop (`phys_world._comfort`, Studio sessions only). Docking runs without it, because with it on docking locked 0/14; with it paused during docking, 27/30.
- [x] The real servo speed is matched to how fast the sim moves (`speed_scale`), instead of full speed every tick.
- [x] **Sync works on EVERY tab.** On any page other than MSRR, the model's joints go to the physics service (`/sync/pose`, `real_sync.PoseSync`). They use the same robot link as MSRR: same directions, smooth speed, Wi-Fi tolerance, hold, E-STOP. There's one link per board, and whichever tab pressed Sync last is the one sending. The old browser-only sender (queueAngles → ServoController) is no longer used for Sync.
  - MSRR-only extras: sag/gear-play correction, random robot, room disturbances and air.
- [x] The battery chip always shows volts next to the %.
- [x] The joint sliders in the Manual tab follow the real command (before, they stuck where you last dragged them).

### Firmware (done by another chat; read before touching anything)
- Power-on is limp: laptop moves get a 423 refusal until **Turn torque ON** (or Go to manual home) is pressed on the module's web page.
- Each module keeps its own saved homes.
- The Wi-Fi radio sleeps while the robot stands still to stay cool, so replies can take 0.25–1.4 s.
- An overload guard (`firmware/esp32_multi/guard.h`) is being added.
- **FW_VERSION stays 0.1.0.**

### Realistic check (5 Nov, late) - NOT good enough yet
- Docking with ideal OFF (the brain steering a sagging robot): 1 of 4 finished runs locked (end_end); chain2 stuck 57 mm, standing 20-27 mm off.
- **Sync twin test** (`sim/sync_twin.py`): ideal sim docks, `RealSync` makes the corrected angles, a realistic twin plays them open-loop.
  **0 of 5 locked** (2-module tasks; ideal locked 5/5). Closest: end_end 6.8 mm gap / 1.5 mm side. Typical end: 8-65 mm off.
  - Seen in pictures: the end arrives ~1 cm off, hits the receiver rim, and the final push shoves it off.
  - The correction helps little (end_end with 9.2/7.6 mm, without 11.7/5.4 mm).
  - Lying chain2 is far off (49 mm): the ideal floor has 20 % friction, the real one full - the plan slides where the twin sticks.
  - The ideal run swings fast (joints up to 16 deg behind on the twin).
- Next: closed loop near the end (slow approach + feel/touch search, reuse phys_dock's blind 'touch' judge), then re-run the twin.

### Split view + honest numbers (5 Nov, evening)
- **SPLIT button** (MSRR view controls): left = ideal, right = `real_sync.Twin`, a realistic copy (random robot = the bar's seed, sag,
  gear play, room) that gets exactly what Sync sends a board, including the encoder trim from its own encoders. The ideal side waits
  for it, so both halves show the same moment at ~0.5x speed. The copy logs `REAL copy: LOCKED / NOT locked ...` for every lock.
  Files: `sim/real_sync.py` (Twin), `sim/manual.py` (`twin` command, step returns `twin_frames`), `state/msrrV2Store.ts` (split,
  twin, view2), `viewport/SceneManager.ts` (`split`: one scene drawn in two halves), `MsrrCanvas.tsx` (real copy parts, labels),
  `ViewControls.tsx` (SPLIT). Checked in the Studio with screenshots (Playwright, tools/ui_shot.py style).
- **Ideal side, Studio-style (wait 2-3.5 s, then connect): 11/14 locked** over the 7 two-module tasks. The bench's 58/60 always
  connected at time 0. A 1e-6 mm difference flips end_end M1.B->M2.B (0/2 now; stuck ~3 cm, 10 deg) - only M1 moves, the lying
  M2 is never used (free target groups are left out in coop_connect). stand_chain 1/2.
- Realistic copy: pads have ~0.25 mm room per side; the copy arrives 1.5 mm off at best and stalls 7 mm out (pads on the slot rim).
- Next: (1) make end_end robust (let the lying target's end joints help, or retry another posture); (2) feel/search near the seat
  driven by encoder + load (what the real robot has), so the copy (and the real robot) can find the slot.

### Live feedback + wait-for-real (5 Nov, night)
- `real_sync.Feedback`: each tick, real part poses (estimated) vs ideal -> joint correction (Correction's matrix), integrated slowly,
  only while the ideal joints are nearly still (FB_GAIN 0.12, FB_STILL 8 deg/s; 0.35 rang). Modes (env SYNC_FB): `robot` (default:
  encoders measured + IMU tilt of Spine2 measured + flex/gear play predicted), `truth` (the copy's exact parts = a perfect camera), `off`.
  With feedback on it replaces the slow encoder trim.
- `Manual._wait_real`: the ideal docking holds at the stand-off (2 mm, 8 s) and before locking (1 mm, 6 s) until the feedback says the
  real robot matches. No real robot / copy: no wait.
- Copy results, standing M1.B -> M2.S2B (ideal locks every time): feedback off MISSED (49 mm side), robot MISSED (157 mm),
  **truth LOCKED (side 0.41 mm)**. Lying chain2 with truth: the copy's modules are 340-455 mm from the ideal ones (they slide
  differently on the real floor) - joints cannot fix where a lying module lies.
- Meaning: encoders + IMU alone cannot see the errors that matter (random robot geometry, receiver play, M2 sag ~17 mm, floor
  sliding); a position measurement (the one camera) can. Lying shapes need the docking planned on the real state, not ideal+fix.
- Also fixed today: DIK.inside crash (drag / Straighten / Home), Straighten warns on a ring lock, SPLIT disabled before a session,
  split camera framed per half, MSRR plugs from the module document (connectorSnap.connectorWorldFrom), real floor
  (SceneManager.setRealFloor: MSRR + every page but the Editor, at height 0), board address fallback (espPoll / real_sync good_ip).

### Real vs sim errors, lock play, floor turn (5 Nov, late night)
- Split right half: with the real robot answering on Sync = the REAL robot rebuilt from its telemetry (`RealSync._rebuild`: encoder
  angles - predicted flex correction, posed on the rigid model; nothing simulated added: no room, randomness, motor model, floor
  friction). Without it = the sim copy (Twin). The copy stops being fed and the ideal stops waiting while the real robot answers.
- Lock-area play (Nischay: ~2.5 deg wobble at the tip, standing locked): `phys_world` adds 2 bend joints (x, z) at End A<->T1 and
  T3<->End B, range +-lock_play_deg/2, k lock_play_k (physics_params.json), +-30 % per random robot; '_flex' names = dropped in ideal,
  predicted by Correction. Measured: 0.3 N tip push swings 1.15 deg without, 3.8 deg with. Env LOCK_PLAY_DEG overrides.
- Labels: MSRR text sprites keep one screen size (sizeAttenuation off).
- Floor connectors turned instead of modules: plannerConfig.json floorAnchors yawDeg 0 -> -45 (standing modules now straight).
  **demo_plans.json must be rebuilt** (`cd studio; npx tsx scripts/build-v2-demo.ts`, several minutes) - until then
  approach.test.ts 'every dock in the demo plans' fails (stand-off for M1.B -> M2.S1A).

### UI fixes, drag, background copy (5 Nov, end)
- Connector hemispheres (domes) removed everywhere in MSRR; plugs show the connectors.
- Labels: screen-sized sprites must undo the MSRR root scale (x UNITS_PER_M) - they came out an "ant".
- Real floor: camera kept above it (maxPolarAngle + clamp in SceneManager.render).
- Split copy is built in the BACKGROUND (`twin` command answers at once; /manual/step sends `twin.starting/elapsed`, then
  `twin_init`); right half shows a spinner + bar. On a busy laptop it took 15-90 s.
- Tip drag: (1) grabs the END plug nearest the press (70 px), (2) pointerdown in capture phase + controls off - the orbit
  controls turned the camera with the mouse, (3) the dragged module is freed from DIK's "keep middle parts low",
  (4) DIK free-point target is FIXED IN THE ROOM (point_world) - anchor-frame targets swung when the anchor rolled, anchor-
  sliding targets ran away 1.4 m, (5) twist-first helper `Manual._drag_twist`, (6) no port menu during a drag.
  Backend: up 93/120 mm; Studio: end follows, slides more than it lifts when lying.
- Testing trick: a private service `VERIFY_PORT=8772 py -3.12 simerify_service.py` + Playwright `page.route` 8771->8772
  tests new Python code without touching Nischay's running service.

### Studio clean-up (7 Nov, evening)
- Planner v2: six tabs became three - **Live** (was Manual), **Build** (was Robot), **Goal** (Ask, Shapes, Plan, Run as four steps,
  one open at a time). Old tab ids still work through `setTab` (msrrV2Store `OldTab`); `goalStep` picks the open step.
- Live sessions are ALWAYS ideal (the "ideal robot" and "room disturbances" boxes are gone): every error lives in SPLIT's right half.
  Shapes > Live still runs a random-robot demo; the split's left label then says "SIM with errors", not IDEAL.
- One Stop: `gravityOff` closes a manual session (it only paused it - SPLIT stayed enabled over a dead session). On Live the bar
  has no Start/Stop of its own, only the real copy's random robot.
- Camera: `SceneManager.fitCamera({ fresh: true })` = 3/4 view, 30 deg up, 35 deg off square to the robot's long floor axis;
  MSRR calls it 0.8 s after a NEW setup appears (not on Reset). Looking down a lying chain made it look standing.
- **VSEPR moves the robot only in AUTOMATIC jobs** (Nischay 7 Nov): sim docking (coop_connect, Ring, teacher) and the Editor's
  connector snap (connectorSnap.computeMateBend). Not on hand moves: idle relax OFF (`VSEPR_IDLE` default 0; it rolled a fresh lying
  chain2 at up to 200 mm/s for a <=4 deg change every ~7 s and undid slider moves), MSRR tip drag DIK `spread = None` (drag: end
  rose 42 vs 45 mm of 80, side 29 vs 15 mm). The score (badge, logs) is only measured - stays everywhere.
- Flashing console every 20 s: the windowless bridge (pyw) ran `arp -a` (gos/hardware.py `find_modules`). Now Windows reads the
  ARP table in-process (`_arp_table_windows`, GetIpNetTable; same entries as `arp -a`). And robo4Net.cjs `supervise({ taken })`:
  while another bridge owns port 8790 it only knocks on the port (1 process in 35 s, was a new one every 10 s).

### Walls / ceilings, dynamic push, shape check (8 Nov)
- `surface_deg` in the scene (or env SURFACE_DEG): 0 floor, 90 wall, 180 ceiling. Only gravity turns (Manual.__init__); sag correction,
  magnets, IMU, split copy follow from physics. 'Stay low' rules are surface-relative (still right on a wall). IMU feedback drops the
  turn about GRAVITY (was world z). Ideal dock standing M1.B->M2.S1A: locked at 0 / 90 / 180 deg (12-15 s).
- Docking push, robot with errors: no fixed 0.6 mm press / 0.8 mm gate. To the nominal seat as before, then if the end stopped short
  the aim goes deeper each blocked tick while every servo is < 85 %; no deeper for 0.5 s -> try the lock (fins decide). Ideal unchanged
  (DOCK_PUSH=dynamic forces it for tests: same results). NOT yet run with errors (> 2 min per dock) - Nischay's commands.
- MuJoCo arena grows with modules (48 MB each, min 64): Two heads on 3 modules crashed (out of memory).
- Shapes in the IDEAL robot (what Live runs now): Ring 2 LOCKED, Straighten OK, Cobra NOT reached (rears to 378 mm, 49 deg lean -
  the ideal floor's 20 % friction lets the base slide; IDEAL_FRIC=1.0 blows the sim up), Two heads NOT reached (known).
- Two SEPARATE lying modules (Studio 'all separate, lying'): snake M1.B->M2.A / M2.B NOT (55 cm apart, no crawl before docking; M2
  curls on itself), T M1.B->M2.S2B NOT (stuck 14 mm side / 40 mm out). Docking only bends - nothing moves a module across the floor.
- **Ideal robot: REAL friction now** (manual.py: IDEAL_FRIC default 1.0, IDEAL_NOSLIP 0). With real friction the no-slip pass fought the
  exact joints (slow, then the sim blew up); without it all is stable and faster. Bench (ideal, Studio-style connect after 1 s):
  16/16 finished tasks LOCKED incl. end_end_tested B->B (was 0/2) and chain4; chain5 > 58 s (unknown). Cobra DONE (590 mm, 15 deg;
  was 49 deg lean at 20 %). Two heads: M3 up (578 mm), M1 not (was both down). Teacher data t1 / bc.npz were recorded at 20 % friction:
  re-record before trusting the model.
- Two SEPARATE lying modules with real friction: 53-73 cm apart at the end (at 20 % they slid closer). They need a floor gait first.
- manual.py's runner (`py -3.12 manual.py <scenes> <scene> A B`): one picture set + data/logs/<tag>.log per run, RESULT line at the end.
  Nischay's error-robot runs 8 Nov: only the last survived (pictures overwrote) - standing M1.B->M2.S1A NOT locked after 18 s.
- **Floor crawl (8 Nov)**, floor_skills `wave` / `crawl_to`: caterpillar wave on B1-B4 after `align(T2, horizontal)`, 25 deg, 2 s,
  quarter-wave lag. One lying module, 10 s: forward +236 mm (robot with errors +193), back -225, T2 +20 deg = sideways ROLL +944/-1284
  (errors +1218/-895). T2 -20 turns, but -59 vs +42 deg: unreliable, not used. A sideways roll leaves the bends sideways: crawl_to keeps
  rolling until they lift, stops within CRAWL_NEAR (0.10 m) only when lying right. `Manual._crawl_near` (coop_connect): separate
  groups, target > CRAWL_REACH (0.20 m) from the docking end, a single FREE lying module crawls to CRAWL_OUT (0.12 m) in front.
  lying2 M1.B->M2.S2B: crawl reached 86 mm, then docking curled the free M1 into a ring (570 mm) - NOT locked. Next: docking for a
  free lying docker (lift its end to the receiver; let the target's joints help). Positions = physics truth (real robot: camera).
- Surface sweep command for Nischay (error robot, 8 surfaces): see chat 8 Nov; results -> data/logs/surface_sweep.txt.
  Result (seed 1, standing M1.B->M2.S1A): LOCKED at 0, 45, 135, -45, -90, -135; NOT at 90 (36 mm off) and 180 (118 mm off).
  Seed 2: 90 LOCKED, 180 NOT. Ideal robot: 90 and 180 both LOCKED in ~7 s. So the ceiling fails only with real servos + errors.
  Seen in pictures (every 2-4 s): the ideal robot docks by holding M2's top half out sideways; real servos cannot (M2.B1 100 %,
  M2 fell back into M1's path); at 8 % bend share M2 only twisted, the short way, into its T1 stop (-169 deg) = stuck.
  Fixes (kept, 8 Nov):
  - dik.py 'up' = against the real gravity (VSEPR 'don't lift', 'let the body down', lift_ends used world +z).
  - dik.TorqueLimit: QP limit, servo torque after a move = measured now + d(gravity torque)/dq x move (moment of the side the
    joint holds, real gravity vector); each servo <= DIK_TORQUE (0.6) x strength. Off for the ideal robot (w.exact).
    Model vs servo torques checked: same sign, similar size.
  - manual.coop_connect: the target's bends free (share 1.0, was a fixed 0.08) - the torque limit decides how far.
  - (9 Nov) twists keep only 3 deg from their +-180 stop (DIK_TWIST_MARGIN; bends still 8): facing a receiver that points
    away needs ~180 and the 8-deg margin parked M2.T1 at its stop in all 8 failed runs of the 9 Nov sweep.
  Tried and dropped: 'target turns to face the docker' first (M1 folded to its stops, ideal floor/walls broke); the 8 Nov
  twist 'unwind' (9 Nov: ceiling seed 2 failed with it, locked without); the 2-cm 'come around' ramp (broke ideal chain3).
  Results: ceiling error robot seed 2 LOCKED (first time); seed 1 unwinds M2.T1 (-169 -> 168), straightened cleanly, final
  result needs a run > 120 s (Nischay). Ideal: floor, +-90, 180, chain3 all LOCKED after every change.
  Sweep 9 Nov (Nischay, before the 9 Nov fixes): 8/16 locked - seed 2: 0, 45, 90, -45, -90; seed 1: 0, 45. After the fixes
  (runs < 120 s): ceiling seed 2 LOCKED. Seed 1 at 135/-135/180 still NOT: M1 folds into a tight hook to reach M2's low side
  socket, its bends at +-87, M2 turned to 177, the end stays ~27 mm beside the socket. Next idea: let M2 bend to lift/tilt S1A.
  9 Nov afternoon: (a) servo load relief - a loaded servo's spare motion now LOWERS its load (TorqueLimit's gravity model,
  -d/dq of the share over DIK_RELIEF_FROM 0.4; DIK_RELIEF=down = the old 'let the body down', which swung M2's top half out at
  135 deg). Relieving every servo a little made both modules lie down in a heap on the floor -> only overloaded servos count.
  (b) closer stand-off: line-up stuck beside the receiver (closer than 40 mm, < 40 mm aside) -> line up at STANDOFF_NEAR 20 mm.
  Clean sweep (Nischay, before the 0.4 gate): 7/16 - seed 1: 45, 90 (new), -45; seed 2: 45, 90, 135 (new), -45. Floor (both
  seeds) and -90 seed 2 (rotor jammed at 5 deg) failed; with the gate -90 seed 2 LOCKS (rotor 42). Floor needs > 120 s runs.
  Watching: tools in the scratchpad (dock1.py EVERY=1.5 pictures + a contact sheet per run) - M2 still swings its top half
  sideways early (3 s) before settling; ceiling seed 1/2 still ~110-140 mm off (M2 folds into a V and tangles with M1).
  COOP_DEBUG=1 prints servo loads, =3 joint angles + steps; DIK_TQ_DEBUG prints model vs servo torque.

---

## 3. Yet to do ⏳

### Needs Nischay
- [ ] **Test the new code in Studio.** Restart `npm run dev` (Ctrl+C, then run it again) so the physics service loads it.
  - MSRR: start a 1-module session with **ideal** ticked, press SYNC, drag one slider slowly. Both the sim and the robot should move smoothly.
  - Any other tab (Editor, Animation, …): press SYNC, then move a joint. The robot should follow smoothly and turn the right way.
  - Check that SYNC off/on keeps the window open, and that volts show in the top bar.
- [ ] **Lock directions L1/L2.** Not tested yet (`locks_checked` is false, so an orange note shows). Test them, then set `lock_sign` and `locks_checked` in `data/real_robot.json`.
- [ ] **Which side connector the MPU sits near** → set `IMU_RX` in `sim/phys_world.py` (now `S2B`, a placeholder).
- [ ] **MPU → ESP32 wiring.** He will tell when it's done; then calibrate with `mount_from_gravity`.
- [ ] Run the model check (about 3 min):
  ```
  cd D:\robo4-restructure
  py -3.12 sim\teacher_bc.py t1 try 16
  ```
  and send the last line (`locked X/16`).

### Claude
- [ ] Step 1 leftovers:
  - chain4 / chain5 ring timeouts (teacher 11/19 and 8/18);
  - end_end M1.B→M2.B fails sometimes (the lock task oscillates);
  - stand_tested 11/18;
  - the 6-ring output.
- [ ] `body_up` shows a 45° error on one part in lying chain2 (lock rotor angle not passed?).
- [ ] Teacher: after `try`, either record more DAgger rounds or fix chain4/5 first. The model only learns from locked runs.
- [ ] Step 3: RL on the GPU (warp, thousands of robots, ~2 min runs) after imitation is good.
- [ ] Real-robot tuning: check the predicted flex / gear-play values against the encoders (`real_sync.Correction`).
- [ ] In tabs other than MSRR, the 3D model shows your drag exactly (it is your hand); only the robot is smoothed. If a button there jumps the model, the robot still glides, but the 3D view jumps. Smooth that view too if Nischay wants it.
- [ ] The packaged app (not `npm run dev`) has no physics service, so Sync there shows "physics service not answering".
- [ ] **Nothing from 3–5 Nov is committed.** Commit only when Nischay says "commit".

---

## 4. Key files

| what | file |
|---|---|
| ideal-mode world, servo model, smooth path | `sim/phys_world.py` (`_servo`, `_comfort`, `_exact`) |
| live manual session, docking, skills | `sim/manual.py` (`connect` pauses smoothing; `start` turns it on) |
| docking maths | `sim/dik.py` (BaseHold), VSEPR in `sim/vsepr.py` |
| real robot link, Sync for every tab | `sim/real_sync.py` (`ModuleLink`, `LINKS`, `RealSync`, `PoseSync`, `speed_scale`) |
| robot settings | `data/real_robot.json` (hosts, sign, lock_sign, signs_checked, locks_checked) |
| physics service (started by `npm run dev`) | `sim/verify_service.py` (`/manual/*`, `/sync/pose`) |
| teacher / model | `sim/teacher_dik.py`, `sim/teacher_bc.py`, data in `data/teacher/t1/` |
| IMU | `sim/imu.py` |
| Sync box | `studio/src/features/connection/SimTransmitPanel.tsx`, `poseSync.ts` |
| SYNC button | `studio/src/features/viewport-ui/ViewControls.tsx` |
| top-bar board status | `studio/src/features/servo/espPoll.ts` (same 3 s offline rule as real_sync) |
| Manual tab | `studio/src/features/msrr2/ManualTab.tsx` |
| firmware | `firmware/esp32_multi/esp32_multi.ino`, `guard.h` |

Servo IDs on every module: 1 L1, 2 T1, 3 B1, 4 B2, 5 T2, 6 B3, 7 B4, 8 T3, 9 L2. Nominal 180 = straight = saved home.

---

## 5. Commands

```
# Studio + physics service
cd D:\robo4-restructure\studio
npm run dev

# teacher recording (DAgger with the current model) - Nischay runs long ones himself
cd D:\robo4-restructure
py -3.12 sim\teacher_dik.py t1 <N> <workers> dagger

# train the model, then check it drives alone
py -3.12 sim\teacher_bc.py t1
py -3.12 sim\teacher_bc.py t1 try 16
```

---

## 6. Standing rules (from Nischay)

- **Never move a motor without asking.** Only read from the robot when testing.
- No commits, pushes, PRs or releases without asking.
- Runs of at most 120 s by Claude; longer runs are commands for Nischay.
- GPU by default for measuring; short runs.
- Reuse code, never duplicate: grep first, one shared component.
- Physics decides; only the connection rules and planning are hand-made.
- Blind first: at most one camera, often absent.
- No pogo pins in plans yet.
- Don't change try8 from the try5 picture; ask before losing anything important.
- Explain in simple words, with checklists.
- Verify in the real Studio (screenshots), not only in logs.

## Lock sliders in Manual (5 Nov)
- Manual > Joints now has L1 (End A) and L2 (End B) sliders, -45..+45 deg, 0 = open. The sim locks End A at -45, End B at +45.
- `manual.py joints` accepts L1/L2 (sets the lock rotor targets, tgt[7], tgt[8]); state() reports `lock: {target, q}` per module.
- With Sync on, the board gets 180 + lock_sign x angle (data/real_robot.json `lock_sign`, both +1, `locks_checked: false`).
- Nischay checks the real direction; if reversed, flip that `lock_sign` to -1 and set `locks_checked: true`.
- 5 Nov, Nischay's test: L1 direction right but open was 45 deg off; L2 open right but reversed. Fixed in data/real_robot.json:
  `lock_home {L1: 45}` and `lock_sign {L2: -1}`, applied in ONE helper `real_sync.lock_board_deg` (both senders).
  Board: L1 open 225 / locked 180; L2 open 180 / locked 135. `locks_checked` stays false until his re-test.

## Right half = the REAL robot only, while Sync is on (5 Nov, evening)
Nischay: the right half shook while his robot lay still, showed moves before the real robot made them, jumped 90 deg.
Causes found:
- the old rebuild posed the encoder angles on the IDEAL robot's base, so it moved when the ideal robot moved;
- a missed reply swapped the right half to the sim copy (another random robot) and back = the 90 deg jump / flicker;
- while that happened the ideal side slowed to the copy's 0.27x pace, so the real robot got slow commands too;
- encoder flicker and the live correction hunting under the encoder's 0.09 deg steps.
Fix (real_sync.py, manual.py):
- `Twin(mode='telemetry')` = the REAL robot's world: ideal physics (exact joints, gravity, floor, no randomness / room),
  joints = encoder angles (0.3 deg hold) minus predicted flex from THAT world's pose (Correction, smoothed 2 s).
  Lock rotors from their real readings. Built in the background when Sync is on with the split view (`_start_real_world`).
- While Sync is on, only the real board is a source (feedback, settled, picture). No contact = the last real pose stays,
  the box says "NO CONTACT for N s". The copy is used only while Sync is off. The lockstep wait applies only with Sync off.
- Feedback ignores errors under 0.8 mm on a real board (`SYNC_FB_DEAD_REAL_MM`), the copy keeps 0.3 mm.
- IMU and camera are optional: nothing needs them (ModuleLink has no imu; Feedback skips it).
Measured with a stand-in board (scratch real_world.py, 1 module lying): still 0.4-0.7 mm (was shaking), ideal bends but
real does not 0.9 mm (was 5.6 mm, and before that it followed the ideal), real B3 60 follows, silent board = frozen.

## Top bar online vs Sync box offline (5 Nov, late)
Cause: two askers on one small ESP: the Studio top bar (espPoll, ~8/s, 4 s timeout) and the service's ModuleLink
(telemetry + batch every 60 ms, 1.5 s timeout), plus the board's own web page tab. Measured from the laptop while both ran:
25/25 telemetry reads timed out at 1.5 s, many half-open sockets to the board.
Fix: ONE asker per board.
- `real_sync.boards_now()` + GET /boards on the service: each link's latest raw telemetry and its age.
- espPoll asks the service first; a board the service talks to is NOT asked again, same data and same 3 s rule = same
  online/offline in both places. No service -> direct as before.
- ModuleLink re-sends unchanged angles only every RESEND_S (0.5 s). Pretend board test (scratch fake_board.py): holding
  still 8 sends in 4 s (was 65), moving: every change sent.

### 9 Nov evening: sweep 4 (relief gate 0.4) + relief yield
- sweep 4: 7/16. Seed 2 6/8 (floor, ceiling, -90 now lock; only +-135 fail). Seed 1 1/8 (lost 45, 90, -45 vs sweep 3).
- My earlier "it locks" tests used dock1.py, which is NOT the sweep setup (keeps floor anchors, 1 s settle, judge on). manual.py's
  __main__ now takes EVERY=1 SHOTS=dir for pictures during the run: test with manual.py itself. Same seed + surface = same result (deterministic).
- seed 1 45/90: pictures show M2 folding over (socket down to its feet) while the relief keeps pushing; M1 stalls 9-27 mm aside.
  RELIEF_FROM 0 locks seed 1 45 and 90, but heaped the floor case; 0.2 / 0.1 flip case by case (fragile knob, not the fix).
- dik.py: RELIEF_YIELD (default on) - the relief steps aside while the goal is stuck, like VSEPR (vs_yield). seed 1 90 now LOCKS
  (seated 9.5 s, tidy arch). seed 1 45 still fails: M2 folds over DURING the reach, before any stall.
- next: the receiver (M2) should not fold its socket away while the docker reaches for it.

### 9 Nov night: 45 deg seed 1 taken apart (visible-window runs, real CAD pictures)
- sweep 5 (relief yield): 8/16 - best so far. Short command now: `cd sim; py -3.12 sweep.py` (4 at a time).
- BUG fixed (phys_world.py): VISUAL_MESH=1 ('pictures only') also sized DIK's coarse keep-out boxes from the picture meshes ->
  different DIK path (ideal 45: 54 mm off vs locked). Boxes now from physics geoms only. Verified: identical with/without.
- DIK_RX_HOLD (receiver frozen going in) stalled the IDEAL robot 21 mm out -> default off (1).
- Root cause of the early M2 flail: seed 1 on 45 deg, M2.B1 starts at 100 % (cannot hold the slope); TorqueLimit (60 % cap) then
  only allows load-lowering moves, and as T1 twists 'lower load' flips side -> M2 swings low, arches, stands up (pictures 2-6 s).
  DIK_PARTS=1 prints each rule's share per joint: the QP 'reach' part does it (+-34 deg/s), not VSEPR/relief.
- Ideal plans, real follows: IDEAL=1 + COOP_SAVE_POSE=f.json saves the ideal's lined-up pose; COOP_PLAN=f.json drives the real
  robot into it first (drive_to), live DIK finishes. 45 seed 1: no flail, SEATS (gap 0.0 mm) - but rotor jams at 4 deg.
- Rotor jam: LOCK_DEBUG=1 lists rotor contacts: fin 0.16 mm into M2_srx0 pad1 side. RESEAT (back out 2 mm, centre to 0.4 mm) and
  LOCK_WIGGLE (0.6 deg circle on the 3 end joints) did not move the end (stays 0.73 mm). LOCK_PLAY_DEG=0 -> LOCKED (rotor 43 deg)
  at side 0.68 mm: the cause is the 2.5 deg PLA lock-area play (end tilted at its play limit), not the side offset.
- new options in manual.py __main__: EVERY, SHOTS, FOCUS (close-ups), IDEAL. Next: lock with play - square the end before the
  rotor turns (press/tilt compensation from real_sync's play model), then the ideal-plan approach on all 16.

### 9 Nov late: the lock on the REAL printed shapes - Isaac Sim 6.2 + Newton (sim/isaac_lock_test.py)
- Why: MuJoCo collides meshes as convex hulls, so connectors were hand-made boxes (fins without chamfers, the side socket a solid
  disc - the print is an open ring). Newton (inside Isaac Sim, never its own viewer) collides the exact STL through an SDF.
- Setup: Spine1 (fixed) + End B (slide along its axis) + lock rotor (hinge), each its brain/meshes STL, NewtonSDFCollisionAPI
  (0.5 mm voxels), start = the ideal MuJoCo seated pose (scratchpad mj_lock_pose.py). Headless; pictures per phase (RTX).
- Pitfalls found (all in the script's comments): Newton ext not loaded headless (enable it); solver chosen by a scene schema
  (NewtonXpbdSceneAPI) - Newton 1.6.1's MuJoCo solver needs mujoco-warp 3.12 (the project pins exactly that since 9 Nov evening); contact_margin default 1 cm;
  physics steps only via SimulationManager.step; Articulation dof readback stays 0 (measure from body poses); XPBD drives act as
  hard position targets (ignore max force) -> magnet/pull forces + the ST3215 lock servo applied as forces/torques; rotor needs
  the gearbox inertia (0.012) or the servo loop bangs stop to stop; rotor surface subdivided (0.6 mm) for vertex-vs-SDF contact.
- 9 Nov evening, SOLVER=mujoco (Newton's MuJoCo solver on GPU, possible since the 3.12 pin) PASSES the same test: seated -0.02 mm,
  rotor 45.0 deg, locked 30 N pull 0.25 mm, open pull comes out (pictures mjgpu_*). This is the solver for the whole module (it has
  joint-space gearbox inertia = armature, like the MuJoCo sim). Four traps, all fixed in isaac_lock_test.py:
  1. Newton contact list (1000) < MuJoCo nconmax -> every step's contacts dropped: CollisionConfig(rigid_contact_max=NCON).
  2. USD DriveAPI with 0 gains = a brake capped at maxForce (End B coasted at 0.6 m/s) -> no drives; forces applied by the script.
  3. Newton defaults: USD joint stops = 100 N/m rubber band, slide armature 0.1, newton:damping read PER DEGREE ->
     mjc:solreflimit (0.02, 1), newton:armature 0 on the rig slide, damping * pi/180.
  4. CONTACT_KE 1e7/KD 1e3 (XPBD tuning) -> solref 2 ms, damping ratio 0.16 = ringing, blew End B out and through the spine ->
     mjc:solref (0.004, 1) + mjc:solimp (0.95 0.99 0.0005 0.5 2) per collision mesh = the MuJoCo sim's PLA contact.
  Startup ~165 s is the SDF build (no collisions: 12 s).
- 10 Nov: the WHOLE MODULE on the real STLs - sim/isaac_module.py (shared setup now in sim/isaac_newton.py: World, Servos; the lock test
  uses it too and reproduces its numbers exactly). Bodies/masses/inertias/joints/armature/damping/friction/servo gains read from
  multi_train.xml; only the shapes differ. Lying flat, servos hold, then B4 to 60 deg: holds within 0.02 deg, B4 59.9 deg, no part-on-part
  contact, on the floor only End A + End B + middle ring (= the CAD: housings 3 mm up, rotors 9.5 mm up). Startup 19 s (1 mm voxels).
  vs MuJoCo PhysWorld, same moves: same angles; mean hold load B2 0.39/0.49, B3 0.61/0.70, B4 0.10/0.13 N.m (Isaac/MuJoCo).
  MuJoCo's boxes put all three housings ON the floor (CAD: 3 mm above) - the support point differs, hence the ~20% load gap.
  Newton's contact list holds NEAR pairs too: World.contacts(poses) counts only real gaps <= 0.2 mm.
  Watch: cd D:\robo4-restructure\sim; py -3.12 isaac_module.py --gui
- 10 Nov, later: the Isaac module now has the REAL robot's give (REAL=1 default, REAL=0 = ideal rigid):
  - ST3215 model = ONE copy now: tetro_env2.st3215_sag / st3215_slew / st3215_limit (phys_world._servo and multi_env._servo use it;
    both checked BIT-IDENTICAL before/after with a fixed-seed run). Isaac's Servos uses the same: setpoint slew 4.3 rad/s at 11.1 V,
    6.1 rad/s^2, torque cap falls with speed + battery sag, 0.1 deg deadband, every 5 ms.
  - sideways PLA flex = real spring joints (mjc:stiffness 59.2 twist / 39.4 bend, +-3 deg), stacked with the servo hinge; Newton
    merges them into one 3-axis joint per servo (read back: correct springs on correct axes).
  - gear play (+-0.2 bend/lock, +-0.5 twist) and the in-line flex (67.6) act along the servo axis: Newton cannot stack two hinges
    about ONE axis, so they live in the servo law (no push until the play is taken up; servo + bracket springs in series).
  Result (lift B4 60): play shows (+-0.2 deg at rest), B4 lags 3.7 deg while lifting then 59.7, Spine1 now also rests on the floor.
- FOUND, not fixed: multi_env.MultiEnv (10 older check scripts + gpu_multi_dock) is ~unusable on CPU since the 31 Oct CAD boxes:
  13,309 contacts, one mj_step 3.3 s with noslip 3 (0.2 s without). phys_world (docking) is unaffected (fast).
- 10 Nov: MAGNETS = 3.5 N per connector everywhere (Nischay): tetro_env2.MAG_PER_CONNECTOR_N (one setting; MAG_SCALE=0.204 = old 7.5 N).
  The pull law is ONE copy too: tetro_env2.connector_pull (phys_world._magnets uses it, bit-identical; multi_env keeps its old variant).
- 10 Nov: sim/isaac_twin.py = THE REAL ROBOT IN ISAAC, driven exactly like the real modules. Brain = manual.Manual (ideal); sender =
  real_sync.RealSync (its flex correction + feedback); robot = Isaac (exact shapes, servos, flex, play, magnets, floor receivers as the
  printed STL); virtual boards = real_sync.step_sent / speed_scale / sim_deg_from_board, encoders = servo shaft (no play, no flex).
  Lockstep on the simulated clock (Isaac ~28x slower than real time with 2 modules: 25 s sim = 12 min). Module builder =
  isaac_module.read_module / module_poses / add_module; shared Isaac pieces = isaac_newton (World, Servos, Magnets).
  py -3.12 isaac_twin.py ..\data\teacher\scenes.json standing M1.B M2.S1A   (pictures + log: data/logs/isaac_twin; REAL=0 = no give)
  FIRST RESULT (standing, M1.B -> M2.S1A, real give): brain LOCKED; Isaac NOT docked - End B 23.5 mm short, 6.7 mm off-centre,
  tilted 6.6 deg, the rotor turned 45 deg in the air. At the stand-off the end was 7.4 mm off (brain waited 8 s, feedback said ~4 mm,
  went on). Going in it landed on the socket's ring and the PLA flex took it: encoders cannot see flex, so the brain never knew.
  Control run REAL=0 (exact shapes, no give) separates "the give" from "the shapes" - see below.
  ALL RUNS (standing, M1.B -> M2.S1A, 3.5 N magnets; logs + pictures data/logs/isaac_twin/):
  - real give, blind (encoders + predicted flex): NOT docked - 23.5 mm short, 6.7 off, tilt 6.6 deg; nothing touching End B.
  - REAL=0: NOT a fair control - RealSync always adds its flex correction; with no flex it over-bends (32 mm off).
  - real give + IMU on Spine2 (Feedback's IMU tilt, real_sync.mpu_reading): NOT docked (23.0 short, 5.8 off) - barely helps.
  - real give + SYNC_FB=truth (exact part poses = a perfect camera): DOCKED + LOCKED - 0.22 mm, 0.05 mm off, tilt 0.3,
    rotor 44.9 deg on the socket lips. The lock on the real shapes works once the end is where the plan says.
  Diagnosis (isaac_vs_brain_mm per part): bases exact (0.3 mm, 0.45 deg); the error grows along the chain (Spine2 ~6, End B ~9 mm
  at the stand-off) = sideways PLA flex + gear play that encoders cannot see. Every blind run: at GO-IN End B suddenly tips
  (0.8 -> 6.6 deg) and hangs 23 mm short TOUCHING NOTHING. Cause (best explanation): Correction predicts flex from the IDEAL world's
  loads; when the ideal End B seats and is magnet-held by M2, the ideal module is suddenly supported -> the predicted flex (and its
  compensation) drops, while the real end is still free -> it sags by the uncompensated flex. Truth feedback sees and fixes it.
  Also: M2.B1_bend held 2.56 N.m (cap 2.7) docked - near stall.
  BLIND FIX (10 Nov), two changes, both in the real-robot path (so they act on the REAL robot too):
  1. real_sync.Correction._unfelt (UNFELT=1 default): pushes and magnet pulls from ANOTHER module are left out of the flex
     prediction until the two are locked (the ideal End B touching made T1's compensation jump 1.0 -> 3.5 deg = ~20 mm droop).
     phys_world._magnets keeps the cross-module pulls in w.xmag for it (physics bit-identical).
  2. real_sync.begin_push / end_push (PUSH_MM 12, PUSH_RAMP_S 1.0): once the ideal end is seated, the REAL end is told to go 12 mm
     further INTO the socket, straight along its axis with its tilt unchanged (End B rows of the part-motion matrix, B3/B4 do it);
     chamfers + magnets centre it, contact takes the rest; ramped out after the lock. manual.coop_connect calls both around lock().
  RESULT blind (encoders + IMU, no camera): DOCKED + LOCKED - 0.28 mm, 0.11 mm off, tilt 0.4 deg, rotor 44.9 on the lips, stays
  seated after the push eases and the support counts (twin_standing_M1B_M2S1A_blindpush). Fix 1 alone: 8 mm short, then drooped.
  NEXT: more cases (other surfaces/seeds/sockets) blind; then the HANDHELD camera (any angle, moving): End B measured RELATIVE to
  the target socket in the same picture (the camera's own pose cancels), fed to Feedback as the docking end's estimate.
  Marker layout data copied from C:\TETROBOT\logs\markers (mounts*.json, 29 Oct, same try8 CAD) to data/logs/markers.
- 10 Nov evening, test suite work (isaac_twin.py rewritten: several cases, surfaces by turning the case, one GPU read per step):
  - FIXED (affected EVERY earlier Isaac run): app.update() while the timeline plays steps the physics WITHOUT our servo / magnet
    forces - 20 renderer warm-up frames = 0.33 s of limp servos, plus 1/60 s per picture (replicator step advances the timeline).
    World.play() now pauses the timeline (our SimulationManager.step still steps); pictures use delta_time=0. Module test re-checked.
  - LIMIT: several cases in ONE Isaac world interfere physically (one shared solve). 3+ cases: seated ends sank 6.7 mm before any
    move; 2 cases (flat + slope): the slope case blew up after the sender started and its parts hit the flat case. NOT thread races
    (brains taking turns did not help). Alone every case is stable -> sim/twin_suite.py runs ONE case per Isaac run, results in
    data/logs/isaac_twin/suite_<plan>.txt. (Cause still unknown - look at it before trying parallel cases again.)
  - REAL finding: on a 45 deg slope a straight standing module needs 2.43 of the ST3215's 2.7 N.m at B1 (tip sags 144 mm before the
    sender corrects it); sticking out of a wall it would need ~3.5 N.m. The ideal brain plans with 50 kg.cm servos and cannot see
    it - on slopes / walls the PLANNER must pick poses the real servos can hold (gravity torque < ~2 N.m with margin).
  - plan: data/teacher/twin_suite1.json = flat S1A, slope 45, wall 90, flat S2B, end-end M1.B->M2.A, chain2 cobra (no rigid
    connectors), stand_lying M1.B->M2.S1A, ceiling 180.
  - SUITE 1 (blind, no wiggle): 0 of 8 docked in Isaac. flat S1A jammed 8.5 mm short (End B 2.3 deg tilted on the socket lip);
    slope 45 / wall 90 servo-limited (M1.B1 / T1 at 2.5-2.6 N.m, 150 mm off); flat S2B 39 mm short; end-end + stand_lying: the
    BRAIN itself failed (crawl, below); cobra: Isaac blew up at start (below); ceiling: brain locked, Isaac 18 mm short.
  - Torque need along the ideal plan (real load model, scratch torque_need.py): peak M1.B1 1.93 (flat) / 2.35 (45) / 2.46 (90) /
    1.89 (180) N.m. Firmware ceiling 70 % = 1.9 N.m -> slope / wall plans are infeasible on the real robot: planner needs a limit.
  - PUSH + WIGGLE (real_sync PUSH_WIGGLE_DEG, default 0): 0.8 deg, 1.5 Hz on the docking end's 3 joints after the push ramp ->
    flat S1A blind DOCKED + LOCKED (+0.27 mm, 0.12 off, tilt 0.4, rotor 44.9). The earlier 'blindpush' success had been helped by
    the hidden limp shaking at every picture (fixed above) - jiggling a key into a lock is what the real robot needs too.
    BUT a rerun (same settings + DIK torque limit + picture fix) caught on the lip at ~8 mm and the rotor then turned UNSEATED and
    pushed End B out to 20 mm: 1 of 2 = luck at the lip, not a method. Blind feedback read 4 mm in both runs (cannot tell seated
    from jammed). NEXT: feel the seat blind (encoder depth after the push vs where the seat is) -> back off, wiggle, push again;
    never turn the rotor until the depth says seated.
  - Blind depth (RealSync.seat_depth, logged as DEPTH in the twin): encoders (+ predicted flex) read ~0 mm while the end hung
    10.5 mm out on the ring's RIM, ~6 mm aside (pictures) - the servos reach their angles, the PLA bends. Depth is NOT sensable
    blind this way. SPIRAL SEARCH (real_sync PUSH_SPIRAL_MM=7, 0.6 Hz, full size after 5 s) while pushing: side 6 -> 0 mm, slid
    in -> DOCKED + LOCKED (+0.25 mm, 0.09 off, rotor 44.9; twin_spiral7). Seated only 0.3 s before the rotor turned, so the seat
    wait is now SEAT_WAIT_S (default 12 s, was 6). No-IMU run (IMU=0) next.
  - SUITE 2 (data/teacher/twin_suite2.json; spiral 7 mm DEFAULT now, seat wait 12 s; per-case "env" / "start_deg"):
    flat S1A DOCKED + LOCKED (+0.26); flat S1A with REAL_IMU=0 (no IMU on the robot) DOCKED + LOCKED (+0.26) - the IMU is an
    extra, not needed; flat S2B NOT (38.6 mm): at the stand-off End B was 8-12 mm aside (feedback said < 4) - more than the 7 mm
    spiral; S2B is on M2's upper half (more unseen sag). Fix options: wider/adaptive spiral, better flex model for the TARGET.
    (IMU switch renamed: REAL_IMU = the robot's sensor; 'IMU' also removed the brain world's simulated MPU -> crash.)
  - Reach map (scratch reach_map.py, brain only): standing M1 into lying M2's S1A at 0.30-0.65 m, 4 headings: 1 of 32 docks. A
    lying module's side rings stand on edge - EVERY socket faces sideways at 37 mm height; plugging in sideways that low needs M1
    almost flat on the floor. NEEDED: the target twists T2 90 deg so a socket faces UP (cooperative planner, 'help the partner').
    _crawl_near now: standing docker -> crawl only if the socket is beyond STAND_REACH (0.45 m) of its foot (was 20 cm of the tip).
  - SPEED (11 Nov, Nischay: "verification needs 2 min, not hours"): one case was ~700 s for 27 s of robot time = 19 ms/step.
    Measured, not guessed (PROFILE=1): physics GPU ~15 ms of it = the BOX floor (Newton mesh-vs-convex: ~400k triangle pairs per
    step per case; 3+ cases overflowed its 1M buffer -> contacts dropped -> bases sank 6.3 mm = the old "cases interfere").
    Fixes: flat cases stand on one PLANE (isaac_twin PLANE_FLOOR=1), Newton state read directly (World.fast_poses, checked = Isaac's
    own read), servo maths batched (Servos._angles_v; module test identical), only receivers in use (USED_RX). -> ~5.3 ms/step,
    flat S1A whole run 322 s (was ~700), still DOCKED + LOCKED (+0.25).
  - LIMIT (Newton 1.6 in Isaac 6.2): several robot pairs in ONE scene lose the mesh (SDF) contacts - 3 pairs at once from the start
    (no warning; not pair count, buffers, voxel size, spacing or contact capacity - all tested), 2 pairs under docking load (End A
    locks let go, both modules fell). Separate Newton worlds (World(worlds=N), begin_world per case) make NO mesh-mesh contacts at
    all. So: ONE pair per Isaac run; twin_suite.py runs PAR runs side by side (~2.4 GB RAM each; PAR=2 fits this laptop).
  - SLOPE 45 taken apart with SHORT runs (STOP_AT, FB_DEBUG=1 prints estimate vs Isaac truth per part, CMD = ideal/fix/droop/fb):
    - start: straight on a 45 slope both B1 at 2.43 N.m (at the limit). Upright start (case "start_deg" B1 +45) = brain peak 1.17.
      Still jammed 7 mm out, 11 deg tilt: so not strength.
    - the target M2's Spine1 (carries S1A) is really 11-15 deg off (estimate 11.8 vs true 11.4 - the blind estimate is GOOD here).
      Cause: Correction (flex compensation) cancels the predicted SIDEWAYS bracket give (~6 deg at Spine1) with a T1 -12 / T2 +10
      counter-twist (clipped +-8): fine for End B / Spine2 (3.6 mm left), but it TURNS Spine1 - 6 deg of sag becomes 12 deg. No
      joint below Spine1 can undo its sideways give; weighting Spine1 x30 still leaves 5.6 deg. Damping changes nothing.
    - tried, all OPT-IN (env) because none helped yet and FB_GOAL broke the flat dock: PUSH_TILT_GAIN / PUSH_SIDE_GAIN (untilt /
      centre on the estimate while pushing: the estimate gets biased once in contact - truth stayed 10 mm / 3 deg off),
      PUSH_FREEZE_FB, FB_GOAL (feedback aims at ideal + the push), FB_REAL_MOVING (hold feedback while encoders move), FOLLOW
      (dock to the estimated real socket: tilt better 2-5 deg, but 13-19 mm aside and the estimate went wrong).
    - LESSON: every blind loop is only as good as the flex estimate, and it degrades away from the ideal pose / in contact. Next:
      (1) Correction with ROLE weights (target: socket part; docker: End) instead of all parts equal; (2) the handheld camera for
      the last cm; (3) maybe a wider socket lead-in (hardware, ask Nischay).
  - Flat S1A regression after all of the above (defaults): DOCKED + LOCKED (+0.26).
  - ROLE_W (Correction + Feedback weight the target's socket part / the docker's end): slope M2 Spine1 13.2 -> 7.4 deg TRUE, the
    estimate then matches truth (7.3 vs 6.8 tilt); slope 45 up-start jams 5.5 mm out at 6.5 deg (was 7 mm / 11 deg); + FOLLOW=1:
    4.7 mm / 6.2 deg. BUT ROLE_W=10 broke flat S1A (+15.9 mm) -> opt-in (default 1 = identical to before). The slope needs the
    last ~6 deg of the socket's own sag handled - next idea: the docker's approach direction tilted by the estimated socket tilt
    BEFORE contact (brain-side, DIK target), not a sender offset; or the camera.
  - LOCK DIRECTION PER DOCK (11 Nov, Nischay via the robo4-bb session; Studio Edge.lockDir, firmware /api/lock?dir=): phys_world
    .lock_dir(lock) = {side: +-1}; a lock's own 'dir' wins, else the old default (A -, B +, end<->end receiving end flipped).
    set_locks uses it. Manual.lock: seated but rotor blocked (< 20 deg) -> tries the OTHER way once (physics decides), the chosen
    'dir' stays in the lock. Brain check: side socket S1A locks BOTH ways (42 deg); forced-wrong default still locks. Board angle
    via real_sync.lock_board_deg + lock_sign (sim +45 on End B -> 135, -45 -> 225 = Studio 180 + dir*45). gpu_transform.py and
    phys_dock.py still have their own fixed LOCK_SIGN copies (old paths).
  - HANDHELD CAMERA in Isaac (isaac_twin CAMERA=1, CAM_AT=t1,t2.. ; World.tag = textured ArUco plates on the parts, camera.py
    images/sizes): one extra camera at a random hand-held angle (above the socket, 20-55 deg off its axis, 0.45 m), one picture
    per shot, tags -> solvePnP per body -> End B tip/axis in the SOCKET's frame (the camera pose cancels) next to the truth.
    FIRST RESULT (flat S1A at the stand-off, 4 shots): 3 of 4 measured; errors 2-5 mm along, 1-3 mm sideways, ~1 deg tilt
    (only 1 end tag in view each time - single-tag pose is shaky). Found on the way: marker_mounts' spots for SIDE sockets lie
    INSIDE the spine frame (never visible); the spine face 80 mm above/below the ring (mounts_rxface.json) needs the tag on a
    ~12 mm bracket level with the ring face (RXTAG_LIFT_MM) - a HARDWARE question for Nischay (where to stick socket tags).
    Next: more End tags in view (bigger / more tags, or the end's other housing), average over shots, then feed the measurement
    into the push (centre + untilt on the CAMERA, not the biased blind estimate).
  - CAMERA STEERS THE PUSH (real_sync._push_deg: self.cam = the twin's measurement in the brain frame; each fresh shot removes
    CAM_GAIN 0.7 of the measured side offset + tilt, integrated, capped 20 mm / 15 deg; feedback held while camera-steering).
    SLOPE 45 (upright start), shots every 0.5 s: tilt 10.5 -> 1.1 deg within 1.5 s, DOCKED + LOCKED (+0.31 mm, 0.13 off, rotor
    44.9) - blind it always jammed 5-7 mm out. Picture checked: End B flush in M2's ring. No camera = unchanged.
  - + camera rules (S2B taught them): CENTRE FIRST (push depth x clip((8 mm - side)/5 mm): S2B had slid 40 mm along the spine
    face when pushed 7.5 mm aside), no blind spiral while the camera is fresh, CAM_GAIN 0.4 (single end tag jitters 3-5 mm),
    shots tilting > 25 deg ignored (a flipped single-tag pose read 81 deg), cap 50 mm. FLAT S2B DOCKED + LOCKED (+0.38; blind
    38 mm short); SLOPE 45 re-checked DOCKED + LOCKED (+0.31). Seated, the camera still reads 2-11 mm 'off' (end tag oblique /
    hidden) - TODO freeze camera steering once seated.
  - Camera now steers the WHOLE approach (real_sync._cam_deg, started/stopped with the dock via begin_follow/end_follow; the twin
    hands REAL minus the brain's CURRENT end pose, so it never fights the planned path). WALL 90 (hanging start): still NOT docked
    - the real End B sat ~77 mm aside for 15 s (camera saw it: 78 vs 77) because M1.B1 ran at 2.35-2.53 N.m and M1.T2 at 1.8-2.5
    (servo limit): the brain predicts <= 1.86 N.m peak for this plan (DIK_TORQUE 0.6 / 0.45 / 0.35 all similar) - it
    UNDER-estimates M1's real wall load by ~35 %. Next: find why (real sag pose vs ideal? camera pushing M1 against gravity?).
    (no-camera wall run: M1.B1 ~1.9-2.0, T2 ~2.0 N.m and 78 mm off too; the camera pushing raised B1 to 2.5 - the PLAN is too
    close to the servos' strength; parked.)
  - CEILING with camera: centred but 2-3 deg tilted, stalled 6.5 mm out (pictures: End B on the spine beside the ring after the
    rotor turned unseated). + BACK-OFF when stuck (camera depth not shrinking over 3 shots while pushing -> out 5 mm for 1.5 s,
    then in again): DOCKED + LOCKED (+0.23, 0.06 off). The close-up picture cannot show the seat from its angle (ring behind End B)
    - numbers only. Slope then REGRESSED (13 mm, 10 deg): the stuck check also fired at the stand-off -> now only while pushing.
    Still regressed: it WAS seated at 19 s, then single-tag readings jittering +-4 mm steered it back out. -> HOLD once seated
    (a camera reading within 2 mm while pushing, or the lock rotor turning, freezes the camera steering); back off only when the
    last 3 readings are ALL > 4 mm out. Regression with camera: slope +0.30, ceiling +0.33, S2B +0.38 - all DOCKED + LOCKED.
  - Wall load: the brain predicts M1.B1 0.56 / M1.T2 0.31 N.m for the wall dock; Isaac shows ~2.0 each (no camera) - M1 is NOT in
    the brain's pose in Isaac (suspect: the T1/T2 counter-twist compensation again, now pressing M1's T2 against gravity). Check
    with FB_DEBUG CMD lines (ideal/fix/droop/fb per joint) on a short wall run.
    Brain-only check (scratch wall_fix.py): on the wall the TARGET M2 gets the capped T1 -8 / T2 +8 counter-twist again (End B
    sag predicted 72 mm) - it turns M2's socket; M1 gets T1 -4..-7 / T2 +2..+4. Same root as the slope. ROLE_W fixes it in
    principle (target: socket part) but broke flat S1A (16 mm) - WHY is the open question before turning it on.
  - RANDOM ROBOTS (isaac_twin RAND_SEED=n, RAND=scale): the Isaac robot gets its OWN physical values (flex k / series stiffness
    +-30 %, gear play +-50 %, masses +-5 %, servo strength x0.85-1.10) while the brain keeps the nominal model - docking must work
    across robots, not for one exact set of values (Nischay 11 Nov: "my values are almost right, not perfect"). The values
    themselves can only be FITTED with real-robot measurements (system identification - Isaac Sim has isaacsim.robot_setup.sysid).
    RESULTS (seeds 1-5): flat S1A blind 3/3 docked; slope + camera 2/2; S2B + camera 2/2; ceiling + camera 0/2 (19-22 mm out).
    Ceiling seed 4: ONE camera reading said 1.4 mm while the truth was 7.8 -> 'seated' froze the steering 7 mm out. Now: hold
    after 2 readings in a row < 2.5 mm, release after 3 in a row > 4 mm (unless the lock turns); readings keep counting while held.
    Correction role weights split: ROLE_W = the target's socket part, ROLE_W_DOCK = the docker's end (both default 1).
    Ceiling seed 4 then DOCKED (+0.20). Seed 5: centred, 7 mm out for 14 s, camera depth jittering 0..13 mm, so 'last 3 all > 4 mm'
    never fired the back-off -> MEDIAN of the last 4 readings decides (stuck: > 4 mm and not 1 mm better than the 4 before; the
    hold is released the same way) -> seed 5 ceiling DOCKED (+0.24).
    Regression after the median rule: nominal ceiling +0.32, slope +0.30, S2B +0.38 all DOCKED; ceiling seed 4 NOT (11 mm): it
    backed off but jammed at the same 7 mm again - End B's BODY on M2's Spine1 (touching list), centred ~1 mm but 3.4-3.8 deg
    tilted while the camera read 1.4-2.7 (one end tag measures tilt worst). A tilt 'rock' after a back-off (CAM_ROCK_DEG, now
    OFF by default) did not get it in. Ceiling with random robots = 1-2 of 2, not reliable yet. Root: the camera's TILT accuracy
    with a single end tag -> more / bigger tags on the ends (2-3 in view), or average several shots before trusting the tilt.
    CAMERA CLOSER (CAM_DIST 0.30 m, was 0.45; now the default): ceiling seed 4 DOCKED (+0.23) - the tilt read 2.6 vs 2.6 true,
    0.2 vs 0.3 (bigger tags in the picture); fewer shots see both bodies. Real robot: hold the camera ~30 cm from the dock.
    But slope at 30 cm: NOT (13 mm) - most shots lost the socket tags (sim lens 30 mm = ~38 deg view). Hand camera now a phone-like
    wide lens CAM_FOCAL_MM 18 (~60 deg); K uses it. Regression running (slope, ceiling seed 4, S2B, ceiling).
  - FLOOR 'help the partner' (manual._retwist_retry, RETWIST, now OFF): a scratch test where M2 was twisted T1/T2 +90 before the dock
    LOCKED - but that test ran with STAND_REACH=0, so M2 had CRAWLED first; twist alone (first, or as a retry) never docked
    stand_lying. Also: the twist does NOT point the lying socket up by itself (T1 +90 -> 0.00 up; the earlier '+1.00' was read
    AFTER the dock, a measuring mistake). Open: crawl + twist together, chosen by physics.
  - CEILING ROOT CAUSE = CLOCKING. With the wide lens (+1920x1440 'phone' pictures, CAM_RES) the ceiling still stuck 6.6 mm out while
    centred 0.6 mm and tilted ~1 deg. jam_dump (JAM_AT=t: the end's REAL touches with the socket part, gap-filtered, socket frame):
    only End B's BODY, at 4 spots 90 deg apart, 7.5-8.4 mm out, r 25-35 mm = its pads ON the socket's lips. True clocking (end's
    turn about the socket axis vs the brain) was ~1.2 deg and had never been corrected (the camera fed tilt only). Soft wrist
    (PUSH_SOFT, off) did not help. -> the camera now feeds the FULL turn error (tilt + clocking, CAM_CLOCK=1): nominal ceiling
    DOCKED + LOCKED (+0.33), seated on the FIRST push (clock 0.6 -> 0.2 deg). Regression: slope +0.30, S2B +0.39, ceiling seed 4
    +0.22, seed 5 +0.23 - ALL DOCKED + LOCKED.
  - END OF 11 Nov (Nischay: stop, continue tomorrow). Scoreboard: flat blind (nominal + 3 random robots) DOCKED; with the hand camera
    (30 cm, wide lens, 1920x1440, tilt+clocking+side steering, centre-first, median back-off, hold-when-seated): slope, S2B, ceiling
    DOCKED incl. random robots. OPEN: wall (target T1/T2 counter-twist in Correction; ROLE_W target-only not yet tested on flat),
    floor tasks (stand_lying / end-end / cobra; crawl + twist), blind clocking (no camera), averaging camera shots, real-robot
    sysid session (plan above), where to stick socket tags (Nischay). Nothing committed. Supervisor cron stopped.
  - 12 Nov: ROLE_W=10 (target's socket only; ROLE_W_DOCK=1) on flat S1A blind: DOCKED (+0.25) - the split fixed the old break.
    Wall short run (FB_DEBUG, stand-off): the blind estimate was far too optimistic (M1 End B 17.8 vs 84.8 mm true). TWIN BUG:
    Servos.encoders() returned 'setpoint - tau/kp' = ~the target even when the servo is at its torque limit and lags. FIXED
    (ENC_MODEL=shaft, default): shaft = actual joint angle + bracket spring (tau/kser) + gear play (load side) - as the real
    ST3215's output-shaft encoder; identical while the servo keeps up. M2's estimate now ~matches truth (End B 62 vs 75 mm).
    WALL = PLAN problem: M1.T1 / T2 and M2.T1 (TWIST servos holding a module out sideways) at 2.5 N.m (limit); M1.T1 told 156,
    reaches 148; bracket give at its +-3 deg stops. The brain itself predicts T1 1.81 (> its 1.62 limit: DIK_TORQUE only stops a
    load from RISING). Needs a wall plan that keeps twist servos unloaded. Regression after the encoder fix: flat blind +0.25,
    slope +0.30, S2B +0.39, ceiling +0.30 - all DOCKED + LOCKED.
  - WALL PLAN FIX: dik.py DIK_TORQUE_TWIST = the twist joints' own (smaller) share of the real 2.7 N.m. Brain: 0.6 -> twists 1.8 N.m;
    0.2 -> twists ~0.75, the load moves to the bends (M2.B1 1.66), dock still LOCKS. Isaac WALL (hanging start) + camera +
    DIK_TORQUE_TWIST=0.2: DOCKED + LOCKED (+0.28, 0.06 off) - no servo > 1.5 N.m during the approach (was 2.5); after the lock
    M2.T1 2.53 (the joined pair hangs on it - watch). Overview picture: M1's End B at M2's ring.
    0.2 EVERYWHERE broke flat blind (18 mm) -> automatic: twist share 0.2 only where gravity pulls sideways (|up.z| < 0.5 = walls);
    flat / slope / ceiling unchanged. Wall with the automatic rule: DOCKED (+0.28).
  - SPEED (Nischay: "a dock that works finishes in 2 min - if it takes long something is wrong"): EARLY END in isaac_twin (referee:
    done = seated + rotor > 40 deg for 1 s; stuck = pushing 6 s with < 1 mm progress in 5 s; rotor turned unseated) - ends the
    run at once (EARLY_END=0 off). A flat dock still takes ~32 s of ROBOT time (brain waits 8 s at the stand-off, up to 12 s at
    the seat), the sim ~7x slower than real time. HZ 500 (was 1000) = the same results in all 5 cases, flat run 216 s (was 295);
    magnets batched (identical forces, 1e-16). Camera runs ~250-370 s (1920x1440 pictures every 0.5-1 s cost a lot).
    PLAN for that session (~1 h, Nischay + one module on a floor receiver, the laptop sender): (1) a few still poses (straight,
    each bend at 30/60/90 deg, held 5 s each): record commanded angle, encoder, servo load, IMU tilt -> servo stiffness + gear play
    + bracket flex per joint (the end's real sag vs commanded); (2) slow back-and-forth sweeps of each joint -> gear play
    (dead band) and friction; (3) a weight on End B (known grams) -> sag per N.m; (4) phone camera with the tags for the end's
    true tilt (checks the flex model directly). Then fit the model values to those recordings and re-run the random-robot tests
    around the FITTED values.
  - Wall: straight out of a wall needs 2.46 N.m at rest; hanging (B1 +90) start docks in the brain at 1.86 peak. isaac_twin case
    option "start_deg": [7 angles] for that.
  - DIK torque limit now ALSO in the ideal brain (dik.py, DIK_TQ_IDEAL=1), against the REAL 2.7 N.m (60 % = 1.62): brain docks all
    still lock; peak need 45 deg 2.35 -> 1.81 N.m, flat 1.93 -> 1.86. Wall 90 stays 2.46 because the START pose (straight out of
    the wall) already needs it - that test scene is impossible for the real robot; wall cases must start folded / hanging.
  - FIXED pictures: since the timeline pause the renderer never saw Newton's poses - every picture showed the START pose (left
    camera identical all run). World.snap() now copies the live poses into USD first (_sync_visuals); module test: same physics.
  - FIXED brain floor: floor (contype 2/aff 1) and side receiver rings (2/5) never collided -> a lying module's ring sank up to
    9.8 mm into the floor unseen; Isaac (real shape) pushed it out in one step and the chain2 bodies flew off. phys_world: floor
    conaffinity |= 2. Lying modules now rest on their real shape (<= 0.5 mm). Brain docks (flat/slope/wall/S2B/ceiling) still lock.
  - Crawl (floor_skills.crawl_to): fixed 60 s cap -> stops after 6 waves without 1 cm gain (5 min cap); a sideways wave that went
    backwards flips its sign (measured, not assumed); rolled onto a ring -> re-align T2 (max 2) instead of rocking. Brain only:
    stand_lying now LOCKS; end-end 48 mm short (was 101-149). Crawl still erratic on the ring - the lying rest state needs work.
  - Brain cobra (chain2) fails with AND without the floor fix ("footprint did not form" -> base tips) - older brain problem.
  - 12 Nov (new session) FLOOR TASKS, brain first (scratch brain_regress = Manual ideal per case):
    - END-END (M1 standing, M2 lying): M2.A pointed AWAY from M1 (faces -0.96) - crawling closer only brought its back to M1
      (187 mm off). manual._crawl_near: an END socket facing away -> the lying module crawls ALONG its length (sideways waves roll
      it and swing the goal) until the foot is END_REACH (0.30) in front of that end. Then 3.2 mm too HIGH and stuck: the docker's
      end housing rests on the floor (socket only 37 mm up). manual._lift_end (LIFT_END=1): the lying module bends the joint near
      that end (B1/B2 or B4/B3, +-20 deg, each tried in physics, highest kept) -> socket 78 mm up. END-END LOCKS (also M2.A in the
      stand_lying scene). M2.B still not (crawl drifts sideways, 551 mm off).
    - STAND_LYING side sockets: probe - no twist turns S1A up (T1/T2/T3 +-90/180), ONE sideways crawl wave ROLLS the module a quarter
      turn (S1A up +1.00, 72 mm, 319 mm from the foot = like a floor receiver); S2B: rolls face-down and stays (only 1.5x waves get
      it off, sometimes), but T2 +90 turns it up. manual._face_up(dm, ...) now IMAGINES every helper (T2/T1 +-90, rolls starting
      either way) with the new PhysWorld.snapshot()/restore() (MuJoCo full integration state + servo setpoints + locks; snapshot
      does mj_forward first - without it a rolling module diverged 1.4 mm per wave; replay now exact 0.0), scores 'faces up' +
      'inside 240-340 mm of the foot' (locked at 283-318; 388 never seated; 416 out of reach), does the best for real. Too far ->
      slides ALONG first (free), re-imagines. Crawl goal for side sockets: SIDE_R 0.30 from the foot toward the socket (into the
      foot it jammed the body against M1 and sat too close). Free lying target: brain funnel 0.6 mm (FREE_FUNNEL_MM; it wobbles
      0.3-1 mm, crept in at half speed).
    - Brain score: end-end LOCKED, stand_lying S1A / S2A / M2.A LOCKED; S1B / S2B / M2.B NOT (the module's LINE lies too far to
      the side - closing that needs a roll, which turns the socket again; open). Regression: flat, slope 45, S2B, ceiling all
      LOCKED; wall90 NOT in the scratch brain run = the known straight-out start (start_deg hang needed), same with helpers off.
    - ISAAC end-end (blind): NOT docked - the brain crawled M2 ~1 m round and locked, the REAL (Isaac) M2 stayed: 'isaac_vs_brain'
      grows ~18 mm/s from the first wave (brain ~21 mm/s -> real ~3 mm/s). The waves ARE sent (CMD M2 B2 +-24.6 deg); the pictures
      looked straight only because EVERY 2 s = the wave period (same phase each shot - use an odd EVERY when filming gaits). So the
      brain's crawl is far too optimistic (its coarse CAD boxes grip/push the floor unlike the exact shapes). EVERY floor task that
      needs a crawl is blocked on this: next = a gait that moves the Isaac module (test the wave alone in Isaac, short), then make
      the brain's crawl match it (contact shapes / friction) - never trust a brain-only crawl again.
    - isaac_twin.py BUG fixed: 'REAL = ...' had slid into the end of the HZ comment on line 28 (NameError at start-up).
    - GAIT in Isaac (Manual.skill('crawl_test'), data/teacher/twin_crawl.json; isaac_twin status now has moved_mm = real vs brain move
      of each Spine1). M2 lying, 4-6 waves along: 2 s/25 deg (old default) Isaac 73 vs brain 393 mm (12 mm/wave); REAL=0 (ideal
      servos) only 11 mm -> not the servos, the CONTACTS. Sweep (Isaac mm per wave): 2 s 12 | 3 s 18 | 4 s 36 | 6 s 35 | 8 s 28 |
      2 s 40deg 11 | 4 s 35deg 24 | 5 s 35deg 43 | 6 s 35deg 48 | sideways roll 6. RAND_SEED=3: 4 s 38, 6 s/35 49. Best: 4 s / 25 deg
      (~9.5 mm/s) - NOT yet made the default (WAVE_PERIOD env). Brain at 4 s: 243-270 mm vs Isaac 143-153 (1.7x), and the brain's
      crawl does not change with friction (x0.3..x1: 270-281 mm) = geometric stepping on its box colliders.
    - BRAIN RING BUG fixed (phys_world): side rings were the FLOOR receiver incl. 4 outer lugs to r 46-49 mm; the real spine ring
      is a round 35 mm disc (Spine1 STL, all angles). Lugs no longer touch the floor (contype 8; SIDE_LUGS_FLOOR=1 = old). Crawl
      only 393 -> 354 mm, so not the main cause; all brain docks still lock.
    - IMAGINE LEAK fixed: while the brain imagined helpers the sender sent them all to Isaac (the real M2 did every twist + roll,
      517 mm / 124 deg off). PhysWorld.run skips on_tick + recording while w.imagining (set in Manual._face_up).
    - Isaac stand_lying S1A + hand camera (new CAM_EVERY=0.6: auto shots once the end is < CAM_NEAR 0.15 m from the socket;
      dock_rel() shared): NOT docked - after the ONE roll wave the real M2 sits 108 deg turned vs the brain's copy (socket not up),
      the camera measured it right (100 mm / 57 deg off the brain) but steering ignores > 25 deg. CONCLUSION: a free lying module
      moved by crawl/roll ends where the brain cannot know (encoders + IMU give shape, not floor position). NEXT: camera BELIEF
      UPDATE - when the camera sees a free module far from the brain's copy, move the brain's copy there (free joint pose from the
      camera, joints from encoders) and re-plan (face up / approach again), instead of small steering.
    - Regression after all this: brain flat / slope / S2B / ceiling / end-end / stand_lying S1A / S2A / M2.A LOCKED; Isaac flat S1A
      blind DOCKED + LOCKED (+0.25).
    - Defaults changed: floor_skills WAVE_PERIOD_S 4 s (along waves); sideways (roll) waves keep 2 s (WAVE_ROLL_PERIOD - at 4 s they
      no longer rolled); END_REACH 0.25.
    - CAMERA BELIEF UPDATE (Manual._cam_belief, CAM_BELIEF=1): isaac_twin hands the measured end-part-in-socket-part pose
      (sync.cam['seen']); a single FREE target more than CAM_BELIEF_MM 20 / _DEG 10 off -> its brain copy is moved rigidly there
      (docker end = own encoders), stale shot cleared, Manual.Replan -> connect() plans the dock again (max CAM_BELIEF_MAX 4).
      isaac_twin: CAM_TRIES 4 (a shot missing the end or the socket is retaken from another random hand angle; 66/66 seen).
      ISAAC stand_lying S1A + camera (box brain, 4 updates: 47 mm/97 deg, 158/138, 262/179, 39/9): DOCKED + LOCKED (+0.23 mm,
      rotor 44.9) = FIRST FLOOR TASK DOCKED IN ISAAC. Messy middle (each re-planned roll/crawl went wrong again).
    - FLOOR HULLS (phys_world FLOOR_HULL=1, default): against a plane only a part's convex outline matters -> each part gets ONE
      convex hull of its real STL (sim/floor_hulls.json, cached) touching only the floor (bit 16; floor aff = 2|16, boxes aff 5).
      The 4 mm voxel boxes made round housings (real r 34-38) lumpy polygons 38-41 mm. Brain crawl at 4 s now 156 mm vs Isaac 143
      (was 243-270); 2 s waves still 374 vs 73 (only used for rolls). Brain with hulls: flat / slope / S2B / ceiling / stand_lying
      S1A / S1B LOCKED; end-end, S2A, S2B, M2.A, M2.B NOT - the crawl logic (bend_vertical thresholds, T2 align) was tuned on the
      lumpy box floor: the realistic module rolls easily ('bends lifting' 0.01-0.5). NEXT: re-tune crawl_to on the hull floor.
    - floor_skills.crawl_learn (CRAWL_MODE=learn, default; old = CRAWL_MODE=old): tries each wave type (along/side x +-), remembers
      what it REALLY moved in the module's frame, picks the best-closing one. Moves well (side waves roll it 140-180 mm) but turns
      the module: brain M2.A ended facing AWAY (-0.92). NEXT: yaw control (a turning move) for end sockets.
    - ISAAC stand_lying S1A + camera with the HULL brain: DOCKED + LOCKED again (+0.24, rotor 44.9, early end 66.5 s), 4 belief
      updates (65 mm/97 deg after the first roll: the 2 s roll wave is still mis-predicted - measure a roll wave alone in Isaac).
    - ROLL WAVE ALONE in Isaac (crawl_test CRAWL_SIDE=1 CRAWL_ALIGN=0; status moved_mm now has isaac_deg / brain_deg = each copy's
      own turn): the REAL module does NOT roll - 9.3 deg (2 s / 25), 11.8 (3 s / 35, 2 waves), 9.8 with ideal servos (REAL=0) -
      while the ideal brain rolls 96-98 deg (114 within 1.8 s). Brain friction x0.15..x1: still 96-115 -> not friction. The
      NON-ideal brain (Manual ideal=False) rolls 17 deg = Isaac-like. Tried: _exact only for floor-held modules + physical servo
      gains for free ones (PhysWorld._floor_held, EXACT_FREE=0): roll still 96, crawl 320 mm (worse) -> OFF (EXACT_FREE=1 default,
      code kept). Suspect: the ideal brain drops the PLA flex + gear-play joints (a rigid module tips; the real one gives). So the
      brain's '1 roll wave turns S1A up' is FALSE for the real robot; stand_lying only docked in Isaac through the camera belief
      updates. NEXT: find which ideal simplification makes the fake roll (flex / play / armature) with the brain alone, or let the
      brain imagine free-module floor moves in a non-ideal copy of itself.
    - BRAIN COBRA BUG: the chain2 cobra blows up at t 9.47 s (second align of M1.T3: no contacts, M1_root spinning up to 64 rad/s,
      then 'Nan/Inf in QACC') and MuJoCo silently RESETS the world (clock back to ~0, all bodies to qpos0) - everything after that
      ('footprint did not form', base tipping) ran on a broken world. Fix that first (find what flings the chain; then guard:
      phys_world.run should stop loudly on a reset, not go on).
- RESULT: seats at -0.04 mm (= MuJoCo seat), rotor turns 44.9-45.0 deg, locked 30 N pull HOLDS (0.2-0.9 mm play), open pull comes
  out - straight AND tilted +-1.25 deg (the PLA play that jammed the box model). Lock holds by fin contact alone.
- Spine1 STL = 41 closed solids, End B = 6 (touching at edges, so 'not watertight' overall; each solid is closed - fine for SDF).
- Next: the whole module(s) in Isaac+Newton with exact shapes (servos as torque models), then docking on it.
