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
    // newer sim code, but someone is using a live Manual session: never kill it under them (1 Nov: an edit restarted the service
    // mid-connect); the new code loads at the next restart
    if (same && h.live_sessions > 0) return true;
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
      // MuJoCo on THIS computer (Nischay 12 Nov 2026): the MSRR tab's real-physics tests need Python 3.12 + these exact
      // versions (data/ and memory: MuJoCo stays 3.12.0 with Isaac Sim 6.2's pins). Everything else in the Studio runs on its
      // own in-browser physics (Jolt). check = what is installed; install = pip-installs the pinned set, then restarts the service.
      const NEED = { mujoco: '3.12.0', numpy: '2.3.1', scipy: '1.17.0', mink: '1.4.0' };
      const onWin = process.platform === 'win32';
      const py = (args, ms) => new Promise((resolve) => {
        const p = spawn(onWin ? 'py' : 'python3', onWin ? ['-3.12', ...args] : args, { windowsHide: true });
        let out = ''; const t = setTimeout(() => p.kill(), ms);
        p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
        p.on('error', (e) => { clearTimeout(t); resolve({ code: -1, out: String(e.message || e) }); });
        p.on('close', (code) => { clearTimeout(t); resolve({ code, out }); });
      });
      const check = async () => {
        const script = ['import json, importlib.metadata as m', 'v = {}',
          `for k in ${JSON.stringify(Object.keys(NEED))}:`, '    try: v[k] = m.version(k)', '    except Exception: v[k] = None',
          'print(json.dumps(v))'].join('\n');
        const r = await py(['-c', script], 20000);
        if (r.code !== 0) return { python: false, ok: false, need: NEED, error: 'Python 3.12 was not found on this computer', detail: r.out.slice(-400) };
        let have = {}; try { have = JSON.parse(r.out.trim().split('\n').pop()); } catch { /* keep {} */ }
        const wrong = Object.keys(NEED).filter((k) => have[k] !== NEED[k]);
        return { python: true, ok: wrong.length === 0, have, need: NEED, wrong };
      };
      let installing = null;
      server.middlewares.use('/__physics/check', (_req, res) => {
        check().then((r) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ...r, installing: !!installing })); });
      });
      server.middlewares.use('/__physics/install', (_req, res) => {
        installing ??= (async () => {
          const pkgs = Object.entries(NEED).map(([k, v]) => `${k}==${v}`);
          log(`[physics] installing ${pkgs.join(' ')} ...`);
          const r = await py(['-m', 'pip', 'install', '--disable-pip-version-check', ...pkgs], 15 * 60 * 1000);
          try { fs.appendFileSync(path.join(DATA, 'logs', 'mujoco_install.log'), `\n==== ${new Date().toISOString()}\n${r.out}`); } catch { /* */ }
          const after = await check();
          if (after.ok) { if (child) kill(child.pid); await ensure(log); }          // restart the service on the new packages
          log(`[physics] install ${after.ok ? 'done' : 'FAILED'}`);
          return { ok: after.ok, check: after, tail: r.out.slice(-1500) };
        })().finally(() => { installing = null; });
        installing.then((r) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(r)); });
      });
      server.httpServer?.on('close', stop);
      process.once('exit', stop); process.once('SIGINT', () => { stop(); process.exit(0); }); process.once('SIGTERM', () => { stop(); process.exit(0); });
    },
  };
};
