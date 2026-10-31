"""Controllers, like ros2_control: the joint trajectory controller follows a timed list of poses on whatever
app.move drives, the simulation and, when attached and armed, the real robot. Exposed as an action.
"""
import time


def joint_trajectory_controller(app, action='/arm/follow_joint_trajectory', rate=50):
    """Goal: {"names": [...], "points": [{"q": [...], "t": seconds}, ...]} with t rising from 0.
    Feedback: progress 0..1 and the commanded pose. Cancelling stops at the current pose (and stops the real robot)."""
    def follow(goal, feedback, cancelled):
        names, pts = goal['names'], goal['points']
        if not pts or any(len(p['q']) != len(names) for p in pts):
            raise ValueError('Every point needs one value per joint name.')
        if any(b['t'] <= a['t'] for a, b in zip(pts, pts[1:])):
            raise ValueError('Point times must rise.')
        start = dict(app.robot.joints())
        path = [{'q': [start[n] for n in names], 't': 0.0}] + [p for p in pts if p['t'] > 0]
        t0, end = time.time(), path[-1]['t']
        while True:
            t = time.time() - t0
            if cancelled():
                app.stop()
                return {'stopped_at': t}
            k = next((i for i in range(1, len(path)) if path[i]['t'] >= t), len(path) - 1)
            a, b = path[k - 1], path[k]
            u = 1.0 if t >= end else max(0.0, min(1.0, (t - a['t']) / (b['t'] - a['t'])))
            q = [qa + (qb - qa) * u for qa, qb in zip(a['q'], b['q'])]
            r = app.move(**dict(zip(names, q)))
            if not r.ok: raise RuntimeError(r.message)
            feedback({'progress': min(1.0, t / end) if end else 1.0, 'q': q})
            if t >= end: return {'reached': dict(zip(names, q)), 'seconds': t}
            time.sleep(1 / rate)
    app.actions.advertise(action, follow)
    return action
