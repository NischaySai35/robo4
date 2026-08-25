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
 *     bridge      (cross-layer contracts: viewport POPULATES these singletons, engine and
 *                  UI READ them — an inversion, so it must sit below the UI line)
 *     assembly    (connector snap geometry — three.js as math only, no renderer)
 *     core        (document model, commands, serialization)
 *     kinematics robotics runtime control hardware   (engine/domain)
 *     shared workers
 *
 * The baseline (.dependency-cruiser-known-violations.json) now holds only TWO entries, and
 * both are tool false positives (see not-to-unresolvable below). Every real architectural
 * violation found when these rules were introduced — 16 of them — has been fixed, not
 * tolerated. If that file starts growing again, something is being waved through.
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
      from: { path: '^src/(core|bridge|physics|assembly|kinematics|robotics|runtime|control|hardware)/' },
      to: { path: '^src/(app|features|viewport)/' },
    },
    {
      name: 'engine-must-not-import-stores',
      comment:
        'Engine code taking values straight out of a zustand store is a hidden global. Pass ' +
        'what it needs as arguments so it stays callable from a test or a worker.',
      severity: 'error',
      // Tests are exempt: verifying that two layers are correctly WIRED TOGETHER is a
      // legitimate thing to test, and a rule forbidding a test from touching both sides of
      // a seam forbids testing the seam. Production code has no such excuse.
      from: {
        path: '^src/(physics|assembly|kinematics|robotics|runtime|control|hardware)/',
        pathNot: '\\.test\\.tsx?$',
      },
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
      comment:
        'An import that cannot be resolved is a build waiting to break. This one has real ' +
        'teeth: it is what caught BoxWorld/PhysicsSim after the jolt* move, when their ' +
        'relative imports were left dangling and typecheck+build were both still green. ' +
        'Two baselined entries are parser FALSE POSITIVES — dependency-cruiser matches the ' +
        'word "import" inside JSX text ("multiple importance sampling", className="ol-import") ' +
        'and reports it as an unnameable dependency. Do NOT try to filter those out with ' +
        'dependencyTypesNot [unknown] — verified that a genuinely broken named import is ' +
        'ALSO typed "unknown", so that filter silently disables the whole rule.',
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
