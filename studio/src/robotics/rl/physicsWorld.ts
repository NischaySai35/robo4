/**
 * RLPhysicsWorld — a small, RESETTABLE Jolt world for reinforcement learning
 * of LOCOMOTION (modular / shape-changing robots). Unlike the editor's
 * PhysicsSim (which fixes the base so an arm holds its pose), here EVERY
 * body is dynamic and rests on the ground — so when the policy actuates the
 * joints, the whole robot actually moves.
 *
 * Reset is a direct per-body SetPositionAndRotation + zero-velocity restore
 * (no rebuild) — cheap enough for episode-heavy training, same as the MJCF
 * version's qpos-array restore was. Self-collision is disabled via a Jolt
 * GroupFilterTable where every body pair is mutually excluded (robot bodies
 * collide only with the ground) — see the "robot-only" group setup below.
 */
import * as THREE from 'three';
import { mat as matOf } from '@/kinematics/modelFK';
import type { Document } from '@/core/model/index';
import { ensureJolt, createJoltWorldSync, JOLT_LAYER_NON_MOVING, JOLT_LAYER_MOVING, type JoltModule, type JoltWorld } from '@/physics/joltLoader';
import { makeJoltShape } from '@/physics/joltShapes';
import { createJoint } from '@/physics/joltJoints';
import { joltPose, joltQuat, type JoltPose } from '@/physics/joltPose';

// Callers (locomotionTask.ts, TrainingPanel.tsx, trainers that construct a fresh
// RLPhysicsWorld per episode) rely on the ORIGINAL calling convention: await
// initPhysics() once, then `new RLPhysicsWorld(doc, fk, opts)` synchronously many
// times per training run. Making the constructor itself async would cascade into
// every trainer's hot loop (vectorTrainer.ts, cmaTrainer.ts, bcTrainer.ts all call
// task factories synchronously) — instead, cache the loaded module here and let
// the constructor read it synchronously, preserving the exact original contract.
let _Jolt: JoltModule | null = null;
export const initPhysics = () => ensureJolt().then((m) => { _Jolt = m; });


interface JointEntry { jointId: string; constraint: any; lo: number; hi: number }
interface InitialBody { id: string; pos: THREE.Vector3; quat: THREE.Quaternion }

export class RLPhysicsWorld {
  Jolt: JoltModule;
  world: JoltWorld;
  bodyIdx = new Map<string, any>(); // bodyId -> Jolt Body
  joints: JointEntry[] = [];
  jointValues: number[] = []; // tracked commanded angles (RL state)
  private _initial: InitialBody[] = [];
  private _initialJointValues: number[] = [];
  private baseId: string;

  constructor(doc: Document, fk: any, { groundY = 0, gravity = 9.81 } = {}) {
    if (!_Jolt) throw new Error('RLPhysicsWorld: call `await initPhysics()` once before constructing');
    const Jolt = _Jolt;
    this.Jolt = Jolt;
    const world = createJoltWorldSync(Jolt, gravity);
    this.world = world;
    const { bodyInterface, physicsSystem } = world;

    const worldMat = (id: string) => fk?.get(id)?.matrix?.clone() ?? matOf(doc.bodies[id]?.transform);

    // Ground
    const groundShape = new Jolt.BoxShapeSettings(new Jolt.Vec3(100, 0.05, 100), 0.02).Create().Get();
    const groundSettings = new Jolt.BodyCreationSettings(groundShape, new Jolt.RVec3(0, groundY - 0.05, 0), Jolt.Quat.prototype.sIdentity(), Jolt.EMotionType_Static, JOLT_LAYER_NON_MOVING);
    // Jolt's default ~0.2 combined friction is too low for a locomotion gait
    // to push off the ground at all — same root-cause bug fixed in DynamicSim/PhysicsSim.
    groundSettings.set_mFriction(1.2);
    const ground = bodyInterface.CreateBody(groundSettings);
    bodyInterface.AddBody(ground.GetID(), Jolt.EActivation_DontActivate);

    // Self-collision fully disabled: every robot body shares one collision
    // group with every pair mutually excluded (robot parts never collide
    // with each other, only with the ground) — matches the original's
    // "collision groups: robot only collides with ground" design.
    const bodyIdList = Object.keys(doc.bodies);
    const groupFilter = new Jolt.GroupFilterTable(bodyIdList.length);
    for (let i = 0; i < bodyIdList.length; i++) {
      for (let k = i + 1; k < bodyIdList.length; k++) groupFilter.DisableCollision(i, k);
    }
    const subGroupOf = new Map<string, number>(bodyIdList.map((id, i) => [id, i]));

    for (const body of Object.values(doc.bodies)) {
      const M = worldMat(body.id);
      const pos = new THREE.Vector3().setFromMatrixPosition(M);
      const quat = new THREE.Quaternion().setFromRotationMatrix(M);
      const shape = makeJoltShape(Jolt, body, {});
      if (!shape) continue;
      const bs = new Jolt.BodyCreationSettings(shape, new Jolt.RVec3(pos.x, pos.y, pos.z), new Jolt.Quat(quat.x, quat.y, quat.z, quat.w), Jolt.EMotionType_Dynamic, JOLT_LAYER_MOVING);
      const density = this._density(body, doc);
      const mp = new Jolt.MassProperties();
      mp.set_mMass(density * this._volumeEstimate(body));
      bs.set_mOverrideMassProperties(Jolt.EOverrideMassProperties_CalculateInertia);
      bs.set_mMassPropertiesOverride(mp);
      bs.set_mFriction(0.9);
      bs.set_mCollisionGroup(new Jolt.CollisionGroup(groupFilter, 0, subGroupOf.get(body.id)!));
      const rb = bodyInterface.CreateBody(bs);
      bodyInterface.AddBody(rb.GetID(), Jolt.EActivation_Activate);
      this.bodyIdx.set(body.id, rb);
      this._initial.push({ id: body.id, pos: pos.clone(), quat: quat.clone() });
    }
    this.baseId = Object.keys(doc.bodies)[0];

    for (const j of Object.values(doc.joints) as any[]) {
      const bodyA = this.bodyIdx.get(j.parentBodyId), bodyB = this.bodyIdx.get(j.childBodyId);
      if (!bodyA || !bodyB) continue;
      const lo = j.limit?.lower ?? -Math.PI, hi = j.limit?.upper ?? Math.PI;
      // RL keeps Jolt's stock motor and always clamps to [lo, hi] (its training contract).
      const { constraint, type } = createJoint(Jolt, physicsSystem, j, bodyA, bodyB, worldMat(j.parentBodyId),
        { limits: [lo, hi], stockMotor: true });
      if (type === 'fixed') continue; // rigid weld, not an actuated DOF
      const v0 = j.state?.value ?? 0;
      constraint.SetMotorState(Jolt.EMotorState_Position);
      if (type === 'prismatic') constraint.SetTargetPosition(v0);
      else constraint.SetTargetAngle(v0);
      this.joints.push({ jointId: j.id, constraint, lo, hi });
      this.jointValues.push(v0);
      this._initialJointValues.push(v0);
    }
  }

  private _density(body: any, doc: any) {
    const m = body.visual?.materialId ? doc.materials[body.visual.materialId] : null;
    return m?.density ?? 1000;
  }
  private _volumeEstimate(body: any): number {
    const g = body.visual?.geometry ?? {};
    const s = body.transform?.scale ?? [1, 1, 1];
    const sx = Math.abs(s[0]), sy = Math.abs(s[1]), sz = Math.abs(s[2]);
    switch (g.type) {
      case 'sphere': { const r = (g.radius ?? 0.5) * Math.max(sx, sy, sz); return (4 / 3) * Math.PI * r ** 3; }
      case 'box': { const sz0 = g.size ?? [1, 1, 1]; return Math.abs(sz0[0] * s[0]) * Math.abs(sz0[1] * s[1]) * Math.abs(sz0[2] * s[2]); }
      case 'cylinder': case 'capsule': case 'cone': { const r = (g.radius ?? 0.5) * sx, l = (g.length ?? 1) * sz; return Math.PI * r * r * l; }
      default: return 0.8 * 0.8 * 0.8 * sx * sy * sz;
    }
  }

  get nJoints() { return this.joints.length; }

  setJointTargets(values: number[]) {
    for (let i = 0; i < this.joints.length; i++) {
      const e = this.joints[i];
      const v = Math.max(e.lo, Math.min(e.hi, values[i]));
      this.jointValues[i] = v;
      e.constraint.SetTargetAngle?.(v);
      e.constraint.SetTargetPosition?.(v);
    }
  }

  step(n = 1) { for (let i = 0; i < n; i++) this.world.jolt.Step(1 / 60, 1); }

  /** Approximate centre of mass = mean of body world positions. */
  com(): [number, number, number] {
    let x = 0, y = 0, z = 0, n = 0;
    for (const rb of this.bodyIdx.values()) {
      const p = rb.GetPosition();
      x += p.GetX(); y += p.GetY(); z += p.GetZ(); n++;
    }
    return n ? [x / n, y / n, z / n] : [0, 0, 0];
  }

  baseId_() { return this.baseId; }

  /** Base body world pose, for replaying a learned gait through the model's FK root. */
  basePose(): JoltPose {
    const rb = this.bodyIdx.get(this.baseId)!;
    return joltPose(rb);
  }

  /** Base body world up-axis (for an "upright" reward) + height. */
  baseUp(): [number, number, number] {
    const rb = this.bodyIdx.get(this.baseId);
    if (!rb) return [0, 1, 0];
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(joltQuat(rb));
    return [up.x, up.y, up.z];
  }

  /** Restore the initial state (poses, velocities, motor targets) for a new episode. */
  reset() {
    const Jolt = this.Jolt;
    for (const init of this._initial) {
      const rb = this.bodyIdx.get(init.id);
      if (!rb) continue;
      this.world.bodyInterface.SetPositionAndRotation(
        rb.GetID(), new Jolt.RVec3(init.pos.x, init.pos.y, init.pos.z), new Jolt.Quat(init.quat.x, init.quat.y, init.quat.z, init.quat.w), Jolt.EActivation_Activate,
      );
      rb.SetLinearVelocity(new Jolt.Vec3(0, 0, 0));
      rb.SetAngularVelocity(new Jolt.Vec3(0, 0, 0));
    }
    for (let k = 0; k < this.joints.length; k++) {
      this.jointValues[k] = this._initialJointValues[k];
      this.joints[k].constraint.SetTargetAngle?.(this._initialJointValues[k]);
      this.joints[k].constraint.SetTargetPosition?.(this._initialJointValues[k]);
    }
  }

  /** Read body poses for the renderer (id -> {position, quaternion}). */
  poses() {
    const out = new Map<string, any>();
    for (const [id, rb] of this.bodyIdx) {
      out.set(id, joltPose(rb)); // safe read, see joltPose.ts
    }
    return out;
  }

  dispose() {
    try {
      for (const rb of this.bodyIdx.values()) {
        this.world.bodyInterface.RemoveBody(rb.GetID());
        this.world.bodyInterface.DestroyBody(rb.GetID());
      }
      this.world.dispose();
    } catch { /* ignore */ }
  }
}
