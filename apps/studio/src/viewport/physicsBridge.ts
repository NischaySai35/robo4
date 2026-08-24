/**
 * physicsBridge — a thin handle to the live PhysicsSim instance so non-viewport code
 * (the motion executor) can command joint motor targets while physics is running,
 * closing the loop: the SIMULATED arm tracks trajectory setpoints under gravity and
 * contacts instead of teleporting. ModelEditor sets/clears `sim` on sim start/stop.
 */
export const physicsBridge: {
  sim: {
    setJointTargets: (v: Record<string, number>) => void;
    setJointVelocities: (v: Record<string, number>) => void;
  } | null;
  active: () => boolean;
  setJointTargets: (v: Record<string, number>) => void;
  setJointVelocities: (v: Record<string, number>) => void;
} = {
  sim: null,
  active() { return this.sim != null; },
  setJointTargets(v) { this.sim?.setJointTargets(v); },
  setJointVelocities(v) { this.sim?.setJointVelocities(v); },
};
