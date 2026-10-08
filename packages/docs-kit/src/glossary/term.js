/**
 * The markup for one marked term, shared by the remark (unified) and the
 * Sätteri plugin: an mdast tree of custom nodes that carry `data.hName` and
 * `data.hProperties` (attribute names, string values), which both pipelines
 * render as elements, in Markdown and in MDX.
 *
 *   <span class="rl-term-wrap">
 *     <button type="button" class="rl-term" popovertarget="ID">label</button>
 *     <span popover id="ID" class="rl-term-pop" role="tooltip">
 *       <span lang="de" class="rl-term-lang"><strong>Label</strong> <span>Definition</span> <a href="…#local">Glossar</a></span>
 *       <span lang="en" class="rl-term-lang">…</span>
 *     </span>
 *     ,          ← punctuation or letters glued to the link, so the line cannot break before them
 *   </span>
 */
export const DEFAULT_LINKS = { de: 'Glossar', en: 'Glossary' }
export const PREFIX = 'term:'
const LANGS = ['de', 'en']

const text = (value) => ({ type: 'text', value })
const el = (hName, hProperties, children) => ({ type: `rlTerm-${hName}`, data: { hName, hProperties }, children })

/** Validates the options once; `forDocument()` gives the per-page builder (ids count from 1 on every page). */
export function termMarkup(options) {
  const { concepts, glossaryUrl } = options ?? {}
  if (!concepts || !glossaryUrl?.en) throw new Error('the term plugin needs { concepts, glossaryUrl: { en, de? } }')
  const linkText = { ...DEFAULT_LINKS, ...options.links }
  const url = (lang, local) => `${glossaryUrl[lang] ?? glossaryUrl.en}#${local}`

  return {
    forDocument() {
      let n = 0
      /**
       * @param tail text glued to the link (`,` `.` `s`…), moved into the wrapper: a button is an
       *   atomic inline, and the browser may break the line between it and a following comma.
       * @returns the replacement node; throws for an unknown term
       */
      return (href, label, where, tail = '') => {
        const name = href.slice(PREFIX.length)
        const concept = Object.hasOwn(concepts, name) ? concepts[name] : undefined
        if (!concept) throw new Error(`${where}: unknown term "${name}" (${href})`)
        const id = `rl-term-${name}-${++n}`
        const parts = LANGS.map((lang) =>
          el('span', { lang, class: 'rl-term-lang' }, [
            el('strong', {}, [text(concept.label[lang])]),
            text(' '),
            el('span', {}, [text(concept.definition[lang])]),
            text(' '),
            el('a', { href: url(lang, name), class: 'rl-term-more' }, [text(linkText[lang])]),
          ]),
        )
        const button = el(
          'button',
          { type: 'button', class: 'rl-term', popovertarget: id, style: `anchor-name: --${id}` },
          label ? [text(label)] : LANGS.map((lang) => el('span', { lang }, [text(concept.label[lang])])),
        )
        // The definitions belong to the glossary page in search, not to every page that uses the term.
        const pop = el('span', { popover: '', id, class: 'rl-term-pop', role: 'tooltip', style: `position-anchor: --${id}`, 'data-pagefind-ignore': '' }, parts)
        return el('span', { class: 'rl-term-wrap' }, tail ? [button, pop, text(tail)] : [button, pop])
      }
    },
  }
}

/** The run of non-space characters a text starts with: what sticks to a term placed before it. */
export const gluedTo = (value) => /^\S+/.exec(value)?.[0] ?? ''

export const isTermLink = (url) => typeof url === 'string' && url.startsWith(PREFIX)
