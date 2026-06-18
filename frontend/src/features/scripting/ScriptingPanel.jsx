import './ScriptingPanel.css';
import { useState } from 'react';
import { useModelStore } from '@/state/modelStore.js';
import { useSelectionStore } from '@/state/selectionStore.js';
import { bridge } from '@/viewport/cameraBridge.js';
import { defaultScript, runScript } from './scriptingRuntime.js';

const snippets = [
  {
    label: 'Arm',
    code: `api.buildArm(3, { name: 'macro arm' });
api.setJoint(1, api.deg(35));
api.fitView();`,
  },
  {
    label: 'Parts',
    code: `api.addBox({ name: 'base plate', size: [1.2, 0.8, 0.12], color: '#333333' });
api.addCylinder({ name: 'post', position: [0, 0.6, 4.1], radius: 0.16, length: 1.2, color: '#2277cc' });
api.addSphere({ name: 'marker', position: [0.7, 0.6, 3.7], radius: 0.18, color: '#e0a200' });
api.fitView();`,
  },
];

export default function ScriptingPanel() {
  const doc = useModelStore((s) => s.doc);
  const dispatch = useModelStore((s) => s.dispatch);
  const select = useSelectionStore((s) => s.select);
  const [code, setCode] = useState(defaultScript);
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState([]);

  const run = async () => {
    if (busy || !code.trim()) return;
    setBusy(true);
    try {
      const lines = await runScript(code, { doc, dispatch, select, bridge });
      setOutput(lines.length ? lines : ['ok']);
    } catch (err) {
      setOutput([err?.message || 'Script failed']);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="scpt-panel">
      <div className="scpt-head">
        <span>JS MACROS</span>
        <button onClick={() => setCode(defaultScript)} title="Reset script">Reset</button>
      </div>

      <textarea
        className="scpt-editor"
        value={code}
        spellCheck={false}
        onChange={(e) => setCode(e.target.value)}
      />

      <div className="scpt-actions">
        <button className="scpt-run" onClick={run} disabled={busy || !code.trim()}>
          {busy ? 'Running' : 'Run'}
        </button>
        {snippets.map((s) => (
          <button key={s.label} onClick={() => setCode(s.code)}>{s.label}</button>
        ))}
      </div>

      {output.length > 0 && (
        <div className="scpt-output">
          {output.map((line, i) => <p key={i}>{line}</p>)}
        </div>
      )}
    </div>
  );
}
