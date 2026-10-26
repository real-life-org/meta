# Licensing

Every public repository of the Real Life family carries a license. This file
says which one. A repository does not repeat the rule; its README names its
license and, where it mixes two, which paths fall under which.

## The rule

| What | License |
|---|---|
| Specification text, documentation, concepts, vocabularies | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| Code: apps, libraries, tooling, sites, infrastructure | [MIT](https://opensource.org/license/mit) |
| Protocol code in the specification repositories: libraries, schemas, contexts, test vectors, conformance suites | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) |
| Templates meant to be copied | [MIT-0](https://opensource.org/license/mit-0) |

Protocol code takes Apache-2.0 for its patent grant, the norm for protocol
implementations at DIF and ToIP. Templates take MIT-0 so that a copy does not
have to carry a license notice.

## Third-party material

Logos, names, photos and fonts are not covered by the repository's license.
Logos and names are marks; photos and fonts keep the license of their
authors. A repository that ships them says so in its README. Vendored code
keeps its own license.

## How a repository applies it

- `LICENSE` holds the full license text of the license that covers most of
  the repository, so that GitHub and package registries recognize it.
- A repository that mixes two licenses puts the second one into
  `LICENSE-CODE` or `LICENSE-SPEC` and names the paths in its README.
- A published package carries its own `LICENSE` file and a `license` field
  with the SPDX identifier.
- The copyright line reads `Anton Tranelis and <repository> contributors`.
- Contributions are made under the license of the part they touch.

## Changing a license

A repository with commits from other people changes its license only with
their consent. Versions already published keep the license they were
published under.
