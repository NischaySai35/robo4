/**
 * ModelEditor — the viewport-side controller for the model layer.
 *
 * Bridges the framework-free renderer/gizmo to the reactive stores:
 *   • BodyRenderer.sync()   ← modelStore document changes
 *   • TransformControls      ↔ the selected body; drag commits an updateBody command
 *   • selection highlight    ← selectionStore
 *
 * Selection is driven from the Outliner panel in Phase 1 (no canvas raycast yet),
 * so this never competes with the legacy arm's pointer interaction. The gizmo's
 * own handles are the only viewport pointer surface it owns.
 */
import type { Document } from '@/core/model/index';
import { GeometryType } from '@/core/model/index';
import * as THREE from 'three';
import { getAssetObject } from '@/viewport/renderers/AssetCache';
import { convexHullPoints } from '@/viewport/colliderFactory';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { physicsBridge } from '@/viewport/physicsBridge';
import { BodyRenderer } from '@/viewport/renderers/BodyRenderer';
import { JointRenderer } from '@/viewport/renderers/JointRenderer';
import { EditModeController } from '@/viewport/EditModeController';
import { useModelStore } from '@/state/modelStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useDockStore } from '@/state/dockStore';
import { usePageStore } from '@/state/pageStore';
import { useEditorStore } from '@/state/editorStore';
import { useEditModeStore } from '@/state/editModeStore';
import { useAnimationStore } from '@/state/animationStore';
import { commands } from '@/core/commands/index';
import { computeFK, buildChildJointMap, originForChildWorld, mat, movePivotKeepingChild } from '@/kinematics/modelFK';
import { chainJoints, solveModelIK } from '@/kinematics/modelIK';
import { computeSnap, SnapIndicator } from '@/viewport/Snapper';
import { stripNegativeTranslate } from '@/viewport/gizmoUtil';
import { useTransformHudStore } from '@/state/transformHudStore';
import { bridge } from '@/viewport/cameraBridge';
import { jointLoads, centerOfMass, bodyStressField } from '@/kinematics/analysis';
// PhysicsSim (and the heavy Rapier WASM it pulls in) is loaded lazily on first
// Play, so it stays out of the initial bundle and the app starts up fast.

// This controller is instantiated once (held in a ref) and owns long-lived THREE
// objects in the scene. Fast Refresh can't hot-swap a live instance, so editing
// this file must trigger a full page reload — otherwise the old instance keeps
// running stale code (stale gizmos, orphaned overlays, etc.).
if (import.meta.hot) (import.meta.hot as any).decline();

export class ModelEditor {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any;
  constructor({ scene, camera, controls, domElement }: any) {
    this.controls = controls;
    this.bodyRenderer = new BodyRenderer(scene);
    this.jointRenderer = new JointRenderer(scene);

    this.transform = new TransformControls(camera, domElement);
    this.transform.setSize(0.8);
    this.transform.enabled = false;
    this.transform.visible = false;
    stripNegativeTranslate(this.transform); // only +X/+Y/+Z move arrows
    scene.add(this.transform);

    // Invisible proxy the gizmo attaches to when a JOINT is selected, so the joint
    // pivot gets its own 3-axis move/rotate handles (commit → joint origin).
    this._jointProxy = new THREE.Object3D();
    this._jointProxy.name = 'joint-pivot-proxy';
    scene.add(this._jointProxy);
    this._attachedJointId = null;

    // Don't let orbit fight the gizmo while dragging a handle. Also remember that
    // a gizmo interaction just happened, so the click that ends it is not mistaken
    // for a click on empty space (which would otherwise deselect).
    this._gizmoActive = false;
    this._gizmoChanged = false; // did this gizmo interaction actually move anything?
    this._multiIds = null; // ids of a multi-body selection driven by the proxy gizmo
    this._dragStartSnap = null;    // snapshot for HUD delta computation
    this._modal = null;            // axis-constrained modal transform state
    this._axisLine = null;         // visual axis line during modal transform
    this._hoveredId = null;        // body under cursor
    this._lastNdc = new THREE.Vector2();
    this.transform.addEventListener('dragging-changed', (e: any) => {
      controls.enabled = !e.value;
      if (e.value) {
        this._gizmoActive = true; this._gizmoChanged = false;
        if (this._multiIds) this._beginMultiDrag();
        const obj = this.transform.object;
        if (obj) {
          this._dragStartSnap = {
            pos: obj.position.clone(),
            quat: obj.quaternion.clone(),
            scale: obj.scale.clone(),
          };
        }
        useTransformHudStore.getState().beginDrag(this.transform.mode as any);
      } else {
        this._dragStartSnap = null;
        useTransformHudStore.getState().endDrag();
      }
    });
    // Mark a real edit so a no-op gizmo touch (a click that merely grazed an
    // invisible gizmo plane) doesn't block click-to-deselect on empty space.
    this.transform.addEventListener('objectChange', () => {
      this._gizmoChanged = true;
      if (this._multiIds && this.transform.dragging) this._applyMultiDrag();
      this._updateHud();
    });

    // Commit the gizmo's result to the model as an undoable command on release.
    this.transform.addEventListener('mouseUp', () => {
      if (this._multiIds) this._commitMulti(); else this._commitTransform();
    });

    // Wire axis modal to bridge so App.tsx keyboard handler can call it.
    bridge.startAxisModal  = (axis: 'x'|'y'|'z') => this.startAxisModal(axis);
    bridge.commitAxisModal = (v?: number)          => this._commitAxisModal(v);
    bridge.cancelAxisModal = ()                    => this._cancelAxisModal();

    // Canvas click-picking: click a model body to select it (shows the gizmo),
    // click empty space to deselect (hides the gizmo). A small move threshold
    // means an orbit/drag never counts as a click.
    this.camera = camera;
    this.domElement = domElement;
    this._downPos = null;
    // Drag-from-tip IK state.
    this._ikDrag = useEditorStore.getState().ikDrag;
    this._ikActive = false;
    this._ikTip = null;
    this._ikRay = new THREE.Raycaster();
    this._ikPlane = new THREE.Plane();
    this._onPointerDown = (e: any) => {
      if (e.button !== 0) return;
      this._downPos = { x: e.clientX, y: e.clientY };
      if (this._ikDrag && !this.editMode?.active && !this._sim && !this._mateMode) this._tryStartIK(e);
    };
    this._onPointerUp = (e: any) => { if (this._ikActive) { this._endIK(); return; } this._handlePick(e); };
    this._onPointerMove = (e: any) => { if (this._ikActive) { this._dragIK(e); return; } this._handleHover(e); };
    this._onDblClick = (e: any) => this._handleDblClick(e);
    domElement.addEventListener('pointerdown', this._onPointerDown);
    domElement.addEventListener('pointerup', this._onPointerUp);
    domElement.addEventListener('pointermove', this._onPointerMove);
    domElement.addEventListener('dblclick', this._onDblClick);
    this._snapIndicator = new SnapIndicator(scene);

    // React to model + selection changes.
    this._unsubModel = useModelStore.subscribe((s) => this._syncModel(s.doc));
    this._unsubSel = useSelectionStore.subscribe((s) => this._onSelection(s));

    // Gizmo snapping (Phase 3) + physics sim (Phase 7) + mate tool (assembly).
    this._sim = null;
    this._startingSim = false;
    this._lastPlayhead = -1; // last animation playhead we wrote into the doc
    this._showAnalysis = useEditorStore.getState().showAnalysis;
    this._mateMode = useEditorStore.getState().mateMode;
    this._matePicks = [];
    this._mateMarkers = new THREE.Group();
    this._mateMarkers.name = 'mate-markers';
    this.bodyRenderer.scene.add(this._mateMarkers);
    this._applySnap(useEditorStore.getState().snap);
    this._unsubEditor = useEditorStore.subscribe((s) => {
      this._ikDrag = s.ikDrag;
      if (!s.ikDrag && this._ikActive) this._endIK();
      this._applySnap(s.snap);
      this._handleSim(s.simRunning);
      // Live gravity updates while the sim is running.
      if (this._sim) this._sim.setGravity(s.gravityEnabled ? s.gravity : 0);
      if (s.mateMode !== this._mateMode) {
        this._mateMode = s.mateMode;
        this._clearMate(); // reset picks/markers when entering or leaving mate mode
        if (!s.mateMode) this._snapIndicator?.hide();
      }
      if (s.showAnalysis !== this._showAnalysis) {
        this._showAnalysis = s.showAnalysis;
        if (!s.showAnalysis && this._doc) this.bodyRenderer.clearStress(this._doc);
        if (this._doc) this._syncModel(this._doc);
      }
    });

    // Mesh Edit Mode (Blender-style) — owns its own gizmo/overlay; this editor
    // steps aside (no body gizmo/picking) whenever it's active.
    this._scene = scene;
    this.editMode = new EditModeController({
      scene, camera, controls, domElement, bodyRenderer: this.bodyRenderer,
    });
    // Re-run selection logic when Edit Mode toggles so the body gizmo detaches on
    // enter and re-attaches on exit.
    this._unsubEdit = useEditModeStore.subscribe(() => this._onSelection(useSelectionStore.getState()));

    // Initial paint.
    this._syncModel(useModelStore.getState().doc);
    this._onSelection(useSelectionStore.getState());
  }

  _syncModel(doc: any) {
    this._doc = doc;
    this._fk = computeFK(doc);
    this.bodyRenderer.sync(doc, this._fk);
    const loads = this._showAnalysis ? jointLoads(doc, this._fk) : null;
    this.jointRenderer.sync(doc, this._fk, loads);
    if (this._showAnalysis && loads) this.bodyRenderer.applyStress(bodyStressField(doc, this._fk, loads));
    this._updateCOM(doc);
    this._reattach(); // mesh may have been (re)created
    if (this.editMode?.active) this.editMode.onModelSynced();
  }

  _updateCOM(doc: any) {
    if (!this._showAnalysis || Object.keys(doc.bodies).length === 0) {
      if (this._comMarker) this._comMarker.visible = false;
      return;
    }
    if (!this._comMarker) {
      this._comMarker = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 12), // unit sphere; scaled to the model below
        new THREE.MeshBasicMaterial({ color: 0x00e0ff, depthTest: false, transparent: true, opacity: 0.9 }),
      );
      this._comMarker.renderOrder = 1001;
      this.bodyRenderer.scene.add(this._comMarker);
    }
    // Size the marker to the model so it doesn't dwarf a small desktop arm.
    const pts: any[] = [];
    for (const w of this._fk.values()) if (w?.position) pts.push(new THREE.Vector3(...w.position));
    const L = pts.length ? (new THREE.Box3().setFromPoints(pts).getSize(new THREE.Vector3()).length() || 1) : 1;
    const r = Math.min(Math.max(L * 0.025, 0.01), 0.12);
    const { com } = centerOfMass(doc, this._fk);
    this._comMarker.scale.setScalar(r);
    this._comMarker.position.set(com[0], com[1], com[2]);
    this._comMarker.visible = true;
  }

  // ── Physics (Phase 7) ──────────────────────────────────────────────────────
  _handleSim(running: any) {
    if (running && !this._sim && !this._startingSim) this._startSim();
    else if (!running && (this._sim || this._startingSim)) this._stopSim();
  }

  /**
   * Convex-hull vertices for a mesh body, from its edited mesh or parsed asset geometry,
   * so the physics sim uses a tight hull collider instead of a bounding box. Cached per
   * sim start. Returns null for non-mesh bodies (they use their primitive collider).
   */
  _meshHullPoints(id: string): Float32Array | null {
    const body: any = this._doc.bodies[id];
    const g = body?.visual?.geometry;
    if (!g || g.type !== GeometryType.MESH) return null;
    this._hullCache ??= new Map<string, Float32Array | null>();
    if (this._hullCache.has(id)) return this._hullCache.get(id)!;

    let positions: ArrayLike<number> | null = g.editMesh?.positions?.length ? g.editMesh.positions : null;
    if (!positions) {
      const assetId = g.assetId ?? body.assetId;
      const asset = assetId ? this._doc.assets?.[assetId] : null;
      const obj = asset ? getAssetObject(asset) : null;
      const pts: number[] = [];
      obj?.traverse?.((o: any) => {
        const p = o.isMesh && o.geometry?.attributes?.position;
        if (p) for (let i = 0; i < p.count; i++) pts.push(p.getX(i), p.getY(i), p.getZ(i));
      });
      positions = pts.length ? pts : null;
    }
    const hull = positions ? convexHullPoints(positions) : null;
    this._hullCache.set(id, hull);
    return hull;
  }

  _startSim() {
    this._hullCache = null; // recompute hulls per run (geometry may have changed)
    this._startingSim = true;
    this._attachTo(null); // can't edit while simulating
    const e = useEditorStore.getState();
    import('@/viewport/PhysicsSim')
      .then(({ PhysicsSim }) =>
        PhysicsSim.create(this._doc, this._fk, {
          gravity: e.gravityEnabled ? e.gravity : 0,
          hullPoints: (id: string) => this._meshHullPoints(id),
        }))
      .then((sim) => {
        if (!this._startingSim) { sim.dispose(); return; } // stopped before ready
        this._sim = sim;
        physicsBridge.sim = sim; // expose for live motor-target commands
        this._startingSim = false;
      })
      .catch((err) => { console.warn('PhysicsSim failed:', err); this._startingSim = false; });
  }

  _stopSim() {
    this._startingSim = false;
    this._lastSimTime = 0;
    physicsBridge.sim = null;
    if (this._sim) { this._sim.dispose(); this._sim = null; }
    this._syncModel(this._doc); // restore FK pose
    this._onSelection(useSelectionStore.getState());
  }

  /** Called every render frame by SimCanvas: physics sim, else animation preview. */
  tick() {
    // Always call: when active it syncs the overlay; when inactive it tears down
    // any lingering overlay (defensive against a missed enter/leave transition).
    this.editMode?.syncTransform();
    if (this._sim) {
      // Advance by real elapsed time at a FIXED internal timestep, so the simulation
      // runs at the same speed and produces the same trajectory on any frame rate.
      const now = performance.now();
      const dt = this._lastSimTime ? (now - this._lastSimTime) / 1000 : 1 / 60;
      this._lastSimTime = now;
      this._sim.stepFor(dt);
      const poses = this._sim.poses();
      this.bodyRenderer.sync(this._doc, poses);
      this.jointRenderer.sync(this._doc, poses);
      if (this._showAnalysis) this.bodyRenderer.applyStress(bodyStressField(this._doc, poses));
      return;
    }

    const anim = useAnimationStore.getState();
    if (anim.preview) {
      if (anim.playing) {
        // Advance by REAL elapsed time so a 4 s clip takes 4 s regardless of frame
        // rate (was a fixed 1/60 step → slow on heavy scenes).
        const now = performance.now();
        const dt = this._lastAnimTime ? Math.min(0.1, (now - this._lastAnimTime) / 1000) : 1 / 60;
        this._lastAnimTime = now;
        anim.advance(dt);
      } else {
        this._lastAnimTime = 0;
      }
      // Drive the pose from the clip ONLY while actually playing or when the
      // playhead just moved (scrub). When paused on a frame we leave the model
      // alone, so live edits (IK drag, gizmo) are visible and can be keyframed —
      // otherwise the clip sample would overwrite them every frame. Samples are
      // written into the doc (transient) so render + analysis stay in sync.
      if (anim.playing || anim.playhead !== this._lastPlayhead) {
        this._lastPlayhead = anim.playhead;
        const values = anim.sample(anim.playhead);
        if (Object.keys(values).length) {
          useModelStore.getState().applyTransient((d: any) => this._withJointValues(d, values));
          // The model-store subscription runs _syncModel → renders & analyses the doc.
        }
      }
      this._animActive = true;
    } else if (this._animActive) {
      this._animActive = false;
      this._lastPlayhead = -1;
      this._lastAnimTime = 0;
      this._syncModel(this._doc); // restore model pose
    }
  }

  _fkWithOverrides(doc: Document, values: any) {
    const joints: Record<string, any> = {};
    for (const [id, j] of Object.entries(doc.joints)) {
      joints[id] = id in values ? { ...j, state: { ...j.state, value: values[id] } } : j;
    }
    return computeFK({ ...doc, joints });
  }

  /** Immutable doc with the given joint values applied (for animation playback). */
  _withJointValues(doc: Document, values: any) {
    const joints: Record<string, any> = { ...doc.joints };
    let changed = false;
    for (const [id, v] of Object.entries(values)) {
      const j = joints[id];
      if (!j) continue;
      joints[id] = { ...j, state: { ...j.state, value: v } };
      changed = true;
    }
    return changed ? { ...doc, joints } : doc;
  }

  _applySnap(snap: any) {
    const t = this.transform;
    if (snap?.enabled) {
      t.setTranslationSnap(snap.translate);
      t.setRotationSnap((snap.rotateDeg * Math.PI) / 180);
      t.setScaleSnap?.(snap.scale);
    } else {
      t.setTranslationSnap(null);
      t.setRotationSnap(null);
      t.setScaleSnap?.(null);
    }
  }

  _ndc(e: any) {
    const rect = this.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  // ── Drag-from-tip IK ─────────────────────────────────────────────────────
  // Grab any body that sits on a movable chain and pull it toward the cursor by
  // solving the joints from that body up to its root. The drag happens on a plane
  // through the grabbed point, facing the camera, so motion feels 1:1.
  _tryStartIK(e: any) {
    if (this.transform.dragging) return;
    const hitId = this.bodyRenderer.pickBodyAt(this._ndc(e), this.camera);
    if (!hitId || !this._doc) return;
    if (chainJoints(this._doc, hitId).length === 0) return; // not articulated → let normal click handle it
    const w = this._fk?.get(hitId);
    const p = new THREE.Vector3(...(w?.position ?? [0, 0, 0]));
    const n = new THREE.Vector3();
    this.camera.getWorldDirection(n);
    this._ikPlane.setFromNormalAndCoplanarPoint(n, p);
    this._ikTip = hitId;
    this._ikActive = true;
    this.controls.enabled = false;
    this._attachTo(null); // no gizmo while pulling
  }

  _dragIK(e: any) {
    if (!this._ikTip || !this._doc) return;
    this._ikRay.setFromCamera(this._ndc(e), this.camera);
    const target = new THREE.Vector3();
    if (!this._ikRay.ray.intersectPlane(this._ikPlane, target)) return;
    const values = solveModelIK(this._doc, this._ikTip, [target.x, target.y, target.z]);
    if (values) useModelStore.getState().dispatch(commands.setJointValues(values));
  }

  _endIK() {
    this._ikActive = false;
    this._ikTip = null;
    this._downPos = null;
    this.controls.enabled = true;
  }

  _handlePick(e: any) {
    if (this.editMode?.active) { this._downPos = null; return; }
    if (e.button !== 0 || !this._downPos) return;
    // Axis modal: click to confirm
    if (this._modal?.active) { this._commitAxisModal(); this._downPos = null; return; }
    const moved = Math.hypot(e.clientX - this._downPos.x, e.clientY - this._downPos.y);
    this._downPos = null;
    if (moved > 4) return;                          // an orbit/drag, not a click
    // A gizmo handle interaction (drag OR a click on a handle) just ended — skip
    // this pick so it doesn't deselect. Note: we deliberately do NOT bail merely
    // because `transform.axis` is set, since the translate gizmo's invisible pick
    // planes are huge and would block click-to-deselect on genuinely empty space.
    // A gizmo DRAG that actually moved the part just ended — skip this pick so it
    // doesn't deselect. But a gizmo touch that changed nothing (a click that merely
    // grazed an invisible gizmo plane) falls through, so clicking empty space always
    // deselects instead of silently being swallowed.
    if (this.transform.dragging) { this._gizmoActive = false; this._gizmoChanged = false; return; }
    if (this._gizmoActive) {
      const realDrag = this._gizmoChanged;
      this._gizmoActive = false; this._gizmoChanged = false;
      if (realDrag) return;
      // no-op gizmo touch → continue to normal pick (deselect on empty space)
    }
    if (this._sim) return;                          // don't reselect mid-simulation

    const rect = this.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );

    if (this._mateMode) { this._handleMatePick(ndc); return; }

    const sel = useSelectionStore.getState();
    // A visible joint arrow takes priority — clicking it selects the joint (and the
    // Inspector auto-opens to its editor).
    const jointHit = this.jointRenderer.pickJointAt(ndc, this.camera);
    if (jointHit) {
      if (sel.kind === 'joint' && sel.selectedId === jointHit) {
        // Clicking the already-selected joint reveals its move gizmo (first time),
        // then deselects — so it's never "stuck" on.
        if (!sel.showGizmo) sel.revealGizmo(); else sel.clear();
      } else {
        sel.select(jointHit, 'joint');
      }
      return;
    }

    const additive = e.ctrlKey || e.metaKey || e.shiftKey;
    const hitId = this.bodyRenderer.pickBodyAt(ndc, this.camera);
    if (hitId) {
      if (additive) {
        sel.toggle(hitId, 'body'); // ctrl/shift-click → add or remove from the group
      } else if (sel.kind === 'body' && sel.selectedId === hitId && sel.ids.length === 1) {
        // Clicking the already-selected (sole) body again reveals its move gizmo.
        if (!sel.showGizmo) sel.revealGizmo();
      } else if (sel.kind === 'body' && sel.ids.includes(hitId)) {
        // Clicking a member of the multi-selection reveals the group gizmo.
        if (!sel.showGizmo) sel.revealGizmo(); else sel.select(hitId, 'body');
      } else {
        sel.select(hitId, 'body'); // first click → highlight + Properties, no gizmo yet
      }
    } else if (!additive && sel.selectedId) {
      sel.clear(); // clicked empty space → deselect, hiding gizmo + joint arrows
    }
  }

  // Double-click a body/joint in the viewport → open Properties (single click only
  // selects). Mirrors the Outliner's click/double-click split.
  _handleDblClick(e: any) {
    if (this.editMode?.active || this._sim || this._mateMode) return;
    const rect = this.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const sel = useSelectionStore.getState();
    // Double-clicking a part jumps to the Editor page with its Properties open.
    const toEditor = () => { usePageStore.getState().setPage('editor'); useDockStore.getState().open('inspector'); };
    const jointHit = this.jointRenderer.pickJointAt(ndc, this.camera);
    if (jointHit) { sel.select(jointHit, 'joint'); toEditor(); return; }
    const hitId = this.bodyRenderer.pickBodyAt(ndc, this.camera);
    if (hitId) { sel.select(hitId, 'body'); toEditor(); return; }
    // Double-click on empty 3D space → deselect everything (hides gizmo + joint arrows).
    if (sel.selectedId) sel.clear();
  }

  // ── Mate tool ───────────────────────────────────────────────────────────────
  // Pick a face on the part to keep fixed, then a face on the part to move; the
  // second part snaps flush onto the first (faces coincident, normals opposed).
  // Hover during mate mode → show the feature snap indicator (when magnet is on).
  _handleHover(e: any) {
    const rect = this.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this._lastNdc.copy(ndc);

    // Axis modal: route movement to the modal handler.
    if (this._modal?.active) { this._updateAxisModal(e); return; }

    if (!this.editMode?.active && !this._sim) {
      // Object-mode hover: subtle body highlight and snap indicator.
      const hitId = this.bodyRenderer.pickBodyAt(ndc, this.camera);
      if (hitId !== this._hoveredId) {
        this.bodyRenderer.setHovered(hitId);
        this._hoveredId = hitId;
      }
      const snap = computeSnap(ndc, this.camera, this.domElement, [this.bodyRenderer.group]);
      if (snap) this._snapIndicator.show(snap.point, snap.type); else this._snapIndicator.hide();
    }

    if (this._mateMode && useEditorStore.getState().snap?.enabled && !this.editMode?.active) {
      const snap = computeSnap(ndc, this.camera, this.domElement, [this.bodyRenderer.group]);
      if (snap) this._snapIndicator.show(snap.point, snap.type); else this._snapIndicator.hide();
    }

    if (!this._mateMode && (this.editMode?.active || this._sim)) {
      this._snapIndicator?.hide();
    }
  }

  _handleMatePick(ndc: any) {
    const face = this.bodyRenderer.pickFaceAt(ndc, this.camera);
    if (!face) return;
    // When snapping is on, refine the clicked point to the nearest vertex/edge.
    if (useEditorStore.getState().snap?.enabled) {
      const snap = computeSnap(ndc, this.camera, this.domElement, [this.bodyRenderer.group]);
      if (snap) face.point = snap.point.clone();
    }
    this._matePicks.push(face);
    this._addMateMarker(face.point);
    if (this._matePicks.length >= 2) {
      this._applyMate(this._matePicks[0], this._matePicks[1]);
      this._clearMate();
      useEditorStore.getState().setMatePick(0);
    } else {
      useEditorStore.getState().setMatePick(this._matePicks.length);
    }
  }

  _applyMate(a: any, b: any) {
    const doc = useModelStore.getState().doc;
    const body = doc.bodies[b.bodyId];
    if (!body || a.bodyId === b.bodyId) return;
    const pos = new THREE.Vector3(...body.transform.position);
    const quat = new THREE.Quaternion(...body.transform.quaternion);
    // Rotate body B so its face normal opposes A's, then translate so the clicked
    // points coincide → the faces sit flush.
    const q = new THREE.Quaternion().setFromUnitVectors(b.normal.clone().normalize(), a.normal.clone().negate());
    const newQuat = q.clone().multiply(quat);
    const v = b.point.clone().sub(pos).applyQuaternion(q);
    const newPos = a.point.clone().sub(v);
    useModelStore.getState().dispatch(commands.updateBody(b.bodyId, {
      transform: {
        ...body.transform,
        position: [newPos.x, newPos.y, newPos.z],
        quaternion: [newQuat.x, newQuat.y, newQuat.z, newQuat.w],
      },
    }));
  }

  _addMateMarker(p: any) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xffaa00, depthTest: false }),
    );
    m.renderOrder = 1002;
    m.position.copy(p);
    this._mateMarkers.add(m);
  }

  _clearMate() {
    this._matePicks = [];
    for (const c of [...this._mateMarkers.children]) {
      this._mateMarkers.remove(c);
      c.geometry?.dispose();
      c.material?.dispose();
    }
  }

  _onSelection(s: any) {
    const bodyId = s.kind === 'body' ? s.selectedId : null;
    const jointId = s.kind === 'joint' ? s.selectedId : null;
    const bodyIds: string[] = s.kind === 'body' ? (s.ids ?? []) : [];
    const multi = bodyIds.length > 1;
    // Joints are shown only when relevant: the selected joint, or any joint that
    // touches the selected body. Nothing selected → no joint arrows.
    const doc: Document = this._doc ?? useModelStore.getState().doc;
    const visible = new Set();
    for (const j of Object.values(doc.joints)) {
      if (j.id === jointId || (bodyId && (j.parentBodyId === bodyId || j.childBodyId === bodyId))) {
        visible.add(j.id);
      }
    }
    this.jointRenderer.setVisibleSet(visible);
    this.bodyRenderer.setSelectedIds(bodyIds, bodyId);
    this.jointRenderer.setSelected(jointId);
    this._multiIds = null;
    if (useEditModeStore.getState().active) {
      this._attachTo(null); // Edit Mode is on → no body/joint gizmo from this editor
    } else if (jointId) {
      // Joints support move + rotate of the pivot (scale is meaningless → translate).
      // Like bodies, the gizmo only appears once revealed (Move/Rotate toggle), so a
      // plain selection just shows the small axis arrow — not the move handles.
      this.transform.setMode(s.gizmoMode === 'rotate' ? 'rotate' : 'translate');
      this._attachTo(null);
      if (s.showGizmo) this._attachToJoint(jointId);
    } else if (multi) {
      if (s.gizmoMode) this.transform.setMode(s.gizmoMode);
      // One gizmo drives the whole group; it only appears once revealed.
      if (s.showGizmo) this._attachToMulti(bodyIds); else this._attachTo(null);
    } else {
      if (s.gizmoMode) this.transform.setMode(s.gizmoMode);
      // Body gizmo only appears once revealed (second click / Move-Rotate-Scale).
      this._attachTo(s.showGizmo ? bodyId : null);
    }
  }

  // ── Multi-body transform ────────────────────────────────────────────────────
  // A single gizmo attached to a proxy drives every selected body. The proxy sits
  // at the group pivot (median / active body); on drag we apply the proxy's delta
  // to each body. `pivotMode === 'individual'` rotates/scales each body about its
  // own origin instead of the shared pivot.
  _groupPivot(ids: string[], doc: Document) {
    const sel = useSelectionStore.getState();
    if (sel.pivotMode === 'active') {
      const a = doc.bodies[sel.selectedId as string];
      if (a) return new THREE.Vector3(...a.transform.position);
    }
    const c = new THREE.Vector3();
    let n = 0;
    for (const id of ids) {
      const b = doc.bodies[id];
      if (b) { c.add(new THREE.Vector3(...b.transform.position)); n++; }
    }
    if (n) c.multiplyScalar(1 / n);
    return c;
  }

  _attachToMulti(ids: string[]) {
    const doc: Document = this._doc ?? useModelStore.getState().doc;
    const live = ids.filter((id) => doc.bodies[id]);
    if (live.length < 2) { this._attachTo(live[0] ?? null); return; }
    this._multiIds = live;
    this._multiProxy ??= (() => {
      const o = new THREE.Object3D();
      o.name = 'multi-pivot-proxy';
      this._scene.add(o);
      return o;
    })();
    const pivot = this._groupPivot(live, doc);
    this._multiProxy.position.copy(pivot);
    this._multiProxy.quaternion.identity();
    this._multiProxy.scale.set(1, 1, 1);
    this._multiProxy.updateMatrixWorld(true);
    this._attachedId = null;
    this._attachedJointId = null;
    this.transform.attach(this._multiProxy);
    this.transform.enabled = true;
    this.transform.visible = true;
  }

  _beginMultiDrag() {
    const doc: Document = this._doc ?? useModelStore.getState().doc;
    this._multiProxy.updateMatrixWorld(true);
    this._multiStart = {
      proxyInv: this._multiProxy.matrixWorld.clone().invert(),
      pivot: this._multiProxy.position.clone(),
      bodies: this._multiIds
        .filter((id: string) => doc.bodies[id])
        .map((id: string) => {
          const t = doc.bodies[id].transform;
          return {
            id,
            pos: new THREE.Vector3(...t.position),
            quat: new THREE.Quaternion(...t.quaternion),
            scale: [...t.scale] as number[],
          };
        }),
    };
  }

  _applyMultiDrag() {
    if (!this._multiStart) return;
    const mode = useSelectionStore.getState().gizmoMode;
    const individual = useSelectionStore.getState().pivotMode === 'individual';
    this._multiProxy.updateMatrixWorld(true);
    const delta = this._multiProxy.matrixWorld.clone().multiply(this._multiStart.proxyInv);
    const dPos = new THREE.Vector3();
    const dQuat = new THREE.Quaternion();
    const dScale = new THREE.Vector3();
    delta.decompose(dPos, dQuat, dScale);
    const pivot = this._multiStart.pivot;

    for (const b of this._multiStart.bodies) {
      const mesh = this.bodyRenderer.getMesh(b.id);
      if (!mesh) continue;
      let pos = b.pos.clone();
      let quat = b.quat.clone();
      let scale = [...b.scale];
      if (mode === 'translate') {
        pos = b.pos.clone().add(dPos);
      } else if (mode === 'rotate') {
        quat = dQuat.clone().multiply(b.quat);
        if (!individual) pos = b.pos.clone().sub(pivot).applyQuaternion(dQuat).add(pivot);
      } else if (mode === 'scale') {
        scale = [b.scale[0] * dScale.x, b.scale[1] * dScale.y, b.scale[2] * dScale.z];
        if (!individual) pos = b.pos.clone().sub(pivot).multiply(dScale).add(pivot);
      }
      mesh.position.copy(pos);
      mesh.quaternion.copy(quat);
      mesh.scale.set(scale[0], scale[1], scale[2]);
      mesh.updateMatrixWorld(true);
      b._live = { pos, quat, scale };
    }
  }

  _commitMulti() {
    if (!this._multiStart) return;
    const dispatch = useModelStore.getState().dispatch;
    const doc: Document = this._doc ?? useModelStore.getState().doc;
    const patches: any[] = [];
    for (const b of this._multiStart.bodies) {
      const live = b._live;
      if (!live) continue;
      const body = doc.bodies[b.id];
      if (!body) continue;
      patches.push([b.id, {
        transform: {
          position: [live.pos.x, live.pos.y, live.pos.z],
          quaternion: [live.quat.x, live.quat.y, live.quat.z, live.quat.w],
          scale: live.scale,
        },
      }]);
    }
    this._multiStart = null;
    if (!patches.length) return;
    // One undoable step for the whole group.
    if (commands.updateBodies) {
      dispatch(commands.updateBodies(patches));
    } else {
      for (const [id, patch] of patches) dispatch(commands.updateBody(id, patch));
    }
    // Re-seat the proxy at the new group pivot.
    if (this._multiIds) this._attachToMulti(this._multiIds);
  }

  /** Place the proxy at the joint's pivot world transform and attach the gizmo. */
  _attachToJoint(jointId: any) {
    const doc: Document = this._doc ?? useModelStore.getState().doc;
    const joint = doc.joints[jointId];
    if (!joint || !joint.parentBodyId || !doc.bodies[joint.parentBodyId]) { this._attachTo(null); return; }
    const parentMat = this._fk?.get(joint.parentBodyId)?.matrix ?? mat(doc.bodies[joint.parentBodyId].transform);
    const origin = joint.origin ?? { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
    const oMat = new THREE.Matrix4().compose(
      new THREE.Vector3(...origin.position),
      new THREE.Quaternion(...origin.quaternion),
      new THREE.Vector3(1, 1, 1),
    );
    const world = parentMat.clone().multiply(oMat);
    world.decompose(this._jointProxy.position, this._jointProxy.quaternion, new THREE.Vector3());
    this._jointProxy.scale.set(1, 1, 1);
    this._jointProxy.updateMatrixWorld(true);
    this.transform.attach(this._jointProxy);
    this.transform.enabled = true;
    this.transform.visible = true;
    this._attachedId = null;
    this._attachedJointId = jointId;
  }

  _attachTo(bodyId: any) {
    this._attachedJointId = null;
    const mesh = bodyId ? this.bodyRenderer.getMesh(bodyId) : null;
    if (mesh) {
      this.transform.attach(mesh);
      this.transform.enabled = true;
      this.transform.visible = true;
      this._attachedId = bodyId;
    } else {
      this.transform.detach();
      this.transform.enabled = false;
      this.transform.visible = false;
      this._attachedId = null;
    }
  }

  // Re-attach after a doc sync if the selected mesh still exists.
  _reattach() {
    if (this.transform.dragging) return;
    const sel = useSelectionStore.getState();
    if (this._multiIds && sel.kind === 'body' && sel.showGizmo && (sel.ids?.length ?? 0) > 1) {
      this._attachToMulti(sel.ids); // keep the proxy at the (possibly moved) group pivot
      return;
    }
    if (sel.kind === 'body' && sel.selectedId) {
      if (!sel.showGizmo) return; // gizmo not revealed yet
      const mesh = this.bodyRenderer.getMesh(sel.selectedId);
      if (mesh && this.transform.object !== mesh) this.transform.attach(mesh);
    } else if (sel.kind === 'joint' && sel.selectedId) {
      // Keep the pivot proxy glued to the (possibly moved) joint pivot.
      this._attachToJoint(sel.selectedId);
    }
  }

  _commitTransform() {
    // Joint pivot drag → write back to the joint's origin (both bodies stay put).
    if (this._attachedJointId) {
      this._commitJointPivot();
      return;
    }
    const mesh = this.transform.object;
    if (!mesh || !this._attachedId) return;
    const doc: Document = this._doc ?? useModelStore.getState().doc;
    const dispatch = useModelStore.getState().dispatch;
    const childJoint = buildChildJointMap(doc);
    const joint = childJoint.get(this._attachedId);

    if (joint && doc.bodies[joint.parentBodyId]) {
      // Child of a joint: re-pose by editing the joint origin so it holds at the
      // current joint value (scale still belongs to the body).
      const parentMat = this._fk?.get(joint.parentBodyId)?.matrix ?? mat(doc.bodies[joint.parentBodyId].transform);
      const childMat = new THREE.Matrix4().compose(
        mesh.position.clone(), mesh.quaternion.clone(), new THREE.Vector3(1, 1, 1));
      const origin = originForChildWorld(parentMat, joint, childMat);
      dispatch(commands.updateJoint(joint.id, { origin }));
      const body = doc.bodies[this._attachedId];
      const sc = [mesh.scale.x, mesh.scale.y, mesh.scale.z];
      if (body && body.transform.scale.some((v, i) => Math.abs(v - sc[i]) > 1e-6)) {
        dispatch(commands.updateBody(this._attachedId, { transform: { ...body.transform, scale: sc } }));
      }
    } else {
      dispatch(commands.updateBody(this._attachedId, {
        transform: {
          position: [mesh.position.x, mesh.position.y, mesh.position.z],
          quaternion: [mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, mesh.quaternion.w],
          scale: [mesh.scale.x, mesh.scale.y, mesh.scale.z],
        },
      }));
    }
  }

  _commitJointPivot() {
    const doc: Document = this._doc ?? useModelStore.getState().doc;
    const joint = doc.joints[this._attachedJointId];
    if (!joint) return;
    const parentMat = this._fk?.get(joint.parentBodyId)?.matrix ?? mat(doc.bodies[joint.parentBodyId as string]?.transform);
    const world = new THREE.Matrix4().compose(
      this._jointProxy.position.clone(),
      this._jointProxy.quaternion.clone(),
      new THREE.Vector3(1, 1, 1),
    );
    const local = parentMat.clone().invert().multiply(world);
    const pos = new THREE.Vector3(), quat = new THREE.Quaternion();
    local.decompose(pos, quat, new THREE.Vector3());
    const newOrigin = {
      position: [pos.x, pos.y, pos.z],
      quaternion: [quat.x, quat.y, quat.z, quat.w],
    };
    const childRest = movePivotKeepingChild(joint, newOrigin);
    useModelStore.getState().dispatch(commands.updateJoint(joint.id, { origin: newOrigin, childRest }));
  }

  // ── Transform HUD ───────────────────────────────────────────────────────────

  _updateHud() {
    const snap = this._dragStartSnap;
    if (!snap || !this.transform.object) return;
    const obj = this.transform.object;
    const mode = this.transform.mode as string;
    let value = 0;
    if (mode === 'translate') {
      value = obj.position.distanceTo(snap.pos);
    } else if (mode === 'rotate') {
      const dq = obj.quaternion.clone().multiply(snap.quat.clone().invert());
      value = 2 * Math.acos(Math.min(1, Math.abs(dq.w))) * (180 / Math.PI);
    } else if (mode === 'scale') {
      value = obj.scale.length() / (snap.scale.length() || 1);
    }
    useTransformHudStore.getState().setLive(value);
  }

  // ── Axis modal transform ────────────────────────────────────────────────────
  // Keyboard-driven: press X/Y/Z while a body is selected → modal grab on that axis.
  // Type digits for exact offset (in mm); Enter = commit, Esc = cancel.

  startAxisModal(axis: 'x'|'y'|'z') {
    if (this.editMode?.active || this._sim) return;
    const bodyId = this._attachedId;
    if (!bodyId) return;
    const mesh = this.bodyRenderer.getMesh(bodyId);
    if (!mesh) return;

    const AXIS_COLORS: Record<string, number> = { x: 0xe05252, y: 0x52e070, z: 0x5280e0 };
    const axisVec = axis === 'x' ? new THREE.Vector3(1,0,0) : axis === 'y' ? new THREE.Vector3(0,1,0) : new THREE.Vector3(0,0,1);
    const origin = mesh.position.clone();

    // Axis line visual
    const points = [origin.clone().addScaledVector(axisVec, -20), origin.clone().addScaledVector(axisVec, 20)];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    this._axisLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: AXIS_COLORS[axis], depthTest: false, linewidth: 2 }));
    this._axisLine.renderOrder = 2000;
    this._scene.add(this._axisLine);

    // Disable standard gizmo so both don't fight
    this.transform.enabled = false;
    this.transform.visible = false;

    this._modal = {
      active: true, axis, axisVec,
      targetId: bodyId,
      startPos: origin.clone(),
      startT: this._axisParamAtNdc(this._lastNdc, origin, axisVec),
      liveT: 0,
      inputBuffer: '',
    };
    useTransformHudStore.getState().beginDrag('translate');
    useTransformHudStore.getState().setAxis(axis);
  }

  _axisParamAtNdc(ndc: THREE.Vector2, origin: THREE.Vector3, dir: THREE.Vector3): number {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    // Closest point on axis to camera ray (skew lines formula)
    const w = ray.ray.origin.clone().sub(origin);
    const b = ray.ray.direction.dot(dir);
    const denom = 1 - b * b; // d=1, e=1
    if (Math.abs(denom) < 1e-10) return 0;
    const a = ray.ray.direction.dot(w);
    const f = dir.dot(w);
    return (b * a - f) / denom;
  }

  _updateAxisModal(e: any) {
    if (!this._modal?.active) return;
    const m = this._modal;
    const rect = this.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const t = this._axisParamAtNdc(ndc, m.startPos, m.axisVec);
    m.liveT = t - m.startT;
    // Live preview: move the body mesh (not committed yet)
    const mesh = this.bodyRenderer.getMesh(m.targetId);
    if (mesh) {
      mesh.position.copy(m.startPos.clone().addScaledVector(m.axisVec, m.liveT));
      mesh.updateMatrixWorld(true);
    }
    useTransformHudStore.getState().setLive(Math.abs(m.liveT));
  }

  _commitAxisModal(exactMeters?: number) {
    if (!this._modal) return;
    const m = this._modal;
    const delta = exactMeters !== undefined ? exactMeters * Math.sign(m.liveT || 1) : m.liveT;
    const newPos = m.startPos.clone().addScaledVector(m.axisVec, delta);
    const doc: Document = this._doc ?? useModelStore.getState().doc;
    const body = doc.bodies[m.targetId];
    if (body) {
      useModelStore.getState().dispatch(commands.updateBody(m.targetId, {
        transform: { ...body.transform, position: [newPos.x, newPos.y, newPos.z] },
      }));
    }
    useTransformHudStore.getState().endDrag();
    this._cleanupModal();
  }

  _cancelAxisModal() {
    if (!this._modal) return;
    // Restore mesh to original position
    const mesh = this.bodyRenderer.getMesh(this._modal.targetId);
    if (mesh) { mesh.position.copy(this._modal.startPos); mesh.updateMatrixWorld(true); }
    useTransformHudStore.getState().hide();
    this._cleanupModal();
  }

  _cleanupModal() {
    if (this._axisLine) {
      this._scene.remove(this._axisLine);
      (this._axisLine as any).geometry?.dispose();
      (this._axisLine as any).material?.dispose();
      this._axisLine = null;
    }
    this._modal = null;
    // Re-enable gizmo
    const sel = useSelectionStore.getState();
    this.transform.enabled = !!sel.showGizmo;
    this.transform.visible = !!sel.showGizmo;
  }

  dispose() {
    this._cancelAxisModal();
    this.bodyRenderer.setHovered(null);
    this.editMode?.dispose();
    this._unsubEdit?.();
    this._unsubModel?.();
    this._unsubSel?.();
    this._unsubEditor?.();
    this.domElement?.removeEventListener('pointerdown', this._onPointerDown);
    this.domElement?.removeEventListener('pointerup', this._onPointerUp);
    this.domElement?.removeEventListener('pointermove', this._onPointerMove);
    this.domElement?.removeEventListener('dblclick', this._onDblClick);
    this._snapIndicator?.dispose();
    this._clearMate();
    this._mateMarkers?.parent?.remove(this._mateMarkers);
    this._sim?.dispose();
    this.transform.detach();
    this.transform.dispose?.();
    this.transform.parent?.remove(this.transform);
    this._jointProxy?.parent?.remove(this._jointProxy);
    this._multiProxy?.parent?.remove(this._multiProxy);
    this.bodyRenderer.dispose();
    this.jointRenderer.dispose();
    if (this._comMarker) { this._comMarker.geometry.dispose(); this._comMarker.material.dispose(); this._comMarker.parent?.remove(this._comMarker); }
  }
}