/**
 * espTtlStore — state for the ESP-TTL page: which board we are talking to, its live
 * telemetry (from the shared reader, espPoll), and which sub-tab is open.
 *
 * The point of this page is to move the thinking OFF the ESP32. The board stays a thin
 * executor (read a servo, write a servo, flash itself); everything that needs memory,
 * history or UI — pose sequences, undo, import/export — lives here on the laptop where
 * there is RAM to spare. So this store owns every request helper,
 * and nothing here assumes the board remembers anything between calls.
 */
import { create } from 'zustand';
import { speakForPath } from '@/features/voice/phrases';
import { useEspNodesStore, type EspNode } from '@/state/espNodesStore';
import { startEspPoll, moduleNumber } from '@/features/servo/espPoll';

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

export interface TtlTelemetry {
  ok: boolean;
  fw: string;
  ms: number;
  heap: number;
  scanning?: boolean;
  otaSpace?: number;
  servos: TtlServo[];
  wifi: {
    connected: boolean; mode: string; ssid: string; ip: string;
    rssi: number; drops: number; hostname: string;
  };
}

export type TtlTab =
  | 'control' | 'animation' | 'walk' | 'tools' | 'config' | 'wifi' | 'ota' | 'log';

const LS_URL = 'robo4:esptt:url';     // before 9 Nov: one typed address; read once, then the module list holds it
const LS_NODE = 'robo4:esptt:node';   // the module picked by hand on this page

interface EspTtlState {
  /** The module the per-module tabs show (an espNodesStore id), and its address. */
  nodeId: string | null;
  url: string;
  /** true once picked by hand: then it stays, else the lowest-numbered online module is shown */
  picked: boolean;
  tab: TtlTab;
  tel: TtlTelemetry | null;
  online: boolean;
  lastError: string | null;
  latencyMs: number | null;
  polling: boolean;
  select: (nodeId: string) => void;
  setTab: (t: TtlTab) => void;
  _apply: (tel: TtlTelemetry | null, latency: number | null, err: string | null) => void;
  setPolling: (on: boolean) => void;
}

const lsGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string | null) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* private window */ } };

export const useEspTtlStore = create<EspTtlState>((set) => ({
  nodeId: lsGet(LS_NODE),
  url: 'http://mod1.local',
  picked: !!lsGet(LS_NODE),
  tab: 'control',
  tel: null,
  online: false,
  lastError: null,
  latencyMs: null,
  polling: false,
  select: (nodeId) => {
    lsSet(LS_NODE, nodeId);
    set({ nodeId, picked: true, tel: null, online: false, lastError: null });
    mirror();
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
  try { const data = await ttlGet(path, timeoutMs); speakForPath(path); return { ok: true, data }; }
  catch (e: any) { return { ok: false, error: e?.message || String(e) }; }
}

// ── telemetry: from the ONE shared reader ─────────────────────────────────────
// This page used to ask its board for telemetry on its own timer, next to espPoll asking the same board — two askers
// on a small ESP that serves one client at a time (the 5 Nov "online here, offline there" problem). Now the page only
// makes sure its board is in the module list and mirrors that board's telemetry from espNodesStore.
// REUSE-CHECKED: startTtlPoll|espPoll|espNodesStore|moduleNumber -> espPoll already reads every board; reused.

/** Which module a board address is: mod3.local / 127.0.4.3 -> 3. */
export const moduleOfUrl = (url: string) => moduleNumber(url, '', 0);

/** The selected module's list entry. */
function pageNode(): EspNode | null {
  const id = useEspTtlStore.getState().nodeId;
  return useEspNodesStore.getState().nodes.find(n => n.id === id) ?? null;
}
const nodeModule = (n: EspNode) => moduleNumber(n.url, n.name, useEspNodesStore.getState().nodes.indexOf(n));
/** The module the per-module tabs show. */
export const pageModule = () => { const n = pageNode(); return n ? nodeModule(n) : moduleOfUrl(ttlUrl()); };

/** An address typed on this page before the module list existed: kept as a module, once. */
function adoptOldUrl() {
  const old = lsGet(LS_URL); if (!old) return;
  lsSet(LS_URL, null);
  const st = useEspNodesStore.getState(), mod = moduleOfUrl(old);
  const known = st.nodes.some((n, i) => n.url.replace(/\/+$/, '') === old || (/mod\d+/i.test(old) && moduleNumber(n.url, n.name, i) === mod));
  if (!known) st.addNode({ url: old, name: old.replace(/^https?:\/\//i, '') });
}

/** Keep the selection valid: the hand-picked module while it exists, else the lowest-numbered online one (else the lowest). */
function choose(): EspNode | null {
  const st = useEspTtlStore.getState(), nodes = useEspNodesStore.getState().nodes;
  const cur = pageNode();
  if (cur && (st.picked || cur.connected)) return cur;
  const byNum = [...nodes].sort((a, b) => nodeModule(a) - nodeModule(b));
  return byNum.find(n => n.connected) ?? (cur ?? byNum[0] ?? null);
}

let stopShared: (() => void) | null = null;
let unsub: (() => void) | null = null;

function mirror() {
  const n = choose(), st = useEspTtlStore.getState();
  if (n && (n.id !== st.nodeId || n.url.replace(/\/+$/, '') !== st.url)) {
    useEspTtlStore.setState({ nodeId: n.id, url: n.url.replace(/\/+$/, ''), ...(n.id !== st.nodeId ? { tel: null, online: false, lastError: null } : {}) });
  }
  if (n?.connected && n.telemetry) {
    if (st.tel !== n.telemetry) st._apply(n.telemetry as TtlTelemetry, n.latencyMs, null);
  } else if (st.online || st.lastError == null) {
    useEspTtlStore.getState()._apply(null, null, n ? 'no reply' : 'no module yet');
  }
}

/** Show the page's board while the page is open. The interval argument is kept for old callers; the shared reader sets the pace. */
export function startTtlPoll(_intervalMs?: number): () => void {
  stopTtlPoll();
  adoptOldUrl();
  stopShared = startEspPoll();
  unsub = useEspNodesStore.subscribe(mirror);
  mirror();
  useEspTtlStore.getState().setPolling(true);
  return stopTtlPoll;
}

export function stopTtlPoll() {
  unsub?.(); unsub = null;
  stopShared?.(); stopShared = null;
  useEspTtlStore.getState().setPolling(false);
}

// ── every module at once ──────────────────────────────────────────────────────
// A frame holds the angles of ALL modules. Servo ids repeat on every board (1..9 on each), so a joint is named
// "module:servo", e.g. "2:5" = module 2, servo 5. Old frames with a bare "5" were recorded on module 1.

export const jointKey = (mod: number, id: number) => `${mod}:${id}`;
export function splitKey(k: string): { mod: number; id: number } {
  const m = /^(\d+):(\d+)$/.exec(k);
  return m ? { mod: Number(m[1]), id: Number(m[2]) } : { mod: 1, id: Number(k) };
}

export interface LiveBoard { mod: number; url: string; tel: TtlTelemetry }

/** Every module board that is online now, one per module (the page's own board for its module). */
export function liveBoards(): LiveBoard[] {
  const out = new Map<number, LiveBoard>(), page = pageNode();
  useEspNodesStore.getState().nodes.forEach((n, i) => {
    if (!n.connected || !n.telemetry) return;
    const mod = moduleNumber(n.url, n.name, i);
    if (out.has(mod) && n !== page) return;
    out.set(mod, { mod, url: n.url.replace(/\/+$/, ''), tel: n.telemetry as TtlTelemetry });
  });
  return [...out.values()].sort((a, b) => a.mod - b.mod);
}

/** Where module `mod` is reached: the selected board for its module, else the online one, else any with that number. */
export function boardUrl(mod: number): string | null {
  const page = pageNode();
  if (page && nodeModule(page) === mod) return page.url.replace(/\/+$/, '');
  const ns = useEspNodesStore.getState().nodes.filter((x, i) => moduleNumber(x.url, x.name, i) === mod);
  const n = ns.find(x => x.connected) ?? ns[0];
  return n ? n.url.replace(/\/+$/, '') : null;
}

/** Split a frame's angles per module: {1: {3: 180, ...}, 2: {...}}. */
export function byModule(pose: Record<string, number>): Map<number, Record<number, number>> {
  const out = new Map<number, Record<number, number>>();
  for (const [k, deg] of Object.entries(pose)) {
    const { mod, id } = splitKey(k);
    if (!Number.isFinite(id)) continue;
    (out.get(mod) ?? out.set(mod, {}).get(mod)!)[id] = deg;
  }
  return out;
}

/** Current angles of every connected servo on EVERY online module — what "record" captures. */
export function currentPose(): Record<string, number> {
  const pose: Record<string, number> = {};
  for (const b of liveBoards()) {
    for (const s of b.tel.servos ?? []) {
      if (s.currentAngle != null) pose[jointKey(b.mod, s.id)] = Math.round(s.currentAngle * 10) / 10;
    }
  }
  return pose;
}
