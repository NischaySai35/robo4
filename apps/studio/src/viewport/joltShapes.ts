/**
 * joltShapes — body geometry -> Jolt Shape, same mapping colliderFactory.ts
 * (Rapier) and mjcfGen.ts/rigidGeomXml.ts (MuJoCo) did for their engines.
 *
 * makeJoltShapeSettings returns raw ShapeSettings (needed by compound-shape
 * builders like RigidTumbleSim, whose CompoundShapeSettings.AddShape takes
 * ShapeSettings, not a finished Shape — verified against the real WASM
 * build). makeJoltShape creates and returns the final Shape, for direct use
 * in BodyCreationSettings.
 *
 * Improvement over the MuJoCo port: Jolt has a real TAPERED CYLINDER shape,
 * so CONE geometry gets an honest cone (top radius ~0) instead of the
 * cylinder approximation MJCF's lack of a native cone primitive forced.
 */
import * as THREE from 'three';
import { GeometryType } from '@/core/model/index';
import type { JoltModule } from './joltLoader';

function radiallyUniform(sx: number, sy: number): boolean {
  const a = Math.abs(sx), b = Math.abs(sy);
  return Math.abs(a - b) <= 1e-4 * Math.max(a, b, 1);
}

// Visual meshes (BodyRenderer) build Y-aligned primitives then rotateX(pi/2),
// so a body's cylinder/capsule/cone runs along its local Z axis — same
// convention colliderFactory.ts documents for Rapier. Jolt's cylinder/capsule
// are Y-aligned like Rapier's, so the same +90 deg X rotation applies.
const ROT_Z_ALIGNED = { x: Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 };

export interface JoltShapeOpts {
  hullPoints?: Float32Array | null;
}

/**
 * Largest convex radius (collision margin) we'll ever ask Jolt for. Jolt runs GJK on the
 * shape SHRUNK by this radius and then re-inflates the result — a robustness trick that is
 * only invisible while the margin is small relative to the shape.
 */
const MAX_CONVEX_RADIUS = 0.02;
/** Margin as a fraction of the shape's SMALLEST half-extent. */
const CONVEX_RADIUS_FRACTION = 0.1;

/**
 * Pick a collision margin that is small RELATIVE TO THE PART, instead of a flat 0.02.
 *
 * Two separate problems with the old hardcoded 0.02 (2cm), both caused by this app's real
 * modules being 5-15cm — a scale at which 2cm is not a "margin" at all:
 *
 *  1. GEOMETRIC. Jolt shrinks the shape by the convex radius and rounds it back out, so a
 *     4cm-radius wheel with a 2cm margin is HALF rounding — it is not meaningfully a
 *     cylinder any more, and a 8cm box becomes a box with 2cm-radius corners, which rests
 *     and tips quite differently than the box that's actually rendered. Physics resolving
 *     against a shape this far from the visual mesh is exactly the "looks fine, behaves
 *     wrong" class of bug.
 *  2. HARD FAILURE. Jolt requires convexRadius <= every half-extent. computeWheelGeometry's
 *     halfLen floors at 0.015, BELOW the old flat 0.02 — so a thin wheel produced an invalid
 *     CylinderShapeSettings, whose Create() fails, which dynamicSim's build loop swallowed
 *     silently (`if (!result.IsValid()) continue`), dropping an entire cluster with no error.
 *
 * Scaling to the smallest half-extent fixes both at once and is self-maintaining for any
 * future part size. The cap keeps large parts from getting an absurdly thick margin.
 */
export function convexRadiusFor(...halfExtents: number[]): number {
  let min = Infinity;
  for (const h of halfExtents) if (Number.isFinite(h) && h > 0 && h < min) min = h;
  if (!Number.isFinite(min)) return 0;
  return Math.min(MAX_CONVEX_RADIUS, CONVEX_RADIUS_FRACTION * min);
}

/** Wrap `inner` (ShapeSettings) in a RotatedTranslatedShapeSettings if a local offset/rotation is needed. */
function maybeOffset(Jolt: JoltModule, inner: any, pos: THREE.Vector3, quat: { x: number; y: number; z: number; w: number }): any {
  const isIdentity = pos.lengthSq() < 1e-12 && Math.abs(quat.x) < 1e-9 && Math.abs(quat.y) < 1e-9 && Math.abs(quat.z) < 1e-9 && Math.abs(quat.w - 1) < 1e-9;
  if (isIdentity) return inner;
  return new Jolt.RotatedTranslatedShapeSettings(
    new Jolt.Vec3(pos.x, pos.y, pos.z),
    new Jolt.Quat(quat.x, quat.y, quat.z, quat.w),
    inner,
  );
}

/**
 * Build the ShapeSettings for a body's collision geometry. Returns null only
 * if geometry is missing. Mirrors colliderFactory.makeColliderDesc's contract
 * (including the "non-uniform radial scale falls back to a box, honestly"
 * behavior).
 */
export function makeJoltShapeSettings(Jolt: JoltModule, body: any, opts: JoltShapeOpts = {}): any | null {
  const g = body?.visual?.geometry ?? {};
  const s = body?.transform?.scale ?? [1, 1, 1];
  const sx = Math.abs(s[0]), sy = Math.abs(s[1]), sz = Math.abs(s[2]);

  const cuboidFallback = () => {
    switch (g.type) {
      case GeometryType.CYLINDER:
      case GeometryType.CAPSULE:
      case GeometryType.CONE: {
        const r = g.radius ?? 0.5, l = g.length ?? 1;
        const hx = r * sx, hy = r * sy, hz = (l * sz) / 2;
        return new Jolt.BoxShapeSettings(new Jolt.Vec3(hx, hy, hz), convexRadiusFor(hx, hy, hz));
      }
      default: {
        const hx = 0.4 * sx, hy = 0.4 * sy, hz = 0.4 * sz;
        return new Jolt.BoxShapeSettings(new Jolt.Vec3(hx, hy, hz), convexRadiusFor(hx, hy, hz));
      }
    }
  };

  switch (g.type) {
    case GeometryType.SPHERE:
      return new Jolt.SphereShapeSettings((g.radius ?? 0.5) * Math.max(sx, sy, sz));

    case GeometryType.BOX: {
      const sz0 = g.size ?? [1, 1, 1];
      const hx = Math.abs(sz0[0] * s[0]) / 2, hy = Math.abs(sz0[1] * s[1]) / 2, hz = Math.abs(sz0[2] * s[2]) / 2;
      return new Jolt.BoxShapeSettings(new Jolt.Vec3(hx, hy, hz), convexRadiusFor(hx, hy, hz));
    }

    case GeometryType.CYLINDER: {
      if (!radiallyUniform(sx, sy)) return cuboidFallback();
      const r = (g.radius ?? 0.5) * sx, halfH = ((g.length ?? 1) * sz) / 2;
      return maybeOffset(Jolt, new Jolt.CylinderShapeSettings(halfH, r, convexRadiusFor(halfH, r)), new THREE.Vector3(), ROT_Z_ALIGNED);
    }

    case GeometryType.CAPSULE: {
      if (!radiallyUniform(sx, sy)) return cuboidFallback();
      const r = (g.radius ?? 0.5) * sx, halfH = ((g.length ?? 1) * sz) / 2;
      return maybeOffset(Jolt, new Jolt.CapsuleShapeSettings(halfH, r), new THREE.Vector3(), ROT_Z_ALIGNED);
    }

    case GeometryType.CONE: {
      if (!radiallyUniform(sx, sy)) return cuboidFallback();
      const r = (g.radius ?? 0.5) * sx, halfH = ((g.length ?? 1) * sz) / 2;
      // A true cone: top radius ~0 (Jolt needs a small nonzero radius), base = r.
      // The near-zero TOP radius is itself a half-extent, so it caps the legal convex radius
      // — feeding it through convexRadiusFor keeps the shape valid (a margin larger than the
      // tip would make Create() fail) at the cost of a very small margin here. Cones are rare
      // in this app's models, so validity is worth more than GJK margin robustness.
      const topR = 0.001;
      return maybeOffset(Jolt, new Jolt.TaperedCylinderShapeSettings(halfH, topR, r, convexRadiusFor(halfH, topR, r)), new THREE.Vector3(), ROT_Z_ALIGNED);
    }

    case GeometryType.MESH: {
      const hp = opts.hullPoints;
      if (hp && hp.length >= 12) {
        const chs = new Jolt.ConvexHullShapeSettings();
        let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (let i = 0; i < hp.length; i += 3) {
          const x = hp[i] * sx, y = hp[i + 1] * sy, z = hp[i + 2] * sz;
          chs.mPoints.push_back(new Jolt.Vec3(x, y, z));
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        }
        // Every OTHER shape here passes an explicit 0.02 collision margin. This one didn't,
        // which meant it silently used Jolt's built-in default (0.05m / 5cm). This app's real
        // modules are typically 5-15cm — a 5cm margin puffs each mesh's collision boundary out
        // far beyond what's visually rendered, so neighboring/resting parts end up with their
        // (invisible) collision shapes constantly overlapping even when they look fine, and the
        // solver fights that phantom overlap every frame: exactly the violent shaking + parts
        // visually sinking through the floor (physics resolves against the inflated shape, the
        // render draws the true mesh, so they visibly diverge).
        // Now scaled to THIS hull's own bounding box rather than a flat 0.02 — the 0.02 was
        // itself still a large fraction of a 5cm module, so the same "puffed-out shape" effect
        // it was written to fix was only partly fixed. (This one is a MAX — Jolt shrinks it
        // further if the hull demands — but starting from a size-appropriate value keeps small
        // parts honest instead of relying on that clamp.)
        chs.mMaxConvexRadius = convexRadiusFor((maxX - minX) / 2, (maxY - minY) / 2, (maxZ - minZ) / 2);
        return chs;
      }
      return cuboidFallback();
    }

    default: // torus: bbox approximation, same as colliderFactory
      return cuboidFallback();
  }
}

/** Build a Jolt Shape (created, ready for BodyCreationSettings) for a body. */
export function makeJoltShape(Jolt: JoltModule, body: any, opts: JoltShapeOpts = {}): any | null {
  const settings = makeJoltShapeSettings(Jolt, body, opts);
  if (!settings) return null;
  const result = settings.Create();
  return result.IsValid() ? result.Get() : null;
}
