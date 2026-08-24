import './ViewControls.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { bridge } from '@/viewport/cameraBridge';
import { useDockStore } from '@/state/dockStore';
import { usePageStore } from '@/state/pageStore';
import { useBusyStore } from '@/state/busyStore';
import { useEditModeStore } from '@/state/editModeStore';
import { hardwareBridge } from '@/hardware/HardwareBridge';
import { useHardwareStore } from '@/state/hardwareStore';

export default function ViewControls({ isConnOpen, onConnToggle, onHelpOpen }: any) {
  const streaming = useHardwareStore((s) => s.streaming);
  const toggleSync = () => hardwareBridge.setStreaming(!streaming);
  const [wireframe, setWireframe] = useState(false);
  const [connectorsVisible, setConnectorsVisible] = useState(true);

  const fitCamera = useCallback(() => {
    if (bridge.fitCamera) bridge.fitCamera();
  }, []);

  const camActive = useDockStore((s) => s.active === 'camera');
  const page = usePageStore((s) => s.page);

  // Responsive reflow: measure the space between the toolbar's top and the bottom
  // of its canvas area, then pick a layout that fits — a single labelled column,
  // else two-per-row with labels, else two-per-row icon-only. Recomputes on any
  // resize (window, split view, or a new panel appearing).
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'col' | 'grid' | 'icons'>('col');
  const N_BTNS = 6;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const container = (el.closest('.canvas-top') as HTMLElement) ?? null;
    const compute = () => {
      const top = el.getBoundingClientRect().top;
      const bottom = container ? container.getBoundingClientRect().bottom : window.innerHeight;
      const avail = bottom - top - 12;
      const rowH = 42; // labelled button + gap
      const rows2 = Math.ceil(N_BTNS / 2);
      setMode(
        avail >= N_BTNS * rowH ? 'col'
        : avail >= rows2 * rowH ? 'grid'
        : 'icons',
      );
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (container) ro.observe(container);
    ro.observe(document.body);
    window.addEventListener('resize', compute);
    return () => { ro.disconnect(); window.removeEventListener('resize', compute); };
  }, []);

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

  const toggleConnectors = useCallback(() => {
    const next = !connectorsVisible;
    setConnectorsVisible(next);
    bridge.setConnectorsVisible?.(next);
  }, [connectorsVisible]);

  return (
    <div ref={ref} className={`view-controls view-controls--${mode}`}>
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
        <span className="view-btn-label">CAM</span>
      </button>

      <button className="view-btn" onClick={fitCamera} title="Fit model in view (F)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none"/>
          <rect x="9" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none"/>
          <rect x="1" y="9" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none"/>
          <rect x="9" y="9" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none"/>
        </svg>
        <span className="view-btn-label">FIT</span>
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
        <span className="view-btn-label">WIRE</span>
      </button>

      <button
        className={`view-btn${connectorsVisible ? ' view-btn--active' : ''}`}
        onClick={toggleConnectors}
        title="Show/hide connector markers (position + facing normal, used to align modules for snapping)"
      >
        {/* Connector dot-with-arrow icon */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="4.5" cy="7" r="2.3" stroke="currentColor" strokeWidth="1.3" fill="none"/>
          <line x1="6.6" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M9.6 4.6L12 7l-2.4 2.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
        <span className="view-btn-label">PLUGS</span>
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
        <span className="view-btn-label">KEYS</span>
      </button>

      {/* Sync control: the word/icon opens the connection panel; the ON/OFF pill
          toggles real-time streaming of joint values to the connected hardware. */}
      <div className={`view-btn view-btn--sync${isConnOpen ? ' view-btn--active' : ''}`}>
        <span
          className="view-sync-word"
          onClick={onConnToggle}
          title="Open the connection panel"
          role="button"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1.5 5.5C1.5 3.3 3.3 1.5 5.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M1.5 9C1.5 5.4 4.2 2.5 7.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
            <path d="M4 7C4 5.3 5.3 4 7 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="7" cy="9" r="2" stroke="currentColor" strokeWidth="1.4" fill="none"/>
            <circle cx="7" cy="9" r="0.8" fill="currentColor"/>
          </svg>
          <span className="view-btn-label">SYNC</span>
        </span>
        <span
          className={`view-sync-state${streaming ? ' view-sync-state--on' : ''}`}
          onClick={toggleSync}
          title={streaming ? 'Real-time sync ON — click to stop streaming to the motors' : 'Click to start streaming live joint values to the connected motors'}
          role="button"
        >
          {streaming ? 'ON' : 'OFF'}
        </span>
      </div>
    </div>
  );
}
