/**
 * espTtlStore — state for the ESP-TTL page: which board we are talking to, its live
 * telemetry, and which sub-tab is open.
 *
 * The point of this page is to move the thinking OFF the ESP32. The board stays a thin
 * executor (read a servo, write a servo, flash itself); everything that needs memory,
 * history or UI — pose sequences, undo, import/export — lives here on the laptop where
 * there is RAM to spare. So this store owns the polling loop and every request helper,
 * and nothing here assumes the board remembers anything between calls.
 */
import { create } from 'zustand';

export interface TtlServo {
  id: number;
  label: string;
  min: number;
  max: number;
  connected: boolean;
  mode: string;
  torque: boolean;
  moving: boolean;
  currentAngle: number | null;
  targetAngle: number | null;
  /** Saved manual home for this servo (defaults to 180 when never set). */
  home?: number | null;
  homeSet?: boolean;
  rawPos: number;
  speed: number;
  loadAbs: number;
  currentmA: number | null;
  voltageV: number | null;
  tempC: number | null;
}

export interface TtlMagnet { ch: number; pct: number; ageMs: number }

export interface TtlTelemetry {
  ok: boolean;
  fw: string;
  ms: number;
  heap: number;
  scanning?: boolean;
  otaSpace?: number;
  servos: TtlServo[];
  magnets: TtlMagnet[];
  wifi: {
    connected: boolean; mode: string; ssid: string; ip: string;
    rssi: number; drops: number; hostname: string;
  };
}

export type TtlTab =
  | 'control' | 'animation' | 'tools' | 'magnets' | 'config' | 'wifi' | 'ota' | 'log';

const LS_URL = 'robo4:esptt:url';

interface EspTtlState {
  url: string;
  tab: TtlTab;
  tel: TtlTelemetry | null;
  online: boolean;
  lastError: string | null;
  latencyMs: number | null;
  polling: boolean;
  setUrl: (u: string) => void;
  setTab: (t: TtlTab) => void;
  _apply: (tel: TtlTelemetry | null, latency: number | null, err: string | null) => void;
  setPolling: (on: boolean) => void;
}

export const useEspTtlStore = create<EspTtlState>((set) => ({
  url: localStorage.getItem(LS_URL) || 'http://mod1.local',
  tab: 'control',
  tel: null,
  online: false,
  lastError: null,
  latencyMs: null,
  polling: false,
  setUrl: (u) => {
    const url = u.replace(/\/+$/, '');
    localStorage.setItem(LS_URL, url);
    set({ url, tel: null, online: false, lastError: null });
  },
  setTab: (tab) => set({ tab }),
  _apply: (tel, latencyMs, lastError) =>
    set(tel ? { tel, online: true, latencyMs, lastError: null }
            : { online: false, latencyMs, lastError }),
  setPolling: (polling) => set({ polling }),
}));

/** Base URL without a trailing slash. */
export const ttlUrl = () => useEspTtlStore.getState().url.replace(/\/+$/, '');

/**
 * One GET against the board. The ESP serves a single client at a time, so every call
 * carries its own timeout — a board mid-flash or mid-scan simply will not answer, and a
 * hung fetch would wedge the whole page.
 */
export async function ttlGet<T = any>(path: string, timeoutMs = 6000): Promise<T> {
  const res = await fetch(`${ttlUrl()}${path}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* some endpoints return plain text */ }
  if (!res.ok) throw new Error(json?.error || text || `HTTP ${res.status}`);
  return (json ?? (text as any)) as T;
}

/** Same, but never throws — for fire-and-forget buttons that report their own status. */
export async function ttlTry(path: string, timeoutMs = 6000): Promise<{ ok: boolean; data?: any; error?: string }> {
  try { return { ok: true, data: await ttlGet(path, timeoutMs) }; }
  catch (e: any) { return { ok: false, error: e?.message || String(e) }; }
}

// ── polling ────────────────────────────────────────────────────────────────────
let timer: number | null = null;

/**
 * Poll telemetry while the page is mounted. Deliberately slower than the board's own
 * web UI (500 ms, not 400): the Studio also fires command requests, and the ESP can only
 * serve one connection at a time — pushing the poll rate just makes buttons feel laggy.
 */
export function startTtlPoll(intervalMs = 500): () => void {
  stopTtlPoll();
  useEspTtlStore.getState().setPolling(true);
  let busy = false;

  const tick = async () => {
    if (busy) return;
    busy = true;
    const t0 = performance.now();
    try {
      const tel = await ttlGet<TtlTelemetry>('/api/telemetry', 4000);
      useEspTtlStore.getState()._apply(tel, Math.round(performance.now() - t0), null);
    } catch (e: any) {
      useEspTtlStore.getState()._apply(null, null, e?.message || 'no reply');
    } finally {
      busy = false;
    }
  };

  void tick();
  timer = window.setInterval(tick, intervalMs);
  return stopTtlPoll;
}

export function stopTtlPoll() {
  if (timer !== null) { window.clearInterval(timer); timer = null; }
  useEspTtlStore.getState().setPolling(false);
}

/** Current angles of every connected servo, as a pose map — what "record" captures. */
export function currentPose(): Record<number, number> {
  const tel = useEspTtlStore.getState().tel;
  const pose: Record<number, number> = {};
  if (!tel) return pose;
  for (const s of tel.servos) {
    if (s.currentAngle != null) pose[s.id] = Math.round(s.currentAngle * 10) / 10;
  }
  return pose;
}
