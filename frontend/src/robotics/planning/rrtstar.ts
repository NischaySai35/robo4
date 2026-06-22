/**
 * rrtstar — asymptotically-optimal joint-space planners (MoveIt/OMPL depth).
 *
 *  - planRRTStar: RRT* — like RRT but rewires the tree to drive path COST down toward
 *    optimal as iterations grow (chooses the lowest-cost parent within a radius and
 *    rewires neighbours through the new node). Returns the best path found.
 *  - planPRM: Probabilistic RoadMap — samples N collision-free milestones, connects
 *    near neighbours into a graph, then Dijkstra start→goal. Good for MULTI-QUERY
 *    (build the roadmap once, answer many start/goal pairs against it).
 *
 * Both share the `collisionFree` predicate + per-joint bounds with planRRT, and both
 * shortcut-smooth the result. Generic over any DOF count. No React/Three.
 */
export interface PlanOptions {
  bounds: [number, number][];
  collisionFree: (q: number[]) => boolean;
  step?: number;
  maxIter?: number;
  goalBias?: number;
  tol?: number;
}

export const dist = (a: number[], b: number[]) => Math.hypot(...a.map((v, i) => v - b[i]));

function steer(from: number[], to: number[], step: number): number[] {
  const d = dist(from, to);
  if (d <= step) return [...to];
  return from.map((v, i) => v + (to[i] - v) * (step / d));
}

function makeEdgeFree(collisionFree: (q: number[]) => boolean, step: number) {
  return (a: number[], b: number[]) => {
    const n = Math.ceil(dist(a, b) / (step * 0.5)) || 1;
    for (let i = 1; i <= n; i++) if (!collisionFree(a.map((v, k) => v + (b[k] - v) * (i / n)))) return false;
    return true;
  };
}

/** Total path length (our cost metric). */
export function pathCost(path: number[][]): number {
  let c = 0;
  for (let i = 1; i < path.length; i++) c += dist(path[i - 1], path[i]);
  return c;
}

export function planRRTStar(start: number[], goal: number[], opts: PlanOptions): number[][] | null {
  const { bounds, collisionFree } = opts;
  const step = opts.step ?? 0.15, maxIter = opts.maxIter ?? 4000, goalBias = opts.goalBias ?? 0.1, tol = opts.tol ?? 0.12;
  if (!collisionFree(start) || !collisionFree(goal)) return null;
  const edgeFree = makeEdgeFree(collisionFree, step);

  const nodes: number[][] = [start];
  const parent: number[] = [-1];
  const cost: number[] = [0];
  const dim = start.length;
  // neighbour radius shrinks as the tree grows (standard RRT* gamma rule).
  const radius = (n: number) => Math.max(step * 2, step * 6 * Math.pow(Math.log(n + 1) / (n + 1), 1 / dim));

  let goalIdx = -1;
  const sample = () => (Math.random() < goalBias ? [...goal] : bounds.map(([lo, hi]) => lo + Math.random() * (hi - lo)));

  for (let it = 0; it < maxIter; it++) {
    const q = sample();
    let ni = 0, nd = Infinity;
    for (let i = 0; i < nodes.length; i++) { const d = dist(nodes[i], q); if (d < nd) { nd = d; ni = i; } }
    const qNew = steer(nodes[ni], q, step);
    if (!collisionFree(qNew) || !edgeFree(nodes[ni], qNew)) continue;

    // choose lowest-cost parent among near neighbours
    const r = radius(nodes.length);
    let bestParent = ni, bestCost = cost[ni] + dist(nodes[ni], qNew);
    const near: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const d = dist(nodes[i], qNew);
      if (d <= r) {
        near.push(i);
        const c = cost[i] + d;
        if (c < bestCost && edgeFree(nodes[i], qNew)) { bestCost = c; bestParent = i; }
      }
    }
    const idx = nodes.length;
    nodes.push(qNew); parent.push(bestParent); cost.push(bestCost);

    // rewire near neighbours through qNew if cheaper
    for (const i of near) {
      const c = bestCost + dist(qNew, nodes[i]);
      if (c < cost[i] && edgeFree(qNew, nodes[i])) { parent[i] = idx; cost[i] = c; }
    }

    if (dist(qNew, goal) < tol && edgeFree(qNew, goal)) {
      const gc = bestCost + dist(qNew, goal);
      if (goalIdx === -1) { nodes.push(goal); parent.push(idx); cost.push(gc); goalIdx = nodes.length - 1; }
      else if (gc < cost[goalIdx]) { parent[goalIdx] = idx; cost[goalIdx] = gc; }
    }
  }

  if (goalIdx === -1) return null;
  return shortcut(reconstruct(nodes, parent, goalIdx), collisionFree, step);
}

export function planPRM(start: number[], goal: number[], opts: PlanOptions & { samples?: number; k?: number }): number[][] | null {
  const { bounds, collisionFree } = opts;
  const step = opts.step ?? 0.15;
  const samples = opts.samples ?? 300, k = opts.k ?? 10;
  if (!collisionFree(start) || !collisionFree(goal)) return null;
  const edgeFree = makeEdgeFree(collisionFree, step);

  const verts: number[][] = [start, goal];
  for (let i = 0; i < samples; i++) {
    const q = bounds.map(([lo, hi]) => lo + Math.random() * (hi - lo));
    if (collisionFree(q)) verts.push(q);
  }
  // adjacency via k-nearest with collision-free edges
  const adj: { to: number; w: number }[][] = verts.map(() => []);
  for (let i = 0; i < verts.length; i++) {
    const order = verts.map((v, j) => ({ j, d: dist(verts[i], v) }))
      .filter((e) => e.j !== i).sort((a, b) => a.d - b.d).slice(0, k);
    for (const { j, d } of order) {
      if (edgeFree(verts[i], verts[j])) { adj[i].push({ to: j, w: d }); adj[j].push({ to: i, w: d }); }
    }
  }
  // Dijkstra 0 (start) → 1 (goal)
  const N = verts.length;
  const distTo = new Array(N).fill(Infinity); distTo[0] = 0;
  const prev = new Array(N).fill(-1);
  const done = new Array(N).fill(false);
  for (let iter = 0; iter < N; iter++) {
    let u = -1, best = Infinity;
    for (let i = 0; i < N; i++) if (!done[i] && distTo[i] < best) { best = distTo[i]; u = i; }
    if (u === -1) break;
    done[u] = true;
    if (u === 1) break;
    for (const { to, w } of adj[u]) if (distTo[u] + w < distTo[to]) { distTo[to] = distTo[u] + w; prev[to] = u; }
  }
  if (!isFinite(distTo[1])) return null;
  const path: number[][] = [];
  for (let i = 1; i !== -1; i = prev[i]) path.push(verts[i]);
  path.reverse();
  return shortcut(path, collisionFree, step);
}

function reconstruct(nodes: number[][], parent: number[], from: number): number[][] {
  const path: number[][] = [];
  let i = from;
  while (i !== -1) { path.push(nodes[i]); i = parent[i]; }
  return path.reverse();
}

function shortcut(path: number[][], collisionFree: (q: number[]) => boolean, step: number): number[][] {
  if (path.length <= 2) return path;
  const edgeFree = makeEdgeFree(collisionFree, step);
  const out = [path[0]];
  let i = 0;
  while (i < path.length - 1) {
    let j = path.length - 1;
    while (j > i + 1 && !edgeFree(path[i], path[j])) j--;
    out.push(path[j]); i = j;
  }
  return out;
}
