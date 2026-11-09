# REUSE-CHECKED: no sweep runner existed (grep SURFACE_DEG: only manual.py); this only launches manual.py's own __main__
"""the docking sweep in one short command: py -3.12 sweep.py  (16 runs, 4 at a time; same seed+surface = same result, so parallel is safe)
writes data/logs/surface_sweep.txt and prints the score"""
import os, sys, subprocess, concurrent.futures as cf
from paths import tpath
HERE = os.path.dirname(os.path.abspath(__file__))
JOBS = [(sd, s) for sd in (1, 2) for s in (0, 45, 90, 135, 180, -45, -90, -135)]

def one(job):
    sd, s = job
    env = dict(os.environ, SEED=str(sd), SURFACE_DEG=str(s))
    out = subprocess.run([sys.executable, 'manual.py', '../data/teacher/scenes.json', 'standing', 'M1.B', 'M2.S1A'], cwd=HERE, env=env,
                         capture_output=True, text=True, encoding='utf-8', errors='replace').stdout
    line = next((l for l in out.splitlines() if l.startswith('RESULT')), f'RESULT seed{sd} surf{s}: CRASHED')
    print(f'seed {sd} surface {s:>4}: {"LOCKED" if ": LOCKED" in line else "not locked"}', flush=True)
    return line

with cf.ThreadPoolExecutor(int(os.environ.get('PAR', '4'))) as ex: lines = list(ex.map(one, JOBS))
open(tpath('logs/surface_sweep.txt'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print(f'\n{sum(": LOCKED" in l for l in lines)}/16 locked -> data/logs/surface_sweep.txt')
