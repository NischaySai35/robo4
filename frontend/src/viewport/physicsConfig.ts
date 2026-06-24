/**
 * physicsConfig — pins Rapier's integration parameters so the simulation is
 * REPRODUCIBLE: same model + same inputs + same step count → identical trajectory.
 *
 * Why this matters (industrial pivot): a simulation a customer can't reproduce is a
 * simulation they can't trust for sim-to-real. Rapier (deterministic WASM build) is
 * reproducible *only if* the timestep and solver iteration counts are fixed instead of
 * left to engine defaults that may change between versions. We therefore step at a
 * FIXED timestep (never the wall-clock frame delta) and pin the solver budget here.
 *
 * Callers that are driven by real elapsed time should use a fixed-step accumulator
 * (see PhysicsSim.stepFor) so frame-rate never changes the result.
 */
import type RAPIER from './physicsEngine';

/** Fixed physics timestep (seconds). 240 Hz → stable motors + smooth contacts. */
export const FIXED_DT = 1 / 240;

/** Solver budget — pinned so results don't drift if Rapier's defaults change. */
export const NUM_SOLVER_ITERATIONS = 8;
export const NUM_PGS_ITERATIONS = 1;

/** Pin a world's integration parameters for deterministic, reproducible stepping. */
export function applyDeterministicParams(world: RAPIER.World, dt: number = FIXED_DT): void {
  const ip = world.integrationParameters;
  ip.dt = dt;
  ip.numSolverIterations = NUM_SOLVER_ITERATIONS;
  ip.numInternalPgsIterations = NUM_PGS_ITERATIONS;
}
