/**
 * HomeButton — a viewport overlay at the top of the 3D canvas that resets every
 * movable joint to its rest position (value 0). It appears for ANY project the moment
 * at least one (non-fixed) joint exists — arm, humanoid, modular, ball, anything — so
 * "Home" is always one click away regardless of robot type. The reset goes through the
 * command bus, so it's a single undoable step.
 */
import './HomeButton.css';
import { useModelStore } from '@/state/modelStore';
import { commands } from '@/core/commands/index';

export default function HomeButton() {
  const movableCount = useModelStore(
    (s) => Object.values(s.doc.joints).filter((j) => j.type !== 'fixed').length,
  );
  if (movableCount === 0) return null;

  const home = () => {
    const { doc, dispatch } = useModelStore.getState();
    const map: Record<string, number> = {};
    for (const j of Object.values(doc.joints)) if (j.type !== 'fixed') map[j.id] = 0;
    dispatch(commands.setJointValues(map));
  };

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
