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
      // Body 2 world = Body1 ∘ pivotOrigin ∘ DOF(value) ∘ childRest. The childRest
      // term keeps Body 2 independent of the pivot, so the pivot can be placed
      // anywhere between the parts without moving them.
      M = world(j.parentBodyId).clone()
        .multiply(originMat(j.origin))
        .multiply(jointDOFMatrix(j))
        .multiply(originMat(j.childRest));
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

const decompose = (M) => {
  const p = new THREE.Vector3(); const q = new THREE.Quaternion(); const s = new THREE.Vector3();
  M.decompose(p, q, s);
  return { position: [p.x, p.y, p.z], quaternion: [q.x, q.y, q.z, q.w] };
};

/**
 * Build the two joint frames connecting body1 & body2 with a pivot placed at
 * `pivotWorld` (world position; defaults to the midpoint of the two body origins).
 * Returns { origin, childRest } so FK reproduces both bodies' current placement at
 * value 0, with the pivot independently positioned.
 */
export function jointFramesForBodies(body1, body2, pivotWorld = null) {
  const T1 = mat(body1.transform);
  const T2 = mat(body2.transform);
  const p1 = new THREE.Vector3().setFromMatrixPosition(T1);
  const p2 = new THREE.Vector3().setFromMatrixPosition(T2);
  const pv = pivotWorld
    ? new THREE.Vector3(pivotWorld[0], pivotWorld[1], pivotWorld[2])
    : p1.clone().add(p2).multiplyScalar(0.5); // default: middle of both bodies
  const q1 = new THREE.Quaternion().setFromRotationMatrix(T1); // pivot aligned to Body 1
  const J = new THREE.Matrix4().compose(pv, q1, ONE.clone());
  return {
    origin: decompose(T1.clone().invert().multiply(J)),       // pivot in Body 1 frame
    childRest: decompose(J.clone().invert().multiply(T2)),    // Body 2 in pivot frame
  };
}

/**
 * Recompute a joint's childRest so Body 2 stays put when the pivot (`origin`) is
 * moved to `newOrigin`. childRest' = newOrigin⁻¹ ∘ origin ∘ childRest.
 */
export function movePivotKeepingChild(joint, newOrigin) {
  const On = originMat(newOrigin);
  const Oo = originMat(joint.origin);
  const Cr = originMat(joint.childRest);
  return decompose(On.invert().multiply(Oo).multiply(Cr));
}

/** Distance (m) between two transform-likes' origins. */
export function originDistance(a, b) {
  const pa = a?.position ?? [0, 0, 0];
  const pb = b?.position ?? [0, 0, 0];
  return Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]);
}

/** New joint origin so the child lands at childMatrix (world) for the joint's current value. */
export function originForChildWorld(parentMatrix, joint, childMatrix) {
  const rel = parentMatrix.clone().invert().multiply(childMatrix).multiply(jointDOFMatrix(joint).invert());
  const p = new THREE.Vector3(); const q = new THREE.Quaternion(); const s = new THREE.Vector3();
  rel.decompose(p, q, s);
  return { position: [p.x, p.y, p.z], quaternion: [q.x, q.y, q.z, q.w] };
}
