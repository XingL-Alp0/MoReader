'use strict';

/**
 * Platform-neutral plugin manifest rules.
 *
 * The same normalisation runs in the Electron main process (`src/main/plugins.js`,
 * CommonJS) and in the Android plugin host (`src/renderer/plugins/android-host.js`,
 * bundled by esbuild), so limits and defaults cannot drift between platforms.
 *
 * Keep this file free of Node built-ins — it is bundled for the browser too.
 */

const ID_RE = /^[a-z][a-z0-9._-]{1,63}$/;
const RESOURCE_KEY_RE = /^[a-zA-Z][\w-]{0,63}$/;
const RESOURCE_PATH_RE = /^[\w][\w./-]*$/;
const ICON_EXT_RE = /\.(svg|png|jpe?g|webp)$/i;
const FIELD_TYPES = new Set(['text', 'textarea', 'color', 'select', 'number', 'boolean']);
const COMMAND_GROUPS = new Set(['import', 'export', 'tools']);

const MAX_MANIFEST_BYTES = 128 * 1024;
const MAX_ENTRY_BYTES = 2 * 1024 * 1024;
const MAX_RENDERER_BYTES = 512 * 1024;
const MAX_RESOURCE_BYTES = 8 * 1024 * 1024;
const MAX_ICON_BYTES = 512 * 1024;
const MAX_ZIP_BYTES = 32 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 400;
const MAX_ZIP_TOTAL_BYTES = 40 * 1024 * 1024;

function parseJson(text) {
  return JSON.parse(String(text || '').replace(/^\uFEFF/, ''));
}

/** Reject `../`, absolute paths and empty segments; used for ZIP entry names too. */
function isSafeRelativePath(value) {
  const rel = String(value || '').replace(/\\/g, '/');
  if (!rel || rel.startsWith('/') || /^[A-Za-z]:/.test(rel)) return false;
  return !rel.split('/').some((segment) => !segment || segment === '.' || segment === '..');
}

function normalizeResources(raw) {
  const resources = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return resources;
  for (const [key, rel] of Object.entries(raw)) {
    if (Object.keys(resources).length >= 32) break;
    if (!RESOURCE_KEY_RE.test(key)) continue;
    if (typeof rel !== 'string' || !RESOURCE_PATH_RE.test(rel) || rel.startsWith('/')) continue;
    if (!isSafeRelativePath(rel)) continue;
    resources[key] = rel;
  }
  return resources;
}

function normalizeFields(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 16)
    .map((field) => {
      if (!field || typeof field !== 'object') return null;
      const key = String(field.key || '').trim();
      if (!/^[a-zA-Z][\w-]*$/.test(key)) return null;
      const type = FIELD_TYPES.has(field.type) ? field.type : 'text';
      const options = Array.isArray(field.options)
        ? field.options.slice(0, 24).map((option) => {
            if (typeof option === 'string') return { value: option, label: option };
            if (option && typeof option === 'object' && option.value !== undefined) {
              return { value: String(option.value), label: String(option.label ?? option.value).slice(0, 60) };
            }
            return null;
          }).filter(Boolean)
        : [];
      return {
        key,
        label: String(field.label || key).slice(0, 60),
        type: type === 'select' && !options.length ? 'text' : type,
        options,
        placeholder: String(field.placeholder || '').slice(0, 120)
      };
    })
    .filter(Boolean);
}

/**
 * `icon` used to be a short glyph such as "▣". It can now also point at an
 * icon file inside the plugin directory (SVG/PNG/JPEG/WebP). `iconFile` is an
 * explicit alternative for manifests that keep the glyph fallback separate.
 */
function normalizeIconFile(raw) {
  const candidates = [];
  if (raw && typeof raw.icon === 'object' && !Array.isArray(raw.icon)) {
    candidates.push(raw.icon.file, raw.icon.path, raw.icon.src);
  } else if (typeof raw.icon === 'string') {
    candidates.push(raw.icon);
  }
  candidates.push(raw.iconFile);
  for (const candidate of candidates) {
    const rel = String(candidate || '').trim().replace(/\\/g, '/');
    if (!rel || !ICON_EXT_RE.test(rel)) continue;
    if (!RESOURCE_PATH_RE.test(rel) || rel.startsWith('/')) continue;
    if (!isSafeRelativePath(rel)) continue;
    return rel;
  }
  return '';
}

function normalizeIconGlyph(raw) {
  if (raw && typeof raw.icon === 'object' && !Array.isArray(raw.icon)) {
    return String(raw.icon.glyph || raw.icon.text || '').slice(0, 8);
  }
  if (typeof raw.icon === 'string' && raw.icon && !ICON_EXT_RE.test(raw.icon) && !raw.icon.includes('/')) {
    return raw.icon.slice(0, 8);
  }
  return '';
}

function normalizeManifest(raw, dir) {
  if (!raw || typeof raw !== 'object' || !ID_RE.test(raw.id || '')) throw new Error('Invalid plugin id');
  const entry = typeof raw.entry === 'string' ? raw.entry : 'index.js';
  if (entry.startsWith('/') || entry.includes('..') || !/^[\w./-]+\.js$/.test(entry)) throw new Error('Invalid plugin entry');
  let renderer = '';
  if (raw.renderer !== undefined) {
    renderer = typeof raw.renderer === 'string' ? raw.renderer.trim().replace(/\\/g, '/') : '';
    if (!renderer || renderer.startsWith('/') || renderer.includes('..') || !/^[\w./-]+\.js$/.test(renderer) || !isSafeRelativePath(renderer)) {
      throw new Error('Invalid plugin renderer');
    }
  }
  return Object.freeze({
    id: raw.id,
    dir,
    name: String(raw.name || raw.id).slice(0, 120),
    version: String(raw.version || '0.0.0').slice(0, 32),
    description: String(raw.description || '').slice(0, 500),
    author: String(raw.author || '').slice(0, 120),
    icon: normalizeIconGlyph(raw),
    iconFile: normalizeIconFile(raw),
    entry,
    renderer,
    permissions: Array.isArray(raw.permissions) ? raw.permissions.filter((p) => typeof p === 'string').slice(0, 32) : [],
    elements: Array.isArray(raw.elements) ? raw.elements.filter((item) => item && typeof item === 'object').slice(0, 64).map((item) => ({
      name: String(item.name || '').trim().toLowerCase(),
      label: String(item.label || item.name || '').slice(0, 120),
      description: String(item.description || '').slice(0, 300),
      html: String(item.html || '').slice(0, 20000),
      css: String(item.css || '').slice(0, 20000),
      defaults: item.defaults && typeof item.defaults === 'object' ? item.defaults : {},
      fields: normalizeFields(item.fields)
    })).filter((item) => /^[a-z][a-z0-9._:-]{1,63}$/.test(item.name)) : [],
    resources: normalizeResources(raw.resources),
    buttons: Array.isArray(raw.buttons) ? raw.buttons.filter((item) => item && typeof item === 'object').slice(0, 32).map((item) => ({
      id: String(item.id || item.name || '').slice(0, 64),
      label: String(item.label || item.name || '').slice(0, 120),
      icon: String(item.icon || '✦').slice(0, 8),
      placement: item.placement === 'floating' ? 'floating' : 'dock',
      script: String(item.script || '').slice(0, 20000)
    })).filter((item) => item.id && item.label && item.script) : [],
    /* Commands are menu entries (更多 → 导入 / 导出 / 工具). Unlike buttons they
       run from the app chrome, so the renderer only needs id/label/icon/group. */
    commands: Array.isArray(raw.commands) ? raw.commands.filter((item) => item && typeof item === 'object').slice(0, 24).map((item) => ({
      id: String(item.id || item.name || '').slice(0, 64),
      label: String(item.label || item.name || '').slice(0, 120),
      icon: String(item.icon || '').slice(0, 24),
      group: COMMAND_GROUPS.has(item.group) ? item.group : 'tools',
      description: String(item.description || '').slice(0, 200),
      script: String(item.script || '').slice(0, 20000)
    })).filter((item) => /^[a-z][a-z0-9._-]{1,63}$/.test(item.id) && item.label && item.script) : []
  });
}

module.exports = {
  ID_RE,
  ICON_EXT_RE,
  COMMAND_GROUPS,
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
  normalizeResources,
  normalizeFields,
  normalizeIconFile,
  normalizeIconGlyph,
  normalizeManifest
};
