# Agent.md — 墨阅开发约定

## 先读什么

- 接手/换对话：先读 [`docs/项目说明.md`](docs/项目说明.md)（架构、目录、数据模型、构建、验证、已知限制）。
- 本文只放**硬性规则**与「踩过就不要再踩」的约定，功能细节以项目说明和源码为准。
- 文档该读哪份、改完要同步哪份、发布前检查哪些项：见 [`docs/README.md`](docs/README.md)。

## 打包限制（重要）

- **在收到用户明确的打包指令之前，禁止打包。**
- 明确指令包括但不限于：`打包`、`生成安装包`、`出 release`、`更新安装包`、`npm run dist`。
- 未收到上述指令时，不要运行以下命令，也不要生成或覆盖 `release/` 下的任何文件：
  - `npm run dist`
  - `npm run pack`
  - `electron-builder`
  - 任何直接调用 NSIS / 安装器 / 便携目录生成的命令
- 不要为了“顺手验证”而安装、重装或卸载应用。验证一律使用开发运行。

### 版本号一致性（打包前必查）

- 一次打包涉及的版本号必须**同时对齐**，不允许桌面端与 Android 端各走一套版本号。
- 打包前逐项核对下表（表内「记录值」为 2026-11-25 的状态，改版后请顺手更新）：

| 位置 | 字段 | 记录值 |
| --- | --- | --- |
| `package.json` | `version` | `1.2.0` |
| `android/app/build.gradle` | `versionName` / `versionCode` | `1.2.0` / `12` |
| `plugins/moread-office/plugin.json` | `version` | `1.1.0` |
| `plugins/moread-dividers/plugin.json` | `version` | `1.0.0` |
| `plugins/moread-sample/plugin.json` | `version` | `1.0.0` |

- 以下命名必须与同一版本号一致：
  - 产物文件名：`release/MoRead-Setup-<version>.exe`、`release/MoRead-Android-<version>.apk`
  - git tag 与 GitHub Release 的 tag：`v<version>`
- `versionCode` 必须**单调递增**（Android 覆盖安装的唯一判据），即使 `versionName` 不变也不能改小或重复。
- 桌面端与 Android 端必须同版本（`1.2.0` 起已对齐，Android 的 `appInfo()` 读的也是 `package.json` 的
  `version`）；插件版本独立演进，但要在同一批 release 里发布，文件名固定为 `<id>-<version>.zip`。
- 「检查更新」读的是 GitHub Releases 的 `latest`，因此发布顺序必须是：先推代码与 tag，再发正式 release，
  否则客户端查不到新版本（草稿与预发布不参与 `latest`）。

## 启动测试脚本

开发验证统一使用：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-dev.ps1
```

打开指定文件：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-dev.ps1 -File "examples\示例文档.md"
```

需要 CDP 调试时：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-dev.ps1 -File "examples\示例文档.md" -DebugPort 9223
```

脚本行为：

1. 只执行 `npm run build`（renderer + vendor 资源），不产出安装包；
2. 清理当前进程的 `ELECTRON_RUN_AS_NODE`，避免 Electron 被当作 Node 运行；
3. 直接启动 `node_modules/electron/dist/electron.exe` 运行源码；
4. 支持 `-SkipBuild` 跳过构建，支持 `-DebugPort` 开启调试端口。

> `scripts/*.ps1` 需要保存为 **UTF-8 with BOM**。Windows PowerShell 5.1 会把无 BOM 的 UTF-8
> 当作 ANSI 读取，中文字符串会直接造成解析错误。

## 文本编码（重要）

- 修改源码一律使用编辑工具（`edit` / `write`），不要用 PowerShell 的
  `Get-Content` + `Set-Content` 做批量替换。
- 已经发生过一次 `app.js` 被 PowerShell 按 ANSI 读写后整篇乱码的事故；如果再次发生：
  1. 立即停止写文件；
  2. 从最近一次成功构建的 `dist/renderer.js.map` 的 `sourcesContent` 恢复；
  3. 恢复后再用编辑工具补回差异。
- 所有源文件统一 UTF-8、LF 换行；`.ps1` 使用 UTF-8 with BOM。
- 同样的坑也踩在了 `README.md`：PowerShell 的 `Get-Content -Raw` 按系统代码页（cp936）
  解码 UTF-8，再用 `Set-Content` 写回会双重编码，而且**不可逆**（cp936 编解码不回环）。
  因此不要用 PowerShell 修改任何文本文件，包括 README、docs 和配置。
- 事故后 README 已按会话内容重写；每次改完文档检查一次 `U+FFFD` 计数与中文关键段落。

## 日常开发规则

- 修改代码后至少执行一次 `npm run build`，再用 `scripts/start-dev.ps1` 启动验证。
- 改了插件加载/安装/卸载相关代码时，先跑 `npm run test:plugins`，再用 CDP 或开发窗口验证设置页。
- 文档改动按 [`docs/README.md`](docs/README.md) 的「维护规则」同步对应文档；变更只追加到 `IMPLEMENTATION_NOTES.md`。
- 不要用打包后的 `MoRead.exe` 代替开发验证。
- 文件关联、默认应用等写注册表的行为，只在用户明确要求验证时执行；验证后要说明改了什么。
- 需要截图时优先用 CDP（`scripts/cdp-eval.js`）或者开发窗口，不要为了截图重装应用。
- 保持文档源文件为纯 Markdown；不要引入私有格式。
- 不要把 `node_modules/`、`dist/`、`release/`、`screenshots/`、`tmp/` 提交进版本库。
- `plugins/` 同样不入库：插件只随 GitHub Release 分发，用 `npm run pack:plugin -- plugins/<id>`
  打包成 `release/<id>-<version>.zip` 后上传到对应 release，不要把插件源码提交到仓库。
- 用户没有明确要求时，不要删除已有的 `release/` 产物。

## 当前技术栈

- Electron 45 + 原生 CommonJS 主进程
- CodeMirror 6 编辑器
- markdown-it + KaTeX + highlight.js + DOMPurify 预览
- Turndown + turndown-plugin-gfm 负责可视化编辑转回 Markdown
- NSIS 打包配置保留在 `package.json`，但**只在收到指令后使用**

## 模块地图

| 文件 | 职责 |
| --- | --- |
| `src/main/main.js` | 窗口、文件读写、导出、主题包文件对话框、剪贴板 |
| `src/main/plugins.js` | 插件发现、加载/停用、zip 安装/卸载、热重载 |
| `src/main/zip.js` | 主题包 ZIP 读写（zlib，store + deflate） |
| `src/main/associations.js` | `.md` 文件关联与默认应用 |
| `src/renderer/app.js` | 主逻辑：文档、预览、可视化编辑、主题工作室、LaTeX 编辑器 |
| `src/renderer/markdown.js` | markdown-it 配置、KaTeX、代码高亮、HTML 预览清洗 |
| `src/renderer/latex.js` | LaTeX 符号面板、模板、源码公式范围扫描 |
| `src/renderer/theme.js` | 主题色生成、组件颜色、界面隐藏、图标 SVG |
| `src/renderer/styles.css` | 全部样式（含打印/PDF 样式） |

## 主题数据约定

- `primaryColor` / `secondaryColor` 是主题源头；`componentColorsAuto=true` 时
  22 个组件颜色由它们实时推导，切换深浅色自动重算。
- 手动改任一组件颜色会把当前生成结果物化为 `componentColors`，并关闭 auto。
- 图表（Mermaid）配色也是主题 token：`diagramPrimary` / `diagramSecondary`
  （CSS 变量 `--diagram-primary` / `--diagram-secondary`），默认由主/副强调色生成，
  可在「组件颜色 → 图表」里单独改；主题包会一起带走。
- 主题包格式为 `moread-theme@2`，是一个 ZIP（见 README），导入时必须经过
  `validateThemePack()` 的格式、版本与字段清洗，不允许直接信任文件内容。
- ZIP 读写用 `src/main/zip.js`（只依赖 `node:zlib`，支持 store/deflate），
  不要为此引入第三方压缩库。
- 主题包固定布局：`theme.json`、`style.css`、`home.md`、`assets/*`。
  解压到 `userData/theme-assets/packs/<packId>/`，`assets/` 目录结构原样保留，
  这样 `home.md` 里的 `assets/x.png` 可以用 `homeBasePath` 直接解析。
- 导入时只改写 CSS 里的 `url(assets/x)`；Markdown 不要做字符串替换，
  否则会把行内代码里的示例路径也改掉（踩过）。
- 导出时把 `file://` 资源地址序列化回 `assets/x`，主题包不能包含机器相关路径。
- 主题包会包含自定义按钮的 JavaScript、CSS 与主页内容；分享/导入时要在 UI 里
  提示来源风险。
- 剪贴板导入只传 `theme.json`（含 CSS 与主页文本），不含图片文件。

## 主题包库（多主题）

- 设置里维护 `themePacks: [{ id, name, payload, assets, basePath, updatedAt }]`
  与 `activeThemePack`；`payload` 只存**可移植**内容（`assets/x` 而不是 `file://`）。
- 应用主题包时把 payload 展开成设置，并把 `payload.css` 用 `rewriteAssetRefs()`
  按该包自己的 assets 还原成绝对 URL；主页不用改写，`homeBasePath` 负责解析。
- 脏标记（是否显示「保存修改」）用 `packSignature()` 比较；`currentPackPayload()`
  必须先用 `serializeAssetRefs()` 转回可移植形式，否则只要主题包含 CSS 图片就会
  永远显示「有未保存修改」（踩过）。
- 每个包一个资源目录 `theme-assets/packs/<packId>/assets`，删除主题包时调用
  `theme:remove-pack` 一并清理；`packId` 只允许 `pack-[0-9a-z-]` 形式，主进程会校验。
- 主进程 `theme:import` 现在返回 `packId`，Android 适配层同样按 `packs/<id>` 落盘，
  删除走 `removeAppDir`。
- 导出某一套主题时必须用该条目的 payload/assets，**不要**复用当前设置的
  `serializeAssetRefs` 上下文，否则会把别的包的资源映射错。

## 主页与样式包

- 自定义主页：`homeMarkdown` + `homeBasePath`，用
  `renderMarkdown(markdown, homeBasePath + "\\home.md")` 渲染，这样相对图片
  `assets/x.png` 能解析到主题目录；不要改写成绝对 `file://`。
- 自定义 CSS：`<style id="appCustomCss">` 追加到 `document.head` 末尾，
  启用/清空时要移除节点；设置变更走 `applySettings()` → `applyCustomCss()`。
- markdown-it 默认拒绝 `file:` 链接，`markdown.js` 里已扩展 `validateLink`
  允许 `file:`（否则主题包图片不渲染）；DOMPurify 的 `ALLOWED_URI_REGEXP`
  也已包含 `file:`。
- 拖入窗口：`.zip` / `.json` / `.css` 走主题或样式导入，其余按文档打开；
  导入入口都复用 `importThemePack(path)` / `importCssFile(path)`。
- 命令行 `--import-theme=<path>` 会在渲染器就绪后触发同一个导入流程，
  方便测试与快捷方式使用。
- 开发实例用 `scripts/start-dev.ps1 -UserDataDir <dir> -ImportTheme <zip>` 隔离配置：
  已安装版在运行时持有默认 `%APPDATA%\MoRead` 的单实例锁与文件句柄，
  不隔离会直接退出（DevTools 端口都连不上），也会导致清理脚本删不掉配置目录。
- 主进程支持 `--user-data-dir=<dir>`（在 `requestSingleInstanceLock()` 之前 `app.setPath`），
  这样开发实例与已安装版互不影响。
- 主题包制作文档在 `docs/主题包制作指导.md`，改字段/限制时同步更新它。
- 四份内置指南（`docs/介绍.md`、`docs/使用指南.md`、`插件制作指导.md`、`docs/主题包制作指导.md`）
  由 `scripts/build-guides.js` 生成到 `src/renderer/guides.generated.js`；改完源文档后跑
  `npm run build:guides`（`npm run build` 会自动跑），不要手改生成文件。首启会写入笔记夹。
- 移动端移植的坑与检查清单在 `docs/移动端打包踩坑记录.md`；新增或改动 Android
  能力（保存兜底、Intent、选择器降级）时同步更新那一份。

## LaTeX 编辑器约定

- 公式在预览里带 `data-tex`，并按文档顺序带 `data-math-index`；双击打开编辑器。
- 编辑已有公式时用 `findMathRanges()` 定位源码范围；优先按
  「相同 TeX + 相同显示模式」的第 N 次出现匹配，找不到再退回索引。
- 行内/块级用布尔值传递，`setLatexDisplay()` 同时接受 `true` 与 `"block"`。

## CodeMirror 主题陷阱

- CodeMirror 自带的 base theme 会用 `.<lightID> .cm-gutters { background:#f5f5f5 }`
  这类**双类选择器**覆盖我们单类的 `.cm-gutters`，导致暗色模式下行号栏仍是亮色。
  因此行号栏 / 当前行高亮的背景与字色必须带 `!important`。
- 同一个 base theme 也会覆盖 `.cm-content` 的 `padding` 与 `.cm-scroller` 的
  `line-height`（`padding: 4px 0` / `line-height: 1.4`）。这两处必须用 `!important`
  才能生效；否则编辑区没有留白，行号栏再怎么调都对不上。
- 行号栏**不要**自己加 `padding-top`。CodeMirror 已经按 `documentPadding.top`
  给 gutter 元素算好 `marginTop`，再加一次会让整列行号下移，表现为「行号比正文低」。
- 编辑模式需要限宽时，把 `max-width` / `margin: 0 auto` 放在 `.cm-editor` 上，
  让行号栏和正文一起居中；只给 `.cm-content` 居中会让行号栏留在面板左边缘，
  看起来像横向错位（踩过）。
- 同时通过 `themeCompartment` 把 `EditorView.darkTheme` 跟随应用主题，
  让搜索面板、tooltip 等内置控件也进入暗色分支；切换主题时要对当前编辑器
  `reconfigure`，切换文档时也要重新下发。

## 可视化编辑与撤销/恢复

- 可视化模式的编辑对象是 `#preview` 这个 contenteditable，不是 CodeMirror；
  CodeMirror 的 `undo(view)` / `undoDepth(view.state)` 看不到这些编辑，所以
  `updateHistoryButtons()` 在可视化模式下不能按 `undoDepth` 置灰，否则按钮永远不可用。
- 撤销 / 恢复统一走 `runHistory(command)`：可视化模式下先 `dom.preview.focus()`，
  再 `document.execCommand('undo'|'redo')`，成功后置 `state.visualDirty`、`scheduleVisualSync()`；
  源码模式才调用 CodeMirror 的 `undo` / `redo`。
- 不要试图把 CodeMirror 的 history 同步进可视化 DOM：`syncVisualContent()` 每次都会重建
  `doc.cmState`，历史会被清空；两套编辑模型各用各的历史。
- 图表 / 公式 / 代码块 / 表格 / `hr` 这类原子块是 `contenteditable=false`，光标落不到块后。
  `ensureVisualCaretSpacers()` 在可视化模式下给每个顶层原子块后面补
  `.visual-caret-spacer` 空段落；空 spacer 在 `serializeVisualMarkdown()` 里删除，
  用户输入后保留。不要给列表 / 引用内部的块补 spacer（会改变 Markdown 结构），
  也不要把 spacer 留在最终 Markdown 里。

## Mermaid 图表

- Mermaid 约 5 MB，**不要** import 进 renderer bundle：由 `copy-vendor.js` 复制到
  `dist/vendor/mermaid.min.js`，`app.js` 里 `loadMermaid()` 用 `<script>` 懒加载，
  只在文档里存在 `.mermaid-figure` 时才触发。
- `markdown.js` 的 fence 规则把 ```mermaid 渲染成占位 DOM（`data-mermaid-src` 存
  `encodeURIComponent(源码)`，`data-source-line` 存起始行），真正绘制在 `renderMermaidBlocks()`。
- 配色不能直接用 mermaid 的 `default`/`dark`（黄绿紫太跳），统一用 `theme: "base"` +
  由 CSS 变量推导的 `themeVariables`，mindmap 分支用 `cScale0..11` 色阶。
  切换主题色/深浅色时靠 `mermaidThemeSignature()` 判断是否需要重绘。
- 缓存键是「配色签名 + 源码」，避免每次重排都重新渲染；渲染中若预览已重建，
  用 `mermaidGeneration` 丢弃过期任务。
- 可视化编辑：`turndown` 的 `mermaidFigure` 规则把 figure 还原成 ```mermaid 代码块；
  `serializeVisualMarkdown()` 要移除 `.mermaid-head`，figure 本身 `contenteditable=false`。

### 图表可视化编辑器

- 结构解析在 `src/renderer/mermaid.js`：`parseMindmap`/`serializeMindmap`（单根树，
  保留节点的 `((圆))`、`[方]`、`{六边形}` 等形状）、`parseFlowchart`/`serializeFlowchart`
  （节点 + 连线，节点形状在首次出现时内联，保持往返稳定）。
  **解析器故意保守**：子图、`classDef`、链式连线一律返回 `ok:false` 让用户走源码，
  宁可少支持也不能改坏用户的图。
- 编辑模型：`state.mermaidEditor = { target, source, baseSource, tree|flow, theme, layout, selected }`。
  任何结构操作后必须 **先 `pushMermaidStructure()`（写回 source）再 `renderMermaidStructure()`
  （按 source 重建 UI）**；反过来会把刚加的节点丢掉（踩过）。
- 布局：marker 里写 `layout=tree`（可选 `direction=TB`），默认发散。
  `prepareMermaidRender()` 在渲染前把 mindmap 树转成 `flowchart` 源码
  （`mindmapTreeToFlowchart`），所以**文档仍是 mindmap**，结构编辑不受影响；
  转换时要把 `[](){}"|<>` 换成全角，否则会破坏 flowchart 语法。
- 树布局用 `flowchart.useMaxWidth=false` 保留原尺寸，CSS 给 svg `flex: 0 0 auto`
  （否则 flex 容器会把它压扁）；`TB/BT` 渲染后把容器 `scrollLeft` 居中。
- 主题：源码首行写 `%% moread:mindmap theme=<id>` 或 `primary=#.. secondary=#..`，
  与 `layout=`/`direction=` 共用同一行；`readMindmapTheme` / `applyMindmapTheme` /
  `stripMindmapTheme` 负责读写；渲染时 `resolveMindmapColors()` 给出主辅色，
  `mermaidThemeConfig(colors)` 按当前深浅色推导色阶。
  其他 mermaid 渲染器把该行当注释忽略，源码保持可移植。
- 结构编辑：思维导图节点行有输入框 + `＋/✕`，底部操作条按类型切换
  （mindmap：子项/同级/提升/降级/上移/下移/形状/删除；flowchart：节点/连线/删除）。
  操作条按钮的文字在 `renderMermaidStructure()` 里按图种改写，新增操作记得同时加进
  `opConfig`，否则会被当成隐藏按钮。
- 其他图种（sequence/class/state/pie/gantt/journey/er）走 `renderMermaidLineStructure()`：
  每行一条完整 Mermaid 语句，可新增/删除/上移/下移，编辑时只 `pushMermaidStructure()`，
  不要每敲一个字就重建行（会丢光标）。`canStructureEdit()` 对所有已识别图种为 true；
  行编辑器不解析语义，所以不会改写复杂语法，unknown 仍只给源码。
- 行编辑器不要在 `renderMermaidLineStructure()` 里自动 focus（源码面板输入时会被抢焦点），
  只有 add/delete/up/down 操作后再 `focusMermaidLine(index)`。
- 流程图连线：每条连线两个 `select` 直接改起点/终点；「＋ 连线」用
  `openFlowchartEdgeForm()` 在结构列表底部插入临时表单（起点/终点/文字 + 添加/取消，
  回车提交），提交后 `pushMermaidStructure()` + `renderMermaidStructure()` 重建列表。
  孤立节点由 `serializeFlowchart()` 单独输出一行，接上线后自动并入。
- 替换已有图表：`findMermaidBlocks()` 扫描围栏，优先按 `data-source-line` 定位
  （同文档多个相同图表也能改对），退化为内容匹配、再退化为序号；删除时顺带吃掉一个空行。
- 双端：编辑器是纯 DOM 弹窗，≤780px 时上下分栏、按钮加大；Android 上不要依赖 hover，
  触屏用「点行选中 + 底部操作条」。
- 测试提示：`.cm-content` 是虚拟滚动的，`innerText` 只含可视行。验证「源码里是否有某段内容」
  要看保存后的文件（或 harness 的 store），别用 `innerText` 判断（会误报 false）。

### 图表编辑器验收清单

- 双击图表 → 弹窗打开，结构与源码两个面板都有内容，右侧有预览
- 图表标题栏的「编辑」按钮（`.mermaid-edit`）与双击效果一致；触屏上必须可用
- 改名 / 加子项 / 上移下移 / 删除 / 提升 / 降级 → source 同步变化且预览刷新
- 形状下拉、`Enter`/`Tab`/`Shift+Tab` → 结构按预期变化
- 换布局（发散 / 从左到右 / 从上到下）→ 预览方向变化，marker 里出现 `layout=tree`，源码仍是 `mindmap`
- 流程图：＋节点、＋连线（起点/终点/文字）→ 源码新增连线行；改连线端点/文字 → 源码同步；删除节点连带删除其连线
- 换配色 → 预览颜色变化（可读 `svg style` 里的 `.section-0` 规则对比）
- 保存 → 只替换目标代码块；同文档多个相同图表时按行号定位不串
- 可视化模式下编辑 → 节点被替换、`dirty` 置位、切回编辑模式后 Markdown 已更新
- 手机宽度（≤780px）→ 上下布局、操作条不换行溢出

## 响应式与移动端布局（重要）

- **整页只允许一屏宽**。`.app` 必须保留 `grid-template-columns: minmax(0, 1fr)`：
  它以前只有行定义，隐式 `auto` 列会按子项的 max-content 撑到 500px+，
  在 360–440px 的手机上表现为整页横向溢出、内容被裁掉。不要改回 `width: 100vw`，
  也不要在 `.app` / `.shell` / `.workspace` 上引入新的 `min-width: auto`。
- 横向兜底：`html { overflow-x: clip }`、`body { overflow: hidden }`、`.app { width: 100% }`。
  宽内容（代码块、宽表格）必须在自己的滚动容器里滚，不能把页面撑宽。
- **窄屏要收纳按钮，不是靠横向滚动**：
  - ≤760px 标题栏把「主题工作室 / 帮助 / 设置」收进 `#appMenuBtn` 的 `#appMenu`，
    只留主题切换与更多；`#appMenu` 的按钮通过 `data-app-action` 转发现有按钮。
  - ≤760px 格式栏不再平铺图标，而是**几个下拉触发 + 撤销/恢复/保存**：
    标题级别（`#headingSelect`）、格式（`#formatMoreBtn` → `#formatMenu`）、颜色
    （`#colorTrigger`）、插入（`#insertBtn`）、插件（`#pluginMenuBtn` → `#pluginMenu`）、
    撤销/恢复、保存。加粗 / 斜体 / 行内代码 / 链接 / 列表 / 引用 / 任务 / 删除线 / 公式
    全部收进 `#formatMenu`（`data-format-menu` → `applyFormat`）；不要再把单个格式按钮
    放回窄屏栏。
  - 插件入口在格式栏：桌面端 `#formatPlugins` 为每个插件渲染一个带 `iconUrl` 的图标按钮，
    各自打开自己的菜单；≤760px 隐藏这排图标，只留 `#pluginMenuBtn`（插头 + 「插件」）
    打开按插件分组的全量菜单。`#customDock` 仅用于用户 / 主题包自定义按钮。
  - 插件图标是**安装必填项**：`plugin.json` 的 `icon` 指向插件目录内的 SVG/PNG/JPEG/WebP
    （≤512 KB），`installFromZip()` 会拒绝缺失/越界的图标；目录形式的旧插件只有字符图标时
    用 `plugin.icon` 回退，不要把它当新插件规范。
  - 格式栏保留 `flex-wrap: wrap` 作兜底，但目标是一行放下；**不要**改回
    `overflow-x: auto`（横向滚动会把撤销 / 恢复 / 保存推出屏幕）。
  - `.shortcut-hint` 在手机端隐藏；`[data-compact]` / `.platform-android` 下
    `--window-controls: 0`，不再预留窗口按钮宽度。
- 断点约定：`760px` 手机单栏（单栏面板、格式栏下拉化、状态栏精简、设置项纵向堆叠）、
  `620px` 侧栏抽屉（再窄就放不下 238px 侧栏 + 可用编辑区）、
  `420px` 小屏（品牌文字隐藏、按钮 30px、正文内边距收紧）。
  `[data-compact]` 只放 Android 专属差异，宽度适配一律用媒体查询，桌面窄窗口同样受益。
- 宽表格：≤760px 用 `.markdown-body table { display: block; overflow-x: auto }`，
  让表格自身横向滚动；不要给 `.table-shell` 加 `overflow`，否则悬停工具条 `top: -33px` 会被裁掉。
- 弹窗：≤760px `width: calc(100vw - 16px)`、`max-height: calc(100dvh - 16px)`；
  设置项、帮助快捷键、主题工作室的网格都要在窄屏改成单列或「标签 + 控件」两列。
- 验证方式：`scripts/android-harness` 起假 Capacitor 环境，用 CDP 在 320 / 360 / 416 / 1200
  宽度下检查 `document.documentElement.scrollWidth === clientWidth`，并截图确认观感；
  真机安装 debug 包后按「欢迎页 → 阅读 → 编辑 → 抽屉 → 各弹窗」逐屏看一遍。

## 侧栏与大纲

- 侧栏的开合统一走**左上角品牌按钮** `#brandBtn`（点击 / Enter / 空格）→ `toggleSidebar()`；
  不要新增标题栏或标签栏里的侧栏按钮。`applySidebar()` 同步 `sidebar-collapsed`、`inert`、
  `aria-hidden` 与品牌的 `aria-expanded` / title。
- 侧栏只在**放不下时**变抽屉：`@media (max-width: 620px)` 才把 `#sidebar` 改成 fixed
  overlay；620–760px 仍是正常的两列（238px + 内容），不要提前隐藏。
- `#brandBtn` 在窄屏抽屉打开时会被抽屉盖住，靠点击遮罩（workspace 的 `::before`）关闭；
  workspace 上的捕获监听只在 `(max-width: 620px)` 且侧栏展开时生效，宽屏不能吞掉点击。
- 从抽屉里打开文档 / 笔记后调用 `closeDrawerOnNarrow()` 收起抽屉，但不要写回设置
  （自动收纳不是用户偏好）。`Ctrl+Shift+B` 仍然可用。

- 「最近打开」「收藏夹」「笔记夹」「文档大纲」的折叠状态存在设置里
  （`recentCollapsed` / `favoritesCollapsed` / `notesCollapsed` / `outlineCollapsed`），
  由 `applySidebarSections()` 统一套用，不要只切 class 不存设置。
- 大纲编号按标题层级实时计算（`1` / `1.1` / `1.1.1`），最多算到 6 级；
  渲染时把编号放进 `.outline-num`、标题放进 `.outline-text`，便于单独控制省略与样式。
- 大纲的逐级折叠状态保存在每个文档对象的 `doc.outlineCollapsed`（`Set`）里，
  由 `toggleOutlineHeading()` 读写、`updateOutline(true)` 重建；不要写进全局设置，
  否则切换文档时不同文档的折叠状态会互相污染。折叠时必须隐藏整棵子树（含已折叠孙级），
  展开父级后子级仍保持自己的折叠状态。
- 每个**有子标题**的层级都必须渲染 `.outline-toggle`（叶子用 `.outline-toggle-space` 占位）；
  触屏下用 `@media (pointer: coarse)` 放大到 20×22px，`[data-compact]` 下 hover 才出现的
  按钮（`清空` 等）要常显，否则手机上找不到。
- 大纲标题下的「展开全部 / 收起全部」由 `setOutlineCollapsedAll(collapsed)` 处理：
  收起时只把**有子标题**的层级 id 放进 `doc.outlineCollapsed`，展开时清空；仍按文档存状态，
  不要改成全局开关。没有标题时两个按钮 `disabled`。

## 收藏夹、笔记夹与分享

- **收藏夹只存路径**：`favorites: [{ path, name, addedAt }]`，不存正文、不做副本；
  点击只负责 `openPath(path)`，取消收藏走 `favorites:remove`。
- 收藏入口有两个：`收藏当前`（当前文档）与 `添加路径…`（`favorites:pick`，桌面多选文件、
  Android `pickFiles`，**只返回路径不读正文**，不要复用 `openDialog` 把整篇文件读进来）。
  收藏行必须同时显示名称与路径，否则同名文件无法区分。
- **笔记夹存文件**：`noteEntries` 只存元数据（`type/name/parentId/path/updatedAt`），
  正文必须落成真实的 `.md` 文件。桌面在 `<userData>/notes/<id>.md`，Android 在
  应用私有目录 `files/notes/<id>.md`（`writeAppFile`）；不要把 note 正文写回设置。
- 笔记文件按 id 命名，显示名来自元数据；打开笔记后要把文档的 `doc.name` 改回
  `noteLabel(entry)`，保存时不要被文件 basename 覆盖；笔记不进入“最近打开”。
- 删除文件夹要递归删除子笔记与对应文件；导出 ZIP 按文件夹层级命名。
- 分享：Android 用 `shareFile()` → 原生 `shareSaved`（FileProvider + 系统分享面板），
  文本分享用 Capacitor Share；桌面 `share:text` 只复制到剪贴板，**不要**再自动拉起
  `mailto:`（本机可能没有邮件客户端，旧实现会在无响应后报错）。
- Android 调试：`npm run android:debug` 会调用 `scripts/android-debug.ps1`，用 JDK 21
  构建 debug APK、安装、启动并把 WebView devtools socket 转发到 `9333`；
  连接 `http://127.0.0.1:9333/json` 即可用 CDP 调试（设备需保持解锁/亮屏）。

## Android 构建

- 渲染层通过 `src/renderer/platform/index.js` 拿 `api`：Electron 下直接返回
  `window.moread`，Android 下用 `android.js` 的 Capacitor 实现，不要再直接写
  `window.moread`。
- 自定义插件 `MoReadFiles`（`android/app/src/main/java/com/moread/markdown/`）
  负责 SAF 打开/保存、应用私有文件、打开链接、系统打印；在 `MainActivity` 里
  `registerPlugin`，Manifest 已声明 `ACTION_VIEW` 的 `.md` intent-filter。
- 构建必须用 **JDK 21**：JDK 25 会报 `Unsupported class file major version 69`。
  设置 `JAVA_HOME` 与 `ANDROID_HOME`（本机 SDK 在 `D:\dev\tools\android-sdk`）。
- `services.gradle.org` 在本机下载会卡住，`android/gradle/wrapper/gradle-wrapper.properties`
  已改到腾讯镜像；`android/build.gradle` 里也加了阿里云 Maven 镜像。
- 改完渲染层要跑 `npm run android:sync`（build + cap sync + 删 sourcemap），
  再 `npm run android:release`；debug 包在 `android/app/build/outputs/apk/debug/`。
- 签名材料 `android/keystore.properties`、`*.jks` 已 gitignore；换机器需要重新生成或从备份恢复。
- 无 Android 设备时可用 `scripts/android-harness`（Electron + 伪造 Capacitor 插件）做启动/编辑/保存冒烟测试：
  `electron scripts/android-harness --user-data-dir=scripts/android-harness/profile --remote-debugging-port=9225`。
- 平台差异：插入图片走 data URL（上限 300 KB）、PDF 走系统打印、相对路径图片不可用，
  README 的「Android 端差异」表随改动同步。
- 大文件 Base64 不要用 `atob`：在 Electron/Android WebView 里对约 2 MB 的主题包调用
  `atob` 会直接把渲染进程搞崩（日志停在解码前）。`android.js` 已改成手写查表解码，
  并跳过换行；`bytesToBase64` 保持分块 `String.fromCharCode`，不要再引入大字符串中间态。
- 平台适配层里**不要对 `path` 做字符串操作前先假设它是 string**：新建文档的
  `doc.path` 是 `null`（不是 `""`），解构默认值不会生效，`path.startsWith(...)`
  会抛 `Cannot read properties of null`，表现就是「新建文档无法保存」。
  统一先 `String(payload.path || "")`。
- Android 保存必须保留三层兜底，改动时别把它简化回单路径：
  1. `write(uri)` 原地写（SAF 有写权限时）；
  2. 写失败（多为只读授权）→ `createDocument()` 另存为，结果带 `notice` 让 UI 提示；
  3. 另存为不可用（`NO_SAVER`）→ `shareSaved()` 写入 `files/saved/` 并拉起分享面板。
  第 3 步依赖 `res/xml/file_paths.xml` 里的 `<files-path>`；漏了会
  `FileProvider ... failed to find configured root`。
- 从其它应用打开的文件通常只有只读授权，`pick()`/`create()` 的 Intent 要带
  `FLAG_GRANT_WRITE_URI_PERMISSION`；`openOutputStream` 依次尝试 `wt`/`w`/`rwt`，
  各家 provider 支持的模式不一样。
- 点击 `.zip` / 分享到应用时的路由：插件 `initial()` 与 `documentOpen` 事件带上
  `mime`，`android.js` 的 `routeIncoming()` 把 zip 交给 `onThemePath`，其余交给
  `onOpenPaths`；因此 `.zip` 会直接走主题包导入确认。
- 系统文档选择器可能不存在（HarmonyOS 兼容层）：`pickFiles()` 会先试
  `ACTION_OPEN_DOCUMENT`，再退 `ACTION_GET_CONTENT`，最后退到 WebView 的
  `<input type="file">`；从 input 拿到的文件以 `webfile://` 伪 URI 参与读取，
  保存时走“另存为”分支。
- Capacitor 通过 `addDocumentStartJavaScript` 注入桥接脚本（现代 WebView）；
  极旧 WebView 会退回内联 `<script>`，会被我们的 CSP（无 `unsafe-inline`）拦截，
  表现为 `window.Capacitor` 不存在、文件功能不可用。遇到此类设备先升级 System WebView。

## 悬停浮层（表格工具条）

- 浮层与宿主之间只要有 1px 空隙，`:hover` 就会断开；而「显示后才可点」会让
  浮层在指针移过去之前就消失，形成死循环。
- 现有做法：`pointerenter` 打开、`pointerleave` 延迟 320ms 关闭、进入浮层取消
  关闭；同时 CSS 保留 `:hover` 与 `.table-toolbar-open` 两种打开条件。
- 表格编辑后预览会重建 DOM，用 `state.lastPointer` + `keepToolbarUnderPointer()`
  在新浮层上恢复打开状态；编辑时保持两侧滚动位置不变，避免浮层从指针下移走。
