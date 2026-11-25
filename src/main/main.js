'use strict';

const { app, BrowserWindow, Menu, dialog, ipcMain, nativeTheme, shell, clipboard, screen, nativeImage } = require('electron');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const { Store } = require('./store');
const { PluginManager } = require('./plugins');
const { writeZip, readZip } = require('./zip');
const { docxToMarkdown } = require('./docx');
const associations = require('./associations');

const APP_NAME = '墨阅 MoRead';
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MARKDOWN_EXTS = new Set(['.md', '.markdown', '.mdown', '.mkd', '.mdx', '.txt']);

let mainWindow = null;
let store = null;
let pluginManager = null;
let allowClose = false;
let quitting = false;
let rendererReady = false;
const pendingPaths = [];
const pendingThemePaths = [];

if (process.platform === 'win32') {
  app.setName('MoRead');
  app.setAppUserModelId('com.moread.markdown');
}

/**
 * Allow a separate profile (settings, theme assets, single-instance lock):
 *   MoRead.exe --user-data-dir="D:\profiles\test"
 * Must run before requestSingleInstanceLock(), otherwise the lock still
 * belongs to the default profile.
 */
function applyUserDataOverride() {
  const args = process.argv.slice(1);
  for (let index = 0; index < args.length; index += 1) {
    const raw = args[index];
    if (!raw) continue;
    let value = '';
    if (raw.startsWith('--user-data-dir=')) {
      value = raw.slice('--user-data-dir='.length);
    } else if (raw === '--user-data-dir' && args[index + 1]) {
      value = args[index + 1];
    }
    if (!value) continue;
    app.setPath('userData', path.resolve(value.replace(/^"|"$/g, '')));
    return;
  }
}

applyUserDataOverride();

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const themeTarget = extractThemePath(argv);
    const target = extractFilePath(argv);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      if (themeTarget) routeThemePath(themeTarget);
      else if (target) routePaths([target]);
    }
  });

  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    if (/\.(zip|json|css)$/i.test(filePath)) routeThemePath(filePath);
    else routePaths([filePath]);
  });

  app.whenReady().then(bootstrap);
}

function extractThemePath(argv) {
  const args = argv.slice(1);
  for (let index = 0; index < args.length; index += 1) {
    const raw = args[index];
    if (!raw) continue;
    if (raw.startsWith('--import-theme=')) {
      const value = raw.slice('--import-theme='.length).replace(/^"|"$/g, '');
      if (value) return path.resolve(value);
    }
    if (raw === '--import-theme' && args[index + 1]) {
      return path.resolve(args[index + 1].replace(/^"|"$/g, ''));
    }
  }
  return null;
}

function routeThemePath(themePath) {
  if (!themePath) return;
  if (!rendererReady || !mainWindow || mainWindow.isDestroyed()) {
    pendingThemePaths.push(themePath);
    return;
  }
  mainWindow.webContents.send('theme:open-path', themePath);
}

function extractFilePath(argv) {
  for (const raw of argv.slice(1)) {
    if (!raw || raw.startsWith('-')) continue;
    const candidate = path.resolve(raw);
    try {
      if (!fsSync.statSync(candidate).isFile()) continue;
    } catch {
      continue;
    }
    if (MARKDOWN_EXTS.has(path.extname(candidate).toLowerCase())) return candidate;
  }
  return null;
}

function routePaths(paths) {
  if (!paths || paths.length === 0) return;
  if (!rendererReady || !mainWindow || mainWindow.isDestroyed()) {
    pendingPaths.push(...paths);
    return;
  }
  mainWindow.webContents.send('app:open-paths', paths);
}

function titleBarColors() {
  const dark = nativeTheme.shouldUseDarkColors;
  return dark
    ? { color: '#171512', symbolColor: '#ece5d7', height: 48 }
    : { color: '#f4efe6', symbolColor: '#3d352c', height: 48 };
}

function applyTitleBarTheme() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    mainWindow.setTitleBarOverlay(titleBarColors());
  } catch {
    // Older Windows versions can lack overlay support.
  }
}

function createWindow() {
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  const width = Math.max(940, Math.min(1440, Math.round(workArea.width * 0.94)));
  const height = Math.max(600, Math.min(900, Math.round(workArea.height * 0.92)));

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 940,
    minHeight: 600,
    center: true,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#171512' : '#f4efe6',
    title: APP_NAME,
    icon: app.isPackaged
      ? path.join(process.resourcesPath, 'assets', 'icon.ico')
      : path.join(app.getAppPath(), 'assets', 'icon.ico'),
    titleBarStyle: 'hidden',
    titleBarOverlay: titleBarColors(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (allowClose || quitting) return;
    event.preventDefault();
    mainWindow.webContents.send('app:close-request');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternal(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      if (isSafeExternal(url)) shell.openExternal(url);
    }
  });

  mainWindow.webContents.on('context-menu', (_event, params) => {
    const template = [];
    if (params.linkURL) {
      template.push({
        label: '在浏览器中打开链接',
        click: () => isSafeExternal(params.linkURL) && shell.openExternal(params.linkURL)
      });
      template.push({ type: 'separator' });
    }
    if (params.isEditable) {
      template.push(
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' }
      );
    } else if (params.selectionText) {
      template.push({ role: 'copy', label: '复制' });
    }
    if (template.length > 0) Menu.buildFromTemplate(template).popup({ window: mainWindow });
  });

  nativeTheme.on('updated', applyTitleBarTheme);
}

function isSafeExternal(url) {
  try {
    const parsed = new URL(url);
    return ['https:', 'http:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

async function bootstrap() {
  store = new Store(app.getPath('userData'));
  pluginManager = new PluginManager({ appPath: app.getAppPath(), userData: app.getPath('userData'), store });
  await pluginManager.discover();
  await pluginManager.loadEnabled();
  nativeTheme.themeSource = store.get('theme') || 'system';

  const flags = process.argv.slice(1);
  if (flags.includes('--register-associations')) {
    try {
      const status = await associations.register(app, app.isPackaged);
      console.log(`MoRead file association registered: ${status.command}`);
      app.exit(0);
    } catch (error) {
      console.error('Failed to register file association:', error);
      app.exit(1);
    }
    return;
  }
  if (flags.includes('--unregister-associations')) {
    try {
      await associations.unregister();
      app.exit(0);
    } catch (error) {
      console.error('Failed to unregister file association:', error);
      app.exit(1);
    }
    return;
  }
  if (flags.includes('--open-default-apps')) {
    try {
      await associations.openDefaultAppsSettings(app, app.isPackaged);
      app.exit(0);
    } catch (error) {
      console.error('Failed to open default apps settings:', error);
      app.exit(1);
    }
    return;
  }

  Menu.setApplicationMenu(null);
  registerIpc();
  createWindow();

  const initial = extractFilePath(process.argv);
  if (initial) pendingPaths.push(initial);
  const initialTheme = extractThemePath(process.argv);
  if (initialTheme) pendingThemePaths.push(initialTheme);
}

function registerIpc() {
  const notesRoot = () => path.join(app.getPath('userData'), 'notes');
  const noteFile = (id) => path.join(notesRoot(), `${id}.md`);
  const isNoteFile = (filePath) => {
    const target = path.resolve(String(filePath || ''));
    return target.startsWith(`${notesRoot()}${path.sep}`);
  };
  const cleanNoteName = (value, fallback = '未命名笔记') =>
    String(value || '').trim().slice(0, 120) || fallback;

  async function ensureNotesMigrated() {
    const entries = Array.isArray(store.get('noteEntries')) ? store.get('noteEntries') : [];
    await fs.mkdir(notesRoot(), { recursive: true });
    let changed = false;
    for (const entry of entries) {
      if (!entry || entry.type !== 'note' || entry.path || typeof entry.content !== 'string') continue;
      const target = noteFile(entry.id);
      await fs.writeFile(target, entry.content, 'utf8');
      entry.path = target;
      delete entry.content;
      changed = true;
    }
    if (changed) store.set({ noteEntries: entries });
    return entries;
  }

  function noteDescendantIds(entries, rootId) {
    const ids = new Set([rootId]);
    let added = true;
    while (added) {
      added = false;
      for (const entry of entries) {
        if (entry.parentId && ids.has(entry.parentId) && !ids.has(entry.id)) {
          ids.add(entry.id);
          added = true;
        }
      }
    }
    return ids;
  }

  function noteZipName(entry, entries) {
    const parts = [];
    const seen = new Set();
    let current = entry;
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      const label = current.type === 'folder'
        ? current.name
        : (/\.md$/i.test(current.name) ? current.name : `${current.name}.md`);
      parts.unshift(String(label || '未命名').replace(/[\\/:*?"<>|]+/g, '_'));
      current = entries.find((item) => item.id === current.parentId);
    }
    return parts.join('/') || 'note.md';
  }

  ipcMain.handle('plugins:list', () => pluginManager ? pluginManager.list() : []);
  ipcMain.handle('plugins:renderer-source', async (_event, id) => {
    if (!pluginManager || typeof id !== 'string') return '';
    return pluginManager.rendererSource(id);
  });
  ipcMain.handle('plugins:reload', async () => {
    if (!pluginManager) return [];
    return pluginManager.refresh();
  });
  ipcMain.handle('plugins:set-enabled', async (_event, id, enabled) => {
    if (!pluginManager || typeof id !== 'string' || typeof enabled !== 'boolean') throw new Error('Invalid plugin request');
    return pluginManager.setEnabled(id, enabled);
  });
  ipcMain.handle('plugins:install', async (_event, payload = {}) => {
    if (!pluginManager) throw new Error('插件系统尚未就绪');
    let filePath = typeof payload?.filePath === 'string' ? payload.filePath : '';
    if (!filePath) {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: '安装插件',
        defaultPath: store.get('lastDirectory') || app.getPath('documents'),
        properties: ['openFile'],
        filters: [
          { name: '墨阅插件包', extensions: ['zip'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });
      if (result.canceled || !result.filePaths.length) return { canceled: true };
      filePath = result.filePaths[0];
    }
    const result = await pluginManager.installFromZip(filePath, { overwrite: Boolean(payload?.overwrite) });
    if (result.conflict) return result;
    store.set({ lastDirectory: path.dirname(filePath) });
    await pluginManager.refresh();
    return { ...result, list: pluginManager.list() };
  });
  ipcMain.handle('plugins:uninstall', async (_event, id) => {
    if (!pluginManager || typeof id !== 'string') throw new Error('Invalid plugin request');
    const removed = await pluginManager.uninstall(id);
    await pluginManager.refresh();
    return { removed, list: pluginManager.list() };
  });
  ipcMain.handle('plugins:open-folder', async () => {
    const dir = path.join(app.getPath('userData'), 'plugins');
    await fs.mkdir(dir, { recursive: true });
    const error = await shell.openPath(dir);
    if (error) throw new Error(error);
    return true;
  });

  ipcMain.handle('guides:ensure', async () => {
    if (store.get('welcomeSeen')) return { opened: false, paths: [] };
    const dir = path.join(app.getPath('userData'), 'guides');
    await fs.mkdir(dir, { recursive: true });
    const guides = {
      '使用指南.md': '# 墨阅使用指南\n\n## Markdown 是什么？\n\nMarkdown 是一种轻量级文本标记语言。你可以用简单的符号表达标题、列表、链接、图片、代码和公式，然后由墨阅渲染成易读的页面。\n\n## 快速开始\n\n1. 点击“新建文档”或打开已有 `.md` 文件。\n2. 在编辑区输入 Markdown。\n3. 使用“阅读 / 分栏 / 编辑 / 可视化”切换工作方式。\n4. 使用 Ctrl+S 保存。\n\n## 常用语法\n\n- `# 标题`：标题\n- `- 项目`：无序列表\n- `**文字**`：粗体\n- `*文字*`：斜体\n- `![说明](图片.png)`：图片\n\n更多功能包括 KaTeX 公式、Mermaid 图表、主题工作室、自定义按钮和插件。\n',
      '主题包制作指导.md': '# 主题包制作指导\n\n主题包用于定制墨阅的颜色、字体、主页、贴纸和 CSS。\n\n## 推荐流程\n\n1. 打开“主题工作室”。\n2. 调整主色、辅色和组件颜色。\n3. 在“自定义 CSS”中添加样式。\n4. 需要时设置主页 Markdown、品牌图标和贴纸。\n5. 点击“导出主题”保存主题包。\n\n主题包可以通过“导入主题”重新载入。\n',
      '插件制作指导.md': '# 插件制作指导\n\n插件可以为墨阅增加 Markdown 自定义元素、脚本按钮和扩展功能。\n\n## 插件目录\n\n插件放在应用目录或用户数据目录的 `plugins/<插件 ID>/` 中。\n\n## 最小配置\n\n插件需要 `plugin.json`，包含 id、name、version、author 和 entry 字段。\n\n## 自定义元素\n\n插件可以声明 elements，然后在 Markdown 中使用：\n\n[area width="320px" height="120px" color="#c4562d"]\n\n详细字段、脚本 API、安全限制和完整示例，请参阅同名插件制作指导文档。\n'
    };
    const paths = [];
    for (const [name, content] of Object.entries(guides)) {
      const target = path.join(dir, name);
      await fs.writeFile(target, content, { encoding: 'utf8', flag: 'wx' }).catch(async (error) => {
        if (error.code !== 'EEXIST') throw error;
      });
      paths.push(target);
    }
    store.set({ welcomeSeen: true });
    return { opened: true, paths };
  });
  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    name: APP_NAME,
    platform: process.platform,
    isPackaged: app.isPackaged,
    exePath: process.execPath,
    userData: app.getPath('userData'),
    documents: app.getPath('documents')
  }));

  ipcMain.handle('app:renderer-ready', () => {
    rendererReady = true;
    if (pendingPaths.length) {
      const paths = [...new Set(pendingPaths.splice(0))];
      setTimeout(() => routePaths(paths), 80);
    }
    if (pendingThemePaths.length) {
      const themes = [...new Set(pendingThemePaths.splice(0))];
      setTimeout(() => {
        for (const themePath of themes) routeThemePath(themePath);
      }, 120);
    }
    return true;
  });

  ipcMain.handle('app:close-now', () => {
    allowClose = true;
    if (mainWindow) mainWindow.close();
  });

  ipcMain.handle('app:quit', () => {
    quitting = true;
    app.quit();
  });

  ipcMain.handle('window:set-title', (_event, title) => {
    if (mainWindow) mainWindow.setTitle(title || APP_NAME);
  });

  ipcMain.handle('window:set-icon', (_event, dataUrl) => {
    if (!mainWindow) return false;
    const fallback = app.isPackaged
      ? path.join(process.resourcesPath, 'assets', 'icon.png')
      : path.join(app.getAppPath(), 'assets', 'icon.png');
    try {
      if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
        if (dataUrl.length > 1_500_000) throw new Error('图标文件过大');
        const image = nativeImage.createFromDataURL(dataUrl);
        if (!image.isEmpty()) {
          mainWindow.setIcon(image);
          return true;
        }
      }
      mainWindow.setIcon(fallback);
      return true;
    } catch (error) {
      console.error('Failed to set window icon:', error);
      return false;
    }
  });

  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:toggle-maximize', () => {
    if (!mainWindow) return false;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
    return mainWindow.isMaximized();
  });
  ipcMain.handle('window:is-maximized', () => Boolean(mainWindow?.isMaximized()));

  ipcMain.handle('dialog:open', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '打开 Markdown 文档',
      defaultPath: store.get('lastDirectory') || app.getPath('documents'),
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Markdown 文档', extensions: ['md', 'markdown', 'mdown', 'mkd', 'mdx'] },
        { name: '文本文件', extensions: ['txt'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    if (result.canceled || !result.filePaths.length) return { canceled: true, files: [] };
    store.set({ lastDirectory: path.dirname(result.filePaths[0]) });
    const files = [];
    for (const filePath of result.filePaths) {
      try {
        files.push(await readTextFile(filePath));
      } catch (error) {
        files.push({ path: filePath, error: error.message });
      }
    }
    return { canceled: false, files };
  });

  ipcMain.handle('dialog:open-image', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择图片',
      defaultPath: store.get('lastDirectory') || app.getPath('pictures'),
      properties: ['openFile'],
      filters: [
        { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'] }
      ]
    });
    if (result.canceled || !result.filePaths.length) return { canceled: true };
    store.set({ lastDirectory: path.dirname(result.filePaths[0]) });
    return { canceled: false, path: result.filePaths[0], name: path.basename(result.filePaths[0]) };
  });

  /* Plugin commands pick a file through this, so the extension list comes from a
     plugin: keep it to plain suffixes and never accept a path. */
  ipcMain.handle('dialog:pick-file', async (_event, payload = {}) => {
    const extensions = (Array.isArray(payload.extensions) ? payload.extensions : [])
      .map((value) => String(value || '').trim().replace(/^\./, '').toLowerCase())
      .filter((value) => /^[a-z0-9]{1,10}$/.test(value))
      .slice(0, 8);
    const result = await dialog.showOpenDialog(mainWindow, {
      title: String(payload.title || '选择文件').slice(0, 80),
      defaultPath: store.get('lastDirectory') || app.getPath('documents'),
      properties: ['openFile'],
      filters: extensions.length
        ? [
            { name: extensions.map((extension) => extension.toUpperCase()).join(' / '), extensions },
            { name: '所有文件', extensions: ['*'] }
          ]
        : [{ name: '所有文件', extensions: ['*'] }]
    });
    if (result.canceled || !result.filePaths.length) return { canceled: true };
    const filePath = result.filePaths[0];
    store.set({ lastDirectory: path.dirname(filePath) });
    const stat = await fs.stat(filePath);
    return {
      canceled: false,
      path: filePath,
      name: path.basename(filePath),
      extension: path.extname(filePath).toLowerCase(),
      size: stat.size
    };
  });

  ipcMain.handle('docx:import', async (_event, requestedPath) => {
    if (typeof requestedPath !== 'string' || !requestedPath) throw new Error('缺少文件路径');
    const filePath = path.resolve(requestedPath);
    if (/\.doc$/i.test(filePath)) {
      throw new Error('旧版 .doc 不支持，请在 Word 中另存为 .docx 后再导入');
    }
    if (!/\.(docx|docm)$/i.test(filePath)) throw new Error('只支持 .docx / .docm 文档');
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile()) throw new Error('不是有效文件');
    if (stat.size > 32 * 1024 * 1024) throw new Error('文档超过 32 MB，无法导入');
    const buffer = await fs.readFile(filePath);
    const result = docxToMarkdown(buffer);
    return { ...result, path: filePath, name: path.basename(filePath), size: stat.size };
  });

  ipcMain.handle('theme:export', async (_event, payload) => {
    const json = typeof payload?.json === 'string' ? payload.json : '';
    if (!json) throw new Error('主题内容为空');
    const css = String(payload?.css || '');
    const home = String(payload?.home || '');
    if (css.length > 1_000_000) throw new Error('样式表超过 1 MB，无法导出');
    if (home.length > 1_000_000) throw new Error('主页内容超过 1 MB，无法导出');

    const entries = [{ name: 'theme.json', data: Buffer.from(json, 'utf8') }];
    if (css.trim()) entries.push({ name: 'style.css', data: Buffer.from(css, 'utf8') });
    if (home.trim()) entries.push({ name: 'home.md', data: Buffer.from(home, 'utf8') });

    const assets = Array.isArray(payload?.assets) ? payload.assets : [];
    if (assets.length > 60) throw new Error('主题包图片过多（最多 60 张）');
    let totalBytes = 0;
    for (const asset of assets) {
      const name = sanitizeAssetName(asset?.name);
      const source = typeof asset?.path === 'string' ? asset.path : '';
      if (!name || !source) continue;
      const stat = await fs.stat(source).catch(() => null);
      if (!stat || !stat.isFile()) continue;
      totalBytes += stat.size;
      if (totalBytes > 24 * 1024 * 1024) throw new Error('主题包图片总大小超过 24 MB');
      const data = await fs.readFile(source);
      entries.push({ name: `assets/${name}`, data });
    }

    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出主题包',
      defaultPath: path.join(
        store.get('lastDirectory') || app.getPath('documents'),
        payload?.suggestedName || 'moread-theme.zip'
      ),
      filters: [{ name: '墨阅主题包', extensions: ['zip'] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    const target = result.filePath.toLowerCase().endsWith('.zip')
      ? result.filePath
      : `${result.filePath}.zip`;
    await fs.writeFile(target, writeZip(entries));
    store.set({ lastDirectory: path.dirname(target) });
    return { canceled: false, path: target };
  });

  ipcMain.handle('theme:import', async (_event, requestedPath, requestedPackId) => {
    let filePath = typeof requestedPath === 'string' ? requestedPath : '';
    if (!filePath) {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: '导入主题包',
        defaultPath: store.get('lastDirectory') || app.getPath('documents'),
        properties: ['openFile'],
        filters: [
          { name: '墨阅主题包', extensions: ['zip', 'json'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });
      if (result.canceled || !result.filePaths.length) return { canceled: true };
      filePath = result.filePaths[0];
    }
    const packId =
      typeof requestedPackId === 'string' && /^pack-[0-9a-z-]{4,40}$/.test(requestedPackId)
        ? requestedPackId
        : `pack-${Date.now().toString(36)}`;
    const packed = await readThemePackFile(filePath, packId);
    store.set({ lastDirectory: path.dirname(filePath) });
    return { ...packed, packId };
  });

  ipcMain.handle('theme:remove-pack', async (_event, packId) => {
    if (typeof packId !== 'string' || !/^pack-[0-9a-z-]{4,40}$/.test(packId)) return false;
    const packDir = path.join(app.getPath('userData'), 'theme-assets', 'packs', packId);
    await fs.rm(packDir, { recursive: true, force: true }).catch(() => {});
    return true;
  });

  ipcMain.handle('theme:import-css', async (_event, requestedPath) => {
    let filePath = typeof requestedPath === 'string' ? requestedPath : '';
    if (!filePath) {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: '导入 CSS 样式表',
        defaultPath: store.get('lastDirectory') || app.getPath('documents'),
        properties: ['openFile'],
        filters: [{ name: 'CSS 样式表', extensions: ['css'] }]
      });
      if (result.canceled || !result.filePaths.length) return { canceled: true };
      filePath = result.filePaths[0];
    }
    const stat = await fs.stat(filePath);
    if (stat.size > 1_000_000) throw new Error('CSS 文件超过 1 MB');
    const css = await fs.readFile(filePath, 'utf8');
    store.set({ lastDirectory: path.dirname(filePath) });
    return { canceled: false, path: filePath, name: path.basename(filePath), css };
  });

  ipcMain.handle('theme:add-image', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '添加主页图片',
      defaultPath: store.get('lastDirectory') || app.getPath('pictures'),
      properties: ['openFile'],
      filters: [
        { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }
      ]
    });
    if (result.canceled || !result.filePaths.length) return { canceled: true };
    const source = result.filePaths[0];
    const stat = await fs.stat(source);
    if (stat.size > 8 * 1024 * 1024) throw new Error('图片超过 8 MB');
    const original = path.basename(source).replace(/[^\w.\-\u4e00-\u9fa5]/g, '-');
    const name = `home-${Date.now()}-${original}`;
    const dir = path.join(app.getPath('userData'), 'theme-assets', 'home');
    await fs.mkdir(dir, { recursive: true });
    const target = path.join(dir, name);
    await fs.writeFile(target, await fs.readFile(source));
    store.set({ lastDirectory: path.dirname(source) });
    return {
      canceled: false,
      path: target,
      url: pathToFileURL(target).href,
      name: `assets/${name}`
    };
  });

  ipcMain.handle('file:read', async (_event, filePath) => {
    const file = await readTextFile(filePath);
    if (!isNoteFile(file.path)) {
      store.pushRecent(file.path);
      app.addRecentDocument(file.path);
    }
    return file;
  });

  ipcMain.handle('file:save', async (_event, payload) => {
    const { content = '', eol = '\n', saveAs = false } = payload || {};
    let target = payload?.path || '';
    if (!target || saveAs) {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: saveAs ? '另存为' : '保存 Markdown 文档',
        defaultPath: target || path.join(store.get('lastDirectory') || app.getPath('documents'), payload?.suggestedName || '未命名.md'),
        filters: [
          { name: 'Markdown 文档', extensions: ['md'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });
      if (result.canceled || !result.filePath) return { canceled: true };
      target = result.filePath;
      if (!path.extname(target)) target += '.md';
    }
    const output = eol === '\r\n' ? content.replace(/\r?\n/g, '\r\n') : content;
    await fs.writeFile(target, output, 'utf8');
    if (!isNoteFile(target)) {
      store.set({ lastDirectory: path.dirname(target) });
      store.pushRecent(target);
      app.addRecentDocument(target);
    }
    const stat = await fs.stat(target);
    return {
      canceled: false,
      path: target,
      name: path.basename(target),
      eol,
      encoding: 'UTF-8',
      mtimeMs: stat.mtimeMs,
      size: stat.size
    };
  });

  ipcMain.handle('file:stat', async (_event, filePath) => {
    try {
      const stat = await fs.stat(filePath);
      return { exists: true, mtimeMs: stat.mtimeMs, size: stat.size };
    } catch {
      return { exists: false };
    }
  });

  ipcMain.handle('file:reveal', (_event, filePath) => {
    if (filePath) shell.showItemInFolder(filePath);
  });

  ipcMain.handle('shell:open-external', async (_event, url) => {
    if (!isSafeExternal(url)) throw new Error('不支持的链接协议');
    await shell.openExternal(url);
  });

  ipcMain.handle('shell:open-path', async (_event, targetPath) => {
    if (!targetPath) return;
    const resolved = path.resolve(targetPath);
    if (fsSync.existsSync(resolved)) shell.openPath(resolved);
  });

  ipcMain.handle('clipboard:write', (_event, text) => {
    clipboard.writeText(String(text ?? ''));
    return true;
  });

  ipcMain.handle('clipboard:read', () => clipboard.readText());

  ipcMain.handle('settings:get', () => store.get());
  ipcMain.handle('settings:set', (_event, patch) => {
    const next = store.set(patch);
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'theme')) {
      nativeTheme.themeSource = patch.theme;
      applyTitleBarTheme();
    }
    return next;
  });
  ipcMain.handle('settings:push-recent', (_event, filePath) => {
    store.pushRecent(filePath);
    return store.get('recentFiles');
  });
  ipcMain.handle('settings:remove-recent', (_event, filePath) => {
    store.removeRecent(filePath);
    return store.get('recentFiles');
  });

  ipcMain.handle('favorites:get', () => store.get('favorites') || []);
  ipcMain.handle('favorites:add', (_event, entry) => {
    const item = { path: String(entry?.path || ''), name: String(entry?.name || path.basename(entry?.path || '')), addedAt: Date.now() };
    if (!item.path) return store.get('favorites') || [];
    const next = (store.get('favorites') || []).filter((x) => x.path !== item.path);
    next.unshift(item);
    return store.set({ favorites: next.slice(0, 100) }).favorites;
  });
  ipcMain.handle('favorites:remove', (_event, filePath) => {
    const next = (store.get('favorites') || []).filter((x) => x.path !== filePath);
    return store.set({ favorites: next }).favorites;
  });
  ipcMain.handle('favorites:pick', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '收藏文件路径',
      defaultPath: store.get('lastDirectory') || app.getPath('documents'),
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Markdown 文档', extensions: ['md', 'markdown', 'mdown', 'mkd', 'mdx'] },
        { name: '文本文件', extensions: ['txt'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    if (result.canceled || !result.filePaths.length) return [];
    store.set({ lastDirectory: path.dirname(result.filePaths[0]) });
    return result.filePaths.map((filePath) => ({
      path: filePath,
      name: path.basename(filePath)
    }));
  });
  ipcMain.handle('notes:get', async () => ensureNotesMigrated());
  ipcMain.handle('notes:create', async (_event, input) => {
    const entries = await ensureNotesMigrated();
    const type = input?.type === 'folder' ? 'folder' : 'note';
    const requestedName = cleanNoteName(input?.name, type === 'folder' ? '新建文件夹' : '未命名笔记');
    const parentId = input?.parentId ? String(input.parentId) : null;
    let name = requestedName;
    let suffix = 2;
    while (entries.some((item) => (item.parentId || null) === parentId && item.name === name)) {
      name = `${requestedName} ${suffix}`;
      suffix += 1;
    }
    const id = crypto.randomUUID();
    const now = Date.now();
    const entry = {
      id,
      type,
      name,
      parentId,
      createdAt: now,
      updatedAt: now
    };
    if (type === 'note') {
      const target = noteFile(id);
      await fs.writeFile(target, String(input?.content ?? `# ${name}\n\n`), 'utf8');
      entry.path = target;
    }
    entries.push(entry);
    store.set({ noteEntries: entries });
    return entry;
  });
  ipcMain.handle('notes:rename', async (_event, payload) => {
    const entries = await ensureNotesMigrated();
    const entry = entries.find((item) => item.id === payload?.id);
    if (!entry) throw new Error('笔记不存在');
    entry.name = cleanNoteName(payload?.name, entry.type === 'folder' ? '新建文件夹' : '未命名笔记');
    entry.updatedAt = Date.now();
    store.set({ noteEntries: entries });
    return entry;
  });
  ipcMain.handle('notes:remove', async (_event, id) => {
    const entries = await ensureNotesMigrated();
    const ids = noteDescendantIds(entries, String(id || ''));
    for (const entry of entries) {
      if (entry.type === 'note' && ids.has(entry.id) && entry.path) {
        await fs.rm(entry.path, { force: true }).catch(() => {});
      }
    }
    const next = entries.filter((entry) => !ids.has(entry.id));
    store.set({ noteEntries: next });
    return next;
  });
  ipcMain.handle('notes:touch', async (_event, filePath) => {
    const entries = await ensureNotesMigrated();
    const entry = entries.find((item) => item.type === 'note' && item.path === filePath);
    if (!entry) return false;
    entry.updatedAt = Date.now();
    store.set({ noteEntries: entries });
    return true;
  });
  ipcMain.handle('notes:reveal', async (_event, id) => {
    const entries = await ensureNotesMigrated();
    const entry = entries.find((item) => item.id === id);
    if (entry?.path) shell.showItemInFolder(entry.path);
    return Boolean(entry?.path);
  });
  ipcMain.handle('notes:export-zip', async () => {
    const entries = await ensureNotesMigrated();
    const notes = entries.filter((entry) => entry.type === 'note');
    const used = new Set();
    const files = [];
    for (const entry of notes) {
      let name = noteZipName(entry, entries);
      let suffix = 2;
      while (used.has(name)) {
        name = name.replace(/(\.md)?$/i, `-${suffix}$1`);
        suffix += 1;
      }
      used.add(name);
      let content = '';
      try {
        content = await fs.readFile(entry.path, 'utf8');
      } catch {
        content = '';
      }
      files.push({ name, data: Buffer.from(content, 'utf8') });
    }
    const result = await dialog.showSaveDialog(mainWindow, { title: '导出笔记夹', defaultPath: path.join(store.get('lastDirectory') || app.getPath('documents'), 'notes.zip'), filters: [{ name: 'ZIP 压缩包', extensions: ['zip'] }] });
    if (result.canceled || !result.filePath) return { canceled: true };
    await fs.writeFile(result.filePath, writeZip(files));
    return { canceled: false, path: result.filePath, count: files.length };
  });
  ipcMain.handle('share:text', async (_event, payload) => {
    const text = String(payload?.text || '');
    clipboard.writeText(text);
    return { copied: true, title: String(payload?.title || '') };
  });


  ipcMain.handle('associations:status', async () => associations.getStatus(app, app.isPackaged));
  ipcMain.handle('associations:register', async () => {
    const status = await associations.register(app, app.isPackaged);
    return status;
  });
  ipcMain.handle('associations:unregister', () => associations.unregister());
  ipcMain.handle('associations:open-settings', () =>
    associations.openDefaultAppsSettings(app, app.isPackaged)
  );

  ipcMain.handle('export:html', async (_event, payload) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出 HTML',
      defaultPath: path.join(
        store.get('lastDirectory') || app.getPath('documents'),
        payload?.suggestedName || 'document.html'
      ),
      filters: [{ name: 'HTML 文件', extensions: ['html'] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    await fs.writeFile(result.filePath, payload.html, 'utf8');
    return { canceled: false, path: result.filePath };
  });

  ipcMain.handle('export:pdf', async (_event, payload) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出 PDF',
      defaultPath: path.join(
        store.get('lastDirectory') || app.getPath('documents'),
        payload?.suggestedName || 'document.pdf'
      ),
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    const data = await mainWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      preferCSSPageSize: true,
      margins: { top: 0.55, bottom: 0.55, left: 0.5, right: 0.5 }
    });
    await fs.writeFile(result.filePath, data);
    return { canceled: false, path: result.filePath };
  });

  ipcMain.handle('export:text', async (_event, payload) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出纯文本',
      defaultPath: path.join(
        store.get('lastDirectory') || app.getPath('documents'),
        payload?.suggestedName || 'document.txt'
      ),
      filters: [{ name: '文本文件', extensions: ['txt'] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    await fs.writeFile(result.filePath, payload.text || '', 'utf8');
    return { canceled: false, path: result.filePath };
  });
}

function sanitizeAssetName(value) {
  const raw = String(value || '')
    .trim()
    .replace(/\\/g, '/');
  if (!raw || raw.includes('/')) return '';
  if (raw === '.' || raw === '..' || raw.startsWith('.')) return '';
  if (!/^[A-Za-z0-9._\-\u4e00-\u9fa5]+$/.test(raw)) return '';
  return raw;
}

async function readThemePackFile(filePath, packId = 'pack-legacy') {
  const stat = await fs.stat(filePath);
  if (!stat.isFile()) throw new Error('不是有效文件');
  if (stat.size > 32 * 1024 * 1024) throw new Error('主题包超过 32 MB');
  const buffer = await fs.readFile(filePath);

  const isZip =
    path.extname(filePath).toLowerCase() === '.zip' ||
    (buffer.length > 4 && buffer.readUInt32LE(0) === 0x04034b50);
  if (!isZip) {
    return { canceled: false, legacy: true, path: filePath, json: buffer.toString('utf8') };
  }

  const entries = readZip(buffer);
  const readEntry = (name) => {
    const entry = entries.find((item) => item.name === name);
    return entry ? entry.data.toString('utf8') : '';
  };
  const json = readEntry('theme.json');
  if (!json.trim()) throw new Error('主题包里缺少 theme.json');

  const packDir = path.join(app.getPath('userData'), 'theme-assets', 'packs', packId);
  await fs.rm(packDir, { recursive: true, force: true }).catch(() => {});
  await fs.mkdir(path.join(packDir, 'assets'), { recursive: true });
  const assets = [];
  for (const entry of entries) {
    if (!entry.name.startsWith('assets/')) continue;
    const name = sanitizeAssetName(entry.name.slice('assets/'.length));
    if (!name) continue;
    const target = path.join(packDir, 'assets', name);
    await fs.writeFile(target, entry.data);
    assets.push({ name: `assets/${name}`, path: target, url: pathToFileURL(target).href });
  }

  return {
    canceled: false,
    legacy: false,
    path: filePath,
    packDir,
    json,
    css: readEntry('style.css'),
    home: readEntry('home.md'),
    assets
  };
}

async function readTextFile(filePath) {
  const resolved = path.resolve(filePath);
  const stat = await fs.stat(resolved);
  if (!stat.isFile()) throw new Error('不是有效文件');
  if (stat.size > MAX_FILE_BYTES) throw new Error('文件超过 25 MB，无法在墨阅中打开');

  const buffer = await fs.readFile(resolved);
  let encoding = 'UTF-8';
  let text = '';
  let eol = '\n';

  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    text = buffer.subarray(3).toString('utf8');
  } else if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    encoding = 'UTF-16 LE';
    text = buffer.subarray(2).toString('utf16le');
  } else if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    encoding = 'UTF-16 BE';
    const swapped = Buffer.from(buffer.subarray(2));
    swapped.swap16();
    text = swapped.toString('utf16le');
  } else {
    if (buffer.subarray(0, 8192).includes(0)) throw new Error('这看起来是二进制文件');
    text = buffer.toString('utf8');
    if (text.includes('\uFFFD')) encoding = 'UTF-8 (含无法识别字符)';
  }

  if (text.includes('\r\n')) eol = '\r\n';
  text = text.replace(/\r\n?/g, '\n');

  return {
    path: resolved,
    name: path.basename(resolved),
    content: text,
    encoding,
    eol,
    mtimeMs: stat.mtimeMs,
    size: stat.size,
    extension: path.extname(resolved).toLowerCase()
  };
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  quitting = true;
});
