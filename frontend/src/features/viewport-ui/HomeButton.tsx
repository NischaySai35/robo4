/**
 * HomeButton — smoothly animates every movable joint back to rest (value 0).
 * Uses applyTransient so the per-frame updates bypass undo history; a single
 * undoable snapshot is committed at the end.
 */
import './HomeButton.css';
import { useModelStore } from '@/state/modelStore';
import { commands } from '@/core/commands/index';
import type { Document } from '@/core/model/index';
import { stopAllSpins } from '@/features/motor/spinEngine';
import { solveHome } from '@/features/assembly/connectorSnap';

const DURATION = 500;

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export default function HomeButton() {
  const movableCount = useModelStore(
    (s) => Object.values(s.doc.joints).filter((j) => j.type !== 'fixed').length,
  );
  if (movableCount === 0) return null;

  const home = () => {
    stopAllSpins(); // halt any continuous motors so they don't fight the reset
    const { doc, applyTransient, dispatch } = useModelStore.getState();

    // Try to home: pull every joint to rest, projecting locked loops back onto their
    // closure manifold so the connectors stay shut. We only refuse if the module truly
    // CAN'T rest closed (the projected pose can't close the loop) — not merely because a
    // loop exists. Rest is where the locks were formed, so this normally just works.
    const { values: target, ok } = solveHome(doc);
    if (!ok) {
      alert("Can't Home — this module can't return to rest without pulling a locked connector apart (the loop won't close at the home pose). Unlock one connector to free it.");
      return;
    }

    const startValues: Record<string, number> = {};
    for (const j of Object.values(doc.joints)) {
      if (j.type !== 'fixed') startValues[j.id] = (j as any).state?.value ?? 0;
    }
    const ids = Object.keys(startValues);
    if (ids.length === 0) return;

    const startTime = performance.now();
    const tick = () => {
      const t = Math.min((performance.now() - startTime) / DURATION, 1);
      const ease = easeInOut(t);
      applyTransient((d: Document) => {
        let next = d;
        for (const id of ids) {
          const j = (next.joints as any)[id];
          if (!j) continue;
          const goal = target[id] ?? 0; // closed-loop home target (0 for non-loop joints)
          const v = startValues[id] * (1 - ease) + goal * ease;
          next = { ...next, joints: { ...next.joints, [id]: { ...j, state: { ...j.state, value: v } } } };
        }
        return next;
      });
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        // Commit a single undoable step at the end so Ctrl+Z restores the pre-home pose.
        const map: Record<string, number> = {};
        for (const id of ids) map[id] = target[id] ?? 0;
        dispatch(commands.setJointValues(map));
      }
    };
    requestAnimationFrame(tick);
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
