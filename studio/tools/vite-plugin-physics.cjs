/**
 * vite-plugin-physics.cjs — DEV only: keep the right MuJoCo physics service (sim/verify_service.py, port 8771) running.
 * Nobody starts it by hand. It starts with `npm run dev`, and every physics button first asks /__physics/ensure
 * (simScene.physicsFetch), which:
 *   - starts it if it is not running;
 *   - replaces it if it runs from another folder or the sim code changed since it started (31 Oct: a service left over
 *     from C:\TETROBOT held the port, and the Studio talked to old code without saying so);
 *   - waits until it answers. It restarts by itself after a crash.
 *   PHYSICS_SERVICE=0 npm run dev   -> don't manage it.   Output: data/logs/verify_service_console.log
 */
const { spawn, execFileSync } = require('node:child_process');
const net = require('node:net');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const SIM = process.env.TETROBOT_SIM || path.resolve(__dirname, '..', '..', 'sim');
const DATA = process.env.TETROBOT_DATA || path.resolve(__dirname, '..', '..', 'data'); // the project's data/, see sim/paths.py
const PORT = 8771;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function listening(port) {
  return new Promise((ok) => {
    const s = net.connect({ host: '127.0.0.1', port }, () => { s.destroy(); ok(true); });
    s.on('error', () => ok(false)); s.setTimeout(800, () => { s.destroy(); ok(false); });
  });
}

/** the running service's own description, or null if it doesn't answer */
function health() {
  return new Promise((ok) => {
    const r = http.get({ host: '127.0.0.1', port: PORT, path: '/health', timeout: 1500 }, (res) => {
      let b = ''; res.on('data', (c) => { b += c; }); res.on('end', () => { try { ok(JSON.parse(b)); } catch { ok(null); } });
    });
    r.on('error', () => ok(null)); r.on('timeout', () => { r.destroy(); ok(null); });
  });
}

function newestCode() {
  let t = 0;
  for (const d of [SIM, path.join(SIM, 'deploy')]) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) if (f.endsWith('.py')) t = Math.max(t, fs.statSync(path.join(d, f)).mtimeMs);
  }
  return t;
}

/** pid listening on the port, only if it really is a verify_service.py (never kill anything else) */
function servicePid() {
  try {
    if (process.platform === 'win32') {
      const ps = `$p=(Get-NetTCPConnection -LocalPort ${PORT} -State Listen).OwningProcess; if((Get-CimInstance Win32_Process -Filter "ProcessId=$p").CommandLine -match 'verify_service'){$p}`;
      return Number(execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8', windowsHide: true }).trim()) || null;
    }
    const p = Number(execFileSync('lsof', ['-ti', `tcp:${PORT}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).trim());
    return p && execFileSync('ps', ['-o', 'command=', '-p', String(p)], { encoding: 'utf8' }).includes('verify_service') ? p : null;
  } catch { return null; }
}

function kill(pid) {
  try { if (process.platform === 'win32') execFileSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); else process.kill(pid); } catch { /* gone */ }
}

module.exports = function physicsPlugin() {
  let child = null; let stopping = false; let replacing = false; let busy = null;
  const start = (log) => {
    const script = path.join(SIM, 'verify_service.py');
    if (stopping || child) return;
    if (!fs.existsSync(script)) { log(`[physics] ${script} not found - physics features stay off`); return; }
    fs.mkdirSync(path.join(DATA, 'logs'), { recursive: true });
    const out = fs.openSync(path.join(DATA, 'logs', 'verify_service_console.log'), 'a');
    const win = process.platform === 'win32';
    const me = spawn(win ? 'py' : 'python3', win ? ['-3.12', script] : [script], { cwd: SIM, stdio: ['ignore', out, out], windowsHide: true });
    child = me;
    log(`[physics] started the physics service (pid ${me.pid}, port ${PORT})`);
    me.on('exit', (code) => {
      if (child === me) child = null;
      if (!stopping && !replacing) { log(`[physics] service exited (${code}) - starting it again in 3 s`); setTimeout(() => ensure(log), 3000); }
    });
  };
  const run = async (log) => {
    const h = await health();
    const same = h && h.sim && path.resolve(h.sim).toLowerCase() === SIM.toLowerCase();
    if (same && h.started * 1000 >= newestCode()) return true;
    if (await listening(PORT)) {
      const pid = h?.pid ?? servicePid();
      if (!pid) { log(`[physics] port ${PORT} is used by another program - left alone`); return false; }
      log(`[physics] replacing the service (pid ${pid}): ${same ? 'sim code changed' : `it runs from ${h?.sim ?? 'an old folder'}`}`);
      replacing = true; kill(child ? child.pid : pid); child = null;
      for (let i = 0; i < 20 && await listening(PORT); i++) await sleep(250);
      replacing = false;
    }
    start(log);
    for (let i = 0; i < 240; i++) { if (await health()) return true; await sleep(250); }     // the first import of mujoco can take a while
    log('[physics] the service did not answer in 60 s - see data/logs/verify_service_console.log');
    return false;
  };
  const ensure = (log) => { busy ??= run(log).catch((e) => { log(`[physics] ${e.message}`); return false; }).finally(() => { busy = null; }); return busy; };
  const stop = () => { stopping = true; if (child) kill(child.pid); };
  return {
    name: 'tetrobot-physics-service',
    apply: 'serve',
    configureServer(server) {
      if (process.env.PHYSICS_SERVICE === '0') return;
      const log = (m) => server.config.logger.info(m);
      ensure(log);
      server.middlewares.use('/__physics/ensure', (_req, res) => {
        ensure(log).then((ok) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok })); });
      });
      server.httpServer?.on('close', stop);
      process.once('exit', stop); process.once('SIGINT', () => { stop(); process.exit(0); }); process.once('SIGTERM', () => { stop(); process.exit(0); });
    },
  };
};
