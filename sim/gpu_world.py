"""gpu_world.py — phys_world.PhysWorld on the GPU: thousands of randomized copies of the SAME scene at once (MuJoCo Warp).

The rules are phys_world's, unchanged:
  - modules = multi_train.xml modules (real pads, gaps, fins, spine receivers, PLA flex + backlash), floor receivers at anchors;
  - MAGNETS = forces between the real magnet sites (N/S, MAG_SCALE-measured strength), reaction on moving receivers;
  - servos = the ST3215 model (speed, accel, torque-speed droop, battery sag), every 5 ms;
  - a LOCK = rotor turned 45 deg; it is WELDED only after physics seated it (the caller decides with the brain's own test),
    weld at the pose it is in at that moment, and that end's connector faces stop colliding (per world: geom_margin -> -1 m);
  - randomization = the GPU runs' ranges (gpu_multi_dock.py), drawn per world.
Speed: one 60 ms controller frame (60 x 1 ms physics + servos + magnets) is captured as ONE CUDA graph, so the cost is
GPU work, not Python launches (gpu_multi_dock.py launches ~60 x 50 kernels from Python per frame).

   w = GPUWorld(phys_world_instance, N, seed);  w.engage(worlds, lock_key);  w.frame(targets);  S = w.state()"""
import os, math, numpy as np, mujoco
from tetro_env2 import ACC_RAD, W0_12V, KT, MAG_F0, MAG_D0, MAG_CUT, RX_GAP
from phys_world import END_PAD, STALL, lock_key
import disturb as DIST

OFF_MARGIN = -1.0          # geom_margin of a welded end's connector geoms: contact only below -1 m = never


class GPUWorld:
    def __init__(self, pw, N, seed=11, randomize=True):
        import torch, warp as wp, mujoco_warp as mjw
        self.torch, self.wp, self.mjw, self.pw = torch, wp, mjw, pw
        dev = self.dev = 'cuda'; m = self.m = pw.m; self.N = N
        wp.init(); self.tstream = torch.cuda.Stream(); torch.cuda.set_stream(self.tstream); self.stream = wp.stream_from_torch(self.tstream)
        g = self.g = torch.Generator(device=dev); g.manual_seed(seed)
        T = self.T = lambda x, dt=torch.float32: torch.as_tensor(np.asarray(x), dtype=dt, device=dev); Lg = torch.long
        if os.environ.get('TIMESTEP_MS'): m.opt.timestep = float(os.environ['TIMESTEP_MS']) / 1000      # speed test only (1 ms = phys_world)
        self.ts = m.opt.timestep; self.SUB = int(round(0.06 / self.ts)); self.nserv = max(1, int(round(0.005 / self.ts))); self.nrx = max(1, int(round(0.010 / self.ts)))
        # noslip: phys_world (CPU) uses the model's 3; every earlier GPU run (gpu_multi_dock / gpu_walk: 103/103, 19/19) used 0.
        # Measured 27 Oct, 256 robots mid-dock: 3 -> 1.3 robot-s/s, 0 -> 13.2 robot-s/s. GPU default 0; compare against the CPU numbers.
        m.opt.noslip_iterations = int(os.environ.get('NOSLIP', '0'))
        if os.environ.get('ITERS'): m.opt.iterations = int(os.environ['ITERS'])
        self.mm = mm = mjw.put_model(m)
        if os.environ.get('BROADPHASE'): mm.opt.broadphase = int(os.environ['BROADPHASE'])
        if os.environ.get('BP_FILTER'): mm.opt.broadphase_filter = int(os.environ['BP_FILTER'])
        d0 = mujoco.MjData(m); d0.qpos[:] = pw.d.qpos; d0.ctrl[:] = pw.d.ctrl; mujoco.mj_kinematics(m, d0)   # pose only: contacts are found on the GPU
        self.d = mjw.put_data(m, d0, nworld=N, nconmax=int(os.environ.get('NCONMAX', '1000')), njmax=int(os.environ.get('NJMAX', '2400')))
        mm.opt.warn_overflow = 0xFFF & ~int(mjw.OverflowType.EPA_HORIZON)
        # ---- per-world model fields (randomization + per-world welds / contact switches)
        P = {}
        for f in ['dof_damping', 'dof_frictionloss', 'jnt_stiffness', 'jnt_range', 'body_mass', 'body_inertia', 'geom_friction', 'geom_margin',
                  'actuator_gainprm', 'actuator_biasprm', 'actuator_forcerange', 'eq_data']:
            old = getattr(mm, f); t = T(np.repeat(np.asarray(getattr(m, f))[None], N, 0).copy()); P[f] = t; setattr(mm, f, wp.from_torch(t, dtype=old.dtype))
        self.P = P; NOM = {k: v[0].clone() for k, v in P.items()}; self.margin0 = NOM['geom_margin']
        U = lambda *s, lo=0.0, hi=1.0: lo + (hi - lo) * torch.rand(s, device=dev, generator=g)
        jn = [m.joint(j).name for j in range(m.njnt)]; jd = T(m.jnt_dofadr, Lg)
        flex = T([j for j, n in enumerate(jn) if '_flex' in n], Lg); bl = T([j for j, n in enumerate(jn) if n.endswith('_bl')], Lg)
        main = T([dof for mid in pw.ids for dof in pw.mod[mid]['dofs']], Lg)
        nA = len(pw.all_act); nM = len(pw.ids)
        self.grav = T(np.repeat(m.opt.gravity[None], N, 0)); self.magk = torch.ones(N, device=dev); self.mag_gap = torch.zeros(N, device=dev)
        self.amax = torch.full((N, nA), ACC_RAD, device=dev); self.volt = torch.full((N, nM), 11.1, device=dev); self.w0 = torch.full((N, nA), W0_12V * 11.1 / 12, device=dev)
        if randomize:      # phys_world._randomize, per world
            P['jnt_stiffness'][:, flex] *= U(N, len(flex), lo=0.6, hi=1.5); P['dof_damping'][:, jd[flex]] *= U(N, len(flex), lo=0.6, hi=1.8)
            P['jnt_range'][:, bl] = NOM['jnt_range'][bl] * U(N, len(bl), lo=0.0, hi=2.0).clamp_min(0.05)[..., None]
            P['dof_frictionloss'][:, main] *= U(N, len(main), lo=0.6, hi=1.5)
            k = U(N, m.nu, lo=0.75, hi=1.25); P['actuator_gainprm'][:, :, 0] *= k; P['actuator_biasprm'][:, :, 1] *= k
            P['actuator_forcerange'][:] = NOM['actuator_forcerange'] * U(N, m.nu, lo=0.75, hi=1.0)[..., None]
            s = U(N, m.nbody, lo=0.92, hi=1.08); s[:, 0] = 1
            for b in range(m.nbody):
                if '_rx0' in m.body(b).name or 'srx' in m.body(b).name: s[:, b] = 1
            P['body_mass'][:] = NOM['body_mass'] * s; P['body_inertia'][:] = NOM['body_inertia'] * s[..., None]
            P['geom_friction'][:, :, 0] = NOM['geom_friction'][:, 0] * U(N, 1, lo=0.7, hi=1.4)
            tl = torch.deg2rad(U(N, hi=1.5)); ph = U(N, hi=2 * math.pi)
            self.grav = 9.81 * torch.stack([torch.sin(tl) * torch.cos(ph), torch.sin(tl) * torch.sin(ph), -torch.cos(tl)], -1)
            self.magk = U(N, lo=0.6, hi=1.4); self.mag_gap = U(N, hi=0.0006)
            self.amax = ACC_RAD * U(N, nA, lo=0.85, hi=1.15); self.volt = U(N, nM, lo=10.5, hi=12.6)
            self.w0 = W0_12V * self.volt.repeat_interleave(9, 1) / 12 * U(N, nA, lo=0.9, hi=1.05)
            rxj = T([j for j, n in enumerate(jn) if n.startswith('F_') and m.jnt_stiffness[j] > 0], Lg)     # cardboard under the receivers
            if len(rxj): P['jnt_stiffness'][:, rxj] *= U(N, len(rxj), lo=0.5, hi=1.5)
        mm.opt.gravity = wp.from_torch(self.grav.clone(), dtype=wp.vec3)
        self.all_act = T(pw.all_act, Lg); self.all_dof = T(pw.all_dof, Lg)
        self.fr0 = P['actuator_forcerange'][:, self.all_act, 1].clone()
        # ---- ends (2 per module) and receivers (floor, spines, ends) for the magnets
        E = [(mi, mid, e) for mi, mid in enumerate(pw.ids) for e in 'AB']; self.ends = E; nE = len(E)
        self.e_tip = T([pw.mod[mid]['end'][e]['tip'] for _, mid, e in E], Lg); self.e_body = T([pw.mod[mid]['end'][e]['body'] for _, mid, e in E], Lg)
        self.e_mags = T([pw.mod[mid]['end'][e]['mags'] for _, mid, e in E], Lg)
        R = pw.rx; self.rnames = [x['name'] for x in R]; nR = len(R)
        self.r_bid = T([x['bid'] for x in R], Lg); self.r_mags = T([x['mags'] for x in R], Lg)
        self.r_isend = T([x['kind'] == 'end' for x in R], torch.bool); self.r_sgn = T([(1.0 if x.get('endt') == 'B' else -1.0) for x in R])
        self.r_tip = T([x.get('tip', 0) for x in R], Lg); self.r_dyn = T([x['kind'] != 'floor' for x in R], torch.bool)
        mask = np.zeros((nE, nR), bool)                         # which receivers an end may be pulled by (phys_world._magnets)
        for i, (mi, mid, e) in enumerate(E):
            for r, x in enumerate(R):
                if x['mod'] == mid: mask[i, r] = True
                elif x['kind'] == 'end' and pw.ids.index(x['mod']) < mi: mask[i, r] = True      # an end pair is counted once
        self.r_mask = T(mask, torch.bool); self.pol = T([1.0 if k % 2 == 0 else -1.0 for k in range(8)])
        # ---- read-outs
        self.qa = T([a for mid in pw.ids for a in pw.mod[mid]['qa']], Lg); self.lockq = T([pw.mod[mid]['lockq'][e] for mid in pw.ids for e in 'AB'], Lg)
        self.links = T([[m.body(f'{mid}_{n}').id for n in ['T1_Housing_B1Fork', 'Spine1_B1B2', 'T2_Housing_B2Fork_GROUND', 'T2_Ring_B3Fork', 'Spine2_B3B4', 'T3_Housing_B4Fork']] for mid in pw.ids], Lg)
        self.view = T(pw.view_bodies, Lg)
        tt = lambda a: wp.to_torch(a)
        d = self.d
        self.qpos, self.qvel, self.ctrl, self.xfrc = tt(d.qpos), tt(d.qvel), tt(d.ctrl), tt(d.xfrc_applied)
        self.sxp, self.xmat, self.xpos, self.xipos, self.afrc = tt(d.site_xpos), tt(d.xmat), tt(d.xpos), tt(d.xipos), tt(d.actuator_force)
        self.eq_active = tt(d.eq_active); self.time = tt(d.time)
        self.tgt = self.T(np.repeat(pw.tgt[None], N, 0)); self.sp = self.tgt.clone(); self.spv = torch.zeros_like(self.tgt)
        self.ctrl[:, self.all_act] = self.sp
        self.peak = torch.zeros(N, device=dev); self.magf = torch.zeros(N, nE, device=dev)
        self.eq_index = {k: pw.eq[k] for k in pw.eq}; self.engaged = np.zeros((N, m.neq), bool)
        # ---- the room (disturb.py, estimates): floor shake + bumps + air per world, every magnet different, servo deadband
        self.dist = DIST.ON
        if self.dist:
            torch.cuda.manual_seed(seed)
            kk = U(N, lo=0.3, hi=2.0) if randomize else torch.ones(N, device=dev)
            self.sig = torch.tensor([DIST.SHAKE_RMS_XY, DIST.SHAKE_RMS_XY, DIST.SHAKE_RMS_Z], device=dev)[None] * kk[:, None]
            self.bump_acc = DIST.BUMP_ACC * (U(N, lo=0.5, hi=2.0) if randomize else torch.ones(N, device=dev))
            self.sh_a = torch.zeros(N, 3, device=dev); self.wind = torch.zeros(N, 3, device=dev); self.bump = torch.zeros(N, 3, device=dev); self.bump_left = torch.zeros(N, device=dev)
            B = [b for b in range(1, m.nbody) if m.body_dofnum[b] > 0 or m.body_weldid[b] != 0]; self.d_bodies = T(B, Lg)
            self.d_area = T(np.where(m.body_mass[B] > 0.05, DIST.AREA, 0.0)); self.cvel = tt(d.cvel)
            self.site_k = 1.0 + DIST.MAG_SITE_SPREAD * (2 * U(N, m.nsite) - 1) if randomize else torch.ones(N, m.nsite, device=dev)
            self.nbump = torch.zeros(N, device=dev); self.zs = torch.tensor([1.0, 1.0, 0.3], device=dev)
        self._capture()

    # ------------------------------------------------------------------ physics
    def _rx_update(self):
        torch = self.torch; N = self.N
        Rb = self.xmat[:, self.r_bid].reshape(N, -1, 3, 3); o = self.xpos[:, self.r_bid]
        n_end = Rb[..., :, 1] * self.r_sgn[None, :, None]; z_rx = Rb[..., :, 2]; ie = self.r_isend[None, :, None]
        self.rz = torch.where(ie, n_end, z_rx)
        self.rseat = torch.where(ie, self.sxp[:, self.r_tip] - END_PAD * n_end, o + RX_GAP * z_rx)
        x = Rb[..., :, 0]
        self.rR = torch.where(ie[..., None], torch.stack([x, torch.cross(n_end, x, dim=-1), n_end], -1), Rb)
        self.rmags = self.sxp[:, self.r_mags]                                  # (N, R, 8, 3)

    def _servo(self):
        torch = self.torch; nM = len(self.pw.ids)
        af = torch.nan_to_num(self.afrc[:, self.all_act]); I = 1.8 + af.reshape(self.N, nM, 9).abs().sum(-1) / KT
        sag = ((self.volt - 0.08 * I).clamp_min(9.0) / self.volt).repeat_interleave(9, 1)
        w0 = self.w0 * sag; e = self.tgt - self.sp
        if self.dist: e = torch.where(e.abs() < DIST.DEADBAND, torch.zeros_like(e), e)       # servo deadband
        vdes = torch.sign(e) * torch.minimum(w0, torch.sqrt(2 * self.amax * e.abs()))
        sdt = self.nserv * self.ts
        self.spv += (vdes - self.spv).clamp(-self.amax * sdt, self.amax * sdt); self.sp += self.spv * sdt
        self.ctrl[:, self.all_act] = self.sp
        w = torch.nan_to_num(self.qvel[:, self.all_dof])
        lim = sag * torch.where(af * w > 0, self.fr0 * (1 - w.abs() / w0).clamp(0.08, 1.0), self.fr0)
        fr = self.P['actuator_forcerange']; fr[:, self.all_act, 0] = -lim; fr[:, self.all_act, 1] = lim
        self.peak.copy_(torch.maximum(self.peak, af.abs().max(-1).values / STALL * 100))

    def _magnets(self):
        torch = self.torch; N = self.N; ar = torch.arange(N, device=self.dev)[:, None]
        tip = self.sxp[:, self.e_tip]                                          # (N, E, 3)
        dist = (tip[:, :, None] - self.rseat[:, None]).norm(dim=-1).masked_fill(self.r_mask[None], 1e9)
        dmin, r = dist.min(-1)                                                 # nearest receiver per end
        near = dmin < MAG_CUT + 0.03
        z = self.rz[ar, r]; RM = self.rmags[ar, r]; Bm = self.sxp[:, self.e_mags]          # (N,E,3) (N,E,8,3) (N,E,8,3)
        D = RM[:, :, None] - Bm[:, :, :, None]; j = D.norm(dim=-1).argmin(-1)              # (N,E,8,8,3) -> (N,E,8)
        v = torch.gather(D, 3, j[..., None, None].expand(-1, -1, -1, 1, 3)).squeeze(3)
        ax = (v * z[:, :, None]).sum(-1); lat = v - ax[..., None] * z[:, :, None]; ln = lat.norm(dim=-1)
        sep = (-ax).clamp_min(0) + self.mag_gap[:, None, None]
        f = self.magk[:, None, None] * MAG_F0 / (1 + sep / MAG_D0) ** 3 * torch.exp(-(ln / 0.006) ** 2)
        f = torch.where((sep < MAG_CUT) & (ln < 0.012) & near[..., None], f, torch.zeros_like(f))
        f = f * torch.where(self.pol[None, None] * self.pol[j] < 0, 1.0, -1.0)
        if self.dist:                                                          # every magnet differs (disturb.py)
            ke = self.site_k[ar[..., None], self.e_mags[None].expand(N, -1, -1)]
            kr = torch.gather(self.site_k[ar[..., None], self.r_mags[r]], 2, j)
            f = f * ke * kr
        Fv = -z[:, :, None] * f[..., None] + lat / 0.004 * 0.5 * f[..., None]           # pull IN (MAG_PULL_IN) + centring
        Fv = torch.nan_to_num(Fv)
        c = self.xipos[:, self.e_body]; Fs = Fv.sum(2); Ts = torch.cross(Bm - c[:, :, None], Fv, dim=-1).sum(2)
        nE = Fs.shape[1]; wi = ar.expand(N, nE)
        self.xfrc.index_put_((wi, self.e_body[None].expand(N, nE)), torch.cat([Fs, Ts], -1), accumulate=True)
        rb = self.r_bid[r]; dyn = self.r_dyn[r][..., None]                     # reaction on a moving receiver
        Pm = torch.gather(RM, 2, j[..., None].expand(-1, -1, -1, 3)); rc = self.xipos[ar, rb]
        Tr = torch.cross(Pm - rc[:, :, None], Fv, dim=-1).sum(2)
        self.xfrc.index_put_((wi, rb), -torch.where(dyn, torch.cat([Fs, Tr], -1), torch.zeros_like(Ts).repeat(1, 1, 2)), accumulate=True)
        self.magf.copy_(f.sum(-1))

    def _room(self):
        """floor shake + bumps + air for every world (disturb.Disturb.apply, batched)"""
        torch = self.torch; N = self.N; dt = self.ts
        self.sh_a += -self.sh_a * dt / DIST.SHAKE_TAU + self.sig * math.sqrt(2 * dt / DIST.SHAKE_TAU) * torch.randn(N, 3, device=self.dev)
        start = (self.bump_left <= 0) & (torch.rand(N, device=self.dev) < DIST.BUMP_RATE * dt)
        v = torch.randn(N, 3, device=self.dev) * self.zs; v = v / v.norm(dim=-1, keepdim=True)
        self.bump.copy_(torch.where(start[:, None], self.bump_acc[:, None] * v, self.bump))
        self.bump_left.copy_(torch.where(start, torch.full_like(self.bump_left, DIST.BUMP_DUR), self.bump_left - dt))
        self.nbump += start.float()
        acc = self.sh_a + self.bump * (self.bump_left > 0).float()[:, None]
        self.wind += -self.wind * dt / DIST.WIND_TAU + DIST.WIND_SIGMA * math.sqrt(2 * dt / DIST.WIND_TAU) * torch.randn(N, 3, device=self.dev) * self.zs
        rel = self.wind[:, None] - self.cvel[:, self.d_bodies, 3:6]; sp = rel.norm(dim=-1, keepdim=True)
        F = -self.P['body_mass'][:, self.d_bodies, None] * acc[:, None] + 0.5 * DIST.RHO * DIST.CD * self.d_area[None, :, None] * sp * rel
        self.xfrc[:, self.d_bodies, :3] += torch.nan_to_num(F)

    def _frame_body(self):
        self.peak.zero_()
        for k in range(self.SUB):
            self.xfrc.zero_()
            if k % self.nserv == 0: self._servo()
            if k % self.nrx == 0: self._rx_update()
            self._magnets()
            if self.dist: self._room()
            self.mjw.step(self.mm, self.d)
        self._rx_update()

    def _capture(self):
        torch, wp = self.torch, self.wp
        with wp.ScopedStream(self.stream):
            self.mjw.step(self.mm, self.d); self._rx_update(); self._magnets(); self._servo()        # load kernels, warm the allocator
            if self.dist: self._room(); self.xfrc.zero_()
            torch.cuda.synchronize()
            self.graph = torch.cuda.CUDAGraph()
            with torch.cuda.graph(self.graph, stream=self.tstream):
                wp.capture_begin(stream=self.stream, external=True)     # warp joins torch's capture (its temp buffers use the capture's pool)
                try: self._frame_body()
                finally: wp.capture_end(stream=self.stream)
        torch.cuda.synchronize()

    def frame(self, n=1):
        for _ in range(n): self.graph.replay()

    # ------------------------------------------------------------------ locks (between frames)
    def engage(self, worlds, lk):
        """weld the lock in these worlds at the pose they are in NOW; that end's connector faces stop colliding"""
        worlds = np.asarray(worlds, int)
        if not len(worlds): return
        k = lock_key(lk); i = self.eq_index[k]; L = self.pw.lock_defs[k]; m = self.m
        b1, b2 = int(m.eq_obj1id[i]), int(m.eq_obj2id[i])
        W = self.T(worlds, self.torch.long)
        X1 = self.xpos[W, b1].cpu().numpy().astype(float); X2 = self.xpos[W, b2].cpu().numpy().astype(float)
        R1 = self.xmat[W, b1].cpu().numpy().astype(float).reshape(-1, 3, 3); R2 = self.xmat[W, b2].cpu().numpy().astype(float).reshape(-1, 3, 3)
        data = np.zeros((len(worlds), 12))
        for n in range(len(worlds)):
            data[n, 3:6] = R1[n].T @ (X2[n] - X1[n]); q = np.zeros(4); mujoco.mju_mat2Quat(q, (R1[n].T @ R2[n]).flatten()); data[n, 6:10] = q; data[n, 10] = 1.0
        self.P['eq_data'][W, i] = self.T(data)
        self.eq_active[W, i] = True
        g = self.T(self.pw.conn_geoms[L['dock']], self.torch.long)
        self.P['geom_margin'][W[:, None], g[None]] = OFF_MARGIN
        self.engaged[worlds, i] = True

    def release(self, worlds, lk):
        worlds = np.asarray(worlds, int)
        if not len(worlds): return
        k = lock_key(lk); i = self.eq_index[k]; L = self.pw.lock_defs[k]
        W = self.T(worlds, self.torch.long); self.eq_active[W, i] = False
        g = self.T(self.pw.conn_geoms[L['dock']], self.torch.long)
        self.P['geom_margin'][W[:, None], g[None]] = self.margin0[g][None]
        self.engaged[worlds, i] = False

    def state(self):
        """everything the brains need, one row per world (numpy float64)"""
        torch = self.torch; N = self.N
        fin = torch.isfinite(self.qpos).all(-1).float()[:, None]
        low = self.xpos[:, self.links.flatten(), 2].reshape(N, *self.links.shape).min(-1).values
        out = torch.cat([self.qpos[:, self.qa], self.qpos[:, self.lockq], self.sxp[:, self.e_tip].reshape(N, -1), self.xmat[:, self.e_body].reshape(N, -1),
                         self.rseat.reshape(N, -1), self.rz.reshape(N, -1), self.rR.reshape(N, -1), self.magf, low, fin, self.peak[:, None], self.time[:, None]], -1)
        return torch.nan_to_num(out).cpu().numpy().astype(np.float64)

    def layout(self):
        """column slices of state()"""
        nM, nE, nR = len(self.pw.ids), len(self.ends), len(self.rnames); s = {}; o = 0
        for k, n in (('q', 7 * nM), ('lock', 2 * nM), ('tip', 3 * nE), ('emat', 9 * nE), ('seat', 3 * nR), ('z', 3 * nR), ('R', 9 * nR), ('magf', nE), ('low', nM), ('fin', 1), ('peak', 1), ('time', 1)):
            s[k] = slice(o, o + n); o += n
        return s

    def to_cpu(self, i):
        """copy robot i's GPU state into the CPU PhysWorld (pw.d), e.g. to render it with snap.Snapper"""
        d = self.pw.d; d.qpos[:] = self.qpos[i].cpu().numpy(); d.time = float(self.time[i]); mujoco.mj_forward(self.pw.m, d)

    def poses(self, worlds):
        """the Studio view bodies of some worlds (for recordings): (len, nview, 7) MuJoCo frame pos + quat wxyz"""
        W = self.T(worlds, self.torch.long)
        return self.xpos[W][:, self.view].cpu().numpy(), self.xmat[W][:, self.view].cpu().numpy()
