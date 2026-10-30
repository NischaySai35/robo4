/**
 * Physics determinism: the same model stepped the same number of times must produce
 * a bit-for-bit identical trajectory. This is the foundation of sim-to-real trust —
 * a sim a customer can't reproduce can't be validated against real hardware.
 *
 * Run: npx tsx --test src/viewport/physicsDeterminism.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { PhysicsSim } from '@/viewport/PhysicsSim';
import { FIXED_DT } from '@/viewport/physicsConfig';
import { horizontalArm } from '@/testing/fixtures';

// A 3-link arm with 2 revolute joints — gravity loads the joints so the solver runs.

/** Step a fresh sim N times and return a flat array of all body positions. */
async function runTrajectory(steps: number): Promise<number[]> {
  const sim = await PhysicsSim.create(horizontalArm({ links: 3 }), null);
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
  const sim = await PhysicsSim.create(horizontalArm({ links: 3 }), null);
  const steps = sim.stepFor(FIXED_DT * 10);
  assert.equal(steps, 10, `stepFor(10*FIXED_DT) should take exactly 10 steps, took ${steps}`);
  sim.dispose();
});

test('stepFor(elapsed) takes a frame-rate-independent number of fixed steps', async () => {
  // Stay within the catch-up cap (0.25s) so neither schedule is clamped.
  const total = 0.2;

  const sim = await PhysicsSim.create(horizontalArm({ links: 3 }), null);
  const big = sim.stepFor(total); // one coarse "frame"
  sim.dispose();

  const sim2 = await PhysicsSim.create(horizontalArm({ links: 3 }), null);
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
