import { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';
import LeftPanel from '@/features/panels/LeftPanel';
import SimCanvas from '@/features/canvas/SimCanvas';
import NavigationGizmo from '@/features/viewport-ui/NavigationGizmo';
import ViewControls from '@/features/viewport-ui/ViewControls';
import ServoController from '@/features/servo/ServoController';
import SimTransmitPanel from '@/features/connection/SimTransmitPanel';
import ConnectionWindow from '@/features/connection/ConnectionWindow';
import IntroOverlay from '@/features/intro/IntroOverlay';
import MenuBar from '@/features/menu/MenuBar';
import RightDock from '@/features/dock/RightDock';
import HumanoidActionBar from '@/features/humanoid/HumanoidActionBar';
import LoadingBar from '@/features/common/LoadingBar';
import CommandPalette from '@/features/command-palette/CommandPalette';
import { useIntegrationStore } from '@/state/integrationStore';
import { useThemeStore } from '@/state/themeStore';
import { useDocStore } from '@/state/docStore';
import { useModelStore } from '@/state/modelStore';
import { useSelectionStore } from '@/state/selectionStore';
import { saveProject } from '@/core/serialization/projectActions';
import { deleteSelectedEntity } from '@/features/editing/deleteSelected';
import { commands } from '@/core/commands/index';
import { duplicateInPlace } from '@/features/ops/bodyOps';
import { useEditModeStore } from '@/state/editModeStore';
import { editBridge } from '@/viewport/editBridge';
import { bridge } from '@/viewport/cameraBridge';

/** Duplicate the selected body in place, select the copy, and enter move mode. */
function duplicateSelectedInPlace() {
  const { selectedId, kind } = useSelectionStore.getState();
  if (!selectedId || kind !== 'body') return;
  const { doc, dispatch } = useModelStore.getState();
  const body = doc.bodies[selectedId];
  if (!body) return;
  const copy = duplicateInPlace(body);
  dispatch(commands.addBody(copy));
  useSelectionStore.getState().select(copy.id, 'body');
  useSelectionStore.getState().setGizmoMode('translate');
}

// Phase 0 foundation: expose the core model + command bus for devtools/scripting
// inspection (e.g. `tetrobotModel.getState().doc`). The model is the platform's
// source of truth going forward; it does not yet drive rendering (Phase 1).
if (typeof window !== 'undefined') window.tetrobotModel = useModelStore;

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

// Dynamic actuator count — one ST3215 per movable joint (fixed joints excluded),
// mirroring the dynamic servo grid on the Servo Control page.
function ServoCountChip() {
  const count = useModelStore(
    (s) => Object.values(s.doc.joints).filter((j) => j.type !== 'fixed').length,
  );
  return (
    <div className="app-status-chip app-status-chip-mono" title="One ST3215 servo per movable joint">
      {count} × ST3215
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
  const connected        = useIntegrationStore(s => s.connected);
  const servoOnlineCount = useIntegrationStore(s => s.servoOnlineCount);

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
        <span className="app-logo">TETROBOT</span>
        <span className="app-logo-tagline">
          <span className="app-logo-sub">modular robotics</span>
          <span className="app-logo-byline">by nischay sai</span>
        </span>
      </div>

      <div className="app-header-sep" />

      <nav className="app-nav">
        <button
          className={`app-nav-tab ${page === 'sim' ? 'active' : ''}`}
          onClick={() => setPage('sim')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" stroke="currentColor" strokeWidth="1.4" fill="none"/>
            <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
          </svg>
          Simulator
        </button>
        <button
          className={`app-nav-tab ${page === 'servo' ? 'active' : ''}`}
          onClick={() => setPage('servo')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.4" fill="none"/>
            <circle cx="7" cy="7" r="1" fill="currentColor"/>
            <path d="M7 1V3M7 11V13M1 7H3M11 7H13M2.5 2.5L4 4M10 10L11.5 11.5M11.5 2.5L10 4M4 10L2.5 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Servo Control
        </button>
      </nav>

      <HumanoidActionBar />

      <div className="app-header-space" />

      <div className="app-header-right">
        <OvercurrentWarning />
        <BatteryChip />
        <CurrentChip />
        <div className="app-status-chip" title={`ESP32-C3: ${statusText}`}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
            background: dotColor,
            boxShadow: `0 0 7px ${dotColor}`,
            transition: 'background 0.4s, box-shadow 0.4s',
          }} />
          <span>ESP32-C3</span>
          <span style={{ fontSize: 12, color: dotColor, marginLeft: 2, fontWeight: 700, transition: 'color 0.4s' }}>
            · {statusText}
          </span>
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
const DEFAULT_PANEL_W = 340;

export default function App() {
  const [page,       setPage]       = useState('sim');
  const [connOpen,   setConnOpen]   = useState(false);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_W);
  const [showIntro,  setShowIntro]  = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);

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

  const panelWidthRef = useRef(DEFAULT_PANEL_W);
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
        if (k === 's') { e.preventDefault(); saveProject(); return; }
        if (k === 'z' && !e.shiftKey)      { e.preventDefault(); bridge.undo?.(); }
        else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); bridge.redo?.(); }
        return;
      }

      if (typing || page !== 'sim') return;
      const k = e.key.toLowerCase();
      const { selectedId, kind } = useSelectionStore.getState();
      const edit = useEditModeStore.getState();

      // Tab toggles mesh Edit Mode (enter needs a selected body).
      if (e.key === 'Tab') {
        if (edit.active) { e.preventDefault(); edit.exit(); }
        else if (selectedId && kind === 'body') { e.preventDefault(); edit.enter(selectedId); }
        return;
      }

      // In Edit Mode: mesh-op shortcuts (faces/verts), not object-level ones.
      if (edit.active) {
        if (e.key === 'Delete' || e.key === 'Backspace' || k === 'x') { e.preventDefault(); editBridge.deleteSelection(); }
        else if (k === 'e') { e.preventDefault(); editBridge.extrude(); }
        else if (k === 'g') { e.preventDefault(); editBridge.startTwoPointMove(); }
        else if (k === 'a') { e.preventDefault(); editBridge.selectAll(); }
        return;
      }

      // Delete / Backspace / X delete the selected body or joint.
      if (e.key === 'Delete' || e.key === 'Backspace' || k === 'x') {
        if (selectedId) { e.preventDefault(); deleteSelectedEntity(); }
        return;
      }
      // Blender-style transform mode keys (only meaningful for a selected body).
      if (kind === 'body' && selectedId) {
        if (k === 'd') { e.preventDefault(); duplicateSelectedInPlace(); return; }
        if (k === 'm') { e.preventDefault(); useSelectionStore.getState().setGizmoMode('translate'); return; }
        if (k === 'r') { e.preventDefault(); useSelectionStore.getState().setGizmoMode('rotate'); return; }
        if (k === 's') { e.preventDefault(); useSelectionStore.getState().setGizmoMode('scale'); return; }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page]);

  return (
    <div className="app-shell">
      {showIntro && <IntroOverlay onDone={() => setShowIntro(false)} />}
      <MenuBar onToggleConn={toggleConn} />
      <AppHeader page={page} setPage={setPage} />

      <main className="app-main">
        {/* Page 1: 3D Simulator — always mounted, hidden when servo page active */}
        <div
          className="app-root"
          style={page !== 'sim' ? {
            visibility: 'hidden',
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
          } : {}}
        >
          <LeftPanel style={{ width: panelWidth }} />

          {/* Drag handle between panel and canvas */}
          <div className="panel-resize-handle" onMouseDown={startPanelResize} />

          <div className="canvas-wrapper">
            <SimCanvas />
            <div className="top-right-cluster">
              <NavigationGizmo />
              <ViewControls isConnOpen={connOpen} onConnToggle={toggleConn} />
            </div>
          </div>

          {/* Blender-style right dock: icon rail + one resizable panel at a time. */}
          <RightDock />
        </div>

        {/* Page 2: Servo Controller — hidden with display:none (keeps polling alive) */}
        <div
          className="app-servo-wrap"
          style={page !== 'servo' ? { display: 'none' } : {}}
        >
          <ServoController />
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
    </div>
  );
}