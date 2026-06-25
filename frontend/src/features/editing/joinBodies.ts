/**
 * joinBodies — merge the geometry of multiple selected bodies into one.
 *
 * Collects each body's editMesh (or falls back to a simple box placeholder),
 * transforms verts to world space, subtracts the group centroid, concatenates
 * index buffers, then dispatches removeBody × N + addBody × 1 as individual
 * commands (undo collapses them naturally in the history).
 */
import * as THREE from 'three';
import { useSelectionStore } from '@/state/selectionStore';
import { useModelStore } from '@/state/modelStore';
import { makeBody, makeGeometry, GeometryType } from '@/core/model/index';
import { commands } from '@/core/commands/index';

function bodyEditMeshPositions(body: any): number[] | null {
  const em = body.visual?.geometry?.editMesh;
  if (em?.positions?.length) return [...em.positions];
  return null;
}

function primitivePositions(body: any): number[] {
  // Fallback: 8 corners of a unit cube scaled by scale
  const [sx, sy, sz] = body.transform.scale ?? [1, 1, 1];
  const h = [sx * 0.5, sy * 0.5, sz * 0.5];
  const verts: number[] = [];
  for (const x of [-h[0], h[0]]) for (const y of [-h[1], h[1]]) for (const z of [-h[2], h[2]]) verts.push(x, y, z);
  return verts;
}

function boxIndices(offset: number): number[] {
  // 12 triangles for a cube (2 per face × 6 faces)
  const f = (a: number, b: number, c: number, d: number) => [a, b, c, a, c, d];
  return [
    ...f(0, 1, 3, 2), ...f(4, 6, 7, 5),
    ...f(0, 4, 5, 1), ...f(2, 3, 7, 6),
    ...f(0, 2, 6, 4), ...f(1, 5, 7, 3),
  ].map(i => i + offset);
}

export function joinSelectedBodies() {
  const sel = useSelectionStore.getState();
  if (sel.kind !== 'body') { alert('Select 2 or more bodies to join.'); return; }
  const { doc, dispatch } = useModelStore.getState();
  // Collect all selected body ids; at least the active one
  const ids = [sel.selectedId].filter(Boolean) as string[];
  if (ids.length < 2) { alert('Select 2 or more bodies to join.'); return; }

  const allPositions: number[] = [];
  const allIndices: number[] = [];
  const centroids: THREE.Vector3[] = [];

  // Compute group centroid from body positions
  for (const id of ids) {
    const body = doc.bodies[id];
    if (!body) continue;
    centroids.push(new THREE.Vector3(...body.transform.position));
  }
  const centroid = centroids.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / centroids.length);

  for (const id of ids) {
    const body = doc.bodies[id];
    if (!body) continue;
    const [px, py, pz] = body.transform.position;
    const [qx, qy, qz, qw] = body.transform.quaternion;
    const [sx, sy, sz] = body.transform.scale;

    const wMat = new THREE.Matrix4().compose(
      new THREE.Vector3(px, py, pz),
      new THREE.Quaternion(qx, qy, qz, qw),
      new THREE.Vector3(sx, sy, sz),
    );

    const localPos = bodyEditMeshPositions(body) ?? primitivePositions(body);
    const vertexOffset = allPositions.length / 3;

    for (let i = 0; i < localPos.length; i += 3) {
      const v = new THREE.Vector3(localPos[i], localPos[i + 1], localPos[i + 2]).applyMatrix4(wMat);
      allPositions.push(v.x - centroid.x, v.y - centroid.y, v.z - centroid.z);
    }

    const em = body.visual?.geometry?.editMesh;
    if (em?.indices?.length) {
      for (const idx of em.indices) allIndices.push(idx + vertexOffset);
    } else {
      allIndices.push(...boxIndices(vertexOffset));
    }
  }

  const newBody = makeBody({
    name: 'Joined',
    transform: {
      position: [centroid.x, centroid.y, centroid.z],
      quaternion: [0, 0, 0, 1],
      scale: [1, 1, 1],
    },
    visual: {
      geometry: {
        ...makeGeometry(GeometryType.MESH),
        editMesh: { positions: allPositions, indices: allIndices },
      },
      materialId: doc.bodies[ids[0]]?.visual?.materialId ?? null,
      origin: { position: [0, 0, 0], quaternion: [0, 0, 0, 1] },
    },
  });

  for (const id of ids) dispatch(commands.removeBody(id));
  dispatch(commands.addBody(newBody));
  useSelectionStore.getState().select(newBody.id, 'body');
}
