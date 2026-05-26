// Combined launcher: starts Vite dev server, waits until it's ready, then spawns Electron.
// Usage: node electron/start.cjs  (or: npm start)
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const electronPath = require('electron');

// Preferred port matches vite.config.js → server.port (5757).
// If taken, Vite increments by 1 (strictPort:false), so we scan a small range.
const BASE_PORT = 5757;
const SCAN_RANGE = 8; // check 5757–5764

// 1. Start Vite
const vite = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: ROOT,
});
console.log('[start] Vite dev server starting...');

// 2. Poll BASE_PORT..BASE_PORT+SCAN_RANGE every 500ms until one responds
function waitForVite(callback) {
  let found = false;

  function scan() {
    if (found) return;
    let remaining = SCAN_RANGE;

    for (let i = 0; i < SCAN_RANGE; i++) {
      const port = BASE_PORT + i;
      http.get(`http://localhost:${port}`, () => {
        if (found) return;
        found = true;
        console.log(`[start] Vite ready on port ${port} — launching Electron window`);
        callback(port);
      }).on('error', () => {
        // port not ready, continue scanning
      });
    }

    setTimeout(scan, 500);
  }

  setTimeout(scan, 1200);
}

waitForVite((port) => {
  const env = Object.assign({}, process.env, { VITE_DEV_PORT: String(port) });
  delete env.ELECTRON_RUN_AS_NODE; // VS Code injects this, breaks Electron APIs

  const electron = spawn(electronPath, [ROOT], { stdio: 'inherit', env });

  electron.on('close', () => {
    vite.kill();
    process.exit(0);
  });
});

// Graceful exit when user hits Ctrl+C
process.on('SIGINT', () => {
  vite.kill();
  process.exit(0);
});
