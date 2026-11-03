"""teacher_dik.py — teacher data for the AI model (main plan step 2, 3 Nov): the live DIK + VSEPR docking brain (manual.coop_connect)
runs many connection tasks, each from a slightly different start, and every 60 ms tick is recorded: what the robot sees and what
the teacher did. The AI model learns from these first (imitation), RL improves on it afterwards.

One task = a scene (data/teacher/scenes.json), a connection (docking connector -> target connector) and a random nudge of every
joint (+-NUDGE deg) before it starts. Ideal robot (exact joints, no randomness): the teacher's own moves, nothing else.
Per tick, in the TARGET connector's frame (so it does not matter where the robot lies in the room):
    obs: tip offset (3, m), tip axis (3), pad turn (1, rad), phase (0 line up / 1 go in), every module's 7 joints (padded to 6 modules)
    act: the joint step the teacher sent (rad, same padding)
Output: data/teacher/<run>/ep_<n>.npz (obs, act, mask) + episodes.jsonl (task, locked?, seconds). Runs on the CPU cores in parallel
(the DIK is a small QP per tick on the CPU); the GPU version comes once this data trains something.
    py -3.12 teacher_dik.py RUN_NAME N_TASKS [WORKERS]        e.g.  py -3.12 teacher_dik.py t1 32 8
    py -3.12 teacher_dik.py RUN_NAME N_TASKS WORKERS dagger   the run's bc.pt DRIVES, DIK's step is recorded as the label (DAgger:
        the model learns what to do in the places its own mistakes take it - plain copying never shows it those). Torch per worker: <= 4 workers
REUSE-CHECKED: teacher|dataset|record -> gpu_teacher.py (the old single-module walk/dock brain, greenlets) and gpu_brain.py; this
records the NEW brain (DIK + VSEPR, any module count) through manual.Manual.recorder, nothing re-implemented.
"""
import os, sys, json, time, math, multiprocessing as mp, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, 'deploy'))
from paths import tpath

MAXMOD = 6
NUDGE = float(os.environ.get('TEACHER_NUDGE', '3'))        # deg: every joint nudged by up to this before a task
SECONDS = float(os.environ.get('TEACHER_SECONDS', '30'))    # sim seconds a task may take
# connections that lock from a straight start (3 Nov matrix); the nudge makes every task different
TASKS = [('chain2', 'M1.A', 'M2.B'), ('chain3', 'M1.A', 'M3.B'), ('chain3', 'M3.B', 'M1.S1A'), ('chain3', 'M3.B', 'M1.S1B'),
         ('chain3', 'M3.B', 'M1.S2A'), ('chain3', 'M3.B', 'M1.S2B'), ('chain3', 'M1.A', 'M3.S1A'), ('chain3', 'M3.B', 'M2.S1A'),
         ('chain3', 'M1.A', 'M2.S2B'), ('chain4', 'M1.A', 'M4.B'), ('chain5', 'M1.A', 'M5.B'),
         ('standing', 'M1.B', 'M2.S2B'), ('standing', 'M1.B', 'M2.S1A'), ('standing', 'M2.B', 'M1.B'), ('stand_tested', 'M1.B', 'M2.S1B'),
         ('end_end_tested', 'M1.B', 'M2.B'), ('stand_chain', 'M2.B', 'M1.S1A')]


def obs_of(r, ids):
    """one tick -> (obs, act, mask) in the target connector's frame"""
    Rt = r['Rt']; q = np.zeros((MAXMOD, 7)); a = np.zeros((MAXMOD, 7)); mask = np.zeros(MAXMOD)
    for k, mid in enumerate(r['mods']):
        i = ids.index(mid); q[i] = r['q'][k * 7:k * 7 + 7]; a[i] = r['dq'][k * 7:k * 7 + 7]; mask[i] = 1
    head = np.r_[Rt.T @ (r['tip'] - r['seat']), Rt.T @ r['nE'], [r['slot'], 0.0 if r['phase'] == 'line up' else 1.0]]
    return np.r_[head, q.ravel()], a.ravel(), mask


def run_task(args):
    n, (scene, a, b), out, seed = args[:4]; bc = args[4] if len(args) > 4 else None   # bc: a trained model's file -> it drives (teacher_bc.py try)
    import io, contextlib
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        import manual as M
    sc = json.load(open(tpath('teacher/scenes.json')))[scene]
    rows = []; t0 = time.time()
    try:
        os.environ['COOP_SECONDS'] = str(SECONDS)
        s = M.Manual(sc, seed=1, pace=False, randomize=False, disturb=False, judge='off', ideal=True, log=lambda *x: None); s._log = None
        rng = np.random.default_rng(seed); w = s.w
        for i in range(len(w.ids)): w.tgt[i * 9:i * 9 + 7] += np.radians(rng.uniform(-NUDGE, NUDGE, 7))
        w.run(2.0)
        s.recorder = lambda r: rows.append(obs_of(r, w.ids))
        if bc:
            import teacher_bc; s.policy = teacher_bc.policy_fn(bc, w.ids)
        ok = bool(s.connect(a, b)); simt = float(w.d.time)
    except Exception as e:
        ok, simt = False, -1.0; err = f'{type(e).__name__}: {e}'
    else:
        err = ''
    if rows:
        o, ac, mk = map(np.array, zip(*rows))
        np.savez_compressed(os.path.join(out, f'ep_{n:05d}.npz'), obs=o.astype(np.float32), act=ac.astype(np.float32), mask=mk.astype(np.float32))
    return dict(ep=n, scene=scene, a=a, b=b, seed=seed, locked=ok, dagger=bool(bc), ticks=len(rows), sim_s=round(simt, 1), wall_s=round(time.time() - t0, 1), error=err)


def main():
    run = sys.argv[1]; N = int(sys.argv[2]); W = int(sys.argv[3]) if len(sys.argv) > 3 else max(1, (os.cpu_count() or 2) // 2)
    out = tpath(f'teacher/{run}'); os.makedirs(out, exist_ok=True); log = os.path.join(out, 'episodes.jsonl')
    done = sum(1 for _ in open(log)) if os.path.exists(log) else 0          # a run can be continued: new episodes get new numbers
    dagger = len(sys.argv) > 4 and sys.argv[4] == 'dagger'
    if dagger and not os.path.exists(os.path.join(out, 'bc.pt')): sys.exit(f'dagger: no {out}/bc.pt yet - train first (teacher_bc.py {run})')
    jobs = [(done + k, TASKS[(done + k) % len(TASKS)], out, 1000 + done + k) + ((os.path.join(out, 'bc.pt'),) if dagger else ()) for k in range(N)]
    t0 = time.time(); ok = 0
    print(f'teacher: {N} tasks on {W} cores -> {out}' + (' (DAgger: the model drives, DIK labels)' if dagger else ''), flush=True)
    with mp.get_context('spawn').Pool(W) as pool, open(log, 'a') as f:
        for k, r in enumerate(pool.imap_unordered(run_task, jobs)):
            f.write(json.dumps(r) + '\n'); f.flush(); ok += r['locked']
            el = time.time() - t0; left = el / (k + 1) * (N - k - 1)
            print(f"[{k + 1}/{N} {100 * (k + 1) / N:.0f}%] {r['scene']} {r['a']}+{r['b']} {'LOCKED' if r['locked'] else 'NOT'} {r['sim_s']} s sim, {r['ticks']} ticks"
                  f" | locked {ok}/{k + 1} | {el:.0f} s, ~{left:.0f} s left" + (f" | {r['error']}" if r['error'] else ''), flush=True)


if __name__ == '__main__':
    main()
