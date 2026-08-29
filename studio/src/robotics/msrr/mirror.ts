/**
 * mirror.ts — the bridge from the lattice sandbox to the real model Document.
 *
 * The MSRR page plans in lattice space because that is where reconfiguration is
 * tractable. But a lattice cell is an abstraction, and the thing you are going to
 * build is an 8-body module with real connectors. This file keeps the two in step:
 * one instance of the project's default module per occupied cell, driven live from
 * the lattice poses, so the shared 3D scene shows the actual robot doing the plan
 * while the sandbox view shows the abstraction that produced it.
 *
 * DESIGN NOTE, AND ITS HONEST LIMIT
 * Mirrored modules are placed RIGIDLY at cell poses. Their internal joints are not
 * solved, and no connector mating or loop closure is run. That is deliberate: a
 * full connectorSnap + loop-stabilise pass per move would make planning orders of
 * magnitude slower and is not what the mirror is for. The mirror answers "does
 * this plan look right at real scale, with real geometry, in the real scene" — it
 * does NOT certify that the connectors mate. Use Materialize (a one-shot snapshot
 * into the document) when you want a structure to keep and edit properly.
 */
import type { Document } from '@/core/model/index';
import { buildDefaultModuleEntities } from '@/core/factory/defaultModule';
import { type Cell, type Config, key } from './lattice';
import { type Pose, IDENTITY_QUAT } from './executor';

/** Marks every entity this file creates, so cleanup never touches user geometry. */
export const MIRROR_TAG = 'msrrMirror';

interface MirroredBody {
  bodyId: string;
  /** body position relative to the module's own centroid, at build time */
  offset: [number, number, number];
}

interface MirroredModule {
  moduleId: string;
  componentId: string;
  bodies: MirroredBody[];
}

/**
 * Session registry of what is currently mirrored. Module-level rather than in a
 * store because it is pure bookkeeping the UI never reads — the UI asks the
 * lattice store what the config is, not what the mirror did about it.
 */
let registry: MirroredModule[] = [];

export const mirrorCount = () => registry.length;
export const isMirroring = () => registry.length > 0;

function quatRotate(
  q: [number, number, number, number],
  v: [number, number, number],
): [number, number, number] {
  const [x, y, z, w] = q;
  // t = 2 * (q_vec x v); v' = v + w*t + q_vec x t
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [
    v[0] + w * tx + (y * tz - z * ty),
    v[1] + w * ty + (z * tx - x * tz),
    v[2] + w * tz + (x * ty - y * tx),
  ];
}

/**
 * Entities for one module instance placed at `pose`. Built from the project's
 * default module so the mirror shows YOUR module, including any edits saved to it.
 */
function moduleEntitiesAt(doc: Document, pose: Pose, moduleId: string, tagged: boolean) {
  const { entities } = buildDefaultModuleEntities(doc);
  if (!entities.length) return { entities: [], record: null as MirroredModule | null };

  const bodies = entities.filter((e: any) => e.kind === 'body');
  const comp = entities.find((e: any) => e.kind === 'component');
  if (!comp || !bodies.length) return { entities: [], record: null as MirroredModule | null };

  // Centroid of the module's bodies — we place THAT at the cell centre, so a cell
  // means "a module sits here" rather than "the module's arbitrary first body
  // happens to be here".
  let cx = 0, cy = 0, cz = 0;
  for (const b of bodies) {
    cx += b.transform.position[0]; cy += b.transform.position[1]; cz += b.transform.position[2];
  }
  cx /= bodies.length; cy /= bodies.length; cz /= bodies.length;

  const record: MirroredModule = { moduleId, componentId: comp.id, bodies: [] };

  for (const b of bodies) {
    const offset: [number, number, number] = [
      b.transform.position[0] - cx,
      b.transform.position[1] - cy,
      b.transform.position[2] - cz,
    ];
    record.bodies.push({ bodyId: b.id, offset });
    const rotated = quatRotate(pose.quaternion, offset);
    b.transform = {
      ...b.transform,
      position: [
        pose.position[0] + rotated[0],
        pose.position[1] + rotated[1],
        pose.position[2] + rotated[2],
      ],
    };
    if (tagged) b.meta = { ...(b.meta ?? {}), [MIRROR_TAG]: moduleId };
  }
  if (tagged) comp.meta = { ...(comp.meta ?? {}), [MIRROR_TAG]: moduleId };
  comp.name = tagged ? `MSRR ${moduleId}` : comp.name;

  return { entities, record };
}

/**
 * Build the entity list for a whole config. Used both by Materialize (tagged
 * false — a permanent, editable snapshot) and by the live mirror (tagged true —
 * disposable, and removable in one sweep).
 */
export function buildConfigEntities(
  doc: Document,
  config: Config,
  cellSize: number,
  tagged: boolean,
): { entities: any[]; records: MirroredModule[] } {
  const out: any[] = [];
  const records: MirroredModule[] = [];
  // Track the doc as it grows so shared assets/materials are emitted exactly once
  // (buildDefaultModuleEntities skips anything already present in the doc it sees).
  let growing: Document = doc;

  for (const [k, moduleId] of config.occ) {
    const cell = k.split(',').map(Number) as Cell;
    const pose: Pose = {
      position: [cell[0] * cellSize, cell[1] * cellSize, cell[2] * cellSize],
      quaternion: IDENTITY_QUAT,
    };
    const { entities, record } = moduleEntitiesAt(growing, pose, moduleId, tagged);
    if (!entities.length || !record) continue;
    out.push(...entities);
    records.push(record);

    // Cheap shadow-merge: only the id maps matter to the "already present" test.
    const assets = { ...(growing.assets ?? {}) } as any;
    const materials = { ...(growing.materials ?? {}) } as any;
    const jointProfiles = { ...((growing as any).jointProfiles ?? {}) } as any;
    const components = { ...(growing.components ?? {}) } as any;
    for (const e of entities) {
      if (e.kind === 'asset') assets[e.id] = e;
      else if (e.kind === 'material') materials[e.id] = e;
      else if (e.kind === 'jointProfile') jointProfiles[e.id] = e;
      else if (e.kind === 'component') components[e.id] = e;
    }
    growing = { ...growing, assets, materials, components, jointProfiles } as Document;
  }
  return { entities: out, records };
}

/** Remember what a freshly-added mirror consists of, so it can be driven and removed. */
export function setRegistry(records: MirroredModule[]) { registry = records; }
export function clearRegistry() { registry = []; }

/** Component ids belonging to the live mirror — the cleanup list. */
export const mirrorComponentIds = () => registry.map((r) => r.componentId);

/**
 * Transient body-position patch that puts every mirrored module at its current
 * pose. Returned as a doc-transform so the caller can push it through
 * applyTransient (the 60 Hz path that bypasses undo history) rather than
 * dispatching a command per frame.
 */
export function mirrorUpdater(poses: Map<string, Pose>) {
  return (doc: Document): Document => {
    if (!registry.length) return doc;
    const bodies: any = { ...doc.bodies };
    let touched = false;

    for (const rec of registry) {
      const pose = poses.get(rec.moduleId);
      if (!pose) continue;
      for (const mb of rec.bodies) {
        const b = bodies[mb.bodyId];
        if (!b) continue;
        const rotated = quatRotate(pose.quaternion, mb.offset);
        bodies[mb.bodyId] = {
          ...b,
          transform: {
            ...b.transform,
            position: [
              pose.position[0] + rotated[0],
              pose.position[1] + rotated[1],
              pose.position[2] + rotated[2],
            ],
            quaternion: pose.quaternion,
          },
        };
        touched = true;
      }
    }
    return touched ? { ...doc, bodies } : doc;
  };
}

/** Ids of every entity previously tagged as mirror output, for a clean sweep. */
export function findMirrorComponents(doc: Document): string[] {
  return Object.values(doc.components ?? {})
    .filter((c: any) => c?.meta?.[MIRROR_TAG] !== undefined)
    .map((c: any) => c.id);
}

/** Where a module's cell is, in world units — used to seed poses on mirror start. */
export function cellWorldPose(config: Config, moduleId: string, cellSize: number): Pose | null {
  for (const [k, id] of config.occ) {
    if (id !== moduleId) continue;
    const c = k.split(',').map(Number);
    return { position: [c[0] * cellSize, c[1] * cellSize, c[2] * cellSize], quaternion: IDENTITY_QUAT };
  }
  return null;
}

/** Resting poses for every module in a config. */
export function restingPoses(config: Config, cellSize: number): Map<string, Pose> {
  const out = new Map<string, Pose>();
  for (const [k, id] of config.occ) {
    const c = k.split(',').map(Number);
    out.set(id, {
      position: [c[0] * cellSize, c[1] * cellSize, c[2] * cellSize],
      quaternion: IDENTITY_QUAT,
    });
  }
  return out;
}

export const cellKeyOf = key;
