/**
 * stability.ts — the cheap gravity sanity check the roadmap asks for.
 *
 * Roadmap section 9: "You have no gravity anywhere. Until you do, you do not know if any
 * of this stands up." A full dynamics answer needs Isaac Sim (or the Jolt path
 * already in this repo). But two static checks catch most nonsense for free, and
 * they are cheap enough to run inside the planner's inner loop as a hard filter:
 *
 *  1. GROUNDED — every module must have a path through the structure down to a
 *     module resting on y = 0. A structure floating in the air is not a plan.
 *
 *  2. COM OVER SUPPORT — the centre of mass, projected onto the ground plane, must
 *     lie inside the convex hull of the footprint cells. If it does not, the thing
 *     tips over, however nicely it was assembled.
 *
 * Modules are treated as identical unit masses at cell centres. That is an
 * approximation, but a good one: the modules ARE identical, and at lattice scale
 * the intra-module mass distribution is second order compared with which cells
 * are occupied. What this does NOT check is joint torque — a structure can be
 * perfectly balanced and still exceed what an ST3215 can hold as a cantilever.
 * That check needs real link geometry; see torqueHint() for the rough version.
 */
import { type Cell, type Config, cellsOf, key, DIRS_6, add } from './lattice';

export interface StabilityReport {
  grounded: boolean;
  balanced: boolean;
  /** modules with no support path to the ground */
  floating: Cell[];
  /** centre of mass projected to the ground plane */
  com: [number, number];
  /** convex hull of the footprint, ground plane, cell units */
  support: [number, number][];
  /** signed margin: >0 inside the support polygon, <0 outside (cell units) */
  margin: number;
  /** worst cantilever seen: modules hanging off one column, as a torque proxy */
  worstCantilever: number;
  ok: boolean;
}

/** Cells that touch the ground plane (lowest lattice layer is y = 0). */
const groundCells = (cells: Cell[]) => cells.filter((c) => c[1] === 0);

/**
 * Flood from the grounded cells through the structure. Anything unreached is
 * hanging in mid-air with nothing beneath it — physically impossible to hold.
 */
function findFloating(c: Config): Cell[] {
  const cells = cellsOf(c);
  const seeds = groundCells(cells);
  if (!seeds.length) return cells; // nothing touches the floor: it is all floating
  const seen = new Set(seeds.map(key));
  const stack = [...seeds];
  while (stack.length) {
    const cur = stack.pop() as Cell;
    for (const d of DIRS_6) {
      const n = add(cur, d);
      const k = key(n);
      if (c.occ.has(k) && !seen.has(k)) { seen.add(k); stack.push(n); }
    }
  }
  return cells.filter((x) => !seen.has(key(x)));
}

// ── 2D convex hull (monotone chain) over the footprint ────────────────────────

function hull(points: [number, number][]): [number, number][] {
  if (points.length <= 2) return [...points];
  const pts = [...points].sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  const cr = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const build = (src: [number, number][]) => {
    const out: [number, number][] = [];
    for (const p of src) {
      while (out.length >= 2 && cr(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...build(pts), ...build([...pts].reverse())];
}

/**
 * Distance from `p` to the hull boundary, positive inside. For a degenerate hull
 * (a single column, or a straight line of modules) there is no area to be inside
 * of, so we fall back to distance-to-segment and treat "on the line" as neutral:
 * a one-module-wide tower is not stable in reality either, and the caller sees
 * margin ~= 0 rather than a false pass.
 */
function hullMargin(h: [number, number][], p: [number, number]): number {
  if (!h.length) return -Infinity;
  if (h.length === 1) return -Math.hypot(p[0] - h[0][0], p[1] - h[0][1]);
  if (h.length === 2) {
    const [a, b] = h;
    const vx = b[0] - a[0], vy = b[1] - a[1];
    const len2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / len2));
    return -Math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy));
  }
  let best = Infinity;
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length];
    const ex = b[0] - a[0], ey = b[1] - a[1];
    const len = Math.hypot(ex, ey) || 1;
    // Hull from monotone chain is counter-clockwise, so a positive cross product
    // means the point is on the interior side of this edge.
    const sd = ((p[0] - a[0]) * ey - (p[1] - a[1]) * ex) / len;
    best = Math.min(best, -sd);
  }
  return best;
}

/**
 * Rough cantilever severity: for each ground column, how many modules sit at or
 * above it with no column of their own beneath. Not a torque in N*m — it is a
 * dimensionless "how badly is this overhanging" number to rank designs and to
 * flag the structures worth exporting to a real physics backend.
 */
function cantilever(cells: Cell[]): number {
  const footprint = new Set(groundCells(cells).map((c) => `${c[0]},${c[2]}`));
  let worst = 0;
  const perColumn = new Map<string, number>();
  for (const c of cells) {
    const col = `${c[0]},${c[2]}`;
    if (footprint.has(col)) continue;
    perColumn.set(col, (perColumn.get(col) ?? 0) + 1);
  }
  for (const v of perColumn.values()) worst = Math.max(worst, v);
  return worst;
}

export function checkStability(c: Config): StabilityReport {
  const cells = cellsOf(c);
  if (!cells.length) {
    return {
      grounded: true, balanced: true, floating: [], com: [0, 0], support: [],
      margin: 0, worstCantilever: 0, ok: true,
    };
  }

  const floating = findFloating(c);
  const grounded = floating.length === 0;

  let sx = 0, sz = 0;
  for (const p of cells) { sx += p[0]; sz += p[2]; }
  const com: [number, number] = [sx / cells.length, sz / cells.length];

  // Support polygon: the footprint cells are unit squares, so their corners (not
  // their centres) bound the real contact patch.
  const corners: [number, number][] = [];
  for (const g of groundCells(cells)) {
    corners.push([g[0] - 0.5, g[2] - 0.5], [g[0] + 0.5, g[2] - 0.5],
                 [g[0] + 0.5, g[2] + 0.5], [g[0] - 0.5, g[2] + 0.5]);
  }
  const support = hull(corners);
  const margin = hullMargin(support, com);
  const balanced = margin > 0;
  const worstCantilever = cantilever(cells);

  return {
    grounded, balanced, floating, com, support, margin, worstCantilever,
    ok: grounded && balanced,
  };
}

/** One-line summary for the plan log / UI badge. */
export function stabilitySummary(r: StabilityReport): string {
  if (r.ok) return `stable (margin ${r.margin.toFixed(2)} cells, cantilever ${r.worstCantilever})`;
  if (!r.grounded) return `${r.floating.length} module(s) floating with no support path to ground`;
  return `tips over: centre of mass ${Math.abs(r.margin).toFixed(2)} cells outside the support polygon`;
}
