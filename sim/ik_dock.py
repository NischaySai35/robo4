"""Sag-compensated IK docking v2: solve directly on the flexing model's static equilibrium."""
from paths import tpath
import sys, math, time, numpy as np, mujoco
from scipy.optimize import least_squares
sys.path.insert(0, tpath('sim'))
from tetro_env2 import TetroDockEnv, rot, VMAX
OUT = tpath('logs/ik_dock.log')
def log(*a):
    s = ' '.join(str(x) for x in a); print(s, flush=True); open(OUT, 'a').write(s + '\n')
def slot(xB, Ro):
    a = math.atan2(np.dot(xB, Ro[:, 1]), np.dot(xB, Ro[:, 0])) - math.pi / 4; return (a + math.pi / 4) % (math.pi / 2) - math.pi / 4
class Planner:
    def __init__(self):
        self.e = TetroDockEnv(seed=0, randomize=False); self.e.reset(seed=0)
        self.m = self.e.m; self.d = mujoco.MjData(self.m); m = self.m
        # heavy damping on the passive flex/backlash/base joints: same static sag, settles 10x faster
        for j in range(m.njnt):
            n = m.joint(j).name
            if '_flex' in n or n.endswith('_bl') or n.startswith('base_'): m.dof_damping[m.jnt_dofadr[j]] *= 25
    def rigid(self, q): return self.e._fk(q)
    def sag(self, q, steps=500):
        m, d, e = self.m, self.d, self.e
        mujoco.mj_resetData(m, d); d.qpos[e.qa] = q; d.ctrl[:] = 0; d.ctrl[e.act_id] = q
        for _ in range(steps): mujoco.mj_step(m, d)
        R = d.xmat[e.eb].reshape(3, 3)
        return d.site_xpos[e.s_tip].copy(), R[:, 1].copy(), R[:, 0].copy(), float(np.abs(d.actuator_force[e.act_id]).max())
    def res(self, q, p, z, Ro, q0, f):
        pp, nB, xB = f(q)[:3]
        return np.concatenate([(pp - p) * 1000, np.cross(nB, -z) * 60, [slot(xB, Ro) * 60], (q - q0) * 0.2])
    def solve(self, p, z, Ro, q0, rng, seeds=6):
        lo, hi = self.e.lo, self.e.hi; best = None
        for s0 in [q0] + [rng.uniform(lo * 0.8, hi * 0.8) for _ in range(seeds)]:
            r = least_squares(self.res, np.clip(s0, lo, hi), bounds=(lo, hi), args=(p, z, Ro, q0, self.rigid), max_nfev=300)
            if self.res(r.x, p, z, Ro, q0, self.rigid)[:3] @ np.ones(3) is None: pass
            c = np.linalg.norm(r.fun[:7])
            if best is None or c < best[0]: best = (c, r.x)
            if c < 0.3 and seeds == 0: break
        q = best[1]
        # refine on the sagging model (finite-difference least squares, warm-started from rigid IK)
        r = least_squares(self.res, q, bounds=(lo, hi), args=(p, z, Ro, q0, self.sag), max_nfev=40, diff_step=2e-3)
        pt, nt, xt, tau = self.sag(r.x)
        return r.x, np.linalg.norm(pt - p) * 1000, math.degrees(math.asin(min(1, np.linalg.norm(np.cross(nt, -z))))), abs(math.degrees(slot(xt, Ro))), tau
def execute(env, goal, hold_steps, scale=1.0):
    info = {}; waited = 0
    for t in range(500):
        dq = goal - env.cmd; mx = np.abs(dq).max()
        a = dq / max(mx, VMAX * scale) * (min(mx, VMAX * scale) / VMAX) if mx > 0 else np.zeros(7)   # all joints arrive together
        o, r, te, tr, info = env.step(a)
        if te or tr: return info, True
        if mx < 1e-4:
            waited += 1
            settled = np.abs(env.d.qpos[env.qa] - goal).max() < 0.004 and np.abs(env.d.qvel[env.da]).max() < 0.05
            if settled or waited > 60: hold_steps -= 1          # real servos arrived (or 3.6 s timeout)
            if hold_steps <= 0: return info, False
    return info, False
def run_episode(env, P, seed, rng):
    env.reset(seed=seed); env.ep_len = 10 ** 6; z = env.Rrx_obs[:, 2]; Ro = env.Rrx_obs
    seat = env.seat + env.bias_p; hover = env.hover + env.bias_p; far = hover + 0.06 * z
    t0 = time.time(); q0 = env.d.qpos[env.qa].copy()
    qf, ef, _, _, tau = P.solve(far, z, Ro, q0, rng)
    qh, eh, ah, sh, tau2 = P.solve(hover, z, Ro, qf, rng, seeds=0)
    plan = [qf, qh]
    for f in [0.75, 0.5, 0.3, 0.15, 0.05]:
        qn = P.solve(seat + (hover - seat) * f, z, Ro, plan[-1], rng, seeds=0)[0]; plan.append(qn)
    plan.append(P.solve(seat - 0.0004 * z, z, Ro, plan[-1], rng, seeds=0)[0])
    plan_s = time.time() - t0
    if max(tau, tau2) > 2.6: return dict(ok=False, why='torque', kind=env.kind)
    info, done = execute(env, plan[0], 3, 0.7)
    if not done: info, done = execute(env, plan[1], 40)            # settle at hover ~2.4 s
    hov = (round(info.get('err_mm', -1), 2), round(info.get('ang_deg', -1), 2), round(info.get('slot_deg', -1), 2))
    if not done and env.phase == 0: env.phase = 1; env.prev_E = env._err()[0]
    for g in plan[2:]:
        if done: break
        info, done = execute(env, g, 4, 0.25)                        # slow straight-in
    while not done and env.t < 600:
        o, r, done, tr, info = env.step(np.zeros(7))
    return dict(ok=bool(info.get('success')), kind=env.kind, plan_s=round(plan_s, 1), pred_hover=(round(eh, 2), round(ah, 2), round(sh, 2)), real_hover=hov,
                axial=round(info.get('axial_mm', 0), 2), radial=round(info.get('radial_mm', 0), 2), slot=round(info.get('slot_deg', 0), 2), lock=round(info.get('lock_deg', 0)),
                mag=round(info.get('mag_N', 0)), why=[k for k in ('pull_fail', 'lock_jam', 'crash') if info.get(k)])
if __name__ == '__main__':
    rand = sys.argv[1] == '1'; N = int(sys.argv[2])
    open(OUT, 'w').write('')
    P = Planner(); env = TetroDockEnv(seed=11, randomize=rand, max_dist=0.30); rng = np.random.default_rng(0)
    res = []
    for i in range(N):
        r = run_episode(env, P, 100 + i, rng); res.append(r); log(i, r)
    log('SUCCESS %d / %d  (randomized=%s)' % (sum(r['ok'] for r in res), len(res), rand))
