# 墨阅主题包制作指导

> 中文 · [English](en-Theme-Packs)

主题包（Theme Pack）把一套完整外观打包成单个 ZIP：配色、组件颜色、软件图标、贴纸、自定义按钮、界面隐藏项，以及自定义主页和 CSS。导入后自动解压并应用，不会改动任何文档。

跟着「快速开始」做一个最小包大约需要 3 分钟。

## 快速开始

1. 新建一个文件夹，写入 `theme.json`：

   ```json
   {
     "format": "moread-theme",
     "version": 2,
     "name": "苔绿",
     "theme": { "mode": "light", "primary": "#4d7c5f", "secondary": "#d9a441" }
   }
   ```

2. 把 `theme.json` **本身**压缩成 ZIP（不要连文件夹一起打包），它必须位于压缩包根目录：

   ```text
   苔绿.moread-theme.zip
   └── theme.json
   ```

3. 把 ZIP 拖进墨阅窗口，或「主题工作室 → 主题包 → 导入主题包」。确认后立即生效。

只改颜色到这里就够了；主页、CSS、图片继续往下看。

## 目录结构

ZIP 内固定布局（除 `theme.json` 外都可选）：

```text
my-theme.moread-theme.zip
├── theme.json          # 必需：主题清单
├── style.css           # 可选：页面样式包
├── home.md             # 可选：自定义主页 Markdown
└── assets/             # 可选：图片资源
    ├── cover.png
    └── pattern.svg
```

导入时：

- 只读取 `theme.json`、`style.css`、`home.md` 与 `assets/*`，其他条目忽略。
- `assets/` 解压到用户数据目录的 `theme-assets/packs/<id>/assets/`，目录结构保持不变。
- 导入是**整体替换**：配色、组件颜色、图标、贴纸、按钮、界面隐藏、主页、CSS 全部换成包里的内容；包里没有主页/CSS 就会清空当前的自定义主页与样式。
- 包里没有按钮时保留当前按钮；包里有脚本按钮时会先确认（可以「仅导入外观」跳过按钮）。
- 未知字段忽略，非法值清洗（例如颜色不是 `#rrggbb` 时回退默认色）。

## theme.json

顶层字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `format` | string | 是 | 固定 `"moread-theme"` |
| `version` | number | 是 | 当前 `2`；`1` 兼容导入；大于 `2` 拒绝 |
| `name` | string | 否 | 主题名，最长 60 字符，显示在主题工作室 |
| `home` | object | 否 | `{ "enabled": boolean, "markdown": string }` |
| `style` | object | 否 | `{ "enabled": boolean, "css": string }` |
| `theme` | object | 否 | 配色与外观，见下 |

`theme` 字段：

| 字段 | 说明 |
| --- | --- |
| `mode` | `"light"` / `"dark"` / `"system"` |
| `primary` | `#rrggbb`，主强调色：按钮、链接、选中态、标题装饰 |
| `secondary` | `#rrggbb`，副强调色：高亮、徽章、第二层强调 |
| `componentColors` | 22 个组件的单独覆盖色 |
| `brandIcon` | 软件图标 |
| `stickers` | 贴纸数组 |
| `customButtons` | 自定义按钮数组 |
| `uiHidden` | 要隐藏的界面元素 id 数组 |

只写 `primary` / `secondary` 时，墨阅会由这两个颜色推导整套界面色阶（浅色/深色分别计算），这是最省事也最一致的做法。

### componentColors：22 个组件颜色

只有显式写出的键才覆盖；不写的部分继续跟随主题色自动生成。导入主题包后「从主题色自动生成」会关闭，改用包里的具体色值。

| 键 | 名称 | CSS 变量 | 作用位置 |
| --- | --- | --- | --- |
| `appBg` | 应用背景 | `--bg` | 窗口底色、侧栏外框 |
| `titlebarBg` | 标题栏 | `--titlebar` | 顶部标题栏 |
| `sidebarBg` | 侧栏 | `--sidebar` | 左侧文档栏 |
| `surfaceBg` | 工作区 | `--surface` | 标签栏、工具栏、编辑器外框 |
| `editorBg` | 编辑器背景 | `--editor-bg` | CodeMirror 区域与行号栏 |
| `paperBg` | 阅读纸张 | `--paper` | 预览纸张、弹窗底色 |
| `paperSoft` | 纸张浮层 | `--paper-soft` | 次级纸张、悬浮面板 |
| `statusBg` | 状态栏 | `--status-bg` | 底部状态栏 |
| `ink` | 正文文字 | `--ink` | 主要文字 |
| `inkSoft` | 次要文字 | `--ink-soft` | 副标题、说明文字 |
| `muted` | 辅助文字 | `--muted` | 标签、占位文字 |
| `faint` | 弱化文字 | `--faint` | 行号、极弱提示 |
| `line` | 分隔线 | `--line` | 边框、分割线 |
| `lineSoft` | 轻分隔线 | `--line-soft` | 更淡的内部分隔 |
| `codeBg` | 代码背景 | `--code-bg` | 代码块底色 |
| `codeInk` | 代码文字 | `--code-ink` | 代码块默认文字 |
| `codeHead` | 代码标题栏 | `--code-head` | 代码块顶部语言条 |
| `tableHead` | 表头背景 | `--table-head` | Markdown 表格表头 |
| `quoteBg` | 引用背景 | `--quote-bg` | 引用块底色 |
| `selection` | 选中背景 | `--selection` | 文本选中高亮 |
| `diagramPrimary` | 图表主色 | `--diagram-primary` | Mermaid 节点、连线主色 |
| `diagramSecondary` | 图表辅色 | `--diagram-secondary` | Mermaid 次要节点、连线辅色 |

```json
"componentColors": {
  "appBg": "#eef3ec",
  "paperBg": "#ffffff",
  "ink": "#1f2a24",
  "codeBg": "#e7efe9",
  "quoteBg": "#f1f7f2"
}
```

组件颜色以**内联样式**写在 `<html>` 上，优先级高于样式表。要在 `style.css` 里覆盖它们需要 `!important`；更推荐直接写 `componentColors`。

### brandIcon：软件图标

```json
"brandIcon": { "type": "preset", "value": "leaf" }
```

- 内置样式（`type: "preset"`）：`default`（墨 M）、`leaf`（叶）、`star`（星）、`ink`（砚）。
- 自定义图片（`type: "image"`）：`value` 为 `data:image/png|jpeg|webp;base64,...`，最长 700,000 字符（约 500 KB）。
- 图标会同时更新标题栏和窗口图标；建议正方形、≥256×256。主题包里请直接内嵌 data URL。

### stickers：贴纸

```json
"stickers": [
  {
    "type": "emoji",
    "value": "🌿",
    "x": 88,
    "y": 12,
    "size": 42,
    "rotation": -8,
    "scope": "always"
  }
]
```

| 字段 | 说明 |
| --- | --- |
| `type` | `"emoji"` 或 `"image"`（image 同样用 png/jpeg/webp 的 data URL） |
| `value` | emoji 字符或图片 data URL |
| `x` / `y` | 位置，0–100（相对预览区百分比） |
| `size` | 尺寸，16–200（px） |
| `rotation` | 旋转角度，-180–180 |
| `scope` | `"always"` / `"welcome"`（仅欢迎页）/ `"reading"`（仅阅读时） |

最多 40 个。图片贴纸会把 base64 写进 `theme.json`，包会明显变大；能用 emoji 就优先 emoji。

### customButtons：自定义按钮与脚本 API

```json
"customButtons": [
  {
    "label": "插入日期",
    "icon": "📅",
    "script": "await app.insert(new Date().toLocaleDateString('zh-CN'));"
  }
]
```

| 字段 | 限制 |
| --- | --- |
| `label` | 必填，≤40 字符 |
| `icon` | ≤4 字符（一个 emoji 即可） |
| `script` | 必填，≤6000 字符，异步函数体（可用 `await`） |

脚本在渲染进程执行，参数名为 `app`（`markdown` 是同一对象的别名）：

| API | 说明 |
| --- | --- |
| `app.content` | 当前文档 Markdown（只读） |
| `app.selection` | 当前选区文本（只读） |
| `app.info` | `{ name, path, dirty, length }` 或 `null` |
| `app.setContent(text)` | 替换整篇内容 |
| `app.insert(text)` | 在光标处插入 |
| `app.replaceSelection(text)` | 用文本替换选区 |
| `app.newDocument()` | 新建文档 |
| `app.open()` / `app.openPath(path)` | 打开文件对话框 / 打开指定路径 |
| `app.save()` / `app.saveAs()` | 保存 / 另存为 |
| `app.exportHtml()` / `app.exportPdf()` / `app.exportText()` | 导出 |
| `app.toast(message)` | 右下角提示 |
| `app.setViewMode(mode)` | `read` / `split` / `edit` / `visual` |
| `app.setTheme(theme)` | `light` / `dark` / `system` |
| `app.setColors(primary, secondary)` | 改主/副强调色 |
| `app.openStudio()` | 打开主题工作室 |

按钮脚本与插件命令共用同一套 `app` API；需要文件/格式能力时也可以用 `app.pickFile`、`app.importDocx`、`app.createDocument`（详见 [插件制作指导](zh-Plugin-Authoring)）。

最多 24 个按钮。按钮脚本拥有与手动操作相同的权限，**只导入可信来源的主题包**；脚本第一次运行还会显示内容再确认。

### uiHidden：隐藏界面元素

填元素 id 数组，未知 id 忽略；`sidebar` 会同时收起侧栏占位。

| 分组 | 可用 id |
| --- | --- |
| 顶栏 | `brand`、`window-title`、`theme-button`、`studio-button`、`help-button`、`settings-button` |
| 侧栏 | `sidebar`、`sidebar-actions`、`recent`、`outline`、`assoc-badge`、`sidebar-version` |
| 工具栏与状态栏 | `sidebar-toggle`、`view-switch`、`more-button`、`format-bar`、`save-state`、`save-button`、`statusbar`、`status-counts`、`status-cursor`、`status-sync`、`status-meta` |
| 内容与装饰 | `welcome-art`、`welcome-tiles`、`welcome-hint`、`code-copy`、`color-chips`、`html-preview-button`、`stickers`、`custom-dock` |

```json
"uiHidden": ["brand", "window-title", "welcome-art", "assoc-badge"]
```

## home.md：自定义主页

启用后欢迎页会替换成你的 Markdown 内容（默认标题、插画和快捷卡片都会隐藏）。

```markdown
# 林间工作台

一套安静的主题，适合长时间写字。

![封面](assets/cover.png)

- 支持完整 Markdown
- 支持 $E = mc^2$ 公式与代码高亮
- 支持 [链接](https://example.com)
```

规则：

- 支持 Markdown、GFM 表格、任务列表、脚注、KaTeX 公式和代码高亮。
- 图片路径写 `assets/xxx.png`（相对主题包目录），导入后自动解析；**不要写 `file://` 绝对路径**。
- 图片建议 ≤1200px 宽、压缩后放入；单张建议 ≤8 MB（ZIP 内单文件硬上限 12 MB）。
- `http(s)`、`mailto`、`tel` 链接用系统默认程序打开；主页里的相对链接没有文档上下文，建议直接用完整网址。
- 必须设置 `"home": { "enabled": true }`（纯 JSON 导入时尤其重要）；ZIP 里只要存在 `home.md` 也会自动启用。
- 内容上限：ZIP 内 `home.md` 约 300,000 字符（导入时截断），导出时上限 1 MB。

在应用里编辑主页时，「插入图片」会把图片复制到主题资源目录并插入绝对地址；导出主题包时会自动还原成 `assets/...`。

## style.css：页面样式包

`style.css` 会作为 `<style id="appCustomCss">` 插到页面最后，优先级高于内置样式（同特异性时胜出）。

```css
/* 更方的按钮 */
:root { --radius-lg: 4px; --radius-md: 4px; }

/* 装饰性调整请克制 */
.welcome .lede { letter-spacing: 0.02em; }

/* 深色模式单独调整 */
html[data-theme="dark"] .statusbar { background: #101312; }
```

常用 CSS 变量（优先用变量而不是写死颜色）：

| 变量 | 含义 |
| --- | --- |
| `--bg` / `--bg-deep` | 应用背景 / 更深一层 |
| `--titlebar` / `--titlebar-tint` | 标题栏 / 叠色 |
| `--sidebar` / `--sidebar-deep` | 侧栏 / 侧栏深处 |
| `--surface` | 工作区表面 |
| `--paper` / `--paper-soft` | 阅读纸张 / 纸张浮层 |
| `--accent` / `--accent-strong` / `--accent-soft` / `--accent-wash` | 主强调色与三档淡化 |
| `--accent-contrast` | 强调色上的对比文字色 |
| `--gold` | 副强调色 |
| `--green` / `--blue` / `--purple` / `--danger` | 语义色 |
| `--ink` / `--ink-soft` / `--muted` / `--faint` | 四级文字 |
| `--line` / `--line-soft` / `--line-strong` | 三级线条 |
| `--selection` | 选中背景 |
| `--code-bg` / `--code-ink` / `--code-head` | 代码块 |
| `--table-head` / `--quote-bg` | 表头 / 引用（由组件颜色写入） |
| `--radius-sm` / `--radius-md` / `--radius-lg` | 圆角 |
| `--shadow-sm` / `--shadow-md` / `--shadow-lg` | 阴影 |
| `--font-ui` / `--font-reading` / `--font-mono` | 字体族 |
| `--editor-size` / `--preview-size` | 正文字号（由设置驱动） |
| `--hl-keyword` / `--hl-string` / `--hl-number` / `--hl-comment` / `--hl-function` / `--hl-type` / `--hl-attr` / `--hl-builtin` / `--hl-meta` | 代码高亮 |

常用结构选择器：

| 选择器 | 区域 |
| --- | --- |
| `.shell` | 整体网格（侧栏 + 工作区） |
| `#titlebar` / `.brand` / `.titlebar-actions` | 顶部标题栏 |
| `#sidebar` / `.sidebar-actions` / `.side-section` | 左侧栏 |
| `.workspace` / `.tabbar` / `.tabs` | 标签栏区域 |
| `.format-bar` | 格式化工具栏 |
| `.editor-pane` / `.cm-editor` / `.cm-gutters` | 编辑器 |
| `#previewPane` / `.markdown-body` | 阅读区 |
| `.code-block` / `.table-shell` / `.math-block` | 代码块 / 表格 / 公式 |
| `.statusbar` | 状态栏 |
| `.welcome` / `.custom-home` | 欢迎页与自定义主页 |
| `#stickerLayer` / `#customDock` | 贴纸层 / 自定义按钮栏 |

限制与注意：

- **不能执行 JavaScript**：CSS 只影响外观。
- 远程字体、远程 `@import` 会被 CSP 拦截；远程图片（`https:`）可以用。
- 图片可以用 `url(assets/xxx.png)`（导入时自动改写成可用地址）、`data:` 或 `https:`。
- 组件颜色是内联变量，覆盖需要 `!important`（例如 `html { --ink: #111 !important; }`）。
- 深色模式用 `html[data-theme="dark"]`，浅色为 `html[data-theme="light"]`。
- 内容上限：导入 600,000 字符，导出文件 1 MB。

## assets：图片资源

- 放在 `assets/` 下，`home.md` 或 `style.css` 里用 `assets/文件名` 引用。
- 文件名只允许字母、数字、`.`、`_`、`-` 和中文；不能有子目录，不能以 `.` 开头。
- 建议 png / jpg / webp / svg；gif 能显示但体积大。
- 上限：单张建议 ≤8 MB（ZIP 内单文件硬上限 12 MB）；一个包最多 60 张、合计 24 MB（导出限制）。
- 引用时保持大小写一致。

```text
assets/cover.png   →  ![封面](assets/cover.png)
assets/pattern.svg →  .welcome { background-image: url(assets/pattern.svg); }
```

## 打包与导入

### 制作 ZIP

- **Windows（资源管理器）**：进入主题文件夹，**全选里面的文件**（`theme.json`、`style.css`、`home.md`、`assets`），右键「压缩为 ZIP 文件」，再改名为 `my-theme.moread-theme.zip`。
- **PowerShell**：

  ```powershell
  Compress-Archive -Path theme.json,style.css,home.md,assets `
    -DestinationPath my-theme.moread-theme.zip -Force
  ```

- **macOS**：选中文件（不是外层文件夹）→ 右键「压缩」。

要求：

- 标准 ZIP，支持 store 与 deflate（Windows/macOS 自带压缩都满足）。
- 不支持加密 ZIP、7z、RAR、分卷压缩。
- `theme.json` 必须在压缩包**根目录**，不能多套一层文件夹。
- 导入文件上限 32 MB；解压后总大小 40 MB、单文件 12 MB、条目数 400。

### 导入方式

| 方式 | 操作 |
| --- | --- |
| 拖入窗口 | 把 `.zip` 拖进墨阅窗口（桌面端） |
| 主题工作室 | 主题包 →「导入主题包」 |
| 命令行 | `MoRead.exe --import-theme="D:\path\my-theme.moread-theme.zip"` |
| 剪贴板 | 复制 `theme.json` 文本 →「从剪贴板导入」（不含 `assets/` 图片） |

导入前会弹出确认框，说明将覆盖哪些内容；取消不会改动主题。导入后建议重启一次确认设置已持久化。

### 导出再编辑

主题工作室 →「导出 .zip」把当前状态打包，可以解开继续改；「复制 JSON」适合快速分享配色（不含图片文件）。

## 完整示例

```json
{
  "format": "moread-theme",
  "version": 2,
  "name": "林间墨绿",
  "home": { "enabled": true },
  "style": { "enabled": true },
  "theme": {
    "mode": "light",
    "primary": "#4d7c5f",
    "secondary": "#d9a441",
    "componentColors": {
      "appBg": "#eef3ec",
      "paperBg": "#fdfefb",
      "ink": "#1f2a24",
      "codeBg": "#e7efe9",
      "quoteBg": "#f1f7f2"
    },
    "brandIcon": { "type": "preset", "value": "leaf" },
    "stickers": [
      { "type": "emoji", "value": "🌿", "x": 90, "y": 10, "size": 40, "rotation": 12, "scope": "welcome" }
    ],
    "customButtons": [
      { "label": "插入日期", "icon": "📅", "script": "await app.insert(new Date().toLocaleDateString('zh-CN'));" }
    ],
    "uiHidden": ["assoc-badge"]
  }
}
```

配套 `home.md`：

```markdown
# 林间工作台

一套安静的墨绿主题，适合长时间写字。

![封面](assets/cover.png)

- 公式：$E = mc^2$
- 代码：`npm run build`
- 链接：[Markdown 指南](https://commonmark.org/help/)
```

配套 `style.css`：

```css
:root { --radius-lg: 6px; }
.welcome .lede { letter-spacing: 0.02em; }
html[data-theme="dark"] .statusbar { background: #0f1411; }
```

## 限制与安全

- 导入会覆盖当前主题设置，**不会**改动文档内容。
- 主题包里的自定义按钮脚本在本机执行，权限与手动操作相同；CSS 可以隐藏/遮挡界面。
- 带脚本按钮的主题包导入时会单独确认；按钮第一次运行时还会显示来源与脚本内容再确认。
- 只导入可信来源的主题包；不确定时先解压检查 `theme.json` 与 `style.css`。
- 图片保存在用户数据目录的 `theme-assets/`，不写入文档目录。
- 主题包不通过网络加载远程代码；远程图片/字体受 CSP 约束。

## 排错清单

| 现象 | 常见原因 | 解决 |
| --- | --- | --- |
| 「主题包里缺少 theme.json」 | 多套了一层文件夹；文件名大小写/扩展名不对 | 让 `theme.json` 位于 ZIP 根目录 |
| 「主题包版本 3 高于当前支持的 2」 | `version` 写错 | 改成 `2`（或 `1`） |
| 主页没有出现 | 纯 JSON 导入没写 `home.enabled`；或 `home.md` 为空 | 加 `"home": { "enabled": true }` 并确认有内容 |
| 主页图片不显示 | 写成绝对 `file://`；没放进 `assets/`；文件名含空格等非法字符 | 改为 `assets/xxx.png`，文件名只用字母、数字、中文与 `._-` |
| CSS 不生效 | 被内联组件颜色覆盖；用了远程 `@import` | 覆盖组件变量时加 `!important`；远程样式改成本地文件 |
| 图标/贴纸不显示 | 不是 png/jpeg/webp 的 data URL，或超出长度 | 重新导出为允许格式，压缩到 500 KB 以内 |
| 导入后旧主题丢了 | 主题包是整体替换 | 提前「复制 JSON」备份，或重新导入旧包 |
| 导出体积过大 | CSS 内嵌大图、贴纸用图片 | 压缩图片、优先 emoji 贴纸 |
| ZIP 无法导入 | 用了 7z/RAR/加密压缩 | 重新用标准 ZIP 打包 |
| 深色模式下发白 | CSS 写死了浅色背景 | 用变量或 `html[data-theme="dark"]` 覆盖 |

## 版本与兼容

| 版本 | 变化 |
| --- | --- |
| `1` | 单文件 `.json`：配色、组件颜色、图标、贴纸、按钮、界面隐藏 |
| `2` | ZIP：新增 `style.css`、`home.md`、`assets/`；`theme.json` 增加 `home` / `style` 开关 |

- 版本 1 的 `.json` 仍可导入（当作整套主题替换，主页与 CSS 被清空）。
- 版本大于 2 会拒绝导入，并提示当前支持的最高版本。
- 未知字段会被忽略，方便向前兼容；但不要依赖未声明的字段。
