/**
 * vite-plugin-metrics — serves real metrics to the app when it runs in a BROWSER against
 * the dev server, so the viewport HUD isn't blank outside the Electron shell.
 *
 * A web page fundamentally cannot see process RSS, CPU time or GPU utilisation. In Electron
 * those come from `app.getAppMetrics()` over IPC; a plain tab has no equivalent. The dev
 * server, however, is a Node process on the same machine, so it can measure and hand back.
 *
 * WHAT IS COUNTED, and why it is not the whole machine: an earlier version reported
 * os.totalmem()-os.freemem() (~18GB), which describes the machine, not the app. This now
 * sums only the processes actually running this software in development:
 *   • the dev server's own process tree (node + its esbuild children)
 *   • every process of the browser displaying the page
 *
 * The browser term is an over-count and is labelled as such in the UI: the page is one tab
 * inside a shared browser process tree, and nothing outside the browser can attribute a
 * slice of that tree to a single tab. The Electron app remains the exact, app-only path.
 *
 * Dev only — `apply: 'serve'` — so none of this reaches a production bundle.
 */
const { ensureGpuWatcher, gpuPercentFor } = require('./gpuWatcher.cjs');
const {
  ensureProcessWatcher, metricsFor, selectTree, selectExe, hostTreeRoot, nameOf, ready,
} = require('./processMetrics.cjs');

/** Map a User-Agent to the browser's executable name. */
function browserExeFor(userAgent) {
  const ua = String(userAgent || '');
  if (/Edg\//.test(ua)) return 'msedge.exe';
  if (/OPR\//.test(ua)) return 'opera.exe';
  if (/Firefox\//.test(ua)) return 'firefox.exe';
  if (/Chrome\//.test(ua)) return 'chrome.exe';
  return null;
}

module.exports = function metricsPlugin() {
  return {
    name: 'tetrobot-metrics',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__metrics', (req, res) => {
        // Both watchers are lazy: nothing is spawned until the HUD actually asks.
        ensureGpuWatcher();
        ensureProcessWatcher();

        const exe = browserExeFor(req.headers && req.headers['user-agent']);
        // The dev server is a child of whatever launched it — normally the editor's
        // integrated terminal — so the honest "what is this project costing" figure is that
        // whole tree, not just the node process. Measuring only node reported ~100MB while
        // the editor hosting it was using 1.2GB, which is what made the total look wrong.
        const hostPid = hostTreeRoot();
        const host = metricsFor(selectTree(hostPid));
        const hostName = nameOf(hostPid) || 'dev server';
        const browser = exe ? metricsFor(selectExe(exe)) : null;

        // Bumped whenever the payload's meaning changes. Vite auto-restarts on a
        // vite.config.js edit, but Node's require() cache survives that restart and keeps
        // serving the OLD .cjs plugin — which silently reported machine-wide memory long
        // after the code had been fixed. The client warns loudly on a mismatch instead of
        // letting a stale server masquerade as a wrong measurement.
        const PAYLOAD_VERSION = 3;

        let payload;
        if (!ready() || !host) {
          // Two samples are needed before CPU means anything; report unavailable rather than
          // a fabricated 0 for the second or so it takes.
          payload = { available: false, scope: 'dev', v: PAYLOAD_VERSION };
        } else {
          payload = {
            available: true,
            v: PAYLOAD_VERSION,
            scope: 'dev',
            ramBytes: host.ramBytes + (browser?.ramBytes ?? 0),
            cpuPercent: Math.min(100, host.cpuPercent + (browser?.cpuPercent ?? 0)),
            // Itemised so the total is never a mystery number — the UI lists these.
            parts: [
              browser ? { label: exe.replace(/\.exe$/, ''), ramBytes: browser.ramBytes, cpuPercent: browser.cpuPercent } : null,
              { label: hostName, ramBytes: host.ramBytes, cpuPercent: host.cpuPercent },
            ].filter(Boolean),
            // GPU is already effectively app-scoped in practice here: in a browser the only
            // sustained GPU work is this page's WebGL rendering, and it drops to zero the
            // moment the tab stops rendering.
            gpuPercent: gpuPercentFor(null),
            browserExe: exe,
          };
        }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(payload));
      });
    },
  };
};
