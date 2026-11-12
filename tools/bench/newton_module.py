"""§7 test, whole robot: the real module (its CAD shapes, joints and ST3215 servos) under gravity on MuJoCo and on Newton,
through the same GOS script. Do the engines agree, and how fast is each?

usage: py -3.12 tools/bench/newton_module.py
"""
# REUSE-CHECKED: newton|engine compare -> newton_ring.py compares a 4-bar test ring, newton_vs_mjw.py the lock test, test_newton_engine.py
# a 2-link arm; none runs the real module document. Same pattern (gos.App(engine=...), body positions over time).
import json, os, sys, time
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'gos', 'python'))
import gos

raw = json.load(open(os.path.join(ROOT, 'studio', 'src', 'core', 'factory', 'single-module-demo.json'), encoding='utf-8'))
DOC = raw.get('model', raw)
SLICE, SLICES = 0.2, 5


def run(engine):
    trace = []
    with gos.App(engine=engine) as app:
        t = time.perf_counter(); app.load_document(DOC); load = time.perf_counter() - t
        bodies = [b['name'] for b in DOC['bodies'].values()]
        app.set_joints(J_B1_bend=0.4, J_B3_bend=-0.4)  # the servos hold this pose where they can
        app.set_targets(J_B3_bend=0.4, J_T2_twist=0.5, J_B4_bend=-0.3)  # and move these, as fast as an ST3215 can
        steps, t = 0, time.perf_counter()
        for _ in range(SLICES):
            steps += app.run(seconds=SLICE).steps
            trace.append({b: np.array(app.robot.body_position(b)) for b in bodies})
        wall = time.perf_counter() - t
        print(f'{engine}: loaded in {load:.1f} s, {steps} steps in {wall:.2f} s ({steps / wall:.0f} steps/s, one robot)', flush=True)
        print('  joints', {k: round(v, 3) for k, v in app.robot.joints().items()}, flush=True)
        return trace


m, n = run('mujoco'), run('newton')
for i, (a, b) in enumerate(zip(m, n)):
    diff = {k: np.linalg.norm(a[k] - b[k]) * 1000 for k in a}
    worst = max(diff, key=diff.get)
    moved = max(np.linalg.norm(a[k] - m[0][k]) for k in a) * 1000 if i else 0
    print(f't={SLICE * (i + 1):.1f}s engines differ by {diff[worst]:7.2f} mm at most ({worst}); mean {np.mean(list(diff.values())):6.2f} mm')
