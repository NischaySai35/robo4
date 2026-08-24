/**
 * occtWorker — runs OpenCascade STEP tessellation off the main thread.
 *
 * The main thread sends: { id, bytes: ArrayBuffer, params }
 * This worker replies: { id, meshes } or { id, error }
 *
 * Each mesh in the reply carries transferred (zero-copy) typed arrays:
 *   positions: Float32Array  (x,y,z per vertex)
 *   normals?:  Float32Array  (nx,ny,nz per vertex)
 *   indices?:  Uint32Array   (triangle vertex indices)
 *   name?:     string        (OCCT component/product name)
 *   color?:    [r,g,b]       (face colour, 0–1 range)
 */

// @ts-expect-error — occt-import-js ships no types
import occtimportjs from 'occt-import-js';
import occtWasmUrl from 'occt-import-js/dist/occt-import-js.wasm?url';

let occt: any = null;

self.onmessage = async (e: MessageEvent) => {
  const { id, bytes, params } = e.data as {
    id: number;
    bytes: ArrayBuffer;
    params: Record<string, unknown>;
  };

  try {
    if (!occt) {
      occt = await occtimportjs({ locateFile: () => occtWasmUrl as string });
    }

    const result = occt.ReadStepFile(new Uint8Array(bytes), params);

    if (!result?.success || !result.meshes?.length) {
      self.postMessage({ id, meshes: [] });
      return;
    }

    const transferables: Transferable[] = [];
    const meshes = result.meshes.map((m: any) => {
      // Clone into plain typed arrays so we can transfer ownership.
      const positions = Float32Array.from(m.attributes.position.array as ArrayLike<number>);
      const normals   = m.attributes.normal
        ? Float32Array.from(m.attributes.normal.array as ArrayLike<number>)
        : null;
      const indices   = m.index
        ? Uint32Array.from(m.index.array as ArrayLike<number>)
        : null;

      transferables.push(positions.buffer);
      if (normals)  transferables.push(normals.buffer);
      if (indices)  transferables.push(indices.buffer);

      return {
        name:      m.name ?? '',
        color:     m.color ?? null,
        positions: positions.buffer,
        normals:   normals?.buffer ?? null,
        indices:   indices?.buffer ?? null,
      };
    });

    self.postMessage({ id, meshes }, { transfer: transferables });
  } catch (err: unknown) {
    self.postMessage({ id, error: (err as Error).message ?? String(err) });
  }
};
