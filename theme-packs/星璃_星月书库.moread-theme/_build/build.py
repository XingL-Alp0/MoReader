# -*- coding: utf-8 -*-
"""打包「星璃 · 星月书库」主题包：theme.json + style.css + home.md + assets/。"""
from __future__ import annotations

import base64
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "_build"
PACK_ROOT = ROOT.parent
NAME = "星璃 · 星月书库"
ZIP_PATH = PACK_ROOT / "星璃_星月书库.moread-theme.zip"

COMPONENT_COLORS = {
    "appBg": "#100d1b",
    "titlebarBg": "#151126",
    "sidebarBg": "#131022",
    "surfaceBg": "#17132b",
    "editorBg": "#141026",
    "paperBg": "#1a1530",
    "paperSoft": "#211b3a",
    "statusBg": "#0f0c19",
    "ink": "#ece8fa",
    "inkSoft": "#c2b9e0",
    "muted": "#8f86b4",
    "faint": "#6a6390",
    "line": "#2c2547",
    "lineSoft": "#241e3b",
    "codeBg": "#151129",
    "codeInk": "#d9d2f2",
    "codeHead": "#1e1836",
    "tableHead": "#221b3d",
    "quoteBg": "#1c1634",
    "selection": "#453474",
}

STICKERS = [
    {
        "type": "image",
        "value": "@@STICKER@@",
        "x": 92,
        "y": 13,
        "size": 90,
        "rotation": -8,
        "scope": "welcome",
    },
]

CUSTOM_BUTTONS = [
    {
        "label": "落款",
        "icon": "🌙",
        "script": (
            "const d = new Date();\n"
            "const pad = (n) => String(n).padStart(2, '0');\n"
            "const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;\n"
            "await app.insert(`\\n\\n> ✦ ${stamp} · 星璃书库\\n`);\n"
            "app.toast('落款已插入');"
        ),
    },
    {
        "label": "月光引用",
        "icon": "✦",
        "script": (
            "const picked = app.selection || '';\n"
            "if (!picked.trim()) { app.toast('先选中一段文字'); return; }\n"
            "const quoted = picked.split('\\n').map((line) => `> ${line}`).join('\\n');\n"
            "await app.replaceSelection(quoted);\n"
            "app.toast('已圈成月光');"
        ),
    },
]


def data_url(path: Path, mime: str) -> str:
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/{mime};base64,{encoded}"


def build_theme() -> dict:
    icon = data_url(BUILD / "icon_glyph.png", "png")
    sticker = data_url(BUILD / "sticker.png", "png")
    assert len(icon) < 700_000, len(icon)
    assert len(sticker) < 700_000, len(sticker)

    stickers = json.loads(json.dumps(STICKERS).replace("@@STICKER@@", sticker))

    return {
        "format": "moread-theme",
        "version": 2,
        "name": NAME,
        "home": {"enabled": True},
        "style": {"enabled": True},
        "theme": {
            "mode": "dark",
            "primary": "#a78bfa",
            "secondary": "#e4c082",
            "componentColors": COMPONENT_COLORS,
            "brandIcon": {"type": "image", "value": icon},
            "stickers": stickers,
            "customButtons": CUSTOM_BUTTONS,
            "uiHidden": ["assoc-badge"],
        },
    }


def main() -> None:
    theme = build_theme()
    theme_json = json.dumps(theme, ensure_ascii=False, indent=2)
    (ROOT / "theme.json").write_text(theme_json, encoding="utf-8")

    files = [
        ("theme.json", ROOT / "theme.json"),
        ("style.css", ROOT / "style.css"),
        ("home.md", ROOT / "home.md"),
    ]
    for asset in sorted((ROOT / "assets").iterdir()):
        files.append((f"assets/{asset.name}", asset))

    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, path in files:
            archive.write(path, arcname=name)

    print(f"theme.json {len(theme_json):,} chars")
    for name, path in files:
        print(f"  {name:24s} {path.stat().st_size/1024:8.1f} KB")
    print(f"ZIP {ZIP_PATH.name} {ZIP_PATH.stat().st_size/1024:.1f} KB")


if __name__ == "__main__":
    main()
