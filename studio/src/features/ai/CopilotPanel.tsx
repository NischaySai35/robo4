import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import './CopilotPanel.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useModelStore } from '@/state/modelStore';
import { useSelectionStore } from '@/state/selectionStore';
import { bridge } from '@/bridge/cameraBridge';
import { executeAiPlan } from './aiActions';
import { requestCopilotPlan, localModelStatus, enableNeuralModel, neuralEnabled } from './aiClient';

/**
 * CopilotPanel — a small offline chat assistant. Type a request ("fit the view",
 * "home all", "add a box", "set joint 1 to 45°") and it does it immediately. Every
 * edit goes through the command bus, so anything it does is undoable (Ctrl+Z).
 *
 * Backend is whatever's available (see aiClient): a local Ollama model if running,
 * else the cloud, else a built-in rule-based planner — all fully offline-capable.
 */
export default function CopilotPanel() {
  const doc = useModelStore((s) => s.doc);
  const dispatch = useModelStore((s) => s.dispatch);
  const select = useSelectionStore((s) => s.select);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const selectedKind = useSelectionStore((s) => s.kind);

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hi — tell me what to do. Try "fit the view", "home all", "add a box", or "set joint 1 to 45 degrees".' },
  ]);
  const [backend, setBackend] = useState(neuralEnabled() ? 'neural' : 'rules');
  const [neuralLoad, setNeuralLoad] = useState(neuralEnabled() ? 'ready' : 'idle'); // idle|loading|ready
  const [neuralPct, setNeuralPct] = useState(0);
  const listRef = useRef<any>(null);

  // Detect a local Ollama model once (Electron only).
  useEffect(() => {
    let alive = true;
    localModelStatus().then((s) => { if (alive && s.available) setBackend(`ollama · ${s.model}`); });
    return () => { alive = false; };
  }, []);

  const enableNeural = async () => {
    if (neuralLoad !== 'idle') return;
    setNeuralLoad('loading');
    try {
      await enableNeuralModel((p: any) => {
        if (p?.status === 'progress' && p.total) {
          setNeuralPct(Math.round((p.loaded / p.total) * 100));
        }
      });
      setNeuralLoad('ready');
      setBackend((b) => (b.startsWith('ollama') ? b : 'neural · MiniLM'));
      setMessages((m) => [...m, { role: 'ai', text: 'On-device AI ready — I now understand paraphrased commands offline.' }]);
    } catch (e) {
      setNeuralLoad('idle');
      setMessages((m) => [...m, { role: 'ai', text: `Couldn't load the model (needs internet on first download): ${e.message}` }]);
    }
  };

  const counts = useMemo(() => ({
    bodies: Object.keys(doc.bodies).length,
    joints: Object.keys(doc.joints).length,
  }), [doc]);
  const selectedName = selectedId
    ? (selectedKind === 'joint' ? doc.joints[selectedId]?.name : doc.bodies[selectedId]?.name)
    : null;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const send = async (text = input) => {
    const prompt = text.trim();
    if (!prompt || busy) return;
    setBusy(true);
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: prompt }]);
    try {
      const plan = await requestCopilotPlan(prompt, doc);
      const results = executeAiPlan(plan, { doc, dispatch, select, bridge });
      const reply = results.length
        ? `${plan.reply} ✓ ${results.join(', ')}.`
        : (plan.reply || "I couldn't map that to an action yet.");
      const note = (plan as { note?: string }).note;
      setMessages((m) => [...m, { role: 'ai', text: note ? `${reply} (${note})` : reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'ai', text: `Something went wrong: ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ai-panel" data-ui="a">
      <div className="ai-head">
        <span className="ai-title">COPILOT</span>
        <span className="ai-pill">{backend}</span>
      </div>

      <div className="ai-context">
        <span>{counts.bodies} bodies</span>
        <span>{counts.joints} joints</span>
        {selectedName && <span>{selectedKind}: {selectedName}</span>}
      </div>

      {!backend.startsWith('ollama') && neuralLoad !== 'ready' && (
        <Button variant="outline" size="sm" className="tw:mx-2.5 tw:mt-2 tw:border-dashed tw:border-primary tw:text-primary" onClick={enableNeural} disabled={neuralLoad === 'loading'}>
          {neuralLoad === 'loading'
            ? `Downloading on-device AI… ${neuralPct}%`
            : '⚡ Enable on-device AI (~23 MB, offline after download)'}
        </Button>
      )}

      <div className="ai-chat" ref={listRef}>
        {messages.map((row, i) => (
          <div key={i} className={`ai-msg ai-msg--${row.role}`}>{row.text}</div>
        ))}
        {busy && <div className="ai-msg ai-msg--ai ai-msg--busy">…</div>}
      </div>

      <form className="ai-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <Textarea className="tw:flex-1 tw:resize-none tw:min-h-[38px] tw:max-h-[120px]"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Tell the copilot what to do…"
          rows={2}
        />
        <Button type="submit" className="tw:h-[38px]" disabled={busy || !input.trim()}>{busy ? '…' : 'Send'}</Button>
      </form>
    </div>
  );
}