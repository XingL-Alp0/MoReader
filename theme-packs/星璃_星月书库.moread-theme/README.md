# 星璃 · 星月书库

墨阅（MoRead）主题包：夜空紫纸面 + 星金重音 + 羽翼微光，取自角色「星璃」的设定集与场景图。

成品：`../星璃_星月书库.moread-theme.zip`（746 KB）

## 包里有什么

| 文件 | 说明 |
| --- | --- |
| `theme.json` | 主题清单：深色模式、20 个组件颜色、软件图标（自定义 PNG）、1 枚欢迎页徽章贴纸、2 个自定义按钮、隐藏文件关联徽章 |
| `style.css` | 星野背景、标题金星、引用月牙、代码/表格/按钮/滚动条质感 |
| `home.md` | 欢迎页：夜空壁纸、书库插图、写作小抄、页脚题记 |
| `assets/hero.jpg` | 欢迎页主图，由 `产物/图集/壁纸_中世纪城市_星璃_夜空_2560x1440.png` 缩到 1500×844 |
| `assets/library.jpg` | 书库插图，由 `产物/输出/02_书库_星璃.png` 缩到 1100×619 |
| `assets/starfield.svg` | 480×480 星点平铺图，铺在欢迎页最底层 |

`theme.json` 里另有两张内嵌 PNG：

- 软件图标：512×512，夜空紫圆角方块 + 宋体「璃」+ 金月牙与四角星，27px 标题栏下仍可辨认
- 贴纸：256×256，星璃头像圆章（取自 `设定/参考/星璃_正面.png` 头部裁切，加冷色偏移与暗角，让白底融进夜空紫）

## 配色

| 用途 | 色值 |
| --- | --- |
| 主强调 | `#a78bfa` 紫罗兰（按钮、链接、选中、列表符号） |
| 副强调 | `#e4c082` 星金（分隔线、表头、引用角标） |
| 应用背景 / 工作区 / 纸张 | `#100d1b` / `#17132b` / `#1a1530` |
| 正文 / 次要 / 辅助 | `#ece8fa` / `#c2b9e0` / `#8f86b4` |

`style.css` 另外补齐了组件颜色管不到的变量：`--line-strong`、`--sidebar-deep`、语义色与代码高亮，避免深色底上残留暖棕色。

## 重新生成 / 校验

```powershell
$py = "C:\Users\alp0_\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe"
$team = "D:\dev\tools\mdreader-pro\theme-packs\星璃_星月书库"

& $py "$team\_build\images.py"      # 重新出图（hero / library / starfield / icon / sticker / QA 图）
& $py "$team\_build\build.py"       # 写 theme.json 并打包 ZIP
& $py "$team\_build\validate.py"    # 按墨阅导入规则检查结构、长度、颜色、资源引用

node "$team\_build\preview.mjs"     # 生成预览 HTML（内联真实配色变量）
node "$team\_build\test_buttons.mjs" # 用 mock app 跑一遍自定义按钮脚本
```

预览截图用无头 Edge 渲染 `_build/preview_*.html`（1280×820），产物见 `_build/preview_welcome.png`、`_build/preview_reading.png`、`_build/preview_home_full.png`。

## 导入

墨阅 → 主题工作室 → 主题包 → 导入主题包，选 `星璃_星月书库.moread-theme.zip`；或把 ZIP 拖进窗口。
导入会整体替换当前主题（配色、组件颜色、图标、贴纸、按钮、界面隐藏、主页、CSS），**不改文档**。

## 注意

- 主题是**深色固定**配色：`mode` 写死 `dark`，20 个组件颜色也按深色给定。切到浅色模式时界面仍偏暗，这是预期行为。
- 贴纸 `scope` 是 `welcome`，只在欢迎页出现；读文档时不会挡住文字。
- 隐藏项只有 `assoc-badge`（侧栏底部的文件关联徽章），需要时可在主题工作室里取消。
