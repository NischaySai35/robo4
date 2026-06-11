/**
 * SimTransmitPanel
 *
 * Dual-role component:
 *   1. Logic: samples armStore.jointAngles every 500ms and queues angle changes
 *      to integrationStore (which ServoController drains → sends to ESP32).
 *   2. UI: small debug panel overlaid on the Page 1 canvas showing live
 *      transmission log, connection status, and stats.
 *
 * Positioning: absolute right-side overlay inside .canvas-wrapper.
 */

import { useEffect, useRef } from 'react';
import { useArmStore } from '../store/armStore.js';
import { useIntegrationStore } from '../store/integrationStore.js';

const INTERVAL_MS = 100;

// Map joint radian (-π…+π for twist, -100°…+100° for bend) to servo degrees.
// Neutral (0 rad) → 180° center. Linear mapping clamped to 0–360°.
function jointToServoDeg(rad) {
  return Math.max(0, Math.min(360, 180 + (rad * 180 / Math.PI)));
}

const LEVEL_COLOR = {
  queued:  '#8b5cf6',
  sent:    '#059669',
  error:   '#dc2626',
  offline: '#d97706',
};

const SRC_COLOR = {
  SIM: '#f59e0b',
  ESP: '#22c55e',
  ERR: '#ef4444',
  OFF: '#f97316',
};

export default function SimTransmitPanel() {
  const queueAngles = useIntegrationStore(s => s.queueAngles);
  const simLog      = useIntegrationStore(s => s.simLog);
  const connected   = useIntegrationStore(s => s.connected);
  const latencyMs   = useIntegrationStore(s => s.latencyMs);
  const stats       = useIntegrationStore(s => s.stats);
  const clearSimLog = useIntegrationStore(s => s.clearSimLog);
  const resetStats  = useIntegrationStore(s => s.resetStats);
  const espUrl      = useIntegrationStore(s => s.espUrl);

  const anglesRef  = useRef([0, 0, 0, 0, 0]);
  const logBodyRef = useRef(null);

  // Subscribe to armStore changes without causing a re-render
  useEffect(() => {
    const unsub = useArmStore.subscribe(state => {
      anglesRef.current = state.jointAngles;
    });
    return unsub;
  }, []);

  // Servo IDs that are physically mounted in reverse (lo↔hi swapped on the robot).
  // Reversal: reversed = lo + hi - deg.  For id=2 (bend, lo=80, hi=280): 80+280-deg = 360-deg.
  const REVERSED_SERVOS = new Set([2]);

  // 100ms transmit interval — samples current angles and queues if changed
  useEffect(() => {
    const id = setInterval(() => {
      const mapped = {};
      anglesRef.current.forEach((rad, i) => {
        const servoId = i + 1;
        let deg = jointToServoDeg(rad);
        if (REVERSED_SERVOS.has(servoId)) deg = 360 - deg;
        mapped[servoId] = deg;
      });
      queueAngles(mapped);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [queueAngles]);

  // Auto-scroll log to bottom
  useEffect(() => {
    const el = logBodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [simLog]);

  const recent = simLog.slice(-40);
  const hostname = (() => { try { return new URL(espUrl).hostname; } catch { return espUrl; } })();

  return (
    <div className="stp-panel">

      {/* ── Header ── */}
      <div className="stp-header">
        <div className="stp-header-left">
          <span className="stp-title">SIM → ESP</span>
          <span className={`stp-dot ${connected ? 'stp-dot-ok' : 'stp-dot-off'}`} />
          <span className="stp-conn-label" style={{ color: connected ? '#22c55e' : '#f97316' }}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
        <div className="stp-header-right">
          {latencyMs != null && <span className="stp-lat">{latencyMs} ms</span>}
          <button className="stp-btn" onClick={clearSimLog} title="Clear log">CLR</button>
          <button className="stp-btn stp-btn-reset" onClick={resetStats} title="Reset counters">RST</button>
        </div>
      </div>

      {/* ── Target ── */}
      <div className="stp-target">
        <span className="stp-target-label">TARGET</span>
        <span className="stp-target-url">{hostname}</span>
        <span className="stp-target-interval">@{INTERVAL_MS}ms</span>
      </div>

      {/* ── Stats row ── */}
      <div className="stp-stats">
        <div className="stp-stat">
          <span className="stp-stat-k">QUEUED</span>
          <span className="stp-stat-v" style={{ color: '#8b5cf6' }}>{stats.queued}</span>
        </div>
        <div className="stp-stat">
          <span className="stp-stat-k">SENT OK</span>
          <span className="stp-stat-v" style={{ color: '#22c55e' }}>{stats.sent}</span>
        </div>
        <div className="stp-stat">
          <span className="stp-stat-k">FAILED</span>
          <span className="stp-stat-v" style={{ color: '#ef4444' }}>{stats.failed}</span>
        </div>
        <div className="stp-stat">
          <span className="stp-stat-k">DROP%</span>
          <span className="stp-stat-v" style={{ color: '#94a3b8' }}>
            {stats.queued > 0 ? ((stats.failed / stats.queued) * 100).toFixed(0) : '0'}
          </span>
        </div>
      </div>

      {/* ── Log ── */}
      <div className="stp-log-hdr">
        <span>TRANSMISSION LOG</span>
        <span className="stp-log-count">{simLog.length} entries</span>
      </div>
      <div className="stp-log-body" ref={logBodyRef}>
        {recent.length === 0 && (
          <div className="stp-empty">drag a joint to start transmitting</div>
        )}
        {recent.map(e => (
          <div key={e.id} className="stp-entry">
            <span className="stp-e-time">{e.time.slice(3)}</span>
            <span className="stp-e-src" style={{ color: SRC_COLOR[e.src] ?? '#94a3b8' }}>
              {e.src}
            </span>
            <span className="stp-e-msg" style={{ color: LEVEL_COLOR[e.level] ?? '#cbd5e1' }}>
              {e.msg}
            </span>
          </div>
        ))}
      </div>

    </div>
  );
}
