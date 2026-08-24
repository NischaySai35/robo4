/**
 * PhysicsSim — wraps Jolt Physics (WASM) for a live, non-destructive gravity sim.
 *
 * Jolt is MAXIMAL-coordinate: every body is independently free; a joint is
 * just a constraint between two bodies. Unlike the MuJoCo/MJCF version this
 * replaces, there is no compiled "model" to rebuild — bodies and constraints
 * are created directly, once, and stepped forever. This also means the
 * app's joint graph doesn't need to be a tree: a body with two incoming
 * joints (multi-parent, loops) just gets two constraints. No silent-drop
 * workaround needed (see MIGRATION notes for why that was ever necessary).
 *
 * Joint motors: Jolt's hinge/slider constraints have a NATIVE motor
 * (SetMotorState Position/Velocity/Off + SetTargetAngle/SetTargetAngularVelocity)
 * — see joltJoints.ts. No actuator-array hack needed.
 *
 * spawnBox/removeBox: Jolt bodies are independent, so spawning a box is a
 * real CreateBody/AddBody call and removing one is a real RemoveBody/
 * DestroyBody call — no pre-declared pool needed (that was an MJCF-specific
 * workaround for a compiled model's fixed topology).
 */
import * as THREE from 'three';
import type { Document } from '@/core/model/index';
import { createJoltWorld, JOLT_LAYER_NON_MOVING, JOLT_LAYER_MOVING, type JoltWorld } from './joltLoader';
import { makeJoltShape } from './joltShapes';
import { createJoint, setHingeTargetAngle, setHingeTargetVelocity, type CreatedJoint } from './joltJoints';
import { restPoseExcludePairs } from '@/features/gravity/rigidGeomXml';
import { FIXED_DT } from './physicsConfig';

const matOf = (t: any) => new THREE.Matrix4().compose(
  new THREE.Vector3(...(t?.position ?? [0, 0, 0])),
  new THREE.Quaternion(...(t?.quaternion ?? [0, 0, 0, 1])),
  new THREE.Vector3(1, 1, 1),
);

interface JointEntry extends CreatedJoint {
  mode: 'position' | 'velocity';
}

export class PhysicsSim {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any;

  static async create(doc: Document, fk: any, opts?: any) {
    const { groundY = -3.2, gravity = 9.81 } = opts ?? {};
    const world = await createJoltWorld(gravity);
    return new PhysicsSim(world, doc, fk, { groundY, gravity, hullPoints: opts?.hullPoints ?? null });
  }

  constructor(world: JoltWorld, doc: Document, fk: any, { groundY = -3.2, hullPoints = null } = {} as any) {
    const { Jolt, physicsSystem, bodyInterface } = world;
    this._world = world;
    this._Jolt = Jolt;
    this._physicsSystem = physicsSystem;
    this._bodyInterface = bodyInterface;
    this.joints = new Map<string, JointEntry>();
    this._bodies = new Map<string, any>(); // bodyId -> Jolt Body
    this._boxHandles = new Map<number, any>(); // handle -> Jolt Body
    this._nextBoxHandle = 1;
    this._spinning = new Set<string>();

    // Ground: a large static plane-like box, same convention every other sim used.
    const groundShape = new Jolt.BoxShapeSettings(new Jolt.Vec3(200, 0.1, 200), 0.02).Create().Get();
    const groundSettings = new Jolt.BodyCreationSettings(
      groundShape, new Jolt.RVec3(0, groundY, 0), Jolt.Quat.prototype.sIdentity(), Jolt.EMotionType_Static, JOLT_LAYER_NON_MOVING,
    );
    // Jolt's default combined friction (~0.2) is near-frictionless — not enough
    // for a driven wheel to push the chassis. Same root-cause fix as DynamicSim.
    // set_mFriction, not `=` — this binding was found to silently drop plain property
    // assignment for other fields (see dynamicSim.ts's ground-friction fix); converting
    // this defensively rather than trusting `=` "probably" works for primitives too.
    groundSettings.set_mFriction(1.2);
    const ground = bodyInterface.CreateBody(groundSettings);
    bodyInterface.AddBody(ground.GetID(), Jolt.EActivation_DontActivate);

    const worldMat = (id: string) => fk?.get(id)?.matrix?.clone() ?? matOf(doc.bodies[id]?.transform);

    // A body that is no joint's child is a ROOT (e.g. the base) and is
    // anchored to the world as a static body — same "powered robot" design
    // every prior version of this sim used.
    const childIds = new Set(Object.values(doc.joints).map((j) => j.childBodyId));

    // Self-collision exclusion: jointed pairs + rest-pose "designed to
    // touch" overlapping pairs (same ACM logic mjcfGen.ts/dynamicSimMjcf.ts
    // use), applied here via a real Jolt GroupFilterTable + per-body
    // sub-group instead of MJCF <exclude> elements.
    const excludePairs = restPoseExcludePairs(doc, doc.bodies, worldMat);
    const bodyIdList = Object.keys(doc.bodies);
    const subGroupOf = new Map<string, number>(bodyIdList.map((id, i) => [id, i]));
    const groupFilter = new Jolt.GroupFilterTable(bodyIdList.length);
    for (const key of excludePairs) {
      const [a, b] = key.split('|');
      const sa = subGroupOf.get(a), sb = subGroupOf.get(b);
      if (sa !== undefined && sb !== undefined) groupFilter.DisableCollision(sa, sb);
    }

    for (const body of Object.values(doc.bodies)) {
      const M = worldMat(body.id);
      const pos = new THREE.Vector3().setFromMatrixPosition(M);
      const quat = new THREE.Quaternion().setFromRotationMatrix(M);
      const isRoot = !childIds.has(body.id);
      const shape = makeJoltShape(Jolt, body, { hullPoints: hullPoints?.(body.id) ?? null });
      if (!shape) continue;

      const motionType = isRoot ? Jolt.EMotionType_Static : Jolt.EMotionType_Dynamic;
      const layer = isRoot ? JOLT_LAYER_NON_MOVING : JOLT_LAYER_MOVING;
      const bs = new Jolt.BodyCreationSettings(
        shape, new Jolt.RVec3(pos.x, pos.y, pos.z), new Jolt.Quat(quat.x, quat.y, quat.z, quat.w), motionType, layer,
      );
      if (!isRoot) {
        const density = this._density(body, doc);
        bs.set_mOverrideMassProperties(Jolt.EOverrideMassProperties_CalculateInertia);
        // NOTE: `bs.mMassPropertiesOverride.mMass = x` does NOT write back — the getter
        // returns a copy in this binding. The PREVIOUS fix here (`bs.mMassPropertiesOverride
        // = mp`) was still incomplete: plain property ASSIGNMENT on struct-valued fields also
        // silently no-ops in this binding, not just the getter — only the explicit
        // set_mMassPropertiesOverride(...) method actually writes through (verified live via
        // dynamicSim.ts's identical joint-constraint bug, same root cause).
        const mp = new Jolt.MassProperties();
        mp.set_mMass(density * shapeVolumeEstimate(body));
        bs.set_mMassPropertiesOverride(mp);
      }
      // Same missing-friction bug as DynamicSim: default ~0.2 combined friction
      // is too low for driven bodies to grip the ground and produce traction.
      bs.set_mFriction(0.9);
      bs.set_mCollisionGroup(new Jolt.CollisionGroup(groupFilter, 0, subGroupOf.get(body.id)!));
      const rb = bodyInterface.CreateBody(bs);
      bodyInterface.AddBody(rb.GetID(), isRoot ? Jolt.EActivation_DontActivate : Jolt.EActivation_Activate);
      this._bodies.set(body.id, rb);
    }

    for (const j of Object.values(doc.joints)) {
      const bodyA = this._bodies.get(j.parentBodyId as string);
      const bodyB = this._bodies.get(j.childBodyId as string);
      if (!bodyA || !bodyB) continue;
      const parentWorldMat = worldMat(j.parentBodyId as string);
      const created = createJoint(Jolt, physicsSystem, j, bodyA, bodyB, parentWorldMat);
      if (created.type === 'revolute' || created.type === 'continuous' || created.type === 'prismatic') {
        this.joints.set(j.id, { ...created, mode: 'position' });
        setHingeTargetAngle(Jolt, created.constraint, j.state?.value ?? 0);
      }
    }

    this._accumulator = 0;
  }

  _density(body: any, doc: any) {
    const m = body.visual?.materialId ? doc.materials[body.visual.materialId] : null;
    return m?.density ?? 1000;
  }

  /** Live-update gravity (m/s², downward) without rebuilding the world. */
  setGravity(magnitude: any) {
    const g = Number.isFinite(magnitude) ? magnitude : 0;
    this._physicsSystem.SetGravity(new this._Jolt.Vec3(0, -g, 0));
    // Wake every body so a gravity change takes effect even when settled.
    for (const rb of this._bodies.values()) this._bodyInterface.ActivateBody(rb.GetID());
  }

  /** Command joint motor targets live (closed-loop position hold). */
  setJointTargets(values: Record<string, number>) {
    for (const [id, v] of Object.entries(values)) {
      const entry = this.joints.get(id);
      if (!entry) continue;
      entry.mode = 'position';
      setHingeTargetAngle(this._Jolt, entry.constraint, v);
    }
  }

  /** Drive selected joints as continuously-spinning wheels (velocity mode). */
  setJointVelocities(vels: Record<string, number>) {
    for (const [id, w] of Object.entries(vels)) {
      const entry = this.joints.get(id);
      if (!entry) continue;
      entry.mode = 'velocity';
      setHingeTargetVelocity(this._Jolt, entry.constraint, w);
      this._spinning.add(id);
    }
    for (const id of [...this._spinning]) {
      if (id in vels) continue;
      this._spinning.delete(id);
      const entry = this.joints.get(id);
      if (entry) {
        entry.mode = 'position';
        const currentAngle = entry.constraint.GetCurrentAngle();
        setHingeTargetAngle(this._Jolt, entry.constraint, currentAngle);
      }
    }
  }

  /** Advance exactly one fixed timestep (deterministic). */
  step() { this._world.jolt.Step(FIXED_DT, 1); }

  /** Advance by real elapsed seconds using a fixed-timestep accumulator. */
  stepFor(elapsedSeconds: number): number {
    const dt = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
    this._accumulator += Math.min(dt, 0.25);
    let n = 0;
    while (this._accumulator >= FIXED_DT) {
      this._world.jolt.Step(FIXED_DT, 1);
      this._accumulator -= FIXED_DT;
      n++;
    }
    return n;
  }

  // ── Falling-box API — real independent bodies, no pool needed ──────────────
  spawnBox(pos: [number, number, number], half: [number, number, number], density: number): number {
    const Jolt = this._Jolt;
    const shape = new Jolt.BoxShapeSettings(new Jolt.Vec3(half[0], half[1], half[2]), 0.02).Create().Get();
    const bs = new Jolt.BodyCreationSettings(
      shape, new Jolt.RVec3(pos[0], pos[1], pos[2]), Jolt.Quat.prototype.sIdentity(), Jolt.EMotionType_Dynamic, JOLT_LAYER_MOVING,
    );
    bs.set_mOverrideMassProperties(Jolt.EOverrideMassProperties_CalculateInertia);
    const mp = new Jolt.MassProperties();
    mp.set_mMass(density * (2 * half[0]) * (2 * half[1]) * (2 * half[2]));
    bs.set_mMassPropertiesOverride(mp);
    const rb = this._bodyInterface.CreateBody(bs);
    this._bodyInterface.AddBody(rb.GetID(), Jolt.EActivation_Activate);
    const handle = this._nextBoxHandle++;
    this._boxHandles.set(handle, rb);
    return handle;
  }

  boxPoses(): Map<number, { pos: [number, number, number]; quat: [number, number, number, number] }> {
    const out = new Map<number, any>();
    for (const [handle, rb] of this._boxHandles) {
      // Extract every primitive immediately after each call — see poses() below for why.
      const px = rb.GetPosition().GetX(), py = rb.GetPosition().GetY(), pz = rb.GetPosition().GetZ();
      const qx = rb.GetRotation().GetX(), qy = rb.GetRotation().GetY(), qz = rb.GetRotation().GetZ(), qw = rb.GetRotation().GetW();
      out.set(handle, { pos: [px, py, pz], quat: [qx, qy, qz, qw] });
    }
    return out;
  }

  removeBox(handle: number) {
    const rb = this._boxHandles.get(handle);
    if (!rb) return;
    this._bodyInterface.RemoveBody(rb.GetID());
    this._bodyInterface.DestroyBody(rb.GetID());
    this._boxHandles.delete(handle);
  }

  removeAllBoxes() {
    for (const handle of [...this._boxHandles.keys()]) this.removeBox(handle);
  }

  poses() {
    const out = new Map();
    for (const [id, rb] of this._bodies) {
      // Extract every primitive IMMEDIATELY after each Jolt call — even holding both
      // GetPosition()'s and GetRotation()'s return values before reading either (as this
      // used to do) is risky: some WASM bindings reuse a shared scratch buffer for
      // struct-valued returns, so the GetRotation() call can silently corrupt the position
      // already "captured" in `p` before its components are read. This is the Editor's main
      // per-frame render feed — this exact bug here would show up as visibly wrong/jittering
      // body poses under physics.
      const px = rb.GetPosition().GetX(), py = rb.GetPosition().GetY(), pz = rb.GetPosition().GetZ();
      const qx = rb.GetRotation().GetX(), qy = rb.GetRotation().GetY(), qz = rb.GetRotation().GetZ(), qw = rb.GetRotation().GetW();
      const matrix = new THREE.Matrix4().compose(
        new THREE.Vector3(px, py, pz),
        new THREE.Quaternion(qx, qy, qz, qw),
        new THREE.Vector3(1, 1, 1),
      );
      out.set(id, { position: [px, py, pz], quaternion: [qx, qy, qz, qw], matrix });
    }
    return out;
  }

  dispose() {
    try {
      this.removeAllBoxes();
      for (const rb of this._bodies.values()) {
        this._bodyInterface.RemoveBody(rb.GetID());
        this._bodyInterface.DestroyBody(rb.GetID());
      }
      this._world.dispose();
    } catch { /* ignore */ }
  }
}

/** Rough volume estimate for mass computation (density * volume) from a body's
 *  declared geometry — Jolt's CalculateInertia override still needs a starting
 *  mass; this mirrors the half-extent estimate colliderFactory.ts used. */
function shapeVolumeEstimate(body: any): number {
  const g = body.visual?.geometry ?? {};
  const s = body.transform?.scale ?? [1, 1, 1];
  const sx = Math.abs(s[0]), sy = Math.abs(s[1]), sz = Math.abs(s[2]);
  switch (g.type) {
    case 'sphere': { const r = (g.radius ?? 0.5) * Math.max(sx, sy, sz); return (4 / 3) * Math.PI * r ** 3; }
    case 'box': { const sz0 = g.size ?? [1, 1, 1]; return Math.abs(sz0[0] * s[0]) * Math.abs(sz0[1] * s[1]) * Math.abs(sz0[2] * s[2]); }
    case 'cylinder': case 'capsule': case 'cone': {
      const r = (g.radius ?? 0.5) * sx, l = (g.length ?? 1) * sz;
      return Math.PI * r * r * l;
    }
    default: return 0.8 * 0.8 * 0.8 * sx * sy * sz;
  }
}
