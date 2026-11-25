'use strict';

/**
 * Headless tests for the Android plugin host (renderer runtime).
 * Run with: node scripts/test-plugin-host.js
 *
 * The host is ESM and imports fflate + the shared manifest rules, so it is
 * bundled to CommonJS with esbuild first, then driven against an in-memory
 * MoReadFiles fake (same methods the Capacitor bridge exposes).
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildSync } = require('esbuild');
const { zipSync, strToU8 } = require('fflate');

const root = path.resolve(__dirname, '..');
const outfile = path.join(root, 'tmp', 'android-host.cjs');

buildSync({
  entryPoints: [path.join(root, 'src/renderer/plugins/android-host.js')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile,
  logLevel: 'silent'
});

const { createAndroidPluginHost } = require(outfile);

function createFakeBridge(initial = {}) {
  const files = new Map(Object.entries(initial));
  const state = { picked: null };
  const uriOf = (rel) => `file:///fake/${rel}`;
  const relOf = (uri) => String(uri || '').replace('file:///fake/', '');
  return {
    files,
    state,
    async appFileUri({ path: rel }) {
      return { uri: uriOf(rel), path: rel };
    },
    async read({ uri, binary }) {
      const rel = relOf(uri);
      const item = files.get(rel);
      if (!item) throw new Error(`not found: ${rel}`);
      const base64 = item.base64 ?? Buffer.from(item.text ?? '', 'utf8').toString('base64');
      const bytes = Buffer.from(base64, 'base64');
      return binary
        ? { uri, base64, size: bytes.length }
        : { uri, text: bytes.toString('utf8'), size: bytes.length };
    },
    async writeAppFile({ path: rel, text, base64 }) {
      files.set(rel, text != null ? { text } : { base64 });
      return { uri: uriOf(rel), path: rel };
    },
    async removeAppDir({ path: rel }) {
      for (const key of [...files.keys()]) {
        if (key === rel || key.startsWith(`${rel}/`)) files.delete(key);
      }
      return { removed: rel };
    },
    async pick() {
      return { files: state.picked ? [state.picked] : [] };
    }
  };
}

function makeHost(bridge, { settings = {}, logs = [] } = {}) {
  let current = settings;
  const host = createAndroidPluginHost({
    getBridge: () => bridge,
    convertFileSrc: (uri) => `https://localhost/_capacitor_file_/${encodeURIComponent(uri)}`,
    readSettings: () => current,
    updateSettings: (patch) => {
      current = { ...current, ...patch };
      return current;
    },
    log: (...args) => logs.push(args.join(' '))
  });
  return { host, logs, settings: () => current };
}

function pluginManifest(overrides = {}) {
  return {
    id: 'alpha',
    name: 'Alpha',
    version: '1.0.0',
    author: 'Tester',
    description: 'demo plugin',
    icon: 'assets/icon.svg',
    entry: 'index.js',
    permissions: ['editor.insert'],
    resources: { wave: 'assets/wave.svg' },
    elements: [
      {
        name: 'note',
        label: '提示卡',
        html: '<aside>{title}</aside>',
        css: '.note{}',
        defaults: { title: 'hi' },
        fields: [{ key: 'title', label: '标题', type: 'text' }]
      }
    ],
    buttons: [{ id: 'insert', label: '插入', icon: '▣', script: 'app.insert("x")' }],
    commands: [{ id: 'import-docx', label: '导入 Word', group: 'import', script: 'app.toast(1)' }],
    ...overrides
  };
}

function makePluginZip(overrides = {}, prefix = '') {
  const manifest = pluginManifest(overrides);
  return zipSync({
    [`${prefix}plugin.json`]: strToU8(JSON.stringify(manifest)),
    [`${prefix}index.js`]: strToU8(
      "module.exports = { activate(plugin) { plugin.log('alpha-active'); }, deactivate() {} };"
    ),
    [`${prefix}assets/icon.svg`]: strToU8('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    [`${prefix}assets/wave.svg`]: strToU8('<svg xmlns="http://www.w3.org/2000/svg" id="wave"/>')
  });
}

async function dropIn(bridge, bytes, name = 'drop.zip') {
  bridge.files.set(name, { base64: Buffer.from(bytes).toString('base64') });
  bridge.state.picked = { uri: `file:///fake/${name}`, name, mime: 'application/zip' };
}

async function main() {
  // 1. install from a picked zip, then list it with desktop-compatible fields
  const bridge = createFakeBridge();
  const { host, settings } = makeHost(bridge);
  await dropIn(bridge, makePluginZip());

  const installed = await host.install();
  assert.equal(installed.installed, true);
  assert.equal(installed.id, 'alpha');
  assert.ok(bridge.files.has('plugins/alpha/plugin.json'));
  assert.ok(bridge.files.has('plugins/alpha/index.js'));
  assert.ok(bridge.files.has('plugins/index.json'));

  let list = await host.list();
  assert.equal(list.length, 1);
  let plugin = list[0];
  assert.equal(plugin.id, 'alpha');
  assert.equal(plugin.name, 'Alpha');
  assert.equal(plugin.source, 'user');
  assert.equal(plugin.enabled, true);
  assert.equal(plugin.loaded, true);
  assert.equal(plugin.error, '');
  assert.equal(plugin.dir, 'plugins/alpha');
  assert.equal(plugin.iconType, 'svg');
  assert.ok(plugin.iconUrl.startsWith('https://localhost/_capacitor_file_/'));
  assert.ok(plugin.resources.wave.startsWith('https://localhost/_capacitor_file_/'));
  assert.equal(plugin.elements[0].name, 'note');
  assert.equal(plugin.elements[0].fields.length, 1);
  assert.equal(plugin.buttons[0].id, 'insert');
  assert.equal(plugin.commands[0].group, 'import');

  // 2. install conflict → overwrite
  await dropIn(bridge, makePluginZip());
  const conflict = await host.install();
  assert.equal(conflict.conflict, true);
  assert.equal(conflict.existing, '1.0.0');
  const overwritten = await host.install({ filePath: conflict.filePath, overwrite: true });
  assert.equal(overwritten.installed, true);
  list = await host.list();
  assert.equal(list.length, 1);

  // 3. enable / disable persists in settings and reruns the entry script
  const disabled = await host.setEnabled('alpha', false);
  assert.equal(disabled[0].enabled, false);
  assert.equal(disabled[0].loaded, false);
  assert.deepEqual(settings().disabledPlugins, ['alpha']);
  const enabled = await host.setEnabled('alpha', true);
  assert.equal(enabled[0].enabled, true);
  assert.equal(enabled[0].loaded, true);
  assert.deepEqual(settings().disabledPlugins, []);

  // 4. broken entry surfaces an error instead of crashing the list
  await dropIn(
    bridge,
    zipSync({
      'plugin.json': strToU8(JSON.stringify(pluginManifest({ id: 'broken', name: 'Broken' }))),
      'index.js': strToU8('this is not javascript('),
      'assets/icon.svg': strToU8('<svg/>')
    })
  );
  const brokenInstall = await host.install();
  assert.equal(brokenInstall.installed, true);
  list = await host.list();
  const broken = list.find((item) => item.id === 'broken');
  assert.equal(broken.loaded, false);
  assert.ok(broken.error.length > 0);

  // 5. reload re-reads manifests and entry scripts from storage
  await dropIn(bridge, makePluginZip({ version: '2.0.0' }));
  await host.install({ overwrite: true });
  const reloaded = await host.reload();
  assert.equal(reloaded.find((item) => item.id === 'alpha').version, '2.0.0');

  // 6. uninstall removes files, index entry and the disabled flag
  const removed = await host.uninstall('alpha');
  assert.equal(removed.removed, true);
  assert.equal(bridge.files.has('plugins/alpha/plugin.json'), false);
  assert.equal(removed.list.some((item) => item.id === 'alpha'), false);
  const index = JSON.parse(bridge.files.get('plugins/index.json').text);
  assert.deepEqual(index.map((item) => item.id).sort(), ['broken']);

  // 7. validation: nested folder, missing icon, bad id, traversal, empty zip
  const nested = createFakeBridge();
  const nestedHost = makeHost(nested).host;
  await dropIn(nested, makePluginZip({ id: 'nested' }, 'my-plugin/'));
  assert.equal((await nestedHost.install()).installed, true);
  assert.ok(nested.files.has('plugins/nested/index.js'));

  const noIcon = zipSync({
    'plugin.json': strToU8(JSON.stringify(pluginManifest({ id: 'noicon', icon: '' }))),
    'index.js': strToU8('module.exports = {};')
  });
  await dropIn(nested, noIcon);
  await assert.rejects(() => nestedHost.install(), /缺少图标文件/);

  const badId = zipSync({
    'plugin.json': strToU8(JSON.stringify(pluginManifest({ id: '../bad' }))),
    'index.js': strToU8('module.exports = {};'),
    'assets/icon.svg': strToU8('<svg/>')
  });
  await dropIn(nested, badId);
  await assert.rejects(() => nestedHost.install(), /Invalid plugin id/);

  const traversal = zipSync({
    'plugin.json': strToU8(JSON.stringify(pluginManifest({ id: 'evil' }))),
    'index.js': strToU8('module.exports = {};'),
    'assets/icon.svg': strToU8('<svg/>'),
    '../escape.js': strToU8('x')
  });
  await dropIn(nested, traversal);
  await assert.rejects(() => nestedHost.install(), /非法路径/);

  await dropIn(nested, zipSync({ 'readme.md': strToU8('hi') }));
  await assert.rejects(() => nestedHost.install(), /plugin\.json/);

  // 8. entry scripts really run and can log
  const logsBridge = createFakeBridge();
  const logs = [];
  const logsHost = makeHost(logsBridge, { logs }).host;
  await dropIn(logsBridge, makePluginZip({ id: 'logger' }));
  await logsHost.install();
  assert.ok(logs.some((line) => line.includes('alpha-active')), `logs: ${logs.join(' | ')}`);

  fs.rmSync(outfile, { force: true });
  console.log('android plugin host tests passed');
}

main().catch((error) => {
  console.error(error);
  fs.rmSync(outfile, { force: true });
  process.exitCode = 1;
});
