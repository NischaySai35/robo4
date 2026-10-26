/**
 * connections.test.ts — the four ways two try8 modules can be joined, and which of
 * them a module can actually REACH.
 *
 * The receiver geometry is the same on the floor, on a spine and on a module end
 * (8 magnets, 4-fold keyed), so in principle every connector can mate with every
 * other one. That gives four connection types:
 *
 *   end  -> end    A onto B (a chain)
 *   end  -> side   a free end onto a spine receiver (the walking move)
 *   side -> end    the same weld with the roles swapped: a module hangs by its
 *                  own spine receiver from another module's end
 *   side -> side   two spines face to face — only where the bodies clear each
 *                  other, i.e. crossed, never lying parallel
 *
 * Two different questions are tested, and kept apart on purpose:
 *   PLACEMENT  — given the weld, do the two connectors coincide with opposed
 *                normals? (pure geometry, any pairing)
 *   REACH      — can a module that is already holding something swing its free
 *                end onto that connector? (kinematics: the answer is often no)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  type ConnectorEnd, CONNECTOR_ENDS, SIDE_ENDS, weldTypeIsLegal, weldSetIsLegal,
} from './modulink';
import { connectorsOf, fitModules } from './fitModules';
import {
  emptyManual, addRoot, attachTo, setAngle, manualToFitted, checkManual, type ManualBuild,
} from './manualBuild';
import { oneStepMoves } from './transform';
import type { Cell } from './lattice';
import { CUBES_PER_STRAIGHT_MODULE } from './occupancy';

const D = (deg: number) => (deg * Math.PI) / 180;
const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** A parent along +x from the origin, and one child hung on `onto` by its own `own`. */
function pair(own: ConnectorEnd, onto: ConnectorEnd, roll: 0 | 1 | 2 | 3 = 0, bend = false): {
  build: ManualBuild; parent: ReturnType<typeof manualToFitted>[number]; child: ReturnType<typeof manualToFitted>[number];
} {
  let b = addRoot(emptyManual(), [0, 0, 0], [-1, 0, 0]);
  b = attachTo(b, 'H0', onto, roll, own);
  if (bend) {
    // a non-trivial child: bend and twist it, which moves its own connectors
    b = setAngle(b, 'H1', 0, D(35)); b = setAngle(b, 'H1', 1, D(40)); b = setAngle(b, 'H1', 2, -D(25));
    b = setAngle(b, 'H1', 3, D(80)); b = setAngle(b, 'H1', 4, D(30)); b = setAngle(b, 'H1', 5, D(-50));
  }
  const [parent, child] = manualToFitted(b);
  return { build: b, parent, child };
}

const pos = (m: ReturnType<typeof manualToFitted>[number], end: ConnectorEnd) =>
  connectorsOf(m).find((c) => c.end === end)!;

// ── placement: every pairing is a real weld ───────────────────────────────────

const TYPES: [string, ConnectorEnd, ConnectorEnd][] = [
  ['end -> end', 'A', 'B'],
  ['end -> side', 'A', 'S1A'],
  ['end -> side (spine 2, far face)', 'B', 'S2B'],
  ['side -> end', 'S1A', 'B'],
  ['side -> end (the other end)', 'S2B', 'A'],
];

/** Side-to-side: geometrically placeable, but NOT a weld (no lock rotor on either side). */
const ILLEGAL: [string, ConnectorEnd, ConnectorEnd][] = [
  ['side -> side', 'S1B', 'S1A'],
  ['side -> side (spine 2 onto spine 1)', 'S2A', 'S1B'],
];

test('every connection type welds: same point, opposed normals, at every roll', () => {
  for (const [name, own, onto] of TYPES) {
    assert.equal(weldTypeIsLegal(own, onto), true, `${name} must be legal`);
    for (const roll of [0, 1, 2, 3] as const) {
      for (const bend of [false, true]) {
        const { parent, child } = pair(own, onto, roll, bend);
        const p = pos(parent, onto);
        const c = pos(child, own);
        assert.ok(dist(p.pos, c.pos) < 1e-6,
          `${name} roll ${roll}${bend ? ' bent' : ''}: connectors are ${dist(p.pos, c.pos)} cubes apart`);
        assert.ok(dot(p.dir, c.dir) <= -0.999,
          `${name} roll ${roll}${bend ? ' bent' : ''}: normals are not opposed (dot ${dot(p.dir, c.dir)})`);
      }
    }
  }
});

test('the roll only turns the child about the weld axis — it never moves the weld', () => {
  for (const [, own, onto] of TYPES) {
    const base = pair(own, onto, 0).child;
    for (const roll of [1, 2, 3] as const) {
      const turned = pair(own, onto, roll).child;
      assert.ok(dist(pos(base, own).pos, pos(turned, own).pos) < 1e-6);
      assert.ok(dot(pos(base, own).dir, pos(turned, own).dir) > 0.999);
    }
  }
});

test('all six connectors of one module can carry a weld at the same time', () => {
  // A hub: one module with something hung on every connector.
  let b = addRoot(emptyManual(), [0, 0, 0], [-1, 0, 0]);
  const ends: ConnectorEnd[] = ['A', 'B', ...SIDE_ENDS];
  for (const e of ends) b = attachTo(b, 'H0', e, 0, 'A');
  const mods = manualToFitted(b);
  const hub = mods[0];
  const hubConns = connectorsOf(hub);
  for (let i = 1; i < mods.length; i++) {
    const target = hubConns.find((c) => c.end === ends[i - 1])!;
    const a = connectorsOf(mods[i]).find((c) => c.end === 'A')!;
    assert.ok(dist(target.pos, a.pos) < 1e-6, `${ends[i - 1]} is not welded to its child`);
  }
  assert.equal(weldSetIsLegal(ends.map((own, i) => ({ own, toModuleId: `m${i}`, toEnd: 'A' as ConnectorEnd }))).ok, true);
});

// ── side -> side is never a weld ──────────────────────────────────────────────

test('side -> side is illegal, and a hand-built one is flagged', () => {
  for (const [name, own, onto] of ILLEGAL) {
    assert.equal(weldTypeIsLegal(own, onto), false, `${name} must be refused`);
    const notes = checkManual(pair(own, onto).build).map((n) => n.text).join(' | ');
    assert.match(notes, /side-to-side/, `${name}: the By-hand checker must flag it`);
  }
  void ({} as ManualBuild);
});

// ── reach: what a module holding one connector can swing onto ────────────────

/** Which of the parent's connectors the child's FREE end can grab, from where it hangs. */
function reachable(own: ConnectorEnd, onto: ConnectorEnd): ConnectorEnd[] {
  const { parent, child } = pair(own, onto);
  return oneStepMoves(child, [parent]).map((m) => m.ontoEnd).sort();
}

test('a module hanging off a spine receiver can walk to the next receiver on the same face', () => {
  // The gait step: hold S2A, bend over, grab S1A (1.5 cubes along the same face).
  // Needs a fold that returns the free end to the SAME FACING as the held one
  // (an arch), which this module's six free joints can make up to ~2.5 cubes.
  assert.ok(reachable('A', 'S2A').includes('S1A'), 'S2A -> S1A is the basic walking step');
  assert.ok(reachable('A', 'S2B').includes('S1B'), 'and the same on the other face');
  // A hairpin back onto the host's own END connector (the module held on S1A reaching
  // the host's end A, 2.5 cubes back along the axis AND facing along it) is NOT a step
  // the module can make. An older, coarser lattice reported it as one only because it
  // accepted a landing half a body-width off; solved exactly it has no pose.
  assert.ok(!reachable('A', 'S1A').includes('A'), 'a hairpin onto the host end has no exact pose');
});

test('lower receivers on a straight partner are often unreachable by the free end', () => {
  // Two straight modules joined end to end: the second cannot fold back onto the
  // first one's spine receivers — they are ~1.3-2.7 cubes behind the weld, on the
  // far side of its own body. A dock there has to be planned from somewhere else.
  const line: Cell[] = Array.from({ length: 2 * CUBES_PER_STRAIGHT_MODULE + 1 }, (_, i) => [i, 0, 0] as Cell);
  const r = fitModules(line);
  assert.ok(r.modules.length >= 2, 'test setup: two chained modules');
  const [m0, m1] = r.modules;
  const grabs = oneStepMoves(m1, [m0]).map((m) => m.ontoEnd);
  for (const side of SIDE_ENDS) {
    assert.ok(!grabs.includes(side), `M1 should not be able to reach M0.${side} from its end-to-end weld`);
  }
});

test('the reach check agrees with the weld geometry: a reported dock really lands on the receiver', () => {
  for (const [own, onto] of [['A', 'S2A'], ['A', 'S2B'], ['A', 'S1A'], ['A', 'S1B']] as const) {
    const { parent, child } = pair(own, onto);
    for (const mv of oneStepMoves(child, [parent])) {
      const target = connectorsOf(parent).find((c) => c.end === mv.ontoEnd)!;
      assert.ok(dist(mv.toPos, target.pos) < 1e-6, `${own}->${onto}: move lands ${dist(mv.toPos, target.pos)} off ${mv.ontoEnd}`);
    }
  }
  void CONNECTOR_ENDS;
});
