"""teacher_bc.py — main plan step 3, first rung (3 Nov): a small network learns to copy the DIK + VSEPR teacher (behaviour cloning)
from teacher_dik.py's recordings. It proves the pipeline end to end (data -> GPU training -> a policy file); the real model (bigger,
more data, H100s) and RL on top come after. Same net shape as train_gpu.py's PPO policy (256-256-128, ELU), so RL can start from it.
    py -3.12 teacher_bc.py RUN_NAME [EPOCHS]        reads data/teacher/RUN_NAME, writes data/teacher/RUN_NAME/bc.pt
    py -3.12 teacher_bc.py RUN_NAME try [N]         the trained model DRIVES N tasks (teacher_dik.run_task, fresh starts): does it lock?
Held-out check: the last 15 % of episodes are never trained on; their error says whether it learned or memorised.
REUSE-CHECKED: bc|imitat|policy|train -> train_gpu.py / train_dock*.py are PPO on the old single-module env (stable_baselines3);
nothing clones a recorded teacher yet. Net shape and ELU copied from train_gpu.py.
"""
import os, sys, glob, json, time
# one maths thread per process, set before numpy loads (the workers inherit it): OpenBLAS reserved a buffer per CPU thread,
# ~1 GB per process before the robot was even built (3 Nov: 1400 -> 390 MB per worker); parallel workers are the parallelism
for _v in ('OPENBLAS_NUM_THREADS', 'OMP_NUM_THREADS', 'MKL_NUM_THREADS'): os.environ.setdefault(_v, '1')
import numpy as np
# torch only where training happens (GPU): the recording workers run the model in numpy - torch in each of them filled the RAM (3 Nov)
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, 'deploy'))
from paths import tpath


def load(run, locked_only=True):
    eps = {json.loads(l)['ep']: json.loads(l) for l in open(tpath(f'teacher/{run}/episodes.jsonl'))}
    files = sorted(glob.glob(tpath(f'teacher/{run}/ep_*.npz')))
    # the teacher's own episodes only where they locked; DAgger episodes always (each tick's label is DIK's step, right even when the model failed)
    keep = [f for f in files if (not locked_only) or eps.get(int(os.path.basename(f)[3:8]), {}).get('locked') or eps.get(int(os.path.basename(f)[3:8]), {}).get('dagger')]
    return [np.load(f) for f in keep]


def make_net(i, o):
    import torch
    return torch.nn.Sequential(torch.nn.Linear(i, 256), torch.nn.ELU(), torch.nn.Linear(256, 256), torch.nn.ELU(),
                               torch.nn.Linear(256, 128), torch.nn.ELU(), torch.nn.Linear(128, o))


def export_np(pt):
    """bc.pt -> bc.npz: the same net as plain arrays (layer weights, input scaling), for numpy-only workers"""
    import torch
    ck = torch.load(pt, weights_only=False); sd = ck['net']; ks = sorted({k.split('.')[0] for k in sd}, key=int)
    out = pt[:-3] + '.npz'
    np.savez(out, mu=ck['mu'], sd=ck['sd'], ysd=ck['ysd'], n=len(ks), **{f'W{i}': sd[f'{k}.weight'].cpu().numpy() for i, k in enumerate(ks)},
             **{f'b{i}': sd[f'{k}.bias'].cpu().numpy() for i, k in enumerate(ks)})
    return out


def policy_fn(path, ids):
    """bc.pt / bc.npz -> manual.Manual.policy: one docking tick (manual's dict) -> the joint step for the modules in that task.
    Runs in numpy (ELU between layers, as make_net); torch is only touched if the .npz is missing"""
    import teacher_dik
    npz = path[:-3] + '.npz' if path.endswith('.pt') else path
    if not os.path.exists(npz) or (path.endswith('.pt') and os.path.getmtime(npz) < os.path.getmtime(path)): npz = export_np(path)
    z = np.load(npz); L = [(z[f'W{i}'], z[f'b{i}']) for i in range(int(z['n']))]; mu, sd, ysd = z['mu'], z['sd'], float(z['ysd'])
    def pol(r):
        o, _, _ = teacher_dik.obs_of(r, ids); x = (o - mu) / sd
        for i, (W, b) in enumerate(L):
            x = W @ x + b
            if i < len(L) - 1: x = np.where(x > 0, x, np.expm1(np.minimum(x, 0)))      # ELU
        a = (x * ysd).reshape(teacher_dik.MAXMOD, 7)
        return np.concatenate([a[ids.index(mid)] for mid in r['mods']])
    return pol


def try_policy(run, N):
    import teacher_dik as T, multiprocessing as mp, tempfile
    out = tempfile.mkdtemp(); bc = tpath(f'teacher/{run}/bc.pt')
    jobs = [(k, T.TASKS[k % len(T.TASKS)], out, 900000 + k, bc) for k in range(N)]       # starts never seen in recording (seeds 1000+)
    ok = 0; t0 = time.time()
    export_np(bc)                                                  # once here; the workers only read numpy
    with mp.get_context('spawn').Pool(min(int(os.environ.get('TEACHER_WORKERS', '3')), N)) as pool:   # ~1.2 GB RAM each
        for k, r in enumerate(pool.imap_unordered(T.run_task, jobs)):
            ok += r['locked']
            print(f"[{k + 1}/{N}] model drives {r['scene']} {r['a']}+{r['b']}: {'LOCKED' if r['locked'] else 'NOT'} {r['sim_s']} s | locked {ok}/{k + 1} | {time.time() - t0:.0f} s" + (f" | {r['error']}" if r['error'] else ''), flush=True)


def main():
    if len(sys.argv) > 2 and sys.argv[2] == 'try': return try_policy(sys.argv[1], int(sys.argv[3]) if len(sys.argv) > 3 else 16)
    import torch
    run = sys.argv[1]; epochs = int(sys.argv[2]) if len(sys.argv) > 2 else 200
    eps = load(run); n = len(eps)
    if n < 2: sys.exit(f'only {n} locked episodes in {run}: record more with teacher_dik.py')
    cut = max(1, int(n * 0.85)); tr, te = eps[:cut], eps[cut:]
    cat = lambda E, k: np.concatenate([e[k] for e in E])
    Xtr, Ytr, Mtr = cat(tr, 'obs'), cat(tr, 'act'), cat(tr, 'mask'); Xte, Yte, Mte = cat(te, 'obs'), cat(te, 'act'), cat(te, 'mask')
    mu, sd = Xtr.mean(0), Xtr.std(0) + 1e-6; ysd = float(Ytr.std() + 1e-9)           # inputs normalised, actions scaled to ~1
    dev = 'cuda' if torch.cuda.is_available() else 'cpu'
    T = lambda a: torch.tensor(a, dtype=torch.float32, device=dev)
    xtr, ytr, mtr, xte, yte, mte = T((Xtr - mu) / sd), T(Ytr / ysd), T(np.repeat(Mtr, 7, 1)), T((Xte - mu) / sd), T(Yte / ysd), T(np.repeat(Mte, 7, 1))
    net = make_net(xtr.shape[1], ytr.shape[1]).to(dev)
    opt = torch.optim.AdamW(net.parameters(), 1e-3, weight_decay=1e-4)
    mse = lambda p, y, m: (((p - y) * m) ** 2).sum() / m.sum().clamp(min=1)            # only the modules that exist in that task
    t0 = time.time(); base = float(mse(torch.zeros_like(yte), yte, mte))
    print(f'{n} locked episodes: train {len(tr)} ({len(xtr)} ticks), held out {len(te)} ({len(xte)} ticks), on {dev}', flush=True)
    for ep in range(epochs):
        net.train(); perm = torch.randperm(len(xtr), device=dev)
        for i in range(0, len(xtr), 512):
            b = perm[i:i + 512]; loss = mse(net(xtr[b]), ytr[b], mtr[b]); opt.zero_grad(); loss.backward(); opt.step()
        if ep % max(1, epochs // 10) == 0 or ep == epochs - 1:
            net.eval()
            with torch.no_grad(): tl, vl = float(mse(net(xtr), ytr, mtr)), float(mse(net(xte), yte, mte))
            print(f'epoch {ep:4d}: train {tl:.4f}  held-out {vl:.4f}  (doing nothing scores {base:.4f})  {time.time() - t0:.0f} s', flush=True)
    torch.save(dict(net=net.state_dict(), mu=mu, sd=sd, ysd=ysd, obs_dim=xtr.shape[1], act_dim=ytr.shape[1]), tpath(f'teacher/{run}/bc.pt'))
    export_np(tpath(f'teacher/{run}/bc.pt')); print('saved', tpath(f'teacher/{run}/bc.pt'), '+ bc.npz (numpy copy for the recording workers)')


if __name__ == '__main__':
    main()
