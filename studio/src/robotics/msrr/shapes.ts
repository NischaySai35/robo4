/**
 * shapes.ts — the target shape library.
 *
 * Every generator returns bare lattice cells, ground-centred (resting on y = 0,
 * centred on X/Z). They are deliberately coarse: at 20-40 modules a "car" is a
 * silhouette, not a model. What matters is that each shape is CONNECTED and
 * RECOGNISABLE, because those are the two properties the planner and the user
 * respectively need from it.
 *
 * Shapes are parameterised by a size hint rather than fixed, so "small car" and
 * "big car" are the same generator. The caller then calls lattice.fitToCount() to
 * force the result to the exact module budget — reconfiguration requires equal
 * counts on both ends, and it is far better to shave a target down than to refuse.
 */
import { type Cell, groundCenter, fitToCount, key } from './lattice';

export type ShapeId =
  | 'car' | 'chair' | 'table' | 'tower' | 'bridge' | 'wall'
  | 'snake' | 'quadruped' | 'humanoid' | 'arm' | 'ring' | 'cross'
  | 'pyramid' | 'box' | 'plane' | 'ball' | 'stairs' | 'blob';

export interface ShapeDef {
  id: ShapeId;
  label: string;
  /** words that should select this shape from free text */
  keywords: string[];
  /** natural module count at scale 1 — used to suggest a budget */
  build: (scale: number) => Cell[];
}

const uniq = (cells: Cell[]): Cell[] => {
  const seen = new Set<string>();
  const out: Cell[] = [];
  for (const c of cells) {
    const k = key(c);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
};

/** Inclusive integer range, tolerant of reversed bounds. */
const range = (a: number, b: number) => {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const out: number[] = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
};

const box = (w: number, h: number, d: number, at: Cell = [0, 0, 0]): Cell[] => {
  const out: Cell[] = [];
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) {
    out.push([at[0] + x, at[1] + y, at[2] + z]);
  }
  return out;
};

const column = (at: Cell, h: number): Cell[] =>
  range(0, h - 1).map((i) => [at[0], at[1] + i, at[2]] as Cell);

const s = (scale: number, n: number) => Math.max(1, Math.round(n * scale));

// ── generators ────────────────────────────────────────────────────────────────

/**
 * Car: a flat chassis slab, a cabin block set back on it, and four wheel cells at
 * the corners of the lower layer. The wheels are part of the same lattice — a
 * module IS the wheel, which is exactly the point of a self-reconfiguring robot.
 */
const car = (scale: number): Cell[] => {
  const L = s(scale, 5), W = s(scale, 3);
  const out: Cell[] = [];
  // chassis on layer 1 so the wheels can sit on layer 0 beneath it
  out.push(...box(L, 1, W, [0, 1, 0]));
  // cabin, set back from the nose
  const cabLen = Math.max(1, Math.floor(L / 2));
  out.push(...box(cabLen, 1, W, [L - cabLen - (L > 3 ? 1 : 0), 2, 0]));
  // wheels at the four lower corners
  out.push([0, 0, 0], [0, 0, W - 1], [L - 1, 0, 0], [L - 1, 0, W - 1]);
  return groundCenter(uniq(out));
};

/** Chair: seat slab, a back wall behind it, four legs under the seat corners. */
const chair = (scale: number): Cell[] => {
  const W = s(scale, 3), D = s(scale, 3), legH = s(scale, 2), backH = s(scale, 3);
  const out: Cell[] = [];
  out.push(...box(W, 1, D, [0, legH, 0]));                       // seat
  out.push(...box(W, backH, 1, [0, legH + 1, D - 1]));           // backrest
  for (const [x, z] of [[0, 0], [W - 1, 0], [0, D - 1], [W - 1, D - 1]]) {
    out.push(...column([x, 0, z], legH));                        // legs
  }
  return groundCenter(uniq(out));
};

/** Table: a top slab on four corner legs. The classic "can it stand" test case. */
const table = (scale: number): Cell[] => {
  const W = s(scale, 4), D = s(scale, 3), legH = s(scale, 2);
  const out: Cell[] = [...box(W, 1, D, [0, legH, 0])];
  for (const [x, z] of [[0, 0], [W - 1, 0], [0, D - 1], [W - 1, D - 1]]) {
    out.push(...column([x, 0, z], legH));
  }
  return groundCenter(uniq(out));
};

/** Tower: a 2x2 column. Deliberately narrow — a good stability-gate stress test. */
const tower = (scale: number): Cell[] =>
  groundCenter(uniq(box(2, s(scale, 8), 2)));

/** Bridge: two piers and a deck spanning between them. */
const bridge = (scale: number): Cell[] => {
  const span = s(scale, 7), h = s(scale, 3);
  const out: Cell[] = [];
  out.push(...range(0, span - 1).map((x) => [x, h, 0] as Cell));
  out.push(...column([0, 0, 0], h));
  out.push(...column([span - 1, 0, 0], h));
  return groundCenter(uniq(out));
};

const wall = (scale: number): Cell[] =>
  groundCenter(uniq(box(s(scale, 6), s(scale, 4), 1)));

/** Snake: a single unbranched serpentine chain — never self-collides, by construction. */
const snake = (scale: number): Cell[] => {
  const len = s(scale, 5), rows = s(scale, 3);
  const out: Cell[] = [];
  for (let r = 0; r < rows; r++) {
    const xs = r % 2 === 0 ? range(0, len - 1) : range(len - 1, 0).reverse();
    for (const x of xs) out.push([x, 0, r]);
  }
  return groundCenter(uniq(out));
};

/** Quadruped: a body slab on four legs, with a head stub at the front. */
const quadruped = (scale: number): Cell[] => {
  const L = s(scale, 4), W = s(scale, 2), legH = s(scale, 2);
  const out: Cell[] = [...box(L, 1, W, [0, legH, 0])];
  for (const [x, z] of [[0, 0], [L - 1, 0], [0, W - 1], [L - 1, W - 1]]) {
    out.push(...column([x, 0, z], legH));
  }
  out.push([L - 1, legH + 1, Math.floor(W / 2)]); // head
  return groundCenter(uniq(out));
};

/** Humanoid: legs, torso, two arms, head. Branch-heavy on purpose. */
const humanoid = (scale: number): Cell[] => {
  const legH = s(scale, 2), torsoH = s(scale, 3), armLen = s(scale, 2);
  const out: Cell[] = [];
  out.push(...column([0, 0, 0], legH));
  out.push(...column([2, 0, 0], legH));
  out.push(...range(0, 2).map((x) => [x, legH, 0] as Cell));      // hips
  out.push(...column([1, legH, 0], torsoH));                      // torso
  const shoulder = legH + torsoH - 1;
  for (let a = 1; a <= armLen; a++) { out.push([1 - a, shoulder, 0], [1 + a, shoulder, 0]); }
  out.push([1, legH + torsoH, 0]);                                // head
  return groundCenter(uniq(out));
};

/** Arm: an upright base with a horizontal reach — the manipulator posture. */
const arm = (scale: number): Cell[] => {
  const baseH = s(scale, 3), reach = s(scale, 4);
  const out: Cell[] = [...column([0, 0, 0], baseH)];
  out.push(...range(1, reach).map((x) => [x, baseH - 1, 0] as Cell));
  out.push([reach, baseH - 2, 0]); // wrist bend
  return groundCenter(uniq(out));
};

/** Ring: a closed loop standing upright — the loop-closure case. */
const ring = (scale: number): Cell[] => {
  const w = s(scale, 4), h = s(scale, 4);
  const out: Cell[] = [];
  for (const x of range(0, w - 1)) out.push([x, 0, 0], [x, h - 1, 0]);
  for (const y of range(1, h - 2)) out.push([0, y, 0], [w - 1, y, 0]);
  return groundCenter(uniq(out));
};

const cross = (scale: number): Cell[] => {
  const a = s(scale, 3);
  const out: Cell[] = [[0, a, 0]];
  for (const i of range(1, a)) out.push([i, a, 0], [-i, a, 0], [0, a - i, 0], [0, a + i, 0], [0, a, i], [0, a, -i]);
  return groundCenter(uniq(out));
};

const pyramid = (scale: number): Cell[] => {
  const base = s(scale, 4);
  const out: Cell[] = [];
  for (let y = 0; y < base; y++) {
    const w = base - y;
    out.push(...box(w, 1, w, [y, y, y]));
  }
  return groundCenter(uniq(out));
};

const solidBox = (scale: number): Cell[] =>
  groundCenter(uniq(box(s(scale, 3), s(scale, 3), s(scale, 3))));

/** Plane: a fuselage line with a wing span crossing it and a tail fin. */
const plane = (scale: number): Cell[] => {
  const L = s(scale, 6), span = s(scale, 2);
  const out: Cell[] = range(0, L - 1).map((x) => [x, 0, 0] as Cell);
  const wingX = Math.floor(L / 2);
  for (const i of range(1, span)) out.push([wingX, 0, i], [wingX, 0, -i]);
  out.push([0, 1, 0]); // tail fin
  return groundCenter(uniq(out));
};

/** Ball: cells inside a sphere of the given radius — the densest branch case. */
const ball = (scale: number): Cell[] => {
  const r = s(scale, 2);
  const out: Cell[] = [];
  for (const x of range(-r, r)) for (const y of range(-r, r)) for (const z of range(-r, r)) {
    if (x * x + y * y + z * z <= r * r) out.push([x, y, z]);
  }
  return groundCenter(uniq(out));
};

const stairs = (scale: number): Cell[] => {
  const steps = s(scale, 4), w = s(scale, 2);
  const out: Cell[] = [];
  for (let i = 0; i < steps; i++) out.push(...box(1, i + 1, w, [i, 0, 0]));
  return groundCenter(uniq(out));
};

/** Blob: a deterministic pseudo-random connected clump — a chaos test case. */
const blob = (scale: number): Cell[] => {
  const n = s(scale, 18);
  const out: Cell[] = [[0, 0, 0]];
  const seen = new Set([key([0, 0, 0])]);
  let seed = 1337;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const dirs: Cell[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1]];
  while (out.length < n) {
    const base = out[Math.floor(rnd() * out.length)];
    const d = dirs[Math.floor(rnd() * dirs.length)];
    const c: Cell = [base[0] + d[0], base[1] + d[1], base[2] + d[2]];
    if (c[1] < 0 || seen.has(key(c))) continue;
    seen.add(key(c));
    out.push(c);
  }
  return groundCenter(out);
};

// ── registry ──────────────────────────────────────────────────────────────────

export const SHAPES: ShapeDef[] = [
  { id: 'car', label: 'Car', keywords: ['car', 'vehicle', 'automobile', 'truck', 'buggy', 'rover', 'drive'], build: car },
  { id: 'chair', label: 'Chair', keywords: ['chair', 'seat', 'stool', 'sit'], build: chair },
  { id: 'table', label: 'Table', keywords: ['table', 'desk', 'bench', 'platform'], build: table },
  { id: 'tower', label: 'Tower', keywords: ['tower', 'column', 'pillar', 'mast', 'tall'], build: tower },
  { id: 'bridge', label: 'Bridge', keywords: ['bridge', 'span', 'gantry', 'arch'], build: bridge },
  { id: 'wall', label: 'Wall', keywords: ['wall', 'barrier', 'panel', 'screen', 'fence'], build: wall },
  { id: 'snake', label: 'Snake', keywords: ['snake', 'worm', 'chain', 'serpent', 'crawler'], build: snake },
  { id: 'quadruped', label: 'Quadruped', keywords: ['dog', 'quadruped', 'animal', 'horse', 'walker', 'four legs', 'cat'], build: quadruped },
  { id: 'humanoid', label: 'Humanoid', keywords: ['humanoid', 'human', 'person', 'man', 'robot body', 'biped'], build: humanoid },
  { id: 'arm', label: 'Arm', keywords: ['arm', 'manipulator', 'crane', 'reach', 'gripper'], build: arm },
  { id: 'ring', label: 'Ring', keywords: ['ring', 'loop', 'circle', 'hoop', 'wheel', 'closed'], build: ring },
  { id: 'cross', label: 'Cross', keywords: ['cross', 'star', 'plus', 'x shape'], build: cross },
  { id: 'pyramid', label: 'Pyramid', keywords: ['pyramid', 'cone', 'triangle', 'ziggurat'], build: pyramid },
  { id: 'box', label: 'Cube', keywords: ['cube', 'box', 'block', 'brick', 'solid'], build: solidBox },
  { id: 'plane', label: 'Plane', keywords: ['plane', 'aircraft', 'jet', 'aeroplane', 'airplane', 'wing', 'drone'], build: plane },
  { id: 'ball', label: 'Ball', keywords: ['ball', 'sphere', 'globe', 'round'], build: ball },
  { id: 'stairs', label: 'Stairs', keywords: ['stairs', 'steps', 'staircase', 'ramp'], build: stairs },
  { id: 'blob', label: 'Blob', keywords: ['blob', 'random', 'clump', 'mess', 'pile'], build: blob },
];

export const shapeById = (id: ShapeId): ShapeDef | undefined => SHAPES.find((x) => x.id === id);

/** Build a shape and force it to exactly `count` modules. */
export function buildShape(id: ShapeId, count: number, scale = 1): Cell[] {
  const def = shapeById(id);
  if (!def) return fitToCount([], count);
  // Grow the scale until the raw shape is at least the requested budget, so
  // fitToCount is trimming a full shape rather than inflating a stub — trimming
  // preserves silhouette far better than growing does.
  let cells = def.build(scale);
  let guard = 0;
  while (cells.length < count && guard++ < 8) {
    scale *= 1.35;
    cells = def.build(scale);
  }
  return groundCenter(fitToCount(cells, count));
}

/** The count a shape naturally wants at scale 1 — a good default budget. */
export const naturalCount = (id: ShapeId, scale = 1): number =>
  (shapeById(id)?.build(scale).length ?? 0);
