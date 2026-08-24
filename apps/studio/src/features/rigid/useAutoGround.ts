/**
 * useAutoGround — when Auto-ground is on (and rigid mode active), keep the grounded
 * body at whichever one is nearest the live center of mass, re-picking as the model
 * moves. Mounted by any page that shows the rigid controls (Animation, Analysis),
 * so it runs wherever the user works. Uses the shared workspaceStore state so it
 * stays in sync with manual grounding.
 */
import { useEffect } from 'react';
import * as THREE from 'three';
import { useModelStore } from '@/state/modelStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { computeFK } from '@/kinematics/modelFK';
import { centerOfMass } from '@/kinematics/analysis';

export function useAutoGround() {
  const doc = useModelStore((s) => s.doc);
  const autoBase = useWorkspaceStore((s) => s.autoBase);
  const bodyMode = useWorkspaceStore((s) => s.bodyMode);
  const activeBodyId = useWorkspaceStore((s) => s.activeBodyId);
  const setActiveBodyId = useWorkspaceStore((s) => s.setActiveBodyId);

  useEffect(() => {
    if (!autoBase || bodyMode !== 'rigid') return;
    const fk = computeFK(doc);
    const { com, mass } = centerOfMass(doc, fk);
    if (mass <= 0) return;
    const c = new THREE.Vector3(...com);
    let best: string | null = null, bestD = Infinity;
    for (const id of Object.keys(doc.bodies ?? {})) {
      const w = fk.get(id);
      if (!w) continue;
      const d = c.distanceToSquared(new THREE.Vector3(...w.position));
      if (d < bestD) { bestD = d; best = id; }
    }
    if (best && best !== activeBodyId) setActiveBodyId(best);
  }, [autoBase, bodyMode, doc, activeBodyId, setActiveBodyId]);
}
