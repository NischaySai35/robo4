"""Watch a Studio manual session live in a MuJoCo window: the SAME code the Studio's MSRR Manual tab runs (manual.start, the
ideal robot, real physics on its own real-time thread), then one skill (default: ring = bend the chain, dock M2.B into M1.A, lock).
No real robot: Sync stays off.

    py -3.12 watch_skill.py                       the 2-module chain from the Studio (data/scenes/studio_chain2.json), ring
    py -3.12 watch_skill.py SCENE.json straighten  another scene / skill

Close the window to stop. The log of the skill prints in this terminal.
REUSE-CHECKED: live_viewer|watch_dock|watch_walk|manual.start -> those viewers drive OLD controllers (laptop_controller,
tetro_env2); this one only opens a window on manual.py's own session, nothing of the algorithm is copied.
"""
from paths import tpath
import json, os, sys, time
import mujoco, mujoco.viewer
import manual

scene_path = sys.argv[1] if len(sys.argv) > 1 else tpath('scenes/studio_chain2.json')
skill = sys.argv[2] if len(sys.argv) > 2 else 'ring'
scene = json.load(open(scene_path))
r = manual.start(scene, seed=1, randomize=False, disturb=False, judge='truth', ideal=True)   # what the Manual tab's Start sends
sid = r['id']; S = manual.SESS[sid]
print(f'session {sid}: {len(scene["modules"])} module(s), locks {[f"{l["a"]["module"]}.{l["a"]["port"]}-{l["b"]["module"]}.{l["b"]["port"]}" for l in scene["locks"]]}', flush=True)
seen = None; asked = False; t0 = time.time()
with mujoco.viewer.launch_passive(S.w.m, S.w.d) as v:
    v.cam.distance = 1.6; v.cam.elevation = -35; v.cam.azimuth = 135
    while v.is_running():
        S.seen = time.time()                                    # like the Studio polling: the session stays alive
        if not asked and time.time() - t0 > 3:                  # 3 s to look at the start, then the skill
            print(manual.command(sid, {'kind': 'skill', 'name': skill}), flush=True); asked = True
        lines = list(S.lines)                                   # the session keeps its last 200 lines
        new = lines[lines.index(seen) + 1:] if seen in lines else lines
        for l in new: print(' ', l, flush=True)
        if lines: seen = lines[-1]
        v.sync(); time.sleep(1 / 30)
manual.command(sid, {'kind': 'close'})
