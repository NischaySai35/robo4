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
import { jointFramesForBodies, mat, computeFK, jointDOFMatrix, resolveRoot } from '@/kinematics/modelFK';
import { chainJoints, lmSolveGeneric, quatRotVec } from '@/kinematics/modelIK';

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
      // Skip pairs already linked (directly OR transitively) through the joint graph:
      // rigid auto-snap would tear such a connected structure apart. Closing a loop
      // between already-connected modules is handled by the manual mate (bend-to-fit).
      if (bodiesConnected(doc, a.bodyId, b.bodyId)) continue;
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
    name: `Lock ${bodyA.name} ↔ ${bodyB.name}`,
    type: JointType.FIXED,
    parentBodyId: a.bodyId,
    childBodyId: b.bodyId,
    ...jointFramesForBodies(worldBodyA, worldBodyB, pivotWorld),
    componentId: null,
    meta: { generatedFromConnector: true, connectorA: a.connectorId, connectorB: b.connectorId, detachable: true },
  });

  return { patches, joint };
}

/** BFS over the joint graph: are two bodies already connected (directly or through
 *  a chain of joints)? Used to decide between rigid-snap (separate modules) and
 *  bend-to-fit (already-connected modules — a loop closure). */
export function bodiesConnected(doc: Document, aId: string, bId: string): boolean {
  if (aId === bId) return true;
  const adj = new Map<string, string[]>();
  const link = (x: string, y: string) => { const l = adj.get(x); if (l) l.push(y); else adj.set(x, [y]); };
  for (const j of Object.values(doc.joints)) {
    if (j.parentBodyId && j.childBodyId) { link(j.parentBodyId, j.childBodyId); link(j.childBodyId, j.parentBodyId); }
  }
  const seen = new Set<string>([aId]); const queue = [aId];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const nb of adj.get(cur) ?? []) {
      if (nb === bId) return true;
      if (!seen.has(nb)) { seen.add(nb); queue.push(nb); }
    }
  }
  return false;
}

/** Immutably set joint values on a doc (for probing an IK solution's result). */
function withJointVals(doc: Document, values: Record<string, number>): Document {
  const joints: any = { ...doc.joints };
  for (const [id, v] of Object.entries(values)) {
    const j = joints[id]; if (j) joints[id] = { ...j, state: { ...j.state, value: v } };
  }
  return { ...doc, joints } as Document;
}

export interface MateBend { jointValues: Record<string, number>; standoffValues: Record<string, number>; joint: Joint; residual: number; startGap: number; chainLen: number }

/**
 * Mate two connectors that are ALREADY connected through the joint graph, by BENDING
 * the existing joints between them so the two connectors MEET — instead of rigidly
 * teleporting a component (which tears the structure).
 *
 * Reuses the SAME position IK the "Drag tip to move" tool uses (solveModelIK), which is
 * proven to reach a target through a real joint chain. We aim body B so its CONNECTOR
 * lands on connector A's seat: target = seat − (connectorB − bodyB) offset, refined over
 * a few outer passes because both the offset and A's seat shift as the chain bends. This
 * is position-only, so small facing imperfections are tolerated (the joint locks whatever
 * near-aligned pose is reached). Returns solved joint values, the detachable FIXED loop
 * joint, the residual gap (m), plus diagnostics. Null if no movable chain exists.
 */
export function computeMateBend(
  doc: Document,
  aRef: { bodyId: string; connectorId: string },
  bRef: { bodyId: string; connectorId: string },
  rigidRoot?: string | null,
): MateBend | null {
  // ORDER-INDEPENDENT & BOTH-SIDES-BEND: the joints that actually change the two
  // connectors' RELATIVE pose are exactly the ones on the graph path BETWEEN the two
  // bodies. Solving over that whole path (not "mover→base") lets DLS distribute the bend
  // across BOTH modules — they meet in the middle — and makes A/B order irrelevant. The
  // seat/move labels below only decide which body is the lock joint's parent (the one
  // nearer the base, for a stable FK spanning tree).
  const base = (rigidRoot && doc.bodies[rigidRoot]) ? rigidRoot : null;
  const nA = base ? (chainJoints(doc, aRef.bodyId, base)?.length ?? 0) : 0;
  const nB = base ? (chainJoints(doc, bRef.bodyId, base)?.length ?? 0) : 0;
  const moverIsB = base ? (nB >= nA) : true;              // more joints from base = farther
  const moveRef = moverIsB ? bRef : aRef;                 // child of the lock joint
  const seatRef = moverIsB ? aRef : bRef;                 // parent of the lock joint (nearer base)

  // Movable joints on the direct path between the two bodies — the loop-closure DOF.
  const loopChain = chainJoints(doc, moveRef.bodyId, seatRef.bodyId) as any[];
  if (!loopChain || loopChain.length === 0) return null;
  const chainLen = loopChain.length;

  const connWorld = (d: Document, ref: { bodyId: string; connectorId: string }, f: FKMap) =>
    getConnectorWorld(d, ref.bodyId, ref.connectorId, f);

  const values: Record<string, number> = {};
  loopChain.forEach((j: any) => { values[j.id] = j.state?.value ?? 0; });
  let work = doc;
  let f = computeFK(work) as FKMap;
  let wSeat = connWorld(work, seatRef, f);
  let wMove = connWorld(work, moveRef, f);
  if (!wSeat || !wMove) return null;
  const startGap = wSeat.position.distanceTo(wMove.position);

  const SEAT_INSET = 0.00; // 0 = exact face-to-face; + pushes mover into the held face
  const STANDOFF = 0.02;   // 20 mm — aligned-but-back distance for the approach→insert animation
  const ORI_W = 0.06;      // rad→m weight blending orientation into the 6-DOF mate residual

  // The 6-DOF RELATIVE mate residual for a candidate pose: position gap + keyed orientation
  // error between the two connectors. `offset` puts the mover this far along the seat normal
  // (0 = flush, +STANDOFF = the pulled-back approach pose). Driving this to 0 seats them.
  const mateError = (vals: Record<string, number>, offset: number): number[] => {
    const w = withJointVals(doc, vals);
    const fk = computeFK(w) as FKMap;
    const ws = connWorld(w, seatRef, fk), wm = connWorld(w, moveRef, fk);
    if (!ws || !wm) return [1, 1, 1, 1, 1, 1];
    const tgt = ws.position.clone().addScaledVector(ws.normal, offset);
    const ep = tgt.clone().sub(wm.position);
    const er = quatRotVec(keyedMateRotation(wm, ws)).multiplyScalar(ORI_W); // rotation still needed to seat
    return [ep.x, ep.y, ep.z, er.x, er.y, er.z];
  };

  // VSEPR-STYLE SPREAD POTENTIAL — treat every body as a point charge repelling the others, so the
  // redundant freedom opens the assembly out instead of crumpling. Uses Σ 1/dist (Coulomb, LONG
  // range) not 1/dist² — the squared version only pushes near-touching pairs apart and leaves the
  // overall shape clumped; 1/dist spreads globally toward an open arrangement. Same metric the
  // on-screen SPREAD score shows, so minimising it here == the number on screen dropping.
  const allBodyIds = Object.keys(doc.bodies).filter((id) => doc.bodies[id]);
  const spreadPotential = (vals: Record<string, number>): number => {
    const w = withJointVals(doc, vals);
    const fk = computeFK(w) as FKMap;
    const pts = allBodyIds.map((id) => new THREE.Vector3().setFromMatrixPosition(bodyWorldMatrix(w, id, fk)));
    let U = 0;
    for (let i = 0; i < pts.length; i++)
      for (let k = i + 1; k < pts.length; k++)
        U += 1 / (pts[i].distanceTo(pts[k]) + 1e-3); // Coulomb: long-range, opens the whole shape
    return U;
  };

  // LOOP-CLOSURE SEATING — one monotone Levenberg–Marquardt solve over the whole path
  // between the two connectors, minimising their RELATIVE 6-DOF mate residual. Because the
  // error is relative and every path joint participates, the bend spreads across BOTH
  // modules (they meet in the middle) and there is no held/mover asymmetry. LM's step
  // acceptance makes the residual MONOTONE, so a gap the chain can physically close gets
  // driven to ~0 instead of stalling — and A/B order no longer matters. Then a nullspace
  // spread phase pushes bodies apart (VSEPR) without loosening the mate.
  const seated = lmSolveGeneric(loopChain, values, (v) => mateError(v, SEAT_INSET), {
    iterations: 320, tol: 1e-4, maxStep: 0.3, minTravel: true,
    spread: spreadPotential, spreadGain: 2.0, spreadIters: 140, // stronger, longer spread relaxation
  });
  for (const [id, v] of Object.entries(seated)) values[id] = v as number;
  work = withJointVals(doc, values);
  const residual = Math.hypot(...mateError(values, SEAT_INSET).slice(0, 3)); // position gap only

  // Standoff pose for the approach→insert animation: same alignment but the mover pulled
  // STANDOFF back along the seat normal. Solved from the seated pose over the same loop chain.
  const standoffValues = lmSolveGeneric(loopChain, values, (v) => mateError(v, STANDOFF), {
    iterations: 120, tol: 1e-4, maxStep: 0.3,
  });

  // Build the detachable FIXED loop joint from the ACTUAL converged poses — NOT a
  // re-perfected mate. This is what stops the "module breaks" glitch: graph-FK may route
  // the mover through this new (shorter) lock edge, so if the joint implied a pose different
  // from where the chain actually landed, everything downstream would snap/tear. By encoding
  // exactly where the bodies already are, the lock adds ZERO displacement — worst case an
  // honest sub-mm gap, never a tear. The LM above already drives that gap to ~0.
  const posed = work;
  const fk1 = computeFK(posed) as FKMap;
  const wSeat1 = getConnectorWorld(posed, seatRef.bodyId, seatRef.connectorId, fk1);
  const wMove1 = getConnectorWorld(posed, moveRef.bodyId, moveRef.connectorId, fk1);
  if (!wSeat1 || !wMove1) return null;
  const bodyHeld = doc.bodies[seatRef.bodyId], bodyMove = doc.bodies[moveRef.bodyId];
  const worldBodyHeld = { ...bodyHeld, transform: { ...bodyHeld.transform, ...decomposeTransform(bodyWorldMatrix(posed, seatRef.bodyId, fk1)) } };
  const worldBodyMove = { ...bodyMove, transform: { ...bodyMove.transform, ...decomposeTransform(bodyWorldMatrix(posed, moveRef.bodyId, fk1)) } };
  // Pivot at the midpoint of the two (now-coincident) connector faces.
  const pivotWorld: [number, number, number] = [
    (wSeat1.position.x + wMove1.position.x) / 2,
    (wSeat1.position.y + wMove1.position.y) / 2,
    (wSeat1.position.z + wMove1.position.z) / 2,
  ];
  const joint = makeJoint({
    id: uid('joint'),
    name: `Lock ${bodyHeld.name} ↔ ${bodyMove.name}`,
    type: JointType.FIXED,
    parentBodyId: seatRef.bodyId,
    childBodyId: moveRef.bodyId,
    ...jointFramesForBodies(worldBodyHeld, worldBodyMove, pivotWorld),
    componentId: null,
    meta: { generatedFromConnector: true, connectorA: seatRef.connectorId, connectorB: moveRef.connectorId, detachable: true },
  });
  return { jointValues: values, standoffValues, joint, residual, startGap, chainLen };
}

/**
 * When unlocking a lock joint but the two modules stay connected through ANOTHER lock/joint,
 * a rigid slide-out would fight that constraint and snap back. Instead we BEND the existing
 * joints so the just-unlocked connector opens a small gap (`sep`), keeping the other lock
 * intact. Returns joint values to animate/apply, or null if the child is actually free after
 * removal (caller can then slide it rigidly). `removeIds` = the lock joints being removed.
 */
export function computeUnlockBend(
  doc: Document,
  removeIds: string[],
  seatRef: { bodyId: string; connectorId: string },
  moveRef: { bodyId: string; connectorId: string },
  sep: number,
  _rigidRoot?: string | null,
): Record<string, number> | null {
  // Working doc with the unlocked lock(s) removed — so the path can bend open at that seam.
  const joints: any = { ...doc.joints };
  for (const id of removeIds) delete joints[id];
  const work0: Document = { ...doc, joints } as Document;

  // SYMMETRIC SEPARATION — the exact reverse of the lock. Solve over the joints on the path
  // between the two bodies (through whatever OTHER lock still holds them), targeting the two
  // connectors still FACING each other (normals opposed, keyed) but held `sep` apart along the
  // mate axis. Because the whole path is free, DLS opens the seam from BOTH sides ~equally —
  // 10 + 10 = 20 — instead of shoving one connector straight into the other module.
  const loopChain = chainJoints(work0, moveRef.bodyId, seatRef.bodyId) as any[];
  if (!loopChain || loopChain.length === 0) return null; // fully free now → caller rigid-slides

  const values: Record<string, number> = {};
  loopChain.forEach((j: any) => { values[j.id] = j.state?.value ?? 0; });

  const ORI_W = 0.06;
  // Same relative mate residual as the lock, but the position target sits `offset` OUT along
  // the seat normal (away from the seat face) so the faces stay square while opening a gap.
  const err = (vals: Record<string, number>, offset: number): number[] => {
    const w = withJointVals(work0, vals);
    const fk = computeFK(w) as FKMap;
    const ws = getConnectorWorld(w, seatRef.bodyId, seatRef.connectorId, fk);
    const wm = getConnectorWorld(w, moveRef.bodyId, moveRef.connectorId, fk);
    if (!ws || !wm) return [1, 1, 1, 1, 1, 1];
    const tgt = ws.position.clone().addScaledVector(ws.normal, offset);
    const ep = tgt.clone().sub(wm.position);
    const er = quatRotVec(keyedMateRotation(wm, ws)).multiplyScalar(ORI_W);
    return [ep.x, ep.y, ep.z, er.x, er.y, er.z];
  };

  return lmSolveGeneric(loopChain, values, (v) => err(v, sep), { iterations: 200, tol: 1e-4, maxStep: 0.3, minTravel: true });
}

const MOVABLE_TYPES = new Set(['revolute', 'continuous', 'prismatic']);

/**
 * The FIXED lock joints that CLOSE A LOOP — i.e. removing them leaves their two bodies still
 * connected through the rest of the graph. Graph FK builds a spanning tree and simply ignores
 * these redundant edges, so they are NOT enforced by plain FK; any joint change opens them
 * (the "it broke when I dragged" bug). These are the constraints loop stabilization must keep.
 */
export function redundantLockJoints(doc: Document): Joint[] {
  const out: Joint[] = [];
  for (const j of Object.values(doc.joints)) {
    if ((j as any).state?.disabled) continue;
    if (!j.meta?.generatedFromConnector) continue;
    if (!j.parentBodyId || !j.childBodyId) continue;
    // Still connected without this joint? → it's a redundant loop-closer.
    const without = { ...doc, joints: Object.fromEntries(Object.entries(doc.joints).filter(([id]) => id !== j.id)) } as Document;
    if (bodiesConnected(without, j.parentBodyId, j.childBodyId)) out.push(j);
  }
  return out;
}

/**
 * EVERY joint that closes a loop — of ANY type (revolute, fixed, prismatic), not just locks.
 * This is the real fix: a loop can be closed by a plain REVOLUTE joint, which FK's spanning tree
 * drops just like a lock, tearing it open on any edit. Removing a non-bridge edge leaves its two
 * bodies still connected → it's a redundant loop edge that stabilization must enforce.
 */
export function redundantJoints(doc: Document): Joint[] {
  // Must match FK's spanning tree EXACTLY: only the edges FK actually drops are the ones left
  // unenforced (and thus torn). Replicate computeFKGraph's BFS — same adjacency build order, same
  // FIFO traversal from the same root — and return the joints that were NOT the first-visit (tree)
  // edge. A loop of N joints yields exactly ONE such edge, not N (the old bug over-constrained it).
  const root = resolveRoot(doc);
  const adj = new Map<string, { j: any; nb: string }[]>();
  for (const id of Object.keys(doc.bodies)) adj.set(id, []);
  for (const j of Object.values(doc.joints) as any[]) {
    if (j.state?.disabled) continue;
    if (j.parentBodyId && j.childBodyId && doc.bodies[j.parentBodyId] && doc.bodies[j.childBodyId]) {
      adj.get(j.parentBodyId)!.push({ j, nb: j.childBodyId });
      adj.get(j.childBodyId)!.push({ j, nb: j.parentBodyId });
    }
  }
  const visited = new Set<string>();
  const treeJointIds = new Set<string>();
  // Seed from FK's root if it exists, else every component (matches "unreached bodies use authored").
  const seeds = root && doc.bodies[root] ? [root, ...Object.keys(doc.bodies)] : Object.keys(doc.bodies);
  for (const seed of seeds) {
    if (visited.has(seed)) continue;
    visited.add(seed);
    const queue = [seed];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const { j, nb } of adj.get(cur) ?? []) {
        if (visited.has(nb)) continue;
        visited.add(nb);
        treeJointIds.add(j.id);
        queue.push(nb);
      }
    }
  }
  const out: Joint[] = [];
  for (const j of Object.values(doc.joints) as any[]) {
    if (j.state?.disabled || !j.parentBodyId || !j.childBodyId) continue;
    if (!doc.bodies[j.parentBodyId] || !doc.bodies[j.childBodyId]) continue;
    if (!treeJointIds.has(j.id)) out.push(j); // a dropped (loop-closing) edge
  }
  return out;
}

/**
 * The loop-closure residual for one redundant joint, respecting its type:
 *  - the joint's parent-side frame (parentWorld·origin) and child-side frame (childWorld·childRest⁻¹)
 *    must coincide in POSITION (the shared pivot) — this is what closes the visible gap;
 *  - FIXED → also full orientation must match (rigid);
 *  - REVOLUTE/CONTINUOUS → only the AXIS must align (rotation about it stays free — it's a hinge);
 *  - PRISMATIC → axis align + full orientation (slide along axis stays free via the position term).
 * Returns a 6-vector [Δpos, Δori] driven to zero.
 */
function jointLoopResidual(doc: Document, j: any, fk: FKMap): number[] {
  const ORI_W = 0.06;
  const frameP = bodyWorldMatrix(doc, j.parentBodyId, fk).clone().multiply(mat(j.origin));
  const frameC = bodyWorldMatrix(doc, j.childBodyId, fk).clone().multiply(mat(j.childRest).invert());
  const pos = new THREE.Vector3().setFromMatrixPosition(frameP)
    .sub(new THREE.Vector3().setFromMatrixPosition(frameC));
  const qP = new THREE.Quaternion().setFromRotationMatrix(frameP);
  const qC = new THREE.Quaternion().setFromRotationMatrix(frameC);
  let ori: THREE.Vector3;
  if (j.type === 'revolute' || j.type === 'continuous') {
    const axis = new THREE.Vector3(...(j.axis ?? [0, 0, 1])).normalize();
    const aP = axis.clone().applyQuaternion(qP);
    const aC = axis.clone().applyQuaternion(qC);
    ori = new THREE.Vector3().crossVectors(aP, aC).multiplyScalar(ORI_W); // ~sin(misalignment), rotation-free
  } else {
    ori = quatRotVec(qP.clone().invert().multiply(qC)).multiplyScalar(ORI_W); // fixed: full orientation
  }
  return [pos.x, pos.y, pos.z, ori.x, ori.y, ori.z];
}

/** Worst position gap (metres) across all redundant loop joints, for accept/reject decisions. */
function worstLoopGap(doc: Document, redundant: any[], fk: FKMap): number {
  let g = 0;
  for (const j of redundant) g = Math.max(g, Math.hypot(...jointLoopResidual(doc, j, fk).slice(0, 3)));
  return g;
}

/**
 * A redundant revolute's OWN angle is free (FK drops the edge), so the solver leaves it stale —
 * which makes the joint self-inconsistent (and the diagnostic false-alarm). Set each redundant
 * hinge's stored value to the ACTUAL twist between its parent/child frames, so the joint is
 * consistent and safe if FK later reroots and starts using this edge.
 */
function reconcileRedundantAngles(doc: Document, values: Record<string, number>, redundant: any[]): void {
  const fk = computeFK(withJointVals(doc, values)) as FKMap;
  for (const j of redundant) {
    if (j.type !== 'revolute' && j.type !== 'continuous') continue;
    const w = withJointVals(doc, values);
    const frameP = bodyWorldMatrix(w, j.parentBodyId, fk).clone().multiply(mat(j.origin));
    const frameC = bodyWorldMatrix(w, j.childBodyId, fk).clone().multiply(mat(j.childRest).invert());
    const rel = frameP.clone().invert().multiply(frameC);
    const q = new THREE.Quaternion().setFromRotationMatrix(rel);
    const axis = new THREE.Vector3(...(j.axis ?? [0, 0, 1])).normalize();
    const angle = 2 * Math.atan2(new THREE.Vector3(q.x, q.y, q.z).dot(axis), q.w);
    values[j.id] = angle;
  }
}

/** True if the document has any closed loop of any joint type (so edits must be stabilized). */
export function hasLockLoop(doc: Document): boolean {
  return redundantJoints(doc).length > 0;
}

/**
 * SPREAD SCORE — a live, human-readable measure of how "spread out" the assembly is (the VSEPR
 * objective made visible). Treats each body as a point and reports:
 *  - energy:   Σ 1/dist between body centres — the repulsion the lock's spread phase MINIMISES.
 *              LOWER = more spread out (bodies farther apart); higher = clumped.
 *  - minGapMM: closest pair of bodies (mm) — HIGHER = better; the thing that looks "crumbled".
 *  - meanGapMM: average pairwise spacing (mm).
 * Updates every frame as you drag, so you can watch spread improve/worsen numerically.
 */
export function spreadScore(doc: Document): { energy: number; minGapMM: number; meanGapMM: number; bodies: number } {
  const fk = computeFK(doc) as FKMap;
  const ids = Object.keys(doc.bodies);
  const pts = ids.map((id) => new THREE.Vector3().setFromMatrixPosition(bodyWorldMatrix(doc, id, fk)));
  let energy = 0, minD = Infinity, sum = 0, n = 0;
  for (let i = 0; i < pts.length; i++) {
    for (let k = i + 1; k < pts.length; k++) {
      const d = pts[i].distanceTo(pts[k]);
      energy += 1 / (d + 1e-3);
      if (d < minD) minD = d;
      sum += d; n++;
    }
  }
  return {
    energy: +energy.toFixed(2),
    minGapMM: n ? +(minD * 1000).toFixed(0) : 0,
    meanGapMM: n ? +((sum / n) * 1000).toFixed(0) : 0,
    bodies: ids.length,
  };
}

/**
 * DIAGNOSTIC: measure EVERY joint's placement violation — the distance between where FK actually
 * put the child body and where THIS joint says it should be (parentWorld · origin · DOF · childRest).
 * Tree joints read ~0; any joint FK can't satisfy (a broken loop edge, or a torn connection of any
 * type) shows a real gap. Reports the single worst joint so we can see exactly what's separating.
 */
export function debugWorstJoint(doc: Document): any {
  const fk = computeFK(doc) as FKMap;
  let worst = { name: '(none)', type: '', gapMM: 0, oriDeg: 0 };
  for (const j of Object.values(doc.joints) as any[]) {
    if (j.state?.disabled || !j.parentBodyId || !j.childBodyId) continue;
    if (!doc.bodies[j.parentBodyId] || !doc.bodies[j.childBodyId]) continue;
    const Mp = bodyWorldMatrix(doc, j.parentBodyId, fk);
    const implied = Mp.clone().multiply(mat(j.origin)).multiply(jointDOFMatrix(j)).multiply(mat(j.childRest));
    const Mc = bodyWorldMatrix(doc, j.childBodyId, fk);
    const gap = new THREE.Vector3().setFromMatrixPosition(implied)
      .distanceTo(new THREE.Vector3().setFromMatrixPosition(Mc)) * 1000;
    if (gap > worst.gapMM) {
      const qi = new THREE.Quaternion().setFromRotationMatrix(implied);
      const qc = new THREE.Quaternion().setFromRotationMatrix(Mc);
      const oriDeg = 2 * Math.acos(Math.min(1, Math.abs(qi.dot(qc)))) * 180 / Math.PI;
      worst = { name: j.name, type: j.type, gapMM: +gap.toFixed(1), oriDeg: +oriDeg.toFixed(1) };
    }
  }
  return worst;
}

/** DIAGNOSTIC: describe every lock joint, whether it's seen as a loop-closer, and its live gap. */
export function debugLoopInfo(doc: Document): any {
  const fk = computeFK(doc) as FKMap;
  const allLocks = Object.values(doc.joints).filter((j: any) => j.type === 'fixed' || j.meta?.generatedFromConnector);
  const redundant = new Set(redundantLockJoints(doc).map((j) => j.id));
  return allLocks.map((j: any) => {
    const ws = getConnectorWorld(doc, j.parentBodyId, String(j.meta?.connectorA ?? ''), fk);
    const wm = getConnectorWorld(doc, j.childBodyId, String(j.meta?.connectorB ?? ''), fk);
    return {
      name: j.name,
      type: j.type,
      genFromConnector: !!j.meta?.generatedFromConnector,
      connA: j.meta?.connectorA ?? null,
      connB: j.meta?.connectorB ?? null,
      redundant: redundant.has(j.id),
      gapMM: (ws && wm) ? +(ws.position.distanceTo(wm.position) * 1000).toFixed(1) : 'NO-CONN-WORLD',
    };
  });
}

/**
 * DRAG WITH LOOP CLOSURE — the fix for "a lock broke when I dragged", done as PRIORITIZED
 * (task-priority) IK rather than a weighted stack. Lock closure is the HARD PRIMARY task
 * (every redundant lock's connector residual → 0); the dragged tip target is a SECONDARY
 * objective living ONLY in the nullspace of the locks. So no drag direction can ever open a
 * lock — the tip just follows the loop's feasible motion and lags when you pull somewhere the
 * mechanism physically can't go. This is what makes the lock truly unbreakable, unlike a
 * soft-weighted sum (which trades the lock open for tip error). Returns joint values or null.
 */
export function solveDragWithLoops(
  doc: Document,
  tipId: string,
  target: [number, number, number],
  _rigidRoot?: string | null,
): Record<string, number> | null {
  const redundant = redundantJoints(doc);
  if (redundant.length === 0) return null; // no loops → caller uses ordinary IK

  const movable = (Object.values(doc.joints) as any[]).filter(
    (j) => MOVABLE_TYPES.has(j.type) && !j.state?.disabled && doc.bodies[j.parentBodyId] && doc.bodies[j.childBodyId],
  );
  if (movable.length === 0) return null;

  const values: Record<string, number> = {};
  movable.forEach((j: any) => { values[j.id] = j.state?.value ?? 0; });

  // CLAMP the tip target to a small step toward the cursor each frame. A single big jump can't be
  // closed by the solver in one frame — and a non-converged frame is exactly what let a loop tear.
  // Small incremental targets are always solvable, so loops stay shut; the tip just lags on fast
  // drags (correct, expected). Multiple frames catch up to the cursor smoothly.
  const rawTgt = new THREE.Vector3(target[0], target[1], target[2]);
  const fk0 = computeFK(doc) as FKMap;
  const tip0 = new THREE.Vector3().setFromMatrixPosition(bodyWorldMatrix(doc, tipId, fk0));
  const STEP = 0.04; // ≤ 4 cm tip move per frame
  const toCursor = rawTgt.clone().sub(tip0);
  const tgt = toCursor.length() > STEP ? tip0.clone().add(toCursor.setLength(STEP)) : rawTgt;

  // PRIMARY (hard): every redundant loop joint stays closed (pivot coincident; hinge axis aligned
  // for a revolute, full orientation for a lock). This is what holds Joint 6 (a revolute loop edge)
  // together — the old version only enforced lock joints and ignored it.
  const loopError = (vals: Record<string, number>): number[] => {
    const w = withJointVals(doc, vals);
    const fk = computeFK(w) as FKMap;
    const out: number[] = [];
    for (const j of redundant) out.push(...jointLoopResidual(w, j, fk));
    return out;
  };
  const worstGap = (vals: Record<string, number>): number => {
    const w = withJointVals(doc, vals);
    return worstLoopGap(w, redundant, computeFK(w) as FKMap);
  };

  // SECONDARY (nullspace): pull the tip toward the cursor with LEAST joint motion, so the drag
  // stays LOCAL — only the joints needed to move the tip (and hold the locks) move, instead of
  // the whole robot warping. The regularization term (Σ Δθ² from the pose at frame start) is 0
  // initially (lets the tip move) and grows to discourage swinging far, unrelated joints.
  const init = { ...values };
  const REG = 0.04; // rad⁻² weight on staying put vs the m² tip term — tune for drag "stiffness"
  const tipPotential = (vals: Record<string, number>): number => {
    const w = withJointVals(doc, vals);
    const fk = computeFK(w) as FKMap;
    const tp = new THREE.Vector3().setFromMatrixPosition(bodyWorldMatrix(w, tipId, fk));
    let u = tp.distanceToSquared(tgt);
    for (const j of movable) { const d = vals[j.id] - init[j.id]; u += REG * d * d; }
    return u;
  };

  const solved = lmSolveGeneric(movable, values, loopError, {
    iterations: 40, tol: 1e-4, maxStep: 0.3,
    spread: tipPotential, spreadGain: 1.0, spreadIters: 18, // nullspace tip-follow, per-frame bounded
  });

  // HARD GUARANTEE: never apply a frame that left a loop open. If closure failed (> 2 mm), reject
  // this drag frame entirely — the caller keeps the last good pose, so a broken frame can never be
  // rendered. Worst case the tip stalls; it never tears.
  if (worstGap(solved) > 0.002) return null;
  reconcileRedundantAngles(doc, solved, redundant); // keep redundant hinge angles self-consistent
  return solved;
}

/**
 * stabilizeLoops — the GENERAL loop-closure invariant, run through the command bus after EVERY
 * mutation (drag, gizmo, sliders, animation, anything). Graph FK is a spanning tree and silently
 * drops loop-closing lock edges, so any joint/body change can open a closed lock. This projects
 * the just-mutated configuration back onto the constraint manifold: it nudges movable joints —
 * with MINIMUM deviation from what the user just set — until every redundant lock's two connectors
 * are coincident + keyed again. This is the cut-joint constraint-projection formulation for closed
 * kinematic loops. Pure/idempotent: a config that's already consistent passes through untouched.
 */
export function stabilizeLoops(doc: Document): Document {
  try {
    const redundant = redundantJoints(doc);
    if (redundant.length === 0) return doc;

    // Fast path: already consistent (nobody opened a loop) → don't touch it.
    if (worstLoopGap(doc, redundant, computeFK(doc) as FKMap) < 0.002) return doc; // < 2 mm — closed

    const movable = (Object.values(doc.joints) as any[]).filter(
      (j) => MOVABLE_TYPES.has(j.type) && !j.state?.disabled && doc.bodies[j.parentBodyId] && doc.bodies[j.childBodyId],
    );
    if (movable.length === 0) return doc;

    const values: Record<string, number> = {};
    movable.forEach((j: any) => { values[j.id] = j.state?.value ?? 0; });

    const errorFn = (vals: Record<string, number>): number[] => {
      const w = withJointVals(doc, vals);
      const f = computeFK(w) as FKMap;
      const out: number[] = [];
      for (const j of redundant) out.push(...jointLoopResidual(w, j, f));
      return out;
    };

    // Minimum-deviation projection: lmSolveGeneric takes min-norm steps from the current values,
    // so it stays as close as possible to what the user set while closing every loop joint.
    const solved = lmSolveGeneric(movable, values, errorFn, { iterations: 40, tol: 1e-4, maxStep: 0.3 });
    reconcileRedundantAngles(doc, solved, redundant); // keep redundant hinge angles self-consistent
    return withJointVals(doc, solved);
  } catch {
    return doc; // never let stabilization break a normal edit
  }
}
