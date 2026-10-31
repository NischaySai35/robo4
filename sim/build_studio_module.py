"""Build the NEW default module (try8: T1-B1-B2-T2-B3-B4-T3, 9 ST3215, 2 end locks, 4 side receivers on the 2 spines) as a TETROBOT Studio Document.
Output -> D:\\robo4\\assets\\tetrobot-module\\ (STLs, module_spec.json, README) and D:\\robo4\\studio\\src\\core\\factory\\single-module-demo.json
Frames: CAD/MJCF long axis = Y.  Studio frame = Rz(+90deg) of CAD: (x,y,z)_studio = (y_cad, -x_cad, z_cad)  -> module lies along +X, bends about Y like the old module."""
from paths import tpath
import json, os, struct, hashlib, base64, math, shutil, numpy as np, mujoco
mujoco.set_mju_user_warning(lambda m: None)
OUT = r'D:\robo4\assets\tetrobot-module'; FAC = r'D:\robo4\studio\src\core\factory'
os.makedirs(OUT + r'\meshes', exist_ok=True); os.makedirs(OUT + r'\legacy', exist_ok=True)
Q = np.array([[0, 1, 0], [-1, 0, 0], [0, 0, 1.0]])            # cad -> studio rotation
def rot(v): return Q @ np.asarray(v, float)
def load(p):
    b = open(p, 'rb').read(); n = struct.unpack('<I', b[80:84])[0]
    a = np.frombuffer(b[84:], dtype=np.dtype([('n', '<3f4'), ('v', '<9f4'), ('a', '<u2')]), count=n); return a['v'].reshape(-1, 3, 3).astype(np.float64)
def write_stl(p, tri):
    n = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]); l = np.linalg.norm(n, axis=1, keepdims=True); n = n / np.where(l == 0, 1, l)
    rec = np.zeros(len(tri), dtype=np.dtype([('n', '<3f4'), ('v', '<9f4'), ('a', '<u2')])); rec['n'] = n; rec['v'] = tri.reshape(-1, 9)
    with open(p, 'wb') as f: f.write(b'TETROBOT module try8 (studio frame, mm, body-local)'.ljust(80, b' ')); f.write(struct.pack('<I', len(tri))); f.write(rec.tobytes())
m = mujoco.MjModel.from_xml_path(tpath('sim/walk_train.xml')); d = mujoco.MjData(m); mujoco.mj_resetData(m, d); mujoco.mj_forward(m, d)
off = json.load(open(tpath('dashboard/meshes/offsets.json')))
NAMES = ['EndA_LockModule', 'L1_LockRotor_A', 'T1_Housing_B1Fork', 'Spine1_B1B2', 'T2_Housing_B2Fork_GROUND', 'T2_Ring_B3Fork', 'Spine2_B3B4', 'T3_Housing_B4Fork', 'EndB_LockModule', 'L2_LockRotor_B']
o0 = np.array(off[NAMES[0]]); H0 = np.array([0.0, 0.045, 0.0])      # EndA origin in studio coords (module lies on the grid)
pos = {n: rot(np.array(off[n]) - o0) + H0 for n in NAMES}      # CAD origin of each body (joint pivots live here)
# ---- meshes: world mm -> body-local (cad) -> studio, dedupe identical meshes
assets = {}; body_asset = {}; stl_files = {}; C = {}
for n in NAMES:
    T = load(tpath('dashboard/meshes/%s.stl') % n) - np.array(off[n]) * 1000.0
    T = (Q @ T.reshape(-1, 3).T).T.reshape(-1, 3, 3)
    V = T.reshape(-1, 3); C[n] = (V.min(0) + V.max(0)) / 2; T = T - C[n]      # viewer centres every mesh on its bbox centre (AssetCache geo.center()) -> body origin = bbox centre
    h = hashlib.md5(np.round(T, 2).tobytes()).hexdigest()[:8]
    if h not in assets:
        fn = r'%s\meshes\%s.stl' % (OUT, n); write_stl(fn, T); assets[h] = dict(id='asset-' + h, name=n + '.stl', file=fn)
    body_asset[n] = assets[h]['id']
print('unique meshes', len(assets), 'of', len(NAMES))
# ---- bodies
def inertia_full(b):
    R = np.zeros(9); mujoco.mju_quat2Mat(R, m.body_iquat[b]); R = R.reshape(3, 3); I = R @ np.diag(m.body_inertia[b]) @ R.T; I = Q @ I @ Q.T
    return dict(ixx=float(I[0, 0]), ixy=float(I[0, 1]), ixz=float(I[0, 2]), iyy=float(I[1, 1]), iyz=float(I[1, 2]), izz=float(I[2, 2]))
COMP = 'comp-tetrobot-try8'; MAT = dict(pla='mat-pla-white', spine='mat-spine-dark', lock='mat-lock-orange')
def sid(n): return 'body-' + n
MATOF = {n: MAT['spine'] if 'Spine' in n else MAT['lock'] if 'Rotor' in n else MAT['pla'] for n in NAMES}
def site_local(name, body): return rot(m.site(name).pos)
conn = {n: [] for n in NAMES}
sl = lambda nm: rot(m.site(nm).pos)
conn['EndA_LockModule'].append(dict(id='conn-endA', name='End A lock', position=sl('A_padtip').tolist(), normal=[-1, 0, 0], roll=rot([1, 0, 0]).tolist(), symmetry=4, kind='end'))
conn['EndB_LockModule'].append(dict(id='conn-endB', name='End B lock', position=sl('B_padtip').tolist(), normal=[1, 0, 0], roll=rot([1, 0, 0]).tolist(), symmetry=4, kind='end'))
RXGAP = 0.0063; SIDE = {}
for si, sn in enumerate(['Spine1_B1B2', 'Spine2_B3B4']):
    for sgn, lab in ((1, 'a'), (-1, 'b')):
        o = np.array([sgn * 0.025, 0.0804, 0.0]); z = np.array([sgn, 0, 0.0]); roll = np.array([0, 0, sgn * 1.0])
        conn[sn].append(dict(id='conn-s%d%s' % (si + 1, lab), name='Side receiver %d%s' % (si + 1, lab.upper()), position=rot(o + RXGAP * z).tolist(), normal=rot(z).tolist(), roll=rot(roll).tolist(), symmetry=4, kind='side'))
bodies = {}
bpos = {n: pos[n] + C[n] / 1000.0 for n in NAMES}                     # body origin in the Studio = mesh bbox centre
for n in NAMES:
    for c_ in conn[n]: c_['position'] = (np.array(c_['position']) - C[n] / 1000.0).tolist()
for n in NAMES:
    b = m.body(n).id
    bodies[sid(n)] = {"kind": "body", "id": sid(n), "name": n, "transform": {"position": bpos[n].tolist(), "quaternion": [0, 0, 0, 1], "scale": [1, 1, 1]},
        "visual": {"geometry": {"type": "mesh", "assetId": body_asset[n], "scale": [0.001, 0.001, 0.001]}, "materialId": MATOF[n], "origin": {"position": [0, 0, 0], "quaternion": [0, 0, 0, 1]}},
        "collision": None, "inertial": {"mass": float(m.body_mass[b]), "com": (rot(m.body_ipos[b]) - C[n] / 1000.0).tolist(), "inertia": inertia_full(b), "auto": False},
        "assetId": body_asset[n], "componentId": COMP, "tags": {}, "meta": {"connectors": conn[n], "cad": n}}
# ---- joints  (parent, child, name, kind, cad axis)
TW = rot([0, 1, 0]).tolist(); BD = rot([1, 0, 0]).tolist()
JL = [('EndA_LockModule', 'L1_LockRotor_A', 'J_L1_lock', 'lock', TW), ('EndA_LockModule', 'T1_Housing_B1Fork', 'J_T1_twist', 'twist', TW),
      ('T1_Housing_B1Fork', 'Spine1_B1B2', 'J_B1_bend', 'bend', BD), ('Spine1_B1B2', 'T2_Housing_B2Fork_GROUND', 'J_B2_bend', 'bend', BD),
      ('T2_Housing_B2Fork_GROUND', 'T2_Ring_B3Fork', 'J_T2_twist', 'twist', TW), ('T2_Ring_B3Fork', 'Spine2_B3B4', 'J_B3_bend', 'bend', BD),
      ('Spine2_B3B4', 'T3_Housing_B4Fork', 'J_B4_bend', 'bend', BD), ('T3_Housing_B4Fork', 'EndB_LockModule', 'J_T3_twist', 'twist', TW),
      ('EndB_LockModule', 'L2_LockRotor_B', 'J_L2_lock', 'lock', TW)]
LIM = dict(lock=math.radians(45), twist=math.pi, bend=math.radians(90)); PROF = dict(lock='prof-lock', twist='prof-twist', bend='prof-bend')
joints = {}
for par, ch, nm, kind, ax in JL:
    jid = 'joint-' + nm; ja = m.joint(nm); lo, hi = m.jnt_range[ja.id]
    joints[jid] = {"kind": "joint", "id": jid, "name": nm, "type": "revolute", "parentBodyId": sid(par), "childBodyId": sid(ch),
        "origin": {"position": (pos[ch] - bpos[par]).tolist(), "quaternion": [0, 0, 0, 1]}, "childRest": {"position": (C[ch] / 1000.0).tolist(), "quaternion": [0, 0, 0, 1]},
        "axis": ax, "limit": {"lower": float(lo) if kind != 'twist' else -math.pi, "upper": float(hi) if kind != 'twist' else math.pi, "effort": 2.7, "velocity": 4.71},
        "dynamics": {"damping": 0.01, "friction": 0.02}, "mimic": None, "state": {"value": 0}, "componentId": COMP, "profileId": PROF[kind], "meta": {"kind": kind, "cadJoint": nm}}
profiles = {PROF[k]: {"kind": "jointProfile", "id": PROF[k], "name": k.capitalize(), "motorType": "ST3215", "torqueLimit": 2.7, "meta": {}} for k in PROF}
mats = {MAT['pla']: dict(name='PLA white', color=[0.92, 0.92, 0.9, 1], metalness=0.0, roughness=0.55, density=1240),
        MAT['spine']: dict(name='Spine dark', color=[0.22, 0.23, 0.26, 1], metalness=0.1, roughness=0.5, density=1240),
        MAT['lock']: dict(name='Lock rotor orange', color=[0.95, 0.45, 0.1, 1], metalness=0.0, roughness=0.5, density=1240)}
materials = {k: {"kind": "material", "id": k, **v, "meta": {}} for k, v in mats.items()}
assets_doc = {a['id']: {"kind": "asset", "id": a['id'], "name": a['name'], "format": "stl", "data": base64.b64encode(open(a['file'], 'rb').read()).decode(), "url": None, "hash": None, "meta": {"file": 'assets/tetrobot-module/meshes/' + os.path.basename(a['file'])}} for a in assets.values()}
doc = {"kind": "document", "id": "doc-tetrobot-try8", "name": "TETROBOT module (try8, 7-DOF)", "modelVersion": 1, "bodies": bodies, "joints": joints, "jointProfiles": profiles, "materials": materials, "assets": assets_doc,
       "frames": {}, "constraints": {}, "components": {COMP: {"kind": "component", "id": COMP, "name": "TETROBOT Module", "collapsed": False, "color": None, "meta": {}}}, "mates": [], "meta": {"spec": "assets/tetrobot-module/module_spec.json"}}
old = os.path.join(FAC, 'single-module-demo.json')
if os.path.exists(old) and not os.path.exists(OUT + r'\legacy\single-module-demo.6dof.json'): shutil.copy(old, OUT + r'\legacy\single-module-demo.6dof.json')
json.dump(doc, open(old, 'w', encoding='utf-8'), separators=(',', ':'))
# ---- spec (authoritative numbers for planners / sims)
spec = {"name": "TETROBOT module try8", "dof": 7, "servos": 9, "chain": ["End A lock", "T1 twist", "B1 bend", "B2 bend", "T2 twist", "B3 bend", "B4 bend", "T3 twist", "End B lock"],
        "rod_order": ["twist", "bend", "bend", "twist", "bend", "bend", "twist"], "spines": ["Spine1_B1B2 (between B1,B2)", "Spine2_B3B4 (between B3,B4)"], "side_receivers_per_spine": 2, "side_receivers_total": 4,
        "frame_note": "studio = Rz(+90deg) of CAD: (x,y,z)_studio = (y_cad, -x_cad, z_cad); module long axis = +X; bends rotate about Y; twist & lock about X",
        "limits_deg": {"twist": [-180, 180], "bend": [-90, 90], "lock": [-45, 45]}, "servo": {"model": "ST3215", "stall_torque_Nm_usable": 2.7, "no_load_rad_s_12V": 4.71, "battery": "3S LiPo 11.1V"},
        "mass_kg_total": float(sum(m.body_mass[m.body(n).id] for n in NAMES)), "mass_real_kg": 1.134,
        "straight_length_m": float(abs(pos['L2_LockRotor_B'][0] - pos['L1_LockRotor_A'][0])), "end_to_end_pad_tip_m": float(abs((pos['EndB_LockModule'] + sl('B_padtip'))[0] - (pos['EndA_LockModule'] + sl('A_padtip'))[0])),
        "bodies_x_m": {n: float(pos[n][0] - H0[0]) for n in NAMES}, "joints": [dict(name=nm, parent=p, child=c, kind=k, axis_studio=ax, x_m=float(pos[c][0] - H0[0])) for p, c, nm, k, ax in JL],
        "connectors": {n: conn[n] for n in NAMES if conn[n]}, "receiver": {"note": "side receiver = the same receiver as the floor ones, recessed in the spine face; registered to CAD 0.24 mm", "cad_origin_in_spine_m": [0.025, 0.0804, 0.0], "seat_gap_m": RXGAP, "top_m": 0.0153, "lugs": 4, "slots_deg": [45, 135, 225, 315], "magnets_per_connector": 8, "magnet": "8x8mm x1mm, N on pad segments, S on gap segments"},
        "meshes_dir": "assets/tetrobot-module/meshes", "source_cad": "Fusion doc try8"}
json.dump(spec, open(OUT + r'\module_spec.json', 'w', encoding='utf-8'), indent=1)
print('doc MB %.1f' % (os.path.getsize(old) / 1e6), 'straight length %.3f m' % spec['straight_length_m'], 'mass %.3f' % spec['mass_kg_total'])
