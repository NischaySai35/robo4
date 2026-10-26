/**
 * Ask tab (M6) — say what the robot should do; get capability tags, then the best shapes.
 *
 * The language model (local Ollama first, then Anthropic if a key is configured in the
 * desktop shell) only produces the JSON intent, which is validated before use. Without
 * any model, a keyword reader produces the same JSON. Shapes are ranked by their
 * MEASURED tags and margins; "Plan to this" hands the choice to the Plan tab.
 */
import { useState } from 'react';
import { useV2Store } from '@/state/msrrV2Store';
import { LIBRARY } from '@/robotics/msrr2/library';
import { type Intent, INTENT_MODEL, INTENT_SCHEMA, INTENT_SYSTEM_PROMPT, keywordIntent, rankShapes, validateIntent, type RankedShape } from '@/robotics/msrr2/intent';
import type { Config, ShapeEntry } from '@/robotics/msrr2/model';
import { Section } from '@/features/msrr/MsrrPanel';
import { MarginChips } from './V2Panel';
import { VERIFY_URL } from '@/robotics/msrr2/simScene';
import { tagShortfall } from '@/robotics/msrr2/optimise';

const EXAMPLES = ['stand as tall as you can', 'make a bridge over a 25 cm gap', 'make a seat that can hold 200 g', 'lie low and flat'];

/** Browser (dev server) route to the local Ollama: vite proxies /ollama → 127.0.0.1:11434. */
async function askOllamaHttp(text: string): Promise<string | null> {
  try {
    const res = await fetch('/ollama/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: INTENT_MODEL, stream: false, think: false, format: INTENT_SCHEMA,
        options: { temperature: 0.1 },
        messages: [{ role: 'system', content: INTENT_SYSTEM_PROMPT }, { role: 'user', content: text }],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.message?.content?.trim() || null;
  } catch { return null; }
}

async function askModel(text: string): Promise<{ raw: string; source: string } | null> {
  const t = window.tetrobot;
  for (const [fn, source] of [[t?.askOllama, 'ollama'], [t?.askAnthropic, 'anthropic']] as const) {
    if (!fn) continue;
    try {
      const res = await fn({ system: INTENT_SYSTEM_PROMPT, prompt: text, model: INTENT_MODEL, format: INTENT_SCHEMA, think: false });
      if (res?.ok && res.text) return { raw: res.text, source: res.model ? `${source} · ${res.model}` : source };
    } catch { /* next backend */ }
  }
  if (!t) {
    const raw = await askOllamaHttp(text);
    if (raw) return { raw, source: `ollama · ${INTENT_MODEL}` };
  }
  return null;
}

export function AskTab() {
  const config = useV2Store((s) => s.config);
  const setTab = useV2Store((s) => s.setTab);
  const setPlanTargetId = useV2Store((s) => s.setPlanTargetId);
  const show = useV2Store((s) => s.show);
  const pushLog = useV2Store((s) => s.pushLog);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [source, setSource] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [ranked, setRanked] = useState<RankedShape[]>([]);
  const [real, setReal] = useState<{ g: any; fit: number; unmet: string[] }[]>([]);
  const buildShape = useV2Store((s) => s.buildShape);
  const physBusy = useV2Store((s) => s.physBusy);
  const nActive = config.modules.filter((m) => !config.unused.includes(m)).length;

  const go = async (q = text) => {
    if (!q.trim()) return;
    setBusy(true); setText(q);
    let it: Intent | null = null, src = 'offline keywords', probs: string[] = [];
    const llm = await askModel(q);
    if (llm) {
      const v = validateIntent(llm.raw);
      probs = v.problems;
      if (v.intent) { it = v.intent; src = llm.source; } else probs.push(`${llm.source} reply rejected — using the offline reader`);
    }
    if (!it) it = keywordIntent(q);
    const r = rankShapes(LIBRARY, it, nActive);
    setIntent(it); setSource(src); setProblems(probs); setRanked(r); setBusy(false);
    // shapes BUILT IN PHYSICS (grown on the floor-receiver board), ranked by their physics-measured tags
    try {
      const j = await (await fetch(`${VERIFY_URL}/shapes`)).json();
      setReal(rankRealShapes(j.grown ?? [], it));
    } catch { setReal([]); }
    pushLog(`ask "${q}" → ${Object.keys(it.required_tags).join(', ') || 'no tags'} (${src}); ${r.length} shape(s) fit`);
  };

  const preview = (e: ShapeEntry) => {
    const c: Config = { modules: Array.from({ length: e.nModules }, (_, i) => `M${i + 1}`), unused: [], edges: e.topology, pose: e.pose, baseFrame: e.baseFrame };
    show(c, true);
  };

  return (
    <>
      <Section title="What should the robot do?">
        <textarea className="msrr-textarea" data-testid="ask-text" rows={3} value={text} placeholder="e.g. make a bridge over a 25 cm gap" onChange={(e) => setText(e.target.value)} />
        <div className="msrr-row-btns">
          <button className="msrr-btn primary" data-testid="ask-go" disabled={busy || !text.trim()} onClick={() => go()}>{busy ? 'Thinking…' : 'Understand'}</button>
        </div>
        <div className="msrr-row-btns" style={{ flexWrap: 'wrap' }}>
          {EXAMPLES.map((x) => <button key={x} className="msrr-btn small ghost" onClick={() => go(x)}>{x}</button>)}
        </div>
        <p className="msrr-note dim">Robot now: {nActive} module(s). The model only writes the tag JSON below; the planner and the measured library decide the rest.</p>
      </Section>

      {intent && (
        <Section title={`Understood as (${source})`}>
          {intent.clarifying_question && <p className="msrr-note" style={{ color: '#b8860b' }}>❓ {intent.clarifying_question}</p>}
          <pre className="msrr-note" data-testid="ask-intent" style={{ whiteSpace: 'pre-wrap', fontSize: 11 }}>{JSON.stringify(intent, null, 1)}</pre>
          {problems.map((p, i) => <p key={i} className="msrr-note dim">⚠ {p}</p>)}
        </Section>
      )}

      {intent && (
        <Section title="Real shapes (built in physics)" info={<p className="msrr-note">Structures the robot's own docking brain really built in MuJoCo (magnets, rotors, servos, random robots). Ranked by tags measured in that physics run.</p>}>
          {!real.length && <p className="msrr-note dim">No physics-built shape yet (or the physics service is off).</p>}
          {real.map(({ g, fit, unmet }, i) => (
            <div key={i} style={{ borderTop: i ? '1px solid var(--border)' : undefined, padding: '6px 0' }} data-testid={`ask-real-${i}`}>
              <b>{g.name}</b> <span className="msrr-note dim">· fits {(fit * 100).toFixed(0)}% · measured: {g.measured}</span>
              {g.tags && <p className="msrr-note dim">height {g.tags.height_mm} mm · {g.tags.modules} modules · footprint {g.tags.footprint_cm2} cm² · {g.tags.locked}/{g.tags.of} locked</p>}
              {unmet.length > 0 && <p className="msrr-note dim">missing: {unmet.join('; ')}</p>}
              <button className="msrr-btn small primary" disabled={physBusy} onClick={() => buildShape(g.shape)}>{physBusy ? '…' : 'Build & watch'}</button>
            </div>
          ))}
        </Section>
      )}
      {intent && (
        <Section title={ranked.length ? 'Best shapes for this' : 'No shape fits yet'}>
          {!ranked.length && <p className="msrr-note">No {nActive}-module shape in the library has these measured tags. Try other words, or change the module count in the Robot tab.</p>}
          {ranked.map((r, i) => (
            <div key={r.entry.id} style={{ borderTop: i ? '1px solid #333' : undefined, padding: '6px 0' }} data-testid={`ask-result-${i}`}>
              <b>{i + 1}. {r.entry.name}</b> <span className="msrr-note dim">· fits {(r.fit * 100).toFixed(0)}% of the request</span>
              {r.unmet.length > 0 && <p className="msrr-note dim">missing: {r.unmet.join('; ')}</p>}
              <MarginChips m={r.entry.margins} />
              <div className="msrr-row-btns">
                <button className="msrr-btn small" onClick={() => preview(r.entry)}>Show</button>
                <button className="msrr-btn small primary" data-testid={`ask-plan-${i}`} onClick={() => { setPlanTargetId(r.entry.id); setTab('plan'); }}>Plan to this</button>
              </div>
            </div>
          ))}
        </Section>
      )}
    </>
  );
}

/** rank physics-built shapes for an intent, using only the tags measured in their physics run */
function rankRealShapes(grown: any[], it: Intent) {
  return grown.filter((g) => g.tags).map((g) => {
    const t = g.tags;
    const tags = {
      height_mm: { value: t.height_mm, measuredBy: 'sim' as const },
      stands_upright: { value: true, measuredBy: 'sim' as const },
      ground_contacts: { value: t.modules, measuredBy: 'sim' as const },
    };
    const req = Object.fromEntries(Object.entries(it.required_tags).filter(([k]) => k in tags)) as typeof it.required_tags;
    const keys = Object.keys(it.required_tags);
    const { unmet } = tagShortfall(tags, req);
    const unknown = keys.filter((k) => !(k in tags)).map((k) => `${k} not measured for physics shapes yet`);
    const tooMany = it.constraints.max_modules !== undefined && t.modules > it.constraints.max_modules;
    const fit = tooMany ? 0 : keys.length ? (keys.length - unmet.length - unknown.length) / keys.length : 0.5;
    // closeness when nothing fits fully: how far the measured numbers are from the asked bounds (0 = meets them)
    let gap = 0;
    for (const [k, r] of Object.entries(req) as [keyof typeof tags, { min?: number; max?: number }][]) {
      const v = Number(tags[k]?.value ?? 0);
      if (r.min !== undefined && v < r.min) gap += (r.min - v) / Math.max(1, r.min);
      if (r.max !== undefined && v > r.max) gap += (v - r.max) / Math.max(1, r.max);
    }
    return { g, fit: Math.max(0, fit), gap, unmet: [...unmet, ...unknown, ...(tooMany ? ['too many modules'] : [])] };
  }).sort((a, b) => b.fit - a.fit || a.gap - b.gap || b.g.tags.modules - a.g.tags.modules);
}
