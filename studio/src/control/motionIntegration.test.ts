/**
 * Motion INTEGRATION test — exercises the real /move_group code path (chainContext +
 * planTrajectory) against an actual model Document (a 4-link serial arm), not a toy
 * problem. Proves the planner + time-parameterization run end-to-end on a real robot.
 *
 * Run: npx tsx --test src/control/motionIntegration.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { chainContext, planTrajectory } from '@/control/motionRuntime';
import { verticalArm } from '@/testing/fixtures';

// Build a 4-link arm: small boxes spaced 1.0 along +Y, 3 revolute joints about Z.

test('chainContext extracts the real chain (bounds, vMax, ids) from a Document', () => {
  const { doc, tipId } = verticalArm();
  const ctx = chainContext(doc, tipId);
  assert.ok(ctx, 'expected a chain context');
  assert.equal(ctx!.ids.length, 3, '3 movable joints');
  assert.deepEqual(ctx!.bounds, [[-1.5, 1.5], [-1.5, 1.5], [-1.5, 1.5]]);
  assert.deepEqual(ctx!.vMax, [1.2, 1.2, 1.2], 'vMax from joint limit.velocity');
  assert.ok(ctx!.aMax.every((a) => a > 0), 'aMax derived from vMax × accel_scale');
  assert.ok(ctx!.jMax.every((j) => j > 0), 'jMax derived from aMax × jerk_scale (jerk-limited motion)');
  assert.ok(ctx!.collisionFree(ctx!.start), 'rest config is collision-free');
});

test('planTrajectory (RRT*) returns an executable timed trajectory on the real arm', () => {
  const { doc, tipId } = verticalArm();
  const ctx = chainContext(doc, tipId)!;
  // pick a concrete, reachable, collision-free goal
  let goal: number[] | null = null;
  for (let i = 0; i < 400 && !goal; i++) {
    const q = ctx.bounds.map(([lo, hi]) => lo + Math.random() * (hi - lo));
    if (ctx.collisionFree(q)) goal = q;
  }
  assert.ok(goal, 'found a collision-free goal');

  const planned = planTrajectory(doc, tipId, goal, 'rrtstar');
  assert.ok(planned, 'expected a plan');
  const { traj } = planned!;
  assert.ok(traj.duration > 0, 'trajectory has positive duration');
  assert.equal(traj.sample(0).length, 3, 'samples are 3-DOF');

  // velocity never exceeds the per-joint limit (1.2) along the whole trajectory
  for (let t = 0; t <= traj.duration; t += traj.duration / 40) {
    for (const v of traj.velocity(t)) assert.ok(Math.abs(v) <= 1.2 + 1e-6, `|v|=${Math.abs(v)}`);
  }
  // ends at the planned goal (within smoothing/tolerance)
  const end = traj.sample(traj.duration);
  const err = Math.hypot(...end.map((v, i) => v - goal![i]));
  assert.ok(err < 0.2, `end error ${err.toFixed(3)} rad`);
});
