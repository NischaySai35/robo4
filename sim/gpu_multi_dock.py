"""TETROBOT MULTI-MODULE docking on the GPU: many random 2-module worlds at once.
World = walker (module 0, End A locked in floor rx0) + partner (module 1, End A locked in a floor spot, holding a pose).
Task per world: walker docks its End B into a partner connector (side receiver srx0..3 or the partner's End A/B = end<->end).
  GPU process : physics of every world (MuJoCo Warp) + servo model for BOTH modules + magnets (N/S) incl. moving receivers
  CPU workers : one Walker per world (the same docking code the real robot runs) through a proxy env
Every world is randomised (PLA flex, backlash, servo strength/speed/voltage, masses, friction, magnets, gravity tilt, pushes, encoder noise/lag).
Usage: python gpu_multi_dock.py TASKS.csv N_PER_TASK MAX_MINUTES      (csv rows: spot,yaw,q0..q6 (deg),target)"""
from paths import tpath
import sys, os, math, time, json, io, contextlib, numpy as np, multiprocessing as mp
MAG_PULL_IN = __import__('os').environ.get('MAG_PULL_IN', '1') == '1'   # magnets always pull the end IN (old sign(ax) flipped when touching faces overlapped: pushed it OUT with full force). GPU A/B 26 Oct, 256 robots: old 81/82 first docks, new 103/103; seated gap 0.11 -> 0.00 mm. MAG_PULL_IN=0 = old behaviour.
sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
XML = os.environ.get('XML', tpath('sim/multi_reach2.xml'))

def load_tasks(path):
    T = []
    for l in open(path):
        l = l.strip()
        if not l or l.startswith('#'): continue
        p = l.split(',')
        if p[0].strip() == 'L':
            if len(p) == 13:   # L,x,y,heading,roll,q0..q6,target
                T.append(dict(lying=True, spot=-1, x=float(p[1]), y=float(p[2]), yaw=float(p[3]), roll=float(p[4]), q=[float(v) for v in p[5:12]], target=p[12].strip())); continue
            T.append(dict(lying=True, spot=-1, x=float(p[1]), y=float(p[2]), yaw=float(p[3]), roll=0.0, q=[float(v) for v in p[4:11]], target=p[11].strip())); continue
        T.append(dict(spot=int(p[0]), yaw=float(p[1]), q=[float(x) for x in p[2:9]], target=p[9].strip()))
    return T

# =========================================================== GPU physics
class GPUMulti:
    def __init__(self, worlds, seed):
        import torch, mujoco, warp as wp, mujoco_warp as mjw
        from multi_env import MultiEnv, END_PAD
        from tetro_env2 import ACC_RAD, W0_12V, KT, MAG_F0, MAG_D0, MAG_CUT, RX_GAP
        self.torch, self.wp, self.mjw = torch, wp, mjw; dev = self.dev = 'cuda'
        self.KT, self.MAG_F0, self.MAG_D0, self.MAG_CUT, self.RX_GAP, self.END_PAD = KT, MAG_F0, MAG_D0, MAG_CUT, RX_GAP, END_PAD
        wp.init(); self.tstream = torch.cuda.Stream(); torch.cuda.set_stream(self.tstream); self.stream = wp.stream_from_torch(self.tstream)
        g = self.g = torch.Generator(device=dev); g.manual_seed(seed)
        N = self.N = len(worlds)
        with contextlib.redirect_stdout(io.StringIO()):
            e = MultiEnv(seed=0, randomize=False, xml=XML)
        m = e.m; m.opt.noslip_iterations = 0; self.e, self.m = e, m
        # physics step: 1 ms (default, same as the CPU tests) or TIMESTEP_MS=2 for 2x speed (must be checked against 1 ms first)
        self.ts = float(os.environ.get('TIMESTEP_MS', '1')) / 1000.0; self.SUB = int(round(0.06 / self.ts))
        self.nserv = max(1, int(round(0.005 / self.ts))); self.sdt = self.nserv * self.ts; self.nrx = max(1, int(round(0.010 / self.ts)))
        # ---- start state of every world: CPU places + settles the two modules for that world's task (exact same placement code as the CPU tests)
        Q0, C0, keyc = [], [], {}
        for w in worlds:
            k = (w['spot'], w.get('x'), w.get('y'), w['yaw'], w.get('roll'), tuple(w['q']))
            if k not in keyc:
                if w.get('lying'):
                    from lying import place_lying
                    e.reset(base_rx=0, yaw_deg=45.0, partners=[], settle=0); place_lying(e, 1, w['x'], w['y'], w['yaw'], np.radians(w['q']), roll_deg=w.get('roll', 0.0), settle=400)
                else:
                    e.reset(base_rx=0, yaw_deg=45.0, partners=[(1, w['spot'], w['yaw'], np.radians(w['q']))], settle=150)
                keyc[k] = (e.d.qpos.copy(), e.d.ctrl.copy())
            Q0.append(keyc[k][0]); C0.append(keyc[k][1])
        T = lambda x, dt=torch.float32: torch.as_tensor(np.asarray(x), dtype=dt, device=dev); self.T = T
        m.opt.timestep = self.ts
        self.mm = mm = mjw.put_model(m)
        self.d = mjw.put_data(m, e.d, nworld=N, nconmax=int(os.environ.get('NCONMAX', '600')), njmax=int(os.environ.get('NJMAX', '3600')), naccdmax=N * 96)
        mm.opt.warn_overflow = 0xFFF & ~int(mjw.OverflowType.EPA_HORIZON)
        U = lambda *s, lo=0.0, hi=1.0: lo + (hi - lo) * torch.rand(s, device=dev, generator=g)
        P = {}
        for f in ['dof_damping', 'dof_frictionloss', 'jnt_stiffness', 'jnt_range', 'body_mass', 'body_inertia', 'geom_friction', 'actuator_gainprm', 'actuator_biasprm', 'actuator_forcerange']:
            old = getattr(mm, f); t = T(np.repeat(np.asarray(getattr(m, f))[None], N, 0).copy()); P[f] = t; setattr(mm, f, wp.from_torch(t, dtype=old.dtype))
        NOM = {k: v[0].clone() for k, v in P.items()}; Lng = torch.long
        flex = T(sum([r['flex'] for r in e.mods], []), Lng); bl = T(sum([r['bl'] for r in e.mods], []), Lng); main = T(sum([r['main'] for r in e.mods], []), Lng); jd = T(m.jnt_dofadr, Lng)
        P['jnt_stiffness'][:, flex] *= U(N, len(flex), lo=0.6, hi=1.5); P['dof_damping'][:, jd[flex]] *= U(N, len(flex), lo=0.6, hi=1.8)
        P['jnt_range'][:, bl] = NOM['jnt_range'][bl] * U(N, len(bl), lo=0.0, hi=2.0).clamp_min(0.05)[..., None]
        P['dof_frictionloss'][:, jd[main]] *= U(N, len(main), lo=0.6, hi=1.5)
        k = U(N, m.nu, lo=0.75, hi=1.25); P['actuator_gainprm'][:, :, 0] *= k; P['actuator_biasprm'][:, :, 1] *= k
        P['actuator_forcerange'][:] = NOM['actuator_forcerange'] * U(N, m.nu, lo=0.75, hi=1.0)[..., None]
        s = U(N, m.nbody, lo=0.92, hi=1.08); s[:, 0] = 1
        for b in range(m.nbody):
            if m.body(b).name.startswith('rx') or 'srx' in m.body(b).name: s[:, b] = 1
        P['body_mass'][:] = NOM['body_mass'] * s; P['body_inertia'][:] = NOM['body_inertia'] * s[..., None]
        P['geom_friction'][:, :, 0] = NOM['geom_friction'][:, 0] * U(N, 1, lo=0.7, hi=1.4)
        tl = torch.deg2rad(U(N, hi=1.5)); ph = U(N, hi=2 * math.pi)
        self.grav = 9.81 * torch.stack([torch.sin(tl) * torch.cos(ph), torch.sin(tl) * torch.sin(ph), -torch.cos(tl)], -1)
        mm.opt.gravity = wp.from_torch(self.grav.clone(), dtype=wp.vec3); self.P = P
        NA = 9 * e.nmod
        self.magk = U(N, lo=0.6, hi=1.4); self.mag_gap = U(N, hi=0.0006) + float(os.environ.get('MAG_RECESS_MM', '0')) / 1000   # extra magnet recess (design test), as walk_env/multi_env
        self.amax = ACC_RAD * U(N, NA, lo=0.85, hi=1.15); self.volt = U(N, e.nmod, lo=10.5, hi=12.6)
        self.w0 = W0_12V * self.volt.repeat_interleave(9, 1) / 12 * U(N, NA, lo=0.9, hi=1.05)
        self.all_act = T(e.all_act_all, Lng); self.all_dof = T(e.all_dof_all, Lng); self.qa = T(e.qa, Lng)
        self.lockq = T([e.end['A']['lockq'], e.end['B']['lockq']], Lng)
        self.tip = {x: e.end[x]['tip'] for x in 'AB'}; self.body = {x: e.end[x]['body'] for x in 'AB'}; self.mags = {x: T(e.end[x]['mags'], Lng) for x in 'AB'}
        self.links = T(sum([r['links'] for r in e.mods], []), Lng)
        # ---- receivers: static floor ones + moving ones (partner side receivers, partner ends). Walker's own receivers are excluded for its ends.
        R = [i for i, r in enumerate(e.rx) if r['mod'] != 0]; self.ridx = R; self.nR = len(R)
        self.r_dyn = T([1.0 if e.rx[i]['dyn'] else 0.0 for i in R]); self.r_bid = T([e.rx[i]['bid'] for i in R], Lng)
        self.r_end = T([(1.0 if e.rx[i].get('endt') == 'B' else -1.0) if e.rx[i].get('endt') else 0.0 for i in R])
        self.r_tip = T([e.rx[i].get('tip_id', 0) for i in R], Lng); self.r_mag = T([e.rx[i]['mags_ids'] for i in R], Lng)
        self.pol = T([1.0 if k % 2 == 0 else -1.0 for k in range(8)])
        tt = lambda a: wp.to_torch(a)
        self.qpos, self.qvel, self.ctrl, self.xfrc = tt(self.d.qpos), tt(self.d.qvel), tt(self.d.ctrl), tt(self.d.xfrc_applied)
        self.sxp, self.xmat, self.xpos, self.xipos, self.afrc = tt(self.d.site_xpos), tt(self.d.xmat), tt(self.d.xpos), tt(self.d.xipos), tt(self.d.actuator_force)
        with wp.ScopedStream(self.stream):
            mjw.step(mm, self.d); wp.synchronize()
            with wp.ScopedCapture() as c: mjw.step(mm, self.d)
            self.g_step = c.graph
        self.qpos[:] = T(np.array(Q0)); self.qvel[:] = 0; self.ctrl[:] = T(np.array(C0))
        with wp.ScopedStream(self.stream):
            for _ in range(200): wp.capture_launch(self.g_step)
        torch.cuda.synchronize()
        self.tgt = self.ctrl[:, self.all_act].clone(); self.sp = self.tgt.clone(); self.spv = torch.zeros_like(self.tgt)
        self.fr0 = P['actuator_forcerange'][:, self.all_act, 1].clone()
        self.base = torch.zeros_like(self.xfrc); self.magf = torch.zeros(N, 2, device=dev); self._rx_update()
    def _rx_update(self):
        torch = self.torch; Rg = self.RX_GAP
        Rb = self.xmat[:, self.r_bid].reshape(self.N, self.nR, 3, 3); o = self.xpos[:, self.r_bid]
        isend = (self.r_end != 0)[None, :, None]
        n_end = Rb[..., :, 1] * self.r_end[None, :, None]; z_rx = Rb[..., :, 2]
        z = torch.where(isend, n_end, z_rx)
        seat_end = self.sxp[:, self.r_tip] - self.END_PAD * n_end; seat_rx = o + Rg * z_rx
        self.rseat = torch.where(isend, seat_end, seat_rx); self.rz = z
        x = Rb[..., :, 0]; self.rR = torch.where(isend[..., None], torch.stack([x, torch.cross(n_end, x, dim=-1), n_end], -1), Rb)
        self.rmags = self.sxp[:, self.r_mag]                     # (N, R, 8, 3)
    def _servo(self):
        torch = self.torch; NM = self.e.nmod
        af = torch.nan_to_num(self.afrc[:, self.all_act]); I = 1.8 + af.reshape(self.N, NM, 9).abs().sum(-1) / self.KT
        sag = ((self.volt - 0.08 * I).clamp_min(9.0) / self.volt).repeat_interleave(9, 1)
        w0 = self.w0 * sag; e = self.tgt - self.sp
        vdes = torch.sign(e) * torch.minimum(w0, torch.sqrt(2 * self.amax * e.abs()))
        self.spv += (vdes - self.spv).clamp(-self.amax * self.sdt, self.amax * self.sdt); self.sp += self.spv * self.sdt
        self.ctrl[:, self.all_act] = self.sp
        w = torch.nan_to_num(self.qvel[:, self.all_dof]); tau = af
        lim = sag * torch.where(tau * w > 0, self.fr0 * (1 - w.abs() / w0).clamp(0.08, 1.0), self.fr0)
        fr = self.P['actuator_forcerange']; fr[:, self.all_act, 0] = -lim; fr[:, self.all_act, 1] = lim
    def _magnets(self):
        torch = self.torch; N = self.N; ar = torch.arange(N, device=self.dev)
        for ei, x in enumerate('AB'):
            tip = self.sxp[:, self.tip[x]]; dist = (tip[:, None] - self.rseat).norm(dim=-1); dmin, r = dist.min(-1)
            near = dmin < self.MAG_CUT + 0.03
            z = self.rz[ar, r]; RM = self.rmags[ar, r]; Bm = self.sxp[:, self.mags[x]]
            D = RM[:, None] - Bm[:, :, None]; j = D.norm(dim=-1).argmin(-1)
            v = torch.gather(D, 2, j[..., None, None].expand(-1, -1, 1, 3)).squeeze(2)
            ax = (v * z[:, None]).sum(-1); lat = v - ax[..., None] * z[:, None]; ln = lat.norm(dim=-1)
            sep = (-ax).clamp_min(0) + self.mag_gap[:, None]
            f = self.magk[:, None] * self.MAG_F0 / (1 + sep / self.MAG_D0) ** 3 * torch.exp(-(ln / 0.006) ** 2)
            f = torch.where((sep < self.MAG_CUT) & (ln < 0.012) & near[:, None], f, torch.zeros_like(f))
            f = f * torch.where(self.pol[None] * self.pol[j] < 0, 1.0, -1.0)
            Fv = z[:, None] * (-torch.ones_like(ax) if MAG_PULL_IN else torch.sign(ax))[..., None] * f[..., None] + lat / 0.004 * 0.5 * f[..., None]
            c = self.xipos[:, self.body[x]]; Fs = Fv.sum(1); Ts = torch.cross(Bm - c[:, None], Fv, dim=-1).sum(1)
            ok = (near & torch.isfinite(Fs).all(-1) & torch.isfinite(Ts).all(-1))[:, None]
            Fs = torch.where(ok, Fs, torch.zeros_like(Fs)); Ts = torch.where(ok, Ts, torch.zeros_like(Ts))
            self.xfrc[:, self.body[x], :3] += Fs; self.xfrc[:, self.body[x], 3:] += Ts
            # reaction on a MOVING receiver (partner spine / partner end) so momentum is conserved
            dyn = (self.r_dyn[r] > 0)[:, None]; rb = self.r_bid[r]; Pm = torch.gather(RM, 1, j[..., None].expand(-1, -1, 3)); rc = self.xipos[ar, rb]
            Tr = torch.cross(Pm - rc[:, None], Fv, dim=-1).sum(1)
            self.xfrc[ar, rb, :3] -= torch.where(dyn & ok, Fs, torch.zeros_like(Fs)); self.xfrc[ar, rb, 3:] -= torch.where(dyn & ok, torch.nan_to_num(Tr), torch.zeros_like(Tr))
            self.magf[:, ei] = torch.nan_to_num(f.sum(-1))
    def step(self, rows):
        """rows (N, 9 + 9 + 4): walker 7 joints + 2 locks | partner 7 joints + 2 locks | push body, push force 3"""
        torch, wp = self.torch, self.wp
        Rr = self.T(rows); self.tgt[:] = Rr[:, :18]
        pb = Rr[:, 18].long(); pf = Rr[:, 19:22]; ar = torch.arange(self.N, device=self.dev)
        with wp.ScopedStream(self.stream):
            self.base.zero_(); self.base[ar, pb, :3] = pf * (pb > 0).float()[:, None]
            for k in range(self.SUB):
                self.xfrc.copy_(self.base)
                if k % self.nserv == 0: self._servo()
                if k % self.nrx == 0: self._rx_update()
                self._magnets(); wp.capture_launch(self.g_step)
            self._rx_update()
    def state(self, tgt_r):
        """per world: walker joints 7 | locks 2 | tip A,B | xmat A,B | lowest link | finite | magnet pull A,B | target seat 3, z 3, R 9 | partner joints 7"""
        torch = self.torch; ar = torch.arange(self.N, device=self.dev); r = self.T(tgt_r, torch.long)
        fin = torch.isfinite(self.qpos).all(-1).float()[:, None]
        out = torch.cat([self.qpos[:, self.qa], self.qpos[:, self.lockq], self.sxp[:, self.tip['A']], self.sxp[:, self.tip['B']],
                         self.xmat[:, self.body['A']].reshape(self.N, 9), self.xmat[:, self.body['B']].reshape(self.N, 9),
                         self.xpos[:, self.links, 2].min(-1).values[:, None], fin, self.magf,
                         self.rseat[ar, r], self.rz[ar, r], self.rR[ar, r].reshape(self.N, 9), self.qpos[:, self.pqa]], -1)
        return torch.nan_to_num(out).cpu().numpy().astype(np.float64)

# =========================================================== proxy env (worker side)
class _D: pass
class Proxy:
    def __init__(self, tm, seed, row0, parent, j, qp, plA=-math.radians(45)):
        import collections
        self.tm = tm; self.rng = np.random.default_rng(seed); r = self.rng; self.parent = parent; self.j = j; self.qp = np.asarray(qp, float); self.plA = plA
        self.rx = [dict(x) for x in tm['rx']]; self.end, self.lo, self.hi, self.links = tm['end'], tm['lo'], tm['hi'], tm['links']
        self.d = _D(); self.d.site_xpos = np.zeros((tm['nsite'], 3)); self.d.xmat = np.zeros((tm['nbody'], 9)); self.d.qpos = np.zeros(tm['nq'])
        self.delay = int(r.integers(1, 4)); self.noise = r.uniform(0.0005, 0.003); self.push_p = r.uniform(0.0, 0.03); self.obs_lag = int(r.integers(0, 3))
        self.rx_bias = []
        for _ in self.rx:
            b = r.normal(0, 0.0007, 3); nb = np.linalg.norm(b)
            if nb > 0.0015: b *= 0.0015 / nb
            self.rx_bias.append(b)
        self.t = 0; self.push_left = 0; self.push_b = 0; self.push_f = np.zeros(3); self._ingest(row0)
        q0 = self.q.copy(); self.cmd = q0.copy(); self.queue = collections.deque([q0.copy()] * self.delay, maxlen=self.delay + 1)
        self.qhist = collections.deque(maxlen=4); self.qhist.append(self._meas())
        self.out = np.r_[q0, row0[7], row0[8], self.qp, self.plA, 0.0, 0, 0, 0, 0]
    def lock_sign(self, e): return -1.0 if e == 'A' else 1.0
    def _ingest(self, row):
        self.row = row; self.q = row[0:7]; tm = self.tm
        self.d.site_xpos[self.end['A']['tip']] = row[9:12]; self.d.site_xpos[self.end['B']['tip']] = row[12:15]
        self.d.xmat[self.end['A']['body']] = row[15:24]; self.d.xmat[self.end['B']['body']] = row[24:33]
        self.d.qpos[self.end['A']['lockq']] = row[7]; self.d.qpos[self.end['B']['lockq']] = row[8]
        self.mag_force = {'A': float(row[35]), 'B': float(row[36])}
        RX = self.rx[self.j]; seat, z, R = row[37:40], row[40:43], row[43:52].reshape(3, 3)
        RX.update(seat=seat.copy(), z=z.copy(), R=R.copy(), o=seat - tm['RX_GAP'] * z)
        self.pq = row[52:59]
    def _meas(self):
        q = self.q + self.rng.normal(0, self.noise, 7); return np.round(q / 0.001534) * 0.001534
    def measured(self): return self.qhist[max(0, len(self.qhist) - 1 - self.obs_lag)].copy()
    def step(self, cmd, lockA_deg, lockB_deg, extra_force=None):
        r = self.rng; self.cmd = np.clip(cmd, self.lo, self.hi); self.queue.append(self.cmd.copy())
        if self.push_left <= 0 and r.random() < self.push_p:
            self.push_left = int(r.integers(2, 6)); self.push_b = int(r.choice(self.links)); self.push_f = r.normal(0, 1.0, 3)
        pb, pf = (self.push_b, self.push_f) if self.push_left > 0 else (0, np.zeros(3))
        self.out = np.r_[self.queue[0], math.radians(lockA_deg) * -1.0, math.radians(lockB_deg), self.qp, self.plA, 0.0, pb, pf]
        self.parent.switch()
        if self.push_left > 0: self.push_left -= 1
        self.t += 1; self.qhist.append(self._meas()); return self.status()
    def end_vs_rx(self, e, i):
        from phys_dock import end_rel
        RX = self.rx[i]; d = self.d
        return dict(**end_rel(d.site_xpos[self.end[e]['tip']], d.xmat[self.end[e]['body']].reshape(3, 3), RX['seat'], RX['z'], RX['R']), lock_deg=math.degrees(abs(d.qpos[self.end[e]['lockq']])))
    def status(self): return dict(ok=bool(self.row[34] > 0.5), lowest_link_mm=self.row[33] * 1000, t=self.t)

def _partner_lockA(task):
    """partner End A rotor target. Standing partners: locked in their floor receiver (-45). Lying partners: open (0) - unless
    END_PREROTATE=1 and the dock target IS its End A: end<->end needs the RECEIVING end's rotor turned first, or its fins
    (6.0 mm above its gap floor) sit in its gaps and the docking pads land on them (GPU 26 Oct: stuck at 5.9-6.1 mm)."""
    if not task.get('lying'): return -math.radians(45)
    if os.environ.get('END_PREROTATE', '0') == '1' and task['target'] == 'endA': return -math.radians(45)
    return 0.0

# =========================================================== worker: one Walker per world, ONE dock each (same code + lock-stall recovery)
def worker(conn, ids, seeds, gravs, rows0, tasks, tm, judge, maxf):
    import greenlet
    with contextlib.redirect_stdout(io.StringIO()):
        import walk as WK
    L = WK.L; main = greenlet.getcurrent(); K = len(ids)
    names = [r['name'] for r in tm['rx']]
    envs = [Proxy(tm, seeds[i], rows0[i], main, names.index('m1_' + tasks[i]['target']), np.radians(tasks[i]['q']), _partner_lockA(tasks[i])) for i in range(K)]
    logs = [[] for _ in range(K)]; info = [dict() for _ in range(K)]
    def make(i):
        def run():
            env = envs[i]; W = WK.Walker(env, 'A', 0, 0, gravs[i], log=lambda s: logs[i].append(s))
            if judge: W.judge_fn = W.sim_camera
            j = env.j; t0 = env.t
            try:
                C = W._ctrl(j); locks, done = W.dock_fns('B')
                ok = W._run(C, locks, done, maxf, 'dock End B -> %s' % tasks[i]['target'])
                r = env.end_vs_rx('B', j); good = ok and abs(r['axial_mm']) < 0.8 and r['radial_mm'] < 1.5 and r['lock_deg'] > 40
                info[i].update(ok=bool(good), **{k: float(v) for k, v in r.items()}, t=(env.t - t0) * 0.06, twmax=[float(x) for x in getattr(W, 'twmax', np.zeros(3))])
                logs[i].append('RESULT %s | gap %.2f mm side %.2f mm slot %.1f deg lock %.0f deg | %.1f s' % ('OK' if good else 'FAILED', r['axial_mm'], r['radial_mm'], r['slot_deg'], r['lock_deg'], (env.t - t0) * 0.06))
            except Exception as ex:
                logs[i].append('EXCEPTION %r' % (ex,)); info[i].update(ok=False, exc=repr(ex))
        return greenlet.greenlet(run)
    gls = [make(i) for i in range(K)]; sent = [0] * K
    gsave = [L.NOM.m.opt.gravity.copy() for _ in range(K)]
    while True:
        for i, g in enumerate(gls):
            if g.dead: continue
            L.NOM.m.opt.gravity[:] = gsave[i]; buf = io.StringIO()
            with contextlib.redirect_stdout(buf): g.switch()
            logs[i] += ['    ' + s.strip() for s in buf.getvalue().splitlines() if ('judge' in s or 'aligned' in s or 'at seat' in s)]
            gsave[i] = L.NOM.m.opt.gravity.copy()
        if all(g.dead for g in gls): conn.send(('done', ids, logs, info)); return
        new = [lg[sent[k]:] for k, lg in enumerate(logs)]; sent[:] = [len(lg) for lg in logs]
        conn.send(('frame', np.array([en.out for en in envs]), new, [dict(x) for x in info]))
        st = conn.recv()
        for en, row in zip(envs, st): en._ingest(row)

# =========================================================== main
def main():
    tasks0 = load_tasks(sys.argv[1]); per = int(sys.argv[2]) if len(sys.argv) > 2 else 8; MAXMIN = float(sys.argv[3]) if len(sys.argv) > 3 else 10
    tag = os.environ.get('TAG', 'multi'); seed = int(os.environ.get('SEED', '11')); judge = os.environ.get('JUDGE', '1') == '1'; maxf = int(os.environ.get('MAXF', '900'))
    worlds = [t for t in tasks0 for _ in range(per)]; N = len(worlds); NW = int(os.environ.get('WORKERS', min(14, N)))
    t0 = time.time(); ph = GPUMulti(worlds, seed)
    e = ph.e; names = [r['name'] for r in e.rx]
    ph.pqa = ph.T(e.mods[1]['qa'], ph.torch.long)
    tgt_r = [ph.ridx.index(names.index('m1_' + w['target'])) for w in worlds]
    rows = ph.state(tgt_r); grav = ph.grav.cpu().numpy()
    from tetro_env2 import RX_GAP
    tm = dict(rx=[{k: (v.copy() if isinstance(v, np.ndarray) else v) for k, v in r.items()} for r in e.rx], end=e.end, lo=e.lo, hi=e.hi, links=e.links,
              nsite=e.m.nsite, nbody=e.m.nbody, nq=e.m.nq, RX_GAP=RX_GAP)
    print('GPU ready: %d worlds (%d tasks x %d random robots), setup %.0f s' % (N, len(tasks0), per, time.time() - t0), flush=True)
    parts = np.array_split(np.arange(N), NW); conns, procs = [], []; ctx = mp.get_context('spawn')
    for w, ids in enumerate(parts):
        a, b = ctx.Pipe()
        p = ctx.Process(target=worker, args=(b, ids, [seed * 100000 + int(i) for i in ids], grav[ids], rows[ids], [worlds[i] for i in ids], tm, judge, maxf), daemon=True)
        p.start(); conns.append(a); procs.append(p)
    active = list(range(NW)); hold = np.zeros((N, 22)); logs = [[] for _ in range(N)]; info = [dict() for _ in range(N)]
    frame = 0; t1 = time.time()
    while active:
        for w in list(active):
            msg = conns[w].recv()
            if msg[0] == 'done':
                _, ids, lg, inf = msg
                for k, i in enumerate(ids): logs[i] = lg[k]; info[i] = inf[k]
                active.remove(w)
            else:
                hold[parts[w]] = msg[1]
                for k, i in enumerate(parts[w]): logs[i] += msg[2][k]; info[i] = msg[3][k]
        if not active: break
        if (time.time() - t1) / 60 > MAXMIN:
            print('time limit reached - unfinished docks counted as not finished', flush=True)
            for w in active: procs[w].terminate()
            break
        ph.step(hold); st = ph.state(tgt_r); frame += 1
        for w in active: conns[w].send(st[parts[w]])
        if frame % 100 == 0:
            nd = sum(1 for x in info if 'ok' in x); nok = sum(1 for x in info if x.get('ok'))
            print('  frame %d (%.0f s robot time), wall %.0f s | finished %d/%d, OK %d' % (frame, frame * 0.06, time.time() - t1, nd, N, nok), flush=True)
    # ---------- report per task
    lines = ['MULTI-MODULE GPU DOCK TEST (%s): %d worlds, judge %s, lock-stall retries on, wall %.1f min' % (tag, N, 'ON' if judge else 'OFF', (time.time() - t0) / 60)]
    for ti, t in enumerate(tasks0):
        ids = [i for i, w in enumerate(worlds) if w is t]
        fin = [info[i] for i in ids if 'ok' in info[i]]; ok = [x for x in fin if x['ok']]
        tms = [x['t'] for x in ok]
        lines.append('  task %d: partner spot %s yaw %.0f pose %s -> %s | OK %d/%d (finished %d) | dock time median %.1f s | fail gaps mm %s' % (
            ti, ('LYING at %.2f,%.2f' % (t['x'], t['y'])) if t.get('lying') else t['spot'], t['yaw'], [int(v) for v in t['q']], t['target'], len(ok), len(ids), len(fin), np.median(tms) if tms else 0,
            [round(x.get('axial_mm', -1), 1) for x in fin if not x['ok']][:6]))
    tot = sum(1 for x in info if x.get('ok')); lines.append('TOTAL OK %d/%d (%.1f%%)' % (tot, N, 100.0 * tot / N))
    rep = '\n'.join(lines); print(rep, flush=True)
    with open(tpath('logs/gpu_multi_%s.log') % tag, 'w', encoding='utf-8') as f:
        f.write(rep + '\n\n')
        for i in range(N): f.write('=== world %d task %s %s\n%s\n' % (i, worlds[i], info[i], '\n'.join(logs[i])))
    json.dump(dict(tag=tag, report=lines, worlds=[dict(task=worlds[i], info=info[i]) for i in range(N)]), open(tpath('logs/gpu_multi_%s.json') % tag, 'w'), indent=1)

if __name__ == '__main__':
    main()
