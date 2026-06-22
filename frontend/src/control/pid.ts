/**
 * pid — a discrete PID controller (ros2_control's bread and butter).
 *
 * Used to close the loop on a joint: given a setpoint and the measured value, produce
 * a command (effort/velocity) that drives error to zero. Includes derivative-on-
 * measurement (avoids derivative kick on setpoint steps) and integral anti-windup.
 * Pure, node-testable.
 */
export interface PIDGains { kp: number; ki: number; kd: number; iMax?: number; outMax?: number }

export class PID {
  private _i = 0;
  private _prevMeas: number | null = null;
  constructor(public gains: PIDGains) {}

  reset(): void { this._i = 0; this._prevMeas = null; }

  /** Compute the control output for one timestep `dt` (seconds). */
  update(setpoint: number, measured: number, dt: number): number {
    const { kp, ki, kd, iMax = Infinity, outMax = Infinity } = this.gains;
    const err = setpoint - measured;
    this._i += err * dt;
    this._i = Math.max(-iMax, Math.min(iMax, this._i));      // anti-windup
    const dMeas = this._prevMeas == null || dt <= 0 ? 0 : (measured - this._prevMeas) / dt;
    this._prevMeas = measured;
    const out = kp * err + ki * this._i - kd * dMeas;         // derivative on measurement
    return Math.max(-outMax, Math.min(outMax, out));
  }
}
