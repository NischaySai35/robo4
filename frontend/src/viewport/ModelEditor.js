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
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { BodyRenderer } from '@/viewport/renderers/BodyRenderer.js';
import { JointRenderer } from '@/viewport/renderers/JointRenderer.js';
import { useModelStore } from '@/state/modelStore.js';
import { useSelectionStore } from '@/state/selectionStore.js';
import { useEditorStore } from '@/state/editorStore.js';
import { useAnimationStore } from '@/state/animationStore.js';
import { commands } from '@/core/commands/index.js';
import { computeFK, buildChildJointMap, originForChildWorld, mat } from '@/kinematics/modelFK.js';
import { jointLoads, centerOfMass } from '@/kinematics/analysis.js';
// PhysicsSim (and the heavy Rapier WASM it pulls in) is loaded lazily on first
// Play, so it stays out of the initial bundle and the app starts up fast.

export class ModelEditor {
  constructor({ scene, camera, controls, domElement }) {
    this.controls = controls;
    this.bodyRenderer = new BodyRenderer(scene);
    this.jointRenderer = new JointRenderer(scene);

    this.transform = new TransformControls(camera, domElement);
    this.transform.setSize(0.8);
    this.transform.enabled = false;
    this.transform.visible = false;
    scene.add(this.transform);

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
    domElement.addEventListener('pointerdown', this._onPointerDown);
    domElement.addEventListener('pointerup', this._onPointerUp);

    // React to model + selection changes.
    this._unsubModel = useModelStore.subscribe((s) => this._syncModel(s.doc));
    this._unsubSel = useSelectionStore.subscribe((s) => this._onSelection(s));

    // Gizmo snapping (Phase 3) + physics sim (Phase 7).
    this._sim = null;
    this._startingSim = false;
    this._showAnalysis = useEditorStore.getState().showAnalysis;
    this._applySnap(useEditorStore.getState().snap);
    this._unsubEditor = useEditorStore.subscribe((s) => {
      this._applySnap(s.snap);
      this._handleSim(s.simRunning);
      // Live gravity updates while the sim is running.
      if (this._sim) this._sim.setGravity(s.gravityEnabled ? s.gravity : 0);
      if (s.showAnalysis !== this._showAnalysis) {
        this._showAnalysis = s.showAnalysis;
        if (this._doc) this._syncModel(this._doc);
      }
    });

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
    import('@/viewport/PhysicsSim.js')
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

  _fkWithOverrides(doc, values) {
    const joints = {};
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
    const hitId = this.bodyRenderer.pickBodyAt(ndc, this.camera);
    const sel = useSelectionStore.getState();
    if (hitId) {
      if (!(sel.kind === 'body' && sel.selectedId === hitId)) sel.select(hitId, 'body');
    } else if (sel.kind === 'body') {
      sel.clear(); // clicked empty space → hide the gizmo
    }
  }

  _onSelection(s) {
    const bodyId = s.kind === 'body' ? s.selectedId : null;
    const jointId = s.kind === 'joint' ? s.selectedId : null;
    this.bodyRenderer.setSelected(bodyId);
    this.jointRenderer.setSelected(jointId);
    if (s.gizmoMode) this.transform.setMode(s.gizmoMode);
    this._attachTo(bodyId);
  }

  _attachTo(bodyId) {
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
    const sel = useSelectionStore.getState();
    if (sel.kind === 'body' && sel.selectedId && !this.transform.dragging) {
      const mesh = this.bodyRenderer.getMesh(sel.selectedId);
      if (mesh && this.transform.object !== mesh) this.transform.attach(mesh);
    }
  }

  _commitTransform() {
    const mesh = this.transform.object;
    if (!mesh || !this._attachedId) return;
    const doc = this._doc ?? useModelStore.getState().doc;
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

  dispose() {
    this._unsubModel?.();
    this._unsubSel?.();
    this._unsubEditor?.();
    this.domElement?.removeEventListener('pointerdown', this._onPointerDown);
    this.domElement?.removeEventListener('pointerup', this._onPointerUp);
    this._sim?.dispose();
    this.transform.detach();
    this.transform.dispose?.();
    this.transform.parent?.remove(this.transform);
    this.bodyRenderer.dispose();
    this.jointRenderer.dispose();
    if (this._comMarker) { this._comMarker.geometry.dispose(); this._comMarker.material.dispose(); this._comMarker.parent?.remove(this._comMarker); }
  }
}
