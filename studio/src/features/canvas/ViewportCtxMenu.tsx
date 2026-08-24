/**
 * ViewportCtxMenu — right-click context menu for the 3D canvas.
 *
 * Triggered when the user right-clicks a body in any page except
 * editor+rigid mode (which keeps the quick "set active body" UX).
 * Rendered as a portal so it's never clipped by panel boundaries.
 */
import { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSelectionStore } from '@/state/selectionStore';
import { useModelStore } from '@/state/modelStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { groundBody } from '@/features/rigid/groundBody';
import { useAnimSceneStore } from '@/state/animSceneStore';
import { useDockStore } from '@/state/dockStore';
import { commands } from '@/core/commands/index';
import { uid } from '@/core/model/index';
import type { Connector } from '@/core/model/index';
import SpinControls from '@/features/motor/SpinControls';
import { isEndBody, connectorClass } from '@/features/motor/endBody';

function smartPos(x: number, y: number) {
  const vw = window.innerWidth, vh = window.innerHeight;
  return {
    left: x + 220 > vw - 8 ? Math.max(8, x - 220) : x,
    top:  y + 340 > vh - 8 ? Math.max(8, y - 340) : y,
  };
}

export default function ViewportCtxMenu() {
  const menu    = useSelectionStore((s) => s.vpCtxMenu);
  const doc     = useModelStore((s) => s.doc);
  const dispatch = useModelStore((s) => s.dispatch);
  const select  = useSelectionStore((s) => s.select);
  const openPanel = useDockStore((s) => s.open);
  const { bodyMode, activeBodyId } = useWorkspaceStore((s) => ({
    bodyMode: s.bodyMode,
    activeBodyId: s.activeBodyId,
  }));
  const rigidMode = useAnimSceneStore((s) => s.rigidMode);

  const close = useCallback(() => useSelectionStore.getState().setVpCtxMenu(null), []);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu, close]);

  if (!menu) return null;

  const body = doc.bodies[menu.bodyId];
  if (!body) return null;

  const connectors: Connector[] = (body.meta?.connectors as Connector[] | undefined) ?? [];
  // Spinnable ("motor") joints attached to this body — surface CW/CCW/Stop here so
  // an end module can be driven straight from its right-click menu.
  // CW/CCW is an END-body action only (endlock / endlock2). Middle links don't get it.
  const motorJoints = isEndBody(body)
    ? Object.values(doc.joints).filter((j: any) =>
        (j.type === 'revolute' || j.type === 'continuous')
        && (j.parentBodyId === menu.bodyId || j.childBodyId === menu.bodyId))
    : [];
  const pos = smartPos(menu.x, menu.y);
  const isAnimPage = menu.page === 'animation';
  const isEditorPage = menu.page === 'editor';

  const addConnector = () => {
    const existing: Connector[] = (body.meta?.connectors as Connector[] | undefined) ?? [];
    const con: Connector = { id: uid('con'), name: `Connector ${existing.length + 1}`, position: [0, 0, 0], normal: [0, 0, 1] };
    dispatch(commands.updateBody(menu.bodyId, { meta: { ...body.meta, connectors: [...existing, con] } }));
    select(menu.bodyId, 'body');
    openPanel('inspector');
    close();
  };

  const deleteConnector = (conId: string) => {
    const existing: Connector[] = (body.meta?.connectors as Connector[] | undefined) ?? [];
    dispatch(commands.updateBody(menu.bodyId, { meta: { ...body.meta, connectors: existing.filter((c) => c.id !== conId) } }));
  };

  const setMateSlot = (slot: 'A' | 'B', conId: string) => {
    const fn = slot === 'A'
      ? useAnimSceneStore.getState().setMateSlotA
      : useAnimSceneStore.getState().setMateSlotB;
    fn({ bodyId: menu.bodyId, connectorId: conId });
    close();
  };

  const toggleActive = () => {
    useAnimSceneStore.getState().toggleBodyActive(menu.bodyId);
    close();
  };

  return createPortal(
    <>
      <div
        className="px-ctx-backdrop"
        onMouseDown={close}
        onContextMenu={(e) => { e.preventDefault(); close(); }}
      />
      <div className="px-ctx-menu" style={pos}>

        {/* Body name header */}
        <div className="px-ctx-header">{body.name}</div>
        <div className="px-ctx-sep" />

        {/* Selection / inspection */}
        <button onClick={() => { select(menu.bodyId, 'body'); close(); }}>✎ Select</button>
        {isEditorPage && (
          <button onClick={() => { select(menu.bodyId, 'body'); openPanel('inspector'); close(); }}>
            📋 Open Inspector
          </button>
        )}

        {/* Rigid mode: make this body the grounded base (the "green" rigid anchor). Works
            on every page that shares the workspace rigid grounding (editor/analysis/animation). */}
        {bodyMode === 'rigid' && (
          <button onClick={() => {
            const ws = useWorkspaceStore.getState();
            groundBody(ws.activeBodyId === menu.bodyId ? null : menu.bodyId);
            close();
          }}>
            {activeBodyId === menu.bodyId ? '⬛ Unset Rigid Base' : '🟢 Make Rigid Base (ground here)'}
          </button>
        )}

        {/* Super Rigid: pin this body in space — unaffected by gravity, immovable. Pins
            the whole connected model. */}
        <button onClick={() => {
          const cur = !!(body.meta as any)?.superRigid;
          dispatch(commands.updateBody(menu.bodyId, { meta: { ...body.meta, superRigid: !cur } }));
          close();
        }}>
          {(body.meta as any)?.superRigid ? '🧷 Unset Super Rigid' : '🧷 Make Super Rigid (pin in space)'}
        </button>

        {/* Animation: rigid mode toggle active */}
        {isAnimPage && rigidMode && (
          <button onClick={toggleActive}>
            {useAnimSceneStore.getState().activeBodyIds.has(menu.bodyId)
              ? '○ Deactivate (stop dragging)'
              : '⬤ Activate (allow drag)'}
          </button>
        )}

        {/* Motor — end-lock bodies drive their joint continuously. CW / CCW / Stop directly. */}
        {motorJoints.length > 0 && (
          <>
            <div className="px-ctx-sep" />
            <div className="px-ctx-section">Motor</div>
            {motorJoints.map((j: any) => (
              <div key={j.id} className="px-ctx-spin" onClick={(e) => e.stopPropagation()} style={{ padding: '2px 10px 6px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>{j.name}</div>
                <SpinControls jointId={j.id} showRpm compact />
              </div>
            ))}
          </>
        )}

        <div className="px-ctx-sep" />

        {/* Connectors — labelled END (on end-lock bodies) or SIDE (on mid bodies). */}
        <div className="px-ctx-section">Connectors · {connectorClass(body) === 'end' ? 'END' : 'SIDE'}</div>
        {connectors.length === 0 && (
          <div style={{ padding: '3px 11px 5px', fontSize: 11, color: 'var(--text-dim)' }}>
            No connectors yet
          </div>
        )}
        {connectors.map((c) => (
          <div key={c.id} className="px-ctx-con-row">
            <span className="px-ctx-con-name">◈ {c.name}</span>
            {isAnimPage && (
              <>
                <button title="Set as Mate A" onClick={(e) => { e.stopPropagation(); setMateSlot('A', c.id); }}>A</button>
                <button title="Set as Mate B" onClick={(e) => { e.stopPropagation(); setMateSlot('B', c.id); }}>B</button>
              </>
            )}
            <button className="danger" title="Delete connector" onClick={(e) => { e.stopPropagation(); deleteConnector(c.id); }}>✕</button>
          </div>
        ))}
        <button onClick={addConnector}>+ Add Connector</button>

      </div>
    </>,
    document.body,
  );
}
