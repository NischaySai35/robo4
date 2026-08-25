/**
 * spinState — which joints are currently spinning, and in which direction.
 *
 * Split out of features/motor/spinEngine because this state has THREE readers on
 * different sides of the UI line: the CW/CCW buttons (React), the physics sim (which
 * drives wheel velocity motors from it), and project serialization (which round-trips
 * mid-spin joints through the .nischay file). Serialization lives in core/ and must not
 * import from features/, so leaving the registry inside the React-driven engine made
 * `serializeProject()` reach up into the UI layer for it.
 *
 * What stayed behind in spinEngine is everything that genuinely needs the UI runtime:
 * the requestAnimationFrame loop, the applyTransient writes, the undo commit, and the
 * useSyncExternalStore hook. This file is the plain registry underneath all of that —
 * no React, no stores, no DOM, so anything may read it.
 */

/** Spin direction: +1 = CW, -1 = CCW. */
export type Dir = 1 | -1;

/** Default motor speed for a spinnable joint, rev/min. */
export const DEFAULT_SPIN_RPM = 30;

/** rev/min -> rad/s. */
export const rpmToRadPerSec = (rpm: number) => (rpm * Math.PI) / 30;

// jointId -> spin direction. A plain module-level registry; the UI subscribes through
// spinEngine's useSpin hook so the CW/CCW buttons light up reactively.
const spins = new Map<string, Dir>();
const listeners = new Set<() => void>();

/** Notify subscribers that the set of spinning joints changed. */
export function emitSpinChange(): void {
  for (const fn of listeners) fn();
}

/** Subscribe to spin changes; returns an unsubscribe function. */
export function subscribeSpin(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Current spin direction of a joint, or 0 if it is not spinning. */
export function getSpin(jointId: string): Dir | 0 {
  return spins.get(jointId) ?? 0;
}

/**
 * Snapshot of all currently spinning joints -> direction. Used to drive the physics
 * sim's wheel velocity motors while gravity is on, and to persist mid-spin joints.
 */
export function getActiveSpins(): Record<string, Dir> {
  const out: Record<string, Dir> = {};
  for (const [id, dir] of spins) out[id] = dir;
  return out;
}

/** True when nothing is spinning — lets the driver stop its animation frame loop. */
export function noSpins(): boolean {
  return spins.size === 0;
}

/** Every spinning joint id (snapshot, safe to iterate while mutating). */
export function spinningIds(): string[] {
  return [...spins.keys()];
}

/** Iterate the live registry. Caller must not mutate during iteration. */
export function eachSpin(fn: (jointId: string, dir: Dir) => void): void {
  for (const [id, dir] of spins) fn(id, dir);
}

// ── mutation primitives (the driver in spinEngine owns when these are called) ──
export function setSpin(jointId: string, dir: Dir): void { spins.set(jointId, dir); }
export function deleteSpin(jointId: string): boolean { return spins.delete(jointId); }
export function hasSpin(jointId: string): boolean { return spins.has(jointId); }
export function clearSpins(): void { spins.clear(); }
