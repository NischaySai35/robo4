/**
 * assembleTask — first slice of shape-changing multi-module training.
 *
 * Given up to 4 pre-built Components (each an already-assembled module with its
 * own connectors, per core/model/entities.ts Connector + features/assembly/
 * connectorSnap.ts), train a policy that moves/rotates the WHOLE modules (not
 * their internal joints) so their connectors come together and "snap" into a
 * target graph topology — e.g. a 4-module CHAIN (0-1-2-3) vs a 4-module STAR
 * (0 is a hub connected to 1, 2, 3). Chain vs star is a genuine topological
 * (not just positional) distinction, so it's a meaningful first goal-shape
 * pair without needing full relative-angle reward shaping yet.
 *
 * Kinematic + self-contained (like modelTask.ts/navigationTask.ts): keeps its
 * own per-module pose array, never touches the live doc/command bus, so a
 * whole ES population can roll out fast. When two required modules' connectors
 * come within threshold and face each other, they're marked "connected" and
 * merge into one rigid group for the rest of the episode (same delta applied
 * to every module in the group) — a lightweight stand-in for the real
 * commands.snapAndJoin() used interactively in the Editor/Animation viewport.
 *
 * Known simplifications for this first slice (see PLAN Phase 5):
 *  - No physics/collision between modules — pure kinematic pose integration.
 *  - Exactly one shared reward for "any connector on A touches any connector on B"
 *    (doesn't require a SPECIFIC connector pair, just proximity + facing).
 *  - Orientation is nudged via an alignment reward term, not hard-constrained.
 */
import * as THREE from 'three';
import { weightedReward, type Task, type RewardWeights } from './task';
import type { Document, Connector } from '@/core/model/index';
import { listConnectors } from '@/features/assembly/connectorSnap';

export const ASSEMBLE_DEFAULT_WEIGHTS: RewardWeights = {
  progress: 8, align: 0.3, connect: 6, success: 15, control: -0.01, alive: -0.01,
};

export type AssembleGoalShape = 'chain' | 'star';

interface Pose { pos: THREE.Vector3; quat: THREE.Quaternion }
interface ModuleConnector { bodyId: string; connectorId: string; localPos: THREE.Vector3; localNormal: THREE.Vector3 }

export class AssembleTask implements Task {
  readonly obsDim: number;
  readonly actionDim: number;
  readonly maxSteps: number;

  private moduleIds: string[];                              // component ids, index = module index
  private moduleConnectors: ModuleConnector[][];             // per module, its connectors in module-pivot-local space
  private bodyLocal: Map<string, { pos: THREE.Vector3; quat: THREE.Quaternion; module: number }>;
  private poses: Pose[] = [];
  private union: number[] = [];
  private requiredEdges: [number, number][];
  private connected: boolean[] = [];
  private step = 0;
  private prevGap = 0;
  private weights: RewardWeights;
  private rng: () => number = Math.random;
  private posThreshold: number;
  private normalDotMax: number;
  private scatterRadius: number;

  constructor(doc: Document, opts: {
    moduleComponentIds?: string[]; goalShape?: AssembleGoalShape; maxSteps?: number; weights?: RewardWeights;
    posThreshold?: number; normalDotMax?: number; scatterRadius?: number;
  } = {}) {
    this.weights = opts.weights ?? { ...ASSEMBLE_DEFAULT_WEIGHTS };
    this.maxSteps = opts.maxSteps ?? 150;
    this.posThreshold = opts.posThreshold ?? 0.06;
    this.normalDotMax = opts.normalDotMax ?? -0.7;
    this.scatterRadius = opts.scatterRadius ?? 0.6;

    const allConnectorRefs = listConnectors(doc);
    const comps = Object.values(doc.components ?? {});
    const withConnectors = comps.filter((c) => allConnectorRefs.some((cn) => cn.componentId === c.id));
    const pool = opts.moduleComponentIds ?? (withConnectors.length ? withConnectors : comps).map((c) => c.id);
    this.moduleIds = pool.slice(0, 4);
    const n = this.moduleIds.length;

    this.bodyLocal = new Map();
    this.moduleConnectors = this.moduleIds.map((cid, mi) => {
      const bodies = Object.values(doc.bodies).filter((b) => b.componentId === cid);
      const pivot = bodies.length ? new THREE.Vector3(...bodies[0].transform.position) : new THREE.Vector3();
      const out: ModuleConnector[] = [];
      for (const b of bodies) {
        const bq = new THREE.Quaternion(...b.transform.quaternion);
        const bp = new THREE.Vector3(...b.transform.position).sub(pivot);
        this.bodyLocal.set(b.id, { pos: bp, quat: bq, module: mi });
        const conns: Connector[] = (b.meta?.connectors as Connector[] | undefined) ?? [];
        for (const c of conns) {
          out.push({
            bodyId: b.id, connectorId: c.id,
            localPos: bp.clone().add(new THREE.Vector3(...c.position).applyQuaternion(bq)),
            localNormal: new THREE.Vector3(...c.normal).applyQuaternion(bq).normalize(),
          });
        }
      }
      return out;
    });

    const shape = opts.goalShape ?? 'chain';
    this.requiredEdges = shape === 'star'
      ? Array.from({ length: Math.max(0, n - 1) }, (_, i): [number, number] => [0, i + 1])
      : Array.from({ length: Math.max(0, n - 1) }, (_, i): [number, number] => [i, i + 1]);

    this.actionDim = n * 6; // per module: 3 position vel + 3 small-angle rotation vel
    this.obsDim = n * 7 + this.requiredEdges.length * 3; // per module: pos(3)+quat(4); per edge: gap, bestDot, connected
  }

  private find(i: number): number {
    while (this.union[i] !== i) { this.union[i] = this.union[this.union[i]]; i = this.union[i]; }
    return i;
  }
  private merge(i: number, j: number): void {
    const ri = this.find(i), rj = this.find(j);
    if (ri !== rj) this.union[rj] = ri;
  }

  reset(rng: () => number = Math.random): void {
    this.rng = rng;
    this.step = 0;
    const n = this.moduleIds.length;
    this.union = Array.from({ length: n }, (_, i) => i);
    this.connected = this.requiredEdges.map(() => false);
    this.poses = Array.from({ length: n }, () => {
      const pos = new THREE.Vector3((rng() * 2 - 1), (rng() * 2 - 1) * 0.3, (rng() * 2 - 1)).multiplyScalar(this.scatterRadius);
      const axis = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
      const quat = new THREE.Quaternion().setFromAxisAngle(axis, rng() * Math.PI * 2);
      return { pos, quat };
    });
    this.prevGap = this.computeEdgeStats().totalGap;
  }

  /** World position+normal of one connector given the current module poses. */
  private connectorWorld(mc: ModuleConnector, moduleIdx: number): { pos: THREE.Vector3; normal: THREE.Vector3 } {
    const p = this.poses[moduleIdx];
    return {
      pos: mc.localPos.clone().applyQuaternion(p.quat).add(p.pos),
      normal: mc.localNormal.clone().applyQuaternion(p.quat).normalize(),
    };
  }

  /** For each required edge: closest facing connector-pair distance + dot, and whether it's connected. */
  private computeEdgeStats() {
    let totalGap = 0;
    const perEdge = this.requiredEdges.map(([a, b], idx) => {
      if (this.connected[idx]) return { gap: 0, bestDot: -1 };
      let bestDist = Infinity, bestDot = 1;
      for (const ca of this.moduleConnectors[a]) {
        const wa = this.connectorWorld(ca, a);
        for (const cb of this.moduleConnectors[b]) {
          const wb = this.connectorWorld(cb, b);
          const d = wa.pos.distanceTo(wb.pos);
          if (d < bestDist) { bestDist = d; bestDot = wa.normal.dot(wb.normal); }
        }
      }
      if (!isFinite(bestDist)) { bestDist = this.scatterRadius; bestDot = 1; } // no connectors on one side
      totalGap += bestDist;
      return { gap: bestDist, bestDot };
    });
    return { perEdge, totalGap };
  }

  observe(): number[] {
    const out: number[] = [];
    for (const p of this.poses) out.push(p.pos.x, p.pos.y, p.pos.z, p.quat.x, p.quat.y, p.quat.z, p.quat.w);
    const { perEdge } = this.computeEdgeStats();
    perEdge.forEach((e, i) => out.push(e.gap, e.bestDot, this.connected[i] ? 1 : 0));
    return out;
  }

  act(action: number[]) {
    this.step++;
    const n = this.moduleIds.length;
    const posSpeed = 0.4, rotSpeed = 1.2, dt = 0.05;

    // Average each group's per-module action deltas so grouped (already-connected)
    // modules move rigidly together — their relative arrangement, whatever it was
    // when they connected, is preserved because every member gets the identical delta.
    const groupDelta = new Map<number, number[]>();
    const groupCount = new Map<number, number>();
    for (let mi = 0; mi < n; mi++) {
      const root = this.find(mi);
      const a = action.slice(mi * 6, mi * 6 + 6).map((v) => Math.max(-1, Math.min(1, v || 0)));
      const acc = groupDelta.get(root) ?? new Array(6).fill(0);
      for (let k = 0; k < 6; k++) acc[k] += a[k];
      groupDelta.set(root, acc);
      groupCount.set(root, (groupCount.get(root) ?? 0) + 1);
    }

    for (let mi = 0; mi < n; mi++) {
      const root = this.find(mi);
      const acc = groupDelta.get(root)!;
      const cnt = groupCount.get(root)!;
      const d = acc.map((v) => v / cnt);
      const p = this.poses[mi];
      p.pos.add(new THREE.Vector3(d[0], d[1], d[2]).multiplyScalar(posSpeed * dt));
      const axisVec = new THREE.Vector3(d[3], d[4], d[5]);
      const angle = axisVec.length() * rotSpeed * dt;
      if (angle > 1e-6) {
        const dq = new THREE.Quaternion().setFromAxisAngle(axisVec.normalize(), angle);
        p.quat.premultiply(dq);
      }
    }

    const { perEdge, totalGap } = this.computeEdgeStats();
    let newlyConnected = 0;
    let alignTerm = 0;
    perEdge.forEach((e, idx) => {
      if (this.connected[idx]) return;
      alignTerm += -e.bestDot; // want dot → -1 (facing), so -dot is the reward-positive direction
      if (e.gap <= this.posThreshold && e.bestDot <= this.normalDotMax) {
        this.connected[idx] = true;
        newlyConnected++;
        const [a, b] = this.requiredEdges[idx];
        this.merge(a, b);
      }
    });

    const success = this.connected.every(Boolean);
    const terms = {
      progress: this.prevGap - totalGap,
      align: alignTerm,
      connect: newlyConnected,
      success: success ? 1 : 0,
      control: action.reduce((s, a) => s + a * a, 0),
      alive: 1,
    };
    this.prevGap = totalGap;
    return {
      reward: weightedReward(terms, this.weights),
      done: success || this.step >= this.maxSteps,
      info: { gap: totalGap, connected: this.connected.filter(Boolean).length },
    };
  }

  moduleIdsForDisplay() { return this.moduleIds; }
  currentPoses() { return this.poses.map((p) => ({ pos: [p.pos.x, p.pos.y, p.pos.z], quat: [p.quat.x, p.quat.y, p.quat.z, p.quat.w] })); }
  connectedEdges() { return this.requiredEdges.filter((_, i) => this.connected[i]); }
}
