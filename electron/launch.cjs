// Dev launcher: starts Vite, waits for it, then launches Electron.
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const electronPath = require('electron');
const projectRoot = path.resolve(__dirname, '..');
const PORT = process.env.VITE_DEV_PORT || '5757';

const env = Object.assign({}, process.env);
delete env.ELECTRON_RUN_AS_NODE;
env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let viteProc = null;
let electronProc = null;

function cleanup() {
  if (viteProc) { viteProc.kill(); viteProc = null; }
  if (electronProc) { electronProc.kill(); electronProc = null; }
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start Vite
viteProc = spawn('npx', ['vite', '--port', PORT], {
  cwd: projectRoot,
  stdio: 'pipe',
  shell: true,
  env,
});

viteProc.stdout.on('data', d => process.stdout.write(`[vite] ${d}`));
viteProc.stderr.on('data', d => process.stderr.write(`[vite] ${d}`));
viteProc.on('close', code => {
  console.log(`[vite] exited with code ${code}`);
  cleanup();
  process.exit(code || 0);
});

// Wait for Vite to be ready, then launch Electron
function waitForVite(retries = 30) {
  const req = http.get(`http://localhost:${PORT}`, res => {
    res.resume();
    console.log('[launch] Vite is ready, starting Electron...');
    launchElectron();
  });
  req.on('error', () => {
    if (retries <= 0) {
      console.error('[launch] Vite failed to start after 30s');
      cleanup();
      process.exit(1);
    }
    setTimeout(() => waitForVite(retries - 1), 1000);
  });
  req.setTimeout(1000);
}

function launchElectron() {
  electronProc = spawn(electronPath, [projectRoot], {
    stdio: 'inherit',
    env,
  });
  electronProc.on('close', code => {
    console.log(`[electron] exited with code ${code}`);
    cleanup();
    process.exit(code || 0);
  });
}

waitForVite();
