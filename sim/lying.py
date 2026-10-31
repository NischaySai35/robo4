"""Partner module LYING on the floor (not anchored in a floor receiver): place module i STRAIGHT with its long axis horizontal along
`heading` (End A pad tip near (x, y)), both locks open, let it settle, then its servos slowly move it into q0 (like the real robot would),
then settle again. Used for end<->end docks onto a lying module (how chains/snakes form: modules low and supported).
roll_deg turns the lying module about its own long axis: 0 = bend axes vertical (bends swing it sideways on the floor),
+-90 = bend axes horizontal (bends lift a part of it up)."""
import math, numpy as np, mujoco
from build_walk import R2q
def place_lying(e, i, x, y, heading_deg, q0=None, roll_deg=0.0, settle=400, ramp=600):
    m, d = e.m, e.d; rec = e.mods[i]; p = rec['p']; a = rec['root']
    q0 = np.zeros(7) if q0 is None else np.asarray(q0, float)
    h = math.radians(heading_deg); r = math.radians(roll_deg)
    yax = np.array([math.cos(h), math.sin(h), 0.0])                       # module long axis (End A -> End B)
    up = np.array([0, 0, 1.0]); side = np.cross(yax, up)
    xax = math.cos(r) * up + math.sin(r) * side; zax = np.cross(xax, yax); Rt = np.stack([xax, yax, zax], 1)
    pA = m.body(p + 'EndA_LockModule').pos; pa = m.site(p + 'A_padtip').pos
    d.qpos[a:a + 3] = np.array([x, y, 0.07]) - Rt @ (pA + pa); d.qpos[a + 3:a + 7] = R2q(Rt); d.qvel[:] = 0
    d.qpos[rec['qa']] = 0.0; d.ctrl[rec['act_id']] = 0.0
    for e_ in 'AB': d.qpos[rec['end'][e_]['lockq']] = 0.0; d.ctrl[rec['lock_act'][e_]] = 0.0
    mujoco.mj_forward(m, d)
    for _ in range(settle): mujoco.mj_step(m, d)
    if np.abs(q0).max() > 1e-6:                                            # servos move it into the pose slowly (0.6 s per 0.6 rad ~ real speed)
        for k in range(ramp):
            d.ctrl[rec['act_id']] = q0 * (k + 1) / ramp; mujoco.mj_step(m, d)
        for _ in range(settle): mujoco.mj_step(m, d)
    e.pq[i] = (q0, 0.0, 0.0)                                               # MultiEnv.step: partner holds q0, both locks open
    e._refresh_rx(force=True)
