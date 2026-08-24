/**
 * launch.cjs — robust Electron launcher.
 *
 * Some environments set ELECTRON_RUN_AS_NODE=1, which makes the Electron binary
 * behave as plain Node (so require('electron') returns a path string and the app
 * never starts). Electron triggers that mode merely by the variable EXISTING, so
 * setting it empty isn't enough — it must be deleted. This script runs under plain
 * Node (where require('electron') correctly yields the binary path), strips the
 * offending var, and spawns the real Electron main process with a clean env.
 */
const { spawn } = require('child_process');
const electronPath = require('electron'); // path to the electron executable

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['.', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env,
});

child.on('close', (code) => process.exit(code == null ? 0 : code));
