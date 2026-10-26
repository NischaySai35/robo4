# TETROBOT brain — connector-to-connector walking

The walking/docking "brain" verified in MuJoCo (random robots, servo + PLA-sag + backlash + magnet errors),
served to the Studio's **ESP-TTL ▸ Walk (brain)** tab. It's plain maths and a step-by-step sequence; there's
no neural network in it.

```
Studio (ESP-TTL ▸ Walk tab)  ── every 60 ms ──►  board /api/telemetry      (servo angles)
        │  POST /api/tick {servos}                                           
        ▼                                                                    
brain_server.py (127.0.0.1:8770) ── cmd {id: deg} ──► Studio ──► board /api/batch
        │  questions for the judge (you) ◄──► Walk tab cards (robot holds while you answer)
```
The Studio stays the only client of the ESP32 (it serves one connection at a time).

## Run
```
python D:\robo4\brain\brain_server.py        # Python 3.12 (mujoco, numpy, scipy, greenlet)
cd D:\robo4\studio && npm run dev            # then ESP-TTL ▸ Walk (brain)
```
* **Sim mode**: identical loop against the MuJoCo robot. Tick *I judge (practice)* to answer the judge
  yourself — the question shows the sim truth so you learn what "centred" means.
* **Real mode**: connect the board first (ESP-TTL header). Start sets the servo hold deadband
  (default ±2.46° ≈ 1 cm at the tip → ±0.2°), then walks. Stop = servos hold. E-STOP = board estop.

## Before the first real run
1. `python calibrate.py` — servo IDs, home (straight = sim zero), joint signs, lock directions → `robot_config.json`.
2. Measure the floor connectors from connector 0 (mm along X/Y arrows drawn on the board, yaw in degrees) →
   Walk tab table. Floor tilt from a phone level app → Walk tab.
3. Sim mode with the same connectors first.

## The cycle (walk.py)
dock free end (sag-aware IK, judge above the connector, straight in 25 mm/s, judge "seated?", lock fins 45°)
→ unlock old base → **peel** (tilt 6° about the rim toward the new base, then straight lift; flush magnets
hold ~37 N, the servos can't pull that straight — 4° is the smallest tilt that released 3/3; 0° works only
with magnets sunk ~1 mm deeper) → curl up 8 cm → swing high over the next connector → dock → swap roles.
Gentle limits: joints ≤ 34°/s, 1.5 rad/s², go-in 25 mm/s, touch 16 mm/s.

## Files
| file | what |
|---|---|
| brain_server.py | HTTP API for the Studio (start / tick / answer / stop) |
| laptop_controller.py | docking controller (sag-aware damped-least-squares IK, integral offset, judge hooks) |
| walk.py | Walker: the full step cycle (both ends, role swap) |
| walk_real.py | stand-alone terminal version (human judge in the console) |
| calibrate.py | guided calibration → robot_config.json |
| tetro_env2.py, walk_env.py, build_walk.py, *.xml | MuJoCo models + sim env (also the nominal model used for the sag estimate) |
| walk_test.py | sim test: `set XML=...walk_long.xml && python walk_test.py` (env TAG, S0, N, JUDGE=1) |
| record_walk.py + isaac_walk_view.py | record a walk, replay it in Isaac Sim 6.2 with the real CAD (meshes/) |
| test_brain_server.py | HTTP self-test: `python test_brain_server.py sim` / `real` (fake board) |

## Sim results (25 Oct 2026)
85–89 % per dock with random robots and the judge, ~24 s per dock; walking twist stays ≤ 137° (stop 176°);
straight pull-out with 1 mm magnet recess 6/6. Not yet modelled: servo deadband/hunting, horn-screw play
beyond the backlash range — the real-robot judge covers them for now.
