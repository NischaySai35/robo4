import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_PLANS } from './library/demoPlans';
import { dockMotion, undockMotion, minJerk, STANDOFF_M } from './approach';
import { assemble, seatFrame, FLOOR_SEAT_Y } from './assemble';
import { CONFIG, isFloorRef, type Config, type Edge } from './model';

const key = (e: Edge) => JSON.stringify([e.a, e.b]);

/** where the docking end is, relative to the receiver: distance along its axis (mm) and sideways (mm) */
function onAxis(c: Config, edge: Edge) {
  const asm = assemble(c);
  let A;
  if (isFloorRef(edge.a)) {
    const an = CONFIG.floorAnchors.find((x) => x.id === (edge.a as { floor: string }).floor)!;
    A = { pos: [an.x, FLOOR_SEAT_Y, an.z], z: [0, 1, 0] };
  } else A = seatFrame(asm.placed.get(edge.a.module)!.geo.ports[edge.a.port], edge.a.port, edge.b.port);
  const B = asm.placed.get(edge.b.module)!.geo.ports[edge.b.port];
  const v = [B.pos[0] - A.pos[0], B.pos[1] - A.pos[1], B.pos[2] - A.pos[2]];
  const ax = v[0] * A.z[0] + v[1] * A.z[1] + v[2] * A.z[2];
  const side = Math.hypot(v[0] - ax * A.z[0], v[1] - ax * A.z[1], v[2] - ax * A.z[2]);
  return { ax: ax * 1000, side: side * 1000 };
}

test('the S-curve starts and ends at rest', () => {
  assert.equal(minJerk(0), 0); assert.equal(minJerk(1), 1);
  const v = (u: number) => (minJerk(u + 1e-4) - minJerk(u)) / 1e-4;
  assert.ok(v(0) < 0.01 && v(0.9999 - 1e-4) < 0.01, 'zero speed at both ends');
  assert.ok(v(0.5) > 1.8, 'fastest in the middle');
});

test('every dock in the demo plans: stand off 4 cm on the axis, then straight in', () => {
  let n = 0;
  for (const d of DEMO_PLANS) {
    let before = d.start;
    for (const s of d.plan.steps) {
      if (s.verb === 'dock') {
        const mo = dockMotion(before, s.expected);
        assert.ok(mo, `${d.title}: ${s.label} - no stand-off solution`);
        const edge = s.expected.edges.find((e) => e.locked && !before.edges.some((b) => key(b) === key(e)))!;
        const straight = mo.phases.find((p) => p.label === 'straight in')!;
        const first = onAxis({ ...straight.frames[0], edges: before.edges }, edge);
        assert.ok(Math.abs(first.ax - STANDOFF_M * 1000) < 3 && first.side < 3, `${s.label}: stand-off at ${first.ax.toFixed(1)} mm out, ${first.side.toFixed(1)} mm off axis`);
        for (const f of straight.frames) {
          const o = onAxis({ ...f, edges: before.edges }, edge);
          assert.ok(o.side < 3, `${s.label}: ${o.side.toFixed(1)} mm off the axis at ${o.ax.toFixed(1)} mm`);
        }
        n++;
      }
      if (s.verb === 'undock') assert.ok(undockMotion(before, s.expected), `${d.title}: ${s.label} - no straight-out solution`);
      before = s.expected;
    }
  }
  assert.ok(n > 0, 'some docks were checked');
});
