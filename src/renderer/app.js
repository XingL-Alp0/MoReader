import { EditorState, Compartment } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
  placeholder
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo, undoDepth, redoDepth } from "@codemirror/commands";
import { search, searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import {
  syntaxHighlighting,
  HighlightStyle,
  bracketMatching,
  indentOnInput,
  foldGutter,
  foldKeymap
} from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { tags } from "@lezer/highlight";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

import { icons, hydrateIcons } from "./icons.js";
import {
  renderMarkdown,
  prepareHtmlPreview,
  mathHtml,
  mathPreviewHtml,
  checkMath,
  mermaidBlockHtml,
  extractHeadings,
  countText,
  colorValue,
  resolveLocalPath,
  fileUrlToLocalPath,
  registerMarkdownElement,
  unregisterMarkdownElement
} from "./markdown.js";
import {
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  PALETTE_PRESETS,
  BRAND_PRESETS,
  STICKER_PRESETS,
  UI_ELEMENTS,
  UI_ITEM_MAP,
  COMPONENT_COLORS,
  applyPalette,
  applyComponentColors,
  applyUiVisibility,
  brandSvg,
  buildPalette,
  contrastInk,
  generateComponentColors,
  makeId,
  normalizeHex
} from "./theme.js";
import {
  LATEX_GROUPS,
  LATEX_TEMPLATES,
  findMathRanges,
  normalizeTex
} from "./latex.js";
import {
  MERMAID_TEMPLATES,
  MINDMAP_LAYOUTS,
  legacyThemeColors,
  detectDiagramType,
  canStructureEdit,
  parseMindmap,
  serializeMindmap,
  parseFlowchart,
  serializeFlowchart,
  readMindmapTheme,
  readMindmapLayout,
  layoutFromMarker,
  applyMindmapTheme,
  stripMindmapTheme,
  resolveMindmapColors,
  prepareMermaidRender,
  newNodeId
} from "./mermaid.js";
import { api } from "./platform/index.js";
import { bundledGuides } from "./guides.generated.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const dom = {
  titlebar: $("#titlebar"),
  windowTitle: $("#windowTitle"),
  sidebar: $("#sidebar"),
  shell: $(".shell"),
  welcome: $("#welcome"),
  panes: $("#panes"),
  editorPane: $("#editorPane"),
  previewPane: $("#previewPane"),
  preview: $("#preview"),
  editorHost: $("#editorHost"),
  tabs: $("#tabs"),
  recentList: $("#recentList"),
  recentSection: $("#recentSection"),
  outlineSection: $("#outlineSection"),
  favoritesSection: $("#favoritesSection"),
  favoriteList: $("#favoriteList"),
  favoriteCount: $("#favoriteCount"),
  notesSection: $("#notesSection"),
  noteList: $("#noteList"),
  noteCount: $("#noteCount"),
  noteMenu: $("#noteMenu"),
  outlineList: $("#outlineList"),
  outlineCount: $("#outlineCount"),
  expandOutlineBtn: $("#expandOutlineBtn"),
  collapseOutlineBtn: $("#collapseOutlineBtn"),
  formatBar: $("#formatBar"),
  headingSelect: $("#headingSelect"),
  viewSwitch: $("#viewSwitch"),
  saveState: $("#saveState"),
  saveStateText: $("#saveStateText"),
  wordCount: $("#wordCount"),
  charCount: $("#charCount"),
  readTime: $("#readTime"),
  cursorInfo: $("#cursorInfo"),
  eolInfo: $("#eolInfo"),
  encodingInfo: $("#encodingInfo"),
  syncToggle: $("#syncToggle"),
  syncText: $("#syncText"),
  themeToggle: $("#themeToggle"),
  homeBtn: $("#homeBtn"),
  brandIcon: $("#brandIcon"),
  studioBtn: $("#studioBtn"),
  studioDialog: $("#studioDialog"),
  helpDialog: $("#helpDialog"),
  stickerLayer: $("#stickerLayer"),
  customDock: $("#customDock"),
  primaryColor: $("#primaryColor"),
  primaryHex: $("#primaryHex"),
  secondaryColor: $("#secondaryColor"),
  secondaryHex: $("#secondaryHex"),
  generatedPalette: $("#generatedPalette"),
  palettePresets: $("#palettePresets"),
  resetPaletteBtn: $("#resetPaletteBtn"),
  componentColors: $("#componentColors"),
  resetComponentColorsBtn: $("#resetComponentColorsBtn"),
  generateComponentColorsBtn: $("#generateComponentColorsBtn"),
  componentColorState: $("#componentColorState"),
  homeEnabled: $("#homeEnabled"),
  homeMarkdown: $("#homeMarkdown"),
  homePreview: $("#homePreview"),
  homeImageBtn: $("#homeImageBtn"),
  homeResetBtn: $("#homeResetBtn"),
  customHome: $("#customHome"),
  welcomeInner: $(".welcome-inner"),
  welcomeTiles: $(".welcome-tiles"),
  customCssEnabled: $("#customCssEnabled"),
  customCss: $("#customCss"),
  importCssBtn: $("#importCssBtn"),
  clearCssBtn: $("#clearCssBtn"),
  brandPreview: $("#brandPreview"),
  brandPresetGrid: $("#brandPresetGrid"),
  brandUploadBtn: $("#brandUploadBtn"),
  brandUploadInput: $("#brandUploadInput"),
  resetBrandBtn: $("#resetBrandBtn"),
  stickerPresets: $("#stickerPresets"),
  stickerUploadBtn: $("#stickerUploadBtn"),
  stickerUploadInput: $("#stickerUploadInput"),
  stickerList: $("#stickerList"),
  customButtonLabel: $("#customButtonLabel"),
  customButtonIcon: $("#customButtonIcon"),
  customButtonScript: $("#customButtonScript"),
  fillScriptExample: $("#fillScriptExample"),
  addCustomButtonBtn: $("#addCustomButtonBtn"),
  customButtonList: $("#customButtonList"),
  uiElementsList: $("#uiElementsList"),
  showAllUiBtn: $("#showAllUiBtn"),
  focusUiBtn: $("#focusUiBtn"),
  studioStatus: $("#studioStatus"),
  studioTabs: $("#studioTabs"),
  themePackName: $("#themePackName"),
  themePackSummary: $("#themePackSummary"),
  themePackLibrary: $("#themePackLibrary"),
  savePackBtn: $("#savePackBtn"),
  exportThemeBtn: $("#exportThemeBtn"),
  importThemeBtn: $("#importThemeBtn"),
  pasteThemeBtn: $("#pasteThemeBtn"),
  copyThemeBtn: $("#copyThemeBtn"),
  latexBtn: $("#latexBtn"),
  latexDialog: $("#latexDialog"),
  latexCats: $("#latexCats"),
  latexSymbols: $("#latexSymbols"),
  latexPreview: $("#latexPreview"),
  latexError: $("#latexError"),
  latexSource: $("#latexSource"),
  latexModeSwitch: $("#latexModeSwitch"),
  latexTemplates: $("#latexTemplates"),
  latexInsertBtn: $("#latexInsertBtn"),
  latexDeleteBtn: $("#latexDeleteBtn"),
  latexCopyBtn: $("#latexCopyBtn"),
  latexHint: $("#latexHint"),
  mermaidDialog: $("#mermaidDialog"),
  mermaidTemplates: $("#mermaidTemplates"),
  mermaidThemes: $("#mermaidThemes"),
  mermaidLayouts: $("#mermaidLayouts"),
  mermaidCustomColors: $("#mermaidCustomColors"),
  mermaidPrimaryColor: $("#mermaidPrimaryColor"),
  mermaidSecondaryColor: $("#mermaidSecondaryColor"),
  mermaidTabs: $("#mermaidTabs"),
  mermaidStructure: $("#mermaidStructure"),
  mermaidStructureNotice: $("#mermaidStructureNotice"),
  mermaidStructureBar: $("#mermaidStructureBar"),
  mermaidNodeShape: $("#mermaidNodeShape"),
  mermaidSource: $("#mermaidSource"),
  mermaidPreview: $("#mermaidPreview"),
  mermaidEditorError: $("#mermaidEditorError"),
  mermaidApplyBtn: $("#mermaidApplyBtn"),
  mermaidDeleteBtn: $("#mermaidDeleteBtn"),
  mermaidCopyBtn: $("#mermaidCopyBtn"),
  mermaidHint: $("#mermaidHint"),
  settingsDialog: $("#settingsDialog"),
  confirmDialog: $("#confirmDialog"),
  assocDialog: $("#assocDialog"),
  moreMenu: $("#moreMenu"),
  morePluginImport: $("#morePluginImport"),
  morePluginExport: $("#morePluginExport"),
  morePluginTools: $("#morePluginTools"),
  welcomePluginActions: $("#welcomePluginActions"),
  insertMenu: $("#insertMenu"),
  insertBtn: $("#insertBtn"),
  appMenu: $("#appMenu"),
  appMenuBtn: $("#appMenuBtn"),
  formatMenu: $("#formatMenu"),
  formatMoreBtn: $("#formatMoreBtn"),
  inputDialog: $("#inputDialog"),
  inputForm: $("#inputForm"),
  inputTitle: $("#inputTitle"),
  inputLabel: $("#inputLabel"),
  inputField: $("#inputField"),
  inputHint: $("#inputHint"),
  inputConfirm: $("#inputConfirm"),
  colorPopover: $("#colorPopover"),
  colorTrigger: $("#colorTrigger"),
  colorDot: $("#colorDot"),
  colorInput: $("#colorInput"),
  colorHex: $("#colorHex"),
  colorPreview: $("#colorPreview"),
  colorPresets: $("#colorPresets"),
  toastStack: $("#toastStack"),
  dragOverlay: $("#dragOverlay"),
  assocBadge: $("#assocBadge"),
  assocIndicator: $("#assocIndicator"),
  assocTitle: $("#assocTitle"),
  assocSubtitle: $("#assocSubtitle"),
  welcomeRecentBtn: $("#welcomeRecentBtn"),
  welcomeRecentText: $("#welcomeRecentText"),
  welcomeAssocText: $("#welcomeAssocText"),
  sidebarVersion: $("#sidebarVersion"),
  aboutVersion: $("#aboutVersion"),
  electronVersion: $("#electronVersion"),
  themeOptions: $("#themeOptions"),
  fontSizeRange: $("#fontSizeRange"),
  fontSizeValue: $("#fontSizeValue"),
  lineWrapToggle: $("#lineWrapToggle"),
  syncToggleInput: $("#syncToggleInput"),
  autoSaveToggle: $("#autoSaveToggle"),
  settingsAssocIndicator: $("#settingsAssocIndicator"),
  settingsAssocTitle: $("#settingsAssocTitle"),
  settingsAssocDesc: $("#settingsAssocDesc"),
  settingsRegisterBtn: $("#settingsRegisterBtn"),
  settingsDefaultBtn: $("#settingsDefaultBtn"),
  assocDialogIndicator: $("#assocDialogIndicator"),
  assocDialogTitle: $("#assocDialogTitle"),
  assocDialogDesc: $("#assocDialogDesc"),
  assocPath: $("#assocPath"),
  assocRegisterBtn: $("#assocRegisterBtn"),
  assocDefaultBtn: $("#assocDefaultBtn"),
  assocUnregisterBtn: $("#assocUnregisterBtn"),
  splitter: $("#splitter"),
  addFavoriteBtn: $("#addFavoriteBtn"),
  addFavoritePathBtn: $("#addFavoritePathBtn"),
  newNoteBtn: $("#newNoteBtn"),
  newNoteFolderBtn: $("#newNoteFolderBtn"),
  exportNotesBtn: $("#exportNotesBtn"),
  pluginList: $("#pluginList"),
  pluginToolbar: $("#pluginToolbar"),
  pluginSearch: $("#pluginSearch"),
  pluginFilter: $("#pluginFilter"),
  pluginSummary: $("#pluginSummary"),
  reloadPluginsBtn: $("#reloadPluginsBtn"),
  installPluginBtn: $("#installPluginBtn"),
  openPluginsFolderBtn: $("#openPluginsFolderBtn"),
  pluginMenuBtn: $("#pluginMenuBtn"),
  pluginMenuSep: $("#pluginMenuSep"),
  formatPlugins: $("#formatPlugins"),
  brandBtn: $("#brandBtn"),
  pluginMenu: $("#pluginMenu"),
  pluginElementDialog: $("#pluginElementDialog"),
  pluginElementFields: $("#pluginElementFields"),
  pluginElementTitle: $("#pluginElementTitle"),
  pluginElementPlugin: $("#pluginElementPlugin"),
  pluginElementSyntax: $("#pluginElementSyntax"),
  pluginElementInsertBtn: $("#pluginElementInsertBtn")
};

const state = {
  settings: {
    theme: "system",
    viewMode: "split",
    fontSize: 15,
    lineWrap: true,
    syncScroll: true,
    autoSave: false,
    sidebarOpen: true,
    recentFiles: [],
    recentCollapsed: false,
    outlineCollapsed: false,
    favoritesCollapsed: false,
    notesCollapsed: false,
    primaryColor: DEFAULT_PRIMARY,
    secondaryColor: DEFAULT_SECONDARY,
    componentColors: {},
    componentColorsAuto: false,
    themeName: "我的墨阅主题",
    customCss: "",
    customCssEnabled: false,
    homeMarkdown: "",
    homeEnabled: false,
    homeBasePath: "",
    themeAssets: {},
    themePacks: [],
    activeThemePack: "",
    brandIcon: { type: "preset", value: "default" },
    stickers: [],
    customButtons: [],
    trustedButtons: [],
    guidesSeeded: false,
    uiHidden: []
  },
  appInfo: null,
  docs: [],
  activeId: null,
  showHome: false,
  viewMode: "split",
  sidebarOpen: true,
  assoc: null,
  assocBusy: false,
  color: "#c4562d",
  colorTarget: "color",
  recent: [],
  headings: [],
  outlineSignature: "",
  suppressUpdates: false,
  suppressScrollSync: false,
  scrollLockUntil: 0,
  syncSource: null,
  closePromptOpen: false,
  untitledCounter: 0,
  previewTimer: null,
  countTimer: null,
  autosaveTimer: null,
  settingsTimer: null,
  pendingSettings: {},
  outlineFrame: null,
  palette: null,
  visualDirty: false,
  visualTimer: null,
  isVisualEditing: false,
  stickerSaveTimer: null,
  studioStatusTimer: null,
  windowIconTimer: null,
  runningScript: false,
  pluginElementDraft: null,
  componentColorRefs: new Map(),
  inputResolve: null,
  componentColorsEffective: null,
  latexTarget: null,
  latexContext: null,
  latexDisplay: "inline",
  latexCategory: "structure",
  latexSymbolCache: new Map(),
  lastPointer: null,
  homePreviewTimer: 0,
  cssApplyTimer: 0,
  mermaidTimer: 0,
  mermaidEditor: null,
  favorites: [],
  notes: [],
  noteFolderCollapsed: new Set(),
  noteMenuEntry: null,
  plugins: [],
  pluginQuery: "",
  pluginFilter: "all",
  pluginDetails: new Set(),
  pluginElementDisposers: new Map()
};

const COLOR_PRESETS = [
  "#C4562D",
  "#A8411D",
  "#D9772F",
  "#D9A441",
  "#B4873B",
  "#7A8B4A",
  "#4F7D60",
  "#2F6E75",
  "#426B93",
  "#5B6FA8",
  "#7B5A8E",
  "#A65A7B",
  "#B44A3E",
  "#29241D",
  "#5B5247",
  "#8B8072",
  "#C9BBA6",
  "#F3D9CA",
  "#F8E9DF",
  "#FFF3B0",
  "#DCEBDD",
  "#DDE8F2",
  "#E9E0F0",
  "#FFFDF8"
];

const HTML_PREVIEW_BASE_CSS = `
  :host { display: block; }
  *, *::before, *::after { box-sizing: border-box; }
  .html-preview-root {
    font-family: var(--font-ui, "Segoe UI", "Microsoft YaHei UI", sans-serif);
    font-size: 14px;
    line-height: 1.65;
    color: #29241d;
    background: #fff;
    padding: 18px 20px;
    min-height: 64px;
    overflow-wrap: break-word;
  }
  .html-preview-root h1, .html-preview-root h2, .html-preview-root h3 { line-height: 1.3; margin: 0.8em 0 0.45em; }
  .html-preview-root p { margin: 0 0 0.8em; }
  .html-preview-root a { color: #b04a26; }
  .html-preview-root img { max-width: 100%; height: auto; }
  .html-preview-root table { border-collapse: collapse; width: 100%; }
  .html-preview-root td, .html-preview-root th { border: 1px solid #ddd4c4; padding: 6px 9px; text-align: left; }
  .html-preview-root pre { background: #f6f0e5; padding: 10px; overflow: auto; border-radius: 6px; }
  .html-preview-root button, .html-preview-root input { font: inherit; }
`;

const wrapCompartment = new Compartment();
const themeCompartment = new Compartment();

function editorThemeExtension() {
  return EditorView.darkTheme.of(resolvedTheme() === "dark");
}

function applyEditorTheme() {
  if (!view) return;
  const extension = editorThemeExtension();
  view.dispatch({ effects: themeCompartment.reconfigure(extension) });
  const doc = activeDoc();
  if (doc) doc.cmState = view.state;
}

const turndown = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  fence: "```",
  emDelimiter: "*",
  strongDelimiter: "**",
  linkStyle: "inlined"
});
turndown.use(gfm);

const texSource = (node) => {
  const annotation = node.querySelector('annotation[encoding="application/x-tex"]');
  return annotation ? annotation.textContent : "";
};

turndown.addRule("mathBlock", {
  filter: (node) => node.classList && node.classList.contains("math-block"),
  replacement: (_content, node) => {
    const tex = node.getAttribute("data-tex") || texSource(node);
    return tex ? `\n\n$$\n${tex}\n$$\n\n` : "";
  }
});

turndown.addRule("mathInline", {
  filter: (node) => node.classList && node.classList.contains("math-inline"),
  replacement: (_content, node) => {
    const tex = node.getAttribute("data-tex") || texSource(node);
    return tex ? `$${tex}$` : "";
  }
});

turndown.addRule("mermaidFigure", {
  filter: (node) => node.classList && node.classList.contains("mermaid-figure"),
  replacement: (_content, node) => {
    const source = decodeMermaidSource(node.getAttribute("data-mermaid-src")).replace(/\n+$/, "");
    return source ? `\n\n\`\`\`mermaid\n${source}\n\`\`\`\n\n` : "";
  }
});

turndown.addRule("fencedCodeBlock", {
  filter: (node) => node.nodeName === "PRE" && node.firstElementChild?.nodeName === "CODE",
  replacement: (_content, node) => {
    const code = node.querySelector("code");
    if (!code) return "";
    const languageMatch = (code.className || "").match(/language-([\w+#.-]+)/);
    const language = languageMatch ? languageMatch[1] : "";
    const text = code.textContent.replace(/\n$/, "");
    return `\n\n\`\`\`${language}\n${text}\n\`\`\`\n\n`;
  }
});

turndown.addRule("styledInline", {
  filter: (node) =>
    ["SPAN", "MARK"].includes(node.nodeName) &&
    node.getAttribute("style") &&
    /(?:^|;)\s*(?:color|background(?:-color)?)\s*:/i.test(node.getAttribute("style")),
  replacement: (_content, node) => {
    const clone = node.cloneNode(true);
    clone.querySelectorAll(".color-chip").forEach((chip) => chip.remove());
    return clone.outerHTML;
  }
});

turndown.addRule("markdownImage", {
  filter: "img",
  replacement: (_content, node) => {
    const source = node.getAttribute("data-md-src") || node.getAttribute("src") || "";
    if (!source) return "";
    const alt = (node.getAttribute("alt") || "").replace(/[\r\n]+/g, " ");
    const title = node.getAttribute("title");
    return `![${alt}](${source}${title ? ` "${title}"` : ""})`;
  }
});

turndown.addRule("footnoteSection", {
  filter: (node) => node.classList && node.classList.contains("footnotes"),
  replacement: (_content, node) => `\n\n${node.outerHTML}\n\n`
});

turndown.addRule("footnoteRef", {
  filter: (node) => node.nodeName === "SUP" && node.classList.contains("footnote-ref"),
  replacement: (_content, node) => {
    const href = node.querySelector("a")?.getAttribute("href") || "";
    const id = href.replace(/^#fn/, "").replace(/^#/, "");
    return id ? `[^${id}]` : "";
  }
});

const highlightStyle = HighlightStyle.define([
  { tag: tags.heading, color: "var(--ink)", fontWeight: "700" },
  { tag: tags.heading1, color: "var(--ink)", fontWeight: "700" },
  { tag: tags.heading2, color: "var(--ink)", fontWeight: "700" },
  { tag: tags.heading3, color: "var(--ink)", fontWeight: "650" },
  { tag: tags.strong, color: "var(--ink)", fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through", color: "var(--muted)" },
  { tag: [tags.link, tags.url], color: "var(--accent)", textDecoration: "underline" },
  {
    tag: tags.monospace,
    color: "var(--hl-builtin)",
    background: "var(--code-bg)",
    borderRadius: "3px"
  },
  { tag: [tags.list, tags.contentSeparator], color: "var(--accent)" },
  { tag: tags.quote, color: "var(--muted)", fontStyle: "italic" },
  { tag: tags.meta, color: "var(--faint)" },
  { tag: tags.comment, color: "var(--hl-comment)", fontStyle: "italic" },
  { tag: tags.keyword, color: "var(--hl-keyword)" },
  { tag: [tags.string, tags.special(tags.string)], color: "var(--hl-string)" },
  { tag: [tags.number, tags.bool, tags.atom, tags.null], color: "var(--hl-number)" },
  { tag: tags.variableName, color: "var(--ink)" },
  { tag: tags.function(tags.variableName), color: "var(--hl-function)" },
  { tag: [tags.typeName, tags.className, tags.namespace], color: "var(--hl-type)" },
  { tag: [tags.propertyName, tags.attributeName], color: "var(--hl-attr)" },
  { tag: tags.operator, color: "var(--ink-soft)" },
  { tag: [tags.punctuation, tags.bracket], color: "var(--ink-soft)" },
  { tag: tags.tagName, color: "var(--hl-keyword)" },
  { tag: tags.processingInstruction, color: "var(--accent)", opacity: "0.7" }
]);

let view = null;

function syncViewportSize() {
  const viewport = window.visualViewport;
  const height = viewport?.height || window.innerHeight;
  if (!height) return;
  document.documentElement.style.setProperty("--app-height", `${Math.round(height)}px`);
}

/* -------------------------------------------------------------------------- */
/* Boot                                                                        */
/* -------------------------------------------------------------------------- */

async function boot() {
  hydrateIcons();
  syncViewportSize();
  window.addEventListener("resize", syncViewportSize, { passive: true });
  window.visualViewport?.addEventListener("resize", syncViewportSize, { passive: true });
  window.visualViewport?.addEventListener("scroll", syncViewportSize, { passive: true });
  try {
    state.settings = { ...state.settings, ...(await api.getSettings()) };
    state.appInfo = await api.appInfo();
    state.recent = state.settings.recentFiles || [];
  } catch (error) {
    console.error(error);
  }

  state.viewMode = state.settings.viewMode || "split";
  state.sidebarOpen = state.settings.sidebarOpen !== false;
  if (api.platform === "android") {
    document.documentElement.dataset.compact = "true";
    document.documentElement.classList.add("platform-android");
    if (state.viewMode === "split") state.viewMode = "read";
  }
  // Below this width the sidebar is a drawer (see the 620px media query), so
  // it starts closed; wider screens keep the user's persisted preference.
  if (window.innerWidth < 620) state.sidebarOpen = false;

  buildColorPresets();
  buildStudio();
  initEditor();
  bindEvents();
  applySettings();
  applyTheme();
  applyUiVisibility(state.settings.uiHidden || []);
  renderStickers();
  renderCustomDock();
  await refreshPlugins();
  await seedGuideNotes();
  await refreshLibrary();
  applySidebar(true);
  applyViewMode(state.viewMode, false);
  renderRecent();
  updateWorkspaceVisibility();
  updateHistoryButtons();
  updateOutline(true);
  updateCounts();
  updateWindowTitle();
  scheduleWindowIconUpdate();

  dom.sidebarVersion.textContent = state.appInfo?.version || "1.0.0";
  dom.aboutVersion.textContent = state.appInfo?.version || "1.0.0";
  dom.electronVersion.textContent = api.versions.electron || "—";

  try {
    const guides = await api.ensureGuides?.();
    if (guides?.opened) {
      for (const filePath of guides.paths || []) await openPath(filePath);
    }
  } catch (error) { console.warn("首次启动指南创建失败", error); }

api.onOpenPaths?.((paths) => {
    for (const filePath of Array.isArray(paths) ? paths : [paths]) {
      if (filePath) openPath(filePath);
    }
  });
  api.onThemePath?.((filePath) => {
    if (/\.css$/i.test(filePath)) importCssFile(filePath);
    else importThemePack(filePath);
  });
  api.onCloseRequest(handleCloseRequest);

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (state.settings.theme === "system") applyTheme();
  });

  refreshAssociation();
  await api.rendererReady();
}

/* -------------------------------------------------------------------------- */
/* Editor                                                                      */
/* -------------------------------------------------------------------------- */

function editorExtensions() {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    rectangularSelection(),
    crosshairCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    search({ top: true }),
    markdown({ base: markdownLanguage }),
    keymap.of([
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      indentWithTab
    ]),
    wrapCompartment.of(state.settings.lineWrap ? EditorView.lineWrapping : []),
    themeCompartment.of(editorThemeExtension()),
    syntaxHighlighting(highlightStyle),
    placeholder("从这里开始写 Markdown……"),
         EditorView.updateListener.of(onEditorUpdate),
     EditorView.domEventHandlers({ focus: () => { updateHistoryButtons(); return false; } })
  ];
}

function updateHistoryButtons() {
  const undoButton = document.querySelector("#undoBtn");
  const redoButton = document.querySelector("#redoBtn");
  if (!undoButton || !redoButton) return;
  const ready = Boolean(activeDoc()) && !state.showHome;
  // The visual editor is a contenteditable: CodeMirror's history does not see
  // its edits, so depth-based state would leave both buttons permanently
  // disabled on mobile. Keep them enabled while editing; the browser reports
  // an empty history by doing nothing.
  if (state.isVisualEditing) {
    undoButton.disabled = !ready;
    redoButton.disabled = !ready;
    return;
  }
  const editorReady = ready && Boolean(view);
  undoButton.disabled = !editorReady || undoDepth(view.state) === 0;
  redoButton.disabled = !editorReady || redoDepth(view.state) === 0;
}

function runHistory(command) {
  const isRedo = command === "redo";
  if (state.isVisualEditing) {
    // execCommand applies to the focused editable, so focus it before asking.
    dom.preview.focus({ preventScroll: true });
    let changed = false;
    try {
      changed = document.execCommand(isRedo ? "redo" : "undo");
    } catch {
      changed = false;
    }
    if (changed) {
      state.visualDirty = true;
      updateSaveState();
      scheduleVisualSync();
      updateVisualHeadingSelect();
    }
    updateHistoryButtons();
    return changed;
  }
  if (!view) return false;
  const changed = isRedo ? redo(view) : undo(view);
  updateHistoryButtons();
  view.focus();
  return changed;
}
function initEditor() {
  const startState = EditorState.create({ doc: "", extensions: editorExtensions() });
  view = new EditorView({ state: startState, parent: dom.editorHost });

  const searchObserver = new MutationObserver(localizeSearchPanel);
  searchObserver.observe(dom.editorHost, { childList: true, subtree: true });

  view.scrollDOM.addEventListener("scroll", () => {
    const doc = activeDoc();
    if (!doc) return;
    doc.scrollTop = view.scrollDOM.scrollTop;
    updateOutlineActive();
    if (
      !state.settings.syncScroll ||
      state.viewMode !== "split" ||
      state.syncSource === "preview" ||
      state.suppressScrollSync ||
      Date.now() < state.scrollLockUntil
    ) {
      return;
    }
    state.syncSource = "editor";
    syncScrollRatio(view.scrollDOM, dom.previewPane);
    window.setTimeout(() => {
      if (state.syncSource === "editor") state.syncSource = null;
    }, 90);
  });

  dom.previewPane.addEventListener("scroll", () => {
    const doc = activeDoc();
    if (doc) doc.previewScroll = dom.previewPane.scrollTop;
    updateOutlineActive();
    if (
      !state.settings.syncScroll ||
      state.viewMode !== "split" ||
      state.syncSource === "editor" ||
      state.suppressScrollSync ||
      Date.now() < state.scrollLockUntil
    ) {
      return;
    }
    state.syncSource = "preview";
    syncScrollRatio(dom.previewPane, view.scrollDOM);
    window.setTimeout(() => {
      if (state.syncSource === "preview") state.syncSource = null;
    }, 90);
  });
}

function syncScrollRatio(from, to) {
  const fromMax = from.scrollHeight - from.clientHeight;
  const toMax = to.scrollHeight - to.clientHeight;
  if (fromMax <= 0 || toMax <= 0) return;
  to.scrollTop = (from.scrollTop / fromMax) * toMax;
}

function localizeSearchPanel() {
  const panel = dom.editorHost.querySelector(".cm-search");
  if (!panel || panel.dataset.localized === "true") return;
  panel.dataset.localized = "true";
  const search = panel.querySelector('input[name="search"]');
  const replace = panel.querySelector('input[name="replace"]');
  if (search) {
    search.placeholder = "搜索";
    search.setAttribute("aria-label", "搜索");
  }
  if (replace) {
    replace.placeholder = "替换为";
    replace.setAttribute("aria-label", "替换为");
  }
  const labels = {
    next: "下一个",
    prev: "上一个",
    select: "全部",
    replace: "替换",
    replaceAll: "全部替换"
  };
  for (const [name, text] of Object.entries(labels)) {
    const button = panel.querySelector(`button[name="${name}"]`);
    if (button) button.textContent = text;
  }
  const checks = {
    case: "区分大小写",
    re: "正则",
    word: "整词匹配"
  };
  for (const [name, text] of Object.entries(checks)) {
    const input = panel.querySelector(`input[name="${name}"]`);
    const label = input?.closest("label");
    if (!label) continue;
    const textNode = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.nodeValue = text;
  }
  const close = panel.querySelector('button[name="close"]');
  if (close) close.setAttribute("aria-label", "关闭搜索");
}

function onEditorUpdate(update) {
  if (state.suppressUpdates) return;
  const doc = activeDoc();
  if (!doc) return;
  doc.cmState = update.state;

  if (update.docChanged) {
    doc.content = update.state.doc.toString();
    refreshDirty(doc);
    schedulePreview();
    scheduleCounts();
    scheduleAutosave();
  }
  if (update.docChanged || update.selectionSet) {
    updateCursorInfo();
    updateHeadingSelect();
    scheduleOutlineActive();
    updateHistoryButtons();
  }
}

/* -------------------------------------------------------------------------- */
/* Documents                                                                   */
/* -------------------------------------------------------------------------- */

function activeDoc() {
  return state.docs.find((doc) => doc.id === state.activeId) || null;
}

function makeDoc(data) {
  const doc = {
    id: crypto.randomUUID(),
    path: data.path || null,
    name: data.name || "未命名.md",
    content: data.content || "",
    savedContent: data.content || "",
    encoding: data.encoding || "UTF-8",
    eol: data.eol || "\n",
    mtimeMs: data.mtimeMs || null,
    dirty: false,
    saving: false,
    scrollTop: 0,
    previewScroll: 0,
    outlineCollapsed: new Set(),
    cmState: null
  };
  doc.cmState = EditorState.create({ doc: doc.content, extensions: editorExtensions() });
  return doc;
}

async function newDocument() {
  state.untitledCounter += 1;
  const doc = makeDoc({
    name: state.untitledCounter === 1 ? "未命名.md" : `未命名-${state.untitledCounter}.md`,
    content: ""
  });
  state.docs.push(doc);
  activateDoc(doc.id, { focus: true });
  toast("已新建空白文档");
}

async function openPath(filePath) {
  if (!filePath) return;
  const existing = state.docs.find((doc) => samePath(doc.path, filePath));
  if (existing) {
    activateDoc(existing.id, { focus: true });
    closeDrawerOnNarrow();
    return;
  }
  try {
    const file = await api.readFile(filePath);
    const doc = makeDoc(file);
    state.docs.push(doc);
    activateDoc(doc.id, { focus: true });
    await refreshRecent();
    closeDrawerOnNarrow();
  } catch (error) {
    toast(`无法打开文件：${cleanError(error)}`, { type: "error", duration: 4200 });
  }
}

/* A drawer covers the document, so picking something from it should reveal
   the document. The two-column layout never auto-closes. */
function closeDrawerOnNarrow() {
  if (!state.sidebarOpen) return;
  if (!window.matchMedia("(max-width: 620px)").matches) return;
  state.sidebarOpen = false;
  applySidebar(true);
}

async function openDialog() {
  try {
    const result = await api.openDialog();
    if (result.canceled) return;
    let lastId = null;
    for (const file of result.files) {
      if (file.error) {
        toast(`无法打开 ${file.name || file.path}：${file.error}`, {
          type: "error",
          duration: 4200
        });
        continue;
      }
      const existing = state.docs.find((doc) => samePath(doc.path, file.path));
      if (existing) {
        lastId = existing.id;
        continue;
      }
      const doc = makeDoc(file);
      state.docs.push(doc);
      lastId = doc.id;
    }
    if (lastId) activateDoc(lastId, { focus: true });
    await refreshRecent();
  } catch (error) {
    toast(`打开文件失败：${cleanError(error)}`, { type: "error" });
  }
}

function activateDoc(id, options = {}) {
  if (!id) return;
  const next = state.docs.find((doc) => doc.id === id);
  if (!next) return;
  const noteEntry = state.notes.find(
    (item) => item.type === "note" && samePath(item.path, next.path)
  );
  if (noteEntry) next.name = noteLabel(noteEntry);
  const wasShowingHome = state.showHome;
  state.showHome = false;
  if (state.activeId === id) {
    if (wasShowingHome) updateWorkspaceVisibility();
    renderTabs();
    updateWindowTitle();
    if (options.focus) {
      if (state.viewMode === "visual") dom.preview.focus();
      else view.focus();
    }
    return;
  }

  const wasVisual = state.isVisualEditing;
  if (state.isVisualEditing) finishVisualEditing({ render: false });

  const current = activeDoc();
  if (current) {
    if (wasVisual) {
      state.suppressUpdates = true;
      view.setState(current.cmState);
      state.suppressUpdates = false;
    }
    current.cmState = view.state;
    current.scrollTop = view.scrollDOM.scrollTop;
    current.previewScroll = dom.previewPane.scrollTop;
  }

  state.activeId = id;
  updateWorkspaceVisibility();
  renderStickers();
  state.suppressUpdates = true;
  state.suppressScrollSync = true;
  state.scrollLockUntil = Date.now() + 320;
  view.setState(next.cmState);
  view.requestMeasure();
  view.dispatch({
    effects: [
      wrapCompartment.reconfigure(
        state.settings.lineWrap ? EditorView.lineWrapping : []
      ),
      themeCompartment.reconfigure(editorThemeExtension())
    ]
  });
  next.cmState = view.state;
  state.suppressUpdates = false;
  updateHistoryButtons();

  renderTabs();
  renderNoteList();
  renderRecent();
  renderPreview({ reset: true });
  updateOutline(true);
  updateCursorInfo();
  updateHeadingSelect();
  updateDocumentMeta();
  updateCounts();
  updateWindowTitle();
  updateDirtyUI();

  if (state.viewMode === "visual") {
    startVisualEditing();
    updateVisualHeadingSelect();
  }

  requestAnimationFrame(() => {
    view.scrollDOM.scrollTop = next.scrollTop || 0;
    view.requestMeasure();
    if (state.viewMode !== "edit") {
      dom.previewPane.scrollTop = next.previewScroll || 0;
    }
    state.suppressScrollSync = false;
    if (options.focus) {
      if (state.viewMode === "visual") dom.preview.focus();
      else view.focus();
    }
    scrollActiveTabIntoView();
  });
}

async function closeDocument(id) {
  const doc = state.docs.find((item) => item.id === id);
  if (!doc) return;
  if (state.isVisualEditing && state.activeId === id) finishVisualEditing({ render: false });
  if (doc.dirty) {
    const choice = await showConfirm({
      title: "保存更改？",
      message: `「${doc.name}」有未保存的更改。`,
      buttons: [
        { id: "cancel", label: "取消", variant: "ghost" },
        { id: "discard", label: "不保存", variant: "danger" },
        { id: "save", label: "保存", variant: "primary" }
      ]
    });
    if (choice === "cancel") return;
    if (choice === "save" && !(await saveDoc(doc))) return;
  }

  const index = state.docs.indexOf(doc);
  state.docs.splice(index, 1);
  clearTimeout(state.autosaveTimer);

  if (state.activeId === id) {
    const next = state.docs[index] || state.docs[index - 1] || null;
    state.activeId = null;
    if (next) {
      activateDoc(next.id, { focus: true });
    } else {
      state.showHome = false;
      state.suppressUpdates = true;
      view.setState(EditorState.create({ doc: "", extensions: editorExtensions() }));
      state.suppressUpdates = false;
      state.headings = [];
      state.outlineSignature = "";
      renderTabs();
      renderRecent();
      updateWorkspaceVisibility();
      renderStickers();
      dom.preview.innerHTML = "";
      updateOutline(true);
      updateCounts();
      updateDocumentMeta();
      updateCursorInfo();
      updateWindowTitle();
      updateDirtyUI();
    }
  } else {
    renderTabs();
  }
  renderNoteList();
}

function refreshDirty(doc) {
  const dirty = doc.content !== doc.savedContent;
  const changed = dirty !== doc.dirty;
  doc.dirty = dirty;
  if (changed) {
    updateActiveTabDirty();
    updateWindowTitle();
  }
  updateSaveState();
}

function updateActiveTabDirty() {
  const doc = activeDoc();
  if (!doc) return;
  const tab = dom.tabs.querySelector(`.tab[data-id="${doc.id}"]`);
  if (tab) tab.classList.toggle("dirty", doc.dirty);
}

function updateDirtyUI() {
  updateSaveState();
  updateDocumentMeta();
}

function renderTabs() {
  dom.tabs.replaceChildren();
  for (const doc of state.docs) {
    const tab = document.createElement("div");
    tab.className = "tab";
    tab.dataset.id = doc.id;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", doc.id === state.activeId ? "true" : "false");
    tab.title = doc.path || doc.name;
    if (doc.id === state.activeId) tab.classList.add("active");
    if (doc.dirty) tab.classList.add("dirty");

    const icon = document.createElement("span");
    icon.className = "tab-icon";
    icon.innerHTML = icons.file;

    const name = document.createElement("span");
    name.className = "tab-name";
    name.textContent = doc.name;

    const close = document.createElement("button");
    close.className = "tab-close";
    close.type = "button";
    close.title = "关闭标签";
    close.innerHTML = icons.x;

    tab.append(icon, name, close);
    dom.tabs.append(tab);
  }
  requestAnimationFrame(scrollActiveTabIntoView);
}

function scrollActiveTabIntoView() {
  const tab = dom.tabs.querySelector(".tab.active");
  if (tab) tab.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function updateWindowTitle() {
  const doc = activeDoc();
  if (!doc) {
    dom.windowTitle.textContent = "未打开文档";
    dom.windowTitle.classList.remove("dirty");
    document.title = "墨阅 MoRead";
    api.setTitle("墨阅 MoRead");
    return;
  }
  dom.windowTitle.textContent = doc.name;
  dom.windowTitle.classList.toggle("dirty", doc.dirty);
  document.title = `${doc.name}${doc.dirty ? " •" : ""} — 墨阅 MoRead`;
  api.setTitle(`${doc.name}${doc.dirty ? " •" : ""} — 墨阅 MoRead`);
}

function updateDocumentMeta() {
  const doc = activeDoc();
  if (!doc) {
    dom.eolInfo.textContent = "LF";
    dom.encodingInfo.textContent = "UTF-8";
    updateSaveState();
    return;
  }
  dom.eolInfo.textContent = doc.eol === "\r\n" ? "CRLF" : "LF";
  dom.encodingInfo.textContent = doc.encoding || "UTF-8";
  updateSaveState();
}

function updateSaveState() {
  const doc = activeDoc();
  if (!doc) {
    dom.saveState.classList.remove("dirty", "saving");
    dom.saveStateText.textContent = "已保存";
    return;
  }
  const dirty = doc.dirty || (state.isVisualEditing && state.visualDirty);
  dom.saveState.classList.toggle("saving", doc.saving);
  dom.saveState.classList.toggle("dirty", dirty && !doc.saving);
  if (doc.saving) dom.saveStateText.textContent = "保存中…";
  else if (dirty) dom.saveStateText.textContent = "未保存";
  else dom.saveStateText.textContent = "已保存";
  updateHistoryButtons();
}

function updateWorkspaceVisibility() {
  const hasDoc = Boolean(activeDoc());
  const homeVisible = state.showHome || !hasDoc;
  dom.welcome.hidden = !homeVisible;
  dom.panes.hidden = !hasDoc || homeVisible;
  document.body.classList.toggle("no-doc", !hasDoc);
  document.body.classList.toggle("home-open", state.showHome);
  dom.formatBar.hidden = !hasDoc || state.showHome || state.viewMode === "read";
  if (hasDoc) {
    dom.panes.className = `panes mode-${state.viewMode}`;
  }
  for (const button of dom.viewSwitch.querySelectorAll("button")) {
    button.disabled = !hasDoc || state.showHome;
  }
  $("#moreBtn").disabled = !hasDoc || state.showHome;
  dom.homeBtn?.classList.toggle("active", homeVisible);
  updateViewSwitch();
  updateHistoryButtons();
}

function showHomePage() {
  renderHome();
  state.showHome = Boolean(activeDoc());
  updateWorkspaceVisibility();
  if (dom.welcome) dom.welcome.scrollTop = 0;
  if (state.showHome) $("#homeBtn")?.focus({ preventScroll: true });
}

function toggleHomePage() {
  if (state.showHome && activeDoc()) {
    state.showHome = false;
    updateWorkspaceVisibility();
    if (state.viewMode === "visual") dom.preview.focus();
    else view?.focus();
    return;
  }
  showHomePage();
}

/* -------------------------------------------------------------------------- */
/* Save / open                                                                 */
/* -------------------------------------------------------------------------- */

async function saveDoc(doc, options = {}) {
  if (!doc || doc.saving) return false;
  if (state.isVisualEditing && state.activeId === doc.id) {
    clearTimeout(state.visualTimer);
    if (state.visualDirty) syncVisualContent(true);
  }
  const snapshot = doc.content;
  doc.saving = true;
  updateSaveState();
  try {
    const result = await api.saveFile({
      path: doc.path,
      content: snapshot,
      eol: doc.eol,
      saveAs: Boolean(options.saveAs),
      suggestedName: doc.name || "未命名.md"
    });
    if (!result || result.canceled) return false;

    const nameChanged = doc.name !== result.name;
    doc.path = result.path;
    doc.name = result.name;
    const noteEntry = state.notes.find(
      (item) => item.type === "note" && samePath(item.path, doc.path)
    );
    if (noteEntry) doc.name = noteLabel(noteEntry);
    doc.eol = result.eol || doc.eol;
    doc.encoding = result.encoding || "UTF-8";
    doc.mtimeMs = result.mtimeMs;
    doc.savedContent = snapshot;
    doc.dirty = doc.content !== doc.savedContent;
    updateActiveTabDirty();
    if (nameChanged || options.saveAs) renderTabs();
    updateDocumentMeta();
    updateWindowTitle();
    updateSaveState();
    await refreshRecent();
    if (doc.path) {
      const touched = await api.touchNote?.(doc.path).catch(() => false);
      if (touched) await refreshLibrary();
    }
    if (!options.auto) {
      if (result.notice) {
        toast(`${result.notice}：${doc.name}`, {
          type: "info",
          duration: 3600
        });
      } else {
        toast(`已保存 ${doc.name}`, { type: "success", duration: 1800 });
      }
    }
    return true;
  } catch (error) {
    toast(`保存失败：${cleanError(error)}`, { type: "error", duration: 4200 });
    return false;
  } finally {
    doc.saving = false;
    updateSaveState();
  }
}

async function saveActive(options = {}) {
  const doc = activeDoc();
  if (!doc) {
    toast("没有可保存的文档");
    return false;
  }
  return saveDoc(doc, options);
}

function scheduleAutosave() {
  clearTimeout(state.autosaveTimer);
  if (!state.settings.autoSave) return;
  const doc = activeDoc();
  if (!doc || !doc.path || !doc.dirty) return;
  state.autosaveTimer = window.setTimeout(() => {
    if (doc.dirty && !doc.saving) saveDoc(doc, { auto: true });
  }, 1500);
}

async function reloadActiveDoc() {
  const doc = activeDoc();
  if (!doc) return;
  const wasVisual = state.isVisualEditing;
  if (state.isVisualEditing) finishVisualEditing({ render: false });
  if (!doc.path) {
    toast("尚未保存的文档无法从磁盘重新载入");
    return;
  }
  if (doc.dirty) {
    const choice = await showConfirm({
      title: "放弃未保存的更改？",
      message: `「${doc.name}」将从磁盘重新载入，当前更改会丢失。`,
      buttons: [
        { id: "cancel", label: "取消", variant: "ghost" },
        { id: "discard", label: "重新载入", variant: "danger" }
      ]
    });
    if (choice !== "discard") return;
  }
  try {
    const file = await api.readFile(doc.path);
    doc.content = file.content;
    doc.savedContent = file.content;
    doc.encoding = file.encoding;
    doc.eol = file.eol;
    doc.mtimeMs = file.mtimeMs;
    doc.dirty = false;
    state.suppressUpdates = true;
    doc.cmState = EditorState.create({ doc: doc.content, extensions: editorExtensions() });
    if (state.activeId === doc.id) view.setState(doc.cmState);
    state.suppressUpdates = false;
    renderPreview({ reset: true });
    updateOutline(true);
    updateDirtyUI();
    updateWindowTitle();
    updateActiveTabDirty();
    updateCounts();
    updateCursorInfo();
    if (wasVisual) reenterVisualEditing();
    toast("已从磁盘重新载入", { type: "success" });
  } catch (error) {
    toast(`重新载入失败：${cleanError(error)}`, { type: "error" });
  }
}

/* -------------------------------------------------------------------------- */
/* Preview                                                                     */
/* -------------------------------------------------------------------------- */

function schedulePreview() {
  if (state.isVisualEditing) return;
  clearTimeout(state.previewTimer);
  state.previewTimer = window.setTimeout(() => renderPreview(), 70);
}

function renderPreview(options = {}) {
  if (state.isVisualEditing) return;
  const doc = activeDoc();
  if (!doc) {
    dom.preview.innerHTML = "";
    return;
  }

  if (doc.content.length > 1_600_000) {
    dom.preview.innerHTML =
      '<div class="empty-outline">文档超过 1.6 MB，为保证流畅已暂停实时预览。导出与保存不受影响。</div>';
    return;
  }

  const previousTop = options.reset ? doc.previewScroll || 0 : dom.previewPane.scrollTop;
  let html = "";
  try {
    html = renderMarkdown(doc.content, doc.path);
  } catch (error) {
    console.error(error);
    html = `<p class="math-error">预览渲染失败：${escapeHtml(error.message || String(error))}</p>`;
  }

  state.suppressScrollSync = true;
  state.scrollLockUntil = Date.now() + 180;
  dom.preview.innerHTML = html;
  // Restore the scroll position before measuring, so floating toolbars are
  // re-anchored where the pointer already is.
  const restoreTop = options.reset ? doc.previewScroll || 0 : previousTop;
  dom.previewPane.scrollTop = restoreTop;
  decoratePreview();
  decorateTables();
  requestAnimationFrame(() => {
    dom.previewPane.scrollTop = restoreTop;
    state.suppressScrollSync = false;
  });

  updateOutline();
  scheduleOutlineActive();
}

function decoratePreview() {
  // Give every formula a stable index in document order so the LaTeX editor can
  // map a click back to the right source range.
  const mathNodes = dom.preview.querySelectorAll(".math-block, .math-inline");
  mathNodes.forEach((node, index) => {
    node.dataset.mathIndex = String(index);
    node.title = "双击编辑公式";
  });

  const inlineCodes = dom.preview.querySelectorAll("code");
  for (const code of inlineCodes) {
    if (code.closest("pre")) continue;
    const value = colorValue(code.textContent);
    if (!value) continue;
    const wrap = document.createElement("span");
    wrap.className = "color-token";
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "color-chip";
    chip.style.backgroundColor = value;
    chip.dataset.color = value;
    chip.title = `复制 ${value}`;
    code.replaceWith(wrap);
    wrap.append(chip, code);
  }

  // Keep highlighted text readable on light or dark inline backgrounds.
  for (const mark of dom.preview.querySelectorAll('mark[style*="background"]')) {
    if (mark.style.color) continue;
    const computed = getComputedStyle(mark).backgroundColor;
    const parts = computed.match(/\d+(?:\.\d+)?/g);
    if (!parts || parts.length < 3) continue;
    const [r, g, b] = parts.slice(0, 3).map(Number);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    mark.style.color = luminance > 0.56 ? "#29241d" : "#f7f0e4";
    mark.dataset.autoColor = "true";
  }

  // Resolve images produced by raw HTML too, not only Markdown image syntax.
  const doc = activeDoc();
  if (doc?.path) {
    for (const image of dom.preview.querySelectorAll("img[src]")) {
      const source = image.getAttribute("src") || "";
      if (!image.hasAttribute("data-md-src")) image.setAttribute("data-md-src", source);
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(source)) continue;
      image.setAttribute("src", resolveLocalPath(source, doc.path));
    }
  }

  for (const figure of dom.preview.querySelectorAll(".mermaid-figure")) {
    figure.contentEditable = "false";
  }
  scheduleMermaidRender();
}

/* -------------------------------------------------------------------------- */
/* Mermaid diagrams                                                            */
/* -------------------------------------------------------------------------- */

const MERMAID_SCRIPT = "vendor/mermaid.min.js";
const MERMAID_FONT = "PingFang SC, Microsoft YaHei, Noto Sans SC, system-ui, sans-serif";
let mermaidLoader = null;
let mermaidSequence = 0;
let mermaidThemeKey = "";
let mermaidGeneration = 0;
const mermaidCache = new Map();

function cssVariable(name, fallback = "") {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function parseColor(value) {
  const text = String(value || "").trim();
  const hex = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1];
    if (raw.length === 3) {
      return {
        r: parseInt(raw[0] + raw[0], 16),
        g: parseInt(raw[1] + raw[1], 16),
        b: parseInt(raw[2] + raw[2], 16)
      };
    }
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16)
    };
  }
  const rgb = text.match(/rgba?\(([^)]+)\)/i);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => Number.isFinite(n))) {
      return { r: parts[0], g: parts[1], b: parts[2] };
    }
  }
  return null;
}

function toHex({ r, g, b }) {
  const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

function mixColor(from, to, amount) {
  const a = parseColor(from);
  const b = parseColor(to);
  if (!a || !b) return from || to;
  const ratio = Math.max(0, Math.min(1, amount));
  return toHex({
    r: a.r + (b.r - a.r) * ratio,
    g: a.g + (b.g - a.g) * ratio,
    b: a.b + (b.b - a.b) * ratio
  });
}

/**
 * Mermaid's built-in palettes (yellow / green / purple) clash with the paper
 * look, so the diagrams are generated from the current theme variables.
 */
function mermaidThemeConfig(overrides = null) {
  const dark = currentMermaidTheme() === "dark";
  // Diagram colours live in the theme system: 组件颜色 → 图表主色 / 图表辅色.
  const accent =
    overrides?.primary ||
    cssVariable("--diagram-primary", cssVariable("--accent", "#c4562d"));
  const secondAccent =
    overrides?.secondary || cssVariable("--diagram-secondary", accent);
  const paper = cssVariable("--paper", dark ? "#1b1814" : "#fffdf8");
  const paperSoft = cssVariable("--paper-soft", paper);
  const ink = cssVariable("--ink", dark ? "#eae2d4" : "#29241d");
  const inkSoft = cssVariable("--ink-soft", ink);
  const line = cssVariable("--line", mixColor(ink, paper, 0.8));
  const accentSoft = cssVariable("--accent-soft", mixColor(accent, paper, 0.7));
  const accentWash = cssVariable("--accent-wash", mixColor(accent, paper, 0.9));

  const variables = {
    background: "transparent",
    fontFamily: MERMAID_FONT,
    fontSize: "14px",
    darkMode: dark,
    primaryColor: accentWash,
    primaryTextColor: ink,
    primaryBorderColor: accent,
    secondaryColor: accentSoft,
    secondaryTextColor: ink,
    secondaryBorderColor: mixColor(accent, paper, 0.4),
    tertiaryColor: paperSoft,
    tertiaryTextColor: ink,
    tertiaryBorderColor: line,
    mainBkg: accentWash,
    nodeBorder: accent,
    nodeTextColor: ink,
    lineColor: mixColor(ink, paper, 0.62),
    textColor: ink,
    titleColor: ink,
    clusterBkg: paperSoft,
    clusterBorder: line,
    edgeLabelBackground: paper,
    labelBackground: paper,
    labelTextColor: ink,
    actorBkg: accentWash,
    actorBorder: accent,
    actorTextColor: ink,
    actorLineColor: line,
    signalColor: inkSoft,
    signalTextColor: ink,
    noteBkgColor: accentWash,
    noteBorderColor: accent,
    noteTextColor: ink,
    sequenceNumberColor: paper,
    labelBoxBkgColor: accentWash,
    labelBoxBorderColor: accent,
    loopTextColor: ink,
    altBackground: paperSoft
  };

  // Mindmap branches cycle through cScale0..cScale11. Keep them close to the
  // paper colour: mermaid paints the branch paths with these fills.
  for (let index = 0; index < 12; index += 1) {
    const shade = 0.3 + ((index % 6) * 0.11);
    const source = index % 2 === 1 ? secondAccent : accent;
    variables[`cScale${index}`] = mixColor(source, paper, shade);
    variables[`cScaleLabel${index}`] = ink;
    variables[`cScalePeer${index}`] = mixColor(source, paper, shade + 0.1);
  }

  return { theme: "base", themeVariables: variables };
}

function mermaidThemeSignature() {
  return [
    currentMermaidTheme(),
    cssVariable("--accent"),
    cssVariable("--paper"),
    cssVariable("--ink"),
    cssVariable("--diagram-primary"),
    cssVariable("--diagram-secondary")
  ].join("|");
}

function decodeMermaidSource(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch {
    return String(value || "");
  }
}

function loadMermaid() {
  if (window.mermaid) return Promise.resolve(window.mermaid);
  if (mermaidLoader) return mermaidLoader;
  mermaidLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = MERMAID_SCRIPT;
    script.async = true;
    script.onload = () => {
      if (window.mermaid) resolve(window.mermaid);
      else reject(new Error("Mermaid 初始化失败"));
    };
    script.onerror = () => {
      mermaidLoader = null;
      reject(new Error("无法加载 Mermaid"));
    };
    document.head.append(script);
  });
  return mermaidLoader;
}

function currentMermaidTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "default";
}

function scheduleMermaidRender() {
  if (!dom.preview.querySelector(".mermaid-figure")) return;
  clearTimeout(state.mermaidTimer);
  state.mermaidTimer = window.setTimeout(() => {
    renderMermaidBlocks().catch((error) => console.warn("Mermaid 渲染失败", error));
  }, 80);
}

async function renderMermaidBlocks() {
  const pending = Array.from(dom.preview.querySelectorAll(".mermaid-figure")).filter(
    (figure) => figure.dataset.mermaidState !== "ready"
  );
  if (!pending.length) return;

  const generation = ++mermaidGeneration;
  let mermaid = null;
  try {
    mermaid = await loadMermaid();
  } catch (error) {
    for (const figure of pending) {
      const canvas = figure.querySelector(".mermaid-canvas");
      if (!canvas) continue;
      canvas.innerHTML = `<div class="mermaid-error"><strong>图表无法渲染</strong><span>${escapeHtml(
        cleanError(error)
      )}</span></div>`;
      figure.dataset.mermaidState = "error";
      figure.classList.add("has-error");
    }
    return;
  }
  if (generation !== mermaidGeneration) return;

  const baseThemeKey = mermaidThemeSignature();

  // Re-query: the preview may have been re-rendered while loading.
  for (const figure of Array.from(dom.preview.querySelectorAll(".mermaid-figure"))) {
    if (figure.dataset.mermaidState === "ready") continue;
    const canvas = figure.querySelector(".mermaid-canvas");
    if (!canvas) continue;
    const rawSource = decodeMermaidSource(figure.dataset.mermaidSrc);
    const prepared = prepareMermaidRender(rawSource);
    const source = prepared.source.trim();
    if (!source) {
      canvas.innerHTML = '<div class="mermaid-error">图表内容为空</div>';
      figure.dataset.mermaidState = "error";
      continue;
    }
    figure.dataset.mermaidLayout = prepared.layout.id;
    figure.classList.toggle("layout-tree", prepared.layout.mode === "tree");

    const colors = resolveMindmapColors(readMindmapTheme(rawSource));
    const themeKey = `${baseThemeKey}|${colors ? `${colors.primary}-${colors.secondary}` : "auto"}`;
    if (themeKey !== mermaidThemeKey) {
      try {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          fontFamily: MERMAID_FONT,
          flowchart: { useMaxWidth: false, htmlLabels: true },
          ...mermaidThemeConfig(colors)
        });
        mermaidThemeKey = themeKey;
      } catch (error) {
        console.warn("Mermaid 初始化失败", error);
      }
    }

    const key = `${themeKey}\u0000${prepared.layout.id}\u0000${source}`;
    const cached = mermaidCache.get(key);
    if (cached) {
      canvas.innerHTML = cached;
      figure.dataset.mermaidState = "ready";
      continue;
    }

    const id = `mermaid-diagram-${++mermaidSequence}`;
    try {
      const { svg } = await mermaid.render(id, source);
      mermaidCache.set(key, svg);
      if (!dom.preview.contains(figure)) continue;
      canvas.innerHTML = svg;
      figure.dataset.mermaidState = "ready";
      if (prepared.layout.direction === "TB" || prepared.layout.direction === "BT") {
        centerTreeScroll(canvas);
      }
    } catch (error) {
      document.getElementById(id)?.remove();
      document.getElementById(`d${id}`)?.remove();
      if (!dom.preview.contains(figure)) continue;
      canvas.innerHTML = `<div class="mermaid-error"><strong>图表语法错误</strong><span>${escapeHtml(
        cleanError(error)
      )}</span></div>`;
      figure.dataset.mermaidState = "error";
      figure.classList.add("has-error");
      const sourcePanel = figure.querySelector(".mermaid-source");
      const toggle = figure.querySelector(".mermaid-toggle");
      if (sourcePanel && sourcePanel.hidden) {
        sourcePanel.hidden = false;
        if (toggle) {
          toggle.textContent = "图表";
          toggle.classList.add("active");
        }
      }
    }
  }
}

function refreshMermaidForTheme() {
  const next = mermaidThemeSignature();
  if (next === mermaidThemeKey) return;
  mermaidCache.clear();
  mermaidThemeKey = "";
  if (state.mermaidEditor) scheduleMermaidPreview();
  if (dom.preview.querySelector(".mermaid-figure")) {
    for (const figure of dom.preview.querySelectorAll(".mermaid-figure")) {
      figure.dataset.mermaidState = "pending";
      const canvas = figure.querySelector(".mermaid-canvas");
      if (canvas) canvas.innerHTML = '<div class="mermaid-loading">图表渲染中…</div>';
    }
    scheduleMermaidRender();
  }
}

function toggleMermaidSource(button) {
  const figure = button.closest(".mermaid-figure");
  if (!figure) return;
  const panel = figure.querySelector(".mermaid-source");
  if (!panel) return;
  const showSource = panel.hidden;
  panel.hidden = !showSource;
  button.textContent = showSource ? "图表" : "源码";
  button.classList.toggle("active", showSource);
}

async function copyMermaidSource(button) {
  const figure = button.closest(".mermaid-figure");
  if (!figure) return;
  const source = decodeMermaidSource(figure.dataset.mermaidSrc);
  await api.copyText(source);
  const label = button.textContent;
  button.textContent = "已复制";
  window.setTimeout(() => {
    button.textContent = label;
  }, 1400);
}

/* -------------------------------------------------------------------------- */
/* Mermaid editor dialog                                                       */
/* -------------------------------------------------------------------------- */

function mermaidFigureElements(source) {
  const template = document.createElement("template");
  template.innerHTML = mermaidBlockHtml(source);
  return template.content.firstElementChild;
}

function mermaidSourceFromElement(figure) {
  return decodeMermaidSource(figure?.getAttribute("data-mermaid-src"));
}

function buildMermaidPalette() {
  if (!dom.mermaidTemplates.childElementCount) {
    for (const template of MERMAID_TEMPLATES) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.mermaidTemplate = template.id;
      button.textContent = template.name;
      button.addEventListener("click", () => {
        loadMermaidTemplate(template.id);
      });
      dom.mermaidTemplates.append(button);
    }
  }

  if (!dom.mermaidThemes.childElementCount) {
    const autoButton = document.createElement("button");
    autoButton.type = "button";
    autoButton.dataset.mermaidTheme = "auto";
    autoButton.textContent = "跟随主题";
    autoButton.title = "使用主题里的图表主色 / 辅色";
    autoButton.addEventListener("click", () => setMermaidTheme({ mode: "auto", id: "auto" }));

    const customButton = document.createElement("button");
    customButton.type = "button";
    customButton.dataset.mermaidTheme = "custom";
    customButton.textContent = "自定义";
    customButton.title = "只给这张图表换配色";
    customButton.addEventListener("click", () => {
      const editor = state.mermaidEditor;
      const current = editor?.theme;
      const colors =
        current?.mode === "custom"
          ? current
          : resolveMindmapColors(current) ||
            resolveMindmapColors({
              mode: "custom",
              primary: cssVariable("--diagram-primary", cssVariable("--accent", "#c4562d")),
              secondary: cssVariable("--diagram-secondary", cssVariable("--accent", "#c4562d"))
            }) ||
            { primary: "#c4562d", secondary: "#b4873b" };
      setMermaidTheme({
        mode: "custom",
        primary: colors.primary,
        secondary: colors.secondary || colors.primary
      });
    });

    dom.mermaidThemes.append(autoButton, customButton);
  }

  if (!dom.mermaidLayouts.childElementCount) {
    for (const layout of MINDMAP_LAYOUTS) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.mermaidLayout = layout.id;
      button.textContent = layout.name;
      button.title =
        layout.id === "radial"
          ? "Mermaid 原生思维导图（四周发散）"
          : `以流程图方向渲染同一棵树（${layout.direction}）`;
      button.addEventListener("click", () => setMermaidLayout(layout.id));
      dom.mermaidLayouts.append(button);
    }
  }
  updateMermaidPaletteState();
}

function updateMermaidPaletteState() {
  const editor = state.mermaidEditor;
  if (!editor) return;
  const theme = editor.theme || { mode: "auto", id: "auto" };
  const activeId = theme.mode === "auto" ? "auto" : "custom";
  for (const button of dom.mermaidThemes.querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.mermaidTheme === activeId);
  }
  dom.mermaidCustomColors.hidden = theme.mode !== "custom";
  if (theme.mode === "custom") {
    dom.mermaidPrimaryColor.value = theme.primary;
    dom.mermaidSecondaryColor.value = theme.secondary || theme.primary;
  }
  for (const button of dom.mermaidTemplates.querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.mermaidTemplate === editor.type);
  }
  const layoutId = editor.layout?.id || "radial";
  for (const button of dom.mermaidLayouts.querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.mermaidLayout === layoutId);
  }
  dom.mermaidLayouts.hidden = editor.type !== "mindmap";
}

function setMermaidTheme(theme) {
  const editor = state.mermaidEditor;
  if (!editor) return;
  editor.theme = theme;
  editor.source = applyMindmapTheme(editor.source, theme, editor.layout);
  editor.baseSource = applyMindmapTheme(editor.baseSource, theme, editor.layout);
  dom.mermaidSource.value = editor.source;
  updateMermaidPaletteState();
  scheduleMermaidPreview();
}

function setMermaidLayout(layoutId) {
  const editor = state.mermaidEditor;
  if (!editor) return;
  const layout = MINDMAP_LAYOUTS.find((item) => item.id === layoutId) || MINDMAP_LAYOUTS[0];
  editor.layout = {
    id: layout.id,
    mode: layout.mode || (layout.id === "radial" ? "radial" : "tree"),
    direction: layout.direction || ""
  };
  editor.source = applyMindmapTheme(editor.source, editor.theme, editor.layout);
  dom.mermaidSource.value = editor.source;
  updateMermaidPaletteState();
  scheduleMermaidPreview();
}

function loadMermaidTemplate(id) {
  const editor = state.mermaidEditor;
  if (!editor) return;
  const template = MERMAID_TEMPLATES.find((item) => item.id === id);
  if (!template) return;
  // Templates always start from the app theme; a per-diagram override can
  // still be added afterwards via the 自定义 button.
  editor.theme = { mode: "auto", id: "auto" };
  editor.layout = { id: "radial", mode: "radial", direction: "" };
  editor.baseSource = template.source;
  editor.source = template.source;
  editor.type = detectDiagramType(template.source);
  editor.selected = [];
  editor.lineIndex = -1;
  editor.lines = null;
  dom.mermaidSource.value = editor.source;
  switchMermaidTab(canStructureEdit(editor.type) ? "structure" : "source");
  renderMermaidStructure();
  updateMermaidPaletteState();
  scheduleMermaidPreview();
}

function switchMermaidTab(tab = "structure") {
  const target = tab === "source" ? "source" : "structure";
  for (const button of dom.mermaidTabs.querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.mermaidTab === target);
  }
  for (const panel of dom.mermaidDialog.querySelectorAll("[data-mermaid-panel]")) {
    panel.hidden = panel.dataset.mermaidPanel !== target;
  }
}

function openMermaidEditor({ source = "", target = null } = {}) {
  const initial = String(source || "").trim() || MERMAID_TEMPLATES[0].source;
  const storedTheme = readMindmapTheme(initial);
  // Old documents may still carry `theme=<preset>`; show it as a custom
  // override so the dialog has concrete colours to edit.
  const legacyColors =
    storedTheme.mode === "preset" ? legacyThemeColors(storedTheme.id) : null;
  const theme = legacyColors
    ? { mode: "custom", primary: legacyColors.primary, secondary: legacyColors.secondary }
    : storedTheme;
  const baseSource = stripMindmapTheme(initial).trim() || MERMAID_TEMPLATES[0].source;
  state.mermaidEditor = {
    target,
    source: initial,
    baseSource,
    theme,
    layout: layoutFromMarker(initial),
    type: detectDiagramType(baseSource),
    selected: [],
    lineIndex: -1,
    syncing: false,
    timer: 0,
    requestId: 0
  };
  dom.mermaidSource.value = initial;
  dom.mermaidStructure.replaceChildren();
  dom.mermaidPreview.replaceChildren();
  dom.mermaidEditorError.hidden = true;
  dom.mermaidApplyBtn.textContent = target ? "保存" : "插入";
  dom.mermaidDeleteBtn.hidden = !target;
  dom.mermaidHint.textContent = target ? "Ctrl+Enter 保存" : "Ctrl+Enter 插入";
  buildMermaidPalette();
  switchMermaidTab(canStructureEdit(state.mermaidEditor.type) ? "structure" : "source");
  renderMermaidStructure();
  if (!dom.mermaidDialog.open) dom.mermaidDialog.showModal();
  updateMermaidPreview();
}

function closeMermaidEditor() {
  if (dom.mermaidDialog.open) dom.mermaidDialog.close();
  state.mermaidEditor = null;
}

function selectedMindmapNode() {
  const editor = state.mermaidEditor;
  if (!editor?.tree) return null;
  let node = editor.tree;
  for (const index of editor.selected) {
    node = node.children?.[index];
    if (!node) return editor.tree;
  }
  return node;
}

function selectedPath() {
  return state.mermaidEditor?.selected || [];
}

function parentOfPath(path) {
  return path.slice(0, -1);
}

function nodeAtPath(root, path) {
  let node = root;
  for (const index of path) {
    node = node?.children?.[index];
    if (!node) return null;
  }
  return node;
}

function renderMermaidStructure() {
  const editor = state.mermaidEditor;
  if (!editor) return;
  dom.mermaidStructure.replaceChildren();
  dom.mermaidStructureBar.hidden = !canStructureEdit(editor.type);
  dom.mermaidStructureNotice.hidden = true;
  const mindmapOps = editor.type === "mindmap";
  const flowOps = editor.type === "flowchart";
  const lineOps = canStructureEdit(editor.type) && !mindmapOps && !flowOps;
  const opConfig = {
    child: {
      visible: canStructureEdit(editor.type),
      label: flowOps ? "＋ 节点" : mindmapOps ? "＋ 子项" : "＋ 行"
    },
    sibling: { visible: mindmapOps, label: "＋ 同级" },
    outdent: { visible: mindmapOps, label: "← 提升" },
    indent: { visible: mindmapOps, label: "降级 →" },
    up: { visible: mindmapOps || lineOps, label: "上移" },
    down: { visible: mindmapOps || lineOps, label: "下移" },
    edge: { visible: flowOps, label: "＋ 连线" },
    delete: { visible: canStructureEdit(editor.type), label: "删除" }
  };
  for (const button of dom.mermaidStructureBar.querySelectorAll("button[data-mermaid-op]")) {
    const config = opConfig[button.dataset.mermaidOp];
    if (!config) continue;
    button.hidden = !config.visible;
    if (config.label) button.textContent = config.label;
  }
  if (dom.mermaidNodeShape) dom.mermaidNodeShape.hidden = !mindmapOps;

  if (editor.type === "mindmap") {
    const parsed = parseMindmap(editor.source);
    if (!parsed.ok) {
      editor.tree = null;
      showMermaidStructureNotice(`${parsed.error}。可以切到「源码」编辑。`);
      return;
    }
    editor.tree = parsed.root;
    if (editor.selected.length && !nodeAtPath(editor.tree, editor.selected)) {
      editor.selected = [];
    }
    const rows = [];
    const walk = (node, path, depth) => {
      rows.push(renderMindmapRow(node, path, depth));
      (node.children || []).forEach((child, index) => walk(child, [...path, index], depth + 1));
    };
    walk(editor.tree, [], 0);
    dom.mermaidStructure.append(...rows);
    syncMermaidShapeControl();
    return;
  }

  if (editor.type === "flowchart") {
    const parsed = parseFlowchart(editor.source);
    if (!parsed.ok) {
      editor.flow = null;
      showMermaidStructureNotice(`${parsed.error}。可以切到「源码」编辑。`);
      return;
    }
    editor.flow = {
      direction: parsed.direction,
      nodes: parsed.nodes,
      edges: parsed.edges
    };
    renderFlowchartStructure();
    return;
  }

  // Sequence / class / state / pie / gantt / journey / er: a statement-row
  // editor. It is intentionally conservative (one complete Mermaid line per
  // row) so every diagram type gets a structure view without a parser that
  // could rewrite advanced syntax incorrectly.
  if (canStructureEdit(editor.type)) {
    renderMermaidLineStructure();
    return;
  }

  showMermaidStructureNotice(
    `${editor.type === "unknown" ? "该" : `「${editor.type}」`}图种暂不支持结构编辑，可用「源码」编辑，右侧会实时预览。`
  );
  dom.mermaidStructureBar.hidden = true;
}

function showMermaidStructureNotice(text) {
  dom.mermaidStructureNotice.textContent = text;
  dom.mermaidStructureNotice.hidden = false;
}

function mermaidDefaultLine(type) {
  if (type === "sequence") return "A->>B: 消息";
  if (type === "class") return "class 新类";
  if (type === "state") return "[*] --> 新状态";
  if (type === "pie") return "\"新项目\" : 10";
  if (type === "gantt") return "新任务 :a1, 2026-01-01, 3d";
  if (type === "journey") return "新任务: 5: 参与者";
  if (type === "er") return "A ||--o{ B : 关联";
  return "%% 新语句";
}

function mermaidLineInput(index) {
  return dom.mermaidStructure.querySelector(`.mermaid-line-row[data-line-index="${index}"] input`);
}

function renderMermaidLineStructure() {
  const editor = state.mermaidEditor;
  if (!editor) return;
  const clean = stripMindmapTheme(editor.source).replace(/\r\n/g, "\n");
  const lines = clean
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line) => line.trim());
  editor.lines = lines;
  if (!lines.length) {
    showMermaidStructureNotice("图表还没有语句。点「＋ 行」添加，或切到「源码」编辑。");
    return;
  }
  if (!Number.isInteger(editor.lineIndex) || editor.lineIndex >= lines.length) {
    editor.lineIndex = 0;
  }
  showMermaidStructureNotice(
    `${editor.type === "sequence" ? "时序图" : editor.type === "class" ? "类图" : editor.type === "state" ? "状态图" : editor.type === "pie" ? "饼图" : editor.type === "gantt" ? "甘特图" : editor.type === "journey" ? "旅程图" : editor.type === "er" ? "ER 图" : "该图种"}：逐行编辑，每行一条 Mermaid 语句，右侧实时预览。`
  );
  const rows = lines.map((line, index) => {
    const row = document.createElement("div");
    row.className = "mermaid-node mermaid-line-row";
    row.dataset.lineIndex = String(index);
    if (index === editor.lineIndex) row.classList.add("selected");
    row.addEventListener("click", () => {
      editor.lineIndex = index;
      for (const item of dom.mermaidStructure.querySelectorAll(".mermaid-line-row")) {
        item.classList.toggle("selected", item === row);
      }
    });
    const badge = document.createElement("span");
    badge.className = "mermaid-node-id";
    badge.textContent = String(index + 1);
    const input = document.createElement("input");
    input.type = "text";
    input.value = line;
    input.spellcheck = false;
    input.dataset.lineIndex = String(index);
    input.addEventListener("focus", () => {
      editor.lineIndex = index;
      for (const item of dom.mermaidStructure.querySelectorAll(".mermaid-line-row")) {
        item.classList.toggle("selected", item === row);
      }
    });
    input.addEventListener("input", () => {
      if (!state.mermaidEditor?.lines) return;
      state.mermaidEditor.lines[index] = input.value;
      pushMermaidLines();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.isComposing) return;
      event.preventDefault();
      editor.lineIndex = index;
      runMermaidOp("child");
    });
    row.append(badge, input);
    return row;
  });
  dom.mermaidStructure.append(...rows);
}

function focusMermaidLine(index) {
  requestAnimationFrame(() => mermaidLineInput(index)?.focus({ preventScroll: true }));
}

function pushMermaidLines() {
  const editor = state.mermaidEditor;
  if (!editor?.lines) return;
  const base = editor.lines.join("\n").trim();
  editor.baseSource = base;
  editor.source = applyMindmapTheme(base, editor.theme, editor.layout);
  editor.type = detectDiagramType(base);
  dom.mermaidSource.value = editor.source;
  scheduleMermaidPreview();
}

function renderMindmapRow(node, path, depth) {
  const editor = state.mermaidEditor;
  const row = document.createElement("div");
  row.className = "mermaid-node";
  row.style.paddingLeft = `${6 + depth * 16}px`;
  row.dataset.path = path.join(".");
  if (path.join(".") === selectedPath().join(".")) row.classList.add("selected");

  const dot = document.createElement("span");
  dot.className = "mermaid-node-dot";

  const input = document.createElement("input");
  input.type = "text";
  input.value = node.label;
  input.spellcheck = false;
  input.addEventListener("focus", () => {
    editor.selected = path;
    for (const item of dom.mermaidStructure.querySelectorAll(".mermaid-node")) {
      item.classList.toggle("selected", item === row);
    }
    syncMermaidShapeControl();
  });
  input.addEventListener("input", () => {
    node.label = input.value;
    pushMermaidStructure();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      editor.selected = path;
      runMermaidOp("sibling");
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      editor.selected = path;
      runMermaidOp(event.shiftKey ? "outdent" : "child");
    }
  });

  const add = document.createElement("button");
  add.type = "button";
  add.className = "mermaid-node-add";
  add.textContent = "＋";
  add.title = "添加子项";
  add.addEventListener("click", () => {
    node.children = node.children || [];
    node.children.push({ id: "", label: "新分支", shape: "plain", children: [] });
    editor.selected = [...path, node.children.length - 1];
    pushMermaidStructure();
    renderMermaidStructure();
    focusMermaidNode(editor.selected);
  });

  row.append(dot, input);

  if (depth > 0) {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "mermaid-node-del";
    remove.textContent = "✕";
    remove.title = "删除这一项";
    remove.addEventListener("click", () => {
      const parent = nodeAtPath(editor.tree, parentOfPath(path));
      if (!parent?.children) return;
      parent.children.splice(path[path.length - 1], 1);
      editor.selected = parentOfPath(path);
      pushMermaidStructure();
      renderMermaidStructure();
    });
    row.append(remove);
  }

  row.append(add);
  return row;
}

function syncMermaidShapeControl() {
  const editor = state.mermaidEditor;
  if (!editor || !dom.mermaidNodeShape) return;
  const show = editor.type === "mindmap";
  dom.mermaidNodeShape.hidden = !show;
  if (!show) return;
  const node = selectedMindmapNode();
  dom.mermaidNodeShape.value = node?.shape && node.shape !== "" ? node.shape : "plain";
}

function focusMermaidNode(path) {
  const key = path.join(".");
  const row = Array.from(dom.mermaidStructure.querySelectorAll(".mermaid-node")).find(
    (item) => item.dataset.path === key
  );
  row?.querySelector("input")?.focus();
}

function renderFlowchartStructure() {
  const editor = state.mermaidEditor;
  const flow = editor.flow;
  if (!flow) return;
  const wrap = document.createDocumentFragment();

  const directionRow = document.createElement("div");
  directionRow.className = "mermaid-node";
  const directionLabel = document.createElement("span");
  directionLabel.className = "mermaid-node-id";
  directionLabel.textContent = "方向";
  const directionSelect = document.createElement("select");
  for (const value of ["LR", "TD", "RL", "BT"]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    if (value === flow.direction) option.selected = true;
    directionSelect.append(option);
  }
  directionSelect.addEventListener("change", () => {
    flow.direction = directionSelect.value;
    pushMermaidStructure();
  });
  directionRow.append(directionLabel, directionSelect);
  wrap.append(directionRow);

  const nodeTitle = document.createElement("div");
  nodeTitle.className = "mermaid-group-title";
  nodeTitle.textContent = "节点";
  wrap.append(nodeTitle);

  for (const node of flow.nodes) {
    const row = document.createElement("div");
    row.className = "mermaid-node";
    if (editor.selected[0] === node.id) row.classList.add("selected");

    const idLabel = document.createElement("span");
    idLabel.className = "mermaid-node-id";
    idLabel.textContent = node.id;

    const input = document.createElement("input");
    input.type = "text";
    input.value = node.label;
    input.spellcheck = false;
    input.addEventListener("focus", () => {
      editor.selected = [node.id];
      for (const item of dom.mermaidStructure.querySelectorAll(".mermaid-node")) {
        item.classList.toggle("selected", item === row);
      }
    });
    input.addEventListener("input", () => {
      node.label = input.value;
      pushMermaidStructure();
    });

    const shape = document.createElement("select");
    for (const [value, text] of [
      ["rect", "矩形"],
      ["rounded", "圆角"],
      ["diamond", "菱形"],
      ["stadium", "胶囊"],
      ["hexagon", "六边形"]
    ]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      if ((node.shape || "rect") === value) option.selected = true;
      shape.append(option);
    }
    shape.addEventListener("change", () => {
      node.shape = shape.value;
      pushMermaidStructure();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "mermaid-node-del";
    remove.textContent = "✕";
    remove.title = "删除节点";
    remove.addEventListener("click", () => {
      flow.nodes = flow.nodes.filter((item) => item.id !== node.id);
      flow.edges = flow.edges.filter((edge) => edge.from !== node.id && edge.to !== node.id);
      editor.selected = [];
      pushMermaidStructure();
      renderMermaidStructure();
    });

    row.append(idLabel, input, shape, remove);
    wrap.append(row);
  }

  const edgeTitle = document.createElement("div");
  edgeTitle.className = "mermaid-group-title";
  edgeTitle.textContent = "连线";
  wrap.append(edgeTitle);

  flow.edges.forEach((edge, index) => {
    const row = document.createElement("div");
    row.className = "mermaid-node mermaid-edge-row";

    const makeNodeSelect = (value, title) => {
      const select = document.createElement("select");
      select.className = "mermaid-edge-select";
      select.title = title;
      for (const node of flow.nodes) {
        const option = document.createElement("option");
        option.value = node.id;
        option.textContent = `${node.id}·${String(node.label || node.id).slice(0, 8)}`;
        if (node.id === value) option.selected = true;
        select.append(option);
      }
      return select;
    };

    const from = makeNodeSelect(edge.from, "起点节点");
    from.addEventListener("change", () => {
      edge.from = from.value;
      pushMermaidStructure();
    });
    const to = makeNodeSelect(edge.to, "终点节点");
    to.addEventListener("change", () => {
      edge.to = to.value;
      pushMermaidStructure();
    });

    const arrow = document.createElement("span");
    arrow.className = "mermaid-node-id";
    arrow.textContent = "→";

    const label = document.createElement("input");
    label.type = "text";
    label.value = edge.label;
    label.placeholder = "连线文字";
    label.spellcheck = false;
    label.addEventListener("input", () => {
      edge.label = label.value;
      pushMermaidStructure();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "mermaid-node-del";
    remove.textContent = "✕";
    remove.title = "删除连线";
    remove.addEventListener("click", () => {
      flow.edges.splice(index, 1);
      pushMermaidStructure();
      renderMermaidStructure();
    });

    row.append(from, arrow, to, label, remove);
    wrap.append(row);
  });

  dom.mermaidStructure.append(wrap);
}

function openFlowchartEdgeForm() {
  const editor = state.mermaidEditor;
  const flow = editor?.flow;
  if (!flow) return;
  dom.mermaidStructure.querySelector(".mermaid-edge-form")?.remove();
  if (!flow.nodes.length) {
    toast("先添加节点，再连线", { type: "error" });
    return;
  }

  const form = document.createElement("div");
  form.className = "mermaid-edge-form";

  const makeSelect = (title, fallbackIndex) => {
    const select = document.createElement("select");
    select.title = title;
    for (const node of flow.nodes) {
      const option = document.createElement("option");
      option.value = node.id;
      option.textContent = `${node.id}·${String(node.label || node.id).slice(0, 8)}`;
      select.append(option);
    }
    const preset = editor.selected[0];
    if (preset && flow.nodes.some((node) => node.id === preset)) {
      select.value = preset;
    } else if (flow.nodes[fallbackIndex]) {
      select.value = flow.nodes[fallbackIndex].id;
    }
    return select;
  };

  const from = makeSelect("起点节点", 0);
  const to = makeSelect("终点节点", Math.min(1, flow.nodes.length - 1));
  if (flow.nodes.length > 1 && from.value === to.value) {
    to.value = flow.nodes.find((node) => node.id !== from.value)?.id || to.value;
  }

  const arrow = document.createElement("span");
  arrow.className = "mermaid-node-id";
  arrow.textContent = "→";

  const label = document.createElement("input");
  label.type = "text";
  label.placeholder = "连线文字（可选）";
  label.spellcheck = false;

  const submit = document.createElement("button");
  submit.type = "button";
  submit.className = "mermaid-edge-add";
  submit.textContent = "添加";

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "mermaid-edge-cancel";
  cancel.textContent = "取消";

  const commit = () => {
    if (!from.value || !to.value) return;
    flow.edges.push({
      from: from.value,
      to: to.value,
      label: label.value.trim(),
      arrow: "-->"
    });
    pushMermaidStructure();
    renderMermaidStructure();
  };

  submit.addEventListener("click", commit);
  cancel.addEventListener("click", () => form.remove());
  label.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }
  });

  form.append(from, arrow, to, label, submit, cancel);
  dom.mermaidStructure.append(form);
  from.focus();
}

function pushMermaidStructure() {
  const editor = state.mermaidEditor;
  if (!editor) return;
  const lineMode =
    Array.isArray(editor.lines) &&
    editor.type !== "mindmap" &&
    editor.type !== "flowchart";
  if (lineMode) {
    pushMermaidLines();
    return;
  }
  const base =
    editor.type === "mindmap" && editor.tree
      ? serializeMindmap(editor.tree)
      : editor.type === "flowchart" && editor.flow
        ? serializeFlowchart(editor.flow)
        : editor.baseSource;
  editor.baseSource = base;
  editor.source = applyMindmapTheme(base, editor.theme, editor.layout);
  editor.type = detectDiagramType(base);
  dom.mermaidSource.value = editor.source;
  scheduleMermaidPreview();
}

function mermaidOpSelectedNode() {
  if (state.mermaidEditor?.type === "flowchart") {
    const id = state.mermaidEditor.selected[0];
    return state.mermaidEditor.flow?.nodes.find((node) => node.id === id) || null;
  }
  return selectedMindmapNode();
}

function runMermaidOp(op) {
  const editor = state.mermaidEditor;
  if (!editor) return;

  const lineMode =
    Array.isArray(editor.lines) &&
    editor.type !== "mindmap" &&
    editor.type !== "flowchart";
  if (lineMode) {
    const lines = editor.lines;
    const index = Number.isInteger(editor.lineIndex) && editor.lineIndex >= 0
      ? Math.min(editor.lineIndex, lines.length - 1)
      : lines.length - 1;
    if (op === "child") {
      const at = index < 0 ? lines.length : index + 1;
      lines.splice(at, 0, mermaidDefaultLine(editor.type));
      editor.lineIndex = at;
      pushMermaidStructure();
      renderMermaidStructure();
      focusMermaidLine(at);
      return;
    }
    if (op === "delete") {
      if (index < 0) return;
      lines.splice(index, 1);
      editor.lineIndex = Math.min(index, lines.length - 1);
      pushMermaidStructure();
      renderMermaidStructure();
      focusMermaidLine(editor.lineIndex);
      return;
    }
    if (op === "up" || op === "down") {
      const target = op === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= lines.length) return;
      [lines[index], lines[target]] = [lines[target], lines[index]];
      editor.lineIndex = target;
      pushMermaidStructure();
      renderMermaidStructure();
      focusMermaidLine(target);
    }
    return;
  }

  if (editor.type === "flowchart" && editor.flow) {
    if (op === "child") {
      const id = newNodeId(editor.flow.nodes);
      editor.flow.nodes.push({ id, label: "新节点", shape: "rect" });
      editor.selected = [id];
      pushMermaidStructure();
      renderMermaidStructure();
      return;
    }
    if (op === "edge") {
      openFlowchartEdgeForm();
      return;
    }
    if (op === "delete") {
      const id = editor.selected[0];
      if (!id) return;
      editor.flow.nodes = editor.flow.nodes.filter((node) => node.id !== id);
      editor.flow.edges = editor.flow.edges.filter((edge) => edge.from !== id && edge.to !== id);
      editor.selected = [];
      pushMermaidStructure();
      renderMermaidStructure();
    }
    return;
  }

  if (editor.type !== "mindmap" || !editor.tree) return;
  const path = selectedPath();
  const node = nodeAtPath(editor.tree, path);

  if (op === "child") {
    node.children = node.children || [];
    node.children.push({ id: "", label: "新分支", shape: "plain", children: [] });
    editor.selected = [...path, node.children.length - 1];
    pushMermaidStructure();
    renderMermaidStructure();
    focusMermaidNode(editor.selected);
    return;
  }

  if (op === "sibling") {
    if (!path.length) {
      node.children = node.children || [];
      node.children.push({ id: "", label: "新分支", shape: "plain", children: [] });
      editor.selected = [node.children.length - 1];
    } else {
      const parentPath = parentOfPath(path);
      const parent = nodeAtPath(editor.tree, parentPath);
      if (!parent?.children) return;
      const index = path[path.length - 1];
      parent.children.splice(index + 1, 0, {
        id: "",
        label: "新分支",
        shape: "plain",
        children: []
      });
      editor.selected = [...parentPath, index + 1];
    }
    pushMermaidStructure();
    renderMermaidStructure();
    focusMermaidNode(editor.selected);
    return;
  }

  if (op === "up" || op === "down") {
    if (!path.length) return;
    const parent = nodeAtPath(editor.tree, parentOfPath(path));
    if (!parent?.children) return;
    const index = path[path.length - 1];
    const target = op === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= parent.children.length) return;
    [parent.children[index], parent.children[target]] = [
      parent.children[target],
      parent.children[index]
    ];
    editor.selected = [...parentOfPath(path), target];
    pushMermaidStructure();
    renderMermaidStructure();
    focusMermaidNode(editor.selected);
    return;
  }

  if (op === "indent") {
    if (path.length < 1) return;
    const parent = nodeAtPath(editor.tree, parentOfPath(path));
    const index = path[path.length - 1];
    if (!parent?.children || index === 0) {
      toast("没有可依附的上一级节点", { type: "error" });
      return;
    }
    const [node] = parent.children.splice(index, 1);
    const host = parent.children[index - 1];
    host.children = host.children || [];
    host.children.push(node);
    editor.selected = [...parentOfPath(path), index - 1, host.children.length - 1];
    pushMermaidStructure();
    renderMermaidStructure();
    focusMermaidNode(editor.selected);
    return;
  }

  if (op === "outdent") {
    if (path.length < 2) {
      toast("已经是第一级节点", { type: "error" });
      return;
    }
    const parentPath = parentOfPath(path);
    const grandPath = parentOfPath(parentPath);
    const parent = nodeAtPath(editor.tree, parentPath);
    const grand = nodeAtPath(editor.tree, grandPath);
    if (!parent?.children || !grand?.children) return;
    const parentIndex = parentPath[parentPath.length - 1];
    const [node] = parent.children.splice(path[path.length - 1], 1);
    grand.children.splice(parentIndex + 1, 0, node);
    editor.selected = [...grandPath, parentIndex + 1];
    pushMermaidStructure();
    renderMermaidStructure();
    focusMermaidNode(editor.selected);
    return;
  }

  if (op === "delete") {
    if (!path.length) {
      toast("根节点不能删除", { type: "error" });
      return;
    }
    const parent = nodeAtPath(editor.tree, parentOfPath(path));
    if (!parent?.children) return;
    parent.children.splice(path[path.length - 1], 1);
    editor.selected = parentOfPath(path);
    pushMermaidStructure();
    renderMermaidStructure();
  }
}

function centerTreeScroll(container) {
  if (!container) return;
  requestAnimationFrame(() => {
    const max = container.scrollWidth - container.clientWidth;
    if (max > 0) container.scrollLeft = max / 2;
  });
}

function scheduleMermaidPreview() {
  const editor = state.mermaidEditor;
  if (!editor) return;
  clearTimeout(editor.timer);
  editor.timer = window.setTimeout(() => {
    updateMermaidPreview().catch((error) => console.warn("Mermaid 预览失败", error));
  }, 240);
}

async function updateMermaidPreview() {
  const editor = state.mermaidEditor;
  if (!editor) return;
  const request = ++editor.requestId;
  const prepared = prepareMermaidRender(editor.source);
  const source = prepared.source.trim();
  if (!source) {
    dom.mermaidPreview.replaceChildren();
    dom.mermaidEditorError.hidden = true;
    return;
  }
  dom.mermaidPreview.innerHTML = '<div class="mermaid-loading">图表渲染中…</div>';
  let mermaid = null;
  try {
    mermaid = await loadMermaid();
  } catch (error) {
    dom.mermaidPreview.replaceChildren();
    dom.mermaidEditorError.hidden = false;
    dom.mermaidEditorError.textContent = `无法加载 Mermaid：${cleanError(error)}`;
    return;
  }
  if (request !== editor.requestId) return;

  const colors = resolveMindmapColors(editor.theme);
  const signature = `${mermaidThemeSignature()}|${colors ? `${colors.primary}-${colors.secondary}` : "auto"}`;
  if (signature !== mermaidThemeKey) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      fontFamily: MERMAID_FONT,
      flowchart: { useMaxWidth: false, htmlLabels: true },
      ...mermaidThemeConfig(colors)
    });
    mermaidThemeKey = signature;
  }

  const id = `mermaid-editor-${++mermaidSequence}`;
  try {
    const { svg } = await mermaid.render(id, source);
    if (request !== editor.requestId) return;
    dom.mermaidPreview.innerHTML = svg;
    dom.mermaidPreview.classList.toggle("layout-tree", prepared.layout.mode === "tree");
    if (prepared.layout.direction === "TB" || prepared.layout.direction === "BT") {
      centerTreeScroll(dom.mermaidPreview);
    }
    dom.mermaidEditorError.hidden = true;
    dom.mermaidEditorError.textContent = "";
  } catch (error) {
    document.getElementById(id)?.remove();
    document.getElementById(`d${id}`)?.remove();
    if (request !== editor.requestId) return;
    dom.mermaidPreview.replaceChildren();
    dom.mermaidEditorError.hidden = false;
    dom.mermaidEditorError.textContent = cleanError(error);
  }
}

/* -------------------------------------------------------------------------- */
/* Mermaid: locating and replacing source blocks                               */
/* -------------------------------------------------------------------------- */

function findMermaidBlocks(content) {
  const text = String(content || "");
  const lines = text.split("\n");
  const starts = [];
  let offset = 0;
  for (const line of lines) {
    starts.push(offset);
    offset += line.length + 1;
  }

  const blocks = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^([ \t]*)```(mermaid|mmd)\s*$/i);
    if (!match) continue;
    const bodyLines = [];
    let closing = -1;
    for (let next = index + 1; next < lines.length; next += 1) {
      if (lines[next].trim() === "```") {
        closing = next;
        break;
      }
      bodyLines.push(lines[next]);
    }
    if (closing < 0) break;
    blocks.push({
      start: starts[index],
      end: starts[closing] + lines[closing].length,
      indent: match[1] || "",
      body: bodyLines.join("\n"),
      startLine: index + 1
    });
    index = closing;
  }
  return blocks;
}

function patchMermaidBlocks(content, target, replacement) {
  const blocks = findMermaidBlocks(content);
  const wanted = stripMindmapTheme(target.oldSource || "").trim();
  let match = null;

  // A source line keeps duplicate diagrams apart; fall back to content match.
  if (Number.isFinite(target.line)) {
    match = blocks.find((block) => block.startLine === target.line + 1) || null;
  }
  if (!match) {
    match = blocks.find((block) => stripMindmapTheme(block.body).trim() === wanted) || null;
  }
  if (!match && typeof target.index === "number") {
    match = blocks[target.index];
  }
  if (!match) return null;
  const text = String(content || "");
  if (replacement === null) {
    let end = match.end;
    if (text[end] === "\n" && text[end + 1] === "\n") end += 1;
    return text.slice(0, match.start) + text.slice(end);
  }
  const fence = `${match.indent}\`\`\`mermaid\n${replacement}\n${match.indent}\`\`\``;
  return text.slice(0, match.start) + fence + text.slice(match.end);
}

function commitMermaidEditor() {
  const editor = state.mermaidEditor;
  if (!editor) return;
  const source = editor.source.trim();
  if (!source) {
    toast("图表内容不能为空", { type: "error" });
    return;
  }
  const target = editor.target;
  const doc = activeDoc();
  closeMermaidEditor();
  if (!doc) return;
  if (target) {
    if (target.visual) {
      replaceVisualMermaid(target, source);
    } else {
      replaceSourceMermaid(target, source);
    }
    return;
  }
  insertMermaidSource(source);
}

function insertMermaidSource(source) {
  const doc = activeDoc();
  if (!doc) return;
  const fence = `\`\`\`mermaid\n${source}\n\`\`\``;
  if (state.isVisualEditing) {
    const element = mermaidFigureElements(source);
    if (!element) return;
    insertVisualBlock(element, captureVisualSelection());
    element.setAttribute("contenteditable", "false");
    syncVisualContent();
    scheduleMermaidRender();
    return;
  }
  insertBlock(fence);
  toast("已插入图表，双击可再次编辑", { type: "success", duration: 2400 });
}

function replaceSourceMermaid(target, source) {
  const doc = activeDoc();
  if (!doc) return;
  const next = patchMermaidBlocks(doc.content, target, source);
  if (next === null) {
    toast("无法在源码中定位这个图表", { type: "error" });
    return;
  }
  const head = view.state.selection.main.head;
  const delta = next.length - doc.content.length;
  view.dispatch({
    changes: { from: 0, to: doc.content.length, insert: next },
    selection: { anchor: Math.max(0, Math.min(next.length, head + delta)) }
  });
  view.focus();
  toast("图表已更新", { type: "success", duration: 1500 });
}

function deleteMermaidTarget() {
  const editor = state.mermaidEditor;
  const target = editor?.target;
  if (!target) return;
  closeMermaidEditor();
  if (target.visual) {
    const figures = Array.from(dom.preview.querySelectorAll(".mermaid-figure"));
    const figure = figures[target.index];
    if (figure) {
      figure.remove();
      state.visualDirty = true;
      updateSaveState();
      scheduleVisualSync();
      toast("图表已删除", { type: "success", duration: 1500 });
    }
    return;
  }
  const doc = activeDoc();
  if (!doc) return;
  const next = patchMermaidBlocks(doc.content, target, null);
  if (next === null) {
    toast("无法在源码中定位这个图表", { type: "error" });
    return;
  }
  view.dispatch({ changes: { from: 0, to: doc.content.length, insert: next } });
  view.focus();
  toast("图表已删除", { type: "success", duration: 1500 });
}

function replaceVisualMermaid(target, source) {
  const figures = Array.from(dom.preview.querySelectorAll(".mermaid-figure"));
  const figure = figures[target.index];
  if (!figure) {
    toast("无法定位图表节点", { type: "error" });
    return;
  }
  figure.dataset.mermaidSrc = encodeURIComponent(source);
  figure.dataset.mermaidState = "pending";
  figure.classList.remove("has-error");
  const canvas = figure.querySelector(".mermaid-canvas");
  if (canvas) canvas.innerHTML = '<div class="mermaid-loading">图表渲染中…</div>';
  const sourcePanel = figure.querySelector(".mermaid-source code");
  if (sourcePanel) sourcePanel.textContent = source;
  state.visualDirty = true;
  updateSaveState();
  scheduleVisualSync();
  scheduleMermaidRender();
  toast("图表已更新", { type: "success", duration: 1500 });
}

function openMermaidForFigure(figure) {
  const figures = Array.from(dom.preview.querySelectorAll(".mermaid-figure"));
  const index = figures.indexOf(figure);
  const line = Number(figure.getAttribute("data-source-line"));
  const source = mermaidSourceFromElement(figure);
  openMermaidEditor({
    source,
    target: {
      visual: state.isVisualEditing,
      index,
      line: Number.isFinite(line) ? line : undefined,
      oldSource: source
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Visual Markdown editing                                                     */
/* -------------------------------------------------------------------------- */

const VISUAL_ATOMIC_BLOCKS = ".mermaid-figure, .math-block, .code-block, .table-shell, .html-preview, hr";

function ensureVisualCaretSpacers() {
  if (!state.isVisualEditing) return;
  for (const block of Array.from(dom.preview.querySelectorAll(VISUAL_ATOMIC_BLOCKS))) {
    // Keep this to top-level blocks: spacers inside list items / blockquotes
    // would change the Markdown structure when serialized.
    if (block.parentElement !== dom.preview) continue;
    if (!block.previousElementSibling) {
      const before = document.createElement("p");
      before.className = "visual-caret-spacer";
      before.append(document.createElement("br"));
      block.before(before);
    }
    const next = block.nextElementSibling;
    // A spacer after every atomic block gives the user a visible place to
    // click below it; empty spacers are dropped again during serialization.
    if (!next || !next.classList.contains("visual-caret-spacer")) {
      const after = document.createElement("p");
      after.className = "visual-caret-spacer";
      after.append(document.createElement("br"));
      block.after(after);
    }
  }
}

function serializeVisualMarkdown() {
  const clone = dom.preview.cloneNode(true);
  clone.removeAttribute("contenteditable");
  clone.querySelectorAll("button, .code-head, .html-preview, .code-preview-toggle, .table-toolbar, .mermaid-head").forEach((node) => node.remove());
  // Empty caret spacers exist only to make non-editable blocks reachable.
  for (const spacer of Array.from(clone.querySelectorAll(".visual-caret-spacer"))) {
    if (!spacer.textContent.trim() && !spacer.querySelector("img, table, pre")) spacer.remove();
  }
  for (const shell of Array.from(clone.querySelectorAll(".table-shell"))) {
    const table = shell.querySelector("table");
    if (table) shell.replaceWith(table);
    else shell.remove();
  }
  for (const token of Array.from(clone.querySelectorAll(".color-token"))) {
    const code = token.querySelector("code");
    if (code) token.replaceWith(code);
    else token.remove();
  }
  for (const image of clone.querySelectorAll("img")) {
    const source = image.getAttribute("data-md-src");
    if (source) image.setAttribute("src", source);
    image.removeAttribute("data-md-src");
    image.removeAttribute("loading");
  }
  for (const mark of clone.querySelectorAll("mark[data-auto-color]")) {
    mark.style.removeProperty("color");
    mark.removeAttribute("data-auto-color");
  }
  for (const node of clone.querySelectorAll("[contenteditable]")) {
    node.removeAttribute("contenteditable");
  }

  let markdown = "";
  try {
    markdown = turndown.turndown(clone.innerHTML);
  } catch (error) {
    console.error("Visual serialization failed", error);
    return null;
  }
  markdown = markdown
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  return markdown ? `${markdown}\n` : "";
}

function syncVisualContent(rebuildState = false) {
  const doc = activeDoc();
  if (!doc || !state.isVisualEditing) return null;
  const markdown = serializeVisualMarkdown();
  if (markdown === null) return null;
  if (markdown !== doc.content) {
    doc.content = markdown;
    refreshDirty(doc);
    scheduleCounts();
    scheduleAutosave();
    updateOutline();
    doc.cmState = EditorState.create({ doc: doc.content, extensions: editorExtensions() });
  }
  state.visualDirty = false;
  if (rebuildState) {
    doc.cmState = EditorState.create({ doc: doc.content, extensions: editorExtensions() });
  }
  updateSaveState();
  return markdown;
}

function scheduleVisualSync() {
  if (!state.isVisualEditing) return;
  clearTimeout(state.visualTimer);
  state.visualTimer = window.setTimeout(() => {
    if (state.isVisualEditing) syncVisualContent(false);
  }, 180);
}

function startVisualEditing() {
  if (!activeDoc() || state.isVisualEditing) return;
  state.isVisualEditing = true;
  state.visualDirty = false;
  dom.preview.contentEditable = "true";
  dom.preview.spellcheck = true;
  dom.preview.classList.add("visual-canvas");
  dom.preview.querySelectorAll("button, input, .code-head, .html-preview, .color-token, .math-block, .math-inline, .katex").forEach((node) => {
    node.setAttribute("contenteditable", "false");
  });
  ensureVisualCaretSpacers();
  try {
    document.execCommand("defaultParagraphSeparator", false, "p");
    document.execCommand("styleWithCSS", false, false);
  } catch {
    // Older Chromium builds may not support this command.
  }
  updateCursorInfo();
  dom.preview.focus();
}

function finishVisualEditing({ render = true } = {}) {
  if (!state.isVisualEditing) return;
  const changed = state.visualDirty;
  clearTimeout(state.visualTimer);
  if (changed) syncVisualContent(true);
  state.isVisualEditing = false;
  state.visualDirty = false;
  dom.preview.contentEditable = "false";
  dom.preview.spellcheck = false;
  dom.preview.classList.remove("visual-canvas");
  updateSaveState();
  if (render) renderPreview({ reset: false });
}

function reenterVisualEditing() {
  if (state.viewMode === "visual" && activeDoc() && !state.isVisualEditing) {
    renderPreview();
    startVisualEditing();
  }
}

function ensureVisualCaret() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return false;
  return dom.preview.contains(selection.getRangeAt(0).commonAncestorContainer);
}

function insertVisualText(text) {
  if (!state.isVisualEditing) return;
  dom.preview.focus();
  const selection = window.getSelection();
  if (!ensureVisualCaret()) {
    const range = document.createRange();
    range.selectNodeContents(dom.preview);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  document.execCommand("insertText", false, String(text ?? ""));
  state.visualDirty = true;
  updateSaveState();
  scheduleVisualSync();
}

function wrapVisualSelection(tagName, styles = {}, placeholder = "彩色文字", attrs = {}) {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) {
    toast("请先在内容中选中一段文字", { type: "error" });
    return false;
  }
  const range = selection.getRangeAt(0);
  if (!dom.preview.contains(range.commonAncestorContainer)) {
    toast("请先在内容中选中一段文字", { type: "error" });
    return false;
  }
  const wrapper = document.createElement(tagName);
  for (const [property, value] of Object.entries(styles)) {
    wrapper.style.setProperty(property, value);
  }
  for (const [name, value] of Object.entries(attrs)) {
    wrapper.setAttribute(name, value);
  }
  if (range.collapsed) {
    wrapper.textContent = placeholder;
    range.insertNode(wrapper);
  } else {
    wrapper.append(range.extractContents());
    range.insertNode(wrapper);
  }
  const nextRange = document.createRange();
  nextRange.selectNodeContents(wrapper);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  state.visualDirty = true;
  updateSaveState();
  scheduleVisualSync();
  return true;
}

function updateVisualHeadingSelect() {
  if (!state.isVisualEditing) return;
  const selection = window.getSelection();
  if (!selection || !selection.anchorNode) return;
  const element =
    selection.anchorNode.nodeType === Node.ELEMENT_NODE
      ? selection.anchorNode
      : selection.anchorNode.parentElement;
  const heading = element?.closest("h1, h2, h3, h4, h5, h6");
  dom.headingSelect.value = heading ? String(Math.min(Number(heading.tagName.slice(1)), 4)) : "0";
}

function applyVisualFormat(kind) {
  if (!state.isVisualEditing) return;
  dom.preview.focus();
  state.visualDirty = true;
  updateSaveState();
  try {
    document.execCommand("styleWithCSS", false, false);
  } catch {
    // Ignore unsupported command.
  }
  switch (kind) {
    case "bold":
      document.execCommand("bold");
      break;
    case "italic":
      document.execCommand("italic");
      break;
    case "strike":
      document.execCommand("strikeThrough");
      break;
    case "inlineCode":
      wrapVisualSelection("code", {}, "代码");
      break;
    case "link":
      if (ensureVisualCaret()) {
        wrapVisualSelection("a", { color: "var(--accent)" }, "链接文字");
        toast("链接已插入；可在源码模式修改 URL", { duration: 2200 });
      }
      break;
    case "quote":
      document.execCommand("formatBlock", false, "blockquote");
      break;
    case "ul":
      document.execCommand("insertUnorderedList");
      break;
    case "ol":
      document.execCommand("insertOrderedList");
      break;
    case "task":
      document.execCommand(
        "insertHTML",
        false,
        '<ul class="contains-task-list"><li class="task-list-item"><input type="checkbox" disabled> 待办事项</li></ul>'
      );
      break;
    case "table":
      insertVisualBlockHtml(
        "<table><thead><tr><th>列 1</th><th>列 2</th><th>列 3</th></tr></thead><tbody><tr><td>内容</td><td>内容</td><td>内容</td></tr></tbody></table>"
      );
      decorateTables();
      break;
    case "hr":
      insertVisualBlockHtml("<hr>");
      break;
    default:
      break;
  }
  scheduleVisualSync();
  updateVisualHeadingSelect();
}

/* -------------------------------------------------------------------------- */
/* Preview interactions                                                        */
/* -------------------------------------------------------------------------- */

function ensureHtmlPreview(block) {
  const preview = block.querySelector(".html-preview");
  const code = block.querySelector("pre code");
  if (!preview || !code) return null;
  if (!preview.shadowRoot) {
    const { body, styles } = prepareHtmlPreview(code.textContent || "");
    const shadow = preview.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `${HTML_PREVIEW_BASE_CSS}\n${styles}`;
    const root = document.createElement("div");
    root.className = "html-preview-root";
    root.innerHTML = body;
    shadow.append(style, root);
    shadow.addEventListener("click", (event) => {
      const anchor = event.target.closest("a");
      if (!anchor) return;
      event.preventDefault();
      const href = anchor.getAttribute("href") || "";
      if (/^(https?|mailto):/i.test(href)) {
        api.openExternal(href).catch(() => {});
      } else {
        toast("预览中的相对链接请在浏览器中打开", { duration: 2200 });
      }
    });
  }
  return preview;
}

function toggleHtmlPreview(button) {
  const block = button.closest(".code-block");
  if (!block) return;
  const preview = ensureHtmlPreview(block);
  if (!preview) return;
  const show = preview.hidden;
  preview.hidden = !show;
  button.textContent = show ? "源码" : "预览";
  button.classList.toggle("active", show);
}

function decorateTables() {
  if (state.viewMode === "read") return;
  const tables = Array.from(dom.preview.querySelectorAll("table"));
  for (const table of tables) {
    if (table.closest(".table-shell")) continue;
    const wrapper = document.createElement("div");
    wrapper.className = "table-shell";
    table.parentNode.insertBefore(wrapper, table);
    wrapper.append(table);
    const toolbar = document.createElement("div");
    toolbar.className = "table-toolbar";
    toolbar.contentEditable = "false";
    toolbar.innerHTML = `
      <span class="table-toolbar-label">表格</span>
      <button type="button" data-table-action="row-above" title="在光标行上方插入一行">↑ 行</button>
      <button type="button" data-table-action="row-below" title="在光标行下方插入一行">↓ 行</button>
      <button type="button" data-table-action="delete-row" title="删除光标所在行">− 行</button>
      <button type="button" data-table-action="col-left" title="在光标列左侧插入一列">← 列</button>
      <button type="button" data-table-action="col-right" title="在光标列右侧插入一列">→ 列</button>
      <button type="button" data-table-action="delete-col" title="删除光标所在列">− 列</button>
      <span class="table-toolbar-hint">点击单元格或定位光标</span>`;
    wrapper.prepend(toolbar);
    bindTableToolbarHover(wrapper, toolbar);
    keepToolbarUnderPointer(wrapper, toolbar);
  }
}

function keepToolbarUnderPointer(shell, toolbar) {
  const pointer = state.lastPointer;
  if (!pointer) return;
  requestAnimationFrame(() => {
    const rect = toolbar.getBoundingClientRect();
    if (
      pointer.x >= rect.left &&
      pointer.x <= rect.right &&
      pointer.y >= rect.top &&
      pointer.y <= rect.bottom
    ) {
      shell.classList.add("table-toolbar-open");
    }
  });
}

/**
 * The toolbar floats above the table, so moving the pointer up leaves the
 * table box before the toolbar becomes hit-testable. Keep it open briefly
 * after leaving, and cancel that timer once the pointer reaches the toolbar.
 */
function bindTableToolbarHover(shell, toolbar) {
  let closeTimer = 0;
  const open = () => {
    window.clearTimeout(closeTimer);
    shell.classList.add("table-toolbar-open");
  };
  const closeSoon = () => {
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      shell.classList.remove("table-toolbar-open");
    }, 320);
  };
  shell.addEventListener("pointerenter", open);
  shell.addEventListener("pointerleave", closeSoon);
  toolbar.addEventListener("pointerenter", open);
  toolbar.addEventListener("pointerleave", closeSoon);
  toolbar.addEventListener("focusin", open);
  toolbar.addEventListener("focusout", closeSoon);
}

function splitTableLine(line) {
  let value = String(line || "").trim();
  if (value.startsWith("|")) value = value.slice(1);
  if (value.endsWith("|") && !value.endsWith("\\|")) value = value.slice(0, -1);
  const cells = [];
  let current = "";
  let escaped = false;
  for (const char of value) {
    if (escaped) {
      current += char;
      escaped = false;
    } else if (char === "\\") {
      current += char;
      escaped = true;
    } else if (char === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function joinTableLine(cells) {
  return `| ${cells.join(" | ")} |`;
}

const isTableDelimiter = (line) => {
  const cells = splitTableLine(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")));
};

function caretCellInTable(table) {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return null;
  const node = selection.anchorNode;
  const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
  const cell = element?.closest("td, th");
  return cell && table.contains(cell) ? cell : null;
}

function tableSelectionPosition(table) {
  const cell = caretCellInTable(table) || table.querySelector(".table-cell-active");
  if (!cell) return null;
  return { rowIndex: cell.parentElement.rowIndex, colIndex: cell.cellIndex };
}

function sourceTableCursorPosition(startLine, endLine, columnCount) {
  if (!view) return null;
  const head = view.state.selection.main.head;
  const line = view.state.doc.lineAt(head);
  const sourceLine = line.number - 1;
  if (sourceLine < startLine || sourceLine > endLine) return null;
  let rowIndex = sourceLine <= startLine + 1 ? 0 : sourceLine - startLine - 1;
  rowIndex = Math.max(0, rowIndex);
  const prefix = line.text.slice(0, head - line.from);
  const leadingPipe = /^\s*\|/.test(line.text);
  let pipes = 0;
  let escaped = false;
  for (const char of prefix) {
    if (escaped) {
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === "|") {
      pipes += 1;
    }
  }
  const colIndex = Math.max(0, Math.min(columnCount - 1, leadingPipe ? pipes - 1 : pipes));
  return { rowIndex, colIndex };
}

function tableLocation(shell, table) {
  const selected = tableSelectionPosition(table);
  if (selected) return selected;
  const rows = Array.from(table.rows);
  return {
    rowIndex: Math.max(0, rows.length - 1),
    colIndex: Math.max(0, (table.rows[0]?.cells.length || 1) - 1)
  };
}

function setActiveTableCell(cell) {
  if (!cell) return;
  const table = cell.closest("table");
  if (!table) return;
  table.querySelectorAll(".table-cell-active").forEach((item) => {
    item.classList.remove("table-cell-active");
  });
  cell.classList.add("table-cell-active");
}

function editVisualTable(action, table) {
  const { rowIndex, colIndex } = tableLocation(null, table);
  const columnCount = table.rows[0]?.cells.length || 0;
  if (!columnCount) return;
  const body = table.tBodies[0] || table.createTBody();
  if (action === "row-above" || action === "row-below") {
    const row = document.createElement("tr");
    for (let index = 0; index < columnCount; index += 1) {
      const cell = document.createElement("td");
      cell.textContent = "";
      row.append(cell);
    }
    const reference = table.rows[rowIndex];
    if (rowIndex === 0) {
      body.insertBefore(row, body.rows[0] || null);
    } else if (action === "row-above") {
      reference.before(row);
    } else {
      reference.after(row);
    }
    setActiveTableCell(row.cells[Math.min(colIndex, columnCount - 1)]);
  } else if (action === "delete-row") {
    if (rowIndex === 0) {
      toast("表头行不能删除；可在表头下方添加行", { type: "error" });
      return;
    }
    const row = table.rows[rowIndex];
    if (row) row.remove();
  } else if (action === "col-left" || action === "col-right") {
    const index = action === "col-left" ? colIndex : Math.min(colIndex + 1, columnCount);
    for (const row of Array.from(table.rows)) {
      const cell = document.createElement(row.parentElement === table.tHead ? "th" : "td");
      cell.textContent = row.parentElement === table.tHead ? "新列" : "";
      row.insertBefore(cell, row.cells[index] || null);
    }
    const targetRow = table.rows[Math.min(rowIndex, table.rows.length - 1)];
    if (targetRow) setActiveTableCell(targetRow.cells[index]);
  } else if (action === "delete-col") {
    if (columnCount <= 1) {
      toast("表格至少需要保留一列", { type: "error" });
      return;
    }
    for (const row of Array.from(table.rows)) {
      row.cells[Math.min(colIndex, columnCount - 1)]?.remove();
    }
  }
  state.visualDirty = true;
  updateSaveState();
  scheduleVisualSync();
}

function editMarkdownTable(action, table) {
  const doc = activeDoc();
  if (!doc) return 0;
  const startLine = Number(table.getAttribute("data-source-line"));
  if (!Number.isFinite(startLine)) {
    toast("无法定位表格源码", { type: "error" });
    return 0;
  }
  const lines = doc.content.split("\n");
  let endLine = startLine;
  while (
    endLine + 1 < lines.length &&
    lines[endLine + 1].trim() !== "" &&
    lines[endLine + 1].includes("|")
  ) {
    endLine += 1;
  }
  const block = lines.slice(startLine, endLine + 1);
  if (block.length < 2 || !isTableDelimiter(block[1])) {
    toast("这个表格格式无法安全编辑", { type: "error" });
    return 0;
  }

  const headerCells = splitTableLine(block[0]);
  const columnCount = headerCells.length;
  const cursorLocation = sourceTableCursorPosition(startLine, endLine, columnCount);
  const location = cursorLocation || tableSelectionPosition(table) || tableLocation(null, table);
  const { rowIndex, colIndex } = location;
  const sourceRow = rowIndex === 0 ? 0 : rowIndex + 1;
  let nextBlock = block.map((line) => line);

  if (action === "row-above" || action === "row-below") {
    const insertAt = rowIndex === 0 ? 2 : action === "row-above" ? sourceRow : sourceRow + 1;
    const row = joinTableLine(Array.from({ length: columnCount }, () => ""));
    nextBlock.splice(Math.min(insertAt, nextBlock.length), 0, row);
  } else if (action === "delete-row") {
    if (sourceRow === 0) {
      toast("表头行不能删除；可在表头下方添加行", { type: "error" });
      return 0;
    }
    if (nextBlock.length <= 2) {
      toast("表格至少需要保留一行表头", { type: "error" });
      return 0;
    }
    nextBlock.splice(sourceRow, 1);
  } else if (action === "col-left" || action === "col-right") {
    const insertAt =
      action === "col-left" ? colIndex : Math.min(colIndex + 1, columnCount);
    nextBlock = nextBlock.map((line, index) => {
      const cells = splitTableLine(line);
      cells.splice(insertAt, 0, index === 1 ? "---" : index === 0 ? "新列" : "");
      return joinTableLine(cells);
    });
  } else if (action === "delete-col") {
    if (columnCount <= 1) {
      toast("表格至少需要保留一列", { type: "error" });
      return 0;
    }
    const removeAt = Math.min(colIndex, columnCount - 1);
    nextBlock = nextBlock.map((line) => {
      const cells = splitTableLine(line);
      cells.splice(removeAt, 1);
      return joinTableLine(cells);
    });
  }

  const from = view.state.doc.line(startLine + 1).from;
  const to = view.state.doc.line(endLine + 1).to;
  // Keep both panes still: the user is clicking a floating toolbar, so
  // scrolling to the caret would move the toolbar out from under the pointer.
  const editorScroll = view.scrollDOM.scrollTop;
  const previewScroll = dom.previewPane.scrollTop;
  state.scrollLockUntil = Date.now() + 320;
  view.dispatch({ changes: { from, to, insert: nextBlock.join("\n") } });
  view.focus();
  view.scrollDOM.scrollTop = editorScroll;
  dom.previewPane.scrollTop = previewScroll;
  toast("表格已更新", { duration: 1200 });
  return 1;
}

function handleTableAction(action, button) {
  const shell = button.closest(".table-shell");
  const table = shell?.querySelector("table");
  if (!table) return;
  if (state.isVisualEditing) editVisualTable(action, table);
  else editMarkdownTable(action, table);
}

function clearTableSelection() {
  dom.preview.querySelectorAll(".table-cell-active").forEach((cell) => {
    cell.classList.remove("table-cell-active");
  });
}

async function handlePreviewClick(event) {
  const mermaidEdit = event.target.closest(".mermaid-edit");
  if (mermaidEdit) {
    event.preventDefault();
    const figure = mermaidEdit.closest(".mermaid-figure");
    if (figure) openMermaidForFigure(figure);
    return;
  }

  const mermaidToggle = event.target.closest(".mermaid-toggle");
  if (mermaidToggle) {
    event.preventDefault();
    toggleMermaidSource(mermaidToggle);
    return;
  }

  const mermaidCopy = event.target.closest(".mermaid-copy");
  if (mermaidCopy) {
    event.preventDefault();
    await copyMermaidSource(mermaidCopy);
    return;
  }

  const tableAction = event.target.closest("[data-table-action]");
  if (tableAction) {
    event.preventDefault();
    event.stopPropagation();
    handleTableAction(tableAction.dataset.tableAction, tableAction);
    return;
  }

  const cell = event.target.closest("table th, table td");
  if (cell && state.viewMode !== "read") {
    setActiveTableCell(cell);
  }

  const previewToggle = event.target.closest(".code-preview-toggle");
  if (previewToggle) {
    event.preventDefault();
    toggleHtmlPreview(previewToggle);
    return;
  }

  const copyButton = event.target.closest(".code-copy");
  if (copyButton) {
    const block = copyButton.closest(".code-block");
    const code = block?.querySelector("code");
    if (code) {
      await api.copyText(code.textContent);
      copyButton.textContent = "已复制";
      copyButton.classList.add("copied");
      window.setTimeout(() => {
        copyButton.textContent = "复制";
        copyButton.classList.remove("copied");
      }, 1400);
    }
    return;
  }

  const chip = event.target.closest(".color-chip");
  if (chip) {
    await api.copyText(chip.dataset.color);
    toast(`已复制 ${chip.dataset.color}`, { type: "success", duration: 1500 });
    return;
  }

  const anchor = event.target.closest("a");
  if (!anchor) return;
  event.preventDefault();
  const href = anchor.getAttribute("href") || "";
  await handleLink(href);
}

function handleHomeClick(event) {
  const anchor = event.target.closest("a");
  if (!anchor || !dom.customHome?.contains(anchor)) return;
  event.preventDefault();
  const href = anchor.getAttribute("href") || "";
  if (!href) return;
  if (href.startsWith("#")) {
    const id = decodeURIComponent(href.slice(1));
    const target = dom.customHome.querySelector(`#${cssEscape(id)}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  handleLink(href);
}

async function handleLink(href) {
  if (!href) return;
  if (href.startsWith("#")) {
    const id = decodeURIComponent(href.slice(1));
    const target = dom.preview.querySelector(`#${cssEscape(id)}`);
    if (target) {
      const paneRect = dom.previewPane.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      dom.previewPane.scrollTo({
        top: dom.previewPane.scrollTop + targetRect.top - paneRect.top - 24,
        behavior: "smooth"
      });
    }
    return;
  }

  if (/^(https?|mailto|tel):/i.test(href)) {
    try {
      await api.openExternal(href);
    } catch (error) {
      toast(`无法打开链接：${cleanError(error)}`, { type: "error" });
    }
    return;
  }

  if (href.startsWith("file://")) {
    await openPath(fileUrlToLocalPath(href));
    return;
  }

  const doc = activeDoc();
  if (!doc || !doc.path) {
    toast("无法解析相对链接：文档尚未保存");
    return;
  }
  const resolved = resolveLocalPath(href, doc.path);
  if (resolved.startsWith("file://")) {
    const local = fileUrlToLocalPath(resolved);
    if (/\.(md|markdown|mdown|mkd|mdx|txt)$/i.test(local)) {
      await openPath(local);
    } else {
      await api.openPath(local);
    }
  }
}

function noteLabel(entry) {
  const name = String(entry?.name || "未命名笔记");
  return /\.md$/i.test(name) ? name : `${name}.md`;
}

function renderFavoriteList() {
  if (!dom.favoriteList) return;
  dom.favoriteList.replaceChildren();
  if (dom.favoriteCount) dom.favoriteCount.textContent = String(state.favorites.length);
  if (!state.favorites.length) {
    const empty = document.createElement("div");
    empty.className = "library-empty";
    empty.textContent = "还没有收藏。点「收藏当前」或「添加路径…」把文档路径存进来。";
    dom.favoriteList.append(empty);
    return;
  }
  for (const item of state.favorites) {
    const row = document.createElement("div");
    row.className = "favorite-row";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "favorite-open";
    open.title = item.path || "";
    const icon = document.createElement("span");
    icon.className = "note-icon";
    icon.textContent = "★";
    const text = document.createElement("span");
    text.className = "favorite-text";
    const name = document.createElement("span");
    name.className = "favorite-name";
    name.textContent = item.name || item.path;
    const path = document.createElement("span");
    path.className = "favorite-path";
    path.textContent = item.path || "";
    text.append(name, path);
    open.append(icon, text);
    open.addEventListener("click", () => openPath(item.path));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "favorite-remove";
    remove.title = "取消收藏";
    remove.setAttribute("aria-label", "取消收藏");
    remove.textContent = "×";
    remove.addEventListener("click", async (event) => {
      event.stopPropagation();
      await removeFavorite(item.path);
    });
    row.append(open, remove);
    dom.favoriteList.append(row);
  }
}

function renderNoteList() {
  if (!dom.noteList) return;
  dom.noteList.replaceChildren();
  const noteCount = state.notes.filter((entry) => entry.type === "note").length;
  if (dom.noteCount) dom.noteCount.textContent = String(noteCount);
  if (!state.notes.length) {
    const empty = document.createElement("div");
    empty.className = "library-empty";
    empty.textContent = "还没有笔记。点「新建笔记」开始写，笔记会保存成 Markdown 文件。";
    dom.noteList.append(empty);
    return;
  }

  const byParent = new Map();
  for (const entry of state.notes) {
    const key = entry.parentId || null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(entry);
  }
  const sortEntries = (items) =>
    items.slice().sort((left, right) => {
      if (left.type !== right.type) return left.type === "folder" ? -1 : 1;
      return String(left.name || "").localeCompare(String(right.name || ""), "zh-Hans-CN");
    });
  const rendered = new Set();

  const renderEntry = (entry, depth) => {
    if (!entry || rendered.has(entry.id)) return;
    rendered.add(entry.id);
    const children = byParent.get(entry.id) || [];
    const collapsed = state.noteFolderCollapsed.has(entry.id);
    const active = Boolean(
      entry.type === "note" &&
      entry.path &&
      state.docs.some((doc) => samePath(doc.path, entry.path))
    );

    const row = document.createElement("div");
    row.className = "note-row";
    row.dataset.id = entry.id;
    row.dataset.type = entry.type;
    row.dataset.depth = String(depth);
    row.style.paddingLeft = `${Math.min(depth, 6) * 12 + 2}px`;
    row.classList.toggle("active", active);

    if (entry.type === "folder" && children.length) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "outline-toggle note-folder-toggle";
      toggle.dataset.folderId = entry.id;
      toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
      toggle.title = collapsed ? "展开文件夹" : "收起文件夹";
      const chevron = document.createElement("span");
      chevron.className = "outline-chevron";
      chevron.setAttribute("aria-hidden", "true");
      toggle.append(chevron);
      toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleNoteFolder(entry.id);
      });
      row.append(toggle);
    } else {
      const spacer = document.createElement("span");
      spacer.className = "outline-toggle-space";
      spacer.setAttribute("aria-hidden", "true");
      row.append(spacer);
    }

    const open = document.createElement("button");
    open.type = "button";
    open.className = "note-open";
    open.title = entry.type === "folder" ? entry.name : entry.path || entry.name;
    const name = document.createElement("span");
    name.className = "note-name";
    name.textContent = entry.name || "未命名笔记";
    open.append(name);
    open.addEventListener("click", () => {
      if (entry.type === "folder") toggleNoteFolder(entry.id);
      else openNote(entry);
    });

    const more = document.createElement("button");
    more.type = "button";
    more.className = "note-more";
    more.title = "更多操作";
    more.setAttribute("aria-label", `更多操作：${entry.name || "未命名笔记"}`);
    more.textContent = "⋯";
    more.addEventListener("click", (event) => {
      event.stopPropagation();
      openNoteMenu(entry, more);
    });

    row.append(open, more);
    dom.noteList.append(row);

    if (entry.type === "folder" && !collapsed) {
      for (const child of sortEntries(children)) renderEntry(child, depth + 1);
    }
  };

  for (const entry of sortEntries(byParent.get(null) || [])) renderEntry(entry, 0);
  const knownIds = new Set(state.notes.map((entry) => entry.id));
  for (const entry of state.notes) {
    if (rendered.has(entry.id)) continue;
    // Only render true orphans (parent missing). Children of a collapsed folder
    // must stay hidden, not reappear at the root.
    if (entry.parentId && knownIds.has(entry.parentId)) continue;
    renderEntry(entry, 0);
  }
}

async function seedGuideNotes() {
  if (state.settings.guidesSeeded) return;
  if (!api.createNote || !api.getNotes || !Array.isArray(bundledGuides) || !bundledGuides.length) return;
  try {
    const existing = (await api.getNotes()) || [];
    const names = new Set(existing.map((entry) => String(entry?.name || "")));
    let created = 0;
    for (const guide of bundledGuides) {
      if (!guide?.name || names.has(guide.name)) continue;
      await api.createNote({ name: guide.name, content: String(guide.content || "") });
      names.add(guide.name);
      created += 1;
    }
    setSettings({ guidesSeeded: true }, { apply: false });
    if (created) {
      toast(`已把 ${created} 篇内置指南放进笔记夹`, { type: "success", duration: 3200 });
    }
  } catch (error) {
    console.warn("内置指南写入失败", error);
  }
}

async function refreshLibrary() {
  try {
    state.favorites = (await api.getFavorites?.()) || [];
    state.notes = (await api.getNotes?.()) || [];
  } catch (error) {
    console.warn("读取收藏夹 / 笔记夹失败", error);
  }
  renderFavoriteList();
  renderNoteList();
}

function toggleNoteFolder(id) {
  if (!id) return;
  if (state.noteFolderCollapsed.has(id)) state.noteFolderCollapsed.delete(id);
  else state.noteFolderCollapsed.add(id);
  renderNoteList();
}

async function removeFavorite(path) {
  if (!path) return;
  try {
    await api.removeFavorite?.(path);
    await refreshLibrary();
    toast("已取消收藏", { type: "success", duration: 1500 });
  } catch (error) {
    toast(`取消收藏失败：${cleanError(error)}`, { type: "error" });
  }
}

async function addCurrentFavorite() {
  const doc = activeDoc();
  if (!doc?.path) {
    toast("请先保存文档", { type: "error" });
    return;
  }
  try {
    await api.addFavorite?.({ path: doc.path, name: doc.name });
    await refreshLibrary();
    toast("已加入收藏夹", { type: "success" });
  } catch (error) {
    toast(`收藏失败：${cleanError(error)}`, { type: "error" });
  }
}

function fileNameFromPath(filePath) {
  const parts = String(filePath || "").split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || String(filePath || "");
}

async function addFavoritePaths() {
  try {
    let picked = [];
    if (typeof api.pickFavorites === "function") {
      picked = (await api.pickFavorites()) || [];
      if (!picked.length) return;
    } else {
      const typed = await showInputDialog({
        title: "添加文件路径",
        label: "文件路径",
        placeholder: "例如：D:\\notes\\想法.md",
        confirmLabel: "收藏"
      });
      if (!typed?.trim()) return;
      picked = [{ path: typed.trim(), name: fileNameFromPath(typed.trim()) }];
    }
    let added = 0;
    for (const item of picked) {
      const filePath = String(item?.path || "").trim();
      if (!filePath) continue;
      await api.addFavorite?.({
        path: filePath,
        name: String(item?.name || "").trim() || fileNameFromPath(filePath)
      });
      added += 1;
    }
    await refreshLibrary();
    if (added) toast(`已收藏 ${added} 个文件路径`, { type: "success", duration: 1800 });
  } catch (error) {
    toast(`收藏失败：${cleanError(error)}`, { type: "error" });
  }
}

async function openNote(entry) {
  if (!entry?.path) {
    toast("这条笔记没有可打开的文件", { type: "error" });
    return;
  }
  await openPath(entry.path);
  const doc = state.docs.find((item) => samePath(item.path, entry.path));
  if (doc) {
    doc.name = noteLabel(entry);
    renderTabs();
    updateWindowTitle();
    highlightNoteRow(entry.id);
  }
}

function highlightNoteRow(id) {
  for (const row of dom.noteList?.querySelectorAll(".note-row") || []) {
    row.classList.toggle("active", row.dataset.id === id);
  }
}

async function createNote(parentId = null) {
  const name = await showInputDialog({
    title: parentId ? "新建子笔记" : "新建笔记",
    label: "笔记名称",
    placeholder: "例如：今天的想法",
    confirmLabel: "创建"
  });
  if (!name?.trim()) return;
  try {
    const entry = await api.createNote?.({ name: name.trim(), parentId });
    if (!entry) {
      toast("创建笔记失败", { type: "error" });
      return;
    }
    await refreshLibrary();
    await openNote(entry);
    toast("已创建笔记", { type: "success", duration: 1800 });
  } catch (error) {
    toast(`创建笔记失败：${cleanError(error)}`, { type: "error" });
  }
}

async function createNoteFolder(parentId = null) {
  const name = await showInputDialog({
    title: parentId ? "新建子文件夹" : "新建笔记文件夹",
    label: "文件夹名称",
    confirmLabel: "创建"
  });
  if (!name?.trim()) return;
  try {
    const entry = await api.createNoteFolder?.({ name: name.trim(), parentId });
    if (!entry) {
      toast("创建文件夹失败", { type: "error" });
      return;
    }
    state.noteFolderCollapsed.delete(entry.parentId);
    await refreshLibrary();
    toast("已创建文件夹", { type: "success", duration: 1500 });
  } catch (error) {
    toast(`创建文件夹失败：${cleanError(error)}`, { type: "error" });
  }
}

async function renameNote(entry) {
  if (!entry) return;
  const nextName = await showInputDialog({
    title: entry.type === "folder" ? "重命名文件夹" : "重命名笔记",
    label: "名称",
    value: entry.name,
    confirmLabel: "保存"
  });
  if (!nextName?.trim() || nextName.trim() === entry.name) return;
  try {
    const updated = await api.renameNote?.({ id: entry.id, name: nextName.trim() });
    await refreshLibrary();
    const doc = state.docs.find((item) => samePath(item.path, entry.path));
    if (doc && entry.type === "note") {
      doc.name = noteLabel(updated || { ...entry, name: nextName.trim() });
      renderTabs();
      updateWindowTitle();
    }
    toast("已重命名", { type: "success", duration: 1500 });
  } catch (error) {
    toast(`重命名失败：${cleanError(error)}`, { type: "error" });
  }
}

async function deleteNote(entry) {
  if (!entry) return;
  const descendants = new Set([entry.id]);
  let added = true;
  while (added) {
    added = false;
    for (const item of state.notes) {
      if (item.parentId && descendants.has(item.parentId) && !descendants.has(item.id)) {
        descendants.add(item.id);
        added = true;
      }
    }
  }
  const notesToDelete = state.notes.filter((item) => descendants.has(item.id) && item.type === "note");
  const message = entry.type === "folder"
    ? `将删除文件夹「${entry.name}」及其中 ${notesToDelete.length} 条笔记，且无法恢复。`
    : `将删除笔记「${entry.name}」，且无法恢复。`;
  const choice = await showConfirm({
    title: "删除笔记",
    message,
    buttons: [
      { id: "cancel", label: "取消", variant: "ghost" },
      { id: "delete", label: "删除", variant: "danger" }
    ]
  });
  if (choice !== "delete") return;

  const paths = notesToDelete.map((item) => item.path).filter(Boolean);
  for (const doc of [...state.docs]) {
    if (!paths.some((filePath) => samePath(doc.path, filePath))) continue;
    await closeDocument(doc.id);
    if (state.docs.includes(doc)) return;
  }
  try {
    await api.deleteNote?.(entry.id);
    await refreshLibrary();
    toast("已删除", { type: "success", duration: 1500 });
  } catch (error) {
    toast(`删除失败：${cleanError(error)}`, { type: "error" });
  }
}

function openNoteMenu(entry, anchor) {
  if (!dom.noteMenu || !entry || !anchor) return;
  hideMoreMenu();
  hideInsertMenu();
  hideAppMenu();
  hideFormatMenu();
  closeColorPopover();
  dom.noteMenu.replaceChildren();
  const actions = entry.type === "folder"
    ? [
        { id: "new-note", label: "新建子笔记", icon: icons.plus },
        { id: "new-folder", label: "新建子文件夹", icon: icons.folder },
        { id: "rename", label: "重命名", icon: icons.pencil },
        { id: "delete", label: "删除文件夹", icon: icons.x }
      ]
    : [
        { id: "open", label: "打开", icon: icons.file },
        { id: "share", label: "分享", icon: icons.share },
        { id: "rename", label: "重命名", icon: icons.pencil },
        ...(api.platform === "android"
          ? []
          : [{ id: "reveal", label: "在文件夹中显示", icon: icons["folder-open"] }]),
        { id: "delete", label: "删除", icon: icons.x }
      ];
  for (const action of actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.noteAction = action.id;
    const icon = document.createElement("span");
    icon.innerHTML = action.icon;
    icon.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = action.label;
    button.append(icon, label);
    dom.noteMenu.append(button);
  }
  state.noteMenuEntry = entry;
  dom.noteMenu.hidden = false;
  const rect = anchor.getBoundingClientRect();
  const menuRect = dom.noteMenu.getBoundingClientRect();
  let left = rect.right - menuRect.width;
  left = Math.max(8, Math.min(left, window.innerWidth - menuRect.width - 8));
  let top = rect.bottom + 4;
  if (top + menuRect.height > window.innerHeight - 8) {
    top = Math.max(8, rect.top - menuRect.height - 4);
  }
  dom.noteMenu.style.left = `${left}px`;
  dom.noteMenu.style.top = `${top}px`;
}

function hideNoteMenu() {
  if (dom.noteMenu) dom.noteMenu.hidden = true;
  state.noteMenuEntry = null;
}

async function runNoteAction(action) {
  const entry = state.noteMenuEntry;
  hideNoteMenu();
  if (!entry) return;
  if (action === "open") await openNote(entry);
  else if (action === "share") await shareNote(entry);
  else if (action === "rename") await renameNote(entry);
  else if (action === "new-note") await createNote(entry.id);
  else if (action === "new-folder") await createNoteFolder(entry.id);
  else if (action === "delete") await deleteNote(entry);
  else if (action === "reveal") await api.revealNote?.(entry.id);
}

async function exportNotesZip() {
  if (!state.notes.some((entry) => entry.type === "note")) {
    toast("笔记夹里还没有笔记", { type: "info" });
    return;
  }
  try {
    const result = await api.exportNotesZip?.();
    if (!result || result.canceled) return;
    toast(`笔记夹已导出${result.count ? `（${result.count} 篇）` : ""}`, { type: "success" });
  } catch (error) {
    toast(`导出失败：${cleanError(error)}`, { type: "error" });
  }
}

async function shareNote(entry) {
  if (!entry?.path) {
    toast("这条笔记没有可分享的文件", { type: "error" });
    return;
  }
  try {
    const file = await api.readFile(entry.path);
    await shareContent(noteLabel(entry), file?.content || "", true);
  } catch (error) {
    toast(`分享失败：${cleanError(error)}`, { type: "error" });
  }
}

async function shareActiveDocument() {
  const doc = activeDoc();
  if (!doc) {
    toast("先打开一篇文档再分享", { type: "info" });
    return;
  }
  await shareContent(doc.name, doc.content, api.platform === "android");
}

async function shareContent(title, text, asFile) {
  try {
    if (asFile && typeof api.shareFile === "function") {
      const result = await api.shareFile({
        name: /\.md$/i.test(title) ? title : `${title}.md`,
        text: String(text || ""),
        mime: "text/markdown"
      });
      if (result?.canceled) return;
      toast(result?.notice || "已打开分享面板", { type: "success", duration: 2200 });
      return;
    }
    const result = await api.shareText?.({ title, text: String(text || "") });
    if (result?.copied) toast("内容已复制到剪贴板，可粘贴分享", { type: "success" });
    else if (result?.shared) toast("已打开系统分享", { type: "success" });
  } catch (error) {
    toast(`分享失败：${cleanError(error)}`, { type: "error", duration: 4200 });
  }
}



function updateOutline(force = false) {
  const doc = activeDoc();
  const headings = doc ? extractHeadings(doc.content) : [];
  state.headings = headings;
  dom.outlineCount.textContent = String(headings.length);
  if (dom.expandOutlineBtn) dom.expandOutlineBtn.disabled = !headings.length;
  if (dom.collapseOutlineBtn) dom.collapseOutlineBtn.disabled = !headings.length;

  const signature = headings.map((item) => `${item.level}:${item.id}:${item.line}`).join("|");
  if (!force && signature === state.outlineSignature) {
    updateOutlineActive();
    return;
  }
  state.outlineSignature = signature;
  dom.outlineList.replaceChildren();

  if (!headings.length) {
    const empty = document.createElement("div");
    empty.className = "empty-outline";
    empty.textContent = doc ? "这篇文档还没有标题。使用 # 添加标题，大纲会自动出现。" : "打开文档后显示标题大纲。";
    dom.outlineList.append(empty);
    return;
  }

  if (doc && !(doc.outlineCollapsed instanceof Set)) doc.outlineCollapsed = new Set();
  const collapsed = doc?.outlineCollapsed || new Set();
  const ancestors = [];
  const counters = [];
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const level = Math.min(Math.max(heading.level, 1), 6);
    counters.length = level;
    counters[level - 1] = (counters[level - 1] || 0) + 1;
    for (let cursor = level; cursor < counters.length; cursor += 1) {
      counters[cursor] = 0;
    }
    const number = counters
      .slice(0, level)
      .map((value) => value || 1)
      .join(".");

    while (ancestors.length && headings[ancestors[ancestors.length - 1]].level >= level) {
      ancestors.pop();
    }
    const hidden = ancestors.some((ancestorIndex) => collapsed.has(headings[ancestorIndex].id));
    const hasChildren = index + 1 < headings.length && headings[index + 1].level > level;
    const isCollapsed = collapsed.has(heading.id);
    ancestors.push(index);

    const item = document.createElement("div");
    item.className = "outline-item";
    item.setAttribute("role", "button");
    item.tabIndex = 0;
    item.dataset.id = heading.id;
    item.dataset.level = String(heading.level);
    item.dataset.line = String(heading.line);
    item.setAttribute("aria-level", String(level));
    item.title = `${number} ${heading.text}`;
    item.classList.toggle("is-hidden", hidden);

    if (hasChildren) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "outline-toggle";
      toggle.dataset.headingId = heading.id;
      toggle.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
      toggle.title = isCollapsed ? `展开「${heading.text}」的子标题` : `收起「${heading.text}」的子标题`;
      const chevron = document.createElement("span");
      chevron.className = "outline-chevron";
      chevron.setAttribute("aria-hidden", "true");
      toggle.append(chevron);
      item.append(toggle);
    } else {
      const spacer = document.createElement("span");
      spacer.className = "outline-toggle-space";
      spacer.setAttribute("aria-hidden", "true");
      item.append(spacer);
    }

    const badge = document.createElement("span");
    badge.className = "outline-num";
    badge.textContent = number;
    const label = document.createElement("span");
    label.className = "outline-text";
    label.textContent = heading.text;
    item.append(badge, label);
    dom.outlineList.append(item);
  }
  updateOutlineActive();
}

function toggleOutlineHeading(id) {
  if (!id) return;
  const doc = activeDoc();
  if (!doc) return;
  if (!(doc.outlineCollapsed instanceof Set)) doc.outlineCollapsed = new Set();
  if (doc.outlineCollapsed.has(id)) doc.outlineCollapsed.delete(id);
  else doc.outlineCollapsed.add(id);
  updateOutline(true);
  dom.outlineList
    .querySelector(`.outline-toggle[data-heading-id="${cssEscape(id)}"]`)
    ?.focus({ preventScroll: true });
}

/* Expand/collapse the whole outline at once: every level is still individually
   collapsible, this is the shortcut for "all of them". */
function setOutlineCollapsedAll(collapsed) {
  const doc = activeDoc();
  if (!doc) return;
  if (!(doc.outlineCollapsed instanceof Set)) doc.outlineCollapsed = new Set();
  doc.outlineCollapsed.clear();
  if (collapsed) {
    const headings = state.headings;
    for (let index = 0; index < headings.length; index += 1) {
      const level = Math.min(Math.max(headings[index].level, 1), 6);
      const hasChildren = index + 1 < headings.length && headings[index + 1].level > level;
      if (hasChildren) doc.outlineCollapsed.add(headings[index].id);
    }
  }
  updateOutline(true);
  toast(collapsed ? "大纲已全部收起" : "大纲已全部展开", { duration: 1200 });
}

function scheduleOutlineActive() {
  if (state.outlineFrame) return;
  state.outlineFrame = requestAnimationFrame(() => {
    state.outlineFrame = null;
    updateOutlineActive();
  });
}

function updateOutlineActive() {
  if (!state.headings.length) return;
  let activeHeading = state.headings[0];

  if (state.viewMode === "edit") {
    const line = view.state.doc.lineAt(view.state.selection.main.head).number - 1;
    for (const heading of state.headings) {
      if (heading.line <= line) activeHeading = heading;
      else break;
    }
  } else {
    const paneTop = dom.previewPane.getBoundingClientRect().top;
    const threshold = dom.previewPane.scrollTop + 92;
    for (const heading of state.headings) {
      const element = dom.preview.querySelector(`#${cssEscape(heading.id)}`);
      if (!element) continue;
      const top =
        dom.previewPane.scrollTop + element.getBoundingClientRect().top - paneTop;
      if (top <= threshold) activeHeading = heading;
      else break;
    }
  }

  const items = dom.outlineList.querySelectorAll(".outline-item");
  let activeItem = null;
  for (const item of items) {
    const on = item.dataset.id === activeHeading.id;
    item.classList.toggle("active", on);
    if (on) activeItem = item;
  }
  if (activeItem && document.activeElement !== activeItem) {
    activeItem.scrollIntoView({ block: "nearest" });
  }
}

function jumpToHeading(heading) {
  if (!heading) return;
  if (state.viewMode !== "edit") {
    const element = dom.preview.querySelector(`#${cssEscape(heading.id)}`);
    if (element) {
      const paneRect = dom.previewPane.getBoundingClientRect();
      const targetRect = element.getBoundingClientRect();
      dom.previewPane.scrollTo({
        top: dom.previewPane.scrollTop + targetRect.top - paneRect.top - 24,
        behavior: "smooth"
      });
    }
  }

  if (state.viewMode !== "read") {
    const doc = view.state.doc;
    const line = doc.line(Math.min(heading.line + 1, doc.lines));
    view.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: "center" })
    });
    view.focus();
  }
}

/* -------------------------------------------------------------------------- */
/* Counts and cursor                                                           */
/* -------------------------------------------------------------------------- */

function scheduleCounts() {
  clearTimeout(state.countTimer);
  state.countTimer = window.setTimeout(updateCounts, 160);
}

function updateCounts() {
  const doc = activeDoc();
  if (!doc) {
    dom.wordCount.textContent = "0 字";
    dom.charCount.textContent = "0 字符";
    dom.readTime.textContent = "约 1 分钟";
    return;
  }
  const counts = countText(doc.content);
  dom.wordCount.textContent = `${counts.words.toLocaleString("zh-CN")} 字`;
  dom.charCount.textContent = `${counts.chars.toLocaleString("zh-CN")} 字符`;
  dom.readTime.textContent = `约 ${counts.readingMinutes} 分钟`;
}

function updateCursorInfo() {
  const doc = activeDoc();
  if (!doc) {
    dom.cursorInfo.textContent = "第 1 行，第 1 列";
    return;
  }
  if (state.isVisualEditing) {
    dom.cursorInfo.textContent = "可视化编辑";
    return;
  }
  const head = view.state.selection.main.head;
  const line = view.state.doc.lineAt(head);
  dom.cursorInfo.textContent = `第 ${line.number} 行，第 ${head - line.from + 1} 列`;
}

function updateHeadingSelect() {
  if (state.isVisualEditing) {
    updateVisualHeadingSelect();
    return;
  }
  if (!view) return;
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  const match = line.text.match(/^(#{1,6})\s/);
  dom.headingSelect.value = match ? String(Math.min(match[1].length, 4)) : "0";
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */

function getSelection() {
  const range = view.state.selection.main;
  return {
    from: range.from,
    to: range.to,
    text: view.state.sliceDoc(range.from, range.to)
  };
}

function focusEditor() {
  view.focus();
}

function wrapSelection(before, after, placeholderText, options = {}) {
  const { from, to, text } = getSelection();
  const content = text || placeholderText;
  const insert = `${before}${content}${after}`;
  const selectionStart = from + before.length;
  const selectionEnd = selectionStart + content.length;
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: selectionStart, head: selectionEnd }
  });
  if (!text && !options.keepPlaceholderSelection) {
    view.dispatch({ selection: { anchor: selectionStart, head: selectionEnd } });
  }
  focusEditor();
}

function toggleWrap(marker, placeholderText) {
  const { from, to, text } = getSelection();
  const stateDoc = view.state.doc;
  if (text.length >= marker.length * 2 && text.startsWith(marker) && text.endsWith(marker)) {
    view.dispatch({
      changes: [
        { from, to: from + marker.length, insert: "" },
        { from: to - marker.length, to, insert: "" }
      ],
      selection: { anchor: from, head: to - marker.length * 2 }
    });
    focusEditor();
    return;
  }
  const aroundStart = stateDoc.sliceString(Math.max(0, from - marker.length), from);
  const aroundEnd = stateDoc.sliceString(to, Math.min(stateDoc.length, to + marker.length));
  if (aroundStart === marker && aroundEnd === marker) {
    view.dispatch({
      changes: [
        { from: from - marker.length, to: from, insert: "" },
        { from: to, to: to + marker.length, insert: "" }
      ],
      selection: { anchor: from - marker.length, head: to - marker.length }
    });
    focusEditor();
    return;
  }
  wrapSelection(marker, marker, placeholderText);
}

function toggleInlineCode() {
  const { text } = getSelection();
  if (text.includes("\n")) {
    wrapSelection("\n```\n", "\n```\n", "code", { keepPlaceholderSelection: false });
    return;
  }
  toggleWrap("`", "code");
}

function showInputDialog({
  title = "插入",
  label = "内容",
  hint = "",
  value = "",
  placeholder = "",
  confirmLabel = "插入"
} = {}) {
  if (state.inputResolve) {
    const previous = state.inputResolve;
    state.inputResolve = null;
    previous(null);
  }
  dom.inputTitle.textContent = title;
  dom.inputLabel.textContent = label;
  dom.inputHint.textContent = hint;
  dom.inputField.value = value;
  dom.inputField.placeholder = placeholder;
  dom.inputConfirm.textContent = confirmLabel;
  if (dom.inputDialog.open) dom.inputDialog.close();
  return new Promise((resolve) => {
    state.inputResolve = resolve;
    dom.inputDialog.showModal();
    requestAnimationFrame(() => {
      dom.inputField.focus();
      dom.inputField.select();
    });
  });
}

function captureVisualSelection() {
  const selection = window.getSelection();
  if (selection && selection.rangeCount) {
    const range = selection.getRangeAt(0);
    if (dom.preview.contains(range.commonAncestorContainer)) {
      return { range: range.cloneRange(), text: selection.toString() };
    }
  }
  return { range: null, text: "" };
}

function restoreVisualSelection(capture) {
  dom.preview.focus();
  const selection = window.getSelection();
  if (capture?.range && dom.preview.contains(capture.range.commonAncestorContainer)) {
    selection.removeAllRanges();
    selection.addRange(capture.range);
    return true;
  }
  const range = document.createRange();
  range.selectNodeContents(dom.preview);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  return false;
}

function insertVisualNode(node, capture = null) {
  restoreVisualSelection(capture);
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  if (!range.collapsed) range.deleteContents();
  range.insertNode(node);
  const after = document.createRange();
  after.setStartAfter(node);
  after.collapse(true);
  selection.removeAllRanges();
  selection.addRange(after);
  state.visualDirty = true;
  updateSaveState();
  scheduleVisualSync();
}

function insertVisualHtml(html, capture = null) {
  restoreVisualSelection(capture);
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  if (!range.collapsed) range.deleteContents();
  const fragment = range.createContextualFragment(html);
  const last = fragment.lastChild;
  range.insertNode(fragment);
  if (last) {
    const after = document.createRange();
    after.setStartAfter(last);
    after.collapse(true);
    selection.removeAllRanges();
    selection.addRange(after);
  }
  state.visualDirty = true;
  updateSaveState();
  scheduleVisualSync();
}

function insertVisualBlock(node, capture = null) {
  const container = capture?.range?.commonAncestorContainer;
  const element =
    container?.nodeType === Node.ELEMENT_NODE ? container : container?.parentElement;
  const cell = element?.closest("td, th");
  const list = element?.closest("ul, ol");
  const block = element?.closest(
    "p, h1, h2, h3, h4, h5, h6, blockquote, pre, .math-block"
  );
  if (cell) {
    const anchor = cell.closest(".table-shell") || cell.closest("table");
    anchor.after(node);
  } else if (list) {
    list.after(node);
  } else if (block) {
    block.after(node);
  } else {
    dom.preview.append(node);
  }
  const selection = window.getSelection();
  const after = document.createRange();
  after.setStartAfter(node);
  after.collapse(true);
  selection.removeAllRanges();
  selection.addRange(after);
  dom.preview.focus();
  state.visualDirty = true;
  updateSaveState();
  scheduleVisualSync();
}

function insertVisualBlockHtml(html, capture = null) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  const node = template.content.firstElementChild;
  if (node) insertVisualBlock(node, capture);
}

function relativePathForDocument(targetPath) {
  const doc = activeDoc();
  const normalizedTarget = String(targetPath || "").replace(/\\/g, "/");
  if (!doc?.path) return normalizedTarget;
  const base = doc.path.replace(/[\\/][^\\/]*$/, "").replace(/\\/g, "/");
  const from = base.split("/").filter(Boolean);
  const to = normalizedTarget.split("/").filter(Boolean);
  if (from[0]?.toLowerCase() !== to[0]?.toLowerCase()) return normalizedTarget;
  let index = 0;
  while (
    index < from.length &&
    index < to.length &&
    from[index].toLowerCase() === to[index].toLowerCase()
  ) {
    index += 1;
  }
  return [...Array(from.length - index).fill(".."), ...to.slice(index)].join("/");
}

function encodeMarkdownAssetPath(pathValue) {
  return String(pathValue || "")
    .replace(/ /g, "%20")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

async function insertImage() {
  const doc = activeDoc();
  if (!doc) return;
  const visual = state.isVisualEditing;
  const capture = visual ? captureVisualSelection() : null;
  const result = await api.openImageDialog();
  if (result.canceled || !result.path) return;
  const source = result.dataUrl
    ? result.dataUrl
    : encodeMarkdownAssetPath(relativePathForDocument(result.path));
  const alt = (result.name || "图片").replace(/\.[^.]+$/, "");
  if (visual) {
    const image = document.createElement("img");
    image.src = resolveLocalPath(source, doc.path);
    image.alt = alt;
    image.dataset.mdSrc = source;
    insertVisualNode(image, capture);
  } else {
    const { from, to } = getSelection();
    const insert = `![${alt}](${source})`;
    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from + insert.length }
    });
    focusEditor();
  }
}

async function insertCodeBlock() {
  const doc = activeDoc();
  if (!doc) return;
  const visual = state.isVisualEditing;
  const capture = visual ? captureVisualSelection() : null;
  const selected = visual
    ? capture.text
    : view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);
  const language = await showInputDialog({
    title: "插入代码块",
    label: "代码语言",
    value: "javascript",
    placeholder: "javascript / python / css …",
    hint: "留空会插入纯文本代码块。",
    confirmLabel: "插入"
  });
  if (language === null) return;
  const lang = language.trim().replace(/[^\w+#.-]/g, "");
  const body = selected || "// code";
  if (visual) {
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    if (lang) code.className = `language-${lang}`;
    code.textContent = body;
    pre.append(code);
    insertVisualBlock(pre, capture);
  } else {
    const range = view.state.selection.main;
    const fenced = `\`\`\`${lang}\n${body}\n\`\`\`\n`;
    if (!range.empty && !tableRangeAtLine(view.state.doc.lineAt(range.from).number)) {
      view.dispatch({
        changes: { from: range.from, to: range.to, insert: fenced },
        selection: { anchor: range.from + fenced.length }
      });
      focusEditor();
    } else {
      insertBlock(fenced.trimEnd());
    }
  }
}

async function insertMath(display = false) {
  openLatexForInsert(display);
}

async function insertMermaid() {
  const doc = activeDoc();
  if (!doc) return;
  openMermaidEditor({ source: MERMAID_TEMPLATES[0].source });
}

async function insertLink() {
  const doc = activeDoc();
  if (!doc) return;
  const visual = state.isVisualEditing;
  const capture = visual ? captureVisualSelection() : null;
  const selected = visual
    ? capture.text
    : view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);
  let url = await showInputDialog({
    title: "插入链接",
    label: "链接地址",
    value: /^https?:\/\//i.test(selected) ? selected : "https://",
    placeholder: "https://example.com",
    hint: "支持 http(s)、mailto、锚点 #、站内相对路径。",
    confirmLabel: "插入"
  });
  if (url === null || !url.trim()) return;
  url = url.trim();
  if (!/^(?:[a-z][a-z0-9+.-]*:|#|\/|\.)/i.test(url)) url = `https://${url}`;
  const text = selected || "链接文字";
  if (visual) {
    restoreVisualSelection(capture);
    wrapVisualSelection("a", {}, text, { href: url });
    toast("链接已插入", { duration: 1600 });
  } else {
    const range = view.state.selection.main;
    const insert = `[${text}](${url})`;
    view.dispatch({
      changes: { from: range.from, to: range.to, insert },
      selection: { anchor: range.from + insert.length }
    });
    focusEditor();
  }
}

async function runInsertAction(action) {
  hideInsertMenu();
  if (action === "image") await insertImage();
  if (action === "code") await insertCodeBlock();
  if (action === "math-inline") await insertMath(false);
  if (action === "math-block") await insertMath(true);
  if (action === "mermaid") await insertMermaid();
  if (action === "link") await insertLink();
  if (action === "table") applyFormat("table");
  if (action === "hr") applyFormat("hr");
}

function lineRange() {
  const range = view.state.selection.main;
  const startLine = view.state.doc.lineAt(range.from).number;
  const endLine = view.state.doc.lineAt(range.to).number;
  return { startLine, endLine };
}

function applyHeading(level) {
  if (state.isVisualEditing) {
    dom.preview.focus();
    state.visualDirty = true;
    updateSaveState();
    try {
      document.execCommand("formatBlock", false, level ? `h${level}` : "p");
    } catch {
      toast("当前光标所在位置无法应用标题", { type: "error" });
    }
    scheduleVisualSync();
    updateVisualHeadingSelect();
    return;
  }
  const { startLine, endLine } = lineRange();
  const doc = view.state.doc;
  const changes = [];
  for (let number = startLine; number <= endLine; number += 1) {
    const line = doc.line(number);
    const text = line.text;
    if (!text.trim()) continue;
    let next;
    if (level === 0) next = text.replace(/^#{1,6}\s+/, "");
    else next = `${"#".repeat(level)} ${text.replace(/^#{1,6}\s+/, "")}`;
    if (next !== text) changes.push({ from: line.from, to: line.to, insert: next });
  }
  if (changes.length) {
    view.dispatch({ changes });
    focusEditor();
  }
}

function applyLinePrefix(kind) {
  const { startLine, endLine } = lineRange();
  const doc = view.state.doc;
  const lines = [];
  for (let number = startLine; number <= endLine; number += 1) {
    const line = doc.line(number);
    if (line.text.trim()) lines.push(line);
  }
  if (!lines.length) {
    wrapSelection("", "", "列表项");
    return;
  }

  if (kind === "task") {
    const taskPattern = /^(\s*)[-*+]\s+\[[ xX]\]\s/;
    const allTasks = lines.every((line) => taskPattern.test(line.text));
    const changes = [];
    for (const line of lines) {
      if (allTasks) {
        const text = line.text.replace(/\[([ xX])\]/, (_, mark) =>
          mark === " " ? "[x]" : "[ ]"
        );
        changes.push({ from: line.from, to: line.to, insert: text });
      } else {
        changes.push({
          from: line.from,
          to: line.from,
          insert: `${line.text.match(/^\s*/)[0]}- [ ] `
        });
      }
    }
    view.dispatch({ changes });
    focusEditor();
    return;
  }

  const prefixes = {
    quote: "> ",
    ul: "- ",
    ol: "1. "
  };
  const prefix = prefixes[kind];
  const existing =
    kind === "ol" ? /^\s*\d+\.\s+/ : new RegExp(`^\\s*${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  const allHave = lines.every((line) => existing.test(line.text));
  const changes = [];
  lines.forEach((line, index) => {
    if (allHave) {
      const next = line.text.replace(existing, "");
      changes.push({ from: line.from, to: line.to, insert: next });
    } else {
      const marker = kind === "ol" ? `${index + 1}. ` : prefix;
      changes.push({ from: line.from, to: line.from, insert: marker });
    }
  });
  view.dispatch({ changes });
  focusEditor();
}

function tableRangeAtLine(lineNumber) {
  const lines = view.state.doc.toString().split("\n");
  let index = Math.max(0, Math.min(lineNumber - 1, lines.length - 1));
  let start = index;
  let end = index;
  while (start > 0 && lines[start - 1].trim() !== "" && lines[start - 1].includes("|")) {
    start -= 1;
  }
  while (end + 1 < lines.length && lines[end + 1].trim() !== "" && lines[end + 1].includes("|")) {
    end += 1;
  }
  if (end > start && isTableDelimiter(lines[start + 1] || "")) return { start, end };
  return null;
}

function insertBlock(text) {
  const { from } = getSelection();
  const line = view.state.doc.lineAt(from);
  const table = tableRangeAtLine(line.number);
  if (table) {
    const endLine = view.state.doc.line(table.end + 1);
    const insert = `\n\n${text}\n`;
    view.dispatch({
      changes: { from: endLine.to, to: endLine.to, insert },
      selection: { anchor: endLine.to + insert.length }
    });
    focusEditor();
    return;
  }
  const { to } = getSelection();
  const hasTextBefore = line.text.trim().length > 0;
  const prefix = hasTextBefore ? "\n\n" : "";
  const insert = `${prefix}${text}\n`;
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length }
  });
  focusEditor();
}

function applyFormat(kind) {
  if (!activeDoc()) return;
  if (kind === "link") {
    insertLink();
    return;
  }
  if (state.isVisualEditing) {
    applyVisualFormat(kind);
    return;
  }
  switch (kind) {
    case "bold":
      toggleWrap("**", "粗体文字");
      break;
    case "italic":
      toggleWrap("*", "斜体文字");
      break;
    case "strike":
      toggleWrap("~~", "删除文字");
      break;
    case "inlineCode":
      toggleInlineCode();
      break;
    case "link":
      insertLink();
      break;
    case "quote":
      applyLinePrefix("quote");
      break;
    case "ul":
      applyLinePrefix("ul");
      break;
    case "ol":
      applyLinePrefix("ol");
      break;
    case "task":
      applyLinePrefix("task");
      break;
    case "table":
      insertBlock("| 列 1 | 列 2 | 列 3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |");
      break;
    case "hr":
      insertBlock("---");
      break;
    default:
      break;
  }
}

/* -------------------------------------------------------------------------- */
/* Color picker                                                                */
/* -------------------------------------------------------------------------- */

function buildColorPresets() {
  dom.colorPresets.replaceChildren();
  for (const color of COLOR_PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.color = color;
    button.style.backgroundColor = color;
    button.title = color;
    button.addEventListener("click", () => setPickerColor(color));
    dom.colorPresets.append(button);
  }
  setPickerColor(state.color);
}

function setPickerColor(value) {
  const parsed = colorValue(value);
  if (!parsed) return;
  state.color = parsed;
  dom.colorPreview.style.backgroundColor = parsed;
  dom.colorDot.style.backgroundColor = parsed;
  dom.colorInput.value = toHex6(parsed);
  dom.colorHex.value = parsed.toUpperCase();
  for (const button of dom.colorPresets.querySelectorAll("button")) {
    button.classList.toggle(
      "active",
      String(button.dataset.color).toLowerCase() === String(parsed).toLowerCase()
    );
  }
}

function toHex6(color) {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    return `#${color
      .slice(1)
      .split("")
      .map((char) => char + char)
      .join("")}`;
  }
  try {
    const temp = document.createElement("span");
    temp.style.color = color;
    document.body.append(temp);
    const computed = getComputedStyle(temp).color;
    temp.remove();
    const match = computed.match(/\d+/g);
    if (!match) return "#000000";
    return `#${match
      .slice(0, 3)
      .map((part) => Number(part).toString(16).padStart(2, "0"))
      .join("")}`;
  } catch {
    return "#000000";
  }
}

function openColorPopover() {
  hideMoreMenu();
  const rect = dom.colorTrigger.getBoundingClientRect();
  dom.colorPopover.hidden = false;
  const popoverRect = dom.colorPopover.getBoundingClientRect();
  let left = rect.left - 12;
  let top = rect.bottom + 8;
  left = Math.max(12, Math.min(left, window.innerWidth - popoverRect.width - 12));
  if (top + popoverRect.height > window.innerHeight - 12) {
    top = rect.top - popoverRect.height - 8;
  }
  dom.colorPopover.style.left = `${left}px`;
  dom.colorPopover.style.top = `${Math.max(12, top)}px`;
  dom.colorHex.focus();
  dom.colorHex.select();
}

function applyPickedColor() {
  const doc = activeDoc();
  if (!doc) return;
  if (state.isVisualEditing) {
    const background = state.colorTarget === "background";
    wrapVisualSelection(
      background ? "mark" : "span",
      { [background ? "background-color" : "color"]: state.color },
      "彩色文字"
    );
    closeColorPopover();
    dom.preview.focus();
    toast(`已应用 ${state.color.toUpperCase()}`, { type: "success", duration: 1600 });
    return;
  }
  const { from, to, text } = getSelection();
  const content = text || "彩色文字";
  const open =
    state.colorTarget === "background"
      ? `<mark style="background-color:${state.color}">`
      : `<span style="color:${state.color}">`;
  const close = state.colorTarget === "background" ? "</mark>" : "</span>";
  const insert = `${open}${content}${close}`;
  const selectionStart = from + open.length;
  const selectionEnd = selectionStart + content.length;
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: selectionStart, head: selectionEnd }
  });
  closeColorPopover();
  focusEditor();
  toast(`已应用 ${state.color.toUpperCase()}`, { type: "success", duration: 1600 });
}

async function pickScreenColor() {
  if (!("EyeDropper" in window)) {
    toast("当前系统不支持屏幕取色，请使用调色板或输入颜色值", { type: "error" });
    return;
  }
  try {
    const result = await new window.EyeDropper().open();
    setPickerColor(result.sRGBHex);
  } catch {
    // User pressed Escape.
  }
}

function closeColorPopover() {
  dom.colorPopover.hidden = true;
}

/* -------------------------------------------------------------------------- */
/* Settings / theme                                                            */
/* -------------------------------------------------------------------------- */

function resolvedTheme() {
  return state.settings.theme === "system"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
    : state.settings.theme;
}

function applyTheme() {
  const theme = resolvedTheme();
  document.documentElement.dataset.theme = theme;
  dom.themeToggle.innerHTML = icons[theme === "dark" ? "sun" : "moon"];
  dom.themeToggle.title = theme === "dark" ? "切换到浅色" : "切换到深色";
  applyEditorTheme();
  state.palette = buildPalette(
    state.settings.primaryColor || DEFAULT_PRIMARY,
    state.settings.secondaryColor || DEFAULT_SECONDARY,
    theme
  );
  applyPalette(state.palette);
  const auto = Boolean(state.settings.componentColorsAuto);
  const effective = auto
    ? generateComponentColors(state.palette.primary, state.palette.secondary, theme)
    : state.settings.componentColors || {};
  state.componentColorsEffective = effective;
  applyComponentColors(effective, document.documentElement, theme);
  renderBrandIcon();
  renderStudioColorState();
  for (const button of dom.themeOptions.querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.theme === state.settings.theme);
  }
  refreshMermaidForTheme();
  if (dom.studioDialog?.open) renderThemePackLibrary();
  api.syncSystemBars?.();
}

function applySettings() {
  const size = Number(state.settings.fontSize) || 15;
  document.documentElement.style.setProperty("--editor-size", `${size}px`);
  document.documentElement.style.setProperty("--preview-size", `${size + 2}px`);
  dom.fontSizeRange.value = String(size);
  dom.fontSizeValue.textContent = `${size} px`;
  dom.lineWrapToggle.checked = Boolean(state.settings.lineWrap);
  dom.syncToggleInput.checked = Boolean(state.settings.syncScroll);
  dom.autoSaveToggle.checked = Boolean(state.settings.autoSave);
  dom.syncToggle.classList.toggle("on", Boolean(state.settings.syncScroll));
  dom.syncText.textContent = state.settings.syncScroll ? "同步" : "不同步";
  applyTheme();
  applyCustomCss();
  renderHome();
}

function setSettings(patch, options = {}) {
  state.settings = { ...state.settings, ...patch };
  state.pendingSettings = { ...state.pendingSettings, ...patch };
  if (options.apply !== false) applySettings();

  if ("brandIcon" in patch) {
    renderBrandIcon();
    scheduleWindowIconUpdate();
  }
  if ("primaryColor" in patch || "secondaryColor" in patch) {
    scheduleWindowIconUpdate();
  }
  if ("componentColors" in patch || "componentColorsAuto" in patch) {
    applyTheme();
  }
  if ("uiHidden" in patch) {
    applyUiVisibility(state.settings.uiHidden || []);
  }
  if ("stickers" in patch) {
    renderStickers();
  }
  if ("customButtons" in patch) {
    renderCustomDock();
  }

  clearTimeout(state.settingsTimer);
  state.settingsTimer = window.setTimeout(async () => {
    const queued = state.pendingSettings;
    state.pendingSettings = {};
    try {
      await api.setSettings(queued);
    } catch (error) {
      console.error("Failed to persist settings", error);
    }
  }, 120);
}

function setTheme(theme) {
  state.settings.theme = theme;
  applyTheme();
  api.setSettings({ theme }).catch(() => {});
}

function toggleTheme() {
  const next = resolvedTheme() === "dark" ? "light" : "dark";
  setTheme(next);
}

function renderBrandIcon() {
  const icon = state.settings.brandIcon || { type: "preset", value: "default" };
  const palette = state.palette || buildPalette(DEFAULT_PRIMARY, DEFAULT_SECONDARY, resolvedTheme());
  const isImage = icon.type === "image" && /^data:image\//i.test(icon.value || "");

  dom.brandIcon.replaceChildren();
  if (isImage) {
    const image = document.createElement("img");
    image.src = icon.value;
    image.alt = "";
    dom.brandIcon.append(image);
  } else {
    dom.brandIcon.innerHTML = brandSvg(icon.value || "default", palette);
  }

  if (dom.brandPreview) {
    dom.brandPreview.replaceChildren();
    if (isImage) {
      const image = document.createElement("img");
      image.src = icon.value;
      image.alt = "";
      dom.brandPreview.append(image);
    } else {
      dom.brandPreview.innerHTML = brandSvg(icon.value || "default", palette);
    }
  }
  if (dom.brandPresetGrid) {
    for (const button of dom.brandPresetGrid.querySelectorAll("button")) {
      const label = BRAND_PRESETS.find((item) => item.id === button.dataset.brand)?.label || "";
      button.innerHTML = `${brandSvg(button.dataset.brand, palette)}<span>${label}</span>`;
      button.classList.toggle(
        "active",
        icon.type === "preset" && button.dataset.brand === icon.value
      );
    }
  }
}

function rasterizeSvg(svg, size = 256) {
  return new Promise((resolve) => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, size, size);
      context.drawImage(image, 0, 0, size, size);
      URL.revokeObjectURL(url);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve("");
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("");
    };
    image.src = url;
  });
}

function scheduleWindowIconUpdate() {
  clearTimeout(state.windowIconTimer);
  state.windowIconTimer = window.setTimeout(async () => {
    try {
      const icon = state.settings.brandIcon || { type: "preset", value: "default" };
      if (icon.type === "image" && /^data:image\//i.test(icon.value || "")) {
        await api.setWindowIcon(icon.value);
      } else {
        const palette = state.palette || buildPalette(DEFAULT_PRIMARY, DEFAULT_SECONDARY, resolvedTheme());
        const png = await rasterizeSvg(brandSvg(icon.value || "default", palette), 256);
        await api.setWindowIcon(png || null);
      }
    } catch (error) {
      console.error("Failed to update window icon", error);
    }
  }, 180);
}

function renderStudioColorState() {
  if (!dom.generatedPalette || !state.palette) return;
  const palette = state.palette;
  const swatches = [
    ["主强调", palette.accent],
    ["强调深", palette.accentStrong],
    ["强调浅", palette.accentSoft],
    ["强调底", palette.accentWash],
    ["副强调", palette.secondary],
    ["选中态", palette.selection]
  ];
  dom.generatedPalette.replaceChildren();
  for (const [label, color] of swatches) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "palette-chip";
    chip.style.backgroundColor = color;
    chip.style.color = contrastInk(color);
    chip.textContent = label;
    chip.title = color.toUpperCase();
    chip.addEventListener("click", () => {
      navigator.clipboard?.writeText(color.toUpperCase()).catch(() => {});
      toast(`已复制 ${color.toUpperCase()}`, { type: "success", duration: 1400 });
    });
    dom.generatedPalette.append(chip);
  }

  for (const [input, value] of [
    [dom.primaryColor, palette.primary],
    [dom.secondaryColor, palette.secondary]
  ]) {
    if (input && document.activeElement !== input) input.value = value;
  }
  for (const [input, value] of [
    [dom.primaryHex, palette.primary],
    [dom.secondaryHex, palette.secondary]
  ]) {
    if (input && document.activeElement !== input) input.value = value.toUpperCase();
  }
  refreshComponentColorsUI();
}

const COMPONENT_FALLBACK_VARS = {
  editorBg: "--surface",
  statusBg: "--titlebar",
  tableHead: "--code-head",
  quoteBg: "--accent-wash",
  codeInk: "--ink",
  lineSoft: "--line"
};

function currentComponentColor(item) {
  const rootStyle = getComputedStyle(document.documentElement);
  let value = rootStyle.getPropertyValue(item.varName).trim();
  if (!value && COMPONENT_FALLBACK_VARS[item.id]) {
    value = rootStyle.getPropertyValue(COMPONENT_FALLBACK_VARS[item.id]).trim();
  }
  if (!value) return "#808080";
  return toHex6(value);
}

function buildComponentColorsUI() {
  if (!dom.componentColors) return;
  dom.componentColors.replaceChildren();
  state.componentColorRefs.clear();
  const groups = new Map();
  for (const item of COMPONENT_COLORS) {
    if (!groups.has(item.group)) groups.set(item.group, []);
    groups.get(item.group).push(item);
  }
  for (const [group, items] of groups) {
    const section = document.createElement("div");
    section.className = "component-color-group";
    const heading = document.createElement("h4");
    heading.textContent = group;
    const grid = document.createElement("div");
    grid.className = "component-color-grid";
    for (const item of items) {
      const card = document.createElement("div");
      card.className = "component-color-card";
      card.dataset.component = item.id;
      const label = document.createElement("span");
      label.className = "component-color-label";
      label.textContent = item.label;
      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.title = item.label;
      const hexInput = document.createElement("input");
      hexInput.type = "text";
      hexInput.spellcheck = false;
      hexInput.className = "component-color-hex";
      const reset = document.createElement("button");
      reset.type = "button";
      reset.className = "component-color-reset";
      reset.title = "恢复为跟随主题";
      reset.textContent = "↺";
      reset.addEventListener("click", () => resetComponentColor(item.id));
      colorInput.addEventListener("input", () => setComponentColor(item.id, colorInput.value));
      hexInput.addEventListener("change", () => {
        const value = normalizeHex(hexInput.value, "");
        if (value) setComponentColor(item.id, value);
        else refreshComponentColorsUI();
      });
      const controls = document.createElement("div");
      controls.className = "component-color-controls";
      controls.append(colorInput, hexInput, reset);
      card.append(label, controls);
      grid.append(card);
      state.componentColorRefs.set(item.id, { card, colorInput, hexInput, reset, item });
    }
    section.append(heading, grid);
    dom.componentColors.append(section);
  }
  refreshComponentColorsUI();
}

function refreshComponentColorsUI() {
  const auto = Boolean(state.settings.componentColorsAuto);
  const overrides = state.settings.componentColors || {};
  const effective = state.componentColorsEffective || overrides;
  for (const [id, refs] of state.componentColorRefs) {
    const custom = !auto && typeof overrides[id] === "string";
    const value = normalizeHex(effective[id], "") || currentComponentColor(refs.item);
    if (document.activeElement !== refs.colorInput) refs.colorInput.value = value;
    if (document.activeElement !== refs.hexInput) refs.hexInput.value = value.toUpperCase();
    refs.card.classList.toggle("customized", custom);
    refs.card.classList.toggle("generated", auto);
    refs.reset.disabled = !custom;
    refs.reset.title = custom ? "恢复为跟随主题" : auto ? "由主题色生成" : "正在跟随主题";
  }
  if (dom.componentColorState) {
    dom.componentColorState.textContent = auto
      ? "当前 20 个组件颜色由主/副强调色生成；切换浅色/深色会自动重算。单独修改某个组件后转为自定义。"
      : "不设置时跟随主题与主/副强调色自动生成；单独设置后该组件将使用自定义颜色。";
  }
}

function setComponentColor(id, value) {
  const normalized = normalizeHex(value, "");
  if (!normalized) return;
  // Materialize generated colors first so tweaking one component keeps the rest.
  const base = state.settings.componentColorsAuto
    ? { ...(state.componentColorsEffective || {}) }
    : { ...(state.settings.componentColors || {}) };
  base[id] = normalized;
  setSettings({ componentColors: base, componentColorsAuto: false }, { apply: false });
}

function resetComponentColor(id) {
  const colors = { ...(state.settings.componentColors || {}) };
  delete colors[id];
  setSettings({ componentColors: colors, componentColorsAuto: false }, { apply: false });
  renderStudioStatus("已恢复为跟随主题");
}

function generateComponentColorsFromTheme() {
  setSettings({ componentColors: {}, componentColorsAuto: true }, { apply: false });
  renderStudioStatus("已按当前主题色生成 20 个组件颜色");
}

function resetAllComponentColors() {
  setSettings({ componentColors: {}, componentColorsAuto: false }, { apply: false });
  renderStudioStatus("所有组件颜色已恢复为跟随主题");
}

function buildStudio() {
  dom.palettePresets.replaceChildren();
  for (const preset of PALETTE_PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "palette-preset";
    button.dataset.primary = preset.primary;
    button.dataset.secondary = preset.secondary;
    button.title = preset.name;
    const swatch = document.createElement("span");
    swatch.style.background = `linear-gradient(135deg, ${preset.primary} 0 55%, ${preset.secondary} 55% 100%)`;
    const label = document.createElement("span");
    label.textContent = preset.name;
    button.append(swatch, label);
    button.addEventListener("click", () => {
      setSettings({ primaryColor: preset.primary, secondaryColor: preset.secondary });
      renderStudioStatus(`已应用「${preset.name}」`);
    });
    dom.palettePresets.append(button);
  }

  dom.brandPresetGrid.replaceChildren();
  for (const preset of BRAND_PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.brand = preset.id;
    button.title = preset.label;
    button.innerHTML = brandSvg(
      preset.id,
      state.palette || buildPalette(DEFAULT_PRIMARY, DEFAULT_SECONDARY, resolvedTheme())
    );
    const label = document.createElement("span");
    label.textContent = preset.label;
    button.append(label);
    button.addEventListener("click", () => {
      setSettings({ brandIcon: { type: "preset", value: preset.id } });
      renderBrandIcon();
      scheduleWindowIconUpdate();
      renderStudioStatus("图标已更新");
    });
    dom.brandPresetGrid.append(button);
  }

  dom.stickerPresets.replaceChildren();
  for (const sticker of STICKER_PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = sticker;
    button.title = `添加 ${sticker}`;
    button.addEventListener("click", () => addSticker(sticker));
    dom.stickerPresets.append(button);
  }

  renderUiElements();
  renderStickerList();
  renderCustomButtonList();
  buildComponentColorsUI();
}

function switchStudioTab(tab = "color") {
  const target = tab || "color";
  for (const button of dom.studioTabs.querySelectorAll("button[data-studio-tab]")) {
    button.classList.toggle("active", button.dataset.studioTab === target);
  }
  for (const panel of dom.studioDialog.querySelectorAll("[data-studio-panel]")) {
    panel.hidden = panel.dataset.studioPanel !== target;
  }
  if (target === "pack") renderThemePackSummary();
}

function openStudio(tab = "color") {
  switchStudioTab(tab);
  renderStudioColorState();
  renderBrandIcon();
  renderStickerList();
  renderCustomButtonList();
  renderUiElements();
  renderStudioHomeCssState();
  if (dom.themePackName) {
    dom.themePackName.value = state.settings.themeName || "我的墨阅主题";
  }
  renderThemePackSummary();
  renderThemePackLibrary();
  if (!dom.studioDialog.open) dom.studioDialog.showModal();
}

function renderStudioStatus(message) {
  if (!dom.studioStatus) return;
  dom.studioStatus.textContent = message || "主题设置会自动保存";
  clearTimeout(state.studioStatusTimer);
  state.studioStatusTimer = window.setTimeout(() => {
    if (dom.studioStatus) dom.studioStatus.textContent = "主题设置会自动保存";
  }, 2600);
}

/* -------------------------------------------------------------------------- */
/* Theme packs                                                                 */
/* -------------------------------------------------------------------------- */

const THEME_PACK_FORMAT = "moread-theme";
const THEME_PACK_VERSION = 2;
const THEME_IMAGE_PATTERN = /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i;

const clampValue = (value, min, max) => Math.min(max, Math.max(min, value));

function sanitizeComponentColors(input) {
  const colors = {};
  if (!input || typeof input !== "object") return colors;
  for (const item of COMPONENT_COLORS) {
    const value = normalizeHex(input[item.id], "");
    if (value) colors[item.id] = value;
  }
  return colors;
}

function sanitizeStickers(input) {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, 40)
    .map((sticker) => {
      if (!sticker || typeof sticker !== "object") return null;
      const isImage =
        sticker.type === "image" && THEME_IMAGE_PATTERN.test(String(sticker.value || ""));
      const value = isImage
        ? String(sticker.value).slice(0, 700_000)
        : String(sticker.value || "✦").slice(0, 12);
      if (!value) return null;
      return {
        id: makeId("sticker"),
        type: isImage ? "image" : "emoji",
        value,
        x: clampValue(Number(sticker.x) || 50, 0, 100),
        y: clampValue(Number(sticker.y) || 50, 0, 100),
        size: clampValue(Number(sticker.size) || 48, 16, 200),
        rotation: clampValue(Number(sticker.rotation) || 0, -180, 180),
        scope: ["always", "welcome", "reading"].includes(sticker.scope)
          ? sticker.scope
          : "always"
      };
    })
    .filter(Boolean);
}

function sanitizeCustomButtons(input) {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, 24)
    .map((button) => {
      if (!button || typeof button !== "object") return null;
      const label = String(button.label || "").trim().slice(0, 40);
      const script = String(button.script || "").slice(0, 6000);
      if (!label || !script.trim()) return null;
      const safeIcon = String(button.icon || "✦").slice(0, 4);
      const entry = { id: makeId("button"), label, icon: safeIcon, script };
      if (button.origin === "theme" || button.origin === "plugin") entry.origin = button.origin;
      if (button.placement === "floating") entry.placement = "floating";
      return entry;
    })
    .filter(Boolean);
}

function sanitizeBrandIcon(input) {
  if (input && typeof input === "object") {
    if (input.type === "image" && THEME_IMAGE_PATTERN.test(String(input.value || ""))) {
      return { type: "image", value: String(input.value).slice(0, 700_000) };
    }
    const preset = BRAND_PRESETS.find((item) => item.id === input.value);
    if (preset) return { type: "preset", value: preset.id };
  }
  return { type: "preset", value: "default" };
}

function sanitizeHiddenIds(input) {
  if (!Array.isArray(input)) return [];
  return Array.from(new Set(input.filter((id) => UI_ITEM_MAP.has(id))));
}

function validateThemePack(pack) {
  if (!pack || typeof pack !== "object") throw new Error("文件不是有效的主题包");
  if (pack.format !== THEME_PACK_FORMAT) throw new Error("不是墨阅主题包（缺少 format 标记）");
  const version = Number(pack.version || 0);
  if (!Number.isFinite(version) || version < 1) throw new Error("主题包版本无效");
  if (version > THEME_PACK_VERSION) {
    throw new Error(`主题包版本 ${version} 高于当前支持的 ${THEME_PACK_VERSION}`);
  }
  const theme = pack.theme && typeof pack.theme === "object" ? pack.theme : {};
  const home = pack.home && typeof pack.home === "object" ? pack.home : {};
  const style = pack.style && typeof pack.style === "object" ? pack.style : {};
  return {
    name: String(pack.name || "未命名主题").trim().slice(0, 60) || "未命名主题",
    theme: {
      mode: ["light", "dark", "system"].includes(theme.mode) ? theme.mode : "system",
      primary: normalizeHex(theme.primary, DEFAULT_PRIMARY),
      secondary: normalizeHex(theme.secondary, DEFAULT_SECONDARY),
      componentColors: sanitizeComponentColors(theme.componentColors),
      brandIcon: sanitizeBrandIcon(theme.brandIcon),
      stickers: sanitizeStickers(theme.stickers),
      customButtons: sanitizeCustomButtons(theme.customButtons).map((button) => ({ ...button, origin: "theme" })),
      uiHidden: sanitizeHiddenIds(theme.uiHidden)
    },
    home: {
      enabled: Boolean(home.enabled),
      markdown: String(home.markdown || "").slice(0, 300_000)
    },
    style: {
      enabled: Boolean(style.enabled),
      css: String(style.css || "").slice(0, 600_000)
    }
  };
}

function buildThemePack({ includeContent = true } = {}) {
  const name =
    (dom.themePackName?.value || "").trim().slice(0, 60) ||
    state.settings.themeName ||
    "墨阅主题";
  const componentColors = state.settings.componentColorsAuto
    ? { ...(state.componentColorsEffective || {}) }
    : { ...(state.settings.componentColors || {}) };
  const pack = {
    format: THEME_PACK_FORMAT,
    version: THEME_PACK_VERSION,
    name,
    createdAt: new Date().toISOString(),
    home: { enabled: Boolean(state.settings.homeEnabled) },
    style: { enabled: Boolean(state.settings.customCssEnabled) },
    theme: {
      mode: state.settings.theme,
      primary: state.settings.primaryColor,
      secondary: state.settings.secondaryColor,
      componentColors,
      brandIcon: state.settings.brandIcon,
      stickers: state.settings.stickers,
      customButtons: state.settings.customButtons,
      uiHidden: state.settings.uiHidden
    }
  };
  if (includeContent) {
    pack.home.markdown = String(state.settings.homeMarkdown || "");
    pack.style.css = String(state.settings.customCss || "");
  }
  return pack;
}

function toFileUrl(filePath) {
  if (api.platform === "android" && typeof api.toDisplayUrl === "function") {
    const displayUrl = api.toDisplayUrl(filePath);
    if (displayUrl) return displayUrl;
  }
  const normalized = String(filePath || "").replace(/\\/g, "/");
  if (!normalized) return "";
  const drive = normalized.match(/^([A-Za-z]):\/(.*)$/);
  if (drive) {
    const rest = drive[2]
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
    return `file:///${drive[1]}:/${rest}`;
  }
  if (normalized.startsWith("/")) {
    return `file://${normalized
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/")}`;
  }
  return `file:///${normalized}`;
}

function assetUrlMap() {
  const map = new Map();
  for (const [name, filePath] of Object.entries(state.settings.themeAssets || {})) {
    if (!filePath) continue;
    const candidates = new Set([filePath]);
    if (/^[a-z][a-z0-9+.-]*:/i.test(filePath)) {
      // Already a URI (Android returns file:// uris).
      candidates.add(filePath);
    } else {
      candidates.add(toFileUrl(filePath));
    }
    // Android rewrites CSS urls through Capacitor.convertFileSrc(); map that
    // form back as well, otherwise dirty comparison never matches.
    const display = typeof api.toDisplayUrl === "function" ? api.toDisplayUrl(filePath) : "";
    if (display) candidates.add(display);
    for (const candidate of candidates) {
      if (candidate) map.set(candidate, name);
    }
  }
  return map;
}

function rewriteAssetRefs(text, assets) {
  let output = String(text || "");
  for (const asset of assets || []) {
    if (!asset?.name || !asset?.url) continue;
    const base = String(asset.name).replace(/^assets\//, "");
    const name = escapeRegExp(base);
    const url = asset.url;
    output = output
      .replace(new RegExp(`\\]\\(\\s*<?assets/${name}>?`, "g"), `](${url}`)
      .replace(
        new RegExp(`\\b(src|href)=(["'])assets/${name}\\2`, "g"),
        (_match, attr, quote) => `${attr}=${quote}${url}${quote}`
      )
      .replace(
        new RegExp(`url\\(\\s*(["']?)assets/${name}\\1\\s*\\)`, "g"),
        (_match, quote) => `url(${quote}${url}${quote})`
      )
      .replace(
        new RegExp(`^([ \\t]*\\[[^\\]]+\\]:[ \\t]*)assets/${name}$`, "gm"),
        `$1${url}`
      );
  }
  return output;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeAssetRefs(text) {
  let output = String(text || "");
  for (const [url, name] of assetUrlMap()) {
    if (output.includes(url)) output = output.split(url).join(name);
  }
  return output;
}

function applyCustomCss() {
  const css = state.settings.customCssEnabled ? String(state.settings.customCss || "") : "";
  let style = document.getElementById("appCustomCss");
  if (!css.trim()) {
    style?.remove();
    return;
  }
  if (!style) {
    style = document.createElement("style");
    style.id = "appCustomCss";
    document.head.append(style);
  }
  style.textContent = css;
}

function renderHome() {
  if (!dom.customHome || !dom.welcomeInner) return;
  const markdown = state.settings.homeEnabled ? String(state.settings.homeMarkdown || "") : "";
  const custom = markdown.trim().length > 0;
  dom.welcomeInner.hidden = custom;
  if (dom.welcomeTiles) dom.welcomeTiles.hidden = custom;
  dom.welcome.classList.toggle("is-custom-home", custom);
  dom.customHome.hidden = !custom;
  if (!custom) {
    dom.customHome.innerHTML = "";
    return;
  }
  try {
    const base = state.settings.homeBasePath
      ? `${state.settings.homeBasePath}\\home.md`
      : "";
    dom.customHome.innerHTML = renderMarkdown(markdown, base);
  } catch (error) {
    dom.customHome.innerHTML = `<p class="math-error">主页渲染失败：${escapeHtml(
      error.message || String(error)
    )}</p>`;
  }
}

function refreshHomePreview() {
  if (!dom.homePreview) return;
  const markdown = String(dom.homeMarkdown.value || "");
  dom.homePreview.innerHTML = markdown.trim()
    ? renderMarkdown(markdown, "")
    : '<p class="home-preview-empty">这里会预览自定义主页</p>';
}

async function insertHomeImage() {
  let result;
  try {
    result = await api.addThemeImage();
  } catch (error) {
    toast(`无法添加图片：${cleanError(error)}`, { type: "error", duration: 4200 });
    return;
  }
  if (!result || result.canceled) return;
  const textarea = dom.homeMarkdown;
  const markdown = `![主页图片](${result.url})`;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  textarea.value =
    textarea.value.slice(0, start) + markdown + textarea.value.slice(end);
  const caret = start + markdown.length;
  textarea.focus();
  textarea.setSelectionRange(caret, caret);
  setSettings(
    {
      themeAssets: {
        ...(state.settings.themeAssets || {}),
        [result.name]: result.path
      },
      homeMarkdown: textarea.value,
      homeEnabled: true
    },
    { apply: false }
  );
  dom.homeEnabled.checked = true;
  renderHome();
  refreshHomePreview();
  renderThemePackSummary();
  renderStudioStatus("已插入主页图片");
}

async function importCssFile(filePath) {
  let result;
  try {
    result = await api.importThemeCss(filePath || undefined);
  } catch (error) {
    toast(`无法读取 CSS：${cleanError(error)}`, { type: "error", duration: 4200 });
    return;
  }
  if (!result || result.canceled) return;
  dom.customCss.value = result.css;
  dom.customCssEnabled.checked = true;
  setSettings({ customCss: result.css, customCssEnabled: true }, { apply: false });
  applyCustomCss();
  renderThemePackSummary();
  renderStudioStatus(`已导入样式表「${result.name || "style.css"}」`);
  toast("样式包已应用", { type: "success", duration: 2200 });
}

function themePackFileName(name) {
  const safe = String(name || "moread-theme")
    .replace(/[\\/:*?"<>|\r\n]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
  return `${safe || "moread-theme"}.moread-theme.zip`;
}

async function exportThemePack() {
  const pack = buildThemePack({ includeContent: false });
  const assets = Object.entries(state.settings.themeAssets || {})
    .filter(([, filePath]) => typeof filePath === "string" && filePath)
    .map(([name, filePath]) => ({ name, path: filePath }));
  try {
    const result = await api.exportTheme({
      json: JSON.stringify(pack, null, 2),
      css: serializeAssetRefs(state.settings.customCss || ""),
      home: serializeAssetRefs(state.settings.homeMarkdown || ""),
      assets,
      suggestedName: themePackFileName(pack.name)
    });
    if (result?.canceled) return;
    setSettings({ themeName: pack.name }, { apply: false });
    renderStudioStatus(`主题「${pack.name}」已导出（${assets.length} 张图片）`);
    toast("主题包已导出", { type: "success" });
  } catch (error) {
    toast(`导出失败：${cleanError(error)}`, { type: "error", duration: 4200 });
  }
}

async function copyThemePack() {
  try {
    const pack = buildThemePack({ includeContent: true });
    pack.style.css = serializeAssetRefs(pack.style.css);
    pack.home.markdown = serializeAssetRefs(pack.home.markdown);
    await api.copyText(JSON.stringify(pack, null, 2));
    renderStudioStatus("主题 JSON 已复制到剪贴板");
    toast("主题 JSON 已复制", { type: "success" });
  } catch (error) {
    toast(`复制失败：${cleanError(error)}`, { type: "error" });
  }
}

async function importThemePack(filePath) {
  let result;
  try {
    result = await api.importTheme(filePath || undefined);
  } catch (error) {
    toast(`无法读取文件：${cleanError(error)}`, { type: "error", duration: 4200 });
    return;
  }
  if (!result || result.canceled) return;
  const assets = Array.isArray(result.assets) ? result.assets : [];
  await importThemeJson(result.json, {
    // Keep pack content portable (`assets/x`); URLs are resolved when applied.
    css: result.css || "",
    home: result.home || "",
    basePath: result.packDir || "",
    assets,
    packId: result.packId
  });
}

async function importThemeFromClipboard() {
  let raw = "";
  try {
    raw = await api.readClipboard();
  } catch (error) {
    toast(`无法读取剪贴板：${cleanError(error)}`, { type: "error" });
    return;
  }
  if (!raw || !raw.trim()) {
    renderStudioStatus("剪贴板里没有主题 JSON");
    toast("剪贴板为空", { type: "error" });
    return;
  }
  await importThemeJson(raw);
}

async function importThemeJson(raw, extras = {}) {
  let validated;
  try {
    validated = validateThemePack(JSON.parse(raw));
  } catch (error) {
    toast(`导入失败：${cleanError(error)}`, { type: "error", duration: 5200 });
    return;
  }

  const cssProvided = Boolean(extras.css && extras.css.trim()) || Boolean(validated.style.css);
  const homeProvided = Boolean(extras.home && extras.home.trim()) || Boolean(validated.home.markdown);
  const scriptButtons = (validated.theme.customButtons || []).filter(
    (button) => button.script && String(button.script).trim()
  );
  const extrasList = [];
  if (cssProvided) extrasList.push("CSS 样式");
  if (homeProvided) extrasList.push("主页内容");
  const extrasText = extrasList.length ? `包含${extrasList.join("、")}。` : "";

  const choice = await showConfirm({
    title: scriptButtons.length ? "导入带脚本按钮的主题？" : "导入这个主题？",
    message: scriptButtons.length
      ? `「${validated.name}」包含 ${scriptButtons.length} 个脚本按钮。脚本在点击按钮时执行，可以读写本机文件、访问网络——只导入你信任来源的主题包。`
      : `「${validated.name}」会加入主题包库并立即切换，之后可以随时切回或删除。${extrasText}文档内容不会改动。`,
    detail: scriptButtons.length
      ? `${scriptButtons
          .slice(0, 6)
          .map((button) => `· ${button.label}：${scriptPreview(button.script).split("\n")[0] || ""}`)
          .join("\n")}${scriptButtons.length > 6 ? `\n…还有 ${scriptButtons.length - 6} 个` : ""}`
      : "",
    buttons: scriptButtons.length
      ? [
          { id: "cancel", label: "取消", variant: "ghost" },
          { id: "appearance", label: "仅导入外观", variant: "ghost" },
          { id: "import", label: "导入并信任按钮", variant: "primary" }
        ]
      : [
          { id: "cancel", label: "取消", variant: "ghost" },
          { id: "import", label: "导入", variant: "primary" }
        ]
  });
  if (choice !== "import" && choice !== "appearance") return;
  if (choice === "appearance") {
    validated.theme.customButtons = [];
  } else if (scriptButtons.length) {
    const trusted = [
      ...new Set([...(state.settings.trustedButtons || []), ...scriptButtons.map((button) => button.id).filter(Boolean)])
    ];
    setSettings({ trustedButtons: trusted }, { apply: false });
  }

  const entry = addPackToLibrary({
    id: extras.packId || `pack-${Date.now().toString(36)}`,
    name: validated.name,
    payload: {
      theme: validated.theme,
      css: String(extras.css || validated.style.css || "").slice(0, 600_000),
      home: String(extras.home || validated.home.markdown || "").slice(0, 300_000),
      styleEnabled: validated.style.enabled || Boolean(extras.css),
      homeEnabled: validated.home.enabled || Boolean(extras.home)
    },
    assets: extras.assets || [],
    basePath: extras.basePath || ""
  });
  applyLibraryPack(entry.id);
  toast(`已导入并切换到「${validated.name}」`, { type: "success", duration: 3200 });
}

function themePacks() {
  return Array.isArray(state.settings.themePacks) ? state.settings.themePacks : [];
}

function currentPackPayload() {
  const pack = buildThemePack({ includeContent: true });
  return {
    theme: pack.theme,
    // Store/compare the portable form (`assets/x`), not machine-specific URLs.
    css: serializeAssetRefs(String(state.settings.customCss || "")),
    home: serializeAssetRefs(String(state.settings.homeMarkdown || "")),
    styleEnabled: Boolean(state.settings.customCssEnabled),
    homeEnabled: Boolean(state.settings.homeEnabled)
  };
}

function packSignature(payload) {
  // URLs are materialised differently per platform (file:// vs the Capacitor
  // asset bridge), so compare the portable `assets/x` form.
  return JSON.stringify({
    theme: payload?.theme || {},
    css: normalizeAssetRefs(payload?.css || ""),
    home: normalizeAssetRefs(payload?.home || ""),
    styleEnabled: Boolean(payload?.styleEnabled),
    homeEnabled: Boolean(payload?.homeEnabled)
  });
}

function normalizeAssetRefs(text) {
  return String(text || "").replace(
    /(?:[a-z][a-z0-9+.-]*:\/\/[^\s)"'<>]*?\/assets\/|_capacitor_file_[^\s)"'<>]*?\/assets\/)([^\s)"'<>]+)/gi,
    "assets/$1"
  );
}

function activePackEntry() {
  const id = state.settings.activeThemePack;
  if (!id) return null;
  return themePacks().find((pack) => pack.id === id) || null;
}

function packIsDirty(entry) {
  if (!entry) return false;
  return packSignature(entry.payload) !== packSignature(currentPackPayload());
}

function renderThemePackLibrary() {
  if (!dom.themePackLibrary) return;
  const list = themePacks();
  const activeId = state.settings.activeThemePack;
  dom.themePackLibrary.replaceChildren();

  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "theme-pack-empty";
    empty.textContent = "还没有保存的主题包。导入一个 .zip，或把当前主题存为新的主题包。";
    dom.themePackLibrary.append(empty);
    return;
  }

  for (const entry of list) {
    const row = document.createElement("div");
    row.className = "theme-pack-row";
    row.dataset.packId = entry.id;
    if (entry.id === activeId) row.classList.add("active");

    const swatch = document.createElement("span");
    swatch.className = "theme-pack-swatch";
    swatch.style.background = `linear-gradient(135deg, ${normalizeHex(
      entry.payload?.theme?.primary,
      DEFAULT_PRIMARY
    )}, ${normalizeHex(entry.payload?.theme?.secondary, DEFAULT_SECONDARY)})`;

    const info = document.createElement("div");
    info.className = "theme-pack-info";
    const name = document.createElement("strong");
    name.textContent = entry.name;
    const meta = document.createElement("small");
    const parts = [];
    if (entry.id === activeId) parts.push("当前使用");
    if (entry.id === activeId && packIsDirty(entry)) parts.push("有未保存修改");
    if (entry.payload?.homeEnabled && entry.payload?.home) parts.push("含主页");
    if (entry.payload?.styleEnabled && entry.payload?.css) parts.push("含样式");
    meta.textContent = parts.join(" · ") || "未启用";
    info.append(name, meta);

    const actions = document.createElement("div");
    actions.className = "theme-pack-row-actions";
    const makeButton = (action, label, variant = "") => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.packAction = action;
      button.textContent = label;
      if (variant) button.className = variant;
      return button;
    };

    if (entry.id === activeId) {
      if (packIsDirty(entry)) {
        actions.append(makeButton("update", "保存修改", "primary"));
      }
    } else {
      actions.append(makeButton("apply", "切换"));
    }
    actions.append(makeButton("rename", "改名"));
    actions.append(makeButton("export", "导出"));
    actions.append(makeButton("delete", "删除", "danger"));

    row.append(swatch, info, actions);
    dom.themePackLibrary.append(row);
  }
}

function libraryPackSettings(entry) {
  const payload = entry.payload;
  const theme = payload.theme || {};
  const assets = {};
  for (const asset of entry.assets || []) {
    if (asset?.name && asset?.path) assets[asset.name] = asset.path;
  }
  return {
    theme: theme.mode,
    primaryColor: theme.primary,
    secondaryColor: theme.secondary,
    componentColors: theme.componentColors,
    componentColorsAuto: false,
    themeName: entry.name,
    brandIcon: theme.brandIcon,
    stickers: theme.stickers,
    customButtons: Array.isArray(theme.customButtons) && theme.customButtons.length
      ? theme.customButtons
      : state.settings.customButtons,
    uiHidden: theme.uiHidden,
    customCss: rewriteAssetRefs(payload.css || "", entry.assets || []),
    customCssEnabled: Boolean(payload.styleEnabled && payload.css),
    homeMarkdown: rewriteAssetRefs(payload.home || "", entry.assets || []),
    homeEnabled: Boolean(payload.homeEnabled && payload.home),
    homeBasePath: entry.basePath || "",
    themeAssets: assets,
    activeThemePack: entry.id
  };
}

function refreshThemeSurface() {
  const theme = { uiHidden: state.settings.uiHidden || [] };
  applyUiVisibility(theme.uiHidden);
  renderStickers();
  renderCustomDock();
  renderBrandIcon();
  scheduleWindowIconUpdate();
  renderStickerList();
  renderCustomButtonList();
  renderUiElements();
  renderStudioColorState();
  renderStudioHomeCssState();
  renderThemePackSummary();
  renderThemePackLibrary();
}

function applyLibraryPack(id) {
  const entry = themePacks().find((pack) => pack.id === id);
  if (!entry) return;
  setSettings(libraryPackSettings(entry));
  syncPluginButtons();
  dom.themePackName.value = entry.name;
  refreshThemeSurface();
  renderStudioStatus(`已切换到主题包「${entry.name}」`);
  toast(`已应用「${entry.name}」`, { type: "success", duration: 2000 });
}

function updateLibraryPack(id) {
  const entry = themePacks().find((pack) => pack.id === id);
  if (!entry) return;
  const payload = currentPackPayload();
  const next = themePacks().map((pack) =>
    pack.id === id
      ? { ...pack, name: (dom.themePackName?.value || pack.name).trim().slice(0, 60) || pack.name, payload, updatedAt: Date.now() }
      : pack
  );
  setSettings(
    {
      themePacks: next,
      themeName: next.find((pack) => pack.id === id).name
    },
    { apply: false }
  );
  renderThemePackLibrary();
  renderStudioStatus("已保存到主题包");
  toast("主题包已更新", { type: "success", duration: 1800 });
}

function saveCurrentAsPack() {
  const name =
    (dom.themePackName?.value || "").trim().slice(0, 60) ||
    state.settings.themeName ||
    `我的主题 ${themePacks().length + 1}`;
  const assets = Object.entries(state.settings.themeAssets || {})
    .filter(([, filePath]) => typeof filePath === "string" && filePath)
    .map(([assetName, filePath]) => ({ name: assetName, path: filePath }));
  const entry = {
    id: `pack-${Date.now().toString(36)}`,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    payload: currentPackPayload(),
    assets,
    basePath: state.settings.homeBasePath || ""
  };
  setSettings(
    {
      themePacks: [entry, ...themePacks()],
      activeThemePack: entry.id,
      themeName: name
    },
    { apply: false }
  );
  renderThemePackLibrary();
  renderStudioStatus(`已保存为「${name}」`);
  toast(`已保存主题包「${name}」`, { type: "success", duration: 2200 });
}

async function renameLibraryPack(id) {
  const entry = themePacks().find((pack) => pack.id === id);
  if (!entry) return;
  const nextName = await showInputDialog({
    title: "重命名主题包",
    label: "名称",
    value: entry.name,
    hint: "只改显示名称，不影响配色与文件。",
    confirmLabel: "保存"
  });
  if (nextName === null) return;
  const name = nextName.trim().slice(0, 60);
  if (!name || name === entry.name) return;
  const next = themePacks().map((pack) => (pack.id === id ? { ...pack, name, updatedAt: Date.now() } : pack));
  const patch = { themePacks: next };
  if (state.settings.activeThemePack === id) patch.themeName = name;
  setSettings(patch, { apply: false });
  if (state.settings.activeThemePack === id) dom.themePackName.value = name;
  renderThemePackLibrary();
  renderStudioStatus(`已重命名为「${name}」`);
}

async function deleteLibraryPack(id) {
  const entry = themePacks().find((pack) => pack.id === id);
  if (!entry) return;
  const choice = await showConfirm({
    title: "删除这个主题包？",
    message: `「${entry.name}」会从本地主题包库移除，它自己的图片文件也会被清理。当前界面不会恢复原样。`,
    buttons: [
      { id: "cancel", label: "取消", variant: "ghost" },
      { id: "delete", label: "删除", variant: "danger" }
    ]
  });
  if (choice !== "delete") return;
  const next = themePacks().filter((pack) => pack.id !== id);
  const patch = { themePacks: next };
  if (state.settings.activeThemePack === id) patch.activeThemePack = "";
  setSettings(patch, { apply: false });
  api.removeThemePack?.(id).catch(() => {});
  renderThemePackLibrary();
  renderStudioStatus(`已删除「${entry.name}」`);
}

function exportLibraryPack(id) {
  const entry = themePacks().find((pack) => pack.id === id);
  if (!entry) return;
  const pack = buildThemePack({ includeContent: false });
  pack.name = entry.name;
  pack.theme = entry.payload.theme;
  pack.home = { enabled: Boolean(entry.payload.homeEnabled) };
  pack.style = { enabled: Boolean(entry.payload.styleEnabled) };
  const assets = (entry.assets || [])
    .filter((asset) => asset?.path)
    .map((asset) => ({ name: asset.name, path: asset.path }));
  api
    .exportTheme({
      json: JSON.stringify(pack, null, 2),
      css: serializeAssetRefs(entry.payload.css || ""),
      home: serializeAssetRefs(entry.payload.home || ""),
      assets,
      suggestedName: themePackFileName(entry.name)
    })
    .then((result) => {
      if (!result?.canceled) {
        renderStudioStatus(`已导出「${entry.name}」`);
        toast("主题包已导出", { type: "success" });
      }
    })
    .catch((error) => toast(`导出失败：${cleanError(error)}`, { type: "error", duration: 4200 }));
}

function addPackToLibrary({ id, name, payload, assets = [], basePath = "" }) {
  const entry = {
    id,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    payload,
    assets,
    basePath
  };
  const others = themePacks().filter((pack) => pack.id !== id);
  setSettings({ themePacks: [entry, ...others], activeThemePack: id }, { apply: false });
  return entry;
}

function renderStudioHomeCssState() {
  if (dom.homeEnabled) dom.homeEnabled.checked = Boolean(state.settings.homeEnabled);
  if (dom.customCssEnabled) dom.customCssEnabled.checked = Boolean(state.settings.customCssEnabled);
  if (dom.homeMarkdown) dom.homeMarkdown.value = String(state.settings.homeMarkdown || "");
  if (dom.customCss) dom.customCss.value = String(state.settings.customCss || "");
  refreshHomePreview();
}

function renderThemePackSummary() {
  if (!dom.themePackSummary) return;
  dom.themePackSummary.replaceChildren();
  const stats = [
    {
      title: "主题色",
      detail: `${normalizeHex(state.settings.primaryColor, DEFAULT_PRIMARY).toUpperCase()} · ${normalizeHex(
        state.settings.secondaryColor,
        DEFAULT_SECONDARY
      ).toUpperCase()}`,
      swatches: [state.settings.primaryColor, state.settings.secondaryColor]
    },
    {
      title: "组件颜色",
      detail: state.settings.componentColorsAuto
        ? "由主题色生成（导出时会写入具体色值）"
        : `${Object.keys(state.settings.componentColors || {}).length} 个自定义 / 其余跟随主题`
    },
    {
      title: "软件图标",
      detail:
        state.settings.brandIcon?.type === "image" ? "自定义图片" : "内置样式"
    },
    {
      title: "贴纸",
      detail: `${(state.settings.stickers || []).length} 个`
    },
    {
      title: "自定义按钮",
      detail: `${(state.settings.customButtons || []).length} 个`
    },
    {
      title: "隐藏的界面元素",
      detail: `${(state.settings.uiHidden || []).length} 个`
    },
    {
      title: "自定义主页",
      detail: state.settings.homeEnabled && state.settings.homeMarkdown?.trim()
        ? `${state.settings.homeMarkdown.length} 字符`
        : "使用默认主页"
    },
    {
      title: "页面样式包",
      detail: state.settings.customCssEnabled && state.settings.customCss?.trim()
        ? `${state.settings.customCss.length} 字符`
        : "未启用"
    }
  ];
  for (const stat of stats) {
    const card = document.createElement("div");
    card.className = "theme-pack-stat";
    const title = document.createElement("strong");
    title.textContent = stat.title;
    const detail = document.createElement("small");
    detail.textContent = stat.detail;
    card.append(title, detail);
    if (stat.swatches) {
      const row = document.createElement("div");
      row.className = "theme-pack-swatches";
      for (const color of stat.swatches) {
        const dot = document.createElement("i");
        dot.style.background = normalizeHex(color, DEFAULT_PRIMARY);
        row.append(dot);
      }
      card.append(row);
    }
    dom.themePackSummary.append(card);
  }
}
/* -------------------------------------------------------------------------- */
/* LaTeX editor                                                                */
/* -------------------------------------------------------------------------- */

function buildLatexPalette() {
  if (dom.latexCats.childElementCount === 0) {
    for (const group of LATEX_GROUPS) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.latexGroup = group.id;
      button.textContent = group.label;
      button.addEventListener("click", () => selectLatexCategory(group.id));
      dom.latexCats.append(button);
    }
    for (const template of LATEX_TEMPLATES) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = template.name;
      button.title = template.tex;
      button.addEventListener("click", () => {
        dom.latexSource.value = template.tex;
        updateLatexPreview();
        dom.latexSource.focus();
        dom.latexSource.setSelectionRange(0, dom.latexSource.value.length);
      });
      dom.latexTemplates.append(button);
    }
  }
  selectLatexCategory(state.latexCategory);
}

function selectLatexCategory(id) {
  state.latexCategory = id;
  for (const button of dom.latexCats.querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.latexGroup === id);
  }
  const group = LATEX_GROUPS.find((item) => item.id === id) || LATEX_GROUPS[0];
  dom.latexSymbols.replaceChildren();
  for (const symbol of group.items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "latex-symbol";
    const isEnvironment = symbol.preview.includes("\\begin");
    let preview = "";
    if (!isEnvironment) {
      preview = state.latexSymbolCache.get(symbol.preview);
      if (preview === undefined) {
        try {
          preview = mathPreviewHtml(symbol.preview, false);
        } catch {
          preview = "";
        }
        state.latexSymbolCache.set(symbol.preview, preview);
      }
    }
    if (preview) {
      button.innerHTML = preview;
    } else {
      button.classList.add("is-label");
      button.textContent = symbol.label || symbol.insert.replace(/\|/g, "");
    }
    button.title = symbol.label
      ? `${symbol.label}　${symbol.insert.replace(/\|/g, "")}`
      : symbol.insert.replace(/\|/g, "");
    button.addEventListener("click", () => insertLatexSnippet(symbol.insert));
    dom.latexSymbols.append(button);
  }
}

function insertLatexSnippet(template) {
  const textarea = dom.latexSource;
  const raw = String(template || "");
  const marker = raw.indexOf("|");
  const text = marker === -1 ? raw : raw.replace("|", "");
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  textarea.value = before + text + after;
  const caret = marker === -1 ? start + text.length : start + marker;
  textarea.focus();
  textarea.setSelectionRange(caret, caret);
  updateLatexPreview();
}

function updateLatexPreview() {
  const tex = dom.latexSource.value.trim();
  const display = state.latexDisplay === "block";
  if (!tex) {
    dom.latexPreview.innerHTML = "";
    dom.latexError.hidden = true;
    dom.latexError.textContent = "";
    return;
  }
  try {
    dom.latexPreview.innerHTML = mathPreviewHtml(tex, display);
  } catch (error) {
    dom.latexPreview.innerHTML = `<span class="math-error">${escapeHtml(String(error))}</span>`;
  }
  const problem = checkMath(tex);
  if (problem) {
    dom.latexError.hidden = false;
    dom.latexError.textContent = `语法提示：${problem}`;
  } else {
    dom.latexError.hidden = true;
    dom.latexError.textContent = "";
  }
}

function setLatexDisplay(display) {
  const isBlock = display === true || display === "block";
  state.latexDisplay = isBlock ? "block" : "inline";
  for (const button of dom.latexModeSwitch.querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.latexDisplay === state.latexDisplay);
  }
  updateLatexPreview();
}

function openLatexEditor({ tex = "", display = false, target = null, context = null } = {}) {
  state.latexTarget = target;
  state.latexContext = context;
  dom.latexSource.value = tex;
  dom.latexDeleteBtn.hidden = !target;
  dom.latexInsertBtn.textContent = target ? "保存" : "插入";
  dom.latexHint.textContent = target
    ? "修改后保存，Ctrl+Enter 确认"
    : "点击左侧符号插入，Ctrl+Enter 确认";
  buildLatexPalette();
  setLatexDisplay(display);
  if (!dom.latexDialog.open) dom.latexDialog.showModal();
  requestAnimationFrame(() => {
    dom.latexSource.focus();
    const end = dom.latexSource.value.length;
    dom.latexSource.setSelectionRange(end, end);
  });
}

function openLatexForInsert(display = false) {
  const doc = activeDoc();
  if (!doc) return;
  const visual = state.isVisualEditing;
  const capture = visual ? captureVisualSelection() : null;
  const selected = visual
    ? capture.text
    : view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);
  const looksLikeTex =
    selected &&
    selected.length < 400 &&
    !selected.includes("\n\n") &&
    /[\\^_=]/.test(selected);
  openLatexEditor({
    tex: looksLikeTex ? selected.trim() : "",
    display,
    context: { visual, capture }
  });
}

function mathNodeOrdinal(node, nodes) {
  const tex = node.getAttribute("data-tex") || "";
  const display = node.classList.contains("math-block");
  const index = nodes.indexOf(node);
  const ordinal = nodes
    .slice(0, index)
    .filter(
      (item) =>
        (item.getAttribute("data-tex") || "") === tex &&
        item.classList.contains("math-block") === display
    ).length;
  return { index, ordinal, tex, display };
}

function openLatexForMathNode(node) {
  const nodes = Array.from(dom.preview.querySelectorAll(".math-block, .math-inline"));
  const { index, ordinal, tex, display } = mathNodeOrdinal(node, nodes);
  openLatexEditor({
    tex,
    display,
    target: { visual: state.isVisualEditing, index, ordinal, oldTex: tex, display }
  });
}

function markMathReadonly() {
  for (const node of dom.preview.querySelectorAll(".math-inline, .math-block")) {
    node.setAttribute("contenteditable", "false");
  }
}

function insertMathFromEditor(tex, display, context) {
  const doc = activeDoc();
  if (!doc) return;
  if (context?.visual || state.isVisualEditing) {
    if (display) insertVisualBlockHtml(mathHtml(tex, true), context?.capture || null);
    else insertVisualHtml(mathHtml(tex, false), context?.capture || null);
    markMathReadonly();
    return;
  }
  const range = view.state.selection.main;
  if (display) {
    insertBlock(`$$\n${tex}\n$$`);
    return;
  }
  const insert = `$${tex}$`;
  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: { anchor: range.from + insert.length }
  });
  focusEditor();
}

function locateMathRange(target, ranges) {
  const candidates = ranges.filter(
    (range) =>
      normalizeTex(range.tex) === normalizeTex(target.oldTex) &&
      Boolean(range.display) === Boolean(target.display)
  );
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    return candidates[Math.min(target.ordinal || 0, candidates.length - 1)];
  }
  return ranges[target.index] || null;
}

function replaceSourceMath(target, tex, display) {
  const doc = activeDoc();
  if (!doc) return;
  const range = locateMathRange(target, findMathRanges(doc.content));
  if (!range) {
    toast("无法在源码中定位这个公式，已复制新的 LaTeX", { type: "error", duration: 4200 });
    api.copyText(tex).catch(() => {});
    return;
  }
  const replacement = display ? `$$\n${tex}\n$$` : `$${tex}$`;
  view.dispatch({
    changes: { from: range.start, to: range.end, insert: replacement },
    selection: { anchor: range.start + replacement.length }
  });
  view.focus();
  toast("公式已更新", { type: "success", duration: 1500 });
}

function replaceVisualMath(target, tex, display) {
  const nodes = Array.from(dom.preview.querySelectorAll(".math-block, .math-inline"));
  const node = nodes[target.index];
  const template = document.createElement("template");
  template.innerHTML = mathHtml(tex, display).trim();
  const replacement = template.content.firstElementChild;
  if (!node || !replacement) {
    toast("无法定位公式，请重新渲染后再试", { type: "error" });
    return;
  }
  node.replaceWith(replacement);
  replacement.setAttribute("contenteditable", "false");
  state.visualDirty = true;
  updateSaveState();
  scheduleVisualSync();
  toast("公式已更新", { type: "success", duration: 1500 });
}

function commitLatex() {
  const tex = dom.latexSource.value.trim();
  if (!tex) {
    toast("公式不能为空", { type: "error" });
    dom.latexSource.focus();
    return;
  }
  const display = state.latexDisplay === "block";
  const target = state.latexTarget;
  const context = state.latexContext;
  state.latexTarget = null;
  state.latexContext = null;
  dom.latexDialog.close();
  if (target) {
    if (target.visual) replaceVisualMath(target, tex, display);
    else replaceSourceMath(target, tex, display);
  } else {
    insertMathFromEditor(tex, display, context);
  }
}

function deleteLatex() {
  const target = state.latexTarget;
  if (!target) return;
  state.latexTarget = null;
  state.latexContext = null;
  dom.latexDialog.close();
  if (target.visual) {
    const nodes = Array.from(dom.preview.querySelectorAll(".math-block, .math-inline"));
    const node = nodes[target.index];
    if (node) {
      node.remove();
      state.visualDirty = true;
      updateSaveState();
      scheduleVisualSync();
      toast("公式已删除", { type: "success", duration: 1500 });
    }
    return;
  }
  const doc = activeDoc();
  if (!doc) return;
  const range = locateMathRange(target, findMathRanges(doc.content));
  if (!range) {
    toast("无法在源码中定位这个公式", { type: "error" });
    return;
  }
  view.dispatch({ changes: { from: range.start, to: range.end, insert: "" } });
  view.focus();
  toast("公式已删除", { type: "success", duration: 1500 });
}

const PLUGIN_SOURCE_LABEL = { app: "内置", user: "用户安装" };
const PLUGIN_FILTERS = new Set(["all", "enabled", "disabled", "error"]);

function makePluginTag(text, variant) {
  const tag = document.createElement("span");
  tag.className = `plugin-tag${variant ? ` ${variant}` : ""}`;
  tag.textContent = text;
  return tag;
}

function pluginItems(value) {
  return Array.isArray(value) ? value : [];
}

function pluginCount(value) {
  if (Array.isArray(value)) return value.length;
  return value && typeof value === "object" ? Object.keys(value).length : 0;
}

function pluginMatchesFilter(plugin, filter) {
  if (filter === "enabled") return Boolean(plugin.enabled);
  if (filter === "disabled") return !plugin.enabled;
  if (filter === "error") return Boolean(plugin.error);
  return true;
}

function pluginMatchesQuery(plugin, query) {
  if (!query) return true;
  const haystack = [plugin.name, plugin.id, plugin.author, plugin.description]
    .map((value) => String(value || "").toLowerCase())
    .join("\n");
  return haystack.includes(query);
}

function visiblePlugins() {
  const query = String(state.pluginQuery || "").trim().toLowerCase();
  const filter = PLUGIN_FILTERS.has(state.pluginFilter) ? state.pluginFilter : "all";
  return state.plugins.filter(
    (plugin) => pluginMatchesFilter(plugin, filter) && pluginMatchesQuery(plugin, query)
  );
}

function syncPluginFilterButtons() {
  for (const button of dom.pluginFilter?.querySelectorAll("button[data-filter]") || []) {
    button.setAttribute("aria-pressed", String(button.dataset.filter === state.pluginFilter));
  }
}

function setPluginFilter(filter) {
  state.pluginFilter = PLUGIN_FILTERS.has(filter) ? filter : "all";
  syncPluginFilterButtons();
  renderPluginList();
}

function resetPluginFilter() {
  state.pluginQuery = "";
  state.pluginFilter = "all";
  if (dom.pluginSearch) dom.pluginSearch.value = "";
  syncPluginFilterButtons();
}

function pluginEmptyState(title, detail) {
  const box = document.createElement("div");
  box.className = "plugin-empty";
  const heading = document.createElement("strong");
  heading.textContent = title;
  const note = document.createElement("small");
  note.textContent = detail;
  box.append(heading, note);
  return box;
}

function pluginDetailRow(label, value, { code = false } = {}) {
  const row = document.createElement("div");
  row.className = "plugin-detail-row";
  const key = document.createElement("span");
  key.className = "plugin-detail-label";
  key.textContent = label;
  const content = document.createElement(code ? "code" : "span");
  content.textContent = value;
  row.append(key, content);
  return row;
}

function describePluginElements(plugin) {
  const elements = pluginItems(plugin.elements);
  if (!elements.length) return "无";
  return elements
    .map((element) => {
      const fields = pluginItems(element.fields).length;
      return `${element.name}（${element.label || element.name}${fields ? ` · ${fields} 个字段` : ""}）`;
    })
    .join("、");
}

function describePluginButtons(plugin) {
  const buttons = pluginItems(plugin.buttons);
  if (!buttons.length) return "无";
  return buttons.map((button) => `${button.label || button.id}（${button.id}）`).join("、");
}

const PLUGIN_COMMAND_GROUP_LABELS = { import: "导入", export: "导出", tools: "工具" };

function describePluginCommands(plugin) {
  const commands = pluginItems(plugin.commands);
  if (!commands.length) return "无";
  return commands
    .map((command) => `${command.label}（${PLUGIN_COMMAND_GROUP_LABELS[command.group] || "工具"}）`)
    .join("、");
}

function revealPluginFolder(plugin) {
  if (!plugin?.dir) return;
  if (!api.revealFile) {
    toast("当前平台无法打开插件目录", { type: "error" });
    return;
  }
  try {
    api.revealFile(plugin.dir);
  } catch (error) {
    toast(`无法打开插件目录：${cleanError(error)}`, { type: "error" });
  }
}

function pluginDetailPanel(plugin) {
  const panel = document.createElement("div");
  panel.className = "plugin-detail";
  const permissions = pluginItems(plugin.permissions);
  panel.append(
    pluginDetailRow("元素", describePluginElements(plugin)),
    pluginDetailRow("按钮", describePluginButtons(plugin)),
    pluginDetailRow("命令", describePluginCommands(plugin)),
    pluginDetailRow("权限", permissions.length ? permissions.join("、") : "未声明"),
    pluginDetailRow("入口", plugin.entry || "index.js", { code: true }),
    pluginDetailRow("目录", plugin.dir || "—", { code: true })
  );
  const foot = document.createElement("div");
  foot.className = "plugin-detail-foot";
  /* Android keeps plugins in app-private storage: there is no folder to reveal. */
  if (api.platform !== "android") {
    const reveal = document.createElement("button");
    reveal.type = "button";
    reveal.className = "btn btn-ghost btn-small";
    reveal.textContent = "在文件夹中显示";
    reveal.addEventListener("click", () => revealPluginFolder(plugin));
    foot.append(reveal);
  }
  if (plugin.source === "user") {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn btn-ghost btn-small plugin-danger";
    remove.textContent = "卸载插件";
    remove.addEventListener("click", () => uninstallPlugin(plugin));
    foot.append(remove);
  } else {
    const note = document.createElement("small");
    note.className = "plugin-detail-note";
    note.textContent = "内置插件只能停用，不能卸载。";
    foot.append(note);
  }
  panel.append(foot);
  return panel;
}

function pluginCard(plugin) {
  const open = state.pluginDetails.has(plugin.id);
  const item = document.createElement("div");
  item.className = "plugin-item";
  item.dataset.pluginId = plugin.id;

  const icon = document.createElement("div");
  icon.className = "plugin-item-icon";
  icon.append(pluginIconNode(plugin, "plugin-item-icon-glyph"));

  const main = document.createElement("div");
  main.className = "plugin-item-main";

  const head = document.createElement("div");
  head.className = "plugin-item-head";
  const title = document.createElement("div");
  title.className = "plugin-item-title";
  const name = document.createElement("strong");
  name.textContent = plugin.name || plugin.id;
  name.title = plugin.id;
  const version = document.createElement("span");
  version.className = "plugin-item-version";
  version.textContent = `v${plugin.version || "0.0.0"}`;
  title.append(name, version);

  const actions = document.createElement("div");
  actions.className = "plugin-item-actions";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "btn btn-ghost btn-small";
  toggle.textContent = plugin.enabled ? "停用" : "启用";
  toggle.dataset.pluginToggle = plugin.id;
  toggle.addEventListener("click", () => togglePlugin(plugin));
  const detailToggle = document.createElement("button");
  detailToggle.type = "button";
  detailToggle.className = "btn btn-ghost btn-small";
  detailToggle.textContent = open ? "收起" : "详情";
  detailToggle.dataset.pluginDetail = plugin.id;
  detailToggle.setAttribute("aria-expanded", String(open));
  detailToggle.addEventListener("click", () => {
    if (open) state.pluginDetails.delete(plugin.id);
    else state.pluginDetails.add(plugin.id);
    renderPluginList();
    dom.pluginList?.querySelector(`[data-plugin-detail="${plugin.id}"]`)?.focus();
  });
  actions.append(toggle, detailToggle);
  head.append(title, actions);

  const counts = [
    `${pluginCount(plugin.elements)} 个元素`,
    `${pluginCount(plugin.buttons)} 个按钮`
  ];
  if (pluginCount(plugin.commands)) counts.push(`${pluginCount(plugin.commands)} 个命令`);
  if (pluginCount(plugin.resources)) counts.push(`${pluginCount(plugin.resources)} 个资源`);
  const meta = document.createElement("small");
  meta.className = "plugin-item-meta";
  meta.textContent = `${plugin.author || "未知作者"} · ${counts.join(" · ")}`;

  main.append(head, meta);
  if (plugin.description) {
    const desc = document.createElement("small");
    desc.className = "plugin-item-desc";
    desc.textContent = plugin.description;
    main.append(desc);
  }

  const tags = document.createElement("div");
  tags.className = "plugin-tags";
  tags.append(makePluginTag(PLUGIN_SOURCE_LABEL[plugin.source] || "插件"));
  tags.append(makePluginTag(plugin.enabled ? "已启用" : "已停用", plugin.enabled ? "" : "warn"));
  if (plugin.enabled && !plugin.loaded && !plugin.error) tags.append(makePluginTag("未加载", "warn"));
  if (plugin.error) tags.append(makePluginTag("加载失败", "error"));
  main.append(tags);

  if (plugin.error) {
    const error = document.createElement("div");
    error.className = "plugin-error";
    error.textContent = `加载失败：${plugin.error}`;
    main.append(error);
  }
  if (open) main.append(pluginDetailPanel(plugin));

  item.append(icon, main);
  return item;
}

function renderPluginSummary(visibleCount, unsupported = false) {
  if (!dom.pluginSummary) return;
  if (unsupported || !api.plugins) {
    dom.pluginSummary.textContent = "";
    return;
  }
  const total = state.plugins.length;
  const enabled = state.plugins.filter((plugin) => plugin.enabled).length;
  const failed = state.plugins.filter((plugin) => plugin.error).length;
  const parts = [`共 ${total} 个插件`, `${enabled} 个已启用`];
  if (failed) parts.push(`${failed} 个加载失败`);
  if (total && visibleCount !== total) parts.push(`筛选后 ${visibleCount} 个`);
  dom.pluginSummary.textContent = parts.join(" · ");
}

function renderPluginList() {
  if (!dom.pluginList) return;
  if (!api.plugins) {
    dom.pluginList.replaceChildren(
      pluginEmptyState("当前平台不支持插件管理", "插件只在桌面端可用；Android 版没有插件桥接。")
    );
    renderPluginSummary(0, true);
    return;
  }
  const visible = visiblePlugins();
  renderPluginSummary(visible.length);
  dom.pluginList.replaceChildren();
  if (!state.plugins.length) {
    dom.pluginList.append(
      pluginEmptyState(
        "还没有安装插件",
        api.platform === "android"
          ? "点「安装插件（.zip）」选择插件包；Android 版插件保存在应用私有目录。启用后会出现在格式栏。"
          : "安装一个 .zip 插件包，或把插件目录放进用户数据目录的 plugins/ 下。启用后会出现在格式栏。"
      )
    );
    return;
  }
  if (!visible.length) {
    const query = String(state.pluginQuery || "").trim();
    let title = "没有匹配的插件";
    let detail = "换个关键词，或切回「全部」；也可以清空下面的筛选。";
    if (!query && state.pluginFilter === "enabled") {
      title = "没有已启用的插件";
      detail = "启用插件后，它会出现在格式栏里。";
    } else if (!query && state.pluginFilter === "disabled") {
      title = "没有已停用的插件";
      detail = "所有插件都处于启用状态。";
    } else if (!query && state.pluginFilter === "error") {
      title = "没有加载失败的插件";
      detail = "所有已启用插件的入口脚本都正常加载了。";
    }
    const empty = pluginEmptyState(title, detail);
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "btn btn-ghost btn-small";
    clear.textContent = "清除筛选";
    clear.addEventListener("click", () => {
      resetPluginFilter();
      renderPluginList();
    });
    empty.append(clear);
    dom.pluginList.append(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const plugin of visible) fragment.append(pluginCard(plugin));
  dom.pluginList.append(fragment);
}

async function togglePlugin(plugin) {
  try {
    const next = await api.plugins.setEnabled(plugin.id, !plugin.enabled);
    applyPlugins(next);
    dom.pluginList?.querySelector(`[data-plugin-toggle="${plugin.id}"]`)?.focus();
    const updated = (next || []).find((item) => item.id === plugin.id);
    if (updated?.error) {
      toast(`「${updated.name}」加载失败：${updated.error}`, { type: "error", duration: 5200 });
    }
  } catch (error) {
    toast(`插件操作失败：${cleanError(error)}`, { type: "error" });
  }
}

async function installPluginFromZip() {
  if (!api.plugins?.install) {
    toast("当前平台不支持安装插件", { type: "error" });
    return;
  }
  let result;
  try {
    result = await api.plugins.install();
  } catch (error) {
    toast(`安装失败：${cleanError(error)}`, { type: "error", duration: 5200 });
    return;
  }
  if (!result || result.canceled) return;
  if (result.conflict) {
    const choice = await showConfirm({
      title: "覆盖已安装的插件？",
      message: `「${result.id}」已经安装${result.existing ? `（版本 ${result.existing}）` : ""}，继续会用插件包里的版本替换它。`,
      buttons: [
        { id: "cancel", label: "取消", variant: "ghost" },
        { id: "overwrite", label: "覆盖安装", variant: "danger" }
      ]
    });
    if (choice !== "overwrite") return;
    try {
      result = await api.plugins.install({ filePath: result.filePath, overwrite: true });
    } catch (error) {
      toast(`安装失败：${cleanError(error)}`, { type: "error", duration: 5200 });
      return;
    }
    if (!result || result.canceled) return;
  }
  if (!result?.installed) return;
  resetPluginFilter();
  applyPlugins(result.list || (await api.plugins.list()));
  toast(
    `已安装插件「${result.name || result.id}」${result.shadowed ? "（已覆盖内置同名插件）" : ""}`,
    { type: "success", duration: 3200 }
  );
}

async function uninstallPlugin(plugin) {
  const choice = await showConfirm({
    title: "卸载这个插件？",
    message: `「${plugin.name}」会从用户插件目录删除，它提供的元素和按钮随后消失。`,
    buttons: [
      { id: "cancel", label: "取消", variant: "ghost" },
      { id: "uninstall", label: "卸载", variant: "danger" }
    ]
  });
  if (choice !== "uninstall") return;
  try {
    const result = await api.plugins.uninstall(plugin.id);
    const trusted = (state.settings.trustedButtons || []).filter(
      (id) => !String(id).startsWith(`plugin:${plugin.id}:`)
    );
    if (trusted.length !== (state.settings.trustedButtons || []).length) {
      setSettings({ trustedButtons: trusted }, { apply: false });
    }
    applyPlugins(result?.list || (await api.plugins.list()));
    toast(`已卸载「${plugin.name}」`, { type: "success" });
  } catch (error) {
    toast(`卸载失败：${cleanError(error)}`, { type: "error" });
  }
}

async function openPluginsFolder() {
  if (!api.plugins?.openFolder) {
    toast("当前平台不支持插件目录", { type: "error" });
    return;
  }
  try {
    await api.plugins.openFolder();
  } catch (error) {
    toast(`无法打开插件目录：${cleanError(error)}`, { type: "error" });
  }
}

function renderCustomButtonList() {
  if (!dom.customButtonList) return;
  dom.customButtonList.replaceChildren();
  const buttons = state.settings.customButtons || [];
  if (!buttons.length) {
    const empty = document.createElement("div");
    empty.className = "studio-empty";
    empty.textContent = "还没有自定义按钮。添加后会在右下角出现。";
    dom.customButtonList.append(empty);
    return;
  }
  for (const definition of buttons) {
    const row = document.createElement("div");
    row.className = "custom-button-item";
    const icon = document.createElement("span");
    icon.className = "custom-button-item-icon";
    icon.textContent = definition.icon || "✦";
    const meta = document.createElement("div");
    meta.className = "custom-button-item-meta";
    const label = document.createElement("strong");
    label.textContent = definition.label || "未命名按钮";
    const script = document.createElement("small");
    script.textContent = (definition.script || "").split("\n")[0].slice(0, 82);
    meta.append(label, script);

    const run = document.createElement("button");
    run.type = "button";
    run.className = "icon-btn tiny";
    run.title = "运行测试";
    run.innerHTML = icons.play;
    run.addEventListener("click", () => runCustomScript(definition));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-btn tiny";
    remove.title = "删除按钮";
    remove.innerHTML = icons.x;
    remove.addEventListener("click", () => {
      const next = (state.settings.customButtons || []).filter((item) => item.id !== definition.id);
      setSettings({ customButtons: next }, { apply: false });
      renderCustomDock();
      renderCustomButtonList();
      renderStudioStatus("按钮已删除");
    });
    row.append(icon, meta, run, remove);
    dom.customButtonList.append(row);
  }
}

function renderUiElements() {
  if (!dom.uiElementsList) return;
  dom.uiElementsList.replaceChildren();
  const hidden = new Set(state.settings.uiHidden || []);
  for (const group of UI_ELEMENTS) {
    const wrapper = document.createElement("div");
    wrapper.className = "ui-element-group";
    const heading = document.createElement("h4");
    heading.textContent = group.group;
    const grid = document.createElement("div");
    grid.className = "ui-element-grid";
    for (const item of group.items) {
      const label = document.createElement("label");
      label.className = "ui-element-check";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !hidden.has(item.id);
      input.addEventListener("change", () => {
        const next = new Set(state.settings.uiHidden || []);
        if (input.checked) next.delete(item.id);
        else next.add(item.id);
        setSettings({ uiHidden: Array.from(next) }, { apply: false });
        applyUiVisibility(Array.from(next));
      });
      const text = document.createElement("span");
      text.textContent = item.label;
      label.append(input, text);
      grid.append(label);
    }
    wrapper.append(heading, grid);
    dom.uiElementsList.append(wrapper);
  }
}

function setHiddenUi(ids) {
  setSettings({ uiHidden: ids }, { apply: false });
  applyUiVisibility(ids);
  renderUiElements();
}

function readImageAsDataUrl(file, maxBytes = 1_000_000) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("未选择文件"));
      return;
    }
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
      reject(new Error("请选择 PNG / JPG / WebP 图片"));
      return;
    }
    if (file.size > maxBytes) {
      reject(new Error("图片不能超过 1 MB"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

async function imageFileToPngDataUrl(file, size = 256) {
  const source = await readImageAsDataUrl(file, 1_200_000);
  const image = await new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("无法解析图片"));
    element.src = source;
  });
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  const scale = Math.min(size / image.width, size / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  context.clearRect(0, 0, size, size);
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  return canvas.toDataURL("image/png");
}

function addCustomButton() {
  const label = dom.customButtonLabel.value.trim();
  const icon = dom.customButtonIcon.value.trim() || "✦";
  const script = dom.customButtonScript.value.trim();
  if (!label) {
    toast("请填写按钮名称", { type: "error" });
    dom.customButtonLabel.focus();
    return;
  }
  if (!script) {
    toast("请填写要执行的 JavaScript", { type: "error" });
    dom.customButtonScript.focus();
    return;
  }
  const buttons = [
    ...(state.settings.customButtons || []),
    { id: makeId("button"), label, icon: icon.slice(0, 4), script }
  ];
  setSettings({ customButtons: buttons }, { apply: false });
  renderCustomDock();
  renderCustomButtonList();
  dom.customButtonLabel.value = "";
  dom.customButtonIcon.value = "";
  dom.customButtonScript.value = "";
  renderStudioStatus("自定义按钮已添加");
}

function renderStickers() {
  if (!dom.stickerLayer) return;
  dom.stickerLayer.replaceChildren();
  const stickers = Array.isArray(state.settings.stickers) ? state.settings.stickers : [];
  const hasDoc = Boolean(activeDoc());
  for (const sticker of stickers) {
    const scope = sticker.scope || "always";
    if (scope === "welcome" && hasDoc) continue;
    if (scope === "reading" && !hasDoc) continue;
    const element = document.createElement("div");
    element.className = "sticker";
    element.dataset.id = sticker.id;
    element.style.left = `${sticker.x ?? 50}%`;
    element.style.top = `${sticker.y ?? 50}%`;
    element.style.fontSize = `${sticker.size || 48}px`;
    element.style.transform = `translate(-50%, -50%) rotate(${sticker.rotation || 0}deg)`;
    element.title = "拖动移动，双击删除";
    if (sticker.type === "image" && /^data:image\//i.test(sticker.value || "")) {
      const image = document.createElement("img");
      image.src = sticker.value;
      image.alt = "";
      element.append(image);
    } else {
      element.textContent = sticker.value || "✦";
    }
    element.addEventListener("dblclick", () => {
      removeSticker(sticker.id);
    });
    element.addEventListener("pointerdown", (event) => startStickerDrag(event, sticker));
    dom.stickerLayer.append(element);
  }
}

function startStickerDrag(event, sticker) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  const element = event.currentTarget;
  const layerRect = dom.stickerLayer.getBoundingClientRect();
  element.classList.add("dragging");
  element.setPointerCapture(event.pointerId);

  const move = (moveEvent) => {
    const x = ((moveEvent.clientX - layerRect.left) / layerRect.width) * 100;
    const y = ((moveEvent.clientY - layerRect.top) / layerRect.height) * 100;
    sticker.x = Math.max(2, Math.min(98, x));
    sticker.y = Math.max(2, Math.min(98, y));
    element.style.left = `${sticker.x}%`;
    element.style.top = `${sticker.y}%`;
  };
  const up = () => {
    element.classList.remove("dragging");
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerup", up);
    element.removeEventListener("pointercancel", up);
    setSettings({ stickers: state.settings.stickers }, { apply: false });
    renderStickerList();
  };
  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", up);
  element.addEventListener("pointercancel", up);
}

function addSticker(value, type = "emoji") {
  const stickers = Array.isArray(state.settings.stickers) ? [...state.settings.stickers] : [];
  stickers.push({
    id: makeId("sticker"),
    type,
    value,
    x: 81 + (Math.random() * 8 - 4),
    y: 22 + (Math.random() * 8 - 4),
    size: 48,
    rotation: 0,
    scope: "always"
  });
  setSettings({ stickers }, { apply: false });
  renderStickers();
  renderStickerList();
  toast("贴纸已添加，可直接拖动位置", { type: "success" });
}

function removeSticker(id) {
  const stickers = (state.settings.stickers || []).filter((item) => item.id !== id);
  setSettings({ stickers }, { apply: false });
  renderStickers();
  renderStickerList();
  renderStudioStatus("贴纸已删除");
}

function renderStickerList() {
  if (!dom.stickerList) return;
  dom.stickerList.replaceChildren();
  const stickers = state.settings.stickers || [];
  if (!stickers.length) {
    const empty = document.createElement("div");
    empty.className = "studio-empty";
    empty.textContent = "还没有贴纸。点击上方表情添加，或上传一张 PNG。";
    dom.stickerList.append(empty);
    return;
  }
  for (const sticker of stickers) {
    const row = document.createElement("div");
    row.className = "sticker-row";
    const preview = document.createElement("span");
    preview.className = "sticker-row-preview";
    if (sticker.type === "image") {
      const image = document.createElement("img");
      image.src = sticker.value;
      image.alt = "";
      preview.append(image);
    } else {
      preview.textContent = sticker.value;
    }

    const controls = document.createElement("div");
    controls.className = "sticker-row-controls";
    const sizeLabel = document.createElement("label");
    sizeLabel.innerHTML = '<span>大小</span>';
    const size = document.createElement("input");
    size.type = "range";
    size.min = "24";
    size.max = "140";
    size.value = String(sticker.size || 48);
    size.addEventListener("input", () => {
      sticker.size = Number(size.value);
      const element = dom.stickerLayer.querySelector(`[data-id="${sticker.id}"]`);
      if (element) element.style.fontSize = `${sticker.size}px`;
      setSettings({ stickers: state.settings.stickers }, { apply: false });
    });
    sizeLabel.append(size);

    const rotateLabel = document.createElement("label");
    rotateLabel.innerHTML = '<span>角度</span>';
    const rotate = document.createElement("input");
    rotate.type = "range";
    rotate.min = "-45";
    rotate.max = "45";
    rotate.value = String(sticker.rotation || 0);
    rotate.addEventListener("input", () => {
      sticker.rotation = Number(rotate.value);
      const element = dom.stickerLayer.querySelector(`[data-id="${sticker.id}"]`);
      if (element) {
        element.style.transform = `translate(-50%, -50%) rotate(${sticker.rotation}deg)`;
      }
      setSettings({ stickers: state.settings.stickers }, { apply: false });
    });
    rotateLabel.append(rotate);

    const scope = document.createElement("select");
    for (const [value, label] of [
      ["always", "始终显示"],
      ["welcome", "仅欢迎页"],
      ["reading", "仅阅读页"]
    ]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = (sticker.scope || "always") === value;
      scope.append(option);
    }
    scope.addEventListener("change", () => {
      sticker.scope = scope.value;
      setSettings({ stickers: state.settings.stickers }, { apply: false });
      renderStickers();
    });

    controls.append(sizeLabel, rotateLabel, scope);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "text-btn";
    remove.textContent = "删除";
    remove.addEventListener("click", () => removeSticker(sticker.id));
    row.append(preview, controls, remove);
    dom.stickerList.append(row);
  }
}

const CSS_VALUE_FORBIDDEN = /\/\*|\*\/|url\s*\(|expression\s*\(|javascript\s*:|-moz-binding|@import/gi;

/**
 * Attribute values come from the document, so they are untrusted. They may be
 * substituted into a plugin's CSS template (e.g. `border-color:{color}`), which
 * means `;`/`{}`/URL loads have to be removed or a Markdown file could inject
 * arbitrary global styles.
 */
function sanitizeCssValue(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[{}<>;\\]/g, " ")
    .replace(CSS_VALUE_FORBIDDEN, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
}

/** Plugin CSS text is trusted local code, but network imports are not needed. */
function sanitizePluginCss(css) {
  return String(css || "")
    .replace(/@import[^;]*;?/gi, " ")
    .replace(/expression\s*\(/gi, " ")
    .replace(/javascript\s*:/gi, " ")
    .replace(/-moz-binding/gi, " ")
    .slice(0, 20000);
}

/**
 * A placeholder may sit inside an HTML `style="..."` attribute, where attribute
 * values are really CSS. Detect that so those values are sanitized as CSS
 * instead of merely HTML-escaped (e.g. `border-color:{color}`).
 */
function placeholderContext(template, index) {
  const prefix = String(template || "").slice(0, index);
  const attr = /(?<![\w-])style\s*=\s*(["'])/gi;
  let match;
  let last = null;
  while ((match = attr.exec(prefix))) {
    last = { quote: match[1], valueStart: attr.lastIndex };
  }
  if (!last) return "html";
  const close = template.indexOf(last.quote, last.valueStart);
  return close === -1 || close > index ? "css" : "html";
}

const RESOURCE_TOKEN = /\{resource:([\w-]+)\}/g;

function pluginResourceUrl(plugin, key) {
  const url = plugin && plugin.resources ? plugin.resources[key] : "";
  return typeof url === "string" ? url : "";
}

/**
 * Plugin templates may reference bundled files with `{resource:key}`; the main
 * process only exposes declared resources as file URLs inside the plugin dir.
 */
function fillResourceTokens(text, plugin, escape) {
  return String(text || "").replace(RESOURCE_TOKEN, (_match, key) => {
    const url = pluginResourceUrl(plugin, key);
    if (!url) return "";
    return escape ? escapeHtml(url) : url;
  });
}

function pluginElementRenderer(plugin, element, attrs, context) {
  const values = { ...(element.defaults || {}), ...(attrs || {}) };
  const source = String(element.html || `<div class="moread-plugin-element">${escapeHtml(element.label || element.name)}</div>`);
  const html = fillResourceTokens(
    source.replace(/\{([a-zA-Z][\w-]*)\}/g, (_match, key, offset, template) => {
      const value = String(values[key] ?? "");
      if (placeholderContext(template, offset) === "css") return sanitizeCssValue(value);
      return escapeHtml(value);
    }),
    plugin,
    true
  );
  const css = sanitizePluginCss(
    fillResourceTokens(
      String(element.css || "").replace(/\{([a-zA-Z][\w-]*)\}/g, (_match, key) => sanitizeCssValue(values[key] ?? "")),
      plugin,
      false
    )
  );
  return `${css ? `<style>${css}</style>` : ''}${html}`;
}

/* Plugin actions are rendered from `state.plugins` in the titlebar, so the
   persisted customButtons list must not keep a second copy of them. This also
   cleans up the entries older builds merged into the floating dock. */
function syncPluginButtons() {
  const custom = (state.settings.customButtons || []).filter(
    (button) => !String(button.id || "").startsWith("plugin:")
  );
  setSettings({ customButtons: custom }, { apply: false });
  renderCustomDock();
  renderPluginButtons();
}

function applyPlugins(plugins) {
  for (const dispose of state.pluginElementDisposers.values()) dispose();
  state.pluginElementDisposers.clear();
  state.plugins = Array.isArray(plugins) ? plugins : [];
  const known = new Set(state.plugins.map((plugin) => plugin.id));
  for (const id of [...state.pluginDetails]) {
    if (!known.has(id)) state.pluginDetails.delete(id);
  }
  for (const plugin of state.plugins) {
    if (!plugin.enabled) continue;
    for (const element of plugin.elements || []) {
      try {
        const dispose = registerMarkdownElement(element.name, (attrs, context) => pluginElementRenderer(plugin, element, attrs, context));
        state.pluginElementDisposers.set(`${plugin.id}:${element.name}`, dispose);
      } catch (error) { console.warn('Plugin element registration failed', error); }
    }
  }
  syncPluginButtons();
  renderPluginCommands();
  renderPluginList();
}

const PLUGIN_FIELD_LABELS = {
  title: "标题",
  content: "内容",
  text: "文本",
  body: "正文",
  description: "说明",
  style: "样式",
  color: "颜色",
  width: "宽度",
  height: "高度",
  type: "类型"
};

function pluginFieldLabel(key) {
  return PLUGIN_FIELD_LABELS[key] || key;
}

function inferPluginFieldType(key, value) {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  const text = String(value ?? "");
  if (/color/i.test(key) && /^#([0-9a-f]{3,8})$/i.test(text)) return "color";
  if (["content", "text", "body", "description"].includes(key) || text.length > 48) return "textarea";
  return "text";
}

/**
 * Fields a dialog should ask for: the manifest's `fields`, or one implicit
 * field per default when the plugin did not declare any.
 */
function pluginElementFields(element) {
  const declared = Array.isArray(element.fields)
    ? element.fields.filter((field) => field && typeof field.key === "string" && field.key)
    : [];
  if (declared.length) return declared;
  const defaults = element.defaults && typeof element.defaults === "object" ? element.defaults : {};
  return Object.entries(defaults)
    .filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    .slice(0, 12)
    .map(([key, value]) => ({
      key,
      label: pluginFieldLabel(key),
      type: inferPluginFieldType(key, value),
      options: [],
      placeholder: ""
    }));
}

function pluginElementSnippet(element, values) {
  const source = values && typeof values === "object" ? values : element.defaults || {};
  const parts = [];
  for (const [key, value] of Object.entries(source)) {
    if (!/^[a-zA-Z][\w-]*$/.test(key) || value === null || value === undefined || typeof value === "object") continue;
    if (value === true) {
      parts.push(key);
      continue;
    }
    if (value === false) continue;
    // Custom elements are inline syntax, so a value must stay on one line.
    const text = String(value).replace(/\r?\n/g, " ").replace(/"/g, '\\"').replace(/\s+/g, " ").trim();
    parts.push(`${key}="${text}"`);
  }
  return `[${element.name}${parts.length ? ` ${parts.join(" ")}` : ""}]`;
}

function pluginFieldControl(field, value) {
  let control;
  if (field.type === "select" && Array.isArray(field.options) && field.options.length) {
    control = document.createElement("select");
    control.className = "text-input";
    for (const option of field.options) {
      const node = document.createElement("option");
      node.value = String(option.value ?? "");
      node.textContent = String(option.label || option.value || "");
      control.append(node);
    }
    control.value = String(value ?? field.options[0]?.value ?? "");
  } else if (field.type === "boolean") {
    control = document.createElement("input");
    control.type = "checkbox";
    control.checked = Boolean(value);
  } else if (field.type === "textarea") {
    control = document.createElement("textarea");
    control.className = "text-input";
    control.rows = 4;
    control.spellcheck = false;
    control.value = String(value ?? "");
  } else if (field.type === "color" && /^#([0-9a-f]{3,6})$/i.test(String(value ?? ""))) {
    control = document.createElement("input");
    control.type = "color";
    control.className = "text-input";
    control.value = String(value);
  } else {
    control = document.createElement("input");
    control.type = field.type === "number" ? "number" : "text";
    control.className = "text-input";
    control.spellcheck = false;
    control.value = String(value ?? "");
  }
  control.dataset.fieldKey = field.key;
  if (field.placeholder && "placeholder" in control) control.placeholder = field.placeholder;
  return control;
}

function openPluginElementDialog(plugin, element) {
  if (!activeDoc()) {
    toast("先打开一个文档", { type: "error" });
    return;
  }
  const fields = pluginElementFields(element);
  if (!fields.length) {
    insertPluginElement(element);
    return;
  }
  const defaults = element.defaults && typeof element.defaults === "object" ? element.defaults : {};
  state.pluginElementDraft = { plugin, element, fields };
  dom.pluginElementTitle.textContent = element.label || element.name;
  dom.pluginElementPlugin.textContent = plugin.name || "PLUGIN ELEMENT";
  dom.pluginElementSyntax.textContent = `[${element.name} …]`;
  dom.pluginElementFields.replaceChildren();
  for (const field of fields) {
    const row = document.createElement("label");
    row.className = "plugin-field";
    const label = document.createElement("span");
    label.className = "plugin-field-label";
    label.textContent = field.label || pluginFieldLabel(field.key);
    row.append(label, pluginFieldControl(field, defaults[field.key]));
    dom.pluginElementFields.append(row);
  }
  dom.pluginElementDialog.showModal();
  const first = dom.pluginElementFields.querySelector(".text-input");
  if (first) {
    first.focus();
    if (typeof first.select === "function") first.select();
  }
}

function commitPluginElementDialog() {
  const draft = state.pluginElementDraft;
  if (!draft) {
    dom.pluginElementDialog.close();
    return;
  }
  const values = { ...(draft.element.defaults || {}) };
  for (const field of draft.fields) {
    const node = dom.pluginElementFields.querySelector(`[data-field-key="${cssEscape(field.key)}"]`);
    if (!node) continue;
    if (field.type === "boolean") {
      if (node.checked) values[field.key] = true;
      else delete values[field.key];
      continue;
    }
    values[field.key] = node.value;
  }
  dom.pluginElementDialog.close();
  insertPluginElement(draft.element, values);
}

function pluginHasActions(plugin) {
  return Boolean(plugin?.enabled) &&
    ((plugin.elements?.length || 0) + (plugin.buttons?.length || 0) + (plugin.commands?.length || 0) > 0);
}

function pluginActions() {
  return (state.plugins || []).filter(pluginHasActions);
}

/* Plugin commands are menu entries in 「更多」: 导入 sits above the built-in
   exporters, 导出 right below them, 工具 after the file actions. */
function pluginCommandEntries() {
  const groups = { import: [], export: [], tools: [] };
  for (const plugin of state.plugins || []) {
    if (!plugin.enabled) continue;
    for (const command of plugin.commands || []) {
      const group = groups[command.group] ? command.group : "tools";
      groups[group].push({ plugin, command });
    }
  }
  return groups;
}

function pluginCommandButton(plugin, command, variant = "menu") {
  const button = document.createElement("button");
  button.type = "button";
  if (variant === "welcome") button.className = "btn btn-ghost btn-small";
  button.dataset.pluginCommand = `${plugin.id}:${command.id}`;
  button.dataset.commandGroup = command.group || "tools";
  button.title = command.description
    ? `${command.label} — ${plugin.name}`
    : `${plugin.name}：${command.label}`;
  const icon = document.createElement("span");
  icon.className = variant === "welcome" ? "welcome-plugin-icon" : "menu-glyph";
  if (icons[command.icon]) icon.innerHTML = icons[command.icon];
  else icon.textContent = command.icon || "✦";
  const label = document.createElement("span");
  label.className = "menu-label";
  label.textContent = command.label;
  button.append(icon, label);
  button.addEventListener("click", () => {
    hideMoreMenu();
    runCustomScript({
      id: `plugin:${plugin.id}:${command.id}`,
      label: command.label,
      script: command.script,
      origin: "plugin"
    });
  });
  return button;
}

function renderPluginCommands() {
  const groups = pluginCommandEntries();
  const containers = [
    { key: "import", node: dom.morePluginImport, separator: false },
    { key: "export", node: dom.morePluginExport, separator: true },
    { key: "tools", node: dom.morePluginTools, separator: true }
  ];
  for (const { key, node, separator } of containers) {
    if (!node) continue;
    node.replaceChildren();
    const entries = groups[key];
    node.hidden = entries.length === 0;
    if (!entries.length) continue;
    if (separator) {
      const line = document.createElement("div");
      line.className = "menu-sep";
      node.append(line);
    }
    for (const { plugin, command } of entries) node.append(pluginCommandButton(plugin, command));
  }

  /* The welcome page has no 更多 button, so import commands are mirrored there;
     that is the natural place to import a Word file before any document is open. */
  const welcome = dom.welcomePluginActions;
  if (welcome) {
    welcome.replaceChildren();
    welcome.hidden = groups.import.length === 0;
    for (const { plugin, command } of groups.import) {
      welcome.append(pluginCommandButton(plugin, command, "welcome"));
    }
  }
}

/* Desktop: one icon button per plugin in the format bar (each plugin's own
   menu). Mobile: the same icons are hidden by CSS and the single "插件" hub
   button opens a menu with every plugin. Both are rendered; CSS picks one. */
function renderPluginButtons() {
  if (!dom.formatPlugins || !dom.pluginMenuBtn) return;
  const plugins = pluginActions();
  dom.formatPlugins.replaceChildren();
  dom.formatPlugins.hidden = plugins.length === 0;
  dom.pluginMenuBtn.hidden = plugins.length === 0;
  if (dom.pluginMenuSep) dom.pluginMenuSep.hidden = plugins.length === 0;
  if (!plugins.length) {
    hidePluginMenu();
    return;
  }

  for (const plugin of plugins) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-btn fmt plugin-tool";
    button.title = `插件：${plugin.name}`;
    button.setAttribute("aria-label", button.title);
    button.append(pluginIconNode(plugin));
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const key = `plugin:${plugin.id}`;
      if (!dom.pluginMenu.hidden && dom.pluginMenu.dataset.menuKey === key) {
        hidePluginMenu();
      } else {
        openPluginMenu([plugin], button, key);
      }
    });
    dom.formatPlugins.append(button);
  }
}

function pluginIconNode(plugin, className = "plugin-icon-mask") {
  const classes = (base) => [...new Set([base, className])].filter(Boolean).join(" ");
  if (plugin.iconUrl) {
    if (String(plugin.iconType || "").toLowerCase() === "svg") {
      const mask = document.createElement("span");
      mask.className = classes("plugin-icon-mask");
      mask.style.setProperty(
        "--plugin-icon",
        `url("${String(plugin.iconUrl).replace(/"/g, "%22")}")`
      );
      return mask;
    }
    const image = document.createElement("img");
    image.className = classes("plugin-icon-img");
    image.src = plugin.iconUrl;
    image.alt = "";
    return image;
  }
  const glyph = document.createElement("span");
  glyph.className = classes("plugin-icon-glyph");
  glyph.textContent = plugin.icon || "✦";
  return glyph;
}

function openPluginMenu(plugins, anchor, key = "all") {
  const rect = anchor.getBoundingClientRect();
  closeColorPopover();
  hideMoreMenu();
  hideInsertMenu();
  hideAppMenu();
  hideFormatMenu();
  hideNoteMenu();
  dom.pluginMenu.replaceChildren();
  const list = Array.isArray(plugins) ? plugins.filter(pluginHasActions) : [];
  if (!list.length) return;
  dom.pluginMenu.dataset.menuKey = key;

  list.forEach((plugin, pluginIndex) => {
    if (pluginIndex > 0) {
      const sep = document.createElement("div");
      sep.className = "menu-sep";
      dom.pluginMenu.append(sep);
    }

    const title = document.createElement("div");
    title.className = "plugin-menu-title";
    title.append(pluginIconNode(plugin, "plugin-menu-icon"));
    const titleText = document.createElement("span");
    titleText.textContent = plugin.name || plugin.id;
    title.append(titleText);
    dom.pluginMenu.append(title);

    for (const element of plugin.elements || []) {
      const button = document.createElement("button");
      button.type = "button";
      const glyph = pluginIconNode(plugin, "plugin-menu-glyph");
      const text = document.createElement("span");
      text.className = "plugin-menu-text";
      const label = document.createElement("span");
      label.textContent = element.label || element.name;
      text.append(label);
      if (element.description) {
        const desc = document.createElement("small");
        desc.className = "plugin-menu-desc";
        desc.textContent = element.description;
        text.append(desc);
      }
      button.append(glyph, text);
      button.title = pluginElementSnippet(element);
      button.addEventListener("click", () => {
        hidePluginMenu();
        openPluginElementDialog(plugin, element);
      });
      dom.pluginMenu.append(button);
    }

    const scriptButtons = Array.isArray(plugin.buttons) ? plugin.buttons : [];
    if (scriptButtons.length) {
      if ((plugin.elements || []).length) {
        const sep = document.createElement("div");
        sep.className = "menu-sep";
        dom.pluginMenu.append(sep);
      }
      for (const definition of scriptButtons) {
        const button = document.createElement("button");
        button.type = "button";
        let glyph;
        if (definition.icon) {
          glyph = document.createElement("span");
          glyph.className = "plugin-menu-glyph";
          glyph.textContent = definition.icon;
        } else {
          glyph = pluginIconNode(plugin, "plugin-menu-glyph");
        }
        const text = document.createElement("span");
        text.className = "plugin-menu-text";
        const label = document.createElement("span");
        label.textContent = definition.label || definition.id;
        const desc = document.createElement("small");
        desc.className = "plugin-menu-desc";
        desc.textContent = "运行脚本";
        text.append(label, desc);
        button.append(glyph, text);
        button.title = definition.label || definition.id;
        button.addEventListener("click", async () => {
          hidePluginMenu();
          await runCustomScript({
            ...definition,
            id: `plugin:${plugin.id}:${definition.id}`,
            origin: "plugin"
          });
        });
        dom.pluginMenu.append(button);
      }
    }

    const commands = Array.isArray(plugin.commands) ? plugin.commands : [];
    if (commands.length) {
      if ((plugin.elements || []).length || scriptButtons.length) {
        const sep = document.createElement("div");
        sep.className = "menu-sep";
        dom.pluginMenu.append(sep);
      }
      for (const command of commands) {
        const button = document.createElement("button");
        button.type = "button";
        let glyph;
        if (command.icon && icons[command.icon]) {
          glyph = document.createElement("span");
          glyph.className = "plugin-menu-glyph";
          glyph.innerHTML = icons[command.icon];
        } else if (command.icon) {
          glyph = document.createElement("span");
          glyph.className = "plugin-menu-glyph";
          glyph.textContent = command.icon;
        } else {
          glyph = pluginIconNode(plugin, "plugin-menu-glyph");
        }
        const text = document.createElement("span");
        text.className = "plugin-menu-text";
        const label = document.createElement("span");
        label.textContent = command.label || command.id;
        const desc = document.createElement("small");
        desc.className = "plugin-menu-desc";
        const group = PLUGIN_COMMAND_GROUP_LABELS[command.group] || "工具";
        desc.textContent = command.description ? `${group} · ${command.description}` : group;
        text.append(label, desc);
        button.append(glyph, text);
        button.title = command.description || command.label || command.id;
        button.addEventListener("click", async () => {
          hidePluginMenu();
          await runCustomScript({
            ...command,
            id: `plugin:${plugin.id}:${command.id}`,
            origin: "plugin"
          });
        });
        dom.pluginMenu.append(button);
      }
    }
  });

  dom.pluginMenu.hidden = false;
  const menuRect = dom.pluginMenu.getBoundingClientRect();
  const top = Math.max(8, Math.min(rect.bottom + 7, window.innerHeight - menuRect.height - 8));
  dom.pluginMenu.style.top = `${top}px`;
  dom.pluginMenu.style.left = `${Math.max(
    12,
    Math.min(rect.left, window.innerWidth - menuRect.width - 12)
  )}px`;
}

function hidePluginMenu() {
  if (!dom.pluginMenu) return;
  dom.pluginMenu.hidden = true;
  delete dom.pluginMenu.dataset.menuKey;
}

function insertPluginElement(element, values) {
  if (!activeDoc()) {
    toast("先打开一个文档", { type: "error" });
    return;
  }
  const snippet = pluginElementSnippet(element, values);
  if (state.isVisualEditing) {
    insertVisualText(snippet);
    toast(`已插入「${element.label || element.name}」`, { type: "success", duration: 1400 });
    return;
  }
  insertBlock(snippet);
  toast(`已插入「${element.label || element.name}」`, { type: "success", duration: 1400 });
}

async function refreshPlugins({ reload = false } = {}) {
  if (!api.plugins) {
    applyPlugins([]);
    return;
  }
  try {
    const plugins = reload
      ? (await api.plugins.reload()) || []
      : (await api.plugins.list()) || [];
    applyPlugins(plugins);
  } catch (error) {
    console.warn('Plugin load failed', error);
  }
}

function renderCustomDock() {
  if (!dom.customDock) return;
  dom.customDock.replaceChildren();
  // Plugin buttons are rendered in the titlebar now; the floating dock is
  // only for user / theme-pack script buttons.
  const buttons = (state.settings.customButtons || []).filter(
    (button) => button.script && !String(button.id || "").startsWith("plugin:")
  );
  dom.customDock.hidden = buttons.length === 0;
  for (const definition of buttons) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "custom-dock-button";
    button.title = definition.label || "自定义脚本";
    button.textContent = definition.icon || "✦";
    button.addEventListener("click", () => runCustomScript(definition));
    dom.customDock.append(button);
  }
}

const scriptApi = {
  get content() {
    return activeDoc()?.content || "";
  },
  get selection() {
    const range = view?.state.selection.main;
    return range ? view.state.sliceDoc(range.from, range.to) : "";
  },
  get info() {
    const doc = activeDoc();
    return doc
      ? { name: doc.name, path: doc.path, dirty: doc.dirty, length: doc.content.length }
      : null;
  },
  async setContent(text) {
    const doc = activeDoc();
    if (!doc) throw new Error("没有打开的文档");
    const wasVisual = state.isVisualEditing;
    if (state.isVisualEditing) finishVisualEditing({ render: false });
    doc.content = String(text ?? "");
    doc.cmState = EditorState.create({ doc: doc.content, extensions: editorExtensions() });
    state.suppressUpdates = true;
    view.setState(doc.cmState);
    state.suppressUpdates = false;
    refreshDirty(doc);
    renderPreview({ reset: true });
    updateOutline(true);
    updateCounts();
    updateDirtyUI();
    updateWindowTitle();
    if (wasVisual) reenterVisualEditing();
  },
  async insert(text) {
    const doc = activeDoc();
    if (!doc) throw new Error("没有打开的文档");
    if (state.isVisualEditing) {
      insertVisualText(String(text ?? ""));
      return;
    }
    const range = view.state.selection.main;
    view.dispatch({
      changes: { from: range.from, to: range.to, insert: String(text ?? "") },
      selection: { anchor: range.from + String(text ?? "").length }
    });
    view.focus();
  },
  async replaceSelection(text) {
    return scriptApi.insert(text);
  },
  /* File/format helpers for plugin commands (see 「更多」菜单的导入/导出入口). */
  async pickFile(options = {}) {
    if (!api.pickFile) throw new Error("当前平台不支持选择文件");
    const result = await api.pickFile({
      title: String(options.title || "选择文件").slice(0, 80),
      extensions: Array.isArray(options.extensions) ? options.extensions.slice(0, 8) : []
    });
    return result && !result.canceled ? result : null;
  },
  async importDocx(filePath) {
    if (!api.importDocx) throw new Error("当前平台不支持导入 Word 文档");
    return api.importDocx(String(filePath || ""));
  },
  async createDocument(content, name) {
    const text = String(content ?? "");
    const doc = makeDoc({ name: String(name || "导入.md").slice(0, 120), content: text });
    if (text) {
      // Imported content has no file on disk yet: keep it marked as unsaved.
      doc.savedContent = "";
      doc.dirty = true;
    }
    state.docs.push(doc);
    activateDoc(doc.id, { focus: true });
    return { id: doc.id, name: doc.name };
  },
  open: openDialog,
  openPath,
  newDocument,
  save: () => saveActive(),
  saveAs: () => saveActive({ saveAs: true }),
  exportHtml,
  exportPdf,
  exportText,
  toast: (message) => toast(String(message ?? "")),
  setViewMode: (mode) => applyViewMode(mode),
  setTheme: (theme) => setTheme(theme),
  setColors: (primary, secondary) => {
    setSettings({
      primaryColor: normalizeHex(primary),
      secondaryColor: normalizeHex(secondary)
    });
  },
  openStudio: () => openStudio("color")
};

const SCRIPT_PREVIEW_LIMIT = 400;

function trustedButtonIds() {
  const list = state.settings.trustedButtons;
  return new Set(Array.isArray(list) ? list.filter((id) => typeof id === "string") : []);
}

function scriptButtonOrigin(definition) {
  const id = String(definition.id || "");
  if (id.startsWith("plugin:")) {
    const pluginId = id.split(":")[1] || "";
    const plugin = state.plugins.find((item) => item.id === pluginId);
    return plugin ? `插件「${plugin.name}」` : `插件 ${pluginId}`;
  }
  if (definition.origin === "theme") return "主题包";
  return "自定义按钮";
}

function scriptPreview(script) {
  const text = String(script || "").trim().split(/\r?\n/).slice(0, 8).join("\n");
  if (!text) return "（空脚本）";
  return text.length > SCRIPT_PREVIEW_LIMIT ? `${text.slice(0, SCRIPT_PREVIEW_LIMIT)}…` : text;
}

async function confirmScriptRun(definition) {
  if (trustedButtonIds().has(definition.id)) return true;
  const choice = await showConfirm({
    title: "运行这个脚本？",
    message: `「${definition.label || "未命名按钮"}」来自${scriptButtonOrigin(
      definition
    )}。脚本以当前窗口权限执行，可以读写本机文件、访问网络。`,
    detail: scriptPreview(definition.script),
    buttons: [
      { id: "cancel", label: "取消", variant: "ghost" },
      { id: "once", label: "仅运行一次", variant: "ghost" },
      { id: "trust", label: "信任并运行", variant: "primary" }
    ]
  });
  if (!choice || choice === "cancel") return false;
  if (choice === "trust") {
    const next = [...new Set([...trustedButtonIds(), definition.id])];
    setSettings({ trustedButtons: next }, { apply: false });
  }
  return true;
}

async function runCustomScript(definition) {
  if (state.runningScript) {
    toast("上一个脚本还在执行", { type: "error" });
    return;
  }
  if (!(await confirmScriptRun(definition))) return;
  state.runningScript = true;
  try {
    const runner = new Function(
      "app",
      "markdown",
      `"use strict"; return (async () => {\n${definition.script}\n})();`
    );
    await runner(scriptApi, scriptApi);
    toast(`已执行「${definition.label || "自定义按钮"}」`, { type: "success", duration: 1800 });
  } catch (error) {
    toast(`脚本执行失败：${cleanError(error)}`, { type: "error", duration: 4200 });
  } finally {
    state.runningScript = false;
  }
}

function applySidebar(initial = false) {
  dom.shell.classList.toggle("sidebar-collapsed", !state.sidebarOpen);
  dom.sidebar.inert = !state.sidebarOpen;
  dom.sidebar.setAttribute("aria-hidden", state.sidebarOpen ? "false" : "true");
  if (dom.brandBtn) {
    dom.brandBtn.setAttribute("aria-expanded", state.sidebarOpen ? "true" : "false");
    dom.brandBtn.title = state.sidebarOpen
      ? "隐藏侧栏 (Ctrl+Shift+B)"
      : "显示侧栏 (Ctrl+Shift+B)";
  }
  applySidebarSections();
  if (!initial) setSettings({ sidebarOpen: state.sidebarOpen });
}

function applySidebarSections() {
  const map = {
    recent: { collapsed: Boolean(state.settings.recentCollapsed), node: dom.recentSection },
    favorites: { collapsed: Boolean(state.settings.favoritesCollapsed), node: dom.favoritesSection },
    notes: { collapsed: Boolean(state.settings.notesCollapsed), node: dom.notesSection },
    outline: { collapsed: Boolean(state.settings.outlineCollapsed), node: dom.outlineSection }
  };
  for (const [key, entry] of Object.entries(map)) {
    if (!entry.node) continue;
    entry.node.classList.toggle("collapsed", entry.collapsed);
    const toggle = entry.node.querySelector(`[data-section-toggle="${key}"]`);
    if (toggle) {
      toggle.setAttribute("aria-expanded", entry.collapsed ? "false" : "true");
      toggle.title = entry.collapsed ? "展开" : "收起";
    }
  }
}

function toggleSidebarSection(key) {
  if (key === "recent") {
    setSettings({ recentCollapsed: !state.settings.recentCollapsed }, { apply: false });
  } else if (key === "favorites") {
    setSettings({ favoritesCollapsed: !state.settings.favoritesCollapsed }, { apply: false });
  } else if (key === "notes") {
    setSettings({ notesCollapsed: !state.settings.notesCollapsed }, { apply: false });
  } else if (key === "outline") {
    setSettings({ outlineCollapsed: !state.settings.outlineCollapsed }, { apply: false });
  }
  applySidebarSections();
}

function toggleSidebar() {
  state.sidebarOpen = !state.sidebarOpen;
  applySidebar();
}

function applyViewMode(mode, persist = true) {
  const allowed = ["read", "split", "edit", "visual"];
  const previous = state.viewMode;
  const nextMode = allowed.includes(mode) ? mode : "split";
  const leavingVisual = state.isVisualEditing && nextMode !== "visual";

  if (leavingVisual) finishVisualEditing({ render: false });
  state.viewMode = nextMode;
  dom.panes.className = `panes mode-${state.viewMode}`;
  dom.formatBar.hidden = !activeDoc() || state.showHome || state.viewMode === "read";
  updateViewSwitch();

  const doc = activeDoc();
  if (doc && leavingVisual) {
    state.suppressUpdates = true;
    view.setState(doc.cmState);
    view.requestMeasure();
    state.suppressUpdates = false;
  }

  if (doc && state.viewMode === "visual") {
    renderPreview();
    startVisualEditing();
    updateVisualHeadingSelect();
  } else if (doc && state.viewMode !== "edit") {
    renderPreview();
  }
  updateCursorInfo();

  if (doc) {
    state.scrollLockUntil = Date.now() + 220;
    requestAnimationFrame(() => {
      view.requestMeasure();
      if (state.viewMode === "visual") return;
      if ((previous === "read" || previous === "visual") && state.viewMode !== "read") {
        syncScrollRatio(dom.previewPane, view.scrollDOM);
      } else if (state.viewMode === "read") {
        syncScrollRatio(view.scrollDOM, dom.previewPane);
      } else if (previous === "edit" && state.viewMode === "split") {
        syncScrollRatio(view.scrollDOM, dom.previewPane);
      } else {
        dom.previewPane.scrollTop = doc.previewScroll || 0;
      }
      doc.scrollTop = view.scrollDOM.scrollTop;
      doc.previewScroll = dom.previewPane.scrollTop;
    });
  }

  if (persist) setSettings({ viewMode: state.viewMode }, { apply: false });
}

function updateViewSwitch() {
  for (const button of dom.viewSwitch.querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.mode === state.viewMode);
  }
}

function updateSyncUI() {
  dom.syncToggle.classList.toggle("on", Boolean(state.settings.syncScroll));
  dom.syncText.textContent = state.settings.syncScroll ? "同步" : "不同步";
  dom.syncToggleInput.checked = Boolean(state.settings.syncScroll);
}

function adjustFontSize(delta) {
  const next = Math.max(13, Math.min(21, Number(state.settings.fontSize) + delta));
  if (next === state.settings.fontSize) return;
  setSettings({ fontSize: next });
  toast(`字号 ${next} px`, { duration: 1100 });
}

/* -------------------------------------------------------------------------- */
/* File association                                                            */
/* -------------------------------------------------------------------------- */

function applyAssociation(status) {
  state.assoc = status;
  const registered = Boolean(status?.registered);
  const isDefault = Boolean(status?.isDefaultForMd);
  const level = isDefault ? "ok" : registered ? "partial" : "";

  for (const node of [
    dom.assocIndicator,
    dom.settingsAssocIndicator,
    dom.assocDialogIndicator
  ]) {
    if (node) node.className = `assoc-indicator ${level}`.trim();
  }

  if (dom.assocTitle) {
    dom.assocTitle.textContent = isDefault
      ? ".md 默认打开方式"
      : registered
        ? ".md 已注册"
        : ".md 打开方式";
  }
  if (dom.assocSubtitle) {
    dom.assocSubtitle.textContent = isDefault
      ? "双击 .md 即可用墨阅打开"
      : registered
        ? "前往系统设置设为默认"
        : "点击关联墨阅";
  }
  if (dom.settingsAssocTitle) {
    dom.settingsAssocTitle.textContent = isDefault
      ? "墨阅是默认打开方式"
      : registered
        ? "已注册，等待设为默认"
        : "尚未关联";
  }
  if (dom.settingsAssocDesc) {
    dom.settingsAssocDesc.textContent = isDefault
      ? "双击 .md、.markdown、.mdown 都会用墨阅打开"
      : registered
        ? "已写入打开方式；Windows 设置中可设为默认"
        : "将 .md、.markdown、.mdown 注册到墨阅"
  }
  if (dom.assocDialogTitle) {
    dom.assocDialogTitle.textContent = isDefault
      ? "墨阅已是默认打开方式"
      : registered
        ? "已注册，还需在系统中确认"
        : "尚未注册";
  }
  if (dom.assocDialogDesc) {
    dom.assocDialogDesc.textContent = isDefault
      ? "双击 Markdown 文件即可直接进入墨阅"
      : registered
        ? "打开 Windows 默认应用设置，选择墨阅并设为默认"
        : "点击下方按钮写入当前用户的文件关联"
  }
  if (dom.welcomeAssocText) {
    dom.welcomeAssocText.textContent = isDefault
      ? "墨阅已是 .md 的默认打开方式"
      : registered
        ? "已注册，去系统设置设为默认"
        : "注册为默认打开方式";
  }
  if (dom.assocPath) dom.assocPath.textContent = status?.command || "尚未写入注册表";
  if (dom.assocRegisterBtn) {
    dom.assocRegisterBtn.textContent = registered ? "重新注册" : "注册为打开方式";
  }
  if (dom.settingsRegisterBtn) {
    dom.settingsRegisterBtn.textContent = registered ? "重新注册" : "注册为打开方式";
  }
  if (dom.assocDefaultBtn) dom.assocDefaultBtn.disabled = !registered || state.assocBusy;
  if (dom.settingsDefaultBtn) dom.settingsDefaultBtn.disabled = !registered || state.assocBusy;
  if (dom.assocUnregisterBtn) dom.assocUnregisterBtn.disabled = !registered || state.assocBusy;
}

async function refreshAssociation() {
  try {
    const status = await api.associationStatus();
    applyAssociation(status);
  } catch (error) {
    console.error(error);
    applyAssociation(null);
  }
}

function setAssocBusy(busy) {
  state.assocBusy = busy;
  for (const button of [
    dom.assocRegisterBtn,
    dom.settingsRegisterBtn,
    dom.assocUnregisterBtn
  ]) {
    if (button) button.disabled = busy;
  }
  if (dom.assocDefaultBtn) dom.assocDefaultBtn.disabled = busy || !state.assoc?.registered;
  if (dom.settingsDefaultBtn) dom.settingsDefaultBtn.disabled = busy || !state.assoc?.registered;
}

async function registerAssociations() {
  if (state.assocBusy) return;
  setAssocBusy(true);
  if (dom.assocRegisterBtn) dom.assocRegisterBtn.textContent = "正在注册…";
  if (dom.settingsRegisterBtn) dom.settingsRegisterBtn.textContent = "正在注册…";
  try {
    const status = await api.registerAssociations();
    applyAssociation(status);
    toast("已注册为 Markdown 打开方式。可在系统设置中设为默认。", {
      type: "success",
      duration: 4200
    });
  } catch (error) {
    toast(`注册失败：${cleanError(error)}`, { type: "error", duration: 4200 });
  } finally {
    setAssocBusy(false);
    await refreshAssociation();
  }
}

async function openDefaultAppsSettings() {
  try {
    await api.openDefaultAppsSettings();
    toast("已打开 Windows 默认应用设置，请选择「墨阅 MoRead」。", {
      type: "success",
      duration: 4200
    });
  } catch (error) {
    toast(`无法打开系统设置：${cleanError(error)}`, { type: "error" });
  }
}

async function unregisterAssociations() {
  const choice = await showConfirm({
    title: "取消文件关联？",
    message: "将移除墨阅注册的 .md 打开方式，不会删除任何文档。",
    buttons: [
      { id: "cancel", label: "取消", variant: "ghost" },
      { id: "discard", label: "取消关联", variant: "danger" }
    ]
  });
  if (choice !== "discard") return;
  setAssocBusy(true);
  try {
    await api.unregisterAssociations();
    await refreshAssociation();
    toast("已取消文件关联");
  } catch (error) {
    toast(`操作失败：${cleanError(error)}`, { type: "error" });
  } finally {
    setAssocBusy(false);
  }
}

function openAssociationDialog() {
  dom.assocDialog.showModal();
  refreshAssociation();
}

/* -------------------------------------------------------------------------- */
/* Recent files                                                                */
/* -------------------------------------------------------------------------- */

async function refreshRecent() {
  try {
    const settings = await api.getSettings();
    state.recent = settings.recentFiles || [];
    state.settings.recentFiles = state.recent;
  } catch {
    // Ignore refresh errors.
  }
  renderRecent();
}

function renderRecent() {
  dom.recentList.replaceChildren();
  if (!state.recent.length) {
    const empty = document.createElement("div");
    empty.className = "empty-mini";
    empty.textContent = "最近打开的文档会留在这里。";
    dom.recentList.append(empty);
  } else {
    for (const item of state.recent) {
      const row = document.createElement("div");
      row.className = "recent-item";
      row.dataset.path = item.path;
      row.tabIndex = 0;
      row.title = item.path;
      if (activeDoc()?.path && samePath(activeDoc().path, item.path)) {
        row.classList.add("active");
      }

      const icon = document.createElement("span");
      icon.className = "recent-icon";
      icon.textContent = "MD";

      const meta = document.createElement("span");
      meta.className = "recent-meta";
      const name = document.createElement("span");
      name.className = "recent-name";
      name.textContent = item.name;
      const time = document.createElement("span");
      time.className = "recent-time";
      time.textContent = formatRelativeTime(item.openedAt);
      meta.append(name, time);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "recent-remove";
      remove.title = "从最近列表移除";
      remove.dataset.path = item.path;
      remove.innerHTML = icons.x;

      row.append(icon, meta, remove);
      dom.recentList.append(row);
    }
  }

  const latest = state.recent[0];
  if (dom.welcomeRecentText) {
    dom.welcomeRecentText.textContent = latest
      ? `${latest.name} · ${formatRelativeTime(latest.openedAt)}`
      : "还没有最近文档";
  }
}

async function removeRecent(filePath) {
  try {
    await api.removeRecent(filePath);
    state.recent = state.recent.filter((item) => item.path !== filePath);
    state.settings.recentFiles = state.recent;
    renderRecent();
  } catch (error) {
    console.error(error);
  }
}

async function clearRecent() {
  if (!state.recent.length) return;
  try {
    for (const item of [...state.recent]) {
      await api.removeRecent(item.path);
    }
    state.recent = [];
    state.settings.recentFiles = [];
    renderRecent();
    toast("最近列表已清空");
  } catch (error) {
    toast(`清空失败：${cleanError(error)}`, { type: "error" });
  }
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (isSameDay(date, now)) {
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return "昨天";
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

/* -------------------------------------------------------------------------- */
/* Export                                                                      */
/* -------------------------------------------------------------------------- */

function baseName(doc) {
  return (doc.name || "document").replace(/\.[^.]+$/, "") || "document";
}

function collectStyles() {
  const chunks = [];
  for (const sheet of document.styleSheets) {
    try {
      const base = sheet.href ? sheet.href.replace(/[^/]*$/, "") : "";
      for (const rule of sheet.cssRules) {
        let text = rule.cssText;
        if (sheet.href && /katex/i.test(sheet.href)) {
          text = text.replace(/url\((["']?)fonts\//g, `url($1${base}fonts/`);
        }
        chunks.push(text);
      }
    } catch {
      if (sheet.href) chunks.push(`@import url("${sheet.href}");`);
    }
  }
  return chunks.join("\n");
}

function buildExportHtml(doc) {
  const title = escapeHtml(doc.name.replace(/\.[^.]+$/, ""));
  const css = collectStyles();
  const katexLink = document.querySelector('link[href*="katex"]');
  return `<!doctype html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
${katexLink ? `<link rel="stylesheet" href="${katexLink.href}">` : ""}
<style>
${css}
html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
body { padding: 0 !important; user-select: text !important; }
.markdown-body { max-width: 820px; margin: 0 auto; padding: 48px 28px 96px !important; }
.code-copy, .color-chip, .code-preview-toggle, .html-preview, .table-toolbar { display: none !important; }
.mermaid-head, .mermaid-source, .mermaid-loading { display: none !important; }
.mermaid-figure { break-inside: avoid; }
</style>
</head>
<body>
<article class="markdown-body">
${dom.preview.innerHTML}
</article>
</body>
</html>`;
}

async function exportHtml() {
  const doc = activeDoc();
  if (!doc) return;
  const wasVisual = state.isVisualEditing;
  if (wasVisual) finishVisualEditing({ render: false });
  renderPreview();
  try {
    const result = await api.exportHtml({
      html: buildExportHtml(doc),
      suggestedName: `${baseName(doc)}.html`
    });
    if (!result.canceled) toast("HTML 已导出", { type: "success" });
  } catch (error) {
    toast(`导出失败：${cleanError(error)}`, { type: "error" });
  } finally {
    if (wasVisual) reenterVisualEditing();
  }
}

async function waitForImages() {
  const images = Array.from(dom.preview.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (image) =>
        image.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
              window.setTimeout(resolve, 1800);
            })
    )
  );
}

async function exportPdf() {
  const doc = activeDoc();
  if (!doc) return;
  const wasVisual = state.isVisualEditing;
  if (wasVisual) finishVisualEditing({ render: false });
  renderPreview();
  await waitForImages();
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore.
    }
  }
  document.body.classList.add("is-printing");
  try {
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 120)));
    const result = await api.exportPdf({ suggestedName: `${baseName(doc)}.pdf` });
    if (!result.canceled) toast("PDF 已导出", { type: "success" });
  } catch (error) {
    toast(`导出 PDF 失败：${cleanError(error)}`, { type: "error" });
  } finally {
    document.body.classList.remove("is-printing");
    if (wasVisual) reenterVisualEditing();
  }
}

async function exportText() {
  const doc = activeDoc();
  if (!doc) return;
  const wasVisual = state.isVisualEditing;
  if (wasVisual) finishVisualEditing({ render: false });
  try {
    const result = await api.exportText({
      text: doc.content,
      suggestedName: `${baseName(doc)}.txt`
    });
    if (!result.canceled) toast("纯文本已导出", { type: "success" });
  } catch (error) {
    toast(`导出失败：${cleanError(error)}`, { type: "error" });
  } finally {
    if (wasVisual) reenterVisualEditing();
  }
}

/* -------------------------------------------------------------------------- */
/* Menus, modals, toasts                                                       */
/* -------------------------------------------------------------------------- */

function openInsertMenu() {
  closeColorPopover();
  hideMoreMenu();
  hideAppMenu();
  hideFormatMenu();
  hidePluginMenu();
  const rect = dom.insertBtn.getBoundingClientRect();
  dom.insertMenu.hidden = false;
  const menuRect = dom.insertMenu.getBoundingClientRect();
  dom.insertMenu.style.top = `${rect.bottom + 7}px`;
  dom.insertMenu.style.left = `${Math.max(
    12,
    Math.min(rect.left, window.innerWidth - menuRect.width - 12)
  )}px`;
}

function hideInsertMenu() {
  dom.insertMenu.hidden = true;
}

function openMoreMenu() {
  closeColorPopover();
  hideInsertMenu();
  hideAppMenu();
  hideFormatMenu();
  hideNoteMenu();
  hidePluginMenu();
  const rect = $("#moreBtn").getBoundingClientRect();
  dom.moreMenu.hidden = false;
  const menuRect = dom.moreMenu.getBoundingClientRect();
  dom.moreMenu.style.top = `${rect.bottom + 7}px`;
  dom.moreMenu.style.left = `${Math.max(12, rect.right - menuRect.width)}px`;

  const doc = activeDoc();
  for (const button of dom.moreMenu.querySelectorAll("button")) {
    const action = button.dataset.action;
    if (["share", "reveal", "reload", "save-as"].includes(action)) {
      button.disabled = !doc;
    }
    if (action === "reveal") button.disabled = !doc?.path;
    if (action === "reload") button.disabled = !doc?.path;
    /* Export commands need a document; import/tool commands work without one. */
    if (button.dataset.commandGroup === "export") button.disabled = !doc;
  }
}

function hideMoreMenu() {
  dom.moreMenu.hidden = true;
}

function openAppMenu() {
  closeColorPopover();
  hideMoreMenu();
  hideInsertMenu();
  hideFormatMenu();
  hidePluginMenu();
  const rect = dom.appMenuBtn.getBoundingClientRect();
  dom.appMenu.hidden = false;
  const menuRect = dom.appMenu.getBoundingClientRect();
  dom.appMenu.style.top = `${rect.bottom + 7}px`;
  dom.appMenu.style.left = `${Math.max(12, rect.right - menuRect.width)}px`;
}

function hideAppMenu() {
  dom.appMenu.hidden = true;
}

function runAppAction(action) {
  hideAppMenu();
  if (action === "studio") $("#studioBtn").click();
  if (action === "help") $("#helpBtn").click();
  if (action === "settings") $("#settingsBtn").click();
}

function openFormatMenu() {
  closeColorPopover();
  hideMoreMenu();
  hideInsertMenu();
  hideAppMenu();
  hidePluginMenu();
  const rect = dom.formatMoreBtn.getBoundingClientRect();
  dom.formatMenu.hidden = false;
  const menuRect = dom.formatMenu.getBoundingClientRect();
  dom.formatMenu.style.top = `${rect.bottom + 7}px`;
  dom.formatMenu.style.left = `${Math.max(
    12,
    Math.min(rect.left, window.innerWidth - menuRect.width - 12)
  )}px`;
}

function hideFormatMenu() {
  dom.formatMenu.hidden = true;
}

function runFormatMenuAction(action) {
  hideFormatMenu();
  if (action === "latex") {
    dom.latexBtn.click();
    return;
  }
  applyFormat(action);
}

async function runMoreAction(action) {
  hideMoreMenu();
  if (action === "share") await shareActiveDocument();
  if (action === "export-html") await exportHtml();
  if (action === "export-pdf") await exportPdf();
  if (action === "export-text") await exportText();
  if (action === "save-as") await saveActive({ saveAs: true });
  if (action === "reload") await reloadActiveDoc();
  if (action === "reveal") {
    const doc = activeDoc();
    if (doc?.path) api.revealFile(doc.path);
    else toast("文档尚未保存到磁盘", { type: "error" });
  }
}

function showConfirm({ title, message, detail = "", buttons, icon = "alert" }) {
  return new Promise((resolve) => {
    const dialog = dom.confirmDialog;
    $("#confirmTitle").textContent = title;
    $("#confirmMessage").textContent = message;
    const detailNode = $("#confirmDetail");
    if (detailNode) {
      detailNode.textContent = detail || "";
      detailNode.hidden = !detail;
    }
    const iconNode = $("#confirmIcon");
    iconNode.innerHTML = icons[icon] || icons.alert;
    const actions = $("#confirmActions");
    actions.replaceChildren();

    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      dialog.close();
      resolve(value);
    };

    for (const button of buttons) {
      const element = document.createElement("button");
      element.type = "button";
      element.className = `btn btn-small ${
        button.variant === "primary"
          ? "btn-primary"
          : button.variant === "danger"
            ? "btn-danger"
            : "btn-ghost"
      }`;
      element.textContent = button.label;
      element.addEventListener("click", () => done(button.id));
      actions.append(element);
    }

    dialog.addEventListener(
      "cancel",
      (event) => {
        event.preventDefault();
        done("cancel");
      },
      { once: true }
    );
    dialog.addEventListener(
      "close",
      () => {
        if (!settled) {
          settled = true;
          resolve("cancel");
        }
      },
      { once: true }
    );
    dialog.showModal();
  });
}

async function handleCloseRequest() {
  if (state.closePromptOpen) return;
  const wasVisual = state.isVisualEditing;
  if (state.isVisualEditing) finishVisualEditing({ render: false });
  const dirtyDocs = state.docs.filter((doc) => doc.dirty);
  if (!dirtyDocs.length) {
    api.closeNow();
    return;
  }
  state.closePromptOpen = true;
  const choice = await showConfirm({
    title: "关闭墨阅？",
    message:
      dirtyDocs.length === 1
        ? `「${dirtyDocs[0].name}」有未保存的更改。`
        : `${dirtyDocs.length} 个文档有未保存的更改。`,
    buttons: [
      { id: "cancel", label: "取消", variant: "ghost" },
      { id: "discard", label: "不保存", variant: "danger" },
      { id: "save", label: dirtyDocs.length > 1 ? "全部保存" : "保存", variant: "primary" }
    ]
  });
  state.closePromptOpen = false;
  if (choice === "cancel") {
    if (wasVisual) reenterVisualEditing();
    return;
  }
  if (choice === "discard") {
    api.closeNow();
    return;
  }
  if (choice === "save") {
    for (const doc of dirtyDocs) {
      if (!(await saveDoc(doc))) {
        if (wasVisual) reenterVisualEditing();
        return;
      }
    }
    api.closeNow();
  }
}

function openSettings(section) {
  dom.settingsDialog.showModal();
  if (section === "shortcuts") {
    requestAnimationFrame(() => {
      document.querySelector(".shortcuts-section")?.scrollIntoView({ block: "center" });
    });
  }
}

function toast(message, options = {}) {
  const element = document.createElement("div");
  element.className = `toast ${options.type || "info"}`;
  const icon = document.createElement("span");
  icon.innerHTML = options.type === "error" ? icons.alert : icons.check;
  const text = document.createElement("span");
  text.textContent = message;
  element.append(icon, text);
  dom.toastStack.append(element);
  const duration = options.duration || 2600;
  window.setTimeout(() => {
    element.classList.add("leaving");
    window.setTimeout(() => element.remove(), 220);
  }, duration);
}

/* -------------------------------------------------------------------------- */
/* Events                                                                      */
/* -------------------------------------------------------------------------- */

function bindEvents() {
  dom.addFavoriteBtn?.addEventListener('click', () => addCurrentFavorite());
  dom.addFavoritePathBtn?.addEventListener('click', () => addFavoritePaths());
  dom.expandOutlineBtn?.addEventListener('click', () => setOutlineCollapsedAll(false));
  dom.collapseOutlineBtn?.addEventListener('click', () => setOutlineCollapsedAll(true));
  dom.newNoteBtn?.addEventListener('click', () => createNote(null));
  dom.newNoteFolderBtn?.addEventListener('click', () => createNoteFolder(null));
  dom.exportNotesBtn?.addEventListener('click', exportNotesZip);
  $("#saveBtn")?.addEventListener("click", () => saveActive());
  dom.noteMenu?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-note-action]');
    if (button) runNoteAction(button.dataset.noteAction);
  });


  $("#newDocBtn").addEventListener("click", newDocument);
  $("#openDocBtn").addEventListener("click", openDialog);
  $("#welcomeNewBtn").addEventListener("click", newDocument);
  $("#welcomeOpenBtn").addEventListener("click", openDialog);
  $("#welcomeRecentBtn").addEventListener("click", () => {
    if (state.recent[0]) openPath(state.recent[0].path);
    else openDialog();
  });
  $("#welcomeAssocBtn").addEventListener("click", openAssociationDialog);
  dom.assocBadge.addEventListener("click", openAssociationDialog);
  $("#undoBtn")?.addEventListener("click", () => runHistory("undo"));
  $("#redoBtn")?.addEventListener("click", () => runHistory("redo"));


  $("#settingsBtn").addEventListener("click", () => openSettings());
  $("#helpBtn").addEventListener("click", () => dom.helpDialog.showModal());
  dom.studioBtn.addEventListener("click", () => openStudio("color"));
  dom.homeBtn?.addEventListener("click", toggleHomePage);
  dom.themeToggle.addEventListener("click", toggleTheme);
  dom.brandBtn?.addEventListener("click", toggleSidebar);
  dom.brandBtn?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleSidebar();
  });
  const narrowSidebar = window.matchMedia("(max-width: 620px)");
  document.querySelector(".workspace")?.addEventListener(
    "click",
    (event) => {
      // Only the drawer layout has a scrim; in the two-column layout the
      // workspace is normal content and must never swallow the click.
      if (!state.sidebarOpen || !narrowSidebar.matches) return;
      event.preventDefault();
      event.stopPropagation();
      state.sidebarOpen = false;
      applySidebar();
    },
    true
  );
  narrowSidebar.addEventListener("change", (event) => {
    state.sidebarOpen = !event.matches;
    applySidebar(true);
  });
  $("#clearRecentBtn").addEventListener("click", clearRecent);
  dom.sidebar.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-section-toggle]");
    if (toggle) {
      event.preventDefault();
      toggleSidebarSection(toggle.dataset.sectionToggle);
    }
  });

  dom.themeOptions.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-theme]");
    if (button) setTheme(button.dataset.theme);
  });

  dom.studioTabs.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-studio-tab]");
    if (button) switchStudioTab(button.dataset.studioTab);
  });

  dom.primaryColor.addEventListener("input", () => {
    setSettings({ primaryColor: normalizeHex(dom.primaryColor.value, DEFAULT_PRIMARY) });
  });
  dom.secondaryColor.addEventListener("input", () => {
    setSettings({ secondaryColor: normalizeHex(dom.secondaryColor.value, DEFAULT_SECONDARY) });
  });
  dom.primaryHex.addEventListener("change", () => {
    const value = normalizeHex(dom.primaryHex.value, "");
    if (value) setSettings({ primaryColor: value });
    else renderStudioColorState();
  });
  dom.secondaryHex.addEventListener("change", () => {
    const value = normalizeHex(dom.secondaryHex.value, "");
    if (value) setSettings({ secondaryColor: value });
    else renderStudioColorState();
  });
  dom.resetPaletteBtn.addEventListener("click", () => {
    setSettings({ primaryColor: DEFAULT_PRIMARY, secondaryColor: DEFAULT_SECONDARY });
    renderStudioStatus("已恢复默认配色");
  });
  dom.resetComponentColorsBtn.addEventListener("click", () => {
    resetAllComponentColors();
  });
  dom.generateComponentColorsBtn.addEventListener("click", () => {
    generateComponentColorsFromTheme();
  });

  dom.themePackName.addEventListener("change", () => {
    const name = dom.themePackName.value.trim().slice(0, 60) || "未命名主题";
    dom.themePackName.value = name;
    setSettings({ themeName: name }, { apply: false });
    renderThemePackSummary();
  });
  dom.exportThemeBtn.addEventListener("click", exportThemePack);
  dom.importThemeBtn.addEventListener("click", importThemePack);
  dom.pasteThemeBtn.addEventListener("click", importThemeFromClipboard);
  dom.copyThemeBtn.addEventListener("click", copyThemePack);
  dom.savePackBtn.addEventListener("click", saveCurrentAsPack);

  dom.themePackLibrary.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-pack-action]");
    if (!button) return;
    const id = button.closest(".theme-pack-row")?.dataset.packId;
    if (!id) return;
    const action = button.dataset.packAction;
    if (action === "apply") applyLibraryPack(id);
    else if (action === "update") updateLibraryPack(id);
    else if (action === "rename") renameLibraryPack(id);
    else if (action === "delete") deleteLibraryPack(id);
    else if (action === "export") exportLibraryPack(id);
  });

  dom.homeEnabled.addEventListener("change", () => {
    setSettings({ homeEnabled: dom.homeEnabled.checked }, { apply: false });
    renderHome();
    refreshHomePreview();
    renderThemePackSummary();
    renderStudioStatus(dom.homeEnabled.checked ? "已启用自定义主页" : "已恢复默认主页");
  });
  dom.homeMarkdown.addEventListener("input", () => {
    const value = dom.homeMarkdown.value;
    const enabled = value.trim().length > 0;
    setSettings({ homeMarkdown: value, homeEnabled: enabled }, { apply: false });
    dom.homeEnabled.checked = enabled;
    clearTimeout(state.homePreviewTimer);
    state.homePreviewTimer = window.setTimeout(() => {
      renderHome();
      refreshHomePreview();
      renderThemePackSummary();
    }, 220);
  });
  dom.homeImageBtn.addEventListener("click", insertHomeImage);
  dom.homeResetBtn.addEventListener("click", () => {
    setSettings({ homeMarkdown: "", homeEnabled: false, homeBasePath: "" }, { apply: false });
    dom.homeMarkdown.value = "";
    dom.homeEnabled.checked = false;
    renderHome();
    refreshHomePreview();
    renderThemePackSummary();
    renderStudioStatus("已恢复默认主页");
  });

  dom.customCssEnabled.addEventListener("change", () => {
    setSettings({ customCssEnabled: dom.customCssEnabled.checked }, { apply: false });
    applyCustomCss();
    renderThemePackSummary();
    renderStudioStatus(dom.customCssEnabled.checked ? "已启用页面样式包" : "已停用页面样式包");
  });
  dom.customCss.addEventListener("input", () => {
    const value = dom.customCss.value;
    const enabled = value.trim().length > 0;
    setSettings({ customCss: value, customCssEnabled: enabled }, { apply: false });
    dom.customCssEnabled.checked = enabled;
    clearTimeout(state.cssApplyTimer);
    state.cssApplyTimer = window.setTimeout(() => {
      applyCustomCss();
      renderThemePackSummary();
    }, 200);
  });
  dom.importCssBtn.addEventListener("click", importCssFile);
  dom.clearCssBtn.addEventListener("click", () => {
    setSettings({ customCss: "", customCssEnabled: false }, { apply: false });
    dom.customCss.value = "";
    dom.customCssEnabled.checked = false;
    applyCustomCss();
    renderThemePackSummary();
    renderStudioStatus("已清空页面样式包");
  });

  dom.latexBtn.addEventListener("click", () => openLatexForInsert(false));
  dom.latexInsertBtn.addEventListener("click", commitLatex);
  dom.latexDeleteBtn.addEventListener("click", deleteLatex);
  dom.latexCopyBtn.addEventListener("click", () => {
    const tex = dom.latexSource.value.trim();
    if (!tex) return;
    api.copyText(tex).catch(() => {});
    toast("LaTeX 已复制", { type: "success", duration: 1400 });
  });
  dom.latexSource.addEventListener("input", updateLatexPreview);
  dom.latexSource.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      commitLatex();
    }
  });
  dom.latexModeSwitch.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-latex-display]");
    if (button) setLatexDisplay(button.dataset.latexDisplay);
  });
  dom.latexDialog.addEventListener("close", () => {
    state.latexTarget = null;
    state.latexContext = null;
  });

  dom.mermaidTabs.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-mermaid-tab]");
    if (button) switchMermaidTab(button.dataset.mermaidTab);
  });

  dom.mermaidStructureBar.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-mermaid-op]");
    if (button) runMermaidOp(button.dataset.mermaidOp);
  });

  dom.mermaidNodeShape.addEventListener("change", () => {
    const editor = state.mermaidEditor;
    if (!editor || editor.type !== "mindmap") return;
    const node = selectedMindmapNode();
    if (!node) return;
    node.shape = dom.mermaidNodeShape.value;
    pushMermaidStructure();
    renderMermaidStructure();
  });

  dom.mermaidLayouts.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-mermaid-layout]");
    if (button) setMermaidLayout(button.dataset.mermaidLayout);
  });

  dom.mermaidSource.addEventListener("input", () => {
    const editor = state.mermaidEditor;
    if (!editor) return;
    editor.source = dom.mermaidSource.value;
    editor.baseSource = stripMindmapTheme(editor.source);
    editor.layout = layoutFromMarker(editor.source);
    const type = detectDiagramType(editor.baseSource);
    if (type !== editor.type) {
      editor.type = type;
      switchMermaidTab(canStructureEdit(type) ? "structure" : "source");
    }
    clearTimeout(editor.structureTimer);
    editor.structureTimer = window.setTimeout(renderMermaidStructure, 420);
    scheduleMermaidPreview();
  });

  dom.mermaidSource.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      commitMermaidEditor();
    }
  });

  const applyCustomMermaidColors = () => {
    const editor = state.mermaidEditor;
    if (!editor) return;
    setMermaidTheme({
      mode: "custom",
      primary: dom.mermaidPrimaryColor.value,
      secondary: dom.mermaidSecondaryColor.value
    });
  };
  dom.mermaidPrimaryColor.addEventListener("input", applyCustomMermaidColors);
  dom.mermaidSecondaryColor.addEventListener("input", applyCustomMermaidColors);

  dom.mermaidApplyBtn.addEventListener("click", commitMermaidEditor);
  dom.mermaidDeleteBtn.addEventListener("click", deleteMermaidTarget);
  dom.mermaidCopyBtn.addEventListener("click", () => {
    const source = state.mermaidEditor?.source || "";
    if (!source.trim()) return;
    api.copyText(source).catch(() => {});
    toast("图表源码已复制", { type: "success", duration: 1500 });
  });

  dom.mermaidDialog.addEventListener("close", () => {
    state.mermaidEditor = null;
  });

  dom.mermaidDialog.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      commitMermaidEditor();
    }
  });

  dom.brandUploadBtn.addEventListener("click", () => dom.brandUploadInput.click());
  dom.brandUploadInput.addEventListener("change", async () => {
    const file = dom.brandUploadInput.files?.[0];
    dom.brandUploadInput.value = "";
    if (!file) return;
    try {
      const dataUrl = await imageFileToPngDataUrl(file, 256);
      setSettings({ brandIcon: { type: "image", value: dataUrl } });
      renderBrandIcon();
      scheduleWindowIconUpdate();
      renderStudioStatus("软件图标已更新");
    } catch (error) {
      toast(cleanError(error), { type: "error" });
    }
  });
  dom.resetBrandBtn.addEventListener("click", () => {
    setSettings({ brandIcon: { type: "preset", value: "default" } });
    renderBrandIcon();
    scheduleWindowIconUpdate();
    renderStudioStatus("已恢复默认图标");
  });

  dom.stickerUploadBtn.addEventListener("click", () => dom.stickerUploadInput.click());
  dom.stickerUploadInput.addEventListener("change", async () => {
    const file = dom.stickerUploadInput.files?.[0];
    dom.stickerUploadInput.value = "";
    if (!file) return;
    try {
      const dataUrl = await imageFileToPngDataUrl(file, 180);
      addSticker(dataUrl, "image");
    } catch (error) {
      toast(cleanError(error), { type: "error" });
    }
  });

  dom.fillScriptExample.addEventListener("click", () => {
    dom.customButtonIcon.value = "⏱";
    dom.customButtonLabel.value = "插入时间";
    dom.customButtonScript.value =
      "app.insert('\\n\\n> ' + new Date().toLocaleString('zh-CN'));";
  });
  dom.addCustomButtonBtn.addEventListener("click", addCustomButton);

  dom.showAllUiBtn.addEventListener("click", () => {
    setHiddenUi([]);
    renderStudioStatus("已显示全部界面元素");
  });
  dom.focusUiBtn.addEventListener("click", () => {
    setHiddenUi([
      "sidebar",
      "sidebar-actions",
      "recent",
      "outline",
      "assoc-badge",
      "sidebar-version",
      "format-bar",
      "status-counts",
      "status-cursor",
      "status-meta",
      "welcome-art",
      "welcome-tiles",
      "welcome-hint"
    ]);
    renderStudioStatus("已切换到专注阅读布局");
  });

  dom.fontSizeRange.addEventListener("input", () => {
    const value = Number(dom.fontSizeRange.value);
    dom.fontSizeValue.textContent = `${value} px`;
    setSettings({ fontSize: value });
  });

  dom.lineWrapToggle.addEventListener("change", () => {
    const enabled = dom.lineWrapToggle.checked;
    setSettings({ lineWrap: enabled });
    if (view) {
      view.dispatch({
        effects: wrapCompartment.reconfigure(
          enabled ? EditorView.lineWrapping : []
        )
      });
      const doc = activeDoc();
      if (doc) doc.cmState = view.state;
    }
  });

  dom.syncToggleInput.addEventListener("change", () => {
    setSettings({ syncScroll: dom.syncToggleInput.checked });
    updateSyncUI();
  });

  dom.autoSaveToggle.addEventListener("change", () => {
    setSettings({ autoSave: dom.autoSaveToggle.checked });
    if (dom.autoSaveToggle.checked) scheduleAutosave();
  });

  dom.syncToggle.addEventListener("click", () => {
    setSettings({ syncScroll: !state.settings.syncScroll });
    updateSyncUI();
    if (state.settings.syncScroll && state.viewMode === "split") {
      syncScrollRatio(view.scrollDOM, dom.previewPane);
    }
  });

  dom.viewSwitch.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-mode]");
    if (button) applyViewMode(button.dataset.mode);
  });

  dom.formatBar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-format]");
    if (!button) return;
    applyFormat(button.dataset.format);
  });

  dom.headingSelect.addEventListener("change", () => {
    applyHeading(Number(dom.headingSelect.value));
    if (state.isVisualEditing) dom.preview.focus();
    else view.focus();
  });

  dom.tabs.addEventListener("click", (event) => {
    const close = event.target.closest(".tab-close");
    const tab = event.target.closest(".tab");
    if (close && tab) {
      event.stopPropagation();
      closeDocument(tab.dataset.id);
      return;
    }
    if (tab) activateDoc(tab.dataset.id, { focus: true });
  });

  dom.tabs.addEventListener("auxclick", (event) => {
    if (event.button !== 1) return;
    const tab = event.target.closest(".tab");
    if (tab) {
      event.preventDefault();
      closeDocument(tab.dataset.id);
    }
  });

  dom.recentList.addEventListener("click", (event) => {
    const remove = event.target.closest(".recent-remove");
    if (remove) {
      event.stopPropagation();
      removeRecent(remove.dataset.path);
      return;
    }
    const row = event.target.closest(".recent-item");
    if (row) openPath(row.dataset.path);
  });

  dom.recentList.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const row = event.target.closest(".recent-item");
    if (row) openPath(row.dataset.path);
  });

  dom.outlineList.addEventListener("click", (event) => {
    const toggle = event.target.closest(".outline-toggle");
    if (toggle) {
      event.preventDefault();
      event.stopPropagation();
      toggleOutlineHeading(toggle.dataset.headingId);
      return;
    }
    const item = event.target.closest(".outline-item");
    if (!item) return;
    const heading = state.headings.find((entry) => entry.id === item.dataset.id);
    if (heading) jumpToHeading(heading);
  });

  dom.outlineList.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest(".outline-toggle")) return;
    const item = event.target.closest(".outline-item");
    if (!item) return;
    event.preventDefault();
    const heading = state.headings.find((entry) => entry.id === item.dataset.id);
    if (heading) jumpToHeading(heading);
  });

  dom.preview.addEventListener("click", handlePreviewClick);
  dom.customHome.addEventListener("click", handleHomeClick);
  dom.preview.addEventListener("dblclick", (event) => {
    const mathNode = event.target.closest(".math-block, .math-inline");
    if (mathNode && dom.preview.contains(mathNode)) {
      event.preventDefault();
      openLatexForMathNode(mathNode);
      return;
    }
    const mermaidFigure = event.target.closest(".mermaid-figure");
    if (!mermaidFigure || mermaidFigure.querySelector(".mermaid-source")?.contains(event.target)) {
      return;
    }
    event.preventDefault();
    openMermaidForFigure(mermaidFigure);
  });
  dom.preview.addEventListener("input", () => {
    if (!state.isVisualEditing) return;
    state.visualDirty = true;
    updateSaveState();
    scheduleVisualSync();
    updateVisualHeadingSelect();
  });
  dom.preview.addEventListener("keyup", () => {
    if (state.isVisualEditing) updateVisualHeadingSelect();
  });
  dom.preview.addEventListener("mouseup", () => {
    if (state.isVisualEditing) updateVisualHeadingSelect();
  });
  dom.preview.addEventListener(
    "error",
    (event) => {
      if (event.target instanceof HTMLImageElement) {
        event.target.classList.add("image-error");
        event.target.title = "图片无法加载";
      }
    },
    true
  );

  $("#moreBtn").addEventListener("click", (event) => {
    event.stopPropagation();
    if (dom.moreMenu.hidden) openMoreMenu();
    else hideMoreMenu();
  });

  dom.insertBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (dom.insertMenu.hidden) openInsertMenu();
    else hideInsertMenu();
  });

  dom.insertMenu.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-insert-action]");
    if (button) runInsertAction(button.dataset.insertAction);
  });

  dom.inputForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = dom.inputField.value;
    const resolve = state.inputResolve;
    state.inputResolve = null;
    dom.inputDialog.close();
    resolve?.(value);
  });
  dom.inputDialog.addEventListener("close", () => {
    if (state.inputResolve) {
      const resolve = state.inputResolve;
      state.inputResolve = null;
      resolve(null);
    }
  });

  dom.moreMenu.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (button) runMoreAction(button.dataset.action);
  });

  dom.appMenuBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (dom.appMenu.hidden) openAppMenu();
    else hideAppMenu();
  });

  dom.appMenu.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-app-action]");
    if (button) runAppAction(button.dataset.appAction);
  });

  dom.formatMoreBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (dom.formatMenu.hidden) openFormatMenu();
    else hideFormatMenu();
  });

  dom.pluginMenuBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!dom.pluginMenu.hidden && dom.pluginMenu.dataset.menuKey === "all") hidePluginMenu();
    else openPluginMenu(pluginActions(), dom.pluginMenuBtn, "all");
  });

  dom.formatMenu.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-format-menu]");
    if (button) runFormatMenuAction(button.dataset.formatMenu);
  });

  dom.colorTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    if (dom.colorPopover.hidden) openColorPopover();
    else closeColorPopover();
  });

  $("#colorCloseBtn").addEventListener("click", closeColorPopover);
  $("#colorTabs").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-target]");
    if (!button) return;
    state.colorTarget = button.dataset.target;
    for (const tab of $("#colorTabs").querySelectorAll("button")) {
      tab.classList.toggle("active", tab === button);
    }
  });

  dom.colorInput.addEventListener("input", () => setPickerColor(dom.colorInput.value));
  dom.colorHex.addEventListener("input", () => {
    if (colorValue(dom.colorHex.value)) setPickerColor(dom.colorHex.value);
  });
  dom.colorHex.addEventListener("blur", () => setPickerColor(state.color));
  $("#eyedropperBtn").addEventListener("click", pickScreenColor);
  $("#colorApplyBtn").addEventListener("click", applyPickedColor);

  document.addEventListener("pointerdown", (event) => {
    if (!dom.moreMenu.hidden) {
      if (!dom.moreMenu.contains(event.target) && !$("#moreBtn").contains(event.target)) {
        hideMoreMenu();
      }
    }
    if (!dom.insertMenu.hidden) {
      if (!dom.insertMenu.contains(event.target) && !dom.insertBtn.contains(event.target)) {
        hideInsertMenu();
      }
    }
    if (!dom.appMenu.hidden) {
      if (!dom.appMenu.contains(event.target) && !dom.appMenuBtn.contains(event.target)) {
        hideAppMenu();
      }
    }
    if (!dom.formatMenu.hidden) {
      if (
        !dom.formatMenu.contains(event.target) &&
        !dom.formatMoreBtn.contains(event.target)
      ) {
        hideFormatMenu();
      }
    }
    if (!dom.colorPopover.hidden) {
      if (
        !dom.colorPopover.contains(event.target) &&
        !dom.colorTrigger.contains(event.target)
      ) {
        closeColorPopover();
      }
    }
    if (dom.noteMenu && !dom.noteMenu.hidden && !dom.noteMenu.contains(event.target)) {
      hideNoteMenu();
    }
    if (!dom.pluginMenu.hidden) {
      if (
        !dom.pluginMenu.contains(event.target) &&
        !dom.pluginMenuBtn?.contains(event.target) &&
        !dom.formatPlugins?.contains(event.target)
      ) {
        hidePluginMenu();
      }
    }
  });

  for (const close of document.querySelectorAll("[data-close]")) {
    close.addEventListener("click", () => {
      const dialog = document.getElementById(close.dataset.close);
      if (dialog) dialog.close();
    });
  }

  $("#settingsRegisterBtn").addEventListener("click", registerAssociations);
  $("#settingsDefaultBtn").addEventListener("click", openDefaultAppsSettings);
  dom.assocRegisterBtn.addEventListener("click", registerAssociations);
  dom.assocDefaultBtn.addEventListener("click", openDefaultAppsSettings);
  dom.assocUnregisterBtn.addEventListener("click", unregisterAssociations);
  $("#openUserDataBtn").addEventListener("click", () => {
    if (state.appInfo?.userData) api.openPath(state.appInfo.userData);
  });

  dom.installPluginBtn?.addEventListener("click", installPluginFromZip);
  dom.pluginElementInsertBtn?.addEventListener("click", commitPluginElementDialog);
  dom.pluginElementDialog?.addEventListener("close", () => { state.pluginElementDraft = null; });
  dom.pluginElementDialog?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.isComposing) return;
    if (event.target instanceof HTMLTextAreaElement) return;
    event.preventDefault();
    commitPluginElementDialog();
  });
  dom.pluginSearch?.addEventListener("input", () => {
    state.pluginQuery = dom.pluginSearch.value;
    renderPluginList();
  });
  dom.pluginFilter?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter]");
    if (button) setPluginFilter(button.dataset.filter);
  });
  syncPluginFilterButtons();
  dom.openPluginsFolderBtn?.addEventListener("click", openPluginsFolder);
  if (!api.plugins) {
    dom.installPluginBtn?.remove();
    dom.openPluginsFolderBtn?.remove();
    dom.reloadPluginsBtn?.remove();
    dom.pluginToolbar?.remove();
    dom.pluginSummary?.remove();
  } else if (api.platform === "android") {
    // Plugins live in the app-private directory; there is no folder to open.
    dom.openPluginsFolderBtn?.remove();
  }
  dom.reloadPluginsBtn?.addEventListener("click", async () => { await refreshPlugins({ reload: true }); toast("插件列表已刷新", { type: "success", duration: 1200 }); });
  dom.settingsDialog.addEventListener("click", (event) => {
    if (event.target === dom.settingsDialog) dom.settingsDialog.close();
  });
  dom.assocDialog.addEventListener("click", (event) => {
    if (event.target === dom.assocDialog) dom.assocDialog.close();
  });

  $("#splitter").addEventListener("pointerdown", startSplitterDrag);
  $("#splitter").addEventListener("dblclick", () => {
    dom.editorPane.style.width = "";
    dom.editorPane.style.flexBasis = "";
  });

  window.addEventListener("keydown", handleKeydown);
  window.addEventListener(
    "pointermove",
    (event) => {
      state.lastPointer = { x: event.clientX, y: event.clientY };
    },
    { passive: true }
  );
  bindDragAndDrop();
}

function handleKeydown(event) {
  const mod = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  const dialogOpen = Boolean(document.querySelector("dialog[open]"));

  if (event.key === "Escape") {
    if (!dom.moreMenu.hidden) hideMoreMenu();
    if (!dom.insertMenu.hidden) hideInsertMenu();
    if (!dom.appMenu.hidden) hideAppMenu();
    if (!dom.formatMenu.hidden) hideFormatMenu();
    if (!dom.colorPopover.hidden) closeColorPopover();
    if (dom.noteMenu && !dom.noteMenu.hidden) hideNoteMenu();
    if (!dom.pluginMenu.hidden) hidePluginMenu();
    return;
  }

  if (!mod || event.altKey) return;
  if (dialogOpen) return;

  if (key === "s") {
    event.preventDefault();
    saveActive({ saveAs: event.shiftKey });
    return;
  }
  if (key === "o") {
    event.preventDefault();
    openDialog();
    return;
  }
  if (key === "n") {
    event.preventDefault();
    newDocument();
    return;
  }
  if (key === "w" && !event.shiftKey) {
    event.preventDefault();
    if (activeDoc()) closeDocument(state.activeId);
    return;
  }
  if (key === "b" && event.shiftKey) {
    event.preventDefault();
    toggleSidebar();
    return;
  }
  if (key === "h" && event.shiftKey) {
    event.preventDefault();
    toggleHomePage();
    return;
  }
  if (key === "m" && event.shiftKey) {
    event.preventDefault();
    if (activeDoc()) openLatexForInsert(false);
    return;
  }
  if (key === "p") {
    event.preventDefault();
    exportPdf();
    return;
  }
  if (key === "," || key === "<") {
    event.preventDefault();
    if (event.shiftKey) openStudio("elements");
    else openSettings();
    return;
  }
  if (key === "=" || key === "+") {
    event.preventDefault();
    adjustFontSize(1);
    return;
  }
  if (key === "-") {
    event.preventDefault();
    adjustFontSize(-1);
    return;
  }
  if (!dialogOpen) {
    if (state.viewMode === "read") return;
    if (key === "b") {
      event.preventDefault();
      applyFormat("bold");
      return;
    }
    if (key === "i") {
      event.preventDefault();
      applyFormat("italic");
      return;
    }
    if (key === "k") {
      event.preventDefault();
      applyFormat("link");
      return;
    }
    if (key === "`") {
      event.preventDefault();
      applyFormat("inlineCode");
      return;
    }
    if (key === "1" || key === "2" || key === "3" || key === "4") {
      event.preventDefault();
      applyViewMode(
        key === "1" ? "read" : key === "2" ? "split" : key === "3" ? "edit" : "visual"
      );
    }
  }
}

function startSplitterDrag(event) {
  event.preventDefault();
  const splitter = dom.splitter;
  const panes = dom.panes;
  splitter.classList.add("dragging");
  splitter.setPointerCapture(event.pointerId);
  const width = panes.getBoundingClientRect().width;

  const move = (moveEvent) => {
    const left = Math.max(280, Math.min(width - 280, moveEvent.clientX - panes.getBoundingClientRect().left));
    dom.editorPane.style.width = `${left}px`;
    dom.editorPane.style.flexBasis = `${left}px`;
  };
  const up = () => {
    splitter.classList.remove("dragging");
    splitter.removeEventListener("pointermove", move);
    splitter.removeEventListener("pointerup", up);
    splitter.removeEventListener("pointercancel", up);
  };
  splitter.addEventListener("pointermove", move);
  splitter.addEventListener("pointerup", up);
  splitter.addEventListener("pointercancel", up);
}

function bindDragAndDrop() {
  let depth = 0;
  const hasFiles = (event) =>
    Array.from(event.dataTransfer?.types || []).includes("Files");

  window.addEventListener("dragenter", (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    depth += 1;
    dom.dragOverlay.hidden = false;
  });
  window.addEventListener("dragover", (event) => {
    if (hasFiles(event)) event.preventDefault();
  });
  window.addEventListener("dragleave", () => {
    depth = Math.max(0, depth - 1);
    if (depth === 0) dom.dragOverlay.hidden = true;
  });
  window.addEventListener("drop", async (event) => {
    event.preventDefault();
    depth = 0;
    dom.dragOverlay.hidden = true;
    const files = Array.from(event.dataTransfer?.files || []);
    const paths = files
      .map((file) => api.getPathForFile(file))
      .filter(Boolean);
    if (!paths.length) {
      toast("无法读取拖入的文件路径", { type: "error" });
      return;
    }
    for (const filePath of paths) {
      const lower = filePath.toLowerCase();
      if (lower.endsWith(".zip") || lower.endsWith(".moread-theme") || lower.endsWith(".json")) {
        await importThemePack(filePath);
      } else if (lower.endsWith(".css")) {
        await importCssFile(filePath);
      } else {
        await openPath(filePath);
      }
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function samePath(left, right) {
  if (!left || !right) return false;
  return String(left).toLowerCase() === String(right).toLowerCase();
}

function cleanError(error) {
  const message = error?.message || String(error || "未知错误");
  return message.replace(/^Error invoking remote method '[^']+':\s*/i, "").replace(/^Error:\s*/i, "");
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);
}

boot();

