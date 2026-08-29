/**
 * textToShape.ts — the offline half of "text to structure".
 *
 * Rule-based, deterministic, no network, no model. It exists for three reasons:
 *  - it is the fallback when Ollama is not running and no API key is set,
 *  - it is the A/B baseline that tells you whether the LLM is actually adding
 *    anything over keyword matching (often, for this task, it is not), and
 *  - it is instant, which matters when you are iterating on shapes.
 *
 * It parses three things out of a sentence: WHICH shape, HOW BIG, and HOW MANY
 * modules. Anything it cannot parse falls back to the caller's current module
 * count, so a bare "car" still does the right thing.
 */
import { type Cell } from './lattice';
import { SHAPES, type ShapeId, buildShape } from './shapes';

export interface TextParse {
  shape: ShapeId | null;
  /** explicit module count if the text named one */
  count: number | null;
  scale: number;
  /** which words drove the decision — shown in the UI so the match is auditable */
  matched: string[];
  confidence: number;
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50,
};

const BIGGER = ['big', 'large', 'huge', 'giant', 'tall', 'long', 'wide', 'massive', 'bigger'];
const SMALLER = ['small', 'tiny', 'little', 'mini', 'short', 'compact', 'smaller'];

/** Parse a free-text request into shape + size hints. */
export function parseText(text: string): TextParse {
  const t = text.toLowerCase();
  const matched: string[] = [];

  // Shape: score every definition by how many of its keywords appear, preferring
  // longer keywords so "four legs" beats a stray "four".
  let best: ShapeId | null = null;
  let bestScore = 0;
  for (const def of SHAPES) {
    let score = 0;
    const hits: string[] = [];
    for (const kw of def.keywords) {
      const re = new RegExp(`\\b${kw.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (re.test(t)) { score += kw.length; hits.push(kw); }
    }
    if (score > bestScore) { bestScore = score; best = def.id; matched.length = 0; matched.push(...hits); }
  }

  // Count: "with 24 modules", "24 modules", "use 30".
  let count: number | null = null;
  const numeric = t.match(/(\d+)\s*(modules?|cubes?|cells?|blocks?|parts?|units?)?/);
  if (numeric) {
    const n = parseInt(numeric[1], 10);
    // A bare number with no unit is only trusted if it is a plausible budget —
    // otherwise "chair 4" would be read as a 4-module chair rather than noise.
    if (numeric[2] || (n >= 4 && n <= 400)) { count = n; matched.push(numeric[0].trim()); }
  } else {
    for (const [w, n] of Object.entries(NUMBER_WORDS)) {
      if (new RegExp(`\\b${w}\\s+(modules?|cubes?|cells?|blocks?)\\b`).test(t)) {
        count = n; matched.push(w); break;
      }
    }
  }

  // Scale: adjectives nudge the generator, stacking so "very big" > "big".
  let scale = 1;
  for (const w of BIGGER) if (new RegExp(`\\b${w}\\b`).test(t)) { scale *= 1.4; matched.push(w); }
  for (const w of SMALLER) if (new RegExp(`\\b${w}\\b`).test(t)) { scale *= 0.7; matched.push(w); }
  if (/\bvery\b|\breally\b/.test(t)) scale = scale > 1 ? scale * 1.2 : scale * 0.85;
  scale = Math.max(0.4, Math.min(4, scale));

  return {
    shape: best,
    count,
    scale,
    matched: [...new Set(matched)],
    confidence: best ? Math.min(1, bestScore / 8) : 0,
  };
}

export interface TextShapeResult {
  cells: Cell[];
  shape: ShapeId | null;
  parse: TextParse;
  source: 'rules';
  note: string;
}

/**
 * Text to a concrete cell set. `fallbackCount` is the current module budget —
 * used whenever the text does not name one, so the result is always something
 * the existing modules can actually form.
 */
export function textToShape(text: string, fallbackCount: number): TextShapeResult {
  const parse = parseText(text);
  const count = Math.max(1, parse.count ?? fallbackCount);
  if (!parse.shape) {
    return {
      cells: [], shape: null, parse, source: 'rules',
      note: `no shape keyword recognised in "${text}". Try one of: ${SHAPES.map((s) => s.label).join(', ')}.`,
    };
  }
  const cells = buildShape(parse.shape, count, parse.scale);
  const note = parse.count && parse.count !== fallbackCount
    ? `matched "${parse.matched.join('", "')}" — target asks for ${count} modules, you have ${fallbackCount}`
    : `matched "${parse.matched.join('", "')}"`;
  return { cells, shape: parse.shape, parse, source: 'rules', note };
}
