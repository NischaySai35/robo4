# TETROBOT — handoff prompt for the next Claude session (written 12 Nov 2026)

Paste this whole file as the first message of the new session (or say: "read D:\robo4-restructure\docs\NEXT_SESSION_PROMPT.md and continue").

---

## 0. Who / how to work (read first, STRICT)

- User: **Nischay** (NischaySai35). Explain in **layman terms**, short, checklists, no jargon. Report **% progress and time left**.
- Memory index: `C:\Users\NISCHAY SAI D R\.claude\projects\d--robo4\memory\MEMORY.md` — read it, especially:
  how-nischay-wants-me-to-work, decide-dont-ask, gpu-runs-short, one-sim-instance, reuse-components-no-duplicates,
  work-in-restructure-sim, ask-before-repo-actions, explain-in-layman-terms, physics-decides-not-rules,
  camera-is-optional-addon, blind-first-one-camera, mujoco-4-upgrade (pins), manual-home-default-locks.
- Work ONLY in **`D:\robo4-restructure`** (sim\ data\ studio\ docs\). **Never commit / push / PR without asking.** Nothing from
  10-12 Nov is committed yet.
- **Decide technical things yourself**; ask only what only Nischay knows.
- **Short runs** (one case, STOP_AT / early end, ~2-4 min), **analyse logs AND pictures** before re-running; never long suites
  without reason. **Exactly one Isaac/sim process at a time** (check processes first).
- **Reuse, never duplicate**: new files need a `# REUSE-CHECKED:` comment (a hook enforces it); grep before writing.
- After EVERY change: **re-run the cases that already passed** (regressions happened several times).
- Don't touch firmware / Fusion; FW_VERSION stays 0.1.0. Stack pinned to Isaac Sim 6.2: mujoco 3.12, mujoco-warp 3.12,
  warp 1.17, numpy 2.3.1, newton 1.6.1 — never upgrade one alone. Python 3.12 (`py -3.12`).
- Full history of findings: `D:\robo4-restructure\docs\CURRENT_STATE.md` (the long "Isaac" sections at the end, 9-12 Nov).

## 1. The big goal

TETROBOT = shape-changing modular robot (identical 7-DOF modules: twists T1 T2 T3, bends B1 B2 B3 B4, a lock rotor at each end
L1/L2; ST3215 servos 2.7 N.m; ESP32 board per module; ends dock into floor receivers, other ends, or 4 side sockets per module
S1A S1B (Spine1) / S2A S2B (Spine2); magnets 3.5 N per connector; lock rotor turns 45 deg to lock).
Layers: **LLM → shapes → transformation planner → skills (dock / crawl / walk) → real robot.**
Current focus: make the **real robot reliably carry out what the ideal planner plans**, above all **docking**, everywhere
(floor, slope, wall, ceiling, every socket), **blind first (encoders only), camera optional (one hand-held phone, any angle)**.

## 2. Architecture (how it works)

1. **Brain = ideal robot** (`sim/manual.py` Manual(ideal=True) on `sim/phys_world.py` MuJoCo): plans and executes every move
   perfectly (DIK `sim/dik.py` + VSEPR spread). In the brain every dock LOCKS.
2. **Sender = the adjusting code** (`sim/real_sync.py` RealSync, every 60 ms): ideal joint angles + flex/sag compensation
   (Correction) + live feedback from sensors (Feedback: encoders + IMU + predicted flex; camera optional) + docking extras
   (push, spiral, camera steering, centre-first, back-off, hold-when-seated) → board angles (`lock_board_deg`, `lock_sign`).
3. **Real robot** follows the board angles. In tests the "real robot" is **Isaac Sim 6.2 + Newton (MuJoCo-Warp solver)** with the
   exact CAD shapes, real flex/gear play/servo limits — `sim/isaac_twin.py` (+ `sim/isaac_newton.py` World/Servos/Magnets/tags,
   `sim/isaac_module.py`). Isaac is the **referee**: it knows the truth; the robot never sees it.
4. `sim/twin_suite.py` runs a plan of cases, one per Isaac run, PAR side by side (RAM: ~2.4 GB each, 2 fit).

## 3. How to run a test (examples)

    cd D:\robo4-restructure\sim
    py -3.12 isaac_twin.py ..\data\teacher\twin_flatS1A.json                      # flat dock, blind
    set CAMERA=1 & set CAM_AT=13,13.5,14,...  & py -3.12 isaac_twin.py ..\data\teacher\twin_slope_up.json   # with the hand camera
    py -3.12 twin_suite.py ..\data\teacher\twin_suite2.json                       # 9 cases, PAR=2

Plans in `data\teacher\`: twin_flatS1A, twin_s2b, twin_slope_up (45 deg, upright start), twin_ceil1, twin_wall1 (hanging start),
twin_suite1/2, stand_lying etc. Logs + pictures: `data\logs\isaac_twin\<TAG>*.log/png`. The log's RESULT line = verdict.
Useful env switches: STOP_AT, EVERY (picture interval), RAND_SEED (random robot), CAMERA/CAM_AT/CAM_DIST/CAM_FOCAL_MM/CAM_RES,
FB_DEBUG=1 (estimate vs TRUE per part + CMD ideal/fix/droop/fb), JAM_AT=t (real contacts of the end with the socket, socket
frame), PROFILE=1, PLACE_DEBUG=1, EARLY_END=0 (off), HZ (default 500), WORLDS (off - broken), PLANE_FLOOR (default on).
Brain-only quick checks (no Isaac, seconds): scratch scripts in the session scratchpad (brain_regress.py, wall_dock.py,
wall_fix.py, reach_map.py, torque_need.py) — recreate if needed (Manual + RealSync on the CPU).

## 4. Current results (12 Nov, all checked in Isaac)

| Case | Result |
|---|---|
| Flat into S1A, blind (encoders only) | DOCKED + LOCKED (also on 3 random robots, also with robot IMU off) |
| Flat into S2B | DOCKED with camera (blind: 38 mm short) |
| Slope 45 deg (upright start) | DOCKED with camera (blind: 5-7 mm short, tilted) |
| Ceiling | DOCKED with camera (also random robots 4, 5) |
| Wall (hanging start) | DOCKED with camera + automatic wall plan (twists lightly loaded) |
| Floor tasks: standing into a LYING module, end-to-end, chain cobra | NOT solved |
| Slope / ceiling / wall / S2B BLIND | NOT solved (unseen plastic flex 5-80 mm) |

## 5. Key fixes / findings 10-12 Nov (details in CURRENT_STATE.md)

- Pictures were frozen (timeline paused) → World.snap copies live Newton poses to USD first (_sync_visuals).
- Brain floor didn't collide with side receiver rings (lying modules sank 10 mm) → phys_world floor conaffinity |= 2.
- Isaac speed: BOX floor = 400k triangle pairs/step and >2 cases overflowed Newton's buffer (contacts dropped) → PLANE floors;
  Newton state read directly (fast_poses); servos + magnets batched; HZ 500. One robot PAIR per Isaac run (Newton 1.6 loses
  mesh contacts with 3+ pairs / under load with 2; separate Newton worlds make no mesh contacts at all).
- Twin encoder model was wrong (reported ~target while an overloaded servo lagged) → ENC_MODEL=shaft (actual joint + bracket
  spring + gear play) = like the real ST3215 output-shaft encoder.
- Sender's flex compensation used a T1/T2 counter-twist that turned the TARGET's socket 6→12 deg → ROLE_W (target's socket part
  weight; ROLE_W_DOCK for the docker) — opt-in (default 1). ROLE_W=10 target-only now passes flat.
- Planner servo-strength limit (DIK TorqueLimit) now also in the ideal brain against the REAL 2.7 N.m (60 %); walls: twist
  joints 20 % automatically (|up.z| < 0.5) — keeps twist servos unloaded (they hit 2.5 N.m before).
- Wall/slope start poses: straight out of a wall needs 2.46 N.m → hanging/upright starts (case "start_deg").
- Hand-held CAMERA (CAMERA=1): ArUco tags (World.tag, camera.py images, 18 mm) on End housings + spine faces ~80 mm above/below
  each side ring on a ~12 mm bracket (mounts_rxface.json; the old marker_mounts ring spots were INSIDE the spine). Camera at
  30 cm, phone-like wide lens (18 mm ~60 deg), 1920x1440. Measures the end RELATIVE to the socket (camera pose cancels), feeds
  the sender (real minus brain's current pose) with **tilt + side + CLOCKING** (clocking about the socket axis was the hidden
  ceiling blocker: End B's 4 pads sat on the socket lips at ~1 deg), centre first (push depth gated by side error), no spiral
  while the camera sees, ignore >25 deg readings, median back-off when stuck, hold when 2 readings say seated.
- Blind push extras: PUSH_MM 12, spiral 7 mm default; wiggle / untilt / side / freeze-FB / FB_GOAL / FOLLOW / soft wrist / rock /
  RETWIST all **opt-in (off)** — each either didn't help or broke flat. Blind seat sensing via encoders does NOT work (plastic
  flex hides the jam).
- Lock direction is chosen **per dock** (Nischay): phys_world.lock_dir(lock) + lock 'dir' {side: +-1} (sim frame), Manual.lock
  tries the other way if blocked; board = 180 + lock_sign*sim_deg (lock_home 0) = Studio Edge.lockDir (BOARD frame, 180+dir*45).
  Receiving end = side 'a' (end<->end default: b board -1, a board +1). Coordinated with the robo4-bb session (it owns firmware
  + Studio msrr2 executor; mod2 homes; manual home default).
- Reach map: a standing module can't dock into a LYING module's side socket (rings stand on edge, sockets face sideways 37 mm
  up) — 1 of 32 positions. Twisting the lying target alone doesn't point the socket up; a scratch test with crawl + twist
  locked — open.

## 6. Sub-goals / next steps (in order)

1. **Floor tasks** (stand_lying, endend_M1B_M2A, chain2 cobra): crawl + twist chosen by physics (manual._crawl_near,
   floor_skills.crawl_to (stall rule, measured side-wave sign, T2 re-align), manual._retwist_retry (RETWIST off)). Brain first,
   then Isaac.
2. **Test speed**: brain waits 8 s stand-off / up to 12 s seat (SEAT_WAIT_S); camera pictures cost (fewer/smaller shots);
   Isaac start-up ~50-90 s (SDF cache?).
3. **Blind on hard surfaces** (no camera): maybe impossible with encoders only — decide with data; else camera stays required.
4. After locking on a wall, the joined pair loads M2.T1 2.53 N.m → a low-strain rest pose after a lock.
5. **Teacher-student** (Nischay's plan; `teacher_dik.py`, `teacher_bc.py`): thousands of RANDOMIZED docks (poses, surfaces,
   sockets, RAND_SEED robots, camera angles) with today's rules as teacher → train the student → less hand-tuning.
6. **Real robot**: Nischay's ~1 h measurement session (plan in CURRENT_STATE.md: still poses, sweeps, known weight on End B,
   phone camera) → fit the model values (sysid; isaacsim.robot_setup.sysid exists) → random-robot tests around the fitted values.
7. Update CURRENT_STATE.md as you go; commit only when Nischay says.

## 7. Open questions for Nischay (only he knows)

- Can ArUco tags go on the spine faces ~80 mm above/below each side ring on a ~12 mm bracket? (+ 2-3 tags per End in view)
- When can he do the ~1 h real-module measurement session?
- (still) which side receiver the real MPU sits in (S2B placeholder).

## 8. Estimate given to Nischay

~2-3 working days of Claude time to finish the sim side (floor tasks 3-5 h, faster tests 1-2 h, blind hard surfaces 3-6 h
uncertain, teacher step 1-2 days mostly compute) + his real-robot session. Progress ~72 %.
