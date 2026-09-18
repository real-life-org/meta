# Agent guide · real-life-org/meta

This repository connects three worlds; it owns none of them. Read this before changing anything.

## What goes where

| You want to change… | Do it in… |
|---|---|
| the meaning of a term (RLNP: circle, role, witnessing) | `real-life-org/real-life-network-protocol` |
| the construction of a term (RLTP: group, anchor, edge, epoch) | `real-life-org/rltp-spec` |
| a UI or code term of the stack (space, item, connector, mirror) | `real-life-org/real-life-stack` |
| how two terms relate across worlds | `terms/mappings.skos.jsonld` here |
| the layer picture or the seams | `overview/` here |
| a roadmap | `roadmap/<door>.md` here |

Never add a definition to `terms/mappings.skos.jsonld`. It carries relations and notes only.

## The term register

- Format: SKOS in JSON-LD. Shared context in `terms/context.jsonld`. Own fields (`rl:`) are documented in `terms/rl-vocab.md`.
- Three concept schemes, one per world. `terms/sources.json` says where each lives. While a world has no file of its own yet (`ref` is `null`), the seed copy under `terms/seed/` is used.
- Every concept needs `skos:prefLabel` and `skos:definition` in both `de` and `en`, and a `dct:source` pointing at the normative place.
- Mappings use the five SKOS mapping relations plus `rl:convergesWith` (target state) and `rl:falseFriend` (same word, different thing, on purpose).
- A concept without any mapping needs a `skos:note` in the mappings file saying why. Otherwise the guard reports it as undecided.

## Commands

```
python3 scripts/guard.py     # checks; exit 1 on errors
python3 scripts/render.py    # regenerates views/
python3 scripts/build_layers.py  # builds layers.en.svg, layers.de.svg and layers.adaptive.svg from layers.svg
```

Run all three before opening a pull request. `views/` and `overview/layers.{en,de,adaptive}.svg` are generated; never edit them by hand. Edit the bilingual source `overview/layers.svg` instead.

## Language

Repository language is English. Two exceptions: `overview/cells.md` and `overview/seams.md` are bilingual because they appear on reallife.network in German; in `coordination/` everyone writes in their own language.

## Style

Short sentences. One idea per sentence. No decoration. A picture only where it shows a mechanism that prose would have to assemble.
