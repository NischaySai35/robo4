/**
 * First-order RC thermal model for motor windings.
 *
 * Electrical analogy:
 *   Temperature  ↔  Voltage
 *   Heat flow    ↔  Current
 *   R_th (°C/W) ↔  Electrical resistance
 *   C_th (J/°C) ↔  Electrical capacitance
 *
 * Governing ODE:
 *   C_th × dT/dt = P_diss − (T − T_amb) / R_th
 *
 *   where:
 *     P_diss        = I² × R_winding  (dominant copper loss)
 *     T_ss (steady) = T_amb + I² × R × R_th
 *     C_th          = thermalTimeConstant / R_th  [J/°C]
 *
 * Integrated with forward Euler (safe for dt ≤ 2 s at 50 ms sampling rate).
 * The map persists for the lifetime of the module — it survives React re-renders.
 *
 * Derating curve (above 80% of max winding temperature):
 *   available torque = stallTorque × derating  (linear taper, 0 at 100%)
 */

import type { MotorSpec } from './motorDatabase';

const AMBIENT_C = 25; // °C (room temperature reference)

interface ThermalState {
  tempC: number;
  lastMs: number;
}

const _state = new Map<string, ThermalState>();

/**
 * Advance the thermal model for one joint by dt seconds.
 * Call once per telemetry sample (50 ms); safe to call faster.
 *
 * @param jointId   Unique joint ID (key into the state map)
 * @param motor     Motor specification (from motorDatabase)
 * @param currentA  Present RMS current draw (A)
 * @param nowMs     Current timestamp in milliseconds (performance.now())
 */
export function updateThermal(
  jointId: string,
  motor: MotorSpec,
  currentA: number,
  nowMs: number,
): ThermalResult {
  if (!_state.has(jointId)) _state.set(jointId, { tempC: AMBIENT_C, lastMs: nowMs });
  const s  = _state.get(jointId)!;
  const dt = Math.min((nowMs - s.lastMs) / 1000, 2.0); // cap to avoid cold-start jumps
  s.lastMs = nowMs;

  // Copper losses (W); ignore iron losses for this model
  const P   = currentA * currentA * motor.R;
  const Rth = motor.thermalResistance;
  const Cth = motor.thermalTimeConstant / Rth; // J/°C
  // Euler integration
  s.tempC += dt * (P - (s.tempC - AMBIENT_C) / Rth) / Cth;
  s.tempC  = Math.max(AMBIENT_C, s.tempC);

  return thermalResult(s.tempC, motor.maxTemp);
}

/** Read cached temperature without advancing the model. */
export function getTemp(jointId: string): number {
  return _state.get(jointId)?.tempC ?? AMBIENT_C;
}

/** Reset one joint's thermal state, or all if omitted. */
export function resetThermal(jointId?: string) {
  if (jointId) _state.delete(jointId);
  else _state.clear();
}

export interface ThermalResult {
  tempC: number;
  fraction: number;  // tempC / maxTemp  (0 → 1+)
  warning: boolean;  // fraction > 0.70
  critical: boolean; // fraction > 0.90
  derating: number;  // 1.0 (cool) → 0.0 (at max temp) — multiply by stallTorque
}

function thermalResult(tempC: number, maxTemp: number): ThermalResult {
  const fraction = tempC / maxTemp;
  // Linear derating from 80% → 100% max temp: 1.0 at 80%, 0.0 at 100%
  const derating = fraction > 0.80 ? Math.max(0, 1 - (fraction - 0.80) * 5) : 1.0;
  return { tempC, fraction, warning: fraction > 0.70, critical: fraction > 0.90, derating };
}
