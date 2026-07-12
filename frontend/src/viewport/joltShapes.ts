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
        return new Jolt.BoxShapeSettings(new Jolt.Vec3(r * sx, r * sy, (l * sz) / 2), 0.02);
      }
      default:
        return new Jolt.BoxShapeSettings(new Jolt.Vec3(0.4 * sx, 0.4 * sy, 0.4 * sz), 0.02);
    }
  };

  switch (g.type) {
    case GeometryType.SPHERE:
      return new Jolt.SphereShapeSettings((g.radius ?? 0.5) * Math.max(sx, sy, sz));

    case GeometryType.BOX: {
      const sz0 = g.size ?? [1, 1, 1];
      return new Jolt.BoxShapeSettings(
        new Jolt.Vec3(Math.abs(sz0[0] * s[0]) / 2, Math.abs(sz0[1] * s[1]) / 2, Math.abs(sz0[2] * s[2]) / 2), 0.02,
      );
    }

    case GeometryType.CYLINDER: {
      if (!radiallyUniform(sx, sy)) return cuboidFallback();
      const r = (g.radius ?? 0.5) * sx, halfH = ((g.length ?? 1) * sz) / 2;
      return maybeOffset(Jolt, new Jolt.CylinderShapeSettings(halfH, r, 0.02), new THREE.Vector3(), ROT_Z_ALIGNED);
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
      return maybeOffset(Jolt, new Jolt.TaperedCylinderShapeSettings(halfH, 0.001, r, 0.02), new THREE.Vector3(), ROT_Z_ALIGNED);
    }

    case GeometryType.MESH: {
      const hp = opts.hullPoints;
      if (hp && hp.length >= 12) {
        const chs = new Jolt.ConvexHullShapeSettings();
        for (let i = 0; i < hp.length; i += 3) chs.mPoints.push_back(new Jolt.Vec3(hp[i] * sx, hp[i + 1] * sy, hp[i + 2] * sz));
        // Every OTHER shape here passes an explicit 0.02 collision margin. This one didn't,
        // which meant it silently used Jolt's built-in default (0.05m / 5cm). This app's real
        // modules are typically 5-15cm — a 5cm margin puffs each mesh's collision boundary out
        // far beyond what's visually rendered, so neighboring/resting parts end up with their
        // (invisible) collision shapes constantly overlapping even when they look fine, and the
        // solver fights that phantom overlap every frame: exactly the violent shaking + parts
        // visually sinking through the floor (physics resolves against the inflated shape, the
        // render draws the true mesh, so they visibly diverge).
        chs.mMaxConvexRadius = 0.02;
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
