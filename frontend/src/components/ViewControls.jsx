import { useCallback } from 'react';
import { bridge } from '../three/cameraBridge.js';
import { useArmStore } from '../store/armStore.js';

export default function ViewControls() {
  const fitCamera = useCallback(() => {
    const nodes = useArmStore.getState().nodePositions;
    if (bridge.fitCamera) bridge.fitCamera(nodes);
  }, []);

  return (
    <div className="view-controls">
      <button className="view-btn" onClick={fitCamera} title="Fit arm in view (F)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="1" width="4" height="4" rx="1"
            stroke="currentColor" strokeWidth="1.4" fill="none"/>
          <rect x="9" y="1" width="4" height="4" rx="1"
            stroke="currentColor" strokeWidth="1.4" fill="none"/>
          <rect x="1" y="9" width="4" height="4" rx="1"
            stroke="currentColor" strokeWidth="1.4" fill="none"/>
          <rect x="9" y="9" width="4" height="4" rx="1"
            stroke="currentColor" strokeWidth="1.4" fill="none"/>
        </svg>
        FIT
      </button>
    </div>
  );
}
