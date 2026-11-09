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

const POLL_MS = 120;       // healthy-node cadence
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

// ONE asker per board (5 Nov: the top bar said online while the Sync box said offline - the service and this page both asked
// the small ESP ~10x a second, its replies grew past the service's timeout). While the physics service talks to a board
// (Sync), its link's telemetry (sim/real_sync.boards_now, GET /boards) is used here and the board is not asked again.
type ServiceBoard = { online: boolean; age_s: number; ms: number; ip: string | null; tel: any };
let service: Record<string, ServiceBoard> = {};
let serviceBusy = false;
async function pollService() {
  if (serviceBusy) return; serviceBusy = true;
  try {
    const r = await fetch(`${VERIFY_URL}/boards`, { cache: 'no-store', signal: AbortSignal.timeout(1000) });
    service = (await r.json())?.boards ?? {};
  } catch { service = {}; }                                    // no service: every board is asked directly, as before
  finally { serviceBusy = false; }
}
const hostOf = (url: string) => { try { return new URL(url).hostname; } catch { return url; } };
function fromService(id: string, url: string): boolean {
  const h = hostOf(url), ip = lastIp.get(id);
  const b = service[h] ?? Object.values(service).find((x) => x.ip && (x.ip === h || x.ip === ip));
  if (!b) return false;
  if (b.tel?.ok && b.age_s * 1000 < OFFLINE_AFTER_MS) {
    if (typeof b.tel?.wifi?.ip === 'string' && b.tel.wifi.ip) lastIp.set(id, b.tel.wifi.ip);
    useEspNodesStore.getState().setNodeTelemetry(id, b.tel, b.ms); lastOk.set(id, Date.now() - b.age_s * 1000);
  } else if (Date.now() - (lastOk.get(id) ?? 0) >= OFFLINE_AFTER_MS) useEspNodesStore.getState().setNodeConnected(id, false);
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

async function pollNode(id: string, url: string) {
  inFlight.add(id);
  const t0 = Date.now();
  try {
    const ip = lastIp.get(id);
    const res = await fetch(`${useIp.has(id) && ip ? viaIp(url, ip) : url}/api/telemetry`, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
    const data = await res.json();
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

// Roll all nodes' servos into the single-number aggregates the header/telemetry read, plus one row per board
// (the header shows the worst board and lists them all on hover).
function aggregate() {
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
