"""gpu_transform.py — a planned SHAPE CHANGE on MANY random robots at once: physics on the GPU (gpu_world.py = phys_world's
rules in MuJoCo Warp), one docking brain per robot in CPU workers (the same walk.py Walker / DockController the robot runs).
Per robot: build shape A, then the planned moves, executed by tf_plan.execute (the SAME interpreter the CPU world uses),
then shape B must hold 3 s under gravity.

   py -3.12 gpu_transform.py N_ROBOTS MAX_MINUTES [PAIR]     PAIR from tf_run.tf_pairs()   env: TAG, SEED, WORKERS, NOSLIP"""
from paths import tpath
import sys, os, io, json, math, time, contextlib, collections, types, numpy as np, multiprocessing as mp
sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))

LOCK_SIGN = {'A': -1.0, 'B': 1.0}
FRAME = 0.06


def key(lk): return json.dumps(lk, sort_keys=True)


# =========================================================== worker side: one world as the brains see it
class WorldProxy:
    """a GPU world seen from the CPU: latest state row + this world's servo targets and lock requests"""

    def __init__(self, tm, row, grav, parent):
        self.tm, self.parent = tm, parent; self.L = tm['layout']
        self.tgt = np.array(tm['tgt0'], float); self.ops = []
        self.m = types.SimpleNamespace(nbody=0, opt=types.SimpleNamespace(gravity=np.array(grav, float)))   # dock(): gravity the IMU reads
        self.d = types.SimpleNamespace(qpos=np.zeros(tm['nq']), site_xpos=np.zeros((tm['nsite'], 3)), xmat=np.zeros((tm['nbody'], 9)), contact=[], ncon=0)
        nR = len(tm['rx']); self.rx = [dict(name=n) for n in tm['rx']]; self.ids = tm['ids']
        self.time = 0.0; self.peak_run = 0.0
        self.ingest(row)

    def ingest(self, row):
        L, tm, d = self.L, self.tm, self.d; self.row = row
        q = row[L['q']].reshape(-1, 7); lk = row[L['lock']].reshape(-1, 2)
        for i, mid in enumerate(self.ids):
            d.qpos[tm['qa'][mid]] = q[i]; d.qpos[tm['lockq'][mid]['A']] = lk[i, 0]; d.qpos[tm['lockq'][mid]['B']] = lk[i, 1]
        tips = row[L['tip']].reshape(-1, 3); em = row[L['emat']].reshape(-1, 9)
        for k, (mid, e) in enumerate(tm['ends']):
            d.site_xpos[tm['end'][mid][e]['tip']] = tips[k]; d.xmat[tm['end'][mid][e]['body']] = em[k]
        S, Z, R = row[L['seat']].reshape(-1, 3), row[L['z']].reshape(-1, 3), row[L['R']].reshape(-1, 3, 3)
        for k, x in enumerate(self.rx): x.update(seat=S[k].copy(), z=Z[k].copy(), R=R[k].copy(), o=S[k] - tm['RX_GAP'] * Z[k])
        self.magf = row[L['magf']]; self.low = row[L['low']]; self.fin = row[L['fin']][0] > 0.5; self.peak = row[L['peak']][0]; self.time = row[L['time']][0]

    def frame(self):
        self.parent.switch()                       # main: GPU frame, then ingest() our new row
        self.peak_run = max(self.peak_run, self.peak)
        return self.fin

    # the world calls tf_plan.execute / tf_plan.run use (tf_plan.CPUWorld has the same ones)
    def run(self, seconds):
        ok = True
        for _ in range(max(1, int(round(seconds / FRAME)))): ok = self.frame() and ok
        return ok

    def set_locks(self, locks):
        closed = {(pr['module'], pr['port']) for lk in locks for pr in (lk['a'], lk['b']) if 'module' in pr and pr['port'] in ('A', 'B')}
        for i, mid in enumerate(self.ids):
            for e, off in (('A', 7), ('B', 8)): self.tgt[i * 9 + off] = math.radians(45) * LOCK_SIGN[e] if (mid, e) in closed else 0.0

    def tips(self): return [self.d.site_xpos[self.tm['end'][m][e]['tip']].copy() for m in self.ids for e in 'AB']
    def hold(self, seconds):
        self.peak_run = 0.0; fin = self.run(seconds); return fin, self.peak_run
    def make_env(self, mid, seed): return GEnv(self, mid, seed=seed)
    floor_locks = property(lambda self: list(self.tm['floor']))

    def engage(self, lk): self.ops.append(('engage', lk))
    def release(self, lk): self.ops.append(('release', lk))
    def straighten(self, mid, seconds=3.0):
        o = 9 * self.ids.index(mid); self.tgt[o:o + 7] = 0.0; self.run(seconds)
        q = self.d.qpos[self.tm['qa'][mid]].copy(); self.last_straighten = float(np.degrees(np.abs(q).max()))
        if self.last_straighten > 10: self.tgt[o:o + 7] = q; self.run(0.3)      # could not get up: relax where it is (tf_plan.CPUWorld)
        return self.last_straighten


class GEnv:
    """phys_dock.PhysDockEnv on a WorldProxy (same fields, same imperfections)"""

    def __init__(self, world, mid, seed=1, randomize=True):
        tm = world.tm; self.world = w = world; self.mid = mid; self.i = w.ids.index(mid)
        self.rng = r = np.random.default_rng(seed)
        self.qa = np.array(tm['qa'][mid]); self.end = {e: dict(tm['end'][mid][e], lockq=tm['lockq'][mid][e]) for e in 'AB'}
        self.lo, self.hi = np.array(tm['lo']), -np.array(tm['lo']); self.d = w.d; self.m = w.m
        self.delay = int(r.integers(1, 4)) if randomize else 1
        self.noise = r.uniform(0.0005, 0.003) if randomize else 0.0015
        self.obs_lag = int(r.integers(0, 3)) if randomize else 1
        self.rx = w.rx; self.rx_bias = []
        for _ in w.rx:
            b = r.normal(0, 0.0007, 3) if randomize else np.zeros(3); nb = np.linalg.norm(b)
            if nb > 0.0015: b *= 0.0015 / nb
            self.rx_bias.append(b)
        q0 = self.d.qpos[self.qa].copy(); self.cmd = q0.copy(); self.queue = collections.deque([q0.copy()] * self.delay, maxlen=self.delay + 1)
        self.qhist = collections.deque(maxlen=4); self.qhist.append(self._meas()); self.t = 0
        self.mag_force = {}; self._mf()

    def _mf(self):
        k = self.world.tm['ends'].index; self.mag_force = {e: float(self.world.magf[k((self.mid, e))]) for e in 'AB'}
    def index(self, name): return self.world.tm['rx'].index(name)
    def lock_sign(self, e): return LOCK_SIGN[e]
    def _meas(self):
        q = self.d.qpos[self.qa] + self.rng.normal(0, self.noise, 7); return np.round(q / 0.001534) * 0.001534
    def measured(self): return self.qhist[max(0, len(self.qhist) - 1 - self.obs_lag)].copy()

    def step(self, cmd, lockA_deg, lockB_deg, extra_force=None):
        w = self.world; self.cmd = np.clip(cmd, self.lo, self.hi); self.queue.append(self.cmd.copy())
        o = 9 * self.i
        if not (w.tm.get('disturb') and self.rng.random() < w.tm['packet_loss']):     # a lost packet: the servos keep the old command
            w.tgt[o:o + 7] = self.queue[0]
            w.tgt[o + 7] = math.radians(lockA_deg) * LOCK_SIGN['A']; w.tgt[o + 8] = math.radians(lockB_deg) * LOCK_SIGN['B']
        ok = w.frame(); self.t += 1; self.qhist.append(self._meas()); self._mf()
        return self.status(ok)

    def status(self, ok=True):
        return dict(ok=bool(ok and self.world.fin), lowest_link_mm=float(self.world.low[self.i]) * 1000, t=self.t)

    def end_vs_rx(self, e, i):
        from phys_dock import end_rel
        d = self.d; RX = self.rx[i]
        return dict(**end_rel(d.site_xpos[self.end[e]['tip']], d.xmat[self.end[e]['body']].reshape(3, 3), RX['seat'], RX['z'], RX['R']), lock_deg=math.degrees(abs(d.qpos[self.end[e]['lockq']])))


def worker(conn, ids, seeds, gravs, rows0, tm):
    import greenlet, tf_plan
    with contextlib.redirect_stdout(io.StringIO()):
        import walk as WK
    L = WK.L; main = greenlet.getcurrent(); K = len(ids)
    worlds = [WorldProxy(tm, rows0[k], gravs[k], main) for k in range(K)]
    logs = [[] for _ in range(K)]; info = [dict() for _ in range(K)]; nok = [0] * K

    def make(k):
        def log(s):
            logs[k].append(s)
            if ': OK |' in s: nok[k] += 1
        def run():
            try:
                st = tf_plan.run(worlds[k], worlds[k].make_env, tm['shapeA'], tm['ops'], seeds[k], log)
                info[k].update(stages=st, ok=len(st) == 1 + len(tm['ops']) and all(x['ok'] for x in st), done=True)
            except Exception as ex:
                import traceback; logs[k].append('EXCEPTION ' + traceback.format_exc()[-600:]); info[k].update(ok=False, done=True, exc=repr(ex))
        return greenlet.greenlet(run)
    gls = [make(k) for k in range(K)]
    glob = lambda: (L.NOM.m.opt.gravity.copy(), L.HOVER_FAR, L.LAG_TOL)
    saved = [glob() for _ in range(K)]
    while True:
        for k, g in enumerate(gls):
            if g.dead: continue
            L.NOM.m.opt.gravity[:] = saved[k][0]; L.HOVER_FAR, L.LAG_TOL = saved[k][1], saved[k][2]    # per-robot brain globals
            with contextlib.redirect_stdout(io.StringIO()): g.switch()
            saved[k] = glob()
        if all(g.dead for g in gls): conn.send(('done', ids, logs, info)); return
        conn.send(('frame', np.array([x.tgt for x in worlds]), [x.ops for x in worlds], list(nok)))
        for x in worlds: x.ops = []
        st = conn.recv()
        if st is None:                               # time limit: report what each robot got through so far
            for k in range(K): info[k].setdefault('stages', []); info[k]['partial'] = True; info[k]['moves_ok'] = nok[k]
            conn.send(('done', ids, logs, info)); return
        for x, row in zip(worlds, st): x.ingest(row)


# =========================================================== main
def setup_scene(pair):
    import shape_build, tf_plan, tf_run
    A, ops = tf_run.tf_pairs()[pair]; sp, lk = tf_plan.needs(A, ops)
    w, floor, docks, spot_of, anchors = shape_build.place_shape(A, 1, False, extra_spots=sp, extra_locks=lk)
    return w, floor, dict(shapeA=A, ops=ops)


def main():
    N = int(sys.argv[1]); MAXMIN = float(sys.argv[2]) if len(sys.argv) > 2 else 10; pair = sys.argv[3] if len(sys.argv) > 3 else 'W2_S8toS1'
    tag = os.environ.get('TAG', pair); seed = int(os.environ.get('SEED', '11')); NW = int(os.environ.get('WORKERS', min(14, N)))
    t0 = time.time()
    with contextlib.redirect_stdout(io.StringIO()):
        pw, floor, plan = setup_scene(pair)
    from gpu_world import GPUWorld
    gw = GPUWorld(pw, N, seed=seed)
    for lk in floor: gw.engage(range(N), lk)
    gw.frame()                                               # the read-out buffers live in the captured graph: fill them once
    m = pw.m; LY = gw.layout()
    jn = [m.actuator_trnid[a, 0] for a in pw.mod[pw.ids[0]]['act']]
    tm = dict(layout=LY, tgt0=pw.tgt.tolist(), nq=m.nq, nsite=m.nsite, nbody=m.nbody, ids=pw.ids, rx=gw.rnames, RX_GAP=0.0063,
              ends=[(mid, e) for _, mid, e in gw.ends], qa={mid: list(map(int, pw.mod[mid]['qa'])) for mid in pw.ids},
              lockq={mid: {e: int(pw.mod[mid]['lockq'][e]) for e in 'AB'} for mid in pw.ids},
              end={mid: {e: dict(tip=int(pw.mod[mid]['end'][e]['tip']), body=int(pw.mod[mid]['end'][e]['body']), mags=list(map(int, pw.mod[mid]['end'][e]['mags']))) for e in 'AB'} for mid in pw.ids},
              lo=[float(m.jnt_range[j][0]) * 0.98 for j in jn], floor=floor, disturb=bool(gw.dist), packet_loss=0.01, **plan)
    rows = gw.state(); grav = gw.grav.cpu().numpy()
    nmov = 1 + len(plan['ops'])
    print('GPU ready: %d random robots, %d modules, %d receivers, timestep %.0f ms, noslip %d, setup %.0f s | plan: %s' % (
        N, len(pw.ids), len(gw.rnames), gw.ts * 1000, m.opt.noslip_iterations, time.time() - t0, ' -> '.join(o['label'] for o in plan['ops'])), flush=True)
    SNAP = os.environ.get('SNAP'); SNAP_ROBOTS = [0, 1]
    if SNAP:
        from snap import Snapper
        sn = Snapper(pw, SNAP, tag)
    parts = np.array_split(np.arange(N), NW); conns, procs = [], []; ctx = mp.get_context('spawn')
    for wi, ids in enumerate(parts):
        a, b = ctx.Pipe()
        p = ctx.Process(target=worker, args=(b, ids, [seed * 1000 + int(i) for i in ids], grav[ids], rows[ids], tm), daemon=True)
        p.start(); conns.append(a); procs.append(p)
    active = list(range(NW)); logs = [[] for _ in range(N)]; info = [dict() for _ in range(N)]; nok = np.zeros(N, int)
    frame = 0; t1 = time.time(); tg = 0.0; ekey = {}
    while active:
        ops = collections.defaultdict(list)
        for wi in list(active):
            msg = conns[wi].recv()
            if msg[0] == 'done':
                _, ids, lg, inf = msg
                for k, i in enumerate(ids): logs[i] = lg[k]; info[i] = inf[k]
                active.remove(wi); continue
            _, tgt, op, ns = msg; ids = parts[wi]
            gw.tgt[ids[0]:ids[-1] + 1, :] = gw.T(tgt)
            for k, o in enumerate(op):
                for kind, lk in o: ekey[key(lk)] = lk; ops[(kind, key(lk))].append(int(ids[k]))
            nok[ids] = ns
        if not active: break
        if (time.time() - t1) / 60 > MAXMIN:
            print('time limit reached: unfinished robots are counted as NOT finished', flush=True)
            for wi in active: conns[wi].send(None)
            for wi in active:
                _, ids, lg, inf = conns[wi].recv()
                for k, i in enumerate(ids): logs[i] = lg[k]; info[i] = inf[k]
            break
        for (kind, k), W in ops.items(): getattr(gw, kind)(W, ekey[k])
        tt = time.time(); gw.frame(); st = gw.state(); tg += time.time() - tt; frame += 1
        for wi in active: conns[wi].send(st[parts[wi]])
        if SNAP and frame % 200 == 0:                       # LOOK at a few GPU robots (copied into a CPU world, rendered)
            for i in SNAP_ROBOTS:
                gw.to_cpu(i); sn.out_tag = sn.tag; sn.tag = f'{tag}_robot{i}'; sn.shot(f'GPU robot {i}, frame {frame}: ' + (logs[i][-1][:80] if logs[i] else '')); sn.tag = sn.out_tag
        if frame % 50 == 0:
            done = sum(1 for x in info if x.get('done')); okn = sum(1 for x in info if x.get('ok'))
            nac = int(gw.wp.to_torch(gw.d.nacon).item()); nefc = int(gw.wp.to_torch(gw.d.nefc).max().item())
            print('  frame %d (%.0f s robot time), wall %.0f s (GPU %.0f%%) | moves done per robot: %s | finished %d, OK %d | contacts %d (cap %d), max rows %d (cap %d)' % (
                frame, frame * FRAME, time.time() - t1, 100 * tg / (time.time() - t1), np.bincount(nok, minlength=nmov + 2).tolist(), done, okn, nac, gw.d.naconmax, nefc, gw.d.njmax), flush=True)
    for p in procs:
        if p.is_alive(): p.terminate()
    # ---------- report: per stage, how many robots that reached it passed it
    names = ['build shape A'] + [o['label'] for o in plan['ops']]
    reach = collections.Counter(); passed = collections.Counter()
    for x in info:
        for k, s_ in enumerate(x.get('stages', [])): reach[k] += 1; passed[k] += s_['ok']
    fin = sum(1 for x in info if x.get('done')); ok = sum(1 for x in info if x.get('ok'))
    wall = time.time() - t0
    lines = [f'GPU SHAPE CHANGE {pair} ({tag}): {N} random robots, timestep {gw.ts * 1000:.0f} ms, noslip {m.opt.noslip_iterations}, {frame} frames = {frame * FRAME:.0f} s robot time, wall {wall / 60:.1f} min ({N * frame * FRAME / max(1, time.time() - t1):.1f} robot-s/s)',
             f'  finished {fin}/{N}; END-TO-END OK {ok}/{fin} finished robots' + (f' ({100 * ok / fin:.1f}%)' if fin else '')]
    for k, nm in enumerate(names): lines.append(f'  stage {k + 1} {nm[:46]:46s}: {passed[k]}/{reach[k]} that reached it')
    fails = collections.Counter(next((s_['stage'] for s_ in x.get('stages', []) if not s_['ok']), 'EXC' if x.get('exc') else None) for x in info if x.get('done') and not x.get('ok'))
    lines.append('  failures by stage: ' + str(dict(fails)))
    rep = '\n'.join(lines); print(rep, flush=True)
    with open(rf'C:\TETROBOT\logs\gpu_transform_{tag}.log', 'w', encoding='utf-8') as f:
        f.write(rep + '\n\n')
        for i in range(N): f.write(f'=== robot {i} {json.dumps(info[i])[:1500]}\n' + '\n'.join(logs[i]) + '\n')
    json.dump(dict(tag=tag, pair=pair, report=lines, robots=info), open(rf'C:\TETROBOT\logs\gpu_transform_{tag}.json', 'w'), indent=0)


if __name__ == '__main__':
    main()
