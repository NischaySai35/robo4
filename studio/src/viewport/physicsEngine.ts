/**
 * physicsEngine — the SINGLE import point for the Rapier physics engine.
 *
 * Every physics module (PhysicsSim, RLPhysicsWorld, colliderFactory, physicsConfig)
 * imports RAPIER from here, so the engine build can be swapped in ONE place.
 *
 * ── Determinism contract ────────────────────────────────────────────────────────
 *  • Reproducible (guaranteed today): on a given build, the same model + inputs +
 *    step count produce BIT-IDENTICAL results — enforced by physicsDeterminism.test.ts,
 *    and made robust by pinning the timestep + solver iterations (see physicsConfig).
 *    Because WASM executes the same IEEE-754 operations on every host, this also holds
 *    across machines that run THIS exact build.
 *
 *  • Cross-platform GUARANTEE (opt-in): Rapier ships a dedicated build with the
 *    `enhanced-determinism` feature — `@dimforge/rapier3d-deterministic` — that
 *    guarantees identical results across all IEEE-754 platforms regardless of compiler
 *    optimizations. To adopt it, change the import below to that package and add a Vite
 *    rule for its standalone .wasm (it is NOT a `-compat` embedded-wasm build, so it also
 *    needs a wasm loader for the node test runner). It trades some throughput for the
 *    guarantee — a deliberate choice, hence opt-in rather than the default.
 *
 * Keeping this re-export as the only engine reference is what makes that swap a one-liner.
 */
import RAPIER from '@dimforge/rapier3d-compat';

export default RAPIER;
export { RAPIER };
