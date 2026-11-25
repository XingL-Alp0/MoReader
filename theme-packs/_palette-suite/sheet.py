# -*- coding: utf-8 -*-
"""把六套主题的截图拼成对照图，并生成配色速查表。"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from palettes import PALETTES, component_colors

SUITE = Path(__file__).resolve().parent
PREVIEW = SUITE / "_preview"
BUILD = SUITE / "_build"
FONT = ImageFont.truetype(r"C:\Windows\Fonts\msyh.ttc", 20)
FONT_SMALL = ImageFont.truetype(r"C:\Windows\Fonts\msyh.ttc", 14)
FONT_TITLE = ImageFont.truetype(r"C:\Windows\Fonts\msyhbd.ttc", 26)

INK = (232, 226, 216)
DIM = (150, 143, 134)
PAPER = (22, 20, 18)

CHIPS = [
    ("appBg", "背景"),
    ("sidebarBg", "侧栏"),
    ("surfaceBg", "工作区"),
    ("paperBg", "纸张"),
    ("quoteBg", "引用"),
    ("codeBg", "代码"),
    ("ink", "正文"),
    ("line", "线"),
    ("selection", "选中"),
]


def load_shots() -> list[dict]:
    shots = json.loads((PREVIEW / "shots.json").read_text(encoding="utf-8"))["shots"]
    manifest = json.loads((BUILD / "manifest.json").read_text(encoding="utf-8"))["packs"]
    by_slug = {entry["slug"]: entry for entry in manifest}
    for shot in shots:
        meta = by_slug.get(shot["slug"], {})
        shot.setdefault("primary", meta.get("primary", "#000000"))
        shot.setdefault("secondary", meta.get("secondary", "#000000"))
    return shots


def contact(kind: str, target: Path, thumb_w: int = 640) -> Path:
    shots = load_shots()
    source_h = 1440 if kind == "welcomeFull" else 1560
    thumb_h = int(thumb_w * source_h / 1280)
    label_h = 46
    pad = 22
    gap = 16
    cols = 3
    rows = (len(shots) + cols - 1) // cols
    width = pad * 2 + cols * thumb_w + (cols - 1) * gap
    height = pad * 2 + 72 + rows * (thumb_h + label_h) + (rows - 1) * gap

    canvas = Image.new("RGB", (width, height), PAPER)
    draw = ImageDraw.Draw(canvas)
    title = "六套配色 · 欢迎页（整页）" if kind == "welcomeFull" else "六套配色 · 阅读页（整页）"
    draw.text((pad, pad), title, font=FONT_TITLE, fill=INK)
    draw.text(
        (pad, pad + 38),
        "对比检查：纸面亮度、强调色位置、装饰记号、代码与表格质感（按整页截图缩放）",
        font=FONT_SMALL,
        fill=DIM,
    )

    for index, entry in enumerate(shots):
        col = index % cols
        row = index // cols
        x = pad + col * (thumb_w + gap)
        y = pad + 72 + row * (thumb_h + label_h + gap)
        image = Image.open(entry[f"{kind}Png"]).convert("RGB").resize((thumb_w, thumb_h), Image.LANCZOS)
        canvas.paste(image, (x, y))
        draw.rectangle((x, y + thumb_h, x + thumb_w, y + thumb_h + label_h), fill=(30, 27, 24))
        draw.text((x + 12, y + thumb_h + 8), entry["name"], font=FONT, fill=INK)
        mode = "浅色" if entry["mode"] == "light" else "深色"
        draw.text(
            (x + 12, y + thumb_h + 30),
            f"{mode} · 主 {entry['primary']} · 副 {entry['secondary']}",
            font=FONT_SMALL,
            fill=DIM,
        )
    canvas.save(target)
    return target


def palette_table(target: Path) -> Path:
    chip_w, chip_h = 74, 34
    row_h = 96
    pad = 26
    width = pad * 2 + 250 + len(CHIPS) * (chip_w + 10) + 260
    height = pad * 2 + 64 + len(PALETTES) * row_h

    canvas = Image.new("RGB", (width, height), PAPER)
    draw = ImageDraw.Draw(canvas)
    draw.text((pad, pad), "配色速查：22 个组件颜色的关键 9 项", font=FONT_TITLE, fill=INK)
    draw.text((pad, pad + 38), "所有值都由三枚锚点推导，换锚点即可整族重算", font=FONT_SMALL, fill=DIM)

    x0 = pad + 250
    for column, (key, label) in enumerate(CHIPS):
        draw.text((x0 + column * (chip_w + 10), pad + 62), label, font=FONT_SMALL, fill=DIM)

    for row, palette in enumerate(PALETTES):
        y = pad + 90 + row * row_h
        draw.text((pad, y + 6), palette.name, font=FONT, fill=INK)
        mode = "浅色" if palette.mode == "light" else "深色"
        draw.text((pad, y + 32), f"{mode} · {palette.file_stem}", font=FONT_SMALL, fill=DIM)
        draw.text((pad, y + 52), f"{palette.primary} / {palette.secondary}", font=FONT_SMALL, fill=DIM)

        colors = component_colors(palette)
        for column, (key, _label) in enumerate(CHIPS):
            value = colors[key]
            x = x0 + column * (chip_w + 10)
            draw.rounded_rectangle((x, y, x + chip_w, y + chip_h), radius=6, fill=value)
            draw.rectangle((x, y, x + chip_w, y + chip_h), outline=(60, 55, 50))
            draw.text((x + 2, y + chip_h + 6), value, font=FONT_SMALL, fill=DIM)
    canvas.save(target)
    return target


def main() -> None:
    print(contact("welcomeFull", BUILD / "sheet_welcome.png", thumb_w=560))
    print(contact("readingFull", BUILD / "sheet_reading.png", thumb_w=560))
    print(palette_table(BUILD / "sheet_palette.png"))


if __name__ == "__main__":
    main()
