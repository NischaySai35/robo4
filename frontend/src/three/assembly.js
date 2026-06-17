/**
 * assembly.js — multi-module "welded assembly" helpers.
 *
 * A weld rigidly joins two module faces. Each weld stores a `mate` matrix
 * (the fixed relative transform between the two face frames, captured at
 * connect time) so a follower module can be re-placed for ANY articulation
 * of the anchor module while preserving the exact joined orientation.
 *
 * Weld record shape (in multiStore):
 *   { a: { moduleId, faceKey }, b: { moduleId, faceKey }, mate: number[16] }
 *   mate = inv(aFaceWorld) * bFaceWorld   (i.e. transforms aFace frame → bFace frame)
 */

import * as THREE from 'three';
import { ROD_IDS, JOINT_DEFS } from '../store/armStore.js';

// Which rod index a selectable face belongs to.
const FACE_ROD_INDEX = {
  R1_outer:         0,
  R7_outer:         6,
  R3_cuboid_plusZ:  2,
  R3_cuboid_minusZ: 2,
};

/** Set of module IDs in the same welded assembly as `moduleId` (BFS over welds). */
export function assemblyModuleIds(welds, moduleId) {
  const adj = new Map();
  for (const w of welds) {
    if (!adj.has(w.a.moduleId)) adj.set(w.a.moduleId, []);
    if (!adj.has(w.b.moduleId)) adj.set(w.b.moduleId, []);
    adj.get(w.a.moduleId).push(w.b.moduleId);
    adj.get(w.b.moduleId).push(w.a.moduleId);
  }
  const seen  = new Set([moduleId]);
  const queue = [moduleId];
  while (queue.length) {
    const cur = queue.shift();
    for (const nb of adj.get(cur) ?? []) {
      if (!seen.has(nb)) { seen.add(nb); queue.push(nb); }
    }
  }
  return seen;
}

function faceMesh(fk, faceKey) {
  return fk.getFaceIndicatorMeshes().find(p => p.userData.faceKey === faceKey) ?? null;
}

/**
 * Capture the rigid relative transform between two mated faces (a→b).
 * Both modules must already be placed in their joined configuration.
 * @returns {number[16] | null}
 */
export function captureMate(fkA, faceKeyA, fkB, faceKeyB) {
  const a = faceMesh(fkA, faceKeyA);
  const b = faceMesh(fkB, faceKeyB);
  if (!a || !b) return null;
  fkA.robotGroup.updateMatrixWorld(true);
  fkB.robotGroup.updateMatrixWorld(true);
  a.updateMatrixWorld(true);
  b.updateMatrixWorld(true);
  return new THREE.Matrix4().copy(a.matrixWorld).invert().multiply(b.matrixWorld).toArray();
}

/**
 * Re-place `followerFK` so its welded face stays mated to the (already-placed)
 * anchor module's welded face, for the anchor's current articulation.
 *
 * @param {RobotFK} anchorFK
 * @param {string}  anchorFaceKey
 * @param {boolean} anchorIsA      — is the anchor the weld's `a` endpoint?
 * @param {RobotFK} followerFK
 * @param {string}  followerFaceKey
 * @param {number[16]} mateArr     — weld.mate (a→b)
 */
export function placeFollower(anchorFK, anchorFaceKey, anchorIsA, followerFK, followerFaceKey, mateArr) {
  const aFace = faceMesh(anchorFK, anchorFaceKey);
  const fFace = faceMesh(followerFK, followerFaceKey);
  if (!aFace || !fFace || !mateArr) return;

  anchorFK.robotGroup.updateMatrixWorld(true);
  aFace.updateMatrixWorld(true);

  const mate       = new THREE.Matrix4().fromArray(mateArr);   // a→b
  const aFaceWorld = aFace.matrixWorld.clone();

  // World matrix the follower's face must land on:
  //   anchor is a → followerFace = aFace * mate
  //   anchor is b → followerFace = bFace * inv(mate)
  const fFaceWorldTarget = anchorIsA
    ? aFaceWorld.clone().multiply(mate)
    : aFaceWorld.clone().multiply(mate.clone().invert());

  // Follower face transform relative to its own robotGroup (pose-dependent only).
  followerFK.robotGroup.updateMatrixWorld(true);
  fFace.updateMatrixWorld(true);
  const Lf = new THREE.Matrix4()
    .copy(followerFK.robotGroup.matrixWorld).invert()
    .multiply(fFace.matrixWorld);

  // robotGroup world = targetFaceWorld * inv(Lf)
  const groupTarget = fFaceWorldTarget.clone().multiply(Lf.clone().invert());

  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  groupTarget.decompose(pos, quat, scl);
  followerFK.robotGroup.position.copy(pos);
  followerFK.robotGroup.quaternion.copy(quat);
  followerFK.robotGroup.updateMatrixWorld(true);
}

/**
 * Propagate placement from a driver (base) module outward across all welds.
 * BFS: each newly-placed module re-places its not-yet-placed welded neighbours.
 *
 * @param {string} driverId
 * @param {Array}  welds
 * @param {(id:string)=>RobotFK|null} getFK
 * @returns {Set<string>} the set of placed module IDs (the assembly)
 */
export function propagateAssembly(driverId, welds, getFK) {
  const placed = new Set([driverId]);
  if (!welds.length) return placed;

  const queue = [driverId];
  while (queue.length) {
    const cur = queue.shift();
    for (const w of welds) {
      let anchorFace, followerId, followerFace, anchorIsA;
      if (w.a.moduleId === cur && !placed.has(w.b.moduleId)) {
        anchorFace = w.a.faceKey; followerId = w.b.moduleId; followerFace = w.b.faceKey; anchorIsA = true;
      } else if (w.b.moduleId === cur && !placed.has(w.a.moduleId)) {
        anchorFace = w.b.faceKey; followerId = w.a.moduleId; followerFace = w.a.faceKey; anchorIsA = false;
      } else {
        continue;
      }
      const anchorFK   = getFK(cur);
      const followerFK = getFK(followerId);
      if (anchorFK && followerFK) {
        placeFollower(anchorFK, anchorFace, anchorIsA, followerFK, followerFace, w.mate);
      }
      placed.add(followerId);
      queue.push(followerId);
    }
  }
  return placed;
}

// ── Cross-module IK chain ───────────────────────────────────────────────────────

/** The weld directly joining two modules (or null). */
function weldBetween(welds, m1, m2) {
  return welds.find(w => {
    const s = new Set([w.a.moduleId, w.b.moduleId]);
    return s.has(m1) && s.has(m2);
  }) ?? null;
}

/** Rod index of the face a weld uses on the given module. */
function faceRodIndexOf(weld, moduleId) {
  const side = weld.a.moduleId === moduleId ? weld.a : weld.b;
  return FACE_ROD_INDEX[side.faceKey] ?? 0;
}

/** BFS module-path from baseId to dragId over the weld graph (inclusive). */
function modulePath(welds, baseId, dragId) {
  if (baseId === dragId) return [baseId];
  const adj = new Map();
  for (const w of welds) {
    if (!adj.has(w.a.moduleId)) adj.set(w.a.moduleId, []);
    if (!adj.has(w.b.moduleId)) adj.set(w.b.moduleId, []);
    adj.get(w.a.moduleId).push(w.b.moduleId);
    adj.get(w.b.moduleId).push(w.a.moduleId);
  }
  const prev = new Map([[baseId, null]]);
  const queue = [baseId];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === dragId) break;
    for (const nb of adj.get(cur) ?? []) {
      if (!prev.has(nb)) { prev.set(nb, cur); queue.push(nb); }
    }
  }
  if (!prev.has(dragId)) return null;
  const path = [];
  for (let n = dragId; n != null; n = prev.get(n)) path.unshift(n);
  return path;
}

/**
 * Build a combined kinematic chain (world-space) from the assembly's fixed root
 * to a dragged rod that lives in another welded module. Every joint between the
 * root and the dragged rod — across module boundaries — is included.
 *
 * @returns {{
 *   jointData: Array<{pos,axis}>,   // world pos + axis per path joint
 *   angles:    number[],            // current angle per path joint
 *   defs:      object[],            // JOINT_DEFS entry per path joint
 *   backmap:   Array<{moduleId, localIdx}>,
 *   dragPos:   THREE.Vector3,       // world position pulled toward the cursor
 * } | null}
 */
export function buildCrossModuleChain({ welds, getFK, getAngles, baseId, baseRootRodId, dragId, dragRodId, mode }) {
  const path = modulePath(welds, baseId, dragId);
  if (!path || path.length < 2) return null;

  const rootIdx = ROD_IDS.indexOf(baseRootRodId);
  const jointData = [];
  const angles    = [];
  const defs      = [];
  const backmap   = [];

  for (let pi = 0; pi < path.length; pi++) {
    const mid = path[pi];
    const fk  = getFK(mid);
    if (!fk) return null;
    const jdata = fk.getJointWorldData(mode);
    const angs  = getAngles(mid);

    const entryIdx = pi === 0
      ? rootIdx
      : faceRodIndexOf(weldBetween(welds, path[pi - 1], mid), mid);
    const exitIdx = pi === path.length - 1
      ? ROD_IDS.indexOf(dragRodId)
      : faceRodIndexOf(weldBetween(welds, mid, path[pi + 1]), mid);

    const lo = Math.min(entryIdx, exitIdx);
    const hi = Math.max(entryIdx, exitIdx);
    for (let j = lo; j < hi; j++) {       // joint j connects rod j and rod j+1
      jointData.push(jdata[j]);
      angles.push(angs[j] ?? 0);
      defs.push(JOINT_DEFS[j]);
      backmap.push({ moduleId: mid, localIdx: j });
    }
  }

  if (jointData.length === 0) return null;

  // Drag node: the joint node representing the dragged rod's reachable end,
  // measured outward from where the chain enters the dragged module.
  const dragFK = getFK(dragId);
  const nodes  = dragFK.getNodePositions();
  const lastEntry = path.length < 2
    ? rootIdx
    : faceRodIndexOf(weldBetween(welds, path[path.length - 2], dragId), dragId);
  const dRodIdx     = ROD_IDS.indexOf(dragRodId);
  const dragNodeIdx = dRodIdx > lastEntry ? Math.min(dRodIdx, 5) : Math.max(dRodIdx - 1, 0);
  const dragPos     = nodes[dragNodeIdx].clone();

  return { jointData, angles, defs, backmap, dragPos };
}
