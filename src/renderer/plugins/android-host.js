/**
 * Android plugin host.
 *
 * Desktop plugins run in the Electron main process (fs + vm + readZip). Android
 * has no Node, so the same lifecycle is implemented in the renderer on top of
 * the Capacitor `MoReadFiles` bridge:
 *
 *   files/plugins/index.json          → installed plugin list (ordered)
 *   files/plugins/<id>/plugin.json    → manifest
 *   files/plugins/<id>/<entry>        → entry script, executed with new Function
 *   files/plugins/<id>/assets/*       → icons and `{resource:key}` files
 *
 * There is no sandbox on either platform: enabling a plugin means running local
 * code, and the user is responsible for trusting what they install.
 */

import { strFromU8, unzipSync } from "fflate";
import manifestRules from "../../shared/plugin-manifest.js";

const {
  ID_RE,
  MAX_MANIFEST_BYTES,
  MAX_ENTRY_BYTES,
  MAX_RENDERER_BYTES,
  MAX_RESOURCE_BYTES,
  MAX_ICON_BYTES,
  MAX_ZIP_BYTES,
  MAX_ZIP_ENTRIES,
  MAX_ZIP_TOTAL_BYTES,
  parseJson,
  isSafeRelativePath,
  normalizeManifest
} = manifestRules;

const ROOT = "plugins";
const INDEX_PATH = `${ROOT}/index.json`;
const DISABLED_KEY = "disabledPlugins";

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

const BASE64_LOOKUP = (() => {
  const table = new Uint8Array(256).fill(255);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (let index = 0; index < chars.length; index += 1) table[chars.charCodeAt(index)] = index;
  table["-".charCodeAt(0)] = 62;
  table["_".charCodeAt(0)] = 63;
  return table;
})();

function base64ToBytes(value) {
  const text = String(value || "");
  let padding = 0;
  if (text.endsWith("==")) padding = 2;
  else if (text.endsWith("=")) padding = 1;
  const expected = Math.max(0, Math.floor((text.length * 3) / 4) - padding);
  const bytes = new Uint8Array(expected);
  let written = 0;
  let buffer = 0;
  let bits = 0;
  for (let index = 0; index < text.length; index += 1) {
    const digit = BASE64_LOOKUP[text.charCodeAt(index)];
    if (digit === 255) continue;
    buffer = (buffer << 6) | digit;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[written] = (buffer >> bits) & 0xff;
      written += 1;
    }
  }
  return written === bytes.length ? bytes : bytes.subarray(0, written);
}

function extensionOf(value) {
  const match = /\.([A-Za-z0-9]+)$/.exec(String(value || ""));
  return match ? match[1].toLowerCase() : "";
}

function isCancel(error) {
  return /cancel|取消|abort/i.test(String(error?.message || error || ""));
}

/**
 * @param {object} options
 * @param {() => object|null} options.getBridge  Capacitor MoReadFiles plugin getter
 * @param {(uri: string) => string} options.convertFileSrc
 * @param {() => object} options.readSettings
 * @param {(patch: object) => object} options.updateSettings
 * @param {(rel: string, bytes: Uint8Array) => void} [options.onFileWrite] test hook
 */
export function createAndroidPluginHost({
  getBridge,
  convertFileSrc,
  readSettings,
  updateSettings,
  log = console.log
}) {
  const plugins = new Map();
  const loaded = new Map();
  const errors = new Map();
  let indexEntries = [];
  let readyPromise = null;

  function bridge() {
    const instance = getBridge?.();
    if (!instance) throw new Error("Android 文件插件不可用");
    return instance;
  }

  function settings() {
    try {
      const value = readSettings?.();
      return value && typeof value === "object" ? value : {};
    } catch {
      return {};
    }
  }

  function isEnabled(id) {
    const disabled = settings()[DISABLED_KEY];
    return !Array.isArray(disabled) || !disabled.includes(id);
  }

  function setDisabled(id, disabled) {
    const current = settings();
    const list = new Set(Array.isArray(current[DISABLED_KEY]) ? current[DISABLED_KEY] : []);
    if (disabled) list.add(id);
    else list.delete(id);
    updateSettings?.({ [DISABLED_KEY]: [...list] });
  }

  async function appUri(rel) {
    const result = await bridge().appFileUri({ path: rel });
    return result?.uri || "";
  }

  async function readText(rel) {
    const uri = await appUri(rel);
    if (!uri) throw new Error(`找不到文件：${rel}`);
    const result = await bridge().read({ uri });
    return String(result?.text ?? "");
  }

  async function writeFile(rel, bytes) {
    await bridge().writeAppFile({ path: rel, base64: bytesToBase64(bytes) });
  }

  function fileUrl(uri) {
    return uri ? String(convertFileSrc ? convertFileSrc(uri) : uri) : "";
  }

  async function readIndex() {
    try {
      const text = await readText(INDEX_PATH);
      if (!text.trim()) return [];
      const parsed = JSON.parse(text);
      return Array.isArray(parsed)
        ? parsed.filter((item) => item && ID_RE.test(String(item.id || "")))
        : [];
    } catch {
      return [];
    }
  }

  async function writeIndex(entries) {
    indexEntries = entries;
    await bridge().writeAppFile({ path: INDEX_PATH, text: JSON.stringify(entries, null, 2) });
  }

  async function discover() {
    const entries = await readIndex();
    const found = new Map();
    const kept = [];
    for (const entry of entries) {
      try {
        const raw = parseJson(await readText(`${ROOT}/${entry.id}/plugin.json`));
        const manifest = normalizeManifest(raw, `${ROOT}/${entry.id}`);
        found.set(manifest.id, Object.freeze({ ...manifest, source: "user" }));
        kept.push({
          id: manifest.id,
          name: manifest.name,
          version: manifest.version,
          installedAt: Number(entry.installedAt) || Date.now()
        });
      } catch (error) {
        errors.set(String(entry.id), String(error?.message || error));
        log(`[plugins] skipped ${entry.id}: ${error?.message || error}`);
      }
    }
    plugins.clear();
    for (const [id, manifest] of found) plugins.set(id, manifest);
    if (kept.length !== entries.length) await writeIndex(kept).catch(() => {});
    else indexEntries = entries;
    return found.size;
  }

  async function resourceUrls(plugin) {
    const urls = {};
    for (const [key, rel] of Object.entries(plugin.resources || {})) {
      try {
        urls[key] = fileUrl(await appUri(`${plugin.dir}/${rel}`));
      } catch {
        // Leave the key out: templates render it empty, same as the desktop.
      }
    }
    return urls;
  }

  async function iconUrl(plugin) {
    if (!plugin.iconFile) return "";
    try {
      return fileUrl(await appUri(`${plugin.dir}/${plugin.iconFile}`));
    } catch {
      return "";
    }
  }

  async function list() {
    await ready();
    const result = [];
    for (const plugin of plugins.values()) {
      result.push({
        ...plugin,
        enabled: isEnabled(plugin.id),
        loaded: loaded.has(plugin.id),
        error: errors.get(plugin.id) || "",
        resources: await resourceUrls(plugin),
        iconUrl: await iconUrl(plugin),
        iconType: extensionOf(plugin.iconFile)
      });
    }
    return result;
  }

  async function unload(id) {
    const entry = loaded.get(id);
    if (!entry) return false;
    try {
      if (typeof entry.dispose === "function") await entry.dispose();
    } catch (error) {
      log(`[plugins] unload ${id}: ${error?.message || error}`);
    }
    loaded.delete(id);
    return true;
  }

  async function load(id) {
    const plugin = plugins.get(id);
    if (!plugin || !isEnabled(id)) return false;
    if (loaded.has(id)) return true;
    try {
      const source = await readText(`${plugin.dir}/${plugin.entry}`);
      if (!source.trim()) throw new Error(`插件入口文件为空：${plugin.entry}`);
      if (source.length > MAX_ENTRY_BYTES) throw new Error("插件入口文件过大");
      const pluginApi = Object.freeze({
        id,
        metadata: plugin,
        log: (...args) => log(`[plugin:${id}]`, ...args),
        on: () => {
          throw new Error("Plugin event API unavailable");
        }
      });
      const module = { exports: {} };
      const factory = new Function(
        "module",
        "exports",
        "require",
        "plugin",
        "console",
        `"use strict";\n${source}\n;return module.exports;`
      );
      const exported = factory(
        module,
        module.exports,
        (request) => {
          throw new Error(`Blocked dependency: ${request}`);
        },
        pluginApi,
        { log: pluginApi.log, warn: pluginApi.log, error: pluginApi.log }
      );
      const instance = exported && typeof exported.activate === "function" ? await exported.activate(pluginApi) : exported;
      loaded.set(id, { instance, dispose: exported?.deactivate });
      errors.delete(id);
      return true;
    } catch (error) {
      errors.set(id, String(error?.message || error));
      log(`[plugins] failed to load ${id}: ${error?.message || error}`);
      return false;
    }
  }

  async function loadEnabled() {
    for (const plugin of plugins.values()) {
      if (!isEnabled(plugin.id)) continue;
      await load(plugin.id);
    }
  }

  async function ready() {
    if (!readyPromise) {
      readyPromise = (async () => {
        await discover();
        await loadEnabled();
      })();
    }
    return readyPromise;
  }

  async function reload() {
    for (const id of [...loaded.keys()]) await unload(id);
    errors.clear();
    readyPromise = (async () => {
      await discover();
      await loadEnabled();
    })();
    await readyPromise;
    return list();
  }

  async function setEnabled(id, enabled) {
    await ready();
    if (!plugins.has(id)) throw new Error("Unknown plugin");
    setDisabled(id, !enabled);
    if (enabled) {
      errors.delete(id);
      await load(id);
    } else {
      await unload(id);
    }
    return list();
  }

  async function pickZip() {
    let result;
    try {
      result = await bridge().pick({ mime: "application/zip", multiple: false, title: "安装插件" });
    } catch (error) {
      if (isCancel(error)) return null;
      throw error;
    }
    const file = result?.files?.[0];
    return file && file.uri ? { uri: file.uri, name: String(file.name || "plugin.zip") } : null;
  }

  function entryLimit(name, manifest) {
    if (name === manifest.entry) return MAX_ENTRY_BYTES;
    if (name === manifest.iconFile) return MAX_ICON_BYTES;
    if (name === "plugin.json") return MAX_MANIFEST_BYTES;
    return MAX_RESOURCE_BYTES;
  }

  async function install(payload = {}) {
    await ready();
    if (!bridge().pick && !payload.filePath) throw new Error("当前平台无法选择插件包");
    let picked;
    if (typeof payload.filePath === "string" && payload.filePath) {
      picked = { uri: payload.filePath, name: "" };
    } else {
      picked = await pickZip();
      if (!picked) return { canceled: true };
    }

    const binary = await bridge().read({ uri: picked.uri, binary: true });
    const bytes = base64ToBytes(binary?.base64 || "");
    if (!bytes.length) throw new Error("插件包为空");
    if (bytes.length > MAX_ZIP_BYTES) throw new Error("插件包超过 32 MB");

    let entries;
    try {
      entries = unzipSync(bytes);
    } catch {
      throw new Error("插件包不是有效的 ZIP 文件");
    }
    const names = Object.keys(entries).filter((name) => !name.endsWith("/"));
    if (!names.length) throw new Error("插件包是空的");
    if (names.length > MAX_ZIP_ENTRIES) throw new Error(`插件包条目过多（${names.length}）`);
    let total = 0;
    for (const name of names) {
      total += entries[name].length;
      if (total > MAX_ZIP_TOTAL_BYTES) throw new Error("插件包解压后体积过大");
    }

    const manifests = names.filter((name) => name === "plugin.json" || /^[^/]+\/plugin\.json$/.test(name));
    if (manifests.length !== 1) throw new Error("插件包必须包含且只包含一个 plugin.json");
    const manifestName = manifests[0];
    const prefix = manifestName.slice(0, manifestName.length - "plugin.json".length);

    let raw;
    try {
      raw = parseJson(strFromU8(entries[manifestName]));
    } catch {
      throw new Error("plugin.json 不是合法 JSON");
    }
    const manifest = normalizeManifest(raw, `${ROOT}/${raw.id}`);
    if (!manifest.iconFile) {
      throw new Error("插件缺少图标文件：请在 plugin.json 中用 icon 指向 assets/icon.svg（支持 SVG / PNG / JPEG / WebP）");
    }
    const iconEntry = entries[`${prefix}${manifest.iconFile}`];
    if (!iconEntry) throw new Error(`插件图标文件不存在：${manifest.iconFile}`);
    if (iconEntry.length > MAX_ICON_BYTES) throw new Error(`插件图标文件超过 512 KB：${manifest.iconFile}`);
    if (!entries[`${prefix}${manifest.entry}`]) throw new Error(`插件缺少入口文件 ${manifest.entry}`);
    if (manifest.renderer) {
      const rendererEntry = entries[`${prefix}${manifest.renderer}`];
      if (!rendererEntry) throw new Error(`插件缺少界面脚本 ${manifest.renderer}`);
      if (rendererEntry.length > MAX_RENDERER_BYTES) throw new Error('插件界面脚本超过 512 KB');
    }

    const relative = new Map();
    for (const name of names) {
      if (name !== manifestName && !name.startsWith(`${prefix}`)) {
        throw new Error(`插件包含非法路径：${name}`);
      }
      const rel = name.slice(prefix.length);
      if (!rel || !isSafeRelativePath(rel)) throw new Error(`插件包含非法路径：${name}`);
      if (entries[name].length > entryLimit(rel, manifest)) throw new Error(`插件文件过大：${rel}`);
      relative.set(rel, entries[name]);
    }

    const existing = indexEntries.find((item) => item.id === manifest.id);
    if (existing && !payload.overwrite) {
      return { conflict: true, id: manifest.id, existing: existing.version || "", filePath: picked.uri };
    }

    const dir = `${ROOT}/${manifest.id}`;
    await bridge().removeAppDir({ path: dir }).catch(() => {});
    for (const [rel, data] of relative) await writeFile(`${dir}/${rel}`, data);
    await writeIndex([
      ...indexEntries.filter((item) => item.id !== manifest.id),
      { id: manifest.id, name: manifest.name, version: manifest.version, installedAt: Date.now() }
    ]);
    setDisabled(manifest.id, false);
    plugins.set(manifest.id, Object.freeze({ ...manifest, source: "user" }));
    errors.delete(manifest.id);
    await unload(manifest.id);
    await load(manifest.id);
    return {
      installed: true,
      filePath: picked.uri,
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      shadowed: false,
      list: await list()
    };
  }

  async function uninstall(id) {
    await ready();
    const plugin = plugins.get(id);
    if (!plugin) throw new Error("Unknown plugin");
    await unload(id);
    await bridge().removeAppDir({ path: plugin.dir }).catch(() => {});
    await writeIndex(indexEntries.filter((item) => item.id !== id));
    plugins.delete(id);
    errors.delete(id);
    setDisabled(id, false);
    return { removed: true, list: await list() };
  }

  async function openFolder() {
    throw new Error("Android 版插件保存在应用私有目录，无法用文件管理器打开");
  }

  /* Optional UI script (`plugin.json` → `renderer`): the app executes it after
     startup, exactly like the desktop `plugins:renderer-source` bridge. */
  async function rendererSource(id) {
    await ready();
    const plugin = plugins.get(id);
    if (!plugin?.renderer) return "";
    try {
      const source = await readText(`${plugin.dir}/${plugin.renderer}`);
      return source.length > MAX_RENDERER_BYTES ? "" : source;
    } catch {
      return "";
    }
  }

  return { list, reload, setEnabled, install, uninstall, openFolder, rendererSource, ready };
}
