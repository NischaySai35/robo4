"""gpu_teacher.py — GPU teacher step 3 (1 Nov): the robot's own walking/docking brain for many robots in ONE process, with its
heavy maths batched on the GPU.

The brain code is unchanged (walk.py Walker + laptop_controller.DockController): every robot runs in a greenlet, as in
gpu_walk.py. What changes: whenever a brain asks the nominal model for its sag-aware end estimate (NOM._fk, ~9 times per
frame for the IK Jacobian, and hundreds of times inside the seed IK), it pauses; when every robot has paused or finished its
frame, ONE GPU call (gpu_brain.BatchedNOM) answers them all, each with its own gravity estimate. Same answers (parity
0.0002 mm), same decisions, far fewer CPU cycles. Physics: gpu_walk.GPUWalkPhys (MuJoCo Warp), robots: gpu_walk.ProxyEnv.
    py -3.12 gpu_teacher.py N MINUTES        e.g. 256 1.5   (walk_train.xml: 3 floor steps each)
"""
import os, sys, io, time, math, contextlib, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, 'deploy'))
from paths import tpath


def main():
    import greenlet, torch
    N = int(sys.argv[1]) if len(sys.argv) > 1 else 128; MAXMIN = float(sys.argv[2]) if len(sys.argv) > 2 else 1.5
    seed = int(os.environ.get('SEED', '7')); judge = os.environ.get('JUDGE', '1') == '1'
    t0 = time.time()
    with contextlib.redirect_stdout(io.StringIO()):
        import walk as WK, walk_env as W
        from gpu_walk import GPUWalkPhys, ProxyEnv
        from gpu_brain import BatchedNOM
    L = WK.L; xml = tpath('sim/walk_train.xml')
    ph = GPUWalkPhys(N, seed, xml); rows = ph.state(); grav = ph.grav.cpu().numpy()
    e = W.WalkEnv(seed=0, randomize=False, xml=xml)
    tm = dict(rx=e.rx, end=e.end, lo=e.lo, hi=e.hi, links=e.links, nsite=e.m.nsite, nbody=e.m.nbody, nq=e.m.nq)
    # the batched estimate, with a gravity per request (each controller has its own estimate on the shared nominal model)
    B = BatchedNOM(L.NOM, N); import warp as wp
    gtens = torch.zeros(N, 3, device='cuda'); gtens[:, 2] = -9.81; B.mm.opt.gravity = wp.from_torch(gtens, dtype=wp.vec3)
    main_g = greenlet.getcurrent(); cpu_fk = L.NOM._fk
    def fk(q):
        g = greenlet.getcurrent()
        if g is main_g: return cpu_fk(q)
        return main_g.switch(('fk', np.asarray(q, float).copy(), L.NOM.m.opt.gravity.copy()))
    L.NOM._fk = fk
    print(f'GPU ready: {N} random robots, setup {time.time() - t0:.0f} s', flush=True)
    envs = [ProxyEnv(tm, seed * 100000 + i, rows[i], main_g) for i in range(N)]
    logs = [[] for _ in range(N)]; info = [dict() for _ in range(N)]
    def make(i):
        def run():
            env = envs[i]; Wk = WK.Walker(env, 'A', 0, 0, grav[i], log=lambda s: logs[i].append(s))
            if judge: Wk.judge_fn = Wk.sim_camera
            Wk.curl = True; ok = True; n_ok = 0
            for j in range(1, len(env.rx)):
                try:
                    if not Wk.step_to(j): ok = False; break
                except Exception as ex:
                    logs[i].append('  EXCEPTION %r' % (ex,)); ok = False; break
                n_ok = j
            info[i].update(ok=ok, steps=n_ok, frames=env.t)
        return greenlet.greenlet(run)
    gls = [make(i) for i in range(N)]; gsave = [L.NOM.m.opt.gravity.copy() for _ in range(N)]
    frames = 0; fk_calls = 0; t_run = time.time(); t_fk = 0.0
    while time.time() - t0 < MAXMIN * 60:
        # one frame: run every robot until it finishes its frame (ProxyEnv.step switches back with nothing) or dies;
        # robots that ask for estimates wait for the batch
        resume = {i: None for i, g in enumerate(gls) if not g.dead}
        while resume:
            req = {}
            for i, val in resume.items():
                L.NOM.m.opt.gravity[:] = gsave[i]
                buf = io.StringIO()
                with contextlib.redirect_stdout(buf): out = gls[i].switch(val) if val is not None else gls[i].switch()
                logs[i] += ['    ' + s.strip() for s in buf.getvalue().splitlines() if ('judge' in s or 'aligned' in s or 'at seat' in s)]
                gsave[i] = L.NOM.m.opt.gravity.copy()
                if isinstance(out, tuple) and out and out[0] == 'fk': req[i] = out
            resume = {}
            if req:
                ids = list(req); tq = time.time()
                Q = torch.zeros(N, 7, device='cuda'); Gv = gtens.clone()
                Q[:len(ids)] = B.T(np.array([req[i][1] for i in ids])); Gv[:len(ids)] = B.T(np.array([req[i][2] for i in ids]))
                gtens.copy_(Gv); p, y, x = B.fk(Q); p, y, x = p.cpu().numpy(), y.cpu().numpy(), x.cpu().numpy()
                t_fk += time.time() - tq; fk_calls += 1
                resume = {i: (p[k].astype(float), y[k].astype(float), x[k].astype(float)) for k, i in enumerate(ids)}
        if all(g.dead for g in gls): break
        ph.step(np.array([en.out for en in envs])); st = ph.state(); frames += 1
        for en, row in zip(envs, st): en._ingest(row)
    wall = time.time() - t_run
    docks = sum(1 for lg in logs for s in lg if ' docked at rx' in s); ok_d = sum(1 for lg in logs for s in lg if ' docked at rx' in s and ': OK' in s)
    print(f'GPU TEACHER: {N} robots, {frames} frames ({frames * 0.06:.0f} s robot time each) in {wall:.0f} s wall -> {N * frames * 0.06 / wall:.1f} robot-s/s | '
          f'batched estimate calls {fk_calls} ({t_fk:.0f} s) | docks OK: {ok_d}/{docks}', flush=True)


if __name__ == '__main__':
    main()
