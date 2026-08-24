import { useCallback, useEffect, useRef, useState } from 'react';
import './RightDock.css';
import { useDockStore } from '@/state/dockStore';
import { useEditModeStore } from '@/state/editModeStore';
import EditorTools from '@/features/tools/EditorTools';
import Inspector from '@/features/inspector/Inspector';
import EditPanel from '@/features/editmode/EditPanel';
import CopilotPanel from '@/features/ai/CopilotPanel';
import ScriptingPanel from '@/features/scripting/ScriptingPanel';
import Timeline from '@/features/animation/Timeline';
import AnalysisPanel from '@/features/analysis/AnalysisPanel';
import CameraPanel from '@/features/camera/CameraPanel';
import AutonomyPanel from '@/features/autonomy/AutonomyPanel';
import HardwarePanel from '@/features/hardware/HardwarePanel';
import RuntimePanel from '@/features/runtime/RuntimePanel';
import TrainingPanel from '@/features/training/TrainingPanel';

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
    id: 'tools', title: 'Precision & Measure', Component: EditorTools,
    icon: <Icon><circle cx="10" cy="10" r="2.5" /><path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3M4 4l2 2M14 14l2 2M16 4l-2 2M6 14l-2 2" /></Icon>,
  },
  {
    id: 'analysis', title: 'Analysis', Component: AnalysisPanel,
    icon: <Icon><path d="M3 16V4M3 16h14M6 13l3-4 2.5 2.5L16 6" /></Icon>,
  },
  {
    id: 'camera', title: 'Camera Settings', Component: CameraPanel,
    icon: <Icon><path d="M3 6h3l1.5-2h5L14 6h3v9H3z" /><circle cx="10" cy="10" r="2.5" /></Icon>,
  },
  {
    id: 'hardware', title: 'Hardware', Component: HardwarePanel,
    icon: <Icon><path d="M6 6h8v8H6zM8 2v3M12 2v3M8 15v3M12 15v3M2 8h3M2 12h3M15 8h3M15 12h3" /></Icon>,
  },
  {
    id: 'runtime', title: 'Runtime', Component: RuntimePanel,
    icon: <Icon><circle cx="10" cy="10" r="2" /><circle cx="4" cy="4" r="1.6" /><circle cx="16" cy="4" r="1.6" /><circle cx="4" cy="16" r="1.6" /><path d="M5.4 5.4l3.2 3.2M14.6 5.4l-3.2 3.2M5.4 14.6l3.2-3.2" /></Icon>,
  },
  {
    id: 'training', title: 'Training (RL)', Component: TrainingPanel,
    icon: <Icon><path d="M10 3v4M10 13v4M3 10h4M13 10h4" /><circle cx="10" cy="10" r="2.5" /><circle cx="10" cy="3" r="1.3" /><circle cx="10" cy="17" r="1.3" /><circle cx="3" cy="10" r="1.3" /><circle cx="17" cy="10" r="1.3" /></Icon>,
  },
  {
    id: 'autonomy', title: 'Autonomy', Component: AutonomyPanel,
    icon: <Icon><circle cx="10" cy="10" r="2" /><path d="M10 2v3M10 15v3M2 10h3M15 10h3M10 10l5-3" /></Icon>,
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
const MAX_W = 600;
const DEFAULT_W = 400;
const WIDTH_KEY = 'tetrobot:dock:width:v2';

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

  const split = useDockStore((s) => s.split);
  const secondary = useDockStore((s) => s.secondary);
  const toggleSplit = useDockStore((s) => s.toggleSplit);
  const setSecondary = useDockStore((s) => s.setSecondary);
  // Split is only honoured outside mesh Edit Mode (which owns the panel layout).
  const splitOn = split && !editActive;

  // Vertical split ratio (top pane height fraction), drag the divider to change.
  const [ratio, setRatio] = useState(0.5);
  const splitRef = useRef<HTMLDivElement>(null);
  const startVResize = useCallback((e: any) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const onMove = (ev: any) => {
      const box = splitRef.current?.getBoundingClientRect();
      if (!box) return;
      setRatio(Math.min(0.85, Math.max(0.15, (ev.clientY - box.top) / box.height)));
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const defOf = (id: any) => panels.find((p) => p.id === id);
  const activeDef = defOf(shownId);
  const secondaryDef = defOf(secondary);
  const collapse = () => { if (editActive) setEditPick(null); else useDockStore.getState().close(); };
  const pick = (id: any) => {
    if (editActive) setEditPick((cur) => (cur === id ? null : id)); // toggle within Edit Mode
    else if (splitOn) useDockStore.getState().open(id); // in split, rail sets the top pane
    else toggle(id);
  };

  // One pane: a panel-picker header + the panel body. Written as a plain function
  // (not a nested component) so React reconciles the panel bodies across renders
  // instead of remounting them on every divider drag. `onPick` swaps which panel
  // this slot shows, so in split mode you can choose any two panels.
  const renderPane = (def: any, onPick: any, onClose?: any) => (
    <div className="rdock-pane">
      <div className="rdock-panel-head">
        <select className="rdock-pane-select" value={def?.id ?? ''} onChange={(e) => onPick(e.target.value)}>
          {panels.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        {onClose && (
          <button className="rdock-panel-close" onClick={onClose} title="Collapse panel">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M4 4l6 6M10 4l-6 6" />
            </svg>
          </button>
        )}
      </div>
      <div className="rdock-panel-body">{def && <def.Component />}</div>
    </div>
  );

  const showPanel = splitOn ? (activeDef || secondaryDef) : activeDef;

  return (
    <div className="rdock">
      {showPanel && (
        <div className="rdock-panel" style={{ width }}>
          <div className="rdock-resize" onMouseDown={startResize} title="Drag to resize" />

          {splitOn ? (
            <div className="rdock-split" ref={splitRef}>
              <div className="rdock-pane-wrap" style={{ height: `${ratio * 100}%` }}>
                {renderPane(activeDef, (id: any) => useDockStore.getState().open(id), collapse)}
              </div>
              <div className="rdock-hsplit" onMouseDown={startVResize} title="Drag to resize panes" />
              <div className="rdock-pane-wrap" style={{ height: `${(1 - ratio) * 100}%` }}>
                {renderPane(secondaryDef, (id: any) => setSecondary(id))}
              </div>
            </div>
          ) : (
            <>
              <div className="rdock-panel-head">
                <span className="rdock-panel-title">{activeDef?.title}</span>
                <button className="rdock-panel-close" onClick={collapse} title="Collapse panel">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M4 4l6 6M10 4l-6 6" />
                  </svg>
                </button>
              </div>
              <div className="rdock-panel-body">{activeDef && <activeDef.Component />}</div>
            </>
          )}
        </div>
      )}

      <div className="rdock-rail">
        {!editActive && (
          <button
            className={`rdock-rail-btn rdock-split-btn ${splitOn ? 'active' : ''}`}
            onClick={toggleSplit}
            title="Split view — show two panels at once"
            aria-label="Split view"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="14" height="14" rx="1.5" /><path d="M3 10h14" />
            </svg>
          </button>
        )}
        {panels.map((p) => (
          <button
            key={p.id}
            className={`rdock-rail-btn ${shownId === p.id ? 'active' : ''} ${splitOn && secondary === p.id ? 'active-2' : ''}`}
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