/**
 * bridgeActions — the side-effecting half of the sandbox/document bridge.
 *
 * Kept out of the panel so the UI stays declarative, and out of msrrStore so the
 * sandbox store never has to know the command bus exists. Everything that touches
 * the real project document happens here and only here.
 */
import { useModelStore } from '@/state/modelStore';
import { commands } from '@/core/commands/index';
import { useMsrrStore, configAtStep } from '@/state/msrrStore';
import {
  buildConfigEntities, setRegistry, clearRegistry, mirrorUpdater,
  findMirrorComponents, restingPoses, mirrorComponentIds,
} from '@/robotics/msrr/mirror';
import { poseAt, orientationAfter, IDENTITY_QUAT, type Pose } from '@/robotics/msrr/executor';

let unsubscribe: (() => void) | null = null;

/**
 * Start mirroring: add one real module per cell, then subscribe to the sandbox
 * store so every playback frame pushes poses into the document as a transient
 * update (the 60 Hz path that bypasses undo history — a plan of 400 moves must
 * not leave 400 undo entries behind).
 */
export function startMirror(): number {
  stopMirror();

  const model = useModelStore.getState();
  const msrr = useMsrrStore.getState();
  const { entities, records } = buildConfigEntities(model.doc, msrr.config, msrr.cellSize, true);
  if (!entities.length) return 0;

  model.dispatch(commands.addEntities(entities, `Mirror ${records.length} MSRR modules`));
  setRegistry(records);

  // Fires on every sandbox state change, including the per-frame playback tick —
  // which is exactly the update rate the mirror needs.
  unsubscribe = useMsrrStore.subscribe(() => {
    useModelStore.getState().applyTransient(mirrorUpdater(currentPoses()));
  });

  // Push the initial resting poses immediately so the scene is correct before
  // anything plays.
  useModelStore.getState().applyTransient(mirrorUpdater(currentPoses()));
  return records.length;
}

/** Remove every mirrored module and stop following the sandbox. */
export function stopMirror() {
  unsubscribe?.();
  unsubscribe = null;

  const model = useModelStore.getState();
  // Prefer the live registry; fall back to the document tags so a mirror left
  // behind by a reload can still be cleaned up.
  const ids = mirrorComponentIds().length ? mirrorComponentIds() : findMirrorComponents(model.doc);
  for (const id of ids) {
    if (model.doc.components?.[id]) model.dispatch(commands.removeComponentAndContents(id));
  }
  clearRegistry();
}

/**
 * Poses for every module at the current playback position: resting cells for the
 * modules standing still, the interpolated arc for the one in flight.
 */
function currentPoses(): Map<string, Pose> {
  const s = useMsrrStore.getState();
  const { plan, playback, config, cellSize } = s;

  if (!plan || !plan.moves.length) return restingPoses(config, cellSize);

  const atStep = configAtStep(config, plan.moves, playback.index);
  const poses = restingPoses(atStep, cellSize);

  // Accumulated orientation, so repeated pivots compose rather than snapping back.
  const quats = new Map<string, [number, number, number, number]>();
  for (let i = 0; i < playback.index; i++) {
    const m = plan.moves[i];
    quats.set(m.moduleId, orientationAfter(m, quats.get(m.moduleId) ?? IDENTITY_QUAT));
  }
  for (const [id, q] of quats) {
    const p = poses.get(id);
    if (p) poses.set(id, { position: p.position, quaternion: q });
  }

  const active = plan.moves[playback.index];
  if (active) {
    poses.set(active.moduleId, poseAt(
      active, playback.t, cellSize, quats.get(active.moduleId) ?? IDENTITY_QUAT,
    ));
  }
  return poses;
}

/**
 * One-shot snapshot into the project document: real modules, untagged, kept as a
 * normal undoable edit. Unlike the mirror these are yours to edit afterwards.
 */
export function materializeCurrent(): number {
  const model = useModelStore.getState();
  const msrr = useMsrrStore.getState();
  const { entities, records } = buildConfigEntities(model.doc, msrr.config, msrr.cellSize, false);
  if (!entities.length) return 0;
  model.dispatch(commands.addEntities(entities, `Materialize ${records.length} MSRR modules`));
  return records.length;
}

/**
 * The plan as JSON — the hardware command stream. Deliberately includes the swept
 * path and pivot geometry, not just from/to: a coordinator that only knew the
 * endpoints would have to re-derive the trajectory, and could derive a different
 * one than the planner verified as collision-free.
 */
export function exportPlanJson() {
  const s = useMsrrStore.getState();
  if (!s.plan) return;

  const payload = {
    format: 'msrr-plan',
    version: 1,
    savedAt: new Date().toISOString(),
    moveModel: s.options.model,
    strategy: s.options.strategy,
    cellSize: s.cellSize,
    stabilityGate: s.options.requireStability,
    start: [...s.config.occ].map(([k, id]) => ({ module: id, cell: k.split(',').map(Number) })),
    target: s.plan.goalCells,
    complete: s.plan.complete,
    moves: s.plan.moves.map((m, i) => ({
      index: i,
      module: m.moduleId,
      kind: m.kind,
      from: m.from,
      to: m.to,
      anchor: m.anchor,
      swept: m.swept,
      pivot: m.pivot ?? null,
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `msrr-plan-${s.plan.moves.length}moves.json`;
  a.click();
  URL.revokeObjectURL(url);
}
