import pkg from "../../../package.json";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { createAndroidPluginHost } from "../plugins/android-host.js";
import { convertDocumentXml } from "../../shared/docx-markdown.js";

const SETTINGS_KEY = "moread.settings";
const MAX_PICK_BYTES = 25 * 1024 * 1024;
const MAX_INLINE_IMAGE_BYTES = 300 * 1024;
const MAX_DOCX_BYTES = 32 * 1024 * 1024;
const ASSET_NAME_PATTERN = /^[A-Za-z0-9._\-\u4e00-\u9fa5]+$/;

const MIME_BY_EXT = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  docm: "application/vnd.ms-word.document.macroEnabled.12",
  md: "text/markdown",
  markdown: "text/markdown",
  txt: "text/plain",
  zip: "application/zip",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  css: "text/css",
  json: "application/json"
};

function capacitor() {
  return globalThis.Capacitor || null;
}

function plugin() {
  const instance = capacitor()?.Plugins?.MoReadFiles;
  if (!instance) throw new Error("Android 文件插件不可用");
  return instance;
}

function pluginOrNull() {
  return capacitor()?.Plugins?.MoReadFiles || null;
}

function convertFileSrc(path) {
  if (!path) return "";
  const bridge = capacitor();
  if (!bridge?.convertFileSrc) return path;
  try {
    return bridge.convertFileSrc(path);
  } catch {
    return path;
  }
}

function isCancel(error) {
  const message = String(error?.message || error || "");
  return /cancel|取消|abort/i.test(message);
}

function basename(value) {
  const text = String(value || "");
  const normalized = text.replace(/\\/g, "/").split("?")[0].split("#")[0];
  const parts = normalized.split("/").filter(Boolean);
  return decodeURIComponent(parts[parts.length - 1] || "未命名.md");
}

function detectEol(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

function isAppNotePath(value) {
  return /\/files\/notes\/[^/]+\.md$/i.test(String(value || ""));
}

function readSettingsSync() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function writeSettingsSync(next) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("写入设置失败", error);
  }
}

function pushRecent(entry) {
  if (!entry?.path) return;
  const settings = readSettingsSync();
  const recent = (settings.recentFiles || []).filter((item) => item.path !== entry.path);
  recent.unshift(entry);
  settings.recentFiles = recent.slice(0, 12);
  writeSettingsSync(settings);
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

const BASE64_LOOKUP = (() => {
  const table = new Uint8Array(256).fill(255);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (let index = 0; index < chars.length; index += 1) {
    table[chars.charCodeAt(index)] = index;
  }
  table["-".charCodeAt(0)] = 62;
  table["_".charCodeAt(0)] = 63;
  return table;
})();

function base64ToBytes(value) {
  const text = String(value || "");
  const length = text.length;
  let padding = 0;
  if (text.endsWith("==")) padding = 2;
  else if (text.endsWith("=")) padding = 1;
  const expected = Math.max(0, Math.floor((length * 3) / 4) - padding);
  const bytes = new Uint8Array(expected);
  let written = 0;
  let buffer = 0;
  let bits = 0;
  for (let index = 0; index < length; index += 1) {
    const value = BASE64_LOOKUP[text.charCodeAt(index)];
    if (value === 255) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[written] = (buffer >> bits) & 0xff;
      written += 1;
    }
  }
  return written === bytes.length ? bytes : bytes.subarray(0, written);
}

function rewriteHomeAssets(text, assets) {
  let output = String(text || "");
  for (const asset of assets || []) {
    const name = String(asset.name || "").replace(/^assets\//, "");
    if (!name) continue;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    output = output
      .replace(new RegExp(`\\]\\(\\s*<?assets/${escaped}>?`, "g"), `](${asset.url}`)
      .replace(
        new RegExp(`\\b(src|href)=(["'])assets/${escaped}\\2`, "g"),
        (_match, attr, quote) => `${attr}=${quote}${asset.url}${quote}`
      )
      .replace(
        new RegExp(`url\\(\\s*(["']?)assets/${escaped}\\1\\s*\\)`, "g"),
        (_match, quote) => `url(${quote}${asset.url}${quote})`
      );
  }
  return output;
}

async function readUri(uri, binary = false) {
  const webFile = webFiles.get(uri);
  if (webFile) {
    if (binary) {
      const bytes = new Uint8Array(await webFile.arrayBuffer());
      return {
        uri,
        name: webFile.name,
        mime: webFile.type || "application/octet-stream",
        size: bytes.length,
        base64: bytesToBase64(bytes)
      };
    }
    const text = await webFile.text();
    return {
      uri,
      name: webFile.name,
      mime: webFile.type || "text/plain",
      size: text.length,
      text
    };
  }
  const bridge = pluginOrNull();
  if (!bridge) throw new Error("文件读取不可用");
  return await bridge.read({ uri, binary });
}

function documentFromResult(result, fallbackName) {
  const text = result?.text ?? "";
  const name = result?.name || fallbackName || "未命名.md";
  return {
    path: result?.uri || "",
    name,
    content: text,
    eol: detectEol(text),
    encoding: "UTF-8",
    mtimeMs: result?.mtimeMs || Date.now(),
    size: typeof result?.size === "number" ? result.size : text.length
  };
}

async function pickFiles({ multiple = false, mime = "*/*", title = "" } = {}) {
  const bridge = pluginOrNull();
  if (bridge) {
    try {
      const result = await bridge.pick({ multiple, mime, title });
      const files = Array.isArray(result?.files) ? result.files : [];
      if (files.length) return files;
    } catch (error) {
      if (isCancel(error)) return [];
      console.warn("原生文件选择不可用，改用网页文件选择器", error);
    }
  }
  return pickFilesViaInput({ multiple, mime });
}

function mimeToAccept(mime) {
  if (!mime || mime === "*/*") return "";
  if (mime === "image/*") return "image/*";
  if (mime === "text/css") return ".css";
  if (mime === "text/markdown") return ".md,.markdown,.mdown,.txt";
  return mime;
}

const webFiles = new Map();
let webFileSeq = 0;

function registerWebFile(file) {
  const uri = `webfile://${++webFileSeq}/${encodeURIComponent(file.name || "file")}`;
  webFiles.set(uri, file);
  return {
    uri,
    name: file.name || "文件",
    mime: file.type || "application/octet-stream"
  };
}

/**
 * Fallback for devices whose system document picker cannot be launched
 * (for example HarmonyOS compatibility layers). The WebView's own
 * `<input type="file">` still works there.
 */
function pickFilesViaInput({ multiple = false, mime = "*/*" } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = Boolean(multiple);
    const accept = mimeToAccept(mime);
    if (accept) input.accept = accept;
    input.style.position = "fixed";
    input.style.left = "-10000px";
    input.style.top = "0";
    document.body.append(input);

    let settled = false;
    const finish = (files) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(files.map(registerWebFile));
    };

    input.addEventListener("change", () => {
      finish(Array.from(input.files || []));
    });
    input.addEventListener("cancel", () => finish([]));
    window.addEventListener(
      "focus",
      () => {
        window.setTimeout(() => {
          if (settled) return;
          if (!input.files || input.files.length === 0) finish([]);
        }, 1200);
      },
      { once: true }
    );
    input.click();
  });
}

async function createDocument({ name, mime, text, base64 }) {
  const bridge = pluginOrNull();
  if (!bridge?.create) {
    const error = new Error("NO_SAVER");
    error.code = "NO_SAVER";
    throw error;
  }
  try {
    return await bridge.create({ name, mime, text, base64 });
  } catch (error) {
    if (isCancel(error)) return null;
    const message = String(error?.message || error || "");
    if (/no_saver|no activity|activitynotfound|unable to find/i.test(message)) {
      const failure = new Error("NO_SAVER");
      failure.code = "NO_SAVER";
      throw failure;
    }
    throw error;
  }
}

/**
 * Last-resort save: write into the app's private folder and open the system
 * share sheet, so the user can still put the file into Downloads or a cloud
 * drive on devices where ACTION_CREATE_DOCUMENT cannot be launched.
 */
async function shareFallback({ name, text, mime = "text/markdown" }) {
  const bridge = pluginOrNull();
  if (!bridge?.shareSaved) return null;
  const safeName = String(name || "未命名.md").replace(/[\\/:*?"<>|]+/g, "-");
  const result = await bridge.shareSaved({ name: safeName, text, mime });
  return {
    canceled: false,
    path: result?.uri || "",
    name: result?.name || safeName,
    eol: null,
    encoding: "UTF-8",
    mtimeMs: Date.now(),
    size: String(text || "").length,
    notice: "系统另存为不可用，已通过分享面板保存"
  };
}

export function createAndroidApi() {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.platform = "android";
  }

  const openListeners = new Set();
  const themeListeners = new Set();
  let initialHandled = false;

  function emitOpen(uri) {
    if (!uri) return;
    for (const listener of openListeners) {
      try {
        listener([uri]);
      } catch (error) {
        console.warn(error);
      }
    }
  }

  function routeIncoming(payload = {}) {
    const uri = payload.uri;
    if (!uri) return;
    const name = String(payload.name || "").toLowerCase();
    const mime = String(payload.mime || "").toLowerCase();
    const isTheme =
      name.endsWith(".zip") ||
      name.endsWith(".moread-theme") ||
      mime === "application/zip" ||
      mime === "application/x-zip-compressed";
    if (isTheme && themeListeners.size) {
      for (const listener of themeListeners) {
        try {
          listener(uri);
        } catch (error) {
          console.warn(error);
        }
      }
      return;
    }
    emitOpen(uri);
  }

  async function handleInitialDocument() {
    if (initialHandled) return;
    initialHandled = true;
    const bridge = pluginOrNull();
    if (!bridge) return;
    try {
      const initial = await bridge.initial();
      if (initial?.uri) routeIncoming(initial);
    } catch (error) {
      console.warn("读取启动文件失败", error);
    }
    try {
      bridge.addListener?.("documentOpen", (payload) => {
        if (payload?.uri) routeIncoming(payload);
      });
    } catch (error) {
      console.warn(error);
    }
  }

  function patchSettings(patch) {
    const next = { ...readSettingsSync(), ...(patch || {}) };
    writeSettingsSync(next);
    return next;
  }

  /* Plugins run in the renderer on Android: there is no Node process to host
     them. The host keeps the same `api.plugins` contract as the desktop bridge.
     Gate on `Capacitor` (not on the plugin proxy) so the UI is available as soon
     as the native bridge exists; every call re-checks MoReadFiles. */
  const pluginHost = capacitor()
    ? createAndroidPluginHost({
        getBridge: pluginOrNull,
        convertFileSrc,
        readSettings: readSettingsSync,
        updateSettings: patchSettings,
        log: (...args) => console.log(...args)
      })
    : null;

  const api = {
    platform: "android",
    versions: {
      electron: "—",
      chrome: (navigator.userAgent.match(/Chrome\/([\d.]+)/) || [])[1] || "—",
      node: "—"
    },
    plugins: pluginHost || undefined,

    async appInfo() {
      return {
        version: pkg.version,
        name: "墨阅 MoRead",
        platform: "android",
        isPackaged: true,
        userData: "",
        documents: ""
      };
    },

    async getSettings() {
      return readSettingsSync();
    },

    async setSettings(patch) {
      const next = { ...readSettingsSync(), ...(patch || {}) };
      writeSettingsSync(next);
      return true;
    },

    async removeRecent(path) {
      const settings = readSettingsSync();
      settings.recentFiles = (settings.recentFiles || []).filter((item) => item.path !== path);
      writeSettingsSync(settings);
      return true;
    },

    async getFavorites() {
      const settings = readSettingsSync();
      return Array.isArray(settings.favorites) ? settings.favorites : [];
    },

    async pickFavorites() {
      const picked = await pickFiles({ multiple: true, mime: "*/*", title: "收藏文件路径" });
      return picked.map((item) => ({
        path: item.uri,
        name: item.name || basename(item.uri)
      }));
    },

    async addFavorite(entry) {
      const settings = readSettingsSync();
      const item = {
        path: String(entry?.path || ""),
        name: String(entry?.name || basename(entry?.path || "") || "未命名文档"),
        addedAt: Date.now()
      };
      if (!item.path) return settings.favorites || [];
      const favorites = Array.isArray(settings.favorites) ? settings.favorites : [];
      const next = [item, ...favorites.filter((favorite) => favorite.path !== item.path)].slice(0, 100);
      settings.favorites = next;
      writeSettingsSync(settings);
      return next;
    },

    async removeFavorite(path) {
      const settings = readSettingsSync();
      const next = (settings.favorites || []).filter((item) => item.path !== path);
      settings.favorites = next;
      writeSettingsSync(settings);
      return next;
    },

    async getNotes() {
      const settings = readSettingsSync();
      const entries = Array.isArray(settings.noteEntries) ? settings.noteEntries : [];
      const bridge = pluginOrNull();
      let changed = false;
      if (bridge?.writeAppFile) {
        for (const entry of entries) {
          if (!entry || entry.type !== "note" || entry.path || typeof entry.content !== "string") continue;
          try {
            const written = await bridge.writeAppFile({
              path: `notes/${entry.id}.md`,
              text: entry.content
            });
            entry.path = written?.uri || "";
            delete entry.content;
            changed = true;
          } catch (error) {
            console.warn("迁移旧笔记失败", error);
          }
        }
      }
      if (changed) {
        settings.noteEntries = entries;
        writeSettingsSync(settings);
      }
      return entries;
    },

    async createNote(entry) {
      const settings = readSettingsSync();
      const entries = Array.isArray(settings.noteEntries) ? settings.noteEntries : [];
      const parentId = entry?.parentId ? String(entry.parentId) : null;
      const requestedName = String(entry?.name || "").trim().slice(0, 120) || "未命名笔记";
      let name = requestedName;
      let suffix = 2;
      while (entries.some((item) => (item.parentId || null) === parentId && item.name === name)) {
        name = `${requestedName} ${suffix}`;
        suffix += 1;
      }
      const id = crypto.randomUUID();
      const now = Date.now();
      const written = await plugin().writeAppFile({
        path: `notes/${id}.md`,
        text: String(entry?.content ?? `# ${name}\n\n`)
      });
      const item = {
        id,
        type: "note",
        name,
        parentId,
        path: written?.uri || "",
        createdAt: now,
        updatedAt: now
      };
      entries.push(item);
      settings.noteEntries = entries;
      writeSettingsSync(settings);
      return item;
    },

    async createNoteFolder(entry) {
      const settings = readSettingsSync();
      const entries = Array.isArray(settings.noteEntries) ? settings.noteEntries : [];
      const parentId = entry?.parentId ? String(entry.parentId) : null;
      const requestedName = String(entry?.name || "").trim().slice(0, 120) || "新建文件夹";
      let name = requestedName;
      let suffix = 2;
      while (entries.some((item) => (item.parentId || null) === parentId && item.name === name)) {
        name = `${requestedName} ${suffix}`;
        suffix += 1;
      }
      const id = crypto.randomUUID();
      const now = Date.now();
      const item = {
        id,
        type: "folder",
        name,
        parentId,
        createdAt: now,
        updatedAt: now
      };
      entries.push(item);
      settings.noteEntries = entries;
      writeSettingsSync(settings);
      return item;
    },

    async renameNote(payload) {
      const settings = readSettingsSync();
      const entries = Array.isArray(settings.noteEntries) ? settings.noteEntries : [];
      const entry = entries.find((item) => item.id === payload?.id);
      if (!entry) throw new Error("笔记不存在");
      entry.name = String(payload?.name || "").trim().slice(0, 120) || (entry.type === "folder" ? "新建文件夹" : "未命名笔记");
      entry.updatedAt = Date.now();
      settings.noteEntries = entries;
      writeSettingsSync(settings);
      return entry;
    },

    async deleteNote(id) {
      const settings = readSettingsSync();
      const entries = Array.isArray(settings.noteEntries) ? settings.noteEntries : [];
      const ids = new Set([String(id || "")]);
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
      const bridge = pluginOrNull();
      for (const entry of entries) {
        if (entry.type === "note" && ids.has(entry.id) && bridge?.removeAppDir) {
          try {
            await bridge.removeAppDir({ path: `notes/${entry.id}.md` });
          } catch {
            /* file may already be gone */
          }
        }
      }
      const next = entries.filter((entry) => !ids.has(entry.id));
      settings.noteEntries = next;
      writeSettingsSync(settings);
      return next;
    },

    async touchNote(path) {
      const settings = readSettingsSync();
      const entries = Array.isArray(settings.noteEntries) ? settings.noteEntries : [];
      const entry = entries.find((item) => item.type === "note" && item.path === path);
      if (!entry) return false;
      entry.updatedAt = Date.now();
      settings.noteEntries = entries;
      writeSettingsSync(settings);
      return true;
    },

    async revealNote() {
      return false;
    },

    async exportNotesZip() {
      const settings = readSettingsSync();
      const entries = Array.isArray(settings.noteEntries) ? settings.noteEntries : [];
      const notes = entries.filter((entry) => entry.type === "note");
      if (!notes.length) return { canceled: true, empty: true };
      const zipName = (entry) => {
        const parts = [];
        const seen = new Set();
        let current = entry;
        while (current && !seen.has(current.id)) {
          seen.add(current.id);
          const label = current.type === "folder"
            ? current.name
            : (/\.md$/i.test(current.name) ? current.name : `${current.name}.md`);
          parts.unshift(String(label || "未命名").replace(/[\\/:*?"<>|]+/g, "_"));
          current = entries.find((item) => item.id === current.parentId);
        }
        return parts.join("/") || "note.md";
      };
      const archiveEntries = {};
      const used = new Set();
      for (const entry of notes) {
        let name = zipName(entry);
        let suffix = 2;
        while (used.has(name)) {
          name = name.replace(/(\.md)?$/i, `-${suffix}$1`);
          suffix += 1;
        }
        used.add(name);
        let text = "";
        try {
          const result = await readUri(entry.path);
          text = result?.text || "";
        } catch {
          text = "";
        }
        archiveEntries[name] = strToU8(text);
      }
      const archive = bytesToBase64(zipSync(archiveEntries, { level: 6 }));
      try {
        const created = await createDocument({
          name: "notes.zip",
          mime: "application/zip",
          base64: archive
        });
        return created?.uri
          ? { canceled: false, path: created.uri, count: notes.length }
          : { canceled: true };
      } catch (error) {
        if (error?.code === "NO_SAVER") {
          const bridge = pluginOrNull();
          const shared = await bridge?.shareSaved?.({ name: "notes.zip", base64: archive, mime: "application/zip" });
          if (shared) return { canceled: false, path: shared.uri || "", count: notes.length, notice: "已通过分享面板保存" };
        }
        throw error;
      }
    },

    async shareText(payload = {}) {
      const text = String(payload?.text || "");
      const title = String(payload?.title || "分享");
      const share = capacitor()?.Plugins?.Share;
      if (share?.share) {
        try {
          await share.share({ title, text, dialogTitle: title });
          return { shared: true };
        } catch (error) {
          if (isCancel(error)) return { canceled: true };
          console.warn("系统分享不可用，改为复制", error);
        }
      }
      await api.copyText(text);
      return { copied: true };
    },

    async shareFile(payload = {}) {
      const result = await shareFallback({
        name: String(payload?.name || "未命名.md"),
        text: String(payload?.text || ""),
        mime: String(payload?.mime || "text/markdown")
      });
      if (!result) return { canceled: true };
      return { ...result, notice: "已打开分享面板" };
    },

    async rendererReady() {
      handleInitialDocument();
      return true;
    },

    onOpenPaths(callback) {
      openListeners.add(callback);
      return () => openListeners.delete(callback);
    },

    onThemePath(callback) {
      if (typeof callback !== "function") return () => {};
      themeListeners.add(callback);
      return () => themeListeners.delete(callback);
    },

    onCloseRequest() {
      return () => {};
    },

    async setTitle(title) {
      document.title = title || "墨阅 MoRead";
    },

    async setWindowIcon() {
      return false;
    },

    minimize() {},
    toggleMaximize() {},
    async isMaximized() {
      return true;
    },
    async closeNow() {
      try {
        await capacitor()?.Plugins?.App?.exitApp();
      } catch {
        /* ignore */
      }
    },
    async quit() {
      try {
        await capacitor()?.Plugins?.App?.exitApp();
      } catch {
        /* ignore */
      }
    },

    async openDialog() {
      const picked = await pickFiles({ multiple: true, mime: "*/*", title: "打开 Markdown 文档" });
      if (!picked.length) return { canceled: true, files: [] };
      const files = [];
      for (const item of picked) {
        try {
          const result = await readUri(item.uri);
          files.push(documentFromResult(result, item.name));
        } catch (error) {
          files.push({ path: item.uri, name: item.name, error: String(error?.message || error) });
        }
      }
      return { canceled: false, files };
    },

    async readFile(path) {
      if (!path) throw new Error("缺少文件路径");
      const result = await readUri(path);
      const doc = documentFromResult(result, basename(path));
      doc.path = path;
      if (!isAppNotePath(path)) pushRecent({ path, name: doc.name, openedAt: Date.now() });
      return doc;
    },

    async saveFile(payload = {}) {
      const content = payload.content ?? "";
      const eol = payload.eol || "\n";
      const saveAs = Boolean(payload.saveAs);
      const suggestedName = payload.suggestedName || "未命名.md";
      // New documents carry a null path; keep everything string-typed here.
      const path = String(payload.path || "");
      const text = eol === "\r\n" ? content.replace(/\r?\n/g, "\r\n") : content;
      const webFile = path.startsWith("webfile://");
      let inPlaceError = null;

      if (!saveAs && path && !webFile) {
        try {
          const result = await plugin().write({ uri: path, text });
          if (!isAppNotePath(path)) pushRecent({ path, name: result?.name || basename(path), openedAt: Date.now() });
          return {
            canceled: false,
            path,
            name: result?.name || basename(path),
            eol,
            encoding: "UTF-8",
            mtimeMs: Date.now(),
            size: text.length
          };
        } catch (error) {
          if (isCancel(error)) return { canceled: true };
          // Most often a read-only SAF grant (file opened from another app).
          // Fall through to "save as" instead of failing the whole save.
          inPlaceError = error;
          console.warn("原地保存失败，改走另存为", error);
        }
      }

      let created = null;
      try {
        created = await createDocument({ name: suggestedName, mime: "text/markdown", text });
      } catch (error) {
        if (error?.code === "NO_SAVER") {
          const shared = await shareFallback({ name: suggestedName, text });
          if (shared) return shared;
        }
        throw inPlaceError || error;
      }
      if (!created?.uri) return { canceled: true };
      pushRecent({
        path: created.uri,
        name: created.name || suggestedName,
        openedAt: Date.now()
      });
      return {
        canceled: false,
        path: created.uri,
        name: created.name || suggestedName,
        eol,
        encoding: "UTF-8",
        mtimeMs: Date.now(),
        size: text.length,
        notice: inPlaceError ? "原文件只读，已另存为副本" : undefined
      };
    },

    async statFile(path) {
      try {
        const result = await readUri(path);
        return { exists: true, size: result?.size ?? 0, mtimeMs: result?.mtimeMs || Date.now() };
      } catch {
        return { exists: false };
      }
    },

    /* Same contract as the desktop `dialog:pick-file` bridge, used by plugin
       commands (`app.pickFile`). SAF filters by MIME, so we also validate the
       extension after picking. */
    async pickFile(payload = {}) {
      const extensions = (Array.isArray(payload.extensions) ? payload.extensions : [])
        .map((value) => String(value || "").trim().replace(/^\./, "").toLowerCase())
        .filter((value) => /^[a-z0-9]{1,10}$/.test(value))
        .slice(0, 8);
      const mime = extensions.length === 1 ? MIME_BY_EXT[extensions[0]] || "*/*" : "*/*";
      const picked = await pickFiles({
        multiple: false,
        mime,
        title: String(payload.title || "选择文件").slice(0, 80)
      });
      if (!picked.length) return { canceled: true };
      const item = picked[0];
      const name = String(item.name || basename(item.uri));
      const extension = /\.([A-Za-z0-9]+)$/.exec(name);
      const suffix = extension ? extension[1].toLowerCase() : "";
      if (extensions.length && !extensions.includes(suffix)) {
        throw new Error(`只支持 ${extensions.map((value) => `.${value}`).join(" / ")} 文件`);
      }
      let size = 0;
      try {
        size = (await readUri(item.uri))?.size || 0;
      } catch {
        // Size is only informational for plugin scripts.
      }
      return { canceled: false, path: item.uri, name, extension: `.${suffix}`, size };
    },

    /* Same converter as the desktop importer; the ZIP is unpacked with fflate. */
    async importDocx(filePath) {
      const path = String(filePath || "");
      if (!path) throw new Error("缺少文件路径");
      const name = basename(path);
      if (/\.doc$/i.test(name)) throw new Error("旧版 .doc 不支持，请在 Word 中另存为 .docx 后再导入");
      if (!/\.(docx|docm)$/i.test(name)) throw new Error("只支持 .docx / .docm 文档");
      let binary;
      try {
        binary = await readUri(path, true);
      } catch (error) {
        throw new Error(`读取失败：${error?.message || error}`);
      }
      const bytes = base64ToBytes(binary?.base64 || "");
      if (!bytes.length) throw new Error("文件为空");
      if (bytes.length > MAX_DOCX_BYTES) throw new Error("文档超过 32 MB，无法导入");
      let entries;
      try {
        entries = unzipSync(bytes);
      } catch {
        throw new Error("不是有效的 .docx 文件（可能是旧版 .doc 或已损坏）");
      }
      const documentXml = entries["word/document.xml"];
      if (!documentXml) throw new Error("缺少 word/document.xml，不是 Word .docx 文档");
      const stylesXml = entries["word/styles.xml"];
      const result = convertDocumentXml(
        strFromU8(documentXml),
        stylesXml ? strFromU8(stylesXml) : ""
      );
      return { ...result, path, name, size: bytes.length };
    },

    async revealFile() {
      return false;
    },

    getPathForFile() {
      return "";
    },

    async openPath(path) {
      if (!path) return;
      if (/^https?:/i.test(path)) {
        await api.openExternal(path);
        return;
      }
      if (/\.(zip|moread-theme)$/i.test(path)) {
        routeIncoming({ uri: path, name: path, mime: "application/zip" });
        return;
      }
      if (/^(content|file):/i.test(path)) {
        emitOpen(path);
        return;
      }
      throw new Error("Android 版无法直接打开该路径");
    },

    async syncSystemBars() {
      const bridge = pluginOrNull();
      if (!bridge?.setSystemBars) return false;
      const dark = document.documentElement.dataset.theme === "dark";
      const value = (name, fallback) =>
        getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
      const background = value("--bg", dark ? "#141210" : "#f2ede4");
      try {
        await bridge.setSystemBars({
          statusColor: background,
          navColor: background,
          dark
        });
        return true;
      } catch (error) {
        console.warn("设置系统栏颜色失败", error);
        return false;
      }
    },

    async openExternal(url) {
      if (!url) return;
      const bridge = pluginOrNull();
      if (bridge?.openUrl) {
        await bridge.openUrl({ url });
        return;
      }
      window.open(url, "_blank", "noopener");
    },

    async openImageDialog() {
      const picked = await pickFiles({ multiple: false, mime: "image/*", title: "选择图片" });
      if (!picked.length) return { canceled: true };
      const item = picked[0];
      const result = await readUri(item.uri, true);
      const bytes = base64ToBytes(result?.base64 || "");
      if (bytes.length > MAX_PICK_BYTES) throw new Error("图片过大");
      if (bytes.length > MAX_INLINE_IMAGE_BYTES) {
        throw new Error("Android 版插入图片上限为 300 KB，请先压缩");
      }
      const mime = result?.mime || "image/png";
      return {
        canceled: false,
        path: item.uri,
        name: result?.name || item.name || "image.png",
        dataUrl: `data:${mime};base64,${result?.base64 || ""}`
      };
    },

    async copyText(text) {
      const value = String(text ?? "");
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        await capacitor()?.Plugins?.Clipboard?.write({ string: value });
      }
      return true;
    },

    async readClipboard() {
      try {
        return (await navigator.clipboard.readText()) || "";
      } catch {
        return "";
      }
    },

    async exportHtml({ html, suggestedName }) {
      const text = String(html || "");
      try {
        const created = await createDocument({
          name: suggestedName || "document.html",
          mime: "text/html",
          text
        });
        return created?.uri ? { canceled: false, path: created.uri } : { canceled: true };
      } catch (error) {
        if (error?.code === "NO_SAVER") {
          const shared = await shareFallback({
            name: suggestedName || "document.html",
            text,
            mime: "text/html"
          });
          if (shared) return shared;
        }
        throw error;
      }
    },

    async exportText({ text, suggestedName }) {
      const value = String(text || "");
      try {
        const created = await createDocument({
          name: suggestedName || "document.txt",
          mime: "text/plain",
          text: value
        });
        return created?.uri ? { canceled: false, path: created.uri } : { canceled: true };
      } catch (error) {
        if (error?.code === "NO_SAVER") {
          const shared = await shareFallback({
            name: suggestedName || "document.txt",
            text: value,
            mime: "text/plain"
          });
          if (shared) return shared;
        }
        throw error;
      }
    },

    async exportPdf({ suggestedName } = {}) {
      const bridge = pluginOrNull();
      if (!bridge?.print) throw new Error("Android 版暂不支持导出 PDF");
      await bridge.print({ jobName: String(suggestedName || "墨阅文档") });
      return { canceled: false, path: "" };
    },

    async importTheme(filePath, packId) {
      let picked = filePath ? [{ uri: filePath, name: basename(filePath) }] : [];
      if (!picked.length) {
        picked = await pickFiles({ multiple: false, mime: "*/*", title: "导入主题包" });
      }
      if (!picked.length) return { canceled: true };
      const id = /^pack-[0-9a-z-]{4,40}$/.test(String(packId || ""))
        ? packId
        : `pack-${Date.now().toString(36)}`;
      const item = picked[0];
      const lower = String(item.name || item.uri).toLowerCase();
      if (lower.endsWith(".json")) {
        const result = await readUri(item.uri);
        return {
          canceled: false,
          legacy: true,
          path: item.uri,
          json: result?.text || "",
          packId: id
        };
      }
      const binary = await readUri(item.uri, true);
      const entries = unzipSync(base64ToBytes(binary?.base64 || ""));
      const jsonBytes = entries["theme.json"];
      if (!jsonBytes) throw new Error("主题包里缺少 theme.json");
      const json = strFromU8(jsonBytes);
      const css = entries["style.css"] ? strFromU8(entries["style.css"]) : "";
      let home = entries["home.md"] ? strFromU8(entries["home.md"]) : "";
      const assets = [];
      for (const [entryName, data] of Object.entries(entries)) {
        if (!entryName.startsWith("assets/")) continue;
        const name = entryName.slice("assets/".length);
        if (!name || name.includes("/") || !ASSET_NAME_PATTERN.test(name)) continue;
        const written = await plugin().writeAppFile({
          path: `theme-assets/packs/${id}/assets/${name}`,
          base64: bytesToBase64(data)
        });
        assets.push({
          name: `assets/${name}`,
          path: written?.uri || "",
          url: convertFileSrc(written?.uri || "")
        });
      }
      // Keep home.md/style.css portable (`assets/x`): they are rewritten when
      // the pack is applied, so the same pack renders on any device.
      return {
        canceled: false,
        legacy: false,
        path: item.uri,
        packId: id,
        packDir: "",
        json,
        css,
        home,
        assets
      };
    },

    async removeThemePack(packId) {
      const bridge = pluginOrNull();
      if (!bridge?.removeAppDir) return false;
      try {
        await bridge.removeAppDir({ path: `theme-assets/packs/${packId}` });
        return true;
      } catch {
        return false;
      }
    },

    async exportTheme(payload = {}) {
      const entries = {};
      entries["theme.json"] = strToU8(String(payload.json || "{}"));
      if (String(payload.css || "").trim()) entries["style.css"] = strToU8(payload.css);
      if (String(payload.home || "").trim()) entries["home.md"] = strToU8(payload.home);
      for (const asset of payload.assets || []) {
        const name = String(asset?.name || "").replace(/^assets\//, "");
        if (!name || !ASSET_NAME_PATTERN.test(name)) continue;
        const result = await plugin().read({ uri: asset.path, binary: true });
        entries[`assets/${name}`] = base64ToBytes(result?.base64 || "");
      }
      const archive = zipSync(entries, { level: 6 });
      const created = await createDocument({
        name: payload.suggestedName || "moread-theme.zip",
        mime: "application/zip",
        base64: bytesToBase64(archive)
      });
      return created?.uri ? { canceled: false, path: created.uri } : { canceled: true };
    },

    async importThemeCss(filePath) {
      let picked = filePath ? [{ uri: filePath, name: basename(filePath) }] : [];
      if (!picked.length) {
        picked = await pickFiles({ multiple: false, mime: "text/css", title: "导入 CSS 样式表" });
      }
      if (!picked.length) return { canceled: true };
      const result = await readUri(picked[0].uri);
      return {
        canceled: false,
        path: picked[0].uri,
        name: result?.name || basename(picked[0].uri),
        css: result?.text || ""
      };
    },

    async addThemeImage() {
      const picked = await pickFiles({ multiple: false, mime: "image/*", title: "添加主页图片" });
      if (!picked.length) return { canceled: true };
      const item = picked[0];
      const result = await readUri(item.uri, true);
      const name = `home-${Date.now()}-${String(result?.name || item.name || "image.png").replace(/[^\w.\-\u4e00-\u9fa5]/g, "-")}`;
      const written = await plugin().writeAppFile({
        path: `theme-assets/home/${name}`,
        base64: result?.base64 || ""
      });
      return {
        canceled: false,
        path: written?.uri || "",
        url: convertFileSrc(written?.uri || ""),
        name: `assets/${name}`
      };
    },

    async associationStatus() {
      return { supported: false, registered: false, isDefaultForMd: false, extensions: [] };
    },
    async registerAssociations() {
      return false;
    },
    async unregisterAssociations() {
      return false;
    },
    async openDefaultAppsSettings() {
      return false;
    },

    toDisplayUrl(path) {
      return convertFileSrc(path);
    }
  };

  return api;
}
