/**
 * modulePaint — ONE colour rule for a module's connectors, in EVERY viewport (Nischay 12 Nov: "lying down I can't tell how
 * it lies"): the outer lock parts End A dark blue, End B orange; the four side receivers by SIDE - S1A + S2A (the A side)
 * green, S1B + S2B (the B side) purple. So any pose reads at a glance: which end, which side is up.
 *
 * The receivers are part of the spine's mesh, so the spine's triangles are sorted once, straight from the STL file, by the
 * body's own side connectors (a triangle within RING_R of the connector's axis and at most RING_DEPTH inside its face is that
 * receiver). Triangle order survives welding, centring and baking, so every renderer splits its own copy with the same list.
 * REUSE-CHECKED: partMats|endA|EndA_LockModule|paint -> MsrrCanvas.partMats held the end colours for MSRR only, BodyRenderer
 * (Editor / Animation / Analysis / Training / ESP-TTL) drew the document's plain white; both read this now.
 */
import * as THREE from 'three';
import type { Connector } from '@/core/model/index';

export type Paint = 'endA' | 'endB' | 'sideA' | 'sideB';
export const PAINT: Record<Paint, number> = { endA: 0x1f3fbf, endB: 0xff8c0d, sideA: 0x16a34a, sideB: 0x9333ea };

/** the outer lock parts (which end is which on a symmetric module) */
export function endPaint(bodyName: string | undefined): Paint | null {
  if (!bodyName) return null;
  return /EndA_LockModule/.test(bodyName) ? 'endA' : /EndB_LockModule/.test(bodyName) ? 'endB' : null;
}

// measured on try8's spine (12 Nov): the receiver ring + its face plate sit 18-40 mm out from the spine's middle, inside
// 37 mm of the connector's axis; nothing else of the spine is there (gap at 35-40 mm), the face is at 31 mm
const RING_R = 0.037, RING_DEPTH = 0.013;   // m

// which side: the connector's name ("Side receiver 1A") or id (conn-s1a); a copied module's connectors get new random ids
// (12 Nov: con-sdf107d -> every receiver of the second module came out green), so last the way it faces: the A receivers face
// the body's -y, the B ones +y (try8, every copy)
const sideOf = (c: Connector): Paint | null => {
  const m = /receiver\s*\d\s*([ab])\b/i.exec(c.name ?? '') ?? /(?:^|-)s\d([ab])$/i.exec(c.id ?? '');
  if (m) return m[1].toLowerCase() === 'b' ? 'sideB' : 'sideA';
  if ((c as any).kind !== 'side') return null;
  return (c.normal?.[1] ?? 0) > 0 ? 'sideB' : 'sideA';
};

const labelCache = new Map<string, Uint8Array | null>();

/** per triangle: 0 = the part's own colour, 1 = A-side receiver, 2 = B-side receiver. stl = the binary STL bytes; scale =
 *  file units -> metres (the body's geometry scale). null = no receivers here (or not a binary STL). Cached by key. */
export function receiverLabels(key: string, stlBytes: Uint8Array | (() => Uint8Array), scale: number, connectors: Connector[]): Uint8Array | null {
  const sides = connectors.map((c) => ({ c, p: sideOf(c) })).filter((x) => x.p);
  const ck = key + '|' + sides.map((s) => s.c.id + s.c.position.join(',') + s.c.normal.join(',')).join(';') + '|' + scale;
  if (labelCache.has(ck)) return labelCache.get(ck)!;
  let out: Uint8Array | null = null;
  const stl = sides.length ? (typeof stlBytes === 'function' ? stlBytes() : stlBytes) : null;   // decoded only once per key
  if (stl && stl.byteLength >= 84) {
    const dv = new DataView(stl.buffer, stl.byteOffset, stl.byteLength), n = dv.getUint32(80, true);
    if (84 + n * 50 === stl.byteLength) {
      out = new Uint8Array(n); let hit = 0;
      for (let k = 0; k < n; k++) {
        const o = 84 + k * 50 + 12; let x = 0, y = 0, z = 0;
        for (let v = 0; v < 3; v++) { x += dv.getFloat32(o + v * 12, true); y += dv.getFloat32(o + v * 12 + 4, true); z += dv.getFloat32(o + v * 12 + 8, true); }
        x *= scale / 3; y *= scale / 3; z *= scale / 3;
        for (const { c, p } of sides) {
          const dx = x - c.position[0], dy = y - c.position[1], dz = z - c.position[2];
          const d = dx * c.normal[0] + dy * c.normal[1] + dz * c.normal[2];
          if (d < -RING_DEPTH) continue;
          const rx = dx - d * c.normal[0], ry = dy - d * c.normal[1], rz = dz - d * c.normal[2];
          if (rx * rx + ry * ry + rz * rz < RING_R * RING_R) { out[k] = p === 'sideB' ? 2 : 1; hit++; break; }
        }
      }
      if (!hit) out = null;
    }
  }
  labelCache.set(ck, out);
  return out;
}

const splitCache = new WeakMap<THREE.BufferGeometry, Map<Uint8Array, THREE.BufferGeometry[]>>();

/** the geometry cut by those labels: [own colour, A receivers, B receivers]. The pieces share the vertex data (no copy);
 *  triangles past the labels (added later, e.g. the IMU board) keep the part's colour. Cached per geometry. */
export function splitByLabels(geo: THREE.BufferGeometry, labels: Uint8Array): THREE.BufferGeometry[] {
  let per = splitCache.get(geo); const got = per?.get(labels); if (got) return got;
  const idx = geo.index ? geo.index.array : null;
  const tris = (idx ? idx.length : geo.getAttribute('position').count) / 3;
  const lists: number[][] = [[], [], []];
  for (let k = 0; k < tris; k++) {
    const l = lists[k < labels.length ? labels[k] : 0];
    if (idx) l.push(idx[3 * k], idx[3 * k + 1], idx[3 * k + 2]); else l.push(3 * k, 3 * k + 1, 3 * k + 2);
  }
  const out = lists.map((l) => {
    const g = new THREE.BufferGeometry();
    for (const [name, a] of Object.entries(geo.attributes)) g.setAttribute(name, a);
    g.setIndex(l); g.boundingBox = geo.boundingBox; g.boundingSphere = geo.boundingSphere;
    if (!g.boundingSphere) g.computeBoundingSphere();
    return g;
  });
  if (!per) splitCache.set(geo, (per = new Map()));
  per.set(labels, out);
  return out;
}

export const RECEIVER_PAINT: (Paint | null)[] = [null, 'sideA', 'sideB'];
