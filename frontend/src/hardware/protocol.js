/**
 * protocol.js — the line protocol between TETROBOT and any device (Phase 11).
 *
 * Transport-agnostic (serial / WebSocket / future ROS bridge). Commands and
 * telemetry are newline-delimited JSON, matching the IDL exported in Phase 10.
 * Joint values are sent in DEGREES (most servo firmwares, incl. ST3215, think in
 * degrees). Pure functions → Node-testable.
 */
const san = (s) => String(s ?? 'j').replace(/[^A-Za-z0-9_]/g, '_');
const RAD2DEG = 180 / Math.PI;

/** Build a joint-command line from the model's movable joints. */
export function formatJointCommand(doc, { joints = null } = {}) {
  const list = joints ?? Object.values(doc.joints).filter((j) => j.type !== 'fixed');
  const values = {};
  for (const j of list) {
    values[san(j.name)] = Math.round(((j.state?.value ?? 0) * RAD2DEG) * 100) / 100;
  }
  return JSON.stringify({ cmd: 'joints', t: Date.now(), values });
}

/** Parse an incoming line → { type:'json', data } | { type:'text', data } | null. */
export function parseTelemetry(line) {
  const s = (line ?? '').trim();
  if (!s) return null;
  try { return { type: 'json', data: JSON.parse(s) }; }
  catch { return { type: 'text', data: s }; }
}
