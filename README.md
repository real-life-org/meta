# Real Life · meta

What belongs to none of the three parts alone: the layer picture, the seams between the parts, the shared term register, the roadmaps, and team coordination.

![The layer picture: RLNP beside the stack, RLTP filling the lower three layers](overview/layers.adaptive.svg)

## The three parts

Real Life consists of three parts. Two are specifications, one is code.

- The **Real Life Network Protocol (RLNP)** is the social specification. It defines what a circle, an encounter, a promise and a role are, and which norms apply to them. It does not define formats, signatures or keys.
- The **Real Life Stack (RLS)** is the code: an app toolkit with an **application** layer (modules, views, forms), a **data** layer (items, relations, schema, portability) and a **connector** below them, the socket at which a backend docks. The stack ends at the socket. What a backend provides is declared through capabilities; the data layer assumes nothing beyond them.
- The **Real Life Trust Protocol (RLTP)** is the technical specification for the three layers below the socket: **identity** (identifiers, devices, recovery), **encounter and relationship** (ceremony, trust, credentials) and **access** (groups, policy, keys, epochs). It is the backend that satisfies RLNP's requirements on a statement: portable, signed, independently verifiable. A conventional backend such as Supabase fills the same socket with fewer guarantees; communities that prefer a server use it.

RLNP and RLTP are both normative and neither sits above the other: RLNP decides what a thing means, RLTP decides how it is constructed. Where both use the same word, RLNP wins for the meaning and RLTP for the construction.

Every green edge in the picture is a **seam**: a word from RLNP with a counterpart in the stack. Where no edge leads, there is deliberately no counterpart. The seams are listed in [overview/seams.md](overview/seams.md); what each cell answers, and what it never answers, in [overview/cells.md](overview/cells.md).

## Entry points

| Site | For whom | What it does |
|---|---|---|
| [reallife.network](https://reallife.network) | everyone who wants to connect | invites you into relationship, in RLNP's language |
| trust-protocol.real-life.org (today [rltp.real-life.org](https://rltp.real-life.org)) | protocol developers, DTGWG, security people | specification, simulators, conformance |
| [real-life-stack.de](https://real-life-stack.de) | developers, vibecoders, agents | handbook, term atlas, how to build and contribute |

Each door shows the same picture from its own side.

## What lives here

| Path | Content |
|---|---|
| `overview/` | the layer picture and `parts.json` (the three parts in one sentence and three points each, source of the gate page at real-life.org). `layers.svg` is the bilingual source; `scripts/build_layers.py` builds `layers.en.svg` and `layers.de.svg` (fixed language, for pages) and `layers.adaptive.svg` (follows the browser's colour scheme, and its preferred language when opened directly; embedded as an image it shows English). The cells; the seams |
| `terms/` | the federated term register: shared context, mappings between the three concept schemes, and `sources.json`, which pins each world's concept scheme to a commit in its own repository; `scripts/fetch_worlds.py` checks the pinned files out under `worlds/` (not committed) |
| `scripts/` | `fetch_worlds.py` checks the pinned concept schemes out under `worlds/` (not committed); `check_pins.py` asks whether a world has changed its scheme since it was pinned; `guard.py` checks the register (runs in every repo's CI); `render.py` produces one view per door |
| `views/` | generated views of the register, one per door; consumed by the sites at build time |
| `roadmap/` | one roadmap per door and the shared rules |
| [`CONVENTIONS.md`](CONVENTIONS.md) | how every repository of the family writes its specifications: the two document classes, the German RFC 2119 keywords, status vocabulary, versioning, the standards we build on |
| `coordination/` | who works on what, and a daily log; the one place where everyone writes in their own language |

## Guard in a repository's CI

Each world's concept scheme lives in that world's repository (path in `terms/sources.json`); the mappings live here. A change to a scheme file must therefore be checked against the register before it is merged, from within the repository that changes it. The step checks out this repository next to the working copy, fetches the worlds this repository pins, and runs the guard with the working copy's file in place of the pinned source:

```yaml
- uses: actions/checkout@v4
- uses: actions/checkout@v4
  with:
    repository: real-life-org/meta
    path: meta-src            # the register, beside the working copy
- uses: actions/setup-python@v5
  with:
    python-version: "3.12"
- name: fetch the concept schemes meta pins
  run: python3 meta-src/scripts/fetch_worlds.py
- name: concept scheme matches the shared register
  run: python3 meta-src/scripts/guard.py --scheme rlnp=terms/rlnp.skos.jsonld
```

`--scheme WORLD=PATH` can be given more than once. The guard fails on a missing language, a missing source, a dangling mapping, and the same word in two worlds without a mapping; it lists open proposals and convergence tasks. The path per world: `rlnp=terms/rlnp.skos.jsonld`, `rltp=terms/rltp.skos.jsonld`, `rls=docs/reference/rls.skos.jsonld`.

## When a world moves

`terms/sources.json` pins each world's concept scheme to a commit, so the register describes a state someone checked. The pin does not follow the world. `scripts/check_pins.py` compares each pinned file with the head of that repository's default branch and says *current*, *behind* (a newer head, same file) or *drifted* (the file differs); `.github/workflows/pins.yml` runs it daily and keeps one issue open while a world is drifted.

Following a world is a decision, not a refresh: set its `ref`, then run `fetch_worlds.py`, `guard.py` and `render.py`. If the guard rejects the new scheme, the mappings come first and the pin stays where it is.

## The ground rule

**Definitions never live here.** Each world defines its own terms in its own repository and stays normative for them. This repository holds only what connects them: the picture, the seams, the mappings, the checks.

Identifiers are served from `real-life.org`: `rlnp/v1`, `rltp/v1`, `rls/v1`, `meta/v1`. They follow the protocols, not the branding; a breaking change gets a new version, not a new word.

## License

[CC BY 4.0](LICENSE), like the two specification repositories.
