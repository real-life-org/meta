import { readFileSync } from 'node:fs'

/**
 * Loads a SKOS concept scheme in JSON-LD (the register format of the Real Life
 * family, see real-life-org/meta terms/) into a map keyed by local name:
 * `rltp:AnchorMapping` → `AnchorMapping`, `rls:member` → `member`.
 * Every concept needs prefLabel and definition in de and en; anything missing
 * is collected and thrown at once.
 */
export const LANGS = ['de', 'en']

export const localName = (id) => id.slice(id.indexOf(':') + 1)
const list = (x) => (x == null ? [] : Array.isArray(x) ? x : [x])
const ref = (x) => (typeof x === 'string' ? x : x['@id'])

function byLang(values) {
  const out = {}
  for (const v of list(values)) if (v && v['@language'] && !(v['@language'] in out)) out[v['@language']] = v['@value']
  return out
}

function allByLang(values) {
  const out = {}
  for (const v of list(values)) if (v && v['@language']) (out[v['@language']] ??= []).push(v['@value'])
  return out
}

/** @param {string | URL | object} source path, file URL, or the parsed document */
export function loadScheme(source) {
  const doc = typeof source === 'string' || source instanceof URL ? JSON.parse(readFileSync(source, 'utf8')) : source
  const graph = list(doc['@graph'])
  const nodes = graph.filter((n) => list(n['@type']).includes('skos:Concept'))
  const ids = new Set(nodes.map((n) => n['@id']))
  const problems = []
  const concepts = {}
  let world
  for (const n of nodes) {
    const id = n['@id']
    const prefix = id.slice(0, id.indexOf(':'))
    world ??= prefix
    if (prefix !== world) problems.push(`${id}: not in namespace ${world}`)
    const label = byLang(n['skos:prefLabel'])
    const definition = byLang(n['skos:definition'])
    for (const [field, values] of [['skos:prefLabel', label], ['skos:definition', definition]])
      for (const l of LANGS) if (!values[l]) problems.push(`${id}: ${field} missing in ${l}`)
    const links = {}
    for (const field of ['skos:broader', 'skos:related']) {
      links[field] = list(n[field]).map(ref)
      for (const target of links[field]) if (!ids.has(target)) problems.push(`${id}: ${field} names unknown concept ${target}`)
    }
    const local = localName(id)
    concepts[local] = {
      id,
      local,
      label,
      definition,
      altLabels: allByLang(n['skos:altLabel']),
      sources: list(n['dct:source']),
      broader: links['skos:broader'].map(localName),
      related: links['skos:related'].map(localName),
      status: n['rl:status'],
      symbols: list(n['rl:symbol']),
    }
  }
  if (problems.length) throw new Error(`concept scheme has errors:\n  ${problems.join('\n  ')}`)
  return { world, concepts }
}
