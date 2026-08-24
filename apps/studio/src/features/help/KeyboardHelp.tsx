import { useEffect } from 'react';
import './KeyboardHelp.css';

const SECTIONS = [
  {
    title: 'Viewport',
    rows: [
      ['RMB + drag', 'Orbit camera'],
      ['Scroll', 'Zoom in / out'],
      ['MMB + drag', 'Pan camera'],
      ['F', 'Fit selection in view'],
    ],
  },
  {
    title: 'Selection',
    rows: [
      ['Click', 'Select body / joint'],
      ['Ctrl+Click', 'Add to selection'],
      ['Shift+Click', 'Range select'],
      ['A', 'Select all'],
      ['Double-click', 'Select + open inspector'],
    ],
  },
  {
    title: 'Transform',
    rows: [
      ['M', 'Move (translate)'],
      ['R', 'Rotate'],
      ['S', 'Scale'],
      ['X / Y / Z', 'Constrain axis'],
      ['0–9', 'Type exact value (modal)'],
      ['Esc', 'Cancel modal / deselect'],
    ],
  },
  {
    title: 'Build',
    rows: [
      ['Del / X', 'Delete selected'],
      ['Ctrl+D', 'Duplicate in place'],
      ['Ctrl+Z', 'Undo'],
      ['Ctrl+Shift+Z', 'Redo'],
    ],
  },
  {
    title: 'Edit Mode',
    rows: [
      ['Tab', 'Toggle Edit Mode'],
      ['E', 'Extrude selection'],
      ['B', 'Box select'],
      ['J', 'Join edge loop'],
      ['L', 'Loop select'],
      ['Ctrl+R', 'Loop cut'],
    ],
  },
  {
    title: 'App',
    rows: [
      ['Ctrl+K', 'Command palette'],
      ['Ctrl+S', 'Save project'],
      ['?', 'This help dialog'],
      ['Esc', 'Close dialog'],
    ],
  },
];

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
          {SECTIONS.map((sec) => (
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
