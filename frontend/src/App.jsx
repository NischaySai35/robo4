import LeftPanel from './components/LeftPanel.jsx';
import SimCanvas from './components/SimCanvas.jsx';
import HUD from './components/HUD.jsx';
import StatusBar from './components/StatusBar.jsx';
import NavigationGizmo from './components/NavigationGizmo.jsx';
import ViewControls from './components/ViewControls.jsx';

export default function App() {
  return (
    <div className="app-root">
      <LeftPanel />

      <div className="canvas-wrapper">
        <SimCanvas />

        {/* Top-right cluster: gizmo + controls + HUD */}
        <div className="top-right-cluster">
          <NavigationGizmo />
          <ViewControls />
          <HUD />
        </div>

        <StatusBar />
      </div>
    </div>
  );
}
