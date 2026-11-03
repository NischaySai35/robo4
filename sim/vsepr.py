"""vsepr.py — Nischay's VSEPR spread (Valence Shell Electron Pair Repulsion): every part is like an electron pair, all repel
all, so a shape stays as big and uncrowded as it can (round rings, no part pressed against another).

The ONE sim copy of the Studio's objective (studio/src/assembly/connectorSnap.ts spreadFromPoints / spreadScore):
    energy = sum over pairs of 1 / (d + 1 mm)        lower = more spread;  minGap, meanGap in mm
Used by: manual.coop_connect (the old steering's null-space spread) and dik.DIK (a task in the QP).
"""
import numpy as np, mujoco

EPS = 1e-3


def energy(P):
    """sum over pairs of 1 / (d + 1 mm), unrounded (for solvers)"""
    P = np.asarray(P, float); i, k = np.triu_indices(len(P), 1)
    return float(np.sum(1 / (np.linalg.norm(P[i] - P[k], axis=1) + EPS)))


def spread_from_points(P):
    """the Studio's spreadFromPoints: P (n, 3) body centres (m) -> dict(energy, minGapMM, meanGapMM, bodies)"""
    P = np.asarray(P, float); i, k = np.triu_indices(len(P), 1)
    d = np.linalg.norm(P[i] - P[k], axis=1)
    if not len(d): return dict(energy=0.0, minGapMM=0, meanGapMM=0, bodies=len(P))
    return dict(energy=round(energy(P), 2), minGapMM=round(float(d.min()) * 1000), meanGapMM=round(float(d.mean()) * 1000), bodies=len(P))


def body_jacobians(m, d, bodies, dofs=None):
    """(n, 3, nv or len(dofs)) translational Jacobians of the body centres"""
    jp, jr = np.zeros((3, m.nv)), np.zeros((3, m.nv)); out = []
    for b in bodies:
        mujoco.mj_jacBody(m, d, jp, jr, b); out.append(jp.copy() if dofs is None else jp[:, dofs].copy())
    return np.array(out)


def gradient(P, J, pairs=None):
    """d energy / dq: P (n, 3) centres, J (n, 3, nq) their Jacobians; pairs (k, 2) or None = all pairs"""
    P = np.asarray(P, float)
    i, k = (np.triu_indices(len(P), 1) if pairs is None else (np.asarray(pairs)[:, 0], np.asarray(pairs)[:, 1]))
    r = P[i] - P[k]; d = np.linalg.norm(r, axis=1); u = r / np.maximum(d, 1e-9)[:, None]
    return -np.einsum('kx,kxv->v', u / ((d + EPS) ** 2)[:, None], J[i] - J[k])


def pair_residual(P, J, pairs):
    """for a least-squares solver: e_k = sqrt(1 / (d_k + 1 mm)) so that sum e^2 = the energy; returns (e, de/dq)"""
    pairs = np.asarray(pairs); i, k = pairs[:, 0], pairs[:, 1]
    r = P[i] - P[k]; d = np.linalg.norm(r, axis=1); u = r / np.maximum(d, 1e-9)[:, None]
    e = 1 / np.sqrt(d + EPS)
    return e, -0.5 * (d + EPS)[:, None] ** -1.5 * np.einsum('kx,kxv->kv', u, J[i] - J[k])


def spread_relax(x, err_fn, potential, lo, hi, iters=140, gain=2.0, max_step=0.3, eps=1e-4, log=None, cap_add=0.3):
    """Port of the Studio's secondary phase (studio/src/kinematics/modelIK.ts, solveModelIK opts.spread): with the mate already
    closed, push the bodies apart (minimise `potential`, the VSEPR energy) using ONLY the redundant freedom. Each step: the
    potential's gradient projected into the null space of the mate residual's Jacobian, a bounded step, then RE-CLOSE the loop
    (a few Gauss-Newton steps) and keep it only if the mate is still as tight AND the energy dropped; halve and retry otherwise.
    x: joint vector; err_fn(x) -> mate residual vector; potential(x) -> float; lo/hi: joint limits"""
    x = np.clip(np.asarray(x, float).copy(), lo, hi)
    norm = lambda v: float(np.linalg.norm(v))
    cap = norm(err_fn(x)) * 1.02 + cap_add          # the mate may not open up (Studio: +0.3 mm; here the residual is in mm)
    def jac(v, f, e0):
        J = np.zeros((len(e0), len(v)))
        for k in range(len(v)):
            vk = v.copy(); vk[k] += eps; J[:, k] = (f(vk) - e0) / eps
        return J
    def restore(c, n):
        for _ in range(n):
            e = err_fn(c)
            if norm(e) <= cap: break
            J = jac(c, err_fn, e); y = np.linalg.solve(J @ J.T + 1e-4 * np.eye(len(e)), e)
            c[:] = np.clip(c - np.clip(J.T @ y, -max_step, max_step), lo, hi)
    p_start = potential(x)
    for s in range(iters):
        e0 = err_fn(x); J = jac(x, err_fn, e0); p0 = potential(x)
        g = np.array([-(potential(x + eps * np.eye(len(x))[k]) - p0) / eps for k in range(len(x))])   # descend the potential
        gn = g - J.T @ np.linalg.solve(J @ J.T + 1e-6 * np.eye(len(e0)), J @ g)                       # null space of the mate
        st0 = min(gain, max_step / max(np.abs(gn).max(), 1e-9)); moved = False
        for bt in range(5):
            c = np.clip(x + st0 * 0.5 ** bt * gn, lo, hi); restore(c, 8)
            if norm(err_fn(c)) <= cap and potential(c) < p0 - 1e-9: x = c; moved = True; break
        if not moved: break
    if log: log(f'  VSEPR spread (Studio modelIK method): energy {p_start:.1f} -> {potential(x):.1f} in {s + 1} steps')
    return x
