/**
 * approach.ts — how a dock / undock really looks (Nischay, 28 Oct): the end first stands OFF in front of the
 * connector (clear of the raised pads), turns to line its pads up with the gaps, pauses, then goes STRAIGHT in;
 * coming out is the reverse: straight out first, then the bend.
 *
 * For a lock edge and the module whose end docks (`mover`), we solve that module's 7 joints so its end port sits
 * ON the connector axis at a stand-off d (m), turned by `rot` (rad) about the axis — the same closure maths as
 * assemble.closureResidual, with the target moved out along the receiver normal. Poses at d = 40..0 mm give a
 * straight approach (the playback interpolates joints between them, a few mm apart).
 */
import { type Config, type Edge, type ModuleId, type PortId, type FloorAnchor, JOINTS, PLAN_BEND_DEG, isBend, isFloorRef, isEndPort, CONFIG, cloneConfig } from './model';
import { assemble, seatFrame, keyPhi, FLOOR_SEAT_Y } from './assemble';
import type { PortW } from './kin';
import { type V3 } from './vec';

/** stand-off before going in: pads are 9 mm tall, so 40 mm leaves 31 mm of clear air between pad tops */
export const STANDOFF_M = 0.04;

const key = (e: Edge) => JSON.stringify([e.a, e.b]);
const anchorFrame = (a: FloorAnchor): PortW => {
  const y = (a.yawDeg * Math.PI) / 180;
  return { pos: [a.x, FLOOR_SEAT_Y, a.z], z: [0, 1, 0], x: [Math.cos(y), 0, -Math.sin(y)] };
};

/** the residual of `edge` with its target moved d out along the receiver normal and turned rot about it */
function residual(cfg: Config, edge: Edge, d: number, rot: number, anchors: FloorAnchor[]): number[] | null {
  const asm = assemble(cfg, anchors);
  let A: PortW;
  if (isFloorRef(edge.a)) {
    const an = anchors.find((x) => x.id === (edge.a as { floor: string }).floor); if (!an) return null; A = anchorFrame(an);
  } else {
    const pa = asm.placed.get(edge.a.module); if (!pa) return null;
    A = seatFrame(pa.geo.ports[edge.a.port], edge.a.port, edge.b.port);
  }
  const pb = asm.placed.get(edge.b.module); if (!pb) return null;
  const B = pb.geo.ports[edge.b.port];
  const T: V3 = [A.pos[0] + A.z[0] * d, A.pos[1] + A.z[1] * d, A.pos[2] + A.z[2] * d];
  const phi = keyPhi(A, B, edge.slot) - rot;
  return [(T[0] - B.pos[0]) * 100, (T[1] - B.pos[1]) * 100, (T[2] - B.pos[2]) * 100,
    (A.z[0] + B.z[0]) * 10, (A.z[1] + B.z[1]) * 10, (A.z[2] + B.z[2]) * 10, 3 * Math.sin(phi), 3 * (1 - Math.cos(phi))];
}

const nrm = (r: number[]) => Math.hypot(...r);

/** joints of `mover` so its end sits d out / turned rot, starting from `cfg` (which must NOT contain `edge`) */
export function solveStandoff(cfg: Config, edge: Edge, mover: ModuleId, d: number, rot: number, anchors: FloorAnchor[] = CONFIG.floorAnchors): Config | null {
  let c = cloneConfig(cfg);
  let r = residual(c, edge, d, rot, anchors); if (!r) return null;
  const lim = (j: number) => (isBend(JOINTS[j]) ? PLAN_BEND_DEG : 179);
  for (let it = 0; it < 60 && nrm(r) > 0.02; it++) {
    // finite-difference Jacobian over the mover's 7 joints (degrees), damped least squares
    const J: number[][] = [];
    for (let j = 0; j < 7; j++) {
      const cj = cloneConfig(c); cj.pose[mover][JOINTS[j]] += 0.2;
      const rj = residual(cj, edge, d, rot, anchors)!; J.push(rj.map((v, i) => (v - r![i]) / 0.2));
    }
    // dq = -(J^T J + l I)^-1 J^T r   (7x7, solved by Gaussian elimination)
    const n = 7, lam = 0.05, M = Array.from({ length: n }, (_, a) => Array.from({ length: n }, (_, b) => J[a].reduce((s, v, i) => s + v * J[b][i], 0) + (a === b ? lam : 0)));
    const g = Array.from({ length: n }, (_, a) => -J[a].reduce((s, v, i) => s + v * r![i], 0));
    for (let p = 0; p < n; p++) {
      let mx = p; for (let q = p + 1; q < n; q++) if (Math.abs(M[q][p]) > Math.abs(M[mx][p])) mx = q;
      [M[p], M[mx]] = [M[mx], M[p]]; [g[p], g[mx]] = [g[mx], g[p]];
      for (let q = p + 1; q < n; q++) { const f = M[q][p] / M[p][p]; for (let k = p; k < n; k++) M[q][k] -= f * M[p][k]; g[q] -= f * g[p]; }
    }
    const dq = new Array(n).fill(0);
    for (let p = n - 1; p >= 0; p--) dq[p] = (g[p] - M[p].slice(p + 1).reduce((s, v, k) => s + v * dq[p + 1 + k], 0)) / M[p][p];
    const step = Math.min(1, 8 / Math.max(...dq.map(Math.abs)));          // at most 8 deg per iteration
    const nc = cloneConfig(c);
    for (let j = 0; j < 7; j++) nc.pose[mover][JOINTS[j]] = Math.max(180 - lim(j), Math.min(180 + lim(j), c.pose[mover][JOINTS[j]] + dq[j] * step));
    const nr = residual(nc, edge, d, rot, anchors)!;
    if (nrm(nr) >= nrm(r)) break;
    c = nc; r = nr;
  }
  return nrm(r) < 0.3 ? c : null;                                         // ~3 mm / ~2 deg
}

/** one phase of a dock/undock: poses along it, where each pose sits (0..1 of the way, by distance), share of the step's time */
export interface Phase { label: string; frames: Config[]; at: number[]; share: number }
export interface DockMotion {
  phases: Phase[];
  /** the pose the step really ends in (undock: pulled out; dock: seated) */
  end: Config;
  /** the pose the PREVIOUS move should aim for (dock: the stand-off, turned) */
  approachFrom?: Config;
}

/** minimum-jerk S-curve: speed AND acceleration start and end at zero (smooth like a real arm, not constant speed) */
export const minJerk = (u: number) => u * u * u * (10 - 15 * u + 6 * u * u);

/** which module docks: the one whose port is an END (end->side: the end; end->floor: b; end<->end: b), as phys_world.docking_of */
const moverOf = (e: Edge) => (isEndPort(e.b.port) || isFloorRef(e.a) ? e.b.module : (e.a as { module: ModuleId }).module);
const DS = [0, 0.005, 0.01, 0.02, 0.03, STANDOFF_M];
const atOf = (ds: number[]) => ds.map((d) => d / ds[ds.length - 1]);

function line(seed: Config, edge: Edge): Config[] | null {
  const out: Config[] = []; let c = seed;
  for (const d of DS) { const x = solveStandoff(c, edge, moverOf(edge), d, 0); if (!x) return null; out.push(x); c = x; }
  return out;                                                             // 0 mm .. 40 mm
}

/** dock: stand-off turned 45 deg -> turn in place -> pause -> straight in (40 -> 0 mm) -> lock */
export function dockMotion(before: Config, after: Config): DockMotion | null {
  const bk = new Set(before.edges.map(key));
  const edge = after.edges.find((e) => e.locked && !bk.has(key(e))); if (!edge) return null;
  const open = { ...cloneConfig(after), edges: after.edges.filter((e) => key(e) !== key(edge)) };
  const L = line(open, edge); if (!L) return null;
  const turned = solveStandoff(L[L.length - 1], edge, moverOf(edge), STANDOFF_M, Math.PI / 4); if (!turned) return null;
  const E = (c: Config) => ({ ...c, edges: before.edges });
  const inward = [...L].reverse().map(E), stand = inward[0];
  return {
    phases: [
      { label: 'stand off 4 cm in front, turn to line the pads up with the gaps', frames: [E(turned), stand], at: [0, 1], share: 0.25 },
      { label: 'pause: aligned', frames: [stand, stand], at: [0, 1], share: 0.1 },
      { label: 'straight in', frames: inward, at: atOf([...DS].reverse().map((d) => STANDOFF_M - d)), share: 0.5 },
      { label: 'lock: rotor turns 45 deg', frames: [inward[inward.length - 1], cloneConfig(after)], at: [0, 1], share: 0.15 },
    ],
    end: cloneConfig(after), approachFrom: E(turned),
  };
}

/** undock: unlock -> pause -> straight out (0 -> 40 mm), so the next bend starts clear of the connector */
export function undockMotion(before: Config, after: Config): DockMotion | null {
  const ak = new Set(after.edges.map(key));
  const edge = before.edges.find((e) => e.locked && !ak.has(key(e))); if (!edge) return null;
  const L = line({ ...cloneConfig(before), edges: after.edges }, edge); if (!L) return null;
  return {
    phases: [
      { label: 'unlock: rotor back, pause', frames: [L[0], L[0]], at: [0, 1], share: 0.2 },
      { label: 'straight out 4 cm', frames: L, at: atOf(DS), share: 0.8 },
    ],
    end: L[L.length - 1],
  };
}

export type { PortId };
