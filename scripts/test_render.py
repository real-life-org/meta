#!/usr/bin/env python3
"""Tests for the cross-world links render.py writes to views/<world>.json (no dependencies).

The Starlight theme (packages/docs-kit) reads these files to show, in each site's
glossary, what a term corresponds to in the other worlds. A small register built here stands in
for the three schemes, so the cases do not depend on fetched worlds.

  usage: test_render.py
"""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from render import world_json

FAILURES = []

def check(name, cond, detail=""):
    print(("ok   " if cond else "FAIL ") + name)
    if not cond:
        FAILURES.append(name)
        if detail: print("       " + detail)

def concept(cid, world, de, en):
    return {"@id": cid, "_world": world, "skos:prefLabel": [{"@value": de, "@language": "de"}, {"@value": en, "@language": "en"}]}

concepts = {c["@id"]: c for c in [
    concept("rltp:Member", "rltp", "Mitglied", "Member"),
    concept("rltp:Group", "rltp", "Gruppe", "Group"),
    concept("rls:member", "rls", "Mitglied", "Member"),
    concept("rlnp:Kreis", "rlnp", "Kreis", "Circle"),
    concept("rlnp:Sichtbarkeit", "rlnp", "Sichtbarkeit", "Visibility"),
]}
links = {c: [] for c in concepts}
def link(a, rel, b, back):
    links[a].append((rel, b)); links[b].append((back, a))
link("rltp:Member", "skos:exactMatch", "rls:member", "skos:exactMatch")
link("rlnp:Kreis", "skos:exactMatch", "rltp:Group", "skos:exactMatch")
link("rlnp:Sichtbarkeit", "skos:narrowMatch", "rltp:Group", "skos:broadMatch")
sources = {
    "rltp": {"glossary": {"de": "https://tp.example/glossary/", "en": "https://tp.example/glossary/"}},
    "rls": {"glossary": {"de": "https://rls.example/handbuch/glossar/", "en": "https://rls.example/en/handbuch/glossar/"}},
    "rlnp": {"glossary": {"de": "https://meta.example/network.md", "en": "https://meta.example/network.md", "anchor": "heading"}},
}

rltp = world_json("rltp", concepts, links, sources)
check("names its world", rltp["world"] == "rltp")
check("keys concepts by local name", set(rltp["concepts"]) == {"Member", "Group"}, str(rltp["concepts"].keys()))
m = rltp["concepts"]["Member"]
check("Member corresponds to rls:member",
      m == [{"relation": "exactMatch", "world": "rls", "id": "rls:member",
             "label": {"de": "Mitglied", "en": "Member"},
             "url": {"de": "https://rls.example/handbuch/glossar/#member", "en": "https://rls.example/en/handbuch/glossar/#member"}}], str(m))
g = rltp["concepts"]["Group"]
check("relations are named without prefix, seen from the concept", [e["relation"] for e in g] == ["exactMatch", "broadMatch"], str(g))
check("a world without a site links to its view by heading anchor",
      g[0]["url"] == {"de": "https://meta.example/network.md#kreis", "en": "https://meta.example/network.md#kreis"}, str(g[0]["url"]))
rls = world_json("rls", concepts, links, sources)
check("the other direction links into the RLTP glossary by local name",
      rls["concepts"]["member"][0]["url"]["en"] == "https://tp.example/glossary/#Member")
check("concepts without links are left out", "Kreis" not in world_json("rlnp", {"rlnp:Kreis": concepts["rlnp:Kreis"]}, {"rlnp:Kreis": []}, sources)["concepts"])

print(f"\n{len(FAILURES)} failed" if FAILURES else "\nall cases pass")
sys.exit(1 if FAILURES else 0)
