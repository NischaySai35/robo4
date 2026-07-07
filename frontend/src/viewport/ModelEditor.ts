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
import { ConnectorRenderer } from '@/viewport/renderers/ConnectorRenderer';
import { getConnectorWorld, hasLockLoop, solveDragWithLoops, debugWorstJoint } from '@/features/assembly/connectorSnap';
import { EditModeController } from '@/viewport/EditModeController';
import { useModelStore } from '@/state/modelStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useDockStore } from '@/state/dockStore';
import { usePageStore } from '@/state/pageStore';
import { useEditorStore } from '@/state/editorStore';
import { useEditModeStore } from '@/state/editModeStore';
import { useAnimationStore } from '@/state/animationStore';
import { stopAllSpins, getActiveSpins } from '@/features/motor/spinEngine';
import { canJointSpin } from '@/features/motor/spinFreedom';
import { DynamicSim } from '@/features/gravity/dynamicSim';
import { useAnimSceneStore } from '@/state/animSceneStore';
import { commands } from '@/core/commands/index';
import { computeFK, buildChildJointMap, originForChildWorld, mat, movePivotKeepingChild, setAnimRootOverride } from '@/kinematics/modelFK';
import { chainJoints, solveModelIK } from '@/kinematics/modelIK';
import { computeSnap, SnapIndicator } from '@/viewport/Snapper';
import { PivotPickTool } from '@/viewport/PivotPickTool';
import { hideGizmoVisuals, constantScreenSize } from '@/viewport/gizmoUtil';
import { useTransformHudStore } from '@/state/transformHudStore';
import { bridge } from '@/viewport/cameraBridge';
import { mateBridge, type MateAnimRequest } from '@/features/assembly/mateBridge';
import { useWorkspaceStore } from '@/state/workspaceStore';
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
    this.connectorRenderer = new ConnectorRenderer(scene);

    // Animated mating (approach → align → insert → latch). Panels request it via
    // mateBridge; we play it by driving the moved bodies' meshes directly, then
    // commit the real patches+joint at the end (see _startMateAnim/_tickMateAnim).
    this._mateAnim = null;
    mateBridge.play = (req: MateAnimRequest) => this._startMateAnim(req);
    bridge.orientSelectionAxis = (axis: 'x' | 'y' | 'z') => this._orientSelectionToAxis(axis);

    this.transform = new TransformControls(camera, domElement);
    this.transform.setSize(1.1);
    this.transform.enabled = false;
    this.transform.visible = false;
    // Hide the library gizmo's own arrows/rings/planes entirely and drive the
    // visuals from our constant-screen-size custom indicator below. This is what
    // removes the "two kinds of axes" double gizmo: the big constant-size
    // TransformControls handles used to draw ON TOP of the custom indicator.
    // The invisible pickers stay active (raycasting ignores visibility), so
    // dragging a handle still works exactly as before.
    hideGizmoVisuals(this.transform);
    // Tag the entire gizmo tree so getRendererStats() excludes its ~7K internal triangles
    this.transform.traverse((o: any) => { o.userData.isGizmo = true; });
    scene.add(this.transform);

    // Backup visual indicator: TransformControls' own arrows/rings have proven
    // unreliable to render in some scenes despite every visibility flag checking
    // out (enabled/visible/attached/mode all correct — see gizmoUtil.ts fixes).
    // ArrowHelper is the same simple primitive JointRenderer already uses
    // reliably, so draw a plain R/G/B indicator at the gizmo's pivot as a
    // guaranteed-visible stand-in for "where the handles are" while dragging
    // still goes through the (invisible-but-functional) TransformControls pickers.
    // Shape matches the active mode, same convention as the real gizmo: arrows
    // for translate, rings for rotate, boxes for scale.
    const AXES = ['x', 'y', 'z'] as const;
    const AXIS_DIR: Record<string, THREE.Vector3> = {
      x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1),
    };
    const AXIS_COLOR: Record<string, number> = { x: 0xff3333, y: 0x33ff33, z: 0x3388ff };
    const R = 0.16;
    this._moveIndicator = new THREE.Group();
    this._moveIndicator.name = 'move-indicator-fallback';
    this._moveIndicator.userData.isGizmo = true;

    this._moveIndicatorArrows = AXES.map((axis) => {
      const arrow = new THREE.ArrowHelper(AXIS_DIR[axis], new THREE.Vector3(), R + 0.02, AXIS_COLOR[axis], 0.07, 0.045);
      (arrow.line.material as THREE.LineBasicMaterial).depthTest = false;
      (arrow.cone.material as THREE.MeshBasicMaterial).depthTest = false;
      // renderOrder on the ArrowHelper wrapper itself does nothing — it has no
      // geometry of its own. The actually-drawn objects are its .line/.cone
      // children, which is why this needs setting here too (this was the bug:
      // arrows drew at the default order and got painted over by body meshes).
      arrow.line.renderOrder = 9999;
      arrow.cone.renderOrder = 9999;
      arrow.renderOrder = 9999;
      // (Previously a round Sprite "dot" sat at each arrow tip as a
      // camera-facing fallback for axes pointing at the camera — but it read as
      // an unwanted circle on the gizmo, so it's removed for clean arrows.)
      this._moveIndicator.add(arrow);
      return arrow;
    });

    this._moveIndicatorRings = AXES.map((axis) => {
      // A LineLoop circle, not a TorusGeometry mesh — meshes in this fallback
      // indicator have proven unreliable to render (same mystery as the real
      // TransformControls gizmo); plain Line/ArrowHelper primitives haven't.
      const N = 64;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * Math.PI * 2;
        const c = Math.cos(t) * R, s = Math.sin(t) * R;
        if (axis === 'x') pts.push(new THREE.Vector3(0, c, s));
        else if (axis === 'y') pts.push(new THREE.Vector3(c, 0, s));
        else pts.push(new THREE.Vector3(c, s, 0));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: AXIS_COLOR[axis], depthTest: false });
      const ring = new THREE.LineLoop(geo, mat);
      ring.renderOrder = 9999;
      this._moveIndicator.add(ring);
      return ring;
    });

    this._moveIndicatorBoxes = AXES.map((axis) => {
      const group = new THREE.Group();
      const tip = AXIS_DIR[axis].clone().multiplyScalar(R);
      const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), tip]);
      const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: AXIS_COLOR[axis], depthTest: false }));
      line.renderOrder = 9999;
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.045, 0.045),
        new THREE.MeshBasicMaterial({ color: AXIS_COLOR[axis], depthTest: false }),
      );
      box.position.copy(tip);
      box.renderOrder = 9999;
      group.add(line, box);
      this._moveIndicator.add(group);
      return group;
    });

    this._moveIndicator.traverse((o: any) => { o.frustumCulled = false; }); // same fix as the real gizmo (gizmoUtil.ts)
    // Keep the gizmo a constant size on screen (Blender/Fusion behavior) instead
    // of growing/shrinking with zoom. onBeforeRender only fires on drawn meshes,
    // never on the Group, so drive the rescale from every rendered child — for
    // any given mode at least one child is visible and rescales the whole group.
    // GIZMO_PX = on-screen radius in pixels; INDICATOR_UNIT = its world design radius.
    const GIZMO_PX = 64;
    const INDICATOR_UNIT = R + 0.02;
    this._moveIndicator.traverse((o: any) => {
      if (o.isMesh || o.isLine || o.isLineLoop) {
        constantScreenSize(o, this._moveIndicator, GIZMO_PX, INDICATOR_UNIT);
      }
    });
    this._moveIndicator.visible = false;
    scene.add(this._moveIndicator);
    this.transform.addEventListener('change', () => this._syncMoveIndicator());

    // Invisible proxy the gizmo attaches to when a JOINT is selected, so the joint
    // pivot gets its own 3-axis move/rotate handles (commit → joint origin).
    this._jointProxy = new THREE.Object3D();
    this._jointProxy.name = 'joint-pivot-proxy';
    scene.add(this._jointProxy);
    this._attachedJointId = null;

    // Same idea for a selected CONNECTOR: proxy's local +Z is defined to point
    // along the connector's outward normal, so rotate-mode intuitively re-aims it.
    this._connectorProxy = new THREE.Object3D();
    this._connectorProxy.name = 'connector-proxy';
    scene.add(this._connectorProxy);
    this._attachedConnector = null; // { bodyId, connectorId } | null

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
      if (this._ikDrag && !this.editMode?.active && !this._sim && !this._mateMode) {
        this._tryStartIK(e);
      } else if (this._shouldAnimIK() && !this.editMode?.active && !this._sim) {
        // Animation-page IK: gravity + rigid mode ON → drag active bodies through IK chain
        this._tryStartAnimIK(e);
      }
    };
    this._onPointerUp = (e: any) => { if (this._ikActive) { this._endIK(); return; } this._handlePick(e); };
    this._onPointerMove = (e: any) => { if (this._ikActive) { this._dragIK(e); return; } this._handleHover(e); };
    this._onDblClick = (e: any) => this._handleDblClick(e);
    domElement.addEventListener('pointerdown', this._onPointerDown);
    domElement.addEventListener('pointerup', this._onPointerUp);
    domElement.addEventListener('pointermove', this._onPointerMove);
    domElement.addEventListener('dblclick', this._onDblClick);
    // Right-click on a body: in rigid-mode editor set active body silently;
    // everywhere else open the viewport context menu.
    this._onContextMenu = (e: MouseEvent) => {
      const rect = domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const hitId = this.bodyRenderer.pickBodyAt(ndc, this.camera);
      if (!hitId) return; // missed all bodies — let browser show default menu
      e.preventDefault();
      const page = usePageStore.getState().page;
      // Always open the context menu — even in rigid mode. Rigid grounding is now an
      // explicit "Set as Active Body" button inside the menu (right-click used to
      // silently ground, which was confusing and hid the motor CW/CCW/Stop controls).
      useSelectionStore.getState().setVpCtxMenu({ x: e.clientX, y: e.clientY, bodyId: hitId, page });
    };
    domElement.addEventListener('contextmenu', this._onContextMenu);
    this._snapIndicator = new SnapIndicator(scene);

    // Joint pivot pick-to-place tool.
    this._pivotPickTool = new PivotPickTool({
      scene, camera, domElement,
      getMeshes: () => [this.bodyRenderer.group],
    });
    bridge.startPivotPick  = (opts: any) => this._pivotPickTool.start(opts.onPick, opts.onCancel);
    bridge.cancelPivotPick = ()          => this._pivotPickTool.stop();

    // React to model + selection changes.
    this._unsubModel = useModelStore.subscribe((s) => this._syncModel(s.doc));
    this._unsubSel = useSelectionStore.subscribe((s) => this._onSelection(s));
    // While gravity is ON, a USER edit (drag release, gizmo, shape/graph change — action
    // 'dispatch'/'undo'/'redo', NOT the sim's own 'transient' writes) rebuilds the physics sim
    // from the new state, so it reacts and tumbles from wherever you left it. Debounced.
    this._unsubBus = useModelStore.getState().bus.subscribe((e: any) => {
      if (!this._animGravityOn || !this._gravSim || this._gravSim === 'loading') return;
      if (e.action === 'transient' || e.action === 'reset') return;
      if (this._gravRebuildT) clearTimeout(this._gravRebuildT);
      this._gravRebuildT = setTimeout(() => { this._gravRebuildT = null; if (this._animGravityOn) this._runGravityTumble(true); }, 120);
    });

    // Recompute FK and update active-body highlight when body mode / active ID changes.
    this._unsubWorkspace = useWorkspaceStore.subscribe((s) => {
      this.bodyRenderer.setActiveBody(s.bodyMode === 'rigid' ? s.activeBodyId : null);
      if (this._doc) this._syncModel(this._doc);
    });

    // Gizmo snapping (Phase 3) + physics sim (Phase 7) + mate tool (assembly).
    this._sim = null;
    this._startingSim = false;
    this._physDebugOn = false; // physics collider wireframe overlay (debug only; FPS-heavy)
    this._lastPlayhead = -1; // last animation playhead we wrote into the doc
    this._showAnalysis = useEditorStore.getState().showAnalysis;
    this._analysisMode = useEditorStore.getState().analysisMode;
    this._showCollision = useEditorStore.getState().showCollision;
    this.bodyRenderer.setShowCollision(this._showCollision);
    this._mateMode = useEditorStore.getState().mateMode;
    this._matePicks = [];
    this._mateMarkers = new THREE.Group();
    this._mateMarkers.name = 'mate-markers';
    this.bodyRenderer.scene.add(this._mateMarkers);

    // Falling-box state
    this._fallingBoxes = false;
    this._boxGroup = new THREE.Group();
    this._boxGroup.name = 'falling-boxes';
    scene.add(this._boxGroup);
    this._boxMeshes = new Map<number, THREE.Mesh>(); // rapier handle → THREE mesh
    this._boxHalves = new Map<number, [number,number,number]>(); // handle → half-extents
    this._boxSpawnTimer = 0;
    this._boxBounds = null;

    this._applySnap(useEditorStore.getState().snap);
    this._unsubEditor = useEditorStore.subscribe((s) => {
      this._ikDrag = s.ikDrag;
      if (!s.ikDrag && this._ikActive) this._endIK();
      this._applySnap(s.snap);
      this._handleSim(s.simRunning);
      // Live gravity updates while the sim is running.
      if (this._sim) this._sim.setGravity(s.gravityEnabled ? s.gravity : 0);
      if (s.fallingBoxes !== this._fallingBoxes) {
        this._fallingBoxes = s.fallingBoxes;
        if (!s.fallingBoxes) this._stopBoxWorld();
        else this._startBoxWorld();
      }
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
      if (s.analysisMode !== this._analysisMode) {
        this._analysisMode = s.analysisMode;
        this._lastStressT = 0; // force an immediate recolour in the new mode
        if (this._showAnalysis && this._doc) this._syncModel(this._doc);
      }
      if (s.showCollision !== this._showCollision) {
        this._showCollision = s.showCollision;
        this.bodyRenderer.setShowCollision(s.showCollision);
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

    // Animation-page scene state (gravity CoM + IK drag).
    this._animGravityOn   = false;
    this._animRigidMode   = false;
    this._animActiveBodyIds = new Set<string>();
    this._unsubAnimScene = useAnimSceneStore.subscribe((s) => {
      const wasGravity = this._animGravityOn;
      this._animGravityOn    = s.gravityOn;
      this._animRigidMode    = s.rigidMode;
      this._animActiveBodyIds = s.activeBodyIds;
      if (this._doc) this._updateCOM(this._doc);
      // Gravity ON → tumble the robot to the floor (whole-body, shape preserved);
      // OFF → rise it back up (symmetric).
      if (!wasGravity && s.gravityOn) this._runGravityTumble();
      else if (wasGravity && !s.gravityOn) this._runGravityRise();
    });

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
    this.connectorRenderer.sync(doc, this._fk);
    // Recoloring the whole mesh (bodyStressField + applyStress uploads ~300K vertex
    // colors to the GPU) is far too heavy to run on every IK-drag frame — it drops
    // the app to a few FPS. Throttle it to ~12 Hz, with a trailing update so the
    // final pose is always coloured accurately once dragging settles.
    if (this._showAnalysis && loads) {
      const mode = useEditorStore.getState().analysisMode;
      const now = performance.now();
      if (!this._lastStressT || now - this._lastStressT >= 80) {
        this._lastStressT = now;
        this.bodyRenderer.applyStress(bodyStressField(doc, this._fk, loads, mode));
        if (this._stressTrail) { clearTimeout(this._stressTrail); this._stressTrail = null; }
      } else if (!this._stressTrail) {
        this._stressTrail = setTimeout(() => {
          this._stressTrail = null;
          if (this._showAnalysis && this._doc && this._fk) {
            this._lastStressT = performance.now();
            const l = jointLoads(this._doc, this._fk);
            this.bodyRenderer.applyStress(bodyStressField(this._doc, this._fk, l, useEditorStore.getState().analysisMode));
          }
        }, 90);
      }
    }
    this._updateCOM(doc);
    this._reattach(); // mesh may have been (re)created
    if (this.editMode?.active) this.editMode.onModelSynced();
    // Keep box-world collision geometry in sync whenever the arm moves
    if (this._boxWorld) this._boxWorld.updateRobotPose(this._fk);
    // Re-enable orbit after every model sync. If a gizmo drag was interrupted
    // (file open, undo, page switch) without a mouseUp, transform.dragging stays
    // stale-true and orbit would be stuck disabled — reset unconditionally here.
    // IK is the only active-drag exception: it modifies the doc on every frame
    // via applyTransient, so we must not fight it while it's running.
    if (!this._ikActive) {
      this.controls.enabled = true;
    }
  }

  _updateCOM(doc: any) {
    const showCom = this._showAnalysis || this._animGravityOn;
    if (!showCom || Object.keys(doc.bodies).length === 0) {
      if (this._comMarker) this._comMarker.visible = false;
      if (this._gravArrow) this._gravArrow.visible = false;
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
    // Gravity down-arrow — shown only when gravityOn is active.
    if (!this._gravArrow) {
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, depthTest: false, transparent: true, opacity: 0.8 });
      const shaft   = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 8), arrowMat);
      const head    = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.18, 8), arrowMat);
      shaft.position.y = -0.5;
      head.position.y  = -1.09;
      head.rotation.z  = Math.PI; // point downward
      const group = new THREE.Group();
      group.add(shaft); group.add(head);
      group.renderOrder = 1001;
      this._gravArrow = group;
      this.bodyRenderer.scene.add(this._gravArrow);
    }
    // Radius proportional to actual model bounding box (body mesh extents, not just
    // pivot positions). No hard upper cap — a 2m robot deserves a visible marker.
    const pts: any[] = [];
    const _pt = new THREE.Vector3();
    const _corner = new THREE.Vector3();
    for (const [bid, w] of this._fk.entries()) {
      if (!w?.position) continue;
      pts.push(new THREE.Vector3(w.position[0], w.position[1], w.position[2]));
      // Also push the corners of each body's geometry so large parts aren't ignored
      const body = doc.bodies[bid];
      const g = body?.visual?.geometry;
      const sc = body?.transform?.scale ?? [1,1,1];
      if (g?.type === 'box') {
        const hx = ((g.size?.[0] ?? 1) * Math.abs(sc[0])) / 2;
        const hy = ((g.size?.[1] ?? 1) * Math.abs(sc[1])) / 2;
        const hz = ((g.size?.[2] ?? 1) * Math.abs(sc[2])) / 2;
        _pt.set(w.position[0], w.position[1], w.position[2]);
        for (const sx of [-hx, hx]) for (const sy of [-hy, hy]) for (const sz of [-hz, hz])
          pts.push(_corner.set(sx, sy, sz).add(_pt).clone());
      } else if (g?.radius) {
        const rr = (g.radius ?? 0.5) * Math.max(Math.abs(sc[0]), Math.abs(sc[1]), Math.abs(sc[2]));
        _pt.set(w.position[0], w.position[1], w.position[2]);
        pts.push(new THREE.Vector3(_pt.x + rr, _pt.y, _pt.z));
        pts.push(new THREE.Vector3(_pt.x - rr, _pt.y, _pt.z));
        pts.push(new THREE.Vector3(_pt.x, _pt.y + rr, _pt.z));
      }
    }
    const _box3 = new THREE.Box3();
    const _size = new THREE.Vector3();
    const L = pts.length ? (_box3.setFromPoints(pts).getSize(_size).length() || 1) : 1;
    const r = Math.max(L * 0.022, 0.008); // 2.2% of full model diagonal, no hard cap
    const { com } = centerOfMass(doc, this._fk);
    this._comMarker.scale.setScalar(r);
    this._comMarker.position.set(com[0], com[1], com[2]);
    this._comMarker.visible = true;
    // Arrow: only show on the Animation page — don't bleed into Editor/Analysis
    const arrowScale = r * 3.5;
    this._gravArrow.position.set(com[0], com[1], com[2]);
    this._gravArrow.scale.setScalar(arrowScale);
    this._gravArrow.visible = this._animGravityOn && usePageStore.getState().page === 'animation';
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
    const positions = this._meshPositions(id);
    const hull = positions ? convexHullPoints(positions) : null;
    this._hullCache.set(id, hull);
    return hull;
  }

  /** ALL local mesh vertices (unscaled) for a mesh body — for computing a TRUE enclosing box
   *  (the convex hull is stride-decimated and can miss the exact lowest vertex → tiny floor poke;
   *  the raw AABB never does). Cached per sim run. Null for non-mesh bodies. */
  _meshPositions(id: string): Float32Array | null {
    const body: any = this._doc.bodies[id];
    const g = body?.visual?.geometry;
    if (!g || g.type !== GeometryType.MESH) return null;
    this._posCache ??= new Map<string, Float32Array | null>();
    if (this._posCache.has(id)) return this._posCache.get(id)!;
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
    const out = positions ? (positions instanceof Float32Array ? positions : new Float32Array(positions)) : null;
    this._posCache.set(id, out);
    return out;
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
    useEditorStore.getState().setFallingBoxes(false);
    physicsBridge.sim = null;
    if (this._sim) { this._sim.dispose(); this._sim = null; }
    this._syncModel(this._doc); // restore FK pose
    this._onSelection(useSelectionStore.getState());
  }

  // ── Box World (separate from the main physics sim) ─────────────────────────
  _startBoxWorld() {
    this._stopBoxWorld(); // clean up any previous
    this._boxBounds = null;
    this._boxSpawnTimer = 0;
    import('@/viewport/BoxWorld').then(({ BoxWorld }) =>
      BoxWorld.create(this._doc, this._fk ?? computeFK(this._doc)),
    ).then((bw: any) => {
      if (!this._fallingBoxes) { bw.dispose(); return; }
      this._boxWorld = bw;
    }).catch((e: any) => console.warn('BoxWorld failed:', e));
  }

  _stopBoxWorld() {
    if (this._boxWorld) { this._boxWorld.dispose(); this._boxWorld = null; }
    // Clear THREE.js visuals
    for (const mesh of this._boxMeshes.values()) {
      this._boxGroup.remove(mesh);
      mesh.geometry?.dispose();
      (mesh.material as any)?.dispose?.();
    }
    this._boxMeshes.clear();
    this._boxAges?.clear?.();
    this._boxSpawnTimer = 0;
  }

  _computeBoxBounds() {
    if (!this._doc) return null;
    const fk = this._fk ?? computeFK(this._doc);
    const pts: THREE.Vector3[] = [];
    for (const w of fk.values()) if (w?.position) pts.push(new THREE.Vector3(...w.position));
    if (!pts.length) return null;
    const box3 = new THREE.Box3().setFromPoints(pts);
    const size = box3.getSize(new THREE.Vector3());
    const center = box3.getCenter(new THREE.Vector3());
    const diag = Math.max(size.x, size.y, size.z, 0.1);
    // Box size: 3%–10% of model diagonal (not too huge, not invisible)
    // Spawn just above the model (0.3–0.8× diag overhead) over its footprint
    return {
      cx: center.x, cz: center.z,
      spawnH: box3.max.y + diag * 0.6,
      minR: diag * 0.03,
      maxR: diag * 0.10,
      footX: Math.max(size.x * 0.5, 0.05),
      footZ: Math.max(size.z * 0.5, 0.05),
      groundY: box3.min.y - 1.0,
    };
  }

  _tickFallingBoxes(dt: number) {
    if (!this._fallingBoxes || !this._boxWorld) return;

    if (!this._boxBounds) this._boxBounds = this._computeBoxBounds();
    const b = this._boxBounds as any;
    if (!b) return;

    this._boxWorld.stepFor(dt);

    // Spawn at ~1.2/s, cap at 20 live boxes
    this._boxSpawnTimer += dt;
    if (this._boxSpawnTimer >= 0.85 && this._boxMeshes.size < 20) {
      this._boxSpawnTimer = 0;
      const r  = b.minR + Math.random() * (b.maxR - b.minR);
      const hx = r * (0.6 + Math.random() * 0.8);
      const hy = r * (0.6 + Math.random() * 0.8);
      const hz = r * (0.6 + Math.random() * 0.8);
      const px = b.cx + (Math.random() - 0.5) * 2 * b.footX;
      const py = b.spawnH + Math.random() * b.minR * 4; // slight height variation
      const pz = b.cz + (Math.random() - 0.5) * 2 * b.footZ;
      const density = 300 + Math.random() * 1400; // 300–1700 kg/m³

      const handle = this._boxWorld.spawnBox([px, py, pz], [hx, hy, hz], density);
      const geo = new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2);
      const hue = Math.random() * 360;
      const mat3 = new THREE.MeshStandardMaterial({
        color: new THREE.Color(`hsl(${hue},75%,58%)`),
        metalness: 0.15, roughness: 0.65, opacity: 0.9, transparent: true,
      });
      const mesh = new THREE.Mesh(geo, mat3);
      this._boxGroup.add(mesh);
      this._boxMeshes.set(handle, mesh);
      this._boxAges ??= new Map<number, number>();
      this._boxAges.set(handle, 0);
    }

    const poses = this._boxWorld.boxPoses();
    this._boxAges ??= new Map<number, number>();
    const toRemove: number[] = [];

    for (const [handle, mesh] of this._boxMeshes) {
      const age = (this._boxAges.get(handle) ?? 0) + dt;
      this._boxAges.set(handle, age);
      const p = poses.get(handle);
      if (!p || p.pos[1] < b.groundY - 2 || age > 12) { toRemove.push(handle); continue; }
      mesh.position.set(...p.pos);
      mesh.quaternion.set(...p.quat);
    }
    for (const h of toRemove) {
      const mesh = this._boxMeshes.get(h);
      if (mesh) { this._boxGroup.remove(mesh); mesh.geometry?.dispose(); (mesh.material as any)?.dispose?.(); }
      this._boxMeshes.delete(h);
      this._boxAges.delete(h);
      this._boxWorld.removeBox(h);
    }
  }

  // ── Animated connector mating ─────────────────────────────────────────────────
  // Two phases sharing one precomputed goal (from computeSnapPatches / keyedMate-
  // Rotation): (1) approach+align — reach a pre-insertion pose held `gap` back
  // along the mating axis while slerping into the keyed rotation; (2) insert — a
  // straight slide down the axis into the seated pose; then latch (commit). The
  // meshes are driven directly (visual only); the doc changes once, at latch, so
  // this is a single undo step and never spams per-frame commands.
  _startMateAnim(req: MateAnimRequest) {
    const axis = new THREE.Vector3(...req.axis).normalize();
    const movedIds = new Set(req.bodies.map((b) => b.id));
    const bodies = req.bodies.map((b) => {
      const container = this.bodyRenderer.getMesh(b.id);
      if (!container) return null;
      const goalPos = new THREE.Vector3(...b.goalPos);
      return {
        container,
        startPos: container.position.clone(),
        startQuat: container.quaternion.clone(),
        preInsPos: goalPos.clone().addScaledVector(axis, req.gap), // backed off along the axis
        goalPos,
        goalQuat: new THREE.Quaternion(...b.goalQuat),
      };
    }).filter(Boolean);
    if (!bodies.length) { req.commit(); return; }

    // Obstacle AABBs = every body that ISN'T part of the moving module and isn't
    // the mate partner (the key is supposed to interlock with the partner). These
    // don't move during the mate, so snapshot them once.
    const ignore = new Set([...movedIds, ...(req.ignoreIds ?? [])]);
    const obstacles: { id: string; box: THREE.Box3 }[] = [];
    for (const id of Object.keys(this._doc?.bodies ?? {})) {
      if (ignore.has(id)) continue;
      const c = this.bodyRenderer.getMesh(id);
      if (c) obstacles.push({ id, box: new THREE.Box3().setFromObject(c) });
    }
    this._mateAnim = {
      bodies, t: 0, approachDur: 0.7, insertDur: 0.55,
      commit: req.commit, onBlocked: req.onBlocked, obstacles,
    };
  }

  // Deepest axis-overlap between two AABBs; ≤0 means they don't actually overlap.
  _aabbPenetration(a: THREE.Box3, b: THREE.Box3): number {
    const dx = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
    const dy = Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y);
    const dz = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
    return Math.min(dx, dy, dz);
  }

  _tickMateAnim(dt: number) {
    const m = this._mateAnim;
    if (!m) return;
    m.t += dt;
    const smooth = (x: number) => x * x * (3 - 2 * x); // smoothstep → slow-in/out
    const inApproach = m.t <= m.approachDur;
    for (const b of m.bodies) {
      if (inApproach) {
        const u = smooth(Math.min(1, m.t / m.approachDur));
        b.container.position.lerpVectors(b.startPos, b.preInsPos, u);
        b.container.quaternion.copy(b.startQuat).slerp(b.goalQuat, u);
      } else {
        const u = smooth(Math.min(1, (m.t - m.approachDur) / m.insertDur));
        b.container.position.lerpVectors(b.preInsPos, b.goalPos, u);
        b.container.quaternion.copy(b.goalQuat);
      }
    }

    // Collision guard — only during the insert slide (approach flies through open
    // space). A margin of 5mm ignores grazing/coplanar touches so packed modules
    // don't false-trigger; a deeper overlap means we'd ram an obstacle → abort.
    if (!inApproach && m.obstacles.length) {
      const MARGIN = 0.005;
      const _box = new THREE.Box3();
      for (const b of m.bodies) {
        _box.setFromObject(b.container);
        for (const obs of m.obstacles) {
          if (this._aabbPenetration(_box, obs.box) > MARGIN) {
            this._mateAnim = null;
            this._syncModel(this._doc); // restore meshes to their pre-mate doc pose
            m.onBlocked?.(obs.id);
            return;
          }
        }
      }
    }

    if (m.t >= m.approachDur + m.insertDur) {
      this._mateAnim = null;
      m.commit(); // write real patches + joint; normal sync snaps everything to final
    }
  }

  /** Called every render frame by SimCanvas: physics sim, else animation preview. */
  /** True if any body is pinned "super rigid" — the whole model then ignores gravity. */
  _hasSuperRigid(doc: Document): boolean {
    return Object.values(doc.bodies).some((b: any) => b?.meta?.superRigid);
  }

  /** Gravity ON: run the GENERAL dynamic sim — rigidly-connected bodies fuse into rigid clusters;
   *  Free joints sag/sway, Motor joints drive; real floor, gravity, friction. Non-destructive.
   *  Skipped when a body is super-rigid at the whole-model level (handled per-cluster inside). */
  _runGravityTumble(isRebuild = false) {
    const doc: Document = useModelStore.getState().doc; // freshest (rebuild fires from bus edits)
    if (Object.keys(doc.bodies).length === 0) return;
    const fk = computeFK(doc);
    // Remember the pre-fall transforms so turning gravity OFF rises back to them — only on the
    // FIRST gravity-on, not on rebuilds (rebuilds keep the original standing pose as the target).
    if (!isRebuild) {
      this._preGravityTransforms = Object.fromEntries(
        Object.entries(doc.bodies).map(([id, b]: any) => [id, { ...b.transform }]));
    }
    this._gravScales = Object.fromEntries(Object.entries(doc.bodies).map(([id, b]: any) => [id, [...b.transform.scale]]));
    this._gravStarts = []; // marker that a sim is active (poses come per-body from the sim)

    // Physics runs on a FLAT ground plane (like a Gazebo world's ground_plane). A bumpy heightfield
    // makes rigid bodies rock on the bumps and never settle → the perpetual shaking. The rough road
    // stays as a VISUAL only. Pass null so DynamicSim builds a flat floor at groundY.
    this._ensureTerrainFloor();
    const groundY = this._floorY ?? 0;
    this._posCache = null; // recompute mesh bounds per run (geometry may have changed)
    this._gravSim?.dispose();
    this._gravSim = 'loading';
    DynamicSim.create(doc as any, fk as any, groundY, (id: string) => this._meshPositions(id), null).then((sim) => {
      if (sim && this._animGravityOn) this._gravSim = sim;
      else { sim?.dispose(); if (this._gravSim === 'loading') this._gravSim = null; }
    }).catch((e) => { console.warn('gravity dynamic sim failed:', e); this._gravSim = null; });
  }

  /** Steps the dynamic sim each frame and writes every body's solved pose. Non-destructive
   *  (no undo commit) — turning gravity OFF rises back to the standing pose. Called from tick(). */
  _tickGravityTumble(dt: number) {
    const sim = this._gravSim;
    if (!sim || sim === 'loading' || !this._gravStarts) return;
    if (!this._animGravityOn) { this._endGravityTumble(false); return; }
    // Feed each motor joint its live spin command (rad/s).
    const spins = getActiveSpins();
    const jointsDoc: any = (this._doc ?? useModelStore.getState().doc).joints;
    const driveOf = (jid: string) => {
      const dir = (spins as any)[jid];
      if (!dir) return 0;
      const rpm = jointsDoc[jid]?.meta?.spinRpm ?? 30;
      return dir * rpm * Math.PI / 30;
    };
    const poses = sim.step(dt, driveOf) as Map<string, { position: number[]; quaternion: number[] }>;

    const vals: Record<string, any> = {};
    for (const [id, pose] of poses) {
      vals[id] = { position: pose.position, quaternion: pose.quaternion, scale: this._gravScales?.[id] ?? [1, 1, 1] };
    }
    this._gravLastVals = vals;
    useModelStore.getState().applyTransient((d: any) => {
      const jb: any = { ...d.bodies };
      for (const [id, v] of Object.entries(vals)) { const b = jb[id]; if (b) jb[id] = { ...b, transform: { ...b.transform, ...v } }; }
      return { ...d, bodies: jb };
    });
    this._updatePhysicsDebug(sim);
    this._penetrationReport();
  }

  /** DEBUG: count how many mesh vertices are below the floor (sampled) + the worst depth, so we
   *  have hard numbers on penetration. Logs to the console every ~20 frames while gravity is on. */
  _penetrationReport() {
    if (!this._physDebugOn) return;
    this._penFrame = (this._penFrame ?? 0) + 1;
    if (this._penFrame % 20 !== 0) return;
    const doc = this._doc ?? useModelStore.getState().doc;
    let minY = Infinity, count = 0, total = 0, worst = '';
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), sv = new THREE.Vector3();
    const M = new THREE.Matrix4();
    const floorY = this._floorY ?? 0;
    for (const [id, b] of Object.entries(doc.bodies) as any[]) {
      const verts = this._meshPositions(id); if (!verts) continue;
      const t = b.transform;
      M.compose(p.set(t.position[0], t.position[1], t.position[2]),
        q.set(t.quaternion[0], t.quaternion[1], t.quaternion[2], t.quaternion[3]),
        sv.set(t.scale[0], t.scale[1], t.scale[2]));
      for (let i = 0; i < verts.length; i += 60) { // sample every 20th vertex
        total++;
        p.set(verts[i], verts[i + 1], verts[i + 2]).applyMatrix4(M);
        if (p.y < floorY) { count++; if (p.y < minY) { minY = p.y; worst = id; } }
      }
    }
    const depth = isFinite(minY) ? ((floorY - minY) * 1000).toFixed(1) : '0';
    // eslint-disable-next-line no-console
    console.log(`[PEN] ${count}/${total} sampled verts below floor · max depth ${depth}mm · worst=${doc.bodies[worst]?.name ?? '-'}`);
  }

  /** DEBUG overlay: draw Rapier's actual collider wireframe (boxes, wheel cylinders, terrain) so
   *  we can SEE where the physics really is vs the visual mesh. Toggle with `_physDebugOn`. */
  _updatePhysicsDebug(sim: any) {
    if (!this._physDebugOn) { if (this._physDebug) this._physDebug.visible = false; return; }
    if (!this._physDebug) {
      this._physDebug = new THREE.LineSegments(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false }),
      );
      this._physDebug.renderOrder = 999;
      this._scene.add(this._physDebug);
    }
    const { vertices, colors } = sim.debugRender();
    const g = this._physDebug.geometry as THREE.BufferGeometry;
    g.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    g.attributes.position.needsUpdate = true;
    this._physDebug.visible = true;
  }

  _endGravityTumble(commit: boolean) {
    const sim = this._gravSim;
    if (sim && sim !== 'loading') sim.dispose();
    this._gravSim = null;
    if (this._physDebug) this._physDebug.visible = false; // hide the physics debug wireframe
    // Keep the terrain floor (it's persistent on the Animation page) — do NOT hide it here.
    if (commit && this._gravLastVals) {
      const doc: Document = this._doc ?? useModelStore.getState().doc;
      const patches: [string, any][] = Object.entries(this._gravLastVals).map(([id, v]) => [id, { transform: { ...doc.bodies[id].transform, ...(v as any) } }]);
      if (patches.length) useModelStore.getState().dispatch(commands.updateBodies(patches));
    }
    this._gravLastVals = null;
    this._gravStarts = null;
    this._driveWheelIds = null;
  }

  // ── Rough terrain floor — a PERSISTENT fixed rough road on the Animation page (gravity on OR
  //    off). The SAME terrain is used by the physics sim so what you see is what you collide with. ──
  _ensureTerrainFloor() {
    if (this._floor) return;
    const doc = this._doc ?? useModelStore.getState().doc;
    if (!doc || Object.keys(doc.bodies).length === 0) return;
    this.bodyRenderer.group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.bodyRenderer.group);
    if (box.isEmpty()) return;
    const sizeV = new THREE.Vector3(); box.getSize(sizeV);
    const span = Math.max(sizeV.x, sizeV.z, 0.2) * 8;
    this._floorY = box.min.y - this._gravityY - 0.01;
    // FLAT floor: rigid bodies settle dead-still on a flat surface (a rough one makes them rock
    // forever → the vibration + flickering penetration). Physics uses a flat cuboid (terrainTri
    // = null); wheels still grip via friction. A subtle grid shows where the ground is.
    this._terrainTri = null;
    const g = new THREE.Group();
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(span, span),
      new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 1, metalness: 0 }),
    );
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    const grid = new THREE.GridHelper(span, 48, 0x3a4a66, 0x28324a);
    g.add(plane); g.add(grid);
    g.position.y = this._floorY;
    this._scene.add(g);
    this._floor = g;
  }
  _hideFloor() {
    if (this._floor) {
      this._scene.remove(this._floor);
      (this._floor as any).geometry?.dispose?.();
      (this._floor as any).material?.dispose?.();
      this._floor = null;
    }
    this._terrain = null;
  }

  /** Gravity OFF: smoothly rise the robot back to its pre-fall (standing) transforms — so the
   *  up matches the down. Joint values are untouched (kept). Skipped if we never fell. */
  _runGravityRise() {
    // Stop any in-flight tumble first (commit its current pose, then rise from there).
    if (this._gravSim && this._gravSim !== 'loading') this._endGravityTumble(false);
    this._gravSim = null;
    const targets = this._preGravityTransforms;
    if (!targets) return;
    const doc: Document = this._doc ?? useModelStore.getState().doc;
    const starts: Record<string, any> = {};
    for (const id of Object.keys(targets)) { const b = doc.bodies[id]; if (b) starts[id] = { ...b.transform }; }
    const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
    const t0 = performance.now(); const DUR = 800;
    if (this._gravRaf) cancelAnimationFrame(this._gravRaf);
    const qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), qO = new THREE.Quaternion();
    const step = () => {
      const u = Math.min(1, (performance.now() - t0) / DUR);
      const e = u < 0.5 ? 2 * u * u : -1 + (4 - 2 * u) * u; // easeInOut
      const vals: Record<string, any> = {};
      for (const [id, tgt] of Object.entries(targets)) {
        const s = starts[id]; if (!s) continue;
        qA.set(...(s.quaternion as [number, number, number, number]));
        qB.set(...((tgt as any).quaternion as [number, number, number, number]));
        qO.copy(qA).slerp(qB, e);
        vals[id] = {
          position: [lerp(s.position[0], (tgt as any).position[0], e), lerp(s.position[1], (tgt as any).position[1], e), lerp(s.position[2], (tgt as any).position[2], e)],
          quaternion: [qO.x, qO.y, qO.z, qO.w],
          scale: (tgt as any).scale,
        };
      }
      useModelStore.getState().applyTransient((d: any) => {
        const jb: any = { ...d.bodies };
        for (const [id, v] of Object.entries(vals)) { const b = jb[id]; if (b) jb[id] = { ...b, transform: { ...b.transform, ...(v as any) } }; }
        return { ...d, bodies: jb };
      });
      if (u < 1) { this._gravRaf = requestAnimationFrame(step); }
      else {
        this._gravRaf = null;
        const patches: [string, any][] = Object.entries(targets).map(([id, v]) => [id, { transform: v }]);
        if (patches.length) useModelStore.getState().dispatch(commands.updateBodies(patches));
      }
    };
    this._gravRaf = requestAnimationFrame(step);
  }

  /**
   * Gravity feel: the WHOLE model rides a small vertical offset applied to the render
   * groups (no doc edit). Gravity OFF → floats 1 cm up; ON → drops to rest (the "floor").
   * A super-rigid body pins the model (offset locked at 0). Purely visual — smooth lerp.
   */
  _tickGravityFloat() {
    const FLOAT = 0.01; // 1 cm
    const gravityOn = this._animGravityOn;
    const pinned = this._doc ? this._hasSuperRigid(this._doc) : false;
    const target = (gravityOn || pinned) ? 0 : FLOAT;
    if (this._gravityY === undefined) this._gravityY = target;
    // Smooth approach; snap when close to avoid endless tiny updates.
    this._gravityY += (target - this._gravityY) * 0.18;
    this._gravFloatMoving = Math.abs(target - this._gravityY) >= 1e-5;
    if (!this._gravFloatMoving) this._gravityY = target;
    for (const g of [this.bodyRenderer?.group, this.jointRenderer?.group, this.connectorRenderer?.group]) {
      if (g) g.position.y = this._gravityY;
    }
    // Persistent rough floor: present on the Animation page whether gravity is on or off; removed
    // on other pages.
    const onAnim = usePageStore.getState().page === 'animation';
    if (onAnim) { this._ensureTerrainFloor(); if (this._floor) this._floor.visible = true; }
    else if (this._floor) this._hideFloor();
  }

  tick() {
    // Always call: when active it syncs the overlay; when inactive it tears down
    // any lingering overlay (defensive against a missed enter/leave transition).
    this.editMode?.syncTransform();

    // Per-frame dt for the box world (runs independently of the main physics sim)
    const nowF = performance.now();
    const frameDt = this._lastFrameTime ? Math.min(0.1, (nowF - this._lastFrameTime) / 1000) : 1 / 60;
    this._lastFrameTime = nowF;
    this._tickFallingBoxes(frameDt);
    this._tickMateAnim(frameDt);
    this._tickGravityTumble(frameDt);
    this._tickGravityFloat();

    if (this._sim) {
      // Motor spin under gravity: drive each spinning wheel joint with a velocity motor
      // so friction against the ground actually propels the model (turn gravity on,
      // click CW → it drives). Only free (non-loop-trapped) joints are driven.
      const active = getActiveSpins();
      const vels: Record<string, number> = {};
      for (const jid in active) {
        if (!canJointSpin(this._doc, jid)) continue;
        const rpm = (this._doc.joints as any)[jid]?.meta?.spinRpm ?? 30;
        vels[jid] = active[jid] * rpm * Math.PI / 30; // rad/s
      }
      this._sim.setJointVelocities(vels);
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
      return true; // physics sim is live → keep drawing
    }

    const anim = useAnimationStore.getState();
    if (anim.preview) {
      // Playback drives spin from recorded keys — halt any live (hand-driven) spins so
      // the two don't fight over the same joint value.
      if (anim.playing && !this._animActive) stopAllSpins();
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
      // On the first playback frame, remember the user's real workspace grounding so we
      // can restore it when playback stops (we mirror the keyed base into it below so the
      // Rigid ON/OFF + base buttons visibly update as the clip plays).
      const hasBaseTrack = !!(anim.baseByClip && anim.baseByClip[anim.activeClipId]?.length);
      if (!this._animActive && hasBaseTrack) {
        const ws0 = useWorkspaceStore.getState();
        this._animWsOriginal = { bodyMode: ws0.bodyMode, activeBodyId: ws0.activeBodyId };
        this._animBaseApplied = undefined;
      }
      if (anim.playing || anim.playhead !== this._lastPlayhead) {
        this._lastPlayhead = anim.playhead;
        const values = anim.sample(anim.playhead);
        const conns = anim.sampleConnections?.(anim.playhead) ?? {};
        // Motor spin: a joint keyed spinning rotates continuously. The angle ACCUMULATES
        // across all spin segments up to the playhead — each segment continues from where
        // the previous one left off (seeded by the joint's pose at the first key), instead
        // of snapping back to 0 at each key. Stop segments (dir 0) hold the angle. Purely a
        // function of the keys + elapsed time, so scrubbing and replay stay reproducible.
        const spinKeys = (anim.spinByClip?.[anim.activeClipId] ?? {}) as Record<string, { t: number; dir: number }[]>;
        // A joint counts as detached at this time if a connection key turned it off.
        const isDetachedAtT = (jid: string) => {
          const c = (conns as any)[jid];
          if (c === false) return true;
          if (c === true) return false;
          return !!(this._doc.joints as any)[jid]?.state?.disabled;
        };
        const t = anim.playhead;
        const TWO_PI = Math.PI * 2;
        for (const jid in spinKeys) {
          const keys = spinKeys[jid];
          if (!keys?.length || keys[0].t > t) continue;                 // no spin yet at this time
          if (!canJointSpin(this._doc, jid, isDetachedAtT)) continue;   // trapped in a rigid loop
          const omega = ((this._doc.joints as any)[jid]?.meta?.spinRpm ?? 30) * Math.PI / 30;
          let ang = anim.sample(keys[0].t)?.[jid] ?? 0;                 // continue from the pose it had when spin began
          for (let i = 0; i < keys.length && keys[i].t <= t; i++) {
            const segEnd = (i + 1 < keys.length) ? Math.min(keys[i + 1].t, t) : t;
            ang += keys[i].dir * omega * Math.max(0, segEnd - keys[i].t);
          }
          values[jid] = ((ang + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI; // wrap (−π,π]
        }
        // Foot-plant: root FK at the keyed grounded base for this segment (null = use the
        // workspace base). Set BEFORE applyTransient so _syncModel's computeFK uses it.
        const base = anim.sampleBase?.(anim.playhead) ?? null;
        setAnimRootOverride(base);
        // Reflect the keyed base in the UI toggles (Rigid ON/OFF + active base) — only on
        // change, via setState (no localStorage churn). FK already uses the override above.
        if (hasBaseTrack && base !== this._animBaseApplied) {
          this._animBaseApplied = base;
          useWorkspaceStore.setState(base
            ? { bodyMode: 'rigid', activeBodyId: base }
            : { bodyMode: 'free', activeBodyId: null });
        }
        if (Object.keys(values).length || Object.keys(conns).length) {
          useModelStore.getState().applyTransient((d: any) => this._withAnimState(d, values, conns));
          // The model-store subscription runs _syncModel → renders & analyses the doc.
        }
      }
      this._animActive = true;
    } else if (this._animActive) {
      this._animActive = false;
      this._lastPlayhead = -1;
      this._lastAnimTime = 0;
      setAnimRootOverride(null); // hand FK rooting back to the workspace base
      if (this._animWsOriginal) { useWorkspaceStore.setState(this._animWsOriginal); this._animWsOriginal = null; }
      this._syncModel(this._doc); // restore model pose
      return true; // one more draw to show the restored pose
    }
    // Live-animating (autonomous, not driven by a user event) → keep drawing.
    return anim.preview || !!this._gravSim || !!this._fallingBoxes || !!this._gravFloatMoving;
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

  /** Doc with animation joint VALUES + CONNECTION state applied. A joint keyed OFF gets
   *  state.disabled = true so FK detaches it (module swings free); ON clears it. */
  _withAnimState(doc: Document, values: any, conns: Record<string, boolean>) {
    const joints: Record<string, any> = { ...doc.joints };
    let changed = false;
    for (const [id, v] of Object.entries(values)) {
      const j = joints[id]; if (!j) continue;
      joints[id] = { ...j, state: { ...j.state, value: v } };
      changed = true;
    }
    for (const [id, on] of Object.entries(conns)) {
      const j = joints[id]; if (!j) continue;
      joints[id] = { ...j, state: { ...j.state, disabled: !on } };
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
    const { bodyMode, activeBodyId } = useWorkspaceStore.getState();
    const rigidRoot = bodyMode === 'rigid' ? activeBodyId : null;
    if (hitId === rigidRoot) return; // can't IK-drag the grounded body itself
    if (chainJoints(this._doc, hitId, rigidRoot).length === 0) return; // not articulated → let normal click handle it
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
    const { bodyMode, activeBodyId } = useWorkspaceStore.getState();
    const rigidRoot = bodyMode === 'rigid' ? activeBodyId : null;
    // With a closed lock loop, plain tip-IK would freely pull a redundant lock apart (FK never
    // enforces loop-closing edges). Solve WITH loop closure so every lock stays shut as you drag.
    const values = hasLockLoop(this._doc)
      ? solveDragWithLoops(this._doc, this._ikTip, [target.x, target.y, target.z], rigidRoot)
      : solveModelIK(this._doc, this._ikTip, [target.x, target.y, target.z], {}, rigidRoot);
    if (values) useModelStore.getState().dispatch(commands.setJointValues(values));
    const worst = debugWorstJoint(useModelStore.getState().doc);
    // Only shout when something is actually torn (> 5 mm) — otherwise stay silent.
    // eslint-disable-next-line no-console
    if (worst.gapMM > 5) console.warn('[JOINTDBG] TORN', worst);
  }

  _endIK() {
    this._ikActive = false;
    this._ikTip = null;
    this._downPos = null;
    this.controls.enabled = true;
  }

  // ── Animation-page IK drag ────────────────────────────────────────────────
  // When on the animation page with Gravity ON + Rigid Mode ON, clicking an
  // active body and dragging solves IK through its joint chain. The resulting
  // joint values can then be keyframed with the ◆ KEY button as usual.
  _shouldAnimIK() {
    return this._animGravityOn && this._animRigidMode && usePageStore.getState().page === 'animation';
  }

  _tryStartAnimIK(e: any) {
    if (this.transform.dragging) return;
    const hitId = this.bodyRenderer.pickBodyAt(this._ndc(e), this.camera);
    if (!hitId || !this._doc) return;
    // Only allow IK on bodies the user has explicitly activated in rigid mode.
    if (!this._animActiveBodyIds.has(hitId)) return;
    if (chainJoints(this._doc, hitId).length === 0) return; // not articulated
    const w = this._fk?.get(hitId);
    const p = new THREE.Vector3(...(w?.position ?? [0, 0, 0]));
    const n = new THREE.Vector3();
    this.camera.getWorldDirection(n);
    this._ikPlane.setFromNormalAndCoplanarPoint(n, p);
    this._ikTip = hitId;
    this._ikActive = true;
    this.controls.enabled = false;
    this._attachTo(null);
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
    // Connector markers take priority over everything else — they're small, and
    // if a body's raycast also hit here the marker is almost always what the
    // click was aimed at.
    const connectorHit = this.connectorRenderer.pickConnectorAt(ndc, this.camera);
    if (connectorHit) {
      const compositeId = `${connectorHit.bodyId}::${connectorHit.connectorId}`;
      if (sel.kind === 'connector' && sel.selectedId === compositeId) {
        if (!sel.showGizmo) sel.revealGizmo(); else sel.clear();
      } else {
        sel.select(compositeId, 'connector');
      }
      return;
    }

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
      } else if (sel.kind === 'body' && sel.ids.length > 1 && sel.ids.includes(hitId)) {
        // Plain click on a multi-selection member → narrow to just this body.
        // (Ctrl/Shift-click handled above; M/R/S reveals the group gizmo when needed.)
        sel.select(hitId, 'body');
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
      if (useEditorStore.getState().measureMode || this._pivotPickTool?._enabled) {
        // MeasureTool / PivotPickTool own snap + hover display in these modes.
        if (this._hoveredId !== null) { this.bodyRenderer.setHovered(null); this._hoveredId = null; }
        this._snapIndicator.hide();
      } else {
        // Normal object-mode hover: body glow + snap indicator.
        const hitId = this.bodyRenderer.pickBodyAt(ndc, this.camera);
        if (hitId !== this._hoveredId) {
          this.bodyRenderer.setHovered(hitId);
          this._hoveredId = hitId;
          useSelectionStore.getState().setHoveredBodyId(hitId);
        }
        const snap = computeSnap(ndc, this.camera, this.domElement, [this.bodyRenderer.group]);
        if (snap) this._snapIndicator.show(snap.point, snap.type); else this._snapIndicator.hide();
      }
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
    // touches a selected body (all of them, when a whole component is multi-selected
    // — not just the last-clicked "active" one, which looked like an arbitrary single
    // joint lighting up). Nothing selected → no joint arrows.
    const doc: Document = this._doc ?? useModelStore.getState().doc;
    const visible = new Set();
    for (const j of Object.values(doc.joints)) {
      const touchesSelection = multi
        ? (bodyIds.includes(j.parentBodyId as string) || bodyIds.includes(j.childBodyId as string))
        : (bodyId && (j.parentBodyId === bodyId || j.childBodyId === bodyId));
      if (j.id === jointId || touchesSelection) {
        visible.add(j.id);
      }
    }
    this.jointRenderer.setVisibleSet(visible);
    this.bodyRenderer.setSelectedIds(bodyIds, bodyId);
    this.jointRenderer.setSelected(jointId);
    this._multiIds = null;
    const connectorSel = s.kind === 'connector' && s.selectedId ? String(s.selectedId).split('::') : null;
    this.connectorRenderer.setSelected(connectorSel ? connectorSel[0] : null, connectorSel ? connectorSel[1] : null);
    if (useEditModeStore.getState().active) {
      this._attachTo(null); // Edit Mode is on → no body/joint gizmo from this editor
    } else if (connectorSel) {
      // Connectors support move + rotate only (scale is meaningless for a point+normal).
      this.transform.setMode(s.gizmoMode === 'rotate' ? 'rotate' : 'translate');
      this._attachTo(null);
      if (s.showGizmo) this._attachToConnector(connectorSel[0], connectorSel[1]); else this._attachedConnector = null;
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
      // Body gizmo only appears once revealed. A CONNECTED single body drives its whole
      // cluster rigidly (connected modules follow instead of tearing); an isolated body
      // falls back to the direct mesh gizmo inside _attachToMulti.
      if (s.showGizmo && bodyId) this._attachToMulti([bodyId]); else this._attachTo(null);
    }
  }

  // ── Multi-body transform ────────────────────────────────────────────────────
  // A single gizmo attached to a proxy drives every selected body. The proxy sits
  // at the group pivot (median / active body); on drag we apply the proxy's delta
  // to each body. `pivotMode === 'individual'` rotates/scales each body about its
  // own origin instead of the shared pivot.
  _groupPivot(ids: string[], doc: Document) {
    const sel = useSelectionStore.getState();
    // Use FK world positions (where bodies actually appear in rigid/posed mode), not the
    // stored rest transforms — otherwise the pivot sits at the wrong place.
    const worldPos = (id: string) => {
      const w = this._fk?.get(id)?.position;
      return w ? new THREE.Vector3(w[0], w[1], w[2]) : new THREE.Vector3(...(doc.bodies[id]?.transform.position ?? [0, 0, 0]));
    };
    if (sel.pivotMode === 'active' && sel.selectedId && doc.bodies[sel.selectedId as string]) {
      return worldPos(sel.selectedId as string);
    }
    const c = new THREE.Vector3();
    let n = 0;
    for (const id of ids) {
      if (doc.bodies[id]) { c.add(worldPos(id)); n++; }
    }
    if (n) c.multiplyScalar(1 / n);
    return c;
  }

  /**
   * Orient the selected component so its LONG axis points along world X/Y/Z, moving the
   * whole connected cluster rigidly. Only acts when the module is at home (all its joints
   * at 0). One undo step. Returns { ok, error? } for the caller to surface.
   */
  _orientSelectionToAxis(axis: 'x' | 'y' | 'z'): { ok: boolean; error?: string } {
    const doc: Document = this._doc ?? useModelStore.getState().doc;
    const sel = useSelectionStore.getState();
    const seed = sel.kind === 'body'
      ? (sel.ids?.length ? sel.ids : (sel.selectedId ? [sel.selectedId] : []))
      : [];
    if (!seed.length) return { ok: false, error: 'Select a component (module) first.' };
    const cluster = this._connectedCluster(doc, seed);
    if (cluster.length < 2) return { ok: false, error: 'Select a connected module with more than one body.' };

    // Home check: every articulated joint inside the cluster must be at ~0.
    const inSet = new Set(cluster);
    const bent = (Object.values(doc.joints) as any[]).find((j) =>
      inSet.has(j.parentBodyId) && inSet.has(j.childBodyId)
      && (j.type === 'revolute' || j.type === 'prismatic' || j.type === 'continuous')
      && Math.abs(j.state?.value ?? 0) > 1e-3);
    if (bent) return { ok: false, error: `Not at home — “${bent.name}” is bent. Reset joints to 0 first.` };

    const fk = this._fk ?? computeFK(doc);
    // Long axis + pivot come from the SELECTED module's bodies only (not the whole connected
    // assembly); the rotation is then applied to the whole cluster so everything follows.
    const seedLive = seed.filter((id) => doc.bodies[id]);
    const pts = (seedLive.length >= 2 ? seedLive : cluster).map((id) => {
      const w = fk.get(id)?.position ?? doc.bodies[id].transform.position;
      return new THREE.Vector3(w[0], w[1], w[2]);
    });
    // Long axis = direction between the two farthest bodies (robust for module chains).
    let bi = 0, bj = 1, bd = -1;
    for (let i = 0; i < pts.length; i++) for (let k = i + 1; k < pts.length; k++) {
      const d = pts[i].distanceToSquared(pts[k]); if (d > bd) { bd = d; bi = i; bj = k; }
    }
    const L = pts[bj].clone().sub(pts[bi]);
    if (L.lengthSq() < 1e-9) return { ok: false, error: 'Module has no clear long axis.' };
    L.normalize();
    const A = axis === 'x' ? new THREE.Vector3(1, 0, 0) : axis === 'y' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    const Ls = L.dot(A) >= 0 ? L : L.clone().negate(); // shortest arc — don't flip 180°
    const R = new THREE.Quaternion().setFromUnitVectors(Ls, A);
    const pivot = new THREE.Vector3();
    for (const p of pts) pivot.add(p);
    pivot.multiplyScalar(1 / pts.length);

    // Rotate every cluster body's WORLD pose about the pivot, write back to transforms
    // (FK reproduces it from the root). Single undoable step.
    const patches: [string, any][] = [];
    for (const id of cluster) {
      const w = fk.get(id); const t = doc.bodies[id].transform;
      const wp = w ? new THREE.Vector3(w.position[0], w.position[1], w.position[2]) : new THREE.Vector3(...t.position);
      const wq = w ? new THREE.Quaternion(w.quaternion[0], w.quaternion[1], w.quaternion[2], w.quaternion[3]) : new THREE.Quaternion(...t.quaternion);
      const np = wp.sub(pivot).applyQuaternion(R).add(pivot);
      const nq = R.clone().multiply(wq);
      patches.push([id, { transform: { position: [np.x, np.y, np.z], quaternion: [nq.x, nq.y, nq.z, nq.w], scale: [...t.scale] } }]);
    }
    useModelStore.getState().dispatch(commands.updateBodies(patches));
    return { ok: true };
  }

  /** Every body connected to the seed set through the joint graph (any joint type). */
  _connectedCluster(doc: Document, seedIds: string[]): string[] {
    const adj = new Map<string, string[]>();
    const link = (a: string, b: string) => { const l = adj.get(a); if (l) l.push(b); else adj.set(a, [b]); };
    for (const j of Object.values(doc.joints) as any[]) {
      if (j.parentBodyId && j.childBodyId) { link(j.parentBodyId, j.childBodyId); link(j.childBodyId, j.parentBodyId); }
    }
    const seen = new Set(seedIds);
    const q = [...seedIds];
    while (q.length) { const cur = q.shift()!; for (const n of adj.get(cur) ?? []) if (!seen.has(n)) { seen.add(n); q.push(n); } }
    return [...seen].filter((id) => doc.bodies[id]);
  }

  _attachToMulti(ids: string[]) {
    const doc: Document = this._doc ?? useModelStore.getState().doc;
    const selLive = ids.filter((id) => doc.bodies[id]);
    if (selLive.length === 0) { this._attachTo(null); return; }
    // Move the WHOLE connected cluster rigidly (so connected modules follow instead of
    // tearing apart), but pivot around the SELECTED bodies you grabbed.
    const cluster = this._connectedCluster(doc, selLive);
    if (cluster.length < 2) { this._multiIds = null; this._multiSelIds = null; this._attachTo(selLive[0] ?? null); return; }
    this._multiSelIds = ids;      // remember the actual selection (for re-seating the pivot)
    this._multiIds = cluster;     // the bodies that actually move
    this._multiProxy ??= (() => {
      const o = new THREE.Object3D();
      o.name = 'multi-pivot-proxy';
      this._scene.add(o);
      return o;
    })();
    const pivot = this._groupPivot(selLive, doc);
    this._multiProxy.position.copy(pivot);
    this._multiProxy.quaternion.identity();
    this._multiProxy.scale.set(1, 1, 1);
    this._multiProxy.updateMatrixWorld(true);
    this._attachedId = null;
    this._attachedJointId = null;
    this._attachedConnector = null;
    this.transform.attach(this._multiProxy);
    this.transform.enabled = true;
    this.transform.visible = true;
    this._syncMoveIndicator();
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
          // Snapshot the FK WORLD pose (where the body actually appears), so the live drag
          // preview moves the whole cluster rigidly instead of scattering from rest poses.
          const w = this._fk?.get(id);
          return {
            id,
            pos: w ? new THREE.Vector3(w.position[0], w.position[1], w.position[2]) : new THREE.Vector3(...t.position),
            quat: w ? new THREE.Quaternion(w.quaternion[0], w.quaternion[1], w.quaternion[2], w.quaternion[3]) : new THREE.Quaternion(...t.quaternion),
            scale: [...t.scale] as number[],
          };
        }),
    };
  }

  _applyMultiDrag() {
    if (!this._multiStart) return;
    // Super-rigid pins the whole connected model — refuse to move a cluster containing one.
    const doc0: Document = this._doc ?? useModelStore.getState().doc;
    if (this._multiStart.bodies.some((b: any) => (doc0.bodies[b.id] as any)?.meta?.superRigid)) return;
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
    // Re-seat the proxy at the new group pivot (using the SELECTION, not the whole cluster,
    // so the pivot stays on the module you grabbed).
    if (this._multiSelIds) this._attachToMulti(this._multiSelIds);
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
    this._attachedConnector = null;
    this._syncMoveIndicator();
  }

  /** Local +Z is defined to point along the connector's world-space normal, so
   *  the rotate gizmo's Z ring intuitively re-aims the connector. */
  _attachToConnector(bodyId: string, connectorId: string) {
    const doc: Document = this._doc ?? useModelStore.getState().doc;
    const world = getConnectorWorld(doc, bodyId, connectorId, this._fk);
    if (!world) { this._attachTo(null); return; }
    this._connectorProxy.position.copy(world.position);
    this._connectorProxy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), world.normal);
    this._connectorProxy.scale.set(1, 1, 1);
    this._connectorProxy.updateMatrixWorld(true);
    this.transform.attach(this._connectorProxy);
    this.transform.enabled = true;
    this.transform.visible = true;
    this._attachedId = null;
    this._attachedJointId = null;
    this._attachedConnector = { bodyId, connectorId };
    this._syncMoveIndicator();
  }

  _attachTo(bodyId: any) {
    this._attachedJointId = null;
    this._attachedConnector = null;
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
    this._syncMoveIndicator();
  }

  /** Keep the fallback R/G/B arrow triad glued to whatever the real gizmo is
   *  attached to (see the constructor comment for why this exists). */
  _syncMoveIndicator() {
    if (!this._moveIndicator) return;
    const obj = this.transform.object;
    if (!this.transform.enabled || !this.transform.visible || !obj) {
      this._moveIndicator.visible = false;
      return;
    }
    obj.updateMatrixWorld(true);
    obj.getWorldPosition(this._moveIndicator.position);
    this._moveIndicator.quaternion.identity(); // world-aligned axes, matching the gizmo's default 'world' space
    this._moveIndicator.visible = true;
    const mode = this.transform.mode;
    for (const a of this._moveIndicatorArrows) a.visible = mode === 'translate';
    for (const r of this._moveIndicatorRings) r.visible = mode === 'rotate';
    for (const b of this._moveIndicatorBoxes) b.visible = mode === 'scale';
  }

  // Re-attach after a doc sync if the selected mesh still exists.
  _reattach() {
    if (this.transform.dragging) return;
    const sel = useSelectionStore.getState();
    if (sel.kind === 'body' && sel.selectedId) {
      if (!sel.showGizmo) return; // gizmo not revealed yet
      // Route through the cluster logic (multi selection OR a connected single body → move
      // the whole connected assembly rigidly; an isolated body → direct mesh gizmo).
      this._attachToMulti(sel.ids && sel.ids.length > 1 ? sel.ids : [sel.selectedId]);
    } else if (sel.kind === 'joint' && sel.selectedId) {
      // Keep the pivot proxy glued to the (possibly moved) joint pivot.
      this._attachToJoint(sel.selectedId);
    } else if (sel.kind === 'connector' && sel.selectedId) {
      if (!sel.showGizmo) return;
      const [bodyId, connectorId] = String(sel.selectedId).split('::');
      this._attachToConnector(bodyId, connectorId);
    }
  }

  _commitTransform() {
    // Joint pivot drag → write back to the joint's origin (both bodies stay put).
    if (this._attachedJointId) {
      this._commitJointPivot();
      return;
    }
    if (this._attachedConnector) {
      this._commitConnector();
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

  /** Convert the connector proxy's new world transform back into the body-local
   *  Connector.position/normal it's actually stored as, and write it back. */
  _commitConnector() {
    const att = this._attachedConnector;
    if (!att) return;
    const doc: Document = this._doc ?? useModelStore.getState().doc;
    const body = doc.bodies[att.bodyId];
    if (!body) return;
    const conns = (body.meta?.connectors as any[] | undefined) ?? [];
    const idx = conns.findIndex((c) => c.id === att.connectorId);
    if (idx < 0) return;

    const bodyQuat = new THREE.Quaternion(...body.transform.quaternion);
    const bodyPos = new THREE.Vector3(...body.transform.position);
    const bodyQuatInv = bodyQuat.clone().invert();
    const localPos = this._connectorProxy.position.clone().sub(bodyPos).applyQuaternion(bodyQuatInv);
    const worldNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(this._connectorProxy.quaternion);
    const localNormal = worldNormal.applyQuaternion(bodyQuatInv).normalize();

    const nextConnectors = conns.map((c, i) => (i === idx
      ? { ...c, position: [localPos.x, localPos.y, localPos.z], normal: [localNormal.x, localNormal.y, localNormal.z] }
      : c));
    useModelStore.getState().dispatch(commands.updateBody(att.bodyId, {
      meta: { ...body.meta, connectors: nextConnectors },
    }));
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

  // Generic over whatever the real gizmo is currently attached to (single body
  // mesh, joint proxy, connector proxy, or the multi-body proxy) — start/update/
  // cancel all just drive `this.transform.object`'s transform directly. Only the
  // final COMMIT differs per attachment type, and that reuses the exact same
  // _commitTransform()/_commitMulti() dispatch a normal (non-modal) drag already
  // uses, instead of a separate copy of the body/joint/connector write-back logic.
  startAxisModal(axis: 'x'|'y'|'z') {
    if (this.editMode?.active || this._sim) return;
    const isMulti = !!(this._multiIds && this._multiIds.length > 1);
    const obj = this.transform.object;
    if (!obj) return; // nothing attached — nothing to constrain

    // Cancel any previous modal (user pressed a different axis key mid-move)
    if (this._modal?.active) this._cancelAxisModal();

    const gizmoMode = useSelectionStore.getState().gizmoMode; // 'translate' | 'rotate' | 'scale'
    const AXIS_COLORS: Record<string, number> = { x: 0xe05252, y: 0x52e070, z: 0x5280e0 };
    const axisVec = axis === 'x' ? new THREE.Vector3(1,0,0) : axis === 'y' ? new THREE.Vector3(0,1,0) : new THREE.Vector3(0,0,1);
    const origin = obj.position.clone();

    // Axis line visual
    const points = [origin.clone().addScaledVector(axisVec, -20), origin.clone().addScaledVector(axisVec, 20)];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    this._axisLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: AXIS_COLORS[axis], depthTest: false, linewidth: 2 }));
    this._axisLine.renderOrder = 2000;
    this._scene.add(this._axisLine);

    // Disable standard gizmo (and its fallback indicator) so nothing fights the modal.
    this.transform.enabled = false;
    this.transform.visible = false;
    if (this._moveIndicator) this._moveIndicator.visible = false;

    // Right-click cancels the modal
    this._onModalContextMenu = (e: MouseEvent) => { e.preventDefault(); this._cancelAxisModal(); };
    this.domElement.addEventListener('contextmenu', this._onModalContextMenu);

    if (isMulti) this._beginMultiDrag(); // snapshots this._multiStart for every selected body

    this._modal = {
      active: true, axis, axisVec, gizmoMode, isMulti,
      startPos: origin.clone(),
      startQuat: obj.quaternion.clone(),
      startScale: obj.scale.clone(),
      startNdc: this._lastNdc.clone(),
      liveT: 0,
    };
    useTransformHudStore.getState().beginDrag(gizmoMode);
    useTransformHudStore.getState().setAxis(axis);
  }

  /** Multi-body counterpart of _applyModalLive — same math as _applyMultiDrag but
   *  the proxy delta is replaced with a pure single-axis translate/rotate/scale. */
  _applyMultiAxisModal(m: any, liveT: number) {
    if (!this._multiStart) return;
    const individual = useSelectionStore.getState().pivotMode === 'individual';
    const pivot = this._multiStart.pivot;
    const axisVec: THREE.Vector3 = m.axisVec;
    const rotQuat = m.gizmoMode === 'rotate' ? new THREE.Quaternion().setFromAxisAngle(axisVec, liveT) : null;
    const axisIdx = m.axis === 'x' ? 0 : m.axis === 'y' ? 1 : 2;

    for (const b of this._multiStart.bodies) {
      const mesh = this.bodyRenderer.getMesh(b.id);
      if (!mesh) continue;
      let pos = b.pos.clone();
      let quat = b.quat.clone();
      let scale = [...b.scale];
      if (m.gizmoMode === 'translate') {
        pos = b.pos.clone().addScaledVector(axisVec, liveT);
      } else if (m.gizmoMode === 'rotate' && rotQuat) {
        quat = rotQuat.clone().multiply(b.quat);
        if (!individual) pos = b.pos.clone().sub(pivot).applyQuaternion(rotQuat).add(pivot);
      } else if (m.gizmoMode === 'scale') {
        const f = Math.max(0.001, 1 + liveT);
        scale = [...b.scale];
        scale[axisIdx] = Math.max(0.001, b.scale[axisIdx] * f);
        if (!individual) {
          const rel = b.pos.clone().sub(pivot);
          rel.setComponent(axisIdx, rel.getComponent(axisIdx) * f);
          pos = rel.add(pivot);
        }
      }
      mesh.position.copy(pos);
      mesh.quaternion.copy(quat);
      mesh.scale.set(scale[0], scale[1], scale[2]);
      mesh.updateMatrixWorld(true);
      b._live = { pos, quat, scale };
    }
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
    const hud = useTransformHudStore.getState();
    const rect = this.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this._lastNdc.copy(ndc);

    // While the user is typing a number, freeze mouse tracking and preview the typed value.
    if (hud.buffer) {
      const raw = parseFloat(hud.buffer);
      if (!isNaN(raw)) {
        const liveT = this._rawToLiveT(raw, m.gizmoMode);
        if (m.isMulti) {
          this._applyMultiAxisModal(m, liveT);
        } else if (this.transform.object) {
          this._applyModalLive(m, this.transform.object, liveT);
        }
        hud.setLive(this._liveToHud(liveT, m.gizmoMode));
      }
      return;
    }

    // Screen-space projection: project the axis onto 2-D screen, then project the
    // mouse delta onto that direction. This avoids sign inversions that appear with the
    // skew-lines formula when the axis is nearly perpendicular to the camera ray.
    const p0 = m.startPos.clone().project(this.camera);
    const p1 = m.startPos.clone().add(m.axisVec).project(this.camera);
    const axisScreen = new THREE.Vector2(p1.x - p0.x, p1.y - p0.y);
    const axisLen2d = axisScreen.length();
    if (axisLen2d < 1e-4) return; // axis pointing straight at/away from camera

    const mouseDelta = ndc.clone().sub(m.startNdc);
    m.liveT = mouseDelta.dot(axisScreen) / (axisLen2d * axisLen2d);

    if (m.isMulti) {
      this._applyMultiAxisModal(m, m.liveT);
    } else if (this.transform.object) {
      this._applyModalLive(m, this.transform.object, m.liveT);
    }
    hud.setLive(this._liveToHud(m.liveT, m.gizmoMode));
  }

  // Convert a raw typed number (mm / degrees / multiplier) to internal liveT units.
  _rawToLiveT(raw: number, mode: string): number {
    if (mode === 'translate') return raw * 0.001;  // mm → m
    if (mode === 'rotate')    return raw * Math.PI / 180; // deg → rad
    return raw - 1; // scale: user types multiplier (e.g. 2 = 2×), liveT = delta from 1
  }

  // Convert internal liveT to the value the HUD should display.
  _liveToHud(liveT: number, mode: string): number {
    if (mode === 'translate') return Math.abs(liveT);         // meters
    if (mode === 'rotate')    return Math.abs(liveT) * 180 / Math.PI; // degrees
    return 1 + liveT;                                          // ×  multiplier
  }

  // Apply the live preview to the mesh based on mode.
  _applyModalLive(m: any, mesh: any, liveT: number) {
    if (m.gizmoMode === 'translate') {
      mesh.position.copy(m.startPos.clone().addScaledVector(m.axisVec, liveT));
    } else if (m.gizmoMode === 'rotate') {
      const q = new THREE.Quaternion().setFromAxisAngle(m.axisVec, liveT);
      mesh.quaternion.copy(m.startQuat.clone().multiply(q));
    } else { // scale
      const axisIdx = m.axis === 'x' ? 0 : m.axis === 'y' ? 1 : 2;
      mesh.scale.copy(m.startScale);
      mesh.scale.setComponent(axisIdx, Math.max(0.001, m.startScale.getComponent(axisIdx) * Math.max(0.001, 1 + liveT)));
    }
    mesh.updateMatrixWorld(true);
  }

  // exactRaw is the raw typed number (mm for translate, degrees for rotate, × for scale).
  _commitAxisModal(exactRaw?: number) {
    if (!this._modal) return;
    const m = this._modal;
    const liveT = exactRaw !== undefined ? this._rawToLiveT(exactRaw, m.gizmoMode) : m.liveT;

    if (m.isMulti) {
      this._applyMultiAxisModal(m, liveT); // settle the live preview at the exact final value
      this._commitMulti(); // reuses the same single-undo-step patch/dispatch as a normal group drag
    } else if (this.transform.object) {
      this._applyModalLive(m, this.transform.object, liveT); // settle at the exact final value
      // Reuse the SAME body/joint/connector write-back a normal (non-modal) drag
      // commit already uses — it dispatches on _attachedJointId/_attachedConnector/
      // _attachedId, exactly matching whatever startAxisModal found attached.
      this._commitTransform();
    }
    useTransformHudStore.getState().endDrag();
    this._cleanupModal();
  }

  _cancelAxisModal() {
    if (!this._modal) return;
    const m = this._modal;
    if (m.isMulti) {
      // Snap every body back to its pre-modal transform.
      if (this._multiStart) {
        for (const b of this._multiStart.bodies) {
          const mesh = this.bodyRenderer.getMesh(b.id);
          if (!mesh) continue;
          mesh.position.copy(b.pos);
          mesh.quaternion.copy(b.quat);
          mesh.scale.set(b.scale[0], b.scale[1], b.scale[2]);
          mesh.updateMatrixWorld(true);
        }
        this._multiStart = null;
      }
    } else if (this.transform.object) {
      const obj = this.transform.object;
      if (m.gizmoMode === 'translate') obj.position.copy(m.startPos);
      else if (m.gizmoMode === 'rotate') obj.quaternion.copy(m.startQuat);
      else obj.scale.copy(m.startScale);
      obj.updateMatrixWorld(true);
    }
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
    if (this._onModalContextMenu) {
      this.domElement.removeEventListener('contextmenu', this._onModalContextMenu);
      this._onModalContextMenu = null;
    }
    this._modal = null;
    // Re-enable gizmo
    const sel = useSelectionStore.getState();
    this.transform.enabled = !!sel.showGizmo;
    this.transform.visible = !!sel.showGizmo;
    this._syncMoveIndicator();
  }

  dispose() {
    this._cancelAxisModal();
    this.bodyRenderer.setHovered(null);
    this.editMode?.dispose();
    this._unsubEdit?.();
    this._unsubModel?.();
    this._unsubSel?.();
    this._unsubBus?.();
    this._unsubEditor?.();
    this._unsubAnimScene?.();
    this.domElement?.removeEventListener('pointerdown', this._onPointerDown);
    this.domElement?.removeEventListener('pointerup', this._onPointerUp);
    this.domElement?.removeEventListener('pointermove', this._onPointerMove);
    this.domElement?.removeEventListener('dblclick', this._onDblClick);
    this.domElement?.removeEventListener('contextmenu', this._onContextMenu);
    this._snapIndicator?.dispose();
    this._clearMate();
    this._mateMarkers?.parent?.remove(this._mateMarkers);
    this._sim?.dispose();
    this.transform.detach();
    this.transform.dispose?.();
    this.transform.parent?.remove(this.transform);
    this._jointProxy?.parent?.remove(this._jointProxy);
    this._multiProxy?.parent?.remove(this._multiProxy);
    this._connectorProxy?.parent?.remove(this._connectorProxy);
    this.bodyRenderer.dispose();
    this.jointRenderer.dispose();
    if (mateBridge.play) mateBridge.play = null;
    this.connectorRenderer.dispose();
    if (this._comMarker) { this._comMarker.geometry.dispose(); this._comMarker.material.dispose(); this._comMarker.parent?.remove(this._comMarker); }
    if (this._gravArrow) { this._gravArrow.traverse((o: any) => { o.geometry?.dispose(); o.material?.dispose(); }); this._gravArrow.parent?.remove(this._gravArrow); }
    if (this._moveIndicator) {
      this._moveIndicator.traverse((o: any) => { o.geometry?.dispose(); o.material?.dispose(); });
      this._moveIndicator.parent?.remove(this._moveIndicator);
    }
  }
}