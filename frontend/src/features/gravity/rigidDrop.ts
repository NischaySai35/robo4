/**
 * RigidTumbleSim — LIVE rigid-body tumble of the whole robot under gravity.
 *
 * The connected model is fused into ONE compound Rapier rigid body (a collider per body at
 * its current world offset) and dropped onto a ground plane. Unlike a canned interpolation,
 * this is STEPPED in real time — the caller advances it each frame and reads the live rigid
 * transform, so you see the actual fall, contact, bounce and tumble, then it settles. Joints
 * stay fixed (one rigid piece, no sagging).
 */
import * as THREE from 'three';
import RAPIER from '@/viewport/physicsEngine';
import { makeColliderDesc } from '@/viewport/colliderFactory';
import { initPhysics } from '@/robotics/rl/physicsWorld';
import type { Document } from '@/core/model/index';

export type FK = Map<string, { position: number[]; quaternion: number[] }>;

/** A drivable wheel: the end-lock body acting as a wheel, its spin axle, and cylinder size. */
export interface WheelDesc { jointId: string; bodyId: string; axis: [number, number, number]; radius: number; halfLen: number }
/** Live spin lookup: signed angular speed (rad/s) for a wheel joint, 0 if not spinning. */
export type DriveOf = (jointId: string) => number;

// Gentler than real 9.81 m/s² — the modules are small, so full gravity looks too fast/snappy.
// Raise toward 9.81 for a heavier feel, lower for a floatier, slower fall.
const GRAVITY = 4.0;

export class RigidTumbleSim {
  private world: any;
  private rb: any;
  private startInv = new THREE.Matrix4();
  private _acc = 0;
  private _settledFor = 0;

  static async create(doc: Document, fk: FK, groundY: number, hullPoints?: (id: string) => Float32Array | null): Promise<RigidTumbleSim | null> {
    await initPhysics();
    const bodies = Object.values(doc.bodies);
    if (!bodies.length) return null;

    const pose = (id: string) => {
      const w = fk.get(id); const t = doc.bodies[id].transform;
      return { p: new THREE.Vector3(...(w?.position ?? t.position)), q: new THREE.Quaternion(...(w?.quaternion ?? t.quaternion)) };
    };
    const origin = new THREE.Vector3();
    for (const b of bodies) origin.add(pose(b.id).p);
    origin.multiplyScalar(1 / bodies.length);

    const world = new RAPIER.World(new RAPIER.Vector3(0, -GRAVITY, 0));
    const ground = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, groundY - 0.05, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(200, 0.05, 200).setRestitution(0.25).setFriction(0.85), ground);

    const rb = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(origin.x, origin.y, origin.z));
    let n = 0;
    for (const b of bodies) {
      // Pass the mesh's convex-hull points so mesh modules collide with their real hull
      // (tight wrap) instead of a crude bounding box — otherwise you get a visible gap.
      const cd = makeColliderDesc(b, { hullPoints: hullPoints?.(b.id) ?? null });
      if (!cd) continue;
      const { p, q } = pose(b.id);
      const rel = p.clone().sub(origin);
      cd.setTranslation(rel.x, rel.y, rel.z);
      cd.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
      cd.setRestitution(0.2).setFriction(0.8);
      world.createCollider(cd, rb);
      n++;
    }
    if (n === 0) { world.free(); return null; }
    // A tiny random spin so the fall looks natural/unpredictable rather than perfectly planar.
    rb.setAngvel({ x: (Math.random() - 0.5) * 0.7, y: (Math.random() - 0.5) * 0.4, z: (Math.random() - 0.5) * 0.7 }, true);

    const sim = new RigidTumbleSim();
    sim.world = world;
    sim.rb = rb;
    sim.startInv = new THREE.Matrix4().compose(origin, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)).invert();
    return sim;
  }

  /** Advance real-time by dt (fixed 60 Hz substeps) and return the current world rigid delta. */
  step(dt: number): THREE.Matrix4 {
    this._acc += Math.min(0.1, dt);
    const H = 1 / 60;
    let steps = 0;
    while (this._acc >= H && steps < 8) { this.world.step(); this._acc -= H; steps++; }
    const lv = this.rb.linvel(), av = this.rb.angvel();
    if (Math.hypot(lv.x, lv.y, lv.z) < 0.03 && Math.hypot(av.x, av.y, av.z) < 0.06) this._settledFor += dt;
    else this._settledFor = 0;
    const t = this.rb.translation(), r = this.rb.rotation();
    const finalM = new THREE.Matrix4().compose(
      new THREE.Vector3(t.x, t.y, t.z),
      new THREE.Quaternion(r.x, r.y, r.z, r.w),
      new THREE.Vector3(1, 1, 1),
    );
    return finalM.multiply(this.startInv);
  }

  /** True once the body has been at rest for a moment. */
  settled(): boolean { return this._settledFor > 0.4; }

  dispose() { try { this.world?.free(); } catch { /* already freed */ } this.world = null; }
}
