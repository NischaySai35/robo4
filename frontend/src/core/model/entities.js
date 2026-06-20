/**
 * entities.js — factory functions for the TETROBOT graph model (the "DDL").
 *
 * The model is the single source of truth (see ROADMAP.md / ARCHITECTURE.md).
 * It is plain, JSON-serializable data — no React, no Three.js. Every viewport,
 * exporter, simulator, and hardware backend is a *view* of this model.
 *
 * Entities (URDF-aligned, with extensions):
 *   Document   — the whole scene/robot graph
 *   Body       — a rigid link (visual + collision geometry, inertial, transform)
 *   Joint      — connects two bodies (type, axis, origin, limits, dynamics, mimic)
 *   Material   — PBR appearance + density
 *   Asset      — imported mesh data (STL/glTF/STEP), referenced by bodies
 *   Frame      — a reference/datum frame
 *   Constraint — non-tree relations (loops, mates) URDF can't express
 *
 * All ids are strings. Transforms use position [x,y,z], quaternion [x,y,z,w].
 */

// ── enums ──────────────────────────────────────────────────────────────────────

export const JointType = Object.freeze({
  REVOLUTE: 'revolute',     // hinge with limits
  CONTINUOUS: 'continuous', // hinge, no limits
  PRISMATIC: 'prismatic',   // linear slider
  FIXED: 'fixed',           // rigid weld
  PLANAR: 'planar',
  FLOATING: 'floating',
  BALL: 'ball',             // spherical (extension beyond URDF)
});

export const GeometryType = Object.freeze({
  BOX: 'box',
  CYLINDER: 'cylinder',
  SPHERE: 'sphere',
  CAPSULE: 'capsule',
  CONE: 'cone',
  TORUS: 'torus',
  PLANE: 'plane',           // flat square
  CIRCLE: 'circle',         // flat disc
  MESH: 'mesh',             // references an Asset by assetId
});

// ── id generation ────────────────────────────────────────────────────────────

let _counter = 0;
/** Stable-ish unique id with a readable prefix. */
export function uid(prefix = 'id') {
  _counter += 1;
  const rnd = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10));
  return `${prefix}-${_counter.toString(36)}${rnd.slice(0, 6)}`;
}

// ── transform helpers ──────────────────────────────────────────────────────────

export const identityTransform = () => ({
  position: [0, 0, 0],
  quaternion: [0, 0, 0, 1],
  scale: [1, 1, 1],
});

export const identityOrigin = () => ({ position: [0, 0, 0], quaternion: [0, 0, 0, 1] });

// ── factories ──────────────────────────────────────────────────────────────────

export function makeGeometry(type = GeometryType.BOX, params = {}) {
  const base = { type };
  switch (type) {
    case GeometryType.BOX:      return { ...base, size: params.size ?? [1, 1, 1] };
    case GeometryType.CYLINDER: return { ...base, radius: params.radius ?? 0.5, length: params.length ?? 1 };
    case GeometryType.CAPSULE:  return { ...base, radius: params.radius ?? 0.5, length: params.length ?? 1 };
    case GeometryType.SPHERE:   return { ...base, radius: params.radius ?? 0.5 };
    case GeometryType.CONE:     return { ...base, radius: params.radius ?? 0.5, length: params.length ?? 1 };
    case GeometryType.TORUS:    return { ...base, radius: params.radius ?? 0.5, tube: params.tube ?? 0.18 };
    case GeometryType.PLANE:    return { ...base, size: params.size ?? [1, 1] };
    case GeometryType.CIRCLE:   return { ...base, radius: params.radius ?? 0.5 };
    case GeometryType.MESH:     return { ...base, assetId: params.assetId ?? null, scale: params.scale ?? [1, 1, 1] };
    default:                    return base;
  }
}

export function makeInertial(params = {}) {
  return {
    mass: params.mass ?? 1,
    com: params.com ?? [0, 0, 0], // center of mass
    inertia: params.inertia ?? { ixx: 0, ixy: 0, ixz: 0, iyy: 0, iyz: 0, izz: 0 },
    auto: params.auto ?? true,    // auto-compute from geometry+density when true
  };
}

export function makeBody(params = {}) {
  return {
    kind: 'body',
    id: params.id ?? uid('body'),
    name: params.name ?? 'Body',
    transform: params.transform ?? identityTransform(),
    visual: params.visual ?? { geometry: makeGeometry(), materialId: null, origin: identityOrigin() },
    collision: params.collision ?? null, // null → derive from visual
    inertial: params.inertial ?? makeInertial(),
    assetId: params.assetId ?? null,
    tags: params.tags ?? {},
    meta: params.meta ?? {},
  };
}

export function makeJoint(params = {}) {
  return {
    kind: 'joint',
    id: params.id ?? uid('joint'),
    name: params.name ?? 'Joint',
    type: params.type ?? JointType.REVOLUTE,
    parentBodyId: params.parentBodyId ?? null,
    childBodyId: params.childBodyId ?? null,
    origin: params.origin ?? identityOrigin(), // pivot frame relative to Body 1
    // Body 2's rest pose relative to the pivot frame. Decouples the pivot from the
    // bodies: moving `origin` moves only the pivot, while Body 2 stays put (its rest
    // world = body1 ∘ origin ∘ childRest). Identity → legacy "child sits at pivot".
    childRest: params.childRest ?? identityOrigin(),
    axis: params.axis ?? [0, 0, 1],
    limit: params.limit ?? { lower: -Math.PI, upper: Math.PI, effort: 0, velocity: 0 },
    dynamics: params.dynamics ?? { damping: 0, friction: 0 },
    mimic: params.mimic ?? null, // { jointId, multiplier, offset }
    state: params.state ?? { value: 0 }, // current joint position (rad or m)
    meta: params.meta ?? {},
  };
}

export function makeMaterial(params = {}) {
  return {
    kind: 'material',
    id: params.id ?? uid('mat'),
    name: params.name ?? 'Material',
    color: params.color ?? [0.6, 0.6, 0.65, 1], // rgba 0..1
    metalness: params.metalness ?? 0.5,
    roughness: params.roughness ?? 0.4,
    density: params.density ?? 1000, // kg/m^3 (for inertia auto-compute)
    meta: params.meta ?? {},
  };
}

export function makeAsset(params = {}) {
  return {
    kind: 'asset',
    id: params.id ?? uid('asset'),
    name: params.name ?? 'Asset',
    format: params.format ?? 'stl', // 'stl' | 'gltf' | 'obj' | 'step'
    data: params.data ?? null,      // base64 (embedded) — keeps .nischay self-contained
    url: params.url ?? null,        // or an external reference
    hash: params.hash ?? null,
    meta: params.meta ?? {},
  };
}

export function makeFrame(params = {}) {
  return {
    kind: 'frame',
    id: params.id ?? uid('frame'),
    name: params.name ?? 'Frame',
    transform: params.transform ?? identityTransform(),
    parentId: params.parentId ?? null,
    meta: params.meta ?? {},
  };
}

export function makeConstraint(params = {}) {
  return {
    kind: 'constraint',
    id: params.id ?? uid('con'),
    type: params.type ?? 'weld', // 'weld' | 'mate' | 'loop' | ...
    a: params.a ?? null,         // { bodyId, frame? }
    b: params.b ?? null,
    params: params.params ?? {},
    meta: params.meta ?? {},
  };
}

export const MODEL_VERSION = 1;

export function makeDocument(params = {}) {
  return {
    kind: 'document',
    id: params.id ?? uid('doc'),
    name: params.name ?? 'Untitled',
    modelVersion: MODEL_VERSION,
    bodies: params.bodies ?? {},        // id -> Body
    joints: params.joints ?? {},        // id -> Joint
    materials: params.materials ?? {},  // id -> Material
    assets: params.assets ?? {},        // id -> Asset
    frames: params.frames ?? {},        // id -> Frame
    constraints: params.constraints ?? {}, // id -> Constraint
    meta: params.meta ?? {},
  };
}
