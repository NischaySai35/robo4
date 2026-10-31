"""ckpt_build.py — build a shape ONCE and save the world after it (checkpoint), with the watchdog + pictures on.
Later tests start from the checkpoint (PhysWorld.load) and run only their own piece.
   py -3.12 ckpt_build.py PAIR SEED OUT.pkl [abort]        PAIR from tf_run.tf_pairs(): builds its shape A, with every floor
   receiver and lock its moves will need (a world must know its locks from the start)"""
from paths import tpath
import sys, os, json, time; sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
import shape_build, phys_world
from snap import Snapper
from watchdog import Watchdog
SNAPDIR = os.environ.get('SNAP', tpath('logs/snaps'))
import tf_run, tf_plan
pair, seed, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
shape, ops = tf_run.tf_pairs()[pair]; extra, xlocks = tf_plan.needs(shape, ops)
cap = {}
orig = phys_world.PhysWorld.run
def run(self, *a, **k):                       # attach pictures + watchdog to the world shape_build makes
    if 'W' not in cap:
        S = Snapper(self, SNAPDIR, f'ckpt_{os.path.basename(out)[:-4]}'); cap['W'] = Watchdog(self, S, abort=len(sys.argv) > 4 and sys.argv[4] == '1')
        cap['W'].stage = 'build shape'; self.on_tick = cap['W'].tick
    return orig(self, *a, **k)
phys_world.PhysWorld.run = run
REC = int(os.environ.get('REC', '0')) or None
t0 = time.time(); r = shape_build.build(shape, seed, log=print, keep_world=True, extra_spots=extra, extra_locks=xlocks, record=REC); w = r['world']
print(f"built {r['locked']}/{r['of']} | hold drift {r['hold_drift_mm']} mm | sim {w.d.time:.1f} s | wall {time.time() - t0:.0f} s | watchdog flags {[f['msg'] for f in cap['W'].flags]}")
if REC:                                                       # this piece's frames, for stitching into one watchable run
    json.dump(dict(bodies=w.view_names, frame0=w.nominal_poses, frames=w.rec['frames'], fps=REC, receivers=r['run']['receivers'],
                   events=[dict(t=0.6, label='all modules standing in their floor receivers')] + [dict(t=None, label=f"{x['walker']} docks End B into {x['target']}" + (' OK' if x['ok'] else ' FAILED')) for x in r['docks']] + [dict(t=round(float(w.d.time), 2), label='shape A built and holding OK')]),
              open(out.replace('.pkl', '.rec.json'), 'w'))
    w.rec = None
w.save(out, extra=dict(locks=r['locks'], floor=[l for l in r['locks'] if 'floor' in l['a']], shape=shape, seed=seed, pair=pair))
print('saved', out, '| picture', cap['W'].S.shot(f"checkpoint: {r['locked']}/{r['of']} locked"))
