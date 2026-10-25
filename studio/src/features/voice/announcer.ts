/**
 * announcer — watches the boards and speaks about what happens on its own:
 * a module appearing / dropping, and the battery sagging.
 *
 * It looks at both sources of module data (the module registry that the whole app polls,
 * and the ESP-TTL page's own board) and merges them by URL, so one physical board is
 * announced once however many places know about it.
 */
import { useEspNodesStore } from '@/state/espNodesStore';
import { useEspTtlStore } from '@/state/espTtlStore';
import { useVoiceStore } from './voiceStore';
import { speak, checkVoiceModel, downloadVoiceModel, warmUp } from './speech';
import { WARM_PHRASES } from './phrases';
import { BATT_WARN_V, warnLevel } from './battery';

interface Board { url: string; name: string; online: boolean; volts: number | null }

const norm = (u: string) => u.replace(/\/+$/, '').toLowerCase();

function avgVolts(servos: any[] | undefined): number | null {
  const v = (servos ?? []).filter(s => s.connected !== false && s.voltageV != null && s.voltageV > 3)
                          .map(s => s.voltageV as number);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function boards(): Board[] {
  const out = new Map<string, Board>();
  for (const n of useEspNodesStore.getState().nodes) {
    out.set(norm(n.url), { url: n.url, name: n.name, online: n.connected, volts: avgVolts((n.telemetry as any)?.servos) });
  }
  const t = useEspTtlStore.getState();
  const k = norm(t.url);
  if (!out.has(k) || (t.online && !out.get(k)!.online)) {
    out.set(k, {
      url: t.url, name: (t.tel?.wifi?.hostname ?? 'module'), online: t.online,
      volts: avgVolts(t.tel?.servos as any[]),
    });
  }
  return [...out.values()];
}

// ── connection ────────────────────────────────────────────────────────────────
const wasOnline = new Map<string, boolean>();
const missed = new Map<string, number>();

function checkConnections() {
  const list = boards();
  const many = list.length > 1;
  for (const b of list) {
    const k = norm(b.url);
    const was = wasOnline.get(k) ?? false;
    if (b.online) {
      missed.set(k, 0);
      if (!was) {
        wasOnline.set(k, true);
        speak(many ? `${b.name} detected, connected!` : 'Module detected, connected!', { key: `conn-${k}`, cooldownMs: 8000 });
      }
    } else if (was) {
      // One missed poll is normal (the board is single-threaded); only call it a drop
      // after several in a row.
      const m = (missed.get(k) ?? 0) + 1;
      missed.set(k, m);
      if (m >= 4) {
        wasOnline.set(k, false);
        speak(many ? `${b.name} disconnected` : 'Module disconnected', { key: `disc-${k}`, cooldownMs: 8000 });
      }
    }
  }
}

// ── battery ───────────────────────────────────────────────────────────────────
// level = the 0.1 V step the voltage sits in (see warnLevel).
// A warning is spoken the first time a board is at/below 10.6 and again for each further
// step down. It re-arms only once the voltage has recovered a clear margin, so a reading
// that wobbles around a boundary doesn't repeat itself.
const lastLevel = new Map<string, number>();
const pending = new Map<string, { level: number; n: number }>();
const RECOVER_V = BATT_WARN_V + 0.2;

function checkBattery() {
  if (!useVoiceStore.getState().battery) return;
  const list = boards();
  const many = list.length > 1;
  for (const b of list) {
    if (!b.online || b.volts == null) continue;
    const k = norm(b.url);
    if (b.volts >= RECOVER_V) { lastLevel.delete(k); pending.delete(k); continue; }
    if (b.volts >= BATT_WARN_V) continue;

    const lv = warnLevel(b.volts);
    const last = lastLevel.get(k) ?? Infinity;
    if (lv >= last) { pending.delete(k); continue; }

    // Require the lower level on two polls in a row before speaking.
    const p = pending.get(k);
    if (!p || p.level !== lv) { pending.set(k, { level: lv, n: 1 }); continue; }
    if (++p.n < 2) continue;

    lastLevel.set(k, lv); pending.delete(k);
    const who = many ? `${b.name} ` : '';
    const critical = lv <= 10.5 ? ' Charge now.' : '';
    speak(`${who}Battery low, ${lv.toFixed(1)} volts.${critical}`, { urgent: true, key: `batt-${k}-${lv}`, cooldownMs: 0 });
  }
}

// ── start-up ──────────────────────────────────────────────────────────────────
let started = false;

export function initVoiceAnnouncer() {
  if (started) return;
  started = true;

  void checkVoiceModel().then(() => {
    const S = useVoiceStore.getState();
    if (S.enabled && S.model === 'missing') void downloadVoiceModel();
    else void warmUp(WARM_PHRASES);
  });
  // When the download finishes, pre-render the common phrases.
  let prev = useVoiceStore.getState().model;
  useVoiceStore.subscribe((s) => {
    if (s.model !== prev) { prev = s.model; if (s.model === 'ready') void warmUp(WARM_PHRASES); }
  });

  const tick = () => { checkConnections(); checkBattery(); };
  useEspNodesStore.subscribe(tick);
  useEspTtlStore.subscribe(tick);
}
