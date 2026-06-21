/**
 * MeasureTool — click two points in the viewport to measure the distance between
 * them (Fusion-style). Raycasts the provided meshes (model bodies + arm), drops a
 * marker per click, draws a line, and reports the distance via onResult.
 *
 * While active, the caller pauses the arm's Interaction so clicks don't also drag
 * the robot; orbit stays enabled (a click ≠ a drag).
 */
import * as THREE from 'three';
import { computeSnap, SnapIndicator } from '@/viewport/Snapper';

const _ndc = new THREE.Vector2();

export class MeasureTool {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any;
  constructor({ scene, camera, domElement, getMeshes, onResult }) {
    this.scene = scene;
    this.camera = camera;
    this.dom = domElement;
    this.getMeshes = getMeshes;
    this.onResult = onResult;

    this.points = [];
    this.group = new THREE.Group();
    this.group.name = 'measure';
    scene.add(this.group);

    this._indicator = new SnapIndicator(scene); // feature snapping is built-in here
    this._preview = null; // live line from first point to the hovered point

    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._enabled = false;
  }

  enable() {
    if (this._enabled) return;
    this._enabled = true;
    this.dom.addEventListener('pointerdown', this._onDown);
    this.dom.addEventListener('pointermove', this._onMove);
  }

  disable() {
    this._enabled = false;
    this.dom.removeEventListener('pointerdown', this._onDown);
    this.dom.removeEventListener('pointermove', this._onMove);
    this._indicator.hide();
    this._clear();
  }

  _ndcFrom(e) {
    const rect = this.dom.getBoundingClientRect();
    _ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    return _ndc;
  }

  // Hover: show the snap indicator and a live preview line / distance once the
  // first point is placed.
  _onMove(e) {
    const snap = computeSnap(this._ndcFrom(e), this.camera, this.dom, this.getMeshes());
    if (!snap) { this._indicator.hide(); return; }
    this._indicator.show(snap.point, snap.type);
    if (this.points.length === 1) {
      this._updatePreview(this.points[0], snap.point);
      this.onResult?.({ distance: this.points[0].distanceTo(snap.point), a: this.points[0].toArray(), b: snap.point.toArray(), live: true });
    }
  }

  _onDown(e) {
    if (e.button !== 0) return;
    const snap = computeSnap(this._ndcFrom(e), this.camera, this.dom, this.getMeshes());
    if (!snap) return;

    if (this.points.length >= 2) { this._clear(); }
    const p = snap.point.clone();
    this.points.push(p);
    this._addMarker(p);

    if (this.points.length === 2) {
      this._removePreview();
      this._addLine(this.points[0], this.points[1]);
      const distance = this.points[0].distanceTo(this.points[1]);
      this.onResult?.({ distance, a: this.points[0].toArray(), b: this.points[1].toArray() });
    }
  }

  _updatePreview(a, b) {
    if (!this._preview) {
      this._preview = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([a, b]),
        new THREE.LineDashedMaterial({ color: 0xff3366, dashSize: 0.08, gapSize: 0.05, depthTest: false }),
      );
      this._preview.renderOrder = 1000;
      this.group.add(this._preview);
    } else {
      this._preview.geometry.setFromPoints([a, b]);
    }
    this._preview.computeLineDistances();
  }
  _removePreview() {
    if (this._preview) { this.group.remove(this._preview); this._preview.geometry.dispose(); this._preview.material.dispose(); this._preview = null; }
  }

  _addMarker(p) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xff3366, depthTest: false }),
    );
    m.renderOrder = 1000;
    m.position.copy(p);
    this.group.add(m);
  }

  _addLine(a, b) {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff3366, depthTest: false }));
    line.renderOrder = 1000;
    this.group.add(line);
  }

  _clear() {
    this.points = [];
    this._preview = null;
    for (const c of [...this.group.children]) {
      this.group.remove(c);
      c.geometry?.dispose();
      c.material?.dispose();
    }
  }

  dispose() {
    this.disable();
    this._indicator.dispose();
    this.scene.remove(this.group);
  }
}