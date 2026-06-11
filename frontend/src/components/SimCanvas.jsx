/**
 * SimCanvas — mounts the Three.js canvas and boots the FK pipeline.
 *
 * Lifecycle:
 *   mount   → SceneManager, RobotFK, Interaction, RenderLoop
 *   unmount → dispose everything
 */

import { useEffect, useRef } from 'react';
import { SceneManager } from '../three/SceneManager.js';
import { RobotFK } from '../three/RobotFK.js';
import { Interaction } from '../three/Interaction.js';
import { RenderLoop } from '../three/RenderLoop.js';
import { useArmStore } from '../store/armStore.js';
import { bridge } from '../three/cameraBridge.js';

export default function SimCanvas() {
  const canvasRef  = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cleanupRef.current) return;

    const store = useArmStore.getState();
    const storeActions = {
      setJointAngle:     store.setJointAngle,
      setJointTelemetry: store.setJointTelemetry,
      setStatus:         store.setStatus,
      updateEndEffector: store.updateEndEffector,
      setRootRod:        store.setRootRod,
      setRootAndAngles:  store.setRootAndAngles,
      clearPendingHome:  store.clearPendingHome,
    };

    const sceneMgr = new SceneManager(canvas);

    const robotFK = new RobotFK(sceneMgr.scene);

    const interaction = new Interaction(
      canvas,
      sceneMgr.camera,
      () => robotFK.interactables,
      {} // callbacks wired inside RenderLoop constructor
    );

    const renderLoop = new RenderLoop(
      sceneMgr,
      robotFK,
      interaction,
      () => useArmStore.getState(),
      storeActions
    );

    renderLoop.start();

    // Fit camera to arm after a few frames so FK positions are ready
    const fitTimer = setTimeout(() => {
      if (bridge.fitCamera) bridge.fitCamera();
    }, 300);

    cleanupRef.current = () => {
      clearTimeout(fitTimer);
      renderLoop.stop();
      interaction.dispose();
      sceneMgr.dispose();
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
