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
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { useEditModeStore } from '@/state/editModeStore';
import { useEditorStore } from '@/state/editorStore';
import { useModelStore } from '@/state/modelStore';
import { commands } from '@/core/commands/index';
import { useBusyStore } from '@/state/busyStore';
import { editBridge } from '@/viewport/editBridge';
import { stripNegativeTranslate, circleSpriteTexture } from '@/viewport/gizmoUtil';

const SEL_COLOR = 0xff8800;
const GREY = 0x8a8a8a;   // inactive vertices/edges
const BLACK = 0x141414;  // active select-mode vertices/edges

// Owns live scene overlays/gizmo via a single instance — force a full reload on
// edits so Fast Refresh never leaves a stale instance running old code.
if (import.meta.hot) (import.meta.hot as any).decline();

export class EditModeController {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any;
  constructor({ scene, camera, controls, domElement, bodyRenderer }: any) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.domElement = domElement;
    this.bodyRenderer = bodyRenderer;

    this.work = null;        // { positions:number[], indices:number[] }
    this.container = null;   // body container (overlay parent)
    this.overlay = null;     // THREE.Group of overlay objects
    this._centroidLocal = new THREE.Vector3();
    this._fusionEdgeVerts = new Set<number>(); // vertex indices on sharp/crease edges
    this._fusionEdgeList = [] as number[];     // flat [a,b,a,b…] of crease edges (cached)
    this._hoverPoint = null;                   // kept for legacy ref; hover uses _hoverGroup
    this._pickMesh = null;                     // invisible mesh from work data for face raycasting
    this._hoverGroup = null;                   // THREE.Group holding all hover highlight objects
    this._hoverKey = '';                       // tracks current hover to avoid rebuild every frame
    this._lastHover = null as any;             // { type:'vertex'|'edge'|'face', data } for click
    this._snapIndicator = null as any;         // bright dot shown at snap target during drag
    this._onFusionMouseMove = (e: MouseEvent) => this._fusionHover(e);
    // Two-stage like Object mode: a fresh pick selects (highlight only); the move
    // gizmo appears only after the selected element is clicked again (or an op runs).
    this._showGizmo = false;
    // The exact editMesh object we last wrote to the model. If the doc's editMesh
    // becomes a DIFFERENT object (undo/redo replaced it), our working copy is stale
    // and must be re-baked — see onModelSynced().
    this._committedMesh = null;

    this.gizmo = new TransformControls(camera, domElement);
    this.gizmo.setSize(0.7);
    this.gizmo.enabled = false;
    this.gizmo.visible = false;
    stripNegativeTranslate(this.gizmo); // only +X/+Y/+Z move arrows
    scene.add(this.gizmo);
    this.gizmo.addEventListener('dragging-changed', (e: any) => { this.controls.enabled = !e.value; });
    this.gizmo.addEventListener('objectChange', () => this._onGizmoDrag());
    this.gizmo.addEventListener('mouseUp', () => { if (this._snapIndicator) this._snapIndicator.visible = false; this._commit(); });

    this._down = null;
    this._onDown = (e: any) => { if (e.button === 0) this._down = { x: e.clientX, y: e.clientY }; };
    this._onUp = (e: any) => this._handlePick(e);
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
    editBridge.fill = () => this._fill();
    editBridge.connect = () => this._connectVertices();
    editBridge.bevel = () => this._bevel();
    editBridge.loopCut = () => this._loopCut();
    editBridge.selectLinked = () => this._selectLinked();
    editBridge.selectSimilar = () => this._selectSimilar();

    let prev = useEditModeStore.getState();
    this._unsub = useEditModeStore.subscribe((s) => {
      // Snapshot the prior state and advance `prev` FIRST. Handlers below write to
      // the store (e.g. _updateStats → setStats), which notifies this subscriber
      // synchronously; if `prev` were still stale that nested call would look like
      // a fresh enter and recurse infinitely (stack overflow). Advancing first
      // makes nested notifications no-ops.
      const was = prev;
      prev = s;
      if (s.active && (!was.active || s.bodyId !== was.bodyId)) this._enter(s.bodyId);
      else if (!s.active && was.active) this._leave();
      else if (s.active) {
        if (s.selectMode !== was.selectMode) { this._applyModeStyle(); this._rebuildSelectionMeshes(); }
        if (s.wireframe !== was.wireframe) this._applyWireframe(s.wireframe);
        if (s.editStyle !== was.editStyle) this._applyEditStyle();
      }
    });

    if (useEditModeStore.getState().active) this._enter(useEditModeStore.getState().bodyId);
  }

  // ── enter / leave ──────────────────────────────────────────────────────────
  _enter(bodyId: any) {
    this._leave();
    const container = this.bodyRenderer.getMesh(bodyId);
    if (!container) { useEditModeStore.getState().exit(); return; }
    this.container = container;
    this.bodyId = bodyId;

    const finish = () => {
      this._entering = false;
      const st = useEditModeStore.getState();
      // Bailed out (or switched body) while we were preparing → undo.
      if (!st.active || st.bodyId !== bodyId || this.container !== container) { this._leave(); return; }
      this.work = this._bake(bodyId, container);
      if (!this.work) { useEditModeStore.getState().exit(); return; }
      this._committedMesh = useModelStore.getState().doc.bodies[bodyId]?.visual?.geometry?.editMesh ?? null;
      this._buildOverlay();
      this._applyWireframe(useEditModeStore.getState().wireframe);
    };

    // Dense meshes make baking (mergeVertices) + overlay build expensive. For
    // those, show the loading bar and defer the heavy work one frame so the bar
    // paints and the click feels responsive instead of freezing.
    let tris = 0;
    container.traverse((o: any) => {
      if (!o.isMesh || !o.geometry) return;
      tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
    });
    if (tris > 4000) {
      this._entering = true;
      useBusyStore.getState().run('Preparing mesh for editing…', async () => finish());
    } else {
      finish();
    }
  }

  _leave() {
    this._entering = false;
    this._showGizmo = false;
    this._committedMesh = null;
    this._twoPoint = null; this._tpMarker = null;
    this._detachGizmo();
    this._applyWireframe(false);
    this.domElement.removeEventListener('mousemove', this._onFusionMouseMove);
    if (this._proxy) { this._proxy.parent?.remove(this._proxy); this._proxy = null; }
    if (this.overlay) { this.scene.remove(this.overlay); this._disposeGroup(this.overlay); this.overlay = null; }
    this._purgeOrphans();
    this._hoverPoint = null; this._hoverGroup = null; this._snapIndicator = null; this._pickMesh = null;
    this._hoverKey = ''; this._lastHover = null;
    this._fusionEdgeVerts.clear(); this._fusionEdgeList = [];
    this.container = null; this.work = null; this.bodyId = null;
  }

  /** Remove any 'edit-overlay' groups still parented to the scene — guards against
   *  an overlay whose `this.overlay` reference was lost (would leave stray dots). */
  _purgeOrphans() {
    for (const c of [...this.scene.children]) {
      if (c.name === 'edit-overlay') { this.scene.remove(c); this._disposeGroup(c); }
    }
  }

  /** Is a stray overlay sitting in the scene? (cheap per-frame check) */
  _sceneHasOverlay() {
    for (const c of this.scene.children) if (c.name === 'edit-overlay') return true;
    return false;
  }

  /** Bake the body's current geometry → indexed {positions, indices} in local space. */
  _bake(bodyId: any, container: any) {
    const doc = useModelStore.getState().doc;
    const body = doc.bodies[bodyId];
    const existing = body?.visual?.geometry?.editMesh;
    if (existing?.positions?.length) {
      return { positions: [...existing.positions], indices: [...(existing.indices ?? [])] };
    }
    let mesh: any = null;
    container.traverse((o: any) => { if (o.isMesh && !mesh) mesh = o; });
    if (!mesh) return null;
    let geo = mesh.geometry.clone();
    // Weld by POSITION only. Primitive geometries (cylinder, sphere…) ship with an
    // index but split coincident vertices at cap/UV seams because their normals/uvs
    // differ there. mergeVertices keeps those split (it compares ALL attributes),
    // which is what produced overlapping dots/edges and "delete leaves dangling
    // geometry". Dropping every attribute except position lets the weld collapse
    // them into one shared vertex — true Blender-style topology. Normals are
    // recomputed for shading by BodyRenderer, so losing them here is harmless.
    for (const name of Object.keys(geo.attributes)) { if (name !== 'position') geo.deleteAttribute(name); }
    geo.morphAttributes = {};
    // Fold the mesh's transform RELATIVE TO THE CONTAINER into the vertices, so
    // work-space == container-local space (which the overlay mirrors, and which the
    // editMesh round-trip in BodyRenderer expects). Using mesh.matrix alone only
    // captures the mesh's immediate local transform — assets parsed as a Group
    // (glTF/STEP/OBJ, or AssetCache's center() offset) put the placement on an
    // intermediate parent, so mesh.matrix would leave vertices at their raw (often
    // huge, metres-scale) coordinates and the overlay would render metres off-screen.
    container.updateMatrixWorld(true);
    mesh.updateWorldMatrix(true, false);
    const relToContainer = new THREE.Matrix4().copy(container.matrixWorld).invert().multiply(mesh.matrixWorld);
    geo.applyMatrix4(relToContainer);
    geo = mergeVertices(geo, 1e-4);
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
    // depthTest:false → vertices are always drawn on top. They sit exactly on the
    // mesh surface (coincident z), so depthTest:true z-fights against the mesh's
    // own depth values almost every fragment and the dots vanish entirely. Always-on-
    // top matches how every other overlay marker in this app (gizmo, connectors,
    // joints) is drawn — depthWrite stays off so overlay dots never occlude each other.
    this.points = new THREE.Points(pgeo, new THREE.PointsMaterial({
      color: GREY, size: 5, sizeAttenuation: false, depthTest: false, depthWrite: false,
      map: circleSpriteTexture(), alphaTest: 0.5, transparent: true,
    }));
    this.points.renderOrder = 2001;
    this.points.frustumCulled = false; // geometry has no bounding sphere yet on first build — never cull
    pgeo.computeBoundingSphere();
    this.overlay.add(this.points);

    // Wireframe edges (always drawn; thin grey, darken/thicken when Edge mode is
    // active). Fat lines (LineSegments2) give crisp, resolution-independent edges
    // of real pixel width — WebGL's GL_LINES can only ever draw 1px, which looked
    // rough. Resolution is kept in sync each frame in syncTransform().
    const egeo = new LineSegmentsGeometry();
    egeo.setPositions(this._edgeSegPositions());
    this.edges = new LineSegments2(egeo, new LineMaterial({
      color: GREY, linewidth: 1.4, depthTest: false, depthWrite: false,
      transparent: true, opacity: 0.5,
    }));
    this.edges.computeLineDistances();
    this.edges.frustumCulled = false;
    this.edges.renderOrder = 2000;
    this.overlay.add(this.edges);

    // Invisible pick mesh built from work geometry — raycasted for face detection.
    // colorWrite:false + depthWrite:false means it contributes nothing to the image;
    // visible:true (default) means Three.js raycaster will test it.
    const pickGeo = new THREE.BufferGeometry();
    pickGeo.setAttribute('position', new THREE.Float32BufferAttribute(Float32Array.from(this.work.positions), 3));
    pickGeo.setIndex(this.work.indices);
    this._pickMesh = new THREE.Mesh(pickGeo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }));
    // visible:false keeps it OUT of the render pipeline entirely — it writes neither
    // colour nor depth, so it contributes nothing to the image and only ever served as
    // a raycast target (hit-tested directly via Mesh.prototype.raycast.call, which does
    // not require visibility). Rendering it was pure overhead that also tripped a WebGL
    // uniform crash on this GPU/ANGLE path, aborting the frame before the overlay drew.
    this._pickMesh.visible = false;
    this.overlay.add(this._pickMesh);

    // Hover highlight group — all fusion hover objects live here.
    this._hoverGroup = new THREE.Group();
    this.overlay.add(this._hoverGroup);

    // Snap indicator — bright green dot shown when a drag snaps to a vertex.
    const siGeo = new THREE.BufferGeometry();
    siGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
    this._snapIndicator = new THREE.Points(siGeo, new THREE.PointsMaterial({
      color: 0x00ff88, size: 12, sizeAttenuation: false,
      depthTest: false, depthWrite: false,
      map: circleSpriteTexture(), alphaTest: 0.5, transparent: true,
    }));
    this._snapIndicator.renderOrder = 2010;
    this._snapIndicator.visible = false;
    this.overlay.add(this._snapIndicator);

    // Legacy ref kept so _leave cleanup doesn't crash.
    this._hoverPoint = this._snapIndicator;

    // Selection highlight holders (rebuilt as selection changes).
    this.selPoints = null; this.selEdges = null; this.selFaces = null;

    this.scene.add(this.overlay);
    this.syncTransform();
    this._applyModeStyle();
    this._applyEditStyle();
    this._rebuildSelectionMeshes();
  }

  /** Both vertices and edges are always shown (small/thin/grey); the overlay for
   *  the ACTIVE select mode is darkened to black so the current mode reads clearly. */
  _applyModeStyle() {
    const { selectMode } = useEditModeStore.getState();
    if (this.points) {
      const on = selectMode === 'vertex';
      this.points.material.color.setHex(on ? BLACK : GREY);
      this.points.material.size = on ? 7 : 5;
    }
    if (this.edges) {
      const on = selectMode === 'edge';
      this.edges.material.color.setHex(on ? BLACK : GREY);
      this.edges.material.opacity = on ? 0.95 : 0.5;
      this.edges.material.linewidth = on ? 2.4 : 1.4;
    }
  }

  /** Mirror the body container's world transform onto the scene-level overlay.
   *  Also reconciles to the store each frame (defensive against any missed
   *  enter/leave transition): tears down when inactive, builds when active. */
  syncTransform() {
    const st = useEditModeStore.getState();
    // Inactive ALWAYS tears down — even mid-bake — so the overlay (vertex dots,
    // edges, gizmo) can never linger after Edit Mode is off.
    if (!st.active) { if (this.overlay || this._entering || this._sceneHasOverlay()) this._leave(); return; }
    if (this._entering) return; // heavy bake in flight — don't re-enter or rebuild
    if (!this.overlay) { this._enter(st.bodyId); if (!this.overlay) return; }
    if (!this.container) return;
    this.container.updateMatrixWorld();
    this.overlay.matrix.copy(this.container.matrixWorld);
    this.overlay.updateMatrixWorld(true);
    this._updateLineResolution();
  }

  /** Fat lines need their material resolution = the renderer's drawing-buffer size
   *  to map linewidth (px) correctly; refreshed each frame so resizes just work. */
  _updateLineResolution() {
    const dpr = window.devicePixelRatio || 1;
    const w = (this.domElement.clientWidth || 1) * dpr;
    const h = (this.domElement.clientHeight || 1) * dpr;
    this.overlay.traverse((o: any) => { if (o.material?.isLineMaterial) o.material.resolution.set(w, h); });
  }

  _edgeIndices(thresholdDeg = 25) {
    const fusion = useEditModeStore.getState().editStyle === 'fusion';
    const idx = this.work.indices;
    const pos = this.work.positions;

    if (!fusion) {
      // Blender mode — emit every unique edge, no filtering.
      const seen = new Set<string>();
      const out: number[] = [];
      for (let i = 0; i < idx.length; i += 3) {
        for (let e = 0; e < 3; e++) {
          const a = idx[i+e], b = idx[i+(e+1)%3];
          const key = a < b ? `${a}_${b}` : `${b}_${a}`;
          if (!seen.has(key)) { seen.add(key); out.push(a, b); }
        }
      }
      return out;
    }
    const triCount = idx.length / 3;
    const cosThresh = Math.cos(thresholdDeg * Math.PI / 180);

    // Compute face normal for every triangle.
    const normals: [number, number, number][] = new Array(triCount);
    for (let t = 0; t < triCount; t++) {
      const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2];
      const ux = pos[b*3]-pos[a*3], uy = pos[b*3+1]-pos[a*3+1], uz = pos[b*3+2]-pos[a*3+2];
      const vx = pos[c*3]-pos[a*3], vy = pos[c*3+1]-pos[a*3+1], vz = pos[c*3+2]-pos[a*3+2];
      const nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx;
      const len = Math.sqrt(nx*nx+ny*ny+nz*nz) || 1;
      normals[t] = [nx/len, ny/len, nz/len];
    }

    // Map each edge key → triangle indices that share it.
    const edgeToTris = new Map<string, number[]>();
    for (let t = 0; t < triCount; t++) {
      for (let e = 0; e < 3; e++) {
        const a = idx[t*3+e], b = idx[t*3+(e+1)%3];
        const key = a < b ? `${a}_${b}` : `${b}_${a}`;
        const arr = edgeToTris.get(key);
        if (arr) arr.push(t); else edgeToTris.set(key, [t]);
      }
    }

    // Keep boundary edges (silhouette) and edges where dihedral angle > threshold.
    const out: number[] = [];
    for (const [key, tris] of edgeToTris) {
      const [a, b] = key.split('_').map(Number);
      if (tris.length === 1) {
        out.push(a, b); // boundary — always show
      } else {
        const n0 = normals[tris[0]], n1 = normals[tris[1]];
        const dot = n0[0]*n1[0] + n0[1]*n1[1] + n0[2]*n1[2];
        if (dot < cosThresh) out.push(a, b); // sharp edge — show; smooth curve — skip
      }
    }
    return out;
  }

  /** Flat [x,y,z, x,y,z, …] of every unique edge's two endpoints, for the fat-line
   *  wireframe (LineSegmentsGeometry.setPositions). Derived from current indices, so
   *  it reflects both topology and position changes. */
  _edgeSegPositions() {
    const idx = this._edgeIndices(), P = this.work.positions, out = new Array(idx.length * 3);
    for (let k = 0; k < idx.length; k++) {
      const v = idx[k];
      out[k * 3] = P[v * 3]; out[k * 3 + 1] = P[v * 3 + 1]; out[k * 3 + 2] = P[v * 3 + 2];
    }
    return out;
  }

  _refreshGeometryAttributes() {
    const fusion = useEditModeStore.getState().editStyle === 'fusion';
    if (this.points) {
      this.points.geometry.setAttribute('position', new THREE.Float32BufferAttribute(Float32Array.from(this.work.positions), 3));
      this.points.geometry.attributes.position.needsUpdate = true;
      this.points.geometry.computeBoundingSphere();
      this.points.visible = !fusion;
    }
    if (this.edges) {
      this.edges.geometry.setPositions(this._edgeSegPositions());
      this.edges.computeLineDistances();
      this.edges.visible = !fusion;
    }
    // Rebuild fusion edge cache after geometry changes.
    this._fusionEdgeList = this._edgeIndices();
    this._fusionEdgeVerts.clear();
    for (const v of this._fusionEdgeList) this._fusionEdgeVerts.add(v);
    // Sync pick mesh geometry so face raycasting stays accurate after edits.
    if (this._pickMesh) {
      this._pickMesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(Float32Array.from(this.work.positions), 3));
      this._pickMesh.geometry.setIndex(this.work.indices);
      this._pickMesh.geometry.attributes.position.needsUpdate = true;
      this._pickMesh.geometry.boundingBox = null;
      this._pickMesh.geometry.boundingSphere = null;
    }
    this._clearHoverGroup(); this._hoverKey = ''; this._lastHover = null;
    this._rebuildSelectionMeshes();
  }

  // ── selection visuals ────────────────────────────────────────────────────────
  _selectedVertexSet() {
    const { selectMode, selection } = useEditModeStore.getState();
    const set = new Set<number>();
    if (selectMode === 'vertex') selection.forEach((v) => set.add(v));
    else if (selectMode === 'edge') selection.forEach(([a, b]) => { set.add(a); set.add(b); });
    else if (selectMode === 'face') selection.forEach((t) => {
      const i = t * 3; set.add(this.work.indices[i]); set.add(this.work.indices[i + 1]); set.add(this.work.indices[i + 2]);
    });
    return set;
  }

  _applyEditStyle() {
    if (!this.overlay) return;
    const fusion = useEditModeStore.getState().editStyle === 'fusion';

    // Rebuild edge overlay geometry first (mode may have changed filter).
    if (this.edges) {
      this.edges.geometry.setPositions(this._edgeSegPositions());
      this.edges.computeLineDistances();
      // Fusion: no static overlay at all — hover shows everything dynamically.
      this.edges.visible = !fusion;
    }
    if (this.points) this.points.visible = !fusion;

    // Cache crease-edge list and vertex set for hover.
    this._fusionEdgeVerts.clear();
    this._fusionEdgeList = this._edgeIndices(); // always rebuild (blender needs it too via _edgeSegPositions)
    for (const v of this._fusionEdgeList) this._fusionEdgeVerts.add(v);

    // Clear stale hover visuals when switching modes.
    this._clearHoverGroup();
    this._hoverKey = '';
    this._lastHover = null;

    this.domElement.removeEventListener('mousemove', this._onFusionMouseMove);
    if (fusion) this.domElement.addEventListener('mousemove', this._onFusionMouseMove);
  }

  // ── fusion hover system ───────────────────────────────────────────────────────

  /** Point-to-segment distance squared in 2D screen space. */
  _ptSegDistSq(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
    const dx = bx - ax, dy = by - ay, lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return (px - ax) ** 2 + (py - ay) ** 2;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    return (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2;
  }

  /** Dispose all objects in _hoverGroup and clear it. */
  _clearHoverGroup() {
    if (!this._hoverGroup) return;
    for (const c of [...this._hoverGroup.children]) this._disposeObj(c);
    this._hoverGroup.clear();
  }

  // Reusable temp objects — avoids per-vertex allocation in the hot hover loop.
  _tmpV3 = new THREE.Vector3();
  _tmpSX = 0; _tmpSY = 0; _tmpSZ = 0;

  /** Project vertex vi (local overlay space) to screen. Result in _tmpSX/Y/Z. z>1 = behind camera. */
  _vsToScreen(vi: number, W: number, H: number) {
    const pos = this.work.positions;
    this._tmpV3.set(pos[vi * 3], pos[vi * 3 + 1], pos[vi * 3 + 2]);
    this._tmpV3.applyMatrix4(this.overlay.matrixWorld).project(this.camera);
    this._tmpSX = (this._tmpV3.x * 0.5 + 0.5) * W;
    this._tmpSY = (-this._tmpV3.y * 0.5 + 0.5) * H;
    this._tmpSZ = this._tmpV3.z;
  }

  _makeHoverMat(color: number, size: number) {
    return new THREE.PointsMaterial({
      color, size, sizeAttenuation: false,
      depthTest: false, depthWrite: false,   // always on top — never buried in mesh
      map: circleSpriteTexture(), alphaTest: 0.5, transparent: true,
    });
  }

  _makeHoverLineMat(color: number, width: number) {
    return new LineMaterial({ color, linewidth: width, depthTest: false, depthWrite: false, transparent: true, opacity: 0.95 });
  }

  _addHoverPoints(coords: number[], color: number, size: number) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
    const p = new THREE.Points(g, this._makeHoverMat(color, size));
    p.renderOrder = 3001; this._hoverGroup.add(p);
  }

  _addHoverLine(coords: number[], color: number, width: number) {
    const g = new LineSegmentsGeometry(); g.setPositions(coords);
    const l = new LineSegments2(g, this._makeHoverLineMat(color, width));
    l.computeLineDistances(); l.frustumCulled = false;
    l.renderOrder = 3000; this._hoverGroup.add(l);
  }

  _showHoverVertex(vi: number) {
    const key = `v:${vi}`;
    if (this._hoverKey === key) return;
    this._clearHoverGroup(); this._hoverKey = key;
    this._lastHover = { type: 'vertex', data: vi };
    const pos = this.work.positions;
    this._addHoverPoints([pos[vi * 3], pos[vi * 3 + 1], pos[vi * 3 + 2]], 0xff8800, 11);
  }

  _showHoverEdge(a: number, b: number) {
    const ea = Math.min(a, b), eb = Math.max(a, b);
    const key = `e:${ea}_${eb}`;
    if (this._hoverKey === key) return;
    this._clearHoverGroup(); this._hoverKey = key;
    this._lastHover = { type: 'edge', data: [ea, eb] };
    const pos = this.work.positions;
    const [ax, ay, az] = [pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2]];
    const [bx, by, bz] = [pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]];
    this._addHoverLine([ax, ay, az, bx, by, bz], 0xff8800, 2.5);
    this._addHoverPoints([ax, ay, az, bx, by, bz], 0xff8800, 9);  // endpoints
    this._addHoverPoints([(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2], 0xffbb44, 6); // midpoint
  }

  _showHoverFace(triIdx: number) {
    const key = `f:${triIdx}`;
    if (this._hoverKey === key) return;
    this._clearHoverGroup(); this._hoverKey = key;
    this._lastHover = { type: 'face', data: triIdx };
    const pos = this.work.positions, idx = this.work.indices;
    const a = idx[triIdx * 3], b = idx[triIdx * 3 + 1], c = idx[triIdx * 3 + 2];
    const [ax, ay, az] = [pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2]];
    const [bx, by, bz] = [pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]];
    const [cx, cy, cz] = [pos[c * 3], pos[c * 3 + 1], pos[c * 3 + 2]];

    // Translucent face fill
    const fGeo = new THREE.BufferGeometry();
    fGeo.setAttribute('position', new THREE.Float32BufferAttribute([ax, ay, az, bx, by, bz, cx, cy, cz], 3));
    fGeo.setIndex([0, 1, 2]);
    const fMesh = new THREE.Mesh(fGeo, new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
    fMesh.renderOrder = 2999; this._hoverGroup.add(fMesh);

    // 3 boundary edges
    this._addHoverLine([ax, ay, az, bx, by, bz, bx, by, bz, cx, cy, cz, cx, cy, cz, ax, ay, az], 0x4488ff, 2);
    // Corner vertices
    this._addHoverPoints([ax, ay, az, bx, by, bz, cx, cy, cz], 0x4488ff, 9);
    // Edge midpoints
    this._addHoverPoints([
      (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2,
      (bx + cx) / 2, (by + cy) / 2, (bz + cz) / 2,
      (cx + ax) / 2, (cy + ay) / 2, (cz + az) / 2,
    ], 0x88bbff, 5);
  }

  _fusionHover(e: MouseEvent) {
    if (!this.overlay || !this.work || !this._hoverGroup) return;
    const rect = this.domElement.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const W = rect.width, H = rect.height;

    // Priority 1 — vertex proximity (10 px radius — tighter so edges/faces are reachable).
    let bestVertDist = 10 * 10, bestVert = -1;
    for (const vi of this._fusionEdgeVerts) {
      this._vsToScreen(vi, W, H);
      if (this._tmpSZ > 1) continue;
      const d = (this._tmpSX - mx) ** 2 + (this._tmpSY - my) ** 2;
      if (d < bestVertDist) { bestVertDist = d; bestVert = vi; }
    }
    if (bestVert >= 0) { this._showHoverVertex(bestVert); return; }

    // Priority 2 — edge proximity (12 px).
    const el = this._fusionEdgeList;
    let bestEdgeDist = 12 * 12, bestA = -1, bestB = -1;
    for (let i = 0; i < el.length; i += 2) {
      const a = el[i], b = el[i + 1];
      this._vsToScreen(a, W, H);
      const sax = this._tmpSX, say = this._tmpSY, saz = this._tmpSZ;
      this._vsToScreen(b, W, H);
      if (saz > 1 && this._tmpSZ > 1) continue;
      const d = this._ptSegDistSq(mx, my, sax, say, this._tmpSX, this._tmpSY);
      if (d < bestEdgeDist) { bestEdgeDist = d; bestA = a; bestB = b; }
    }
    if (bestA >= 0) { this._showHoverEdge(bestA, bestB); return; }

    // Priority 3 — face raycast directly against the pick mesh.
    if (this._pickMesh) {
      const ndcX = (mx / W) * 2 - 1, ndcY = -(my / H) * 2 + 1;
      this._ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
      const hits: any[] = [];
      THREE.Mesh.prototype.raycast.call(this._pickMesh, this._ray, hits);
      if (hits.length > 0 && hits[0].faceIndex !== undefined) {
        this._showHoverFace(hits[0].faceIndex); return;
      }
    }

    // Nothing under cursor.
    if (this._hoverKey !== '') { this._clearHoverGroup(); this._hoverKey = ''; this._lastHover = null; }
  }

  _rebuildSelectionMeshes() {
    if (!this.overlay) return;
    for (const k of ['selPoints', 'selEdges', 'selFaces']) {
      if (this[k]) { this.overlay.remove(this[k]); this._disposeObj(this[k]); this[k] = null; }
    }
    const { selectMode, selection } = useEditModeStore.getState();
    const P = this.work.positions;
    const vAt = (i: any) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];

    if (selectMode === 'vertex' && selection.length) {
      const a: any[] = [];
      selection.forEach((v) => a.push(...vAt(v)));
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
      this.selPoints = new THREE.Points(g, new THREE.PointsMaterial({ color: SEL_COLOR, size: 11, sizeAttenuation: false, depthTest: false, depthWrite: false, map: circleSpriteTexture(), alphaTest: 0.5, transparent: true }));
      this.selPoints.renderOrder = 2003; this.selPoints.frustumCulled = false; this.overlay.add(this.selPoints);
    } else if (selectMode === 'edge' && selection.length) {
      const seg: any[] = [];
      selection.forEach(([i, j]) => { seg.push(...vAt(i), ...vAt(j)); });
      const g = new LineSegmentsGeometry();
      g.setPositions(seg);
      this.selEdges = new LineSegments2(g, new LineMaterial({ color: SEL_COLOR, linewidth: 3.2, depthTest: false, depthWrite: false, transparent: true }));
      this.selEdges.computeLineDistances();
      this.selEdges.frustumCulled = false;
      this.selEdges.renderOrder = 2003; this.overlay.add(this.selEdges);
    } else if (selectMode === 'face' && selection.length) {
      const a: any[] = [];
      selection.forEach((t) => {
        const i = t * 3, x = this.work.indices[i], y = this.work.indices[i + 1], z = this.work.indices[i + 2];
        a.push(...vAt(x), ...vAt(y), ...vAt(z));
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
      g.computeVertexNormals();
      this.selFaces = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: SEL_COLOR, transparent: true, opacity: 0.4, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
      this.selFaces.renderOrder = 2002; this.selFaces.frustumCulled = false; this.overlay.add(this.selFaces);
    }

    this._updateStats();
    this._updateGizmo();
  }

  _applyWireframe(on: any) {
    if (!this.container) return;
    this.container.traverse((o: any) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m: any) => { if (m) m.wireframe = !!on; });
    });
  }

  // ── picking ──────────────────────────────────────────────────────────────────
  _handlePick(e: any) {
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

    const { selectMode, editStyle } = useEditModeStore.getState();
    const additive = e.shiftKey || e.ctrlKey;

    // Fusion mode: pick whatever was last hovered — no separate vertex/edge/face raycast.
    if (editStyle === 'fusion' && this._lastHover) {
      const h = this._lastHover;
      // Selection array shape depends on selectMode (vertex/face→number[], edge→[i,j][]).
      // Fusion has no mode selector, so the hovered element's type must drive selectMode
      // here too — otherwise a stale selectMode from a prior Blender session mismatches
      // the shape actually being pushed and crashes _rebuildSelectionMeshes downstream.
      if (h.type !== selectMode) { useEditModeStore.getState().setSelectMode(h.type); }
      if (h.type === 'vertex') this._toggleInSelection(h.data, additive, (a: any, b: any) => a === b);
      else if (h.type === 'edge') this._toggleEdge(h.data, additive);
      else if (h.type === 'face') this._toggleInSelection(h.data, additive, (a: any, b: any) => a === b);
      return;
    }

    if (selectMode === 'vertex') this._pickVertex(additive);
    else this._pickFaceOrEdge(selectMode, additive);
  }

  _pickVertex(additive: any) {
    const hits = this._ray.intersectObject(this.points, false);
    if (!hits.length) { if (!additive) this._setSelection([]); return; }
    const vi = hits[0].index;
    this._toggleInSelection(vi, additive, (a: any, b: any) => a === b);
  }

  _pickFaceOrEdge(mode: any, additive: any) {
    // Build a temporary solid mesh for face raycast (overlay points/lines aren't faces).
    let mesh: any = null;
    this.container.traverse((o: any) => { if (o.isMesh && !mesh) mesh = o; });
    if (!mesh) return;
    const hits = this._ray.intersectObject(mesh, false);
    if (!hits.length) { if (!additive) this._setSelection([]); return; }
    const h = hits[0];
    const tri = h.faceIndex;
    if (mode === 'face') { this._toggleInSelection(tri, additive, (a: any, b: any) => a === b); return; }

    // edge: nearest of the triangle's 3 edges to the hit point (in local space).
    const inv = new THREE.Matrix4().copy(this.container.matrixWorld).invert();
    const pLocal = h.point.clone().applyMatrix4(inv);
    const i = tri * 3;
    const a = this.work.indices[i], b = this.work.indices[i + 1], c = this.work.indices[i + 2];
    const pairs = [[a, b], [b, c], [c, a]];
    let best: any = null, bestD = Infinity;
    for (const [p, q] of pairs) {
      const d = this._distPointToSeg(pLocal, this._v(p), this._v(q));
      if (d < bestD) { bestD = d; best = p < q ? [p, q] : [q, p]; }
    }
    if (best) this._toggleEdge(best, additive);
  }

  _toggleInSelection(item: any, additive: any, eq: any) {
    const cur = useEditModeStore.getState().selection;
    const exists = cur.some((x) => eq(x, item));
    if (additive) {
      this._showGizmo = false;
      this._setSelection(exists ? cur.filter((x) => !eq(x, item)) : [...cur, item]);
      return;
    }
    if (exists && cur.length === 1) {
      this._showGizmo = true; this._updateGizmo(); return; // 2nd click → reveal gizmo
    }
    this._showGizmo = false;
    this._setSelection([item]);
  }

  _toggleEdge(edge: any, additive: any) {
    const eq = (a: any, b: any) => a[0] === b[0] && a[1] === b[1];
    const cur = useEditModeStore.getState().selection;
    const exists = cur.some((x) => eq(x, edge));
    if (additive) {
      this._showGizmo = false;
      this._setSelection(exists ? cur.filter((x) => !eq(x, edge)) : [...cur, edge]);
      return;
    }
    if (exists && cur.length === 1) {
      this._showGizmo = true; this._updateGizmo(); return; // 2nd click → reveal gizmo
    }
    this._showGizmo = false;
    this._setSelection([edge]);
  }

  _setSelection(sel: any) { useEditModeStore.getState().setSelection(sel); this._rebuildSelectionMeshes(); }

  _selectAll() {
    this._showGizmo = true;
    const { selectMode } = useEditModeStore.getState();
    if (selectMode === 'vertex') this._setSelection([...Array(this.work.positions.length / 3).keys()]);
    else if (selectMode === 'face') this._setSelection([...Array(this.work.indices.length / 3).keys()]);
    else this._setSelection(this._edgePairs());
  }

  _edgePairs() {
    const idx = this.work.indices, seen = new Set<any>(), out: any[] = [];
    const add = (a: any, b: any) => { const k = a < b ? `${a}_${b}` : `${b}_${a}`; if (!seen.has(k)) { seen.add(k); out.push(a < b ? [a, b] : [b, a]); } };
    for (let i = 0; i < idx.length; i += 3) { add(idx[i], idx[i + 1]); add(idx[i + 1], idx[i + 2]); add(idx[i + 2], idx[i]); }
    return out;
  }

  // ── gizmo / move ──────────────────────────────────────────────────────────────
  _updateGizmo() {
    const set = this._selectedVertexSet();
    if (!set.size || !this._showGizmo) { this._detachGizmo(); return; }
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
    this._dragStart = this._dragVerts.map((v: any) => this._v(v).clone());
  }

  _detachGizmo() {
    this.gizmo.detach(); this.gizmo.enabled = false; this.gizmo.visible = false;
    this._dragVerts = null; this._dragStart = null;
  }

  _onGizmoDrag() {
    if (!this._dragVerts) return;
    const delta = this._proxy.position.clone().sub(this._centroidLocal);

    // Fusion mode vertex snap: find nearest non-selected vertex within threshold.
    if (useEditModeStore.getState().editStyle === 'fusion') {
      const selectedSet = new Set(this._dragVerts);
      const snapThresh = 0.04; // model units
      const snapThreshSq = snapThresh * snapThresh;
      const targetPos = new THREE.Vector3(
        this._dragStart[0].x + delta.x,
        this._dragStart[0].y + delta.y,
        this._dragStart[0].z + delta.z,
      );
      let bestSnapDist = snapThreshSq, snapVi = -1;
      const pos = this.work.positions;
      for (let vi = 0; vi < pos.length / 3; vi++) {
        if (selectedSet.has(vi)) continue;
        const dx = pos[vi*3]-targetPos.x, dy = pos[vi*3+1]-targetPos.y, dz = pos[vi*3+2]-targetPos.z;
        const d = dx*dx + dy*dy + dz*dz;
        if (d < bestSnapDist) { bestSnapDist = d; snapVi = vi; }
      }
      if (snapVi >= 0) {
        const snapDelta = new THREE.Vector3(pos[snapVi*3]-this._dragStart[0].x, pos[snapVi*3+1]-this._dragStart[0].y, pos[snapVi*3+2]-this._dragStart[0].z);
        for (let k = 0; k < this._dragVerts.length; k++) {
          const v = this._dragVerts[k], s = this._dragStart[k];
          this.work.positions[v*3] = s.x + snapDelta.x;
          this.work.positions[v*3+1] = s.y + snapDelta.y;
          this.work.positions[v*3+2] = s.z + snapDelta.z;
        }
        if (this._snapIndicator) {
          const si = this._snapIndicator.geometry.attributes.position;
          si.setXYZ(0, pos[snapVi*3], pos[snapVi*3+1], pos[snapVi*3+2]);
          si.needsUpdate = true;
          this._snapIndicator.visible = true;
        }
        this._refreshGeometryAttributes();
        return;
      }
    }

    if (this._snapIndicator) this._snapIndicator.visible = false;
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
    const editMesh = { positions: [...this.work.positions], indices: [...this.work.indices] };
    this._committedMesh = editMesh; // remember our own write so onModelSynced skips it
    useModelStore.getState().dispatch(commands.updateBody(this.bodyId, {
      visual: { ...body.visual, geometry: { ...g, editMesh } },
    }));
    // Re-bake gizmo drag baselines against the committed positions.
    this._updateGizmo();
  }

  _deleteSelection() {
    const { selectMode, selection } = useEditModeStore.getState();
    if (!selection.length) return;
    const drop = new Set<any>();
    if (selectMode === 'face') selection.forEach((t) => drop.add(t));
    else {
      // vertex/edge → delete every triangle touching a selected vertex.
      const vset = this._selectedVertexSet();
      for (let t = 0; t < this.work.indices.length / 3; t++) {
        const i = t * 3;
        if (vset.has(this.work.indices[i]) || vset.has(this.work.indices[i + 1]) || vset.has(this.work.indices[i + 2])) drop.add(t);
      }
    }
    const next: any[] = [];
    for (let t = 0; t < this.work.indices.length / 3; t++) {
      if (drop.has(t)) continue;
      const i = t * 3;
      next.push(this.work.indices[i], this.work.indices[i + 1], this.work.indices[i + 2]);
    }
    this.work.indices = next;
    this._compactVertices(); // drop now-orphaned vertices so no dangling dots/edges remain
    this._setSelection([]);
    this._rebuildOverlayGeometry();
    this._commit();
  }

  /** Remove vertices no longer referenced by any triangle and remap the index
   *  buffer. Blender deletes a vertex's incident edges/faces AND the vertex itself;
   *  without this the dot (and its edges) would linger after its last face is gone. */
  _compactVertices() {
    const I = this.work.indices, P = this.work.positions;
    const used = new Set(I);
    const remap = new Map<any, any>();
    const newP: any[] = [];
    for (let v = 0; v < P.length / 3; v++) {
      if (!used.has(v)) continue;
      remap.set(v, newP.length / 3);
      newP.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
    }
    for (let i = 0; i < I.length; i++) I[i] = remap.get(I[i]);
    this.work.positions = newP;
  }

  _mergeSelected() {
    // Weld selected vertices into ONE shared vertex at their average (Blender's
    // Merge → At Center): collapse all incident indices onto a single survivor,
    // drop triangles that become degenerate, then compact away the dead vertices.
    const vset = [...this._selectedVertexSet()];
    if (vset.length < 2) return;
    const c = new THREE.Vector3();
    vset.forEach((v) => c.add(this._v(v)));
    c.multiplyScalar(1 / vset.length);
    const survivor = Math.min(...vset);
    this.work.positions[survivor * 3] = c.x;
    this.work.positions[survivor * 3 + 1] = c.y;
    this.work.positions[survivor * 3 + 2] = c.z;
    const merged = new Set(vset);
    const I = this.work.indices, next: any[] = [];
    for (let i = 0; i < I.length; i += 3) {
      const a = merged.has(I[i]) ? survivor : I[i];
      const b = merged.has(I[i + 1]) ? survivor : I[i + 1];
      const d = merged.has(I[i + 2]) ? survivor : I[i + 2];
      if (a === b || b === d || a === d) continue; // collapsed → degenerate, drop it
      next.push(a, b, d);
    }
    this.work.indices = next;
    this._compactVertices();
    this._setSelection([]);
    this._rebuildOverlayGeometry();
    this._commit();
  }

  _rebuildOverlayGeometry() {
    // Fat-line edges are rebuilt from current indices inside _refreshGeometryAttributes,
    // so a single refresh covers both topology and position changes.
    this._refreshGeometryAttributes();
  }

  _pushVertex(x: any, y: any, z: any) { this.work.positions.push(x, y, z); return this.work.positions.length / 3 - 1; }

  // Shared "region cap" operation used by extrude and inset: duplicate the verts
  // of the selected face region (moved by `moveFn`), re-point the selected tris to
  // the copies, and bridge the boundary edges with wall triangles. Returns true on
  // success; leaves the same triangle slots selected (the new cap).
  _regionCap(selTris: any, moveFn: any) {
    const I = this.work.indices;
    const key = (a: any, b: any) => (a < b ? `${a}_${b}` : `${b}_${a}`);
    const triEdges = (t: any) => { const i = t * 3; return [[I[i], I[i + 1]], [I[i + 1], I[i + 2]], [I[i + 2], I[i]]]; };

    const count = new Map<any, any>();
    const used = new Set<any>();
    for (const t of selTris) {
      const i = t * 3; used.add(I[i]); used.add(I[i + 1]); used.add(I[i + 2]);
      for (const [a, b] of triEdges(t)) count.set(key(a, b), (count.get(key(a, b)) || 0) + 1);
    }
    const boundary: any[] = [];
    for (const t of selTris) for (const [a, b] of triEdges(t)) if (count.get(key(a, b)) === 1) boundary.push([a, b]);

    const ctx = { used: [...used], boundary, centroid: this._centroidOf([...used]) };
    const map = new Map<any, any>();
    for (const v of used) { const p = moveFn(this._v(v), ctx); map.set(v, this._pushVertex(p.x, p.y, p.z)); }
    for (const t of selTris) { const i = t * 3; I[i] = map.get(I[i]); I[i + 1] = map.get(I[i + 1]); I[i + 2] = map.get(I[i + 2]); }
    for (const [a, b] of boundary) { const a2 = map.get(a), b2 = map.get(b); I.push(a, b, b2, a, b2, a2); }
    return ctx;
  }

  _regionNormal(selTris: any) {
    const I = this.work.indices, n = new THREE.Vector3();
    for (const t of selTris) {
      const i = t * 3; const a = this._v(I[i]), b = this._v(I[i + 1]), c = this._v(I[i + 2]);
      n.add(b.clone().sub(a).cross(c.clone().sub(a)));
    }
    if (n.lengthSq() < 1e-12) n.set(0, 1, 0);
    return n.normalize();
  }

  _centroidOf(verts: any) {
    const c = new THREE.Vector3();
    verts.forEach((v: any) => c.add(this._v(v)));
    return verts.length ? c.multiplyScalar(1 / verts.length) : c;
  }

  // ── Extrude (faces) ──────────────────────────────────────────────────────────
  _extrudeFaces() {
    const st = useEditModeStore.getState();
    if (st.selectMode !== 'face' || !st.selection.length) return;
    const selTris = [...new Set(st.selection)];
    const n = this._regionNormal(selTris);
    const ctx0 = { boundary: [] as any[] };
    // Default offset ≈ average boundary edge length so the extrusion is visible.
    const I = this.work.indices, key = (a: any, b: any) => (a < b ? `${a}_${b}` : `${b}_${a}`);
    const count = new Map<any, any>();
    const te = (t: any) => { const i = t * 3; return [[I[i], I[i + 1]], [I[i + 1], I[i + 2]], [I[i + 2], I[i]]]; };
    for (const t of selTris) for (const [a, b] of te(t)) count.set(key(a, b), (count.get(key(a, b)) || 0) + 1);
    let len = 0, nb = 0;
    for (const t of selTris) for (const [a, b] of te(t)) if (count.get(key(a, b)) === 1) { len += this._v(a).distanceTo(this._v(b)); nb++; ctx0.boundary.push([a, b]); }
    const offset = nb ? (len / nb) * 0.5 : 0.2;

    this._regionCap(selTris, (p: any) => p.clone().add(n.clone().multiplyScalar(offset)));
    this._setSelection(selTris);
    this._rebuildOverlayGeometry();
    this._commit();
    this._showGizmo = true; this._updateGizmo();
  }

  // ── Inset (faces) — shrink a copy of the region toward its centroid ────────────
  _inset() {
    const st = useEditModeStore.getState();
    if (st.selectMode !== 'face' || !st.selection.length) return;
    const amount = Math.max(0, useEditModeStore.getState().opAmount || 0.1);
    const selTris = [...new Set(st.selection)];
    this._regionCap(selTris, (p: any, ctx: any) => {
      const dir = ctx.centroid.clone().sub(p);
      const d = dir.length();
      return d <= amount ? ctx.centroid.clone() : p.clone().add(dir.multiplyScalar(amount / d));
    });
    this._setSelection(selTris);
    this._rebuildOverlayGeometry();
    this._commit();
    this._showGizmo = true; this._updateGizmo();
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
    this._showGizmo = true; this._updateGizmo();
  }

  // ── Smooth — one Laplacian pass over the selection (or whole mesh) ─────────────
  _smooth() {
    const sel = this._selectedVertexSet();
    const target = sel.size ? sel : new Set([...Array(this.work.positions.length / 3).keys()]);
    const adj = this._adjacency();
    const P = this.work.positions;
    const next = new Map<any, any>();
    target.forEach((v) => {
      const nb = adj.get(v);
      if (!nb || !nb.size) return;
      const c = new THREE.Vector3();
      nb.forEach((u: any) => c.add(this._v(u)));
      c.multiplyScalar(1 / nb.size);
      next.set(v, this._v(v).lerp(c, 0.5));
    });
    next.forEach((p, v) => { P[v * 3] = p.x; P[v * 3 + 1] = p.y; P[v * 3 + 2] = p.z; });
    this._refreshGeometryAttributes();
    this._commit();
  }

  // ── Fill (F) — create face from selected vertices or close an edge loop ──────
  _fill() {
    const { selectMode, selection } = useEditModeStore.getState();
    if (!selection.length) return;

    if (selectMode === 'vertex') {
      if (selection.length < 3) return;
      const verts = [...new Set<number>(selection as number[])];

      // Sort by angle around centroid on the best-fit plane so the fan is convex.
      const c = this._centroidOf(verts);
      const n = this._planeNormalOf(verts);
      const ref = this._v(verts[0]).clone().sub(c).normalize();
      const up = new THREE.Vector3().crossVectors(n, ref).normalize();
      const sorted = verts.slice().sort((a: number, b: number) => {
        const pa = this._v(a).clone().sub(c).normalize();
        const pb = this._v(b).clone().sub(c).normalize();
        return Math.atan2(up.dot(pa), ref.dot(pa)) - Math.atan2(up.dot(pb), ref.dot(pb));
      });

      const base = this.work.indices.length / 3;
      const newTris: number[] = [];
      for (let i = 1; i < sorted.length - 1; i++) {
        this.work.indices.push(sorted[0], sorted[i], sorted[i + 1]);
        newTris.push(base + i - 1);
      }
      this._setSelection(newTris);
    } else if (selectMode === 'edge') {
      this._fillEdgeLoop(selection as Array<[number, number]>);
    }

    this._rebuildOverlayGeometry();
    this._commit();
  }

  _planeNormalOf(verts: number[]) {
    const c = this._centroidOf(verts);
    const n = new THREE.Vector3();
    for (let i = 0; i < verts.length; i++) {
      const a = this._v(verts[i]).sub(c);
      const b = this._v(verts[(i + 1) % verts.length]).sub(c);
      n.add(new THREE.Vector3().crossVectors(a, b));
    }
    if (n.lengthSq() < 1e-10) n.set(0, 1, 0);
    return n.normalize();
  }

  _fillEdgeLoop(edges: Array<[number, number]>) {
    // Build adjacency from selected edges; find closed loops.
    const adj = new Map<number, number[]>();
    for (const [a, b] of edges) {
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a)!.push(b);
      adj.get(b)!.push(a);
    }
    const visited = new Set<number>();
    const loops: number[][] = [];
    for (const [start] of adj) {
      if (visited.has(start)) continue;
      const loop: number[] = [];
      let cur = start, prev = -1;
      let limit = 0;
      while (!visited.has(cur) && limit++ < 10000) {
        visited.add(cur);
        loop.push(cur);
        const nbs = (adj.get(cur) ?? []).filter((v) => v !== prev);
        if (!nbs.length) break;
        prev = cur; cur = nbs[0];
      }
      if (loop.length >= 3) loops.push(loop);
    }
    const base = this.work.indices.length / 3;
    const newTris: number[] = [];
    for (const loop of loops) {
      for (let i = 1; i < loop.length - 1; i++) {
        this.work.indices.push(loop[0], loop[i], loop[i + 1]);
        newTris.push(base + newTris.length);
      }
    }
    this._setSelection(newTris);
  }

  // ── Connect (J) — flip diagonal / connect two vertices with an edge ─────────
  _connectVertices() {
    const { selectMode, selection } = useEditModeStore.getState();
    if (selectMode !== 'vertex' || selection.length !== 2) return;
    const [a, b] = selection as [number, number];
    const I = this.work.indices;
    const ek = (p: number, q: number) => `${Math.min(p, q)}_${Math.max(p, q)}`;

    // Build face lists for each vertex
    const facesWithA: number[] = [], facesWithB: number[] = [];
    for (let t = 0; t < I.length / 3; t++) {
      const i = t * 3;
      const hasA = I[i] === a || I[i+1] === a || I[i+2] === a;
      const hasB = I[i] === b || I[i+1] === b || I[i+2] === b;
      if (hasA && hasB) {
        // Already share a face — check if already an edge
        const hasEdge = (
          (I[i] === a && I[i+1] === b) || (I[i] === b && I[i+1] === a) ||
          (I[i+1] === a && I[i+2] === b) || (I[i+1] === b && I[i+2] === a) ||
          (I[i+2] === a && I[i] === b) || (I[i+2] === b && I[i] === a)
        );
        if (hasEdge) return; // already directly connected
      }
      if (hasA) facesWithA.push(t);
      if (hasB) facesWithB.push(t);
    }

    // Find two adjacent triangles where one has A and the other has B,
    // sharing an edge c-d.  Replace them with new diagonal A-B.
    const edgeFaces = new Map<string, number[]>();
    const allFaces = [...new Set([...facesWithA, ...facesWithB])];
    for (const t of allFaces) {
      const i = t * 3;
      const addE = (p: number, q: number) => {
        const k = ek(p, q);
        if (!edgeFaces.has(k)) edgeFaces.set(k, []);
        edgeFaces.get(k)!.push(t);
      };
      addE(I[i], I[i+1]); addE(I[i+1], I[i+2]); addE(I[i+2], I[i]);
    }

    for (const [key, fcs] of edgeFaces) {
      if (fcs.length !== 2) continue;
      const [t1, t2] = fcs;
      const aInT1 = facesWithA.includes(t1), aInT2 = facesWithA.includes(t2);
      const bInT1 = facesWithB.includes(t1), bInT2 = facesWithB.includes(t2);
      if (!(aInT1 !== aInT2 && bInT1 !== bInT2)) continue;
      const [c, d] = key.split('_').map(Number);
      // Flip the shared diagonal to A-B.
      const ia = (aInT1 ? t1 : t2) * 3;
      const ib = (aInT1 ? t2 : t1) * 3;
      // Triangles become: (a, c, b) and (a, b, d) — preserving general winding.
      I[ia] = a; I[ia+1] = c; I[ia+2] = b;
      I[ib] = a; I[ib+1] = b; I[ib+2] = d;
      this._rebuildOverlayGeometry();
      this._commit();
      return;
    }

    // Fallback: no adjacent pair found — just add an edge by creating a new face strip.
    // Insert a degenerate (zero-area) triangle to register the new edge topologically.
    const base = this.work.indices.length / 3;
    this.work.indices.push(a, b, a); // collapsed — forces the edge into the wireframe
    this._setSelection([base]);
    this._rebuildOverlayGeometry();
    this._commit();
  }

  // ── Bevel (B) — chamfer selected edges ──────────────────────────────────────
  _bevel() {
    const { selectMode, selection } = useEditModeStore.getState();
    if (selectMode !== 'edge' || !selection.length) return;
    const amount = Math.max(0.001, useEditModeStore.getState().opAmount ?? 0.05);
    const I = this.work.indices;

    // edge → [face indices]
    const ek = (a: number, b: number) => `${Math.min(a,b)}_${Math.max(a,b)}`;
    const edgeFaces = new Map<string, number[]>();
    for (let t = 0; t < I.length / 3; t++) {
      const i = t * 3;
      const add = (p: number, q: number) => {
        const k = ek(p, q);
        if (!edgeFaces.has(k)) edgeFaces.set(k, []);
        edgeFaces.get(k)!.push(t);
      };
      add(I[i], I[i+1]); add(I[i+1], I[i+2]); add(I[i+2], I[i]);
    }

    const selKeys = new Set((selection as Array<[number, number]>).map(([a,b]) => ek(a,b)));

    // For each selected edge: create 2 offset verts per adjacent face and
    // replace the edge verts in those faces.  Then add a bevel quad.
    const processed = new Set<string>();

    for (const [ea, eb] of selection as Array<[number, number]>) {
      const k = ek(ea, eb);
      if (processed.has(k)) continue;
      processed.add(k);

      const faces = edgeFaces.get(k) ?? [];
      const pA = this._v(ea), pB = this._v(eb);

      const offsets: Array<{t: number; a1: number; b1: number}> = [];
      for (const t of faces) {
        const i = t * 3;
        const verts = [I[i], I[i+1], I[i+2]];
        const other = verts.find((v) => v !== ea && v !== eb);
        if (other === undefined) continue;
        // Inward direction from edge toward the third vertex.
        const mid = pA.clone().add(pB).multiplyScalar(0.5);
        const inward = this._v(other).clone().sub(mid).normalize();
        const a1 = this._pushVertex(pA.x + inward.x * amount, pA.y + inward.y * amount, pA.z + inward.z * amount);
        const b1 = this._pushVertex(pB.x + inward.x * amount, pB.y + inward.y * amount, pB.z + inward.z * amount);
        // Repoint ea/eb in this triangle to the offset copies.
        for (let j = 0; j < 3; j++) {
          if (I[i+j] === ea) I[i+j] = a1;
          else if (I[i+j] === eb) I[i+j] = b1;
        }
        offsets.push({ t, a1, b1 });
      }

      // Add bevel face between offset verts.
      if (offsets.length === 2) {
        const { a1, b1 } = offsets[0];
        const { a1: a2, b1: b2 } = offsets[1];
        // Quad → 2 triangles
        this.work.indices.push(a1, b1, b2, a1, b2, a2);
      } else if (offsets.length === 1) {
        const { a1, b1 } = offsets[0];
        this.work.indices.push(ea, eb, b1, ea, b1, a1);
      }
    }
    void selKeys; // suppress lint
    this._setSelection([]);
    this._rebuildOverlayGeometry();
    this._commit();
  }

  // ── Loop Cut (Ctrl+R) — insert perpendicular edge ring ──────────────────────
  _loopCut() {
    const { selectMode, selection } = useEditModeStore.getState();
    let startEdge: [number, number] | null = null;
    if (selectMode === 'edge' && selection.length > 0) startEdge = (selection as Array<[number, number]>)[0];
    if (!startEdge) return;

    const ring = this._findEdgeRing(startEdge);
    if (!ring.length) return;

    const I = this.work.indices;
    const ek = (a: number, b: number) => `${Math.min(a,b)}_${Math.max(a,b)}`;

    // Build edge→faces once
    const edgeFaces = new Map<string, number[]>();
    for (let t = 0; t < I.length / 3; t++) {
      const i = t * 3;
      const add = (p: number, q: number) => {
        const k = ek(p, q);
        if (!edgeFaces.has(k)) edgeFaces.set(k, []);
        edgeFaces.get(k)!.push(t);
      };
      add(I[i], I[i+1]); add(I[i+1], I[i+2]); add(I[i+2], I[i]);
    }

    // Insert midpoint for each ring edge
    const midpts = new Map<string, number>();
    for (const [a, b] of ring) {
      const k = ek(a, b);
      if (midpts.has(k)) continue;
      const m = this._v(a).clone().add(this._v(b)).multiplyScalar(0.5);
      midpts.set(k, this._pushVertex(m.x, m.y, m.z));
    }

    const ringKeys = new Set(ring.map(([a,b]) => ek(a,b)));
    const toRemove = new Set<number>();
    const toAdd: number[] = [];

    for (let t = 0; t < I.length / 3; t++) {
      const i = t * 3;
      const va = I[i], vb = I[i+1], vc = I[i+2];
      const edges: Array<[number,number,number]> = [[va,vb,vc],[vb,vc,va],[vc,va,vb]]; // [a,b,opp]
      let found = false;
      for (const [a, b, opp] of edges) {
        const k = ek(a, b);
        if (!ringKeys.has(k)) continue;
        const mid = midpts.get(k)!;
        // Split (a,b,opp) → (a,mid,opp) and (mid,b,opp)
        toRemove.add(t);
        toAdd.push(a, mid, opp, mid, b, opp);
        found = true;
        break;
      }
      void found;
    }

    const next: number[] = [];
    for (let t = 0; t < I.length / 3; t++) {
      if (toRemove.has(t)) continue;
      const i = t * 3;
      next.push(I[i], I[i+1], I[i+2]);
    }
    this.work.indices = [...next, ...toAdd];

    // Select the new edge ring (midpoint-to-midpoint edges)
    this._setSelection([]);
    this._rebuildOverlayGeometry();
    this._commit();
  }

  _findEdgeRing(startEdge: [number, number]): Array<[number, number]> {
    const I = this.work.indices;
    const numTris = I.length / 3;
    const ek = (a: number, b: number) => `${Math.min(a,b)}_${Math.max(a,b)}`;

    // Build edge→faces
    const edgeFaces = new Map<string, number[]>();
    for (let t = 0; t < numTris; t++) {
      const i = t * 3;
      const add = (a: number, b: number) => {
        const k = ek(a, b);
        if (!edgeFaces.has(k)) edgeFaces.set(k, []);
        edgeFaces.get(k)!.push(t);
      };
      add(I[i], I[i+1]); add(I[i+1], I[i+2]); add(I[i+2], I[i]);
    }

    // Given a face and the entry edge, return the "exit edge" — the one most
    // perpendicular to the entry direction (for traversing across quad-pairs).
    const getExit = (faceIdx: number, entryA: number, entryB: number): [number,number] | null => {
      const i = faceIdx * 3;
      const verts = [I[i], I[i+1], I[i+2]];
      const c = verts.find((v) => v !== entryA && v !== entryB);
      if (c === undefined) return null;
      const entryDir = this._v(entryB).clone().sub(this._v(entryA)).normalize();
      const cands: Array<[number,number]> = [[entryA, c], [entryB, c]];
      let best: [number,number] | null = null, bestPerp = -1;
      for (const [p,q] of cands) {
        const d = this._v(q).clone().sub(this._v(p)).normalize();
        const perp = 1 - Math.abs(d.dot(entryDir));
        if (perp > bestPerp) { bestPerp = perp; best = [p,q]; }
      }
      return bestPerp > 0.25 ? best : null;
    };

    const [sa, sb] = startEdge;
    const startKey = ek(sa, sb);
    const visited = new Set<string>([startKey]);
    const ring: Array<[number,number]> = [[sa, sb]];

    const traverse = (startFaceIdx: number, initA: number, initB: number) => {
      let prevA = initA, prevB = initB, curFace = startFaceIdx;
      for (let step = 0; step < 500; step++) {
        const exit = getExit(curFace, prevA, prevB);
        if (!exit) break;
        const [ea, eb] = exit;
        const eKey = ek(ea, eb);
        if (visited.has(eKey)) break;
        visited.add(eKey);
        ring.push([ea, eb]);
        const next = (edgeFaces.get(eKey) ?? []).filter((f) => f !== curFace);
        if (!next.length) break;
        curFace = next[0];
        prevA = ea; prevB = eb;
      }
    };

    const faces = edgeFaces.get(startKey) ?? [];
    for (const f of faces) traverse(f, sa, sb);
    return ring;
  }

  // ── Select Linked (L) — flood-fill select connected geometry ─────────────────
  _selectLinked() {
    const { selectMode } = useEditModeStore.getState();
    const seeds = new Set(this._selectedVertexSet());
    if (!seeds.size) {
      // If nothing selected, select everything
      this._selectAll(); return;
    }
    const adj = this._adjacency();
    const visited = new Set<number>(seeds);
    const queue = [...seeds];
    while (queue.length) {
      const v = queue.shift()!;
      adj.get(v)?.forEach((n: number) => { if (!visited.has(n)) { visited.add(n); queue.push(n); } });
    }
    const I = this.work.indices;
    if (selectMode === 'vertex') {
      this._setSelection([...visited]);
    } else if (selectMode === 'face') {
      const sel: number[] = [];
      for (let t = 0; t < I.length / 3; t++) {
        const i = t * 3;
        if (visited.has(I[i]) && visited.has(I[i+1]) && visited.has(I[i+2])) sel.push(t);
      }
      this._setSelection(sel);
    } else {
      const pairs = this._edgePairs();
      this._setSelection(pairs.filter(([a, b]: [number, number]) => visited.has(a) && visited.has(b)));
    }
    this._showGizmo = true;
    this._updateGizmo();
  }

  // ── Select Similar (Shift+G) — select by shared criteria ────────────────────
  _selectSimilar() {
    const { selectMode, selection } = useEditModeStore.getState();
    if (!selection.length) return;
    const I = this.work.indices;

    if (selectMode === 'face') {
      // Similar = same approximate normal direction (within 30°).
      const seedNormals: THREE.Vector3[] = (selection as number[]).map((t) => {
        const i = t * 3;
        const a = this._v(I[i]), b = this._v(I[i+1]), c = this._v(I[i+2]);
        return new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
      });
      const similar: number[] = [...(selection as number[])];
      for (let t = 0; t < I.length / 3; t++) {
        if ((selection as number[]).includes(t)) continue;
        const i = t * 3;
        const a = this._v(I[i]), b = this._v(I[i+1]), c = this._v(I[i+2]);
        const n = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
        if (seedNormals.some((sn) => Math.abs(sn.dot(n)) > 0.87)) similar.push(t); // cos(30°)
      }
      this._setSelection(similar);
    } else if (selectMode === 'edge') {
      // Similar = same approximate edge length (±20%).
      const selEdges = selection as Array<[number,number]>;
      const seedLen = selEdges.reduce((s, [a,b]) => s + this._v(a).distanceTo(this._v(b)), 0) / selEdges.length;
      const all = this._edgePairs();
      const similar = all.filter(([a, b]: [number,number]) => {
        const l = this._v(a).distanceTo(this._v(b));
        return Math.abs(l - seedLen) < seedLen * 0.2;
      });
      this._setSelection(similar);
    } else {
      // Vertex: similar = same approximate Y (height), i.e. same horizontal ring.
      const seedY = (selection as number[]).reduce((s, v) => s + this._v(v).y, 0) / selection.length;
      const all = [...Array(this.work.positions.length / 3).keys()];
      const tolerance = Math.max(0.01, Math.abs(seedY) * 0.05 + 0.005);
      this._setSelection(all.filter((v) => Math.abs(this._v(v).y - seedY) < tolerance));
    }
    this._showGizmo = true;
    this._updateGizmo();
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
    const adj = new Map<any, any>();
    const I = this.work.indices;
    const link = (a: any, b: any) => { if (!adj.has(a)) adj.set(a, new Set<any>()); adj.get(a).add(b); };
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
    const mid = new Map<any, any>();
    const key = (a: any, b: any) => (a < b ? `${a}_${b}` : `${b}_${a}`);
    const getMid = (a: any, b: any) => {
      const k = key(a, b); if (mid.has(k)) return mid.get(k);
      const m = this._v(a).add(this._v(b)).multiplyScalar(0.5);
      const idx = this._pushVertex(m.x, m.y, m.z); mid.set(k, idx); return idx;
    };
    const out: any[] = [];
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
    const map = new Map<any, any>();
    const dup = (v: any) => { if (map.has(v)) return map.get(v); const p = this._v(v); const n = this._pushVertex(p.x, p.y, p.z); map.set(v, n); return n; };
    const base = I.length / 3;
    const newSel: any[] = [];
    for (let k = 0; k < st.selection.length; k++) {
      const t = st.selection[k], i = t * 3;
      I.push(dup(I[i]), dup(I[i + 1]), dup(I[i + 2]));
      newSel.push(base + k);
    }
    this._setSelection(newSel);
    this._rebuildOverlayGeometry();
    this._commit();
    this._showGizmo = true; this._updateGizmo();
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
    this._showGizmo = true; this._updateGizmo();
  }

  _showTpMarker(p: any) {
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
    const vW = (i: any) => this._v(i).applyMatrix4(W);
    let area = 0, length = 0, point: any = null;
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
  _v(i: any) { return new THREE.Vector3(this.work.positions[i * 3], this.work.positions[i * 3 + 1], this.work.positions[i * 3 + 2]); }
  _distPointToSeg(p: any, a: any, b: any) {
    const ab = b.clone().sub(a), t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / (ab.lengthSq() || 1), 0, 1);
    return p.distanceTo(a.clone().add(ab.multiplyScalar(t)));
  }
  _disposeObj(o: any) { o.geometry?.dispose?.(); o.material?.dispose?.(); }
  _disposeGroup(g: any) { g.traverse((o: any) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); }

  /** Called by ModelEditor to know whether to suppress its own gizmo/picking. */
  get active() { return useEditModeStore.getState().active; }

  /** After the model re-renders the body (e.g. post-commit), re-apply view state.
   *  Critically: if the body's editMesh became a DIFFERENT object than the one we
   *  last wrote (undo/redo, or an external edit), our working copy is stale — the
   *  overlay/picking would map to the wrong triangles and edits would clobber old
   *  geometry. Detect that by reference and re-bake from the doc. */
  onModelSynced() {
    this._applyWireframe(useEditModeStore.getState().wireframe);
    if (!this.bodyId || !this.container || !this.overlay) return;
    const em = useModelStore.getState().doc.bodies[this.bodyId]?.visual?.geometry?.editMesh ?? null;
    if (em !== this._committedMesh) { this._committedMesh = em; this._resyncFromDoc(); }
  }

  /** Re-bake the working copy from the current doc and rebuild the overlay. Clears
   *  the sub-selection (indices may have shifted) so nothing maps to a stale tri. */
  _resyncFromDoc() {
    const work = this._bake(this.bodyId, this.container);
    if (!work) return;
    this.work = work;
    this._showGizmo = false;
    this._detachGizmo();
    useEditModeStore.getState().setSelection([]);
    this._rebuildOverlayGeometry(); // new edge index + point/edge buffers + selection
    this._applyModeStyle();
  }

  dispose() {
    this._unsub?.();
    this.domElement.removeEventListener('pointerdown', this._onDown);
    this.domElement.removeEventListener('pointerup', this._onUp);
    this._leave();
    this.gizmo.detach(); this.gizmo.dispose?.(); this.gizmo.parent?.remove(this.gizmo);
  }
}