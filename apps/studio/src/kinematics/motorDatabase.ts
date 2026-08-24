/**
 * Motor specification database.
 *
 * Keys match the joint.meta.motorType string set in HardwarePanel.
 * All specs are at rated voltage, 25°C ambient.
 *
 * Physical model used by thermalModel.ts:
 *   P_diss  = I² × R                    (copper loss, dominant)
 *   T_ss    = T_amb + I² × R × R_th     (steady-state winding temperature)
 *   τ_therm = C_th × R_th               (thermal time constant)
 *   C_th    = thermalTimeConstant / R_th
 *
 * Physical model used by analysis.ts:
 *   I_estimate = noLoadCurrent + |τ| / Kt
 *   overload   = |τ| > stallTorque
 */

export interface MotorSpec {
  id: string;
  name: string;
  brand: string;
  stallTorque: number;         // N·m  (at stall, rated voltage)
  stallCurrent: number;        // A    (at stall)
  noLoadCurrent: number;       // A    (idle, no mechanical load)
  noLoadSpeed: number;         // rad/s (no-load mechanical speed)
  Kt: number;                  // N·m/A torque constant (stallTorque / stallCurrent)
  R: number;                   // Ω    winding resistance (for I²R loss)
  maxTemp: number;             // °C   maximum winding temperature (datasheet limit)
  thermalResistance: number;   // °C/W winding-to-ambient
  thermalTimeConstant: number; // s    (τ = C_th × R_th — time to reach 63% of ΔT_ss)
  encoderResolution: number;   // counts/revolution (0 = open-loop / no encoder)
  voltage: number;             // V    rated supply voltage
  mass: number;                // kg
  maxSpeed: number;            // rad/s mechanical speed limit
}

export const MOTOR_DB: Record<string, MotorSpec> = {

  // ── Feetech STS smart servos (TTL / half-duplex UART) ────────────────────
  'ST3215': {
    id: 'ST3215', name: 'Feetech STS3215', brand: 'Feetech',
    stallTorque: 2.94, stallCurrent: 2.70, noLoadCurrent: 0.10, noLoadSpeed: 4.92,
    Kt: 2.94 / 2.70, R: 4.50,
    maxTemp: 70, thermalResistance: 2.50, thermalTimeConstant: 180,
    encoderResolution: 4096, voltage: 12, mass: 0.075, maxSpeed: 6.0,
  },
  'ST3215-S': {
    id: 'ST3215-S', name: 'Feetech STS3215-S (high-torque)', brand: 'Feetech',
    stallTorque: 3.20, stallCurrent: 2.80, noLoadCurrent: 0.10, noLoadSpeed: 4.50,
    Kt: 3.20 / 2.80, R: 4.20,
    maxTemp: 70, thermalResistance: 2.40, thermalTimeConstant: 185,
    encoderResolution: 4096, voltage: 12, mass: 0.080, maxSpeed: 5.5,
  },
  'ST3025': {
    id: 'ST3025', name: 'Feetech STS3025', brand: 'Feetech',
    stallTorque: 1.00, stallCurrent: 1.00, noLoadCurrent: 0.06, noLoadSpeed: 7.33,
    Kt: 1.00 / 1.00, R: 7.00,
    maxTemp: 65, thermalResistance: 3.50, thermalTimeConstant: 120,
    encoderResolution: 4096, voltage: 12, mass: 0.040, maxSpeed: 8.0,
  },
  'ST3235': {
    id: 'ST3235', name: 'Feetech STS3235', brand: 'Feetech',
    stallTorque: 3.50, stallCurrent: 2.80, noLoadCurrent: 0.10, noLoadSpeed: 4.19,
    Kt: 3.50 / 2.80, R: 4.00,
    maxTemp: 70, thermalResistance: 2.30, thermalTimeConstant: 190,
    encoderResolution: 4096, voltage: 12, mass: 0.082, maxSpeed: 5.2,
  },

  // ── Robotis Dynamixel MX series ──────────────────────────────────────────
  'MX-28': {
    id: 'MX-28', name: 'Dynamixel MX-28', brand: 'Robotis',
    stallTorque: 2.50, stallCurrent: 1.40, noLoadCurrent: 0.06, noLoadSpeed: 5.65,
    Kt: 2.50 / 1.40, R: 8.00,
    maxTemp: 80, thermalResistance: 2.00, thermalTimeConstant: 200,
    encoderResolution: 4096, voltage: 12, mass: 0.077, maxSpeed: 7.0,
  },
  'MX-64': {
    id: 'MX-64', name: 'Dynamixel MX-64', brand: 'Robotis',
    stallTorque: 6.00, stallCurrent: 4.10, noLoadCurrent: 0.10, noLoadSpeed: 6.60,
    Kt: 6.00 / 4.10, R: 3.50,
    maxTemp: 80, thermalResistance: 1.80, thermalTimeConstant: 220,
    encoderResolution: 4096, voltage: 12, mass: 0.135, maxSpeed: 8.0,
  },
  'MX-106': {
    id: 'MX-106', name: 'Dynamixel MX-106', brand: 'Robotis',
    stallTorque: 8.40, stallCurrent: 4.50, noLoadCurrent: 0.10, noLoadSpeed: 4.19,
    Kt: 8.40 / 4.50, R: 3.00,
    maxTemp: 80, thermalResistance: 1.50, thermalTimeConstant: 250,
    encoderResolution: 4096, voltage: 12, mass: 0.153, maxSpeed: 5.0,
  },
  'XH540': {
    id: 'XH540', name: 'Dynamixel XH540-W150', brand: 'Robotis',
    stallTorque: 9.20, stallCurrent: 4.50, noLoadCurrent: 0.08, noLoadSpeed: 3.56,
    Kt: 9.20 / 4.50, R: 4.00,
    maxTemp: 80, thermalResistance: 1.40, thermalTimeConstant: 280,
    encoderResolution: 4096, voltage: 24, mass: 0.165, maxSpeed: 4.5,
  },

  // ── Generic / open-loop actuators ────────────────────────────────────────
  'PWM Servo': {
    id: 'PWM Servo', name: 'Generic PWM Servo (hobby)', brand: 'Generic',
    stallTorque: 0.30, stallCurrent: 1.00, noLoadCurrent: 0.05, noLoadSpeed: 10.47,
    Kt: 0.30 / 1.00, R: 5.00,
    maxTemp: 70, thermalResistance: 4.00, thermalTimeConstant: 90,
    encoderResolution: 0, voltage: 5, mass: 0.025, maxSpeed: 12.0,
  },
  'Stepper': {
    id: 'Stepper', name: 'NEMA 17 Stepper (1.8°)', brand: 'Generic',
    stallTorque: 0.45, stallCurrent: 2.00, noLoadCurrent: 0.80, noLoadSpeed: 31.42,
    Kt: 0.45 / 2.00, R: 1.65,
    maxTemp: 80, thermalResistance: 3.00, thermalTimeConstant: 240,
    encoderResolution: 200, voltage: 12, mass: 0.280, maxSpeed: 40.0,
  },
  'DC Motor': {
    id: 'DC Motor', name: 'DC Motor w/ Gearbox', brand: 'Generic',
    stallTorque: 0.80, stallCurrent: 3.50, noLoadCurrent: 0.15, noLoadSpeed: 20.94,
    Kt: 0.80 / 3.50, R: 2.00,
    maxTemp: 80, thermalResistance: 3.50, thermalTimeConstant: 150,
    encoderResolution: 1024, voltage: 12, mass: 0.150, maxSpeed: 25.0,
  },
  'Linear Actuator': {
    id: 'Linear Actuator', name: 'Linear Actuator (500 N)', brand: 'Generic',
    stallTorque: 0, stallCurrent: 3.00, noLoadCurrent: 0.30, noLoadSpeed: 0.005,
    Kt: 0, R: 3.00,
    maxTemp: 75, thermalResistance: 3.00, thermalTimeConstant: 200,
    encoderResolution: 0, voltage: 12, mass: 0.400, maxSpeed: 0.010,
  },
};

const FALLBACK: MotorSpec = {
  id: 'unknown', name: 'Unknown Motor', brand: 'Generic',
  stallTorque: 1.00, stallCurrent: 1.00, noLoadCurrent: 0.10, noLoadSpeed: 6.28,
  Kt: 1.00, R: 5.00,
  maxTemp: 70, thermalResistance: 3.00, thermalTimeConstant: 120,
  encoderResolution: 4096, voltage: 12, mass: 0.100, maxSpeed: 10.0,
};

/** Return the motor spec for a given motorType string (from joint.meta.motorType). */
export function getMotorSpec(motorType?: string | null): MotorSpec {
  if (!motorType) return MOTOR_DB['ST3215']; // platform default
  return MOTOR_DB[motorType] ?? FALLBACK;
}

/** All motor IDs in the database. */
export const MOTOR_IDS = Object.keys(MOTOR_DB);
