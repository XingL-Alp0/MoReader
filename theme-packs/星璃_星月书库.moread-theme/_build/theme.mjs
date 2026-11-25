/* Theme palette, UI visibility registry and brand marks. */

export const DEFAULT_PRIMARY = "#c4562d";
export const DEFAULT_SECONDARY = "#b4873b";

export const PALETTE_PRESETS = [
  { name: "朱砂 · 秋香", primary: "#c4562d", secondary: "#b4873b" },
  { name: "黛青 · 缃色", primary: "#426b93", secondary: "#d9a441" },
  { name: "松烟 · 竹青", primary: "#4f7d60", secondary: "#9aa35b" },
  { name: "胭脂 · 藕荷", primary: "#a65a7b", secondary: "#b99ac0" },
  { name: "赭石 · 藤黄", primary: "#a8562c", secondary: "#d9b23f" },
  { name: "靛蓝 · 银朱", primary: "#4a5f9e", secondary: "#c4473c" }
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function normalizeHex(value, fallback = DEFAULT_PRIMARY) {
  if (typeof value !== "string") return fallback;
  let hex = value.trim();
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    hex = `#${hex
      .slice(1)
      .split("")
      .map((char) => char + char)
      .join("")}`;
  }
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : fallback;
}

export function hexToRgb(hex) {
  const value = normalizeHex(hex).slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

export function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((part) => clamp(Math.round(part), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function mixColors(first, second, weight = 0.5) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  const t = clamp(weight, 0, 1);
  return rgbToHex({
    r: a.r * t + b.r * (1 - t),
    g: a.g * t + b.g * (1 - t),
    b: a.b * t + b.b * (1 - t)
  });
}

export function lighten(hex, amount = 0.1) {
  return mixColors("#ffffff", hex, clamp(amount, 0, 1));
}

export function darken(hex, amount = 0.1) {
  return mixColors("#000000", hex, clamp(amount, 0, 1));
}

export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const channel = (part) => {
    const value = part / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastInk(hex) {
  return relativeLuminance(hex) > 0.58 ? "#211c16" : "#fffaf2";
}

export function buildPalette(primaryInput, secondaryInput, theme = "light") {
  const primary = normalizeHex(primaryInput, DEFAULT_PRIMARY);
  const secondary = normalizeHex(secondaryInput, DEFAULT_SECONDARY);
  const dark = theme === "dark";
  const paper = dark ? "#1b1814" : "#fffdf8";
  const bg = dark ? "#141210" : "#f2ede4";
  const accentStrong = dark ? lighten(primary, 0.1) : darken(primary, 0.13);
  const accentSoft = mixColors(primary, paper, dark ? 0.28 : 0.18);
  const accentWash = mixColors(primary, paper, dark ? 0.14 : 0.075);
  const selection = mixColors(primary, paper, dark ? 0.42 : 0.3);
  const gold = secondary;
  const titlebarTint = mixColors(primary, dark ? "#171411" : "#f4efe6", dark ? 0.025 : 0.018);
  return {
    primary,
    secondary,
    accent: primary,
    accentStrong,
    accentContrast: contrastInk(primary),
    accentSoft,
    accentWash,
    gold,
    selection,
    titlebarTint,
    backgroundTint: bg,
    paper
  };
}

export function applyPalette(palette, root = document.documentElement) {
  root.style.setProperty("--accent", palette.accent);
  root.style.setProperty("--accent-strong", palette.accentStrong);
  root.style.setProperty("--accent-contrast", palette.accentContrast);
  root.style.setProperty("--accent-soft", palette.accentSoft);
  root.style.setProperty("--accent-wash", palette.accentWash);
  root.style.setProperty("--gold", palette.gold);
  root.style.setProperty("--selection", palette.selection);
  root.style.setProperty("--titlebar-tint", palette.titlebarTint);
}

/* -------------------------------------------------------------------------- */
/* Brand marks                                                                 */
/* -------------------------------------------------------------------------- */

export const BRAND_PRESETS = [
  { id: "default", label: "墨 M" },
  { id: "leaf", label: "叶" },
  { id: "star", label: "星" },
  { id: "ink", label: "砚" }
];

const brandBody = (preset, palette) => {
  const cream = "#f7f0e4";
  const accent = palette?.accent || DEFAULT_PRIMARY;
  switch (preset) {
    case "leaf":
      return `<path d="M26.5 8.4C15.7 8.1 9.2 15.1 9.4 25.6c9.8 1.3 17.1-4.6 17.1-17.2Z" fill="${cream}"/><path d="M9.8 26.2c3.5-5.2 7.6-8.4 12.9-10.4" fill="none" stroke="#28231c" stroke-width="1.8" stroke-linecap="round"/><circle cx="27.2" cy="27.2" r="3.4" fill="${accent}"/>`;
    case "star":
      return `<path d="M18 6.5c.9 6.8 3.1 9.1 9.8 10-6.7.9-8.9 3.2-9.8 10-.9-6.8-3.1-9.1-9.8-10 6.7-.9 8.9-3.2 9.8-10Z" fill="${cream}"/><circle cx="27.2" cy="26.9" r="3.4" fill="${accent}"/>`;
    case "ink":
      return `<circle cx="18" cy="18" r="9.5" fill="none" stroke="${cream}" stroke-width="3.4"/><path d="M18 12.4c3.2 2 5 4.8 5 7.9a5 5 0 0 1-10 0c0-3.1 1.8-5.9 5-7.9Z" fill="${accent}"/><circle cx="27.2" cy="27.2" r="2.8" fill="${cream}"/>`;
    default:
      return `<path d="M8.5 25.4V10.6h3.8l5.7 8.9 5.7-8.9h3.8v14.8h-3.6v-9.1L18 24.1l-5.9-7.8v9.1H8.5Z" fill="${cream}"/><circle cx="27.7" cy="27.8" r="3.4" fill="${accent}"/>`;
  }
};

export function brandSvg(preset, palette) {
  return `<svg viewBox="0 0 36 36" aria-hidden="true"><rect width="36" height="36" rx="10" fill="#28231c"/>${brandBody(
    preset,
    palette
  )}</svg>`;
}

/* -------------------------------------------------------------------------- */
/* UI element visibility                                                       */
/* -------------------------------------------------------------------------- */

export const UI_ELEMENTS = [
  {
    group: "顶栏",
    items: [
      { id: "brand", label: "品牌标识", selector: ".brand" },
      { id: "window-title", label: "窗口标题", selector: ".window-title" },
      { id: "theme-button", label: "主题切换按钮", selector: "#themeToggle" },
      { id: "studio-button", label: "主题工作室按钮", selector: "#studioBtn" },
      { id: "help-button", label: "帮助按钮", selector: "#helpBtn" },
      { id: "settings-button", label: "设置按钮", selector: "#settingsBtn" }
    ]
  },
  {
    group: "侧栏",
    items: [
      { id: "sidebar", label: "整条侧栏", selector: "#sidebar", layout: true },
      { id: "sidebar-actions", label: "新建/打开按钮", selector: ".sidebar-actions" },
      { id: "recent", label: "最近打开", selector: "#recentSection" },
      { id: "outline", label: "文档大纲", selector: "#outlineSection" },
      { id: "assoc-badge", label: "文件关联徽章", selector: "#assocBadge" },
      { id: "sidebar-version", label: "版本号", selector: ".sidebar-version" }
    ]
  },
  {
    group: "工具栏与状态栏",
    items: [
      { id: "sidebar-toggle", label: "收起侧栏按钮", selector: "#sidebarToggle" },
      { id: "view-switch", label: "视图切换", selector: "#viewSwitch" },
      { id: "more-button", label: "更多操作按钮", selector: "#moreBtn" },
      { id: "format-bar", label: "格式化工具栏", selector: "#formatBar" },
      { id: "save-state", label: "保存状态", selector: "#saveState" },
      { id: "save-button", label: "保存按钮", selector: "#saveBtn" },
      { id: "statusbar", label: "底部状态栏", selector: ".statusbar" },
      { id: "status-counts", label: "字数信息", selector: ".status-left" },
      { id: "status-cursor", label: "光标位置", selector: ".status-center" },
      { id: "status-sync", label: "同步滚动按钮", selector: "#syncToggle" },
      { id: "status-meta", label: "编码/语言信息", selector: ".status-right" }
    ]
  },
  {
    group: "内容与装饰",
    items: [
      { id: "welcome-art", label: "欢迎页插画", selector: ".welcome-art" },
      { id: "welcome-tiles", label: "欢迎页快捷卡片", selector: ".welcome-tiles" },
      { id: "welcome-hint", label: "欢迎页提示", selector: ".welcome-hint" },
      { id: "code-copy", label: "代码复制按钮", selector: ".code-copy" },
      { id: "color-chips", label: "颜色预览色块", selector: ".color-token" },
      { id: "html-preview-button", label: "HTML 预览按钮", selector: ".code-preview-toggle" },
      { id: "stickers", label: "贴纸层", selector: "#stickerLayer" },
      { id: "custom-dock", label: "自定义按钮栏", selector: "#customDock" }
    ]
  }
];

export const UI_ITEM_MAP = new Map(
  UI_ELEMENTS.flatMap((group) => group.items.map((item) => [item.id, item]))
);

/* -------------------------------------------------------------------------- */
/* Component-level colors                                                      */
/* -------------------------------------------------------------------------- */

export const COMPONENT_COLORS = [
  { id: "appBg", label: "应用背景", varName: "--bg", group: "背景" },
  { id: "titlebarBg", label: "标题栏", varName: "--titlebar", group: "背景" },
  { id: "sidebarBg", label: "侧栏", varName: "--sidebar", group: "背景" },
  { id: "surfaceBg", label: "工作区", varName: "--surface", group: "背景" },
  { id: "editorBg", label: "编辑器背景", varName: "--editor-bg", group: "背景" },
  { id: "paperBg", label: "阅读纸张", varName: "--paper", group: "背景" },
  { id: "paperSoft", label: "纸张浮层", varName: "--paper-soft", group: "背景" },
  { id: "statusBg", label: "状态栏", varName: "--status-bg", group: "背景" },
  { id: "ink", label: "正文文字", varName: "--ink", group: "文字" },
  { id: "inkSoft", label: "次要文字", varName: "--ink-soft", group: "文字" },
  { id: "muted", label: "辅助文字", varName: "--muted", group: "文字" },
  { id: "faint", label: "弱化文字", varName: "--faint", group: "文字" },
  { id: "line", label: "分隔线", varName: "--line", group: "线条与内容" },
  { id: "lineSoft", label: "轻分隔线", varName: "--line-soft", group: "线条与内容" },
  { id: "codeBg", label: "代码背景", varName: "--code-bg", group: "代码与内容" },
  { id: "codeInk", label: "代码文字", varName: "--code-ink", group: "代码与内容" },
  { id: "codeHead", label: "代码标题栏", varName: "--code-head", group: "代码与内容" },
  { id: "tableHead", label: "表头背景", varName: "--table-head", group: "代码与内容" },
  { id: "quoteBg", label: "引用背景", varName: "--quote-bg", group: "代码与内容" },
  { id: "selection", label: "选中背景", varName: "--selection", group: "代码与内容" }
];

/* Derive the full component palette from the two theme colors.
   `tint(color, base, amount)` keeps the base and mixes in `amount` of color. */
const tint = (color, base, amount) => mixColors(color, base, clamp(amount, 0, 1));

export function generateComponentColors(primaryInput, secondaryInput, theme = "light") {
  const primary = normalizeHex(primaryInput, DEFAULT_PRIMARY);
  const secondary = normalizeHex(secondaryInput, DEFAULT_SECONDARY);
  const dark = theme === "dark";

  if (dark) {
    const ink = tint(primary, "#eae2d4", 0.04);
    return {
      appBg: tint(primary, "#141210", 0.07),
      titlebarBg: tint(primary, "#171411", 0.055),
      sidebarBg: tint(primary, "#191612", 0.07),
      surfaceBg: tint(primary, "#1c1915", 0.04),
      editorBg: tint(primary, "#1c1915", 0.032),
      paperBg: tint(primary, "#1b1814", 0.028),
      paperSoft: tint(secondary, "#201c17", 0.045),
      statusBg: tint(primary, "#171411", 0.05),
      ink,
      inkSoft: tint(primary, "#c4b8a5", 0.045),
      muted: tint(primary, "#938776", 0.04),
      faint: tint(primary, "#6f6557", 0.035),
      line: tint(secondary, "#302a22", 0.10),
      lineSoft: tint(secondary, "#27221b", 0.08),
      codeBg: tint(secondary, "#201c17", 0.06),
      codeInk: ink,
      codeHead: tint(secondary, "#26211b", 0.075),
      tableHead: tint(secondary, "#26211b", 0.06),
      quoteBg: tint(primary, "#1b1814", 0.16),
      selection: tint(primary, "#1b1814", 0.40)
    };
  }

  const ink = tint(primary, "#29241d", 0.05);
  return {
    appBg: tint(primary, "#f2ede4", 0.05),
    titlebarBg: tint(primary, "#f6f1e8", 0.035),
    sidebarBg: tint(primary, "#efe7da", 0.06),
    surfaceBg: tint(primary, "#faf7f0", 0.025),
    editorBg: tint(primary, "#faf7f0", 0.02),
    paperBg: tint(primary, "#fffdf8", 0.015),
    paperSoft: tint(secondary, "#fcf9f2", 0.03),
    statusBg: tint(primary, "#f4efe6", 0.03),
    ink,
    inkSoft: tint(primary, "#5b5247", 0.05),
    muted: tint(primary, "#8b8072", 0.05),
    faint: tint(primary, "#a99e8e", 0.04),
    line: tint(secondary, "#ded4c4", 0.045),
    lineSoft: tint(secondary, "#e9e1d4", 0.035),
    codeBg: tint(secondary, "#f6f0e5", 0.055),
    codeInk: ink,
    codeHead: tint(secondary, "#efe7d9", 0.065),
    tableHead: tint(secondary, "#efe7d9", 0.05),
    quoteBg: tint(primary, "#fffdf8", 0.085),
    selection: tint(primary, "#fffdf8", 0.30)
  };
}

export function applyComponentColors(colors = {}, root = document.documentElement, theme = "light") {
  for (const item of COMPONENT_COLORS) {
    const value = colors[item.id];
    if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) {
      root.style.setProperty(item.varName, normalizeHex(value));
    } else {
      root.style.removeProperty(item.varName);
    }
  }
  if (typeof colors.appBg === "string" && /^#[0-9a-f]{6}$/i.test(colors.appBg)) {
    root.style.setProperty(
      "--bg-deep",
      theme === "dark" ? darken(colors.appBg, 0.12) : darken(colors.appBg, 0.055)
    );
  } else {
    root.style.removeProperty("--bg-deep");
  }
  if (typeof colors.titlebarBg === "string" && /^#[0-9a-f]{6}$/i.test(colors.titlebarBg)) {
    root.style.removeProperty("--titlebar-tint");
  }
}

const UI_STYLE_ID = "moread-ui-visibility-style";

export function applyUiVisibility(hiddenIds = []) {
  const hidden = new Set(hiddenIds);
  let style = document.getElementById(UI_STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = UI_STYLE_ID;
    document.head.append(style);
  }

  const rules = [];
  for (const item of UI_ITEM_MAP.values()) {
    document.body.classList.toggle(`ui-hide-${item.id}`, hidden.has(item.id));
    rules.push(`body.ui-hide-${item.id} ${item.selector} { display: none !important; }`);
    if (item.layout) {
      rules.push(
        `body.ui-hide-${item.id} .shell { grid-template-columns: 0 minmax(0, 1fr); }`
      );
    }
  }
  style.textContent = rules.join("\n");
}

/* -------------------------------------------------------------------------- */
/* Stickers + custom buttons                                                   */
/* -------------------------------------------------------------------------- */

export const STICKER_PRESETS = [
  "✦",
  "🌿",
  "☕",
  "📚",
  "🌙",
  "🍂",
  "🐈",
  "💡",
  "✒️",
  "📌",
  "🎀",
  "🫧",
  "🌸",
  "🧭",
  "🪶",
  "🍃"
];

export function makeId(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
