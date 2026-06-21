import { useCallback, useEffect, useRef, useState } from 'react';
import './RightDock.css';
import { useDockStore } from '@/state/dockStore';
import { useEditModeStore } from '@/state/editModeStore';
import EditorTools from '@/features/tools/EditorTools';
import Outliner from '@/features/outliner/Outliner';
import Inspector from '@/features/inspector/Inspector';
import EditPanel from '@/features/editmode/EditPanel';
import CopilotPanel from '@/features/ai/CopilotPanel';
import ScriptingPanel from '@/features/scripting/ScriptingPanel';
import Timeline from '@/features/animation/Timeline';
import AnalysisPanel from '@/features/analysis/AnalysisPanel';
import HardwarePanel from '@/features/hardware/HardwarePanel';

/**
 * RightDock — Blender-style dock. A slim icon rail pins to the right edge; each
 * icon toggles a single resizable panel that slides out to its left. Only one
 * panel is open at a time (click the active icon to collapse it), so the viewport
 * keeps maximum room instead of every feature being stacked at once.
 */

const Icon = ({ children }: any) => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const PANELS = [
  {
    id: 'inspector', title: 'Properties', Component: Inspector,
    icon: <Icon><path d="M3 4h14v12H3zM3 8h14M8 8v8" /></Icon>,
  },
  {
    id: 'outliner', title: 'Scene Tree', Component: Outliner,
    icon: <Icon><path d="M4 5h12M7 10h9M7 15h9M4 10h.01M4 15h.01" /></Icon>,
  },
  {
    id: 'tools', title: 'Precision & Measure', Component: EditorTools,
    icon: <Icon><circle cx="10" cy="10" r="2.5" /><path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3M4 4l2 2M14 14l2 2M16 4l-2 2M6 14l-2 2" /></Icon>,
  },
  {
    id: 'analysis', title: 'Analysis', Component: AnalysisPanel,
    icon: <Icon><path d="M3 16V4M3 16h14M6 13l3-4 2.5 2.5L16 6" /></Icon>,
  },
  {
    id: 'hardware', title: 'Hardware', Component: HardwarePanel,
    icon: <Icon><path d="M6 6h8v8H6zM8 2v3M12 2v3M8 15v3M12 15v3M2 8h3M2 12h3M15 8h3M15 12h3" /></Icon>,
  },
  {
    id: 'copilot', title: 'AI Copilot', Component: CopilotPanel,
    icon: <Icon><path d="M10 2l1.8 4.2L16 8l-4.2 1.8L10 14l-1.8-4.2L4 8l4.2-1.8L10 2zM15 13l.9 2.1L18 16l-2.1.9L15 19l-.9-2.1L12 16l2.1-.9L15 13z" /></Icon>,
  },
  {
    id: 'timeline', title: 'Animation', Component: Timeline,
    icon: <Icon><path d="M3 6h14M3 14h14M7 6v8M13 6v8" /><circle cx="7" cy="10" r="0.5" /></Icon>,
  },
  {
    id: 'scripting', title: 'Script Macros', Component: ScriptingPanel,
    icon: <Icon><path d="M7 6l-4 4 4 4M13 6l4 4-4 4" /></Icon>,
  },
];

// Shown only while mesh Edit Mode is active (prepended to the rail).
const EDIT_PANEL = {
  id: 'edit', title: 'Edit Mesh', Component: EditPanel,
  icon: <Icon><path d="M3 13l8-8 4 4-8 8H3v-4z" /><path d="M11 5l4 4" /></Icon>,
};

const MIN_W = 240;
const MAX_W = 560;
const DEFAULT_W = 300;
const WIDTH_KEY = 'tetrobot:dock:width';

export default function RightDock() {
  const active = useDockStore((s) => s.active);
  const toggle = useDockStore((s) => s.toggle);
  const editActive = useEditModeStore((s) => s.active);
  // Edit panel sits at the top of the rail, only while Edit Mode is on.
  const panels = editActive ? [EDIT_PANEL, ...PANELS] : PANELS;

  // While Edit Mode is on, the shown panel is DERIVED at render time (defaults to
  // the Edit panel) rather than driven through an effect/the dock's `active` —
  // this guarantees the Edit panel appears the instant you enter, with no race.
  // `editPick` lets the user still switch panels (or collapse) during Edit Mode.
  const [editPick, setEditPick] = useState<string | null>('edit');
  useEffect(() => { if (editActive) setEditPick('edit'); }, [editActive]);
  const shownId = editActive ? editPick : active;
  const [width, setWidth] = useState(() => {
    const v = parseInt(localStorage.getItem(WIDTH_KEY) || '', 10);
    return Number.isFinite(v) ? Math.min(MAX_W, Math.max(MIN_W, v)) : DEFAULT_W;
  });
  const widthRef = useRef(width);
  widthRef.current = width;

  useEffect(() => { localStorage.setItem(WIDTH_KEY, String(width)); }, [width]);

  // Note: selecting a body/joint no longer auto-opens the Inspector — a single
  // click only selects (in the viewport and Outliner). Properties opens on
  // DOUBLE-click (Outliner row / viewport body) instead.

  const startResize = useCallback((e: any) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startW = widthRef.current;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev: any) => {
      // Dragging left (negative dx) widens the panel since it grows leftward.
      const next = Math.min(MAX_W, Math.max(MIN_W, startW + (startX - ev.clientX)));
      widthRef.current = next;
      setWidth(next);
    };
    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const activeDef = panels.find((p) => p.id === shownId);
  const collapse = () => { if (editActive) setEditPick(null); else useDockStore.getState().close(); };
  const pick = (id: any) => {
    if (editActive) setEditPick((cur) => (cur === id ? null : id)); // toggle within Edit Mode
    else toggle(id);
  };

  return (
    <div className="rdock">
      {activeDef && (
        <div className="rdock-panel" style={{ width }}>
          <div className="rdock-resize" onMouseDown={startResize} title="Drag to resize" />
          <div className="rdock-panel-head">
            <span className="rdock-panel-title">{activeDef.title}</span>
            <button className="rdock-panel-close" onClick={collapse} title="Collapse panel">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M4 4l6 6M10 4l-6 6" />
              </svg>
            </button>
          </div>
          <div className="rdock-panel-body">
            <activeDef.Component />
          </div>
        </div>
      )}

      <div className="rdock-rail">
        {panels.map((p) => (
          <button
            key={p.id}
            className={`rdock-rail-btn ${shownId === p.id ? 'active' : ''}`}
            onClick={() => pick(p.id)}
            title={p.title}
            aria-label={p.title}
          >
            {p.icon}
          </button>
        ))}
      </div>
    </div>
  );
}