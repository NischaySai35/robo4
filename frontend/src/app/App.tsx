import { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';
import LeftPanel from '@/features/panels/LeftPanel';
import AnimLeftPanel from '@/features/panels/AnimLeftPanel';
import SimCanvas from '@/features/canvas/SimCanvas';
import NavigationGizmo from '@/features/viewport-ui/NavigationGizmo';
import ViewControls from '@/features/viewport-ui/ViewControls';
import HomeButton from '@/features/viewport-ui/HomeButton';
import IkIndicator from '@/features/viewport-ui/IkIndicator';
import ServoController from '@/features/servo/ServoController';
import SimTransmitPanel from '@/features/connection/SimTransmitPanel';
import ConnectionWindow from '@/features/connection/ConnectionWindow';
import IntroOverlay from '@/features/intro/IntroOverlay';
import StartupProjects from '@/features/startup/StartupProjects';
import MenuBar from '@/features/menu/MenuBar';
import RightDock from '@/features/dock/RightDock';
import LoadingBar from '@/features/common/LoadingBar';
import CommandPalette from '@/features/command-palette/CommandPalette';
import KeyboardHelp from '@/features/help/KeyboardHelp';
import { useIntegrationStore } from '@/state/integrationStore';
import { useHardwareStore } from '@/state/hardwareStore';
import { useThemeStore } from '@/state/themeStore';
import { useDocStore } from '@/state/docStore';
import { useModelStore } from '@/state/modelStore';
import { useSelectionStore } from '@/state/selectionStore';
import { saveProject, saveProjectAs, autoSave } from '@/core/serialization/projectActions';
import { deleteSelectedEntity } from '@/features/editing/deleteSelected';
import { commands } from '@/core/commands/index';
import { duplicateInPlace, duplicateJointInPlace, reassignServoIds } from '@/features/ops/bodyOps';
import { bodiesOfComponent, jointsOfComponent, uid } from '@/core/model/index';
import { useEditModeStore } from '@/state/editModeStore';
import { editBridge } from '@/viewport/editBridge';
import { bridge } from '@/viewport/cameraBridge';
import { useTransformHudStore } from '@/state/transformHudStore';
import { usePageStore } from '@/state/pageStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import AnalysisPanel from '@/features/analysis/AnalysisPanel';
import AnalysisBottomView from '@/features/analysis/AnalysisBottomView';
import AnalysisModeButtons from '@/features/analysis/AnalysisModeButtons';
import OverloadCards from '@/features/analysis/OverloadCards';
import TrainingPanel from '@/features/training/TrainingPanel';
import Timeline from '@/features/animation/Timeline';
import HardwarePanel from '@/features/hardware/HardwarePanel';
import ResizablePanel from '@/features/common/ResizablePanel';
import { initRuntimeBridge } from '@/state/runtimeBridge';
import { initMotionRuntime } from '@/control/motionRuntime';

/** Module-level clipboard: either a flat list of bodies, or a whole component
 *  (bodies + joints + the Component record) so copy/paste keeps modules intact. */
type Clipboard =
  | { kind: 'bodies'; bodies: any[] }
  | { kind: 'component'; component: any; bodies: any[]; joints: any[] };
let _clipboard: Clipboard | null = null;

/** Copy selected bodies to the clipboard. If the selection is exactly every body
 *  of one Component, copy that whole component (with its joints) as a unit. */
function copySelected() {
  const { ids, kind } = useSelectionStore.getState();
  if (kind !== 'body' || !ids.length) return;
  const { doc } = useModelStore.getState();
  const bodies = ids.map((id) => doc.bodies[id]).filter(Boolean);
  if (!bodies.length) return;

  const compId = bodies[0].componentId;
  if (compId && bodies.every((b) => b.componentId === compId)) {
    const comp = doc.components[compId];
    const allCompBodies = bodiesOfComponent(doc, compId);
    if (comp && allCompBodies.length === bodies.length) {
      _clipboard = { kind: 'component', component: comp, bodies: allCompBodies, joints: jointsOfComponent(doc, compId) };
      return;
    }
  }
  _clipboard = { kind: 'bodies', bodies };
}

/** Paste the clipboard. A component clipboard rebuilds a whole new Component with
 *  duplicated bodies + joints (ids remapped) as one undo step; a plain body
 *  clipboard duplicates each body in place as before. */
function pasteClipboard() {
  if (!_clipboard) return;
  const { dispatch } = useModelStore.getState();

  if (_clipboard.kind === 'component') {
    const { component, bodies, joints } = _clipboard;
    const newComponent = { ...structuredClone(component), id: uid('comp'), name: `${component.name} copy` };
    const bodyIdRemap = new Map<string, string>();
    const jointIdRemap = new Map<string, string>();
    const newBodies = bodies.map((b) => {
      const copy = duplicateInPlace(b);
      copy.componentId = newComponent.id;
      bodyIdRemap.set(b.id, copy.id);
      return copy;
    });
    for (const j of joints) jointIdRemap.set(j.id, uid('joint'));
    let newJoints = joints.map((j) => {
      const copy = duplicateJointInPlace(j, bodyIdRemap, jointIdRemap);
      copy.componentId = newComponent.id;
      return copy;
    });
    // Give the copies their own servo ids — otherwise they'd point at the same
    // physical servos as the originals (duplicate keys in Motor Control, and two
    // joints fighting over one real motor).
    newJoints = reassignServoIds(newJoints, useModelStore.getState().doc);
    dispatch(commands.addEntities([newComponent, ...newBodies, ...newJoints], `Paste ${newComponent.name}`));
    useSelectionStore.getState().selectMany(newBodies.map((b) => b.id), 'body');
    return;
  }

  const copies: string[] = [];
  for (const body of _clipboard.bodies) {
    const copy = duplicateInPlace(body);
    dispatch(commands.addBody(copy));
    copies.push(copy.id);
  }
  if (!copies.length) return;
  useSelectionStore.getState().selectMany(copies, 'body');
}

/** Duplicate the selected body/bodies in place, select the copies, and enter move mode. */
function duplicateSelectedInPlace() {
  const { selectedId, ids, kind } = useSelectionStore.getState();
  if (kind !== 'body') return;
  const targets = ids && ids.length ? ids : (selectedId ? [selectedId] : []);
  const { doc, dispatch } = useModelStore.getState();
  const copies: string[] = [];
  for (const id of targets) {
    const body = doc.bodies[id];
    if (!body) continue;
    const copy = duplicateInPlace(body);
    dispatch(commands.addBody(copy));
    copies.push(copy.id);
  }
  if (!copies.length) return;
  useSelectionStore.getState().selectMany(copies, 'body');
}

/** Select every body in the document (Ctrl+A in the editor). */
function selectAllBodies() {
  const ids = Object.keys(useModelStore.getState().doc.bodies);
  if (ids.length) useSelectionStore.getState().selectMany(ids, 'body');
}

// Phase 0 foundation: expose the core model + command bus for devtools/scripting
// inspection (e.g. `tetrobotModel.getState().doc`). The model is the platform's
// source of truth going forward; it does not yet drive rendering (Phase 1).
if (typeof window !== 'undefined') window.tetrobotModel = useModelStore;

// Top-level workspace pages. The 3D scene is shared across editor/analysis/training/
// animation; motor is the hardware page.
const tabIcon = (d: string) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    {d.split('|').map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const NAV_TABS: { id: import('@/state/pageStore').Page; label: string; icon: any }[] = [
  { id: 'editor',    label: 'Editor',        icon: tabIcon('M2 11l5-8 5 8M2 11h10') },
  { id: 'analysis',  label: 'Analysis',      icon: tabIcon('M2 12V2M2 12h10M5 9l2.5-3L9.5 8 12 4') },
  { id: 'training',  label: 'Training',      icon: tabIcon('M7 2v3M7 9v3M2 7h3M9 7h3|M5.2 5.2L4 4M8.8 5.2L10 4') },
  { id: 'animation', label: 'Animation',     icon: tabIcon('M2 4h10M2 10h10M5 4v6M9 4v6') },
  { id: 'motor',     label: 'Motor Control', icon: tabIcon('M7 4.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM7 1v2M7 11v2M1 7h2M11 7h2') },
];

function ThemeToggle() {
  const theme  = useThemeStore(s => s.theme);
  const toggle = useThemeStore(s => s.toggleTheme);
  const dark = theme === 'dark';
  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      title={`Switch to ${dark ? 'light' : 'dark'} theme`}
      aria-label="Toggle theme"
    >
      {dark ? (
        // sun
        <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="3.6" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M10 1.5v2.2M10 16.3v2.2M1.5 10h2.2M16.3 10h2.2M3.9 3.9l1.6 1.6M14.5 14.5l1.6 1.6M16.1 3.9l-1.6 1.6M5.5 14.5l-1.6 1.6"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      ) : (
        // moon
        <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
          <path d="M16.5 11.8A7 7 0 018.2 3.5 7 7 0 1016.5 11.8z"
            stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
        </svg>
      )}
    </button>
  );
}

// ── Battery indicator ─────────────────────────────────────────────────────────

function BatteryIcon({ pct, color, width = 28, height = 13 }: any) {
  const nubW  = 2.5;
  const bodyW = width - nubW;
  const pad   = 1.8;
  const fillW = Math.max(0, (bodyW - pad * 2) * pct / 100);
  const nubY  = (height - height * 0.45) / 2;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ flexShrink: 0 }}>
      <rect x={0.75} y={0.75} width={bodyW - 1.5} height={height - 1.5} rx={2}
        fill="none" stroke={color} strokeWidth={1.5} />
      <rect x={bodyW} y={nubY} width={nubW} height={height * 0.45} rx={1} fill={color} />
      {fillW > 0 && (
        <rect x={pad} y={pad} width={fillW} height={height - pad * 2} rx={1} fill={color} />
      )}
    </svg>
  );
}

function BatteryChip() {
  const servoOnlineCount = useIntegrationStore(s => s.servoOnlineCount);
  const avgVoltage       = useIntegrationStore(s => s.avgVoltage);

  if (servoOnlineCount === 0 || avgVoltage == null) return null;

  const pct   = Math.max(0, Math.min(100, (avgVoltage - 10.8) / (12.6 - 10.8) * 100));
  const color = pct < 10 ? '#ef4444' : pct < 30 ? '#f97316' : '#22c55e';

  return (
    <div className="app-status-chip" title={`Battery: ${avgVoltage.toFixed(2)} V avg · ${pct.toFixed(0)}%`}>
      <BatteryIcon pct={pct} color={color} />
      <span style={{ fontSize: 13, fontWeight: 700, color, transition: 'color 0.4s', letterSpacing: '0.03em' }}>
        {pct.toFixed(0)}%
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginLeft: 1 }}>
        {avgVoltage.toFixed(1)}V
      </span>
    </div>
  );
}

// Dynamic actuator count — groups movable joints by their configured motor type.
function ServoCountChip() {
  const joints = useModelStore(
    (s) => Object.values(s.doc.joints).filter((j) => j.type !== 'fixed'),
  );
  if (joints.length === 0) return null;
  const typeCounts: Record<string, number> = {};
  for (const j of joints) {
    const mt = (j.meta?.motorType as string) || 'Servo';
    typeCounts[mt] = (typeCounts[mt] || 0) + 1;
  }
  const label = Object.entries(typeCounts).map(([t, n]) => `${n} × ${t}`).join(' · ');
  return (
    <div className="app-status-chip app-status-chip-mono" title="Actuator count by motor type">
      {label}
    </div>
  );
}

function CurrentChip() {
  const servoOnlineCount = useIntegrationStore(s => s.servoOnlineCount);
  const totalCurrentMA   = useIntegrationStore(s => s.totalCurrentMA);

  if (servoOnlineCount === 0 || totalCurrentMA == null) return null;

  const orangeThresh = 250 * servoOnlineCount;
  const redThresh    = 450 * servoOnlineCount;
  const color = totalCurrentMA > redThresh ? '#ef4444'
              : totalCurrentMA > orangeThresh ? '#f97316'
              : '#22c55e';
  const label = totalCurrentMA >= 1000
    ? `${(totalCurrentMA / 1000).toFixed(2)} A`
    : `${Math.round(totalCurrentMA)} mA`;

  return (
    <div className="app-status-chip" title={`Total current draw: ${totalCurrentMA.toFixed(0)} mA · orange>${orangeThresh}mA · red>${redThresh}mA`}>
      <svg width="11" height="17" viewBox="0 0 11 17" fill="none" style={{ flexShrink: 0 }}>
        <path d="M6.5 1L1 9.5H5.5L4.5 16L10 7.5H5.5L6.5 1Z" fill={color} />
      </svg>
      <span style={{ fontSize: 13, fontWeight: 700, color, transition: 'color 0.4s', letterSpacing: '0.03em' }}>
        {label}
      </span>
    </div>
  );
}

function OvercurrentWarning() {
  const overcurrentServos = useIntegrationStore(s => s.overcurrentServos);
  if (!overcurrentServos || overcurrentServos.length === 0) return null;

  const names = overcurrentServos
    .map(s => `${s.label} ${s.type ? s.type.toUpperCase() + ' ' + s.typeNum : ''} (${Math.round(s.currentmA)}mA)`)
    .join('  ·  ');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 18px',
      background: '#cc000022',
      border: '2px solid #cc0000',
      borderRadius: 999,
      whiteSpace: 'nowrap',
      animation: 'oc-pulse 0.75s ease-in-out infinite alternate',
      boxShadow: '0 0 14px #cc000044',
    }}>
      <svg width="17" height="17" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
        <path d="M6.5 1L12 11.5H1L6.5 1Z" stroke="#cc0000" strokeWidth="2" fill="#cc000022"/>
        <line x1="6.5" y1="4.5" x2="6.5" y2="8.5" stroke="#cc0000" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="6.5" cy="10.2" r="0.9" fill="#cc0000"/>
      </svg>
      <span style={{ fontSize: 14, fontWeight: 900, color: '#cc0000', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Overcurrent
      </span>
      <span style={{ fontSize: 14, fontWeight: 800, color: '#cc0000', letterSpacing: '0.03em' }}>
        {names}
      </span>
    </div>
  );
}

function AppHeader({ page, setPage }: any) {
  const editActive       = useEditModeStore(s => s.active);

  const handleNavClick = (id: string) => {
    if (editActive && id !== 'editor') {
      // Flash a subtle alert — don't navigate while geometry is being edited.
      const msg = document.getElementById('edit-mode-nav-block');
      if (msg) { msg.classList.add('flash'); setTimeout(() => msg.classList.remove('flash'), 600); }
      return;
    }
    setPage(id);
  };

  const connected        = useIntegrationStore(s => s.connected);
  const servoOnlineCount = useIntegrationStore(s => s.servoOnlineCount);
  const boardName        = useHardwareStore(s => s.boardName);
  const hwSignal         = useHardwareStore(s => s.signal)();

  let dotColor, statusText;
  if (!connected) {
    dotColor   = '#ef4444';
    statusText = 'Offline';
  } else if (servoOnlineCount === 0) {
    dotColor   = '#f59e0b';
    statusText = 'No servos';
  } else if (servoOnlineCount < 6) {
    dotColor   = '#f59e0b';
    statusText = `${servoOnlineCount}/6 live`;
  } else {
    dotColor   = '#22c55e';
    statusText = 'All OK';
  }

  return (
    <header className="app-header">
      <div className="app-header-brand">
        <span className="app-logo">TETROBOT<span className="app-logo-demo">(demo)</span></span>
        <span className="app-logo-tagline">
          <span className="app-logo-sub">modular robotics</span>
          <span className="app-logo-byline">by nischay sai</span>
        </span>
      </div>

      <div className="app-header-sep" />

      <nav className="app-nav">
        {NAV_TABS.map((t) => {
          const locked = editActive && t.id !== 'editor';
          return (
            <button
              key={t.id}
              className={`app-nav-tab ${page === t.id ? 'active' : ''} ${locked ? 'app-nav-tab--locked' : ''}`}
              onClick={() => handleNavClick(t.id)}
              title={locked ? 'Exit Edit Mode (Tab) to switch pages' : t.label}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
        {editActive && (
          <span id="edit-mode-nav-block" className="app-nav-editlock">
            Exit Edit Mode (Tab) to switch pages
          </span>
        )}
      </nav>

      <div className="app-header-space" />

      <div className="app-header-right">
        <OvercurrentWarning />
        <BatteryChip />
        <CurrentChip />
        <div className="app-status-chip" title={`${boardName}: ${statusText}${hwSignal != null ? ` · signal ${hwSignal}%` : ''}`}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
            background: dotColor,
            boxShadow: `0 0 7px ${dotColor}`,
            transition: 'background 0.4s, box-shadow 0.4s',
          }} />
          <span>{boardName}</span>
          <span style={{ fontSize: 12, color: dotColor, marginLeft: 2, fontWeight: 700, transition: 'color 0.4s' }}>
            · {statusText}
          </span>
          {hwSignal != null && (
            <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 4 }}>{hwSignal}%</span>
          )}
        </div>
        <ServoCountChip />
        <ThemeToggle />
      </div>
    </header>
  );
}

function AppFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="app-footer">
      <span>Modular Robotics Platform</span>
      <span className="app-footer-name">NISCHAY SAI D R</span>
      <div className="app-footer-space" />
      <span className="app-footer-legal">
        © {year} Nischay Sai D R · All rights reserved · Proprietary &amp; confidential · Unauthorized use, copying, or distribution prohibited
      </span>
    </footer>
  );
}

const MIN_PANEL_W = 200;

export default function App() {
  const page    = usePageStore(s => s.page);
  const setPage = usePageStore(s => s.setPage);
  const [connOpen,   setConnOpen]   = useState(false);
  const panelWidth    = useWorkspaceStore(s => s.leftPanelWidth);
  const setPanelWidth = useWorkspaceStore(s => s.setLeftPanelWidth);
  const [showIntro,  setShowIntro]  = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Start the native runtime substrate (pub/sub bus, TF, params, diagnostics) once,
  // then register the motion stack (move_group action + planning service).
  useEffect(() => { initRuntimeBridge(); initMotionRuntime(); }, []);

  // Auto-save every 30 s for existing projects (skips untitled).
  useEffect(() => {
    const id = setInterval(() => { autoSave(); }, 30_000);
    return () => clearInterval(id);
  }, []);

  // Quietly check for app updates a few seconds after launch (desktop only; only
  // prompts if a newer version is actually available).
  useEffect(() => {
    const id = setTimeout(() => { import('@/features/update/checkForUpdates').then((m) => m.checkForUpdates(true)); }, 5000);
    return () => clearTimeout(id);
  }, []);

  // Apply the theme to <html> so CSS [data-theme="dark"] overrides take effect.
  const theme = useThemeStore(s => s.theme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Reflect the open project name in the browser tab title.
  const docName = useDocStore(s => s.name);
  useEffect(() => {
    document.title = `TETROBOT — ${docName ?? 'untitled'}`;
  }, [docName]);

  const panelWidthRef = useRef(panelWidth);
  panelWidthRef.current = panelWidth;

  const startPanelResize = useCallback((e: any) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX   = e.clientX;
    const startW   = panelWidthRef.current;
    const maxW     = Math.floor(window.innerWidth / 2);
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: any) => {
      const next = Math.max(MIN_PANEL_W, Math.min(maxW, startW + (ev.clientX - startX)));
      panelWidthRef.current = next;
      setPanelWidth(next);
    };
    const onUp = () => {
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  }, []);

  const toggleConn = useCallback(() => setConnOpen(v => !v), []);

  // Global keyboard shortcuts. The command palette (Ctrl/Cmd+K or Ctrl+P) opens
  // even while typing; undo/redo are ignored inside text inputs.
  useEffect(() => {
    const onKey = (e: any) => {
      const tag = e.target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable;

      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'k' || k === 'p') { e.preventDefault(); setPaletteOpen(v => !v); return; }
        if (typing) return;
        // Ctrl/Cmd+A in the editor selects all bodies (not browser text). On the
        // other 3D pages it still just prevents the text-selection highlight.
        if (k === 'a' && page !== 'motor' && !useEditModeStore.getState().active) {
          e.preventDefault();
          if (page === 'editor') selectAllBodies();
          return;
        }
        if (k === 'c' && page === 'editor' && !useEditModeStore.getState().active) { e.preventDefault(); copySelected(); return; }
        if (k === 'v' && page === 'editor' && !useEditModeStore.getState().active) { e.preventDefault(); pasteClipboard(); return; }
        if (k === 's' && e.shiftKey) { e.preventDefault(); saveProjectAs(); return; }
        if (k === 's') { e.preventDefault(); saveProject(); return; }
        if (k === 'z' && !e.shiftKey)      { e.preventDefault(); bridge.undo?.(); }
        else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); bridge.redo?.(); }
        return;
      }

      if (e.key === '?' || e.key === '/') { e.preventDefault(); setHelpOpen(v => !v); return; }
      if (typing || page === 'motor') return; // editing shortcuts work on all 3D pages
      const k = e.key.toLowerCase();
      const { selectedId, kind } = useSelectionStore.getState();
      const edit = useEditModeStore.getState();

      // Esc clears the current selection (hides the gizmo + joint arrows) — a reliable
      // escape hatch in case an empty-space click is ever missed.
      if (e.key === 'Escape') {
        if (bridge.cancelAxisModal) { bridge.cancelAxisModal(); return; }
        if (edit.active) { edit.exit(); }
        else if (selectedId) { useSelectionStore.getState().clear(); }
        return;
      }

      // Tab toggles mesh Edit Mode (enter needs a selected body).
      if (e.key === 'Tab') {
        if (edit.active) { e.preventDefault(); edit.exit(); }
        else if (selectedId && kind === 'body') { e.preventDefault(); edit.enter(selectedId); }
        return;
      }

      // In Edit Mode: mesh-op shortcuts (faces/verts), not object-level ones.
      if (edit.active) {
        const ctrl = e.ctrlKey || e.metaKey;
        if (e.key === 'Delete' || e.key === 'Backspace' || k === 'x') { e.preventDefault(); editBridge.deleteSelection(); }
        else if (k === 'e') { e.preventDefault(); editBridge.extrude(); }
        else if (k === 'g' && e.shiftKey) { e.preventDefault(); editBridge.selectSimilar(); }
        else if (k === 'g') { e.preventDefault(); editBridge.startTwoPointMove(); }
        else if (k === 'r' && ctrl) { e.preventDefault(); editBridge.loopCut(); }
        else if (k === 'a') { e.preventDefault(); editBridge.selectAll(); }
        else if (k === 'f') { e.preventDefault(); editBridge.fill(); }
        else if (k === 'j') { e.preventDefault(); editBridge.connect(); }
        else if (k === 'b') { e.preventDefault(); editBridge.bevel(); }
        else if (k === 'l') { e.preventDefault(); editBridge.selectLinked(); }
        else if (k === 'i') { e.preventDefault(); editBridge.inset(); }
        return;
      }

      // Axis modal numeric input — must run BEFORE the delete check so that Backspace
      // edits the buffer instead of deleting the selected body.
      const hudState = useTransformHudStore.getState();
      if (hudState.axis) {
        if (/^[0-9.]$/.test(k) || (k === '-' && !hudState.buffer)) {
          e.preventDefault(); hudState.appendChar(k); return;
        }
        if (e.key === 'Backspace') { e.preventDefault(); hudState.backspace(); return; }
        if (e.key === 'Enter') {
          e.preventDefault();
          const v = parseFloat(hudState.buffer);
          bridge.commitAxisModal?.(isNaN(v) ? undefined : v); // raw value — modal converts (mm/deg/×)
          return;
        }
      }

      // Blender-style transform mode keys (bodies). X/Y/Z run BEFORE the generic delete
      // handler so pressing X on a body starts axis-constrained move, not delete.
      if (kind === 'body' && selectedId && !(e.ctrlKey || e.metaKey)) {
        const sel = useSelectionStore.getState();
        if (k === 'd') { e.preventDefault(); duplicateSelectedInPlace(); return; }
        // M/R/S toggle: pressing the same mode again hides the gizmo.
        if (k === 'm') {
          e.preventDefault();
          if (sel.gizmoMode === 'translate' && sel.showGizmo) sel.hideGizmo();
          else { sel.setGizmoMode('translate'); if (!sel.showGizmo) sel.revealGizmo(); }
          return;
        }
        if (k === 'r') {
          e.preventDefault();
          if (sel.gizmoMode === 'rotate' && sel.showGizmo) sel.hideGizmo();
          else { sel.setGizmoMode('rotate'); if (!sel.showGizmo) sel.revealGizmo(); }
          return;
        }
        if (k === 's' && !e.shiftKey) {
          e.preventDefault();
          if (sel.gizmoMode === 'scale' && sel.showGizmo) sel.hideGizmo();
          else { sel.setGizmoMode('scale'); if (!sel.showGizmo) sel.revealGizmo(); }
          return;
        }
        // X/Y/Z — axis-constrained modal grab.
        if (k === 'x' && !e.shiftKey) { e.preventDefault(); bridge.startAxisModal?.('x'); return; }
        if (k === 'y' && !e.shiftKey) { e.preventDefault(); bridge.startAxisModal?.('y'); return; }
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); bridge.startAxisModal?.('z'); return; }
      }

      // F — fit camera to scene (works even when nothing is selected)
      if (k === 'f' && !useEditModeStore.getState().active) { e.preventDefault(); bridge.fitCamera?.(); return; }

      // Delete / Backspace delete the selected body or joint. X only deletes joints
      // (for bodies X is axis-constrained move, handled above).
      if (e.key === 'Delete' || e.key === 'Backspace' || (k === 'x' && kind !== 'body')) {
        if (selectedId) { e.preventDefault(); deleteSelectedEntity(); }
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page]);

  return (
    <div className="app-shell">
      {showIntro && <IntroOverlay onDone={() => { setShowIntro(false); setShowPicker(true); }} />}
      {showPicker && <StartupProjects onClose={() => setShowPicker(false)} />}
      <MenuBar onToggleConn={toggleConn} onHelpOpen={() => setHelpOpen(v => !v)} onOpenProjects={() => setShowPicker(true)} />
      <AppHeader page={page} setPage={setPage} />

      <main className="app-main">
        {/* Shared 3D workspace — Editor / Analysis / Training / Animation. Always
            mounted (keeps the Three scene alive); hidden only on the Motor page. */}
        <div
          className="app-root"
          style={page === 'motor' ? {
            visibility: 'hidden',
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
          } : {}}
        >
          {/* Left panel + resize handle on Editor and Animation pages. */}
          {page === 'editor' && (
            <>
              <LeftPanel style={{ width: panelWidth }} />
              <div className="panel-resize-handle" onMouseDown={startPanelResize} />
            </>
          )}
          {page === 'animation' && (
            <>
              <AnimLeftPanel style={{ width: panelWidth }} />
              <div className="panel-resize-handle" onMouseDown={startPanelResize} />
            </>
          )}

          <div className={`canvas-wrapper ${page === 'analysis' ? 'canvas-split' : ''}`}>
            <div className="canvas-top">
              {page === 'analysis' && <AnalysisModeButtons />}
              {page === 'analysis' && <OverloadCards />}
              <SimCanvas />
              <div className="top-center-cluster">
                <HomeButton />
                <IkIndicator />
              </div>
              <div className="top-right-cluster">
                <NavigationGizmo />
                <ViewControls isConnOpen={connOpen} onConnToggle={toggleConn} onHelpOpen={() => setHelpOpen(v => !v)} />
              </div>
            </div>
            {page === 'analysis' && <AnalysisBottomView />}
          </div>

          {/* Right side is page-specific. Editor keeps the full Blender-style dock;
              the other pages show a single dedicated panel (no left panel). */}
          {page === 'editor'    && <RightDock />}
          {page === 'analysis'  && <ResizablePanel storageKey="tetrobot:panel:analysis" defaultW={400}><AnalysisPanel /></ResizablePanel>}
          {page === 'training'  && <ResizablePanel storageKey="tetrobot:panel:training" defaultW={400}><TrainingPanel /></ResizablePanel>}
          {page === 'animation' && <ResizablePanel storageKey="tetrobot:panel:animation" defaultW={480}><Timeline /></ResizablePanel>}
        </div>

        {/* Motor Control — servo/motor view + hardware config panel on the right.
            Hidden with display:none (keeps polling alive) when not active. */}
        <div
          className="app-servo-wrap"
          style={page !== 'motor' ? { display: 'none' } : {}}
        >
          <div className="motor-main"><ServoController /></div>
          <ResizablePanel storageKey="tetrobot:panel:motor" defaultW={380}><HardwarePanel /></ResizablePanel>
        </div>
      </main>

      <AppFooter />
      <LoadingBar />

      {/* Connection window — fixed overlay, always mounted so SimTransmitPanel logic keeps running */}
      <ConnectionWindow isOpen={connOpen} onClose={() => setConnOpen(false)}>
        <SimTransmitPanel />
      </ConnectionWindow>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        page={page}
        setPage={setPage}
        onToggleConn={toggleConn}
      />
      {helpOpen && <KeyboardHelp onClose={() => setHelpOpen(false)} />}
    </div>
  );
}