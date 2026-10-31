"""plan_ckpt.py PLAN.json SEED STEP OUT.pkl - run a Studio plan in physics up to (not including) STEP and save a checkpoint
(the world + the locks so far), so step STEP can be run alone as a short piece (e.g. cam_dock.py)."""
from paths import tpath
import sys, json, time; sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
import phys_world
J = json.load(open(sys.argv[1])); P = J.get('plan', J); t0 = time.time()
out = phys_world.run_plan(P['scene'], P['plan'], randomize=True, seed=int(sys.argv[2]), ckpt_before=(int(sys.argv[3]), sys.argv[4]))
print('saved', out.get('ckpt'), 'after', [e['verb'] for e in out['events']], f'{time.time() - t0:.0f} s wall')
