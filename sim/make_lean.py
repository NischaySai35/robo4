from paths import tpath
import re, os, struct, sys, time
import numpy as np
src = open(tpath('sim/tetrobot_scene.xml'), encoding='utf-8').read()
MD = __import__('paths').MESHES
def bbox(name):
    with open(os.path.join(MD, name + '.stl'), 'rb') as f:
        f.read(80); n = struct.unpack('<I', f.read(4))[0]; a = np.frombuffer(f.read(50 * n), dtype=np.uint8).reshape(n, 50)
    v = a[:, 12:48].copy().view('<f4').reshape(-1, 3) / 1000.0
    return v.min(0), v.max(0)
def rep(mt):
    g = mt.group(0); name = re.search(r'mesh="([^"]+)"', g).group(1); pos = np.array([float(x) for x in re.search(r'pos="([^"]+)"', g).group(1).split()])
    lo, hi = bbox(name); c = (lo + hi) / 2 + pos; h = (hi - lo) / 2 * 0.92
    rg = re.search(r'rgba="([^"]+)"', g).group(1)
    return '<geom type="box" size="%.4f %.4f %.4f" pos="%.5f %.5f %.5f" rgba="%s" contype="1" conaffinity="2"/>' % (h[0], h[1], h[2], c[0], c[1], c[2], rg)
out = re.sub(r'<geom type="mesh"[^>]*/>', rep, src)
out = re.sub(r'\s*<mesh name=[^>]*/>', '', out)
open(tpath('sim/tetrobot_train.xml'), 'w', encoding='utf-8').write(out)
E = tpath('sim/tetro_env.py'); s = open(E, encoding='utf-8').read()
s = s.replace("XML = r'C:\\TETROBOT\\sim\\tetrobot_scene.xml'", "XML = r'C:\\TETROBOT\\sim\\tetrobot_train.xml'")
s = s.replace("def __init__(self, seed=0, randomize=True, floor_frac=0.6, max_dist=0.42, ep_len=240):\n        self.m = mujoco.MjModel.from_xml_path(XML); self.d = mujoco.MjData(self.m)\n        self.mr = mujoco.MjModel.from_xml_path(RIGID); self.dr = mujoco.MjData(self.mr)",
              "def __init__(self, seed=0, randomize=True, floor_frac=0.6, max_dist=0.42, ep_len=240, xml=None):\n        self.m = mujoco.MjModel.from_xml_path(xml or XML); self.d = mujoco.MjData(self.m)\n        self.mr = self.m; self.dr = mujoco.MjData(self.m)   # same model; flex/backlash at 0 = rigid kinematics from encoders")
assert 'xml or XML' in s
open(E, 'w', encoding='utf-8').write(s)
W = tpath('sim/watch_policy.py'); w = open(W, encoding='utf-8').read().replace("TetroDockEnv(seed=777, max_dist=0.42)", "TetroDockEnv(seed=777, max_dist=0.42, xml=r'C:\\TETROBOT\\sim\\tetrobot_scene.xml')"); open(W, 'w', encoding='utf-8').write(w)
T = tpath('sim/train_dock.py'); t = open(T, encoding='utf-8').read().replace("N_ENVS, TOTAL = 10,", "N_ENVS, TOTAL = 12,").replace("batch_size=4096", "batch_size=3072"); open(T, 'w', encoding='utf-8').write(t)
sys.path.insert(0, tpath('sim'))
from tetro_env import TetroDockEnv
import psutil
e = TetroDockEnv(seed=1); e.reset(); t0 = time.time()
for i in range(600):
    o, r, te, tr, inf = e.step(e.action_space.sample())
    if te or tr: e.reset()
print('lean env steps/s', round(600 / (time.time() - t0)), 'proc MB', round(psutil.Process(os.getpid()).memory_info().rss / 1e6))
