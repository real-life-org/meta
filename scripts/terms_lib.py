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

def load():
    """Returns (concepts, links, notes, problems, warnings)."""
    src = json.load(open(ROOT / "terms/sources.json"))["schemes"]
    concepts, problems, warnings = {}, [], []
    for w, s in src.items():
        f = ROOT / (s["seed"] if s.get("ref") is None else s["path"])
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
