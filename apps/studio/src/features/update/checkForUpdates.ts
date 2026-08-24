/**
 * checkForUpdates — the in-app "Check for Updates" flow (Help menu).
 *
 * Drives the Electron auto-updater via the preload bridge: ask the main process to
 * check the GitHub release feed, then walk the user through download → restart-to-
 * install with simple confirms. No-ops gracefully in the browser / dev build.
 */
type UpdateBridge = {
  isDesktop?: boolean;
  appVersion?: () => Promise<string>;
  checkForUpdates?: () => Promise<{ ok: boolean; dev?: boolean; error?: string; version?: string }>;
  downloadUpdate?: () => Promise<{ ok: boolean; error?: string }>;
  installUpdate?: () => void;
  onUpdateStatus?: (cb: (s: any) => void) => () => void;
};

export async function checkForUpdates(silent = false): Promise<void> {
  const t = (window as any).tetrobot as UpdateBridge | undefined;
  if (!t?.checkForUpdates) {
    if (!silent) alert('Auto-update is only available in the installed desktop app (not the browser/dev build).');
    return;
  }

  let done = false;
  const unsub = t.onUpdateStatus?.((s: any) => {
    switch (s.status) {
      case 'none':
        if (!silent) alert(`You're up to date — TETROBOT v${s.version ?? ''} is the latest.`);
        finish();
        break;
      case 'available':
        if (window.confirm(`A new version (v${s.version}) is available.\n\nDownload it now?`)) {
          t.downloadUpdate?.();
        } else { finish(); }
        break;
      case 'downloading':
        // (optional) could surface s.percent in a progress UI
        break;
      case 'downloaded':
        if (window.confirm(`Update v${s.version} downloaded.\n\nRestart now to install? (Unsaved work is autosaved.)`)) {
          t.installUpdate?.();
        }
        finish();
        break;
      case 'error':
        if (!silent) alert(`Update check failed:\n${s.message}`);
        finish();
        break;
      default: break;
    }
  });

  function finish() { if (!done) { done = true; unsub?.(); } }

  const r = await t.checkForUpdates();
  if (r?.dev) { finish(); if (!silent) alert('Running in dev mode — updates are only checked in the installed app.'); }
  else if (r && r.ok === false && r.error) { finish(); if (!silent) alert(`Update check failed:\n${r.error}`); }
}

/** Current app version string (for an "About" line), or '' in the browser. */
export async function getAppVersion(): Promise<string> {
  const t = (window as any).tetrobot as UpdateBridge | undefined;
  try { return (await t?.appVersion?.()) ?? ''; } catch { return ''; }
}
