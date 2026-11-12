"""isaac_newton.py — the shared Isaac Sim 6.2 + Newton world for physics on Nischay's REAL printed shapes (exact-mesh SDF contact).

One place for what every Isaac+Newton test needs (moved out of isaac_lock_test.py, 10 Nov 2026):
  World(...)            the app (window or headless), Newton configured, a Z-up metre stage, lights, the PLA material
  World.part(...)       a body = an Xform at its pose holding its STL (brain/meshes, body frame = STL*0.001 - offsets.json), SDF-collided
  World.mass(...)       mass / centre of mass / inertia from the MuJoCo model
  World.revolute(...)   a joint with MuJoCo-like stops, gearbox inertia (armature), damping, friction
  World.floor()         a static PLA-contact floor at z = 0
  World.view(...)       the window camera: level, orbit pivot on the target
  World.snapshots(...)  headless RTX pictures from look-at cameras; World.snap(label)
  World.replay(...)     --gui: physics runs with the window paused, then the recorded poses replay smoothly in a loop
  Servos                the ST3215 model (MuJoCo actuator: kp, kv, torque cap) applied as torques from the simulated body poses

Solver: Newton's MuJoCo solver (default; joint-space armature like the MuJoCo sim) or XPBD. Lessons baked in (9 Nov, see CURRENT_STATE):
  contact list size = MuJoCo nconmax; no USD drives (a 0-gain drive is a brake on the MuJoCo solver); joint stops via mjc:solreflimit
  (Newton's default is a 100 N/m rubber band); newton:damping is per DEGREE; PLA contact = mjc:solref (0.004, 1) + solimp as the MuJoCo sim.
"""
# REUSE-CHECKED: SimulationApp|configure_newton|NewtonSDFCollisionAPI|isaac -> isaac_lock_test.py (its setup moved HERE, it imports this);
# isaac_walk_view.py only replays MuJoCo poses in Isaac (no physics). Part frames = brain/meshes/offsets.json (as isaac_walk_view / extract_module).
import os, sys, json, math, time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
MESHES = os.path.join(HERE, '..', 'brain', 'meshes')
OFFSETS = json.load(open(os.path.join(MESHES, 'offsets.json')))           # body-frame vertex = STL * 0.001 - OFFSETS[part]
PLA_SOLREF = (0.004, 1.0); PLA_SOLIMP = (0.95, 0.99, 0.0005, 0.5, 2.0)   # multi_train.xml PLA contact
LIMIT_SOLREF = (0.02, 1.0)                                                # MuJoCo's own joint stop


def q_mul(a, b):
    w1, x1, y1, z1 = a; w2, x2, y2, z2 = b
    return np.array([w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2, w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
                     w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2, w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2])


def q_conj(q):
    return np.array([q[0], -q[1], -q[2], -q[3]])


def q_rot(q, v):
    return q_mul(q_mul(q, [0, *v]), q_conj(q))[1:]


def qv_mul(a, b):
    """q_mul for (n,4) arrays"""
    w1, x1, y1, z1 = a.T; w2, x2, y2, z2 = b.T
    return np.stack([w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2, w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
                     w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2, w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2], 1)


def qv_rot(q, v):
    """q_rot for (n,4) quats and (n,3) vectors: v + 2 w (u x v) + 2 u x (u x v)"""
    u = q[:, 1:]; t = 2 * np.cross(u, v); return v + q[:, :1] * t + np.cross(u, t)


def q_axis(axis, ang):
    a = np.asarray(axis, float); a = a / np.linalg.norm(a)
    return np.array([math.cos(ang / 2), *(math.sin(ang / 2) * a)])


class World:
    def __init__(self, gui=False, hz=1000, solver='mujoco', ncon=4000, gravity=9.81, voxel=0.0005, iters=10,
                 contact_ke=1e7, contact_kd=1e3, mj_cpu=False, subdiv=0.0006, subdiv_parts=(), worlds=0):
        """worlds = N > 0: everything under /World/c<k>/ becomes Newton world k (k < N) - its own solve, never touching another
        world (11 Nov: Isaac's bridge loads the whole stage as ONE world; several cases then shared one solve and disturbed each
        other). Prims outside /World/c<k>/ (lights, cameras, the physics scene) are global."""
        self.gui, self.hz, self.solver, self.voxel = gui, hz, solver, voxel
        self.subdiv, self.subdiv_parts = subdiv, set(subdiv_parts)
        from isaacsim import SimulationApp
        self.app = SimulationApp({'headless': not gui, 'width': 1600, 'height': 900})
        import omni.kit.app
        self.em = omni.kit.app.get_app().get_extension_manager()
        for x in ('isaacsim.physics.newton', 'isaacsim.physics.newton.tensors', 'isaacsim.core.experimental.prims', 'isaacsim.core.simulation_manager'):
            self.em.set_extension_enabled_immediate(x, True)                     # the default headless app does not load Newton
        if worlds: self._patch_worlds(int(worlds))                                # (after Kit is up: importing newton first loads the wrong USD)
        if os.environ.get('MM_CAP'):                                              # 11 Nov test: cap Newton's mesh-mesh pair capacity
            import newton._src.geometry.narrow_phase as _np_
            if not getattr(_np_.NarrowPhase.__init__, '_cap', False):
                _oi = _np_.NarrowPhase.__init__

                def _ni(self_, *a_, **k_):
                    cap = int(os.environ['MM_CAP']); k_['max_mesh_mesh_pairs'] = min(cap, k_.get('max_mesh_mesh_pairs') or cap); _oi(self_, *a_, **k_)
                _ni._cap = True; _np_.NarrowPhase.__init__ = _ni
        global trimesh, Usd, UsdGeom, UsdPhysics, UsdShade, UsdLux, Gf, Sdf, Vt, SimulationManager
        import trimesh, omni.usd, omni.timeline
        from pxr import Usd, UsdGeom, UsdPhysics, UsdShade, UsdLux, Gf, Sdf, Vt
        from isaacsim.physics.newton import NewtonConfig, MuJoCoSolverConfig, XPBDSolverConfig, configure_newton
        from isaacsim.physics.newton.impl.collision_config import CollisionConfig
        from isaacsim.physics.newton.impl.collision_config import HydroelasticConfig

        def _hydro():                                                             # HYDRO_MULT: its GPU buffers x N (11 Nov test)
            k_ = int(os.environ.get('HYDRO_MULT', '1'))
            return HydroelasticConfig(buffer_mult_broad=k_, buffer_mult_iso=k_, buffer_mult_contact=k_)
        from isaacsim.core.simulation_manager import SimulationManager
        self.tl = omni.timeline.get_timeline_interface()
        # MuJoCo solver: contact slots = Newton's contact list (9 Nov: list 1000 < nconmax 4000 -> every step's contacts dropped)
        scfg = (MuJoCoSolverConfig(njmax=5 * ncon, nconmax=ncon, cone='elliptic', use_mujoco_cpu=mj_cpu) if solver == 'mujoco'
                else XPBDSolverConfig(iterations=iters))
        # contact_ke/kd only matter for XPBD (Isaac's 1e4 default let parts sink); the MuJoCo solver uses the mjc:solref per shape
        configure_newton(NewtonConfig(physics_frequency=hz, contact_margin=0.0001, soft_contact_margin=0.0001, contact_ke=contact_ke,
                                      contact_kd=contact_kd, solver_cfg=scfg, collision_cfg=CollisionConfig(rigid_contact_max=ncon * max(1, int(worlds)), hydroelastic=_hydro(), broad_phase=os.environ.get('BROAD', 'sap'))))   # MuJoCo's nconmax is PER world
        SimulationManager.switch_physics_engine('newton')
        ctx = omni.usd.get_context(); ctx.new_stage(); self.app.update(); st = self.st = ctx.get_stage()
        UsdGeom.SetStageUpAxis(st, UsdGeom.Tokens.z); UsdGeom.SetStageMetersPerUnit(st, 1.0); UsdPhysics.SetStageKilogramsPerUnit(st, 1.0)
        UsdGeom.Xform.Define(st, '/World')
        self.scene = UsdPhysics.Scene.Define(st, '/World/physicsScene')
        self.scene.CreateGravityDirectionAttr(Gf.Vec3f(0, 0, -1)); self.scene.CreateGravityMagnitudeAttr(float(gravity))
        schema = {'xpbd': 'NewtonXpbdSceneAPI', 'vbd': 'NewtonVbdSceneAPI', 'mujoco': 'MjcSceneAPI'}
        for k, api in schema.items():                                             # Isaac's Newton picks its solver from this marker
            if k != solver: self.scene.GetPrim().RemoveAppliedSchema(api)
        self.scene.GetPrim().AddAppliedSchema(schema[solver])
        UsdLux.DomeLight.Define(st, '/World/Dome').CreateIntensityAttr(400)
        sun = UsdLux.DistantLight.Define(st, '/World/Sun'); sun.CreateIntensityAttr(1500); UsdGeom.Xformable(sun).AddRotateXYZOp().Set(Gf.Vec3f(-45, 20, 30))
        self.pla = UsdShade.Material.Define(st, '/World/PLA'); pm = UsdPhysics.MaterialAPI.Apply(self.pla.GetPrim())
        pm.CreateStaticFrictionAttr(0.35); pm.CreateDynamicFrictionAttr(0.35); pm.CreateRestitutionAttr(0.0)   # the sim's PLA friction
        self.cams = []; self.rec = []; self.rec_paths = []

    # ---------------------------------------------------------------- bodies
    def _contact(self, p):
        """PLA contact on a collision prim (material + the MuJoCo sim's solref/solimp on the MuJoCo solver)"""
        UsdShade.MaterialBindingAPI.Apply(p).Bind(self.pla, UsdShade.Tokens.weakerThanDescendants, 'physics')
        if self.solver == 'mujoco':
            # 9 Nov: CONTACT_KE 1e7 / KD 1e3 became solref (2 ms, damping ratio 0.16) here - a ringing spring that blew parts apart
            p.CreateAttribute('mjc:solref', Sdf.ValueTypeNames.Float2, custom=False).Set(Gf.Vec2f(*PLA_SOLREF))
            p.CreateAttribute('mjc:solimp', Sdf.ValueTypeNames.FloatArray, custom=False).Set(Vt.FloatArray(list(PLA_SOLIMP)))

    def part(self, path, name, pos, quat, color, collide=True, mesh_frame=None):
        """an Xform at the body pose holding the part's real mesh in its body frame, collided by SDF. mesh_frame = (quat wxyz, offset m):
        STL (m) -> body frame for a part not in offsets.json (the floor receiver)"""
        st = self.st
        xf = UsdGeom.Xform.Define(st, path)
        xf.AddTranslateOp(UsdGeom.XformOp.PrecisionDouble).Set(Gf.Vec3d(*map(float, pos)))
        xf.AddOrientOp(UsdGeom.XformOp.PrecisionDouble).Set(Gf.Quatd(*map(float, quat)))
        tm = trimesh.load(os.path.join(MESHES, name + '.stl'), force='mesh'); tm.apply_scale(0.001)
        if mesh_frame is None: tm.apply_translation(-np.array(OFFSETS[name]))
        else:
            T_ = trimesh.transformations.quaternion_matrix(mesh_frame[0]); T_[:3, 3] = mesh_frame[1]; tm.apply_transform(T_)

        def mesh_(pth, m_):
            g_ = UsdGeom.Mesh.Define(st, pth); g_.CreatePointsAttr(Vt.Vec3fArray.FromNumpy(m_.vertices.astype(np.float32)))
            g_.CreateFaceVertexCountsAttr(Vt.IntArray([3] * len(m_.faces))); g_.CreateFaceVertexIndicesAttr(Vt.IntArray.FromNumpy(m_.faces.astype(np.int32).ravel()))
            g_.CreateDisplayColorAttr([Gf.Vec3f(*color)]); return g_
        me = mesh_(path + '/mesh', tm)                                            # what is drawn: the part as exported
        if not collide: return xf, tm
        if self.subdiv > 0 and name in self.subdiv_parts:
            # mesh-vs-SDF contact tests the mesh's VERTICES (9 Nov: the rotor's flat fins had too few, a fin sank through the socket lip);
            # the dense copy is hidden from the render (a 194k-vertex rotor made the window slow)
            v_, f_ = trimesh.remesh.subdivide_to_size(tm.vertices, tm.faces, max_edge=self.subdiv); cm = trimesh.Trimesh(v_, f_, process=False)
            me = mesh_(path + '/collision', cm); me.CreatePurposeAttr(UsdGeom.Tokens.guide); tm = cm
        p = me.GetPrim(); UsdPhysics.CollisionAPI.Apply(p)
        UsdPhysics.MeshCollisionAPI.Apply(p).CreateApproximationAttr('none')        # the mesh itself, never its hull
        p.AddAppliedSchema('NewtonSDFCollisionAPI')
        p.CreateAttribute('newton:sdfTargetVoxelSize', Sdf.ValueTypeNames.Float, custom=False).Set(self.voxel)
        p.CreateAttribute('newton:sdfNarrowBandInner', Sdf.ValueTypeNames.Float, custom=False).Set(-0.002)
        p.CreateAttribute('newton:sdfNarrowBandOuter', Sdf.ValueTypeNames.Float, custom=False).Set(0.002)
        self._contact(p)
        print(f'{name}: {len(tm.vertices)} collision vertices', flush=True)
        return xf, tm

    def mass(self, path, mass, com=None, inertia=None, principal=None):
        """rigid body: mass (kg), centre of mass (body frame), principal inertia + its axes (wxyz) - from the MuJoCo model"""
        prim = self.st.GetPrimAtPath(path); UsdPhysics.RigidBodyAPI.Apply(prim); ma = UsdPhysics.MassAPI.Apply(prim); ma.CreateMassAttr(float(mass))
        if com is not None: ma.CreateCenterOfMassAttr(Gf.Vec3f(*map(float, com)))
        if inertia is not None: ma.CreateDiagonalInertiaAttr(Gf.Vec3f(*map(float, inertia)))
        if principal is not None: ma.CreatePrincipalAxesAttr(Gf.Quatf(*map(float, principal)))
        return ma

    def no_collide(self, a, b):
        UsdPhysics.FilteredPairsAPI.Apply(self.st.GetPrimAtPath(a)).CreateFilteredPairsRel().AddTarget(b)

    def _joint_common(self, j, parent, child, pos0, rot0, armature, damping, friction):
        if parent: j.CreateBody0Rel().SetTargets([parent])
        j.CreateBody1Rel().SetTargets([child])
        j.CreateLocalPos0Attr(Gf.Vec3f(*map(float, pos0))); j.CreateLocalRot0Attr(Gf.Quatf(*map(float, rot0)))
        j.CreateLocalPos1Attr(Gf.Vec3f(0, 0, 0)); j.CreateLocalRot1Attr(Gf.Quatf(1, 0, 0, 0))
        p = j.GetPrim(); p.AddAppliedSchema('NewtonJointAPI')
        p.CreateAttribute('newton:armature', Sdf.ValueTypeNames.Float, custom=False).Set(float(armature))   # the gearbox, joint-space
        return p

    def revolute(self, path, parent, child, pos0, rot0, axis, lo_deg, hi_deg, armature=0.0, damping=0.0, friction=0.0, stiffness=0.0,
                 solreflimit=LIMIT_SOLREF):
        """parent -> child hinge about the child's own axis ('X'/'Y'/'Z'), at pos0/rot0 in the parent frame. damping in N.m.s/rad,
        friction (Coulomb) in N.m, stiffness = a passive spring to 0 (N.m/rad, the PLA flex). Stops = MuJoCo's (mjc:solreflimit).
        Hinges stacked between the SAME two bodies about different axes are merged by Newton into one multi-axis joint."""
        j = UsdPhysics.RevoluteJoint.Define(self.st, path); j.CreateAxisAttr(axis)
        p = self._joint_common(j, parent, child, pos0, rot0, armature, damping, friction)
        j.CreateLowerLimitAttr(float(lo_deg)); j.CreateUpperLimitAttr(float(hi_deg))
        p.CreateAttribute('newton:damping', Sdf.ValueTypeNames.Float, custom=False).Set(float(damping) * math.pi / 180)  # Newton: per DEGREE
        p.CreateAttribute('newton:friction', Sdf.ValueTypeNames.Float, custom=False).Set(float(friction))
        p.CreateAttribute('mjc:solreflimit', Sdf.ValueTypeNames.Float2, custom=False).Set(Gf.Vec2f(*map(float, solreflimit)))
        if stiffness: p.CreateAttribute('mjc:stiffness', Sdf.ValueTypeNames.Float, custom=False).Set(float(stiffness))
        return j

    def prismatic(self, path, parent, child, pos0, rot0, axis, lo, hi):
        """a test-rig slide (no gearbox: Newton's default armature 0.1 would add 100 g)"""
        j = UsdPhysics.PrismaticJoint.Define(self.st, path); j.CreateAxisAttr(axis)
        p = self._joint_common(j, parent, child, pos0, rot0, 0.0, 0.0, 0.0)
        j.CreateLowerLimitAttr(float(lo)); j.CreateUpperLimitAttr(float(hi))
        p.CreateAttribute('mjc:solreflimit', Sdf.ValueTypeNames.Float2, custom=False).Set(Gf.Vec2f(*LIMIT_SOLREF))
        return j

    def fixed(self, path, child, pos0, rot0, parent=None):
        j = UsdPhysics.FixedJoint.Define(self.st, path)
        if parent: j.CreateBody0Rel().SetTargets([parent])
        j.CreateBody1Rel().SetTargets([child])
        j.CreateLocalPos0Attr(Gf.Vec3f(*map(float, pos0))); j.CreateLocalRot0Attr(Gf.Quatf(*map(float, rot0)))
        j.CreateLocalPos1Attr(Gf.Vec3f(0, 0, 0)); j.CreateLocalRot1Attr(Gf.Quatf(1, 0, 0, 0))
        return j

    def tag(self, body_path, name, png, pos, R, plate):
        """an ArUco tag printed on a part (visual only, moves with it): a plate x plate square at body-frame pos, frame R (3x3 columns
        x, y, z; z = facing out), textured with png (camera._marker_png: the marker + its white border). Corner order as OpenCV's
        marker frame (camera.ThirdPersonCamera.detect): image top-left = (-h, +h) in the tag frame"""
        h = plate / 2; path = f'{body_path}/{name}'
        g = UsdGeom.Mesh.Define(self.st, path); x = UsdGeom.Xformable(g)
        x.AddTranslateOp(UsdGeom.XformOp.PrecisionDouble).Set(Gf.Vec3d(*map(float, pos)))
        M4 = Gf.Matrix4d(1.0); M4.SetRotateOnly(Gf.Matrix3d(*[float(v) for v in np.asarray(R, float).T.flatten()]))
        x.AddTransformOp().Set(M4)
        g.CreatePointsAttr([Gf.Vec3f(-h, h, 0), Gf.Vec3f(h, h, 0), Gf.Vec3f(h, -h, 0), Gf.Vec3f(-h, -h, 0)])
        g.CreateFaceVertexCountsAttr([4]); g.CreateFaceVertexIndicesAttr([0, 3, 2, 1])            # counter-clockwise seen from +z
        st_ = UsdGeom.PrimvarsAPI(g).CreatePrimvar('st', Sdf.ValueTypeNames.TexCoord2fArray, UsdGeom.Tokens.vertex)
        st_.Set([Gf.Vec2f(0, 1), Gf.Vec2f(1, 1), Gf.Vec2f(1, 0), Gf.Vec2f(0, 0)])
        mat = UsdShade.Material.Define(self.st, f'{path}_mat'); sh = UsdShade.Shader.Define(self.st, f'{path}_mat/pbr'); sh.CreateIdAttr('UsdPreviewSurface')
        sh.CreateInput('roughness', Sdf.ValueTypeNames.Float).Set(0.9)
        tx = UsdShade.Shader.Define(self.st, f'{path}_mat/tex'); tx.CreateIdAttr('UsdUVTexture'); tx.CreateInput('file', Sdf.ValueTypeNames.Asset).Set(png)
        rd = UsdShade.Shader.Define(self.st, f'{path}_mat/st'); rd.CreateIdAttr('UsdPrimvarReader_float2'); rd.CreateInput('varname', Sdf.ValueTypeNames.Token).Set('st')
        tx.CreateInput('st', Sdf.ValueTypeNames.Float2).ConnectToSource(rd.ConnectableAPI(), 'result')
        sh.CreateInput('diffuseColor', Sdf.ValueTypeNames.Color3f).ConnectToSource(tx.ConnectableAPI(), 'rgb')
        mat.CreateSurfaceOutput().ConnectToSource(sh.ConnectableAPI(), 'surface'); UsdShade.MaterialBindingAPI.Apply(g.GetPrim()).Bind(mat)
        return g

    def floor(self, size=2.0, color=(0.55, 0.5, 0.45), name='Floor', pos=(0, 0, 0), quat=(1, 0, 0, 0)):
        """a static box whose top face is the plane through pos with normal quat*z (default the world floor z = 0), PLA contact.
        A turned one is a slope / wall / ceiling for one test case (the case's gravity turned the other way, as manual SURFACE_DEG)"""
        if getattr(self, 'plane_floor', False):
            # 11 Nov: a BOX floor goes through Newton's mesh-vs-convex path: ~400k triangle pairs per step per case (15 ms/step), and
            # 3+ cases overflowed its 1M buffer -> contacts dropped, bases sank 6.3 mm. A true plane is per-vertex, cheap. Infinite,
            # so only with one Newton world per case (World(worlds=N)) - it then cannot reach another case
            c = UsdGeom.Plane.Define(self.st, f'/World/{name}'); c.CreateAxisAttr('Z'); c.CreateWidthAttr(size); c.CreateLengthAttr(size)
            c.CreateDisplayColorAttr([Gf.Vec3f(*color)]); x = UsdGeom.Xformable(c)
            x.AddTranslateOp().Set(Gf.Vec3d(*map(float, pos))); x.AddOrientOp().Set(Gf.Quatf(*map(float, quat)))
            UsdPhysics.CollisionAPI.Apply(c.GetPrim()); self._contact(c.GetPrim())
            return c
        c = UsdGeom.Cube.Define(self.st, f'/World/{name}'); c.CreateSizeAttr(1.0); c.CreateDisplayColorAttr([Gf.Vec3f(*color)])
        x = UsdGeom.Xformable(c); top = np.asarray(pos, float) + q_rot(quat, [0, 0, -0.01])
        x.AddTranslateOp().Set(Gf.Vec3d(*map(float, top))); x.AddOrientOp().Set(Gf.Quatf(*map(float, quat))); x.AddScaleOp().Set(Gf.Vec3f(size, size, 0.02))
        UsdPhysics.CollisionAPI.Apply(c.GetPrim()); self._contact(c.GetPrim())
        return c

    # ---------------------------------------------------------------- run
    def play(self):
        SimulationManager.set_physics_dt(1.0 / self.hz)                            # before play
        import isaacsim.core.experimental.utils.app as app_utils
        app_utils.play(commit=True); self.app.update()
        # 10 Nov: every app.update() while the timeline PLAYS also steps the physics - WITHOUT our servo / magnet forces (20 renderer
        # warm-up frames = 0.33 s of limp servos: a wall-mounted module folded, upright ones sagged 6.6 mm). Paused, only step() moves it
        self.tl.pause(); self.app.update()
        if self.gui:                                                              # physics at full speed: the window draws nothing now
            from omni.kit.viewport.utility import get_active_viewport
            get_active_viewport().updates_enabled = False

    def rigid(self, paths):
        from isaacsim.core.experimental.prims import RigidPrim
        rb = RigidPrim(paths=list(paths)); self._vis = (rb, [UsdGeom.Xformable(self.st.GetPrimAtPath(p)).GetOrderedXformOps() for p in paths])
        return rb                                                                # (the last one made is what pictures draw)

    @staticmethod
    def _patch_worlds(n):
        """Isaac's Newton bridge calls builder.add_usd(stage) ONCE: wrap it so it loads /World/c<k>/ as world k, one call each"""
        import newton
        if getattr(newton.ModelBuilder.add_usd, '_tetro_worlds', None) == n: return
        orig = getattr(newton.ModelBuilder.add_usd, '_tetro_orig', newton.ModelBuilder.add_usd)

        def add_usd(self_b, source=None, **kw):
            res = None; base_ignore = list(kw.pop('ignore_paths', None) or [])
            for k in range(n):
                self_b.begin_world(label=f'c{k}')
                r = orig(self_b, source=source, ignore_paths=base_ignore + [rf'/World/c(?!{k}/)\d+/.*'], **kw)
                self_b.end_world(); res = res or r
            return res
        add_usd._tetro_worlds = n; add_usd._tetro_orig = orig; newton.ModelBuilder.add_usd = add_usd

    def fast_poses(self, paths):
        """11 Nov: RigidPrim.get_world_poses + get_velocities cost 16 ms per step (the physics step itself 0.5 ms). Newton's own state
        arrays hold the same: ONE copy of body_q / body_qd. Returns read() -> (P (n,3), Q (n,4) wxyz, Wang (n,3) world angular vel)
        in `paths` order; check() compares it with RigidPrim (order / quaternion / velocity layout verified, not assumed)"""
        from isaacsim.physics.newton import acquire_stage
        ns = acquire_stage(); lab = list(ns.model.body_label); idx = np.array([lab.index(p) for p in paths])
        ang = slice(3, 6) if os.environ.get('NEWTON_QD_ANG_FIRST', '0') != '1' else slice(0, 3)

        def read():
            s = acquire_stage().state_0; bq = s.body_q.numpy()[idx]; bqd = s.body_qd.numpy()[idx]
            return bq[:, :3].copy(), bq[:, [6, 3, 4, 5]].copy(), bqd[:, ang].copy()
        return read

    def _sync_visuals(self):
        """10 Nov: with the timeline PAUSED (play()) the renderer never sees Newton's poses - every picture showed the start pose
        while the physics moved. Copy the live poses into the USD transforms first (as replay() does)"""
        if getattr(self, '_vis', None) is None: return
        rb, ops = self._vis; P, Q = rb.get_world_poses(); P, Q = P.numpy(), Q.numpy()
        for i, o in enumerate(ops): o[0].Set(Gf.Vec3d(*map(float, P[i]))); o[1].Set(Gf.Quatd(*map(float, Q[i])))

    def step(self, n=1):
        SimulationManager.step(steps=n)

    def time(self):
        return SimulationManager.get_simulation_time()

    def contacts(self, poses=None, touch=0.0002, full=False):
        """{(bodyA, bodyB): count} from Newton's own contact list (body = the collision prim's parent Xform name).
        poses = {body prim path: (pos, quat wxyz)}: then only contacts whose real gap <= touch count. Newton's list also holds NEARBY
        pairs that do not touch (10 Nov: End A - Spine1 'in contact' while the CAD has them > 2 mm apart)."""
        from isaacsim.physics.newton import acquire_stage
        import collections
        ns = acquire_stage(); c = ns.contacts; n = int(c.rigid_contact_count.numpy()[0]); lab = ns.model.shape_label
        s0, s1 = c.rigid_contact_shape0.numpy()[:n], c.rigid_contact_shape1.numpy()[:n]
        nm = lambda i: ((lab[i].rsplit('/', 1)[0] if full else lab[i].split('/')[-2]) if lab[i].count('/') > 2 else lab[i].split('/')[-1]) if i >= 0 else '-'   # full: the body's path (two modules share part names)
        keep = np.ones(n, bool)
        if poses is not None and n:
            sb = ns.model.shape_body.numpy(); bl = list(ns.model.body_label)
            p0, p1 = c.rigid_contact_point0.numpy()[:n], c.rigid_contact_point1.numpy()[:n]
            nrm = c.rigid_contact_normal.numpy()[:n]; th = c.rigid_contact_margin0.numpy()[:n] + c.rigid_contact_margin1.numpy()[:n]

            def world(shape, pt):
                b = sb[shape]
                if b < 0: return pt                                              # static shape: body frame = world
                P, Q = poses[bl[b]]; return np.asarray(P) + q_rot(Q, pt)
            for k in range(n):
                gap = float(np.dot(world(s1[k], p1[k]) - world(s0[k], p0[k]), nrm[k])) - float(th[k])
                keep[k] = gap <= touch
        return dict(collections.Counter(tuple(sorted((nm(a), nm(b)))) for a, b, kk in zip(s0, s1, keep) if kk))

    def model_joints(self):
        """what Newton actually built (labels, armature, damping, friction, limits) - check, never assume"""
        from isaacsim.physics.newton import acquire_stage
        m = acquire_stage().model; out = {}
        for a in ('joint_label', 'joint_armature', 'joint_damping', 'joint_friction', 'joint_limit_lower', 'joint_limit_upper'):
            v = getattr(m, a, None); out[a] = v.numpy().round(5).tolist() if hasattr(v, 'numpy') else v
        mj = getattr(m, 'mujoco', None)                                            # the MuJoCo solver's own extras (passive springs)
        if mj is not None and hasattr(mj, 'dof_passive_stiffness'): out['dof_passive_stiffness'] = mj.dof_passive_stiffness.numpy().round(3).tolist()
        out['joint_type'] = m.joint_type.numpy().tolist(); out['joint_dof_dim'] = m.joint_dof_dim.numpy().tolist()
        return out

    # ---------------------------------------------------------------- pictures
    def view(self, eye, target, focal=24.0):
        """the window camera: LEVEL (up = world +z; 9 Nov a rolled camera made Alt+drag orbit the wrong way), orbit pivot = target"""
        if not self.gui: return
        vc = UsdGeom.Camera.Define(self.st, '/World/ViewCam'); vc.CreateFocalLengthAttr(focal); vc.CreateClippingRangeAttr(Gf.Vec2f(0.005, 100))
        UsdGeom.Xformable(vc).AddTransformOp().Set(Gf.Matrix4d().SetLookAt(Gf.Vec3d(*map(float, eye)), Gf.Vec3d(*map(float, target)), Gf.Vec3d(0, 0, 1)).GetInverse())
        vc.GetPrim().CreateAttribute('omni:kit:centerOfInterest', Sdf.ValueTypeNames.Vector3d, True).Set(Gf.Vec3d(0, 0, -float(np.linalg.norm(np.subtract(eye, target)))))
        from omni.kit.viewport.utility import get_active_viewport
        get_active_viewport().camera_path = '/World/ViewCam'

    def snapshots(self, views, focal=50.0, size=(640, 480)):
        """headless RTX pictures: views = [(eye, target, up)], exact look-at cameras (rep's look_at left parts off-centre on Z-up)"""
        if self.gui: return
        self.em.set_extension_enabled_immediate('omni.replicator.core', True)
        import omni.replicator.core as rep
        self.rep = rep; self.cam_size = size
        for k, (eye, target, up) in enumerate(views):
            cam = UsdGeom.Camera.Define(self.st, f'/World/Cam{k}'); cam.CreateFocalLengthAttr(float(focal)); cam.CreateClippingRangeAttr(Gf.Vec2f(0.005, 100))
            UsdGeom.Xformable(cam).AddTransformOp().Set(Gf.Matrix4d().SetLookAt(Gf.Vec3d(*map(float, eye)), Gf.Vec3d(*map(float, target)), Gf.Vec3d(*map(float, up))).GetInverse())
            rp = rep.create.render_product(cam.GetPath().pathString, size); an = rep.AnnotatorRegistry.get_annotator('rgb'); an.attach([rp]); self.cams.append(an)

    def aim(self, k, eye, target, up=(0, 0, 1)):
        """re-point snapshot camera k (it follows a moving target, e.g. a socket on a bending module)"""
        if self.gui or k >= len(self.cams): return
        cam = UsdGeom.Camera(self.st.GetPrimAtPath(f'/World/Cam{k}'))
        cam.GetPrim().GetAttribute('xformOp:transform').Set(Gf.Matrix4d().SetLookAt(Gf.Vec3d(*map(float, eye)), Gf.Vec3d(*map(float, target)), Gf.Vec3d(*map(float, up))).GetInverse())

    def snap(self, path, label, warm=3, cams=None, render=True):
        """snapshot cameras (all, or the indices in cams) side by side into one labelled PNG. render=False: reuse this moment's
        render (several PNGs of one moment - one render for all of them)"""
        if self.gui or not self.cams: return
        from PIL import Image, ImageDraw
        if render:
            self._sync_visuals()
            for _ in range(warm): self.app.update()
            self.rep.orchestrator.step(rt_subframes=16, delta_time=0.0, pause_timeline=True)   # a picture never moves the physics
        ims = [Image.fromarray(np.asarray(a.get_data())[:, :, :3]) for k, a in enumerate(self.cams) if cams is None or k in cams]
        w, h = self.cam_size; out = Image.new('RGB', (w * len(ims), h + 26), 'white')
        for i, im in enumerate(ims): out.paste(im, (i * w, 26))
        ImageDraw.Draw(out).text((6, 6), f'{label}  t={self.time():.2f}s', fill='black')
        os.makedirs(os.path.dirname(path), exist_ok=True); out.save(path)

    def window_shot(self, path):
        """--gui: what the window shows, saved (so it is checked, not assumed)"""
        if not self.gui: return
        from omni.kit.viewport.utility import get_active_viewport, capture_viewport_to_file
        capture_viewport_to_file(get_active_viewport(), path)
        for _ in range(5): self.app.update()

    # ---------------------------------------------------------------- record / replay (window mode)
    def record(self, rb, label):
        P, Q = rb.get_world_poses(); self.rec.append((label, P.numpy().copy(), Q.numpy().copy()))

    def replay(self, paths, rec_hz, speed=0.5, shot=None):
        """the recorded physics, replayed smoothly (drawing during physics gave ~5 fps); loops until the window is closed"""
        if not self.gui: return
        from omni.kit.viewport.utility import get_active_viewport
        get_active_viewport().updates_enabled = True; self.tl.stop(); self.app.update()
        ops = [UsdGeom.Xformable(self.st.GetPrimAtPath(p)).GetOrderedXformOps() for p in paths]
        print(f'replaying {len(self.rec)} frames at {speed}x - close the window to stop', flush=True)
        if shot: self.window_shot(shot)
        while self.app.is_running():
            t0 = time.time(); last = None
            for k, (lab, P, Q) in enumerate(self.rec):
                if not self.app.is_running(): break
                if lab != last: print(f'  {lab}', flush=True); last = lab
                for i, o in enumerate(ops):
                    o[0].Set(Gf.Vec3d(*map(float, P[i]))); o[1].Set(Gf.Quatd(*map(float, Q[i])))
                self.app.update()
                wait = t0 + (k + 1) / rec_hz / speed - time.time()
                if wait > 0: time.sleep(wait)
            print(f'  loop done: {len(self.rec)} frames in {time.time() - t0:.1f} s = {len(self.rec) / max(time.time() - t0, 1e-6):.0f} fps', flush=True)
            t1 = time.time()
            while time.time() - t1 < 1.5 and self.app.is_running(): self.app.update()

    def close(self):
        self.app.close()


class Servos:
    """ST3215 servos as torques, measured from the SIMULATED body poses (the articulation's dof readback stayed 0 under Newton, 9 Nov).
    joints = [(name, parent_index, child_index, axis_in_child, rest_rel_quat)], indices into the RigidPrim `rb`, parent None = world.

    real=True (default) = the MuJoCo sim's servo (phys_world._servo, ONE copy in tetro_env2): the setpoint slews to the target at the
    servo's top speed / acceleration, the torque cap falls with speed and battery sag, 0.1 deg deadband. Per joint (params[name]):
      bl   = gear play half-width (rad): the gears push only once it is taken up (MuJoCo: the *_bl joint)
      kser = the bracket's flex ALONG the servo axis (N.m/rad), in series with the servo (MuJoCo: the same-axis *_flexx joint)
    (Newton merges stacked hinges only about DIFFERENT axes: the off-axis flex stays real joints, these two live here.)
    real=False = a bare position servo (the lock rig)."""

    def __init__(self, rb, joints, kp=80.0, kv=1.0, cap=2.7, sign=1.0, params=None, real=True, volt=11.1, hz=1000.0, ctrl_dt=0.005, groups=None):
        from tetro_env2 import ACC_RAD, W0_12V, st3215_sag, st3215_slew, st3215_limit
        import disturb as DIST
        self.st = (st3215_sag, st3215_slew, st3215_limit); self.deadband = DIST.DEADBAND
        self.rb, self.j, self.kp, self.kv, self.cap, self.sign, self.real = rb, joints, kp, kv, cap, sign, real
        self.n = len(rb.get_world_poses()[0].numpy()); nj = len(joints); P = params or {}
        self.target = {j[0]: 0.0 for j in joints}; self.tau = {j[0]: 0.0 for j in joints}; self.peak = {j[0]: 0.0 for j in joints}
        self.bl = np.array([P.get(j[0], {}).get('bl', 0.0) for j in joints])
        ks = np.array([P.get(j[0], {}).get('kser', 0.0) for j in joints])
        self.kser_v = ks
        self.kp_eff = np.where(ks > 0, 1.0 / (1.0 / kp + 1.0 / np.where(ks > 0, ks, 1.0)), kp)   # servo + bracket in series
        self.volt = volt; self.w0 = np.full(nj, W0_12V * volt / 12); self.amax = np.full(nj, ACC_RAD); self.fr0 = np.full(nj, cap)
        self.sp = None; self.spv = np.zeros(nj); self.lim = np.full(nj, cap); self.sag = 1.0
        self.every = max(1, int(round(ctrl_dt * hz))); self.ctrl_dt = self.every / hz; self.k = 0
        self.groups = np.zeros(nj, int) if groups is None else np.asarray(groups, int)   # one battery per module: its own sag
        self.vmax = np.full(nj, np.inf)                                           # rad/s: the board's speed setting (/api/batch speed)
        # 11 Nov: the joint maths batched (a Python loop per joint per step was ~1.8 ms of a ~8 ms step)
        self.names = [j[0] for j in joints]; self.IC = np.array([j[2] for j in joints]); self.IP = np.array([-1 if j[1] is None else j[1] for j in joints])
        self.HASP = self.IP >= 0; self.AX = np.array([j[3] for j in joints], float); self.R0C = np.array([[r[0], -r[1], -r[2], -r[3]] for r in (j[4] for j in joints)], float)

    def _angles_v(self, Q, W=None):
        """every joint's angle (and speed) as arrays, batched"""
        QP = np.where(self.HASP[:, None], Q[np.maximum(self.IP, 0)], np.array([1.0, 0, 0, 0])); QC = Q[self.IC]
        d = qv_mul(self.R0C, qv_mul(QP * np.array([1, -1, -1, -1.0]), QC))
        q = (2 * np.arctan2(np.sum(d[:, 1:] * self.AX, 1), d[:, 0]) + math.pi) % (2 * math.pi) - math.pi
        if W is None: return q, None, None
        axw = qv_rot(QC, self.AX); Wp = np.where(self.HASP[:, None], W[np.maximum(self.IP, 0)], 0.0)
        return q, np.sum((W[self.IC] - Wp) * axw, 1), axw

    def angles(self, Q=None, W=None):
        if Q is None: Q = self.rb.get_world_poses()[1].numpy()
        if os.environ.get('SERVO_LOOP') != '1':
            q, qd, _ = self._angles_v(Q, W); out = dict(zip(self.names, q.tolist()))
            return (out, dict(zip(self.names, qd.tolist()))) if W is not None else out
        out = {}; vel = {}
        for name, ip, ic, ax, r0 in self.j:
            qp = Q[ip] if ip is not None else np.array([1.0, 0, 0, 0])
            d = q_mul(q_conj(r0), q_mul(q_conj(qp), Q[ic]))                     # child's turn from rest, in its own frame
            out[name] = (2 * math.atan2(float(np.dot(d[1:], ax)), float(d[0])) + math.pi) % (2 * math.pi) - math.pi
            if W is not None:
                axw = q_rot(Q[ic], ax); vel[name] = float(np.dot(W[ic] - (W[ip] if ip is not None else 0), axw))
        return (out, vel) if W is not None else out

    def encoders(self):
        """what each servo's own encoder reads (rad): its output shaft = setpoint - torque / servo stiffness. Gear play and the bracket's
        flex come AFTER the shaft, so an encoder cannot see them (as real_sync assumes); real=False: the joint itself"""
        if not self.real or self.sp is None: return self.angles()
        # 12 Nov: the shaft = the joint's ACTUAL angle + what bends after the shaft (bracket spring tau/kser + gear play taken up the
        # way the load pushes) - equal to the old 'setpoint - tau/kp' while the servo keeps up, but RIGHT when it is at its torque
        # limit and falls behind (wall: the old formula reported ~target while M1 / M2 twisted 34-85 mm off; the real ST3215's
        # magnetic encoder reads the output shaft, lag included). ENC_MODEL=setpoint: the old formula
        if os.environ.get('ENC_MODEL', 'shaft') == 'setpoint' or getattr(self, 'qa_last', None) is None:
            return {j[0]: float(self.sp[i] - self.tau[j[0]] / self.kp) for i, j in enumerate(self.j)}
        tau = np.array([self.tau[n] for n in self.names]); ks = getattr(self, 'kser_v', None)
        aft = (np.where(ks > 0, tau / np.where(ks > 0, ks, 1.0), 0.0) if ks is not None else 0.0) + self.bl * np.sign(tau)
        return {n: float(self.qa_last[i] + aft[i]) for i, n in enumerate(self.names)}

    def apply(self, forces=None, torques=None, QW=None):
        """one physics step: torques from the current poses/velocities (+ optional extra body forces / torques (n, 3)); the servo's own
        setpoint / torque cap update every ctrl_dt (5 ms, as phys_world). QW = (orientations, angular velocities) already read this step"""
        if QW is None: _, Q = self.rb.get_world_poses(); _, W = self.rb.get_velocities(); Q = Q.numpy(); W = W.numpy()
        else: Q, W = QW
        qa, qda, axw_ = self._angles_v(Q, W); T = np.zeros((self.n, 3), np.float32); names = self.names
        self.qa_last = qa
        tg = np.array([self.target[n] for n in names])
        if not self.real:
            sp = tg; lim = np.full(len(names), self.cap)
        else:
            if self.sp is None: self.sp = qa.copy()                                   # power-on: the servo holds where it is
            if self.k % self.every == 0:
                sag_, slew, limit = self.st
                tau_prev = np.array([self.tau[n] for n in names]); ng = int(self.groups.max()) + 1
                sg = sag_(np.full(ng, self.volt), np.bincount(self.groups, np.abs(tau_prev), ng)); self.sag = sg[self.groups]
                w0 = np.minimum(self.w0 * self.sag, self.vmax); e = tg - self.sp; e = np.where(np.abs(e) < self.deadband, 0.0, e)
                slew(self.sp, self.spv, e, w0, self.amax, self.ctrl_dt)
                self.lim = limit(self.fr0, tau_prev, qda, w0, self.sag)
            sp = self.sp; lim = self.lim
        self.k += 1
        e = sp - qa; e = np.sign(e) * np.maximum(np.abs(e) - self.bl, 0.0)               # gear play: no push until it is taken up
        tau = np.clip(self.kp_eff * e - self.kv * qda * (np.abs(sp - qa) > self.bl), -lim, lim)
        self.tau = dict(zip(names, tau.tolist())); pk = np.maximum(np.array([self.peak[n] for n in names]), np.abs(tau)); self.peak = dict(zip(names, pk.tolist()))
        tw = tau[:, None] * axw_ * self.sign
        np.add.at(T, self.IC, tw); np.add.at(T, self.IP[self.HASP], -tw[self.HASP])
        F = np.zeros((self.n, 3), np.float32) if forces is None else np.asarray(forces, np.float32)
        if torques is not None: T = T + np.asarray(torques, np.float32)
        self.rb.apply_forces_and_torques_at_pos(forces=F, torques=T)
        return dict(zip(names, qa.tolist()))


class Magnets:
    """the connector magnets (8 per connector, N/S alternating) between modules, with tetro_env2.connector_pull (ONE copy, the MuJoCo
    sim's law, MAG_PER_CONNECTOR_N). conns = [dict(module, body (index into the RigidPrim), kind 'end'|'side', mags (8,3) body frame,
    z (3,) the face's outward normal in the body frame, seat (3,) body frame, tip (3,) body frame - ends only)]; com = (n,3) body-frame
    centres of mass. As phys_world._magnets: every END pulls on every other module's connector within reach (an end pair once)."""

    def __init__(self, conns, com, modules_order):
        from tetro_env2 import connector_pull, MAG_CUT
        self.pull, self.reach = connector_pull, MAG_CUT + 0.03
        self.c, self.com, self.order = conns, np.asarray(com, float), list(modules_order)
        self.last = {}                                                            # (end, connector) -> total pull (N), for the logs

    def forces(self, P, Q):
        """world poses (n,3)/(n,4 wxyz) -> (F, T) per body (n,3): forces at the centres of mass + torques about them"""
        n = len(P); F = np.zeros((n, 3)); T = np.zeros((n, 3)); self.last = {}
        W = lambda c, v: (c['P'] + q_rot(c['Q'], v)) if c['body'] is None else P[c['body']] + q_rot(Q[c['body']], v)   # body None = fixed (floor)
        # 12 Nov: batched (a Python q_rot per connector and per magnet every step was ~1.4 ms of a ~7 ms step)
        if not hasattr(self, '_cb'):
            self._ends = [c for c in self.c if c['kind'] == 'end']
            self._cb = np.array([-1 if c['body'] is None else c['body'] for c in self.c]); self._eb = np.array([-1 if E['body'] is None else E['body'] for E in self._ends])
            self._cP = np.array([c['P'] if c['body'] is None else np.zeros(3) for c in self.c], float)
            self._cQ = np.array([c['Q'] if c['body'] is None else np.array([1.0, 0, 0, 0]) for c in self.c], float)
            self._ei = np.array([self.c.index(E) for E in self._ends]); self._seat = np.array([c['seat'] for c in self.c], float)
            self._tip = np.array([E['tip'] for E in self._ends], float)
        Qc = np.where(self._cb[:, None] >= 0, Q[np.maximum(self._cb, 0)], self._cQ); Pc = np.where(self._cb[:, None] >= 0, P[np.maximum(self._cb, 0)], self._cP)
        self._Qc, self._Pc = Qc, Pc
        ends = self._ends; tips = Pc[self._ei] + qv_rot(Qc[self._ei], self._tip); seats = Pc + qv_rot(Qc, self._seat)
        W8 = lambda ic, V: Pc[ic] + qv_rot(np.repeat(Qc[ic][None], len(V), 0), np.asarray(V, float))   # many points of connector ic
        near = ((tips[:, None, :] - seats[None, :, :]) ** 2).sum(2) <= self.reach ** 2     # only pairs within reach are worked out
        for ie, ir in zip(*np.nonzero(near)):
            E, R = ends[ie], self.c[ir]
            if True:
                if R['module'] == E['module']: continue
                if R['kind'] == 'end' and self.order.index(R['module']) < self.order.index(E['module']): continue   # an end pair once
                Bm = W8(self._ei[ie], E['mags']); Pm = W8(ir, R['mags'])
                Fv, j = self.pull(Bm, Pm, q_rot(R['Q'] if R['body'] is None else Q[R['body']], R['z']))
                b = E['body']; c = W(E, self.com[b]); F[b] += Fv.sum(0); T[b] += np.cross(Bm - c, Fv).sum(0)
                if R['body'] is not None:                                         # a fixed connector (floor) takes the reaction itself
                    rb = R['body']; rc = W(R, self.com[rb]); F[rb] -= Fv.sum(0); T[rb] -= np.cross(Pm[j] - rc, Fv).sum(0)
                self.last[(E['name'], R['name'])] = float(np.linalg.norm(Fv.sum(0)))
        return F, T
