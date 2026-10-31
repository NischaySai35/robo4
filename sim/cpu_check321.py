"""Independent re-implementation of the sag-aware IK docking controller on CPU MuJoCo (cross-check of the GPU result)."""
from paths import tpath
import sys, math, time, numpy as np
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv, VMAX, RX_TOP, RX_GAP
log = open(tpath('logs/cpu_check_seed321.log'), 'w')
def P(*a):
    s = ' '.join(str(x) for x in a); print(s, flush=True); log.write(s + '\n'); log.flush()
def slot(xB, Ro):
    a = math.atan2(xB @ Ro[:, 1], xB @ Ro[:, 0]) - math.pi / 4; return (a + math.pi / 4) % (math.pi / 2) - math.pi / 4
class IKController:
    def __init__(self, env): self.e = env
    def reset(self):
        e = self.e; q0 = e.cmd.copy(); self.qik = q0.copy(); self.off = np.zeros(7); self.appr = RX_TOP - RX_GAP + e.standoff; self.phase = 0; self.steady = 0; self.k = 0
        self.z = e.Rrx_obs[:, 2]; self.Ro = e.Rrx_obs; self.hover = e.hover + e.bias_p; self.seat = e.seat + e.bias_p
        self.seed = e._ik(self.hover, self.z, self.Ro, q0, seeds=6)
    def pose(self, q):
        p, n, x = self.e._fk(q); return p, np.stack([x, n, np.cross(x, n)], -1)
    def err(self, p, R, goal):
        nB, xB = R[:, 1], R[:, 0]; s = slot(xB, self.Ro)
        return np.r_[(goal - p) * 1000, (np.cross(nB, -self.z) - s * self.z) * 60]
    def step(self):
        e = self.e; z = self.z
        qm = e.qhist[max(0, len(e.qhist) - 1 - e.obs_lag)][0]          # measured, lagged encoder angles
        if self.k < 18:
            self.qik = self.qik + np.clip(self.seed - self.qik, -VMAX * 0.5, VMAX * 0.5)
        else:
            if self.phase >= 1: self.appr = max(self.appr - 0.003, -0.0004)
            goal = self.hover if self.phase == 0 else self.seat + self.appr * z
            p0, R0 = self.pose(self.qik); J = np.zeros((6, 7)); h = 1e-3
            for j in range(7):
                qq = self.qik.copy(); qq[j] += h; p1, R1 = self.pose(qq)
                J[:3, j] = (p1 - p0) / h; J[3:, j] = 0.5 * sum(np.cross(R0[:, i], R1[:, i]) for i in range(3)) / h
            Js = J.copy(); Js[:3] *= 1000; Js[3:] *= 60; A = Js @ Js.T + 4 * np.eye(6)
            solve = lambda ev: Js.T @ np.linalg.solve(A, ev)
            lim = 0.03 if self.phase >= 1 else VMAX * 0.6
            self.qik = np.clip(self.qik + np.clip(solve(self.err(p0, R0, goal)), -lim, lim), e.lo, e.hi)
            pm, Rm = self.pose(qm); em = self.err(pm, Rm, goal)
            if np.linalg.norm(e.d.cvel[e.eb][3:]) < 0.05: self.off = np.clip(self.off + 0.1 * np.clip(solve(em), -0.004, 0.004), -0.08, 0.08)
            # hover decision from the robot's OWN estimate
            est_e = np.linalg.norm(goal - pm); est_ang = math.acos(max(-1, min(1, -(Rm[:, 1] @ z)))); est_sl = abs(slot(Rm[:, 0], self.Ro))
            if self.phase == 0:
                ok = est_e < 0.006 and est_ang < math.radians(3) and est_sl < math.radians(3) and np.linalg.norm(e.d.cvel[e.eb][3:]) < 0.03
                self.steady = self.steady + 1 if ok else 0
                if self.steady >= 4: self.phase = 1; e.phase = 1; e.prev_E = e._err()[0]
        self.k += 1
        return np.clip(self.qik + self.off, e.lo, e.hi)
if __name__ == '__main__':
    import os
    N = int(os.environ.get('NEP', '40')); env = TetroDockEnv(seed=321, floor_frac=0.9, max_dist=0.30); env.htol = (1e9, 1e9); C = IKController(env); res = []; t0 = time.time()
    for ep in range(N):
        env.reset(); env.htol = (-1, -1)          # env never switches phase by itself: the controller decides (from its estimate)
        C.reset(); info = {}
        for t in range(env.ep_len):
            env.cmd = C.step(); o, r, te, tr, info = env.step(np.zeros(7))
            if env.phase >= 1 and C.phase == 0: C.phase = env.phase
            if te or tr: break
        res.append(info); P('ep %2d %-5s docked %-5s phase %d axial %.2f mm radial %.2f mm lock %.0f deg crash %s' % (ep, env.kind, info.get('success'), info.get('phase', 0), info.get('axial_mm', 0), info.get('radial_mm', 0), info.get('lock_deg', 0), info.get('crash')))
    P('CPU MuJoCo cross-check: docked %d/%d = %.1f%% | crashes %d | %.0f s' % (sum(bool(r.get('success')) for r in res), len(res), 100 * np.mean([bool(r.get('success')) for r in res]), sum(bool(r.get('crash')) for r in res), time.time() - t0))
    P('DONE')
