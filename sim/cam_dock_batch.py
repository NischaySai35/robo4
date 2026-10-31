"""cam_dock_batch.py PLAN.json STEP MID.END BASE_RX TARGET_RX N MODES [WORKERS] - the same dock on N random robots, in pieces:
checkpoint before step STEP (plan_ckpt.py) per robot, then cam_dock.py per robot and mode, WORKERS processes at a time.
Writes logs/camdock/batch_<target>.json and prints the good-dock table. LONG (minutes): a command for Nischay.
  e.g.  MARKERS=1 TAGS_PER_END=8 FLOOR_TAG_MM=35 CAM_RES=3840x2160 BELIEF=model \
        py -3.12 cam_dock_batch.py C:\\TETROBOT\\logs\\roomy_dock_S2B.json 1 M1.B F:F0 M2.S2B 16 off,cam,truth 8"""
from paths import tpath
import sys, os, json, subprocess, concurrent.futures as cf
plan, step, me, base, tgt, n, modes = sys.argv[1:8]; workers = int(sys.argv[8]) if len(sys.argv) > 8 else 8
SIM = tpath('sim'); OUT = tpath('logs/camdock'); CK = tpath('logs/ckpt'); os.makedirs(OUT, exist_ok=True)
tag = tgt.replace('.', '_'); seeds = range(1, int(n) + 1); modes = modes.split(',')
py = lambda *a: subprocess.run([sys.executable, *a], capture_output=True, text=True, cwd=SIM)
def ck(s):
    p = os.path.join(CK, f'batch_{tag}_{s}.pkl')
    if not os.path.exists(p): py(os.path.join(SIM, 'plan_ckpt.py'), plan, str(s), step, p)
    return p
def run(sm):
    s, md = sm; r = py(os.path.join(SIM, 'cam_dock.py'), ck(s), me, base, tgt, md, str(s))
    line = next((l for l in r.stdout.splitlines() if l.startswith('RESULT')), None)
    return dict(dict(seed=s, mode=md), **(json.loads(line[7:]) if line else dict(error=r.stderr[-400:])))
with cf.ThreadPoolExecutor(workers) as ex:
    list(ex.map(ck, seeds))                                     # checkpoints first (a few s each)
    res = list(ex.map(run, [(s, md) for s in seeds for md in modes]))
json.dump(res, open(os.path.join(OUT, f'batch_{tag}.json'), 'w'), indent=1)
for md in modes:
    R = [r for r in res if r['mode'] == md and 'error' not in r]; L = [r for r in R if r['locked']]
    print(f"{md:8s} locked {len(L)}/{len(R)} | good docks (locked, no bump, <= 20 s) {sum(r['good_dock'] for r in R)}/{len(R)} | "
          f"bumps in {sum(bool(r['bumps']) for r in R)} | locked times {sorted(r['seconds'] for r in L)} | errors {sum('error' in r for r in res if r['mode'] == md)}")
