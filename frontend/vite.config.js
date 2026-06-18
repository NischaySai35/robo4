import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative base so the production build loads correctly from file:// inside Electron.
  base: './',
  // Bind IPv4 explicitly: Windows resolves "localhost" to IPv6 [::1] by default,
  // which made wait-on (watching 127.0.0.1) hang and Electron never launch.
  // strictPort: fail loudly if 5173 is taken rather than drifting to 5174.
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
});
