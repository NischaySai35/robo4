"""shape_check.py — whole-structure collision check for shapes.json (no dynamics, fast).
Per shape, in build order: each walker at its HOVER pose (others: earlier ones seated, later ones upright), then SEATED
(the docking brain's own IK: Walker._ctrl -> seed at hover, NOM._ik at the seat). Any contact between two different
modules (apart from the walker's End B on its target receiver) rejects the shape. Writes shapes_ok.json.
   py -3.12 shape_check.py"""
from paths import tpath
import sys, io, json, math, itertools, contextlib; sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
import numpy as np, mujoco
from phys_world import PhysWorld
from phys_dock import PhysDockEnv
from build_walk import R2q
from shape_search import SPOTS
with contextlib.redirect_stdout(io.StringIO()):
    import walk as WK
L = WK.L
SRX_PORT = {0: 'S1A', 1: 'S1B', 2: 'S2A', 3: 'S2B'}


def check(shape):
    mods = ['R'] + [f'W{i + 1}' for i in range(len(shape['docks']))]
    spot_of = {'R': shape['root']}; yaw_of = {'R': shape['ryaw']}
    for i, dk in enumerate(shape['docks']): spot_of[f'W{i + 1}'] = dk['walker']; yaw_of[f'W{i + 1}'] = dk['wyaw']
    anchors = [dict(id=f'S{spot_of[m]}', x=SPOTS[spot_of[m]][0], z=-SPOTS[spot_of[m]][1], yawDeg=45.0) for m in mods]
    w = PhysWorld(mods, anchors, randomize=False)
    m, d = w.m, w.d; mujoco.mj_resetData(m, d); mujoco.mj_forward(m, d); w._refresh_rx()
    for mid in mods:
        RX = next(x for x in w.rx if x['name'] == f'F:S{spot_of[mid]}'); R = d.xmat[RX['bid']].reshape(3, 3)
        yaw = math.radians(yaw_of[mid]); x = R @ np.array([math.cos(yaw), math.sin(yaw), 0]); y = RX['z']; z = np.cross(x, y); Rt = np.stack([x, y, z], 1)
        pA = m.body(f'{mid}_EndA_LockModule').pos; pa = m.site(f'{mid}_A_padtip').pos; a = w.mod[mid]['root']
        d.qpos[a:a + 3] = RX['seat'] - Rt @ (pA + pa); d.qpos[a + 3:a + 7] = R2q(Rt)
    mujoco.mj_forward(m, d)
    owner = lambda b: m.body(b).name.split('_')[0]
    def clashes(allow):
        bad = []
        for c in d.contact[:d.ncon]:
            b1, b2 = int(m.geom_bodyid[c.geom1]), int(m.geom_bodyid[c.geom2]); o1, o2 = owner(b1), owner(b2)
            if o1 == o2 or o1 in ('world', 'F') or o2 in ('world', 'F') or c.dist > -0.001: continue
            if (o1, o2) in allow or (o2, o1) in allow: continue
            bad.append((m.body(b1).name, m.body(b2).name, round(c.dist * 1000, 1)))
        return bad
    # each walker's swing (upright -> hover, sampled) and its seated pose, for every dock ORDER; keep the first clear order
    plans = {}
    for i, dk in enumerate(shape['docks']):
        wid = f'W{i + 1}'; env = PhysDockEnv(w, wid, randomize=False)
        W = WK.Walker(env, 'A', env.index(f'F:S{spot_of[wid]}'), 0, m.opt.gravity.copy(), log=lambda *a: None)
        with contextlib.redirect_stdout(io.StringIO()):
            C = W._ctrl(env.index(f'R.{SRX_PORT[dk["srx"]]}'))
            q_seat = L.NOM._ik(C.seat, C.z, C.Ro, C.seed, seeds=0)
        plans[wid] = (C.seed.copy(), q_seat)
    upright = np.zeros(7)
    def setq(wid, q): d.qpos[w.mod[wid]['qa']] = q
    why = ''
    for order in itertools.permutations(list(plans)):
        for wid in plans: setq(wid, upright)
        ok = True
        for wid in order:
            hover, seat = plans[wid]
            for t in np.linspace(0, 1, 11)[1:]:                       # the swing, then the go-in
                setq(wid, upright + (hover - upright) * t); mujoco.mj_forward(m, d)
                bad = clashes(set())
                if bad: ok = False; why = f'{wid} swinging: {bad[:2]}'; break
            if not ok: break
            setq(wid, seat); mujoco.mj_forward(m, d)
            bad = clashes({(wid, 'R')})
            if bad: ok = False; why = f'{wid} seated: {bad[:2]}'; break
        if ok: return True, list(order)
    return False, why


if __name__ == '__main__':
    shapes = json.load(open(tpath('logs/shapes.json'))); ok = []
    for i, s in enumerate(shapes):
        good, why = check(s)
        if good: ok.append(dict(s, index=i, order=why))
        if i % 20 == 0 or good: print(f'{i:3d} {s["kind"]}: {"CLEAR" if good else "clash"} {why if not good else ""}', flush=True)
    json.dump(ok, open(tpath('logs/shapes_ok.json'), 'w'), indent=1)
    from collections import Counter
    print('clear shapes:', dict(Counter(s['kind'] for s in ok)))
