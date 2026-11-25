"""Generate the MoRead app icon (PNG + multi-size ICO)."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
ASSETS.mkdir(exist_ok=True)

SIZE = 2048
SCALE = SIZE / 1024


def s(value: float) -> float:
    return value * SCALE


def rounded_gradient() -> Image.Image:
    base = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    gradient = Image.new("RGBA", (SIZE, SIZE))
    pixels = gradient.load()
    top = (49, 42, 33)
    bottom = (31, 27, 22)
    for y in range(SIZE):
        t = y / (SIZE - 1)
        # A subtle diagonal warmth in the upper-left.
        color = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)) + (255,)
        for x in range(SIZE):
            warm = max(0.0, 1.0 - (x * 0.45 + y * 0.85) / SIZE)
            pixels[x, y] = (
                min(255, color[0] + int(10 * warm)),
                min(255, color[1] + int(6 * warm)),
                min(255, color[2] + int(2 * warm)),
                255,
            )

    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, SIZE - 1, SIZE - 1), radius=s(232), fill=255
    )
    base.paste(gradient, (0, 0), mask)

    # Inner hairline highlight.
    gloss = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gloss)
    gd.rounded_rectangle(
        (s(18), s(18), SIZE - s(18), SIZE - s(18)),
        radius=s(216),
        outline=(255, 246, 230, 22),
        width=int(s(3)),
    )
    base.alpha_composite(gloss)
    return base


def draw_mark(image: Image.Image) -> None:
    draw = ImageDraw.Draw(image)
    cream = (247, 240, 228, 255)
    width = int(s(92))

    # Stylized M, drawn as a single round-joined stroke.
    points = [
        (s(256), s(748)),
        (s(256), s(300)),
        (s(512), s(606)),
        (s(768), s(300)),
        (s(768), s(748)),
    ]
    draw.line(points, fill=cream, width=width, joint="curve")

    for point in (points[0], points[-1]):
        r = width // 2
        draw.ellipse(
            (point[0] - r, point[1] - r, point[0] + r, point[1] + r), fill=cream
        )

    # Persimmon dot: the "live ink" accent.
    dot_center = (s(797), s(789))
    dot_radius = int(s(82))
    draw.ellipse(
        (
            dot_center[0] - dot_radius,
            dot_center[1] - dot_radius,
            dot_center[0] + dot_radius,
            dot_center[1] + dot_radius,
        ),
        fill=(223, 117, 73, 255),
    )

    # Soft glow behind the dot.
    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse(
        (
            dot_center[0] - int(s(150)),
            dot_center[1] - int(s(150)),
            dot_center[0] + int(s(150)),
            dot_center[1] + int(s(150)),
        ),
        fill=(223, 117, 73, 28),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=s(60)))
    image.alpha_composite(glow)
    draw = ImageDraw.Draw(image)
    draw.ellipse(
        (
            dot_center[0] - dot_radius,
            dot_center[1] - dot_radius,
            dot_center[0] + dot_radius,
            dot_center[1] + dot_radius,
        ),
        fill=(223, 117, 73, 255),
    )
    # Small cream glint.
    glint_r = int(s(17))
    draw.ellipse(
        (
            dot_center[0] - int(s(28)) - glint_r,
            dot_center[1] - int(s(30)) - glint_r,
            dot_center[0] - int(s(28)) + glint_r,
            dot_center[1] - int(s(30)) + glint_r,
        ),
        fill=(255, 244, 230, 90),
    )


def main() -> None:
    image = rounded_gradient()
    draw_mark(image)

    # Slight outer shadow so the icon sits well on light taskbars.
    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle(
        (s(12), s(18), SIZE - s(12), SIZE - s(8)),
        radius=s(226),
        fill=(35, 24, 12, 55),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=s(26)))

    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(shadow)
    canvas.alpha_composite(image)

    canvas.resize((1024, 1024), Image.LANCZOS).save(ASSETS / "icon.png")
    canvas.resize((512, 512), Image.LANCZOS).save(ASSETS / "icon-512.png")

    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    canvas.save(ASSETS / "icon.ico", format="ICO", sizes=ico_sizes)
    print("Wrote assets/icon.png, assets/icon-512.png and assets/icon.ico")


if __name__ == "__main__":
    main()
