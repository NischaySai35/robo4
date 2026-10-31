"""End<->end, handoff step 3: find a STIFF end target.
Partner (module 1) anchored by End A in a floor receiver, folded so its End B faces UP at a reachable height
(then the walker docks into it from above, exactly like into a floor receiver).
  1) geometry: partner bend grid -> End B outward axis up (z > 0.95), height 80..300 mm, no self/floor collision
  2) physics (CPU, real servo model): settle, then push End B with 5 N along x, y, -z; deflection must be small (< 2 mm wanted)
  3) reach: walker (End A in rx0) IK to that End B, stand-off/hover/seat poses collision-free, twists < 150
Writes C:\\TETROBOT\\logs\\target_stiffness.csv and prints the best candidates as gpu_multi_dock task rows.
Usage: py -3.12 target_stiffness.py [N_PHYS]"""
from paths import tpath
import sys, os, io, math, time, itertools, contextlib, numpy as np, mujoco
sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
from multi_env import MultiEnv
from walk import Walker
with contextlib.redirect_stdout(io.StringIO()):
    import laptop_controller as L
XML = tpath('sim/multi_reach2.xml')
G = [-0.3, -0.2, -0.1, 0.1, 0.2, 0.3]
SPOTS = [(0, 0)] + [(x, y) for x in G for y in G if abs(x) + abs(y) >= 0.2]      # same grid as reach2.py / multi_reach2.xml
N_PHYS = int(sys.argv[1]) if len(sys.argv) > 1 else 24
OUT = tpath('logs/target_stiffness.csv')
P = lambda *a: print(*a, flush=True)

e = MultiEnv(seed=0, randomize=False, xml=XML); m, d = e.m, e.d
names = [r['name'] for r in e.rx]; JB = names.index('m1_endB')
b0 = set(); b1 = set()
for b in range(m.nbody):
    n = m.body(b).name
    if n.startswith('m1_'): b1.add(b)
    elif n and not n.startswith('rx') and n != 'world' and 'srx' not in n: b0.add(b)
floor_g = m.geom('floor').id if any(m.geom(i).name == 'floor' for i in range(m.ngeom)) else -1

# ---------- 1) geometry: which folds put End B facing up, low enough to reach? (partner kinematics = the nominal module)
t0 = time.time(); cands = []
B = [-90, -60, -30, 0, 30, 60, 90]
for b1_, b2_, b3_, b4_ in itertools.product(B, B, B, B):
    for t2 in (0, 90):
        q = np.radians([0, b1_, b2_, t2, b3_, b4_, 0])
        p, n, x = L.NOM._fk(q)                         # End B tip / outward normal in the anchored module frame (End A in a floor rx at the origin)
        if n[2] > 0.95 and 0.08 < p[2] < 0.30: cands.append((q, p.copy(), n.copy()))
P('geometry: %d folds put End B facing up at 80-300 mm (of %d), %.0f s' % (len(cands), len(B) ** 4 * 2, time.time() - t0))

# self-collision + floor check in the real model: place the partner at spot 1 (any spot: pose is relative), forward only
def place_static(spot, yaw, q):
    e.reset(base_rx=0, yaw_deg=45.0, partners=[(1, spot, yaw, q)], settle=0); mujoco.mj_forward(m, d)
def partner_contacts():
    own = flr = 0
    for k in range(d.ncon):
        c = d.contact[k]; g1, g2 = int(c.geom1), int(c.geom2); bb1, bb2 = int(m.geom_bodyid[g1]), int(m.geom_bodyid[g2])
        if c.dist > -0.002: continue
        if bb1 in b1 and bb2 in b1: own += 1
        elif (bb1 in b1 and bb2 == 0) or (bb2 in b1 and bb1 == 0): flr += 1
    return own, flr
ok = []
for q, p, n in cands:
    place_static(1, 45.0, q); own, flr = partner_contacts()
    if own == 0 and flr == 0:
        ok.append((q, p, n))
P('collision-free folds: %d' % len(ok))

# ---------- 2) physics: settle with the real servo model, then 5 N pushes on End B
def settle_and_push(spot, yaw, q, frames=25):
    e.reset(base_rx=0, yaw_deg=45.0, partners=[(1, spot, yaw, q)], settle=400)
    hold = e.cmd.copy()
    for _ in range(15): e.step(hold, 45.0, 0.0)
    rx = e.rx[JB]; s0 = rx['seat'].copy(); z0 = rx['z'].copy()
    # sag: where the seat really is vs the nominal kinematics (module frame -> world through the anchor)
    defl = []
    eb = e.mods[1]['end']['B']['body']
    for F in (np.array([5.0, 0, 0]), np.array([0, 5.0, 0]), np.array([0, 0, -5.0])):
        for _ in range(frames): e.step(hold, 45.0, 0.0, extra_force=(eb, F))
        defl.append(np.linalg.norm(e.rx[JB]['seat'] - s0) * 1000)
        for _ in range(frames): e.step(hold, 45.0, 0.0)
    back = np.linalg.norm(e.rx[JB]['seat'] - s0) * 1000
    tq = np.abs(d.actuator_force[e.mods[1]['all_act'][:7]]).max() / 2.7 * 100
    return dict(seat=s0, z=z0, defl=defl, back=back, torque=tq, tilt=math.degrees(math.acos(min(1, z0[2]))))

# ---------- 3) reach: walker (End A in rx0) to that End B from above, collision-free stand-off / hover / seat
def reach():
    W = Walker(e, 'A', 0, 0, m.opt.gravity.copy(), log=lambda *a: None)
    with contextlib.redirect_stdout(io.StringIO()): C = W._ctrl(JB)
    best = None
    for s in range(3):
        qs = L.NOM._ik(C.hover, C.z, C.Ro, np.zeros(7), seeds=6 + s); pp, nn, _ = L.NOM._fk(qs)
        err = np.linalg.norm(pp - C.hover) * 1000; tw = np.degrees(np.abs(qs[[0, 3, 6]])).max()
        if best is None or err + tw / 100 < best[0]: best = (err + tw / 100, err, tw, qs)
    _, err, tw, qs = best
    qa0 = e.mods[0]['qa']; d.qpos[qa0] = qs; mujoco.mj_forward(m, d)
    hit = 0
    for k in range(d.ncon):
        c = d.contact[k]; bb1, bb2 = int(m.geom_bodyid[c.geom1]), int(m.geom_bodyid[c.geom2])
        if c.dist < -0.001 and ((bb1 in b0 and bb2 in b1) or (bb2 in b0 and bb1 in b1)): hit += 1
    return err, tw, hit

# rank folds: lower End B first (shorter lever, closer to the floor), then try spots/yaws for reach
ok.sort(key=lambda c: c[1][2])
rows = []; f = open(OUT, 'w'); f.write('spot,yaw,q0,q1,q2,q3,q4,q5,q6,seat_mm,tilt_deg,defl_x,defl_y,defl_z,back_mm,torque_pct,ik_err_mm,twist_deg,hits,good\n')
tried = 0
for q, p, n in ok:
    if tried >= N_PHYS: break
    # spot: End B must land 0.15-0.40 m from rx0 (walker reach); search spots x yaw by geometry first
    opts = []
    for si in range(1, len(SPOTS)):
        for yaw in (45, 135, 225, 315):
            a = math.radians(yaw); Rz = np.array([[math.cos(a), -math.sin(a)], [math.sin(a), math.cos(a)]])
            xy = np.array(SPOTS[si]) + Rz @ p[:2]          # rough (frame yaw convention checked below by the real seat)
            r = np.linalg.norm(xy)
            if 0.12 < r < 0.40: opts.append((abs(r - 0.25), si, yaw))
    opts.sort()
    for _, si, yaw in opts[:4]:
        tried += 1
        R = settle_and_push(si, yaw, q)
        err, tw, hits = reach()
        good = max(R['defl']) < 2.0 and R['tilt'] < 5 and err < 1.5 and tw < 150 and hits == 0 and R['torque'] < 70
        qd = np.degrees(q).round().astype(int)
        f.write('%d,%d,%s,%.0f,%.1f,%.2f,%.2f,%.2f,%.2f,%.0f,%.1f,%.0f,%d,%d\n' % (si, yaw, ','.join(map(str, qd)), R['seat'][2] * 1000, R['tilt'], *R['defl'], R['back'], R['torque'], err, tw, hits, good)); f.flush()
        P('spot %2d yaw %3d fold %s | End B seat %3.0f mm tilt %4.1f deg | 5 N push: x %.2f y %.2f z %.2f mm (back %.2f) | torque %2.0f%% | walker IK %.1f mm twist %3.0f hits %d | %s' % (
            si, yaw, list(qd), R['seat'][2] * 1000, R['tilt'], *R['defl'], R['back'], R['torque'], err, tw, hits, 'GOOD' if good else '-'))
        if good: rows.append('%d,%d,%s,endB' % (si, yaw, ','.join(map(str, qd))))
        if tried >= N_PHYS: break
P('\ncandidates tried %d, GOOD %d, %.0f s' % (tried, len(rows), time.time() - t0))
if rows:
    open(tpath('sim/tasks_endend_stiff.csv'), 'w').write('# END <-> END onto a STIFF target: partner anchored by End A, folded so End B faces up (target_stiffness.py)\n# spot,yaw,q0..q6(deg),target\n' + '\n'.join(rows) + '\n')
    P('wrote tasks_endend_stiff.csv')
