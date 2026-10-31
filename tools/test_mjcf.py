"""Does an exported robot really work in MuJoCo? Loads each case and compares it with the Studio's own FK.

usage: cd studio; npx tsx tools/bench/mjcfCases.ts OUT; cd ..; py -3.12 tools/test_mjcf.py OUT
Checks: it loads, no body is lost, body positions match Studio FK at rest and bent, loops stay shut under motion.
"""
import json, os, sys
import numpy as np
import mujoco

out, bad = sys.argv[1], []
for case in sorted(os.listdir(out)):
    d = os.path.join(out, case)
    if not os.path.exists(os.path.join(d, 'scene.xml')): continue
    expect = json.load(open(os.path.join(d, 'expect.json')))
    try:
        m = mujoco.MjModel.from_xml_path(os.path.join(d, 'scene.xml'))
    except Exception as e:
        print(f'{case}: DOES NOT LOAD: {str(e)[:150]}'); bad.append(case); continue
    data = mujoco.MjData(m); mujoco.mj_kinematics(m, data)
    want_bodies = len(expect['bodyNames'])
    used = {bid: mujoco.mj_name2id(m, mujoco.mjtObj.mjOBJ_BODY, nm) for bid, nm in expect['bodyNames'].items()}
    ids = list(used)
    def rel(worlds): return np.array(worlds[ids[-1]]) - np.array(worlds[ids[0]])
    def err(want):
        w0 = np.array(want[ids[0]]); x0 = data.xpos[used[ids[0]]]
        return max(np.linalg.norm((np.array(want[k]) - w0) - (data.xpos[used[k]] - x0)) for k in ids) * 1000
    rest = err(expect['rest'])
    line = f'{case}: bodies {m.nbody - 1}/{want_bodies}, dof {m.nv}, loop constraints {m.neq}, rest error {rest:.3f} mm'
    fail = m.nbody - 1 != want_bodies or rest > 0.1
    if expect.get('bent'):
        for name, v in expect['bentValues'].items():
            j = mujoco.mj_name2id(m, mujoco.mjtObj.mjOBJ_JOINT, name)
            if j >= 0: data.qpos[m.jnt_qposadr[j]] = v
        mujoco.mj_kinematics(m, data)
        e = err(expect['bent']); line += f', bent error {e:.3f} mm'
        fail = fail or e > 0.1
    if m.neq:
        # Push every joint from alternating sides for a moment, then measure the loop rows only: joint limits aren't closure.
        mujoco.mj_resetData(m, data)
        gaps, start = [], data.qpos.copy()
        for k in range(1500):
            data.qfrc_applied[:] = [(0.3 if i % 2 else -0.3) for i in range(m.nv)] if k < 500 else 0
            mujoco.mj_step(m, data)
            rows = data.efc_type[:data.nefc] == mujoco.mjtConstraint.mjCNSTR_EQUALITY
            gaps.append(np.abs(data.efc_pos[:data.nefc][rows]).max() if rows.any() else 0)
        moved = np.abs(data.qpos - start).max()
        line += f', moved {np.degrees(moved):.1f} deg, worst closure gap {max(gaps) * 1000:.3f} mm'
        # A weld can leave the structure rigid, so only the revolute loops must move.
        fail = fail or max(gaps) > 2.0e-3 or (case != 'square_fixed' and moved < np.radians(1))
    print(('FAIL ' if fail else 'ok   ') + line + (f' warnings={expect["warnings"]}' if expect['warnings'] else ''))
    if fail: bad.append(case)
print('FAILED: ' + ', '.join(bad) if bad else 'all exports work in MuJoCo')
sys.exit(1 if bad else 0)
