# TETROBOT — where we are (5 Nov 2026)

Handoff for the next chat. Read this first, then `docs/ARCHITECTURE.md`.
Work happens in `D:\robo4-restructure` (folders `sim\`, `data\`, `studio\`, `firmware\`, `gos\`). Nischay's terminal is PowerShell.

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
  - dik 'come around' aim fades in over DIK_AROUND_RAMP (20 mm) instead of switching (aim chattered 40 mm at the stand-off).
  - coop_connect: a twist wound against its stop at a 1.8-s stall -> the module straightens, turns the twist round to the
    far side of its range, docking steers on (once per joint).
  Tried and dropped: 'target turns to face the docker' first (M1 folded to its stops, ideal floor/walls broke).
  Results: ceiling error robot seed 2 LOCKED (first time); seed 1 unwinds M2.T1 (-169 -> 168), straightened cleanly, final
  result needs a run > 120 s (Nischay). Ideal: floor, +-90, 180, chain3 all LOCKED after every change.
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
