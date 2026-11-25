'use strict';

/**
 * 检查更新的纯逻辑：解析 tag、比较版本、挑选本平台产物、拼下载地址。
 *
 * 主进程（桌面）与渲染进程（Android）共用同一套判定，避免两端行为不一致。
 * 这里只做纯计算，不发起任何网络请求；真正的 HTTP 由各平台自己实现。
 */

const REPO = 'XingL-Alp0/MoReader';
const GITHUB = 'https://github.com';
const PROXY = 'https://gh-proxy.com/';

/** GitHub Releases 的 latest 接口：不含草稿与预发布。 */
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;

/** tag 只接受 v1.2.3 这种形式，其余一律视为不可信。 */
const TAG_RE = /^v(\d+)\.(\d+)\.(\d+)$/;

/** 产物名只允许这些字符，避免把响应里的字符串拼进 URL。 */
const ASSET_NAME_RE = /^[A-Za-z0-9._-]+$/;

/**
 * 依次尝试的接口地址：先走加速代理（国内可达），失败再直连 GitHub。
 * 两个地址返回的内容相同，代理只做转发。
 */
function apiCandidates() {
  return [PROXY + API_URL, API_URL];
}

/** 把 tag 解析成 [major, minor, patch]；非法返回 null。 */
function parseTag(tag) {
  const match = TAG_RE.exec(String(tag || '').trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * 比较两个点分版本号：a > b 返回 1，相等返回 0，a < b 返回 -1。
 * 只比较前三位，缺位补 0；无法解析的部分忽略。
 */
function compareVersions(a, b) {
  const left = String(a || '').match(/\d+/g) || [];
  const right = String(b || '').match(/\d+/g) || [];
  for (let index = 0; index < 3; index += 1) {
    const l = Number(left[index] || 0);
    const r = Number(right[index] || 0);
    if (l !== r) return l > r ? 1 : -1;
  }
  return 0;
}

/** 本平台安装包的文件名规则；未发布该平台时返回 null。 */
function assetPattern(platform) {
  if (platform === 'android') return /^MoRead-Android-[\w.-]*\.apk$/i;
  if (platform === 'win32') return /^MoRead-Setup-[\w.-]*\.exe$/i;
  return null;
}

/**
 * 从 release 的 assets 里挑本平台的安装包。
 * 优先选文件名里带本次版本号的（历史 release 可能挂多份）。
 */
function pickAsset(assets, platform, latestVersion) {
  const pattern = assetPattern(platform);
  if (!pattern) return null;
  const list = Array.isArray(assets) ? assets : [];
  const matches = list.filter((asset) => asset && pattern.test(String(asset.name || '')));
  if (!matches.length) return null;
  const versioned = latestVersion
    ? matches.find((asset) => String(asset.name).includes(latestVersion))
    : null;
  const chosen = versioned || matches[0];
  return { name: String(chosen.name), size: Number(chosen.size) || 0 };
}

/**
 * 自己拼下载地址，不直接采用响应里的 browser_download_url：
 * 只用经过校验的 tag 与产物名，域名固定，proxy 只做前缀。
 */
function buildDownloadUrls(tag, name) {
  if (!ASSET_NAME_RE.test(String(name || '')) || !parseTag(tag)) return null;
  const direct = `${GITHUB}/${REPO}/releases/download/${tag}/${name}`;
  return { direct, proxied: PROXY + direct };
}

/**
 * 把 GitHub release 响应规整成 UI 需要的结构。
 * 响应可能来自第三方代理，因此所有字段都做校验后再用。
 */
function normalizeRelease(release, currentVersion, platform) {
  const current = String(currentVersion || '0.0.0');
  if (!release || typeof release !== 'object') {
    return { ok: false, error: '更新服务返回的数据无法识别', currentVersion: current };
  }

  const tag = String(release.tag_name || '').trim();
  const parsed = parseTag(tag);
  if (!parsed) {
    return { ok: false, error: '更新服务返回的版本号无法识别', currentVersion: current };
  }

  const latestVersion = parsed.join('.');
  const updateAvailable = compareVersions(latestVersion, current) > 0;
  const asset = pickAsset(release.assets, platform, latestVersion);
  const urls = asset ? buildDownloadUrls(tag, asset.name) : null;

  return {
    ok: true,
    currentVersion: current,
    latestVersion,
    latestTag: tag,
    updateAvailable,
    assetName: asset ? asset.name : '',
    assetSize: asset ? asset.size : 0,
    // 优先给加速地址；直连地址留作兜底。
    downloadUrl: urls ? urls.proxied : '',
    downloadUrlDirect: urls ? urls.direct : '',
    pageUrl: `${GITHUB}/${REPO}/releases/tag/${tag}`,
    publishedAt: String(release.published_at || ''),
    notes: String(release.body || '').slice(0, 600)
  };
}

module.exports = {
  REPO,
  API_URL,
  apiCandidates,
  parseTag,
  compareVersions,
  pickAsset,
  buildDownloadUrls,
  normalizeRelease
};
