"""Find where the floor-receiver geometry (as used in the MJCF) sits inside the Spine CAD (side receivers). Prints best (phi, x0, y0)."""
from paths import tpath
import numpy as np, struct, mujoco
from scipy.spatial import cKDTree
mujoco.set_mju_user_warning(lambda m: None)
def load(p):
    b = open(p, 'rb').read(); n = struct.unpack('<I', b[80:84])[0]
    a = np.frombuffer(b[84:], dtype=np.dtype([('n', '<3f4'), ('v', '<9f4'), ('a', '<u2')]), count=n); return a['v'].reshape(-1, 3)
S = load(tpath('dashboard/meshes/Spine1_B1B2.stl')) - np.array([-69.8, -63.956, -261.5])
m = mujoco.MjModel.from_xml_path(tpath('sim/walk_train.xml')); d = mujoco.MjData(m); mujoco.mj_forward(m, d)
b = m.body('rx0').id; pts = []
for g in range(m.ngeom):
    if m.geom_bodyid[g] != b: continue
    R = d.geom_xmat[g].reshape(3, 3); p = d.geom_xpos[g]; t = m.geom_type[g]
    if t == mujoco.mjtGeom.mjGEOM_MESH:
        mid = m.geom_dataid[g]; V = m.mesh_vert[m.mesh_vertadr[mid]:m.mesh_vertadr[mid] + m.mesh_vertnum[mid]]; pts.append((R @ V.T).T + p)
    elif t == mujoco.mjtGeom.mjGEOM_BOX:
        s = m.geom_size[g]; C = np.array([[i, j, k] for i in (-1, 1) for j in (-1, 1) for k in (-1, 1)]) * s; pts.append((R @ C.T).T + p)
    else:
        s = m.geom_size[g]; a = np.linspace(0, 2 * np.pi, 48, endpoint=False); C = np.concatenate([np.stack([s[0] * np.cos(a), s[0] * np.sin(a), np.full(48, h)], 1) for h in (-s[1], s[1])]); pts.append((R @ C.T).T + p)
P = np.concatenate(pts) * 1000; print('rx pts', len(P), P.min(0).round(1), P.max(0).round(1))
Sx = S[S[:, 0] > 5]; tree = cKDTree(Sx); res = []
for sgn in (1, -1):
    Sx_ = Sx if sgn == 1 else None
for flip in (1, -1):
  for phi in range(0, 360, 15):
    t = np.radians(phi); R = np.array([[0, 0, 1], [np.cos(t), -np.sin(t), 0], [np.sin(t), np.cos(t), 0]]) if flip == 1 else np.array([[0, 0, -1], [np.cos(t), np.sin(t), 0], [np.sin(t), -np.cos(t), 0]])
    for x0 in np.arange(14, 44, 0.5):
        Q = (R @ P.T).T + np.array([x0, 80.4, 0]); dd, _ = tree.query(Q); res.append((np.median(dd), dd.mean(), flip, phi, x0))
res.sort(); [print(r) for r in res[:6]]
