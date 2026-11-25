# MoRead User Guide

> English · [中文](zh-User-Guide)

Everyday use: installation, open/save, view modes, math and diagrams, themes, plugins, notes, export and shortcuts. For authoring details see [Theme Packs](en-Theme-Packs) and [Plugin Authoring](en-Plugin-Authoring).

> The app UI is currently in Chinese. Menu and button names below are given in English with the Chinese label in parentheses, for example **More (更多)**.

## 1. Install and launch

- **Windows** — run the NSIS installer. The build is unsigned, so choose “More info → Run anyway” if SmartScreen complains. Documents are not stored in the install directory.
- **Android** — sideload the APK; you may need to allow “Install unknown apps” the first time.
- Settings, theme assets and notes live in the user data directory: `%APPDATA%\MoRead` on Windows, app-private storage on Android. Uninstalling the Android app also removes its notes and plugins.

## 2. Open and save

- **New** — the sidebar **New document (新建文档)** button or `Ctrl+N`.
- **Open** — the sidebar **Open (打开)** button, `Ctrl+O`, drag a file into the window, or run `moread document.md` from a terminal.
- **Save** — `Ctrl+S`; **Save as** lives in **More (更多) → Save as… (另存为…)** or `Ctrl+Shift+S`.
- **Auto-save** — when enabled in Settings, typing pauses for about 1.5 seconds and the file is written back. New documents still need a save location once.
- **Recent / Favorites** — click an entry in the sidebar. Favorites only remember paths; they do not copy files.
  - **Favorite current (收藏当前)** saves the document you are editing; **Add path… (添加路径…)** lets you pick existing files (multi-select, no content is read).
  - Each row shows the file name and full path, so same-named files stay distinguishable.
- If another program changes the open file, use **More → Reload from disk (从磁盘重新载入)**.

## 3. A quick tour

- **Title bar** — brand, window title, home button, theme toggle, Theme Studio, help, settings.
- **Tab bar** — multiple tabs, unsaved dot, view switch, **More**.
- **Format bar** — heading level, bold / italic / strikethrough / inline code / link / math, quote, lists, task list, table, colour, undo/redo, save. On desktop every plugin also gets its own icon button here.
- **Sidebar** — new/open, Recent, Favorites, Notes, Outline.
- Toggle the sidebar with the MoRead mark at the top left (`Ctrl+Shift+B`). On narrow screens it becomes a drawer: side by side at ≥620px, a drawer below that (tap the mark to open, tap the content to close).
- **Welcome page** — new/open/recent, plus import commands provided by plugins (for example “Import Word document…”).

## 4. View modes

Switch in the top right, or press `Ctrl+1 / 2 / 3 / 4`:

| Mode | Use |
| --- | --- |
| Reading (阅读) | Read-only preview, good for proofreading and presenting |
| Split (分栏) | Source on the left, preview on the right, synchronised scrolling |
| Source (编辑) | Focus on Markdown with line numbers and syntax highlighting |
| Visual (可视化) | Edit headings, lists, tables, math and images directly in the rendered page |

Tabs support multiple documents, unsaved markers, undo/redo (`Ctrl+Z` / `Ctrl+Y`) and find (`Ctrl+F`). Visual mode also exposes undo/redo in the toolbar.

## 5. Editing and inserting

- Toolbar: bold, italic, strikethrough, inline code, link, math, quote, lists, task, table, colour, undo/redo, save.
- **More formatting (⋯)** adds ordered lists, quote, task list, strikethrough and the math editor.
- **＋** is the insert menu: image, code block, inline/display math, Mermaid, link, table, horizontal rule.
- Colour: select text and use the colour button for text colour or highlight. A `#rrggbb` value inside inline code shows a colour chip automatically.
- Images: desktop stores a relative path; Android embeds a data URL (300 KB per image).

## 6. Math (KaTeX)

- Inline `$E = mc^2$`, display `$$ ... $$`.
- Math editor: `Ctrl+Shift+M` or the Σ button — symbol palette, templates and live preview.
- Double-click rendered math to edit it again; deleting it updates the source.

## 7. Mermaid diagrams

Write diagrams in a ` ```mermaid ` block — flowcharts, sequence diagrams, mind maps and other common grammars.

- Double-click a rendered diagram, or click **Edit (编辑)** in its header, to open the diagram editor. The visual editor offers a structure tree, nodes/edges, layout and colours.
- The header also has **Source / Copy (源码 / 复制)**: source expands the code block in place; copy puts the Mermaid source on the clipboard.
- Mind maps and flowcharts without subgraphs, `classDef` or chained edges use node-level editing. Sequence, class, state, pie, gantt, journey and ER diagrams use line-level editing (one statement per line, add/remove/move) with live preview on the right. Complex syntax can always fall back to **Source**.
- In visual mode, non-editable blocks (diagrams, math, code, tables) are followed by a clickable blank line so the caret can continue after them.
- The first line may carry per-diagram overrides such as `%% moread:mindmap theme=moss layout=tree direction=TB`.

## 8. Tables and code

- Hover a table to get its toolbar: add row above/below, add column left/right, delete row/column; the header row is protected.
- Code blocks highlight automatically; **Code block… (代码块…)** lets you pick a language, and rendered blocks have a copy button.

## 9. Themes and appearance

Open the **Theme Studio (主题工作室)** from the toolbar brush or `Ctrl+Shift+,`:

- **Colour (色彩)** — two accent colours generate the whole palette; 22 component colours can be overridden individually, or regenerated from the accents.
- **Icon / Stickers (图标 / 贴纸)** — replace the app icon, add stickers to the welcome and reading pages.
- **Home (主页)** — replace the welcome page with Markdown; images, math and links work.
- **Page style (页面样式)** — import or paste CSS; appearance only.
- **Theme packs (主题包)** — save the current look as a pack; import, switch, update, rename, delete, export. Drop a `.zip` / `.moread-theme.zip` to import (desktop).
- **Interface (界面)** — hide individual toolbar/status-bar elements.

Theme packs can carry script buttons and CSS: importing asks for confirmation, and a button's first run shows its source again before executing. Authoring details: [Theme Packs](en-Theme-Packs).

## 10. Sidebar

- **Recent (最近打开)** — up to 12 entries, click to open.
- **Favorites (收藏夹)** — stores paths; see §2.
- **Notes (笔记夹)** — notes are real Markdown files.
  - Create notes and folders, nested and collapsible. A folder's **⋯** menu offers “New sub-note / New sub-folder”; each row's **⋯** menu can rename, share or delete.
  - Notes use their display name as the tab label and never appear in Recent. A folder can be exported as a hierarchical ZIP.
  - Desktop files live in `<user data>/notes/<id>.md`; on Android they are app-private and removed when the app is uninstalled.
  - On first launch the introduction, user guide, plugin guide and theme pack guide are seeded into Notes; once deleted they do not come back.
- **Outline (文档大纲)** — numbered by heading level; each level has its own expand/collapse arrow, and **Expand all / Collapse all (展开全部 / 收起全部)** sits above the list.

## 11. Plugins

**Settings (设置) → Plugins (插件管理)**:

- **Install** — install a `.zip` package (`plugin.json` at the archive root, or inside a single top-level folder). Installing the same id again asks to overwrite, which is how you update.
- **Enable / Disable / Uninstall** — user-installed plugins can be uninstalled; bundled plugins can only be disabled. Disabling or uninstalling immediately removes the format-bar icon, menu commands and welcome-page button.
- **Rescan (重新扫描)** — reloads entry scripts without restarting the app.
- **Manager list** — search by name/author/ID, filter by All / Enabled / Disabled / Failed. Cards show icon, version, author, element/button/command counts and load errors. **Details (详情)** expands elements, buttons, commands, permissions, entry file and directory (desktop can reveal it in the file manager).
- **Format-bar entry** — on desktop each enabled plugin gets its own icon button in the format bar, listing only that plugin's elements, buttons and commands. On phones they collapse into one **Plugin (插件)** dropdown grouped by plugin.
- **Element forms** — when an element declares fields (title, content, colour, style…), picking it opens a form; confirming inserts `[name ...]`.
- **Script buttons** — the first run shows the origin and script and asks for confirmation; afterwards it runs without asking.
- **Menu commands** — plugins can add import / export / tool commands to **More**. Import commands also appear on the welcome page, so you can import before any document is open.
- **Trust model** — plugins are local executable code and **MoRead does not sandbox them**. Only enable sources you trust; `permissions` is declarative and is not enforced at runtime.
- **Android** — plugins install from `.zip` into app-private storage. There is no “Open plugin folder” or “Reveal in folder”, and entry scripts run in the renderer without `require`. See [Plugin Authoring](en-Plugin-Authoring).

## 12. Importing Word and exporting PDF

PDF export is built in; the sample plugin `moread-office` adds Word import and demonstrates an export command on both platforms.

- **Import Word** — **More → Import Word document… (导入 Word 文档…)** or the same button on the welcome page → pick a `.docx` / `.docm` file → it is converted to Markdown and opened as a **new document**. The original file and the current document are untouched; press `Ctrl+S` to keep the result.
  - Headings, bold/italic/strikethrough, monospace runs, lists, quotes and simple tables are converted. Images and footnotes are skipped and reported when the import finishes.
  - Legacy `.doc` is not supported; the app asks you to save it as `.docx` in Word first.
- **Export PDF** — **More → Export PDF (导出 PDF)**, either the built-in item or the plugin's “Export PDF…”. Desktop asks where to save; Android opens the system print panel, where you can save as PDF.
- When the plugin is disabled, its import/export commands disappear from the menus.

## 13. Export and share

- Export HTML / PDF / plain text from **More**.
- **Share** — desktop copies the body to the clipboard; Android uses the system share sheet (file sharing keeps the `.md` name).
- Exported HTML is a static snapshot. Plugin elements are exported as currently rendered, and plugin resources use absolute `file://` URLs, so images may be missing on another machine.

## 14. File association and command line (desktop)

- **Settings → Default app (默认打开方式)** registers `.md / .markdown / .mdown` for MoRead (per user, no admin rights needed).
- Windows 10/11 may ask you to confirm the default app once more in system settings.
- Command line: `moread document.md` opens a file; `moread --import-theme="pack.zip"` imports a theme pack at startup.
- Android has no command line and no file-association registration.

## 15. Settings

- Appearance: theme (light / dark / system), editor font size, line wrap.
- Editing: synchronised scrolling, auto-save.
- Default app: register MoRead, open the system default-apps page.
- Plugins: install, enable/disable, uninstall, rescan (see §11).
- Shortcuts and About: shortcut list, version, open the config directory.

## 16. Android differences

| Capability | Desktop | Android |
| --- | --- | --- |
| Open / save | Native dialogs | SAF; files opened from elsewhere are often read-only; a failed save offers “Save as” or app-private storage plus sharing |
| PDF export | Generated directly | System print panel |
| Plugins | `.zip` install + plugin folder | `.zip` install into app-private storage, no folder entry |
| Images | Relative path | Data URL (max 300 KB each) |
| Theme pack import | Drag in / Studio / command line | Studio import or system “Open with” |
| File association, window icon, drag-drop, command line | ✅ | ❌ |

## 17. Shortcuts

| Action | Shortcut |
| --- | --- |
| New / open / save / save as | `Ctrl+N` / `Ctrl+O` / `Ctrl+S` / `Ctrl+Shift+S` |
| Close tab | `Ctrl+W` |
| Find | `Ctrl+F` |
| Bold / italic | `Ctrl+B` / `Ctrl+I` |
| Math editor | `Ctrl+Shift+M` |
| Theme Studio | `Ctrl+Shift+,` |
| Reading / split / source / visual | `Ctrl+1 / 2 / 3 / 4` |
| Toggle sidebar | `Ctrl+Shift+B` |
| Show home page | `Ctrl+Shift+H` |
| Undo / redo | `Ctrl+Z` / `Ctrl+Y` |

## 18. Troubleshooting

- **Windows “unknown publisher”** — the installer is unsigned; choose “More info → Run anyway”.
- **Mojibake** — MoRead reads and writes UTF-8; make sure the other program saves UTF-8 too.
- **Auto-save seems off** — save a new document once manually, and check that auto-save is enabled in Settings.
- **Theme/plugin import fails** — a theme pack needs `theme.json` at the ZIP root; a plugin pack needs `plugin.json` at the root or inside one top-level folder. The list or dialog always shows the reason.
- **A plugin command is missing** — check that the plugin is enabled. The **More** menu is disabled when no document is open, but import commands remain available on the welcome page.
- **A script button does not run** — the first run needs confirmation, and disabled plugins hide their buttons.
- **No plugin folder on Android** — Android keeps plugins in app-private storage; install and uninstall them from the plugin manager only.
