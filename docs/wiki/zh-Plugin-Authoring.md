# 墨阅插件制作指导

> 中文 · [English](en-Plugin-Authoring)

插件可以为墨阅增加 Markdown 自定义元素、脚本按钮，以及在「更多」菜单里追加导入 / 导出 / 工具命令；插件还能自带图标和图片资源。桌面端与 Android 使用同一套清单与脚本规则。

> 插件是本地可执行代码，墨阅**不做沙箱**。只安装、启用你审查过来源的插件。

## 1. 插件目录

桌面端插件放在以下任一目录：

- 应用目录：`plugins/<插件 ID>/`（内置插件）
- 用户数据目录：`<用户数据目录>/plugins/<插件 ID>/`（用户安装；同 ID 覆盖应用目录）

Android 端只能装到应用私有目录 `files/plugins/<插件 ID>/`，由「安装插件（.zip）」写入。

推荐结构：

```text
plugins/
└─ wave-line/
   ├─ plugin.json
   ├─ index.js
   └─ assets/
      └─ icon.svg          ← 插件图标（安装时必填）
```

插件 ID 规则：

- 只能使用小写字母、数字、点、下划线和短横线
- 必须以小写字母开头，长度 2～64
- 例如 `wave-line`、`com.example.timer`

## 2. plugin.json

最小配置：

```json
{
  "id": "hello-plugin",
  "name": "Hello 插件",
  "version": "1.0.0",
  "author": "你的名字",
  "description": "一个示例插件",
  "icon": "assets/icon.svg",
  "entry": "index.js"
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 插件唯一 ID |
| `name` | 否 | 显示名称 |
| `version` | 否 | 插件版本 |
| `author` | 否 | 作者 |
| `icon` | **是**（安装包时） | 图标文件相对路径；支持 SVG / PNG / JPEG / WebP；也可用 `iconFile` 字段 |
| `description` | 否 | 插件说明 |
| `entry` | 否 | 入口脚本，默认 `index.js` |
| `permissions` | 否 | 声明的权限列表（仅声明，不拦截） |
| `resources` | 否 | 自带图片/字体等资源 |
| `elements` | 否 | Markdown 自定义元素 |
| `buttons` | 否 | 脚本按钮 |
| `commands` | 否 | 「更多」菜单命令 |

### 图标文件

- 位置：插件目录内，例如 `assets/icon.svg`；不能用 `..` 或绝对路径
- 写法：`"icon": "assets/icon.svg"`；也接受 `{ "file": "...", "glyph": "◇" }` 或分开写 `"icon": "◇", "iconFile": "assets/icon.svg"`
- 格式：`.svg` / `.png` / `.jpg` / `.jpeg` / `.webp`，单文件 ≤512 KB
- 安装 `.zip` 时校验：图标缺失、路径越界或文件不存在都会拒绝安装
- SVG 图标按**遮罩**绘制（`mask-image`），跟随当前主题文字颜色；位图按原图显示
- 旧目录插件只有 `"icon": "▣"` 这类字符时仍回退显示该字符；新插件包必须带图标文件
- 脚本按钮自己的 `buttons[].icon` 仍是短字符/emoji，可以和插件图标不同

## 3. 入口脚本

`index.js` 可以导出 `activate` 和 `deactivate`：

```js
module.exports = {
  async activate(plugin) {
    plugin.log("插件已启用", plugin.metadata.name);
  },

  async deactivate() {
    // 清理定时器或监听器
  }
};
```

`plugin` 对象提供：`plugin.id`、`plugin.metadata`、`plugin.log(...)`。

执行环境：

- **桌面**：入口在 `vm` 上下文执行，顶层代码 1 秒上限，入口文件 ≤2 MB；只允许 `require` 插件目录内的相对路径文件，`fs`、`child_process` 等外部依赖被拒绝。
- **Android**：入口在渲染层用 `new Function` 执行，**没有 `require`**，不能加载插件目录内的其它 JS 或 Node 模块。
- 两端的这层限制都只防误用，**不是安全边界**：插件能接触主机/页面能力，只应启用可信插件。

`permissions` 只是声明字段，会出现在元数据里，运行时不会按权限拦截。

## 4. Markdown 自定义元素

为 Markdown 增加类似短标签的元素：

```md
[area width="320px" height="120px" color="#c4562d"]
```

声明：

```json
{
  "elements": [
    {
      "name": "area",
      "label": "区域",
      "description": "可配置颜色和尺寸的区域",
      "html": "<div class=\"plugin-area\" style=\"width:{width};height:{height};background:{color}\"></div>",
      "css": ".plugin-area { border-radius: 12px; opacity: .85; }",
      "defaults": { "width": "320px", "height": "120px", "color": "#c4562d" }
    }
  ]
}
```

属性可以写 `key=value`、`key="value"` 或 `key='value'`；模板里的 `{key}` 会替换成属性值，未传入的使用 `defaults`。

### 插入对话框（fields）

元素可以声明 `fields`，点选时先弹表单：

```json
"fields": [
  { "key": "title", "label": "标题", "type": "text", "placeholder": "提示卡标题" },
  { "key": "content", "label": "内容", "type": "textarea" },
  { "key": "color", "label": "强调色", "type": "color" }
]
```

- `type` 支持 `text` / `textarea` / `color` / `select` / `number` / `boolean`；`select` 需要 `options: [{ "value": "wave", "label": "波浪线" }]`
- 没声明 `fields` 时，按 `defaults` 自动生成字段
- 元素是行内语法：多行输入会压成一行，属性值里的双引号会转义
- 只声明希望用户改的字段；没出现在表单里的 `defaults` 原样保留；清空的字段写成 `key=""`

### 资源引用（resources）

```json
"resources": { "wave": "assets/wave.svg" }
```

模板的 HTML 与 CSS 里都可以用 `{resource:wave}` 引用：

```json
"css": ".divider-wave { mask-image: url({resource:wave}); }"
```

规则：

- 只允许插件目录内的相对路径，不能用 `..` 或绝对路径
- 最多 32 个资源，单个文件 ≤8 MB
- 资源随插件安装到应用内部插件目录，不会写进文档目录
- 未声明、缺失或越界的文件不会暴露，引用渲染为空
- 导出的 HTML/PDF 里是 `file://` 绝对地址，换机器打开会缺图

## 5. 插件按钮

```json
{
  "buttons": [
    {
      "id": "insert-area",
      "label": "插入区域",
      "icon": "▣",
      "placement": "dock",
      "script": "app.insert('[area width=\"320px\" height=\"120px\"]')"
    }
  ]
}
```

| 字段 | 说明 |
| --- | --- |
| `id` | 插件内唯一 ID |
| `label` | 按钮名称 |
| `icon` | 按钮图标或短字符 |
| `placement` | 保留字段（`dock` / `floating`）；当前插件按钮统一进格式栏插件菜单，该值暂不影响位置 |
| `script` | 点击时执行的脚本（异步函数体） |

按钮脚本可调用应用脚本 API：

```js
app.insert("插入的内容");
app.setContent("替换整篇文档");
app.replaceSelection("替换选区");
await app.save();
await app.saveAs();
app.openStudio();
app.toast("操作完成");
```

只读信息：`markdown.content`、`markdown.selection`、`markdown.info`。

按钮在格式栏的插件菜单里出现：桌面端每个插件一个图标按钮，手机端收成「插件」下拉。首次运行会显示来源与脚本内容并要求确认。

## 6. 插件命令（导入 / 导出 / 工具）

文件类动作（导入 Word、导出 PDF 等）用 `commands` 放进「更多」菜单：

```json
{
  "commands": [
    {
      "id": "import-docx",
      "label": "导入 Word 文档…",
      "icon": "file-down",
      "group": "import",
      "description": "选择 .docx 并转成 Markdown",
      "script": "const file = await app.pickFile({ title: '导入 Word 文档', extensions: ['docx', 'docm', 'doc'] });\nif (!file) return;\nconst result = await app.importDocx(file.path);\nawait app.createDocument(result.markdown, file.name.replace(/\\.(docx|docm)$/i, '') + '.md');\nif (result.warnings && result.warnings.length) app.toast(result.warnings.join('；'));"
    }
  ]
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 小写字母开头，2～64 字符（`^[a-z][a-z0-9._-]{1,63}$`） |
| `label` | 是 | 菜单文字 |
| `icon` | 否 | 内置图标名（如 `file-down`、`printer`）或短字符 |
| `group` | 否 | `import` / `export` / `tools`，默认 `tools` |
| `description` | 否 | 悬停提示 |
| `script` | 是 | 点击后执行的脚本，≤20000 字符 |

位置与行为：

- `import` 组在「更多 → 分享当前文档」下面、内置「导出 HTML」上面；同一组命令也会出现在**欢迎页**「新建文档 / 打开文件」下面，未打开文档时也能导入
- `export` 组在内置三种导出后面；没有文档时自动禁用
- `tools` 组在「从磁盘重新载入」后面
- 命令 ID 形如 `plugin:<插件 id>:<命令 id>`，首次运行前确认，选「信任并运行」后不再询问
- 停用/卸载插件后，菜单项与欢迎页按钮立即消失

命令脚本可用的文件/格式 API：

| API | 说明 |
| --- | --- |
| `app.pickFile({ title, extensions })` | 打开系统文件对话框，返回 `{ path, name, extension, size }`；取消返回 `null` |
| `app.importDocx(path)` | 把 `.docx` / `.docm` 转成 Markdown，返回 `{ markdown, warnings }` |
| `app.createDocument(content, name)` | 用内容新建未保存文档并激活，返回 `{ id, name }` |
| `app.exportHtml()` / `app.exportPdf()` / `app.exportText()` | 内置导出 |
| `app.save()` / `app.saveAs()` | 保存 / 另存为 |
| 其余同按钮 | `app.insert`、`app.setContent`、`app.toast` 等 |

Word 导入覆盖标题（Heading 1–6 / Title / Subtitle）、粗体/斜体/删除线/等宽字体、列表（统一 `-`）、引用与简单表格；图片、脚注、域代码不导入，会在 `warnings` 里说明。旧版 `.doc` 需先在 Word 里另存为 `.docx`。

示例插件 `plugins/moread-office/` 同时演示导入（Word）、导出（PDF）和工具三类命令，桌面与 Android 通用，可复制改写。

## 7. 安装、卸载与调试

### 安装

- **插件包（推荐）**：把插件目录打成 ZIP——`plugin.json` 可以在压缩包根目录，也可以只套一层插件文件夹。打开「设置 → 插件管理 → 安装插件（.zip）」选择压缩包。插件装到用户数据目录（Android 为应用私有目录），之后能启用、停用或卸载；再次安装同 `id` 会提示覆盖，相当于更新。
  - 打包：`npm run pack:plugin -- plugins/<插件目录>`，产物在 `release/<id>-<version>.zip`
- **手工安装（仅桌面）**：把目录复制到 `plugins/`（应用目录或用户数据目录）。

### 管理

- 列表支持按名称/作者/ID 搜索、按状态筛选；「详情」查看元素、按钮、命令、权限、入口与目录（桌面可「在文件夹中显示」）。
- 「重新扫描」会卸载并重新执行入口脚本，改完 `index.js` 不必重启应用。
- 用户安装的插件可卸载；内置插件只能停用。加载失败会在列表里显示原因。

### 调试

- 终端/开发者工具里有 `[plugins]` 日志与 `[plugin:<id>]` 输出
- 检查 `plugin.json` 是否合法 JSON、`id` 是否符合规则、`entry` 是否存在
- 检查元素名是否重复、脚本是否使用了被禁止的外部依赖（桌面 `require`）
- 脚本按钮/命令首次运行需要确认；被停用的插件不会显示入口

## 8. Android 端

Android 没有 Node 进程，插件由渲染层宿主管理，对插件作者暴露的接口与桌面一致：

- **安装**：只能「设置 → 插件管理 → 安装插件（.zip）」，用系统文件选择器（SAF）选包；解压到应用私有目录 `files/plugins/<id>/`，索引在 `files/plugins/index.json`。没有可浏览的插件目录，也不能手工拷贝
- **启停 / 卸载 / 重扫**：与桌面相同；卸载会删目录并更新索引
- **入口脚本**：在渲染层执行，支持 `module.exports`、`exports`、`activate(plugin)`、`deactivate()`；**没有 `require`**
- **不做沙箱**：桌面与 Android 都以本机权限执行插件代码，只启用审查过的插件
- **元素 / 按钮 / 命令**：完全复用桌面规则，命令的导入组也出现在欢迎页
- **图标与资源**：通过 Capacitor 本地文件服务加载，`icon` / `{resource:key}` 写法不变
- **导入 Word**：`app.pickFile` 与 `app.importDocx` 在 Android 可用；SAF 多扩展名时会显示所有文件，选完再校验
- **导出 PDF**：走 Android 系统打印面板

## 9. 信任与安全

- 插件是本地可执行代码，**没有沙箱**；脚本按钮、命令、主题包按钮都能执行任意 JavaScript
- `permissions` 仅声明，运行时不会限制能力
- 只从可信来源安装；不确定时先解压阅读 `plugin.json` 与入口脚本
- 插件资源与导出：导出的 HTML/PDF 引用插件资源时使用绝对 `file://` 地址，跨机器会缺图

## 10. 打包与发布

```bash
npm run pack:plugin -- plugins/moread-office
# → release/moread-office-1.1.0.zip
```

发布包建议包含：

```text
插件目录/
├─ plugin.json
├─ index.js
├─ README.md
├─ LICENSE
└─ assets/icon.svg
```

README 里建议写清：功能、适用版本、安装方法、Markdown 语法示例、按钮/命令说明、权限与隐私、更新日志。`plugin.json` 的 `appVersion` 字段当前不会被校验，不要依赖它做版本门槛；请使用稳定的 `app` API，不要依赖未公开的 DOM 结构。

## 11. 常见失败

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 安装被拒绝：缺少图标/图标不存在 | 新安装必须带 `icon` 文件 | 加 `assets/icon.svg` 并确认路径 |
| 列表显示「加载失败」 | 入口脚本报错、文件缺失、JSON 非法 | 看列表原因与 `[plugins]` 日志 |
| 元素不渲染 | 名称不合规、HTML 被清理、语法拼错 | 名称 `^[a-z][a-z0-9._:-]{1,63}$`；用 `[name k="v"]` |
| 命令不出现 | 插件未启用，或没有文档且不是导入组 | 启用插件；导入命令在欢迎页 |
| 桌面 `require` 被拒绝 | 只允许插件目录内相对路径 | 把依赖放进插件目录，或 Android 下避免 `require` |
