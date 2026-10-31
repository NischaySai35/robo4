import { useState, useCallback, useEffect } from 'react';
import './App.css';
import SimTransmitPanel from '@/features/connection/SimTransmitPanel';
import ConnectionWindow from '@/features/connection/ConnectionWindow';
import IntroOverlay from '@/features/intro/IntroOverlay';
import StartupProjects from '@/features/startup/StartupProjects';
import MenuBar from '@/features/menu/MenuBar';
import { handleKey, setUiActions } from '@/features/ops/appOps';
import DockWorkspaces from '@/features/shell/DockWorkspaces';
import LoadingBar from '@/features/common/LoadingBar';
import CommandPalette from '@/features/command-palette/CommandPalette';
import KeyboardHelp from '@/features/help/KeyboardHelp';
import { useIntegrationStore } from '@/state/integrationStore';
import { useHardwareStore } from '@/state/hardwareStore';
import { useThemeStore } from '@/state/themeStore';
import { useDocStore } from '@/state/docStore';
import { useModelStore } from '@/state/modelStore';
import { autoSave } from '@/core/serialization/projectActions';
import { useEditModeStore } from '@/state/editModeStore';
import { usePageStore } from '@/state/pageStore';
import VoiceControl from '@/features/voice/VoiceControl';
import { initVoiceAnnouncer } from '@/features/voice/announcer';
import { batteryPct } from '@/features/voice/battery';
import { initRuntimeBridge } from '@/state/runtimeBridge';
import { initMotionRuntime } from '@/control/motionRuntime';

/** Module-level clipboard: either a flat list of bodies, or a whole component
 *  (bodies + joints + the Component record) so copy/paste keeps modules intact. */

// Phase 0 foundation: expose the core model + command bus for devtools/scripting
// inspection (e.g. `tetrobotModel.getState().doc`). The model is the platform's
// source of truth going forward; it does not yet drive rendering (Phase 1).
if (typeof window !== 'undefined') window.tetrobotModel = useModelStore;

// Top-level workspace pages. The 3D scene is shared across editor/analysis/training/
// animation; msrr has its own viewport built from the same components; motor is the hardware page.
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
  // MSRR = Modular Self-Reconfigurable Robots. Icon: four cells mid-rearrangement.
  { id: 'msrr',      label: 'MSRR Experiments', icon: tabIcon('M2 8h4v4H2zM8 8h4v4H8zM2 2h4v4H2z|M9 3.5l2 1.5-2 1.5z') },
  // ESP-TTL = the laptop-side console for a module's ESP32 over the TTL servo bus.
  { id: 'esptt',     label: 'ESP-TTL',       icon: tabIcon('M3 3h8v8H3zM5.5 1v2M8.5 1v2M5.5 11v2M8.5 11v2M1 5.5h2M1 8.5h2M11 5.5h2M11 8.5h2') },
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

  const pct   = batteryPct(avgVoltage);
  const color = pct < 10 ? '#ef4444' : pct < 30 ? '#f97316' : '#22c55e';

  return (
    <div className="app-status-chip" title={`Battery: ${avgVoltage.toFixed(2)} V avg · ${pct.toFixed(0)}%`}>
      <BatteryIcon pct={pct} color={color} />
      <span style={{ fontSize: 13, fontWeight: 700, color, transition: 'color 0.4s', letterSpacing: '0.03em' }}>
        {pct.toFixed(0)}%
      </span>
      <span className="hdr-opt-2" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginLeft: 1 }}>
        {avgVoltage.toFixed(1)}V
      </span>
    </div>
  );
}

// Dynamic actuator count — groups movable joints by their configured motor type.
function ServoCountChip() {
  const allJoints = useModelStore((s) => s.doc.joints);
  const joints = Object.values(allJoints).filter((j) => j.type !== 'fixed');
  if (joints.length === 0) return null;
  const typeCounts: Record<string, number> = {};
  for (const j of joints) {
    const mt = (j.meta?.motorType as string) || 'Servo';
    typeCounts[mt] = (typeCounts[mt] || 0) + 1;
  }
  const label = Object.entries(typeCounts).map(([t, n]) => `${n} × ${t}`).join(' · ');
  return (
    <div className="app-status-chip app-status-chip-mono hdr-opt-2" title="Actuator count by motor type">
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
    <div className="app-status-chip hdr-opt-5" title={`Total current draw: ${totalCurrentMA.toFixed(0)} mA · orange>${orangeThresh}mA · red>${redThresh}mA`}>
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
    <div className="app-overcurrent" style={{
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
      <span className="app-overcurrent-names" title={names} style={{ fontSize: 14, fontWeight: 800, color: '#cc0000', letterSpacing: '0.03em' }}>
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
        <span className="app-logo">TETROBOT<span className="app-logo-demo hdr-opt-5">(demo)</span></span>
        <span className="app-logo-tagline">
          <span className="app-logo-sub hdr-opt-0">modular robotics</span>
          <span className="app-logo-byline hdr-opt-1">by nischay sai</span>
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
              aria-label={t.label}
            >
              {t.icon}
              <span className="app-nav-label">{t.label}</span>
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
        <VoiceControl />
        <BatteryChip />
        <CurrentChip />
        <div className="app-status-chip" title={`${boardName}: ${statusText}${hwSignal != null ? ` · signal ${hwSignal}%` : ''}`}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
            background: dotColor,
            boxShadow: `0 0 7px ${dotColor}`,
            transition: 'background 0.4s, box-shadow 0.4s',
          }} />
          <span className="app-board-name">{boardName}</span>
          <span className="hdr-opt-4" style={{ fontSize: 12, color: dotColor, marginLeft: 2, fontWeight: 700, transition: 'color 0.4s' }}>
            · {statusText}
          </span>
          {hwSignal != null && (
            <span className="hdr-opt-3" style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 4 }}>{hwSignal}%</span>
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

  // Spoken feedback: module connect/drop, low battery, and (via ttlTry) every ESP-TTL button.
  useEffect(() => { initVoiceAnnouncer(); }, []);

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


  const toggleConn = useCallback(() => setConnOpen(v => !v), []);

  // Global keyboard shortcuts. The command palette (Ctrl/Cmd+K or Ctrl+P) opens
  // even while typing; undo/redo are ignored inside text inputs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => handleKey(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { setUiActions({ togglePalette: () => setPaletteOpen(v => !v), toggleHelp: () => setHelpOpen(v => !v), toggleConn }); }, [toggleConn]);

  return (
    <div className="app-shell">
      {showIntro && <IntroOverlay onDone={() => { setShowIntro(false); setShowPicker(true); }} />}
      {showPicker && <StartupProjects onClose={() => setShowPicker(false)} />}
      <MenuBar onToggleConn={toggleConn} onHelpOpen={() => setHelpOpen(v => !v)} onOpenProjects={() => setShowPicker(true)} />
      <AppHeader page={page} setPage={setPage} />

      <main className="app-main">
        <DockWorkspaces connOpen={connOpen} onConnToggle={toggleConn} onHelpOpen={() => setHelpOpen(v => !v)} />
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