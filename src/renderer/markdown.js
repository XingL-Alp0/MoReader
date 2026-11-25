import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import footnote from "markdown-it-footnote";
import DOMPurify from "dompurify";
import katex from "katex";
import hljs from "highlight.js/lib/core";

import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import powershell from "highlight.js/lib/languages/powershell";
import python from "highlight.js/lib/languages/python";
import markdownLang from "highlight.js/lib/languages/markdown";
import yaml from "highlight.js/lib/languages/yaml";
import sql from "highlight.js/lib/languages/sql";
import java from "highlight.js/lib/languages/java";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import diff from "highlight.js/lib/languages/diff";
import ini from "highlight.js/lib/languages/ini";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import lua from "highlight.js/lib/languages/lua";
import php from "highlight.js/lib/languages/php";
import ruby from "highlight.js/lib/languages/ruby";
import swift from "highlight.js/lib/languages/swift";
import kotlin from "highlight.js/lib/languages/kotlin";
import plaintext from "highlight.js/lib/languages/plaintext";

const languages = {
  javascript,
  typescript,
  xml,
  css,
  json,
  bash,
  powershell,
  python,
  markdown: markdownLang,
  yaml,
  sql,
  java,
  go,
  rust,
  c,
  cpp,
  csharp,
  diff,
  ini,
  dockerfile,
  lua,
  php,
  ruby,
  swift,
  kotlin,
  plaintext
};
for (const [name, definition] of Object.entries(languages)) {
  hljs.registerLanguage(name, definition);
}
hljs.registerAliases(["js", "jsx", "mjs", "cjs"], { languageName: "javascript" });
hljs.registerAliases(["ts", "tsx"], { languageName: "typescript" });
hljs.registerAliases(["html", "xhtml", "vue", "svg"], { languageName: "xml" });
hljs.registerAliases(["sh", "shell", "zsh", "console"], { languageName: "bash" });
hljs.registerAliases(["ps1", "pwsh"], { languageName: "powershell" });
hljs.registerAliases(["py"], { languageName: "python" });
hljs.registerAliases(["md"], { languageName: "markdown" });
hljs.registerAliases(["yml"], { languageName: "yaml" });
hljs.registerAliases(["cs", "c#"], { languageName: "csharp" });
hljs.registerAliases(["c++", "cc", "h"], { languageName: "cpp" });
hljs.registerAliases(["text", "txt"], { languageName: "plaintext" });

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* -------------------------------------------------------------------------- */
/* Math                                                                        */
/* -------------------------------------------------------------------------- */

function renderMath(content, displayMode) {
  try {
    return katex.renderToString(content, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      trust: false,
      output: "htmlAndMathml",
      maxSize: 60,
      maxExpand: 1000
    });
  } catch {
    return `<span class="math-error">${escapeHtml(content)}</span>`;
  }
}

function mathInline(state, silent) {
  const start = state.pos;
  const src = state.src;
  if (src[start] !== "$" && !(src[start] === "\\" && (src[start + 1] === "(" || src[start + 1] === "["))) {
    return false;
  }

  let openLen = 1;
  let closeToken = "$";
  if (src[start] === "\\") {
    closeToken = src[start + 1] === "(" ? "\\)" : "\\]";
    openLen = 2;
  } else if (src[start + 1] === "$") {
    return false;
  }

  if (src[start] === "$" && src[start + 1] === "$") return false;
  const first = src[start + openLen];
  if (!first || /\s/.test(first)) return false;

  let pos = start + openLen;
  let closed = false;
  while (pos < state.posMax) {
    if (src[pos] === "\\") {
      if (src.startsWith(closeToken, pos)) {
        closed = true;
        break;
      }
      pos += 2;
      continue;
    }
    if (closeToken === "$" && src[pos] === "$") {
      closed = true;
      break;
    }
    if (closeToken === "\\)" && src.startsWith("\\)", pos)) {
      closed = true;
      break;
    }
    if (src[pos] === "\n") return false;
    pos += 1;
  }
  if (!closed) return false;
  if (pos === start + openLen) return false;
  const content = src.slice(start + openLen, pos);
  if (!content.trim()) return false;
  if (closeToken === "$" && /\s/.test(src[pos - 1])) return false;

  if (!silent) {
    const token = state.push("math_inline", "math", 0);
    token.content = content.trim();
    token.markup = closeToken;
  }
  state.pos = pos + closeToken.length;
  return true;
}

function mathBlock(state, startLine, endLine, silent) {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  const line = state.src.slice(start, max);

  let open = "";
  let close = "";
  if (line.startsWith("$$")) {
    open = "$$";
    close = "$$";
  } else if (line.startsWith("\\[")) {
    open = "\\[";
    close = "\\]";
  } else {
    return false;
  }

  const afterOpen = line.slice(open.length);
  let content = "";
  let nextLine = startLine + 1;

  if (afterOpen.trim().endsWith(close) && afterOpen.trim().length > close.length - 1) {
    content = afterOpen.trim().slice(0, -close.length);
  } else {
    const buffer = [afterOpen];
    let found = false;
    for (let current = startLine + 1; current < endLine; current += 1) {
      const lineStart = state.bMarks[current] + state.tShift[current];
      const lineEnd = state.eMarks[current];
      const text = state.src.slice(lineStart, lineEnd);
      if (text.trim() === close) {
        nextLine = current + 1;
        found = true;
        break;
      }
      buffer.push(text);
    }
    if (!found) return false;
    content = buffer.join("\n");
  }

  if (!content.trim()) return false;
  if (silent) return true;

  const token = state.push("math_block", "math", 0);
  token.block = true;
  token.content = content.trim();
  token.map = [startLine, nextLine];
  state.line = nextLine;
  return true;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

export function slugify(text) {
  const plain = String(text)
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_~[\](){}<>#!|]/g, "")
    .trim()
    .toLowerCase();
  const slug = plain
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

export function uniqueSlug(text, env) {
  env = env || {};
  if (!env._slugCounts) env._slugCounts = new Map();
  const base = slugify(text);
  const count = env._slugCounts.get(base) || 0;
  env._slugCounts.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

export function extractHeadings(markdown) {
  const lines = String(markdown || "").split("\n");
  const headings = [];
  const counts = new Map();
  let fence = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!fence) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence) continue;

    const setext = line.match(/^\s{0,3}(=+|-{3,})\s*$/);
    if (setext && index > 0) {
      const previous = lines[index - 1];
      const trimmed = previous.trim();
      if (trimmed && !/^#{1,6}\s/.test(trimmed) && !/^\s{0,3}(`{3,}|~{3,})/.test(trimmed) && !/^(?:\s*[-*+]\s|\s*\d+\.\s|>)/.test(trimmed)) {
        const text = trimmed.replace(/[*_`~]/g, "").trim();
        if (text) {
          const base = slugify(text);
          const count = counts.get(base) || 0;
          counts.set(base, count + 1);
          headings.push({
            level: setext[1][0] === "=" ? 1 : 2,
            text,
            line: index - 1,
            id: count === 0 ? base : `${base}-${count}`
          });
        }
        continue;
      }
    }

    const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;
    const text = match[2].replace(/[*_`~]/g, "").trim();
    if (!text) continue;
    const base = slugify(text);
    const count = counts.get(base) || 0;
    counts.set(base, count + 1);
    headings.push({
      level: match[1].length,
      text,
      line: index,
      id: count === 0 ? base : `${base}-${count}`
    });
  }
  return headings;
}

function normalizePath(input) {
  const isWindows = /^[A-Za-z]:/.test(input) || input.includes("\\");
  const separator = isWindows ? "\\" : "/";
  const driveMatch = input.match(/^([A-Za-z]:)(.*)$/);
  const drive = driveMatch ? driveMatch[1] : "";
  let rest = driveMatch ? driveMatch[2] : input;
  rest = rest.replace(/[\\/]+/g, separator);
  const absolute = rest.startsWith(separator);
  const segments = rest.split(separator);
  const output = [];
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (output.length && output[output.length - 1] !== "..") output.pop();
      else if (!absolute) output.push("..");
    } else {
      output.push(segment);
    }
  }
  return `${drive}${absolute ? separator : ""}${output.join(separator)}`;
}

export function resolveLocalPath(source, documentPath) {
  if (!source) return "";
  if (/^(?:https?|mailto|tel|data|blob|file):/i.test(source)) return source;
  if (source.startsWith("//") || source.startsWith("#")) return source;
  if (!documentPath) return source;

  const base = documentPath.replace(/[\\/][^\\/]*$/, "");
  let decoded = source;
  try {
    decoded = decodeURI(source);
  } catch {
    // Keep the original if it contains a stray percent sign.
  }
  decoded = decoded.split("#")[0].split("?")[0];

  let full;
  if (/^[A-Za-z]:[\\/]/.test(decoded)) {
    full = normalizePath(decoded);
  } else if (decoded.startsWith("/")) {
    const drive = (base.match(/^[A-Za-z]:/) || [""])[0];
    full = normalizePath(`${drive}${decoded}`);
  } else {
    full = normalizePath(`${base}\\${decoded}`);
  }

  if (full.startsWith("\\\\")) return `file:${full.replace(/\\/g, "/")}`;
  return `file:///${full.replace(/\\/g, "/")}`;
}

export function fileUrlToLocalPath(url) {
  if (!url) return "";
  if (!url.startsWith("file://")) return "";
  let value = url.slice("file:///".length);
  try {
    value = decodeURI(value);
  } catch {
    // Keep the raw value.
  }
  return value.replace(/\//g, "\\");
}

const markdownElementRegistry = new Map();
let markdownElementId = 0;

/**
 * Register a custom inline markdown element. Elements use the syntax
 * `[name attr=value other="quoted value"]`. The renderer receives an attrs
 * object and a context containing the current document path, and may return
 * HTML (or plain text). Returned HTML is sanitized before insertion.
 */
export function registerMarkdownElement(name, renderer) {
  const key = String(name || "").trim().toLowerCase();
  if (!/^[a-z][\w:-]*$/i.test(key)) throw new TypeError("Invalid markdown element name");
  if (typeof renderer !== "function") throw new TypeError("Markdown element renderer must be a function");
  markdownElementRegistry.set(key, renderer);
  return () => markdownElementRegistry.delete(key);
}

export function unregisterMarkdownElement(name) {
  return markdownElementRegistry.delete(String(name || "").trim().toLowerCase());
}

export function clearMarkdownElements() {
  markdownElementRegistry.clear();
}

function parseMarkdownElement(source) {
  const match = String(source).match(/^\[([a-z][\w:-]*)([\s\S]*?)\]$/i);
  if (!match) return null;
  const name = match[1].toLowerCase();
  if (!markdownElementRegistry.has(name)) return null;
  const attrs = {};
  const input = match[2] || "";
  const pattern = /([a-z][\w:-]*)(?:\s*=\s*(?:"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'|([^\s]+)))?/gi;
  let cursor = 0;
  let item;
  while ((item = pattern.exec(input))) {
    if (input.slice(cursor, item.index).trim()) return null;
    const raw = item[2] ?? item[3] ?? item[4];
    attrs[item[1]] = raw == null ? true : raw.replace(/\\([\\"'])/g, "$1");
    cursor = pattern.lastIndex;
  }
  if (input.slice(cursor).trim()) return null;
  return { name, attrs };
}

function markdownElementInline(state, silent) {
  const start = state.pos;
  if (state.src[start] !== "[") return false;
  const end = state.src.indexOf("]", start + 2);
  if (end < 0) return false;
  const parsed = parseMarkdownElement(state.src.slice(start, end + 1));
  if (!parsed) return false;
  if (!silent) {
    const token = state.push("markdown_element", "span", 0);
    token.meta = parsed;
  }
  state.pos = end + 1;
  return true;
}

/* -------------------------------------------------------------------------- */
/* Markdown-it                                                                 */
/* -------------------------------------------------------------------------- */

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
  highlight: null
});

md.use(taskLists, { enabled: false, label: false });
md.use(footnote);

// Theme packs ship images as local files, so markdown must accept file: URLs.
const defaultValidateLink = md.validateLink.bind(md);
md.validateLink = (url) => {
  const value = String(url || "")
    .trim()
    .toLowerCase();
  if (value.startsWith("file:")) return true;
  return defaultValidateLink(url);
};

md.inline.ruler.before("escape", "markdown_element", markdownElementInline);

md.renderer.rules.markdown_element = (tokens, index, options, env) => {
  const token = tokens[index];
  const { name, attrs } = token.meta || {};
  const id = `mdel-${++markdownElementId}`;
  const payload = encodeURIComponent(JSON.stringify({ name, attrs }));
  return `<span class="markdown-element-placeholder" data-md-element="${id}" data-md-element-payload="${payload}"></span>`;
};


md.block.ruler.before("fence", "math_block", mathBlock, {
  alt: ["paragraph", "reference", "blockquote", "list"]
});

md.renderer.rules.math_inline = (tokens, index) => {
  const token = tokens[index];
  return `<span class="math-inline" data-tex="${escapeHtml(token.content)}">${renderMath(
    token.content,
    false
  )}</span>`;
};
md.renderer.rules.math_block = (tokens, index) => {
  const token = tokens[index];
  return `<div class="math-block" data-tex="${escapeHtml(token.content)}">${renderMath(
    token.content,
    true
  )}</div>`;
};

/**
 * Mermaid blocks stay as placeholder markup during Markdown rendering; the
 * actual diagram is drawn later by app.js once the (lazy loaded) mermaid
 * bundle is available. Source is kept in `data-mermaid-src` so visual editing
 * can serialize it back to a fenced block without touching the SVG.
 */
export function mermaidBlockHtml(source, line = null) {
  const encoded = encodeURIComponent(source);
  const lineAttr = Number.isFinite(line) ? ` data-source-line="${line}"` : "";
  return `<div class="mermaid-figure"${lineAttr} data-mermaid-src="${encoded}" data-mermaid-state="pending"><div class="mermaid-head"><span class="mermaid-tag">MERMAID</span><span class="mermaid-actions"><button class="mermaid-edit" type="button" title="在图表编辑器中打开">编辑</button><button class="mermaid-toggle" type="button">源码</button><button class="mermaid-copy" type="button">复制</button></span></div><div class="mermaid-canvas"><div class="mermaid-loading">图表渲染中…</div></div><pre class="mermaid-source" hidden><code>${escapeHtml(
    source
  )}</code></pre></div>`;
}

md.renderer.rules.fence = (tokens, index) => {
  const token = tokens[index];
  const info = token.info ? token.info.trim() : "";
  const language = (info.split(/\s+/)[0] || "").replace(/[^\w+#.-]/g, "");

  if (/^(mermaid|mmd)$/i.test(language)) {
    return mermaidBlockHtml(token.content, token.map ? token.map[0] : null);
  }

  const hasLanguage = Boolean(language && hljs.getLanguage(language));
  const previewable = /^(html|htm)$/i.test(language);
  let highlighted;
  try {
    highlighted = hasLanguage
      ? hljs.highlight(token.content, { language, ignoreIllegals: true }).value
      : escapeHtml(token.content);
  } catch {
    highlighted = escapeHtml(token.content);
  }
  const label = language ? language.toUpperCase() : "TEXT";
  const languageClass = language ? ` language-${escapeHtml(language)}` : "";
  const actions = `${previewable ? '<button class="code-preview-toggle" type="button">预览</button>' : ""}<button class="code-copy" type="button">复制</button>`;
  return `<div class="code-block"${previewable ? ' data-previewable="true"' : ""}><div class="code-head"><span class="code-lang">${escapeHtml(
    label
  )}</span><span class="code-actions">${actions}</span></div><pre><code class="hljs${languageClass}">${highlighted}</code></pre>${previewable ? '<div class="html-preview" hidden></div>' : ""}</div>`;
};

md.renderer.rules.heading_open = (tokens, index, options, env) => {
  const token = tokens[index];
  const inline = tokens[index + 1];
  const text = inline && inline.type === "inline" ? inline.content : "";
  const id = uniqueSlug(text, env);
  token.attrSet("id", id);
  if (token.map) token.attrSet("data-source-line", String(token.map[0]));
  return md.renderer.renderToken(tokens, index, options);
};

md.renderer.rules.table_open = (tokens, index, options, env, self) => {
  const token = tokens[index];
  if (token.map) token.attrSet("data-source-line", String(token.map[0]));
  return self.renderToken(tokens, index, options);
};

md.renderer.rules.image = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const source = token.attrGet("src") || "";
  token.attrSet("data-md-src", source);
  token.attrSet("src", resolveLocalPath(source, env && env.documentPath));
  token.attrSet("loading", "lazy");
  return self.renderToken(tokens, index, options);
};

const defaultLinkOpen = md.renderer.rules.link_open;
md.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const href = token.attrGet("href") || "";
  if (/^https?:/i.test(href)) {
    token.attrSet("rel", "noopener noreferrer");
    token.attrSet("data-external", "true");
  }
  if (defaultLinkOpen) return defaultLinkOpen(tokens, index, options, env, self);
  return self.renderToken(tokens, index, options);
};

const sanitizeOptions = {
  USE_PROFILES: { html: true, mathMl: true, svg: true },
  ADD_ATTR: [
    "target",
    "data-source-line",
    "data-external",
    "aria-describedby",
    "aria-hidden",
    "loading"
  ],
  FORBID_TAGS: ["style", "iframe", "object", "embed", "form", "textarea", "select", "meta", "link", "base"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "formaction"],
  ALLOWED_URI_REGEXP:
    /^(?:(?:https?|mailto|tel|file):|data:image\/|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i
};

function resolveMarkdownElementPlaceholders(html, env) {
  if (typeof DOMParser === "undefined" || typeof document === "undefined") return html;
  const parsed = new DOMParser().parseFromString(html, "text/html");
  for (const placeholder of Array.from(parsed.querySelectorAll(".markdown-element-placeholder[data-md-element-payload]"))) {
    let payload;
    try {
      payload = JSON.parse(decodeURIComponent(placeholder.getAttribute("data-md-element-payload") || ""));
    } catch {
      continue;
    }
    const renderer = markdownElementRegistry.get(String(payload?.name || "").toLowerCase());
    if (!renderer) continue;
    let rendered = "";
    try {
      rendered = renderer(payload.attrs || {}, env) ?? "";
    } catch {
      rendered = "";
    }
    const raw = String(rendered);
    const styleBlocks = [];
    const withoutStyles = raw.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_match, css) => {
      styleBlocks.push(css);
      return "";
    });
    const safe = DOMPurify.sanitize(withoutStyles, sanitizeOptions);
    const container = document.createElement("template");
    // DOMPurify removes <style> contents; plugin CSS is local trusted code, so
    // keep it outside the sanitized fragment and let it style the element.
    container.innerHTML = styleBlocks.map((css) => `<style>${css}</style>`).join("") + safe;
    placeholder.replaceWith(container.content.cloneNode(true));
  }
  return parsed.body.innerHTML;
}

export function renderMarkdown(markdown, documentPath) {
  const env = { documentPath: documentPath || "" };
  const html = md.render(String(markdown || ""), env);
  const clean = DOMPurify.sanitize(html, sanitizeOptions);
  return resolveMarkdownElementPlaceholders(clean, env);
}

export function mathHtml(content, display = false) {
  const tex = escapeHtml(content);
  if (display) {
    return `<div class="math-block" data-tex="${tex}">${renderMath(content, true)}</div>`;
  }
  return `<span class="math-inline" data-tex="${tex}">${renderMath(content, false)}</span>`;
}

export function mathPreviewHtml(content, display = false) {
  return renderMath(content, display);
}

export function checkMath(content) {
  try {
    renderMathStrict(content);
    return null;
  } catch (error) {
    return String(error?.message || error || "未知错误")
      .replace(/^KaTeX parse error:\s*/i, "")
      .replace(/\s+at position \d+.*$/i, "");
  }
}

function renderMathStrict(content) {
  return katex.renderToString(content, {
    displayMode: false,
    throwOnError: true,
    strict: "ignore",
    trust: false,
    output: "htmlAndMathml",
    maxSize: 60,
    maxExpand: 1000
  });
}

export function prepareHtmlPreview(code) {
  const parsed = new DOMParser().parseFromString(String(code || ""), "text/html");
  const styles = Array.from(parsed.querySelectorAll("style"))
    .map((node) => node.textContent || "")
    .join("\n");
  const body = parsed.body ? parsed.body.innerHTML : String(code || "");
  const cleanBody = DOMPurify.sanitize(body, {
    USE_PROFILES: { html: true, svg: true },
    FORBID_TAGS: [
      "script",
      "iframe",
      "object",
      "embed",
      "form",
      "textarea",
      "select",
      "meta",
      "link",
      "base"
    ],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "formaction"],
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto|tel|file):|data:image\/|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i
  });
  const safeStyles = styles
    .replace(/@import[\s\S]*?;/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/expression\s*\(/gi, "");
  return { body: cleanBody, styles: safeStyles };
}

/* -------------------------------------------------------------------------- */
/* Counting                                                                    */
/* -------------------------------------------------------------------------- */

export function countText(markdown) {
  const source = String(markdown || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_~|=-]/g, " ");
  const cjk = (source.match(/[\u3400-\u9fff\uf900-\ufaff]/g) || []).length;
  const latin = (source.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length;
  const words = cjk + latin;
  const chars = Array.from(String(markdown || "")).length;
  const readingMinutes = Math.max(1, Math.ceil((cjk + latin * 1.6) / 400));
  return { words, chars, readingMinutes };
}

export function colorValue(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  if (/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text)) return text;
  if (/^(?:rgb|rgba|hsl|hsla)\([^)]*\)$/i.test(text)) {
    try {
      if (window.CSS && CSS.supports("color", text)) return text;
    } catch {
      return null;
    }
  }
  return null;
}

export { md as markdownIt };
