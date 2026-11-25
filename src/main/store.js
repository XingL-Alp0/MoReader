'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULTS = {
  theme: 'system',
  viewMode: 'split',
  fontSize: 15,
  lineWrap: true,
  syncScroll: true,
  autoSave: false,
  sidebarOpen: true,
  recentCollapsed: false,
  favoritesCollapsed: false,
  notesCollapsed: false,
  outlineCollapsed: false,
  lastDirectory: '',
  recentFiles: [],
  favorites: [],
  noteEntries: [],
  welcomeSeen: false,
  primaryColor: '#c4562d',
  secondaryColor: '#b4873b',
  componentColors: {},
  componentColorsAuto: false,
  themeName: '我的墨阅主题',
  brandIcon: { type: 'preset', value: 'default' },
  stickers: [],
  customButtons: [],
  uiHidden: [],
  customCss: '',
  customCssEnabled: false,
  homeMarkdown: '',
  homeEnabled: false,
  homeBasePath: '',
  themeAssets: {},
  themePacks: [],
  activeThemePack: '',
  disabledPlugins: [],
  trustedButtons: [],
  guidesSeeded: false
};

class Store {
  constructor(userDataDir) {
    this.file = path.join(userDataDir, 'settings.json');
    this.data = { ...DEFAULTS };
    this.load();
  }

  load() {
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        this.data = { ...DEFAULTS, ...parsed };
      }
    } catch {
      // First run, or a corrupt settings file: start from defaults.
    }
    if (!Array.isArray(this.data.recentFiles)) this.data.recentFiles = [];
  }

  get(key) {
    return key ? this.data[key] : { ...this.data };
  }

  set(patch) {
    if (!patch || typeof patch !== 'object') return this.get();
    this.data = { ...this.data, ...patch };
    this.persist();
    return this.get();
  }

  pushRecent(filePath) {
    if (!filePath) return;
    const entry = {
      path: filePath,
      name: path.basename(filePath),
      openedAt: Date.now()
    };
    const recent = this.data.recentFiles.filter((item) => item.path !== filePath);
    recent.unshift(entry);
    this.data.recentFiles = recent.slice(0, 12);
    this.persist();
  }

  removeRecent(filePath) {
    this.data.recentFiles = this.data.recentFiles.filter((item) => item.path !== filePath);
    this.persist();
  }

  persist() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmp, this.file);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }
}

module.exports = { Store, DEFAULTS };
