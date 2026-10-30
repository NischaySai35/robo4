/**
 * joltPose — the ONE safe way to read a Jolt body's pose.
 *
 * The Jolt WASM bindings reuse a scratch buffer for struct-valued returns, so holding a
 * GetPosition()/GetRotation() wrapper across another Jolt call can silently read back a
 * DIFFERENT body's data (verified live in dynamicSim.ts — it showed up as shaking and
 * parts clipping through the floor). Every primitive here is extracted immediately after
 * its own call; always go through these helpers instead of hand-rolling the reads.
 */
import * as THREE from 'three';

export interface JoltPose { position: [number, number, number]; quaternion: [number, number, number, number] }

export function joltPose(rb: any): JoltPose {
  const px = rb.GetPosition().GetX(), py = rb.GetPosition().GetY(), pz = rb.GetPosition().GetZ();
  const qx = rb.GetRotation().GetX(), qy = rb.GetRotation().GetY(), qz = rb.GetRotation().GetZ(), qw = rb.GetRotation().GetW();
  return { position: [px, py, pz], quaternion: [qx, qy, qz, qw] };
}

export const joltQuat = (rb: any) => new THREE.Quaternion(...joltPose(rb).quaternion);

/** A WORLD point in `body`'s LOCAL (COM-relative) frame. */
export function worldPointToLocal(body: any, world: THREE.Vector3): THREE.Vector3 {
  const { position, quaternion } = joltPose(body);
  return world.clone().sub(new THREE.Vector3(...position)).applyQuaternion(new THREE.Quaternion(...quaternion).invert());
}

/** A WORLD direction in `body`'s LOCAL frame (rotation only). */
export const worldDirToLocal = (body: any, world: THREE.Vector3): THREE.Vector3 =>
  world.clone().applyQuaternion(joltQuat(body).invert());
