/**
 * DragWarningHud — brief, auto-fading warning shown while dragging (e.g. hitting the floor).
 * See dragWarningStore.ts.
 */
import { useDragWarningStore } from '@/state/dragWarningStore';

export default function DragWarningHud() {
  const message = useDragWarningStore((s) => s.message);
  if (!message) return null;

  const box: React.CSSProperties = {
    position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 20,
    background: 'rgba(120,30,30,0.55)', backdropFilter: 'blur(6px)',
    border: '1px solid rgba(255,120,120,0.35)', borderRadius: 8, padding: '6px 14px',
    font: '12px/1 var(--font-ui, sans-serif)', color: '#ffdede', pointerEvents: 'none',
    whiteSpace: 'nowrap',
  };

  return <div style={box}>⚠ {message}</div>;
}
