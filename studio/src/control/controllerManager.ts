/**
 * controllerManager — ros2_control's controller_manager, native.
 *
 * A controller reads the robot state and writes commands to joints through a chosen
 * interface (position / velocity / effort). The manager holds controllers, activates a
 * subset, and on each `update(t, state)` aggregates their commands. This is the seam
 * that lets the SAME controllers drive the in-app physics sim and real hardware.
 *
 *  - JointTrajectoryController: follows a TimedTrajectory (position interface), the
 *    workhorse used by MoveIt/Nav to execute planned motions.
 *  - PositionController with per-joint PID can close the loop on effort given measured
 *    state (used when motors/limits run in the physics sim). Pure, node-testable.
 */
import type { TimedTrajectory } from '@/robotics/planning/trajectory';
import { PID, type PIDGains } from './pid';

export type CommandInterface = 'position' | 'velocity' | 'effort';
export interface JointState { position: Record<string, number>; velocity?: Record<string, number> }
export interface ControllerCommand { iface: CommandInterface; values: Record<string, number> }

export interface Controller {
  name: string;
  /** joints this controller claims */
  joints: string[];
  /** produce commands for time t given measured state */
  update: (t: number, state: JointState) => ControllerCommand;
  /** done? (manager can auto-deactivate) */
  finished?: (t: number) => boolean;
  reset?: () => void;
}

/** Follows a timed trajectory on the position interface. */
export class JointTrajectoryController implements Controller {
  constructor(public name: string, public joints: string[], private traj: TimedTrajectory) {}
  update(t: number): ControllerCommand {
    const q = this.traj.duration > 0 ? this.traj.sample(Math.min(t, this.traj.duration)) : this.traj.waypoints.at(-1) ?? [];
    const values: Record<string, number> = {};
    this.joints.forEach((id, i) => { values[id] = q[i]; });
    return { iface: 'position', values };
  }
  finished(t: number): boolean { return t >= this.traj.duration; }
}

/** Per-joint PID that outputs effort to track a position setpoint from a trajectory. */
export class EffortTrajectoryController implements Controller {
  private pids: Record<string, PID> = {};
  constructor(public name: string, public joints: string[], private traj: TimedTrajectory, gains: PIDGains) {
    for (const id of joints) this.pids[id] = new PID(gains);
  }
  update(t: number, state: JointState): ControllerCommand {
    const dt = 1 / 60; // assume 60 Hz control loop
    const q = this.traj.duration > 0 ? this.traj.sample(Math.min(t, this.traj.duration)) : this.traj.waypoints.at(-1) ?? [];
    const values: Record<string, number> = {};
    this.joints.forEach((id, i) => { values[id] = this.pids[id].update(q[i], state.position[id] ?? 0, dt); });
    return { iface: 'effort', values };
  }
  finished(t: number): boolean { return t >= this.traj.duration; }
  reset(): void { for (const id of this.joints) this.pids[id].reset(); }
}

export class ControllerManager {
  private controllers = new Map<string, Controller>();
  private active = new Set<string>();

  load(c: Controller): void { this.controllers.set(c.name, c); }
  activate(name: string): void { if (this.controllers.has(name)) { this.active.add(name); this.controllers.get(name)!.reset?.(); } }
  deactivate(name: string): void { this.active.delete(name); }
  list(): { name: string; active: boolean; joints: string[] }[] {
    return [...this.controllers.values()].map((c) => ({ name: c.name, active: this.active.has(c.name), joints: c.joints }));
  }

  /** Run all active controllers; later controllers override earlier on conflicts. */
  update(t: number, state: JointState): ControllerCommand[] {
    const out: ControllerCommand[] = [];
    for (const name of this.active) {
      const c = this.controllers.get(name)!;
      out.push(c.update(t, state));
      if (c.finished?.(t)) this.active.delete(name);
    }
    return out;
  }
}
