/**
 * DynamicSim — the GENERAL articulated-physics engine for the model graph.
 *
 * Goal: ONE sim that handles vehicles, dogs, humanoids, transformers, chains, organisms and
 * shape-shifters — anything expressible as bodies + joints — with real gravity, collision and
 * friction. Modeled exactly like Gazebo/URDF, which is why it stays stable:
 *
 *  • RIGID connectivity (fixed locks + rigid revolutes) FUSES bodies into one compound rigid body
 *    per cluster (union-find). Rigid loops collapse inside a single body → no over-constrained loop.
 *  • The passive articulation between clusters (free joints) is built with REDUCED-COORDINATE
 *    MULTIBODY joints (Rapier's Featherstone solver — the same math ODE/DART/Bullet give Gazebo).
 *    A joint in reduced coordinates CANNOT drift, so the solver never "fights" it → no jitter.
 *  • MOTOR joints (spinnable end-locks) are impulse revolute joints with a real velocity motor.
 *  • EVERY collider collides and RESTS on the ground through normal contact — exactly like every
 *    URDF link. There is no "floating chassis", no collision-group juggling. That contraption was
 *    a statically-indeterminate balancing act (heavy body suspended on free wheels, no ground
 *    contact of its own) and was the sole cause of the shaking. Gone.
 *  • Wheels (motor end-locks) get a true cylinder collider aligned to the axle so they ROLL
 *    (faceted mesh hulls grind). That's the only body-type special-case, and it's honest geometry.
 *
 * Non-destructive: reads back cluster poses each frame; the doc is only transiently updated.
 */
import * as THREE from 'three';
import RAPIER from '@/viewport/physicsEngine';
import { applyDeterministicParams } from '@/viewport/physicsConfig';
import { initPhysics } from '@/robotics/rl/physicsWorld';
import type { Document } from '@/core/model/index';
import { isMotorJoint, isEndBody } from '@/features/motor/endBody';
import type { FK, DriveOf } from './rigidDrop';

/** The floor as the EXACT same triangles as the visible mesh (so physics floor == visual floor). */
export interface FloorTri { vertices: Float32Array; indices: Uint32Array; y: number }

const SIM_DT = 1 / 60;       // fixed step. 1/60 (not 1/120) so a heavy, low-FPS scene needs FEWER
                             // substeps to keep up with real time → the sim runs at a CONSISTENT
                             // real-world speed instead of slowing down (and varying) when FPS drops.
const MAX_SUBSTEPS = 8;
const GRAVITY = 9.81;
const GROUND_FRICTION = 1.2;
const WHEEL_FRICTION = 2.5;  // driven wheels grip the floor
const BODY_FRICTION = 0.25;  // a resting chassis SLIDES (low mu) so the wheels can push it along
const MOTOR_FACTOR = 200;    // velocity-motor stiffness: strong enough to HOLD the commanded rad/s
                             // against ground/contact drag (at 40 the wheels only reached ~15% of target)
const MOTOR_BRAKE = 30;      // idle holding torque (uncommanded servo holds its angle, doesn't free-spin)
const FALLBACK_DENSITY = 400; // used only when a body has no inertial mass
const ONE = new THREE.Vector3(1, 1, 1);
const YUP = new THREE.Vector3(0, 1, 0);

// ── Contact suppression: PER-JOINT, not a robot-wide blanket ─────────────────────
// A first attempt disabled collision between EVERY robot collider (a blanket
// collision-group split). That over-corrected: unjointed-but-touching parts of the
// model can legitimately rely on contact for support (a real robot's non-adjacent
// links still collide if you bump them together), and removing ALL of that support
// caused pieces to sink/slide as they resettled with only single-point ground contact
// each. The correct Gazebo/URDF behaviour is per-pair: only bodies DIRECTLY linked by
// a joint are exempted (they're authored touching at the joint BY DESIGN, so their
// margin-inflated colliders overlap there and the solver fights it — that's the real
// source of the jitter). Every other pair of robot parts collides normally, same as
// motor joints already did via `joint.setContactsEnabled(false)`; free/multibody
// joints below now get the same treatment.

export type JointMode = 'rigid' | 'free' | 'motor';

/** The behaviour of a joint under gravity. */
export function jointMode(doc: any, j: any): JointMode {
  if (j.type === 'fixed') return 'rigid';
  if (isMotorJoint(doc, j)) return 'motor';
  if (j.meta?.free) return 'free';
  return 'rigid';
}

// ── Diagnostics (opt-in) ──────────────────────────────────────────────────────────
// Two rounds of blind constant-tuning went the wrong way (see dynamicSim's collision
// history). Enable with `localStorage.robo_physics_diag = '1'` + reload: logs the
// cluster topology once at creation, then live per-cluster velocity/sleep state at
// ~1 Hz — so the NEXT fix is read off real numbers instead of guessed again.
function diagEnabled(): boolean {
  try { return localStorage.getItem('robo_physics_diag') === '1'; } catch { return false; }
}

const matOf = (t: any) => new THREE.Matrix4().compose(
  new THREE.Vector3(...(t?.position ?? [0, 0, 0])),
  new THREE.Quaternion(...(t?.quaternion ?? [0, 0, 0, 1])),
  ONE,
);
const originMat = (o: any) => matOf(o ?? { position: [0, 0, 0], quaternion: [0, 0, 0, 1] });

export class DynamicSim {
  private world: any;
  private _acc = 0;
  // clusterId → { rb, startInv, bodyIds, starts: Map<bodyId, Matrix4> }
  private _clusters = new Map<number, { rb: any; startInv: THREE.Matrix4; bodyIds: string[]; starts: Map<string, THREE.Matrix4> }>();
  private _bodyCluster = new Map<string, number>();
  private _motorJoints: { joint: any; jointId: string; rbA: any; rbB: any; last: number }[] = [];
  private _diagAt = 0;

  static async create(
    doc: Document, fk: FK, groundY: number,
    meshVerts?: (id: string) => Float32Array | null,   // ALL raw mesh vertices (not decimated hull)
    floorTri?: FloorTri | null,
  ): Promise<DynamicSim | null> {
    await initPhysics();
    const bodies = Object.values(doc.bodies);
    if (!bodies.length) return null;

    const worldMat = (id: string) => {
      const w = fk?.get(id);
      return w ? matOf({ position: w.position, quaternion: w.quaternion }) : matOf(doc.bodies[id]?.transform);
    };

    // ── 1. Cluster bodies by RIGID connectivity (union-find) ──────────────────
    const parentOf = new Map<string, string>();
    for (const b of bodies) parentOf.set(b.id, b.id);
    const find = (x: string): string => { let r = x; while (parentOf.get(r) !== r) r = parentOf.get(r)!; while (parentOf.get(x) !== r) { const n = parentOf.get(x)!; parentOf.set(x, r); x = n; } return r; };
    const union = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra !== rb) parentOf.set(ra, rb); };
    for (const j of Object.values(doc.joints) as any[]) {
      if (j.state?.disabled || !j.parentBodyId || !j.childBodyId) continue;
      if (!doc.bodies[j.parentBodyId] || !doc.bodies[j.childBodyId]) continue;
      if (jointMode(doc, j) === 'rigid') union(j.parentBodyId, j.childBodyId);
    }
    const clusterKey = new Map<string, number>();
    const clusterBodies = new Map<number, string[]>();
    for (const b of bodies) {
      const root = find(b.id);
      let k = clusterKey.get(root);
      if (k === undefined) { k = clusterKey.size; clusterKey.set(root, k); clusterBodies.set(k, []); }
      clusterBodies.get(k)!.push(b.id);
    }

    // ── 2. World + real floor (a normal collider everything rests on) ─────────
    const world = new RAPIER.World(new RAPIER.Vector3(0, -GRAVITY, 0));
    applyDeterministicParams(world, SIM_DT);
    // Anti-penetration: more solver iterations push contacts apart harder. Rapier's OWN default for
    // normalizedAllowedLinearError is 0.001 — the prior 0.0008 was only marginally tighter than
    // stock, not an extreme override (an earlier guess here wrongly blamed it and loosened it to
    // 0.006 — 6x looser than default — which let contacts go soft: bodies sink slightly and, under
    // friction with any asymmetry, "pop" sideways each step → visible slow sliding. Reverted to a
    // value at Rapier's own default so this stays evidence-based, not another guessed number.
    const ip = world.integrationParameters;
    ip.numSolverIterations = 16;
    try { ip.numInternalPgsIterations = 4; } catch { /* older builds */ }
    try { ip.normalizedAllowedLinearError = 0.001; } catch { /* older builds */ }
    const sim = new DynamicSim();
    sim.world = world;
    if (floorTri && floorTri.indices.length >= 3) {
      const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, floorTri.y, 0));
      world.createCollider(RAPIER.ColliderDesc.trimesh(floorTri.vertices, floorTri.indices)
        .setFriction(GROUND_FRICTION).setRestitution(0), groundBody);
    } else {
      const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, groundY - 1, 0));
      world.createCollider(RAPIER.ColliderDesc.cuboid(500, 1, 500).setFriction(GROUND_FRICTION).setRestitution(0), groundBody);
    }

    // ── 2b. Wheel geometry (driven end-locks): a true CYLINDER collider aligned to the motor axle
    //        so it ROLLS smoothly (a faceted mesh hull grinds instead). Honest geometry, not a hack. ─
    const wheelCyl = new Map<string, { axisW: THREE.Vector3; radius: number; halfLen: number; offset: THREE.Vector3 }>();
    for (const j of Object.values(doc.joints) as any[]) {
      if (j.state?.disabled || jointMode(doc, j) !== 'motor') continue;
      const bid = isEndBody(doc.bodies[j.parentBodyId]) ? j.parentBodyId : j.childBodyId;
      const pivotW = worldMat(j.parentBodyId).multiply(originMat(j.origin));
      const axisW = new THREE.Vector3(...(j.axis ?? [0, 0, 1])).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(pivotW)).normalize();
      const M = worldMat(bid); const bodyOrigin = new THREE.Vector3().setFromMatrixPosition(M);
      const scale = doc.bodies[bid]?.transform?.scale ?? [1, 1, 1];
      const verts = meshVerts?.(bid) ?? null;
      const tmp = new THREE.Vector3();
      const mn = new THREE.Vector3(Infinity, Infinity, Infinity), mx = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
      if (verts) for (let i = 0; i < verts.length; i += 3) {
        tmp.set(verts[i] * scale[0], verts[i + 1] * scale[1], verts[i + 2] * scale[2]).applyMatrix4(M).sub(bodyOrigin);
        mn.min(tmp); mx.max(tmp);
      }
      const centre = mn.clone().add(mx).multiplyScalar(0.5);
      let radius = 0, aMin = Infinity, aMax = -Infinity;
      if (verts && isFinite(centre.x)) for (let i = 0; i < verts.length; i += 3) {
        tmp.set(verts[i] * scale[0], verts[i + 1] * scale[1], verts[i + 2] * scale[2]).applyMatrix4(M).sub(bodyOrigin).sub(centre);
        const ax = tmp.dot(axisW); const rad = Math.sqrt(Math.max(0, tmp.lengthSq() - ax * ax));
        if (rad > radius) radius = rad; if (ax < aMin) aMin = ax; if (ax > aMax) aMax = ax;
      }
      if (!(radius > 0)) { const g: any = doc.bodies[bid]?.visual?.geometry ?? {}; const s = Math.max(...scale.map(Math.abs)) || 1; radius = (g.radius ?? 0.04) * s; aMin = -(g.length ?? 0.06) * s / 2; aMax = -aMin; centre.set(0, 0, 0); }
      const axialMid = (aMin + aMax) / 2;
      const offset = centre.clone().add(axisW.clone().multiplyScalar(axialMid));
      // +3 mm radius / +1 mm half-length margin so the solver's contact tolerance can never let the
      // visible wheel dip below the floor — it rests a hair proud (reads as sitting on it) instead.
      wheelCyl.set(bid, { axisW, radius: Math.max(0.01, radius) + 0.003, halfLen: Math.max(0.01, (aMax - aMin) / 2) + 0.001, offset });
    }

    // Diagnostic-only: each body's lowest collider point in WORLD space, so we can see
    // whether a non-wheel (chassis) body also grazes the floor — an unintended 5th+
    // ground contact alongside the 4 wheels is exactly what causes a rigid multi-wheel
    // chassis to never settle (over-constrained: 4+ simultaneous contacts that are
    // rarely all coplanar). Populated in the loop below, printed once at the end.
    const lowPoints: { id: string; name: string; y: number; kind: string }[] = [];
    const _corner = new THREE.Vector3();

    // ── 3. One compound rigid body per cluster; every collider collides normally ──
    for (const [k, ids] of clusterBodies) {
      const superRigid = ids.some((id) => (doc.bodies[id] as any)?.meta?.superRigid);
      const origin = new THREE.Vector3();
      for (const id of ids) origin.add(new THREE.Vector3().setFromMatrixPosition(worldMat(id)));
      origin.multiplyScalar(1 / ids.length);
      // CCD (continuous collision detection) exists to stop FAST bodies tunnelling through geometry
      // — irrelevant at these speeds, and Rapier reruns an extra time-of-impact pass for it every
      // step even at rest, which compounds the same hard-correction jitter as too-tight a tolerance
      // (see normalizedAllowedLinearError above). A resting/rolling robot never needs it.
      const desc = (superRigid ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic())
        .setTranslation(origin.x, origin.y, origin.z).setLinearDamping(0.1).setAngularDamping(0.3);
      const rb = world.createRigidBody(desc);
      const starts = new Map<string, THREE.Matrix4>();
      for (const id of ids) {
        const b = doc.bodies[id];
        const M = worldMat(id);
        starts.set(id, M.clone());
        const bodyPos = new THREE.Vector3().setFromMatrixPosition(M);
        const bodyQ = new THREE.Quaternion().setFromRotationMatrix(M);
        const wc = wheelCyl.get(id);
        let cd: any; let rotQ: THREE.Quaternion; let offset = new THREE.Vector3();
        let lowY = Infinity, lowKind = 'box';
        if (wc) {
          // Wheel: cylinder aligned to the axle (Rapier's cylinder is Y-axis) so it rolls smoothly.
          cd = RAPIER.ColliderDesc.cylinder(wc.halfLen, wc.radius);
          rotQ = new THREE.Quaternion().setFromUnitVectors(YUP, wc.axisW);
          offset = wc.offset.clone();
          cd.setFriction(WHEEL_FRICTION);
          lowKind = 'wheel';
          lowY = bodyPos.y + offset.y - wc.radius; // axis is ~horizontal for a rolling wheel
        } else {
          // Everything else: a BOX collision primitive (mesh AABB), exactly like a URDF <collision>
          // box. Simple primitives rest on the ground with a few stable contact points instead of
          // the dozens a faceted convex hull produces — that contact chatter is what made it jitter.
          const raw = meshVerts?.(id) ?? null;
          rotQ = bodyQ;
          const bb = bboxOf(b, raw);
          cd = RAPIER.ColliderDesc.cuboid(bb.hx, bb.hy, bb.hz);
          offset = bb.center.clone().applyQuaternion(bodyQ);
          cd.setFriction(BODY_FRICTION);
          // Exact world-space lowest corner of the (possibly rotated) box.
          const boxCenterWorld = bodyPos.clone().add(offset);
          for (let sx = -1; sx <= 1; sx += 2) for (let sy = -1; sy <= 1; sy += 2) for (let sz = -1; sz <= 1; sz += 2) {
            _corner.set(sx * bb.hx, sy * bb.hy, sz * bb.hz).applyQuaternion(bodyQ).add(boxCenterWorld);
            if (_corner.y < lowY) lowY = _corner.y;
          }
        }
        if (diagEnabled()) lowPoints.push({ id, name: b.name, y: lowY, kind: lowKind });
        if (!cd) continue;
        // Mass properties from the model's real inertial mass (Gazebo uses the link's mass and
        // derives the inertia tensor from the shape). Fallback to a light density if unset.
        const mass = (b as any)?.inertial?.mass;
        if (typeof mass === 'number' && mass > 0) cd.setMass(mass);
        else cd.setDensity(FALLBACK_DENSITY);
        const p = bodyPos.clone().add(offset).sub(origin);
        cd.setTranslation(p.x, p.y, p.z).setRotation({ x: rotQ.x, y: rotQ.y, z: rotQ.z, w: rotQ.w })
          .setRestitution(0); // collides normally — only DIRECT joint partners get contacts disabled (below)
        world.createCollider(cd, rb);
      }
      const startInv = new THREE.Matrix4().compose(origin, new THREE.Quaternion(), ONE).invert();
      sim._clusters.set(k, { rb, startInv, bodyIds: ids, starts });
      for (const id of ids) sim._bodyCluster.set(id, k);
    }

    // ── 4. Joints between clusters ───────────────────────────────────────────
    //  • free   → reduced-coordinate MULTIBODY joint (stable, Gazebo-style articulation)
    //  • motor  → impulse revolute joint with a real velocity motor (drives the spin)
    //  A joint that would close a kinematic LOOP over the multibody tree falls back to an impulse
    //  joint (Rapier multibodies are trees). Union-find over clusters detects the loop.
    const treeParent = new Map<number, number>();
    const treeFind = (x: number): number => { let r = x; while (treeParent.get(r) !== undefined && treeParent.get(r) !== r) r = treeParent.get(r)!; return r; };
    for (const c of sim._clusters.keys()) treeParent.set(c, c);

    for (const j of Object.values(doc.joints) as any[]) {
      if (j.state?.disabled || !j.parentBodyId || !j.childBodyId) continue;
      const mode = jointMode(doc, j);
      if (mode === 'rigid') continue; // fused already
      const ka = sim._bodyCluster.get(j.parentBodyId), kb = sim._bodyCluster.get(j.childBodyId);
      if (ka === undefined || kb === undefined || ka === kb) continue;
      const ca = sim._clusters.get(ka)!, cb = sim._clusters.get(kb)!;
      const originA = new THREE.Vector3().setFromMatrixPosition(ca.startInv.clone().invert());
      const originB = new THREE.Vector3().setFromMatrixPosition(cb.startInv.clone().invert());
      const pivotW = worldMat(j.parentBodyId).multiply(originMat(j.origin));
      const pivot = new THREE.Vector3().setFromMatrixPosition(pivotW);
      const a1 = pivot.clone().sub(originA);   // clusters are identity-rotated → world-aligned local
      const a2 = pivot.clone().sub(originB);
      const axisW = new THREE.Vector3(...(j.axis ?? [0, 0, 1])).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(pivotW)).normalize();
      const data = j.type === 'prismatic'
        ? RAPIER.JointData.prismatic({ x: a1.x, y: a1.y, z: a1.z }, { x: a2.x, y: a2.y, z: a2.z }, { x: axisW.x, y: axisW.y, z: axisW.z })
        : RAPIER.JointData.revolute({ x: a1.x, y: a1.y, z: a1.z }, { x: a2.x, y: a2.y, z: a2.z }, { x: axisW.x, y: axisW.y, z: axisW.z });

      try {
        if (mode === 'motor') {
          // Motor: impulse joint carries both the attachment AND the velocity motor. Contacts off so
          // the wheel doesn't collide with the body it's bolted to.
          const joint: any = world.createImpulseJoint(data, ca.rb, cb.rb, true);
          joint.setContactsEnabled?.(false);
          joint.configureMotorModel?.(RAPIER.MotorModel.AccelerationBased);
          joint.configureMotorVelocity?.(0, 0);
          // last=NaN so the first step()'s `v !== last` is always true → the idle brake is applied
          // from frame one (otherwise an uncommanded wheel would stay free-spinning and never settle).
          sim._motorJoints.push({ joint, jointId: j.id, rbA: ca.rb, rbB: cb.rb, last: NaN });
        } else {
          // Free/passive articulation. Reduced coordinates → no drift → no shaking. Loop-closers (and
          // any multibody failure) fall back to an impulse joint since a Rapier multibody is a tree.
          // These two bodies are authored TOUCHING at the joint by construction, so their colliders
          // overlap right there — disable contacts for exactly this pair (mirrors the motor-joint
          // treatment above), same as Gazebo/URDF's adjacent-link exemption. Every OTHER pair of
          // robot parts still collides normally, so contact-based support elsewhere is preserved.
          const ra = treeFind(ka), rb2 = treeFind(kb);
          if (ra === rb2) {
            const joint: any = world.createImpulseJoint(data, ca.rb, cb.rb, true);
            joint.setContactsEnabled?.(false);
          } else {
            try {
              const joint: any = world.createMultibodyJoint(data, ca.rb, cb.rb, true);
              joint.setContactsEnabled?.(false);
              treeParent.set(ra, rb2);
            } catch {
              const joint: any = world.createImpulseJoint(data, ca.rb, cb.rb, true);
              joint.setContactsEnabled?.(false);
            }
          }
        }
      } catch (e) { console.warn('[DynamicSim] joint build failed', j.id, e); }
    }

    if (diagEnabled()) {
      const sizes = [...clusterBodies.values()].map((ids) => ids.length);
      const names = [...clusterBodies.entries()].map(([k, ids]) =>
        `#${k}[${ids.map((id) => doc.bodies[id]?.name ?? id).join(',')}]`);
      // eslint-disable-next-line no-console
      console.info(
        `[physics-diag] bodies=${bodies.length} clusters=${clusterBodies.size} sizes=${JSON.stringify(sizes)} ` +
        `wheels=${wheelCyl.size} motorJoints=${sim._motorJoints.length}\n  clusters: ${names.join(' | ')}`,
      );

      // Ground-clearance report: sorted lowest-point-first. If a NON-wheel body's lowest
      // point is at/below the wheels', that body ALSO touches the floor — an unintended
      // extra ground contact fighting the 4 intended wheel contacts, which is exactly what
      // makes a rigid multi-wheel chassis never settle (over-constrained contact set).
      const wheelFloor = Math.min(...lowPoints.filter((p) => p.kind === 'wheel').map((p) => p.y));
      const sorted = [...lowPoints].sort((a, b) => a.y - b.y);
      const flagged = sorted.filter((p) => p.kind !== 'wheel' && p.y <= wheelFloor + 0.004); // within 4mm of wheel-bottom
      // eslint-disable-next-line no-console
      console.info(
        `[physics-diag] groundY=${groundY.toFixed(4)} wheelFloorY=${wheelFloor.toFixed(4)} ` +
        `lowest5=${JSON.stringify(sorted.slice(0, 5).map((p) => `${p.name}(${p.kind})=${p.y.toFixed(4)}`))}` +
        (flagged.length
          ? `\n  ⚠ NON-WHEEL BODIES TOUCHING FLOOR (extra unintended ground contact): ${flagged.map((p) => `${p.name}=${p.y.toFixed(4)}`).join(', ')}`
          : '\n  (no non-wheel body reaches the wheel floor line — chassis clears the ground)'),
      );
    }

    return sim;
  }

  /** Advance; drive each motor joint to driveOf(jointId) rad/s. Returns each body's new world
   *  pose (position + quaternion) — every body moves with its cluster's rigid transform. */
  step(dt: number, driveOf?: DriveOf): Map<string, { position: number[]; quaternion: number[] }> {
    // Only touch a motor when its command CHANGES; idle → free (factor 0) so the joint's bodies
    // can go to SLEEP instead of buzzing forever on their resting contacts.
    for (const m of this._motorJoints) {
      const v = driveOf ? driveOf(m.jointId) : 0;
      if (v !== m.last) {
        // Commanded → drive to target velocity. Idle → BRAKE to zero (a real servo HOLDS its angle
        // when uncommanded; leaving it free lets a loaded wheel creep forever → the model never
        // sleeps → perpetual jitter). Braking lets everything settle and go to sleep.
        m.joint.configureMotorVelocity?.(v, v === 0 ? MOTOR_BRAKE : MOTOR_FACTOR);
        m.last = v;
        m.rbA?.wakeUp?.(); m.rbB?.wakeUp?.();
      }
    }
    // Accumulate real time and run whole fixed substeps. Cap the number per frame so a very slow
    // frame can't trigger a death-spiral, but keep the timestep FIXED so behaviour is frame-rate
    // independent. Clamp a huge dt (tab was backgrounded) so we don't lurch.
    this._acc += Math.min(dt, SIM_DT * MAX_SUBSTEPS);
    let steps = 0;
    while (this._acc >= SIM_DT && steps < MAX_SUBSTEPS) { this.world.step(); this._acc -= SIM_DT; steps++; }
    if (steps === MAX_SUBSTEPS) this._acc = 0; // couldn't keep up this frame; drop the backlog

    if (diagEnabled()) {
      const now = performance.now();
      if (now - this._diagAt > 1000) {
        this._diagAt = now;
        const rows: string[] = [];
        for (const [k, cl] of this._clusters) {
          const lv = cl.rb.linvel?.() ?? { x: 0, y: 0, z: 0 };
          const av = cl.rb.angvel?.() ?? { x: 0, y: 0, z: 0 };
          const speed = Math.hypot(lv.x, lv.y, lv.z), spin = Math.hypot(av.x, av.y, av.z);
          const asleep = cl.rb.isSleeping?.() ?? false;
          rows.push(`#${k} ${asleep ? 'SLEEP' : `v=${speed.toFixed(4)} w=${spin.toFixed(4)}`}`);
        }
        // Surface any COMMANDED (nonzero) motor joint directly — the #1 cause of "never
        // sleeps" is a wheel left spinning from an earlier CW/CCW test that was never
        // explicitly stopped (spinEngine's `spins` map persists across gravity toggles
        // and page navigation; only a full reload, Stop, or Home clears it).
        const active = this._motorJoints.filter((m) => m.last !== 0).map((m) => `${m.jointId}=${m.last.toFixed(2)}rad/s`);
        // eslint-disable-next-line no-console
        console.info(`[physics-diag] ${rows.join('  ')}${active.length ? `  ACTIVE-SPIN: ${active.join(', ')}` : ''}`);
      }
    }

    const out = new Map<string, { position: number[]; quaternion: number[] }>();
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    for (const cl of this._clusters.values()) {
      const t = cl.rb.translation(), r = cl.rb.rotation();
      const delta = new THREE.Matrix4()
        .compose(new THREE.Vector3(t.x, t.y, t.z), new THREE.Quaternion(r.x, r.y, r.z, r.w), ONE)
        .multiply(cl.startInv);
      for (const id of cl.bodyIds) {
        delta.clone().multiply(cl.starts.get(id)!).decompose(p, q, s);
        out.set(id, { position: [p.x, p.y, p.z], quaternion: [q.x, q.y, q.z, q.w] });
      }
    }
    return out;
  }

  /** Rapier's built-in debug geometry (line segments) for EVERY collider + the terrain, in world
   *  space. Overlay it to SEE exactly where the physics thinks each collider/ground is. */
  debugRender(): { vertices: Float32Array; colors: Float32Array } {
    return this.world.debugRender();
  }

  dispose() { try { this.world?.free(); } catch { /* freed */ } this.world = null; }
}

/** Enclosing box (half-extents + local centre) for a body — from its mesh hull (scaled) or its
 *  primitive geometry. A cheap, stable collider that never lets the visual poke through the floor. */
function bboxOf(body: any, verts: Float32Array | null): { hx: number; hy: number; hz: number; center: THREE.Vector3 } {
  const s = body?.transform?.scale ?? [1, 1, 1];
  const sx = Math.abs(s[0]), sy = Math.abs(s[1]), sz = Math.abs(s[2]);
  const M = 0.003; // 3 mm margin so the visual can never poke through the collider (rests a hair proud)
  if (verts && verts.length >= 9) {
    let mnx = Infinity, mny = Infinity, mnz = Infinity, mxx = -Infinity, mxy = -Infinity, mxz = -Infinity;
    for (let i = 0; i < verts.length; i += 3) {
      const x = verts[i] * sx, y = verts[i + 1] * sy, z = verts[i + 2] * sz;
      if (x < mnx) mnx = x; if (x > mxx) mxx = x;
      if (y < mny) mny = y; if (y > mxy) mxy = y;
      if (z < mnz) mnz = z; if (z > mxz) mxz = z;
    }
    return {
      hx: Math.max(0.005, (mxx - mnx) / 2) + M, hy: Math.max(0.005, (mxy - mny) / 2) + M, hz: Math.max(0.005, (mxz - mnz) / 2) + M,
      center: new THREE.Vector3((mnx + mxx) / 2, (mny + mxy) / 2, (mnz + mxz) / 2),
    };
  }
  const g = body?.visual?.geometry ?? {};
  let hx = 0.05 * sx, hy = 0.05 * sy, hz = 0.05 * sz;
  if (Array.isArray(g.size)) { hx = Math.abs(g.size[0]) * sx / 2; hy = Math.abs(g.size[1]) * sy / 2; hz = Math.abs(g.size[2]) * sz / 2; }
  else if (g.radius != null) { const r = g.radius; const l = g.length ?? r * 2; hx = r * sx; hy = r * sy; hz = (l * sz) / 2; }
  return { hx: Math.max(0.005, hx), hy: Math.max(0.005, hy), hz: Math.max(0.005, hz), center: new THREE.Vector3() };
}
