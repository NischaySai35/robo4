/**
 * Entity types (P11): for each kind of thing in a document, where it is kept, what it is called, which numbers can be
 * edited, and the undoable command that edits one. The property panel and the `entity.set` operator read this, so a
 * new kind or a new editable number is one entry here.
 */
import { commands } from '@/core/commands/index';
import { JOINT_PROPS, type PropertyDescriptor } from './props';

export interface EntityType {
  kind: string;
  /** the document's record holding this kind, e.g. doc.joints */
  collection: string;
  label: string;
  plural: string;
  props: PropertyDescriptor[];
  update: (id: string, patch: any) => any;
}

export const BODY_PROPS: PropertyDescriptor[] = [
  { path: 'inertial.mass', label: 'Mass', unit: 'g', scale: 1000, step: 0.1, min: 0, group: 'Inertia', fallback: 0.05 },
];

export const PROFILE_PROPS: PropertyDescriptor[] = [
  { path: 'torqueLimit', label: 'Torque limit', unit: 'N·m', step: 0.1, min: 0, group: 'Actuator', fallback: 0 },
];

export const MATERIAL_PROPS: PropertyDescriptor[] = [
  { path: 'metalness', label: 'Metal', step: 0.05, min: 0, max: 1, group: 'Look', fallback: 0.45 },
  { path: 'roughness', label: 'Rough', step: 0.05, min: 0, max: 1, group: 'Look', fallback: 0.45 },
  { path: 'density', label: 'Density', unit: 'kg/m³', step: 10, min: 0, group: 'Physics', fallback: 1000 },
];

export const ENTITY_TYPES: Record<string, EntityType> = {
  body: { kind: 'body', collection: 'bodies', label: 'Body', plural: 'Bodies', props: BODY_PROPS, update: commands.updateBody },
  joint: { kind: 'joint', collection: 'joints', label: 'Joint', plural: 'Joints', props: JOINT_PROPS, update: commands.updateJoint },
  jointProfile: { kind: 'jointProfile', collection: 'jointProfiles', label: 'Joint type', plural: 'Joint types', props: PROFILE_PROPS, update: commands.updateJointProfile },
  material: { kind: 'material', collection: 'materials', label: 'Material', plural: 'Materials', props: MATERIAL_PROPS, update: commands.updateMaterial },
};

/** The entity of this kind by id or name, or an error that lists what there is. */
export function findEntity(doc: any, kind: string, idOrName: string): { ok: true; type: EntityType; entity: any } | { ok: false; error: string } {
  const type = ENTITY_TYPES[kind];
  if (!type) return { ok: false, error: `No kind "${kind}". Kinds: ${Object.keys(ENTITY_TYPES).join(', ')}.` };
  const all = Object.values<any>(doc[type.collection] ?? {});
  const entity = all.find((e) => e.id === idOrName || e.name === idOrName);
  if (!entity) return { ok: false, error: `No ${type.label.toLowerCase()} "${idOrName}". ${type.plural}: ${all.map((e) => e.name).join(', ') || 'none'}.` };
  return { ok: true, type, entity };
}
