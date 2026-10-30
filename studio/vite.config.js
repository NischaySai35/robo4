import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { createRequire } from 'node:module';

// CommonJS so the Electron main process (also CJS) can share the exact same GPU sampler.
const require = createRequire(import.meta.url);
const metricsPlugin = require('./tools/vite-plugin-metrics.cjs');
// physicsPlugin starts the MuJoCo physics service (verify_service.py in C:/TETROBOT/sim) with npm run dev (DEV only).
const physicsPlugin = require('./tools/vite-plugin-physics.cjs');

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  // metricsPlugin serves /__metrics in DEV only, so the viewport HUD can show real
  // machine RAM/CPU/GPU when the app is opened in a browser instead of the Electron shell
  // (a web page can't read any of that itself). See tools/vite-plugin-metrics.cjs.
  plugins: [react(), metricsPlugin(), physicsPlugin()],
  // '@' → src, so cross-directory imports don't depend on file depth (survives
  // restructures). Co-located imports (./Foo.css) stay relative. See ARCHITECTURE.md.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Relative base so the production build loads correctly from file:// inside Electron.
  base: './',
  // Bind IPv4 explicitly: Windows resolves "localhost" to IPv6 [::1] by default,
  // which made wait-on (watching 127.0.0.1) hang and Electron never launch.
  // strictPort: fail loudly if 5173 is taken rather than drifting to 5174.
  // /ollama → the local Ollama server, so the Ask tab can reach it from a plain browser
  // (in Electron the main process calls Ollama instead).
  server: {
    host: '127.0.0.1', port: 5173, strictPort: true,
    proxy: { '/ollama': { target: 'http://127.0.0.1:11434', changeOrigin: true, rewrite: (p) => p.replace(/^\/ollama/, '') } },
  },
});
