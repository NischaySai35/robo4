"""camera_check.py — grade the image-based camera against physics truth, and SAVE the picture with what it found.
   MARKERS=1 VISUAL_MESH=1 py -3.12 camera_check.py CKPT [eye_x eye_y eye_z]"""
from paths import tpath
import sys, math, numpy as np, mujoco, cv2; sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
from phys_world import PhysWorld
from camera import ThirdPersonCamera
w, ex = PhysWorld.load(sys.argv[1]); m, d = w.m, w.d; mujoco.mj_forward(m, d)
eye = tuple(float(x) for x in sys.argv[2:5]) if len(sys.argv) > 4 else (1.0, -1.0, 0.95)
cam = ThirdPersonCamera(m, eye=eye, target=(-0.05, -0.05, 0.22))
img = cam.render(d); found, corners, ids = cam.detect(img)
print(f'camera at {eye}, {cam.dist:.2f} m from the scene centre | markers on the robot: {len(w.markers)} | detected: {len(found)}')
errs = []
vis = img.copy()
if ids is not None: cv2.aruco.drawDetectedMarkers(vis, corners, ids)
for i, (Rw, cw) in sorted(found.items()):
    if i not in w.markers: continue
    mk = w.markers[i]; b = m.body(mk['body']).id; Rb = d.xmat[b].reshape(3, 3)
    true_c = d.xpos[b] + Rb @ np.array(mk['pos']); true_n = Rb @ np.array(mk['normal'])
    e_pos = np.linalg.norm(cw - true_c) * 1000; e_n = math.degrees(math.acos(np.clip(abs(Rw[:, 2] @ true_n), -1, 1)))
    rng = np.linalg.norm(true_c - np.array(eye)); errs.append((e_pos, e_n))
    print(f'  marker {i:3d} on {mk["owner"]:7s} ({mk["kind"]}): position off {e_pos:5.1f} mm, facing off {e_n:4.1f} deg, {rng:.2f} m from the camera')
if errs:
    E = np.array(errs); print(f'POSITION error: median {np.median(E[:, 0]):.1f} mm, worst {E[:, 0].max():.1f} mm | FACING: median {np.median(E[:, 1]):.1f} deg')
cv2.imwrite(tpath('logs/snaps/camera_view.png'), cv2.cvtColor(vis, cv2.COLOR_RGB2BGR)); print('picture: C:\TETROBOT\logs\snaps\camera_view.png')
