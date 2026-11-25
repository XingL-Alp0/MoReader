'use strict';

/**
 * Pack one plugin directory into an installable .zip.
 *
 *   node scripts/pack-plugin.js plugins/moread-office
 *   npm run pack:plugin -- plugins/moread-office
 *
 * Output: release/<id>-<version>.zip with plugin.json at the archive root,
 * which is what 「设置 → 插件管理 → 安装插件（.zip）」 expects.
 */

const fs = require('node:fs');
const path = require('node:path');
const { zipSync } = require('fflate');

const root = path.resolve(__dirname, '..');
const target = path.resolve(root, process.argv[2] || 'plugins/moread-office');

function collect(dir, prefix = '') {
  const files = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(files, collect(full, rel));
    else if (entry.isFile()) files[rel] = new Uint8Array(fs.readFileSync(full));
  }
  return files;
}

function main() {
  const manifestPath = path.join(target, 'plugin.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`没有 plugin.json：${manifestPath}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!/^[a-z][a-z0-9._-]{1,63}$/.test(manifest.id || '')) throw new Error('plugin.json 的 id 不合法');

  const files = collect(target);
  if (!files['plugin.json']) throw new Error('plugin.json 必须在包根目录');
  const archive = zipSync(files, { level: 9 });

  const outDir = path.join(root, 'release');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${manifest.id}-${manifest.version || '0.0.0'}.zip`);
  fs.writeFileSync(out, Buffer.from(archive));
  console.log(`${out} (${archive.length} bytes, ${Object.keys(files).length} files)`);
  return out;
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
