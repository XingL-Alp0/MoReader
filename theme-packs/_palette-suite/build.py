# -*- coding: utf-8 -*-
"""生成六套配色主题包：theme.json + style.css + home.md + assets/，并打包 ZIP。

用法：
    python build.py            # 全部重建
    python build.py xuancai    # 只重建一套（按 slug）
"""
from __future__ import annotations

import base64
import json
import sys
import zipfile
from pathlib import Path
from string import Template

from artwork import art_svg, grain_svg, make_icon, icon_strip
from palettes import PALETTES, Palette, component_colors, palette_by_slug, style_tokens

SUITE = Path(__file__).resolve().parent
PACKS_ROOT = SUITE.parent
REPO = PACKS_ROOT.parent
BUILD = SUITE / "_build"
ICONS = BUILD / "icons"
MANIFEST = BUILD / "manifest.json"

MODE_LABEL = {"light": "浅色", "dark": "深色"}

CAPTIONS = {
    "xuancai": "远山、印章与一点朱砂",
    "qingci": "远雾、山脊与一枚瓷钮",
    "ouhe": "落日、水纹与半开的荷",
    "moye": "星轨、月牙与看不见的海",
    "songyan": "松林、山脊与未散的雾",
    "luoxia": "落日、沙丘与飞过的鸟",
}

CSS_TEMPLATE = Template(
    """/* ==========================================================================
   $name — 墨阅主题包 · 样式层
   $modeLabel · 主强调 $primary · 副强调 $secondary
   组件颜色由 theme.json 写入；这里补齐组件颜色覆盖不到的变量与细节质感。
   ========================================================================== */

html[data-theme] {
  color-scheme: $scheme;
  --accent-contrast: $accentInk !important;
  --line-strong: $lineStrong;
  --sidebar-deep: $sidebarDeep;
  --green: $green;
  --blue: $blue;
  --purple: $purple;
  --danger: $danger;
  --shadow-sm: $shadowSm;
  --shadow-md: $shadowMd;
  --shadow-lg: $shadowLg;
  --hl-keyword: $hlKeyword;
  --hl-string: $hlString;
  --hl-number: $hlNumber;
  --hl-comment: $hlComment;
  --hl-function: $hlFunction;
  --hl-type: $hlType;
  --hl-attr: $hlAttr;
  --hl-builtin: $hlBuiltin;
  --hl-meta: $hlMeta;
  --radius-sm: ${radiusSm}px;
  --radius-md: ${radiusMd}px;
  --radius-lg: ${radiusLg}px;
}

/* 顶栏与状态栏 -------------------------------------------------------------- */
.titlebar {
  border-bottom-color: color-mix(in srgb, var(--gold) 16%, var(--line-soft));
  background-image: linear-gradient(
    90deg,
    color-mix(in srgb, var(--accent) 8%, transparent),
    transparent 46%,
    color-mix(in srgb, var(--gold) 6%, transparent)
  );
}

.statusbar {
  border-top-color: color-mix(in srgb, var(--accent) 16%, var(--line));
  letter-spacing: 0.02em;
}

/* 欢迎页：一层纸纹 + 两团很淡的光 -------------------------------------------- */
.welcome {
  background-color: var(--surface);
  background-image:
    radial-gradient(
      1100px 620px at 82% 12%,
      color-mix(in srgb, var(--accent) 12%, transparent),
      transparent 62%
    ),
    radial-gradient(
      760px 460px at 8% 94%,
      color-mix(in srgb, var(--gold) 8%, transparent),
      transparent 68%
    ),
    url(assets/grain.svg);
  background-repeat: no-repeat, no-repeat, repeat;
  background-position: center, center, left top;
  background-size: auto, auto, 180px 180px;
}

/* 标题 ---------------------------------------------------------------------- */
.markdown-body h1 {
  letter-spacing: 0.01em;
}

.markdown-body h1::after {
  width: ${h1Width}px;
  background: linear-gradient(90deg, var(--accent), var(--gold));
}

.markdown-body h2 {
  border-bottom-color: color-mix(in srgb, var(--gold) 16%, var(--line-soft));
}

.markdown-body h2::before {
  content: "$marker";
  margin-right: 0.46em;
  font-family: var(--font-ui);
  font-size: 0.52em;
  font-weight: 400;
  color: var(--gold);
  vertical-align: 0.3em;
}

/* 链接与引用 ---------------------------------------------------------------- */
.markdown-body a {
  border-bottom-color: color-mix(in srgb, var(--accent) 40%, transparent);
}

.markdown-body a:hover {
  color: var(--gold);
  border-bottom-color: color-mix(in srgb, var(--gold) 70%, transparent);
  background: color-mix(in srgb, var(--gold) 8%, transparent);
}

.markdown-body blockquote {
  position: relative;
  padding: 0.9em 1.3em;
  border-left-width: 2px;
  border-radius: 0 ${radiusMd}px ${radiusMd}px 0;
  background-image: linear-gradient(
    90deg,
    color-mix(in srgb, var(--accent) 12%, transparent),
    transparent 72%
  );
}

.markdown-body blockquote::after {
  content: "$ornament";
  position: absolute;
  right: 12px;
  top: 3px;
  font-size: 24px;
  line-height: 1;
  color: color-mix(in srgb, var(--gold) 42%, transparent);
  pointer-events: none;
}

/* 代码块 -------------------------------------------------------------------- */
.markdown-body pre,
.code-block {
  border-color: color-mix(in srgb, var(--accent) 18%, var(--line));
  border-radius: ${radiusMd}px;
}

.markdown-body pre {
  box-shadow: 0 18px 42px -34px $shadowInk;
}

.code-head {
  background-image: linear-gradient(
    90deg,
    color-mix(in srgb, var(--accent) 8%, transparent),
    transparent 72%
  );
}

.code-lang {
  color: color-mix(in srgb, var(--gold) 80%, var(--muted));
}

.markdown-body code {
  background-color: color-mix(in srgb, var(--accent) 8%, var(--code-bg));
  border-color: color-mix(in srgb, var(--accent) 15%, var(--line-soft));
}

/* 表格 ---------------------------------------------------------------------- */
.markdown-body table {
  border-color: color-mix(in srgb, var(--accent) 15%, var(--line));
  border-radius: ${radiusSm}px;
}

.markdown-body thead th {
  color: color-mix(in srgb, var(--ink) 84%, var(--gold));
  border-bottom-color: color-mix(in srgb, var(--gold) 22%, var(--line));
}

/* 分隔线与选中 -------------------------------------------------------------- */
.markdown-body hr {
  background: color-mix(in srgb, var(--gold) 24%, var(--line));
}

.markdown-body hr::after {
  color: color-mix(in srgb, var(--gold) 60%, var(--faint));
}

::selection {
  background: color-mix(in srgb, var(--accent) 34%, transparent);
}

/* 主按钮：强调色到副强调色 -------------------------------------------------- */
.btn-primary {
  background-image: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent) 88%, $lightTone) 0%,
    var(--accent) 52%,
    color-mix(in srgb, var(--accent) 74%, var(--gold)) 100%
  );
  box-shadow:
    0 10px 26px -16px color-mix(in srgb, var(--accent) 85%, transparent),
    inset 0 1px 0 $gloss;
}

.btn-primary:hover {
  background-image: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent) 80%, $lightTone) 0%,
    var(--accent-strong) 55%,
    color-mix(in srgb, var(--accent) 66%, var(--gold)) 100%
  );
}

/* 自定义主页 ---------------------------------------------------------------- */
.custom-home img {
  border-radius: ${radiusMd}px;
  border: 1px solid color-mix(in srgb, var(--gold) 20%, transparent);
  box-shadow:
    0 30px 64px -46px $deepShadow,
    0 0 0 1px color-mix(in srgb, var(--ink) 4%, transparent);
}

.custom-home h1 + blockquote {
  margin: 0.1em 0 1.5em;
  padding: 0;
  border: 0;
  background: none;
  font-family: var(--font-reading);
  font-size: 1.08em;
  font-style: italic;
  letter-spacing: 0.02em;
  color: color-mix(in srgb, var(--ink-soft) 88%, var(--gold));
}

.custom-home h1 + blockquote::after {
  content: none;
}

.custom-home p > em:only-child {
  color: var(--muted);
  font-size: 0.92em;
}

/* 滚动条 -------------------------------------------------------------------- */
::-webkit-scrollbar-thumb {
  background-color: color-mix(in srgb, var(--accent) 24%, var(--line));
}

::-webkit-scrollbar-thumb:hover {
  background-color: color-mix(in srgb, var(--accent) 42%, var(--line));
}
$extra"""
)


HOME_TEMPLATE = Template(
    """# $name

> $tagline

![$name](assets/art.svg)

*$caption*

## 这套主题

- $bullet1
- $bullet2
- $bullet3

主色 `$primary` · 副色 `$secondary` · $modeLabel

- [x] 换一套配色，界面像换了一间屋子
- [ ] 想把哪一处颜色再挪一挪，去「主题工作室 → 组件颜色」

> $quote
"""
)


BUTTON_TEMPLATE = """const d = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
await app.insert(`\\n\\n> ${stamp} · __NAME__\\n`);
app.toast('落款已插入');"""

QUOTE_BUTTON = """const picked = app.selection || '';
if (!picked.trim()) { app.toast('先选中一段文字'); return; }
const quoted = picked.split('\\n').map((line) => `> ${line}`).join('\\n');
await app.replaceSelection(quoted);
app.toast('已围成引用');"""


def build_css(palette: Palette) -> str:
    tokens = style_tokens(palette)
    return CSS_TEMPLATE.substitute(
        name=palette.name,
        modeLabel=MODE_LABEL[palette.mode],
        primary=palette.primary,
        secondary=palette.secondary,
        marker=palette.marker,
        ornament=palette.ornament,
        h1Width=str(palette.h1_width),
        extra=palette.extra_css,
        **tokens,
    )


def build_home(palette: Palette) -> str:
    return HOME_TEMPLATE.substitute(
        name=palette.name,
        tagline=palette.tagline,
        caption=CAPTIONS[palette.slug],
        bullet1=palette.bullets[0],
        bullet2=palette.bullets[1],
        bullet3=palette.bullets[2],
        primary=palette.primary,
        secondary=palette.secondary,
        modeLabel=MODE_LABEL[palette.mode],
        quote=palette.quote,
    )


def data_url(path: Path, mime: str = "png") -> str:
    return f"data:image/{mime};base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def build_theme(palette: Palette) -> dict:
    icon_path = make_icon(palette, ICONS / f"{palette.slug}.png")
    icon = data_url(icon_path)
    assert len(icon) <= 700_000, f"{palette.slug} 图标 data URL 过长"

    return {
        "format": "moread-theme",
        "version": 2,
        "name": palette.name,
        "home": {"enabled": True},
        "style": {"enabled": True},
        "theme": {
            "mode": palette.mode,
            "primary": palette.primary,
            "secondary": palette.secondary,
            "componentColors": component_colors(palette),
            "brandIcon": {"type": "image", "value": icon},
            "stickers": [
                {
                    "type": "emoji",
                    "value": palette.sticker,
                    "x": 92,
                    "y": 12,
                    "size": 32,
                    "rotation": 9,
                    "scope": "welcome",
                }
            ],
            "customButtons": [
                {
                    "label": "日期落款",
                    "icon": "📅",
                    "script": BUTTON_TEMPLATE.replace("__NAME__", palette.name),
                },
                {"label": "选中成引", "icon": "❝", "script": QUOTE_BUTTON},
            ],
        },
    }


def write_zip(target: Path, files: list[tuple[str, bytes]]) -> None:
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in files:
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, data)


def build_one(palette: Palette) -> dict:
    pack_dir = PACKS_ROOT / f"{palette.file_stem}.moread-theme"
    assets_dir = pack_dir / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)

    theme = build_theme(palette)
    theme_text = json.dumps(theme, ensure_ascii=False, indent=2) + "\n"
    css_text = build_css(palette)
    home_text = build_home(palette)
    art_text = art_svg(palette)
    grain_text = grain_svg()

    (pack_dir / "theme.json").write_text(theme_text, encoding="utf-8", newline="\n")
    (pack_dir / "style.css").write_text(css_text, encoding="utf-8", newline="\n")
    (pack_dir / "home.md").write_text(home_text, encoding="utf-8", newline="\n")
    (assets_dir / "art.svg").write_text(art_text, encoding="utf-8", newline="\n")
    (assets_dir / "grain.svg").write_text(grain_text, encoding="utf-8", newline="\n")

    zip_path = PACKS_ROOT / f"{palette.file_stem}.moread-theme.zip"
    files = [
        ("theme.json", theme_text.encode("utf-8")),
        ("style.css", css_text.encode("utf-8")),
        ("home.md", home_text.encode("utf-8")),
        ("assets/art.svg", art_text.encode("utf-8")),
        ("assets/grain.svg", grain_text.encode("utf-8")),
    ]
    write_zip(zip_path, files)

    print(
        f"{palette.name:10s} {palette.mode:5s} "
        f"theme.json {len(theme_text) / 1024:6.1f}K  css {len(css_text) / 1024:4.1f}K  "
        f"home {len(home_text) / 1024:4.1f}K  zip {zip_path.stat().st_size / 1024:6.1f}K"
    )
    return {
        "slug": palette.slug,
        "name": palette.name,
        "fileStem": palette.file_stem,
        "mode": palette.mode,
        "primary": palette.primary,
        "secondary": palette.secondary,
        "colors": component_colors(palette),
        "readingTitle": palette.reading_title,
        "readingLede": palette.reading_lede,
        "readingNotes": list(palette.reading_notes),
        "quote": palette.quote,
        "dir": f"{palette.file_stem}.moread-theme",
        "zip": f"{palette.file_stem}.moread-theme.zip",
    }


def main() -> None:
    selected = sys.argv[1:]
    palettes = [palette_by_slug(slug) for slug in selected] if selected else PALETTES

    ICONS.mkdir(parents=True, exist_ok=True)
    entries = []
    for palette in palettes:
        entries.append(build_one(palette))

    if not selected:
        strip = icon_strip([(p, ICONS / f"{p.slug}.png") for p in PALETTES], BUILD / "icons.png")
        print(f"图标对照图 {strip.name}")

    manifest = {"packs": entries}
    if MANIFEST.exists() and selected:
        existing = json.loads(MANIFEST.read_text(encoding="utf-8"))["packs"]
        by_slug = {item["slug"]: item for item in existing}
        for entry in entries:
            by_slug[entry["slug"]] = entry
        manifest["packs"] = [by_slug[p.slug] for p in PALETTES if p.slug in by_slug]
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"清单 {MANIFEST.relative_to(REPO)}")


if __name__ == "__main__":
    main()
