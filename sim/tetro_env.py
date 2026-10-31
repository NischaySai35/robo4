"""TETROBOT single-module docking env (MuJoCo, calibrated flex/backlash, domain randomized).
Task: bring End B to a target connector pose: ALIGN at a hover point 20 mm out along the normal,
then move STRAIGHT in along the normal to contact, then hold. Mix of floor receivers and air targets."""
from paths import tpath
import math, collections
import numpy as np, mujoco, gymnasium as gym
XML = tpath('sim/tetrobot_train.xml')
RIGID = tpath('sim/tetrobot_scene_v1_rigid.xml')
ACT = ['J_T1_twist', 'J_B1_bend', 'J_B2_bend', 'J_T2_twist', 'J_B3_bend', 'J_B4_bend', 'J_T3_twist']
DT_CTRL, SUB = 0.05, 50          # 20 Hz policy, 1 kHz physics
TAU = 2.7; VMAX = 4.3 * DT_CTRL  # rad per control step at 11.1 V
HOVER = 0.020; REC_TOP = 0.020; FACE = 0.004
class TetroDockEnv(gym.Env):
    metadata = {'render_modes': []}
    def __init__(self, seed=0, randomize=True, floor_frac=0.6, max_dist=0.42, ep_len=240, xml=None):
        self.m = mujoco.MjModel.from_xml_path(xml or XML); self.d = mujoco.MjData(self.m)
        self.mr = self.m; self.dr = mujoco.MjData(self.m)   # same model; flex/backlash at 0 = rigid kinematics from encoders
        self.rng = np.random.default_rng(seed); self.randomize = randomize
        self.floor_frac, self.max_dist, self.ep_len = floor_frac, max_dist, ep_len
        m = self.m
        self.act_id = [m.actuator('m_' + n[2:]).id for n in ACT]
        self.lock_act = [m.actuator('m_L1_lock').id, m.actuator('m_L2_lock').id]
        self.qa = np.array([m.joint(n).qposadr[0] for n in ACT]); self.da = np.array([m.joint(n).dofadr[0] for n in ACT])
        self.qa_r = np.array([self.mr.joint(n).qposadr[0] for n in ACT])
        self.lo = np.array([m.jnt_range[m.joint(n).id][0] for n in ACT]) * 0.98; self.hi = -self.lo
        self.tip = m.body('L2_LockRotor_B').id; self.tip_r = self.mr.body('L2_LockRotor_B').id
        self.links = [m.body(n).id for n in ['Spine1_B1B2', 'T2_Housing_B2Fork_GROUND', 'T2_Ring_B3Fork', 'Spine2_B3B4', 'T3_Housing_B4Fork', 'EndB_LockModule']]
        self.flex = [j for j in range(m.njnt) if '_flex' in m.joint(j).name]; self.bl = [j for j in range(m.njnt) if m.joint(j).name.endswith('_bl')]
        self.main = [m.joint(n).id for n in ACT]
        self.nom = dict(stiff=m.jnt_stiffness.copy(), damp=m.dof_damping.copy(), fl=m.dof_frictionloss.copy(), gain=m.actuator_gainprm.copy(), bias=m.actuator_biasprm.copy(), fr=m.actuator_forcerange.copy(), mass=m.body_mass.copy(), inert=m.body_inertia.copy(), rng=m.jnt_range.copy())
        self.observation_space = gym.spaces.Box(-np.inf, np.inf, (49,), np.float32)
        self.action_space = gym.spaces.Box(-1, 1, (7,), np.float32)
    # ---------------- randomization: every episode is a slightly different robot
    def _randomize(self):
        m, n, r = self.m, self.nom, self.rng
        m.jnt_stiffness[:] = n['stiff']; m.dof_damping[:] = n['damp']; m.dof_frictionloss[:] = n['fl']
        m.actuator_gainprm[:] = n['gain']; m.actuator_biasprm[:] = n['bias']; m.actuator_forcerange[:] = n['fr']
        m.body_mass[:] = n['mass']; m.body_inertia[:] = n['inert']; m.jnt_range[:] = n['rng']
        self.delay = 1; self.noise = 0.0015; self.push_p = 0.0
        if not self.randomize: return
        for j in self.flex:
            m.jnt_stiffness[j] *= r.uniform(0.6, 1.5); m.dof_damping[m.jnt_dofadr[j]] *= r.uniform(0.6, 1.8)
        for j in self.bl:
            s = r.uniform(0.0, 2.0); m.jnt_range[j] = n['rng'][j] * max(s, 0.05)
        for j in self.main: m.dof_frictionloss[m.jnt_dofadr[j]] *= r.uniform(0.6, 1.5)
        for a in range(m.nu):
            k = r.uniform(0.75, 1.25); m.actuator_gainprm[a, 0] *= k; m.actuator_biasprm[a, 1] *= k
            m.actuator_forcerange[a] = n['fr'][a] * r.uniform(0.75, 1.0)    # battery sag 12.6 -> 10.5 V, heat
        for b in range(1, m.nbody):
            s = r.uniform(0.92, 1.08); m.body_mass[b] = n['mass'][b] * s; m.body_inertia[b] = n['inert'][b] * s
        t = np.radians(r.uniform(0, 1.5)); ph = r.uniform(0, 2 * np.pi)   # cardboard not flat
        m.opt.gravity[:] = 9.81 * np.array([np.sin(t) * np.cos(ph), np.sin(t) * np.sin(ph), -np.cos(t)])
        self.delay = int(r.integers(1, 4))          # 50-150 ms Wi-Fi/HTTP + servo bus
        self.noise = r.uniform(0.0005, 0.003)       # encoder noise, rad
        self.push_p = r.uniform(0.0, 0.03)          # random bumps / air / cable tug
    # ---------------- targets
    def _rigid_fk(self, q):
        self.dr.qpos[:] = 0; self.dr.qpos[self.qa_r] = q; mujoco.mj_kinematics(self.mr, self.dr)
        return self.dr.xpos[self.tip_r].copy(), self.dr.xmat[self.tip_r].reshape(3, 3)[:, 1].copy()
    def _sample_target(self):
        r = self.rng
        if r.random() < self.floor_frac:
            dist = r.uniform(0.18, self.max_dist); ang = r.uniform(-np.pi, np.pi)
            c = np.array([dist * np.cos(ang), dist * np.sin(ang), REC_TOP + FACE]); n = np.array([0, 0, -1.0])
            return c, n, 'floor'
        for _ in range(200):
            q = r.uniform(self.lo * 0.8, self.hi * 0.8)
            p, n = self._rigid_fk(q)
            if p[2] > 0.10 and np.all(self.dr.xpos[[self.mr.body(b).id for b in ['Spine1_B1B2', 'Spine2_B3B4', 'EndB_LockModule']]][:, 2] > 0.05):
                self.mr_tau_ok = True
                return p, n, 'air'
        return np.array([0.25, 0, 0.35]), np.array([1.0, 0, 0]), 'air'
    # ---------------- gym API
    def reset(self, seed=None, options=None):
        if seed is not None: self.rng = np.random.default_rng(seed)
        self._randomize(); m, d = self.m, self.d
        mujoco.mj_resetData(m, d)
        q0 = self.rng.normal(0, 0.05, 7); q0 = np.clip(q0, self.lo, self.hi)
        d.qpos[self.qa] = q0; d.ctrl[self.act_id] = q0; d.ctrl[self.lock_act] = 0
        mujoco.mj_forward(m, d)
        for _ in range(200): mujoco.mj_step(m, d)
        self.cmd = q0.copy(); self.prev_a = np.zeros(7)
        self.queue = collections.deque([q0.copy()] * self.delay, maxlen=self.delay + 1)
        self.contact, self.normal, self.kind = self._sample_target()
        self.hover = self.contact - self.normal * HOVER
        self.phase = 0; self.steady = 0; self.t = 0; self.push_left = 0
        self.best = None
        self.prev_e = float(np.linalg.norm(self._true_tip()[0] - self.hover))
        return self._obs(), {}
    def _meas(self):
        q = self.d.qpos[self.qa] + self.rng.normal(0, self.noise, 7)
        return np.round(q / 0.001534) * 0.001534          # 12-bit encoder steps
    def _obs(self):
        q = self._meas(); qd = self.d.qvel[self.da]
        p, n = self._rigid_fk(q)                           # what the robot can compute from its own encoders
        goal = self.hover if self.phase == 0 else self.contact
        o = np.concatenate([np.sin(q), np.cos(q), qd * 0.1, self.prev_a, (goal - p) * 10, n, self.normal, goal * 2, [self.phase, self.t / self.ep_len], self.cmd - q])
        return o.astype(np.float32)
    def _true_tip(self):
        return self.d.xpos[self.tip].copy(), self.d.xmat[self.tip].reshape(3, 3)[:, 1].copy()
    def step(self, a):
        m, d, r = self.m, self.d, self.rng
        a = np.clip(a, -1, 1)
        self.cmd = np.clip(self.cmd + a * VMAX, self.lo, self.hi)
        self.queue.append(self.cmd.copy()); applied = self.queue[0]
        d.ctrl[self.act_id] = applied
        if self.push_left <= 0 and r.random() < self.push_p:
            self.push_left = int(r.integers(2, 6)); self.push_b = int(r.choice(self.links)); self.push_f = r.normal(0, 1.0, 3)
        d.xfrc_applied[:] = 0
        if self.push_left > 0: d.xfrc_applied[self.push_b, :3] = self.push_f; self.push_left -= 1
        for _ in range(SUB): mujoco.mj_step(m, d)
        self.t += 1
        p, n = self._true_tip(); v = np.linalg.norm(d.cvel[self.tip][3:])
        goal = self.hover if self.phase == 0 else self.contact
        e = np.linalg.norm(p - goal); ang = math.acos(max(-1.0, min(1.0, float(np.dot(n, -self.normal)))))
        tau = np.abs(d.actuator_force[self.act_id]) / TAU
        axis_off = np.linalg.norm((p - self.contact) - np.dot(p - self.contact, self.normal) * self.normal)
        prox = np.exp(-e / 0.10)
        rew = 2.0 * np.exp(-e / 0.15) + 1.5 * np.exp(-e / 0.03) + 1.0 * np.exp(-e / 0.004) + 1.0 * prox * np.exp(-ang / 0.12) + 30.0 * (self.prev_e - e)
        self.prev_e = e
        rew -= 0.3 * np.sum(tau ** 2) / 7 + 0.15 * np.sum((a - self.prev_a) ** 2) / 7 + 0.002 * np.sum(d.qvel[self.da] ** 2)
        info = {'phase': self.phase, 'success': False, 'crash': False, 'kind': self.kind}
        if self.phase == 1: rew -= 40 * axis_off      # stay on the approach line
        aligned = e < (0.004 if self.phase == 0 else 0.0025) and ang < math.radians(3 if self.phase == 0 else 2) and v < 0.03
        self.steady = self.steady + 1 if aligned else 0
        term = False
        if self.phase == 0 and self.steady >= 4:
            self.phase = 1; self.steady = 0; rew += 10.0; self.prev_e = np.linalg.norm(p - self.contact)           # aligned at hover: now go straight in
        elif self.phase == 1 and self.steady >= 10:
            rew += 40.0; term = True; info['success'] = True       # seated and steady 0.5 s
        zl = min(d.xpos[b][2] for b in self.links)
        if zl < 0.012 or p[2] < REC_TOP - 0.004 or not np.isfinite(d.qpos).all():
            rew -= 20.0; term = True; info['crash'] = True
        self.prev_a = a
        trunc = self.t >= self.ep_len
        info.update(err_mm=e * 1000, ang_deg=math.degrees(ang), max_load=float(tau.max()))
        return self._obs(), float(rew), term, trunc, info
