"""manual.py — the Studio's MANUAL tab: a live physics session you drive by hand (Nischay 30 Oct).

Real physics, always: gravity, contact, friction, magnets, ST3215 servos, random robot, room disturbances (shake, bumps, air,
cardboard play), the MPU-6050s. Nothing is moved by hand-written couplings.
  joints   set servo targets; the servos move at their own speed/acceleration
  lock     the rotor(s) turn (end<->end: BOTH centre rotors, A one way and B the other; end<->side / floor: only the end's rotor)
           and it becomes a lock only if the end is really seated (gap < 0.8 mm, side < 1.5 mm, rotor > 40 deg); else rotors back
  unlock   rotor(s) back, the weld goes, the faces collide again, magnets still pull
  connect  pick two connectors: the modules involved bend so the docking end stands off in front of the other connector
           (pre-shape: least squares over every joint of the locked group, staying on the floor), then the robot's own
           docking brain lines up and goes straight in (phys_dock.dock: blind = encoders only, or with a judge)
The physics runs on its own thread, paced to real time; the Studio pulls the frames (/manual/step).

  py -3.12 manual.py SCENES.json NAME A B     test a connect without the Studio (no pacing), e.g. chain2 M1.A M2.B"""
from paths import tpath
import sys, os, io, math, time, json, queue, threading, contextlib, numpy as np, mujoco
sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
from scipy.optimize import least_squares
import disturb as DIST
from phys_world import PhysWorld, lock_key, docking_of, SPINE_RX, C
from tetro_env2 import RX_TOP, RX_GAP

JN = ['T1', 'B1', 'B2', 'T2', 'B3', 'B4', 'T3']
SESS = {}
HOVER_FAR = 0.022                                    # pre-shape stand-off = the brain's own hover (laptop_controller.STANDOFF): it starts right there


class Abort(Exception):
    pass


# ---------- connectors and locks ----------
def port_ref(name):
    """'M1.A' / 'M2.S1A' / 'F:F0' -> lock-side dict"""
    if name.startswith('F:'): return {'floor': name[2:]}
    m, p = name.split('.'); return {'module': m, 'port': p}


def ref_name(r):
    return ('F:' + r['floor']) if 'floor' in r else f"{r['module']}.{r['port']}"


def canon(a, b):
    """the one lock dict this pair is declared as: b = the docking END; end<->end sorted (both rotors turn anyway)"""
    a, b = (port_ref(a) if isinstance(a, str) else a), (port_ref(b) if isinstance(b, str) else b)
    end = lambda r: 'module' in r and r['port'] in ('A', 'B')
    if not end(b): a, b = b, a
    if not end(b): raise ValueError('a lock needs at least one END connector (never side<->side)')
    if end(a) and (a['module'], a['port']) > (b['module'], b['port']): a, b = b, a
    if 'module' in a and a['module'] == b['module']: raise ValueError("a module cannot lock to itself")
    return {'a': a, 'b': b}


def all_locks(ids, anchors):
    """every lock this world may ever close (a world must know them when it is built)"""
    ends = [f'{m}.{e}' for m in ids for e in 'AB']; out = {}
    for e in ends:
        for an in anchors: L = canon('F:' + an['id'], e); out[lock_key(L)] = L
        for m in ids:
            if m == e.split('.')[0]: continue
            for s in SPINE_RX: L = canon(f'{m}.{s}', e); out[lock_key(L)] = L
            for e2 in 'AB':
                try: L = canon(f'{m}.{e2}', e); out[lock_key(L)] = L
                except ValueError: pass
    return list(out.values())


# ---------- the locked group's kinematics (nominal model, any joint values) ----------
class GroupFK:
    """world poses of every body of a group of locked modules for candidate joint values: each module's own nominal kinematics,
    glued by the locks (the relative pose of two locked bodies is fixed by the design: taken once from the world)"""

    def __init__(self, w, mods, root, locks):
        self.w, self.mods, self.root = w, mods, root; m = w.m
        self.dk = {mid: mujoco.MjData(m) for mid in mods}; self.edges = []
        d = w.d; T = lambda b: (d.xmat[b].reshape(3, 3).copy(), d.xpos[b].copy())
        for lk in locks:
            (dm, de), recv = docking_of(lk)
            rm = recv.split('_')[0]
            if dm in mods and rm in mods:
                b1, b2 = m.body(recv).id, m.body(f'{dm}_End{de}_LockModule').id; (R1, p1), (R2, p2) = T(b1), T(b2)
                self.edges.append((rm, b1, dm, b2, R1.T @ R2, R1.T @ (p2 - p1)))
        rb = m.body(f'{root}_module_frame').id; self.T_root = T(rb)

    def local(self, mid, q):
        m = self.w.m; dk = self.dk[mid]; dk.qpos[:] = m.qpos0; a = self.w.mod[mid]['root']
        dk.qpos[a:a + 7] = [0, 0, 0, 1, 0, 0, 0]; dk.qpos[np.array(self.w.mod[mid]['qa'])] = q; mujoco.mj_kinematics(m, dk); return dk

    def poses(self, qs):
        """{mid: (R_frame, p_frame, dk)}: each module frame in the world + its local kinematics"""
        out = {self.root: (*self.T_root, self.local(self.root, qs[self.root]))}; todo = True
        while todo:
            todo = False
            for (rm, b1, dm, b2, Rr, pr) in self.edges:
                for (k, kb, n, nb, R12, p12) in ((rm, b1, dm, b2, Rr, pr), (dm, b2, rm, b1, Rr.T, -Rr.T @ pr)):
                    if k in out and n not in out:
                        Rk, pk, dkk = out[k]; Rb1 = Rk @ dkk.xmat[kb].reshape(3, 3); pb1 = pk + Rk @ dkk.xpos[kb]
                        Rb2 = Rb1 @ R12; pb2 = pb1 + Rb1 @ p12; dkn = self.local(n, qs[n])
                        Rl, pl = dkn.xmat[nb].reshape(3, 3), dkn.xpos[nb]; Rf = Rb2 @ Rl.T; out[n] = (Rf, pb2 - Rf @ pl, dkn); todo = True
        return out

    @staticmethod
    def body(P, mid, b):
        Rf, pf, dk = P[mid]; return Rf @ dk.xmat[b].reshape(3, 3), pf + Rf @ dk.xpos[b]


def group_of(w, locks, mid):
    g = {mid}; grew = True
    while grew:
        grew = False
        for lk in locks:
            (dm, _), recv = docking_of(lk); rm = recv.split('_')[0]
            if rm in w.ids and dm in w.ids and (dm in g) != (rm in g): g |= {dm, rm}; grew = True
    return g


def preshape(w, locks, dock_mid, dock_end, target_name, log=print):
    """joint targets for every module of the docking module's group so its end stands HOVER_FAR in front of the target,
    pads over gaps, everything kept on/above the floor and near where it is (least squares on the nominal model)"""
    m, d = w.m, w.d; w._refresh_rx(); RX = next(x for x in w.rx if x['name'] == target_name)
    grp = sorted(group_of(w, locks, dock_mid)); floor_locked = [L['b']['module'] for L in locks if 'floor' in L['a'] and L['b']['module'] in grp]
    tgt_mod = RX.get('mod'); same = tgt_mod in grp
    root = floor_locked[0] if floor_locked else (tgt_mod if same else dock_mid)
    G = GroupFK(w, grp, root, locks)
    dt_ = mujoco.MjData(m); tau = np.zeros(m.nv)
    def torque_pct(mid, q):
        """static servo load (% of its limit) of a STANDING module in pose q: gravity through the model (inverse dynamics, at rest)"""
        a = w.mod[mid]['root']; dt_.qpos[:] = m.qpos0; dt_.qpos[a:a + 3] = d.qpos[a:a + 3]; dt_.qpos[a + 3:a + 7] = d.qpos[a + 3:a + 7]
        dt_.qpos[np.array(w.mod[mid]['qa'])] = q; dt_.qvel[:] = 0; mujoco.mj_kinematics(m, dt_); mujoco.mj_comPos(m, dt_); mujoco.mj_rne(m, dt_, 0, tau)
        acts = w.mod[mid]['act']; dofs = [m.jnt_dofadr[m.actuator_trnid[x, 0]] for x in acts]
        return np.abs(tau[dofs]) / np.abs(m.actuator_forcerange[acts, 1])
    q0 = {mid: d.qpos[np.array(w.mod[mid]['qa'])].copy() for mid in grp}
    movable = [mid for mid in grp if mid not in floor_locked or mid == dock_mid]
    lo = np.concatenate([m.jnt_range[[m.actuator_trnid[a, 0] for a in w.mod[mid]['act']], 0] * 0.98 for mid in movable]); hi = -lo
    x0 = np.concatenate([q0[mid] for mid in movable])
    eb = m.body(f'{dock_mid}_End{dock_end}_LockModule').id; tip_loc = m.site_pos[w.mod[dock_mid]['end'][dock_end]['tip']]
    bodies = {mid: [b for b in range(m.nbody) if m.body(b).name.startswith(mid + '_') and m.body_mass[b] > 0.01] for mid in grp}
    P0 = G.poses(q0); z0 = {(mid, b): G.body(P0, mid, b)[1][2] for mid in grp for b in bodies[mid]}
    core = {mid: [b for b in bodies[mid] if 'End' not in m.body(b).name and 'LockRotor' not in m.body(b).name] for mid in grp}   # ends meet by design
    def unpack(x):
        qs = dict(q0); k = 0
        for mid in movable: qs[mid] = x[k:k + 7]; k += 7
        return qs
    def res(x):
        qs = unpack(x); P = G.poses(qs); Re, pe = G.body(P, dock_mid, eb); tip = pe + Re @ tip_loc; n = Re[:, 1] if dock_end == 'B' else -Re[:, 1]
        if same:
            Rt, pt = G.body(P, tgt_mod, RX['bid']); seat, z, Rr = w.rx_frame(RX, Rt, pt)
        else: seat, z, Rr = RX['seat'], RX['z'], RX['R']
        goal = seat + (RX_TOP - RX_GAP + HOVER_FAR) * z
        a = math.atan2(Re[:, 0] @ Rr[:, 1], Re[:, 0] @ Rr[:, 0]) - math.pi / 4; sl = (a + math.pi / 4) % (math.pi / 2) - math.pi / 4
        r = [(tip - goal) * 1000, (n + z) * 60, [sl * 40]]
        fl = []
        for mid in grp:
            for b in bodies[mid]:
                zb = G.body(P, mid, b)[1][2]; z_ref = z0[(mid, b)]
                fl.append(max(0.0, min(z_ref, 0.035) - zb) * 3000)                   # never into the floor
                if not floor_locked: fl.append(max(0.0, zb - z_ref - 0.02) * 300)     # a lying group stays on the floor (lifting costs torque)
        for mid in movable:                                                         # a standing module: servos must be able to HOLD the pose (< 60 %)
            if mid in floor_locked: r.append(np.maximum(0.0, torque_pct(mid, qs[mid]) - 0.6) * 400)
        for i_, ma in enumerate(grp):                                                # different modules keep apart (30 Oct: ring from the cobra drove M2 into M1)
            for mb in grp[i_ + 1:]:
                for ba in core[ma]:
                    pa = G.body(P, ma, ba)[1]
                    for bb in core[mb]: fl.append(max(0.0, 0.08 - float(np.linalg.norm(pa - G.body(P, mb, bb)[1]))) * 2000)
        r.append(fl); r.append((x - x0) * 2.0)                                       # stay near the current pose
        return np.concatenate([np.ravel(v) for v in r])
    now = float(np.linalg.norm(res(x0)[:3]))                                         # where it is now (encoders, nominal model)
    best = None
    seeds = [x0]
    for sg in (1, -1):                                                               # out-of-the-box starts: bent both ways
        s_ = x0.copy()
        for i, mid in enumerate(movable):
            for k in (1, 2, 4, 5): s_[i * 7 + k] = np.clip(s_[i * 7 + k] + sg * 0.6, lo[i * 7 + k], hi[i * 7 + k])
        seeds.append(s_)
    for s_ in seeds:
        sol = least_squares(res, np.clip(s_, lo + 1e-6, hi - 1e-6), bounds=(lo, hi), method='trf', max_nfev=120, diff_step=1e-3)
        r = sol.fun; err = float(np.linalg.norm(r[:3])); ang = float(np.linalg.norm(r[3:6]) / 60)
        if best is None or err + 300 * ang < best[0]: best = (err + 300 * ang, sol.x, err, ang)
    qs = unpack(best[1]); log(f'  pre-shape: {"+".join(movable)} ({len(movable) * 7} joints): now {now:.0f} mm from the stand-off, plan {best[2]:.1f} mm, axis {math.degrees(best[3]):.1f} deg (nominal model)')
    return {mid: qs[mid] for mid in movable}, best[2], now


# ---------- the live session ----------
class Manual:
    def __init__(self, scene, seed=1, randomize=True, disturb=True, fps=25, judge='off', pace=True, log=None):
        self.anchors = list(scene.get('anchors', [])); ids = [mm['id'] for mm in scene['modules']]
        init = [canon(l['a'], l['b']) for l in scene.get('locks', [])]
        old = DIST.ON; DIST.ON = bool(disturb)
        try:
            self.w = w = PhysWorld(ids, self.anchors, randomize=randomize, seed=seed, locks=all_locks(ids, self.anchors) + init)
        finally: DIST.ON = old
        w.place(dict(scene, locks=init)); self.cur = list(init); self.seed, self.judge, self.pace, self.disturb = seed, judge, pace, disturb
        self.traj, self.marks, self.paused, self.replaying, self._last_j = [], [], False, False, 0.0   # what the robot did: for step back / home
        self.fps = fps; self.frame0 = w.nominal_poses; w.rec = {'dt': 1.0 / fps, 'last': -1.0, 'frames': []}
        self.q = queue.Queue(); self.job = None; self.lines = []; self.alive = True; self.abort = False; self._log = log
        self.wall0, self.sim0 = time.time(), float(w.d.time); w.on_tick = self._tick
        self._rec()
        self.th = threading.Thread(target=self._loop, daemon=True)
        if pace: self.th.start()

    def log(self, s):
        self.lines.append(f'{self.w.d.time:6.1f}s {s}'); del self.lines[:-200]
        if self._log: self._log(s)

    def _rec(self):
        """remember the servo commands + locks whenever they change (every 0.1 s of physics): played backwards for step back / home"""
        if self.replaying: return
        tg = self.w.tgt.copy(); lk = frozenset(lock_key(L) for L in self.cur)
        if self.traj and lk == self.traj[-1][2] and float(np.max(np.abs(tg - self.traj[-1][1]))) < math.radians(0.3): return
        self.traj.append((float(self.w.d.time), tg, lk)); del self.traj[:-20000]

    def mark(self, label):
        self._rec(); self.marks.append((len(self.traj) - 1, label))

    def _tick(self):
        if self.abort: self.abort = False; raise Abort()
        self._rec()
        while self.paused and not self.abort and self.alive: time.sleep(0.05); self.wall0 = time.time() - (float(self.w.d.time) - self.sim0)
        if self.pace:
            ahead = (float(self.w.d.time) - self.sim0) - (time.time() - self.wall0)
            if ahead > 0: time.sleep(min(ahead, 0.2))
            elif ahead < -1.0: self.wall0 = time.time() - (float(self.w.d.time) - self.sim0)   # fell behind (slow PC): don't race to catch up

    def _loop(self):
        while self.alive:
            try: cmd = self.q.get_nowait()
            except queue.Empty: cmd = None
            if not cmd and self.paused: time.sleep(0.05); continue
            try:
                if cmd: self.job = cmd['kind']; self.do(cmd)
                else: self.w.run(0.06)
            except Abort: self.log('job stopped')
            except Exception as e: self.log(f'ERROR {type(e).__name__}: {e}')
            finally:
                if cmd: self.job = None

    # ---- commands ----
    def joints(self, mid, js):
        if time.time() - self._last_j > 1.5: self.mark(f'joints {mid}')       # a burst of slider moves = one step
        self._last_j = time.time(); i = self.w.ids.index(mid)
        for j, deg in js.items(): self.w.tgt[i * 9 + JN.index(j)] = math.radians(float(deg))

    def do(self, cmd):
        k = cmd['kind']
        if k in ('lock', 'unlock', 'connect', 'skill'): self.mark(f"{k} {cmd.get('name') or cmd.get('a', '') + ' ' + cmd.get('b', '')}")
        if k == 'back': return self.replay(self.marks[-1][0] if self.marks else 0, 'step back')
        if k == 'home': return self.replay(0, 'home (the whole session backwards)')
        if k == 'save': return self.save_slot()
        if k == 'restore': return self.restore_slot()
        if k == 'lock': self.lock(cmd['a'], cmd['b'])
        elif k == 'unlock': self.unlock(cmd['a'], cmd['b'])
        elif k == 'connect': self.connect(cmd['a'], cmd['b'])
        elif k == 'skill': self.skill(cmd['name'])

    def replay(self, to, label):
        """play what the robot did BACKWARDS down to traj[to], at the speed it was done: locks closed on the way open again,
        locks opened are closed again (lock if seated, else the docking brain connects them). Real physics all the way."""
        w = self.w
        if to >= len(self.traj) - 1: return self.log(f'{label}: nothing to undo')
        self.log(f'{label}: playing {len(self.traj) - 1 - to} recorded commands backwards'); self.replaying = True
        try:
            for i in range(len(self.traj) - 1, to - 1, -1):
                t_i, tg, lk = self.traj[i]; now = {lock_key(L) for L in self.cur}
                for k in now - lk: a, b = k.split('|'); self.unlock(a, b)
                for k in lk - now:
                    a, b = k.split('|')
                    if not self.lock(a, b): self.connect(a, b)
                for m_ in range(len(w.ids)): w.tgt[m_ * 9:m_ * 9 + 7] = tg[m_ * 9:m_ * 9 + 7]
                w.run(min(0.6, max(0.06, (t_i - self.traj[i - 1][0]) if i > to else 0.3)))
            w.run(1.0)
        finally:
            self.replaying = False
        self.traj = self.traj[:to + 1]; self.marks = [m for m in self.marks if m[0] < to]
        self.log(f'{label}: done, locks {[lock_key(L) for L in self.cur]}')

    def save_slot(self):
        self.slot = os.path.join(tpath('logs/ckpt'), f'manual_slot_{id(self)}.pkl'); self.w.save(self.slot, extra=dict(cur=self.cur))
        self.log(f'state saved (t {self.w.d.time:.1f} s, locks {[lock_key(L) for L in self.cur]})')

    def restore_slot(self):
        if not getattr(self, 'slot', None): return self.log('nothing saved yet')
        old = DIST.ON; DIST.ON = bool(self.disturb)
        try: w, ex = PhysWorld.load(self.slot)
        finally: DIST.ON = old
        w.rec = {'dt': 1.0 / self.fps, 'last': -1.0, 'frames': []}; w.on_tick = self._tick
        self.w = w; self.cur = list(ex['cur']); self.traj, self.marks = [], []; self._rec()
        self.wall0, self.sim0 = time.time(), float(w.d.time)
        self.log(f'state restored (t {w.d.time:.1f} s, locks {[lock_key(L) for L in self.cur]})')

    def skill(self, name):
        """become a shape with the robot's OWN skills, live in real physics (floor_skills.py: the blind brain - encoders + IMU)"""
        import floor_skills as FS
        w = self.w; n = len(w.ids)
        if name == 'straight':
            for i in range(n): w.tgt[i * 9:i * 9 + 7] = 0.0
            self.log('straighten: every joint to 0 (the servos move at their own speed)'); w.run(3.0); return
        if name == 'ring':                                            # the ring is made from a chain lying flat: go home first if it isn't
            bent = max(float(np.max(np.abs(w.d.qpos[np.array(w.mod[mid]['qa'])]))) for mid in w.ids) > math.radians(15)
            if bent and len(self.traj) > 1: self.replay(0, 'ring starts from lying flat: home first')
            elif bent: self.log('ring: the chain is not lying flat and there is nothing to play back - Reset first'); return
            return self.connect('M1.A', f'M{n}.B')
        B = FS.Brain(w, self.seed, log=self.log)
        r = FS.cobra(B, 'M1', 'M2', log=self.log) if name == 'cobra' else FS.twohead(B, log=self.log)
        self.log(f"{name}: {'DONE' if r.get('ok') else 'NOT reached'} (scored by physics truth) {json.dumps({k: v for k, v in r.items() if k not in ('servo',)})[:220]}")

    def lock(self, a, b, settle=2.5):
        w = self.w; L = canon(a, b); key = lock_key(L)
        if key in w.engaged: return self.log(f'{key} is already locked')
        (dm, de), _ = docking_of(L); rx = ref_name(L['a'])
        w.set_locks(self.cur + [L])                                   # the rotor(s) turn (end<->end: both)
        r = None
        for _ in range(int(settle / 0.06)):
            w.run(0.06); r = w.end_vs(dm, de, rx)
            if abs(r['axial_mm']) < 0.8 and r['radial_mm'] < 1.5 and r['lock_deg'] > 40: break
        if r and abs(r['axial_mm']) < 0.8 and r['radial_mm'] < 1.5 and r['lock_deg'] > 40:
            w.engage(L); self.cur.append(L); self.log(f'LOCKED {key} (gap {r["axial_mm"]:.2f} mm, side {r["radial_mm"]:.2f} mm, rotor {r["lock_deg"]:.0f} deg)'); return True
        w.set_locks(self.cur); self.log(f'NOT locked {key}: not seated (gap {r["axial_mm"]:.1f} mm, side {r["radial_mm"]:.1f} mm, rotor {r["lock_deg"]:.0f} deg) - rotors back'); return False

    def unlock(self, a, b):
        w = self.w; L = canon(a, b); key = lock_key(L)
        if key not in w.engaged: return self.log(f'{key} is not locked')
        w.release(L); self.cur = [x for x in self.cur if lock_key(x) != key]; w.set_locks(self.cur); self.log(f'unlocked {key} (rotors back)')

    def connect(self, a, b):
        """pick who docks, pre-shape the group, then the docking brain does the last part and the lock"""
        from phys_dock import PhysDockEnv, dock
        w = self.w; L = canon(a, b); key = lock_key(L)
        cands = [L['b']] + ([L['a']] if 'module' in L['a'] and L['a']['port'] in ('A', 'B') else [])
        base = None
        for e in cands:                                               # the docking end's module must hold on with its OTHER end
            other = 'A' if e['port'] == 'B' else 'B'
            for x in self.cur:
                for me, oth in ((x['b'], x['a']), (x['a'], x['b'])):
                    if me.get('module') == e['module'] and me.get('port') == other: base = (e, other, ref_name(oth)); break
                if base: break
            if base: break
        if not base: return self.log(f'connect {a} + {b}: neither end can dock - its module must hold on with its other end (floor receiver or another module)')
        e, base_end, base_rx = base; target = ref_name(L['a'] if e is L['b'] else L['b'])
        dm, de = e['module'], e['port']; self.log(f'connect: {dm}.{de} docks into {target} (its base: End {base_end} in {base_rx})')
        for attempt in range(7):                                      # move, measure (encoders), re-plan from where friction left it, move again
            qs, err, now = preshape(w, self.cur, dm, de, target, log=self.log)
            if now < 12 or attempt == 6: break
            t0 = {mid: w.tgt[w.ids.index(mid) * 9:w.ids.index(mid) * 9 + 7].copy() for mid in qs}
            standing = any('floor' in x['a'] for x in self.cur if x['b']['module'] in qs)
            if attempt == 0 and standing:                             # standing: straighten up and twist to face the target up in the air, THEN bend
                for s in range(1, 16):                                # (30 Oct: bending + twisting together put the end on the floor, T1 dragged it, stuck 26 deg)
                    for mid, q in qs.items():
                        i = w.ids.index(mid); mid_q = q.copy(); mid_q[[1, 2, 4, 5]] = 0.0
                        w.tgt[i * 9:i * 9 + 7] = t0[mid] + (mid_q - t0[mid]) * s / 15
                    w.run(0.16)
                t0 = {mid: w.tgt[w.ids.index(mid) * 9:w.ids.index(mid) * 9 + 7].copy() for mid in qs}
            n = 25 if attempt == 0 else 12
            for s in range(1, n + 1):                                 # coordinated, slow: the servos and the floor friction decide
                for mid, q in qs.items(): i = w.ids.index(mid); w.tgt[i * 9:i * 9 + 7] = t0[mid] + (q - t0[mid]) * s / n
                w.run(0.16)
            w.run(1.0)
            for r in range(4):                                        # the servos stop a little short under load: push each command past by its shortfall
                for mid, q in qs.items():
                    i = w.ids.index(mid); e_ = q - w.d.qpos[np.array(w.mod[mid]['qa'])]
                    w.tgt[i * 9:i * 9 + 7] = np.clip(w.tgt[i * 9:i * 9 + 7] + 0.8 * e_, q - 0.17, q + 0.17)
                w.run(0.8)
            lag = max(float(np.max(np.abs(w.d.qpos[np.array(w.mod[mid]['qa'])] - q))) for mid, q in qs.items())
            self.log(f'  pre-shape move {attempt + 1}: joints within {math.degrees(lag):.1f} deg of the plan' + (' (friction / a stop holds them back)' if lag > math.radians(10) else ''))
            for mid, q in qs.items():
                qm = w.d.qpos[np.array(w.mod[mid]['qa'])]; bad = [f'{JN[k]} plan {math.degrees(q[k]):.0f} is {math.degrees(qm[k]):.0f}' for k in range(7) if abs(q[k] - qm[k]) > math.radians(8)]
                if bad: self.log(f'    {mid} short: ' + ', '.join(bad))
        env = PhysDockEnv(w, dm, seed=self.seed * 7919 + len(self.lines), randomize=True)
        judge = {'off': 'touch', 'truth': True}.get(self.judge, 'touch')   # blind = feel the hole + spiral search
        lying = not any('floor' in x['a'] for x in self.cur if x['b']['module'] in group_of(w, self.cur, dm))   # nothing of its group stands in a floor receiver
        if lying: self.log('  the docking module lies on the floor: brain estimate without hanging-arm sag')
        bl = []; ok, info = dock(env, base_end, base_rx, target, judge=judge, log=bl.append, sag=not lying, hover_far=0.0 if lying else None)
        info['log'] = bl + list(info.get('log', []))
        Lk = canon(f'{dm}.{de}', target)
        if ok: w.engage(Lk); self.cur.append(Lk); w.set_locks(self.cur)
        else: w.set_locks(self.cur)
        for l in info.get('log', [])[-6:]: self.log('    brain: ' + l.strip()[:140])
        self.log(f"  {'LOCKED' if ok else 'NOT locked'} {lock_key(Lk)}: gap {info['axial_mm']} mm, side {info['radial_mm']} mm, {info['seconds']} s" + (f", touching {info['touching']}" if info.get('touching') else ''))
        return ok

    # ---- what the Studio shows ----
    def ports(self):
        """every connector in Studio coordinates (metres): where, which way it faces, locked to what"""
        w = self.w; w._refresh_rx(); held = {}
        for L in self.cur: held.setdefault(ref_name(L['a']), ref_name(L['b'])); held.setdefault(ref_name(L['b']), ref_name(L['a']))
        out = []
        for x in w.rx:
            p = C.T @ (x['seat'] + (RX_TOP - RX_GAP) * x['z']); n = C.T @ x['z']
            out.append(dict(id=x['name'], kind=x['kind'], p=[round(float(v), 4) for v in p], n=[round(float(v), 3) for v in n], locked=held.get(x['name'])))
        return out

    def state(self):
        w = self.w; d, m = w.d, w.m; mods = {}
        for mid in w.ids:
            qa = np.array(w.mod[mid]['qa']); a = w.mod[mid]['act']; i = w.ids.index(mid)
            mods[mid] = dict(q=[round(math.degrees(v), 1) for v in d.qpos[qa]], target=[round(math.degrees(v), 1) for v in w.tgt[i * 9:i * 9 + 7]],
                             load=[round(float(abs(d.actuator_force[x]) / abs(m.actuator_forcerange[x, 1])) * 100) for x in a])
        return dict(t=round(float(d.time), 2), job=self.job, queued=self.q.qsize(), paused=self.paused, steps=len(self.marks), saved=bool(getattr(self, 'slot', None)), locks=[lock_key(L) for L in self.cur], modules=mods, log=self.lines[-12:])

    def frames(self):
        rec = self.w.rec; fr = rec['frames']; rec['frames'] = []; return fr


def start(scene, **kw):
    import uuid
    S = Manual(scene, **kw); sid = uuid.uuid4().hex[:12]; SESS[sid] = S
    while len(SESS) > 3:
        old = SESS.pop(next(iter(SESS))); old.alive = False
    from phys_world import receivers_of
    return dict(id=sid, bodies=S.w.view_names, frame0=S.frame0, fps=S.fps, receivers=receivers_of(S.w, scene), ports=S.ports(), state=S.state())


def step(sid, wait=0.5):
    S = SESS.get(sid)
    if S is None: return dict(error='no such manual session (service restarted?)')
    time.sleep(max(0.0, min(2.0, float(wait))))
    return dict(frames=S.frames(), t=round(float(S.w.d.time), 3), ports=S.ports(), state=S.state(), finite=bool(np.isfinite(S.w.d.qpos).all()))


def command(sid, cmd):
    S = SESS.get(sid)
    if S is None: return dict(error='no such manual session')
    k = cmd.get('kind')
    if k == 'joints': S.joints(cmd['module'], cmd['joints']); return dict(ok=True)
    if k == 'stop': S.abort = True; return dict(ok=True)
    if k == 'close': S.alive = False; SESS.pop(sid, None); return dict(ok=True)
    if k in ('skill', 'back', 'home', 'save', 'restore'): S.q.put(cmd); return dict(ok=True, queued=S.q.qsize())
    if k == 'pause': S.paused = bool(cmd.get('on', True)); return dict(ok=True, paused=S.paused)
    if k in ('lock', 'unlock', 'connect'):
        try: canon(cmd['a'], cmd['b'])
        except ValueError as e: return dict(ok=False, error=str(e))
        S.q.put(cmd); return dict(ok=True, queued=S.q.qsize())
    return dict(ok=False, error=f'unknown command {k}')


if __name__ == '__main__':
    scenes = json.load(open(sys.argv[1])); sc = dict(scenes[sys.argv[2]]); a, b = sys.argv[3], sys.argv[4]
    if os.environ.get('NO_ANCHORS', '1') == '1' and not any('floor' in l['a'] for l in sc['locks']): sc['anchors'] = []
    from snap import Snapper
    t0 = time.time(); S = Manual(sc, seed=int(os.environ.get('SEED', '1')), pace=False, judge=os.environ.get('JUDGE', 'off'), log=print)
    Sn = Snapper(S.w, tpath('logs/snaps'), f'manual_{sys.argv[2]}_{a}_{b}'.replace('.', '').replace(':', ''))
    S.w.run(2.0); print('picture', Sn.shot('start'))
    S.connect(a, b); S.w.run(3.0)
    print('picture', Sn.shot(f'connect {a} + {b}: locks {[lock_key(L) for L in S.cur]}'))
    print(f'wall {time.time() - t0:.0f} s')
