/**
 * BoxWorld — a lightweight, stand-alone Rapier world used exclusively for the
 * "falling boxes" stress-test mode. The robot bodies are added as FIXED rigid
 * bodies (a frozen snapshot of the current FK pose) so the robot never moves
 * or springs. Only the spawned boxes are dynamic.
 *
 * Impact detection: we track each box's speed before and after each physics
 * step. A speed drop > 0.4 m/s means the box hit something. We estimate the
 * impulsive torque at each joint along the chain from the struck body to the
 * root and write it to `extraContactTorques` — a module-level map the telemetry
 * chart reads each sample to show impact spikes.
 */
import RAPIER from './physicsEngine';
import * as THREE from 'three';
import { makeColliderDesc } from './colliderFactory';

let _initPromise: any = null;
const ensureRapier = () => (_initPromise ??= RAPIER.init());

/** Impact torques written here; read by LiveTelemetryChart; decay each step. */
export const extraContactTorques = new Map<string, number>(); // jointId → N·m

export class BoxWorld {
  [key: string]: any;

  static async create(doc: any, fk: any, groundY = -3.2) {
    await ensureRapier();
    return new BoxWorld(doc, fk, groundY);
  }

  constructor(doc: any, fk: any, groundY = -3.2) {
    this.world  = new RAPIER.World(new RAPIER.Vector3(0, -9.81, 0));
    this._doc   = doc;
    this._fk    = fk;
    this._colBody   = new Map<number, string>(); // collider handle → bodyId
    this._boxes     = new Map<number, any>();    // rapier handle → RigidBody
    this._prevSpeed = new Map<number, number>(); // handle → speed before last step
    this._events    = new RAPIER.EventQueue(true);
    this._acc       = 0;

    // Ground
    const g = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, groundY, 0));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(200, 0.1, 200), g);

    this._robotBodies = new Map<string, any>(); // bodyId → RigidBody (FIXED)

    // Robot bodies → FIXED at their current FK pose (can be updated via updateRobotPose)
    for (const body of Object.values(doc.bodies) as any[]) {
      const w = fk.get(body.id);
      const p = w?.position ?? body.transform?.position ?? [0, 0, 0];
      const q = w?.quaternion ?? body.transform?.quaternion ?? [0, 0, 0, 1];
      const rb = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed()
          .setTranslation(p[0], p[1], p[2])
          .setRotation({ x: q[0], y: q[1], z: q[2], w: q[3] }),
      );
      const col = makeColliderDesc(body, { hullPoints: null });
      if (col) {
        const c = this.world.createCollider(col, rb);
        this._colBody.set(c.handle, body.id);
      }
      this._robotBodies.set(body.id, rb);
    }

    // Precompute: bodyId → ordered list of joint ids from body up to root
    const childJoint = new Map<string, any>();
    for (const j of Object.values(doc.joints) as any[]) childJoint.set(j.childBodyId, j);
    this._chainOf = new Map<string, string[]>();
    for (const body of Object.values(doc.bodies) as any[]) {
      const chain: string[] = [];
      let cur = body.id; let guard = 0;
      while (guard++ < 32) {
        const j = childJoint.get(cur); if (!j) break;
        chain.push(j.id); cur = j.parentBodyId;
      }
      this._chainOf.set(body.id, chain);
    }
  }

  /** Update fixed robot body positions after the arm is moved (e.g. after a drag). */
  updateRobotPose(fk: any) {
    this._fk = fk;
    for (const [bodyId, rb] of this._robotBodies) {
      const w = fk.get(bodyId);
      if (!w?.position) continue;
      const p = w.position, q = w.quaternion;
      try {
        rb.setTranslation({ x: p[0], y: p[1], z: p[2] }, true);
        rb.setRotation({ x: q[0], y: q[1], z: q[2], w: q[3] }, true);
      } catch { /* body may have been removed */ }
    }
  }

  spawnBox(pos: [number, number, number], half: [number, number, number], density: number): number {
    const rb = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(pos[0], pos[1], pos[2])
        .setLinearDamping(0.12)
        .setAngularDamping(0.3),
    );
    const col = RAPIER.ColliderDesc.cuboid(half[0], half[1], half[2])
      .setDensity(density)
      .setRestitution(0.42)   // ~4% elastic bounce — visually satisfying without chaos
      .setFriction(0.65);
    this.world.createCollider(col, rb);
    this._boxes.set(rb.handle, rb);
    this._prevSpeed.set(rb.handle, 0);
    return rb.handle;
  }

  stepFor(dt: number) {
    const FIXED_DT = 1 / 120;
    this._acc += Math.min(dt, 0.1);

    // Snapshot speeds BEFORE stepping
    const pre = new Map<number, number>();
    for (const [h, rb] of this._boxes) {
      const v = rb.linvel(); pre.set(h, Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z));
    }

    let n = 0;
    while (this._acc >= FIXED_DT && n++ < 8) {
      this.world.step(this._events);
      this._acc -= FIXED_DT;
    }

    // Decay existing impact torques
    for (const [k, v] of extraContactTorques) {
      const next = v * 0.65;
      if (Math.abs(next) < 0.005) extraContactTorques.delete(k);
      else extraContactTorques.set(k, next);
    }

    // Detect impacts: speed drop ≥ 0.4 m/s = box hit something
    for (const [h, rb] of this._boxes) {
      const vPre = pre.get(h) ?? 0;
      const vv   = rb.linvel();
      const vPost = Math.sqrt(vv.x * vv.x + vv.y * vv.y + vv.z * vv.z);
      const dv   = vPre - vPost;
      if (dv < 0.4) continue;

      // Find nearest robot body centroid to the box position
      const t = rb.translation();
      const boxP = new THREE.Vector3(t.x, t.y, t.z);
      let nearId = ''; let nearDist = Infinity;
      for (const [bid] of this._chainOf) {
        const w = this._fk.get(bid);
        if (!w?.position) continue;
        const d = boxP.distanceTo(new THREE.Vector3(...w.position));
        if (d < nearDist) { nearDist = d; nearId = bid; }
      }
      if (!nearId) continue;

      const mass = (rb.mass?.() as number) ?? 1;
      const impulse = mass * dv; // N·s

      // Add impulsive torque at every joint up the chain
      for (const jid of this._chainOf.get(nearId) ?? []) {
        const j  = this._doc.joints[jid]; if (!j) continue;
        const pw = this._fk.get(j.parentBodyId); if (!pw?.position) continue;
        const leverage = boxP.distanceTo(new THREE.Vector3(...pw.position));
        const extra = impulse * Math.max(0.05, leverage) * 0.4;
        extraContactTorques.set(jid, (extraContactTorques.get(jid) ?? 0) + extra);
      }
    }
  }

  boxPoses(): Map<number, { pos: [number, number, number]; quat: [number, number, number, number] }> {
    const out = new Map();
    for (const [h, rb] of this._boxes) {
      const t = rb.translation(), r = rb.rotation();
      out.set(h, { pos: [t.x, t.y, t.z] as [number, number, number], quat: [r.x, r.y, r.z, r.w] as [number, number, number, number] });
    }
    return out;
  }

  removeBox(handle: number) {
    const rb = this._boxes.get(handle);
    if (rb) { try { this.world.removeRigidBody(rb); } catch { /* ignore */ } this._boxes.delete(handle); this._prevSpeed.delete(handle); }
  }

  removeAllBoxes() {
    for (const rb of this._boxes.values()) try { this.world.removeRigidBody(rb); } catch { /* ignore */ }
    this._boxes.clear(); this._prevSpeed.clear();
  }

  dispose() {
    this.removeAllBoxes();
    extraContactTorques.clear();
    try { this._events?.free?.(); this.world.free?.(); } catch { /* ignore */ }
  }
}
