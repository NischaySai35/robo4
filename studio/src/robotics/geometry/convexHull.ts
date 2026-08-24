/**
 * convexHull — 3D incremental convex hull, for generating real collision shapes from
 * a mesh's vertices (replacing crude bounding-box approximations). Returns the hull
 * vertices + triangular faces with outward normals; `inside()` tests containment so a
 * planner/collision check can use a tight convex proxy. Pure, node-testable.
 */
export type Vec3 = [number, number, number];
export interface Hull {
  vertices: Vec3[];
  faces: { a: number; b: number; c: number; normal: Vec3; offset: number }[];
  /** true if point p is inside (or on) the hull */
  inside: (p: Vec3, eps?: number) => boolean;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);

interface Face { a: number; b: number; c: number; n: Vec3; off: number }

function makeFace(pts: Vec3[], a: number, b: number, c: number, interior: Vec3): Face {
  let n = cross(sub(pts[b], pts[a]), sub(pts[c], pts[a]));
  const len = norm(n) || 1;
  n = [n[0] / len, n[1] / len, n[2] / len];
  let off = dot(n, pts[a]);
  // orient outward: interior point should be on the negative side
  if (dot(n, interior) - off > 0) { n = [-n[0], -n[1], -n[2]]; off = -off; a = a; [b, c] = [c, b]; off = dot(n, pts[a]); }
  return { a, b, c, n, off };
}

export function convexHull(points: Vec3[]): Hull | null {
  const pts = points;
  if (pts.length < 4) return null;

  // initial tetrahedron from 4 non-coplanar points
  const i0 = 0;
  let i1 = -1;
  for (let i = 1; i < pts.length; i++) if (norm(sub(pts[i], pts[i0])) > 1e-9) { i1 = i; break; }
  if (i1 < 0) return null;
  let i2 = -1, bestArea = 1e-9;
  for (let i = 1; i < pts.length; i++) {
    if (i === i1) continue;
    const area = norm(cross(sub(pts[i1], pts[i0]), sub(pts[i], pts[i0])));
    if (area > bestArea) { bestArea = area; i2 = i; }
  }
  if (i2 < 0) return null;
  let i3 = -1, bestVol = 1e-9;
  const base = cross(sub(pts[i1], pts[i0]), sub(pts[i2], pts[i0]));
  for (let i = 1; i < pts.length; i++) {
    const vol = Math.abs(dot(base, sub(pts[i], pts[i0])));
    if (vol > bestVol) { bestVol = vol; i3 = i; }
  }
  if (i3 < 0) return null;

  const interior: Vec3 = [
    (pts[i0][0] + pts[i1][0] + pts[i2][0] + pts[i3][0]) / 4,
    (pts[i0][1] + pts[i1][1] + pts[i2][1] + pts[i3][1]) / 4,
    (pts[i0][2] + pts[i1][2] + pts[i2][2] + pts[i3][2]) / 4,
  ];
  let faces: Face[] = [
    makeFace(pts, i0, i1, i2, interior),
    makeFace(pts, i0, i1, i3, interior),
    makeFace(pts, i0, i2, i3, interior),
    makeFace(pts, i1, i2, i3, interior),
  ];

  const seen = new Set([i0, i1, i2, i3]);
  for (let pi = 0; pi < pts.length; pi++) {
    if (seen.has(pi)) continue;
    const p = pts[pi];
    // faces visible from p
    const visible = faces.filter((f) => dot(f.n, p) - f.off > 1e-9);
    if (visible.length === 0) continue;     // inside current hull
    seen.add(pi);

    // horizon edges = edges shared by exactly one visible face
    const edgeCount = new Map<string, [number, number]>();
    const key = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);
    const bump = (a: number, b: number) => {
      const k = key(a, b);
      if (edgeCount.has(k)) edgeCount.delete(k); else edgeCount.set(k, [a, b]);
    };
    for (const f of visible) { bump(f.a, f.b); bump(f.b, f.c); bump(f.c, f.a); }

    faces = faces.filter((f) => !visible.includes(f));
    for (const [a, b] of edgeCount.values()) faces.push(makeFace(pts, a, b, pi, interior));
  }

  const usedIdx = [...new Set(faces.flatMap((f) => [f.a, f.b, f.c]))];
  const vertices = usedIdx.map((i) => pts[i]);
  const remap = new Map(usedIdx.map((i, k) => [i, k]));
  const outFaces = faces.map((f) => ({
    a: remap.get(f.a)!, b: remap.get(f.b)!, c: remap.get(f.c)!, normal: f.n, offset: f.off,
  }));

  return {
    vertices,
    faces: outFaces,
    inside: (q: Vec3, eps = 1e-6) => faces.every((f) => dot(f.n, q) - f.off <= eps),
  };
}
