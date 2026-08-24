/**
 * groundBody — set (or clear) the rigid grounded base WITHOUT the scene jumping.
 *
 * Rigid FK (computeFKGraph) anchors the whole model at the grounded body's stored
 * `transform`. But a body's stored transform is its REST pose, while a posed model shows
 * bodies at their FK positions. So naively switching the base snaps that body from where it
 * appears to its rest transform, yanking everything with it.
 *
 * Fix: before switching, bake the new base's CURRENT world pose (from the old root's FK)
 * into its transform. Then re-rooting reproduces every body's on-screen position exactly —
 * because FK positions are relative (base_world × joint transforms), and the base_world is
 * now unchanged. One undo step (the transform edit); base toggles/clears don't re-anchor.
 */
import { useModelStore } from '@/state/modelStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { computeFK } from '@/kinematics/modelFK';
import { commands } from '@/core/commands/index';

export function groundBody(newId: string | null) {
  const ws = useWorkspaceStore.getState();
  // Only re-anchor when actually SWITCHING to a real body in rigid mode.
  if (newId && ws.bodyMode === 'rigid' && newId !== ws.activeBodyId && useModelStore.getState().doc.bodies[newId]) {
    const doc = useModelStore.getState().doc;
    const w = computeFK(doc).get(newId);          // world pose with the OLD root
    const body = doc.bodies[newId];
    if (w && body) {
      const cur = body.transform ?? {};
      const cp = (cur.position ?? [0, 0, 0]) as number[];
      const moved = Math.hypot(cp[0] - w.position[0], cp[1] - w.position[1], cp[2] - w.position[2]) > 1e-6;
      if (moved) {
        useModelStore.getState().dispatch(commands.updateBody(newId, {
          transform: { ...cur, position: w.position, quaternion: w.quaternion },
        }));
      }
    }
  }
  ws.setActiveBodyId(newId);
}
