/**
 * protocol.js — the line protocol between TETROBOT and any device (Phase 11).
 *
 * Transport-agnostic (serial / WebSocket / future ROS bridge). Commands and
 * telemetry are newline-delimited JSON, matching the IDL exported in Phase 10.
 * Joint values are sent in DEGREES (most servo firmwares, incl. ST3215, think in
 * degrees). Pure functions → Node-testable.
 */
import type { Document } from '@/core/model/index';

const san = (s: unknown) => String(s ?? 'j').replace(/[^A-Za-z0-9_]/g, '_');
const RAD2DEG = 180 / Math.PI;

/**
 * Map a joint's value (rad) to the degrees a servo should hold, applying the
 * per-joint servo calibration (invert + offset). ST3215 firmware thinks in degrees.
 */
export function jointServoDegrees(j) {
  const m = j.meta ?? {};
  const sign = m.servoInvert ? -1 : 1;
  const deg = (j.state?.value ?? 0) * RAD2DEG * sign + (Number(m.servoOffsetDeg) || 0);
  return Math.round(deg * 100) / 100;
}

/** Build a joint-command line from the model's movable joints.
 *  - `values`: { jointName: deg }              (human-readable, backward compatible)
 *  - `servos`: [{ id, deg }]                    (only joints with an assigned servo id)
 */
export function formatJointCommand(doc: Document, { joints = null } = {}) {
  const list = joints ?? Object.values(doc.joints).filter((j) => j.type !== 'fixed');
  const values: Record<string, number> = {};
  const servos: { id: number; deg: number }[] = [];
  for (const j of list) {
    values[san(j.name)] = Math.round(((j.state?.value ?? 0) * RAD2DEG) * 100) / 100;
    const id = j.meta?.servoId;
    if (id != null && id !== '' && Number.isFinite(Number(id))) {
      servos.push({ id: Number(id), deg: jointServoDegrees(j) });
    }
  }
  const msg: { cmd: string; t: number; values: Record<string, number>; servos?: { id: number; deg: number }[] } =
    { cmd: 'joints', t: Date.now(), values };
  if (servos.length) msg.servos = servos;
  return JSON.stringify(msg);
}

/** Parse an incoming line → { type:'json', data } | { type:'text', data } | null. */
export function parseTelemetry(line) {
  const s = (line ?? '').trim();
  if (!s) return null;
  try { return { type: 'json', data: JSON.parse(s) }; }
  catch { return { type: 'text', data: s }; }
}