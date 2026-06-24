/**
 * URDF export fidelity: the exporter must emit the data the importer reads back —
 * visual origin and (scale-baked) geometry dimensions were previously dropped, so a
 * round-trip silently lost them. It must also surface honest warnings for things URDF
 * cannot represent (capsule/cone, external meshes).
 *
 * These assert on the emitted XML (where the bugs were); the importer already parses
 * these same fields, so fixing the export side closes the round-trip gap. Full DOM
 * parse-back is exercised in the browser (the importer uses the browser DOMParser).
 *
 * Run: npx tsx --test src/core/serialization/urdfRoundTrip.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDocument, makeBody, makeJoint, makeGeometry, GeometryType, JointType } from '@/core/model/index';
import { exportURDF } from '@/core/serialization/exporters/urdf';

function docOf(bodies: any[], joints: any[] = []) {
  const doc: any = makeDocument({ name: 'RT' });
  doc.bodies = Object.fromEntries(bodies.map((b) => [b.id, b]));
  doc.joints = Object.fromEntries(joints.map((j) => [j.id, j]));
  return doc;
}

// number formatting matches the exporter's n(): 6 decimals, or "0" for ~zero.
const f = (v: number) => (Math.abs(v) < 1e-9 ? '0' : v.toFixed(6));

test('box geometry bakes the transform scale into its dimensions', () => {
  const base = makeBody({
    name: 'base', visual: { geometry: makeGeometry(GeometryType.BOX, { size: [1, 1, 1] }), materialId: null, origin: undefined as any },
    transform: { position: [0, 0, 0], quaternion: [0, 0, 0, 1], scale: [2, 1, 3] },
  });
  const xml = exportURDF(docOf([base]));
  assert.ok(xml.includes(`<box size="${f(2)} ${f(1)} ${f(3)}"/>`), `scale baked: \n${xml}`);
});

test('cylinder bakes radial + axial scale', () => {
  const cyl = makeBody({
    name: 'cyl', visual: { geometry: makeGeometry(GeometryType.CYLINDER, { radius: 0.1, length: 0.5 }), materialId: null, origin: undefined as any },
    transform: { position: [0, 0, 0], quaternion: [0, 0, 0, 1], scale: [2, 2, 4] },
  });
  const xml = exportURDF(docOf([cyl]));
  assert.ok(xml.includes(`<cylinder radius="${f(0.2)}" length="${f(2)}"/>`), `cyl scale baked:\n${xml}`);
});

test('visual origin is emitted (was previously hardcoded to zero)', () => {
  const link = makeBody({
    name: 'link',
    visual: { geometry: makeGeometry(GeometryType.SPHERE, { radius: 0.2 }), materialId: null, origin: { position: [0.1, -0.2, 0.3], quaternion: [0, 0, 0, 1] } },
    transform: { position: [0, 0, 0], quaternion: [0, 0, 0, 1], scale: [1, 1, 1] },
  });
  const xml = exportURDF(docOf([link]));
  assert.ok(xml.includes(`<origin xyz="${f(0.1)} ${f(-0.2)} ${f(0.3)}" rpy="0 0 0"/>`), `visual origin:\n${xml}`);
});

test('joint origin, axis and limits are emitted', () => {
  const a = makeBody({ name: 'a', transform: { position: [0, 0, 0], quaternion: [0, 0, 0, 1], scale: [1, 1, 1] } });
  const b = makeBody({ name: 'b', transform: { position: [0, 0, 0], quaternion: [0, 0, 0, 1], scale: [1, 1, 1] } });
  const j = makeJoint({
    name: 'j1', type: JointType.REVOLUTE, parentBodyId: a.id, childBodyId: b.id,
    axis: [0, 1, 0], origin: { position: [0.5, 0, 0.25], quaternion: [0, 0, 0, 1] },
    limit: { lower: -1.2, upper: 0.8, effort: 7, velocity: 3 },
  });
  const xml = exportURDF(docOf([a, b], [j]));
  assert.ok(xml.includes(`<axis xyz="0 ${f(1)} 0"/>`), 'axis');
  assert.ok(xml.includes(`<origin xyz="${f(0.5)} 0 ${f(0.25)}"`), 'joint origin');
  assert.ok(xml.includes(`<limit lower="${f(-1.2)}" upper="${f(0.8)}" effort="${f(7)}" velocity="${f(3)}"/>`), 'limits');
});

test('capsule/cone and mesh links produce honest warnings', () => {
  const cap = makeBody({ name: 'cap', visual: { geometry: makeGeometry(GeometryType.CAPSULE, { radius: 0.1, length: 0.4 }), materialId: null, origin: undefined as any }, transform: { position: [0, 0, 0], quaternion: [0, 0, 0, 1], scale: [1, 1, 1] } });
  const mesh = makeBody({ name: 'm', visual: { geometry: makeGeometry(GeometryType.MESH, { assetId: 'foo' }), materialId: null, origin: undefined as any }, transform: { position: [0, 0, 0], quaternion: [0, 0, 0, 1], scale: [1, 1, 1] } });
  const xml = exportURDF(docOf([cap, mesh]));
  assert.match(xml, /capsule\/cone link\(s\) exported as cylinder/);
  assert.match(xml, /mesh link\(s\) reference external \.stl/);
  // capsule degrades to a cylinder the importer can still read
  assert.ok(xml.includes(`<cylinder radius="${f(0.1)}" length="${f(0.4)}"/>`), 'capsule→cylinder');
  // mesh carries its scale so the importer can preserve plausible size
  assert.ok(xml.includes('<mesh filename="meshes/foo.stl" scale="'), 'mesh scale attr');
});
