"""GOS G4 stage B, part 1: reachable goals for the real module, and how GOS IK (mink) does on them.

A goal is where the EndB body lands at random joint angles inside the limits, so every goal is reachable.
usage: py -3.12 tools/bench/ik_goals.py OUT.json [N]
"""
import json, os, sys, time
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'gos', 'python'))
import gos

out, n = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 40
doc = json.load(open(os.path.join(os.path.dirname(__file__), '..', '..', 'studio', 'src', 'core', 'factory', 'single-module-demo.json'), encoding='utf-8'))
doc = doc.get('model', doc)
rng = np.random.default_rng(1)
tip = next(b['name'] for b in doc['bodies'].values() if b['name'].startswith('EndB'))
goals, rows = [], []
with gos.App() as app:
    app.load_document(doc)
    m = app.model
    lo, hi = m.jnt_range[:, 0], m.jnt_range[:, 1]
    names = list(app.robot.joints())
    for _ in range(n):
        q = rng.uniform(lo * 0.8, hi * 0.8)
        app.set_joints(**dict(zip(names, q)))
        goals.append({'q': dict(zip(names, map(float, q))), 'tip': app.robot.body_position(tip)})
    for g in goals:
        app.set_joints(**{k: 0.0 for k in names})
        t = time.perf_counter()
        r = app.robot.ik(tip, g['tip'], steps=1500, tolerance=0.002)
        rows.append({'ok': bool(r.ok), 'err_mm': r.goal_error_m * 1000, 'ms': (time.perf_counter() - t) * 1000, 'steps': r.steps})
json.dump({'tip': tip, 'goals': goals, 'mink': rows}, open(out, 'w'))
ok = [r for r in rows if r['ok']]
print(f'mink: {len(ok)}/{n} reached within 2 mm, median error {np.median([r["err_mm"] for r in rows]):.1f} mm, median time {np.median([r["ms"] for r in rows]):.1f} ms')
