# Real-time errors: every imperfection in the sim

This list comes from the code, 1 Nov. Anything new (DIK, GPU teacher, AI training) must run with **all** of these switched on.
In the Manual tab and in `manual.Manual` they are on by default: `randomize=True` and `disturb=True`.

Status words:
- **measured**: Nischay measured it on the real robot.
- **datasheet**: from the part's datasheet.
- **tuned**: set to match what Nischay saw.
- **guess**: not checked yet.

## 1. The module itself (the body bends and sags)
Built in `build_mjcf.py` from `physics_params.json`. Randomized in `phys_world.PhysWorld._randomize`; the GPU and walk envs use the same ranges.

- [ ] **PLA flex**: every bracket bends under load.
  - Stiffness: 39 N·m/rad (bend), 59 (twist), 68 (inner). Limit ±3°.
  - Per robot: stiffness ×0.6–1.5, damping ×0.6–1.8.
  - Tuned so the tip droops 2–4° like the real module. **tuned**
- [ ] **Gear backlash**: free play in every servo, stopped by the gear teeth.
  - 0.2° on bends, 0.5° on twists.
  - Per robot ×0–2 (at least ×0.05). **guess**
- [ ] **Sag direction**: gravity decides it. Flex bends the way the load pushes. Backlash sits on the side the load pushes it to; it sits centred when the load is under 1e-4 N·m (`BL_DEADBAND`).
- [ ] **Joint friction**: 0.03 on bends, 0.08 on twists (PLA ring bearing). Per robot ×0.6–1.5.
- [ ] **Mass**: 1.134 kg per module. **measured**. Every part ×0.92–1.08 (×0.92–1.08 on the single-module env, `MASS_RAND`).
- [ ] **Base lock tilt** (single-module env): 150–300 N·m/rad, which gives 0.5–1° at full load. **measured**

## 2. Servos (ST3215)
Modelled in `phys_world.PhysWorld._servo`.

- [ ] **Torque**: 2.7 N·m stall. **datasheet**. Per servo, the usable limit is ×0.75–1.0.
- [ ] **Stiffness**: kp 80 N·m/rad (holds within about 2° up to stall). **guess**. Per servo ×0.75–1.25.
- [ ] **Speed**: 45 rpm at 12 V. Scales with battery voltage, ×0.9–1.05 per servo.
- [ ] **Acceleration ramp**: 6.14 rad/s² (firmware POS_ACC 40), ×0.85–1.15 per servo.
- [ ] **Torque drops with speed** (down to 8 % at full speed).
- [ ] **Battery sag**:
  - 3S LiPo, 10.5–12.6 V per module.
  - Voltage drops 0.08 V per amp drawn, never below 9 V. Both speed and torque drop with it.
- [ ] **Deadband**: 0.1°. The servo ignores smaller errors.
- [ ] **Lost packets**: 1 % of commands are lost and the servo keeps its old command.
- [ ] **Command delay**: 1–3 control frames (60–180 ms).

## 3. Sensors (what the brain really gets)
- [ ] **Encoders**:
  - 4096 steps per turn (0.088° steps).
  - Noise 0.03–0.17° (0.0005–0.003 rad) per robot.
  - Readings are 0–2 frames old (0–120 ms) (`phys_dock`).
  - Encoders read the servo, **not** the flex or the backlash. The brain has to estimate the sag (`tetro_env2._fk`, `gpu_brain.BatchedNOM`).
- [ ] **IMU** (MPU-6050 on Spine2), from `imu.py`. **datasheet** plus estimates.
  - Accelerometer noise 0.0027 g; leftover bias 0.005 g.
  - Gyro noise 0.033°/s; bias 0.3°/s.
  - 16-bit steps.
  - The board is mounted up to 1.5° crooked, and the brain does not know by how much.
  - Gives "which way is up". It does **not** give heading (no compass) or position.
- [ ] **Camera**: optional, at most one, at an unknown angle (`cam_judge.py`).
  - Corner noise 0.7 px. **measured**
  - The model's orientation is 5–12° off. **measured**
  - A receiver seen through 3 links or more of the model is about 12 mm off. **measured**; such receivers are not trusted.
- [ ] **Target estimate**: the robot thinks the receiver is up to 1.5 mm and 0.5° away from where it really is.
- [ ] **Docking judge**: "truth" (physics plus 1 mm noise) or "touch" (blind, encoders only).

## 4. Connectors
- [ ] **Magnets**:
  - About 7.5 N per connector (0.94 N per pair). **measured** by hand pull.
  - Per robot ×0.6–1.4. Each magnet ±10 %.
  - Recessed 0–0.6 mm.
- [ ] **Pad fit**: every pad is 0.55° narrower on each side (printed clearance). The end pockets are cut to r ≥ 29 mm as in the STL. **CAD**
- [ ] **Floor receivers in cardboard**:
  - Tilt play ±1.5° at 175 N·m/rad. Lift 0.5 mm. **guess**
  - Stiffness ×0.5–1.5 per receiver.
- [ ] **Collision shapes**: the real CAD as 4 mm voxel boxes (713 per module).

## 5. The room
From `disturb.py`. Switch: `DISTURB=0` turns it off. All values are **guess**.

- [ ] **Floor tilt**: 0–1.5°, in a random direction.
- [ ] **Friction**: PLA ×0.7–1.4 (0.25–0.5).
- [ ] **Table shake**:
  - 0.15 m/s² sideways, 0.10 m/s² up and down.
  - Around 8 Hz.
  - Per robot ×0.3–2.
- [ ] **Bumps**: about one knock every 30 s, 1.5 m/s² for 40 ms.
- [ ] **Air**: a wandering draft (0.4 m/s) pushing on every link.

## 6. Rules for anything new (DIK, teacher, AI)
1. **Test only with all of the above on** (`randomize=True`, `disturb=True`) and on several robots (seeds). Robot 1 alone proves nothing.
2. **Plan with the errors in mind.**
   - Stay away from joint stops (backlash plus flex can push a joint past what the plan expected).
   - Keep servo load under about 85 % (battery sag and per-servo spread take the rest).
   - Expect a few mm of sag at the tip.
3. **In the sim, the brain may use physics truth** (Nischay: "it's sim, ok to cheat"). Every truth input must be named, so we know what the real robot will have to replace with encoders + IMU + camera.
   - DIK v1 reads truth: the true pose of every module and joint, and the true target pose.
4. **Sag is real, not noise.** It has a direction (the load) and a size (load ÷ stiffness). A planner that ignores it aims a few mm low. Close the loop on the measured error, or predict the sag the way `tetro_env2._fk` does.
5. **"guess" values** must be checked on the real robot before results that depend on them are called final.
