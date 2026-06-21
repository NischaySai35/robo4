/**
 * occupancyGrid — a 2D costmap over the ground (XZ plane), the Nav2-style world
 * model. Cells are FREE (0) or OCCUPIED (1). Obstacles are given as XZ AABB
 * footprints and are inflated by the robot radius so the planner keeps clearance.
 */
export interface Footprint { minX: number; maxX: number; minZ: number; maxZ: number; }
export interface Grid {
  res: number;          // metres per cell
  originX: number;      // world X of cell (0,0) corner
  originZ: number;
  cols: number;
  rows: number;
  data: Uint8Array;     // row-major, 1 = occupied
}

export interface GridBounds { minX: number; maxX: number; minZ: number; maxZ: number; }

export function buildGrid(obstacles: Footprint[], bounds: GridBounds, res = 0.1, inflate = 0.25): Grid {
  const cols = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) / res));
  const rows = Math.max(1, Math.ceil((bounds.maxZ - bounds.minZ) / res));
  const data = new Uint8Array(cols * rows);
  const grid: Grid = { res, originX: bounds.minX, originZ: bounds.minZ, cols, rows, data };
  for (const o of obstacles) {
    const x0 = o.minX - inflate, x1 = o.maxX + inflate;
    const z0 = o.minZ - inflate, z1 = o.maxZ + inflate;
    const [c0, r0] = worldToCell(grid, x0, z0);
    const [c1, r1] = worldToCell(grid, x1, z1);
    for (let r = Math.max(0, r0); r <= Math.min(rows - 1, r1); r++) {
      for (let c = Math.max(0, c0); c <= Math.min(cols - 1, c1); c++) data[r * cols + c] = 1;
    }
  }
  return grid;
}

/** An empty (all-free) grid, for building a map incrementally from sensor data. */
export function emptyGrid(bounds: GridBounds, res = 0.12): Grid {
  const cols = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) / res));
  const rows = Math.max(1, Math.ceil((bounds.maxZ - bounds.minZ) / res));
  return { res, originX: bounds.minX, originZ: bounds.minZ, cols, rows, data: new Uint8Array(cols * rows) };
}

/** Mark a world point occupied, inflating by `inflate` metres of clearance. */
export function markOccupied(g: Grid, x: number, z: number, inflate = 0.2) {
  const cells = Math.round(inflate / g.res);
  const [c0, r0] = worldToCell(g, x, z);
  for (let dr = -cells; dr <= cells; dr++) for (let dc = -cells; dc <= cells; dc++) {
    const c = c0 + dc, r = r0 + dr;
    if (inBounds(g, c, r)) g.data[r * g.cols + c] = 1;
  }
}

/** Fuse a LiDAR scan into the map: every real hit (range < maxRange) is occupied. */
export function integrateScan(g: Grid, points: number[][], ranges: number[], maxRange: number, inflate = 0.2) {
  for (let i = 0; i < points.length; i++) {
    if (ranges[i] >= maxRange - 1e-3) continue; // no return → unknown, not occupied
    markOccupied(g, points[i][0], points[i][2], inflate);
  }
}

export function worldToCell(g: Grid, x: number, z: number): [number, number] {
  return [Math.floor((x - g.originX) / g.res), Math.floor((z - g.originZ) / g.res)];
}
export function cellToWorld(g: Grid, c: number, r: number): [number, number] {
  return [g.originX + (c + 0.5) * g.res, g.originZ + (r + 0.5) * g.res];
}
export function inBounds(g: Grid, c: number, r: number) { return c >= 0 && r >= 0 && c < g.cols && r < g.rows; }
export function isFree(g: Grid, c: number, r: number) { return inBounds(g, c, r) && g.data[r * g.cols + c] === 0; }
