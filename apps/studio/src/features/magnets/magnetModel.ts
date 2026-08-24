/**
 * magnetModel — pure helpers for the electromagnet locking layer.
 *
 * HARDWARE REALITY (per the build): each MODULE carries its own ESP32-C3 + DRV8833
 * driver. A DRV8833 has 2 H-bridge channels, wired to the module's two END-lock
 * electromagnets (GPIO 6/7 = channel A, GPIO 8/9 = channel B). Only END connectors
 * (on end-lock bodies) have a magnet; SIDE connectors (mid-module bodies) have a
 * passive metal plate and are never energized. This gives the three lock cases for
 * free:
 *   end↔end  → energize BOTH participating magnets
 *   end↔side → energize ONLY the end magnet
 *   side↔side→ nothing (a passive/mechanical latch, handled elsewhere)
 *
 * The END/SIDE classification is by body name and lives in features/motor/endBody
 * (isEndBody): end-lock bodies are named end_lock / endlock / endlock2 / copies.
 */
import type { Document, Connector, Body } from '@/core/model/index';
import { isEndBody } from '@/features/motor/endBody';

export interface MagnetRef {
  magnetId: string;     // stable id = `${bodyId}::${connectorId}`
  bodyId: string;
  connectorId: string;
  moduleId: string;     // the component (module) this magnet belongs to
  moduleName: string;
  name: string;         // human label, e.g. "end_lock · +X"
}

/** Stable per-connector magnet id. */
export function magnetIdOf(bodyId: string, connectorId: string): string {
  return `${bodyId}::${connectorId}`;
}

/** The module a body belongs to (its component, or the body itself if unassigned). */
export function moduleIdOf(body: Body): string {
  return body.componentId ?? body.id;
}

// Which world/local axis a connector normal points along — a compact face label so
// the two end magnets of a module read as "+X / −X" instead of raw ids.
const FACE_AXES: [string, [number, number, number]][] = [
  ['+X', [1, 0, 0]], ['−X', [-1, 0, 0]],
  ['+Y', [0, 1, 0]], ['−Y', [0, -1, 0]],
  ['+Z', [0, 0, 1]], ['−Z', [0, 0, -1]],
];
function faceLabel(normal: number[] | undefined): string {
  if (!normal) return '?';
  let best = '?', bestDot = -Infinity;
  for (const [name, v] of FACE_AXES) {
    const d = v[0] * (normal[0] ?? 0) + v[1] * (normal[1] ?? 0) + v[2] * (normal[2] ?? 0);
    if (d > bestDot) { bestDot = d; best = name; }
  }
  return best;
}

/** Every END-connector magnet in the document (side connectors excluded). */
export function listMagnets(doc: Document): MagnetRef[] {
  const out: MagnetRef[] = [];
  const comps = doc.components ?? {};
  for (const body of Object.values(doc.bodies)) {
    if (!isEndBody(body)) continue;
    const conns = (body.meta?.connectors as Connector[] | undefined) ?? [];
    const moduleId = moduleIdOf(body);
    const moduleName = comps[moduleId]?.name ?? body.name;
    conns.forEach((c) => out.push({
      magnetId: magnetIdOf(body.id, c.id),
      bodyId: body.id,
      connectorId: c.id,
      moduleId,
      moduleName,
      name: `${body.name} · ${faceLabel(c.normal as number[])}`,
    }));
  }
  return out;
}

/** End magnets grouped by module, in document order. Preserves per-module ordering
 *  so magnet 0/1 within a module map to DRV8833 channel A/B deterministically. */
export function magnetsByModule(doc: Document): Map<string, MagnetRef[]> {
  const map = new Map<string, MagnetRef[]>();
  for (const m of listMagnets(doc)) {
    const arr = map.get(m.moduleId);
    if (arr) arr.push(m); else map.set(m.moduleId, [m]);
  }
  return map;
}

/** DRV8833 channel index (0=A, 1=B, …) for a magnet within its module. -1 if not found. */
export function channelOf(doc: Document, magnetId: string): number {
  for (const arr of magnetsByModule(doc).values()) {
    const i = arr.findIndex((m) => m.magnetId === magnetId);
    if (i >= 0) return i;
  }
  return -1;
}

/**
 * The set of magnetIds that SHOULD be energized right now because their END
 * connector participates in an ACTIVE lock joint. A connector-generated FIXED joint
 * whose parent/child connector sits on an end-lock body means that magnet is holding
 * the lock. Joints keyed DISCONNECTED (state.disabled, e.g. during an animation) are
 * ignored — so magnets follow the animated connect/disconnect state automatically.
 */
export function commandedMagnets(doc: Document): Set<string> {
  const on = new Set<string>();
  for (const j of Object.values(doc.joints)) {
    if ((j as any).state?.disabled) continue;
    if (!j.meta?.generatedFromConnector) continue;
    const pa = j.parentBodyId ? doc.bodies[j.parentBodyId] : undefined;
    const cb = j.childBodyId ? doc.bodies[j.childBodyId] : undefined;
    const cA = j.meta?.connectorA, cB = j.meta?.connectorB;
    if (pa && isEndBody(pa) && cA) on.add(magnetIdOf(pa.id, String(cA)));
    if (cb && isEndBody(cb) && cB) on.add(magnetIdOf(cb.id, String(cB)));
  }
  return on;
}
