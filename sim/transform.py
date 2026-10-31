"""transform.py — the first SHAPE CHANGE in real physics, using only the robot's own moves.
Shape A (shapes_v1[2]): root R + walkers W1, W2 docked into R's spine.  Then:
  1. W2 unlocks its End B from R's spine receiver and pulls it out   (walk.py peel, real magnets)
  2. W2 walks one step: End B docks into floor receiver S1, End A peels out of S8
  3. W2 docks its End A into a DIFFERENT spine receiver of R (S1A)    -> shape B
  4. gravity: does shape B hold?
Nothing is scripted kinematically: every dock / peel is the docking brain driving servos against contact + magnets.
   py -3.12 transform.py SEED [record_fps]       -> stage results; with record_fps also logs/transform_run_SEED.json"""
from paths import tpath
import sys, json, time, math; sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
import numpy as np
import shape_build
from phys_dock import PhysDockEnv, dock, peel_after_dock
from shape_search import SPOTS

SRC = json.load(open(tpath('logs/shapes_v1.json')))[2]
OLD_SPOT, NEW_SPOT = SRC['docks'][1]['walker'], 1              # W2 stands at spot 8 in shape A; spot 1 in shape B
OLD_PORT, NEW_PORT = shape_build.SRX_PORT[SRC['docks'][1]['srx']], 'S1A'
L_OLD = {'a': {'module': 'R', 'port': OLD_PORT}, 'b': {'module': 'W2', 'port': 'B'}}
L_FOOT_OLD = {'a': {'floor': f'S{OLD_SPOT}'}, 'b': {'module': 'W2', 'port': 'A'}}
L_FOOT_NEW = {'a': {'floor': f'S{NEW_SPOT}'}, 'b': {'module': 'W2', 'port': 'B'}}
HOVER_FAR = float(__import__('os').environ.get('TF_HOVER_FAR', '0.025'))   # stand-off before the spine dock (brain default 0.05)
L_NEW = {'a': {'module': 'R', 'port': NEW_PORT}, 'b': {'module': 'W2', 'port': 'A'}}


def transform(seed=1, randomize=True, record=None, log=print):
    t0 = time.time()
    r = shape_build.build(SRC, seed, randomize, record=record, log=lambda *a: None,
                          extra_spots=[NEW_SPOT], extra_locks=[L_FOOT_NEW, L_NEW], keep_world=True)
    w, cur = r['world'], list(r['locks'])
    stages = [dict(stage='build shape A', ok=r['locked'] == r['of'], detail=f"{r['locked']}/{r['of']} docks locked")]
    events = [dict(t=round(float(w.d.time), 2), label='build shape A' + (' OK' if r['locked'] == r['of'] else ' FAILED'))]
    log(f"seed {seed}: {stages[-1]['detail']}")
    if not stages[-1]['ok']: return _out(stages, w, r, record, cur, t0, events)
    key = lambda lk: json.dumps(lk, sort_keys=True)
    drop = lambda lk: [x for x in cur if key(x) != key(lk)]

    def stage(name, fn):
        ok, det = fn(); stages.append(dict(stage=name, ok=bool(ok), detail=det)); events.append(dict(t=round(float(w.d.time), 2), label=name + (' OK' if ok else ' FAILED')))
        log(f"  {name}: {'OK' if ok else 'FAILED'} | {det}"); return ok

    def undock():
        nonlocal cur
        w.release(L_OLD); cur = drop(L_OLD); w.set_locks(cur)
        out, lg = peel_after_dock(PhysDockEnv(w, 'W2', seed=seed * 31 + 1, randomize=randomize), 'A', f'F:S{OLD_SPOT}', f'R.{OLD_PORT}')
        # stand back up straight before walking (pose move, servos only): the peel leaves T1/B3 on their stops and the
        # docking IK can't leave that branch (physics, seed 1: stuck 6 mm / 1.5 deg off the hover point, T1 100 %, B3 100 %)
        if out: o = 9 * w.ids.index('W2'); w.tgt[o:o + 7] = 0.0; w.run(3.0)
        return out, (lg[-1][:120] if lg else '')

    def step_foot():
        nonlocal cur
        ok, info = dock(PhysDockEnv(w, 'W2', seed=seed * 31 + 2, randomize=randomize), 'A', f'F:S{OLD_SPOT}', f'F:S{NEW_SPOT}', max_frames=1500)
        if not ok:
            _diag(w, 'W2', log); w.set_locks(cur)
            return False, f"End B -> S{NEW_SPOT}: gap {info['axial_mm']} side {info['radial_mm']} mm, touching {info['touching']}"
        w.engage(L_FOOT_NEW); cur.append(L_FOOT_NEW)
        w.release(L_FOOT_OLD); cur = drop(L_FOOT_OLD); w.set_locks(cur)
        out, lg = peel_after_dock(PhysDockEnv(w, 'W2', seed=seed * 31 + 3, randomize=randomize), 'B', f'F:S{NEW_SPOT}', f'F:S{OLD_SPOT}')
        if out: o = 9 * w.ids.index('W2'); w.tgt[o:o + 7] = 0.0; w.run(3.0)     # stand up straight again (peel leaves B2/B3 on their stops)
        e2 = PhysDockEnv(w, 'W2', randomize=False); Rr = e2.rx[e2.index(f'F:S{NEW_SPOT}')]['R']; xb = w.d.xmat[e2.end['B']['body']].reshape(3, 3)[:, 0]
        yaw = math.degrees(math.atan2(xb @ Rr[:, 1], xb @ Rr[:, 0])) % 360
        return out, f"End B locked in S{NEW_SPOT} ({info['seconds']} s), its pad x at {yaw:.0f} deg in the receiver; End A out of S{OLD_SPOT}: {out}"

    def redock():
        nonlocal cur
        for attempt in range(2):
            ok, info = dock(PhysDockEnv(w, 'W2', seed=seed * 31 + 4 + attempt, randomize=randomize), 'B', f'F:S{NEW_SPOT}', f'R.{NEW_PORT}', max_frames=1500, hover_far=HOVER_FAR)
            if ok: break
            _diag(w, 'W2', log); [log('       ' + x[:160]) for x in info['log'][-6:]]
            w.set_locks(cur); o = 9 * w.ids.index('W2'); w.tgt[o:o + 7] = 0.0; w.run(3.0)
        if ok: w.engage(L_NEW); cur.append(L_NEW)
        else: w.set_locks(cur)
        return ok, f"End A -> R.{NEW_PORT}: gap {info['axial_mm']} side {info['radial_mm']} mm, {attempt + 1} attempt(s), touching {info['touching']}"

    if stage(f'W2 unlocks from R.{OLD_PORT} and pulls out', undock) and stage(f'W2 walks S{OLD_SPOT} -> S{NEW_SPOT}', step_foot) \
            and stage(f'W2 docks into R.{NEW_PORT} (shape B)', redock):
        mods = list(w.ids); d = w.d
        p0 = {m: d.xpos[w.mod[m]['end']['B']['body']].copy() for m in mods}
        peak, fin = w.run(3.0)
        drift = max(float(np.linalg.norm(d.xpos[w.mod[m]['end']['B']['body']] - p0[m])) for m in mods) * 1000
        stage('shape B holds under gravity 3 s', lambda: (fin and drift < 5, f'ends moved {drift:.1f} mm, peak servo {peak:.0f}%'))
    return _out(stages, w, r, record, cur, t0, events)


def _diag(w, mid, log):
    """why is a module stuck: what it touches (floor and receivers too), active welds on it, joints vs their stops"""
    m, d = w.m, w.d; mine = {i for i in range(m.nbody) if m.body(i).name.startswith(mid + '_')}; hits = {}
    for c in d.contact[:d.ncon]:
        b1, b2 = int(m.geom_bodyid[c.geom1]), int(m.geom_bodyid[c.geom2])
        if (b1 in mine) != (b2 in mine):
            a, o = (b1, b2) if b1 in mine else (b2, b1); k = f'{m.body(a).name}~{m.body(o).name}'; hits[k] = min(hits.get(k, 0.0), round(float(c.dist) * 1000, 1))
    welds = [k for k, i in w.eq.items() if d.eq_active[i] and mid in str(k)]
    env = PhysDockEnv(w, mid, randomize=False)
    log(f"     DIAG {mid}: contacts {hits} | active locks {welds} | joints % of stop {np.round(np.abs(d.qpos[env.qa]) / env.hi * 100).astype(int).tolist()}")


def _out(stages, w, r, record, cur, t0, events):
    out = dict(stages=stages, ok=all(s['ok'] for s in stages) and len(stages) == 5, wall_s=round(time.time() - t0))
    if record:
        run = r['run']; run['frames'] = w.rec['frames']; run['events'] = events
        floor_lk = {lk['a']['floor']: f"{lk['b']['module']}.{lk['b']['port']}" for lk in cur if 'floor' in lk['a']}
        run['receivers'] = [dict(rc, locked=floor_lk.get(rc['id'])) for rc in run['receivers']] + \
            ([dict(id=f'S{NEW_SPOT}', x=SPOTS[NEW_SPOT][0], z=-SPOTS[NEW_SPOT][1], locked=floor_lk.get(f'S{NEW_SPOT}'))] if all(rc['id'] != f'S{NEW_SPOT}' for rc in run['receivers']) else [])
        run['receivers_at'] = receivers_timeline(run['receivers'], events)
        out['run'] = run
    return out


def receivers_timeline(final, events):
    """which end is locked in each floor receiver over time: W2's foot sits in S{OLD} until its floor step is done"""
    start = [dict(rc, locked=('W2.A' if rc['id'] == f'S{OLD_SPOT}' else None if rc['id'] == f'S{NEW_SPOT}' else rc['locked'])) for rc in final]
    t_step = next((e['t'] for e in events if e['label'].startswith(f'W2 walks') and e['label'].endswith(' OK')), None)
    return [dict(t=0.0, receivers=start)] + ([dict(t=t_step, receivers=final)] if t_step is not None else [])


if __name__ == '__main__':
    seed = int(sys.argv[1]); fps = int(sys.argv[2]) if len(sys.argv) > 2 else None
    o = transform(seed, record=fps)
    print(f"seed {seed}: TRANSFORM {'OK' if o['ok'] else 'FAILED'} ({o['wall_s']} s wall)", flush=True)
    if fps:
        json.dump(dict(stages=o['stages'], ok=o['ok'], run=o['run']), open(rf'C:\TETROBOT\logs\transform_run_{seed}.json', 'w'))
