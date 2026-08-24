/**
 * locomotionTask — train ANY assembly (modular / shape-changing robot) to LOCOMOTE,
 * i.e. drive its centre of mass forward (+X) by actuating its joints, over real Jolt
 * physics. This is the generic, any-morphology task: the policy sees joint state + the
 * base's tilt + COM velocity, and outputs per-joint target deltas. Reward shapes a gait:
 *   forward (move +X)  +  upright (don't tip)  −  energy  −  fell (big penalty)
 *
 * Requires `await initPhysics()` once before constructing tasks (Jolt WASM load).
 */
import { computeFK } from '@/kinematics/modelFK';
import { RLPhysicsWorld } from './physicsWorld';
import { weightedReward, type Task, type RewardWeights } from './task';
import type { Document } from '@/core/model/index';

export const LOCO_DEFAULT_WEIGHTS: RewardWeights = { forward: 30, upright: 0.5, energy: -0.02, alive: 0.02, fell: -5 };

export class ModelLocomotionTask implements Task {
  readonly obsDim: number;
  readonly actionDim: number;
  readonly maxSteps: number;
  private world: RLPhysicsWorld;
  private n: number;
  private weights: RewardWeights;
  private substeps: number;
  private dt: number;
  private step = 0;
  private prevCom: [number, number, number] = [0, 0, 0];
  private startY = 0;

  constructor(doc: Document, opts: { maxSteps?: number; weights?: RewardWeights; substeps?: number } = {}) {
    this.world = new RLPhysicsWorld(doc, computeFK(doc), { groundY: 0 });
    this.n = this.world.nJoints;
    this.actionDim = this.n;
    this.obsDim = this.n + 5;            // joint values + baseUp(3) + comVel(x,z)
    this.maxSteps = opts.maxSteps ?? 40;
    this.weights = opts.weights ?? { ...LOCO_DEFAULT_WEIGHTS };
    this.substeps = opts.substeps ?? 4;
    this.dt = (1 / 60) * this.substeps;
  }

  setWeights(w: RewardWeights) { this.weights = w; }
  nJoints() { return this.n; }
  poses() { return this.world.poses(); }
  basePose() { return this.world.basePose(); }
  baseBodyId() { return this.world.baseId_(); }
  jointIds() { return this.world.joints.map((j) => j.jointId); }
  jointTargets() { return this.world.jointValues; }
  dispose() { this.world.dispose(); }

  reset(rng: () => number = Math.random): void {
    this.world.reset();
    this.step = 0;
    // randomize the initial joint phase a little (domain randomization of the gait start)
    const start = this.world.jointValues.map((v) => v + (rng() * 2 - 1) * 0.2);
    this.world.setJointTargets(start);
    this.world.step(6);                  // let it settle onto the ground
    this.prevCom = this.world.com();
    this.startY = this.prevCom[1];
  }

  observe(): number[] {
    const up = this.world.baseUp();
    const com = this.world.com();
    const vx = (com[0] - this.prevCom[0]) / this.dt;
    const vz = (com[2] - this.prevCom[2]) / this.dt;
    return [...this.world.jointValues, up[0], up[1], up[2], vx, vz];
  }

  act(action: number[]) {
    this.step++;
    const scale = 0.25;
    const targets = this.world.jointValues.map((v, i) => v + (action[i] ?? 0) * scale);
    this.world.setJointTargets(targets);
    this.world.step(this.substeps);

    const com = this.world.com();
    const forward = com[0] - this.prevCom[0];           // +X progress this step
    const up = this.world.baseUp();
    const fell = com[1] < this.startY - 0.35 || up[1] < 0.2; // collapsed or tipped over
    const terms = {
      forward,
      upright: Math.max(0, up[1]),
      energy: action.reduce((s, a) => s + a * a, 0),
      alive: 1,
      fell: fell ? 1 : 0,
    };
    this.prevCom = com;
    return { reward: weightedReward(terms, this.weights), done: fell || this.step >= this.maxSteps, info: { x: com[0], up: up[1] } };
  }
}
