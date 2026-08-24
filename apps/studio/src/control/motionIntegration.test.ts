/**
 * Motion INTEGRATION test — exercises the real /move_group code path (chainContext +
 * planTrajectory) against an actual model Document (a 4-link serial arm), not a toy
 * problem. Proves the planner + time-parameterization run end-to-end on a real robot.
 *
 * Run: npx tsx --test src/control/motionIntegration.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDocument, makeGeometry, GeometryType } from '@/core/model/index';
import { buildSerialChain } from '@/core/model/builders';
import { chainContext, planTrajectory } from '@/control/motionRuntime';

// Build a 4-link arm: small boxes spaced 1.0 along +Y, 3 revolute joints about Z.
function buildArm() {
  const box = makeGeometry(GeometryType.BOX, { size: [0.3, 0.3, 0.3] });
  // base sits at y=1 (above the ground plane at y=0); links spaced +1.0 in Y.
  const links = [0, 1, 2, 3].map((i) => ({
    name: `L${i + 1}`,
    geometry: box,
    transform: { position: [0, i + 1, 0], quaternion: [0, 0, 0, 1] },
  }));
  // each joint's origin = child-in-parent rest = +1.0 in Y (identity rotation chain)
  const joints = [0, 1, 2].map((i) => ({
    name: `J${i + 1}`,
    type: 'revolute',
    axis: [0, 0, 1],
    limit: { lower: -1.5, upper: 1.5, effort: 5, velocity: 1.2 },
    origin: { position: [0, 1, 0], quaternion: [0, 0, 0, 1] },
  }));
  const { doc, bodyIds } = buildSerialChain(makeDocument({ name: 'TestArm' }), { name: 'Arm', links, joints });
  return { doc, tipId: bodyIds[bodyIds.length - 1] };
}

test('chainContext extracts the real chain (bounds, vMax, ids) from a Document', () => {
  const { doc, tipId } = buildArm();
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
  const { doc, tipId } = buildArm();
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
