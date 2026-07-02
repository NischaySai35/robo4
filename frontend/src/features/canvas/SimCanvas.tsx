/**
 * SimCanvas — the model-graph 3D viewport.
 *
 * Mounts the shared SceneManager (scene/camera/grid/lights/orbit) and the
 * ModelEditor (generic Body/Joint renderer + gizmo + selection + mate tool +
 * physics). A tiny render loop ticks the editor (physics/animation preview) and
 * renders each frame. Persistence (autosave + full-project undo/redo) and import/
 * export live here. The legacy rod/cube arm has been removed — everything is the
 * model graph now.
 */
import { useEffect, useRef, Fragment } from 'react';
import TransformHUD from '@/features/common/TransformHUD';
import ViewportStats from './ViewportStats';
import ViewportCtxMenu from './ViewportCtxMenu';
import * as THREE from 'three';
import { SceneManager } from '@/viewport/SceneManager';
import { ModelEditor } from '@/viewport/ModelEditor';
import { MeasureTool } from '@/viewport/MeasureTool';
import { startMemoryMonitor } from '@/viewport/memoryMonitor';
import { useThemeStore } from '@/state/themeStore';
import { useEditorStore } from '@/state/editorStore';
import { bridge } from '@/viewport/cameraBridge';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { serializeProject, parseProject } from '@/core/serialization/project';
import { saveAutosave, loadAutosave } from '@/core/serialization/storage';
import { downloadBlob, writeProjectToHandle } from '@/core/serialization/fileIO';
import { useDocStore } from '@/state/docStore';
import { useHistoryStore } from '@/state/historyStore';
import { useModelStore } from '@/state/modelStore';
import { useAnimationStore } from '@/state/animationStore';
import { usePageStore } from '@/state/pageStore';
import { useDockStore } from '@/state/dockStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useAutonomyStore } from '@/state/autonomyStore';
import { useTrainingStore } from '@/state/trainingStore';
import { scan2D } from '@/robotics/sensors/lidar';
import { computeFK } from '@/kinematics/modelFK';
import { robotBaseXZ } from '@/robotics/nav/worldModel';

export default function SimCanvas() {
  const canvasRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const modelEditorRef = useRef<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Scene + theme.
    const sceneMgr = new SceneManager(canvas);
    sceneRef.current = sceneMgr;
    sceneMgr.applyTheme(useThemeStore.getState().theme);
    const unsubTheme = useThemeStore.subscribe((s) => sceneMgr.applyTheme(s.theme));

    // Model-graph layer (renderers + gizmo + selection + mate + physics).
    const modelEditor = new ModelEditor({
      scene: sceneMgr.scene,
      camera: sceneMgr.camera,
      controls: sceneMgr.controls,
      domElement: sceneMgr.renderer.domElement,
    });
    modelEditorRef.current = modelEditor;

    // Render utilities: canvas stream capture + resolution scaling.
    bridge.captureStream = (fps = 30) => {
      try { return (sceneMgr.renderer.domElement as any).captureStream(fps); }
      catch { return null; }
    };
    bridge.setRenderScale = (scale: number) => {
      const dpr = Math.max(0.5, Math.min(8, scale)) * (window.devicePixelRatio || 1);
      sceneMgr.renderer.setPixelRatio(dpr);
      sceneMgr.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    };

    // High-res render: temporarily resize renderer to an exact pixel size.
    let _preDpr = window.devicePixelRatio || 1;
    let _preW = 0;
    let _preH = 0;
    bridge.setRenderResolution = (w: number, h: number) => {
      _preDpr = sceneMgr.renderer.getPixelRatio();
      _preW = sceneMgr.renderer.domElement.width;
      _preH = sceneMgr.renderer.domElement.height;
      sceneMgr.renderer.setPixelRatio(1);
      sceneMgr.renderer.setSize(w, h, false);
      sceneMgr.camera.aspect = w / h;
      sceneMgr.camera.updateProjectionMatrix();
      sceneMgr.composer.setSize(w, h);
    };
    bridge.resetRenderResolution = () => {
      if (!_preW) return;
      sceneMgr.renderer.setPixelRatio(_preDpr);
      sceneMgr.renderer.setSize(_preW, _preH, false);
      sceneMgr.camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
      sceneMgr.camera.updateProjectionMatrix();
      sceneMgr.composer.setSize(_preW, _preH);
      _preW = 0;
    };

    // Engine switching — delegates to SceneManager which owns the render pipeline.
    let _currentEngine = 'eevee';
    bridge.getRenderEngine = () => _currentEngine;
    bridge.getPathTracerSamples = () => sceneMgr.getPathTracerSamples();
    bridge.markSceneChanged = () => sceneMgr.markPathTracerDirty();
    bridge.getRendererStats = () => sceneMgr.getRendererStats();
    bridge.setComputeDevice = (d) => sceneMgr.setComputeDevice(d);
    bridge.getComputeDevice = () => sceneMgr.getComputeDevice();
    bridge.setMaxSamples = (n: number) => sceneMgr.setMaxSamples(n);
    bridge.getMaxSamples = () => sceneMgr.getMaxSamples();
    bridge.setWireframe = (on) => {
      if (modelEditor?.bodyRenderer) {
        modelEditor.bodyRenderer.setWireframe(on);
        if (modelEditor._doc) modelEditor._syncModel(modelEditor._doc);
      }
    };
    bridge.getWireframe = () => modelEditor?.bodyRenderer?._wireframe ?? false;
    bridge.setConnectorsVisible = (on) => modelEditor?.connectorRenderer?.setVisible(on);
    bridge.getConnectorsVisible = () => modelEditor?.connectorRenderer?._visible ?? true;
    bridge.setRenderEngine = (engine: string) => {
      _currentEngine = engine;
      sceneMgr.setRenderEngine(engine);
      // BodyRenderer material mode for clay / wireframe override.
      if (modelEditor?.bodyRenderer) modelEditor.bodyRenderer._engineMode = engine;
    };

    // FIT bounding box over the model bodies.
    bridge.getFitBox = () => {
      const g = modelEditor.bodyRenderer?.group;
      if (!g || g.children.length === 0) return null;
      g.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(g);
      return box.isEmpty() ? null : box;
    };

    // ── Autonomy overlay: nav path, goal ring, LiDAR points ────────────────────
    const autoGroup = new THREE.Group();
    autoGroup.name = 'autonomy-overlay';
    sceneMgr.scene.add(autoGroup);
    const clearAuto = () => {
      for (const c of [...autoGroup.children]) {
        autoGroup.remove(c);
        (c as any).geometry?.dispose?.();
        (c as any).material?.dispose?.();
      }
    };
    const drawAuto = () => {
      clearAuto();
      const st = useAutonomyStore.getState();
      if (st.path && st.path.length > 1) {
        const pts = st.path.map(([x, z]) => new THREE.Vector3(x, 0.03, z));
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: 0x10b0ff, depthTest: false }),
        );
        line.renderOrder = 998;
        autoGroup.add(line);
      }
      if (st.goal) {
        const m = new THREE.Mesh(
          new THREE.TorusGeometry(0.18, 0.03, 8, 24),
          new THREE.MeshBasicMaterial({ color: 0x10b0ff, depthTest: false }),
        );
        m.rotation.x = Math.PI / 2;
        m.position.set(st.goal[0], 0.04, st.goal[1]);
        m.renderOrder = 999;
        autoGroup.add(m);
      }
      if (st.showLidar && st.lidar) {
        const arr = new Float32Array(st.lidar.points.length * 3);
        st.lidar.points.forEach((p, i) => { arr[i * 3] = p[0]; arr[i * 3 + 1] = p[1]; arr[i * 3 + 2] = p[2]; });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
        const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xff3344, size: 0.06, depthTest: false }));
        pts.renderOrder = 999;
        autoGroup.add(pts);
      }
    };
    const unsubAuto = useAutonomyStore.subscribe(drawAuto);
    drawAuto();

    // ── RL reach-target overlay: a marker at the point you want the arm to reach ──
    const reachGroup = new THREE.Group();
    reachGroup.name = 'reach-target';
    sceneMgr.scene.add(reachGroup);
    const drawReach = () => {
      for (const c of [...reachGroup.children]) { reachGroup.remove(c); (c as any).geometry?.dispose?.(); (c as any).material?.dispose?.(); }
      const t = useTrainingStore.getState().target;
      if (!t) return;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xff3399, depthTest: false, transparent: true, opacity: 0.9 }),
      );
      m.position.set(t[0], t[1], t[2]);
      m.renderOrder = 1002;
      reachGroup.add(m);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.06, 0.008, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0xff3399, depthTest: false }),
      );
      ring.position.copy(m.position);
      ring.lookAt(sceneMgr.camera.position);
      ring.renderOrder = 1002;
      reachGroup.add(ring);
    };
    const unsubReach = useTrainingStore.subscribe(drawReach);
    drawReach();

    // Click-to-place the reach target on any mesh while "pick target" mode is on.
    const reachRay = new THREE.Raycaster();
    const onReachPick = (e: any) => {
      if (!useTrainingStore.getState().picking) return;
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      reachRay.setFromCamera(ndc, sceneMgr.camera);
      const hits = reachRay.intersectObjects([modelEditor.bodyRenderer.group], true);
      if (hits.length) {
        const p = hits[0].point;
        useTrainingStore.getState().setTarget([p.x, p.y, p.z]);
        useTrainingStore.getState().setPicking(false);
      }
    };
    canvas.addEventListener('pointerdown', onReachPick);

    // LiDAR scan against obstacle meshes (from the robot base, or a given origin).
    const lidarRay = new THREE.Raycaster();
    bridge.scanLidar = (origin) => {
      const doc = useModelStore.getState().doc;
      let o: THREE.Vector3;
      if (origin) o = new THREE.Vector3(origin[0], origin[1], origin[2]);
      else { const [bx, bz] = robotBaseXZ(doc, computeFK(doc)); o = new THREE.Vector3(bx, 0.35, bz); }
      const targets: any[] = [];
      for (const b of Object.values(doc.bodies)) {
        if ((b.meta as any)?.obstacle) { const c = modelEditor.bodyRenderer.getMesh(b.id); if (c) targets.push(c); }
      }
      const scan = scan2D(lidarRay, targets, o, { rays: 140, maxRange: 8 });
      useAutonomyStore.getState().setLidar(scan);
      return scan;
    };

    // Click-to-set-goal: while in goal mode, a canvas click drops the goal on the ground.
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const goalRay = new THREE.Raycaster();
    const onGoalClick = (e: any) => {
      if (!useAutonomyStore.getState().settingGoal) return;
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      goalRay.setFromCamera(ndc, sceneMgr.camera);
      const pt = new THREE.Vector3();
      if (goalRay.ray.intersectPlane(groundPlane, pt)) {
        useAutonomyStore.getState().setGoal([pt.x, pt.z]);
        useAutonomyStore.getState().setSettingGoal(false);
      }
    };
    canvas.addEventListener('pointerdown', onGoalClick);

    // Measure tool (Phase 3) — raycasts model bodies.
    const measureTool = new MeasureTool({
      scene: sceneMgr.scene,
      camera: sceneMgr.camera,
      domElement: sceneMgr.renderer.domElement,
      getMeshes: () => [modelEditor.bodyRenderer.group],
      onResult: (r: any) => useEditorStore.getState().setMeasureResult(r),
      onCancel: () => useEditorStore.getState().setMeasureMode(false),
    });
    let lastMeasure = false;
    const unsubMeasure = useEditorStore.subscribe((s) => {
      if (s.measureMode === lastMeasure) return;
      lastMeasure = s.measureMode;
      if (s.measureMode) measureTool.enable();
      else measureTool.disable();
    });

    // ── Render loop ───────────────────────────────────────────────────────────
    let raf: any = null;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      modelEditor.tick();   // physics step / animation preview when active
      sceneMgr.render();
    };
    raf = requestAnimationFrame(loop);

    // ── Load a project (model + animation) ──────────────────────────────────────
    bridge.loadScene = (project, opts: any = {}) => {
      let scene;
      try { scene = parseProject(project); }
      catch (e) { return { ok: false, error: e.message }; }
      if (scene.model) useModelStore.getState().loadDocument(scene.model);
      if (scene.animation) useAnimationStore.getState().loadClip(scene.animation);
      // Restore workspace layout (skip during undo/redo — those snapshots have no workspace).
      if (!opts.skipWorkspace && scene.workspace && Object.keys(scene.workspace).length) {
        const ws = scene.workspace;
        useWorkspaceStore.getState().restore(ws);
        if (ws.page) usePageStore.getState().setPage(ws.page);
        const dock = useDockStore.getState();
        if (ws.dockActive !== undefined) {
          if (ws.dockActive) dock.open(ws.dockActive); else dock.close();
        }
        if (ws.dockSplit !== undefined && ws.dockSplit !== dock.split) dock.toggleSplit();
        if (ws.dockSecondary) dock.setSecondary(ws.dockSecondary);
        if (ws.cameraState) bridge.applyCameraState?.(ws.cameraState);
      }
      if (opts.fit !== false) setTimeout(() => bridge.fitCamera?.(), 60);
      return { ok: true };
    };

    // ── Export the model meshes (GLB / OBJ / STL) ───────────────────────────────
    bridge.exportModel = (format) => {
      const fmt = (format || 'glb').toLowerCase();
      if (fmt === 'step') {
        return { ok: false, error: 'STEP export needs a CAD kernel — not supported yet. Use OBJ / STL / GLB.' };
      }
      const src = modelEditor.bodyRenderer.group;
      src.updateMatrixWorld(true);
      const group = src.clone(true);
      if (fmt === 'glb') {
        new GLTFExporter().parse(group, (result) => {
          const blob = result instanceof ArrayBuffer
            ? new Blob([result], { type: 'model/gltf-binary' })
            : new Blob([JSON.stringify(result)], { type: 'model/gltf+json' });
          downloadBlob(blob, 'tetrobot.glb');
        }, (err) => console.error('GLB export failed:', err), { binary: true });
        return { ok: true };
      }
      if (fmt === 'obj') {
        downloadBlob(new Blob([new OBJExporter().parse(group)], { type: 'text/plain' }), 'tetrobot.obj');
        return { ok: true };
      }
      if (fmt === 'stl') {
        downloadBlob(new Blob([new STLExporter().parse(group)], { type: 'model/stl' }), 'tetrobot.stl');
        return { ok: true };
      }
      return { ok: false, error: `Unknown format: ${format}` };
    };

    // ── Undo / redo (full-project snapshots: model + animation) ──────────────────
    const history: { undo: string[]; redo: string[]; last: string | null; suppressNext: boolean } = { undo: [], redo: [], last: null, suppressNext: false };
    const applySnapshot = (snapJSON: any) => {
      const d = JSON.parse(snapJSON);
      bridge.loadScene!({ format: 'tetrobot-project', version: 1, scene: d.scene, model: d.model, animation: d.animation }, { fit: false, skipWorkspace: true });
      // Fit camera after undo/redo so restored content is always visible even if
      // a previous file-open moved the camera to a completely different position.
      setTimeout(() => bridge.fitCamera?.(), 120);
    };
    bridge.undo = () => {
      if (!history.undo.length) return;
      if (history.last != null) history.redo.push(history.last);
      const prev = history.undo.pop();
      history.last = prev ?? null;
      history.suppressNext = true;
      applySnapshot(prev);
      useHistoryStore.getState().setFlags(history.undo.length > 0, history.redo.length > 0);
    };
    bridge.redo = () => {
      if (!history.redo.length) return;
      if (history.last != null) history.undo.push(history.last);
      const next = history.redo.pop();
      history.last = next ?? null;
      history.suppressNext = true;
      applySnapshot(next);
      useHistoryStore.getState().setFlags(history.undo.length > 0, history.redo.length > 0);
    };

    // ── Autosave + record undo history when the model/animation settles ──────────

    // Remove assets from the model that aren't referenced by any body.
    // Orphaned assets (e.g. from deleted bodies or experimental imports) can be
    // tens of MB each as base64 strings. With 30 undo entries each carrying a
    // full copy, the heap can exceed 1 GB on large projects and cause the GC to
    // freeze the render loop. The live doc keeps all assets; only snapshots are
    // trimmed so undo/redo never blows up memory.
    function stripOrphanAssets(model: any): any {
      if (!model?.assets || !model?.bodies) return model;
      const used = new Set<string>();
      for (const b of Object.values(model.bodies) as any[]) {
        const id = b.visual?.geometry?.assetId ?? b.assetId;
        if (id) used.add(id);
      }
      const kept: Record<string, any> = {};
      for (const [id, asset] of Object.entries(model.assets)) {
        if (used.has(id)) kept[id] = asset;
      }
      return { ...model, assets: kept };
    }

    let saveTimer: any = null;
    let persisting = false;
    const doSave = async () => {
      persisting = true;
      try {
        const project = serializeProject();
        saveAutosave(project);

        // Undo snapshots strip orphaned assets to keep each entry small.
        const snap = JSON.stringify({ scene: project.scene, model: stripOrphanAssets(project.model), animation: project.animation });
        if (history.suppressNext) {
          history.suppressNext = false;
        } else if (history.last !== null && snap !== history.last) {
          history.undo.push(history.last);
          if (history.undo.length > 30) history.undo.shift();
          history.redo = [];
        }
        history.last = snap;
        useHistoryStore.getState().setFlags(history.undo.length > 0, history.redo.length > 0);

        const docState = useDocStore.getState();
        if (docState.handle) {
          docState.setStatus('saving');
          // Strip orphans from the saved file too — keeps .nischay files lean.
          const cleanProject = { ...project, model: stripOrphanAssets(project.model) };
          try { await writeProjectToHandle(docState.handle, cleanProject); useDocStore.getState().setStatus('saved'); }
          catch { useDocStore.getState().setStatus('idle'); }
        }
      } catch { /* ignore */ }
      finally { persisting = false; }
    };
    const scheduleSave = () => {
      if (persisting) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(doSave, 700);
    };
    // Mark path tracer dirty whenever the model geometry changes.
    const unsubModelPT = useModelStore.subscribe(() => sceneMgr.markPathTracerDirty());
    const unsubModelSave = useModelStore.subscribe(scheduleSave);

    // Body visibility — sync workspaceStore hiddenBodyIds → BodyRenderer on every change.
    const applyHidden = () =>
      modelEditor.bodyRenderer.setHidden(useWorkspaceStore.getState().hiddenBodyIds);
    applyHidden(); // apply current state immediately
    const unsubHidden = useWorkspaceStore.subscribe((s, p) => {
      if (s.hiddenBodyIds !== p.hiddenBodyIds) applyHidden();
    });

    // Auto-update camera zoom limits whenever bodies are added/removed/moved so
    // min/max distance always reflect the current scene scale.
    let lastBodyCount = Object.keys(useModelStore.getState().doc.bodies).length;
    const unsubCamLimits = useModelStore.subscribe((s) => {
      const count = Object.keys(s.doc.bodies).length;
      if (count !== lastBodyCount) { lastBodyCount = count; bridge.updateCameraLimits?.(); }
    });
    const unsubAnimSave = useAnimationStore.subscribe((s, p) => {
      if (s.tracks !== p.tracks || s.duration !== p.duration) scheduleSave();
    });

    // ── Startup restore ─────────────────────────────────────────────────────────
    // loadAutosave is async (IndexedDB). Restore takes <50ms; fitCamera fires
    // 300ms later so the scene will be ready regardless.
    loadAutosave().then(saved => { if (saved) bridge.loadScene?.(saved); }).catch(() => {});
    const fitTimer = setTimeout(() => { bridge.fitCamera?.(); bridge.updateCameraLimits?.(); }, 300);
    const stopMemoryMonitor = startMemoryMonitor(() => modelEditor._doc);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(saveTimer);
      clearTimeout(fitTimer);
      stopMemoryMonitor();
      unsubTheme();
      unsubMeasure();
      unsubModelPT();
      unsubModelSave();
      unsubHidden();
      unsubCamLimits();
      unsubAnimSave();
      unsubAuto();
      unsubReach();
      canvas.removeEventListener('pointerdown', onGoalClick);
      canvas.removeEventListener('pointerdown', onReachPick);
      clearAuto();
      sceneMgr.scene.remove(autoGroup);
      bridge.scanLidar = undefined;
      measureTool.dispose();
      modelEditor.dispose();
      sceneMgr.dispose();
      sceneRef.current = null;
      modelEditorRef.current = null;
    };
  }, []);

  return (
    <Fragment>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      <TransformHUD />
      <ViewportStats />
      <ViewportCtxMenu />
    </Fragment>
  );
}