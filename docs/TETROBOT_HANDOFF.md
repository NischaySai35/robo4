# TETROBOT — Full Handoff Report

Simulation, docking/walking controller, multi-module connections, GPU pipeline, Studio integration — history, knowledge, files, results, open problems and the plan to G6

**For:** Nischay Sai D R (Nischay Robotics)  ·  **Written by:** Claude  ·  **Date:** 26 October 2026, 07:45 IST

**Purpose:** everything needed to continue this work in VS Code (Claude Code) without this chat. Every section has a plain-words part and a technical part.

State at handoff: all simulation runs stopped, no scheduled tasks left, nothing running on the laptop. Machine-readable copy of this report: D:\robo4\docs\TETROBOT_HANDOFF.md.

### Contents

1.  One-page summary (where we are, honestly)
2.  Your goals G1–G6 and their status
3.  History: what happened, day by day
4.  Everything you taught me about the robot
5.  Your working rules and preferences
6.  Where every file is, and how I accessed them
7.  Software stack and the laptop setup
8.  How the simulation is built (models, physics, receivers, magnets)
9.  How the docking controller works
10. How walking works (inchworm cycle) and tonight's fixes
11. Multi-module: partner modules, side receivers, end↔end
12. The GPU pipeline (MuJoCo Warp) — how to run it, what it measures
13. All results in one place
14. Open problems and what is known about each
15. TETROBOT Studio (D:\robo4) integration status
16. The plan: from here to G6, step by step
17. Command cookbook (copy-paste)
18. Real-robot path (calibration → first real dock)
19. Glossary (plain words)
20. Appendix: settings (environment variables), file inventory, VS Code prompt

## 1. One-page summary

**In plain words.** We built a realistic computer copy ("simulation") of your 7-joint TETROBOT module, with your real CAD connectors, magnets, lock fins, PLA bending, gear slop and servo strength. Inside it, a "brain" (the docking controller) moves the module, lines its end up above a connector, pushes it in and turns the lock. A simulated camera checks each step, exactly like the camera you plan to add.  
  
**What works today (in simulation, with random real-world errors on every robot):** one module **walks from floor connector to floor connector** — 97–98% of docks lock correctly on the GPU with 128 random robots, about 20 seconds per step, and it now **rotates instead of standing up** between connectors. One module can also dock its end into the **side connector of a standing partner module** (82% of the finished docks).  
  
**What does not work yet:** **end↔end** joining (0 successes so far, causes understood, see §14), and therefore **no shape change** (snake, cube, triangle, car, chair) yet. Weights/shaking/gravity sweeps, walls/slopes and shapes (G3, G5, G6) are not done.  
  
**Honest bottom line:** the "verbs" (dock, lock, walk, peel, judge, retry) exist and are measured. The shape-changing layer on top (which shape, which module goes where, in which order) is not built. The plan in §16 says exactly how to get there.

| Area | State | Best measured number |
|---|---|---|
| Single-module floor docking (CPU, deploy controller) | Works | 90% (54/60) on random robots |
| Single-module walking, GPU, 128 random robots | Works | 98.4% docks OK (249/253), 97.3% next run; 20 s median per step |
| "Don't stand up between connectors" | Fixed | stand-ups 59% → 11–14% of steps; typical free-end height 690 → 110 mm |
| Lock jam (fins stuck at ~4°) | Fixed | lock-stall recovery: seen working repeatedly |
| End → side receiver of a standing partner | Partly | 27/33 finished docks OK (82%); many unfinished at time limit |
| End ↔ end | Not yet | 0 OK; static fit proven flush; dynamic failures understood |
| Weights / shaking / gravity sweeps (G3) | Randomised in every run, no dedicated sweep | — |
| Walls / slopes (G5) | Early single-robot test only | 70° across: 3/3 steps (1 robot); straight pose needs 96% torque |
| Shapes snake/cube/triangle/car/chair (G6) | Not started | — |
| Studio: new 7-DOF module as default | Done | 5/5 tests, typecheck clean |
| Studio: MSRR page on new module | Not done | still old 6-rod model; VS Code prompt written (Appendix C) |

## 2. Your goals G1–G6 and their status

These are your words (25 Oct, 15:24 and 15:35 IST), turned into a numbered list I tracked:

| \# | Your goal (your words, shortened) | Status at handoff | What is left |
|---|---|---|---|
| G1 | "Efficient moving of 1 module… nice demo of its moving from connector to connector." Earlier: it should not stand up straight between connectors; no weird shapes before docking. | Mostly done in sim | First dock from the straight start is slow (median 20 s, 90% within 59 s) because camera checks repeat; ~2.5% of first docks land on pad tops; joint-travel "detour" median 2.0× (now from the rotating swing, by design). |
| G2 | "Demoing the connections… side to end, end to side, end to end… try testing all possible combinations." Rule you gave: end↔end and end↔side connect; side↔side never. | End→side partly; end↔end not yet | End↔end with a partner that is supported and stiff (§14.1), side→end (partner docks into walker's spine), then all combinations as a measured "verb library". |
| G3 | "Multi weight, shaking, centre of gravity… gravity and all my error things." | Randomisation built in | Dedicated sweeps: payload mass on links, floor shake amplitude/frequency, gravity tilt, magnet strength; report success vs each. |
| G4 | "From now on only use GPU, Warp… many robots, many iterations… 2 mins… verify, tune, test again." | Pipeline works | Speed: ~18 robot-seconds/second walking, ~6 for 2-module worlds; CPU "brain" is the bottleneck. Batched (GPU) controller would give ~50×. |
| G5 | Walls / slopes / ceilings. | Early test | Gravity-vector sweeps with the new walking code on GPU; continuous camera feedback needed on slopes (§14.6). |
| G6 | "Shapes like snake, cube, triangle… then car, chair." Plus your planner goal: prompt "become a car". | Not started | Needs reliable end↔end + side connections, then the layered planner in §16. |

**Why it took long.** Almost every new connection type exposed a real physical problem — the partner sagging, twist joints hitting their ±180° stops, the free end hitting the partner, lock fins jamming, a contact bug in my own simulation, and the robot standing up between steps. Each one needed a diagnosis, a fix and a re-run. That is normal for this kind of robot (you said it yourself: nobody is doing this), but it means the shape layer was never reached.

## 3. History — what happened, day by day

### Before this session (14–19 Oct)

- **16 Oct:** you taught me your design standards photo by photo (fits, screw holes, ST3215 mounting, joint bearing paths, double-fin lock, split-for-repair, failure history). Saved as the skill tetrobot-design-standards.
- **19 Oct:** you set the rule that simulation must be real physics (motors drive only their own part; everything else moves by contact and friction, never hard-coded couplings). Simulation stack researched (MuJoCo, Newton, Isaac Sim/Lab, PyChrono).

### 24 Oct — module setup and first docking

- Fusion file try8: identified bodies, made 10 components, added the 9 revolute joints (2 locks ±45°, 3 twists ±180°, 4 bends ±95° at the time), exported meshes + mass properties to Downloads\TETROBOT_Module_try8.
- Real module weighed by you: **1134 g**. Connector geometry measured with exact Fusion boolean checks (report: project doc connector-lock-model.md). Rotor fin fix (moved 0.5 mm outward).
- MuJoCo model built (build_mjcf.py → tetrobot_scene.xml → build_v2.py → train_v2.xml) with PLA flex joints, backlash, ST3215 servo model, connector pads in 3 layers, fins as curved slices, magnets with N/S polarity.
- RL docking tried on CPU and GPU (runs in C:\TETROBOT\runs); RL plateaued at ~33%, so a **sag-aware IK controller** became the main brain. Overnight: 91% docked on GPU (512 robots), 90% with the real deploy code. Found that **floor tilt** of 0.8° moves the end ~3 mm (measure it with a phone level).

### 25 Oct (day) — walking, gentle motion, real-robot tools

- Gentle motion (35°/s max, 16 mm/s touch, 26 N worst touch) — protects PLA and horn screws.
- Inchworm walking over floor connectors with the "judge" (camera / you / simulated camera). ~85% per dock on CPU with random robots; peel-off (tilt 12° about the rim) because the magnets need ~9 N·m to pull straight.
- Slopes/walls first test; calibration tool deploy\calibrate.py; real-robot walking runner deploy\walk_real.py (DRY_RUN).
- Walking ported to GPU (gpu_walk.py) — physics on GPU, the exact walking code on CPU workers.

### 25 Oct (afternoon/evening) — multi-module, Studio, GPU at scale

- Side receivers registered from CAD (0.24 mm fit); two-module scene and env (build_multi.py, multi_env.py).
- **Studio:** replaced the old 6-DOF default module with the real 7-DOF try8 (meshes and spec in D:\robo4\assets\tetrobot-module); tests; VS Code prompt for the MSRR port.
- mujoco 3.17 / warp 1.18 / mujoco-warp 3.17 upgrade (Windows Smart App Control blocked the new DLLs; you turned it off).
- Reach sweeps: only 18/144 side receivers reachable on an upright partner; 59/1536 feasible in the bigger sweep. End→side physics docks work on feasible poses.
- **Bend limits changed to ±90°** (your instruction, 20:55).
- GPU walking: 93.8% → 97.5% (lock-stall recovery) → 98.4% (rotate swing). Measured and fixed "stands up between connectors".
- End↔end: found and fixed a sim contact bug (ends passed through each other); static fit proven flush; dynamic tests still 0% (partner sag; partner lying too low; lying-and-bent-up partner deflects sideways).
- You set a 4–6 h deadline for G1–G6 with a supervising check every 15 min. I said G6 in that time was not realistic; work continued until the last run (lying-partner, End A up) finished at ~23:30.

### 26 Oct 07:30 — you asked me to stop and write this report.

All runs stopped, no scheduled tasks remain.

## 4. Everything you taught me about the robot

### 4.1 The module (Fusion "try8")

| Item | Value / fact |
|---|---|
| Chain | End A lock – T1 – B1 – B2 – T2 – B3 – B4 – T3 – End B lock (symmetric about T2) |
| Servos | 9 × Feetech ST3215 (30 kg·cm; ~2.7 N·m usable at 11.1 V, 2.94 at 12 V): 3 twist, 4 bend, 2 lock |
| Joint limits | Twist ±180° (no wrap; controller keeps 30° away, ±150°); **Bend ±90°** (changed from ±95° on 25 Oct; controller uses 2% margin = 88.2°); Lock ±45° |
| Bodies (components) | EndA_LockModule, L1_LockRotor_A, T1_Housing_B1Fork, Spine1_B1B2, T2_Housing_B2Fork_GROUND, T2_Ring_B3Fork, Spine2_B3B4, T3_Housing_B4Fork, EndB_LockModule, L2_LockRotor_B |
| Mass | 1134 g real (scale). PLA, 2 walls, 15% infill. ~55 g per servo. |
| Length | ~0.67 m straight (sim: End A pad tip to End B pad tip ≈ 0.684 m when standing) |
| Spines | Spine1 between B1/B2, Spine2 between B3/B4. Each carries 2 side receivers on opposite faces → 4 side receivers. LiPo (3S, ~50 g) in Spine1, ESP32-C3 + buck in Spine2. |
| Bends | Each pair of bends shares a spine; the two bend axes are parallel. The fork that bends is also the housing of the next twist motor. No bearings (PLA ring friction). |
| Twists | Horn drives the holder directly; a large PLA ring carries bending load by friction; earlier shaking fixed with bowl + two clamp halves. |
| Control | Laptop runs the brain; ESP32-C3 (firmware D:\robo4\firmware\esp32_multi) only links: sync-reads all servos every 60 ms, /api/batch = SyncWritePosEx, 1 Mbaud bus. |

### 4.2 Connectors and lock (measured from CAD)

| Feature | Value |
|---|---|
| Receiver (floor and spine side — identical geometry, registered to 0.24 mm) | Gap floors 6.3 mm above back face, pad tops 15.3 mm (pads 9 mm tall), 4 pads at 0/90/180/270°, ±20°, r 25–35 mm |
| Pocket in each pad | z 9.0–12.6 mm, inner wall steps r25→r29 (4 mm deep); lip z 12.6–15.3 is what fins hook under |
| Magnets | 8 × Ø8×1 mm at r 30 mm, every 45° (pad tops + gap floors); N on pads/top, S on gaps/bottom; ~4.6 N per pair at contact, ~1.5 mm decay, 20 mm cut-off; attraction starts ~1 cm |
| End connector | **Same pads/pockets/magnets as a receiver** + lock rotor. Pad tips 9 mm proud of its gap floors. Rotor fins r 21–28.5 mm, ±21°, top 6.0 mm above its gap floor (3 mm below its pad tips). Turns 45° either way. |
| Fit checks | Fin-to-pocket-floor clearance 0.30 mm; lock play 0.5 mm before fins bear on the lip; 10° of turn already blocks pull-off. |
| Side receiver pose (sim, spine frame) | origin (±25.0, 80.4, 0) mm, normal = ±spine x, slots at 45°+90k |
| Connection rules (yours) | end↔end ✔, end↔side ✔, side↔side ✘ (only ends have locks). Docking = align normals with 45° pad/gap offset at a gap, move straight in, magnets grab, rotor turns 45°. |
| End↔end (verified in sim 25 Oct) | Two ends seat flush (pad tips on the other's gap floors, 0.02 mm), and a rotor turns ±45° without hitting the other end's fins. |

### 4.3 Real-world behaviour you told me

- PLA flexes: joints wobble ~0.2° off-axis; tip error 2–4° when extended; finger push on the straight module: top deflects ~5–6° in the bend plane, ~3° in the other; twists ~1° friction play.
- Tip shake is pendulum-like (2–4°), only after a move, then settles.
- Bend servos lack torque (warm, sometimes can't lift the module); the module **can't hold itself horizontal**; on walls/slopes it must stay curled.
- End connector shakes a lot while docking; lock play 0.1–0.5 mm under load.
- Floor connectors are glued to cardboard; their coordinates are fixed (hard-codable) but the board may be lifted, moved or shaken — must self-correct.
- Real moves must be slow and gentle (fast moves tear horn screws out of PLA).
- Third-person camera planned (ESP32-CAM or webcam), any angle; AprilTags OK later. It must catch "thinks aligned but 5° off" and "thinks docked but isn't" and then NOT turn the lock.
- Payload limit \< 3 kg; torque-vs-weight is your \#1 known problem, docking misalignment \#2.

### 4.4 Walking requirements (yours)

- Between connectors the module should **not stand up straight**; it should simply rotate and connect.
- No weird intermediate shapes before docking.
- Cycle you described: dock one end, unlock old base, back straight out 2–3 cm, swing to the next connector; roles swap every step; later slopes, walls, air docking.

### 4.5 Shape-change planner goal (yours)

- Prompt "become a car/chair" → modules self-reconfigure with whatever modules exist; can leave extras out; must consider previous shape, environment, supports, history.
- Your earlier VS Code planner (target shapes as cubes filled with modules) failed. The layered design discussed in your other chat (intent → shape picker → reconfiguration search → GPU rehearsal → executor) is the agreed direction (§16).

## 5. Your working rules and preferences (I followed these)

| Rule | Meaning in practice |
|---|---|
| Real physics only | No hard-coded joint couplings; locks hold only by fin contact; magnets as forces. |
| Fully realistic from the start | Servo speed/accel/torque droop/voltage sag, encoder noise, delay, PLA flex, backlash, pushes, tilt — always on. |
| Latest software, never downgrade, no venvs, one Python | System Python 3.12 has mujoco 3.17 / warp 1.18 / mujoco-warp 3.17. |
| Visible work | Runs open in titled PowerShell windows on the laptop; logs in C:\TETROBOT\logs. |
| Every update in plain words | What runs, why, goal, how long, how it works, what next. |
| GPU only (from 25 Oct 15:35) | Physics at scale on MuJoCo Warp; geometry-only sweeps (IK + collision) stayed on CPU (explained to you). |
| Fusion | Only the file you name; never touch motor1, motor2, pgear4, pgear3 scaling. |
| Shell commands | One combined line. |
| Web-verify facts | Versions/specs checked online before stating. |
| Don't waste time; self-check | Every result checked against logs; failures diagnosed before claiming. |

## 6. Where every file is, and how I accessed them

**In plain words.** I am a cloud program. I reached your laptop through the Claude desktop app's link (it gives me a PowerShell on your laptop and file read/write), and Fusion and Chrome through their own connectors. Everything I made lives on your laptop in two places: **C:\TETROBOT** (simulation + robot brain — the working copy) and **D:\robo4** (your Studio — the new module files and tests). VS Code Claude can open both folders directly.

### 6.1 C:\TETROBOT (the simulation and robot brain — canonical, newest code)

| Folder / file | What it is |
|---|---|
| **sim\\** | All simulation code, models (.xml), sweeps, GPU runners, task lists (.csv). ~208 files. |
| sim\build_mjcf.py | Builds tetrobot_scene.xml from the Fusion export (Downloads\TETROBOT_Module_try8\mass_properties.json + STL meshes) and physics_params.json (kp, armature, friction, backlash, flex stiffness). |
| sim\build_v2.py → train_v2.xml | Adds accurate connector/pad/fin collision geometry, base tilt/lift springs, floor receiver. |
| sim\tetro_env2.py | Single-module docking env (CPU); defines servo model constants, magnet constants (MAG_F0, MAG_D0, MAG_CUT), RX_GAP/RX_TOP, the nominal model NOM used by the controller (FK with sag, IK). |
| sim\build_walk.py → walk_train.xml, walk_long.xml… | Free-floating module (both locks mirrored) + several floor receivers in a row (walking scenes). |
| sim\walk_env.py | Walking physics env (CPU): servo model, magnets with polarity, receivers, pushes, tilt. |
| **sim\walk.py** | **Walking logic = the "verbs"**: Walker class (dock, peel, pull-out, lift, swing, step_to, dock_fns with lock-stall recovery, sim_camera judge, metrics). |
| sim\build_multi.py → multi_train.xml, multi_reach.xml, multi_reach2.xml | Two modules (prefix m1\_ for the partner), side receivers as spine child bodies, floor receiver grids. multi_reach2 = rx0 + 32 floor spots. |
| **sim\multi_env.py** | Multi-module env (CPU): moving receivers (side receivers + every module end as a target), partner servo holding, magnets with reaction forces, END_END_CONTACT fix. |
| sim\lying.py | place_lying(): partner lying on the floor, rolled, servos slowly move it into a pose. |
| **sim\gpu_walk.py** | GPU walking: N random robots, physics on GPU, Walker on CPU workers (greenlets), streamed logs, per-robot JSON. |
| **sim\gpu_multi_dock.py** | GPU two-module docks from a task CSV (standing partners, lying partners, roll, poses, targets srx0–3 / endA / endB). |
| sim\reach_side.py, reach2.py, reach_end.py, reach_lying.py, check_lying_up2.py | Geometry-only feasibility sweeps (IK + collision). Results in logs\\.csv. |
| sim\dock_side.py | Single CPU physics dock test (env vars SPOT, PYAW, TARGET, QDEG, XML, JUDGE, MAXF, DBG). |
| sim\check_endt.py, check_endend_seat.py, check_endA_seat.py | Static checks of end-connector frames and flush seating. |
| sim\walk_metrics.py | Reads a GPU walking log: standing-up height, joint-travel detour ratio, step times, failure kinds. |
| sim\set_bend_limit.py | Applied the ±90° bend change to every model (backups in sim\backup_bend95). |
| sim\tasks\_\*.csv | Task lists for gpu_multi_dock (endside, endend, lying, lying_up, multi1). |
| **deploy\laptop_controller.py** | **The docking controller** used in sim AND for the real robot (DockController; real-robot I/O to the ESP32; --sim N self-test). DRY_RUN by default. |
| deploy\calibrate.py, walk_real.py, \_fake_esp.py | Guided calibration → robot_config.json; real-robot walking runner (you as judge); fake ESP for testing. |
| deploy\laptop_controller_v1…v6, \_EXPERIMENT\_, \_IDEA_hall | Old versions and experiments kept for comparison. |
| logs\\ | Every run's console log, per-robot logs/JSON, sweep CSVs (608 files). |
| runs\\ | RL training runs (dock_v1–v4, dock_gpu, dock_ikrl) — not needed now. |
| dashboard\\ | Sim Lab dashboard (served at 127.0.0.1:8765), monitors. |
| lessons\\ | tetrosim results/README from the 19 Oct setup. |
| \_to_delete\\ | Old side folder of Python packages (py317) — safe for you to delete. |

### 6.2 D:\robo4 (your Studio)

| Path | What |
|---|---|
| assets\tetrobot-module\meshes\\.stl | 9 centred STL meshes of try8 (T2 and T3 housings share one mesh). |
| assets\tetrobot-module\module_spec.json | Limits (twist ±180, **bend ±90**, lock ±45), joint order, connector frames, receiver data, masses, straight length. |
| assets\tetrobot-module\legacy\single-module-demo.6dof.json | Backup of the old 6-DOF default module. |
| studio\src\core\factory\single-module-demo.json | The new default module document (bodies, joints, profiles, connectors, embedded STLs, ~11 MB). |
| studio\src\core\factory\defaultModule.ts | localStorage key changed to tetrobot.defaultModule.v2 (old v1 overrides dropped). |
| studio\src\core\factory\defaultModule.try8.test.ts | 5 tests (structure, limits, contiguity+mass, bend pivot, connector frames). Run: npx tsx --test … |
| studio\src\robotics\msrr\\, features\msrr\\ | Your MSRR planner — still on the old 6-rod abstract module (modulink.ts). |
| brain\\ | Older copies (25 Oct ~14:20) of walk.py, laptop_controller.py, etc. for the Walk tab. **Newer versions are in C:\TETROBOT** — re-copy before using. |
| firmware\esp32_multi | The current firmware (do not use the other esp32 folders). |
| docs\TETROBOT_HANDOFF.md / .pdf | This report. |

### 6.3 Other places

- C:\Users\NISCHAY SAI D R\Downloads\TETROBOT_Module_try8\\ — Fusion export: mass_properties.json (bend limits now ±90), urdf\meshes, .3mf, .usdz, full .f3d backup.
- claude.ai Project "TETROBOT" docs: claude/overnight-report.md, walking-report.md, connector-lock-model.md, multi-module-status.md.
- Claude memory (project): module joints, walking, Studio, camera, transformation planner, preferences.

### 6.4 How I accessed things (so VS Code Claude can do the same locally)

| Tool | Used for | Local equivalent in VS Code |
|---|---|---|
| Desktop-commander (PowerShell on your laptop) | Running Python, reading/writing files, starting titled visible windows | Claude Code's own terminal (Bash/PowerShell) directly |
| Fusion MCP (read/execute) | try8 joints, components, measurements, boolean fit checks | Fusion MCP connector if installed in VS Code Claude |
| Claude in Chrome | Checking Studio at localhost:5173 | Your browser; or Playwright |
| Projects + memory tools | Reports and durable facts | This handoff file |

Launch pattern for a visible run: Start-Process powershell -ArgumentList '-NoExit','-Command',"cd C:\TETROBOT\sim; python gpu_walk.py 128 12 2\>&1 \| Tee-Object C:\TETROBOT\logs\X.log"

## 7. Software stack and laptop setup

| Item | Version / state | Notes |
|---|---|---|
| Laptop | HP Omen, Windows 11, Ryzen 7, 24 GB RAM, RTX 5050 Laptop 8 GB (sm_120) | RAM got tight (1.6 GB free) when a 128-robot GPU run and other apps were open — run big jobs one at a time. |
| Python | 3.12 (system), no venv | The only Python: Isaac Sim requires exactly 3.12. LeRobot runs in D:\lerobot\.venv312. |
| mujoco | **3.17.0** | Upgraded 25 Oct. Same physics as 3.12 on the smoke test; ~20% faster. |
| warp-lang | **1.18.0** | CUDA toolkit 13.4 / driver 13.4. |
| mujoco-warp | **3.17.0** | Kernels cached in AppData\Local\NVIDIA\warp\Cache\1.18.0 (first run compiles ~2 min). |
| Isaac Lab / Isaac Sim | Lab 3.0.0, Sim 6.2 | They pin mujoco 3.12 / warp 1.17 — pip warns, but import isaaclab still works. If Isaac ever breaks, this is why. |
| Windows Smart App Control | **Off** (you turned it off) | It blocked freshly installed unsigned DLLs ("Enterprise signing level"). Keep off for dev work. |
| Node / Studio | Vite + React/TS + Three.js + Rapier | npm run typecheck, npm test (tsx --test). |

## 8. How the simulation is built

**In plain words.** The simulation is a "digital twin": each printed part is a rigid body with its real weight; each servo is a motor that behaves like an ST3215 (limited speed, acceleration, torque that drops with speed and battery sag); the PLA brackets are springs that bend a little; gears have a little slop; the connector pads, pockets, lips and lock fins are real shapes that collide; the magnets are forces between real magnet positions with N/S polarity. Nothing is glued: a lock holds only because the fins are under the lips.

(diagram: see the PDF)

**Technical details.**

- **Timestep 1 ms**, implicitfast integrator. Controller frame = 60 ms (60 substeps), matching the ESP32's 60 ms sync-read. **2 ms was tested on GPU and rejected** (0/64 docks vs ~82% at 1 ms).
- **Servo model** (per actuator, every 5 ms): setpoint moves with max speed w0 (scaled by voltage sag: V = 11.1 V − 0.08·I, I from total actuator force / KT), max acceleration ACC_RAD, torque limit drops linearly with speed (≥8%) — torque–speed curve. Position actuator kp 80, kv 1.
- **PLA flex**: two passive spring joints perpendicular to each motor joint (flex_k_bend 39.4, flex_k_twist 59.2, flex_k_in 67.6 N·m/rad, ±3°); **backlash** joints ±0.2° (twist ±0.5°); base lock tilt springs 150–300 N·m/rad and 0.5 mm lift play.
- **Contacts**: pads in 3 layers (root/pocket/lip), fins as 5×2 curved slices; contype/conaffinity bits: module bodies 1/3, end connector geoms 6/7 (after the END_END_CONTACT fix), receiver geoms 2/5.
- **Magnets** (custom force, every substep): for each end, nearest receiver within 50 mm; each of 8 magnets pairs with the nearest magnet; force F0/(1+sep/D0)³·exp(−(lateral/6 mm)²), attract if opposite polarity; lateral pull term; reaction force on moving receivers (partner bodies).
- **Randomisation per robot**: flex stiffness ×0.6–1.5, flex damping ×0.6–1.8, backlash ×0–2, joint friction ×0.6–1.5, actuator gain ×0.75–1.25, torque limit ×0.75–1.0, masses ×0.92–1.08, friction ×0.7–1.4, gravity tilt 0–1.5°, magnet strength ×0.6–1.4, magnet recess 0–0.6 mm, command delay 1–3 frames, encoder noise 0.5–3 mrad + 0.088° quantisation, observation lag 0–2 frames, random pushes (0–3% chance per frame, ~1 N, 2–5 frames), receiver map error ≤1.5 mm.
- **Receivers as data** (env.rx list): floor rx (static), side receivers srx0..3 per module (move with the spine), and **every module end** (endA/endB, receiver-equivalent frame: z = outward axis, seat = pad tip − 9 mm). Fields: seat, z, R, o, mags.

## 9. How the docking controller works (deploy\laptop_controller.py)

**In plain words.** Every 60 ms the brain: (1) reads the 9 servo angles, (2) works out where the end really is — including how much the PLA bends under gravity and which way the gear slop sits, (3) nudges a "pretend" arm pose a small step toward the goal, (4) slowly learns a correction for what the model gets wrong, and (5) sends the new angles to the ESP32. It first lines the end up a little above the connector with the 45° pad offset, waits until it is steady, lets the camera check, then goes straight in, and only turns the lock if the camera confirms it is seated.

(diagram: see the PDF)

**Technical.**

- **Estimator (NOM.\_fk)**: nominal MuJoCo model; joint angles from encoders; gravity load via mj_rne on every flex/backlash/base joint → static deflection (load/stiffness) and backlash sign → sag-aware end pose. Same code runs on the laptop for the real robot.
- **IK**: damped least squares on a 6×7 numeric Jacobian (position ×1000, orientation ×60, damping 4); **LIMIT_GUARD** down-weights twist joints within ~15° of a stop (the 7th DOF is the spare). Seed pose from least-squares IK (NOM.\_ik, slot error and twist margin ±150° in the residual, 6 random seeds).
- **Integral correction**: when still (speed \<0.05, lag \<3 mrad), an offset grows 10% of the IK step toward the measured error (clipped ±0.08 rad) → cancels droop/sag the model gets wrong.
- **Motion limits**: JMAX 0.6 rad/s, JACC 1.5 rad/s², coordinated (one speed scale for all joints); go-in 1.5 mm/frame (25 mm/s), joint steps ≤0.015 rad/frame.
- **Hover gate**: estimate within HOVER_TOL 6 mm (or JUDGE_SETTLE 3 mm with a judge), tilt/slot \<3° (\<1° with judge), speed \<0.03, lag \<LAG_TOL, for 6 frames; with a judge, after JUDGE_WAIT frames unsettled it falls back to the 6 mm test.
- **Judge**: judge('hover') returns real tip-minus-aim, twist error, tilt; corrections up to 6 times (JUDGE_TOL 2 mm, 1.5°, 0.5°). judge('seat') returns seated? (sim: \|gap+noise\| \<0.6 mm and side \<1.5 mm); not seated → back off and shift; 3 retries then phase 3 (give up, no lock). Real robot: you or the camera.
- **New switches tonight** (all env vars, defaults keep old walking behaviour unless stated): HOVER_FAR (stand-off before hover), LAG_TOL (0.003; 0.015 for stretched multi-module poses), JUDGE_SETTLE 0.003 + JUDGE_WAIT 60 (was 0.0015/120 — first docks were wasting 7–15 s per camera check), via flag (waypoints only need 15 mm), push_extra + lock_wait (used by lock-stall recovery), DBG_GATE (prints the gate every 20 frames).

## 10. How walking works (sim\walk.py) and tonight's fixes

**In plain words — one step of the inchworm:** (1) the free end docks into the next connector and its lock turns 45°; (2) the old base end unlocks; (3) it **peels** off (tilts 12° about its rim, then lifts — pulling straight would need ~9 N·m against the magnets, the servos have 2.7); (4) it pulls out ~25 mm and **curls up** 8 cm; (5) it **swings** over the next connector; (6) it docks there; then the roles swap. Because the module is perfectly symmetric, the same controller runs from either end with the joint order reversed.

### Fixes made on 25 Oct night (all measured on 128 random robots)

| Problem you saw / I measured | Cause | Fix (setting) | Result |
|---|---|---|---|
| Robot stands up straight between connectors; weird shapes | Swing target pose was any IK solution (often the mirror-image bend); moving there in joint space passes through upright | **Rotate, don't stand up**: keep the curled shape, turn base twist T1 toward the next connector (search −180…180° in 10° steps), small IK correction from that seed only; fallback to old method (SWING_ROTATE=1) | Stand-ups 67/114 (59%) → 19/138 (14%) → 11/104 (11%); typical free-end height 690 → 110 mm; worst detour 6.1× → 3.3× |
| Lock fins stuck at ~4° although seated (gap ~0.55 mm) | End sits ~0.5 mm high; fins hit the lip (0.3 mm clearance) | **Lock-stall recovery** using lock servo position feedback: if lock \<40° for 12 frames → lock back to 0, push 0.6 mm deeper, wait 10 frames, retry; 2nd retry turns the other way (LOCK_RETRIES=3) | 93.8% → 97.5% docks OK; recoveries seen in logs |
| Robots froze at a mid-air waypoint | Waypoints used the strict docking gate | Waypoint gate 15 mm (C.via) | No waypoint freezes in later runs |
| First docks slow (repeated camera checks, 7–15 s each) | Strict 1.5 mm self-settle before every camera check | JUDGE_SETTLE 3 mm, JUDGE_WAIT 60 frames | Implemented; **not yet measured** (next run) |
| Reports lost when a GPU run hit its time limit | Logs only sent at the end | Logs streamed every frame; per-robot JSON; controller decisions (judge, seat, lock) kept in the log; status line every 24 s | Failure analysis now possible |

### Metrics now printed for every step

End B docked at rx1: OK \| gap 0.22 mm, side 0.11 mm, lock 45 deg, 37.4 s, free end max height 693 mm, joint travel 399 deg vs direct 263 deg — read with python walk_metrics.py C:\TETROBOT\logs\gpu_walk\_\<TAG\>.log.

## 11. Multi-module: partners, side receivers, end↔end

**In plain words.** The "walker" (module 0) stands with End A locked in a floor connector. A "partner" (module 1) either stands in another floor connector holding a pose with its own servos (so it sags and wobbles realistically), or lies on the floor. The walker docks its free End B into the partner's side receiver or the partner's end.

| Connection | Setup | What happened | Diagnosis |
|---|---|---|---|
| End → side (upper/lower spine receivers) | Partner upright on a floor spot | Works on feasible poses: CPU 3/4 (gaps 0.04–0.73 mm, lock 45°); GPU 27/33 finished OK | Only ~4% of placements are feasible (reach, collisions, twist margin). Must pick partner placement with the sweep. HOVER_FAR 0.05 avoids hitting the partner's spine. |
| End ↔ end, partner holding its end out in the air | Partner bent (B4 90°, B3/B4 −60°, B3 90°…) | 0/96 | Partner sags/collapses 60–150 mm under random servo strength (your torque problem); walker stretched to its bend limits stalls at hover. |
| End ↔ end, partner lying flat | Partner end horizontal at 40–60 mm | 0/96 | Walker's end and housings hit the floor before reaching that height (stuck ~20 mm off). |
| End ↔ end, partner lying with End A bent UP (B1 90°, roll 90°) | End A vertical at 161 mm, like a floor receiver | 0/96 | Line-up is good (camera 1–4 mm), but going in the pads land on pads (gap ~6 mm) or the camera says "not seated, 1.5–5 mm sideways" — the partner's raised end is **soft** (held only by one bend servo + PLA flex + the lying body's friction) and gets pushed sideways during the go-in. |
| Static fit check end↔end (B into B, B into A) | Placed exactly | Flush (0.02 mm); rotor turns ±45° with no clash | Your CAD supports end↔end. |

**Sim bug found and fixed:** end-connector geoms had contype 4/conaffinity 2, so they only collided with receivers (2/5) — two ends passed through each other. Now 6/7 (switch END_END_CONTACT=1). An end's own fins vs its own pads stay excluded (parent–child).

## 12. The GPU pipeline (MuJoCo Warp)

**In plain words.** The graphics card runs the physics of many robots at the same time (up to ~50 robot-seconds of simulation per real second). The "brain" of each robot is the same Python code the real robot will run, spread over the CPU cores, talking to the GPU every 60 ms. This lets one run test 64–128 different random robots in 10–12 minutes.

(diagram: see the PDF)

| Runner | What it tests | Usage |
|---|---|---|
| gpu_walk.py | N random robots walking 3 steps over 4 floor connectors (walk_train.xml) | \$env:TAG='x'; python gpu_walk.py 128 12 → logs\gpu_walk_x.log/.json/\_robots.json |
| gpu_multi_dock.py | One dock per world onto a partner, from a task CSV | \$env:TAG='x'; \$env:HOVER_FAR='0.05'; \$env:LAG_TOL='0.015'; python gpu_multi_dock.py tasks_endside.csv 16 12 |

**Task CSV formats:** standing partner: spot,yaw,q0..q6(deg),target; lying partner: L,x,y,heading,q0..q6,target or with roll L,x,y,heading,roll,q0..q6,target. Targets: srx0–srx3, endA, endB. Spots index multi_reach2.xml floor receivers (see reach2.py for the grid).

**Measured speeds (RTX 5050):** raw physics ~40 robot-s/s (64 worlds) → 50 (256–512); walking with CPU brains 11 (64) / 18 (128) robot-s/s; two-module worlds ~6–8. Buffers: njmax 2400 (walking) / 3600 (2 modules), nconmax 400/600 — njmax 800 had silently dropped contact rows ("nefc overflow"). EPA-horizon warnings suppressed (fixed size 24, small precision cost). The CPU brain is the bottleneck: a fully batched (vectorised) controller on GPU would approach 50 robot-s/s.

## 13. All results in one place

| When | Test | Result | Log |
|---|---|---|---|
| 24 Oct night | GPU docking, 512 random robots, 90% floor / 10% air | 91.0% docked, 0.4% crash (n=1091) | overnight-report |
| 24 Oct night | Deploy controller self-test (laptop_controller.py --sim) | 54/60 = 90%, 0 crashes | overnight-report |
| 24 Oct night | Air targets only | 30–39% (up 71%, down 47%, sideways 33%) | overnight-report |
| 25 Oct day | Gentle motion | 35°/s max, 16 mm/s touch, 26 N worst, 19/20 docks | walking-report |
| 25 Oct day | CPU walking, judge, curl swing | 85% (28/33) docks, 7/12 full walks; long L path 89% | walking-report |
| 25 Oct day | Slope/wall (1 robot each) | 70° across 3/3; others timed out; straight pose needs 96% torque on walls | walking-report |
| 25 Oct 15:52 | Reach scan, upright partner, 144 cases | 18 reachable | logs\reach_side.log |
| 25 Oct 17:15 | Feasibility sweep reach2, 1536 cases | 59 good | logs\reach2.csv |
| 25 Oct 17:40 | CPU end→side physics (4 poses) | 3 OK (gaps 0.04–0.73 mm), 1 lock jam | logs\dock_s\*.log |
| 25 Oct 19:50 | End↔end geometry sweep (bent partner) | 26 good / 1600 checked | logs\reach_end.csv |
| 25 Oct 21:30 | GPU walking 64 robots, bends ±90 | 91/97 (93.8%), median 20.6 s | gpu_walk_gpu64_b90 |
| 25 Oct 22:10 | GPU walking 128 + lock-stall recovery | 231/237 (97.5%) | gpu_walk_gpu128_lockfix |
| 25 Oct 22:40 | GPU multi, 128 worlds (end→side + end↔end) | end→side 27/33 finished OK; end↔end 0 | gpu_multi_multi1 |
| 25 Oct 23:10 | GPU end↔end after contact fix (bent partners) | 0/96 | gpu_multi_endend2 |
| 25 Oct 23:30 | 2 ms timestep test (end→side) | 0/64 → rejected, stay at 1 ms | gpu_multi_endside_ts2 |
| 25 Oct 23:45 | GPU walking 128, metrics | 224/233 (96.1%); stand-ups 59% of walking steps | gpu_walk_gpu128_metrics |
| 26 Oct 00:15 | GPU walking 128, rotate swing | 249/253 (98.4%); stand-ups 14%; height 110 mm median; 14 first-dock timeouts | gpu_walk_gpu128_rotate |
| 26 Oct 00:40 | GPU walking 128, rotate + diagnosis | 215/221 (97.3%); stand-ups 11%; first dock median 20 s, 90% 59 s | gpu_walk_gpu128_rotate2 |
| 26 Oct 01:00 | Lying-partner end↔end sweep, 512 | 12 good (all endA) | logs\reach_lying.csv |
| 26 Oct 01:20 | GPU end↔end lying flat | 0/96 (stuck ~20 mm, floor) | gpu_multi_lying1 |
| 26 Oct 01:45 | GPU end↔end lying, End A bent up | 0/96 (lands on pads / sideways push) | gpu_multi_lyingup1 |

## 14. Open problems and what is known about each

### 14.1 End↔end docking (blocks G2 and G6)

**Plain words.** The connectors fit perfectly. The problem is that the partner end is not a steady target: when it is held up by one servo it sags or gets pushed away; when it lies on the floor it is too low for the walker.

**Options to try next (in order):**

1.  **Make the target stiff:** partner lying with End A up, but bend *two* joints (B1 90° and B2 small) so the raised segment leans on the floor-supported spine, or let the partner's T1 twist hold the end against a stop; verify target stiffness by pushing it 5 N in sim and measuring deflection (\<2 mm wanted).
2.  **Slower, compliant go-in for soft targets:** APPR 0.5 mm/frame for the last 10 mm and let the magnets (≈37 N at contact) pull it in; stop pushing when the partner end moves \>1 mm (measure partner displacement from its encoders — the partner is a robot too, it knows its own sag).
3.  **Partner cooperates:** both modules move toward each other (partner aligns its own end using its encoders), i.e. a two-robot dock. This is how real chains connect.
4.  **End↔end via the floor connector** as an intermediate: walker docks into a floor connector, partner docks into the walker's side receiver, then reconfigure.

### 14.2 First dock is slow (G1)

Camera checks repeat 2–6 times; 2.5% land on pad tops. JUDGE_SETTLE/JUDGE_WAIT change made but not measured. Next: run gpu_walk.py 128 12 and compare first-dock median (20 s) and 90th percentile (59 s).

### 14.3 Remaining stand-ups (11%)

When the rotated seed can't reach (IK error \>4 mm or twist \>160°), the fallback picks any branch. Next: allow T1 rotation + one bend change in the seed search; log which fallback was used.

### 14.4 End→side feasibility

Only ~4% of partner placements are reachable without collision; a straight partner's lower receivers are mostly unreachable. The planner must choose placements from a precomputed feasibility table (sweep results).

### 14.5 GPU speed

CPU brain is the bottleneck (2-module worlds ~6 robot-s/s). Batching the controller (vectorised IK/FK in torch on GPU) is the main speed-up. A 2 ms timestep is not an option (breaks docking).

### 14.6 Slopes/walls

Error jumps 1–7 mm between corrections as loads flip backlash/lock play. Needs continuous camera feedback (visual servoing 10–20 Hz) and/or less lock play. Walls only possible if the module stays curled (straight = 96% of B1 torque).

### 14.7 Air targets (receiver held up by another module)

30–39% overall; up-facing within 25 cm ~50–70%. Design ideas for you: bigger lead-in chamfer on pads (catches a 3–5 mm miss), hall sensors (+7 points only).

### 14.8 Not verified on the real robot

Everything here is simulation. The first real dock (§18) is the most important validation.

## 15. TETROBOT Studio (D:\robo4) integration status

| Item | Status |
|---|---|
| Default module = 7-DOF try8 (Editor "Add module", Rapier viewer) | Done; tests 5/5; typecheck clean. If an old tab shows a broken module: Ctrl+Shift+R. |
| Bend limits ±90 in the Studio doc and spec | Done |
| Connector markers (pink "PLUGS") | 6 connectors: conn-endA/-endB along ±X; conn-s1a/s1b/s2a/s2b along ±Y, symmetry 4 |
| MSRR Experiments page | Still the old 6-rod abstract model (modulink.ts: RODS_PER_MODULE 6, BIG_ROD_INDEX 3, 4 side connectors on one rod). Port = Appendix C prompt. |
| Walk tab / brain | D:\robo4\brain has older copies; copy the newest walk.py, laptop_controller.py, multi_env.py, lying.py from C:\TETROBOT. |
| Fusion try8 joint limits | Still ±95° in Fusion (you didn't confirm changing them). |

## 16. The plan: from here to G6

**In plain words.** Don't build one giant AI that goes from "become a car" straight to servo angles. Build it in layers. The bottom layer is the **verbs** — dock, lock, unlock, peel, walk, swing — each with a measured success rate from GPU runs. The top layers decide **what shape** (an LLM is good at that) and **in which order** modules move (a search algorithm is good at that). Every plan is rehearsed on hundreds of random simulated robots before the real robot does it, and if a step fails on the real robot, it re-plans from what the camera sees.

(diagram: see the PDF)

### 16.1 Ordered step list (each step has a pass test)

| \# | Step | How | Pass test | Goal |
|---|---|---|---|---|
| 1 | Measure the judge-pacing change | gpu_walk.py 128 12 + walk_metrics.py | first-dock 90th percentile \< 40 s, success ≥ 97% | G1 |
| 2 | Remove remaining stand-ups | Seed search T1 + one bend; log fallback use | stand-ups \< 3% of walking steps | G1 |
| 3 | End↔end with a stiff target | Options in §14.1 (two-bend support, slow compliant go-in, partner cooperates); add a "target stiffness" test (5 N push) | ≥ 80% on GPU, 96 worlds | G2 |
| 4 | Side→end (partner docks into the walker's spine) | Swap roles in gpu_multi_dock (mod 1 moves); reuse dock_fns | ≥ 80% | G2 |
| 5 | Verb library file | verbs.json: for each connection type: feasible placement table (from sweeps), success %, time, torque margin | Planner can query "can M1.B reach M2.S3 from here?" | G2/G6 |
| 6 | Robustness sweeps | Add per-world payload mass on spines, floor shake (amp 0–3 mm, 1–8 Hz), gravity tilt 0–10°, magnet ×0.5–1.5; report success vs each | Curves per factor; failure thresholds known | G3 |
| 7 | Slopes/walls | gpu_walk with gravity vector (gvec) 10–90°; curled poses only; continuous judge | Success per angle; torque margins | G5 |
| 8 | Batched controller on GPU | Vectorise NOM.\_fk/IK and the DockController state machine in torch | ≥ 40 robot-s/s with brains | G4 |
| 9 | 3-module scene | build_multi nmod=3; MultiEnv already supports nmod | Two docks in sequence OK ≥ 70% | G6 |
| 10 | First shapes (scripted plans) | Snake (M1.B→M2.A chain on floor), L, triangle (3 modules closing a loop); write each plan as a verb list; rehearse on GPU | ≥ 70% full-shape success | G6 |
| 11 | Reconfiguration planner | Graph search over configuration graphs using the verb library as edges; cost = time × (1/success) | Finds the scripted plans of step 10 by itself | G6 |
| 12 | Intent + shape library | LLM → function spec; shape library (snake, L, triangle, square, car, chair) as graphs | "become a snake/triangle" end-to-end in sim | G6 |
| 13 | Car, chair | Needs ≥4–6 modules, wheels/tool tips or rolling gait; same pipeline | Shape holds its own weight in sim (torque check) | G6 |
| 14 | Studio | MSRR port (Appendix C), then MSRR planner calls the verb library; Walk tab uses latest code | Plan in Studio → runs in sim → runs on robot | All |

### 16.2 Rules for whoever continues (from experience here)

- Never claim a cause without a check (twice a "bug" turned out to be my test harness or my sim, not your design).
- Every new connection: first a geometry sweep (cheap, CPU), then GPU physics on the feasible cases, then read the per-robot logs before changing code.
- Keep 1 ms timestep; keep njmax large enough (watch for "nefc overflow").
- Run one big GPU job at a time (RAM).
- Every controller change behind an env switch with the old value as default until measured on 128 robots.

## 17. Command cookbook (PowerShell, from C:\TETROBOT\sim)

    # GPU walking, 128 random robots, 12-minute cap (visible window)
    Start-Process powershell -ArgumentList '-NoExit','-Command',"cd C:\TETROBOT\sim; `$env:TAG='walk1'; python gpu_walk.py 128 12 2>&1 | Tee-Object C:\TETROBOT\logs\walk1_console.log"

    # Read walking metrics (stand-up height, detours, failures)
    cd C:\TETROBOT\sim && python walk_metrics.py C:\TETROBOT\logs\gpu_walk_walk1.log

    # GPU two-module docks from a task list (16 robots per task, 12 min)
    cd C:\TETROBOT\sim; $env:TAG='es1'; $env:HOVER_FAR='0.05'; $env:LAG_TOL='0.015'; $env:MAXF='900'; python gpu_multi_dock.py tasks_endside.csv 16 12

    # Single CPU dock onto a partner (spot 26, yaw 315, side receiver srx1), debug prints
    cd C:\TETROBOT\sim; $env:XML='C:\TETROBOT\sim\multi_reach2.xml'; $env:SPOT='26'; $env:PYAW='315'; $env:TARGET='srx1'; $env:HOVER_FAR='0.05'; $env:JUDGE='1'; $env:DBG='1'; python dock_side.py

    # Static end-to-end fit check
    cd C:\TETROBOT\sim && python check_endend_seat.py

    # Feasibility sweeps (geometry only)
    cd C:\TETROBOT\sim && python reach2.py          # end->side, writes logs\reach2.csv
    cd C:\TETROBOT\sim && python reach_lying.py     # end<->end onto lying partner
    cd C:\TETROBOT\sim && python check_lying_up2.py # partner End A bent up

    # Deploy controller self-test on random sim robots
    cd C:\TETROBOT\deploy && python laptop_controller.py --sim 30

    # GPU raw physics speed
    cd C:\TETROBOT\sim && python gpu_walk_bench.py 256

    # Studio tests
    cd D:\robo4\studio && npx tsx --test src/core/factory/defaultModule.try8.test.ts && npm run typecheck

## 18. Real-robot path (when you are ready)

1.  **Calibrate:** python C:\TETROBOT\deploy\calibrate.py — servo IDs (wiggle), home (hold straight, fins open), directions (3D window vs real joint), lock direction → robot_config.json.
2.  **Measure:** receiver positions on the board (RECEIVERS / RX_POS, RX_YAW_DEG) and floor tilt with a phone level (FLOOR_TILT_DEG, FLOOR_TILT_DIR_DEG) — 0.8° tilt = ~3 mm error.
3.  **Self-test:** python laptop_controller.py --sim 30 (~90%).
4.  **Dry run:** DRY_RUN=True prints the /api/batch commands.
5.  **First real dock** at 20–25 cm, hand on the power switch. You act as the judge (Enter, or x+3 y-2 r+2; seated y/n).
6.  **First real step**: walk_real.py (DRY_RUN first). Note: walk_real.py predates tonight's fixes (rotate swing, lock-stall recovery, judge pacing are in walk.py/laptop_controller.py; make sure walk_real uses the current walk.py).
7.  **Camera** (AprilTags): replace the human judge; then continuous visual feedback for slopes/walls.

## 19. Glossary (plain words)

| Word | Meaning |
|---|---|
| Simulation / sim | The computer copy of the robot with real physics. |
| MuJoCo / MuJoCo Warp | The physics engine (Google DeepMind). Warp = the version that runs many robots at once on the graphics card. |
| Randomisation | Every simulated robot is slightly different (stiffness, servo strength, magnets…) so the brain is tested against real-world variation. |
| Docking | Bringing an end connector onto a receiver, pushing in, turning the lock. |
| Hover / stand-off | The point a few cm above the connector where the end lines up before going straight in. |
| Judge | Whoever checks alignment and seating: the camera, you, or the simulated camera. |
| IK (inverse kinematics) | Working out joint angles that put the end at a wanted position/direction. |
| Sag-aware estimate | The brain's guess of where the end really is, including PLA bending under gravity and gear slop. |
| Seed pose | The starting arm shape the brain swings to before fine alignment. |
| Twist margin | Keeping twist joints away from their ±180° stops. |
| Peel | Tilting an end off its connector instead of pulling straight against the magnets. |
| Lock-stall recovery | If the lock servo doesn't turn, back off, push deeper, try again (other direction on the 2nd retry). |
| Feasibility sweep | Fast geometry-only check of many placements: can the end reach without collision? |
| GPU run / sweep | Many random robots doing the same task at once on the graphics card. |
| Robot-seconds per second | Speed: how many seconds of robot life are simulated per real second, summed over all robots. |
| Verb | A reliable building-block action (dock to side, peel, walk step…) with a measured success rate. |
| Configuration graph | A list of modules and which port is locked to which — the shared language of the planner. |
| RL | Reinforcement learning: a neural network learns by trial and error. Tried for docking; IK + judge was better here. |

## 20. Appendix A — settings (environment variables)

| Variable | Default | Where | Meaning |
|---|---|---|---|
| HOVER_FAR | 0 | laptop_controller | Go first to hover + this distance (m) along the receiver normal, then in. 0.05 for side receivers (avoids hitting the partner). |
| HOVER_TOL | 0.006 | laptop_controller | Line-up tolerance of the robot's own estimate without a judge (m). |
| LAG_TOL | 0.003 | laptop_controller | "Arm caught up" gate (rad). 0.015 for stretched multi-module poses. |
| JUDGE_SETTLE / JUDGE_WAIT | 0.003 / 60 | laptop_controller | Settle tolerance before a camera check / frames before fallback (old 0.0015 / 120). |
| LIMIT_GUARD | 1 | laptop_controller | IK leans less on twist joints near their stops. |
| TWIST_PREF | 0 | laptop_controller | Prefer small twists in seed choice (off — made T2 hit its stop). |
| JMAX | 0.6 | laptop_controller | Max joint speed rad/s. |
| DBG_GATE | 0 | laptop_controller | Print hover-gate values every 20 frames. |
| SWING_ROTATE | 1 | walk.py | Swing by turning the base twist, keep the curled shape. |
| LOCK_RETRIES | 3 | walk.py | Lock-stall recovery attempts (0 = off). |
| PEEL_DEG | 6 | walk.py | Peel tilt for undocking (0 needs magnets 1 mm deeper). |
| MAG_RECESS_MM | 0 | envs | Extra magnet recess (simulate deeper pockets). |
| END_END_CONTACT | 1 | multi_env | End connectors collide with other ends. |
| TIMESTEP_MS | 1 | gpu_multi_dock | Physics step. Keep 1 (2 breaks docking). |
| NJMAX / NCONMAX | 2400/400 walk, 3600/600 multi | GPU runners | Constraint/contact buffers per world. |
| TAG, SEED, WORKERS, JUDGE, MAXF | —, 7/11, 14, 1, 900 | GPU runners | Run name, randomisation seed, CPU worker processes, judge on/off, frame limit per dock. |
| XML, SPOT, PYAW, TARGET, QDEG, QP, DBG | — | dock_side.py | Scene, partner floor spot, yaw, target receiver, partner pose (deg), named pose, debug. |
| BUDGET, STAND, TWMAX | —, 0.05, 150 | sweeps | Time limit (s), stand-off distance, max twist allowed. |

## Appendix B — file inventory (C:\TETROBOT\sim)

**Core (keep):** build_mjcf.py, build_v2.py, build_walk.py, build_multi.py, build_studio_module.py, physics_params.json, pad_hulls.json, tetro_env2.py, walk_env.py, walk.py, multi_env.py, lying.py, gpu_walk.py, gpu_multi_dock.py, tetro_gpu.py, walk_metrics.py, set_bend_limit.py, dock_side.py, reach_side.py, reach2.py, reach_end.py, reach_lying.py, check_endt.py, check_endend_seat.py, check_endA_seat.py, check_lying_up2.py, tasks\_\*.csv, models (tetrobot_scene.xml, train_v2.xml, walk_train.xml, walk_long.xml, multi_train.xml, multi_reach.xml, multi_reach2.xml), watch_walk.py (viewer), walk_test.py, walk_stats.py, slope_test.py, gpu_walk_bench.py.

**Diagnostics / history (can archive):** \_patch\_\*.py, \_refactor_dockfns.py, \_probe.py, \_run_rigid.py, \_smoke_walkview.py, \_to_robo4.py, ab_test.py, air\_\*.py, approach_demo.py, audit\*.py, bench_gpu.py, bias_check.py, check_endend\*.py, check_lying_up.py, check_v2.py, cpu_check\*.py, deploy_diag.py, est_ab.py, eval\_\*.py, extract_module.py, fix\_\*.py, fk\_\*.py, gentle_mixed.py, gpu_bench\*.py, gpu_diag\*.py, gpu_env_test.py, gpu_lock_check.py, gpu_match.py, graph_test.py, hover_ab.py, ik\_\*.py, isaac_walk_view.py, light_worker.py, live_viewer.py, load_sig.py, lock_test.py, logstd.py, make\_\*.py, measure\_\*.py, mjw_probe.py, multi_smoke.py, ray_rx\*.py, reach_refine.py, record_walk.py, register_side\*.py, rock\*.py, sag\_\*.py, servo_test.py, settle_test.py, slope_diag.py, smoke_v2\*.py, speed_test.py, status.py, step1_dbg.py, stuck_diag.py, sym_check\*.py, test\_\*.py, tetro_env.py, torque_map.py, train\_\*.py (RL), v2\_\*.py, verify_service.py, walk_diag.py, walk_live.py, walk_stand_test.py, watch_dock.py, watch_policy\*.py, weld_test.py.

## Appendix C — prompt for VS Code Claude (MSRR port + connections), updated

    You are working in D:\robo4 (TETROBOT Studio + brain). Read D:\robo4\docs\TETROBOT_HANDOFF.md first.
    The module changed. The old 6-DOF module (3 bends, all 4 side connectors in one place like cube faces) is DISCARDED. The real module is "try8", 7 DOF.

    READ FIRST: D:\robo4\assets\tetrobot-module\module_spec.json and the STLs in D:\robo4\assets\tetrobot-module\meshes\. All 3D files live inside D:\robo4.
    The Studio default doc is D:\robo4\studio\src\core\factory\single-module-demo.json (legacy 6-DOF backup in assets\tetrobot-module\legacy\).
    Test: studio/src/core/factory/defaultModule.try8.test.ts (5 pass).

    NEW MODULE (A to B): End A lock - T1 - B1 - B2 - T2 - B3 - B4 - T3 - End B lock.
    - 9 ST3215 servos: T1,T2,T3 twist (+-180 deg); B1..B4 bend (+-90 deg); 2 end locks (+-45 deg). Mass 1.134 kg. Straight ~0.67 m.
    - Spine1 (between B1,B2) and Spine2 (between B3,B4), each with TWO side receivers on opposite faces (+-Y when straight), 4-fold keyed (slots 45+90k).
    - End connectors conn-endA, conn-endB (+-X). Side: conn-s1a, conn-s1b, conn-s2a, conn-s2b. Frames in module_spec.json.
    - Ends are full connectors (same pads/pockets/8 magnets as a receiver) + a lock rotor. Rules: end-end OK, end-side OK, side-side NEVER.

    PROBLEM TO FIX FIRST: the MSRR Experiments page still uses robotics/msrr/modulink.ts (6 rods, BIG_ROD_INDEX 3, 4 side connectors
    UP/RIGHT/DOWN/LEFT on one rod, TWIST_LIMIT [0,2pi], BEND +-90, cube units) and everything built on it (features/msrr/moduleGeometry.ts,
    MsrrCanvas.tsx, robotics/msrr/fitModules.ts, chainMoves.ts, chainSolve.ts, occupancy.ts, serpentine.ts, transform.ts, moves.ts, planner.ts + tests).

    TASKS:
    1. Port modulink.ts to 7 rods: T1, B1, [Spine1], B2, T2, B3, [Spine2], B4, T3; 2 side connectors per spine on opposite faces; end connectors A,B.
       Limits twist +-180, bend +-90, lock +-45; lengths from module_spec.json; consistent cube-unit scale.
    2. Update every dependent file and test. Do not weaken tests; where a test encodes the old module, change expectations and say why.
    3. MsrrCanvas must render the real try8 meshes with connector markers at the right place and direction.
    4. Editor "Add module", Rapier viewer, Walk tab / brain use the 9-servo layout. Copy the NEWEST simulation/brain code from
       C:\TETROBOT\sim (walk.py, multi_env.py, lying.py, walk_env.py, tetro_env2.py) and C:\TETROBOT\deploy\laptop_controller.py into D:\robo4\brain
       (the copies there are older).
    5. Represent shapes as a CONFIGURATION GRAPH (nodes = modules with ports A,B,S1..S4; edges = locks with slot; joint angles; unused flag)
       and plan reconfiguration as a sequence of VERBS (dock end->side, end->end, peel, walk step) whose success rates come from
       C:\TETROBOT GPU runs (handoff report sections 13 and 16).
    6. Run npm run typecheck and npm test. Report failures; do not hide them.

## Appendix D — what to tell VS Code Claude about the simulation work

    Simulation/brain code lives in C:\TETROBOT (sim\, deploy\, logs\). Python 3.12 system install, mujoco 3.17, warp 1.18, mujoco-warp 3.17, no venv.
    Start with the handoff report section 16 (ordered plan). Next three actions:
     1) python gpu_walk.py 128 12 (TAG=walk_judgepace) then python walk_metrics.py on its log: check first-dock time after JUDGE_SETTLE/JUDGE_WAIT change.
     2) End<->end with a stiff target: partner lying, End A up (tasks_lying_up.csv format), add a 5 N push stiffness test, slow compliant go-in
        for the last 10 mm, then gpu_multi_dock.py tasks_lying_up.csv 16 12. Read logs\gpu_multi_<TAG>.log per-world lines before changing code.
     3) Side->end (partner docks into walker spine) by swapping roles in gpu_multi_dock.py.
    Rules: real physics only, 1 ms timestep, every change behind an env switch, run windows visibly, explain results in plain words.

End of report. — Claude, 26 Oct 2026.
