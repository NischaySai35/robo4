/**
 * BoxWorld — a lightweight, stand-alone Jolt world used exclusively for the
 * "falling boxes" stress-test mode. The robot bodies are STATIC Jolt bodies
 * at their current FK pose (never move under physics; updateRobotPose()
 * teleports them via BodyInterface.SetPositionAndRotation when the arm is
 * dragged). Boxes are real independent dynamic bodies — no pre-declared
 * pool needed (that was an MJCF-specific workaround for a compiled model's
 * fixed topology; Jolt bodies are created/destroyed on demand).
 *
 * Impact detection: we track each box's speed before and after each physics
 * step. A speed drop > 0.4 m/s means the box hit something. We estimate the
 * impulsive torque at each joint along the chain from the struck body to the
 * root and write it to `extraContactTorques` — a module-level map the telemetry
 * chart reads each sample to show impact spikes.
 */
import * as THREE from 'three';
import { createJoltWorld, JOLT_LAYER_NON_MOVING, JOLT_LAYER_MOVING, type JoltWorld } from './joltLoader';
import { makeJoltShape } from './joltShapes';

/** Impact torques written here; read by LiveTelemetryChart; decay each step. */
export const extraContactTorques = new Map<string, number>(); // jointId -> N*m

const GRAVITY = 9.81;
const FIXED_DT = 1 / 120;

export class BoxWorld {
  [key: string]: any;

  static async create(doc: any, fk: any, groundY = -3.2) {
    const world = await createJoltWorld(GRAVITY);
    return new BoxWorld(world, doc, fk, groundY);
  }

  constructor(world: JoltWorld, doc: any, fk: any, groundY = -3.2) {
    const { Jolt, bodyInterface } = world;
    this._world = world;
    this._doc = doc;
    this._fk = fk;
    this._boxHandles = new Map<number, any>(); // handle -> Jolt Body
    this._nextBoxHandle = 1;
    this._prevSpeed = new Map<number, number>();
    this._acc = 0;

    // Ground
    const groundShape = new Jolt.BoxShapeSettings(new Jolt.Vec3(200, 0.1, 200), 0.02).Create().Get();
    const groundSettings = new Jolt.BodyCreationSettings(groundShape, new Jolt.RVec3(0, groundY, 0), Jolt.Quat.prototype.sIdentity(), Jolt.EMotionType_Static, JOLT_LAYER_NON_MOVING);
    const ground = bodyInterface.CreateBody(groundSettings);
    bodyInterface.AddBody(ground.GetID(), Jolt.EActivation_DontActivate);

    // Robot bodies: static, at their current FK pose.
    this._robotBodies = new Map<string, any>();
    for (const body of Object.values(doc.bodies) as any[]) {
      const w = fk.get(body.id);
      const p = w?.position ?? body.transform?.position ?? [0, 0, 0];
      const q = w?.quaternion ?? body.transform?.quaternion ?? [0, 0, 0, 1];
      const shape = makeJoltShape(Jolt, body, {});
      if (!shape) continue;
      const bs = new Jolt.BodyCreationSettings(shape, new Jolt.RVec3(p[0], p[1], p[2]), new Jolt.Quat(q[0], q[1], q[2], q[3]), Jolt.EMotionType_Static, JOLT_LAYER_NON_MOVING);
      const rb = bodyInterface.CreateBody(bs);
      bodyInterface.AddBody(rb.GetID(), Jolt.EActivation_DontActivate);
      this._robotBodies.set(body.id, rb);
    }

    // Precompute: bodyId -> ordered list of joint ids from body up to root (for torque chains)
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

  /** Update the (static) robot bodies' poses after the arm is moved (e.g. after a drag). */
  updateRobotPose(fk: any) {
    this._fk = fk;
    const Jolt = this._world.Jolt;
    for (const [bodyId, rb] of this._robotBodies) {
      const w = fk.get(bodyId);
      if (!w?.position) continue;
      const p = w.position, q = w.quaternion;
      this._world.bodyInterface.SetPositionAndRotation(
        rb.GetID(), new Jolt.RVec3(p[0], p[1], p[2]), new Jolt.Quat(q[0], q[1], q[2], q[3]), Jolt.EActivation_DontActivate,
      );
    }
  }

  spawnBox(pos: [number, number, number], half: [number, number, number], density: number): number {
    const Jolt = this._world.Jolt;
    const shape = new Jolt.BoxShapeSettings(new Jolt.Vec3(half[0], half[1], half[2]), 0.02).Create().Get();
    const bs = new Jolt.BodyCreationSettings(shape, new Jolt.RVec3(pos[0], pos[1], pos[2]), Jolt.Quat.prototype.sIdentity(), Jolt.EMotionType_Dynamic, JOLT_LAYER_MOVING);
    bs.set_mOverrideMassProperties(Jolt.EOverrideMassProperties_CalculateInertia);
    const mp = new Jolt.MassProperties();
    mp.set_mMass(density * (2 * half[0]) * (2 * half[1]) * (2 * half[2]));
    bs.set_mMassPropertiesOverride(mp);
    bs.set_mRestitution(0.42);
    bs.set_mFriction(0.65);
    const rb = this._world.bodyInterface.CreateBody(bs);
    this._world.bodyInterface.AddBody(rb.GetID(), Jolt.EActivation_Activate);
    const handle = this._nextBoxHandle++;
    this._boxHandles.set(handle, rb);
    this._prevSpeed.set(handle, 0);
    return handle;
  }

  stepFor(dt: number) {
    this._acc += Math.min(dt, 0.1);

    const pre = new Map<number, number>();
    for (const [h, rb] of this._boxHandles) {
      const v = rb.GetLinearVelocity();
      pre.set(h, Math.sqrt(v.GetX() ** 2 + v.GetY() ** 2 + v.GetZ() ** 2));
    }

    let n = 0;
    while (this._acc >= FIXED_DT && n++ < 8) { this._world.jolt.Step(FIXED_DT, 1); this._acc -= FIXED_DT; }

    for (const [k, v] of extraContactTorques) {
      const next = v * 0.65;
      if (Math.abs(next) < 0.005) extraContactTorques.delete(k);
      else extraContactTorques.set(k, next);
    }

    for (const [h, rb] of this._boxHandles) {
      const vPre = pre.get(h) ?? 0;
      const v = rb.GetLinearVelocity();
      const vPost = Math.sqrt(v.GetX() ** 2 + v.GetY() ** 2 + v.GetZ() ** 2);
      const dv = vPre - vPost;
      if (dv < 0.4) continue;

      const p = rb.GetPosition();
      const boxP = new THREE.Vector3(p.GetX(), p.GetY(), p.GetZ());
      let nearId = ''; let nearDist = Infinity;
      for (const [bid] of this._chainOf) {
        const w = this._fk.get(bid);
        if (!w?.position) continue;
        const d = boxP.distanceTo(new THREE.Vector3(...w.position));
        if (d < nearDist) { nearDist = d; nearId = bid; }
      }
      if (!nearId) continue;

      const mass = 1 / Math.max(1e-9, rb.GetMotionProperties().GetInverseMass());
      const impulse = mass * dv;

      for (const jid of this._chainOf.get(nearId) ?? []) {
        const j = this._doc.joints[jid]; if (!j) continue;
        const pw = this._fk.get(j.parentBodyId); if (!pw?.position) continue;
        const leverage = boxP.distanceTo(new THREE.Vector3(...pw.position));
        const extra = impulse * Math.max(0.05, leverage) * 0.4;
        extraContactTorques.set(jid, (extraContactTorques.get(jid) ?? 0) + extra);
      }
    }
  }

  boxPoses(): Map<number, { pos: [number, number, number]; quat: [number, number, number, number] }> {
    const out = new Map<number, any>();
    for (const [h, rb] of this._boxHandles) {
      // Extract every primitive immediately after each call — see dynamicSim.ts's
      // _readPoses() for why (WASM scratch-buffer reuse across sequential struct-valued
      // Jolt calls before either is read).
      const px = rb.GetPosition().GetX(), py = rb.GetPosition().GetY(), pz = rb.GetPosition().GetZ();
      const qx = rb.GetRotation().GetX(), qy = rb.GetRotation().GetY(), qz = rb.GetRotation().GetZ(), qw = rb.GetRotation().GetW();
      out.set(h, { pos: [px, py, pz], quat: [qx, qy, qz, qw] });
    }
    return out;
  }

  removeBox(handle: number) {
    const rb = this._boxHandles.get(handle);
    if (!rb) return;
    this._world.bodyInterface.RemoveBody(rb.GetID());
    this._world.bodyInterface.DestroyBody(rb.GetID());
    this._boxHandles.delete(handle);
    this._prevSpeed.delete(handle);
  }

  removeAllBoxes() {
    for (const h of [...this._boxHandles.keys()]) this.removeBox(h);
  }

  dispose() {
    this.removeAllBoxes();
    extraContactTorques.clear();
    try {
      for (const rb of this._robotBodies.values()) {
        this._world.bodyInterface.RemoveBody(rb.GetID());
        this._world.bodyInterface.DestroyBody(rb.GetID());
      }
      this._world.dispose();
    } catch { /* ignore */ }
  }
}
