"""tf_piece.py — run ONE PIECE of a planned shape change from a checkpoint (watchdog + pictures on), save the next checkpoint.
   py -3.12 tf_piece.py CKPT_IN FIRST_OP LAST_OP [CKPT_OUT]      ops = tf_run.tf_pairs()[pair][1] (the pair is in the checkpoint)"""
from paths import tpath
import sys, os, time, json; sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
import io, contextlib
from phys_world import PhysWorld
import tf_plan as P
from snap import Snapper
from watchdog import Watchdog, Stalled
with contextlib.redirect_stdout(io.StringIO()):
    import tf_run
src, a, b = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); dst = sys.argv[4] if len(sys.argv) > 4 else None
t0 = time.time(); pw, ex = PhysWorld.load(src); ops = tf_run.tf_pairs()[ex['pair']][1]
w = P.CPUWorld.from_world(pw, ex['floor']); cur = list(ex['locks'])
tag = f"{os.path.basename(src)[:-4]}_ops{a}-{b}"
S = Snapper(pw, os.environ.get('SNAP', tpath('logs/snaps')), tag); W = Watchdog(pw, S, abort=os.environ.get('WATCHDOG_ABORT', '1') == '1'); pw.on_tick = W.tick
REC = int(os.environ.get('REC', '0'))
if REC: pw.rec = {'dt': 1.0 / REC, 'last': pw.d.time, 'frames': []}
print(f"loaded {src} at sim t={pw.d.time:.1f} s ({time.time() - t0:.0f} s) | picture {S.shot('loaded checkpoint')}", flush=True)
st = []
for k in range(a, b + 1):
    W.stage = ops[k]['label'] if ops[k]['op'] != 'hold' else None          # a hold is SUPPOSED to be still
    W.hist.clear(); W.quiet_since = None                                    # judge each stage on its own
    try: st += P.execute(w, w.make_env, [ops[k]], cur, ex['seed'] + k, print)
    except Stalled as e: print('  STOPPED by watchdog:', e); break
    print(f"    picture {S.shot(ops[k]['label'] + (': OK' if st and st[-1]['ok'] else ': FAILED'))} | wall {time.time() - t0:.0f} s", flush=True)
    if not st[-1]['ok']: break
    if dst:                                                                 # a checkpoint after EVERY move: any later piece can start here
        p_ = dst.replace('.pkl', f'_after{k}.pkl'); pw.save(p_, extra=dict(ex, locks=list(cur), floor=[l for l in cur if 'floor' in l['a']])); print('    saved', p_)
ok = len(st) == b - a + 1 and all(x['ok'] for x in st)
print(f"PIECE {'OK' if ok else 'FAILED'} ops {a}-{b} | sim t={pw.d.time:.1f} s | wall {time.time() - t0:.0f} s | watchdog {[f['msg'] for f in W.flags]}")
if REC and dst:
    json.dump(dict(frames=pw.rec['frames'], events=[dict(t=x['t'], label=x['stage'] + (' OK' if x['ok'] else ' FAILED')) for x in st],
                   floor=[l for l in cur if 'floor' in l['a']]), open(dst.replace('.pkl', '.rec.json'), 'w')); pw.rec = None
if ok and dst: pw.save(dst, extra=dict(ex, locks=cur, floor=[l for l in cur if 'floor' in l['a']])); print('saved', dst)
