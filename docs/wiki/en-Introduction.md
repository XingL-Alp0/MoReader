# Introduction to MoRead

> English · [中文](zh-Introduction)

MoRead is a local-first Markdown reader and editor. Your documents stay plain `.md` files; rendering, themes and plugins all run on your machine — nothing is uploaded, and nothing is locked into a private format. The desktop build uses Electron, the Android build uses Capacitor, and both share the same renderer.

## Why MoRead

- **Comfortable to read** — paper-like typography, syntax highlighting, tables, footnotes and task lists; KaTeX math and Mermaid diagrams render inline.
- **Comfortable to write** — four view modes (reading, split, source, visual) that switch instantly; the format bar covers everyday formatting, and tables can be edited in place.
- **Made to look like yours** — the Theme Studio derives a full palette from two accent colours, exposes 22 component colours, stickers, a custom home page and page CSS; theme packs can be imported, exported and switched at will.
- **Extensible** — plugins add custom Markdown elements (callouts, dividers, …), script buttons, and import / export / tool commands in the **More** menu. Plugins can ship their own icons and image resources.
- **Available where you are** — Windows and Android share the same document, theme and plugin rules; plugins work on both platforms (Android installs `.zip` packages into app-private storage).

## What it does

| Capability | Details |
| --- | --- |
| Markdown reading / editing | Reading, split, source and visual modes |
| Math | Inline `$E=mc^2$` and display math, with a built-in LaTeX symbol panel and live preview |
| Mermaid diagrams | Flowcharts, sequence diagrams, mind maps and more; double-click to edit via structure tree or source |
| Tables | Hover toolbar to add or remove rows and columns, in source and visual modes |
| Theme Studio | Accent-derived palette, 22 component colours, app icon, stickers, custom home page, page CSS, theme pack library |
| Plugins | Custom elements + script buttons + menu commands + bundled resources; install from `.zip`, enable/disable, uninstall, hot reload; desktop and Android |
| Import / export | Built-in HTML / PDF / plain-text export; the sample plugin adds Word (`.docx`) import as a menu command |
| Notes | Notes and folders, unlimited nesting, sharing, hierarchical ZIP export |
| File association | Register as the default `.md` handler; double-click to open (desktop) |

## Data and privacy

- Documents are ordinary Markdown files; MoRead never writes a proprietary format.
- Settings, theme assets and notes live in the user data directory (`%APPDATA%\MoRead` on Windows; app-private storage on Android).
- No telemetry, no document uploads. Outbound requests only come from images you link, theme pack images, or plugin scripts.
- Plugins and theme-pack button scripts execute JavaScript locally. **There is no sandbox**: only install and enable plugins and theme packs you trust. The first run of a script button shows its origin and code and asks for confirmation.

## Platforms

- **Windows** — NSIS installer. The build is unsigned, so SmartScreen may show “More info → Run anyway” on first launch.
- **Android** — sideload the APK. Opening and saving go through the system file picker (SAF), PDF export goes through system printing, and sharing uses the system share sheet. Plugins can only be installed from a `.zip` into app-private storage; there is no browsable plugin folder.

## Three steps to start

1. Open or create a `.md` document.
2. Switch between **Reading / Split / Source / Visual** in the top bar, and press `Ctrl+S` to save.
3. Open the Theme Studio to change the look, or **Settings → Plugins** to extend the app.

## Keep reading

- Everyday workflows, shortcuts and troubleshooting: [User Guide](en-User-Guide)
- Building theme packs: [Theme Packs](en-Theme-Packs)
- Writing plugins: [Plugin Authoring](en-Plugin-Authoring)
- 中文：[介绍](zh-Introduction)

> On first launch the app copies the introduction, user guide, plugin guide and theme pack guide into **Notes**, where you can open or delete them at any time.
