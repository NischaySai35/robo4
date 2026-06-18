/**
 * modelFK — generic forward kinematics over the model graph.
 *
 * A joint's `origin` is the rest pose of the child in the parent's frame (captured
 * at creation). FK world of a child = parentWorld ∘ origin ∘ jointDOF(value), so a
 * joint value rotates/translates the child and everything downstream. Bodies that
 * are not a child of any joint are roots: their FK world is their authored transform.
 *
 * Loops are tolerated (a cycle falls back to the authored transform for the
 * revisited body) — the model is a graph, not a strict tree.
 */
import * as THREE from 'three';

const ONE = new THREE.Vector3(1, 1, 1);

export function mat(t) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...(t?.position ?? [0, 0, 0])),
    new THREE.Quaternion(...(t?.quaternion ?? [0, 0, 0, 1])),
    ONE.clone(),
  );
}

const originMat = (o) => mat(o ?? { position: [0, 0, 0], quaternion: [0, 0, 0, 1] });

/** The joint's degree-of-freedom transform at its current value. */
export function jointDOFMatrix(joint) {
  const v = joint.state?.value ?? 0;
  const axis = new THREE.Vector3(...(joint.axis ?? [0, 0, 1]));
  if (axis.lengthSq() < 1e-9) axis.set(0, 0, 1);
  axis.normalize();
  if (joint.type === 'prismatic') return new THREE.Matrix4().makeTranslation(axis.x * v, axis.y * v, axis.z * v);
  if (joint.type === 'fixed') return new THREE.Matrix4();
  return new THREE.Matrix4().makeRotationAxis(axis, v); // revolute / continuous / ball
}

/** childBodyId -> the joint whose child it is (first wins). */
export function buildChildJointMap(doc) {
  const m = new Map();
  for (const j of Object.values(doc.joints)) {
    if (j.childBodyId && !m.has(j.childBodyId)) m.set(j.childBodyId, j);
  }
  return m;
}

/** Compute world transforms for every body. Returns Map id -> {position, quaternion, matrix}. */
export function computeFK(doc) {
  const childJoint = buildChildJointMap(doc);
  const cache = new Map();
  const visiting = new Set();

  function world(bodyId) {
    if (cache.has(bodyId)) return cache.get(bodyId);
    const body = doc.bodies[bodyId];
    if (!body) return new THREE.Matrix4();
    const j = childJoint.get(bodyId);
    let M;
    if (!j || visiting.has(bodyId) || !doc.bodies[j.parentBodyId]) {
      M = mat(body.transform);
    } else {
      visiting.add(bodyId);
      M = world(j.parentBodyId).clone().multiply(originMat(j.origin)).multiply(jointDOFMatrix(j));
      visiting.delete(bodyId);
    }
    cache.set(bodyId, M);
    return M;
  }

  const out = new Map();
  for (const id of Object.keys(doc.bodies)) {
    const M = world(id);
    const p = new THREE.Vector3(); const q = new THREE.Quaternion(); const s = new THREE.Vector3();
    M.decompose(p, q, s);
    out.set(id, { position: [p.x, p.y, p.z], quaternion: [q.x, q.y, q.z, q.w], matrix: M });
  }
  return out;
}

/** Rest origin (child-in-parent) from two bodies' authored transforms. */
export function relativeOrigin(parentBody, childBody) {
  const rel = mat(parentBody.transform).invert().multiply(mat(childBody.transform));
  const p = new THREE.Vector3(); const q = new THREE.Quaternion(); const s = new THREE.Vector3();
  rel.decompose(p, q, s);
  return { position: [p.x, p.y, p.z], quaternion: [q.x, q.y, q.z, q.w] };
}

/** New joint origin so the child lands at childMatrix (world) for the joint's current value. */
export function originForChildWorld(parentMatrix, joint, childMatrix) {
  const rel = parentMatrix.clone().invert().multiply(childMatrix).multiply(jointDOFMatrix(joint).invert());
  const p = new THREE.Vector3(); const q = new THREE.Quaternion(); const s = new THREE.Vector3();
  rel.decompose(p, q, s);
  return { position: [p.x, p.y, p.z], quaternion: [q.x, q.y, q.z, q.w] };
}
