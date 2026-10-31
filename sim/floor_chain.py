"""floor_chain.py NAME SEED OUT.pkl [SECONDS] - a Studio scene (logs/chain_scenes.json, from studio/scripts/export-v2-scenes.ts)
put on the bare floor: NO floor connectors (anchors removed), random robot, room disturbances on, gravity settles it.
Saves a checkpoint (the start of every floor-chain piece), pictures, and what touches the floor + how hard the servos work."""
from paths import tpath
import sys, os, json, time, numpy as np, mujoco; sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
from phys_world import PhysWorld
from snap import Snapper

SCENES = tpath('logs/chain_scenes.json')


def floor_contacts(w):
    """bodies touching the floor plane, with the normal force (N)"""
    m, d = w.m, w.d; f6 = np.zeros(6); out = {}
    for i in range(d.ncon):
        c = d.contact[i]; g = (c.geom1, c.geom2)
        if not any(m.geom(x).name == 'floor' for x in g): continue
        other = g[1] if m.geom(g[0]).name == 'floor' else g[0]; b = m.body(m.geom_bodyid[other]).name
        mujoco.mj_contactForce(m, d, i, f6); out[b] = out.get(b, 0.0) + float(abs(f6[0]))
    return out


def servo_load(w):
    """per module: the highest |torque| / force limit over its 7 joints (%)"""
    d, m = w.d, w.m; out = {}
    for mid in w.ids:
        a = w.mod[mid]['act']; out[mid] = round(float(np.max(np.abs(d.actuator_force[a]) / np.abs(m.actuator_forcerange[a, 1]))) * 100, 1)
    return out


def build(name, seed, randomize=True):
    sc = dict(json.load(open(SCENES))[name]); sc['anchors'] = []          # no floor connectors
    w = PhysWorld([m['id'] for m in sc['modules']], [], randomize=randomize, seed=seed, locks=sc['locks']); w.place(sc)
    return w, sc


if __name__ == '__main__':
    name, seed, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]; secs = float(sys.argv[4]) if len(sys.argv) > 4 else 3.0
    t0 = time.time(); w, sc = build(name, seed)
    S = Snapper(w, tpath('logs/snaps'), f'chain_{name}_{seed}'); S.shot('placed')
    w.run(secs)
    print(f'{name} robot {seed}: settled {secs} s | floor contacts (N): { {k: round(v, 1) for k, v in sorted(floor_contacts(w).items())} }')
    print(f'  servo load % of limit: {servo_load(w)} | total weight {sum(w.m.body_mass) * 9.81:.1f} N | wall {time.time() - t0:.0f} s')
    print('  picture', S.shot(f'{name}: settled on the bare floor'))
    w.save(out, extra=dict(scene=name, seed=seed))
