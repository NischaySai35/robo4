/**
 * IK: position-only (regression) and full 6-DOF pose (position + orientation).
 *
 * Strategy: pick known joint values, run FK to get a definitely-reachable goal pose,
 * reset the joints, then solve IK back to that pose and check it converges.
 *
 * Run: npx tsx --test src/kinematics/modelIK.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeDocument, makeGeometry, GeometryType } from '@/core/model/index';
import { buildSerialChain } from '@/core/model/builders';
import { computeFK } from '@/kinematics/modelFK';
import { solveModelIK } from '@/kinematics/modelIK';

// A 6-DOF arm with varied joint axes, so arbitrary tool orientations are reachable.
function build6dof() {
  const box = makeGeometry(GeometryType.BOX, { size: [0.3, 0.15, 0.15] });
  const axes = [[0, 0, 1], [0, 1, 0], [0, 1, 0], [1, 0, 0], [0, 1, 0], [1, 0, 0]];
  const links = Array.from({ length: 7 }, (_, i) => ({
    name: `L${i}`, geometry: box,
    transform: { position: [i * 0.35, 1, 0], quaternion: [0, 0, 0, 1] },
  }));
  const joints = axes.map((axis, i) => ({
    name: `J${i}`, type: 'revolute', axis,
    limit: { lower: -Math.PI, upper: Math.PI, effort: 5, velocity: 2 },
    origin: { position: [0.35, 0, 0], quaternion: [0, 0, 0, 1] },
  }));
  return buildSerialChain(makeDocument({ name: 'Arm6' }), { name: 'Arm6', links, joints }).doc;
}

/** The leaf body: a child of some joint but parent of none. */
function tipId(doc: any): string {
  const parents = new Set(Object.values(doc.joints).map((j: any) => j.parentBodyId));
  const children = Object.values(doc.joints).map((j: any) => j.childBodyId);
  return children.find((c: any) => !parents.has(c)) as string;
}

/** Set joint values on a copy of the doc and return it. */
function withValues(doc: any, vals: Record<string, number>) {
  const joints: any = {};
  for (const [id, j] of Object.entries<any>(doc.joints)) {
    joints[id] = id in vals ? { ...j, state: { ...j.state, value: vals[id] } } : j;
  }
  return { ...doc, joints };
}

test('position-only IK reaches a reachable target (regression)', () => {
  const doc = build6dof();
  const tip = tipId(doc);
  const ids = Object.keys(doc.joints);
  const goalVals = Object.fromEntries(ids.map((id, i) => [id, 0.3 * Math.sin(i + 1)]));
  const goalPose = computeFK(withValues(doc, goalVals)).get(tip)!;

  const sol = solveModelIK(doc, tip, goalPose.position, { iterations: 150, lambda: 0.3 })!;
  const got = computeFK(withValues(doc, sol)).get(tip)!;
  const perr = new THREE.Vector3(...got.position).distanceTo(new THREE.Vector3(...goalPose.position));
  assert.ok(perr < 5e-3, `position error ${perr}`);
});

test('6-DOF IK matches both position and orientation', () => {
  const doc = build6dof();
  const tip = tipId(doc);
  const ids = Object.keys(doc.joints);
  const goalVals = Object.fromEntries(ids.map((id, i) => [id, 0.4 * Math.cos(i * 1.7 + 0.5)]));
  const goalPose = computeFK(withValues(doc, goalVals)).get(tip)!;

  const sol = solveModelIK(doc, tip, goalPose.position, {
    targetQuaternion: goalPose.quaternion, iterations: 200, lambda: 0.4,
  })!;
  const got = computeFK(withValues(doc, sol)).get(tip)!;

  const perr = new THREE.Vector3(...got.position).distanceTo(new THREE.Vector3(...goalPose.position));
  const qGot = new THREE.Quaternion(...got.quaternion);
  const qGoal = new THREE.Quaternion(...goalPose.quaternion);
  const dot = Math.min(1, Math.abs(qGot.dot(qGoal)));
  const angErr = 2 * Math.acos(dot); // radians between orientations

  assert.ok(perr < 1e-2, `position error ${perr}`);
  assert.ok(angErr < 0.05, `orientation error ${angErr} rad`);
});

test('solutions respect joint limits', () => {
  const doc = build6dof();
  const tip = tipId(doc);
  // Tighten one joint's limits and demand a far target; the solution must stay in range.
  const ids = Object.keys(doc.joints);
  doc.joints[ids[0]].limit = { lower: -0.2, upper: 0.2, effort: 5, velocity: 2 };
  const sol = solveModelIK(doc, tip, [5, 5, 5], { iterations: 60 })!;
  assert.ok(sol[ids[0]] >= -0.2 - 1e-9 && sol[ids[0]] <= 0.2 + 1e-9, `joint within limits: ${sol[ids[0]]}`);
});
