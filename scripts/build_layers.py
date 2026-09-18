#!/usr/bin/env python3
"""Resolves the bilingual source overview/layers.svg into overview/layers.en.svg and overview/layers.de.svg.
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
for lang in ("en", "de"):
    (ROOT / f"overview/layers.{lang}.svg").write_text(resolve(lang))
print("layers.en.svg, layers.de.svg written")
