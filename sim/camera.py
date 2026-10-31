"""camera.py — a REAL (image-based) third-person camera for the simulation, the same pipeline as the real robot's camera.

  markers : ArUco tags (DICT_4X4_100) printed on every OUTER end connector (4 around the housing, so one always faces the
            camera) and 2 lying flat beside every floor receiver. Visual only (no mass, no collision). MARKERS=1 adds them.
  camera  : fixed in the room, like a person standing at the table (eye position + target point), pinhole, 1280x960.
  detect  : OpenCV ArUco -> each marker's corners -> solvePnP -> its 3D pose in the WORLD (known camera pose).
  measure : where an end connector is relative to a receiver, from the markers alone (no physics truth).
Physics truth is used ONLY to grade the camera (camera_check.py), never by the measurement itself."""
from paths import tpath
import os, math, json, numpy as np, mujoco, cv2

MARK_DIR = tpath('logs/markers')
DICT = cv2.aruco.DICT_4X4_100
FLOOR_TAG_M = float(os.environ.get('FLOOR_TAG_MM', '18')) / 1000   # tags on the board beside each floor receiver (paper: can be bigger)
TAGS_PER_END = int(os.environ.get('TAGS_PER_END', '4'))           # 4 at 90 deg (mounts.json) or 8 at 45 deg (mounts8.json)
RX_TAGS = os.environ.get('RX_TAGS', '0') == '1'                    # also 2 tags on every spine receiver ring (mounts*_rx.json)
MARKER_M = 0.018          # printed black square (Nischay 29 Oct: smaller than the first 24 mm; 12 mm was unreadable at 1.5 m)
BORDER = 0.10             # white margin around it (fraction of the black square): 18 mm tag -> 21.6 mm plate, fits the housing ring
END_R = 0.0405            # housing radius (kin.SEG_RADIUS 39 mm + 1.5 mm)
END_BACK = 0.030          # marker centre this far behind the pad tip, along the module axis


def _marker_png(i):
    os.makedirs(MARK_DIR, exist_ok=True); p = os.path.join(MARK_DIR, f'aruco_{i}.png')
    if not os.path.exists(p):
        img = cv2.aruco.generateImageMarker(cv2.aruco.getPredefinedDictionary(DICT), i, 240)
        b = int(240 * BORDER); img = cv2.copyMakeBorder(img, b, b, b, b, cv2.BORDER_CONSTANT, value=255)
        cv2.imwrite(p, cv2.cvtColor(img, cv2.COLOR_GRAY2RGB))
    return p


def _quat_basis(n, up):
    """quaternion (w,x,y,z) of a frame with z = n (the tag faces out) and y = `up` made perpendicular (tag edges square to the module)"""
    z = np.array(n, float); z /= np.linalg.norm(z); y = np.array(up, float) - (np.array(up, float) @ z) * z; y /= np.linalg.norm(y); x = np.cross(y, z)
    q = np.zeros(4); mujoco.mju_mat2Quat(q, np.stack([x, y, z], 1).flatten()); return list(q)


def _quat_z_to(n):
    """quaternion (w,x,y,z) that turns +z onto unit vector n"""
    z = np.array([0, 0, 1.0]); n = n / np.linalg.norm(n); v = np.cross(z, n); c = float(z @ n)
    if np.linalg.norm(v) < 1e-9: return [1, 0, 0, 0] if c > 0 else [0, 1, 0, 0]
    ang = math.acos(max(-1, min(1, c))); v = v / np.linalg.norm(v); s = math.sin(ang / 2)
    return [math.cos(ang / 2), v[0] * s, v[1] * s, v[2] * s]


def add_markers(spec, ids, anchors, end_tip_local, anchor_frames):
    """add marker plates to the spec (before compile). end_tip_local[(mid,e)] = pad tip position in the end body frame.
    anchor_frames[id] = (pos, R) of each floor receiver's frame: its board tags are printed on the BOARD (world), so they do not
    tilt with the receiver's cardboard play (29 Oct: tags on the receiver body moved with it and spoiled the camera's own pose).
    Returns the marker table: id -> dict(body, pos (in body), normal (in body), kind, owner)"""
    table = {}; nid = [0]
    def plate(body, pos, normal, kind, owner, up=None, size=MARKER_M):
        i = nid[0]; nid[0] += 1
        tex = spec.add_texture(); tex.name = f'arucotex_{i}'; tex.type = mujoco.mjtTexture.mjTEXTURE_2D; tex.file = _marker_png(i)
        mat = spec.add_material(); mat.name = f'arucomat_{i}'; mat.textures[mujoco.mjtTextureRole.mjTEXROLE_RGB] = tex.name
        g = body.add_geom(); g.type = mujoco.mjtGeom.mjGEOM_BOX; half = size * (1 + 2 * BORDER) / 2
        g.size = [half, half, 0.0004]; g.pos = list(pos); g.quat = _quat_basis(normal, up) if up is not None else _quat_z_to(np.array(normal)); g.material = mat.name
        g.contype = 0; g.conaffinity = 0; g.group = 2; g.mass = 0; g.name = f'aruco_{i}'
        table[i] = dict(body=body.name, pos=list(map(float, pos)), normal=list(map(float, normal)), quat=list(map(float, g.quat)), size=size, kind=kind, owner=owner)
    fn = 'mounts.json' if TAGS_PER_END == 4 else f'mounts{TAGS_PER_END}.json'
    mounts = json.load(open(os.path.join(MARK_DIR, fn.replace('.json', '_rx.json') if RX_TAGS else fn)))   # tag positions ON the real CAD housing (marker_mounts.py)
    for mid in ids:
        for e in 'AB':
            b = spec.body(f'{mid}_End{e}_LockModule')
            for k in range(TAGS_PER_END):
                if f'{e}{k}' not in mounts: continue
                mt = mounts[f'{e}{k}']; plate(b, mt['pos'], mt['normal'], 'end', f'{mid}.{e}', up=[0, 1.0, 0])   # body y = module axis
        if RX_TAGS:
            from phys_world import SPINE_RX
            for port, sn in SPINE_RX.items():
                for k in range(8):
                    if f'{port}{k}' in mounts:
                        mt = mounts[f'{port}{k}']; plate(spec.body(f'{mid}_{sn}'), mt['pos'], mt['normal'], 'rx', f'{mid}.{port}', up=[0, 0, 1.0])   # up = receiver axis
    for an in anchors:
        rb = spec.body(f"F_{an['id']}_rx0"); fp, fR = anchor_frames[an['id']]
        Rl = np.zeros(9); mujoco.mju_quat2Mat(Rl, np.array(rb.quat, float)); Rw = fR @ Rl.reshape(3, 3); pw = fp + fR @ np.array(rb.pos, float)
        off = 0.068 + max(0.0, FLOOR_TAG_M - MARKER_M) * (1 + 2 * BORDER) / 2           # bigger board tags sit further out (clear of the receiver)
        for sx in (1, -1): plate(spec.worldbody, pw + Rw @ np.array([sx * off, 0, 0.0005]), Rw[:, 2], 'floor', f"F:{an['id']}", up=Rw[:, 0], size=FLOOR_TAG_M)
    return table


def _look(eye, target):
    """azimuth, elevation, distance (MuJoCo free camera) and the OpenCV camera axes in the world (z forward, x right, y down)"""
    fwd = np.asarray(target, float) - np.asarray(eye, float); dist = float(np.linalg.norm(fwd)); fwd = fwd / dist
    up = np.array([0, 0, 1.0]); x = np.cross(fwd, up); x /= np.linalg.norm(x); y = np.cross(fwd, x)
    return math.degrees(math.atan2(fwd[1], fwd[0])), math.degrees(math.asin(fwd[2])), dist, np.stack([x, y, fwd], 1)


def tag_corners(mk):
    """the 4 black-square corners of marker mk in its body frame, in OpenCV's detection order"""
    R = np.zeros(9); mujoco.mju_quat2Mat(R, np.array(mk['quat'])); R = R.reshape(3, 3); s = mk.get('size', MARKER_M) / 2
    return np.array(mk['pos']) + np.array([[-s, s, 0], [s, s, 0], [s, -s, 0], [-s, -s, 0]]) @ R.T


class ThirdPersonCamera:
    """a fixed camera in the room. eye/target in world metres (MuJoCo, z up).
    Two poses: where it REALLY is (render: aim() moves it, e.g. a shaking tripod) and where it BELIEVES it is (eye, R_wc:
    used to turn pictures into world positions; relocalize() re-measures it from the floor-receiver tags)."""

    def __init__(self, m, eye=(0.9, -0.9, 0.9), target=(0.0, 0.0, 0.25), size=(1280, 960), fovy=45.0):
        self.m = m; self.W, self.H = size; self.eye = np.array(eye, float); self.target = np.array(target, float); self.fovy = fovy
        m.vis.global_.offwidth = max(m.vis.global_.offwidth, self.W); m.vis.global_.offheight = max(m.vis.global_.offheight, self.H)
        self.R = mujoco.Renderer(m, self.H, self.W)
        f = (self.H / 2) / math.tan(math.radians(fovy) / 2); self.K = np.array([[f, 0, self.W / 2 - 0.5], [0, f, self.H / 2 - 0.5], [0, 0, 1.0]])   # OpenCV: pixel CENTRES are integers (was W/2: a steady 0.5 px offset)
        self.az, self.el, self.dist, self.R_wc = _look(self.eye, self.target)   # R_wc columns = camera axes in world
        self.eye_true, self.R_true = self.eye.copy(), self.R_wc.copy()
        self.opt = mujoco.MjvOption(); self.opt.geomgroup[:] = 0; self.opt.geomgroup[2] = 1; self.opt.geomgroup[3] = 1

    def aim(self, eye, target):
        """move the REAL camera (what it renders); its belief (eye, R_wc) stays until relocalize()"""
        self.target = np.asarray(target, float); self.eye_true = np.asarray(eye, float)
        self.az, self.el, self.dist, self.R_true = _look(eye, target)

    def relocalize(self, corners, world_corners, min_tags=2):
        """re-measure where this camera is from tags whose world corners are known (floor-receiver tags on the board map).
        corners: id -> 4x2 pixels; world_corners: id -> 4x3. Returns the number of tags used (0 = belief kept)."""
        ids = [i for i in corners if i in world_corners]
        if len(ids) < min_tags: return 0
        obj = np.concatenate([world_corners[i] for i in ids]).astype(np.float64); img = np.concatenate([corners[i] for i in ids]).astype(np.float64)
        R_cw = self.R_wc.T; rv0, _ = cv2.Rodrigues(R_cw); tv0 = -R_cw @ self.eye
        ok, rv, tv = cv2.solvePnP(obj, img, self.K, None, rv0.copy(), tv0.reshape(3, 1).copy(), useExtrinsicGuess=True, flags=cv2.SOLVEPNP_ITERATIVE)
        if not ok: return 0
        R_cw, _ = cv2.Rodrigues(rv); self.R_wc = R_cw.T; self.eye = (-R_cw.T @ tv).flatten()
        return len(ids)

    def render(self, d):
        c = mujoco.MjvCamera(); c.type = mujoco.mjtCamera.mjCAMERA_FREE; c.lookat[:] = self.target
        c.azimuth, c.elevation, c.distance = self.az, self.el, self.dist
        old = self.m.vis.global_.fovy; self.m.vis.global_.fovy = self.fovy
        self.R.update_scene(d, c, self.opt); img = self.R.render(); self.m.vis.global_.fovy = old
        return img

    def detect(self, img):
        """id -> (R_world (3x3, marker z = its normal), centre_world (3,)), from the picture alone"""
        det = cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(DICT), cv2.aruco.DetectorParameters())
        det.getDetectorParameters().cornerRefinementMethod = cv2.aruco.CORNER_REFINE_SUBPIX
        corners, ids, _ = det.detectMarkers(cv2.cvtColor(img, cv2.COLOR_RGB2GRAY))
        out = {}
        if ids is None: return out, corners, ids
        s = MARKER_M / 2; obj = np.array([[-s, s, 0], [s, s, 0], [s, -s, 0], [-s, -s, 0]], np.float32)
        for c, i in zip(corners, ids.flatten()):
            ok, rv, tv = cv2.solvePnP(obj, c.reshape(4, 2).astype(np.float32), self.K, None, flags=cv2.SOLVEPNP_IPPE_SQUARE)
            if not ok: continue
            Rc, _ = cv2.Rodrigues(rv)
            out[int(i)] = (self.R_wc @ Rc, self.eye + self.R_wc @ tv.flatten())
        return out, corners, ids


class StereoRig:
    """two fixed third-person cameras (e.g. two webcams on a shelf): a marker seen by both is placed where the two sight
    lines meet (triangulation from its sub-pixel centre), not from how big it looks (one camera: 10-25 % depth error)"""

    def __init__(self, m, eyes=((1.0, -1.0, 0.95), (0.15, -1.35, 0.95)), target=(-0.05, -0.05, 0.22), size=(1280, 960)):
        self.cams = [ThirdPersonCamera(m, eye=e, target=target, size=size) for e in eyes]

    def P(self, c):
        R_cw = c.R_wc.T; t = -R_cw @ c.eye; return c.K @ np.hstack([R_cw, t[:, None]])

    def measure(self, d):
        """id -> centre_world (3,), from markers seen by BOTH cameras; also the two pictures and per-camera detections"""
        imgs, dets = [], []
        for c in self.cams:
            img = c.render(d); _, corners, ids = c.detect(img); imgs.append(img)
            dets.append({} if ids is None else {int(i): k.reshape(4, 2).mean(0) for k, i in zip(corners, ids.flatten())})
        out = {}
        for i in set(dets[0]) & set(dets[1]):
            X = cv2.triangulatePoints(self.P(self.cams[0]), self.P(self.cams[1]), dets[0][i].reshape(2, 1), dets[1][i].reshape(2, 1))
            out[i] = (X[:3] / X[3]).flatten()
        return out, imgs, dets
