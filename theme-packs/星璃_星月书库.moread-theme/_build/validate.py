# -*- coding: utf-8 -*-
"""按墨阅导入规则检查主题包（结构 / 长度 / 颜色 / 引用）。"""
from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ZIP_PATH = ROOT.parent / "星璃_星月书库.moread-theme.zip"
HEX = re.compile(r"^#[0-9a-f]{6}$")
IMAGE = re.compile(r"^data:image/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$")
COLOR_KEYS = {
    "appBg", "titlebarBg", "sidebarBg", "surfaceBg", "editorBg", "paperBg", "paperSoft",
    "statusBg", "ink", "inkSoft", "muted", "faint", "line", "lineSoft", "codeBg", "codeInk",
    "codeHead", "tableHead", "quoteBg", "selection",
}
UI_IDS = {
    "brand", "window-title", "theme-button", "studio-button", "help-button", "settings-button",
    "sidebar", "sidebar-actions", "recent", "outline", "assoc-badge", "sidebar-version",
    "sidebar-toggle", "view-switch", "more-button", "format-bar", "save-state", "save-button",
    "statusbar", "status-counts", "status-cursor", "status-sync", "status-meta",
    "welcome-art", "welcome-tiles", "welcome-hint", "code-copy", "color-chips",
    "html-preview-button", "stickers", "custom-dock",
}
ASSET_NAME = re.compile(r"^[A-Za-z0-9._\-\u4e00-\u9fa5]+$")

errors: list[str] = []
warnings: list[str] = []


def check(condition: bool, message: str) -> None:
    if not condition:
        errors.append(message)


def main() -> int:
    check(ZIP_PATH.exists(), f"缺少 {ZIP_PATH}")
    if errors:
        print("\n".join(errors))
        return 1

    check(ZIP_PATH.stat().st_size <= 32 * 1024 * 1024, "ZIP 超过 32 MB")
    with zipfile.ZipFile(ZIP_PATH) as archive:
        names = archive.namelist()
        check("theme.json" in names, "theme.json 不在压缩包根目录")
        check(len(names) <= 400, "条目数超过 400")
        total = 0
        for info in archive.infolist():
            total += info.file_size
            check(info.file_size <= 12 * 1024 * 1024, f"{info.filename} 超过 12 MB")
        check(total <= 40 * 1024 * 1024, "解压后总大小超过 40 MB")

        pack = json.loads(archive.read("theme.json").decode("utf-8"))
        css = archive.read("style.css").decode("utf-8") if "style.css" in names else ""
        home = archive.read("home.md").decode("utf-8") if "home.md" in names else ""
        asset_names = sorted(n[len("assets/"):] for n in names if n.startswith("assets/"))

    check(pack.get("format") == "moread-theme", "format 不是 moread-theme")
    check(pack.get("version") == 2, "version 不是 2")
    check(0 < len(pack.get("name", "")) <= 60, "name 缺失或超长")
    theme = pack.get("theme", {})

    check(theme.get("mode") in {"light", "dark", "system"}, "mode 非法")
    check(bool(HEX.match(theme.get("primary", ""))), "primary 不是 #rrggbb")
    check(bool(HEX.match(theme.get("secondary", ""))), "secondary 不是 #rrggbb")

    colors = theme.get("componentColors", {})
    check(set(colors).issubset(COLOR_KEYS), f"未知组件颜色键：{set(colors) - COLOR_KEYS}")
    for key, value in colors.items():
        check(bool(HEX.match(value)), f"组件颜色 {key}={value} 非法")

    icon = theme.get("brandIcon", {})
    check(icon.get("type") == "image", "brandIcon 不是图片")
    check(bool(IMAGE.match(icon.get("value", ""))), "brandIcon data URL 非法")
    check(len(icon.get("value", "")) <= 700_000, "brandIcon 超过 700,000 字符")

    stickers = theme.get("stickers", [])
    check(len(stickers) <= 40, "贴纸超过 40 个")
    for index, sticker in enumerate(stickers):
        check(sticker.get("type") in {"emoji", "image"}, f"贴纸 {index} type 非法")
        if sticker.get("type") == "image":
            check(bool(IMAGE.match(sticker.get("value", ""))), f"贴纸 {index} data URL 非法")
            check(len(sticker.get("value", "")) <= 700_000, f"贴纸 {index} 超过长度上限")
        check(0 <= sticker.get("x", 50) <= 100, f"贴纸 {index} x 越界")
        check(0 <= sticker.get("y", 50) <= 100, f"贴纸 {index} y 越界")
        check(16 <= sticker.get("size", 48) <= 200, f"贴纸 {index} size 越界")
        check(-180 <= sticker.get("rotation", 0) <= 180, f"贴纸 {index} rotation 越界")
        check(sticker.get("scope") in {"always", "welcome", "reading"}, f"贴纸 {index} scope 非法")

    buttons = theme.get("customButtons", [])
    check(len(buttons) <= 24, "按钮超过 24 个")
    for index, button in enumerate(buttons):
        check(0 < len(button.get("label", "")) <= 40, f"按钮 {index} label 非法")
        check(len(button.get("icon", "")) <= 4, f"按钮 {index} icon 超过 4 字符")
        check(0 < len(button.get("script", "")) <= 6000, f"按钮 {index} script 长度非法")

    hidden = theme.get("uiHidden", [])
    check(set(hidden).issubset(UI_IDS), f"未知界面元素：{set(hidden) - UI_IDS}")

    check(pack.get("home", {}).get("enabled") is True, "home.enabled 未开启")
    check(pack.get("style", {}).get("enabled") is True, "style.enabled 未开启")
    check(0 < len(home) <= 300_000, "home.md 长度非法")
    check(0 < len(css) <= 600_000, "style.css 长度非法")

    refs = set(re.findall(r"assets/([^\s)\"'<>]+)", home + css))
    for ref in refs:
        check(ref in asset_names, f"引用不存在的资源 assets/{ref}")
    for name in asset_names:
        check(bool(ASSET_NAME.match(name)), f"资源名含非法字符：{name}")
        if name not in refs:
            warnings.append(f"资源未被引用：assets/{name}")

    # 缩进/编码抽查
    check("\r" not in home, "home.md 含 CRLF（无伤大雅，记录一下）")

    print("资源：", ", ".join(asset_names))
    print("引用：", ", ".join(sorted(refs)))
    print(f"home.md {len(home)} 字符 / style.css {len(css)} 字符 / theme.json {len(json.dumps(pack))} 字符")
    for warning in warnings:
        print("警告：", warning)
    if errors:
        print("\n失败：")
        for error in errors:
            print(" -", error)
        return 1
    print("\n全部检查通过 ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
