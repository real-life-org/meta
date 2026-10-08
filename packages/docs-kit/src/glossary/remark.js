/**
 * remark plugin (unified pipeline, `@astrojs/markdown-remark`):
 * `[label](term:LocalName)` becomes a term button with a popover, see term.js.
 * An unknown term throws, so the build fails with file and term.
 */
import { termMarkup, isTermLink, gluedTo } from './term.js'

export { DEFAULT_LINKS } from './term.js'

function plain(node) {
  if ('value' in node) return node.value
  return (node.children ?? []).map(plain).join('')
}

function walk(node, visit) {
  const kids = node.children
  if (!kids) return
  for (let i = 0; i < kids.length; i++) {
    const replacement = visit(kids[i], kids[i + 1])
    if (replacement) kids[i] = replacement
    else walk(kids[i], visit)
  }
}

/** @param {{ concepts: Record<string, any>, glossaryUrl: { en: string, de?: string }, links?: { en?: string, de?: string } }} options */
export function remarkTerms(options) {
  const markup = termMarkup(options)
  return (tree, file) => {
    const term = markup.forDocument()
    walk(tree, (node, next) => {
      if (node.type !== 'link' || !isTermLink(node.url)) return
      const where = `${file.path ?? '<unknown file>'}${node.position ? `:${node.position.start.line}:${node.position.start.column}` : ''}`
      const tail = next?.type === 'text' ? gluedTo(next.value) : ''
      const replacement = { ...term(node.url, plain(node).trim(), where, tail), position: node.position }
      if (tail) next.value = next.value.slice(tail.length)
      return replacement
    })
  }
}
