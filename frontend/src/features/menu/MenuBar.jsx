import { useState, useRef, useEffect } from 'react';
import './MenuBar.css';
import { useThemeStore } from '@/state/themeStore.js';
import { useHistoryStore } from '@/state/historyStore.js';
import { bridge } from '@/viewport/cameraBridge.js';
import { newProject, openProject, saveProject, exportModel } from '@/core/serialization/projectActions.js';
import { importMesh } from '@/features/import/importMesh.js';

const SEP = { sep: true };

function Dropdown({ items, onClose }) {
  const [sub, setSub] = useState(null);
  return (
    <div className="menu-dropdown">
      {items.map((it, i) => {
        if (it.sep) return <div key={i} className="menu-sep" />;
        if (it.submenu) {
          return (
            <div key={i} className="menu-item menu-item--sub"
              onMouseEnter={() => setSub(i)} onMouseLeave={() => setSub(null)}>
              <span>{it.label}</span><span className="menu-arrow">▸</span>
              {sub === i && (
                <div className="menu-subdropdown">
                  {it.submenu.map((s, j) => (
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

export default function MenuBar({ onToggleConn }) {
  const [open, setOpen] = useState(null);
  const barRef = useRef(null);

  const canUndo        = useHistoryStore(s => s.canUndo);
  const canRedo        = useHistoryStore(s => s.canRedo);
  const theme          = useThemeStore(s => s.theme);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (barRef.current && !barRef.current.contains(e.target)) setOpen(null); };
    const onKey  = (e) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const menus = {
    File: [
      { label: 'New Project',   onClick: newProject },
      { label: 'Open Project…', onClick: openProject },
      { label: 'Save Project…', onClick: saveProject },
      SEP,
      { label: 'Export', submenu: [
        { label: 'OBJ',  onClick: () => exportModel('obj') },
        { label: 'STL',  onClick: () => exportModel('stl') },
        { label: 'STEP', onClick: () => exportModel('step') },
        { label: 'GLB',  onClick: () => exportModel('glb') },
      ] },
    ],
    Edit: [
      { label: 'Undo', shortcut: 'Ctrl+Z', disabled: !canUndo, onClick: () => bridge.undo?.() },
      { label: 'Redo', shortcut: 'Ctrl+Y', disabled: !canRedo, onClick: () => bridge.redo?.() },
      SEP,
      { label: 'Import Mesh (STL / OBJ)…', onClick: () => importMesh() },
    ],
    View: [
      { label: 'Fit View',         onClick: () => bridge.fitCamera?.() },
      { label: 'Connection Panel', onClick: () => onToggleConn?.() },
      SEP,
      { label: theme === 'dark' ? 'Light Theme' : 'Dark Theme',
        onClick: () => useThemeStore.getState().toggleTheme() },
    ],
    Help: [
      { label: 'Keyboard Shortcuts', onClick: () => alert(
        'Shortcuts\n────────────\nCtrl+Z              Undo\nCtrl+Y / Ctrl+Shift+Z   Redo\nCtrl+K              Command palette\n\nViewport\n────────────\nClick a part        Select · gizmo\nClick empty         Deselect\nScroll              Zoom\nRight-drag          Orbit\nMiddle / Shift-drag Pan') },
      { label: 'About TETROBOT', onClick: () => alert('TETROBOT — Modular Robotics\nby Nischay Sai') },
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
            {open === name && <Dropdown items={menus[name]} onClose={() => setOpen(null)} />}
          </div>
        ))}
      </div>

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
