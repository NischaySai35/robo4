/**
 * ContextMenu — the one right-click menu used everywhere (project explorers, the 3D
 * viewport). Portal to <body> so panels never clip it, click-outside backdrop,
 * Escape closes, and it flips left/up near the window edge.
 *
 * ConnectorItems — the shared "Connectors" block (list + ✕ delete + Add), with
 * optional A/B mate-slot buttons for the Animation page.
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useModelStore } from '@/state/modelStore';
import { commands } from '@/core/commands/index';
import { bodyConnectors, newConnector } from '@/core/model/index';
import './ContextMenu.css';

export default function ContextMenu({ x, y, title, onClose, w = 210, h = 320, children }: {
  x: number; y: number; title: React.ReactNode; onClose: () => void;
  w?: number; h?: number; children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const vw = window.innerWidth, vh = window.innerHeight;
  const pos = {
    left: x + w > vw - 8 ? Math.max(8, x - w) : x,
    top:  y + h > vh - 8 ? Math.max(8, y - h) : y,
  };
  return createPortal(
    <>
      <div className="px-ctx-backdrop" onMouseDown={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div className="px-ctx-menu" style={pos}>
        <div className="px-ctx-header">{title}</div>
        <div className="px-ctx-sep" />
        {children}
      </div>
    </>,
    document.body,
  );
}

export const MenuSep = () => <div className="px-ctx-sep" />;
export const MenuSection = ({ children }: { children: React.ReactNode }) => <div className="px-ctx-section">{children}</div>;

/** Add a fresh connector to `bodyId` (one undo step). */
export function addBodyConnector(bodyId: string) {
  const { doc, dispatch } = useModelStore.getState();
  const body = doc.bodies[bodyId];
  if (!body) return;
  const existing = bodyConnectors(body);
  dispatch(commands.updateBody(bodyId, { meta: { ...body.meta, connectors: [...existing, newConnector(existing)] } }));
}

/** Remove connector `conId` from `bodyId`. */
export function deleteBodyConnector(bodyId: string, conId: string) {
  const { doc, dispatch } = useModelStore.getState();
  const body = doc.bodies[bodyId];
  if (!body) return;
  dispatch(commands.updateBody(bodyId, { meta: { ...body.meta, connectors: bodyConnectors(body).filter((c) => c.id !== conId) } }));
}

export function ConnectorItems({ bodyId, label = 'Connectors', showEmpty = false, onMate, onAdded }: {
  bodyId: string;
  label?: React.ReactNode;
  showEmpty?: boolean;
  /** When set, each connector gets A / B buttons that fill the mate slots. */
  onMate?: (slot: 'A' | 'B', conId: string) => void;
  /** Runs after "+ Add Connector" (e.g. select the body, open the inspector, close the menu). */
  onAdded?: () => void;
}) {
  const conns = bodyConnectors(useModelStore((s) => s.doc.bodies[bodyId]));
  return (
    <>
      {(conns.length > 0 || showEmpty) && <MenuSection>{label}</MenuSection>}
      {showEmpty && conns.length === 0 && (
        <div style={{ padding: '3px 11px 5px', fontSize: 11, color: 'var(--text-dim)' }}>No connectors yet</div>
      )}
      {conns.map((c) => (
        <div key={c.id} className="px-ctx-con-row">
          <span className="px-ctx-con-name">◈ {c.name}</span>
          {onMate && (
            <>
              <button title="Set as Mate A" onClick={(e) => { e.stopPropagation(); onMate('A', c.id); }}>A</button>
              <button title="Set as Mate B" onClick={(e) => { e.stopPropagation(); onMate('B', c.id); }}>B</button>
            </>
          )}
          <button className="danger" title="Delete connector" onClick={(e) => { e.stopPropagation(); deleteBodyConnector(bodyId, c.id); }}>✕</button>
        </div>
      ))}
      <button onClick={() => { addBodyConnector(bodyId); onAdded?.(); }}>+ Add Connector</button>
    </>
  );
}
