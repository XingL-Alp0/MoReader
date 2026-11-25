'use strict';

/**
 * 检查更新纯逻辑的单元测试：版本解析、比较、产物挑选与地址拼接。
 * Run with: node scripts/test-update-check.js
 */

const assert = require('node:assert/strict');
const {
  apiCandidates,
  parseTag,
  compareVersions,
  pickAsset,
  buildDownloadUrls,
  normalizeRelease
} = require('../src/shared/update-check');

function releaseFixture(overrides = {}) {
  return {
    tag_name: 'v1.2.0',
    published_at: '2026-11-25T00:00:00Z',
    body: 'notes',
    assets: [
      { name: 'MoRead-Setup-1.2.0.exe', size: 100 },
      { name: 'MoRead-Setup-1.2.0.exe.blockmap', size: 1 },
      { name: 'MoRead-Android-1.2.0.apk', size: 50 }
    ],
    ...overrides
  };
}

// 1. tag 只认 vX.Y.Z
assert.deepEqual(parseTag('v1.2.3'), [1, 2, 3]);
assert.equal(parseTag('1.2.3'), null);
assert.equal(parseTag('v1.2'), null);
assert.equal(parseTag('vv1.2.3'), null);
assert.equal(parseTag(''), null);
assert.equal(parseTag(null), null);

// 2. 版本比较
assert.equal(compareVersions('1.2.0', '1.0.3'), 1);
assert.equal(compareVersions('1.0.3', '1.2.0'), -1);
assert.equal(compareVersions('1.2.0', '1.2.0'), 0);
assert.equal(compareVersions('1.2', '1.2.0'), 0);
assert.equal(compareVersions('1.10.0', '1.9.9'), 1);

// 3. 候选地址：代理在前、直连在后，且都带 /releases/latest
const candidates = apiCandidates();
assert.equal(candidates.length, 2);
assert.ok(candidates[0].startsWith('https://gh-proxy.com/'));
assert.ok(candidates[1].startsWith('https://api.github.com/'));
assert.ok(candidates.every((url) => url.endsWith('/repos/XingL-Alp0/MoReader/releases/latest')));

// 4. 按平台挑产物，且不能把 blockmap 当成安装包
assert.equal(pickAsset(releaseFixture().assets, 'win32', '1.2.0').name, 'MoRead-Setup-1.2.0.exe');
assert.equal(pickAsset(releaseFixture().assets, 'android', '1.2.0').name, 'MoRead-Android-1.2.0.apk');
assert.equal(pickAsset([], 'win32', '1.2.0'), null);
assert.equal(pickAsset([{ name: 'other.zip' }], 'win32', '1.2.0'), null);

// 5. 下载地址自己拼，拒绝可疑产物名
const urls = buildDownloadUrls('v1.2.0', 'MoRead-Setup-1.2.0.exe');
assert.equal(
  urls.direct,
  'https://github.com/XingL-Alp0/MoReader/releases/download/v1.2.0/MoRead-Setup-1.2.0.exe'
);
assert.equal(urls.proxied, `https://gh-proxy.com/${urls.direct}`);
assert.equal(buildDownloadUrls('v1.2.0', '../../evil.exe'), null);
assert.equal(buildDownloadUrls('v1.2.0', 'a b.exe'), null);
assert.equal(buildDownloadUrls('not-a-tag', 'MoRead-Setup-1.2.0.exe'), null);

// 6. 汇总：有新版本
const newer = normalizeRelease(releaseFixture(), '1.0.3', 'win32');
assert.equal(newer.ok, true);
assert.equal(newer.latestVersion, '1.2.0');
assert.equal(newer.updateAvailable, true);
assert.equal(newer.assetName, 'MoRead-Setup-1.2.0.exe');
assert.ok(newer.downloadUrl.startsWith('https://gh-proxy.com/https://github.com/'));
assert.equal(newer.pageUrl, 'https://github.com/XingL-Alp0/MoReader/releases/tag/v1.2.0');

// 7. 同版本不算更新
const same = normalizeRelease(releaseFixture(), '1.2.0', 'win32');
assert.equal(same.updateAvailable, false);

// 8. 旧版本不算更新（防止历史 release 顶掉新版本）
const older = normalizeRelease(releaseFixture(), '1.5.0', 'win32');
assert.equal(older.updateAvailable, false);

// 9. 忽略响应里的 browser_download_url，避免被代理改写到任意地址
const injected = normalizeRelease(
  {
    ...releaseFixture(),
    assets: [
      {
        name: 'MoRead-Setup-1.2.0.exe',
        size: 1,
        browser_download_url: 'https://evil.example.com/malware.exe'
      }
    ]
  },
  '1.0.3',
  'win32'
);
assert.ok(!injected.downloadUrl.includes('evil.example.com'));
assert.ok(injected.downloadUrl.includes('github.com/XingL-Alp0/MoReader'));

// 10. 畸形输入不抛异常
assert.equal(normalizeRelease(null, '1.0.0', 'win32').ok, false);
assert.equal(normalizeRelease({ tag_name: 'garbage' }, '1.0.0', 'win32').ok, false);
assert.equal(normalizeRelease({ tag_name: 'v1.2.0' }, '1.0.0', 'win32').assetName, '');
assert.equal(normalizeRelease(releaseFixture(), '1.0.0', 'linux').assetName, '');

// 11. Android 平台不会挑到 Windows 安装包
assert.equal(normalizeRelease(releaseFixture(), '1.0.3', 'android').assetName, 'MoRead-Android-1.2.0.apk');

console.log('update check tests passed');
