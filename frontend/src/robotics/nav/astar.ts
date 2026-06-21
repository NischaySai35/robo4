/**
 * astar — 8-connected A* global planner over an occupancy grid (Nav2's global
 * planner role). Returns a list of world-space [x, z] waypoints, simplified by
 * dropping collinear points. Falls back to the nearest free cell for start/goal.
 */
import { cellToWorld, inBounds, isFree, worldToCell, type Grid } from './occupancyGrid';

interface Node { c: number; r: number; g: number; f: number; key: number; }

function nearestFree(grid: Grid, c: number, r: number): [number, number] | null {
  if (isFree(grid, c, r)) return [c, r];
  for (let rad = 1; rad < Math.max(grid.cols, grid.rows); rad++) {
    for (let dc = -rad; dc <= rad; dc++) for (let dr = -rad; dr <= rad; dr++) {
      if (Math.abs(dc) !== rad && Math.abs(dr) !== rad) continue;
      if (isFree(grid, c + dc, r + dr)) return [c + dc, r + dr];
    }
  }
  return null;
}

/** Plan from world (sx,sz) to (gx,gz). Returns waypoints or null if unreachable. */
export function planPath(grid: Grid, sx: number, sz: number, gx: number, gz: number): number[][] | null {
  const s = nearestFree(grid, ...worldToCell(grid, sx, sz));
  const g = nearestFree(grid, ...worldToCell(grid, gx, gz));
  if (!s || !g) return null;
  const key = (c: number, r: number) => r * grid.cols + c;
  const goalKey = key(g[0], g[1]);
  const h = (c: number, r: number) => Math.hypot(c - g[0], r - g[1]);

  const open = new Map<number, Node>();
  const came = new Map<number, number>();
  const gScore = new Map<number, number>();
  const start: Node = { c: s[0], r: s[1], g: 0, f: h(s[0], s[1]), key: key(s[0], s[1]) };
  open.set(start.key, start);
  gScore.set(start.key, 0);
  const closed = new Set<number>();

  const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  while (open.size) {
    // pop lowest f
    let cur: Node | null = null;
    for (const n of open.values()) if (!cur || n.f < cur.f) cur = n;
    if (!cur) break;
    if (cur.key === goalKey) return reconstruct(grid, came, cur.key);
    open.delete(cur.key);
    closed.add(cur.key);

    for (const [dc, dr] of NB) {
      const nc = cur.c + dc, nr = cur.r + dr;
      if (!inBounds(grid, nc, nr) || !isFree(grid, nc, nr)) continue;
      // prevent corner-cutting through occupied diagonals
      if (dc !== 0 && dr !== 0 && (!isFree(grid, cur.c + dc, cur.r) || !isFree(grid, cur.c, cur.r + dr))) continue;
      const nk = key(nc, nr);
      if (closed.has(nk)) continue;
      const tentative = cur.g + Math.hypot(dc, dr);
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        came.set(nk, cur.key);
        gScore.set(nk, tentative);
        open.set(nk, { c: nc, r: nr, g: tentative, f: tentative + h(nc, nr), key: nk });
      }
    }
  }
  return null;
}

function reconstruct(grid: Grid, came: Map<number, number>, endKey: number): number[][] {
  const cells: number[][] = [];
  let k: number | undefined = endKey;
  while (k !== undefined) {
    const r = Math.floor(k / grid.cols), c = k - r * grid.cols;
    cells.push([c, r]);
    k = came.get(k);
  }
  cells.reverse();
  // Drop collinear points → fewer, cleaner waypoints.
  const out: number[][] = [];
  for (let i = 0; i < cells.length; i++) {
    if (i > 0 && i < cells.length - 1) {
      const [pc, pr] = cells[i - 1], [cc, cr] = cells[i], [ncx, ncr] = cells[i + 1];
      if ((cc - pc) * (ncr - cr) === (cr - pr) * (ncx - cc)) continue; // same direction
    }
    out.push(cellToWorld(grid, cells[i][0], cells[i][1]));
  }
  return out;
}
