/**
 * ViewportCtxMenu — right-click context menu for the 3D canvas.
 *
 * Triggered when the user right-clicks a body in any page except
 * editor+rigid mode (which keeps the quick "set active body" UX).
 * Rendered as a portal so it's never clipped by panel boundaries.
 */
import { useCallback } from 'react';
import ContextMenu, { ConnectorItems, MenuSep, MenuSection } from '@/features/common/ContextMenu';
import { useSelectionStore } from '@/state/selectionStore';
import { useModelStore } from '@/state/modelStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { groundBody } from '@/features/rigid/groundBody';
import { useAnimSceneStore } from '@/state/animSceneStore';
import { useDockStore } from '@/state/dockStore';
import { commands } from '@/core/commands/index';
import SpinControls from '@/features/motor/SpinControls';
import { isEndBody, connectorClass } from '@/features/motor/endBody';

export default function ViewportCtxMenu() {
  const menu    = useSelectionStore((s) => s.vpCtxMenu);
  const doc     = useModelStore((s) => s.doc);
  const dispatch = useModelStore((s) => s.dispatch);
  const select  = useSelectionStore((s) => s.select);
  const openPanel = useDockStore((s) => s.open);
  const bodyMode = useWorkspaceStore((s) => s.bodyMode);
  const activeBodyId = useWorkspaceStore((s) => s.activeBodyId);
  const rigidMode = useAnimSceneStore((s) => s.rigidMode);

  const close = useCallback(() => useSelectionStore.getState().setVpCtxMenu(null), []);

  if (!menu) return null;

  const body = doc.bodies[menu.bodyId];
  if (!body) return null;

  // Spinnable ("motor") joints attached to this body — surface CW/CCW/Stop here so
  // an end module can be driven straight from its right-click menu.
  // CW/CCW is an END-body action only (endlock / endlock2). Middle links don't get it.
  const motorJoints = isEndBody(body)
    ? Object.values(doc.joints).filter((j: any) =>
        (j.type === 'revolute' || j.type === 'continuous')
        && (j.parentBodyId === menu.bodyId || j.childBodyId === menu.bodyId))
    : [];
  const isAnimPage = menu.page === 'animation';
  const isEditorPage = menu.page === 'editor';

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

  return (
    <ContextMenu x={menu.x} y={menu.y} w={220} h={340} title={body.name} onClose={close}>

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
            <MenuSep />
            <MenuSection>Motor</MenuSection>
            {motorJoints.map((j: any) => (
              <div key={j.id} className="px-ctx-spin" onClick={(e) => e.stopPropagation()} style={{ padding: '2px 10px 6px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>{j.name}</div>
                <SpinControls jointId={j.id} showRpm compact />
              </div>
            ))}
          </>
        )}

        <MenuSep />

        {/* Connectors — labelled END (on end-lock bodies) or SIDE (on mid bodies). */}
        <ConnectorItems
          bodyId={menu.bodyId}
          label={`Connectors · ${connectorClass(body) === 'end' ? 'END' : 'SIDE'}`}
          showEmpty
          onMate={isAnimPage ? setMateSlot : undefined}
          onAdded={() => { select(menu.bodyId, 'body'); openPanel('inspector'); close(); }}
        />
    </ContextMenu>
  );
}
