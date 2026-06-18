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
import { commands } from '@/core/commands/index.js';
import { computeFK, buildChildJointMap, originForChildWorld, mat } from '@/kinematics/modelFK.js';

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

    // React to model + selection changes.
    this._unsubModel = useModelStore.subscribe((s) => this._syncModel(s.doc));
    this._unsubSel = useSelectionStore.subscribe((s) => this._onSelection(s));

    // Gizmo snapping (Phase 3).
    this._applySnap(useEditorStore.getState().snap);
    this._unsubSnap = useEditorStore.subscribe((s) => this._applySnap(s.snap));

    // Initial paint.
    this._syncModel(useModelStore.getState().doc);
    this._onSelection(useSelectionStore.getState());
  }

  _syncModel(doc) {
    this._doc = doc;
    this._fk = computeFK(doc);
    this.bodyRenderer.sync(doc, this._fk);
    this.jointRenderer.sync(doc, this._fk);
    this._reattach(); // mesh may have been (re)created
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
    this._unsubSnap?.();
    this.transform.detach();
    this.transform.dispose?.();
    this.transform.parent?.remove(this.transform);
    this.bodyRenderer.dispose();
    this.jointRenderer.dispose();
  }
}
