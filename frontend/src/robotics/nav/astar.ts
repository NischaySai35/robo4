/**
 * astar — 8-connected A* global planner over an occupancy grid (Nav2's global
 * planner role). Returns a list of world-space [x, z] waypoints. Falls back to the
 * nearest free cell for start/goal.
 *
 * Upgrades (matching Nav2's planner quality): a BINARY-HEAP open set (O(log n) instead
 * of an O(n) min-scan — fast on large maps) and LINE-OF-SIGHT path smoothing (string
 * pulling) so the result is near-straight instead of a 45° zig-zag.
 */
import { cellToWorld, inBounds, isFree, worldToCell, type Grid } from './occupancyGrid';

interface Node { c: number; r: number; g: number; f: number; key: number; }

/** Minimal binary min-heap keyed on Node.f. */
class MinHeap {
  private a: Node[] = [];
  get size() { return this.a.length; }
  push(n: Node) {
    const a = this.a;
    a.push(n);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): Node | undefined {
    const a = this.a;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = 2 * i + 2;
        let s = i;
        if (l < a.length && a[l].f < a[s].f) s = l;
        if (r < a.length && a[r].f < a[s].f) s = r;
        if (s === i) break;
        [a[s], a[i]] = [a[i], a[s]];
        i = s;
      }
    }
    return top;
  }
}

/** True if a straight grid line from cell (c0,r0) to (c1,r1) crosses only free cells. */
export function lineOfSight(grid: Grid, c0: number, r0: number, c1: number, r1: number): boolean {
  let x = c0, y = r0;
  const dx = Math.abs(c1 - c0), dy = Math.abs(r1 - r0);
  const sx = c0 < c1 ? 1 : -1, sy = r0 < r1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    if (!isFree(grid, x, y)) return false;
    if (x === c1 && y === r1) return true;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

/** String-pulling: drop waypoints the robot can reach in a straight (collision-free) line. */
function smoothPath(grid: Grid, cells: number[][]): number[][] {
  if (cells.length <= 2) return cells.map(([c, r]) => cellToWorld(grid, c, r));
  const out: number[][] = [cells[0]];
  let anchor = 0;
  for (let i = 2; i < cells.length; i++) {
    const [ac, ar] = cells[anchor];
    const [tc, tr] = cells[i];
    if (!lineOfSight(grid, ac, ar, tc, tr)) {
      out.push(cells[i - 1]); // last visible point becomes the new anchor
      anchor = i - 1;
    }
  }
  out.push(cells[cells.length - 1]);
  return out.map(([c, r]) => cellToWorld(grid, c, r));
}

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

  const open = new MinHeap();
  const came = new Map<number, number>();
  const gScore = new Map<number, number>();
  const start: Node = { c: s[0], r: s[1], g: 0, f: h(s[0], s[1]), key: key(s[0], s[1]) };
  open.push(start);
  gScore.set(start.key, 0);
  const closed = new Set<number>();

  const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  while (open.size) {
    const cur = open.pop();
    if (!cur) break;
    if (closed.has(cur.key)) continue; // stale heap entry
    if (cur.key === goalKey) return reconstruct(grid, came, cur.key);
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
        open.push({ c: nc, r: nr, g: tentative, f: tentative + h(nc, nr), key: nk });
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
  // Line-of-sight string-pulling → near-straight path (no 45° zig-zag), still collision-free.
  return smoothPath(grid, cells);
}
