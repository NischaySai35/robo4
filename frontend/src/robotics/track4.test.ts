/**
 * Track 4 (definition + CAD) tests. Run: npx tsx --test src/robotics/track4.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { convexHull, type Vec3 } from '@/robotics/geometry/convexHull';
import { armMacro, expandChain } from '@/core/model/macros';
import { makeDocument } from '@/core/model/index';
import { exportSDF } from '@/core/serialization/exporters/sdf';
import { exportMJCF } from '@/core/serialization/exporters/mjcf';
import { exportURDF } from '@/core/serialization/exporters/urdf';

test('convexHull of a cube contains all interior points', () => {
  const corners: Vec3[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) corners.push([x, y, z]);
  // add interior noise points (should not extend the hull)
  const pts = [...corners];
  for (let i = 0; i < 50; i++) pts.push([Math.random() * 1.6 - 0.8, Math.random() * 1.6 - 0.8, Math.random() * 1.6 - 0.8]);
  const hull = convexHull(pts);
  assert.ok(hull, 'expected a hull');
  for (const p of pts) assert.ok(hull!.inside(p, 1e-6), `point ${p} should be inside`);
  // a point well outside must be rejected
  assert.ok(!hull!.inside([5, 0, 0]));
  // hull vertices are a subset of the corners (interior points excluded)
  assert.ok(hull!.vertices.length <= 8 + 1e-9, `got ${hull!.vertices.length} verts`);
});

test('armMacro is parametric: segment count drives body/joint counts', () => {
  const s3 = armMacro({ segments: 3 });
  assert.equal(s3.links.length, 4);   // base + 3
  assert.equal(s3.joints.length, 3);
  const s6 = armMacro({ segments: 6 });
  assert.equal(s6.links.length, 7);
  assert.equal(s6.joints.length, 6);
});

test('expandChain emits real bodies + joints into a Document', () => {
  const { doc, bodyIds, jointIds } = expandChain(makeDocument({ name: 'M' }), armMacro({ segments: 4, length: 0.5 }));
  assert.equal(bodyIds.length, 5);
  assert.equal(jointIds.length, 4);
  assert.equal(Object.keys(doc.bodies).length, 5);
  assert.equal(Object.keys(doc.joints).length, 4);
});

test('SDF/MJCF/URDF exporters produce well-formed output for a real arm', () => {
  const { doc } = expandChain(makeDocument({ name: 'Arm' }), armMacro({ segments: 3 }));
  const sdf = exportSDF(doc, 'Arm');
  assert.match(sdf, /<sdf version="1.7">/);
  assert.match(sdf, /<model name="Arm">/);
  assert.equal((sdf.match(/<link /g) ?? []).length, 4);
  assert.equal((sdf.match(/<joint /g) ?? []).length, 3);

  const mjcf = exportMJCF(doc, 'Arm');
  assert.match(mjcf, /<mujoco model="Arm">/);
  assert.match(mjcf, /<worldbody>/);
  assert.equal((mjcf.match(/<body /g) ?? []).length, 4);     // nested bodies
  assert.equal((mjcf.match(/type="hinge"/g) ?? []).length, 3);

  const urdf = exportURDF(doc, 'Arm');
  assert.match(urdf, /<robot name="Arm">/);
  assert.equal((urdf.match(/<joint /g) ?? []).length, 3);
});
