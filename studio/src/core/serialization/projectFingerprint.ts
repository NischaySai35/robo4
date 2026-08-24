/**
 * projectFingerprint — cheap change detection for auto-save.
 *
 * The auto-save timer fires every 30s for the life of the session, and it used to
 * re-serialise, re-pack and re-write the ENTIRE project every time — mesh assets
 * included — whether or not anything had changed.
 *
 * That is not just wasted work, it is a large recurring allocation: packAssets()
 * (projectLibrary.ts) runs atob() over each asset and copies it byte-by-byte into a
 * fresh Uint8Array, then IndexedDB structured-clones the result again. On a project
 * with a few hundred thousand triangles of mesh data that is tens of MB allocated
 * twice a minute, indefinitely. Left idle, the JS heap climbs steadily into the
 * hundreds of MB as uncollected garbage from this one timer — heap growth that
 * tracks TIME rather than use, which is exactly how it was reported.
 *
 * Deliberately dependency-free (no stores, no DOM) so it stays pure and testable.
 */

/**
 * Stable fingerprint of everything auto-save would write, or null if the project
 * can't be stringified — callers must treat null as "changed" and save.
 *
 * Two things it has to get right:
 *  - `savedAt` is a fresh timestamp on every serializeProject() call, so including it
 *    would make every fingerprint differ and defeat the entire guard. It is dropped.
 *  - assets hold base64 mesh payloads. Walking those would reintroduce the very cost
 *    this exists to avoid, so they are excluded and represented by `assetsToken`,
 *    which the caller bumps when the assets object reference changes (assets are
 *    replaced wholesale on import / edit-mesh, so identity is a sound proxy).
 */
export function projectFingerprint(project: unknown, assetsToken: number): string | null {
  try {
    const p = project as any;
    const model = p?.model ?? {};
    const { assets: _omitted, ...modelWithoutAssets } = model;
    return JSON.stringify({
      ...p,
      savedAt: undefined,
      model: modelWithoutAssets,
      assetsToken,
    });
  } catch {
    return null;
  }
}
