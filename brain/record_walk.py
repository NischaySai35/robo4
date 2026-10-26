"""Record one full walk (MuJoCo physics + the real walking code) for replay in Isaac Sim.
Saves every body's pose every 60 ms + the robot/connector shapes -> D:\robo4\brain\walk_record.npz"""
import sys, os, math, numpy as np, mujoco
sys.path.insert(0, r'D:\robo4\brain')
from walk import Walker
from walk_env import WalkEnv
XML = os.environ.get('XML', r'D:\robo4\brain\walk_train.xml')
def quat2mat(q):
    R = np.zeros(9); mujoco.mju_quat2Mat(R, np.asarray(q, float)); return R.reshape(3, 3)
def box(h):
    v = np.array([[sx * h[0], sy * h[1], sz * h[2]] for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)])
    f = np.array([[0, 1, 3], [0, 3, 2], [4, 6, 7], [4, 7, 5], [0, 4, 5], [0, 5, 1], [2, 3, 7], [2, 7, 6], [0, 2, 6], [0, 6, 4], [1, 5, 7], [1, 7, 3]])
    return v, f
def cyl(r, hh, n=24):
    a = np.linspace(0, 2 * math.pi, n, endpoint=False)
    v = np.r_[np.c_[r * np.cos(a), r * np.sin(a), -hh * np.ones(n)], np.c_[r * np.cos(a), r * np.sin(a), hh * np.ones(n)], [[0, 0, -hh], [0, 0, hh]]]
    f = []
    for i in range(n):
        j = (i + 1) % n; f += [[i, j, n + j], [i, n + j, n + i], [2 * n, j, i], [2 * n + 1, n + i, n + j]]
    return v, np.array(f)
def shapes(m):
    out = []
    for g in range(m.ngeom):
        t = int(m.geom_type[g]); s = m.geom_size[g]
        if t == 7:
            k = m.geom_dataid[g]; va, vn, fa, fn = m.mesh_vertadr[k], m.mesh_vertnum[k], m.mesh_faceadr[k], m.mesh_facenum[k]
            v, f = m.mesh_vert[va:va + vn].astype(float), m.mesh_face[fa:fa + fn]
        elif t == 6: v, f = box(s)
        elif t == 5: v, f = cyl(s[0], s[1])
        else: continue
        v = v @ quat2mat(m.geom_quat[g]).T + m.geom_pos[g]
        rgba = m.mat_rgba[m.geom_matid[g]] if m.geom_matid[g] >= 0 else m.geom_rgba[g]
        out.append((int(m.geom_bodyid[g]), v.astype(np.float32), f.astype(np.int32), rgba.astype(np.float32)))
    return out
for seed in [int(x) for x in os.environ.get('SEEDS', '3300,3100,3500,3001').split(',')]:
    e = WalkEnv(seed=seed, randomize=True, xml=XML); e.reset(base='A', base_rx=0, yaw_deg=45)
    P, Q, events = [], [], []
    def rec(): P.append(e.d.xpos.copy()); Q.append(e.d.xquat.copy())
    rec(); orig = e.step
    def step(*a, **k):
        r = orig(*a, **k); rec(); return r
    e.step = step
    W = Walker(e, 'A', 0, 0, e.m.opt.gravity.copy(), log=lambda s: (events.append((len(P), s.strip())), print(s, flush=True)))
    W.judge_fn = W.sim_camera; W.curl = True; ok = True
    for j in range(1, len(e.rx)):
        if not W.step_to(j): ok = False; break
    print('seed %d: %s, %d frames (%.0f s)' % (seed, 'ALL STEPS OK' if ok else 'FAILED', len(P), len(P) * 0.06), flush=True)
    if ok: break
sh = shapes(e.m)
np.savez_compressed(r'D:\robo4\brain\walk_record.npz', xpos=np.array(P, np.float32), xquat=np.array(Q, np.float32), dt=0.06,
                    body_names=np.array([e.m.body(b).name for b in range(e.m.nbody)]),
                    g_body=np.array([s[0] for s in sh]), g_rgba=np.array([s[3] for s in sh]),
                    g_nv=np.array([len(s[1]) for s in sh]), g_nf=np.array([len(s[2]) for s in sh]),
                    g_v=np.concatenate([s[1] for s in sh]), g_f=np.concatenate([s[2] for s in sh]),
                    ev_frame=np.array([x[0] for x in events]), ev_text=np.array([x[1] for x in events]), ok=ok)
print('saved walk_record.npz: %d frames, %d shapes' % (len(P), len(sh)))
