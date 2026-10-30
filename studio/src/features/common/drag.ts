/**
 * Shared mouse-drag plumbing for every resize handle / draggable window: left-button
 * check, body cursor + no text selection while dragging, and listener cleanup on
 * release. `onMove` gets the pointer delta from the press point.
 */
import { useEffect, useState } from 'react';

export function beginDrag(
  e: React.MouseEvent,
  cursor: string,
  onMove: (dx: number, dy: number, ev: MouseEvent) => void,
  onEnd?: () => void,
): void {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  const x0 = e.clientX, y0 = e.clientY;
  document.body.style.cursor = cursor;
  document.body.style.userSelect = 'none';
  const move = (ev: MouseEvent) => onMove(ev.clientX - x0, ev.clientY - y0, ev);
  const up = () => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    onEnd?.();
  };
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
}

/** A number (panel width/height) kept in localStorage under `key`, clamped to [min, max]. */
export function usePersistedSize(key: string, def: number, min: number, max: number) {
  const [v, setV] = useState(() => {
    const n = parseInt(localStorage.getItem(key) || '', 10);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
  });
  useEffect(() => { localStorage.setItem(key, String(v)); }, [key, v]);
  const set = (n: number) => setV(Math.min(max, Math.max(min, n)));
  return [v, set] as const;
}
