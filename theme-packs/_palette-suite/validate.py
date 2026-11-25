# -*- coding: utf-8 -*-
"""按墨阅的导入规则检查所有配色主题包：结构、字段、长度、资源引用、可读性。

运行：python validate.py            # 全部
      python validate.py xuancai    # 只检查一套
"""
from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree

from palettes import PALETTES, palette_by_slug

SUITE = Path(__file__).resolve().parent
PACKS_ROOT = SUITE.parent
MANIFEST = SUITE / "_build" / "manifest.json"

HEX = re.compile(r"^#[0-9a-f]{6}$")
IMAGE = re.compile(r"^data:image/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$")
ASSET_NAME = re.compile(r"^[A-Za-z0-9._\-\u4e00-\u9fa5]+$")

COMPONENT_KEYS = {
    "appBg", "titlebarBg", "sidebarBg", "surfaceBg", "editorBg", "paperBg", "paperSoft",
    "statusBg", "ink", "inkSoft", "muted", "faint", "line", "lineSoft", "codeBg", "codeInk",
    "codeHead", "tableHead", "quoteBg", "selection", "diagramPrimary", "diagramSecondary",
}
UI_IDS = {
    "brand", "window-title", "theme-button", "studio-button", "help-button", "settings-button",
    "sidebar", "sidebar-actions", "recent", "outline", "assoc-badge", "sidebar-version",
    "sidebar-toggle", "view-switch", "more-button", "format-bar", "save-state", "save-button",
    "statusbar", "status-counts", "status-cursor", "status-sync", "status-meta",
    "welcome-art", "welcome-tiles", "welcome-hint", "code-copy", "color-chips",
    "html-preview-button", "stickers", "custom-dock",
}
SEMANTIC = ("green", "blue", "purple", "danger")
HL_KEYS = (
    "keyword", "string", "number", "comment", "function", "type", "attr", "builtin", "meta",
)

errors: list[str] = []
warnings: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def warn(message: str) -> None:
    warnings.append(message)


# --------------------------------------------------------------------------
# 颜色工具（避免和 palettes 循环引用，这里复制最小实现）
# --------------------------------------------------------------------------


def luminance(value: str) -> float:
    text = value.strip().lstrip("#")
    channels = [int(text[index : index + 2], 16) / 255 for index in (0, 2, 4)]

    def linear(channel: float) -> float:
        return channel / 12.92 if channel <= 0.03928 else ((channel + 0.055) / 1.055) ** 2.4

    r, g, b = (linear(channel) for channel in channels)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(first: str, second: str) -> float:
    a, b = luminance(first), luminance(second)
    high, low = max(a, b), min(a, b)
    return (high + 0.05) / (low + 0.05)


def check_contrast(label: str, fg: str, bg: str, minimum: float) -> None:
    if not (HEX.match(fg) and HEX.match(bg)):
        return
    ratio = contrast(fg, bg)
    if ratio < minimum:
        fail(f"{label}: {fg} 在 {bg} 上对比度只有 {ratio:.2f}（要求 ≥{minimum}）")
    elif ratio < minimum + 0.6:
        warn(f"{label}: 对比度 {ratio:.2f} 偏紧（阈值 {minimum}）")


# --------------------------------------------------------------------------
# 单项检查
# --------------------------------------------------------------------------


def check_pack(entry: dict) -> None:
    name = entry["name"]
    zip_path = PACKS_ROOT / entry["zip"]

    def report(message: str) -> None:
        fail(f"{name} · {message}")

    if not zip_path.exists():
        report(f"缺少 {zip_path.name}")
        return
    if zip_path.stat().st_size > 32 * 1024 * 1024:
        report("ZIP 超过 32 MB")

    with zipfile.ZipFile(zip_path) as archive:
        names = archive.namelist()
        if "theme.json" not in names:
            report("theme.json 不在压缩包根目录")
            return
        if len(names) > 400:
            report("条目数超过 400")
        total = 0
        for info in archive.infolist():
            total += info.file_size
            if info.file_size > 12 * 1024 * 1024:
                report(f"{info.filename} 超过 12 MB")
        if total > 40 * 1024 * 1024:
            report("解压后总大小超过 40 MB")

        raw_theme = archive.read("theme.json")
        raw_css = archive.read("style.css") if "style.css" in names else b""
        raw_home = archive.read("home.md") if "home.md" in names else b""
        asset_names = sorted(
            item[len("assets/") :] for item in names if item.startswith("assets/")
        )
        asset_blobs = {
            item[len("assets/") :]: archive.read(item)
            for item in names
            if item.startswith("assets/")
        }

    for label, blob in (("theme.json", raw_theme), ("style.css", raw_css), ("home.md", raw_home)):
        if blob.startswith(b"\xef\xbb\xbf"):
            report(f"{label} 带 UTF-8 BOM，应用会当成内容读入")
        if b"\xef\xbf\xbd" in blob:
            report(f"{label} 含 U+FFFD，文本已损坏")

    try:
        pack = json.loads(raw_theme.decode("utf-8"))
    except json.JSONDecodeError as error:
        report(f"theme.json 不是合法 JSON：{error}")
        return
    css = raw_css.decode("utf-8")
    home = raw_home.decode("utf-8")

    # ---- 清单字段 ----
    if pack.get("format") != "moread-theme":
        report("format 不是 moread-theme")
    if pack.get("version") != 2:
        report(f"version 是 {pack.get('version')!r}，应为 2")
    if not 0 < len(str(pack.get("name", ""))) <= 60:
        report("name 缺失或超过 60 字符")
    if pack.get("home", {}).get("enabled") is not True:
        report("home.enabled 未开启")
    if pack.get("style", {}).get("enabled") is not True:
        report("style.enabled 未开启")

    theme = pack.get("theme", {})
    mode = theme.get("mode")
    if mode not in {"light", "dark", "system"}:
        report(f"mode 非法：{mode!r}")
    for key in ("primary", "secondary"):
        if not HEX.match(str(theme.get(key, ""))):
            report(f"{key} 不是 #rrggbb：{theme.get(key)!r}")
    primary = str(theme.get("primary", ""))
    secondary = str(theme.get("secondary", ""))

    # ---- 组件颜色 ----
    colors = theme.get("componentColors", {})
    if not isinstance(colors, dict):
        report("componentColors 不是对象")
        colors = {}
    unknown = set(colors) - COMPONENT_KEYS
    if unknown:
        report(f"未知组件颜色键：{sorted(unknown)}")
    for key, value in colors.items():
        if not HEX.match(str(value)):
            report(f"组件颜色 {key}={value!r} 非法")
    missing = COMPONENT_KEYS - set(colors)
    if missing:
        warn(f"未写出的组件颜色会跟随主题色生成：{sorted(missing)}")

    # ---- 图标 ----
    icon = theme.get("brandIcon", {})
    if icon.get("type") != "image":
        report("brandIcon 不是 image 类型")
    elif not IMAGE.match(str(icon.get("value", ""))):
        report("brandIcon data URL 非法（需 png/jpeg/webp base64）")
    elif len(str(icon.get("value", ""))) > 700_000:
        report("brandIcon 超过 700,000 字符")

    # ---- 贴纸 ----
    stickers = theme.get("stickers", [])
    if len(stickers) > 40:
        report("贴纸超过 40 个")
    for index, sticker in enumerate(stickers):
        if sticker.get("type") not in {"emoji", "image"}:
            report(f"贴纸 {index} type 非法")
        if sticker.get("type") == "image":
            if not IMAGE.match(str(sticker.get("value", ""))):
                report(f"贴纸 {index} data URL 非法")
        elif not str(sticker.get("value", "")).strip():
            report(f"贴纸 {index} emoji 为空")
        for field, low, high in (("x", 0, 100), ("y", 0, 100), ("size", 16, 200), ("rotation", -180, 180)):
            value = sticker.get(field)
            if not isinstance(value, (int, float)) or not low <= value <= high:
                report(f"贴纸 {index} {field}={value!r} 越界 [{low}, {high}]")
        if sticker.get("scope") not in {"always", "welcome", "reading"}:
            report(f"贴纸 {index} scope 非法")

    # ---- 自定义按钮 ----
    buttons = theme.get("customButtons", [])
    if len(buttons) > 24:
        report("按钮超过 24 个")
    for index, button in enumerate(buttons):
        label = str(button.get("label", ""))
        script = str(button.get("script", ""))
        if not 0 < len(label) <= 40:
            report(f"按钮 {index} label 非法")
        if len(str(button.get("icon", ""))) > 4:
            report(f"按钮 {index} icon 超过 4 字符")
        if not 0 < len(script) <= 6000:
            report(f"按钮 {index} script 长度非法")
        if "app." not in script:
            warn(f"按钮 {index}「{label}」没有调用 app API")

    # ---- 隐藏项 ----
    hidden = theme.get("uiHidden", [])
    unknown_hidden = set(hidden) - UI_IDS
    if unknown_hidden:
        report(f"未知界面元素：{sorted(unknown_hidden)}")

    # ---- 主页 / 样式 ----
    if not 0 < len(home) <= 300_000:
        report("home.md 长度非法")
    if not 0 < len(css) <= 600_000:
        report("style.css 长度非法")
    if "\r" in home:
        warn("home.md 含 CRLF")
    if "file://" in home or re.search(r"[A-Za-z]:\\\\", home):
        report("home.md 里出现了机器相关的绝对路径")
    if "file://" in css:
        report("style.css 里出现了 file:// 绝对路径")
    if "file://" in raw_theme.decode("utf-8"):
        report("theme.json 里出现了 file:// 绝对路径")

    # ---- CSS 约束 ----
    if css.count("{") != css.count("}"):
        report(f"style.css 花括号不配对（{css.count('{')} / {css.count('}')}）")
    for pattern, message in (
        (r"@import\s+(?:url\()?['\"]?https?:", "style.css 里有远程 @import（会被 CSP 拦截）"),
        (r"url\(\s*['\"]?https?:", "style.css 里有远程 url()，主题包应保持离线"),
        (r"javascript:", "style.css 里出现了 javascript:"),
        (r"<\s*script", "style.css 里出现了 <script>"),
    ):
        if re.search(pattern, css, re.IGNORECASE):
            report(message)
    if re.search(r"--(?:paper|ink|bg|line|code|quote|table|selection|diagram|surface|sidebar|status|titlebar|muted|faint|accent(?![-\w]|-soft|-wash|-strong|-contrast))\s*:[^;]*!important", css):
        warn("style.css 用 !important 硬覆盖主题变量，确认是有意为之")
    if "assets/grain.svg" not in css:
        warn("style.css 没有引用纸纹底图")

    # ---- 资源 ----
    refs = set(re.findall(r"assets/([^\s)\"'<>]+)", home + css))
    for ref in sorted(refs):
        if ref not in asset_names:
            report(f"引用了不存在的资源 assets/{ref}")
    for name_ in asset_names:
        if not ASSET_NAME.match(name_):
            report(f"资源名含非法字符：{name_}")
        if name_ not in refs:
            warn(f"资源未被引用：assets/{name_}")
        if name_.lower().endswith(".svg"):
            try:
                root = ElementTree.fromstring(asset_blobs[name_])
            except ElementTree.ParseError as error:
                report(f"assets/{name_} 不是合法 SVG：{error}")
                continue
            for element in root.iter():
                for attribute, value in element.attrib.items():
                    if attribute.endswith("href") and re.match(r"https?:", value):
                        report(f"assets/{name_} 引用了远程资源")

    # ---- 可读性 ----
    ink = colors.get("ink", "")
    paper = colors.get("paperBg", "")
    if HEX.match(str(ink)) and HEX.match(str(paper)):
        check_contrast("正文 / 纸张", str(ink), str(paper), 7.0)
    if HEX.match(str(colors.get("inkSoft", ""))) and HEX.match(str(paper)):
        check_contrast("次要文字 / 纸张", str(colors["inkSoft"]), str(paper), 4.5)
    if HEX.match(str(colors.get("muted", ""))) and HEX.match(str(paper)):
        check_contrast("辅助文字 / 纸张", str(colors["muted"]), str(paper), 3.0)
    if HEX.match(str(colors.get("faint", ""))) and HEX.match(str(paper)):
        check_contrast("弱化文字 / 纸张", str(colors["faint"]), str(paper), 2.0)
    if HEX.match(str(colors.get("codeInk", ""))) and HEX.match(str(colors.get("codeBg", ""))):
        check_contrast("代码文字 / 代码底", str(colors["codeInk"]), str(colors["codeBg"]), 7.0)
    if HEX.match(primary) and HEX.match(str(paper)):
        check_contrast("主强调 / 纸张", primary, str(paper), 4.5)
    if HEX.match(secondary) and HEX.match(str(paper)):
        check_contrast("副强调 / 纸张", secondary, str(paper), 3.0)
    if HEX.match(primary):
        # 主题包用 --accent-contrast 指定按钮文字色（应用默认算法只看亮度，浅色强调色会翻车）
        match = re.search(r"--accent-contrast:\s*(#[0-9a-f]{6})", css)
        button_ink = match.group(1) if match else (
            "#211c16" if luminance(primary) > 0.58 else "#fffaf2"
        )
        if not match:
            warn("style.css 没有指定 --accent-contrast，按钮文字可能对比不足")
        check_contrast("按钮文字 / 主强调", button_ink, primary, 4.5)

    # 代码高亮：从 CSS 里取回来比对代码底色
    code_bg = colors.get("codeBg", "")
    if HEX.match(str(code_bg)):
        for key in HL_KEYS:
            match = re.search(rf"--hl-{key}:\s*(#[0-9a-f]{{6}})", css)
            if not match:
                warn(f"style.css 没有覆盖 --hl-{key}")
                continue
            minimum = 2.2 if key == "comment" else 3.0
            check_contrast(f"高亮 {key} / 代码底", match.group(1), str(code_bg), minimum)

    # 语义色：至少不能和纸张混在一起
    if HEX.match(str(paper)):
        for key in SEMANTIC:
            match = re.search(rf"--{key}:\s*(#[0-9a-f]{{6}})", css)
            if match:
                check_contrast(f"语义色 {key} / 纸张", match.group(1), str(paper), 2.5)

    # 圆角与纸纹也算外观契约，缺失时提示
    if "--radius-md" not in css:
        warn("style.css 没有定义 --radius-md")


def main() -> int:
    selected = sys.argv[1:]
    if MANIFEST.exists():
        entries = json.loads(MANIFEST.read_text(encoding="utf-8"))["packs"]
    else:
        entries = [
            {"name": p.name, "zip": f"{p.file_stem}.moread-theme.zip"}
            for p in PALETTES
        ]
    if selected:
        wanted = {palette_by_slug(slug).file_stem for slug in selected}
        entries = [entry for entry in entries if entry["zip"].split(".moread-theme")[0] in wanted]

    for entry in entries:
        check_pack(entry)

    for warning in warnings:
        print(f"警告：{warning}")
    for error in errors:
        print(f"错误：{error}")
    if errors:
        print(f"\n失败：{len(errors)} 个问题")
        return 1
    print(f"\n全部检查通过 ✓（{len(entries)} 个主题包，{len(warnings)} 条提示）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
