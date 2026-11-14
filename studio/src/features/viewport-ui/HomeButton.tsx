/**
 * HomeButton — smoothly animates every movable joint back to rest (value 0).
 * Uses applyTransient so the per-frame updates bypass undo history; a single
 * undoable snapshot is committed at the end.
 */
import './HomeButton.css';
import { useModelStore } from '@/state/modelStore';
import { resetLayout } from '@/features/ops/moduleOps';
import { runOperator } from '@/core/ops/registry';


export default function HomeButton() {
  const movableCount = useModelStore(
    (s) => Object.values(s.doc.joints).filter((j) => j.type !== 'fixed').length,
  );
  if (movableCount === 0) return null;

  const home = () => { const r = runOperator('pose.home'); if (!r.ok) alert(r.error); };
  // Reset (12 Nov): EVERYTHING back to how the project was when it was opened - module positions and every joint
  const reset = () => {
    if (!confirm('Reset: every joint straight and every module flat in a row (locks between modules undone)? Ctrl+Z undoes it.')) return;
    const st = useModelStore.getState();
    if (st.showingSimulation) st.bus.revertToDesign();
    const r = resetLayout(); if (!r.ok) alert(r.error);
  };

  return (
    <>
      <button className="canvas-home-btn" onClick={home} title="Home — reset all joints to their rest position">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
          <path d="M2 6.5L7 2l5 4.5M3.5 5.5V12h7V5.5" />
        </svg>
        Home
      </button>
      <button className="canvas-home-btn" onClick={reset} data-testid="scene-reset"
        title="Reset — every joint straight, every module flat in a row (Ctrl+Z undoes it)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
          <path d="M2.5 7a4.5 4.5 0 1 0 1.3-3.2M2.5 2v2.8h2.8" />
        </svg>
        Reset
      </button>
    </>
  );
}
