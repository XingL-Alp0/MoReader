// 生成主题包的视觉预览（不参与导入，仅用于检查）
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import footnote from "markdown-it-footnote";

const here = path.dirname(fileURLToPath(import.meta.url));
const packDir = path.resolve(here, "..");
const appDir = path.resolve(packDir, "../..");
const appStyles = path.join(appDir, "src/renderer/styles.css");

const toFileUrl = (p) => "file:///" + p.replace(/\\/g, "/").replace(/ /g, "%20");

const pack = JSON.parse(fs.readFileSync(path.join(packDir, "theme.json"), "utf8"));
const homeMd = fs.readFileSync(path.join(packDir, "home.md"), "utf8");
let css = fs.readFileSync(path.join(packDir, "style.css"), "utf8");
const icon = pack.theme.brandIcon.value;
const sticker = pack.theme.stickers.find((item) => item.type === "image").value;

css = css.replace(/url\(\s*(["']?)assets\/([^)"']+)\1\s*\)/g, (_m, _q, name) =>
  `url("${toFileUrl(path.join(packDir, "assets", name))}")`
);

/* ---- 复刻 theme.js / app.js 里 applyTheme + applyComponentColors 的结果 ---- */
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const normalizeHex = (value) => {
  let hex = String(value || "").trim();
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    hex = "#" + hex.slice(1).split("").map((c) => c + c).join("");
  }
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`bad hex ${value}`);
  return hex.toLowerCase();
};
const hexToRgb = (hex) => {
  const v = normalizeHex(hex).slice(1);
  return { r: parseInt(v.slice(0, 2), 16), g: parseInt(v.slice(2, 4), 16), b: parseInt(v.slice(4, 6), 16) };
};
const rgbToHex = ({ r, g, b }) =>
  "#" + [r, g, b].map((p) => clamp(Math.round(p), 0, 255).toString(16).padStart(2, "0")).join("");
const mix = (first, second, weight = 0.5) => {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  const t = clamp(weight, 0, 1);
  return rgbToHex({ r: a.r * t + b.r * (1 - t), g: a.g * t + b.g * (1 - t), b: a.b * t + b.b * (1 - t) });
};
const luminance = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  const ch = (p) => { const v = p / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
};
const contrastInk = (hex) => (luminance(hex) > 0.58 ? "#211c16" : "#fffaf2");

const theme = pack.theme;
const primary = normalizeHex(theme.primary);
const secondary = normalizeHex(theme.secondary);
const paper = "#1b1814"; // buildPalette 里的深色基准纸
const paletteVars = {
  "--accent": primary,
  "--accent-strong": mix("#ffffff", primary, 0.1),
  "--accent-contrast": contrastInk(primary),
  "--accent-soft": mix(primary, paper, 0.28),
  "--accent-wash": mix(primary, paper, 0.14),
  "--gold": secondary,
  "--selection": mix(primary, paper, 0.42),
  "--titlebar-tint": mix(primary, "#171411", 0.025)
};

const COMPONENT_VARS = {
  appBg: "--bg", titlebarBg: "--titlebar", sidebarBg: "--sidebar", surfaceBg: "--surface",
  editorBg: "--editor-bg", paperBg: "--paper", paperSoft: "--paper-soft", statusBg: "--status-bg",
  ink: "--ink", inkSoft: "--ink-soft", muted: "--muted", faint: "--faint",
  line: "--line", lineSoft: "--line-soft", codeBg: "--code-bg", codeInk: "--code-ink",
  codeHead: "--code-head", tableHead: "--table-head", quoteBg: "--quote-bg", selection: "--selection"
};
const inlineVars = { ...paletteVars };
for (const [key, varName] of Object.entries(COMPONENT_VARS)) {
  if (theme.componentColors[key]) inlineVars[varName] = theme.componentColors[key];
}
// applyComponentColors：写了标题栏底色就移除 tint
if (theme.componentColors.titlebarBg) delete inlineVars["--titlebar-tint"];
inlineVars["--bg-deep"] = mix("#000000", theme.componentColors.appBg, 0.12);
const htmlStyle = Object.entries(inlineVars).map(([k, v]) => `${k}:${v}`).join(";");

const md = new MarkdownIt({ html: true, linkify: true, typographer: true, breaks: false });
md.use(taskLists, { enabled: false, label: false });
md.use(footnote);

md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  const lang = (token.info || "").trim().split(/\s+/)[0] || "text";
  const code = md.utils.escapeHtml(token.content);
  return `<div class="code-block"><div class="code-head"><span class="code-lang">${lang}</span><span class="code-actions"><span class="code-copy">复制</span></span></div><pre><code class="hljs">${code}</code></pre></div>`;
};

function render(markdown) {
  return md
    .render(markdown)
    .replace(/src="assets\/([^"]+)"/g, (_m, name) => `src="${toFileUrl(path.join(packDir, "assets", name))}"`);
}

const row = (center) => `
  <div class="statusbar">
    <div class="status-left"><span>1,284 字</span><span class="status-sep"></span><span>86 行</span></div>
    <div class="status-center">${center}</div>
    <div class="status-right"><span>UTF-8</span><span class="status-sep"></span><span>Markdown</span></div>
  </div>`;

const titlebar = (title) => `
  <header class="titlebar">
    <div class="brand">
      <span class="brand-mark"><img src="${icon}" alt=""></span>
      <div class="brand-text"><span class="brand-name">墨阅</span><span class="brand-sub">MoRead</span></div>
    </div>
    <div class="window-title">${title}</div>
    <div class="titlebar-actions"><span class="window-controls-spacer"></span></div>
  </header>`;

const readingSample = `# 书库的窗朝西

黄昏的时候，整排书架会先亮起来。**星璃**说那是*借来的月光*，先存在书脊里，等夜里再慢慢用。

> 书页翻动的声音，有点像远处的潮水。
> 所以读完一段，最好停一停。

## 今日清单

- [x] 把《星图》第三章读完
- [ ] 给月牙灯换一根灯芯
- [ ] 记下两个不认识的词

## 一张对照表

| 时刻 | 光色 | 适合读 |
| --- | --- | --- |
| 黄昏 | 琥珀 | 书信、旧日记 |
| 入夜 | 靛蓝 | 长篇 |
| 深夜 | 银白 | 诗 |

\`\`\`js
const shelf = ["星图", "潮汐", "旧信"];
for (const title of shelf) {
  console.log(\`\${title} · 已归位\`);
}
\`\`\`

---

### 页边批注

行内代码 \`app.insert()\` 与 [主题制作指南](https://example.com) 都放在这里。`;

function page(title, height, body) {
  return `<!doctype html>
<html lang="zh-CN" data-theme="dark" style="${htmlStyle}">
<head>
<meta charset="utf-8">
<title>${title}</title>
<link rel="stylesheet" href="${toFileUrl(appStyles)}">
<style>${css}</style>
<style>
  html, body { margin: 0; width: 1280px; height: ${height}px; overflow: hidden; background: var(--bg); }
  .frame { width: 1280px; height: ${height}px; display: flex; flex-direction: column; overflow: hidden;
           position: relative; background: var(--bg); }
  .frame .sticker-layer { position: absolute; inset: 48px 0 0 0; }
  .window-controls-spacer { display: block; width: 120px; }
</style>
</head>
<body>${body}</body></html>`;
}

const sidebarHtml = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-actions">
        <button class="btn btn-primary"><span>＋</span><span>新建文档</span><span class="shortcut-hint">Ctrl N</span></button>
        <button class="btn btn-ghost"><span>▤</span><span>打开</span></button>
      </div>
      <div class="sidebar-scroll">
        <section class="side-section">
          <div class="section-heading"><span>最近打开</span><button class="text-btn">清空</button></div>
          <div class="recent-list">
            <button class="recent-item active">
              <span class="recent-icon">◇</span>
              <span class="recent-meta"><span class="recent-name">星月书库.md</span><span class="recent-time">刚刚 · 12 KB</span></span>
            </button>
            <button class="recent-item">
              <span class="recent-icon">◇</span>
              <span class="recent-meta"><span class="recent-name">夜读笔记.md</span><span class="recent-time">昨天 · 4 KB</span></span>
            </button>
            <button class="recent-item">
              <span class="recent-icon">◇</span>
              <span class="recent-meta"><span class="recent-name">星图第三章.md</span><span class="recent-time">11-09 · 28 KB</span></span>
            </button>
          </div>
        </section>
        <section class="side-section outline-section">
          <div class="section-heading"><span>文档大纲</span><span class="section-count">4</span></div>
          <div class="outline-list">
            <button class="outline-item" data-level="1">书库的窗朝西</button>
            <button class="outline-item" data-level="2">今日清单</button>
            <button class="outline-item" data-level="2">一张对照表</button>
            <button class="outline-item" data-level="3">页边批注</button>
          </div>
        </section>
      </div>
      <div class="sidebar-footer">
        <div class="sidebar-version">MoRead <span>1.0.0</span></div>
      </div>
    </aside>`;

const tabbarHtml = `
      <div class="tabbar">
        <div class="tabs">
          <button class="tab active"><span class="tab-name">星月书库.md</span></button>
          <button class="tab"><span class="tab-name">夜读笔记.md</span></button>
        </div>
        <div class="tabbar-actions">
          <button class="btn btn-ghost" style="height:28px">阅读</button>
          <button class="btn btn-ghost" style="height:28px">分栏</button>
          <button class="btn btn-ghost" style="height:28px">编辑</button>
        </div>
      </div>`;

const stickerHtml = (scope) =>
  pack.theme.stickers
    .filter((item) => item.scope === scope || item.scope === "always")
    .map((item) => {
      const inner = item.type === "image" ? `<img src="${item.value}" alt="">` : item.value;
      return `<div class="sticker" style="left:${item.x}%;top:${item.y}%;font-size:${item.size}px;transform:translate(-50%,-50%) rotate(${item.rotation}deg)">${inner}</div>`;
    })
    .join("\n    ");

const welcomeBody = (height) => `
<div class="frame">
  ${titlebar("星璃 · 星月书库")}
  <div class="shell">
    ${sidebarHtml}
    <main class="workspace">
      ${tabbarHtml}
      <div class="content">
        <section class="welcome is-custom-home">
          <div class="custom-home markdown-body">${render(homeMd)}</div>
        </section>
      </div>
      ${row("第 1 行，第 1 列")}
    </main>
  </div>
  <div class="sticker-layer">
    ${stickerHtml("welcome")}
  </div>
</div>`;

const readingBody = `
<div class="frame">
  ${titlebar("书库的窗朝西.md")}
  <div class="shell">
    ${sidebarHtml}
    <main class="workspace">
      ${tabbarHtml}
      <div class="content">
        <div class="preview-pane">
          <article class="markdown-body">${render(readingSample)}</article>
        </div>
      </div>
      ${row("第 1 行，第 1 列")}
    </main>
  </div>
</div>`;

fs.writeFileSync(path.join(here, "preview_welcome.html"), page("星璃 — 欢迎页", 820, welcomeBody(820)), "utf8");
fs.writeFileSync(path.join(here, "preview_home_full.html"), page("星璃 — 主页全览", 2200, welcomeBody(2200)), "utf8");
fs.writeFileSync(path.join(here, "preview_reading.html"), page("星璃 — 阅读页", 820, readingBody), "utf8");
console.log("preview html written", Object.keys(inlineVars).length, "vars");
