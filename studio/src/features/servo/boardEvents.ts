/**
 * What the boards themselves say, in the Servos page's Debug Log (Nischay, 5 Nov 2026: "when it reconnects it should
 * log what made it disconnect").
 *
 * Every board keeps its own log (Wi-Fi drops with the radio's reason, heartbeat losses, restarts with the reason and
 * the supply in its last second, guard trips, why an animation stopped). This follows it with /api/log?after=<ms>
 * (only new lines, so it is cheap) and adds the laptop's own view: when a board stopped answering and for how long.
 * Board lines go in as [ESP]; the laptop's view as [SYS]. Lines are explained in plain words where the board's are terse.
 *
 * REUSE-CHECKED: log|debug log|api/log -> integrationStore.pushCtrlLog is the Debug Log itself (used as is);
 * espPoll.ts asks boards for telemetry (online/offline for the top bar), nothing reads the boards' own logs.
 */
import { useEspNodesStore } from '@/state/espNodesStore';
import { useIntegrationStore } from '@/state/integrationStore';

const EVERY_MS = 2000;
const TIMEOUT_MS = 1500;
const QUIET = /tuned$|tuning |mDNS up|mdns_responder|ArduinoOTA listening|HTTP server up|WiFi try |bus re-init|loaded \d+ home/;

// The radio's disconnect reasons (ESP-IDF wifi_err_reason_t), in plain words.
const WIFI_REASON: Record<string, string> = {
  '1': 'the laptop dropped it',
  '2': 'its login expired',
  '3': 'the network was switched off',
  '4': 'it was idle too long',
  '6': 'the laptop did not know it yet',
  '7': 'the laptop did not know it yet',
  '8': 'it left by itself (switching network)',
  '15': 'the password handshake timed out',
  '200': 'the network vanished (no beacons)',
  '201': 'the network was not found',
  '202': 'wrong password or login refused',
  '203': 'joining failed',
  '204': 'the password handshake failed',
};

function explain(line: string): { level: string; msg: string } | null {
  const text = line.replace(/^\[\s*\d+\]\s?/, '');
  if (!text || QUIET.test(text)) return null;
  const w = text.match(/WiFi lost \(reason (\d+)\)/);
  if (w) return { level: 'offline', msg: `Wi-Fi dropped: ${WIFI_REASON[w[1]] ?? `reason ${w[1]}`}` };
  if (/heartbeat silent/.test(text)) return { level: 'offline', msg: `the laptop went quiet, rejoining: ${text.replace(/^heartbeat silent /, '')}` };
  if (/^WiFi up/.test(text)) return { level: 'ok', msg: text };
  if (/BROWNOUT|PANIC|WATCHDOG|could not keep up|guard: .* hit|anim stopped|too hot|current spike|switched off or lost power/.test(text))
    return { level: 'error', msg: text };
  if (/last reset|BEFORE THAT RESET|supply in its last second|guard:|anim /.test(text)) return { level: 'warn', msg: text };
  return { level: 'info', msg: text };
}

interface Follow { after: number; uptime: number; failSince: number; first: boolean; ip: string; misses: number }
const follow = new Map<string, Follow>();
let timer: ReturnType<typeof setInterval> | null = null;

// Ask the board by its address, not its name: measured 5 Nov 2026, looking 'mod1.local' up froze for up to 18.6 s
// while the board answered its address in 80 ms, which showed as "stopped answering" with no reason from the board.
// The name is used only to learn the address (and again after a few misses, in case the address changed).
async function ask(nd: { url: string }, f: Follow, path: string): Promise<string> {
  const base = nd.url.replace(/\/$/, '');
  if (!f.ip || f.misses >= 3) {
    const h = await (await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(4000) })).json();
    if (h?.ip) { f.ip = h.ip; f.misses = 0; }
  }
  const r = await fetch(`${f.ip ? `http://${f.ip}` : base}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  f.misses = 0;
  return r.text();
}

async function poll() {
  const log = useIntegrationStore.getState().pushCtrlLog;
  for (const nd of useEspNodesStore.getState().nodes) {
    const f = follow.get(nd.id) ?? { after: 0, uptime: 0, failSince: 0, first: true, ip: '', misses: 0 };
    follow.set(nd.id, f);
    let txt: string;
    try {
      txt = await ask(nd, f, `/api/log?after=${f.after}`);
    } catch {
      f.misses++;
      if (!f.failSince && !f.first) {           // it had answered before: it just went quiet
        f.failSince = Date.now();
        log('offline', 'SYS', `${nd.name} stopped answering`);
      }
      continue;
    }
    if (f.failSince) {
      const gone = (Date.now() - f.failSince) / 1000;
      log('ok', 'SYS', `${nd.name} answering again after ${gone.toFixed(1)} s - its own reason follows`);
      f.failSince = 0;
    }
    const lines = txt.split('\n').filter(Boolean);
    const up = lines[0]?.startsWith('uptime ') ? Number(lines.shift()!.slice(7)) : NaN;
    if (Number.isFinite(up)) {
      if (f.uptime && up < f.uptime) {         // uptime went back: it restarted; read its new log from the start
        log('error', 'SYS', `${nd.name} RESTARTED - why, below`);
        f.after = 0; f.uptime = up; follow.set(nd.id, f);
        continue;
      }
      f.uptime = up;
    }
    let shown = lines;
    if (f.first) {                              // the first look: only what matters from before, not the whole ring
      shown = lines.filter((l) => { const e = explain(l); return e && e.level !== 'info' && e.level !== 'ok'; }).slice(-8);
      if (shown.length) log('info', 'SYS', `${nd.name}: earlier on the board`);
      f.first = false;
    }
    for (const l of shown) { const e = explain(l); if (e) log(e.level, 'ESP', `${nd.name}: ${e.msg}`); }
    for (const l of lines) { const ms = Number(l.match(/^\[\s*(\d+)\]/)?.[1]); if (ms > f.after) f.after = ms; }
  }
}

/** Start following every board's log (once; safe to call again). */
export function startBoardEvents(): () => void {
  if (!timer) timer = setInterval(() => { void poll(); }, EVERY_MS);
  return () => { if (timer) clearInterval(timer); timer = null; };
}
