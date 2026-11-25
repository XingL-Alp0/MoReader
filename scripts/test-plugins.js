'use strict';

/**
 * Headless tests for the desktop plugin manager (no Electron needed).
 * Run with: node scripts/test-plugins.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { PluginManager, normalizeManifest } = require('../src/main/plugins');
const { writeZip } = require('../src/main/zip');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moread-plugin-test-'));
const appPath = path.join(root, 'app');
const userData = path.join(root, 'user');
const appPlugins = path.join(appPath, 'plugins');
const userPlugins = path.join(userData, 'plugins');

const logs = [];
const warnings = [];
const logger = {
  log: (...args) => logs.push(args.join(' ')),
  warn: (...args) => warnings.push(args.join(' '))
};

function createStore(initial = {}) {
  const data = { disabledPlugins: [], ...initial };
  return {
    data,
    get: (key) => (key ? data[key] : { ...data }),
    set: (patch) => Object.assign(data, patch)
  };
}

async function writePlugin(baseDir, id, entrySource, manifest = {}) {
  const dir = path.join(baseDir, id);
  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(
    path.join(dir, 'plugin.json'),
    JSON.stringify({
      id,
      name: `Plugin ${id}`,
      version: '1.0.0',
      entry: 'index.js',
      elements: [],
      buttons: [],
      ...manifest
    }),
    'utf8'
  );
  await fsp.writeFile(path.join(dir, 'index.js'), entrySource, 'utf8');
  return dir;
}

function makeZip(entries) {
  return writeZip(entries.map(([name, data]) => ({ name, data })));
}

function find(manager, id) {
  return manager.list().find((item) => item.id === id);
}

async function main() {
  const store = createStore();
  const manager = new PluginManager({ appPath, userData, store, logger });

  // 1. discover + load an app plugin
  await writePlugin(appPlugins, 'alpha', `module.exports = { activate(plugin) { plugin.log('alpha-active'); } };`);
  await manager.discover();
  let alpha = find(manager, 'alpha');
  assert.equal(alpha.source, 'app');
  assert.equal(alpha.enabled, true);
  assert.equal(alpha.loaded, false);

  await manager.loadEnabled();
  alpha = find(manager, 'alpha');
  assert.equal(alpha.loaded, true);
  assert.ok(logs.some((line) => line.includes('alpha-active')));

  // 1b. declared resources become file URLs; invalid/missing ones are dropped
  await writePlugin(appPlugins, 'asset-plugin', `module.exports = {};`, {
    resources: {
      wave: 'assets/wave.svg',
      missing: 'assets/none.svg',
      bad: '../escape.svg',
      'Bad Key': 'assets/wave.svg'
    }
  });
  await fsp.mkdir(path.join(appPlugins, 'asset-plugin', 'assets'), { recursive: true });
  await fsp.writeFile(path.join(appPlugins, 'asset-plugin', 'assets', 'wave.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>', 'utf8');
  await manager.refresh();
  const assetPlugin = find(manager, 'asset-plugin');
  assert.equal(assetPlugin.resources.wave.startsWith('file:'), true);
  assert.equal(assetPlugin.resources.wave.includes('assets/wave.svg'), true);
  assert.equal('missing' in assetPlugin.resources, false);
  assert.equal('bad' in assetPlugin.resources, false);
  assert.equal('Bad Key' in assetPlugin.resources, false);

  // 2. disable unloads and records the id
  await manager.setEnabled('alpha', false);
  alpha = find(manager, 'alpha');
  assert.equal(alpha.enabled, false);
  assert.equal(alpha.loaded, false);
  assert.deepEqual(store.get('disabledPlugins'), ['alpha']);

  // 3. refresh re-runs the entry script (hot reload)
  const dir = path.join(appPlugins, 'alpha');
  await fsp.writeFile(
    path.join(dir, 'index.js'),
    `module.exports = { activate(plugin) { plugin.log('alpha-active-v2'); } };`,
    'utf8'
  );
  await manager.setEnabled('alpha', true);
  await manager.refresh();
  assert.ok(logs.some((line) => line.includes('alpha-active-v2')), 'refresh must reload the entry script');
  assert.equal(find(manager, 'alpha').loaded, true);

  // 4. broken plugins surface their error without blocking others
  await fsp.mkdir(path.join(appPlugins, 'broken'), { recursive: true });
  await fsp.writeFile(
    path.join(appPlugins, 'broken', 'plugin.json'),
    JSON.stringify({ id: 'broken', name: 'Broken', version: '1.0.0', entry: 'missing.js' }),
    'utf8'
  );
  await manager.refresh();
  const broken = find(manager, 'broken');
  assert.ok(broken.error.includes('Plugin entry missing'), `unexpected error: ${broken.error}`);
  assert.equal(find(manager, 'alpha').loaded, true);

  // 5. install from a zip into the user directory
  const betaZip = makeZip([
    ['plugin.json', JSON.stringify({ id: 'beta', name: 'Beta', version: '1.0.0', entry: 'index.js', icon: 'assets/icon.svg', buttons: [{ id: 'b', label: 'B', script: 'app.toast("b")' }] })],
    ['index.js', `module.exports = { activate(plugin) { plugin.log('beta-active'); } };`],
    ['assets/icon.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>']
  ]);
  const zipPath = path.join(root, 'beta.zip');
  await fsp.writeFile(zipPath, betaZip);
  const installed = await manager.installFromZip(zipPath);
  assert.equal(installed.installed, true);
  assert.equal(installed.id, 'beta');
  assert.equal(fs.existsSync(path.join(userPlugins, 'beta', 'assets', 'icon.svg')), true);
  await manager.refresh();
  const beta = find(manager, 'beta');
  assert.equal(beta.source, 'user');
  assert.equal(beta.loaded, true);
  assert.equal(beta.iconUrl.startsWith('file:'), true);
  assert.equal(beta.iconType, 'svg');

  // 6. installing the same id conflicts until overwrite is requested
  const betaV2 = makeZip([
    ['plugin.json', JSON.stringify({ id: 'beta', name: 'Beta', version: '1.1.0', entry: 'index.js', icon: 'assets/icon.svg' })],
    ['index.js', `module.exports = { activate(plugin) { plugin.log('beta-active-v2'); } };`],
    ['assets/icon.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>']
  ]);
  const zipV2 = path.join(root, 'beta-v2.zip');
  await fsp.writeFile(zipV2, betaV2);
  const conflict = await manager.installFromZip(zipV2);
  assert.equal(conflict.conflict, true);
  assert.equal(conflict.existing, '1.0.0');
  const upgraded = await manager.installFromZip(zipV2, { overwrite: true });
  assert.equal(upgraded.installed, true);
  await manager.refresh();
  assert.equal(find(manager, 'beta').version, '1.1.0');
  assert.ok(logs.some((line) => line.includes('beta-active-v2')));

  // 7. installing a user copy of an app plugin shadows the bundled one
  const alphaZip = makeZip([
    ['plugin.json', JSON.stringify({ id: 'alpha', name: 'Alpha (user)', version: '9.0.0', entry: 'index.js', icon: 'assets/icon.svg' })],
    ['index.js', `module.exports = { activate(plugin) { plugin.log('alpha-user'); } };`],
    ['assets/icon.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>']
  ]);
  const alphaZipPath = path.join(root, 'alpha.zip');
  await fsp.writeFile(alphaZipPath, alphaZip);
  const shadow = await manager.installFromZip(alphaZipPath);
  assert.equal(shadow.shadowed, true);
  await manager.refresh();
  assert.equal(find(manager, 'alpha').source, 'user');
  assert.equal(find(manager, 'alpha').name, 'Alpha (user)');

  // 8. zip path traversal and missing manifests are rejected
  const evilZip = makeZip([
    ['plugin.json', JSON.stringify({ id: 'evil', name: 'Evil', version: '1.0.0', entry: 'index.js', icon: 'assets/icon.svg' })],
    ['index.js', 'module.exports = {};'],
    ['assets/icon.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>'],
    ['../evil.js', 'oops']
  ]);
  const evilPath = path.join(root, 'evil.zip');
  await fsp.writeFile(evilPath, evilZip);
  await assert.rejects(() => manager.installFromZip(evilPath), /非法路径/);

  const emptyZip = path.join(root, 'empty.zip');
  await fsp.writeFile(emptyZip, makeZip([['readme.md', 'hi']]));
  await assert.rejects(() => manager.installFromZip(emptyZip), /plugin\.json/);

  // 8b. a new install must declare an icon file that exists in the archive
  const noIconPath = path.join(root, 'no-icon.zip');
  await fsp.writeFile(
    noIconPath,
    makeZip([
      ['plugin.json', JSON.stringify({ id: 'noicon', name: 'No icon', version: '1.0.0', entry: 'index.js' })],
      ['index.js', 'module.exports = {};']
    ])
  );
  await assert.rejects(() => manager.installFromZip(noIconPath), /缺少图标文件/);

  const missingIconPath = path.join(root, 'missing-icon.zip');
  await fsp.writeFile(
    missingIconPath,
    makeZip([
      ['plugin.json', JSON.stringify({ id: 'missingicon', name: 'Missing icon', version: '1.0.0', entry: 'index.js', icon: 'assets/icon.svg' })],
      ['index.js', 'module.exports = {};']
    ])
  );
  await assert.rejects(() => manager.installFromZip(missingIconPath), /图标文件不存在/);

  const hugeIconPath = path.join(root, 'huge-icon.zip');
  await fsp.writeFile(
    hugeIconPath,
    makeZip([
      ['plugin.json', JSON.stringify({ id: 'hugeicon', name: 'Huge icon', version: '1.0.0', entry: 'index.js', icon: 'assets/icon.svg' })],
      ['index.js', 'module.exports = {};'],
      ['assets/icon.svg', 'x'.repeat(512 * 1024 + 1)]
    ])
  );
  await assert.rejects(() => manager.installFromZip(hugeIconPath), /超过 512 KB/);

  const missingRendererPath = path.join(root, 'missing-renderer.zip');
  await fsp.writeFile(
    missingRendererPath,
    makeZip([
      ['plugin.json', JSON.stringify({ id: 'rendererless', name: 'No renderer', version: '1.0.0', entry: 'index.js', icon: 'assets/icon.svg', renderer: 'ui.js' })],
      ['index.js', 'module.exports = {};'],
      ['assets/icon.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>']
    ])
  );
  await assert.rejects(() => manager.installFromZip(missingRendererPath), /缺少界面脚本/);

  // 9. uninstall only works for user plugins
  await assert.rejects(() => manager.uninstall('broken'), /内置插件不能卸载/);
  const removed = await manager.uninstall('beta');
  assert.equal(removed, true);
  await manager.refresh();
  assert.equal(find(manager, 'beta'), undefined);
  assert.equal(fs.existsSync(path.join(userPlugins, 'beta')), false);

  // 10. manifest rules
  assert.throws(() => normalizeManifest({ id: '../bad' }, root), /Invalid plugin id/);
  assert.throws(() => normalizeManifest({ id: 'ok', entry: '../x.js' }, root), /Invalid plugin entry/);
  const normalized = normalizeManifest(
    {
      id: 'ok',
      name: 'OK',
      icon: '▣',
      elements: [{
        name: 'note',
        html: '<b>{a}</b>',
        fields: [
          { key: 'title', label: '标题', type: 'text' },
          { key: 'bad key', type: 'text' },
          { key: 'style', type: 'select', options: ['a', { value: 'b', label: 'B' }] }
        ]
      }]
    },
    path.join(root, 'ok')
  );
  assert.equal(normalized.entry, 'index.js');
  assert.equal(normalized.icon, '▣');
  assert.equal(normalized.iconFile, '');
  const fileIcon = normalizeManifest({ id: 'ok', icon: 'assets/icon.svg' }, path.join(root, 'ok'));
  assert.equal(fileIcon.iconFile, 'assets/icon.svg');
  assert.equal(fileIcon.icon, '');
  const fileIcon2 = normalizeManifest({ id: 'ok', icon: '▣', iconFile: 'assets/icon.png' }, path.join(root, 'ok'));
  assert.equal(fileIcon2.icon, '▣');
  assert.equal(fileIcon2.iconFile, 'assets/icon.png');
  const objectIcon = normalizeManifest({ id: 'ok', icon: { file: 'assets/icon.webp', glyph: '◇' } }, path.join(root, 'ok'));
  assert.equal(objectIcon.icon, '◇');
  assert.equal(objectIcon.iconFile, 'assets/icon.webp');
  const badIcon = normalizeManifest({ id: 'ok', icon: '../escape.svg' }, path.join(root, 'ok'));
  assert.equal(badIcon.iconFile, '');
  const rendererManifest = normalizeManifest({ id: 'ok', renderer: 'ui.js' }, path.join(root, 'ok'));
  assert.equal(rendererManifest.renderer, 'ui.js');
  const noRenderer = normalizeManifest({ id: 'ok' }, path.join(root, 'ok'));
  assert.equal(noRenderer.renderer, '');
  assert.throws(() => normalizeManifest({ id: 'ok', renderer: '../ui.js' }, path.join(root, 'ok')), /Invalid plugin renderer/);
  assert.equal(normalized.elements[0].name, 'note');
  assert.equal(normalized.elements[0].fields.length, 2);
  assert.deepEqual(normalized.elements[0].fields[1].options, [
    { value: 'a', label: 'a' },
    { value: 'b', label: 'B' }
  ]);

  // 10b. plugin commands: ids/labels/scripts are required, unknown groups fall back to tools
  const withCommands = normalizeManifest(
    {
      id: 'cmds',
      commands: [
        { id: 'import-docx', label: '导入 Word', group: 'import', icon: 'file-down', script: 'app.toast(1)' },
        { id: 'Tool X', label: '坏 id', script: 'x' },
        { id: 'export-pdf', label: '导出 PDF', group: 'nope', script: 'app.exportPdf()' },
        { id: 'no-script', label: '缺脚本' }
      ]
    },
    path.join(root, 'cmds')
  );
  assert.equal(withCommands.commands.length, 2);
  assert.equal(withCommands.commands[0].id, 'import-docx');
  assert.equal(withCommands.commands[0].group, 'import');
  assert.equal(withCommands.commands[0].icon, 'file-down');
  assert.equal(withCommands.commands[1].group, 'tools');
  assert.equal(withCommands.commands[1].label, '导出 PDF');

  await fsp.rm(root, { recursive: true, force: true });
  console.log('plugin manager tests passed');
}

main().catch(async (error) => {
  console.error(error);
  await fsp.rm(root, { recursive: true, force: true }).catch(() => {});
  process.exitCode = 1;
});