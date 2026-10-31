"""Make the arm-link collision boxes full CAD size (they were 92% of the CAD bounding box) and rebuild every sim model from it.
Backups of the old files: C:\TETROBOT\sim\backup_92"""
from paths import tpath
import re, sys, subprocess, numpy as np, mujoco
sys.path.insert(0, tpath('sim'))
P = tpath('sim/tetrobot_train.xml')
s = open(tpath('sim/backup_92/tetrobot_train.xml'), encoding='utf-8').read()
n = [0]
def rep(mt):
    g = mt.group(0)
    if 'contype="1" conaffinity="2"' not in g: return g
    sz = [float(x) / 0.92 for x in re.search(r'size="([^"]+)"', g).group(1).split()]; n[0] += 1
    return re.sub(r'size="[^"]+"', 'size="%.4f %.4f %.4f"' % tuple(sz), g)
s = re.sub(r'<geom type="box"[^>]*/>', rep, s)
open(P, 'w', encoding='utf-8').write(s); print('arm-link boxes enlarged to 100%% CAD size: %d' % n[0])
py = sys.executable
for f in ['build_v2.py', 'build_walk.py']:
    r = subprocess.run([py, tpath('sim//') + f], capture_output=True, text=True, cwd=tpath('sim')); print(f, 'exit', r.returncode); print(r.stdout[-900:]); print(r.stderr[-600:] if r.returncode else '')
# long L-path: same connector positions as before
import build_walk as BW
old = mujoco.MjModel.from_xml_path(tpath('sim/backup_92/walk_long.xml'))
RX = [tuple(float(x) for x in old.body('rx%d' % i).pos) for i in range(sum(1 for b in range(old.nbody) if old.body(b).name.startswith('rx')))]
print('long path connectors:', [tuple(round(v, 3) for v in r) for r in RX])
BW.build(tpath('sim/train_v2.xml'), tpath('sim/walk_long.xml'), RX, False)
BW.build(tpath('sim/scene_v2.xml'), tpath('sim/walk_long_scene.xml'), RX, True)
for fn in ['walk_train.xml', 'walk_long.xml', 'walk_scene.xml', 'walk_long_scene.xml']:
    m = mujoco.MjModel.from_xml_path(tpath('sim//') + fn)
    b = m.body('Spine1_B1B2').id; bx = [m.geom_size[g] * 2000 for g in range(m.ngeom) if m.geom_bodyid[g] == b and m.geom_type[g] == 6 and m.geom_contype[g] == 1]
    print('%-22s mass %.3f kg, Spine1 collision box %s mm' % (fn, m.body_subtreemass[m.body('module_frame').id], [np.round(x).astype(int).tolist() for x in bx]))
