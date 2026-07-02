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
import type { Document, Origin } from '@/core/model/index';
import { useWorkspaceStore } from '@/state/workspaceStore';

const ONE = new THREE.Vector3(1, 1, 1);

// Pre-allocated temporaries reused across every computeFK call.
// computeFK is called 60fps during animation and from multiple callers per frame,
// so avoiding `new THREE.*` inside the hot path cuts GC pressure significantly.
const _tmpP = new THREE.Vector3();
const _tmpQ = new THREE.Quaternion();
const _tmpS = new THREE.Vector3();
const _tmpM = new THREE.Matrix4();

export function mat(t: any) {
  const [px, py, pz] = t?.position ?? [0, 0, 0];
  const [qx, qy, qz, qw] = t?.quaternion ?? [0, 0, 0, 1];
  return new THREE.Matrix4().compose(
    _tmpP.set(px, py, pz),
    _tmpQ.set(qx, qy, qz, qw),
    ONE,
  );
}

const originMat = (o: any) => mat(o ?? { position: [0, 0, 0], quaternion: [0, 0, 0, 1] });

const _dofAxis = new THREE.Vector3();

/** The joint's degree-of-freedom transform at its current value. */
export function jointDOFMatrix(joint: any) {
  const v = joint.state?.value ?? 0;
  const [ax, ay, az] = joint.axis ?? [0, 0, 1];
  _dofAxis.set(ax, ay, az);
  if (_dofAxis.lengthSq() < 1e-9) _dofAxis.set(0, 0, 1);
  _dofAxis.normalize();
  if (joint.type === 'prismatic') return new THREE.Matrix4().makeTranslation(_dofAxis.x * v, _dofAxis.y * v, _dofAxis.z * v);
  if (joint.type === 'fixed') return new THREE.Matrix4();
  return new THREE.Matrix4().makeRotationAxis(_dofAxis, v); // revolute / continuous / ball
}

/** Inverse of jointDOFMatrix — used when traversing the joint graph in reverse. */
function jointDOFMatrixInverse(joint: any) {
  const v = joint.state?.value ?? 0;
  const [ax, ay, az] = joint.axis ?? [0, 0, 1];
  _dofAxis.set(ax, ay, az);
  if (_dofAxis.lengthSq() < 1e-9) _dofAxis.set(0, 0, 1);
  _dofAxis.normalize();
  if (joint.type === 'prismatic') return new THREE.Matrix4().makeTranslation(-_dofAxis.x * v, -_dofAxis.y * v, -_dofAxis.z * v);
  if (joint.type === 'fixed') return new THREE.Matrix4();
  return new THREE.Matrix4().makeRotationAxis(_dofAxis, -v);
}

/** childBodyId -> the joint whose child it is (first wins). */
export function buildChildJointMap(doc: Document) {
  const m = new Map();
  for (const j of Object.values(doc.joints)) {
    if (j.childBodyId && !m.has(j.childBodyId)) m.set(j.childBodyId, j);
  }
  return m;
}

// ── Tree FK (legacy, "free float" mode) ──────────────────────────────────────

function computeFKTree(doc: any) {
  const childJoint = buildChildJointMap(doc);
  const cache = new Map();
  const visiting = new Set();

  function world(bodyId: any): any {
    if (cache.has(bodyId)) return cache.get(bodyId);
    const body = doc.bodies[bodyId];
    if (!body) return new THREE.Matrix4();
    const j = childJoint.get(bodyId);
    let M;
    if (!j || visiting.has(bodyId) || !doc.bodies[j.parentBodyId]) {
      M = mat(body.transform);
    } else {
      visiting.add(bodyId);
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
    M.decompose(_tmpP, _tmpQ, _tmpS);
    out.set(id, { position: [_tmpP.x, _tmpP.y, _tmpP.z], quaternion: [_tmpQ.x, _tmpQ.y, _tmpQ.z, _tmpQ.w], matrix: M });
  }
  return out;
}

// ── Graph FK (rigid mode) — BFS from active body ──────────────────────────────
// Traverses joints bidirectionally: if arriving from the parentBodyId side the
// DOF applies forward; from the childBodyId side it applies in reverse.
// This means the tree structure is derived at runtime from which body is "active"
// — not from hardcoded parent/child in joint data.

export function computeFKGraph(doc: any, rootBodyId: string) {
  if (!doc.bodies[rootBodyId]) return computeFKTree(doc);

  // Build undirected adjacency: bodyId → [{joint, neighborId}]
  const adj = new Map<string, { joint: any; neighborId: string }[]>();
  for (const id of Object.keys(doc.bodies)) adj.set(id, []);
  for (const j of Object.values(doc.joints) as any[]) {
    if (j.parentBodyId && j.childBodyId && doc.bodies[j.parentBodyId] && doc.bodies[j.childBodyId]) {
      adj.get(j.parentBodyId)!.push({ joint: j, neighborId: j.childBodyId });
      adj.get(j.childBodyId)!.push({ joint: j, neighborId: j.parentBodyId });
    }
  }

  const worldM = new Map<string, THREE.Matrix4>();
  const visited = new Set<string>();
  // Active body is the "ground" — uses its authored transform as the world anchor.
  worldM.set(rootBodyId, mat(doc.bodies[rootBodyId].transform));
  visited.add(rootBodyId);

  const queue: string[] = [rootBodyId];
  while (queue.length > 0) {
    const bodyId = queue.shift()!;
    const parentM = worldM.get(bodyId)!;
    for (const { joint: j, neighborId } of adj.get(bodyId) ?? []) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      let M: THREE.Matrix4;
      if (j.parentBodyId === bodyId) {
        // Forward: parent → child
        M = parentM.clone()
          .multiply(originMat(j.origin))
          .multiply(jointDOFMatrix(j))
          .multiply(originMat(j.childRest));
      } else {
        // Reverse: arrived from child side, solve for the parent
        // child_world = parent_world × origin × DOF × childRest
        // → parent_world = child_world × childRest⁻¹ × DOF⁻¹ × origin⁻¹
        M = parentM.clone()
          .multiply(originMat(j.childRest).invert())
          .multiply(jointDOFMatrixInverse(j))
          .multiply(originMat(j.origin).invert());
      }
      worldM.set(neighborId, M);
      queue.push(neighborId);
    }
  }

  // Bodies not reachable from root use their authored transform.
  for (const id of Object.keys(doc.bodies)) {
    if (!worldM.has(id)) worldM.set(id, mat(doc.bodies[id].transform));
  }

  const out = new Map<string, any>();
  for (const [id, M] of worldM) {
    M.decompose(_tmpP, _tmpQ, _tmpS);
    out.set(id, { position: [_tmpP.x, _tmpP.y, _tmpP.z], quaternion: [_tmpQ.x, _tmpQ.y, _tmpQ.z, _tmpQ.w], matrix: M });
  }
  return out;
}

/** Compute world transforms — delegates to graph FK when in rigid mode. */
export function computeFK(doc: any) {
  const { bodyMode, activeBodyId } = useWorkspaceStore.getState();
  if (bodyMode === 'rigid' && activeBodyId && doc.bodies?.[activeBodyId]) {
    return computeFKGraph(doc, activeBodyId);
  }
  return computeFKTree(doc);
}

/** Rest origin (child-in-parent) from two bodies' authored transforms. */
export function relativeOrigin(parentBody: any, childBody: any) {
  const rel = mat(parentBody.transform).invert().multiply(mat(childBody.transform));
  const p = new THREE.Vector3(); const q = new THREE.Quaternion(); const s = new THREE.Vector3();
  rel.decompose(p, q, s);
  return { position: [p.x, p.y, p.z], quaternion: [q.x, q.y, q.z, q.w] };
}

const decompose = (M: any) => {
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
export function jointFramesForBodies(body1: any, body2: any, pivotWorld: [number, number, number] | null = null) {
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
    origin: decompose(T1.clone().invert().multiply(J)) as Origin,    // pivot in Body 1 frame
    childRest: decompose(J.clone().invert().multiply(T2)) as Origin,  // Body 2 in pivot frame
  };
}

/**
 * Recompute a joint's childRest so Body 2 stays put when the pivot (`origin`) is
 * moved to `newOrigin`. childRest' = newOrigin⁻¹ ∘ origin ∘ childRest.
 */
export function movePivotKeepingChild(joint: any, newOrigin: any) {
  const On = originMat(newOrigin);
  const Oo = originMat(joint.origin);
  const Cr = originMat(joint.childRest);
  return decompose(On.invert().multiply(Oo).multiply(Cr));
}

/** Distance (m) between two transform-likes' origins. */
export function originDistance(a: any, b: any) {
  const pa = a?.position ?? [0, 0, 0];
  const pb = b?.position ?? [0, 0, 0];
  return Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]);
}

/** New joint origin so the child lands at childMatrix (world) for the joint's current value. */
export function originForChildWorld(parentMatrix: any, joint: any, childMatrix: any) {
  const rel = parentMatrix.clone().invert().multiply(childMatrix).multiply(jointDOFMatrix(joint).invert());
  const p = new THREE.Vector3(); const q = new THREE.Quaternion(); const s = new THREE.Vector3();
  rel.decompose(p, q, s);
  return { position: [p.x, p.y, p.z], quaternion: [q.x, q.y, q.z, q.w] };
}