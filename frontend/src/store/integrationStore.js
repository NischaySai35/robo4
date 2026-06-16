/**
 * Integration bridge between Page 1 (3D sim) and Page 2 (servo controller).
 *
 * Flow:
 *   SimTransmitPanel samples armStore every 500ms
 *     → queueAngles() if any joint moved ≥ 0.8°
 *       → ServoController watches pendingAngles
 *         → sends /api/batch to ESP32
 *           → feedback written to both simLog (page 1 panel) and ctrlLog (page 2 log)
 */

import { create } from 'zustand';

const MAX_LOG = 120;

function ts() {
  const d = new Date();
  const hh = d.getHours()  .toString().padStart(2,'0');
  const mm = d.getMinutes().toString().padStart(2,'0');
  const ss = d.getSeconds().toString().padStart(2,'0');
  const ms = d.getMilliseconds().toString().padStart(3,'0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

function mk(level, src, msg) {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`, time: ts(), level, src, msg };
}

function push(arr, entry) {
  return arr.length >= MAX_LOG ? [...arr.slice(1), entry] : [...arr, entry];
}

export const useIntegrationStore = create((set, get) => ({

  // ── Shared ESP connection state ─────────────────────────────────────────────
  espUrl:          'http://nischaylap.local',
  connected:       false,
  latencyMs:       null,
  servoOnlineCount: 0,

  // ── Command bridge ──────────────────────────────────────────────────────────
  // Latest angles queued from sim; null after consumed by controller
  pendingAngles:  null,   // { 1: deg, 2: deg, 3: deg, 4: deg, 5: deg, 6: deg }
  lastSentAngles: {},     // { servoId: deg } — last values actually sent to ESP

  // ── Logs ────────────────────────────────────────────────────────────────────
  simLog:  [],   // Page 1 transmission panel
  ctrlLog: [],   // Page 2 debug log

  // ── Counters ─────────────────────────────────────────────────────────────────
  stats: { queued: 0, sent: 0, failed: 0 },

  // ── ESP config ──────────────────────────────────────────────────────────────
  avgVoltage:       null,   // average voltageV across all online servos
  totalCurrentMA:   null,   // sum of currentmA across all online servos
  overcurrentServos: [],    // servos drawing > 700 mA: [{ id, label, currentmA }]

  setEspUrl:             (url)       => set({ espUrl: url }),
  setConnected:          (ok, latMs) => set({ connected: ok, latencyMs: latMs ?? null }),
  setServoOnlineCount:   (n)         => set({ servoOnlineCount: n }),
  setAvgVoltage:         (v)         => set({ avgVoltage: v }),
  setTotalCurrentMA:     (v)         => set({ totalCurrentMA: v }),
  setOvercurrentServos:  (arr)       => set({ overcurrentServos: arr }),

  // ── Angle queue (called by SimTransmitPanel every 500ms) ────────────────────
  queueAngles: (angles) => {
    const { lastSentAngles, stats } = get();

    // Only queue if at least one servo moved ≥ 0.8°
    const changed = {};
    for (const [k, v] of Object.entries(angles)) {
      const prev = lastSentAngles[k];
      if (prev == null || Math.abs(v - prev) >= 0.8) changed[k] = v;
    }
    if (!Object.keys(changed).length) return false;

    const summary = Object.entries(changed)
      .sort(([a],[b]) => Number(a) - Number(b))
      .map(([id, d]) => `J${id}→${Number(d).toFixed(1)}°`)
      .join(' ');

    set(s => ({
      pendingAngles: { ...angles },
      stats: { ...s.stats, queued: s.stats.queued + 1 },
      simLog: push(s.simLog, mk('queued', 'SIM', `TX ${summary}`)),
    }));
    return true;
  },

  consumeAngles: () => set({ pendingAngles: null }),

  markSent: (angles) => set(s => ({ lastSentAngles: { ...s.lastSentAngles, ...angles } })),

  // ── Sim-log callbacks (called by ServoController after ESP response) ────────
  simSent:    (detail) => set(s => ({ stats: { ...s.stats, sent:   s.stats.sent   + 1 }, simLog: push(s.simLog, mk('sent',    'ESP', `OK  ${detail}`)) })),
  simFailed:  (detail) => set(s => ({ stats: { ...s.stats, failed: s.stats.failed + 1 }, simLog: push(s.simLog, mk('error',   'ERR', `ERR ${detail}`)) })),
  simOffline: (detail) => set(s => ({                                                     simLog: push(s.simLog, mk('offline', 'OFF', `ESP OFFLINE — ${detail}`)) })),

  // ── Controller log (Page 2) ─────────────────────────────────────────────────
  pushCtrlLog: (level, src, msg) => set(s => ({
    ctrlLog: push(s.ctrlLog, mk(level, src, msg)),
  })),

  clearSimLog:  () => set({ simLog:  [] }),
  clearCtrlLog: () => set({ ctrlLog: [] }),
  resetStats:   () => set({ stats: { queued: 0, sent: 0, failed: 0 } }),
}));
