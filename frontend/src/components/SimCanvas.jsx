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
import { SceneManager } from '../three/SceneManager.js';
import { RobotFK }      from '../three/RobotFK.js';
import { Interaction }  from '../three/Interaction.js';
import { RenderLoop }   from '../three/RenderLoop.js';
import { useArmStore }  from '../store/armStore.js';
import { useMultiStore } from '../store/multiStore.js';
import { bridge }        from '../three/cameraBridge.js';

const _raycaster = new THREE.Raycaster();

// ── Join math ──────────────────────────────────────────────────────────────────
function performJoin(face1, face2, moduleMap) {
  const fkA = moduleMap.get(face1.moduleId)?.robotFK;
  const fkB = moduleMap.get(face2.moduleId)?.robotFK;
  if (!fkA || !fkB) return;

  fkA.robotGroup.updateMatrixWorld(true);
  fkB.robotGroup.updateMatrixWorld(true);

  const p1Mesh = fkA.getFaceIndicatorMeshes().find(p => p.userData.faceKey === face1.faceKey);
  const p2Mesh = fkB.getFaceIndicatorMeshes().find(p => p.userData.faceKey === face2.faceKey);
  if (!p1Mesh || !p2Mesh) return;

  p1Mesh.updateMatrixWorld(true);
  p2Mesh.updateMatrixWorld(true);

  // Face A world position and outward normal
  const P1 = p1Mesh.getWorldPosition(new THREE.Vector3());
  const N1 = new THREE.Vector3(0, 0, 1).transformDirection(p1Mesh.matrixWorld).normalize();

  // Face B world position and outward normal
  const P2 = p2Mesh.getWorldPosition(new THREE.Vector3());
  const N2 = new THREE.Vector3(0, 0, 1).transformDirection(p2Mesh.matrixWorld).normalize();

  // Rotation that makes N2 antiparallel to N1 (faces touch)
  const targetNormal = N1.clone().negate();
  const R_align = new THREE.Quaternion().setFromUnitVectors(N2, targetNormal);

  // New quaternion for module B
  const Q_new = R_align.clone().multiply(fkB.robotGroup.quaternion);

  // New position: keep face B's world position == face A's world position
  const T_old  = fkB.robotGroup.position.clone();
  const offset = P2.clone().sub(T_old);             // B-origin → face2 (world)
  const T_new  = P1.clone().sub(offset.applyQuaternion(R_align));

  fkB.robotGroup.position.copy(T_new);
  fkB.robotGroup.quaternion.copy(Q_new);

  useMultiStore.getState().applyJoin(face2.moduleId, T_new, Q_new);
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

  // ── One-time mount ───────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas  = canvasRef.current;
    if (!canvas) return;

    const armStore = useArmStore.getState();
    const multiStore = useMultiStore.getState();

    // Scene
    const sceneMgr = new SceneManager(canvas);
    sceneRef.current = sceneMgr;

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

    // Interaction — always queries the current active FK via closure
    const interaction = new Interaction(
      canvas,
      sceneMgr.camera,
      () => activeFKRef.current?.interactables ?? [],
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

    // Collision detection: supply bounding boxes of all non-active modules
    renderLoop.getOtherModuleBounds = () => {
      const activeId = useMultiStore.getState().activeModuleId;
      const boxes = [];
      for (const [mid, { robotFK }] of modulesRef.current) {
        if (mid === activeId) continue;
        robotFK.robotGroup.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(robotFK.robotGroup);
        if (!box.isEmpty()) boxes.push(box);
      }
      return boxes;
    };

    // extraTick: update FK for all inactive modules each frame
    renderLoop.extraTick = () => {
      const mStore = useMultiStore.getState();
      const activeMid = mStore.activeModuleId;
      for (const [mid, { robotFK }] of modulesRef.current) {
        if (mid === activeMid) continue;
        const mState = mStore.modules.find(m => m.id === mid);
        if (!mState) continue;
        robotFK.updateAngles(mState.angles, mState.mode ?? 'horizontal');
      }
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

    const fitTimer = setTimeout(() => { if (bridge.fitCamera) bridge.fitCamera(); }, 300);

    return () => {
      clearTimeout(fitTimer);
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

  // ── React to active module switch ────────────────────────────────────────────
  const activeModuleId = useMultiStore(s => s.activeModuleId);

  useEffect(() => {
    const renderLoop  = renderLoopRef.current;
    const sceneMgr    = sceneRef.current;
    if (!renderLoop || !sceneMgr) return;

    const mStore   = useMultiStore.getState();
    const armStore = useArmStore.getState();

    // 1. Save outgoing active module state
    const prevActiveId = [...modulesRef.current.keys()].find(id => {
      // We know the previous active was whoever had the renderLoop's robotFK
      return modulesRef.current.get(id)?.robotFK === activeFKRef.current;
    });
    if (prevActiveId && prevActiveId !== activeModuleId) {
      const outFK = activeFKRef.current;
      mStore.saveModuleState(prevActiveId, {
        angles:       [...armStore.jointAngles],
        activeRootId: armStore.activeRootId,
        position:     outFK.robotGroup.position.clone(),
        quaternion:   outFK.robotGroup.quaternion.clone(),
        mode:         armStore.mode,
      });
    }

    // 2. Load incoming module state
    const incoming = mStore.modules.find(m => m.id === activeModuleId);
    if (!incoming) return;

    const inFK = modulesRef.current.get(activeModuleId)?.robotFK;
    if (!inFK) return;

    // Restore transform
    inFK.robotGroup.position.set(
      incoming.position.x, incoming.position.y, incoming.position.z,
    );
    inFK.robotGroup.quaternion.set(
      incoming.quaternion.x, incoming.quaternion.y, incoming.quaternion.z, incoming.quaternion.w,
    );

    // Push state into armStore so LeftPanel and RenderLoop read from the right module
    armStore.setRootAndAngles(incoming.activeRootId, incoming.angles);
    inFK.rebuild(incoming.activeRootId, incoming.angles,
      inFK.robotGroup.position.clone(), inFK.robotGroup.quaternion.clone());

    // 3. Swap active FK in RenderLoop and Interaction closure
    activeFKRef.current = inFK;
    renderLoop.swapRobotFK(inFK);

    // Re-show face indicators on new active FK if connect mode is on
    if (mStore.connectMode) inFK.showFaceIndicators(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModuleId]);

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
