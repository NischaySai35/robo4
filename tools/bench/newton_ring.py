"""§7 test, rings: a closed square of four bars falls under gravity on MuJoCo and on Newton, through the GOS plug-in point. Do they agree, and does the ring stay shut?

usage: PYTHON_WITH_NEWTON\\python.exe tools/bench/newton_ring.py
"""
import os, sys, tempfile
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'gos', 'python'))
import gos

L = 0.2
BAR = f'<inertial pos="{L / 2} 0 0" mass=".1" diaginertia="1e-4 4e-4 4e-4"/><geom type="capsule" fromto="0 0 0 {L} 0 0" size=".01" contype="0" conaffinity="0"/>'
RING = f'''<mujoco><option timestep="0.001"/><worldbody>
<body name="A" pos="0 0 1">{BAR}
 <body name="B" pos="{L} 0 0" quat="0.7071068 0 0.7071068 0"><joint name="ab" type="hinge" axis="0 1 0" damping=".002"/>{BAR}
  <body name="C" pos="{L} 0 0" quat="0.7071068 0 0.7071068 0"><joint name="bc" type="hinge" axis="0 1 0" damping=".002"/>{BAR}
   <body name="D" pos="{L} 0 0" quat="0.7071068 0 0.7071068 0"><joint name="cd" type="hinge" axis="0 1 0" damping=".002"/>{BAR}</body></body></body></body>
</worldbody><equality><connect body1="D" body2="A" anchor="{L} 0 0"/></equality></mujoco>'''

path = os.path.join(tempfile.mkdtemp(), 'ring.xml')
open(path, 'w').write(RING)
tip_local = np.array([L, 0, 0])


def run(engine):
    trace = []
    with gos.App(engine=engine) as app:
        app.load(path)
        app.set_joints(ab=0.25)  # push it off the square so gravity moves it
        for _ in range(5):
            app.run(seconds=0.2)
            trace.append({b: app.robot.body_position(b) for b in 'ABCD'})
        print(engine, 'joints', {k: round(v, 3) for k, v in app.robot.joints().items()}, flush=True)
        # the ring is shut when D's far end is back on A's origin; bars keep their length, so the gap shows in D to A
        return trace


m, n = run('mujoco'), run('newton')
for i, (a, b) in enumerate(zip(m, n)):
    gap = max(np.linalg.norm(np.array(a[k]) - np.array(b[k])) for k in 'ABCD') * 1000
    side = np.linalg.norm(np.array(b['D']) - np.array(b['A'])) * 1000
    side_m = np.linalg.norm(np.array(a['D']) - np.array(a['A'])) * 1000
    print(f't={0.2 * (i + 1):.1f}s engines differ {gap:8.3f} mm | D to A: mujoco {side_m:7.2f} mm, newton {side:7.2f} mm (shut ring: {L * 1000:.0f} mm)')
