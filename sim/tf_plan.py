"""tf_plan.py — G6 SHAPE CHANGE planner: shape A -> shape B as the robot's own moves, and ONE interpreter that executes a
plan on any world (CPU phys_world, or the GPU runner's proxies), so every number comes from the same code path.

Shapes are shapes.json / grown_shapes.json entries (grow.shape_modules: R, W1.., X1..; every module upright in a floor
receiver, End A down; walkers dock their free end into a module's spine receiver). The module is symmetric (walk.py), so
in shape B a module may stand on either end: what must match is its floor spot and the spine receiver it is locked into.

Moves (all the robot's own code; nothing kinematic):
  undock : unlock the spine lock, walk.py peel + 25 mm pull-out (phys_dock.peel_after_dock), stand up straight 3 s
  step   : dock the free end into the next floor receiver, lock, unlock the old foot, peel + pull out, stand up straight
           (step lengths measured 10/10 for 0.14 / 0.28 / 0.30 m, _steplen_par.py)
  dock   : dock the free end into a spine receiver, stand-off 2.5 cm, 2 attempts (5 cm first: 20/58 on the GPU; 2.5 cm: 7/7 CPU)
Order: a module moves only when nothing is docked into it, and docks only into a receiver that is free at that moment.
   py -3.12 tf_plan.py SHAPE_A_JSON SHAPE_B_JSON         -> prints the plan"""
from paths import tpath
import sys, json, math, collections
import numpy as np
sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
SRX_PORT = {0: 'S1A', 1: 'S1B', 2: 'S2A', 3: 'S2B'}
MAX_STEP = 0.30           # longest floor step measured (10/10)
MIN_CLEAR = 0.14          # closest foot-to-foot distance any built shape used (shape A's W2 at 0.14 m from the root)
SPINE_STANDOFFS = (0.025, 0.025)   # measured: 5 cm first then 2.5 cm = final dock 20/58 (GPU g64: 5 cm stops ~78 mm out, the retry lands pads on pads); 2.5 cm: 7/7 (CPU, transform.py)


def spots():
    import io, contextlib
    with contextlib.redirect_stdout(io.StringIO()):
        from shape_search import SPOTS
    return SPOTS


def layout(shape):
    """module -> dict(spot, yaw, into=(module, port) or None)"""
    from grow import shape_modules
    spot, yaw, docks = shape_modules(shape)
    out = {m: dict(spot=spot[m], yaw=yaw[m], into=None) for m in spot}
    for w, into, srx in docks: out[w]['into'] = (into, SRX_PORT[srx])
    return out


def floor_lock(spot, mid, end): return {'a': {'floor': f'S{spot}'}, 'b': {'module': mid, 'port': end}}
def spine_lock(into, port, mid, end): return {'a': {'module': into, 'port': port}, 'b': {'module': mid, 'port': end}}
def other(e): return 'B' if e == 'A' else 'A'


def path(S, a, b, blocked):
    """fewest floor steps a -> b (each <= MAX_STEP), never onto or within MIN_CLEAR of another module's foot"""
    ok = lambda s: s == b or all(math.dist(S[s], S[x]) >= MIN_CLEAR - 1e-9 for x in blocked)
    prev = {a: None}; q = collections.deque([a])
    while q:
        u = q.popleft()
        if u == b: break
        for v in range(len(S)):
            if v not in prev and v not in blocked and ok(v) and math.dist(S[u], S[v]) <= MAX_STEP + 1e-9:
                prev[v] = u; q.append(v)
    if b not in prev: return None
    p = [b]
    while prev[p[-1]] is not None: p.append(prev[p[-1]])
    return p[::-1]


def build_ops(shape):
    """building shape A from all-upright modules (shape_build.build: each walker docks End B, 2 attempts, brain stand-off)"""
    from grow import shape_modules
    spot, _, dlist = shape_modules(shape)
    docks = [(w, into, srx) for w, into, srx in dlist]
    if shape.get('order'): docks.sort(key=lambda d: shape['order'].index(d[0]))
    return [dict(op='dock', mid=w, foot='A', foot_rx=f'S{spot[w]}', target=f'{into}.{SRX_PORT[srx]}', lock=spine_lock(into, SRX_PORT[srx], w, 'B'),
                 standoffs=(None, None), label=f'build: {w} End B -> {into}.{SRX_PORT[srx]}') for w, into, srx in docks]


def plan(shapeA, shapeB, feet=None, hold=3.0, tag=''):
    """the moves that turn shape A into shape B, then a gravity hold of shape B. feet = which end each module stands on
    now (default: End A, as built). Raises ValueError with the reason when this planner cannot."""
    S = spots(); A, B = layout(shapeA), layout(shapeB)
    if set(A) != set(B): raise ValueError(f'different modules: {sorted(A)} vs {sorted(B)}')
    foot = dict(feet or {m: 'A' for m in A}); spot = {m: A[m]['spot'] for m in A}; into = {m: A[m]['into'] for m in A}
    movers = [m for m in A if (A[m]['spot'], A[m]['into']) != (B[m]['spot'], B[m]['into'])]
    for m in movers:
        if A[m]['into'] is None or B[m]['into'] is None: raise ValueError(f'{m}: only modules docked into a spine can move (root moves not planned yet)')
    ops = []; todo = list(movers)
    while todo:
        busy = {v for v in into.values() if v}                                     # receivers in use now
        pick = None
        for m in todo:
            carried = [x for x in into if into[x] and into[x][0] == m]             # something docked into m: it cannot walk away
            if carried or B[m]['into'] in busy - {into[m]}: continue
            pick = m; break
        if pick is None: raise ValueError(f'no order works for {todo}: each one carries a module or needs a receiver still in use')
        m = pick; todo.remove(m); f = foot[m]
        if into[m] is not None:
            src = into[m]; free = other(f)
            ops.append(dict(op='undock', mid=m, foot=f, foot_rx=f'S{spot[m]}', from_rx=f'{src[0]}.{src[1]}', lock=spine_lock(src[0], src[1], m, free),
                            label=f'{m} unlocks from {src[0]}.{src[1]} and pulls out'))
            into[m] = None
        if spot[m] != B[m]['spot']:
            blocked = {spot[x] for x in spot if x != m}
            p = path(S, spot[m], B[m]['spot'], blocked)
            if p is None: raise ValueError(f'{m}: no floor path S{spot[m]} -> S{B[m]["spot"]} (steps <= {MAX_STEP} m, {MIN_CLEAR} m from other feet)')
            for a, b in zip(p, p[1:]):
                nf = other(f)
                ops.append(dict(op='step', mid=m, foot=f, foot_rx=f'S{a}', to_rx=f'S{b}', old_lock=floor_lock(a, m, f), new_lock=floor_lock(b, m, nf),
                                label=f'{m} walks S{a} -> S{b} ({math.dist(S[a], S[b]):.2f} m)'))
                f = nf; spot[m] = b
        tgt = B[m]['into']; free = other(f)
        ops.append(dict(op='dock', mid=m, foot=f, foot_rx=f'S{spot[m]}', target=f'{tgt[0]}.{tgt[1]}', lock=spine_lock(tgt[0], tgt[1], m, free),
                        standoffs=SPINE_STANDOFFS, label=f'{m} docks End {free} into {tgt[0]}.{tgt[1]}'))
        into[m] = tgt; foot[m] = f
    ops.append(dict(op='hold', seconds=hold, feet=dict(foot), label=f'{tag}shape holds under gravity {hold:.0f} s'))
    for o in ops[:-1]: o['label'] = tag + o['label']
    return ops


def chain(shapes, hold=3.0):
    """A -> B -> C ...: each change planned from where the last one left every module's feet"""
    ops, feet = [], None
    for i, (a, b) in enumerate(zip(shapes, shapes[1:])):
        part = plan(a, b, feet, hold, tag=f'[{chr(65 + i)}->{chr(66 + i)}] ' if len(shapes) > 2 else '')
        ops += part; feet = part[-1]['feet']
    return ops


def needs(shapeA, ops):
    """floor receivers and lock definitions the world must have from the start"""
    from grow import shape_modules
    spot, _, _ = shape_modules(shapeA)
    sp, lk = [], []
    for o in ops:
        for k in ('foot_rx', 'to_rx'):
            s = int(o[k][1:]) if k in o else None
            if s is not None and s not in spot.values() and s not in sp: sp.append(s)
        for k in ('lock', 'new_lock', 'old_lock'):
            if k in o and o[k] not in lk: lk.append(o[k])
    return sp, lk


# ======================================================================= one interpreter for every world
def key(lk): return json.dumps(lk, sort_keys=True)


def execute(w, make_env, ops, cur, seed, log=print, randomize=True, settle=None):
    """run the moves on world w. w needs: release(lk), engage(lk), set_locks(locks), straighten(mid), time.
    make_env(mid, seed) -> a PhysDockEnv-like env. cur = locks closed now (updated in place). Returns stage dicts."""
    from phys_dock import dock, peel_after_dock
    stages = []

    def drop(lk):
        cur[:] = [x for x in cur if key(x) != key(lk)]

    for k, o in enumerate(ops):
        s0 = seed * 31 + 7 * k; m = o.get('mid')
        if o['op'] == 'undock':
            w.release(o['lock']); drop(o['lock']); w.set_locks(cur)
            out, lg = peel_after_dock(make_env(m, s0), o['foot'], f"F:{o['foot_rx']}", o['from_rx'])
            if out: w.straighten(m)
            ok, det = out, (lg[-1][:120] if lg else '')
        elif o['op'] == 'step':
            for a in range(2):                       # a missed dock: straighten up, settle, try once more (as every other dock)
                ok, info = dock(make_env(m, s0 + 1 + 1000 * a), o['foot'], f"F:{o['foot_rx']}", f"F:{o['to_rx']}", max_frames=1500)
                if ok: break
                w.set_locks(cur); w.straighten(m)
            if not ok:
                det = f"{o['to_rx']}: gap {info['axial_mm']} side {info['radial_mm']} mm after 2 attempts"
            else:
                w.engage(o['new_lock']); cur.append(o['new_lock']); w.release(o['old_lock']); drop(o['old_lock']); w.set_locks(cur)
                out, lg = peel_after_dock(make_env(m, s0 + 2), other(o['foot']), f"F:{o['to_rx']}", f"F:{o['foot_rx']}")
                if out: w.straighten(m)
                ok = out; det = f"locked in {o['to_rx']} ({info['seconds']} s); old foot out: {out}" + (f"; stood up to within {w.last_straighten:.0f} deg of straight" if out and hasattr(w, 'last_straighten') else '')
        elif o['op'] == 'hold':
            p0 = w.tips(); fin, peak = w.hold(o['seconds']); drift = float(max(math.dist(a, b) for a, b in zip(p0, w.tips()))) * 1000
            ok = bool(fin and drift < 5); det = 'end tips moved %.1f mm, peak servo %.0f%%' % (drift, peak)
        elif o['op'] == 'dock':
            tries = []
            for a, hf in enumerate(o['standoffs']):
                ok, info = dock(make_env(m, s0 + 3 + 1000 * a), o['foot'], f"F:{o['foot_rx']}", o['target'], max_frames=1500, hover_far=hf)
                so = 'brain stand-off' if hf is None else '%.1f cm stand-off' % (hf * 100)
                tries.append(so + (': OK' if ok else ': gap %s side %s mm' % (info['axial_mm'], info['radial_mm'])))
                if ok: break
                w.set_locks(cur); w.straighten(m)
            if ok: w.engage(o['lock']); cur.append(o['lock'])
            else: w.set_locks(cur)
            det = f"{o['target']}: " + ' | '.join(tries)
        stages.append(dict(stage=o['label'], op=o['op'], ok=bool(ok), detail=det, t=round(float(w.time), 2)))
        if o['op'] == 'hold': stages[-1]['peak'] = round(float(peak), 1); stages[-1]['drift_mm'] = round(drift, 2)
        log(f"  {o['label']}: {'OK' if ok else 'FAILED'} | {det}")
        if not ok: break
    return stages


def run(w, make_env, shapeA, ops, seed, log=print):
    """build shape A, then the moves (plan()/chain() end every shape change with a gravity hold: tips move < 5 mm)"""
    cur = list(w.floor_locks)
    w.run(0.5)
    st = execute(w, make_env, build_ops(shapeA), cur, seed + 50000, log)
    built = all(s['ok'] for s in st)
    stages = [dict(stage='build shape A', op='build', ok=built, detail='%d/%d docks locked' % (sum(s['ok'] for s in st), len(build_ops(shapeA))), t=st[-1]['t'] if st else 0)]
    if not built: return stages
    stages += execute(w, make_env, ops, cur, seed, log)
    return stages


class CPUWorld:
    """phys_world.PhysWorld with the calls execute()/run() use (the GPU runner's WorldProxy has the same ones)"""

    def __init__(self, shapeA, ops, seed=1, randomize=True, record=None):
        import shape_build
        sp, lk = needs(shapeA, ops)
        self.pw, floor, _, _, self.anchors = shape_build.place_shape(shapeA, seed, randomize, extra_spots=sp, extra_locks=lk)
        for x in floor: self.pw.engage(x)
        self.floor_locks = floor; self.randomize = randomize
        if record: self.pw.rec = {'dt': 1.0 / record, 'last': -1.0, 'frames': []}

    @classmethod
    def from_world(cls, pw, floor_locks, randomize=True):
        """wrap an existing PhysWorld (e.g. PhysWorld.load of a checkpoint)"""
        o = cls.__new__(cls); o.pw, o.floor_locks, o.randomize, o.anchors = pw, floor_locks, randomize, pw._args['anchors']; return o

    time = property(lambda self: float(self.pw.d.time))
    def release(self, lk): self.pw.release(lk)
    def engage(self, lk): self.pw.engage(lk)
    def set_locks(self, locks): self.pw.set_locks(locks)
    def run(self, s): return self.pw.run(s)[1]
    def straighten(self, mid, s=3.0):
        """stand up straight (all 7 joints to 0); returns how far from straight it got (deg): servos may be too weak (28 Oct, robot 1:
        after the floor step W2 stayed folded at B2 -79 / B3 -68 deg, both servos at their force limit)"""
        o = 9 * self.pw.ids.index(mid); self.pw.tgt[o:o + 7] = 0.0; self.pw.run(s)
        q = self.pw.d.qpos[self.pw.mod[mid]['qa']].copy(); self.last_straighten = float(np.degrees(np.abs(q).max()))
        if self.last_straighten > 10:                  # could not get up: RELAX (hold where it is) instead of straining at the force limit
            self.pw.tgt[o:o + 7] = q; self.pw.sp[o:o + 7] = q; self.pw.run(0.3)
        return self.last_straighten
    def tips(self): return [self.pw.d.site_xpos[self.pw.mod[m]['end'][e]['tip']].copy() for m in self.pw.ids for e in 'AB']
    def hold(self, s):
        peak, fin = self.pw.run(s); return fin, peak
    def make_env(self, mid, seed):
        from phys_dock import PhysDockEnv
        return PhysDockEnv(self.pw, mid, seed=seed, randomize=self.randomize)


if __name__ == '__main__':
    A = json.loads(open(sys.argv[1]).read()) if sys.argv[1].endswith('.json') else json.loads(sys.argv[1])
    B = json.loads(open(sys.argv[2]).read()) if sys.argv[2].endswith('.json') else json.loads(sys.argv[2])
    for o in plan(A, B): print(o['label'])
