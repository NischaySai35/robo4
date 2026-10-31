"""cam_judge.py — the third-person stereo camera as an OPTIONAL add-on judge for the docking brain (Nischay 29 Oct:
transformations must work without it; it can be switched on mid-way; the camera itself may shake).

  off, or too little in view -> None: the brain trusts its encoders (laptop_controller treats None as "no judge" at every stage)
  on_at / off_at (sim seconds) or .enabled: switch it on/off at any time; the brain uses it from its next check on
  everything it says comes from the two PICTURES: tag corners -> one rigid-body fit per end over both cameras
  a spine receiver has no tags: its module's nearest tagged end (camera) + that module's encoders in between (nominal model)
  shaking / knocked camera: before each look it re-measures its own pose from the floor-receiver tags (the board map)
Physics truth is used only to render the pictures and to GRADE the camera (logged next to every answer, never used by it).

Use:  J = CameraJudge(world, shake_mm=2, knock_at=5.0);  phys_dock.dock(env, ..., judge=J)"""
from paths import tpath
import os, math, numpy as np, mujoco, cv2
from scipy.optimize import least_squares
import camera as CAM
from phys_dock import end_rel, ModelBelief
from tetro_env2 import RX_TOP, RX_GAP

SEAT_AX, SEAT_RAD = 0.6, 1.5                       # mm: "seated" (fins need < ~0.6 mm, as walk.sim_camera)
PRIOR_DEG = 10.0                                   # how far the model's orientation may be off: measured 5-12 deg (PLA sag + backlash, cardboard play) 29 Oct
PX_SIGMA = 0.7                                     # measured corner noise, px (29 Oct, 1920x1440, 18 mm tags at ~1.4 m)


CAM_RES = tuple(int(v) for v in os.environ.get('CAM_RES', '1920x1440').split('x'))   # each camera's picture (px)


CAM_DIST = float(os.environ.get('CAM_DIST', '1.0'))   # m from the work area (29 Oct, S2B hover: 1.4 m = the docking end in one camera only; 0.8 m = target end out of view)
CHAIN_DEG = 2.0                                        # tilt error of a receiver reached through <= 3 links of model (estimate)
MAX_LINKS = 3                                          # a spine receiver via > 3 links of model = sag errors of ~12 mm (measured): not trusted


def rig_around(m, target, dist=CAM_DIST, el_deg=40.0, az_deg=(-40.0, -80.0), size=CAM_RES):
    """two cameras on a shelf looking at the work area: dist m from target, el_deg above it, az_deg = direction target->eye"""
    eyes = [np.asarray(target) + dist * np.array([math.cos(math.radians(el_deg)) * math.cos(math.radians(a)),
                                                    math.cos(math.radians(el_deg)) * math.sin(math.radians(a)), math.sin(math.radians(el_deg))]) for a in az_deg]
    return CAM.StereoRig(m, eyes=eyes, target=target, size=size)


class CameraJudge:
    def __init__(self, world, rig=None, on_at=0.0, off_at=math.inf, shake_mm=0.0, knock_at=None, relocalize=True,
                 snap_dir=tpath('logs/snaps'), tag='cam', seed=0, log=None):
        w = self.w = world; m = w.m; d = w.d
        assert w.markers, 'build the world with MARKERS=1 (camera tags)'
        if rig is None:                                  # aim at the middle of the modules, like a person setting up the shelf
            P = np.array([d.xpos[b] for b in range(1, m.nbody) if m.body(b).name.split('_')[0] in w.ids]); rig = rig_around(m, (P.min(0) + P.max(0)) / 2)
        self.rig = rig; self.cams = rig.cams
        for c in self.cams:
            if not hasattr(c, 'eye0'): c.eye0, c.target0 = c.eye.copy(), c.target.copy()     # where it was set up (a reused rig keeps it)
        self.enabled, self.on_at, self.off_at = True, on_at, off_at
        self.shake_mm, self.knock_at, self.reloc = shake_mm, knock_at, relocalize
        self.rng = np.random.default_rng(seed + 7); self.sh = np.zeros((len(self.cams), 6)); self.sh_t = None
        self.snap_dir, self.tag, self.n = snap_dir, tag, 0; self.looks = []; self.log = log or (lambda s: None)
        self.tag_body = {i: m.body(mk['body']).id for i, mk in w.markers.items()}
        self.tag_cb = {i: CAM.tag_corners(mk) for i, mk in w.markers.items()}
        self.belief = ModelBelief(w, self.rng); d0 = self.belief.d0     # the BOARD MAP: floor receivers where they were put (no cardboard play)
        self.floor_world = {i: d0.xpos[self.tag_body[i]] + self.tag_cb[i] @ d0.xmat[self.tag_body[i]].reshape(3, 3).T
                            for i, mk in w.markers.items() if mk['kind'] == 'floor'}
        self.n_look = 0
        self.ends = {mid: {e: m.body(f'{mid}_End{e}_LockModule').id for e in 'AB'} for mid in w.ids}

    # ---------- switching ----------
    def on(self):
        t = float(self.w.d.time); return bool(self.enabled and self.on_at <= t < self.off_at)

    # ---------- the camera itself ----------
    def _shake(self, t):
        """tripod shake (Ornstein-Uhlenbeck, ~0.4 s) on each camera's eye and aim point, plus a knock (a lasting shove)"""
        if self.sh_t is not None and self.shake_mm > 0:
            dt = max(0.0, t - self.sh_t); tau = 0.4; a = math.exp(-dt / tau)
            self.sh = self.sh * a + self.shake_mm * 1e-3 * math.sqrt(1 - a * a) * self.rng.normal(0, 1, self.sh.shape)
        self.sh_t = t
        knock = np.array([0.012, -0.010, 0.006, 0.0, 0.020, -0.012]) if (self.knock_at is not None and t >= self.knock_at) else np.zeros(6)
        return [self.sh[k] + knock * (1 if k == 0 else -0.6) for k in range(len(self.cams))]

    def look(self):
        """render both cameras where they REALLY are, re-measure where they are from the floor tags, detect every tag"""
        d = self.w.d; offs = self._shake(float(d.time)); imgs, dets, reloc = [], [], []; self.n_look += 1
        for c, o in zip(self.cams, offs):
            c.aim(c.eye0 + o[:3], c.target0 + o[3:]); img = c.render(d); _, corners, ids = c.detect(img)
            det = {} if ids is None else {int(i): k.reshape(4, 2).astype(np.float64) for k, i in zip(corners, ids.flatten())}
            reloc.append(c.relocalize(det, self.floor_world) if self.reloc else 0); imgs.append(img); dets.append(det)
        return imgs, dets, reloc

    # ---------- what the robot's own model says (no camera): phys_dock.ModelBelief ----------
    def model_pose(self, bid): return self.belief.body_pose(bid)

    # ---------- what the pictures say ----------
    def fit(self, bid, dets, drop=frozenset(), prior=None, prior_deg=PRIOR_DEG):
        """pose (R, p) of body bid from every corner of its tags in either camera; None if unseen. info: tags, cameras, rms px.
        One small tag fixes its POSITION well (0.2 mm triangulated) but its tilt only to 3-6 deg (x ~46 mm lever to the pad tip
        = 4-7 mm, measured 29 Oct): the model's orientation (PRIOR_DEG) holds the directions the pictures can't.
        A tag that does not fit the others (partly hidden, misread: 6.9 px seen 29 Oct) is dropped and the rest refitted."""
        obs = [(k, i, self.tag_cb[i], px) for k, det in enumerate(dets) for i, px in det.items() if self.tag_body[i] == bid and i not in drop]
        if not obs: return None
        k, i0, cb, px = max(obs, key=lambda o: cv2.contourArea(o[3].astype(np.float32)))
        c = self.cams[k]; s = self.w.markers[i0].get('size', CAM.MARKER_M) / 2; obj = np.array([[-s, s, 0], [s, s, 0], [s, -s, 0], [-s, -s, 0]], np.float32)
        ok, rv, tv = cv2.solvePnP(obj, px.astype(np.float32), c.K, None, flags=cv2.SOLVEPNP_IPPE_SQUARE)
        if not ok: return None
        mk = self.w.markers[i0]
        R_bt = np.zeros(9); mujoco.mju_quat2Mat(R_bt, np.array(mk['quat'])); R_bt = R_bt.reshape(3, 3)
        R_wt = c.R_wc @ cv2.Rodrigues(rv)[0]; p_wt = c.eye + c.R_wc @ tv.flatten()
        R0 = R_wt @ R_bt.T; p0 = p_wt - R0 @ np.array(mk['pos'])
        prior = prior or self.model_pose(bid)
        def res(x):
            R = cv2.Rodrigues(x[:3])[0] @ R0; p = p0 + x[3:]; out = []
            for k_, _, cb_, px_ in obs:
                cc = self.cams[k_]; Xc = (p + cb_ @ R.T - cc.eye) @ cc.R_wc; uv = Xc @ cc.K.T; out.append((uv[:, :2] / uv[:, 2:3] - px_).ravel() / PX_SIGMA)
            if prior is not None: out.append(cv2.Rodrigues(R @ prior[0].T)[0].ravel() / math.radians(prior_deg))
            return np.concatenate(out)
        sol = least_squares(res, np.zeros(6), method='lm')
        R = cv2.Rodrigues(sol.x[:3])[0] @ R0; p = p0 + sol.x[3:]
        r = (sol.fun[:8 * len(obs)] * PX_SIGMA).reshape(len(obs), 8)
        info = dict(tags=len(obs), cams=len({o[0] for o in obs}), rms_px=float(np.sqrt(np.mean(r ** 2))), prior=prior is not None, dropped=sorted(drop))
        ids = {o[1] for o in obs}
        if info['rms_px'] > 3 and len(ids) > 1:
            worst = max(ids, key=lambda i: np.mean([np.mean(r[j] ** 2) for j, o in enumerate(obs) if o[1] == i]))
            return self.fit(bid, dets, drop | {worst}, prior, prior_deg)
        return R, p, info

    def _chain(self, b_from, b_to):
        """links between two bodies of one module (fewer = less model error)"""
        m = self.w.m; up = lambda b: [b] + (up(m.body_parentid[b]) if b else [])
        A, B = up(b_from), up(b_to); common = next(x for x in A if x in B)
        return A.index(common) + B.index(common)

    def rx_pose(self, RX, dets):
        """(R, p, info) of receiver RX's body from the pictures. A spine receiver: nearest seen end of its module + encoders"""
        if RX['kind'] == 'floor':                       # its tags are on the board: the board map (cardboard play not seen)
            R, p = self.model_pose(RX['bid']); return R, p, dict(tags=0, cams=2, rms_px=0.0, via='board map')
        if RX['kind'] != 'side': return self.fit(RX['bid'], dets)
        w = self.w; m = w.m; mid = RX['mod']
        for e in sorted('AB', key=lambda e: self._chain(self.ends[mid][e], RX['bid'])):
            if self._chain(self.ends[mid][e], RX['bid']) > MAX_LINKS: continue
            f = self.fit(self.ends[mid][e], dets)
            if f is None or f[2]['cams'] < 2: continue
            be = self.ends[mid][e]; R_er, p_er = self.belief.rel(self.belief.kin(mid), be, RX['bid'])
            R = f[0] @ R_er; p = f[1] + f[0] @ p_er; via = f'{mid}.{e}+{self._chain(be, RX["bid"])} links'
            g = self.fit(RX['bid'], dets, prior=(R, p), prior_deg=CHAIN_DEG)   # its own ring tags (RX_TAGS=1): position from them, tilt from the chain
            if g is not None and g[2]['cams'] >= 2 and g[2]['rms_px'] < 3: return g[0], g[1], dict(g[2], via=f'own tags + {via} tilt')
            return R, p, dict(f[2], via=via)
        return None

    # ---------- the judge (walk.Walker.judge_fn) ----------
    def judge(self, env, W, stage, C):
        if not self.on(): return None
        w = self.w; m, d = w.m, w.d; imgs, dets, reloc = self.look(); mv = W.moving; RX = w.rx[C._rx]
        fe = self.fit(env.end[mv]['body'], dets); fr = self.rx_pose(RX, dets)
        tip_loc = m.site_pos[env.end[mv]['tip']]
        # truth, for grading only
        tip_t = d.site_xpos[env.end[mv]['tip']]; Re_t = d.xmat[env.end[mv]['body']].reshape(3, 3); seat_t, z_t, Rr_t = RX['seat'], RX['z'], RX['R']
        rec = dict(t=round(float(d.time), 2), stage=stage, reloc=reloc, end=None if fe is None else fe[2], rx=None if fr is None else fr[2])
        good = fe is not None and fr is not None and fe[2]['cams'] >= 2 and fr[2]['cams'] >= 2 and fe[2]['rms_px'] < 3 and fr[2]['rms_px'] < 3
        if not good:
            last = getattr(self, '_last_seat', (None, None))
            if stage == 'seat' and last[0] == id(C):           # on, but this look failed: keep its last seat answer (don't lock blind)
                rec['answer'] = f"cannot see well enough -> its last seat answer (seated={last[1][0]}): end {rec['end']}, receiver {rec['rx']}"; self._keep(rec, imgs, dets, None); return last[1]
            rec['answer'] = f"cannot see well enough -> None (encoders): end {rec['end']}, receiver {rec['rx']}"; self._keep(rec, imgs, dets, None); return None
        Re, pe = fe[0], fe[1]; tip = pe + Re @ tip_loc; seat, z, Rr = w.rx_frame(RX, fr[0], fr[1])
        RM = C._M[:3, :3]; rc, rt = end_rel(tip, Re, seat, z, Rr), end_rel(tip_t, Re_t, seat_t, z_t, Rr_t)
        rec.update(cam=rc, true=rt, err_mm=float(np.linalg.norm((tip - seat) - (tip_t - seat_t)) * 1000))
        if stage == 'hover':
            hov = lambda s_, z_: s_ + (RX_TOP - RX_GAP + C.standoff) * z_
            dd = RM @ (tip - hov(seat, z)); n = RM @ (Re[:, 1] if mv == 'B' else -Re[:, 1]); zc = RM @ z
            tau = np.cross(n, -zc); tau -= (tau @ zc) * zc
            out = (dd, math.radians(rc['slot_deg']), tau)
            rec['answer'] = f"{np.linalg.norm(dd) * 1000:.1f} mm off the hover point (truth {np.linalg.norm(tip_t - hov(seat_t, z_t)) * 1000:.1f}), twist {rc['slot_deg']:.1f} deg (truth {rt['slot_deg']:.1f})"
        elif stage == 'mid':
            out = RM @ (tip - (seat + C.appr * z)); lat = out - (out @ (RM @ z)) * (RM @ z)
            rec['answer'] = f"{rc['radial_mm']:.1f} mm off the axis (truth {rt['radial_mm']:.1f}) at {rc['axial_mm']:.1f} mm out"
        else:
            seated = abs(rc['axial_mm']) < SEAT_AX and rc['radial_mm'] < SEAT_RAD; out = (seated, RM @ (tip - seat)); self._last_seat = (id(C), out)
            rec['answer'] = f"seated={seated}: gap {rc['axial_mm']:.2f} mm side {rc['radial_mm']:.2f} mm (truth gap {rt['axial_mm']:.2f} side {rt['radial_mm']:.2f})"
        self._keep(rec, imgs, dets, (tip, seat, z))
        return out

    # ---------- pictures from the camera view ----------
    def _keep(self, rec, imgs, dets, geo):
        self.looks.append(rec); self.n += 1
        self.log(f"  camera look {self.n} ({rec['stage']}, t={rec['t']} s, relocalized from {rec['reloc']} floor tags): {rec['answer']}")
        if not self.snap_dir: return
        tiles, zooms = [], []
        for c, img, det in zip(self.cams, imgs, dets):
            im = cv2.cvtColor(img, cv2.COLOR_RGB2BGR).copy()
            if det: cv2.aruco.drawDetectedMarkers(im, [v.reshape(1, 4, 2).astype(np.float32) for v in det.values()], np.array(list(det)).reshape(-1, 1))
            if geo is not None:
                tip, seat, z = geo
                pr = lambda X: tuple(int(v) for v in (lambda u: u[:2] / u[2])(c.K @ (c.R_wc.T @ (X - c.eye))))
                cv2.circle(im, pr(tip), 12, (0, 140, 255), 3); cv2.circle(im, pr(seat), 12, (255, 80, 0), 3); cv2.line(im, pr(seat), pr(seat + 0.05 * z), (255, 80, 0), 3)   # orange = end tip, blue = seat + axis
            tiles.append(cv2.resize(im, (960, 720)))
            if geo is not None:                                   # zoom on the connector: what the camera judged
                u, v = pr(geo[1]); H, W_ = im.shape[:2]; u0, v0 = int(np.clip(u - 480, 0, W_ - 960)), int(np.clip(v - 360, 0, H - 720)); zooms.append(im[v0:v0 + 720, u0:u0 + 960].copy())
        if zooms: tiles = [np.vstack([t, z]) for t, z in zip(tiles, zooms)] if len(zooms) == len(tiles) else tiles
        im = np.hstack(tiles); cv2.putText(im, f"{rec['stage']} t={rec['t']}s: {rec['answer']}"[:150], (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        os.makedirs(self.snap_dir, exist_ok=True); cv2.imwrite(os.path.join(self.snap_dir, f'{self.tag}_{self.n:02d}_{rec["stage"]}.png'), im)
