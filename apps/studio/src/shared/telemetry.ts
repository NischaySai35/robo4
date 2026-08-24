/**
 * Telemetry computation — pure math, no Three.js.
 *
 * Computes smoothed angle, velocity, and acceleration per joint.
 * Clamps to realistic servo limits so readouts look physically plausible.
 */

const HISTORY_SIZE = 10;
const VEL_ALPHA   = 0.06; // EMA weight for velocity  (lower = smoother / more lag)
const ACC_ALPHA   = 0.04; // EMA weight for acceleration
const ANG_ALPHA   = 0.25; // EMA smoothing for angle display

// Realistic robotic servo limits
const MAX_VEL_RAD  = 3.0;   // ≈ 172°/s
const MAX_ACC_RAD  = 15.0;  // ≈ 859°/s²

interface JointSample { angle: number; time: number }
interface SmoothedJoint { angle: number; velocity: number; acceleration: number; limitHit: boolean }

export class TelemetryTracker {
  numJoints: number;
  history: JointSample[][];
  smoothed: SmoothedJoint[];

  constructor(numJoints: number) {
    this.numJoints = numJoints;
    this.history = Array.from({ length: numJoints }, () => []);
    this.smoothed = Array.from({ length: numJoints }, () => ({
      angle: 0, velocity: 0, acceleration: 0, limitHit: false,
    }));
  }

  update(rawAngles: any, limitHits: any, timestamp: any) {
    for (let j = 0; j < this.numJoints; j++) {
      const hist = this.history[j];
      hist.push({ angle: rawAngles[j], time: timestamp });
      if (hist.length > HISTORY_SIZE) hist.shift();

      // Velocity: central difference over last 3 frames for stability
      let rawVel = 0;
      if (hist.length >= 3) {
        const n = hist.length;
        const dt = (hist[n - 1].time - hist[n - 3].time) / 1000;
        if (dt > 0.001) {
          rawVel = (hist[n - 1].angle - hist[n - 3].angle) / dt;
        }
      } else if (hist.length >= 2) {
        const n = hist.length;
        const dt = (hist[n - 1].time - hist[n - 2].time) / 1000;
        if (dt > 0) rawVel = (hist[n - 1].angle - hist[n - 2].angle) / dt;
      }

      // Clamp velocity before it feeds into acceleration computation
      rawVel = Math.max(-MAX_VEL_RAD, Math.min(MAX_VEL_RAD, rawVel));

      // Acceleration: from previous two clamped velocity estimates
      let rawAcc = 0;
      if (hist.length >= 5) {
        const n = hist.length;
        const dt1 = (hist[n - 3].time - hist[n - 5].time) / 1000;
        const dt2 = (hist[n - 1].time - hist[n - 3].time) / 1000;
        if (dt1 > 0.001 && dt2 > 0.001) {
          const v1raw = (hist[n - 3].angle - hist[n - 5].angle) / dt1;
          const v1 = Math.max(-MAX_VEL_RAD, Math.min(MAX_VEL_RAD, v1raw));
          rawAcc = (rawVel - v1) / ((dt1 + dt2) * 0.5);
        }
      }
      rawAcc = Math.max(-MAX_ACC_RAD, Math.min(MAX_ACC_RAD, rawAcc));

      const prev = this.smoothed[j];
      this.smoothed[j] = {
        angle:        ema(rawAngles[j],  prev.angle,        ANG_ALPHA),
        velocity:     ema(rawVel,        prev.velocity,     VEL_ALPHA),
        acceleration: ema(rawAcc,        prev.acceleration, ACC_ALPHA),
        limitHit:     limitHits[j] ?? false,
      };
    }

    return this.smoothed.map(s => ({ ...s }));
  }

  reset() {
    this.history.forEach(h => h.splice(0));
    this.smoothed.forEach(s => { s.angle = 0; s.velocity = 0; s.acceleration = 0; });
  }

  seed(angles: any) {
    this.history.forEach(h => h.splice(0));
    for (let j = 0; j < this.numJoints; j++) {
      this.smoothed[j] = {
        angle: angles[j] ?? 0,
        velocity: 0,
        acceleration: 0,
        limitHit: false,
      };
    }
  }
}

function ema(current: any, previous: any, alpha: any) {
  return alpha * current + (1 - alpha) * previous;
}