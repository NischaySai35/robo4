import './CopilotPanel.css';
import { useMemo, useState } from 'react';
import { useModelStore } from '@/state/modelStore.js';
import { useSelectionStore } from '@/state/selectionStore.js';
import { bridge } from '@/viewport/cameraBridge.js';
import { executeAiPlan, localPlan } from './aiActions.js';
import { requestCopilotPlan } from './aiClient.js';

const suggestions = [
  'Build a simple robot arm with 3 joints',
  'Add a blue box body',
  'Set joint 1 to 45 degrees',
  'Color link 1 red',
  'Fit view to scene',
  'Home all modules',
];

function actionLabel(action) {
  if (action.type === 'build_serial_arm') return `Build serial arm - ${action.joints || 3} joints`;
  if (action.type === 'add_primitive') return `Add ${action.shape || 'primitive'}`;
  if (action.type === 'set_joint') return `Set joint - ${Number(action.value || 0).toFixed(2)} rad`;
  if (action.type === 'set_all_joints') return `Set ${action.values?.length || 0} joints`;
  if (action.type === 'update_body') return 'Update body';
  if (action.type === 'select_entity') return `Select ${action.kind}`;
  if (action.type === 'delete_entity') return `Delete ${action.kind}`;
  if (action.type === 'home_all') return 'Home simulator';
  if (action.type === 'fit_view') return 'Fit view';
  return action.type;
}

export default function CopilotPanel() {
  const doc = useModelStore((s) => s.doc);
  const dispatch = useModelStore((s) => s.dispatch);
  const select = useSelectionStore((s) => s.select);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const selectedKind = useSelectionStore((s) => s.kind);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState(() => localPlan('Build a simple robot arm with 3 joints', doc));
  const [log, setLog] = useState([]);

  const cloudReady = !!window.tetrobot?.askAnthropic;
  const counts = useMemo(() => ({
    bodies: Object.keys(doc.bodies).length,
    joints: Object.keys(doc.joints).length,
  }), [doc]);
  const selectedName = selectedId
    ? (selectedKind === 'joint' ? doc.joints[selectedId]?.name : doc.bodies[selectedId]?.name)
    : null;

  const ask = async (text = input) => {
    const prompt = text.trim();
    if (!prompt || busy) return;
    setBusy(true);
    try {
      const next = await requestCopilotPlan(prompt, doc);
      setPlan(next);
      setLog((rows) => [
        { role: 'user', text: prompt },
        { role: 'ai', text: next.note ? `${next.reply} (${next.note})` : next.reply },
        ...rows,
      ].slice(0, 8));
      setInput('');
    } finally {
      setBusy(false);
    }
  };

  const execute = () => {
    const results = executeAiPlan(plan, { doc, dispatch, select, bridge });
    if (results.length === 0) {
      setLog((rows) => [{ role: 'ai', text: 'No executable action in this plan yet.' }, ...rows].slice(0, 8));
      return;
    }
    setLog((rows) => [{ role: 'ai', text: `Executed: ${results.join(', ')}.` }, ...rows].slice(0, 8));
  };

  return (
    <div className="ai-panel">
      <div className="ai-head">
        <span className="ai-title">COPILOT</span>
        <span className={`ai-pill ${cloudReady ? 'ai-pill--cloud' : ''}`}>
          {cloudReady ? 'cloud/local' : 'local'}
        </span>
      </div>

      <div className="ai-context">
        <span>{counts.bodies} bodies</span>
        <span>{counts.joints} joints</span>
        {selectedName && <span>{selectedKind}: {selectedName}</span>}
      </div>

      <form className="ai-form" onSubmit={(e) => { e.preventDefault(); ask(); }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe an edit..."
          rows={3}
        />
        <button type="submit" disabled={busy || !input.trim()}>
          {busy ? 'Thinking' : 'Plan'}
        </button>
      </form>

      <div className="ai-suggestions">
        {suggestions.map((s) => (
          <button key={s} onClick={() => ask(s)} disabled={busy}>{s}</button>
        ))}
      </div>

      {plan && (
        <div className="ai-plan">
          <div className="ai-plan-top">
            <div className="ai-plan-copy">{plan.reply}</div>
            <span>{plan.source || 'local'}</span>
          </div>
          {(plan.actions ?? []).length > 0 && (
            <>
              <div className="ai-actions">
                {plan.actions.map((action, i) => (
                  <span key={`${action.type}-${i}`}>{actionLabel(action)}</span>
                ))}
              </div>
              <button className="ai-execute" onClick={execute}>Execute plan</button>
            </>
          )}
        </div>
      )}

      {log.length > 0 && (
        <div className="ai-log">
          {log.map((row, i) => (
            <div key={i} className={`ai-log-row ai-log-row--${row.role}`}>
              <span>{row.role}</span>
              <p>{row.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
