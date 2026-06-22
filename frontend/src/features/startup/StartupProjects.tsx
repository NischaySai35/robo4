/**
 * StartupProjects — a translucent project picker shown right after the intro animation.
 * It shows a card for the CURRENT scene (continue), a NEW PROJECT card, and a card per
 * project in the local library (with a small thumbnail). The ✕ (or "Continue") dismisses
 * it and leaves whatever was already loaded behind it untouched.
 */
import { useEffect, useState } from 'react';
import './StartupProjects.css';
import { bridge } from '@/viewport/cameraBridge';
import { useDocStore } from '@/state/docStore';
import { listProjects, removeProject, type LibraryEntry } from '@/core/serialization/projectLibrary';
import { newProject, openFromLibrary, saveCurrentToLibrary } from '@/core/serialization/projectActions';
import { buildRobotArmProject } from '@/core/factory/robotArm';
import { buildHumanoidProject } from '@/core/factory/humanoid';

// Built-in starter projects (grows as more samples are added).
const PREDEFINED: { key: string; name: string; build: () => unknown }[] = [
  { key: 'arm', name: 'Robot Arm (6-DOF)', build: buildRobotArmProject },
  { key: 'humanoid', name: 'Humanoid (20-DOF)', build: buildHumanoidProject },
];

export default function StartupProjects({ onClose }: { onClose: () => void }) {
  const [projects, setProjects] = useState<LibraryEntry[]>(() => listProjects());
  const [currentThumb, setCurrentThumb] = useState<string>('');
  const currentName = useDocStore((s) => s.name);
  const currentLibraryId = useDocStore((s) => s.libraryId);

  // grab a thumbnail of the already-loaded scene once the renderer has a frame
  useEffect(() => {
    const id = requestAnimationFrame(() => setCurrentThumb(bridge.captureThumbnail?.(256) ?? ''));
    return () => cancelAnimationFrame(id);
  }, []);

  const refresh = () => setProjects(listProjects());

  const onNew = () => { newProject(); onClose(); };
  const onContinue = () => onClose();
  const onOpen = (e: LibraryEntry) => { if (openFromLibrary(e.id, e.name)) onClose(); };
  const onDelete = (e: React.MouseEvent, id: string) => { e.stopPropagation(); removeProject(id); refresh(); };
  const onSaveCurrent = () => { saveCurrentToLibrary(); refresh(); };
  const onPredefined = (p: { name: string; build: () => unknown }) => {
    const r = bridge.loadScene?.(p.build());
    if (r && !r.ok) { alert(r.error); return; }
    useDocStore.getState().setDoc(p.name, null);
    useDocStore.getState().setLibraryId(null);
    onClose();
  };

  // Don't show the project you're currently in as a separate card — it's "Current".
  const libraryCards = projects.filter((p) => p.id !== currentLibraryId);

  return (
    <div className="sp-backdrop" onClick={onContinue}>
      <div className="sp-panel" onClick={(e) => e.stopPropagation()}>
        <button className="sp-close" onClick={onContinue} title="Continue with the current scene" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>

        <div className="sp-head">
          <h2>Projects</h2>
          <p>Pick a project to open, start a new one, or continue where you left off.</p>
        </div>

        <div className="sp-grid">
          {/* Current scene */}
          <button className="sp-card sp-current" onClick={onContinue}>
            <div className="sp-thumb">
              {currentThumb ? <img src={currentThumb} alt="current scene" /> : <div className="sp-thumb-empty" />}
              <span className="sp-badge">Current</span>
            </div>
            <div className="sp-card-foot">
              <span className="sp-name">{currentName ? currentName : 'Continue working'}</span>
              <span className="sp-save" title="Save this scene to your library" onClick={(e) => { e.stopPropagation(); onSaveCurrent(); }}>＋ Library</span>
            </div>
          </button>

          {/* New project */}
          <button className="sp-card sp-new" onClick={onNew}>
            <div className="sp-thumb sp-thumb-new">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <div className="sp-card-foot"><span className="sp-name">New project</span></div>
          </button>

          {/* Library projects */}
          {libraryCards.map((p) => (
            <button key={p.id} className="sp-card" onClick={() => onOpen(p)}>
              <div className="sp-thumb">
                {p.thumb ? <img src={p.thumb} alt={p.name} /> : <div className="sp-thumb-empty" />}
                <span className="sp-del" title="Remove from library" onClick={(e) => onDelete(e, p.id)}>✕</span>
              </div>
              <div className="sp-card-foot">
                <span className="sp-name">{p.name}</span>
                <span className="sp-date">{new Date(p.updatedAt).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Predefined starter projects */}
        <div className="sp-predef">
          <span className="sp-predef-label">Open a predefined project</span>
          <div className="sp-predef-row">
            {PREDEFINED.map((p) => (
              <button key={p.key} className="sp-chip" onClick={() => onPredefined(p)}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
                  <rect x="2.5" y="2.5" width="11" height="11" rx="2" /><path d="M5.5 8h5M8 5.5v5" />
                </svg>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
