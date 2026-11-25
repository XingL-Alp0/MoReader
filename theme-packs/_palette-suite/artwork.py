# -*- coding: utf-8 -*-
"""主题包视觉资源：六套主页插画（SVG）、纸纹底图与软件图标（PNG）。

插画全部是手写路径 + 调色板推导出来的颜色，文件很小、换电脑不会失真。
构图统一：天空渐变 → 光晕 → 天体 → 三层山脊/沙丘 → 细线点缀 → 极淡暗角。
"""
from __future__ import annotations

import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from palettes import (
    Palette,
    component_colors,
    hex_to_rgb,
    mix,
    white_or_black_ink,
)

W, H = 1200, 400
SIMSUN = r"C:\Windows\Fonts\simsun.ttc"
MSYH = r"C:\Windows\Fonts\msyh.ttc"
MSYH_BOLD = r"C:\Windows\Fonts\msyhbd.ttc"


def tint(base: str, color: str, amount: float) -> str:
    """把 color 以 amount（0–1）的强度压到 base 上。"""
    return mix(color, base, amount)


# --------------------------------------------------------------------------
# SVG 公共件
# --------------------------------------------------------------------------


def svg_doc(defs: str, body: str, label: str) -> str:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" '
        f'width="1200" height="400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="{label}">\n'
        f"  <defs>\n{defs}\n  </defs>\n{body}\n</svg>\n"
    )


def vignette(ink: str, strength: float = 0.10) -> tuple[str, str]:
    defs = (
        '<radialGradient id="vig" cx="0.5" cy="0.46" r="0.8">'
        f'<stop offset="0.5" stop-color="{ink}" stop-opacity="0"/>'
        f'<stop offset="1" stop-color="{ink}" stop-opacity="{strength}"/>'
        "</radialGradient>"
    )
    body = f'  <rect width="{W}" height="{H}" fill="url(#vig)"/>'
    return defs, body


def soft_blur(identifier: str, deviation: float) -> str:
    return (
        f'<filter id="{identifier}" x="-25%" y="-60%" width="150%" height="220%">'
        f'<feGaussianBlur stdDeviation="{deviation}"/>'
        "</filter>"
    )


def curve(points: list[tuple[float, float]]) -> str:
    """Catmull-Rom → 三次贝塞尔，保证山脊是圆滑的而不是折线。"""
    padded = [points[0], *points, points[-1]]
    path = f"M{points[0][0]:.0f} {points[0][1]:.0f}"
    for index in range(1, len(padded) - 2):
        p0, p1, p2, p3 = padded[index - 1], padded[index], padded[index + 1], padded[index + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        path += f" C{c1[0]:.0f} {c1[1]:.0f} {c2[0]:.0f} {c2[1]:.0f} {p2[0]:.0f} {p2[1]:.0f}"
    return path


def ridge(points: list[tuple[float, float]]) -> str:
    return curve(points) + f" L{W + 40} {H + 20} L-40 {H + 20} Z"


def stars(count: int, seed: int, paper: str, top: float = 0, bottom: float = 250) -> str:
    rng = random.Random(seed)
    return "".join(
        f'  <circle cx="{rng.uniform(10, W - 10):.0f}" cy="{rng.uniform(top, bottom):.0f}" '
        f'r="{rng.uniform(0.6, 1.7):.1f}" fill="{paper}" fill-opacity="{rng.uniform(0.25, 0.9):.2f}"/>\n'
        for _ in range(count)
    )


def pine(x: float, base: float, height: float, color: str, opacity: float) -> str:
    half = height * 0.28
    return (
        f'  <g fill="{color}" fill-opacity="{opacity}">'
        f'<path d="M{x} {base - height:.0f} L{x - half:.0f} {base - height * 0.52:.0f} L{x + half:.0f} {base - height * 0.52:.0f} Z"/>'
        f'<path d="M{x} {base - height * 0.72:.0f} L{x - half * 1.28:.0f} {base - height * 0.22:.0f} L{x + half * 1.28:.0f} {base - height * 0.22:.0f} Z"/>'
        f'<path d="M{x} {base - height * 0.48:.0f} L{x - half * 1.6:.0f} {base:.0f} L{x + half * 1.6:.0f} {base:.0f} Z"/>'
        "</g>\n"
    )


def birds(spots: list[tuple[float, float]], color: str, opacity: float = 0.6) -> str:
    return "".join(
        f'  <path d="M{x} {y} q 6 -6 12 0 q 6 -6 12 0" fill="none" stroke="{color}" '
        f'stroke-opacity="{opacity}" stroke-width="1.5" stroke-linecap="round"/>\n'
        for x, y in spots
    )


# --------------------------------------------------------------------------
# 场景：宣纸墨山
# --------------------------------------------------------------------------


def ink_wash(p: Palette, c: dict[str, str]) -> str:
    accent, ink = p.primary, c["ink"]
    paper, soft = c["paperBg"], c["paperSoft"]
    defs = f"""
<linearGradient id="sky" x1="0.15" y1="0" x2="0.35" y2="1">
  <stop offset="0" stop-color="{tint(soft, accent, 0.05)}"/>
  <stop offset="0.55" stop-color="{paper}"/>
  <stop offset="1" stop-color="{tint(paper, accent, 0.04)}"/>
</linearGradient>
<radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0.42" stop-color="{accent}" stop-opacity="0.26"/>
  <stop offset="1" stop-color="{accent}" stop-opacity="0"/>
</radialGradient>
<linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="{tint(paper, accent, 0.08)}" stop-opacity="0.9"/>
  <stop offset="1" stop-color="{paper}" stop-opacity="0.3"/>
</linearGradient>
{soft_blur("haze", 16)}
{vignette(ink, 0.09)[0]}
"""
    waves = "".join(
        f'  <path d="M{x} {y} q 36 -4 84 0" fill="none" stroke="{accent}" '
        f'stroke-opacity="{opacity}" stroke-width="1.1" stroke-linecap="round"/>\n'
        for x, y, opacity in (
            (150, 356, 0.22),
            (420, 368, 0.16),
            (700, 360, 0.2),
            (930, 376, 0.13),
        )
    )
    body = f"""  <rect width="{W}" height="{H}" fill="url(#sky)"/>
  <circle cx="928" cy="118" r="110" fill="url(#halo)"/>
  <circle cx="928" cy="118" r="38" fill="{accent}" fill-opacity="0.92"/>
  <circle cx="928" cy="118" r="54" fill="none" stroke="{accent}" stroke-opacity="0.22" stroke-width="1.1"/>
  <circle cx="928" cy="118" r="74" fill="none" stroke="{accent}" stroke-opacity="0.09"/>
  <path d="{ridge([(-40, 258), (140, 230), (300, 256), (430, 200), (560, 240), (700, 192), (860, 234), (1010, 206), (1240, 238)])}"
        fill="{ink}" fill-opacity="0.11"/>
  <path d="{ridge([(-40, 304), (180, 276), (360, 300), (520, 250), (660, 292), (820, 246), (980, 288), (1120, 262), (1240, 286)])}"
        fill="{ink}" fill-opacity="0.19"/>
  <ellipse cx="560" cy="308" rx="470" ry="16" fill="{paper}" fill-opacity="0.7" filter="url(#haze)"/>
  <path d="{ridge([(-40, 350), (220, 328), (420, 344), (600, 310), (780, 340), (960, 312), (1120, 336), (1240, 330)])}"
        fill="{ink}" fill-opacity="0.30"/>
  <rect y="346" width="{W}" height="{H - 346}" fill="url(#water)"/>
{waves}{birds([(818, 158), (864, 142), (906, 164)], ink, 0.4)}  <g transform="translate(96 78)">
    <rect width="34" height="34" rx="3" fill="{accent}"/>
    <rect x="4.5" y="4.5" width="25" height="25" rx="1" fill="none" stroke="{paper}" stroke-opacity="0.9" stroke-width="1.5"/>
    <path d="M12 16 h11 M17.5 11 v11" stroke="{paper}" stroke-opacity="0.85" stroke-width="1.7"/>
  </g>
{vignette(ink, 0.09)[1]}
"""
    return svg_doc(defs, body, f"{p.name} 主页插画：宣纸与远山")


# --------------------------------------------------------------------------
# 场景：青瓷烟雨
# --------------------------------------------------------------------------


def celadon_mist(p: Palette, c: dict[str, str]) -> str:
    accent, ink = p.primary, c["ink"]
    paper = c["paperBg"]
    defs = f"""
<linearGradient id="sky" x1="0.2" y1="0" x2="0.1" y2="1">
  <stop offset="0" stop-color="{tint(paper, accent, 0.24)}"/>
  <stop offset="0.46" stop-color="{paper}"/>
  <stop offset="1" stop-color="{tint(paper, accent, 0.14)}"/>
</linearGradient>
<radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0.3" stop-color="{paper}" stop-opacity="0.9"/>
  <stop offset="1" stop-color="{paper}" stop-opacity="0"/>
</radialGradient>
{soft_blur("mist", 20)}
{vignette(ink, 0.07)[0]}
"""
    rain = "".join(
        f'  <path d="M{x} {y} l 6 30" stroke="{accent}" stroke-opacity="0.16" stroke-width="1" stroke-linecap="round"/>\n'
        for x, y in (
            (140, 40),
            (232, 88),
            (318, 34),
            (402, 76),
            (496, 48),
            (588, 96),
            (676, 56),
            (762, 88),
            (856, 38),
            (944, 78),
            (1032, 52),
            (1120, 92),
        )
    )
    body = f"""  <rect width="{W}" height="{H}" fill="url(#sky)"/>
  <circle cx="292" cy="104" r="52" fill="url(#halo)"/>
  <circle cx="292" cy="104" r="26" fill="{tint(paper, accent, 0.14)}"/>
  <circle cx="292" cy="104" r="40" fill="none" stroke="{accent}" stroke-opacity="0.22" stroke-width="1"/>
{rain}  <path d="{ridge([(-40, 268), (170, 248), (370, 266), (570, 244), (790, 262), (1000, 246), (1240, 258)])}"
        fill="{tint(paper, ink, 0.13)}"/>
  <ellipse cx="520" cy="276" rx="440" ry="16" fill="{paper}" fill-opacity="0.85" filter="url(#mist)"/>
  <path d="{ridge([(-40, 308), (210, 292), (450, 310), (700, 288), (940, 306), (1240, 294)])}"
        fill="{tint(paper, ink, 0.22)}"/>
  <ellipse cx="760" cy="318" rx="380" ry="14" fill="{paper}" fill-opacity="0.7" filter="url(#mist)"/>
  <path d="{ridge([(-40, 362), (240, 322), (470, 344), (690, 318), (930, 342), (1240, 330)])}"
        fill="{tint(paper, accent, 0.42)}"/>
  <g transform="translate(1010 74)">
    <circle cx="16" cy="16" r="15" fill="none" stroke="{accent}" stroke-opacity="0.45" stroke-width="1.3"/>
    <circle cx="16" cy="16" r="5" fill="{accent}" fill-opacity="0.55"/>
  </g>
{vignette(ink, 0.07)[1]}
"""
    return svg_doc(defs, body, f"{p.name} 主页插画：青瓷与远雾")


# --------------------------------------------------------------------------
# 场景：藕荷晚照
# --------------------------------------------------------------------------


def lotus_dusk(p: Palette, c: dict[str, str]) -> str:
    accent, gold = p.primary, p.secondary
    ink, paper = c["ink"], c["paperBg"]
    defs = f"""
<linearGradient id="sky" x1="0.15" y1="0" x2="0.05" y2="1">
  <stop offset="0" stop-color="{tint(paper, accent, 0.34)}"/>
  <stop offset="0.44" stop-color="{tint(paper, gold, 0.30)}"/>
  <stop offset="1" stop-color="{tint(paper, gold, 0.52)}"/>
</linearGradient>
<radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0" stop-color="{tint('#fff7e6', gold, 0.20)}"/>
  <stop offset="0.5" stop-color="{tint('#fff7e6', gold, 0.55)}"/>
  <stop offset="1" stop-color="{tint(gold, accent, 0.40)}"/>
</radialGradient>
<linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="{tint(paper, accent, 0.34)}" stop-opacity="0.8"/>
  <stop offset="1" stop-color="{tint(paper, accent, 0.12)}" stop-opacity="0.95"/>
</linearGradient>
{soft_blur("glow", 22)}
{vignette(ink, 0.09)[0]}
"""
    ripples = "".join(
        f'  <ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="5" fill="none" stroke="{tint(paper, gold, 0.55)}" '
        f'stroke-opacity="{opacity}" stroke-width="1.2"/>\n'
        for cx, cy, rx, opacity in (
            (758, 350, 120, 0.5),
            (758, 372, 196, 0.3),
            (300, 344, 92, 0.34),
            (300, 372, 150, 0.22),
            (1080, 392, 80, 0.2),
        )
    )
    petals = "".join(
        f'  <g transform="translate({x} {y}) rotate({rot})">'
        f'<path d="M0 0 C -11 -7 -12 -21 0 -29 C 12 -21 11 -7 0 0 Z" fill="{accent}" fill-opacity="{opacity}"/>'
        f'<path d="M0 -4 C -4 -9 -4 -17 0 -22 C 4 -17 4 -9 0 -4 Z" fill="{tint(accent, paper, 0.4)}" fill-opacity="{opacity}"/>'
        "</g>\n"
        for x, y, rot, opacity in (
            (206, 300, -14, 0.55),
            (256, 322, 10, 0.42),
            (1036, 262, 8, 0.5),
            (1092, 296, -12, 0.36),
        )
    )
    body = f"""  <rect width="{W}" height="{H}" fill="url(#sky)"/>
  <circle cx="758" cy="286" r="118" fill="{gold}" fill-opacity="0.18" filter="url(#glow)"/>
  <circle cx="758" cy="286" r="66" fill="url(#sun)"/>
  <circle cx="758" cy="286" r="88" fill="none" stroke="{tint(paper, gold, 0.6)}" stroke-opacity="0.45"/>
  <rect y="300" width="{W}" height="{H - 300}" fill="url(#water)"/>
{ripples}{petals}  <path d="{ridge([(-40, 312), (210, 300), (430, 308), (660, 298), (900, 306), (1240, 302)])}"
        fill="{tint(paper, accent, 0.22)}" fill-opacity="0.5"/>
{birds([(300, 132), (344, 118), (386, 138)], tint(ink, accent, 0.4), 0.35)}  <g transform="translate(104 88)" opacity="0.8">
    <rect width="32" height="32" rx="16" fill="none" stroke="{accent}" stroke-opacity="0.45" stroke-width="1.3"/>
    <path d="M16 8 C 10 13 10 21 16 24 C 22 21 22 13 16 8 Z" fill="{accent}" fill-opacity="0.5"/>
  </g>
{vignette(ink, 0.09)[1]}
"""
    return svg_doc(defs, body, f"{p.name} 主页插画：藕荷与晚照")


# --------------------------------------------------------------------------
# 场景：墨夜星图
# --------------------------------------------------------------------------


def star_night(p: Palette, c: dict[str, str]) -> str:
    accent, gold = p.primary, p.secondary
    ink, paper = c["ink"], c["paperBg"]
    app = c["appBg"]
    constellation = (
        "  <polyline points=\"196,74 268,120 348,92 414,154 496,126\" fill=\"none\" "
        f'stroke="{accent}" stroke-opacity="0.5" stroke-width="1.1"/>\n'
        + "".join(
            f'  <circle cx="{x}" cy="{y}" r="2.4" fill="{gold}" fill-opacity="0.9"/>\n'
            for x, y in ((196, 74), (268, 120), (348, 92), (414, 154), (496, 126))
        )
    )
    defs = f"""
<linearGradient id="night" x1="0.15" y1="0" x2="0.3" y2="1">
  <stop offset="0" stop-color="{app}"/>
  <stop offset="0.58" stop-color="{tint(app, accent, 0.09)}"/>
  <stop offset="1" stop-color="{tint(app, accent, 0.16)}"/>
</linearGradient>
<radialGradient id="moon" cx="0.42" cy="0.38" r="0.62">
  <stop offset="0" stop-color="{tint("#ffffff", gold, 0.45)}"/>
  <stop offset="1" stop-color="{tint("#ffffff", gold, 0.8)}"/>
</radialGradient>
{soft_blur("aurora", 34)}
{vignette(ink, 0.18)[0]}
"""
    body = f"""  <rect width="{W}" height="{H}" fill="url(#night)"/>
  <path d="M60 214 C 280 92 520 138 720 66 C 860 18 1000 54 1140 30" fill="none"
        stroke="{accent}" stroke-opacity="0.18" stroke-width="36" filter="url(#aurora)"/>
  <path d="M20 268 C 240 190 430 226 650 168 C 830 122 990 158 1180 128" fill="none"
        stroke="{gold}" stroke-opacity="0.08" stroke-width="22" filter="url(#aurora)"/>
{stars(110, 20261125, paper)}  <circle cx="952" cy="96" r="44" fill="url(#moon)"/>
  <circle cx="932" cy="82" r="38" fill="{app}" fill-opacity="0.94"/>
  <circle cx="952" cy="96" r="64" fill="none" stroke="{gold}" stroke-opacity="0.14"/>
{constellation}  <path d="{ridge([(-40, 322), (180, 282), (380, 308), (570, 272), (780, 300), (1000, 268), (1240, 296)])}"
        fill="{mix(app, "#000000", 0.45)}"/>
  <path d="{ridge([(-40, 372), (240, 350), (490, 368), (740, 344), (980, 366), (1240, 354)])}"
        fill="{mix(app, "#000000", 0.62)}"/>
  <path d="M-40 392 C 260 378 620 392 900 382 C 1060 376 1160 384 1240 380 L1240 420 L-40 420 Z"
        fill="{app}" fill-opacity="0.55"/>
{vignette(ink, 0.18)[1]}
"""
    return svg_doc(defs, body, f"{p.name} 主页插画：墨夜与星图")


# --------------------------------------------------------------------------
# 场景：松烟山脊
# --------------------------------------------------------------------------


def pine_mist(p: Palette, c: dict[str, str]) -> str:
    accent = p.primary
    ink, paper = c["ink"], c["paperBg"]
    app = c["appBg"]
    moon = tint("#ffffff", ink, 0.55)
    outline = mix(app, "#000000", 0.5)
    defs = f"""
<linearGradient id="night" x1="0.2" y1="0" x2="0.1" y2="1">
  <stop offset="0" stop-color="{app}"/>
  <stop offset="0.6" stop-color="{tint(app, accent, 0.08)}"/>
  <stop offset="1" stop-color="{tint(app, accent, 0.14)}"/>
</linearGradient>
{soft_blur("mist", 22)}
{vignette(ink, 0.16)[0]}
"""
    trees = "".join(
        pine(x, base, height, outline, opacity)
        for x, base, height, opacity in (
            (150, 322, 62, 0.85),
            (228, 330, 88, 0.9),
            (306, 320, 54, 0.8),
            (392, 336, 44, 0.65),
            (852, 326, 56, 0.8),
            (936, 336, 92, 0.9),
            (1024, 322, 60, 0.78),
            (1104, 334, 42, 0.6),
        )
    )
    body = f"""  <rect width="{W}" height="{H}" fill="url(#night)"/>
{stars(38, 7, paper, 10, 180)}  <circle cx="352" cy="88" r="58" fill="{moon}" fill-opacity="0.14" filter="url(#mist)"/>
  <circle cx="352" cy="88" r="40" fill="{moon}" fill-opacity="0.12"/>
  <circle cx="352" cy="88" r="30" fill="{moon}" fill-opacity="0.92"/>
  <circle cx="352" cy="88" r="44" fill="none" stroke="{accent}" stroke-opacity="0.18"/>
  <path d="{ridge([(-40, 268), (200, 240), (420, 262), (640, 234), (860, 258), (1060, 238), (1240, 252)])}"
        fill="{tint(app, accent, 0.10)}"/>
  <ellipse cx="640" cy="286" rx="560" ry="18" fill="{tint(app, accent, 0.2)}" filter="url(#mist)"/>
  <path d="{ridge([(-40, 316), (220, 292), (450, 312), (700, 288), (940, 308), (1240, 300)])}"
        fill="{tint(app, accent, 0.16)}"/>
{trees}  <path d="{ridge([(-40, 378), (260, 360), (540, 376), (820, 356), (1060, 372), (1240, 364)])}"
        fill="{mix(app, "#000000", 0.3)}"/>
  <ellipse cx="700" cy="386" rx="520" ry="16" fill="{tint(app, accent, 0.18)}" filter="url(#mist)"/>
{vignette(ink, 0.16)[1]}
"""
    return svg_doc(defs, body, f"{p.name} 主页插画：松烟与山脊")


# --------------------------------------------------------------------------
# 场景：落霞沙丘
# --------------------------------------------------------------------------


def sunset_dune(p: Palette, c: dict[str, str]) -> str:
    accent, gold = p.primary, p.secondary
    ink, paper = c["ink"], c["paperBg"]
    app = c["appBg"]
    defs = f"""
<linearGradient id="sky" x1="0.2" y1="0" x2="0.1" y2="1">
  <stop offset="0" stop-color="{app}"/>
  <stop offset="0.5" stop-color="{tint(app, accent, 0.16)}"/>
  <stop offset="1" stop-color="{tint(app, gold, 0.34)}"/>
</linearGradient>
<radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0" stop-color="{tint('#fff1d2', gold, 0.45)}"/>
  <stop offset="0.52" stop-color="{tint(gold, '#ffffff', 0.22)}"/>
  <stop offset="1" stop-color="{tint(gold, accent, 0.45)}"/>
</radialGradient>
{soft_blur("heat", 26)}
{vignette(ink, 0.18)[0]}
"""
    body = f"""  <rect width="{W}" height="{H}" fill="url(#sky)"/>
  <circle cx="800" cy="292" r="180" fill="{accent}" fill-opacity="0.16" filter="url(#heat)"/>
  <circle cx="800" cy="296" r="84" fill="url(#sun)"/>
{birds([(852, 118), (896, 100), (936, 124), (262, 106), (306, 124)], app, 0.55)}  <path d="{ridge([(-40, 312), (240, 300), (520, 312), (800, 298), (1040, 308), (1240, 302)])}"
        fill="{tint(app, accent, 0.30)}"/>
  <path d="{ridge([(-40, 356), (300, 338), (620, 356), (940, 338), (1240, 348)])}"
        fill="{tint(app, accent, 0.16)}"/>
  <path d="{ridge([(-40, 392), (360, 378), (760, 392), (1120, 376), (1240, 382)])}"
        fill="{mix(app, "#000000", 0.22)}"/>
{vignette(ink, 0.18)[1]}
"""
    return svg_doc(defs, body, f"{p.name} 主页插画：落霞与沙丘")


SCENES = {
    "ink_wash": ink_wash,
    "celadon_mist": celadon_mist,
    "lotus_dusk": lotus_dusk,
    "star_night": star_night,
    "pine_mist": pine_mist,
    "sunset_dune": sunset_dune,
}


def art_svg(p: Palette) -> str:
    return SCENES[p.art](p, component_colors(p))


def grain_svg() -> str:
    """180×180 无缝纸纹，作为 .welcome 的最底层。"""
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">\n'
        '  <filter id="n">\n'
        '    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>\n'
        '    <feColorMatrix type="saturate" values="0"/>\n'
        "  </filter>\n"
        '  <rect width="180" height="180" filter="url(#n)" opacity="0.045"/>\n'
        "</svg>\n"
    )


# --------------------------------------------------------------------------
# 软件图标（PNG，内嵌进 theme.json）
# --------------------------------------------------------------------------


def make_icon(p: Palette, path: Path, size: int = 512) -> Path:
    top = tint(p.primary, "#ffffff", 0.16)
    bottom = mix(p.primary, "#000000", 0.30)
    radius = int(size * 0.235)

    gradient = Image.new("RGBA", (size, size))
    drawer = ImageDraw.Draw(gradient)
    for y in range(size):
        drawer.line([(0, y), (size, y)], fill=(*hex_to_rgb(mix(bottom, top, y / (size - 1))), 255))

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)

    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    icon.paste(gradient, (0, 0), mask)
    draw = ImageDraw.Draw(icon)

    # 单字：宋体；字色按实际对比度取深/浅里更清楚的那个
    ink = white_or_black_ink(p.primary)
    ink_rgb = hex_to_rgb(ink)
    font = ImageFont.truetype(SIMSUN, int(size * 0.62))
    draw.text((size / 2, size * 0.52), p.glyph, font=font, fill=(*ink_rgb, 246), anchor="mm")

    # 副色圆点：与主界面的品牌圆点呼应
    dot = (size * 0.795, size * 0.795)
    dot_r = size * 0.052
    draw.ellipse(
        (dot[0] - dot_r, dot[1] - dot_r, dot[0] + dot_r, dot[1] + dot_r),
        fill=(*hex_to_rgb(p.secondary), 240),
    )
    draw.ellipse(
        (dot[0] - dot_r, dot[1] - dot_r, dot[0] + dot_r, dot[1] + dot_r),
        outline=(255, 255, 255, 90),
        width=max(1, int(size * 0.004)),
    )

    # 内侧细边 + 顶部高光，避免大尺寸下显得太平
    inset = int(size * 0.026)
    draw.rounded_rectangle(
        (inset, inset, size - 1 - inset, size - 1 - inset),
        radius=max(4, radius - inset),
        outline=(255, 255, 255, 46),
        width=max(2, int(size * 0.005)),
    )
    sheen = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(sheen).ellipse(
        (size * 0.12, -size * 0.30, size * 0.88, size * 0.42),
        fill=(255, 255, 255, 24),
    )
    icon = Image.alpha_composite(icon, Image.composite(sheen, Image.new("RGBA", (size, size)), mask))

    path.parent.mkdir(parents=True, exist_ok=True)
    icon.save(path)
    return path


def icon_strip(pairs: list[tuple[Palette, Path]], path: Path) -> Path:
    """把六枚图标排成对照图，便于检查 92px / 40px / 27px 下的辨识度。"""
    rows = len(pairs)
    width = 900
    height = 90 + rows * 96
    canvas = Image.new("RGB", (width, height), (24, 22, 20))
    draw = ImageDraw.Draw(canvas)
    label_font = ImageFont.truetype(MSYH, 17)
    small_font = ImageFont.truetype(MSYH, 13)
    draw.text(
        (28, 26),
        "软件图标对照：92px / 40px / 27px（标题栏实际尺寸）",
        font=ImageFont.truetype(MSYH_BOLD, 18),
        fill=(232, 225, 212),
    )
    for index, (palette, icon_path) in enumerate(pairs):
        y = 78 + index * 96
        draw.text((28, y + 30), palette.name, font=label_font, fill=(214, 206, 194))
        draw.text(
            (28, y + 54),
            f"{palette.primary} / {palette.secondary}",
            font=small_font,
            fill=(138, 130, 120),
        )
        image = Image.open(icon_path).convert("RGBA")
        for offset, size in ((0, 92), (150, 40), (240, 27)):
            thumb = image.resize((size, size), Image.LANCZOS)
            box = (320 + offset, y + 40 - size // 2)
            canvas.paste(thumb, box, thumb)
        draw.text((320 + 240, y + 62), "27px", font=small_font, fill=(118, 110, 102))
    canvas.save(path)
    return path
