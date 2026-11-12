import './ViewControls.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { bridge } from '@/bridge/cameraBridge';
import { runOperator } from '@/core/ops/registry';
import { useDockStore } from '@/state/dockStore';
import { usePageStore } from '@/state/pageStore';
import { useBusyStore } from '@/state/busyStore';
import { useEditModeStore } from '@/state/editModeStore';
import { hardwareBridge } from '@/features/hardware/HardwareBridge';
import { useHardwareStore } from '@/state/hardwareStore';
import { useV2Store } from '@/state/msrrV2Store';
import { useEspNodesStore } from '@/state/espNodesStore';
import { useSyncAssign, linkReport } from '@/features/connection/syncAssign';
import './SyncUi.css';

const LINKING_MS = 5000;   // after Sync ON: this long the button says "linking" while boards answer, then "nobody online" if none did

export default function ViewControls({ isConnOpen, onConnToggle: connToggle, onHelpOpen: helpOpen }: any) {
  // A page that passes no handlers (the MSRR canvas) still gets working KEYS and SYNC buttons: the shared commands.
  const onHelpOpen = helpOpen ?? (() => runOperator('ui.help'));
  const onConnToggle = connToggle ?? (() => runOperator('ui.connection'));
  const streaming = useHardwareStore((s) => s.streaming);
  // ONE switch (Nischay 3 Nov: a SYNC word plus an ON/OFF pill inside it made no sense): on = stream + show what is sent
  // turning Sync ON opens the SIM -> ESP window if it is closed; it never closes it (5 Nov: on the MSRR page it could not tell
  // whether the window was open, so every second ON toggled it shut). Turning Sync OFF leaves the window as it is.
  const toggleSync = () => { hardwareBridge.setStreaming(!streaming); if (!streaming) runOperator('ui.connection.open'); };
  // linked boards online / sim modules (not on MSRR: its own sender shows its own boxes)
  const onAt = useSyncAssign((s) => s.onAt);
  const links = useEspNodesStore(() => { const r = linkReport(); return `${r.pairs.filter((p) => p.node?.connected).length}/${r.sims.length}/${r.online.length}`; });
  const [linkUp, simN, realN] = links.split('/').map(Number);
  const [, tick] = useState(0);
  useEffect(() => { if (!onAt) return; const t = setTimeout(() => tick((n) => n + 1), LINKING_MS + 30); return () => clearTimeout(t); }, [onAt]);
  const syncPhase: 'off' | 'linking' | 'nobody' | 'on' = !streaming ? 'off'
    : usePageStore.getState().page === 'msrr' ? 'on'
    : linkUp > 0 ? 'on' : onAt && Date.now() - onAt < LINKING_MS ? 'linking' : 'nobody';
  const syncTitle = {
    off: 'Sync OFF: click to drive the real modules from the sim. Sim modules are linked to the online boards in order (M1 → mod1, M2 → mod2).',
    linking: 'Sync ON: looking for the real modules…',
    nobody: 'Sync ON, but no real module answers: it shows what it would send. Click to stop.',
    on: `Sync ON: ${linkUp} of ${simN} sim module${simN === 1 ? '' : 's'} driving a real board (${realN} online). Click to stop.`,
  }[syncPhase];
  const [wireframe, setWireframe] = useState(false);
  const [connectorsVisible, setConnectorsVisible] = useState(true);

  const fitCamera = useCallback(() => {
    if (bridge.fitCamera) bridge.fitCamera();
  }, []);

  const camActive = useDockStore((s) => s.active === 'camera');
  const page = usePageStore((s) => s.page);
  // MSRR only: split the view, left the ideal robot, right the real one as Sync would drive it (Nischay 5 Nov)
  const split = useV2Store((s) => s.split);
  const session = useV2Store((s) => !!s.manual);   // the right half needs a live Manual session (its real copy runs inside it)

  // Responsive reflow: measure the space between the toolbar's top and the bottom
  // of its canvas area, then pick a layout that fits — a single labelled column,
  // else two-per-row with labels, else two-per-row icon-only. Recomputes on any
  // resize (window, split view, or a new panel appearing).
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'col' | 'grid' | 'icons'>('col');
  const N_BTNS = page === 'msrr' ? 7 : 6;
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

  const toggleWireframe = useCallback(() => { runOperator('view.wireframe', { on: !wireframe }); setWireframe(!wireframe); }, [wireframe]);
  const toggleConnectors = useCallback(() => { runOperator('view.connectors', { on: !connectorsVisible }); setConnectorsVisible(!connectorsVisible); }, [connectorsVisible]);

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

      {page === 'msrr' && (
        <button
          className={`view-btn${split && session ? ' view-btn--active' : ''}`}
          disabled={!session}
          onClick={() => useV2Store.getState().setSplit(!split)}
          title={session ? 'Split the view: left the IDEAL robot, right the REAL robot as the sim expects it (sag, gear play, random robot) when Sync sends it these angles.' : 'Start a Manual session first (Planner v2 > Manual > Start): the right half is a real copy that runs inside it'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="2" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none"/>
            <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
          <span className="view-btn-label">SPLIT</span>
        </button>
      )}

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

      {/* Sync: one switch. On = the sim's joint values stream to the robot and the SIM → ESP panel shows every angle sent
          (or that would be sent, when no board answers); off = nothing is sent. */}
      <button
        className={`view-btn view-btn--sync${streaming ? ' view-btn--active' : ''}`}
        onClick={toggleSync}
        title={syncTitle}
        data-testid="sync-toggle" data-phase={syncPhase}
      >
        <span className="view-sync-word">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1.5 5.5C1.5 3.3 3.3 1.5 5.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M1.5 9C1.5 5.4 4.2 2.5 7.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
            <path d="M4 7C4 5.3 5.3 4 7 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="7" cy="9" r="2" stroke="currentColor" strokeWidth="1.4" fill="none"/>
            <circle cx="7" cy="9" r="0.8" fill="currentColor"/>
          </svg>
          <span className="view-btn-label">SYNC</span>
        </span>
        <span className={`view-sync-state${syncPhase === 'on' ? ' view-sync-state--on' : ''}${syncPhase === 'linking' ? ' view-sync-state--linking' : ''}${syncPhase === 'nobody' ? ' view-sync-state--nobody' : ''}`}>
          {syncPhase === 'off' ? 'OFF' : syncPhase === 'linking' ? '···' : 'ON'}
          {syncPhase === 'on' && page !== 'msrr' && (simN > 1 || realN > 1) && <span className="view-sync-count">{linkUp}/{simN}</span>}
        </span>
      </button>
    </div>
  );
}
