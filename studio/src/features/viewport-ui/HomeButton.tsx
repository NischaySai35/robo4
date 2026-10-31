/**
 * HomeButton — smoothly animates every movable joint back to rest (value 0).
 * Uses applyTransient so the per-frame updates bypass undo history; a single
 * undoable snapshot is committed at the end.
 */
import './HomeButton.css';
import { useModelStore } from '@/state/modelStore';
import { runOperator } from '@/core/ops/registry';


export default function HomeButton() {
  const movableCount = useModelStore(
    (s) => Object.values(s.doc.joints).filter((j) => j.type !== 'fixed').length,
  );
  if (movableCount === 0) return null;

  const home = () => { const r = runOperator('pose.home'); if (!r.ok) alert(r.error); };

  return (
    <button className="canvas-home-btn" onClick={home} title="Home — reset all joints to their rest position">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
        <path d="M2 6.5L7 2l5 4.5M3.5 5.5V12h7V5.5" />
      </svg>
      Home
    </button>
  );
}
