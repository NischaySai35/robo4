"""grow.py — G6 assembly by GROWING: start from a shape that builds reliably, then add one module at a time.
Candidates for the next module: (floor spot, yaw) x (a free spine receiver on any module already in the structure).
  1) quick filter with the docking brain's own maths: IK to the hover point reaches (< 2 mm) with twists < 150 deg,
     and the walker's swing (upright -> hover) and seated pose touch nobody (static contacts);
  2) PHYSICS decides: rebuild the base + try that dock with the real brain on random robots in parallel; keep what locks.
   py -3.12 grow.py BASE_SHAPE_INDEX [N_CANDIDATES] [N_ROBOTS]      (shape index into shapes_v1.json)"""
from paths import tpath
import sys, io, json, math, itertools, contextlib, subprocess; sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
import numpy as np, mujoco
from phys_world import PhysWorld
from phys_dock import PhysDockEnv
from build_walk import R2q
from shape_search import SPOTS
with contextlib.redirect_stdout(io.StringIO()):
    import walk as WK
L = WK.L
SRX_PORT = {0: 'S1A', 1: 'S1B', 2: 'S2A', 3: 'S2B'}


def shape_modules(shape):
    """module -> (spot, yaw) and the locks of a (possibly grown) shape. Grown shapes carry 'extra': [{walker, wyaw, into, srx}]"""
    spot = {'R': shape['root']}; yaw = {'R': shape['ryaw']}; docks = []
    for i, dk in enumerate(shape['docks']):
        w = f'W{i + 1}'; spot[w] = dk['walker']; yaw[w] = dk['wyaw']; docks.append((w, 'R', dk['srx']))
    for j, ex in enumerate(shape.get('extra', [])):
        w = f'X{j + 1}'; spot[w] = ex['walker']; yaw[w] = ex['wyaw']; docks.append((w, ex['into'], ex['srx']))
    return spot, yaw, docks


def candidates(shape, limit=8):
    """statically plausible next docks, best first"""
    spot, yaw, docks = shape_modules(shape)
    used = {(into, srx) for _, into, srx in docks}
    free_spots = [i for i in range(len(SPOTS)) if i not in spot.values() and all(math.dist(SPOTS[i], SPOTS[s]) >= 0.2 for s in spot.values())]
    mods = list(spot) + ['NEW']
    out = []
    for fs in free_spots:
        for wy in (45, 135, 225, 315):
            anchors = [dict(id=f'S{spot[m]}', x=SPOTS[spot[m]][0], z=-SPOTS[spot[m]][1], yawDeg=45.0) for m in spot] + [dict(id=f'S{fs}', x=SPOTS[fs][0], z=-SPOTS[fs][1], yawDeg=45.0)]
            w = PhysWorld(mods, anchors, randomize=False); m, d = w.m, w.d
            mujoco.mj_resetData(m, d); mujoco.mj_forward(m, d); w._refresh_rx()
            def place(mid, s, yw):
                RX = next(x for x in w.rx if x['name'] == f'F:S{s}'); R = d.xmat[RX['bid']].reshape(3, 3)
                a_ = math.radians(yw); x = R @ np.array([math.cos(a_), math.sin(a_), 0]); y = RX['z']; z = np.cross(x, y); Rt = np.stack([x, y, z], 1)
                pA = m.body(f'{mid}_EndA_LockModule').pos; pa = m.site(f'{mid}_A_padtip').pos; ad = w.mod[mid]['root']
                d.qpos[ad:ad + 3] = RX['seat'] - Rt @ (pA + pa); d.qpos[ad + 3:ad + 7] = R2q(Rt)
            for mid in spot: place(mid, spot[mid], yaw[mid])
            place('NEW', fs, wy); mujoco.mj_forward(m, d)
            # the existing walkers sit in their seated pose (the brain's IK), the root upright
            for wid, into, srx in docks:
                env = PhysDockEnv(w, wid, randomize=False)
                W = WK.Walker(env, 'A', env.index(f'F:S{spot[wid]}'), 0, m.opt.gravity.copy(), log=lambda *a: None)
                with contextlib.redirect_stdout(io.StringIO()):
                    C = W._ctrl(env.index(f'{into}.{SRX_PORT[srx]}')); q = L.NOM._ik(C.seat, C.z, C.Ro, C.seed, seeds=0)
                d.qpos[w.mod[wid]['qa']] = q
            mujoco.mj_forward(m, d)
            for into in spot:
                for srx in range(4):
                    if (into, srx) in used: continue
                    env = PhysDockEnv(w, 'NEW', randomize=False)
                    W = WK.Walker(env, 'A', env.index(f'F:S{fs}'), 0, m.opt.gravity.copy(), log=lambda *a: None)
                    with contextlib.redirect_stdout(io.StringIO()):
                        C = W._ctrl(env.index(f'{into}.{SRX_PORT[srx]}'))
                        hover = C.seed; p_, _, _ = L.NOM._fk(hover); err = float(np.linalg.norm(p_ - C.hover)) * 1000
                    tw = float(np.degrees(np.abs(hover[[0, 3, 6]])).max())
                    if err > 2 or tw > 150: continue
                    with contextlib.redirect_stdout(io.StringIO()):
                        seat = L.NOM._ik(C.seat, C.z, C.Ro, hover, seeds=0)
                    clear = True
                    for t in list(np.linspace(0, 1, 11)[1:]) + ['seat']:
                        d.qpos[w.mod['NEW']['qa']] = seat if t == 'seat' else hover * t; mujoco.mj_forward(m, d)
                        for c in d.contact[:d.ncon]:
                            o1 = m.body(m.geom_bodyid[c.geom1]).name.split('_')[0]; o2 = m.body(m.geom_bodyid[c.geom2]).name.split('_')[0]
                            if c.dist < -0.001 and 'NEW' in (o1, o2) and o1 != o2 and not ({o1, o2} <= {'NEW', 'world', 'F'}) and not (t == 'seat' and {o1, o2} == {'NEW', into}):
                                clear = False; break
                        if not clear: break
                    d.qpos[w.mod['NEW']['qa']] = 0.0
                    if clear: out.append(dict(walker=fs, wyaw=wy, into=into, srx=srx, twist=round(tw), dist=round(math.dist(SPOTS[fs], SPOTS[spot[into]]), 2)))
    out.sort(key=lambda c: (c['dist'] < 0.2, c['twist']))
    return out[:limit]


if __name__ == '__main__':
    base = json.load(open(tpath('logs/shapes_v1.json')))[int(sys.argv[1])]
    nc = int(sys.argv[2]) if len(sys.argv) > 2 else 6; nr = int(sys.argv[3]) if len(sys.argv) > 3 else 3
    cands = candidates(base, nc)
    print(f'{len(cands)} statically plausible next docks:', flush=True)
    for c in cands: print('  ', c, flush=True)
    json.dump(dict(base=base, cands=cands), open(tpath('logs/grow_cands.json'), 'w'), indent=1)
