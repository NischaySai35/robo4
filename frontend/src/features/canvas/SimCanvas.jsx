/**
 * SimCanvas — mounts the Three.js canvas, manages multiple RobotFK instances.
 *
 * Architecture:
 *   • One SceneManager (shared scene + camera + orbit controls)
 *   • One RenderLoop + Interaction for the "active" module
 *   • Additional modules have a RobotFK each; their FK is updated via extraTick
 *   • Connect-mode: Interaction paused, face-plane click listener active
 */

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { SceneManager } from '@/viewport/SceneManager.js';
import { RobotFK }      from '@/viewport/renderers/RobotFK.js';
import { Interaction }  from '@/viewport/Interaction.js';
import { RenderLoop }   from '@/viewport/RenderLoop.js';
import { useArmStore, JOINT_LIMIT } from '@/state/armStore.js';
import { useMultiStore } from '@/state/multiStore.js';
import { useThemeStore } from '@/state/themeStore.js';
import { bridge }        from '@/viewport/cameraBridge.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { solveJacobianIK } from '@/kinematics/jacobianIK.js';
import {
  assemblyModuleIds, captureMate, propagateAssembly, buildCrossModuleChain,
} from '@/viewport/assembly.js';
import { serializeProject, parseProject } from '@/core/serialization/project.js';
import { saveAutosave, loadAutosave } from '@/core/serialization/storage.js';
import { downloadBlob, writeProjectToHandle } from '@/core/serialization/fileIO.js';
import { useDocStore } from '@/state/docStore.js';
import { useHistoryStore } from '@/state/historyStore.js';

const _raycaster = new THREE.Raycaster();

// ── Join math ──────────────────────────────────────────────────────────────────
// The SMALLER assembly (fewer modules) moves onto the larger; tie → face2's side
// moves. The whole mover sub-assembly is transformed rigidly by one delta so its
// internal welds stay intact.
function performJoin(face1, face2, moduleMap) {
  const fk1 = moduleMap.get(face1.moduleId)?.robotFK;
  const fk2 = moduleMap.get(face2.moduleId)?.robotFK;
  if (!fk1 || !fk2) return;

  const ms = useMultiStore.getState();
  const asm1 = assemblyModuleIds(ms.welds, face1.moduleId);
  const asm2 = assemblyModuleIds(ms.welds, face2.moduleId);

  // Decide which side moves: the smaller assembly. Tie → face2's side.
  const moverIsFace2 = asm2.size <= asm1.size;
  const moverFace  = moverIsFace2 ? face2 : face1;
  const anchorFace = moverIsFace2 ? face1 : face2;
  const moverFK    = moverIsFace2 ? fk2 : fk1;
  const anchorFK   = moverIsFace2 ? fk1 : fk2;

  fk1.robotGroup.updateMatrixWorld(true);
  fk2.robotGroup.updateMatrixWorld(true);

  const aMesh = anchorFK.getFaceIndicatorMeshes().find(p => p.userData.faceKey === anchorFace.faceKey);
  const mMesh = moverFK.getFaceIndicatorMeshes().find(p => p.userData.faceKey === moverFace.faceKey);
  if (!aMesh || !mMesh) return;
  aMesh.updateMatrixWorld(true);
  mMesh.updateMatrixWorld(true);

  // Anchor face world pose
  const Pa = aMesh.getWorldPosition(new THREE.Vector3());
  const Na = new THREE.Vector3(0, 0, 1).transformDirection(aMesh.matrixWorld).normalize();
  // Mover face current world pose
  const Pm = mMesh.getWorldPosition(new THREE.Vector3());
  const Nm = new THREE.Vector3(0, 0, 1).transformDirection(mMesh.matrixWorld).normalize();

  // Rotation that makes the mover face antiparallel to the anchor face
  const R = new THREE.Quaternion().setFromUnitVectors(Nm, Na.clone().negate());

  // Mover module's target robotGroup transform (mate the faces)
  const moverPos  = moverFK.robotGroup.position.clone();
  const moverQuat = moverFK.robotGroup.quaternion.clone();
  const Q_new = R.clone().multiply(moverQuat);
  const offset = Pm.clone().sub(moverPos);
  const T_new = Pa.clone().sub(offset.applyQuaternion(R));

  // Rigid delta D that takes the mover from its current pose to the mated pose,
  // applied to EVERY module in the mover's assembly so they all move together.
  const ONE    = new THREE.Vector3(1, 1, 1);
  const oldMat  = new THREE.Matrix4().compose(moverPos, moverQuat, ONE);
  const newMat  = new THREE.Matrix4().compose(T_new, Q_new, ONE);
  const D       = newMat.clone().multiply(oldMat.clone().invert());

  const moverAssembly = assemblyModuleIds(ms.welds, moverFace.moduleId);
  for (const mid of moverAssembly) {
    const fk = moduleMap.get(mid)?.robotFK;
    if (!fk) continue;
    const cur  = new THREE.Matrix4().compose(
      fk.robotGroup.position.clone(), fk.robotGroup.quaternion.clone(), ONE);
    const next = D.clone().multiply(cur);
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    next.decompose(p, q, s);
    fk.robotGroup.position.copy(p);
    fk.robotGroup.quaternion.copy(q);
    fk.robotGroup.updateMatrixWorld(true);
    ms.setModuleTransform(mid, p, q);
  }

  // Capture the rigid face-to-face transform (canonical a=face1, b=face2) now
  // that both sides are in their final joined configuration.
  const mate = captureMate(fk1, face1.faceKey, fk2, face2.faceKey);
  ms.applyJoin({
    a: { moduleId: face1.moduleId, faceKey: face1.faceKey },
    b: { moduleId: face2.moduleId, faceKey: face2.faceKey },
    mate,
  });

  setTimeout(() => { if (bridge.fitCamera) bridge.fitCamera(); }, 80);
}

// ── Which module owns a hit mesh? ─────────────────────────────────────────────
function moduleIdOfMesh(mesh, moduleMap) {
  for (const [mid, { robotFK }] of moduleMap) {
    if (robotFK.interactables.includes(mesh)) return mid;
    if (robotFK.getFaceIndicatorMeshes().includes(mesh)) return mid;
  }
  return null;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SimCanvas() {
  const canvasRef = useRef(null);

  // Stable refs to Three.js state (never causes re-renders)
  const sceneRef       = useRef(null);      // SceneManager
  const renderLoopRef  = useRef(null);      // RenderLoop
  const interactionRef = useRef(null);      // Interaction
  const modulesRef     = useRef(new Map()); // moduleId → { robotFK }
  const activeFKRef    = useRef(null);      // current active RobotFK ref object (passed to Interaction)
  const appliedActiveRef = useRef('module-0'); // which module is CURRENTLY applied (imperative guard)
  const xDragRef         = useRef({ pickup: null }); // cross-module drag session state
  const layoutAnimRef    = useRef(null);             // active module-relayout tween
  const historyRef       = useRef({ undo: [], redo: [], last: null }); // undo/redo snapshots

  // ── One-time mount ───────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas  = canvasRef.current;
    if (!canvas) return;

    const armStore = useArmStore.getState();
    const multiStore = useMultiStore.getState();

    // Scene
    const sceneMgr = new SceneManager(canvas);
    sceneRef.current = sceneMgr;
    sceneMgr.applyTheme(useThemeStore.getState().theme);
    const unsubTheme = useThemeStore.subscribe(s => sceneMgr.applyTheme(s.theme));

    // First module FK
    const initialModule = multiStore.modules[0];
    const fk0 = new RobotFK(sceneMgr.scene);
    fk0.robotGroup.position.set(
      initialModule.position.x,
      initialModule.position.y,
      initialModule.position.z,
    );
    modulesRef.current.set(initialModule.id, { robotFK: fk0 });
    activeFKRef.current = fk0;

    // Interaction — raycasts ALL modules' rods and resolves the owning module,
    // so clicks/drags can target any module in the assembly.
    const interaction = new Interaction(
      canvas,
      sceneMgr.camera,
      () => {
        const all = [];
        for (const [, { robotFK }] of modulesRef.current) all.push(...robotFK.interactables);
        return all;
      },
      (obj) => moduleIdOfMesh(obj, modulesRef.current),
      {},
    );
    interactionRef.current = interaction;

    // Store actions proxy
    const storeActions = {
      setJointAngle:     armStore.setJointAngle,
      setJointTelemetry: armStore.setJointTelemetry,
      setStatus:         armStore.setStatus,
      updateEndEffector: armStore.updateEndEffector,
      setRootRod:        armStore.setRootRod,
      setRootAndAngles:  armStore.setRootAndAngles,
      clearPendingHome:  armStore.clearPendingHome,
      setAllAngles:      armStore.setAllAngles,
      setCollision:      armStore.setCollision,
    };

    const renderLoop = new RenderLoop(
      sceneMgr, fk0, interaction,
      () => useArmStore.getState(),
      storeActions,
    );

    // Collision detection: bounding boxes of modules NOT in the active assembly.
    // Welded neighbours are meant to touch, so they must be excluded.
    renderLoop.getOtherModuleBounds = () => {
      const mStore = useMultiStore.getState();
      const assembly = assemblyModuleIds(mStore.welds, mStore.activeModuleId);
      const boxes = [];
      for (const [mid, { robotFK }] of modulesRef.current) {
        if (assembly.has(mid)) continue;
        robotFK.robotGroup.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(robotFK.robotGroup);
        if (!box.isEmpty()) boxes.push(box);
      }
      return boxes;
    };

    // extraTick: update FK pose for all inactive modules each frame, and advance
    // any in-progress module-relayout animation (e.g. disconnect-all).
    renderLoop.extraTick = () => {
      const mStore = useMultiStore.getState();
      const activeMid = mStore.activeModuleId;
      for (const [mid, { robotFK }] of modulesRef.current) {
        if (mid === activeMid) continue;
        const mState = mStore.modules.find(m => m.id === mid);
        if (!mState) continue;
        robotFK.updateAngles(mState.angles, mState.mode ?? 'horizontal');
      }

      // Module-relayout tween — lerp each module's group toward its target,
      // and (for disconnect-all) ease all joints home at the same time.
      const anim = layoutAnimRef.current;
      if (anim) {
        const raw = Math.min((performance.now() - anim.start) / anim.duration, 1);
        const e = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
        const activeId = appliedActiveRef.current;
        for (const it of anim.items) {
          it.fk.robotGroup.position.lerpVectors(it.startPos, it.endPos, e);
          it.fk.robotGroup.quaternion.slerpQuaternions(it.startQuat, it.endQuat, e);
          if (it.startAngles) {
            const a = it.startAngles.map(v => v * (1 - e));   // ease toward 0 (home)
            if (it.id === activeId) useArmStore.getState().setAllAngles(a);
            else                    it.fk.updateAngles(a, it.mode);
          }
        }
        if (raw >= 1) {
          for (const it of anim.items) {
            if (it.id === activeId) useArmStore.getState().setAllAngles([0, 0, 0, 0, 0, 0]);
            else                    it.fk.updateAngles([0, 0, 0, 0, 0, 0], it.mode);
          }
          layoutAnimRef.current = null;
        }
      }
    };

    // postTick: rigid-follow — re-place every welded neighbour of the active
    // (base) module so faces stay mated as the active module articulates.
    renderLoop.postTick = () => {
      const mStore = useMultiStore.getState();
      if (!mStore.welds.length) return;
      propagateAssembly(
        mStore.activeModuleId,
        mStore.welds,
        (id) => modulesRef.current.get(id)?.robotFK ?? null,
      );
    };

    // onInteractionEnd: persist follower transforms to the store after a drag,
    // so they survive a later module switch (which reloads from the store).
    renderLoop.onInteractionEnd = () => {
      const mStore  = useMultiStore.getState();
      const activeId = mStore.activeModuleId;
      const ids = assemblyModuleIds(mStore.welds, activeId);
      for (const mid of ids) {
        if (mid === activeId) continue;
        const fk = modulesRef.current.get(mid)?.robotFK;
        if (fk) {
          mStore.setModuleTransform(mid,
            fk.robotGroup.position.clone(),
            fk.robotGroup.quaternion.clone());
        }
      }
      // Auto-fit once the drag settles.
      setTimeout(() => { if (bridge.fitCamera) bridge.fitCamera(); }, 60);
    };

    // Home all modules (active animates; followers snap to home), then fit.
    bridge.homeAll = () => {
      useArmStore.getState().homeArm();
      const ms = useMultiStore.getState();
      const activeId = appliedActiveRef.current;
      for (const [mid, { robotFK }] of modulesRef.current) {
        if (mid === activeId) continue;
        const mode = ms.modules.find(m => m.id === mid)?.mode ?? 'horizontal';
        ms.setModuleAngles(mid, [0, 0, 0, 0, 0, 0]);
        robotFK.updateAngles([0, 0, 0, 0, 0, 0], mode);
      }
      setTimeout(() => { if (bridge.fitCamera) bridge.fitCamera(); }, 900);
    };

    // E-STOP — halt all motion immediately.
    bridge.estop = () => renderLoopRef.current?.cancelMotion();

    // Disconnect every module, home all joints, and lay them out fresh — all
    // animated smoothly from wherever each module currently is.
    bridge.disconnectAll = () => {
      renderLoopRef.current?.cancelMotion();           // stop any drag/home in progress
      const armState = useArmStore.getState();
      const before   = useMultiStore.getState();
      const activeId = appliedActiveRef.current;

      // Snapshot current live transforms + angles BEFORE the store layout changes.
      const starts = new Map();
      for (const [mid, { robotFK }] of modulesRef.current) {
        robotFK.robotGroup.updateMatrixWorld(true);
        const m = before.modules.find(x => x.id === mid);
        starts.set(mid, {
          pos:    robotFK.robotGroup.position.clone(),
          quat:   robotFK.robotGroup.quaternion.clone(),
          angles: mid === activeId ? [...armState.jointAngles] : [...(m?.angles ?? [0,0,0,0,0,0])],
          mode:   mid === activeId ? (armState.mode || 'horizontal') : (m?.mode ?? 'horizontal'),
        });
      }

      useMultiStore.getState().disconnectAll(); // clears welds, homes angles, sets layout

      const items = [];
      for (const mod of useMultiStore.getState().modules) {
        const fk = modulesRef.current.get(mod.id)?.robotFK;
        const st = starts.get(mod.id);
        if (!fk || !st) continue;
        items.push({
          id: mod.id, fk, mode: st.mode,
          startPos: st.pos, startQuat: st.quat, startAngles: st.angles,
          endPos:  new THREE.Vector3(mod.position.x, mod.position.y, mod.position.z),
          endQuat: new THREE.Quaternion(mod.quaternion.x, mod.quaternion.y, mod.quaternion.z, mod.quaternion.w),
        });
      }
      layoutAnimRef.current = { items, start: performance.now(), duration: 800 };
      setTimeout(() => { if (bridge.fitCamera) bridge.fitCamera(); }, 820);
    };

    renderLoopRef.current = renderLoop;
    renderLoop.start();

    // Return the combined bounding-box corners of every module so fitCamera
    // considers all arms, not just the active one.
    bridge.getArmNodes = () => {
      const combined = new THREE.Box3();
      let any = false;
      for (const [, { robotFK }] of modulesRef.current) {
        robotFK.robotGroup.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(robotFK.robotGroup);
        if (!box.isEmpty()) { combined.union(box); any = true; }
      }
      if (!any) return [];
      // fitCamera only needs a point cloud; min + max + center give it a correct sphere
      const c = new THREE.Vector3();
      combined.getCenter(c);
      return [
        { x: combined.min.x, y: combined.min.y, z: combined.min.z },
        { x: combined.max.x, y: combined.max.y, z: combined.max.z },
        { x: c.x, y: c.y, z: c.z },
      ];
    };

    // Compute a clear spawn position for a new module from the live world bounds
    // of every existing module. A fresh module is anchored at its origin and
    // extends along +X with only ~±0.2 thickness in Z, so placing its origin
    // just beyond the assembly's +Z edge guarantees no overlap / instant collision.
    bridge.computeFreeSpawn = () => {
      const combined = new THREE.Box3();
      let any = false;
      for (const [, { robotFK }] of modulesRef.current) {
        robotFK.robotGroup.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(robotFK.robotGroup);
        if (!box.isEmpty()) { combined.union(box); any = true; }
      }
      if (!any) return { x: 0, y: 0, z: 0 };
      return { x: 0, y: 0, z: combined.max.z + 1.2 };
    };

    // ── Persistence bridge ────────────────────────────────────────────────────
    // Commit the live active module (armStore + live FK transform) into multiStore
    // so the store is the single source of truth before serialization.
    bridge.commitLiveState = () => {
      const mStore   = useMultiStore.getState();
      const armStore = useArmStore.getState();
      const activeId = appliedActiveRef.current;
      const fk       = activeFKRef.current;
      if (fk && activeId && mStore.modules.some(m => m.id === activeId)) {
        mStore.saveModuleState(activeId, {
          angles:       [...armStore.jointAngles],
          activeRootId: armStore.activeRootId,
          position:     fk.robotGroup.position.clone(),
          quaternion:   fk.robotGroup.quaternion.clone(),
          mode:         armStore.mode,
        });
      }
      for (const [mid, { robotFK }] of modulesRef.current) {
        if (mid === activeId) continue;
        mStore.setModuleTransform(mid,
          robotFK.robotGroup.position.clone(),
          robotFK.robotGroup.quaternion.clone());
      }
    };

    // Replace the whole scene from a parsed project (tears down + rebuilds FKs).
    // opts.fit === false skips the camera refit (used by undo/redo).
    bridge.loadScene = (project, opts = {}) => {
      const sceneMgr = sceneRef.current;
      if (!sceneMgr) return { ok: false, error: 'scene not ready' };
      let scene;
      try { scene = parseProject(project); }
      catch (e) { return { ok: false, error: e.message }; }

      // Tear down every existing module FK
      for (const [, { robotFK }] of modulesRef.current) {
        sceneMgr.scene.remove(robotFK.robotGroup);
      }
      modulesRef.current.clear();

      // Replace store state
      useMultiStore.setState({
        modules: scene.modules,
        welds: scene.welds,
        activeModuleId: scene.activeModuleId,
        nextId: scene.nextId,
        connectMode: false, disconnectMode: false, deleteMode: false,
        dSel1: null, dSel2: null, face1: null, face2: null,
        connectError: null, disconnectError: null,
      });

      // Build fresh FKs at their stored transforms / poses
      for (const mod of scene.modules) {
        const fk = new RobotFK(sceneMgr.scene);
        fk.robotGroup.position.set(mod.position.x, mod.position.y, mod.position.z);
        fk.robotGroup.quaternion.set(
          mod.quaternion.x, mod.quaternion.y, mod.quaternion.z, mod.quaternion.w);
        fk.updateAngles(mod.angles, mod.mode ?? 'horizontal');
        modulesRef.current.set(mod.id, { robotFK: fk });
      }

      // Force activation of the loaded active module
      appliedActiveRef.current = '__none__';
      activeFKRef.current = null;
      activateModule(scene.activeModuleId);

      if (opts.fit !== false) setTimeout(() => { if (bridge.fitCamera) bridge.fitCamera(); }, 60);
      return { ok: true };
    };

    // ── Undo / redo (full-scene snapshots) ────────────────────────────────────
    const applySnapshot = (sceneJSON) => {
      bridge.loadScene({ format: 'tetrobot-project', version: 1, scene: JSON.parse(sceneJSON) }, { fit: false });
    };
    bridge.undo = () => {
      const h = historyRef.current;
      if (!h.undo.length) return;
      if (h.last != null) h.redo.push(h.last);
      const prev = h.undo.pop();
      h.last = prev;
      h.suppressNext = true;
      applySnapshot(prev);
      useHistoryStore.getState().setFlags(h.undo.length > 0, h.redo.length > 0);
    };
    bridge.redo = () => {
      const h = historyRef.current;
      if (!h.redo.length) return;
      if (h.last != null) h.undo.push(h.last);
      const next = h.redo.pop();
      h.last = next;
      h.suppressNext = true;
      applySnapshot(next);
      useHistoryStore.getState().setFlags(h.undo.length > 0, h.redo.length > 0);
    };

    // Export all visible module geometry. format ∈ {glb,obj,stl,step}.
    // Returns { ok, error? } so the UI can surface unsupported formats.
    bridge.exportModel = (format) => {
      const fmt = (format || 'glb').toLowerCase();
      if (fmt === 'step') {
        return { ok: false, error:
          'STEP is a CAD (solid) format — exporting tessellated meshes to STEP needs a CAD kernel, so it isn’t supported yet. Use OBJ / STL / GLB, or import the .nischay file into Blender.' };
      }

      // Combined group of visible rod/joint meshes (drop invisible face planes).
      const group = new THREE.Group();
      for (const [, { robotFK }] of modulesRef.current) {
        robotFK.robotGroup.updateMatrixWorld(true);
        group.add(robotFK.robotGroup.clone(true));
      }
      const strip = [];
      group.traverse(o => {
        if (o.isMesh && (o.visible === false || o.userData?.type === 'face')) strip.push(o);
      });
      strip.forEach(o => o.parent && o.parent.remove(o));

      if (fmt === 'glb') {
        new GLTFExporter().parse(group, (result) => {
          const blob = result instanceof ArrayBuffer
            ? new Blob([result], { type: 'model/gltf-binary' })
            : new Blob([JSON.stringify(result)], { type: 'model/gltf+json' });
          downloadBlob(blob, 'tetrobot.glb');
        }, (err) => console.error('GLB export failed:', err), { binary: true, onlyVisible: true });
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

    // ── Startup restore + auto-save ───────────────────────────────────────────
    const saved = loadAutosave();
    if (saved) bridge.loadScene(saved);

    let saveTimer = null;
    let persisting = false;
    const doSave = async () => {
      persisting = true;
      try {
        const project = serializeProject();
        saveAutosave(project);                       // local crash-safety net

        // Undo history — push the previous settled snapshot when the scene changes.
        const snap = JSON.stringify(project.scene);
        const h = historyRef.current;
        if (h.suppressNext) {
          h.suppressNext = false;                    // settle after an undo/redo — don't record
        } else if (h.last !== null && snap !== h.last) {
          h.undo.push(h.last);
          if (h.undo.length > 20) h.undo.shift();    // keep ~20 moves
          h.redo = [];
        }
        h.last = snap;
        useHistoryStore.getState().setFlags(h.undo.length > 0, h.redo.length > 0);
        const doc = useDocStore.getState();
        if (doc.handle) {                            // also write to the open file
          doc.setStatus('saving');
          try {
            await writeProjectToHandle(doc.handle, project);
            useDocStore.getState().setStatus('saved');
          } catch {
            useDocStore.getState().setStatus('idle'); // permission lost / removed
          }
        }
      } catch { /* ignore */ }
      finally { persisting = false; }
    };
    const scheduleSave = () => {
      if (persisting) return;            // ignore store writes caused by our own save
      clearTimeout(saveTimer);
      saveTimer = setTimeout(doSave, 800);
    };
    const unsubMulti = useMultiStore.subscribe(scheduleSave);
    const unsubArm   = useArmStore.subscribe(scheduleSave);

    const fitTimer = setTimeout(() => { if (bridge.fitCamera) bridge.fitCamera(); }, 300);

    return () => {
      clearTimeout(fitTimer);
      clearTimeout(saveTimer);
      unsubMulti();
      unsubArm();
      unsubTheme();
      renderLoop.stop();
      interaction.dispose();
      sceneMgr.dispose();
      modulesRef.current.clear();
      sceneRef.current  = null;
      renderLoopRef.current = null;
      interactionRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── React to module additions/removals ───────────────────────────────────────
  const moduleIds = useMultiStore(s => s.modules.map(m => m.id).join(','));

  useEffect(() => {
    const sceneMgr = sceneRef.current;
    if (!sceneMgr) return;

    const mStore = useMultiStore.getState();

    // Add newly created modules to the scene
    for (const mod of mStore.modules) {
      if (!modulesRef.current.has(mod.id)) {
        const fk = new RobotFK(sceneMgr.scene);
        fk.robotGroup.position.set(mod.position.x, mod.position.y, mod.position.z);
        fk.robotGroup.quaternion.set(
          mod.quaternion.x, mod.quaternion.y, mod.quaternion.z, mod.quaternion.w,
        );
        fk.updateAngles(mod.angles, mod.mode ?? 'horizontal');
        // If connect mode is already active, show face planes on the new module too
        if (mStore.connectMode) {
          fk.showFaceIndicators(true);
        }
        modulesRef.current.set(mod.id, { robotFK: fk });
      }
    }

    // Remove deleted modules
    for (const [mid, { robotFK }] of modulesRef.current) {
      if (!mStore.modules.find(m => m.id === mid)) {
        sceneMgr.scene.remove(robotFK.robotGroup);
        modulesRef.current.delete(mid);
      }
    }

    // Re-fit camera smoothly after any add/remove (small delay lets the FK settle into position)
    const fitTimer = setTimeout(() => { if (bridge.fitCamera) bridge.fitCamera(); }, 80);
    return () => clearTimeout(fitTimer);
  }, [moduleIds]);

  // ── Active-module activation (imperative, reusable) ──────────────────────────
  // Save the outgoing module's live state, load the incoming module, rebuild its
  // FK, and swap it into the RenderLoop/Interaction. Guarded by appliedActiveRef
  // so it runs exactly once per switch whether triggered by the store-effect below
  // or imperatively by the cross-module pointer handler.
  const activateModule = useCallback((targetId) => {
    const renderLoop = renderLoopRef.current;
    if (!renderLoop) return;
    if (appliedActiveRef.current === targetId) return; // already applied

    const mStore   = useMultiStore.getState();
    const armStore = useArmStore.getState();

    // 1. Save outgoing active module state
    const outFK  = activeFKRef.current;
    const prevId = appliedActiveRef.current;
    if (outFK && prevId && prevId !== targetId) {
      mStore.saveModuleState(prevId, {
        angles:       [...armStore.jointAngles],
        activeRootId: armStore.activeRootId,
        position:     outFK.robotGroup.position.clone(),
        quaternion:   outFK.robotGroup.quaternion.clone(),
        mode:         armStore.mode,
      });
    }

    // 2. Load incoming module — keep its CURRENT live world transform.
    // The FK already exists and is correctly placed: for welded followers it's
    // kept up to date by rigid-follow every frame, whereas the store copy is only
    // persisted on drag-end and can be stale — reading the store here made the
    // whole module jump on switch.
    const incoming = mStore.modules.find(m => m.id === targetId);
    const inFK     = modulesRef.current.get(targetId)?.robotFK;
    if (!incoming || !inFK) return;

    const livePos  = inFK.robotGroup.position.clone();
    const liveQuat = inFK.robotGroup.quaternion.clone();

    // Push state into armStore so LeftPanel/RenderLoop read the right module
    armStore.setRootAndAngles(incoming.activeRootId, incoming.angles);
    inFK.rebuild(incoming.activeRootId, incoming.angles, livePos, liveQuat);

    // 3. Swap active FK in RenderLoop (Interaction reads it via activeFKRef closure)
    activeFKRef.current = inFK;
    renderLoop.swapRobotFK(inFK);

    // Force world matrices current NOW: when this runs mid-gesture (cross-module
    // pointerdown) the Interaction raycast fires before the next render, so the
    // freshly-rebuilt meshes must already have valid world transforms.
    inFK.robotGroup.updateMatrixWorld(true);

    if (mStore.connectMode) inFK.showFaceIndicators(true);

    appliedActiveRef.current = targetId;
  }, []);

  // React to store-driven active-module changes (dropdown, programmatic, etc.)
  const activeModuleId = useMultiStore(s => s.activeModuleId);
  useEffect(() => {
    activateModule(activeModuleId);
  }, [activeModuleId, activateModule]);

  // ── Cross-module IK provider ─────────────────────────────────────────────────
  // Solve the combined chain from the base module's root to a rod dragged in a
  // welded follower; bends joints across all modules on the path.
  const crossModuleStep = useCallback((dragId, dragRodId, mouseNDC, mode, dragStart) => {
    const camera = sceneRef.current?.camera;
    if (!camera || !dragId || !dragRodId) return;

    const baseId = appliedActiveRef.current;
    const ms = useMultiStore.getState();
    const as = useArmStore.getState();

    const getFK     = (id) => modulesRef.current.get(id)?.robotFK ?? null;
    const getAngles = (id) => id === baseId
      ? as.jointAngles
      : (ms.modules.find(m => m.id === id)?.angles ?? [0, 0, 0, 0, 0, 0]);

    const chain = buildCrossModuleChain({
      welds: ms.welds, getFK, getAngles,
      baseId, baseRootRodId: as.activeRootId,
      dragId, dragRodId, mode,
    });
    if (!chain) return;

    // First frame of the drag: capture pickup offset so the node doesn't snap.
    if (dragStart) {
      const s0 = chain.dragPos.clone().project(camera);
      xDragRef.current.pickup = { x: mouseNDC.x - s0.x, y: mouseNDC.y - s0.y };
      return;
    }
    const pickup = xDragRef.current.pickup ?? { x: 0, y: 0 };

    const activeJoints = chain.jointData.map((_, i) => i);
    const solved = solveJacobianIK(
      chain.dragPos, chain.jointData, activeJoints, camera,
      { x: mouseNDC.x, y: mouseNDC.y }, pickup,
      chain.angles, chain.defs, JOINT_LIMIT, 0.008, 0.5,
    );

    // Regroup solved angles per module (seed each with its current angles)
    const perModule = new Map();
    const seed = (id) => {
      if (!perModule.has(id)) perModule.set(id, [...getAngles(id)]);
      return perModule.get(id);
    };
    chain.backmap.forEach((bm, i) => { seed(bm.moduleId)[bm.localIdx] = solved[i]; });

    // Apply tentatively to every involved FK, then re-place followers
    for (const [mid, angs] of perModule) {
      const fk = getFK(mid);
      if (fk) fk.updateAngles(angs, mode);
    }
    propagateAssembly(baseId, ms.welds, getFK);

    // ── Collision gate (whole assembly) ──────────────────────────────────────
    let collision = false;
    const RODS = ['R1','R2','R3','R4','R5','R6','R7'];
    const assembly = assemblyModuleIds(ms.welds, baseId);

    // (a) Self-collision for every module whose joints changed this step
    selfCheck: for (const mid of perModule.keys()) {
      const fk = getFK(mid);
      if (!fk) continue;
      const lb = fk.getLinkBounds();
      for (let i = 0; i < RODS.length; i++) {
        for (let j = i + 3; j < RODS.length; j++) {
          const a = lb[RODS[i]], b = lb[RODS[j]];
          if (a && b && a.clone().expandByScalar(-0.02).intersectsBox(b.clone().expandByScalar(-0.02))) {
            collision = true; break selfCheck;
          }
        }
      }
    }

    // (b) Inter-module: any assembly module overlapping a NON-welded module
    //     (skips directly-welded pairs — those are meant to touch).
    if (!collision) {
      const boxes = new Map();
      const boxOf = (id) => {
        if (boxes.has(id)) return boxes.get(id);
        const fk = getFK(id);
        if (!fk) { boxes.set(id, null); return null; }
        fk.robotGroup.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(fk.robotGroup);
        boxes.set(id, box);
        return box;
      };
      const welded = (x, y) => ms.welds.some(w => {
        const s = new Set([w.a.moduleId, w.b.moduleId]);
        return s.has(x) && s.has(y);
      });
      const allIds = [...modulesRef.current.keys()];
      interCheck: for (const aid of assembly) {
        const ba = boxOf(aid);
        if (!ba) continue;
        for (const bid of allIds) {
          if (bid === aid || welded(aid, bid)) continue;
          const bb = boxOf(bid);
          if (bb && ba.clone().expandByScalar(-0.05).intersectsBox(bb.clone().expandByScalar(-0.05))) {
            collision = true; break interCheck;
          }
        }
      }
    }

    if (collision) {
      // Revert FKs to their pre-step angles (stores were never committed)
      for (const [mid] of perModule) {
        const fk = getFK(mid);
        if (fk) fk.updateAngles(getAngles(mid), mode);
      }
      propagateAssembly(baseId, ms.welds, getFK);
      useArmStore.getState().setCollision(true);
      return;
    }

    // Commit: base → armStore, followers → multiStore
    for (const [mid, angs] of perModule) {
      if (mid === baseId) useArmStore.getState().setAllAngles(angs);
      else                ms.setModuleAngles(mid, angs);
    }
    useArmStore.getState().setCollision(false);
  }, []);

  const crossModuleEnd = useCallback(() => {
    xDragRef.current.pickup = null;
  }, []);

  // Inject cross-module hooks into the RenderLoop (callbacks are stable)
  useEffect(() => {
    const rl = renderLoopRef.current;
    if (!rl) return;
    rl.getActiveModuleId = () => appliedActiveRef.current;
    rl.activateModule    = (id) => { activateModule(id); useMultiStore.getState().setActiveModule(id); };
    rl.crossModuleStep   = crossModuleStep;
    rl.crossModuleEnd    = crossModuleEnd;
    rl.isInActiveAssembly = (id) => {
      const ms = useMultiStore.getState();
      return assemblyModuleIds(ms.welds, appliedActiveRef.current).has(id);
    };
  }, [activateModule, crossModuleStep, crossModuleEnd]);

  // Cross-module selection/drag is now handled directly by Interaction (it
  // raycasts all modules and reports the owning module to RenderLoop's
  // onRootClick / onDragStart callbacks) — no capture-phase handler needed.

  // ── Connect mode (face selection) ────────────────────────────────────────────
  const connectMode = useMultiStore(s => s.connectMode);

  useEffect(() => {
    const interaction = interactionRef.current;
    const renderLoop  = renderLoopRef.current;
    if (!interaction || !renderLoop) return;

    interaction.paused = connectMode;
    renderLoop.setConnectMode(connectMode);

    // Show/hide face indicator planes on all modules
    for (const [, { robotFK }] of modulesRef.current) {
      robotFK.showFaceIndicators(connectMode);
      if (!connectMode) robotFK.resetFaceHighlights();
    }
  }, [connectMode]);

  // ── Disconnect mode ──────────────────────────────────────────────────────────
  const disconnectMode = useMultiStore(s => s.disconnectMode);

  useEffect(() => {
    const interaction = interactionRef.current;
    const renderLoop  = renderLoopRef.current;
    if (!interaction || !renderLoop) return;

    // Reuse the same paused flag; both modes block normal interaction
    if (!connectMode) {
      interaction.paused = disconnectMode;
      renderLoop.setConnectMode(disconnectMode);
    }
  }, [disconnectMode, connectMode]);

  // Disconnect click: user clicks any rod on a module to select it (two modules required)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !disconnectMode) return;

    let downX = 0, downY = 0;
    const onDown = (e) => { downX = e.clientX; downY = e.clientY; };
    const onUp   = (e) => {
      const dx = e.clientX - downX, dy = e.clientY - downY;
      if (Math.sqrt(dx * dx + dy * dy) > 5) return;

      const sceneMgr = sceneRef.current;
      if (!sceneMgr) return;

      const rect = canvas.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      const ndcY = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

      _raycaster.setFromCamera({ x: ndcX, y: ndcY }, sceneMgr.camera);

      // Collect all rod meshes across all modules
      const allMeshes = [];
      for (const [, { robotFK }] of modulesRef.current) {
        allMeshes.push(...robotFK.interactables);
      }

      const hits = _raycaster.intersectObjects(allMeshes, false);
      if (!hits.length) return;

      const clickedMid = moduleIdOfMesh(hits[0].object, modulesRef.current);
      if (!clickedMid) return;

      const ms = useMultiStore.getState();

      if (!ms.dSel1) {
        ms.setDSel1(clickedMid);
      } else if (ms.dSel1 === clickedMid) {
        ms.setDisconnectError('Select a DIFFERENT module.');
        setTimeout(() => useMultiStore.getState().setDisconnectError(null), 1500);
      } else {
        ms.setDSel2(clickedMid);
        // Execute disconnect: move the module to its free z-slot, then persist
        const fkB = modulesRef.current.get(clickedMid)?.robotFK;
        if (fkB) {
          const modules = ms.modules;
          const usedSlots = new Set(
            modules.filter(m => m.id !== clickedMid).map(m => Math.round(m.position.z / 4))
          );
          let slot = 0;
          while (usedSlots.has(slot)) slot++;
          fkB.robotGroup.position.set(0, 0, slot * 4.0);
          fkB.robotGroup.quaternion.identity();
        }
        ms.applyDisconnect(clickedMid);
        setTimeout(() => { if (bridge.fitCamera) bridge.fitCamera(); }, 80);
      }
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mouseup',   onUp);
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mouseup',   onUp);
    };
  }, [disconnectMode]);

  // ── Delete mode ──────────────────────────────────────────────────────────────
  const deleteMode = useMultiStore(s => s.deleteMode);

  useEffect(() => {
    const interaction = interactionRef.current;
    const renderLoop  = renderLoopRef.current;
    if (!interaction || !renderLoop) return;
    if (!connectMode && !disconnectMode) {
      interaction.paused = deleteMode;
      renderLoop.setConnectMode(deleteMode);
    }
  }, [deleteMode, connectMode, disconnectMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !deleteMode) return;

    let downX = 0, downY = 0;
    const onDown = (e) => { downX = e.clientX; downY = e.clientY; };
    const onUp   = (e) => {
      const dx = e.clientX - downX, dy = e.clientY - downY;
      if (Math.sqrt(dx * dx + dy * dy) > 5) return;

      const sceneMgr = sceneRef.current;
      if (!sceneMgr) return;

      const rect = canvas.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      const ndcY = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

      _raycaster.setFromCamera({ x: ndcX, y: ndcY }, sceneMgr.camera);

      const allMeshes = [];
      for (const [, { robotFK }] of modulesRef.current) {
        allMeshes.push(...robotFK.interactables);
      }

      const hits = _raycaster.intersectObjects(allMeshes, false);
      if (!hits.length) return;

      const clickedMid = moduleIdOfMesh(hits[0].object, modulesRef.current);
      if (!clickedMid) return;

      const ms = useMultiStore.getState();
      if (ms.modules.length <= 1) return; // guard

      ms.setDeleteMode(false);
      ms.removeModule(clickedMid);
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mouseup',   onUp);
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mouseup',   onUp);
    };
  }, [deleteMode]);

  // ── Face click handler (connect mode only) ───────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !connectMode) return;

    let downX = 0, downY = 0;
    const onDown = (e) => { downX = e.clientX; downY = e.clientY; };
    const onUp   = (e) => {
      const dx = e.clientX - downX, dy = e.clientY - downY;
      if (Math.sqrt(dx * dx + dy * dy) > 5) return; // ignore drags

      const sceneMgr = sceneRef.current;
      if (!sceneMgr) return;

      const rect = canvas.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      const ndcY = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

      _raycaster.setFromCamera({ x: ndcX, y: ndcY }, sceneMgr.camera);

      // Collect all face planes, tagging with moduleId
      const allPlanes = [];
      for (const [mid, { robotFK }] of modulesRef.current) {
        for (const p of robotFK.getFaceIndicatorMeshes()) {
          p.userData.moduleId = mid;
          allPlanes.push(p);
        }
      }

      const hits = _raycaster.intersectObjects(allPlanes, false);
      if (!hits.length) return;

      const hit       = hits[0].object;
      const faceKey   = hit.userData.faceKey;
      const clickedMid = hit.userData.moduleId;
      const clickedFK  = modulesRef.current.get(clickedMid)?.robotFK;
      if (!clickedFK) return;

      const ms = useMultiStore.getState();

      if (!ms.face1) {
        // First face selection
        ms.setFace1({ moduleId: clickedMid, faceKey });
        clickedFK.setFaceHighlight(faceKey, 'selected1');
      } else {
        if (clickedMid === ms.face1.moduleId) {
          // Same module — error feedback
          ms.setConnectError('Select a face from a DIFFERENT module.');
          clickedFK.setFaceHighlight(faceKey, 'error');
          setTimeout(() => {
            clickedFK.setFaceHighlight(faceKey, 'normal');
            useMultiStore.getState().setConnectError(null);
          }, 1500);
        } else {
          // Second face from different module → execute join
          ms.setFace2({ moduleId: clickedMid, faceKey });
          clickedFK.setFaceHighlight(faceKey, 'selected2');
          performJoin(ms.face1, { moduleId: clickedMid, faceKey }, modulesRef.current);
        }
      }
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mouseup',   onUp);
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mouseup',   onUp);
    };
  }, [connectMode]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
