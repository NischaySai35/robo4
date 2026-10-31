"""snap.py — LOOK at a physics world: render it from 3 cameras into one labelled PNG (MuJoCo offscreen).
Used during runs every ~10 s of sim time and at every event (dock done / failed, peel, hold), so faults are SEEN,
not only read from numbers.
   from snap import Snapper;  S = Snapper(world, out_dir, tag);  S.shot('label')        (world = phys_world.PhysWorld)"""
import os, math, numpy as np, mujoco
END_A_RGBA, END_B_RGBA = (0.1, 0.2, 0.75, 1), (1.0, 0.55, 0.05, 1)    # same colours as the Studio (End A blue, End B orange)


class Snapper:
    def __init__(self, w, out_dir, tag, size=(480, 400), every=10.0):
        self.w, self.out, self.tag, self.size, self.every = w, out_dir, tag, size, every
        os.makedirs(out_dir, exist_ok=True); self.n = 0; self.last = -1e9
        self.R = mujoco.Renderer(w.m, size[1], size[0])
        # one colour per module (display only), so a picture says WHICH module did what
        col = {'R': (0.85, 0.2, 0.2, 1), 'W1': (0.2, 0.7, 0.25, 1), 'W2': (0.95, 0.8, 0.1, 1), 'X1': (0.2, 0.4, 0.9, 1), 'X2': (0.6, 0.3, 0.8, 1), 'X3': (0.1, 0.7, 0.8, 1),
               'M1': (0.85, 0.2, 0.2, 1), 'M2': (0.2, 0.7, 0.25, 1), 'M3': (0.95, 0.8, 0.1, 1), 'M4': (0.6, 0.3, 0.8, 1)}
        m = w.m
        for g in range(m.ngeom):
            mid = m.body(m.geom_bodyid[g]).name.split('_')[0]
            if mid in col and m.geom_rgba[g, 3] > 0: m.geom_rgba[g] = col[mid]
        # the two OUTER end connectors in their own colours (Nischay: the module is symmetric, which end is which?):
        # End A = dark blue, End B = orange; the inner lock rotors keep the module colour
        for g in range(m.ngeom):
            bn = m.body(m.geom_bodyid[g]).name
            if m.geom_rgba[g, 3] > 0 and bn.endswith('EndA_LockModule'): m.geom_rgba[g] = END_A_RGBA
            if m.geom_rgba[g, 3] > 0 and bn.endswith('EndB_LockModule'): m.geom_rgba[g] = END_B_RGBA

    def _cam(self, az, el, dist):
        d = self.w.d; c = mujoco.MjvCamera(); c.type = mujoco.mjtCamera.mjCAMERA_FREE
        ids = [b for b in range(1, self.w.m.nbody) if not self.w.m.body(b).name.startswith('F_')]
        P = d.xpos[ids]; c.lookat[:] = (P.min(0) + P.max(0)) / 2; c.lookat[2] = max(0.12, min(0.25, c.lookat[2]))
        span = float(np.linalg.norm(P.max(0)[:2] - P.min(0)[:2]))       # long floor chains (2 m): back off so all of it is in the picture
        c.azimuth, c.elevation, c.distance = az, el, max(dist, 1.25 * span)
        return c

    def shot(self, label=''):
        """3 views side by side: oblique, side (low, like a person kneeling), top"""
        from PIL import Image, ImageDraw
        imgs = []
        opt = mujoco.MjvOption()
        if (self.w.m.geom_group == 2).any():           # the real CAD meshes are attached (VISUAL_MESH=1): show them, not the collision boxes
            opt.geomgroup[:] = 0; opt.geomgroup[2] = 1; opt.geomgroup[3] = 1
        for az, el, dist in ((135, -25, 1.6), (45, -5, 1.6), (90, -89, 1.5)):
            self.R.update_scene(self.w.d, self._cam(az, el, dist), opt); imgs.append(Image.fromarray(self.R.render()))
        W, H = self.size; im = Image.new('RGB', (3 * W, H + 26), 'white')
        for i, x in enumerate(imgs): im.paste(x, (i * W, 26))
        ImageDraw.Draw(im).text((6, 6), f't={self.w.d.time:6.1f}s  {label}', fill='black')
        self.n += 1; p = os.path.join(self.out, f'{self.tag}_{self.n:03d}.png'); im.save(p); self.last = self.w.d.time
        return p

    def tick(self, label=''):
        """call often; takes a picture every `every` seconds of sim time, and right after every bump (disturb.py)"""
        D = getattr(self.w, 'disturb', None); nb = len(D.log) if D else 0
        if nb > getattr(self, 'nbump', 0) and self.w.d.time - D.log[-1][0] >= 0.15:     # 150 ms after the knock: the reaction
            self.nbump = nb; return self.shot(f'{label} | right after {D.log[-1][1]}')
        if self.w.d.time - self.last >= self.every: return self.shot(label)
