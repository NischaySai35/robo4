/**
 * codec.js — encode/decode the .nischay binary container.
 *
 * The project JSON is wrapped in a binary container and XOR-encrypted with a
 * SHA-256 counter-mode keystream keyed by an app secret + per-file random salt.
 * Result: the file is binary gibberish in a text editor and only software that
 * knows this scheme + key can read it (the web app and our Blender add-on use
 * the identical scheme).
 *
 * Layout:
 *   "NSHCRY" (6) | version(1) | flags(1) | salt(16) | ciphertext
 *
 * Honest note: because the key is shipped inside client code, this is strong
 * obfuscation / app-locking, not unbreakable DRM (impossible client-side).
 *
 * The same scheme is implemented in tools/blender_tetrobot_import.py.
 */

const PASS    = 'TETROBOT::nischay::v2::format-key::do-not-redistribute';
const MAGIC   = [0x4E, 0x53, 0x48, 0x43, 0x52, 0x59]; // "NSHCRY"
const VERSION = 2;

const _enc = new TextEncoder();
const _dec = new TextDecoder();

async function sha256(bytes) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

function concatBytes(arrays) {
  let len = 0;
  for (const a of arrays) len += a.length;
  const out = new Uint8Array(len);
  let o = 0;
  for (const a of arrays) { out.set(a, o); o += a.length; }
  return out;
}

function u32be(n) {
  return new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
}

async function keystream(key, length) {
  const out = new Uint8Array(length);
  let off = 0, n = 0;
  while (off < length) {
    const block = await sha256(concatBytes([key, u32be(n)]));
    const take = Math.min(32, length - off);
    out.set(block.subarray(0, take), off);
    off += take; n++;
  }
  return out;
}

function xor(data, ks) {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ ks[i];
  return out;
}

/** Encode a project object → encrypted .nischay bytes (Uint8Array). */
export async function encodeProject(obj) {
  const json = _enc.encode(JSON.stringify(obj));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key  = await sha256(concatBytes([_enc.encode(PASS), salt]));
  const ks   = await keystream(key, json.length);
  const ct   = xor(json, ks);
  return concatBytes([new Uint8Array(MAGIC), new Uint8Array([VERSION, 0]), salt, ct]);
}

/** Decode .nischay bytes (ArrayBuffer/Uint8Array) → project object. */
export async function decodeProject(buf) {
  const u = new Uint8Array(buf);
  if (u.length === 0) throw new Error('Empty file.');

  // Legacy plain-JSON files (pre-encryption): starts with '{', whitespace, or BOM.
  if (u[0] === 0x7B || u[0] === 0x20 || u[0] === 0x0A || u[0] === 0x09 || u[0] === 0xEF) {
    try { return JSON.parse(_dec.decode(u)); } catch { /* fall through to binary */ }
  }

  if (u.length < 24 || !MAGIC.every((b, i) => u[i] === b)) {
    throw new Error('Not a TETROBOT .nischay file.');
  }
  if (u[6] > VERSION) throw new Error('File was made with a newer version — update the app.');

  const salt = u.slice(8, 24);
  const ct   = u.slice(24);
  const key  = await sha256(concatBytes([_enc.encode(PASS), salt]));
  const ks   = await keystream(key, ct.length);
  const pt   = xor(ct, ks);
  return JSON.parse(_dec.decode(pt));
}
