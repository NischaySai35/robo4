"""Motion planning, like MoveIt in small: a collision-free path in joint space from the robot's pose to a goal, then a
timed trajectory the trajectory controller follows (gos.control.joint_trajectory_controller).

    r = gos.plan.joint_path(app, {'J1': 1.2, 'J2': 0.0})
    if r.ok: app.actions.send_goal('/arm/follow_joint_trajectory', gos.plan.trajectory(r.path, speed=1.0))

Bidirectional RRT (RRT-Connect) over the named joints, MuJoCo's own collision test at every step, then shortcuts.
Collisions count when shapes overlap by more than `clearance` (m). A robot with closed loops is checked against the loop
gap too: a pose that opens a ring is rejected, so plans for rings come back short where the loop cannot follow.
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


def joint_path(app, goal, clearance=0.0005, step=0.08, max_iterations=4000, seed=0, loop_tolerance=0.002):
    """Plan from the current pose to goal ({joint: value}). Result: ok, path (list of {joint: value}), and why when it fails."""
    names = list(goal)
    mujoco, m, d, ids = _setup(app, names)
    base = app.data.qpos.copy()
    rng = random.Random(seed)

    def free(q):
        d.qpos[:] = base
        for (adr, _, _), v in zip(ids, q): d.qpos[adr] = v
        mujoco.mj_forward(m, d)
        if any(d.contact.dist[i] < -clearance for i in range(d.ncon)): return False
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
    if not free(start): return Result(False, 'The robot is already in collision where it stands, so no path can start.')
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
