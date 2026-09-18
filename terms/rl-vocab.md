# `rl:` · the few fields SKOS does not have

Namespace: `https://real-life.org/meta/v1#`. Everything else in the register is plain SKOS and Dublin Core.

| Field | On | Meaning |
|---|---|---|
| `rl:convergesWith` | a concept, in the mappings | The **target** state: these two concepts are meant to become the same, and the specs have a task until they are. The SKOS mapping relations describe **today**. `guard.py` lists every `convergesWith` as a convergence task. |
| `rl:falseFriend` | a concept, in the mappings | Same word (in at least one language), different thing, **on purpose**. Recorded so the guard never reports the pair as a missing mapping and so the views show it explicitly. |
| `rl:status` | a concept, in its scheme | `proposed`: the concept does not exist in its spec yet; it is a proposal from the register to the world. The guard lists proposals separately. |
| `rl:symbol` | a concept, in its scheme | Code symbols that implement the term (stack only). Rendered in the stack view. |

Rule for adding a field: only when a door's view visibly misses something without it. Six SKOS/DC fields plus these four are the whole format.
