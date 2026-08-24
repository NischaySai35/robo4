/**
 * wheelContact — a slip-based tire/contact model for driven wheels, replacing rigid-body
 * contact for those specific shapes.
 *
 * WHY THIS EXISTS (the short version: nobody simulates wheels with rigid contact).
 *
 * A wheel is the one shape a general rigid-body contact solver handles badly, and it fails
 * for structural reasons that no amount of friction/mass/damping tuning can fix:
 *
 *  • DEGENERATE MANIFOLD. A cylinder on a plane touches along a LINE; the narrow phase
 *    (GJK/EPA) collapses that to 1-2 contact points which flicker and jump position as the
 *    wheel rotates. A box gets 4 stable points and rests solidly. A wheel gets a contact
 *    whose location — and therefore whose torque arm — changes every single frame. That is
 *    the chatter, and it is inherent to representing a line contact with point constraints.
 *  • NO CONTACT PATCH. A real tire's patch deforms, which is what produces rolling
 *    resistance (pressure distribution shifts forward), lateral force proportional to slip
 *    angle (cornering stiffness), and self-aligning torque. A rigid point contact has NONE
 *    of these, so a wheel has zero directional self-stabilization and slides sideways
 *    freely — the "skatey" feel.
 *  • STICK-SLIP. A stiff velocity motor fighting a high-friction point contact catches,
 *    releases, and catches harder, injecting energy each cycle. dynamicSim.ts previously
 *    fought this by clamping motor torque to 1 N*m, which cured the oscillation by making
 *    the wheel too weak to drive properly.
 *  • DISCRETE-TIME FRICTION. The friction impulse uses contact-point velocity sampled at
 *    the START of the substep. For a small fast-spinning wheel at 60Hz that velocity changes
 *    substantially within one substep, so the impulse is systematically wrong.
 *
 * Note what is NOT on that list: "a point has zero area so it can't push." Coulomb friction
 * is area-independent (F <= mu*N, no area term), so a point contact can in principle
 * transmit full friction force. The problem is manifold stability and the missing patch
 * physics above, not the contact area itself.
 *
 * THE FIX, which is what every other engine does one layer above its contact solver
 * (PhysX PxVehicle, Unity WheelCollider, Unreal Chaos, Bullet btRaycastVehicle, Gazebo
 * wheel_slip): take the wheel OUT of the contact solver entirely and replace it with a
 * continuous force model — find the ground under the axle, apply a penalty normal force,
 * and derive tangential force from SLIP VELOCITY. Continuous forces have no impulse
 * stick-slip, no flickering manifold, and give real lateral stiffness.
 *
 * GROUND QUERY. dynamicSim's ground is a flat analytic plane at `groundY` (real terrain
 * collision is a documented gap there), so "cast a ray down from the axle" is arithmetic,
 * not a physics query. `groundHeightAt` is the single hook to replace when real terrain
 * lands — nothing else in this file needs to change for it.
 *
 * The math in `solveWheelContact` is pure (no Jolt types) so it can be unit-tested directly;
 * `WheelContactSolver` is the thin layer that reads/writes Jolt bodies.
 */
import * as THREE from 'three';

const GRAVITY = 9.81;

/** Penetration depth the normal spring is sized to produce under the wheel's static load. */
const TARGET_PENETRATION = 0.004; // 4mm
/** Normal spring damping ratio. 1.0 = critically damped: settles without bouncing or ringing. */
const NORMAL_DAMPING_RATIO = 1.0;
/** Hard ceiling on normal force, as a multiple of static load — stops a deep penetration
 *  (a bad frame, a teleport, a spawn overlap) from launching the robot into orbit. */
const MAX_NORMAL_LOAD_FACTOR = 8;
/** Coulomb limit for the tangential force. ~1.0 is rubber-on-concrete. */
const FRICTION_COEFFICIENT = 1.0;
/** Longitudinal slip stiffness, per unit of normal load (units: 1/(m/s)).
 *  Force = C * N * slip, so this is "how many newtons of drive per newton of load per m/s of
 *  slip". High = grips hard and saturates almost immediately (near-stick); the friction-circle
 *  clamp below is what actually bounds it, and the stability clamp bounds it again. */
const LONGITUDINAL_STIFFNESS = 12;
/** Lateral slip stiffness. Higher than longitudinal because a wheel should resist being
 *  pushed sideways much more strongly than it resists being driven — this is the cornering
 *  stiffness a rigid point contact completely lacks. */
const LATERAL_STIFFNESS = 20;
/** Rolling resistance coefficient (fraction of normal load opposing forward motion).
 *  ~0.015 is a hard wheel on a hard surface. Gives realistic coast-down instead of a wheel
 *  that rolls forever. */
const ROLLING_RESISTANCE = 0.015;
/** Below this slip speed, treat the contact as stuck and skip the tangential force entirely —
 *  avoids dividing by ~0 and avoids jittering a resting wheel with tiny alternating forces. */
const SLIP_EPSILON = 1e-4;

/** Ground height under a world XZ position. Flat plane today — the one hook to replace when
 *  real (heightfield/mesh) terrain collision lands in dynamicSim. */
export function groundHeightAt(_x: number, _z: number, groundY: number): number {
  return groundY;
}

export interface WheelContactInput {
  /** Wheel centre, world space. */
  centre: THREE.Vector3;
  /** Axle direction, world space, unit length. */
  axis: THREE.Vector3;
  radius: number;
  halfLen: number;
  groundY: number;
  /** Owning cluster's centre of mass, world space (force is applied to that rigid body). */
  comPos: THREE.Vector3;
  /** Owning cluster's linear velocity. */
  linVel: THREE.Vector3;
  /** Owning cluster's angular velocity. */
  angVel: THREE.Vector3;
  /**
   * Mass (kg) this wheel is responsible for holding up — its share of the WHOLE model's
   * weight, not just its own cluster's.
   *
   * Sizing the spring from the wheel cluster's own mass alone badly undersizes it: a driven
   * end-lock is a single-body cluster, but through its joints it carries a share of the whole
   * chassis, so the real load is many times its own weight and the wheel sinks until the
   * undersized spring catches up (measured: the mesh visibly clipping BELOW the floor).
   */
  supportedMass: number;
  /**
   * The actual mass (kg) of the rigid body the force is applied to — usually FAR smaller than
   * `supportedMass`, because a driven end-lock is a light single-body cluster holding up a
   * heavy chassis through its joints.
   *
   * Both are needed and they are not interchangeable. Stiffness must come from `supportedMass`
   * or the wheel sinks; the damping and force ceilings must come from THIS mass or the force
   * — correct for the load, but applied to a body a fraction of that mass — accelerates it
   * past equilibrium within a single step and the model shakes itself apart. (Measured: sizing
   * both from supportedMass tilted the test model and left one wheel 26mm high, the other 9mm
   * through the floor.)
   */
  bodyMass: number;
  /** Substep length, used for the stability clamps. */
  dt: number;
}

export interface WheelContactOutput {
  /** World-space point the force is applied at (the wheel's lowest point). */
  contactPoint: THREE.Vector3;
  /** Total force (normal + tangential) to apply at `contactPoint`. */
  force: THREE.Vector3;
  /** Spring compression (m). Equals TARGET_PENETRATION when carrying exactly the design load. */
  penetration: number;
  /** Gap from the RENDERED wheel surface to the ground (m). >0 floats, <0 clips through.
   *  This — not `penetration` — is what a visual "why isn't it touching" check should read. */
  surfaceGap: number;
  normalForce: number;
  /** Slip velocity along the rolling direction (m/s). ~0 = rolling without slipping. */
  slipLong: number;
  /** Slip velocity along the axle direction (m/s). ~0 = not sliding sideways. */
  slipLat: number;
  /** True when the tangential force hit the friction circle — the wheel is spinning/skidding. */
  saturated: boolean;
}

/**
 * Lowest point of a cylinder of the given radius/half-length, centred at the origin, with
 * the given axle direction — offset from the centre. Exact, not an approximation:
 * the extreme point in direction `down` is the axial extreme plus the radial extreme.
 */
export function lowestPointOffset(axis: THREE.Vector3, radius: number, halfLen: number): THREE.Vector3 {
  const down = new THREE.Vector3(0, -1, 0);
  const axialDot = down.dot(axis);
  // Axial extreme: go halfLen along whichever end of the axle points downward. Math.sign
  // returns 0 for a perfectly HORIZONTAL axle, which is exactly right and is the common case:
  // neither end of the axle is lower, the wheel touches along a line, and the midpoint of
  // that line is the correct representative contact point (it's where a real contact patch's
  // centroid would be). Do NOT coerce that 0 to 1 — that would offset a normal upright
  // wheel's contact point sideways by halfLen along its own axle, giving every drive force a
  // phantom torque arm that would steer the robot on its own.
  const offset = axis.clone().multiplyScalar(halfLen * Math.sign(axialDot));
  // Radial extreme: the component of `down` perpendicular to the axle, scaled to the radius.
  const radial = down.clone().sub(axis.clone().multiplyScalar(axialDot));
  if (radial.lengthSq() > 1e-12) {
    offset.add(radial.normalize().multiplyScalar(radius));
  } else {
    // Axle is vertical — the wheel is lying flat and its "lowest point" is a whole circle.
    // Any point on that circle is equally valid; pick a stable perpendicular so the choice
    // doesn't flicker frame to frame.
    const perp = Math.abs(axis.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    offset.add(perp.cross(axis).normalize().multiplyScalar(radius));
  }
  return offset;
}

/**
 * The whole tire model for one wheel, one substep. Returns null when the wheel is not
 * touching the ground (no force to apply).
 */
export function solveWheelContact(input: WheelContactInput): WheelContactOutput | null {
  const { centre, radius, halfLen, comPos, linVel, angVel, supportedMass, bodyMass, dt } = input;
  const axis = input.axis.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);

  const contactPoint = centre.clone().add(lowestPointOffset(axis, radius, halfLen));
  const ground = groundHeightAt(contactPoint.x, contactPoint.z, input.groundY);
  /** Signed gap from the wheel's RENDERED surface to the ground. >0 floats, <0 clips through. */
  const surfaceGap = contactPoint.y - ground;
  // The spring compresses through a TARGET_PENETRATION-deep compliance shell that sits ABOVE
  // the rendered surface, rather than below it. This is what makes the wheel look right: at
  // rest under its design load the spring is compressed by exactly TARGET_PENETRATION, which
  // now puts the rendered surface exactly ON the ground instead of TARGET_PENETRATION beneath
  // it. Measuring compression from the bare geometry instead left the mesh visibly sunk by the
  // full 4mm — physically "correct" for a rigid wheel, but this model's whole premise is that
  // a wheel deforms (that is where the contact patch comes from), so the deformation belongs
  // between the undeformed surface and the ground, exactly as it does on a real tire.
  const penetration = TARGET_PENETRATION - surfaceGap;
  if (penetration <= 0) return null; // airborne (more than one shell-depth clear of the ground)

  // Velocity of the material point of the body currently at the contact: v + omega x r.
  // This ALREADY includes the wheel's spin, because the wheel is rigidly part of its cluster
  // and the motor spins that cluster — which is exactly why slip can be read straight off it:
  // a wheel rolling without slipping has ~zero velocity at its contact point.
  const r = contactPoint.clone().sub(comPos);
  const pointVel = linVel.clone().add(new THREE.Vector3().crossVectors(angVel, r));

  // ── Normal force: penalty spring-damper, sized so static load rests at TARGET_PENETRATION ──
  const effMass = Math.max(1e-6, supportedMass);
  const ownMass = Math.max(1e-6, bodyMass);
  const staticLoad = effMass * GRAVITY;
  // Stiffness from the SUPPORTED load, so the wheel settles at TARGET_PENETRATION under it.
  const k = staticLoad / TARGET_PENETRATION;
  // Damping from the body actually being pushed, so it can never over-correct that body.
  const c = 2 * NORMAL_DAMPING_RATIO * Math.sqrt(k * ownMass);
  const compressionRate = -pointVel.dot(up); // >0 while sinking further in
  // Damping only resists compression. Letting it pull on rebound would suck the wheel back
  // toward the ground (a spring-damper that can pull is a magnet, not a contact).
  // Clamped so its impulse cannot reverse the compression it is damping: c*v*dt <= m*v.
  const damping = Math.min(
    c * Math.max(0, compressionRate),
    (ownMass * Math.max(0, compressionRate)) / Math.max(dt, 1e-6),
  );
  let normalForce = k * penetration + damping;
  normalForce = Math.min(normalForce, staticLoad * MAX_NORMAL_LOAD_FACTOR);
  normalForce = Math.max(0, normalForce);

  const force = up.clone().multiplyScalar(normalForce);

  // ── Tangential: ground-plane basis (rolling direction, axle direction) ──
  // forward = perpendicular to both the axle and the ground normal.
  const forward = new THREE.Vector3().crossVectors(axis, up);
  let slipLong = 0, slipLat = 0, saturated = false;
  if (forward.lengthSq() > 1e-8) {
    forward.normalize();
    // lateral = the axle direction flattened onto the ground plane.
    const lateral = new THREE.Vector3().crossVectors(up, forward).normalize();

    // Slip velocity = contact-point velocity projected onto the ground plane.
    const slip = pointVel.clone().sub(up.clone().multiplyScalar(pointVel.dot(up)));
    slipLong = slip.dot(forward);
    slipLat = slip.dot(lateral);

    const slipSpeed = Math.hypot(slipLong, slipLat);

    // Every tangential contribution is accumulated in the (forward, lateral) basis FIRST and
    // clamped once at the end. Clamping each term as it is added — in particular adding
    // rolling resistance after the friction circle — lets the total quietly exceed mu*N and,
    // on a light body, exceed what can be applied without reversing the very motion it
    // opposes. (Caught by wheelContact.test.ts, not by inspection.)
    let fx = 0, fy = 0;

    // Slip force: opposes slip, magnitude proportional to slip and to load.
    if (slipSpeed > SLIP_EPSILON) {
      fx += -LONGITUDINAL_STIFFNESS * normalForce * slipLong;
      fy += -LATERAL_STIFFNESS * normalForce * slipLat;
    }

    // Rolling resistance: opposes the direction of TRAVEL (not of slip), proportional to
    // load. Guarded by travel speed so it can't creep a stationary robot backwards.
    const travel = linVel.clone().sub(up.clone().multiplyScalar(linVel.dot(up)));
    const travelSpeed = travel.length();
    if (travelSpeed > SLIP_EPSILON) {
      const dir = travel.clone().divideScalar(travelSpeed);
      const rr = -ROLLING_RESISTANCE * normalForce;
      fx += dir.dot(forward) * rr;
      fy += dir.dot(lateral) * rr;
    }

    // Friction circle: total tangential force can never exceed mu*N, and longitudinal and
    // lateral SHARE that budget (spin a wheel hard enough and it loses its ability to resist
    // sideways push — real, and why this is one circle rather than two independent clamps).
    const maxFriction = FRICTION_COEFFICIENT * normalForce;
    let mag = Math.hypot(fx, fy);
    if (mag > maxFriction && mag > 0) {
      const s = maxFriction / mag;
      fx *= s; fy *= s;
      saturated = true;
      mag = maxFriction;
    }

    // Stability clamp: an explicit force integrated over dt must never REVERSE the motion it
    // opposes, or it oscillates — the same failure mode as the impulse solver's stick-slip,
    // reached from the other direction. Capped at exactly the impulse that brings the motion
    // to zero this substep: F*dt <= m_eff*v. Uses the LARGER of slip and travel speed because
    // the accumulated force opposes both (pure rolling has zero slip but nonzero travel, and
    // rolling resistance must still be allowed to act there).
    // Scaling down here can't violate the friction circle above, so applying it last is safe.
    const maxStable = (effMass * Math.max(slipSpeed, travelSpeed)) / Math.max(dt, 1e-6);
    if (mag > maxStable && mag > 0) {
      const s = maxStable / mag;
      fx *= s; fy *= s;
    }

    force.add(forward.clone().multiplyScalar(fx));
    force.add(lateral.clone().multiplyScalar(fy));
  }

  return { contactPoint, force, penetration, surfaceGap, normalForce, slipLong, slipLat, saturated };
}

/** One driven wheel, resolved against the Jolt cluster body that carries it. */
export interface WheelDesc {
  /** Model body id of the end-lock acting as a wheel (for diagnostics). */
  bodyId: string;
  /** Cluster this wheel is rigidly part of. */
  clusterKey: string;
  /** Wheel centre in the cluster's local frame. */
  localCentre: THREE.Vector3;
  /** Axle direction in the cluster's local frame. */
  localAxis: THREE.Vector3;
  radius: number;
  halfLen: number;
}

/**
 * Applies the tire model to Jolt bodies each substep. Holds no physics state of its own —
 * everything is re-derived from the body poses, so it stays correct across resets.
 */
export class WheelContactSolver {
  private _wheels: WheelDesc[] = [];
  /** Total mass of every dynamic cluster in the sim, shared across all wheels. */
  private _supportedMass = 0;
  /** Last solve's output per wheel, for diagnostics only. */
  private _last = new Map<string, WheelContactOutput | null>();

  add(desc: WheelDesc) {
    this._wheels.push(desc);
  }

  /**
   * Total mass the wheels collectively hold up (the whole model's dynamic mass). Call once
   * after every cluster is built; each wheel is sized for an equal share of it.
   */
  setSupportedMass(totalMass: number) {
    this._supportedMass = totalMass;
  }

  get count(): number { return this._wheels.length; }

  /**
   * Apply one substep of wheel forces. Call immediately BEFORE each physics step, so the
   * forces are integrated by that step (Jolt clears accumulated forces after every step).
   */
  apply(Jolt: any, bodyInterface: any, clusterBody: Map<string, any>, groundY: number, dt: number) {
    for (const w of this._wheels) {
      const rb = clusterBody.get(w.clusterKey);
      if (!rb) continue;

      // Extract every primitive IMMEDIATELY after its Jolt call and never hold a returned
      // wrapper across another Jolt call — this binding reuses scratch buffers for
      // struct-valued returns, a hazard dynamicSim.ts documents having hit for real.
      const px = rb.GetPosition().GetX(), py = rb.GetPosition().GetY(), pz = rb.GetPosition().GetZ();
      const qx = rb.GetRotation().GetX(), qy = rb.GetRotation().GetY(), qz = rb.GetRotation().GetZ(), qw = rb.GetRotation().GetW();
      const cx = rb.GetCenterOfMassPosition().GetX(), cy = rb.GetCenterOfMassPosition().GetY(), cz = rb.GetCenterOfMassPosition().GetZ();
      const lvx = rb.GetLinearVelocity().GetX(), lvy = rb.GetLinearVelocity().GetY(), lvz = rb.GetLinearVelocity().GetZ();
      const avx = rb.GetAngularVelocity().GetX(), avy = rb.GetAngularVelocity().GetY(), avz = rb.GetAngularVelocity().GetZ();
      const invMass = rb.GetMotionProperties?.()?.GetInverseMass?.() ?? 0;
      const ownMass = invMass > 0 ? 1 / invMass : 1;
      // Equal share of the whole model, falling back to this cluster's own mass if the total
      // was never supplied (a caller that forgot is better served by a too-soft wheel than a
      // divide-by-zero).
      const supportedMass = this._supportedMass > 0 ? this._supportedMass / this._wheels.length : ownMass;

      const quat = new THREE.Quaternion(qx, qy, qz, qw);
      const centre = w.localCentre.clone().applyQuaternion(quat).add(new THREE.Vector3(px, py, pz));
      const axis = w.localAxis.clone().applyQuaternion(quat).normalize();

      const out = solveWheelContact({
        centre, axis, radius: w.radius, halfLen: w.halfLen, groundY,
        comPos: new THREE.Vector3(cx, cy, cz),
        linVel: new THREE.Vector3(lvx, lvy, lvz),
        angVel: new THREE.Vector3(avx, avy, avz),
        supportedMass,
        bodyMass: ownMass,
        dt,
      });
      this._last.set(w.bodyId, out);
      if (!out) continue;

      // EActivation_Activate: a wheel resting on the ground is allowed to sleep, but the
      // moment it has a real force to apply it must be awake or the force silently does
      // nothing (the same sleep trap dynamicSim.ts hit with motor targets).
      bodyInterface.AddForce(
        rb.GetID(),
        new Jolt.Vec3(out.force.x, out.force.y, out.force.z),
        new Jolt.RVec3(out.contactPoint.x, out.contactPoint.y, out.contactPoint.z),
        Jolt.EActivation_Activate,
      );
    }
  }

  /** Human-readable per-wheel state for the 1Hz physics diagnostic. */
  describe(): string[] {
    const out: string[] = [];
    for (const w of this._wheels) {
      const s = this._last.get(w.bodyId);
      if (!s) { out.push(`${w.bodyId}:AIRBORNE`); continue; }
      out.push(
        `${w.bodyId}:N=${s.normalForce.toFixed(2)}N gap=${(s.surfaceGap * 1000).toFixed(1)}mm ` +
        `compress=${(s.penetration * 1000).toFixed(1)}mm ` +
        `slipLong=${s.slipLong.toFixed(3)} slipLat=${s.slipLat.toFixed(3)}${s.saturated ? ' SKID' : ''}`,
      );
    }
    return out;
  }
}
