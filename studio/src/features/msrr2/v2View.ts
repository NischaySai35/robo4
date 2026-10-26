/**
 * v2View.ts — what the MSRR viewport draws for a v2 Config.
 *
 * The viewport already knows how to draw a hand-placed module from its real meshes
 * (a FittedModule with `baseQuat` + `anchorPos`), so a v2 assembly is converted into
 * exactly that. Units: v2 works in METRES with the floor at y = 0; the viewport works
 * in lattice cubes with the floor at y = -0.5.
 */
import type { FittedModule } from '@/robotics/msrr/fitModules';
import type { LatticePose } from '@/robotics/msrr/chainMoves';
import type { ModuleAngles } from '@/robotics/msrr/modulink';
import { CUBES_PER_METRE } from '@/features/msrr/moduleMeshes';
import type { Assembly } from '@/robotics/msrr2/assemble';
import type { StaticReport } from '@/robotics/msrr2/statics';
import type { V3 } from '@/robotics/msrr2/vec';

/** metres (floor y = 0) -> viewport cubes (floor y = -0.5) */
export const toView = (p: V3): V3 => [p[0] * CUBES_PER_METRE, p[1] * CUBES_PER_METRE - 0.5, p[2] * CUBES_PER_METRE];

export function assemblyToFitted(asm: Assembly): FittedModule[] {
  return [...asm.placed.values()].map((p, i) => {
    const anchor = toView(p.base.p);
    const pose: LatticePose = {
      id: `v2:${p.id}`, bendPoseId: 'v2', twistSteps: [0, 0, 0],
      angles: p.rad as unknown as ModuleAngles,
      endOffset: [0, 0, 0], endDir: [0, 0, 1], cells: [[0, 0, 0]], reach: 0, snapError: 0,
      sides: [], anchorEnd: 'A',
    };
    return {
      id: p.id,
      anchorCell: [Math.round(anchor[0]), Math.round(anchor[1]), Math.round(anchor[2])],
      anchorPos: anchor,
      anchorDir: [0, 0, 1],
      endCell: [0, 0, 0], endDir: [0, 0, 1],
      cells: [], reach: 0, pose,
      weldedTo: null, order: i, chain: 0, serves: null,
      baseQuat: p.base.q,
    };
  });
}

/** Overlay marks for a static report, in viewport units. */
export interface V2Overlay {
  com: V3 | null;
  comFloor: V3 | null;
  comOk: boolean;
  support: V3[];
  contacts: V3[];
  locks: V3[];
  /** module ids whose joints are over the torque budget */
  overloaded: string[];
  /** where the centre of gravity really is, with the robot sagging under its weight */
  comSag: V3 | null;
  /** load on each floor contact (summed per touching part), newtons */
  contactForces: { p: V3; n: number }[];
}

export function overlayOf(r: StaticReport | null): V2Overlay | null {
  if (!r) return null;
  const overloaded = [...new Set(r.torques.filter((t) => t.pct > 70).map((t) => t.module))];
  return {
    com: toView(r.com),
    comFloor: toView([r.com[0], 0.001, r.com[2]]),
    comOk: r.ok,
    support: r.support.map(([x, z]) => toView([x, 0.002, z])),
    contacts: r.contacts.map((c) => toView([c.p[0], 0.002, c.p[2]])),
    locks: r.assembly.locks.map((l) => toView(l.at)),
    overloaded,
    comSag: toView(r.sag.com),
    contactForces: (() => {
      const g = new Map<string, { x: number; z: number; n: number; k: number }>();
      for (const c of r.contacts) {
        const key = `${c.module}:${c.seg}`; const e = g.get(key) ?? { x: 0, z: 0, n: 0, k: 0 };
        e.x += c.p[0]; e.z += c.p[2]; e.n += c.force; e.k++; g.set(key, e);
      }
      return [...g.values()].filter((e) => e.n > 0.05).map((e) => ({ p: toView([e.x / e.k, 0.002, e.z / e.k]), n: e.n }));
    })(),
  };
}
