import './ViewControls.css';
import { useCallback } from 'react';
import { bridge } from '@/viewport/cameraBridge';
import { useDockStore } from '@/state/dockStore';
import { usePageStore } from '@/state/pageStore';
import { useBusyStore } from '@/state/busyStore';
import { useEditModeStore } from '@/state/editModeStore';
import { useEditorStore } from '@/state/editorStore';

export default function ViewControls({ isConnOpen, onConnToggle, onHelpOpen }: any) {
  const fitCamera = useCallback(() => {
    if (bridge.fitCamera) bridge.fitCamera();
  }, []);

  const camActive = useDockStore((s) => s.active === 'camera');
  const page = usePageStore((s) => s.page);
  const showCollision = useEditorStore((s) => s.showCollision);
  const toggleCollision = useEditorStore((s) => s.toggleCollision);

  const toggleCam = useCallback(() => {
    const currentPage = usePageStore.getState().page;
    const isBusy = Object.keys(useBusyStore.getState().tasks).length > 0;
    const isEditing = useEditModeStore.getState().active;

    if (currentPage !== 'editor') {
      // Don't switch away if a blocking task (import, render) is running.
      if (isBusy) return;
      // In edit mode we stay on editor anyway, but edit mode blocks page switch elsewhere.
      // Switch to editor first, then open camera.
      usePageStore.getState().setPage('editor');
      // Small delay so the editor page mounts before toggling the dock panel.
      setTimeout(() => useDockStore.getState().toggle('camera'), 80);
      return;
    }
    void isEditing;
    useDockStore.getState().toggle('camera');
  }, []);

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
        className={`view-btn${showCollision ? ' view-btn--active' : ''}`}
        onClick={toggleCollision}
        title="Toggle collision shape overlay (blue wireframe)"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="2" width="10" height="10" rx="1.5"
            stroke="currentColor" strokeWidth="1.3" strokeDasharray="2.5 1.5" fill="none"/>
          <rect x="4" y="4" width="6" height="6" rx="1"
            stroke="currentColor" strokeWidth="1" fill="none" opacity="0.55"/>
        </svg>
        COL
      </button>

      <button
        className="view-btn"
        onClick={onHelpOpen}
        title="Keyboard shortcuts (? or /)"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M5.3 5.4c0-.95.76-1.7 1.7-1.7s1.7.75 1.7 1.7c0 .7-.4 1.25-1 1.55-.38.2-.7.55-.7 1v.45" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <circle cx="7" cy="9.8" r="0.7" fill="currentColor"/>
        </svg>
        ?
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
