/**
 * ResizablePanel — a right-side panel with a drag handle on its LEFT edge so it can be
 * resized on every page (Analysis / Training / Animation / Motor), the same way the
 * Editor's left panel + dock resize. Width persists per `storageKey`.
 */
import { beginDrag, usePersistedSize } from './drag';
import './ResizablePanel.css';

export default function ResizablePanel({
  storageKey, defaultW = 400, min = 260, max = 640, children,
}: {
  storageKey: string; defaultW?: number; min?: number; max?: number; children: React.ReactNode;
}) {
  const [width, setWidth] = usePersistedSize(storageKey, defaultW, min, max);
  // panel is on the right → dragging the handle LEFT (negative dx) widens it.
  const startResize = (e: React.MouseEvent) => {
    const w0 = width;
    beginDrag(e, 'col-resize', (dx) => setWidth(w0 - dx));
  };

  return (
    <div className="rsz-panel" style={{ width }}>
      <div className="rsz-handle" onMouseDown={startResize} title="Drag to resize" />
      <div className="rsz-body">{children}</div>
    </div>
  );
}
