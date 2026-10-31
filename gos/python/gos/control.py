"""Controllers, like ros2_control. Each drives whatever app.move drives: the simulation and, when attached and armed,
the real robot.

- joint_trajectory_controller: follows timed poses, as an action.
- forward_command_controller: positions from a topic, applied as they arrive (ros2_controllers' position controller).
- joint_state_broadcaster: publishes JointState at a fixed rate.
- ControllerManager: loads them by name and switches them on and off while running; two active controllers may not
  drive the same joint.

The servos take positions only, so there are no velocity or effort controllers: the real robot could not follow them.
"""
import threading, time


def joint_state_broadcaster(app, topic='/joint_states', rate=50):
    """Publish every joint's position as a JointState, rate times a second, until the returned stop() is called."""
    pub = app.topic(topic, type='JointState')
    stop = threading.Event()

    def loop():
        while not stop.is_set():
            j = app.robot.joints()
            pub.publish({'header': {'stamp': float(app.now()), 'frame_id': ''}, 'name': list(j), 'position': list(j.values()), 'velocity': [], 'effort': []})
            stop.wait(1 / rate)
    threading.Thread(target=loop, daemon=True).start()
    return stop.set


def forward_command_controller(app, names, topic='/position_commands', active=lambda: True):
    """Each {"data": [...]} on the topic (as std_msgs/Float64MultiArray) sets these joints, in this order.
    A message of the wrong length is refused and reported on /diagnostics rather than half-applied."""
    names = list(names)
    unknown = [n for n in names if n not in app.robot.joints()]
    if unknown: raise ValueError(f'No joints {", ".join(unknown)}. Joints: {", ".join(app.robot.joints())}.')
    diag = app.topic('/diagnostics')

    def on(msg):
        if not active(): return
        data = msg.get('data') if isinstance(msg, dict) else None
        if not isinstance(data, list) or len(data) != len(names):
            diag.publish({'level': 'error', 'name': topic, 'message': f'Expected {{"data": [{len(names)} numbers]}} for {", ".join(names)}; got {msg!r}.'})
            return
        r = app.move(**dict(zip(names, data)))
        if not r.ok: diag.publish({'level': 'error', 'name': topic, 'message': r.message})
    return app.topic(topic).subscribe(on)


def joint_trajectory_controller(app, action='/arm/follow_joint_trajectory', rate=50, active=lambda: True):
    """Goal: {"names": [...], "points": [{"q": [...], "t": seconds}, ...]} with t rising from 0.
    Feedback: progress 0..1 and the commanded pose. Cancelling stops at the current pose (and stops the real robot)."""
    def follow(goal, feedback, cancelled):
        if not active(): raise ValueError(f'{action} is switched off. Switch it on with the controller manager first.')
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
            if cancelled() or not active():
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


class ControllerManager:
    """Controllers by name, switched on and off while running, like ros2_control's controller manager. Also offered as
    services /controller_manager/list and /controller_manager/switch ({"on": [...], "off": [...]}) for other programs."""

    def __init__(self, app, namespace='/controller_manager'):
        self.app, self.c = app, {}
        app.services.advertise(f'{namespace}/list', lambda r: self.list())
        app.services.advertise(f'{namespace}/switch', lambda r: self.switch(on=(r or {}).get('on', ()), off=(r or {}).get('off', ())))

    def add(self, name, kind, joints=(), **options):
        """kind: 'trajectory' (an action), 'position' (a topic) or 'broadcaster'. Added switched off."""
        if name in self.c: raise ValueError(f'A controller named {name} exists already.')
        e = {'name': name, 'kind': kind, 'joints': list(joints), 'active': False, 'stop': None}
        on = lambda: e['active']
        if kind == 'trajectory': joint_trajectory_controller(self.app, options.get('action', f'/{name}/follow_joint_trajectory'), active=on)
        elif kind == 'position': forward_command_controller(self.app, joints, options.get('topic', f'/{name}/commands'), active=on)
        elif kind != 'broadcaster': raise ValueError(f'No controller kind "{kind}". Kinds: trajectory, position, broadcaster.')
        e['options'] = options
        self.c[name] = e
        return name

    def switch(self, on=(), off=()):
        """Switch some off, then some on, as one step: nothing changes if any name is unknown or two would drive one joint."""
        on, off = list(on), list(off)
        unknown = [n for n in on + off if n not in self.c]
        if unknown: raise ValueError(f'No controller {", ".join(unknown)}. Controllers: {", ".join(self.c) or "none"}.')
        after = {n for n, e in self.c.items() if e['active'] and n not in off} | set(on)
        owner = {}
        for n in sorted(after):
            for j in self.c[n]['joints'] if self.c[n]['kind'] != 'broadcaster' else []:
                if j in owner: raise ValueError(f'{n} and {owner[j]} would both drive {j}. Switch {owner[j]} off in the same call.')
                owner[j] = n
        for n in off:
            e = self.c[n]; e['active'] = False
            if e['stop']: e['stop'](); e['stop'] = None
        for n in on:
            e = self.c[n]
            if e['active']: continue
            e['active'] = True
            if e['kind'] == 'broadcaster': e['stop'] = joint_state_broadcaster(self.app, e['options'].get('topic', '/joint_states'), e['options'].get('rate', 50))
        return self.list()

    def list(self):
        return [{k: e[k] for k in ('name', 'kind', 'joints', 'active')} for e in self.c.values()]
