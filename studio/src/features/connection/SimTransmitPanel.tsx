/**
 * SimTransmitPanel — what Sync sends to the robot, live.
 *
 * Sync ON (the viewport's SYNC switch, hardwareStore.streaming) samples the sim every 50 ms:
 *   - EVERY other page (Editor, Analysis, Training, Animation, ESP-TTL, Motor ...): the shared model's joints -> the physics
 *     service's real_sync.PoseSync (poseSync.ts), the SAME robot link as MSRR (directions, smooth speed, hold, E-STOP).
 *   - MSRR live robot: the physics service sends the corrected angles itself (sim/real_sync.py); this panel shows them,
 *     switches that sender on / off with Sync, and holds the board addresses and the emergency stop.
 * With no board online every change is still listed, as "would send" (Nischay 3 Nov).
 */

import './SimTransmitPanel.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect, useRef } from 'react';
import { useIntegrationStore } from '@/state/integrationStore';
import { useHardwareStore } from '@/state/hardwareStore';
import { usePageStore } from '@/state/pageStore';
import { useV2Store } from '@/state/msrrV2Store';
import { hardwareBridge } from '@/features/hardware/HardwareBridge';
import { usePoseSync, poseCmd } from './poseSync';
import { hostLabel } from './syncAssign';

const INTERVAL_MS = 50;

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

/** the MSRR live session's sender state (sim/real_sync.py), when that is what the viewport shows */
const msrrSync = (): any => (usePageStore.getState().page === 'msrr' ? (useV2Store.getState().manual?.state as any)?.sync ?? null : usePoseSync.getState().sync);

export default function SimTransmitPanel() {
  const noteAngles  = useIntegrationStore(s => s.noteAngles);
  const simLog      = useIntegrationStore(s => s.simLog);
  const espOnline   = useIntegrationStore(s => s.connected);
  const latencyMs   = useIntegrationStore(s => s.latencyMs);
  const stats       = useIntegrationStore(s => s.stats);
  const clearSimLog = useIntegrationStore(s => s.clearSimLog);
  const resetStats  = useIntegrationStore(s => s.resetStats);
  const espUrl      = useIntegrationStore(s => s.espUrl);
  const streaming   = useHardwareStore(s => s.streaming);
  const page        = usePageStore(s => s.page);
  const msrrState   = useV2Store(s => (page === 'msrr' ? (s.manual?.state as any)?.sync ?? null : null));
  const poseState   = usePoseSync(s => s.sync);
  const isMsrr      = page === 'msrr';
  // every page has the same box: MSRR's live session, or the shared pose sender (poseSync.ts) on every other page
  const sync        = isMsrr ? msrrState : poseState;
  const logBodyRef = useRef<any>(null);

  // MSRR: the service's sender follows the Sync switch
  // A NEW session (or a restarted physics service) always starts with Sync OFF, even if the button was left ON:
  // the robot never moves just because a session started (Nischay 4 Nov). Only a press turns it on.
  const haveSync = isMsrr && !!sync;
  const sessionId = useV2Store(s => (page === 'msrr' ? (s.manual as any)?.id ?? null : null));
  const seenSession = useRef<any>(null);
  useEffect(() => {
    if (!haveSync) return;
    if (seenSession.current !== sessionId) {
      seenSession.current = sessionId;
      if (streaming) { hardwareBridge.setStreaming(false); return; }   // the effect runs again with streaming off and sends 'off'
    }
    useV2Store.getState().manualCmd({ kind: 'sync', op: streaming ? 'on' : 'off' });
  }, [streaming, haveSync, sessionId]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!useHardwareStore.getState().streaming) return;
      const ms = msrrSync();
      if (ms) {
        const angles: Record<string, number> = {}, labels: Record<string, string> = {};
        for (const [mid, m] of Object.entries<any>(ms.modules)) for (const j of m.joints) if (j.send != null) { angles[`${mid}.${j.j}`] = j.send; labels[`${mid}.${j.j}`] = `${mid}.${j.id}`; }
        noteAngles(angles, labels, Object.values<any>(ms.modules).some((m) => m.online && !m.held));
        return;
      }
      // no sync state yet (service not answering): nothing is sent from the browser any more (the old sender had no
      // directions, smoothing or hold); the box says why
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [noteAngles]);

  // Auto-scroll log to bottom
  useEffect(() => {
    const el = logBodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [simLog]);

  const recent = simLog.slice(-40);
  const hostname = sync ? Object.values<any>(sync.modules).map((m) => m.host).join(', ') : (() => { try { return new URL(espUrl).hostname; } catch { return espUrl; } })();
  const connected = sync ? Object.values<any>(sync.modules).some((m) => m.online) : espOnline;
  const cmd = (op: string, extra?: Record<string, any>) => (isMsrr ? useV2Store.getState().manualCmd({ kind: 'sync', op, ...extra }) : op === 'hosts' ? undefined : poseCmd(op as any));
  const poseErr = usePoseSync(s => s.err);

  return (
    <div className="stp-panel" data-ui="a">

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
          <Button variant="outline" size="xs" onClick={clearSimLog} title="Clear log">CLR</Button>
          <Button variant="outline" size="xs" onClick={resetStats} title="Reset counters">RST</Button>
        </div>
      </div>

      {/* ── Target ── */}
      <div className="stp-target">
        <span className="stp-target-label">TARGET</span>
        <span className="stp-target-url">{hostname}</span>
        <span className="stp-target-interval">@{INTERVAL_MS}ms</span>
      </div>

      {/* ── MSRR live robot: each module's board, its address, the emergency stop ── */}
      {!sync && !isMsrr && poseErr && <div className="stp-target" style={{ color: '#f97316' }}>{poseErr}</div>}
      {sync && (
        <div className="stp-target" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
          {Object.entries<any>(sync.modules).map(([mid, m]) => (
            <div key={mid} style={{ display: 'flex', alignItems: 'center', gap: 6 }} data-testid={`sync-status-${mid}`}>
              <span className={`stp-dot ${m.online && !m.held ? 'stp-dot-ok' : 'stp-dot-off'}`} />
              <span style={{ minWidth: 26, whiteSpace: 'nowrap', fontWeight: 700 }}>{isMsrr ? mid : hostLabel(mid)}</span>
              <Input size="xs" className="tw:flex-1 tw:min-w-0" defaultValue={m.host} readOnly={!isMsrr} aria-label={`${mid} address`}
                onBlur={(e) => { if (e.target.value !== m.host) cmd('hosts', { hosts: { [mid]: e.target.value } }); }} />
              <span style={{ color: m.held ? '#ef4444' : m.online ? '#22c55e' : '#f97316' }} title={m.error || undefined}>{m.held ? 'HOLD' : m.online ? 'online' : 'offline'}</span>
              {m.board && !m.signs_known && <span style={{ color: '#ef4444' }} title="this board's joint directions are not in data/real_robot.json yet: do the one-joint direction test">{m.board}: untested</span>}
            </div>
          ))}
          {Object.values<any>(sync.modules).find((m) => m.held) && <div style={{ color: '#ef4444' }}>{Object.values<any>(sync.modules).find((m) => m.held).held}
            {streaming && <Button variant="outline" size="xs" style={{ marginLeft: 6 }} data-testid="sync-resume" onClick={() => cmd('on')} title="checked the robot: start sending again (it creeps to the sim pose at 15 deg/s)">Resume</Button>}</div>}
          {streaming && !sync.signs_checked && <div style={{ color: '#ef4444' }}>bend/twist directions not tested on this module yet: keep a hand on E-STOP</div>}
          {streaming && sync.signs_checked && !sync.locks_checked && <div style={{ color: '#f59e0b' }}>only the locks L1/L2 are untested: don't lock or unlock yet</div>}
          <Button size="sm" className="tw:bg-destructive tw:text-white tw:hover:bg-destructive/80" data-testid="sync-estop" onClick={() => cmd('stop')} title="the boards' emergency stop on every module">■ E-STOP ALL</Button>
        </div>
      )}

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
          <span className="stp-stat-v" style={{ color: 'var(--text-dim)' }}>
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
          <div className="stp-empty">{streaming ? 'move the robot in the sim: every angle sent shows here' : 'SYNC is off: press SYNC to start'}</div>
        )}
        {recent.map(e => (
          <div key={e.id} className="stp-entry">
            <span className="stp-e-time">{e.time.slice(3)}</span>
            <span className="stp-e-src" style={{ color: SRC_COLOR[e.src as keyof typeof SRC_COLOR] ?? 'var(--text-dim)' }}>
              {e.src}
            </span>
            <span className="stp-e-msg" style={{ color: LEVEL_COLOR[e.level as keyof typeof LEVEL_COLOR] ?? 'var(--text)' }}>
              {e.msg}
            </span>
          </div>
        ))}
      </div>

    </div>
  );
}