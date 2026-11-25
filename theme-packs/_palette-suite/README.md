# 配色主题包套件

六套「同一结构、不同配色」的墨阅主题包：三浅三深，覆盖暖纸、青瓷、藕荷、夜蓝、松绿、陶土六种色相。
每套都是完整的 `moread-theme@2` ZIP（配色 + 22 个组件颜色 + 软件图标 + 贴纸 + 两个按钮 + 自定义主页 + 样式层）。

成品 ZIP 在 `theme-packs/` 根目录，源文件在 `theme-packs/<名称>.moread-theme/`。

## 六套配色

| 主题 | 模式 | 主强调 | 副强调 | 背景锚点 | 纸面锚点 | 一句话 |
| --- | --- | --- | --- | --- | --- | --- |
| 宣纸 · 朱砂 | 浅色 | `#b23a28` | `#a87f3c` | `#f2ebdd` | `#fdfaf3` | 暖白纸面，朱砂只落在强调处 |
| 青瓷 · 烟雨 | 浅色 | `#2f7a68` | `#a98a4e` | `#ecf3f0` | `#fbfdfb` | 冷调青灰，圆角最软 |
| 藕荷 · 晚照 | 浅色 | `#7c5699` | `#c2718c` | `#f2e7ef` | `#fdf8fb` | 玫瑰灰配藕荷，偏软偏温柔 |
| 墨夜 · 深蓝 | 深色 | `#7aa7f2` | `#e3b46e` | `#0d1017` | `#151a23` | 深蓝夜底配星金 |
| 松烟 · 青苔 | 深色 | `#86c9a0` | `#d8b97a` | `#0c1310` | `#131b16` | 墨绿夜底，线条最细 |
| 落霞 · 陶土 | 深色 | `#ea8f6d` | `#e9c886` | `#120e0d` | `#1b1513` | 暖褐夜底，阴影偏暖 |

每套另有自己的装饰语汇（h2 记号、引用角标、圆角档位、主页插画场景、图标单字），
详见下表：

| 主题 | 图标字 | h2 记号 | 引用角标 | 圆角 sm/md/lg | 主页插画 |
| --- | --- | --- | --- | --- | --- |
| 宣纸 · 朱砂 | 宣 | ◆ | ❦ | 4 / 6 / 9 | 远山 + 朱砂印 |
| 青瓷 · 烟雨 | 瓷 | ◌ | ☾ | 8 / 12 / 18 | 烟雨 + 瓷钮 |
| 藕荷 · 晚照 | 荷 | ❀ | ❁ | 10 / 15 / 22 | 落日晚照 + 荷瓣 |
| 墨夜 · 深蓝 | 墨 | ✦ | ☾ | 6 / 10 / 15 | 星轨 + 月牙 |
| 松烟 · 青苔 | 松 | ❖ | ❖ | 5 / 8 / 12 | 松林 + 山脊 |
| 落霞 · 陶土 | 霞 | ◈ | ◍ | 7 / 11 / 16 | 落日 + 沙丘 |

## 每个包里有什么

```
宣纸朱砂.moread-theme.zip      ~21 KB
├── theme.json   22 个组件颜色、512×512 软件图标（PNG data URL）、1 枚 emoji 贴纸、2 个按钮
├── style.css    语义色 / 代码高亮 / 阴影 / 圆角 / 标题与引用装饰
├── home.md      自定义主页：一句话、插画、三条特点、色值、两条清单、一句题记
└── assets/
    ├── art.svg    1200×400 主页插画（手写路径 + 调色板配色）
    └── grain.svg  180×180 无缝纸纹，铺在欢迎页最底层
```

- 六个 ZIP 的体积在 20.8–30.9 KB 之间，全离线，没有任何远程字体 / 图片 / `@import`。
- 贴纸只在欢迎页出现（`scope: "welcome"`），读文档时不会挡住文字。
- 两个按钮都只调用安全 API：`日期落款` 用 `app.insert()` 插入当天日期，`选中成引` 用
  `app.replaceSelection()` 把选区变成引用；不读写文件、不发网络请求。
- 没有隐藏任何界面元素（`uiHidden` 留空），导入后功能与默认主题一致。

## 导入

墨阅 →「主题工作室 → 主题包 → 导入主题包」，选 `theme-packs/<名称>.moread-theme.zip`；
也可以直接把 ZIP 拖进窗口，或 `MoRead.exe --import-theme="<zip 路径>"`。

导入会整体替换当前主题（配色、组件颜色、图标、贴纸、按钮、主页、CSS），**不改文档**；
因为包里带脚本按钮，会先弹确认框，可点「仅导入外观」跳过按钮。

## 重新生成 / 校验

```powershell
$py = "C:\Users\alp0_\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe"
$node = "C:\Users\alp0_\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
$suite = "D:\dev\tools\mdreader-pro\theme-packs\_palette-suite"

& $py "$suite\build.py"            # 写 6 套 theme.json / style.css / home.md / assets 并打包 ZIP
& $py "$suite\validate.py"         # 按墨阅导入规则检查结构、长度、资源引用、对比度
& $node "$suite\preview.mjs"       # 生成 6 套的欢迎页 / 阅读页预览 HTML
powershell -NoProfile -ExecutionPolicy Bypass -File "$suite\render.ps1"   # 无头 Edge 截图
& $py "$suite\sheet.py"            # 拼对照图 + 配色速查表
powershell -NoProfile -ExecutionPolicy Bypass -File "$suite\verify.ps1"   # 真实开发实例逐套导入验证
```

- `build.py` 只依赖 Pillow 与标准库；`preview.mjs` 复用仓库 `node_modules` 里的 markdown-it。
- 截图必须走 `render.ps1`（无头 Edge）。Chromium 需要命名管道，DSH 受限沙箱里起不来，
  所以这一步要在沙箱外跑一次。
- `verify.ps1` 会为每套包启动一个隔离配置的开发实例（`tmp/theme-verify`），
  点掉导入确认框后读取 `--accent` / `--paper` / `--ink`、主页图片、自定义 CSS 与底栏按钮，
  截图存 `_build/verify/`。

## 设计约定

1. **三枚锚点推 22 色**：每套只声明 `base_bg` / `base_paper` / `base_ink` 与主副强调色，
   `palettes.py` 里按固定的插值比例生成标题栏、侧栏、工作区、线条、代码块、表头、引用、
   选中色与图表色。想加新配色，复制一条 `Palette` 改锚点即可，六套之外不会出现结构漂移。
2. **深浅模式固定**：`theme.mode` 写死 `light` / `dark`，22 个组件颜色也按该模式给定。
   用户切到相反模式时，界面仍是这套固定配色（只有原生控件跟随 `color-scheme`），这是预期行为。
3. **按钮文字色自己算**：应用默认按亮度 0.58 一刀切给 `--accent-contrast`，浅色强调色
   （如墨夜的雾蓝）会得到对比度不足的暖白字。六套包都在 `style.css` 里按实际对比度选字色
   （`--accent-contrast: #211c16` 或 `#fffaf2`），并用 `!important` 压过内联值——这是整套样式里
   唯一的 `!important`。浅色包的强调色够深、本来不会翻车，但六套用同一模板，改锚点不用记例外。
4. **对比度门槛**：正文 / 纸张 ≥ 7:1，次要文字 ≥ 4.5:1，辅助文字 ≥ 3:1，弱化文字 ≥ 2:1，
   代码文字 / 代码底 ≥ 7:1，主强调 / 纸张 ≥ 4.5:1，副强调 / 纸张 ≥ 3:1，按钮文字 / 主强调 ≥ 4.5:1，
   高亮配色 / 代码底 ≥ 3:1（注释 ≥ 2.2:1）。`validate.py` 全部按实际色值算，不靠肉眼。
5. **资源只用本地文件**：插画与纸纹都是 SVG 文本（各 2–6 KB），图标是内嵌 PNG data URL；
   `home.md` 用 `assets/art.svg` 相对路径，导出换机器不会失效。

## 校验结果（2026-11-25）

- `validate.py`：6 个包全部通过；10 条提示都是「对比度在阈值内但偏紧」，属于刻意压低的层次色
  （弱化文字、副强调、注释高亮），不是错误。
- `verify.ps1`：6 套在真实开发实例里逐套导入成功——包名、主色、纸张色、正文色、主页图片、
  自定义 CSS、底栏两个按钮全部生效，深浅模式正确。
- `icons.png`：六枚图标在 92 / 40 / 27 px 下都能认出单字。
- 对照图：`_build/sheet_welcome.png`、`_build/sheet_reading.png`、`_build/sheet_palette.png`。

## 目录

```
_palette-suite/
├── palettes.py      调色板定义 + 22 色推导 + CSS 令牌 + 六套文案
├── artwork.py       六套主页插画 SVG、纸纹、图标 PNG、图标对照图
├── build.py         生成包目录与 ZIP，写 _build/manifest.json
├── validate.py      导入规则 + 对比度校验
├── preview.mjs      生成预览 HTML（欢迎页 / 阅读页，各 820 与整页两版）
├── capture.cjs      备用：Electron 离屏截图（受限沙箱外可用）
├── render.ps1       无头 Edge 截图（当前使用）
├── sheet.py         对照图与配色速查表
├── verify.ps1       真实开发实例导入验证
├── _build/          manifest、图标、对照图、验证截图
└── _preview/        每套包的预览 HTML 与 PNG
```
