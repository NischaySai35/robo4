"""build_cad_colliders.py — collision boxes from Nischay's real CAD parts (31 Oct 2026).

Why: every module body collided as 2 coarse boxes, and connector geoms (contype 4) never touched module bodies, so a
docking end could pass through another module's housing (G6_PROGRESS 30 Oct, "Ring went INTO M1's End A").

What: each part STL (brain/meshes, the try8 export) is filled with PITCH-sized voxels in its body frame, and the voxels
are merged greedily into as few boxes as possible. Boxes are the cheapest and most robust shape for MuJoCo and
MuJoCo Warp. Voxels inside a connector zone are dropped: those zones are already modelled exactly (pads, pockets, lips,
fins, spine receivers in multi_train.xml), and a box there would fill the pocket. The lock rotors are connector parts
only, so they get no boxes. (CoACD was tried first: it crashed on these STLs with a CRT assert, intersection.h:664.)

Output: sim/cad_collision.json = {part: [[cx, cy, cz, hx, hy, hz], ...]} in metres, body frame. phys_world uses it
by default (CAD_COLLIDE=0 = the old coarse boxes).
    py -3.12 build_cad_colliders.py [pitch_mm]        (default 4; 8 mm: GPU 10.6 vs 6.6 robot-s/s, but cobra 5/8 vs 8/8)
"""
import os, sys, json, time, numpy as np, trimesh

HERE = os.path.dirname(os.path.abspath(__file__))
MESHES = os.path.join(HERE, '..', 'brain', 'meshes')
# geom pos of each part mesh in its body frame (tetrobot_scene.xml; body frames = multi_train.xml's, checked 28 Oct)
PARTS = {'EndA_LockModule': (0.0698, 0.190000, 0.2615), 'T1_Housing_B1Fork': (0.0698, 0.132376, 0.2615),
         'Spine1_B1B2': (0.0698, 0.063956, 0.2615), 'T2_Housing_B2Fork_GROUND': (0.0698, -0.096756, 0.2615),
         'T2_Ring_B3Fork': (0.0698, -0.165176, 0.2615), 'Spine2_B3B4': (0.0698, -0.191476, 0.2615),
         'T3_Housing_B4Fork': (0.0698, -0.352188, 0.2615), 'EndB_LockModule': (0.0698, -0.420608, 0.2615)}
R_CONN = 0.042          # connector ring radius incl. pads (pads r 25-35 mm, magnets r 30, outer lip ~40)


def in_connector_zone(part, p):
    """p = (N, 3) points in body frame (m). True where the exact connector geometry already covers it."""
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    if part == 'EndA_LockModule':                       # End A faces -y; pad tip y = -9.4 mm, pads/fins up to y ~ +1.6
        return (x * x + z * z < R_CONN ** 2) & (y < 0.004)
    if part == 'EndB_LockModule':                       # End B faces +y; pad tip y = +67 mm
        return (x * x + z * z < R_CONN ** 2) & (y > 0.054)
    if part.startswith('Spine'):                        # receivers at (+-25, 80.4, 0) mm, axis = +-x
        dy = y - 0.0804
        return (dy * dy + z * z < R_CONN ** 2) & (np.abs(x) > 0.019)
    return np.zeros(len(p), bool)


def greedy_boxes(occ):
    """Merge a boolean voxel grid into axis-aligned boxes (grow along x, then y, then z). Returns [(i0,j0,k0,i1,j1,k1)]."""
    occ = occ.copy(); out = []
    for i, j, k in zip(*np.nonzero(occ)):
        if not occ[i, j, k]: continue
        i1 = i
        while i1 + 1 < occ.shape[0] and occ[i1 + 1, j, k]: i1 += 1
        j1 = j
        while j1 + 1 < occ.shape[1] and occ[i:i1 + 1, j1 + 1, k].all(): j1 += 1
        k1 = k
        while k1 + 1 < occ.shape[2] and occ[i:i1 + 1, j:j1 + 1, k1 + 1].all(): k1 += 1
        occ[i:i1 + 1, j:j1 + 1, k:k1 + 1] = False; out.append((i, j, k, i1, j1, k1))
    return out


def build_part(part, pitch):
    t0 = time.time()
    tm = trimesh.load(os.path.join(MESHES, part + '.stl'), force='mesh')
    tm.apply_scale(0.001); tm.apply_translation(PARTS[part])      # -> body frame, metres
    vg = tm.voxelized(pitch).fill()                               # surface voxels + the inside of closed shells
    occ = vg.matrix.copy()
    centres = vg.points                                           # same order as np.argwhere(occ)
    idx = np.argwhere(occ)
    drop = in_connector_zone(part, centres)
    occ[tuple(idx[drop].T)] = False
    T = vg.transform; boxes = []
    for i0, j0, k0, i1, j1, k1 in greedy_boxes(occ):
        lo = T @ np.array([i0 - 0.5, j0 - 0.5, k0 - 0.5, 1.0]); hi = T @ np.array([i1 + 0.5, j1 + 0.5, k1 + 0.5, 1.0])
        # a voxel counts if the surface passes anywhere through it, so the merged box reaches ~half a voxel past the real
        # surface on every side: trim that back (31 Oct: the extra 3 mm at 6 mm voxels changed how the chain lies).
        # Thin walls keep at least 3 mm (PLA walls are 2 x 0.4 mm lines + infill, the parts are never thinner).
        c = (lo[:3] + hi[:3]) / 2; h = np.maximum(np.abs(hi[:3] - lo[:3]) / 2 - pitch / 2, 0.0015)
        boxes.append([round(float(v), 6) for v in (*c, *h)])
    print(f'{part}: {int(vg.matrix.sum())} voxels, {int(drop.sum())} in connector zones dropped, {len(boxes)} boxes, {time.time() - t0:.1f} s', flush=True)
    return boxes


def main(pitch):
    out = dict(pitch=pitch, parts={p: build_part(p, pitch) for p in PARTS})
    json.dump(out, open(os.path.join(HERE, 'cad_collision.json'), 'w'), indent=0)
    print('total boxes per module:', sum(len(v) for v in out['parts'].values()))


if __name__ == '__main__':
    main(float(sys.argv[1]) / 1000 if len(sys.argv) > 1 else 0.004)
