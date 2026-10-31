# Handoff prompt: continue TETROBOT toward G6 (paste this into the new chat)

You are continuing TETROBOT, a modular self-reconfiguring robot (MSRR): 7-joint modules (ST3215 servos), each with two
lockable END connectors (A and B: 8 pad/gap segments, magnets, a central lock rotor that turns 45°) and 4 SIDE receivers
(S1A, S1B, S2A, S2B), standing in FLOOR receivers on a cardboard board. Goal G6: real shape-changing (words → shape →
plan → physics-proven transformation → watchable in the Studio → real robot).

## Read first (and re-read when you resume)
1. Memory folder `C:\Users\NISCHAY SAI D R\.claude\projects\d--robo4\memory\` — start with `how-nischay-wants-me-to-work.md`, then MEMORY.md.
2. `D:\robo4\docs\G6_PROGRESS.md` — every measured result, the log, and the **TODO list at the end (29 Oct)**.
3. `D:\robo4\docs\TETROBOT_HANDOFF.md` (robot, connectors, brain, G1–G6) and `TRANSFORM_PLANNER_V2_PROMPT.md`.

## How Nischay wants you to work (strict)
- **Max 120 s per run you start, as short as possible.** Run the pipeline in PIECES from checkpoints. Anything longer (training, GPU sweeps, many robots) → write the exact commands for him; he runs and watches.
- **Look, don't trust backend numbers.** Pictures at every stage (snap.py, `VISUAL_MESH=1` = his real CAD meshes, colour per module, End A dark blue / End B orange). Check things MOVE when they should (watchdog.py). He has caught many faults by eye that logs called "OK".
- **Think out of the box**: many modules = endless combinations (orders, cooperative support, other receivers…); explore and verify in physics.
- **Physics decides**; only connection rules + planning are hand-made; static checks are warnings. Disturbances stay ON.
- Every number from a run; estimates labelled; failures reported with the reason; honest status (G6 ≈ 30–35%, not Big Hero 6).
- **Reuse components, never duplicate code.** Another session is cleaning the codebase: re-read a file right before editing it.
- Don't tell him what to do; plain words; keep going. Don't touch `firmware/` or his Fusion files. Latest versions, no venvs, `py -3.12`.
- **Camera = optional add-on**: transformations must work without it; it can be switched on mid-transformation; it may shake. Third-person (fixed in the room, sees all modules), never on a module.
- **Good dock** = locked + no bump into other modules + about ≤ 20 s robot time. Report every dock against it.
- Stop every process you started before finishing (his own `npm run dev` stays).

## Where things live
- Sim `C:\TETROBOT\sim\` (logs `C:\TETROBOT\logs\`, checkpoints `logs\ckpt\`, pictures `logs\snaps\`), brain `walk.py` + `C:\TETROBOT\deploy\laptop_controller.py`.
  - `phys_world.py` real-physics world (magnets, servos, welds-when-seated, floor-receiver cardboard play, `save/load` checkpoints, `on_tick`, `VISUAL_MESH`, `MARKERS`); `disturb.py` (shake, bumps, air, per-magnet spread, deadband, packet loss; `DISTURB=0` off).
  - `phys_dock.py` (`dock`, `peel_after_dock`), `tf_plan.py` (A→B planner + one interpreter for CPU/GPU, `chain`), `tf_run.py` (pairs), `ckpt_build.py` + `tf_piece.py` (pieces, `REC=25` recording) + `stitch.py`, `snap.py`, `watchdog.py` (JAMMED/IDLE/STUCK/COLLISION), `gpu_world.py` + `gpu_transform.py` (GPU), `coop.py` (cooperative support), `bridge_search.py`/`bridge_test.py`, `gallery.py`, `camera.py` (ArUco 18 mm on the CAD housing via `marker_mounts.py`; `StereoRig` 2×1920×1440 → 0.84 mm median), `cam_judge.py` (the camera as the brain's OPTIONAL judge: pictures only, switchable, re-measures its own pose from the board tags), `cam_dock.py` / `plan_ckpt.py` / `cam_dock_batch.py` (one dock as a piece, scored by the good-dock rule; modes off / truth / cam / cam@T / shake / knock@T), `_plan_dbg.py` (run a Studio plan in physics with pictures), `sag_data.py`/`sag_view.py` (brain-estimate error data).
  - Brain switches (all default ON): `PULL_CONVERGE`, `BASE_FOLLOW`, `TARGET_FOLLOW`, `FOLLOW_CHECK` (arm-can't-follow + no-progress 21 s), `MID_CHECK` (camera checks during the go-in).
  - `verify_service.py` on 127.0.0.1:8771 (`/transform?name=…&seed=…`, `/simulate`, `/shapes`, …): start it when the Studio needs physics.
- Studio `D:\robo4\studio` (`npm run dev`, Nischay usually has it running on :5173): MSRR Experiments → Planner v2.
  - Shapes tab: **Transformations (watch)** gallery (T2, AB, bridge5, chain_ABC). Plan tab: red "SKETCH, not physics" + "▶ Real physics: run this plan". Ask tab: chat with qwen3.5:9b (Send/Stop/Retry/New).
  - `robotics/msrr2/approach.ts` (stand-off/straight-in sketch), `planner.ts` (`DOCK_BEND_DEG` = 75° room rule), `intent.ts` (chat), `features/msrr/MsrrCanvas.tsx` (real floor-receiver STL, End A/B colours).
  - Tests: `npm test` (364 + new approach tests). Screenshots: `py -3.12 D:\robo4\tools\ui_shot.py` (Windows paths for `shot:`).
- Local AI: Ollama `qwen3.5:9b` (~87% on the RTX 5050), `cosmos-reason2:8b`. OpenCV 5.0.0.

## State at the end of 29 Oct (measured)
- GPU shape change A→B: 61/64 (room off). Shape A with the room on: 7/7 (CPU).
- T plan in physics: it failed because joints sat at their stops → room rule; dock into M2.S2B with room: robot 1 OK (27 s, too slow), 5 robots 2/5. The go-in error regrows to 3–5 mm even with mid checks.
- Root bends over if a module hangs from its UPPER receiver; cooperative support (a second column docks into the bridging module first) carries it (R 30%, X1 58%).
- A module left sticking out sideways cannot lift itself; "stand up straight" often fails (now it relaxes).
- Camera wired into the brain as an optional judge (29 Oct, session 2). Needs 4K-class cameras at ~1 m and 6 tags per end: end-vs-receiver error 0.8 mm still, ~2 mm shaking or knocked. S2B dock with the honest belief (`BELIEF=model`): encoders 0/5, camera 1/5 (23.7 s, clean); good docks 0/5. Failures are mostly motion (swing bump, settle after correction, stops 7 mm short), not seeing. Env for camera runs: `MARKERS=1 TAGS_PER_END=8 FLOOR_TAG_MM=35 CAM_RES=3840x2160 BELIEF=model`.
- Found: without a camera the brain used to read the TRUE base/target receiver poses (cardboard tilt included). `BELIEF=model` removes that (default still old).

## Next work, in order (TODO in G6_PROGRESS.md)
1. Camera add-on: done as a judge; open items in G6_PROGRESS TODO 1 (target bias near the seat via the module chain, third camera, bigger sample, BELIEF=model as default).
2. Fast docks (≤ ~20 s).
3. Find and fix the W2→R collision in A→B (collision watchdog).
4. Check the Ask chat in the browser (2 turns with qwen).
5. Designer v1: blocks (column, brace, gate, cooperative support, chain) + choosing HOW MANY modules → connected to the chat → physics proof.
6. Long-run commands for Nischay: walking re-check with the new brain switches on vs off; shape change on 64 GPU robots with disturbances.
7. Later: the "glasses" network (data near real dock poses), a residual-RL docking skill (one small shared policy per module), a third camera if coverage is poor.

## Gotchas learned
- Bash heredocs break on quotes/backslashes: write patch scripts to files; use `os.path.join` for Windows paths (`\t`, `\v`, `\l` got mangled several times).
- `dock()` captures stdout: print diagnostics to stderr.
- A world must know every lock it will ever close when it is built (`tf_plan.needs`).
- MuJoCo re-centres meshes: copy COMPILED geom placement; renderer offscreen size must be raised for big pictures.
- `peel_after_dock` reads walk.py's source once per process.
