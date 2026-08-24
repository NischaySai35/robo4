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
import { useEspNodesStore } from '@/state/espNodesStore';
import { useIntegrationStore } from '@/state/integrationStore';

const POLL_MS = 120;       // healthy-node cadence
const RETRY_MS = 1500;     // offline-node retry cadence (don't hammer)
const TIMEOUT_MS = 4000;

const inFlight = new Set<string>();
const nextAt = new Map<string, number>();
let timer: ReturnType<typeof setInterval> | null = null;

export function startEspPoll(): () => void {
  if (timer) return () => stopEspPoll();
  timer = setInterval(pump, POLL_MS);
  return () => stopEspPoll();
}

export function stopEspPoll(): void {
  if (timer) { clearInterval(timer); timer = null; }
  inFlight.clear(); nextAt.clear();
}

function pump() {
  const now = Date.now();
  const nodes = useEspNodesStore.getState().nodes;
  for (const node of nodes) {
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
    const res = await fetch(`${url}/api/telemetry`, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
    const data = await res.json();
    const lat = Date.now() - t0;
    if (data?.ok) {
      useEspNodesStore.getState().setNodeTelemetry(id, data, lat);
      nextAt.set(id, Date.now() + POLL_MS);
    } else {
      useEspNodesStore.getState().setNodeConnected(id, false);
      nextAt.set(id, Date.now() + RETRY_MS);
    }
  } catch {
    useEspNodesStore.getState().setNodeConnected(id, false);
    nextAt.set(id, Date.now() + RETRY_MS);
  } finally {
    inFlight.delete(id);
  }
}

// Roll all nodes' servos into the single-number aggregates the header/telemetry read.
function aggregate() {
  const nodes = useEspNodesStore.getState().nodes;
  let anyConnected = false;
  let totalMA = 0;
  let online = 0;
  let vSum = 0, vN = 0;
  for (const nd of nodes) {
    if (nd.connected) anyConnected = true;
    const servos = (nd.telemetry as any)?.servos as any[] | undefined;
    if (!servos) continue;
    for (const sv of servos) {
      if (sv.connected) online++;
      if (sv.currentmA != null) totalMA += sv.currentmA;
      if (sv.connected && sv.voltageV != null) { vSum += sv.voltageV; vN++; }
    }
  }
  const I = useIntegrationStore.getState();
  I.setConnected(anyConnected, null);
  I.setServoOnlineCount(online);
  I.setTotalCurrentMA(online > 0 ? totalMA : null);
  I.setAvgVoltage(vN > 0 ? vSum / vN : null);
}
