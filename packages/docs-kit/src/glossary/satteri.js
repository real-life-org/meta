/**
 * Sätteri plugin (Astro 7's default Markdown and MDX processor):
 * `[label](term:LocalName)` becomes a term button with a popover, see term.js.
 * A factory, so that every document counts its ids from 1.
 * An unknown term throws, so the build fails with file and term.
 */
import { fileURLToPath } from 'node:url'
import { termMarkup, isTermLink, gluedTo } from './term.js'

/** @param {{ concepts: Record<string, any>, glossaryUrl: { en: string, de?: string }, links?: { en?: string, de?: string } }} options */
export function satteriTerms(options) {
  const markup = termMarkup(options)
  return ({ fileURL }) => {
    const term = markup.forDocument()
    const path = fileURL ? fileURLToPath(fileURL) : '<unknown file>'
    return {
      name: 'real-life-terms',
      options: { position: true },
      link(node, ctx) {
        if (!isTermLink(node.url)) return
        const where = `${path}${node.position ? `:${node.position.start.line}:${node.position.start.column}` : ''}`
        const next = ctx.parent(node)?.children[ctx.indexOf(node) + 1]
        const tail = next?.type === 'text' ? gluedTo(next.value) : ''
        const replacement = term(node.url, ctx.textContent(node).trim(), where, tail)
        if (tail) ctx.setProperty(next, 'value', next.value.slice(tail.length))
        return replacement
      },
    }
  }
}
