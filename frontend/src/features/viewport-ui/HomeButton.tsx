/**
 * HomeButton — smoothly animates every movable joint back to rest (value 0).
 * Uses applyTransient so the per-frame updates bypass undo history; a single
 * undoable snapshot is committed at the end.
 */
import './HomeButton.css';
import { useModelStore } from '@/state/modelStore';
import { commands } from '@/core/commands/index';
import type { Document } from '@/core/model/index';

const DURATION = 500;

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/** True if the joint graph contains a CYCLE (e.g. two connectors locked into a ring).
 *  Homing the revolute joints of such a loop can't satisfy the fixed loop closure, so it
 *  would tear the module apart — we refuse instead. Union-find: a joint that connects two
 *  already-connected bodies closes a loop. */
function hasLockedLoop(doc: Document): boolean {
  const parent = new Map<string, string>();
  for (const id of Object.keys(doc.bodies)) parent.set(id, id);
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    while (parent.get(x) !== r) { const n = parent.get(x)!; parent.set(x, r); x = n; }
    return r;
  };
  for (const j of Object.values(doc.joints)) {
    const a = j.parentBodyId as string, b = j.childBodyId as string;
    if (!a || !b || !parent.has(a) || !parent.has(b)) continue;
    const ra = find(a), rb = find(b);
    if (ra === rb) return true;   // this joint closes a ring
    parent.set(ra, rb);
  }
  return false;
}

export default function HomeButton() {
  const movableCount = useModelStore(
    (s) => Object.values(s.doc.joints).filter((j) => j.type !== 'fixed').length,
  );
  if (movableCount === 0) return null;

  const home = () => {
    const { doc, applyTransient, dispatch } = useModelStore.getState();
    if (hasLockedLoop(doc)) {
      alert("Can't Home — this module has a locked connector loop (two connectors joined into a ring). Unlock one connector first; otherwise homing the joints would break the module apart.");
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
          const v = startValues[id] * (1 - ease);
          next = { ...next, joints: { ...next.joints, [id]: { ...j, state: { ...j.state, value: v } } } };
        }
        return next;
      });
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        // Commit a single undoable step at the end so Ctrl+Z restores the pre-home pose.
        const map: Record<string, number> = {};
        for (const id of ids) map[id] = 0;
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
