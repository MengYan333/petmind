const electron = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');

// 文件日志，方便调试
const LOG_FILE = path.join(__dirname, '..', '.electron-debug.log');
function fileLog(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch {}
  console.log(...args);
}
// 清空旧日志
try { fs.writeFileSync(LOG_FILE, ''); } catch {}

// 加载 .env 文件到 process.env
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnv();

const { app, BrowserWindow, screen, Tray, Menu, nativeImage } = electron;

// Register petmind:// custom URL scheme so the web version can launch the desktop app.
// On Windows, the OS sends a second-instance event; on macOS it sends open-url.
// In dev mode (process.defaultApp), Electron is launched as `electron appDir` — the app path
// must be passed explicitly so the protocol handler knows where to find the app.
if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient('petmind', process.execPath, [path.resolve(__dirname, '..')]);
} else {
  app.setAsDefaultProtocolClient('petmind');
}

// Single-instance lock — if petmind:// is clicked while Electron is already running,
// focus the existing window instead of opening a second one.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

const PET_STRIP = { height: 160 };

let win;
let inputFocused = false;

function createWindow() {
  const { x, y, width, height } = screen.getPrimaryDisplay().workArea;
  console.log('[main] screen size:', width, height);

  win = new BrowserWindow({
    width,
    height,   // full work area — cat can be dragged anywhere
    x,
    y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.on('closed', () => {
    console.log('[main] window closed');
    win = null;
  });

  // Keep window visible when showing desktop
  win.on('hide', () => {
    if (win) {
      setTimeout(() => win.show(), 100);
    }
  });

  win.webContents.on('did-fail-load', (e, code, desc) => {
    console.log('[main] did-fail-load:', code, desc);
  });

  win.webContents.on('did-finish-load', () => {
    console.log('[main] page loaded successfully');
  });

  win.webContents.on('render-process-gone', (e, details) => {
    console.log('[main] RENDERER CRASH:', JSON.stringify(details));
  });

  win.webContents.on('console-message', (e, level, msg) => {
    if (level >= 2) console.log('[renderer]', msg);
  });

  win.setIgnoreMouseEvents(true, { forward: true });
  win.setAlwaysOnTop(true, 'pop-up-menu');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, moveToCurrentDesktop: true });

  // macOS "Show Desktop" (Fn+F11) may hide/move the window.
  // Force it back on a short interval.
  setInterval(() => {
    if (win && !win.isDestroyed() && !win.isVisible()) {
      win.show();
      if (!inputFocused) {
        win.setAlwaysOnTop(true, 'pop-up-menu');
      }
    }
  }, 200);

  const isDev = !app.isPackaged;
  console.log('[main] isDev:', isDev);
  if (isDev) {
    const port = process.env.VITE_DEV_PORT || '5757';
    win.loadURL(`http://localhost:${port}`).catch(e => console.log('[main] loadURL error:', e.message));
  } else {
    win.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  }
}

app.whenReady().then(() => {
  console.log('[main] app ready');
  const { ipcMain } = electron;

  createWindow();

  // System tray icon
  const iconPath = path.join(__dirname, '..', 'public', 'cat.png');
  let tray = null;
  try {
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 });
    icon.setTemplateImage(true); // macOS: adapts to dark/light menu bar
    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'PetMind', enabled: false },
      { type: 'separator' },
      { label: '退出 PetMind', click: () => app.quit() },
    ]);
    tray.setToolTip('PetMind - 桌面宠物');
    tray.setContextMenu(contextMenu);
    console.log('[main] tray icon created');
  } catch (e) {
    console.log('[main] tray icon error:', e.message);
  }

  // Windows: petmind:// clicked while app already running → focus window
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  // macOS: petmind:// deep link
  app.on('open-url', (event) => {
    event.preventDefault();
    if (win) win.focus();
  });

  ipcMain.on('set-mouse-ignore', (_, ignore) => {
    if (!win) return;
    win.setIgnoreMouseEvents(ignore, { forward: true });
  });

  ipcMain.on('set-input-focused', (_, focused) => {
    if (!win) return;
    inputFocused = focused;
    if (focused) {
      // Lower window so system IME candidate box appears above it
      win.setAlwaysOnTop(true, 'screen-saver');
    } else {
      // Restore high level
      win.setAlwaysOnTop(true, 'pop-up-menu');
    }
  });

  ipcMain.on('quit-app', () => {
    app.quit();
  });

  ipcMain.handle('get-screen-size', () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    return { width, height };
  });

  // 搜索功能 - 使用 DashScope AI 联网搜索
  ipcMain.handle('web-search', async (_, query) => {
    const aiBaseUrl = process.env.VITE_AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    const aiApiKey = process.env.VITE_AI_API_KEY || '';
    const aiModel = process.env.VITE_AI_MODEL || 'qwen3.7-max-preview';

    return new Promise((resolve, reject) => {
      const url = new URL(`${aiBaseUrl}/chat/completions`);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const body = JSON.stringify({
        model: aiModel,
        messages: [
          {
            role: 'system',
            content: '你是一个搜索助手。根据搜索结果，返回结构化的搜索摘要。格式：先给出一段总体概述，然后列出3-5个关键信息点，每个点包含标题和简短描述。'
          },
          { role: 'user', content: `请搜索并总结：${query}` }
        ],
        max_tokens: 1000,
        temperature: 0.3,
        enable_search: true,
      });

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiApiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.error) {
              reject(new Error(result.error.message || JSON.stringify(result.error)));
              return;
            }

            const content = result.choices?.[0]?.message?.content || '';
            // 提取搜索结果中的链接
            const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
            const links = [];
            let match;
            while ((match = linkRegex.exec(content)) !== null) {
              links.push({ title: match[1], url: match[2] });
            }

            resolve({
              success: true,
              results: [{
                title: `搜索: ${query}`,
                snippet: content,
                url: '',
                source: 'DashScope AI Search'
              }],
              extractedLinks: links,
              query,
              aiSummary: content,
            });
          } catch (e) {
            reject(new Error(`Failed to parse search results: ${e.message}`));
          }
        });
      });

      req.on('error', (e) => reject(new Error(`Search request failed: ${e.message}`)));
      req.write(body);
      req.end();
    });
  });

  // URL 摘要 - 读取网页内容并生成摘要
  ipcMain.handle('summarize-url', async (_, urlToSummarize) => {
    const aiBaseUrl = process.env.VITE_AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    const aiApiKey = process.env.VITE_AI_API_KEY || '';
    const aiModel = process.env.VITE_AI_MODEL || 'qwen3.7-max-preview';

    return new Promise((resolve, reject) => {
      const url = new URL(`${aiBaseUrl}/chat/completions`);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const body = JSON.stringify({
        model: aiModel,
        messages: [
          {
            role: 'system',
            content: '你是一个网页摘要助手。阅读用户提供的网页内容，生成结构化摘要。格式：1)一句话概括 2)列出3-5个关键点 3)适合人群或使用场景。回复要简洁有用。'
          },
          { role: 'user', content: `请帮我总结这个网页的核心内容：${urlToSummarize}` }
        ],
        max_tokens: 800,
        temperature: 0.3,
        enable_search: true,
      });

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiApiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.error) {
              reject(new Error(result.error.message || JSON.stringify(result.error)));
              return;
            }

            const summary = result.choices?.[0]?.message?.content || '';
            // 提取链接
            const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
            const links = [];
            let match;
            while ((match = linkRegex.exec(summary)) !== null) {
              links.push({ title: match[1], url: match[2] });
            }

            resolve({
              success: true,
              url: urlToSummarize,
              summary,
              extractedLinks: links,
            });
          } catch (e) {
            reject(new Error(`Failed to parse summary: ${e.message}`));
          }
        });
      });

      req.on('error', (e) => reject(new Error(`URL summary request failed: ${e.message}`)));
      req.write(body);
      req.end();
    });
  });

  // 打开 URL 在默认浏览器
  ipcMain.on('open-url', (_, url) => {
    electron.shell.openExternal(url);
  });

  // 保存文档到 docs 目录
  ipcMain.handle('save-document', async (_, title, content, category) => {
    try {
      const docsDir = path.join(app.getAppPath(), 'docs');
      if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
      }

      const filename = `${category}_${Date.now()}.md`;
      const filepath = path.join(docsDir, filename);
      fs.writeFileSync(filepath, content, 'utf-8');

      return { success: true, filepath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // AI Chat Completions (proxy to avoid CORS)
  ipcMain.handle('ai-chat', async (_, { baseURL, apiKey, model, messages, tools, tool_choice, max_tokens, temperature, enable_search, response_format }) => {
    return new Promise((resolve, reject) => {
      const url = new URL(`${baseURL}/chat/completions`);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const body = JSON.stringify({
        model,
        messages,
        stream: false,
        ...(tools && { tools }),
        ...(tool_choice && { tool_choice }),
        ...(max_tokens && { max_tokens }),
        ...(temperature !== undefined && { temperature }),
        ...(enable_search && { enable_search: true }),
        ...(response_format && { response_format }),
      });

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          fileLog('[ai-chat] status:', res.statusCode, 'body length:', data.length);
          try {
            const result = JSON.parse(data);
            if (result.error) {
              fileLog('[ai-chat] error in response:', JSON.stringify(result.error));
              reject(new Error(result.error.message || JSON.stringify(result.error)));
            } else {
              const msg = result.choices?.[0]?.message;
              if (msg?.tool_calls) {
                for (const tc of msg.tool_calls) {
                  fileLog('[ai-chat] tool_call:', tc.function?.name, 'args:', tc.function?.arguments?.slice(0, 500));
                }
              } else {
                fileLog('[ai-chat] text reply:', (msg?.content || '').slice(0, 200));
              }
              resolve(result);
            }
          } catch (e) {
            fileLog('[ai-chat] parse error, raw data:', data.slice(0, 300));
            reject(new Error(`Failed to parse AI response: ${e.message}`));
          }
        });
      });

      req.on('error', (e) => {
        fileLog('[ai-chat] request error:', e.message);
        reject(new Error(`AI request failed: ${e.message}`));
      });

      req.on('timeout', () => {
        fileLog('[ai-chat] request timed out');
        req.destroy();
        reject(new Error('AI request timed out (60s)'));
      });

      req.write(body);
      req.end();
    });
  });

  // YouTube 搜索
  ipcMain.handle('youtube-search', async (_, query) => {
    return new Promise((resolve, reject) => {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://www.youtube.com/results?search_query=${encodedQuery}`;

      https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            // 提取视频信息
            const videos = [];
            const videoRegex = /"videoId":"([^"]+)".*?"title":\{"runs":\[\{"text":"([^"]+)"\}\].*?"longBylineText":\{"runs":\[\{"text":"([^"]+)"/g;
            let match;

            while ((match = videoRegex.exec(data)) !== null && videos.length < 5) {
              videos.push({
                id: match[1],
                title: match[2],
                channel: match[3],
                url: `https://www.youtube.com/watch?v=${match[1]}`
              });
            }

            // 如果正则没匹配到，尝试另一种格式
            if (videos.length === 0) {
              const altRegex = /"videoId":"([^"]+)"/g;
              while ((match = altRegex.exec(data)) !== null && videos.length < 5) {
                videos.push({
                  id: match[1],
                  title: `YouTube 视频`,
                  channel: '',
                  url: `https://www.youtube.com/watch?v=${match[1]}`
                });
              }
            }

            resolve({
              success: true,
              query,
              videos,
              searchUrl: `https://www.youtube.com/results?search_query=${encodedQuery}`
            });
          } catch (e) {
            reject(new Error(`Failed to parse YouTube results: ${e.message}`));
          }
        });
      }).on('error', (e) => {
        reject(new Error(`YouTube search failed: ${e.message}`));
      });
    });
  });
});

app.on('window-all-closed', () => {
  console.log('[main] window-all-closed');
  if (process.platform !== 'darwin') app.quit();
});
