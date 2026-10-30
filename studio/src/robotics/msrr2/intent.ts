/**
 * intent.ts — the Ask tab's language layer (brief M6).
 *
 * The LLM never plans and never invents angles: it only turns a request into capability
 * tags, as JSON, which is validated here before anything uses it. The tags are then
 * matched against the library's MEASURED tags to pick targets; the planner does the rest.
 * If no LLM is reachable a keyword reader produces the same JSON.
 */
import { type CapabilityTag, type ShapeEntry, CAPABILITY_TAGS } from './model';
import type { TagReq, TagSpec } from './optimise';
import { tagShortfall } from './optimise';

export interface Intent {
  required_tags: TagSpec;
  constraints: { max_modules?: number; keep_anchored?: boolean };
  preferences: { prefer: 'reliable' | 'fast' | 'tall' | 'low' | null };
  clarifying_question: string | null;
  /** a short plain-words answer to the person: what was understood, what the robot can/can't do, or a question back */
  reply?: string;
}

/** Default local model for the intent layer (Ollama tag). */
export const INTENT_MODEL = 'qwen3.5:9b';

const BOOL_TAGS: readonly CapabilityTag[] = ['moves_on_floor', 'stands_upright', 'has_free_end', 'encloses'];

export const INTENT_SYSTEM_PROMPT = `You translate a request for a shape-changing modular robot into capability tags.
You are in a CONVERSATION with the robot's builder: earlier turns are context, the newest message may answer your question.
Reply with ONE JSON object and nothing else:
{"reply": string,
 "required_tags": {<tag>: {"min"?: number, "max"?: number} | {"is": true|false}},
 "constraints": {"max_modules"?: number, "keep_anchored"?: boolean},
 "preferences": {"prefer": "reliable" | "fast" | "tall" | "low" | null},
 "clarifying_question": string | null}
"reply" = 1-3 plain sentences to the person: what you understood in their words, and honestly what is not possible yet
(end-to-end docking between two modules is 0% in physics so far; snake, cube and flat table tops are not built yet).
required_tags must describe the WHOLE goal so far (merge the earlier turns), not only the newest message.
Tags (yes/no tags use "is"; all others are numbers and use "min"/"max"):
- moves_on_floor (yes/no): the shape can travel along the floor (crawl, walk, roll).
- max_speed_mm_s: travel speed.
- ground_contacts: number of separate feet touching the floor (a tripod has 3).
- cog_height_mm: height of the centre of mass; low = hard to tip over.
- stands_upright (yes/no): a tower/column standing on one end.
- holds_load_kg: weight it can carry on top.
- flat_top_area_cm2: size of a flat top surface to put things on (a phone needs ~100).
- reach_mm: how far a free end reaches from the base.
- has_free_end (yes/no): one end is loose and can point/touch/grab.
- stable_on_tilt_deg: steepest floor slope it stays standing on.
- encloses (yes/no): the modules form a closed loop/ring.
- spans_gap_mm: an arch/bridge with clearance underneath this wide.
- height_mm: total height of the shape (tall -> min, low/flat/fit under something -> max).
Units: *_mm millimetres, *_kg kilograms, *_cm2 square centimetres, *_deg degrees, *_mm_s mm per second.
CONVERT units: 25 cm = 250 mm, 0.6 m = 600 mm, 200 g = 0.2 kg.
Rules:
- Use ONLY the 1-3 tags the request actually implies. Never list every tag; never add a range "just in case".
- Leave constraints empty ({}) unless the user states a module count or asks to stay anchored in a receiver.
- prefer is null unless the user says fast/quick, safe/reliable, tall, or low.
- clarifying_question is null unless NO tag can be inferred at all.
Each module is about 0.68 m long standing (pad tip to pad tip) and weighs 1.134 kg. Modules stand upright in floor receivers and lock their ends into each other's sides; nothing stacks end on end, so structures built so far are at most 725 mm tall (measured) and up to 6 modules wide (footprint up to ~2000 cm2). Never output joint angles or moves.
Examples:
"make a bridge over a 25 cm gap" -> {"required_tags":{"spans_gap_mm":{"min":250}},"constraints":{},"preferences":{"prefer":null},"clarifying_question":null}
"a seat that can hold 200 g" -> {"required_tags":{"holds_load_kg":{"min":0.2},"flat_top_area_cm2":{"min":30}},"constraints":{},"preferences":{"prefer":null},"clarifying_question":null}
"crawl across the floor quickly" -> {"required_tags":{"moves_on_floor":{"is":true}},"constraints":{},"preferences":{"prefer":"fast"},"clarifying_question":null}`;

const numBound = { type: 'object', properties: { min: { type: 'number' }, max: { type: 'number' } }, additionalProperties: false };
const boolBound = { type: 'object', properties: { is: { type: 'boolean' } }, required: ['is'], additionalProperties: false };

/** JSON Schema handed to Ollama's `format`, so the model can only emit the Intent shape with known tags. */
export const INTENT_SCHEMA = {
  type: 'object',
  properties: {
    required_tags: {
      type: 'object',
      properties: Object.fromEntries(CAPABILITY_TAGS.map((t) => [t, BOOL_TAGS.includes(t) ? boolBound : numBound])),
      additionalProperties: false,
    },
    constraints: { type: 'object', properties: { max_modules: { type: 'integer' }, keep_anchored: { type: 'boolean' } }, additionalProperties: false },
    preferences: { type: 'object', properties: { prefer: { enum: ['reliable', 'fast', 'tall', 'low', null] } }, required: ['prefer'] },
    clarifying_question: { type: ['string', 'null'] },
    reply: { type: 'string' },
  },
  required: ['reply', 'required_tags', 'constraints', 'preferences', 'clarifying_question'],
};

/** Validate untrusted JSON (from an LLM) into an Intent. Unknown tags and bad values are dropped and reported. */
export function validateIntent(raw: unknown): { intent: Intent | null; problems: string[] } {
  const problems: string[] = [];
  let obj = raw;
  if (typeof raw === 'string') {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return { intent: null, problems: ['the reply contained no JSON object'] };
    try { obj = JSON.parse(m[0]); } catch { return { intent: null, problems: ['the reply was not valid JSON'] }; }
  }
  if (!obj || typeof obj !== 'object') return { intent: null, problems: ['not an object'] };
  const o = obj as Record<string, unknown>;
  const tags: TagSpec = {};
  const rt = (o.required_tags ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(rt)) {
    if (!(CAPABILITY_TAGS as readonly string[]).includes(k)) { problems.push(`unknown tag "${k}" ignored`); continue; }
    if (!v || typeof v !== 'object') { problems.push(`tag "${k}" has no bounds`); continue; }
    const r: TagReq = {};
    const vv = v as Record<string, unknown>;
    if (typeof vv.min === 'number' && Number.isFinite(vv.min)) r.min = vv.min;
    if (typeof vv.max === 'number' && Number.isFinite(vv.max)) r.max = vv.max;
    if (typeof vv.is === 'boolean') r.is = vv.is;
    if (r.min === undefined && r.max === undefined && r.is === undefined) { problems.push(`tag "${k}" has no usable bound`); continue; }
    tags[k as CapabilityTag] = r;
  }
  const c = (o.constraints ?? {}) as Record<string, unknown>;
  const p = (o.preferences ?? {}) as Record<string, unknown>;
  const prefer = ['reliable', 'fast', 'tall', 'low'].includes(String(p.prefer)) ? p.prefer as Intent['preferences']['prefer'] : null;
  const q = typeof o.clarifying_question === 'string' && o.clarifying_question.trim() ? o.clarifying_question.trim() : null;
  return {
    intent: {
      required_tags: tags,
      constraints: {
        max_modules: typeof c.max_modules === 'number' ? Math.max(1, Math.round(c.max_modules)) : undefined,
        keep_anchored: typeof c.keep_anchored === 'boolean' ? c.keep_anchored : undefined,
      },
      preferences: { prefer },
      clarifying_question: q,
      reply: typeof o.reply === 'string' && o.reply.trim() ? o.reply.trim().slice(0, 800) : undefined,
    },
    problems,
  };
}

const num = (text: string, re: RegExp) => { const m = text.match(re); return m ? Number(m[1]) : undefined; };

/** Offline reader: keywords and numbers → the same Intent JSON. */
export function keywordIntent(text: string): Intent {
  const t = text.toLowerCase();
  const tags: TagSpec = {};
  const cm = num(t, /(\d+(?:\.\d+)?)\s*cm\b/), mm = num(t, /(\d+(?:\.\d+)?)\s*mm\b/), m = num(t, /(\d+(?:\.\d+)?)\s*m\b/);
  const len = mm ?? (cm !== undefined ? cm * 10 : m !== undefined ? m * 1000 : undefined);
  const kg = num(t, /(\d+(?:\.\d+)?)\s*(?:kg|kilo)/), g = num(t, /(\d+(?:\.\d+)?)\s*g\b/);
  if (/\b(stand|upright|tower|tall|high)\b/.test(t)) tags.stands_upright = { is: true };
  if (/\b(tall|high|tower|reach up)\b/.test(t)) tags.height_mm = { min: len ?? 350 };
  if (/\b(low|flat|lie|lying|under)\b/.test(t)) tags.height_mm = { max: len ?? 120 };
  if (/\b(bridge|span|gap|arch|cross)\b/.test(t)) tags.spans_gap_mm = { min: len ?? 200 };
  if (/\b(carry|hold|load|support|seat|table|platform)\b/.test(t)) tags.holds_load_kg = { min: kg ?? (g !== undefined ? g / 1000 : 0.2) };
  if (/\b(table|platform|seat|flat top|tray)\b/.test(t)) tags.flat_top_area_cm2 = { min: 30 };
  if (/\b(reach|grab|arm|point|touch)\b/.test(t)) { tags.has_free_end = { is: true }; if (len && !tags.spans_gap_mm) tags.reach_mm = { min: len }; }
  if (/\b(loop|ring|wheel|roll|enclose|circle)\b/.test(t)) tags.encloses = { is: true };
  if (/\b(stable|steady|tilt|slope|incline)\b/.test(t)) tags.stable_on_tilt_deg = { min: num(t, /(\d+)\s*(?:deg|°)/) ?? 5 };
  if (/\b(tripod|three legs|3 legs)\b/.test(t)) tags.ground_contacts = { min: 3 };
  if (/\b(walk|crawl|move|travel|inch)\b/.test(t)) tags.moves_on_floor = { is: true };
  const nMods = num(t, /(\d+)\s*modules?/);
  const prefer: Intent['preferences']['prefer'] = /\b(safe|reliable|careful)\b/.test(t) ? 'reliable' : /\b(fast|quick)\b/.test(t) ? 'fast' : null;
  const empty = Object.keys(tags).length === 0;
  return {
    required_tags: tags,
    constraints: { max_modules: nMods, keep_anchored: /\b(anchor|receiver|keep (it )?in)\b/.test(t) || undefined },
    preferences: { prefer },
    clarifying_question: empty ? 'What should the robot be able to do — stand tall, bridge a gap, carry something, reach, or lie low?' : null,
  };
}

/** How well a library shape satisfies an intent, from its MEASURED tags: 1 = everything met, 0 = nothing. */
export function intentFit(e: ShapeEntry, intent: Intent): { fit: number; unmet: string[] } {
  const keys = Object.keys(intent.required_tags);
  if (intent.constraints.max_modules !== undefined && e.nModules > intent.constraints.max_modules) return { fit: 0, unmet: ['too many modules'] };
  if (intent.constraints.keep_anchored && !e.topology.some((x) => 'floor' in x.a)) return { fit: 0, unmet: ['not anchored'] };
  if (!keys.length) return { fit: 0.5, unmet: [] };
  const { unmet } = tagShortfall(e.tags, intent.required_tags);
  const fit = Math.max(0, (keys.length - unmet.length) / keys.length);
  return { fit, unmet };
}

export interface RankedShape { entry: ShapeEntry; fit: number; unmet: string[]; score: number }

/** Rank library shapes for an intent (tag fit × margins, plus the stated preference). No planning here. */
export function rankShapes(entries: ShapeEntry[], intent: Intent, nModules: number): RankedShape[] {
  const out: RankedShape[] = [];
  for (const e of entries) {
    if (e.nModules !== nModules) continue;
    const { fit, unmet } = intentFit(e, intent);
    if (fit <= 0) continue;
    const m = e.margins;
    const margin = Math.max(0.05, Math.min(1, (70 - m.maxTorquePct) / 70)) * (m.cogMarginMm >= 999 ? 1 : Math.max(0.05, Math.min(1, m.cogMarginMm / 60)));
    const h = Number(e.tags.height_mm?.value ?? 0);
    const pref = intent.preferences.prefer === 'tall' ? h / 1000 : intent.preferences.prefer === 'low' ? -h / 1000 : intent.preferences.prefer === 'reliable' ? margin * 0.3 : 0;
    // a shape MuJoCo saw fall or sag out of shape ranks below every shape that held
    const sim = e.sim ? (e.sim.ok ? 0.3 : -1) : 0;
    out.push({ entry: e, fit, unmet, score: fit * 2 + margin * 0.5 + pref + sim });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 3);
}

/** one turn of the Ask conversation */
export interface ChatTurn { role: 'user' | 'assistant'; content: string; intent?: Intent; source?: string; problems?: string[]; t: number }

/** the model's view of the robot right now (so it can talk about THIS robot, not a generic one) */
export function robotContext(nModules: number, locks: string[]): string {
  return `Robot now: ${nModules} module(s). Locks: ${locks.length ? locks.join(', ') : 'none'}. ` +
    'Ports: each module has End A and End B (lockable connectors) and 4 side receivers S1A, S1B, S2A, S2B; floor receivers F0.. are on the floor.';
}

/** the whole conversation as chat messages for the model (assistant turns are its earlier JSON replies) */
export function chatMessages(history: ChatTurn[], context: string): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  return [{ role: 'system', content: `${INTENT_SYSTEM_PROMPT}\n${context}` },
    ...history.map((h) => ({ role: h.role, content: h.role === 'assistant' && h.intent ? JSON.stringify(h.intent) : h.content }))];
}
