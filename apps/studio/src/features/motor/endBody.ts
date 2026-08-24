/**
 * endBody — identifies a module's END bodies (endlock / endlock2), the only bodies
 * that carry the continuous-motor (CW/CCW) action. A module spins about its ends, so
 * the motor controls belong to the end-lock bodies, not the middle links.
 *
 * Detection is by name (end_lock, endlock, "end lock 2", copies, etc.) since that's
 * how the module primitives are authored.
 */
export function isEndBody(body: any): boolean {
  const n = (body?.name ?? '').toLowerCase();
  return /end[\s_]*lock/.test(n);
}

/** A joint that carries the continuous-motor action: a revolute/continuous hinge that
 *  drives an end-lock body. These are motors by definition — no per-joint opt-in. */
export function isMotorJoint(doc: any, joint: any): boolean {
  if (!joint || (joint.type !== 'revolute' && joint.type !== 'continuous')) return false;
  return isEndBody(doc?.bodies?.[joint.parentBodyId]) || isEndBody(doc?.bodies?.[joint.childBodyId]);
}

// ── Connector classification ─────────────────────────────────────────────────
// Every connector is one of two kinds, decided purely by the body it sits on:
//   • END connectors  — on an end-lock body (a module's tips).
//   • SIDE connectors — on any middle/mid body (a module's flanks).
// A lock joins two connectors, so the possible combinations are end-end, side-side,
// and end-side (== side-end). Used to reason about which motions are free.
export type ConnectorClass = 'end' | 'side';
export type LockCombo = 'end-end' | 'side-side' | 'end-side';

/** The kind of connectors a body carries (all of a body's connectors share its kind). */
export function connectorClass(body: any): ConnectorClass {
  return isEndBody(body) ? 'end' : 'side';
}

/** Classify a connector-lock joint by the two bodies it joins. Null if not a lock. */
export function lockCombo(doc: any, joint: any): LockCombo | null {
  if (!joint?.meta?.generatedFromConnector && joint?.type !== 'fixed') return null;
  const a = connectorClass(doc?.bodies?.[joint.parentBodyId]);
  const b = connectorClass(doc?.bodies?.[joint.childBodyId]);
  if (a === 'end' && b === 'end') return 'end-end';
  if (a === 'side' && b === 'side') return 'side-side';
  return 'end-side';
}
