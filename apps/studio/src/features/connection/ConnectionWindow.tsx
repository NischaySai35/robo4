import './ConnectionWindow.css';
import { useState, useRef, useCallback, useEffect } from 'react';

export default function ConnectionWindow({ isOpen, onClose, children }: any) {
  const [pos,     setPos]     = useState<any>(null);          // null = CSS default (top-right)
  const [size,    setSize]    = useState({ w: 300, h: 430 });
  const [visible, setVisible] = useState(false);

  const windowRef = useRef<any>(null);
  const sizeRef   = useRef({ w: 300, h: 430 });
  useEffect(() => { sizeRef.current = size; }, [size]);

  // CSS open/close animation
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // Drag from header
  const startDrag = useCallback((e: any) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const rect = windowRef.current?.getBoundingClientRect();
    if (!rect) return;
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    const onMove = (e: any) => {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - 80, e.clientX - offX)),
        y: Math.max(0, Math.min(window.innerHeight - 40, e.clientY - offY)),
      });
    };
    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  }, []);

  // Resize from bottom-right corner
  const startResize = useCallback((e: any) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const { w: startW, h: startH } = sizeRef.current;
    const startX = e.clientX;
    const startY = e.clientY;
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';

    const onMove = (e: any) => {
      setSize({
        w: Math.max(240, startW + (e.clientX - startX)),
        h: Math.max(280, startH + (e.clientY - startY)),
      });
    };
    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  }, []);

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
        <span className="conn-window-title">SIM → ESP</span>
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