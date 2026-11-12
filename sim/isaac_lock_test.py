"""isaac_lock_test.py — the End B lock on Nischay's REAL printed shapes: Isaac Sim 6.2 + Newton physics, exact-mesh (SDF) contact.

No boxes, no shrink-wrap: each part is its STL (brain/meshes, the try8 export he printed), collided through a signed-distance
field built from that mesh. Bodies:
  - M2's Spine1 (its two side sockets are part of the print), fixed where the ideal MuJoCo docking put it
  - M1's End B on a slide along its own axis (the script presses it in, or pulls it out, with a set force)
  - End B's lock rotor on its hinge, driven like the real lock servo (stiffness 400, max 2.66 N.m, +-45 deg)
Start = the seated pose of a perfect docking (mj_lock_pose: ideal MuJoCo, M1.B -> M2.S1A), rotor at 0.

Phases (one run):  press PRESS_N in 0.5 s -> rotor to 45 deg 1.5 s -> pull 30 N 1 s -> rotor back to 0 0.5 s -> pull 30 N 1 s
Reports: rotor angle reached (lock turns?), slide while pulled locked (holds?), slide while pulled open (comes out?).
   py -3.12 sim/isaac_lock_test.py POSE.json [--gui]        env TILT_DEG (End B tilted about its x, the PLA lock play), VOXEL_MM,
   SOLVER mujoco (default; Newton's MuJoCo solver, 9 Nov: seated -0.02 mm, 45 deg, holds 0.25 mm, comes out) | xpbd
"""
# REUSE-CHECKED: the Isaac/Newton setup lives in isaac_newton.py (shared with isaac_module.py); this file = the lock rig + phases only.
import os, sys, json, math, time
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
GUI = '--gui' in sys.argv
POSE = json.load(open([a for a in sys.argv[1:] if not a.startswith('--')][0]))
TILT = float(os.environ.get('TILT_DEG', '0')); VOXEL = float(os.environ.get('VOXEL_MM', '0.5')) / 1000
from tetro_env2 import MAG_PER_CONNECTOR_N                 # the magnet pull per connector: ONE setting (3.5 N, 10 Nov)
PRESS_N = float(os.environ.get('PRESS_N', str(MAG_PER_CONNECTOR_N)))
PULL_N = float(os.environ.get('PULL_N', '30'))
HZ = float(os.environ.get('HZ', '1000'))
SOLVER = os.environ.get('SOLVER', 'mujoco')
from isaac_newton import World, q_mul, q_rot

W = World(gui=GUI, hz=HZ, solver=SOLVER, ncon=int(os.environ.get('NCON', '4000')), gravity=0.0, voxel=VOXEL,   # the mechanism alone
          iters=int(os.environ.get('ITERS', '10')), contact_ke=float(os.environ.get('CONTACT_KE', '1e7')), contact_kd=float(os.environ.get('CONTACT_KD', '1e3')),
          mj_cpu=os.environ.get('MJ_CPU') == '1', subdiv=float(os.environ.get('SUBDIV_MM', '0.6')) / 1000,
          subdiv_parts=os.environ.get('SUBDIV_PARTS', 'L2_LockRotor_B,EndB_LockModule').split(','))
from pxr import UsdGeom, UsdPhysics, Gf, Sdf

# the socket side: Spine1 is fixed (a static collider)
sp = POSE['M2_Spine1_B1B2']; W.part('/World/Spine1', 'Spine1_B1B2', sp['pos'], sp['quat'], (0.2, 0.7, 0.25))
# the plug side: End B (slide) + rotor (hinge); End B tilted by TILT about its own x through the pad-face centre
eb = POSE['M1_EndB_LockModule']; qe = np.array(eb['quat']); pe = np.array(eb['pos'])
qt = np.array([math.cos(math.radians(TILT) / 2), math.sin(math.radians(TILT) / 2), 0, 0]); face = np.array([0, 0.067, 0])   # End B pad tips at body y +67 mm
qe2 = q_mul(qe, qt); pe2 = pe + q_rot(qe, face) - q_rot(qe2, face)
UsdGeom.Xform.Define(W.st, '/World/Plug'); UsdPhysics.ArticulationRootAPI.Apply(W.st.GetPrimAtPath('/World/Plug'))
W.part('/World/Plug/EndB', 'EndB_LockModule', pe2, qe2, (0.85, 0.2, 0.2))
roff = np.array(POSE['rotor_in_endB']['pos']); pr = pe2 + q_rot(qe2, roff)
W.part('/World/Plug/Rotor', 'L2_LockRotor_B', pr, qe2, (1.0, 0.55, 0.05))
W.mass('/World/Plug/EndB', 0.1579)
# the servo's GEARBOX inertia: the MuJoCo solver takes it joint-space (newton:armature, below); XPBD ignores that (maximal coordinates),
# so there it sits on the rotor body (the bare 9.5 g rotor under a 400 N.m/rad servo at 1 kHz banged between its stops, 9 Nov)
ARM = float(os.environ.get('LOCK_ARMATURE', '0.012'))
W.mass('/World/Plug/Rotor', 0.0095, inertia=None if SOLVER == 'mujoco' else [ARM] * 3)
W.no_collide('/World/Plug/Rotor', '/World/Plug/EndB')                              # the rotor sits inside End B

# slide: an anchor body fixed to the world at End B's start pose, the slide from it to End B along End B's own y (its connector axis)
an = UsdGeom.Xform.Define(W.st, '/World/Plug/Anchor'); an.AddTranslateOp(UsdGeom.XformOp.PrecisionDouble).Set(Gf.Vec3d(*map(float, pe2)))
an.AddOrientOp(UsdGeom.XformOp.PrecisionDouble).Set(Gf.Quatd(*map(float, qe2)))
W.mass('/World/Plug/Anchor', 1.0)
W.fixed('/World/Plug/root', '/World/Plug/Anchor', pe2, qe2)
W.prismatic('/World/Plug/slide', '/World/Plug/Anchor', '/World/Plug/EndB', [0, 0, 0], [1, 0, 0, 0], 'Y', -0.06, 0.005)   # 60 mm out .. 5 mm past the seat
# hinge: End B -> rotor about y, the lock servo (gearbox 0.012, damping 0.05 as in MuJoCo)
W.revolute('/World/Plug/lock', '/World/Plug/EndB', '/World/Plug/Rotor', roff, [1, 0, 0, 0], 'Y', -46.0, 46.0, armature=ARM, damping=0.05)

SEAT = pe2 + q_rot(qe2, [0, 0.067, 0])                                           # End B's pad face = the meeting point
_side = q_rot(qe2, [1, 0, 0]); _up = np.cross(q_rot(qe2, [0, 1, 0]), _side)
_eye = SEAT + 0.30 * _side - 0.12 * q_rot(qe2, [0, 1, 0]); _eye[2] = SEAT[2] + 0.14       # beside the joint, a little above (~35 cm)
W.view(_eye, SEAT)
CAM_D = float(os.environ.get('CAM_D', '0.4'))
W.snapshots([(SEAT + CAM_D * _side + 0.3 * CAM_D * _up, SEAT, _up), (SEAT + CAM_D * _up - 0.4 * CAM_D * q_rot(qe2, [0, 1, 0]), SEAT, _up)],
            focal=float(os.environ.get('FOCAL', '50')))
TAG = os.environ.get('TAG', f'tilt{TILT:g}')
SHOTS = os.environ.get('SHOTS', os.path.join(HERE, '..', 'data', 'logs', 'isaac_lock')); os.makedirs(SHOTS, exist_ok=True)
t0 = time.time(); W.play()
rbs = W.rigid(['/World/Plug/EndB', '/World/Plug/Rotor'])
AX = q_rot(qe2, [0, 1, 0])                                                         # End B's connector axis in the world


def measure():
    """[slide (m along the axis, + = in), rotor angle (rad about End B's y)] from the SIMULATED body poses"""
    P, Q = rbs.get_world_poses(); P = P.numpy(); Q = Q.numpy()
    rel = q_mul([Q[0][0], -Q[0][1], -Q[0][2], -Q[0][3]], Q[1])                      # rotor in End B's frame
    ang = 2 * math.atan2(rel[2], rel[0])                                           # about y
    return np.array([float((P[0] - pe2) @ AX), (ang + math.pi) % (2 * math.pi) - math.pi])


print(f'started in {time.time() - t0:.1f} s', flush=True)
for _ in range(30): W.app.update()                                                # renderer warm-up
snap = lambda label: W.snap(os.path.join(SHOTS, f'{TAG}_{label.replace(" ", "_")}.png'), f'{TAG} {label}')
snap('start')
TSIGN = float(os.environ.get('TSIGN', '1'))       # PROBE (9 Nov): +torque turns the rotor +
LOCK_SIGN = 1.0                                   # End B turns +45 (phys_world LOCK_SIGN)
phases = [('press', 0.5, PRESS_N, 0.003, 0.0), ('turn', 1.5, PRESS_N, 0.003, 45.0), ('pull locked', 1.0, PULL_N, -0.05, 45.0),
          ('open', 0.5, PRESS_N, 0.003, 0.0), ('pull open', 1.0, PULL_N, -0.05, 0.0)]
res = {}; _n = 0; REC_HZ = float(os.environ.get('REC_HZ', '125'))                 # 125/s at 0.5x replay = 60 fps on screen
if os.environ.get('SLIDE_PROBE'):                                                 # debug: does the slide joint hold End B to its axis? press only
    print('NEWTON JOINTS', W.model_joints(), flush=True)
    for k_ in range(8):
        for _ in range(25):
            rbs.apply_forces_and_torques_at_pos(forces=np.array([PRESS_N * AX, [0, 0, 0]], np.float32), torques=np.zeros((2, 3), np.float32)); W.step(1)
        P_ = rbs.get_world_poses()[0].numpy(); off_ = P_[0] - pe2
        print(f'SLIDE_PROBE step {25 * (k_ + 1)}: slide {float(off_ @ AX) * 1000:8.2f} mm, off-axis {float(np.linalg.norm(off_ - (off_ @ AX) * AX)) * 1000:8.2f} mm', flush=True)
    W.close(); sys.exit(0)
for name, dur, F, slide_tgt, lock_deg in phases:
    # the plug: a pure force along its axis (magnets in / a pull out); the lock: the ST3215 servo model (400 N.m/rad, 8.8 damping,
    # capped at 2.66 N.m) as a torque on the rotor and the opposite torque on End B. Nothing here moves a part except a force.
    print(f'PHASE {name}: {"push in" if slide_tgt > 0 else "PULL OUT"} {F:.1f} N, lock {lock_deg:.0f} deg', flush=True)
    Fax = F if slide_tgt > 0 else -F; tgt_ = math.radians(LOCK_SIGN * lock_deg); q0 = measure(); peak = 0.0
    for _ in range(int(dur * HZ)):
        _, Q_ = rbs.get_world_poses(); _, W_ = rbs.get_velocities(); Q_ = Q_.numpy(); W_ = W_.numpy()
        axr = q_rot(Q_[0], [0, 1, 0]); ang_ = measure()[1]
        tau = float(np.clip(400.0 * (tgt_ - ang_) - 8.8 * float((W_[1] - W_[0]) @ axr), -2.665, 2.665)); peak = max(peak, abs(tau))
        rbs.apply_forces_and_torques_at_pos(forces=np.array([Fax * AX, [0, 0, 0]], np.float32), torques=TSIGN * np.array([-tau * axr, tau * axr], np.float32))
        W.step(1); _n += 1
        if _n % max(1, int(HZ / REC_HZ)) == 0: W.record(rbs, name)
    q = measure()
    res[name] = dict(slide_mm=float(q[0] * 1000), moved_mm=float((q[0] - q0[0]) * 1000), rotor_deg=float(math.degrees(q[1])))
    if os.environ.get('CONTACT_DEBUG'):
        P_, Q_ = rbs.get_world_poses()
        print(f'   contacts (touching): {W.contacts({"/World/Plug/EndB": (P_.numpy()[0], Q_.numpy()[0]), "/World/Plug/Rotor": (P_.numpy()[1], Q_.numpy()[1])})}', flush=True)
    snap(name)
    print(f't {W.time():5.2f} s {name:12s}: slide {q[0] * 1000:7.2f} mm (moved {(q[0] - q0[0]) * 1000:+7.2f}), rotor {math.degrees(q[1]):6.1f} deg, peak lock torque {peak:.2f} N.m', flush=True)

turned = res['turn']['rotor_deg'] > 40; held = abs(res['pull locked']['moved_mm']) < 1.0; out_ = res['pull open']['moved_mm'] < -5.0
print(f'RESULT {SOLVER} tilt {TILT} deg, voxel {VOXEL * 1000:.2f} mm: rotor {"TURNED" if turned else "BLOCKED"} ({res["turn"]["rotor_deg"]:.1f} deg), '
      f'locked pull {"HOLDS" if held else "SLIPS"} ({res["pull locked"]["moved_mm"]:+.2f} mm), open pull {"COMES OUT" if out_ else "STUCK"} ({res["pull open"]["moved_mm"]:+.1f} mm) | wall {time.time() - t0:.0f} s', flush=True)
W.replay(['/World/Plug/EndB', '/World/Plug/Rotor'], REC_HZ, float(os.environ.get('REPLAY_SPEED', '0.5')), shot=os.path.join(SHOTS, f'{TAG}_window_replay_start.png'))
W.close()
