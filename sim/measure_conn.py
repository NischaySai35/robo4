from paths import tpath
import numpy as np, struct, os
def stl(path):
    with open(path, 'rb') as f:
        f.read(80); n = struct.unpack('<I', f.read(4))[0]; a = np.frombuffer(f.read(50 * n), dtype=np.uint8).reshape(n, 50)
    return a[:, 12:48].copy().view('<f4').reshape(-1, 3, 3)
def faces_at(T, axis, level, tol=0.03):
    c = T[:, :, axis]; k = np.all(np.abs(c - level) < tol, axis=1); return T[k]
def sectors(P, cx, cz, label):
    if len(P) == 0: print(label, 'none'); return
    v = P.reshape(-1, 3); x = v[:, 0] - cx; z = v[:, 2] - cz; r = np.hypot(x, z); a = np.degrees(np.arctan2(z, x)) % 360
    groups = []
    for c0 in range(0, 360, 45):
        sel = ((a - c0 + 22.5) % 360) < 45
        if sel.sum() == 0: continue
        aa = ((a[sel] - c0 + 180) % 360) - 180
        groups.append('%3d deg: span %+.1f..%+.1f deg, r %.1f..%.1f mm' % (c0, aa.min(), aa.max(), r[sel].min(), r[sel].max()))
    print(label); [print('    ' + g) for g in groups]
MD = __import__('paths').MESHES
R = stl(tpath('sim/floor_receiver.stl')); cx, cz = -276.44, -5.94
for lv, nm in [(-15.95, 'RECEIVER pad tops'), (-6.95, 'RECEIVER gap floors'), (-10.65, 'RECEIVER hook undersides (rotor arms slide under these)'), (-5.65, 'RECEIVER lower undersides')]:
    sectors(faces_at(R, 1, lv), cx, cz, '%s (y=%.2f)' % (nm, lv))
B = stl(os.path.join(MD, 'EndB_LockModule.stl')); cx, cz = -69.81, -261.46
for lv, nm in [(487.58, 'END B pad tips'), (478.58, 'END B gap floors')]:
    sectors(faces_at(B, 1, lv), cx, cz, '%s (y=%.2f)' % (nm, lv))
RB = stl(os.path.join(MD, 'L2_LockRotor_B.stl'))
sectors(faces_at(RB, 1, 484.08), cx, cz, 'ROTOR B arm faces (y=484.08)')
sectors(faces_at(RB, 1, 481.28), cx, cz, 'ROTOR B arm step (y=481.28)')
