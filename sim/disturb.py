"""disturb.py — the real room, not a perfect lab: things that push the robot around that no controller asked for.
ALL MAGNITUDES ARE ESTIMATES (not measured on the real table yet). Switch: DISTURB=0 turns everything here off.

  floor shake   the cardboard / table vibrates: the floor accelerates under everything (applied as the equivalent inertial
                force -m*a on every body). Band-limited random (Ornstein-Uhlenbeck, ~8 Hz corner), RMS 0.15 m/s^2 sideways,
                0.10 m/s^2 up/down, per robot x0.3-2.
  bumps         someone touches the table: random knocks, on average one per 30 s, 1.5 m/s^2 (x0.5-2) for 40 ms.
  air           drafts from a fan / AC: a wind that wanders (sigma 0.4 m/s, ~3 s time constant) and quadratic drag on every
                link (0.5 * rho * Cd * A * |u - v| (u - v), A = 35 cm^2 per link, Cd 1.1).
  magnets       every MAGNET differs (+-10 % each side of a pair -> up to +-20 % per pair), on top of the per-robot spread.
  servo         deadband 0.1 deg (the setpoint does not move for smaller errors); 1 % of controller frames are lost
                (the servo keeps its previous command) - see phys_dock.PhysDockEnv.step.
  receivers     floor receivers sit in cardboard: tilt play +-1.5 deg at 175 N.m/rad and 0.5 mm lift (train_v2.xml),
                stiffness x0.5-1.5 per receiver - added in phys_world.PhysWorld.__init__."""
import os, math, numpy as np

ON = os.environ.get('DISTURB', '1') == '1'
SHAKE_RMS_XY, SHAKE_RMS_Z, SHAKE_TAU = 0.15, 0.10, 0.02
BUMP_RATE, BUMP_ACC, BUMP_DUR = 1 / 30.0, 1.5, 0.04
WIND_SIGMA, WIND_TAU, RHO, CD, AREA = 0.4, 3.0, 1.2, 1.1, 0.0035
MAG_SITE_SPREAD = 0.10
DEADBAND = math.radians(0.1)
PACKET_LOSS = 0.01
RX_TILT_K, RX_TILT_RANGE, RX_LIFT_K, RX_LIFT_RANGE = 175.0, 1.5, 30000.0, 0.0005


class Disturb:
    def __init__(self, w, rng, randomize=True):
        self.w, self.rng = w, rng; m = w.m
        k = rng.uniform(0.3, 2.0) if randomize else 1.0
        self.sig = np.array([SHAKE_RMS_XY, SHAKE_RMS_XY, SHAKE_RMS_Z]) * k
        self.bump_acc = BUMP_ACC * (rng.uniform(0.5, 2.0) if randomize else 1.0)
        self.a = np.zeros(3); self.u = np.zeros(3); self.bump = np.zeros(3); self.bump_left = 0.0
        self.bodies = np.array([b for b in range(1, m.nbody) if m.body_dofnum[b] > 0 or m.body_weldid[b] != 0])
        self.mass = m.body_mass[self.bodies].copy()
        self.area = np.where(self.mass > 0.05, AREA, 0.0)            # only real links catch air, not tiny parts
        self.site_k = 1.0 + MAG_SITE_SPREAD * rng.uniform(-1, 1, m.nsite) if randomize else np.ones(m.nsite)
        self.log = []                                                # (time, event) for bumps: shown in pictures / logs

    def apply(self, dt):
        """add this physics step's disturbance forces to d.xfrc_applied (after it was cleared)"""
        r, d = self.rng, self.w.d
        self.a += -self.a * dt / SHAKE_TAU + self.sig * math.sqrt(2 * dt / SHAKE_TAU) * r.standard_normal(3)
        if self.bump_left <= 0 and r.random() < BUMP_RATE * dt:
            v = r.standard_normal(3); v[2] *= 0.3; self.bump = self.bump_acc * v / np.linalg.norm(v); self.bump_left = BUMP_DUR
            self.log.append((round(float(d.time), 2), 'bump %.1f m/s2' % self.bump_acc))
        acc = self.a + (self.bump if self.bump_left > 0 else 0.0); self.bump_left -= dt
        self.u += -self.u * dt / WIND_TAU + WIND_SIGMA * math.sqrt(2 * dt / WIND_TAU) * r.standard_normal(3) * np.array([1, 1, 0.3])
        v = d.cvel[self.bodies, 3:6]; rel = self.u[None] - v; sp = np.linalg.norm(rel, axis=1, keepdims=True)
        F = -self.mass[:, None] * acc[None] + 0.5 * RHO * CD * self.area[:, None] * sp * rel
        d.xfrc_applied[self.bodies, :3] += F
