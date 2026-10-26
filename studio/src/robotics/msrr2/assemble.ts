/**
 * assemble.ts — turn a Config (who is locked to whom + every joint angle) into
 * where every module actually is in the world.
 *
 * The placement walks the lock graph from a root:
 *   - a module locked to a FLOOR ANCHOR is the root (the anchor fixes it);
 *   - otherwise baseFrame says where the root's base frame is, and the whole
 *     structure is then dropped until its lowest point rests on the floor.
 * Every other module is placed so that the two locked ports coincide with OPPOSED
 * normals and their keys aligned in one of the 4 slots. Locks that close a loop are
 * not used for placement; they are checked instead (closure error).
 */
import {
  isEndPort,
  type Config, type Edge, type FloorAnchor, type PortId, type ModuleId, CONFIG,
  isFloorRef, poseToRad,
} from './model';
import { moduleGeo, localPorts, type ModuleGeo, type PortW } from './kin';
import { type V3, type Q, type Frame, sub, cross, norm, dot, qrot, qaxis, qFromBasis, qmul, qconj, dist } from './vec';

/** Height of a docked end's pad reference above the floor receiver face (seat gap), m. */
export const FLOOR_SEAT_Y = 0.0063;

export interface Placed { id: ModuleId; rad: number[]; base: Frame; geo: ModuleGeo }
export interface Assembly {
  placed: Map<ModuleId, Placed>;
  /** every lock that was used, with the world point where it sits */
  locks: { edge: Edge; at: V3; tree: boolean; closure?: { posMm: number; normalDot: number; keyDeg: number } }[];
  floorLocks: { module: ModuleId; port: PortId; anchor: FloorAnchor }[];
  held: { module: ModuleId; port: PortId } | null;
  problems: string[];
  /** worst loop-closure error (mm); 0 for a tree */
  closureErrMm: number;
}

/** Key error (rad) of a lock: b's x should be a's x turned by slot × 90° about a's normal.
 *  The SLOT matters, not just "one of the 4": a lock that already exists cannot re-key
 *  without being undone (a closure allowed mod-90° let a module spin in its receiver). */
export function keyPhi(A: PortW, B: PortW, slot: number): number {
  const xT = qrot(qaxis(A.z, (slot * Math.PI) / 2), A.x);
  return Math.atan2(dot(cross(xT, B.x), A.z), dot(xT, B.x));
}

/** End pads stand this far proud of the end's own gap floors (CAD, measured in MuJoCo: 9.00 mm). */
export const END_PAD = 0.009;

/**
 * The frame a port offers to the end that docks into it (pad tips land here, pads go into its gaps).
 * Port conventions, measured against the CAD-registered MuJoCo module (v2_connector_check.py):
 *   END port  A/B         : at the PAD TIP, x points at a PAD;
 *   SPINE port S1A..S2B   : at the GAP FLOOR (seat), x points at a GAP;   floor anchor: the same (x = a gap).
 * So an end docking a spine/floor receiver mates directly (tip on seat, pads in gaps, slot × 90°).
 * An END receiving another end must first become receiver-like: its gap floor is END_PAD inside its
 * pad tips and its gaps are 45° from its pads. Then the two ends interleave: each one's pad tips sit on
 * the other's gap floors, pads in gaps (the 45° offset), exactly like multi_env.py's end targets.
 */
export function seatFrame(port: PortW, portId: PortId | null, otherId: PortId | null): PortW {
  if (!(portId && otherId && isEndPort(portId) && isEndPort(otherId))) return port;
  const x = qrot(qaxis(port.z, Math.PI / 4), port.x);
  return { pos: [port.pos[0] - port.z[0] * END_PAD, port.pos[1] - port.z[1] * END_PAD, port.pos[2] - port.z[2] * END_PAD], z: port.z, x };
}

const anchorFrame = (a: FloorAnchor): PortW => {
  const y = (a.yawDeg * Math.PI) / 180;
  return { pos: [a.x, FLOOR_SEAT_Y, a.z], z: [0, 1, 0], x: [Math.cos(y), 0, -Math.sin(y)] };
};

/** Base frame for a child whose port `local` must mate with the world port `parent` in `slot`. */
export function mateBase(parent: PortW, local: PortW, slot: number): Frame {
  const zT = [-parent.z[0], -parent.z[1], -parent.z[2]] as V3;
  const xT = norm(qrot(qaxis(parent.z, (slot * Math.PI) / 2), parent.x));
  const yT = cross(zT, xT);
  const yL = cross(local.z, local.x);
  const q = qmul(qFromBasis(xT, yT, zT), qconj(qFromBasis(local.x, yL, local.z)));
  const p = sub(parent.pos, qrot(q, local.pos));
  return { p, q };
}

/** Default base when nothing places the robot: lying along +X, A at the origin. */
const DEFAULT_BASE: Frame = { p: [0, 0.05, 0], q: qaxis([0, 1, 0], -Math.PI / 2) };

export function assemble(cfg: Config, anchors: FloorAnchor[] = CONFIG.floorAnchors): Assembly {
  const problems: string[] = [];
  const active = cfg.modules.filter((m) => !cfg.unused.includes(m));
  const rad = new Map(active.map((m) => [m, poseToRad(cfg.pose[m])]));
  const placed = new Map<ModuleId, Placed>();
  const place = (id: ModuleId, base: Frame) => placed.set(id, { id, rad: rad.get(id)!, base, geo: moduleGeo(rad.get(id)!, base) });

  const floorEdges = cfg.edges.filter((e) => e.locked && isFloorRef(e.a));
  const anchorById = new Map(anchors.map((a) => [a.id, a]));
  const floorLocks: Assembly['floorLocks'] = [];
  const locks: Assembly['locks'] = [];
  let held: Assembly['held'] = null;

  // ── root ──
  let rootDone = false;
  for (const e of floorEdges) {
    const anchor = anchorById.get((e.a as { floor: string }).floor);
    if (!anchor) { problems.push(`unknown floor anchor ${(e.a as { floor: string }).floor}`); continue; }
    if (!rad.has(e.b.module)) continue;
    floorLocks.push({ module: e.b.module, port: e.b.port, anchor });
    if (!rootDone) {
      place(e.b.module, mateBase(anchorFrame(anchor), localPorts(rad.get(e.b.module)!)[e.b.port], e.slot));
      locks.push({ edge: e, at: anchorFrame(anchor).pos, tree: true });
      rootDone = true;
    }
  }
  if (!rootDone && active.length) {
    const bf = cfg.baseFrame;
    const root = bf?.module && rad.has(bf.module) ? bf.module : active[0];
    place(root, bf?.worldPose ? { p: bf.worldPose.p, q: bf.worldPose.q } : DEFAULT_BASE);
    if (bf?.held) held = { module: root, port: 'A' };
  }

  // ── grow along the lock graph (a piece held only by its own floor receiver is rooted there) ──
  const portEdges = cfg.edges.filter((e) => e.locked && !isFloorRef(e.a));
  const usedEdge = new Set<Edge>();
  let grew = true;
  while (grew) {
    grew = false;
    if (!portEdges.some((e) => !usedEdge.has(e) && (placed.has((e.a as { module: ModuleId }).module) !== placed.has(e.b.module)))) {
      for (const e of floorEdges) {
        if (placed.has(e.b.module) || !rad.has(e.b.module)) continue;
        const anchor = anchorById.get((e.a as { floor: string }).floor);
        if (!anchor) continue;
        place(e.b.module, mateBase(anchorFrame(anchor), localPorts(rad.get(e.b.module)!)[e.b.port], e.slot));
        locks.push({ edge: e, at: anchorFrame(anchor).pos, tree: true });
        grew = true;
        break;
      }
    }
    for (const e of portEdges) {
      if (usedEdge.has(e)) continue;
      const a = e.a as { module: ModuleId; port: PortId };
      const b = e.b;
      if (!rad.has(a.module) || !rad.has(b.module)) { usedEdge.add(e); continue; }
      const pa = placed.get(a.module), pb = placed.get(b.module);
      const tree = !(pa && pb);
      if (pa && !pb) {
        place(b.module, mateBase(seatFrame(pa.geo.ports[a.port], a.port, b.port), localPorts(rad.get(b.module)!)[b.port], e.slot));
      } else if (pb && !pa) {
        place(a.module, mateBase(seatFrame(pb.geo.ports[b.port], b.port, a.port), localPorts(rad.get(a.module)!)[a.port], e.slot));
      } else if (!pa && !pb) continue;
      usedEdge.add(e);
      grew = true;
      const A = placed.get(a.module)!.geo.ports[a.port], B = placed.get(b.module)!.geo.ports[b.port];
      locks.push({ edge: e, at: A.pos, tree });
    }
  }
  // Second pass: anything placed by the tree is now known; re-check every port lock
  // (the tree edges close exactly, loop edges may not).
  let closureErrMm = 0;
  for (const l of locks) {
    if (isFloorRef(l.edge.a)) continue;
    const a = l.edge.a as { module: ModuleId; port: PortId };
    const A = seatFrame(placed.get(a.module)!.geo.ports[a.port], a.port, l.edge.b.port), B = placed.get(l.edge.b.module)!.geo.ports[l.edge.b.port];
    const posMm = dist(A.pos, B.pos) * 1000;
    const normalDot = dot(A.z, B.z);
    const keyDeg = Math.abs(keyPhi(A, B, l.edge.slot) * 180) / Math.PI;
    l.closure = { posMm, normalDot, keyDeg };
    closureErrMm = Math.max(closureErrMm, posMm);
  }
  // Extra floor locks (a second end on another anchor) close a loop through the floor.
  const rootFloor = new Set(locks.filter((l) => l.tree && isFloorRef(l.edge.a)).map((l) => l.edge));
  for (const f of floorLocks) {
    const fe = cfg.edges.find((e) => e.locked && isFloorRef(e.a) && e.b.module === f.module && e.b.port === f.port)!;
    if (rootFloor.has(fe)) continue;
    const p = placed.get(f.module)?.geo.ports[f.port];
    if (!p) continue;
    const af = anchorFrame(f.anchor);
    const posMm = dist(p.pos, af.pos) * 1000;
    closureErrMm = Math.max(closureErrMm, posMm);
    const keyDeg = Math.abs(keyPhi(af, p, fe.slot) * 180) / Math.PI;
    locks.push({ edge: fe, at: af.pos, tree: false, closure: { posMm, normalDot: dot(p.z, af.z), keyDeg } });
  }
  for (const m of active) if (!placed.has(m)) problems.push(`${m} is not connected to the rest`);

  // ── settle onto the floor when nothing pins it ──
  const pinned = floorLocks.length > 0 || held;
  const drop = cfg.baseFrame?.dropToFloor ?? !pinned;
  if (drop && placed.size) {
    let minY = Infinity;
    for (const p of placed.values()) for (const s of p.geo.spheres) minY = Math.min(minY, s.c[1] - s.r);
    const dy = -minY;
    for (const [id, p] of placed) {
      const base = { p: [p.base.p[0], p.base.p[1] + dy, p.base.p[2]] as V3, q: p.base.q as Q };
      placed.set(id, { ...p, base, geo: moduleGeo(p.rad, base) });
    }
    for (const l of locks) l.at = [l.at[0], l.at[1] + dy, l.at[2]];
  }
  return { placed, locks, floorLocks, held, problems, closureErrMm };
}

/**
 * The loop-closure residual of a Config: zero when every lock that is NOT used to
 * place a module (a loop through other modules or through a second floor receiver)
 * really closes — same point, opposed faces, keys on the lock's own slot. Used by the
 * optimiser to pull loop shapes onto their closure manifold.
 * Units: position in cm, faces and keys as unit-less sines.
 */
export function closureResidual(cfg: Config, anchors: FloorAnchor[] = CONFIG.floorAnchors): number[] {
  const asm = assemble(cfg, anchors);
  const out: number[] = [];
  const anchorById = new Map(anchors.map((a) => [a.id, a]));
  for (const l of asm.locks) {
    if (l.tree) continue;
    let A: PortW, B: PortW;
    if (isFloorRef(l.edge.a)) {
      A = anchorFrame(anchorById.get(l.edge.a.floor)!);
    } else {
      const a = l.edge.a as { module: ModuleId; port: PortId };
      A = seatFrame(asm.placed.get(a.module)!.geo.ports[a.port], a.port, l.edge.b.port);
    }
    B = asm.placed.get(l.edge.b.module)!.geo.ports[l.edge.b.port];
    out.push((A.pos[0] - B.pos[0]) * 100, (A.pos[1] - B.pos[1]) * 100, (A.pos[2] - B.pos[2]) * 100);
    // faces and keys weighted so ~5 degrees costs about as much as 1 cm
    out.push((A.z[0] + B.z[0]) * 10, (A.z[1] + B.z[1]) * 10, (A.z[2] + B.z[2]) * 10);
    const phi = keyPhi(A, B, l.edge.slot);
    out.push(3 * Math.sin(phi), 3 * (1 - Math.cos(phi)));
  }
  return out;
}

export const hasLoop = (cfg: Config) => {
  const active = cfg.modules.filter((m) => !cfg.unused.includes(m)).length;
  const modEdges = cfg.edges.filter((e) => e.locked && !isFloorRef(e.a)).length;
  const floorEdges = cfg.edges.filter((e) => e.locked && isFloorRef(e.a)).length;
  return modEdges + Math.max(0, floorEdges - 1) >= active;
};
