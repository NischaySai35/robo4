import { useState, useRef, useEffect } from 'react';
import './MenuBar.css';
import { useThemeStore } from '@/state/themeStore';
import { useHistoryStore } from '@/state/historyStore';
import { useDocStore } from '@/state/docStore';
import { useDockStore } from '@/state/dockStore';
import { bridge } from '@/viewport/cameraBridge';
import { newProject, newRobotArm, newHumanoid, openProject, saveProject, saveProjectAs, exportModel } from '@/core/serialization/projectActions';
import { importMesh, importURDF } from '@/features/import/importMesh';
import { checkForUpdates, getAppVersion } from '@/features/update/checkForUpdates';
import { exportRobot } from '@/features/export/exportRobot';

const SEP = { sep: true };

// ── Centered document indicator (project name + save status) ───────────────────
function DocIndicator() {
  const name   = useDocStore(s => s.name);
  const status = useDocStore(s => s.status);
  const display = name ?? 'untitled';
  return (
    <div className="menubar-doc" title={name
      ? `Auto-saving changes to ${name}`
      : 'Not saved to a file yet — changes are kept locally. Use File ▸ Save Project to create a file.'}>
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M3 2h7l3 3v9H3V2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
      <span className="menubar-doc-name">{display}</span>
      {name && status === 'saving' && <span className="menubar-doc-status">saving…</span>}
      {name && status === 'saved'  && <span className="menubar-doc-status menubar-doc-saved">saved</span>}
      {!name && <span className="menubar-doc-status menubar-doc-dim">local only</span>}
    </div>
  );
}

function Dropdown({ items, onClose }: any) {
  const [sub, setSub] = useState<any>(null);
  return (
    <div className="menu-dropdown">
      {items.map((it: any, i: any) => {
        if (it.sep) return <div key={i} className="menu-sep" />;
        if (it.submenu) {
          return (
            <div key={i} className="menu-item menu-item--sub"
              onMouseEnter={() => setSub(i)} onMouseLeave={() => setSub(null)}>
              <span>{it.label}</span><span className="menu-arrow">▸</span>
              {sub === i && (
                <div className="menu-subdropdown">
                  {it.submenu.map((s: any, j: any) => (
                    <button key={j} className="menu-item" onClick={() => { onClose(); s.onClick(); }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }
        return (
          <button key={i} className="menu-item" disabled={it.disabled}
            onClick={() => { onClose(); it.onClick(); }}>
            <span>{it.label}</span>
            {it.shortcut && <span className="menu-shortcut">{it.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function MenuBar({ onToggleConn }: any) {
  const [open, setOpen] = useState<any>(null);
  const barRef = useRef<any>(null);

  const canUndo        = useHistoryStore(s => s.canUndo);
  const canRedo        = useHistoryStore(s => s.canRedo);
  const theme          = useThemeStore(s => s.theme);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: any) => { if (barRef.current && !barRef.current.contains(e.target)) setOpen(null); };
    const onKey  = (e: any) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openPanel = useDockStore.getState().open;

  const menus = {
    File: [
      { label: 'New Project',     onClick: newProject },
      { label: 'New 6-DOF Robot Arm', onClick: newRobotArm },
      { label: 'New Humanoid Robot', onClick: newHumanoid },
      { label: 'Open Project…',   onClick: openProject },
      SEP,
      { label: 'Save Project',    shortcut: 'Ctrl+S', onClick: saveProject },
      { label: 'Save Project As…', onClick: saveProjectAs },
      SEP,
      { label: 'Import', submenu: [
        { label: 'glTF / GLB…',   onClick: () => importMesh(['gltf', 'glb']) },
        { label: 'USD / USDZ…',   onClick: () => importMesh(['usd', 'usdz', 'usda']) },
        { label: 'STL…',          onClick: () => importMesh(['stl']) },
        { label: 'OBJ…',          onClick: () => importMesh(['obj']) },
        { label: 'STEP / STP…',   onClick: () => importMesh(['step', 'stp']) },
        { label: 'Any file…',     onClick: () => importMesh() },
        SEP,
        { label: 'URDF Project…', onClick: () => importURDF() },
      ] },
      { label: 'Export', submenu: [
        { label: 'OBJ',  onClick: () => exportModel('obj') },
        { label: 'STL',  onClick: () => exportModel('stl') },
        { label: 'GLB',  onClick: () => exportModel('glb') },
        { label: 'STEP', onClick: () => exportModel('step') },
        SEP,
        { label: 'URDF (ROS / Gazebo)', onClick: () => exportRobot('urdf') },
        { label: 'IDL (comms interface)', onClick: () => exportRobot('idl') },
      ] },
    ],
    Edit: [
      { label: 'Undo', shortcut: 'Ctrl+Z', disabled: !canUndo, onClick: () => bridge.undo?.() },
      { label: 'Redo', shortcut: 'Ctrl+Y', disabled: !canRedo, onClick: () => bridge.redo?.() },
    ],
    View: [
      { label: 'Fit View', shortcut: 'F', onClick: () => bridge.fitCamera?.() },
      SEP,
      { label: 'Properties (Edit panel)', onClick: () => openPanel('inspector') },
      { label: 'Scene Tree (Outliner)',   onClick: () => openPanel('outliner') },
      { label: 'AI Copilot',              onClick: () => openPanel('copilot') },
      { label: 'Hardware / Servos',       onClick: () => openPanel('hardware') },
      { label: 'Analysis',                onClick: () => openPanel('analysis') },
      { label: 'Camera & Render',         onClick: () => openPanel('camera') },
      { label: 'Precision & Measure',     onClick: () => openPanel('tools') },
      { label: 'Animation',               onClick: () => openPanel('timeline') },
      { label: 'JS Macros',               onClick: () => openPanel('scripting') },
      SEP,
      { label: 'Connection Panel', onClick: () => onToggleConn?.() },
      { label: theme === 'dark' ? 'Light Theme' : 'Dark Theme',
        onClick: () => useThemeStore.getState().toggleTheme() },
    ],
    Help: [
      { label: 'Check for Updates…', onClick: () => checkForUpdates(false) },
      SEP,
      { label: 'Keyboard Shortcuts', onClick: () => alert(
        'Shortcuts\n────────────\nCtrl+Z              Undo\nCtrl+Y / Ctrl+Shift+Z   Redo\nCtrl+K              Command palette\n\nViewport\n────────────\nClick a part        Select · gizmo\nClick empty         Deselect\nScroll              Zoom\nRight-drag          Orbit\nMiddle / Shift-drag Pan') },
      { label: 'About TETROBOT', onClick: async () => alert(`TETROBOT — Modular Robotics\nby Nischay Sai${(await getAppVersion()) ? `\n\nVersion ${await getAppVersion()}` : ''}`) },
    ],
  };

  return (
    <div className="menubar" ref={barRef}>
      <div className="menubar-menus">
        {Object.keys(menus).map(name => (
          <div key={name} className="menu">
            <button
              className={`menu-label${open === name ? ' menu-label--open' : ''}`}
              onClick={() => setOpen(open === name ? null : name)}
              onMouseEnter={() => { if (open) setOpen(name); }}
            >
              {name}
            </button>
            {open === name && <Dropdown items={menus[name as keyof typeof menus]} onClose={() => setOpen(null)} />}
          </div>
        ))}
      </div>

      <DocIndicator />

      <div className="menubar-tools">
        <button className="menubar-icon" disabled={!canUndo} title="Undo (Ctrl+Z)" onClick={() => bridge.undo?.()}>
          <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
            <path d="M6 4L2.5 7.5 6 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2.5 7.5H11a4.5 4.5 0 014.5 4.5v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
        <button className="menubar-icon" disabled={!canRedo} title="Redo (Ctrl+Y)" onClick={() => bridge.redo?.()}>
          <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
            <path d="M12 4l3.5 3.5L12 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15.5 7.5H7A4.5 4.5 0 002.5 12v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}