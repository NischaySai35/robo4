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
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SceneManager } from '@/viewport/SceneManager.js';
import { ModelEditor } from '@/viewport/ModelEditor.js';
import { MeasureTool } from '@/viewport/MeasureTool.js';
import { useThemeStore } from '@/state/themeStore.js';
import { useEditorStore } from '@/state/editorStore.js';
import { bridge } from '@/viewport/cameraBridge.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { serializeProject, parseProject } from '@/core/serialization/project.js';
import { saveAutosave, loadAutosave } from '@/core/serialization/storage.js';
import { downloadBlob, writeProjectToHandle } from '@/core/serialization/fileIO.js';
import { useDocStore } from '@/state/docStore.js';
import { useHistoryStore } from '@/state/historyStore.js';
import { useModelStore } from '@/state/modelStore.js';
import { useAnimationStore } from '@/state/animationStore.js';

export default function SimCanvas() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const modelEditorRef = useRef(null);

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

    // FIT bounding box over the model bodies.
    bridge.getFitBox = () => {
      const g = modelEditor.bodyRenderer?.group;
      if (!g || g.children.length === 0) return null;
      g.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(g);
      return box.isEmpty() ? null : box;
    };

    // Measure tool (Phase 3) — raycasts model bodies.
    const measureTool = new MeasureTool({
      scene: sceneMgr.scene,
      camera: sceneMgr.camera,
      domElement: sceneMgr.renderer.domElement,
      getMeshes: () => [modelEditor.bodyRenderer.group],
      onResult: (r) => useEditorStore.getState().setMeasureResult(r),
    });
    let lastMeasure = false;
    const unsubMeasure = useEditorStore.subscribe((s) => {
      if (s.measureMode === lastMeasure) return;
      lastMeasure = s.measureMode;
      if (s.measureMode) measureTool.enable();
      else measureTool.disable();
    });

    // ── Render loop ───────────────────────────────────────────────────────────
    let raf = null;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      modelEditor.tick();   // physics step / animation preview when active
      sceneMgr.render();
    };
    raf = requestAnimationFrame(loop);

    // ── Load a project (model + animation) ──────────────────────────────────────
    bridge.loadScene = (project, opts = {}) => {
      let scene;
      try { scene = parseProject(project); }
      catch (e) { return { ok: false, error: e.message }; }
      if (scene.model) useModelStore.getState().loadDocument(scene.model);
      if (scene.animation) useAnimationStore.getState().loadClip(scene.animation);
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
    const history = { undo: [], redo: [], last: null, suppressNext: false };
    const applySnapshot = (snapJSON) => {
      const d = JSON.parse(snapJSON);
      bridge.loadScene({ format: 'tetrobot-project', version: 1, scene: d.scene, model: d.model, animation: d.animation }, { fit: false });
    };
    bridge.undo = () => {
      if (!history.undo.length) return;
      if (history.last != null) history.redo.push(history.last);
      const prev = history.undo.pop();
      history.last = prev;
      history.suppressNext = true;
      applySnapshot(prev);
      useHistoryStore.getState().setFlags(history.undo.length > 0, history.redo.length > 0);
    };
    bridge.redo = () => {
      if (!history.redo.length) return;
      if (history.last != null) history.undo.push(history.last);
      const next = history.redo.pop();
      history.last = next;
      history.suppressNext = true;
      applySnapshot(next);
      useHistoryStore.getState().setFlags(history.undo.length > 0, history.redo.length > 0);
    };

    // ── Autosave + record undo history when the model/animation settles ──────────
    let saveTimer = null;
    let persisting = false;
    const doSave = async () => {
      persisting = true;
      try {
        const project = serializeProject();
        saveAutosave(project);

        const snap = JSON.stringify({ scene: project.scene, model: project.model, animation: project.animation });
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
          try { await writeProjectToHandle(docState.handle, project); useDocStore.getState().setStatus('saved'); }
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
    const unsubModelSave = useModelStore.subscribe(scheduleSave);
    const unsubAnimSave = useAnimationStore.subscribe((s, p) => {
      if (s.tracks !== p.tracks || s.duration !== p.duration) scheduleSave();
    });

    // ── Startup restore ─────────────────────────────────────────────────────────
    const saved = loadAutosave();
    if (saved) bridge.loadScene(saved);
    const fitTimer = setTimeout(() => bridge.fitCamera?.(), 300);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(saveTimer);
      clearTimeout(fitTimer);
      unsubTheme();
      unsubMeasure();
      unsubModelSave();
      unsubAnimSave();
      measureTool.dispose();
      modelEditor.dispose();
      sceneMgr.dispose();
      sceneRef.current = null;
      modelEditorRef.current = null;
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
  );
}
