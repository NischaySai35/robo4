/**
 * modelPort — the live document, as a contract instead of a store import.
 *
 * Several engine-side services (the motion executor, the hardware bridge) genuinely need
 * the CURRENT document rather than one passed per call: they run on timers or on runtime
 * actions, long after any caller could have handed them a snapshot. Reaching into the
 * zustand store for it worked, but made those modules unloadable — and untestable —
 * without the whole React state layer, and put them on the wrong side of the layer rules.
 *
 * So the document is a port: the state layer registers an adapter once at startup, and
 * engine code asks the port. Unregistered, `getDoc()` returns null and callers no-op,
 * which is the correct behaviour in a test or worker that has no live document at all.
 *
 * This is the same inversion already used by setAnimRootOverride / setGroundedRootProvider
 * in kinematics/modelFK and setRtTelemetrySink in robotics/runtime/rtSocket.
 */
import type { Document } from './index';

export interface ModelPort {
  /** The live document. */
  getDoc: () => Document;
  /** Apply a high-frequency, non-undoable update (motor spin, physics, playback). */
  applyTransient: (fn: (doc: Document) => Document) => void;
}

let _port: ModelPort | null = null;

/** Register the live-document adapter. Called once by the state layer at startup. */
export function setModelPort(port: ModelPort | null): void { _port = port; }

/** The live document, or null when nothing has registered one (test/worker). */
export function getDoc(): Document | null { return _port ? _port.getDoc() : null; }

/** Apply a transient document update. No-ops when no adapter is registered. */
export function applyTransient(fn: (doc: Document) => Document): void {
  _port?.applyTransient(fn);
}
