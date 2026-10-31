"""tf_run.py — one random robot does a planned shape change on the CPU (debugging / recording; measure on the GPU).
   py -3.12 tf_run.py PAIR SEED [fps]      PAIR = name in tf_pairs() (e.g. W2_S8toS1)  -> logs/tf_PAIR_SEED.json with fps"""
from paths import tpath
import sys, json, time, io, contextlib, copy; sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
import tf_plan as P


def tf_pairs():
    """the shape changes we measure, by name: (shape A to build first, the planned moves)"""
    A = json.load(open(tpath('logs/shapes_v1.json')))[2]
    B = copy.deepcopy(A); B['docks'][1].update(walker=1, srx=0)          # transform.py: W2 S8 -> S1, R.S2A -> R.S1A
    C = copy.deepcopy(B); C['docks'][0].update(walker=22)                # then W1 S29 -> S22, out of R.S1B and back in
    return {'W2_S8toS1': (A, P.plan(A, B)), 'chain_ABC': (A, P.chain([A, B, C])), 'chain_ABA': (A, P.chain([A, B, A]))}


if __name__ == '__main__':
    name, seed = sys.argv[1], int(sys.argv[2]); fps = int(sys.argv[3]) if len(sys.argv) > 3 else None
    A, ops = tf_pairs()[name]; t0 = time.time()
    with contextlib.redirect_stdout(io.StringIO()):
        w = P.CPUWorld(A, ops, seed=seed, record=fps)
    st = P.run(w, w.make_env, A, ops, seed)
    ok = all(s['ok'] for s in st) and len(st) == 1 + len(ops)
    print(f"{name} robot {seed}: TRANSFORM {'OK' if ok else 'FAILED'} ({time.time() - t0:.0f} s wall)", flush=True)
    if fps:
        pw = w.pw
        run = dict(bodies=pw.view_names, frame0=pw.nominal_poses, frames=pw.rec['frames'], fps=fps, randomized=True, seed=seed,
                   events=[dict(t=s['t'], label=s['stage'] + (' OK' if s['ok'] else ' FAILED')) for s in st])
        # floor receivers over time: a foot moves when its step stage is done
        lk = {l['a']['floor']: f"{l['b']['module']}.{l['b']['port']}" for l in w.floor_locks}
        mk = lambda: [dict(id=a['id'], x=a['x'], z=a['z'], locked=lk.get(a['id'])) for a in w.anchors]
        run['receivers_at'] = [dict(t=0.0, receivers=mk())]
        for o, s_ in zip(ops, st[1:]):
            if o['op'] == 'step' and s_['ok']:
                lk.pop(o['old_lock']['a']['floor'], None); lk[o['new_lock']['a']['floor']] = f"{o['mid']}.{o['new_lock']['b']['port']}"
                run['receivers_at'].append(dict(t=s_['t'], receivers=mk()))
        run['receivers'] = run['receivers_at'][-1]['receivers']
        json.dump(dict(pair=name, stages=st, ok=ok, plan=[o['label'] for o in ops], run=run), open(rf'C:\TETROBOT\logs\tf_{name}_{seed}.json', 'w'))
