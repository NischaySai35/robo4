# P10: physics interface

## Done

`gos/python/gos/physics.py` holds the plug-in point. `gos.App(engine='mujoco')` is the default, `engine='newton'` runs Newton, and `physics.register('name', Class)` adds another. An engine opens a file, steps, answers about joints and bodies, and can save and restore its state.

`app.run(..., cache=True)` keeps frames and `app.seek(t)` goes back. Running on from there replays the same physics. Changing the robot empties the cache. Long jobs with progress and cancel already exist as GOS actions.

## Limits

- Locks, IK, the graph and `loop_check` use MuJoCo's own objects. On another engine they stop with an error that says so.
- `sim/` (3 Nov 2026): its live worlds get their engine from `sim/engine.py`, which asks `gos.physics.open_engine` and hands it the robot built in code (`MujocoEngine.adopt`). The Studio reaches physics only through that service, so it is on the plug-in point too. Choose with `TETROBOT_ENGINE`.
- Jolt still runs the Studio's gravity preview.

## Reading a MuJoCo file into Newton

These four defaults change the result, and the first test got them wrong:

- Contact search distance is 100 mm. Set `default_shape_cfg.gap = 0`, or parts 20 cm apart count as touching.
- Shapes are cut to 64 corners. Set `mesh_maxhullvert`.
- Several contact points per shape pair are off. `enable_multiccd=True` turns them on.
- Motors read `control.joint_target_q`, which starts at 0, and not only `control.mujoco.ctrl`. Unset, a closed lock opens itself.

Newton runs in the system Python: the project pins MuJoCo 3.12 (9 Nov), the version Isaac Sim 6.2's Newton 1.6.1 is built for (Newton 1.7 wants 3.15; Isaac pins 1.6.1).

## Whole-robot test (3 Nov 2026)

`tools/bench/newton_module.py` runs the real module (CAD shapes, ST3215 servos, gravity) through one GOS script on both engines: the servos hold one pose and move three joints.

- The engines agree: joint angles within 0.007 rad, parts within 2.6 mm on average (6.8 mm at the far tip) after 1 s; up to 21 mm while the servos are still moving.
- With a 4x heavier module both engines sag the overloaded joint to the same angle (-1.473 and -1.472 rad), so both keep the 2.7 N*m servo limit.
- Speed for one robot: MuJoCo about 23,000 steps/s, Newton about 140 steps/s and 5 s to load. Newton pays a GPU launch for every step, so it only makes sense for thousands of robots at once, and there MuJoCo Warp was twice as fast at 512 robots (newton_vs_mjw.py).
- **Decision so far:** MuJoCo for one robot (Studio, scripts, real-robot sync), MuJoCo Warp for many-robot GPU runs. Newton stays plugged in and agrees, but has no speed advantage here.

Two bugs this test found and fixed:

- The export (shared by GOS and the Studio's Export) never wrote each part's CAD mass, so MuJoCo filled every hollow part as solid water: the module weighed 3.26 kg instead of 0.88 kg, and the servos could not hold it. Measured masses and inertias are now written; `auto` parts still take theirs from the shape.
- GOS documents had no servos at all. Joints with a motor profile now get an ST3215 servo (kp 80, kv 1, armature 0.012 from `sim/physics_params.json`, torque from the profile). Without the armature, the light lock rotors shook themselves loose.

## How to verify

`gos/python/tests/test_gos.py` covers the plug-in point with a fake engine, and rewinding. `tools/test_newton_engine.py` runs one script on both engines. `tools/bench/newton_vs_mjw.py` runs the lock test on all three.
