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

export const DEFAULT_SPIN_RPM = 30;
const rpmToRadPerSec = (rpm: number) => (rpm * Math.PI) / 30; // rev/min → rad/s

type Dir = 1 | -1;

// jointId → spin direction. A plain module-level store; components subscribe via the
// useSpin hook below (useSyncExternalStore) so CW/CCW buttons light up reactively.
const spins = new Map<string, Dir>();
const listeners = new Set<() => void>();
let rafId: number | null = null;
let lastT = 0;

const emit = () => { for (const fn of listeners) fn(); };

function wrapPi(v: number) {
  const TWO_PI = Math.PI * 2;
  let x = (v + Math.PI) % TWO_PI;
  if (x < 0) x += TWO_PI;
  return x - Math.PI;
}

function tick(now: number) {
  const dt = lastT ? Math.min((now - lastT) / 1000, 0.1) : 0; // clamp big gaps (tab away)
  lastT = now;
  if (spins.size > 0 && dt > 0) {
    const { applyTransient } = useModelStore.getState();
    applyTransient((d: Document) => {
      let next = d;
      for (const [id, dir] of spins) {
        const j: any = (next.joints as any)[id];
        if (!j) continue;
        const rpm = j.meta?.spinRpm ?? DEFAULT_SPIN_RPM;
        const v = wrapPi((j.state?.value ?? 0) + dir * rpmToRadPerSec(rpm) * dt);
        next = { ...next, joints: { ...next.joints, [id]: { ...j, state: { ...j.state, value: v } } } };
      }
      return next;
    });
  }
  rafId = spins.size > 0 ? requestAnimationFrame(tick) : null;
}

function ensureLoop() {
  if (rafId == null && spins.size > 0) { lastT = 0; rafId = requestAnimationFrame(tick); }
}

/** Commit the joint's current transient value as one undoable step so it persists. */
function commit(id: string) {
  const j: any = (useModelStore.getState().doc.joints as any)[id];
  if (j) useModelStore.getState().dispatch(commands.setJointValue(id, j.state?.value ?? 0));
}

/** Start/stop spinning a joint in `dir`. Clicking the active direction again stops it. */
export function toggleSpin(jointId: string, dir: Dir) {
  if (spins.get(jointId) === dir) { stopSpin(jointId); return; }
  // Backstop: refuse to spin a joint trapped in a rigid loop (UI also disables it).
  if (!canJointSpin(useModelStore.getState().doc, jointId)) return;
  spins.set(jointId, dir);
  emit();
  ensureLoop();
}

/** Stop one joint and commit where it landed. */
export function stopSpin(jointId: string) {
  if (!spins.has(jointId)) return;
  spins.delete(jointId);
  emit();
  commit(jointId);
}

/** Stop every spinning joint (used by Home). Does not reset values — the caller does. */
export function stopAllSpins() {
  if (spins.size === 0) return;
  const ids = [...spins.keys()];
  spins.clear();
  emit();
  for (const id of ids) commit(id);
}

/** Current spin direction of a joint, or 0 if not spinning. */
export function getSpin(jointId: string): Dir | 0 {
  return spins.get(jointId) ?? 0;
}

/** Snapshot of all currently spinning joints → direction. Used to drive the physics
 *  sim's wheel velocity motors while gravity is on. */
export function getActiveSpins(): Record<string, Dir> {
  const out: Record<string, Dir> = {};
  for (const [id, dir] of spins) out[id] = dir;
  return out;
}

/** React hook: re-renders when the given joint's spin direction changes. */
export function useSpin(jointId: string): Dir | 0 {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => spins.get(jointId) ?? 0,
  );
}
