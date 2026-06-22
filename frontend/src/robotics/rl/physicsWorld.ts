/**
 * physicsWorld — a small, RESETTABLE Rapier world for reinforcement learning of
 * LOCOMOTION (modular / shape-changing robots). Unlike the editor's PhysicsSim (which
 * fixes the base so an arm holds its pose), here EVERY body is dynamic and rests on the
 * ground — so when the policy actuates the joints, the whole robot actually moves. The
 * world can be reset to its initial state cheaply (restore poses + zero velocities)
 * instead of rebuilt, so an episode loop is fast.
 *
 * Self-collision is disabled via collision groups (robot bodies collide only with the
 * ground) — keeps arbitrary modular assemblies from exploding on contact while still
 * giving them ground to push against. Node-importable (Rapier ships its own WASM).
 */
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { GeometryType } from '@/core/model/index';
import type { Document } from '@/core/model/index';

let _init: Promise<void> | null = null;
export const initPhysics = () => (_init ??= RAPIER.init().then(() => undefined));

const GROUP_ROBOT = 0x00010002; // membership=robot(1), filter=ground(2)
const GROUP_GROUND = 0x00020001;

interface JointEntry { joint: any; id: string; lo: number; hi: number }

export class RLPhysicsWorld {
  world: any;
  bodies = new Map<string, any>();
  joints: JointEntry[] = [];
  jointValues: number[] = [];     // tracked commanded angles (RL state)
  private initial: { id: string; p: number[]; q: number[] }[] = [];
  private initialJointValues: number[] = [];
  private baseId: string;
  private stiffness = 80; private damping = 8;

  constructor(doc: Document, fk: any, { groundY = 0, gravity = 9.81 } = {}) {
    this.world = new RAPIER.World(new RAPIER.Vector3(0, -gravity, 0));
    const ground = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, groundY - 0.05, 0));
    const gc = this.world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.05, 100), ground);
    gc.setCollisionGroups(GROUP_GROUND);

    const matOf = (t: any) => new THREE.Matrix4().compose(
      new THREE.Vector3(...(t?.position ?? [0, 0, 0])),
      new THREE.Quaternion(...(t?.quaternion ?? [0, 0, 0, 1])), new THREE.Vector3(1, 1, 1));

    // every body dynamic, seated at its FK world pose
    for (const body of Object.values(doc.bodies)) {
      const w = fk?.get(body.id);
      const p = w ? w.position : body.transform.position;
      const q = w ? w.quaternion : body.transform.quaternion;
      const rb = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(p[0], p[1], p[2]).setRotation({ x: q[0], y: q[1], z: q[2], w: q[3] }));
      const col = this._collider(body);
      col.setDensity(this._density(body, doc));
      const c = this.world.createCollider(col, rb);
      c.setCollisionGroups(GROUP_ROBOT);
      this.bodies.set(body.id, rb);
      this.initial.push({ id: body.id, p: [p[0], p[1], p[2]], q: [q[0], q[1], q[2], q[3]] });
    }
    // pick a base body (most central) for orientation/height tracking
    this.baseId = Object.keys(doc.bodies)[0];

    // joints with motors
    for (const j of Object.values(doc.joints)) {
      const pid = j.parentBodyId as string, cid = j.childBodyId as string;
      const parent = this.bodies.get(pid), child = this.bodies.get(cid);
      if (!parent || !child) continue;
      const pMat = fk?.get(pid)?.matrix?.clone() ?? matOf(doc.bodies[pid]?.transform);
      const cMat = fk?.get(cid)?.matrix?.clone() ?? matOf(doc.bodies[cid]?.transform);
      const pivotW = pMat.clone().multiply(matOf(j.origin));
      const pivot = new THREE.Vector3().setFromMatrixPosition(pivotW);
      const a1 = pivot.clone().applyMatrix4(pMat.clone().invert());
      const a2 = pivot.clone().applyMatrix4(cMat.clone().invert());
      const oq = new THREE.Quaternion(...(j.origin?.quaternion ?? [0, 0, 0, 1]));
      const ax = new THREE.Vector3(...(j.axis ?? [0, 0, 1])).applyQuaternion(oq);
      const axO = { x: ax.x, y: ax.y, z: ax.z };
      let data: any;
      if (j.type === 'prismatic') data = RAPIER.JointData.prismatic({ x: a1.x, y: a1.y, z: a1.z }, { x: a2.x, y: a2.y, z: a2.z }, axO);
      else if (j.type === 'fixed') { data = RAPIER.JointData.fixed({ x: a1.x, y: a1.y, z: a1.z }, { x: 0, y: 0, z: 0, w: 1 }, { x: a2.x, y: a2.y, z: a2.z }, { x: 0, y: 0, z: 0, w: 1 }); }
      else data = RAPIER.JointData.revolute({ x: a1.x, y: a1.y, z: a1.z }, { x: a2.x, y: a2.y, z: a2.z }, axO);
      const joint = this.world.createImpulseJoint(data, parent, child, true);
      if (j.type === 'revolute' || j.type === 'continuous' || j.type === 'prismatic') {
        const v0 = j.state?.value ?? 0;
        joint.configureMotorModel?.(RAPIER.MotorModel.AccelerationBased);
        joint.configureMotorPosition?.(v0, this.stiffness, this.damping);
        this.joints.push({ joint, id: j.id, lo: j.limit?.lower ?? -Math.PI, hi: j.limit?.upper ?? Math.PI });
        this.jointValues.push(v0);
        this.initialJointValues.push(v0);
      }
    }
  }

  get nJoints() { return this.joints.length; }

  setJointTargets(values: number[]) {
    for (let i = 0; i < this.joints.length; i++) {
      const e = this.joints[i];
      const v = Math.max(e.lo, Math.min(e.hi, values[i]));
      this.jointValues[i] = v;
      e.joint.configureMotorPosition?.(v, this.stiffness, this.damping);
    }
  }

  step(n = 1) { for (let i = 0; i < n; i++) this.world.step(); }

  /** Approximate centre of mass = mean of body translations. */
  com(): [number, number, number] {
    let x = 0, y = 0, z = 0, n = 0;
    for (const rb of this.bodies.values()) { const t = rb.translation(); x += t.x; y += t.y; z += t.z; n++; }
    return n ? [x / n, y / n, z / n] : [0, 0, 0];
  }

  baseId_() { return this.baseId; }
  /** Base body world pose, for replaying a learned gait through the model's FK root. */
  basePose(): { position: number[]; quaternion: number[] } {
    const rb = this.bodies.get(this.baseId);
    const t = rb.translation(), r = rb.rotation();
    return { position: [t.x, t.y, t.z], quaternion: [r.x, r.y, r.z, r.w] };
  }

  /** Base body world up-axis (for an "upright" reward) + height. */
  baseUp(): [number, number, number] {
    const rb = this.bodies.get(this.baseId);
    if (!rb) return [0, 1, 0];
    const r = rb.rotation();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(new THREE.Quaternion(r.x, r.y, r.z, r.w));
    return [up.x, up.y, up.z];
  }

  /** Restore the initial state (poses, velocities, motor targets) for a new episode. */
  reset() {
    let i = 0;
    for (const b of this.initial) {
      const rb = this.bodies.get(b.id);
      rb.setTranslation({ x: b.p[0], y: b.p[1], z: b.p[2] }, true);
      rb.setRotation({ x: b.q[0], y: b.q[1], z: b.q[2], w: b.q[3] }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
      i++;
    }
    for (let k = 0; k < this.joints.length; k++) {
      this.jointValues[k] = this.initialJointValues[k];
      this.joints[k].joint.configureMotorPosition?.(this.initialJointValues[k], this.stiffness, this.damping);
    }
  }

  /** Read body poses for the renderer (id → {position, quaternion}). */
  poses() {
    const out = new Map<string, any>();
    for (const [id, rb] of this.bodies) {
      const t = rb.translation(), r = rb.rotation();
      out.set(id, { position: [t.x, t.y, t.z], quaternion: [r.x, r.y, r.z, r.w] });
    }
    return out;
  }

  dispose() { try { this.world.free?.(); } catch { /* ignore */ } }

  private _density(body: any, doc: any) {
    const m = body.visual?.materialId ? doc.materials[body.visual.materialId] : null;
    return m?.density ?? 1000;
  }
  private _collider(body: any) {
    const g = body.visual?.geometry ?? {};
    const s = body.transform?.scale ?? [1, 1, 1];
    switch (g.type) {
      case GeometryType.SPHERE: return RAPIER.ColliderDesc.ball((g.radius ?? 0.5) * Math.max(Math.abs(s[0]), Math.abs(s[1]), Math.abs(s[2])));
      case GeometryType.BOX: { const sz = g.size ?? [1, 1, 1]; return RAPIER.ColliderDesc.cuboid(Math.abs(sz[0] * s[0]) / 2, Math.abs(sz[1] * s[1]) / 2, Math.abs(sz[2] * s[2]) / 2); }
      case GeometryType.CYLINDER: case GeometryType.CAPSULE: { const r = g.radius ?? 0.5, l = g.length ?? 1; return RAPIER.ColliderDesc.cuboid(Math.abs(r * s[0]), Math.abs(r * s[1]), Math.abs(l * s[2]) / 2); }
      default: return RAPIER.ColliderDesc.cuboid(0.4 * Math.abs(s[0]), 0.4 * Math.abs(s[1]), 0.4 * Math.abs(s[2]));
    }
  }
}
