// 为每套配色主题生成预览 HTML（不参与导入，仅用于肉眼检查与截图）
// 用法：node preview.mjs   →   _preview/<slug>/{welcome,reading}.html + shots.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import footnote from "markdown-it-footnote";

const here = path.dirname(fileURLToPath(import.meta.url));
const suite = here;
const packsRoot = path.resolve(here, "..");
const appStyles = path.join(packsRoot, "..", "src/renderer/styles.css");
const previewDir = path.join(suite, "_preview");
const manifest = JSON.parse(fs.readFileSync(path.join(here, "_build", "manifest.json"), "utf8"));

const toFileUrl = (p) => "file:///" + p.replace(/\\/g, "/").replace(/ /g, "%20");

/* ---- 复刻 theme.js / app.js：buildPalette + applyPalette + applyComponentColors ---- */
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const normalizeHex = (value, fallback = "#000000") => {
  let hex = String(value || "").trim();
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    hex = "#" + hex.slice(1).split("").map((c) => c + c).join("");
  }
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : fallback;
};
const hexToRgb = (hex) => {
  const value = normalizeHex(hex).slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
};
const rgbToHex = ({ r, g, b }) =>
  "#" + [r, g, b].map((p) => clamp(Math.round(p), 0, 255).toString(16).padStart(2, "0")).join("");
const mix = (first, second, weight = 0.5) => {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  const t = clamp(weight, 0, 1);
  return rgbToHex({ r: a.r * t + b.r * (1 - t), g: a.g * t + b.g * (1 - t), b: a.b * t + b.b * (1 - t) });
};
const lighten = (hex, amount) => mix("#ffffff", hex, amount);
const darken = (hex, amount) => mix("#000000", hex, amount);
const luminance = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  const ch = (p) => {
    const v = p / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
};
const contrastInk = (hex) => (luminance(hex) > 0.58 ? "#211c16" : "#fffaf2");

function buildPalette(primaryInput, secondaryInput, theme = "light") {
  const primary = normalizeHex(primaryInput);
  const secondary = normalizeHex(secondaryInput);
  const dark = theme === "dark";
  const paper = dark ? "#1b1814" : "#fffdf8";
  return {
    primary,
    secondary,
    accent: primary,
    accentStrong: dark ? lighten(primary, 0.1) : darken(primary, 0.13),
    accentContrast: contrastInk(primary),
    accentSoft: mix(primary, paper, dark ? 0.28 : 0.18),
    accentWash: mix(primary, paper, dark ? 0.14 : 0.075),
    gold: secondary,
    selection: mix(primary, paper, dark ? 0.42 : 0.3),
    titlebarTint: mix(primary, dark ? "#171411" : "#f4efe6", dark ? 0.025 : 0.018)
  };
}

const COMPONENT_VARS = {
  appBg: "--bg",
  titlebarBg: "--titlebar",
  sidebarBg: "--sidebar",
  surfaceBg: "--surface",
  editorBg: "--editor-bg",
  paperBg: "--paper",
  paperSoft: "--paper-soft",
  statusBg: "--status-bg",
  ink: "--ink",
  inkSoft: "--ink-soft",
  muted: "--muted",
  faint: "--faint",
  line: "--line",
  lineSoft: "--line-soft",
  codeBg: "--code-bg",
  codeInk: "--code-ink",
  codeHead: "--code-head",
  tableHead: "--table-head",
  quoteBg: "--quote-bg",
  selection: "--selection"
};

const md = new MarkdownIt({ html: true, linkify: true, typographer: true, breaks: false });
md.use(taskLists, { enabled: false, label: false });
md.use(footnote);
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  const lang = (token.info || "").trim().split(/\s+/)[0] || "text";
  const code = md.utils.escapeHtml(token.content);
  return `<div class="code-block"><div class="code-head"><span class="code-lang">${lang}</span><span class="code-actions"><span class="code-copy">复制</span></span></div><pre><code class="hljs">${code}</code></pre></div>`;
};

const escapeHtml = (text) => md.utils.escapeHtml(String(text));

const titlebar = (pack, title) => `
  <header class="titlebar">
    <div class="brand">
      <span class="brand-mark"><img src="${pack.theme.brandIcon.value}" alt=""></span>
      <div class="brand-text"><span class="brand-name">墨阅</span><span class="brand-sub">MoRead</span></div>
    </div>
    <div class="window-title">${escapeHtml(title)}</div>
    <div class="titlebar-actions"><span class="window-controls-spacer"></span></div>
  </header>`;

const sidebarHtml = (pack, entry) => `
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
              <span class="recent-meta"><span class="recent-name">${escapeHtml(entry.readingTitle)}.md</span><span class="recent-time">刚刚 · 6 KB</span></span>
            </button>
            <button class="recent-item">
              <span class="recent-icon">◇</span>
              <span class="recent-meta"><span class="recent-name">配色笔记.md</span><span class="recent-time">昨天 · 3 KB</span></span>
            </button>
            <button class="recent-item">
              <span class="recent-icon">◇</span>
              <span class="recent-meta"><span class="recent-name">${escapeHtml(pack.name)} 说明.md</span><span class="recent-time">11-20 · 2 KB</span></span>
            </button>
          </div>
        </section>
        <section class="side-section outline-section">
          <div class="section-heading"><span>文档大纲</span><span class="section-count">4</span></div>
          <div class="outline-list">
            <button class="outline-item" data-level="1">${escapeHtml(entry.readingTitle)}</button>
            <button class="outline-item" data-level="2">今日清单</button>
            <button class="outline-item" data-level="2">一张对照表</button>
            <button class="outline-item" data-level="3">页边批注</button>
          </div>
        </section>
      </div>
      <div class="sidebar-footer">
        <div class="sidebar-version">MoRead <span>1.0.2</span></div>
      </div>
    </aside>`;

const tabbarHtml = (entry) => `
      <div class="tabbar">
        <div class="tabs">
          <button class="tab active"><span class="tab-name">${escapeHtml(entry.readingTitle)}.md</span></button>
          <button class="tab"><span class="tab-name">配色笔记.md</span></button>
        </div>
        <div class="tabbar-actions">
          <button class="btn btn-ghost" style="height:28px">阅读</button>
          <button class="btn btn-ghost" style="height:28px">分栏</button>
          <button class="btn btn-ghost" style="height:28px">编辑</button>
        </div>
      </div>`;

const statusbar = () => `
  <div class="statusbar">
    <div class="status-left"><span>1,284 字</span><span class="status-sep"></span><span>86 行</span></div>
    <div class="status-center">第 1 行，第 1 列</div>
    <div class="status-right"><span>UTF-8</span><span class="status-sep"></span><span>Markdown</span></div>
  </div>`;

const stickerHtml = (pack, scope) =>
  pack.theme.stickers
    .filter((item) => item.scope === scope || item.scope === "always")
    .map((item) => {
      const inner = item.type === "image" ? `<img src="${item.value}" alt="">` : item.value;
      return `<div class="sticker" style="left:${item.x}%;top:${item.y}%;font-size:${item.size}px;transform:translate(-50%,-50%) rotate(${item.rotation}deg)">${inner}</div>`;
    })
    .join("\n    ");

const dockHtml = (pack) => `
  <div class="custom-dock" id="customDock">
    ${(pack.theme.customButtons || [])
      .map(
        (button) =>
          `<button class="custom-dock-button" title="${escapeHtml(button.label)}">${escapeHtml(button.icon)}</button>`
      )
      .join("\n    ")}
  </div>`;

function inlineVars(pack) {
  const theme = pack.theme;
  const palette = buildPalette(theme.primary, theme.secondary, theme.mode);
  const vars = {
    "--accent": palette.accent,
    "--accent-strong": palette.accentStrong,
    "--accent-contrast": palette.accentContrast,
    "--accent-soft": palette.accentSoft,
    "--accent-wash": palette.accentWash,
    "--gold": palette.gold,
    "--selection": palette.selection,
    "--titlebar-tint": palette.titlebarTint
  };
  for (const [key, varName] of Object.entries(COMPONENT_VARS)) {
    if (theme.componentColors[key]) vars[varName] = theme.componentColors[key];
  }
  if (theme.componentColors.titlebarBg) delete vars["--titlebar-tint"];
  if (theme.componentColors.appBg) {
    vars["--bg-deep"] = darken(theme.componentColors.appBg, theme.mode === "dark" ? 0.12 : 0.055);
  }
  return vars;
}

function page(pack, entry, title, height, body, css) {
  const vars = inlineVars(pack);
  const htmlStyle = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";");
  return `<!doctype html>
<html lang="zh-CN" data-theme="${entry.mode}" style="${htmlStyle}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${toFileUrl(appStyles)}">
<style>${css}</style>
<style>
  html, body { margin: 0; width: 1280px; height: ${height}px; overflow: hidden; background: var(--bg); }
  /* 截图要的是最终状态：禁用入场动画与过渡，避免抓到半透明中间帧 */
  *, *::before, *::after { animation: none !important; transition: none !important; }
  /* 复刻 .app 的网格：48px 标题栏 + 剩余空间，整页截图时外壳会跟着拉高 */
  .app { width: 1280px; height: ${height}px; max-width: 1280px; }
  .app .sticker-layer { position: absolute; inset: 48px 0 0 0; }
  .app .custom-dock { position: absolute; }
  .window-controls-spacer { display: block; width: 120px; }
  /* 阅读模式的实际排版：.panes.mode-read .markdown-body 的 880px / 58px 64px */
  .preview-pane .markdown-body { max-width: 880px; padding: 58px 64px 160px; }
</style>
</head>
<body>${body}</body></html>`;
}

function readingSample(entry) {
  return `# ${entry.readingTitle}

${entry.readingLede}

**${entry.name}** 只做三件事：把纸面调到一个不刺眼的亮度，给强调色留一处干净的位置，再让装饰在需要的时候才出现。

> ${entry.quote}

## 今日清单

- [x] 把这套主题导进墨阅
- [ ] 换一张壁纸试试
- [ ] 把常用按钮拖到底栏

## 一张对照表

| 时刻 | 光色 | 适合读 |
| --- | --- | --- |
| ${entry.readingNotes[0]} | ${entry.readingNotes[1]} | ${entry.readingNotes[2]} |
| 午后 | 纸白 | 长文、论文 |
| 深夜 | 暗金 | 诗、短句 |

\`\`\`js
const theme = {
  name: "${entry.name}",
  primary: "${entry.primary}",
  secondary: "${entry.secondary}"
};
console.log(\`\${theme.name} · 已就位\`);
\`\`\`

---

### 页边批注

行内代码 \`app.insert()\` 与 [主题制作指南](https://example.com) 都放在这里；这一行用来检查**行内代码底色**和 [链接颜色](https://example.com) 是否压得住纸面。`;
}

function buildPack(entry) {
  const packDir = path.join(packsRoot, entry.dir);
  const pack = JSON.parse(fs.readFileSync(path.join(packDir, "theme.json"), "utf8"));
  const homeMd = fs.readFileSync(path.join(packDir, "home.md"), "utf8");
  const css = fs
    .readFileSync(path.join(packDir, "style.css"), "utf8")
    .replace(/url\(\s*(["']?)assets\/([^)"']+)\1\s*\)/g, (_m, _q, name) =>
      `url("${toFileUrl(path.join(packDir, "assets", name))}")`
    );

  const render = (markdown) =>
    md
      .render(markdown)
      .replace(/src="assets\/([^"]+)"/g, (_m, name) => `src="${toFileUrl(path.join(packDir, "assets", name))}"`);

  const outDir = path.join(previewDir, entry.slug);
  fs.mkdirSync(outDir, { recursive: true });

  const welcomeBody = (height) => `
<div class="app" style="--app-height:${height}px">
  ${titlebar(pack, pack.name)}
  <div class="shell">
    ${sidebarHtml(pack, entry)}
    <main class="workspace">
      ${tabbarHtml(entry)}
      <div class="content">
        <section class="welcome is-custom-home">
          <div class="custom-home markdown-body">${render(homeMd)}</div>
        </section>
      </div>
      ${statusbar()}
    </main>
  </div>
  <div class="sticker-layer">
    ${stickerHtml(pack, "welcome")}
  </div>
  ${dockHtml(pack)}
</div>`;

  const readingBody = (height) => `
<div class="app" style="--app-height:${height}px">
  ${titlebar(pack, `${entry.readingTitle}.md`)}
  <div class="shell">
    ${sidebarHtml(pack, entry)}
    <main class="workspace">
      ${tabbarHtml(entry)}
      <div class="content">
        <div class="preview-pane">
          <article class="markdown-body">${render(readingSample(entry))}</article>
        </div>
      </div>
      ${statusbar()}
    </main>
  </div>
  ${dockHtml(pack)}
</div>`;

  const files = [
    ["welcome", 820, welcomeBody(820)],
    ["welcomeFull", 1560, welcomeBody(1560)],
    ["reading", 820, readingBody(820)],
    ["readingFull", 1560, readingBody(1560)]
  ];
  for (const [kind, height, body] of files) {
    const html = page(pack, entry, `${pack.name} — ${kind}`, height, body, css);
    fs.writeFileSync(path.join(outDir, `${kind}.html`), html, "utf8");
  }

  const out = { slug: entry.slug, name: entry.name, mode: entry.mode };
  for (const [kind] of files) {
    out[kind] = path.join(outDir, `${kind}.html`);
    out[`${kind}Png`] = path.join(outDir, `${kind}.png`);
  }
  return out;
}

const shots = manifest.packs.map(buildPack);
fs.writeFileSync(path.join(previewDir, "shots.json"), JSON.stringify({ shots }, null, 2), "utf8");
console.log(`preview html written: ${shots.length} packs → ${path.relative(packsRoot, previewDir)}`);
