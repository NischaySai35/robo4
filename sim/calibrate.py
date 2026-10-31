from paths import tpath
import json, math, subprocess, sys, time
import numpy as np, mujoco
sys.path.insert(0, tpath('sim'))
import status as S
PY = sys.executable; PF = tpath('sim/physics_params.json'); XML = tpath('sim/tetrobot_scene.xml')
FORCE = 2.0   # assumed gentle finger push at the top, N
TARGET_IN, TARGET_OUT = 5.5, 3.0   # Nischay's measurement, degrees at the top
S.stage('physics', 'running', 'Calibrating sag + shake to your finger-push test (5.5 deg in-plane, 3 deg sideways, 1 deg twist play)')
def build(P):
    json.dump(P, open(PF, 'w'), indent=1)
    subprocess.run([PY, tpath('sim/build_mjcf.py')], capture_output=True, timeout=120)
def push(direction, record=False):
    m = mujoco.MjModel.from_xml_path(XML); d = mujoco.MjData(m)
    tip = m.body('L2_LockRotor_B').id; h = 0.6983
    for _ in range(500): mujoco.mj_step(m, d)
    d.xfrc_applied[tip, :3] = FORCE * np.array(direction)
    for _ in range(1500): mujoco.mj_step(m, d)
    p = d.xpos[tip]; held = math.degrees(math.atan2(np.hypot(p[0], p[1]), p[2]))
    out = {'held_deg': held}
    if record:
        d.xfrc_applied[:] = 0; tr = []
        for i in range(4000):
            mujoco.mj_step(m, d)
            if i % 5 == 0:
                q = d.xpos[tip]; tr.append(math.degrees(math.atan2(np.dot(q[:2], np.array(direction[:2])), q[2])))
        tr = np.array(tr); peak = float(np.abs(tr[2:] - tr[-100:].mean()).max())
        fin = tr[-100:].mean(); settle = next((i * 0.005 for i in range(len(tr) - 1, -1, -1) if abs(tr[i] - fin) > 0.3), 0.0)
        out['rest_offset_deg'] = float(fin)
        w = tr[:200] - fin; sgn = np.sign(w); zc = np.sum(sgn[1:] != sgn[:-1]); freq = zc / 2 / 1.0
        out.update(overshoot_deg=float(peak), settle_s=float(settle), wobble_hz=float(freq), trace=tr[::4].round(3).tolist())
    return out
P = json.load(open(PF))
P['backlash_twist_deg'] = 0.5
S.log('=== Calibration: push the top with %.1f N while standing (your finger test) ===' % FORCE)
def bisect(key, direction, target, lo, hi, label):
    for it in range(9):
        mid = math.sqrt(lo * hi); P[key] = mid; build(P)
        a = push(direction)['held_deg']
        S.log('  %s: %s=%.1f -> top tilts %.2f deg (target %.1f)' % (label, key, mid, a, target))
        if a > target: lo = mid
        else: hi = mid
    P[key] = math.sqrt(lo * hi)
P['kp'] = 80.0; P['kv'] = 1.0; P.setdefault('flex_k_in', 60.0)
bisect('flex_k_in', [0, 1, 0], TARGET_IN, 5.0, 2000.0, 'bend plane')
ratio = P['flex_k_twist'] / P['flex_k_bend']
for it in range(9):
    pass
lo, hi = 5.0, 2000.0
for it in range(9):
    mid = math.sqrt(lo * hi); P['flex_k_bend'] = mid; P['flex_k_twist'] = mid * ratio; build(P)
    a = push([1, 0, 0])['held_deg']
    S.log('  sideways: flex_k=%.1f -> top tilts %.2f deg (target %.1f)' % (mid, a, TARGET_OUT))
    if a > TARGET_OUT: lo = mid
    else: hi = mid
P['flex_k_bend'] = math.sqrt(lo * hi); P['flex_k_twist'] = P['flex_k_bend'] * ratio
build(P)
A = push([0, 1, 0], True); B = push([1, 0, 0], True)
S.log('RESULT bend plane: tilt %.2f deg, after release swings %.2f deg, %.1f Hz, settles in %.2f s, rests %.2f deg off' % (A['held_deg'], A['overshoot_deg'], A['wobble_hz'], A['settle_s'], A['rest_offset_deg']))
S.log('RESULT sideways:   tilt %.2f deg, after release swings %.2f deg, %.1f Hz, settles in %.2f s, rests %.2f deg off' % (B['held_deg'], B['overshoot_deg'], B['wobble_hz'], B['settle_s'], B['rest_offset_deg']))
S.log('Calibrated params: kp=%.1f N*m/rad (servo, fixed), flex in-plane %.1f, sideways %.1f N*m/rad, backlash %.1f deg bends / %.1f deg twists' % (P['kp'], P['flex_k_in'], P['flex_k_bend'], P['backlash_deg'], P['backlash_twist_deg']))
json.dump({'force_N': FORCE, 'in_plane': A, 'sideways': B, 'params': P}, open(tpath('results_calibration.json'), 'w'), indent=1)
S.note('Sim now sags and wobbles like your real module: %.1f deg in-plane, %.1f deg sideways under a %.0f N push; rings at %.1f Hz and settles in %.1f s.' % (A['held_deg'], B['held_deg'], FORCE, A['wobble_hz'], A['settle_s']))
S.log('DONE calibration')
