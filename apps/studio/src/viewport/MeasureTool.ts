/**
 * MeasureTool — Fusion-style geometry measurement.
 *
 * Hover over geometry to snap to vertex / edge-midpoint / edge / face-center / face.
 * Click to lock entity A, click again for entity B → reports min / center / max distance.
 * Works in Object Mode on any body mesh.
 */
import * as THREE from 'three';
import { computeGeoSnap, GeoSnap, SnapIndicator } from '@/viewport/Snapper';
import { useModelStore } from '@/state/modelStore';

// ── Distance helpers ──────────────────────────────────────────────────────────

function pointToSegDist(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
  const ab = b.clone().sub(a);
  const t  = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / (ab.lengthSq() || 1), 0, 1);
  return p.distanceTo(a.clone().add(ab.multiplyScalar(t)));
}

function segSegDist(a0: THREE.Vector3, a1: THREE.Vector3, b0: THREE.Vector3, b1: THREE.Vector3): number {
  const d1 = a1.clone().sub(a0), d2 = b1.clone().sub(b0), r = a0.clone().sub(b0);
  const a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r);
  let s: number, t: number;
  if (a <= 1e-10 && e <= 1e-10) return r.length();
  if (a <= 1e-10) { s = 0; t = THREE.MathUtils.clamp(f / e, 0, 1); }
  else {
    const c = d1.dot(r);
    if (e <= 1e-10) { t = 0; s = THREE.MathUtils.clamp(-c / a, 0, 1); }
    else {
      const b2 = d1.dot(d2), denom = a * e - b2 * b2;
      s = denom !== 0 ? THREE.MathUtils.clamp((b2 * f - c * e) / denom, 0, 1) : 0;
      t = (b2 * s + f) / e;
      if (t < 0) { t = 0; s = THREE.MathUtils.clamp(-c / a, 0, 1); }
      else if (t > 1) { t = 1; s = THREE.MathUtils.clamp((b2 - c) / a, 0, 1); }
    }
  }
  return a0.clone().add(d1.multiplyScalar(s)).distanceTo(b0.clone().add(d2.multiplyScalar(t)));
}

// Closest point on triangle to p (Ericson barycentric method).
function closestPtOnTri(p: THREE.Vector3, v0: THREE.Vector3, v1: THREE.Vector3, v2: THREE.Vector3): THREE.Vector3 {
  const ab = v1.clone().sub(v0), ac = v2.clone().sub(v0), ap = p.clone().sub(v0);
  const d1 = ab.dot(ap), d2 = ac.dot(ap);
  if (d1 <= 0 && d2 <= 0) return v0.clone();
  const bp = p.clone().sub(v1);
  const d3 = ab.dot(bp), d4 = ac.dot(bp);
  if (d3 >= 0 && d4 <= d3) return v1.clone();
  const cp = p.clone().sub(v2);
  const d5 = ab.dot(cp), d6 = ac.dot(cp);
  if (d6 >= 0 && d5 <= d6) return v2.clone();
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return v0.clone().add(ab.clone().multiplyScalar(d1 / (d1 - d3)));
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return v0.clone().add(ac.clone().multiplyScalar(d2 / (d2 - d6)));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    return v1.clone().add(v2.clone().sub(v1).multiplyScalar(w));
  }
  const denom = 1 / (va + vb + vc);
  return v0.clone().add(ab.clone().multiplyScalar(vb * denom)).add(ac.clone().multiplyScalar(vc * denom));
}
function ptToTriDist(p: THREE.Vector3, v0: THREE.Vector3, v1: THREE.Vector3, v2: THREE.Vector3): number {
  return p.distanceTo(closestPtOnTri(p, v0, v1, v2));
}
function segToTriDist(p0: THREE.Vector3, p1: THREE.Vector3, v0: THREE.Vector3, v1: THREE.Vector3, v2: THREE.Vector3): number {
  return Math.min(
    ptToTriDist(p0, v0, v1, v2), ptToTriDist(p1, v0, v1, v2),
    pointToSegDist(v0, p0, p1), pointToSegDist(v1, p0, p1), pointToSegDist(v2, p0, p1),
    segSegDist(p0, p1, v0, v1), segSegDist(p0, p1, v1, v2), segSegDist(p0, p1, v2, v0),
  );
}

// All corner/vertex key points of an entity (used only for MAX distance).
function entityCorners(snap: GeoSnap): THREE.Vector3[] {
  if (snap.edgeVerts) return [snap.edgeVerts[0], snap.edgeVerts[1]];
  if (snap.faceVerts) return [...snap.faceVerts];
  return [snap.point];
}

export function measureBetween(a: GeoSnap, b: GeoSnap) {
  const isEdge  = (s: GeoSnap) => s.type === 'edge' || s.type === 'edge-mid';
  const isFace  = (s: GeoSnap) => s.type === 'face' || s.type === 'face-center';
  const isVtx   = (s: GeoSnap) => s.type === 'vertex';

  // ── TRUE GEOMETRIC MINIMUM ──────────────────────────────────────────────────
  let minDist: number;

  if (isVtx(a) && isVtx(b)) {
    minDist = a.point.distanceTo(b.point);

  } else if (isVtx(a) && isEdge(b) && b.edgeVerts) {
    minDist = pointToSegDist(a.point, b.edgeVerts[0], b.edgeVerts[1]);

  } else if (isEdge(a) && isVtx(b) && a.edgeVerts) {
    minDist = pointToSegDist(b.point, a.edgeVerts[0], a.edgeVerts[1]);

  } else if (isVtx(a) && isFace(b) && b.faceVerts) {
    minDist = ptToTriDist(a.point, b.faceVerts[0], b.faceVerts[1], b.faceVerts[2]);

  } else if (isFace(a) && isVtx(b) && a.faceVerts) {
    minDist = ptToTriDist(b.point, a.faceVerts[0], a.faceVerts[1], a.faceVerts[2]);

  } else if (isEdge(a) && isEdge(b) && a.edgeVerts && b.edgeVerts) {
    minDist = segSegDist(a.edgeVerts[0], a.edgeVerts[1], b.edgeVerts[0], b.edgeVerts[1]);

  } else if (isEdge(a) && isFace(b) && a.edgeVerts && b.faceVerts) {
    minDist = segToTriDist(a.edgeVerts[0], a.edgeVerts[1], b.faceVerts[0], b.faceVerts[1], b.faceVerts[2]);

  } else if (isFace(a) && isEdge(b) && b.edgeVerts && a.faceVerts) {
    minDist = segToTriDist(b.edgeVerts[0], b.edgeVerts[1], a.faceVerts[0], a.faceVerts[1], a.faceVerts[2]);

  } else if (isFace(a) && isFace(b) && a.faceVerts && b.faceVerts) {
    // Triangle ↔ triangle: check all 9 segment pairs + 6 point-to-triangle
    const [a0, a1, a2] = a.faceVerts, [b0, b1, b2] = b.faceVerts;
    minDist = Math.min(
      ptToTriDist(a0, b0, b1, b2), ptToTriDist(a1, b0, b1, b2), ptToTriDist(a2, b0, b1, b2),
      ptToTriDist(b0, a0, a1, a2), ptToTriDist(b1, a0, a1, a2), ptToTriDist(b2, a0, a1, a2),
      segSegDist(a0, a1, b0, b1), segSegDist(a0, a1, b1, b2), segSegDist(a0, a1, b2, b0),
      segSegDist(a1, a2, b0, b1), segSegDist(a1, a2, b1, b2), segSegDist(a1, a2, b2, b0),
      segSegDist(a2, a0, b0, b1), segSegDist(a2, a0, b1, b2), segSegDist(a2, a0, b2, b0),
    );
  } else {
    minDist = a.point.distanceTo(b.point);
  }

  // ── MAX DISTANCE: farthest pair among all corners ───────────────────────────
  const cornersA = entityCorners(a), cornersB = entityCorners(b);
  let maxDist = 0;
  for (const ca of cornersA) for (const cb of cornersB) maxDist = Math.max(maxDist, ca.distanceTo(cb));

  const centerDist = a.point.distanceTo(b.point);
  return { minDist, centerDist, maxDist };
}

// ── Entity highlight (persistent selected-entity visual) ──────────────────────

class EntityMarker {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private color: number;

  constructor(scene: THREE.Scene, color: number) {
    this.scene = scene;
    this.color = color;
    this.group = new THREE.Group();
    this.group.name = 'entity-marker';
    this.group.renderOrder = 1600;
    scene.add(this.group);
  }

  show(snap: GeoSnap, camera: THREE.PerspectiveCamera) {
    this.clear();
    const c = this.color;
    const meshMat = (opacity = 1) => new THREE.MeshBasicMaterial({
      color: c, depthTest: false, side: THREE.DoubleSide,
      transparent: opacity < 1, opacity,
    });
    const lineMat = (opacity = 1) => new THREE.LineBasicMaterial({
      color: c, depthTest: false,
      transparent: opacity < 1, opacity,
    });

    // Billboard marker at the snap point — ring+cross so it never overlaps into an "8".
    // Scale via onBeforeRender so it stays constant-size in screen pixels.
    const OUTER = 0.8, INNER = 0.55, TARGET_PX = 9;
    const ring = new THREE.Mesh(new THREE.RingGeometry(INNER, OUTER, 32), meshMat());
    ring.renderOrder = 1602;
    // Cross arms
    const crossShape = new THREE.Shape();
    const r = 0.5, t = 0.11;
    crossShape.moveTo(-r, -t); crossShape.lineTo(-t, -t); crossShape.lineTo(-t, -r);
    crossShape.lineTo(t, -r);  crossShape.lineTo(t, -t);  crossShape.lineTo(r, -t);
    crossShape.lineTo(r, t);   crossShape.lineTo(t, t);   crossShape.lineTo(t, r);
    crossShape.lineTo(-t, r);  crossShape.lineTo(-t, t);  crossShape.lineTo(-r, t);
    crossShape.closePath();
    const cross = new THREE.Mesh(new THREE.ShapeGeometry(crossShape), meshMat());
    cross.renderOrder = 1602;

    const markerGroup = new THREE.Group();
    markerGroup.position.copy(snap.point);
    markerGroup.renderOrder = 1602;
    markerGroup.add(ring, cross);

    const cam = camera;
    ring.onBeforeRender = (renderer) => {
      markerGroup.quaternion.copy(cam.quaternion);
      const h = renderer.domElement.height || 1;
      const dist = markerGroup.position.distanceTo(cam.position);
      const fovRad = THREE.MathUtils.degToRad(cam.fov);
      const worldR = (TARGET_PX / h) * 2 * dist * Math.tan(fovRad / 2);
      markerGroup.scale.setScalar(worldR / OUTER);
    };
    this.group.add(markerGroup);

    // Edge line highlight — the two endpoints of the snapped edge
    if ((snap.type === 'edge' || snap.type === 'edge-mid') && snap.edgeVerts) {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(snap.edgeVerts),
        lineMat(),
      );
      line.renderOrder = 1600;
      this.group.add(line);
    }

    // Face triangle highlight — filled + outline, no extra dot on top
    if ((snap.type === 'face' || snap.type === 'face-center') && snap.faceVerts) {
      const [v0, v1, v2] = snap.faceVerts;
      const fillGeo = new THREE.BufferGeometry();
      fillGeo.setAttribute('position', new THREE.Float32BufferAttribute(
        [v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z], 3,
      ));
      const fill = new THREE.Mesh(fillGeo, meshMat(0.18));
      fill.renderOrder = 1600;
      const outline = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([v0, v1, v2, v0]),
        lineMat(0.7),
      );
      outline.renderOrder = 1601;
      this.group.add(fill, outline);
    }
  }

  clear() {
    for (const c of [...this.group.children]) {
      this.group.remove(c);
      (c as any).geometry?.dispose();
      (c as any).material?.dispose();
    }
  }

  dispose() {
    this.clear();
    this.scene.remove(this.group);
  }
}

// ── Hover geometry highlight (drawn every frame on pointermove) ───────────────
// Shows the actual edge segment or face triangle under the cursor so the user
// sees WHICH feature they're about to snap to, not just a tiny indicator dot.

class HoverHighlight {
  private scene: THREE.Scene;
  private group: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'hover-highlight';
    scene.add(this.group);
  }

  show(snap: GeoSnap) {
    this.clear();

    // Edge / edge-midpoint → highlight the full edge segment
    if ((snap.type === 'edge' || snap.type === 'edge-mid') && snap.edgeVerts) {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(snap.edgeVerts),
        new THREE.LineBasicMaterial({ color: 0xff8c00, depthTest: false, linewidth: 2 }),
      );
      line.renderOrder = 1550;
      this.group.add(line);
    }

    // Face / face-center → highlight the face triangle with a subtle fill + outline
    if ((snap.type === 'face' || snap.type === 'face-center') && snap.faceVerts) {
      const [v0, v1, v2] = snap.faceVerts;
      const fillGeo = new THREE.BufferGeometry();
      fillGeo.setAttribute('position', new THREE.Float32BufferAttribute(
        [v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z], 3,
      ));
      const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({
        color: 0x5588ff, depthTest: false, side: THREE.DoubleSide,
        transparent: true, opacity: 0.22,
      }));
      fill.renderOrder = 1549;
      const outline = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([v0, v1, v2, v0]),
        new THREE.LineBasicMaterial({ color: 0x88aaff, depthTest: false }),
      );
      outline.renderOrder = 1550;
      this.group.add(fill, outline);
    }

    // Vertex → the snap indicator ring+cross is enough, nothing extra needed
  }

  hide() { this.clear(); }

  clear() {
    for (const c of [...this.group.children]) {
      this.group.remove(c);
      (c as any).geometry?.dispose();
      (c as any).material?.dispose();
    }
  }

  dispose() {
    this.clear();
    this.scene.remove(this.group);
  }
}

// ── Measurement line ──────────────────────────────────────────────────────────

class MeasureLine {
  private scene: THREE.Scene;
  private group: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
  }

  update(a: THREE.Vector3, b: THREE.Vector3) {
    this.clear();
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([a, b]),
      new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.06, gapSize: 0.04, depthTest: false }),
    );
    line.renderOrder = 1700;
    line.computeLineDistances();
    this.group.add(line);
  }

  clear() {
    for (const c of [...this.group.children]) {
      this.group.remove(c);
      (c as any).geometry?.dispose();
      (c as any).material?.dispose();
    }
  }

  dispose() {
    this.clear();
    this.scene.remove(this.group);
  }
}

// ── MeasureTool ───────────────────────────────────────────────────────────────

const _ndc = new THREE.Vector2();

function resolveBodyId(obj: THREE.Object3D): string | null {
  let o: THREE.Object3D | null = obj;
  while (o) { if ((o as any).userData?.bodyId) return (o as any).userData.bodyId; o = o.parent; }
  return null;
}

export class MeasureTool {
  [key: string]: any;

  constructor({ scene, camera, domElement, getMeshes, onResult, onCancel }: any) {
    this.scene = scene;
    this.camera = camera;
    this.dom = domElement;
    this.getMeshes = getMeshes;
    this.onResult = onResult;
    this.onCancel = onCancel;

    this._indicator = new SnapIndicator(scene);
    this._hoverHL   = new HoverHighlight(scene);
    this._markerA = new EntityMarker(scene, 0xf5c518); // gold for A
    this._markerB = new EntityMarker(scene, 0x18d4f5); // cyan for B
    this._measureLine = new MeasureLine(scene);

    this._entityA = null as GeoSnap | null;
    this._entityB = null as GeoSnap | null;
    this._enabled = false;

    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onKey  = this._onKey.bind(this);
  }

  enable() {
    if (this._enabled) return;
    this._enabled = true;
    this._entityA = null;
    this._entityB = null;
    this._markerA.clear();
    this._markerB.clear();
    this._measureLine.clear();
    this.dom.addEventListener('pointerdown', this._onDown);
    this.dom.addEventListener('pointermove', this._onMove);
    window.addEventListener('keydown', this._onKey);
  }

  disable() {
    this._enabled = false;
    this.dom.removeEventListener('pointerdown', this._onDown);
    this.dom.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('keydown', this._onKey);
    this._indicator.hide();
    this._hoverHL.hide();
    this._markerA.clear();
    this._markerB.clear();
    this._measureLine.clear();
    this._entityA = null;
    this._entityB = null;
  }

  _ndcFrom(e: any) {
    const rect = this.dom.getBoundingClientRect();
    _ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    return _ndc;
  }

  _onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (this._entityB) {
        // Reset back to A-only
        this._entityB = null;
        this._markerB.clear();
        this._measureLine.clear();
        this.onResult?.({ entityA: this._entityA, entityB: null, live: false });
      } else {
        this.onCancel?.();
      }
    }
  }

  _onMove(e: any) {
    const snap = computeGeoSnap(this._ndcFrom(e), this.camera, this.dom, this.getMeshes());
    if (!snap) { this._indicator.hide(); this._hoverHL.hide(); return; }
    this._indicator.show(snap.point, snap.type);
    this._hoverHL.show(snap);

    // Live preview line while waiting for second click
    if (this._entityA && !this._entityB) {
      this._measureLine.update(this._entityA.point, snap.point);
      const { minDist, centerDist, maxDist } = measureBetween(this._entityA, snap);
      this.onResult?.({
        entityA: this._enrichSnap(this._entityA),
        entityB: this._enrichSnap(snap),
        minDist, centerDist, maxDist, live: true,
      });
    }
  }

  _onDown(e: any) {
    if (e.button !== 0) return;
    this._hoverHL.hide(); // clear hover highlight on any click
    const snap = computeGeoSnap(this._ndcFrom(e), this.camera, this.dom, this.getMeshes());
    if (!snap) {
      // Click on empty space → exit measure mode entirely
      this.onCancel?.();
      return;
    }

    if (!this._entityA || this._entityB) {
      // Start fresh with this as A
      this._entityA = snap;
      this._entityB = null;
      this._markerA.show(snap, this.camera);
      this._markerB.clear();
      this._measureLine.clear();
      this.onResult?.({ entityA: this._enrichSnap(snap), entityB: null, live: false });
    } else {
      // Complete the pair
      this._entityB = snap;
      this._markerB.show(snap, this.camera);
      this._measureLine.update(this._entityA.point, snap.point);
      const { minDist, centerDist, maxDist } = measureBetween(this._entityA, snap);
      this.onResult?.({
        entityA: this._enrichSnap(this._entityA),
        entityB: this._enrichSnap(snap),
        minDist, centerDist, maxDist, live: false,
      });
    }
  }

  _enrichSnap(snap: GeoSnap): GeoSnap & { bodyName?: string } {
    const bodyId = snap.bodyId ?? resolveBodyId(snap.object);
    const bodyName = bodyId ? (useModelStore.getState().doc.bodies[bodyId]?.name ?? bodyId) : undefined;
    return { ...snap, bodyId: bodyId ?? undefined, bodyName } as any;
  }

  dispose() {
    this.disable();
    this._indicator.dispose();
    this._hoverHL.dispose();
    this._markerA.dispose();
    this._markerB.dispose();
    this._measureLine.dispose();
  }
}
