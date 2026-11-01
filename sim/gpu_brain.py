"""gpu_brain.py — the docking brain's maths for thousands of robots at once on the GPU (MuJoCo Warp + torch).

Step 1 of the GPU teacher (1 Nov): the encoder-only, sag-aware end estimate (tetro_env2.TetroDockEnv._fk, the same calc the
laptop runs for the real robot), batched. Same nominal model, same 3 gravity passes: kinematics -> com_pos -> rne gives the
gravity load on every PLA flex / base joint (deflection = load / nominal stiffness) and the side every backlash joint sits on.
The CPU version stays the reference: parity test below.
    py -3.12 gpu_brain.py [N]        parity vs the CPU brain on N random poses, and speed
"""
import sys, time, numpy as np, mujoco
from tetro_env2 import BL_DEADBAND


class BatchedNOM:
    def __init__(self, nom, n):
        """nom = the CPU brain's nominal model (laptop_controller.NOM, a TetroDockEnv); n = robots at once"""
        import torch, warp as wp, mujoco_warp as mjw
        self.torch, self.wp, self.mjw, self.n = torch, wp, mjw, n
        m = nom.m; self.m = m; wp.init()
        self.mm = mjw.put_model(m); self.d = mjw.put_data(m, mujoco.MjData(m), nworld=n)
        self.T = lambda a, dt=torch.float32: torch.as_tensor(np.asarray(a), dtype=dt, device='cuda')
        sagj = [j for j in range(m.njnt) if '_flex' in m.joint(j).name or m.joint(j).name.startswith('base_tilt')]
        blj = [j for j in range(m.njnt) if m.joint(j).name.endswith('_bl')]
        L = torch.long
        self.qa = self.T(nom.qa, L)
        self.sag_q = self.T([m.jnt_qposadr[j] for j in sagj], L); self.sag_v = self.T([m.jnt_dofadr[j] for j in sagj], L)
        self.sag_k = self.T([nom.nom['stiff'][j] for j in sagj])
        self.bl_q = self.T([m.jnt_qposadr[j] for j in blj], L); self.bl_v = self.T([m.jnt_dofadr[j] for j in blj], L)
        self.bl_r = self.T([nom.nom['rng'][j][1] for j in blj])
        self.eb, self.tip = nom.eb, nom.s_tip
        self.qpos, self.qvel = wp.to_torch(self.d.qpos), wp.to_torch(self.d.qvel)
        self.frc, self.site, self.xmat = wp.to_torch(self.d.qfrc_bias), wp.to_torch(self.d.site_xpos), wp.to_torch(self.d.xmat)

    def fk(self, q):
        """q: (n, 7) encoder angles (rad, the brain's joint order). Returns End B pad tip (n, 3), its axis y (n, 3), its x (n, 3)."""
        mjw, mm, d = self.mjw, self.mm, self.d
        self.qpos.zero_(); self.qvel.zero_(); self.qpos[:, self.qa] = q
        for _ in range(3):
            mjw.kinematics(mm, d); mjw.com_pos(mm, d); mjw.rne(mm, d)
            f = self.frc
            self.qpos[:, self.sag_q] = -f[:, self.sag_v] / self.sag_k
            fb = f[:, self.bl_v]; self.qpos[:, self.bl_q] = -self.torch.sign(fb) * (fb.abs() > BL_DEADBAND) * self.bl_r   # as tetro_env2._fk
        mjw.kinematics(mm, d)
        R = self.xmat[:, self.eb].reshape(-1, 3, 3)
        return self.site[:, self.tip].clone(), R[:, :, 1].clone(), R[:, :, 0].clone()



def slot_t(torch, xB, Ro):
    """laptop_controller.slot, batched: the end's pad twist off the 45-deg slot (rad). xB (n, 3), Ro (n, 3, 3)"""
    a = torch.atan2((xB * Ro[:, :, 1]).sum(-1), (xB * Ro[:, :, 0]).sum(-1)) - torch.pi / 4
    return torch.remainder(a + torch.pi / 4, torch.pi / 2) - torch.pi / 4


class BatchedIK:
    """GPU teacher step 2 (1 Nov): one damped-least-squares IK step of laptop_controller.DockController.step for n robots:
    numeric Jacobian from 8 batched end estimates (pose + 7 nudges of 1e-3 rad), position x1000 / orientation x60, damping 4,
    LIMIT_GUARD down-weighting twists near their stops. The CPU controller stays the reference (parity test below)."""
    def __init__(self, nom, n):
        self.n = n; self.B = BatchedNOM(nom, n * 8); self.torch = torch = self.B.torch; T = self.B.T
        self.lo, self.hi = T(nom.lo), T(nom.hi); self.h = 1e-3
        self.eye6 = 4 * torch.eye(6, device='cuda')

    def pose(self, q8):
        p, y, x = self.B.fk(q8); return p, torch_stack(self.torch, x, y)

    def step(self, q, goal, z, Ro, zt=None, limit_guard=True):
        torch = self.torch; n = self.n; zt = z if zt is None else zt
        Q = q.unsqueeze(1).repeat(1, 8, 1); Q[:, 1:, :] += self.h * torch.eye(7, device='cuda').unsqueeze(0)
        p, R = self.pose(Q.reshape(-1, 7)); p = p.reshape(n, 8, 3); R = R.reshape(n, 8, 3, 3)
        p0, R0 = p[:, 0], R[:, 0]
        J = torch.zeros(n, 6, 7, device='cuda')
        J[:, :3] = ((p[:, 1:] - p0.unsqueeze(1)) / self.h).transpose(1, 2)
        rot = 0.5 * sum(torch.cross(R0[:, :, i].unsqueeze(1).expand(-1, 7, -1), R[:, 1:, :, i], dim=-1) for i in range(3)) / self.h
        J[:, 3:] = rot.transpose(1, 2)
        Js = J.clone(); Js[:, :3] *= 1000; Js[:, 3:] *= 60
        if limit_guard:
            room = torch.minimum(q - self.lo, self.hi - q); wj = torch.clamp((room - 0.03) / 0.25, 0.05, 1.0); wj[:, [1, 2, 4, 5]] = 1.0
        else: wj = torch.ones_like(q)
        Js = Js * wj.unsqueeze(1)
        e = torch.cat([(goal - p0) * 1000, (torch.cross(R0[:, :, 1], -zt, dim=-1) - slot_t(torch, R0[:, :, 0], Ro).unsqueeze(-1) * z) * 60], -1)
        A = Js @ Js.transpose(1, 2) + self.eye6
        return wj * (Js.transpose(1, 2) @ torch.linalg.solve(A, e.unsqueeze(-1))).squeeze(-1)


def torch_stack(torch, x, y):
    return torch.stack([x, y, torch.cross(x, y, dim=-1)], -1)


if __name__ == '__main__':
    import io, contextlib, os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'deploy'))
    with contextlib.redirect_stdout(io.StringIO()):
        import laptop_controller as LC
    N = int(sys.argv[1]) if len(sys.argv) > 1 else 1024
    nom = LC.NOM; rng = np.random.default_rng(1)
    Q = rng.uniform(nom.lo * 0.9, nom.hi * 0.9, (N, 7))
    B = BatchedNOM(nom, N); qt = B.T(Q)
    p, y, x = B.fk(qt); B.torch.cuda.synchronize()
    t = time.time()
    for _ in range(10): p, y, x = B.fk(qt)
    B.torch.cuda.synchronize(); dt = (time.time() - t) / 10
    k = min(64, N); err_p, err_a = [], []
    t = time.time()
    for i in range(k):
        pc, yc, xc = nom._fk(Q[i]); err_p.append(np.linalg.norm(pc - p[i].cpu().numpy()) * 1000); err_a.append(np.degrees(np.arccos(np.clip(yc @ y[i].cpu().numpy(), -1, 1))))
    dc = (time.time() - t) / k
    bad = [i for i in range(k) if err_p[i] > 0.5]
    for i in bad[:3]:
        nom.dr.qpos[:] = 0; nom._fk(Q[i]); f = np.zeros(nom.m.nv); mujoco.mj_rne(nom.m, nom.dr, 0, f)
        print(f'  pose {i}: {err_p[i]:.2f} mm off; smallest backlash load {min(abs(f[nom.m.jnt_dofadr[j]]) for j in range(nom.m.njnt) if nom.m.joint(j).name.endswith("_bl")):.2e} N.m')
    print(f'{len(bad)}/{k} poses over 0.5 mm')
    print(f'parity on {k} poses: tip {np.max(err_p):.4f} mm worst (median {np.median(err_p):.4f}), axis {np.max(err_a):.4f} deg worst')
    print(f'speed: GPU {N} robots {dt * 1000:.1f} ms per call ({N / dt:.0f} estimates/s) | CPU {dc * 1000:.2f} ms each ({1 / dc:.0f}/s) -> x{(N / dt) * dc:.0f}')
    # step 2: one IK step, GPU vs the CPU controller's formula
    n2 = min(512, N); IK = BatchedIK(nom, n2); T = IK.B.T; Lm = LC
    q = Q[:n2]; goal = np.zeros((n2, 3)); zz = np.zeros((n2, 3)); RR = np.zeros((n2, 3, 3))
    for i in range(n2):
        pp, yy, xx = nom._fk(q[i]); zz[i] = -yy; goal[i] = pp + rng.normal(0, 0.01, 3); a = rng.normal(0, 0.05, 3)
        zi = -yy; th = np.radians(45 + rng.normal(0, 3)); xr = np.cos(th) * xx + np.sin(th) * np.cross(zi, xx)   # a receiver 45 deg (+-3) from the pads, as when docking
        RR[i] = np.stack([xr, np.cross(zi, xr), zi], 1)
    dq = IK.step(T(q), T(goal), T(zz), T(RR)); IK.torch.cuda.synchronize()
    t = time.time(); dq = IK.step(T(q), T(goal), T(zz), T(RR)); IK.torch.cuda.synchronize(); dt2 = time.time() - t
    errs, raw = [], []
    for i in range(64):
        C = type('C', (), {})(); C.z = zz[i]; C.Ro = RR[i]
        pose = lambda qq: (lambda p_, n_, x_: (p_, np.stack([x_, n_, np.cross(x_, n_)], -1)))(*nom._fk(qq))
        p0, R0 = pose(q[i]); J = np.zeros((6, 7)); h = 1e-3
        for j in range(7):
            qq = q[i].copy(); qq[j] += h; p1, R1 = pose(qq); J[:3, j] = (p1 - p0) / h; J[3:, j] = 0.5 * sum(np.cross(R0[:, k], R1[:, k]) for k in range(3)) / h
        Js = J.copy(); Js[:3] *= 1000; Js[3:] *= 60; room = np.minimum(q[i] - nom.lo, nom.hi - q[i]); wj = np.clip((room - 0.03) / 0.25, 0.05, 1.0); wj[[1, 2, 4, 5]] = 1.0; Js = Js * wj
        e = np.r_[(goal[i] - p0) * 1000, (np.cross(R0[:, 1], -zz[i]) - Lm.slot(R0[:, 0], RR[i]) * zz[i]) * 60]
        dqc = wj * (Js.T @ np.linalg.solve(Js @ Js.T + 4 * np.eye(6), e)); dg = dq[i].cpu().numpy(); errs.append(np.abs(np.clip(dqc, -0.015, 0.015) - np.clip(dg, -0.015, 0.015)).max()); raw.append(np.abs(dqc - dg).max())
    print(f'IK step parity on 64 robots, as the controller uses it (clipped to 0.015 rad): worst {np.degrees(max(errs)):.4f} deg, median {np.degrees(np.median(errs)):.5f} | raw step: median {np.degrees(np.median(raw)):.4f}, worst {np.degrees(max(raw)):.1f} deg | GPU {n2} robots {dt2 * 1000:.1f} ms per IK step')
