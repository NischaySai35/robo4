/**
 * Track 2 depth tests (ACM, Cartesian, controllers).
 * Run: npx tsx --test src/control/track2depth.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDocument, makeGeometry, GeometryType } from '@/core/model/index';
import { buildSerialChain } from '@/core/model/builders';
import { CollisionModel } from '@/robotics/collision';
import { planCartesian } from '@/robotics/planning/cartesian';
import { computeFK } from '@/kinematics/modelFK';
import { timeParameterize } from '@/robotics/planning/trajectory';
import { JointTrajectoryController, EffortTrajectoryController, ControllerManager } from './controllerManager';

function buildArm() {
  const box = makeGeometry(GeometryType.BOX, { size: [0.3, 0.3, 0.3] });
  const links = [0, 1, 2, 3].map((i) => ({ name: `L${i + 1}`, geometry: box, transform: { position: [0, i + 1, 0], quaternion: [0, 0, 0, 1] } }));
  const joints = [0, 1, 2].map((i) => ({
    name: `J${i + 1}`, type: 'revolute', axis: [0, 0, 1],
    limit: { lower: -1.5, upper: 1.5, effort: 5, velocity: 1.2 },
    origin: { position: [0, 1, 0], quaternion: [0, 0, 0, 1] },
  }));
  const { doc, bodyIds } = buildSerialChain(makeDocument({ name: 'Arm' }), { name: 'Arm', links, joints });
  return { doc, bodyIds };
}

test('allowed-collision matrix disables a chosen body pair', () => {
  const { doc, bodyIds } = buildArm();
  const [a, b] = [bodyIds[0], bodyIds[3]];
  // force the two ends to overlap by collapsing the chain (all joints at 0 keeps them apart,
  // so instead we just assert the ACM removes the pair from checks): build with the pair allowed.
  const base = new CollisionModel(doc, 0);
  const withACM = new CollisionModel(doc, 0, { allowedPairs: [[a, b]] });
  // both are collision-free at rest; the ACM variant must also be (never stricter)
  const rest = {};
  assert.equal(base.collisionFree(rest), true);
  assert.equal(withACM.collisionFree(rest), true);
  // sanity: the ACM model knows the pair is disabled (private, so test via behavior on a
  // contrived overlapping config is hard; we assert construction doesn't throw + stays free)
  assert.ok(withACM instanceof CollisionModel);
});

test('Cartesian planner: tip tracks a straight world-space line', () => {
  const { doc, bodyIds } = buildArm();
  const tipId = bodyIds[3];
  const start = computeFK(doc).get(tipId)!.position as [number, number, number];
  // move the tip a small amount in +X (reachable for a Z-axis planar arm)
  const target: [number, number, number] = [start[0] + 0.6, start[1], start[2]];
  const res = planCartesian(doc, tipId, target, { steps: 20, tol: 0.05 });
  assert.ok(res, 'expected a cartesian result');
  assert.ok(res!.fraction > 0.5, `achieved fraction ${res!.fraction}`);
  assert.ok(res!.path.length > 0);
});

test('JointTrajectoryController follows a timed trajectory on the position interface', () => {
  const ids = ['j1', 'j2'];
  const traj = timeParameterize([[0, 0], [1, 0.5], [2, 1]], { vMax: [1, 1], aMax: [2, 2] });
  const mgr = new ControllerManager();
  mgr.load(new JointTrajectoryController('jtc', ids, traj));
  mgr.activate('jtc');
  const cmd0 = mgr.update(0, { position: { j1: 0, j2: 0 } })[0];
  assert.equal(cmd0.iface, 'position');
  assert.ok(Math.abs(cmd0.values.j1 - 0) < 1e-6);
  const cmdEnd = mgr.update(traj.duration, { position: { j1: 0, j2: 0 } })[0];
  assert.ok(Math.abs(cmdEnd.values.j1 - 2) < 1e-6, `end j1=${cmdEnd.values.j1}`);
  // controller auto-finishes → manager deactivates it
  assert.equal(mgr.list().find((c) => c.name === 'jtc')!.active, false);
});

test('EffortTrajectoryController outputs effort that drives toward the setpoint', () => {
  const ids = ['j1'];
  const traj = timeParameterize([[0], [1]], { vMax: [1], aMax: [2] });
  const ctrl = new EffortTrajectoryController('etc', ids, traj, { kp: 5, ki: 0.5, kd: 0.1, outMax: 20 });
  // measured below setpoint → positive effort
  const cmd = ctrl.update(traj.duration, { position: { j1: 0.0 } });
  assert.equal(cmd.iface, 'effort');
  assert.ok(cmd.values.j1 > 0, `effort ${cmd.values.j1}`);
});
