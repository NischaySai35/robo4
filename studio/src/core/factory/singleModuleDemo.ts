/**
 * singleModuleDemo.ts — the bundled "Single Module" starter project.
 *
 * Unlike robotArm.ts/humanoid.ts (procedurally built), this is a frozen, literal
 * snapshot of the user's actual hand-built module (8 bodies, 7 joints, 1
 * Component, 4 STL mesh assets) — the base unit the shape-changing modular
 * platform assembles many copies of. The snapshot lives in
 * single-module-demo.json (the exact `model` Document, re-exported unchanged from
 * a real .nischay save) so it ships with the app and is always available from
 * the Startup Projects picker, independent of any user's local project library.
 */
import type { Document } from '@/core/model/index';
import singleModuleDoc from './single-module-demo.json';

/** A full project object ready for bridge.loadScene / serialization. */
export function buildSingleModuleDemoProject() {
  return {
    format: 'tetrobot-project',
    version: 1,
    app: 'TETROBOT',
    savedAt: new Date().toISOString(),
    scene: { activeModuleId: null, nextId: 1, modules: [], welds: [] },
    model: singleModuleDoc as unknown as Document,
    animation: { duration: 4, tracks: {} },
  };
}
