/**
 * rtStatus — Studio-side consumer of RT Core controller feedback.
 *
 * RT Core streams live controller status as JSON (rtcore's `traj-io::status_to_json`);
 * this parses that contract so the Studio can show progress + tracking error in the UI.
 * It is the RT Core → Studio direction of the live-feedback contract (the trajectory
 * export in rtExport.ts is the Studio → RT Core direction).
 *
 * The actual transport (websocket/DDS bridge) is future work; whatever it is, it calls
 * `parseRtControllerStatus` and feeds the result into the status store.
 */
export interface RtControllerStatus {
  format: 'rtcore.controller_status';
  version: number;
  name: string;
  elapsed: number;
  duration: number;
  fraction: number;   // 0..1 progress
  finished: boolean;
  error: number[];    // per-joint tracking error (setpoint − measured)
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

/** Parse RT Core controller-status JSON (string or already-parsed object). Throws on a bad format. */
export function parseRtControllerStatus(input: string | unknown): RtControllerStatus {
  const o: any = typeof input === 'string' ? JSON.parse(input) : input;
  if (!o || o.format !== 'rtcore.controller_status') {
    throw new Error('not an rtcore.controller_status message');
  }
  return {
    format: 'rtcore.controller_status',
    version: num(o.version, 1),
    name: String(o.name ?? ''),
    elapsed: num(o.elapsed),
    duration: num(o.duration),
    fraction: clamp01(num(o.fraction)),
    finished: !!o.finished,
    error: Array.isArray(o.error) ? o.error.map((e: unknown) => num(e)) : [],
  };
}

export type RtRunState = 'idle' | 'running' | 'done';

export interface StatusSummary {
  percent: number;       // 0..100
  maxAbsError: number;   // largest |per-joint error|
  state: RtRunState;
}

/** Derive a compact UI summary (progress %, worst tracking error, run state). */
export function summarizeStatus(s: RtControllerStatus): StatusSummary {
  return {
    percent: Math.round(clamp01(s.fraction) * 100),
    maxAbsError: s.error.reduce((m, e) => Math.max(m, Math.abs(e)), 0),
    state: s.finished ? 'done' : s.fraction > 0 ? 'running' : 'idle',
  };
}
