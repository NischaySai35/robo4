"""gallery.py — short, watchable TRANSFORMATIONS recorded in real physics (disturbances on), for the Studio's
"Transformations" section (served by verify_service /transform?name=NAME&seed=SEED from logs/tf_NAME_SEED.json).
   py -3.12 gallery.py T2 SEED        2 modules: both upright -> one walks over and docks its end into the other's side = T"""
from paths import tpath
import sys, os, json, time, copy; sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
import shape_build, phys_world
from snap import Snapper
from watchdog import Watchdog
BASE = json.load(open(tpath('logs/shapes_v1.json')))[2]


def record_shape(name, shape, seed, fps=25):
    cap = {}; orig = phys_world.PhysWorld.run
    def run(self, *a, **k):
        if 'W' not in cap:
            S = Snapper(self, tpath('logs/snaps'), f'gallery_{name}_{seed}'); cap['W'] = Watchdog(self, S, abort=True); cap['W'].stage = name; self.on_tick = cap['W'].tick
        return orig(self, *a, **k)
    phys_world.PhysWorld.run = run
    t0 = time.time(); stages = []
    r = shape_build.build(shape, seed, record=fps, log=lambda s: (print(s), stages.append(s)), keep_world=True)
    w = r['world']; run_ = r['run']
    ev = [dict(t=0.6, label='all modules standing in their floor receivers')]
    t = 0.6
    for dk in r['docks']: t += dk['s']; ev.append(dict(t=round(t, 2), label=f"{dk['walker']} docks its End B into {dk['target']}" + (' OK' if dk['ok'] else ' FAILED')))
    ev.append(dict(t=round(float(w.d.time), 2), label=f"holds under gravity 3 s ({r['hold_drift_mm']} mm)"))
    run_['events'] = ev
    st = [dict(stage=e['label'], ok='FAILED' not in e['label']) for e in ev[1:]]
    out = dict(pair=name, stages=st, ok=r['locked'] == r['of'], run=run_)
    json.dump(out, open(os.path.join(tpath('logs'), f'tf_{name}_{seed}.json'), 'w'))
    print(f"{name} robot {seed}: {r['locked']}/{r['of']} locked, hold {r['hold_drift_mm']} mm, {len(run_['frames'])} frames | wall {time.time() - t0:.0f} s | watchdog {[f['msg'] for f in cap['W'].flags]}")
    print('picture', cap['W'].S.shot(f"{name}: done"))


if __name__ == '__main__':
    name, seed = sys.argv[1], int(sys.argv[2])
    if name == 'T2':
        s = copy.deepcopy(BASE); s['docks'] = s['docks'][:1]            # root + one walker (spot 29 -> R.S1B)
        record_shape('T2', s, seed)
