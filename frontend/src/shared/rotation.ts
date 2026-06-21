/**
 * rotation.js — quaternion <-> Euler-degrees helpers (XYZ order), three-backed
 * for exact agreement with the renderer. Used by the Inspector so users edit
 * rotations as familiar degrees.
 */
import * as THREE from 'three';

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const R2D = 180 / Math.PI;
const D2R = Math.PI / 180;

export function quatArrToEulerDeg([x, y, z, w]) {
  _q.set(x, y, z, w);
  _e.setFromQuaternion(_q, 'XYZ');
  return [_e.x * R2D, _e.y * R2D, _e.z * R2D];
}

export function eulerDegToQuatArr([x, y, z]) {
  _e.set(x * D2R, y * D2R, z * D2R, 'XYZ');
  _q.setFromEuler(_e);
  return [_q.x, _q.y, _q.z, _q.w];
}
