/**
 * EditModeController — Blender-style mesh editing inside the viewport.
 *
 * Active only while editModeStore.active. Works on ONE body. It keeps a working
 * copy of the body's geometry ({positions, indices} in the body's LOCAL/container
 * space), draws pickable overlays (vertices as points, wireframe edges, face
 * highlight) parented to the body container so they inherit its world transform,
 * and moves the current sub-selection with its own TransformControls. Edits are
 * committed to the model as `visual.geometry.editMesh` via the command bus → undo
 * and project-save both work.
 */
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useEditModeStore } from '@/state/editModeStore.js';
import { useEditorStore } from '@/state/editorStore.js';
import { useModelStore } from '@/state/modelStore.js';
import { commands } from '@/core/commands/index.js';
import { editBridge } from '@/viewport/editBridge.js';

const VTX_COLOR = 0x3388ff;
const SEL_COLOR = 0xff8800;

export class EditModeController {
  constructor({ scene, camera, controls, domElement, bodyRenderer }) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.domElement = domElement;
    this.bodyRenderer = bodyRenderer;

    this.work = null;        // { positions:number[], indices:number[] }
    this.container = null;   // body container (overlay parent)
    this.overlay = null;     // THREE.Group of overlay objects
    this._centroidLocal = new THREE.Vector3();

    this.gizmo = new TransformControls(camera, domElement);
    this.gizmo.setSize(0.7);
    this.gizmo.enabled = false;
    this.gizmo.visible = false;
    scene.add(this.gizmo);
    this.gizmo.addEventListener('dragging-changed', (e) => { this.controls.enabled = !e.value; });
    this.gizmo.addEventListener('objectChange', () => this._onGizmoDrag());
    this.gizmo.addEventListener('mouseUp', () => this._commit());

    this._down = null;
    this._onDown = (e) => { if (e.button === 0) this._down = { x: e.clientX, y: e.clientY }; };
    this._onUp = (e) => this._handlePick(e);
    domElement.addEventListener('pointerdown', this._onDown);
    domElement.addEventListener('pointerup', this._onUp);

    this._ray = new THREE.Raycaster();
    this._ray.params.Points = { threshold: 0.06 };

    // Wire the panel → controller actions.
    editBridge.deleteSelection = () => this._deleteSelection();
    editBridge.mergeVertices = () => this._mergeSelected();
    editBridge.selectAll = () => this._selectAll();
    editBridge.deselectAll = () => this._setSelection([]);
    editBridge.extrude = () => this._extrudeFaces();
    editBridge.subdivide = () => this._subdivide();
    editBridge.duplicateSelection = () => this._duplicateSelection();
    editBridge.startTwoPointMove = () => this._startTwoPointMove();
    editBridge.inset = () => this._inset();
    editBridge.shrinkFatten = () => this._shrinkFatten();
    editBridge.smooth = () => this._smooth();

    let prev = useEditModeStore.getState();
    this._unsub = useEditModeStore.subscribe((s) => {
      if (s.active && (!prev.active || s.bodyId !== prev.bodyId)) this._enter(s.bodyId);
      else if (!s.active && prev.active) this._leave();
      else if (s.active) {
        if (s.selectMode !== prev.selectMode) this._rebuildSelectionMeshes();
        if (s.wireframe !== prev.wireframe) this._applyWireframe(s.wireframe);
      }
      prev = s;
    });

    if (useEditModeStore.getState().active) this._enter(useEditModeStore.getState().bodyId);
  }

  // ── enter / leave ──────────────────────────────────────────────────────────
  _enter(bodyId) {
    this._leave();
    const container = this.bodyRenderer.getMesh(bodyId);
    if (!container) { useEditModeStore.getState().exit(); return; }
    this.container = container;
    this.bodyId = bodyId;
    this.work = this._bake(bodyId, container);
    if (!this.work) { useEditModeStore.getState().exit(); return; }
    this._buildOverlay();
    this._applyWireframe(useEditModeStore.getState().wireframe);
  }

  _leave() {
    this._twoPoint = null; this._tpMarker = null;
    this._detachGizmo();
    this._applyWireframe(false);
    if (this._proxy) { this._proxy.parent?.remove(this._proxy); this._proxy = null; }
    if (this.overlay) { this.scene.remove(this.overlay); this._disposeGroup(this.overlay); this.overlay = null; }
    this.container = null; this.work = null; this.bodyId = null;
  }

  /** Bake the body's current geometry → indexed {positions, indices} in local space. */
  _bake(bodyId, container) {
    const doc = useModelStore.getState().doc;
    const body = doc.bodies[bodyId];
    const existing = body?.visual?.geometry?.editMesh;
    if (existing?.positions?.length) {
      return { positions: [...existing.positions], indices: [...(existing.indices ?? [])] };
    }
    let mesh = null;
    container.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
    if (!mesh) return null;
    let geo = mesh.geometry.index ? mesh.geometry.clone() : mergeVertices(mesh.geometry.clone());
    if (!geo.index) geo = mergeVertices(geo);
    mesh.updateMatrix();
    geo.applyMatrix4(mesh.matrix); // fold child transform into container-local space
    return {
      positions: Array.from(geo.attributes.position.array),
      indices: Array.from(geo.index.array),
    };
  }

  // ── overlay ────────────────────────────────────────────────────────────────
  _buildOverlay() {
    this.overlay = new THREE.Group();
    this.overlay.name = 'edit-overlay';
    this.overlay.renderOrder = 2000;
    // Parented to the SCENE (not the container) because the container's children
    // are wiped whenever the body's visual rebuilds (e.g. after a commit). We
    // mirror the container's world matrix each frame via syncTransform().
    this.overlay.matrixAutoUpdate = false;

    const pos = new THREE.Float32BufferAttribute(Float32Array.from(this.work.positions), 3);

    // All vertices as points.
    const pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute('position', pos);
    this.points = new THREE.Points(pgeo, new THREE.PointsMaterial({
      color: VTX_COLOR, size: 9, sizeAttenuation: false, depthTest: false,
    }));
    this.points.renderOrder = 2001;
    this.overlay.add(this.points);

    // Wireframe edges.
    const egeo = new THREE.BufferGeometry();
    egeo.setAttribute('position', pos);
    egeo.setIndex(this._edgeIndices());
    this.edges = new THREE.LineSegments(egeo, new THREE.LineBasicMaterial({
      color: 0x224488, depthTest: false, transparent: true, opacity: 0.55,
    }));
    this.edges.renderOrder = 2000;
    this.overlay.add(this.edges);

    // Selection highlight holders (rebuilt as selection changes).
    this.selPoints = null; this.selEdges = null; this.selFaces = null;

    this.scene.add(this.overlay);
    this.syncTransform();
    this._rebuildSelectionMeshes();
  }

  /** Mirror the body container's world transform onto the scene-level overlay.
   *  Also reconciles to the store each frame (defensive against any missed
   *  enter/leave transition): tears down when inactive, builds when active. */
  syncTransform() {
    const st = useEditModeStore.getState();
    if (!st.active) { if (this.overlay) this._leave(); return; }
    if (!this.overlay) { this._enter(st.bodyId); if (!this.overlay) return; }
    if (!this.container) return;
    this.container.updateMatrixWorld();
    this.overlay.matrix.copy(this.container.matrixWorld);
    this.overlay.updateMatrixWorld(true);
  }

  _edgeIndices() {
    const idx = this.work.indices;
    const seen = new Set();
    const out = [];
    const add = (a, b) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (seen.has(key)) return;
      seen.add(key); out.push(a, b);
    };
    for (let i = 0; i < idx.length; i += 3) {
      add(idx[i], idx[i + 1]); add(idx[i + 1], idx[i + 2]); add(idx[i + 2], idx[i]);
    }
    return out;
  }

  _refreshGeometryAttributes() {
    const arr = Float32Array.from(this.work.positions);
    for (const o of [this.points, this.edges]) {
      if (!o) continue;
      o.geometry.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      o.geometry.attributes.position.needsUpdate = true;
      o.geometry.computeBoundingSphere();
    }
    this._rebuildSelectionMeshes();
  }

  // ── selection visuals ────────────────────────────────────────────────────────
  _selectedVertexSet() {
    const { selectMode, selection } = useEditModeStore.getState();
    const set = new Set();
    if (selectMode === 'vertex') selection.forEach((v) => set.add(v));
    else if (selectMode === 'edge') selection.forEach(([a, b]) => { set.add(a); set.add(b); });
    else if (selectMode === 'face') selection.forEach((t) => {
      const i = t * 3; set.add(this.work.indices[i]); set.add(this.work.indices[i + 1]); set.add(this.work.indices[i + 2]);
    });
    return set;
  }

  _rebuildSelectionMeshes() {
    if (!this.overlay) return;
    for (const k of ['selPoints', 'selEdges', 'selFaces']) {
      if (this[k]) { this.overlay.remove(this[k]); this._disposeObj(this[k]); this[k] = null; }
    }
    const { selectMode, selection } = useEditModeStore.getState();
    const P = this.work.positions;
    const vAt = (i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];

    if (selectMode === 'vertex' && selection.length) {
      const a = [];
      selection.forEach((v) => a.push(...vAt(v)));
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
      this.selPoints = new THREE.Points(g, new THREE.PointsMaterial({ color: SEL_COLOR, size: 13, sizeAttenuation: false, depthTest: false }));
      this.selPoints.renderOrder = 2003; this.overlay.add(this.selPoints);
    } else if (selectMode === 'edge' && selection.length) {
      const a = [];
      selection.forEach(([i, j]) => { a.push(...vAt(i), ...vAt(j)); });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
      this.selEdges = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: SEL_COLOR, depthTest: false, linewidth: 2 }));
      this.selEdges.renderOrder = 2003; this.overlay.add(this.selEdges);
    } else if (selectMode === 'face' && selection.length) {
      const a = [];
      selection.forEach((t) => {
        const i = t * 3, x = this.work.indices[i], y = this.work.indices[i + 1], z = this.work.indices[i + 2];
        a.push(...vAt(x), ...vAt(y), ...vAt(z));
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
      g.computeVertexNormals();
      this.selFaces = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: SEL_COLOR, transparent: true, opacity: 0.4, depthTest: false, side: THREE.DoubleSide }));
      this.selFaces.renderOrder = 2002; this.overlay.add(this.selFaces);
    }

    this._updateStats();
    this._updateGizmo();
  }

  _applyWireframe(on) {
    if (!this.container) return;
    this.container.traverse((o) => {
      if (o.isMesh && o.material && !Array.isArray(o.material)) o.material.wireframe = !!on;
    });
  }

  // ── picking ──────────────────────────────────────────────────────────────────
  _handlePick(e) {
    if (!this.overlay || e.button !== 0 || !this._down) return;
    const moved = Math.hypot(e.clientX - this._down.x, e.clientY - this._down.y);
    this._down = null;
    if (moved > 4) return;
    if (this.gizmo.dragging || this.gizmo.axis) return;

    const rect = this.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this._ray.setFromCamera(ndc, this.camera);

    if (this._twoPoint) { this._handleTwoPoint(); return; }

    const { selectMode } = useEditModeStore.getState();
    const additive = e.shiftKey || e.ctrlKey;

    if (selectMode === 'vertex') this._pickVertex(additive);
    else this._pickFaceOrEdge(selectMode, additive);
  }

  _pickVertex(additive) {
    const hits = this._ray.intersectObject(this.points, false);
    if (!hits.length) { if (!additive) this._setSelection([]); return; }
    const vi = hits[0].index;
    this._toggleInSelection(vi, additive, (a, b) => a === b);
  }

  _pickFaceOrEdge(mode, additive) {
    // Build a temporary solid mesh for face raycast (overlay points/lines aren't faces).
    let mesh = null;
    this.container.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
    if (!mesh) return;
    const hits = this._ray.intersectObject(mesh, false);
    if (!hits.length) { if (!additive) this._setSelection([]); return; }
    const h = hits[0];
    const tri = h.faceIndex;
    if (mode === 'face') { this._toggleInSelection(tri, additive, (a, b) => a === b); return; }

    // edge: nearest of the triangle's 3 edges to the hit point (in local space).
    const inv = new THREE.Matrix4().copy(this.container.matrixWorld).invert();
    const pLocal = h.point.clone().applyMatrix4(inv);
    const i = tri * 3;
    const a = this.work.indices[i], b = this.work.indices[i + 1], c = this.work.indices[i + 2];
    const pairs = [[a, b], [b, c], [c, a]];
    let best = null, bestD = Infinity;
    for (const [p, q] of pairs) {
      const d = this._distPointToSeg(pLocal, this._v(p), this._v(q));
      if (d < bestD) { bestD = d; best = p < q ? [p, q] : [q, p]; }
    }
    if (best) this._toggleEdge(best, additive);
  }

  _toggleInSelection(item, additive, eq) {
    const cur = useEditModeStore.getState().selection;
    const exists = cur.some((x) => eq(x, item));
    let next;
    if (additive) next = exists ? cur.filter((x) => !eq(x, item)) : [...cur, item];
    else next = exists && cur.length === 1 ? [] : [item];
    this._setSelection(next);
  }

  _toggleEdge(edge, additive) {
    const eq = (a, b) => a[0] === b[0] && a[1] === b[1];
    const cur = useEditModeStore.getState().selection;
    const exists = cur.some((x) => eq(x, edge));
    let next;
    if (additive) next = exists ? cur.filter((x) => !eq(x, edge)) : [...cur, edge];
    else next = exists && cur.length === 1 ? [] : [edge];
    this._setSelection(next);
  }

  _setSelection(sel) { useEditModeStore.getState().setSelection(sel); this._rebuildSelectionMeshes(); }

  _selectAll() {
    const { selectMode } = useEditModeStore.getState();
    if (selectMode === 'vertex') this._setSelection([...Array(this.work.positions.length / 3).keys()]);
    else if (selectMode === 'face') this._setSelection([...Array(this.work.indices.length / 3).keys()]);
    else this._setSelection(this._edgePairs());
  }

  _edgePairs() {
    const idx = this.work.indices, seen = new Set(), out = [];
    const add = (a, b) => { const k = a < b ? `${a}_${b}` : `${b}_${a}`; if (!seen.has(k)) { seen.add(k); out.push(a < b ? [a, b] : [b, a]); } };
    for (let i = 0; i < idx.length; i += 3) { add(idx[i], idx[i + 1]); add(idx[i + 1], idx[i + 2]); add(idx[i + 2], idx[i]); }
    return out;
  }

  // ── gizmo / move ──────────────────────────────────────────────────────────────
  _updateGizmo() {
    const set = this._selectedVertexSet();
    if (!set.size) { this._detachGizmo(); return; }
    const c = new THREE.Vector3();
    set.forEach((v) => c.add(this._v(v)));
    c.multiplyScalar(1 / set.size);
    this._centroidLocal.copy(c);
    if (!this._proxy) { this._proxy = new THREE.Object3D(); this.overlay.add(this._proxy); }
    this._proxy.position.copy(c);
    this._proxy.updateMatrixWorld(true);
    this.gizmo.setMode('translate');
    this.gizmo.attach(this._proxy);
    this.gizmo.enabled = true; this.gizmo.visible = true;
    this._dragVerts = [...set];
    this._dragStart = this._dragVerts.map((v) => this._v(v).clone());
  }

  _detachGizmo() {
    this.gizmo.detach(); this.gizmo.enabled = false; this.gizmo.visible = false;
    this._dragVerts = null; this._dragStart = null;
  }

  _onGizmoDrag() {
    if (!this._dragVerts) return;
    const delta = this._proxy.position.clone().sub(this._centroidLocal);
    for (let k = 0; k < this._dragVerts.length; k++) {
      const v = this._dragVerts[k], s = this._dragStart[k];
      this.work.positions[v * 3] = s.x + delta.x;
      this.work.positions[v * 3 + 1] = s.y + delta.y;
      this.work.positions[v * 3 + 2] = s.z + delta.z;
    }
    this._refreshGeometryAttributes();
  }

  // ── edits → commit to model ────────────────────────────────────────────────────
  _commit() {
    if (!this.bodyId) return;
    const doc = useModelStore.getState().doc;
    const body = doc.bodies[this.bodyId];
    if (!body) return;
    const g = body.visual?.geometry ?? {};
    useModelStore.getState().dispatch(commands.updateBody(this.bodyId, {
      visual: { ...body.visual, geometry: { ...g, editMesh: { positions: [...this.work.positions], indices: [...this.work.indices] } } },
    }));
    // Re-bake gizmo drag baselines against the committed positions.
    this._updateGizmo();
  }

  _deleteSelection() {
    const { selectMode, selection } = useEditModeStore.getState();
    if (!selection.length) return;
    const drop = new Set();
    if (selectMode === 'face') selection.forEach((t) => drop.add(t));
    else {
      // vertex/edge → delete every triangle touching a selected vertex.
      const vset = this._selectedVertexSet();
      for (let t = 0; t < this.work.indices.length / 3; t++) {
        const i = t * 3;
        if (vset.has(this.work.indices[i]) || vset.has(this.work.indices[i + 1]) || vset.has(this.work.indices[i + 2])) drop.add(t);
      }
    }
    const next = [];
    for (let t = 0; t < this.work.indices.length / 3; t++) {
      if (drop.has(t)) continue;
      const i = t * 3;
      next.push(this.work.indices[i], this.work.indices[i + 1], this.work.indices[i + 2]);
    }
    this.work.indices = next;
    this._setSelection([]);
    this._rebuildOverlayGeometry();
    this._commit();
  }

  _mergeSelected() {
    // Merge all selected vertices to their average position (weld).
    const vset = [...this._selectedVertexSet()];
    if (vset.length < 2) return;
    const c = new THREE.Vector3();
    vset.forEach((v) => c.add(this._v(v)));
    c.multiplyScalar(1 / vset.length);
    vset.forEach((v) => { this.work.positions[v * 3] = c.x; this.work.positions[v * 3 + 1] = c.y; this.work.positions[v * 3 + 2] = c.z; });
    this._refreshGeometryAttributes();
    this._commit();
  }

  _rebuildOverlayGeometry() {
    if (this.edges) { this.edges.geometry.setIndex(this._edgeIndices()); this.edges.geometry.attributes.position.needsUpdate = true; }
    this._refreshGeometryAttributes();
  }

  _pushVertex(x, y, z) { this.work.positions.push(x, y, z); return this.work.positions.length / 3 - 1; }

  // Shared "region cap" operation used by extrude and inset: duplicate the verts
  // of the selected face region (moved by `moveFn`), re-point the selected tris to
  // the copies, and bridge the boundary edges with wall triangles. Returns true on
  // success; leaves the same triangle slots selected (the new cap).
  _regionCap(selTris, moveFn) {
    const I = this.work.indices;
    const key = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
    const triEdges = (t) => { const i = t * 3; return [[I[i], I[i + 1]], [I[i + 1], I[i + 2]], [I[i + 2], I[i]]]; };

    const count = new Map();
    const used = new Set();
    for (const t of selTris) {
      const i = t * 3; used.add(I[i]); used.add(I[i + 1]); used.add(I[i + 2]);
      for (const [a, b] of triEdges(t)) count.set(key(a, b), (count.get(key(a, b)) || 0) + 1);
    }
    const boundary = [];
    for (const t of selTris) for (const [a, b] of triEdges(t)) if (count.get(key(a, b)) === 1) boundary.push([a, b]);

    const ctx = { used: [...used], boundary, centroid: this._centroidOf([...used]) };
    const map = new Map();
    for (const v of used) { const p = moveFn(this._v(v), ctx); map.set(v, this._pushVertex(p.x, p.y, p.z)); }
    for (const t of selTris) { const i = t * 3; I[i] = map.get(I[i]); I[i + 1] = map.get(I[i + 1]); I[i + 2] = map.get(I[i + 2]); }
    for (const [a, b] of boundary) { const a2 = map.get(a), b2 = map.get(b); I.push(a, b, b2, a, b2, a2); }
    return ctx;
  }

  _regionNormal(selTris) {
    const I = this.work.indices, n = new THREE.Vector3();
    for (const t of selTris) {
      const i = t * 3; const a = this._v(I[i]), b = this._v(I[i + 1]), c = this._v(I[i + 2]);
      n.add(b.clone().sub(a).cross(c.clone().sub(a)));
    }
    if (n.lengthSq() < 1e-12) n.set(0, 1, 0);
    return n.normalize();
  }

  _centroidOf(verts) {
    const c = new THREE.Vector3();
    verts.forEach((v) => c.add(this._v(v)));
    return verts.length ? c.multiplyScalar(1 / verts.length) : c;
  }

  // ── Extrude (faces) ──────────────────────────────────────────────────────────
  _extrudeFaces() {
    const st = useEditModeStore.getState();
    if (st.selectMode !== 'face' || !st.selection.length) return;
    const selTris = [...new Set(st.selection)];
    const n = this._regionNormal(selTris);
    const ctx0 = { boundary: [] };
    // Default offset ≈ average boundary edge length so the extrusion is visible.
    const I = this.work.indices, key = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
    const count = new Map();
    const te = (t) => { const i = t * 3; return [[I[i], I[i + 1]], [I[i + 1], I[i + 2]], [I[i + 2], I[i]]]; };
    for (const t of selTris) for (const [a, b] of te(t)) count.set(key(a, b), (count.get(key(a, b)) || 0) + 1);
    let len = 0, nb = 0;
    for (const t of selTris) for (const [a, b] of te(t)) if (count.get(key(a, b)) === 1) { len += this._v(a).distanceTo(this._v(b)); nb++; ctx0.boundary.push([a, b]); }
    const offset = nb ? (len / nb) * 0.5 : 0.2;

    this._regionCap(selTris, (p) => p.clone().add(n.clone().multiplyScalar(offset)));
    this._setSelection(selTris);
    this._rebuildOverlayGeometry();
    this._commit();
    this._updateGizmo();
  }

  // ── Inset (faces) — shrink a copy of the region toward its centroid ────────────
  _inset() {
    const st = useEditModeStore.getState();
    if (st.selectMode !== 'face' || !st.selection.length) return;
    const amount = Math.max(0, useEditModeStore.getState().opAmount || 0.1);
    const selTris = [...new Set(st.selection)];
    this._regionCap(selTris, (p, ctx) => {
      const dir = ctx.centroid.clone().sub(p);
      const d = dir.length();
      return d <= amount ? ctx.centroid.clone() : p.clone().add(dir.multiplyScalar(amount / d));
    });
    this._setSelection(selTris);
    this._rebuildOverlayGeometry();
    this._commit();
    this._updateGizmo();
  }

  // ── Shrink / Fatten — move selection along vertex normals ──────────────────────
  _shrinkFatten() {
    const set = this._selectedVertexSet();
    if (!set.size) return;
    const amount = useEditModeStore.getState().opAmount || 0.1;
    const normals = this._vertexNormals();
    set.forEach((v) => {
      this.work.positions[v * 3] += normals[v * 3] * amount;
      this.work.positions[v * 3 + 1] += normals[v * 3 + 1] * amount;
      this.work.positions[v * 3 + 2] += normals[v * 3 + 2] * amount;
    });
    this._refreshGeometryAttributes();
    this._commit();
    this._updateGizmo();
  }

  // ── Smooth — one Laplacian pass over the selection (or whole mesh) ─────────────
  _smooth() {
    const sel = this._selectedVertexSet();
    const target = sel.size ? sel : new Set([...Array(this.work.positions.length / 3).keys()]);
    const adj = this._adjacency();
    const P = this.work.positions;
    const next = new Map();
    target.forEach((v) => {
      const nb = adj.get(v);
      if (!nb || !nb.size) return;
      const c = new THREE.Vector3();
      nb.forEach((u) => c.add(this._v(u)));
      c.multiplyScalar(1 / nb.size);
      next.set(v, this._v(v).lerp(c, 0.5));
    });
    next.forEach((p, v) => { P[v * 3] = p.x; P[v * 3 + 1] = p.y; P[v * 3 + 2] = p.z; });
    this._refreshGeometryAttributes();
    this._commit();
  }

  _vertexNormals() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(Float32Array.from(this.work.positions), 3));
    g.setIndex(this.work.indices);
    g.computeVertexNormals();
    const arr = Array.from(g.attributes.normal.array);
    g.dispose();
    return arr;
  }

  _adjacency() {
    const adj = new Map();
    const I = this.work.indices;
    const link = (a, b) => { if (!adj.has(a)) adj.set(a, new Set()); adj.get(a).add(b); };
    for (let i = 0; i < I.length; i += 3) {
      const a = I[i], b = I[i + 1], c = I[i + 2];
      link(a, b); link(b, a); link(b, c); link(c, b); link(c, a); link(a, c);
    }
    return adj;
  }

  // ── Subdivide (selected faces, or whole mesh) ──────────────────────────────────
  _subdivide() {
    const st = useEditModeStore.getState();
    const I = this.work.indices;
    const all = [...Array(I.length / 3).keys()];
    const target = (st.selectMode === 'face' && st.selection.length) ? new Set(st.selection) : new Set(all);
    const mid = new Map();
    const key = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
    const getMid = (a, b) => {
      const k = key(a, b); if (mid.has(k)) return mid.get(k);
      const m = this._v(a).add(this._v(b)).multiplyScalar(0.5);
      const idx = this._pushVertex(m.x, m.y, m.z); mid.set(k, idx); return idx;
    };
    const out = [];
    for (const t of all) {
      const i = t * 3, a = I[i], b = I[i + 1], c = I[i + 2];
      if (!target.has(t)) { out.push(a, b, c); continue; }
      const ab = getMid(a, b), bc = getMid(b, c), ca = getMid(c, a);
      out.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
    }
    this.work.indices = out;
    this._setSelection([]);
    this._rebuildOverlayGeometry();
    this._commit();
  }

  // ── Duplicate selected faces ───────────────────────────────────────────────────
  _duplicateSelection() {
    const st = useEditModeStore.getState();
    if (st.selectMode !== 'face' || !st.selection.length) return;
    const I = this.work.indices;
    const map = new Map();
    const dup = (v) => { if (map.has(v)) return map.get(v); const p = this._v(v); const n = this._pushVertex(p.x, p.y, p.z); map.set(v, n); return n; };
    const base = I.length / 3;
    const newSel = [];
    for (let k = 0; k < st.selection.length; k++) {
      const t = st.selection[k], i = t * 3;
      I.push(dup(I[i]), dup(I[i + 1]), dup(I[i + 2]));
      newSel.push(base + k);
    }
    this._setSelection(newSel);
    this._rebuildOverlayGeometry();
    this._commit();
    this._updateGizmo();
  }

  // ── 2-point move (origin → target, vertex-snapped) ─────────────────────────────
  _startTwoPointMove() {
    if (!this._selectedVertexSet().size) return; // nothing to move
    this._twoPoint = { origin: null };
    this._showTpMarker(null);
  }

  _handleTwoPoint() {
    const hits = this._ray.intersectObject(this.points, false);
    if (!hits.length) return;
    const p = this._v(hits[0].index);
    if (!this._twoPoint.origin) { this._twoPoint.origin = p.clone(); this._showTpMarker(p); return; }
    const delta = p.clone().sub(this._twoPoint.origin);
    this._selectedVertexSet().forEach((v) => {
      this.work.positions[v * 3] += delta.x;
      this.work.positions[v * 3 + 1] += delta.y;
      this.work.positions[v * 3 + 2] += delta.z;
    });
    this._twoPoint = null;
    this._showTpMarker(null);
    this._refreshGeometryAttributes();
    this._commit();
    this._updateGizmo();
  }

  _showTpMarker(p) {
    if (!p) { if (this._tpMarker) { this.overlay.remove(this._tpMarker); this._disposeObj(this._tpMarker); this._tpMarker = null; } return; }
    if (!this._tpMarker) {
      this._tpMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0x22dd88, depthTest: false }),
      );
      this._tpMarker.renderOrder = 2004;
      this.overlay.add(this._tpMarker);
    }
    this._tpMarker.position.copy(p);
  }

  // ── readouts ────────────────────────────────────────────────────────────────
  _updateStats() {
    const { selectMode, selection } = useEditModeStore.getState();
    const W = this.container.matrixWorld;
    const vW = (i) => this._v(i).applyMatrix4(W);
    let area = 0, length = 0, point = null;
    if (selectMode === 'face') {
      for (const t of selection) {
        const i = t * 3;
        const a = vW(this.work.indices[i]), b = vW(this.work.indices[i + 1]), c = vW(this.work.indices[i + 2]);
        area += b.clone().sub(a).cross(c.clone().sub(a)).length() * 0.5;
      }
    } else if (selectMode === 'edge') {
      for (const [p, q] of selection) length += vW(p).distanceTo(vW(q));
    } else if (selectMode === 'vertex' && selection.length === 1) {
      const p = this._v(selection[0]);
      point = [p.x, p.y, p.z];
    }
    useEditModeStore.getState().setStats({ count: selection.length, area, length, point });
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  _v(i) { return new THREE.Vector3(this.work.positions[i * 3], this.work.positions[i * 3 + 1], this.work.positions[i * 3 + 2]); }
  _distPointToSeg(p, a, b) {
    const ab = b.clone().sub(a), t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / (ab.lengthSq() || 1), 0, 1);
    return p.distanceTo(a.clone().add(ab.multiplyScalar(t)));
  }
  _disposeObj(o) { o.geometry?.dispose?.(); o.material?.dispose?.(); }
  _disposeGroup(g) { g.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); }

  /** Called by ModelEditor to know whether to suppress its own gizmo/picking. */
  get active() { return useEditModeStore.getState().active; }

  /** After the model re-renders the body (e.g. post-commit), re-apply view state. */
  onModelSynced() { this._applyWireframe(useEditModeStore.getState().wireframe); }

  dispose() {
    this._unsub?.();
    this.domElement.removeEventListener('pointerdown', this._onDown);
    this.domElement.removeEventListener('pointerup', this._onUp);
    this._leave();
    this.gizmo.detach(); this.gizmo.dispose?.(); this.gizmo.parent?.remove(this.gizmo);
  }
}
