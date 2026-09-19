# Specification conventions

Every repository of the Real Life family writes its specifications the same
way. This file is the one place where that is decided. A repository does not
repeat the rules; its `CONTRIBUTING.md` points here and adds only what is its
own.

Who this is for: anyone who writes or reads a normative document — people and
agents alike. A reader must be able to tell a requirement from a
recommendation without knowing the author.

## Two classes of document

The family writes two kinds of specification, on purpose. They differ in
language and in form, not in rigour.

| | Internal specification | Outward-facing draft |
|---|---|---|
| Where | `real-life-stack/docs/spec/`, `real-life-network-protocol/`, `wot-spec/01-`…`03-` | `wot-spec/rltp/` |
| Language | German | English |
| Keywords | German RFC 2119 (below) | BCP 14 (`MUST`, `SHOULD`, `MAY`) with the standard boilerplate |
| Form | numbered documents, status line per document | IETF-style editor's draft: editors, version, date, conformance profile, references |
| Audience | our own implementers | standards bodies and other implementers (IIW, DIF, IETF) |

A document belongs to exactly one class. Do not mix the keyword sets inside a
document, and do not translate an outward-facing draft into German — the
English form is what makes it citable elsewhere.

Everything below concerns the internal class. The outward-facing class follows
BCP 14 as written, with the usual boilerplate:

> The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
> "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be
> interpreted as described in BCP 14 [RFC2119] [RFC8174] when, and only when,
> they appear in all capitals, as shown here.

## Normative keywords, German

Written in capitals. In capitals they carry the meaning below; in ordinary
lowercase they are ordinary words and mean nothing normative.

| Word | Plural | Means | RFC 2119 |
|---|---|---|---|
| `MUSS` | `MÜSSEN` | Absolute requirement. An implementation that does not do this is not conformant. | MUST |
| `DARF NICHT` | `DÜRFEN NICHT` | Absolute prohibition. | MUST NOT |
| `SOLLTE` | `SOLLTEN` | Recommendation. May be deviated from with good reason; the reason must be understood and weighed. | SHOULD |
| `SOLLTE NICHT` | `SOLLTEN NICHT` | Discouraged, same qualification. | SHOULD NOT |
| `DARF` | `DÜRFEN` | Genuinely optional. An implementation that does it and one that does not are both conformant, and each must tolerate the other. | MAY |
| `KANN` | `KÖNNEN` | Same as `DARF`. Use `DARF` for permission and `KANN` only where ability is meant. | MAY |

BCP 14 also has `REQUIRED`, `OPTIONAL` and `RECOMMENDED`. They are synonyms of
`MUST`, `MAY` and `SHOULD`, and the German set has no separate words for them:
write `MUSS`, `DARF` and `SOLLTE`. Where a sentence reads better with the
adjective, write it lowercase — `ist optional` says nothing normative on its
own, so the sentence must say the rule elsewhere.

Three rules that are easy to get wrong:

1. **`SOLL` is not a keyword.** German `soll` and `sollte` are not the same
   word, and `soll` reads as duty. Where a recommendation is meant, write
   `SOLLTE`. Where a requirement is meant, write `MUSS`.
2. **Umlauts are written.** `MÜSSEN`, `DÜRFEN`, `KÖNNEN` — never `MUESSEN`,
   `DUERFEN`, `KOENNEN`. The files are UTF-8.
3. **A capitalised keyword is a promise.** Do not use one for emphasis, and do
   not soften one with "usually", "as a rule" or "where possible". If it needs
   softening it is a `SOLLTE`.

## Status of a document

Every normative document carries a status in its first lines. The vocabulary:

| Status | Means |
|---|---|
| Normative starting point | Holds, and other documents build on it |
| Normative draft | Holds as written, but may still change |
| Living document | Maintained continuously, no frozen state (glossaries, registers) |
| Concept / research | Thinks ahead. **Not normative**, even where it uses keywords |

A concept document must be recognisable as one. It does not bind an
implementation, and no normative document may derive a requirement from it.

**Where specification and implementation disagree, the specification wins.**
Either the code changes or the specification changes, with a note in the pull
request. Code does not introduce rules quietly.

## Numbering and naming

Documents in a normative set carry a numeric prefix. **The number is a stable
name, not a version.** A document keeps its number for life; a withdrawn one
leaves its number unused rather than passing it on.

**The width of the prefix belongs to the set, not to the family.** A set picks
one width and keeps it. Two live examples, both correct:

- `real-life-stack/docs/spec/` — two digits, one flat set: `00-architecture.md`,
  `01-app-composition.md`.
- `wot-spec/` — three digits inside a numbered area:
  `01-wot-identity/002-signaturen-und-verifikation.md`. The area carries the
  coarse number, the document the fine one.

**Existing numbering stays as it is.** Since a number is a name, renumbering an
existing set to match some other width would break every reference to it and is
exactly what the stability rule forbids. Width is decided once, when a set is
created, and a new set should state its choice in the set's README.

Not every normative document is part of a numbered set. `rltp-spec/spec/` names
its documents after their subject (`identity-layer.md`, `encounter-layer.md`)
because they are layers of one protocol rather than a sequence to read in
order. That is a deliberate choice too, and it is allowed; what is not allowed
is numbering some documents of a set and not others.

## Versioning

- Repository releases are git tags over the whole specification, frozen
  snapshots.
- Before `1.0.0` breaking changes are allowed and MUST be recorded in
  `CHANGELOG.md`.
- From `1.0.0` SemVer applies: MAJOR for breaking changes to normative formats
  or conformance requirements, MINOR for backward-compatible additions, PATCH
  for clarifications and editorial fixes.
- Implementations declare which **profiles** they support (`wot-identity@0.1`,
  `rltp-access@0.3`). A profile is what is tested against, not the repository
  version.

## Machine-readable parts

- **Vocabularies:** one JSON-LD context plus one JSON Schema per vocabulary,
  under `vocab/<name>/v<n>/`. The version is in the path, so an older document
  keeps resolving.
- **Terms:** SKOS in JSON-LD, one concept scheme per world, federated through
  this repository. Every concept needs `skos:prefLabel` and `skos:definition`
  in `de` and `en` and a `dct:source` pointing at the normative place. See
  `AGENTS.md`.
- **Test vectors** are part of the specification, not an appendix to it. A
  normative format without a vector is not finished.

## Standards we build on

Cite them by number, do not paraphrase them.

| Concern | Standard |
|---|---|
| Normative keywords | RFC 2119, RFC 8174 (BCP 14) |
| Canonical JSON | RFC 8785 (JCS) |
| Signatures | RFC 7515 (JWS), RFC 8032 (Ed25519) |
| Identity, credentials | W3C DID Core, W3C Verifiable Credentials, VC-JOSE-COSE |
| Timestamps | RFC 3339, a profile of ISO 8601 |
| Identifiers | RFC 9562 (UUID), RFC 4648 (Base64url) |
| Group key agreement | RFC 9420 (MLS) |
| Linked data, terms | JSON-LD 1.1, JSON Schema, SKOS |

## Style

Short sentences. One idea per sentence. The heading says what is in the
section; the first sentence states a fact, not an intention. No marketing
language in a specification, and no decoration.

A picture only where it shows a mechanism that prose would have to assemble.

## Checking

Keyword use is checked mechanically, not by reading. What is checked:

- no `SOLL`/`SOLLEN` as a keyword,
- no capitalised keyword without an umlaut where one belongs,
- no English keywords in a German document and none the other way round,
- every identifier named in backticks exists in the code it describes.

A convention that nothing checks drifts silently, and a specification that has
quietly become wrong still looks like a specification.
