"""stitch.py — join recorded PIECES (ckpt_build REC=..., tf_piece REC=...) into one watchable run for the Studio
   py -3.12 stitch.py NAME SEED first.rec.json piece1.rec.json ...     -> logs/tf_NAME_SEED.json (verify_service /transform?name=NAME)"""
from paths import tpath
import sys, json, os
name, seed, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
first = json.load(open(files[0])); run = dict(bodies=first['bodies'], frame0=first['frame0'], fps=first['fps'], randomized=True, seed=seed, finite=True,
                                            frames=list(first['frames']), events=[e for e in first['events'] if e['t'] is not None])
rcv0 = first['receivers']; ats = [dict(t=0.0, receivers=rcv0)]
for f in files[1:]:
    P = json.load(open(f)); run['frames'] += P['frames']; run['events'] += P['events']
    lk = {l['a']['floor']: f"{l['b']['module']}.{l['b']['port']}" for l in P['floor']}
    t_step = next((e['t'] for e in P['events'] if ' walks ' in e['label'] and e['label'].endswith(' OK')), None)
    if t_step is not None: ats.append(dict(t=t_step, receivers=[dict(r, locked=lk.get(r['id'])) for r in rcv0]))
run['frames'].sort(key=lambda x: x['t']); run['receivers_at'] = ats; run['receivers'] = ats[-1]['receivers']
st = [dict(stage=e['label'].rsplit(' ', 1)[0], ok=e['label'].endswith(' OK')) for e in run['events'][1:]]
json.dump(dict(pair=name, stages=st, ok=all(x['ok'] for x in st), run=run), open(os.path.join(tpath('logs'), f'tf_{name}_{seed}.json'), 'w'))
print(f"tf_{name}_{seed}.json: {len(run['frames'])} frames, {run['frames'][0]['t']:.1f}-{run['frames'][-1]['t']:.1f} s, events: {[e['label'] for e in run['events']]}")
