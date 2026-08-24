/**
 * rrt — RRT motion planner in joint (configuration) space: MoveIt's core role.
 * Grows a tree from the start toward random samples (with goal bias), steering in
 * fixed steps and rejecting configurations that fail the `collisionFree` predicate
 * (self-collision + world). Returns a collision-free joint-space path, shortcut-
 * smoothed, or null. Generic over any DOF count.
 */
export interface RRTOptions {
  bounds: [number, number][];               // per-joint [lower, upper]
  collisionFree: (q: number[]) => boolean;  // true if config q is valid
  step?: number;                            // extension distance (rad)
  maxIter?: number;
  goalBias?: number;                        // probability of sampling the goal
  tol?: number;                             // distance to consider goal reached
}

const dist = (a: number[], b: number[]) => Math.hypot(...a.map((v, i) => v - b[i]));

function steer(from: number[], to: number[], step: number): number[] {
  const d = dist(from, to);
  if (d <= step) return [...to];
  return from.map((v, i) => v + (to[i] - v) * (step / d));
}

export function planRRT(start: number[], goal: number[], opts: RRTOptions): number[][] | null {
  const { bounds, collisionFree } = opts;
  const step = opts.step ?? 0.15, maxIter = opts.maxIter ?? 4000, goalBias = opts.goalBias ?? 0.1, tol = opts.tol ?? 0.12;
  if (!collisionFree(start) || !collisionFree(goal)) return null;

  const nodes: number[][] = [start];
  const parent: number[] = [-1];
  const sample = () => (Math.random() < goalBias ? [...goal] : bounds.map(([lo, hi]) => lo + Math.random() * (hi - lo)));

  // Dense edge check so we don't tunnel through a thin obstacle.
  const edgeFree = (a: number[], b: number[]) => {
    const n = Math.ceil(dist(a, b) / (step * 0.5)) || 1;
    for (let i = 1; i <= n; i++) if (!collisionFree(a.map((v, k) => v + (b[k] - v) * (i / n)))) return false;
    return true;
  };

  for (let it = 0; it < maxIter; it++) {
    const q = sample();
    // nearest node
    let ni = 0, nd = Infinity;
    for (let i = 0; i < nodes.length; i++) { const d = dist(nodes[i], q); if (d < nd) { nd = d; ni = i; } }
    const qNew = steer(nodes[ni], q, step);
    if (!collisionFree(qNew) || !edgeFree(nodes[ni], qNew)) continue;
    nodes.push(qNew); parent.push(ni);
    if (dist(qNew, goal) < tol && edgeFree(qNew, goal)) {
      nodes.push(goal); parent.push(nodes.length - 2);
      return shortcut(reconstruct(nodes, parent), collisionFree, step);
    }
  }
  return null;
}

function reconstruct(nodes: number[][], parent: number[]): number[][] {
  const path: number[][] = [];
  let i = nodes.length - 1;
  while (i !== -1) { path.push(nodes[i]); i = parent[i]; }
  return path.reverse();
}

/** Greedy shortcut smoothing: skip waypoints whose straight edge stays collision-free. */
function shortcut(path: number[][], collisionFree: (q: number[]) => boolean, step: number): number[][] {
  if (path.length <= 2) return path;
  const edgeFree = (a: number[], b: number[]) => {
    const n = Math.ceil(Math.hypot(...a.map((v, k) => v - b[k])) / (step * 0.5)) || 1;
    for (let i = 1; i <= n; i++) if (!collisionFree(a.map((v, k) => v + (b[k] - v) * (i / n)))) return false;
    return true;
  };
  const out = [path[0]];
  let i = 0;
  while (i < path.length - 1) {
    let j = path.length - 1;
    while (j > i + 1 && !edgeFree(path[i], path[j])) j--;
    out.push(path[j]); i = j;
  }
  return out;
}
