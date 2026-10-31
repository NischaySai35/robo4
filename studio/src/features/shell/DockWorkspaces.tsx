/**
 * DockWorkspaces — the app's main area: one Dockview per workspace page, shown one at a time.
 *
 * The Editor, Analysis, Training and Animation pages share one 3D scene. Recreating its canvas would lose the GPU state
 * and the scene, so SimCanvas lives in one permanent element that the visible page's viewport panel adopts. While a page
 * has no 3D view the element is detached, which also stops it drawing (SceneManager.shouldRender).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DockviewReact, DockviewDefaultTab, themeDark, themeLight, type IDockviewPanelProps, type IDockviewPanelHeaderProps } from 'dockview-react';
import 'dockview-react/dist/styles/dockview.css';
import './DockWorkspaces.css';
import LeftPanel from '@/features/panels/LeftPanel';
import AnimLeftPanel from '@/features/panels/AnimLeftPanel';
import SimCanvas from '@/features/canvas/SimCanvas';
import NavigationGizmo from '@/features/viewport-ui/NavigationGizmo';
import ViewControls from '@/features/viewport-ui/ViewControls';
import HomeButton from '@/features/viewport-ui/HomeButton';
import IkIndicator from '@/features/viewport-ui/IkIndicator';
import SimPoseBadge from '@/features/viewport-ui/SimPoseBadge';
import ServoController from '@/features/servo/ServoController';
import RightDock from '@/features/dock/RightDock';
import AnalysisPanel from '@/features/analysis/AnalysisPanel';
import AnalysisBottomView from '@/features/analysis/AnalysisBottomView';
import AnalysisModeButtons from '@/features/analysis/AnalysisModeButtons';
import OverloadCards from '@/features/analysis/OverloadCards';
import TrainingPanel from '@/features/training/TrainingPanel';
import Timeline from '@/features/animation/Timeline';
import EspTtlPage from '@/features/espttl/EspTtlPage';
import MsrrPanel from '@/features/msrr/MsrrPanel';
import MsrrCanvas from '@/features/msrr/MsrrCanvas';
import HardwarePanel from '@/features/hardware/HardwarePanel';
import { usePageStore, type Page } from '@/state/pageStore';
import { useThemeStore } from '@/state/themeStore';
import { attachLayout } from './layouts';

const sharedViewport = document.createElement('div');
sharedViewport.className = 'canvas-top dock-shared-viewport';

function SharedViewportPanel({ params }: IDockviewPanelProps<{ page: Page }>) {
  const ref = useRef<HTMLDivElement>(null);
  const active = usePageStore((s) => s.page) === params.page;
  useEffect(() => {
    if (active) ref.current?.appendChild(sharedViewport);
  }, [active]);
  return <div ref={ref} className="dock-panel-fill" />;
}

/** Panels that existed only on their page before P4 keep that lifetime, so leaving a page still stops its work. */
const onPage = (page: Page, Body: () => React.ReactNode) => function OnPage() {
  const active = usePageStore((s) => s.page) === page;
  return <div className="dock-panel-fill dock-panel-scroll">{active && Body()}</div>;
};

const COMPONENTS: Record<string, React.FC<IDockviewPanelProps<any>>> = {
  viewport: SharedViewportPanel,
  leftPanel: onPage('editor', () => <LeftPanel style={{ width: '100%' }} />),
  animLeft: onPage('animation', () => <AnimLeftPanel style={{ width: '100%' }} />),
  analysisBottom: onPage('analysis', () => <AnalysisBottomView />),
  analysisPanel: onPage('analysis', () => <AnalysisPanel />),
  trainingPanel: onPage('training', () => <TrainingPanel />),
  timeline: onPage('animation', () => <Timeline />),
  msrrViewport: onPage('msrr', () => <div className="msrr-main"><MsrrCanvas /></div>),
  msrrPanel: onPage('msrr', () => <MsrrPanel />),
  // ESP-TTL mounts only while active: the board serves one client, so its poll must stop when you leave.
  esptt: onPage('esptt', () => <EspTtlPage />),
  // Motor Control stays mounted on every page, because its polling has to keep running.
  motorMain: () => <div className="dock-panel-fill dock-panel-scroll"><ServoController /></div>,
  hardware: () => <div className="dock-panel-fill dock-panel-scroll"><HardwarePanel /></div>,
};

// Every panel is essential today and there is no list to reopen one from, so a tab can be moved but not closed.
const Tab = (props: IDockviewPanelHeaderProps) => <DockviewDefaultTab {...props} hideClose />;

function Workspace({ page }: { page: Page }) {
  const theme = useThemeStore((s) => s.theme);
  return (
    <DockviewReact
      components={COMPONENTS}
      defaultTabComponent={Tab}
      theme={theme === 'dark' ? themeDark : themeLight}
      onReady={(e) => { attachLayout(e.api, page); }}
    />
  );
}

export default function DockWorkspaces({ connOpen, onConnToggle, onHelpOpen }: { connOpen: boolean; onConnToggle: () => void; onHelpOpen: () => void }) {
  const page = usePageStore((s) => s.page);
  // Built the first time a page is visited. Motor from the start, since its panels must stay mounted.
  const [seen, setSeen] = useState<Set<Page>>(() => new Set<Page>(['motor', page]));
  useEffect(() => { setSeen((s) => (s.has(page) ? s : new Set(s).add(page))); }, [page]);
  const pages = useMemo(() => [...seen], [seen]);
  return (
    <>
      {createPortal(
        <>
          {page === 'analysis' && <AnalysisModeButtons />}
          {page === 'analysis' && <OverloadCards />}
          <SimCanvas />
          <div className="top-center-cluster"><HomeButton /><IkIndicator /><SimPoseBadge /></div>
          <div className="top-right-cluster">
            <NavigationGizmo />
            <ViewControls isConnOpen={connOpen} onConnToggle={onConnToggle} onHelpOpen={onHelpOpen} />
          </div>
        </>,
        sharedViewport,
      )}
      {pages.map((p) => (
        <div key={p} className="dock-workspace" style={p === page ? undefined : { display: 'none' }}>
          <div className="dock-workspace-main"><Workspace page={p} /></div>
          {p === 'editor' && <RightDock />}
        </div>
      ))}
    </>
  );
}
