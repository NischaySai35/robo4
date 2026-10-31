"""floor_moves.py CKPT MOVES OUT.pkl - run timed joint moves on a floor chain (floor_chain.py checkpoint) and look at each.
MOVES = a JSON file or inline JSON: [{"s": seconds, "label": "...", "M2": {"B4": 60, ...}, ...}, ...]
  joint targets in degrees (sim convention, 0 = straight); joints not named keep their target. The servos (ST3215 model) set the speed.
After each move: picture, both ends' heights, what touches the floor, servo load, how far the chain slid on the floor."""
from paths import tpath
import sys, os, json, time, numpy as np; sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
from phys_world import PhysWorld, SIGNS
from snap import Snapper
from watchdog import Watchdog
from floor_chain import floor_contacts, servo_load

JN = ['T1', 'B1', 'B2', 'T2', 'B3', 'B4', 'T3']


def apply(w, mv):
    for mid, js in mv.items():
        if mid in w.ids:
            for j, deg in js.items(): k = JN.index(j); w.tgt[w.ids.index(mid) * 9 + k] = SIGNS[k] * np.radians(deg)


def report(w, p0):
    m, d = w.m, w.d; ends = {f'{mid}.{e}': round(float(d.site_xpos[w.mod[mid]['end'][e]['tip']][2]) * 1000) for mid in w.ids for e in 'AB'}
    com = (d.xipos * m.body_mass[:, None]).sum(0) / m.body_mass.sum()
    slid = float(np.linalg.norm((d.xpos[1:] - p0)[:, :2], axis=1).mean()) * 1000
    ax = {mid: round(float(np.mean([abs(d.xaxis[m.actuator_trnid[w.mod[mid]['act'][k], 0]][2]) for k in (1, 2, 4, 5)])), 2) for mid in w.ids}
    return f"bends vertical {ax} (1 = they swing sideways, 0 = they lift) | ends z mm {ends} | CoM z {com[2] * 1000:.0f} mm | floor {sorted(k.split('_', 1)[0] + '.' + k.split('_', 1)[1][:6] for k in floor_contacts(w))} | servo % {servo_load(w)} | moved {slid:.0f} mm (mean body)"


if __name__ == '__main__':
    ck, mv, out = sys.argv[1:4]
    moves = json.load(open(mv)) if os.path.exists(mv) else json.loads(mv)
    t0 = time.time(); w, ex = PhysWorld.load(ck); p0 = w.d.xpos[1:].copy()
    S = Snapper(w, tpath('logs/snaps'), f"moves_{os.path.basename(out).split('.')[0]}"); WD = Watchdog(w, S, abort=False); w.on_tick = WD.tick
    for k, st in enumerate(moves):
        WD.stage = st.get('label', f'move {k}'); apply(w, st); w.run(float(st.get('s', 2.0)))
        print(f"[{k}] {st.get('label', '')}: {report(w, p0)}"); print('    picture', S.shot(st.get('label', f'move {k}')))
    print('watchdog', [f['msg'][:120] for f in WD.flags], f'| wall {time.time() - t0:.0f} s')
    w.save(out, extra=ex)
