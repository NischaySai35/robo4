/**
 * RigidTumbleSim — LIVE rigid-body tumble of the whole robot under gravity.
 *
 * The connected model is fused into ONE compound rigid body: every model
 * body's shape becomes a member of a single Jolt StaticCompoundShape at its
 * local offset, attached to one dynamic Jolt body. Dropped onto a ground
 * plane and stepped in real time. Joints stay fixed (one rigid piece, no
 * sagging) — there simply are no joints in this sim, by design.
 */
import * as THREE from 'three';
import { createJoltWorld, JOLT_LAYER_NON_MOVING, JOLT_LAYER_MOVING, type JoltWorld } from '@/viewport/joltLoader';
import { makeJoltShapeSettings } from '@/viewport/joltShapes';
import type { Document } from '@/core/model/index';

export type FK = Map<string, { position: number[]; quaternion: number[] }>;

/** Live spin lookup: signed angular speed (rad/s) for a wheel joint, 0 if not spinning. */
export type DriveOf = (jointId: string) => number;

// Gentler than real 9.81 m/s^2 -- the modules are small, so full gravity looks too fast/snappy.
const GRAVITY = 4.0;

export class RigidTumbleSim {
  private world: JoltWorld | null = null;
  private body: any = null;
  private startInv = new THREE.Matrix4();
  private _acc = 0;
  private _settledFor = 0;

  static async create(doc: Document, fk: FK, groundY: number, hullPoints?: (id: string) => Float32Array | null): Promise<RigidTumbleSim | null> {
    const bodies = Object.values(doc.bodies);
    if (!bodies.length) return null;

    const world = await createJoltWorld(GRAVITY);
    const { Jolt, bodyInterface } = world;

    const pose = (id: string) => {
      const w = fk.get(id); const t = doc.bodies[id].transform;
      return { p: new THREE.Vector3(...(w?.position ?? t.position) as [number, number, number]), q: new THREE.Quaternion(...(w?.quaternion ?? t.quaternion) as [number, number, number, number]) };
    };
    const origin = new THREE.Vector3();
    for (const b of bodies) origin.add(pose(b.id).p);
    origin.multiplyScalar(1 / bodies.length);

    // Ground
    const groundShape = new Jolt.BoxShapeSettings(new Jolt.Vec3(200, 0.05, 200), 0.02).Create().Get();
    const groundSettings = new Jolt.BodyCreationSettings(groundShape, new Jolt.RVec3(0, groundY - 0.05, 0), Jolt.Quat.prototype.sIdentity(), Jolt.EMotionType_Static, JOLT_LAYER_NON_MOVING);
    groundSettings.set_mFriction(1.0); // Jolt's default ~0.2 is near-frictionless; give the tumble something to settle on.
    const ground = bodyInterface.CreateBody(groundSettings);
    bodyInterface.AddBody(ground.GetID(), Jolt.EActivation_DontActivate);

    const compound = new Jolt.StaticCompoundShapeSettings();
    let n = 0;
    for (const b of bodies) {
      const hp = hullPoints?.(b.id) ?? null;
      const settings = makeJoltShapeSettings(Jolt, b, { hullPoints: hp });
      if (!settings) continue;
      const { p, q } = pose(b.id);
      const rel = p.clone().sub(origin);
      compound.AddShape(new Jolt.Vec3(rel.x, rel.y, rel.z), new Jolt.Quat(q.x, q.y, q.z, q.w), settings, 0);
      n++;
    }
    if (n === 0) { world.dispose(); return null; }

    const compoundResult = compound.Create();
    if (!compoundResult.IsValid()) { world.dispose(); return null; }

    const bodySettings = new Jolt.BodyCreationSettings(
      compoundResult.Get(), new Jolt.RVec3(origin.x, origin.y, origin.z), Jolt.Quat.prototype.sIdentity(), Jolt.EMotionType_Dynamic, JOLT_LAYER_MOVING,
    );
    bodySettings.set_mFriction(0.6);
    const rb = bodyInterface.CreateBody(bodySettings);
    bodyInterface.AddBody(rb.GetID(), Jolt.EActivation_Activate);

    // Tiny random spin so the fall looks natural rather than perfectly planar.
    rb.SetAngularVelocity(new Jolt.Vec3((Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.7));

    const sim = new RigidTumbleSim();
    sim.world = world;
    sim.body = rb;
    sim.startInv = new THREE.Matrix4().compose(origin, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)).invert();
    return sim;
  }

  /** Advance real-time by dt (fixed 60 Hz substeps) and return the current world rigid delta. */
  step(dt: number): THREE.Matrix4 {
    this._acc += Math.min(0.1, dt);
    const H = 1 / 60;
    let steps = 0;
    while (this._acc >= H && steps < 8) { this.world!.jolt.Step(H, 1); this._acc -= H; steps++; }

    // Extract every primitive IMMEDIATELY after each Jolt call — some WASM bindings reuse a
    // shared scratch buffer for struct-valued returns, so holding GetLinearVelocity()'s
    // result while calling GetAngularVelocity() (etc.) before reading it back can silently
    // read the wrong value (verified live in dynamicSim.ts).
    const lvx = this.body.GetLinearVelocity().GetX(), lvy = this.body.GetLinearVelocity().GetY(), lvz = this.body.GetLinearVelocity().GetZ();
    const avx = this.body.GetAngularVelocity().GetX(), avy = this.body.GetAngularVelocity().GetY(), avz = this.body.GetAngularVelocity().GetZ();
    if (Math.hypot(lvx, lvy, lvz) < 0.03 && Math.hypot(avx, avy, avz) < 0.06) this._settledFor += dt;
    else this._settledFor = 0;

    const tx = this.body.GetPosition().GetX(), ty = this.body.GetPosition().GetY(), tz = this.body.GetPosition().GetZ();
    const rx = this.body.GetRotation().GetX(), ry = this.body.GetRotation().GetY(), rz = this.body.GetRotation().GetZ(), rw = this.body.GetRotation().GetW();
    const finalM = new THREE.Matrix4().compose(
      new THREE.Vector3(tx, ty, tz),
      new THREE.Quaternion(rx, ry, rz, rw),
      new THREE.Vector3(1, 1, 1),
    );
    return finalM.multiply(this.startInv);
  }

  /** True once the body has been at rest for a moment. */
  settled(): boolean { return this._settledFor > 0.4; }

  dispose() {
    try {
      if (this.body && this.world) {
        this.world.bodyInterface.RemoveBody(this.body.GetID());
        this.world.bodyInterface.DestroyBody(this.body.GetID());
      }
      this.world?.dispose();
    } catch { /* already freed */ }
    this.world = null;
  }
}
