/**
 * ResizablePanel — a right-side panel with a drag handle on its LEFT edge so it can be
 * resized on every page (Analysis / Training / Animation / Motor), the same way the
 * Editor's left panel + dock resize. Width persists per `storageKey`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import './ResizablePanel.css';

export default function ResizablePanel({
  storageKey, defaultW = 400, min = 260, max = 640, children,
}: {
  storageKey: string; defaultW?: number; min?: number; max?: number; children: React.ReactNode;
}) {
  const [width, setWidth] = useState(() => {
    const v = parseInt(localStorage.getItem(storageKey) || '', 10);
    return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : defaultW;
  });
  const wRef = useRef(width);
  wRef.current = width;
  useEffect(() => { localStorage.setItem(storageKey, String(width)); }, [storageKey, width]);

  const startResize = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startW = wRef.current;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev: MouseEvent) => {
      // panel is on the right → dragging the handle LEFT (negative dx) widens it.
      const next = Math.min(max, Math.max(min, startW + (startX - ev.clientX)));
      wRef.current = next;
      setWidth(next);
    };
    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [min, max]);

  return (
    <div className="rsz-panel" style={{ width }}>
      <div className="rsz-handle" onMouseDown={startResize} title="Drag to resize" />
      <div className="rsz-body">{children}</div>
    </div>
  );
}
