/**
 * codec.ts — encode/decode the .nischay binary container.
 *
 * XOR-CTR encryption keyed by app secret + per-file random salt.
 * Because the key is shipped inside client code, this is obfuscation /
 * app-locking, not unbreakable DRM.
 *
 * ── Format v2 (legacy, still decoded) ───────────────────────────────────
 *   "NSHCRY"(6) | version=2(1) | flags(1) | salt(16) | XOR(JSON(project))
 *
 * ── Format v3 (legacy, still decoded) ───────────────────────────────────
 *   "NSHCRY"(6) | version=3(1) | flags(1) | salt(16)
 *   | json_len(4 BE) | XOR(JSON(project_without_asset_data))
 *   | asset_count(2 BE)
 *   | For each asset:
 *       id_len(2 BE) | id_bytes | fmt_len(1) | fmt_bytes
 *       | data_len(4 BE) | XOR(raw_asset_bytes)
 *
 * ── Format v4 (current output) ──────────────────────────────────────────
 *   "NSHCRY"(6) | version=4(1) | flags(1) | key_salt(16) | aes_iv(16)
 *   | AES-256-CTR( json_len(4) | json_bytes | asset_count(2) | per_asset... )
 *
 *   per_asset: id_len(2) | id_bytes | fmt_len(1) | fmt_bytes | data_len(4) | data_bytes
 *
 * v4 uses WebCrypto AES-256-CTR (hardware-accelerated): encrypts a 30 MB file in
 * <10 ms vs. the ~100 s it took with the SHA-256 block cipher used in v2/v3.
 * v2/v3 files still open fine via the legacy decode paths.
 */

const PASS  = 'TETROBOT::nischay::v2::format-key::do-not-redistribute';
const MAGIC = [0x4E, 0x53, 0x48, 0x43, 0x52, 0x59]; // "NSHCRY"
const V2 = 2;
const V3 = 3;
const V4 = 4;

const _enc = new TextEncoder();
const _dec = new TextDecoder();

/* ── shared crypto primitives ───────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as any));
}

function concatBytes(arrays: Uint8Array[]): Uint8Array {
  let len = 0; for (const a of arrays) len += a.length;
  const out = new Uint8Array(len); let o = 0;
  for (const a of arrays) { out.set(a, o); o += a.length; }
  return out;
}

function u16be(n: number): Uint8Array { return new Uint8Array([(n >>> 8) & 0xff, n & 0xff]); }
function u32be(n: number): Uint8Array { return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]); }
function readU16be(u: Uint8Array, o: number): number { return (u[o] << 8) | u[o + 1]; }
function readU32be(u: Uint8Array, o: number): number { return ((u[o] << 24) | (u[o+1] << 16) | (u[o+2] << 8) | u[o+3]) >>> 0; }

/* ── v4 AES-CTR helpers ─────────────────────────────────────────────────── */

async function buildAESKey(salt: Uint8Array): Promise<CryptoKey> {
  const raw = await sha256(concatBytes([_enc.encode(PASS), salt])); // 32-byte key
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return crypto.subtle.importKey('raw', raw as any, { name: 'AES-CTR' }, false, ['encrypt', 'decrypt']);
}

async function aesEncrypt(key: CryptoKey, iv: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await crypto.subtle.encrypt({ name: 'AES-CTR', counter: iv as any, length: 128 }, key, data as any),
  );
}

async function aesDecrypt(key: CryptoKey, iv: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await crypto.subtle.decrypt({ name: 'AES-CTR', counter: iv as any, length: 128 }, key, data as any),
  );
}

/* ── v2/v3 legacy cipher (slow SHA-256 block cipher — only used for decoding) */

async function buildLegacyKey(salt: Uint8Array): Promise<Uint8Array> {
  return sha256(concatBytes([_enc.encode(PASS), salt]));
}

async function keystream(key: Uint8Array, length: number, startBlock = 0): Promise<Uint8Array> {
  const out = new Uint8Array(length);
  // Reuse a single block-input buffer to avoid 100k+ short-lived allocations.
  const blkIn = new Uint8Array(key.length + 4);
  blkIn.set(key);
  let off = 0, n = startBlock;
  while (off < length) {
    const nb = n >>> 0;
    blkIn[key.length]     = (nb >>> 24) & 0xff;
    blkIn[key.length + 1] = (nb >>> 16) & 0xff;
    blkIn[key.length + 2] = (nb >>>  8) & 0xff;
    blkIn[key.length + 3] =  nb         & 0xff;
    const block = await sha256(blkIn);
    const take = Math.min(32, length - off);
    out.set(block.subarray(0, take), off);
    off += take; n++;
  }
  return out;
}

function xorBuf(data: Uint8Array, ks: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ ks[i];
  return out;
}

/* ── asset extraction / injection (shared by v3 + v4) ──────────────────── */

interface AssetEntry { id: string; fmt: string; buf: Uint8Array }

function extractAssets(obj: any): { stripped: any; assets: AssetEntry[] } {
  const assets: AssetEntry[] = [];
  if (!obj?.model?.assets) return { stripped: obj, assets };

  const strippedAssets: Record<string, any> = {};
  for (const [id, asset] of Object.entries(obj.model.assets as Record<string, any>)) {
    if (asset?.data && typeof asset.data === 'string') {
      const raw = atob(asset.data);
      const buf = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
      assets.push({ id, fmt: String(asset.format ?? ''), buf });
      strippedAssets[id] = { ...asset, data: null };
    } else {
      strippedAssets[id] = asset;
    }
  }
  const { ...rest } = obj;
  return { stripped: { ...rest, model: { ...obj.model, assets: strippedAssets } }, assets };
}

function injectAssets(obj: any, assets: AssetEntry[]): any {
  if (!assets.length || !obj?.model?.assets) return obj;
  const filled = { ...obj.model.assets };
  for (const { id, buf } of assets) {
    if (!filled[id]) continue;
    let bin = '';
    for (let i = 0; i < buf.length; i += 8192) bin += String.fromCharCode(...buf.subarray(i, i + 8192));
    filled[id] = { ...filled[id], data: btoa(bin) };
  }
  return { ...obj, model: { ...obj.model, assets: filled } };
}

/* ── public API ─────────────────────────────────────────────────────────── */

/** Encode a project object → encrypted .nischay v4 bytes. */
export async function encodeProject(obj: any): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(16));
  const key  = await buildAESKey(salt);

  const { stripped, assets } = extractAssets(obj);
  const jsonBytes = _enc.encode(JSON.stringify(stripped));

  // Build the plaintext payload: [json_len(4)][json][asset_count(2)][assets...]
  const assetParts: Uint8Array[] = [];
  for (const { id, fmt, buf } of assets) {
    const idB  = _enc.encode(id);
    const fmtB = _enc.encode(fmt);
    assetParts.push(u16be(idB.length), idB, new Uint8Array([fmtB.length]), fmtB, u32be(buf.length), buf);
  }

  const plaintext = concatBytes([
    u32be(jsonBytes.length), jsonBytes,
    u16be(assets.length), ...assetParts,
  ]);

  const ciphertext = await aesEncrypt(key, iv, plaintext);

  return concatBytes([
    new Uint8Array(MAGIC), new Uint8Array([V4, 0]),
    salt, iv,
    ciphertext,
  ]);
}

/** Decode .nischay bytes (ArrayBuffer/Uint8Array) → project object. */
export async function decodeProject(buf: any): Promise<any> {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (u.length === 0) throw new Error('Empty file.');

  // Legacy plain-JSON files.
  if (u[0] === 0x7B || u[0] === 0x20 || u[0] === 0x0A || u[0] === 0x09 || u[0] === 0xEF) {
    try { return JSON.parse(_dec.decode(u)); } catch { /* fall through */ }
  }

  if (u.length < 24 || !MAGIC.every((b, i) => u[i] === b)) throw new Error('Not a TETROBOT .nischay file.');
  const version = u[6];
  if (version > V4) throw new Error('File was made with a newer version — update the app.');

  // ── v4 (AES-CTR, fast) ───────────────────────────────────────────────────
  if (version === V4) {
    const salt = u.slice(8, 24);
    const iv   = u.slice(24, 40);
    const key  = await buildAESKey(salt);
    const ciphertext = u.slice(40);

    const plaintext = await aesDecrypt(key, iv, ciphertext);

    let pos = 0;
    const jsonLen   = readU32be(plaintext, pos); pos += 4;
    const jsonBytes = plaintext.slice(pos, pos + jsonLen); pos += jsonLen;
    const obj       = JSON.parse(_dec.decode(jsonBytes));

    const count = readU16be(plaintext, pos); pos += 2;
    const assetEntries: AssetEntry[] = [];
    for (let i = 0; i < count; i++) {
      const idLen   = readU16be(plaintext, pos); pos += 2;
      const id      = _dec.decode(plaintext.slice(pos, pos + idLen)); pos += idLen;
      const fmtLen  = plaintext[pos];            pos += 1;
      const fmt     = _dec.decode(plaintext.slice(pos, pos + fmtLen)); pos += fmtLen;
      const dataLen = readU32be(plaintext, pos); pos += 4;
      const data    = plaintext.slice(pos, pos + dataLen); pos += dataLen;
      assetEntries.push({ id, fmt, buf: data });
    }

    return injectAssets(obj, assetEntries);
  }

  // ── v2 / v3 legacy (SHA-256 block cipher) ───────────────────────────────
  const salt = u.slice(8, 24);
  const key  = await buildLegacyKey(salt);

  if (version <= V2) {
    const ct = u.slice(24);
    const ks = await keystream(key, ct.length, 0);
    return JSON.parse(_dec.decode(xorBuf(ct, ks)));
  }

  // v3
  const jsonLen    = readU32be(u, 24);
  const jsonCt     = u.slice(28, 28 + jsonLen);
  const jsonKs     = await keystream(key, jsonLen, 0);
  const obj        = JSON.parse(_dec.decode(xorBuf(jsonCt, jsonKs)));
  const jsonBlocks = Math.ceil(jsonLen / 32);

  let pos        = 28 + jsonLen;
  const count    = readU16be(u, pos); pos += 2;
  const assets: AssetEntry[] = [];
  let assetBlock = jsonBlocks;

  for (let i = 0; i < count; i++) {
    const idLen   = readU16be(u, pos);  pos += 2;
    const id      = _dec.decode(u.slice(pos, pos + idLen)); pos += idLen;
    const fmtLen  = u[pos];             pos += 1;
    const fmt     = _dec.decode(u.slice(pos, pos + fmtLen)); pos += fmtLen;
    const dataLen = readU32be(u, pos);  pos += 4;
    const dataCt  = u.slice(pos, pos + dataLen); pos += dataLen;
    const dataKs  = await keystream(key, dataLen, assetBlock);
    assetBlock   += Math.ceil(dataLen / 32);
    assets.push({ id, fmt, buf: xorBuf(dataCt, dataKs) });
  }

  // v3 stripped the _v3 marker; remove it before returning
  const { _v3: _, ...rest } = obj as any;
  return injectAssets(rest, assets);
}
