#!/usr/bin/env python3
"""Turns the raw Venice art (public/art/_raw/*.png) and the logo into small,
mobile-friendly WebP files plus PWA icons.

    python3 scripts/optimize-art.py

Requires Pillow (pip install pillow).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "public" / "art" / "_raw"
ART = ROOT / "public" / "art"
ICONS = ROOT / "public" / "icons"

# name -> (max width, max height, quality)
SIZES = {
    "bg-mobile": (720, 1280, 70),
    "bg-desktop": (1600, 900, 68),
    "hero": (720, 900, 78),
    "empty-journal": (480, 480, 78),
    "empty-gallery": (480, 480, 78),
    "ask": (480, 480, 78),
    "reflect": (480, 480, 78),
    "offline": (480, 480, 78),
    "link": (480, 480, 78),
}


def optimize_art():
    ART.mkdir(parents=True, exist_ok=True)
    for name, (w, h, q) in SIZES.items():
        src = RAW / f"{name}.png"
        if not src.exists():
            print(f"skip {name} (no raw file)")
            continue
        im = Image.open(src).convert("RGB")
        im.thumbnail((w, h), Image.LANCZOS)
        out = ART / f"{name}.webp"
        im.save(out, "WEBP", quality=q, method=6)
        print(f"{out.relative_to(ROOT)}  {im.size}  {out.stat().st_size // 1024} KB")


def gradient(size):
    """Soft mint -> lavender -> blush diagonal wash used behind icons."""
    w, h = size
    base = Image.new("RGB", size)
    draw = ImageDraw.Draw(base)
    stops = [(0.0, (226, 244, 240)), (0.55, (236, 230, 247)), (1.0, (248, 230, 238))]
    for y in range(h):
        t = y / max(h - 1, 1)
        for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
            if t0 <= t <= t1:
                k = (t - t0) / (t1 - t0)
                color = tuple(int(c0[i] + (c1[i] - c0[i]) * k) for i in range(3))
                break
        draw.line([(0, y), (w, y)], fill=color)
    return base


def make_icons():
    ICONS.mkdir(parents=True, exist_ok=True)
    # The full logo (with wordmark) is the source; the app uses the icons below.
    logo = Image.open(ROOT / "public" / "logo.png").convert("RGB")

    # The emblem (cloud over open book) without the wordmark, for app icons.
    emblem = logo.crop((246, 138, 786, 672))
    # Background: the logo's own soft watercolor wash (top-left corner), blurred.
    wash = logo.crop((0, 0, 260, 260)).filter(ImageFilter.GaussianBlur(18))

    def icon(size, scale):
        canvas = wash.resize((size, size), Image.LANCZOS)
        target = int(size * scale)
        inner = emblem.resize((target, target), Image.LANCZOS)
        # Feathered elliptical mask so the emblem melts into the wash.
        mask = Image.new("L", (target, target), 0)
        pad = int(target * 0.04)
        ImageDraw.Draw(mask).ellipse((pad, pad, target - pad, target - pad), fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(target * 0.06))
        offset = ((size - target) // 2, (size - target) // 2)
        canvas.paste(inner, offset, mask)
        return canvas

    icon(192, 1.0).save(ICONS / "icon-192.png", optimize=True)
    icon(512, 1.0).save(ICONS / "icon-512.png", optimize=True)
    # Maskable icons keep the artwork inside the 80% safe zone.
    icon(512, 0.78).save(ICONS / "maskable-512.png", optimize=True)
    icon(180, 1.0).save(ICONS / "apple-touch-icon.png", optimize=True)
    icon(64, 1.0).save(ICONS / "favicon-64.png", optimize=True)
    print("icons written to", ICONS.relative_to(ROOT))


if __name__ == "__main__":
    optimize_art()
    make_icons()
