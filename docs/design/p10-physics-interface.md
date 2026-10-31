# P10: physics interface

## Done

`gos/python/gos/physics.py` holds the plug-in point. `gos.App(engine='mujoco')` is the default, `engine='newton'` runs Newton, and `physics.register('name', Class)` adds another. An engine opens a file, steps, answers about joints and bodies, and can save and restore its state.

`app.run(..., cache=True)` keeps frames and `app.seek(t)` goes back. Running on from there replays the same physics. Changing the robot empties the cache. Long jobs with progress and cancel already exist as GOS actions.

## Limits

- Locks, IK, the graph and `loop_check` use MuJoCo's own objects. On another engine they stop with an error that says so.
- The Studio and `sim/` still call their physics directly. Moving them comes after the Newton test decides, so nothing is moved twice.
- Jolt still runs the Studio's gravity preview.

## Reading a MuJoCo file into Newton

These four defaults change the result, and the first test got them wrong:

- Contact search distance is 100 mm. Set `default_shape_cfg.gap = 0`, or parts 20 cm apart count as touching.
- Shapes are cut to 64 corners. Set `mesh_maxhullvert`.
- Several contact points per shape pair are off. `enable_multiccd=True` turns them on.
- Motors read `control.joint_target_q`, which starts at 0, and not only `control.mujoco.ctrl`. Unset, a closed lock opens itself.

Newton pins its own MuJoCo (3.15, the project uses 3.17), so it needs its own environment.

## How to verify

`gos/python/tests/test_gos.py` covers the plug-in point with a fake engine, and rewinding. `tools/test_newton_engine.py` runs one script on both engines. `tools/bench/newton_vs_mjw.py` runs the lock test on all three.
