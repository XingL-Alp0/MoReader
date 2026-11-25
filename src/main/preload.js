'use strict';

const { contextBridge, ipcRenderer, webUtils } = require('electron');

const listeners = new Set();

function subscribe(channel, callback) {
  const handler = (_event, ...args) => callback(...args);
  ipcRenderer.on(channel, handler);
  const entry = { channel, handler, callback };
  listeners.add(entry);
  return () => {
    ipcRenderer.removeListener(channel, handler);
    listeners.delete(entry);
  };
}

contextBridge.exposeInMainWorld('moread', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  },
  appInfo: () => ipcRenderer.invoke('app:info'),
  plugins: {
    list: () => ipcRenderer.invoke('plugins:list'),
    reload: () => ipcRenderer.invoke('plugins:reload'),
    rendererSource: (id) => ipcRenderer.invoke('plugins:renderer-source', id),
    setEnabled: (id, enabled) => ipcRenderer.invoke('plugins:set-enabled', id, enabled),
    install: (payload) => ipcRenderer.invoke('plugins:install', payload),
    uninstall: (id) => ipcRenderer.invoke('plugins:uninstall', id),
    openFolder: () => ipcRenderer.invoke('plugins:open-folder')
  },
  rendererReady: () => ipcRenderer.invoke('app:renderer-ready'),
  setTitle: (title) => ipcRenderer.invoke('window:set-title', title),
  setWindowIcon: (dataUrl) => ipcRenderer.invoke('window:set-icon', dataUrl),
  closeNow: () => ipcRenderer.invoke('app:close-now'),
  quit: () => ipcRenderer.invoke('app:quit'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  openDialog: () => ipcRenderer.invoke('dialog:open'),
  openImageDialog: () => ipcRenderer.invoke('dialog:open-image'),
  pickFile: (payload) => ipcRenderer.invoke('dialog:pick-file', payload),
  importDocx: (filePath) => ipcRenderer.invoke('docx:import', filePath),
  exportTheme: (payload) => ipcRenderer.invoke('theme:export', payload),
  importTheme: (filePath, packId) => ipcRenderer.invoke('theme:import', filePath, packId),
  removeThemePack: (packId) => ipcRenderer.invoke('theme:remove-pack', packId),
  importThemeCss: (filePath) => ipcRenderer.invoke('theme:import-css', filePath),
  addThemeImage: () => ipcRenderer.invoke('theme:add-image'),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  saveFile: (payload) => ipcRenderer.invoke('file:save', payload),
  statFile: (filePath) => ipcRenderer.invoke('file:stat', filePath),
  revealFile: (filePath) => ipcRenderer.invoke('file:reveal', filePath),
  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return file && file.path ? file.path : '';
    }
  },

  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  openPath: (targetPath) => ipcRenderer.invoke('shell:open-path', targetPath),
  copyText: (text) => ipcRenderer.invoke('clipboard:write', text),
  readClipboard: () => ipcRenderer.invoke('clipboard:read'),

  ensureGuides: () => ipcRenderer.invoke('guides:ensure'),

  pluginsReload: () => ipcRenderer.invoke('plugins:reload'),
  pluginsSetEnabled: (id, enabled) => ipcRenderer.invoke('plugins:set-enabled', id, enabled),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  pushRecent: (filePath) => ipcRenderer.invoke('settings:push-recent', filePath),
  removeRecent: (filePath) => ipcRenderer.invoke('settings:remove-recent', filePath),
  getFavorites: () => ipcRenderer.invoke('favorites:get'),
  addFavorite: (entry) => ipcRenderer.invoke('favorites:add', entry),
  removeFavorite: (filePath) => ipcRenderer.invoke('favorites:remove', filePath),
  pickFavorites: () => ipcRenderer.invoke('favorites:pick'),
  getNotes: () => ipcRenderer.invoke('notes:get'),
  createNote: (entry) => ipcRenderer.invoke('notes:create', entry),
  createNoteFolder: (entry) => ipcRenderer.invoke('notes:create', { ...(entry || {}), type: 'folder' }),
  renameNote: (payload) => ipcRenderer.invoke('notes:rename', payload),
  deleteNote: (id) => ipcRenderer.invoke('notes:remove', id),
  touchNote: (filePath) => ipcRenderer.invoke('notes:touch', filePath),
  revealNote: (id) => ipcRenderer.invoke('notes:reveal', id),
  exportNotesZip: () => ipcRenderer.invoke('notes:export-zip'),
  shareText: (payload) => ipcRenderer.invoke('share:text', payload),

  associationStatus: () => ipcRenderer.invoke('associations:status'),
  registerAssociations: () => ipcRenderer.invoke('associations:register'),
  unregisterAssociations: () => ipcRenderer.invoke('associations:unregister'),
  openDefaultAppsSettings: () => ipcRenderer.invoke('associations:open-settings'),

  exportHtml: (payload) => ipcRenderer.invoke('export:html', payload),
  exportPdf: (payload) => ipcRenderer.invoke('export:pdf', payload),
  exportText: (payload) => ipcRenderer.invoke('export:text', payload),

  onOpenPaths: (callback) => subscribe('app:open-paths', callback),
  onThemePath: (callback) => subscribe('theme:open-path', callback),
  onCloseRequest: (callback) => subscribe('app:close-request', callback)
});
