"""imu.py — the MPU-6050 on each module (3 Nov: flat in the middle of a side receiver's ring, phys_world IMU_RX), as the BRAIN gets it.

  MPU6050(world, mid)   .read() -> (acc m/s^2, gyro rad/s) in the board frame: MuJoCo's accelerometer/gyro at the board
                        (= the real chip's frame; .R_bs turns it into the spine's frame) + per-robot leftover offsets after a one-time calibration, white noise, 16-bit steps, a small mounting
                        error the brain does not know (all ESTIMATES from the datasheet, see below)
  Tilt                  complementary filter: gyro short-term + gravity from the accelerometer long-term -> 'up' in the board frame
  mount_from_gravity    the real board's turn on the spine, from 2+ still poses (once, after wiring)
  body_up(...)          + the module's encoders on the nominal model -> 'up' in EVERY body of that module (ends, spines)

It gives: which way is up for every part (upside down, on its side, rolled by how much, the tilt of each end).
It does NOT give: heading (no magnetometer; the gyro drifts ~0.3 deg/s) or position on the floor (only by counting steps)."""
import math, numpy as np, mujoco

G = 9.81
ACC_LSB, GYRO_LSB = 2 * G / 32768, math.radians(250.0) / 32768          # +-2 g, +-250 deg/s, 16 bit
ACC_NOISE, GYRO_NOISE = 0.0027 * G, math.radians(0.033)                  # per 60 ms sample, 44 Hz filter (datasheet densities)
ACC_BIAS, GYRO_BIAS = 0.005 * G, math.radians(0.3)                       # left after calibration (estimate)
MOUNT_DEG = 1.5                                                          # board not perfectly square on the bar (estimate)


def _rot(axis, ang):
    a = np.asarray(axis, float); a = a / np.linalg.norm(a); K = np.array([[0, -a[2], a[1]], [a[2], 0, -a[0]], [-a[1], a[0], 0]])
    return np.eye(3) + math.sin(ang) * K + (1 - math.cos(ang)) * K @ K


class MPU6050:
    def __init__(self, world, mid, rng=None, randomize=True):
        self.w, self.mid = world, mid; m = world.m; r = rng if rng is not None else np.random.default_rng(1)
        self.ia = m.sensor_adr[m.sensor(f'{mid}_imu_acc').id]; self.ig = m.sensor_adr[m.sensor(f'{mid}_imu_gyro').id]
        st = m.site(f'{mid}_imu').id; self.body = m.site_bodyid[st]; self.rng = r       # the spine it sits on
        R = np.zeros(9); mujoco.mju_quat2Mat(R, m.site_quat[st]); self.R_bs = R.reshape(3, 3)   # board -> spine (nominal mounting)
        k = 1.0 if randomize else 0.0
        self.R_mount = _rot(r.normal(size=3), math.radians(MOUNT_DEG) * k * abs(r.normal()))
        self.b_acc = r.normal(0, ACC_BIAS, 3) * k; self.b_gyro = r.normal(0, GYRO_BIAS, 3) * k

    def read(self):
        d = self.w.d; acc = self.R_mount @ d.sensordata[self.ia:self.ia + 3] + self.b_acc + self.rng.normal(0, ACC_NOISE, 3)
        gyr = self.R_mount @ d.sensordata[self.ig:self.ig + 3] + self.b_gyro + self.rng.normal(0, GYRO_NOISE, 3)
        return np.round(acc / ACC_LSB) * ACC_LSB, np.round(gyr / GYRO_LSB) * GYRO_LSB


class Tilt:
    """'up' in the board frame: gyro integration corrected toward the accelerometer's gravity (trusted more when |acc| ~ 1 g)"""

    def __init__(self, imu, k=0.08):
        self.imu, self.k = imu, k; a, _ = imu.read(); self.up = a / np.linalg.norm(a)

    @property
    def up_spine(self):
        """'up' in the frame of the spine the board sits on (what body_up's callers and the skills use)"""
        return self.imu.R_bs @ self.up

    def update(self, dt):
        a, g = self.imu.read()
        up = self.up - dt * np.cross(g, self.up)                         # the world 'up' seen from a turning board
        na = np.linalg.norm(a); w = self.k * math.exp(-((na - G) / (0.15 * G)) ** 2)
        up = (1 - w) * up + w * a / na; self.up = up / np.linalg.norm(up)
        return self.up


def mount_from_gravity(acc_board, up_spine):
    """the real board's mounting (board -> spine rotation) from still poses: each pose gives the accelerometer's gravity in the board
    frame and 'up' in the spine frame from the encoders + nominal model. Needs >= 2 poses whose 'up' differ a lot (e.g. lying flat, then
    standing on an end): the chip's printed X/Y may be turned or flipped against phys_world's board frame - this finds it (Kabsch)"""
    A = np.array([a / np.linalg.norm(a) for a in acc_board]); B = np.array([u / np.linalg.norm(u) for u in up_spine])
    U, _, Vt = np.linalg.svd(B.T @ A); D = np.diag([1.0, 1.0, np.sign(np.linalg.det(U @ Vt))])
    return U @ D @ Vt


def body_up(world, mid, up_board, q_meas, dk=None):
    """up (unit, world vertical) in every body frame of module mid: board frame -> its spine -> other bodies by the nominal
    kinematics at the measured joint angles. Returns {body name: up vector in that body's frame}."""
    m = world.m; dk = dk if dk is not None else mujoco.MjData(m); dk.qpos[:] = m.qpos0
    dk.qpos[np.array(world.mod[mid]['qa'])] = q_meas; mujoco.mj_kinematics(m, dk)
    up_w = dk.site_xmat[m.site(f'{mid}_imu').id].reshape(3, 3) @ up_board                    # board -> world, in the model frame of dk
    return {m.body(b).name: dk.xmat[b].reshape(3, 3).T @ up_w for b in range(m.nbody) if m.body(b).name.startswith(mid + '_')}
