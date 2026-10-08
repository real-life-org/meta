# @real-life/docs-kit

The kit the documentation sites of the Real Life family share: a Starlight plugin with components
(trust-protocol.real-life.org, real-life-stack.de). First module: the
**glossary** — terms marked in the text open a popover with their definition,
and one glossary page per site lists every term of the site's world with its
links into the other worlds.

Requires `astro` ^7 and `@astrojs/starlight` ^0.42. Works with Astro's default
Markdown processor (Sätteri) and with `unified()` from `@astrojs/markdown-remark`,
for `.md` and `.mdx` alike.

## Install

```sh
npm install @real-life/docs-kit
```

```js
// astro.config.mjs
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import docsKit from '@real-life/docs-kit'

export default defineConfig({
  integrations: [
    starlight({
      title: 'Real Life Stack',
      plugins: [docsKit({
        world: 'rls',
        scheme: fileURLToPath(new URL('../../docs/reference/rls.skos.jsonld', import.meta.url)),
        glossary: { de: '/handbuch/glossar/', en: '/en/handbuch/glossar/' },
      })],
    }),
  ],
})
```

| Option | |
|---|---|
| `world` | the site's world: `rltp`, `rls` or `rlnp`; must match the register |
| `scheme` | the site's SKOS register (JSON-LD), absolute or relative to the build directory |
| `glossary` | the glossary page per language, `{ en, de? }`; `de` falls back to `en` |
| `mappings` | `views/<world>.json` from real-life-org/meta, path or URL; default `https://raw.githubusercontent.com/real-life-org/meta/main/views/<world>.json`; `false` for none. Read once per build; if it cannot be read, the build warns and the glossary shows no cross-world links |
| `links` | text of the popover's link to the glossary, `{ en, de }`; default `Glossary` / `Glossar` |

## Marking a term

```md
Every encounter runs under a fresh [pairwise anchor](term:PairAnchor).
Bin ich [Mitglied](term:member) des [Space](term:space)?
```

The link target is `term:` plus the local name of the concept's IRI
(`rltp:PairAnchor` → `PairAnchor`, `rls:member` → `member`). The link text is
what the page shows; `[](term:member)` shows the register's label. A name the
register does not know fails the build with file, line and term.

The marked term becomes a `<button popovertarget>` with a native popover that
carries label and definition in German and English. The page language picks
one in CSS: a German page (`html:lang(de)`) shows German, every other page
English. Click, tap and keyboard work without JavaScript; a small script adds
opening on hover and focus.

## The glossary page

One MDX page per site and language:

```mdx
---
title: Glossary
---
import Glossary from '@real-life/docs-kit/Glossary.astro'

<Glossary />
```

Entries are sorted by their label in the page language and anchored by local
name (`/reference/glossary/#PairAnchor`), with definition, other labels,
broader and related terms, a "proposed" badge, sources, and the links into
the other worlds. `<Glossary lang="de" />` overrides the page language.

## Who owns what

| The package | The project |
|---|---|
| markup, popover, CSS, hover script | its register: terms, labels, definitions, sources |
| the glossary page body | the glossary page (path, title, intro, sidebar entry) |
| reading the register and the cross-world view | which terms its pages mark |

Cross-world relations live in real-life-org/meta (`terms/mappings.skos.jsonld`);
`scripts/render.py` turns them into `views/<world>.json`, with the glossary
addresses from `terms/sources.json`.

## Develop

```sh
npm ci
npm test
```

Release: tag `docs-kit-v<version>` matching `package.json`; the
`docs-kit-release` workflow publishes with provenance.
