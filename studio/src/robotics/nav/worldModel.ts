/**
 * worldModel — derive the 2D navigation world from the model document: obstacle
 * XZ footprints (bodies tagged meta.obstacle) and the robot's base position.
 */
import { computeFK } from '@/kinematics/modelFK';
import type { Document } from '@/core/model/index';
import type { Footprint, GridBounds } from './occupancyGrid';

function halfExtents(body: any): [number, number, number] {
  const g = body.visual?.geometry ?? {};
  const s = body.transform?.scale ?? [1, 1, 1];
  const a = Math.abs(s[0]), b = Math.abs(s[1]), c = Math.abs(s[2]);
  switch (g.type) {
    case 'sphere': { const r = (g.radius ?? 0.5) * Math.max(a, b, c); return [r, r, r]; }
    case 'box': { const sz = g.size ?? [1, 1, 1]; return [Math.abs(sz[0]) * a / 2, Math.abs(sz[1]) * b / 2, Math.abs(sz[2]) * c / 2]; }
    case 'cylinder': case 'capsule': { const r = g.radius ?? 0.5, l = g.length ?? 1; return [r * a, r * b, l * c / 2]; }
    default: return [0.4 * a, 0.4 * b, 0.4 * c];
  }
}

export function obstacleFootprints(doc: Document, fk = computeFK(doc)): Footprint[] {
  const out: Footprint[] = [];
  for (const body of Object.values(doc.bodies)) {
    if (!(body.meta as any)?.obstacle) continue;
    const p = fk.get(body.id)?.position ?? body.transform.position;
    const [hx, , hz] = halfExtents(body);
    out.push({ minX: p[0] - hx, maxX: p[0] + hx, minZ: p[2] - hz, maxZ: p[2] + hz });
  }
  return out;
}

export function robotBaseXZ(doc: Document, fk = computeFK(doc)): [number, number] {
  const rootId = (doc.meta as any)?.rootBodyId ?? Object.keys(doc.bodies)[0];
  const p = (rootId && fk.get(rootId)?.position) || [0, 0, 0];
  return [p[0], p[2]];
}

export function worldBounds(footprints: Footprint[], pts: [number, number][], margin = 2): GridBounds {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  const acc = (x: number, z: number) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); };
  for (const f of footprints) { acc(f.minX, f.minZ); acc(f.maxX, f.maxZ); }
  for (const [x, z] of pts) acc(x, z);
  if (!Number.isFinite(minX)) { minX = -3; maxX = 3; minZ = -3; maxZ = 3; }
  return { minX: minX - margin, maxX: maxX + margin, minZ: minZ - margin, maxZ: maxZ + margin };
}
