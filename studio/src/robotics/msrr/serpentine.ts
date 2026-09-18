/**
 * serpentine.ts — how to FILL a solid patch, as opposed to how to TRACE a skeleton.
 *
 * WHY THIS FILE EXISTS
 * skeleton.ts reads a shape as junctions, corners and tips, and that is the
 * right reading for anything limb-shaped. It is the WRONG reading for a slab:
 * in a wall or a solid block every cube has three to six occupied neighbours,
 * so every cube looks like a junction, and skeleton.ts deliberately suppresses
 * them all (`inSolidPatch` — "a slab is not asking for branches, it is asking
 * to be filled"). Correct, but it left a hole: nothing then said HOW to fill
 * it. A wall came out of the fitter with ZERO features, which meant no
 * anchors, no reservations and no ordering — just blind greedy coverage, which
 * is exactly why walls and boxes came out as several disconnected clumps.
 *
 * THE RULE THIS FILE IMPLEMENTS, in Nischay's words:
 *   "modules should always have the tendency to fill its own longest line
 *    first... after it fills that line if there is other line, it chooses the
 *    next longest line and also equal preference to its adjacent... i want
 *    modules to fill its adjacent lines first, so it will take a uturn, i mean
 *    bend as needed like letter u and occupy the next line and continues, so
 *    first all columns, then u turns and all rows and shifts to next layer if
 *    multiple are there."
 *
 * So: pick the axis whose straight lines are longest, fill the longest line,
 * then U-turn into the neighbouring line, and keep snaking — across the layer,
 * then into the next layer. A boustrophedon, in one word. The result is a
 * single continuous path through the whole patch, which is the one shape a
 * chain of modules can follow without ever having to start again somewhere
 * else — so the fill and the connectivity rule (rule 8) stop fighting.
 *
 * LINES ARE AXIS-ALIGNED, ALWAYS. Nischay was explicit: "strictly its not side
 * ways, or face diagonal or body diagonal whatever". A module lies straight
 * along a lattice axis; a diagonal is not a line it can lie along, so it is not
 * a line this file will ever propose.
 *
 * WHAT THIS FILE DOES NOT DO: it does not place modules. It produces a route
 * and the features that route implies, and hands them to fitModules.ts, which
 * goes on applying every rule it already applies — the route is read as a
 * shape to follow, not as a licence to bypass anything.
 */
import {
  type Cell, type CellKey, key, add, sub, neg, eq, manhattan, cross,
} from './lattice';
import {
  type ShapeFeature, type ShapeSkeleton, armsOf, inSolidPatch, BAND_FILL,
} from './skeleton';

const AXES: readonly Cell[] = Object.freeze([[1, 0, 0], [0, 1, 0], [0, 0, 1]] as Cell[]);

/**
 * How much a candidate line's DISTANCE from where the fill currently stands
 * counts against it, per cube of detour, versus how much its LENGTH counts for
 * it, per cube of line.
 *
 * Nischay asked for "equal preference" between taking the next-longest line
 * and taking the ADJACENT one, and then said which way that tie should fall:
 * "i want modules to fill its adjacent lines first". So adjacency leads and
 * length follows, and the ratio below says by how much: one extra cube of
 * detour costs the same as ten cubes of line. On anything genuinely slab-like
 * the neighbour always wins and the snake stays tight, while an irregular
 * patch with one much longer spur somewhere else can still reach for it.
 */
export const W_ADJACENT_LINE = 100;
export const W_LINE_LENGTH = 10;

/**
 * How many lines a snake's U-turn steps over. Two, because one cannot be built.
 *
 * Nischay's rule says turn into the line right next door, and his reasoning
 * about the joints is right — three bend joints, ninety degrees each, is
 * plenty of travel to double back. What stops it is his own sphere rule.
 * Solved exactly (not sampled from the reach table) in all four fold planes
 * and at every offset along the line, a reversal into the NEIGHBOURING line
 * brings the module's connector A to 0.715 cubes of its own UP side dome,
 * where two domes need 0.887. Short by about a sixth of a cube, every time,
 * with no route round it. At two lines' pitch the same reversal is clean and
 * the solver finds twenty-nine of them. uTurnCatalogue in fitModules.ts is
 * where that measurement lives, and the test beside it pins it.
 *
 * Two has its own cost, which is why the default fill is a spiral rather than
 * a snake (see FILL_PATTERN): a two-line U-turn passes THROUGH the line it
 * steps over, and in a patch one cube thick that line then has built courses
 * on both sides and nothing welded can ever get back into it.
 */
export const U_TURN_PITCH = 2;

/** A fill route: an ordered walk covering one solid patch. */
export interface SerpentineRoute {
  /** the cubes to cover, in the order to cover them */
  cells: Cell[];
  /** the axis its straight lines run along */
  axis: Cell;
  /** how many lines it snaked through */
  lines: number;
}

/** The cubes skeleton.ts reads as slab rather than skeleton. */
export function solidCellsOf(cells: Cell[], occ = new Set(cells.map(key))): Cell[] {
  return cells.filter((c) => inSolidPatch(c, armsOf(c, occ), occ));
}

/**
 * The solid patches, as separate connected groups.
 *
 * Separate, because two slabs joined by a thin limb are two fills, not one:
 * routing them as a single patch would send the snake off down the limb
 * mid-fill and back again, which is neither the shortest route nor anything
 * the shape looks like.
 */
export function denseComponents(cells: Cell[]): Cell[][] {
  const solid = solidCellsOf(cells);
  const pool = new Set(solid.map(key));
  const out: Cell[][] = [];
  for (const seed of solid) {
    if (!pool.has(key(seed))) continue;
    const group: Cell[] = [];
    const stack: Cell[] = [seed];
    pool.delete(key(seed));
    while (stack.length) {
      const c = stack.pop() as Cell;
      group.push(c);
      for (const a of AXES) {
        for (const d of [a, neg(a)]) {
          const n = add(c, d);
          if (pool.delete(key(n))) stack.push(n);
        }
      }
    }
    out.push(group);
  }
  return out;
}

/** Every maximal straight line of `occ` along `axis`, each in ascending order. */
function linesAlong(axis: Cell, cells: Cell[], occ: Set<CellKey>): Cell[][] {
  const seen = new Set<CellKey>();
  const out: Cell[][] = [];
  for (const c of cells) {
    if (seen.has(key(c))) continue;
    let start = c;
    while (occ.has(key(sub(start, axis)))) start = sub(start, axis);
    const line: Cell[] = [];
    for (let p = start; occ.has(key(p)); p = add(p, axis)) {
      line.push(p);
      seen.add(key(p));
    }
    out.push(line);
  }
  return out;
}

/** Lattice-key order, so two identical shapes always route identically. */
const before = (a: Cell, b: Cell) => (key(a) < key(b) ? -1 : 1);

/**
 * Route one solid patch: longest line first, then U-turn into the next.
 *
 * The axis is chosen by the LONGEST line it offers, which is rule 7 (straight,
 * if at all possible) applied to a slab: the axis with the longest lines is the
 * one a module can lie furthest along without spending a bend, so it is the one
 * that costs the fewest bends overall. Ties break toward the axis with FEWER
 * lines — the same cubes, fewer U-turns — and then by axis order, so the answer
 * never depends on which cube happened to be listed first.
 */
export function fillAxis(cells: Cell[]): Cell {
  const occ = new Set(cells.map(key));
  let axis: Cell = AXES[0];
  let best = { longest: -1, count: Infinity };
  // Vertical first, so that when two axes offer lines of the same length the
  // fill stands its courses up rather than laying them flat — Nischay's call:
  // "while doing longer lines prefer vertical over horizontal".
  for (const a of [AXES[1], AXES[0], AXES[2]]) {
    const ls = linesAlong(a, cells, occ);
    const longest = ls.reduce((n, l) => Math.max(n, l.length), 0);
    if (longest > best.longest || (longest === best.longest && ls.length < best.count)) {
      best = { longest, count: ls.length };
      axis = a;
    }
  }
  return axis;
}

export function routeOne(cells: Cell[]): SerpentineRoute | null {
  if (!cells.length) return null;
  const occ = new Set(cells.map(key));
  const axis = fillAxis(cells);
  const lines = linesAlong(axis, cells, occ);
  if (!lines.length) return null;

  const visited = new Set<CellKey>();
  const route: Cell[] = [];
  const emit = (c: Cell) => { route.push(c); visited.add(key(c)); };

  // What is still worth walking, recomputed each step: the maximal unwalked
  // stretches of each line. Recomputed rather than fixed up front because a
  // U-turn passes THROUGH the line it steps over, taking one cube out of it —
  // so that line is two shorter stretches by the time the fill comes back for
  // it, and pretending otherwise would send the snake into the middle of a
  // stretch it had already cut in half.
  const stretches = (): Cell[][] => {
    const out: Cell[][] = [];
    for (const line of lines) {
      let run: Cell[] = [];
      for (const c of line) {
        if (visited.has(key(c))) { if (run.length) out.push(run); run = []; }
        else run.push(c);
      }
      if (run.length) out.push(run);
    }
    return out;
  };

  // The cubes strictly between two cells that share a line, or nothing at all
  // if they do not: a U-turn walks through them, a jump has none to walk.
  const between = (a: Cell, b: Cell): Cell[] => {
    const d = sub(b, a);
    const axes = [d[0], d[1], d[2]].filter((v) => v !== 0);
    if (axes.length !== 1) return [];
    const step: Cell = [Math.sign(d[0]), Math.sign(d[1]), Math.sign(d[2])];
    const out: Cell[] = [];
    for (let c = add(a, step); key(c) !== key(b); c = add(c, step)) out.push(c);
    return out;
  };

  // Open on the longest line there is.
  const opening = stretches().sort((x, y) => y.length - x.length || before(x[0], y[0]))[0];
  for (const c of opening) emit(c);
  let lineCount = 1;

  for (;;) {
    const segs = stretches();
    if (!segs.length) break;
    const here = route[route.length - 1];
    // Measured to whichever END of the candidate the snake would enter by:
    // entering a stretch anywhere but an end would strand the rest of it
    // behind the module that just walked past it.
    const reach = (l: Cell[]) => Math.min(manhattan(here, l[0]), manhattan(here, l[l.length - 1]));
    let pick = segs[0];
    let pickScore = -Infinity;
    for (const l of segs) {
      // A turn of exactly U_TURN_PITCH is free; anything else is charged what
      // it costs to get there, so the snake reaches over one line rather than
      // into it, and comes back for the one it stepped over.
      const d = reach(l);
      const turnCost = d === U_TURN_PITCH ? 0 : d;
      const score = l.length * W_LINE_LENGTH - turnCost * W_ADJACENT_LINE;
      if (score > pickScore || (score === pickScore && before(l[0], pick[0]) < 0)) {
        pickScore = score;
        pick = l;
      }
    }
    const forward = manhattan(here, pick[0]) <= manhattan(here, pick[pick.length - 1]);
    const entry = forward ? pick[0] : pick[pick.length - 1];
    // Walk the U-turn itself, so the route stays a real walk of single steps
    // and the cube it crosses over is covered in its proper place rather than
    // left as a hole for the fill to come back to out of order.
    for (const c of between(here, entry)) if (occ.has(key(c)) && !visited.has(key(c))) emit(c);
    for (const c of (forward ? pick : pick.slice().reverse())) emit(c);
    lineCount++;
  }

  return { cells: route, axis, lines: lineCount };
}

/**
 * Route one solid patch by walking STRAIGHT until something stops you, then
 * turning ninety degrees — which on a rectangle is a spiral, and on anything
 * else is the nearest thing to one that fits.
 *
 * WHY A SPIRAL AND NOT THE SNAKE NISCHAY ASKED FOR. The snake is the better
 * shape and it is what the rule says; it is also, at one line's pitch, not
 * something this module can be bent into. Every reversal into the neighbouring
 * line brings connector A within 0.715 cubes of the module's own UP side dome
 * against the 0.887 two domes need — see uTurnCatalogue in fitModules.ts,
 * which measures it. Reversing at TWO lines' pitch is clean, but then the line
 * stepped over ends up with built courses on both sides of it and nothing
 * welded can ever get back into it: a wall came out with a whole course
 * missing down its middle.
 *
 * A spiral never reverses. Every turn in it is ninety degrees, which is the
 * one turn this module is unambiguously good at (rule 2's corner catalogue),
 * and it still lays long straight courses — it just comes back around the
 * outside instead of doubling back through the middle. Same rope, wound
 * rather than folded.
 *
 * The walk starts at a corner of the patch heading along its longest axis, so
 * the opening move is still the longest line available, and prefers to keep
 * going straight, which is rule 7 doing the steering at every single step.
 */
export function spiralOne(cells: Cell[], axis: Cell): SerpentineRoute | null {
  if (!cells.length) return null;
  const occ = new Set(cells.map(key));
  const visited = new Set<CellKey>();
  const route: Cell[] = [];
  const emit = (c: Cell) => { route.push(c); visited.add(key(c)); };
  const free = (c: Cell) => occ.has(key(c)) && !visited.has(key(c));

  // The axis the patch is THINNEST along is the one it stacks in: a wall
  // spirals in its own face and never leaves it, a block spirals a layer at a
  // time and steps through. Ties go to the last axis, so a flat patch in the
  // XY plane stacks along Z as one would draw it.
  const span = (a: Cell) => {
    let lo = Infinity, hi = -Infinity;
    for (const c of cells) {
      const v = c[0] * a[0] + c[1] * a[1] + c[2] * a[2];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    return hi - lo;
  };
  let up: Cell = AXES[2];
  for (const a of AXES) if (!eq(a, axis) && !eq(a, neg(axis)) && span(a) <= span(up)) up = a;

  // Handedness is the whole trick. Going straight while you can and ALWAYS
  // turning the same way when you cannot is what winds a rectangle inward
  // instead of folding it back on itself — and folding back on itself is the
  // one thing this module cannot be built into.
  const left = (d: Cell) => cross(up, d);
  const right = (d: Cell) => cross(d, up);

  // A true corner, compared as NUMBERS — comparing the cube keys as strings
  // put the start in the middle of an edge ("-1,0,0" sorts before "-3,0,0"),
  // and a spiral that opens mid-edge has to come back for the stub it left.
  const along = (c: Cell, a: Cell) => c[0] * a[0] + c[1] * a[1] + c[2] * a[2];
  const others = AXES.filter((a) => !eq(a, axis));
  let cur = cells.slice().sort((x, y) =>
    (along(x, axis) - along(y, axis))
    || (along(x, others[0]) - along(y, others[0]))
    || (along(x, others[1]) - along(y, others[1])))[0];
  let dir = axis;
  emit(cur);
  let turned = 0;

  for (;;) {
    if (free(add(cur, dir))) { cur = add(cur, dir); emit(cur); continue; }
    // Blocked: turn, same way every time. The other way, and then the layer
    // above, are only there so an awkward patch still gets finished.
    const opened = [left(dir), right(dir), up, neg(up)].find((t) => free(add(cur, t)));
    if (opened) { dir = opened; cur = add(cur, dir); emit(cur); turned++; continue; }
    // Boxed in. Jump to the nearest cube still wanting cover and carry on —
    // the fit reads a jump as a break and starts a fresh run there.
    let next: Cell | null = null;
    let bestD = Infinity;
    for (const c of cells) {
      if (visited.has(key(c))) continue;
      const d = manhattan(cur, c);
      if (d < bestD || (d === bestD && next && before(c, next) < 0)) { bestD = d; next = c; }
    }
    if (!next) break;
    cur = next;
    dir = axis;
    emit(cur);
    turned++;
  }
  return { cells: route, axis, lines: turned + 1 };
}

/**
 * Which way a solid patch gets filled.
 *
 * 'snake' is Nischay's rule as he stated it: fill a line, U-turn into the next.
 * 'spiral' is the same idea wound rather than folded, and it is the default
 * because the module cannot make the U-turn — see spiralOne for the
 * measurement. Both are live and this is the switch between them; on a wall
 * they measure 24 of 24 cubes in one piece against 19.
 */
export type FillPattern = 'snake' | 'spiral';
export const FILL_PATTERN: FillPattern = 'spiral';

/**
 * Does this route ever turn ROUND — leave along the reverse of the way it came
 * in, across a gap short enough that one module has to do the folding?
 *
 * Not as simple as "two opposite steps in a row", which was the first thing
 * tried and was wrong: a U-turn at two lines' pitch goes forward, across for
 * two, and back, so no two CONSECUTIVE steps are ever opposites even though
 * the module plainly has to double back. The signature is a run, a short run
 * across, and a run the other way — and "short" is U_TURN_PITCH, because a
 * wider crossing is just two ordinary corners with a stretch between them that
 * a second module can lie along.
 *
 * This is what decides whether the fit bothers solving the U-turn catalogue,
 * so getting it wrong is not free: it read every spiral as turn-free, and the
 * inner rings of a spiral — where a leftover strip is only two lines tall — are
 * exactly where a fill still needs to fold.
 */
export function routeReverses(route: SerpentineRoute): boolean {
  // Per SEGMENT, because a jump is not a turn: the route simply starts again
  // somewhere else, and the run before the jump has nothing to do with the run
  // after it. Checking a single flattened list of runs instead — and clearing
  // it at each jump, as this first did — quietly threw away every turn before
  // the last jump, which on a snake is all of them.
  const runs: { d: Cell; n: number }[] = [];
  const turnsRound = () => {
    for (let i = 1; i < runs.length; i++) {
      if (eq(runs[i].d, neg(runs[i - 1].d))) return true;
      if (i >= 2 && eq(runs[i].d, neg(runs[i - 2].d)) && runs[i - 1].n <= U_TURN_PITCH) return true;
    }
    return false;
  };

  for (let i = 1; i < route.cells.length; i++) {
    const d = sub(route.cells[i], route.cells[i - 1]);
    if (Math.abs(d[0]) + Math.abs(d[1]) + Math.abs(d[2]) !== 1) {
      if (turnsRound()) return true;
      runs.length = 0;
      continue;
    }
    const last = runs[runs.length - 1];
    if (last && eq(last.d, d)) last.n++;
    else runs.push({ d, n: 1 });
  }
  return turnsRound();
}

/** Route every solid patch of a shape, largest patch first. */
export function serpentineRoutes(cells: Cell[]): SerpentineRoute[] {
  return denseComponents(cells)
    .sort((a, b) => b.length - a.length || before(a[0], b[0]))
    .map((patch) => (FILL_PATTERN === 'snake'
      ? routeOne(patch)
      : spiralOne(patch, fillAxis(patch))))
    .filter((r): r is SerpentineRoute => r !== null);
}

const isUnitStep = (d: Cell) => Math.abs(d[0]) + Math.abs(d[1]) + Math.abs(d[2]) === 1;

/**
 * The features a route implies: a CORNER wherever it turns, a TIP at each end.
 *
 * This is the whole integration. Rather than teach the fitter a second way to
 * place modules, the route is handed to it in the one vocabulary it already
 * speaks — features — so every rule keeps applying unchanged: rule 2 puts a
 * real bend joint on each U-turn cube, rule 7 lays straight modules along the
 * lines between them, rule 8 keeps the result welded, and the corner catalogue
 * and its run-parity check work exactly as they do on a limb.
 *
 * PRIORITY DESCENDS ALONG THE ROUTE, which is what makes the fill happen in
 * ORDER rather than all over the patch at once. Everything here sits in
 * BAND_FILL — below every corner the diagram itself draws, above a loose end —
 * and within that band the earlier turn outranks the later one, so the snake
 * gets built from its head rather than from wherever the fit happened to be.
 */
export function routeFeatures(routes: SerpentineRoute[], occ: Set<CellKey>): ShapeFeature[] {
  const out: ShapeFeature[] = [];
  for (const route of routes) {
    const r = route.cells;
    const n = r.length;
    for (let i = 0; i < n; i++) {
      const dIn = i > 0 ? sub(r[i], r[i - 1]) : null;
      const dOut = i < n - 1 ? sub(r[i + 1], r[i]) : null;

      // A TURN: the route arrives one way and leaves another. Both steps have
      // to be single lattice steps — a route that JUMPS (a patch with a hole
      // in it, where the next line is not touching) is not turning there, it
      // is starting again, and calling that a corner would ask a module to
      // bend around a cube the shape does not bend at.
      if (dIn && dOut && isUnitStep(dIn) && isUnitStep(dOut) && !eq(dIn, dOut)) {
        out.push({
          kind: 'corner',
          cell: r[i],
          arms: [neg(dIn), dOut],
          degree: 2,
          throughAxes: [],
          armLengths: [1, 1],
          priority: BAND_FILL + (n - i),
          fill: true,
        });
        continue;
      }

      // The head and tail of the route, and either side of a jump, are where a
      // chain can start or finish — the same thing a limb's tip is.
      const startsHere = !dIn || !isUnitStep(dIn);
      const endsHere = !dOut || !isUnitStep(dOut);
      if (startsHere || endsHere) {
        const arms = armsOf(r[i], occ);
        out.push({
          kind: 'tip',
          cell: r[i],
          arms,
          degree: arms.length,
          throughAxes: [],
          armLengths: arms.map(() => 1),
          priority: BAND_FILL + (n - i),
          fill: true,
        });
      }
    }
  }
  return out;
}

/**
 * A skeleton with the fill routes folded in — the one entry point fitModules
 * needs.
 *
 * A shape with no solid patch comes back untouched, so nothing limb-shaped
 * changes behaviour at all. Where a patch DOES exist, its route contributes
 * the corners and tips the patch was previously unable to offer, and the
 * feature list is re-ranked as a whole so the fill takes its place in the same
 * rule-6 ordering as everything else rather than running as a separate pass.
 *
 * A cube that already carries a real feature keeps it. The route may want to
 * turn on a cube that the SILHOUETTE also turns on, and in that case the
 * silhouette's reading is the one that matters — the diagram's own outline is
 * what the build is judged against, and a fill corner that quietly overwrote
 * it could turn the module the other way and change what the shape looks like.
 */
export function withRouteFeatures(skeleton: ShapeSkeleton, cells: Cell[]): ShapeSkeleton {
  const routes = serpentineRoutes(cells);
  if (!routes.length) return skeleton;

  const occ = new Set(cells.map(key));
  const taken = new Set(skeleton.features.map((f) => key(f.cell)));
  const added = routeFeatures(routes, occ).filter((f) => !taken.has(key(f.cell)));
  if (!added.length) return skeleton;

  const features = [...skeleton.features, ...added]
    .sort((a, b) => (b.priority - a.priority) || (key(a.cell) < key(b.cell) ? -1 : 1));
  const corners = new Set(skeleton.corners);
  for (const f of added) if (f.kind === 'corner') corners.add(key(f.cell));

  return { ...skeleton, features, corners };
}
