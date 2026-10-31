"""v2_calibrate.py — match the Studio v2 module model to the MuJoCo module (train_v2.xml).

Reads v2_calib.json (from robo4 studio/scripts/export-v2-calib.ts): joint angles and the
body centres of mass + end-connector positions in the module's BASE frame. Fits
  - the fixed rigid transform  base frame -> MuJoCo module_frame body frame,
  - the sign of each of the 7 joints (Studio rad -> MuJoCo qpos),
by trying all 128 sign combinations and a least-squares (Kabsch) fit over every pose.
Writes v2_calib_fit.json. Run with:  py -3.12 v2_calibrate.py
"""
import json, itertools, os, numpy as np, mujoco

HERE = os.path.dirname(os.path.abspath(__file__))
JOINTS = ['J_T1_twist', 'J_B1_bend', 'J_B2_bend', 'J_T2_twist', 'J_B3_bend', 'J_B4_bend', 'J_T3_twist']
BODIES = ['EndA_LockModule', 'L1_LockRotor_A', 'T1_Housing_B1Fork', 'Spine1_B1B2', 'T2_Housing_B2Fork_GROUND',
          'T2_Ring_B3Fork', 'Spine2_B3B4', 'T3_Housing_B4Fork', 'EndB_LockModule', 'L2_LockRotor_B']

def kabsch(P, Q):
    """R, t minimising |R P + t - Q|."""
    pc, qc = P.mean(0), Q.mean(0)
    H = (P - pc).T @ (Q - qc)
    U, S, Vt = np.linalg.svd(H)
    d = np.sign(np.linalg.det(Vt.T @ U.T))
    D = np.diag([1, 1, d])
    R = Vt.T @ D @ U.T
    return R, qc - R @ pc

def main():
    cal = json.load(open(os.path.join(HERE, 'v2_calib.json')))
    m = mujoco.MjModel.from_xml_path(os.path.join(HERE, 'train_v2.xml')); d = mujoco.MjData(m)
    qadr = [m.joint(j).qposadr[0] for j in JOINTS]
    frame = m.body('module_frame').id
    def mj_points(rad, signs):
        mujoco.mj_resetData(m, d)
        for k, a in enumerate(qadr): d.qpos[a] = signs[k] * rad[k]
        mujoco.mj_forward(m, d)
        R0 = d.xmat[frame].reshape(3, 3); p0 = d.xpos[frame]
        pts = [d.xipos[m.body(b).id] for b in BODIES] + [d.site('A_padtip').xpos, d.site('B_padtip').xpos]
        return np.array([R0.T @ (p - p0) for p in pts])
    ours = []
    for c in cal:
        ours.append(np.array([c['bodies'][b] for b in BODIES] + [c['ports']['A']['pos'], c['ports']['B']['pos']]))
    best = None
    for signs in itertools.product([1, -1], repeat=7):
        P = np.concatenate(ours); Q = np.concatenate([mj_points(c['rad'], signs) for c in cal])
        R, t = kabsch(P, Q)
        err = np.sqrt(((P @ R.T + t - Q) ** 2).sum(1)).max()
        if best is None or err < best[0]: best = (err, signs, R, t)
    err, signs, R, t = best
    print('joint signs', signs, 'worst point error %.2f mm' % (err * 1000))
    q = np.zeros(4); mujoco.mju_mat2Quat(q, R.flatten())
    json.dump({'signs': list(signs), 'R': R.tolist(), 't': t.tolist(), 'quat_wxyz': q.tolist(), 'worst_mm': err * 1000,
               'note': 'p_mj_moduleframe = R @ p_base + t'}, open(os.path.join(HERE, 'v2_calib_fit.json'), 'w'), indent=1)

if __name__ == '__main__':
    main()
