#!/usr/bin/env python3
"""Build every MoneyKeel logo picture the app ships, from the founder's own three files.

Since 2026-10-30 the source is his artwork, not a drawing of ours. His instruction that day:
"change the logo to attached". His files, never modified:
  MoneyKeel/documents/other/brand-source-2026-10-30/founder_logo_full_2026-10-30.png      875 x 205
  MoneyKeel/documents/other/brand-source-2026-10-30/founder_logo_mark_2026-10-30.png      460 x 235
  MoneyKeel/documents/other/brand-source-2026-10-30/founder_logo_wordmark_2026-10-30.png  630 x 195

What is taken from where (measured, see the printout):
  - the mark alone       <- the mark file (its mark is 422 px wide, the largest he sent)
  - the name and tagline <- the full file. The wordmark file cuts the last "l" of Keel through its
                            stem and drops the "r" of Center (106 inked pixels on its right edge),
                            so it is not used.
  - the stray "a"        <- removed. His files read "aMoneyKeel"; the product is MoneyKeel. In the
                            full file the "a" is ink columns 333-381 and the "M" starts at 382, so
                            the name is cut at x = 382. To reverse: set NAME_X0 to 333.
  - the full logo        <- the full file as he laid it out: his mark, his tagline where he put it,
                            and the name moved left by the width the "a" left (36 px) so it lines
                            up with the tagline.

The white background becomes transparent: a pixel at least 3 px inside the ink keeps its colour;
an edge pixel takes the colour of the solid ink beside it and an opacity from how much white was
mixed in. So no edge carries white onto a dark or green background.

The old K mark, its SVGs and its pictures are in assets/brand/archive-2026-10-30/ (this script's
old version is in git, commit bdd1a3dd).

Run from the repository root:  python3 scripts/render-brand-assets.py
"""
import math
import os
from collections import deque

from PIL import Image, ImageDraw

SRC = 'MoneyKeel/documents/other/brand-source-2026-10-30'
FULL = f'{SRC}/founder_logo_full_2026-10-30.png'
MARK = f'{SRC}/founder_logo_mark_2026-10-30.png'
WORD = f'{SRC}/founder_logo_wordmark_2026-10-30.png'

NAME_X0 = 382          # the first column of the "M" in the full file (the "a" ends at 381)
NAME_ROWS = (45, 147)  # the name's rows in the full file (ink 51-144; the tagline starts at 149)
TAG_ROWS = (147, 182)  # the tagline's rows (ink 149-175)
TAG_X0 = 340           # the tagline's ink starts at 346
MARK_COLS = (30, 330)  # the mark in the full file (ink 37-322)
LOCKUP_SHIFT = 36      # name moved left so its "M" (382) lines up with the tagline's "Y" (346)
PAD = 3                # transparent margin around each cut, at full size
BG = 8                 # a pixel this close to white (765 - r - g - b) is background
CORE = 4               # distances from the background are counted up to this many pixels
INK_MIN = 150          # the lightest real ink in his mark is 222 from white; a glow pixel is under 40

WEBPACK = 'MoneyKeel/documents/website-pack/logo'


def ink_of(p):
    return 765 - p[0] - p[1] - p[2]


def text_colour(img):
    """The one ink colour of his lettering: the median of its darkest pixels."""
    px = list(img.convert('RGB').get_flattened_data())
    top = max(ink_of(p) for p in px)
    solid = sorted((p for p in px if ink_of(p) >= 0.92 * top), key=ink_of)
    return solid[len(solid) // 2]


def matte(img, ink=None):
    """RGB on white -> RGBA on transparent.

    Each pixel is compared with the ink it was drawn in: `ink` for his lettering (one colour), or
    for the mark (several greens) the nearest solid ink inside the shape, else the darkest pixel within 3 px. How far the pixel is from white,
    measured along the line from white to that ink, is its opacity. An edge pixel then takes the
    ink's colour, so no white is carried onto a dark background. A pixel inside the shape (3 px or
    more from the white) keeps its own colour, so the mark's lighter greens stay as he drew them.
    """
    img = img.convert('RGB')
    w, h = img.size
    px = img.load()
    d = [[ink_of(px[x, y]) for x in range(w)] for y in range(h)]
    # distance (8-neighbour steps) from the nearest background pixel, capped at CORE
    dist = [[CORE] * w for _ in range(h)]
    q = deque()
    for y in range(h):
        for x in range(w):
            if d[y][x] <= BG:
                dist[y][x] = 0
                q.append((x, y))
    while q:
        x, y = q.popleft()
        nd = dist[y][x] + 1
        if nd >= CORE:
            continue
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                xx, yy = x + dx, y + dy
                if 0 <= xx < w and 0 <= yy < h and dist[yy][xx] > nd:
                    dist[yy][xx] = nd
                    q.append((xx, yy))
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    op = out.load()
    for y in range(h):
        for x in range(w):
            if dist[y][x] == 0:
                continue
            c = px[x, y]
            if dist[y][x] >= 3 and d[y][x] >= INK_MIN:
                op[x, y] = (c[0], c[1], c[2], 255)       # inside the shape: his colour, solid
                continue
            if ink is not None:
                f, fd = ink, ink_of(ink)                  # his lettering is one colour
            else:
                # the mark: the nearest solid ink inside the shape, else the darkest pixel close by
                f, fd, best = None, 0, 99
                for dy in range(-3, 4):
                    for dx in range(-3, 4):
                        xx, yy = x + dx, y + dy
                        if 0 <= xx < w and 0 <= yy < h and dist[yy][xx] >= 3 and d[yy][xx] >= INK_MIN \
                                and dx * dx + dy * dy < best:
                            best, f, fd = dx * dx + dy * dy, px[xx, yy], d[yy][xx]
                if f is None:
                    f, fd = c, d[y][x]
                    for dy in range(-3, 4):
                        for dx in range(-3, 4):
                            xx, yy = x + dx, y + dy
                            if 0 <= xx < w and 0 <= yy < h and d[yy][xx] > fd:
                                fd, f = d[yy][xx], px[xx, yy]
            if fd < INK_MIN:
                continue                                  # no ink within 3 px: a speck of the white, not the logo
            num = sum((255 - c[i]) * (255 - f[i]) for i in range(3))
            den = sum((255 - f[i]) ** 2 for i in range(3)) or 1
            a = max(0.0, min(1.0, num / den))
            if a < 0.05:
                continue
            if a > 0.97:
                a = 1.0
            op[x, y] = (f[0], f[1], f[2], round(a * 255))
    return out


def tight(rgba, pad=PAD):
    l, t, r, b = rgba.getchannel('A').getbbox()
    w, h = r - l + 2 * pad, b - t + 2 * pad
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.paste(rgba.crop((l, t, r, b)), (pad, pad))
    return out


def scaled(rgba, w):
    """Resize keeping the aspect (Pillow resizes RGBA premultiplied, so edges stay clean)."""
    h = round(rgba.height * w / rgba.width)
    return rgba.resize((w, h), Image.LANCZOS)


def write_123(rgba, base):
    """The picture at full size is @3x (no resampling); @2x and @1x are drawn down from it."""
    rgba.save(f'{base}@3x.png')
    scaled(rgba, round(rgba.width * 2 / 3)).save(f'{base}@2x.png')
    scaled(rgba, round(rgba.width / 3)).save(f'{base}.png')


def edge_blur(rgba):
    """Average width, in pixels, of the soft band along an edge: partly see-through pixels per edge pixel."""
    a = rgba.getchannel('A').load()
    w, h = rgba.size
    soft = sum(1 for y in range(h) for x in range(w) if 25 < a[x, y] < 230)
    edge = 0
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if a[x, y] >= 128 and min(a[x - 1, y], a[x + 1, y], a[x, y - 1], a[x, y + 1]) < 128:
                edge += 1
    return soft / max(edge, 1)


def reference_blur(size=1024):
    """The same measure on a shape drawn at full size (4x supersampled): what a sharp icon scores."""
    big = Image.new('L', (size * 4, size * 4), 0)
    dr = ImageDraw.Draw(big)
    dr.polygon([(400, 2800), (1600, 1200), (2600, 1300), (1500, 2900)], fill=255)
    dr.ellipse([2400, 1700, 3600, 2900], fill=255)
    m = big.resize((size, size), Image.LANCZOS)
    rgba = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    rgba.putalpha(m)
    return edge_blur(rgba)


def onto(rgba, colour):
    bg = Image.new('RGBA', rgba.size, colour + (255,))
    bg.alpha_composite(rgba)
    return bg


def main():
    full = Image.open(FULL).convert('RGB')
    markf = Image.open(MARK).convert('RGB')
    wordf = Image.open(WORD).convert('RGB')
    print('his files:', full.size, markf.size, wordf.size)
    rightedge = sum(1 for y in range(wordf.height) if ink_of(wordf.getpixel((wordf.width - 1, y))) > 60)
    print(f'wordmark file: {rightedge} inked pixels on its right edge (cut off) -> name and tagline come from the full file')

    # ── the pieces ───────────────────────────────────────────────────────────
    mark = tight(matte(markf))
    name_src = full.crop((NAME_X0, NAME_ROWS[0], full.width, NAME_ROWS[1]))
    tag_src = full.crop((TAG_X0, TAG_ROWS[0], full.width, TAG_ROWS[1]))
    name_ink, tag_ink = text_colour(name_src), text_colour(tag_src)
    print(f'his lettering ink: name {name_ink}, tagline {tag_ink}')
    name_raw = matte(name_src, name_ink)
    name = tight(name_raw)
    tag_raw = matte(tag_src, tag_ink)
    mark_full_raw = matte(full.crop((MARK_COLS[0], 0, MARK_COLS[1], full.height)))

    # ── the full logo, as he laid it out, without the "a" ────────────────────
    canvas = Image.new('RGBA', full.size, (0, 0, 0, 0))
    canvas.alpha_composite(mark_full_raw, (MARK_COLS[0], 0))
    canvas.alpha_composite(tag_raw, (TAG_X0, TAG_ROWS[0]))
    canvas.alpha_composite(name_raw, (NAME_X0 - LOCKUP_SHIFT, NAME_ROWS[0]))
    lockup = tight(canvas, pad=6)

    os.makedirs('assets/brand', exist_ok=True)
    write_123(mark, 'assets/brand/mark')
    write_123(name, 'assets/brand/wordmark')
    lockup.save('assets/brand/lockup.png')

    # ── iOS icon: the mark centred on white, 1024 x 1024, no transparency ────
    ICON_W = 768                                    # one-eighth of the icon clear on each side
    m = scaled(mark, ICON_W)
    icon = Image.new('RGBA', (1024, 1024), (255, 255, 255, 255))
    icon.alpha_composite(m, ((1024 - m.width) // 2, (1024 - m.height) // 2))
    icon.convert('RGB').save('assets/icon.png')

    # ── Android adaptive icon: every inked pixel inside the 66-of-108 safe circle ─
    safe_r = 1024 * 33 / 108
    a = mark.getchannel('A').load()
    cx, cy = mark.width / 2, mark.height / 2
    far = max(math.hypot(x + 0.5 - cx, y + 0.5 - cy) for y in range(mark.height) for x in range(mark.width) if a[x, y] > 0)
    adw = int(mark.width * (0.95 * safe_r) / far)
    am = scaled(mark, adw)
    adaptive = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    adaptive.alpha_composite(am, ((1024 - am.width) // 2, (1024 - am.height) // 2))
    adaptive.save('assets/adaptive-icon.png')

    # ── splash: the full logo centred on white, at his file's own size ───────
    splash = Image.new('RGBA', (1284, 2778), (255, 255, 255, 255))
    splash.alpha_composite(lockup, ((1284 - lockup.width) // 2, (2778 - lockup.height) // 2))
    splash.convert('RGB').save('assets/splash.png')

    # ── the website pack carries the same pictures ───────────────────────────
    if os.path.isdir(WEBPACK):
        mark.save(f'{WEBPACK}/moneykeel-mark.png')
        name.save(f'{WEBPACK}/moneykeel-wordmark.png')
        lockup.save(f'{WEBPACK}/moneykeel-lockup.png')
        icon.convert('RGB').save(f'{WEBPACK}/moneykeel-app-icon.png')

    # ── measurements ─────────────────────────────────────────────────────────
    print(f'mark      {mark.size}  aspect {mark.width / mark.height:.4f}')
    print(f'wordmark  {name.size}  aspect {name.width / name.height:.4f}')
    print(f'lockup    {lockup.size}  aspect {lockup.width / lockup.height:.4f}')
    print(f'icon      mark {m.size} = {ICON_W / mark.width:.2f}x his mark file')
    print(f'adaptive  mark {am.size} = {adw / mark.width:.2f}x; furthest ink {far * adw / mark.width:.1f} px from centre, safe radius {safe_r:.1f}')
    print(f'splash    full logo {lockup.size} at 1.00x his full file')
    ref = reference_blur()
    icon_m = Image.new('RGBA', m.size, (0, 0, 0, 0)); icon_m.alpha_composite(m)
    print(f'edge blur (px): his mark at its own size {edge_blur(mark):.2f} | in the 1024 icon {edge_blur(icon_m):.2f} | '
          f'in the adaptive icon {edge_blur(am):.2f} | a shape drawn at 1024 {ref:.2f}')
    # HALO CHECK — it counts what it looked at. A pixel of the picture that is not see-through at all
    # and is paler than any ink he drew (under 90 from white) is a white speck that would show on a
    # dark or green background. The count must be 0, out of every pixel the picture draws.
    for label, pic in (('mark', mark), ('wordmark', name), ('lockup', lockup)):
        ap = pic.load()
        drawn = [ap[x, y] for y in range(pic.height) for x in range(pic.width) if ap[x, y][3] > 0]
        pale = sum(1 for r, g, b, al in drawn if 765 - r - g - b < 90)
        print(f'halo check {label:8s}: {pale} pale pixels of {len(drawn)} drawn (must be 0)')
    # ON WHITE IT MUST STILL BE HIS PICTURE: the transparent cut laid back on white, against his file.
    for label, pic, src in (('mark', matte(markf), markf), ('name', name_raw, name_src)):
        back = onto(pic, (255, 255, 255)).convert('RGB').load()
        s = src.load()
        diffs = [abs(back[x, y][i] - s[x, y][i]) for y in range(src.height) for x in range(src.width) for i in range(3)]
        print(f'on white vs his file, {label}: mean difference {sum(diffs) / len(diffs):.2f} of 255, largest {max(diffs)} '
              f'({sum(1 for v in diffs if v > 24)} channel values differ by more than 24, of {len(diffs)})')


if __name__ == '__main__':
    main()
