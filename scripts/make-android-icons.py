"""Generate Android launcher icons and splash screens from assets/icon-512.png."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / "android" / "app" / "src" / "main" / "res"
SOURCE = ROOT / "assets" / "icon-512.png"

BRAND_DARK = (40, 35, 28, 255)
PAPER = (242, 237, 228, 255)

DENSITIES = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}


def load_icon() -> Image.Image:
    icon = Image.open(SOURCE).convert("RGBA")
    return icon


def rounded_icon(icon: Image.Image, size: int) -> Image.Image:
    scaled = icon.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    radius = max(2, int(size * 0.22))
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(scaled, (0, 0), mask)
    return out


def round_icon(icon: Image.Image, size: int) -> Image.Image:
    scaled = icon.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(scaled, (0, 0), mask)
    return out


def foreground(icon: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * 0.56)
    art = rounded_icon(icon, inner)
    offset = (size - inner) // 2
    canvas.paste(art, (offset, offset), art)
    return canvas


def write_splash(path: Path, size: tuple[int, int]) -> None:
    width, height = size
    canvas = Image.new("RGBA", (width, height), PAPER)
    logo_size = int(min(width, height) * 0.24)
    art = rounded_icon(icon_source, logo_size)
    canvas.paste(
        art,
        ((width - logo_size) // 2, (height - logo_size) // 2),
        art,
    )
    canvas.convert("RGB").save(path, "PNG")


icon_source = load_icon()

for density, size in DENSITIES.items():
    folder = RES / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    rounded_icon(icon_source, size).save(folder / "ic_launcher.png", "PNG")
    round_icon(icon_source, size).save(folder / "ic_launcher_round.png", "PNG")
    foreground(icon_source, int(size * 2.25)).save(
        folder / "ic_launcher_foreground.png", "PNG"
    )

background = RES / "values" / "ic_launcher_background.xml"
background.write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n'
    "<resources>\n"
    '    <color name="ic_launcher_background">#28231C</color>\n'
    "</resources>\n",
    encoding="utf-8",
)

for splash in RES.glob("drawable*/splash.png"):
    with Image.open(splash) as current:
        size = current.size
    write_splash(splash, size)

print("icons and splash generated")
