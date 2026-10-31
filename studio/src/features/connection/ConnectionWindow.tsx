import './ConnectionWindow.css';
import { useState, useRef, useEffect } from 'react';
import { beginDrag } from '@/features/common/drag';
import { scheduleFrame } from '@/runtime/frameScheduler';

/** Floating, draggable, corner-resizable window (header drag, ✕ close). */
export default function ConnectionWindow({ isOpen, onClose, title = 'SIM → ESP', children }: any) {
  const [pos,     setPos]     = useState<any>(null);          // null = CSS default (top-right)
  const [size,    setSize]    = useState({ w: 300, h: 430 });
  const [visible, setVisible] = useState(false);

  const windowRef = useRef<any>(null);

  // CSS open/close animation
  useEffect(() => {
    if (isOpen) {
      scheduleFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // Drag from header
  const startDrag = (e: React.MouseEvent) => {
    const rect = windowRef.current?.getBoundingClientRect();
    if (!rect) return;
    beginDrag(e, 'grabbing', (dx, dy) => setPos({
      x: Math.max(0, Math.min(window.innerWidth  - 80, rect.left + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 40, rect.top + dy)),
    }));
  };

  // Resize from bottom-right corner
  const startResize = (e: React.MouseEvent) => {
    const { w, h } = size;
    beginDrag(e, 'nwse-resize', (dx, dy) => setSize({ w: Math.max(240, w + dx), h: Math.max(280, h + dy) }));
  };

  // pos=null → use CSS default positioning (right:12px, top:80px)
  const posStyle = pos
    ? { left: pos.x, top: pos.y, right: 'auto' }
    : {};

  return (
    <div
      ref={windowRef}
      className={`conn-window${visible ? ' conn-window--open' : ''}`}
      style={{ width: size.w, height: size.h, ...posStyle }}
    >
      {/* Drag handle header */}
      <div className="conn-window-header" onMouseDown={startDrag}>
        <svg width="14" height="9" viewBox="0 0 14 9" fill="none" className="conn-drag-dots">
          <circle cx="2"  cy="2" r="1.4" fill="currentColor" opacity="0.45"/>
          <circle cx="7"  cy="2" r="1.4" fill="currentColor" opacity="0.45"/>
          <circle cx="12" cy="2" r="1.4" fill="currentColor" opacity="0.45"/>
          <circle cx="2"  cy="7" r="1.4" fill="currentColor" opacity="0.45"/>
          <circle cx="7"  cy="7" r="1.4" fill="currentColor" opacity="0.45"/>
          <circle cx="12" cy="7" r="1.4" fill="currentColor" opacity="0.45"/>
        </svg>
        <span className="conn-window-title">{title}</span>
        <button
          className="conn-close-btn"
          onMouseDown={e => e.stopPropagation()}
          onClick={onClose}
          title="Close"
        >✕</button>
      </div>

      {/* Content */}
      <div className="conn-window-body">{children}</div>

      {/* Resize corner */}
      <div className="conn-resize-handle" onMouseDown={startResize} />
    </div>
  );
}