/**
 * Ask tab (M6) — a CONVERSATION with the robot: say what it should become or do, answer its questions back.
 *
 * The language model (local Ollama first, then Anthropic if a key is configured in the desktop shell) reads the whole
 * conversation and replies with a short plain-words answer plus the goal as capability tags (JSON, validated before
 * use). Without any model, a keyword reader produces the same JSON. Shapes are ranked by their MEASURED tags and
 * margins; "Plan to this" hands the choice to the Plan tab. The model never outputs joint angles or moves.
 */
import { useEffect, useRef, useState } from 'react';
import { useV2Store } from '@/state/msrrV2Store';
import { LIBRARY } from '@/robotics/msrr2/library';
import { type Intent, type ChatTurn, INTENT_MODEL, INTENT_SCHEMA, keywordIntent, rankShapes, validateIntent, chatMessages, robotContext, type RankedShape } from '@/robotics/msrr2/intent';
import { type Config, type ShapeEntry, isFloorRef } from '@/robotics/msrr2/model';
import { Section } from '@/features/msrr/MsrrPanel';
import { MarginChips } from './V2Panel';
import { VERIFY_URL } from '@/robotics/msrr2/simScene';
import { tagShortfall } from '@/robotics/msrr2/optimise';

const EXAMPLES = ['stand as tall as you can', 'make a bridge over a 25 cm gap', 'make a seat that can hold 200 g', 'lie low and flat'];

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

/** Browser (dev server) route to the local Ollama: vite proxies /ollama → 127.0.0.1:11434. The WHOLE conversation is sent. */
async function askOllamaHttp(messages: Msg[], signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch('/ollama/api/chat', {
      method: 'POST', signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: INTENT_MODEL, stream: false, think: false, format: INTENT_SCHEMA, options: { temperature: 0.1 }, messages }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.message?.content?.trim() || null;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    return null;
  }
}

async function askModel(messages: Msg[], signal?: AbortSignal): Promise<{ raw: string; source: string } | null> {
  const t = window.tetrobot;
  // desktop shell: one prompt (the conversation as text) through its Ollama / Anthropic bridge
  const transcript = messages.filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'user' ? 'Builder' : 'You (earlier JSON reply)'}: ${m.content}`).join('\n');
  for (const [fn, source] of [[t?.askOllama, 'ollama'], [t?.askAnthropic, 'anthropic']] as const) {
    if (!fn) continue;
    try {
      const res = await fn({ system: messages[0].content, prompt: transcript, model: INTENT_MODEL, format: INTENT_SCHEMA, think: false });
      if (res?.ok && res.text) return { raw: res.text, source: res.model ? `${source} · ${res.model}` : source };
    } catch { /* next backend */ }
  }
  if (!t) {
    const raw = await askOllamaHttp(messages, signal);
    if (raw) return { raw, source: `ollama · ${INTENT_MODEL}` };
  }
  return null;
}

const HISTORY_KEY = 'tetrobot.ask.history.v1';
const loadHistory = (): ChatTurn[] => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); } catch { return []; } };
const saveHistory = (h: ChatTurn[]) => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-60))); } catch { /* private mode: memory only */ } };

export function AskTab() {
  const config = useV2Store((s) => s.config);
  const setTab = useV2Store((s) => s.setTab);
  const setPlanTargetId = useV2Store((s) => s.setPlanTargetId);
  const show = useV2Store((s) => s.show);
  const pushLog = useV2Store((s) => s.pushLog);
  const buildShape = useV2Store((s) => s.buildShape);
  const physBusy = useV2Store((s) => s.physBusy);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<ChatTurn[]>(loadHistory);
  const [ranked, setRanked] = useState<RankedShape[]>([]);
  const [real, setReal] = useState<{ g: any; fit: number; unmet: string[] }[]>([]);
  const [showJson, setShowJson] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const nActive = config.modules.filter((m) => !config.unused.includes(m)).length;
  const locks = config.edges.filter((e) => e.locked)
    .map((e) => `${isFloorRef(e.a) ? `floor ${e.a.floor}` : `${e.a.module}.${e.a.port}`} = ${e.b.module}.${e.b.port}`);
  const last = [...history].reverse().find((h) => h.role === 'assistant' && h.intent);
  const intent: Intent | null = last?.intent ?? null;

  useEffect(() => { saveHistory(history); endRef.current?.scrollIntoView({ block: 'nearest' }); }, [history]);
  // the shapes follow the latest understanding (also after a page reload)
  useEffect(() => {
    if (!intent) { setRanked([]); setReal([]); return; }
    setRanked(rankShapes(LIBRARY, intent, nActive));
    fetch(`${VERIFY_URL}/shapes`).then((r) => r.json()).then((j) => setReal(rankRealShapes(j.grown ?? [], intent))).catch(() => setReal([]));
  }, [intent, nActive]);

  /** ask the model with the WHOLE conversation; its reply (and the merged goal) becomes the next assistant turn */
  const ask = async (h: ChatTurn[]) => {
    setBusy(true); setHistory(h);
    const ac = new AbortController(); abortRef.current = ac;
    let it: Intent | null = null, src = 'offline keywords';
    const probs: string[] = [];
    try {
      const llm = await askModel(chatMessages(h, robotContext(nActive, locks)), ac.signal);
      if (llm) {
        const v = validateIntent(llm.raw); probs.push(...v.problems);
        if (v.intent) { it = v.intent; src = llm.source; } else probs.push(`${llm.source} reply rejected — using the offline reader`);
      } else probs.push('no language model answered (is Ollama running?) — using the offline keyword reader');
    } catch {
      setBusy(false); abortRef.current = null;
      setHistory([...h, { role: 'assistant', content: '(stopped)', t: Date.now() }]);
      return;
    }
    if (!it) it = keywordIntent(h.filter((x) => x.role === 'user').map((x) => x.content).join('. '));
    const tagList = Object.keys(it.required_tags).join(', ') || 'no tags';
    const content = it.reply ?? it.clarifying_question ?? `Understood as: ${tagList}.`;
    setHistory([...h, { role: 'assistant', content, intent: it, source: src, problems: probs, t: Date.now() }]);
    setBusy(false); abortRef.current = null;
    pushLog(`ask "${h[h.length - 1]?.content}" → ${tagList} (${src})`);
  };
  const send = (q = text) => {
    if (!q.trim() || busy) return;
    setText('');
    ask([...history, { role: 'user', content: q.trim(), t: Date.now() }]);
  };
  const stop = () => abortRef.current?.abort();
  const retry = () => {
    const i = history.map((h) => h.role).lastIndexOf('user');
    if (i >= 0 && !busy) ask(history.slice(0, i + 1));
  };
  const restart = () => { stop(); setHistory([]); setText(''); setShowJson(false); };

  const preview = (e: ShapeEntry) => {
    const c: Config = { modules: Array.from({ length: e.nModules }, (_, i) => `M${i + 1}`), unused: [], edges: e.topology, pose: e.pose, baseFrame: e.baseFrame };
    show(c, true);
  };

  return (
    <>
      <Section title="Talk to the robot" info={<p className="msrr-note">A local language model ({INTENT_MODEL} in Ollama) reads the WHOLE conversation, answers in plain words and turns the goal into measurable tags. It never moves joints: the planner and physics decide how. History stays in this browser.</p>}>
        <div data-testid="ask-chat" style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, padding: 6, marginBottom: 6 }}>
          {!history.length && <p className="msrr-note dim">Say what the robot should become or do. It may ask you something back; just answer here.</p>}
          {history.map((h, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: h.role === 'user' ? 'flex-end' : 'flex-start', margin: '4px 0' }}>
              <div style={{ maxWidth: '88%', padding: '6px 9px', borderRadius: 8, background: h.role === 'user' ? 'rgba(47,128,237,0.18)' : 'rgba(127,127,127,0.12)' }}>
                <span className="msrr-note" style={{ whiteSpace: 'pre-wrap' }}>{h.content}</span>
                {h.role === 'assistant' && h.intent && (
                  <div className="msrr-note dim" style={{ fontSize: 11, marginTop: 3 }}>
                    goal: {Object.entries(h.intent.required_tags).map(([k, v]) => `${k} ${JSON.stringify(v)}`).join(' · ') || 'no tags yet'}
                    {h.intent.clarifying_question && h.intent.reply && <><br />❓ {h.intent.clarifying_question}</>}
                    <br />{h.source}{h.problems?.length ? ` · ⚠ ${h.problems.join('; ')}` : ''}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && <p className="msrr-note dim">thinking…</p>}
          <div ref={endRef} />
        </div>
        <textarea className="msrr-textarea" data-testid="ask-text" rows={2} value={text}
          placeholder={history.length ? 'reply… (Enter = send, Shift+Enter = new line)' : 'e.g. make a bridge over a 25 cm gap'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <div className="msrr-row-btns">
          <button className="msrr-btn primary" data-testid="ask-go" disabled={busy || !text.trim()} onClick={() => send()}>{busy ? 'Thinking…' : 'Send'}</button>
          {busy && <button className="msrr-btn danger" data-testid="ask-stop" onClick={stop}>■ Stop</button>}
          <button className="msrr-btn" data-testid="ask-retry" disabled={busy || !history.some((h) => h.role === 'user')} onClick={retry} title="ask again from your last message">↻ Retry</button>
          <button className="msrr-btn ghost" data-testid="ask-new" disabled={!history.length} onClick={restart} title="forget this conversation">New conversation</button>
          {intent && <button className="msrr-btn small ghost" onClick={() => setShowJson((x) => !x)}>{showJson ? 'hide' : 'show'} goal JSON</button>}
        </div>
        {!history.length && (
          <div className="msrr-row-btns" style={{ flexWrap: 'wrap' }}>
            {EXAMPLES.map((x) => <button key={x} className="msrr-btn small ghost" onClick={() => send(x)}>{x}</button>)}
          </div>
        )}
        {showJson && intent && <pre className="msrr-note" data-testid="ask-intent" style={{ whiteSpace: 'pre-wrap', fontSize: 11 }}>{JSON.stringify(intent, null, 1)}</pre>}
        <p className="msrr-note dim">Robot now: {nActive} module(s){locks.length ? `, locks: ${locks.join(', ')}` : ''}.</p>
      </Section>

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
