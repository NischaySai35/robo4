/**
 * Telemetry computation — pure math, no Three.js.
 *
 * Maintains a history buffer per joint and computes
 * angle, velocity, and acceleration with exponential smoothing.
 */

const HISTORY_SIZE = 8;
const SMOOTH_ALPHA = 0.18; // EMA weight for smoothing

export class TelemetryTracker {
  constructor(numJoints) {
    this.numJoints = numJoints;
    // Each entry: { angle, velocity, acceleration, time }
    this.history = Array.from({ length: numJoints }, () => []);
    this.smoothed = Array.from({ length: numJoints }, () => ({
      angle: 0,
      velocity: 0,
      acceleration: 0,
      limitHit: false,
    }));
  }

  /**
   * Push new raw angles and compute smoothed telemetry.
   * @param {number[]} rawAngles   current joint angles (radians)
   * @param {boolean[]} limitHits  which joints hit their limits this frame
   * @param {number}   timestamp   performance.now() value
   * @returns {Array<{angle, velocity, acceleration, limitHit}>}
   */
  update(rawAngles, limitHits, timestamp) {
    for (let j = 0; j < this.numJoints; j++) {
      const hist = this.history[j];
      hist.push({ angle: rawAngles[j], time: timestamp });
      if (hist.length > HISTORY_SIZE) hist.shift();

      let velocity = 0;
      let acceleration = 0;

      if (hist.length >= 2) {
        const dt = (hist[hist.length - 1].time - hist[hist.length - 2].time) / 1000;
        if (dt > 0) {
          velocity = (hist[hist.length - 1].angle - hist[hist.length - 2].angle) / dt;
        }
      }

      if (hist.length >= 3) {
        const dt1 = (hist[hist.length - 2].time - hist[hist.length - 3].time) / 1000;
        const dt2 = (hist[hist.length - 1].time - hist[hist.length - 2].time) / 1000;
        if (dt1 > 0 && dt2 > 0) {
          const v1 = (hist[hist.length - 2].angle - hist[hist.length - 3].angle) / dt1;
          const v2 = velocity;
          const avgDt = (dt1 + dt2) * 0.5;
          acceleration = (v2 - v1) / avgDt;
        }
      }

      // EMA smoothing
      const prev = this.smoothed[j];
      this.smoothed[j] = {
        angle: ema(rawAngles[j], prev.angle),
        velocity: ema(velocity, prev.velocity),
        acceleration: ema(acceleration, prev.acceleration),
        limitHit: limitHits[j] ?? false,
      };
    }

    return this.smoothed.map(s => ({ ...s }));
  }

  reset() {
    this.history.forEach(h => h.splice(0));
    this.smoothed.forEach(s => { s.angle = 0; s.velocity = 0; s.acceleration = 0; });
  }
}

function ema(current, previous) {
  return SMOOTH_ALPHA * current + (1 - SMOOTH_ALPHA) * previous;
}
