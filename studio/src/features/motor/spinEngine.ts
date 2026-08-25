/**
 * spinEngine — continuous-rotation ("motor") driver for joints flagged spinnable.
 *
 * A normal revolute joint is clamped to its limits (e.g. −180°…180°) and posed by
 * hand or by IK. A spinnable joint models a real motor: pressing CW / CCW makes it
 * rotate continuously past its limits at a set speed (rpm) until stopped or Homed.
 *
 * The per-frame value updates go through applyTransient so they never flood undo
 * history; the settled value is committed once as an undoable step when the spin
 * stops (so Ctrl+Z / autosave capture where it ended up).
 *
 * Speed is read from the model each frame (joint.meta.spinRpm) so editing rpm mid-
 * spin takes effect live. Values are wrapped to (−π, π] to keep the float bounded —
 * a rotation matrix is periodic so the wrap is visually seamless.
 */
import { useSyncExternalStore } from 'react';
import { useModelStore } from '@/state/modelStore';
import { commands } from '@/core/commands/index';
import type { Document } from '@/core/model/index';
import { canJointSpin } from './spinFreedom';
// The registry itself lives below the UI line so serialization and the physics sim can
// read it without importing this React-driven module — see core/motor/spinState.
import {
  DEFAULT_SPIN_RPM, rpmToRadPerSec, getSpin, getActiveSpins, subscribeSpin,
  emitSpinChange as emit, setSpin, deleteSpin, hasSpin, clearSpins, noSpins,
  spinningIds, eachSpin, type Dir,
} from '@/core/motor/spinState';

// Re-exported so existing importers of spinEngine are unaffected by the split.
export { DEFAULT_SPIN_RPM, getSpin, getActiveSpins };
export type { Dir };

let rafId: number | null = null;
let lastT = 0;

function wrapPi(v: number) {
  const TWO_PI = Math.PI * 2;
  let x = (v + Math.PI) % TWO_PI;
  if (x < 0) x += TWO_PI;
  return x - Math.PI;
}

function tick(now: number) {
  const dt = lastT ? Math.min((now - lastT) / 1000, 0.1) : 0; // clamp big gaps (tab away)
  lastT = now;
  if (!noSpins() && dt > 0) {
    const { applyTransient } = useModelStore.getState();
    applyTransient((d: Document) => {
      let next = d;
      eachSpin((id, dir) => {
        const j: any = (next.joints as any)[id];
        if (!j) return;
        const rpm = j.meta?.spinRpm ?? DEFAULT_SPIN_RPM;
        const v = wrapPi((j.state?.value ?? 0) + dir * rpmToRadPerSec(rpm) * dt);
        next = { ...next, joints: { ...next.joints, [id]: { ...j, state: { ...j.state, value: v } } } };
      });
      return next;
    });
  }
  rafId = noSpins() ? null : requestAnimationFrame(tick);
}

function ensureLoop() {
  if (rafId == null && !noSpins()) { lastT = 0; rafId = requestAnimationFrame(tick); }
}

/** Commit the joint's current transient value as one undoable step so it persists. */
function commit(id: string) {
  const j: any = (useModelStore.getState().doc.joints as any)[id];
  if (j) useModelStore.getState().dispatch(commands.setJointValue(id, j.state?.value ?? 0));
}

/** Start/stop spinning a joint in `dir`. Clicking the active direction again stops it. */
export function toggleSpin(jointId: string, dir: Dir) {
  if (getSpin(jointId) === dir) { stopSpin(jointId); return; }
  // Backstop: refuse to spin a joint trapped in a rigid loop (UI also disables it).
  if (!canJointSpin(useModelStore.getState().doc, jointId)) return;
  setSpin(jointId, dir);
  emit();
  ensureLoop();
}

/** Stop one joint and commit where it landed. */
export function stopSpin(jointId: string) {
  if (!hasSpin(jointId)) return;
  deleteSpin(jointId);
  emit();
  commit(jointId);
}

/** Stop every spinning joint (used by Home). Does not reset values — the caller does. */
export function stopAllSpins() {
  if (noSpins()) return;
  const ids = spinningIds();
  clearSpins();
  emit();
  for (const id of ids) commit(id);
}

/** React hook: re-renders when the given joint's spin direction changes. */
export function useSpin(jointId: string): Dir | 0 {
  return useSyncExternalStore(
    subscribeSpin,
    () => getSpin(jointId),
  );
}
