/**
 * rtExport — serialize a Studio-planned trajectory into the wire format the native
 * RT Core consumes (`rtcore`'s `traj-io` crate parses this exact schema).
 *
 * The Studio plans a blended, jerk-limited trajectory (see trajectory.ts). To execute it
 * on the real robot we hand RT Core a dense, time-stamped position sequence — RT Core's
 * JointTrajectoryController resamples it by time and PID-tracks it at the loop rate.
 * Dense sampling means the native side only needs cheap linear interpolation while still
 * reproducing the smooth profile.
 *
 * This is the bridge between the two halves of the platform (TS Studio ↔ Rust RT Core).
 */
import type { TimedTrajectory } from './trajectory';

export interface RtTrajPoint { t: number; positions: number[] }

export interface RtTrajectory {
  format: 'rtcore.trajectory';
  version: 1;
  dof: number;
  joints: string[];
  dt: number;            // the sampling interval used (seconds)
  duration: number;      // seconds
  points: RtTrajPoint[];
}

const r6 = (v: number) => Math.round(v * 1e6) / 1e6;

/**
 * Sample a timed trajectory at fixed `dt` into the RT Core wire format. The final point
 * is always the exact endpoint at `duration` (so the goal is reached precisely).
 */
export function exportRtTrajectory(traj: TimedTrajectory, jointNames: string[], dt = 0.02): RtTrajectory {
  const points: RtTrajPoint[] = [];
  if (traj.duration <= 0) {
    points.push({ t: 0, positions: traj.sample(0) });
  } else {
    for (let t = 0; t < traj.duration; t += dt) {
      points.push({ t: r6(t), positions: traj.sample(t) });
    }
    points.push({ t: r6(traj.duration), positions: traj.sample(traj.duration) });
  }
  return {
    format: 'rtcore.trajectory',
    version: 1,
    dof: points[0]?.positions.length ?? 0,
    joints: jointNames,
    dt,
    duration: r6(traj.duration),
    points,
  };
}

/** Convenience: the wire format as a JSON string for sending to RT Core. */
export function exportRtTrajectoryJSON(traj: TimedTrajectory, jointNames: string[], dt = 0.02): string {
  return JSON.stringify(exportRtTrajectory(traj, jointNames, dt));
}
