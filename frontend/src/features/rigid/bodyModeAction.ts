/**
 * setBodyModePreservingPose — switch Free ⇄ Rigid without the view snapping.
 *
 * FK anchors the whole model at ONE root body's authored transform. Rigid mode roots at the
 * grounded (active) body; Free mode clears it and roots at a natural base instead. Because those
 * two bodies' authored transforms differ from their current posed world, plain toggling makes the
 * whole robot jump to re-anchor. So before dropping the grounded base (rigid → free) we BAKE every
 * body's current FK world into its transform — then whichever body FK re-roots at is already where
 * it appears, and nothing moves. Shape still Homes normally afterward (Home only touches joints).
 */
import { useModelStore } from '@/state/modelStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { computeFK } from '@/kinematics/modelFK';
import { commands } from '@/core/commands/index';

export function setBodyModePreservingPose(mode: 'free' | 'rigid'): void {
  const ws = useWorkspaceStore.getState();
  // Only the rigid → free switch changes the anchor (it clears the grounded base) → only that
  // direction snaps. Bake the live pose there so the re-root is invisible.
  if (mode === 'free' && ws.bodyMode === 'rigid') {
    const { doc, dispatch } = useModelStore.getState();
    const fk = computeFK(doc);
    const patches: [string, any][] = Object.keys(doc.bodies).map((id) => {
      const w = fk.get(id);
      const t = (doc.bodies as any)[id].transform;
      return [id, { transform: { ...t, position: w ? w.position : t.position, quaternion: w ? w.quaternion : t.quaternion } }];
    });
    if (patches.length) dispatch(commands.updateBodies(patches));
  }
  ws.setBodyMode(mode);
}
