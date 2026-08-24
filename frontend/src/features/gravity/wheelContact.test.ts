/**
 * wheelContact — the slip-based tire model's pure math.
 *
 * These are the properties the model has to hold for the whole point of it (replacing rigid
 * cylinder contact) to be true: a stable resting load, forces that always OPPOSE slip, a
 * Coulomb ceiling, and — the one that actually prevents the oscillation the rigid solver had
 * — a per-step clamp that can never reverse the slip it is correcting.
 *
 * Run: npx tsx --test src/features/gravity/wheelContact.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { solveWheelContact, lowestPointOffset, type WheelContactInput } from './wheelContact';

const GRAVITY = 9.81;
const TARGET_PENETRATION = 0.004; // must match wheelContact.ts

/** A wheel of radius 0.04 whose rendered surface sits exactly ON the ground, at rest —
 *  the model's design equilibrium (the compliance shell is fully compressed there). */
function restingWheel(over: Partial<WheelContactInput> = {}): WheelContactInput {
  const radius = 0.04;
  return {
    centre: new THREE.Vector3(0, radius, 0),
    axis: new THREE.Vector3(1, 0, 0),
    radius,
    halfLen: 0.015,
    groundY: 0,
    comPos: new THREE.Vector3(0, 0.1, 0),
    linVel: new THREE.Vector3(0, 0, 0),
    angVel: new THREE.Vector3(0, 0, 0),
    supportedMass: 0.5,
    bodyMass: 0.5,
    dt: 1 / 60,
    ...over,
  };
}

test('lowestPointOffset: a horizontal axle contacts directly below the centre, with NO axial offset', () => {
  const off = lowestPointOffset(new THREE.Vector3(1, 0, 0), 0.04, 0.015);
  // The regression this guards: coercing Math.sign(0) to 1 would shift the contact point
  // 0.015m along the axle, giving every drive force a phantom steering torque.
  assert.ok(Math.abs(off.x) < 1e-9, `expected no axial offset, got x=${off.x}`);
  assert.ok(Math.abs(off.y + 0.04) < 1e-9, `expected y=-radius, got ${off.y}`);
  assert.ok(Math.abs(off.z) < 1e-9);
});

test('lowestPointOffset: a vertical axle (wheel lying flat) drops by halfLen and picks a rim point', () => {
  const off = lowestPointOffset(new THREE.Vector3(0, 1, 0), 0.04, 0.015);
  assert.ok(Math.abs(off.y + 0.015) < 1e-9, `expected y=-halfLen, got ${off.y}`);
  assert.ok(Math.abs(Math.hypot(off.x, off.z) - 0.04) < 1e-9, 'radial extent should equal the radius');
});

test('lowestPointOffset: a tilted axle matches the closed-form drop r*sqrt(1-ay^2) + h*|ay|', () => {
  const axis = new THREE.Vector3(0, 0.5, Math.sqrt(3) / 2).normalize();
  const r = 0.04, h = 0.015;
  const off = lowestPointOffset(axis, r, h);
  const expected = -(r * Math.sqrt(1 - axis.y ** 2) + h * Math.abs(axis.y));
  assert.ok(Math.abs(off.y - expected) < 1e-9, `expected y=${expected}, got ${off.y}`);
});

test('an airborne wheel produces no contact at all', () => {
  const out = solveWheelContact(restingWheel({ centre: new THREE.Vector3(0, 1, 0) }));
  assert.equal(out, null);
  // The compliance shell means contact begins one shell-depth ABOVE the ground, so a wheel
  // clear of that shell must still report nothing.
  assert.equal(solveWheelContact(restingWheel({ centre: new THREE.Vector3(0, 0.04 + TARGET_PENETRATION + 1e-6, 0) })), null);
});

test('with its surface exactly on the ground and at rest, the normal force equals the static load', () => {
  const input = restingWheel();
  const out = solveWheelContact(input)!;
  assert.ok(out, 'expected contact');
  const staticLoad = input.supportedMass * GRAVITY;
  // This is the whole point of deriving stiffness from load: the wheel settles AT the design
  // penetration rather than at whatever depth an arbitrary spring constant happens to give.
  assert.ok(
    Math.abs(out.normalForce - staticLoad) < 1e-6,
    `expected normal force ~= static load ${staticLoad}, got ${out.normalForce}`,
  );
});

test('the normal spring pushes but never PULLS, even while rebounding fast', () => {
  // Rising quickly out of a shallow penetration: a damper allowed to act on rebound would
  // produce a negative (downward) normal force and suck the wheel back to the ground.
  const out = solveWheelContact(restingWheel({
    centre: new THREE.Vector3(0, 0.04 + TARGET_PENETRATION - 0.0001, 0),
    linVel: new THREE.Vector3(0, 5, 0),
  }))!;
  assert.ok(out.normalForce >= 0, `normal force must never be negative, got ${out.normalForce}`);
  assert.ok(out.force.y >= 0, `normal force must never point downward, got ${out.force.y}`);
});

test('a deep penetration is capped instead of launching the body', () => {
  const input = restingWheel({ centre: new THREE.Vector3(0, -0.5, 0) });
  const out = solveWheelContact(input)!;
  const staticLoad = input.supportedMass * GRAVITY;
  assert.ok(out.normalForce <= staticLoad * 8 + 1e-9, `expected the load cap to bind, got ${out.normalForce}`);
  assert.ok(out.surfaceGap < 0, 'a deeply penetrating wheel must report a negative surface gap');
});

test('rolling without slipping (zero contact-point velocity) generates no tangential force', () => {
  const out = solveWheelContact(restingWheel())!;
  // Only the vertical normal force should be present.
  assert.ok(Math.abs(out.force.x) < 1e-9, `expected no lateral force, got ${out.force.x}`);
  assert.ok(Math.abs(out.force.z) < 1e-9, `expected no longitudinal force, got ${out.force.z}`);
  assert.ok(Math.abs(out.slipLong) < 1e-9 && Math.abs(out.slipLat) < 1e-9);
});

test('tangential force OPPOSES slip in both the rolling and the sideways direction', () => {
  // Axle along X, so forward is Z and lateral is X.
  const fwd = solveWheelContact(restingWheel({ linVel: new THREE.Vector3(0, 0, 0.5) }))!;
  assert.ok(fwd.slipLong > 0, 'sanity: sliding +Z should read as positive longitudinal slip');
  assert.ok(fwd.force.z < 0, `force should oppose +Z slip, got ${fwd.force.z}`);

  const lat = solveWheelContact(restingWheel({ linVel: new THREE.Vector3(0.5, 0, 0) }))!;
  assert.ok(lat.slipLat > 0, 'sanity: sliding +X should read as positive lateral slip');
  assert.ok(lat.force.x < 0, `force should oppose +X slip, got ${lat.force.x}`);
});

test('the friction circle bounds combined tangential force at mu*N — longitudinal and lateral SHARE the budget', () => {
  const out = solveWheelContact(restingWheel({ linVel: new THREE.Vector3(3, 0, 3) }))!;
  const tangential = Math.hypot(out.force.x, out.force.z);
  assert.ok(out.saturated, 'expected the friction circle to saturate at this slip speed');
  // mu = 1.0, so the ceiling is exactly N. Rolling resistance is inside this budget too —
  // the tolerance here used to be 1.05 purely because it wasn't, which masked the defect.
  assert.ok(
    tangential <= out.normalForce + 1e-9,
    `combined tangential ${tangential} exceeded mu*N ${out.normalForce}`,
  );
});

test('the applied impulse can never reverse the slip it is opposing (the anti-oscillation clamp)', () => {
  // A very light body with a small slip: the friction circle alone would allow far more force
  // than is needed to stop it within one step, and overshooting is precisely the stick-slip
  // failure mode the rigid contact solver had. The stability clamp must bind here.
  const input = restingWheel({ supportedMass: 0.05, bodyMass: 0.05, linVel: new THREE.Vector3(0, 0, 0.001) });
  const out = solveWheelContact(input)!;
  const tangential = Math.hypot(out.force.x, out.force.z);
  const effMass = input.supportedMass;
  const slipSpeed = Math.hypot(out.slipLong, out.slipLat);
  const maxStable = (effMass * slipSpeed) / input.dt;
  assert.ok(
    tangential <= maxStable + 1e-9,
    `impulse would reverse the slip: force ${tangential} > stable max ${maxStable}`,
  );
});

test('spin drives the robot: a wheel spun about its axle gets traction opposite the contact slip', () => {
  // Axle along X. Spinning about +X drags the contact point backward (-Z) against the ground,
  // which the ground opposes with a +Z force — that is traction, and it is the behavior the
  // rigid cylinder contact could never deliver reliably.
  const out = solveWheelContact(restingWheel({
    comPos: new THREE.Vector3(0, 0.04, 0), // com at the wheel centre
    angVel: new THREE.Vector3(10, 0, 0),
  }))!;
  assert.ok(out.slipLong < 0, `expected backward slip at the contact, got ${out.slipLong}`);
  assert.ok(out.force.z > 0, `expected forward traction, got ${out.force.z}`);
});

test('a faster spin than the ground can deliver reads as a SKID rather than unbounded force', () => {
  const slow = solveWheelContact(restingWheel({
    comPos: new THREE.Vector3(0, 0.04 - TARGET_PENETRATION, 0),
    angVel: new THREE.Vector3(200, 0, 0),
  }))!;
  assert.ok(slow.saturated, 'a wildly over-spun wheel should saturate the friction circle');
  assert.ok(
    Math.hypot(slow.force.x, slow.force.z) <= slow.normalForce + 1e-9,
    'a skidding wheel must not exceed its Coulomb limit',
  );
});
