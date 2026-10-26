import os
"""TETROBOT docking env v2 - real connector geometry.
End B (4 pads, 8 magnets, rotor) must dock into a real receiver (same part as the floor lock, Body117):
  phase 0  ALIGN: pad tips held at a standoff (15-30 mm, random) above the receiver pad tops, on its normal,
           with the 45 deg slot offset matched (pads over gaps) to within 2 deg
  phase 1  STRAIGHT IN along the normal; magnets (8 x 8x1 mm N-grade, force model below) capture the last mm
  phase 2  SEATED: pad tips on the gap floors (within 0.3 mm), hold 0.5 s under random pushes -> success
Base End A sits in the floor lock through a springy mount (tilt 0.5-1 deg + lift 0-0.5 mm under load)."""
import math, collections
TW_MARGIN = os.environ.get('TW_MARGIN', '1') == '1'   # IK keeps twist joints within +-150 deg when it can (added 25 Oct)
import numpy as np, mujoco, gymnasium as gym
XML = r'D:\robo4\brain\train_v2.xml'
ACT = ['J_T1_twist', 'J_B1_bend', 'J_B2_bend', 'J_T2_twist', 'J_B3_bend', 'J_B4_bend', 'J_T3_twist']
DT_CTRL, SUB = 0.06, 60          # firmware FAST_MS = 60
TAU = 2.7; VMAX = 4.3 * DT_CTRL
RX_GAP, RX_TOP = 0.0063, 0.0153          # receiver gap floor / pad top above its back face
ACC_RAD = 40 * 100 * 2 * math.pi / 4096     # firmware POS_ACC_DEFAULT=40 (unit 100 steps/s^2) = 6.14 rad/s^2
W0_12V = 2 * math.pi * 45 / 60               # ST3215 no-load 0.222 s/60 deg (45 rpm) at 12 V
KT = 11 * 0.0981                              # 11 kg.cm/A torque constant -> N.m/A; no-load 0.2 A
MAG_F0, MAG_D0, MAG_CUT = 4.6, 0.0015, 0.020   # N per magnet pair at contact (0.47 kgf), decay length, cutoff
def quat_from_R(R):
    q = np.zeros(4); mujoco.mju_mat2Quat(q, np.ascontiguousarray(R).reshape(9)); return q
def rot(axis, ang):
    axis = axis / np.linalg.norm(axis); K = np.array([[0, -axis[2], axis[1]], [axis[2], 0, -axis[0]], [-axis[1], axis[0], 0]])
    return np.eye(3) + math.sin(ang) * K + (1 - math.cos(ang)) * K @ K
class TetroDockEnv(gym.Env):
    metadata = {'render_modes': []}
    def __init__(self, seed=0, randomize=True, floor_frac=0.6, max_dist=0.30, ep_len=260, xml=None, ik_assist=False):
        self.m = mujoco.MjModel.from_xml_path(xml or XML); self.d = mujoco.MjData(self.m); self.dr = mujoco.MjData(self.m)
        m = self.m; self.rng = np.random.default_rng(seed); self.randomize = randomize
        self.floor_frac, self.max_dist, self.ep_len = floor_frac, max_dist, ep_len
        self.act_id = [m.actuator('m_' + n[2:]).id for n in ACT]; self.lock_act = [m.actuator('m_L1_lock').id, m.actuator('m_L2_lock').id]
        self.qa = np.array([m.joint(n).qposadr[0] for n in ACT]); self.da = np.array([m.joint(n).dofadr[0] for n in ACT])
        self.lo = np.array([m.jnt_range[m.joint(n).id][0] for n in ACT]) * 0.98; self.hi = -self.lo
        self.eb = m.body('EndB_LockModule').id; self.rx = m.body('target_rx').id; self.mocap = m.body_mocapid[self.rx]
        self.s_tip = m.site('B_padtip').id; self.s_bmag = [m.site('B_mag%d' % k).id for k in range(8)]
        self.links = [m.body(n).id for n in ['Spine1_B1B2', 'T2_Housing_B2Fork_GROUND', 'T2_Ring_B3Fork', 'Spine2_B3B4', 'T3_Housing_B4Fork', 'EndB_LockModule']]
        self.flex = [j for j in range(m.njnt) if '_flex' in m.joint(j).name]; self.bl = [j for j in range(m.njnt) if m.joint(j).name.endswith('_bl')]
        self.base_tilt = [m.joint('base_tilt_a').id, m.joint('base_tilt_b').id]; self.main = [m.joint(n).id for n in ACT]
        self.qlock = m.joint('J_L2_lock').qposadr[0]
        self.all_act = np.array(self.act_id + self.lock_act); self.all_dof = np.array(list(self.da) + [m.joint('J_L1_lock').dofadr[0], m.joint('J_L2_lock').dofadr[0]])
        self.rx_geoms = set(i for i in range(m.ngeom) if m.geom_bodyid[i] == self.rx)
        # SETTLE_FIX: PLA flex/backlash/base damping x25 and servo damping x4 -> settles in ~0.9 s after a push (was ~6 s); static sag unchanged
        for j in range(m.njnt):
            n_ = m.joint(j).name
            if '_flex' in n_ or n_.endswith('_bl') or n_.startswith('base_'): m.dof_damping[m.jnt_dofadr[j]] *= 25
        m.actuator_biasprm[:, 2] *= 4
        self.nom = dict(stiff=m.jnt_stiffness.copy(), damp=m.dof_damping.copy(), fl=m.dof_frictionloss.copy(), gain=m.actuator_gainprm.copy(), bias=m.actuator_biasprm.copy(),
                        fr=m.actuator_forcerange.copy(), mass=m.body_mass.copy(), inert=m.body_inertia.copy(), rng=m.jnt_range.copy(), fric=m.geom_friction.copy())
        for i in range(m.ngeom):                 # self-collision between non-adjacent links
            if m.geom_contype[i] == 1 and m.geom_conaffinity[i] == 2:
                m.geom_conaffinity[i] = 3
                if hasattr(m, 'body_conaffinity'): m.body_conaffinity[m.geom_bodyid[i]] |= 1   # MuJoCo 3 body-level filter
        mujoco.mj_forward(m, self.d); self.base_xy = self.d.site('A_padtip').xpos[:2].copy()
        self.ik_assist = ik_assist
        self.htol = (0.003, math.radians(2))     # hover gate (pos m, angle rad); training starts looser and tightens
        self.observation_space = gym.spaces.Box(-np.inf, np.inf, (68 if ik_assist else 54,), np.float32); self.action_space = gym.spaces.Box(-1, 1, (7,), np.float32)
    # ---------- every episode is a slightly different robot
    def _randomize(self):
        m, n, r = self.m, self.nom, self.rng
        m.jnt_stiffness[:] = n['stiff']; m.dof_damping[:] = n['damp']; m.dof_frictionloss[:] = n['fl']; m.actuator_gainprm[:] = n['gain']; m.actuator_biasprm[:] = n['bias']
        m.actuator_forcerange[:] = n['fr']; m.body_mass[:] = n['mass']; m.body_inertia[:] = n['inert']; m.jnt_range[:] = n['rng']; m.geom_friction[:] = n['fric']
        self.delay, self.noise, self.push_p, self.magk, self.mag_gap = 1, 0.0015, 0.0, 1.0, 0.0
        self.amax = np.full(9, ACC_RAD); self.volt = 11.1; self.w0 = np.full(9, W0_12V * self.volt / 12)
        if not self.randomize: return
        for j in self.flex: m.jnt_stiffness[j] *= r.uniform(0.6, 1.5); m.dof_damping[m.jnt_dofadr[j]] *= r.uniform(0.6, 1.8)
        for j in self.bl: m.jnt_range[j] = n['rng'][j] * max(r.uniform(0, 2.0), 0.05)
        for j in self.main: m.dof_frictionloss[m.jnt_dofadr[j]] *= r.uniform(0.6, 1.5)
        for j in self.base_tilt: m.jnt_stiffness[j] = r.uniform(150, 300)       # 0.5-1 deg at full load (measured on the real base lock)
        for a in range(m.nu):
            k = r.uniform(0.75, 1.25); m.actuator_gainprm[a, 0] *= k; m.actuator_biasprm[a, 1] *= k; m.actuator_forcerange[a] = n['fr'][a] * r.uniform(0.75, 1.0)
        for b in range(1, m.nbody):
            if b == self.rx: continue
            MR = float(os.environ.get('MASS_RAND', '0.08')); s = r.uniform(1 - MR, 1 + MR); m.body_mass[b] = n['mass'][b] * s; m.body_inertia[b] = n['inert'][b] * s
        m.geom_friction[:, 0] = n['fric'][:, 0] * r.uniform(0.7, 1.4)                # PLA on PLA 0.25-0.5
        t = np.radians(r.uniform(0, 1.5)); ph = r.uniform(0, 2 * np.pi)
        m.opt.gravity[:] = 9.81 * np.array([np.sin(t) * np.cos(ph), np.sin(t) * np.sin(ph), -np.cos(t)])
        self.delay = int(r.integers(1, 4)); self.noise = r.uniform(0.0005, 0.003); self.push_p = r.uniform(0.0, 0.03)
        self.magk = r.uniform(0.6, 1.4)            # magnet grade unknown (N35-N52) + glue depth
        self.mag_gap = r.uniform(0.0, 0.0006)      # magnets sit slightly below the PLA surface
        self.amax = ACC_RAD * r.uniform(0.85, 1.15, 9)   # servo-to-servo variation of the internal ramp
        self.volt = r.uniform(10.5, 12.6); self.w0 = W0_12V * self.volt / 12 * r.uniform(0.9, 1.05, 9)   # 3S LiPo full -> sagged
    # ---------- kinematics from encoders (what the real robot can compute)
    def _fk(self, q):
        # encoder-only estimate of End B INCLUDING PLA sag: gravity load on every flex/backlash/base joint / nominal stiffness (same calc runs on the laptop for the real robot)
        m, dr = self.m, self.dr
        dr.qpos[:] = 0; dr.qpos[self.qa] = q; dr.qvel[:] = 0
        if not hasattr(self, '_sagj'):
            self._sagj = [j for j in range(m.njnt) if '_flex' in m.joint(j).name or m.joint(j).name.startswith('base_tilt')]
            self._blj = [j for j in range(m.njnt) if m.joint(j).name.endswith('_bl')]
            self._f = np.zeros(m.nv)
        for _ in range(3):
            mujoco.mj_kinematics(m, dr); mujoco.mj_comPos(m, dr); mujoco.mj_rne(m, dr, 0, self._f)
            for j in self._sagj: dr.qpos[m.jnt_qposadr[j]] = -self._f[m.jnt_dofadr[j]] / self.nom['stiff'][j]
            for j in self._blj: dr.qpos[m.jnt_qposadr[j]] = -np.sign(self._f[m.jnt_dofadr[j]]) * self.nom['rng'][j][1]
        mujoco.mj_kinematics(m, dr)
        R = dr.xmat[self.eb].reshape(3, 3); return dr.site_xpos[self.s_tip].copy(), R[:, 1].copy(), R[:, 0].copy()
    def _set_rx(self, origin, z, x):
        z = z / np.linalg.norm(z); x = x - np.dot(x, z) * z; x /= np.linalg.norm(x); y = np.cross(z, x)
        self.Rrx = np.stack([x, y, z], 1); self.rx_o = origin.copy()
        self.d.mocap_pos[self.mocap] = origin; self.d.mocap_quat[self.mocap] = quat_from_R(self.Rrx)
        self.rx_mag = np.array([origin + self.Rrx @ np.array([0.03 * math.cos(math.radians(a)), 0.03 * math.sin(math.radians(a)), (RX_TOP if a % 90 == 0 else RX_GAP)]) for a in range(0, 360, 45)])
    def _sample_target(self):
        r = self.rng
        if r.random() < self.floor_frac:
            dist = r.uniform(0.18, self.max_dist); ang = r.uniform(-np.pi, np.pi); yaw = r.uniform(-np.pi, np.pi)
            o = np.array([self.base_xy[0] + dist * math.cos(ang), self.base_xy[1] + dist * math.sin(ang), 0.0])
            return o, np.array([0, 0, 1.0]), np.array([math.cos(yaw), math.sin(yaw), 0]), 'floor'
        for _ in range(300):
            q = r.uniform(self.lo * 0.8, self.hi * 0.8); p, nB, xB = self._fk(q)
            zs = self.dr.xpos[self.links][:, 2]
            o = p + RX_GAP * nB
            if p[2] > 0.10 and zs.min() > 0.06 and np.linalg.norm(o[:2] - self.base_xy) > 0.12:
                z = -nB; return o, z, rot(z, math.radians(45 + 90 * r.integers(0, 4))) @ xB, 'air'
        return np.array([0.3, 0.0, 0.3]), np.array([-1.0, 0, 0]), np.array([0, 0, 1.0]), 'air'
    def reset(self, seed=None, options=None):
        if seed is not None: self.rng = np.random.default_rng(seed)
        self._randomize(); m, d = self.m, self.d; mujoco.mj_resetData(m, d)
        q0 = np.clip(self.rng.normal(0, 0.05, 7), self.lo, self.hi); d.qpos[self.qa] = q0; d.ctrl[self.act_id] = q0; d.ctrl[self.lock_act] = 0
        o, z, x, self.kind = self._sample_target(); self._set_rx(o, z, x)
        mujoco.mj_forward(m, d)
        for _ in range(200): mujoco.mj_step(m, d)
        self.tgt = d.ctrl[self.all_act].copy(); self.sp = self.tgt.copy(); self.spv = np.zeros(9); self.fr0 = m.actuator_forcerange[self.all_act, 1].copy()
        self.standoff = self.rng.uniform(0.015, 0.030)
        self.hover = o + (RX_TOP + self.standoff) * z; self.seat = o + RX_GAP * z
        self.cmd = q0.copy(); self.prev_a = np.zeros(7); self.queue = collections.deque([q0.copy()] * self.delay, maxlen=self.delay + 1)
        self.phase = 0; self.steady = 0; self.t = 0; self.push_left = 0; self.pull = 0; self.lock_t = 0
        self.prev_E = self._err()[0]
        r = self.rng; self.qhist = collections.deque(maxlen=4)
        self.obs_lag = int(r.integers(0, 3)) if self.randomize else 1          # position readings 0-120 ms old
        if self.randomize:                                                     # robot's estimate of the target is off a little
            b = r.normal(0, 0.0007, 3); n_ = np.linalg.norm(b); self.bias_p = b * min(1.0, 0.0015 / max(n_, 1e-9))
            ax_ = r.normal(0, 1, 3); self.Rrx_obs = rot(ax_, math.radians(r.uniform(0, 0.5))) @ self.Rrx
        else: self.bias_p = np.zeros(3); self.Rrx_obs = self.Rrx.copy()
        self.res_q = np.zeros(7); self.wi = 0; self.wp = [q0]
        if self.ik_assist:
            zo = self.Rrx_obs[:, 2]; ho = self.hover + self.bias_p; so = self.seat + self.bias_p
            wp = [self._ik(ho, zo, self.Rrx_obs, q0, seeds=6)]
            for f in [0.8, 0.6, 0.4, 0.25, 0.12, 0.04]: wp.append(self._ik(so + (ho - so) * f, zo, self.Rrx_obs, wp[-1]))
            wp.append(self._ik(so - 0.0004 * zo, zo, self.Rrx_obs, wp[-1])); self.wp = wp
        return self._obs(), {}
    # ---------- fast rigid IK (the 'calculator'); RL learns the sag/backlash correction on top
    def _ik(self, p, z, Ro, q0, seeds=0):
        from scipy.optimize import least_squares
        def res(q):
            pp, nB, xB = self._fk(q)
            a_ = math.atan2(np.dot(xB, Ro[:, 1]), np.dot(xB, Ro[:, 0])) - math.pi / 4; s_ = (a_ + math.pi / 4) % (math.pi / 2) - math.pi / 4
            mg = np.maximum(np.abs(q[[0, 3, 6]]) - math.radians(150), 0) * 100 if TW_MARGIN else np.zeros(3)   # keep twists 30 deg away from their +-180 stop
            return np.concatenate([(pp - p) * 1000, np.cross(nB, -z) * 60, [s_ * 60], (q - q0) * 0.2, mg])
        best = None
        for s0 in [q0] + [self.rng.uniform(self.lo * 0.8, self.hi * 0.8) for _ in range(seeds)]:
            r = least_squares(res, np.clip(s0, self.lo, self.hi), bounds=(self.lo, self.hi), max_nfev=120)
            c = float(np.linalg.norm(r.fun[:7]) + np.linalg.norm(r.fun[-3:]))   # pick the seed that also stays clear of the twist stops
            if best is None or c < best[0]: best = (c, r.x)
        return best[1]
    def _base(self):
        return self.wp[self.wi if self.phase >= 1 else 0]
    def _slot_err(self, xB):
        # angle of End B pad 0 relative to the nearest receiver gap centre (gaps at 45+90k in rx frame)
        a = math.atan2(np.dot(xB, self.Rrx[:, 1]), np.dot(xB, self.Rrx[:, 0])) - math.pi / 4
        return (a + math.pi / 4) % (math.pi / 2) - math.pi / 4
    def _err(self, p=None, nB=None, xB=None):
        if p is None:
            R = self.d.xmat[self.eb].reshape(3, 3); p, nB, xB = self.d.site_xpos[self.s_tip].copy(), R[:, 1], R[:, 0]
        z = self.Rrx[:, 2]; goal = self.hover if self.phase == 0 else self.seat
        e = float(np.linalg.norm(p - goal)); ang = math.acos(max(-1.0, min(1.0, float(-np.dot(nB, z))))); sl = abs(self._slot_err(xB))
        rel = p - self.seat; axial = float(np.dot(rel, z)); radial = float(np.linalg.norm(rel - axial * z))
        return e + 0.03 * ang + 0.03 * sl, e, ang, sl, axial, radial
    def _meas(self):
        q = self.d.qpos[self.qa] + self.rng.normal(0, self.noise, 7); return np.round(q / 0.001534) * 0.001534
    def _obs(self):
        self.qhist.append((self._meas(), self.d.qvel[self.da].copy()))
        q, qd = self.qhist[max(0, len(self.qhist) - 1 - self.obs_lag)]
        p, nB, xB = self._fk(q); Ro = self.Rrx_obs; z = Ro[:, 2]
        goal = (self.hover if self.phase == 0 else self.seat) + self.bias_p
        a_ = math.atan2(np.dot(xB, Ro[:, 1]), np.dot(xB, Ro[:, 0])) - math.pi / 4; s = (a_ + math.pi / 4) % (math.pi / 2) - math.pi / 4
        ph = np.eye(3)[min(self.phase, 2)]
        o = np.concatenate([np.sin(q), np.cos(q), qd * 0.1, self.prev_a, self.cmd - q, (goal - p) * 10, nB, z, [math.sin(4 * s), math.cos(4 * s)], goal * 2, ph, [self.t / self.ep_len, self.standoff * 30]] + ([self.res_q * 5, self._base() - q] if self.ik_assist else []))
        return o.astype(np.float32)
    def _magnets(self):
        d = self.d; tip = d.site_xpos[self.s_tip]
        if np.linalg.norm(tip - self.seat) > MAG_CUT + 0.03: return
        z = self.Rrx[:, 2]
        B = d.site_xpos[self.s_bmag]; D = self.rx_mag[None, :, :] - B[:, None, :]; L = np.linalg.norm(D, axis=2)
        j = L.argmin(1); v = D[np.arange(8), j]                      # B magnet -> facing receiver magnet
        ax = v @ z; lat = v - ax[:, None] * z[None, :]; ln = np.linalg.norm(lat, axis=1)
        sep = np.maximum(-ax, 0.0) + self.mag_gap                     # face-to-face separation (B is above, so ax<0)
        f = self.magk * MAG_F0 / (1 + sep / MAG_D0) ** 3 * np.exp(-(ln / 0.006) ** 2)   # 8 mm discs: little loss for small side offset
        f = np.where((sep < MAG_CUT) & (ln < 0.012), f, 0.0)
        F = (z[None, :] * np.sign(ax)[:, None]) * f[:, None] + lat / 0.004 * 0.5 * f[:, None]   # pull toward the facing magnet + side-centring
        c = d.xipos[self.eb]; Ft = F.sum(0); Tt = np.cross(B - c, F).sum(0)
        d.xfrc_applied[self.eb, :3] += Ft; d.xfrc_applied[self.eb, 3:] += Tt
        self.mag_force = float(f.sum())
    def _servo(self, dt=0.005):
        # ST3215 internal motion profile (firmware sends WritePosEx with speed + ACC): trapezoid toward the goal
        I = 1.8 + float(np.sum(np.abs(self.d.actuator_force[self.all_act]))) / KT
        sag = max(self.volt - 0.08 * I, 9.0) / self.volt                     # 3S pack + wiring ~0.08 ohm
        w0 = self.w0 * sag; e = self.tgt - self.sp
        vdes = np.sign(e) * np.minimum(w0, np.sqrt(2 * self.amax * np.abs(e)))
        self.spv += np.clip(vdes - self.spv, -self.amax * dt, self.amax * dt); self.sp += self.spv * dt
        self.d.ctrl[self.all_act] = self.sp
        # torque-speed droop: full torque at stall, zero at no-load speed (only while driving, braking keeps full torque)
        w = self.d.qvel[self.all_dof]; tau = self.d.actuator_force[self.all_act]
        motoring = tau * w > 0
        lim = sag * np.where(motoring, self.fr0 * np.clip(1 - np.abs(w) / w0, 0.08, 1.0), self.fr0)
        self.m.actuator_forcerange[self.all_act, 0] = -lim; self.m.actuator_forcerange[self.all_act, 1] = lim
    def step(self, a):
        m, d, r = self.m, self.d, self.rng
        a = np.clip(a, -1, 1)
        if self.ik_assist:
            if self.phase >= 1 and self.t % 3 == 0: self.wi = min(self.wi + 1, len(self.wp) - 1)   # IK walks straight in along the normal
            self.res_q = np.clip(self.res_q + a * 0.02, -0.15, 0.15)                               # RL: small correction on top
            goal = np.clip(self._base() + self.res_q, self.lo, self.hi)
            self.cmd = np.clip(self.cmd + np.clip(goal - self.cmd, -VMAX, VMAX), self.lo, self.hi)
        else:
            self.cmd = np.clip(self.cmd + a * VMAX, self.lo, self.hi)
        self.queue.append(self.cmd.copy()); self.tgt[:7] = self.queue[0]
        if self.push_left <= 0 and r.random() < self.push_p:
            self.push_left = int(r.integers(2, 6)); self.push_b = int(r.choice(self.links)); self.push_f = r.normal(0, 1.0, 3)
        self.mag_force = 0.0
        for k in range(SUB):
            d.xfrc_applied[:] = 0
            if self.push_left > 0: d.xfrc_applied[self.push_b, :3] = self.push_f
            if self.pull > 0: d.xfrc_applied[self.eb, :3] += 15.0 * self.Rrx[:, 2]   # pull-off test: 15 N straight out
            if k % 5 == 0: self._servo()      # servo profile + torque droop updated every 5 ms
            self._magnets(); mujoco.mj_step(m, d)
        if self.push_left > 0: self.push_left -= 1
        self.t += 1
        E, e, ang, sl, axial, radial = self._err(); v = float(np.linalg.norm(d.cvel[self.eb][3:]))
        tau = np.abs(d.actuator_force[self.act_id]) / TAU
        rew = 2.0 * math.exp(-E / 0.15) + 1.5 * math.exp(-E / 0.03) + 1.0 * math.exp(-E / 0.004) + 30.0 * (self.prev_E - E)
        self.prev_E = E
        rew -= 0.3 * float(np.sum(tau ** 2)) / 7 + 0.15 * float(np.sum((a - self.prev_a) ** 2)) / 7 + 0.002 * float(np.sum(d.qvel[self.da] ** 2))
        info = {'phase': self.phase, 'success': False, 'crash': False, 'kind': self.kind}
        if self.phase >= 1: rew -= 40 * radial + 2.0 * sl
        term = False
        if self.phase == 0:
            ok = e < self.htol[0] and ang < self.htol[1] and sl < self.htol[1] and v < 0.03
            self.steady = self.steady + 1 if ok else 0
            if self.steady >= 4: self.phase = 1; self.steady = 0; rew += 10.0; self.prev_E = self._err()[0]
        else:
            seated = abs(axial) < 0.0006 and radial < 0.0015 and sl < math.radians(2.5)
            if self.phase == 1 and seated: self.phase = 2; self.steady = 0; rew += 15.0
            if self.phase == 2:
                held = abs(axial) < 0.0005 and radial < 0.0010 and sl < math.radians(2.5)
                self.steady = self.steady + 1 if held else 0; rew += 1.0 if held else -1.0
                if self.steady >= 3 or self.lock_t > 0:
                    self.tgt[8] = math.radians(45); self.lock_t += 1   # firmware turns the lock fins 45 deg
                lockdeg = math.degrees(abs(d.qpos[self.qlock]))
                if self.pull == 0 and lockdeg > 40 and self.steady >= 6: self.pull = 1
                elif self.pull > 0:
                    self.pull += 1
                    if self.pull > 11:
                        term = True
                        if abs(axial) < 0.0008 and radial < 0.0015: rew += 40.0; info['success'] = True
                        else: rew -= 10.0; info['pull_fail'] = True
                elif self.lock_t > 50: rew -= 10.0; term = True; info['lock_jam'] = True   # 3 s for the lock turn + settle
        zl = min(d.xpos[b][2] for b in self.links)
        if zl < 0.012 or not np.isfinite(d.qpos).all() or (self.phase == 0 and axial < (RX_TOP - RX_GAP) - 0.001 and radial < 0.05):
            rew -= 20.0; term = True; info['crash'] = True
        self.prev_a = a; trunc = self.t >= self.ep_len
        info.update(current_A=float(np.sum(0.2 + np.abs(d.actuator_force[self.all_act]) / KT * (np.abs(d.actuator_force[self.all_act]) > 0.02))), lock_deg=math.degrees(abs(d.qpos[self.qlock])), err_mm=e * 1000, ang_deg=math.degrees(ang), slot_deg=math.degrees(sl), axial_mm=axial * 1000, radial_mm=radial * 1000, mag_N=self.mag_force, max_load=float(tau.max()))
        return self._obs(), float(rew), term, trunc, info
