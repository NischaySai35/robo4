/**
 * PhysicsSim — wraps Rapier (WASM) for a live, non-destructive gravity sim.
 *
 * On Play, every model body becomes a dynamic rigid body (initial pose = its FK
 * world), with a collider derived from its geometry + material density, joints
 * become Rapier impulse joints, and a ground plane is added. Each frame we step
 * and read back poses for the renderer. On Stop, the sim is discarded and the
 * model snaps back to its FK pose — the model document is never mutated (preview).
 *
 * Approximations (Phase 7): cylinder/capsule/mesh colliders use cuboid bounds;
 * joint anchors come from the joint origin. Good enough to feel gravity, contacts,
 * and articulation; refined later.
 */
import RAPIER from './physicsEngine';
import * as THREE from 'three';
import { GeometryType } from '@/core/model/index';
import type { Document } from '@/core/model/index';
import { applyDeterministicParams, FIXED_DT } from './physicsConfig';
import { makeColliderDesc } from './colliderFactory';

let _initPromise: any = null;
const ensureRapier = () => (_initPromise ??= RAPIER.init());

const IDENT_Q = { x: 0, y: 0, z: 0, w: 1 };
// Inflate rest-pose AABBs slightly when deciding which parts are "designed to
// touch" — so resting contacts don't chatter and just-touching knuckles count.
const ACM_MARGIN = 1.04;

export class PhysicsSim {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any;
  static async create(doc: Document, fk: any, opts?: any) {
    await ensureRapier();
    return new PhysicsSim(doc, fk, opts);
  }

  constructor(doc: Document, fk: any, { groundY = -3.2, gravity = 9.81, hullPoints = null } = {} as any) {
    // Optional provider of mesh convex-hull vertices (bodyId → flat [x,y,z,…]), supplied
    // by the viewport which has the parsed mesh geometry. Falls back to bbox when absent.
    this._hullPoints = hullPoints as null | ((id: string) => Float32Array | null);
    this.world = new RAPIER.World(new RAPIER.Vector3(0, -gravity, 0));
    // Pin timestep + solver iterations so the sim is reproducible (sim-to-real trust).
    applyDeterministicParams(this.world);
    this._accumulator = 0; // for framerate-independent fixed stepping (stepFor)
    this.bodies = new Map(); // bodyId -> RigidBody
    // Powered robot: each revolute joint is held to its commanded angle by a stiff
    // acceleration-based motor (stable regardless of link inertia). So gravity
    // LOADS the joints (you see the torque/current in Analysis) but the arm stays
    // rigid and holds its pose — it doesn't flop to the floor.
    this._motorStiffness = 50000;  // high stiffness = arm holds pose rigidly under box impacts
    this._motorDamping = 500;
    // jointId -> { joint, type } so a controller can command motor targets LIVE
    // (closed-loop trajectory execution: the physical arm tracks setpoints under
    // gravity/contacts instead of teleporting). See setJointTargets().
    this.joints = new Map();

    // Ground
    const ground = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, groundY, 0));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(200, 0.1, 200), ground);

    const matOf = (t: any) => new THREE.Matrix4().compose(
      new THREE.Vector3(...(t?.position ?? [0, 0, 0])),
      new THREE.Quaternion(...(t?.quaternion ?? [0, 0, 0, 1])),
      new THREE.Vector3(1, 1, 1),
    );
    const originMat = (o: any) => matOf(o ?? { position: [0, 0, 0], quaternion: [0, 0, 0, 1] });
    const worldMat = (id: string) => fk?.get(id)?.matrix?.clone() ?? matOf(doc.bodies[id]?.transform);

    // A body that is no joint's child is a ROOT (e.g. the base) and is anchored to
    // the world as a fixed body — otherwise the whole assembly just free-falls.
    const childIds = new Set(Object.values(doc.joints).map((j) => j.childBodyId));

    // Self-collision is filtered per-pair (see `_hooks`): the arm's parts collide
    // SOLIDLY with each other so non-adjacent links can't pass through — EXCEPT for
    // pairs that are jointed together or overlap at the rest pose (designed to nest,
    // e.g. a knuckle inside its link, or two adjacent links sharing a pivot).
    this._colBody = new Map<number, string>(); // collider handle -> bodyId
    this._disabled = new Set<string>();         // "a|b" pairs that must NOT collide

    // Bodies
    for (const body of Object.values(doc.bodies)) {
      const w = fk?.get(body.id);
      const p = w ? w.position : body.transform.position;
      const q = w ? w.quaternion : body.transform.quaternion;
      const isRoot = !childIds.has(body.id);
      const rb = this.world.createRigidBody(
        (isRoot ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic())
          .setTranslation(p[0], p[1], p[2])
          .setRotation({ x: q[0], y: q[1], z: q[2], w: q[3] }),
      );
      const col = this._colliderDesc(body, doc);
      if (col) {
        col.setDensity(this._density(body, doc)).setActiveHooks(RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS);
        const collider = this.world.createCollider(col, rb);
        this._colBody.set(collider.handle, body.id);
      }
      this.bodies.set(body.id, rb);
    }

    // ── Allowed-collision matrix ────────────────────────────────────────────
    // 1) Directly jointed pairs (revolute, prismatic, welds) never self-collide.
    for (const j of Object.values(doc.joints)) {
      if (j.parentBodyId && j.childBodyId) this._disabled.add(this._pairKey(j.parentBodyId, j.childBodyId));
    }
    // 2) Pairs whose colliders already overlap at the rest pose are "designed to
    //    touch" → disable, so Rapier doesn't blast them apart on the first step.
    const ids = Object.keys(doc.bodies);
    const boxes = new Map<string, any>();
    for (const id of ids) boxes.set(id, this._worldAabb(doc.bodies[id], worldMat(id)));
    for (let i = 0; i < ids.length; i++) {
      for (let k = i + 1; k < ids.length; k++) {
        if (this._aabbOverlap(boxes.get(ids[i]), boxes.get(ids[k]))) {
          this._disabled.add(this._pairKey(ids[i], ids[k]));
        }
      }
    }

    // Contact filter hook: ignore contacts for disabled pairs, solve the rest.
    this._events = new RAPIER.EventQueue(true);
    this._hooks = {
      filterContactPair: (c1: number, c2: number) => {
        const a = this._colBody.get(c1), b = this._colBody.get(c2);
        if (a == null || b == null) return RAPIER.SolverFlags.COMPUTE_IMPULSE; // ground, etc.
        return this._disabled.has(this._pairKey(a, b)) ? null : RAPIER.SolverFlags.COMPUTE_IMPULSE;
      },
    };

    for (const j of Object.values(doc.joints)) {
      const parent = this.bodies.get(j.parentBodyId);
      const child = this.bodies.get(j.childBodyId);
      if (!parent || !child) continue;

      const pMat = fk?.get(j.parentBodyId)?.matrix?.clone() ?? matOf(doc.bodies[j.parentBodyId as string]?.transform);
      const cMat = fk?.get(j.childBodyId)?.matrix?.clone() ?? matOf(doc.bodies[j.childBodyId as string]?.transform);
      const pivotW = pMat.clone().multiply(originMat(j.origin));
      const pivotPos = new THREE.Vector3().setFromMatrixPosition(pivotW);
      const a1v = pivotPos.clone().applyMatrix4(pMat.clone().invert());
      const a2v = pivotPos.clone().applyMatrix4(cMat.clone().invert());
      const a1 = { x: a1v.x, y: a1v.y, z: a1v.z };
      const a2 = { x: a2v.x, y: a2v.y, z: a2v.z };
      // Axis in the pivot (parent-aligned) frame.
      const oq = new THREE.Quaternion(...(j.origin?.quaternion ?? [0, 0, 0, 1]));
      const axV = new THREE.Vector3(...(j.axis ?? [0, 0, 1])).applyQuaternion(oq);
      const ax = { x: axV.x, y: axV.y, z: axV.z };

      let data: any;
      if (j.type === 'revolute' || j.type === 'continuous') data = RAPIER.JointData.revolute(a1, a2, ax);
      else if (j.type === 'prismatic') data = RAPIER.JointData.prismatic(a1, a2, ax);
      else {
        // Fixed weld: lock the child's current pose relative to the parent.
        const pQ = new THREE.Quaternion().setFromRotationMatrix(pMat);
        const cQ = new THREE.Quaternion().setFromRotationMatrix(cMat);
        const relQ = pQ.clone().invert().multiply(cQ);
        const cPos = new THREE.Vector3().setFromMatrixPosition(cMat).applyMatrix4(pMat.clone().invert());
        data = RAPIER.JointData.fixed(
          { x: cPos.x, y: cPos.y, z: cPos.z }, { x: relQ.x, y: relQ.y, z: relQ.z, w: relQ.w },
          { x: 0, y: 0, z: 0 }, IDENT_Q,
        );
      }

      const joint = this.world.createImpulseJoint(data, parent, child, true);
      if (j.type === 'revolute' || j.type === 'continuous' || j.type === 'prismatic') {
        this.joints.set(j.id, { joint, type: j.type });
      }
      if (j.type === 'revolute' || j.type === 'continuous') {
        // Hold the commanded angle rigidly (servo). Acceleration-based so stiffness
        // is mass-independent and stable.
        joint.configureMotorModel?.(RAPIER.MotorModel.AccelerationBased);
        joint.configureMotorPosition?.(j.state?.value ?? 0, this._motorStiffness, this._motorDamping);
        // Enforce the joint's range of motion (skip continuous = free spin).
        if (j.type === 'revolute' && joint.setLimits
            && Number.isFinite(j.limit?.lower) && Number.isFinite(j.limit?.upper)
            && j.limit.upper > j.limit.lower) {
          joint.setLimits(j.limit.lower, j.limit.upper);
        }
      }
    }
  }

  _density(body: any, doc: any) {
    const m = body.visual?.materialId ? doc.materials[body.visual.materialId] : null;
    return m?.density ?? 1000;
  }

  _pairKey(a: string, b: string) { return a < b ? `${a}|${b}` : `${b}|${a}`; }

  /** Local half-extents of a body's cuboid collider bound (mirrors _colliderDesc). */
  _halfExtents(body: any): [number, number, number] {
    const g = body.visual?.geometry ?? {};
    const s = body.transform?.scale ?? [1, 1, 1];
    const a = Math.abs(s[0]), b = Math.abs(s[1]), c = Math.abs(s[2]);
    switch (g.type) {
      case GeometryType.SPHERE: { const r = (g.radius ?? 0.5) * Math.max(a, b, c); return [r, r, r]; }
      case GeometryType.BOX: { const sz = g.size ?? [1, 1, 1]; return [Math.abs(sz[0]) * a / 2, Math.abs(sz[1]) * b / 2, Math.abs(sz[2]) * c / 2]; }
      case GeometryType.CYLINDER:
      case GeometryType.CAPSULE: { const r = g.radius ?? 0.5, l = g.length ?? 1; return [r * a, r * b, l * c / 2]; }
      default: return [0.4 * a, 0.4 * b, 0.4 * c];
    }
  }

  /** World-space AABB of a body at the given world matrix (8 transformed corners). */
  _worldAabb(body: any, M: any) {
    const [hx, hy, hz] = this._halfExtents(body).map((v) => v * ACM_MARGIN) as [number, number, number];
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    const v = new THREE.Vector3();
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      v.set(sx * hx, sy * hy, sz * hz).applyMatrix4(M);
      min[0] = Math.min(min[0], v.x); min[1] = Math.min(min[1], v.y); min[2] = Math.min(min[2], v.z);
      max[0] = Math.max(max[0], v.x); max[1] = Math.max(max[1], v.y); max[2] = Math.max(max[2], v.z);
    }
    return { min, max };
  }

  _aabbOverlap(A: any, B: any) {
    return A.min[0] <= B.max[0] && A.max[0] >= B.min[0]
      && A.min[1] <= B.max[1] && A.max[1] >= B.min[1]
      && A.min[2] <= B.max[2] && A.max[2] >= B.min[2];
  }

  _colliderDesc(body: any, _doc?: any) {
    // True cylinder/capsule/cone colliders (Z-aligned to the visual mesh) + convex-hull
    // mesh colliders when hull vertices are available; see colliderFactory.
    const hp = this._hullPoints?.(body.id) ?? null;
    return makeColliderDesc(body, { hullPoints: hp });
  }

  /** Live-update gravity (m/s², downward) without rebuilding the world. */
  setGravity(magnitude: any) {
    const g = Number.isFinite(magnitude) ? magnitude : 0;
    this.world.gravity = new RAPIER.Vector3(0, -g, 0);
    // Wake every body so a gravity change takes effect even when settled.
    for (const rb of this.bodies.values()) rb.wakeUp?.();
  }

  /**
   * Command joint motor targets live (closed-loop). For revolute/prismatic joints the
   * acceleration-based motor drives the joint toward `value` under physics — so a
   * trajectory controller can make the SIMULATED arm track a setpoint while gravity
   * and contacts act on it. Unknown ids are ignored.
   */
  setJointTargets(values: Record<string, number>) {
    for (const [id, v] of Object.entries(values)) {
      const entry = this.joints.get(id);
      if (!entry) continue;
      entry.joint.configureMotorPosition?.(v, this._motorStiffness, this._motorDamping);
    }
  }

  /**
   * Drive selected joints as continuously-spinning WHEELS: a velocity motor turns each
   * at `radPerSec`, so friction against the ground actually propels the model (the
   * "motor" CW/CCW feature under gravity). Call every sim frame with the currently
   * spinning set. Joints that were spinning but are now absent are braked to a stop.
   * Revolute limits are lifted while spinning so a wheel can turn past ±180°.
   */
  setJointVelocities(vels: Record<string, number>) {
    this._spinning ??= new Set<string>();
    for (const [id, w] of Object.entries(vels)) {
      const entry = this.joints.get(id);
      if (!entry) continue;
      entry.joint.configureMotorModel?.(RAPIER.MotorModel.AccelerationBased);
      if (entry.type === 'revolute') entry.joint.setLimits?.(-1e30, 1e30); // wheel: no clamp
      entry.joint.configureMotorVelocity?.(w, this._motorDamping);
      this._spinning.add(id);
    }
    for (const id of [...this._spinning]) {
      if (id in vels) continue;                 // still spinning — leave it
      this._spinning.delete(id);
      this.joints.get(id)?.joint.configureMotorVelocity?.(0, this._motorDamping); // brake
    }
  }

  /** Advance exactly one fixed timestep (deterministic). */
  step() { this.world.step(this._events, this._hooks); }

  /**
   * Advance by real elapsed seconds using a FIXED-timestep accumulator, so the
   * trajectory is identical regardless of frame rate (and reproducible). Returns the
   * number of fixed steps taken. Clamps the catch-up burst to avoid a spiral of death.
   */
  stepFor(elapsedSeconds: number): number {
    const dt = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
    this._accumulator += Math.min(dt, 0.25); // cap runaway catch-up (~60 steps max)
    let n = 0;
    while (this._accumulator >= FIXED_DT) {
      this.world.step(this._events, this._hooks);
      this._accumulator -= FIXED_DT;
      n++;
    }
    return n;
  }

  // ── Falling-box API ───────────────────────────────────────────────────────
  /** Spawn a dynamic box into the physics world; returns its handle. */
  spawnBox(pos: [number, number, number], half: [number, number, number], density: number): number {
    this._spawnedBoxes ??= new Map<number, any>();
    const rb = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(pos[0], pos[1], pos[2])
        .setLinearDamping(0.1)
        .setAngularDamping(0.3),
    );
    const col = RAPIER.ColliderDesc.cuboid(half[0], half[1], half[2]).setDensity(density);
    this.world.createCollider(col, rb);
    this._spawnedBoxes.set(rb.handle, rb);
    return rb.handle;
  }

  /** Current poses of all spawned boxes. */
  boxPoses(): Map<number, { pos: [number, number, number]; quat: [number, number, number, number] }> {
    const out = new Map<number, any>();
    if (!this._spawnedBoxes) return out;
    for (const [h, rb] of this._spawnedBoxes) {
      const t = rb.translation(), r = rb.rotation();
      out.set(h, { pos: [t.x, t.y, t.z] as [number,number,number], quat: [r.x, r.y, r.z, r.w] as [number,number,number,number] });
    }
    return out;
  }

  /** Remove a single spawned box by its handle. */
  removeBox(handle: number) {
    if (!this._spawnedBoxes) return;
    const rb = this._spawnedBoxes.get(handle);
    if (rb) { try { this.world.removeRigidBody(rb); } catch { /* ignore */ } this._spawnedBoxes.delete(handle); }
  }

  /** Remove all spawned boxes. */
  removeAllBoxes() {
    if (!this._spawnedBoxes) return;
    for (const rb of this._spawnedBoxes.values()) { try { this.world.removeRigidBody(rb); } catch { /* ignore */ } }
    this._spawnedBoxes.clear();
  }

  poses() {
    const out = new Map();
    for (const [id, rb] of this.bodies) {
      const t = rb.translation();
      const r = rb.rotation();
      const matrix = new THREE.Matrix4().compose(
        new THREE.Vector3(t.x, t.y, t.z),
        new THREE.Quaternion(r.x, r.y, r.z, r.w),
        new THREE.Vector3(1, 1, 1),
      );
      out.set(id, { position: [t.x, t.y, t.z], quaternion: [r.x, r.y, r.z, r.w], matrix });
    }
    return out;
  }

  dispose() { this.removeAllBoxes(); try { this._events?.free?.(); this.world.free?.(); } catch { /* ignore */ } }
}