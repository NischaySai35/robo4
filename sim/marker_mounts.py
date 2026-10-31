"""marker_mounts.py — where each ArUco tag really sits ON the connector housing (Nischay 29 Oct: "some markers are inside the
connector circle, some outside" - the first version used a guessed 40.5 mm radius). Rays from outside toward the module
axis hit the REAL CAD mesh (VISUAL_MESH) of the end housing; 3 nearby rays give the surface normal. For each end and each
of 4 directions, the best height (a flat patch, normal radial) along the housing is kept.
   VISUAL_MESH=1 py -3.12 marker_mounts.py      -> C:\\TETROBOT\\logs\\markers\\mounts.json  (end body frame, metres)
   TAGS_PER_END=8 ... -> mounts8.json: 8 tags at 45 deg, so 2+ distinct tags are in view (the end's tilt from the pictures)"""
from paths import tpath
import os, sys, json, math, numpy as np, mujoco
sys.path.insert(0, tpath('sim'))
os.environ['VISUAL_MESH'] = '1'; os.environ['MARKERS'] = '0'
from phys_world import PhysWorld
w = PhysWorld(['M1'], []); m, d = w.m, w.d; mujoco.mj_forward(m, d)
from phys_world import SPINE_RX, RX_GAP
grp = np.zeros(6, np.uint8); grp[2] = 1                       # only the real meshes
gid = np.zeros(1, np.int32)
out = {}
N = int(os.environ.get('TAGS_PER_END', '4'))


def ring(key, b, origin, inward, u, v, accept, hs, h_pref, r_min, depth=0.0, label=''):
    """tag spots around a connector ring: rays from 8 cm out toward its axis (at heights hs behind origin, along inward),
    in N directions (radial = cos*u + sin*v), keep a flat outward patch on the OUTER ring of a body in accept.
    depth > 0: the patch must also exist +-depth along the axis (a whole tag fits). Results in body b's frame."""
    R = d.xmat[b].reshape(3, 3); p0 = d.xpos[b]
    def hit(h, ang):
        dirb = math.cos(ang) * u + math.sin(ang) * v; start_b = origin + inward * h + 0.08 * dirb
        dist = mujoco.mj_ray(m, d, p0 + R @ start_b, R @ (-dirb), grp, 1, -1, gid)
        if dist < 0 or m.geom_bodyid[gid[0]] not in accept: return None
        return start_b - dirb * dist
    rad_of = lambda c: float(np.linalg.norm((c - origin) - ((c - origin) @ inward) * inward))
    for k, ang in enumerate(np.radians(np.arange(N) * 360.0 / N)):
        best = None
        for h in hs:
            c = hit(h, ang); uu = hit(h + 0.003, ang); ss = hit(h, ang + 0.03)
            if c is None or uu is None or ss is None: continue
            n = np.cross(uu - c, ss - c); n /= np.linalg.norm(n)
            radial = math.cos(ang) * u + math.sin(ang) * v
            if n @ radial < 0: n = -n
            flat = float(n @ radial); r = rad_of(c)                    # 1 = faces straight out
            if r < r_min or flat < 0.97: continue                      # only the OUTER ring (inner parts are hidden behind openings)
            if depth > 0:
                ends_ = [hit(h + sg * depth, ang) for sg in (-1, 1)]
                if any(x is None or abs(rad_of(x) - r) > 0.0015 for x in ends_): continue
            score = flat - 0.3 * abs(h - h_pref) / 0.03                # prefer a flat outward patch near h_pref
            if best is None or score > best[0]: best = (score, c, n, h, r, flat)
        if best is None: print(f'{label} dir {k}: no surface found'); continue
        _, c, n, h, r, flat = best
        out[f'{key}{k}'] = dict(pos=list(map(float, c + n * 0.0006)), normal=list(map(float, n)), height_mm=round(h * 1000, 1), radius_mm=round(r * 1000, 1), facing_out=round(flat, 3))
        print(f'{label} direction {k * 360 // N:3d} deg: surface at {h * 1000:4.1f} mm behind, radius {r * 1000:5.1f} mm, faces out {flat:.3f}')


for e in 'AB':                                              # the end housings: body y = module axis
    b = m.body(f'M1_End{e}_LockModule').id; tip = np.array(m.site_pos[m.site(f'M1_{e}_padtip').id])
    ring(e, b, tip, np.array([0, -1.0, 0]) if e == 'B' else np.array([0, 1.0, 0]), np.array([1.0, 0, 0]), np.array([0, 0, 1.0]), {b},
         np.arange(0.012, 0.060, 0.002), 0.022, 0.035, label=f'End {e}')
if os.environ.get('RX_TAGS') == '1':                         # the spine receivers (29 Oct): the camera sees a side target directly
    for port, sn in SPINE_RX.items():
        b = m.body(f'M1_{sn}').id; acc = {b, int(m.body_parentid[b])}
        ring(port, b, np.array([0, 0, RX_GAP]), np.array([0, 0, -1.0]), np.array([1.0, 0, 0]), np.array([0, 1.0, 0]), acc,
             np.arange(0.004, 0.045, 0.002), 0.012, 0.038, depth=0.009, label=f'receiver {port}')
os.makedirs(tpath('logs/markers'), exist_ok=True)
fn = ('mounts.json' if N == 4 else f'mounts{N}.json').replace('.json', '_rx.json' if os.environ.get('RX_TAGS') == '1' else '.json')
json.dump(out, open(os.path.join(tpath('logs/markers'), fn), 'w'), indent=1); print('saved', fn)
