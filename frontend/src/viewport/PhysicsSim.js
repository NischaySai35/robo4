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
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { GeometryType } from '@/core/model/index.js';

let _initPromise = null;
const ensureRapier = () => (_initPromise ??= RAPIER.init());

const IDENT_Q = { x: 0, y: 0, z: 0, w: 1 };

export class PhysicsSim {
  static async create(doc, fk, opts) {
    await ensureRapier();
    return new PhysicsSim(doc, fk, opts);
  }

  constructor(doc, fk, { groundY = -3.2 } = {}) {
    this.world = new RAPIER.World(new RAPIER.Vector3(0, -9.81, 0));
    this.bodies = new Map(); // bodyId -> RigidBody

    // Ground
    const ground = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, groundY, 0));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(200, 0.1, 200), ground);

    // Bodies
    for (const body of Object.values(doc.bodies)) {
      const w = fk?.get(body.id);
      const p = w ? w.position : body.transform.position;
      const q = w ? w.quaternion : body.transform.quaternion;
      const rb = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(p[0], p[1], p[2])
          .setRotation({ x: q[0], y: q[1], z: q[2], w: q[3] }),
      );
      const col = this._colliderDesc(body, doc);
      if (col) { col.setDensity(this._density(body, doc)); this.world.createCollider(col, rb); }
      this.bodies.set(body.id, rb);
    }

    // Joints
    for (const j of Object.values(doc.joints)) {
      const parent = this.bodies.get(j.parentBodyId);
      const child = this.bodies.get(j.childBodyId);
      if (!parent || !child) continue;
      const data = this._jointData(j);
      if (data) this.world.createImpulseJoint(data, parent, child, true);
    }
  }

  _density(body, doc) {
    const m = body.visual?.materialId ? doc.materials[body.visual.materialId] : null;
    return m?.density ?? 1000;
  }

  _colliderDesc(body) {
    const g = body.visual?.geometry ?? {};
    const s = body.transform.scale ?? [1, 1, 1];
    switch (g.type) {
      case GeometryType.SPHERE:
        return RAPIER.ColliderDesc.ball((g.radius ?? 0.5) * Math.max(Math.abs(s[0]), Math.abs(s[1]), Math.abs(s[2])));
      case GeometryType.BOX: {
        const sz = g.size ?? [1, 1, 1];
        return RAPIER.ColliderDesc.cuboid(Math.abs(sz[0] * s[0]) / 2, Math.abs(sz[1] * s[1]) / 2, Math.abs(sz[2] * s[2]) / 2);
      }
      case GeometryType.CYLINDER:
      case GeometryType.CAPSULE: {
        const r = g.radius ?? 0.5, l = g.length ?? 1;
        return RAPIER.ColliderDesc.cuboid(Math.abs(r * s[0]), Math.abs(r * s[1]), Math.abs(l * s[2]) / 2);
      }
      default: // mesh: bbox approximation
        return RAPIER.ColliderDesc.cuboid(0.4 * Math.abs(s[0]), 0.4 * Math.abs(s[1]), 0.4 * Math.abs(s[2]));
    }
  }

  _jointData(j) {
    const o = j.origin?.position ?? [0, 0, 0];
    const a1 = { x: o[0], y: o[1], z: o[2] };
    const a2 = { x: 0, y: 0, z: 0 };
    const ax = { x: (j.axis ?? [0, 0, 1])[0], y: (j.axis ?? [0, 0, 1])[1], z: (j.axis ?? [0, 0, 1])[2] };
    switch (j.type) {
      case 'revolute':
      case 'continuous': return RAPIER.JointData.revolute(a1, a2, ax);
      case 'prismatic': return RAPIER.JointData.prismatic(a1, a2, ax);
      default: return RAPIER.JointData.fixed(a1, IDENT_Q, a2, IDENT_Q);
    }
  }

  step() { this.world.step(); }

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

  dispose() { try { this.world.free?.(); } catch { /* ignore */ } }
}
