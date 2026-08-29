/**
 * moves.ts — the move set. This is the single most important file to get right.
 *
 * Roadmap Phase 2, first bullet: "Define the move set your hardware can really do.
 * Everything downstream depends on it." A planner is only as trustworthy as its
 * move generator: if a move is emitted here that the metal cannot perform, every
 * plan built on it is fiction.
 *
 * Two standard abstractions are implemented, switchable at runtime:
 *
 *  SLIDING CUBE — a module translates one cell at a time across the surface of its
 *  neighbours. Requires a substrate to slide along. Most literature coverage;
 *  universal reconfiguration algorithms are proven for it. Least like real hardware
 *  (nothing on your modules actually slides).
 *
 *  PIVOTING CUBE — a module rotates 90 degrees or 180 degrees about an edge it shares with a
 *  neighbour. Much closer to what a rotating-joint module physically does, but has
 *  blocking constraints the sliding model does not: the swept volume must be clear,
 *  not just the destination cell.
 *
 * Every generated move carries `swept` — the cells the module passes THROUGH, not
 * just where it lands. That is what makes "no teleporting" real: executor.ts
 * animates the arc, and the legality check requires the whole sweep to be free.
 *
 * Every move is also filtered on connectivity: the module must be liftable without
 * splitting the robot, and the post-move config must be connected. A move that
 * leaves the structure in two pieces is never emitted, at any effort level.
 */
import {
  type Cell, type CellKey, type Config,
  DIRS_6, add, neg, key, eq, perpDirs, cross,
  isConnected, isConnectedWithout, withMoved,
} from './lattice';

export type MoveModel = 'sliding' | 'pivoting';

export type MoveKind =
  | 'slide'        // sliding model: straight translation along a substrate
  | 'slide-corner' // sliding model: wrap around a convex corner
  | 'roll'         // pivoting model: 90 degrees over the shared edge onto adjacent support
  | 'convex'       // pivoting model: 180 degrees around a convex corner
  | 'concave';     // pivoting model: 180 degrees into a concave corner (climb a wall)

export interface Move {
  kind: MoveKind;
  moduleId: string;
  from: Cell;
  to: Cell;
  /** The neighbour the module pushes/pivots against — its anchor. */
  anchor: Cell;
  /** Cells the module passes through, excluding `from`, including `to`. */
  swept: Cell[];
  /**
   * Rotation geometry for pivoting moves, in lattice units relative to cell
   * centres. Absent for pure translations. executor.ts turns this into an arc.
   */
  pivot?: {
    /** point on the rotation axis, in lattice space (may be half-integer) */
    point: [number, number, number];
    /** unit axis direction */
    axis: Cell;
    /** signed sweep in radians (+/- PI/2 or +/- PI) */
    angle: number;
  };
}

/** Human-readable move, used for the plan list and as the hardware command log. */
export function describeMove(m: Move, index?: number): string {
  const n = index === undefined ? '' : `${index + 1}. `;
  const f = `(${m.from.join(',')})`;
  const t = `(${m.to.join(',')})`;
  const verb: Record<MoveKind, string> = {
    'slide': 'slide',
    'slide-corner': 'slide around corner',
    'roll': 'roll 90 degrees',
    'convex': 'pivot 180 degrees around corner',
    'concave': 'pivot 180 degrees into corner',
  };
  return `${n}${m.moduleId}: ${verb[m.kind]} ${f} -> ${t} against (${m.anchor.join(',')})`;
}

// ── shared legality ───────────────────────────────────────────────────────────

const free = (c: Config, cell: Cell) => !c.occ.has(key(cell));

/**
 * A candidate is legal when: the destination and the whole swept path are empty,
 * lifting the module does not split the robot, and it is still attached to at
 * least one neighbour when it lands.
 *
 * The "still attached on landing" test is why we check connectivity of the RESULT
 * rather than just of the remainder: a module that lands touching nothing has
 * flown, which no real connector-based module can do.
 */
function accept(c: Config, from: Cell, to: Cell, swept: Cell[]): boolean {
  for (const s of swept) if (!free(c, s)) return false;
  if (!isConnectedWithout(c, from)) return false;
  return isConnected(withMoved(c, from, to));
}

// ── sliding cube ──────────────────────────────────────────────────────────────

/**
 * Straight slide: module at p moves to p+d, sliding along a substrate of two
 * modules at p+e and p+d+e (the surface it rides on). Sweeps only the target.
 */
function slidingMoves(c: Config, p: Cell, id: string, out: Move[]) {
  for (const d of DIRS_6) {
    const to = add(p, d);
    if (!free(c, to)) continue;
    for (const e of perpDirs(d)) {
      const sub1 = add(p, e);
      const sub2 = add(to, e);
      if (free(c, sub1) || free(c, sub2)) continue;
      if (!accept(c, p, to, [to])) continue;
      out.push({ kind: 'slide', moduleId: id, from: p, to, anchor: sub1, swept: [to] });
      break; // one substrate is enough to justify the move
    }
  }
}

/**
 * Convex corner slide: module at p is attached to anchor a = p+e. It slides
 * around a's exposed corner to land at p+e+d, passing through the empty cell p+d.
 * This is the sliding model's answer to "get around an edge".
 */
function slidingCornerMoves(c: Config, p: Cell, id: string, out: Move[]) {
  for (const e of DIRS_6) {
    const anchor = add(p, e);
    if (free(c, anchor)) continue;          // must have something to wrap around
    for (const d of perpDirs(e)) {
      const via = add(p, d);
      const to = add(anchor, d);            // = p + e + d
      if (!free(c, via) || !free(c, to)) continue;
      if (!accept(c, p, to, [via, to])) continue;
      out.push({ kind: 'slide-corner', moduleId: id, from: p, to, anchor, swept: [via, to] });
    }
  }
}

// ── pivoting cube ─────────────────────────────────────────────────────────────

/**
 * Pivot geometry. The module at `p` rotates about the lattice edge shared by the
 * cells p, p+e, p+d and p+e+d — that edge runs along cross(e,d) and passes through
 * the point p + e/2 + d/2 (cell centres are integer points, so the shared edge sits
 * at a half-integer offset).
 *
 * A 90 degrees rotation about that edge carries p to p+d (a roll along the surface of the
 * anchor). A 180 degrees rotation carries p to p+e+d (around the anchor's corner). Both
 * are verified by construction below rather than asserted: `signFor` picks the
 * sweep direction whose mid-arc stays in free space, which is also what makes the
 * blocking test honest.
 */
function pivotEdge(p: Cell, e: Cell, d: Cell) {
  const point: [number, number, number] = [
    p[0] + (e[0] + d[0]) / 2,
    p[1] + (e[1] + d[1]) / 2,
    p[2] + (e[2] + d[2]) / 2,
  ];
  return { point, axis: cross(e, d) };
}

/**
 * Choose the rotation sign that sweeps the module through `clear` rather than
 * back through the anchor. For a 180 degrees pivot both signs share endpoints but sweep
 * opposite half-circles, so this is not cosmetic — it decides which cells the
 * module actually passes through.
 */
function signFor(
  from: Cell,
  pivot: { point: [number, number, number]; axis: Cell },
  clear: Cell,
): 1 | -1 {
  const v: [number, number, number] = [
    from[0] - pivot.point[0], from[1] - pivot.point[1], from[2] - pivot.point[2],
  ];
  const n = pivot.axis;
  // Rodrigues at +90 degrees: v*cos + (n x v)*sin + n*(n.v)*(1-cos) reduces to (n x v)
  // for a unit axis perpendicular to v, which is always the case here.
  const rot90: [number, number, number] = [
    n[1] * v[2] - n[2] * v[1],
    n[2] * v[0] - n[0] * v[2],
    n[0] * v[1] - n[1] * v[0],
  ];
  const midPlus = [pivot.point[0] + rot90[0], pivot.point[1] + rot90[1], pivot.point[2] + rot90[2]];
  const dPlus = (midPlus[0] - clear[0]) ** 2 + (midPlus[1] - clear[1]) ** 2 + (midPlus[2] - clear[2]) ** 2;
  const midMinus = [pivot.point[0] - rot90[0], pivot.point[1] - rot90[1], pivot.point[2] - rot90[2]];
  const dMinus = (midMinus[0] - clear[0]) ** 2 + (midMinus[1] - clear[1]) ** 2 + (midMinus[2] - clear[2]) ** 2;
  return dPlus <= dMinus ? 1 : -1;
}

function pivotingMoves(c: Config, p: Cell, id: string, out: Move[]) {
  for (const e of DIRS_6) {
    const anchor = add(p, e);
    if (free(c, anchor)) continue; // need something to pivot against

    for (const d of perpDirs(e)) {
      const via = add(p, d);            // cell the module rolls into / passes through
      const landingSupport = add(via, e); // = anchor + d
      if (!free(c, via)) {
        // ── concave: p+d is a wall. The module climbs it, ending on top of the
        // wall at p+d-e, sweeping through the cell p-e above itself.
        const over = add(p, neg(e));
        const to = add(via, neg(e));   // = p + d - e
        if (!free(c, over) || !free(c, to)) continue;
        if (!accept(c, p, to, [over, to])) continue;
        const pe = pivotEdge(p, d, neg(e)); // shared edge with the wall, on the far side
        out.push({
          kind: 'concave', moduleId: id, from: p, to, anchor: via,
          swept: [over, to],
          pivot: { point: pe.point, axis: pe.axis, angle: signFor(p, pe, over) * Math.PI },
        });
        continue;
      }

      if (!free(c, landingSupport)) {
        // ── roll: the anchor's neighbour at anchor+d gives the module something to
        // land on, so a single 90 degrees pivot over the shared edge suffices.
        if (!accept(c, p, via, [via])) continue;
        const pe = pivotEdge(p, e, d);
        out.push({
          kind: 'roll', moduleId: id, from: p, to: via, anchor,
          swept: [via],
          pivot: { point: pe.point, axis: pe.axis, angle: signFor(p, pe, via) * (Math.PI / 2) },
        });
      } else {
        // ── convex: nothing to land on beside the anchor, so the module continues
        // 180 degrees around the anchor's corner and ends up alongside it at p+e+d.
        const to = add(anchor, d);
        if (!free(c, to)) continue;
        if (!accept(c, p, to, [via, to])) continue;
        const pe = pivotEdge(p, e, d);
        out.push({
          kind: 'convex', moduleId: id, from: p, to, anchor,
          swept: [via, to],
          pivot: { point: pe.point, axis: pe.axis, angle: signFor(p, pe, via) * Math.PI },
        });
      }
    }
  }
}

// ── public API ────────────────────────────────────────────────────────────────

/** Every legal move for one module under the chosen model. */
export function movesForModule(c: Config, cell: Cell, model: MoveModel): Move[] {
  const id = c.occ.get(key(cell));
  if (id === undefined) return [];
  const out: Move[] = [];
  if (model === 'sliding') {
    slidingMoves(c, cell, id, out);
    slidingCornerMoves(c, cell, id, out);
  } else {
    pivotingMoves(c, cell, id, out);
  }
  return dedupe(out);
}

/** Every legal move in the configuration. This is the planner's branching factor. */
export function legalMoves(c: Config, model: MoveModel): Move[] {
  const out: Move[] = [];
  for (const k of c.occ.keys()) out.push(...movesForModule(c, unkeyLocal(k), model));
  return out;
}

const unkeyLocal = (k: CellKey): Cell => {
  const p = k.split(',');
  return [+p[0], +p[1], +p[2]];
};

/** Distinct (module, destination, kind) triples — the corner rules can double up. */
function dedupe(moves: Move[]): Move[] {
  const seen = new Set<string>();
  const out: Move[] = [];
  for (const m of moves) {
    const s = `${m.moduleId}|${key(m.to)}|${m.kind}`;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(m);
  }
  return out;
}

export const applyMove = (c: Config, m: Move): Config => withMoved(c, m.from, m.to);

/**
 * Re-verify a move against a config. Used to validate a whole recorded plan
 * before playback or before it is handed to hardware — a plan is only worth
 * executing if every step is still legal in the state it will actually run in.
 */
export function isMoveLegal(c: Config, m: Move, model: MoveModel): boolean {
  const here = c.occ.get(key(m.from));
  if (here === undefined || here !== m.moduleId) return false;
  return movesForModule(c, m.from, model).some((x) => eq(x.to, m.to) && x.kind === m.kind);
}

export interface PlanCheck { ok: boolean; failedAt: number; reason: string; }

/** Replay a plan step by step, confirming legality and connectivity throughout. */
export function verifyPlan(start: Config, moves: Move[], model: MoveModel): PlanCheck {
  let cur = start;
  for (let i = 0; i < moves.length; i++) {
    if (!isMoveLegal(cur, moves[i], model)) {
      return { ok: false, failedAt: i, reason: `move ${i + 1} is not legal in the state it runs in` };
    }
    cur = applyMove(cur, moves[i]);
    if (!isConnected(cur)) {
      return { ok: false, failedAt: i, reason: `move ${i + 1} disconnects the structure` };
    }
  }
  return { ok: true, failedAt: -1, reason: '' };
}
