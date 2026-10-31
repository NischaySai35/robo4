"""Multi-module physics env. Module 0 = the 'walker' (same API as WalkEnv so walk.Walker works unchanged);
modules 1.. = partners (each holds a commanded pose with the same servo model: sag, torque droop, jitter, shake).
Receivers: floor receivers (static or shaking cardboard) + side receivers on every spine (they MOVE with the spine).
All holding = contact + magnets (same magnet / polarity model as WalkEnv). Gravity vector is free -> slopes, walls, ceilings."""
from paths import tpath
import math, os, collections, numpy as np, mujoco
mujoco.set_mju_user_warning(lambda m: None)
from tetro_env2 import ACT, ACC_RAD, W0_12V, KT, MAG_F0, MAG_D0, MAG_CUT, RX_GAP, RX_TOP
from build_walk import R2q
MAG_PULL_IN = __import__('os').environ.get('MAG_PULL_IN', '1') == '1'   # magnets always pull the end IN (old sign(ax) flipped when touching faces overlapped: pushed it OUT with full force). GPU A/B 26 Oct, 256 robots: old 81/82 first docks, new 103/103; seated gap 0.11 -> 0.00 mm. MAG_PULL_IN=0 = old behaviour.
MULTI_XML = tpath('sim/multi_train.xml')
SUB = 60
END_PAD = RX_TOP - RX_GAP   # end pad tips stand 9.0 mm proud of its gap floors (CAD: same as receiver pads 15.3 - 6.3)
class MultiEnv:
    def __init__(self, seed=0, randomize=True, xml=MULTI_XML, nmod=2):
        self.m = mujoco.MjModel.from_xml_path(xml); self.d = mujoco.MjData(self.m); m = self.m
        self.rng = np.random.default_rng(seed); self.randomize = randomize; self.nmod = nmod
        self.P = [''] + ['m%d_' % i for i in range(1, nmod)]
        self.mods = []
        for p in self.P:
            r = dict(p=p)
            r['act_id'] = [m.actuator(p + 'm_' + n[2:]).id for n in ACT]
            r['lock_act'] = {'A': m.actuator(p + 'm_L1_lock').id, 'B': m.actuator(p + 'm_L2_lock').id}
            r['all_act'] = np.array(r['act_id'] + [r['lock_act']['A'], r['lock_act']['B']])
            r['qa'] = np.array([m.joint(p + n).qposadr[0] for n in ACT]); r['da'] = np.array([m.joint(p + n).dofadr[0] for n in ACT])
            r['all_dof'] = np.array(list(r['da']) + [m.joint(p + 'J_L1_lock').dofadr[0], m.joint(p + 'J_L2_lock').dofadr[0]])
            r['lo'] = np.array([m.jnt_range[m.joint(p + n).id][0] for n in ACT]) * 0.98; r['hi'] = -r['lo']
            r['end'] = {e: dict(body=m.body(p + 'End%s_LockModule' % e).id, tip=m.site(p + '%s_padtip' % e).id, mags=[m.site(p + '%s_mag%d' % (e, k)).id for k in range(8)],
                                lockq=m.joint(p + 'J_L%d_lock' % (1 if e == 'A' else 2)).qposadr[0]) for e in 'AB'}
            r['links'] = [m.body(p + n).id for n in ['T1_Housing_B1Fork', 'Spine1_B1B2', 'T2_Housing_B2Fork_GROUND', 'T2_Ring_B3Fork', 'Spine2_B3B4', 'T3_Housing_B4Fork']]
            r['root'] = m.joint(p + 'root').qposadr[0]; r['frame'] = m.body(p + 'module_frame').id
            r['flex'] = []; r['bl'] = []; r['main'] = [m.joint(p + n).id for n in ACT]
            self.mods.append(r)
        for j in range(m.njnt):
            n_ = m.joint(j).name; own = int(n_[1]) if n_.startswith('m') and n_[1].isdigit() and n_[2] == '_' else 0
            if '_flex' in n_: self.mods[own]['flex'].append(j)
            if n_.endswith('_bl'): self.mods[own]['bl'].append(j)
        M0 = self.mods[0]
        for k in ('act_id', 'lock_act', 'all_act', 'qa', 'da', 'all_dof', 'lo', 'hi', 'end', 'links', 'flex', 'bl', 'main'): setattr(self, k, M0[k])
        self.all_act_all = np.concatenate([r['all_act'] for r in self.mods]); self.all_dof_all = np.concatenate([r['all_dof'] for r in self.mods])
        self.nfloor = sum(1 for b in range(m.nbody) if m.body(b).name.startswith('rx'))
        mujoco.mj_forward(m, self.d)
        self.rx = []
        for i in range(self.nfloor):
            b = m.body('rx%d' % i).id; self.rx.append(dict(dyn=False, bid=b, mags_ids=[m.site('r%d_r0_rx_mag%d' % (i, k)).id for k in range(8)], mod=-1, name='rx%d' % i))
        for mi, p in enumerate(self.P):
            for n in range(4):
                b = m.body('%ssrx%d' % (p, n)).id
                self.rx.append(dict(dyn=True, bid=b, mags_ids=[m.site('%ssrx%d_r0_rx_mag%d' % (p, n, k)).id for k in range(8)], mod=mi, name='%ssrx%d' % (p, n)))
        # END TARGETS: every module end is a full connector (same pads/pockets/magnets as a receiver, plus its lock rotor),
        # so another module's end can dock into it (end<->end: pads interleave 45 deg, the docking end's rotor locks).
        for mi, rec in enumerate(self.mods):
            for e in 'AB':
                E = rec['end'][e]
                self.rx.append(dict(dyn=True, endt=e, bid=E['body'], tip_id=E['tip'], mags_ids=list(E['mags']), mod=mi, name='%send%s' % (self.P[mi], e)))
        self._refresh_rx(force=True)
        for j in range(m.njnt):
            n_ = m.joint(j).name
            if '_flex' in n_ or n_.endswith('_bl'): m.dof_damping[m.jnt_dofadr[j]] *= 25
        m.actuator_biasprm[:, 2] *= 4
        for i in range(m.ngeom):
            if m.geom_contype[i] == 1 and m.geom_conaffinity[i] == 2:
                m.geom_conaffinity[i] = 3
                if hasattr(m, 'body_conaffinity'): m.body_conaffinity[m.geom_bodyid[i]] |= 1
        # END<->END CONTACT: an end's connector geoms (pads, lips, pockets, rotor fins: contype 4 / conaffinity 2) only touched RECEIVER geoms (2/5),
        # so two module ends passed through each other (found 25 Oct: end<->end docks 'stopped' 3 mm short with nothing touching).
        # Give them receiver bits too, so one end's pads/fins collide with the other end's pads/lips/fins exactly like with a receiver.
        # 26 Oct: bits 4/6 (were 6/7). 6/7 also made ends collide with module BODY geoms (1/3), which they never did:
        # docking pads then hit the partner's coarse spine box around a side receiver and stuck ~10 mm high
        # (end->spine 0/10 finished OK; switch off -> 9/9). 4/6: end-end 4&6, end-receiver(2/5) 4&5, end-body(1/3) none.
        # (an end's own fins vs its own pads stay excluded: rotor is the end's child body)
        if os.environ.get('END_END_CONTACT', '1') == '1':
            for i in range(m.ngeom):
                if m.geom_contype[i] == 4 and m.geom_conaffinity[i] == 2:
                    m.geom_contype[i] = 4; m.geom_conaffinity[i] = 6
        self.nom = dict(stiff=m.jnt_stiffness.copy(), damp=m.dof_damping.copy(), fl=m.dof_frictionloss.copy(), gain=m.actuator_gainprm.copy(), bias=m.actuator_biasprm.copy(),
                        fr=m.actuator_forcerange.copy(), mass=m.body_mass.copy(), inert=m.body_inertia.copy(), rng=m.jnt_range.copy(), fric=m.geom_friction.copy())
        self.g_world = np.array([0, 0, -9.81]); self.shake = None; self.rx0_pos = {i: m.body_pos[self.rx[i]['bid']].copy() for i in range(self.nfloor)}
    def _refresh_rx(self, force=False):
        d = self.d
        for i, RX in enumerate(self.rx):
            if not RX['dyn'] and not force and not self.shake: continue
            b = RX['bid']
            if RX.get('endt'):
                # receiver-equivalent frame of an end connector: z = outward axis of the end, x = along its pads.
                # Its gap floors sit END_PAD m behind its pad tips; a docking end's pad tips must reach them (same as a receiver seat).
                Rb = d.xmat[b].reshape(3, 3); n = Rb[:, 1] * (1.0 if RX['endt'] == 'B' else -1.0)
                R = np.stack([Rb[:, 0], np.cross(n, Rb[:, 0]), n], 1); seat = d.site_xpos[RX['tip_id']] - END_PAD * n
                RX.update(o=seat - RX_GAP * n, R=R, z=n.copy(), seat=seat, mags=d.site_xpos[RX['mags_ids']].copy()); continue
            o = d.xpos[b].copy(); R = d.xmat[b].reshape(3, 3).copy()
            RX.update(o=o, R=R, z=R[:, 2].copy(), seat=o + RX_GAP * R[:, 2], mags=d.site_xpos[RX['mags_ids']].copy())
    def _randomize(self, gvec=None):
        m, n, r = self.m, self.nom, self.rng
        m.jnt_stiffness[:] = n['stiff']; m.dof_damping[:] = n['damp']; m.dof_frictionloss[:] = n['fl']; m.actuator_gainprm[:] = n['gain']; m.actuator_biasprm[:] = n['bias']
        m.actuator_forcerange[:] = n['fr']; m.body_mass[:] = n['mass']; m.body_inertia[:] = n['inert']; m.jnt_range[:] = n['rng']; m.geom_friction[:] = n['fric']
        g = np.array([0, 0, -9.81]) if gvec is None else np.asarray(gvec, float); m.opt.gravity[:] = g; self.g_world = g.copy()
        M = self.nmod; self.delay, self.noise, self.push_p, self.magk, self.mag_gap = 1, 0.0015, 0.0, 1.0, 0.0
        self.amax = np.full((M, 9), ACC_RAD); self.volt = np.full(M, 11.1); self.w0 = np.full((M, 9), W0_12V * 11.1 / 12)
        if not self.randomize: return
        for rec in self.mods:
            for j in rec['flex']: m.jnt_stiffness[j] *= r.uniform(0.6, 1.5); m.dof_damping[m.jnt_dofadr[j]] *= r.uniform(0.6, 1.8)
            for j in rec['bl']: m.jnt_range[j] = n['rng'][j] * max(r.uniform(0, 2.0), 0.05)
            for j in rec['main']: m.dof_frictionloss[m.jnt_dofadr[j]] *= r.uniform(0.6, 1.5)
        for a in range(m.nu):
            k = r.uniform(0.75, 1.25); m.actuator_gainprm[a, 0] *= k; m.actuator_biasprm[a, 1] *= k; m.actuator_forcerange[a] = n['fr'][a] * r.uniform(0.75, 1.0)
        for b in range(1, m.nbody):
            if m.body(b).name.startswith('rx') or 'srx' in m.body(b).name: continue
            s = r.uniform(0.92, 1.08); m.body_mass[b] = n['mass'][b] * s; m.body_inertia[b] = n['inert'][b] * s
        m.geom_friction[:, 0] = n['fric'][:, 0] * r.uniform(0.7, 1.4)
        self.delay = int(r.integers(1, 4)); self.noise = r.uniform(0.0005, 0.003); self.push_p = r.uniform(0.0, 0.03)
        self.magk = r.uniform(0.6, 1.4); self.mag_gap = r.uniform(0.0, 0.0006) + float(os.environ.get('MAG_RECESS_MM', '0')) / 1000
        self.amax = ACC_RAD * r.uniform(0.85, 1.15, (M, 9)); self.volt = r.uniform(10.5, 12.6, M); self.w0 = W0_12V * self.volt[:, None] / 12 * r.uniform(0.9, 1.05, (M, 9))
    def lock_sign(self, e): return -1.0 if e == 'A' else 1.0
    def _place(self, i, rx_i, yaw_deg, q0):
        m, d = self.m, self.d; rec = self.mods[i]; p = rec['p']; RX = self.rx[rx_i]
        x = RX['R'] @ np.array([math.cos(math.radians(yaw_deg)), math.sin(math.radians(yaw_deg)), 0]); y = RX['z']; z = np.cross(x, y); Rt = np.stack([x, y, z], 1)
        pA = m.body(p + 'EndA_LockModule').pos; pa = m.site(p + 'A_padtip').pos; a = rec['root']
        d.qpos[a:a + 3] = RX['seat'] - Rt @ (pA + pa); d.qpos[a + 3:a + 7] = R2q(Rt)
        d.qpos[rec['qa']] = q0; d.ctrl[rec['act_id']] = q0
        lk = math.radians(45) * self.lock_sign('A'); d.qpos[rec['end']['A']['lockq']] = lk; d.ctrl[rec['lock_act']['A']] = lk
    def reset(self, base='A', base_rx=0, yaw_deg=45.0, q0=None, partners=(), gvec=None, shake=None, settle=300):
        """partners: list of (module_index, floor_rx_index, yaw_deg, q0[7]) -> anchored by their End A in that floor receiver."""
        self._randomize(gvec); m, d = self.m, self.d; mujoco.mj_resetData(m, d)
        for i in range(self.nfloor): m.body_pos[self.rx[i]['bid']] = self.rx0_pos[i]
        self.shake = None; mujoco.mj_forward(m, d); self._refresh_rx(force=True)
        q0 = np.zeros(7) if q0 is None else np.asarray(q0, float)
        self._place(0, base_rx, yaw_deg, q0); self.pq = {}
        for (i, rxi, yw, qq) in partners: self._place(i, rxi, yw, np.asarray(qq, float)); self.pq[i] = (np.asarray(qq, float), 45.0, 0.0)
        mujoco.mj_forward(m, d)
        for _ in range(settle): mujoco.mj_step(m, d)
        self._refresh_rx(force=True)
        self.tgt = d.ctrl[self.all_act_all].copy(); self.sp = self.tgt.copy(); self.spv = np.zeros(9 * self.nmod); self.fr0 = m.actuator_forcerange[self.all_act_all, 1].copy()
        self.queue = collections.deque([q0.copy()] * self.delay, maxlen=self.delay + 1); self.cmd = q0.copy()
        r = self.rng; self.qhist = collections.deque(maxlen=4); self.obs_lag = int(r.integers(0, 3)) if self.randomize else 1
        self.push_left = 0; self.t = 0; self.qhist.append(self._meas())
        self.rx_bias = [r.normal(0, 0.0007, 3) * (1 if self.randomize else 0) for _ in self.rx]
        for b in self.rx_bias:
            nb = np.linalg.norm(b)
            if nb > 0.0015: b *= 0.0015 / nb
        if shake is not None: self.shake = shake   # (amp_m, freq_hz, direction[3]) -> the cardboard (floor receivers) shakes
        self.mag_force_m = [dict(A=0.0, B=0.0) for _ in range(self.nmod)]
    def set_partner(self, i, q=None, la=None, lb=None):
        q0, a0, b0 = self.pq[i]; self.pq[i] = (q0 if q is None else np.asarray(q, float), a0 if la is None else la, b0 if lb is None else lb)
    def _meas(self):
        q = self.d.qpos[self.qa] + self.rng.normal(0, self.noise, 7); return np.round(q / 0.001534) * 0.001534
    def measured(self): return self.qhist[max(0, len(self.qhist) - 1 - self.obs_lag)].copy()
    def measured_m(self, i): rec = self.mods[i]; q = self.d.qpos[rec['qa']] + self.rng.normal(0, self.noise, 7); return np.round(q / 0.001534) * 0.001534
    def _magnets(self):
        d = self.d; pol = np.where(np.arange(8) % 2 == 0, 1.0, -1.0)
        for i, rec in enumerate(self.mods):
            mf = {'A': 0.0, 'B': 0.0}
            for e in 'AB':
                E = rec['end'][e]; tip = d.site_xpos[E['tip']]
                for RX in self.rx:
                    if RX['dyn'] and RX['mod'] == i: continue
                    if RX.get('endt') and RX['mod'] < i: continue   # end<->end pair: count the magnet pair once (reaction is applied below)
                    if np.linalg.norm(tip - RX['seat']) > MAG_CUT + 0.03: continue
                    z = RX['z']; Bm = d.site_xpos[E['mags']]
                    D = RX['mags'][None, :, :] - Bm[:, None, :]; L = np.linalg.norm(D, axis=2); j = L.argmin(1); v = D[np.arange(8), j]
                    ax = v @ z; lat = v - ax[:, None] * z[None, :]; ln = np.linalg.norm(lat, axis=1); sep = np.maximum(-ax, 0.0) + self.mag_gap
                    fm = self.magk * MAG_F0 / (1 + sep / MAG_D0) ** 3 * np.exp(-(ln / 0.006) ** 2)
                    fm = np.where((sep < MAG_CUT) & (ln < 0.012), fm, 0.0) * getattr(self, 'mag_boost', {}).get(e, 1.0)
                    fm = fm * np.where(pol * pol[j] < 0, 1.0, -1.0)
                    Fv = (z[None, :] * (-np.ones_like(ax) if MAG_PULL_IN else np.sign(ax))[:, None]) * fm[:, None] + lat / 0.004 * 0.5 * fm[:, None]
                    b = E['body']; c = d.xipos[b]
                    d.xfrc_applied[b, :3] += Fv.sum(0); d.xfrc_applied[b, 3:] += np.cross(Bm - c, Fv).sum(0)
                    # reaction on the receiver's body (moving side receivers) so momentum is conserved
                    if RX['dyn']:
                        rb = RX['bid']; rc = d.xipos[rb]; Pm = d.site_xpos[RX['mags_ids']][j]
                        d.xfrc_applied[rb, :3] -= Fv.sum(0); d.xfrc_applied[rb, 3:] -= np.cross(Pm - rc, Fv).sum(0)
                    mf[e] += float(fm.sum())
            self.mag_force_m[i] = mf
        self.mag_force = self.mag_force_m[0]
    def _servo(self, dt=0.005):
        M = self.nmod; F = self.d.actuator_force[self.all_act_all].reshape(M, 9)
        I = 1.8 + np.abs(F).sum(1) / KT; sag = np.maximum(self.volt - 0.08 * I, 9.0) / self.volt; sag9 = np.repeat(sag, 9)
        w0 = self.w0.ravel() * sag9; amax = self.amax.ravel(); e = self.tgt - self.sp
        vdes = np.sign(e) * np.minimum(w0, np.sqrt(2 * amax * np.abs(e)))
        self.spv += np.clip(vdes - self.spv, -amax * dt, amax * dt); self.sp += self.spv * dt
        self.d.ctrl[self.all_act_all] = self.sp
        w = self.d.qvel[self.all_dof_all]; tau = self.d.actuator_force[self.all_act_all]
        lim = sag9 * np.where(tau * w > 0, self.fr0 * np.clip(1 - np.abs(w) / w0, 0.08, 1.0), self.fr0)
        self.m.actuator_forcerange[self.all_act_all, 0] = -lim; self.m.actuator_forcerange[self.all_act_all, 1] = lim
    def step(self, cmd, lockA_deg, lockB_deg, extra_force=None):
        m, d, r = self.m, self.d, self.rng
        self.cmd = np.clip(cmd, self.lo, self.hi); self.queue.append(self.cmd.copy()); self.tgt[:7] = self.queue[0]
        self.tgt[7] = math.radians(lockA_deg) * self.lock_sign('A'); self.tgt[8] = math.radians(lockB_deg) * self.lock_sign('B')
        for i, (q, la, lb) in self.pq.items():
            o = 9 * i; self.tgt[o:o + 7] = np.clip(q, self.mods[i]['lo'], self.mods[i]['hi']); self.tgt[o + 7] = math.radians(la) * -1.0; self.tgt[o + 8] = math.radians(lb)
        if self.push_left <= 0 and r.random() < self.push_p:
            self.push_left = int(r.integers(2, 6)); self.push_b = int(r.choice(self.mods[int(r.integers(0, self.nmod))]['links'])); self.push_f = r.normal(0, 1.0, 3)
        for k in range(SUB):
            d.xfrc_applied[:] = 0
            if self.shake is not None:
                A, fq, dr = self.shake; tt = (self.t * SUB + k) * 0.001; off = A * math.sin(2 * math.pi * fq * tt) * np.asarray(dr, float)
                for i in range(self.nfloor): m.body_pos[self.rx[i]['bid']] = self.rx0_pos[i] + off
            if self.push_left > 0: d.xfrc_applied[self.push_b, :3] = self.push_f
            if extra_force is not None: d.xfrc_applied[extra_force[0], :3] += extra_force[1]
            if k % 5 == 0: self._servo()
            if k % 10 == 0: self._refresh_rx(force=True)
            self._magnets(); mujoco.mj_step(m, d)
        if self.push_left > 0: self.push_left -= 1
        self.t += 1; self.qhist.append(self._meas()); self._refresh_rx(force=True)
        return self.status()
    def end_vs_rx(self, e, i, mod=0):
        d = self.d; RX = self.rx[i]; E = self.mods[mod]['end'][e]; p = d.site_xpos[E['tip']]; R = d.xmat[E['body']].reshape(3, 3)
        rel = p - RX['seat']; ax = float(rel @ RX['z']); rad = float(np.linalg.norm(rel - ax * RX['z']))
        a = math.atan2(R[:, 0] @ RX['R'][:, 1], R[:, 0] @ RX['R'][:, 0]) - math.pi / 4; sl = (a + math.pi / 4) % (math.pi / 2) - math.pi / 4
        return dict(axial_mm=ax * 1000, radial_mm=rad * 1000, slot_deg=math.degrees(sl), lock_deg=math.degrees(abs(d.qpos[E['lockq']])))
    def status(self):
        d = self.d; zl = min(min(d.xpos[b][2] for b in rec['links']) for rec in self.mods)
        return dict(ok=bool(np.isfinite(d.qpos).all()), lowest_link_mm=zl * 1000, t=self.t)
