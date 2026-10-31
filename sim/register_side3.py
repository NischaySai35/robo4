from paths import tpath
import numpy as np, struct, itertools, mujoco
from scipy.spatial import cKDTree
mujoco.set_mju_user_warning(lambda m: None)
def load(p):
    b = open(p, 'rb').read(); n = struct.unpack('<I', b[80:84])[0]
    a = np.frombuffer(b[84:], dtype=np.dtype([('n', '<3f4'), ('v', '<9f4'), ('a', '<u2')]), count=n); return a['v'].reshape(-1, 3)
Rv = load(tpath('dashboard/meshes/floor_receiver.stl')); c = (Rv.min(0) + Rv.max(0)) / 2; Pf = Rv - c
exec(open(tpath('sim/register_side.py')).read().split("Sx = S[")[0].split("S = load")[0])  # imports only
m = mujoco.MjModel.from_xml_path(tpath('sim/walk_train.xml')); d = mujoco.MjData(m); mujoco.mj_forward(m, d)
b = m.body('rx0').id; pts = []
for g in range(m.ngeom):
    if m.geom_bodyid[g] != b or m.geom_type[g] != mujoco.mjtGeom.mjGEOM_MESH: continue
    R = d.geom_xmat[g].reshape(3, 3); p = d.geom_xpos[g]; mid = m.geom_dataid[g]
    V = m.mesh_vert[m.mesh_vertadr[mid]:m.mesh_vertadr[mid] + m.mesh_vertnum[mid]]; pts.append((R @ V.T).T + p)
Pr = np.concatenate(pts) * 1000; tree = cKDTree(Pr); print('mjcf pad pts', len(Pr), Pr.min(0).round(1), Pr.max(0).round(1))
sel = Pf[np.abs(Pf[:, 1]) < 100]   # all
res = []
for perm in itertools.permutations(range(3)):
    for sg in itertools.product((1, -1), repeat=3):
        Rc = np.zeros((3, 3))
        for i in range(3): Rc[i, perm[i]] = sg[i]
        if np.linalg.det(Rc) < 0: continue
        for zc in (7.65,):
            Q = (Rc @ Pf.T).T + np.array([0, 0, zc]); idx = np.arange(0, len(Q), 10); dd, _ = tree.query(Q[idx]); res.append((np.median(dd), dd.mean(), Rc, zc))
res.sort(key=lambda r: r[0]); print('best file->rx fits:'); [print(round(r[0], 3), round(r[1], 3), r[2].tolist()) for r in res[:3]]
Rc = res[0][2]; th = np.radians(45)
A = np.array([[0, -1, 0], [np.cos(th), 0, -np.sin(th)], [np.sin(th), 0, np.cos(th)]]); t = np.array([32.65, 80.4, 0])
Rrs = A @ Rc.T; org = Rrs @ np.array([0, 0, -7.65]) + t
print('rx->spine R (rx axes expressed in spine frame, columns):'); print(np.round(Rrs, 4)); print('rx origin in spine frame (mm)', org.round(3))
q = np.zeros(4); mujoco.mju_mat2Quat(q, Rrs.reshape(9)); print('quat', q.round(6))
