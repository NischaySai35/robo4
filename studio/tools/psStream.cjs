/**
 * psStream — one long-lived PowerShell process whose stdout is delivered line by line.
 * Shared by gpuWatcher and processMetrics (both need a streaming sampler: PowerShell's
 * one-time counter init costs seconds, so a spawn-per-poll was never viable).
 *
 * The script goes in as -EncodedCommand (base64 UTF-16LE): one opaque token, immune to
 * quoting/escaping differences in how the argument reaches PowerShell.
 */
const { spawn } = require('child_process');

/**
 * Start `script`; `onLine(trimmedLine)` per output line; `onEnd()` once if it errors or
 * exits. Returns the child process, or null if it could not be spawned.
 */
function streamPowerShell(script, onLine, onEnd, maxBuffer = 4_000_000) {
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  let proc;
  try {
    proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], { windowsHide: true });
  } catch { return null; }
  let buf = '';
  proc.stdout.on('data', (chunk) => {
    buf += chunk.toString();
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      onLine(line);
    }
    if (buf.length > maxBuffer) buf = ''; // a pathological unterminated line
  });
  let ended = false;
  const end = () => { if (!ended) { ended = true; onEnd(); } };
  proc.on('error', end);
  proc.on('exit', end);
  return proc;
}

module.exports = { streamPowerShell };
