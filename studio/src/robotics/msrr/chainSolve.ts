/**
 * chainSolve.ts — solve for a landing pose ON DEMAND, instead of looking one up
 * in a precomputed sweep.
 *
 * WHY THIS FILE EXISTS, GIVEN chainMoves.ts ALREADY HAS A REACH TABLE
 * The precomputed table (chainMoves.ts) enumerates joint space at a fixed
 * resolution and keeps whatever lands near a lattice point. Measured mobility
 * from that table was low — 0 to 3 legal relocations per module in a compact
 * structure — and the dominant rejection reason was "landed on a cube that has
 * a connector, but facing the wrong way" (wrongFacing >> blockedByBody). Finer
 * sampling helps (10deg -> 5deg roughly doubled mobility) but costs 10x the
 * build time as one synchronous sweep, freezing the tab.
 *
 * The fix is to stop sampling and start solving: a walking module almost always
 * needs to reach ONE specific (cell, facing) — the connector it is trying to
 * grab. That is three position equations (the target cell) in the module's
 * three continuous bend joints, which is a well-posed root-finding problem, not
 * a search. Solving it directly is both cheaper per query (a few Newton steps,
 * not tens of thousands of FK evaluations) and exact up to numerical tolerance,
 * rather than whatever a fixed grid happened to land near.
 *
 * WHAT STAYS DISCRETE
 * The connectors seat every 90 degrees (four-fold symmetry) — that is the
 * hardware, not a resolution choice — so TWIST (t0, and the flanking t3 on the
 * big rod) stays enumerated over the same four steps as before. Only the three
 * BEND joints (which are genuinely continuous revolute joints) are solved for.
 * This file is therefore still "discrete move set, chosen deliberately" in the
 * sense that matters: every solved pose is checked against real joint limits and
 * a real lattice snap tolerance before being handed back, so a plan built on it
 * still cannot contain a move the hardware cannot make. What changed is HOW a
 * candidate pose is produced — targeted per query instead of pre-swept — not
 * whether it is verified.
 *
 * chainMoves.ts's reachTable/reachSummary are kept as-is for the Build tab's
 * move-set overview (a useful "how much reach does the module have in general"
 * diagnostic). This file is what the planner (fitModules.ts, transform.ts)
 * actually calls when it needs a pose for a specific target.
 */
import { type Cell, key, manhattan } from './lattice';
import {
  type ModuleAngles, type Vec3,
  IDENTITY, endPose, forwardOf, BEND_LIMIT, MODULE_CHAIN_LENGTH,
} from './modulink';
import { MODULINK_CUBE_SIZE } from './occupancy';
import {
  type LatticePose,
  MAX_SNAP_ERROR, MIN_AXIS_ALIGNMENT,
  sweptCellsCentred, bigRodSides, nearestNamedPose, posesReaching,
} from './chainMoves';

/**
 * Starting guesses, as [t0, b1, b2, t3, b4].
 *
 * The twists start on quarter turns because that is a good spread of the
 * chain's overall direction — but unlike the old enumeration they are now free
 * to move continuously from there, so these are seeds and not a grid. Kept
 * short because an unreachable target pays for every seed before failing.
 *
 * TRIMMED FROM 11 TO 6, measured, not guessed: this is the innermost loop of
 * the whole-robot beam search (transform.ts's oneStepMoves calls this once per
 * candidate connector, per module, per beam state, every round), and a
 * genuinely unreachable candidate — the common case, since most connectors in
 * a real structure are out of one module's reach — pays for every seed before
 * giving up. Measured per-module cost in a 14-module search: 20-550ms with 11
 * seeds. Removing the 5 that duplicated a nearby quarter-turn's coverage (kept
 * one seed per quarter-turn plus two curled variants) cut that by roughly a
 * third, with the full chainSolve.test.ts and transform.test.ts mobility
 * floors unchanged — those are the tests that would catch a real reachability
 * loss, and they did not move. Re-add seeds here only if a floor regresses.
 */
const Q = Math.PI / 2;
const SEEDS: Vars[] = [
  [0, 0, 0, 0, 0],
  [0, 0.6, -0.6, 0, 0.6],
  [Q, 0.6, 0.6, 0, -0.6],
  [2 * Q, 0.6, -0.6, 0, 0.6],
  [3 * Q, 0.6, 0.6, 0, 0.6],
  [0, 1.2, -1.2, 2 * Q, 1.2],
];

const clampBend = (a: number) => Math.max(BEND_LIMIT[0], Math.min(BEND_LIMIT[1], a));

// Position residual is in cube units so it is directly comparable to
// MAX_SNAP_ERROR. Facing residual (1 - dot of forward with wanted, 0..2) is
// weighted UP, not down: position has 3 DOF worth of pull in the least-squares
// fit against facing's 1, so an unweighted facing term gets outvoted and the
// solve lands just outside MIN_AXIS_ALIGNMENT on real targets (measured: 0.897
// against a 0.9 threshold). This value was tuned against exactly that case.
const FACING_WEIGHT = 2.5;
const MAX_LM_ITER = 20;

/** Early-exit target as a fraction of MAX_SNAP_ERROR — see dampedSolve. */
const EARLY_EXIT_FRACTION = 0.15;

/**
 * How closely a travelling connector must line up with the one it is grabbing,
 * as the dot product of their axes. 0.995 is about 5.7 degrees.
 *
 * THIS IS A HARDWARE PARAMETER AND IT DOMINATES MOBILITY.
 * chainMoves.MIN_AXIS_ALIGNMENT is 0.9 — about 26 degrees — which is a
 * reasonable filter for "did this SAMPLED pose land near an axis" but far too
 * loose to describe a weld: a keyed connector 26 degrees out does not seat, it
 * jams. The solver does not have to accept that slop, because it solves for
 * alignment rather than stumbling onto it, so it holds a much tighter bar.
 *
 * The cost is real and was measured: relaxing this to 0.9 roughly doubles
 * reported mobility (snake 2 -> 5, wall 2 -> 4, tower 2 -> 5). Those extra moves
 * are not free wins, they are welds up to 26 degrees misaligned. The honest
 * number is the tight one; the value to use here is however much angular
 * compliance the real connector has, which is a question about the hardware.
 */
export const WELD_ALIGNMENT_MIN = 0.995;

/**
 * The five joints that can move the free end.
 *
 * t0, b1, b2, t3, b4. NOT t5: it is the roll about the end connector's own axis,
 * so it changes neither where that connector sits nor which way it points — it
 * only keys the connector into its socket, where the four-fold symmetry applies.
 * Leaving it out costs nothing and removes a whole dimension from the search.
 */
type Vars = [number, number, number, number, number];
const NVARS = 5;

const toAngles = (v: Vars): ModuleAngles => [v[0], v[1], v[2], v[3], v[4], 0];

/**
 * Bends clamp at +/-90; twists are continuous full-turn joints and wrap.
 *
 * THE TWISTS ARE MOTORS, NOT CONNECTORS — this is the correction that made the
 * solver useful. An earlier version enumerated t0 and t3 over four 90-degree
 * steps, reasoning from the connectors' four-fold symmetry. That symmetry is
 * real but applies to how a connector SEATS in its socket, not to what angle a
 * twist joint mid-chain can hold: the spec gives TWIST a full 0-360 range. So
 * quantizing them threw away two of the module's DOF, leaving three to satisfy
 * three position and one facing constraint — over-constrained, which is exactly
 * why most targets came back unreachable even a single cube away. With five
 * free DOF against four constraints there is a one-parameter family of
 * solutions, and reachability improves accordingly.
 */
const clampVars = (v: Vars): Vars => [
  wrapTwist(v[0]), clampBend(v[1]), clampBend(v[2]), wrapTwist(v[3]), clampBend(v[4]),
];
const wrapTwist = (a: number) => {
  const twoPi = Math.PI * 2;
  return ((a % twoPi) + twoPi) % twoPi;
};

/**
 * Residual for one joint guess: 3 position components (cube units) plus one
 * facing component. Returned alongside the raw position/forward so callers do
 * not have to re-run FK just to check the real, unweighted tolerances.
 */
function residual(
  v: Vars, targetPos: Vec3, wantedDir: Cell, cubeSize: number,
): { r: [number, number, number, number]; posErr: Vec3; dot: number } {
  const e = endPose(toAngles(v), IDENTITY);
  const posErr: Vec3 = [
    (targetPos[0] - e.position[0]) / cubeSize,
    (targetPos[1] - e.position[1]) / cubeSize,
    (targetPos[2] - e.position[2]) / cubeSize,
  ];
  const f = forwardOf(e);
  const len = Math.hypot(f[0], f[1], f[2]) || 1;
  const dot = (f[0] * wantedDir[0] + f[1] * wantedDir[1] + f[2] * wantedDir[2]) / len;
  return { r: [posErr[0], posErr[1], posErr[2], (1 - dot) * FACING_WEIGHT], posErr, dot };
}

/**
 * Damped Gauss-Newton (Levenberg-Marquardt) over the five position-affecting
 * joints, minimising a combined position + facing residual — the same
 * damped-least-squares idiom this codebase already uses for closing kinematic
 * loops (loopClosure.ts).
 *
 * POSITION AND FACING ARE MINIMISED TOGETHER, NOT IN SEQUENCE
 * An earlier version targeted position only and checked facing afterwards; it
 * failed on most real targets, because the exact-position solution usually has
 * some fixed, not-axis-aligned facing, while a solution slightly off in position
 * often faces exactly right. Solving both at once lets it trade a little
 * position slack for a lot of facing accuracy.
 *
 * Returns the best joints found. The caller checks them against the REAL,
 * unweighted tolerances (MAX_SNAP_ERROR, MIN_AXIS_ALIGNMENT) — this function's
 * internal weighting is a search heuristic and is not an acceptance test.
 */
function dampedSolve(
  seed: Vars, targetPos: Vec3, wantedDir: Cell, cubeSize: number,
): { vars: Vars; posErr: number; dot: number } {
  let v: Vars = clampVars([...seed] as Vars);
  let lambda = 1e-2;
  const h = 1e-5;

  let cur = residual(v, targetPos, wantedDir, cubeSize);
  let curNorm = normOf(cur.r);

  /**
   * Comfortably inside both tolerances — not merely at the limit. Exiting the
   * instant posErr <= MAX_SNAP_ERROR returns solutions sitting right on the
   * boundary (measured 0.299 against a 0.3 limit); a few more iterations tighten
   * that a long way for almost no time, since the cost is the long tail of
   * convergence rather than the first steps.
   */
  const comfortable = () =>
    Math.hypot(cur.posErr[0], cur.posErr[1], cur.posErr[2]) <= MAX_SNAP_ERROR * EARLY_EXIT_FRACTION
    && cur.dot >= WELD_ALIGNMENT_MIN;

  for (let iter = 0; iter < MAX_LM_ITER; iter++) {
    if (comfortable()) break;

    // Central-difference Jacobian: 4 residual rows x 5 unknown columns.
    const cols: number[][] = [];
    for (let j = 0; j < NVARS; j++) {
      const plus = [...v] as Vars; plus[j] += h;
      const minus = [...v] as Vars; minus[j] -= h;
      const rp = residual(clampVars(plus), targetPos, wantedDir, cubeSize).r;
      const rm = residual(clampVars(minus), targetPos, wantedDir, cubeSize).r;
      cols.push([
        (rp[0] - rm[0]) / (2 * h), (rp[1] - rm[1]) / (2 * h),
        (rp[2] - rm[2]) / (2 * h), (rp[3] - rm[3]) / (2 * h),
      ]);
    }

    // Normal equations (J^T J + lambda*I) delta = -J^T r.
    const JtJ: number[][] = [];
    const Jtr: number[] = [];
    for (let a = 0; a < NVARS; a++) {
      const row: number[] = [];
      for (let b = 0; b < NVARS; b++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) sum += cols[a][k] * cols[b][k];
        row.push(sum + (a === b ? lambda : 0));
      }
      JtJ.push(row);
      // Negative: minimising ||r + J*delta||^2 solves J^T J * delta = -J^T r.
      // The wrong sign here makes every step climb the residual instead of
      // descending it, silently — it happened, and only a test against a
      // known-good solution caught it.
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += cols[a][k] * cur.r[k];
      Jtr.push(-sum);
    }

    const delta = solveLinear(JtJ, Jtr);
    if (!delta) { lambda *= 4; if (lambda > 1e6) break; continue; }

    const next = clampVars(v.map((x, i) => x + delta[i]) as Vars);
    const nextRes = residual(next, targetPos, wantedDir, cubeSize);
    const nextNorm = normOf(nextRes.r);

    if (nextNorm < curNorm) {
      v = next; cur = nextRes; curNorm = nextNorm;
      lambda = Math.max(lambda * 0.4, 1e-9);
    } else {
      lambda *= 6;
      if (lambda > 1e6) break; // stuck; the caller tries another seed
    }
  }

  return { vars: v, posErr: Math.hypot(cur.posErr[0], cur.posErr[1], cur.posErr[2]), dot: cur.dot };
}

const normOf = (r: readonly number[]) => Math.hypot(...r);

/** Gaussian elimination with partial pivoting for a small dense square system. */
function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[piv][col])) piv = row;
    }
    if (Math.abs(M[piv][col]) < 1e-12) return null; // singular
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = M[row][col] / M[col][col];
      for (let c = col; c <= n; c++) M[row][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / M[i][i]);
}

interface BestBends { angles: ModuleAngles; snapError: number; bendCost: number }

/** Furthest a straight (unfolded) module can possibly reach, with a small margin. */
const MAX_REACH = MODULE_CHAIN_LENGTH * 1.05;


/**
 * Search (t0, t3, seed) combinations and collect up to `wantAlternates`
 * solutions with GENUINELY DIFFERENT body routes, cheapest bend first.
 *
 * WHY ALTERNATES, NOT JUST THE BEST ONE — this is the whole point of the file's
 * second revision. An earlier version stopped at the first working solution.
 * Wired into the planner that made mobility WORSE, not better: the caller has
 * to reject any route whose body collides with another module, and with exactly
 * one candidate a collision means the target is simply unreachable. The
 * precomputed table never had that problem because it always carried several
 * routes per landing spot (ALTERNATES_PER_TARGET). Returning a handful here
 * restores the fallback, which is what makes the solver a net win instead of a
 * regression.
 *
 * Routes are deduplicated by the set of cubes the body passes through, since
 * that is exactly what the collision check looks at — two solutions differing
 * only in joint angles but sweeping identical cubes are not alternatives for
 * this purpose.
 */
function findBendSolutions(
  targetPos: Vec3, wantedDir: Cell, cubeSize: number, wantAlternates: number,
): BestBends[] {
  // Cheap reject before any solve runs: nothing folds LONGER than straight, so
  // a target beyond that is not worth a single wasted solve.
  if (Math.hypot(targetPos[0], targetPos[1], targetPos[2]) > MAX_REACH) return [];

  const found: BestBends[] = [];
  const routes = new Set<string>();

  for (const seed of SEEDS) {
    if (found.length >= wantAlternates) break;

    const solved = dampedSolve(seed, targetPos, wantedDir, cubeSize);
    // Acceptance uses the REAL tolerances, not the solver's internal weighted
    // residual — the weighting is only a search heuristic.
    if (solved.posErr > MAX_SNAP_ERROR) continue;
    if (solved.dot < WELD_ALIGNMENT_MIN) continue;

    const angles = toAngles(solved.vars);
    const sig = sweptCellsCentred(angles, cubeSize).map(key).sort().join(',');
    if (routes.has(sig)) continue; // same cubes swept — not an alternative
    routes.add(sig);

    found.push({
      angles,
      snapError: solved.posErr,
      bendCost: Math.abs(angles[1]) + Math.abs(angles[2]) + Math.abs(angles[4]),
    });
  }
  return sortByBend(found);
}

/** Straightest first — the least-folded route is the one to try before the others. */
const sortByBend = (xs: BestBends[]) => xs.sort((a, b) => a.bendCost - b.bendCost);

export interface SolveOptions {
  /** how many distinct body routes to return; default matches the table's own */
  alternates?: number;
}

/** Same default the precomputed table uses, so both sources offer equal fallback depth. */
export const DEFAULT_ALTERNATES = 4;

function toLatticePose(
  b: BestBends, wantedOffset: Cell, wantedDir: Cell, cubeSize: number, index: number,
): LatticePose {
  const cells = sweptCellsCentred(b.angles, cubeSize);
  const { midOffset, sideDirs } = bigRodSides(b.angles, cubeSize);
  return {
    id: `solved@${key(wantedOffset)}|${key(wantedDir)}#${index}`,
    bendPoseId: nearestNamedPose(b.angles),
    // -1: a solved pose's twists are continuous, so they do not correspond to a
    // quarter-turn index. The field only exists for the precomputed table's own
    // labelling; nothing branches on it.
    twistSteps: [-1, -1, -1],
    angles: b.angles,
    endOffset: wantedOffset,
    endDir: wantedDir,
    cells,
    reach: manhattan([0, 0, 0], wantedOffset),
    snapError: b.snapError,
    midOffset,
    sideDirs,
    anchorEnd: 'A',
  };
}

/**
 * Every distinct body route that lands the free end at `wantedOffset` (cube
 * offsets relative to the anchor at [0,0,0]) facing `wantedDir`, in the
 * module's own canonical local frame — anchor at origin, chain nominally along
 * -Z, matching chainMoves.ts's convention. Straightest route first.
 *
 * Returns several rather than one BECAUSE THE CALLER WILL REJECT SOME: a route
 * whose body collides with another module is unusable, and with a single
 * candidate that makes the target unreachable even when another fold would
 * have cleared. Empty means genuinely out of the module's envelope.
 */
export function solveLandingPoses(
  wantedOffset: Cell,
  wantedDir: Cell,
  cubeSize = MODULINK_CUBE_SIZE,
  options: SolveOptions = {},
): LatticePose[] {
  const want = options.alternates ?? DEFAULT_ALTERNATES;
  const targetPos: Vec3 = [
    wantedOffset[0] * cubeSize, wantedOffset[1] * cubeSize, wantedOffset[2] * cubeSize,
  ];
  return findBendSolutions(targetPos, wantedDir, cubeSize, want)
    .map((b, i) => toLatticePose(b, wantedOffset, wantedDir, cubeSize, i));
}

/** The single straightest route, or null. Convenience over solveLandingPoses. */
export function solveLandingPose(
  wantedOffset: Cell,
  wantedDir: Cell,
  cubeSize = MODULINK_CUBE_SIZE,
  options: SolveOptions = {},
): LatticePose | null {
  return solveLandingPoses(wantedOffset, wantedDir, cubeSize, { ...options, alternates: 1 })[0] ?? null;
}

/**
 * Table first, solver for the gap — returning ALL routes from whichever answers.
 *
 * The precomputed table is a map lookup and already covers most queries, so it
 * is checked first; the solver only pays its real cost (which is seconds, in
 * the worst case, when a target is unreachable and every twist combination has
 * to be tried and fail) on genuine gaps. Both sources return multiple routes,
 * so the caller's collision rejection has somewhere to fall back to either way
 * — which is the difference between this being a mobility gain and a
 * regression.
 */
export function findLandingPoses(
  wantedOffset: Cell, wantedDir: Cell, cubeSize = MODULINK_CUBE_SIZE, alternates?: number,
): LatticePose[] {
  const fromTable = posesReaching(wantedOffset, wantedDir, cubeSize);
  if (fromTable.length) return fromTable;
  return solveLandingPosesCached(wantedOffset, wantedDir, cubeSize, alternates);
}

/** Single-route convenience over findLandingPoses. */
export function findLandingPose(
  wantedOffset: Cell, wantedDir: Cell, cubeSize = MODULINK_CUBE_SIZE,
): LatticePose | null {
  return findLandingPoses(wantedOffset, wantedDir, cubeSize)[0] ?? null;
}

/**
 * Per-process memo. Caches the whole alternates list, and caches MISSES too —
 * an unreachable target is the expensive case (every twist combination tried
 * and failed), and mobility sweeps re-query the same ones constantly.
 */
const solveCache = new Map<string, LatticePose[]>();

export function solveLandingPosesCached(
  wantedOffset: Cell, wantedDir: Cell, cubeSize = MODULINK_CUBE_SIZE, alternates?: number,
): LatticePose[] {
  const want = alternates ?? DEFAULT_ALTERNATES;
  // Alternate count is part of the cache key: a caller asking for fewer must
  // not be served (or poison the cache with) a result solved for more, and
  // vice versa — a 2-alternate answer is not a valid answer to a 4-alternate
  // question, and solving for 4 when 2 would do is exactly the wasted work
  // this parameter exists to let a caller skip.
  const k = `${key(wantedOffset)}|${key(wantedDir)}|${cubeSize}|${want}`;
  const hit = solveCache.get(k);
  if (hit) return hit;
  const result = solveLandingPoses(wantedOffset, wantedDir, cubeSize, { alternates: want });
  solveCache.set(k, result);
  return result;
}

export function solveLandingPoseCached(
  wantedOffset: Cell, wantedDir: Cell, cubeSize = MODULINK_CUBE_SIZE,
): LatticePose | null {
  return solveLandingPosesCached(wantedOffset, wantedDir, cubeSize)[0] ?? null;
}

export function clearSolveCache() { solveCache.clear(); }
