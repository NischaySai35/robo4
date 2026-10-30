/**
 * moduleMeshes.ts — the real try8 meshes, ready for the MSRR viewport.
 *
 * The ten STL parts live inside the Studio default module document (base64, Studio
 * frame, millimetres, body-local) and are decoded here once. Each geometry is
 * baked into the viewport's own frame and units so a placed mesh needs nothing
 * but a position and a quaternion from moduleGeometry.moduleBodies:
 *
 *   millimetres -> metres -> module units (x UNITS_PER_M) -> cubes (/ cube size)
 *   Studio frame -> MSRR model frame (restLayout.STUDIO_TO_MODEL_QUAT)
 *
 * Geometries are shared across every module drawn (one per body name), so a robot
 * of fifty modules costs ten buffers, not five hundred.
 */
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { UNITS_PER_M } from '@/robotics/msrr/modulink';
import { MODULINK_CUBE_SIZE } from '@/robotics/msrr/occupancy';
import { restBodies, STUDIO_TO_MODEL_QUAT } from '@/robotics/msrr/restLayout';

/** cubes per metre of the real module */
export const CUBES_PER_METRE = UNITS_PER_M / MODULINK_CUBE_SIZE;

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

let cache: Map<string, THREE.BufferGeometry> | null = null;

/** Geometry for every body of the module, keyed by body name, in cubes and the model frame. */
export function moduleMeshGeometries(): Map<string, THREE.BufferGeometry> {
  if (cache) return cache;
  const loader = new STLLoader();
  const q = new THREE.Quaternion(...STUDIO_TO_MODEL_QUAT);
  const bake = new THREE.Matrix4().compose(
    new THREE.Vector3(),
    q,
    new THREE.Vector3(1, 1, 1),
  ).premultiply(new THREE.Matrix4().makeScale(
    0.001 * CUBES_PER_METRE, 0.001 * CUBES_PER_METRE, 0.001 * CUBES_PER_METRE,
  ));

  cache = new Map();
  for (const b of restBodies()) {
    let geo = loader.parse(base64ToArrayBuffer(b.stl));
    if (b.name === 'Spine2_B3B4') geo = withImuBoard(geo);
    geo.applyMatrix4(bake);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    cache.set(b.name, geo);
  }
  return cache;
}

/** The MPU-6050 board (GY-521, 21 x 16 x 3 mm) Nischay mounts on Spine2's S2B-side frame bar: body-local Studio frame, mm.
 *  Same spot as the simulation (phys_world IMU_POS): mid-spine, 24 mm toward S2B, on the bar's outer face. */
export const IMU_BOARD = { size: [21, 16, 3] as const, centre: [0, 24, -19] as const };
function withImuBoard(spine: THREE.BufferGeometry): THREE.BufferGeometry {
  const box = new THREE.BoxGeometry(...IMU_BOARD.size).toNonIndexed();
  box.deleteAttribute('uv'); box.translate(...IMU_BOARD.centre);
  for (const k of Object.keys(spine.attributes)) if (!box.getAttribute(k)) spine.deleteAttribute(k);
  return mergeGeometries([spine, box]) ?? spine;
}

/** Release the shared geometries (the viewport calls this on unmount). */
export function disposeModuleMeshes() {
  if (!cache) return;
  for (const g of cache.values()) g.dispose();
  cache = null;
}
