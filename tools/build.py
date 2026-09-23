#!/usr/bin/env python3
"""Assemble index.html from the three source parts.

The page ships as one file, but it is written as three: the markup and styles,
the base64 logo, and the script. This joins them, and on the way it generates
the size-reference table from the PRESETS array in the script, so the sizes
appear in crawlable HTML without ever being typed twice.

    python3 tools/build.py
"""
import math
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
OUT = ROOT / "index.html"

PRESET_RE = re.compile(
    r"\{\s*id:'(?P<id>[^']+)',\s*short:'(?P<short>[^']+)',\s*label:'(?P<label>[^']+)',\s*"
    r"w:(?P<w>\d+),\s*h:(?P<h>\d+),\s*play:(?P<play>true|false),\s*"
    r"safe:\{t:(?P<t>[\d.]+),r:(?P<r>[\d.]+),b:(?P<b>[\d.]+),l:(?P<l>[\d.]+)\}\s*\}"
)


def presets(script):
    out = []
    block = script.split("var PRESETS = [", 1)[1].split("];", 1)[0]
    for m in PRESET_RE.finditer(block):
        d = m.groupdict()
        if d["id"] == "custom":
            continue
        d["w"], d["h"] = int(d["w"]), int(d["h"])
        for k in ("t", "r", "b", "l"):
            d[k] = float(d[k])
        out.append(d)
    if not out:
        raise SystemExit("no presets parsed - has the PRESETS format changed?")
    return out


def shape(w, h):
    a = w / h
    return "Wide" if a > 1.2 else ("Tall" if a < 0.85 else "Square")


def ratio(w, h):
    g = math.gcd(w, h)
    rw, rh = w // g, h // g
    # 1200x627 reduces to 400:209, which tells a reader nothing
    return f"{rw}:{rh}" if rw <= 32 and rh <= 32 else ""


def keep_clear(p):
    """The safe-area inset in words. Below ~8% is an ordinary margin, not chrome."""
    edges = [(name, p[k]) for name, k in
             (("top", "t"), ("right", "r"), ("bottom", "b"), ("left", "l")) if p[k] > 0.08]
    if not edges:
        return "Edges only"
    return ", ".join(f"{name} {round(v * 100)}%" for name, v in edges)


def table(ps):
    rows = []
    for p in ps:
        r = ratio(p["w"], p["h"])
        rows.append(
            "          <tr>\n"
            f'            <th scope="row">{p["label"]}</th>\n'
            f'            <td>{p["w"]} &times; {p["h"]}</td>\n'
            f'            <td>{shape(p["w"], p["h"])}{(" " + r) if r else ""}</td>\n'
            f'            <td>{keep_clear(p)}</td>\n'
            "          </tr>"
        )
    return (
        '      <section class="sizeref">\n'
        "        <h2>Every size this makes</h2>\n"
        "        <p>Each one is ready to pick above. <em>Keep clear</em> is the part of the\n"
        "        frame that platform covers with its own buttons and captions, so anything\n"
        "        you put there may not be seen.</p>\n"
        '        <table>\n'
        "          <thead>\n"
        "            <tr><th>Platform</th><th>Pixels</th><th>Shape</th><th>Keep clear</th></tr>\n"
        "          </thead>\n"
        "          <tbody>\n" + "\n".join(rows) + "\n"
        "          </tbody>\n"
        "        </table>\n"
        "      </section>"
    )


# --- safe-area explainer -----------------------------------------------------
# Only the presets whose chrome takes a real bite are worth drawing. Below ~15%
# on every edge the inset is an ordinary margin and the diagram says nothing.
FIG_H = 200
DRAWN = ("youtube-shorts", "tiktok", "instagram-reel")


def figure(p):
    w = round(FIG_H * p["w"] / p["h"])
    t, r, b, l = (p[k] for k in "trbl")
    sx, sy = l * w, t * FIG_H
    sw, sh = w - (l + r) * w, FIG_H - (t + b) * FIG_H
    fid = "fig-" + p["id"]
    covered = keep_clear(p)
    desc = (f'{p["label"]}, {p["w"]} by {p["h"]} pixels. '
            f'The platform covers {covered.lower()}, leaving the dashed area clear.')
    bands = [
        f'<rect x="0" y="0" width="{w}" height="{sy:.1f}"/>',
        f'<rect x="0" y="{sy + sh:.1f}" width="{w}" height="{FIG_H - sy - sh:.1f}"/>',
        f'<rect x="0" y="{sy:.1f}" width="{sx:.1f}" height="{sh:.1f}"/>',
        f'<rect x="{sx + sw:.1f}" y="{sy:.1f}" width="{w - sx - sw:.1f}" height="{sh:.1f}"/>',
    ]
    return (
        '          <figure class="safefig">\n'
        f'            <svg viewBox="0 0 {w} {FIG_H}" role="img" aria-labelledby="{fid}">\n'
        f'              <title id="{fid}">{desc}</title>\n'
        # Light stands for artwork you can see, dark for what the platform covers.
        # Yellow stays reserved for the safe box, matching the app's own guide.
        f'              <rect width="{w}" height="{FIG_H}" fill="#565c60"/>\n'
        '              <g fill="#14171a" opacity=".88">' + "".join(bands) + "</g>\n"
        f'              <rect x="{sx:.1f}" y="{sy:.1f}" width="{sw:.1f}" height="{sh:.1f}"\n'
        '                    fill="none" stroke="var(--mark)" stroke-width="2" stroke-dasharray="6 4"/>\n'
        "            </svg>\n"
        f'            <figcaption><b>{p["label"]}</b><span>Covers {covered}</span></figcaption>\n'
        "          </figure>"
    )


def safe_areas(ps):
    by_id = {p["id"]: p for p in ps}
    figs = [figure(by_id[i]) for i in DRAWN if i in by_id]
    return (
        '      <section class="safeareas">\n'
        "        <h2>Where each platform covers your thumbnail</h2>\n"
        "        <p>A safe area is the part of the frame you can count on people seeing.\n"
        "        Everything outside it still gets saved in the file, but the app you post to\n"
        "        draws its own interface on top: a caption, a row of buttons down one side, a\n"
        "        profile photo, a duration badge.</p>\n"
        "        <p>Landscape thumbnails lose almost nothing, which is why a YouTube thumbnail\n"
        "        can run text close to the edge. Vertical covers are the opposite. TikTok,\n"
        "        Reels and Shorts all stack controls down the right and captions along the\n"
        "        bottom, so a headline centred in the frame ends up behind a share button.</p>\n"
        '        <div class="figs">\n' + "\n".join(figs) + "\n        </div>\n"
        "        <p>Each size in this tool carries its own safe rectangle, and the numbers in\n"
        "        the table above are those rectangles written out. Tick <b>Show safe areas</b>\n"
        "        while you work and the same box is drawn on the preview. It is a guide only,\n"
        "        and never appears in the file you download.</p>\n"
        "      </section>"
    )


# --- questions, asked once and used twice ------------------------------------
FAQ = [
    ("What is a safe area on a thumbnail?",
     "The part of the frame the platform will not cover with its own interface. "
     "Anything outside it may sit behind a caption, a button or a duration badge, "
     "so keep your headline and logo inside it."),
    ("Why do TikTok and Reels cover more of the frame than YouTube?",
     "Vertical formats put their controls on top of the video rather than beside it. "
     "TikTok keeps roughly the right fifth of the frame for its action rail and the "
     "bottom fifth for the caption, while a landscape YouTube thumbnail only loses a "
     "duration badge in one corner."),
    ("Does the dashed safe-area box appear in the image I download?",
     "No. It is drawn on the preview only. The exported PNG contains your artwork and "
     "nothing else."),
    ("What size should an Instagram post be?",
     "1080 by 1350 pixels, a 4:5 portrait. Square at 1080 by 1080 still works and is "
     "included as its own preset, but the 4:5 takes up more of the screen on a phone."),
    ("Do my images get uploaded anywhere?",
     "No. Everything is drawn in your browser on your own device. No image, and nothing "
     "you type, is ever sent to a server."),
]


def faq_markup():
    items = "\n".join(
        "          <div class=\"qa\">\n"
        f"            <h3>{q}</h3>\n"
        f"            <p>{a}</p>\n"
        "          </div>"
        for q, a in FAQ
    )
    return ('      <section class="faq">\n'
            "        <h2>Questions</h2>\n" + items + "\n      </section>")


def faq_schema():
    import json
    data = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in FAQ
        ],
    }
    return ('<script type="application/ld+json">\n'
            + json.dumps(data, indent=2) + "\n</script>")


def main():
    markup = (SRC / "page.html").read_text()
    logo = (SRC / "logo.txt").read_text()
    script = (SRC / "app.js").read_text()

    ps = presets(script)
    for slot in ("<!--SIZE-REFERENCE-->", "<!--SAFE-AREAS-->", "<!--FAQ-->", "<!--FAQ-SCHEMA-->"):
        if slot not in markup:
            raise SystemExit(f"src/page.html is missing the {slot} placeholder")
    markup = markup.replace("<!--SIZE-REFERENCE-->", table(ps))
    markup = markup.replace("<!--SAFE-AREAS-->", safe_areas(ps))
    markup = markup.replace("<!--FAQ-->", faq_markup())
    markup = markup.replace("<!--FAQ-SCHEMA-->", faq_schema())
    markup = markup.replace("{{COUNT}}", str(len(ps)))

    OUT.write_text(markup + logo + script)
    print(f"index.html written - {len(ps)} presets, {len(DRAWN)} diagrams, "
          f"{len(FAQ)} questions, {OUT.stat().st_size // 1024}KB")


if __name__ == "__main__":
    main()
