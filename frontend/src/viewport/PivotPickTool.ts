/**
 * PivotPickTool — "click to place" for joint pivots.
 *
 * Activated via bridge.startPivotPick(). Renders the same geometry-snap
 * indicators as MeasureTool, PLUS:
 *   • Cylinder / hole detection: when hovering a cylindrical surface it computes
 *     the circle center + axis and shows a full ring + axis arrow (cyan).
 *     Clicking snaps the pivot to the circle center and suggests the axis.
 *   • Face normal suggestion: on any face hit the face normal is returned as the
 *     suggested axis so the caller can auto-orient the joint axis.
 *
 * Click on empty space → cancel.  Escape → cancel.
 */
import * as THREE from 'three';
import { computeGeoSnap, GeoSnap, SnapIndicator } from '@/viewport/Snapper';

export interface PivotPickResult {
  worldPosition: THREE.Vector3;
  suggestedAxis?: THREE.Vector3; // from cylinder detection or face normal
  snapType: string;
}

// ── Cylinder detection ────────────────────────────────────────────────────────

function detectCylinder(
  snap: GeoSnap,
): { center: THREE.Vector3; axis: THREE.Vector3; radius: number } | null {
  const mesh = snap.object as THREE.Mesh;
  if (!mesh?.isMesh || !mesh.geometry?.attributes?.position) return null;

  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const idx = geo.index;
  const mw = mesh.matrixWorld;
  const normalMat = new THREE.Matrix3().getNormalMatrix(mw);
  const faceCount = idx ? Math.floor(idx.count / 3) : Math.floor(pos.count / 3);
  if (faceCount < 6) return null;

  const step = Math.max(1, Math.floor(faceCount / 300)); // cap at ~300 faces
  const normals: THREE.Vector3[] = [];
  const centroids: THREE.Vector3[] = [];

  for (let fi = 0; fi < faceCount; fi += step) {
    const a = idx ? idx.getX(fi * 3) : fi * 3;
    const b = idx ? idx.getX(fi * 3 + 1) : fi * 3 + 1;
    const c = idx ? idx.getX(fi * 3 + 2) : fi * 3 + 2;
    if (a >= pos.count || b >= pos.count || c >= pos.count) continue;
    const va = new THREE.Vector3().fromBufferAttribute(pos, a).applyMatrix4(mw);
    const vb = new THREE.Vector3().fromBufferAttribute(pos, b).applyMatrix4(mw);
    const vc = new THREE.Vector3().fromBufferAttribute(pos, c).applyMatrix4(mw);
    const n = new THREE.Vector3();
    new THREE.Triangle(va, vb, vc).getNormal(n);
    if (n.lengthSq() < 0.01) continue;
    n.applyNormalMatrix(normalMat).normalize();
    normals.push(n);
    centroids.push(va.clone().add(vb).add(vc).multiplyScalar(1 / 3));
  }
  if (normals.length < 6) return null;

  const hitNormal = snap.normal ?? new THREE.Vector3(0, 1, 0);

  // Axis candidates: cross products of hit-face normal with other normals.
  // For a cylinder, cross(radialN1, radialN2) ∝ cylinder axis.
  const candidates: THREE.Vector3[] = [
    new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1),
  ];
  for (let i = 0; i < Math.min(normals.length, 20); i++) {
    const c = new THREE.Vector3().crossVectors(hitNormal, normals[i]);
    if (c.lengthSq() > 0.05) candidates.push(c.normalize());
  }

  let bestAxis: THREE.Vector3 | null = null;
  let bestScore = 0;
  for (const cand of candidates) {
    let score = 0;
    for (const n of normals) if (Math.abs(n.dot(cand)) < 0.25) score++;
    if (score > bestScore) { bestScore = score; bestAxis = cand.clone(); }
  }

  // Need ≥30% of faces to be "radial" and the hit face to be on the cylinder wall
  if (!bestAxis || bestScore < normals.length * 0.25 || bestScore < 5) return null;
  if (Math.abs(hitNormal.dot(bestAxis)) > 0.35) return null;

  // Collect cylindrical wall faces
  const cylN: THREE.Vector3[] = [], cylC: THREE.Vector3[] = [];
  for (let i = 0; i < normals.length; i++) {
    if (Math.abs(normals[i].dot(bestAxis)) < 0.25) { cylN.push(normals[i]); cylC.push(centroids[i]); }
  }
  if (cylN.length < 4) return null;

  // Least-squares cylinder center: solve [Σ(I - n_i n_iᵀ)] C = Σ(I - n_i n_iᵀ) p_i
  // A (3×3) column-major in THREE.Matrix3
  const Ae = new Float64Array(9); // column-major 3×3
  const bv = new THREE.Vector3();
  for (let i = 0; i < cylN.length; i++) {
    const { x: nx, y: ny, z: nz } = cylN[i];
    const { x: px, y: py, z: pz } = cylC[i];
    // M = I - n nᵀ; add to A and M*p to b
    const M = [1-nx*nx, -nx*ny, -nx*nz, -ny*nx, 1-ny*ny, -ny*nz, -nz*nx, -nz*ny, 1-nz*nz];
    // column-major: col0=[M[0],M[1],M[2]], col1=[M[3],M[4],M[5]], col2=[M[6],M[7],M[8]]
    for (let j = 0; j < 9; j++) Ae[j] += M[j];
    bv.x += M[0]*px + M[1]*py + M[2]*pz;
    bv.y += M[3]*px + M[4]*py + M[5]*pz;
    bv.z += M[6]*px + M[7]*py + M[8]*pz;
  }
  // Regularize along axis to make A invertible
  const L = 0.05;
  Ae[0] += L * bestAxis.x * bestAxis.x; Ae[4] += L * bestAxis.y * bestAxis.y; Ae[8] += L * bestAxis.z * bestAxis.z;

  // Cramer / direct 3×3 inversion (cofactor method) — avoids THREE.Matrix3 Float32 precision issues
  const [a00,a10,a20, a01,a11,a21, a02,a12,a22] = Ae; // column-major → row[r]col[c] = Ae[c*3+r]
  const det = a00*(a11*a22-a12*a21) - a01*(a10*a22-a12*a20) + a02*(a10*a21-a11*a20);
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  const c0 = (a11*a22-a12*a21)*inv, c1 = -(a10*a22-a12*a20)*inv, c2 = (a10*a21-a11*a20)*inv;
  const c3 = -(a01*a22-a02*a21)*inv, c4 = (a00*a22-a02*a20)*inv, c5 = -(a00*a21-a01*a20)*inv;
  const c6 = (a01*a12-a02*a11)*inv, c7 = -(a00*a12-a02*a10)*inv, c8 = (a00*a11-a01*a10)*inv;
  const center = new THREE.Vector3(
    c0*bv.x + c3*bv.y + c6*bv.z,
    c1*bv.x + c4*bv.y + c7*bv.z,
    c2*bv.x + c5*bv.y + c8*bv.z,
  );

  // Sanity: center should be near the hit point
  if (center.distanceTo(snap.point) > 0.8) return null;

  // Compute radius
  let totalR = 0;
  for (const c of cylC) {
    const d = c.clone().sub(center);
    totalR += d.clone().addScaledVector(bestAxis, -bestAxis.dot(d)).length();
  }
  const radius = totalR / cylC.length;
  if (radius < 0.0003 || radius > 0.6) return null;

  return { center, axis: bestAxis, radius };
}

// ── Visual ring for cylinder snap ─────────────────────────────────────────────

class CylinderRing {
  private scene: THREE.Scene;
  private group: THREE.Group | null = null;

  constructor(scene: THREE.Scene) { this.scene = scene; }

  show(center: THREE.Vector3, axis: THREE.Vector3, radius: number) {
    this.hide();
    const g = new THREE.Group();
    g.position.copy(center);
    // Orient so Z+ → axis
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis.clone().normalize());
    g.quaternion.copy(q);

    const mat = new THREE.LineBasicMaterial({ color: 0x00ddff, depthTest: false });

    // Full circle ring
    const pts: THREE.Vector3[] = [];
    const SEG = 64;
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
    }
    const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
    ring.renderOrder = 1900;
    g.add(ring);

    // Axis arrow
    const axPts = [new THREE.Vector3(0, 0, -radius * 2.5), new THREE.Vector3(0, 0, radius * 2.5)];
    const axLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(axPts), mat);
    axLine.renderOrder = 1900;
    g.add(axLine);

    // Center dot
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.06, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x00ddff, depthTest: false }),
    );
    dot.renderOrder = 1900;
    g.add(dot);

    this.scene.add(g);
    this.group = g;
  }

  hide() {
    if (this.group) {
      this.scene.remove(this.group);
      this.group.children.forEach((c: any) => { c.geometry?.dispose(); c.material?.dispose(); });
      this.group = null;
    }
  }

  dispose() { this.hide(); }
}

// ── PivotPickTool ─────────────────────────────────────────────────────────────

const _ndc2 = new THREE.Vector2();

export class PivotPickTool {
  [key: string]: any;

  constructor({ scene, camera, domElement, getMeshes }: any) {
    this.scene = scene;
    this.camera = camera;
    this.dom = domElement;
    this.getMeshes = getMeshes;
    this._indicator = new SnapIndicator(scene);
    this._cylRing = new CylinderRing(scene);
    this._enabled = false;
    this._onPick = null as ((r: PivotPickResult) => void) | null;
    this._onCancel = null as (() => void) | null;
    this._lastCyl = null as ReturnType<typeof detectCylinder>;

    this._handleMove = this._handleMove.bind(this);
    this._handleDown = this._handleDown.bind(this);
    this._handleKey  = this._handleKey.bind(this);
  }

  start(onPick: (r: PivotPickResult) => void, onCancel: () => void) {
    if (this._enabled) this._detach();
    this._onPick = onPick;
    this._onCancel = onCancel;
    this._enabled = true;
    this.dom.classList.add('pivot-pick-active');
    this.dom.addEventListener('pointermove', this._handleMove);
    this.dom.addEventListener('pointerdown', this._handleDown);
    window.addEventListener('keydown', this._handleKey);
  }

  stop() {
    this._detach();
    this._indicator.hide();
    this._cylRing.hide();
    this._lastCyl = null;
  }

  _detach() {
    this._enabled = false;
    this._onPick = null;
    this._onCancel = null;
    this.dom.classList.remove('pivot-pick-active');
    this.dom.removeEventListener('pointermove', this._handleMove);
    this.dom.removeEventListener('pointerdown', this._handleDown);
    window.removeEventListener('keydown', this._handleKey);
  }

  _ndc(e: PointerEvent) {
    const rect = this.dom.getBoundingClientRect();
    _ndc2.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    return _ndc2;
  }

  _handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') { this._onCancel?.(); this.stop(); }
  }

  _handleMove(e: PointerEvent) {
    const snap = computeGeoSnap(this._ndc(e), this.camera, this.dom, this.getMeshes());
    if (!snap) { this._indicator.hide(); this._cylRing.hide(); this._lastCyl = null; return; }

    const isFaceLike = snap.type === 'face' || snap.type === 'face-center';
    const cyl = isFaceLike ? detectCylinder(snap) : null;
    this._lastCyl = cyl;

    if (cyl) {
      this._cylRing.show(cyl.center, cyl.axis, cyl.radius);
      this._indicator.show(cyl.center, 'vertex'); // cyan crosshair at circle center
    } else {
      this._cylRing.hide();
      this._indicator.show(snap.point, snap.type);
    }
  }

  _handleDown(e: PointerEvent) {
    if (e.button !== 0) return;
    const snap = computeGeoSnap(this._ndc(e), this.camera, this.dom, this.getMeshes());
    if (!snap) { this._onCancel?.(); this.stop(); return; }

    const isFaceLike = snap.type === 'face' || snap.type === 'face-center';
    const cyl = isFaceLike ? detectCylinder(snap) : null;

    const result: PivotPickResult = {
      worldPosition: cyl ? cyl.center.clone() : snap.point.clone(),
      suggestedAxis: cyl ? cyl.axis.clone() : (snap.normal ? snap.normal.clone() : undefined),
      snapType: cyl ? 'cylinder-center' : snap.type,
    };
    const cb = this._onPick;
    this.stop();
    cb?.(result);
  }

  dispose() {
    this.stop();
    this._indicator.dispose();
    this._cylRing.dispose();
  }
}
