"""bridge_search.py — where can a second upright module U stand so that W1, hanging from the root's spine (End B in R.S1B,
End A peeled off the floor), can dock its End A into one of U's spine receivers?  -> a BRIDGE (flat top: table / chair).
Quick filter with the docking brain's own maths (as grow.candidates): the brain's IK reaches U's hover point (< 2 mm) with
twists < 150 deg, from W1's base in the root's spine; U's upright body does not touch R or W1 (seated pose of the build).
Physics then decides (bridge_test.py).        py -3.12 bridge_search.py [N]"""
from paths import tpath
import sys, os, io, json, math, contextlib, numpy as np, mujoco
sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
from phys_world import PhysWorld
from phys_dock import PhysDockEnv, _base_slot
from build_walk import R2q
with contextlib.redirect_stdout(io.StringIO()):
    import walk as WK
    from shape_search import SPOTS
L = WK.L
SRX_PORT = {0: 'S1A', 1: 'S1B', 2: 'S2A', 3: 'S2B'}
BASE = json.load(open(tpath('logs/shapes_v1.json')))[2]


def base_shape(which=0):
    """root + one walker W1 (which = index into the reliable shape's docks: 0 = spot 29 -> R.S1B, 1 = spot 8 -> R.S2A)"""
    s = dict(BASE); s['docks'] = [BASE['docks'][which]]; return s


def candidates(limit=8, which=0, ports=(0, 1, 2, 3), maxdist=0.6):
    s = base_shape(which); R, W1 = s['root'], s['docks'][0]['walker']; port = SRX_PORT[s['docks'][0]['srx']]
    out = []
    # ONE world (compiling one per candidate took > 2 min): U's floor receiver is moved to each candidate spot by hand
    # (all floor receivers have the same orientation, so only the position changes).
    first = next(fs for fs in range(len(SPOTS)) if fs not in (R, W1))
    anchors = [dict(id=f'S{x}', x=SPOTS[x][0], z=-SPOTS[x][1], yawDeg=45.0) for x in (R, W1, first)]
    w = PhysWorld(['R', 'W1', 'U'], anchors, randomize=False); m, d = w.m, w.d
    mujoco.mj_resetData(m, d); mujoco.mj_forward(m, d); w._refresh_rx()
    rxU = next(x for x in w.rx if x['name'] == f'F:S{first}'); seatU0 = rxU['seat'].copy(); RrU = d.xmat[rxU['bid']].reshape(3, 3).copy()
    def place(mid, sp, yw):
        if mid == 'U': Rr, seat = RrU, seatU0 + np.array([SPOTS[sp][0] - SPOTS[first][0], SPOTS[sp][1] - SPOTS[first][1], 0.0])
        else:
            RX = next(x for x in w.rx if x['name'] == f'F:S{sp}'); Rr, seat = d.xmat[RX['bid']].reshape(3, 3), RX['seat']
        a_ = math.radians(yw); x = Rr @ np.array([math.cos(a_), math.sin(a_), 0]); y = Rr[:, 2]; z = np.cross(x, y); Rt = np.stack([x, y, z], 1)
        pA = m.body(f'{mid}_EndA_LockModule').pos; pa = m.site(f'{mid}_A_padtip').pos; ad = w.mod[mid]['root']
        d.qpos[ad:ad + 3] = seat - Rt @ (pA + pa); d.qpos[ad + 3:ad + 7] = R2q(Rt)
    place('R', R, s['ryaw']); place('W1', W1, s['docks'][0]['wyaw']); mujoco.mj_forward(m, d)
    env = PhysDockEnv(w, 'W1', randomize=False)                           # W1 seated in R's spine (the build's end pose)
    W = WK.Walker(env, 'A', env.index(f'F:S{W1}'), 0, m.opt.gravity.copy(), log=lambda *a: None)
    with contextlib.redirect_stdout(io.StringIO()):
        C = W._ctrl(env.index(f'R.{port}')); qW = L.NOM._ik(C.seat, C.z, C.Ro, C.seed, seeds=0)
    d.qpos[w.mod['W1']['qa']] = qW
    for fs in range(len(SPOTS)):
        if fs in (R, W1) or math.dist(SPOTS[fs], SPOTS[R]) < 0.2 or math.dist(SPOTS[fs], SPOTS[W1]) < 0.14 or math.dist(SPOTS[fs], SPOTS[R]) > maxdist: continue
        for uy in (45, 135, 225, 315):
            place('U', fs, uy); mujoco.mj_forward(m, d)
            names = lambda c: {m.body(m.geom_bodyid[c.geom1]).name.split('_')[0], m.body(m.geom_bodyid[c.geom2]).name.split('_')[0]}
            if any(c.dist < -0.001 and 'U' in names(c) and len(names(c) - {'world', 'F'}) == 2 for c in d.contact[:d.ncon]): continue   # U in the way
            env = PhysDockEnv(w, 'W1', randomize=False); jb = env.index(f'R.{port}')
            Wb = WK.Walker(env, 'B', jb, 0, m.opt.gravity.copy(), log=lambda *a: None); Wb.k = _base_slot(env, 'B', jb, Wb)
            Wb.last_cmd = d.qpos[env.qa].copy()
            for srx in ports:
                with contextlib.redirect_stdout(io.StringIO()):
                    C = Wb._ctrl(env.index(f'U.{SRX_PORT[srx]}'))
                    hv = C.seed; p_, _, _ = L.NOM._fk(hv); err = float(np.linalg.norm(p_ - C.hover)) * 1000
                tw = float(np.degrees(np.abs(hv[[0, 3, 6]])).max())
                if err > 2 or tw > 150: continue
                with contextlib.redirect_stdout(io.StringIO()):
                    qs = L.NOM._ik(C.seat, C.z, C.Ro, hv, seeds=0)
                bend = float(np.degrees(np.abs(qs[[1, 2, 4, 5]])).sum())          # how curled W1 ends up (0 = straight)
                ub = env.rx[env.index(f'U.{SRX_PORT[srx]}')]; rb = env.rx[jb]
                out.append(dict(spot=fs, uyaw=uy, srx=srx, port=SRX_PORT[srx], twist=round(tw), bend=round(bend), height_mm=round(float(ub['seat'][2]) * 1000),
                                base_height_mm=round(float(rb['seat'][2]) * 1000), dist_root=round(math.dist(SPOTS[fs], SPOTS[R]), 2), dist_w1foot=round(math.dist(SPOTS[fs], SPOTS[W1]), 2)))
    out.sort(key=lambda c: (c['bend'], c['twist']))
    return out[:limit]


if __name__ == '__main__':
    which = int(sys.argv[2]) if len(sys.argv) > 2 else 0; ports = tuple(int(x) for x in sys.argv[3].split(',')) if len(sys.argv) > 3 else (0, 1, 2, 3)
    c = candidates(int(sys.argv[1]) if len(sys.argv) > 1 else 8, which, ports, float(sys.argv[4]) if len(sys.argv) > 4 else 0.6)
    print(f'{len(c)} bridge candidates (W1 from its root receiver into a spine receiver of an upright U), straightest first:')
    for x in c: print('  ', x)
    json.dump(dict(base=base_shape(which), cands=c), open(os.path.join(tpath('logs'), f'bridge_cands_{which}.json'), 'w'), indent=1)
