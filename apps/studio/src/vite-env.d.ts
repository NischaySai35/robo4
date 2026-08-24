/// <reference types="vite/client" />

// Vite provides ambient module declarations for `*.css`, `*.svg`, asset imports,
// `import.meta.hot`, etc. via the reference above.

// App/browser globals we touch that aren't in the default lib typings.
interface Window {
  // Electron preload bridge (AI/export/import call into it when present).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tetrobot?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tetrobotModel?: any;
  // File System Access API (not in this TS lib target yet).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  showSaveFilePicker?: (...args: any[]) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  showOpenFilePicker?: (...args: any[]) => Promise<any>;
}
