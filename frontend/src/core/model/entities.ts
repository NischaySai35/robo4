/**
 * entities.ts — factory functions + types for the TETROBOT graph model (the "DDL").
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

// ── primitive aliases ────────────────────────────────────────────────────────
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];
/** rgba, each channel 0..1 */
export type RGBA = [number, number, number, number];
export type Meta = Record<string, unknown>;

// ── enums (const object + matching type, the standard TS idiom) ────────────────

export const JointType = Object.freeze({
  REVOLUTE: 'revolute',     // hinge with limits
  CONTINUOUS: 'continuous', // hinge, no limits
  PRISMATIC: 'prismatic',   // linear slider
  FIXED: 'fixed',           // rigid weld
  PLANAR: 'planar',
  FLOATING: 'floating',
  BALL: 'ball',             // spherical (extension beyond URDF)
} as const);
export type JointType = (typeof JointType)[keyof typeof JointType];

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
} as const);
export type GeometryType = (typeof GeometryType)[keyof typeof GeometryType];

// ── geometry ───────────────────────────────────────────────────────────────────
// Transitional shape: a permissive interface keyed by `type`. The fields actually
// present depend on `type` (see makeGeometry). A strict discriminated union is the
// intended end-state once consumers narrow on `type` — tracked in the TS ratchet.
export interface EditMesh { positions: number[]; indices: number[] }

export interface Geometry {
  type: GeometryType;
  size?: Vec3 | Vec2;
  radius?: number;
  length?: number;
  tube?: number;
  assetId?: string | null;
  scale?: Vec3;
  editMesh?: EditMesh; // baked override from mesh Edit Mode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
}

type GeometryParams = Partial<Geometry>;

// ── core entity shapes ─────────────────────────────────────────────────────────

export interface Transform { position: Vec3; quaternion: Quat; scale: Vec3; }
export interface Origin { position: Vec3; quaternion: Quat; }

export interface Inertia { ixx: number; ixy: number; ixz: number; iyy: number; iyz: number; izz: number; }
export interface Inertial { mass: number; com: Vec3; inertia: Inertia; auto: boolean; }

export interface Visual { geometry: Geometry; materialId: string | null; origin: Origin; }

export interface Body {
  kind: 'body';
  id: string;
  name: string;
  transform: Transform;
  visual: Visual;
  collision: Visual | null; // null → derive from visual
  inertial: Inertial;
  assetId: string | null;
  tags: Meta;
  meta: Meta;
}

export interface JointLimit { lower: number; upper: number; effort: number; velocity: number; }
export interface JointDynamics { damping: number; friction: number; }
export interface JointMimic { jointId: string; multiplier: number; offset: number; }
export interface JointState { value: number; }

export interface Joint {
  kind: 'joint';
  id: string;
  name: string;
  type: JointType;
  parentBodyId: string | null;
  childBodyId: string | null;
  origin: Origin;
  childRest: Origin;
  axis: Vec3;
  limit: JointLimit;
  dynamics: JointDynamics;
  mimic: JointMimic | null;
  state: JointState;
  meta: Meta;
}

export interface Material {
  kind: 'material';
  id: string;
  name: string;
  color: RGBA;
  metalness: number;
  roughness: number;
  density: number; // kg/m^3
  meta: Meta;
}

export type AssetFormat = 'stl' | 'gltf' | 'obj' | 'step';
export interface Asset {
  kind: 'asset';
  id: string;
  name: string;
  format: AssetFormat;
  data: string | null; // base64 (embedded)
  url: string | null;
  hash: string | null;
  meta: Meta;
}

export interface Frame {
  kind: 'frame';
  id: string;
  name: string;
  transform: Transform;
  parentId: string | null;
  meta: Meta;
}

export interface ConstraintEnd { bodyId: string; frame?: string; }
export interface Constraint {
  kind: 'constraint';
  id: string;
  type: string; // 'weld' | 'mate' | 'loop' | ...
  a: ConstraintEnd | null;
  b: ConstraintEnd | null;
  params: Meta;
  meta: Meta;
}

export interface Document {
  kind: 'document';
  id: string;
  name: string;
  modelVersion: number;
  bodies: Record<string, Body>;
  joints: Record<string, Joint>;
  materials: Record<string, Material>;
  assets: Record<string, Asset>;
  frames: Record<string, Frame>;
  constraints: Record<string, Constraint>;
  meta: Meta;
}

// ── id generation ────────────────────────────────────────────────────────────

let _counter = 0;
/** Stable-ish unique id with a readable prefix. */
export function uid(prefix = 'id'): string {
  _counter += 1;
  const rnd = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10);
  return `${prefix}-${_counter.toString(36)}${rnd.slice(0, 6)}`;
}

// ── transform helpers ──────────────────────────────────────────────────────────

export const identityTransform = (): Transform => ({
  position: [0, 0, 0],
  quaternion: [0, 0, 0, 1],
  scale: [1, 1, 1],
});

export const identityOrigin = (): Origin => ({ position: [0, 0, 0], quaternion: [0, 0, 0, 1] });

// ── factories ──────────────────────────────────────────────────────────────────

export function makeGeometry(type: GeometryType = GeometryType.BOX, params: GeometryParams = {}): Geometry {
  switch (type) {
    case GeometryType.BOX:      return { type, size: (params.size as Vec3) ?? [1, 1, 1] };
    case GeometryType.CYLINDER: return { type, radius: params.radius ?? 0.5, length: params.length ?? 1 };
    case GeometryType.CAPSULE:  return { type, radius: params.radius ?? 0.5, length: params.length ?? 1 };
    case GeometryType.SPHERE:   return { type, radius: params.radius ?? 0.5 };
    case GeometryType.CONE:     return { type, radius: params.radius ?? 0.5, length: params.length ?? 1 };
    case GeometryType.TORUS:    return { type, radius: params.radius ?? 0.5, tube: params.tube ?? 0.18 };
    case GeometryType.PLANE:    return { type, size: (params.size as Vec2) ?? [1, 1] };
    case GeometryType.CIRCLE:   return { type, radius: params.radius ?? 0.5 };
    case GeometryType.MESH:     return { type, assetId: params.assetId ?? null, scale: params.scale ?? [1, 1, 1] };
    default:                    return { type };
  }
}

export function makeInertial(params: Partial<Inertial> = {}): Inertial {
  return {
    mass: params.mass ?? 1,
    com: params.com ?? [0, 0, 0],
    inertia: params.inertia ?? { ixx: 0, ixy: 0, ixz: 0, iyy: 0, iyz: 0, izz: 0 },
    auto: params.auto ?? true, // auto-compute from geometry+density when true
  };
}

export function makeBody(params: Partial<Body> = {}): Body {
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

export function makeJoint(params: Partial<Joint> = {}): Joint {
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

export function makeMaterial(params: Partial<Material> = {}): Material {
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

export function makeAsset(params: Partial<Asset> = {}): Asset {
  return {
    kind: 'asset',
    id: params.id ?? uid('asset'),
    name: params.name ?? 'Asset',
    format: params.format ?? 'stl',
    data: params.data ?? null, // base64 (embedded) — keeps .nischay self-contained
    url: params.url ?? null,    // or an external reference
    hash: params.hash ?? null,
    meta: params.meta ?? {},
  };
}

export function makeFrame(params: Partial<Frame> = {}): Frame {
  return {
    kind: 'frame',
    id: params.id ?? uid('frame'),
    name: params.name ?? 'Frame',
    transform: params.transform ?? identityTransform(),
    parentId: params.parentId ?? null,
    meta: params.meta ?? {},
  };
}

export function makeConstraint(params: Partial<Constraint> = {}): Constraint {
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

export function makeDocument(params: Partial<Document> = {}): Document {
  return {
    kind: 'document',
    id: params.id ?? uid('doc'),
    name: params.name ?? 'Untitled',
    modelVersion: MODEL_VERSION,
    bodies: params.bodies ?? {},
    joints: params.joints ?? {},
    materials: params.materials ?? {},
    assets: params.assets ?? {},
    frames: params.frames ?? {},
    constraints: params.constraints ?? {},
    meta: params.meta ?? {},
  };
}
