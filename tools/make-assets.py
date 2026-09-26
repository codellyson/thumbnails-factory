#!/usr/bin/env python3
"""Generate the site's favicon and social card.

The card wears the site's own colours and shows, on its right, a thumbnail
built the way the tool builds one: the same painted backdrop, the same
vignette, the same two-line headline with the house gradient on the lower
line. Run it from the repo root after changing any of those.

    python3 tools/make-assets.py
"""
import base64, math, pathlib, re

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT = "/System/Library/Fonts/Supplemental/Arial Black.ttf"

INK    = (35, 34, 31)      # --ink
CANVAS = (252, 249, 245)   # --canvas
ACCENT = (238, 123, 88)    # --accent
STOPS  = [(185, 164, 255), (217, 162, 255), (255, 178, 122)]   # the house gradient


def logo_image():
    """Pull the K out of the base64 the page already carries."""
    html = (ROOT / "index.html").read_text()
    m = re.search(r'LOGO_SRC = "data:image/png;base64,([^"]+)"', html)
    if not m:
        raise SystemExit("LOGO_SRC not found in index.html")
    import io
    return Image.open(io.BytesIO(base64.b64decode(m.group(1)))).convert("RGBA")


def backdrop(w, h):
    """The same gradient and blobs makeDefaultFrame() paints, at card size."""
    img = Image.new("RGB", (w, h))
    px = img.load()
    a, b, c = (16, 28, 43), (22, 41, 58), (12, 18, 25)
    for y in range(h):
        for x in range(w):
            t = (x / w + y / h) / 2
            if t < 0.5:
                u = t * 2
                px[x, y] = tuple(round(a[i] + (b[i] - a[i]) * u) for i in range(3))
            else:
                u = (t - 0.5) * 2
                px[x, y] = tuple(round(b[i] + (c[i] - b[i]) * u) for i in range(3))

    for cx, cy, rad, col, peak in [
        (0.22, 0.26, 0.44, (139, 108, 240), 0.55),
        (0.79, 0.36, 0.40, (248, 147,  95), 0.42),
        (0.55, 0.82, 0.46, ( 58, 188, 188), 0.30),
        (0.10, 0.86, 0.32, (192, 122, 232), 0.30),
    ]:
        layer = Image.new("RGBA", (w, h), col + (0,))
        mask = Image.new("L", (w, h), 0)
        md = mask.load()
        px0, py0, r = cx * w, cy * h, rad * w
        for y in range(h):
            for x in range(w):
                d = math.hypot(x - px0, y - py0)
                md[x, y] = max(0, round(255 * peak * (1 - d / r))) if d < r else 0
        layer.putalpha(mask)
        img = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")

    hatch = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hatch)
    for x in range(-h, w, 48):
        hd.line([(x, 0), (x + h, h)], fill=(255, 255, 255, 13), width=2)
    return Image.alpha_composite(img.convert("RGBA"), hatch).convert("RGB")


def vignette(img):
    w, h = img.size
    shade = Image.new("RGBA", (w, h), (5, 7, 12, 0))
    mask = Image.new("L", (w, h), 0)
    md = mask.load()
    span = h * 0.55
    for y in range(h):
        d = (h - y) / span
        md[0, y] = 0
        v = 0 if d > 1 else round(255 * (0.94 * (1 - d) ** 1.2))
        for x in range(w):
            md[x, y] = v
    shade.putalpha(mask)
    return Image.alpha_composite(img.convert("RGBA"), shade).convert("RGB")


def gradient_text(draw_on, text, font, xy, stops):
    """Fill the glyphs with a left-to-right ramp through all three stops."""
    w, h = draw_on.size
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).text(xy, text, font=font, fill=255, anchor="ls")
    bbox = mask.getbbox()
    if not bbox:
        return draw_on
    x0, _, x1 = bbox[0], bbox[1], bbox[2]
    ramp = Image.new("RGB", (w, h))
    rp = ramp.load()
    for x in range(w):
        t = min(1.0, max(0.0, (x - x0) / max(1, x1 - x0)))
        if t < 0.45:
            u, lo, hi = t / 0.45, stops[0], stops[1]
        else:
            u, lo, hi = (t - 0.45) / 0.55, stops[1], stops[2]
        col = tuple(round(lo[i] + (hi[i] - lo[i]) * u) for i in range(3))
        for y in range(h):
            rp[x, y] = col
    return Image.composite(ramp, draw_on, mask)


UI_FONT = "/System/Library/Fonts/HelveticaNeue.ttc"   # stands in for Instrument Sans
MEDIUM = 10                                            # face index of Medium in the .ttc
MUTED  = (127, 124, 119)                               # --muted
LINE   = (221, 208, 195)                               # --line-strong


def tracked(draw, xy, text, font, fill, track):
    """Draw text with tighter letter spacing than the font's own, the way
    the site sets its headings (negative tracking, in em)."""
    x, y = xy
    em = font.size
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill, anchor="ls")
        x += font.getlength(ch) + track * em
    return x


def thumbnail(w, h):
    """A thumbnail as the tool makes one: painted backdrop, vignette, and the
    two-line headline with the house gradient on the lower line."""
    img = vignette(backdrop(w, h))
    pad = round(w * 0.07)
    big = ImageFont.truetype(FONT, round(h * 0.15))
    base = h - pad
    img = gradient_text(img, "FACTORY", big, (pad, base), STOPS)
    ImageDraw.Draw(img).text((pad, base - round(h * 0.16)), "THUMBNAIL", font=big,
                             fill=(255, 255, 255), anchor="ls")
    logo = logo_image()
    lh = round(h * 0.13)
    logo = logo.resize((round(logo.width * lh / logo.height), lh), Image.LANCZOS)
    img.paste(logo, (pad, round(h * 0.09)), logo)
    return img


def make_card(path, w=1200, h=630):
    """The share card in the site's own dress: warm page, the mark and name,
    the promise in ink, and on the right the thing it makes, with the size
    chart's tiles under it drawn in the page's colours."""
    img = Image.new("RGB", (w, h), CANVAS)
    d = ImageDraw.Draw(img)
    pad = 72

    # mark and name
    mark = 64
    icon = draw_mark(mark * 4).resize((mark, mark), Image.LANCZOS)
    img.paste(icon, (pad, pad), icon)
    name = ImageFont.truetype(UI_FONT, 34, index=MEDIUM)
    tracked(d, (pad + mark + 20, pad + mark / 2 + 12), "Thumbnail Factory", name, INK, -0.02)

    # the promise
    head = ImageFont.truetype(UI_FONT, 66, index=MEDIUM)
    y = 330
    for line in ("Make a thumbnail", "for any platform"):
        tracked(d, (pad, y), line, head, INK, -0.045)
        y += 76
    sub = ImageFont.truetype(UI_FONT, 27, index=MEDIUM)
    tracked(d, (pad, y + 26), "Twelve sizes. Nothing uploads.", sub, MUTED, -0.01)

    # the thing it makes, on a soft shadow
    tw, th = 452, 254
    tx, ty = w - pad - tw, 132   # centres the card and its tiles on the height
    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([tx, ty + 18, tx + tw, ty + th + 18], radius=22,
                                             fill=INK + (60,))
    shadow = shadow.filter(ImageFilter.GaussianBlur(26))
    img = Image.alpha_composite(img.convert("RGBA"), shadow).convert("RGB")
    thumb = thumbnail(tw * 2, th * 2).resize((tw, th), Image.LANCZOS)
    mask = Image.new("L", (tw * 4, th * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, tw * 4 - 1, th * 4 - 1], radius=18 * 4, fill=255)
    img.paste(thumb, (tx, ty), mask.resize((tw, th), Image.LANCZOS))

    # Wide, square and tall, as the size chart shows them: the chosen one in
    # ink, the others as quiet outlines in the page's line colour.
    S = 4
    tiles = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
    td = ImageDraw.Draw(tiles)
    tile_h, right, bottom = 46, tx + tw, ty + th + 92
    for aspect, chosen in ((9/16, False), (1/1, False), (16/9, True)):
        tile_w = round(tile_h * aspect)
        box = [(right - tile_w) * S, (bottom - tile_h) * S, right * S, bottom * S]
        if chosen:
            td.rounded_rectangle(box, radius=5 * S, fill=INK)
            dot_x = right - tile_w / 2
        else:
            td.rounded_rectangle(box, radius=5 * S, outline=LINE, width=2 * S, fill=(255, 254, 253))
        right -= tile_w + 14
    tiles = tiles.resize((w, h), Image.LANCZOS)
    img = Image.alpha_composite(img.convert("RGBA"), tiles).convert("RGB")
    # the coral dot the nav uses for "you are here", under the chosen tile
    dx = dot_x
    dd = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
    ImageDraw.Draw(dd).ellipse([(dx - 4) * S, (bottom + 12) * S, (dx + 4) * S, (bottom + 20) * S], fill=ACCENT)
    img = Image.alpha_composite(img.convert("RGBA"), dd.resize((w, h), Image.LANCZOS)).convert("RGB")

    img.save(path, "PNG", optimize=True)
    return img.size


# The mark: a picture in a frame, on the one coral the site uses as accent.
# Coordinates are on a 64-unit grid, shared by the SVG and the PNGs.
FRAME = (10, 17, 54, 47)   # the ink picture frame
FRAME_R = 5
RIDGE = [(10, 38), (22, 29), (31, 36), (39, 31), (54, 42), (54, 47), (10, 47)]


def draw_mark(S, rounded=True):
    """The mark at S pixels square, as RGBA."""
    u = S / 64
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=14 * u, fill=ACCENT)
    else:
        d.rectangle([0, 0, S, S], fill=ACCENT)
    box = [v * u for v in FRAME]
    d.rounded_rectangle(box, radius=FRAME_R * u, fill=INK)
    # the ridge is cut to the frame's rounded corners
    ridge = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(ridge).polygon([(x * u, y * u) for x, y in RIDGE], fill=CANVAS)
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle(box, radius=FRAME_R * u, fill=255)
    img.paste(ridge, (0, 0), Image.composite(ridge.split()[3], Image.new("L", (S, S), 0), mask))
    return img


def make_icons():
    (ROOT / "favicon.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        '<rect width="64" height="64" rx="14" fill="#ee7b58"/>'
        '<rect x="10" y="17" width="44" height="30" rx="5" fill="#23221f"/>'
        '<path d="M10 38l12-9 9 7 8-5 15 11v0a5 5 0 0 1-5 5H15a5 5 0 0 1-5-5z" fill="#fcf9f5"/>'
        "</svg>\n"
    )
    # The tab icon keeps its rounded corners; the touch icon fills the square,
    # because iOS rounds it with its own mask. Both are drawn 8x and shrunk.
    for size, name, rounded in ((32, "favicon-32.png", True), (180, "apple-touch-icon.png", False)):
        out = draw_mark(size * 8, rounded).resize((size, size), Image.LANCZOS)
        if not rounded:
            out = out.convert("RGB")
        out.save(ROOT / name, "PNG", optimize=True)


if __name__ == "__main__":
    print("og.png", make_card(ROOT / "og.png"))
    make_icons()
    print("icons written")
