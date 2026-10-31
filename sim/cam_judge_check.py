"""cam_judge_check.py CKPT MOVING_END TARGET_RX - grade the camera judge on a still checkpoint: the docking end's pose, the
target receiver's pose and the end-vs-receiver numbers the brain would get, against the physics truth. Also with a shaking
and a knocked camera, with and without re-measuring the camera's own pose from the floor tags."""
from paths import tpath
import sys, numpy as np; sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
from phys_world import PhysWorld
from cam_judge import CameraJudge
import camera as CAM
from phys_dock import end_rel
w, ex = PhysWorld.load(sys.argv[1]); w._refresh_rx(); m, d = w.m, w.d; mid, e = sys.argv[2].split('.'); RX = [r for r in w.rx if r['name'] == sys.argv[3]][0]
eb = m.body(f'{mid}_End{e}_LockModule').id; tip_s = [m.site(f'{mid}_{e}_padtip').id][0]
assert m.site_bodyid[tip_s] == eb
for label, kw in (('still camera', {}), ('shaking 2 mm', dict(shake_mm=2.0)), ('knocked, re-measured from floor tags', dict(knock_at=0.0)),
                  ('knocked, NOT re-measured', dict(knock_at=0.0, relocalize=False))):
    J = CameraJudge(w, snap_dir=None, rig=getattr(sys.modules[__name__], 'RIG', None), **kw); RIG = J.rig; rows = []
    for c in J.cams: c.eye, c.R_wc = c.eye0.copy(), CAM._look(c.eye0, c.target0)[3]          # every test starts from the true belief
    for k in range(3):
        d.time += 0.15; imgs, dets, rl = J.look(); fe = J.fit(eb, dets); fr = J.rx_pose(RX, dets)
        if fe is None or fr is None: rows.append(f'unseen end={fe is not None} rx={fr is not None}'); continue
        tip = fe[1] + fe[0] @ m.site_pos[tip_s]; seat, z, Rr = w.rx_frame(RX, fr[0], fr[1])
        rc = end_rel(tip, fe[0], seat, z, Rr); rt = end_rel(d.site_xpos[tip_s], d.xmat[eb].reshape(3, 3), RX['seat'], RX['z'], RX['R'])
        ang = np.degrees(np.arccos(np.clip(fe[0][:, 1] @ d.xmat[eb].reshape(3, 3)[:, 1], -1, 1)))
        rows.append(f"tip {np.linalg.norm(tip - d.site_xpos[tip_s]) * 1000:5.2f} mm, end axis {ang:4.2f} deg | seat {np.linalg.norm(seat - RX['seat']) * 1000:5.2f} mm "
                    f"| tip-vs-seat {np.linalg.norm((tip - seat) - (d.site_xpos[tip_s] - RX['seat'])) * 1000:5.2f} mm, twist {rc['slot_deg'] - rt['slot_deg']:+5.2f} deg "
                    f"| tags end {fe[2]['tags']}/{fe[2]['cams']}cam rx {fr[2]['tags']}/{fr[2]['cams']}cam {fr[2].get('via', '')} | floor tags {rl}")
    print(label); [print('   ', r) for r in rows]
