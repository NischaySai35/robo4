/**
 * physicsService.cjs — the installed app's MuJoCo service (G7). The dev server starts it with tools/vite-plugin-physics.cjs;
 * an installed app has no dev server, so it runs resources/gos's private Python. Data goes in the user's folder because the
 * install folder may be read-only. A service already on the port is left alone. Output: <userData>/data/logs/verify_service_console.log
 */
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

const PORT = 8771;

function portInUse(port) {
  return new Promise((resolve) => {
    const s = net.connect(port, '127.0.0.1');
    s.setTimeout(500);
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('timeout', () => { s.destroy(); resolve(false); });
    s.on('error', () => resolve(false));
  });
}

/** First run only: files the sim needs, copied out of the install. Never overwrites what is there. */
function seedData(from, to) {
  if (!fs.existsSync(from)) return;
  fs.cpSync(from, to, { recursive: true, force: false, errorOnExist: false });
}

function startPhysicsService({ resourcesPath, userData, log = console.log }) {
  const gos = path.join(resourcesPath, 'gos');
  const win = process.platform === 'win32';
  const python = path.join(gos, win ? 'python.exe' : 'bin/python3');
  const script = path.join(gos, 'sim', 'verify_service.py');
  let child = null; let stopped = false; let fails = 0;
  const dataDir = path.join(userData, 'data');

  const run = () => {
    if (stopped) return;
    const out = fs.openSync(path.join(dataDir, 'logs', 'verify_service_console.log'), 'a');
    child = spawn(python, [script], { cwd: path.dirname(script), stdio: ['ignore', out, out], windowsHide: true, env: { ...process.env, TETROBOT_DATA: dataDir } });
    const started = Date.now();
    child.on('error', (e) => log(`[physics] could not start: ${e.message}`));
    child.on('exit', (code) => {
      child = null;
      if (stopped) return;
      fails = Date.now() - started > 60000 ? 0 : fails + 1;
      if (fails >= 3) { log(`[physics] stopped after ${fails} failed starts. See ${path.join(dataDir, 'logs', 'verify_service_console.log')}`); return; }
      log(`[physics] service exited (${code}), starting it again in 3 s`);
      setTimeout(run, 3000);
    });
  };

  (async () => {
    if (!fs.existsSync(python) || !fs.existsSync(script)) { log(`[physics] not in this install (${gos}). Physics features stay off.`); return; }
    if (await portInUse(PORT)) { log(`[physics] port ${PORT} is already in use: using what is there.`); return; }
    fs.mkdirSync(path.join(dataDir, 'logs'), { recursive: true });
    seedData(path.join(gos, 'seed_data'), dataDir);
    run();
  })();

  return () => { stopped = true; if (child) child.kill(); };
}

module.exports = { startPhysicsService, seedData, portInUse };
