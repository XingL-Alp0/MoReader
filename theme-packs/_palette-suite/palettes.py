# -*- coding: utf-8 -*-
"""墨阅配色套件：调色板定义、组件颜色与样式令牌推导。

每个 Palette 只声明三枚中性色锚点（背景 / 纸面 / 正文墨色）与主副强调色，
22 个组件颜色与 CSS 令牌都由锚点按固定关系推导，保证六套主题结构一致、观感不同。
"""
from __future__ import annotations

import colorsys
from dataclasses import dataclass, field

# 应用里 COMPONENT_COLORS 的顺序，导出时保持一致便于比对
COMPONENT_ORDER = [
    "appBg",
    "titlebarBg",
    "sidebarBg",
    "surfaceBg",
    "editorBg",
    "paperBg",
    "paperSoft",
    "statusBg",
    "ink",
    "inkSoft",
    "muted",
    "faint",
    "line",
    "lineSoft",
    "codeBg",
    "codeInk",
    "codeHead",
    "tableHead",
    "quoteBg",
    "selection",
    "diagramPrimary",
    "diagramSecondary",
]


# --------------------------------------------------------------------------
# 颜色工具：与 src/renderer/theme.js 的 mixColors / 亮度算法保持一致
# --------------------------------------------------------------------------


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    text = value.strip().lstrip("#")
    if len(text) == 3:
        text = "".join(char * 2 for char in text)
    return tuple(int(text[index : index + 2], 16) for index in (0, 2, 4))  # type: ignore[return-value]


def rgb_to_hex(rgb) -> str:
    return "#" + "".join(f"{max(0, min(255, round(channel))):02x}" for channel in rgb)


def mix(first: str, second: str, weight: float = 0.5) -> str:
    """weight 是 first 的占比，与 theme.js 的 mixColors 相同。"""
    a = hex_to_rgb(first)
    b = hex_to_rgb(second)
    t = max(0.0, min(1.0, weight))
    return rgb_to_hex(tuple(a[i] * t + b[i] * (1 - t) for i in range(3)))


def whiten(value: str, amount: float) -> str:
    return mix("#ffffff", value, amount)


def blacken(value: str, amount: float) -> str:
    return mix("#000000", value, amount)


def darken(value: str, amount: float = 0.1) -> str:
    return mix("#000000", value, amount)


def hsl_hex(hue: float, sat: float, light: float) -> str:
    r, g, b = colorsys.hls_to_rgb(
        (hue % 360) / 360, max(0.0, min(1.0, light)), max(0.0, min(1.0, sat))
    )
    return rgb_to_hex((r * 255, g * 255, b * 255))


def hue_of(value: str) -> float:
    r, g, b = (channel / 255 for channel in hex_to_rgb(value))
    hue, _light, _sat = colorsys.rgb_to_hls(r, g, b)
    return hue * 360


def luminance(value: str) -> float:
    def channel(part: int) -> float:
        ratio = part / 255
        return ratio / 12.92 if ratio <= 0.03928 else ((ratio + 0.055) / 1.055) ** 2.4

    r, g, b = hex_to_rgb(value)
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def contrast(first: str, second: str) -> float:
    a, b = luminance(first), luminance(second)
    high, low = max(a, b), min(a, b)
    return (high + 0.05) / (low + 0.05)


def contrast_ink(value: str) -> str:
    """与 theme.js 的 contrastInk 一致：亮底用深字，暗底用暖白字。"""
    return "#211c16" if luminance(value) > 0.58 else "#fffaf2"


def white_or_black_ink(value: str) -> str:
    """在深字与暖白字里取对比度更高的那个（用于按钮文字与图标单字）。"""
    return (
        "#211c16"
        if contrast("#211c16", value) > contrast("#fffaf2", value)
        else "#fffaf2"
    )


def rgba(value: str, alpha: float) -> str:
    r, g, b = hex_to_rgb(value)
    return f"rgba({r}, {g}, {b}, {alpha})"


@dataclass(frozen=True)
class Palette:
    slug: str  # ASCII 简称，用于预览图与脚本
    name: str  # 主题显示名（进入 theme.json）
    file_stem: str  # 目录 / ZIP 文件名
    mode: str  # light / dark
    primary: str
    secondary: str
    base_bg: str  # 应用底色锚点
    base_paper: str  # 阅读纸面锚点
    base_ink: str  # 正文墨色锚点
    glyph: str  # 图标里的单字
    marker: str  # h2 前缀记号
    ornament: str  # 引用块右上角记号
    sticker: str  # 欢迎页 emoji 贴纸
    radius: tuple[int, int, int]  # sm / md / lg
    h1_width: int  # 标题下划线长度
    art: str  # 主页插画场景 id
    tagline: str
    bullets: tuple[str, str, str]
    quote: str
    reading_title: str
    reading_lede: str
    reading_notes: tuple[str, str, str] = ("黄昏", "琥珀", "书信、旧日记")
    extra_css: str = ""


PALETTES: list[Palette] = [
    Palette(
        slug="xuancai",
        name="宣纸 · 朱砂",
        file_stem="宣纸朱砂",
        mode="light",
        primary="#b23a28",
        secondary="#a87f3c",
        base_bg="#f2ebdd",
        base_paper="#fdfaf3",
        base_ink="#2c2419",
        glyph="宣",
        marker="◆",
        ornament="❦",
        sticker="🖋",
        radius=(4, 6, 9),
        h1_width=52,
        art="ink_wash",
        tagline="一张纸，一点朱砂，字迹会自己安静下来。",
        bullets=(
            "暖白纸面配朱砂重音，长文读久了也不刺眼",
            "朱砂只出现在按钮、链接和选中的地方",
            "圆角收得很小、边线很细，像手工裁过的书页",
        ),
        quote="写完一段，把笔搁下，纸会替你记住停顿。",
        reading_title="窗纸上的光",
        reading_lede="午后的光透过窗纸落在纸上，把每一行字都烘得暖一点。",
        extra_css="""
/* 纸边：分隔线换成草叶记号，正文更像一本书 */
.markdown-body hr::after {
  content: "❦";
  font-size: 11px;
  color: color-mix(in srgb, var(--gold) 65%, var(--faint));
}

.markdown-body h2 {
  border-bottom-style: double;
  border-bottom-width: 3px;
  border-bottom-color: color-mix(in srgb, var(--gold) 22%, var(--line-soft));
}
""",
    ),
    Palette(
        slug="qingci",
        name="青瓷 · 烟雨",
        file_stem="青瓷烟雨",
        mode="light",
        primary="#2f7a68",
        secondary="#a98a4e",
        base_bg="#ecf3f0",
        base_paper="#fbfdfb",
        base_ink="#1f2e29",
        glyph="瓷",
        marker="◌",
        ornament="☾",
        sticker="🍵",
        radius=(8, 12, 18),
        h1_width=58,
        art="celadon_mist",
        tagline="雨后青瓷，釉面里锁着一层薄雾。",
        bullets=(
            "冷调青灰纸面，白天与正午的强光下更耐看",
            "强调色是开了片的青瓷绿，副色取一点旧金",
            "圆角偏软，代码块与表格像被釉水收过边",
        ),
        quote="雾散得很慢，正好够读完一章。",
        reading_title="窑火的余温",
        reading_lede="出窑第三天的器物，摸上去还有一点温。",
        reading_notes=("清晨", "青灰", "笔记、器物志"),
        extra_css="""
/* 釉面：表格与代码块用内描边收口 */
.markdown-body table,
.markdown-body pre {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 8%, transparent);
}

.markdown-body thead th {
  letter-spacing: 0.02em;
}

.statusbar {
  background-image: linear-gradient(
    90deg,
    color-mix(in srgb, var(--accent) 6%, transparent),
    transparent 60%
  );
}
""",
    ),
    Palette(
        slug="ouhe",
        name="藕荷 · 晚照",
        file_stem="藕荷晚照",
        mode="light",
        primary="#7c5699",
        secondary="#c2718c",
        base_bg="#f2e7ef",
        base_paper="#fdf8fb",
        base_ink="#2e2230",
        glyph="荷",
        marker="❀",
        ornament="❁",
        sticker="🌸",
        radius=(10, 15, 22),
        h1_width=60,
        art="lotus_dusk",
        tagline="傍晚的藕粉与紫，写下来的句子都轻一点。",
        bullets=(
            "玫瑰灰纸面配藕荷紫，偏软、偏温柔",
            "适合随笔、日记，以及写给自己的信",
            "圆角最大、阴影更散，界面像被晚霞泡过",
        ),
        quote="天色再暗一点，字就该亮了。",
        reading_title="晚照里的信",
        reading_lede="把信摊在窗台上，晚霞替我把最后一段读完。",
        reading_notes=("入夜", "藕粉", "诗、长信"),
        extra_css="""
/* 柔边：欢迎页多加一团暖光，引用块染上副色 */
.welcome {
  background-image:
    radial-gradient(
      980px 560px at 84% 10%,
      color-mix(in srgb, var(--accent) 12%, transparent),
      transparent 64%
    ),
    radial-gradient(720px 480px at 6% 96%, rgba(194, 113, 140, 0.1), transparent 68%),
    url(assets/grain.svg);
}

.markdown-body blockquote {
  border-left-color: color-mix(in srgb, var(--gold) 55%, var(--accent));
}

.tab.active::after {
  background: linear-gradient(90deg, var(--accent), var(--gold));
}
""",
    ),
    Palette(
        slug="moye",
        name="墨夜 · 深蓝",
        file_stem="墨夜深蓝",
        mode="dark",
        primary="#7aa7f2",
        secondary="#e3b46e",
        base_bg="#0d1017",
        base_paper="#151a23",
        base_ink="#e6e9ef",
        glyph="墨",
        marker="✦",
        ornament="☾",
        sticker="✧",
        radius=(6, 10, 15),
        h1_width=46,
        art="star_night",
        tagline="把灯关掉，只留屏幕这一池深蓝。",
        bullets=(
            "深蓝夜底，长时间阅读也不刺眼",
            "强调色是抬亮的雾蓝，副色取一点星金",
            "代码高亮按深色底重配过，关键字不会糊成一团",
        ),
        quote="夜越深，字越清楚。",
        reading_title="深夜的航线",
        reading_lede="船从窗外开过去，灯把水面切成两半。",
        reading_notes=("深夜", "靛蓝", "长篇、科幻"),
        extra_css="""
/* 星野：标题下划线带一点辉光 */
.markdown-body h1::after {
  box-shadow: 0 0 18px color-mix(in srgb, var(--accent) 55%, transparent);
}

.code-head {
  border-bottom-color: color-mix(in srgb, var(--accent) 14%, var(--line-soft));
}
""",
    ),
    Palette(
        slug="songyan",
        name="松烟 · 青苔",
        file_stem="松烟青苔",
        mode="dark",
        primary="#86c9a0",
        secondary="#d8b97a",
        base_bg="#0c1310",
        base_paper="#131b16",
        base_ink="#e3ebe4",
        glyph="松",
        marker="❖",
        ornament="❖",
        sticker="🌲",
        radius=(5, 8, 12),
        h1_width=44,
        art="pine_mist",
        tagline="墨是松烟烧的，底色带一点青苔的绿。",
        bullets=(
            "墨绿夜底比纯黑柔和，边角不显脏",
            "强调色是苔痕绿，副色是一点旧纸黄",
            "线条细、圆角小，界面靠结构说话",
        ),
        quote="山里的夜，只听得见翻页。",
        reading_title="松烟与苔痕",
        reading_lede="把墨磨开的时候，松烟的味道会先一步漫上来。",
        reading_notes=("入暮", "苔绿", "笔记、札记"),
        extra_css="""
/* 结构感：分区标题加宽字距，分割线更短 */
.section-heading {
  letter-spacing: 0.04em;
}

.markdown-body h2 {
  letter-spacing: 0.01em;
}

.markdown-body h2::before {
  font-size: 0.44em;
  color: color-mix(in srgb, var(--accent) 80%, var(--gold));
}

.markdown-body hr {
  width: 38%;
}
""",
    ),
    Palette(
        slug="luoxia",
        name="落霞 · 陶土",
        file_stem="落霞陶土",
        mode="dark",
        primary="#ea8f6d",
        secondary="#e9c886",
        base_bg="#120e0d",
        base_paper="#1b1513",
        base_ink="#f0e6dd",
        glyph="霞",
        marker="◈",
        ornament="◍",
        sticker="🌇",
        radius=(7, 11, 16),
        h1_width=56,
        art="sunset_dune",
        tagline="晚霞沉下去，陶土还留着余温。",
        bullets=(
            "暖褐夜底配陶土橙，写到深夜也不觉得冷",
            "副色是晒过的沙金，用来收边和点缀",
            "阴影偏暖，代码块像一块烧过的陶片",
        ),
        quote="火熄了以后，颜色才开始说话。",
        reading_title="陶片上的晚霞",
        reading_lede="碎片捡回来拼不齐，晚霞却刚好填满缺口。",
        reading_notes=("日落", "陶土", "散记、游记"),
        extra_css="""
/* 余温：状态栏与引用各收一道暖边 */
.statusbar {
  background-image: linear-gradient(
    90deg,
    color-mix(in srgb, var(--gold) 8%, transparent),
    transparent 55%
  );
}

.markdown-body blockquote {
  background-image: linear-gradient(
    90deg,
    color-mix(in srgb, var(--gold) 12%, transparent),
    transparent 74%
  );
}

.markdown-body hr::after {
  color: color-mix(in srgb, var(--gold) 70%, var(--faint));
}
""",
    ),
]


# --------------------------------------------------------------------------
# 推导：组件颜色 / CSS 令牌
# --------------------------------------------------------------------------


def component_colors(palette: Palette) -> dict[str, str]:
    """由三枚锚点推导 22 个组件颜色。

    锚点已经带好冷暖（宣纸偏赭、青瓷偏青、墨夜偏蓝），所以这里只做
    「纸面 ↔ 背景」与「墨色 ↔ 纸面」两个方向的插值，不再按 HSL 拧色相。
    """
    bg, paper, ink = palette.base_bg, palette.base_paper, palette.base_ink
    primary = palette.primary
    dark = palette.mode == "dark"

    def paper_tint(amount: float) -> str:
        """amount 是纸面占比：越大越接近纸张，越小越接近应用底色。"""
        return mix(paper, bg, amount)

    if dark:
        colors = {
            "appBg": bg,
            "titlebarBg": whiten(bg, 0.04),
            "sidebarBg": blacken(bg, 0.35),
            "surfaceBg": paper_tint(0.55),
            "editorBg": paper_tint(0.68),
            "paperBg": paper,
            "paperSoft": whiten(paper, 0.06),
            "statusBg": paper_tint(0.12),
            "ink": ink,
            "inkSoft": mix(ink, bg, 0.76),
            "muted": mix(ink, bg, 0.56),
            "faint": mix(ink, bg, 0.40),
            "line": mix(ink, paper, 0.13),
            "lineSoft": mix(ink, paper, 0.085),
            "codeBg": paper_tint(0.45),
            "codeHead": whiten(paper_tint(0.45), 0.05),
            "tableHead": whiten(paper_tint(0.45), 0.03),
            "quoteBg": mix(primary, paper_tint(0.50), 0.06),
        }
    else:
        colors = {
            "appBg": bg,
            "titlebarBg": whiten(bg, 0.42),
            "sidebarBg": blacken(bg, 0.035),
            "surfaceBg": paper_tint(0.55),
            "editorBg": paper_tint(0.68),
            "paperBg": paper,
            "paperSoft": paper_tint(0.35),
            "statusBg": paper_tint(0.25),
            "ink": ink,
            "inkSoft": mix(ink, paper, 0.78),
            "muted": mix(ink, paper, 0.56),
            "faint": mix(ink, paper, 0.40),
            "line": mix(ink, paper, 0.11),
            "lineSoft": mix(ink, paper, 0.065),
            "codeBg": paper_tint(0.34),
            "codeHead": paper_tint(0.20),
            "tableHead": paper_tint(0.24),
            "quoteBg": mix(primary, paper_tint(0.40), 0.05),
        }

    colors["codeInk"] = colors["ink"]
    # 与 theme.js buildPalette 一致：选中色 = 强调色压到纸上
    colors["selection"] = mix(primary, paper, 0.30 if not dark else 0.42)
    colors["diagramPrimary"] = primary
    colors["diagramSecondary"] = palette.secondary
    return {key: colors[key] for key in COMPONENT_ORDER}


def style_tokens(palette: Palette) -> dict[str, str]:
    """组件颜色覆盖不到的 CSS 变量：语义色、代码高亮、阴影、圆角。"""
    colors = component_colors(palette)
    dark = palette.mode == "dark"
    hue = hue_of(palette.primary)

    if dark:
        green = hsl_hex(150, 0.30, 0.72)
        blue = hsl_hex(212, 0.42, 0.74)
        purple = hsl_hex(275, 0.32, 0.76)
        danger = hsl_hex(4, 0.52, 0.72)
        hl = {
            "keyword": hsl_hex(340, 0.56, 0.73),
            "string": hsl_hex(140, 0.32, 0.68),
            "number": hsl_hex(32, 0.64, 0.69),
            "comment": hsl_hex(hue, 0.12, 0.52),
            "function": hsl_hex(200, 0.56, 0.73),
            "type": hsl_hex(272, 0.40, 0.76),
            "attr": hsl_hex(40, 0.56, 0.71),
            "builtin": hsl_hex(182, 0.44, 0.69),
            "meta": hsl_hex(30, 0.22, 0.65),
        }
        shadows = {
            "sm": "0 1px 2px rgba(0, 0, 0, 0.34)",
            "md": "0 12px 34px rgba(0, 0, 0, 0.42)",
            "lg": "0 30px 90px rgba(0, 0, 0, 0.58)",
        }
        shadow_ink = rgba("#000000", 0.85)
        deep_shadow = rgba("#000000", 0.9)
        gloss = "rgba(255, 255, 255, 0.16)"
    else:
        green = hsl_hex(150, 0.34, 0.33)
        blue = hsl_hex(212, 0.44, 0.35)
        purple = hsl_hex(275, 0.30, 0.40)
        danger = hsl_hex(4, 0.55, 0.42)
        hl = {
            "keyword": hsl_hex(340, 0.44, 0.37),
            "string": hsl_hex(150, 0.32, 0.33),
            "number": hsl_hex(30, 0.62, 0.37),
            "comment": hsl_hex(hue, 0.12, 0.55),
            "function": hsl_hex(205, 0.46, 0.35),
            "type": hsl_hex(272, 0.30, 0.43),
            "attr": hsl_hex(42, 0.55, 0.35),
            "builtin": hsl_hex(185, 0.42, 0.31),
            "meta": hsl_hex(28, 0.18, 0.42),
        }
        shadow = mix(colors["appBg"], colors["ink"], 0.55)
        shadows = {
            "sm": f"0 1px 2px {rgba(shadow, 0.06)}, 0 2px 8px {rgba(shadow, 0.04)}",
            "md": f"0 10px 30px {rgba(shadow, 0.10)}, 0 2px 8px {rgba(shadow, 0.05)}",
            "lg": f"0 28px 80px {rgba(shadow, 0.17)}, 0 8px 24px {rgba(shadow, 0.08)}",
        }
        shadow_ink = rgba(shadow, 0.30)
        deep_shadow = rgba(shadow, 0.45)
        gloss = "rgba(255, 255, 255, 0.42)"

    # 按钮文字：应用默认按亮度 0.58 一刀切，浅色强调色会得到低对比的暖白字；
    # 这里按实际对比度取深/浅两种字色里更好的那个。
    best_ink = white_or_black_ink(palette.primary)

    return {
        "scheme": "dark" if dark else "light",
        "accentInk": best_ink,
        "lineStrong": mix(colors["ink"], colors["line"], 0.20),
        "sidebarDeep": mix(colors["sidebarBg"], colors["ink"], 0.05)
        if not dark
        else blacken(colors["sidebarBg"], 0.35),
        "green": green,
        "blue": blue,
        "purple": purple,
        "danger": danger,
        "shadowSm": shadows["sm"],
        "shadowMd": shadows["md"],
        "shadowLg": shadows["lg"],
        "shadowInk": shadow_ink,
        "deepShadow": deep_shadow,
        "gloss": gloss,
        "lightTone": "#ffffff",
        "hlKeyword": hl["keyword"],
        "hlString": hl["string"],
        "hlNumber": hl["number"],
        "hlComment": hl["comment"],
        "hlFunction": hl["function"],
        "hlType": hl["type"],
        "hlAttr": hl["attr"],
        "hlBuiltin": hl["builtin"],
        "hlMeta": hl["meta"],
        "radiusSm": str(palette.radius[0]),
        "radiusMd": str(palette.radius[1]),
        "radiusLg": str(palette.radius[2]),
    }


def palette_by_slug(slug: str) -> Palette:
    for palette in PALETTES:
        if palette.slug == slug:
            return palette
    raise KeyError(slug)
