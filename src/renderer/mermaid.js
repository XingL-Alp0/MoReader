/* Mermaid structure helpers: templates plus a small, deliberately conservative
   parser/serializer for mindmap and flowchart diagrams.

   Only a well-understood subset is "structure editable"; anything else falls
   back to source editing so a diagram can never be silently mangled. */

export const MERMAID_TEMPLATES = [
  {
    id: "mindmap",
    name: "思维导图",
    source: `mindmap
  root((中心主题))
    分支一
      要点
      要点
    分支二
      要点
      要点`
  },
  {
    id: "flowchart",
    name: "流程图",
    source: `flowchart LR
  A[开始] --> B{判断}
  B -->|是| C[执行]
  B -->|否| D[结束]
  C --> D`
  },
  {
    id: "sequence",
    name: "时序图",
    source: `sequenceDiagram
  participant U as 用户
  participant S as 系统
  U->>S: 发起请求
  S-->>U: 返回结果`
  },
  {
    id: "class",
    name: "类图",
    source: `classDiagram
  class Document {
    +String name
    +save()
  }
  Document <|-- MarkdownDocument`
  },
  {
    id: "state",
    name: "状态图",
    source: `stateDiagram-v2
  [*] --> 编辑
  编辑 --> 预览: 切换
  预览 --> [*]`
  },
  {
    id: "gantt",
    name: "甘特图",
    source: `gantt
  title 写作计划
  dateFormat YYYY-MM-DD
  section 初稿
  整理大纲 :a1, 2026-01-01, 3d
  撰写正文 :a2, after a1, 5d`
  },
  {
    id: "pie",
    name: "饼图",
    source: `pie title 时间分配
  "写作" : 45
  "阅读" : 30
  "整理" : 25`
  }
];

const MINDMAP_SHAPES = {
  "((": { open: "((", close: "))", name: "circle" },
  "[": { open: "[", close: "]", name: "square" },
  "(": { open: "(", close: ")", name: "rounded" },
  "{{": { open: "{{", close: "}}", name: "hexagon" },
  "))": { open: "))", close: "((", name: "bang" },
  ")": { open: ")", close: "(", name: "cloud" },
  ">": { open: ">", close: "]", name: "asymmetric" }
};

/* -------------------------------------------------------------------------- */
/* Mindmap colour themes                                                       */
/* -------------------------------------------------------------------------- */

/* Diagram colours come from the app theme (component colours "图表主色/辅色").
   Only an explicit per-diagram override is stored in the source; the old
   `theme=<preset>` markers stay readable so existing documents keep working. */

export const LEGACY_THEME_COLORS = {
  cinnabar: { primary: "#c4562d", secondary: "#b4873b" },
  moss: { primary: "#4d7c5f", secondary: "#7d9a5b" },
  indigo: { primary: "#426b93", secondary: "#6b8fb5" },
  rouge: { primary: "#9b5f74", secondary: "#c08a9b" },
  soot: { primary: "#4a5551", secondary: "#78867f" },
  ochre: { primary: "#a8622f", secondary: "#d9a441" },
  grape: { primary: "#6d5a8c", secondary: "#9b8ab5" }
};

const STYLE_PREFIX = "%% moread:mindmap";

export function legacyThemeColors(id) {
  return LEGACY_THEME_COLORS[id] || null;
}

export const MINDMAP_LAYOUTS = [
  { id: "radial", name: "发散", direction: "" },
  { id: "tree", name: "从左到右", direction: "LR" },
  { id: "tree-down", name: "从上到下", direction: "TB" }
];

function parseMarkerTokens(source) {
  const tokens = {};
  for (const line of String(source || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(STYLE_PREFIX)) continue;
    const body = trimmed.slice(STYLE_PREFIX.length).trim();
    for (const part of body.split(/\s+/)) {
      const match = part.match(/^([\w-]+)=(.+)$/);
      if (match) tokens[match[1]] = match[2];
    }
    break;
  }
  return tokens;
}

export function readMindmapLayout(source) {
  const tokens = parseMarkerTokens(source);
  const direction = ["LR", "RL", "TB", "BT"].includes(tokens.direction)
    ? tokens.direction
    : "LR";
  if (tokens.layout === "tree") {
    return { mode: "tree", direction };
  }
  if (tokens.layout === "tree-down") {
    return { mode: "tree", direction: "TB" };
  }
  return { mode: "radial", direction: "" };
}

export function layoutFromMarker(source) {
  const layout = readMindmapLayout(source);
  if (layout.mode === "tree" && layout.direction === "TB") {
    return { id: "tree-down", mode: "tree", direction: "TB" };
  }
  if (layout.mode === "tree") return { id: "tree", mode: "tree", direction: "LR" };
  return { id: "radial", mode: "radial", direction: "" };
}

/**
 * The colour theme is stored as a comment inside the diagram source so it
 * travels with the Markdown file and still parses as a plain Mermaid comment
 * in other renderers (they simply use their default palette).
 */
export function readMindmapTheme(source) {
  const tokens = parseMarkerTokens(source);
  if (tokens.theme) return { mode: "preset", id: tokens.theme };
  const colors = tokens.primary
    ? { primary: tokens.primary, secondary: tokens.secondary || "" }
    : null;
  if (colors && /^#[0-9a-f]{6}$/i.test(colors.primary)) {
    return {
      mode: "custom",
      primary: colors.primary,
      secondary: /^#[0-9a-f]{6}$/i.test(colors.secondary || "")
        ? colors.secondary
        : colors.primary
    };
  }
  return { mode: "auto", id: "auto" };
}

export function stripMindmapTheme(source) {
  return String(source || "")
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith(STYLE_PREFIX))
    .join("\n");
}

export function applyMindmapTheme(source, theme, layout = null) {
  const clean = stripMindmapTheme(source);
  const tokens = [];
  if (theme && theme.mode === "preset") {
    tokens.push(`theme=${theme.id}`);
  } else if (theme && theme.mode === "custom") {
    tokens.push(`primary=${theme.primary}`, `secondary=${theme.secondary || theme.primary}`);
  }
  if (layout && layout.mode === "tree") {
    tokens.push("layout=tree");
    if (layout.direction === "TB") tokens.push("direction=TB");
  }
  if (!tokens.length) return clean;
  return `${STYLE_PREFIX} ${tokens.join(" ")}\n${clean}`;
}

export function resolveMindmapColors(theme) {
  if (!theme || theme.mode === "auto") return null;
  if (theme.mode === "custom") {
    return { primary: theme.primary, secondary: theme.secondary || theme.primary };
  }
  // Legacy `theme=<preset>` markers from earlier versions.
  const preset = legacyThemeColors(theme.id);
  return preset || null;
}

export function detectDiagramType(source) {
  const lines = String(source || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("%%"));
  const first = (lines[0] || "").toLowerCase();
  if (first.startsWith("mindmap")) return "mindmap";
  if (first.startsWith("flowchart") || first.startsWith("graph")) return "flowchart";
  if (first.startsWith("sequencediagram")) return "sequence";
  if (first.startsWith("classdiagram")) return "class";
  if (first.startsWith("statediagram")) return "state";
  if (first.startsWith("gantt")) return "gantt";
  if (first.startsWith("pie")) return "pie";
  if (first.startsWith("journey")) return "journey";
  if (first.startsWith("er") || first.startsWith("erdiagram")) return "er";
  if (first.startsWith("gitgraph")) return "gitGraph";
  if (first.startsWith("timeline")) return "timeline";
  if (first.startsWith("quadrantchart")) return "quadrant";
  if (first.startsWith("xychart")) return "xychart";
  if (first.startsWith("kanban")) return "kanban";
  if (first.startsWith("sankey")) return "sankey";
  if (first.startsWith("block")) return "block";
  if (first.startsWith("packet")) return "packet";
  if (first.startsWith("requirementdiagram")) return "requirement";
  if (first.startsWith("c4")) return "c4";
  return "unknown";
}

export function canStructureEdit(type) {
  // Mindmap/flowchart get a node/edge editor; every other detected Mermaid
  // type gets the statement-row editor in app.js. Unknown source stays in the
  // source panel because there is no statement model to show.
  return type !== "unknown";
}

/* -------------------------------------------------------------------------- */
/* Mindmap                                                                     */
/* -------------------------------------------------------------------------- */

function parseMindmapNode(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const patterns = [
    { re: /^([\w\u4e00-\u9fa5-]*)\s*\(\((.*)\)\)$/, shape: "circle" },
    { re: /^([\w\u4e00-\u9fa5-]*)\s*\{\{(.*)\}\}$/, shape: "hexagon" },
    { re: /^([\w\u4e00-\u9fa5-]*)\s*\[(.*)\]$/, shape: "square" },
    { re: /^([\w\u4e00-\u9fa5-]*)\s*\((.*)\)$/, shape: "rounded" },
    { re: /^([\w\u4e00-\u9fa5-]*)\s*\)\)(.*)\(\($/, shape: "bang" },
    { re: /^([\w\u4e00-\u9fa5-]*)\s*\)(.*)\($/, shape: "cloud" },
    { re: /^([\w\u4e00-\u9fa5-]*)\s*>(.*)\]$/, shape: "asymmetric" }
  ];

  for (const { re, shape } of patterns) {
    const match = raw.match(re);
    if (match) {
      return { id: match[1] || "", label: match[2].trim(), shape };
    }
  }
  return { id: "", label: raw, shape: "plain" };
}

function indentOf(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1].replace(/\t/g, "  ").length : 0;
}

export function parseMindmap(source) {
  const clean = stripMindmapTheme(source);
  const body = clean.split(/\r?\n/).slice(1);
  const roots = [];
  const stack = [];

  for (const line of body) {
    if (!line.trim() || line.trim().startsWith("%%")) continue;
    const node = parseMindmapNode(line);
    if (!node) continue;
    const indent = indentOf(line);
    node.children = [];

    while (stack.length && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    if (stack.length) {
      stack[stack.length - 1].node.children.push(node);
    } else {
      roots.push(node);
    }
    stack.push({ indent, node });
  }

  if (!roots.length) {
    return { ok: false, error: "没有找到思维导图节点" };
  }
  if (roots.length > 1) {
    return {
      ok: false,
      error: `检测到 ${roots.length} 个根节点，结构化编辑只支持单根节点`
    };
  }
  return { ok: true, root: roots[0] };
}

function escapeMindmapLabel(label) {
  return String(label ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

export function serializeMindmap(root) {
  const lines = ["mindmap"];
  const shapeOf = (node) => {
    if (node.shape === "plain" || !node.shape) return { open: "", close: "" };
    const entry = Object.values(MINDMAP_SHAPES).find((item) => item.name === node.shape);
    return entry || { open: "", close: "" };
  };

  const walk = (node, depth) => {
    const label = escapeMindmapLabel(node.label) || "未命名";
    const { open, close } = shapeOf(node);
    const id = node.id ? String(node.id).trim() : "";
    const text = open ? `${id}${open}${label}${close}` : `${id ? `${id} ` : ""}${label}`;
    lines.push(`${"  ".repeat(depth)}${text}`);
    for (const child of node.children || []) walk(child, depth + 1);
  };

  walk(root, 1);
  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */
/* Flowchart                                                                   */
/* -------------------------------------------------------------------------- */

const FLOW_DIRECTIONS = new Set(["TD", "TB", "BT", "LR", "RL"]);
const FLOW_SHAPES = [
  { re: /^([\w-]+)\s*\(\[(.*)\]\)$/, shape: "stadium" },
  { re: /^([\w-]+)\s*\[(.*)\]$/, shape: "rect" },
  { re: /^([\w-]+)\s*\((.*)\)$/, shape: "rounded" },
  { re: /^([\w-]+)\s*\{(.*)\}$/, shape: "diamond" },
  { re: /^([\w-]+)\s*\[\[(.*)\]\]$/, shape: "subroutine" },
  { re: /^([\w-]+)\s*\{\{(.*)\}\}$/, shape: "hexagon" }
];

function parseFlowNode(text) {
  const raw = String(text || "").trim();
  for (const { re, shape } of FLOW_SHAPES) {
    const match = raw.match(re);
    if (match) {
      return { id: match[1], label: match[2].trim(), shape };
    }
  }
  if (/^[\w-]+$/.test(raw)) return { id: raw, label: "", shape: "" };
  return null;
}

const EDGE_RE =
  /^(.+?)\s*(-->|---|-\.->|==>|--x|--o)\s*(?:\|([^|]*)\|)?\s*(.+)$/;
const ARROW_RE = /-->|-\.->|==>|--x|--o/;

export function parseFlowchart(source) {
  const lines = stripMindmapTheme(source)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("%%"));
  if (!lines.length) return { ok: false, error: "内容为空" };

  const header = lines[0].match(/^(?:flowchart|graph)\s+([A-Za-z]{2})?/i);
  if (!header) return { ok: false, error: "不是流程图" };
  let direction = (header[1] || "TD").toUpperCase();
  if (!FLOW_DIRECTIONS.has(direction)) direction = "TD";

  const nodes = new Map();
  const edges = [];

  const addNode = (node) => {
    if (!node) return;
    const existing = nodes.get(node.id);
    if (existing) {
      // A bare reference (`B`) carries no label or shape: keep the definition.
      if (node.label) existing.label = node.label;
      if (node.shape) existing.shape = node.shape;
      return;
    }
    nodes.set(node.id, {
      id: node.id,
      label: node.label || node.id,
      shape: node.shape || "rect"
    });
  };

  for (const line of lines.slice(1)) {
    if (/^(subgraph|end|style|classDef|class|click|linkStyle)\b/i.test(line)) {
      return {
        ok: false,
        error: "该流程图包含子图或样式定义，请用源码编辑"
      };
    }
    const edge = line.match(EDGE_RE);
    if (edge) {
      const [, left, arrow, label, right] = edge;
      if (ARROW_RE.test(left.trim()) || ARROW_RE.test(right.trim())) {
        return { ok: false, error: "该流程图使用了链式连线，请用源码编辑" };
      }
      const fromNode = parseFlowNode(left);
      const toNode = parseFlowNode(right);
      if (!fromNode || !toNode) {
        return { ok: false, error: `无法解析这一行：${line.slice(0, 40)}` };
      }
      addNode(fromNode);
      addNode(toNode);
      edges.push({
        from: fromNode.id,
        to: toNode.id,
        label: (label || "").trim(),
        arrow: arrow || "-->"
      });
      continue;
    }
    // Any remaining arrow syntax we do not model.
    if (ARROW_RE.test(line)) {
      return { ok: false, error: "该流程图使用了链式或多目标连线，请用源码编辑" };
    }
    const node = parseFlowNode(line);
    if (node) {
      addNode(node);
      continue;
    }
    return { ok: false, error: `无法解析这一行：${line.slice(0, 40)}` };
  }

  if (!nodes.size) return { ok: false, error: "没有找到节点" };
  return {
    ok: true,
    direction,
    nodes: Array.from(nodes.values()),
    edges
  };
}

function shapeWrap(node) {
  const label = String(node.label ?? "").replace(/[\r\n]+/g, " ").trim() || node.id;
  switch (node.shape) {
    case "rounded":
      return `${node.id}(${label})`;
    case "stadium":
      return `${node.id}([${label}])`;
    case "diamond":
      return `${node.id}{${label}}`;
    case "subroutine":
      return `${node.id}[[${label}]]`;
    case "hexagon":
      return `${node.id}{{${label}}}`;
    case "rect":
    default:
      return `${node.id}[${label}]`;
  }
}

export function serializeFlowchart({ direction = "LR", nodes = [], edges = [] }) {
  const lines = [`flowchart ${FLOW_DIRECTIONS.has(direction) ? direction : "LR"}`];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const emitted = new Set();

  // Emit a node's shape the first time it appears, so labels survive the
  // round-trip while later references stay short.
  const ref = (id) => {
    const node = byId.get(id);
    if (!node || emitted.has(id)) return id;
    emitted.add(id);
    return shapeWrap(node);
  };

  for (const edge of edges) {
    const label = edge.label ? `|${edge.label}|` : "";
    lines.push(`  ${ref(edge.from)} ${edge.arrow || "-->"}${label} ${ref(edge.to)}`);
  }
  for (const node of nodes) {
    if (emitted.has(node.id)) continue;
    lines.push(`  ${shapeWrap(node)}`);
    emitted.add(node.id);
  }
  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                              */
/* -------------------------------------------------------------------------- */

export function newNodeId(nodes) {
  const used = new Set(nodes.map((node) => node.id));
  for (let index = 1; index < 1000; index += 1) {
    const id = `N${index}`;
    if (!used.has(id)) return id;
  }
  return `N${Date.now()}`;
}

/* -------------------------------------------------------------------------- */
/* Render layouts                                                              */
/* -------------------------------------------------------------------------- */

const FLOW_LABEL_MAP = {
  "[": "［",
  "]": "］",
  "(": "（",
  ")": "）",
  "{": "｛",
  "}": "｝",
  '"': "＂",
  "|": "｜",
  "<": "＜",
  ">": "＞"
};

function escapeFlowLabel(text) {
  return String(text ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/[\[\](){}"|<>]/g, (char) => FLOW_LABEL_MAP[char] || char)
    .trim();
}

/**
 * Mermaid mindmaps are always radial. For the "tree" layouts the same tree is
 * rendered as a flowchart instead, so the document stays a mindmap (structure
 * editing keeps working) while the picture changes direction.
 */
export function mindmapTreeToFlowchart(root, direction = "LR") {
  const dir = ["LR", "RL", "TB", "BT"].includes(direction) ? direction : "LR";
  const lines = [`flowchart ${dir}`];
  let seq = 0;

  const walk = (node, parentId, depth) => {
    const label = escapeFlowLabel(node.label) || "未命名";
    if (depth === 0) {
      const id = "root";
      lines.push(`  ${id}((${label}))`);
      for (const child of node.children || []) walk(child, id, depth + 1);
      return;
    }
    const id = `n${++seq}`;
    lines.push(`  ${parentId} --> ${id}[${label}]`);
    for (const child of node.children || []) walk(child, id, depth + 1);
  };

  walk(root, null, 0);
  return lines.join("\n");
}

export function prepareMermaidRender(source) {
  const raw = String(source || "");
  const layout = layoutFromMarker(raw);
  const clean = stripMindmapTheme(raw);
  if (layout.mode !== "tree") return { source: clean, layout };
  if (detectDiagramType(clean) !== "mindmap") return { source: clean, layout };
  const parsed = parseMindmap(clean);
  if (!parsed.ok) return { source: clean, layout };
  return {
    source: mindmapTreeToFlowchart(parsed.root, layout.direction),
    layout
  };
}