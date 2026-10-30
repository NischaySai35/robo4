"""Watch TETROBOT walk over 4 floor connectors (inchworm flips) in MuJoCo. Each walk = a new random robot.
Usage: python watch_walk.py [SLOW]    e.g. python watch_walk.py 1"""
import os, sys, time, math, numpy as np, mujoco, mujoco.viewer
mujoco.set_mju_user_warning(lambda m: None)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from walk import Walker
from walk_env import WalkEnv
SLOW = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
lines = []
def log(*a):
    s = ' '.join(str(x) for x in a); print(s, flush=True); lines.append(s.strip()); del lines[:-5]
walks = wins = 0
env = WalkEnv(seed=int(time.time()) % 100000, randomize=True, xml=r'D:\\robo4\\brain\\walk_scene.xml')
with mujoco.viewer.launch_passive(env.m, env.d) as v:
    v.cam.distance = 1.6; v.cam.elevation = -20; v.cam.azimuth = 100; v.cam.lookat[:] = [0.37, 0, 0.15]
    raw_step = env.step
    def step(*a, **k):
        ts = time.time(); r = raw_step(*a, **k)
        try: v.set_texts([(mujoco.mjtFontScale.mjFONTSCALE_150, mujoco.mjtGridPos.mjGRID_TOPLEFT, 'Walk\nBase\n' + '\n'.join('' for _ in lines), '#%d  (%d/%d fully OK)\nEnd %s locked in rx%d\n' % (walks, wins, walks - 1, W.base, W.base_rx) + '\n'.join(lines))])
        except Exception: pass
        v.sync()
        if not v.is_running(): raise SystemExit
        time.sleep(max(0, 0.06 * SLOW - (time.time() - ts))); return r
    env.step = step
    while v.is_running():
        walks += 1; env.reset(base='A', base_rx=0, yaw_deg=45)
        W = Walker(env, 'A', 0, 0, env.m.opt.gravity.copy(), log=log); W.judge_fn = W.sim_camera   # simulated camera judge
        log('walk #%d: new random robot, floor tilt %.2f deg' % (walks, math.degrees(math.acos(-env.m.opt.gravity[2] / 9.81))))
        ok = True
        for j in [1, 2, 3]:
            if not W.step_to(j): ok = False; break
        wins += ok; log('walk #%d: %s   (score %d/%d)' % (walks, 'ALL 3 STEPS OK' if ok else 'FAILED', wins, walks))
        t1 = time.time()
        while v.is_running() and time.time() - t1 < 3: v.sync(); time.sleep(0.05)
