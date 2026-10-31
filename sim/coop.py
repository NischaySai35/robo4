"""coop.py — COOPERATIVE support (idea 1 for flat tops): never leave a module hanging off one column.
  piece 'build': R upright + W1 docks End B into R.S1B (foot stays on the floor = a brace) + X1, standing at its own spot,
                 bends over and docks ITS End B into W1's spine receiver (measured before: grown 4-module shape, 2/2)
  piece 'lift' : W1 unlocks its floor foot and lifts it (walk.py peel, base = End B in R) -> W1 is now carried by R AND X1
  piece 'hold' : 3 s of gravity, does it hold? (pictures all along, real meshes, room disturbances on)
   py -3.12 coop.py build SEED     -> logs/ckpt/coop_SEED.pkl         py -3.12 coop.py lift SEED"""
from paths import tpath
import sys, os, json, time, copy; sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
import numpy as np, phys_world
from phys_world import PhysWorld
from snap import Snapper
from watchdog import Watchdog, Stalled
CK = tpath('logs/ckpt/coop_%d.pkl')


def shape():
    G = json.load(open(tpath('logs/grown_shapes.json')))[0]['shape']      # R + W1 + W2 + X1 (X1 docks into W1's spine)
    s = copy.deepcopy(G); s['docks'] = s['docks'][:1]; return s                  # drop W2: R, W1, X1


def build(seed):
    import shape_build
    s = shape(); X = s['extra'][0]; w1spot = s['docks'][0]['walker']
    cap = {}; orig = phys_world.PhysWorld.run
    def run(self, *a, **k):
        if 'W' not in cap:
            cap['S'] = Snapper(self, tpath('logs/snaps'), f'coop_build_{seed}'); cap['W'] = Watchdog(self, cap['S'], abort=True); cap['W'].stage = 'build'; self.on_tick = cap['W'].tick
        return orig(self, *a, **k)
    phys_world.PhysWorld.run = run
    t0 = time.time(); r = shape_build.build(s, seed, log=print, keep_world=True); w = r['world']
    print(f"built {r['locked']}/{r['of']} | hold {r['hold_drift_mm']} mm | sim {w.d.time:.1f} s | wall {time.time() - t0:.0f} s | picture {cap['S'].shot('built: R + W1 brace + X1 into W1 spine')}")
    w.save(CK % seed, extra=dict(locks=r['locks'], w1spot=w1spot, seed=seed))


def lift(seed):
    from phys_dock import PhysDockEnv, peel_after_dock
    w, ex = PhysWorld.load(CK % seed); t0 = time.time()
    S = Snapper(w, tpath('logs/snaps'), f'coop_lift_{seed}'); Wd = Watchdog(w, S, abort=True); w.on_tick = Wd.tick
    print('start', S.shot('start'))
    foot = {'a': {'floor': f"S{ex['w1spot']}"}, 'b': {'module': 'W1', 'port': 'A'}}
    cur = [l for l in ex['locks'] if l != foot]; w.release(foot); w.set_locks(cur)
    Wd.stage = 'W1 lifts its foot (carried by R and X1)'
    try: out, lg = peel_after_dock(PhysDockEnv(w, 'W1', seed=seed * 7 + 1), 'B', 'R.S1B', f"F:S{ex['w1spot']}")
    except Stalled as e: out, lg = False, [str(e)]
    d = w.d; tipA = d.site_xpos[w.mod['W1']['end']['A']['tip']]
    print(f"lift: {out} | {lg[-1][:110] if lg else ''} | W1 End A height {tipA[2] * 1000:.0f} mm | {S.shot('after lift')}")
    Wd.stage = None; p0 = np.array([d.site_xpos[w.mod[m]['end'][e]['tip']] for m in w.ids for e in 'AB'])
    peak, fin = w.run(3.0); drift = float(np.linalg.norm(np.array([d.site_xpos[w.mod[m]['end'][e]['tip']] for m in w.ids for e in 'AB']) - p0, axis=1).max()) * 1000
    load = {m: int(np.abs(d.actuator_force[w.mod[m]['act']]).max() / 2.7 * 100) for m in w.ids}
    print(f"hold 3 s: tips moved {drift:.1f} mm, peak servo {peak:.0f}%, max servo per module {load} | wall {time.time() - t0:.0f} s | {S.shot(f'hold: moved {drift:.1f} mm')}")


if __name__ == '__main__':
    {'build': build, 'lift': lift}[sys.argv[1]](int(sys.argv[2]))
