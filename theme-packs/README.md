# 主题包目录

这里放墨阅（MoRead）主题包的源码与成品 ZIP。成品都是 `moread-theme@2` 单体 ZIP，
直接拖进墨阅窗口即可导入。

## 六套配色主题包

三浅三深，同一套结构、不同配色；都有自定义主页、样式层、图标、贴纸与两个安全按钮。

| 主题 | 模式 | 主强调 | 副强调 | 成品 |
| --- | --- | --- | --- | --- |
| 宣纸 · 朱砂 | 浅色 | `#b23a28` | `#a87f3c` | `宣纸朱砂.moread-theme.zip` |
| 青瓷 · 烟雨 | 浅色 | `#2f7a68` | `#a98a4e` | `青瓷烟雨.moread-theme.zip` |
| 藕荷 · 晚照 | 浅色 | `#7c5699` | `#c2718c` | `藕荷晚照.moread-theme.zip` |
| 墨夜 · 深蓝 | 深色 | `#7aa7f2` | `#e3b46e` | `墨夜深蓝.moread-theme.zip` |
| 松烟 · 青苔 | 深色 | `#86c9a0` | `#d8b97a` | `松烟青苔.moread-theme.zip` |
| 落霞 · 陶土 | 深色 | `#ea8f6d` | `#e9c886` | `落霞陶土.moread-theme.zip` |

配色细节、生成脚本、校验与预览方法见 [`_palette-suite/README.md`](_palette-suite/README.md)；
对照图在 `_palette-suite/_build/`（欢迎页 / 阅读页 / 配色速查 / 图标对照）。

## 其他主题包

| 主题 | 说明 | 位置 |
| --- | --- | --- |
| 星璃 · 星月书库 | 角色主题：夜空紫 + 星金，含壁纸与插画资源（约 2 MB） | 源文件 `星璃_星月书库.moread-theme/`，成品 `../release/星璃_星月书库.moread-theme.zip` |

## 导入

- 拖入墨阅窗口；
- 主题工作室 → 主题包 →「导入主题包」；
- 命令行 `MoRead.exe --import-theme="D:\path\xxx.moread-theme.zip"`。

导入会整体替换当前主题，不改文档；带脚本按钮的包会单独确认（可「仅导入外观」跳过）。

## 做自己的主题

字段、限制与排错见 [`../docs/主题包制作指导.md`](../docs/主题包制作指导.md)。
