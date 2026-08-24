/**
 * lidar — a simulated 2D LiDAR: casts a fan of rays in the XZ plane from an origin
 * and returns per-angle ranges + world hit points (the sensor driver Nav2 would
 * consume). Pure over Three.js: caller supplies a Raycaster and the target meshes.
 */
import * as THREE from 'three';

export interface LidarScan {
  origin: [number, number, number];
  angles: number[];
  ranges: number[];                       // metres (maxRange if no hit)
  points: [number, number, number][];     // world-space hit points
}

export interface LidarOptions {
  rays?: number;       // beams over the FOV
  fov?: number;        // radians (default full circle)
  maxRange?: number;
  minRange?: number;
}

export function scan2D(
  raycaster: THREE.Raycaster,
  targets: THREE.Object3D[],
  origin: THREE.Vector3,
  opts: LidarOptions = {},
): LidarScan {
  const rays = opts.rays ?? 120;
  const fov = opts.fov ?? Math.PI * 2;
  const maxRange = opts.maxRange ?? 8;
  const minRange = opts.minRange ?? 0.05;
  const angles: number[] = [];
  const ranges: number[] = [];
  const points: [number, number, number][] = [];
  const dir = new THREE.Vector3();

  for (let i = 0; i < rays; i++) {
    const a = fov >= Math.PI * 2 ? (i / rays) * fov : -fov / 2 + (i / (rays - 1)) * fov;
    dir.set(Math.sin(a), 0, Math.cos(a)).normalize();
    raycaster.set(origin, dir);
    raycaster.near = minRange;
    raycaster.far = maxRange;
    const hits = raycaster.intersectObjects(targets, true);
    const hit = hits.find((h) => h.distance >= minRange);
    angles.push(a);
    if (hit) {
      ranges.push(hit.distance);
      points.push([hit.point.x, hit.point.y, hit.point.z]);
    } else {
      ranges.push(maxRange);
      const p = origin.clone().addScaledVector(dir, maxRange);
      points.push([p.x, p.y, p.z]);
    }
  }
  return { origin: [origin.x, origin.y, origin.z], angles, ranges, points };
}
