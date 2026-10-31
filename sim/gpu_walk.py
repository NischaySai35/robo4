"""TETROBOT walking on the GPU: MANY random robots at once, using the SAME verified walking code (walk.py Walker + laptop_controller DockController).
  GPU process : physics of all robots (MuJoCo Warp) + servo model + magnets (with N/S polarity) - same maths as walk_env.py
  CPU workers : one Walker per robot (the exact code the real robot runs), each sees its robot through a small 'proxy' env
                (encoder noise/quantisation/lag, command delay, random pushes, hand-measured receiver map error - same as walk_env.py)
Usage:  python gpu_walk.py N_ROBOTS [MAX_MINUTES] [XML]"""
from paths import tpath
import sys, os, math, time, json, numpy as np, multiprocessing as mp
MAG_PULL_IN = __import__('os').environ.get('MAG_PULL_IN', '1') == '1'   # magnets always pull the end IN (old sign(ax) flipped when touching faces overlapped: pushed it OUT with full force). GPU A/B 26 Oct, 256 robots: old 81/82 first docks, new 103/103; seated gap 0.11 -> 0.00 mm. MAG_PULL_IN=0 = old behaviour.
sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
XML_DEFAULT = tpath('sim/walk_train.xml')
NOUT = 37          # per-robot state row sent to the workers
# row layout: 0:7 joints | 7:9 lock A,B | 9:12 tip A | 12:15 tip B | 15:24 xmat A | 24:33 xmat B | 33 lowest link z | 34 finite | 35:37 magnet pull A,B

# =========================================================== GPU physics (main process)
class GPUWalkPhys:
    def __init__(self, N, seed, xml):
        import torch, mujoco, warp as wp, mujoco_warp as mjw
        import walk_env as W
        from tetro_env2 import ACC_RAD, W0_12V, KT, MAG_F0, MAG_D0, MAG_CUT
        self.torch, self.wp, self.mjw = torch, wp, mjw; dev = self.dev = 'cuda'
        self.KT, self.MAG_F0, self.MAG_D0, self.MAG_CUT = KT, MAG_F0, MAG_D0, MAG_CUT
        wp.init(); self.tstream = torch.cuda.Stream(); torch.cuda.set_stream(self.tstream); self.stream = wp.stream_from_torch(self.tstream)
        g = self.g = torch.Generator(device=dev); g.manual_seed(seed)
        e = W.WalkEnv(seed=0, randomize=False, xml=xml); e.reset(base='A', base_rx=0, yaw_deg=45)    # nominal robot settled in rx0 (same start as the CPU test)
        m = e.m; m.opt.noslip_iterations = 0          # GPU has no noslip solver; checked: lock holds the same (0.54 mm under 30 N, CPU = GPU)
        self.e, self.m, self.N = e, m, N
        T = lambda x, dt=torch.float32: torch.as_tensor(np.asarray(x), dtype=dt, device=dev)
        self.T = T
        self.mm = mm = mjw.put_model(m)
        # njmax 800 overflowed during docking (mujoco-warp 3.17 warned "nefc overflow" = dropped contact rows) -> 2400 rows, 400 contacts per world
        self.d = mjw.put_data(m, e.d, nworld=N, nconmax=int(os.environ.get('NCONMAX', '400')), njmax=int(os.environ.get('NJMAX', '2400')), naccdmax=N * 64)
        mm.opt.warn_overflow = 0xFFF & ~int(mjw.OverflowType.EPA_HORIZON)   # keep the warnings that mean wrong physics; EPA horizon (fixed 24) only costs a little contact precision
        # per-world (randomised) model parameters
        U = lambda *s, lo=0.0, hi=1.0: lo + (hi - lo) * torch.rand(s, device=dev, generator=g)
        P = {}
        for f in ['dof_damping', 'dof_frictionloss', 'jnt_stiffness', 'jnt_range', 'body_mass', 'body_inertia', 'geom_friction', 'actuator_gainprm', 'actuator_biasprm', 'actuator_forcerange']:
            old = getattr(mm, f); t = T(np.repeat(np.asarray(getattr(m, f))[None], N, 0).copy()); P[f] = t; setattr(mm, f, wp.from_torch(t, dtype=old.dtype))
        NOM = {k: v[0].clone() for k, v in P.items()}
        Lng = torch.long
        flex = T(e.flex, Lng); bl = T(e.bl, Lng); main = T(e.main, Lng); jd = T(m.jnt_dofadr, Lng)
        P['jnt_stiffness'][:, flex] *= U(N, len(flex), lo=0.6, hi=1.5)
        P['dof_damping'][:, jd[flex]] *= U(N, len(flex), lo=0.6, hi=1.8)
        P['jnt_range'][:, bl] = NOM['jnt_range'][bl] * U(N, len(bl), lo=0.0, hi=2.0).clamp_min(0.05)[..., None]
        P['dof_frictionloss'][:, jd[main]] *= U(N, len(main), lo=0.6, hi=1.5)
        k = U(N, m.nu, lo=0.75, hi=1.25); P['actuator_gainprm'][:, :, 0] *= k; P['actuator_biasprm'][:, :, 1] *= k
        P['actuator_forcerange'][:] = NOM['actuator_forcerange'] * U(N, m.nu, lo=0.75, hi=1.0)[..., None]
        s = U(N, m.nbody, lo=0.92, hi=1.08); s[:, 0] = 1
        for b in range(m.nbody):
            if m.body(b).name.startswith('rx'): s[:, b] = 1
        P['body_mass'][:] = NOM['body_mass'] * s; P['body_inertia'][:] = NOM['body_inertia'] * s[..., None]
        P['geom_friction'][:, :, 0] = NOM['geom_friction'][:, 0] * U(N, 1, lo=0.7, hi=1.4)
        tl = torch.deg2rad(U(N, hi=1.5)); ph = U(N, hi=2 * math.pi)
        self.grav = 9.81 * torch.stack([torch.sin(tl) * torch.cos(ph), torch.sin(tl) * torch.sin(ph), -torch.cos(tl)], -1)
        mm.opt.gravity = wp.from_torch(self.grav.clone(), dtype=wp.vec3)
        self.P = P
        self.magk = U(N, lo=0.6, hi=1.4); self.mag_gap = U(N, hi=0.0006) + float(os.environ.get('MAG_RECESS_MM', '0')) / 1000   # extra magnet recess (design test), as walk_env/multi_env
        self.amax = ACC_RAD * U(N, 9, lo=0.85, hi=1.15); self.volt = U(N, lo=10.5, hi=12.6); self.w0 = W0_12V * self.volt[:, None] / 12 * U(N, 9, lo=0.9, hi=1.05)
        # indices
        self.all_act = T(e.all_act, Lng); self.all_dof = T(e.all_dof, Lng); self.qa = T(e.qa, Lng)
        self.lockq = T([e.end['A']['lockq'], e.end['B']['lockq']], Lng)
        self.tip = {x: e.end[x]['tip'] for x in 'AB'}; self.body = {x: e.end[x]['body'] for x in 'AB'}; self.mags = {x: T(e.end[x]['mags'], Lng) for x in 'AB'}
        self.links = T(e.links, Lng)
        self.rx_seat = T(np.array([r['seat'] for r in e.rx])); self.rx_z = T(np.array([r['z'] for r in e.rx])); self.rx_mags = T(np.array([r['mags'] for r in e.rx]))
        self.pol = T([1.0 if k % 2 == 0 else -1.0 for k in range(8)])
        tt = lambda a: wp.to_torch(a)
        self.qpos, self.qvel, self.ctrl, self.xfrc = tt(self.d.qpos), tt(self.d.qvel), tt(self.d.ctrl), tt(self.d.xfrc_applied)
        self.sxp, self.xmat, self.xpos, self.xipos, self.afrc = tt(self.d.site_xpos), tt(self.d.xmat), tt(self.d.xpos), tt(self.d.xipos), tt(self.d.actuator_force)
        with wp.ScopedStream(self.stream):
            mjw.step(mm, self.d); wp.synchronize()
            with wp.ScopedCapture() as c: mjw.step(mm, self.d)
            self.g_step = c.graph
        # restore the settled start in every world, then let each (randomised) robot settle 300 ms like the CPU env
        self.qpos[:] = T(e.d.qpos); self.qvel[:] = 0; self.ctrl[:] = T(e.d.ctrl)
        with wp.ScopedStream(self.stream):
            for _ in range(300): wp.capture_launch(self.g_step)
        torch.cuda.synchronize()
        self.tgt = self.ctrl[:, self.all_act].clone(); self.sp = self.tgt.clone(); self.spv = torch.zeros_like(self.tgt)
        self.fr0 = P['actuator_forcerange'][:, self.all_act, 1].clone()
        self.base = torch.zeros_like(self.xfrc); self.magf = torch.zeros(N, 2, device=dev)
    def _servo(self):
        torch = self.torch
        af = torch.nan_to_num(self.afrc[:, self.all_act]); I = 1.8 + af.abs().sum(-1) / self.KT
        sag = ((self.volt - 0.08 * I).clamp_min(9.0) / self.volt)[:, None]
        w0 = self.w0 * sag; e = self.tgt - self.sp
        vdes = torch.sign(e) * torch.minimum(w0, torch.sqrt(2 * self.amax * e.abs()))
        self.spv += (vdes - self.spv).clamp(-self.amax * 0.005, self.amax * 0.005); self.sp += self.spv * 0.005
        self.ctrl[:, self.all_act] = self.sp
        w = torch.nan_to_num(self.qvel[:, self.all_dof]); tau = af
        lim = sag * torch.where(tau * w > 0, self.fr0 * (1 - w.abs() / w0).clamp(0.08, 1.0), self.fr0)
        fr = self.P['actuator_forcerange']; fr[:, self.all_act, 0] = -lim; fr[:, self.all_act, 1] = lim
    def _magnets(self):
        torch = self.torch; N = self.N
        for ei, x in enumerate('AB'):
            tip = self.sxp[:, self.tip[x]]; dist = (tip[:, None] - self.rx_seat[None]).norm(dim=-1); dmin, r = dist.min(-1)
            near = dmin < self.MAG_CUT + 0.03
            z = self.rx_z[r]; RM = self.rx_mags[r]; Bm = self.sxp[:, self.mags[x]]
            D = RM[:, None] - Bm[:, :, None]; j = D.norm(dim=-1).argmin(-1)
            v = torch.gather(D, 2, j[..., None, None].expand(-1, -1, 1, 3)).squeeze(2)
            ax = (v * z[:, None]).sum(-1); lat = v - ax[..., None] * z[:, None]; ln = lat.norm(dim=-1)
            sep = (-ax).clamp_min(0) + self.mag_gap[:, None]
            f = self.magk[:, None] * self.MAG_F0 / (1 + sep / self.MAG_D0) ** 3 * torch.exp(-(ln / 0.006) ** 2)
            f = torch.where((sep < self.MAG_CUT) & (ln < 0.012) & near[:, None], f, torch.zeros_like(f))
            f = f * torch.where(self.pol[None] * self.pol[j] < 0, 1.0, -1.0)          # N/S: opposite attract, same repel
            Fv = z[:, None] * (-torch.ones_like(ax) if MAG_PULL_IN else torch.sign(ax))[..., None] * f[..., None] + lat / 0.004 * 0.5 * f[..., None]
            c = self.xipos[:, self.body[x]]; Fs = Fv.sum(1); Ts = torch.cross(Bm - c[:, None], Fv, dim=-1).sum(1)
            ok = (near & torch.isfinite(Fs).all(-1) & torch.isfinite(Ts).all(-1))[:, None]
            self.xfrc[:, self.body[x], :3] += torch.where(ok, Fs, torch.zeros_like(Fs)); self.xfrc[:, self.body[x], 3:] += torch.where(ok, Ts, torch.zeros_like(Ts))
            self.magf[:, ei] = torch.nan_to_num(f.sum(-1))
    def step(self, rows):
        """rows (N, 13): target 9 (7 joints after delay + 2 locks, rad) | push body id | push force 3"""
        torch, wp = self.torch, self.wp
        R = self.T(rows); self.tgt[:] = R[:, :9]
        pb = R[:, 9].long(); pf = R[:, 10:13]; ar = torch.arange(self.N, device=self.dev)
        with wp.ScopedStream(self.stream):
            self.base.zero_(); self.base[ar, pb, :3] = pf * (pb > 0).float()[:, None]
            for k in range(60):
                self.xfrc.copy_(self.base)
                if k % 5 == 0: self._servo()
                self._magnets(); wp.capture_launch(self.g_step)
    def state(self):
        torch = self.torch
        fin = torch.isfinite(self.qpos).all(-1).float()[:, None]
        out = torch.cat([self.qpos[:, self.qa], self.qpos[:, self.lockq], self.sxp[:, self.tip['A']], self.sxp[:, self.tip['B']],
                         self.xmat[:, self.body['A']].reshape(self.N, 9), self.xmat[:, self.body['B']].reshape(self.N, 9),
                         self.xpos[:, self.links, 2].min(-1).values[:, None], fin, self.magf], -1)
        return torch.nan_to_num(out).cpu().numpy().astype(np.float64)

# =========================================================== proxy env (worker side): looks like walk_env.WalkEnv to the Walker
class _D: pass
class ProxyEnv:
    def __init__(self, tmpl, seed, row0, parent):
        self.tm = tmpl; self.rng = np.random.default_rng(seed); r = self.rng; self.parent = parent
        self.rx, self.end, self.lo, self.hi, self.links = tmpl['rx'], tmpl['end'], tmpl['lo'], tmpl['hi'], tmpl['links']
        self.d = _D(); self.d.site_xpos = np.zeros((tmpl['nsite'], 3)); self.d.xmat = np.zeros((tmpl['nbody'], 9)); self.d.qpos = np.zeros(tmpl['nq'])
        self.delay = int(r.integers(1, 4)); self.noise = r.uniform(0.0005, 0.003); self.push_p = r.uniform(0.0, 0.03); self.obs_lag = int(r.integers(0, 3))
        self.rx_bias = []
        for _ in self.rx:
            b = r.normal(0, 0.0007, 3); nb = np.linalg.norm(b)
            if nb > 0.0015: b *= 0.0015 / nb
            self.rx_bias.append(b)
        self.t = 0; self.push_left = 0; self.push_b = 0; self.push_f = np.zeros(3)
        import collections
        self._ingest(row0)
        q0 = self.q.copy(); self.cmd = q0.copy()
        self.queue = collections.deque([q0.copy()] * self.delay, maxlen=self.delay + 1)
        self.qhist = collections.deque(maxlen=4); self.qhist.append(self._meas())
        self.tgt = np.r_[q0, row0[7], row0[8]]; self.out = np.r_[self.tgt, 0, 0, 0, 0]
    def lock_sign(self, e): return -1.0 if e == 'A' else 1.0
    def _ingest(self, row):
        self.row = row; self.q = row[0:7]
        self.d.site_xpos[self.end['A']['tip']] = row[9:12]; self.d.site_xpos[self.end['B']['tip']] = row[12:15]
        self.d.xmat[self.end['A']['body']] = row[15:24]; self.d.xmat[self.end['B']['body']] = row[24:33]
        self.d.qpos[self.end['A']['lockq']] = row[7]; self.d.qpos[self.end['B']['lockq']] = row[8]
        self.mag_force = {'A': float(row[35]), 'B': float(row[36])}
    def _meas(self):
        q = self.q + self.rng.normal(0, self.noise, 7); return np.round(q / 0.001534) * 0.001534
    def measured(self): return self.qhist[max(0, len(self.qhist) - 1 - self.obs_lag)].copy()
    def step(self, cmd, lockA_deg, lockB_deg, extra_force=None):
        r = self.rng
        self.cmd = np.clip(cmd, self.lo, self.hi); self.queue.append(self.cmd.copy())
        tgt = np.r_[self.queue[0], math.radians(lockA_deg) * self.lock_sign('A'), math.radians(lockB_deg) * self.lock_sign('B')]
        if self.push_left <= 0 and r.random() < self.push_p:
            self.push_left = int(r.integers(2, 6)); self.push_b = int(r.choice(self.links)); self.push_f = r.normal(0, 1.0, 3)
        pb, pf = (self.push_b, self.push_f) if self.push_left > 0 else (0, np.zeros(3))
        self.out = np.r_[tgt, pb, pf]
        self.parent.switch()                    # -> worker loop: the GPU steps every robot 60 ms, then we resume here
        if self.push_left > 0: self.push_left -= 1
        self.t += 1; self.qhist.append(self._meas())
        return self.status()
    def end_vs_rx(self, e, i):
        RX = self.rx[i]; p = self.d.site_xpos[self.end[e]['tip']]; R = self.d.xmat[self.end[e]['body']].reshape(3, 3)
        rel = p - RX['seat']; ax = float(rel @ RX['z']); rad = float(np.linalg.norm(rel - ax * RX['z']))
        a = math.atan2(R[:, 0] @ RX['R'][:, 1], R[:, 0] @ RX['R'][:, 0]) - math.pi / 4; sl = (a + math.pi / 4) % (math.pi / 2) - math.pi / 4
        return dict(axial_mm=ax * 1000, radial_mm=rad * 1000, slot_deg=math.degrees(sl), lock_deg=math.degrees(abs(self.d.qpos[self.end[e]['lockq']])))
    def status(self):
        return dict(ok=bool(self.row[34] > 0.5), lowest_link_mm=self.row[33] * 1000, t=self.t)

# =========================================================== worker process: K robots, each a Walker running in a greenlet
def worker(conn, ids, seeds, gravs, xml, rows0, judge):
    import io, contextlib, greenlet
    with contextlib.redirect_stdout(io.StringIO()):
        import walk as WK, walk_env as W
        L = WK.L
        e = W.WalkEnv(seed=0, randomize=False, xml=xml)
    tm = dict(rx=e.rx, end=e.end, lo=e.lo, hi=e.hi, links=e.links, nsite=e.m.nsite, nbody=e.m.nbody, nq=e.m.nq)
    main = greenlet.getcurrent(); K = len(ids)
    envs = [ProxyEnv(tm, seeds[i], rows0[i], main) for i in range(K)]
    logs = [[] for _ in range(K)]; info = [dict() for _ in range(K)]
    def make(i):
        def run():
            env = envs[i]; Wk = WK.Walker(env, 'A', 0, 0, gravs[i], log=lambda s: logs[i].append(s))
            if judge: Wk.judge_fn = Wk.sim_camera
            Wk.curl = True; ok = True; n_ok = 0
            for j in range(1, len(env.rx)):
                try:
                    if not Wk.step_to(j): ok = False; break
                except Exception as ex:
                    logs[i].append('  EXCEPTION %r' % (ex,)); ok = False; break
                n_ok = j
            info[i].update(ok=ok, steps=n_ok, frames=env.t, twmax=[float(x) for x in getattr(Wk, 'twmax', np.zeros(3))])
        return greenlet.greenlet(run)
    gls = [make(i) for i in range(K)]; sent = [0] * K
    gsave = [L.NOM.m.opt.gravity.copy() for _ in range(K)]
    while True:
        for i, g in enumerate(gls):
            if g.dead: continue
            L.NOM.m.opt.gravity[:] = gsave[i]                 # each controller keeps its own gravity estimate (shared nominal model)
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf): g.switch()
            logs[i] += ['    ' + s.strip() for s in buf.getvalue().splitlines() if ('judge' in s or 'aligned' in s or 'at seat' in s)]   # keep the controller's decisions
            gsave[i] = L.NOM.m.opt.gravity.copy()
        if all(g.dead for g in gls):
            conn.send(('done', ids, logs, info)); return
        new = [lg[sent[k]:] for k, lg in enumerate(logs)]; sent[:] = [len(lg) for lg in logs]      # stream new log lines every frame (survive a time cut)
        conn.send(('frame', np.array([en.out for en in envs]), new))
        st = conn.recv()
        for en, row in zip(envs, st): en._ingest(row)

# =========================================================== main
def main():
    N = int(sys.argv[1]) if len(sys.argv) > 1 else 32
    MAXMIN = float(sys.argv[2]) if len(sys.argv) > 2 else 10.0
    xml = sys.argv[3] if len(sys.argv) > 3 else XML_DEFAULT
    NW = int(os.environ.get('WORKERS', min(14, N))); judge = os.environ.get('JUDGE', '1') == '1'; seed = int(os.environ.get('SEED', '7'))
    tag = os.environ.get('TAG', 'gpuwalk')
    t0 = time.time()
    ph = GPUWalkPhys(N, seed, xml)
    rows = ph.state(); grav = ph.grav.cpu().numpy()
    print('GPU ready: %d random robots, %d connectors, setup %.0f s' % (N, len(ph.e.rx), time.time() - t0), flush=True)
    parts = np.array_split(np.arange(N), NW); conns = []; procs = []
    ctx = mp.get_context('spawn')
    for w, ids in enumerate(parts):
        a, b = ctx.Pipe(); p = ctx.Process(target=worker, args=(b, ids, [seed * 100000 + int(i) for i in ids], grav[ids], xml, rows[ids], judge), daemon=True)
        p.start(); conns.append(a); procs.append(p)
    active = list(range(NW)); hold = np.zeros((N, 13)); hold[:, :9] = np.c_[rows[:, :7], rows[:, 7:9]]
    logs = [None] * N; live = [[] for _ in range(N)]; info = [None] * N; frame = 0; t1 = time.time(); cut = False
    while active:
        for w in list(active):
            msg = conns[w].recv()
            if msg[0] == 'done':
                _, ids, lg, inf = msg
                for k, i in enumerate(ids): logs[i] = lg[k]; info[i] = inf[k]
                active.remove(w)
            else:
                hold[parts[w]] = msg[1]
                for k, i in enumerate(parts[w]): live[i] += msg[2][k]
        if not active: break
        if (time.time() - t1) / 60 > MAXMIN:
            cut = True; print('time limit reached - stopping (unfinished robots counted as not finished)', flush=True)
            for w in active: procs[w].terminate()
            break
        ph.step(hold); st = ph.state(); frame += 1
        for w in active: conns[w].send(st[parts[w]])
        if frame % 100 == 0:
            print('  frame %d (%.0f s robot time), wall %.0f s, workers still walking %d/%d' % (frame, frame * 0.06, time.time() - t1, len(active), NW), flush=True)
    # ---------- report
    docks = ok_d = 0; full = 0; times = []; fails = {}
    for i in range(N):
        if logs[i] is None: logs[i] = live[i]
        for s in logs[i]:
            if 'docked at rx' in s:
                docks += 1
                if ': OK' in s:
                    ok_d += 1
                    try: times.append(float(s.split(',')[-1].strip().rstrip('s').strip()))
                    except Exception: pass
            for key in ('timed out', 'CRASH', 'EXCEPTION', 'FAILED'):
                if key in s: fails[s.strip()[:60]] = fails.get(s.strip()[:60], 0) + 1
        if info[i] and info[i].get('ok'): full += 1
    done = sum(1 for x in info if x)
    tw = np.array([x['twmax'] for x in info if x]) if done else np.zeros((1, 3))
    nst = len(ph.e.rx) - 1
    lines = ['GPU WALK TEST (%s): %d random robots, %d steps each, judge %s, wall %.1f min%s' % (tag, N, nst, 'ON' if judge else 'OFF', (time.time() - t0) / 60, ' (TIME CUT)' if cut else ''),
             'docks OK: %d/%d (%.1f%%)' % (ok_d, docks, 100.0 * ok_d / max(docks, 1)),
             'full walks OK: %d/%d finished robots (%.1f%%)' % (full, done, 100.0 * full / max(done, 1)),
             'dock time: median %.1f s, 90%% within %.1f s' % (np.median(times) if times else 0, np.percentile(times, 90) if times else 0),
             'max twist seen T1/T2/T3: %s deg (stop 176); robots over 160 deg: %d' % (list(np.round(tw.max(0)).astype(int)), int((tw.max(1) > 160).sum())),
             'failure kinds:'] + ['  %4d x %s' % (v, k) for k, v in sorted(fails.items(), key=lambda kv: -kv[1])[:12]]
    rep = '\n'.join(lines); print(rep, flush=True)
    os.makedirs(tpath('logs'), exist_ok=True)
    with open(tpath('logs/gpu_walk_%s.log') % tag, 'w', encoding='utf-8') as f:
        f.write(rep + '\n\n')
        for i in range(N):
            if logs[i] is None: logs[i] = live[i]
            f.write('=== robot %d %s\n' % (i, info[i])); f.write('\n'.join(logs[i]) + '\n')
    json.dump(dict(robots=[dict(id=i, grav=[float(x) for x in grav[i]], log=logs[i] or [], info=info[i] or {}) for i in range(N)]),
              open(tpath('logs/gpu_walk_%s_robots.json') % tag, 'w'))      # every robot's full log, for failure analysis
    json.dump(dict(tag=tag, N=N, docks=docks, docks_ok=ok_d, full=full, finished=done, wall_min=(time.time() - t0) / 60, report=lines),
              open(tpath('logs/gpu_walk_%s.json') % tag, 'w'), indent=1)

if __name__ == '__main__':
    main()
