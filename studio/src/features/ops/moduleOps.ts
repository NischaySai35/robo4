/**
 * moduleOps — Add Module and Home as plain functions, so buttons, shortcuts, scripts and GOS run the same code
 * (P6). Moved out of LeftPanel and HomeButton unchanged in behaviour.
 */
import { useModelStore } from '@/state/modelStore';
import { useSelectionStore } from '@/state/selectionStore';
import { commands } from '@/core/commands/index';
import { bodiesOfComponent, jointsOfComponent, uid, type Document } from '@/core/model/index';
import { buildDefaultModuleEntities } from '@/core/factory/defaultModule';
import { duplicateInPlace, duplicateJointInPlace, reassignServoIds } from '@/features/ops/bodyOps';
import { solveHome } from '@/assembly/connectorSnap';
import { stopAllSpins } from '@/features/motor/spinEngine';
import { scheduleFrame } from '@/runtime/frameScheduler';

/** Add a module: a copy of the project's first module beside the others, or the default module in an empty project. */
export function addModule(): { componentId: string | null; bodyIds: string[] } {
  const { doc, dispatch } = useModelStore.getState();
  const comps = Object.values(doc.components ?? {});
  const templateId = comps[0]?.id;
  const template = templateId ? doc.components[templateId] : null;
  const templateBodies = templateId ? bodiesOfComponent(doc, templateId) : [];
  // No module in THIS project → instantiate the global default module (the
  // bundled hand-built one, or the user's saved override) so Add Module works
  // in every project, not just the one that contains the original.
  if (!template || !templateBodies.length) {
    const { entities, componentName } = buildDefaultModuleEntities(doc);
    if (!entities.length) throw new Error('No default module available.');
    dispatch(commands.addEntities(entities, `Add ${componentName}`));
    const bodyIds = entities.filter((e: any) => e.kind === 'body').map((e: any) => e.id);
    useSelectionStore.getState().selectMany(bodyIds, 'body');
    return { componentId: entities.find((e: any) => e.kind === 'component')?.id ?? null, bodyIds };
  }
  const templateJoints = jointsOfComponent(doc, templateId!);

  // Offset along +X by the template's own width (+ a margin), stepped further out
  // for each existing copy so modules line up side by side without overlapping.
  let minX = Infinity, maxX = -Infinity;
  for (const b of templateBodies) {
    minX = Math.min(minX, b.transform.position[0]);
    maxX = Math.max(maxX, b.transform.position[0]);
  }
  const spacing = Math.max(0.15, maxX - minX) + 0.25;
  const existingCopies = comps.filter((c) => c.name === template.name || c.name.startsWith(`${template.name} `)).length;
  const offsetX = spacing * existingCopies;

  const newComponent = { ...structuredClone(template), id: uid('comp'), name: `${template.name} ${existingCopies + 1}` };
  const bodyIdRemap = new Map<string, string>();
  const newBodies = templateBodies.map((b) => {
    const copy = duplicateInPlace(b);
    copy.componentId = newComponent.id;
    copy.transform = { ...copy.transform, position: [copy.transform.position[0] + offsetX, copy.transform.position[1], copy.transform.position[2]] };
    bodyIdRemap.set(b.id, copy.id);
    return copy;
  });
  const jointIdRemap = new Map<string, string>();
  for (const j of templateJoints) jointIdRemap.set(j.id, uid('joint'));
  let newJoints = templateJoints.map((j) => {
    const copy = duplicateJointInPlace(j, bodyIdRemap, jointIdRemap);
    copy.componentId = newComponent.id;
    return copy;
  });
  // New module copy gets its own servo ids, continuing from whatever's already
  // assigned — otherwise it'd collide with the template module's real servos.
  newJoints = reassignServoIds(newJoints, doc);

  dispatch(commands.addEntities([newComponent, ...newBodies, ...newJoints], `Add ${newComponent.name}`));
  useSelectionStore.getState().selectMany(newBodies.map((b) => b.id), 'body');
  return { componentId: newComponent.id, bodyIds: newBodies.map((b) => b.id) };
}

const HOME_MS = 500;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

/** Move every joint smoothly to rest, keeping locked loops shut; one undo step at the end. */
export function homePose() {
  stopAllSpins(); // halt any continuous motors so they don't fight the reset
  const { doc, applyTransient, dispatch } = useModelStore.getState();

  // Pull every joint to rest, projecting locked loops back onto their closure manifold so the
  // connectors stay shut. Refuse only if the module truly can't rest closed.
  const { values: target, ok } = solveHome(doc);
  if (!ok) throw new Error("Can't Home: this module can't return to rest without pulling a locked connector apart (the loop won't close at the home pose). Unlock one connector to free it.");

  const startValues: Record<string, number> = {};
  for (const j of Object.values(doc.joints)) {
    if (j.type !== 'fixed') startValues[j.id] = (j as any).state?.value ?? 0;
  }
  const ids = Object.keys(startValues);
  if (ids.length === 0) return;

  const startTime = performance.now();
  const tick = () => {
    const t = Math.min((performance.now() - startTime) / HOME_MS, 1);
    const ease = easeInOut(t);
    applyTransient((d: Document) => {
      let next = d;
      for (const id of ids) {
        const j = (next.joints as any)[id];
        if (!j) continue;
        const v = startValues[id] * (1 - ease) + (target[id] ?? 0) * ease;
        next = { ...next, joints: { ...next.joints, [id]: { ...j, state: { ...j.state, value: v } } } };
      }
      return next;
    });
    if (t < 1) scheduleFrame(tick);
    else {
      // Commit a single undoable step at the end so Ctrl+Z restores the pre-home pose.
      const map: Record<string, number> = {};
      for (const id of ids) map[id] = target[id] ?? 0;
      dispatch(commands.setJointValues(map));
    }
  };
  scheduleFrame(tick);
}
