"""Shared loader for the federated term register (no dependencies)."""
import json, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
MAPREL = ["skos:exactMatch","skos:closeMatch","skos:relatedMatch","skos:broadMatch","skos:narrowMatch","rl:convergesWith"]
# "A skos:narrowMatch B" states that B is narrower than A. Seen from B, the relation is broadMatch.
INVERSE = {"skos:narrowMatch": "skos:broadMatch", "skos:broadMatch": "skos:narrowMatch"}

def lang(vals, l):
    for v in (vals if isinstance(vals, list) else [vals]):
        if isinstance(v, dict) and v.get("@language") == l:
            return v["@value"]
    return None

def aslist(x): return x if isinstance(x, list) else [x]

def scheme_file(world, s, overrides):
    """Which file carries this world's concept scheme: an override (a repo checking its own working copy),
    else the seed copy while ref is null, else the pinned file under worlds/<world> (scripts/fetch_worlds.py)."""
    if world in overrides: return pathlib.Path(overrides[world])
    return ROOT / (s["seed"] if s.get("ref") is None else f"worlds/{world}/{s['path']}")

def parse_overrides(argv):
    """--scheme WORLD=PATH (repeatable): use PATH for WORLD instead of the pinned source.
    Anything else is an error: a misspelt option must not silently check the pinned file instead."""
    USAGE = "usage: guard.py [--scheme WORLD=PATH ...]"
    ov = {}; it = iter(argv)
    for a in it:
        if a == "--scheme": a = "--scheme=" + next(it, "")
        if not a.startswith("--scheme="): raise SystemExit(f"unexpected argument {a!r}\n{USAGE}")
        w, _, f = a[len("--scheme="):].partition("=")
        if not w or not f: raise SystemExit(f"--scheme needs WORLD=PATH, got {a[len('--scheme='):]!r}\n{USAGE}")
        if w in ov: raise SystemExit(f"--scheme given twice for {w!r}")
        ov[w] = f
    return ov

def load(overrides=None):
    """Returns (concepts, links, notes, problems, warnings)."""
    overrides = overrides or {}
    src = json.load(open(ROOT / "terms/sources.json"))["schemes"]
    unknown = set(overrides) - set(src)
    if unknown: raise SystemExit(f"--scheme names unknown world(s) {sorted(unknown)}; known: {sorted(src)}")
    concepts, problems, warnings = {}, [], []
    for w, s in src.items():
        f = scheme_file(w, s, overrides)
        if not f.exists():
            hint = "" if w in overrides or s.get("ref") is None else " (run scripts/fetch_worlds.py)"
            problems.append(f"{w}: scheme file {f} not found{hint}"); continue
        for n in json.load(open(f))["@graph"]:
            if n.get("@type") != "skos:Concept": continue
            n["_world"] = w; concepts[n["@id"]] = n
            for fld in ("skos:prefLabel", "skos:definition"):
                for l in ("de", "en"):
                    if not lang(n.get(fld, []), l): problems.append(f"{n['@id']}: {fld} missing in {l}")
            if not n.get("dct:source"): problems.append(f"{n['@id']}: dct:source missing")
    links = {c: [] for c in concepts}; notes = {}
    for m in json.load(open(ROOT / "terms/mappings.skos.jsonld"))["@graph"]:
        a = m["@id"]
        if a not in concepts: problems.append(f"mapping names unknown concept {a}"); continue
        if "skos:note" in m: notes.setdefault(a, []).append(m["skos:note"])
        for rel in MAPREL + ["rl:falseFriend"]:
            for b in aslist(m.get(rel, [])):
                if b not in concepts: problems.append(f"{a} {rel} -> unknown concept {b}"); continue
                links[a].append((rel, b)); links[b].append((INVERSE.get(rel, rel), a))
    by_label = {}
    for c in concepts.values():
        for l in ("de", "en"):
            lab = (lang(c["skos:prefLabel"], l) or "").lower()
            if lab: by_label.setdefault(lab, set()).add(c["@id"])
    for lab, ids in by_label.items():
        ids = sorted(ids)
        for i in range(len(ids)):
            for j in range(i + 1, len(ids)):
                a, b = ids[i], ids[j]
                if concepts[a]["_world"] == concepts[b]["_world"]: continue
                if not any(t == b for _, t in links[a]): warnings.append(f'"{lab}" appears in {a} and {b} without a mapping')
    for c in concepts:
        if not links[c] and c not in notes: warnings.append(f"{c}: neither mapping nor note (undecided)")
    return concepts, links, notes, problems, warnings
