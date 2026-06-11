import { useState } from 'react';
import LeftPanel from './components/LeftPanel.jsx';
import SimCanvas from './components/SimCanvas.jsx';
import StatusBar from './components/StatusBar.jsx';
import NavigationGizmo from './components/NavigationGizmo.jsx';
import ViewControls from './components/ViewControls.jsx';
import ServoController from './components/ServoController.jsx';
import SimTransmitPanel from './components/SimTransmitPanel.jsx';
import { useIntegrationStore } from './store/integrationStore.js';

function AppHeader({ page, setPage }) {
  const connected        = useIntegrationStore(s => s.connected);
  const servoOnlineCount = useIntegrationStore(s => s.servoOnlineCount);

  let dotColor, statusText;
  if (!connected) {
    dotColor   = '#ef4444';
    statusText = 'Offline';
  } else if (servoOnlineCount === 0) {
    dotColor   = '#f59e0b';
    statusText = 'No servos';
  } else if (servoOnlineCount < 5) {
    dotColor   = '#f59e0b';
    statusText = `${servoOnlineCount}/5 live`;
  } else {
    dotColor   = '#22c55e';
    statusText = 'All OK';
  }

  return (
    <header className="app-header">
      <div className="app-header-brand">
        <span className="app-logo">TETROBOT</span>
        <span className="app-logo-sub">modular arms</span>
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

      <div className="app-header-space" />

      <div className="app-header-right">
        <div className="app-status-chip" title={`ESP32-C3: ${statusText}`}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
            background: dotColor,
            boxShadow: `0 0 6px ${dotColor}`,
            transition: 'background 0.4s, box-shadow 0.4s',
          }} />
          <span>ESP32-C3</span>
          <span style={{ fontSize: 10, color: dotColor, marginLeft: 2, fontWeight: 600, transition: 'color 0.4s' }}>
            · {statusText}
          </span>
        </div>
        <div className="app-status-chip app-status-chip-mono">
          5 × ST3215
        </div>
      </div>
    </header>
  );
}

function AppFooter({ page }) {
  return (
    <footer className="app-footer">
      <span className="app-footer-brand">ROBO4</span>
      <span className="app-footer-sep" />
      <span>Modular Arm Platform</span>
      <span className="app-footer-sep" />
      <span>5 × ST3215 · ESP32-C3</span>
      <div className="app-footer-space" />
      <span
        className={`app-footer-page-pill ${page === 'sim' ? 'active' : ''}`}
        style={{ cursor: 'pointer' }}
      >
        ◈ Simulator
      </span>
      <span
        className={`app-footer-page-pill ${page === 'servo' ? 'active' : ''}`}
        style={{ cursor: 'pointer' }}
      >
        ⚙ Servo Control
      </span>
    </footer>
  );
}

export default function App() {
  const [page, setPage] = useState('sim');

  return (
    <div className="app-shell">
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
          <LeftPanel />
          <div className="canvas-wrapper">
            <SimCanvas />
            <div className="top-right-cluster">
              <NavigationGizmo />
              <ViewControls />
            </div>
            <SimTransmitPanel />
            <StatusBar />
          </div>
        </div>

        {/* Page 2: Servo Controller — hidden with display:none (keeps polling alive) */}
        <div
          className="app-servo-wrap"
          style={page !== 'servo' ? { display: 'none' } : {}}
        >
          <ServoController />
        </div>
      </main>

      <AppFooter page={page} />
    </div>
  );
}
