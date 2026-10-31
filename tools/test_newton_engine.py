"""P10 check: the same GOS script runs on MuJoCo and on Newton through the plug-in point.

Newton pins its own MuJoCo, so it needs its own environment. usage: PYTHON_WITH_NEWTON\\python.exe tools/test_newton_engine.py
"""
import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'gos', 'python'))
import gos

ROBOT = '''<mujoco><option timestep="0.002"/><worldbody><geom type="plane" size="1 1 .1"/>
<body name="arm" pos="0 0 1"><inertial pos="0 0 -.1" mass=".2" diaginertia="1e-3 1e-3 1e-3"/><joint name="hinge" type="hinge" axis="0 1 0" damping=".02"/><geom type="capsule" fromto="0 0 0 0 0 -.2" size=".02" contype="0" conaffinity="0"/>
<body name="tip" pos="0 0 -.2"><inertial pos="0 0 -.1" mass=".1" diaginertia="5e-4 5e-4 5e-4"/><joint name="elbow" type="hinge" axis="0 1 0" damping=".02"/><geom type="capsule" fromto="0 0 0 0 0 -.2" size=".02" contype="0" conaffinity="0"/></body></body></worldbody></mujoco>'''


def script(engine, path):
    with gos.App(engine=engine) as app:
        app.load(path)
        app.set_joints(hinge=0.8)
        app.run(seconds=0.5, cache=True)
        after = app.robot.joints(); tip = app.robot.body_position('tip')
        app.seek(0.25); app.run(seconds=0.25)
        again = app.robot.joints()
    return after, tip, again


import tempfile
path = os.path.join(tempfile.mkdtemp(), 'arm.xml')
open(path, 'w').write(ROBOT)
bad = []
results = {e: script(e, path) for e in ('mujoco', 'newton')}
for e, (after, tip, again) in results.items():
    print(e, {k: round(v, 3) for k, v in after.items()}, 'tip', [round(x, 3) for x in tip], flush=True)
    moved = abs(after['hinge'] - 0.8) > 0.05
    if not moved: bad.append(f'{e}: the arm did not swing')
    if abs(again['hinge'] - after['hinge']) > 0.01: bad.append(f'{e}: rewinding and running on gave {again["hinge"]:.4f}, not {after["hinge"]:.4f}')
gap = abs(results['mujoco'][0]['hinge'] - results['newton'][0]['hinge'])
print(f'engines differ by {gap * 1000:.2f} milliradians on the hinge')
if gap > 0.02: bad.append(f'the two engines differ by {gap:.3f} rad')
print('FAILED: ' + '; '.join(bad) if bad else 'the same script runs on both engines')
sys.exit(1 if bad else 0)
