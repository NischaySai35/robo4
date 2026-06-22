/**
 * macros.ts — parametric assembly macros (our GUI-first answer to xacro).
 *
 * A macro is a pure function (params) → a serial-chain spec (links + joints) that
 * `buildSerialChain` expands into real Bodies + Joints. Change a param (segment count,
 * length, axis) and re-expand to get a whole sub-assembly — no hand-placing each link.
 * Because expansion just emits model entities, the result is fully editable and (when
 * dispatched through the command bus) undoable. Pure, node-testable.
 */
import { makeGeometry, GeometryType } from './entities';
import { buildSerialChain } from './builders';
import type { Document } from './entities';

export interface ChainSpec {
  name: string;
  links: { name: string; geometry: any; transform: { position: number[]; quaternion: number[] } }[];
  joints: { name: string; type: string; axis: number[]; limit: any; origin: { position: number[]; quaternion: number[] } }[];
}

export interface ArmMacroParams {
  name?: string;
  segments?: number;        // number of moving links
  length?: number;          // length of each link (m)
  radius?: number;          // link radius (m)
  axis?: [number, number, number];
  vMax?: number;
  baseY?: number;           // height of the base above ground
}

/** A straight serial arm: N cylindrical links stacked along +Y, revolute joints. */
export function armMacro(p: ArmMacroParams = {}): ChainSpec {
  const name = p.name ?? 'Arm';
  const segments = Math.max(1, Math.floor(p.segments ?? 3));
  const length = p.length ?? 1;
  const radius = p.radius ?? 0.1;
  const axis = p.axis ?? [0, 0, 1];
  const vMax = p.vMax ?? 1.5;
  const baseY = p.baseY ?? length;             // sit above the ground plane

  const nLinks = segments + 1;                 // base + N moving links
  const geo = () => makeGeometry(GeometryType.CYLINDER, { radius, length });
  const links = Array.from({ length: nLinks }, (_, i) => ({
    name: `${name} L${i + 1}`,
    geometry: geo(),
    transform: { position: [0, baseY + i * length, 0], quaternion: [0, 0, 0, 1] },
  }));
  const joints = Array.from({ length: segments }, (_, i) => ({
    name: `${name} J${i + 1}`,
    type: 'revolute',
    axis,
    limit: { lower: -Math.PI, upper: Math.PI, effort: 5, velocity: vMax },
    origin: { position: [0, length, 0], quaternion: [0, 0, 0, 1] },
  }));
  return { name, links, joints };
}

/** Expand a chain spec into a Document; returns the new doc + created ids. */
export function expandChain(doc: Document, spec: ChainSpec) {
  return buildSerialChain(doc, { name: spec.name, links: spec.links, joints: spec.joints });
}

/** Registry so a GUI macro browser can list + parameterize available macros. */
export const MACROS = {
  arm: { label: 'Serial Arm', build: armMacro },
} as const;
