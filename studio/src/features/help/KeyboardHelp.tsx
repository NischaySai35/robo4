import { useEffect } from 'react';
import './KeyboardHelp.css';
import { listOperators } from '@/core/ops/registry';
import { KEYMAP } from '@/features/ops/appOps';
import { bindingText } from '@/core/ops/keymap';

const MOUSE = [
  {
    title: 'Viewport',
    rows: [
      ['RMB + drag', 'Orbit camera'],
      ['Scroll', 'Zoom in / out'],
      ['MMB + drag', 'Pan camera'],
    ],
  },
  {
    title: 'Selection (mouse)',
    rows: [
      ['Click', 'Select body / joint'],
      ['Ctrl+Click', 'Add to selection'],
      ['Shift+Click', 'Range select'],
      ['Double-click', 'Select + open inspector'],
    ],
  },
  {
    title: 'Axis move',
    rows: [
      ['0-9', 'Type exact value'],
      ['Enter', 'Apply the typed value'],
    ],
  },
];

/** Keys come from the one table, so this list can't disagree with what the keys really do. */
function keySections() {
  const groups = new Map<string, string[][]>();
  for (const op of listOperators()) {
    const keys = KEYMAP.filter((b) => b.op === op.id).map((b) => b.label ?? bindingText(b));
    if (!keys.length) continue;
    if (!groups.has(op.group)) groups.set(op.group, []);
    groups.get(op.group)!.push([keys.join(' / '), op.label]);
  }
  return [...groups].map(([title, rows]) => ({ title, rows }));
}

export default function KeyboardHelp({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="kh-backdrop" onClick={onClose}>
      <div className="kh-modal" onClick={(e) => e.stopPropagation()}>
        <div className="kh-header">
          <span className="kh-title">KEYBOARD SHORTCUTS</span>
          <button className="kh-close" onClick={onClose}>✕</button>
        </div>
        <div className="kh-grid">
          {[...MOUSE, ...keySections()].map((sec) => (
            <div key={sec.title} className="kh-section">
              <div className="kh-section-title">{sec.title}</div>
              {sec.rows.map(([key, label]) => (
                <div key={key} className="kh-row">
                  <kbd className="kh-key">{key}</kbd>
                  <span className="kh-label">{label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
