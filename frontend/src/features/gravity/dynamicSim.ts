/**
 * DynamicSim — the GENERAL articulated-physics engine for the model graph.
 *
 * Goal: ONE sim that handles vehicles, dogs, humanoids, transformers, chains,
 * organisms and shape-shifters — anything expressible as bodies + joints —
 * with real gravity, collision and friction, for ANY topology including
 * closed loops and multi-parent bodies (Jolt is maximal-coordinate: every
 * body is independently free, a joint is just a constraint — no tree
 * requirement anywhere in this file).
 *
 *  • RIGID connectivity (fixed locks + rigid revolutes) FUSES bodies into
 *    ONE compound rigid body per cluster (union-find, same algorithm the
 *    original Rapier version used) — a single mass, single inertia tensor,
 *    single Jolt body. A chain of many individually-constrained bodies with
 *    ad-hoc per-body masses is NOT equivalent to true rigid fusion and was
 *    numerically weak enough to let parts sink through the ground under
 *    gravity — this is why clustering is not optional here.
 *  • The passive articulation BETWEEN clusters (free joints) is a real
 *    Hinge/SliderConstraint with NO motor — swings freely.
 *  • MOTOR joints (spinnable end-locks) get a Hinge/SliderConstraint with a
 *    velocity motor; idle = target 0 (holds still via the motor + Jolt's own
 *    sleep system).
 *  • Clusters never collide with EACH OTHER — only the ground is real contact.
 *    (Used to selectively exclude only "designed to touch" pairs via a
 *    rest-pose AABB check, but that check approximates any non-primitive
 *    mesh body as a fixed-size box and misses real overlaps in a folded/
 *    coiled pose, which made the solver fight an unresolvable
 *    interpenetration every frame — visible as violent shaking and parts
 *    punching through the floor. The joint graph already defines the
 *    model's shape, so cluster-vs-cluster contact isn't load-bearing here.)
 *    Bodies WITHIN the same cluster never need exclusion either: they're one
 *    compound shape on one body, which can't self-collide.
 *  • Wheels (motor end-locks) get a true cylinder collider aligned to the
 *    axle (see dynamicSimTopology.ts's computeWheelGeometry) so they roll.
 *  • Mass: each body contributes its explicit inertial.mass, or a density
 *    fallback (400 kg/m^3 * estimated volume — NOT a flat placeholder mass,
 *    which was the other half of the sinking-through-the-ground bug: a
 *    large body with a tiny fixed mass has too little inertia to resist
 *    gravity/contact forces correctly).
 *
 * Non-destructive: reads back body world poses each frame; the doc is only
 * transiently updated.
 *
 * KNOWN GAP: real bumpy-terrain collision (FloorTri) still falls back to a
 * flat ground plane.
 */
import * as THREE from 'three';
import { createJoltWorld, JOLT_LAYER_NON_MOVING, JOLT_LAYER_MOVING, type JoltWorld } from '@/viewport/joltLoader';
import { makeJoltShapeSettings } from '@/viewport/joltShapes';
import { jointWorldGeom } from '@/viewport/joltJoints';
import { jointMode, computeWheelGeometry } from './dynamicSimTopology';
import type { Document } from '@/core/model/index';
import type { FK, DriveOf } from './rigidDrop';

export type { JointMode } from './dynamicSimTopology';
export { jointMode };

/** The floor as the EXACT same triangles as the visible mesh (kept for API compat; see KNOWN GAP above). */
export interface FloorTri { vertices: Float32Array; indices: Uint32Array; y: number }

const GRAVITY = 9.81;
const FIXED_DT_60 = 1 / 60;
// Was 8: when render fps is already low (heavy scene), a slow frame's larger dt demanded up to
// 8 sequential Jolt.Step() calls to "catch up" — which made that frame even slower, feeding a
// spiral-of-death (bigger dt next frame -> more substeps -> slower still). Capping lower means
// physics falls into visible slow-motion under sustained load instead of compounding the frame
// time that caused the slowdown in the first place — worse fidelity, much better fps recovery.
const MAX_SUBSTEPS = 3;
const FALLBACK_DENSITY = 400; // kg/m^3, used only when a body has no explicit inertial.mass

const matOf = (t: any) => new THREE.Matrix4().compose(
  new THREE.Vector3(...(t?.position ?? [0, 0, 0])),
  new THREE.Quaternion(...(t?.quaternion ?? [0, 0, 0, 1])),
  new THREE.Vector3(1, 1, 1),
);

function diagEnabled(): boolean {
  try { return localStorage.getItem('robo_physics_diag') === '1'; } catch { return false; }
}

/** Rough volume estimate for a body's declared geometry (density * volume -> mass fallback).
 *  `hullPoints`, when given (real mesh assets), overrides the MESH default below with the
 *  body's actual local-space bounding-box volume — the previous flat "0.8m cube" placeholder
 *  was wrong by 3-4 orders of magnitude for this app's real modules (typically 5-20cm), and
 *  mixing masses that far off between clusters in the same jointed chain is exactly what makes
 *  a rigid-body solver shake violently and never settle (verified against a live user report). */
function volumeEstimate(body: any, hullPoints?: Float32Array | null): number {
  const g = body.visual?.geometry ?? {};
  const s = body.transform?.scale ?? [1, 1, 1];
  const sx = Math.abs(s[0]), sy = Math.abs(s[1]), sz = Math.abs(s[2]);
  switch (g.type) {
    case 'sphere': { const r = (g.radius ?? 0.5) * Math.max(sx, sy, sz); return (4 / 3) * Math.PI * r ** 3; }
    case 'box': { const sz0 = g.size ?? [1, 1, 1]; return Math.abs(sz0[0] * s[0]) * Math.abs(sz0[1] * s[1]) * Math.abs(sz0[2] * s[2]); }
    case 'cylinder': case 'capsule': case 'cone': { const r = (g.radius ?? 0.5) * sx, l = (g.length ?? 1) * sz; return Math.PI * r * r * l; }
    default: {
      if (hullPoints && hullPoints.length >= 12) {
        let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (let i = 0; i < hullPoints.length; i += 3) {
          const x = hullPoints[i] * sx, y = hullPoints[i + 1] * sy, z = hullPoints[i + 2] * sz;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        }
        // A tight AABB overstates a convex/irregular part's true solid volume — a real mesh
        // isn't a filled box — so scale down; still vastly more accurate than a fixed 0.8m guess.
        return Math.max(1e-6, (maxX - minX) * (maxY - minY) * (maxZ - minZ) * 0.5);
      }
      // No hull data available (e.g. a placeholder body with no asset yet) — fall back to a
      // size in line with this app's actual modules (~8cm cube) rather than the old 0.8m guess.
      return 0.08 * 0.08 * 0.08 * sx * sy * sz;
    }
  }
}
function bodyMass(body: any, hullPoints?: Float32Array | null): number {
  const explicit = body?.inertial?.mass;
  if (typeof explicit === 'number' && explicit > 0) return explicit;
  return FALLBACK_DENSITY * volumeEstimate(body, hullPoints);
}

interface MotorEntry { jointId: string; constraint: any; last: number }
interface InitialPose { id: string; pos: THREE.Vector3; quat: THREE.Quaternion } // id = CLUSTER key (first body id)

export class DynamicSim {
  private world: JoltWorld | null = null;
  /** clusterKey -> Jolt Body (one rigid body per fused cluster). */
  private _clusterBody = new Map<string, any>();
  /** model bodyId -> { clusterKey, localPos, localQuat } for reading poses back out per body. */
  private _bodyInCluster = new Map<string, { clusterKey: string; localPos: THREE.Vector3; localQuat: THREE.Quaternion }>();
  private _motorJoints: MotorEntry[] = [];
  /** Every cross-cluster joint's two connection points, in each cluster's OWN local
   *  frame (captured at build time, when each cluster starts unrotated) — lets the
   *  diagnostic below measure how far apart the joint's two ends actually are in
   *  world space each frame. A healthy constraint holds this near 0; a large or
   *  growing gap means that specific joint's pivot/axis geometry is degenerate and
   *  Jolt is fighting an unsatisfiable constraint every step. */
  private _jointDiag: { jointId: string; bodyA: any; bodyB: any; localA: THREE.Vector3; localB: THREE.Vector3 }[] = [];
  private _initial: InitialPose[] = [];
  private _instabilityCount = 0;
  private _frozen = false;
  private _groundY = 0;
  private _wheelClusters = new Set<string>();
  /** Peak speed seen per cluster SINCE the last once-a-second report (not just the
   *  instantaneous value at report time) — a 1Hz snapshot can completely miss a fast
   *  oscillation between reports and look deceptively calm while the render is visibly
   *  wobbling every physics step. */
  private _peakSpeed = new Map<string, number>();
  private _diagAt = 0;
  private _acc = 0;
  private _diagLog = false;

  static async create(
    doc: Document, fk: FK, groundY: number,
    meshVerts?: (id: string) => Float32Array | null,
    _floorTri?: FloorTri | null,
  ): Promise<DynamicSim | null> {
    const bodies = Object.values(doc.bodies);
    if (!bodies.length) return null;

    const world = await createJoltWorld(GRAVITY);
    const { Jolt, bodyInterface, physicsSystem } = world;

    const worldMat = (id: string): THREE.Matrix4 => {
      const w = fk?.get(id);
      return w ? matOf({ position: w.position, quaternion: w.quaternion }) : matOf(doc.bodies[id]?.transform);
    };

    // Ground: flat (real bumpy-terrain collision is a known unimplemented gap).
    const groundShape = new Jolt.BoxShapeSettings(new Jolt.Vec3(500, 1, 500), 0.02).Create().Get();
    const groundSettings = new Jolt.BodyCreationSettings(groundShape, new Jolt.RVec3(0, groundY - 1, 0), Jolt.Quat.prototype.sIdentity(), Jolt.EMotionType_Static, JOLT_LAYER_NON_MOVING);
    // set_mFriction, not `=` — this was the ONE spot in this file that never got converted
    // during the earlier struct-property sweep (mFriction is a primitive number, which
    // seemed safe, but the ground's own friction directly combines with the wheel's when
    // Jolt computes contact friction — if this silently never took effect, the wheels would
    // grip nothing regardless of how high their OWN friction was set, exactly matching
    // "wheel visibly spins, chassis never moves" even after that fix. Better safe than
    // silently-broken, given everything else `=` touched in this file turned out unreliable.
    groundSettings.set_mFriction(1.2); // real grip, not Jolt's low ~0.2 default
    const ground = bodyInterface.CreateBody(groundSettings);
    bodyInterface.AddBody(ground.GetID(), Jolt.EActivation_DontActivate);
    // NOTE on WASM memory: tried explicitly freeing shape/settings objects here
    // and throughout this function once CreateBody/Create() had "consumed" them,
    // on the theory their JS wrapper is redundant once whatever they were passed
    // into holds its own ref. That theory was wrong for this binding — freeing a
    // shape/settings object even after its apparent last use corrupted state that
    // Jolt.Step() reads later (verified against the real WASM build: 3 separate
    // crashes moving the free later each time still weren't late enough). Without
    // authoritative docs on this binding's ownership model, guessing at manual
    // frees here is riskier than the slow leak — reverted. See dynamicSimLeakStress.test.ts.

    const wheelCyl = computeWheelGeometry(doc, worldMat, meshVerts);

    // ── 1. Cluster bodies by RIGID connectivity (union-find) ──────────────
    const parentOf = new Map<string, string>();
    for (const b of bodies) parentOf.set(b.id, b.id);
    const find = (x: string): string => { let r = x; while (parentOf.get(r) !== r) r = parentOf.get(r)!; while (parentOf.get(x) !== r) { const n = parentOf.get(x)!; parentOf.set(x, r); x = n; } return r; };
    const union = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra !== rb) parentOf.set(ra, rb); };
    for (const j of Object.values(doc.joints) as any[]) {
      if (j.state?.disabled || !j.parentBodyId || !j.childBodyId) continue;
      if (!doc.bodies[j.parentBodyId] || !doc.bodies[j.childBodyId]) continue;
      if (jointMode(doc, j) === 'rigid') union(j.parentBodyId, j.childBodyId);
    }
    const clusterKey = new Map<string, string>(); // bodyId -> cluster root id
    const clusterBodies = new Map<string, string[]>(); // cluster root id -> member body ids
    for (const b of bodies) {
      const root = find(b.id);
      clusterKey.set(b.id, root);
      if (!clusterBodies.has(root)) clusterBodies.set(root, []);
      clusterBodies.get(root)!.push(b.id);
    }

    // ── 2. Clusters never collide with EACH OTHER, only the ground ─────────
    // Bodies fused into the same compound never need exclusion (one Jolt body
    // can't self-collide). Cross-cluster collision USED to be selectively
    // excluded via a rest-pose AABB overlap check ("designed to touch"), but
    // that check approximates every non-primitive (mesh) body as a fixed-size
    // box — for a folded/coiled pose where non-adjacent modules genuinely
    // touch, it misses real overlaps, and the solver fights an unresolvable
    // interpenetration every frame (violent shaking, parts pushed through the
    // floor). The model's joints already define its shape; body-vs-body
    // contact between clusters isn't load-bearing here the way it would be in
    // a general physics sandbox, so the simplest correct fix is to just not
    // simulate it at all — only the ground is a real obstacle.
    const clusterKeys = [...clusterBodies.keys()];
    const clusterIdx = new Map<string, number>(clusterKeys.map((k, i) => [k, i]));
    const groupFilter = new Jolt.GroupFilterTable(clusterKeys.length);
    for (let i = 0; i < clusterKeys.length; i++) {
      for (let k = i + 1; k < clusterKeys.length; k++) groupFilter.DisableCollision(i, k);
    }

    const sim = new DynamicSim();
    sim.world = world;
    sim._groundY = groundY;

    // ── 3. One compound rigid body per cluster ──────────────────────────
    for (const [root, ids] of clusterBodies) {
      const superRigid = ids.some((id) => (doc.bodies[id] as any)?.meta?.superRigid);
      const origin = new THREE.Vector3();
      for (const id of ids) origin.add(new THREE.Vector3().setFromMatrixPosition(worldMat(id)));
      origin.multiplyScalar(1 / ids.length);

      const compound = new Jolt.StaticCompoundShapeSettings();
      let totalMass = 0;
      let anyShape = false;
      let hasWheel = false;
      for (const id of ids) {
        const body = doc.bodies[id];
        const M = worldMat(id);
        const bodyPos = new THREE.Vector3().setFromMatrixPosition(M);
        const bodyQuat = new THREE.Quaternion().setFromRotationMatrix(M);
        const rel = bodyPos.clone().sub(origin);

        const wc = wheelCyl.get(id);
        const hp = meshVerts?.(id) ?? null;
        let settings: any;
        if (wc) {
          const rotQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), wc.axisW);
          const cylSettings = new Jolt.CylinderShapeSettings(wc.halfLen, wc.radius, 0.02);
          settings = new Jolt.RotatedTranslatedShapeSettings(
            new Jolt.Vec3(wc.offset.x, wc.offset.y, wc.offset.z), new Jolt.Quat(rotQ.x, rotQ.y, rotQ.z, rotQ.w), cylSettings,
          );
          hasWheel = true;
          // Cross-check: the wheel shape's world position (rel + wc.offset, both relative to
          // this cluster's origin) vs wherever the joint pivot for this same body ends up
          // (see the BUILD joint log above) — if they're far apart, the wheel is spinning
          // around a hinge that isn't where its own axle/shape actually is.
          const wheelWorld = rel.clone().add(wc.offset);
          // eslint-disable-next-line no-console
          console.info(`[physics] BUILD wheel body=${id} cluster=${root} wheelShapeLocalToCluster=(${wheelWorld.x.toFixed(3)},${wheelWorld.y.toFixed(3)},${wheelWorld.z.toFixed(3)}) radius=${wc.radius.toFixed(3)}`);
        } else {
          settings = makeJoltShapeSettings(Jolt, body, { hullPoints: hp });
        }
        if (!settings) continue;
        compound.AddShape(new Jolt.Vec3(rel.x, rel.y, rel.z), new Jolt.Quat(bodyQuat.x, bodyQuat.y, bodyQuat.z, bodyQuat.w), settings, 0);
        totalMass += bodyMass(body, hp);
        anyShape = true;
        sim._bodyInCluster.set(id, { clusterKey: root, localPos: rel, localQuat: bodyQuat });
      }
      if (!anyShape) continue;

      const compoundResult = compound.Create();
      if (!compoundResult.IsValid()) continue;

      const motionType = superRigid ? Jolt.EMotionType_Static : Jolt.EMotionType_Dynamic;
      const layer = superRigid ? JOLT_LAYER_NON_MOVING : JOLT_LAYER_MOVING;
      const bs = new Jolt.BodyCreationSettings(compoundResult.Get(), new Jolt.RVec3(origin.x, origin.y, origin.z), Jolt.Quat.prototype.sIdentity(), motionType, layer);
      // Friction is a per-BODY scalar in this binding (no per-sub-shape
      // material support exposed) — Jolt's own default (~0.2 combined with
      // the ground) is far too low for a driven wheel to generate any
      // traction, which is exactly why commanding CW/CCW spin visibly
      // rotated the wheel but never moved the chassis: it was just
      // spinning in place, near-frictionless, like a tire on ice. A wheel
      // cluster (any member matched computeWheelGeometry) gets real grip;
      // a body-only cluster gets a lower "resting chassis can slide a bit"
      // friction so the wheels can still push it, not fight it.
      // set_X(...), not direct property assignment — see the joint-constraint fix above for
      // why: struct-valued fields silently no-op on plain `=` in this binding. mFriction/
      // mLinearDamping/mAngularDamping are primitive numbers so `=` was fine for those, but
      // mMassPropertiesOverride and mCollisionGroup are structs — both were likely silently
      // ignored too, meaning explicit body masses and the "clusters don't collide with each
      // other" fix may never have actually taken effect either.
      // 2.5 (roughly "sticky rubber") was picked to guarantee SOME traction back when
      // wheels had zero grip at all — but combined with a stiff velocity motor correcting
      // hard every substep, that much grip produces classic stick-slip: the motor "catches"
      // against the ground, releases, catches harder, and so on, injecting a little more
      // energy each cycle instead of settling — confirmed live via a peak-speed diagnostic
      // that kept climbing (0.1 -> 0.25 m/s) well past what pure rolling at this wheel's
      // radius/speed could produce. 1.0 (real rubber-on-concrete range) still grips more than
      // enough to drive a robot this light, without the runaway stick-slip.
      bs.set_mFriction(hasWheel ? 1.0 : 0.3);
      if (hasWheel) sim._wheelClusters.add(root);
      if (!superRigid) {
        const mp = new Jolt.MassProperties();
        mp.set_mMass(Math.max(0.01, totalMass));
        bs.set_mOverrideMassProperties(Jolt.EOverrideMassProperties_CalculateInertia);
        bs.set_mMassPropertiesOverride(mp);
        // Bumped well above Jolt's typical defaults: a multi-cluster chain linked
        // by hard hinge/slider constraints (no spring softness) can resonate —
        // each cluster's small correction pushes its neighbor, which pushes back,
        // building up rather than settling. Heavier damping burns that energy out
        // fast instead of letting it ring. Trades a little "floatier" motion for
        // actually coming to rest instead of shaking indefinitely.
        // Nudged up again after fixing the hinge-axis world-rotation bug (see
        // joltJoints.ts's jointWorldGeom): with the axis actually correct now, the
        // remaining residual jitter is genuine numerical settling, which more damping
        // directly helps — before that fix, no amount of damping could fully compensate
        // for a constraint fighting a permanently wrong axis.
        bs.set_mLinearDamping(0.25);
        bs.set_mAngularDamping(0.5);
      }
      bs.set_mCollisionGroup(new Jolt.CollisionGroup(groupFilter, 0, clusterIdx.get(root)!));
      const rb = bodyInterface.CreateBody(bs);
      bodyInterface.AddBody(rb.GetID(), superRigid ? Jolt.EActivation_DontActivate : Jolt.EActivation_Activate);
      sim._clusterBody.set(root, rb);
      sim._initial.push({ id: root, pos: origin.clone(), quat: new THREE.Quaternion() });
    }

    // ── 4. Cross-cluster joints (free / motor) ──────────────────────────
    const clusterOrigin = new Map<string, THREE.Vector3>(sim._initial.map((e) => [e.id, e.pos]));
    for (const j of Object.values(doc.joints) as any[]) {
      if (j.state?.disabled || !j.parentBodyId || !j.childBodyId) continue;
      const mode = jointMode(doc, j);
      if (mode === 'rigid') continue; // fused already
      const ka = clusterKey.get(j.parentBodyId), kb = clusterKey.get(j.childBodyId);
      if (ka === undefined || kb === undefined || ka === kb) continue;
      const bodyA = sim._clusterBody.get(ka), bodyB = sim._clusterBody.get(kb);
      if (!bodyA || !bodyB) continue;

      const parentWorldMat = worldMat(j.parentBodyId);
      const { pivot, axis } = jointWorldGeom(j, parentWorldMat);
      // Both clusters start this build unrotated, so pivot-minus-origin IS each
      // cluster's local-frame offset to this joint's connection point (see _jointDiag).
      const originA = clusterOrigin.get(ka), originB = clusterOrigin.get(kb);
      const localA = originA ? pivot.clone().sub(originA) : new THREE.Vector3();
      const localB = originB ? pivot.clone().sub(originB) : new THREE.Vector3();
      if (originA && originB) {
        sim._jointDiag.push({ jointId: j.id, bodyA, bodyB, localA, localB });
      }

      if (j.type === 'prismatic') {
        const ss = new Jolt.SliderConstraintSettings();
        // LocalToBodyCOM, not WorldSpace: with WorldSpace, reading the built constraint's
        // own GetConstraintToBody1/2Matrix() showed both anchors converted using the same
        // body's transform (should differ per-body) — switching to LocalToBodyCOM and
        // supplying the already-correct local anchors (localA/localB) directly avoids
        // Jolt needing to do that world->local conversion internally at all. Verified
        // correct via HingeConstraint's own GetLocalSpacePoint1/2 (see below) AND by
        // reading live simulated body positions back out — both now agree with zero gap.
        ss.set_mSpace(Jolt.EConstraintSpace_LocalToBodyCOM);
        ss.set_mPoint1(new Jolt.RVec3(localA.x, localA.y, localA.z));
        ss.set_mPoint2(new Jolt.RVec3(localB.x, localB.y, localB.z));
        ss.set_mSliderAxis1(new Jolt.Vec3(axis.x, axis.y, axis.z));
        ss.set_mSliderAxis2(new Jolt.Vec3(axis.x, axis.y, axis.z));
        // A velocity motor's MotorSettings defaults to UNLIMITED force/torque in this
        // binding (mMinForceLimit/mMaxForceLimit = -FLT_MAX/FLT_MAX) — meaning Jolt will
        // apply however much force it takes to hit the exact target velocity every single
        // substep. Against real ground friction (this sim intentionally grips wheels hard,
        // friction=2.5) that's an unbounded fight, re-injecting energy into the whole
        // connected chain every frame. A real motor has finite torque; capping it here
        // lets it behave like one (and lets it stall/slip realistically under load).
        // get_mMotorSettings() may hand back a detached copy (same struct-by-value risk as
        // above) — build a fresh MotorSettings and assign it back with set_, don't mutate
        // in place.
        // Dropped from 20N: combined with high wheel friction this was strong enough to
        // "catch and kick" every substep instead of smoothly driving — see the hinge
        // motor's identical note below (confirmed live via a growing-peak-speed diagnostic).
        const slMotor = new Jolt.MotorSettings();
        slMotor.set_mMaxForceLimit(2);
        slMotor.set_mMinForceLimit(-2);
        ss.set_mMotorSettings(slMotor);
        const constraint = Jolt.castObject(ss.Create(bodyA, bodyB), Jolt.SliderConstraint);
        physicsSystem.AddConstraint(constraint);
        if (mode === 'motor') {
          constraint.SetMotorState(Jolt.EMotorState_Velocity);
          constraint.SetTargetVelocity(0);
          sim._motorJoints.push({ jointId: j.id, constraint, last: 0 });
        }
        continue;
      }

      const hs = new Jolt.HingeConstraintSettings();
      // See the slider case above — LocalToBodyCOM with pre-computed local anchors,
      // verified correct via GetLocalSpacePoint1/2 and live simulated body positions.
      hs.set_mSpace(Jolt.EConstraintSpace_LocalToBodyCOM);
      hs.set_mPoint1(new Jolt.RVec3(localA.x, localA.y, localA.z));
      hs.set_mPoint2(new Jolt.RVec3(localB.x, localB.y, localB.z));
      hs.set_mHingeAxis1(new Jolt.Vec3(axis.x, axis.y, axis.z));
      hs.set_mHingeAxis2(new Jolt.Vec3(axis.x, axis.y, axis.z));
      // Dropped from 5 N·m: verified live via a peak-speed diagnostic that a wheel's linear
      // speed kept CLIMBING every report (0.1 -> 0.25 m/s) well past what pure rolling at
      // this wheel's radius/commanded rad/s could produce — classic stick-slip, a stiff
      // motor correcting hard each substep against high friction, injecting a little extra
      // energy every cycle instead of settling. Still generous for a robot this light
      // (Force = Torque/radius, e.g. 1 N·m / 0.03m radius = ~33N, far more than needed to
      // overcome this model's own ~10N weight), just no longer strong enough to "fight" the
      // ground into a growing oscillation.
      const hMotor = new Jolt.MotorSettings();
      hMotor.set_mMaxTorqueLimit(1);
      hMotor.set_mMinTorqueLimit(-1);
      hs.set_mMotorSettings(hMotor);
      const constraint = Jolt.castObject(hs.Create(bodyA, bodyB), Jolt.HingeConstraint);
      physicsSystem.AddConstraint(constraint);
      if (mode === 'motor') {
        constraint.SetMotorState(Jolt.EMotorState_Velocity);
        constraint.SetTargetAngularVelocity(0);
        sim._motorJoints.push({ jointId: j.id, constraint, last: 0 });
      }
      // 'free': motor state stays Off (default) — passive articulation.
    }

    // Always log a one-time summary at creation — this is the info needed to diagnose
    // "wheel spins but chassis doesn't move" without requiring a localStorage flag.
    {
      const wheelClusters = [...clusterBodies.entries()].filter(([, ids]) => ids.some((id) => wheelCyl.has(id))).length;
      // eslint-disable-next-line no-console
      console.info(
        `[physics] DynamicSim built: bodies=${bodies.length} clusters=${clusterBodies.size} ` +
        `wheelClusters=${wheelClusters} motorJoints=${sim._motorJoints.length} groundY=${groundY}`,
      );
      if (sim._motorJoints.length === 0) {
        console.warn('[physics] no motor joints found — spinning a wheel will do nothing. Check that the joint mode resolves to "motor" (spinnable end-lock), not "free"/"rigid".');
      }
      if (wheelClusters === 0 && sim._motorJoints.length > 0) {
        console.warn('[physics] motor joints exist but no cluster got a wheel cylinder collider — computeWheelGeometry found nothing to grip with, so the "wheel" is spinning on its normal body shape, which may not roll.');
      }
    }
    // Opt-in only (localStorage 'robo_physics_diag'='1') — this was forced on unconditionally,
    // flooding the console every second (per-cluster + per-joint work, plus the console.info
    // calls themselves) even in normal use, which is real per-frame/per-second overhead on top
    // of whatever's already slow.
    sim._diagLog = diagEnabled();

    return sim;
  }

  /** Advance; drive each motor joint to driveOf(jointId) rad/s. Returns each body's new world pose
   *  (every model body moves with its cluster's rigid transform, per _bodyInCluster). */
  step(dt: number, driveOf?: DriveOf): Map<string, { position: number[]; quaternion: number[] }> {
    if (this._frozen) return this._readPoses();

    for (const m of this._motorJoints) {
      const v = driveOf ? driveOf(m.jointId) : 0;
      if (v !== m.last) {
        m.constraint.SetTargetAngularVelocity?.(v);
        m.constraint.SetTargetVelocity?.(v);
        m.last = v;
      }
    }

    let steps = 0;
    this._acc += Math.min(dt, FIXED_DT_60 * MAX_SUBSTEPS);
    while (this._acc >= FIXED_DT_60 && steps < MAX_SUBSTEPS) { this.world!.jolt.Step(FIXED_DT_60, 1); this._acc -= FIXED_DT_60; steps++; }

    // Track PEAK speed every single frame (not just once a second) — see _peakSpeed's
    // comment for why: a 1Hz diagnostic snapshot can completely miss fast oscillation.
    if (this._diagLog || diagEnabled()) {
      for (const [key, rb] of this._clusterBody) {
        const v = rb.GetLinearVelocity?.();
        if (!v) continue;
        const speed = Math.hypot(v.GetX(), v.GetY(), v.GetZ());
        if (speed > (this._peakSpeed.get(key) ?? 0)) this._peakSpeed.set(key, speed);
      }
    }
    if (steps === MAX_SUBSTEPS) this._acc = 0;

    // Safety net: if a cluster ever goes unstable, reset once, then freeze on
    // a second occurrence rather than spam/compute garbage forever.
    let finite = true;
    for (const rb of this._clusterBody.values()) {
      const p = rb.GetPosition();
      if (!Number.isFinite(p.GetX()) || !Number.isFinite(p.GetY()) || !Number.isFinite(p.GetZ())) { finite = false; break; }
    }
    if (!finite) {
      this._instabilityCount++;
      this._resetToInitial();
      if (this._instabilityCount > 1) {
        console.warn('[DynamicSim] simulation unstable again after reset — freezing physics for this session');
        this._frozen = true;
      } else {
        console.warn('[DynamicSim] simulation went unstable (NaN/Inf) — resetting to last stable pose');
      }
      return this._readPoses();
    }

    if (this._diagLog || diagEnabled()) {
      const now = performance.now();
      if (now - this._diagAt > 1000) {
        this._diagAt = now;
        const active = this._motorJoints.filter((m) => m.last !== 0).map((m) => `${m.jointId}=${m.last.toFixed(2)}rad/s`);
        // Report every cluster's speed so we can see whether ANYTHING is actually
        // translating, not just spinning in place — this is the direct answer to
        // "wheel visibly turns but chassis doesn't move".
        const clusterSpeeds: string[] = [];
        for (const [key, rb] of this._clusterBody) {
          const v = rb.GetLinearVelocity?.();
          const p = rb.GetPosition?.();
          if (!v || !p) continue;
          const speed = Math.hypot(v.GetX(), v.GetY(), v.GetZ());
          // Height above the flat ground plane — the direct check for "is this
          // cluster actually touching the floor, or spinning/hanging in the air".
          const heightAboveGround = p.GetY() - this._groundY;
          const tag = this._wheelClusters.has(key) ? '[WHEEL]' : '';
          if (speed > 0.001 || active.length) clusterSpeeds.push(`${tag}${key}:${speed.toFixed(3)}m/s@y=${heightAboveGround.toFixed(3)}`);
        }
        // eslint-disable-next-line no-console
        console.info(
          `[physics]${active.length ? ` SPIN: ${active.join(', ')}` : ' (idle)'}` +
          ` | clusterSpeed@heightAboveGround: ${clusterSpeeds.length ? clusterSpeeds.join(', ') : '(all at rest)'}`,
        );
        // PEAK speed since the last report — if this is much higher than the instantaneous
        // clusterSpeed line above, the chassis IS genuinely oscillating fast between reports
        // (real instability the 1Hz snapshot was missing); if it's about the same, the visible
        // wobble isn't coming from cluster linear velocity at all and the bug is elsewhere
        // (e.g. in how poses get applied to the renderer, not in the physics itself).
        const peaks: string[] = [];
        for (const [key, peak] of this._peakSpeed) {
          if (peak > 0.001) peaks.push(`${this._wheelClusters.has(key) ? '[WHEEL]' : ''}${key}:${peak.toFixed(3)}m/s`);
        }
        // eslint-disable-next-line no-console
        console.info(`[physics] PEAK speed since last report: ${peaks.length ? peaks.join(', ') : '(all at rest)'}`);
        this._peakSpeed.clear();
        // Joint-violation check: for each cross-cluster joint, how far apart are its
        // two connection points RIGHT NOW? A healthy hinge/slider holds this near 0.
        // A large or fast-growing number pinpoints exactly which joint's pivot/axis
        // geometry is degenerate and is the actual source of the shaking, instead of
        // guessing at collision/mass/motor settings one at a time.
        const violations: string[] = [];
        const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
        const qA = new THREE.Quaternion(), qB = new THREE.Quaternion();
        for (const jd of this._jointDiag) {
          // Extract every primitive IMMEDIATELY after each Jolt call, never holding a
          // returned wrapper object across another Jolt call — some WASM bindings reuse a
          // shared scratch buffer for struct-valued returns, so interleaving
          // GetPosition()/GetRotation() calls across two different bodies before reading
          // any of them back can silently read back the WRONG body's data.
          const paX = jd.bodyA.GetPosition().GetX(), paY = jd.bodyA.GetPosition().GetY(), paZ = jd.bodyA.GetPosition().GetZ();
          const raX = jd.bodyA.GetRotation().GetX(), raY = jd.bodyA.GetRotation().GetY(), raZ = jd.bodyA.GetRotation().GetZ(), raW = jd.bodyA.GetRotation().GetW();
          const pbX = jd.bodyB.GetPosition().GetX(), pbY = jd.bodyB.GetPosition().GetY(), pbZ = jd.bodyB.GetPosition().GetZ();
          const rbX = jd.bodyB.GetRotation().GetX(), rbY = jd.bodyB.GetRotation().GetY(), rbZ = jd.bodyB.GetRotation().GetZ(), rbW = jd.bodyB.GetRotation().GetW();
          qA.set(raX, raY, raZ, raW);
          qB.set(rbX, rbY, rbZ, rbW);
          tmpA.copy(jd.localA).applyQuaternion(qA).add(new THREE.Vector3(paX, paY, paZ));
          tmpB.copy(jd.localB).applyQuaternion(qB).add(new THREE.Vector3(pbX, pbY, pbZ));
          const gap = tmpA.distanceTo(tmpB);
          if (gap > 0.005) violations.push(`${jd.jointId}:${gap.toFixed(3)}m`);
        }
        if (violations.length) {
          // eslint-disable-next-line no-console
          console.warn(`[physics] JOINT GAP (should be ~0): ${violations.join(', ')}`);
        }
      }
    }

    return this._readPoses();
  }

  private _resetToInitial() {
    const Jolt = this.world!.Jolt;
    for (const init of this._initial) {
      const rb = this._clusterBody.get(init.id);
      if (!rb) continue;
      this.world!.bodyInterface.SetPositionAndRotation(
        rb.GetID(), new Jolt.RVec3(init.pos.x, init.pos.y, init.pos.z), new Jolt.Quat(init.quat.x, init.quat.y, init.quat.z, init.quat.w), Jolt.EActivation_Activate,
      );
      rb.SetLinearVelocity(new Jolt.Vec3(0, 0, 0));
      rb.SetAngularVelocity(new Jolt.Vec3(0, 0, 0));
    }
  }

  private _readPoses(): Map<string, { position: number[]; quaternion: number[] }> {
    const out = new Map<string, { position: number[]; quaternion: number[] }>();
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    for (const [bodyId, info] of this._bodyInCluster) {
      const rb = this._clusterBody.get(info.clusterKey);
      if (!rb) continue;
      // Extract every primitive IMMEDIATELY after each Jolt call, never holding a returned
      // wrapper object across another Jolt call on a DIFFERENT body — this loop runs every
      // frame across every cluster, and some WASM bindings reuse a shared scratch buffer for
      // struct-valued returns (verified live elsewhere in this file: interleaving
      // GetPosition()/GetRotation() calls across bodies before reading them back silently
      // reads the wrong body's data). This is the function that feeds the renderer every
      // frame, so this exact bug here would look like — and likely IS — the violent
      // shaking/parts-clipping-through-the-floor reported all along: each frame potentially
      // rendering one body's position paired with a different body's rotation, or a stale
      // value from whichever body's data last occupied the shared buffer.
      const cpx = rb.GetPosition().GetX(), cpy = rb.GetPosition().GetY(), cpz = rb.GetPosition().GetZ();
      const cqx = rb.GetRotation().GetX(), cqy = rb.GetRotation().GetY(), cqz = rb.GetRotation().GetZ(), cqw = rb.GetRotation().GetW();
      const clusterM = new THREE.Matrix4().compose(
        new THREE.Vector3(cpx, cpy, cpz),
        new THREE.Quaternion(cqx, cqy, cqz, cqw),
        new THREE.Vector3(1, 1, 1),
      );
      const localM = new THREE.Matrix4().compose(info.localPos, info.localQuat, new THREE.Vector3(1, 1, 1));
      clusterM.multiply(localM).decompose(p, q, s);
      out.set(bodyId, { position: [p.x, p.y, p.z], quaternion: [q.x, q.y, q.z, q.w] });
    }
    return out;
  }

  /**
   * Debug geometry — Jolt.js doesn't expose a JS-side debug-render buffer;
   * returns empty (an opt-in visualization aid loses fidelity, not a
   * functional break).
   */
  debugRender(): { vertices: Float32Array; colors: Float32Array } {
    return { vertices: new Float32Array(0), colors: new Float32Array(0) };
  }

  dispose() {
    try {
      for (const rb of this._clusterBody.values()) {
        this.world!.bodyInterface.RemoveBody(rb.GetID());
        this.world!.bodyInterface.DestroyBody(rb.GetID());
      }
      this.world?.dispose();
    } catch { /* freed */ }
    this.world = null;
  }
}
