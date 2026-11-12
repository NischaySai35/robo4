"""floor_skills.py — floor-chain skills run by a BLIND brain: it decides only from what the real robot has
(joint encoders, the MPU-6050 on each module's Spine2, the nominal model). Physics truth is used only to score.

  Brain(world)            sensing: encoders (noise + 4096 steps), IMU tilt filter per module, 'up' in every body
  .lift_sign(mid, j, free_end)   +1/-1: which way joint j must turn to RAISE the free side of the module (0: its axis is vertical)
  .align(mid, twist, want)       turn a twist so the module's bends are vertical (spread a footprint) or horizontal (lift)
  skills: cobra(lifter, base)    one module stands up on the other (tip first, pivot rolled back joint by joint, base curled into a C)
          twohead()              3-module chain: the middle one curls into a C, both outer ones stand up

  py -3.12 floor_skills.py CKPT SKILL ARGS... OUT.pkl      e.g.  floor_skills.py fc_chain2_1.pkl cobra M1 M2 out.pkl"""
from paths import tpath
import sys, os, math, json, time, numpy as np, mujoco; sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
from phys_world import PhysWorld, CAD_COLLIDE
from imu import MPU6050, Tilt
from floor_chain import servo_load

JN = ['T1', 'B1', 'B2', 'T2', 'B3', 'B4', 'T3']; DT = 0.06; ENC = 0.001534


class Brain:
    def __init__(self, w, seed=1, log=print, snap=None):
        self.w, self.log, self.snap = w, log, snap; self.rng = np.random.default_rng(seed + 101); m = w.m
        self.tilt = {mid: Tilt(MPU6050(w, mid, self.rng)) for mid in w.ids}
        self.dk = {mid: mujoco.MjData(m) for mid in w.ids}
        self.qa = {mid: np.array(w.mod[mid]['qa']) for mid in w.ids}
        self.jid = {mid: [int(m.actuator_trnid[a, 0]) for a in w.mod[mid]['act']] for mid in w.ids}
        self.spine2 = {mid: m.body(f'{mid}_Spine2_B3B4').id for mid in w.ids}
        self.cmd = {mid: w.tgt[w.ids.index(mid) * 9:w.ids.index(mid) * 9 + 7].copy() for mid in w.ids}

    # ---------- sensing (what the robot really has) ----------
    def q(self, mid):
        return np.round((self.w.d.qpos[self.qa[mid]] + self.rng.normal(0, 0.0015, 7)) / ENC) * ENC

    def step(self, n=1):
        for _ in range(n):
            self.w.run(DT)
            for t in self.tilt.values(): t.update(DT)

    def model(self, mid):
        """nominal kinematics of module mid at its encoder readings + 'up' in that model frame (from its IMU)"""
        m = self.w.m; dk = self.dk[mid]; dk.qpos[:] = m.qpos0; dk.qpos[self.qa[mid]] = self.q(mid); mujoco.mj_kinematics(m, dk); mujoco.mj_comPos(m, dk)
        up = dk.xmat[self.tilt[mid].imu.body].reshape(3, 3) @ self.tilt[mid].up_spine
        return dk, up

    def _side(self, mid, j, free_end):
        """bodies on the FREE side of joint j (toward free_end), and whether that side is the joint's child subtree"""
        m = self.w.m; jb = m.jnt_bodyid[self.jid[mid][j]]
        sub = {b for b in range(m.nbody) if self._under(b, jb)}
        mods = {b for b in range(m.nbody) if m.body(b).name.startswith(mid + '_')}
        child_has_B = m.body(f'{mid}_EndB_LockModule').id in sub
        child_is_free = child_has_B == (free_end == 'B')
        return (sub if child_is_free else mods - sub), child_is_free

    def _under(self, b, root):
        m = self.w.m
        while b > 0:
            if b == root: return True
            b = m.body_parentid[b]
        return False

    def lift_sign(self, mid, j, free_end):
        """+1 / -1: the joint direction that raises the free side's centre of mass; 0 if the joint axis is (nearly) vertical"""
        dk, up = self.model(mid); m = self.w.m; jj = self.jid[mid][j]
        bodies, child_free = self._side(mid, j, free_end)
        ms = np.array([m.body_mass[b] for b in bodies]); com = (np.array([dk.xipos[b] for b in bodies]) * ms[:, None]).sum(0) / ms.sum()
        a = dk.xaxis[jj]; r = com - dk.xanchor[jj]; v = float(np.cross(a, r) @ up) * (1 if child_free else -1)
        return 0 if abs(a @ up) > 0.8 else (1 if v > 0 else -1)

    def bend_vertical(self, mid):
        dk, up = self.model(mid)
        return float(np.mean([abs(dk.xaxis[self.jid[mid][k]] @ up) for k in (1, 2, 4, 5)]))

    def roll(self, mid):
        """the module's roll about its long axis, from its IMU (Spine2 frame: x = bend axis, y = long axis)"""
        u = self.tilt[mid].up_spine; return math.degrees(math.atan2(u[0], u[2]))

    # ---------- acting ----------
    def move(self, mid, targets, seconds, steps=1):
        """targets {joint: rad}: go there in `steps` equal increments over `seconds` (the servos do the rest)"""
        k0 = self.cmd[mid].copy(); i = self.w.ids.index(mid)
        for s in range(1, steps + 1):
            for jn, v in targets.items(): k = JN.index(jn); self.cmd[mid][k] = k0[k] + (v - k0[k]) * s / steps
            self.w.tgt[i * 9:i * 9 + 7] = self.cmd[mid]; self.step(max(1, int(seconds / steps / DT)))

    def align(self, mid, twist, want='vertical'):
        """turn a twist joint so the module's bends end up VERTICAL (they swing sideways: footprints) or HORIZONTAL (they lift).
        The part beyond the twist turns; the brain re-measures and corrects once."""
        for it in range(2):
            dk, up = self.model(mid); t = dk.xaxis[self.jid[mid][JN.index(twist)]]; best = None
            for deg in range(-90, 91, 2):
                th = math.radians(deg); K = np.array([[0, -t[2], t[1]], [t[2], 0, -t[0]], [-t[1], t[0], 0]]); Rr = np.eye(3) + math.sin(th) * K + (1 - math.cos(th)) * K @ K
                v = np.mean([abs((Rr @ dk.xaxis[self.jid[mid][k]]) @ up) for k in (1, 2, 4, 5)]); sc = v if want == 'vertical' else -v
                if best is None or sc > best[0]: best = (sc, th, v)
            self.log(f'  align {mid}.{twist} ({want}): bends vertical {self.bend_vertical(mid):.2f} -> turn {math.degrees(best[1]):+.0f} deg (predicts {best[2]:.2f})')
            self.move(mid, {twist: self.cmd[mid][JN.index(twist)] + best[1]}, 2.5)
        return self.bend_vertical(mid)


def tip_first_order(free_end):
    """bend joints from the free tip back to the junction: (tip joint, then each pivot)"""
    return ['B2', 'B3', 'B4'] if free_end == 'A' else ['B3', 'B2', 'B1']


UP90 = math.radians(88)


def lift_signs(B, lifter, free_end, log):
    order = tip_first_order(free_end); s = {j: B.lift_sign(lifter, JN.index(j), free_end) for j in order}
    log(f'  lift signs of {lifter} (tip first) {s}'); return order, s


def footprint(B, base, foot, log):
    """curl the base on the floor (its bends must be vertical); the encoders check it really formed, else curl the other way"""
    for attempt in range(2):
        B.move(base, foot, 3.0)
        q = B.q(base); miss = max(abs(q[JN.index(k)] - v) for k, v in foot.items())
        if miss < math.radians(12): return foot
        log(f'  footprint did not form ({math.degrees(miss):.0f} deg off by the encoders: blocked) -> straighten, curl the other way')
        B.move(base, {k: 0.0 for k in foot}, 2.0); foot = {k: -v for k, v in foot.items()}
    return foot


def rise(B, lifter, order, s, base, roll0, log):
    """roll the pivot back from the tip toward the junction, 10 small coordinated steps per joint. Stops (and holds the last
    step that held) when the pivot servo cannot follow or the base starts to tip. Returns None (all the way) or where it stopped."""
    for a, b in zip(order[:-1], order[1:]):
        for k in range(1, 11):
            B.move(lifter, {b: s[b] * UP90 * k / 10, a: s[a] * UP90 * (1 - k / 10)}, 0.55)
            lag = abs(B.q(lifter)[JN.index(b)] - B.cmd[lifter][JN.index(b)])
            if lag > math.radians(15):                                            # the pivot servo cannot follow (encoder far behind): too weak here
                B.step(int(1.0 / DT)); lag = abs(B.q(lifter)[JN.index(b)] - B.cmd[lifter][JN.index(b)])
            dr = abs(((B.roll(base) - roll0) + 180) % 360 - 180)
            if lag > math.radians(15) or dr > float(os.environ.get('TIP_LIMIT', '40' if CAD_COLLIDE else '12')):
                why = ('cannot follow (%.0f deg behind)' % math.degrees(lag)) if lag > math.radians(15) else ('base tipping (%.0f deg)' % dr)
                log(f'  {lifter}.{b}: {why} at {k}/10 -> back to the last step that held, stay there')
                B.move(lifter, {b: s[b] * UP90 * (k - 1) / 10, a: s[a] * UP90 * (1 - (k - 1) / 10)}, 1.0); return f'{a}->{b} {k - 1}/10'
    return None


def lean_back(B, lifter, order, s):
    lean = math.radians(float(os.environ.get('LEAN', '15')))                      # lean the risen module back over the base (physics chose 15)
    if lean: B.move(lifter, {order[-2]: s[order[-2]] * lean}, 1.5, steps=5)


def score(w, lifter, free_end):
    """truth (scoring only): free tip height and how far the free end is from pointing straight up"""
    fe = w.m.body(f'{lifter}_End{free_end}_LockModule').id; tip_z = float(w.d.site_xpos[w.mod[lifter]['end'][free_end]['tip']][2]) * 1000
    ax = w.d.xmat[fe].reshape(3, 3)[:, 1] * (-1 if free_end == 'A' else 1)
    return dict(ok=tip_z > 480, tip_mm=round(tip_z), tilt_deg=round(math.degrees(math.acos(np.clip(ax[2], -1, 1))), 1))


def _foot():
    dflt = 'B1:-40,B2:-40,B3:-40,B4:-40' if CAD_COLLIDE else 'B1:-60,B2:-60,B3:-60,B4:-60'   # real CAD shapes: the tight C tips (31 Oct: 0/8 vs 8/8)
    return {k: math.radians(float(v)) for k, v in (x.split(':') for x in os.environ.get('FOOT', dflt).split(','))}


def _roll_change(B, mid, roll0):
    return round(abs(((B.roll(mid) - roll0) + 180) % 360 - 180), 1)


def cobra(B, lifter, base, free_end='A', junction_twist='T1', log=print):
    """the lifter (free end `free_end`) stands up on the base (physics chose: base curled into a C, lean back 15 deg)"""
    w = B.w; t0 = float(w.d.time); B.step(10)
    log(f'start: {lifter} bends vertical {B.bend_vertical(lifter):.2f}, {base} {B.bend_vertical(base):.2f} | rolls (IMU) {lifter} {B.roll(lifter):.0f} deg, {base} {B.roll(base):.0f} deg')
    # 31 Oct: with collision from the real CAD parts the chain can settle rolled (seen: lifter 44 deg, bends 0.69 vertical),
    # so its bends would swing along the floor instead of lifting. Then lay the base's footprint FIRST (a curled base can't
    # roll), and only then roll the lifter: turning the lifter's junction twist while the base is free rolled the base
    # instead (physics, robot 2: bends vertical 0.69 -> 1.00).
    base_first = os.environ.get('BASE_FIRST', '0') == '1' or B.bend_vertical(lifter) > 0.3
    if base_first:
        bv = B.align(base, junction_twist, 'vertical'); footprint(B, base, _foot(), log)
        if B.bend_vertical(lifter) > 0.3: B.align(lifter, 'T3' if free_end == 'A' else 'T1', 'horizontal')
    order, s = lift_signs(B, lifter, free_end, log)
    if 0 in s.values(): return dict(ok=False, why=f'{lifter} lies with its bends sideways: roll it first', seconds=round(float(w.d.time) - t0, 1))
    B.move(lifter, {order[0]: s[order[0]] * UP90}, 3.0)                           # 1 the tip stands up (short lever)
    if not base_first:
        bv = B.align(base, junction_twist, 'vertical')                            # 2 base bends sideways
        footprint(B, base, _foot(), log)                                          # 3 a wide footprint: the base can't roll
    roll0 = B.roll(base); log(f'  base footprint laid (bends vertical {bv:.2f}), base roll {roll0:.0f} deg')
    partial = rise(B, lifter, order, s, base, roll0, log)                          # 4 rise, tip first
    lean_back(B, lifter, order, s); B.step(int(4 / DT))                           # 5 lean back, hold 4 s
    return dict(score(w, lifter, free_end), partial=partial, base_roll_change=_roll_change(B, base, roll0), servo=servo_load(w), seconds=round(float(w.d.time) - t0, 1))


def cobra_auto(B, a='M1', b='M2', log=print):
    """2-chain a.B-b.A: the brain picks the roles from how the chain lies (encoders + IMU). 31 Oct: on the real CAD shapes
    a lying module's twist can't roll it (servo at its force limit against floor friction), so use the roll it already has:
    flat bends lift, sideways bends curl into the base's footprint."""
    va, vb = B.bend_vertical(a), B.bend_vertical(b)
    # 31 Oct, real CAD shapes: b lifting 8/8 robots, a lifting 1/4 (cause not found yet), so b lifts
    want = os.environ.get('LIFTER', b if CAD_COLLIDE else '')                                               # experiments: force the lifter
    lifter, base, free_end, twist = (a, b, 'A', 'T1') if (want == a if want else va <= vb) else (b, a, 'B', 'T3')
    log(f'roles from the lie: bends vertical {a} {va:.2f}, {b} {vb:.2f} -> {lifter} lifts, {base} is the base')
    return dict(cobra(B, lifter, base, free_end, twist, log), lifter=lifter)


def twohead(B, log=print):
    """3-module chain: M2 curls into a C on the floor, M1 (free End A) and M3 (free End B) both stand up on it"""
    w = B.w; t0 = float(w.d.time); B.step(10)
    log('start: bends vertical ' + ', '.join(f'{mid} {B.bend_vertical(mid):.2f}' for mid in w.ids))
    o1, s1 = lift_signs(B, 'M1', 'A', log)
    if 0 in s1.values(): return dict(ok=False, why='M1 lies with its bends sideways', seconds=0)
    B.move('M1', {o1[0]: s1[o1[0]] * UP90}, 3.0)                                  # M1's tip up: M1 can no longer roll
    B.align('M2', 'T1', 'vertical')                                               # base bends sideways
    mode = os.environ.get('TH', 'foot_first')                                    # physics compares: foot_first | big_c (M3 curls along, then turns)
    if mode == 'big_c':
        B.align('M3', 'T1', 'vertical'); foot = footprint(B, 'M2', _foot(), log); B.move('M3', foot, 3.0)
    else:
        foot = footprint(B, 'M2', _foot(), log)
    B.align('M3', 'T1', 'horizontal')                                             # M3 bends lifting (M3 is the part that turns)
    if mode == 'big_c': B.move('M3', {k: 0.0 for k in foot}, 2.0)
    o3, s3 = lift_signs(B, 'M3', 'B', log)
    if 0 in s3.values(): return dict(ok=False, why='M3 could not be rolled to lift', seconds=round(float(w.d.time) - t0, 1))
    roll0 = B.roll('M2'); log(f'  base C laid, base roll {roll0:.0f} deg')
    p1 = rise(B, 'M1', o1, s1, 'M2', roll0, log); lean_back(B, 'M1', o1, s1)
    B.move('M3', {o3[0]: s3[o3[0]] * UP90}, 3.0)
    p3 = rise(B, 'M3', o3, s3, 'M2', roll0, log); lean_back(B, 'M3', o3, s3)
    B.step(int(4 / DT)); a, b = score(w, 'M1', 'A'), score(w, 'M3', 'B')
    return dict(ok=a['ok'] and b['ok'], M1=a, M3=b, partial=[p1, p3], base_roll_change=_roll_change(B, 'M2', roll0), servo=servo_load(w), seconds=round(float(w.d.time) - t0, 1))


# ---------- crawling: a lying module moves itself across the floor (8 Nov) ----------
# A caterpillar wave: the twists turn the bends so they LIFT (align T2 horizontal), then a hump travels along B1 B2 B3 B4 (a sine,
# each joint a quarter wave later). The parts on the floor stay put while the hump moves: the module creeps. Normal friction only.
# Tilting the middle twist by WAVE_SIDE_DEG makes the same wave roll it sideways. Measured 8 Nov, one lying module, 10 s, 2 s wave:
#   wave +  T2 0   : +236 mm along it (robot with errors +193)     wave -  T2 0  : -225 mm
#   wave +  T2 +20 : +944 mm sideways (errors +1218)               wave -  T2 +20: -1284 mm sideways (errors -895)
#   (T2 -20 turned it, but -59 deg in one robot and +42 in another: not used; a 1 s wave hops 20 cm up and drifts)
WAVE_AMP_DEG, WAVE_PERIOD_S, WAVE_SIDE_DEG = 25.0, 4.0, 20.0   # 12 Nov: 4 s (was 2) - on the exact shapes (Isaac) 36-38 mm/wave vs 12
WAVE_BENDS = (1, 2, 4, 5)                                            # B1 B2 B3 B4


def _floor_axes(w, mid):
    """the module's long axis on the floor (End A -> End B) and its left (90 deg turned), both unit, horizontal"""
    a = w.d.xpos[w.m.body(f'{mid}_EndA_LockModule').id]; b = w.d.xpos[w.m.body(f'{mid}_EndB_LockModule').id]
    ax = (b - a)[:2] / max(np.linalg.norm((b - a)[:2]), 1e-9); return ax, np.array([-ax[1], ax[0]])


WAVE_ROLL_PERIOD_S = float(os.environ.get('WAVE_ROLL_PERIOD', '2.0'))   # 12 Nov: sideways waves ROLL the module - at 4 s they no longer did


def wave(B, mid, sign, side, base, amp=WAVE_AMP_DEG):
    """one wave period: sign +1 = toward End B (side False) or to its left (side True), -1 the other way"""
    i = B.w.ids.index(mid); B.cmd[mid] = base.copy()
    if side: B.cmd[mid][3] = base[3] + math.radians(WAVE_SIDE_DEG)
    t = 0.0; A = math.radians(amp); per = WAVE_ROLL_PERIOD_S if side else WAVE_PERIOD_S
    while t < per - 1e-9:
        for k, j in enumerate(WAVE_BENDS): B.cmd[mid][j] = base[j] + A * math.sin(2 * math.pi * t / per - sign * k * math.pi / 2)
        B.w.tgt[i * 9:i * 9 + 7] = B.cmd[mid]; B.step(1); t += DT
    if side: B.move(mid, {'T2': base[3]}, 0.5)                          # untilt: measuring with T2 still tilted read 'lifting' wrong (8 Nov)


def crawl_learn(B, mid, here, goal, log=print, near=0.10, max_s=300.0, stall_waves=6):
    """12 Nov: on the real-shape floor (phys_world floor hulls; Isaac) a lying module ROLLS onto its side in the first wave and then
    moves like a snake - the old rules (keep the bends lifting, re-align T2) fought that. Physics decides instead: each wave type
    (along / sideways x +-) is tried, what it REALLY moved (in the module's own frame: along its axis, to its left) is remembered,
    and the next wave is the one whose last measured move best closes the gap. Untried types first. Returns the distance left (m)."""
    w = B.w; t0 = float(w.d.time); base = B.cmd[mid].copy(); n = 0; best, stall = 1e9, 0; eff = {}
    acts = [(False, 1), (False, -1), (True, 1), (True, -1)]
    while True:
        e = (goal() - here())[:2]; dist = float(np.linalg.norm(e))
        if dist < best - 0.01: best, stall = dist, 0
        else: stall += 1
        if dist < near or stall >= stall_waves or float(w.d.time) - t0 > max_s: break
        ax, left = _floor_axes(w, mid); el = np.array([e @ ax, e @ left]) / max(dist, 1e-9)
        untried = [a for a in acts if a not in eff]
        act = untried[0] if untried else max(acts, key=lambda a: float(eff[a] @ el))
        if not untried and float(eff[act] @ el) <= 0.002: break                       # nothing moves it toward the goal any more
        amp = WAVE_AMP_DEG * min(1.0, max(0.4, dist / 0.15)); p0 = here()[:2].copy()
        wave(B, mid, act[1], act[0], base, amp=amp); n += 1
        ax2, left2 = _floor_axes(w, mid); dv = here()[:2] - p0; eff[act] = np.array([dv @ (ax + ax2) / 2, dv @ (left + left2) / 2]) / (amp / WAVE_AMP_DEG)
        if os.environ.get('CRAWL_DEBUG'): log(f'    wave {n}: {"side" if act[0] else "along"} {act[1]:+d} moved {np.linalg.norm(dv) * 1000:.0f} mm -> {float(np.linalg.norm((goal() - here())[:2])) * 1000:.0f} mm left')
    B.move(mid, {JN[j]: base[j] for j in range(7)}, 1.0)
    log(f'  crawled {mid} (learned waves): {n} waves, {float(w.d.time) - t0:.0f} s, {dist * 1000:.0f} mm left')
    return dist


def crawl_to(B, mid, here, goal, log=print, near=float(os.environ.get('CRAWL_NEAR', '0.10')), max_s=300.0, stall_waves=6):
    if os.environ.get('CRAWL_MODE', 'learn') == 'learn': return crawl_learn(B, mid, here, goal, log=log, near=near, max_s=max_s, stall_waves=stall_waves)
    """move lying module `mid` until the point here() (on it, world) is within `near` m of goal() on the floor. One wave at a time,
    re-measured after each: along it or sideways, whichever is further off. here/goal are functions (the target can move too).
    Positions come from physics truth (the sim); the real robot needs the camera for this. Returns the distance left (m).
    Stops when `stall_waves` waves in a row gained < 1 cm (10 Nov: a fixed 60 s cap left 442 of 827 mm, crawling ~6 mm/s fine)."""
    w = B.w; t0 = float(w.d.time); B.align(mid, 'T2', 'horizontal'); base = B.cmd[mid].copy(); n = 0; best, stall = 1e9, 0; flip = {False: 1, True: 1}; realign = 0
    while True:
        e = (goal() - here())[:2]; dist = float(np.linalg.norm(e))
        if dist < best - 0.01: best, stall = dist, 0
        else: stall += 1
        # done when near AND lying right (bends lift): one more roll moves ~18 cm and threw it from 90 to 265 mm (8 Nov); docking's
        # own bending reaches the rest
        if (dist < near and 1 - B.bend_vertical(mid) >= 0.7) or stall >= stall_waves or float(w.d.time) - t0 > max_s: break
        ax, left = _floor_axes(w, mid); f, s = float(e @ ax), float(e @ left)
        side = abs(s) > abs(f); comp = abs(s) if side else abs(f)
        # the sideways move ROLLS the module (8 Nov: one wave and its bends swung sideways, 'lifting' 0.97 -> 0.04; every wave along
        # after that pushed it the wrong way). So a roll is finished first: while the bends do not lift, keep rolling toward the goal
        rolled = 1 - B.bend_vertical(mid) < 0.7
        if rolled and realign < 2:
            # 10 Nov: resting on its side ring (the brain's floor now touches the rings, as the real robot does) the roll never
            # 'finishes': sideways waves rocked it back and forth. Turn T2 so the bends lift again, as at the start, then go on
            B.align(mid, 'T2', 'horizontal'); base = B.cmd[mid].copy(); realign += 1; continue
        if rolled and not side: side = True; comp = abs(s)
        # smaller waves near the goal (a full one goes ~4-25 cm): no overshoot - but a roll that must finish gets a full wave
        amp = WAVE_AMP_DEG if rolled else WAVE_AMP_DEG * min(1.0, max(0.4, comp / (0.15 if side else 0.05)))
        want = (left if side else ax) * (1 if (s if side else f) >= 0 else -1); p0 = here()[:2].copy()
        wave(B, mid, int(np.sign(s if side else f) or 1) * flip[side], side, base, amp=amp)
        # 10 Nov: which way a wave really goes depends on how the module lies (resting on a side ring it rolls like a wheel: every
        # sideways wave after the first went 55 mm the WRONG way). Measured, not assumed: a wave that went backwards flips that sign
        if float((here()[:2] - p0) @ want) < -0.005: flip[side] *= -1
        n += 1; realign = 0 if 1 - B.bend_vertical(mid) >= 0.7 else realign
        if os.environ.get('CRAWL_DEBUG'): log(f'    wave {n}: {"side" if side else "along"} {comp * 1000:.0f} mm off -> {float(np.linalg.norm((goal() - here())[:2])) * 1000:.0f} mm, bends lifting {1 - B.bend_vertical(mid):.2f}')
    B.move(mid, {JN[j]: base[j] for j in range(7)}, 1.0)              # lie straight again, bends as before the crawl
    log(f'  crawled {mid}: {n} waves, {float(w.d.time) - t0:.0f} s, {dist * 1000:.0f} mm left')
    return dist


if __name__ == '__main__':
    from snap import Snapper
    from watchdog import Watchdog
    ck, skill = sys.argv[1], sys.argv[2]; args = sys.argv[3:-1]; out = sys.argv[-1]
    w, ex = PhysWorld.load(ck); t0 = time.time(); seed = int(os.environ.get('SEED', ex.get('seed', 1) if isinstance(ex, dict) else 1))
    S = Snapper(w, tpath('logs/snaps'), f"skill_{os.path.basename(out).split('.')[0]}"); WD = Watchdog(w, S, abort=False); WD.stage = skill; w.on_tick = WD.tick
    ev = []; lg = lambda msg: (print(msg), ev.append(dict(t=round(float(w.d.time), 2), label=msg.strip())))
    fps = int(os.environ.get('REC', '0'))
    if fps: w.rec = {'dt': 1.0 / fps, 'last': -1.0, 'frames': []}; frame0 = w.body_poses()
    B = Brain(w, seed, log=lg)
    res = cobra_auto(B, *args, log=lg) if skill == 'cobra' else twohead(B, log=lg)
    if fps:                                                    # watchable in the Studio: Shapes -> Transformations (verify_service /transform)
        run = dict(bodies=w.view_names, frame0=frame0, frames=w.rec['frames'], events=ev, fps=fps, randomized=True, receivers=[], seed=seed)
        name = os.environ.get('REC_NAME', skill); w.rec = None
        json.dump(dict(pair=name, ok=res['ok'], stages=[dict(stage=e['label'], ok=True) for e in ev], run=run), open(os.path.join(tpath('logs'), f'tf_{name}_{seed}.json'), 'w'))
    pic = S.shot(f"{skill} {' '.join(args)}: {'OK' if res['ok'] else 'FAILED'}")
    print('RESULT', json.dumps(dict(res, picture=pic, watchdog=[f['msg'][:100] for f in WD.flags], wall_s=round(time.time() - t0))))
    w.save(out, extra=ex)
