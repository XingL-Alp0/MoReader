# MoRead Theme Pack Guide

> English · [中文](zh-Theme-Packs)

A theme pack bundles a complete look into a single ZIP: palette, component colours, app icon, stickers, custom buttons, hidden UI elements, plus an optional custom home page and CSS. Importing a pack unpacks and applies it; documents are never touched.

The quick start below takes about three minutes.

## Quick start

1. Create a folder and write `theme.json`:

   ```json
   {
     "format": "moread-theme",
     "version": 2,
     "name": "Moss",
     "theme": { "mode": "light", "primary": "#4d7c5f", "secondary": "#d9a441" }
   }
   ```

2. ZIP the **contents** of the folder (not the folder itself); `theme.json` must sit at the archive root:

   ```text
   moss.moread-theme.zip
   └── theme.json
   ```

3. Drag the ZIP into the MoRead window, or use **Theme Studio → Theme packs → Import theme pack (导入主题包)**. Confirm and it applies immediately.

If you only want colours, you can stop here.

## Archive layout

```text
my-theme.moread-theme.zip
├── theme.json          # required: manifest
├── style.css           # optional: page CSS
├── home.md             # optional: custom home page Markdown
└── assets/             # optional: images
    ├── cover.png
    └── pattern.svg
```

On import:

- Only `theme.json`, `style.css`, `home.md` and `assets/*` are read; everything else is ignored.
- `assets/` is extracted to `theme-assets/packs/<id>/assets/` inside the user data directory, keeping the folder structure.
- Import **replaces the whole look**: palette, component colours, icon, stickers, buttons, hidden UI, home page and CSS all come from the pack. A pack without a home page/CSS clears the current custom home page and stylesheet.
- A pack without buttons keeps the current buttons; a pack with script buttons asks first (you can choose to import the look only).
- Unknown fields are ignored and invalid values are sanitised (for example a colour that is not `#rrggbb` falls back to the default).

## theme.json

Top-level fields:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `format` | string | yes | Must be `"moread-theme"` |
| `version` | number | yes | Currently `2`; `1` imports as a legacy pack; anything above `2` is rejected |
| `name` | string | no | Theme name, max 60 characters, shown in the Theme Studio |
| `home` | object | no | `{ "enabled": boolean, "markdown": string }` |
| `style` | object | no | `{ "enabled": boolean, "css": string }` |
| `theme` | object | no | Palette and appearance, see below |

`theme` fields:

| Field | Meaning |
| --- | --- |
| `mode` | `"light"` / `"dark"` / `"system"` |
| `primary` | `#rrggbb`, primary accent: buttons, links, selection, heading decoration |
| `secondary` | `#rrggbb`, secondary accent: highlights, badges, second-level emphasis |
| `componentColors` | Per-component overrides (22 keys) |
| `brandIcon` | App icon |
| `stickers` | Sticker array |
| `customButtons` | Custom button array |
| `uiHidden` | IDs of UI elements to hide |

With only `primary` / `secondary`, MoRead derives the whole palette from those two colours (light and dark calculated separately). This is the simplest and most consistent approach.

### componentColors: 22 component colours

Only keys you write are overridden; everything else keeps following the accent-derived palette. After importing a pack, “derive from accents” is turned off and the pack's concrete colours are used.

| Key | Name | CSS variable | Where it applies |
| --- | --- | --- | --- |
| `appBg` | App background | `--bg` | Window background, sidebar frame |
| `titlebarBg` | Title bar | `--titlebar` | Top title bar |
| `sidebarBg` | Sidebar | `--sidebar` | Left document column |
| `surfaceBg` | Workspace | `--surface` | Tab bar, toolbar, editor frame |
| `editorBg` | Editor background | `--editor-bg` | CodeMirror area and gutter |
| `paperBg` | Reading paper | `--paper` | Preview paper, modal background |
| `paperSoft` | Paper layer | `--paper-soft` | Secondary paper, floating panels |
| `statusBg` | Status bar | `--status-bg` | Bottom status bar |
| `ink` | Body text | `--ink` | Primary text |
| `inkSoft` | Secondary text | `--ink-soft` | Subtitles, captions |
| `muted` | Muted text | `--muted` | Labels, placeholders |
| `faint` | Faint text | `--faint` | Line numbers, faint hints |
| `line` | Divider | `--line` | Borders, separators |
| `lineSoft` | Soft divider | `--line-soft` | Fainter internal separators |
| `codeBg` | Code background | `--code-bg` | Code block background |
| `codeInk` | Code text | `--code-ink` | Default code text |
| `codeHead` | Code header | `--code-head` | Code block language bar |
| `tableHead` | Table header | `--table-head` | Markdown table header |
| `quoteBg` | Quote background | `--quote-bg` | Blockquote background |
| `selection` | Selection | `--selection` | Text selection highlight |
| `diagramPrimary` | Diagram primary | `--diagram-primary` | Mermaid node/edge primary |
| `diagramSecondary` | Diagram secondary | `--diagram-secondary` | Mermaid secondary nodes/edges |

```json
"componentColors": {
  "appBg": "#eef3ec",
  "paperBg": "#ffffff",
  "ink": "#1f2a24",
  "codeBg": "#e7efe9",
  "quoteBg": "#f1f7f2"
}
```

Component colours are written as **inline styles** on `<html>`, so they outrank the stylesheet. Overriding them from `style.css` needs `!important`; prefer setting them here.

### brandIcon: app icon

```json
"brandIcon": { "type": "preset", "value": "leaf" }
```

- Presets (`type: "preset"`): `default` (ink M), `leaf`, `star`, `ink` (inkstone).
- Custom image (`type: "image"`): `value` is `data:image/png|jpeg|webp;base64,...`, at most 700,000 characters (about 500 KB).
- The icon updates both the title bar and the window icon; square, at least 256×256 works best. Embed the data URL directly in the pack.

### stickers

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

| Field | Meaning |
| --- | --- |
| `type` | `"emoji"` or `"image"` (image uses a png/jpeg/webp data URL) |
| `value` | Emoji character or image data URL |
| `x` / `y` | Position, 0–100 (percentage of the preview area) |
| `size` | Size, 16–200 px |
| `rotation` | Rotation, -180–180 degrees |
| `scope` | `"always"`, `"welcome"` (welcome page only), `"reading"` (reading only) |

At most 40. Image stickers inline base64 into `theme.json` and make the pack much bigger; prefer emoji.

### customButtons: buttons and script API

```json
"customButtons": [
  {
    "label": "Insert date",
    "icon": "📅",
    "script": "await app.insert(new Date().toLocaleDateString('en-CA'));"
  }
]
```

| Field | Limit |
| --- | --- |
| `label` | Required, ≤40 characters |
| `icon` | ≤4 characters (one emoji is enough) |
| `script` | Required, ≤6000 characters, async function body (`await` allowed) |

Scripts run in the renderer with `app` as the parameter (`markdown` is an alias of the same object):

| API | Meaning |
| --- | --- |
| `app.content` | Current document Markdown (read-only) |
| `app.selection` | Selected text (read-only) |
| `app.info` | `{ name, path, dirty, length }` or `null` |
| `app.setContent(text)` | Replace the whole document |
| `app.insert(text)` | Insert at the caret |
| `app.replaceSelection(text)` | Replace the selection |
| `app.newDocument()` | Create a document |
| `app.open()` / `app.openPath(path)` | Open file dialog / open a path |
| `app.save()` / `app.saveAs()` | Save / save as |
| `app.exportHtml()` / `app.exportPdf()` / `app.exportText()` | Export |
| `app.toast(message)` | Show a toast |
| `app.setViewMode(mode)` | `read` / `split` / `edit` / `visual` |
| `app.setTheme(theme)` | `light` / `dark` / `system` |
| `app.setColors(primary, secondary)` | Change the accents |
| `app.openStudio()` | Open the Theme Studio |

Button scripts share the same `app` API as plugin commands; file/format helpers such as `app.pickFile`, `app.importDocx` and `app.createDocument` are available too (see [Plugin Authoring](en-Plugin-Authoring)).

At most 24 buttons. Button scripts have the same permissions as manual actions, so **only import theme packs you trust**; the first run of a button also shows its source before executing.

### uiHidden: hiding UI elements

An array of element IDs; unknown IDs are ignored. `sidebar` also collapses the sidebar slot.

| Group | IDs |
| --- | --- |
| Top bar | `brand`, `window-title`, `theme-button`, `studio-button`, `help-button`, `settings-button` |
| Sidebar | `sidebar`, `sidebar-actions`, `recent`, `outline`, `assoc-badge`, `sidebar-version` |
| Toolbar & status bar | `sidebar-toggle`, `view-switch`, `more-button`, `format-bar`, `save-state`, `save-button`, `statusbar`, `status-counts`, `status-cursor`, `status-sync`, `status-meta` |
| Content & decoration | `welcome-art`, `welcome-tiles`, `welcome-hint`, `code-copy`, `color-chips`, `html-preview-button`, `stickers`, `custom-dock` |

```json
"uiHidden": ["brand", "window-title", "welcome-art", "assoc-badge"]
```

## home.md: custom home page

When enabled, the welcome page is replaced by your Markdown (the default title, artwork and shortcut cards are hidden).

```markdown
# Forest desk

A quiet green theme for long writing sessions.

![Cover](assets/cover.png)

- Full Markdown
- $E = mc^2$ math and syntax highlighting
- [Links](https://example.com)
```

Rules:

- Markdown, GFM tables, task lists, footnotes, KaTeX math and syntax highlighting are supported.
- Reference images as `assets/xxx.png` (relative to the pack); they resolve after import. **Do not use absolute `file://` paths.**
- Keep images ≤1200px wide and compressed; ~8 MB per image suggested (12 MB hard limit per ZIP entry).
- `http(s)`, `mailto` and `tel` links open with the system handler; relative links have no document context on the home page, so use full URLs.
- Set `"home": { "enabled": true }` (important for clipboard/JSON imports); a `home.md` inside the ZIP also enables it automatically.
- Size limit: about 300,000 characters for `home.md` in a ZIP (truncated on import), 1 MB when exporting.

Editing the home page inside the app copies inserted images into the theme asset folder and uses absolute URLs; exporting the pack converts them back to `assets/...`.

## style.css: page stylesheet

`style.css` is injected as `<style id="appCustomCss">` at the end of the page and wins over built-in rules of equal specificity.

```css
/* Squarer buttons */
:root { --radius-lg: 4px; --radius-md: 4px; }

/* Keep decorative tweaks restrained */
.welcome .lede { letter-spacing: 0.02em; }

/* Dark mode override */
html[data-theme="dark"] .statusbar { background: #101312; }
```

Common CSS variables (prefer variables over hard-coded colours):

| Variable | Meaning |
| --- | --- |
| `--bg` / `--bg-deep` | App background / deeper layer |
| `--titlebar` / `--titlebar-tint` | Title bar / tint |
| `--sidebar` / `--sidebar-deep` | Sidebar / deeper sidebar |
| `--surface` | Workspace surface |
| `--paper` / `--paper-soft` | Reading paper / paper layer |
| `--accent` / `--accent-strong` / `--accent-soft` / `--accent-wash` | Accent and three levels of tint |
| `--accent-contrast` | Text colour on accent backgrounds |
| `--gold` | Secondary accent |
| `--green` / `--blue` / `--purple` / `--danger` | Semantic colours |
| `--ink` / `--ink-soft` / `--muted` / `--faint` | Four text levels |
| `--line` / `--line-soft` / `--line-strong` | Three line levels |
| `--selection` | Selection background |
| `--code-bg` / `--code-ink` / `--code-head` | Code block |
| `--table-head` / `--quote-bg` | Table header / quote (written by component colours) |
| `--radius-sm` / `--radius-md` / `--radius-lg` | Corner radii |
| `--shadow-sm` / `--shadow-md` / `--shadow-lg` | Shadows |
| `--font-ui` / `--font-reading` / `--font-mono` | Font families |
| `--editor-size` / `--preview-size` | Body sizes (driven by settings) |
| `--hl-keyword` / `--hl-string` / `--hl-number` / `--hl-comment` / `--hl-function` / `--hl-type` / `--hl-attr` / `--hl-builtin` / `--hl-meta` | Syntax highlighting |

Useful structural selectors:

| Selector | Area |
| --- | --- |
| `.shell` | Overall grid (sidebar + workspace) |
| `#titlebar` / `.brand` / `.titlebar-actions` | Title bar |
| `#sidebar` / `.sidebar-actions` / `.side-section` | Sidebar |
| `.workspace` / `.tabbar` / `.tabs` | Tab bar area |
| `.format-bar` | Formatting toolbar |
| `.editor-pane` / `.cm-editor` / `.cm-gutters` | Editor |
| `#previewPane` / `.markdown-body` | Reading pane |
| `.code-block` / `.table-shell` / `.math-block` | Code block / table / math |
| `.statusbar` | Status bar |
| `.welcome` / `.custom-home` | Welcome page and custom home |
| `#stickerLayer` / `#customDock` | Sticker layer / custom button dock |

Limits and caveats:

- **No JavaScript**: CSS only changes appearance.
- Remote fonts and remote `@import` are blocked by the CSP; remote images (`https:`) are allowed.
- Images can use `url(assets/xxx.png)` (rewritten on import), `data:` or `https:`.
- Component colours are inline variables; overriding them needs `!important` (for example `html { --ink: #111 !important; }`).
- Scope dark mode with `html[data-theme="dark"]`, light with `html[data-theme="light"]`.
- Size limits: 600,000 characters on import, 1 MB exported file.

## assets: images

- Put files under `assets/` and reference them as `assets/file.png` from `home.md` or `style.css`.
- File names may only contain letters, digits, `.`, `_`, `-` and CJK characters; no subdirectories, no leading dot.
- Prefer png / jpg / webp / svg; gif works but is large.
- Limits: ~8 MB per image suggested (12 MB hard limit per ZIP entry); up to 60 images and 24 MB total when exporting.
- Keep the case of references consistent with file names.

```text
assets/cover.png   →  ![Cover](assets/cover.png)
assets/pattern.svg →  .welcome { background-image: url(assets/pattern.svg); }
```

## Packaging and importing

### Building the ZIP

- **Windows (Explorer)** — open the theme folder, select **the files inside** (`theme.json`, `style.css`, `home.md`, `assets`), right-click → “Compress to ZIP file”, then rename to `my-theme.moread-theme.zip`.
- **PowerShell**:

  ```powershell
  Compress-Archive -Path theme.json,style.css,home.md,assets `
    -DestinationPath my-theme.moread-theme.zip -Force
  ```

- **macOS** — select the files (not the outer folder) → right-click → “Compress”.

Requirements:

- A standard ZIP; store and deflate are both supported (Explorer/Finder output qualifies).
- Encrypted ZIPs, 7z, RAR and multi-volume archives are not supported.
- `theme.json` must be at the **archive root**; one extra folder level breaks the import.
- Import limit 32 MB; 40 MB uncompressed total, 12 MB per file, 400 entries.

### Importing

| Method | How |
| --- | --- |
| Drag into the window | Drop the `.zip` onto MoRead (desktop) |
| Theme Studio | Theme packs → “Import theme pack” |
| Command line | `MoRead.exe --import-theme="D:\path\my-theme.moread-theme.zip"` |
| Clipboard | Copy the `theme.json` text → “Import from clipboard” (no `assets/`) |

A confirmation dialog lists what will be replaced; cancelling changes nothing. Restarting once after import confirms the settings were persisted.

### Export and edit again

Theme Studio → “Export .zip” packs the current state for further editing; “Copy JSON” shares just the palette (no images).

## Full example

```json
{
  "format": "moread-theme",
  "version": 2,
  "name": "Forest green",
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
      { "label": "Insert date", "icon": "📅", "script": "await app.insert(new Date().toLocaleDateString('en-CA'));" }
    ],
    "uiHidden": ["assoc-badge"]
  }
}
```

`home.md`:

```markdown
# Forest desk

A quiet green theme for long writing sessions.

![Cover](assets/cover.png)

- Math: $E = mc^2$
- Code: `npm run build`
- Link: [Markdown guide](https://commonmark.org/help/)
```

`style.css`:

```css
:root { --radius-lg: 6px; }
.welcome .lede { letter-spacing: 0.02em; }
html[data-theme="dark"] .statusbar { background: #0f1411; }
```

## Limits and safety

- Importing replaces the current theme settings; **documents are not modified**.
- Button scripts from a pack run locally with the same permissions as manual actions; CSS can hide or cover UI.
- Packs with script buttons ask separately on import, and each button asks again on first run.
- Only import packs from sources you trust; when unsure, unzip and read `theme.json` and `style.css` first.
- Images are stored under `theme-assets/` in the user data directory, never in your document folders.
- Packs do not load remote code; remote images/fonts are constrained by the CSP.

## Troubleshooting

| Symptom | Usual cause | Fix |
| --- | --- | --- |
| “theme.json missing” | Extra folder level; wrong case or extension | Put `theme.json` at the ZIP root |
| “theme pack version 3 is newer than supported 2” | Wrong `version` | Use `2` (or `1`) |
| Home page does not appear | JSON import without `home.enabled`, or empty `home.md` | Add `"home": { "enabled": true }` and content |
| Home images missing | Absolute `file://`; not under `assets/`; illegal file name | Use `assets/xxx.png` and only letters, digits, CJK, `._-` |
| CSS has no effect | Overridden by inline component colours; remote `@import` | Add `!important` for component variables; use a local file |
| Icon/sticker missing | Not a png/jpeg/webp data URL, or too long | Re-export in an allowed format, under 500 KB |
| Previous theme lost | Packs replace everything | Back up with “Copy JSON” or re-import the old pack |
| Export too large | Large images inlined in CSS or image stickers | Compress images; prefer emoji stickers |
| ZIP will not import | 7z/RAR/encrypted archive | Repack as a standard ZIP |
| Dark mode looks white | CSS hard-codes a light background | Use variables or `html[data-theme="dark"]` |

## Version compatibility

| Version | Change |
| --- | --- |
| `1` | Single `.json`: palette, component colours, icon, stickers, buttons, hidden UI |
| `2` | ZIP: adds `style.css`, `home.md`, `assets/`; `theme.json` gains `home` / `style` flags |

- Version 1 `.json` files still import (as a full theme replacement; home page and CSS are cleared).
- Anything above version 2 is rejected with a message naming the supported maximum.
- Unknown fields are ignored for forward compatibility; do not rely on undeclared fields.
