# 变更记录（按轮次）

> 按时间顺序记录每一轮「改了什么、为什么、验证了什么」，最新在最后，只追加不改写。
> 项目事实（架构 / 数据 / 限制 / 验证方式）以 [`docs/项目说明.md`](docs/项目说明.md) 为准，
> 文档该读哪份、改完同步哪份见 [`docs/README.md`](docs/README.md)。

## 早期修复：编辑器、大纲、Mermaid

### 做了什么

- 修正编辑器行号显示：保留 CodeMirror 原生行号与滚动容器布局，避免编辑区内容居中时行号跟随内容错位。
- 移动端编辑工具栏增加撤销、恢复按钮，并接入 CodeMirror 的 `undo` / `redo` 命令。
- 保存提示继续使用统一的 toast 状态样式，成功、普通提示、错误提示分别保持稳定颜色，不因保存状态切换而复用错误色。
- 文档大纲的“展开/收起”入口已按章节级别保留，侧栏大纲和最近打开区域使用独立折叠状态。
- Mermaid 已支持双击图表进入编辑器，可在源码/结构化界面修改并保存，修改后的源码会回写 Markdown。
- 分割线入口保留在“插入内容”菜单，移除主格式栏中的重复入口，避免歧义。

### 怎么实现

- `src/renderer/app.js` 使用 CodeMirror history 扩展和 `undo(view)` / `redo(view)` 命令；工具栏按钮通过事件绑定调用，并在编辑器更新时刷新按钮状态。
- `src/renderer/index.html` 增加 `undoBtn`、`redoBtn`，同时删除主格式栏重复的分割线按钮；插入菜单中的分割线按钮继续可用。
- `src/renderer/icons.js` 增加 undo/redo SVG 图标。
- 大纲由 `extractHeadings()` 统一生成，`updateOutline()` 渲染，`applySidebarSections()` 维护每个侧栏分区的展开状态。
- Mermaid 编辑逻辑集中在 `openMermaidForFigure()`、`commitMermaidEditor()` 和预览渲染流程中，双击预览图表触发。

### 验证

- 已运行渲染器构建命令进行语法检查；源码级编译通过，最终写入 `dist/renderer.js` 时受到当前工作区文件权限限制（`dist` 目录拒绝覆盖），未修改已有发布产物。


## 收藏夹、笔记夹与分享（第一版）

- 收藏夹：新增 `favorites` 持久化数组，可收藏当前已保存文档路径，侧栏点击后直接打开。
- 笔记夹：新增 `noteEntries` 数据模型，支持文件夹/笔记条目及父子层级字段；当前 UI 已提供新建文件夹入口。
- ZIP 导出：桌面端使用现有 `writeZip` 生成压缩包，导出笔记条目为 Markdown 文件。
- 分享：桌面端复制文本并通过 `mailto:` 打开系统邮件分享入口；移动端继续复用平台层的分享能力。
- UI：侧栏新增“收藏夹 / 笔记夹”区域，提供收藏当前、新建文件夹、导出 ZIP 操作；移动端保留撤销/恢复按钮。

## 修复：收藏夹 / 笔记夹、图标、撤销恢复、主页、示例插件

- 侧栏：补回 `#outlineSection` 分区容器，`applySidebarSections()` 与 `toggleSidebarSection()` 增加 `library` 分支，`libraryCollapsed` 写入设置；收藏夹 / 笔记夹与大纲的展开、收起都会记住状态。
- 图标：`icons.js` 补上缺失的 `plus`，新建文档、插入内容等按钮不再空白。
- 格式栏：修复未闭合的 `<button>` 标记导致“撤销 / 恢复”按钮丢失，两个按钮在桌面与移动端都显示；按钮的可用状态按 CodeMirror 的 `undoDepth` / `redoDepth` 实时更新。
- 主页：标题栏新增 `#homeBtn`，文档打开时也能切换到欢迎页 / 自定义主页；再次点击或按 `Ctrl Shift H` 回到文档，打开或新建文档会自动退出主页。
- 插件：修复 `normalizeManifest()` 丢失插件目录导致入口无法加载、`refreshPlugins()` 判断了不存在的 API、Markdown 自定义元素属性解析与占位符替换的正则转义错误；插件元素现在可以携带 `<style>`。
- 示例插件：新增 `plugins/moread-sample/`，演示 `[note title=... content=...]` 提示卡元素与“插入提示卡 / 插入日期”两个脚本按钮；已加入打包文件列表。
- 顺带修复：preload 补上 `getSettings()`，主进程补上 `associations:status`，渲染层订阅 `onOpenPaths`，否则命令行打开文件与设置读取都会失效。
- 大纲逐级下拉：每个有子标题的大纲项前增加折叠箭头，点击展开 / 收起它的整棵子树；折叠状态保存在各自文档的 `doc.outlineCollapsed` 中，互不干扰，父级重新展开后子级仍保留自己的折叠状态。

## 收藏夹 / 笔记夹重构、分享与 ADB 调试

- 侧栏拆成独立的「收藏夹」和「笔记夹」两个分区，分别记住 `favoritesCollapsed` / `notesCollapsed`。
- 收藏夹只存路径：收藏当前、点击打开、行尾 `×` 取消；Android 用 localStorage 持久化，桌面写 `settings.json`。
- 笔记夹改为真实文件存储：桌面 `<userData>/notes/<id>.md`，Android `files/notes/<id>.md`；`noteEntries` 只保留元数据，旧版 `content` 在首次读取时自动迁移。
- 新增完整笔记操作：新建笔记 / 文件夹、嵌套、折叠、打开、重命名、分享、递归删除、按文件夹层级导出 ZIP；笔记用显示名做标签名，不进入「最近打开」。
- 分享：更多菜单分享当前文档，笔记菜单分享单篇；Android 走 `shareSaved`（FileProvider + 系统分享面板），桌面 `share:text` 改为复制到剪贴板（移除自动 `mailto:`）。实测系统分享面板能看到正确的 `.md` 文件名。
- 顺带修复：格式栏保存按钮没有绑定事件；`shareFile` 提示改成「已打开分享面板」。
- ADB：新增 `scripts/android-debug.ps1` / `npm run android:debug`，用 JDK 21 构建 debug APK、`adb install`、启动并把 WebView devtools 转发到 `9333`；已在真机（Android 17，型号 M511CD）通过 CDP 完成笔记、文件夹、收藏、分享的验证。

## 插件系统 P0+P1：脚本确认、安装/卸载与热重载

- P0 安全：主题包导入时如果内含脚本按钮，会单独确认（可选择「仅导入外观」）；任何脚本按钮第一次运行前都会弹出确认框，显示脚本内容和来源（插件 / 主题包 / 自定义），可以「仅运行一次」或「信任并运行」，信任名单存 `settings.trustedButtons`。
- P0 净化：插件元素里由**文档属性**填入 CSS 的部分改为净化后替换（去掉 `;`、`{}`、`<>`、`url(`、`@import`、`expression(` 等）；按占位符所在的 HTML 上下文判断——落到 `style="..."` 里的值按 CSS 净化，普通文本仍只做 HTML 转义。恶意 Markdown 无法再借属性注入 `position:fixed` 之类的全局/悬浮样式；插件 CSS 文本同时去掉网络导入；HTML 分支继续走 DOMPurify。
- 可靠性：`plugin.json` 允许带 UTF-8 BOM（Windows 记事本常见），安装包与目录扫描都会先剥离 BOM 再解析。
- P1 安装/卸载/更新：`设置 → 插件管理` 可安装 `.zip` 插件包（写入用户插件目录，冲突时确认覆盖即更新），用户安装的插件可卸载，可打开插件目录；主进程新增 `plugins:install|uninstall|open-folder`。
- P1 可见性：插件列表显示「内置 / 用户安装」「已启用 / 已停用」「未加载 / 加载失败」和失败原因；`plugins.js` 记录每个插件的加载错误。
- P1 热重载：`plugins:reload` 改为 `PluginManager.refresh()`（先卸载全部已加载插件，再重扫并重新执行入口脚本），改 `index.js` 后点「重新扫描」即可生效，文档与实现一致。
- 顺带修复：插件按钮统一合并为 `plugin:<插件 id>:<按钮 id>`；`sanitizeCustomButtons` 保留 `origin` / `placement`；切换主题包后会重新合并插件按钮，插件按钮不再被主题包覆盖掉；没有按钮的主题包也不再清空用户已有按钮。
- 验证：新增 `scripts/test-plugins.js`（`npm run test:plugins`）覆盖发现/加载/停用/热重载/zip 安装冲突与覆盖/路径穿越拒绝/卸载；`npm run build` 通过；用 CDP 冒烟验证了插件列表标签、脚本按钮首次确认与信任后不再询问、主题包脚本按钮的「仅导入外观 / 导入并信任」、zip 安装/卸载与冲突、BOM 插件、坏插件错误展示、属性注入 CSS 被中和。文档同步更新（插件制作指导、项目说明、README、示例插件 README）。
- 清理：删除根目录残留的 `plugin-styles.tmp`。

## 笔记夹图标、插件资源与「更多分割线」示例

- 笔记夹：去掉每行开头的 📁/📝 图标，只保留缩进、名称与「⋯」菜单；收藏夹的 ★ 保留。
- 插件资源：`plugin.json` 新增 `resources: { key: 相对路径 }`（最多 32 个、单文件 8 MB）。主进程校验相对路径、`..`、绝对路径与 realpath 越界，把有效项转成 `file://` URL 通过 `plugins:list` 交给渲染层；渲染层在元素 HTML/CSS 里替换 `{resource:key}`（HTML 走转义、CSS 直接替换），未声明或缺失的资源渲染为空。
- 示例插件：新增 `plugins/moread-dividers/`「更多分割线」，提供 `[hr style=wave|dots|double]` 与三个插入按钮；用两张 SVG 资源与 CSS `mask-image` 演示资源引用，颜色跟随主题 `--accent`/`--line`。
- 测试：`scripts/test-plugins.js` 覆盖资源归一化、`file://` URL 暴露、缺失/越界资源丢弃、zip 安装时资源一并落盘。
- 验证：`npm run test:plugins`、`npm run build` 通过；CDP 冒烟确认笔记夹不再渲染图标、分割线三种样式按资源渲染、资源 SVG 能在渲染层正常加载（40×12 / 16×12）。

## 插件元素进入编辑栏

- 格式栏在「+」后新增插件按钮区：每个启用且声明了 `elements` 的插件对应**一个**按钮（图标取 `plugin.json` 的 `icon`，缺省 `✦`）；点开菜单列出该插件的元素（label + description），点选把带 `defaults` 的 `[name key="value"]` 插到光标处，可视化模式走文本插入。
- `plugin.json` 新增可选 `icon` 字段（≤8 字符），两个示例插件分别使用 `▣` / `≈`。
- 菜单接入统一的弹出层定位、外部点击关闭与 Escape 关闭；停用/卸载/安装/重扫后按钮即时更新（`applyPlugins` → `renderFormatPlugins`）。
- 验证：构建通过；CDP 确认编辑栏出现 2 个插件按钮、菜单标题与条目正确、点选插入 `[hr style="wave"]`、停用插件后按钮 2→1、重新启用 1→2；截图核对布局（菜单宽度、图标与描述换行正常）。

## 插件元素插入表单（fields）

- 元素可声明 `fields`（最多 16 个）：`text` / `textarea` / `color` / `select`（带 `options`）/ `number` / `boolean`，支持 `label`、`placeholder`；主进程在 `normalizeManifest` 里校验字段键与类型，非法项丢弃。
- 编辑栏菜单点选元素后弹出 `#pluginElementDialog`：按字段生成输入控件（取色器、多行文本、下拉），确认后把 `[name key="value"]` 插到光标处；未声明 `fields` 时按 `defaults` 自动推导（`*color*` → 取色器、长文本 → 多行、数字/布尔按类型）。
- 两个示例插件补上字段：提示卡（标题/内容/强调色）、更多分割线（样式下拉：波浪/圆点/双线）。
- 细节：自定义元素是行内语法，多行输入压成一行、双引号转义；清空字段写成 `key=""`；无字段元素仍然直接插入；无打开文档时先提示。
- 验证：`npm run test:plugins`（含 fields 归一化断言）、`npm run build` 通过；CDP 冒烟确认分割线下拉选 dots 后插入 `[hr style="dots"]`、提示卡表单填标题/内容/颜色后插入 `[note title="自定义标题" content="这是通过 UI 编辑的内容" color="#336699"]`，对话框关闭与草稿清理正常。

## 内置指南笔记与版本打包

- 新增 `docs/介绍.md`、`docs/使用指南.md`；`docs/主题包制作指南.md` 更名为 `docs/主题包制作指导.md`，全仓库引用同步。
- `scripts/build-guides.js` 把四份指南（介绍 / 使用指南 / 插件制作指导 / 主题包制作指导）生成 `src/renderer/guides.generated.js`；`npm run build` 先跑 `build:guides`，桌面与 Android 共用同一份产物。
- 首启种子：`seedGuideNotes()` 在启动时通过 `createNote({name, content})` 把四篇指南写进笔记夹（桌面 `<userData>/notes/`，Android 应用私有目录），按名字去重，完成后置 `guidesSeeded`；用户删除后不再自动恢复。
- 版本：桌面 `1.0.2`（NSIS），Android `1.0.9`（versionCode 10）。
- 打包：`npm run dist` → `release/MoRead-Setup-1.0.2.exe`；Android 用 `JAVA_HOME=JDK 21` + `ANDROID_HOME=D:\dev\tools\android-sdk` 跑 `npm run android:release`，新增 `scripts/copy-android-apk.js` 按 versionName 把签名 APK 复制到 `release/`。
- 验证：
  - fresh profile 首启后笔记夹出现四篇（文件已落盘），重启不重复；打开「介绍.md」正常渲染。
  - 打包版（win-unpacked + `--user-data-dir`）CDP 冒烟：笔记夹四篇齐全、编辑栏两个插件按钮、`[hr style=wave]` 与 `[note ...]` 正常渲染，插件资源从 `app.asar` 内的 `file://` 加载成功（wave.svg 40×12）。
  - APK 经 `apksigner verify` 通过（证书 CN=MoRead），`aapt2 dump badging` 显示 versionName 1.0.9 / versionCode 10；`assets/public/renderer.js` 已包含内置指南（esbuild 输出为 `\uXXXX` 转义）。
  - `npm run test:plugins`、`npm run build` 通过。

## 移动端撤销/恢复、行号对齐、提示色与收藏夹补全

### 根因与修复

- **行号错位**：CodeMirror 的 base theme 用 `.ͼ1 .cm-content` 覆盖了我们的 `.cm-content { padding }`（实际生效的是 `4px 0`），而 `.cm-gutters` 又自己写了 `padding-top: 26px`；CM 已按 `documentPadding.top` 给 gutter 元素算好偏移，等于加了两遍，整列行号比正文低 26px。现在 `.cm-content` 的 `padding` 与 `.cm-scroller` 的 `line-height` 都加 `!important` 抢回设计值，行号栏 `padding-top` 归零；CDP 实测每行文本与行号 `top` 差值为 0。
- **移动端撤销/恢复**：可视化模式（contenteditable）的编辑不会进入 CodeMirror history，`updateHistoryButtons()` 按 `undoDepth()` 判断导致两个按钮一直 `disabled`，`undo(view)` 也改不动预览。新增 `runHistory()`：可视化模式先聚焦 `#preview` 再 `document.execCommand('undo'|'redo')`，成功后置脏并 `scheduleVisualSync()`；按钮在可视化模式下保持可用。CDP 在桌面与 Android harness 都验证了「输入 → 撤销 → 恢复 → 再撤销」后 Markdown 与保存状态一致。
- **移动端格式栏**：≤760px 仍是单行 + `overflow-x: auto`，360px 下撤销 / 恢复勉强可见、保存按钮被挤出屏幕。改成 `flex-wrap: wrap`，360px 下变成两行、`scrollWidth === clientWidth`，撤销 / 恢复 / 插入 / 保存全部在屏内。
- **提示颜色**：保存成功走 `toast.success`，但此前只有图标变色，背景与普通提示一样是 `--ink`。改为 `background: var(--green)` + `color: var(--paper)`，深浅色主题下都取主题绿；CDP 实测浅色 `#4f7d60`、深色 `#7aa284`。
- **Mermaid 编辑入口**：之前的入口只有预览 `dblclick`，触屏上不可发现。`mermaidBlockHtml()` 在标题栏新增「编辑」按钮（`.mermaid-edit`），`handlePreviewClick()` 复用 `openMermaidForFigure()`；双击仍然保留。CDP 验证两个图表都有「编辑 / 源码 / 复制」，点「编辑」能打开编辑器并带回源码。
- **分割线入口**：确认 `#insertMenu` 保留「分割线」，格式栏 / `#formatMenu` / `#moreMenu` / `#appMenu` 都没有重复入口（CDP 计数 `formatBarHr=0`）。
- **大纲逐级展开/收起**：源码本来已按「有子标题才渲染 toggle」实现，逐级折叠、父子状态互不影响；本轮补上两处：`setOutlineCollapsedAll()` + 大纲标题下的「展开全部 / 收起全部」（只收起有子标题的层级，状态仍按文档保存），以及触屏可用性——`@media (pointer: coarse)` 把 `.outline-toggle` 放大到 20×22px，并让 `[data-compact]` 下原本 hover 才出现的文本按钮常显。

### 功能补全

- **收藏夹可添加路径**：新增主进程 `favorites:pick`（多选文件对话框，只返回路径）与 preload `pickFavorites`；Android 适配层用 `pickFiles` 实现同名方法。侧栏收藏夹改为「收藏当前 / 添加路径…」两个常显按钮，条目显示「文件名 + 完整路径」两行，并加 `favoriteCount`。
- **笔记夹层级**：文件夹「⋯」菜单新增「新建子文件夹」（此前只能建根级文件夹，嵌套层级没有 UI 入口）；配合已有的「新建子笔记」可在任意深度继续嵌套。
- 分享沿用既有实现（桌面复制正文、Android `shareFile` / Share 面板），本轮回归验证通过。

### 验证

- `npm run build` 通过（esbuild bundle + 指南 + vendor）。
- 桌面 dev（`start-dev.ps1 -DebugPort 9223`）：行号对齐断言、可视化撤销/恢复、保存 toast 深浅色、Mermaid「编辑」按钮、插入菜单分割线、收藏/笔记嵌套、分享剪贴板逐项通过。
- Android harness（`scripts/android-harness`，416×838）：可视模式格式栏 `scrollWidth === clientWidth`、撤销/恢复可用、收藏夹两个按钮常显。
- 截图：`tmp/shot-desktop2.png`、`tmp/shot-360c.png`、`tmp/shot-android-visual.png`（临时验证文件，未纳入版本库）。

> 环境注记：本轮开始时 `src/`、`dist/` 等目录被 Windows 文件权限挡住（无法构建），已用 `diagnose-windows-sandbox-acl` 修复 ACL 后继续；与产品代码无关。

## 插件入口移入格式栏、移动端下拉工具栏与侧栏开合

### 插件图标与按插件分组的入口

- 插件入口在**格式栏**，既不进标题栏也不进右下角浮动区。
  - 桌面（>760px）：`renderPluginButtons()` 在 `#formatPlugins` 里为**每个插件渲染一个自己的
    图标按钮**，点开只列该插件的元素与脚本按钮（`openPluginMenu([plugin], button, key)`）。
  - 手机（≤760px）：隐藏这排图标，只保留 `#pluginMenuBtn`（插头 + 「插件」），下拉按插件
    分组列出全部动作。
- 插件图标改为**文件**：`plugin.json` 的 `icon`（或单独的 `iconFile`）指向插件目录内的
  SVG / PNG / JPEG / WebP；`normalizeIconFile()` 校验路径，`iconUrl()` 转 `file://` 并限制
  512 KB。渲染层 SVG 用 `mask-image`（`--plugin-icon`）跟随主题文字色，位图用 `<img>`；
  旧版字符 / emoji 仍作为目录插件的回退。
- 安装校验：`installFromZip()` 在解包前检查 `iconFile` 非空且压缩包里确实存在该文件，
  缺失/越界直接拒绝。两个内置示例插件都补了 `assets/icon.svg` 并改 `icon` 指向它。
- `syncPluginButtons()` 只清理 `settings.customButtons` 里旧的 `plugin:` 条目；
  `customButtons` 只保留用户 / 主题包自定义按钮，浮动区只服务这些按钮。
- 删除了标题栏插件入口、`#appMenuPlugins` 与旧的 `renderFormatPlugins()`。
- 窄屏插件入口留在格式栏同一行，不再额外加一行或进入「更多」菜单。

### 移动端格式栏

- ≤760px 不再平铺图标：只保留「标题级别 / 格式 / 颜色 / 插入 / 插件」几个下拉触发 +
  撤销、恢复、保存；加粗、斜体、删除线、行内代码、链接、列表、引用、任务全部
  进 `#formatMenu`（`data-format-menu` → `applyFormat`）。
- `#formatMoreBtn` 在窄屏显示文字「格式」，桌面仍是 `⋯` 图标。
- 320 / 360 / 416px 实测工具栏一行放下、`scrollWidth === clientWidth`，撤销 / 恢复 /
  保存与插件按钮全部可见。

### 侧栏开合

- 移除标题栏 `#mobileSidebarBtn` 与标签栏 `#sidebarToggle`，改为点击左上角品牌
  `#brandBtn`（点击 / Enter / 空格）调用 `toggleSidebar()`；`applySidebar()` 同步
  `aria-expanded` 与 title。
- 侧栏只在放不下时变抽屉：抽屉规则从 `760px` 移到新的 `@media (max-width: 620px)`；
  620–760px 保持 238px + 内容两列，不再提前隐藏。
- 启动时若窗口 <620px，侧栏默认收起（不写回设置）；跨断点时由 `matchMedia` 自动
  收起 / 展开。workspace 的捕获点击只在抽屉模式关闭侧栏；从抽屉打开文档后调用
  `closeDrawerOnNarrow()` 收起抽屉。

### 其他修复

- 编辑模式限宽从 `.cm-content` 移到 `.cm-editor`：此前只给正文加 `max-width: 900px`
  并居中，行号栏留在面板左缘，视觉上像横向错位；现在行号栏与正文一起居中。
- `#brandBtn` 放在标题栏拖拽区域内，补了 `-webkit-app-region: no-drag`；
  窄屏抽屉从标题栏下方（48px + 安全区）开始，左上角图标始终可点，能再次关掉抽屉。

### 验证

- `npm run build`、`npm run test:plugins` 通过。
- 桌面 1440：格式栏出现 3 个**不同的插件图标**（波浪 / 办公 / 提示卡 SVG），各自只打开
  自己的菜单；脚本项能弹出运行确认，元素项能打开插入表单，`commands` 命令也在该菜单里；
  标题栏没有插件入口，浮动区为空。
- 700px：侧栏保持两列（238px），格式栏为下拉模式，桌面插件图标仍在。
- 360 / 320px：侧栏抽屉关闭，点左上角品牌打开、点内容区关闭；格式栏一行放下
  标题 / 格式 / 颜色 / 撤销 / 恢复 / 插入 / 插件 / 保存，`scrollWidth === clientWidth`。
- Android harness（416）：同样的抽屉与下拉行为，插件总菜单可打开，可视化模式撤销/恢复仍正常。
- `npm run test:plugins`：新增图标断言（`iconUrl` / `iconType`、缺图标与图标文件缺失的安装拒绝）。
- 截图：`tmp/shot-final3-desktop.png`、`tmp/shot-office-plugin-menu.png`、
  `tmp/shot-plugin-one-menu2.png`、`tmp/shot-v3-edit.png`、`tmp/shot-final-700.png`、
  `tmp/shot-icons-final-360.png`、`tmp/shot-android-layout.png`。

## 可视化光标与更多 Mermaid 图种

### 光标落在原子块之后

- 图表 / 公式 / 代码块 / 表格 / `hr` 渲染成 `contenteditable=false` 的原子块，浏览器无法把
  光标放到它们后面（尤其是文档末尾或两个块之间）。`ensureVisualCaretSpacers()` 在进入
  可视化模式时给每个**顶层**原子块后补一个 `.visual-caret-spacer` 空段落，作为可点击的光标落点。
- 空 spacer 在 `serializeVisualMarkdown()` 里删除；用户在里面输入后按普通段落保留。
  不给列表 / 引用内部的原子块补 spacer，避免往返改变 Markdown 结构；CSS 用
  `.visual-canvas .visual-caret-spacer` 压掉 `.markdown-body p` 的大间距。

### 其他 Mermaid 图种

- `canStructureEdit()` 对所有已识别图种返回 true：`mindmap` / `flowchart` 继续使用节点级
  结构树与连线编辑；`sequence` / `class` / `state` / `pie` / `gantt` / `journey` / `er`
  使用新增的 `renderMermaidLineStructure()` 逐行结构编辑。
- 每行一条完整 Mermaid 语句，支持「＋ 行 / 上移 / 下移 / 删除」，行内输入只
  `pushMermaidStructure()` 更新源码与实时预览，不重建行；新增/删除/移动后才
  `renderMermaidStructure()` 并 `focusMermaidLine()`。源码面板输入后不会抢走焦点。
- 行编辑器故意不做语义解析，因此不会改写子图、classDef、循环等复杂语法；未知图种仍只给
  源码面板。

### 附带修复

- 插件的 `commands`（导入 / 导出 / 工具）现在也计入 `pluginHasActions()`，并渲染进标题栏
  格式栏的插件图标菜单；`plugins/moread-office` 因此有自己的图标入口，三个示例插件都显示
  独立图标。
- 命令项优先使用语义图标名（`file-down` / `printer` / `minus`），找不到再回退到命令自带的
  字符或插件图标。

### 验证

- `npm run build`、`npm run test:plugins` 通过。
- 可视化模式：第一个 mermaid 后出现 `.visual-caret-spacer`，在其中输入「块后文字」，
  切回编辑模式后内容出现在 `sequenceDiagram` 代码块之后。
- 时序图编辑器：结构页 5 行，点「＋ 行」后新增 `A->>B: 消息`，改成新文案并保存，
  文件里的 fence 内容同步；右侧预览持续渲染。
- 饼图 / 类图 / 状态图：结构页均为逐行行编辑器，操作条为「＋ 行 / 上移 / 下移 / 删除」；
  思维导图仍是节点树（`＋ 子项` 等）。
- 源码面板输入后等待结构重绘，焦点仍在 `#mermaidSource`（没有被行输入抢走）。
- 截图：`tmp/shot-visual-caret-after.png`、`tmp/shot-sequence-editor.png`。

> 说明：其他图种的「结构」是**逐行语句编辑**，不是节点/连线级编辑；这是为避免解析器
> 改写复杂 Mermaid 语法而采取的保守方案。

## 打包 1.0.3 / 1.1.0

- 桌面 `package.json` 升到 `1.0.3`，`package-lock.json` 根版本同步；Android
  `android/app/build.gradle` 升到 `versionCode 11` / `versionName 1.1.0`。
- Windows：`npm run dist` 生成 `release/MoRead-Setup-1.0.3.exe`（124.2 MB）与
  `release/MoRead-Setup-1.0.3.exe.blockmap`，`release/win-unpacked/` 一并更新；
  EXE 文件版本 `1.0.3`。
- Android：`JAVA_HOME=JDK 21`、`ANDROID_HOME=D:\dev\tools\android-sdk` 下执行
  `npm run android:release`，生成并签名 `release/MoRead-Android-1.1.0.apk`（6.29 MB）。
  `apksigner verify` 通过（CN=MoRead），`aapt2 dump badging` 显示
  `versionCode 11` / `versionName 1.1.0`。
- 验证：
  - 直接运行 `release/win-unpacked/MoRead.exe` + `--user-data-dir=tmp\packaged-profile`，
    CDP 读到 `version: 1.0.3`；`app.asar` 内 3 个插件的 SVG 图标均可加载
    （150×150），格式栏出现 3 个插件图标，可视化模式有 6 个 caret spacer。
  - 解包 APK 检查 `assets/public/renderer.js` 含 `visual-caret-spacer` 与
    `renderPluginButtons`，说明新渲染层已进包；设备未连接，未做真机安装。
  - 文档同步更新：README 下载路径、`docs/项目说明.md` §11 产物表与 Android 产物说明。

## 中英双语 Wiki 文档

- 新增 `docs/wiki/`：`Home.md`、`_Sidebar.md` 与 8 个内容页（`zh-` / `en-` 前缀），对应介绍 / 使用指南 / 主题包制作指导 / 插件制作指导；按 GitHub Wiki 的扁平页面与 `[文字](页面名)` 链接约定编写，`README.md` 写明上传步骤（clone `*.wiki.git` → 复制除 README 外的文件 → commit/push）与维护约定。
- 内容按当前实现校对：Android 插件支持（zip 安装、私有目录、无 `require`、无沙箱）、插件命令（导入/导出/工具、欢迎页镜像）、Word 导入与 `npm run pack:plugin`、插件管理的搜索/筛选/详情；`placement` 标注为保留字段（当前不影响插件按钮位置）；删除了只对仓库开发者有意义的相对路径链接。
- 校验：`tmp/check-wiki-links.js`（链接、代码围栏、语言切换、中英配对）与 `tmp/check-wiki-parity.js`（H2/H3/围栏/表格数量一致）通过；`npm run build`、`npm test` 通过。
- 导航：`README.md`、`docs/README.md` 增加 wiki 入口与维护说明；源文档 `插件制作指导.md` 的 `placement` 描述同步修正。

