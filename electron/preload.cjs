const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  setMouseIgnore: (ignore) => ipcRenderer.send('set-mouse-ignore', ignore),
  setInputFocused: (focused) => ipcRenderer.send('set-input-focused', focused),
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
  quitApp: () => ipcRenderer.send('quit-app'),
  // 搜索功能
  webSearch: (query) => ipcRenderer.invoke('web-search', query),
  // URL 摘要
  summarizeUrl: (url) => ipcRenderer.invoke('summarize-url', url),
  // YouTube 搜索
  youtubeSearch: (query) => ipcRenderer.invoke('youtube-search', query),
  // 打开 URL
  openUrl: (url) => ipcRenderer.send('open-url', url),
  // 保存文档
  saveDocument: (title, content, category) => ipcRenderer.invoke('save-document', title, content, category),
  // AI Chat Completions
  aiChat: (params) => ipcRenderer.invoke('ai-chat', params),
});
