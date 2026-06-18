import './ViewControls.css';
import { useCallback } from 'react';
import { bridge } from '@/viewport/cameraBridge.js';

export default function ViewControls({ isConnOpen, onConnToggle }) {
  const fitCamera = useCallback(() => {
    if (bridge.fitCamera) bridge.fitCamera();
  }, []);

  return (
    <div className="view-controls">
      <button className="view-btn" onClick={fitCamera} title="Fit arm in view">
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

      <button
        className={`view-btn${isConnOpen ? ' view-btn--active' : ''}`}
        onClick={onConnToggle}
        title="Toggle connection panel"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1.5 5.5C1.5 3.3 3.3 1.5 5.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M1.5 9C1.5 5.4 4.2 2.5 7.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
          <path d="M4 7C4 5.3 5.3 4 7 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <circle cx="7" cy="9" r="2" stroke="currentColor" strokeWidth="1.4" fill="none"/>
          <circle cx="7" cy="9" r="0.8" fill="currentColor"/>
        </svg>
        CONN
      </button>
    </div>
  );
}
