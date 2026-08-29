/**
 * aiShape.ts — the LLM half of "text to structure". L4 in the roadmap's stack.
 *
 * THE DIVISION OF LABOUR, WHICH IS THE WHOLE POINT
 * The model is asked for ONE thing: which cells the target shape occupies. It is
 * never asked how to get there. Reconfiguration is planner.ts's job, because a
 * plan must be certified connected and collision-free and a language model cannot
 * certify anything. "LLM proposes, solver disposes."
 *
 * Even the proposal is not trusted blindly. Whatever comes back is validated —
 * integers, deduplicated, face-connected, resized to the module budget, grounded.
 * A model that returns a floating pile of disconnected cubes gets its answer
 * repaired into the nearest legal structure, and the UI is told that happened.
 *
 * Backends, most local first (same order and same bridge as features/ai/aiClient):
 *   1. Ollama on this machine — offline, no key, no data leaves the desktop
 *   2. Anthropic API — only when a key is configured in the desktop shell
 *   3. the rule-based parser in textToShape.ts — always available
 */
import { type Cell, key, DIRS_6, add, groundCenter, fitToCount, configFromCells, isConnected } from './lattice';
import { SHAPES } from './shapes';
import { textToShape } from './textToShape';

export type AiBackend = 'auto' | 'ollama' | 'anthropic' | 'rules';

export interface AiShapeResult {
  cells: Cell[];
  source: 'ollama' | 'anthropic' | 'rules';
  /** what the model literally said, kept for debugging bad outputs */
  raw: string;
  note: string;
  /** true when the model's answer needed repair to become a legal structure */
  repaired: boolean;
}

// ── prompt ────────────────────────────────────────────────────────────────────

function systemPrompt(count: number): string {
  return [
    'You design shapes for a modular self-reconfigurable robot.',
    `The robot is exactly ${count} identical cube modules on an integer 3D lattice.`,
    'Modules connect face to face. Y is up. The structure must rest on y = 0.',
    '',
    'Reply with ONLY a JSON object, no prose, no markdown fence:',
    '{"name":"<short name>","cells":[[x,y,z], ...]}',
    '',
    'Rules:',
    `- exactly ${count} cells, all integer coordinates`,
    '- every cell must share a FACE with at least one other cell (no diagonal-only contact)',
    '- the whole set must be one connected piece',
    '- at least one cell must have y = 0',
    '- keep it recognisable at this resolution: a silhouette, not a detailed model',
  ].join('\n');
}

function userPrompt(text: string, count: number): string {
  return `Build: ${text}\nUse exactly ${count} modules. JSON only.`;
}

// ── parsing + validation ──────────────────────────────────────────────────────

/** Pull the first JSON object out of a reply that may be wrapped in prose or fences. */
function extractJson(raw: string): any | null {
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf('{');
  if (start < 0) return null;
  // Scan for the matching brace rather than regexing — nested objects are legal.
  let depth = 0;
  for (let i = start; i < body.length; i++) {
    if (body[i] === '{') depth++;
    else if (body[i] === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(body.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

/**
 * Keep only the largest face-connected component, then pull any stragglers in.
 * Models routinely emit a shape that is 90% right with two cubes floating beside
 * it; discarding the whole answer for that would waste a good proposal.
 */
function largestComponent(cells: Cell[]): Cell[] {
  const occ = new Set(cells.map(key));
  const seen = new Set<string>();
  let best: Cell[] = [];
  for (const c of cells) {
    const k0 = key(c);
    if (seen.has(k0)) continue;
    const comp: Cell[] = [];
    const stack = [c];
    seen.add(k0);
    while (stack.length) {
      const cur = stack.pop() as Cell;
      comp.push(cur);
      for (const d of DIRS_6) {
        const n = add(cur, d);
        const nk = key(n);
        if (occ.has(nk) && !seen.has(nk)) { seen.add(nk); stack.push(n); }
      }
    }
    if (comp.length > best.length) best = comp;
  }
  return best;
}

export interface Validation { cells: Cell[]; repaired: boolean; notes: string[] }

/** Turn whatever the model said into a legal structure of exactly `count` cells. */
export function validateCells(input: unknown, count: number): Validation {
  const notes: string[] = [];
  let repaired = false;

  if (!Array.isArray(input)) return { cells: [], repaired: false, notes: ['no cell array in the reply'] };

  // Coerce to integer triples, dropping anything malformed.
  const raw: Cell[] = [];
  for (const item of input) {
    if (!Array.isArray(item) || item.length < 3) continue;
    const [x, y, z] = item;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') continue;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    raw.push([Math.round(x), Math.round(y), Math.round(z)]);
  }
  if (raw.length !== (input as unknown[]).length) { repaired = true; notes.push('dropped malformed cells'); }
  if (!raw.length) return { cells: [], repaired: true, notes: ['reply contained no usable cells'] };

  // Dedupe.
  const seen = new Set<string>();
  let cells: Cell[] = [];
  for (const c of raw) { const k = key(c); if (!seen.has(k)) { seen.add(k); cells.push(c); } }
  if (cells.length !== raw.length) { repaired = true; notes.push('removed duplicate cells'); }

  // Connectivity.
  if (!isConnected(configFromCells(cells))) {
    const comp = largestComponent(cells);
    notes.push(`reply was disconnected — kept the largest piece (${comp.length} of ${cells.length} cells)`);
    cells = comp;
    repaired = true;
  }

  // Exact module budget.
  if (cells.length !== count) {
    notes.push(`resized from ${cells.length} to ${count} modules`);
    cells = fitToCount(cells, count);
    repaired = true;
  }

  // Ground it and centre it.
  cells = groundCenter(cells);
  return { cells, repaired, notes };
}

// ── backends ──────────────────────────────────────────────────────────────────

async function tryOllama(text: string, count: number): Promise<{ raw: string } | null> {
  const ask = window.tetrobot?.askOllama;
  if (!ask) return null;
  try {
    const res = await ask({ system: systemPrompt(count), prompt: userPrompt(text, count) });
    if (res?.ok && res.text) return { raw: String(res.text) };
  } catch { /* fall through to the next backend */ }
  return null;
}

async function tryAnthropic(text: string, count: number): Promise<{ raw: string } | null> {
  const ask = window.tetrobot?.askAnthropic;
  if (!ask) return null;
  try {
    const res = await ask({ system: systemPrompt(count), prompt: userPrompt(text, count) });
    if (res?.ok && res.text) return { raw: String(res.text) };
  } catch { /* fall through to the next backend */ }
  return null;
}

/** Which backends this build can actually reach right now, for the UI to show. */
export function availableBackends(): { ollama: boolean; anthropic: boolean } {
  return {
    ollama: !!window.tetrobot?.askOllama,
    anthropic: !!window.tetrobot?.askAnthropic,
  };
}

// ── entry point ───────────────────────────────────────────────────────────────

/**
 * Ask for a target shape. Always returns something usable: if every model route
 * fails or returns junk, the rule-based parser answers instead.
 */
export async function requestShape(
  text: string,
  count: number,
  backend: AiBackend = 'auto',
): Promise<AiShapeResult> {
  const order: ('ollama' | 'anthropic')[] =
    backend === 'ollama' ? ['ollama']
    : backend === 'anthropic' ? ['anthropic']
    : backend === 'rules' ? []
    : ['ollama', 'anthropic'];

  for (const b of order) {
    const res = b === 'ollama' ? await tryOllama(text, count) : await tryAnthropic(text, count);
    if (!res) continue;
    const json = extractJson(res.raw);
    if (!json) continue;
    const v = validateCells(json.cells, count);
    if (!v.cells.length) continue;
    const name = typeof json.name === 'string' ? json.name : text;
    return {
      cells: v.cells,
      source: b,
      raw: res.raw,
      repaired: v.repaired,
      note: [`${b}: "${name}"`, ...v.notes].join(' · '),
    };
  }

  const fb = textToShape(text, count);
  if (!fb.cells.length) {
    return {
      cells: [], source: 'rules', raw: '', repaired: false,
      note: backend === 'rules'
        ? fb.note
        : `no model backend answered, and the rule parser found no shape keyword. Known shapes: ${SHAPES.map((s) => s.label).join(', ')}.`,
    };
  }
  return {
    cells: fb.cells, source: 'rules', raw: '', repaired: false,
    note: backend === 'rules' ? fb.note : `no model backend answered — used the offline parser (${fb.note})`,
  };
}
