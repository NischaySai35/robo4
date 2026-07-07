/**
 * CarDriveSim — REAL vehicle drive of a modular model under gravity, using Rapier's built-in
 * DynamicRayCastVehicleController (the same approach web games use for cars).
 *
 * The ENTIRE model is fused into ONE rigid CHASSIS (a collider per body at its world offset) so
 * the assembled shape is 100% preserved and can never deform. Each end-lock foot becomes a
 * ray-cast WHEEL (a suspension ray + engine force), NOT a physical spinning body — which is what
 * makes it rock-solid stable (no joint explosions, no collider grinding). Spinning a wheel CW/CCW
 * applies engine force along its rolling direction; friction rolls the chassis. Differential
 * left/right force steers it. A real ground plane sits under everything.
 *
 * We never set velocities directly; the controller applies proper suspension + traction forces
 * and we just read back the chassis pose.
 */
import * as THREE from 'three';
import RAPIER from '@/viewport/physicsEngine';
import { makeColliderDesc } from '@/viewport/colliderFactory';
import { applyDeterministicParams } from '@/viewport/physicsConfig';
import { initPhysics } from '@/robotics/rl/physicsWorld';
import type { Document } from '@/core/model/index';
import type { FK, WheelDesc, DriveOf } from './rigidDrop';

const SIM_DT = 1 / 120;
const GRAVITY = 9.81;
const GROUND_FRICTION = 1.2;
const SUSPENSION_STIFFNESS = 20;
const FRICTION_SLIP = 40;       // wheel grip (higher = more traction, less slip)
const FORCE_PER_RADPS = 0.06;   // engine force (N) per rad/s of commanded wheel speed
const BRAKE_IMPULSE = 2;        // holds the car still when no wheel is spinning

const DOWN = { x: 0, y: -1, z: 0 };

export class CarDriveSim {
  private world: any;
  private chassis: any;
  private vehicle: any;
  private chassisStartInv = new THREE.Matrix4();
  private _acc = 0;
  private _wheelJointIds: string[] = [];  // wheel index → its motor jointId

  static async create(
    doc: Document, fk: FK, groundY: number,
    hullPoints: ((id: string) => Float32Array | null) | undefined,
    wheels: WheelDesc[],
  ): Promise<CarDriveSim | null> {
    await initPhysics();
    const bodies = Object.values(doc.bodies);
    if (!bodies.length) return null;

    const pose = (id: string) => {
      const w = fk.get(id); const t = doc.bodies[id].transform;
      return { p: new THREE.Vector3(...(w?.position ?? t.position)), q: new THREE.Quaternion(...(w?.quaternion ?? t.quaternion)) };
    };

    const world = new RAPIER.World(new RAPIER.Vector3(0, -GRAVITY, 0));
    applyDeterministicParams(world, SIM_DT);
    world.integrationParameters.numSolverIterations = 12;

    // Real, thick floor.
    const ground = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, groundY - 1, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(500, 1, 500).setFriction(GROUND_FRICTION).setRestitution(0), ground);

    // Chassis = every NON-wheel body fused into one dynamic rigid body (shape preserved). The
    // wheel (endlock) bodies get NO collider — they're the ray-cast wheels — so they can't rest
    // their own colliders on the floor and fight the suspension. They still move with the chassis.
    const wheelBodyIds = new Set(wheels.map((w) => w.bodyId));
    const chassisBodies = bodies.filter((b) => !wheelBodyIds.has(b.id));
    const massBodies = chassisBodies.length ? chassisBodies : bodies; // fall back if all are wheels
    const cOrigin = new THREE.Vector3();
    for (const b of massBodies) cOrigin.add(pose(b.id).p);
    cOrigin.multiplyScalar(1 / massBodies.length);
    const chassis = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(cOrigin.x, cOrigin.y, cOrigin.z)
        .setLinearDamping(0.2).setAngularDamping(0.4).setCcdEnabled(true),
    );
    let nc = 0;
    for (const b of massBodies) {
      const cd = makeColliderDesc(b, { hullPoints: hullPoints?.(b.id) ?? null });
      if (!cd) continue;
      const { p, q } = pose(b.id);
      const rel = p.clone().sub(cOrigin);
      cd.setTranslation(rel.x, rel.y, rel.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }).setFriction(0.4).setRestitution(0).setDensity(1000);
      world.createCollider(cd, chassis);
      nc++;
    }
    if (nc === 0) { world.free(); return null; }

    const sim = new CarDriveSim();
    sim.world = world;
    sim.chassis = chassis;
    sim.chassisStartInv = new THREE.Matrix4().compose(cOrigin, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)).invert();

    // A common horizontal axle so every wheel rolls the same way (differential force steers).
    const axle = new THREE.Vector3();
    for (const w of wheels) {
      const aw = new THREE.Vector3(...w.axis).applyQuaternion(pose(w.bodyId).q); aw.y = 0;
      if (aw.lengthSq() > 1e-4) axle.add(aw.normalize());
    }
    if (axle.lengthSq() < 1e-4) axle.set(1, 0, 0); // all axles vertical → default sideways
    axle.normalize();

    const vehicle = world.createVehicleController(chassis);
    for (const w of wheels) {
      const conn = pose(w.bodyId).p.clone().sub(cOrigin);      // endlock centre in chassis-local
      const idx = sim._wheelJointIds.length;
      vehicle.addWheel(
        { x: conn.x, y: conn.y, z: conn.z },
        DOWN,
        { x: axle.x, y: axle.y, z: axle.z },
        Math.max(0.005, w.radius * 0.6),                        // suspension rest length
        Math.max(0.01, w.radius),                               // wheel radius
      );
      vehicle.setWheelSuspensionStiffness(idx, SUSPENSION_STIFFNESS);
      vehicle.setWheelFrictionSlip(idx, FRICTION_SLIP);
      sim._wheelJointIds.push(w.jointId);
    }
    sim.vehicle = vehicle;
    return sim;
  }

  /** Advance real time; each spinning wheel applies engine force (dir·rpm→force). Returns the
   *  chassis world delta to apply to every body (it's one rigid piece). */
  step(dt: number, driveOf?: DriveOf): { chassisDelta: THREE.Matrix4 } {
    this._acc += Math.min(0.1, dt);
    let steps = 0;
    while (this._acc >= SIM_DT && steps < 16) {
      let anyDrive = false;
      this._wheelJointIds.forEach((jid, i) => {
        const w = driveOf ? driveOf(jid) : 0;      // rad/s (signed)
        if (w !== 0) anyDrive = true;
        this.vehicle.setWheelEngineForce(i, w * FORCE_PER_RADPS);
        this.vehicle.setWheelBrake(i, w === 0 ? BRAKE_IMPULSE : 0); // idle wheels brake so it doesn't creep
      });
      if (anyDrive) this.chassis.wakeUp?.();
      this.vehicle.updateVehicle(SIM_DT, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC); // wheel rays hit only the fixed floor
      this.world.step();
      this._acc -= SIM_DT;
      steps++;
    }
    const t = this.chassis.translation(), r = this.chassis.rotation();
    const chassisDelta = new THREE.Matrix4()
      .compose(new THREE.Vector3(t.x, t.y, t.z), new THREE.Quaternion(r.x, r.y, r.z, r.w), new THREE.Vector3(1, 1, 1))
      .multiply(this.chassisStartInv);
    return { chassisDelta };
  }

  dispose() { try { this.world?.free(); } catch { /* already freed */ } this.world = null; }
}
