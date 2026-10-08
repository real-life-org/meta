import { readFile } from 'node:fs/promises'

/**
 * Cross-world links from `views/<world>.json` in real-life-org/meta
 * (written by scripts/render.py): per local name a list of
 * `{ relation, world, id, label: {de, en}, url: {de, en} }`.
 */
// Read as "<World>: <phrase> <label>", e.g. "RLS: corresponds to Member", "RLNP: verwandt mit Mensch".
// broadMatch/narrowMatch are seen from the concept: "A broadMatch B" means A is narrower than B.
export const RELATIONS = {
  exactMatch: { en: 'corresponds to', de: 'entspricht' },
  closeMatch: { en: 'close to', de: 'nahe an' },
  relatedMatch: { en: 'related to', de: 'verwandt mit' },
  broadMatch: { en: 'narrower than', de: 'spezieller als' },
  narrowMatch: { en: 'broader than', de: 'allgemeiner als' },
  convergesWith: { en: 'to converge with', de: 'soll zusammenfallen mit' },
  falseFriend: { en: 'false friend of', de: 'falscher Freund von' },
}
export const WORLDS = { rlnp: 'RLNP', rltp: 'RLTP', rls: 'RLS' }

const pick = (byLang, lang) => byLang?.[lang] ?? byLang?.en ?? byLang?.de

/** The links of one concept, ready to show in `lang` ('de' or 'en'). A link within the same world stays on the page. */
export function crossLinks(mappings, local, lang) {
  const entries = mappings?.concepts && Object.hasOwn(mappings.concepts, local) ? mappings.concepts[local] : []
  return entries.map((e) => ({
    relation: e.relation,
    phrase: pick(RELATIONS[e.relation], lang) ?? e.relation,
    world: e.world,
    worldName: WORLDS[e.world] ?? e.world,
    label: pick(e.label, lang) ?? e.id,
    url: e.world === mappings.world ? `#${e.id.slice(e.id.indexOf(':') + 1)}` : pick(e.url, lang),
  }))
}

const isText = (v) => typeof v === 'string'
const isByLang = (v) => typeof v === 'object' && v !== null && Object.values(v).every(isText)
const isLink = (e) =>
  typeof e === 'object' && e !== null && isText(e.relation) && isText(e.world) && isText(e.id) && isByLang(e.label) && (e.url === undefined || isByLang(e.url))

/**
 * Reads the view from a path or an http(s) URL. Fail-soft: anything wrong
 * yields `null` and one warning, so a missing view never breaks a build.
 */
export async function readMappings(source, { warn = console.warn, fetch: get = globalThis.fetch } = {}) {
  try {
    let data
    if (/^https?:\/\//.test(source)) {
      const res = await get(source)
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      data = await res.json()
    } else data = JSON.parse(await readFile(source, 'utf8'))
    if (typeof data?.world !== 'string' || typeof data?.concepts !== 'object' || data.concepts === null) throw new Error('not a views/<world>.json file')
    for (const [local, entries] of Object.entries(data.concepts))
      if (!Array.isArray(entries) || !entries.every(isLink)) throw new Error(`malformed entry for ${local}`)
    return data
  } catch (e) {
    warn(`cross-world links unavailable (${source}): ${e.message}`)
    return null
  }
}
