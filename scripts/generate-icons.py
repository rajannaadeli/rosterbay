#!/usr/bin/env python3
"""
Generate all Expo mobile app icon assets from a single source image.

The source PNG had its background removed, which also stripped the white
calendar/person symbol (alpha dropped to ~1-3). We recover the icon by:
  1. Compositing onto white to restore the visual.
  2. Placing the recovered icon onto brand-colored canvases.

Outputs:
  - icon.png          (1024×1024)  — iOS / store listing
  - adaptive-icon.png (1024×1024)  — Android adaptive foreground (safe zone)
  - favicon.png       (48×48)      — Web favicon
  - splash.png        (1284×2778)  — Launch / splash screen
"""

from PIL import Image
import os

SRC = os.path.join(os.path.dirname(__file__), '..', 'mobile-icon.png')
OUT = os.path.join(os.path.dirname(__file__), '..', 'mobile', 'assets', 'images')
TEAL = (15, 118, 110)  # #0F766E


def recover_flat(path: str) -> Image.Image:
    """
    Flatten transparent PNG onto white to get back the original visual:
    teal rounded-rect with white calendar icon on a white surround.
    Then crop to just the icon (remove the white surround) and return RGBA.
    """
    raw = Image.open(path).convert('RGBA')
    # Flatten on white
    white = Image.new('RGBA', raw.size, (255, 255, 255, 255))
    flat = Image.alpha_composite(white, raw).convert('RGB')
    return flat


def find_icon_bbox(flat_rgb: Image.Image) -> tuple[int, int, int, int]:
    """Find the bounding box of the non-white content (the teal icon)."""
    w, h = flat_rgb.size
    # Scan for non-white pixels
    min_x, min_y, max_x, max_y = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b = flat_rgb.getpixel((x, y))
            if r < 250 or g < 250 or b < 250:  # not white
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    # Add 1px padding
    return (max(0, min_x - 1), max(0, min_y - 1),
            min(w, max_x + 2), min(h, max_y + 2))


def make_icon(icon_rgb: Image.Image):
    """1024×1024 — icon scaled to fill the canvas."""
    result = icon_rgb.resize((1024, 1024), Image.LANCZOS)
    result.save(os.path.join(OUT, 'icon.png'), 'PNG')
    print('  ✓ icon.png (1024×1024)')


def make_adaptive_icon(icon_rgb: Image.Image):
    """
    1024×1024 — icon in inner 66% safe zone on teal background.
    """
    size = 1024
    safe = int(size * 0.66)
    offset = (size - safe) // 2

    canvas = Image.new('RGB', (size, size), TEAL)
    scaled = icon_rgb.resize((safe, safe), Image.LANCZOS)
    canvas.paste(scaled, (offset, offset))
    canvas.save(os.path.join(OUT, 'adaptive-icon.png'), 'PNG')
    print(f'  ✓ adaptive-icon.png (1024×1024, 66% safe zone)')


def make_favicon(icon_rgb: Image.Image):
    """48×48 favicon."""
    result = icon_rgb.resize((48, 48), Image.LANCZOS)
    result.save(os.path.join(OUT, 'favicon.png'), 'PNG')
    print('  ✓ favicon.png (48×48)')


def make_splash(icon_rgb: Image.Image):
    """1284×2778 splash — icon centered on white."""
    w, h = 1284, 2778
    canvas = Image.new('RGB', (w, h), (255, 255, 255))
    logo_size = int(w * 0.30)
    scaled = icon_rgb.resize((logo_size, logo_size), Image.LANCZOS)
    x = (w - logo_size) // 2
    y = (h - logo_size) // 2
    canvas.paste(scaled, (x, y))
    canvas.save(os.path.join(OUT, 'splash.png'), 'PNG')
    print('  ✓ splash.png (1284×2778)')


def main():
    print(f'Source: {SRC}')

    # Step 1: recover original visual by flattening on white
    flat = recover_flat(SRC)
    print(f'  Flattened: {flat.size[0]}×{flat.size[1]} RGB')

    # Step 2: crop to the icon bounding box (remove white surround)
    bbox = find_icon_bbox(flat)
    icon_cropped = flat.crop(bbox)
    print(f'  Cropped to icon: {icon_cropped.size[0]}×{icon_cropped.size[1]} (bbox={bbox})')

    # Step 3: make it square (pad shorter dimension with teal)
    w, h = icon_cropped.size
    sq = max(w, h)
    square = Image.new('RGB', (sq, sq), TEAL)
    paste_x = (sq - w) // 2
    paste_y = (sq - h) // 2
    square.paste(icon_cropped, (paste_x, paste_y))

    os.makedirs(OUT, exist_ok=True)
    make_icon(square)
    make_adaptive_icon(square)
    make_favicon(square)
    make_splash(square)

    print('\nDone! All icons written to mobile/assets/images/')


if __name__ == '__main__':
    main()
