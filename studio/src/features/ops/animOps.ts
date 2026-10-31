/**
 * animOps — keying as plain functions, so the Timeline buttons, scripts and GOS run the same code (P6).
 * Moved out of Timeline unchanged in behaviour.
 */
import { useAnimationStore } from '@/state/animationStore';
import { useModelStore } from '@/state/modelStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { getSpin } from '@/features/motor/spinEngine';
import { isMotorJoint } from '@/features/motor/endBody';

const anim = () => useAnimationStore.getState();

export function keyJoints() {
  const doc = useModelStore.getState().doc;
  const vals: Record<string, number> = {};
  for (const j of Object.values(doc.joints)) vals[j.id] = j.state?.value ?? 0;
  if (Object.keys(vals).length) anim().addKeyframe(vals);
}

export function keyBase() {
  const ws = useWorkspaceStore.getState();
  anim().addBaseKey(ws.bodyMode === 'rigid' ? ws.activeBodyId : null);
}

export function keyConnections() {
  for (const j of Object.values(useModelStore.getState().doc.joints) as any[]) {
    if (j?.meta?.generatedFromConnector) anim().addConnectionKey(j.id, !j.state?.disabled);
  }
}

// Record each spinnable motor's CURRENT live spin direction (from the spin engine)
// as a step key, so playback starts/stops the continuous rotation at this time.
export function keySpins() {
  const doc = useModelStore.getState().doc;
  for (const j of Object.values(doc.joints) as any[]) {
    if (isMotorJoint(doc, j)) anim().addSpinKey(j.id, getSpin(j.id));
  }
}

/** ◆ Key = everything */
export function keyAll() { keyJoints(); keyBase(); keyConnections(); keySpins(); }

/** Play or pause this clip. */
export function togglePlay() { const a = anim(); if (a.playing) a.pause(); else a.play(); }
