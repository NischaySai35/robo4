"""build_verbs.py — the VERB LIBRARY (handoff 16.1 #5): success rate + time per connection type, counted from
GPU run logs only (no typed-in numbers). Writes C:\\TETROBOT\\sim\\verbs.json and prints it.
   py -3.12 build_verbs.py
Edit RUNS below when new runs are made (only runs AFTER the 26 Oct fixes: magnet pull-in + contact bits 4/6)."""
from paths import tpath
import json, os, numpy as np
LOGS = tpath('logs')
RUNS = {
    'dock_floor': [('walk', 'gpu_walk_mag1.json')],                         # end into a floor receiver (walking)
    'dock_end_side': [('multi', 'gpu_multi_es_ee46.json'), ('multi', 'gpu_multi_es_ee46_s23.json')],
    'dock_end_end': [('multi', 'gpu_multi_ee_ee46.json'), ('multi', 'gpu_multi_ee_prerot.json')],
}


def from_multi(path):
    J = json.load(open(path)); fin = [w['info'] for w in J['worlds'] if 'ok' in w['info']]
    return dict(started=len(J['worlds']), finished=len(fin), ok=sum(1 for x in fin if x['ok']), times=[x['t'] for x in fin if x['ok']])


def from_walk(path):
    J = json.load(open(path))
    return dict(started=J['N'], finished=J['docks'], ok=J['docks_ok'], times=[])


out = {'_note': 'counted from GPU logs (random robots, judge ON). successP = ok / finished; unfinished = hit the run time cap, not counted as failures.', 'verbs': {}}
for verb, runs in RUNS.items():
    agg = dict(started=0, finished=0, ok=0, times=[]); src = []
    for kind, f in runs:
        p = os.path.join(LOGS, f)
        if not os.path.exists(p): continue
        r = from_multi(p) if kind == 'multi' else from_walk(p)
        for k in ('started', 'finished', 'ok'): agg[k] += r[k]
        agg['times'] += r['times']; src.append(f)
    p = agg['ok'] / agg['finished'] if agg['finished'] else 0.0
    # planning value: (ok+1)/(finished+2) - "19 of 19" is not "always" (Laplace rule of succession)
    plan_p = (agg['ok'] + 1) / (agg['finished'] + 2) if agg['finished'] else 0.0
    if agg['ok'] == 0: plan_p = 0.0                                    # never seen to work: the planner must not use it
    out['verbs'][verb] = dict(successP=round(plan_p, 3), observed=round(p, 3), ok=agg['ok'], finished=agg['finished'], started=agg['started'],
                              durationS=round(float(np.median(agg['times'])), 1) if agg['times'] else None, sources=src)
json.dump(out, open(tpath('sim/verbs.json'), 'w'), indent=1)
# the Studio planner reads these (success + time only; its other numbers stay). walk_step = a floor dock in a walk.
PC = r'D:\robo4\studio\src\robotics\msrr2\plannerConfig.json'
cfg = json.load(open(PC, encoding='utf-8'))
for verb, v in out['verbs'].items():
    for name in ([verb, 'walk_step'] if verb == 'dock_floor' else [verb]):
        if name in cfg['verbs']:
            cfg['verbs'][name]['successP'] = v['successP']
            if v['durationS']: cfg['verbs'][name]['durationS'] = v['durationS']
            cfg['verbs'][name]['note'] = f"GPU-measured {v['ok']}/{v['finished']} finished OK ({', '.join(v['sources'])}); planning value (ok+1)/(n+2)"
json.dump(cfg, open(PC, 'w', encoding='utf-8'), indent=2)
print(json.dumps(out, indent=1))
