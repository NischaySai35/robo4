/**
 * costmap — layered costmap with inflation (Nav2's costmap_2d, native).
 *
 * An occupancy Grid is binary (free/occupied). A costmap adds a continuous cost field:
 * lethal at obstacles, decaying outward over an inflation radius, so planners keep a
 * safety margin instead of grazing walls. We compute an exact Euclidean distance to the
 * nearest obstacle (two-pass chamfer transform) and map it through an exponential decay.
 * Pure, node-testable.
 */
import type { Grid } from './occupancyGrid';
import { worldToCell, inBounds } from './occupancyGrid';

export const LETHAL = 1.0;

export interface CostGrid {
  res: number; originX: number; originZ: number; cols: number; rows: number;
  cost: Float32Array;            // 0 (free) … 1 (lethal)
  dist: Float32Array;            // metres to nearest obstacle
}

/** Build an inflated costmap from a binary occupancy grid. */
export function inflateCostmap(g: Grid, inflationRadius = 0.5, costScale = 3.0): CostGrid {
  const { cols, rows, res } = g;
  const BIG = 1e9;
  const dist = new Float32Array(cols * rows).fill(BIG);
  for (let i = 0; i < g.data.length; i++) if (g.data[i]) dist[i] = 0;

  // two-pass chamfer distance transform (in cell units), 3x4 weights
  const D1 = 1, D2 = Math.SQRT2;
  const at = (c: number, r: number) => (c >= 0 && r >= 0 && c < cols && r < rows ? dist[r * cols + c] : BIG);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    let m = dist[r * cols + c];
    m = Math.min(m, at(c - 1, r) + D1, at(c, r - 1) + D1, at(c - 1, r - 1) + D2, at(c + 1, r - 1) + D2);
    dist[r * cols + c] = m;
  }
  for (let r = rows - 1; r >= 0; r--) for (let c = cols - 1; c >= 0; c--) {
    let m = dist[r * cols + c];
    m = Math.min(m, at(c + 1, r) + D1, at(c, r + 1) + D1, at(c + 1, r + 1) + D2, at(c - 1, r + 1) + D2);
    dist[r * cols + c] = m;
  }

  const cost = new Float32Array(cols * rows);
  for (let i = 0; i < cost.length; i++) {
    const dM = dist[i] * res;                   // metres
    dist[i] = dM;
    if (dM <= 1e-6) cost[i] = LETHAL;
    else if (dM >= inflationRadius) cost[i] = 0;
    else cost[i] = Math.exp(-costScale * dM);   // decay toward 0 at the radius
  }
  return { res, originX: g.originX, originZ: g.originZ, cols, rows, cost, dist };
}

/** Cost at a world point (0 if out of bounds / unknown). */
export function costAt(cm: CostGrid, x: number, z: number): number {
  const [c, r] = worldToCell(cm as unknown as Grid, x, z);
  if (!inBounds(cm as unknown as Grid, c, r)) return 0;
  return cm.cost[r * cm.cols + c];
}

/** Distance (m) to nearest obstacle at a world point (Infinity if out of bounds). */
export function clearanceAt(cm: CostGrid, x: number, z: number): number {
  const [c, r] = worldToCell(cm as unknown as Grid, x, z);
  if (!inBounds(cm as unknown as Grid, c, r)) return Infinity;
  return cm.dist[r * cm.cols + c];
}
