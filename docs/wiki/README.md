# Wiki source pages

`docs/wiki/` holds the four public guides in Chinese and English, formatted to be copied straight into a GitHub Wiki. The app itself keeps its own copies under `docs/` and the repo root; these pages are standalone versions (no repository-relative links, current feature set described).

## Page map

| File | Wiki page | Source |
| --- | --- | --- |
| `Home.md` | `Home` | 新建 |
| `_Sidebar.md` | `_Sidebar` | 新建 |
| `zh-Introduction.md` | `zh-Introduction` | `docs/介绍.md` |
| `zh-User-Guide.md` | `zh-User-Guide` | `docs/使用指南.md` |
| `zh-Theme-Packs.md` | `zh-Theme-Packs` | `docs/主题包制作指导.md` |
| `zh-Plugin-Authoring.md` | `zh-Plugin-Authoring` | `插件制作指导.md` |
| `en-Introduction.md` | `en-Introduction` | 上表英文版 |
| `en-User-Guide.md` | `en-User-Guide` | 上表英文版 |
| `en-Theme-Packs.md` | `en-Theme-Packs` | 上表英文版 |
| `en-Plugin-Authoring.md` | `en-Plugin-Authoring` | 上表英文版 |

## Publishing to GitHub Wiki

1. Enable the wiki: repository **Settings → Features → Wikis**.
2. Clone the wiki repository (note the `.wiki.git` suffix):

   ```bash
   git clone https://github.com/<owner>/<repo>.wiki.git
   ```

3. Copy every file in this directory **except this `README.md`** to the wiki repository root:

   ```bash
   cp docs/wiki/Home.md docs/wiki/_Sidebar.md \
      docs/wiki/zh-*.md docs/wiki/en-*.md <wiki-clone>/
   ```

4. Commit and push:

   ```bash
   cd <wiki-clone>
   git add .
   git commit -m "docs: add Chinese and English guides"
   git push
   ```

5. Open `https://github.com/<owner>/<repo>/wiki` and check:
   - `Home` renders both language sections;
   - the sidebar appears on every page;
   - every `zh-*` / `en-*` link resolves (click through both languages).

## Link conventions

- Page links use Markdown links to the page name: `[使用指南](zh-User-Guide)`. GitHub Wiki does **not** understand MediaWiki-style `[[...]]`.
- Page filenames stay ASCII (`zh-` / `en-` prefix + English slug) so URLs are stable even though the content is Chinese; the visible title is the H1 of each page.
- Do not link to repository-relative paths (`../插件制作指导.md` does not exist in the wiki). Link wiki pages or external URLs only.
- Every page starts with a language switcher line pointing at its counterpart.

## Keeping the two languages in sync

- Change the Chinese page first, then update the English page in the same commit.
- When a feature changes (plugin commands, Android support, limits), update `Home.md` only if the overview changes; the four guides carry the details.
- These pages intentionally describe the **current build** rather than a frozen release. If a detail is uncertain, phrase it as "当前版本" instead of a version number that will age.

## Screenshots

The pages currently have no images so the wiki clone stays small and nothing breaks on first publish. If you add screenshots later, upload them to the wiki repository (for example `assets/settings.png`) and reference them with relative links (`![设置](assets/settings.png)`), not `raw.githubusercontent.com` URLs pinned to a branch.
