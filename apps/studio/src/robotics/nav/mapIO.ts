/**
 * mapIO — save & load the robot's learned map.
 *
 * Answers "where does the robot's understanding go?": the map it builds while exploring is
 * an occupancy grid (free / occupied / unknown). In memory it lives in the autonomy store
 * and is LOST on close. These functions serialize it to a small JSON document (a `.ntmap`
 * file) so a robot can remember a space across sessions and reload it instantly.
 *
 * The map is stored compactly: dimensions + two byte arrays (occupancy + known), base64'd.
 */
import { ensureKnown, type Grid } from './occupancyGrid';

export interface SavedMap {
  format: 'tetrobot.map';
  version: 1;
  res: number;
  originX: number;
  originZ: number;
  cols: number;
  rows: number;
  occupied: string; // base64 of the occupancy bytes
  known: string;    // base64 of the known/observed bytes
  cells: number;    // occupied cell count (for quick display)
}

function bytesToB64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return typeof btoa !== 'undefined' ? btoa(s) : Buffer.from(b).toString('base64');
}

function b64ToBytes(s: string): Uint8Array {
  const bin = typeof atob !== 'undefined' ? atob(s) : Buffer.from(s, 'base64').toString('binary');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Serialize a grid (with its known layer) to the map document. */
export function serializeMap(g: Grid): SavedMap {
  const known = ensureKnown(g);
  return {
    format: 'tetrobot.map',
    version: 1,
    res: g.res,
    originX: g.originX,
    originZ: g.originZ,
    cols: g.cols,
    rows: g.rows,
    occupied: bytesToB64(g.data),
    known: bytesToB64(known),
    cells: g.data.reduce((a, v) => a + v, 0),
  };
}

export const serializeMapJSON = (g: Grid): string => JSON.stringify(serializeMap(g));

/** Rebuild a grid from a saved map document (string or object). Throws on a bad format. */
export function deserializeMap(input: string | SavedMap): Grid {
  const m: SavedMap = typeof input === 'string' ? JSON.parse(input) : input;
  if (!m || m.format !== 'tetrobot.map') throw new Error('not a tetrobot.map document');
  const data = b64ToBytes(m.occupied);
  const known = b64ToBytes(m.known);
  if (data.length !== m.cols * m.rows) throw new Error('map size mismatch');
  return { res: m.res, originX: m.originX, originZ: m.originZ, cols: m.cols, rows: m.rows, data, known };
}
