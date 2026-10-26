/**
 * restLayout.ts — where each of the module's ten bodies sits when every joint is zero.
 *
 * The MSRR model (modulink.ts) is a kinematic chain; the Editor's module is ten
 * rigid bodies with meshes. To DRAW the real module in the MSRR viewport the two
 * have to be tied together, and this file is that tie: for every body of the
 * Studio default module (core/factory/single-module-demo.json) it records which
 * joint of the chain carries it and where its origin sits relative to connector A
 * at rest, in the MSRR model's own frame and units. Nothing here is typed in by
 * hand — it is read from the document the Editor shows, so the two cannot drift.
 *
 * FRAME MAPPING. The document is in the Studio frame: the module's long axis is
 * +X, the bends turn about -Y, the receivers face +-Y. The MSRR model has the
 * chain running along local +Z of the flipped frame (so world -Z for an identity
 * base), bends about X, receivers facing +-X. The rotation between them is
 *
 *     (x_s, y_s, z_s)  ->  (-y_s, z_s, -x_s)         (determinant +1: a proper rotation)
 *
 * which sends the Studio bend axis -Y to +X (the model's bend axis), the Studio
 * chain direction +X to -Z (the identity base's chain direction) and Studio +Y to
 * -X, so the receiver on the +Y face (S1B, "1B") lands on the model's -X face as
 * modulink.ts assumes. A test checks all of it against the connector positions.
 */
import doc from '@/core/factory/single-module-demo.json';
import { type Vec3, type Quat, UNITS_PER_M } from './modulink';

/** Studio -> MSRR rotation as a quaternion, see the header. */
export const STUDIO_TO_MODEL_QUAT: Quat = (() => {
  // matrix columns are the images of x_s, y_s, z_s: (0,0,-1), (-1,0,0), (0,1,0)
  const m = [
    [0, -1, 0],
    [0, 0, 1],
    [-1, 0, 0],
  ];
  const tr = m[0][0] + m[1][1] + m[2][2];
  // trace is 0 here, so use the general branch for the largest diagonal term
  let q: Quat;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    q = [(m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s, 0.25 * s];
  } else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
    const s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2;
    q = [0.25 * s, (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s, (m[2][1] - m[1][2]) / s];
  } else if (m[1][1] > m[2][2]) {
    const s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2;
    q = [(m[0][1] + m[1][0]) / s, 0.25 * s, (m[1][2] + m[2][1]) / s, (m[0][2] - m[2][0]) / s];
  } else {
    const s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2;
    q = [(m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, 0.25 * s, (m[1][0] - m[0][1]) / s];
  }
  return q;
})();

/** Map a Studio-frame vector (metres) into the MSRR model's frame (metres). */
export const studioToModel = (v: readonly number[]): Vec3 => [-v[1], v[2], -v[0]];

/** What carries each body. -1 is the end A lock body (the chain's base). */
const CARRIER: Record<string, number> = {
  EndA_LockModule: -1,
  L1_LockRotor_A: -1,
  T1_Housing_B1Fork: 0, // T1
  Spine1_B1B2: 1, // B1
  T2_Housing_B2Fork_GROUND: 2, // B2
  T2_Ring_B3Fork: 3, // T2
  Spine2_B3B4: 4, // B3
  T3_Housing_B4Fork: 5, // B4
  EndB_LockModule: 6, // T3
  L2_LockRotor_B: 6,
};

export interface RestBody {
  name: string;
  /** joint index that carries this body, or -1 for the base (End A) */
  carrier: number;
  /** body origin at rest, relative to connector A, in module units, in the model frame */
  position: Vec3;
  /** the document asset holding its mesh */
  assetId: string;
  /** base64 STL, Studio frame, millimetres, body-local */
  stl: string;
  /** which part this is, for colouring */
  kind: 'housing' | 'spine' | 'lock' | 'rotor';
}

interface DocBody {
  name: string;
  assetId: string;
  transform: { position: number[] };
  meta?: { connectors?: { id: string; position: number[] }[] };
}

let cache: RestBody[] | null = null;

/** All ten bodies at rest, parsed once from the Studio default module document. */
export function restBodies(): RestBody[] {
  if (cache) return cache;
  const bodies = Object.values((doc as any).bodies) as DocBody[];
  const endA = bodies.find((b) => b.name === 'EndA_LockModule')!;
  const conn = endA.meta!.connectors!.find((c) => c.id === 'conn-endA')!;
  // connector A in the Studio world: End A's body origin plus the connector's local offset
  const a = [0, 1, 2].map((i) => endA.transform.position[i] + conn.position[i]);

  cache = bodies.map((b) => {
    const rel = [0, 1, 2].map((i) => b.transform.position[i] - a[i]);
    const m = studioToModel(rel);
    return {
      name: b.name,
      carrier: CARRIER[b.name] ?? -1,
      position: [m[0] * UNITS_PER_M, m[1] * UNITS_PER_M, m[2] * UNITS_PER_M] as Vec3,
      assetId: b.assetId,
      stl: ((doc as any).assets[b.assetId] as { data: string }).data,
      kind: /Spine/.test(b.name) ? 'spine' : /Lock(Module|Rotor)/.test(b.name)
        ? (/Rotor/.test(b.name) ? 'rotor' : 'lock') : 'housing',
    } as RestBody;
  });
  return cache;
}
