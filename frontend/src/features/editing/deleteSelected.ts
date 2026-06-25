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
  for (const id of targets) {
    if (doc.bodies[id]) dispatch(commands.removeBody(id));
    else if (doc.joints[id]) dispatch(commands.removeJoint(id));
  }
  useSelectionStore.getState().clear();
}