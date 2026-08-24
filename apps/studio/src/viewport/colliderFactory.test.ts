/**
 * Collider factory: cylinder/capsule/cone links must produce TRUE Rapier primitives
 * (not box approximations), so collision geometry matches the visual mesh. Non-uniform
 * cross-section scale falls back to a cuboid bound rather than a distorted primitive.
 *
 * Run: npx tsx --test src/viewport/colliderFactory.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { makeGeometry, GeometryType } from '@/core/model/index';
import { makeColliderDesc, convexHullPoints } from '@/viewport/colliderFactory';

const ST = RAPIER.ShapeType;
const body = (type: GeometryType, geoOpts: any, scale = [1, 1, 1]) => ({
  visual: { geometry: makeGeometry(type, geoOpts) },
  transform: { scale },
});

test('rapier ShapeType is available', async () => {
  await RAPIER.init();
  assert.ok(ST.Cylinder != null && ST.Capsule != null && ST.Cone != null);
});

test('cylinder/capsule/cone emit true primitives, not cuboids', async () => {
  await RAPIER.init();
  assert.equal(makeColliderDesc(body(GeometryType.CYLINDER, { radius: 0.3, length: 1 }))!.shape.type, ST.Cylinder);
  assert.equal(makeColliderDesc(body(GeometryType.CAPSULE, { radius: 0.3, length: 1 }))!.shape.type, ST.Capsule);
  assert.equal(makeColliderDesc(body(GeometryType.CONE, { radius: 0.3, length: 1 }))!.shape.type, ST.Cone);
});

test('box → cuboid, sphere → ball', async () => {
  await RAPIER.init();
  assert.equal(makeColliderDesc(body(GeometryType.BOX, { size: [1, 1, 1] }))!.shape.type, ST.Cuboid);
  assert.equal(makeColliderDesc(body(GeometryType.SPHERE, { radius: 0.5 }))!.shape.type, ST.Ball);
});

test('non-uniform radial scale falls back to a cuboid (no distorted primitive)', async () => {
  await RAPIER.init();
  const d = makeColliderDesc(body(GeometryType.CYLINDER, { radius: 0.3, length: 1 }, [1, 2, 1]));
  assert.equal(d!.shape.type, ST.Cuboid);
});

// A unit cube point cloud: 8 corners + interior points (which the hull must discard).
const cubeCloud = () => {
  const pts: number[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) pts.push(x, y, z);
  pts.push(0, 0, 0, 0.5, -0.3, 0.2, -0.1, 0.4, -0.6); // interior — should not appear in the hull
  return pts;
};

test('convexHullPoints returns the 8 cube corners and discards interior points', async () => {
  const hp = convexHullPoints(cubeCloud())!;
  assert.equal(hp.length, 8 * 3, 'eight hull vertices');
  for (let i = 0; i < hp.length; i++) assert.ok(Math.abs(Math.abs(hp[i]) - 1) < 1e-9, 'all coords ±1');
});

test('mesh body with hull points emits a convex-polyhedron collider (not a box)', async () => {
  await RAPIER.init();
  const meshBody = { visual: { geometry: makeGeometry(GeometryType.MESH, { assetId: 'a' }) }, transform: { scale: [1, 1, 1] } };
  const withHull = makeColliderDesc(meshBody, { hullPoints: convexHullPoints(cubeCloud())! });
  assert.equal(withHull!.shape.type, ST.ConvexPolyhedron);
  // no hull supplied → safe bbox fallback
  const noHull = makeColliderDesc(meshBody);
  assert.equal(noHull!.shape.type, ST.Cuboid);
});

test('degenerate (coplanar) point cloud falls back to a bbox collider', async () => {
  await RAPIER.init();
  const flat = [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]; // all z=0 → no volume
  assert.equal(convexHullPoints(flat), null);
  const meshBody = { visual: { geometry: makeGeometry(GeometryType.MESH, { assetId: 'a' }) }, transform: { scale: [1, 1, 1] } };
  assert.equal(makeColliderDesc(meshBody, { hullPoints: convexHullPoints(flat) })!.shape.type, ST.Cuboid);
});

test('cylinder collider is Z-aligned to match the visual mesh', async () => {
  await RAPIER.init();
  const d = makeColliderDesc(body(GeometryType.CYLINDER, { radius: 0.3, length: 2 }));
  // +90° about X → quaternion (√½, 0, 0, √½); maps Rapier Y axis onto the model Z axis.
  assert.ok(Math.abs(d!.rotation.x - Math.SQRT1_2) < 1e-6, 'rotated about X');
  assert.ok(Math.abs(d!.rotation.w - Math.SQRT1_2) < 1e-6);
  // halfHeight = length/2 = 1.0 for the cylinder part.
  assert.ok(Math.abs((d!.shape as any).halfHeight - 1.0) < 1e-6);
});
