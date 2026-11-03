"""Motion planning, like MoveIt in small: a collision-free path in joint space from the robot's pose to a goal, then a
timed trajectory the trajectory controller follows (gos.control.joint_trajectory_controller).

    r = gos.plan.joint_path(app, {'J1': 1.2, 'J2': 0.0})
    if r.ok: app.actions.send_goal('/arm/follow_joint_trajectory', gos.plan.trajectory(r.path, speed=1.0))

Bidirectional RRT (RRT-Connect) over the named joints, MuJoCo's own collision test at every step, then shortcuts.
Collisions count when shapes overlap by more than `clearance` (m) beyond what they already do in the start pose. A robot with closed loops is checked against the loop
gap too: a pose that opens a ring is rejected, so plans for rings come back short where the loop cannot follow.

    r = gos.plan.cartesian_path(app, 'hand', [0.3, 0.1, 0.2])

moves a body in a straight line instead, and keeps every ring closed on the way: each small step solves the line and the
ring's joins together. It stops where it cannot go on and says why, with the part it did manage in r.path.
"""
import math, random

from .app import Result
from .physics import GosError


def _setup(app, names):
    m = app.model
    if m is None: raise GosError('No robot loaded. Call app.load(path) first.')
    import mujoco
    ids = []
    for n in names:
        j = mujoco.mj_name2id(m, mujoco.mjtObj.mjOBJ_JOINT, n)
        if j < 0: raise GosError(f'No joint named "{n}". Joints: {", ".join(app.robot.joints())}')
        lo, hi = (m.jnt_range[j] if m.jnt_limited[j] else (-math.pi, math.pi))
        ids.append((int(m.jnt_qposadr[j]), float(lo), float(hi)))
    return mujoco, m, mujoco.MjData(m), ids


def _overlaps(d):
    """Deepest overlap of each pair of shapes now in contact."""
    out = {}
    for i in range(d.ncon):
        c = d.contact[i]; pair = (min(c.geom1, c.geom2), max(c.geom1, c.geom2))
        out[pair] = min(out.get(pair, 0.0), float(c.dist))
    return out


def _hits(d, allowed, clearance):
    """Real parts are wrapped in solid outer shells, so neighbours can overlap by centimetres in a normal pose. A pair
    overlapping in the start pose (allowed) may stay so, but not go deeper; any other overlap is a hit."""
    return any(dist < min(allowed.get(pair, 0.0), 0.0) - clearance for pair, dist in _overlaps(d).items())


def joint_path(app, goal, clearance=0.0005, step=0.08, max_iterations=4000, seed=0, loop_tolerance=0.002):
    """Plan from the current pose to goal ({joint: value}). Result: ok, path (list of {joint: value}), and why when it fails."""
    names = list(goal)
    mujoco, m, d, ids = _setup(app, names)
    base = app.data.qpos.copy()
    rng = random.Random(seed)
    d.qpos[:] = base; mujoco.mj_forward(m, d); allowed = _overlaps(d)

    def free(q):
        d.qpos[:] = base
        for (adr, _, _), v in zip(ids, q): d.qpos[adr] = v
        mujoco.mj_forward(m, d)
        if _hits(d, allowed, clearance): return False
        if m.neq:
            rows = d.efc_type[:d.nefc] == mujoco.mjtConstraint.mjCNSTR_EQUALITY
            if rows.any() and float(abs(d.efc_pos[:d.nefc][rows]).max()) > loop_tolerance: return False
        return True

    def segment_free(a, b):
        n = max(1, int(math.ceil(max(abs(x - y) for x, y in zip(a, b)) / (step / 4))))
        return all(free([x + (y - x) * k / n for x, y in zip(a, b)]) for k in range(1, n + 1))

    start = [float(base[adr]) for adr, _, _ in ids]
    end = [float(goal[n]) for n in names]
    for n, v, (_, lo, hi) in zip(names, end, ids):
        if not lo - 1e-9 <= v <= hi + 1e-9: return Result(False, f'{n} = {v:.3f} is outside its limits [{lo:.3f}, {hi:.3f}].')
    if not free(end): return Result(False, 'The goal pose collides with something (or opens a loop), so no path can reach it.')
    if segment_free(start, end): return Result(True, 'The straight path is free.', {'path': [dict(zip(names, start)), dict(zip(names, end))]})

    trees = [[(start, None)], [(end, None)]]
    dist = lambda a, b: math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))

    def extend(tree, target):
        i = min(range(len(tree)), key=lambda k: dist(tree[k][0], target))
        q, dd = tree[i][0], dist(tree[i][0], target)
        new = target if dd <= step else [x + (y - x) * step / dd for x, y in zip(q, target)]
        if not segment_free(q, new): return None
        tree.append((new, i)); return len(tree) - 1

    def branch(tree, i):
        out = []
        while i is not None: out.append(tree[i][0]); i = tree[i][1]
        return out

    for it in range(max_iterations):
        sample = end if rng.random() < 0.05 else [rng.uniform(lo, hi) for _, lo, hi in ids]
        a, b = trees if it % 2 == 0 else trees[::-1]
        ia = extend(a, sample)
        if ia is None: continue
        # pull the other tree toward the new node until it meets or is blocked
        ib = None
        while True:
            nxt = extend(b, a[ia][0])
            if nxt is None: break
            ib = nxt
            if dist(b[ib][0], a[ia][0]) < 1e-9: break
        if ib is not None and dist(b[ib][0], a[ia][0]) < 1e-9:
            pa, pb = branch(a, ia), branch(b, ib)
            path = (pa[::-1] + pb[1:]) if a is trees[0] else (pb[::-1] + pa[1:])
            path = _shortcut(path, segment_free, rng)
            return Result(True, f'Found a path with {len(path)} waypoints after {it + 1} tries.', {'path': [dict(zip(names, q)) for q in path], 'iterations': it + 1})
    return Result(False, f'No collision-free path found in {max_iterations} tries. The goal may be boxed in; try a nearer goal or more tries.')


def cartesian_path(app, body, goal, joints=None, keep_angle=False, step=0.005, tolerance=0.001, angle_tolerance=0.01, clearance=0.0005, loop_tolerance=0.0005, damping=1e-3):
    """Move body's origin to goal (x, y, z in metres) in a straight line. Result: ok, path (list of {joint: value}), reached
    (share of the line done), and why when it stops early. joints: the joints it may use, all of them by default.
    keep_angle: also hold the body at the angle it starts with, like keeping a cup level."""
    import numpy as np
    names = list(joints) if joints else list(app.robot.joints())
    mujoco, m, d, ids = _setup(app, names)
    b = mujoco.mj_name2id(m, mujoco.mjtObj.mjOBJ_BODY, body)
    if b < 0: raise GosError(f'No body named "{body}".')
    dofs = [int(m.jnt_dofadr[mujoco.mj_name2id(m, mujoco.mjtObj.mjOBJ_JOINT, n)]) for n in names]
    lo, hi = np.array([x[1] for x in ids]), np.array([x[2] for x in ids])
    adr = [x[0] for x in ids]
    jac, jacr, turn = np.zeros((3, m.nv)), np.zeros((3, m.nv)), np.zeros(3)
    goal = np.asarray(goal, dtype=float)
    d.qpos[:] = app.data.qpos
    sparse = m.opt.jacobian
    m.opt.jacobian = mujoco.mjtJacobian.mjJAC_DENSE  # the ring's rows are read as a plain matrix below
    try:
        def state():
            mujoco.mj_forward(m, d)
            rows = np.flatnonzero(d.efc_type[:d.nefc] == mujoco.mjtConstraint.mjCNSTR_EQUALITY)
            gap = d.efc_pos[:d.nefc][rows]
            return rows, gap, (float(np.abs(gap).max()) if len(rows) else 0.0)

        rows, gap, worst = state()
        allowed = _overlaps(d)
        if worst > loop_tolerance: return Result(False, f'A ring is already open by {worst * 1000:.1f} mm where the robot stands.', {'path': [], 'reached': 0.0})
        start, angle0 = d.xpos[b].copy(), d.xquat[b].copy()

        def angle_error():  # how far the body has turned from its start, as a turn in world axes
            mujoco.mju_subQuat(turn, angle0, d.xquat[b])
            return d.xmat[b].reshape(3, 3) @ turn

        length = float(np.linalg.norm(goal - start))
        n = max(1, int(np.ceil(length / step)))
        path = [dict(zip(names, (float(d.qpos[a]) for a in adr)))]

        def stop(k, why):
            return Result(False, f'Stopped {100 * (k - 1) / n:.0f}% along the line: {why}', {'path': path, 'reached': (k - 1) / n})

        for k in range(1, n + 1):
            target = start + (goal - start) * k / n
            for _ in range(60):
                rows, gap, worst = state()
                err = target - d.xpos[b]
                turned = angle_error() if keep_angle else np.zeros(3)
                if np.linalg.norm(err) < tolerance / 2 and np.linalg.norm(turned) < angle_tolerance / 2 and worst < loop_tolerance / 10: break
                mujoco.mj_jacBody(m, d, jac, jacr, b)
                J = jac[:, dofs]
                if keep_angle: J, err = np.vstack([J, jacr[:, dofs]]), np.concatenate([err, turned])
                if len(rows):  # the ring's joins come first: they get a much higher weight than the line
                    Je = d.efc_J[:d.nefc * m.nv].reshape(d.nefc, m.nv)[rows][:, dofs]
                    J, err = np.vstack([J, 30 * Je]), np.concatenate([err, -30 * gap])
                dq = J.T @ np.linalg.solve(J @ J.T + damping * damping * np.eye(len(J)), err)
                d.qpos[adr] = np.clip(d.qpos[adr] + np.clip(dq, -0.2, 0.2), lo, hi)
            rows, gap, worst = state()
            miss = float(np.linalg.norm(target - d.xpos[b]))
            if miss > tolerance: return stop(k, f'the robot cannot follow it there ({miss * 1000:.1f} mm off): out of reach, at a joint limit, or a ring holds it back.')
            if keep_angle and np.linalg.norm(angle_error()) > angle_tolerance: return stop(k, f'the robot cannot hold its angle there (off by {np.degrees(np.linalg.norm(angle_error())):.1f} degrees).')
            if worst > loop_tolerance: return stop(k, f'a ring would open by {worst * 1000:.1f} mm.')
            if _hits(d, allowed, clearance): return stop(k, 'it would hit something.')
            path.append(dict(zip(names, (float(d.qpos[a]) for a in adr))))
    finally:
        m.opt.jacobian = sparse
    return Result(True, f'Straight line of {length * 1000:.0f} mm in {n} steps.', {'path': path, 'reached': 1.0})


def _shortcut(path, segment_free, rng, rounds=60):
    path = list(path)
    for _ in range(rounds):
        if len(path) < 3: break
        i, j = sorted(rng.sample(range(len(path)), 2))
        if j - i > 1 and segment_free(path[i], path[j]): path = path[:i + 1] + path[j:]
    return path


def trajectory(path, speed=1.0):
    """A goal for the joint trajectory controller: the path timed so the fastest joint moves at `speed` rad/s."""
    if not path: raise GosError('An empty path has no trajectory.')
    names, t, points = list(path[0]), 0.0, []
    for a, b in zip(path, path[1:]):
        t += max(max(abs(b[n] - a[n]) for n in names) / speed, 0.02)
        points.append({'q': [b[n] for n in names], 't': round(t, 4)})
    return {'names': names, 'points': points}
