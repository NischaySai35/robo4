"""TETROBOT docking env on the GPU (MuJoCo Warp, same engine as Isaac Lab/Newton). Same robot file and the same rules as tetro_env2.py (CPU),
vectorised over thousands of worlds. Exposes an SB3 VecEnv so the SAME brain (dock_v3) keeps training."""
from paths import tpath
import sys, math, time, numpy as np, torch, mujoco, warp as wp, mujoco_warp as mjw
sys.path.insert(0, tpath('sim'))
import tetro_env2 as E2
from tetro_env2 import ACT, DT_CTRL, SUB, TAU, VMAX, RX_GAP, RX_TOP, MAG_F0, MAG_D0, MAG_CUT, ACC_RAD, W0_12V, KT
from stable_baselines3.common.vec_env.base_vec_env import VecEnv
import gymnasium as gym
MAG_PULL_IN = __import__('os').environ.get('MAG_PULL_IN', '1') == '1'   # magnets always pull the end IN (old sign(ax) flipped when touching faces overlapped: pushed it OUT with full force). GPU A/B 26 Oct, 256 robots: old 81/82 first docks, new 103/103; seated gap 0.11 -> 0.00 mm. MAG_PULL_IN=0 = old behaviour.
dev = 'cuda'
def T(x, dt=torch.float32): return torch.as_tensor(np.asarray(x), dtype=dt, device=dev)
def rodrigues(axis, ang):
    axis = axis / axis.norm(dim=-1, keepdim=True).clamp_min(1e-9)
    K = torch.zeros(axis.shape[:-1] + (3, 3), device=dev)
    K[..., 0, 1], K[..., 0, 2], K[..., 1, 0], K[..., 1, 2], K[..., 2, 0], K[..., 2, 1] = -axis[..., 2], axis[..., 1], axis[..., 2], -axis[..., 0], -axis[..., 1], axis[..., 0]
    s, c = torch.sin(ang)[..., None, None], torch.cos(ang)[..., None, None]
    return torch.eye(3, device=dev) + s * K + (1 - c) * K @ K
def mat2quat(R):
    w = torch.sqrt((1 + R[:, 0, 0] + R[:, 1, 1] + R[:, 2, 2]).clamp_min(1e-9)) / 2
    x = (R[:, 2, 1] - R[:, 1, 2]) / (4 * w); y = (R[:, 0, 2] - R[:, 2, 0]) / (4 * w); z = (R[:, 1, 0] - R[:, 0, 1]) / (4 * w)
    q = torch.stack([w, x, y, z], -1); return q / q.norm(dim=-1, keepdim=True)
class GPUDock(VecEnv):
    def __init__(self, n=2048, seed=0, max_dist=0.30, floor_frac=0.9, ep_len=260, xml=E2.XML):
        wp.init(); self.tstream = torch.cuda.Stream(); torch.cuda.set_stream(self.tstream)   # own CUDA stream (graph capture is not allowed on the default stream)
        torch.manual_seed(seed); self.g = torch.Generator(device=dev); self.g.manual_seed(seed)
        self.N = N = n; self.max_dist, self.floor_frac, self.ep_len = max_dist, floor_frac, ep_len
        self.htol = (0.003, math.radians(2))
        # ---- CPU twin: same model + same static fixes as tetro_env2, also used to build the air-target library
        cpu = E2.TetroDockEnv(seed=seed, randomize=False, xml=xml); cpu.reset(seed=seed); m = cpu.m; self.cpu = cpu
        import os as _os
        if _os.environ.get('NOSELFCOL'):
            for i in range(m.ngeom):
                if m.geom_contype[i] == 1 and m.geom_conaffinity[i] == 3: m.geom_conaffinity[i] = 2
            m.body_conaffinity[:] = np.where(m.body_conaffinity == 3, 2, m.body_conaffinity)
        _arm = float(_os.environ.get('PASSIVE_ARM', '0'))
        if _arm > 0:
            for j in range(m.njnt):
                nm = m.joint(j).name
                if '_flex' in nm or nm.endswith('_bl') or nm.startswith('base_'): m.dof_armature[m.jnt_dofadr[j]] = max(m.dof_armature[m.jnt_dofadr[j]], _arm)
        m.opt.integrator = mujoco.mjtIntegrator.mjINT_IMPLICITFAST   # IMPLICITFAST: damping/stiff passive joints integrated implicitly (CPU Euler does this for damping too)
        self.m = m; self.nom = cpu.nom
        self.qa = T(cpu.qa, torch.long); self.da = T(cpu.da, torch.long); self.act = T(cpu.act_id, torch.long); self.all_act = T(cpu.all_act, torch.long); self.all_dof = T(cpu.all_dof, torch.long)
        self.lo = T(cpu.lo); self.hi = T(cpu.hi); self.eb = cpu.eb; self.s_tip = cpu.s_tip; self.s_bmag = T(cpu.s_bmag, torch.long); self.links = T(cpu.links, torch.long)
        self.qlock = cpu.qlock; self.base_xy = T(cpu.base_xy)
        J = lambda f: [j for j in range(m.njnt) if f(m.joint(j).name)]
        self.flexj = T(J(lambda s: '_flex' in s), torch.long); self.blj = T(J(lambda s: s.endswith('_bl')), torch.long); self.btj = T(J(lambda s: s.startswith('base_tilt')), torch.long)
        self.mainj = T(cpu.main, torch.long); self.sagj = T(J(lambda s: '_flex' in s or s.startswith('base_tilt')), torch.long)
        self.jq = T(m.jnt_qposadr, torch.long); self.jd = T(m.jnt_dofadr, torch.long)
        # home state (nominal robot settled upright)
        mujoco.mj_resetData(m, cpu.d); cpu.d.ctrl[:] = 0
        for _ in range(1500): mujoco.mj_step(m, cpu.d)
        self.home_q = T(cpu.d.qpos.copy())
        # air-target library (same sampling rule as the CPU env)
        lib = []; rng = np.random.default_rng(seed)
        while len(lib) < 3000:
            q = rng.uniform(cpu.lo * 0.8, cpu.hi * 0.8); p, nB, xB = cpu._fk(q); zs = cpu.dr.xpos[cpu.links][:, 2]; o = p + RX_GAP * nB
            if p[2] > 0.10 and zs.min() > 0.06 and np.linalg.norm(o[:2] - cpu.base_xy) > 0.12:
                z = -nB; x = E2.rot(z, math.radians(45 + 90 * rng.integers(0, 4))) @ xB; lib.append(np.concatenate([o, z, x, q]))
        self.airlib = T(np.array(lib))
        # floor seed table: IK pose (sag-aware) for a receiver straight ahead at each distance; base twist rotates it to any angle
        self.fdist = T(np.arange(0.14, 0.46, 0.01)); tab = []; qprev = np.zeros(7)
        for dd in np.arange(0.14, 0.46, 0.01):
            o = np.array([cpu.base_xy[0] + dd, cpu.base_xy[1], 0.0]); z = np.array([0, 0, 1.0]); Ro = np.eye(3)
            h = o + (RX_TOP + 0.022) * z; qs = cpu._ik(h, z, Ro, qprev, seeds=8); tab.append(qs); qprev = qs
        self.ftab = T(np.array(tab))
        # ---- GPU model + per-world (batched) physical parameters
        d0 = mujoco.MjData(m); d0.qpos[:] = cpu.d.qpos; mujoco.mj_forward(m, d0)
        self.mm = mm = mjw.put_model(m)
        self.d = mjw.put_data(m, d0, nworld=N, nconmax=400, njmax=1600, naccdmax=N * 64)
        self.dr = mjw.put_data(m, d0, nworld=N, nconmax=4, njmax=64)       # kinematics-only copy for the encoder sag estimate
        self.P = {}
        for f, base in [('dof_damping', m.dof_damping), ('dof_frictionloss', m.dof_frictionloss), ('jnt_stiffness', m.jnt_stiffness), ('jnt_range', m.jnt_range),
                        ('body_mass', m.body_mass), ('body_inertia', m.body_inertia), ('geom_friction', m.geom_friction), ('actuator_gainprm', m.actuator_gainprm),
                        ('actuator_biasprm', m.actuator_biasprm), ('actuator_forcerange', m.actuator_forcerange)]:
            old = getattr(mm, f); t = T(np.repeat(np.asarray(base)[None], N, 0).copy()); self.P[f] = t
            setattr(mm, f, wp.from_torch(t, dtype=old.dtype))
        self.P['gravity'] = T(np.repeat(np.array(m.opt.gravity)[None], N, 0)); mm.opt.gravity = wp.from_torch(self.P['gravity'], dtype=wp.vec3)
        self.NOM = {k: v[0].clone() for k, v in self.P.items()}
        tt = lambda a: wp.to_torch(a)
        self.qpos, self.qvel, self.ctrl, self.xfrc = tt(self.d.qpos), tt(self.d.qvel), tt(self.d.ctrl), tt(self.d.xfrc_applied)
        self.site_xpos, self.xmat, self.xpos, self.xipos = tt(self.d.site_xpos), tt(self.d.xmat), tt(self.d.xpos), tt(self.d.xipos)
        self.afrc, self.cvel, self.mpos, self.mquat = tt(self.d.actuator_force), tt(self.d.cvel), tt(self.d.mocap_pos), tt(self.d.mocap_quat)
        self.act_dot = tt(self.d.act_dot) if hasattr(self.d, 'act_dot') else None
        self.r_qpos, self.r_sxp, self.r_xmat, self.r_bias = tt(self.dr.qpos), tt(self.dr.site_xpos), tt(self.dr.xmat), tt(self.dr.qfrc_bias)
        self.stream = wp.stream_from_torch(self.tstream)
        self._wipe = [f_ for f_ in ['qvel', 'qacc', 'qacc_warmstart', 'qacc_smooth', 'act', 'act_dot', 'qfrc_applied', 'qfrc_constraint', 'qfrc_actuator', 'qfrc_smooth', 'qfrc_passive', 'qfrc_bias',
                      'actuator_force', 'actuator_velocity', 'cvel', 'cacc', 'cfrc_int', 'cfrc_ext', 'xfrc_applied', 'efc_force', 'sensordata'] if hasattr(self.d, f_) and getattr(self.d, f_) is not None and getattr(self.d, f_).shape[0] == N]
        with wp.ScopedStream(self.stream):
            mjw.step(mm, self.d); wp.synchronize()
            with wp.ScopedCapture() as c: mjw.step(mm, self.d)
            self.g_step = c.graph
            self._rkin(); wp.synchronize()
        # ---- per-world episode state
        z = lambda *s: torch.zeros((N,) + s, device=dev)
        self.phase, self.steady, self.t, self.pull, self.lock_t, self.push_left = [torch.zeros(N, dtype=torch.long, device=dev) for _ in range(6)]
        self.push_b = torch.zeros(N, dtype=torch.long, device=dev); self.push_f = z(3)
        self.cmd, self.prev_a = z(7), z(7); self.hist = z(4, 7); self.delay = torch.ones(N, dtype=torch.long, device=dev)
        self.qh, self.qdh = z(4, 7), z(4, 7); self.obs_lag = torch.zeros(N, dtype=torch.long, device=dev)
        self.tgt, self.sp, self.spv, self.fr0, self.amax, self.w0 = z(9), z(9), z(9), z(9), z(9), z(9)
        self.volt, self.magk, self.mag_gap, self.noise, self.push_p, self.standoff, self.prev_E = z(), z(), z(), z(), z(), z(), z()
        self.hover, self.seat, self.bias_p, self.Rrx, self.Ro, self.rx_mag = z(3), z(3), z(3), z(3, 3), z(3, 3), z(8, 3)
        self.floor = torch.zeros(N, dtype=torch.bool, device=dev); self.mag_force = z(); self.appr_d = z(); self.ik_mode = 'off'; self.qseed = z(7); self.est_e = z() + 1; self.est_ang = z() + 1; self.est_sl = z() + 1; self.qik = z(7); self.ik_off = z(7); self.t_in = torch.zeros(N, dtype=torch.long, device=dev)
        self.ang8 = torch.arange(8, device=dev) * math.pi / 4; self.top8 = torch.where(torch.arange(8, device=dev) % 2 == 0, RX_TOP, RX_GAP)
        self.observation_space = gym.spaces.Box(-np.inf, np.inf, (54,), np.float32); self.action_space = gym.spaces.Box(-1, 1, (7,), np.float32)
        super().__init__(N, self.observation_space, self.action_space)
        self.base = torch.zeros_like(self.xfrc); self.cg = None
        self._reset_idx(torch.arange(N, device=dev)); self._a = None
        self._capture(); torch.cuda.synchronize(); self._reset_idx(torch.arange(N, device=dev))
    # ------------------------------------------------------------ helpers
    def U(self, *s, lo=0.0, hi=1.0): return lo + (hi - lo) * torch.rand(s, device=dev, generator=self.g)
    def _rkin(self):
        mjw.kinematics(self.mm, self.dr); mjw.com_pos(self.mm, self.dr); mjw.rne(self.mm, self.dr)
    def _fk_sag(self, q):
        # encoder-only End B estimate incl. PLA sag (same maths as CPU env _fk)
        rq = self.r_qpos; rq.zero_(); rq[:, self.jq[self.mainj]] = q
        Kn = self.NOM['jnt_stiffness'][self.sagj]; Rn = self.NOM['jnt_range'][self.blj, 1]
        with wp.ScopedStream(self.stream):
            for _ in range(3):
                self._rkin()
                rq[:, self.jq[self.sagj]] = -self.r_bias[:, self.jd[self.sagj]] / Kn
                rq[:, self.jq[self.blj]] = -torch.sign(self.r_bias[:, self.jd[self.blj]]) * Rn
            mjw.kinematics(self.mm, self.dr)
        R = self.r_xmat[:, self.eb]
        return self.r_sxp[:, self.s_tip].clone(), R[:, :, 1].clone(), R[:, :, 0].clone()
    def _slot(self, xB, Ro):
        a = torch.atan2((xB * Ro[:, :, 1]).sum(-1), (xB * Ro[:, :, 0]).sum(-1)) - math.pi / 4
        return torch.remainder(a + math.pi / 4, math.pi / 2) - math.pi / 4
    def _err(self):
        R = self.xmat[:, self.eb]; p, nB, xB = self.site_xpos[:, self.s_tip], R[:, :, 1], R[:, :, 0]; z = self.Rrx[:, :, 2]
        goal = torch.where((self.phase == 0)[:, None], self.hover, self.seat)
        e = (p - goal).norm(dim=-1); ang = torch.acos((-(nB * z).sum(-1)).clamp(-1, 1)); sl = self._slot(xB, self.Rrx).abs()
        rel = p - self.seat; axial = (rel * z).sum(-1); radial = (rel - axial[:, None] * z).norm(dim=-1)
        return e + 0.03 * ang + 0.03 * sl, e, ang, sl, axial, radial
    # ------------------------------------------------------------ reset (subset)
    def _reset_idx(self, idx):
        n = len(idx)
        if n == 0: return
        P, NOM, U = self.P, self.NOM, self.U
        P['jnt_stiffness'][idx] = NOM['jnt_stiffness']; P['dof_damping'][idx] = NOM['dof_damping']; P['dof_frictionloss'][idx] = NOM['dof_frictionloss']
        P['actuator_gainprm'][idx] = NOM['actuator_gainprm']; P['actuator_biasprm'][idx] = NOM['actuator_biasprm']; P['body_mass'][idx] = NOM['body_mass']
        P['body_inertia'][idx] = NOM['body_inertia']; P['jnt_range'][idx] = NOM['jnt_range']; P['geom_friction'][idx] = NOM['geom_friction']
        fj, bj, mj, tj = self.flexj, self.blj, self.mainj, self.btj
        P['jnt_stiffness'][idx[:, None], fj] *= U(n, len(fj), lo=0.6, hi=1.5)
        P['dof_damping'][idx[:, None], self.jd[fj]] *= U(n, len(fj), lo=0.6, hi=1.8)
        P['jnt_range'][idx[:, None], bj] = NOM['jnt_range'][bj] * U(n, len(bj), lo=0.0, hi=2.0).clamp_min(0.05)[..., None]
        P['dof_frictionloss'][idx[:, None], self.jd[mj]] *= U(n, len(mj), lo=0.6, hi=1.5)
        P['jnt_stiffness'][idx[:, None], tj] = U(n, len(tj), lo=150, hi=300)
        k = U(n, self.m.nu, lo=0.75, hi=1.25); P['actuator_gainprm'][idx, :, 0] *= k; P['actuator_biasprm'][idx, :, 1] *= k
        P['actuator_forcerange'][idx] = NOM['actuator_forcerange'] * U(n, self.m.nu, lo=0.75, hi=1.0)[..., None]
        s = U(n, self.m.nbody, lo=0.92, hi=1.08); s[:, 0] = 1; rxb = self.cpu.rx; s[:, rxb] = 1
        P['body_mass'][idx] = NOM['body_mass'] * s; P['body_inertia'][idx] = NOM['body_inertia'] * s[..., None]
        P['geom_friction'][idx, :, 0] = NOM['geom_friction'][:, 0] * U(n, 1, lo=0.7, hi=1.4)
        t_ = torch.deg2rad(U(n, hi=1.5)); ph = U(n, hi=2 * math.pi)
        P['gravity'][idx] = 9.81 * torch.stack([torch.sin(t_) * torch.cos(ph), torch.sin(t_) * torch.sin(ph), -torch.cos(t_)], -1)
        self.delay[idx] = torch.randint(1, 4, (n,), device=dev, generator=self.g); self.noise[idx] = U(n, lo=0.0005, hi=0.003); self.push_p[idx] = U(n, hi=0.03)
        self.magk[idx] = U(n, lo=0.6, hi=1.4); self.mag_gap[idx] = U(n, hi=0.0006)
        self.amax[idx] = ACC_RAD * U(n, 9, lo=0.85, hi=1.15); self.volt[idx] = U(n, lo=10.5, hi=12.6)
        self.w0[idx] = W0_12V * self.volt[idx, None] / 12 * U(n, 9, lo=0.9, hi=1.05)
        # robot state: wipe the whole world (contacts, warm-starts, any NaN) then set our values
        mask = torch.zeros(self.N, dtype=torch.bool, device=dev); mask[idx] = True
        with wp.ScopedStream(self.stream): mjw.reset_data(self.mm, self.d, reset=wp.from_torch(mask))
        for f_ in self._wipe:                           # full world wipe (warm-starts, forces, contacts) so a bad world can't stay bad
            t_ = wp.to_torch(getattr(self.d, f_)); t_[idx] = 0
        q0 = (torch.randn(n, 7, device=dev, generator=self.g) * 0.05).clamp(self.lo, self.hi)
        self.qpos[idx] = self.home_q; self.qpos[idx[:, None], self.qa] = q0; self.qvel[idx] = 0
        self.ctrl[idx] = 0; self.ctrl[idx[:, None], self.act] = q0
        self.tgt[idx] = self.ctrl[idx][:, self.all_act]; self.sp[idx] = self.tgt[idx]; self.spv[idx] = 0
        self.fr0[idx] = P['actuator_forcerange'][idx][:, self.all_act, 1]
        self.cmd[idx] = q0; self.prev_a[idx] = 0; self.hist[idx] = q0[:, None]; self.qik[idx] = q0; self.ik_off[idx] = 0
        # target receiver
        fl = U(n) < self.floor_frac; self.floor[idx] = fl
        dist = U(n, lo=0.18, hi=max(0.181, self.max_dist)); ang = U(n, lo=-math.pi, hi=math.pi); yaw = U(n, lo=-math.pi, hi=math.pi)
        of = torch.stack([self.base_xy[0] + dist * torch.cos(ang), self.base_xy[1] + dist * torch.sin(ang), torch.zeros(n, device=dev)], -1)
        zf = torch.tensor([0, 0, 1.0], device=dev).expand(n, 3); xf = torch.stack([torch.cos(yaw), torch.sin(yaw), torch.zeros(n, device=dev)], -1)
        L = self.airlib[torch.randint(0, len(self.airlib), (n,), device=dev, generator=self.g)]
        o = torch.where(fl[:, None], of, L[:, 0:3]); z = torch.where(fl[:, None], zf, L[:, 3:6]); x = torch.where(fl[:, None], xf, L[:, 6:9])
        di = ((dist - 0.14) / 0.01).round().long().clamp(0, len(self.ftab) - 1); qf = self.ftab[di].clone()
        qf[:, 0] = torch.remainder(qf[:, 0] + ang + math.pi, 2 * math.pi) - math.pi        # base twist turns the whole arm toward the receiver
        self.qseed[idx] = torch.where(fl[:, None], qf, L[:, 9:16]).clamp(self.lo, self.hi)
        z = z / z.norm(dim=-1, keepdim=True); x = x - (x * z).sum(-1, keepdim=True) * z; x = x / x.norm(dim=-1, keepdim=True); y = torch.cross(z, x, dim=-1)
        R = torch.stack([x, y, z], -1); self.Rrx[idx] = R
        mid = self.cpu.mocap
        self.mpos[idx, mid] = o; self.mquat[idx, mid] = mat2quat(R)
        loc = torch.stack([0.03 * torch.cos(self.ang8), 0.03 * torch.sin(self.ang8), self.top8], -1)
        self.rx_mag[idx] = o[:, None] + torch.einsum('nij,kj->nki', R, loc)
        self.standoff[idx] = U(n, lo=0.015, hi=0.030)
        self.hover[idx] = o + (RX_TOP + self.standoff[idx, None]) * z; self.seat[idx] = o + RX_GAP * z
        self.appr_d[idx] = RX_TOP - RX_GAP + self.standoff[idx]
        self.phase[idx] = 0; self.steady[idx] = 0; self.t[idx] = 0; self.push_left[idx] = 0; self.pull[idx] = 0; self.lock_t[idx] = 0
        self.obs_lag[idx] = torch.randint(0, 3, (n,), device=dev, generator=self.g)
        b = torch.randn(n, 3, device=dev, generator=self.g) * 0.0007; self.bias_p[idx] = b * (0.0015 / b.norm(dim=-1).clamp_min(1e-9)).clamp(max=1.0)[:, None]
        self.Ro[idx] = rodrigues(torch.randn(n, 3, device=dev, generator=self.g), torch.deg2rad(U(n, hi=0.5))) @ R
        self._reset_mask = torch.zeros(self.N, dtype=torch.bool, device=dev); self._reset_mask[idx] = True
    # ------------------------------------------------------------ physics sub-steps
    def _servo(self):
        af = torch.nan_to_num(self.afrc[:, self.all_act]); I = 1.8 + af.abs().sum(-1) / KT
        sag = ((self.volt - 0.08 * I).clamp_min(9.0) / self.volt)[:, None]
        w0 = self.w0 * sag; e = self.tgt - self.sp
        vdes = torch.sign(e) * torch.minimum(w0, torch.sqrt(2 * self.amax * e.abs()))
        self.spv += (vdes - self.spv).clamp(-self.amax * 0.005, self.amax * 0.005); self.sp += self.spv * 0.005
        self.ctrl[:, self.all_act] = self.sp
        w = torch.nan_to_num(self.qvel[:, self.all_dof]); motoring = af * w > 0
        lim = sag * torch.where(motoring, self.fr0 * (1 - w.abs() / w0).clamp(0.08, 1.0), self.fr0)
        fr = self.P['actuator_forcerange']; fr[:, self.all_act, 0] = -lim; fr[:, self.all_act, 1] = lim
    def _magnets(self):
        tip = self.site_xpos[:, self.s_tip]; near = (tip - self.seat).norm(dim=-1) < MAG_CUT + 0.03
        z = self.Rrx[:, :, 2]; B = self.site_xpos[:, self.s_bmag]
        D = self.rx_mag[:, None] - B[:, :, None]; L = D.norm(dim=-1); j = L.argmin(-1)
        v = torch.gather(D, 2, j[..., None, None].expand(-1, -1, 1, 3)).squeeze(2)
        ax = (v * z[:, None]).sum(-1); lat = v - ax[..., None] * z[:, None]; ln = lat.norm(dim=-1)
        sep = (-ax).clamp_min(0) + self.mag_gap[:, None]
        f = self.magk[:, None] * MAG_F0 / (1 + sep / MAG_D0) ** 3 * torch.exp(-(ln / 0.006) ** 2)
        f = torch.where((sep < MAG_CUT) & (ln < 0.012) & near[:, None], f, torch.zeros_like(f))
        F = z[:, None] * (-torch.ones_like(ax) if MAG_PULL_IN else torch.sign(ax))[..., None] * f[..., None] + lat / 0.004 * 0.5 * f[..., None]
        c = self.xipos[:, self.eb]; Fs = F.sum(1); Ts = torch.cross(B - c[:, None], F, dim=-1).sum(1)
        ok = near & torch.isfinite(Fs).all(-1) & torch.isfinite(Ts).all(-1)          # never let 0 * (bad position) leak a NaN torque
        self.xfrc[:, self.eb, :3] += torch.where(ok[:, None], Fs, torch.zeros_like(Fs)); self.xfrc[:, self.eb, 3:] += torch.where(ok[:, None], Ts, torch.zeros_like(Ts))
        self.mag_force.copy_(torch.nan_to_num(f.sum(-1)))
    def _substeps(self, graph):
        for k in range(SUB):
            if k % 5 == 0: self._servo()                           # servo profile + torque droop every 5 ms
            if k % 2 == 0: self.xfrc.copy_(self.base); self._magnets()  # magnets every 2 ms
            if graph: mjw.step(self.mm, self.d)
            else: wp.capture_launch(self.g_step)
    def _capture(self):
        import os as _os
        self.cg = None
        if _os.environ.get('NOGRAPH'): return
        try:
            with wp.ScopedStream(self.stream):
                for _ in range(2): self._substeps(graph=True)  # warm-up (allocations)
                torch.cuda.synchronize()
                cg = torch.cuda.CUDAGraph()
                with torch.cuda.graph(cg, stream=self.tstream):          # torch records (and protects its own temp memory)...
                    wp.capture_begin(stream=self.stream, external=True)  # ...and warp is told a capture is running (no host syncs)
                    try: self._substeps(graph=True)
                    finally: wp.capture_end(stream=self.stream)
            self.cg = cg; torch.cuda.synchronize()
        except Exception as e:
            print('graph capture failed, falling back to loop:', repr(e)[:300]); self.cg = None
    # ------------------------------------------------------------ IK controller (sag-aware, batched on the GPU)
    def _ik_cmd(self):
        """IK on an internal clean pose (fast, stable) + slow integral offset from the MEASURED pose error (removes servo/PLA sag)."""
        N = self.N; ar = torch.arange(N, device=dev)
        qik = self.qik.clone(); qm = self.qh[ar, self.obs_lag].clone()
        def pose(qq):
            p, n, x = self._fk_sag(qq); z_ = torch.cross(x, n, dim=-1); return p, torch.stack([x, n, z_], -1)
        p0, R0 = pose(qik); pm, Rm = pose(qm)
        J = torch.zeros(N, 6, 7, device=dev); h = 1e-3
        for j in range(7):
            qq = qik.clone(); qq[:, j] += h; p1, R1 = pose(qq)
            J[:, :3, j] = (p1 - p0) / h
            J[:, 3:, j] = 0.5 * sum(torch.cross(R0[:, :, i], R1[:, :, i], dim=-1) for i in range(3)) / h
        Ro = self.Ro; z = Ro[:, :, 2]
        hold = getattr(self, 'hover_settle', 0)
        moving_in = (self.phase >= 1) & (self.lock_t >= 0) & ((self.t - self.t_in) >= hold)
        self.appr_d = torch.where(moving_in, (self.appr_d - getattr(self, 'appr_step', 0.0015)).clamp_min(-0.0004), self.appr_d)
        goal = torch.where((self.phase == 0)[:, None], self.hover, self.seat + self.appr_d[:, None] * z) + self.bias_p
        def err(p, R):
            nB, xB = R[:, :, 1], R[:, :, 0]; s = self._slot(xB, Ro)
            return torch.cat([(goal - p) * 1000, (torch.cross(nB, -z, dim=-1) - s[:, None] * z) * 60], -1)
        Js = J.clone(); Js[:, :3] *= 1000; Js[:, 3:] *= 60
        A = Js @ Js.transpose(1, 2) + 4.0 * torch.eye(6, device=dev)
        solve = lambda e: (Js.transpose(1, 2) @ torch.linalg.solve(A, e[..., None])).squeeze(-1)
        dq = solve(err(p0, R0))
        lim = torch.where((self.phase >= 1)[:, None], torch.full_like(dq, getattr(self, 'gentle_lim', 0.015)), torch.full_like(dq, VMAX * 0.6))
        dq = torch.maximum(torch.minimum(dq, lim), -lim)
        early = (self.t < 18)[:, None]
        qik_new = torch.where(early, qik + (self.qseed - qik).clamp(-VMAX * 0.5, VMAX * 0.5), qik + dq)
        self.qik = torch.maximum(torch.minimum(qik_new, self.hi), self.lo)
        # slow integral: measured pose error -> joint offset (10% per step, capped)
        settled = (self.cvel[:, self.eb, 3:].norm(dim=-1) < 0.05) & ~early.squeeze(-1)
        dqm = solve(err(pm, Rm)).clamp(-0.004, 0.004) * 0.1 / 0.1
        self.ik_off = torch.where(settled[:, None], (self.ik_off + 0.1 * dqm).clamp(-0.08, 0.08), self.ik_off)
        return torch.maximum(torch.minimum(self.qik + self.ik_off, self.hi), self.lo)
    # ------------------------------------------------------------ observation
    def _obs(self, roll=True):
        q = self.qpos[:, self.qa] + torch.randn(self.N, 7, device=dev, generator=self.g) * self.noise[:, None]
        q = torch.round(q / 0.001534) * 0.001534
        if roll: self.qh = torch.roll(self.qh, 1, 1); self.qh[:, 0] = q; self.qdh = torch.roll(self.qdh, 1, 1); self.qdh[:, 0] = self.qvel[:, self.da]
        m_ = self._reset_mask; self.qh[m_] = q[m_, None]; self.qdh[m_] = self.qvel[m_][:, self.da][:, None]; self._reset_mask = torch.zeros_like(m_)
        ar = torch.arange(self.N, device=dev); q = self.qh[ar, self.obs_lag]; qd = self.qdh[ar, self.obs_lag]
        p, nB, xB = self._fk_sag(q); Ro = self.Ro; z = Ro[:, :, 2]
        goal = torch.where((self.phase == 0)[:, None], self.hover, self.seat) + self.bias_p; s = self._slot(xB, Ro)
        self.est_e = (goal - p).norm(dim=-1); self.est_ang = torch.acos((-(nB * z).sum(-1)).clamp(-1, 1)); self.est_sl = s.abs()   # what the ROBOT believes
        ph = torch.nn.functional.one_hot(self.phase.clamp(max=2), 3).float()
        o = torch.cat([torch.sin(q), torch.cos(q), qd * 0.1, self.prev_a, self.cmd - q, (goal - p) * 10, nB, z, torch.sin(4 * s)[:, None], torch.cos(4 * s)[:, None],
                       goal * 2, ph, (self.t.float() / self.ep_len)[:, None], (self.standoff * 30)[:, None]], -1)
        return torch.nan_to_num(o, nan=0.0, posinf=10.0, neginf=-10.0).clamp(-100, 100)   # a broken world must never poison the brain's input stats
    # ------------------------------------------------------------ VecEnv API
    def reset(self):
        self._reset_idx(torch.arange(self.N, device=dev)); return self._obs().cpu().numpy()
    def step_async(self, actions): self._a = torch.as_tensor(actions, device=dev, dtype=torch.float32)
    def step_wait(self):
        a = self._a.clamp(-1, 1); N = self.N; ar = torch.arange(N, device=dev)
        if self.ik_mode == 'off': self.cmd = torch.maximum(torch.minimum(self.cmd + a * VMAX, self.hi), self.lo)
        else: self.cmd = torch.maximum(torch.minimum(self._ik_cmd() + a * 0.02, self.hi), self.lo)     # IK does the move, RL adds a small correction
        self.hist = torch.roll(self.hist, 1, 1); self.hist[:, 0] = self.cmd; self.tgt[:, :7] = self.hist[ar, self.delay]
        start = (self.push_left <= 0) & (self.U(N) < self.push_p)
        self.push_left = torch.where(start, torch.randint(2, 6, (N,), device=dev, generator=self.g), self.push_left)
        self.push_b = torch.where(start, self.links[torch.randint(0, len(self.links), (N,), device=dev, generator=self.g)], self.push_b)
        self.push_f = torch.where(start[:, None], torch.randn(N, 3, device=dev, generator=self.g), self.push_f)
        pushing = (self.push_left > 0).float()[:, None]; zr = self.Rrx[:, :, 2]; pulling = (self.pull > 0).float()[:, None]
        with wp.ScopedStream(self.stream):
            self.base.zero_(); self.base[ar, self.push_b, :3] = self.push_f * pushing; self.base[:, self.eb, :3] += 15.0 * zr * pulling   # pushes/pull: constant over the 60 ms step
            if self.cg is not None: self.cg.replay()       # the whole 60 ms (servo + magnets + 60 physics steps) as ONE recorded GPU graph
            else: self._substeps(graph=False)
        self.push_left = (self.push_left - 1).clamp_min(0); self.t += 1
        Ee, e, ang, sl, axial, radial = self._err(); v = self.cvel[:, self.eb, 3:].norm(dim=-1)
        tau = self.afrc[:, self.act].abs() / TAU
        rew = 2.0 * torch.exp(-Ee / 0.15) + 1.5 * torch.exp(-Ee / 0.03) + 1.0 * torch.exp(-Ee / 0.004) + 30.0 * (self.prev_E - Ee)
        self.prev_E = Ee.clone()
        rew -= 0.3 * (tau ** 2).sum(-1) / 7 + 0.15 * ((a - self.prev_a) ** 2).sum(-1) / 7 + 0.002 * (self.qvel[:, self.da] ** 2).sum(-1)
        p1 = self.phase >= 1; rew -= p1.float() * (40 * radial + 2.0 * sl)
        term = torch.zeros(N, dtype=torch.bool, device=dev); succ = torch.zeros_like(term)
        ph0 = self.phase == 0
        ok = ph0 & (self.est_e < self.htol[0]) & (self.est_ang < self.htol[1]) & (self.est_sl < self.htol[1]) & (v < 0.03)   # decided from the robot's own estimate, like the real one
        self.steady = torch.where(ph0, torch.where(ok, self.steady + 1, torch.zeros_like(self.steady)), self.steady)
        up = ph0 & (self.steady >= 4)
        self.t_in = torch.where(up, self.t, self.t_in)
        rew += up.float() * 10.0; self.phase = torch.where(up, torch.ones_like(self.phase), self.phase); self.steady = torch.where(up, torch.zeros_like(self.steady), self.steady)
        seated = (axial.abs() < 0.0006) & (radial < 0.0015) & (sl < math.radians(2.5))
        to2 = (self.phase == 1) & seated & ~up
        rew += to2.float() * 15.0; self.phase = torch.where(to2, torch.full_like(self.phase, 2), self.phase); self.steady = torch.where(to2, torch.zeros_like(self.steady), self.steady)
        ph2 = self.phase == 2
        held = (axial.abs() < 0.0005) & (radial < 0.0010) & (sl < math.radians(2.5))
        self.steady = torch.where(ph2, torch.where(held, self.steady + 1, torch.zeros_like(self.steady)), self.steady)
        rew += ph2.float() * torch.where(held, 1.0, -1.0)
        locking = ph2 & ((self.steady >= 3) | (self.lock_t > 0))
        self.tgt[:, 8] = torch.where(locking, torch.full_like(self.tgt[:, 8], math.radians(45)), self.tgt[:, 8]); self.lock_t += locking.long()
        lockdeg = torch.rad2deg(self.qpos[:, self.qlock].abs())
        startpull = ph2 & (self.pull == 0) & (lockdeg > 40) & (self.steady >= 6)
        inpull = ph2 & (self.pull > 0)
        self.pull = torch.where(startpull, torch.ones_like(self.pull), torch.where(inpull, self.pull + 1, self.pull))
        done_pull = inpull & (self.pull > 11)
        good = done_pull & (axial.abs() < 0.0008) & (radial < 0.0015)
        rew += good.float() * 40.0 - (done_pull & ~good).float() * 10.0; succ |= good; term |= done_pull
        jam = ph2 & (self.pull == 0) & ~startpull & (self.lock_t > 50); rew -= jam.float() * 10.0; term |= jam
        zl = self.xpos[:, self.links, 2].min(-1).values
        crash = (zl < 0.012) | ~torch.isfinite(self.qpos).all(-1) | ((self.phase == 0) & (axial < (RX_TOP - RX_GAP) - 0.001) & (radial < 0.05))
        rew -= crash.float() * 20.0; term |= crash
        self.nan_idx = torch.nonzero(~torch.isfinite(self.qpos).all(-1)).flatten()
        self.cr = torch.stack([(zl < 0.012).sum(), (~torch.isfinite(self.qpos).all(-1)).sum(), ((self.phase == 0) & (axial < (RX_TOP - RX_GAP) - 0.001) & (radial < 0.05)).sum()]).cpu().numpy()
        self.prev_a = a; trunc = (self.t >= self.ep_len) & ~term; done = term | trunc
        rew = torch.nan_to_num(rew, nan=-20.0)
        # infos only for finished worlds (VecMonitor reads them)
        infos = [{} for _ in range(N)]
        di = torch.nonzero(done).flatten()
        if len(di):
            obs_term = self._obs_terminal_placeholder = None
            vals = torch.stack([succ[di].float(), crash[di].float(), self.phase[di].float(), e[di] * 1000, sl[di] * 57.29578, axial[di] * 1000, self.floor[di].float(), trunc[di].float()], -1).cpu().numpy()
            for i_, row in zip(di.tolist(), vals):
                infos[i_] = {'success': bool(row[0]), 'crash': bool(row[1]), 'phase': int(row[2]), 'err_mm': float(row[3]), 'slot_deg': float(row[4]), 'axial_mm': float(row[5]),
                             'kind': 'floor' if row[6] > 0.5 else 'air', 'TimeLimit.truncated': bool(row[7])}
        o_next = self._obs()
        if len(di):
            term_obs = o_next[di].cpu().numpy()
            self._reset_idx(di); o_next = self._obs(roll=False)
            for k_, i_ in enumerate(di.tolist()): infos[i_]['terminal_observation'] = term_obs[k_]
        return o_next.cpu().numpy(), rew.cpu().numpy(), done.cpu().numpy(), infos
    # ------------------------------------------------------------ boilerplate
    def close(self): pass
    def get_attr(self, name, indices=None): return [getattr(self, name)] * self.N
    def set_attr(self, name, value, indices=None): setattr(self, name, value)
    def env_method(self, *a, **k): return [None] * self.N
    def env_is_wrapped(self, wrapper_class, indices=None): return [False] * self.N
    def seed(self, seed=None): return [None]
