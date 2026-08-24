/**
 * physicsConfig — the shared FIXED timestep every physics sim steps at, so
 * results are REPRODUCIBLE: same model + same inputs + same step count →
 * identical trajectory. A simulation a customer can't reproduce can't be
 * trusted for sim-to-real, so every sim steps at this fixed rate (never the
 * wall-clock frame delta) via a fixed-step accumulator (see
 * PhysicsSim.stepFor) rather than the engine's own default.
 */

/** Fixed physics timestep (seconds). 240 Hz → stable motors + smooth contacts. */
export const FIXED_DT = 1 / 240;
