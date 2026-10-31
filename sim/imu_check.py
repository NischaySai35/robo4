"""imu_check.py CKPT [SECONDS] - what the MPU-6050 + encoders tell the brain, against the physics truth, on a checkpoint:
for every module end: its axis tilt from vertical (upright / lying / upside down), and the module's roll about its long axis.
Also the heading drift from integrating the gyro (no magnetometer)."""
from paths import tpath
import sys, math, numpy as np, mujoco; sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
from phys_world import PhysWorld
from imu import MPU6050, Tilt, body_up

ENC = 0.001534


def describe(tilt_deg):
    return 'pointing UP' if tilt_deg < 30 else ('pointing DOWN' if tilt_deg > 150 else 'lying/sideways')


if __name__ == '__main__':
    w, ex = PhysWorld.load(sys.argv[1]); secs = float(sys.argv[2]) if len(sys.argv) > 2 else 2.0
    m, d = w.m, w.d; rng = np.random.default_rng(5)
    T = {mid: Tilt(MPU6050(w, mid, rng)) for mid in w.ids}; yaw = {mid: 0.0 for mid in w.ids}
    for _ in range(int(secs / 0.06)):
        w.run(0.06)
        for mid, t in T.items():
            up = t.update(0.06); _, g = t.imu.read(); yaw[mid] += float(g @ up) * 0.06    # turn about the vertical, from the gyro alone
    dk = mujoco.MjData(m); worst = 0.0
    for mid in w.ids:
        q = np.round(d.qpos[np.array(w.mod[mid]['qa'])] / ENC) * ENC
        est = body_up(w, mid, T[mid].up, q, dk)
        for e in 'AB':
            b = m.body(f'{mid}_End{e}_LockModule').id; Rt = d.xmat[b].reshape(3, 3); up_true = Rt.T @ np.array([0, 0, 1.0])
            ax = np.array([0, 1.0, 0]) if e == 'B' else np.array([0, -1.0, 0])             # end axis pointing out of the module
            tt = math.degrees(math.acos(np.clip(ax @ up_true, -1, 1))); te = math.degrees(math.acos(np.clip(ax @ est[m.body(b).name], -1, 1)))
            err = math.degrees(math.acos(np.clip(up_true @ est[m.body(b).name], -1, 1))); worst = max(worst, err)
            print(f'{mid}.{e}: truth {tt:5.1f} deg from up ({describe(tt)}), brain {te:5.1f} deg ({describe(te)}) | up-vector error {err:4.2f} deg')
        s = m.body(f'{mid}_Spine2_B3B4').id; us = d.xmat[s].reshape(3, 3).T @ np.array([0, 0, 1.0]); ue = est[m.body(s).name]
        roll_t = math.degrees(math.atan2(us[0], us[2])); roll_e = math.degrees(math.atan2(ue[0], ue[2]))
        print(f'{mid} roll about its long axis (Spine2): truth {roll_t:6.1f} deg, brain {roll_e:6.1f} deg | heading drift from the gyro over {secs:.0f} s: {math.degrees(yaw[mid]):+.2f} deg (truth: still)')
    print(f'WORST up-vector error {worst:.2f} deg')
