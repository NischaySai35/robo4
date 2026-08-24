/**
 * magnetEngine — the master control loop for the electromagnet locks.
 *
 * Runs at 10 Hz. Each tick it:
 *   1. derives which end magnets SHOULD be energized from the live lock joints
 *      (commandedMagnets) — a magnet turns on exactly when its end connector locks,
 *      which happens at the END of the snap/mate animation (the joint is committed
 *      in the animation's commit callback), so magnets fire "after align + join";
 *   2. resolves each magnet's target level through its manual override + grab→hold
 *      power profile (100% grab for grabMs, then ease to holdPct);
 *   3. pushes the level to the owning module's ESP32-C3 (DRV8833) ONLY when the
 *      integer % changes, so a settled lock generates ~zero traffic;
 *   4. writes the commanded levels back to the store for the UI meters.
 *
 * Magnets have no feedback, so what we display is the commanded state, not a reading.
 */
import { useModelStore } from '@/state/modelStore';
import { useMagnetStore, type MagnetRuntime } from '@/state/magnetStore';
import { useEspNodesStore } from '@/state/espNodesStore';
import { listMagnets, commandedMagnets, channelOf } from './magnetModel';

const TICK_MS = 100;

// Last integer % actually sent per magnet — so we only hit the network on change.
const lastSent = new Map<string, number>();
// Per-magnet on-phase bookkeeping (persists across ticks).
const phaseSince = new Map<string, number>();

let timer: ReturnType<typeof setInterval> | null = null;

export function startMagnetEngine(): () => void {
  if (timer) return () => stopMagnetEngine();
  timer = setInterval(tick, TICK_MS);
  return () => stopMagnetEngine();
}

export function stopMagnetEngine(): void {
  if (timer) { clearInterval(timer); timer = null; }
}

function tick() {
  const doc = useModelStore.getState().doc;
  const store = useMagnetStore.getState();
  const magnets = listMagnets(doc);
  if (magnets.length === 0) {
    if (Object.keys(store.runtime).length) store.setRuntime({});
    return;
  }

  const commanded = commandedMagnets(doc);
  const now = performance.now();
  const runtime: Record<string, MagnetRuntime> = {};

  for (const m of magnets) {
    const id = m.magnetId;
    const mode = store.modeOf(id);
    const profile = store.profileOf(id);

    // Decide whether this magnet is "on" this tick and at what level.
    let on: boolean;
    let level: number;
    let phase: MagnetRuntime['phase'];

    if (mode === 'off') {
      on = false; level = 0; phase = 'off';
    } else if (mode === 'on') {
      // Manual hold at a fixed level (no grab ramp) — full user control.
      on = true;
      level = store.overrides[id]?.level ?? profile.holdPct;
      phase = 'hold';
    } else {
      // AUTO — follow the lock joints, applying the grab→hold profile.
      on = commanded.has(id);
      if (on) {
        let since = phaseSince.get(id);
        if (since == null) { since = now; phaseSince.set(id, now); }
        if (now - since < profile.grabMs) { level = profile.grabPct; phase = 'grab'; }
        else { level = profile.holdPct; phase = 'hold'; }
      } else {
        level = 0; phase = 'off';
      }
    }

    if (!on) phaseSince.delete(id);
    runtime[id] = { level, phase, since: phaseSince.get(id) ?? now };

    // ── Push to hardware on change ────────────────────────────────────────────
    const pct = Math.round(level);
    if (lastSent.get(id) !== pct) {
      lastSent.set(id, pct);
      if (store.hardwareEnabled) sendMagnet(doc, m.moduleId, id, pct);
    }
  }

  // Drop stale bookkeeping for magnets that no longer exist.
  for (const key of [...lastSent.keys()]) if (!runtime[key]) lastSent.delete(key);

  store.setRuntime(runtime);
}

/** Route one magnet PWM command to the ESP32-C3 that drives its module. */
function sendMagnet(
  doc: ReturnType<typeof useModelStore.getState>['doc'],
  moduleId: string,
  magnetId: string,
  pct: number,
) {
  const node = useEspNodesStore.getState().nodeForModule(moduleId);
  if (!node) return; // module has no ESP assigned yet → simulation-only
  const ch = channelOf(doc, magnetId);
  if (ch < 0) return;
  fetch(`${node.url}/api/magnet?ch=${ch}&pct=${pct}`, { signal: AbortSignal.timeout(4000) }).catch(() => {
    // The espPoll loop owns node connection state; a magnet send failure is transient.
  });
}
