/**
 * vite-plugin-physics.cjs — DEV only: start the MuJoCo physics service (sim/verify_service.py, port 8771)
 * together with `npm run dev`, so Shapes / Manual / Real physics work without starting anything by hand.
 *   - if something already listens on 8771, it is left alone (e.g. started by hand)
 *   - crashed? started again after 3 s;  the dev server stops -> the service stops
 *   - PHYSICS_SERVICE=0 npm run dev   -> don't start it
 * Output: C:\TETROBOT\logs\verify_service_console.log
 */
const { spawn } = require('node:child_process');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');

const SIM = process.env.TETROBOT_SIM || path.resolve(__dirname, '..', '..', 'sim');
const DATA = process.env.TETROBOT_DATA || path.resolve(__dirname, '..', '..', 'data'); // the project's data/, see sim/paths.py
const PORT = 8771;

function listening(port) {
  return new Promise((ok) => {
    const s = net.connect({ host: '127.0.0.1', port }, () => { s.destroy(); ok(true); });
    s.on('error', () => ok(false)); s.setTimeout(800, () => { s.destroy(); ok(false); });
  });
}

module.exports = function physicsPlugin() {
  let child = null; let stopping = false;
  const start = async (log) => {
    if (stopping || await listening(PORT)) return;
    const script = path.join(SIM, 'verify_service.py');
    if (!fs.existsSync(script)) { log(`[physics] ${script} not found - physics features stay off`); return; }
    fs.mkdirSync(path.join(DATA, 'logs'), { recursive: true });
    const out = fs.openSync(path.join(DATA, 'logs', 'verify_service_console.log'), 'a');
    child = spawn('py', ['-3.12', script], { cwd: SIM, stdio: ['ignore', out, out], windowsHide: true });
    log(`[physics] started the physics service (pid ${child.pid}, port ${PORT})`);
    child.on('exit', (code) => { child = null; if (!stopping) { log(`[physics] service exited (${code}) - starting it again in 3 s`); setTimeout(() => start(log), 3000); } });
  };
  const stop = () => { stopping = true; if (child) { try { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']) : child.kill(); } catch { /* gone */ } } };
  return {
    name: 'tetrobot-physics-service',
    apply: 'serve',
    configureServer(server) {
      if (process.env.PHYSICS_SERVICE === '0') return;
      const log = (m) => server.config.logger.info(m);
      start(log);
      server.httpServer?.on('close', stop);
      process.once('exit', stop); process.once('SIGINT', () => { stop(); process.exit(0); }); process.once('SIGTERM', () => { stop(); process.exit(0); });
    },
  };
};
