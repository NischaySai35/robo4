/**
 * Property descriptors (P11, Blender's RNA in small): every editable value is described once (where it lives,
 * its label, unit, range), and the panel, scripts and later animation all use that description.
 * Pure: no React, no stores.
 */
export interface PropertyDescriptor<E = any> {
  /** dotted path in the entity, e.g. "limit.lower" */
  path: string;
  label: string;
  unit?: string;
  /** shown value = stored value × scale (e.g. radians shown in degrees) */
  scale?: number;
  step?: number;
  min?: number;
  max?: number;
  group?: string;
  /** only offered when this is true for the entity */
  when?: (e: E) => boolean;
  /** stored when the field is missing */
  fallback?: number;
}

const RAD = 180 / Math.PI;
const hasLimits = (j: any) => j.type === 'revolute' || j.type === 'prismatic';
const moves = (j: any) => j.type !== 'fixed';

export const JOINT_PROPS: PropertyDescriptor[] = [
  { path: 'limit.lower', label: 'Lower', unit: '°', scale: RAD, step: 5, group: 'Limits', when: (j) => j.type === 'revolute', fallback: -Math.PI },
  { path: 'limit.upper', label: 'Upper', unit: '°', scale: RAD, step: 5, group: 'Limits', when: (j) => j.type === 'revolute', fallback: Math.PI },
  { path: 'limit.lower', label: 'Lower', unit: 'mm', scale: 1000, step: 1, group: 'Limits', when: (j) => j.type === 'prismatic', fallback: 0 },
  { path: 'limit.upper', label: 'Upper', unit: 'mm', scale: 1000, step: 1, group: 'Limits', when: (j) => j.type === 'prismatic', fallback: 0 },
  { path: 'limit.effort', label: 'Effort', unit: 'N·m', step: 0.1, min: 0, group: 'Limits', when: hasLimits, fallback: 0 },
  { path: 'limit.velocity', label: 'Velocity', step: 0.1, min: 0, group: 'Limits', when: hasLimits, fallback: 0 },
  { path: 'dynamics.damping', label: 'Damping', step: 0.01, min: 0, group: 'Dynamics', when: moves, fallback: 0 },
  { path: 'dynamics.friction', label: 'Friction', step: 0.01, min: 0, group: 'Dynamics', when: moves, fallback: 0 },
  { path: 'mimic.multiplier', label: 'Multiplier', step: 0.1, group: 'Mimic', when: (j) => moves(j) && !!j.mimic, fallback: 1 },
  { path: 'mimic.offset', label: 'Offset', step: 0.1, group: 'Mimic', when: (j) => moves(j) && !!j.mimic, fallback: 0 },
];

export const propsFor = (defs: PropertyDescriptor[], entity: any) => defs.filter((d) => !d.when || d.when(entity));

export function getProp(entity: any, d: PropertyDescriptor): number {
  const v = d.path.split('.').reduce((o, k) => o?.[k], entity);
  return typeof v === 'number' ? v : (d.fallback ?? 0);
}

/** The top-level patch that sets one stored value, keeping the rest of its object (for updateJoint / updateBody). */
export function patchFor(entity: any, path: string, stored: number) {
  const [head, ...rest] = path.split('.');
  if (!rest.length) return { [head]: stored };
  const set = (o: any, keys: string[]): any => keys.length === 1 ? { ...o, [keys[0]]: stored } : { ...o, [keys[0]]: set(o?.[keys[0]] ?? {}, keys.slice(1)) };
  return { [head]: set(entity[head] ?? {}, rest) };
}

/** Validate a scripted change in shown units: says what is wrong rather than storing nonsense. */
export function checkValue(entity: any, defs: PropertyDescriptor[], path: string, shown: number): { ok: true; stored: number } | { ok: false; error: string } {
  const d = propsFor(defs, entity).find((x) => x.path === path);
  if (!d) return { ok: false, error: `"${path}" can't be set here. Settable: ${propsFor(defs, entity).map((x) => x.path).join(', ')}.` };
  if (!Number.isFinite(shown)) return { ok: false, error: `${d.label} needs a number.` };
  if (d.min !== undefined && shown < d.min) return { ok: false, error: `${d.label} can't be below ${d.min}${d.unit ? ' ' + d.unit : ''}.` };
  if (d.max !== undefined && shown > d.max) return { ok: false, error: `${d.label} can't be above ${d.max}${d.unit ? ' ' + d.unit : ''}.` };
  return { ok: true, stored: shown / (d.scale ?? 1) };
}
