/**
 * Physics determinism: the same model stepped the same number of times must produce
 * a bit-for-bit identical trajectory. This is the foundation of sim-to-real trust —
 * a sim a customer can't reproduce can't be validated against real hardware.
 *
 * Run: npx tsx --test src/viewport/physicsDeterminism.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDocument, makeGeometry, GeometryType } from '@/core/model/index';
import { buildSerialChain } from '@/core/model/builders';
import { PhysicsSim } from '@/viewport/PhysicsSim';
import { FIXED_DT } from '@/viewport/physicsConfig';

// A 3-link arm with 2 revolute joints — gravity loads the joints so the solver runs.
function buildArm() {
  const box = makeGeometry(GeometryType.BOX, { size: [0.4, 0.2, 0.2] });
  const links = [0, 1, 2].map((i) => ({
    name: `L${i + 1}`, geometry: box,
    transform: { position: [i * 0.5, 1, 0], quaternion: [0, 0, 0, 1] },
  }));
  const joints = [0, 1].map((i) => ({
    name: `J${i + 1}`, type: 'revolute', axis: [0, 0, 1],
    limit: { lower: -1.5, upper: 1.5, effort: 5, velocity: 2 },
    origin: { position: [0.5, 0, 0], quaternion: [0, 0, 0, 1] },
  }));
  return buildSerialChain(makeDocument({ name: 'Arm' }), { name: 'Arm', links, joints }).doc;
}

/** Step a fresh sim N times and return a flat array of all body positions. */
async function runTrajectory(steps: number): Promise<number[]> {
  const sim = await PhysicsSim.create(buildArm(), null);
  for (let i = 0; i < steps; i++) sim.step();
  const out: number[] = [];
  for (const [, pose] of [...sim.poses().entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    out.push(...pose.position, ...pose.quaternion);
  }
  sim.dispose();
  return out;
}

test('two identical runs produce bit-for-bit identical trajectories', async () => {
  const a = await runTrajectory(120);
  const b = await runTrajectory(120);
  assert.deepEqual(a, b, 'physics must be reproducible across runs');
});

test('the pinned fixed timestep is in effect', async () => {
  // step() always advances by exactly FIXED_DT (Jolt's Step(dt, 1) call
  // uses it directly, unlike a compiled model's own opt.timestep field) —
  // verify via stepFor: N seconds of real time must produce
  // floor(N / FIXED_DT) fixed steps, proving the pinned rate is in effect.
  const sim = await PhysicsSim.create(buildArm(), null);
  const steps = sim.stepFor(FIXED_DT * 10);
  assert.equal(steps, 10, `stepFor(10*FIXED_DT) should take exactly 10 steps, took ${steps}`);
  sim.dispose();
});

test('stepFor(elapsed) takes a frame-rate-independent number of fixed steps', async () => {
  // Stay within the catch-up cap (0.25s) so neither schedule is clamped.
  const total = 0.2;

  const sim = await PhysicsSim.create(buildArm(), null);
  const big = sim.stepFor(total); // one coarse "frame"
  sim.dispose();

  const sim2 = await PhysicsSim.create(buildArm(), null);
  let small = 0;
  for (let i = 0; i < 12; i++) small += sim2.stepFor(total / 12); // 12 fine "frames"
  sim2.dispose();

  // ~48 steps at 240 Hz; the accumulator carries the remainder so both schedules
  // advance the same total simulated time regardless of how it was chunked.
  // The accumulator carries the remainder, so chunking can only differ by the
  // sub-timestep rounding of one step — never drift with frame rate.
  assert.ok(big >= 47 && big <= 48, `coarse steps ${big}`);
  assert.ok(Math.abs(small - big) <= 1, `frame-rate independence within 1 step (${small} vs ${big})`);
});
