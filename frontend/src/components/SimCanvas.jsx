/**
 * SimCanvas — mounts the Three.js canvas and boots the entire 3D pipeline.
 *
 * Lifecycle:
 *   mount → create SceneManager, ArmGeometry, ArmRenderer, Interaction, RenderLoop
 *   unmount → dispose everything
 *
 * Store coupling is via RenderLoop only — this component just boots and tears down.
 */

import { useEffect, useRef } from 'react';
import { SceneManager } from '../three/SceneManager.js';
import { ArmGeometry } from '../three/ArmGeometry.js';
import { ArmRenderer } from '../three/ArmRenderer.js';
import { Interaction } from '../three/Interaction.js';
import { RenderLoop } from '../three/RenderLoop.js';
import { useArmStore } from '../store/armStore.js';

export default function SimCanvas() {
  const canvasRef = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cleanupRef.current) return;

    // ── Stable store actions (Zustand actions never change identity) ──────────
    const store = useArmStore.getState();
    const storeActions = {
      setNodePositions: store.setNodePositions,
      setJointTelemetry: store.setJointTelemetry,
      setDragging: store.setDragging,
      setStatus: store.setStatus,
      updateEndEffector: store.updateEndEffector,
      setRootRod: store.setRootRod,
      clearPendingHome: store.clearPendingHome,
    };

    // ── Boot Three.js pipeline ────────────────────────────────────────────────
    const sceneMgr = new SceneManager(canvas);
    const armGeo = new ArmGeometry(sceneMgr.scene);
    const armRend = new ArmRenderer(armGeo);

    const interaction = new Interaction(
      canvas,
      sceneMgr.camera,
      () => armGeo.interactables,
      {} // callbacks set inside RenderLoop constructor
    );

    const renderLoop = new RenderLoop(
      sceneMgr,
      armGeo,
      armRend,
      interaction,
      () => useArmStore.getState(),
      storeActions
    );

    // Render initial pose
    const initial = useArmStore.getState();
    armRend.update(initial.nodePositions, initial.rootRodIndex, initial.mode, [], 0);

    renderLoop.start();

    // Subscribe to mode changes for camera animation (plain subscribe)
    let prevMode = useArmStore.getState().mode;
    const unsubMode = useArmStore.subscribe((state) => {
      if (state.mode !== prevMode) {
        prevMode = state.mode;
        if (state.mode === 'vertical') {
          sceneMgr.animateCameraTo({ x: 9, y: 3, z: 9 }, { x: 0, y: 0.6, z: 0 });
        } else {
          sceneMgr.animateCameraTo({ x: 0, y: 3.5, z: 11 }, { x: 0, y: 0, z: 0 });
        }
      }
    });

    cleanupRef.current = () => {
      renderLoop.stop();
      interaction.dispose();
      armGeo.dispose();
      sceneMgr.dispose();
      unsubMode();
      cleanupRef.current = null;
    };

    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
