/**
 * deleteSelected — remove the currently-selected body or joint from the model.
 * Shared by the Delete/X keyboard shortcut (App) and the left panel's UI buttons.
 * Removing a body also removes joints touching it (handled by removeBody).
 */
import { useSelectionStore } from '@/state/selectionStore';
import { useModelStore } from '@/state/modelStore';
import { commands } from '@/core/commands/index';

export function deleteSelectedEntity() {
  const { selectedId, ids } = useSelectionStore.getState();
  const targets = ids && ids.length ? ids : (selectedId ? [selectedId] : []);
  if (!targets.length) return;
  const { doc, dispatch } = useModelStore.getState();
  const affectedComponentIds = new Set<string>();
  for (const id of targets) {
    if (doc.bodies[id]) {
      if (doc.bodies[id].componentId) affectedComponentIds.add(doc.bodies[id].componentId as string);
      dispatch(commands.removeBody(id));
    } else if (doc.joints[id]) {
      if (doc.joints[id].componentId) affectedComponentIds.add(doc.joints[id].componentId as string);
      dispatch(commands.removeJoint(id));
    }
  }
  // A component left with nothing inside it (every body/joint in the selection)
  // would otherwise linger as an empty, orphaned entry in the Project Explorer.
  if (affectedComponentIds.size) {
    const latestDoc = useModelStore.getState().doc;
    for (const compId of affectedComponentIds) {
      if (!latestDoc.components[compId]) continue;
      const stillHasContent = Object.values(latestDoc.bodies).some((b) => b.componentId === compId)
        || Object.values(latestDoc.joints).some((j) => j.componentId === compId);
      if (!stillHasContent) dispatch(commands.removeComponent(compId));
    }
  }
  useSelectionStore.getState().clear();
}