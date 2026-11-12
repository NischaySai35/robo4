"""twin_suite.py — the Isaac twin test list: ONE case per Isaac run, PAR runs side by side, results gathered in one summary.

10/11 Nov: several cases inside ONE Isaac world break under load - Newton 1.6 loses the mesh (SDF) contacts once 3+ robot pairs share
a scene, and under docking load already with 2 (the End A locks let go). One pair per run is exact. So: separate runs, in parallel
as far as RAM allows (~5.5 GB each; PAR=2 on this 23 GB laptop).
   py -3.12 sim/twin_suite.py PLAN.json            -> data/logs/isaac_twin/suite_<plan>.txt (+ each case's log and pictures)
   PAR=2 (default) runs at once; EVERY (default 8) s between pictures
"""
# REUSE-CHECKED: runs isaac_twin.py (the twin itself) per case, like sweep.py runs manual.py per case; no suite runner for Isaac existed.
import os, sys, json, subprocess, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from paths import tpath
plan_path = sys.argv[1]; plan = json.load(open(plan_path)); name = os.path.splitext(os.path.basename(plan_path))[0]
out_dir = tpath('logs/isaac_twin'); os.makedirs(out_dir, exist_ok=True); summary = os.path.join(out_dir, f'suite_{name}.txt')
PAR = int(os.environ.get('PAR', '2')); t0 = time.time(); results = {}; running = []; todo = list(enumerate(plan, 1))


def start(i, case):
    tmp = os.path.join(out_dir, f'_case_{name}_{i}.json'); json.dump([case], open(tmp, 'w'))
    env = dict(os.environ, TAG=f'twin_{case["name"]}', EVERY=os.environ.get('EVERY', '8'),
               **{k: str(v) for k, v in case.get('env', {}).items()})                  # per-case switches (e.g. REAL_IMU 0)
    log = open(os.path.join(out_dir, f'_console_{case["name"]}.txt'), 'w', encoding='utf-8', errors='replace')
    p = subprocess.Popen([sys.executable, os.path.join(HERE, 'isaac_twin.py'), tmp], cwd=HERE, env=env, stdout=log, stderr=subprocess.STDOUT)
    print(f'=== start {i}/{len(plan)}: {case["name"]}  ({(time.time() - t0) / 60:.1f} min so far)', flush=True)
    return dict(i=i, case=case, p=p, log=log, t=time.time())


def finish(r):
    r['log'].close(); res = None
    for line in open(r['log'].name, encoding='utf-8', errors='replace'):
        if line.startswith('RESULT'): res = line.strip()
    results[r['i']] = res or f'RESULT {r["case"]["name"]}: NO RESULT (exit {r["p"].returncode}) - see {r["log"].name}'
    print(f'--- done {r["case"]["name"]} in {(time.time() - r["t"]) / 60:.1f} min: {results[r["i"]][:300]}', flush=True)
    open(summary, 'w', encoding='utf-8').write('\n'.join(results[k] for k in sorted(results)) + '\n')


while todo or running:
    while todo and len(running) < PAR: running.append(start(*todo.pop(0)))
    time.sleep(2)
    for r in [r for r in running if r['p'].poll() is not None]: running.remove(r); finish(r)
print(f'=== done: {len(plan)} cases in {(time.time() - t0) / 60:.1f} min -> {summary}', flush=True)
print('\n'.join(results[k] for k in sorted(results)), flush=True)
