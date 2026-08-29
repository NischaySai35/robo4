/**
 * planner.ts — L3, the reconfiguration planner. This is the gap the roadmap names.
 *
 * Input:  a current Config, a target shape (bare cells), a move model.
 * Output: an ORDERED LIST OF MOVES that transforms one into the other, where every
 *         intermediate state is connected, collision-free along the swept path,
 *         and (optionally) statically stable.
 *
 * That list is simultaneously the animation script and the hardware command
 * stream. There is deliberately only one of it — if the animation and the robot
 * ran off different plans, the simulator would be lying.
 *
 * TWO STRATEGIES
 *
 *  'decompose' (default) — maximum-commonality decomposition, the single biggest
 *  speedup in the literature. Align the target onto the current shape to maximise
 *  overlap, leave every already-correct module alone, then route surplus modules
 *  one at a time into the cells the target still wants. Routing is a BFS over the
 *  legal-move graph with the rest of the structure held static. Scales to hundreds
 *  of modules. Not optimal, and can get stuck (it says so rather than lying).
 *
 *  'astar' — A* over whole configurations, goal-tested on shape. Optimal in move
 *  count for the given move model, and completely impractical past ~10 modules
 *  because the branching factor is the number of legal moves in the whole robot.
 *  Kept because being able to check "how far off optimal is decompose here" on a
 *  small case is worth a lot when you are trusting the planner with real hardware.
 *
 * WHY NOT LEARN THIS
 * Because it is a search problem with hard feasibility constraints, and a learned
 * policy cannot certify that a plan keeps the robot connected. LLM proposes (what
 * shape), solver disposes (how to get there). See aiShape.ts for the proposing half.
 */
import {
  type Cell, type Config,
  key, manhattan, cellsOf, cloneConfig,
  bestAlignment, translateCells, diff, articulationCells,
} from './lattice';
import { type Move, type MoveModel, movesForModule, applyMove, legalMoves } from './moves';
import { checkStability } from './stability';

export type Strategy = 'decompose' | 'astar';

export interface PlanOptions {
  model: MoveModel;
  strategy: Strategy;
  /** Reject any intermediate state that is ungrounded or tips over. */
  requireStability: boolean;
  /** Auto-translate the target onto the current shape for maximum overlap. */
  autoAlign: boolean;
  /** Hard ceilings so a bad case fails fast instead of hanging the tab. */
  maxMoves: number;
  maxExpansions: number;
}

export const DEFAULT_PLAN_OPTIONS: PlanOptions = {
  model: 'pivoting',
  strategy: 'decompose',
  requireStability: false,
  autoAlign: true,
  maxMoves: 2000,
  maxExpansions: 200000,
};

export interface PlanResult {
  moves: Move[];
  /** the target after alignment/resizing — what the planner actually aimed at */
  goalCells: Cell[];
  complete: boolean;
  /** how many target cells are still empty when the plan ends */
  remaining: number;
  expansions: number;
  ms: number;
  log: string[];
}

// ── shared helpers ────────────────────────────────────────────────────────────

const stateKey = (c: Config) => [...c.occ.keys()].sort().join('|');

/** Stability gate, skipped entirely when the option is off (it is not free). */
function passesStability(c: Config, opts: PlanOptions): boolean {
  if (!opts.requireStability) return true;
  return checkStability(c).ok;
}

/**
 * Greedy assignment cost from surplus cells to missing cells. Used as the A*
 * heuristic. Greedy matching can overestimate against the true optimal matching,
 * so this is not strictly admissible — it is a fast, well-behaved guide, and A*
 * mode is a diagnostic tool rather than a certificate.
 */
function matchCost(surplus: Cell[], missing: Cell[]): number {
  if (!surplus.length) return 0;
  const pool = [...missing];
  let total = 0;
  for (const s of surplus) {
    let bi = -1, bd = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const d = manhattan(s, pool[i]);
      if (d < bd) { bd = d; bi = i; }
    }
    if (bi < 0) break;
    total += bd;
    pool.splice(bi, 1);
  }
  return total;
}

// ── strategy: decompose ───────────────────────────────────────────────────────

/**
 * Route one module from `from` to any cell in `targets`, moving only that module
 * and treating everything else as static. BFS over the legal-move graph, so the
 * returned path is minimum-move for this module in this frozen environment.
 *
 * Returns the move sequence, or null if no target is reachable.
 */
function routeModule(
  c: Config,
  from: Cell,
  targets: Set<string>,
  opts: PlanOptions,
  budget: { expansions: number },
): Move[] | null {
  if (targets.has(key(from))) return [];

  const startKey = key(from);
  const prev = new Map<string, { at: string; move: Move }>();
  const seen = new Set<string>([startKey]);
  // Each queue entry carries the config as it stands with the module at that cell,
  // because legality depends on the module's own position, not just the others'.
  const queue: { cell: Cell; cfg: Config }[] = [{ cell: from, cfg: c }];

  while (queue.length) {
    if (budget.expansions <= 0) return null;
    const { cell, cfg } = queue.shift() as { cell: Cell; cfg: Config };
    budget.expansions--;

    for (const m of movesForModule(cfg, cell, opts.model)) {
      const k = key(m.to);
      if (seen.has(k)) continue;
      const next = applyMove(cfg, m);
      if (!passesStability(next, opts)) continue;
      seen.add(k);
      prev.set(k, { at: key(cell), move: m });

      if (targets.has(k)) {
        // Walk the parent chain back to the start.
        const out: Move[] = [];
        let curK = k;
        while (curK !== startKey) {
          const step = prev.get(curK) as { at: string; move: Move };
          out.push(step.move);
          curK = step.at;
        }
        return out.reverse();
      }
      queue.push({ cell: m.to, cfg: next });
    }
  }
  return null;
}

function planDecompose(start: Config, goalCells: Cell[], opts: PlanOptions): PlanResult {
  const t0 = performance.now();
  const log: string[] = [];
  const budget = { expansions: opts.maxExpansions };
  let cur = cloneConfig(start);
  const moves: Move[] = [];

  const goalSet = new Set(goalCells.map(key));
  const d0 = diff(cur, goalCells);
  log.push(`aligned target keeps ${d0.common.length} of ${cur.occ.size} modules already in place`);
  log.push(`${d0.surplus.length} module(s) to relocate into ${d0.missing.length} empty target cell(s)`);

  let stalls = 0;
  while (moves.length < opts.maxMoves) {
    const d = diff(cur, goalCells);
    if (!d.missing.length) break;

    const missingSet = new Set(d.missing.map(key));
    const locked = articulationCells(cur);

    // Prefer surplus modules (they are in the wrong place anyway), nearest-first to
    // the target region so the structure converges from the outside in.
    const candidates = d.surplus
      .filter((s) => !locked.has(key(s)))
      .sort((a, b) => matchCost([a], d.missing) - matchCost([b], d.missing));

    let progressed = false;
    for (const src of candidates) {
      const path = routeModule(cur, src, missingSet, opts, budget);
      if (!path || !path.length) continue;
      for (const m of path) { cur = applyMove(cur, m); moves.push(m); }
      progressed = true;
      break;
    }

    if (!progressed) {
      // Deadlock breaker: no surplus module can reach a target cell in the current
      // packing. Nudge one module that is free to move at all — usually a module
      // buried in the common core unblocking a corridor — and retry. Bounded, so a
      // genuinely stuck case terminates with an honest partial plan.
      if (stalls >= 3 || budget.expansions <= 0) {
        log.push('no surplus module can reach a remaining target cell — stopping with a partial plan');
        break;
      }
      stalls++;
      const escape = legalMoves(cur, opts.model)
        .filter((m) => !goalSet.has(key(m.from)) || !goalSet.has(key(m.to)))
        .sort((a, b) => matchCost([a.to], diff(cur, goalCells).missing)
                      - matchCost([b.to], diff(cur, goalCells).missing))[0];
      if (!escape) { log.push('no legal move available at all — structure is jammed'); break; }
      if (!passesStability(applyMove(cur, escape), opts)) { log.push('only remaining moves are unstable — stopping'); break; }
      cur = applyMove(cur, escape);
      moves.push(escape);
      log.push(`stall ${stalls}: nudged ${escape.moduleId} to open a route`);
      continue;
    }
    stalls = 0;
  }

  const finalDiff = diff(cur, goalCells);
  if (moves.length >= opts.maxMoves) log.push(`hit the ${opts.maxMoves}-move ceiling`);
  return {
    moves,
    goalCells,
    complete: finalDiff.missing.length === 0,
    remaining: finalDiff.missing.length,
    expansions: opts.maxExpansions - budget.expansions,
    ms: performance.now() - t0,
    log,
  };
}

// ── strategy: A* ──────────────────────────────────────────────────────────────

function planAStar(start: Config, goalCells: Cell[], opts: PlanOptions): PlanResult {
  const t0 = performance.now();
  const log: string[] = [];
  const goalKey = [...goalCells].map(key).sort().join('|');

  interface Node { cfg: Config; g: number; f: number; parent: string | null; via: Move | null; }
  const open: { k: string; f: number }[] = [];
  const nodes = new Map<string, Node>();

  const h0 = matchCost(diff(start, goalCells).surplus, diff(start, goalCells).missing);
  const sk = stateKey(start);
  nodes.set(sk, { cfg: start, g: 0, f: h0, parent: null, via: null });
  open.push({ k: sk, f: h0 });

  const closed = new Set<string>();
  let expansions = 0;

  while (open.length) {
    if (expansions >= opts.maxExpansions) { log.push(`gave up after ${expansions} expansions`); break; }
    // Small frontier at the scale A* is usable at, so a linear scan beats the
    // bookkeeping of a real heap here.
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const { k } = open.splice(bi, 1)[0];
    if (closed.has(k)) continue;
    closed.add(k);
    expansions++;

    const node = nodes.get(k) as Node;
    if (k === goalKey) {
      const out: Move[] = [];
      let ck: string | null = k;
      while (ck) {
        const n: Node = nodes.get(ck) as Node;
        if (n.via) out.push(n.via);
        ck = n.parent;
      }
      out.reverse();
      log.push(`optimal for this move model: ${out.length} moves, ${expansions} states expanded`);
      return {
        moves: out, goalCells, complete: true, remaining: 0,
        expansions, ms: performance.now() - t0, log,
      };
    }
    if (node.g >= opts.maxMoves) continue;

    for (const m of legalMoves(node.cfg, opts.model)) {
      const next = applyMove(node.cfg, m);
      if (!passesStability(next, opts)) continue;
      const nk = stateKey(next);
      if (closed.has(nk)) continue;
      const g = node.g + 1;
      const existing = nodes.get(nk);
      if (existing && existing.g <= g) continue;
      const dd = diff(next, goalCells);
      const f = g + matchCost(dd.surplus, dd.missing);
      nodes.set(nk, { cfg: next, g, f, parent: k, via: m });
      open.push({ k: nk, f });
    }
  }

  log.push('A* exhausted the frontier without reaching the target shape');
  return {
    moves: [], goalCells, complete: false,
    remaining: diff(start, goalCells).missing.length,
    expansions, ms: performance.now() - t0, log,
  };
}

// ── entry point ───────────────────────────────────────────────────────────────

/**
 * Plan a reconfiguration. `targetCells` may be any size or position; it is
 * resized to the module count by the caller (shapes.fitToCount) and, when
 * autoAlign is on, translated here for maximum overlap.
 */
export function planReconfiguration(
  start: Config,
  targetCells: Cell[],
  options: Partial<PlanOptions> = {},
): PlanResult {
  const opts: PlanOptions = { ...DEFAULT_PLAN_OPTIONS, ...options };
  const startCells = cellsOf(start);

  if (targetCells.length !== startCells.length) {
    return {
      moves: [], goalCells: targetCells, complete: false,
      remaining: targetCells.length, expansions: 0, ms: 0,
      log: [`module count mismatch: ${startCells.length} modules cannot form a ${targetCells.length}-cell target. Resize the target first.`],
    };
  }

  const goal = opts.autoAlign
    ? translateCells(targetCells, bestAlignment(startCells, targetCells))
    : targetCells;

  const already = diff(start, goal);
  if (!already.missing.length) {
    return {
      moves: [], goalCells: goal, complete: true, remaining: 0, expansions: 0, ms: 0,
      log: ['already in the target shape — no moves needed'],
    };
  }

  return opts.strategy === 'astar'
    ? planAStar(start, goal, opts)
    : planDecompose(start, goal, opts);
}

/** Cells the plan will end on, for previewing the result without running it. */
export function finalConfig(start: Config, moves: Move[]): Config {
  let cur = start;
  for (const m of moves) cur = applyMove(cur, m);
  return cur;
}

/** Convenience for the UI: which modules never move at all under this plan. */
export function untouchedModules(start: Config, moves: Move[]): string[] {
  const moved = new Set(moves.map((m) => m.moduleId));
  return [...start.occ.values()].filter((id) => !moved.has(id));
}
