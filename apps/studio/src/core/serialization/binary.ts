/**
 * binary.js — base64 <-> bytes helpers (chunked, stack-safe for large meshes).
 * Mesh assets are embedded as base64 in the model so .nischay stays self-contained.
 */

export function bytesToBase64(bytes: any) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < u8.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + CHUNK)));
  }
  return btoa(binary);
}

export function base64ToBytes(b64: any) {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
