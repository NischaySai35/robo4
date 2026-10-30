
"""Walking physics env: free-standing module, real locks on both ends, N floor receivers.
Same servo model (ST3215 trapezoid + torque droop + battery sag), magnets, encoder noise/quantisation/lag, command delay,
random pushes and per-episode randomisation as tetro_env2 (the docking env that the controller was verified on)."""
import math, collections, json, numpy as np, mujoco
mujoco.set_mju_user_warning(lambda m: None)
from tetro_env2 import ACT, ACC_RAD, W0_12V, KT, MAG_F0, MAG_D0, MAG_CUT, RX_GAP, RX_TOP
from build_walk import R2q
MAG_PULL_IN = __import__('os').environ.get('MAG_PULL_IN', '1') == '1'   # magnets always pull the end IN (old sign(ax) flipped when touching faces overlapped: pushed it OUT with full force). GPU A/B 26 Oct, 256 robots: old 81/82 first docks, new 103/103; seated gap 0.11 -> 0.00 mm. MAG_PULL_IN=0 = old behaviour.
WALK_XML = r'D:\\robo4\\brain\\walk_train.xml'
SUB = 60
class WalkEnv:
    def __init__(self, seed=0, randomize=True, xml=WALK_XML):
        self.m = mujoco.MjModel.from_xml_path(xml); self.d = mujoco.MjData(self.m); m = self.m
        self.rng = np.random.default_rng(seed); self.randomize = randomize
        self.act_id = [m.actuator('m_' + n[2:]).id for n in ACT]
        self.lock_act = {'A': m.actuator('m_L1_lock').id, 'B': m.actuator('m_L2_lock').id}
        self.all_act = np.array(self.act_id + [self.lock_act['A'], self.lock_act['B']])
        self.qa = np.array([m.joint(n).qposadr[0] for n in ACT]); self.da = np.array([m.joint(n).dofadr[0] for n in ACT])
        self.all_dof = np.array(list(self.da) + [m.joint('J_L1_lock').dofadr[0], m.joint('J_L2_lock').dofadr[0]])
        self.lo = np.array([m.jnt_range[m.joint(n).id][0] for n in ACT]) * 0.98; self.hi = -self.lo
        self.end = {e: dict(body=m.body('End%s_LockModule' % e).id, tip=m.site('%s_padtip' % e).id, mags=[m.site('%s_mag%d' % (e, k)).id for k in range(8)],
                            lockq=m.joint('J_L%d_lock' % (1 if e == 'A' else 2)).qposadr[0]) for e in 'AB'}
        self.links = [m.body(n).id for n in ['T1_Housing_B1Fork', 'Spine1_B1B2', 'T2_Housing_B2Fork_GROUND', 'T2_Ring_B3Fork', 'Spine2_B3B4', 'T3_Housing_B4Fork']]
        self.flex = [j for j in range(m.njnt) if '_flex' in m.joint(j).name]; self.bl = [j for j in range(m.njnt) if m.joint(j).name.endswith('_bl')]
        self.main = [m.joint(n).id for n in ACT]
        nrx = sum(1 for b in range(m.nbody) if m.body(b).name.startswith('rx'))
        self.rx = []
        mujoco.mj_forward(m, self.d)
        for i in range(nrx):
            b = m.body('rx%d' % i).id; o = self.d.xpos[b].copy(); R = self.d.xmat[b].reshape(3, 3).copy()
            mags = np.array([self.d.site('r%d_rx_mag%d' % (i, k)).xpos for k in range(8)])
            self.rx.append(dict(o=o, R=R, z=R[:, 2].copy(), seat=o + RX_GAP * R[:, 2], mags=mags))
        for j in range(m.njnt):                      # SETTLE_FIX (same as docking env)
            n_ = m.joint(j).name
            if '_flex' in n_ or n_.endswith('_bl'): m.dof_damping[m.jnt_dofadr[j]] *= 25
        m.actuator_biasprm[:, 2] *= 4
        for i in range(m.ngeom):                     # self-collision between non-adjacent links
            if m.geom_contype[i] == 1 and m.geom_conaffinity[i] == 2:
                m.geom_conaffinity[i] = 3
                if hasattr(m, 'body_conaffinity'): m.body_conaffinity[m.geom_bodyid[i]] |= 1
        self.nom = dict(stiff=m.jnt_stiffness.copy(), damp=m.dof_damping.copy(), fl=m.dof_frictionloss.copy(), gain=m.actuator_gainprm.copy(), bias=m.actuator_biasprm.copy(),
                        fr=m.actuator_forcerange.copy(), mass=m.body_mass.copy(), inert=m.body_inertia.copy(), rng=m.jnt_range.copy(), fric=m.geom_friction.copy())
    def _randomize(self):
        m, n, r = self.m, self.nom, self.rng
        m.jnt_stiffness[:] = n['stiff']; m.dof_damping[:] = n['damp']; m.dof_frictionloss[:] = n['fl']; m.actuator_gainprm[:] = n['gain']; m.actuator_biasprm[:] = n['bias']
        m.actuator_forcerange[:] = n['fr']; m.body_mass[:] = n['mass']; m.body_inertia[:] = n['inert']; m.jnt_range[:] = n['rng']; m.geom_friction[:] = n['fric']
        m.opt.gravity[:] = [0, 0, -9.81]
        self.delay, self.noise, self.push_p, self.magk, self.mag_gap = 1, 0.0015, 0.0, 1.0, 0.0
        self.amax = np.full(9, ACC_RAD); self.volt = 11.1; self.w0 = np.full(9, W0_12V * self.volt / 12)
        if not self.randomize: return
        for j in self.flex: m.jnt_stiffness[j] *= r.uniform(0.6, 1.5); m.dof_damping[m.jnt_dofadr[j]] *= r.uniform(0.6, 1.8)
        for j in self.bl: m.jnt_range[j] = n['rng'][j] * max(r.uniform(0, 2.0), 0.05)
        for j in self.main: m.dof_frictionloss[m.jnt_dofadr[j]] *= r.uniform(0.6, 1.5)
        for a in range(m.nu):
            k = r.uniform(0.75, 1.25); m.actuator_gainprm[a, 0] *= k; m.actuator_biasprm[a, 1] *= k; m.actuator_forcerange[a] = n['fr'][a] * r.uniform(0.75, 1.0)
        for b in range(1, m.nbody):
            if m.body(b).name.startswith('rx'): continue
            s = r.uniform(0.92, 1.08); m.body_mass[b] = n['mass'][b] * s; m.body_inertia[b] = n['inert'][b] * s
        m.geom_friction[:, 0] = n['fric'][:, 0] * r.uniform(0.7, 1.4)
        t = math.radians(r.uniform(0, 1.5)); ph = r.uniform(0, 2 * math.pi)
        m.opt.gravity[:] = 9.81 * np.array([math.sin(t) * math.cos(ph), math.sin(t) * math.sin(ph), -math.cos(t)])
        self.delay = int(r.integers(1, 4)); self.noise = r.uniform(0.0005, 0.003); self.push_p = r.uniform(0.0, 0.03)
        self.magk = r.uniform(0.6, 1.4); self.mag_gap = r.uniform(0.0, 0.0006)
        self.mag_gap += float(__import__('os').environ.get('MAG_RECESS_MM', '0')) / 1000   # magnets sunk this far below the printed surface (both sides together)
        self.amax = ACC_RAD * r.uniform(0.85, 1.15, 9); self.volt = r.uniform(10.5, 12.6); self.w0 = W0_12V * self.volt / 12 * r.uniform(0.9, 1.05, 9)
    def lock_sign(self, e): return -1.0 if e == 'A' else 1.0          # A is the mirror of B
    def reset(self, base='A', base_rx=0, yaw_deg=45.0, q0=None):
        self._randomize(); m, d = self.m, self.d; mujoco.mj_resetData(m, d)
        RX = self.rx[base_rx]
        x = RX['R'] @ np.array([math.cos(math.radians(yaw_deg)), math.sin(math.radians(yaw_deg)), 0]); y = RX['z']; z = np.cross(x, y)
        Rt = np.stack([x, y, z], 1)                                       # base end body frame: +y = out of the receiver
        if base == 'A':
            pA = m.body('EndA_LockModule').pos; pa = m.site('A_padtip').pos
            d.qpos[0:3] = RX['seat'] - Rt @ (pA + pa); d.qpos[3:7] = R2q(Rt)
        else:
            raise NotImplementedError('start with End A as base')
        q0 = np.zeros(7) if q0 is None else q0
        d.qpos[self.qa] = q0; d.ctrl[self.act_id] = q0
        lk = math.radians(45) * self.lock_sign(base)
        d.qpos[self.end[base]['lockq']] = lk; d.ctrl[self.lock_act[base]] = lk
        mujoco.mj_forward(m, d)
        for _ in range(300): mujoco.mj_step(m, d)
        self.tgt = d.ctrl[self.all_act].copy(); self.sp = self.tgt.copy(); self.spv = np.zeros(9); self.fr0 = m.actuator_forcerange[self.all_act, 1].copy()
        self.queue = collections.deque([q0.copy()] * self.delay, maxlen=self.delay + 1); self.cmd = q0.copy()
        r = self.rng; self.qhist = collections.deque(maxlen=4); self.obs_lag = int(r.integers(0, 3)) if self.randomize else 1
        self.push_left = 0; self.t = 0; self.qhist.append(self._meas())
        # robot's map of the receivers is off a little (hand-measured positions)
        self.rx_bias = [r.normal(0, 0.0007, 3) * (1 if self.randomize else 0) for _ in self.rx]
        for b in self.rx_bias:
            nb = np.linalg.norm(b)
            if nb > 0.0015: b *= 0.0015 / nb
    def _meas(self):
        q = self.d.qpos[self.qa] + self.rng.normal(0, self.noise, 7); return np.round(q / 0.001534) * 0.001534
    def measured(self): return self.qhist[max(0, len(self.qhist) - 1 - self.obs_lag)].copy()
    def _magnets(self):
        d = self.d; self.mag_force = {'A': 0.0, 'B': 0.0}
        for e in 'AB':
            tip = d.site_xpos[self.end[e]['tip']]
            for RX in self.rx:
                if np.linalg.norm(tip - RX['seat']) > MAG_CUT + 0.03: continue
                z = RX['z']; Bm = d.site_xpos[self.end[e]['mags']]
                D = RX['mags'][None, :, :] - Bm[:, None, :]; L = np.linalg.norm(D, axis=2); j = L.argmin(1); v = D[np.arange(8), j]
                ax = v @ z; lat = v - ax[:, None] * z[None, :]; ln = np.linalg.norm(lat, axis=1)
                sep = np.maximum(-ax, 0.0) + self.mag_gap
                f = self.magk * MAG_F0 / (1 + sep / MAG_D0) ** 3 * np.exp(-(ln / 0.006) ** 2)
                f = np.where((sep < MAG_CUT) & (ln < 0.012), f, 0.0) * getattr(self, 'mag_boost', {}).get(e, 1.0)
                # POLARITY (Nischay's layout, same on every connector): pad/top segments (k even) = N, gap/bottom segments (k odd) = S.
                # Opposite poles attract (pad over gap = correct 45 deg dock); same poles repel (pad over pad = misaligned).
                pol = np.where(np.arange(8) % 2 == 0, 1.0, -1.0)
                f = f * np.where(pol * pol[j] < 0, 1.0, -1.0)
                Fv = (z[None, :] * (-np.ones_like(ax) if MAG_PULL_IN else np.sign(ax))[:, None]) * f[:, None] + lat / 0.004 * 0.5 * f[:, None]
                b = self.end[e]['body']; c = d.xipos[b]
                d.xfrc_applied[b, :3] += Fv.sum(0); d.xfrc_applied[b, 3:] += np.cross(Bm - c, Fv).sum(0)
                self.mag_force[e] += float(f.sum())          # net: attraction positive, repulsion negative
    def _servo(self, dt=0.005):
        I = 1.8 + float(np.sum(np.abs(self.d.actuator_force[self.all_act]))) / KT
        sag = max(self.volt - 0.08 * I, 9.0) / self.volt
        w0 = self.w0 * sag; e = self.tgt - self.sp
        vdes = np.sign(e) * np.minimum(w0, np.sqrt(2 * self.amax * np.abs(e)))
        self.spv += np.clip(vdes - self.spv, -self.amax * dt, self.amax * dt); self.sp += self.spv * dt
        self.d.ctrl[self.all_act] = self.sp
        w = self.d.qvel[self.all_dof]; tau = self.d.actuator_force[self.all_act]
        lim = sag * np.where(tau * w > 0, self.fr0 * np.clip(1 - np.abs(w) / w0, 0.08, 1.0), self.fr0)
        self.m.actuator_forcerange[self.all_act, 0] = -lim; self.m.actuator_forcerange[self.all_act, 1] = lim
    def step(self, cmd, lockA_deg, lockB_deg, extra_force=None):
        m, d, r = self.m, self.d, self.rng
        self.cmd = np.clip(cmd, self.lo, self.hi); self.queue.append(self.cmd.copy()); self.tgt[:7] = self.queue[0]
        self.tgt[7] = math.radians(lockA_deg) * self.lock_sign('A'); self.tgt[8] = math.radians(lockB_deg) * self.lock_sign('B')
        if self.push_left <= 0 and r.random() < self.push_p:
            self.push_left = int(r.integers(2, 6)); self.push_b = int(r.choice(self.links)); self.push_f = r.normal(0, 1.0, 3)
        for k in range(SUB):
            d.xfrc_applied[:] = 0
            if self.push_left > 0: d.xfrc_applied[self.push_b, :3] = self.push_f
            if extra_force is not None: d.xfrc_applied[extra_force[0], :3] += extra_force[1]
            if k % 5 == 0: self._servo()
            self._magnets(); mujoco.mj_step(m, d)
        if self.push_left > 0: self.push_left -= 1
        self.t += 1; self.qhist.append(self._meas())
        return self.status()
    def end_vs_rx(self, e, i):
        d = self.d; RX = self.rx[i]; p = d.site_xpos[self.end[e]['tip']]; R = d.xmat[self.end[e]['body']].reshape(3, 3)
        rel = p - RX['seat']; ax = float(rel @ RX['z']); rad = float(np.linalg.norm(rel - ax * RX['z']))
        a = math.atan2(R[:, 0] @ RX['R'][:, 1], R[:, 0] @ RX['R'][:, 0]) - math.pi / 4; sl = (a + math.pi / 4) % (math.pi / 2) - math.pi / 4
        return dict(axial_mm=ax * 1000, radial_mm=rad * 1000, slot_deg=math.degrees(sl), lock_deg=math.degrees(abs(d.qpos[self.end[e]['lockq']])))
    def status(self):
        d = self.d
        zl = min(d.xpos[b][2] for b in self.links)
        return dict(ok=bool(np.isfinite(d.qpos).all()), lowest_link_mm=zl * 1000, t=self.t)
