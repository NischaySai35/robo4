/**
 * defaultModule — a GLOBAL "default module" available in every project, so
 * "Add Module" works even in a fresh/empty document (not only in the project that
 * happens to contain the hand-built original).
 *
 * The default is the bundled Single-Module snapshot (single-module-demo.json:
 * 8 bodies, 7 joints, 1 Component, 4 mesh assets). Users can override it with
 * their own edited module via saveDefaultModule() — persisted to localStorage so
 * it survives across projects and sessions. getDefaultModuleDoc() returns the
 * override if present, else the bundled snapshot.
 */
import type { Document } from '@/core/model/index';
import { uid } from '@/core/model/index';
import bundledModuleDoc from './single-module-demo.json';

const LS_KEY = 'tetrobot.defaultModule.v1';

/** The module Document used as the "Add Module" / "Edit Default Module" source. */
export function getDefaultModuleDoc(): Document {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as Document;
  } catch { /* fall through to bundled */ }
  return bundledModuleDoc as unknown as Document;
}

/** Persist `doc` as the user's default module (used by future Add Module calls). */
export function saveDefaultModule(doc: Document) {
  localStorage.setItem(LS_KEY, JSON.stringify(doc));
}

/** True if the user has overridden the bundled default with their own edit. */
export function hasCustomDefaultModule(): boolean {
  try { return !!localStorage.getItem(LS_KEY); } catch { return false; }
}

/** Wrap a module Document as a loadable project (for bridge.loadScene). */
export function moduleDocToProject(doc: Document) {
  return {
    format: 'tetrobot-project', version: 1, app: 'TETROBOT',
    savedAt: new Date().toISOString(),
    scene: { activeModuleId: null, nextId: 1, modules: [], welds: [] },
    model: doc,
    animation: { duration: 4, tracks: {} },
  };
}

/**
 * Entities that instantiate the default module INTO `currentDoc`: a fresh
 * Component (bodies + joints, new ids) offset clear of any existing copies, plus
 * any assets/materials it references that aren't already in the project (kept by
 * id so the copies resolve). Feed the result to commands.addEntities().
 */
export function buildDefaultModuleEntities(currentDoc: Document): { entities: any[]; componentName: string } {
  const src = getDefaultModuleDoc();
  const comp: any = Object.values(src.components ?? {})[0];
  if (!comp) return { entities: [], componentName: '' };

  const srcBodies = Object.values(src.bodies ?? {}).filter((b: any) => b.componentId === comp.id) as any[];
  const srcJoints = Object.values(src.joints ?? {}).filter((j: any) => j.componentId === comp.id) as any[];

  // Offset along +X by the module's own width so repeated adds line up, stepping
  // further for each existing copy already in the current project.
  let minX = Infinity, maxX = -Infinity;
  for (const b of srcBodies) { minX = Math.min(minX, b.transform.position[0]); maxX = Math.max(maxX, b.transform.position[0]); }
  const spacing = Math.max(0.15, maxX - minX) + 0.25;
  const existingCopies = Object.values(currentDoc.components ?? {})
    .filter((c: any) => c.name === comp.name || c.name.startsWith(`${comp.name} `)).length;
  const offsetX = spacing * existingCopies;

  const newComp = { ...structuredClone(comp), id: uid('comp'), name: `${comp.name} ${existingCopies + 1}` };

  const bodyIdRemap = new Map<string, string>();
  const newBodies = srcBodies.map((b) => {
    const id = uid('body');
    bodyIdRemap.set(b.id, id);
    const copy = structuredClone(b);
    copy.id = id;
    copy.componentId = newComp.id;
    copy.transform = { ...copy.transform, position: [copy.transform.position[0] + offsetX, copy.transform.position[1], copy.transform.position[2]] };
    return copy;
  });

  const newJoints = srcJoints.map((j) => {
    const copy = structuredClone(j);
    copy.id = uid('joint');
    copy.componentId = newComp.id;
    if (bodyIdRemap.has(copy.parentBodyId)) copy.parentBodyId = bodyIdRemap.get(copy.parentBodyId);
    if (bodyIdRemap.has(copy.childBodyId)) copy.childBodyId = bodyIdRemap.get(copy.childBodyId);
    return copy;
  });

  // Merge referenced assets/materials by id (skip ones already present so repeated
  // Add Module calls don't duplicate the mesh data).
  const merged: any[] = [];
  for (const b of newBodies) {
    const aId = (b as any).assetId;
    if (aId && (src.assets as any)?.[aId] && !(currentDoc.assets as any)?.[aId] && !merged.some((e) => e.id === aId)) {
      merged.push(structuredClone((src.assets as any)[aId]));
    }
  }
  for (const m of Object.values(src.materials ?? {}) as any[]) {
    if (!(currentDoc.materials as any)?.[m.id] && !merged.some((e) => e.id === m.id)) merged.push(structuredClone(m));
  }
  // Shared joint types (profiles) the joints reference — keep by id so the copies resolve.
  for (const j of newJoints as any[]) {
    const pid = j.profileId;
    if (pid && (src.jointProfiles as any)?.[pid] && !(currentDoc.jointProfiles as any)?.[pid] && !merged.some((e) => e.id === pid)) {
      merged.push(structuredClone((src.jointProfiles as any)[pid]));
    }
  }

  return { entities: [...merged, newComp, ...newBodies, ...newJoints], componentName: newComp.name };
}
