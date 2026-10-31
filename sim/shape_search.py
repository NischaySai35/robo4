"""shape_search.py — G6 step 9: which multi-module SHAPES can really be built on the floor-receiver board?
Building blocks (both GPU-measured, 26 Oct): walking floor->floor (99%), an upright module docking its End B into a
neighbour's SPINE receiver (95%) - but only at placements the feasibility sweep found good (reach2.csv, straight partner).
A module that docks bends; nobody may dock into it before it has docked (it would bend against a closed loop), so shapes are
TREES built outward from an upright ROOT. The board's 4-fold symmetry lets every good (walker yaw 45) row be used at
walker yaws 45/135/225/315 with the offset rotated.
   py -3.12 shape_search.py            -> prints the best stars/chains, writes C:\\TETROBOT\\logs\\shapes.json"""
from paths import tpath
import csv, json, math, itertools
G = [-0.3, -0.2, -0.1, 0.1, 0.2, 0.3]
SPOTS = [(0.0, 0.0)] + [(x, y) for x in G for y in G if abs(x) + abs(y) >= 0.2]      # multi_reach2.xml floor receivers
GOOD = [r for r in csv.reader(open(tpath('logs/reach2.csv'))) if r and r[-1].strip() == '1' and r[5] == 'straight']
rot = lambda x, y, k: [(x, y), (-y, x), (-x, -y), (y, -x)][k % 4]


def docks_from(walker_spot):
    """every (partner spot, partner yaw, srx, walker yaw, twist) a walker standing at walker_spot can dock into"""
    wx, wy = SPOTS[walker_spot]; out = []
    for k in range(4):
        for r in GOOD:
            dx, dy = rot(float(r[2]), float(r[3]), k); px, py = round(wx + dx, 3), round(wy + dy, 3)
            for si, s in enumerate(SPOTS):
                if abs(s[0] - px) < 1e-6 and abs(s[1] - py) < 1e-6:
                    out.append(dict(partner=si, pyaw=(int(r[4]) + 90 * k) % 360, srx=int(r[1]), wyaw=(45 + 90 * k) % 360, twist=int(r[7])))
    return out


DOCK = {w: docks_from(w) for w in range(len(SPOTS))}


def _near_line(p, a, b, r):
    """is point p within r of the segment a-b?"""
    ax, ay = a; bx, by = b; px, py = p; L2 = (bx - ax) ** 2 + (by - ay) ** 2 or 1e-9
    t = max(0.0, min(1.0, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / L2))
    return math.hypot(ax + t * (bx - ax) - px, ay + t * (by - ay) - py) < r

# STARS: one upright root at a spot with a fixed yaw, n walkers each docking into a DIFFERENT srx of the root
shapes = []
for root in range(len(SPOTS)):
    for ryaw in (45, 135, 225, 315):
        opts = {}                                         # srx -> list of (walker spot, walker yaw, twist)
        for w in range(len(SPOTS)):
            if w == root: continue
            for dk in DOCK[w]:
                if dk['partner'] == root and dk['pyaw'] == ryaw: opts.setdefault(dk['srx'], []).append((w, dk['wyaw'], dk['twist']))
        for n in (4, 3, 2):
            for srxs in itertools.combinations(sorted(opts), n):
                for pick in itertools.product(*[opts[s] for s in srxs]):
                    spots = [p[0] for p in pick]
                    if len(set(spots)) < n: continue
                    # walkers must not stand on top of each other (receivers >= 0.2 m apart)
                    if any(math.dist(SPOTS[a], SPOTS[b]) < 0.2 for a, b in itertools.combinations(spots, 2)): continue
                    # physics, 26 Oct: a walker 14 cm from the root folds too tight and lands pads-on-pads (4/8 robots failed);
                    # at >= 20 cm the same shape built 8/8. So walkers stand >= 20 cm from the module they dock into.
                    if any(math.dist(SPOTS[a], SPOTS[root]) < 0.2 for a in spots): continue
                    # line of sight: no other module stands within 12 cm of the line walker -> root (physics, 26 Oct: a walker
                    # reaching over another one standing in between timed out 130 mm short)
                    if any(_near_line(SPOTS[o], SPOTS[a], SPOTS[root], 0.12) for a in spots for o in spots if o != a): continue
                    shapes.append(dict(kind=f'star{n}', root=root, ryaw=ryaw, docks=[dict(walker=p[0], wyaw=p[1], srx=s, twist=p[2]) for s, p in zip(srxs, pick)],
                                       worst_twist=max(p[2] for p in pick)))
            if any(s['kind'] == f'star{n}' and s['root'] == root and s['ryaw'] == ryaw for s in shapes): break
# CHAINS of 3: root R <- W2 (docks into R) <- W3 (docks into W2, which is upright-then-bent: W2 is NOT straight any more)
#   -> a chain needs W2 to be a straight partner AFTER its own dock: not in the table, so chains of 3 are physics-only (skipped here)
shapes.sort(key=lambda s: (-len(s['docks']), s['worst_twist']))
shapes = [x for k in ('star2', 'star3', 'star4') for x in [y for y in shapes if y['kind'] == k][:60]]   # the best 60 of each size
json.dump(shapes, open(tpath('logs/shapes.json'), 'w'), indent=1)
from collections import Counter
print('good straight rows', len(GOOD), '| shapes found:', dict(Counter(s['kind'] for s in shapes)))
for kind in ('star2', 'star3', 'star4'):
    first = next((i for i, x in enumerate(shapes) if x['kind'] == kind), None)
    print(f'  first {kind}: index {first}')
for s in shapes[:3]:
    print(f"  {s['kind']}: root at spot {s['root']} {SPOTS[s['root']]} yaw {s['ryaw']} | " + ', '.join(f"spot {d['walker']} {SPOTS[d['walker']]} yaw {d['wyaw']} -> srx{d['srx']}" for d in s['docks']) + f" | worst twist {s['worst_twist']}")
