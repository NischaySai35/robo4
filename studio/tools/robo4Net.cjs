/**
 * robo4Net.cjs — keep the modules' links running while the Studio is open:
 *   1. ROBO4-NET (tools/robo4-net.ps1): the modules' Wi-Fi + the 200 ms heartbeat (uploads, web page, fallback).
 *   2. The ESP-NOW bridge (`gos robot bridge`, gos/python/gos/espnow.py): commands over the USB dongle,
 *      each module at its own laptop address (mod1 = http://127.0.4.1). Only while a dongle is plugged in.
 * Shared by the Vite dev server (robo4NetPlugin, so `npm run dev` starts them) and the Electron main process
 * (the installed app), so the two can never start them differently.
 *
 *   - Windows only; elsewhere it logs and does nothing.
 *   - Runs hidden; restarts 3 s after a crash.
 *   - Only one copy runs: a second copy exits with code 3 (BUSY), so `npm run dev` + the app together don't
 *     fight — the second launcher checks again every 10 s and takes over when the first one closes.
 *   - The bridge exits with code 4 when no dongle is plugged in: checked again every 10 s, said once.
 *   - Stopped when the Studio closes — or, if the Studio is killed outright, by the helper itself (it watches
 *     the parent pid).        ROBO4_NET=0 / ESPNOW_BRIDGE=0 -> don't manage that one.
 * Output: <data>/logs/robo4_net.log and espnow_bridge.log
 *
 * REUSE-CHECKED: robo4-net|WiFiDirect|hotspot|heartbeat|spawn(powershell|py) -> psStream.cjs
 * streams one-shot PowerShell output (no supervision/restart); vite-plugin-physics.cjs and
 * electron/physicsService.cjs supervise the Python MuJoCo service by port/health. supervise() below is the one
 * restart-and-take-over loop for both helpers here (6 Nov 2026: the ESP-NOW bridge reuses it).
 */
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const BUSY = 3;        // another copy owns it (robo4-net.ps1, gos robot bridge)
const NOTHING = 4;     // nothing to run it on yet (bridge: no dongle plugged in)

function supervise({ tag, command, args, logFile, log, upMsg, nothingMsg, env }) {
  let child = null; let stopped = false; let waiting = false; let idle = false;
  const run = () => {
    if (stopped || child) return;
    const out = fs.openSync(logFile, 'a');
    const me = spawn(command, args, { stdio: ['ignore', out, out], windowsHide: true, env: env ?? process.env });
    child = me;
    me.on('error', (e) => log(`[${tag}] could not start: ${e.message}`));
    me.on('exit', (code) => {
      fs.closeSync(out);
      if (child === me) child = null;
      if (stopped) return;
      if (code === BUSY) {
        if (!waiting) log(`[${tag}] already running elsewhere - will take over when that one closes`);
        waiting = true;
        setTimeout(run, 10000);
        return;
      }
      if (code === NOTHING) {
        if (!idle && nothingMsg) log(`[${tag}] ${nothingMsg}`);
        idle = true;
        setTimeout(run, 10000);
        return;
      }
      waiting = false; idle = false;
      log(`[${tag}] exited (${code}) - starting it again in 3 s. See ${logFile}`);
      setTimeout(run, 3000);
    });
    // A busy or idle copy exits within a second or two; only claim "up" once this one stayed.
    setTimeout(() => {
      if (child === me && !stopped) { waiting = false; idle = false; log(`[${tag}] ${upMsg} (pid ${me.pid})`); }
    }, 2500);
  };
  run();
  return () => {
    stopped = true;
    // /T: the whole tree (Windows tears the network down with it; the bridge's heartbeat stops -> modules hold).
    if (child) { try { execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); } catch { /* gone */ } }
  };
}

function startRobo4Net({ script, logDir, log = console.log }) {
  if (process.env.ROBO4_NET === '0') return () => {};
  if (process.platform !== 'win32') { log('[robo4-net] the modules\' network needs Windows - not started'); return () => {}; }
  if (!fs.existsSync(script)) { log(`[robo4-net] ${script} not found - modules' network not started`); return () => {}; }
  fs.mkdirSync(logDir, { recursive: true });
  // powershell.exe (5.1), not pwsh: the WinRT Wi-Fi Direct API is only reachable from 5.1.
  // -ParentPid: if this process is killed outright (no exit handler runs), the script takes the network down itself.
  return supervise({
    tag: 'robo4-net', command: 'powershell.exe',
    args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-ParentPid', String(process.pid)],
    logFile: path.join(logDir, 'robo4_net.log'), log, upMsg: "modules' network ROBO4-NET is up",
  });
}

// gosPath: gos/python of the repo (dev), so the bridge runs this checkout's code even if gos is not pip-installed.
function startEspNowBridge({ logDir, gosPath, log = console.log }) {
  if (process.env.ESPNOW_BRIDGE === '0') return () => {};
  if (process.platform !== 'win32') return () => {};
  fs.mkdirSync(logDir, { recursive: true });
  const env = { ...process.env };
  if (gosPath && fs.existsSync(gosPath)) env.PYTHONPATH = [gosPath, env.PYTHONPATH].filter(Boolean).join(path.delimiter);
  return supervise({
    tag: 'espnow', command: 'py', args: ['-3.12', '-m', 'gos', 'robot', 'bridge', '--parent-pid', String(process.pid)], env,
    logFile: path.join(logDir, 'espnow_bridge.log'), log,
    upMsg: 'ESP-NOW bridge is up: modules answer at http://127.0.4.<N> (mod1 = 127.0.4.1)',
    nothingMsg: 'no ESP-NOW dongle plugged in - checking every 10 s (modules stay on Wi-Fi)',
  });
}

/** Vite plugin: `npm run dev` keeps the modules' network and the ESP-NOW bridge up while the dev server runs. */
function robo4NetPlugin() {
  return {
    name: 'robo4-net',
    apply: 'serve',
    configureServer(server) {
      const log = (m) => server.config.logger.info(m);
      const root = path.resolve(__dirname, '..', '..');
      const data = process.env.TETROBOT_DATA || path.join(root, 'data');
      const logDir = path.join(data, 'logs');
      const stops = [
        startRobo4Net({ script: path.join(root, 'tools', 'robo4-net.ps1'), logDir, log }),
        startEspNowBridge({ logDir, gosPath: path.join(root, 'gos', 'python'), log }),
      ];
      const stop = () => stops.forEach((s) => s());
      server.httpServer?.on('close', stop);
      process.once('exit', stop);
    },
  };
}

module.exports = { startRobo4Net, startEspNowBridge, robo4NetPlugin };
