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
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { BodyRenderer } from '@/viewport/renderers/BodyRenderer';
import { JointRenderer } from '@/viewport/renderers/JointRenderer';
import { EditModeController } from '@/viewport/EditModeController';
import { useModelStore } from '@/state/modelStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useDockStore } from '@/state/dockStore';
import { useEditorStore } from '@/state/editorStore';
import { useEditModeStore } from '@/state/editModeStore';
import { useAnimationStore } from '@/state/animationStore';
import { commands } from '@/core/commands/index';
import { computeFK, buildChildJointMap, originForChildWorld, mat, movePivotKeepingChild } from '@/kinematics/modelFK';
import { computeSnap, SnapIndicator } from '@/viewport/Snapper';
import { stripNegativeTranslate } from '@/viewport/gizmoUtil';
import { jointLoads, centerOfMass } from '@/kinematics/analysis';
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
  constructor({ scene, camera, controls, domElement }) {
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

    // Don't let orbit fight the gizmo while dragging a handle.
    this.transform.addEventListener('dragging-changed', (e) => {
      controls.enabled = !e.value;
    });

    // Commit the gizmo's result to the model as an undoable command on release.
    this.transform.addEventListener('mouseUp', () => this._commitTransform());

    // Canvas click-picking: click a model body to select it (shows the gizmo),
    // click empty space to deselect (hides the gizmo). A small move threshold
    // means an orbit/drag never counts as a click.
    this.camera = camera;
    this.domElement = domElement;
    this._downPos = null;
    this._onPointerDown = (e) => { if (e.button === 0) this._downPos = { x: e.clientX, y: e.clientY }; };
    this._onPointerUp = (e) => this._handlePick(e);
    this._onPointerMove = (e) => this._handleHover(e);
    this._onDblClick = (e) => this._handleDblClick(e);
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
    this._showAnalysis = useEditorStore.getState().showAnalysis;
    this._mateMode = useEditorStore.getState().mateMode;
    this._matePicks = [];
    this._mateMarkers = new THREE.Group();
    this._mateMarkers.name = 'mate-markers';
    this.bodyRenderer.scene.add(this._mateMarkers);
    this._applySnap(useEditorStore.getState().snap);
    this._unsubEditor = useEditorStore.subscribe((s) => {
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

  _syncModel(doc) {
    this._doc = doc;
    this._fk = computeFK(doc);
    this.bodyRenderer.sync(doc, this._fk);
    const loads = this._showAnalysis ? jointLoads(doc, this._fk) : null;
    this.jointRenderer.sync(doc, this._fk, loads);
    this._updateCOM(doc);
    this._reattach(); // mesh may have been (re)created
    if (this.editMode?.active) this.editMode.onModelSynced();
  }

  _updateCOM(doc) {
    if (!this._showAnalysis || Object.keys(doc.bodies).length === 0) {
      if (this._comMarker) this._comMarker.visible = false;
      return;
    }
    if (!this._comMarker) {
      this._comMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0x00e0ff, depthTest: false, transparent: true, opacity: 0.9 }),
      );
      this._comMarker.renderOrder = 1001;
      this.bodyRenderer.scene.add(this._comMarker);
    }
    const { com } = centerOfMass(doc, this._fk);
    this._comMarker.position.set(com[0], com[1], com[2]);
    this._comMarker.visible = true;
  }

  // ── Physics (Phase 7) ──────────────────────────────────────────────────────
  _handleSim(running) {
    if (running && !this._sim && !this._startingSim) this._startSim();
    else if (!running && (this._sim || this._startingSim)) this._stopSim();
  }

  _startSim() {
    this._startingSim = true;
    this._attachTo(null); // can't edit while simulating
    const e = useEditorStore.getState();
    import('@/viewport/PhysicsSim')
      .then(({ PhysicsSim }) =>
        PhysicsSim.create(this._doc, this._fk, { gravity: e.gravityEnabled ? e.gravity : 0 }))
      .then((sim) => {
        if (!this._startingSim) { sim.dispose(); return; } // stopped before ready
        this._sim = sim;
        this._startingSim = false;
      })
      .catch((err) => { console.warn('PhysicsSim failed:', err); this._startingSim = false; });
  }

  _stopSim() {
    this._startingSim = false;
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
      this._sim.step();
      const poses = this._sim.poses();
      this.bodyRenderer.sync(this._doc, poses);
      this.jointRenderer.sync(this._doc, poses);
      return;
    }

    const anim = useAnimationStore.getState();
    if (anim.preview) {
      if (anim.playing) anim.advance(1 / 60);
      const values = anim.sample(anim.playhead);
      const fk = this._fkWithOverrides(this._doc, values);
      this.bodyRenderer.sync(this._doc, fk);
      this.jointRenderer.sync(this._doc, fk);
      this._animActive = true;
    } else if (this._animActive) {
      this._animActive = false;
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

  _applySnap(snap) {
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

  _handlePick(e) {
    if (this.editMode?.active) { this._downPos = null; return; } // Edit Mode owns picking
    if (e.button !== 0 || !this._downPos) return;
    const moved = Math.hypot(e.clientX - this._downPos.x, e.clientY - this._downPos.y);
    this._downPos = null;
    if (moved > 4) return;                          // an orbit/drag, not a click
    if (this.transform.dragging || this.transform.axis) return; // gizmo interaction
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
      if (!(sel.kind === 'joint' && sel.selectedId === jointHit)) sel.select(jointHit, 'joint');
      return;
    }

    const hitId = this.bodyRenderer.pickBodyAt(ndc, this.camera);
    if (hitId) {
      if (sel.kind === 'body' && sel.selectedId === hitId) {
        // Clicking the already-selected body again reveals its move gizmo.
        if (!sel.showGizmo) sel.revealGizmo();
      } else {
        sel.select(hitId, 'body'); // first click → highlight + Properties, no gizmo yet
      }
    } else if (sel.selectedId) {
      sel.clear(); // clicked empty space → deselect, hiding gizmo + joint arrows
    }
  }

  // Double-click a body/joint in the viewport → open Properties (single click only
  // selects). Mirrors the Outliner's click/double-click split.
  _handleDblClick(e) {
    if (this.editMode?.active || this._sim || this._mateMode) return;
    const rect = this.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const sel = useSelectionStore.getState();
    const jointHit = this.jointRenderer.pickJointAt(ndc, this.camera);
    if (jointHit) { sel.select(jointHit, 'joint'); useDockStore.getState().open('inspector'); return; }
    const hitId = this.bodyRenderer.pickBodyAt(ndc, this.camera);
    if (hitId) { sel.select(hitId, 'body'); useDockStore.getState().open('inspector'); }
  }

  // ── Mate tool ───────────────────────────────────────────────────────────────
  // Pick a face on the part to keep fixed, then a face on the part to move; the
  // second part snaps flush onto the first (faces coincident, normals opposed).
  // Hover during mate mode → show the feature snap indicator (when magnet is on).
  _handleHover(e) {
    if (!this._mateMode || !useEditorStore.getState().snap?.enabled || this.editMode?.active) {
      this._snapIndicator?.hide();
      return;
    }
    const rect = this.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const snap = computeSnap(ndc, this.camera, this.domElement, [this.bodyRenderer.group]);
    if (snap) this._snapIndicator.show(snap.point, snap.type); else this._snapIndicator.hide();
  }

  _handleMatePick(ndc) {
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

  _applyMate(a, b) {
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

  _addMateMarker(p) {
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

  _onSelection(s) {
    const bodyId = s.kind === 'body' ? s.selectedId : null;
    const jointId = s.kind === 'joint' ? s.selectedId : null;
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
    this.bodyRenderer.setSelected(bodyId);
    this.jointRenderer.setSelected(jointId);
    if (useEditModeStore.getState().active) {
      this._attachTo(null); // Edit Mode is on → no body/joint gizmo from this editor
    } else if (jointId) {
      // Joints support move + rotate of the pivot (scale is meaningless → translate).
      this.transform.setMode(s.gizmoMode === 'rotate' ? 'rotate' : 'translate');
      this._attachToJoint(jointId);
    } else {
      if (s.gizmoMode) this.transform.setMode(s.gizmoMode);
      // Body gizmo only appears once revealed (second click / Move-Rotate-Scale).
      this._attachTo(s.showGizmo ? bodyId : null);
    }
  }

  /** Place the proxy at the joint's pivot world transform and attach the gizmo. */
  _attachToJoint(jointId) {
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

  _attachTo(bodyId) {
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
    const parentMat = this._fk?.get(joint.parentBodyId)?.matrix ?? mat(doc.bodies[joint.parentBodyId].transform);
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

  dispose() {
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
    this.bodyRenderer.dispose();
    this.jointRenderer.dispose();
    if (this._comMarker) { this._comMarker.geometry.dispose(); this._comMarker.material.dispose(); this._comMarker.parent?.remove(this._comMarker); }
  }
}