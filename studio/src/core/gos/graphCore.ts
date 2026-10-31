/**
 * graphCore — the GOS Rust core (gos/core) in the Studio. Python calls the same code, so both
 * always agree on a robot's tree and loops. Rebuild with: py -3.12 gos/build.py
 */
import type { Document } from '@/core/model/index';
import { GOS_CORE_WASM } from './gosCoreWasm';

export interface TreeEdge { joint: string; parent: string; child: string; reversed: boolean }
export interface CompiledGraph {
  roots: string[];
  tree: TreeEdge[];
  loops: string[];
  rigid_groups: string[][];
  parts: string[][];
  tree_dof: number;
  warnings: string[];
}

let wasm: any = null;
function core() {
  if (!wasm) {
    const bytes = Uint8Array.from(atob(GOS_CORE_WASM), (c) => c.charCodeAt(0));
    wasm = new WebAssembly.Instance(new WebAssembly.Module(bytes), {}).exports;
  }
  return wasm;
}

function call(op: string, payload: unknown) {
  const c = core();
  const input = new TextEncoder().encode(JSON.stringify(payload));
  const ptr = c.gos_alloc(input.length);
  new Uint8Array(c.memory.buffer, ptr, input.length).set(input);
  c[op](ptr, input.length);
  c.gos_free(ptr, input.length);
  const reply = JSON.parse(new TextDecoder().decode(new Uint8Array(c.memory.buffer, c.gos_reply_ptr(), c.gos_reply_len())));
  if (!reply.ok) throw new Error(reply.error);
  return reply;
}

export const compileGraph = (graph: { bodies: { id: string }[]; joints: unknown[]; roots?: string[] }): CompiledGraph =>
  call('gos_compile', { roots: [], ...graph });

export interface MjcfMesh { name: string; assetId: string; file: string; scale: [number, number, number] }
export interface MjcfPackage { xml: string; meshes: MjcfMesh[]; warnings: string[]; bodyNames: Record<string, string>; jointNames: Record<string, string> }

/** Mesh data stays out of the call: the core needs geometry references, not megabytes of base64. */
export const exportMjcf = (doc: Document, name: string): MjcfPackage => {
  const { assets: _assets, ...light } = doc as any;
  return call('gos_export_mjcf', { doc: light, name });
};

export interface IkResult { values: Record<string, number>; reached: boolean; goal_error_m: number; closure_error_m: number; iterations: number; message: string }

/** GraphIK in the Rust core: reaches toward a target while every closed loop stays shut. */
export const solveGraphIK = (doc: Document, tip: string, target: [number, number, number], opts: { root?: string; iterations?: number; tolerance?: number } = {}): IkResult => {
  const { assets: _assets, ...light } = doc as any;
  return call('gos_solve_ik', { doc: light, tip, target, ...opts });
};

export function compileDocument(doc: Document, roots: string[] = []) {
  return compileGraph({
    bodies: Object.keys(doc.bodies).map((id) => ({ id })),
    joints: Object.values<any>(doc.joints).map((j) => ({ id: j.id, type: j.type, parent: j.parentBodyId, child: j.childBodyId, disabled: !!j.state?.disabled })),
    roots,
  });
}
