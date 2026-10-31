"""Headless live demo for the WEBSITE: random robots walk over 4 floor connectors in real time; writes C:\TETROBOT\live.json
every frame (same format the dashboard's 'Live 3D' panel already reads). Stop: close it from the dashboard/Task Manager or kill python.
Usage: python walk_live.py [SLOW]"""
from paths import tpath
import sys, os, time, math, json, numpy as np, mujoco
mujoco.set_mju_user_warning(lambda m: None)
sys.path.insert(0, tpath('sim'))
from walk import Walker
from walk_env import WalkEnv
SLOW = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
OUT = tpath('live.json')
env = WalkEnv(seed=int(time.time()) % 100000, randomize=True, xml=tpath('sim/walk_scene.xml')); m, d = env.m, env.d
BODIES = ['EndA_LockModule', 'L1_LockRotor_A', 'T1_Housing_B1Fork', 'Spine1_B1B2', 'T2_Housing_B2Fork_GROUND', 'T2_Ring_B3Fork', 'Spine2_B3B4', 'T3_Housing_B4Fork', 'EndB_LockModule', 'L2_LockRotor_B']
BID = {n: m.body(n).id for n in BODIES}
JN = ['T1_twist', 'B1_bend', 'B2_bend', 'T2_twist', 'B3_bend', 'B4_bend', 'T3_twist']
RXG = [m.geom('r%d_rx_visual' % i).id for i in range(len(env.rx))]
state = {'label': 'starting', 'walk': 0, 'ok': 0, 'target': 1}
def q_of(R):
    q = np.zeros(4); mujoco.mju_mat2Quat(q, np.ascontiguousarray(R).reshape(9)); return [round(float(x), 6) for x in q]
def dump():
    W = state.get('W'); mv = W.moving if W else 'B'
    base_rx = W.base_rx if W else 0; tgt = state['target']
    o = {'t': time.strftime('%H:%M:%S'), 'sim_time': round(d.time, 1),
         'pose': 'WALK #%d (%d full walks OK): End %s locked in connector %d -> End %s to connector %d | %s' % (state['walk'], state['ok'], W.base if W else 'A', base_rx, mv, tgt, state['label']),
         'bodies': {n: {'p': [round(float(x), 4) for x in d.xpos[b]], 'q': [round(float(x), 5) for x in d.xquat[b]]} for n, b in BID.items()},
         'tip': [round(float(x), 4) for x in d.site_xpos[env.end[mv]['tip']]],
         'rxg': [{'p': [round(float(x), 5) for x in d.geom_xpos[RXG[base_rx]]], 'q': q_of(d.geom_xmat[RXG[base_rx]].reshape(3, 3))},
                 {'p': [round(float(x), 5) for x in d.geom_xpos[RXG[tgt]]], 'q': q_of(d.geom_xmat[RXG[tgt]].reshape(3, 3))}],
         'joints': {JN[i]: round(math.degrees(d.qpos[env.qa[i]]), 1) for i in range(7)},
         'torque': {JN[i]: round(float(d.actuator_force[env.act_id[i]]), 3) for i in range(7)}, 'tau_max': 2.7, 'phase': 0, 'info': {}}
    tmp = OUT + '.tmp'
    with open(tmp, 'w') as fh: json.dump(o, fh)
    for _ in range(5):
        try: os.replace(tmp, OUT); break
        except PermissionError: time.sleep(0.02)
raw = env.step
def step(*a, **k):
    ts = time.time(); r = raw(*a, **k); dump(); time.sleep(max(0, 0.06 * SLOW - (time.time() - ts))); return r
env.step = step
def log(*a):
    s = ' '.join(str(x) for x in a).strip(); print(s, flush=True); state['label'] = s[:90]
while True:
    state['walk'] += 1; env.reset(base='A', base_rx=0, yaw_deg=45)
    W = Walker(env, 'A', 0, 0, env.m.opt.gravity.copy(), log=log); W.judge_fn = W.sim_camera; state['W'] = W
    ok = True
    for j in range(1, len(env.rx)):
        state['target'] = j
        if not W.step_to(j): ok = False; break
    state['ok'] += ok; log('walk #%d %s' % (state['walk'], 'ALL STEPS OK' if ok else 'FAILED - next robot'))
    for _ in range(40): dump(); time.sleep(0.05)
