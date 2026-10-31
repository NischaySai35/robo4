import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { exportSDF } from './sdf';

// A ring of four bars. Each joint sits halfway between two bars; one bar is turned 90° so rotations matter.
const yaw = (deg: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (deg * Math.PI) / 180);
const q4 = (q: THREE.Quaternion) => [q.x, q.y, q.z, q.w];
const at: Record<string, [number[], THREE.Quaternion]> = {
  A: [[0, 0, 0], yaw(0)], B: [[0.2, 0, 0], yaw(0)], C: [[0.2, 0.2, 0], yaw(90)], D: [[0, 0.2, 0], yaw(0)],
};
const body = (id: string) => ({ kind: 'body', id, name: id, transform: { position: at[id][0], quaternion: q4(at[id][1]), scale: [1, 1, 1] },
  visual: { geometry: { type: 'box', size: [0.02, 0.02, 0.02] }, materialId: null }, inertial: { mass: 0.1, auto: true } });
/** origin = joint frame in the parent, childRest = child in the joint frame, from world poses. */
function joint(id: string, p: string, c: string, pivot: number[]) {
  const world = (b: string) => new THREE.Matrix4().compose(new THREE.Vector3(...at[b][0]), at[b][1], new THREE.Vector3(1, 1, 1));
  const J = new THREE.Matrix4().makeTranslation(pivot[0], pivot[1], pivot[2]);
  const split = (m: THREE.Matrix4) => { const P = new THREE.Vector3(), Q = new THREE.Quaternion(); m.decompose(P, Q, new THREE.Vector3()); return { position: P.toArray(), quaternion: q4(Q) }; };
  return { kind: 'joint', id, name: id, type: 'revolute', parentBodyId: p, childBodyId: c, axis: [0, 0, 1], limit: { lower: -1, upper: 1, effort: 1, velocity: 1 },
    origin: split(world(p).invert().multiply(J)), childRest: split(J.clone().invert().multiply(world(c))), pivot };
}
const joints = [joint('ab', 'A', 'B', [0.1, 0, 0]), joint('bc', 'B', 'C', [0.2, 0.1, 0]), joint('cd', 'C', 'D', [0.1, 0.2, 0]), joint('da', 'D', 'A', [0, 0.1, 0])];
const doc: any = { name: 'ring', bodies: Object.fromEntries(Object.keys(at).map((k) => [k, body(k)])), joints: Object.fromEntries(joints.map((j) => [j.id, j])), materials: {}, assets: {} };

const nums = (s: string) => s.trim().split(/\s+/).map(Number);
const frame = (p: number[]) => new THREE.Matrix4().compose(new THREE.Vector3(p[0], p[1], p[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(p[3], p[4], p[5], 'XYZ')), new THREE.Vector3(1, 1, 1));

test('SDF keeps the ring-closing joint, and every joint sits where both of its bars say', () => {
  const sdf = exportSDF(doc, 'ring');
  const links = Object.fromEntries([...sdf.matchAll(/<link name="(\w+)">\s*<pose>([^<]+)<\/pose>/g)].map((m) => [m[1], frame(nums(m[2]))]));
  const found = [...sdf.matchAll(/<joint name="(\w+)"[^>]*>\s*<parent>\w+<\/parent>\s*<child>(\w+)<\/child>\s*<pose>([^<]+)<\/pose>/g)];
  assert.deepEqual(found.map((m) => m[1]).sort(), ['ab', 'bc', 'cd', 'da'], 'all four joints, the ring-closing one included');
  for (const [, name, child, p] of found) {
    const world = new THREE.Vector3().setFromMatrixPosition(links[child].clone().multiply(frame(nums(p))));
    const want = joints.find((j) => j.id === name)!.pivot;
    assert.ok(world.distanceTo(new THREE.Vector3(...want)) < 1e-6, `${name} at ${world.toArray()} not ${want}`);
  }
});
