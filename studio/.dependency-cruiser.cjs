/**
 * Layer boundaries for the TETROBOT studio app, enforced by tooling rather than discipline.
 *
 * Lives here, not at the repo root, because dependency-cruiser resolves the tsconfig's
 * `@/*` -> `./src/*` alias relative to its working directory. Run from the root it treated
 * every aliased import as unresolvable (632 false errors); run from here it resolves all
 * 1587 dependencies. Hence the root script cds in before invoking it.
 *
 * The point: this repo's real boundary is ENGINE vs UI, not client vs server. The engine
 * (physics, kinematics, planning, the document model) has to stay independently testable —
 * it already is, via `npx tsx --test` with no DOM — and the only thing that keeps it that
 * way is preventing engine code from reaching back into React/three.js. Reviewing for that
 * by hand does not scale; a rule does.
 *
 * Direction of allowed dependencies (a layer may only import from layers BELOW it):
 *
 *     app         (composition root)
 *     features    (React UI)
 *     viewport    (three.js rendering)
 *     state       (zustand stores)
 *     ─────────────────────────────────  <- nothing below here may import anything above
 *     core        (document model, commands, serialization)
 *     kinematics robotics runtime control hardware   (engine/domain)
 *     shared workers
 *
 * Existing violations are captured in a BASELINE rather than fixed here: they are genuine
 * design issues (e.g. viewport/jolt* is physics code living in the render layer, and
 * serialization reaches into the camera bridge for its state) but untangling them is
 * Phase 3 work. The baseline means the rules fail on anything NEW while the known set stays
 * visible as a to-do list instead of being silently tolerated.
 */
module.exports = {
  forbidden: [
    {
      name: 'engine-must-not-import-ui',
      comment:
        'Engine/domain code must not depend on React, three.js or app composition. This is ' +
        'what keeps the engine runnable and testable headlessly, and it is the single most ' +
        'load-bearing boundary in this codebase.',
      severity: 'error',
      from: { path: '^src/(core|physics|kinematics|robotics|runtime|control|hardware)/' },
      to: { path: '^src/(app|features|viewport)/' },
    },
    {
      name: 'engine-must-not-import-stores',
      comment:
        'Engine code taking values straight out of a zustand store is a hidden global. Pass ' +
        'what it needs as arguments so it stays callable from a test or a worker.',
      severity: 'error',
      from: { path: '^src/(physics|kinematics|robotics|runtime|control|hardware)/' },
      to: { path: '^src/state/' },
    },
    {
      name: 'no-circular',
      comment:
        'Cycles make module init order load-bearing and defeat tree-shaking; they also make ' +
        'any of the layers above impossible to reason about.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'not-to-unresolvable',
      comment: 'An import that cannot be resolved is a build waiting to break.',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'no-dev-deps-in-src',
      comment: 'Shipping code must not import a devDependency — it will not exist at runtime.',
      severity: 'error',
      from: { path: '^src/', pathNot: '\\.test\\.tsx?$' },
      to: { dependencyTypes: ['npm-dev'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    // Resolution comes from depcruise-resolve.cjs, NOT from tsConfig. The app's tsconfig
    // uses `moduleResolution: bundler` with no `baseUrl`, which dependency-cruiser cannot
    // follow — under it all 749 `@/...` imports came back unresolvable, which would have
    // made every rule below match nothing and pass vacuously. See that file for why the
    // obvious fix (adding baseUrl) is not available.
    webpackConfig: { fileName: 'depcruise-resolve.cjs' },
    tsPreCompilationDeps: true,
    reporterOptions: { text: { highlightFocused: true } },
  },
};
