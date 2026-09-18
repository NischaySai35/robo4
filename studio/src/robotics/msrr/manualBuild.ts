/**
 * manualBuild.ts — a structure built BY HAND, module by module.
 *
 * WHY THIS FILE EXISTS
 * Everything else in this folder answers "given a shape, where do the modules
 * go" — the fitter's job. This answers the opposite question: "given modules
 * placed deliberately, what shape is that", and it exists because the fitter
 * kept getting slabs wrong in ways that were easier for Nischay to DEMONSTRATE
 * than to describe. A wall came out as a hairbrush, then as a picture frame,
 * and each round cost a full explanation of what a wall should look like. It is
 * faster for him to build one and hand it over.
 *
 * So this is not a second fitter and it does not score anything. It is a
 * scaffold: a tree of modules, each welded to a connector of the one before it,
 * each bent however its joints allow, rendered through exactly the same
 * geometry path as a fitted build so that what he sees is what the hardware
 * would do.
 *
 * DELIBERATELY NOT CHECKED, and this is the point rather than an omission: no
 * collision test, no sphere rule, no reach table. If he puts two modules
 * through each other the picture shows two modules through each other. The
 * fitter's rules exist to stop the SEARCH proposing nonsense; a person placing
 * a module on purpose is making a claim about what the hardware should do, and
 * silently refusing it would throw away the very thing this file is for.
 * `checkManual` reports what the rules WOULD say, as a note, not a veto.
 *
 * COORDINATES. A module's own kinematics run in module units about connector A
 * at the origin (modulink.ts); the viewport works in cube units. Anchors here
 * are in CUBE units to match the rest of the app, and the conversion happens in
 * exactly one place (`S` below), the same way moduleGeometry.ts does it.
 */
import {
  type ModuleAngles, type ConnectorEnd, type Vec3, type Quat, type Pose,
  connectorPoses, baseQuatFor, composePoses, sampleCenterline,
  SIDE_ENDS, BEND_LIMIT,
} from './modulink';
import { MODULINK_CUBE_SIZE } from './occupancy';
import { type LatticePose } from './chainMoves';
import { type FittedModule } from './fitModules';
import { type Cell, key, add } from './lattice';

/** Module units -> cube units, the same conversion moduleGeometry.ts uses. */
const S = 1 / MODULINK_CUBE_SIZE;

/** Every connector a module offers, in the order the UI should list them. */
export const ALL_ENDS: ConnectorEnd[] = ['A', 'B', ...SIDE_ENDS];

/** The six joints, in chain order, with what each one is allowed to do. */
export const JOINTS: { index: number; label: string; kind: 'twist' | 'bend' }[] = [
  { index: 0, label: 'twist 0', kind: 'twist' },
  { index: 1, label: 'bend 1', kind: 'bend' },
  { index: 2, label: 'bend 2', kind: 'bend' },
  { index: 3, label: 'twist 3 (big rod)', kind: 'twist' },
  { index: 4, label: 'bend 4', kind: 'bend' },
  { index: 5, label: 'twist 5', kind: 'twist' },
];

/**
 * One hand-placed module.
 *
 * `attach` is null for the first module of a tree, which sits where it is put;
 * every other module hangs off a named connector of an earlier one, which is
 * what makes the structure a real weld tree rather than a pile of poses.
 */
export interface ManualModule {
  id: string;
  angles: ModuleAngles;
  attach: { parentId: string; end: ConnectorEnd; roll: 0 | 1 | 2 | 3 } | null;
  /** where the first module of a tree sits, ignored for the rest */
  rootCell: Cell;
  /** which way the first module's connector A faces, ignored for the rest */
  rootDir: Cell;
}

export interface ManualBuild {
  modules: ManualModule[];
  nextId: number;
}

export const emptyManual = (): ManualBuild => ({ modules: [], nextId: 0 });

export const STRAIGHT: ModuleAngles = [0, 0, 0, 0, 0, 0];

// ── small quaternion helpers ──────────────────────────────────────────────────
//
// modulink.ts owns the module's own kinematics and exports what it needs to;
// aiming one module AT another is a question only this file asks, so the two
// pieces of vector algebra it takes live here rather than being pushed back
// there for one caller.

const dot3 = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm3 = (v: Vec3): Vec3 => {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
};

/** Shortest rotation carrying `from` onto `to`, both unit vectors. */
function quatFromTo(from: Vec3, to: Vec3): Quat {
  const a = norm3(from);
  const b = norm3(to);
  const d = dot3(a, b);
  if (d > 1 - 1e-9) return [0, 0, 0, 1];
  if (d < -1 + 1e-9) {
    // Exactly opposed: the shortest arc is undefined, every half turn about a
    // perpendicular axis does the job, so pick one that is definitely not
    // parallel to `a` rather than whichever axis happens to be first.
    let axis = cross3(a, [1, 0, 0]);
    if (Math.hypot(axis[0], axis[1], axis[2]) < 1e-6) axis = cross3(a, [0, 1, 0]);
    const u = norm3(axis);
    return [u[0], u[1], u[2], 0];
  }
  const c = cross3(a, b);
  const q: Quat = [c[0], c[1], c[2], 1 + d];
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

const quatMul = (a: Quat, b: Quat): Quat => composePoses(
  { position: [0, 0, 0], quaternion: a },
  { position: [0, 0, 0], quaternion: b },
).quaternion;

/** A quarter-turn roll about the module's own axis — what a lock allows. */
const rollQuat = (steps: 0 | 1 | 2 | 3): Quat => {
  const h = (steps * Math.PI) / 4; // half of steps * 90 degrees
  return [0, 0, Math.sin(h), Math.cos(h)];
};

// ── resolving the tree into world poses ───────────────────────────────────────

/** Where a module ended up: connector A's cube-unit position and its facing. */
export interface PlacedManual {
  module: ManualModule;
  /** connector A, in cube units */
  anchorPos: Vec3;
  /** orientation of the module's own frame */
  quaternion: Quat;
}

/**
 * Walk the tree and give every module a world pose.
 *
 * A child's connector A is put exactly where its parent's chosen connector is,
 * facing exactly opposite it — which is the sphere rule stated as a placement
 * instead of as a test. Modules whose parent is missing are skipped rather
 * than guessed at, so deleting a module cannot leave its children floating
 * somewhere arbitrary.
 */
export function placeManual(build: ManualBuild): PlacedManual[] {
  const byId = new Map(build.modules.map((m) => [m.id, m]));
  const done = new Map<string, PlacedManual>();
  const out: PlacedManual[] = [];

  const place = (m: ManualModule, guard: number): PlacedManual | null => {
    const seen = done.get(m.id);
    if (seen) return seen;
    if (guard > build.modules.length) return null; // a cycle; refuse to spin

    let here: PlacedManual;
    if (!m.attach) {
      here = {
        module: m,
        anchorPos: [m.rootCell[0], m.rootCell[1], m.rootCell[2]],
        quaternion: baseQuatFor(m.rootDir),
      };
    } else {
      const parent = byId.get(m.attach.parentId);
      if (!parent) return null;
      const p = place(parent, guard + 1);
      if (!p) return null;
      const conn = connectorPoses(parent.angles, {
        position: [0, 0, 0], quaternion: p.quaternion,
      }).find((c) => c.end === m.attach!.end);
      if (!conn) return null;

      // A module's BODY runs toward its own local -Z while connector A, at the
      // origin, faces +Z — the chain points away from the connector that
      // anchors it (see the reach table's own note, and connectorPoses). So A's
      // outward normal is +Z rotated by the module's orientation, and to make
      // it face back at the parent's connector, +Z must be aimed at the
      // OPPOSITE of that connector's normal. Aiming it along the normal instead
      // is the obvious-looking reading and it is wrong in a way that draws
      // perfectly plausibly: every child comes out folded back over its parent,
      // welded to it by two domes pointing the same way.
      const aim = quatFromTo([0, 0, 1], [-conn.normal[0], -conn.normal[1], -conn.normal[2]]);
      here = {
        module: m,
        anchorPos: [
          p.anchorPos[0] + conn.position[0] * S,
          p.anchorPos[1] + conn.position[1] * S,
          p.anchorPos[2] + conn.position[2] * S,
        ],
        quaternion: quatMul(aim, rollQuat(m.attach.roll)),
      };
    }
    done.set(m.id, here);
    out.push(here);
    return here;
  };

  for (const m of build.modules) place(m, 0);
  return out;
}

/** Cubes a placed module's body passes through, in world cube coordinates. */
function bodyCells(p: PlacedManual): Cell[] {
  const base: Pose = { position: [0, 0, 0], quaternion: p.quaternion };
  const seen = new Set<string>();
  const out: Cell[] = [];
  for (const q of sampleCenterline(p.module.angles, base)) {
    const c: Cell = [
      Math.round(p.anchorPos[0] + q[0] * S),
      Math.round(p.anchorPos[1] + q[1] * S),
      Math.round(p.anchorPos[2] + q[2] * S),
    ];
    if (seen.has(key(c))) continue;
    seen.add(key(c));
    out.push(c);
  }
  return out;
}

const roundCell = (v: Vec3): Cell => [Math.round(v[0]), Math.round(v[1]), Math.round(v[2])];

/**
 * The hand-built tree as FittedModules, so the viewport draws it with exactly
 * the same code that draws a fitted build.
 *
 * `baseQuat` is what makes this possible. A fitted module records which lattice
 * DIRECTION it points along, which is all a fitted module ever needs; a
 * hand-bent one can face anywhere at all, so it carries its orientation
 * outright and moduleGeometry.ts uses that when it is there.
 */
export function manualToFitted(build: ManualBuild): FittedModule[] {
  return placeManual(build).map((p, i) => {
    const conns = connectorPoses(p.module.angles, {
      position: [0, 0, 0], quaternion: p.quaternion,
    });
    const a = conns.find((c) => c.end === 'A');
    const b = conns.find((c) => c.end === 'B');
    const worldOf = (v: Vec3): Vec3 => [
      p.anchorPos[0] + v[0] * S, p.anchorPos[1] + v[1] * S, p.anchorPos[2] + v[2] * S,
    ];
    const cells = bodyCells(p);
    const endPos = b ? worldOf(b.position) : p.anchorPos;

    const pose: LatticePose = {
      id: `manual:${p.module.id}`,
      bendPoseId: 'manual',
      twistSteps: [0, 0, 0],
      angles: p.module.angles,
      endOffset: [0, 0, 0],
      endDir: b ? roundCell(b.normal) : [0, 0, 1],
      cells: [[0, 0, 0]],
      reach: 4,
      snapError: 0,
      midOffset: [0, 0, 0],
      sideDirs: [],
      anchorEnd: 'A',
    };

    return {
      id: p.module.id,
      anchorCell: roundCell(p.anchorPos),
      anchorPos: p.anchorPos,
      anchorDir: a ? roundCell(a.normal) : [0, 0, 1],
      endCell: roundCell(endPos),
      endDir: pose.endDir,
      cells,
      reach: 4,
      pose,
      baseQuat: p.quaternion,
      weldedTo: p.module.attach?.parentId ?? null,
      order: i,
      chain: 0,
      serves: null,
    };
  });
}

// ── editing ───────────────────────────────────────────────────────────────────

export function addRoot(build: ManualBuild, cell: Cell = [0, 0, 0], dir: Cell = [0, 0, 1]): ManualBuild {
  const id = `H${build.nextId}`;
  return {
    nextId: build.nextId + 1,
    modules: [...build.modules, {
      id, angles: [...STRAIGHT] as ModuleAngles, attach: null, rootCell: cell, rootDir: dir,
    }],
  };
}

export function attachTo(
  build: ManualBuild, parentId: string, end: ConnectorEnd, roll: 0 | 1 | 2 | 3 = 0,
): ManualBuild {
  const id = `H${build.nextId}`;
  return {
    nextId: build.nextId + 1,
    modules: [...build.modules, {
      id,
      angles: [...STRAIGHT] as ModuleAngles,
      attach: { parentId, end, roll },
      rootCell: [0, 0, 0],
      rootDir: [0, 0, 1],
    }],
  };
}

export function setAngle(build: ManualBuild, id: string, joint: number, value: number): ManualBuild {
  return {
    ...build,
    modules: build.modules.map((m) => {
      if (m.id !== id) return m;
      const angles = [...m.angles] as ModuleAngles;
      angles[joint] = value;
      return { ...m, angles };
    }),
  };
}

export function setRoll(build: ManualBuild, id: string, roll: 0 | 1 | 2 | 3): ManualBuild {
  return {
    ...build,
    modules: build.modules.map((m) => (
      m.id === id && m.attach ? { ...m, attach: { ...m.attach, roll } } : m
    )),
  };
}

export function setRoot(build: ManualBuild, id: string, cell: Cell, dir: Cell): ManualBuild {
  return {
    ...build,
    modules: build.modules.map((m) => (m.id === id ? { ...m, rootCell: cell, rootDir: dir } : m)),
  };
}

/** Remove a module AND everything hanging off it — nothing is left orphaned. */
export function removeModule(build: ManualBuild, id: string): ManualBuild {
  const doomed = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const m of build.modules) {
      if (m.attach && doomed.has(m.attach.parentId) && !doomed.has(m.id)) {
        doomed.add(m.id);
        grew = true;
      }
    }
  }
  return { ...build, modules: build.modules.filter((m) => !doomed.has(m.id)) };
}

// ── reporting, never refusing ─────────────────────────────────────────────────

export interface ManualNote { moduleId: string; text: string }

/**
 * What the fitter's rules would say about a hand-built structure — as notes.
 *
 * Reported rather than enforced on purpose (see this file's header). The point
 * of building by hand is to be able to show the algorithm something it would
 * not have proposed; refusing to draw it would defeat that entirely. But it is
 * still worth knowing which parts the hardware would argue with, so the notes
 * say so and leave the decision alone.
 */
export function checkManual(build: ManualBuild): ManualNote[] {
  const notes: ManualNote[] = [];
  const placed = placeManual(build);

  for (const p of placed) {
    for (const [i, a] of p.module.angles.entries()) {
      const joint = JOINTS[i];
      if (joint.kind !== 'bend') continue;
      if (a < BEND_LIMIT[0] - 1e-9 || a > BEND_LIMIT[1] + 1e-9) {
        notes.push({
          moduleId: p.module.id,
          text: `${joint.label} is ${Math.round((a * 180) / Math.PI)}°, past the joint's ±90° limit`,
        });
      }
    }
  }

  // Two modules whose bodies claim the same cube. Not illegal to DRAW, but it
  // is the first thing to look at when a hand-built structure will not fit.
  const owner = new Map<string, string>();
  for (const p of placed) {
    for (const c of bodyCells(p)) {
      const k = key(c);
      const had = owner.get(k);
      if (had && had !== p.module.id) {
        notes.push({ moduleId: p.module.id, text: `shares cube ${k} with ${had}` });
      } else owner.set(k, p.module.id);
    }
  }
  return notes;
}

/** The cubes a hand-built structure occupies — its shape, as a diagram. */
export function manualCells(build: ManualBuild): Cell[] {
  const seen = new Set<string>();
  const out: Cell[] = [];
  for (const p of placeManual(build)) {
    for (const c of bodyCells(p)) {
      if (seen.has(key(c))) continue;
      seen.add(key(c));
      out.push(c);
    }
  }
  return out;
}

// ── file format ───────────────────────────────────────────────────────────────

export const MANUAL_FILE_KIND = 'tetrobot.msrr.manual';

/**
 * Saved as the TREE, not as resolved poses.
 *
 * Which module hangs off which connector is the whole content of a hand-built
 * structure — it is what Nischay is trying to show. Positions are derivable
 * from it and a saved position would go stale the moment a joint upstream
 * moved, so only the tree is written down.
 */
export function manualToJSON(build: ManualBuild): string {
  return JSON.stringify({
    kind: MANUAL_FILE_KIND,
    version: 1,
    modules: build.modules.map((m) => ({
      id: m.id,
      // degrees, because a person reads and edits this file
      angles: m.angles.map((a) => +((a * 180) / Math.PI).toFixed(3)),
      attach: m.attach,
      rootCell: m.rootCell,
      rootDir: m.rootDir,
    })),
  }, null, 2);
}

export function manualFromJSON(text: string): ManualBuild {
  const doc = JSON.parse(text) as {
    kind?: string;
    modules?: { id: string; angles: number[]; attach: ManualModule['attach']; rootCell: Cell; rootDir: Cell }[];
  };
  if (doc.kind !== MANUAL_FILE_KIND) throw new Error('not a hand-built MSRR structure');
  const modules = (doc.modules ?? []).map((m) => ({
    id: m.id,
    angles: m.angles.map((d) => (d * Math.PI) / 180) as unknown as ModuleAngles,
    attach: m.attach ?? null,
    rootCell: m.rootCell ?? [0, 0, 0],
    rootDir: m.rootDir ?? [0, 0, 1],
  })) as ManualModule[];
  const n = modules.reduce((mx, m) => Math.max(mx, Number(m.id.replace(/^H/, '')) + 1 || 0), 0);
  return { modules, nextId: n };
}
