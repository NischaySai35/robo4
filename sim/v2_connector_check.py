"""v2_connector_check.py — what EXACTLY do the Studio v2 port frames mean, measured against the
CAD-registered MuJoCo module (multi_train.xml: ends + side receivers from the same receiver template)?
For each port at the straight pose: position vs pad tip / gap floor / receiver seat, normal, and the
angle of the port x-axis from the nearest PAD (pads carry the N magnets: even magnet sites, at 0/90/180/270).
Needs v2_calib.json (export-v2-calib.ts) + v2_calib_fit.json.   py -3.12 v2_connector_check.py"""
from paths import tpath
import json, math, numpy as np, mujoco
from tetro_env2 import RX_GAP, RX_TOP
cal = json.load(open(tpath('sim/v2_calib.json')))[0]          # pose 0 = straight
fit = json.load(open(tpath('sim/v2_calib_fit.json'))); R, t = np.array(fit['R']), np.array(fit['t'])
m = mujoco.MjModel.from_xml_path(tpath('sim/multi_train.xml')); d = mujoco.MjData(m); mujoco.mj_forward(m, d)
mf = m.body('module_frame').id; R0 = d.xmat[mf].reshape(3, 3); p0 = d.xpos[mf]
loc = lambda p: R0.T @ (p - p0)                                      # world -> module_frame coords
locv = lambda v: R0.T @ v
def ang(a, b, n):
    """signed angle (deg) from a to b about n, both projected on the plane normal to n"""
    a = a - (a @ n) * n; b = b - (b @ n) * n
    return math.degrees(math.atan2(np.cross(a, b) @ n, a @ b))
def pad_dir(site_pref, origin, n):
    """direction (in plane) from the connector centre to its magnet 0 (a PAD: N magnets sit on pad tops)"""
    v = loc(d.site_xpos[m.site(site_pref + '0').id]) - origin; return v - (v @ n) * n
print('END connectors (TS port frame vs MuJoCo end):')
for e in 'AB':
    ts = cal['ports'][e]; P = R @ np.array(ts['pos']) + t; Z = R @ np.array(ts['z']); X = R @ np.array(ts['x'])
    tip = loc(d.site_xpos[m.site(f'{e}_padtip').id]); gap = loc(d.site_xpos[m.site(f'{e}_gapfloor').id])
    out = (tip - gap) / np.linalg.norm(tip - gap)
    bx = locv(d.xmat[m.body(f'End{e}_LockModule').id].reshape(3, 3)[:, 0])
    pd = pad_dir(f'{e}_mag', gap, out)
    print(f'  {e}: |port - padtip| {np.linalg.norm(P - tip) * 1000:.2f} mm, |port - gapfloor| {np.linalg.norm(P - gap) * 1000:.2f} mm, '
          f'tip-gap {np.linalg.norm(tip - gap) * 1000:.2f} mm | port z . outward {Z @ out:+.3f} | port x -> pad0 {ang(X, pd, out):+.1f} deg, body x -> pad0 {ang(bx, pd, out):+.1f} deg')
print('SIDE receivers (srx = template receiver on the spine; seat = gap floor = o + RX_GAP z):')
for n in range(4):
    b = m.body(f'srx{n}').id; o = loc(d.xpos[b]); Rr = R0.T @ d.xmat[b].reshape(3, 3); z = Rr[:, 2]
    seat = o + RX_GAP * z; top = o + RX_TOP * z
    pd = pad_dir(f'srx{n}_r0_rx_mag', seat, z)
    best = min(['S1A', 'S1B', 'S2A', 'S2B'], key=lambda k: np.linalg.norm(R @ np.array(cal['ports'][k]['pos']) + t - seat))
    ts = cal['ports'][best]; P = R @ np.array(ts['pos']) + t; Z = R @ np.array(ts['z']); X = R @ np.array(ts['x'])
    print(f'  srx{n} ~ {best}: |port - seat(gap floor)| {np.linalg.norm(P - seat) * 1000:.2f} mm, |port - pad top| {np.linalg.norm(P - top) * 1000:.2f} mm, '
          f'|port - back face| {np.linalg.norm(P - o) * 1000:.2f} mm | port z . rx z {Z @ z:+.3f} | port x -> pad0 {ang(X, pd, z):+.1f} deg, rx x -> pad0 {ang(Rr[:, 0], pd, z):+.1f} deg')
