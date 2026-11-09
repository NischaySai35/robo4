"""isaac_lock_test.py — the End B lock on Nischay's REAL printed shapes: Isaac Sim 6.2 + Newton physics, exact-mesh (SDF) contact.

No boxes, no shrink-wrap: each part is its STL (brain/meshes, the try8 export he printed), collided through a signed-distance
field built from that mesh. Bodies:
  - M2's Spine1 (its two side sockets are part of the print), fixed where the ideal MuJoCo docking put it
  - M1's End B on a slide along its own axis (the drive presses it in, or pulls it out, with a set force)
  - End B's lock rotor on its hinge, driven like the real lock servo (stiffness 400, max 2.66 N.m, +-45 deg)
Start = the seated pose of a perfect docking (mj_lock_pose: ideal MuJoCo, M1.B -> M2.S1A), rotor at 0.

Phases (one run):  press PRESS_N in 0.5 s -> rotor to 45 deg 1.5 s -> pull 30 N 1 s -> rotor back to 0 0.5 s -> pull 30 N 1 s
Reports: rotor angle reached (lock turns?), slide while pulled locked (holds?), slide while pulled open (comes out?).
   py -3.12 sim/isaac_lock_test.py POSE.json [--gui]        env TILT_DEG (End B tilted about its x, the PLA lock play), VOXEL_MM
"""
# REUSE-CHECKED: isaac_walk_view.py only REPLAYS MuJoCo poses in Isaac (no physics); tools/bench/newton_*.py run Newton
# outside Isaac on the MuJoCo boxes. Nothing runs Isaac+Newton physics on the real meshes. Part frames = build_cad_colliders.PARTS.
import os, sys, json, math, time
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
GUI = '--gui' in sys.argv
POSE = json.load(open([a for a in sys.argv[1:] if not a.startswith('--')][0]))
TILT = float(os.environ.get('TILT_DEG', '0')); VOXEL = float(os.environ.get('VOXEL_MM', '0.5')) / 1000
PRESS_N = float(os.environ.get('PRESS_N', '7.5'))          # measured magnet pull per connector (memory: magnet-strength-measured)
PULL_N = float(os.environ.get('PULL_N', '30'))
HZ = float(os.environ.get('HZ', '1000'))
SUBDIV = float(os.environ.get('SUBDIV_MM', '0.6')) / 1000; SUBDIV_PARTS = os.environ.get('SUBDIV_PARTS', 'L2_LockRotor_B,EndB_LockModule').split(',')

from isaacsim import SimulationApp
app = SimulationApp({'headless': not GUI, 'width': 1600, 'height': 900})

import omni.kit.app
_em = omni.kit.app.get_app().get_extension_manager()
for _x in ('isaacsim.physics.newton', 'isaacsim.physics.newton.tensors', 'isaacsim.core.experimental.prims', 'isaacsim.core.simulation_manager'):
    _em.set_extension_enabled_immediate(_x, True)                              # the default headless app does not load Newton
import trimesh, omni.usd, omni.timeline
from pxr import Usd, UsdGeom, UsdPhysics, UsdShade, UsdLux, Gf, Sdf, Vt
from isaacsim.physics.newton import NewtonConfig, MuJoCoSolverConfig, XPBDSolverConfig, configure_newton
from isaacsim.core.simulation_manager import SimulationManager

# SOLVER=xpbd (default) | mujoco: Newton 1.6.1's MuJoCo solver needs mujoco-warp 3.12, the project runs 4.0 since 9 Nov, was 3.17 (kernel signature
# mismatch, 9 Nov) - Newton's own XPBD needs no MuJoCo at all
SOLVER = os.environ.get('SOLVER', 'xpbd')
scfg = MuJoCoSolverConfig(njmax=20000, nconmax=4000, cone='elliptic', use_mujoco_cpu=os.environ.get('MJ_CPU') == '1') if SOLVER == 'mujoco' else XPBDSolverConfig(iterations=int(os.environ.get('ITERS', '10')))
# contact stiffness: Isaac's Newton default 1e4 N/m let 7.5 N of magnet sink End B 0.75 mm into the spine, and the lock servo's
# ~100 N at the fin push the rotor straight through the lip (9 Nov). PLA on PLA is far stiffer -> CONTACT_KE (N/m), CONTACT_KD
KE = float(os.environ.get('CONTACT_KE', '1e7')); KD = float(os.environ.get('CONTACT_KD', '1e3'))
configure_newton(NewtonConfig(physics_frequency=HZ, contact_margin=0.0001, soft_contact_margin=0.0001, contact_ke=KE, contact_kd=KD, solver_cfg=scfg))
SimulationManager.switch_physics_engine('newton')

MESHES = os.path.join(HERE, '..', 'brain', 'meshes')
PARTS = {'Spine1_B1B2': (0.0698, 0.063956, 0.2615), 'EndB_LockModule': (0.0698, -0.420608, 0.2615), 'L2_LockRotor_B': (0.0698, -0.479283, 0.2615)}


def q_mul(a, b):
    w1, x1, y1, z1 = a; w2, x2, y2, z2 = b
    return np.array([w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2, w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
                     w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2, w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2])


def q_rot(q, v):
    return q_mul(q_mul(q, [0, *v]), [q[0], -q[1], -q[2], -q[3]])[1:]


ctx = omni.usd.get_context(); ctx.new_stage(); app.update(); st = ctx.get_stage()
UsdGeom.SetStageUpAxis(st, UsdGeom.Tokens.z); UsdGeom.SetStageMetersPerUnit(st, 1.0); UsdPhysics.SetStageKilogramsPerUnit(st, 1.0)
UsdGeom.Xform.Define(st, '/World')
scene = UsdPhysics.Scene.Define(st, '/World/physicsScene'); scene.CreateGravityDirectionAttr(Gf.Vec3f(0, 0, -1)); scene.CreateGravityMagnitudeAttr(0.0)  # the mechanism alone
UsdLux.DomeLight.Define(st, '/World/Dome').CreateIntensityAttr(400)
_sun = UsdLux.DistantLight.Define(st, '/World/Sun'); _sun.CreateIntensityAttr(1500); UsdGeom.Xformable(_sun).AddRotateXYZOp().Set(Gf.Vec3f(-45, 20, 30))
SCHEMA = {'xpbd': 'NewtonXpbdSceneAPI', 'vbd': 'NewtonVbdSceneAPI', 'mujoco': 'MjcSceneAPI'}
for k_, api_ in SCHEMA.items():                                                  # Isaac's Newton picks its solver from this marker on the scene
    if k_ != SOLVER: scene.GetPrim().RemoveAppliedSchema(api_)
scene.GetPrim().AddAppliedSchema(SCHEMA[SOLVER])

pla = UsdShade.Material.Define(st, '/World/PLA'); pm = UsdPhysics.MaterialAPI.Apply(pla.GetPrim())
pm.CreateStaticFrictionAttr(0.35); pm.CreateDynamicFrictionAttr(0.35); pm.CreateRestitutionAttr(0.0)   # the sim's PLA friction


def part(path, name, pos, quat, color):
    """an Xform at the body pose holding the part's real mesh in its body frame, collided by SDF"""
    xf = UsdGeom.Xform.Define(st, path)
    xf.AddTranslateOp(UsdGeom.XformOp.PrecisionDouble).Set(Gf.Vec3d(*map(float, pos)))
    xf.AddOrientOp(UsdGeom.XformOp.PrecisionDouble).Set(Gf.Quatd(*map(float, quat)))
    tm = trimesh.load(os.path.join(MESHES, name + '.stl'), force='mesh'); tm.apply_scale(0.001); tm.apply_translation(PARTS[name])
    # dense surface points: mesh-vs-SDF contact tests the mesh's VERTICES (9 Nov: the rotor's flat fins had too few, a fin sank
    # through the socket lip with no vertex inside - it turned and pulled out through solid plastic)
    def mesh_(pth, m_):
        g_ = UsdGeom.Mesh.Define(st, pth); g_.CreatePointsAttr(Vt.Vec3fArray.FromNumpy(m_.vertices.astype(np.float32)))
        g_.CreateFaceVertexCountsAttr(Vt.IntArray([3] * len(m_.faces))); g_.CreateFaceVertexIndicesAttr(Vt.IntArray.FromNumpy(m_.faces.astype(np.int32).ravel()))
        g_.CreateDisplayColorAttr([Gf.Vec3f(*color)]); return g_
    me = mesh_(path + '/mesh', tm)                                                # what is drawn: the part as exported
    if SUBDIV > 0 and name in SUBDIV_PARTS:
        # the collision copy, densely subdivided, hidden from the render (a 194k-vertex rotor made the window slow, 9 Nov)
        v_, f_ = trimesh.remesh.subdivide_to_size(tm.vertices, tm.faces, max_edge=SUBDIV); cm = trimesh.Trimesh(v_, f_, process=False)
        me = mesh_(path + '/collision', cm); me.CreatePurposeAttr(UsdGeom.Tokens.guide); tm = cm
    print(f'{name}: {len(tm.vertices)} collision vertices', flush=True)
    p = me.GetPrim(); UsdPhysics.CollisionAPI.Apply(p)
    if os.environ.get('NOCOLL') == '1': UsdPhysics.CollisionAPI(p).CreateCollisionEnabledAttr(False)   # debug: the drives alone
    UsdPhysics.MeshCollisionAPI.Apply(p).CreateApproximationAttr('none')          # the mesh itself, never its hull
    p.AddAppliedSchema('NewtonSDFCollisionAPI')
    p.CreateAttribute('newton:sdfTargetVoxelSize', Sdf.ValueTypeNames.Float, custom=False).Set(VOXEL)
    p.CreateAttribute('newton:sdfNarrowBandInner', Sdf.ValueTypeNames.Float, custom=False).Set(-0.002)
    p.CreateAttribute('newton:sdfNarrowBandOuter', Sdf.ValueTypeNames.Float, custom=False).Set(0.002)
    UsdShade.MaterialBindingAPI.Apply(p).Bind(pla, UsdShade.Tokens.weakerThanDescendants, 'physics')
    return xf, tm


# the socket side: Spine1 is fixed (a static collider)
sp = POSE['M2_Spine1_B1B2']; part('/World/Spine1', 'Spine1_B1B2', sp['pos'], sp['quat'], (0.2, 0.7, 0.25))
# the plug side: End B (slide) + rotor (hinge); End B tilted by TILT about its own x through the pad-face centre
eb = POSE['M1_EndB_LockModule']; qe = np.array(eb['quat']); pe = np.array(eb['pos'])
qt = np.array([math.cos(math.radians(TILT) / 2), math.sin(math.radians(TILT) / 2), 0, 0]); face = np.array([0, 0.067, 0])   # End B pad tips at body y +67 mm
qe2 = q_mul(qe, qt); pe2 = pe + q_rot(qe, face) - q_rot(qe2, face)
UsdGeom.Xform.Define(st, '/World/Plug'); UsdPhysics.ArticulationRootAPI.Apply(st.GetPrimAtPath('/World/Plug'))
xe, _ = part('/World/Plug/EndB', 'EndB_LockModule', pe2, qe2, (0.85, 0.2, 0.2))
roff = np.array(POSE['rotor_in_endB']['pos']); pr = pe2 + q_rot(qe2, roff)
xr, _ = part('/World/Plug/Rotor', 'L2_LockRotor_B', pr, qe2, (1.0, 0.55, 0.05))
for prim, mass in ((xe.GetPrim(), 0.1579), (xr.GetPrim(), 0.0095)):
    UsdPhysics.RigidBodyAPI.Apply(prim); UsdPhysics.MassAPI.Apply(prim).CreateMassAttr(mass)
# the servo's GEARBOX inertia (MuJoCo armature 0.012 kg.m2) on the rotor body itself: XPBD ignores newton:armature (maximal
# coordinates), and the bare 9.5 g rotor (~4e-6 kg.m2) under a 400 N.m/rad servo at 1 kHz banged between its stops (9 Nov probe)
UsdPhysics.MassAPI(xr.GetPrim()).CreateDiagonalInertiaAttr(Gf.Vec3f(*([float(os.environ.get('LOCK_ARMATURE', '0.012'))] * 3)))
fp = UsdPhysics.FilteredPairsAPI.Apply(xr.GetPrim()); fp.CreateFilteredPairsRel().AddTarget('/World/Plug/EndB')   # the rotor sits inside End B

# slide: world -> End B along End B's own y (its connector axis); the drive = a force-limited spring
# a fixed-base chain: an anchor body fixed to the world at End B's start pose, the slide from it to End B
an = UsdGeom.Xform.Define(st, '/World/Plug/Anchor'); an.AddTranslateOp(UsdGeom.XformOp.PrecisionDouble).Set(Gf.Vec3d(*map(float, pe2)))
an.AddOrientOp(UsdGeom.XformOp.PrecisionDouble).Set(Gf.Quatd(*map(float, qe2)))
UsdPhysics.RigidBodyAPI.Apply(an.GetPrim()); UsdPhysics.MassAPI.Apply(an.GetPrim()).CreateMassAttr(1.0)
fj = UsdPhysics.FixedJoint.Define(st, '/World/Plug/root'); fj.CreateBody1Rel().SetTargets(['/World/Plug/Anchor'])
fj.CreateLocalPos0Attr(Gf.Vec3f(*map(float, pe2))); fj.CreateLocalRot0Attr(Gf.Quatf(*map(float, qe2)))
fj.CreateLocalPos1Attr(Gf.Vec3f(0, 0, 0)); fj.CreateLocalRot1Attr(Gf.Quatf(1, 0, 0, 0))
sl = UsdPhysics.PrismaticJoint.Define(st, '/World/Plug/slide'); sl.CreateAxisAttr('Y')
sl.CreateBody0Rel().SetTargets(['/World/Plug/Anchor']); sl.CreateBody1Rel().SetTargets(['/World/Plug/EndB'])
sl.CreateLocalPos0Attr(Gf.Vec3f(0, 0, 0)); sl.CreateLocalRot0Attr(Gf.Quatf(1, 0, 0, 0))
sl.CreateLocalPos1Attr(Gf.Vec3f(0, 0, 0)); sl.CreateLocalRot1Attr(Gf.Quatf(1, 0, 0, 0))
sl.CreateLowerLimitAttr(-0.06); sl.CreateUpperLimitAttr(0.005)                   # the plug's travel: 60 mm out .. 5 mm past the seat
sd = UsdPhysics.DriveAPI.Apply(sl.GetPrim(), 'linear'); sd.CreateStiffnessAttr(0.0); sd.CreateDampingAttr(0.0); sd.CreateMaxForceAttr(PRESS_N); sd.CreateTargetPositionAttr(0.003)
# hinge: End B -> rotor about y, the lock servo
hj = UsdPhysics.RevoluteJoint.Define(st, '/World/Plug/lock'); hj.CreateAxisAttr('Y')
hj.CreateBody0Rel().SetTargets(['/World/Plug/EndB']); hj.CreateBody1Rel().SetTargets(['/World/Plug/Rotor'])
hj.CreateLocalPos0Attr(Gf.Vec3f(*map(float, roff))); hj.CreateLocalRot0Attr(Gf.Quatf(1, 0, 0, 0))
hj.CreateLocalPos1Attr(Gf.Vec3f(0, 0, 0)); hj.CreateLocalRot1Attr(Gf.Quatf(1, 0, 0, 0))
hj.CreateLowerLimitAttr(-46.0); hj.CreateUpperLimitAttr(46.0)
hj.GetPrim().AddAppliedSchema('NewtonJointAPI')                                  # the servo's gearbox inertia + damping, as in MuJoCo (armature 0.012, damping 0.05)
hj.GetPrim().CreateAttribute('newton:armature', Sdf.ValueTypeNames.Float, custom=False).Set(float(os.environ.get('LOCK_ARMATURE', '0.012')))
hj.GetPrim().CreateAttribute('newton:damping', Sdf.ValueTypeNames.Float, custom=False).Set(0.05)
hd = UsdPhysics.DriveAPI.Apply(hj.GetPrim(), 'angular'); hd.CreateStiffnessAttr(0.0); hd.CreateDampingAttr(0.0)
hd.CreateMaxForceAttr(2.665); hd.CreateTargetPositionAttr(0.0)                 # USD angular drive gains are per DEGREE

from isaacsim.core.experimental.prims import Articulation
import isaacsim.core.experimental.utils.app as app_utils
tl = omni.timeline.get_timeline_interface()
if GUI:                                                                           # the window looks AT the parts (they are ~8 cm; the default view showed nothing)
    _vc = UsdGeom.Camera.Define(st, '/World/ViewCam'); _vc.CreateFocalLengthAttr(24.0); _vc.CreateClippingRangeAttr(Gf.Vec2f(0.005, 100))
    _seat = pe2 + q_rot(qe2, [0, 0.067, 0]); _sd = q_rot(qe2, [1, 0, 0]); _u = np.cross(q_rot(qe2, [0, 1, 0]), _sd)
    # LEVEL camera: up = the world's up (+z). 9 Nov: 'up' was taken from the plug's own (tilted) frame, the camera was rolled -
    # Alt+drag orbited the 'wrong' way (left turned right) and seemed to sink while turning
    _eye = _seat + 0.30 * _sd - 0.12 * q_rot(qe2, [0, 1, 0]); _eye[2] = _seat[2] + 0.14          # beside the joint, a little above (~35 cm)
    _dist = float(np.linalg.norm(_eye - _seat))
    UsdGeom.Xformable(_vc).AddTransformOp().Set(Gf.Matrix4d().SetLookAt(Gf.Vec3d(*map(float, _eye)), Gf.Vec3d(*map(float, _seat)), Gf.Vec3d(0, 0, 1)).GetInverse())
    # orbit pivot = the joint (Kit reads this camera attribute: the centre of interest, in the camera's own frame)
    _vc.GetPrim().CreateAttribute('omni:kit:centerOfInterest', Sdf.ValueTypeNames.Vector3d, True).Set(Gf.Vec3d(0, 0, -_dist))
    from omni.kit.viewport.utility import get_active_viewport
    get_active_viewport().camera_path = '/World/ViewCam'
SimulationManager.set_physics_dt(1.0 / HZ)                                    # before play
t0 = time.time(); app_utils.play(commit=True); app.update()
print('scene schemas', scene.GetPrim().GetAppliedSchemas(), flush=True)
art = Articulation('/World/Plug'); names = [str(n) for n in art.dof_names]
print('dofs', names, flush=True)
i_sl = next(i for i, n in enumerate(names) if n.endswith('slide')); i_lk = next(i for i, n in enumerate(names) if n.endswith('lock'))
from isaacsim.core.experimental.prims import RigidPrim
rbs = RigidPrim(paths=['/World/Plug/EndB', '/World/Plug/Rotor'])
SHOTS = os.environ.get('SHOTS', os.path.join(HERE, '..', 'data', 'logs', 'isaac_lock')); os.makedirs(SHOTS, exist_ok=True)
_em.set_extension_enabled_immediate('omni.replicator.core', True)
import omni.replicator.core as rep
from PIL import Image, ImageDraw
SEAT = pe2 + q_rot(qe2, [0, 0.067, 0])                                           # End B's pad face = the meeting point
_side = q_rot(qe2, [1, 0, 0]); _up = np.cross(q_rot(qe2, [0, 1, 0]), _side)
CAMS = []
CAM_D = float(os.environ.get('CAM_D', '0.4'))
for k_, off in ([] if GUI else enumerate((CAM_D * _side + 0.3 * CAM_D * _up, CAM_D * _up - 0.4 * CAM_D * q_rot(qe2, [0, 1, 0])))):
    # an exact look-at camera (rep.create.camera's look_at left the parts off-centre on this Z-up stage)
    cam_ = UsdGeom.Camera.Define(st, f'/World/Cam{k_}'); cam_.CreateFocalLengthAttr(float(os.environ.get('FOCAL', '50'))); cam_.CreateClippingRangeAttr(Gf.Vec2f(0.005, 100))
    eye_ = Gf.Vec3d(*map(float, SEAT + off)); V_ = Gf.Matrix4d().SetLookAt(eye_, Gf.Vec3d(*map(float, SEAT)), Gf.Vec3d(*map(float, _up)))
    UsdGeom.Xformable(cam_).AddTransformOp().Set(V_.GetInverse())
    rp_ = rep.create.render_product(cam_.GetPath().pathString, (640, 480)); an_ = rep.AnnotatorRegistry.get_annotator('rgb'); an_.attach([rp_]); CAMS.append(an_)
TAG = os.environ.get('TAG', f'tilt{TILT:g}')


def snap(label):
    """both cameras into one labelled PNG (Isaac RTX render of the simulated state)"""
    if GUI: return                                                                # window mode: the replay is the picture
    for _ in range(int(os.environ.get('WARM', '3'))): app.update()
    rep.orchestrator.step(rt_subframes=16)
    ims = [Image.fromarray(np.asarray(a_.get_data())[:, :, :3]) for a_ in CAMS]
    out = Image.new('RGB', (640 * len(ims), 506), 'white')
    for i_, im_ in enumerate(ims): out.paste(im_, (i_ * 640, 26))
    ImageDraw.Draw(out).text((6, 6), f'{TAG}  t={SimulationManager.get_simulation_time():.2f}s  {label}', fill='black')
    out.save(os.path.join(SHOTS, f'{TAG}_{label.replace(" ", "_")}.png'))


AX = q_rot(qe2, [0, 1, 0])                                                         # End B's connector axis in the world


def measure():
    """[slide (m along the axis, + = in), rotor angle (rad about End B's y)] from the SIMULATED body poses (the articulation's
    dof readback stayed 0 under Newton while the bodies moved, 9 Nov)"""
    P, Q = rbs.get_world_poses(); P = P.numpy(); Q = Q.numpy()
    qe_, qr_ = Q[0], Q[1]; rel = q_mul([qe_[0], -qe_[1], -qe_[2], -qe_[3]], qr_)   # rotor in End B's frame
    ang = 2 * math.atan2(rel[2], rel[0])                                           # about y
    return np.array([float((P[0] - pe2) @ AX), (ang + math.pi) % (2 * math.pi) - math.pi])
print(f'started in {time.time() - t0:.1f} s, dofs {names}', flush=True)

for _ in range(30): app.update()                                                  # renderer warm-up
snap('start')
TSIGN = float(os.environ.get('TSIGN', '1'))       # PROBE (9 Nov): +torque turns the rotor +; the earlier swing was the missing gearbox inertia

def vshot(label):
    """--gui: what the window shows, saved (so it is checked, not assumed)"""
    if not GUI: return
    from omni.kit.viewport.utility import get_active_viewport, capture_viewport_to_file
    capture_viewport_to_file(get_active_viewport(), os.path.join(SHOTS, f'{TAG}_window_{label.replace(" ", "_")}.png'))
    for _ in range(5): app.update()


LOCK_SIGN = 1.0                                                                   # End B turns +45 (phys_world LOCK_SIGN)
phases = [('press', 0.5, PRESS_N, 0.003, 0.0), ('turn', 1.5, PRESS_N, 0.003, 45.0), ('pull locked', 1.0, PULL_N, -0.05, 45.0),
          ('open', 0.5, PRESS_N, 0.003, 0.0), ('pull open', 1.0, PULL_N, -0.05, 0.0)]
res = {}; _n = 0; REC = []; REC_HZ = float(os.environ.get('REC_HZ', '125'))     # 125/s at 0.5x replay = 60 fps on screen
if GUI:                                                                            # the window draws nothing while physics runs (147 s -> headless speed)
    from omni.kit.viewport.utility import get_active_viewport as _gav
    _gav().updates_enabled = False; print('physics running (window paused) ...', flush=True)
if os.environ.get('PROBE'):                                                       # debug: which way does +torque turn the rotor, as measured?
    for k_ in range(10):
        for _ in range(20):
            _, Q_ = rbs.get_world_poses(); axr = q_rot(Q_.numpy()[0], [0, 1, 0])
            rbs.apply_forces_and_torques_at_pos(forces=np.zeros((2, 3), np.float32), torques=np.array([-0.02 * axr, 0.02 * axr], np.float32)); SimulationManager.step(steps=1)
        P_, Q_ = rbs.get_world_poses(); print(f'PROBE step {20 * (k_ + 1)}: angle {math.degrees(measure()[1]):7.2f} deg | quats {Q_.numpy().round(4).tolist()}', flush=True)
    app.close(); sys.exit(0)
for name, dur, F, slide_tgt, lock_deg in phases:
    # the plug: a pure force along its axis (magnets in / a pull out); the lock: the ST3215 servo model (400 N.m/rad, 8.8 damping,
    # capped at 2.66 N.m) as a torque on the rotor and the opposite torque on End B. XPBD's joint drives acted as hard position
    # targets (every pull ended exactly at its target, through solid plastic), so nothing here may move a part except a force.
    print(f'PHASE {name}: {"push in" if slide_tgt > 0 else "PULL OUT"} {F:.1f} N, lock {lock_deg:.0f} deg', flush=True)
    Fax = F if slide_tgt > 0 else -F; tgt_ = math.radians(LOCK_SIGN * lock_deg); q0 = measure(); peak = 0.0
    for _ in range(int(dur * HZ)):
        _, Q_ = rbs.get_world_poses(); _, W_ = rbs.get_velocities(); Q_ = Q_.numpy(); W_ = W_.numpy()
        axr = q_rot(Q_[0], [0, 1, 0]); ang_ = measure()[1]
        tau = float(np.clip(400.0 * (tgt_ - ang_) - 8.8 * float((W_[1] - W_[0]) @ axr), -2.665, 2.665)); peak = max(peak, abs(tau))
        rbs.apply_forces_and_torques_at_pos(forces=np.array([Fax * AX, [0, 0, 0]], np.float32), torques=TSIGN * np.array([-tau * axr, tau * axr], np.float32))
        SimulationManager.step(steps=1)
        _n += 1
        if _n % max(1, int(HZ / REC_HZ)) == 0:                                    # record REC_HZ frames per sim second (smooth replay)
            P_, Q_ = rbs.get_world_poses(); REC.append((name, P_.numpy().copy(), Q_.numpy().copy()))
    q = measure()
    res[name] = dict(slide_mm=float(q[i_sl] * 1000), moved_mm=float((q[i_sl] - q0[i_sl]) * 1000), rotor_deg=float(math.degrees(q[i_lk])))
    _pw = rbs.get_world_poses()[0].numpy()
    print(f'   force {Fax:+.1f} N, lock target {lock_deg:.0f} deg, peak lock torque {peak:.2f} N.m |  EndB {(_pw[0] * 1000).round(2).tolist()} rotor {(_pw[1] * 1000).round(2).tolist()} mm', flush=True)
    if os.environ.get('CONTACT_DEBUG'):                                            # which part pairs touch (Newton's own contact list)
        from isaacsim.physics.newton import acquire_stage
        ns_ = acquire_stage(); c_ = ns_.contacts; mdl = ns_.model; n_ = int(c_.rigid_contact_count.numpy()[0])
        s0, s1 = c_.rigid_contact_shape0.numpy()[:n_], c_.rigid_contact_shape1.numpy()[:n_]; lab = mdl.shape_label
        import collections as _co
        pairs_ = _co.Counter(tuple(sorted((lab[a_].split('/')[-2] if a_ >= 0 else '-', lab[b_].split('/')[-2] if b_ >= 0 else '-'))) for a_, b_ in zip(s0, s1))
        print(f'   contacts {n_} (max {c_.rigid_contact_max}): {dict(pairs_)}', flush=True)
    snap(name)
    print(f't {SimulationManager.get_simulation_time():5.2f} s ({SimulationManager.get_num_physics_steps()} steps) ', end='')
    print(f'{name:12s}: slide {q[i_sl] * 1000:7.2f} mm (moved {(q[i_sl] - q0[i_sl]) * 1000:+7.2f}), rotor {math.degrees(q[i_lk]):6.1f} deg', flush=True)

turned = res['turn']['rotor_deg'] > 40; held = abs(res['pull locked']['moved_mm']) < 1.0; out_ = res['pull open']['moved_mm'] < -5.0
print(f'RESULT tilt {TILT} deg, voxel {VOXEL * 1000:.2f} mm: rotor {"TURNED" if turned else "BLOCKED"} ({res["turn"]["rotor_deg"]:.1f} deg), '
      f'locked pull {"HOLDS" if held else "SLIPS"} ({res["pull locked"]["moved_mm"]:+.2f} mm), open pull {"COMES OUT" if out_ else "STUCK"} ({res["pull open"]["moved_mm"]:+.1f} mm) | wall {time.time() - t0:.0f} s', flush=True)
if GUI:
    # the recorded physics, replayed smoothly: physics ran at full speed without drawing (drawing every few steps gave ~5 fps),
    # now the window draws every frame. REPLAY_SPEED 0.5 = half real speed; loops until the window is closed.
    _gav().updates_enabled = True; tl.stop(); app.update()
    ops = {i_: UsdGeom.Xformable(st.GetPrimAtPath(pth)).GetOrderedXformOps() for i_, pth in enumerate(('/World/Plug/EndB', '/World/Plug/Rotor'))}
    SPEED = float(os.environ.get('REPLAY_SPEED', '0.5')); print(f'replaying {len(REC)} frames at {SPEED}x - close the window to stop', flush=True)
    vshot('replay_start')
    while app.is_running():
        t_ = time.time(); last = None
        for k_, (ph_, P_, Q_) in enumerate(REC):
            if not app.is_running(): break
            if ph_ != last: print(f'  {ph_}', flush=True); last = ph_
            for i_ in (0, 1):
                ops[i_][0].Set(Gf.Vec3d(*map(float, P_[i_]))); ops[i_][1].Set(Gf.Quatd(*map(float, Q_[i_])))
            app.update()
            wait_ = t_ + (k_ + 1) / REC_HZ / SPEED - time.time()
            if wait_ > 0: time.sleep(wait_)
        print(f'  loop done: {len(REC)} frames in {time.time() - t_:.1f} s = {len(REC) / max(time.time() - t_, 1e-6):.0f} fps', flush=True)
        if app.is_running():
            t_ = time.time()
            while time.time() - t_ < 1.5 and app.is_running(): app.update()       # a short pause between loops
app.close()
