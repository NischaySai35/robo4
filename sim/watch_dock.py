"""Watch the REAL-ROBOT controller (deploy/laptop_controller.py, unchanged) dock random floor connectors in MuJoCo.
Every episode = a new random robot (sag, backlash, servo strength, encoder noise, floor tilt) + a new connector spot.
Usage:  python watch_dock.py [SLOW] [MAX_DIST_CM]     e.g.  python watch_dock.py 2 30   (2x slow motion, connectors up to 30 cm)
Close the 3D window or press Ctrl+C to stop.
"""
from paths import tpath
import os, sys, time, math, json
import numpy as np, mujoco, mujoco.viewer
try: mujoco.set_mju_user_warning(lambda msg: None)        # hide the harmless 'EPA horizon' spam
except Exception: pass
sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
import io, contextlib
with contextlib.redirect_stdout(io.StringIO()):
    import laptop_controller as L
from tetro_env2 import TetroDockEnv, DT_CTRL
SLOW = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
MAXD = float(sys.argv[2]) / 100 if len(sys.argv) > 2 else 0.30
env = TetroDockEnv(seed=int(time.time()) % 100000, floor_frac=1.0, max_dist=MAXD, ep_len=450, xml=tpath('sim//scene_v2.xml')); m, d = env.m, env.d
rng = np.random.default_rng()
PH = {0: 'LINING UP above the connector (45 deg pad/gap offset)', 1: 'GOING STRAIGHT IN', 2: 'SEATED -> lock fins turning 45 deg'}
wins = tries = 0
def overlay(v, lines):
    try: v.set_texts([(mujoco.mjtFontScale.mjFONTSCALE_150, mujoco.mjtGridPos.mjGRID_TOPLEFT, '\n'.join(a for a, b in lines), '\n'.join(b for a, b in lines))])
    except Exception: pass
print('TETROBOT live docking viewer | real-robot controller | slow-motion x%.1f | floor connectors up to %.0f cm' % (SLOW, MAXD * 100), flush=True)
with mujoco.viewer.launch_passive(m, d) as v:
    v.cam.distance = 1.2; v.cam.elevation = -25; v.cam.azimuth = 135
    while v.is_running():
        env.reset(); env.htol = (-1, -1)
        g = env.m.opt.gravity.copy(); tilt = math.degrees(math.acos(-g[2] / 9.81)); ph = math.degrees(math.atan2(g[1], g[0]))
        g_meas = L.gravity_from_tilt(max(0, tilt + rng.normal(0, 0.1)), ph + rng.normal(0, 10))
        with contextlib.redirect_stdout(io.StringIO()):
            C = L.DockController(env.hover + env.bias_p, env.seat + env.bias_p, env.Rrx_obs[:, 2], env.Rrx_obs, env.standoff, env.cmd.copy(), gravity=g_meas)
        dist = np.linalg.norm(env.seat[:2]) * 100; tries += 1; info = {}; t0 = time.time()
        v.cam.lookat[:] = 0.5 * (env.seat + np.array([0, 0, 0.25]))
        print('\nrobot #%d: connector at %.1f cm, floor tilt %.2f deg' % (tries, dist, tilt), flush=True)
        for t in range(env.ep_len):
            if not v.is_running(): break
            ts = time.time()
            qm = env.qhist[max(0, len(env.qhist) - 1 - env.obs_lag)][0]
            with contextlib.redirect_stdout(io.StringIO()):
                cmd, _ = C.step(qm)
            env.cmd = cmd
            if C.phase >= 1 and env.phase == 0: env.phase = 1; env.prev_E = env._err()[0]; print('  lined up -> going straight in (t=%.1f s)' % (t * DT_CTRL), flush=True)
            o, r, te, tr, info = env.step(np.zeros(7))
            v.user_scn.ngeom = 1
            mujoco.mjv_initGeom(v.user_scn.geoms[0], mujoco.mjtGeom.mjGEOM_SPHERE, np.array([0.004, 0, 0]), env.hover, np.eye(3).flatten(), np.array([1, 0.85, 0.2, 0.8], dtype=np.float32))
            overlay(v, [('Robot', '#%d   (docked %d / %d so far)' % (tries, wins, tries - 1)), ('Connector', '%.1f cm away, floor tilt %.2f deg' % (dist, tilt)),
                        ('Phase', PH[min(C.phase, 2)] if not env.phase >= 2 else PH[2]), ('Gap to seat', '%.1f mm' % info.get('axial_mm', 0)),
                        ('Lock fins', '%.0f deg' % info.get('lock_deg', 0)), ('Time', '%.1f s' % (t * DT_CTRL))])
            v.sync()
            time.sleep(max(0, DT_CTRL * SLOW - (time.time() - ts)))
            if te or tr: break
        ok = bool(info.get('success')); wins += ok
        res = 'DOCKED + LOCKED (held 15 N pull)' if ok else ('CRASH' if info.get('crash') else 'FAILED (gap %.1f mm)' % info.get('axial_mm', 0))
        print('  RESULT: %s  |  score so far %d / %d = %.0f%%' % (res, wins, tries, 100 * wins / tries), flush=True)
        overlay(v, [('RESULT', res), ('Score', '%d / %d' % (wins, tries))])
        t1 = time.time()
        while v.is_running() and time.time() - t1 < 2.5: v.sync(); time.sleep(0.05)
print('viewer closed | final score %d / %d' % (wins, tries))
