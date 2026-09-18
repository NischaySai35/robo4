/**
 * shapeFile.ts — save a cube diagram to a file and load it back.
 *
 * WHY THIS EXISTS
 * The cubes are the slow part. Placing twenty-three of them by hand to test one
 * change to the fitter, then placing them again the next time, is the whole cost
 * of iterating on the module placement — and it is a cost paid over and over on
 * the SAME shape. A shape is a list of integer cells; there is no reason it
 * cannot be a file.
 *
 * WHAT IS AND IS NOT IN THE FILE
 * The diagram only: the cubes, and the target cubes if one is set. NOT the
 * build. That is deliberate — the modules are an OUTPUT of the fit, and the
 * whole point of saving a shape is to re-run the fit on it after the fitter has
 * changed. Storing modules would mean loading a file could show you a build that
 * the current code would never produce, which is exactly the thing that would
 * make the file useless for testing.
 *
 * The format is plain JSON with integer cells, versioned, and readable — you can
 * open one and edit a coordinate by hand.
 */
import { type Cell } from '@/robotics/msrr/lattice';

export const SHAPE_FILE_VERSION = 1;
export const SHAPE_FILE_KIND = 'tetrobot.msrr.shape';

export interface ShapeFile {
  kind: typeof SHAPE_FILE_KIND;
  version: number;
  /** the diagram's cubes */
  cells: Cell[];
  /** the stored target shape, if there was one */
  target?: Cell[];
  /** free-form, for a human opening the file */
  note?: string;
}

/** Serialise a diagram. Cells are written as plain integer triples. */
export function encodeShape(cells: Cell[], target: Cell[] = [], note?: string): string {
  const payload: ShapeFile = {
    kind: SHAPE_FILE_KIND,
    version: SHAPE_FILE_VERSION,
    cells: cells.map((c) => [c[0], c[1], c[2]] as Cell),
    ...(target.length ? { target: target.map((c) => [c[0], c[1], c[2]] as Cell) } : {}),
    ...(note ? { note } : {}),
  };
  return JSON.stringify(payload, null, 2);
}

export interface DecodedShape {
  cells: Cell[];
  target: Cell[];
  /** what was wrong, if the file was not usable */
  error: string | null;
  /** what had to be repaired to use it */
  warnings: string[];
}

/** Is this a triple of finite integers? */
const isCell = (v: unknown): v is Cell =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isInteger(n));

/**
 * Parse a shape file, repairing what can be repaired and refusing what cannot.
 *
 * Written to be suspicious of its input: this reads a file off a disk, which
 * means it can be truncated, hand-edited into nonsense, or a completely
 * different JSON document that happens to end in .json. Non-integer or malformed
 * cells are dropped rather than allowed to reach the lattice, where they would
 * produce keys like "1.5,NaN,0" and quietly corrupt every set lookup downstream.
 * Duplicates are dropped too — the lattice is a set, and a file listing the same
 * cube twice would otherwise inflate every count shown in the panel.
 *
 * A plain array of cells is accepted as well as a full document, so a shape
 * pasted out of a log or written by hand still loads.
 */
export function decodeShape(text: string): DecodedShape {
  const empty = (error: string): DecodedShape => ({ cells: [], target: [], error, warnings: [] });

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return empty(`not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Either a full document or a bare array of cells. Typed as Partial<ShapeFile>
  // with unknown-valued fields rather than trusted: every field below is checked
  // before use, because this came off a disk.
  const doc: Partial<ShapeFile> = Array.isArray(raw)
    ? { cells: raw as Cell[] }
    : (raw as Partial<ShapeFile> | null) ?? {};
  if (typeof doc !== 'object') return empty('not a shape file — expected a JSON object or an array of cells');

  if (doc.kind !== undefined && doc.kind !== SHAPE_FILE_KIND) {
    return empty(`this is a "${String(doc.kind)}" file, not an MSRR shape`);
  }
  if (typeof doc.version === 'number' && doc.version > SHAPE_FILE_VERSION) {
    return empty(`file is version ${doc.version}, this build only understands up to ${SHAPE_FILE_VERSION}`);
  }
  if (!Array.isArray(doc.cells)) return empty('no "cells" array in the file');

  const warnings: string[] = [];
  const take = (list: unknown[], what: string): Cell[] => {
    const seen = new Set<string>();
    const out: Cell[] = [];
    let bad = 0;
    let dup = 0;
    for (const v of list) {
      if (!isCell(v)) { bad++; continue; }
      const k = `${v[0]},${v[1]},${v[2]}`;
      if (seen.has(k)) { dup++; continue; }
      seen.add(k);
      out.push([v[0], v[1], v[2]]);
    }
    if (bad) warnings.push(`${bad} malformed ${what} cell(s) dropped — a cell must be three integers`);
    if (dup) warnings.push(`${dup} duplicate ${what} cell(s) dropped`);
    return out;
  };

  const cells = take(doc.cells, 'shape');
  if (!cells.length) return empty('the file has no usable cells in it');
  const target = Array.isArray(doc.target) ? take(doc.target, 'target') : [];

  return { cells, target, error: null, warnings };
}

/** Hand the browser a .json file to save. */
export function downloadShape(cells: Cell[], target: Cell[], filename?: string): void {
  const blob = new Blob([encodeShape(cells, target)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `msrr-shape-${cells.length}cubes.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Open a file picker and read one back.
 *
 * Resolves null when the picker is dismissed. The input element is created per
 * call and never attached to the document — attaching it would put a stray
 * control in the layout, and it is not needed for `.click()` to open the dialog.
 */
export function pickShapeFile(): Promise<{ text: string; name: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => resolve({ text: String(reader.result ?? ''), name: file.name });
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    // A dismissed picker fires no event at all, so nothing resolves and the
    // promise is simply abandoned — which is correct here: the caller has
    // nothing to undo, and inventing a cancel signal would mean guessing at a
    // timeout.
    input.click();
  });
}
