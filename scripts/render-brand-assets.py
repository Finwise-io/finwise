#!/usr/bin/env python3
"""Render MoneyKeel brand PNGs from the SAME geometry as assets/brand/moneykeel-mark.svg.
The SVG is the design source of truth (founder spec 2026-07-15); this script keeps the app's
pixel assets (icon / adaptive-icon / splash / in-app mark) in lockstep with it.
Run: .venv/bin/python scripts/render-brand-assets.py
"""
from PIL import Image, ImageDraw, ImageFont

NAVY = (13, 35, 58)        # #0D233A
BLUE = (24, 95, 165)       # #185FA5 (0.5 stop) — blue means trust; the blue must actually read
MINT = (26, 196, 167)      # #1AC4A7
GREEN_TXT = (14, 140, 116) # #0E8C74 — 'Money' text green: same hue family as the arrow tip, dark enough to read
SS = 4                     # supersample factor for masks

# ── the mark's geometry, in the SVG's 400×400 space ──────────────────────────
G0, G1 = (60, 360), (360, 40)                       # gradient axis (bottom-left → top-right)
STEM = (70, 56, 64, 288, 12)                        # x y w h rx
LEG = [(106, 238), (170, 238), (298, 346), (234, 346)]
ARC = [(44, 258), (150, 252), (240, 208), (298, 124)]   # cubic bezier
ARC_W = 40
SLICE_W = 56                                        # channel cut in the stem under the arc
ARROW = [(334, 71), (329, 138), (273, 100)]


def bez(p, t):
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = p
    mt = 1 - t
    x = mt**3 * x0 + 3 * mt**2 * t * x1 + 3 * mt * t**2 * x2 + t**3 * x3
    y = mt**3 * y0 + 3 * mt**2 * t * y1 + 3 * mt * t**2 * y2 + t**3 * y3
    return x, y


def stroke_bezier(draw, pts, width, scale, fill=255):
    r = width * scale / 2
    for i in range(0, 401):
        x, y = bez(pts, i / 400)
        x, y = x * scale, y * scale
        draw.ellipse([x - r, y - r, x + r, y + r], fill=fill)


def mark_mask(size):
    """Anti-aliased alpha mask of the whole mark at `size`×`size` (SVG space is 400)."""
    scale = size * SS / 400
    big = size * SS
    stem = Image.new('L', (big, big), 0)
    d = ImageDraw.Draw(stem)
    x, y, w, h, rx = STEM
    d.rounded_rectangle([x * scale, y * scale, (x + w) * scale, (y + h) * scale], radius=rx * scale, fill=255)
    cut = Image.new('L', (big, big), 0)
    stroke_bezier(ImageDraw.Draw(cut), ARC, SLICE_W, scale)
    stem.paste(0, (0, 0), cut)                       # the slice: arc channel removed from the stem

    rest = Image.new('L', (big, big), 0)
    d = ImageDraw.Draw(rest)
    d.polygon([(px * scale, py * scale) for px, py in LEG], fill=255)
    stroke_bezier(d, ARC, ARC_W, scale)
    # founder 2026-07-15: square (not round) back on the arrow's tail — erase everything
    # behind a flat edge perpendicular to the arc's start direction
    (sx, sy), (c1x, c1y) = ARC[0], ARC[1]
    import math
    ux, uy = c1x - sx, c1y - sy
    ul = math.hypot(ux, uy); ux, uy = ux / ul, uy / ul
    px_, py_ = -uy, ux                                   # perpendicular
    P = lambda mx, my: ((sx + mx) * scale, (sy + my) * scale)
    hw, back = ARC_W * 0.75, ARC_W * 2.5
    d.polygon([P(px_ * hw, py_ * hw), P(-px_ * hw, -py_ * hw),
               P(-px_ * hw - ux * back, -py_ * hw - uy * back), P(px_ * hw - ux * back, py_ * hw - uy * back)], fill=0)
    d.polygon([(px * scale, py * scale) for px, py in ARROW], fill=255)

    from PIL import ImageChops
    full = ImageChops.lighter(stem, rest)
    return full.resize((size, size), Image.LANCZOS)


def gradient(size):
    """The keel gradient over `size`×`size`, matching the SVG's userSpace axis."""
    img = Image.new('RGB', (size, size))
    px = img.load()
    sc = size / 400
    (gx0, gy0), (gx1, gy1) = (G0[0] * sc, G0[1] * sc), (G1[0] * sc, G1[1] * sc)
    dx, dy = gx1 - gx0, gy1 - gy0
    L2 = dx * dx + dy * dy
    def lerp(a, b, t):
        return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
    row = [0.0] * size
    for yy in range(size):
        for xx in range(size):
            t = ((xx - gx0) * dx + (yy - gy0) * dy) / L2
            t = 0.0 if t < 0 else (1.0 if t > 1 else t)
            c = lerp(NAVY, BLUE, t / 0.5) if t <= 0.5 else lerp(BLUE, MINT, (t - 0.5) / 0.5)
            px[xx, yy] = c
    return img


def render_mark(size):
    """Transparent-background mark PNG."""
    m = mark_mask(size)
    g = gradient(size)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(g, (0, 0), m)
    return out


def main():
    mark1024 = render_mark(1024)
    mark1024.save('assets/brand/mark.png')            # in-app (transparent)

    icon = Image.new('RGBA', (1024, 1024), (255, 255, 255, 255))
    m = render_mark(760)                              # ~74% of the tile, optically centered
    icon.paste(m, ((1024 - 760) // 2, (1024 - 760) // 2 - 8), m)
    icon.save('assets/icon.png')

    ad = Image.new('RGBA', (1024, 1024), (255, 255, 255, 255))
    m2 = render_mark(600)                             # adaptive safe zone is tighter
    ad.paste(m2, ((1024 - 600) // 2, (1024 - 600) // 2), m2)
    ad.save('assets/adaptive-icon.png')

    # ── splash: mark + wordmark + tagline, matching the lockup ──
    W, H = 1284, 2778
    sp = Image.new('RGBA', (W, H), (255, 255, 255, 255))
    mm = render_mark(430)
    sp.paste(mm, ((W - 430) // 2, 940), mm)
    d = ImageDraw.Draw(sp)
    bold = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 132)
    nameReg = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 132)
    reg = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 44)
    # founder 2026-07-15: 'Keel' bolder than 'Money' for ease of reading
    mw = d.textlength('Money', font=nameReg)
    kw = d.textlength('Keel', font=bold)
    x0 = (W - (mw + kw)) / 2
    d.text((x0, 1450), 'Money', font=nameReg, fill=GREEN_TXT)
    d.text((x0 + mw, 1450), 'Keel', font=bold, fill=NAVY)
    tag = 'YOUR FINANCE COMMAND CENTER'
    ls = 10                                           # wide tracking, institutional
    tw = sum(d.textlength(ch, font=reg) + ls for ch in tag) - ls
    x = (W - tw) / 2
    for ch in tag:
        d.text((x, 1630), ch, font=reg, fill=NAVY)
        x += d.textlength(ch, font=reg) + ls
    sp.save('assets/splash.png')
    print('rendered: brand/mark.png icon.png adaptive-icon.png splash.png')


if __name__ == '__main__':
    main()
