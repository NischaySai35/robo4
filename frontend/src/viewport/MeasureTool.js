/**
 * MeasureTool — click two points in the viewport to measure the distance between
 * them (Fusion-style). Raycasts the provided meshes (model bodies + arm), drops a
 * marker per click, draws a line, and reports the distance via onResult.
 *
 * While active, the caller pauses the arm's Interaction so clicks don't also drag
 * the robot; orbit stays enabled (a click ≠ a drag).
 */
import * as THREE from 'three';

const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();

export class MeasureTool {
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

    this._onDown = this._onDown.bind(this);
    this._enabled = false;
  }

  enable() {
    if (this._enabled) return;
    this._enabled = true;
    this.dom.addEventListener('pointerdown', this._onDown);
  }

  disable() {
    this._enabled = false;
    this.dom.removeEventListener('pointerdown', this._onDown);
    this._clear();
  }

  _onDown(e) {
    if (e.button !== 0) return;
    const rect = this.dom.getBoundingClientRect();
    _ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    _ray.setFromCamera(_ndc, this.camera);
    const hits = _ray.intersectObjects(this.getMeshes(), true);
    if (!hits.length) return;

    if (this.points.length >= 2) this._clear();
    const p = hits[0].point.clone();
    this.points.push(p);
    this._addMarker(p);

    if (this.points.length === 2) {
      this._addLine(this.points[0], this.points[1]);
      const distance = this.points[0].distanceTo(this.points[1]);
      this.onResult?.({ distance, a: this.points[0].toArray(), b: this.points[1].toArray() });
    }
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
    for (const c of [...this.group.children]) {
      this.group.remove(c);
      c.geometry?.dispose();
      c.material?.dispose();
    }
  }

  dispose() {
    this.disable();
    this.scene.remove(this.group);
  }
}
