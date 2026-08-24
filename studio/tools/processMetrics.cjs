/**
 * processMetrics — per-process RAM and CPU on Windows, so the dev-server metrics endpoint
 * reports what THIS SOFTWARE costs rather than what the whole machine costs.
 *
 * Why this exists: the first version of the dev endpoint reported os.totalmem()-os.freemem()
 * (~18GB), which describes the machine, not the app. In the Electron shell
 * `app.getAppMetrics()` gives an exact per-application answer; a browser has no equivalent,
 * so the dev server has to measure the processes itself.
 *
 * PRIVATE working set, not total. Summing Win32_Process.WorkingSetSize across a browser's
 * ~20 processes double-counts every shared page: measured 1.98GB that way against Task
 * Manager's 944MB for the same Chrome. WorkingSetPrivate sums to 0.89GB, which is what Task
 * Manager actually shows. Getting that right is the whole point of using the perf class here.
 *
 * Win32_PerfRawData_PerfProc_Process also carries cumulative CPU time and its own sample
 * timestamp, so one query covers RAM and CPU together. Measured ~190ms steady-state for ~390
 * processes (the first call costs ~3.7s of one-time counter init), which is why this runs as
 * one long-lived streaming process rather than a query per request.
 *
 * HONEST SCOPE LIMIT: selection is by executable name, because this perf class carries no
 * parent-process id. For a browser that means every process of that browser — your other
 * tabs included. Nothing outside the browser can attribute a slice of a shared process tree
 * to one tab, so this is an over-count and the UI says so. The Electron app is the exact path.
 */
const os = require('os');
const { spawn } = require('child_process');

const SAMPLE_SECONDS = 2;

let _proc = null;
let _stdout = '';
let _pending = null;
/** Latest parse: Map<pid, {rss, cpuTicks, name}>, and the perf-counter timestamp for it. */
let _curr = null, _currStamp = 0;
let _prev = null, _prevStamp = 0;

function parseBlock(lines) {
  const table = new Map();
  let stamp = 0;
  for (const line of lines) {
    // pid,ppid,privateWorkingSet,cpuTicks,timestamp100ns,name — name last (may contain commas).
    const parts = line.split(',');
    if (parts.length < 6) continue;
    const pid = Number(parts[0]);
    if (!Number.isFinite(pid)) continue;
    // Instance names are "chrome", "chrome#1", "chrome#2"… — normalise away the suffix.
    // "_Total" is an aggregate row and must never be summed alongside real processes.
    const name = parts.slice(5).join(',').toLowerCase().split('#')[0];
    if (name === '_total') continue;
    stamp = Number(parts[4]) || stamp;
    table.set(pid, {
      ppid: Number(parts[1]) || 0,
      rss: Number(parts[2]) || 0,
      cpuTicks: Number(parts[3]) || 0,
      name,
    });
  }
  return { table, stamp };
}

function ensureProcessWatcher() {
  if (process.platform !== 'win32' || _proc) return;
  const script =
    "$ErrorActionPreference='SilentlyContinue';$ProgressPreference='SilentlyContinue';" +
    'while ($true) {' +
    "  Write-Output 'BEGIN';" +
    '  Get-CimInstance Win32_PerfRawData_PerfProc_Process | ForEach-Object {' +
    "    Write-Output ($_.IDProcess.ToString() + ',' + $_.CreatingProcessID + ',' + $_.WorkingSetPrivate + ',' + $_.PercentProcessorTime + ',' + $_.Timestamp_Sys100NS + ',' + $_.Name) };" +
    "  Write-Output 'END';" +
    '  Start-Sleep -Seconds ' + SAMPLE_SECONDS + ' }';
  // -EncodedCommand: one opaque token, immune to how the argument reaches PowerShell.
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
      if (line === 'BEGIN') { _pending = []; continue; }
      if (line === 'END') {
        if (_pending) {
          const { table, stamp } = parseBlock(_pending);
          // Keep the previous sample: CPU is a DELTA of cumulative ticks, so a lone
          // snapshot carries no rate information at all.
          _prev = _curr; _prevStamp = _currStamp;
          _curr = table; _currStamp = stamp;
        }
        _pending = null;
        continue;
      }
      if (_pending) _pending.push(line);
    }
    if (_stdout.length > 4_000_000) _stdout = '';
  });
  const reset = () => { _proc = null; _stdout = ''; _pending = null; _curr = _prev = null; };
  _proc.on('error', reset);
  _proc.on('exit', reset);
}

function stopProcessWatcher() {
  if (!_proc) return;
  try { _proc.kill(); } catch { /* already gone */ }
  _proc = null;
}

/**
 * RAM + CPU summed over processes selected by `select(pid, info) => boolean`.
 * CPU is normalised by logical core count so it reads as a share of the whole machine,
 * matching Task Manager. Returns null until two samples exist.
 */
function metricsFor(select) {
  if (!_curr) return null;
  let ramBytes = 0, deltaTicks = 0;
  for (const [pid, p] of _curr) {
    if (!select(pid, p)) continue;
    ramBytes += p.rss;
    const before = _prev?.get(pid);
    // A process absent from the previous sample contributes no delta rather than its whole
    // lifetime's CPU, which would otherwise appear as a large one-off spike.
    if (before) deltaTicks += p.cpuTicks - before.cpuTicks;
  }
  let cpuPercent = 0;
  const dStamp = _currStamp - _prevStamp;
  if (_prev && dStamp > 0) {
    cpuPercent = Math.max(0, Math.min(100, (deltaTicks / dStamp) * 100 / Math.max(1, os.cpus().length)));
  }
  return { ramBytes, cpuPercent };
}

/**
 * Processes that count as "the thing hosting this dev server". The dev server is a child of
 * whatever terminal launched it, which is normally VS Code's integrated terminal — so the
 * editor's whole process tree (extension host, renderers, the shell, vite, esbuild) is what
 * this project is really costing the machine during development. Selecting only the node
 * process reported ~100MB while the editor hosting it was using 1.2GB.
 */
const HOST_NAMES = new Set([
  'code', 'code - insiders', 'codium', 'devenv',            // editors
  'windowsterminal', 'wt', 'powershell', 'pwsh', 'cmd', 'conhost', 'bash', 'sh', // terminals
]);

/**
 * Walk up from this process to the outermost editor/terminal that launched it, and return
 * that pid. Falls back to our own pid when the chain reveals no known host (e.g. started by
 * a service). Cycle- and depth-guarded: CreatingProcessID can point at a dead, recycled pid.
 */
function hostTreeRoot() {
  if (!_curr) return process.pid;
  let root = process.pid;
  let pid = process.pid;
  const seen = new Set();
  for (let i = 0; i < 24; i++) {
    const p = _curr.get(pid);
    if (!p || seen.has(pid)) break;
    seen.add(pid);
    if (HOST_NAMES.has(p.name)) root = pid; // keep the OUTERMOST match, not the first
    if (!p.ppid || !_curr.has(p.ppid)) break;
    pid = p.ppid;
  }
  return root;
}

/** Selector: `rootPid` and every descendant of it. */
function selectTree(rootPid) {
  if (!_curr) return () => false;
  const children = new Map();
  for (const [pid, p] of _curr) {
    if (!children.has(p.ppid)) children.set(p.ppid, []);
    children.get(p.ppid).push(pid);
  }
  const inTree = new Set();
  const stack = [rootPid];
  while (stack.length) {
    const pid = stack.pop();
    if (inTree.has(pid) || !_curr.has(pid)) continue;
    inTree.add(pid);
    for (const c of children.get(pid) ?? []) stack.push(c);
  }
  return (pid) => inTree.has(pid);
}

/** Display name for a pid, e.g. 'code'. */
function nameOf(pid) { return _curr?.get(pid)?.name ?? null; }

/** Selector: every process of the named executable, e.g. 'chrome.exe' or 'chrome'. */
function selectExe(exeName) {
  const want = String(exeName).toLowerCase().replace(/\.exe$/, '');
  return (_pid, p) => p.name === want;
}

/** True once a CPU-capable (two-sample) reading is available. */
function ready() { return _curr !== null && _prev !== null; }

module.exports = {
  ensureProcessWatcher, stopProcessWatcher, metricsFor, selectTree, selectExe,
  hostTreeRoot, nameOf, ready,
};
