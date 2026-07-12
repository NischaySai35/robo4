/**
 * joltLoader — the SINGLE load point for the Jolt Physics WASM module,
 * mirroring physicsEngine.ts's old role for Rapier. Jolt is maximal-
 * coordinate: every body is independently free, joints are just
 * constraints between bodies — so unlike MuJoCo there is no compiled
 * "model" to rebuild when topology changes. Each sim creates its own
 * lightweight world (JoltInterface + PhysicsSystem) via createJoltWorld();
 * only the WASM module itself is loaded once and shared.
 *
 * KNOWN GAP: this binding never frees WASM-heap objects we don't explicitly
 * Jolt.destroy() (no JS GC reaches into it), and its ownership rules are
 * stricter/different than expected — verified the hard way that destroying
 * even objects that look done-with (per-world broadphase filter tables,
 * ShapeSettings after Create(), ConstraintSettings after Create()) corrupts
 * a LATER world's construction or a later Step(), not just the object
 * itself. Repeated worlds (every gravity toggle / drag rebuild) do leak and
 * will eventually exhaust the WASM heap on a long session — a real bug —
 * but without authoritative docs for this exact binding's Ref/ownership
 * semantics, guessing at more frees is worse than the leak (proven: 4
 * separate crash locations from 4 different "safe-looking" free placements).
 * Only `JoltSettings` (destroyed right after `new JoltInterface(settings)`,
 * the one pattern that was already here and verified stable) and the
 * `JoltInterface` itself on dispose are freed.
 */

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type JoltModule = any;

let _modulePromise: Promise<JoltModule> | null = null;

export function ensureJolt(): Promise<JoltModule> {
  // Dynamic import, not static: the WASM is a multi-MB payload (see
  // mujocoLoader.ts's identical reasoning) — keep it in its own lazy chunk,
  // loaded only when physics is actually used, not bundled into the eager
  // main chunk.
  _modulePromise ??= import('jolt-physics/wasm-compat').then((m) => m.default());
  return _modulePromise;
}

const LAYER_NON_MOVING = 0;
const LAYER_MOVING = 1;
const NUM_OBJECT_LAYERS = 2;
const NUM_BROAD_PHASE_LAYERS = 2;

export interface JoltWorld {
  Jolt: JoltModule;
  jolt: any; // JoltInterface
  physicsSystem: any;
  bodyInterface: any;
  dispose: () => void;
}

/**
 * A fresh, isolated physics world: its own JoltInterface/PhysicsSystem, two
 * object layers (static/dynamic — matches every sim's existing "root is
 * fixed, everything else dynamic" pattern), gravity along -Y (this app's
 * Y-up convention, same as the old Rapier/MuJoCo worlds).
 */
export async function createJoltWorld(gravity: number): Promise<JoltWorld> {
  const Jolt = await ensureJolt();
  return createJoltWorldSync(Jolt, gravity);
}

/**
 * Synchronous variant for callers that must construct many worlds per
 * training episode without an async boundary (RLPhysicsWorld — see its own
 * doc comment for why: making its constructor async would cascade into
 * every trainer's hot loop). Callers must `await ensureJolt()` once
 * beforehand and pass the resolved module.
 */
export function createJoltWorldSync(Jolt: JoltModule, gravity: number): JoltWorld {
  const objectFilter = new Jolt.ObjectLayerPairFilterTable(NUM_OBJECT_LAYERS);
  objectFilter.EnableCollision(LAYER_NON_MOVING, LAYER_MOVING);
  objectFilter.EnableCollision(LAYER_MOVING, LAYER_MOVING);

  const bpInterface = new Jolt.BroadPhaseLayerInterfaceTable(NUM_OBJECT_LAYERS, NUM_BROAD_PHASE_LAYERS);
  bpInterface.MapObjectToBroadPhaseLayer(LAYER_NON_MOVING, new Jolt.BroadPhaseLayer(0));
  bpInterface.MapObjectToBroadPhaseLayer(LAYER_MOVING, new Jolt.BroadPhaseLayer(1));

  const settings = new Jolt.JoltSettings();
  // JoltSettings' defaults (mMaxBodies=10240, mMaxBodyPairs=65536,
  // mMaxContactConstraints=10240) pre-allocate buffers sized for
  // large-scale games — verified against the real WASM build. Every sim in
  // this app has at most a few hundred bodies, and several sims can have
  // live worlds concurrently (RL training keeps a whole reused pool of
  // worlds alive across a run) — at the defaults, even a handful of
  // concurrent worlds exhausts the WASM heap (a real OOM this caused during
  // ES-training tests). Capped generously above any realistic model size.
  settings.mMaxBodies = 512;
  settings.mMaxBodyPairs = 4096;
  settings.mMaxContactConstraints = 2048;
  // set_X(...), not `=` — see dynamicSim.ts's joint-constraint fix for why: struct-valued
  // fields silently no-op on plain assignment in this binding (the mMaxBodies etc. above are
  // primitive numbers, which DO work with `=`, so they're left as-is).
  settings.set_mObjectLayerPairFilter(objectFilter);
  settings.set_mBroadPhaseLayerInterface(bpInterface);
  settings.set_mObjectVsBroadPhaseLayerFilter(new Jolt.ObjectVsBroadPhaseLayerFilterTable(
    bpInterface, NUM_BROAD_PHASE_LAYERS, objectFilter, NUM_OBJECT_LAYERS,
  ));

  const jolt = new Jolt.JoltInterface(settings);
  Jolt.destroy(settings);

  const physicsSystem = jolt.GetPhysicsSystem();
  physicsSystem.SetGravity(new Jolt.Vec3(0, -gravity, 0));
  // Jolt's defaults (10 velocity steps, 2 POSITION steps) don't converge fast enough for a
  // compound-cluster chain under real load (motor torque + gravity + ground friction all
  // fighting the same hinge each frame) — verified live: every joint sat at a stable ~0.18m
  // gap between its two connection points, never closing, exactly what too few position-
  // correction iterations produces (the solver partially fixes the constraint each step, but
  // not fully, so it settles into a steady-state "always a bit behind" offset instead of ~0).
  // More position steps directly means "hold joints together more tightly under load."
  const physSettings = new Jolt.PhysicsSettings();
  physSettings.mNumVelocitySteps = 10;
  physSettings.mNumPositionSteps = 8;
  physicsSystem.SetPhysicsSettings(physSettings);
  const bodyInterface = physicsSystem.GetBodyInterface();

  return {
    Jolt,
    jolt,
    physicsSystem,
    bodyInterface,
    dispose: () => { try { Jolt.destroy(jolt); } catch { /* ignore */ } },
  };
}

export const JOLT_LAYER_NON_MOVING = LAYER_NON_MOVING;
export const JOLT_LAYER_MOVING = LAYER_MOVING;
