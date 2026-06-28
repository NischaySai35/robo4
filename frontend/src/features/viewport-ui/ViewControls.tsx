import './ViewControls.css';
import { useCallback, useState } from 'react';
import { bridge } from '@/viewport/cameraBridge';
import { useDockStore } from '@/state/dockStore';
import { usePageStore } from '@/state/pageStore';
import { useBusyStore } from '@/state/busyStore';
import { useEditModeStore } from '@/state/editModeStore';

export default function ViewControls({ isConnOpen, onConnToggle, onHelpOpen }: any) {
  const [wireframe, setWireframe] = useState(false);

  const fitCamera = useCallback(() => {
    if (bridge.fitCamera) bridge.fitCamera();
  }, []);

  const camActive = useDockStore((s) => s.active === 'camera');
  const page = usePageStore((s) => s.page);

  const toggleCam = useCallback(() => {
    const currentPage = usePageStore.getState().page;
    const isBusy = Object.keys(useBusyStore.getState().tasks).length > 0;
    const isEditing = useEditModeStore.getState().active;

    if (currentPage !== 'editor') {
      if (isBusy) return;
      usePageStore.getState().setPage('editor');
      setTimeout(() => useDockStore.getState().toggle('camera'), 80);
      return;
    }
    void isEditing;
    useDockStore.getState().toggle('camera');
  }, []);

  const toggleWireframe = useCallback(() => {
    const next = !wireframe;
    setWireframe(next);
    if (next && bridge.getRenderEngine?.() !== 'eevee') {
      bridge.setRenderEngine?.('eevee');
    }
    bridge.setWireframe?.(next);
  }, [wireframe]);

  return (
    <div className="view-controls">
      <button
        className={`view-btn${camActive && page === 'editor' ? ' view-btn--active' : ''}`}
        onClick={toggleCam}
        title={page !== 'editor' ? 'Go to Editor and open Camera settings' : 'Camera settings'}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1.5 4.5h2L4.7 3h4.6l1.2 1.5h2v7h-11z"
            stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          <circle cx="7" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.3"/>
        </svg>
        CAM
      </button>

      <button className="view-btn" onClick={fitCamera} title="Fit model in view (F)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none"/>
          <rect x="9" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none"/>
          <rect x="1" y="9" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none"/>
          <rect x="9" y="9" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none"/>
        </svg>
        FIT
      </button>

      <button
        className={`view-btn${wireframe ? ' view-btn--active' : ''}`}
        onClick={toggleWireframe}
        title="Wireframe view — show mesh edges only"
      >
        {/* Wireframe cube icon */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="2" width="7" height="7" rx="0.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
          <rect x="5" y="5" width="7" height="7" rx="0.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
          <line x1="2" y1="2" x2="5" y2="5" stroke="currentColor" strokeWidth="1.1"/>
          <line x1="9" y1="2" x2="12" y2="5" stroke="currentColor" strokeWidth="1.1"/>
          <line x1="2" y1="9" x2="5" y2="12" stroke="currentColor" strokeWidth="1.1"/>
          <line x1="9" y1="9" x2="12" y2="12" stroke="currentColor" strokeWidth="1.1"/>
        </svg>
        WIRE
      </button>

      <button
        className="view-btn"
        onClick={onHelpOpen}
        title="Keyboard shortcuts (?)"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1.5" y="2.5" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
          <rect x="3" y="4.5" width="2.5" height="2" rx="0.5" stroke="currentColor" strokeWidth="1" fill="none"/>
          <rect x="5.75" y="4.5" width="2.5" height="2" rx="0.5" stroke="currentColor" strokeWidth="1" fill="none"/>
          <rect x="8.5" y="4.5" width="2.5" height="2" rx="0.5" stroke="currentColor" strokeWidth="1" fill="none"/>
          <rect x="3" y="7" width="8" height="1.8" rx="0.5" stroke="currentColor" strokeWidth="1" fill="none"/>
        </svg>
        KEYS
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
