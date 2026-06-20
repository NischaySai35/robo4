/**
 * deleteSelected — remove the currently-selected body or joint from the model.
 * Shared by the Delete/X keyboard shortcut (App) and the left panel's UI buttons.
 * Removing a body also removes joints touching it (handled by removeBody).
 */
import { useSelectionStore } from '@/state/selectionStore.js';
import { useModelStore } from '@/state/modelStore.js';
import { commands } from '@/core/commands/index.js';

export function deleteSelectedEntity() {
  const { selectedId } = useSelectionStore.getState();
  if (!selectedId) return;
  const { doc, dispatch } = useModelStore.getState();
  if (doc.bodies[selectedId]) dispatch(commands.removeBody(selectedId));
  else if (doc.joints[selectedId]) dispatch(commands.removeJoint(selectedId));
  useSelectionStore.getState().clear();
}
