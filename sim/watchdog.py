"""watchdog.py — catch "it should move but it doesn't" DURING a run, instead of waiting for a timer.
Every tick (phys_world on_tick, every 100 physics steps) it compares, over the last WINDOW seconds of sim time:
  commanded : how far the servo TARGETS moved (what the brain asked for)
  moved     : how far the module bodies really moved
and flags
  JAMMED : the brain commands motion (> 3 deg of target change) but nothing moves (< 2 mm)      -> stuck against something
  IDLE   : nothing commanded and nothing moving for IDLE_S seconds while a stage is supposed to act -> the brain is waiting
  STUCK  : a joint > 10 deg from its target, not moving, servo at its force limit (e.g. too weak to stand up) -> reported, run goes on
  COLLISION: two modules' bodies touch (not at a connector) with > COLLIDE_N newtons -> picture + reported (28 Oct: Nischay saw W2 hit R)
On a flag it takes a picture (snap.Snapper) and, with abort=True, raises Stalled so the run stops right there.
   W = Watchdog(world, snapper, abort=True); world.on_tick = W.tick;  W.stage = 'dock W1'  (None = idle is expected)"""
import collections, numpy as np

WINDOW, IDLE_S, CMD_DEG, MOVE_MM = 3.0, 8.0, 3.0, 2.0
COLLIDE_N = 3.0          # a module pressing on another (not at a connector) harder than this = a bump (estimate)


class Stalled(Exception):
    pass


class Watchdog:
    def __init__(self, w, snapper=None, abort=True, log=print):
        self.w, self.S, self.abort, self.log = w, snapper, abort, log
        self.hist = collections.deque(); self.stage = None; self.flags = []; self.quiet_since = None
        m = w.m; self.qadr = np.array([m.jnt_qposadr[m.actuator_trnid[a, 0]] for a in w.all_act])   # the real joint angles (incl. lock rotors)

    def collisions(self):
        """contacts between two DIFFERENT modules' bodies with a real force (> COLLIDE_N), excluding locked connector pairs and the
        connector being docked (self.allow: set of body-name prefixes like 'W2_EndA' / 'R_srx0'). A bump into a neighbour = a fault."""
        import mujoco
        m, d = self.w.m, self.w.d; out = {}; f6 = np.zeros(6)
        for i in range(d.ncon):
            c = d.contact[i]; b1, b2 = m.body(m.geom_bodyid[c.geom1]).name, m.body(m.geom_bodyid[c.geom2]).name
            m1, m2 = b1.split('_')[0], b2.split('_')[0]
            if m1 == m2 or 'F' in (m1, m2) or m1 == 'world' or m2 == 'world': continue
            if any(b1.startswith(a) or b2.startswith(a) for a in getattr(self, 'allow', ())): continue
            mujoco.mj_contactForce(m, d, i, f6)
            if abs(f6[0]) > COLLIDE_N: k = tuple(sorted((b1, b2))); out[k] = max(out.get(k, 0.0), float(abs(f6[0])))
        return out

    def tick(self):
        w = self.w; d = w.d; t = float(d.time)
        hits = self.collisions()
        if hits:
            worst = max(hits.items(), key=lambda kv: kv[1])
            if worst[0] != getattr(self, '_last_hit', None) or t - getattr(self, '_last_hit_t', -9) > 1.0:
                self._last_hit, self._last_hit_t = worst[0], t
                self._flag(f'COLLISION in "{self.stage}": {worst[0][0]} hit {worst[0][1]} with {worst[1]:.1f} N', soft=True)
        if self.S: self.S.tick(self.stage or 'idle (expected)')
        pos = d.xpos[w.view_bodies].copy(); tgt = w.tgt.copy(); q = d.qpos[self.qadr].copy()
        self.hist.append((t, pos, tgt, q))
        while self.hist and t - self.hist[0][0] > WINDOW: self.hist.popleft()
        if self.stage is None or t - self.hist[0][0] < WINDOW * 0.9: self.quiet_since = None; return
        t0, p0, g0, q0 = self.hist[0]
        moved = float(np.linalg.norm(pos - p0, axis=1).max()) * 1000
        cmd = np.abs(tgt - g0); turned = np.abs(q - q0)
        # jammed = a joint was told to turn > CMD_DEG and turned < 1/4 of that, and nothing travelled (a rotor turning in place is fine)
        bad = (cmd > np.radians(CMD_DEG)) & (turned < 0.25 * cmd)
        if bad.any() and moved < MOVE_MM:
            k = int(np.argmax(np.where(bad, cmd, 0)))
            return self._flag(f'JAMMED in "{self.stage}": actuator {k} told to turn {np.degrees(cmd[k]):.0f} deg in {WINDOW:.0f} s, turned {np.degrees(turned[k]):.1f} deg, bodies moved {moved:.1f} mm')
        # stuck = a joint far from where it was told to be (> 10 deg), not moving, its servo at its force limit: too weak / blocked
        err = np.abs(tgt - q); sat = np.abs(d.actuator_force[w.all_act]) >= 0.97 * np.abs(w.m.actuator_forcerange[w.all_act, 1])
        stuck = (err > np.radians(10)) & (turned < np.radians(1)) & sat
        if stuck.any() and self.stage != getattr(self, 'stuck_reported', None):
            k = int(np.argmax(np.where(stuck, err, 0))); self.stuck_reported = self.stage
            self._flag(f'STUCK in "{self.stage}": actuator {k} is {np.degrees(err[k]):.0f} deg from its target, not moving, servo at its force limit', soft=True)
        cmd = float(np.degrees(cmd.max()))
        if cmd < 0.5 and moved < MOVE_MM:
            self.quiet_since = self.quiet_since or t0
            if t - self.quiet_since > IDLE_S: return self._flag(f'IDLE in "{self.stage}": nothing commanded, nothing moving for {t - self.quiet_since:.0f} s')
        else: self.quiet_since = None

    def _flag(self, msg, soft=False):
        pic = self.S.shot('WATCHDOG: ' + msg) if self.S else ''
        self.flags.append(dict(t=round(float(self.w.d.time), 1), msg=msg, picture=pic)); self.log('  !! ' + msg + (f' | picture {pic}' if pic else ''))
        self.quiet_since = None; self.hist.clear()
        if self.abort and not soft: raise Stalled(msg)            # STUCK is reported (picture), the run goes on: the brain may still cope
