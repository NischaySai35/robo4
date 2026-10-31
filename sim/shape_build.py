"""shape_build.py — build a shape from shapes.json in REAL physics (phys_world + the robot's docking brain).
Every module stands upright in its floor receiver; then each walker docks its End B into the root's spine receiver,
one after another (the same Walker/DockController the robot runs; judge = simulated camera); then gravity holds it.
   py -3.12 shape_build.py SHAPE_INDEX SEED        -> prints per-dock results + the final hold"""
from paths import tpath
import sys, json, math, time; sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
import numpy as np, mujoco
from phys_world import PhysWorld
from phys_dock import PhysDockEnv, dock
from build_walk import R2q
from shape_search import SPOTS
SRX_PORT = {0: 'S1A', 1: 'S1B', 2: 'S2A', 3: 'S2B'}


def build(shape, seed=1, randomize=True, record=None, log=print, extra_spots=(), extra_locks=(), keep_world=False):
    """extra_spots / extra_locks: floor receivers and lock definitions a LATER transformation will use (the world
    must know them from the start); keep_world: return the live world as out['world'] to continue from."""
    t0 = time.time()
    w, floor, docks, spot_of, anchors = place_shape(shape, seed, randomize, extra_spots, extra_locks)
    m, d = w.m, w.d; mods = list(spot_of)
    for lk in floor: w.engage(lk)
    if record: w.rec = {'dt': 1.0 / record, 'last': -1.0, 'frames': []}
    w.run(0.5)
    cur = list(floor); res = []
    if shape.get('order'):                                   # the collision-free dock order found by shape_check.py
        docks = sorted(docks, key=lambda lk: shape['order'].index(lk['b']['module']))
    for i, lk in enumerate(docks):
        wid = lk['b']['module']; tgt = f"{lk['a']['module']}.{lk['a']['port']}"
        for attempt in range(2):                         # a missed dock: straighten up, settle, try once more (the robot would)
            env = PhysDockEnv(w, wid, seed=seed * 101 + i + 1000 * attempt, randomize=randomize)
            ok, info = dock(env, 'A', f'F:S{spot_of[wid]}', tgt, max_frames=1500)      # walk.py's per-dock limit
            if ok: break
            w.set_locks(cur); o = 9 * w.ids.index(wid); w.tgt[o:o + 7] = 0.0; w.run(3.0)
        if ok: w.engage(lk); cur.append(lk)
        else: w.set_locks(cur)
        res.append(dict(walker=wid, target=tgt, ok=ok, attempts=attempt + 1, gap=info['axial_mm'], side=info['radial_mm'], s=info['seconds']))
        log(f"  dock {wid} End B -> {tgt}: {'LOCKED' if ok else 'FAILED'} gap {info['axial_mm']} mm side {info['radial_mm']} mm, {info['seconds']} s | touching at the end: {info['touching']}")
    # gravity: does the built shape hold? (all servos keep their last targets)
    p0 = {mid: d.xpos[w.mod[mid]['end']['B']['body']].copy() for mid in mods}
    peak, fin = w.run(3.0)
    drift = max(float(np.linalg.norm(d.xpos[w.mod[mid]['end']['B']['body']] - p0[mid])) for mid in mods) * 1000
    out = dict(docks=res, locked=sum(r['ok'] for r in res), of=len(res), hold_drift_mm=round(drift, 1), peak_torque_pct=round(peak, 1),
               finite=fin, wall_s=round(time.time() - t0))
    if record:
        rcv = [dict(id=a['id'], x=a['x'], z=a['z'], locked=next((f"{lk['b']['module']}.A" for lk in floor if lk['a']['floor'] == a['id']), None)) for a in anchors]
        out['run'] = dict(bodies=w.view_names, frame0=w.nominal_poses, frames=w.rec['frames'], events=[], fps=record, randomized=randomize, seed=seed, finite=fin, receivers=rcv)
    if keep_world: out['world'] = w; out['locks'] = cur
    return out


def place_shape(shape, seed=1, randomize=True, extra_spots=(), extra_locks=()):
    """the world of a shape before any dock: every module upright in its floor receiver, floor locks' rotors at 45 deg
    (not yet welded). Shared by build() and the GPU runner (gpu_transform.py) so both start from the same pose."""
    from grow import shape_modules                         # root, walkers W*, and grown modules X* (docking into any module)
    spot_of, yaw_of, dlist = shape_modules(shape)
    mods = list(spot_of)
    # floor receivers at the used spots (anchor yaw = a GAP = pad axis + 45; the board's receivers have yaw 0)
    anchors = [dict(id=f'S{sp}', x=SPOTS[sp][0], z=-SPOTS[sp][1], yawDeg=45.0) for sp in dict.fromkeys([spot_of[m] for m in mods] + list(extra_spots))]
    floor = [{'a': {'floor': f'S{spot_of[m]}'}, 'b': {'module': m, 'port': 'A'}} for m in mods]
    docks = [{'a': {'module': into, 'port': SRX_PORT[srx]}, 'b': {'module': wid, 'port': 'B'}} for wid, into, srx in dlist]
    w = PhysWorld(mods, anchors, randomize=randomize, seed=seed, locks=floor + docks + list(extra_locks))
    m, d = w.m, w.d; mujoco.mj_resetData(m, d); mujoco.mj_forward(m, d); w._refresh_rx()
    for mid in mods:                                      # stand upright in its receiver (multi_env._place maths)
        RX = next(x for x in w.rx if x['name'] == f'F:S{spot_of[mid]}'); R = d.xmat[RX['bid']].reshape(3, 3)
        yaw = math.radians(yaw_of[mid]); x = R @ np.array([math.cos(yaw), math.sin(yaw), 0]); y = RX['z']; z = np.cross(x, y); Rt = np.stack([x, y, z], 1)
        pA = m.body(f'{mid}_EndA_LockModule').pos; pa = m.site(f'{mid}_A_padtip').pos; a = w.mod[mid]['root']
        d.qpos[a:a + 3] = RX['seat'] - Rt @ (pA + pa); d.qpos[a + 3:a + 7] = R2q(Rt)
    mujoco.mj_forward(m, d)
    w.set_locks(floor, snap=True); w.sp[:] = w.tgt; d.ctrl[w.all_act] = w.sp; mujoco.mj_forward(m, d)
    w.nominal_poses = w.body_poses()
    return w, floor, docks, spot_of, anchors


if __name__ == '__main__':
    shapes = json.load(open(tpath('logs/shapes.json')))
    s = shapes[int(sys.argv[1])]; seed = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    print(f"shape {sys.argv[1]}: {s['kind']} root spot {s['root']} yaw {s['ryaw']}, seed {seed}")
    r = build(s, seed)
    print(f"  => {r['locked']}/{r['of']} locked | after 3 s of gravity: ends moved {r['hold_drift_mm']} mm, peak servo {r['peak_torque_pct']}% | {r['wall_s']} s wall")
