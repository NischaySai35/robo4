/**
 * connectorSnap.ts — auto-detect two modules' connectors facing each other and
 * close together, then align + physically join them with a real Joint (graph
 * edge), not just a cosmetic reposition.
 *
 * This is the foundation primitive for the shape-changing modular platform:
 * "drag two module instances together, watch them auto-snap" in the Editor/
 * Animation viewport. It reuses the same alignment math as the manual Assembly
 * Mate tool (AnimLeftPanel's snapMate), but (a) searches for candidate pairs
 * itself instead of requiring the user to pick both connectors from dropdowns,
 * and (b) creates an actual detachable Joint so the two components become one
 * connected graph — which later feeds the topology-aware training/animation
 * work (dynamic re-parenting; see ROADMAP "Graph not tree").
 *
 * Pure/framework-adjacent: uses THREE for vector math (matching modelFK.ts /
 * AnimLeftPanel's own snap math) but never touches the DOM or React — safe to
 * call from a button handler or (later) a per-frame drag hook.
 */
import * as THREE from 'three';
import type { Document, Connector, Joint } from '@/core/model/index';
import { makeJoint, JointType, uid } from '@/core/model/index';
import { jointFramesForBodies, mat } from '@/kinematics/modelFK';

export interface ConnectorRef { bodyId: string; connectorId: string; componentId: string | null }
export interface ConnectorWorld { position: THREE.Vector3; normal: THREE.Vector3; roll: THREE.Vector3; symmetry: number }

// The FK world-pose map computeFK() returns: bodyId → { matrix: THREE.Matrix4, … }.
// Passing it makes the snap work on where bodies actually ARE on screen (posed by
// joint values / rigid mode), not on their un-posed authored transforms — without
// it, snapping a rotated/posed module aligns the wrong pose and FK then overrides
// the result, so the lock visibly "snaps back".
export type FKMap = Map<string, { matrix: THREE.Matrix4 }> | undefined;

const DEFAULT_SYMMETRY = 4; // this platform's lock seats every 90°

/** A body's current world matrix: its FK pose if an FK map is supplied, else its
 *  authored transform (roots and un-posed models are identical either way). */
function bodyWorldMatrix(doc: Document, bodyId: string, fk: FKMap): THREE.Matrix4 {
  const m = fk?.get(bodyId)?.matrix;
  if (m) return m.clone();
  const body = doc.bodies[bodyId];
  return body ? mat(body.transform) : new THREE.Matrix4();
}

const _dp = new THREE.Vector3();
const _dq = new THREE.Quaternion();
const _ds = new THREE.Vector3();
/** Decompose a world matrix into a serializable transform patch. */
function decomposeTransform(M: THREE.Matrix4): { position: [number, number, number]; quaternion: [number, number, number, number] } {
  M.decompose(_dp, _dq, _ds);
  return { position: [_dp.x, _dp.y, _dp.z], quaternion: [_dq.x, _dq.y, _dq.z, _dq.w] };
}

/** A stable body-local tangent (⊥ to the normal) to use as the key's "up" when a
 *  connector has no explicit `roll`. Deterministic so the same connector always
 *  yields the same reference, and it rotates with the body — which is all the
 *  keyed-roll alignment needs to measure the relative twist between two mates. */
export function deriveRoll(normal: THREE.Vector3): THREE.Vector3 {
  const n = normal.clone().normalize();
  const ref = Math.abs(n.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  return ref.sub(n.clone().multiplyScalar(ref.dot(n))).normalize();
}

const DEFAULT_POS_THRESHOLD = 0.1;    // 10 cm — generous for ~80-100mm modules
const DEFAULT_NORMAL_DOT_MAX = -0.85; // connectors must face ~opposite (< ~148° apart)

/** World position + outward normal (+ key roll & symmetry) of one connector, taken
 *  from the body's live FK pose when `fk` is supplied, else its authored transform.
 *  Returns null if body/connector missing. */
export function getConnectorWorld(doc: Document, bodyId: string, connectorId: string, fk?: FKMap): ConnectorWorld | null {
  const body = doc.bodies[bodyId];
  if (!body) return null;
  const conns: Connector[] = (body.meta?.connectors as Connector[] | undefined) ?? [];
  const con = conns.find((c) => c.id === connectorId);
  if (!con) return null;
  const M = bodyWorldMatrix(doc, bodyId, fk);
  const bodyQ = new THREE.Quaternion().setFromRotationMatrix(M);
  const localNormal = new THREE.Vector3(...con.normal);
  const position = new THREE.Vector3(...con.position).applyMatrix4(M);
  const normal = localNormal.clone().applyQuaternion(bodyQ).normalize();
  // Key "up" tangent in world space — explicit if authored, else derived from the
  // local normal so it still rotates rigidly with the body.
  const localRoll = con.roll ? new THREE.Vector3(...con.roll) : deriveRoll(localNormal);
  const roll = localRoll.applyQuaternion(bodyQ).normalize();
  const symmetry = con.symmetry ?? DEFAULT_SYMMETRY;
  return { position, normal, roll, symmetry };
}

/** The rotation that mates connector B onto connector A: swings B's normal to face
 *  opposite A's, then snaps the twist about the shared axis to the nearest angle
 *  the key seats at (symmetry 4 → nearest 90°, matching this lock's design; 0 →
 *  round pin, roll free). This is the single source of truth for mate alignment —
 *  Auto-Snap and the manual Assembly Mate both use it, so keyed locking behaves
 *  identically everywhere. Inputs only need { normal, roll, symmetry }. */
export function keyedMateRotation(
  b: { normal: THREE.Vector3; roll: THREE.Vector3; symmetry: number },
  a: { normal: THREE.Vector3; roll: THREE.Vector3; symmetry: number },
): THREE.Quaternion {
  // Step 1 — align B's normal onto -A's normal (minimal arc). Leaves roll free,
  // which is exactly why a keyed lock could land rotated wrong.
  const axis = a.normal.clone().negate().normalize(); // shared mating axis
  const rDelta = new THREE.Quaternion().setFromUnitVectors(b.normal, axis);

  // Step 2 — keyed roll: snap the twist about the axis to the nearest seat angle.
  const sym = a.symmetry || b.symmetry;
  if (sym > 0) {
    const proj = (v: THREE.Vector3) => v.clone().sub(axis.clone().multiplyScalar(v.dot(axis))).normalize();
    const rollA = proj(a.roll);
    const rollB = proj(b.roll.clone().applyQuaternion(rDelta)); // carry B's roll through step 1
    // ang = current roll offset between the keys about the axis. To seat the key we
    // must rotate B by the SIGNED REMAINDER of ang over the seat step, i.e. the
    // small turn onto the nearest keyed slot — NOT by the nearest multiple itself.
    // (Bug: applying round(ang/step)*step meant a 30° offset → round→0 → no turn,
    // so it slid in 30° off; the remainder gives the needed 30° correction.)
    const ang = Math.atan2(new THREE.Vector3().crossVectors(rollB, rollA).dot(axis), rollB.dot(rollA));
    const step = (2 * Math.PI) / sym;
    const twistAngle = ang - Math.round(ang / step) * step; // → residual becomes a multiple of step (a seat)
    const twist = new THREE.Quaternion().setFromAxisAngle(axis, twistAngle);
    rDelta.premultiply(twist); // apply keyed twist after the normal alignment
  }
  return rDelta;
}

/** Every connector in the document, with its owning body/component. */
export function listConnectors(doc: Document): ConnectorRef[] {
  const out: ConnectorRef[] = [];
  for (const body of Object.values(doc.bodies)) {
    const conns: Connector[] = (body.meta?.connectors as Connector[] | undefined) ?? [];
    for (const c of conns) out.push({ bodyId: body.id, connectorId: c.id, componentId: body.componentId });
  }
  return out;
}

/** True if a joint already directly connects these two bodies (either direction). */
function alreadyJointed(doc: Document, bodyIdA: string, bodyIdB: string): boolean {
  return Object.values(doc.joints).some((j) =>
    (j.parentBodyId === bodyIdA && j.childBodyId === bodyIdB) ||
    (j.parentBodyId === bodyIdB && j.childBodyId === bodyIdA));
}

export interface SnapCandidate {
  a: ConnectorRef; b: ConnectorRef;
  worldA: ConnectorWorld; worldB: ConnectorWorld;
  distance: number;
}

/** Find the closest pair of facing, unjoined connectors on DIFFERENT components
 *  within threshold, or null if nothing qualifies. */
export function findBestSnapCandidate(
  doc: Document,
  fk?: FKMap,
  { posThreshold = DEFAULT_POS_THRESHOLD, normalDotMax = DEFAULT_NORMAL_DOT_MAX }: { posThreshold?: number; normalDotMax?: number } = {},
): SnapCandidate | null {
  const connectors = listConnectors(doc);
  let best: SnapCandidate | null = null;
  for (let i = 0; i < connectors.length; i++) {
    for (let j = i + 1; j < connectors.length; j++) {
      const a = connectors[i], b = connectors[j];
      if (a.bodyId === b.bodyId) continue;
      if (a.componentId && b.componentId && a.componentId === b.componentId) continue; // same module
      if (alreadyJointed(doc, a.bodyId, b.bodyId)) continue;
      const worldA = getConnectorWorld(doc, a.bodyId, a.connectorId, fk);
      const worldB = getConnectorWorld(doc, b.bodyId, b.connectorId, fk);
      if (!worldA || !worldB) continue;
      const distance = worldA.position.distanceTo(worldB.position);
      if (distance > posThreshold) continue;
      const dot = worldA.normal.dot(worldB.normal);
      if (dot > normalDotMax) continue; // not facing each other closely enough
      if (!best || distance < best.distance) best = { a, b, worldA, worldB, distance };
    }
  }
  return best;
}

/** The single rigid WORLD transform that mates connector B onto connector A:
 *  rotate B's module about the mate point into keyed alignment (keyedMateRotation),
 *  then translate connector B onto connector A. Apply this to a body's world pose
 *  to get its post-mate world pose. Shared by Auto-Snap and the manual mate. */
export function mateWorldDelta(worldB: ConnectorWorld, worldA: ConnectorWorld): THREE.Matrix4 {
  const rDelta = keyedMateRotation(worldB, worldA);
  return new THREE.Matrix4().makeTranslation(worldA.position.x, worldA.position.y, worldA.position.z)
    .multiply(new THREE.Matrix4().makeRotationFromQuaternion(rDelta))
    .multiply(new THREE.Matrix4().makeTranslation(-worldB.position.x, -worldB.position.y, -worldB.position.z));
}

/** Patches that rigidly move each body by world delta D. Writes each body's
 *  post-delta WORLD pose to its authored transform: the module's root lands
 *  correctly and FK carries jointed children by the same D (joint values kept),
 *  so a posed module moves as one rigid piece and its links don't disintegrate. */
export function rigidMovePatches(doc: Document, bodyIds: string[], D: THREE.Matrix4, fk?: FKMap): [string, unknown][] {
  return bodyIds.map((id) => {
    const body = doc.bodies[id];
    const newWorld = D.clone().multiply(bodyWorldMatrix(doc, id, fk));
    return [id, { transform: { ...body.transform, ...decomposeTransform(newWorld) } }];
  });
}

/** Body transform patches + a new detachable Joint that aligns componentB onto
 *  componentA's connector and physically links them. Component B (or just its
 *  body, if unassigned) moves; component A stays put.
 *
 *  Everything is computed in WORLD space against the live FK pose (pass `fk`), so
 *  a rotated/posed module mates where it actually appears on screen and stays put
 *  after commit. The moved module is rigidly transformed by a single world delta
 *  D (rotate the connector into keyed alignment about the mate point, then slide
 *  its face onto connector A). Writing each moved body's post-delta WORLD pose to
 *  its authored transform moves the module's root correctly; FK carries the rest
 *  of the chain by the same D, preserving joint values — so the lock holds. */
export function computeSnapPatches(doc: Document, candidate: SnapCandidate, fk?: FKMap): { patches: [string, unknown][]; joint: Joint } {
  const { a, b } = candidate;
  const bodyB = doc.bodies[b.bodyId];
  const bodyA = doc.bodies[a.bodyId];

  // Recompute the connector worlds from the SAME fk we'll move against (candidate
  // may have been built with a different/no fk).
  const worldA = getConnectorWorld(doc, a.bodyId, a.connectorId, fk)!;
  const worldB = getConnectorWorld(doc, b.bodyId, b.connectorId, fk)!;
  const D = mateWorldDelta(worldB, worldA);

  const movedBodies = bodyB.componentId
    ? Object.values(doc.bodies).filter((bb) => bb.componentId === bodyB.componentId)
    : [bodyB];

  const patches = rigidMovePatches(doc, movedBodies.map((bb) => bb.id), D, fk);
  const bodyBNewWorld = D.clone().multiply(bodyWorldMatrix(doc, bodyB.id, fk));

  // Joint frames from WORLD poses (FK of A, post-delta world of B) so the new
  // FIXED joint is consistent with FK and the two modules stay locked together.
  const pivotWorld: [number, number, number] = [worldA.position.x, worldA.position.y, worldA.position.z];
  const worldBodyA = { ...bodyA, transform: { ...bodyA.transform, ...decomposeTransform(bodyWorldMatrix(doc, bodyA.id, fk)) } };
  const worldBodyB = { ...bodyB, transform: { ...bodyB.transform, ...decomposeTransform(bodyBNewWorld) } };
  const joint = makeJoint({
    id: uid('joint'),
    name: `Snap ${bodyA.name} ↔ ${bodyB.name}`,
    type: JointType.FIXED,
    parentBodyId: a.bodyId,
    childBodyId: b.bodyId,
    ...jointFramesForBodies(worldBodyA, worldBodyB, pivotWorld),
    componentId: null,
    meta: { generatedFromConnector: true, connectorA: a.connectorId, connectorB: b.connectorId, detachable: true },
  });

  return { patches, joint };
}
