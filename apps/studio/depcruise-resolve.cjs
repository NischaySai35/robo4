/**
 * Resolver shim for dependency-cruiser ONLY — not a build config, nothing bundles with it.
 *
 * The app's tsconfig declares `@/*` -> `./src/*` under `moduleResolution: bundler` with no
 * `baseUrl`. That is correct for tsc and vite, but dependency-cruiser's resolver could not
 * follow it (every `@/...` import came back unresolvable, which would silently make the
 * layer rules match nothing and pass vacuously). `baseUrl` cannot simply be added to the
 * real tsconfig either — TypeScript now deprecates it and `tsc --noEmit` errors out.
 *
 * dependency-cruiser does accept a webpack-shaped config for resolution, so the alias is
 * restated here in the one form the tool understands.
 */
const path = require('path');
module.exports = {
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
};
