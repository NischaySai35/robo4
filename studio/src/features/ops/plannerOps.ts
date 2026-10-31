/**
 * plannerOps — Planner v2's buttons as operators (P6), so scripts and GOS press the same ones. Imported by appOps.
 * Moves on the live robot in Manual go to the MuJoCo physics service; they never reach real motors.
 */
import { defineOperator } from '@/core/ops/registry';
import { useV2Store } from '@/state/msrrV2Store';

const v2 = () => useV2Store.getState();
const hasPlan = () => !!v2().plan;
const MANUAL_KINDS = ['back', 'home', 'pause', 'save', 'restore', 'stop', 'lock', 'unlock', 'skill', 'joints'];

defineOperator({ id: 'planner.check', label: 'Check the robot (rules only)', group: 'Planner', exec: () => v2().check() });

defineOperator({ id: 'planner.sketch.play', label: 'Play or pause the plan sketch', group: 'Planner', poll: hasPlan, exec: () => { if (v2().playing) v2().pause(); else v2().play(); } });
defineOperator({ id: 'planner.sketch.next', label: 'Next plan step', group: 'Planner', poll: hasPlan, exec: () => v2().seek(v2().playStep + 1) });
defineOperator({ id: 'planner.sketch.back', label: 'Previous plan step', group: 'Planner', poll: hasPlan, exec: () => v2().seek(v2().playStep - 1) });
defineOperator({ id: 'planner.sketch.rewind', label: 'Back to the start of the plan', group: 'Planner', poll: hasPlan, exec: () => v2().seek(0) });

// { withPlan: true } runs the plan in real physics; without it the robot just stands under gravity.
defineOperator({ id: 'planner.physics', label: 'Real physics (gravity)', group: 'Planner', poll: () => !v2().physics && !v2().physBusy, exec: (p?: any) => v2().gravity(!!p?.withPlan) });
defineOperator({ id: 'planner.physics.stop', label: 'Stop real physics', group: 'Planner', poll: () => !!v2().physics, exec: () => v2().gravityOff() });

// The Manual tab's live robot: { kind: 'back' | 'home' | 'pause' (on) | 'save' | 'restore' | 'stop' | 'lock' / 'unlock' (a, b) | 'skill' (name) | 'joints' (module, joints) }.
defineOperator({ id: 'planner.manual', label: 'Command the live robot in Manual', group: 'Planner', hidden: true, needsProps: true, poll: () => !!v2().manual, exec: (p: any) => {
  if (!MANUAL_KINDS.includes(p?.kind)) throw new Error(`No Manual command "${p?.kind}". Commands: ${MANUAL_KINDS.join(', ')}.`);
  return v2().manualCmd(p);
} });
defineOperator({ id: 'planner.manual.stop', label: 'End the Manual session', group: 'Planner', poll: () => !!v2().manual, exec: () => v2().manualStop() });
