/**
 * gpuWatcher — per-process GPU utilisation on Windows, shared by the Electron main
 * process and the Vite dev server so the two never drift apart.
 *
 * There is no cross-platform API for GPU busy-percentage. Task Manager reads the Windows
 * "GPU Engine(pid_*) / Utilization Percentage" performance counters, and without a native
 * module the only way to reach those is PowerShell's Get-Counter.
 *
 * Measured on a real machine before settling on this design: one wildcard Get-Counter call
 * takes ~7.8s, but three samples take only ~8.8s — so essentially all of it is ONE-TIME
 * instance enumeration and each further sample is ~1s (mostly the counter's own sample
 * interval, i.e. sleeping, not CPU). Spawning a fresh PowerShell per poll would pay that
 * ~7s init EVERY time and was never viable. Hence: one long-lived streaming process,
 * started lazily, whose latest value callers read from a cache. Nothing here ever blocks
 * the caller — a performance readout must never be the reason a frame is late.
 */
const { spawn } = require('child_process');

const SAMPLE_SECONDS = 4;

let _proc = null;
let _stdout = '';
/** Latest sample as raw "instance=value" pairs, or null when unknown/not yet sampled. */
let _latestPairs = null;

/**
 * Highest-utilisation GPU engine among the given pids (or across the whole system when
 * `pids` is null). Returns null when no sample has arrived or the counters are unavailable
 * — deliberately never 0, because "unknown" and "idle" are very different claims.
 */
function gpuPercentFor(pids) {
  if (_latestPairs === null) return null;
  const prefixes = pids ? pids.map((p) => `pid_${p}_`) : null;
  // Instance names look like: pid_1234_luid_0x0..._phys_0_eng_0_engtype_3d
  // Task Manager reports a process's GPU as its BUSIEST engine type rather than the sum:
  // 3D / Copy / VideoDecode run concurrently, so adding them overstates real utilisation.
  const byEngine = new Map();
  for (const pair of _latestPairs) {
    const eq = pair.lastIndexOf('=');
    if (eq < 0) continue;
    const name = pair.slice(0, eq);
    if (prefixes) {
      let mine = false;
      for (const prefix of prefixes) { if (name.startsWith(prefix)) { mine = true; break; } }
      if (!mine) continue;
    }
    const engType = name.split('engtype_')[1] ?? 'other';
    byEngine.set(engType, (byEngine.get(engType) ?? 0) + (Number(pair.slice(eq + 1)) || 0));
  }
  let max = 0;
  for (const v of byEngine.values()) if (v > max) max = v;
  return Math.max(0, Math.min(100, max));
}

/** Start the sampler if it isn't already running. Safe to call on every poll. */
function ensureGpuWatcher() {
  if (process.platform !== 'win32' || _proc) return;

  // The counter path contains backslashes, and they must survive BOTH JavaScript string
  // parsing and Windows command-line argument escaping. Written inline they did not: JS
  // silently drops them (\G and \U are not valid escapes), so PowerShell received
  // 'GPU Engine(*)Utilization Percentage' and failed with "counter path could not be
  // interpreted". Building the path from [char]92 inside PowerShell means no backslash ever
  // appears in this file, so no escaping layer can corrupt it. Verified end-to-end through
  // a real spawn() before shipping, not assumed.
  const script =
    "$ErrorActionPreference='SilentlyContinue';$ProgressPreference='SilentlyContinue';" +
    "$bs=[char]92; $cp=$bs+'GPU Engine(*)'+$bs+'Utilization Percentage';" +
    'Get-Counter $cp -Continuous -SampleInterval ' + SAMPLE_SECONDS +
    ' | ForEach-Object {' +
    ' $s = $_.CounterSamples | Where-Object { $_.CookedValue -gt 0 }' +
    " | ForEach-Object { $_.InstanceName + '=' + [math]::Round($_.CookedValue,2) };" +
    " Write-Output ('SAMPLE ' + ($s -join '|')) }";
  // -EncodedCommand (base64 UTF-16LE) rather than -Command: one opaque token, immune to
  // quoting differences in how the argument reaches PowerShell.
  const encoded = Buffer.from(script, 'utf16le').toString('base64');

  try {
    _proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], { windowsHide: true });
  } catch { _proc = null; return; }

  _proc.stdout.on('data', (chunk) => {
    _stdout += chunk.toString();
    let nl;
    while ((nl = _stdout.indexOf('\n')) >= 0) {
      const line = _stdout.slice(0, nl).trim();
      _stdout = _stdout.slice(nl + 1);
      if (line.startsWith('SAMPLE ')) _latestPairs = line.slice(7).split('|').filter(Boolean);
    }
    if (_stdout.length > 1_000_000) _stdout = ''; // a pathological unterminated line
  });
  // Counters can be localised, disabled, or blocked by policy. Every failure path resets to
  // null ("unknown"), which the UI renders as a dash rather than as 0%.
  const reset = () => { _latestPairs = null; _proc = null; _stdout = ''; };
  _proc.on('error', reset);
  _proc.on('exit', reset);
}

function stopGpuWatcher() {
  if (!_proc) return;
  try { _proc.kill(); } catch { /* already gone */ }
  _proc = null;
}

module.exports = { ensureGpuWatcher, stopGpuWatcher, gpuPercentFor };
