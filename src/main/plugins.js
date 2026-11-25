'use strict';

const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { readZip } = require('./zip');

const {
  ID_RE,
  MAX_MANIFEST_BYTES,
  MAX_ENTRY_BYTES,
  MAX_RESOURCE_BYTES,
  MAX_ICON_BYTES,
  MAX_ZIP_BYTES,
  parseJson,
  normalizeManifest
} = require('../shared/plugin-manifest');

function safeResolve(root, target) {
  const resolved = path.resolve(root, target);
  const rel = path.relative(root, resolved);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? resolved : null;
}

function isInside(root, target) {
  const rel = path.relative(root, target);
  return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function stampSource(manifest, source) {
  return Object.freeze({ ...manifest, source });
}

class PluginManager {
  constructor({ appPath, userData, store, logger = console }) {
    this.appPath = appPath;
    this.userData = userData;
    this.store = store;
    this.logger = logger;
    this.plugins = new Map();
    this.loaded = new Map();
    this.errors = new Map();
  }

  get appRoot() {
    return path.join(this.appPath, 'plugins');
  }

  get userRoot() {
    return path.join(this.userData, 'plugins');
  }

  get roots() {
    return [
      { dir: this.appRoot, source: 'app' },
      { dir: this.userRoot, source: 'user' }
    ];
  }

  async discover() {
    const found = new Map();
    for (const root of this.roots) {
      let entries = [];
      try {
        entries = await fs.readdir(root.dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const item of entries) {
        if (!item.isDirectory() || !ID_RE.test(item.name)) continue;
        const dir = safeResolve(root.dir, item.name);
        try {
          const file = safeResolve(dir, 'plugin.json');
          const stat = await fs.stat(file);
          if (stat.size > MAX_MANIFEST_BYTES) throw new Error('manifest too large');
          const raw = await fs.readFile(file, 'utf8');
          const manifest = stampSource(normalizeManifest(parseJson(raw), dir), root.source);
          if (!safeResolve(dir, manifest.entry)) throw new Error('entry outside plugin directory');
          // User plugins override bundled plugins with the same id.
          found.set(manifest.id, manifest);
        } catch (error) {
          this.logger.warn(`[plugins] skipped ${item.name}: ${error.message}`);
        }
      }
    }
    this.plugins = found;
    return this.list();
  }

  list() {
    return [...this.plugins.values()].map((manifest) => ({
      ...manifest,
      enabled: this.isEnabled(manifest.id),
      loaded: this.loaded.has(manifest.id),
      error: this.errors.get(manifest.id) || '',
      // Renderer needs real URLs; the relative paths are main-process details.
      resources: this.resourceUrls(manifest),
      iconUrl: this.iconUrl(manifest),
      iconType: manifest.iconFile ? path.extname(manifest.iconFile).slice(1).toLowerCase() : ''
    }));
  }

  /**
   * Resolve the plugin's icon file to a file URL. Only files inside the plugin
   * directory and within the size limit are exposed.
   */
  iconUrl(manifest) {
    const rel = manifest.iconFile;
    if (!rel) return '';
    try {
      const root = fsSync.realpathSync(manifest.dir);
      const target = fsSync.realpathSync(path.join(root, rel));
      const inside = path.relative(root, target);
      if (!inside || inside.startsWith('..') || path.isAbsolute(inside)) return '';
      const stat = fsSync.statSync(target);
      if (!stat.isFile() || stat.size > MAX_ICON_BYTES) return '';
      return pathToFileURL(target).href;
    } catch {
      return '';
    }
  }

  /**
   * Resolve declared resources to file URLs inside the plugin directory.
   * Missing, oversized or symlinked-elsewhere files are simply omitted.
   */
  resourceUrls(manifest) {
    const urls = {};
    let root = '';
    try {
      root = fsSync.realpathSync(manifest.dir);
    } catch {
      return urls;
    }
    for (const [key, rel] of Object.entries(manifest.resources || {})) {
      try {
        const target = fsSync.realpathSync(path.join(manifest.dir, rel));
        const inside = path.relative(root, target);
        if (!inside || inside.startsWith('..') || path.isAbsolute(inside)) continue;
        const stat = fsSync.statSync(target);
        if (!stat.isFile() || stat.size > MAX_RESOURCE_BYTES) continue;
        urls[key] = pathToFileURL(target).href;
      } catch {
        // Undeclared or missing: leave the key out so the template renders empty.
      }
    }
    return urls;
  }

  isEnabled(id) {
    const disabled = this.store?.get('disabledPlugins') || [];
    return !Array.isArray(disabled) || !disabled.includes(id);
  }

  async setEnabled(id, enabled) {
    if (!this.plugins.has(id)) throw new Error('Unknown plugin');
    const disabled = new Set(this.store?.get('disabledPlugins') || []);
    if (enabled) disabled.delete(id); else disabled.add(id);
    this.store?.set({ disabledPlugins: [...disabled] });
    if (enabled) {
      try {
        await this.load(id);
      } catch {
        // The error stays on the manifest; the settings list surfaces it.
      }
    } else {
      await this.unload(id);
      this.errors.delete(id);
    }
    return this.list();
  }

  async load(id) {
    const manifest = this.plugins.get(id);
    if (!manifest || !this.isEnabled(id)) return false;
    if (this.loaded.has(id)) return true;
    try {
      const entry = safeResolve(manifest.dir, manifest.entry);
      const stat = entry ? fsSync.statSync(entry, { throwIfNoEntry: false }) : null;
      if (!stat?.isFile()) throw new Error('Plugin entry missing');
      const source = await fs.readFile(entry, 'utf8');
      if (source.length > MAX_ENTRY_BYTES) throw new Error('Plugin entry too large');
      const manager = this;
      const api = Object.freeze({
        id: manifest.id,
        metadata: manifest,
        log: (...args) => manager.logger.log(`[plugin:${id}]`, ...args),
        on: () => { throw new Error('Plugin event API unavailable'); }
      });
      const module = { exports: {} };
      const localRequire = (request) => {
        if (request.startsWith('.') || request.startsWith('/')) {
          const target = safeResolve(manifest.dir, request);
          if (!target || !target.startsWith(manifest.dir)) throw new Error('Blocked plugin import');
          return require(target);
        }
        throw new Error(`Blocked dependency: ${request}`);
      };
      const sandbox = { module, exports: module.exports, require: localRequire, __filename: entry, __dirname: manifest.dir, plugin: api, console: { log: api.log, warn: api.log, error: api.log } };
      vm.runInNewContext(`(function(module,exports,require,__filename,__dirname,plugin){${source}\n})`, sandbox, { filename: entry, timeout: 1000 })(module, module.exports, localRequire, entry, manifest.dir, api);
      const instance = module.exports && typeof module.exports.activate === 'function' ? await module.exports.activate(api) : module.exports;
      this.loaded.set(id, { instance, dispose: module.exports?.deactivate });
      this.errors.delete(id);
      return true;
    } catch (error) {
      this.errors.set(id, String(error?.message || error));
      throw error;
    }
  }

  async unload(id) {
    const loaded = this.loaded.get(id);
    if (!loaded) return false;
    try {
      if (typeof loaded.dispose === 'function') await loaded.dispose();
    } catch (error) {
      this.logger.warn(`[plugins] unload ${id}: ${error.message}`);
    }
    this.loaded.delete(id);
    return true;
  }

  async loadEnabled() {
    for (const manifest of this.plugins.values()) {
      if (!this.isEnabled(manifest.id)) continue;
      try {
        await this.load(manifest.id);
      } catch (error) {
        this.logger.warn(`[plugins] failed to load ${manifest.id}: ${error.message}`);
      }
    }
  }

  /**
   * Unload everything, rescan both plugin roots and load enabled plugins again.
   * This is what "重新扫描插件" calls, so edited entry scripts really do reload.
   */
  async refresh() {
    for (const id of [...this.loaded.keys()]) {
      await this.unload(id).catch(() => {});
    }
    this.errors.clear();
    await this.discover();
    await this.loadEnabled();
    return this.list();
  }

  /**
   * Install a plugin from a .zip. The archive must contain exactly one
   * `plugin.json` at its root or inside a single top-level folder.
   */
  async installFromZip(zipPath, { overwrite = false } = {}) {
    const stat = await fs.stat(zipPath);
    if (!stat.isFile()) throw new Error('插件包不是文件');
    if (stat.size > MAX_ZIP_BYTES) throw new Error('插件包超过 32 MB');
    const entries = readZip(await fs.readFile(zipPath));
    const manifests = entries.filter((entry) => entry.name === 'plugin.json' || /^[^/]+\/plugin\.json$/.test(entry.name));
    if (manifests.length !== 1) throw new Error('插件包必须包含且只包含一个 plugin.json');
    const manifestName = manifests[0].name;
    const prefix = manifestName.slice(0, manifestName.length - 'plugin.json'.length);
    const rawText = manifests[0].data.toString('utf8');
    if (Buffer.byteLength(rawText, 'utf8') > MAX_MANIFEST_BYTES) throw new Error('plugin.json 过大');
    const raw = parseJson(rawText);
    const manifest = normalizeManifest(raw, zipPath);
    if (!manifest.iconFile) {
      throw new Error('插件缺少图标文件：请在 plugin.json 中用 icon 指向 assets/icon.svg（支持 SVG / PNG / JPEG / WebP）');
    }
    const iconEntryName = `${prefix}${manifest.iconFile}`.replace(/\\/g, '/');
    const iconEntry = entries.find((entry) => entry.name === iconEntryName);
    if (!iconEntry) {
      throw new Error(`插件图标文件不存在：${manifest.iconFile}`);
    }
    if (iconEntry.data.length > MAX_ICON_BYTES) {
      throw new Error(`插件图标文件超过 512 KB：${manifest.iconFile}`);
    }
    const dest = path.join(this.userRoot, manifest.id);
    if (!safeResolve(this.userRoot, manifest.id)) throw new Error('Invalid plugin id');

    if (fsSync.existsSync(dest) && !overwrite) {
      let existingVersion = '';
      try {
        const existing = JSON.parse(await fs.readFile(path.join(dest, 'plugin.json'), 'utf8'));
        existingVersion = String(existing.version || '');
      } catch {
        // Keep going with an empty version label.
      }
      return { conflict: true, filePath: zipPath, id: manifest.id, existing: existingVersion };
    }

    const shadowed = this.plugins.get(manifest.id)?.source === 'app';
    const staging = path.join(this.userRoot, `.staging-${manifest.id}-${crypto.randomBytes(4).toString('hex')}`);
    await fs.mkdir(staging, { recursive: true });
    let moved = false;
    try {
      for (const entry of entries) {
        if (!entry.name.startsWith(prefix)) continue;
        const rel = entry.name.slice(prefix.length);
        if (!rel || rel.endsWith('/')) continue;
        const segments = rel.split('/');
        if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
          throw new Error(`插件包含非法路径：${entry.name}`);
        }
        const target = safeResolve(staging, rel);
        if (!target) throw new Error(`插件包含非法路径：${entry.name}`);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, entry.data);
      }
      const entryFile = safeResolve(staging, manifest.entry);
      if (!entryFile || !fsSync.statSync(entryFile, { throwIfNoEntry: false })?.isFile()) {
        throw new Error(`插件缺少入口文件 ${manifest.entry}`);
      }
      const backup = fsSync.existsSync(dest) ? `${dest}.old-${Date.now().toString(36)}` : '';
      if (backup) await fs.rename(dest, backup);
      try {
        await fs.rename(staging, dest);
        moved = true;
      } catch (error) {
        if (backup) await fs.rename(backup, dest).catch(() => {});
        throw error;
      }
      if (backup) await fs.rm(backup, { recursive: true, force: true });
    } finally {
      if (!moved) await fs.rm(staging, { recursive: true, force: true }).catch(() => {});
    }

    const disabled = new Set(this.store?.get('disabledPlugins') || []);
    if (disabled.delete(manifest.id)) this.store?.set({ disabledPlugins: [...disabled] });
    return {
      installed: true,
      filePath: zipPath,
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      shadowed
    };
  }

  async uninstall(id) {
    const manifest = this.plugins.get(id);
    if (!manifest) throw new Error('Unknown plugin');
    if (manifest.source !== 'user' || !isInside(this.userRoot, manifest.dir)) {
      throw new Error('内置插件不能卸载');
    }
    await this.unload(id);
    await fs.rm(manifest.dir, { recursive: true, force: true });
    this.plugins.delete(id);
    this.errors.delete(id);
    const disabled = new Set(this.store?.get('disabledPlugins') || []);
    if (disabled.delete(id)) this.store?.set({ disabledPlugins: [...disabled] });
    return true;
  }
}

module.exports = { PluginManager, normalizeManifest, ID_RE };