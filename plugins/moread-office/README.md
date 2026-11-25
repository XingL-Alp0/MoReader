# 办公格式工具（moread-office）

一个双端通用的插件：导入 Word、导出 PDF，再附带一个工具命令。

| 分组 | 命令 | 桌面端 | Android |
| --- | --- | --- | --- |
| 导入 | 导入 Word 文档… | 系统文件对话框 → `.docx` 转 Markdown → 新文档 | SAF 选择器（多扩展名时显示所有文件，选完校验）→ 相同转换 |
| 导出 | 导出 PDF… | 选择保存位置后生成 PDF | 系统打印面板，可「另存为 PDF」 |
| 工具 | 插入分页线 | 光标处插入 `---` | 同左 |

## 安装

**桌面端**：设置 → 插件管理 → 安装插件（.zip），或把本目录复制到 `plugins/`。

**Android**：设置 → 插件管理 → 安装插件（.zip）。Android 只能通过 `.zip` 安装到应用私有目录，不能拷目录。

两个平台装的是同一个包、同一份 `plugin.json`：插件只使用 `app.pickFile` / `app.importDocx` / `app.createDocument` / `app.exportPdf` / `app.insert`，这些 API 在桌面和 Android 上行为一致。

## Word 导入说明

- 支持 `.docx` / `.docm`；旧版 `.doc` 不支持，会提示先在 Word 里另存为 `.docx`
- 标题（Heading 1–6、Title、Subtitle）、粗体/斜体/删除线/等宽字体、列表（统一 `-`）、引用、简单表格
- 图片、脚注、域代码不导入，导入完成后会用提示说明
- 导入结果作为**新文档**打开，原文件与当前文档都不受影响；需要保存时按 `Ctrl+S` / 分享保存

## Android 注意事项

- 入口脚本在渲染层执行，没有 `require`；本插件不依赖入口脚本，只有 `commands`
- 不做沙箱：插件以应用权限运行，只安装、启用你审查过的包
- SAF 只按 MIME 过滤，`.docx/.docm/.doc` 三种扩展名会显示所有文件，选错扩展名会给出明确错误
- 导出 PDF 使用系统打印（`PrintManager`），不需要存储权限

## 命令脚本

```js
const file = await app.pickFile({ title: '导入 Word 文档', extensions: ['docx', 'docm', 'doc'] });
if (!file) return;
const result = await app.importDocx(file.path);
await app.createDocument(result.markdown, file.name.replace(/\.(docx|docm)$/i, '') + '.md');
if (result.warnings?.length) app.toast(result.warnings.join('；'));
```

首次运行会弹出确认框；选择「信任并运行」后不再询问（记录在 `trustedButtons`）。
