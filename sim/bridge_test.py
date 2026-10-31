"""bridge_test.py — a BRIDGE in real physics (the start of flat tops: table / chair). One random robot:
  1. R upright (spot 15) + W1 docks End B into R.S1B (the reliable shape's first dock) + U stands upright at CAND's spot
  2. W1 unlocks its floor foot and peels End A off (walk.py peel + pull-out, base = R's spine)
  3. W1, hanging from R, docks End A into U's spine receiver (stand-off 2.5 cm, 2 attempts) -> W1 spans R and U
  4. gravity 3 s: the bridge must hold (tips move < 5 mm)
   py -3.12 bridge_test.py CAND_INDEX SEED        (candidates from bridge_search.py -> logs/bridge_cands.json)"""
from paths import tpath
import sys, os, json, time, io, contextlib, numpy as np
sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
import shape_build
from phys_dock import PhysDockEnv, dock, peel_after_dock


def bridge(cand, seed, log=print, record=None, base=None, snap=None):
    t0 = time.time(); B = base or json.load(open(tpath('logs/bridge_cands.json')))['base']
    s = dict(B, extra=[dict(walker=cand['spot'], wyaw=cand['uyaw'], into='R', srx=0)])     # U = module X1, upright; its own dock is never run
    w1spot = B['docks'][0]['walker']; port = {0: 'S1A', 1: 'S1B', 2: 'S2A', 3: 'S2B'}[B['docks'][0]['srx']]
    L_BR = {'a': {'module': 'X1', 'port': cand['port']}, 'b': {'module': 'W1', 'port': 'A'}}
    L_FOOT = {'a': {'floor': f'S{w1spot}'}, 'b': {'module': 'W1', 'port': 'A'}}
    with contextlib.redirect_stdout(io.StringIO()):
        w, floor, docks, spot_of, anchors = shape_build.place_shape(s, seed, True, extra_locks=[L_BR])
    for lk in floor: w.engage(lk)
    if record: w.rec = {'dt': 1.0 / record, 'last': -1.0, 'frames': []}
    S = None
    if snap:                                   # pictures every 10 s of sim time + at every stage
        from snap import Snapper
        S = Snapper(w, snap, f'bridge_{cand["spot"]}{cand["port"]}_{seed}'); w.on_tick = lambda: S.tick('running')
    w.run(0.5); cur = list(floor); st = []

    def stage(name, ok, det):
        st.append(dict(stage=name, ok=bool(ok), detail=det, t=round(float(w.d.time), 2))); log(f"  {name}: {'OK' if ok else 'FAILED'} | {det}")
        if S: log('    picture: ' + S.shot(f"{name}: {'OK' if ok else 'FAILED'}"))
        return ok

    lk = docks[0]
    for a in range(2):
        ok, info = dock(PhysDockEnv(w, 'W1', seed=seed * 101 + 1000 * a), 'A', f'F:S{w1spot}', f'R.{port}', max_frames=1500)
        if ok: break
        w.set_locks(cur); o = 9 * w.ids.index('W1'); w.tgt[o:o + 7] = 0.0; w.run(3.0)
    if ok: w.engage(lk); cur.append(lk)
    if stage(f'W1 docks End B into R.{port}', ok, f"gap {info['axial_mm']} side {info['radial_mm']} mm"):
        w.release(L_FOOT); cur = [x for x in cur if x != L_FOOT]; w.set_locks(cur)
        out, lg = peel_after_dock(PhysDockEnv(w, 'W1', seed=seed * 7 + 1), 'B', f'R.{port}', f'F:S{w1spot}')
        if stage('W1 peels its foot off the floor (hangs from R)', out, lg[-1][:110] if lg else ''):
            for a in range(2):
                ok, info = dock(PhysDockEnv(w, 'W1', seed=seed * 7 + 2 + 1000 * a), 'B', f'R.{port}', f"X1.{cand['port']}", max_frames=1500, hover_far=0.025)
                if ok: break
                w.set_locks(cur); w.run(2.0)          # the robot backs off (rotor open) and tries again from where it hangs
            if ok: w.engage(L_BR); cur.append(L_BR)
            if stage(f"W1 docks End A into U.{cand['port']} (bridge)", ok, f"gap {info['axial_mm']} side {info['radial_mm']} mm, touching {info['touching']}"):
                tips = lambda: np.array([w.d.site_xpos[w.mod[m]['end'][e]['tip']] for m in w.ids for e in 'AB'])
                p0 = tips(); peak, fin = w.run(3.0); drift = float(np.linalg.norm(tips() - p0, axis=1).max()) * 1000
                stage('bridge holds under gravity 3 s', fin and drift < 5, f'tips moved {drift:.1f} mm, peak servo {peak:.0f}%')
    ok = len(st) == 4 and all(x['ok'] for x in st)
    out = dict(cand=cand, seed=seed, stages=st, ok=ok, wall_s=round(time.time() - t0))
    if record:
        lkd = {l['a']['floor']: f"{l['b']['module']}.{l['b']['port']}" for l in cur if 'floor' in l['a']}
        out['run'] = dict(bodies=w.view_names, frame0=w.nominal_poses, frames=w.rec['frames'], fps=record, randomized=True, seed=seed, finite=True,
                          events=[dict(t=x['t'], label=x['stage'] + (' OK' if x['ok'] else ' FAILED')) for x in st],
                          receivers=[dict(id=a['id'], x=a['x'], z=a['z'], locked=lkd.get(a['id'])) for a in anchors])
    return out


if __name__ == '__main__':
    ci, seed = int(sys.argv[1]), int(sys.argv[2]); fps = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3] != '0' else None
    cf = sys.argv[4] if len(sys.argv) > 4 else tpath('logs/bridge_cands.json'); J = json.load(open(cf)); cand = J['cands'][ci]
    o = bridge(cand, seed, record=fps, base=J['base'], snap=os.environ.get('SNAP'))
    print(f"cand {ci} {cand} robot {seed}: BRIDGE {'OK' if o['ok'] else 'FAILED'} ({o['wall_s']} s)", flush=True)
    if fps: json.dump(o, open(rf'C:\TETROBOT\logs\tf_bridge{ci}_{seed}.json', 'w'))   # served by verify_service /transform?name=bridge{ci}
