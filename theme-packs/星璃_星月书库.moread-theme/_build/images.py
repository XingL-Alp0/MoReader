# -*- coding: utf-8 -*-
"""生成「星璃 · 星月书库」主题包所需的图片资源。"""
from __future__ import annotations

import io
import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
BUILD = ROOT / "_build"
SRC = Path(r"D:\dev\png\星璃\产物")
REF = Path(r"D:\dev\png\星璃\设定\参考")

GOLD = (228, 192, 130)
CREAM = (246, 241, 232)
VIOLET = (167, 139, 250)
PINK = (240, 170, 205)

FONT_SONG = r"C:\Windows\Fonts\simsun.ttc"
FONT_YAHEI = r"C:\Windows\Fonts\msyh.ttc"


def save_jpeg(img: Image.Image, path: Path, quality: int = 87) -> None:
    img.convert("RGB").save(path, "JPEG", quality=quality, optimize=True, progressive=True)


def make_hero() -> None:
    img = Image.open(SRC / "图集" / "壁纸_中世纪城市_星璃_夜空_2560x1440.png")
    img = img.convert("RGB")
    width = 1500
    height = round(img.height * width / img.width)
    img = img.resize((width, height), Image.Resampling.LANCZOS)
    save_jpeg(img, ASSETS / "hero.jpg", 88)
    print(f"hero.jpg {width}x{height}")


def make_library() -> None:
    img = Image.open(SRC / "输出" / "02_书库_星璃.png").convert("RGB")
    width = 1100
    height = round(img.height * width / img.width)
    img = img.resize((width, height), Image.Resampling.LANCZOS)
    save_jpeg(img, ASSETS / "library.jpg", 86)
    print(f"library.jpg {width}x{height}")


def make_starfield() -> None:
    rng = random.Random(20261112)
    size = 480
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
        f'viewBox="0 0 {size} {size}">',
        "<g>",
    ]
    for _ in range(52):
        x = round(rng.uniform(2, size - 2), 1)
        y = round(rng.uniform(2, size - 2), 1)
        r = round(rng.uniform(0.45, 1.25), 2)
        o = round(rng.uniform(0.10, 0.5), 2)
        parts.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#f4efff" opacity="{o}"/>')
    # a few warm star specks
    for _ in range(10):
        x = round(rng.uniform(4, size - 4), 1)
        y = round(rng.uniform(4, size - 4), 1)
        r = round(rng.uniform(0.5, 1.0), 2)
        o = round(rng.uniform(0.18, 0.42), 2)
        parts.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#eac48b" opacity="{o}"/>')
    parts.append("</g>")

    # three four-point sparkles
    def sparkle(cx: float, cy: float, r: float, opacity: float, fill: str) -> str:
        k = r * 0.22
        return (
            f'<path d="M{cx} {cy - r}L{cx + k} {cy - k}L{cx + r} {cy}L{cx + k} {cy + k}'
            f'L{cx} {cy + r}L{cx - k} {cy + k}L{cx - r} {cy}L{cx - k} {cy - k}Z" '
            f'fill="{fill}" opacity="{opacity}"/>'
        )

    for cx, cy, r, o in ((96, 118, 7.5, 0.34), (352, 92, 5.4, 0.28), (268, 384, 6.6, 0.22)):
        parts.append(sparkle(cx, cy, r, o, "#f0d9a8"))
    parts.append("</svg>")
    (ASSETS / "starfield.svg").write_text("\n".join(parts), encoding="utf-8")
    print("starfield.svg", (ASSETS / "starfield.svg").stat().st_size, "bytes")


def vertical_gradient(size: int, top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    ramp = np.linspace(0.0, 1.0, size, dtype=np.float32)[:, None]
    arr = np.empty((size, size, 3), dtype=np.float32)
    for channel in range(3):
        arr[:, :, channel] = top[channel] + (bottom[channel] - top[channel]) * ramp
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGB")


def add_glow(base: Image.Image, center: tuple[float, float], radius: float,
             color: tuple[int, int, int], strength: float) -> Image.Image:
    width, height = base.size
    yy, xx = np.mgrid[0:height, 0:width].astype(np.float32)
    dist = np.sqrt((xx - center[0]) ** 2 + (yy - center[1]) ** 2)
    falloff = np.clip(1.0 - dist / radius, 0.0, 1.0) ** 2 * strength
    layer = np.array(base, dtype=np.float32)
    for channel in range(3):
        layer[:, :, channel] = layer[:, :, channel] * (1 - falloff) + color[channel] * falloff
    return Image.fromarray(layer.clip(0, 255).astype(np.uint8), "RGB")


def rounded_mask(size: int, radius: int, supersample: int = 4) -> Image.Image:
    big = Image.new("L", (size * supersample, size * supersample), 0)
    draw = ImageDraw.Draw(big)
    draw.rounded_rectangle(
        (0, 0, size * supersample - 1, size * supersample - 1),
        radius=radius * supersample,
        fill=255,
    )
    return big.resize((size, size), Image.Resampling.LANCZOS)


def star_polygon(cx: float, cy: float, outer: float, inner: float, points: int = 4,
                 rotate: float = 0.0) -> list[tuple[float, float]]:
    coords = []
    for index in range(points * 2):
        angle = math.pi * index / points + math.radians(rotate) - math.pi / 2
        radius = outer if index % 2 == 0 else inner
        coords.append((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius))
    return coords


def starry_square(size: int, radius: int) -> Image.Image:
    base = vertical_gradient(size, (46, 33, 88), (15, 11, 30))
    base = add_glow(base, (size * 0.22, size * 0.16), size * 0.9, VIOLET, 0.22)
    base = add_glow(base, (size * 0.86, size * 0.88), size * 0.72, PINK, 0.10)

    speck = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(speck)
    rng = random.Random(721)
    for _ in range(70):
        x = rng.uniform(6, size - 6)
        y = rng.uniform(6, size - 6)
        r = rng.uniform(0.8, 2.4)
        alpha = int(rng.uniform(28, 120))
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(244, 239, 255, alpha))
    base = Image.alpha_composite(base.convert("RGBA"), speck)

    # hairline gold frame
    frame = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    fdraw = ImageDraw.Draw(frame)
    inset = round(size * 0.028)
    fdraw.rounded_rectangle(
        (inset, inset, size - inset - 1, size - inset - 1),
        radius=radius - inset,
        outline=(*GOLD, 78),
        width=max(2, round(size * 0.005)),
    )
    base = Image.alpha_composite(base, frame)

    mask = rounded_mask(size, radius)
    base.putalpha(mask)
    return base


def make_icon_glyph() -> None:
    size = 512
    card = starry_square(size, 118)

    # gold crescent, top-left, kept well inside the rounded frame
    moon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mdraw = ImageDraw.Draw(moon)
    mdraw.ellipse((44, 46, 152, 154), fill=(*GOLD, 190))
    mdraw.ellipse((76, 32, 178, 134), fill=(0, 0, 0, 0))
    card = Image.alpha_composite(card, moon)

    font = ImageFont.truetype(FONT_SONG, 300)
    text = "璃"
    probe = ImageDraw.Draw(card)
    box = probe.textbbox((0, 0), text, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    tx = (size - tw) / 2 - box[0]
    ty = (size - th) / 2 - box[1] - 8

    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).text((tx + 4, ty + 8), text, font=font, fill=(8, 5, 18, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(9))
    card = Image.alpha_composite(card, shadow)

    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.text((tx, ty), text, font=font, fill=(*CREAM, 255))
    draw.polygon(star_polygon(392, 388, 24, 5.4), fill=(*GOLD, 235))
    draw.polygon(star_polygon(112, 392, 11, 2.6), fill=(*GOLD, 170))
    card = Image.alpha_composite(card, layer)

    card.save(BUILD / "icon_glyph.png")
    print("icon_glyph.png", card.size)


def face_crop(box: tuple[int, int, int, int]) -> Image.Image:
    img = Image.open(REF / "星璃_正面.png").convert("RGBA")
    crop = img.crop(box)
    side = min(crop.size)
    crop = crop.crop((0, 0, side, side))
    crop = crop.resize((512, 512), Image.Resampling.LANCZOS)
    crop = crop.filter(ImageFilter.UnsharpMask(radius=2.4, percent=60, threshold=3))
    # 轻微冷色偏移，让白底融进夜空紫
    arr = np.array(crop.convert("RGB"), dtype=np.float32)
    arr[:, :, 0] *= 0.965
    arr[:, :, 1] *= 0.945
    arr[:, :, 2] = arr[:, :, 2] * 1.0 + 2
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGB").convert("RGBA")


def circle_avatar(source: Image.Image, size: int, ring: int, vignette: int = 0) -> Image.Image:
    source = source.resize((size, size), Image.Resampling.LANCZOS)
    mask_big = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask_big).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    mask = mask_big.resize((size, size), Image.Resampling.LANCZOS)
    avatar = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    avatar.paste(source, (0, 0), mask)

    if vignette:
        yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
        dist = np.sqrt((xx - size / 2) ** 2 + (yy - size / 2) ** 2) / (size / 2)
        alpha = np.clip((dist - 0.5) / 0.5, 0.0, 1.0) ** 1.6 * vignette
        alpha *= np.array(mask, dtype=np.float32) / 255.0
        veil = Image.new("RGBA", (size, size), (16, 11, 34, 255))
        veil.putalpha(Image.fromarray(alpha.astype(np.uint8)))
        avatar = Image.alpha_composite(avatar, veil)

    ring_draw = ImageDraw.Draw(avatar)
    ring_draw.ellipse(
        (ring / 2, ring / 2, size - ring / 2 - 1, size - ring / 2 - 1),
        outline=(*GOLD, 220),
        width=ring,
    )
    return avatar


def make_icon_portrait(crop: Image.Image) -> None:
    size = 512
    card = starry_square(size, 118)
    avatar = circle_avatar(crop, 322, 7, vignette=70)
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse((72, 72, 440, 440), fill=(*VIOLET, 40))
    glow = glow.filter(ImageFilter.GaussianBlur(26))
    card = Image.alpha_composite(card, glow)
    card.alpha_composite(avatar, (95, 95))
    draw = ImageDraw.Draw(card)
    draw.polygon(star_polygon(418, 104, 22, 5), fill=(*GOLD, 230))
    draw.polygon(star_polygon(96, 410, 13, 3), fill=(*GOLD, 175))
    card.save(BUILD / "icon_portrait.png")
    print("icon_portrait.png", card.size)


def make_sticker(crop: Image.Image) -> None:
    size = 256
    avatar = circle_avatar(crop, size, 6, vignette=100)
    avatar.save(BUILD / "sticker.png")
    print("sticker.png", avatar.size)


def icon_strip() -> None:
    """27px 标题栏实景对照：原尺寸 + 3x 放大。"""
    bar = Image.new("RGB", (720, 220), (21, 17, 38))
    draw = ImageDraw.Draw(bar)
    label_font = ImageFont.truetype(FONT_YAHEI, 14)
    name_font = ImageFont.truetype(FONT_YAHEI, 14)
    for index, key in enumerate(("icon_glyph", "icon_portrait")):
        icon = Image.open(BUILD / f"{key}.png").convert("RGBA")
        small = icon.resize((27, 27), Image.Resampling.LANCZOS)
        row = 18 + index * 108
        mask = Image.new("L", (27, 27), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, 26, 26), radius=8, fill=255)
        card = Image.new("RGBA", (27, 27), (0, 0, 0, 0))
        card.paste(small, (0, 0), mask)
        bar.paste(card, (18, row + 40), card)
        draw.text((58, row + 45), "MoRead · 星璃", font=name_font, fill=(236, 232, 250))
        zoom = icon.resize((92, 92), Image.Resampling.NEAREST)
        bar.paste(zoom, (230, row + 8), zoom)
        draw.text((344, row), key, font=label_font, fill=(170, 162, 205))
        draw.text((344, row + 22), "27px in titlebar  |  92px zoom", font=label_font,
                  fill=(120, 113, 155))
    bar.save(BUILD / "icon_strip.png")
    print("icon_strip.png")


def qa_sheet(icon_glyph: Path, icon_portrait: Path, sticker: Path) -> None:
    sheet = Image.new("RGB", (1400, 900), (18, 14, 32))
    draw = ImageDraw.Draw(sheet)
    label_font = ImageFont.truetype(FONT_YAHEI, 22)
    small_font = ImageFont.truetype(FONT_YAHEI, 16)

    def paste_card(img: Image.Image, xy: tuple[int, int], size: int | None = None) -> None:
        item = img
        if size:
            item = img.resize((size, size), Image.Resampling.LANCZOS)
        sheet.paste(item, xy, item if item.mode == "RGBA" else None)

    paste_card(Image.open(icon_glyph), (60, 70), 256)
    paste_card(Image.open(icon_glyph), (350, 70), 64)
    paste_card(Image.open(icon_glyph), (440, 90), 27)
    paste_card(Image.open(icon_portrait), (60, 400), 256)
    paste_card(Image.open(icon_portrait), (350, 400), 64)
    paste_card(Image.open(icon_portrait), (440, 420), 27)
    paste_card(Image.open(sticker), (560, 70), 256)
    paste_card(Image.open(sticker), (560, 400), 96)
    draw.text((60, 30), "icon A glyph / icon B portrait / sticker", font=label_font, fill=(230, 225, 245))
    draw.text((60, 345), "A: 256 / 64 / 27", font=small_font, fill=(170, 160, 200))
    draw.text((60, 675), "B: 256 / 64 / 27", font=small_font, fill=(170, 160, 200))

    # palette
    swatches = [
        ("#100d1b", "appBg"), ("#151126", "titlebar"), ("#17132b", "surface"),
        ("#1a1530", "paper"), ("#ece8fa", "ink"), ("#c2b9e0", "inkSoft"),
        ("#a78bfa", "primary"), ("#e4c082", "secondary"), ("#f0aacd", "accent pink"),
    ]
    x = 780
    for color, name in swatches:
        draw.rounded_rectangle((x, 90, x + 70, 160), radius=12, fill=color,
                               outline=(60, 50, 90), width=1)
        draw.text((x, 168), name, font=small_font, fill=(200, 192, 225))
        x += 68
        if x > 1340:
            x = 780
            break

    hero = Image.open(ASSETS / "hero.jpg")
    hero.thumbnail((620, 400), Image.Resampling.LANCZOS)
    sheet.paste(hero, (780, 250))
    sheet.save(BUILD / "qa_sheet.png")
    print("qa_sheet.png")


if __name__ == "__main__":
    ASSETS.mkdir(parents=True, exist_ok=True)
    make_hero()
    make_library()
    make_starfield()
    make_icon_glyph()

    crop = face_crop((64, 46, 336, 318))
    crop.save(BUILD / "face_crop.png")
    make_icon_portrait(crop)
    make_sticker(crop)
    qa_sheet(BUILD / "icon_glyph.png", BUILD / "icon_portrait.png", BUILD / "sticker.png")
