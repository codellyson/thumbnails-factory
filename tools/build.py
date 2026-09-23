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


def main():
    markup = (SRC / "page.html").read_text()
    logo = (SRC / "logo.txt").read_text()
    script = (SRC / "app.js").read_text()

    ps = presets(script)
    if "<!--SIZE-REFERENCE-->" not in markup:
        raise SystemExit("src/page.html is missing the <!--SIZE-REFERENCE--> placeholder")
    markup = markup.replace("<!--SIZE-REFERENCE-->", table(ps))
    markup = markup.replace("{{COUNT}}", str(len(ps)))

    OUT.write_text(markup + logo + script)
    print(f"index.html written - {len(ps)} presets, {OUT.stat().st_size // 1024}KB")


if __name__ == "__main__":
    main()
