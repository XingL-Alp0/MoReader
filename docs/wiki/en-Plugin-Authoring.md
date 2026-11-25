# MoRead Plugin Authoring Guide

> English · [中文](zh-Plugin-Authoring)

Plugins can add custom Markdown elements, script buttons, and import / export / tool commands to the **More (更多)** menu, and they can ship their own icon and image resources. Desktop and Android share the same manifest and script rules.

> Plugins are local executable code and MoRead **does not sandbox them**. Only install and enable plugins whose source you trust.

## 1. Plugin folder

On desktop a plugin lives in either:

- the app folder: `plugins/<plugin-id>/` (bundled plugins)
- the user data folder: `<user-data>/plugins/<plugin-id>/` (installed by the user; same id overrides the bundled one)

On Android plugins can only be installed into app-private storage, `files/plugins/<plugin-id>/`, through **Install plugin (.zip)**.

Recommended layout:

```text
plugins/
└─ wave-line/
   ├─ plugin.json
   ├─ index.js
   └─ assets/
      └─ icon.svg          ← plugin icon (required when installing)
```

ID rules:

- lowercase letters, digits, dots, underscores and hyphens only
- must start with a lowercase letter, 2–64 characters
- examples: `wave-line`, `com.example.timer`

## 2. plugin.json

Minimal manifest:

```json
{
  "id": "hello-plugin",
  "name": "Hello plugin",
  "version": "1.0.0",
  "author": "Your name",
  "description": "A sample plugin",
  "icon": "assets/icon.svg",
  "entry": "index.js"
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Unique plugin id |
| `name` | no | Display name |
| `version` | no | Plugin version |
| `author` | no | Author |
| `icon` | **yes** (for zip installs) | Relative path to an icon file; SVG / PNG / JPEG / WebP; `iconFile` is an alternative |
| `description` | no | Short description |
| `entry` | no | Entry script, defaults to `index.js` |
| `permissions` | no | Declared permissions (declarative only) |
| `resources` | no | Bundled images/fonts |
| `elements` | no | Custom Markdown elements |
| `buttons` | no | Script buttons |
| `commands` | no | Commands in the More menu |

### The icon file

- Location: inside the plugin folder, for example `assets/icon.svg`; no `..` or absolute paths
- Forms: `"icon": "assets/icon.svg"`, `{ "file": "...", "glyph": "◇" }`, or `"icon": "◇", "iconFile": "assets/icon.svg"`
- Formats: `.svg` / `.png` / `.jpg` / `.jpeg` / `.webp`, at most 512 KB
- ZIP installs are validated: a missing icon, an out-of-tree path or a missing file rejects the install
- SVG icons are drawn as a **mask** (`mask-image`) and follow the theme's text colour; bitmaps render as-is
- Old folder-installed plugins with only a glyph such as `"icon": "▣"` still fall back to that glyph; new packages must include an icon file
- A button's own `buttons[].icon` stays a short glyph/emoji and can differ from the plugin icon

## 3. Entry script

`index.js` can export `activate` and `deactivate`:

```js
module.exports = {
  async activate(plugin) {
    plugin.log("Plugin enabled", plugin.metadata.name);
  },

  async deactivate() {
    // clear timers or listeners
  }
};
```

The `plugin` object provides `plugin.id`, `plugin.metadata` and `plugin.log(...)`.

Execution environment:

- **Desktop** — the entry runs in a `vm` context: top-level code is limited to 1 second, the entry file to 2 MB, and `require` only resolves relative files inside the plugin folder (`fs`, `child_process` and other externals are rejected).
- **Android** — the entry runs in the renderer through `new Function`: there is **no `require`**, so other JS files in the plugin folder and Node modules cannot be loaded.
- On both platforms these limits guard against mistakes, **not against malice**. Plugins run with host/page privileges; only enable plugins you trust.

`permissions` is declared metadata only; nothing is enforced at runtime.

## 4. Custom Markdown elements

Add short-tag elements to Markdown:

```md
[area width="320px" height="120px" color="#c4562d"]
```

Declare them:

```json
{
  "elements": [
    {
      "name": "area",
      "label": "Area",
      "description": "A configurable coloured area",
      "html": "<div class=\"plugin-area\" style=\"width:{width};height:{height};background:{color}\"></div>",
      "css": ".plugin-area { border-radius: 12px; opacity: .85; }",
      "defaults": { "width": "320px", "height": "120px", "color": "#c4562d" }
    }
  ]
}
```

Attributes may be written as `key=value`, `key="value"` or `key='value'`. `{key}` in the template is replaced by the attribute; missing attributes fall back to `defaults`.

### Insert form (fields)

Elements can declare `fields`; picking the element opens a form first:

```json
"fields": [
  { "key": "title", "label": "Title", "type": "text", "placeholder": "Callout title" },
  { "key": "content", "label": "Content", "type": "textarea" },
  { "key": "color", "label": "Accent", "type": "color" }
]
```

- `type`: `text` / `textarea` / `color` / `select` / `number` / `boolean`; `select` needs `options: [{ "value": "wave", "label": "Wave" }]`
- Without `fields`, a form is derived from `defaults`
- The element is inline syntax: multi-line input is flattened and double quotes in values are escaped
- Only declare fields users should change; `defaults` not in the form are preserved; cleared fields are written as `key=""`

### Resource references (resources)

```json
"resources": { "wave": "assets/wave.svg" }
```

Use `{resource:wave}` in the element's HTML and CSS:

```json
"css": ".divider-wave { mask-image: url({resource:wave}); }"
```

Rules:

- Relative paths inside the plugin folder only; no `..` or absolute paths
- At most 32 resources, 8 MB each
- Resources are installed into the app's plugin folder, never into document folders
- Undeclared, missing or out-of-tree files are not exposed and render empty
- Exported HTML/PDF uses absolute `file://` URLs, so images may be missing on another machine

## 5. Plugin buttons

```json
{
  "buttons": [
    {
      "id": "insert-area",
      "label": "Insert area",
      "icon": "▣",
      "placement": "dock",
      "script": "app.insert('[area width=\"320px\" height=\"120px\"]')"
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `id` | Unique id within the plugin |
| `label` | Button label |
| `icon` | Button glyph |
| `placement` | Reserved (`dock` / `floating`); plugin buttons currently all live in the format-bar plugin menu, so this value does not change placement yet |
| `script` | Async function body run on click |

Buttons can call the app script API:

```js
app.insert("Inserted text");
app.setContent("Replace the whole document");
app.replaceSelection("Replace the selection");
await app.save();
await app.saveAs();
app.openStudio();
app.toast("Done");
```

Read-only data: `markdown.content`, `markdown.selection`, `markdown.info`.

Buttons appear in the format bar's plugin menu: one icon per plugin on desktop, one **Plugin** dropdown on phones. The first run shows the origin and script and asks for confirmation.

## 6. Plugin commands (import / export / tools)

File-like actions (import Word, export PDF, …) go into **More** through `commands`:

```json
{
  "commands": [
    {
      "id": "import-docx",
      "label": "Import Word document…",
      "icon": "file-down",
      "group": "import",
      "description": "Convert a .docx to Markdown",
      "script": "const file = await app.pickFile({ title: 'Import Word document', extensions: ['docx', 'docm', 'doc'] });\nif (!file) return;\nconst result = await app.importDocx(file.path);\nawait app.createDocument(result.markdown, file.name.replace(/\\.(docx|docm)$/i, '') + '.md');\nif (result.warnings && result.warnings.length) app.toast(result.warnings.join('; '));"
    }
  ]
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Starts with a lowercase letter, 2–64 chars (`^[a-z][a-z0-9._-]{1,63}$`) |
| `label` | yes | Menu label |
| `icon` | no | Built-in icon name (for example `file-down`, `printer`) or a short glyph |
| `group` | no | `import` / `export` / `tools`, defaults to `tools` |
| `description` | no | Tooltip |
| `script` | yes | Async function body, ≤20000 characters |

Placement and behaviour:

- `import` sits under **More → Share current document** and above the built-in **Export HTML**, and is mirrored on the **welcome page** below New/Open, so imports work before any document is open
- `export` sits after the three built-in exporters and is disabled when no document is open
- `tools` sits after **Reload from disk**
- Command ids are `plugin:<plugin-id>:<command-id>`; the first run asks for confirmation, and “Trust and run” stops further prompts
- Disabling/uninstalling the plugin removes the menu items and welcome-page buttons immediately

File/format APIs available to commands:

| API | Meaning |
| --- | --- |
| `app.pickFile({ title, extensions })` | System file dialog; returns `{ path, name, extension, size }` or `null` when cancelled |
| `app.importDocx(path)` | `.docx` / `.docm` → Markdown, returns `{ markdown, warnings }` |
| `app.createDocument(content, name)` | Create and activate an unsaved document, returns `{ id, name }` |
| `app.exportHtml()` / `app.exportPdf()` / `app.exportText()` | Built-in exporters |
| `app.save()` / `app.saveAs()` | Save / save as |
| Same as buttons | `app.insert`, `app.setContent`, `app.toast`, … |

Word import covers headings (Heading 1–6 / Title / Subtitle), bold/italic/strikethrough, monospace runs, lists (normalised to `-`), quotes and simple tables. Images, footnotes and field codes are skipped and reported in `warnings`. Legacy `.doc` must be saved as `.docx` first.

The sample plugin `plugins/moread-office/` demonstrates all three groups (import Word, export PDF, insert divider) on desktop and Android; copy it as a starting point.

## 7. Install, uninstall and debug

### Install

- **Zip package (recommended)** — ZIP the plugin folder; `plugin.json` may be at the archive root or inside a single top-level folder. Use **Settings → Plugins → Install plugin (.zip)**. The plugin is installed into user data (app-private storage on Android) and can then be enabled, disabled or uninstalled. Installing the same id asks to overwrite, which updates it.
  - Build the package with `npm run pack:plugin -- plugins/<folder>`; the result is `release/<id>-<version>.zip`
- **Manual install (desktop only)** — copy the folder into `plugins/` (app or user data).

### Manage

- The list supports search by name/author/id and status filters; **Details** shows elements, buttons, commands, permissions, entry file and folder (desktop can reveal it).
- **Rescan** unloads and re-runs entry scripts, so editing `index.js` does not require a restart.
- User-installed plugins can be uninstalled; bundled plugins can only be disabled. Load failures are shown with their reason.

### Debug

- Terminal/DevTools logs carry `[plugins]` and `[plugin:<id>]` lines
- Check that `plugin.json` is valid JSON, that `id` follows the rules, and that `entry` exists
- Check for duplicate element names and for blocked externals (`require` on desktop)
- Buttons/commands ask on first run; disabled plugins expose no entries

## 8. Android

Android has no Node process; a renderer-side host manages plugins and exposes the same surface to authors:

- **Install** — only **Settings → Plugins → Install plugin (.zip)**, choosing the archive through SAF; it is extracted to `files/plugins/<id>/` with an index at `files/plugins/index.json`. There is no browsable plugin folder and no manual copy
- **Enable / disable / uninstall / rescan** — same as desktop; uninstall deletes the folder and updates the index
- **Entry script** — executed in the renderer; supports `module.exports`, `exports`, `activate(plugin)`, `deactivate()`; **no `require`**
- **No sandbox** — desktop and Android both run plugin code with local privileges; only enable reviewed plugins
- **Elements / buttons / commands** — exactly the desktop rules; import commands also appear on the welcome page
- **Icon and resources** — served through Capacitor's local file service; `icon` and `{resource:key}` are unchanged
- **Word import** — `app.pickFile` and `app.importDocx` work on Android; with multiple extensions SAF shows all files and the extension is validated after picking
- **PDF export** — uses the Android system print panel

## 9. Trust and safety

- Plugins are local executable code with **no sandbox**; buttons, commands and theme-pack buttons can run arbitrary JavaScript
- `permissions` is declarative only and does not restrict anything at runtime
- Only install from trusted sources; when unsure, unzip and read `plugin.json` and the entry script
- Exports reference plugin resources with absolute `file://` URLs, which break on another machine

## 10. Packaging and publishing

```bash
npm run pack:plugin -- plugins/moread-office
# → release/moread-office-1.1.0.zip
```

A publishable package usually contains:

```text
plugin-folder/
├─ plugin.json
├─ index.js
├─ README.md
├─ LICENSE
└─ assets/icon.svg
```

In the README document: features, compatible versions, installation, Markdown syntax examples, button/command behaviour, permissions and privacy, and a changelog. `appVersion` in `plugin.json` is currently ignored, so do not rely on it as a version gate. Prefer the stable `app` API and avoid depending on undocumented DOM structure.

## 11. Common failures

| Symptom | Cause | Fix |
| --- | --- | --- |
| Install rejected: missing icon / icon not found | New installs must ship an `icon` file | Add `assets/icon.svg` and check the path |
| The list shows “load failed” | Entry error, missing file, invalid JSON | Read the reason in the list and the `[plugins]` log |
| Element does not render | Invalid name, sanitised HTML, typo in syntax | Name `^[a-z][a-z0-9._:-]{1,63}$`; use `[name k="v"]` |
| Command is missing | Plugin disabled, or no document and not an import command | Enable the plugin; import commands live on the welcome page |
| Desktop `require` rejected | Only relative files inside the plugin folder | Vendor the dependency inside the plugin, or avoid `require` on Android |
