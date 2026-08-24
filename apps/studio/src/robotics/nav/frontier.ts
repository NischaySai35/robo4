/**
 * frontier — autonomous exploration: decide WHERE to go next to see more of the world.
 *
 * A "frontier" is the boundary between known-free space and the unknown. Driving to a
 * frontier reveals new area; repeat until there are no frontiers left → the space is fully
 * mapped. This is the classic frontier-based exploration that makes a robot wander a
 * warehouse on its own (it's what the ROS car was doing under the hood).
 *
 * Works on a Grid with the exploration `known` layer (see occupancyGrid.integrateScanTraced).
 */
import { cellToWorld, inBounds, type Grid } from './occupancyGrid';

/** Cells that are known-free AND border at least one unknown cell. */
export function frontierCells(g: Grid): [number, number][] {
  const known = g.known;
  if (!known) return [];
  const out: [number, number][] = [];
  const N = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const idx = r * g.cols + c;
      if (g.data[idx] !== 0 || known[idx] !== 1) continue; // must be known-free
      for (const [dc, dr] of N) {
        const nc = c + dc, nr = r + dr;
        if (inBounds(g, nc, nr) && known[nr * g.cols + nc] === 0) { out.push([c, r]); break; }
      }
    }
  }
  return out;
}

export interface FrontierGoal { x: number; z: number; size: number; }

/**
 * Cluster adjacent frontier cells (8-connected) and return each cluster's centroid in
 * world coords, with its cell count. Small clusters (noise) can be filtered by `minSize`.
 */
export function frontierGoals(g: Grid, minSize = 3): FrontierGoal[] {
  const cells = frontierCells(g);
  if (!cells.length) return [];
  const inSet = new Set(cells.map(([c, r]) => r * g.cols + c));
  const seen = new Set<number>();
  const N = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const goals: FrontierGoal[] = [];

  for (const [c0, r0] of cells) {
    const start = r0 * g.cols + c0;
    if (seen.has(start)) continue;
    // BFS flood the connected frontier cluster
    const stack = [[c0, r0]];
    seen.add(start);
    let sx = 0, sz = 0, n = 0;
    while (stack.length) {
      const [c, r] = stack.pop()!;
      const [wx, wz] = cellToWorld(g, c, r);
      sx += wx; sz += wz; n++;
      for (const [dc, dr] of N) {
        const nc = c + dc, nr = r + dr;
        const k = nr * g.cols + nc;
        if (inSet.has(k) && !seen.has(k)) { seen.add(k); stack.push([nc, nr]); }
      }
    }
    if (n >= minSize) goals.push({ x: sx / n, z: sz / n, size: n });
  }
  return goals;
}

/**
 * Pick the next exploration goal: the largest-then-nearest reachable frontier centroid.
 * `reachable` should return true if the robot can plan a path there. Returns null when the
 * map is fully explored (no frontiers) — the signal that the mission is complete.
 */
export function nextExplorationGoal(
  g: Grid,
  robotX: number,
  robotZ: number,
  reachable: (x: number, z: number) => boolean = () => true,
  minSize = 3,
): [number, number] | null {
  const goals = frontierGoals(g, minSize);
  // prefer big frontiers, break ties by proximity
  goals.sort((a, b) => {
    if (b.size !== a.size) return b.size - a.size;
    const da = Math.hypot(a.x - robotX, a.z - robotZ);
    const db = Math.hypot(b.x - robotX, b.z - robotZ);
    return da - db;
  });
  for (const goal of goals) {
    if (reachable(goal.x, goal.z)) return [goal.x, goal.z];
  }
  return null;
}
