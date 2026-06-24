/**
 * colliderFactory — builds a Rapier collider shape from a model body's geometry.
 *
 * Why this exists (industrial pivot, Track C2/C3): cylinder/capsule/cone links used to
 * be approximated as boxes, which makes contacts and reach margins wrong — a sim-to-real
 * error source. We now emit TRUE Rapier primitives (cylinder, capsule, cone) so collision
 * geometry matches the visual mesh. Shared by PhysicsSim and the RL world so both agree.
 *
 * Axis convention: the visual meshes (BodyRenderer) build Y-aligned primitives then
 * `rotateX(π/2)`, so a body's cylinder/capsule/cone runs along its local **Z** axis.
 * Rapier primitives are Y-aligned, so we apply the same +90° X rotation to the collider.
 *
 * Non-uniform cross-section scale (sx ≠ sy) can't be a true cylinder/capsule, so those
 * fall back to the cuboid bound — honest and safe rather than silently distorted.
 */
import RAPIER from './physicsEngine';
import { GeometryType } from '@/core/model/index';
import { convexHull, type Vec3 } from '@/robotics/geometry/convexHull';

/**
 * Convex-hull vertices (flat [x,y,z,…]) of a mesh's positions, for a tight Rapier
 * convexHull collider instead of a bounding box. Very dense meshes are stride-sampled
 * (a convex proxy doesn't need every vertex). Returns null if the cloud is degenerate.
 */
export function convexHullPoints(positions: ArrayLike<number>, maxInput = 4000): Float32Array | null {
  const n = Math.floor(positions.length / 3);
  if (n < 4) return null;
  const step = n > maxInput ? Math.ceil(n / maxInput) : 1;
  const pts: Vec3[] = [];
  for (let i = 0; i < n; i += step) pts.push([positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]]);
  const hull = convexHull(pts);
  if (!hull || hull.vertices.length < 4) return null;
  const out = new Float32Array(hull.vertices.length * 3);
  hull.vertices.forEach((v, k) => { out[k * 3] = v[0]; out[k * 3 + 1] = v[1]; out[k * 3 + 2] = v[2]; });
  return out;
}

/** Optional per-body collider inputs (e.g. mesh hull vertices supplied by the viewport). */
export interface ColliderOpts { hullPoints?: Float32Array | null; }

// +90° about X (maps the Rapier Y axis onto the model's Z axis), matching the visual mesh.
const ROT_Z_ALIGNED = { x: Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 };

/** True if the radial (x,y) scale is uniform enough to use a round primitive. */
function radiallyUniform(sx: number, sy: number): boolean {
  const a = Math.abs(sx), b = Math.abs(sy);
  return Math.abs(a - b) <= 1e-4 * Math.max(a, b, 1);
}

/**
 * Build a ColliderDesc for a body. Returns null only if geometry is missing.
 * Caller still sets density / collision groups / active hooks.
 */
export function makeColliderDesc(body: any, opts?: ColliderOpts): RAPIER.ColliderDesc | null {
  const g = body?.visual?.geometry ?? {};
  const s = body?.transform?.scale ?? [1, 1, 1];
  const sx = Math.abs(s[0]), sy = Math.abs(s[1]), sz = Math.abs(s[2]);

  const cuboidFallback = () => {
    switch (g.type) {
      case GeometryType.CYLINDER:
      case GeometryType.CAPSULE:
      case GeometryType.CONE: {
        const r = g.radius ?? 0.5, l = g.length ?? 1;
        return RAPIER.ColliderDesc.cuboid(r * sx, r * sy, (l * sz) / 2);
      }
      default:
        return RAPIER.ColliderDesc.cuboid(0.4 * sx, 0.4 * sy, 0.4 * sz);
    }
  };

  switch (g.type) {
    case GeometryType.SPHERE:
      return RAPIER.ColliderDesc.ball((g.radius ?? 0.5) * Math.max(sx, sy, sz));

    case GeometryType.BOX: {
      const sz0 = g.size ?? [1, 1, 1];
      return RAPIER.ColliderDesc.cuboid(
        Math.abs(sz0[0] * s[0]) / 2, Math.abs(sz0[1] * s[1]) / 2, Math.abs(sz0[2] * s[2]) / 2,
      );
    }

    case GeometryType.CYLINDER: {
      if (!radiallyUniform(sx, sy)) return cuboidFallback();
      const r = (g.radius ?? 0.5) * sx, halfH = ((g.length ?? 1) * sz) / 2;
      return RAPIER.ColliderDesc.cylinder(halfH, r).setRotation(ROT_Z_ALIGNED);
    }

    case GeometryType.CAPSULE: {
      if (!radiallyUniform(sx, sy)) return cuboidFallback();
      // Three.js CapsuleGeometry `length` is the segment between cap centers → Rapier halfHeight.
      const r = (g.radius ?? 0.5) * sx, halfH = ((g.length ?? 1) * sz) / 2;
      return RAPIER.ColliderDesc.capsule(halfH, r).setRotation(ROT_Z_ALIGNED);
    }

    case GeometryType.CONE: {
      if (!radiallyUniform(sx, sy)) return cuboidFallback();
      const r = (g.radius ?? 0.5) * sx, halfH = ((g.length ?? 1) * sz) / 2;
      return RAPIER.ColliderDesc.cone(halfH, r).setRotation(ROT_Z_ALIGNED);
    }

    case GeometryType.MESH: {
      // True convex-hull collider when the viewport supplied the mesh vertices,
      // with the body's scale baked into the hull; bbox fallback otherwise.
      const hp = opts?.hullPoints;
      if (hp && hp.length >= 12) {
        const scaled = new Float32Array(hp.length);
        for (let i = 0; i < hp.length; i += 3) { scaled[i] = hp[i] * sx; scaled[i + 1] = hp[i + 1] * sy; scaled[i + 2] = hp[i + 2] * sz; }
        const d = RAPIER.ColliderDesc.convexHull(scaled);
        if (d) return d;
      }
      return cuboidFallback();
    }

    default: // torus: bbox approximation
      return cuboidFallback();
  }
}
