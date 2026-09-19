#!/usr/bin/env python3
"""Builds from the bilingual source overview/layers.svg:
- layers.en.svg and layers.de.svg: fixed language, follow the colour scheme via CSS (works inside <img>);
- layers.adaptive.svg: follows the browser colour scheme (CSS) and, when opened as a document, the preferred browser language (script).
SVG <switch systemLanguage> picks the first child whose language appears anywhere in the viewer's
preference list, not the best match, so sites embed the resolved file for their page language."""
import re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / "overview/layers.svg").read_text()
def resolve(lang):
    def pick(m):
        block = m.group(1)
        kids = re.findall(r'<text([^>]*)>(.*?)</text>', block, re.S)
        for attrs, inner in kids:
            if f'systemLanguage="{lang}"' in attrs:
                return f'<text{attrs.replace(f" systemLanguage=\"{lang}\"", "")}>{inner}</text>'
        for attrs, inner in kids:
            if "systemLanguage" not in attrs:
                return f"<text{attrs}>{inner}</text>"
        return m.group(0)
    out = re.sub(r"<switch>(.*?)</switch>", pick, src, flags=re.S)
    return out.replace("Labels: German for de-language viewers, English otherwise (SVG switch/systemLanguage).",
                       f"Resolved for language '{lang}' by scripts/build_layers.py from layers.svg. Do not edit.")
COL = {"#3f7a4e": "--rlnp", "#e6f0e7": "--rlnp-tint", "#2f62c9": "--rltp", "#e5ecfa": "--rltp-tint", "#b36b1c": "--rls",
       "#f7ecdd": "--rls-tint", "#ffffff": "--bg", "#5f6b64": "--muted", "#1e2622": "--ink"}
THEME = """<style>
    :root { color-scheme: light dark; }
    :root { color-scheme: light dark; --bg:#ffffff; --ink:#1e2622; --muted:#5f6b64; --rlnp:#3f7a4e; --rlnp-tint:#e6f0e7; --rltp:#2f62c9; --rltp-tint:#e5ecfa; --rls:#b36b1c; --rls-tint:#f7ecdd; }
    @media (prefers-color-scheme: dark) {
      :root { --bg:#141917; --ink:#e9eee9; --muted:#98a59d; --rlnp:#7cc48a; --rlnp-tint:#1e2f23; --rltp:#7fa6f0; --rltp-tint:#1d2738; --rls:#e0a25a; --rls-tint:#33281a; }
    }
  </style>
  """
def themed(svg):
    for h, v in COL.items(): svg = svg.replace(h, f"var({v})")
    # no background rectangle: the picture is transparent, the browser paints the canvas in its scheme
    return svg.replace('<rect width="940" height="450" fill="var(--bg)"/>', THEME, 1)

for lang in ("en", "de"):
    (ROOT / f"overview/layers.{lang}.svg").write_text(themed(resolve(lang)))

def adaptive():
    def sw(m):
        out = []
        for attrs, inner in re.findall(r'<text([^>]*)>(.*?)</text>', m.group(1), re.S):
            if 'systemLanguage="de"' in attrs:
                out.append(f'<text class="l-de"{attrs.replace(" systemLanguage=\"de\"", "")}>{inner}</text>')
            else:
                out.append(f'<text class="l-en"{attrs}>{inner}</text>')
        return "".join(out)
    a = re.sub(r"<switch>(.*?)</switch>", sw, src, flags=re.S)
    for h, v in COL.items(): a = a.replace(h, f"var({v})")
    style = """<style>
    :root { color-scheme: light dark; --bg:#ffffff; --ink:#1e2622; --muted:#5f6b64; --rlnp:#3f7a4e; --rlnp-tint:#e6f0e7; --rltp:#2f62c9; --rltp-tint:#e5ecfa; --rls:#b36b1c; --rls-tint:#f7ecdd; }
    @media (prefers-color-scheme: dark) {
      :root { --bg:#141917; --ink:#e9eee9; --muted:#98a59d; --rlnp:#7cc48a; --rlnp-tint:#1e2f23; --rltp:#7fa6f0; --rltp-tint:#1d2738; --rls:#e0a25a; --rls-tint:#33281a; }
    }
    .l-de { display:none; }
    :root[data-lang="de"] .l-de { display:inline; }
    :root[data-lang="de"] .l-en { display:none; }
  </style>
  <script><![CDATA[
    // Best-match language: navigator.languages[0] decides (unlike SVG systemLanguage, which takes any match).
    // Runs only when the file is opened as a document; inside <img> the English default shows.
    (function () {
      var langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || "en"];
      if (String(langs[0] || "en").toLowerCase().indexOf("de") === 0) document.documentElement.setAttribute("data-lang", "de");
    })();
  ]]></script>
  """
    a = a.replace('<rect width="940" height="450" fill="var(--bg)"/>', style, 1)
    a = re.sub(r"<!-- The layer picture of Real Life\..*?-->", "<!-- Built by scripts/build_layers.py from layers.svg. Do not edit. Follows the browser colour scheme (CSS) and, when opened as a document, the preferred browser language (script); embedded via <img> it shows English. -->", a, flags=re.S)
    (ROOT / "overview/layers.adaptive.svg").write_text(a)

adaptive()
print("layers.en.svg, layers.de.svg, layers.adaptive.svg written")
