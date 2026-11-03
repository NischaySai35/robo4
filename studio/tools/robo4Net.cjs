/**
 * robo4Net.cjs — keep the modules' Wi-Fi network (tools/robo4-net.ps1: ROBO4-NET + the
 * 200 ms heartbeat) running while the Studio is open. Shared by the Vite dev server
 * (robo4NetPlugin, so `npm run dev` starts it) and the Electron main process (the installed
 * app), so the two can never start it differently.
 *
 *   - Windows only (the network is a Windows Wi-Fi Direct feature); elsewhere it logs and does nothing.
 *   - Runs hidden; restarts 3 s after a crash.
 *   - Only one copy runs: the script holds a lock and a second copy exits with code 3, so
 *     `npm run dev` + the app together don't fight — the second launcher just checks again
 *     every 10 s and takes over when the first one closes.
 *   - Stopped when the Studio closes — or, if the Studio is killed outright, by the script
 *     itself (it watches -ParentPid).        ROBO4_NET=0 -> don't manage it.
 * Output: <data>/logs/robo4_net.log
 *
 * REUSE-CHECKED: robo4-net|WiFiDirect|hotspot|heartbeat|spawn(powershell|py) -> psStream.cjs
 * streams one-shot PowerShell output (no supervision/restart); vite-plugin-physics.cjs and
 * electron/physicsService.cjs supervise the Python MuJoCo service by port/health. Nothing
 * starts the modules' network, and it has no port to probe, so this is new.
 */
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ALREADY_RUNNING = 3;   // robo4-net.ps1's exit code when another copy owns the network

function startRobo4Net({ script, logDir, log = console.log }) {
  if (process.env.ROBO4_NET === '0') return () => {};
  if (process.platform !== 'win32') { log('[robo4-net] the modules\' network needs Windows - not started'); return () => {}; }
  if (!fs.existsSync(script)) { log(`[robo4-net] ${script} not found - modules' network not started`); return () => {}; }
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, 'robo4_net.log');
  let child = null; let stopped = false; let waiting = false;

  const run = () => {
    if (stopped || child) return;
    const out = fs.openSync(logFile, 'a');
    // powershell.exe (5.1), not pwsh: the WinRT Wi-Fi Direct API is only reachable from 5.1.
    // -ParentPid: if this process is killed outright (no exit handler runs), the script
    // notices within a second and takes the network down itself.
    const me = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-ParentPid', String(process.pid)],
      { stdio: ['ignore', out, out], windowsHide: true });
    child = me;
    me.on('error', (e) => log(`[robo4-net] could not start: ${e.message}`));
    me.on('exit', (code) => {
      fs.closeSync(out);
      if (child === me) child = null;
      if (stopped) return;
      if (code === ALREADY_RUNNING) {
        if (!waiting) log('[robo4-net] already running elsewhere - will take over when that one closes');
        waiting = true;
        setTimeout(run, 10000);
        return;
      }
      waiting = false;
      log(`[robo4-net] exited (${code}) - starting it again in 3 s. See ${logFile}`);
      setTimeout(run, 3000);
    });
    // The lock is taken within a second; only claim "up" once this copy didn't bounce off it.
    setTimeout(() => {
      if (child === me && !stopped) { waiting = false; log(`[robo4-net] modules' network ROBO4-NET is up (pid ${me.pid})`); }
    }, 2500);
  };

  run();
  return () => {
    stopped = true;
    // /T: the whole tree, so Windows tears the network down with it.
    if (child) { try { execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); } catch { /* gone */ } }
  };
}

/** Vite plugin: `npm run dev` keeps the modules' network up while the dev server runs. */
function robo4NetPlugin() {
  return {
    name: 'robo4-net',
    apply: 'serve',
    configureServer(server) {
      const log = (m) => server.config.logger.info(m);
      const root = path.resolve(__dirname, '..', '..');
      const data = process.env.TETROBOT_DATA || path.join(root, 'data');
      const stop = startRobo4Net({ script: path.join(root, 'tools', 'robo4-net.ps1'), logDir: path.join(data, 'logs'), log });
      server.httpServer?.on('close', stop);
      process.once('exit', stop);
    },
  };
}

module.exports = { startRobo4Net, robo4NetPlugin };
