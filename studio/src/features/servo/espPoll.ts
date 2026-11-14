/**
 * espPoll — continuous telemetry polling for EVERY module ESP node (multi-ESP).
 *
 * The master keeps a live link to all boards at once (mod1.local, mod2.local, …),
 * writing each node's /api/telemetry into espNodesStore. One in-flight request per
 * node; an offline board just fails fast and is retried at a slower cadence so it
 * never stalls the healthy ones. Started once from SimCanvas.
 *
 * Aggregate figures (any-connected, total current) are mirrored into integrationStore
 * so the app header + Analysis telemetry keep working unchanged.
 */
import { useEspNodesStore, espNowUrl, GATEWAY_URL } from '@/state/espNodesStore';
import { useIntegrationStore, type BoardStat } from '@/state/integrationStore';
import { VERIFY_URL } from '@/robotics/msrr2/simScene';
import { usePageStore } from '@/state/pageStore';

const POLL_MS = 1000;      // healthy-node cadence: a tiny /api/health. 12 Nov heat: 120 -> 450 -> 1000 ms (every ask wakes the module's radio)
const RETRY_MS = 1500;     // offline-node retry cadence (don't hammer)
const TIMEOUT_MS = 4000;
// no good reply this long = offline; one missed reply is not (the radio naps while the robot stands still).
// SAME rule as the MSRR Sync box (sim/real_sync.py OFFLINE_AFTER_S).
const OFFLINE_AFTER_MS = 3000;
const lastOk = new Map<string, number>();
// the board's own address from its telemetry (wifi.ip), and whether to knock there instead of at its name. 5 Nov: after ROBO4-NET
// restarted, the board spent 9 s on the house Wi-Fi (the laptop is on both) and came back in 12 s, but the laptop kept
// 'mod1.local' = its house-Wi-Fi address for ~5 min. A miss on the name tries the last good address, a miss there the name again.
const lastIp = new Map<string, string>();
const useIp = new Set<string>();
const viaIp = (url: string, ip: string) => url.replace(/^(https?:\/\/)[^/:]+/, `$1${ip}`);

const inFlight = new Set<string>();
const nextAt = new Map<string, number>();
let timer: ReturnType<typeof setInterval> | null = null;

// Several pages use this one reader (the 3D view and the ESP-TTL page). Each start hands back its own stop, and the
// reader only really stops when the last user has stopped, so closing one page never blinds the other.
let users = 0;
export function startEspPoll(): () => void {
  users++;
  if (!timer) timer = setInterval(pump, POLL_MS);
  let done = false;
  return () => { if (done) return; done = true; if (--users <= 0) { users = 0; stopEspPoll(); } };
}

export function stopEspPoll(): void {
  if (timer) { clearInterval(timer); timer = null; }
  inFlight.clear(); nextAt.clear(); lastOk.clear(); useIp.clear();
}

// ONE asker per board (Nischay 12 Nov: "only 1 code to communicate"). The physics service's link (sim/real_sync.py ModuleLink,
// the SAME one Sync sends through) is the only thing that talks to a board: this page hands it the module list and reads its
// answers back (GET /boards?hosts=...). The page asks a board itself ONLY while the service is not running at all - never both.
// (5 Nov / 12 Nov: two askers on one small ESP said online here and offline there.)
type ServiceBoard = { online: boolean; age_s: number | null; tel_age_s: number | null; ms: number | null; ip: string | null; error: string; tel: any };
let service: Record<string, ServiceBoard> = {};
let serviceUp = false, serviceBusy = false;
const appliedTel = new Map<string, unknown>();                 // board's own clock (tel.ms) of the reading last shown, per node
async function pollService() {
  if (serviceBusy) return; serviceBusy = true;
  try {
    const hosts = useEspNodesStore.getState().nodes.map((n) => hostOf(n.url));
    const fast = usePageStore.getState().page === 'esptt' ? hosts : [];      // the ESP-TTL page's live servo tables
    const q = new URLSearchParams({ hosts: hosts.join(','), fast: fast.join(',') });
    const r = await fetch(`${VERIFY_URL}/boards?${q}`, { cache: 'no-store', signal: AbortSignal.timeout(1000) });
    service = (await r.json())?.boards ?? {}; serviceUp = true;
  } catch { service = {}; serviceUp = false; }                  // no service: the page asks each board itself
  finally { serviceBusy = false; }
}
// host WITH its port: the service keys links by URL.host (12 Nov: bare addresses mixed 127.0.0.1:18081 / :18082 up)
const hostOf = (url: string) => { try { return new URL(url).host; } catch { return url; } };
/** true = the service speaks for this board (even before its first answer): the page does not ask it */
function fromService(id: string, url: string): boolean {
  if (!serviceUp) return false;
  const b = service[hostOf(url)];
  if (!b) return true;                                          // its link was just made: the answer comes with the next read
  const st = useEspNodesStore.getState();
  if (!b.online) { st.setNodeConnected(id, false); return true; }
  if (typeof b.tel?.wifi?.ip === 'string' && b.tel.wifi.ip) lastIp.set(id, b.tel.wifi.ip);
  if (b.tel?.ok && appliedTel.get(id) !== b.tel.ms) { appliedTel.set(id, b.tel.ms); st.setNodeTelemetry(id, b.tel, b.ms ?? 0); }
  else st.setNodeConnected(id, true);
  lastOk.set(id, Date.now() - (b.age_s ?? 0) * 1000);
  return true;
}

// Finding modules: the radio gateway already knows them (heard over ESP-NOW, or remembered / found on the Wi-Fi), so it is
// asked, not the network again. A module it names (mod3) that is not in the list yet is added as http://127.0.4.3, which
// is what mod3.local means on this laptop too (tools/espnow/install.ps1). Boards with other names: typed in by hand.
// REUSE-CHECKED: discover|find_modules|gateway|8790 -> espnow.Gateway.status + hardware.find_modules (Python) do the
// finding; nothing in the Studio read them. This only reads that list.
const GATEWAY_EVERY_MS = 3000;
let gatewayAt = 0, gatewayBusy = false;
async function pollGateway() {
  if (gatewayBusy || Date.now() - gatewayAt < GATEWAY_EVERY_MS) return;
  gatewayBusy = true; gatewayAt = Date.now();
  try {
    const r = await fetch(`${GATEWAY_URL}/`, { cache: 'no-store', signal: AbortSignal.timeout(1000) });
    const g = await r.json();
    addModules([...(g?.modules ?? []).map((m: any) => m?.name), ...Object.keys(g?.wifi ?? {})]);
  } catch { /* no gateway running: boards typed in by hand still work */ }
  finally { gatewayBusy = false; }
}

/** Add every modN named here that the list does not have yet. Exported for tests. */
export function addModules(names: unknown[]) {
  const st = useEspNodesStore.getState();
  const have = new Set(st.nodes.map((n, i) => moduleNumber(n.url, n.name, i)));
  for (const name of names) {
    const m = /^mod(\d{1,3})$/.exec(String(name ?? ''));
    if (!m || have.has(Number(m[1]))) continue;
    have.add(Number(m[1]));
    st.addNode({ url: espNowUrl(Number(m[1])), name: `Module ${m[1]}` });
  }
}

function pump() {
  const now = Date.now();
  const nodes = useEspNodesStore.getState().nodes;
  pollService();
  pollGateway();
  for (const node of nodes) {
    if (fromService(node.id, node.url)) continue;
    if (inFlight.has(node.id)) continue;
    if ((nextAt.get(node.id) ?? 0) > now) continue;
    pollNode(node.id, node.url);
  }
  aggregate();
}

// 12 Nov (Nischay: "why does it ask for positions when Sync is off?"): the full status is ~4.6 KB (~20 radio packets).
// "Is it online?" only needs the tiny /api/health (~200 B, one packet). Full status: always on the ESP-TTL page (live servo
// tables), else every FULL_EVERY_MS for the top bar's battery / current / temperature. (Sync reads its own, in the service.)
const FULL_EVERY_MS = 10000;   // the top bar's battery / current / temperature (12 Nov heat: 3 s -> 10 s)
const lastFull = new Map<string, number>();
async function pollHealth(id: string, url: string, t0: number): Promise<boolean> {
  const res = await fetch(`${url}/api/health`, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
  const text = await res.text();
  if (!res.ok || !text.startsWith('{"ok":true')) return false;
  useEspNodesStore.getState().setNodeConnected(id, true, Date.now() - t0); lastOk.set(id, Date.now());
  nextAt.set(id, Date.now() + POLL_MS);
  return true;
}

async function pollNode(id: string, url: string) {
  inFlight.add(id);
  const t0 = Date.now();
  try {
    const wantFull = usePageStore.getState().page === 'esptt' || Date.now() - (lastFull.get(id) ?? 0) >= FULL_EVERY_MS;
    if (!wantFull) {
      if (await pollHealth(id, url, t0)) return;
      throw new Error('no health reply');
    }
    lastFull.set(id, Date.now());
    const ip = lastIp.get(id);
    const res = await fetch(`${useIp.has(id) && ip ? viaIp(url, ip) : url}/api/telemetry`, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); }
    catch {
      // it ANSWERED, the reply was damaged (12 Nov: firmware cut "espnow":} out of a 4.6 KB reply) -> online, keep the last telemetry
      if (res.ok && text.startsWith('{"ok":true')) {
        useEspNodesStore.getState().setNodeConnected(id, true, Date.now() - t0); lastOk.set(id, Date.now());
        nextAt.set(id, Date.now() + POLL_MS); return;
      }
      throw new Error('bad reply');
    }
    if (typeof data?.wifi?.ip === 'string' && data.wifi.ip) lastIp.set(id, data.wifi.ip);
    const lat = Date.now() - t0;
    if (data?.ok) {
      useEspNodesStore.getState().setNodeTelemetry(id, data, lat); lastOk.set(id, Date.now());
      nextAt.set(id, Date.now() + POLL_MS);
    } else {
      missed(id);
    }
  } catch {
    missed(id);
  } finally {
    inFlight.delete(id);
  }
}

function missed(id: string) {
  if (lastIp.has(id)) { if (useIp.has(id)) useIp.delete(id); else useIp.add(id); }   // alternate name <-> last good address
  if (Date.now() - (lastOk.get(id) ?? 0) < OFFLINE_AFTER_MS) { nextAt.set(id, Date.now() + POLL_MS); return; }   // a nap, not offline
  useEspNodesStore.getState().setNodeConnected(id, false);
  nextAt.set(id, Date.now() + RETRY_MS);
}

/** The module number from the board's name: http://mod3.local or the ESP-NOW bridge http://127.0.4.3 -> 3 (else "Module 3", else its place in the list). */
export function moduleNumber(url: string, name: string, index: number): number {
  const m = /mod(\d+)/i.exec(url) ?? /\/\/127\.0\.4\.(\d+)/.exec(url) ?? /(\d+)\s*$/.exec(name);
  return m ? Number(m[1]) : index + 1;
}

// The laptop's own view goes into the same kept log as the modules' and the master's (ESP-TTL > Log, key robo4:esptt:logs):
// every time the Studio sees a module go online / offline (Nischay 12 Nov: "laptop detected / disconnected - all logged").
const wasOn = new Map<string, boolean>();
function logLinkChanges() {
  const nodes = useEspNodesStore.getState().nodes; const add: { t: number; src: string; text: string }[] = [];
  nodes.forEach((n, i) => {
    const was = wasOn.get(n.id); if (was === n.connected) return; wasOn.set(n.id, n.connected);
    if (was === undefined && !n.connected) return;                       // first look at an offline board: nothing changed
    add.push({ t: Date.now(), src: 'laptop', text: `mod${moduleNumber(n.url, n.name, i)} ${n.connected ? 'CONNECTED to the Studio' : `DISCONNECTED from the Studio (no answer for ${OFFLINE_AFTER_MS / 1000} s)`}` });
  });
  if (add.length) keepLaptopLines(add);
}
// Laptop lines are kept small (Nischay 13 Nov: a huge log key made Chrome skip saving the timeline - 6 frames lost).
function keepLaptopLines(add: { t: number; src: string; text: string }[]) {
  try { const k = 'robo4:esptt:logs', l = JSON.parse(localStorage.getItem(k) || '[]'); localStorage.setItem(k, JSON.stringify([...l, ...add].slice(-600))); } catch { /* full / private */ }
}
/** One line from the laptop into ESP-TTL > Log (every button the operator presses, and how it went). */
export function laptopLog(text: string) { keepLaptopLines([{ t: Date.now(), src: 'laptop', text }]); }

// Roll all nodes' servos into the single-number aggregates the header/telemetry read, plus one row per board
// (the header shows the worst board and lists them all on hover).
function aggregate() {
  logLinkChanges();
  const nodes = useEspNodesStore.getState().nodes;
  let anyConnected = false;
  let totalMA = 0;
  let online = 0;
  let vSum = 0, vN = 0;
  let maxChipC: number | null = null;
  const boards: BoardStat[] = [];
  nodes.forEach((nd, i) => {
    if (nd.connected) anyConnected = true;
    const chipC = (nd.telemetry as any)?.chipC;
    if (nd.connected && Number.isFinite(chipC)) maxChipC = Math.max(maxChipC ?? -Infinity, chipC);
    const b: BoardStat = { num: moduleNumber(nd.url, nd.name, i), url: nd.url, online: nd.connected,
                           servos: 0, volt: null, mA: null, chipC: nd.connected && Number.isFinite(chipC) ? chipC : null };
    boards.push(b);
    const servos = (nd.telemetry as any)?.servos as any[] | undefined;
    if (!servos || !nd.connected) return;
    let bv = 0, bvN = 0, bmA = 0;
    for (const sv of servos) {
      if (sv.connected) { online++; b.servos++; }
      if (sv.currentmA != null) { totalMA += sv.currentmA; bmA += sv.currentmA; }
      if (sv.connected && sv.voltageV != null) { vSum += sv.voltageV; vN++; bv += sv.voltageV; bvN++; }
    }
    b.volt = bvN > 0 ? bv / bvN : null;
    b.mA = b.servos > 0 ? bmA : null;
  });
  boards.sort((a, b) => a.num - b.num);
  const I = useIntegrationStore.getState();
  I.setConnected(anyConnected, null);
  I.setServoOnlineCount(online);
  I.setTotalCurrentMA(online > 0 ? totalMA : null);
  I.setAvgVoltage(vN > 0 ? vSum / vN : null);
  I.setMaxChipC(maxChipC);
  I.setBoards(boards);
}
