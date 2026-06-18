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
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { BodyRenderer } from '@/viewport/renderers/BodyRenderer.js';
import { JointRenderer } from '@/viewport/renderers/JointRenderer.js';
import { useModelStore } from '@/state/modelStore.js';
import { useSelectionStore } from '@/state/selectionStore.js';
import { useEditorStore } from '@/state/editorStore.js';
import { commands } from '@/core/commands/index.js';

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
    this._unsubModel = useModelStore.subscribe((s) => {
      this.bodyRenderer.sync(s.doc);
      this.jointRenderer.sync(s.doc);
      this._reattach(); // mesh may have been (re)created
    });
    this._unsubSel = useSelectionStore.subscribe((s) => this._onSelection(s));

    // Gizmo snapping (Phase 3).
    this._applySnap(useEditorStore.getState().snap);
    this._unsubSnap = useEditorStore.subscribe((s) => this._applySnap(s.snap));

    // Initial paint.
    this.bodyRenderer.sync(useModelStore.getState().doc);
    this.jointRenderer.sync(useModelStore.getState().doc);
    this._onSelection(useSelectionStore.getState());
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
    const transform = {
      position: [mesh.position.x, mesh.position.y, mesh.position.z],
      quaternion: [mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, mesh.quaternion.w],
      scale: [mesh.scale.x, mesh.scale.y, mesh.scale.z],
    };
    useModelStore.getState().dispatch(commands.updateBody(this._attachedId, { transform }));
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
